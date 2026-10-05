'use strict';

import { TopMonster } from './monster.js';
import { BOARD, STORAGE_KEYS, MONSTER, BattleManager } from './config.js';
import { Board } from './board.js';
import { UI } from './ui.js';
import { GameRenderer } from './renderer.js';
import { DataManager } from './data.js';

export class Game {
    constructor() {
        this.ui = new UI();
        this.battleManager = new BattleManager();
        this.dataManager = new DataManager();

        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.topCanvas = document.getElementById('topCanvas');
        this.topCtx = this.topCanvas ? this.topCanvas.getContext('2d') : null;

        this.renderer = new GameRenderer(this.canvas, this.ctx, this.topCanvas, this.topCtx);

        this.uid = window.currentUser ? window.currentUser.uid : null;
        this.currentMode = 'scout';

        this.TILE_MARGIN = BOARD.TILE_MARGIN;
        this.COLORS = BOARD.COLORS;

        this.NO_ROW = BOARD.ROWS;
        this.NO_COL = BOARD.COLS;
        this.NO_TYPES = BOARD.TYPE_COUNTS;

        this.maxMonsterCount = MONSTER.MAX_OWNED;
        this.topMonsters = [];
        this.partyMonsterIds = [null, null, null, null, null, null];

        this.resizeCanvas();
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.drawTiles();
        });

        this.initTopGarden();
        this.startTopAnimation();
        this.initModeSwitchEvents();

        const savedName = localStorage.getItem('gameUserName');
        if (!savedName) {
            this.userName = 'Guest';
            this.changeUserName(true);
        } else {
            this.userName = savedName;
        }

        this.board = null;
        this.tileMx = [];
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
        this.isResetting = false;
        this.isTransitioning = false;

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

        this.ui.setUndoButtonVisible(this.currentMode === 'scout');

        if (this.ui.undoButton) {
            this.ui.undoButton.addEventListener('click', () => {
                if (this.currentMode !== 'scout') return;
                this.undo();
            });
        }

        if (this.ui.itemButton) {
            this.ui.itemButton.addEventListener('click', () => {
                if (this.itemCount > 0) {
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
            if (this.isGameover || this.isResetting || this.isTransitioning || this.currentMode === 'merge') return;

            if (!this.isCounting) {
                this.isCounting = true;
                this.startTime = Date.now();
                this.countUp();

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
            if (this.isMoving || this.isGameover || this.isResetting || this.currentMode === 'merge') return;

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
        if (this.ui.modeMergeBtn) {
            this.ui.modeMergeBtn.addEventListener('click', () => {
                this.switchMode('merge');
            });
        }
    }

    setFloor(floor) {
        this.battleManager.setFloor(floor);
    }

    startBoard() {
        this.gameStart(BOARD.ROWS, BOARD.COLS, BOARD.TYPE_COUNTS, STORAGE_KEYS.HIGH_SCORE_4X4);
    }

    async switchMode(mode) {
        if (this.currentMode === mode && mode !== 'merge') return;
        this.currentMode = mode;

        if (mode === 'merge') {
            await this.openMergeScreen();
            return;
        }

        this.isResetting = false;
        this.isTransitioning = false;
        this.isMoving = false;
        this.tileChosen = false;

        this.reset();
        this.startBoard();

        this.ui.switchModeUI(mode);
        this.ui.setPartyButtonEnabled(true);
        this.ui.setUndoButtonVisible(mode === 'scout');
        this.isGameover = false;
        this.drawTiles();

        if (mode === 'dungeon' && this.renderer && typeof this.renderer.playMonsterFadeIn === 'function') {
            await this.renderer.playMonsterFadeIn(this);
            this.isTransitioning = false;
            this.tileChosen = false;
            this.isMoving = false;

            requestAnimationFrame(() => {
                this.drawTiles();
            });
        }
    }

    async openMergeScreen() {
        const executed = await this.ui.showMergeScreen(this.topMonsters, (baseIdx, matIdx) => {
            this.executeMerge(baseIdx, matIdx);
        });
        // 合体画面を閉じたらスカウトモードに戻す
        this.currentMode = 'scout';
        this.ui.switchModeUI('scout');
        this.drawTiles();
    }

    executeMerge(baseIndex, materialIndex) {
        const base = this.topMonsters[baseIndex];
        const material = this.topMonsters[materialIndex];
        if (!base || !material) return;

        // ▼ 合体ロジック: 「足されるのは元のオリジナルのステータスのみ。合体して増えた分は、足されない。」
        const addAtk = Math.floor(material.originalAttack * 0.5);
        const addHp = Math.floor(material.originalHp * 0.5);

        base.addedAttack += addAtk;
        base.addedHp += addHp;
        base.mergeCount = (base.mergeCount || 0) + 1;

        // 素材モンスターを削除し、partyMonsterIds のインデックスを整理
        const newTopMonsters = [];
        const oldToNewIndexMap = new Map();

        let newIdx = 0;
        this.topMonsters.forEach((m, oldIdx) => {
            if (oldIdx !== materialIndex) {
                newTopMonsters.push(m);
                oldToNewIndexMap.set(oldIdx, newIdx);
                newIdx++;
            }
        });

        this.topMonsters = newTopMonsters;
        this.partyMonsterIds = this.partyMonsterIds.map(oldId => {
            if (oldId === null || oldId === undefined) return null;
            if (oldId === materialIndex) return null;
            return oldToNewIndexMap.get(oldId) !== undefined ? oldToNewIndexMap.get(oldId) : null;
        });

        this.dataManager.saveCloudData(this);
        this.drawTiles();
    }

    resizeCanvas() {
        this.canvas.width = 240;
        this.canvas.height = 250;

        if (this.topCanvas) {
            const topRect = this.topCanvas.getBoundingClientRect();
            this.topCanvas.width = topRect.width || 343;
            this.topCanvas.height = 290;
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
            this.renderer.drawTopCanvas(this);
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    drawTiles() {
        this.renderer.drawTiles(this);
    }

    getPartyMonsters() {
        if (!this.topMonsters || this.topMonsters.length === 0) return [];

        return this.partyMonsterIds
            .map(id => (id !== null && id !== undefined ? this.topMonsters[id] : null))
            .filter(m => m !== undefined);
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
        if (this.isGameover || this.isMoving || this.isResetting || this.history.length === 0) return;

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
        this.dataManager.saveCloudData(this);
    }

    gameStart(no_row, no_col, no_types, highScoreKey) {
        this.NO_ROW = no_row;
        this.NO_COL = no_col;
        this.highScoreKey = highScoreKey;
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

    tryStartMove(dx, dy) {
        const r = this.chsnRow;
        const c = this.chsnCol;

        let dir = null;
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

    animateMove(dr, dc) {
        if (this.frameCount < this.moveFrame) {
            this.frameCount++;
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
                this.tileChosen = false;
                this.frameCount = 0;
                this.isMoving = false;
                this.drawTiles();
                return;
            }
            this.finishMove(result.valueBefore);
        }
    }

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
        this.isResetting = false;
        this.isTransitioning = false;
        this.isMoving = false;
        this.tileChosen = false;
        this.minValue = 1;
        this.ui.setItemActive(false);

        this.battleManager.reset(this.topMonsters);
    }

    checkIsDeadlocked() {
        return this.board.isDeadlocked();
    }

    movableCheck() {
        if (this.isMoving || this.isResetting) return;

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
            } else if (!this.isGameover && !this.isResetting) {
                requestAnimationFrame(async () => {
                    if (this.currentMode === 'scout') {
                        this.triggerScoutGameOver();
                    } else {
                        await this.resetPuzzleBoard();
                    }
                });
            }
        }
    }

    async resetPuzzleBoard() {
        if (this.isGameover || this.isResetting) return;
        this.isResetting = true;
        this.itemActive = false;
        this.ui.setItemActive(false);

        await this.playResetAnimation();

        this.isResetting = false;

        requestAnimationFrame(() => {
            this.drawTiles();
        });
    }

    playResetAnimation() {
        return new Promise((resolve) => {
            const duration = 1200;
            const startTime = Date.now();

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(1, elapsed / duration);

                let alpha = 0;
                if (progress < 0.3) {
                    alpha = (progress / 0.3) * 0.85;
                } else if (progress < 0.7) {
                    alpha = 0.85;
                    if (!this.hasResetTilesInAnim) {
                        this.createTiles();
                        this.hasResetTilesInAnim = true;
                    }
                } else {
                    alpha = ((1 - progress) / 0.3) * 0.85;
                }

                this.drawTiles();
                this.renderer.drawResetOverlay('', alpha);

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.hasResetTilesInAnim = false;
                    resolve();
                }
            };

            this.hasResetTilesInAnim = false;
            requestAnimationFrame(animate);
        });
    }

    async triggerScoutGameOver() {
        if (this.isGameover) return;
        this.isGameover = true;
        this.isCounting = false;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        for (let row = 0; row < this.NO_ROW; row++) {
            for (let col = 0; col < this.NO_COL; col++) {
                this.renderer.drawTile(this, row, col);
            }
        }

        await new Promise(resolve => setTimeout(resolve, 200));

        if (this.topCanvas) {
            const monsterScore = Math.max(10, Math.floor(this.score / 5));
            // ▼ 現在のダンジョン階層を取得して渡す
            const currentFloor = this.battleManager ? this.battleManager.dungeonFloor : 1;
            const newMonster = new TopMonster(this.topCanvas.width, this.topCanvas.height, null, monsterScore, null, currentFloor);
            this.topMonsters.push(newMonster);

            const emptyIndex = this.partyMonsterIds.indexOf(null);
            if (emptyIndex !== -1 && !this.partyMonsterIds.includes(this.topMonsters.length - 1)) {
                this.partyMonsterIds[emptyIndex] = this.topMonsters.length - 1;
            }

            // ▼ 「20体を超えて生成した場合は、合体画面に遷移するようにして」
            if (this.topMonsters.length > this.maxMonsterCount) {
                await this.ui.promptMonsterLimitSelection(this.topMonsters);
                await this.openMergeScreen();
            }
        }

        this.renderer.drawGameOverOverlay(this);

        if (typeof this.changeUserName === 'function') {
            this.changeUserName(false);
        }

        if (window.currentUser) {
            this.uid = window.currentUser.uid;
        }

        await this.dataManager.saveCloudData(this);
        await this.dataManager.saveScore(this.score, this.mergeCount, this.userName);

        await new Promise(resolve => setTimeout(resolve, 500));

        const { globalLeaderboard, myLeaderboard } = await this.dataManager.fetchLeaderboards(this.uid);
        this.globalLeaderboard = globalLeaderboard;
        this.myLeaderboard = myLeaderboard;

        this.drawTiles();
    }

    async triggerDungeonGameOver() {
        if (this.isGameover) return;
        this.isGameover = true;
        this.isCounting = false;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        for (let row = 0; row < this.NO_ROW; row++) {
            for (let col = 0; col < this.NO_COL; col++) {
                this.renderer.drawTile(this, row, col);
            }
        }

        await new Promise(resolve => setTimeout(resolve, 200));

        this.renderer.drawGameOverOverlay(this);

        if (window.currentUser) {
            this.uid = window.currentUser.uid;
        }

        await this.dataManager.saveCloudData(this);

        await new Promise(resolve => setTimeout(resolve, 500));

        this.drawTiles();
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

    async processDungeonCombat(tileValue = 1) {
        const party = this.getPartyMonsters();

        const { isFloorCleared, isGameOver, attackEvents } = this.battleManager.processCombat(party, tileValue);

        if (attackEvents.length > 0 && this.renderer && typeof this.renderer.startAttackAnimation === 'function') {
            this.renderer.startAttackAnimation(attackEvents);
        }

        if (isFloorCleared) {
            party.forEach(m => {
                if (m && m.hp !== undefined) {
                    m.currentHp = m.hp;
                }
            });

            this.history = [];
            this.score = 0;
            this.mergeCount = 0;
            this.itemCount = 0;
            this.itemActive = false;
            this.ui.updateTimer('00:00.00');
            this.isCounting = false;
            this.isGameover = false;
            this.isResetting = false;
            this.minValue = 1;
            this.ui.setItemActive(false);

            this.dataManager.saveCloudData(this);

            await this.playFloorClearTransition();
        } else if (isGameOver) {
            this.triggerDungeonGameOver();
        }
    }

    playFloorClearTransition() {
        return new Promise((resolve) => {
            this.isTransitioning = true;
            const duration = 1000;
            const startTime = Date.now();

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(1, elapsed / duration);

                let alpha = 0;
                if (progress < 0.5) {
                    alpha = (progress / 0.5) * 1.0;
                } else {
                    if (!this.hasClearedTilesInAnim) {
                        this.createTiles();
                        this.hasClearedTilesInAnim = true;
                    }
                    alpha = ((1 - progress) / 0.5) * 1.0;
                }

                this.drawTiles();
                this.renderer.drawScreenOverlay(alpha, `B${this.battleManager.dungeonFloor}F CLEAR!`);

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.hasClearedTilesInAnim = false;
                    this.isTransitioning = false;
                    this.tileChosen = false;
                    this.isMoving = false;
                    this.isResetting = false;

                    requestAnimationFrame(() => {
                        this.drawTiles();
                    });
                    resolve();
                }
            };

            this.hasClearedTilesInAnim = false;
            requestAnimationFrame(animate);
        });
    }
}
