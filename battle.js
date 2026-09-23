'use strict';

import { Dungeon } from './config.js';

export class BattleManager {
    constructor() {
        this.dungeonFloor = 1;
        this.enemyMaxHp = 0;
        this.enemyHp = 0;
        this.enemyAtk = 0;
        this.setFloor(1);
    }

    // 階層を設定し敵ステータスを初期化
    setFloor(floor) {
        this.dungeonFloor = floor;
        const enemy = Dungeon.enemyFor(floor);
        this.enemyMaxHp = enemy.maxHp;
        this.enemyHp = enemy.maxHp;
        this.enemyAtk = enemy.atk;
    }

    // リセット処理
    reset(topMonsters) {
        this.enemyHp = this.enemyMaxHp;
        if (topMonsters && topMonsters.length > 0) {
            topMonsters.forEach(m => {
                m.currentHp = m.hp;
            });
        }
    }

    // 生存中のパーティの合計攻撃力を取得
    getTotalAtk(partyMonsters) {
        if (!partyMonsters || partyMonsters.length === 0) return 0;
        return partyMonsters.reduce((sum, m) => {
            const currentHp = m.currentHp !== undefined ? m.currentHp : m.hp;
            return currentHp > 0 ? sum + m.attack : sum;
        }, 0);
    }

    // 戦闘計算処理
    // 戻り値: { isFloorCleared: boolean, isGameOver: boolean }
    processCombat(partyMonsters, tileValue) {
        if (partyMonsters.length === 0) return { isFloorCleared: false, isGameOver: false };

        const totalAtk = this.getTotalAtk(partyMonsters);
        const totalDamage = totalAtk * tileValue;
        this.enemyHp -= totalDamage;

        if (this.enemyHp <= 0) {
            this.setFloor(this.dungeonFloor + 1);
            return { isFloorCleared: true, isGameOver: false };
        } else {
            const livingMonster = partyMonsters.find(m => (m.currentHp !== undefined ? m.currentHp : m.hp) > 0);
            if (livingMonster) {
                if (livingMonster.currentHp === undefined) livingMonster.currentHp = livingMonster.hp;
                livingMonster.currentHp -= this.enemyAtk;

                if (livingMonster.currentHp <= 0) {
                    livingMonster.currentHp = 0;
                }
            }

            const allDead = partyMonsters.every(m => (m.currentHp !== undefined ? m.currentHp : m.hp) <= 0);
            return { isFloorCleared: false, isGameOver: allDead };
        }
    }
}
