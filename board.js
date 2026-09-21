'use strict';

// 盤面のルールだけを担当するクラス。
// DOM・Canvas・Firebase・localStorage には一切触れない（テストしやすくするため）。
//
// tiles[row][col] = { value, type }
//   - 呼び出し側が x, y, scale などの表示用プロパティを足してもよい。
//   - Board のメソッドは value と type だけを書き換え、tiles 配列そのものは差し替えない
//     （呼び出し側が board.tiles を別名で参照していても壊れないようにするため）。

// 引き直しの上限（[5,5,6] の 4x4 なら手詰まりは約4,000回に1回なので、まず到達しない）
const MAX_CREATE_ATTEMPTS = 1000;

// 色の枚数どおりにランダムに並べた盤面を1つ作る（手詰まりかどうかは問わない）
function layoutBoard(rows, cols, typeCounts, rng) {
    const pool = [];
    typeCounts.forEach((count, type) => {
        for (let i = 0; i < count; i++) pool.push(type);
    });

    // Fisher-Yates シャッフル（旧実装の「残り枚数で重み付け抽選」と同じ分布）
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const board = new Board(rows, cols, typeCounts.length);
    let k = 0;
    for (let r = 0; r < rows; r++) {
        const line = [];
        for (let c = 0; c < cols; c++) {
            line.push({ value: 1, type: pool[k++] });
        }
        board.tiles.push(line);
    }
    return board;
}

export class Board {
    constructor(rows, cols, typeCount) {
        this.rows = rows;
        this.cols = cols;
        this.typeCount = typeCount; // 色（種類）の数。新タイルの色は (type + 1) % typeCount
        this.tiles = [];
    }

    // 初期盤面を作る。typeCounts は色ごとの初期枚数（例: [5, 5, 6]）。
    // rng は 0以上1未満を返す関数。テストや日替わりシードのために差し替えられる。
    // 最初から手詰まり（合体できる組が1つもない）の配置になった場合は、引き直す。
    static create(rows, cols, typeCounts, rng = Math.random) {
        const total = typeCounts.reduce((sum, n) => sum + n, 0);
        if (total !== rows * cols) {
            throw new Error(`色の枚数の合計(${total})が盤面のマス数(${rows * cols})と一致しません`);
        }

        for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt++) {
            const board = layoutBoard(rows, cols, typeCounts, rng);
            if (!board.isDeadlocked()) return board;
        }
        // 色の枚数の指定によっては、どう並べても手詰まりになる（例: 各色1枚ずつ）
        throw new Error('手詰まりにならない初期配置を作れませんでした（色の枚数の指定を見直してください）');
    }

    // テスト用: [[{value, type}, ...], ...] から盤面を作る
    static fromTiles(tiles, typeCount = 3) {
        const board = new Board(tiles.length, tiles[0].length, typeCount);
        board.tiles = tiles.map(line => line.map(t => ({ value: t.value, type: t.type })));
        return board;
    }

    inBounds(r, c) {
        return r >= 0 && r < this.rows && c >= 0 && c < this.cols;
    }

    canMerge(r1, c1, r2, c2) {
        if (!this.inBounds(r1, c1) || !this.inBounds(r2, c2)) return false;
        const a = this.tiles[r1][c1];
        const b = this.tiles[r2][c2];
        return a.type === b.type && a.value === b.value;
    }

    // (row, col) のタイルを (dr, dc) 方向の隣（dr,dc は上下左右の単位ベクトル）に合体させる。
    //   - 隣のタイル(target)の値が +1 される
    //   - 選んだタイルから盤面の端までのタイルが、1マスずつ target 方向へ詰まる
    //   - 空いた端に「合体前の値・次の色」の新タイルが入る
    // 合体できなければ何も変えず null を返す。
    // 戻り値: { valueBefore: 合体前の値, scoreGain: この合体で得られる点数(valueBefore の2乗) }
    move(row, col, dr, dc) {
        if (Math.abs(dr) + Math.abs(dc) !== 1) return null;

        const tr = row + dr;
        const tc = col + dc;
        if (!this.canMerge(row, col, tr, tc)) return null;

        const target = this.tiles[tr][tc];
        const valueBefore = target.value;
        const newType = (target.type + 1) % this.typeCount;

        target.value = valueBefore + 1;

        // 選んだタイルの「後ろ側」を1マスずつ前へ詰める
        let r = row;
        let c = col;
        while (this.inBounds(r - dr, c - dc)) {
            this.tiles[r][c].value = this.tiles[r - dr][c - dc].value;
            this.tiles[r][c].type = this.tiles[r - dr][c - dc].type;
            r -= dr;
            c -= dc;
        }
        // 一番後ろに新タイル
        this.tiles[r][c].value = valueBefore;
        this.tiles[r][c].type = newType;

        return { valueBefore, scoreGain: valueBefore ** 2 };
    }

    // 合体できる隣接ペアを全部返す。[[r1, c1, r2, c2], ...]
    findMergePairs() {
        const pairs = [];
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols - 1; c++) {
                if (this.canMerge(r, c, r, c + 1)) pairs.push([r, c, r, c + 1]);
            }
        }
        for (let c = 0; c < this.cols; c++) {
            for (let r = 0; r < this.rows - 1; r++) {
                if (this.canMerge(r, c, r + 1, c)) pairs.push([r, c, r + 1, c]);
            }
        }
        return pairs;
    }

    // 手詰まり（合体できるペアが1つもない）か
    isDeadlocked() {
        return this.findMergePairs().length === 0;
    }

    // 「+1アイテム」: 指定タイルの値を1増やす
    bump(row, col) {
        this.tiles[row][col].value++;
    }

    // undo 用。value と type だけを複製して返す
    snapshot() {
        return this.tiles.map(line => line.map(t => ({ value: t.value, type: t.type })));
    }

    // snapshot() の内容に戻す（tiles 配列・タイルのオブジェクトは差し替えず、中身だけ戻す）
    restore(snap) {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                this.tiles[r][c].value = snap[r][c].value;
                this.tiles[r][c].type = snap[r][c].type;
            }
        }
    }
}
