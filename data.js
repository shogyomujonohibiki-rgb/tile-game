'use strict';

export class DataManager {
    constructor() {}

    // ユーザーデータの読み込み
    async loadUserData() {
        if (typeof window.loadUserDataFromFirestore === 'function') {
            return await window.loadUserDataFromFirestore();
        }
        return null;
    }

    // クラウドデータ（ユーザー設定・モンスター等）の保存
    async saveCloudData(game) {
        if (typeof window.saveUserDataToFirestore !== 'function') return;

        const monstersData = game.topMonsters.map(m => ({
            x: m.x,
            y: m.y,
            type: m.type,
            radius: m.radius,
            attack: m.attack,
            hp: m.hp
        }));

        await window.saveUserDataToFirestore({
            uid: game.uid,
            userName: game.userName,
            highScore: game.highScore,
            monsters: monstersData,
            partyMonsterIds: game.partyMonsterIds,
            dungeonFloor: game.battleManager.dungeonFloor
        });
    }

    // スコアの保存
    async saveScore(score, mergeCount, userName) {
        if (typeof window.saveScoreToFirestore === 'function') {
            await window.saveScoreToFirestore(score, mergeCount, userName);
        }
    }

    // ランキングデータの取得
    async fetchLeaderboards(uid) {
        try {
            const [globalData, myData] = await Promise.all([
                typeof window.fetchLeaderboardFromFirestore === 'function'
                    ? window.fetchLeaderboardFromFirestore(20)
                    : [],
                (typeof window.fetchMyLeaderboardFromFirestore === 'function' && uid)
                    ? window.fetchMyLeaderboardFromFirestore(uid, 20)
                    : []
            ]);
            return {
                globalLeaderboard: globalData || [],
                myLeaderboard: myData || []
            };
        } catch (error) {
            console.error("ランキングデータの取得に失敗しました:", error);
            return { globalLeaderboard: [], myLeaderboard: [] };
        }
    }
}
