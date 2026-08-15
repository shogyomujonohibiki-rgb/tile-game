'use strict'

{
    class Game {
        constructor() {
            //DOM要素の取得
            this.canvas = document.querySelector('canvas');
            this.ctx = this.canvas.getContext('2d');
            this.rect = this.canvas.getBoundingClientRect();
            this.timer = document.getElementById('timer');
            this.game4x4 = document.getElementById('game4x4');
            this.itemButton = document.getElementById('itemButton');
            //this.game4x5 = document.getElementById('game4x5');
            this.scoreBoard = document.getElementById('scoreBoard');
            this.highScoreBoard = document.getElementById('highScoreBoard');
            this.mergeCountBoard = document.getElementById('mergeCountBoard');
            this.itemCountBoard = document.getElementById('itemCountBoard');

            //定数・設定
            this.TILE_MARGIN = 5;
            this.COLORS = ['(230, 82, 82)', '(79, 54, 219)', '(74, 162, 74)'];
            this.ANIMATION_DURATION = 150;

            // カラーサンプルの初期化
            this.initializeColorSample();

            //ゲーム状態
            this.tileMx = [];
            this.score = 0;
            this.highScore = 0;
            this.mergeCount = 0;
            this.itemCount = 0;
            this.itemActive = false;
            this.isCounting = false;
            this.isGameover = false;
            this.isMoving = false;
            this.tileChosen = false;

            this.minValue = 1;
            this.startTime;

            this.NO_ROW = 4;
            this.NO_COL = 4;
            this.NO_TYPES = [5, 5, 6];
            this.TILE_WIDTH = this.rect.width / this.NO_COL - this.TILE_MARGIN;
            this.TILE_HEIGHT = this.rect.height / this.NO_ROW - this.TILE_MARGIN;

            this.startX = 0;
            this.startY = 0;

            this.chsnCol;
            this.chsnRow;
            this.frameCount = 0;
            this.moveDuration = 100;
            this.moveFq = 10;
            this.moveFrame = this.moveDuration / this.moveFq;


            this.game4x4.addEventListener('click', () => {
                this.reset();
                this.gameStart(4, 4, [5, 5, 6], 'highScore4x4');
            });

            this.itemButton.addEventListener('click', () => {
                if (this.itemCount > 0) {
                    this.itemActive = !this.itemActive;
                }

                // アイテムボタンの状態表示
                if (this.itemActive) {
                    this.itemButton.classList.add('active');
                } else {
                    this.itemButton.classList.remove('active');
                }

            });
            /*this.game4x5.addEventListener('click', () => {
                this.reset();
                this.gameStart(4, 5, [14, 3, 3], 'highScore4x5');
            });
            */

            this.canvas.addEventListener('pointerdown', (e) => {
                if (!this.isCounting) {
                    this.isCounting = true;
                    this.startTime = Date.now();
                    this.countUp();
                }
                if (this.isMoving) return;

                // タップのたびにrectを最新に更新して、スクロールやレイアウト変更に強くする
                this.rect = this.canvas.getBoundingClientRect();

                const newCol = Math.floor((e.clientX - this.rect.left) / (this.TILE_WIDTH + this.TILE_MARGIN));
                const newRow = Math.floor((e.clientY - this.rect.top) / (this.TILE_HEIGHT + this.TILE_MARGIN));

                // 範囲外のタッチを弾く
                if (newCol < 0 || newCol >= this.NO_COL || newRow < 0 || newRow >= this.NO_ROW) return;
        
                // アイテムが有効状態の場合
                if (this.itemActive) {
                    (async () => {
                        this.itemActive = false;
                        this.tileMx[newRow][newCol].value++;
                        await this.playLevelUpAnim(newRow, newCol);
                        this.itemCount--;
                        this.itemButton.classList.remove('active');
                        this.drawTiles();
                    })();
                    return;
                }

                this.startX = e.clientX;
                this.startY = e.clientY;
                this.chsnCol = newCol;
                this.chsnRow = newRow;
                this.tileChosen = true;
                this.drawTiles();
            });

            this.canvas.addEventListener('pointermove', (e) => {
                if (this.isMoving) return;
                if (this.tileChosen) {
                    const dx = e.clientX - this.startX;
                    const dy = e.clientY - this.startY;
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
                            this.score += this.tileMx[this.chsnRow][this.chsnCol].value ** 2;
                            this.isMoving = true;
                            this.moveRight();
                        }
                    } else if (dx < this.TILE_WIDTH * -1 && this.chsnCol > 0) {
                        if (!this.canMergeTile(this.chsnRow, this.chsnCol - 1)) {
                            this.release();
                        } else {
                            this.score += this.tileMx[this.chsnRow][this.chsnCol].value ** 2;
                            this.isMoving = true;
                            this.moveLeft();
                        }
                    } else if (dy > this.TILE_HEIGHT && this.chsnRow < this.NO_ROW - 1) {
                        if (!this.canMergeTile(this.chsnRow + 1, this.chsnCol)) {
                            this.release();
                        } else {
                            this.score += this.tileMx[this.chsnRow][this.chsnCol].value ** 2;
                            this.isMoving = true;
                            this.moveDown();
                        }
                    } else if (dy < this.TILE_HEIGHT * -1 && this.chsnRow > 0) {
                        if (!this.canMergeTile(this.chsnRow - 1, this.chsnCol)) {
                            this.release();
                        } else {
                            this.score += this.tileMx[this.chsnRow][this.chsnCol].value ** 2;
                            this.isMoving = true;
                            this.moveUp();
                        }
                    }
                }
            });

            window.addEventListener('pointerup', (e) => {
                if (this.isMoving) return;
                this.release();
            });

            window.addEventListener('pointerout', (e) => {
                if (this.isMoving) return;
                this.release();
            });

            this.gameStart(4, 4, [5, 5, 6], 'highScore4x4');
        }

        gameStart(no_row, no_col, no_types, highScore) {
            this.NO_ROW = no_row;
            this.NO_COL = no_col;
            this.TILE_WIDTH = this.rect.width / this.NO_COL - this.TILE_MARGIN;
            this.TILE_HEIGHT = this.rect.height / this.NO_ROW - this.TILE_MARGIN;
            this.NO_TYPES = no_types;
            this.highScore = localStorage.getItem(highScore);
            this.createTiles();
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
                return;
            } else {
                this.tileMx[this.chsnRow][this.chsnCol + 1].value += 1 ;
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
                return;
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
                return;
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
                return;
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
            for (let row = 0; row < this.NO_ROW; row++) {
                let tileRows = [];
                for (let col = 0; col < this.NO_COL; col++) {
                    let tColor;
                    do {
                        const t = Math.floor(Math.random() * (this.NO_TYPES[0] + this.NO_TYPES[1] + this.NO_TYPES[2]));
                        tColor = (t < this.NO_TYPES[0]) ? 0 :
                            (t < this.NO_TYPES[0] + this.NO_TYPES[1]) ? 1 :
                                2;
                    } while (this.NO_TYPES[tColor] < 1)
                    this.NO_TYPES[tColor] -= 1;

                    let tile = {
                        x: col * (this.TILE_WIDTH + this.TILE_MARGIN), //左上位置x
                        y: row * (this.TILE_HEIGHT + this.TILE_MARGIN),//左上位置y
                        value: 1,
                        type: tColor,
                        isMovable: true,
                        scale: 1,
                        isAnimating: false
                    }
                    tileRows.push(tile);
                }
                this.tileMx.push(tileRows);
            }
        }

        drawTiles() {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.movableCheck();
            //タイルを描画
            for (let row = 0; row < this.NO_ROW; row++) {
                for (let col = 0; col < this.NO_COL; col++) {
                    this.drawTile(row, col);
                }
            }
            //選んだタイルを最前面に描画
            if (this.tileChosen) {
                this.drawTile(this.chsnRow, this.chsnCol);
            }
            //ゲームオーバー描画
            if (this.isGameover) {
                this.ctx.fillStyle = 'rgba(1,1,1,0.5)'
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.fillStyle = 'white';
                this.ctx.textAlign = 'center';
                this.ctx.font = 'bold 32px Arial';
                this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2);
            }
            //スコアを描画
            this.scoreBoard.innerHTML = `スコア ${this.score}`;
            this.highScore = Math.max(this.highScore, this.score);
            if (this.NO_ROW === 4 && this.NO_COL === 4) {
                localStorage.setItem('highScore4x4', this.highScore);
                this.highScoreBoard.innerHTML = `４ｘ４ハイスコア ${this.highScore}`;
            } else if (this.NO_ROW === 4 && this.NO_COL === 5) {
                localStorage.setItem('highScore4x5', this.highScore);
                this.highScoreBoard.innerHTML = `４ｘ５ハイスコア ${this.highScore}`;
            }
            this.mergeCountBoard.innerHTML = `マージ回数：${this.mergeCount}`;
            this.itemCountBoard.innerHTML = `+1アイテム：${this.itemCount}`;


        }
        drawTile(row, col) {
            const tile = this.tileMx[row][col];
            let offsetX = 3;
            let offsetY = 3;
            this.ctx.fillStyle = `rgb${this.COLORS[tile.type]}`;
            this.ctx.shadowColor = "gray";
            if (tile.isMovable === true) {
                this.ctx.shadowBlur = 2;
                this.ctx.shadowOffsetX = 3;
                this.ctx.shadowOffsetY = 3;
                offsetX = 0;
                offsetY = 0;
            } else {
                this.ctx.shadowColor = 'rgba(0,0,0,0)';
            }
            this.ctx.fillRect(tile.x + offsetX, tile.y + offsetY, this.TILE_WIDTH * tile.scale, this.TILE_HEIGHT * tile.scale);
            this.ctx.fillStyle = 'white';
            this.ctx.font = `bold ${this.TILE_WIDTH / 2}px Arial`;
            this.ctx.shadowColor = 'rgba(0,0,0,0)';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(tile.value, tile.x + offsetX + this.TILE_WIDTH / 2, tile.y + offsetY + this.TILE_HEIGHT / 2);
            if (!tile.isMovable) {
                this.ctx.fillStyle = 'rgba(1,1,1,0.3)'
                this.ctx.fillRect(tile.x + offsetX, tile.y + offsetY, this.TILE_WIDTH * tile.scale, this.TILE_HEIGHT * tile.scale);
            }
        }

        reset() {
            this.tileMx = [];
            this.score = 0;
            this.mergeCount = 0;
            this.itemCount = 0;
            this.itemActive = false;
            this.timer.textContent = '00:00.00'
            this.isCounting = false;
            this.isGameover = false;
            this.minValue = 1;
        }

        movableCheck() {
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
                // アイテムが残っていればゲームオーバーにしない
                if (this.itemCount === 0) {
                    this.isGameover = true;
                    this.isCounting = false;
                }
            }
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
            this.timer.textContent = `${m}:${s}.${ms}`;
            setTimeout(this.countUp.bind(this), 10);
        }

        /*
        async minCheckAndAdd() {
            //minValueの更新
            this.minValue = this.tileMx[0][0].value;
            for (let row = 0; row < this.NO_ROW; row++) {
                for (let col = 0; col < this.NO_COL; col++) {
                    this.minValue = Math.min(this.minValue, this.tileMx[row][col].value);
                }
            }
            //minValueの枚数カウント
            let no_minValue = 0;
            for (let row = 0; row < this.NO_ROW; row++) {
                for (let col = 0; col < this.NO_COL; col++) {
                    if (this.tileMx[row][col].value === this.minValue) {
                        no_minValue++;
                    }
                }
            }
            //minValueが1枚だったらvalueを1増やす
            if (no_minValue === 1) {
                for (let row = 0; row < this.NO_ROW; row++) {
                    for (let col = 0; col < this.NO_COL; col++) {
                        if (this.tileMx[row][col].value === this.minValue) {
                            //valueを1増やす前の描画
                            this.isMoving = true;
                            this.tileMx[row][col].value++;
                            await this.playLevelUpAnim(row, col);
                            this.isMoving = false;
                            this.drawTiles();

                        }
                    }

                }
            }
        }
        */

        //minValueを1増やすときのアニメ
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

        async finishMove() {
            this.mergeCount++;
            // マージ回数が10の倍数でアイテムを獲得
            if (this.mergeCount % 10 === 0) {
                this.itemCount++;
            }
            // await this.minCheckAndAdd();
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

        // カラーサンプルの初期化
        initializeColorSample() {
            const colorSample = document.getElementById('colorSample');

            // 赤→紫→緑→赤の4色を表示（矢印付き）
            const colorSequence = [...this.COLORS, this.COLORS[0]]; // 赤→紫→緑→赤

            colorSequence.forEach((color, index) => {
                // 色ボックス
                const box = document.createElement('div');
                box.className = 'sample-box';
                box.style.backgroundColor = `rgb${color}`;
                colorSample.appendChild(box);

                // 矢印（最後の色以外）
                if (index < colorSequence.length - 1) {
                    const arrow = document.createElement('div');
                    arrow.className = 'sample-arrow';
                    arrow.textContent = '→';
                    colorSample.appendChild(arrow);
                }
            });
        }


    }

    new Game();

}
