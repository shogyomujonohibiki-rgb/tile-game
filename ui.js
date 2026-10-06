'use strict';

export class UI {
    constructor() {
        this.scoreBoard = document.getElementById('scoreBoard');
        this.highScoreBoard = document.getElementById('highScoreBoard');
        this.mergeCountBoard = document.getElementById('mergeCountBoard');
        this.itemCountBoard = document.getElementById('itemCountBoard');
        
        // 【追加】コイン表示と交換ボタンのバインド
        this.coinCountBoard = document.getElementById('coinCountBoard');
        this.exchangeItemButton = document.getElementById('exchangeItemButton');

        this.timer = document.getElementById('timer');

        this.game4x4 = document.getElementById('game4x4');
        this.undoButton = document.getElementById('undoButton');
        this.itemButton = document.getElementById('itemButton');
        this.modeScoutBtn = document.getElementById('modeMonsterGet');
        this.modeDungeonBtn = document.getElementById('modeDungeon');

        // ▼ 「合体」ボタンの初期化（「ダンジョン」ボタンの右に設置される想定）
        this.modeMergeBtn = document.getElementById('modeMerge') || this.createMergeButton();

        this.colorSample = document.getElementById('colorSample');

        // ▼ 【修正】ゲームロード時（スカウトモードスタート時）に＋１交換ボタンを非表示にする
        this.setExchangeButtonVisible(false);
    }

    createMergeButton() {
        if (this.modeDungeonBtn && this.modeDungeonBtn.parentNode) {
            const btn = document.createElement('button');
            btn.id = 'modeMerge';
            btn.textContent = '合体';
            this.modeDungeonBtn.parentNode.insertBefore(btn, this.modeDungeonBtn.nextSibling);
            return btn;
        }
        return null;
    }

    updateScore(score) {
        if (this.scoreBoard) {
            this.scoreBoard.innerHTML = `スコア ${score}`;
        }
    }

    updateHighScore(highScore) {
        if (this.highScoreBoard) {
            this.highScoreBoard.innerHTML = `ハイスコア ${highScore}`;
        }
    }

    updateMergeCount(count) {
        if (this.mergeCountBoard) {
            this.mergeCountBoard.innerHTML = `マージ回数：${count}`;
        }
    }

    updateItemCount(count) {
        if (this.itemCountBoard) {
            this.itemCountBoard.innerHTML = `+1アイテム：${count}`;
        }
    }

    // 【追加】コイン数を更新するメソッド
    updateCoins(coins) {
        if (this.coinCountBoard) {
            this.coinCountBoard.innerHTML = `コイン：${coins}`;
        }
    }

    // 【追加】交換ボタンの有効・無効を制御するメソッド
    setExchangeButtonEnabled(enabled) {
        if (!this.exchangeItemButton) return;
        this.exchangeItemButton.disabled = !enabled;
        if (enabled) {
            this.exchangeItemButton.classList.remove('disabled');
        } else {
            this.exchangeItemButton.classList.add('disabled');
        }
    }

    // 【追加】交換ボタンの表示・非表示を制御するメソッド
    setExchangeButtonVisible(isVisible) {
        if (!this.exchangeItemButton) return;
        this.exchangeItemButton.style.display = isVisible ? 'inline-block' : 'none';
    }

    updateTimer(text) {
        if (this.timer) {
            this.timer.textContent = text;
        }
    }

    setItemActive(isActive) {
        if (!this.itemButton) return;
        if (isActive) {
            this.itemButton.classList.add('active');
        } else {
            this.itemButton.classList.remove('active');
        }
    }

    setUndoButtonVisible(isVisible) {
        if (!this.undoButton) return;
        this.undoButton.style.display = isVisible ? 'flex' : 'none';
    }

    setPartyButtonEnabled(enabled) {
        if (this.modeScoutBtn) {
            this.modeScoutBtn.disabled = !enabled;
        }
        if (this.modeDungeonBtn) {
            this.modeDungeonBtn.disabled = !enabled;
        }
        if (this.modeMergeBtn) {
            this.modeMergeBtn.disabled = !enabled;
        }
    }

    switchModeUI(mode) {
        if (!this.modeScoutBtn || !this.modeDungeonBtn || !this.modeMergeBtn) return;
        this.modeScoutBtn.classList.remove('active');
        this.modeDungeonBtn.classList.remove('active');
        this.modeMergeBtn.classList.remove('active');

        if (mode === 'scout') {
            this.modeScoutBtn.classList.add('active');
            // スカウトモード時は＋１アイテム交換ボタンを非表示にする
            this.setExchangeButtonVisible(false);
        } else if (mode === 'dungeon') {
            this.modeDungeonBtn.classList.add('active');
            this.setExchangeButtonVisible(true);
        } else if (mode === 'merge') {
            this.modeMergeBtn.classList.add('active');
            this.setExchangeButtonVisible(true);
        }
    }

