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

            // Firestoreから保存されたモンスターデータを復元
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
                    monster.vx = data.vx;
                    monster.vy = data.vy;
                    monster.type = data.type;
                    monster.radius = data.radius;
                    monster.attack = data.attack;
                    monster.hp = data.hp;
                    return monster;
                });
            }
        } else {
            const localName = localStorage.getItem('gameUserName');
            if (localName && window.saveUserDataToFirestore) {
                window.saveUserDataToFirestore({ userName: localName });
            }
        }

        if (window.game && window.currentUser) {
            window.game.uid = window.currentUser.uid;
        }
    });

    window.game = new Game();
}
