'use strict';

import { Game } from './game.js';
import { TopMonster } from './monster.js'; // TopMonsterのインポートを追加

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

            // Firestoreに保存されたモンスターデータがあれば復元
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

        // 保存データがなかったり、モンスターデータが空の場合は初期の1体を生成する
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
