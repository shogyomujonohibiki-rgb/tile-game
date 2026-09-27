'use strict';

import { Game } from './game.js';
import { TopMonster } from './monster.js';

{
    let currentAuthUserData = null;

    window.addEventListener('firebase-ready', async () => {
        const userData = await window.loadUserDataFromFirestore();

        if (userData) {
            currentAuthUserData = userData;
            if (userData.highScore !== undefined) {
                document.getElementById('highScoreBoard').textContent = `ハイスコア ${userData.highScore}`;
            }
            if (userData.userName) {
                localStorage.setItem('gameUserName', userData.userName);
            }

            // ▼ 先に partyMonsterIds と dungeonFloor を game インスタンスに反映させる
            if (userData.partyMonsterIds && Array.isArray(userData.partyMonsterIds) && window.game) {
                window.game.partyMonsterIds = userData.partyMonsterIds;
            }

            if (userData.dungeonFloor !== undefined && window.game) {
                window.game.setFloor(userData.dungeonFloor);
            }

            if (userData.monsters && Array.isArray(userData.monsters) && window.game && window.game.topCanvas) {
                // ▼ 保存されたデータをそのまま savedData として渡して復元する
                window.game.topMonsters = userData.monsters.map(data => {
                    const monster = new TopMonster(
                        window.game.topCanvas.width,
                        window.game.topCanvas.height,
                        null,
                        data.attack + data.hp,
                        data // ← data（保存データ）をまるごと渡す
                    );

                    // 位置やHPを明細に反映
                    monster.x = data.x ?? 0;
                    monster.y = data.y ?? 0;
                    if (data.currentHp !== undefined) {
                        monster.currentHp = data.currentHp;
                    }
                    return monster;
                });

                if (window.game.dataManager) {
                    await window.game.dataManager.saveCloudData(window.game);
                }
            }
        } else {
            const localName = localStorage.getItem('gameUserName');
            if (localName && window.saveUserDataToFirestore) {
                window.saveUserDataToFirestore({ userName: localName });
            }
        }

        if (window.game && window.game.topCanvas && window.game.topMonsters.length === 0) {
            window.game.topMonsters = [
                new TopMonster(window.game.topCanvas.width, window.game.topCanvas.height, 1, 10)
            ];
        }

        if (window.game && window.currentUser) {
            window.game.uid = window.currentUser.uid;
        }
    });

    window.game = new Game();
}
