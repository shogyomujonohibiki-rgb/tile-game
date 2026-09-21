'use strict';

export class UI {
    constructor() {
        // 表示要素
        this.scoreBoard = document.getElementById('scoreBoard');
        this.highScoreBoard = document.getElementById('highScoreBoard');
        this.mergeCountBoard = document.getElementById('mergeCountBoard');
        this.itemCountBoard = document.getElementById('itemCountBoard');
        this.timer = document.getElementById('timer');

        // 操作ボタン
        this.game4x4 = document.getElementById('game4x4');
        this.undoButton = document.getElementById('undoButton');
        this.itemButton = document.getElementById('itemButton');
        this.partyButton = document.getElementById('partyButton');
        this.modeScoutBtn = document.getElementById('modeMonsterGet');
        this.modeDungeonBtn = document.getElementById('modeDungeon');

        // モーダル関連要素
        this.partyModal = document.getElementById('partyModal');
        this.closePartyModal = document.getElementById('closePartyModal');
        this.partySelectionList = document.getElementById('partySelectionList');
        this.partyCountText = document.getElementById('partyCountText');

        // その他
        this.colorSample = document.getElementById('colorSample');
    }

    // スコア表示更新
    updateScore(score) {
        if (this.scoreBoard) {
            this.scoreBoard.innerHTML = `スコア ${score}`;
        }
    }

    // ハイスコア表示更新
    updateHighScore(highScore) {
        if (this.highScoreBoard) {
            this.highScoreBoard.innerHTML = `ハイスコア ${highScore}`;
        }
    }

    // マージ回数表示更新
    updateMergeCount(count) {
        if (this.mergeCountBoard) {
            this.mergeCountBoard.innerHTML = `マージ回数：${count}`;
        }
    }

    // アイテム数表示更新
    updateItemCount(count) {
        if (this.itemCountBoard) {
            this.itemCountBoard.innerHTML = `+1アイテム：${count}`;
        }
    }

    // タイマー表示更新
    updateTimer(text) {
        if (this.timer) {
            this.timer.textContent = text;
        }
    }

    // アイテムボタンのアクティブ状態切り替え
    setItemActive(isActive) {
        if (!this.itemButton) return;
        if (isActive) {
            this.itemButton.classList.add('active');
        } else {
            this.itemButton.classList.remove('active');
        }
    }

    // パーティーボタンの有効/無効化
    setPartyButtonEnabled(enabled) {
        if (!this.partyButton) return;
        this.partyButton.disabled = !enabled;
        this.partyButton.style.opacity = enabled ? '1' : '0.5';
        this.partyButton.style.cursor = enabled ? 'pointer' : 'not-allowed';
    }

    // モード切り替えボタンの表示更新
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

    // カラーサンプルの初期化生成
    initializeColorSample(colors) {
        if (!this.colorSample) return;

        this.colorSample.innerHTML = '';
        const colorSequence = [...colors, colors[0]];

        colorSequence.forEach((color, index) => {
            const box = document.createElement('div');
            box.className = 'sample-box';
            box.style.backgroundColor = `rgb${color}`;
            this.colorSample.appendChild(box);

            if (index < colorSequence.length - 1) {
                const arrow = document.createElement('span');
                arrow.className = 'sample-arrow';
                arrow.textContent = '→';
                this.colorSample.appendChild(arrow);
            }
        });
    }

    // パーティー編成モーダルの表示
    openPartyModal(topMonsters, partyMonsterIds) {
        if (!this.partyModal || !this.partySelectionList || !this.partyCountText) return;

        this.partySelectionList.innerHTML = '';

        topMonsters.forEach((m, index) => {
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.alignItems = 'center';
            div.style.justifyContent = 'space-between';
            div.style.padding = '6px 4px';
            div.style.borderBottom = '1px solid #eee';

            const label = document.createElement('label');
            label.style.cursor = 'pointer';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = index;
            checkbox.checked = partyMonsterIds.includes(index);

            checkbox.addEventListener('change', () => {
                const checkedBoxes = this.partySelectionList.querySelectorAll('input[type="checkbox"]:checked');
                if (checkedBoxes.length > 6) {
                    checkbox.checked = false;
                    alert('パーティーに選べるのは最大6匹までです。');
                    return;
                }
                this.partyCountText.textContent = `選択中: ${checkedBoxes.length} / 6`;
            });

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(` モンスター #${index + 1} (ATK:${m.attack} HP:${m.hp})`));
            div.appendChild(label);
            this.partySelectionList.appendChild(div);
        });

        const selectedCount = partyMonsterIds.length;
        this.partyCountText.textContent = `選択中: ${selectedCount} / 6`;
        this.partyModal.style.display = 'flex';
    }

    // 選択されたパーティーのインデックス一覧を取得
    getSelectedPartyIds() {
        if (!this.partySelectionList) return [];
        const checkedBoxes = this.partySelectionList.querySelectorAll('input[type="checkbox"]:checked');
        return Array.from(checkedBoxes).map(cb => parseInt(cb.value, 10));
    }

    // パーティー編成モーダルを閉じる
    closePartyModal() {
        if (this.partyModal) {
            this.partyModal.style.display = 'none';
        }
    }

    // モンスター上限（20匹超え）モーダルの表示と選択処理
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