    showMergeScreen(topMonsters, onMergeExecute) {
        return new Promise((resolve) => {
            let modal = document.getElementById('mergeModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'mergeModal';
                modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 2500; display: flex; justify-content: center; align-items: center;';
                modal.innerHTML = `
                    <div style="background: white; width: 92%; max-width: 340px; max-height: 90vh; padding: 16px; border-radius: 8px; box-sizing: border-box; text-align: center; color: #333; display: flex; flex-direction: column;">
                        <h3 style="margin-top: 0; font-size: 15px; color: #d9534f;">モンスター合体</h3>
                        <p style="font-size: 11px; margin-bottom: 8px; color: #666;">①「ベース」と②「素材」を選ぶ（素材は消滅し、ステータスの50%が加算されます）</p>
                        
                        <div style="display: flex; gap: 8px; margin-bottom: 8px; font-size: 11px; text-align: left;">
                            <div style="flex: 1; background: #f8f9fa; padding: 6px; border-radius: 4px; border: 1px solid #ddd;">
                                <strong>①ベース:</strong> <span id="selectedBaseName">未選択</span>
                            </div>
                            <div style="flex: 1; background: #f8f9fa; padding: 6px; border-radius: 4px; border: 1px solid #ddd;">
                                <strong>②素材:</strong> <span id="selectedMaterialName">未選択</span>
                            </div>
                        </div>

                        <div id="mergeMonsterList" style="flex: 1; max-height: 220px; overflow-y: auto; border: 1px solid #ccc; margin-bottom: 12px; padding: 6px; text-align: left;"></div>
                        
                        <div style="display: flex; gap: 8px;">
                            <button id="executeMergeBtn" disabled style="all: unset; background-color: #ccc; color: white; flex: 1; height: 36px; border-radius: 4px; font-weight: bold; font-size: 12px; text-align: center; cursor: not-allowed;">合体実行</button>
                            <button id="closeMergeBtn" style="all: unset; background-color: #6c757d; color: white; width: 80px; height: 36px; border-radius: 4px; font-weight: bold; font-size: 12px; text-align: center; cursor: pointer;">閉じる</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
            }

            const listContainer = modal.querySelector('#mergeMonsterList');
            const baseNameSpan = modal.querySelector('#selectedBaseName');
            const materialNameSpan = modal.querySelector('#selectedMaterialName');
            const executeBtn = modal.querySelector('#executeMergeBtn');
            const closeBtn = modal.querySelector('#closeMergeBtn');

            let baseIndex = null;
            let materialIndex = null;

            const updateUI = () => {
                listContainer.innerHTML = '';
                topMonsters.forEach((m, index) => {
                    const div = document.createElement('div');
                    div.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 6px; border-bottom: 1px solid #eee; font-size: 11px; cursor: pointer;';

                    let bg = '#fff';
                    if (index === baseIndex) bg = '#e2f0cb';
                    else if (index === materialIndex) bg = '#ffcad4';
                    div.style.backgroundColor = bg;

                    const info = document.createElement('span');
                    info.innerHTML = `<strong>#${index + 1}</strong> (ATK:${m.attack} HP:${m.hp}) 合体回数:${m.mergeCount || 0}`;

                    div.addEventListener('click', () => {
                        if (baseIndex === null) {
                            baseIndex = index;
                        } else if (baseIndex === index) {
                            baseIndex = null;
                        } else if (materialIndex === index) {
                            materialIndex = null;
                        } else if (materialIndex === null) {
                            materialIndex = index;
                        } else {
                            materialIndex = index;
                        }
                        renderList();
                    });

                    div.appendChild(info);
                    listContainer.appendChild(div);
                });

                baseNameSpan.textContent = baseIndex !== null ? `#${baseIndex + 1} (ATK:${topMonsters[baseIndex].attack})` : '未選択';
                materialNameSpan.textContent = materialIndex !== null ? `#${materialIndex + 1} (ATK:${topMonsters[materialIndex].attack})` : '未選択';

                if (baseIndex !== null && materialIndex !== null && baseIndex !== materialIndex) {
                    executeBtn.style.backgroundColor = '#28a745';
                    executeBtn.style.cursor = 'pointer';
                    executeBtn.disabled = false;
                } else {
                    executeBtn.style.backgroundColor = '#ccc';
                    executeBtn.style.cursor = 'not-allowed';
                    executeBtn.disabled = true;
                }
            };

            const renderList = () => {
                updateUI();
            };

            renderList();

            const handleExecute = () => {
                if (baseIndex !== null && materialIndex !== null && baseIndex !== materialIndex) {
                    cleanup();
                    onMergeExecute(baseIndex, materialIndex);
                    resolve(true);
                }
            };

            const handleClose = () => {
                cleanup();
                resolve(false);
            };

            const cleanup = () => {
                executeBtn.removeEventListener('click', handleExecute);
                closeBtn.removeEventListener('click', handleClose);
                modal.style.display = 'none';
            };

            executeBtn.onclick = handleExecute;
            closeBtn.onclick = handleClose;
            modal.style.display = 'flex';
        });
    }

    promptMonsterLimitSelection(topMonsters) {
        return new Promise((resolve) => {
            let modal = document.getElementById('monsterLimitModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'monsterLimitModal';
                modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 2000; display: flex; justify-content: center; align-items: center;';
                modal.innerHTML = `
                    <div style="background: white; width: 90%; max-width: 320px; padding: 16px; border-radius: 8px; box-sizing: border-box; text-align: center; color: #333;">
                        <h3 style="margin-top: 0; font-size: 14px;">モンスターが上限（20匹）を超えました</h3>
                        <p style="font-size: 11px; margin-bottom: 8px;">合体画面に遷移します。不要なモンスターを合体させて整理してください。</p>
                        <button id="goToMergeBtn" style="all: unset; background-color: #28a745; color: white; width: 100%; height: 36px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 12px;">合体画面へ進む</button>
                    </div>
                `;
                document.body.appendChild(modal);
            }

            const btn = modal.querySelector('#goToMergeBtn');
            const handler = () => {
                btn.removeEventListener('click', handler);
                modal.style.display = 'none';
                resolve(true);
            };
            btn.onclick = handler;
            modal.style.display = 'flex';
        });
    }
}
