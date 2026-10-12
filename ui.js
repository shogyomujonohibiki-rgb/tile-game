'use strict';

export class UI {
    constructor() {
        this.scoreBoard = document.getElementById('scoreBoard');
        this.highScoreBoard = document.getElementById('highScoreBoard');
        this.userNameBoard = document.getElementById('userNameBoard'); // 追加
        this.menuButton = document.getElementById('menuButton'); // ★ここを追加
        this.mergeCountBoard = document.getElementById('mergeCountBoard');
        this.itemCountBoard = document.getElementById('itemCountBoard');
        
        this.coinCountBoard = document.getElementById('coinCountBoard');
        this.exchangeItemButton = document.getElementById('exchangeItemButton');

        this.timer = document.getElementById('timer');

        this.game4x4 = document.getElementById('game4x4');
        this.undoButton = document.getElementById('undoButton');
        this.itemButton = document.getElementById('itemButton');
        this.modeScoutBtn = document.getElementById('modeMonsterGet');
        this.modeDungeonBtn = document.getElementById('modeDungeon');

        this.colorSample = document.getElementById('colorSample');

        this.setExchangeButtonVisible(false);
        this.initMenuEvents(); // 追加
    }

    // ▼ 追加: メニューおよびランキングのインタラクション初期化
    initMenuEvents() {
        const menuModal = document.getElementById('menuModal');
        const menuMainView = document.getElementById('menuMainView');
        const scoreRankingView = document.getElementById('scoreRankingView');

        const btnScoreRanking = document.getElementById('btnScoreRanking');
        const btnDungeonRanking = document.getElementById('btnDungeonRanking');
        const btnMonsterRanking = document.getElementById('btnMonsterRanking');
        const closeMenuBtn = document.getElementById('closeMenuBtn');
        const closeScoreRankingBtn = document.getElementById('closeScoreRankingBtn');
        const backToMenuBtn = document.getElementById('backToMenuBtn');

        const tabGlobal = document.getElementById('tabGlobal');
        const tabMy = document.getElementById('tabMy');

        if (this.menuButton) {
            this.menuButton.addEventListener('click', () => {
                menuMainView.classList.remove('hidden');
                scoreRankingView.classList.add('hidden');
                menuModal.classList.remove('hidden');
            });
        }

        const closeModal = () => {
            menuModal.classList.add('hidden');
        };

        if (closeMenuBtn) closeMenuBtn.addEventListener('click', closeModal);
        if (closeScoreRankingBtn) closeScoreRankingBtn.addEventListener('click', closeModal);

        if (btnScoreRanking) {
            btnScoreRanking.addEventListener('click', () => {
                menuMainView.classList.add('hidden');
                scoreRankingView.classList.remove('hidden');
                // デフォルトで全国タブを選択状態にする
                tabGlobal.click();
            });
        }

        if (backToMenuBtn) {
            backToMenuBtn.addEventListener('click', () => {
                scoreRankingView.classList.add('hidden');
                menuMainView.classList.remove('hidden');
            });
        }

        if (btnDungeonRanking) {
            btnDungeonRanking.addEventListener('click', () => {
                alert('ダンジョンランキングは準備中です');
            });
        }

        if (btnMonsterRanking) {
            btnMonsterRanking.addEventListener('click', () => {
                alert('モンスターランキングは準備中です');
            });
        }
    }

    // ▼ 追加: ランキングデータを描画するメソッド
    renderMenuRankings(globalData, myData, activeTab = 'global') {
        const tabGlobal = document.getElementById('tabGlobal');
        const tabMy = document.getElementById('tabMy');
        const rankingListView = document.getElementById('rankingListView');

        if (!tabGlobal || !tabMy || !rankingListView) return;

        const isGlobal = (activeTab === 'global');
        tabGlobal.classList.toggle('active', isGlobal);
        tabMy.classList.toggle('active', !isGlobal);

        const dataList = isGlobal ? globalData : myData;

        tabGlobal.onclick = () => this.renderMenuRankings(globalData, myData, 'global');
        tabMy.onclick = () => this.renderMenuRankings(globalData, myData, 'my');

        if (!dataList || dataList.length === 0) {
            rankingListView.innerHTML = '<div style="text-align:center; color:#888; padding:20px; font-size:11px;">データなし</div>';
            return;
        }

        let html = '<table style="width:100%; border-collapse:collapse; font-size:11px; color:#333;">';
        dataList.slice(0, 20).forEach((item, index) => {
            const rank = index + 1;
            const name = isGlobal ? (item.userName || 'Guest') : (item.dateStr || '');
            const score = (item.score || 0).toLocaleString();
            html += `<tr style="border-bottom:1px solid #eee;">
                <td style="padding:4px; width:30px; font-weight:bold;">${rank}.</td>
                <td style="padding:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:120px;">${name}</td>
                <td style="padding:4px; text-align:right; font-weight:bold; color:#0056b3;">${score}</td>
            </tr>`;
        });
        html += '</table>';
        rankingListView.innerHTML = html;
    }

