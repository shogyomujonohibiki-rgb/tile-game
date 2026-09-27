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

            if (userData.monsters && Array.isArray(userData.monsters) && window.game && window.game.topCanvas) {
                let needsSave = false;

                // ▼ 読み込みデータ自体にパラメータがない場合、あらかじめここでランダム値を確定させて持たせる
                const processedMonstersData = userData.monsters.map(data => {
                    let updated = false;
                    const filledData = { ...data };

                    if (filledData.bodyType === undefined) { filledData.bodyType = Math.floor(Math.random() * 4); updated = true; }
                    if (filledData.paletteIndex === undefined) { filledData.paletteIndex = Math.floor(Math.random() * 8); updated = true; }
                    if (filledData.hasHorn === undefined) { filledData.hasHorn = Math.random() > 0.3; updated = true; }
                    if (filledData.hornType === undefined) { filledData.hornType = Math.floor(Math.random() * 3); updated = true; }
                    if (filledData.hornCount === undefined) { filledData.hornCount = Math.random() > 0.7 ? 2 : 1; updated = true; }
                    if (filledData.hasWing === undefined) { filledData.hasWing = Math.random() > 0.4; updated = true; }
                    if (filledData.wingType === undefined) { filledData.wingType = Math.floor(Math.random() * 3); updated = true; }
                    if (filledData.hasTail === undefined) { filledData.hasTail = Math.random() > 0.3; updated = true; }
                    if (filledData.tailType === undefined) { filledData.tailType = Math.floor(Math.random() * 3); updated = true; }
                    if (filledData.eyeType === undefined) { filledData.eyeType = Math.floor(Math.random() * 4); updated = true; }

                    if (updated) {
                        needsSave = true;
                    }
                    return filledData;
                });

                window.game.topMonsters = processedMonstersData.map(data => {
                    const monster = new TopMonster(
                        window.game.topCanvas.width,
                        window.game.topCanvas.height,
                        null,
                        data.attack + data.hp,
                        data // 確定済みのデータを渡す
                    );
                    monster.x = data.x;
                    monster.y = data.y;
                    monster.type = data.type;
                    monster.radius = data.radius;
                    monster.attack = data.attack;
                    monster.hp = data.hp;
                    return monster;
                });

                // 不足しているパラメータがあった場合は即座にクラウドへ保存
                if (needsSave && window.game.dataManager) {
                    await window.game.dataManager.saveCloudData(window.game);
                }
            }

            if (userData.partyMonsterIds && Array.isArray(userData.partyMonsterIds) && window.game) {
                window.game.partyMonsterIds = userData.partyMonsterIds;
            }

            if (userData.dungeonFloor !== undefined && window.game) {
                window.game.setFloor(userData.dungeonFloor);
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
