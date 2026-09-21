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
        this.closePartyModalBtn = document.getElementById('closePartyModal');
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

    // パーティー編成モーダルの表示（順番変更・並び替え対応）
    openPartyModal(topMonsters, partyMonsterIds) {
        if (!this.partyModal || !this.partySelectionList || !this.partyCountText) return;

        // 現在選択中のID配列の複製
        let currentParty = [...partyMonsterIds];

        const renderList = () => {
            this.partySelectionList.innerHTML = '';

            topMonsters.forEach((m, index) => {
                const div = document.createElement('div');
                div.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 6px 4px; border-bottom: 1px solid #eee;';

                const partyPos = currentParty.indexOf(index);
                const isSelected = partyPos !== -1;

                const leftArea = document.createElement('div');
                leftArea.style.cssText = 'display: flex; align-items: center; gap: 6px;';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.value = index;
                checkbox.checked = isSelected;

                checkbox.addEventListener('change', () => {
                    if (checkbox.checked) {
                        if (currentParty.length >= 6) {
                            checkbox.checked = false;
                            alert('パーティーに選べるのは最大6匹までです。');
                            return;
                        }
                        currentParty.push(index);
                    } else {
                        currentParty = currentParty.filter(id => id !== index);
                    }
                    renderList();
                });

                const labelText = document.createElement('span');
                labelText.style.fontSize = '12px';
                labelText.textContent = ` モンスター #${index + 1} (ATK:${m.attack} HP:${m.hp})`;

                leftArea.appendChild(checkbox);
                leftArea.appendChild(labelText);
                div.appendChild(leftArea);

                // 選択されているモンスターのみ「順番変更ボタン」を表示
                const rightArea = document.createElement('div');
                rightArea.style.cssText = 'display: flex; align-items: center; gap: 4px;';

                if (isSelected) {
                    const orderBadge = document.createElement('span');
                    orderBadge.style.cssText = 'font-weight: bold; color: #007bff; font-size: 11px; margin-right: 4px;';
                    orderBadge.textContent = `[先頭${partyPos + 1}]`;

                    const upBtn = document.createElement('button');
                    upBtn.textContent = '▲';
                    upBtn.style.cssText = 'padding: 2px 5px; font-size: 10px; cursor: pointer;';
                    upBtn.disabled = partyPos === 0;
                    upBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        if (partyPos > 0) {
                            const temp = currentParty[partyPos];
                            currentParty[partyPos] = currentParty[partyPos - 1];
                            currentParty[partyPos - 1] = temp;
                            renderList();
                        }
                    });

                    const downBtn = document.createElement('button');
                    downBtn.textContent = '▼';
                    downBtn.style.cssText = 'padding: 2px 5px; font-size: 10px; cursor: pointer;';
                    downBtn.disabled = partyPos === currentParty.length - 1;
                    downBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        if (partyPos < currentParty.length - 1) {
                            const temp = currentParty[partyPos];
                            currentParty[partyPos] = currentParty[partyPos + 1];
                            currentParty[partyPos + 1] = temp;
                            renderList();
                        }
                    });

                    rightArea.appendChild(orderBadge);
                    rightArea.appendChild(upBtn);
                    rightArea.appendChild(downBtn);
                }

                div.appendChild(rightArea);
                this.partySelectionList.appendChild(div);
            });

            this.partyCountText.textContent = `選択中: ${currentParty.length} / 6`;
            this.partySelectionList.dataset.currentParty = JSON.stringify(currentParty);
        };

        renderList();
        this.partyModal.style.display = 'flex';
    }

    // 選択・並び替えされたパーティーのインデックス一覧を取得
    getSelectedPartyIds() {
        if (!this.partySelectionList) return [];
        const raw = this.partySelectionList.dataset.currentParty;
        return raw ? JSON.parse(raw) : [];
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
