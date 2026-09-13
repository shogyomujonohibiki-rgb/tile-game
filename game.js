'use strict';

import { TopMonster } from './monster.js';

export class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.topCanvas = document.getElementById('topCanvas');
        this.topCtx = this.topCanvas ? this.topCanvas.getContext('2d') : null;

        this.timer = document.getElementById('timer');
        this.game4x4 = document.getElementById('game4x4');
        this.undoButton = document.getElementById('undoButton');
        this.itemButton = document.getElementById('itemButton');
        this.scoreBoard = document.getElementById('scoreBoard');
        this.highScoreBoard = document.getElementById('highScoreBoard');
        this.mergeCountBoard = document.getElementById('mergeCountBoard');
        this.itemCountBoard = document.getElementById('itemCountBoard');

        this.uid = window.currentUser ? window.currentUser.uid : null;

        this.TILE_MARGIN = 5;
        this.COLORS = ['(230, 82, 82)', '(79, 54, 219)', '(74, 162, 74)'];
        this.ANIMATION_DURATION = 150;

        this.NO_ROW = 4;
        this.NO_COL = 4;
        this.NO_TYPES = [5, 5, 6];

        this.topMonsters = [];

        this.resizeCanvas();
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.drawTiles();
        });

        this.initTopGarden();
        this.startTopAnimation();

        this.initializeColorSample();

        const savedName = localStorage.getItem('gameUserName');
        if (!savedName) {
            this.userName = 'Guest';
            this.changeUserName(true);
        } else {
            this.userName = savedName;
        }

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

        if (this.topCanvas) {
            this.topCanvas.addEventListener('pointerdown', (e) => {
                if (this.selectingMonsterToDelete) {
                    const rect = this.topCanvas.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const clickY = e.clientY - rect.top;

                    let clickedIndex = -1;
                    let minDist = 20;
                    this.topMonsters.forEach((m, idx) => {
                        const dist = Math.hypot(m.x - clickX, m.y - clickY);
                        if (dist < minDist) {
                            minDist = dist;
                            clickedIndex = idx;
                        }
                    });

                    if (clickedIndex !== -1) {
                        this.topMonsters.splice(clickedIndex, 1);
                        this.selectingMonsterToDelete = false;
                    }
                }
            });
        }

        this.game4x4.addEventListener('click', () => {
            this.reset();
            this.gameStart(4, 4, [5, 5, 6], 'highScore4x4');
        });

        if (this.undoButton) {
            this.undoButton.addEventListener('click', () => {
                this.undo();
            });
        }

        this.itemButton.addEventListener('click', () => {
            if (this.itemCount > 0) {
                this.itemActive = !this.itemActive;
            }

            if (this.itemActive) {
                this.itemButton.classList.add('active');
            } else {
                this.itemButton.classList.remove('active');
            }
        });

        this.canvas.addEventListener('pointerdown', (e) => {
            if (e.cancelable) e.preventDefault();
            if (this.isGameover || this.selectingMonsterToDelete) return;

            if (!this.isCounting) {
                this.isCounting = true;
                this.startTime = Date.now();
                this.countUp();
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
                    this.saveState();
                    this.itemActive = false;
                    if (this.itemButton) this.itemButton.classList.remove('active');

                    this.itemCount--;
                    this.tileMx[newRow][newCol].value++;

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
            if (this.isMoving || this.isGameover || this.selectingMonsterToDelete) return;

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

                if (dx > this.TILE_WIDTH && this.chsnCol < this.NO_COL - 1) {
                    if (!this.canMergeTile(this.chsnRow, this.chsnCol + 1)) {
                        this.release();
                    } else {
                        this.saveState();
                        this.score += this.tileMx[this.chsnRow][this.chsnCol].value ** 2;
                        this.isMoving = true;
                        this.moveRight();
                    }
                } else if (dx < this.TILE_WIDTH * -1 && this.chsnCol > 0) {
                    if (!this.canMergeTile(this.chsnRow, this.chsnCol - 1)) {
                        this.release();
                    } else {
                        this.saveState();
                        this.score += this.tileMx[this.chsnRow][this.chsnCol].value ** 2;
                        this.isMoving = true;
                        this.moveLeft();
                    }
                } else if (dy > this.TILE_HEIGHT && this.chsnRow < this.NO_ROW - 1) {
                    if (!this.canMergeTile(this.chsnRow + 1, this.chsnCol)) {
                        this.release();
                    } else {
                        this.saveState();
                        this.score += this.tileMx[this.chsnRow][this.chsnCol].value ** 2;
                        this.isMoving = true;
                        this.moveDown();
                    }
                } else if (dy < this.TILE_HEIGHT * -1 && this.chsnRow > 0) {
                    if (!this.canMergeTile(this.chsnRow - 1, this.chsnCol)) {
                        this.release();
                    } else {
                        this.saveState();
                        this.score += this.tileMx[this.chsnRow][this.chsnCol].value ** 2;
                        this.isMoving = true;
                        this.moveUp();
                    }
                }
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

        this.gameStart(4, 4, [5, 5, 6], 'highScore4x4');
    }

    resizeCanvas() {
        this.canvas.width = 240;
        this.canvas.height = 250;

        if (this.topCanvas) {
            const topRect = this.topCanvas.getBoundingClientRect();
            this.topCanvas.width = topRect.width || 343;
            this.topCanvas.height = 225;
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
        this.topMonsters = [
            new TopMonster(this.topCanvas.width, this.topCanvas.height, 1, 10)
        ];
        this.selectingMonsterToDelete = false;
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

        this.topCtx.fillStyle = '#7ec850';
        this.topCtx.fillRect(0, 0, w, h);

        this.topCtx.fillStyle = '#d7ccc8';
        this.topCtx.beginPath();
        this.topCtx.arc(w / 2, h / 2, Math.min(w, h) * 0.35, 0, Math.PI * 2);
        this.topCtx.fill();

        this.topCtx.fillStyle = '#7ec850';
        this.topCtx.beginPath();
        this.topCtx.arc(w / 2, h / 2, Math.min(w, h) * 0.23, 0, Math.PI * 2);
        this.topCtx.fill();

        const trees = [
            { x: 30, y: 30 },
            { x: w - 30, y: 30 },
            { x: 30, y: h - 30 },
            { x: w - 30, y: h - 30 }
        ];

        trees.forEach(tree => {
            this.topCtx.fillStyle = 'rgba(0,0,0,0.15)';
            this.topCtx.beginPath();
            this.topCtx.arc(tree.x + 2, tree.y + 2, 12, 0, Math.PI * 2);
            this.topCtx.fill();

            this.topCtx.fillStyle = '#2e7d32';
            this.topCtx.beginPath();
            this.topCtx.arc(tree.x, tree.y, 12, 0, Math.PI * 2);
            this.topCtx.fill();
        });

        this.topMonsters.forEach(monster => {
            monster.update();
            monster.draw(this.topCtx);
        });

        if (this.selectingMonsterToDelete) {
            this.topCtx.fillStyle = 'rgba(255, 0, 0, 0.4)';
            this.topCtx.fillRect(0, 0, w, h);
            this.topCtx.fillStyle = '#FFF';
            this.topCtx.font = 'bold 14px Arial';
            this.topCtx.textAlign = 'center';
            this.topCtx.fillText('削除するモンスターを選んでタップしてください', w / 2, 30);
        }
    }

    saveState() {
        const snapshot = {
            tileMx: JSON.parse(JSON.stringify(this.tileMx)),
            score: this.score,
            mergeCount: this.mergeCount,
            itemCount: this.itemCount
        };
        this.history.push(snapshot);
    }

    undo() {
        if (this.isGameover || this.isMoving || this.history.length === 0) return;

        const previousState = this.history.pop();
        this.tileMx = previousState.tileMx;
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
        if (this.itemButton) this.itemButton.classList.remove('active');

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
        this.saveState();
        this.drawTiles();
    }

    moveRight() {
        if (this.frameCount < this.moveFrame) {
            this.frameCount++;
            for (let c = 0; c < this.chsnCol; c++) {
                this.tileMx[this.chsnRow][this.chsnCol - 1 - c].x += (this.TILE_WIDTH + this.TILE_MARGIN) / this.moveFrame;
            }
            this.drawTiles();
            requestAnimationFrame(() => this.moveRight());
        } else {
            this.tileMx[this.chsnRow][this.chsnCol + 1].value += 1;
            for (let c = 0; c < this.chsnCol; c++) {
                this.tileMx[this.chsnRow][this.chsnCol - c].value = this.tileMx[this.chsnRow][this.chsnCol - 1 - c].value;
                this.tileMx[this.chsnRow][this.chsnCol - c].type = this.tileMx[this.chsnRow][this.chsnCol - 1 - c].type;
                this.tileMx[this.chsnRow][this.chsnCol - c].x = (this.chsnCol - c) * (this.TILE_WIDTH + this.TILE_MARGIN);
                this.tileMx[this.chsnRow][this.chsnCol - c].y = this.chsnRow * (this.TILE_HEIGHT + this.TILE_MARGIN);
            }
            this.tileMx[this.chsnRow][0].value = this.tileMx[this.chsnRow][this.chsnCol + 1].value - 1;
            this.tileMx[this.chsnRow][0].type = (this.tileMx[this.chsnRow][this.chsnCol + 1].type + 1) % 3;
            this.tileMx[this.chsnRow][0].x = 0;
            this.tileMx[this.chsnRow][0].y = this.chsnRow * (this.TILE_HEIGHT + this.TILE_MARGIN);

            this.finishMove();
        }
    }

    moveLeft() {
        if (this.frameCount < this.moveFrame) {
            this.frameCount++;
            for (let c = 0; c < this.NO_COL - this.chsnCol - 1; c++) {
                this.tileMx[this.chsnRow][this.chsnCol + 1 + c].x += -(this.TILE_WIDTH + this.TILE_MARGIN) / this.moveFrame;
            }
            this.drawTiles();
            requestAnimationFrame(() => this.moveLeft());
        } else {
            this.tileMx[this.chsnRow][this.chsnCol - 1].value += 1;
            for (let c = 0; c < this.NO_COL - this.chsnCol - 1; c++) {
                this.tileMx[this.chsnRow][this.chsnCol + c].value = this.tileMx[this.chsnRow][this.chsnCol + 1 + c].value;
                this.tileMx[this.chsnRow][this.chsnCol + c].type = this.tileMx[this.chsnRow][this.chsnCol + 1 + c].type;
                this.tileMx[this.chsnRow][this.chsnCol + c].x = (this.chsnCol + c) * (this.TILE_WIDTH + this.TILE_MARGIN);
                this.tileMx[this.chsnRow][this.chsnCol + c].y = this.chsnRow * (this.TILE_HEIGHT + this.TILE_MARGIN);
            }
            this.tileMx[this.chsnRow][this.NO_COL - 1].value = this.tileMx[this.chsnRow][this.chsnCol - 1].value - 1;
            this.tileMx[this.chsnRow][this.NO_COL - 1].type = (this.tileMx[this.chsnRow][this.chsnCol - 1].type + 1) % 3;
            this.tileMx[this.chsnRow][this.NO_COL - 1].x = (this.NO_COL - 1) * (this.TILE_WIDTH + this.TILE_MARGIN);
            this.tileMx[this.chsnRow][this.NO_COL - 1].y = this.chsnRow * (this.TILE_HEIGHT + this.TILE_MARGIN);

            this.finishMove();
        }
    }

    moveDown() {
        if (this.frameCount < this.moveFrame) {
            this.frameCount++;
            for (let c = 0; c < this.chsnRow; c++) {
                this.tileMx[this.chsnRow - 1 - c][this.chsnCol].y += (this.TILE_HEIGHT + this.TILE_MARGIN) / this.moveFrame;
            }
            this.drawTiles();
            requestAnimationFrame(() => this.moveDown());
        } else {
            this.tileMx[this.chsnRow + 1][this.chsnCol].value += 1;
            for (let c = 0; c < this.chsnRow; c++) {
                this.tileMx[this.chsnRow - c][this.chsnCol].value = this.tileMx[this.chsnRow - 1 - c][this.chsnCol].value;
                this.tileMx[this.chsnRow - c][this.chsnCol].type = this.tileMx[this.chsnRow - 1 - c][this.chsnCol].type;
                this.tileMx[this.chsnRow - c][this.chsnCol].x = this.chsnCol * (this.TILE_WIDTH + this.TILE_MARGIN);
                this.tileMx[this.chsnRow - c][this.chsnCol].y = (this.chsnRow - c) * (this.TILE_HEIGHT + this.TILE_MARGIN);
            }
            this.tileMx[0][this.chsnCol].value = this.tileMx[this.chsnRow + 1][this.chsnCol].value - 1;
            this.tileMx[0][this.chsnCol].type = (this.tileMx[this.chsnRow + 1][this.chsnCol].type + 1) % 3;
            this.tileMx[0][this.chsnCol].x = this.chsnCol * (this.TILE_WIDTH + this.TILE_MARGIN);
            this.tileMx[0][this.chsnCol].y = 0;

            this.finishMove();
        }
    }

    moveUp() {
        if (this.frameCount < this.moveFrame) {
            this.frameCount++;
            for (let c = 0; c < this.NO_ROW - this.chsnRow - 1; c++) {
                this.tileMx[this.chsnRow + 1 - c][this.chsnCol].y += -(this.TILE_HEIGHT + this.TILE_MARGIN) / this.moveFrame;
            }
            this.drawTiles();
            requestAnimationFrame(() => this.moveUp());
        } else {
            this.tileMx[this.chsnRow - 1][this.chsnCol].value += 1;
            for (let c = 0; c < this.NO_ROW - this.chsnRow - 1; c++) {
                this.tileMx[this.chsnRow + c][this.chsnCol].value = this.tileMx[this.chsnRow + 1 + c][this.chsnCol].value;
                this.tileMx[this.chsnRow + c][this.chsnCol].type = this.tileMx[this.chsnRow + 1 + c][this.chsnCol].type;
                this.tileMx[this.chsnRow + c][this.chsnCol].x = this.chsnCol * (this.TILE_WIDTH + this.TILE_MARGIN);
                this.tileMx[this.chsnRow + c][this.chsnCol].y = (this.chsnRow + c) * (this.TILE_HEIGHT + this.TILE_MARGIN);
            }
            this.tileMx[this.NO_ROW - 1][this.chsnCol].value = this.tileMx[this.chsnRow - 1][this.chsnCol].value - 1;
            this.tileMx[this.NO_ROW - 1][this.chsnCol].type = (this.tileMx[this.chsnRow - 1][this.chsnCol].type + 1) % 3;
            this.tileMx[this.NO_ROW - 1][this.chsnCol].x = this.chsnCol * (this.TILE_WIDTH + this.TILE_MARGIN);
            this.tileMx[this.NO_ROW - 1][this.chsnCol].y = (this.NO_ROW - 1) * (this.TILE_HEIGHT + this.TILE_MARGIN);

            this.finishMove();
        }
    }

    createTiles() {
        const typesCopy = [...this.NO_TYPES];
        this.tileMx = [];
        for (let row = 0; row < this.NO_ROW; row++) {
            let tileRows = [];
            for (let col = 0; col < this.NO_COL; col++) {
                let tColor;
                do {
                    const t = Math.floor(Math.random() * (typesCopy[0] + typesCopy[1] + typesCopy[2]));
                    tColor = (t < typesCopy[0]) ? 0 :
                        (t < typesCopy[0] + typesCopy[1]) ? 1 : 2;
                } while (typesCopy[tColor] < 1);
                typesCopy[tColor] -= 1;

                let tile = {
                    x: col * (this.TILE_WIDTH + this.TILE_MARGIN),
                    y: row * (this.TILE_HEIGHT + this.TILE_MARGIN),
                    value: 1,
                    type: tColor,
                    isMovable: true,
                    scale: 1,
                    isAnimating: false
                };
                tileRows.push(tile);
            }
            this.tileMx.push(tileRows);
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

        this.scoreBoard.innerHTML = `スコア ${this.score}`;
        this.highScore = Math.max(this.highScore, this.score);
        if (this.NO_ROW === 4 && this.NO_COL === 4) {
            localStorage.setItem('highScore4x4', this.highScore);
            this.highScoreBoard.innerHTML = `ハイスコア ${this.highScore}`;
        }
        this.mergeCountBoard.innerHTML = `マージ回数：${this.mergeCount}`;
        if (this.itemCountBoard) {
            this.itemCountBoard.innerHTML = `+1アイテム：${this.itemCount}`;
        }
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
        if (this.timer) this.timer.textContent = '00:00.00';
        this.isCounting = false;
        this.isGameover = false;
        this.minValue = 1;
        if (this.itemButton) this.itemButton.classList.remove('active');
    }

    movableCheck() {
        if (this.isMoving) return;

        let check = 0;
        for (let row = 0; row < this.NO_ROW; row++) {
            for (let col = 0; col < this.NO_COL; col++) {
                this.tileMx[row][col].isMovable = false;
            }
        }
        for (let row = 0; row < this.NO_ROW; row++) {
            for (let col = 0; col < this.NO_COL - 1; col++) {
                if (this.tileMx[row][col].value === this.tileMx[row][col + 1].value &&
                    this.tileMx[row][col].type === this.tileMx[row][col + 1].type) {
                    this.tileMx[row][col].isMovable = true;
                    this.tileMx[row][col + 1].isMovable = true;
                    check++;
                }
            }
        }
        for (let col = 0; col < this.NO_COL; col++) {
            for (let row = 0; row < this.NO_ROW - 1; row++) {
                if (this.tileMx[row][col].value === this.tileMx[row + 1][col].value &&
                    this.tileMx[row][col].type === this.tileMx[row + 1][col].type) {
                    this.tileMx[row][col].isMovable = true;
                    this.tileMx[row + 1][col].isMovable = true;
                    check++;
                }
            }
        }

        if (check === 0) {
            if (this.itemCount > 0) {
                if (!this.itemActive) {
                    this.itemActive = true;
                    if (this.itemButton) {
                        this.itemButton.classList.add('active');
                    }
                }
            } else if (!this.isGameover) {
                requestAnimationFrame(() => {
                    this.triggerGameOver();
                });
            }
        }
    }

    async triggerGameOver() {
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
            this.topMonsters.push(new TopMonster(this.topCanvas.width, this.topCanvas.height, null, monsterScore));

            if (this.topMonsters.length > 20) {
                this.selectingMonsterToDelete = true;
            }
        }

        this.drawGameOverOverlay();

        if (typeof this.changeUserName === 'function') {
            this.changeUserName(false);
        }

        if (window.currentUser) {
            this.uid = window.currentUser.uid;
        }

        if (window.saveUserDataToFirestore) {
            // TopMonsterインスタンスをプレーンなオブジェクト配列に変換
            const monstersData = this.topMonsters.map(m => ({
                x: m.x,
                y: m.y,
                vx: m.vx,
                vy: m.vy,
                type: m.type,
                radius: m.radius,
                attack: m.attack,
                hp: m.hp
            }));

            await window.saveUserDataToFirestore({
                uid: this.uid,
                userName: this.userName,
                highScore: this.highScore,
                monsters: monstersData // モンスターデータを追加
            });
        }

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

    drawGameOverOverlay() {
        const width = this.canvas.width;
        const height = this.canvas.height;

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
        this.ctx.fillRect(0, 0, width, height);

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
        this.ctx.fillText('全国', col1X, startY - 4);
        this.renderRankingList(this.globalLeaderboard, col1X, colWidth, startY + 8, lineHeight);

        this.ctx.fillStyle = '#00FFFF';
        this.ctx.font = 'bold 10px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('マイ', col2X, startY - 4);
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
        if (this.timer) {
            this.timer.textContent = `${m}:${s}.${ms}`;
        }
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

    finishMove() {
        this.mergeCount++;
        if (this.mergeCount % 10 === 0) {
            this.itemCount++;
        }

        this.tileChosen = false;
        this.frameCount = 0;
        this.isMoving = false;
        this.drawTiles();
    }

    canMergeTile(targetRow, targetCol) {
        const currentTile = this.tileMx[this.chsnRow][this.chsnCol];
        const targetTile = this.tileMx[targetRow][targetCol];
        return currentTile.type === targetTile.type && currentTile.value === targetTile.value;
    }

    initializeColorSample() {
        const colorSample = document.getElementById('colorSample');
        if (!colorSample) return;

        colorSample.innerHTML = '';
        const colorSequence = [...this.COLORS, this.COLORS[0]];

        colorSequence.forEach((color, index) => {
            const box = document.createElement('div');
            box.className = 'sample-box';
            box.style.backgroundColor = `rgb${color}`;
            colorSample.appendChild(box);

            if (index < colorSequence.length - 1) {
                const arrow = document.createElement('span');
                arrow.className = 'sample-arrow';
                arrow.textContent = '→';
                colorSample.appendChild(arrow);
            }
        });
    }
}