    // 追加
    updateUserName(name) {
        if (this.userNameBoard) {
            this.userNameBoard.textContent = name || 'Guest';
        }
    }

    updateScore(score) {
        if (this.scoreBoard) {
            const num = Number(score) || 0;
            this.scoreBoard.innerHTML = `スコア ${num.toLocaleString()}`;
        }
    }

    updateHighScore(highScore) {
        if (this.highScoreBoard) {
            const num = Number(highScore) || 0;
            this.highScoreBoard.innerHTML = `ハイスコア ${num.toLocaleString()}`;
        }
    }

    updateMergeCount(count) {
        if (this.mergeCountBoard) {
            const num = Number(count) || 0;
            this.mergeCountBoard.innerHTML = `マージ回数：${num.toLocaleString()}`;
        }
    }

    updateItemCount(count) {
        if (this.itemCountBoard) {
            const num = Number(count) || 0;
            this.itemCountBoard.innerHTML = `+1アイテム：${num.toLocaleString()}`;
        }
    }

    updateCoins(coins) {
        if (this.coinCountBoard) {
            const num = Number(coins) || 0;
            this.coinCountBoard.innerHTML = `コイン：${num.toLocaleString()}`;
        }
    }

    setExchangeButtonEnabled(enabled) {
        if (!this.exchangeItemButton) return;
        this.exchangeItemButton.disabled = !enabled;
        if (enabled) {
            this.exchangeItemButton.classList.remove('disabled');
        } else {
            this.exchangeItemButton.classList.add('disabled');
        }
    }

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
    }

    setScoutButtonEnabled(enabled) {
        if (this.modeScoutBtn) {
            this.modeScoutBtn.disabled = !enabled;
        }
    }

    setDungeonButtonEnabled(enabled) {
        if (this.modeDungeonBtn) {
            this.modeDungeonBtn.disabled = !enabled;
        }
    }

    switchModeUI(mode) {
        if (!this.modeScoutBtn || !this.modeDungeonBtn) return;
        this.modeScoutBtn.classList.remove('active');
        this.modeDungeonBtn.classList.remove('active');

        if (mode === 'scout') {
            this.modeScoutBtn.classList.add('active');
            this.setExchangeButtonVisible(false);
        } else if (mode === 'dungeon') {
            this.modeDungeonBtn.classList.add('active');
            this.setExchangeButtonVisible(true);
        }
    }

    showMergeConfirmScreen(baseMonster, materialMonster, mergeRate, onConfirm) {
        return new Promise((resolve) => {
            let modal = document.getElementById('mergeConfirmModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'mergeConfirmModal';
                modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 2500; display: flex; justify-content: center; align-items: center;';
                modal.innerHTML = `
                    <div style="background: white; width: 92%; max-width: 340px; padding: 16px; border-radius: 8px; box-sizing: border-box; text-align: center; color: #333; display: flex; flex-direction: column;">
                        <h3 style="margin-top: 0; font-size: 15px; color: #d9534f;">モンスター合体確認</h3>
                        <p style="font-size: 11px; margin-bottom: 8px; color: #666;">パーティー外の素材モンスターを重ねました。合体を実行しますか？（素材は消滅します）</p>
                        
                        <div style="display: flex; gap: 6px; margin-bottom: 12px; font-size: 10px; text-align: left;">
                            <div style="flex: 1; background: #f8f9fa; padding: 6px; border-radius: 4px; border: 1px solid #ddd;">
                                <strong style="color: #28a745;">【ベース (パーティー内)】</strong><br>
                                ATK: <span id="baseAtk">0</span><br>
                                HP: <span id="baseHp">0</span><br>
                                合体回数: <span id="baseMergeCount">0</span>
                            </div>
                            <div style="flex: 1; background: #f8f9fa; padding: 6px; border-radius: 4px; border: 1px solid #ddd;">
                                <strong style="color: #d9534f;">【素材 (パーティー外)】</strong><br>
                                ATK: <span id="matAtk">0</span><br>
                                HP: <span id="matHp">0</span><br>
                                合体回数: <span id="matMergeCount">0</span>
                            </div>
                        </div>

                        <div style="background: #e2f0cb; padding: 8px; border-radius: 4px; border: 1px solid #b5e48c; margin-bottom: 12px; font-size: 11px; text-align: left;">
                            <strong style="color: #386641;">【合体後のステータス予測】</strong><br>
                            ATK: <span id="resultAtk" style="font-weight:bold; color:#2b9348;">0</span> <span id="addAtkDiff" style="font-size:9px; color:#555;"></span><br>
                            HP: <span id="resultHp" style="font-weight:bold; color:#2b9348;">0</span> <span id="addHpDiff" style="font-size:9px; color:#555;"></span>
                        </div>
                        
                        <div style="display: flex; gap: 8px;">
                            <button id="executeMergeBtn" style="all: unset; background-color: #28a745; color: white; flex: 1; height: 36px; border-radius: 4px; font-weight: bold; font-size: 12px; text-align: center; cursor: pointer;">合体実行</button>
                            <button id="cancelMergeBtn" style="all: unset; background-color: #6c757d; color: white; width: 80px; height: 36px; border-radius: 4px; font-weight: bold; font-size: 12px; text-align: center; cursor: pointer;">キャンセル</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
            }

            const baseAtkSpan = modal.querySelector('#baseAtk');
            const baseHpSpan = modal.querySelector('#baseHp');
            const baseMergeCountSpan = modal.querySelector('#baseMergeCount');
            const matAtkSpan = modal.querySelector('#matAtk');
            const matHpSpan = modal.querySelector('#matHp');
            const matMergeCountSpan = modal.querySelector('#matMergeCount');
            const resultAtkSpan = modal.querySelector('#resultAtk');
            const resultHpSpan = modal.querySelector('#resultHp');
            const addAtkDiffSpan = modal.querySelector('#addAtkDiff');
            const addHpDiffSpan = modal.querySelector('#addHpDiff');
            const executeBtn = modal.querySelector('#executeMergeBtn');
            const cancelBtn = modal.querySelector('#cancelMergeBtn');

            const baseTotalAtk = baseMonster.originalAttack + (baseMonster.addedAttack || 0);
            const baseTotalHp = baseMonster.originalHp + (baseMonster.addedHp || 0);
            const matTotalAtk = materialMonster.originalAttack + (materialMonster.addedAttack || 0);
            const matTotalHp = materialMonster.originalHp + (materialMonster.addedHp || 0);

            const addAtk = Math.floor(matTotalAtk * mergeRate);
            const addHp = Math.floor(matTotalHp * mergeRate);

            baseAtkSpan.textContent = baseTotalAtk.toLocaleString();
            baseHpSpan.textContent = baseTotalHp.toLocaleString();
            baseMergeCountSpan.textContent = (Number(baseMonster.mergeCount) || 0).toLocaleString();

            matAtkSpan.textContent = matTotalAtk.toLocaleString();
            matHpSpan.textContent = matTotalHp.toLocaleString();
            matMergeCountSpan.textContent = (Number(materialMonster.mergeCount) || 0).toLocaleString();

            resultAtkSpan.textContent = (baseTotalAtk + addAtk).toLocaleString();
            resultHpSpan.textContent = (baseTotalHp + addHp).toLocaleString();
            addAtkDiffSpan.textContent = `(+${addAtk.toLocaleString()})`;
            addHpDiffSpan.textContent = `(+${addHp.toLocaleString()})`;

            const cleanup = (confirmed) => {
                executeBtn.onclick = null;
                cancelBtn.onclick = null;
                modal.style.display = 'none';
                onConfirm(confirmed);
                resolve(confirmed);
            };

            executeBtn.onclick = () => cleanup(true);
            cancelBtn.onclick = () => cleanup(false);
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
                        <p style="font-size: 11px; margin-bottom: 8px;">パーティー外のモンスターをパーティー内モンスターにドラッグ＆ドロップして合体させ、整理してください。</p>
                        <button id="closeLimitModalBtn" style="all: unset; background-color: #28a745; color: white; width: 100%; height: 36px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 12px;">閉じる</button>
                    </div>
                `;
                document.body.appendChild(modal);
            }

            const btn = modal.querySelector('#closeLimitModalBtn');
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
