import { describe, it, expect } from 'vitest';
import { Board } from './board.js';

// ---- 再現性のある乱数（テスト用）----
function mulberry32(seed) {
    return function () {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const plain = (board) => board.tiles.map(row => row.map(t => ({ value: t.value, type: t.type })));

// ---- 旧実装（game.js の moveRight/Left/Down/Up の「値の更新」部分をそのまま写したもの）----
// リファクタリングで挙動が変わっていないことを確かめるための基準。役目を終えたら消してよい。
function legacyMove(T, NO_ROW, NO_COL, chsnRow, chsnCol, dir) {
    let originalValue;
    if (dir === 'right') {
        originalValue = T[chsnRow][chsnCol + 1].value;
        T[chsnRow][chsnCol + 1].value += 1;
        for (let c = 0; c < chsnCol; c++) {
            T[chsnRow][chsnCol - c].value = T[chsnRow][chsnCol - 1 - c].value;
            T[chsnRow][chsnCol - c].type = T[chsnRow][chsnCol - 1 - c].type;
        }
        T[chsnRow][0].value = T[chsnRow][chsnCol + 1].value - 1;
        T[chsnRow][0].type = (T[chsnRow][chsnCol + 1].type + 1) % 3;
    } else if (dir === 'left') {
        originalValue = T[chsnRow][chsnCol - 1].value;
        T[chsnRow][chsnCol - 1].value += 1;
        for (let c = 0; c < NO_COL - chsnCol - 1; c++) {
            T[chsnRow][chsnCol + c].value = T[chsnRow][chsnCol + 1 + c].value;
            T[chsnRow][chsnCol + c].type = T[chsnRow][chsnCol + 1 + c].type;
        }
        T[chsnRow][NO_COL - 1].value = T[chsnRow][chsnCol - 1].value - 1;
        T[chsnRow][NO_COL - 1].type = (T[chsnRow][chsnCol - 1].type + 1) % 3;
    } else if (dir === 'down') {
        originalValue = T[chsnRow + 1][chsnCol].value;
        T[chsnRow + 1][chsnCol].value += 1;
        for (let c = 0; c < chsnRow; c++) {
            T[chsnRow - c][chsnCol].value = T[chsnRow - 1 - c][chsnCol].value;
            T[chsnRow - c][chsnCol].type = T[chsnRow - 1 - c][chsnCol].type;
        }
        T[0][chsnCol].value = T[chsnRow + 1][chsnCol].value - 1;
        T[0][chsnCol].type = (T[chsnRow + 1][chsnCol].type + 1) % 3;
    } else if (dir === 'up') {
        originalValue = T[chsnRow - 1][chsnCol].value;
        T[chsnRow - 1][chsnCol].value += 1;
        for (let c = 0; c < NO_ROW - chsnRow - 1; c++) {
            T[chsnRow + c][chsnCol].value = T[chsnRow + 1 + c][chsnCol].value;
            T[chsnRow + c][chsnCol].type = T[chsnRow + 1 + c][chsnCol].type;
        }
        T[NO_ROW - 1][chsnCol].value = T[chsnRow - 1][chsnCol].value - 1;
        T[NO_ROW - 1][chsnCol].type = (T[chsnRow - 1][chsnCol].type + 1) % 3;
    }
    return originalValue;
}

// 旧 checkIsDeadlocked
function legacyIsDeadlocked(T, NO_ROW, NO_COL) {
    let check = 0;
    for (let row = 0; row < NO_ROW; row++) {
        for (let col = 0; col < NO_COL - 1; col++) {
            if (T[row][col].value === T[row][col + 1].value && T[row][col].type === T[row][col + 1].type) check++;
        }
    }
    for (let col = 0; col < NO_COL; col++) {
        for (let row = 0; row < NO_ROW - 1; row++) {
            if (T[row][col].value === T[row + 1][col].value && T[row][col].type === T[row + 1][col].type) check++;
        }
    }
    return check === 0;
}

const DIRS = {
    right: [0, 1],
    left: [0, -1],
    down: [1, 0],
    up: [-1, 0],
};

describe('Board.create', () => {
    it('色ごとの枚数が [5,5,6] で、全タイルの値が1', () => {
        const board = Board.create(4, 4, [5, 5, 6], mulberry32(1));
        const counts = [0, 0, 0];
        board.tiles.forEach(row => row.forEach(t => {
            counts[t.type]++;
            expect(t.value).toBe(1);
        }));
        expect(counts).toEqual([5, 5, 6]);
    });

    it('枚数の合計がマス数と合わなければエラー', () => {
        expect(() => Board.create(4, 4, [5, 5, 5])).toThrow();
    });

    it('同じシードなら同じ盤面になる（日替わり盤面の土台）', () => {
        const a = Board.create(4, 4, [5, 5, 6], mulberry32(42));
        const b = Board.create(4, 4, [5, 5, 6], mulberry32(42));
        expect(plain(a)).toEqual(plain(b));
    });
});

describe('Board.move: 旧実装との一致', () => {
    it('ランダムな盤面・全方向・全位置で、旧実装と結果が完全に一致する', () => {
        const rng = mulberry32(2024);
        let compared = 0;
        for (let trial = 0; trial < 3000; trial++) {
            // 値1〜2・色3種のランダム盤面（合体できる箇所が多くなるようにする）
            const tiles = [];
            for (let r = 0; r < 4; r++) {
                const row = [];
                for (let c = 0; c < 4; c++) {
                    row.push({ value: 1 + Math.floor(rng() * 2), type: Math.floor(rng() * 3) });
                }
                tiles.push(row);
            }
            for (const [dir, [dr, dc]] of Object.entries(DIRS)) {
                for (let r = 0; r < 4; r++) {
                    for (let c = 0; c < 4; c++) {
                        const tr = r + dr, tc = c + dc;
                        if (tr < 0 || tr >= 4 || tc < 0 || tc >= 4) continue; // 盤面の外へは動かせない
                        const board = Board.fromTiles(tiles);
                        const legacy = tiles.map(row => row.map(t => ({ ...t })));
                        const canMerge = legacy[r][c].value === legacy[tr][tc].value && legacy[r][c].type === legacy[tr][tc].type;

                        const result = board.move(r, c, dr, dc);
                        if (!canMerge) {
                            expect(result).toBeNull();
                            expect(plain(board)).toEqual(tiles.map(row => row.map(t => ({ ...t }))));
                            continue;
                        }
                        const originalValue = legacyMove(legacy, 4, 4, r, c, dir);
                        expect(plain(board)).toEqual(legacy);
                        expect(result.valueBefore).toBe(originalValue);
                        expect(result.scoreGain).toBe(originalValue ** 2);
                        compared++;
                    }
                }
            }
        }
        // 比較が実際に行われたことの確認（空振りで通ってしまうのを防ぐ）
        expect(compared > 1000).toBe(true);
    });

    it('ランダムに遊び切る（手詰まりまで）シミュレーションで、毎手の盤面・手詰まり判定が旧実装と一致する', () => {
        const rng = mulberry32(777);
        let totalMoves = 0;
        for (let game = 0; game < 300; game++) {
            const board = Board.create(4, 4, [5, 5, 6], rng);
            const legacy = plain(board);

            for (let step = 0; step < 5000; step++) {
                expect(board.isDeadlocked()).toBe(legacyIsDeadlocked(legacy, 4, 4));
                const pairs = board.findMergePairs();
                if (pairs.length === 0) break;

                // 合体できるペアのどちらを「選んだタイル」にするかもランダムに選ぶ
                const [r1, c1, r2, c2] = pairs[Math.floor(rng() * pairs.length)];
                const flip = rng() < 0.5;
                const [r, c, tr, tc] = flip ? [r2, c2, r1, c1] : [r1, c1, r2, c2];
                const dr = tr - r, dc = tc - c;
                const dir = Object.keys(DIRS).find(k => DIRS[k][0] === dr && DIRS[k][1] === dc);

                const sumBefore = board.tiles.flat().reduce((s, t) => s + t.value, 0);
                board.move(r, c, dr, dc);
                legacyMove(legacy, 4, 4, r, c, dir);
                totalMoves++;

                expect(plain(board)).toEqual(legacy);
                // 合体1回につき、盤面の値の合計はちょうど1増える
                const sumAfter = board.tiles.flat().reduce((s, t) => s + t.value, 0);
                expect(sumAfter).toBe(sumBefore + 1);
            }
        }
        expect(totalMoves > 1000).toBe(true);
    });
});

describe('Board.move: 個別ケース', () => {
    // 例: 上段 [赤1, 赤1, 青2, 緑3] の左端を右へ動かす
    it('右へ合体すると、隣が+1され、左端に「合体前の値・次の色」の新タイルが入る', () => {
        const board = Board.fromTiles([
            [{ value: 1, type: 0 }, { value: 1, type: 0 }, { value: 2, type: 1 }, { value: 3, type: 2 }],
            [{ value: 4, type: 0 }, { value: 5, type: 1 }, { value: 6, type: 2 }, { value: 7, type: 0 }],
        ]);
        const result = board.move(0, 0, 0, 1);
        expect(result).toEqual({ valueBefore: 1, scoreGain: 1 });
        expect(plain(board)[0]).toEqual([
            { value: 1, type: 1 }, // 新タイル（値は合体前と同じ1、色は 赤(0)→青(1)）
            { value: 2, type: 0 }, // 合体したタイル
            { value: 2, type: 1 },
            { value: 3, type: 2 },
        ]);
    });

    it('選んだタイルより手前の列は、1マスずつ詰まる', () => {
        const board = Board.fromTiles([
            [{ value: 7, type: 1 }, { value: 8, type: 2 }, { value: 3, type: 0 }, { value: 3, type: 0 }],
        ]);
        board.move(0, 2, 0, 1); // 3番目を4番目へ
        expect(plain(board)[0]).toEqual([
            { value: 3, type: 1 }, // 新タイル
            { value: 7, type: 1 }, // 詰まった
            { value: 8, type: 2 }, // 詰まった
            { value: 4, type: 0 }, // 合体
        ]);
    });

    it('合体できない組み合わせでは盤面を変えず null を返す', () => {
        const tiles = [[{ value: 1, type: 0 }, { value: 1, type: 1 }]];
        const board = Board.fromTiles(tiles);
        expect(board.move(0, 0, 0, 1)).toBeNull(); // 色違い
        expect(board.move(0, 0, 0, -1)).toBeNull(); // 盤面の外
        expect(board.move(0, 0, 1, 1)).toBeNull(); // 斜め
        expect(plain(board)).toEqual(tiles);
    });
});

describe('Board.snapshot / restore / bump', () => {
    it('restore で盤面が元に戻り、tiles 配列とタイルのオブジェクトは差し替わらない', () => {
        const board = Board.create(4, 4, [5, 5, 6], mulberry32(5));
        const tilesRef = board.tiles;
        const tileRef = board.tiles[2][3];
        const before = plain(board);
        const snap = board.snapshot();

        board.bump(0, 0);
        board.bump(2, 3);
        board.restore(snap);

        expect(plain(board)).toEqual(before);
        expect(board.tiles === tilesRef).toBe(true);
        expect(board.tiles[2][3] === tileRef).toBe(true);
    });

    it('restore は表示用プロパティ（x, y など）に触れない', () => {
        const board = Board.create(2, 2, [2, 2], mulberry32(3));
        board.tiles[0][0].x = 123;
        const snap = board.snapshot();
        board.bump(0, 0);
        board.restore(snap);
        expect(board.tiles[0][0].x).toBe(123);
    });
});
