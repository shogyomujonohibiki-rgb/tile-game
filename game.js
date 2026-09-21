'use strict';

import { TopMonster } from './monster.js';
import { BOARD, STORAGE_KEYS, MONSTER } from './config.js';
import { Dungeon } from './dungeon.js';
import { Board } from './board.js';
import { UI } from './ui.js';

export class Game {
    constructor() {
        this.ui = new UI();

        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.topCanvas = document.getElementById('topCanvas');
        this.topCtx = this.topCanvas ? this.topCanvas.getContext('2d') : null;

        this.uid = window.currentUser ? window.currentUser.uid : null;

        // モード管理 ('scout' または 'dungeon')
        this.currentMode = 'scout';

        this.TILE_MARGIN = BOARD.TILE_MARGIN;
        this.COLORS = BOARD.COLORS;

        this.NO_ROW = BOARD.ROWS;
        this.NO_COL = BOARD.COLS;
        this.NO_TYPES = BOARD.TYPE_COUNTS;

        // モンスター所持数上限パラメータ（20）およびパーティー編成管理
        this.maxMonsterCount = MONSTER.MAX_OWNED;
        this.topMonsters = [];
        this.partyMonsterIds = [];

        // ダンジョン用ステータス（dungeonFloor / enemyHp / enemyMaxHp / enemyAtk は setFloor が設定する）
        this.setFloor(1);

        this.resizeCanvas();
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.drawTiles();
        });

        this.initTopGarden();
        this.startTopAnimation();
        this.ui.initializeColorSample(this.COLORS);
        this.initPartyModalEvents();
        this.initModeSwitchEvents();

        const savedName = localStorage.getItem('gameUserName');
        if (!savedName) {
            this.userName = 'Guest';
            this.changeUserName(true);
        } else {
            this.userName = savedName;
        }

        this.board = null; // 盤面ロジック（board.js）。createTiles() で作られる
        this.tileMx = [];  // board.tiles と同じ配列。ここに x, y など表示用の値を足して使う
        this.history = [];
        this.score = 0;
        this.highScore = 0;
        this.mergeCount = 0;
        this.itemCount = 0;
        this.itemActive = false;
        this.isCounting = false;
        this.isGameover = false;
        this.isMoving = false;
        this.tileChosen = false;

        this.globalLeaderboard = [];
        this.myLeaderboard = [];

        this.minValue = 1;
        this.startTime = null;
        this.startX = 0;
        this.startY = 0;
        this.chsnCol = 0;
        this.chsnRow = 0;
        this.frameCount = 0;
        this.moveDuration = 100;
        this.moveFq = 10;
        this.moveFrame = this.moveDuration / this.moveFq;

        if (this.ui.game4x4) {
            this.ui.game4x4.addEventListener('click', () => {
                this.reset();
                this.startBoard();
            });
        }

        if (this.ui.undoButton) {
            this.ui.undoButton.addEventListener('click', () => {
                if (this.currentMode !== 'scout') return;
                this.undo();
            });
        }

        if (this.ui.itemButton) {
            this.ui.itemButton.addEventListener('click', () => {
                if (this.itemCount > 0) {
                    // 手詰まり中かつアイテムがアクティブのときは、クリックしてもオフにさせない
                    if (this.checkIsDeadlocked() && this.itemActive) {
                        return;
                    }
                    this.itemActive = !this.itemActive;
                }
                this.ui.setItemActive(this.itemActive);
            });
        }

        this.canvas.addEventListener('pointerdown', (e) => {
            if (e.cancelable) e.preventDefault();

            if (this.isGameover) return;

            if (!this.isCounting) {
                this.isCounting = true;
                this.startTime = Date.now();
                this.countUp();

                // ダンジョンモードでパズルが開始されたらパーティー編成ボタンを無効にする
                if (this.currentMode === 'dungeon') {
                    this.ui.setPartyButtonEnabled(false);
                }
            }
            if (this.isMoving) return;

            this.rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / this.rect.width;
            const scaleY = this.canvas.height / this.rect.height;

            const clickX = (e.clientX - this.rect.left) * scaleX;
            const clickY = (e.clientY - this.rect.top) * scaleY;

            const newCol = Math.floor(clickX / (this.TILE_WIDTH + this.TILE_MARGIN));
            const newRow = Math.floor(clickY / (this.TILE_HEIGHT + this.TILE_MARGIN));

            if (newCol < 0 || newCol >= this.NO_COL || newRow < 0 || newRow >= this.NO_ROW) return;

            if (this.itemActive) {
                (async () => {
                    if (this.currentMode === 'scout') this.saveState();
                    this.itemActive = false;
                    this.ui.setItemActive(false);

                    this.itemCount--;
                    this.board.bump(newRow, newCol);

                    await this.playLevelUpAnim(newRow, newCol);
                    this.drawTiles();
                })();
                return;
            }

            this.startX = clickX;
            this.startY = clickY;
            this.chsnCol = newCol;
            this.chsnRow = newRow;
            this.tileChosen = true;
            this.drawTiles();
        }, { passive: false });

        this.canvas.addEventListener('pointermove', (e) => {
            if (e.cancelable) e.preventDefault();
            if (this.isMoving || this.isGameover) return;

            if (this.tileChosen) {
                const scaleX = this.canvas.width / this.rect.width;
                const scaleY = this.canvas.height / this.rect.height;

                const currentX = (e.clientX - this.rect.left) * scaleX;
                const currentY = (e.clientY - this.rect.top) * scaleY;

                const dx = currentX - this.startX;
                const dy = currentY - this.startY;

                this.tileMx[this.chsnRow][this.chsnCol].x = Math.min(
                    Math.max(this.chsnCol * (this.TILE_WIDTH + this.TILE_MARGIN) + dx, 0),
                    (this.NO_COL - 1) * (this.TILE_WIDTH + this.TILE_MARGIN)
                );
                this.tileMx[this.chsnRow][this.chsnCol].y = Math.min(
                    Math.max(this.chsnRow * (this.TILE_HEIGHT + this.TILE_MARGIN) + dy, 0),
                    (this.NO_ROW - 1) * (this.TILE_HEIGHT + this.TILE_MARGIN)
                );
                this.drawTiles();

                this.tryStartMove(dx, dy);
            }
        }, { passive: false });

        window.addEventListener('pointerup', () => {
            if (this.isMoving) return;
            this.release();
        });

        window.addEventListener('pointerout', () => {
            if (this.isMoving) return;
            this.release();
        });

        this.startBoard();
    }

    initModeSwitchEvents() {
        if (this.ui.modeScoutBtn && this.ui.modeDungeonBtn) {
            this.ui.modeScoutBtn.addEventListener('click', () => {
                this.switchMode('scout');
            });
            this.ui.modeDungeonBtn.addEventListener('click', () => {
                this.switchMode('dungeon');
            });
        }
    }

    // 階層を設定し、その階層の敵ステータスを反映する（敵の値を変える入口はここだけ）
    setFloor(floor) {
        this.dungeonFloor = floor;
        const enemy = Dungeon.enemyFor(floor);
        this.enemyMaxHp = enemy.maxHp;
        this.enemyHp = enemy.maxHp;
        this.enemyAtk = enemy.atk;
    }

    startBoard() {
        this.gameStart(BOARD.ROWS, BOARD.COLS, BOARD.TYPE_COUNTS, STORAGE_KEYS.HIGH_SCORE_4X4);
    }

    switchMode(mode) {
        if (this.currentMode === mode) return;
        this.currentMode = mode;

        this.reset();
        this.startBoard();

        this.ui.switchModeUI(mode);
        this.ui.setPartyButtonEnabled(true);
        this.isGameover = false;
        this.drawTiles();
    }

    resizeCanvas() {
        this.canvas.width = 240;
        this.canvas.height = 250;

        if (this.topCanvas) {
            const topRect = this.topCanvas.getBoundingClientRect();
            this.topCanvas.width = topRect.width || 343;
            this.topCanvas.height = 150;
        }

        this.TILE_WIDTH = this.canvas.width / this.NO_COL - this.TILE_MARGIN;
        this.TILE_HEIGHT = this.canvas.height / this.NO_ROW - this.TILE_MARGIN;

        if (this.tileMx && this.tileMx.length > 0) {
            for (let r = 0; r < this.NO_ROW; r++) {
                for (let c = 0; c < this.NO_COL; c++) {
                    if (this.tileMx[r] && this.tileMx[r][c]) {
                        this.tileMx[r][c].x = c * (this.TILE_WIDTH + this.TILE_MARGIN);
                        this.tileMx[r][c].y = r * (this.TILE_HEIGHT + this.TILE_MARGIN);
                    }
                }
            }
        }
    }

    initTopGarden() {
        if (!this.topCanvas) return;
        this.topMonsters = [];
    }

    startTopAnimation() {
        const loop = () => {
            this.drawTopCanvas();
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    drawTopCanvas() {
        if (!this.topCtx || !this.topCanvas) return;

        const w = this.topCanvas.width;
        const h = this.topCanvas.height;

        this.topCtx.fillStyle = '#111122';
        this.topCtx.fillRect(0, 0, w, h);

        if (this.currentMode === 'dungeon') {
            this.topCtx.fillStyle = '#FFD700';
            this.topCtx.font = 'bold 11px Arial';
            this.topCtx.textAlign = 'left';
            this.topCtx.fillText(`【ダンジョン】 B${this.dungeonFloor}F`, 10, 18);

            this.topCtx.fillStyle = '#FF4444';
            this.topCtx.fillText(`敵 HP: ${this.enemyHp} / ${this.enemyMaxHp}`, 10, 32);
            this.topCtx.fillText(`敵 ATK: ${this.enemyAtk}`, 10, 46);

            this.topCtx.fillStyle = '#8B0000';
            this.topCtx.beginPath();
            this.topCtx.arc(w - 40, 25, 15, 0, Math.PI * 2);
            this.topCtx.fill();
            this.topCtx.fillStyle = '#FFF';
            this.topCtx.font = '9px Arial';
            this.topCtx.textAlign = 'center';
            this.topCtx.fillText('敵', w - 40, 28);
        } else {
            this.topCtx.fillStyle = '#666';
            this.topCtx.font = '11px Arial';
            this.topCtx.textAlign = 'left';
            this.topCtx.fillText('【スカウト】', 10, 18);
        }

        const partyList = this.getPartyMonsters();
        const count = partyList.length;

        if (count > 0) {
            const spacing = w / (count + 1);
            partyList.forEach((monster, index) => {
                monster.x = spacing * (index + 1);
                monster.y = h / 2 + 20;
                monster.draw(this.topCtx);

                if (this.currentMode === 'dungeon') {
                    if (monster.currentHp === undefined) monster.currentHp = monster.hp;
                    const barW = 30;
                    const barH = 4;
                    const bx = monster.x - barW / 2;
                    const by = monster.y + 18;

                    this.topCtx.fillStyle = '#555';
                    this.topCtx.fillRect(bx, by, barW, barH);

                    const ratio = Math.max(0, monster.currentHp / monster.hp);
                    this.topCtx.fillStyle = ratio > 0.3 ? '#00FF00' : '#FF0000';
                    this.topCtx.fillRect(bx, by, barW * ratio, barH);

                    this.topCtx.fillStyle = '#FFF';
                    this.topCtx.font = '8px Arial';
                    this.topCtx.textAlign = 'center';
                    this.topCtx.fillText(`${monster.currentHp}/${monster.hp}`, monster.x, by + 12);
                }
            });
        } else {
            this.topCtx.fillStyle = '#666';
            this.topCtx.font = '12px Arial';
            this.topCtx.textAlign = 'center';
            this.topCtx.fillText('パーティーにモンスターがいません', w / 2, h / 2 + 10);
        }
    }

    getPartyMonsters() {
        if (!this.topMonsters || this.topMonsters.length === 0) return [];

        let party = [];
        if (this.partyMonsterIds && this.partyMonsterIds.length > 0) {
            party = this.partyMonsterIds
                .map(id => this.topMonsters[id])
                .filter(m => m !== undefined);
        }

        if (party.length === 0) {
            party = this.topMonsters.slice(0, 6);
        }
        return party;
    }

    initPartyModalEvents() {
        if (this.ui.partyButton && this.ui.partyModal) {
            this.ui.partyButton.addEventListener('click', () => {
                if (this.ui.partyButton.disabled) return;
                this.openPartyModal();
            });
        }
        if (this.ui.closePartyModal && this.ui.partyModal) {
            this.ui.closePartyModal.addEventListener('click', () => {
                this.closePartyModalScreen();
            });
        }
    }

    openPartyModal() {
        if (!this.partyMonsterIds || this.partyMonsterIds.length === 0) {
            this.partyMonsterIds = this.topMonsters.slice(0, 6).map((_, i) => i);
        }

        this.ui.openPartyModal(this.topMonsters, this.partyMonsterIds);
    }

    closePartyModalScreen() {
        this.partyMonsterIds = this.ui.getSelectedPartyIds();
        this.ui.closePartyModal();
        this.drawTopCanvas();

        if (window.saveUserDataToFirestore) {
            this.saveCloudData();
        }
    }

    saveState() {
        const snapshot = {
            tiles: this.board.snapshot(),
            score: this.score,
            mergeCount: this.mergeCount,
            itemCount: this.itemCount
        };
        this.history.push(snapshot);
    }

    undo() {
        if (this.isGameover || this.isMoving || this.history.length === 0) return;

        const previousState = this.history.pop();
        this.board.restore(previousState.tiles);
        this.score = previousState.score;
        this.mergeCount = previousState.mergeCount;
        this.itemCount = previousState.itemCount;

        for (let r = 0; r < this.NO_ROW; r++) {
            for (let c = 0; c < this.NO_COL; c++) {
                this.tileMx[r][c].x = c * (this.TILE_WIDTH + this.TILE_MARGIN);
                this.tileMx[r][c].y = r * (this.TILE_HEIGHT + this.TILE_MARGIN);
                this.tileMx[r][c].scale = 1;
                this.tileMx[r][c].isAnimating = false;
            }
        }

        this.tileChosen = false;
        this.itemActive = false;
        this.ui.setItemActive(false);

        this.drawTiles();
    }

    changeUserName(isFirstTime = false) {
        const promptMessage = 'プレイヤー名を入力してください:';
        const defaultName = (this.userName && this.userName !== 'Guest') ? this.userName : '';
        const inputName = prompt(promptMessage, defaultName);

        if (inputName !== null && inputName.trim() !== '') {
            this.userName = inputName.trim();
        } else if (isFirstTime && (!this.userName || this.userName === 'Guest')) {
            this.userName = 'Guest';
        }

        localStorage.setItem('gameUserName', this.userName);

        if (window.saveUserDataToFirestore) {
            window.saveUserDataToFirestore({ userName: this.userName });
        }
    }

    gameStart(no_row, no_col, no_types, highScoreKey) {
        this.NO_ROW = no_row;
        this.NO_COL = no_col;
        this.resizeCanvas();
        this.NO_TYPES = no_types;
        this.highScore = parseInt(localStorage.getItem(highScoreKey), 10) || 0;
        this.history = [];
        this.createTiles();
        if (this.currentMode === 'scout') {
            this.saveState();
        } else {
            this.ui.setPartyButtonEnabled(true);
        }
        this.drawTiles();
    }

    // ドラッグ量から移動方向を決め、合体できるならアニメーションを始める
    tryStartMove(dx, dy) {
        const r = this.chsnRow;
        const c = this.chsnCol;

        let dir = null; // [dr, dc]
        if (dx > this.TILE_WIDTH && c < this.NO_COL - 1) dir = [0, 1];
        else if (dx < -this.TILE_WIDTH && c > 0) dir = [0, -1];
        else if (dy > this.TILE_HEIGHT && r < this.NO_ROW - 1) dir = [1, 0];
        else if (dy < -this.TILE_HEIGHT && r > 0) dir = [-1, 0];
        if (!dir) return;

        const [dr, dc] = dir;
        if (!this.board.canMerge(r, c, r + dr, c + dc)) {
            this.release();
            return;
        }

        if (this.currentMode === 'scout') this.saveState();
        this.score += this.tileMx[r][c].value ** 2;
        this.isMoving = true;
        this.animateMove(dr, dc);
    }

    // 合体アニメーション（4方向共通）。終わったら Board に合体を反映する
    animateMove(dr, dc) {
        if (this.frameCount < this.moveFrame) {
            this.frameCount++;
            // 選んだタイルの「後ろ側」のタイルを、動かす方向へ少しずつずらす
            let r = this.chsnRow - dr;
            let c = this.chsnCol - dc;
            while (this.board.inBounds(r, c)) {
                this.tileMx[r][c].x += dc * (this.TILE_WIDTH + this.TILE_MARGIN) / this.moveFrame;
                this.tileMx[r][c].y += dr * (this.TILE_HEIGHT + this.TILE_MARGIN) / this.moveFrame;
                r -= dr;
                c -= dc;
            }
            this.drawTiles();
            requestAnimationFrame(() => this.animateMove(dr, dc));
        } else {
            const result = this.board.move(this.chsnRow, this.chsnCol, dr, dc);
            this.resetTilePositions();

            if (!result) {
                // アニメーション中に盤面がリセットされた等で、合体が成立しなかった場合
                this.tileChosen = false;
                this.frameCount = 0;
                this.isMoving = false;
                this.drawTiles();
                return;
            }
            this.finishMove(result.valueBefore); // 合体前の値（ダンジョンのダメージ計算に使う）
        }
    }

    // 全タイルの表示位置をマス目にそろえる
    resetTilePositions() {
        for (let r = 0; r < this.NO_ROW; r++) {
            for (let c = 0; c < this.NO_COL; c++) {
                this.tileMx[r][c].x = c * (this.TILE_WIDTH + this.TILE_MARGIN);
                this.tileMx[r][c].y = r * (this.TILE_HEIGHT + this.TILE_MARGIN);
            }
        }
    }

    createTiles() {
        this.board = Board.create(this.NO_ROW, this.NO_COL, this.NO_TYPES);
        this.tileMx = this.board.tiles;

        // 表示用のプロパティを足す（value / type は Board が持つ）
        for (let row = 0; row < this.NO_ROW; row++) {
            for (let col = 0; col < this.NO_COL; col++) {
                Object.assign(this.tileMx[row][col], {
                    x: col * (this.TILE_WIDTH + this.TILE_MARGIN),
                    y: row * (this.TILE_HEIGHT + this.TILE_MARGIN),
                    isMovable: true,
                    scale: 1,
                    isAnimating: false
                });
            }
        }
    }

    drawTiles() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.movableCheck();

        for (let row = 0; row < this.NO_ROW; row++) {
            for (let col = 0; col < this.NO_COL; col++) {
                this.drawTile(row, col);
            }
        }

        if (this.tileChosen) {
            this.drawTile(this.chsnRow, this.chsnCol);
        }

        if (this.isGameover) {
            this.drawGameOverOverlay();
        }

        this.ui.updateScore(this.score);
        this.highScore = Math.max(this.highScore, this.score);
        if (this.NO_ROW === 4 && this.NO_COL === 4) {
            localStorage.setItem(STORAGE_KEYS.HIGH_SCORE_4X4, this.highScore);
            this.ui.updateHighScore(this.highScore);
        }
        this.ui.updateMergeCount(this.mergeCount);
        this.ui.updateItemCount(this.itemCount);
    }

    drawTile(row, col) {
        const tile = this.tileMx[row][col];
        if (!tile) return;

        let offsetX = 3;
        let offsetY = 3;

        this.ctx.fillStyle = `rgb${this.COLORS[tile.type]}`;
        this.ctx.shadowColor = 'rgb(130, 130, 130)';

        if (tile.isMovable) {
            this.ctx.shadowBlur = 2;
            this.ctx.shadowOffsetX = 4;
            this.ctx.shadowOffsetY = 4;
            offsetX = 0;
            offsetY = 0;
        } else {
            this.ctx.shadowColor = 'rgba(0,0,0,0)';
        }

        const width = this.TILE_WIDTH * tile.scale;
        const height = this.TILE_HEIGHT * tile.scale;
        const cornerRadii = [0, width * 0.12, width * 0.24];
        const radius = cornerRadii[tile.type] || 0;

        const drawRoundedPath = (x, y, w, h, r) => {
            this.ctx.beginPath();
            if (typeof this.ctx.roundRect === 'function') {
                this.ctx.roundRect(x, y, w, h, r);
            } else {
                this.ctx.moveTo(x + r, y);
                this.ctx.arcTo(x + w, y, x + w, y + h, r);
                this.ctx.arcTo(x + w, y + h, x, y + h, r);
                this.ctx.arcTo(x, y + h, x, y, r);
                this.ctx.arcTo(x, y, x + w, y, r);
                this.ctx.closePath();
            }
        };

        drawRoundedPath(tile.x + offsetX, tile.y + offsetY, width, height, radius);
        this.ctx.fill();

        this.ctx.fillStyle = 'white';
        const fontSize = Math.min(this.TILE_WIDTH, this.TILE_HEIGHT) / 2;
        this.ctx.font = `bold ${fontSize}px Arial`;
        this.ctx.shadowColor = 'rgba(0,0,0,0)';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(tile.value, tile.x + offsetX + this.TILE_WIDTH / 2, tile.y + offsetY + this.TILE_HEIGHT / 2);

        if (!tile.isMovable) {
            this.ctx.fillStyle = 'rgba(1,1,1,0.3)';
            drawRoundedPath(tile.x + offsetX, tile.y + offsetY, width, height, radius);
            this.ctx.fill();
        }
    }

    reset() {
        this.tileMx = [];
        this.history = [];
        this.score = 0;
        this.mergeCount = 0;
        this.itemCount = 0;
        this.itemActive = false;
        this.ui.updateTimer('00:00.00');
        this.isCounting = false;
        this.isGameover = false;
        this.minValue = 1;
        this.ui.setItemActive(false);

        // リセット時：敵HPを初期化し、パーティーメンバーのHPを全回復
        this.enemyHp = this.enemyMaxHp;
        if (this.topMonsters && this.topMonsters.length > 0) {
            this.topMonsters.forEach(m => {
                m.currentHp = m.hp;
            });
        }
    }

    checkIsDeadlocked() {
        return this.board.isDeadlocked();
    }

    movableCheck() {
        if (this.isMoving) return;

        for (let row = 0; row < this.NO_ROW; row++) {
            for (let col = 0; col < this.NO_COL; col++) {
                this.tileMx[row][col].isMovable = false;
            }
        }
        const pairs = this.board.findMergePairs();
        for (const [r1, c1, r2, c2] of pairs) {
            this.tileMx[r1][c1].isMovable = true;
            this.tileMx[r2][c2].isMovable = true;
        }

        if (pairs.length === 0) {
            if (this.itemCount > 0) {
                if (!this.itemActive) {
                    this.itemActive = true;
                    this.ui.setItemActive(true);
                }
            } else if (!this.isGameover) {
                requestAnimationFrame(() => {
                    if (this.currentMode === 'scout') {
                        this.triggerScoutGameOver();
                    } else {
                        this.triggerDungeonGameOver();
                    }
                });
            }
        }
    }

    async triggerScoutGameOver() {
        if (this.isGameover) return;
        this.isGameover = true;
        this.isCounting = false;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        for (let row = 0; row < this.NO_ROW; row++) {
            for (let col = 0; col < this.NO_COL; col++) {
                this.drawTile(row, col);
            }
        }

        await new Promise(resolve => setTimeout(resolve, 200));

        if (this.topCanvas) {
            const monsterScore = Math.max(10, Math.floor(this.score / 5));
            const newMonster = new TopMonster(this.topCanvas.width, this.topCanvas.height, null, monsterScore);
            this.topMonsters.push(newMonster);

            if (this.topMonsters.length > this.maxMonsterCount) {
                await this.promptMonsterLimitSelection();
            }
        }

        this.drawGameOverOverlay();

        if (typeof this.changeUserName === 'function') {
            this.changeUserName(false);
        }

        if (window.currentUser) {
            this.uid = window.currentUser.uid;
        }

        await this.saveCloudData();

        if (window.saveScoreToFirestore) {
            await window.saveScoreToFirestore(this.score, this.mergeCount, this.userName);
        }

        await new Promise(resolve => setTimeout(resolve, 500));

        try {
            const [globalData, myData] = await Promise.all([
                window.fetchLeaderboardFromFirestore ? window.fetchLeaderboardFromFirestore(20) : [],
                (window.fetchMyLeaderboardFromFirestore && this.uid) ? window.fetchMyLeaderboardFromFirestore(this.uid, 20) : []
            ]);

            this.globalLeaderboard = globalData || [];
            this.myLeaderboard = myData || [];
        } catch (error) {
            console.error("ランキングデータの取得に失敗しました:", error);
        }

        this.drawTiles();
    }

    async triggerDungeonGameOver() {
        if (this.isGameover) return;
        this.isGameover = true;
        this.isCounting = false;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        for (let row = 0; row < this.NO_ROW; row++) {
            for (let col = 0; col < this.NO_COL; col++) {
                this.drawTile(row, col);
            }
        }

        await new Promise(resolve => setTimeout(resolve, 200));

        this.drawGameOverOverlay();

        if (window.currentUser) {
            this.uid = window.currentUser.uid;
        }

        await this.saveCloudData();

        await new Promise(resolve => setTimeout(resolve, 500));

        this.drawTiles();
    }

    async promptMonsterLimitSelection() {
        const selectedIndex = await this.ui.promptMonsterLimitSelection(this.topMonsters);

        const newTopMonsters = [];
        const oldToNewIndexMap = new Map();

        let newIdx = 0;
        this.topMonsters.forEach((m, oldIdx) => {
            if (oldIdx !== selectedIndex) {
                newTopMonsters.push(m);
                oldToNewIndexMap.set(oldIdx, newIdx);
                newIdx++;
            }
        });

        this.topMonsters = newTopMonsters;

        this.partyMonsterIds = this.partyMonsterIds
            .map(oldId => oldToNewIndexMap.get(oldId))
            .filter(newId => newId !== undefined);
    }

    async saveCloudData() {
        if (!window.saveUserDataToFirestore) return;

        const monstersData = this.topMonsters.map(m => ({
            x: m.x,
            y: m.y,
            type: m.type,
            radius: m.radius,
            attack: m.attack,
            hp: m.hp
        }));

        await window.saveUserDataToFirestore({
            uid: this.uid,
            userName: this.userName,
            highScore: this.highScore,
            monsters: monstersData,
            partyMonsterIds: this.partyMonsterIds,
            dungeonFloor: this.dungeonFloor
        });
    }

    drawGameOverOverlay() {
        const width = this.canvas.width;
        const height = this.canvas.height;

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
        this.ctx.fillRect(0, 0, width, height);

        if (this.currentMode === 'dungeon') {
            this.ctx.fillStyle = '#FF4444';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('ゲームオーバー (全滅)', width / 2, 30);

            this.ctx.fillStyle = '#FFD700';
            this.ctx.font = 'bold 14px Arial';
            this.ctx.fillText(`到達階: B${this.dungeonFloor}F`, width / 2, 60);

            return;
        }

        const padding = 6;
        const centerGap = 10;
        const colWidth = (width - (padding * 2) - centerGap) / 2;

        const col1X = padding;
        const col2X = padding + colWidth + centerGap;
        const startY = 16;
        const lineHeight = 11.5;

        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = 'bold 10px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('全国ランキング', col1X, startY - 4);
        this.renderRankingList(this.globalLeaderboard, col1X, colWidth, startY + 8, lineHeight);

        this.ctx.fillStyle = '#00FFFF';
        this.ctx.font = 'bold 10px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('マイランキング', col2X, startY - 4);
        this.renderMyRankingList(this.myLeaderboard, col2X, colWidth, startY + 8, lineHeight);
    }

    renderRankingList(dataList, startX, colWidth, startY, lineHeight) {
        if (!dataList || dataList.length === 0) {
            this.ctx.font = '8px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.fillStyle = '#888888';
            this.ctx.fillText('データなし', startX, startY);
            return;
        }

        dataList.slice(0, 20).forEach((item, index) => {
            const currentY = startY + (index * lineHeight);
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = index < 3 ? 'bold 8px Arial' : '7.5px Arial';

            this.ctx.textAlign = 'left';
            const rankText = `${index + 1}.${item.userName || 'Guest'}`;
            const truncatedName = rankText.length > 10 ? rankText.substring(0, 9) + '…' : rankText;
            this.ctx.fillText(truncatedName, startX, currentY);

            this.ctx.textAlign = 'right';
            this.ctx.fillText(`${item.score}`, startX + colWidth, currentY);
        });
    }

    renderMyRankingList(dataList, startX, colWidth, startY, lineHeight) {
        if (!dataList || dataList.length === 0) {
            this.ctx.font = '8px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.fillStyle = '#888888';
            this.ctx.fillText('データなし', startX, startY);
            return;
        }

        dataList.slice(0, 20).forEach((item, index) => {
            const currentY = startY + (index * lineHeight);
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = index < 3 ? 'bold 7.5px Arial' : '7px Arial';

            this.ctx.textAlign = 'left';
            const rankText = `${index + 1}. `;
            const dateText = item.dateStr || '';
            this.ctx.fillText(`${rankText}${dateText}`, startX, currentY);

            this.ctx.textAlign = 'right';
            this.ctx.fillText(`${item.score}`, startX + colWidth, currentY);
        });
    }

    release() {
        if (this.tileChosen) {
            this.tileMx[this.chsnRow][this.chsnCol].x = this.chsnCol * (this.TILE_WIDTH + this.TILE_MARGIN);
            this.tileMx[this.chsnRow][this.chsnCol].y = this.chsnRow * (this.TILE_HEIGHT + this.TILE_MARGIN);
            this.tileChosen = false;
        }
        this.drawTiles();
    }

    countUp() {
        if (!this.isCounting) return;
        const d = new Date(Date.now() - this.startTime);
        const m = String(d.getMinutes()).padStart(2, '0');
        const s = String(d.getSeconds()).padStart(2, '0');
        const ms = String(Math.floor(d.getMilliseconds() / 10)).padStart(2, '0');
        this.ui.updateTimer(`${m}:${s}.${ms}`);
        setTimeout(this.countUp.bind(this), 10);
    }

    playLevelUpAnim(row, col) {
        return new Promise((resolve) => {
            let frame = 0;
            const totalFrames = 30;
            const tile = this.tileMx[row][col];
            tile.isAnimating = true;

            const anim = () => {
                frame++;
                tile.scale = 1 - Math.sin((frame / totalFrames) * Math.PI);
                this.drawTiles();

                if (frame < totalFrames) {
                    requestAnimationFrame(anim);
                } else {
                    tile.scale = 1;
                    tile.isAnimating = false;
                    resolve();
                }
            };
            anim();
        });
    }

    finishMove(tileValue = 1) {
        this.mergeCount++;
        if (this.mergeCount % 10 === 0) {
            this.itemCount++;
        }

        if (this.currentMode === 'dungeon') {
            this.processDungeonCombat(tileValue);
        }

        this.tileChosen = false;
        this.frameCount = 0;
        this.isMoving = false;
        this.drawTiles();
    }

    processDungeonCombat(tileValue = 1) {
        const party = this.getPartyMonsters();
        if (party.length === 0) return;

        let totalAtk = party.reduce((sum, m) => sum + (m.attack), 0);
        let totalDamage = totalAtk * tileValue; // 攻撃力 × インクリメント前のタイルの数字
        this.enemyHp -= totalDamage;

        if (this.enemyHp <= 0) {
            this.setFloor(this.dungeonFloor + 1);
            if (window.saveUserDataToFirestore) {
                this.saveCloudData();
            }
        } else {
            let livingMonster = party.find(m => (m.currentHp !== undefined ? m.currentHp : m.hp) > 0);
            if (livingMonster) {
                if (livingMonster.currentHp === undefined) livingMonster.currentHp = livingMonster.hp;
                livingMonster.currentHp -= this.enemyAtk;

                if (livingMonster.currentHp <= 0) {
                    livingMonster.currentHp = 0;
                }
            }

            const allDead = party.every(m => (m.currentHp !== undefined ? m.currentHp : m.hp) <= 0);
            if (allDead) {
                this.triggerDungeonGameOver();
            }
        }
    }
}
