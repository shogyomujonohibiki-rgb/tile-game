'use strict';

export class GameRenderer {
    constructor(canvas, ctx, topCanvas, topCtx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.topCanvas = topCanvas;
        this.topCtx = topCtx;

        this.attackEffects = [];
        // 全体用のジャンプフラグは個別に移行するため削除または不使用に

        // 演出用のパラメータ追加
        this.enemyFadeAlpha = 1.0;
    }

    startAttackAnimation(attackEvents) {
        const enemyX = this.topCanvas ? this.topCanvas.width - 60 : 280;
        const enemyY = 60;

        // 渡された攻撃イベントに基づいて個別のアニメーションとダメージ表示を設定
        attackEvents.forEach((event, i) => {
            const { monster, damage } = event;
            const offsetX = (Math.random() - 0.5) * 40;
            const offsetY = (Math.random() - 0.5) * 30;

            monster.isJumping = true;
            monster.jumpProgress = 0;
            monster.attackDelay = i * 8;

            this.attackEffects.push({
                x: enemyX + offsetX,
                y: enemyY + offsetY,
                damage: damage,
                progress: 0,
                maxLife: 30,
                delay: i * 8
            });
        });
    }

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

    drawResetOverlay(text, alpha) {
        if (alpha <= 0) return;
        const width = this.canvas.width;
        const height = this.canvas.height;

        this.ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
        this.ctx.fillRect(0, 0, width, height);

        this.ctx.fillStyle = `rgba(255, 215, 0, ${Math.min(1, alpha * 1.2)})`;
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        const lines = text.split('\n');
        const lineHeight = 24;
        const startY = height / 2 - ((lines.length - 1) * lineHeight) / 2;

        lines.forEach((line, index) => {
            this.ctx.fillText(line, width / 2, startY + index * lineHeight);
        });
    }

