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
                window.game.topMonsters = userData.monsters.map(data => {
                    const monster = new TopMonster(
                        window.game.topCanvas.width, 
                        window.game.topCanvas.height, 
                        null, 
                        data.attack + data.hp
                    );
                    monster.x = data.x;
                    monster.y = data.y;
                    monster.type = data.type;
                    monster.radius = data.radius;
                    monster.attack = data.attack;
                    monster.hp = data.hp;
                    return monster;
                });
            }

            if (userData.partyMonsterIds && Array.isArray(userData.partyMonsterIds) && window.game) {
                window.game.partyMonsterIds = userData.partyMonsterIds;
            }

            if (userData.dungeonFloor !== undefined && window.game) {
                window.game.dungeonFloor = userData.dungeonFloor;
                window.game.enemyMaxHp = Math.floor(200 * Math.pow(1.2, window.game.dungeonFloor - 1));
                window.game.enemyHp = window.game.enemyMaxHp;
                window.game.enemyAtk = Math.floor(1 * Math.pow(1.15, window.game.dungeonFloor - 1));
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
