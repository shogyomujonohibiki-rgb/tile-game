'use strict';

export class UI {
    constructor() {
        this.scoreBoard = document.getElementById('scoreBoard');
        this.highScoreBoard = document.getElementById('highScoreBoard');
        this.mergeCountBoard = document.getElementById('mergeCountBoard');
        this.itemCountBoard = document.getElementById('itemCountBoard');
        this.timer = document.getElementById('timer');

        this.game4x4 = document.getElementById('game4x4');
        this.undoButton = document.getElementById('undoButton');
        this.itemButton = document.getElementById('itemButton');
        this.modeScoutBtn = document.getElementById('modeMonsterGet');
        this.modeDungeonBtn = document.getElementById('modeDungeon');

        this.colorSample = document.getElementById('colorSample');
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

    // 追加：パーティーボタン等の有効・無効切り替え用メソッド
    setPartyButtonEnabled(enabled) {
        // 必要に応じて特定のボタン要素の制御を行います（エラー回避用のプレースホルダーとしても機能します）
        if (this.modeScoutBtn) {
            this.modeScoutBtn.disabled = !enabled;
        }
        if (this.modeDungeonBtn) {
            this.modeDungeonBtn.disabled = !enabled;
        }
    }

    switchModeUI(mode) {
        if (!this.modeScoutBtn || !this.modeDungeonBtn) return;
        if (mode === 'scout') {
            this.modeScoutBtn.classList.add('active');
            this.modeDungeonBtn.classList.remove('active');
        } else if (mode === 'dungeon') {
            this.modeDungeonBtn.classList.add('active');
            this.modeScoutBtn.classList.remove('active');
        }
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
                        <p style="font-size: 11px; margin-bottom: 8px;">捨てるモンスターを<strong>1匹</strong>選択してください</p>
                        <div id="limitSelectionList" style="max-height: 200px; overflow-y: auto; border: 1px solid #ccc; margin-bottom: 12px; padding: 6px; text-align: left;"></div>
                        <button id="limitSubmitBtn" style="all: unset; background-color: #dc3545; color: white; width: 100%; height: 36px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 12px;">選択した1匹を捨てる</button>
                    </div>
                `;
                document.body.appendChild(modal);
            }

            const listContainer = modal.querySelector('#limitSelectionList');
            const submitBtn = modal.querySelector('#limitSubmitBtn');
            listContainer.innerHTML = '';

            let selectedIndex = 0;

            const updateListUI = () => {
                listContainer.innerHTML = '';
                topMonsters.forEach((m, index) => {
                    const div = document.createElement('div');
                    div.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 4px; border-bottom: 1px solid #eee; font-size: 11px; cursor: pointer;';

                    if (index === selectedIndex) {
                        div.style.backgroundColor = '#ffe6e6';
                    }

                    const label = document.createElement('label');
                    label.style.cursor = 'pointer';
                    const radio = document.createElement('input');
                    radio.type = 'radio';
                    radio.name = 'dropMonster';
                    radio.value = index;
                    radio.checked = (index === selectedIndex);

                    radio.addEventListener('change', () => {
                        selectedIndex = index;
                        updateListUI();
                    });

                    div.addEventListener('click', () => {
                        selectedIndex = index;
                        radio.checked = true;
                        updateListUI();
                    });

                    const isNew = index === topMonsters.length - 1;
                    const badge = isNew ? ' <span style="color: red; font-weight: bold;">[NEW]</span>' : '';

                    label.appendChild(radio);
                    label.appendChild(document.createElement('span')).innerHTML = ` #${index + 1} (ATK:${m.attack} HP:${m.hp})${badge}`;
                    div.appendChild(label);
                    listContainer.appendChild(div);
                });
            };

            updateListUI();

            const submitHandler = () => {
                submitBtn.removeEventListener('click', submitHandler);
                modal.style.display = 'none';
                resolve(selectedIndex);
            };

            submitBtn.onclick = submitHandler;
            modal.style.display = 'flex';
        });
    }
}
