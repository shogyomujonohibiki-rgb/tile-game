'use strict';

import { TopMonster } from './monster.js';
import { BOARD, STORAGE_KEYS, MONSTER } from './config.js';
import { Board } from './board.js';
import { UI } from './ui.js';
import { GameRenderer } from './renderer.js';
import { BattleManager } from './battle.js';
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
        this.partyMonsterIds = [];

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

    setFloor(floor) {
        this.battleManager.setFloor(floor);
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
        if (this.ui.closePartyModalBtn && this.ui.partyModal) {
            this.ui.closePartyModalBtn.addEventListener('click', () => {
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
        this.renderer.drawTopCanvas(this);

        this.dataManager.saveCloudData(this);
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
        this.minValue = 1;
        this.ui.setItemActive(false);

        this.battleManager.reset(this.topMonsters);
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
                this.renderer.drawTile(this, row, col);
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
        const { isFloorCleared, isGameOver } = this.battleManager.processCombat(party, tileValue);

        if (isFloorCleared) {
            this.dataManager.saveCloudData(this);
        } else if (isGameOver) {
            this.triggerDungeonGameOver();
        }
    }
}