    // 敵がふわっとフェードインするアニメーション用
    playMonsterFadeIn(game) {
        return new Promise((resolve) => {
            const duration = 600; // 0.6秒
            const startTime = Date.now();

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(1, elapsed / duration);

                this.enemyFadeAlpha = progress; // 0 → 1 へ
                this.drawTopCanvas(game);

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.enemyFadeAlpha = 1.0;
                    resolve();
                }
            };
            this.enemyFadeAlpha = 0;
            requestAnimationFrame(animate);
        });
    }

    // 画面全体を暗転／明転させるオーバーレイ描画
    drawScreenOverlay(alpha, message = '') {
        if (!this.topCtx || !this.topCanvas) return;
        const w = this.topCanvas.width;
        const h = this.topCanvas.height;

        this.topCtx.save();
        this.topCtx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
        this.topCtx.fillRect(0, 0, w, h);

        if (message && alpha > 0.3) {
            this.topCtx.fillStyle = `rgba(255, 215, 0, ${Math.min(1, alpha * 1.2)})`;
            this.topCtx.font = 'bold 16px Arial';
            this.topCtx.textAlign = 'center';
            this.topCtx.textBaseline = 'middle';
            this.topCtx.fillText(message, w / 2, h / 2);
        }
        this.topCtx.restore();
    }

    drawTopCanvas(game) {
        if (!this.topCtx || !this.topCanvas) return;

        if (this.topCanvas.height !== 220) {
            this.topCanvas.height = 220;
        }

        const w = this.topCanvas.width;
        const h = this.topCanvas.height;

        this.topCtx.fillStyle = '#111122';
        this.topCtx.fillRect(0, 0, w, h);

        if (game.currentMode === 'dungeon') {
            this.topCtx.fillStyle = '#FFD700';
            this.topCtx.font = 'bold 11px Arial';
            this.topCtx.textAlign = 'left';
            this.topCtx.fillText(`【ダンジョン】 B${game.battleManager.dungeonFloor}F`, 10, 18);

            const enemyHp = game.battleManager.enemyHp;
            const enemyMaxHp = game.battleManager.enemyMaxHp;
            const enemyRatio = Math.max(0, Math.min(1, enemyHp / enemyMaxHp));

            this.topCtx.fillStyle = '#FF4444';
            this.topCtx.fillText(`敵 HP: ${enemyHp} / ${enemyMaxHp}`, w - 150, 18);

            const enemyBarX = w - 150;
            const enemyBarY = 24;
            const enemyBarW = 110;
            const enemyBarH = 6;
            this.topCtx.fillStyle = '#555';
            this.topCtx.fillRect(enemyBarX, enemyBarY, enemyBarW, enemyBarH);

            this.topCtx.fillStyle = enemyRatio > 0.3 ? '#FF4444' : '#FF0000';
            this.topCtx.fillRect(enemyBarX, enemyBarY, enemyBarW * enemyRatio, enemyBarH);

            this.topCtx.fillStyle = '#FF8888';
            this.topCtx.fillText(`敵 ATK: ${game.battleManager.enemyAtk}`, w - 150, 44);

            const partyList = game.getPartyMonsters();
            const totalAtk = game.battleManager.getTotalAtk(partyList);
            this.topCtx.fillStyle = '#00FFFF';
            this.topCtx.fillText(`合計 ATK: ${totalAtk}`, 10, h - 8);

            // --- 敵キャラクター表示（右側・左向き・目を横に2個並べる） ---
            const enemyIconX = w - 60;
            const enemyIconY = 95;
            const enemyRadius = 28;

            this.topCtx.save();
            // フェードインのアルファ値を適用
            this.topCtx.globalAlpha = this.enemyFadeAlpha;

            this.topCtx.fillStyle = '#8B0000';
            this.topCtx.beginPath();
            this.topCtx.arc(enemyIconX, enemyIconY, enemyRadius, 0, Math.PI * 2);
            this.topCtx.fill();

            this.topCtx.strokeStyle = '#FF4444';
            this.topCtx.lineWidth = 3;
            this.topCtx.stroke();

            // 敵の目（左向きに横並び2個）
            this.topCtx.fillStyle = '#FFEB3B';
            this.topCtx.beginPath();
            this.topCtx.arc(enemyIconX - 8, enemyIconY - 5, 5, 0, Math.PI * 2);
            this.topCtx.arc(enemyIconX - 2, enemyIconY + 4, 5, 0, Math.PI * 2);
            this.topCtx.fill();

            this.topCtx.fillStyle = '#000';
            this.topCtx.beginPath();
            this.topCtx.arc(enemyIconX - 10, enemyIconY - 5, 2, 0, Math.PI * 2);
            this.topCtx.arc(enemyIconX - 4, enemyIconY + 4, 2, 0, Math.PI * 2);
            this.topCtx.fill();

            this.topCtx.fillStyle = '#FFF';
            this.topCtx.font = 'bold 12px Arial';
            this.topCtx.textAlign = 'center';
            this.topCtx.fillText('', enemyIconX, enemyIconY + 18);
            this.topCtx.restore();

        } else {
            this.topCtx.fillStyle = '#666';
            this.topCtx.font = '11px Arial';
            this.topCtx.textAlign = 'left';
            this.topCtx.fillText('【スカウト】', 10, 18);
        }

        // --- 味方モンスター描画 ---
        const partyList = game.getPartyMonsters();
        const count = partyList.length;

        if (count > 0) {
            const positions = [
                { col: 1, row: 0 }, // 1番: 右上
                { col: 1, row: 1 }, // 2番: 右真ん中
                { col: 1, row: 2 }, // 3番: 右下
                { col: 0, row: 0 }, // 4番: 左上
                { col: 0, row: 1 }, // 5番: 左真ん中
                { col: 0, row: 2 }  // 6番: 左下
            ];

            const startX = 40;
            const startY = 45;
            const colWidth = 45;
            const rowHeight = 60;

            partyList.forEach((monster, index) => {
                if (index >= positions.length) return;
                const pos = positions[index];

                let baseJumpYOffset = 0;
                let baseJumpXOffset = 0;

                // モンスターごとの個別ジャンプ計算
                if (monster.isJumping) {
                    if (monster.attackDelay > 0) {
                        monster.attackDelay--;
                    } else {
                        monster.jumpProgress += 0.08;
                        if (monster.jumpProgress >= 1) {
                            monster.isJumping = false;
                            monster.jumpProgress = 0;
                        } else {
                            const p = monster.jumpProgress;
                            if (p <= 0.5) {
                                const subP = p * 2;
                                baseJumpYOffset = -Math.abs(Math.sin(subP * Math.PI)) * 18;
                            } else {
                                baseJumpYOffset = 0;
                            }

                            if (p <= 0.5) {
                                baseJumpXOffset = (p / 0.5) * 12;
                            } else if (p <= 0.65) {
                                baseJumpXOffset = 12;
                            } else {
                                const returnProgress = (p - 0.65) / (1.0 - 0.65);
                                baseJumpXOffset = 12 * (1 - returnProgress);
                            }
                        }
                    }
                }

                const isDead = (game.currentMode === 'dungeon' && monster.currentHp !== undefined && monster.currentHp <= 0);
                const jumpY = isDead ? 0 : baseJumpYOffset;
                const jumpX = isDead ? 0 : baseJumpXOffset;

                monster.x = startX + (pos.col * colWidth) + jumpX;
                monster.y = startY + (pos.row * rowHeight) + jumpY;
                monster.draw(this.topCtx);

                if (game.currentMode === 'dungeon') {
                    if (monster.currentHp === undefined) monster.currentHp = monster.hp;
                    const barW = 34;
                    const barH = 4;
                    const bx = monster.x - barW / 2;
                    const by = monster.y + 20;

                    this.topCtx.fillStyle = '#555';
                    this.topCtx.fillRect(bx, by, barW, barH);

                    const ratio = Math.max(0, monster.currentHp / monster.hp);
                    this.topCtx.fillStyle = ratio > 0.3 ? '#00FF00' : '#FF0000';
                    this.topCtx.fillRect(bx, by, barW * ratio, barH);

                    this.topCtx.fillStyle = '#FFF';
                    this.topCtx.font = '7.5px Arial';
                    this.topCtx.textAlign = 'center';
                    this.topCtx.fillText(`${monster.currentHp}/${monster.hp}`, monster.x, by + 13);
                }
            });
        } else {
            this.topCtx.fillStyle = '#666';
            this.topCtx.font = '12px Arial';
            this.topCtx.textAlign = 'center';
            this.topCtx.fillText('パーティーにモンスターがいません', w / 2, h / 2 + 30);
        }

        if (this.attackEffects.length > 0) {
            this.renderAttackEffects(this.topCtx);
        }
    }

    renderAttackEffects(ctx) {
        for (let i = this.attackEffects.length - 1; i >= 0; i--) {
            const fx = this.attackEffects[i];

            if (fx.delay > 0) {
                fx.delay--;
                continue;
            }

            fx.progress++;
            const lifeRatio = fx.progress / fx.maxLife;

            if (lifeRatio >= 1) {
                this.attackEffects.splice(i, 1);
                continue;
            }

            ctx.save();

            const flashRadius = 16 * (1 - lifeRatio * 0.5);
            ctx.fillStyle = lifeRatio < 0.3 ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 200, 0, 0.7)';
            ctx.beginPath();
            for (let k = 0; k < 8; k++) {
                const angle = (Math.PI / 4) * k;
                const r = k % 2 === 0 ? flashRadius : flashRadius * 0.4;
                const px = fx.x + Math.cos(angle) * r;
                const py = fx.y + Math.sin(angle) * r;
                if (k === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();

            const alpha = 1 - lifeRatio;
            const floatY = fx.y - (fx.progress * 1.2);

            ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`;
            ctx.strokeStyle = `rgba(0, 0, 0, ${alpha})`;
            ctx.lineWidth = 3;
            ctx.font = 'italic bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const damageText = `-${fx.damage}`;
            ctx.strokeText(damageText, fx.x, floatY);
            ctx.fillText(damageText, fx.x, floatY);

            ctx.restore();
        }
    }

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
