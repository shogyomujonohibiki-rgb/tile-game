'use strict';

export class GameRenderer {
    constructor(canvas, ctx, topCanvas, topCtx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.topCanvas = topCanvas;
        this.topCtx = topCtx;
    }

    // メインキャンバスの描画
    drawTiles(game) {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        game.movableCheck();

        for (let row = 0; row < game.NO_ROW; row++) {
            for (let col = 0; col < game.NO_COL; col++) {
                this.drawTile(game, row, col);
            }
        }

        if (game.tileChosen) {
            this.drawTile(game, game.chsnRow, game.chsnCol);
        }

        if (game.isGameover) {
            this.drawGameOverOverlay(game);
        }

        game.ui.updateScore(game.score);
        game.highScore = Math.max(game.highScore, game.score);
        if (game.NO_ROW === 4 && game.NO_COL === 4) {
            localStorage.setItem(game.highScoreKey, game.highScore);
            game.ui.updateHighScore(game.highScore);
        }
        game.ui.updateMergeCount(game.mergeCount);
        game.ui.updateItemCount(game.itemCount);
    }

    // 単一タイルの描画
    drawTile(game, row, col) {
        const tile = game.tileMx[row][col];
        if (!tile) return;

        let offsetX = 3;
        let offsetY = 3;

        this.ctx.fillStyle = `rgb${game.COLORS[tile.type]}`;
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

        const width = game.TILE_WIDTH * tile.scale;
        const height = game.TILE_HEIGHT * tile.scale;
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
        const fontSize = Math.min(game.TILE_WIDTH, game.TILE_HEIGHT) / 2;
        this.ctx.font = `bold ${fontSize}px Arial`;
        this.ctx.shadowColor = 'rgba(0,0,0,0)';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(tile.value, tile.x + offsetX + game.TILE_WIDTH / 2, tile.y + offsetY + game.TILE_HEIGHT / 2);

        if (!tile.isMovable) {
            this.ctx.fillStyle = 'rgba(1,1,1,0.3)';
            drawRoundedPath(tile.x + offsetX, tile.y + offsetY, width, height, radius);
            this.ctx.fill();
        }
    }

    // 上部箱庭・ダンジョンエリアの描画
    drawTopCanvas(game) {
        if (!this.topCtx || !this.topCanvas) return;

        const w = this.topCanvas.width;
        const h = this.topCanvas.height;

        this.topCtx.fillStyle = '#111122';
        this.topCtx.fillRect(0, 0, w, h);

        const partyList = game.getPartyMonsters();

        if (game.currentMode === 'dungeon') {
            const totalAtk = game.battleManager.getTotalAtk(partyList);

            this.topCtx.fillStyle = '#FFD700';
            this.topCtx.font = 'bold 11px Arial';
            this.topCtx.textAlign = 'left';
            this.topCtx.fillText(`【ダンジョン】 B${game.battleManager.dungeonFloor}F`, 10, 18);

            this.topCtx.fillStyle = '#FF4444';
            this.topCtx.fillText(`敵 HP: ${game.battleManager.enemyHp} / ${game.battleManager.enemyMaxHp}`, 10, 32);
            this.topCtx.fillText(`敵 ATK: ${game.battleManager.enemyAtk}`, 10, 46);

            this.topCtx.fillStyle = '#00FFFF';
            this.topCtx.fillText(`Total ATK: ${totalAtk}`, 10, 60);

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

        const count = partyList.length;

        if (count > 0) {
            const spacing = w / (count + 1);
            partyList.forEach((monster, index) => {
                monster.x = spacing * (index + 1);
                monster.y = h / 2 + 20;
                monster.draw(this.topCtx);

                if (game.currentMode === 'dungeon') {
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

    // ゲームオーバーオーバーレイ描画
    drawGameOverOverlay(game) {
        const width = this.canvas.width;
        const height = this.canvas.height;

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
        this.ctx.fillRect(0, 0, width, height);

        if (game.currentMode === 'dungeon') {
            this.ctx.fillStyle = '#FF4444';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('ゲームオーバー (全滅)', width / 2, 30);

            this.ctx.fillStyle = '#FFD700';
            this.ctx.font = 'bold 14px Arial';
            this.ctx.fillText(`到達階: B${game.battleManager.dungeonFloor}F`, width / 2, 60);
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
        this.renderRankingList(game.globalLeaderboard, col1X, colWidth, startY + 8, lineHeight);

        this.ctx.fillStyle = '#00FFFF';
        this.ctx.font = 'bold 10px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('マイランキング', col2X, startY - 4);
        this.renderMyRankingList(game.myLeaderboard, col2X, colWidth, startY + 8, lineHeight);
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
}
