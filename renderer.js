'use strict';

export class GameRenderer {
    constructor(canvas, ctx, topCanvas, topCtx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.topCanvas = topCanvas;
        this.topCtx = topCtx;
        this.attackEffects = [];
        this.enemyFadeAlpha = 1.0;
        this.draggedMonster = null;
        this.isListenerInitialized = false;
    }

    initDragListeners(game) {
        if (this.isListenerInitialized || !this.topCanvas) return;
        this.isListenerInitialized = true;

        const getPos = (e) => {
            const rect = this.topCanvas.getBoundingClientRect();
            const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
            const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
            const scaleX = this.topCanvas.width / rect.width;
            const scaleY = this.topCanvas.height / rect.height;
            return {
                x: (clientX - rect.left) * scaleX,
                y: (clientY - rect.top) * scaleY
            };
        };

        const onStart = (e) => {
            if (!game || game.currentMode !== 'scout') return;
            const pos = getPos(e);
            const partyList = game.topMonsters || [];
            for (let m of partyList) {
                const r = m.radius || 14;
                const dist = Math.hypot(m.x - pos.x, m.y - pos.y);
                if (dist <= r + 10) {
                    this.draggedMonster = m;
                    if (e.type === 'touchstart') e.preventDefault();
                    break;
                }
            }
        };

        const onMove = (e) => {
            if (!this.draggedMonster || !game || game.currentMode !== 'scout') return;
            const pos = getPos(e);
            this.draggedMonster.x = pos.x;
            this.draggedMonster.y = pos.y;
            if (e.type === 'touchmove') e.preventDefault();
        };

        const onEnd = () => {
            if (!this.draggedMonster || !game || game.currentMode !== 'scout') return;
            // 離した位置を新しい基準座標にする
            this.draggedMonster.scoutBaseX = this.draggedMonster.x;
            this.draggedMonster.scoutBaseY = this.draggedMonster.y;
            this.draggedMonster = null;
        };

        this.topCanvas.addEventListener('mousedown', onStart);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onEnd);

        this.topCanvas.addEventListener('touchstart', onStart, { passive: false });
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onEnd);
    }

    startAttackAnimation(attackEvents) {
        const enemyX = this.topCanvas ? this.topCanvas.width - 70 : 270;
        const enemyY = 75;

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

    playMonsterFadeIn(game) {
        return new Promise((resolve) => {
            const duration = 600;
            const startTime = Date.now();

            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(1, elapsed / duration);

                this.enemyFadeAlpha = progress;
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

        this.initDragListeners(game);

        if (this.topCanvas.height !== 290) {
            this.topCanvas.height = 290;
        }

        const w = this.topCanvas.width;
        const h = this.topCanvas.height;

        this.topCtx.fillStyle = '#111122';
        this.topCtx.fillRect(0, 0, w, h);

        if (game.currentMode === 'dungeon') {
            this.topCtx.fillStyle = '#FFD700';
            this.topCtx.font = 'bold 13px Arial';
            this.topCtx.textAlign = 'left';
            this.topCtx.fillText(`【ダンジョン】 B${game.battleManager.dungeonFloor}F`, 10, 20);

            const enemyHp = game.battleManager.enemyHp;
            const enemyMaxHp = game.battleManager.enemyMaxHp;
            const enemyRatio = Math.max(0, Math.min(1, enemyHp / enemyMaxHp));

            this.topCtx.fillStyle = '#FF4444';
            this.topCtx.font = 'bold 12px Arial';
            this.topCtx.fillText(`敵 HP: ${enemyHp.toLocaleString()} / ${enemyMaxHp.toLocaleString()}`, w - 165, 20);

            const enemyBarX = w - 165;
            const enemyBarY = 26;
            const enemyBarW = 130;
            const enemyBarH = 8;
            this.topCtx.fillStyle = '#555';
            this.topCtx.fillRect(enemyBarX, enemyBarY, enemyBarW, enemyBarH);

            this.topCtx.fillStyle = enemyRatio > 0.3 ? '#FF4444' : '#FF0000';
            this.topCtx.fillRect(enemyBarX, enemyBarY, enemyBarW * enemyRatio, enemyBarH);

            this.topCtx.fillStyle = '#FF8888';
            this.topCtx.font = 'bold 12px Arial';
            this.topCtx.fillText(`敵 ATK: ${game.battleManager.enemyAtk.toLocaleString()}`, w - 165, 50);

            const partyList = game.getPartyMonsters();
            const totalAtk = game.battleManager.getTotalAtk(partyList);

            let totalCurrentHp = 0;
            let totalMaxHp = 0;
            partyList.forEach(m => {
                if (m.currentHp === undefined) m.currentHp = m.hp;
                totalCurrentHp += m.currentHp;
                totalMaxHp += m.hp;
            });

            this.topCtx.fillStyle = '#00FFFF';
            this.topCtx.font = 'bold 12px Arial';
            this.topCtx.textAlign = 'left';
            this.topCtx.fillText(`合計 ATK: ${totalAtk.toLocaleString()}`, 10, h - 8);

            this.topCtx.fillStyle = '#00FF00';
            this.topCtx.fillText(`総 HP: ${totalCurrentHp.toLocaleString()}/${totalMaxHp.toLocaleString()}`, 130, h - 8);

            // --- 敵キャラクター表示 ---
            const enemyIconX = w - 70;
            const enemyIconY = 100;
            const enemyRadius = 35;

            this.topCtx.save();
            this.topCtx.globalAlpha = this.enemyFadeAlpha;

            this.topCtx.fillStyle = '#8B0000';
            this.topCtx.beginPath();
            this.topCtx.arc(enemyIconX, enemyIconY, enemyRadius, 0, Math.PI * 2);
            this.topCtx.fill();

            this.topCtx.strokeStyle = '#FF4444';
            this.topCtx.lineWidth = 3.5;
            this.topCtx.stroke();

            this.topCtx.fillStyle = '#FFEB3B';
            this.topCtx.beginPath();
            this.topCtx.arc(enemyIconX - 10, enemyIconY - 6, 6, 0, Math.PI * 2);
            this.topCtx.arc(enemyIconX - 3, enemyIconY + 5, 6, 0, Math.PI * 2);
            this.topCtx.fill();

            this.topCtx.fillStyle = '#000';
            this.topCtx.beginPath();
            this.topCtx.arc(enemyIconX - 12, enemyIconY - 6, 2.5, 0, Math.PI * 2);
            this.topCtx.arc(enemyIconX - 5, enemyIconY + 5, 2.5, 0, Math.PI * 2);
            this.topCtx.fill();

            this.topCtx.restore();

        } else {
            this.topCtx.fillStyle = '#666';
            this.topCtx.font = '12px Arial';
            this.topCtx.textAlign = 'left';
            this.topCtx.fillText('【スカウト】 (横軸:ATK / 縦軸:HP)', 10, 20);
        }

        // --- 味方モンスター描画 ---
        const partyList = (game.currentMode === 'scout') ? game.topMonsters : game.getPartyMonsters();
        const count = partyList.length;

        if (count > 0) {
            const isScout = game.currentMode === 'scout';

            let maxAtk = 1;
            let maxHp = 1;
            if (isScout) {
                partyList.forEach(m => {
                    if (m.attack > maxAtk) maxAtk = m.attack;
                    if (m.hp > maxHp) maxHp = m.hp;
                });
            }

            partyList.forEach((monster, index) => {
                const isDead = (game.currentMode === 'dungeon' && monster.currentHp !== undefined && monster.currentHp <= 0);

                if (!isDead) {
                    monster.update();
                }

                if (isScout) {
                    if (this.draggedMonster === monster) {
                        monster.scoutBaseX = monster.x;
                        monster.scoutBaseY = monster.y;
                    } else {
                        if (monster.scoutX === undefined || monster.scoutY === undefined) {
                            const marginX = 45;
                            const topLimit = 40;
                            const bottomLimit = h - 40;
                            
                            const drawW = w - marginX * 2;
                            const drawH = bottomLimit - topLimit;

                            const atkRatio = maxAtk > 0 ? (monster.attack / maxAtk) : 0.5;
                            const hpRatio = maxHp > 0 ? (monster.hp / maxHp) : 0.5;

                            const baseScreenX = marginX + atkRatio * drawW;
                            const baseScreenY = bottomLimit - hpRatio * drawH;

                            monster.scoutX = baseScreenX;
                            monster.scoutY = baseScreenY;
                            monster.scoutBaseX = baseScreenX;
                            monster.scoutBaseY = baseScreenY;
                            monster.walkSpeed = 0.2 + Math.random() * 0.2;
                            monster.walkAngle = Math.random() * Math.PI * 2;
                        }

                        const time = (Date.now() - (monster.startTime || Date.now())) / 1000;
                        const t = time * monster.walkSpeed + monster.walkAngle;

                        const rawSinX = Math.sin(t);
                        const rawCosY = Math.cos(t * 0.7);

                        const stopThreshold = 0.35;
                        let factorX = rawSinX > stopThreshold ? (rawSinX - stopThreshold) / (1 - stopThreshold) :
                            rawSinX < -stopThreshold ? (rawSinX + stopThreshold) / (1 - stopThreshold) : 0;
                        let factorY = rawCosY > stopThreshold ? (rawCosY - stopThreshold) / (1 - stopThreshold) :
                            rawCosY < -stopThreshold ? (rawCosY + stopThreshold) / (1 - stopThreshold) : 0;

                        const walkOffsetX = factorX * 20;
                        const walkOffsetY = factorY * 20;

                        monster.x = monster.scoutBaseX + walkOffsetX;
                        monster.y = monster.scoutBaseY + walkOffsetY;
                    }

                    const minX = 25;
                    const maxX = w - 25;
                    const minY = 35;
                    const maxY = h - 25;

                    monster.x = Math.max(minX, Math.min(maxX, monster.x));
                    monster.y = Math.max(minY, Math.min(maxY, monster.y));

                } else {
                    // ダンジョンモードの固定配置
                    const positions = [
                        { col: 1, row: 0 },
                        { col: 1, row: 1 },
                        { col: 1, row: 2 },
                        { col: 0, row: 0 },
                        { col: 0, row: 1 },
                        { col: 0, row: 2 }
                    ];
                    if (index < positions.length) {
                        const pos = positions[index];
                        const startX = 36;
                        const startY = 60;
                        const colWidth = 70;
                        const rowHeight = 85;

                        let baseJumpYOffset = 0;
                        let baseJumpXOffset = 0;

                        if (!isDead && monster.isJumping) {
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
                                        baseJumpYOffset = -Math.abs(Math.sin(subP * Math.PI)) * 14;
                                    } else {
                                        baseJumpYOffset = 0;
                                    }

                                    if (p <= 0.5) {
                                        baseJumpXOffset = (p / 0.5) * 10;
                                    } else if (p <= 0.65) {
                                        baseJumpXOffset = 10;
                                    } else {
                                        const returnProgress = (p - 0.65) / (1.0 - 0.65);
                                        baseJumpXOffset = 10 * (1 - returnProgress);
                                    }
                                }
                            }
                        }

                        monster.x = startX + (pos.col * colWidth) + (isDead ? 0 : baseJumpXOffset);
                        monster.y = startY + (pos.row * rowHeight) + (isDead ? 0 : baseJumpYOffset);
                    }
                }

                // モンスターの描画実行
                monster.draw(this.topCtx);

                // ダンジョンモード時のHPバー描画 ＆ ATK表示を集約
                if (game.currentMode === 'dungeon') {
                    if (monster.currentHp === undefined) monster.currentHp = monster.hp;
                    const barW = 50;
                    const barH = 5;
                    const bx = monster.x - barW / 2;
                    const by = monster.y + 22;

                    this.topCtx.fillStyle = '#555';
                    this.topCtx.fillRect(bx, by, barW, barH);

                    const ratio = Math.max(0, monster.currentHp / monster.hp);
                    this.topCtx.fillStyle = ratio > 0.3 ? '#00FF00' : '#FF0000';
                    this.topCtx.fillRect(bx, by, barW * ratio, barH);

                    this.topCtx.fillStyle = '#FFF';
                    this.topCtx.font = '11px Arial';
                    this.topCtx.textAlign = 'center';
                    this.topCtx.fillText(`${monster.currentHp.toLocaleString()}`, monster.x, by + 14);

                    this.topCtx.fillStyle = '#FFF';
                    this.topCtx.font = '11px Arial';
                    this.topCtx.textAlign = 'center';
                    this.topCtx.fillText(`ATK:${monster.attack.toLocaleString()}`, monster.x, monster.y - monster.radius - 10);
                }
            });
        } else {
            this.topCtx.fillStyle = '#666';
            this.topCtx.font = '13px Arial';
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

            const flashRadius = 18 * (1 - lifeRatio * 0.5);
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
            ctx.font = 'italic bold 18px Arial';
            this.topCtx.textAlign = 'center';
            this.topCtx.textBaseline = 'middle';

            const damageText = `-${fx.damage.toLocaleString()}`;
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
            this.ctx.fillText(`${item.score.toLocaleString()}`, startX + colWidth, currentY);
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
            this.ctx.fillText(`${item.score.toLocaleString()}`, startX + colWidth, currentY);
        });
    }
}
