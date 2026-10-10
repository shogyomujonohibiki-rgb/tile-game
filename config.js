'use strict';

export const BOARD = {
    ROWS: 4,
    COLS: 4,
    TILE_MARGIN: 5,
    TYPE_COUNTS: [5, 5, 6], // 色ごとの初期枚数（合計16）
    COLORS: ['(230, 82, 82)', '(79, 54, 219)', '(74, 162, 74)'],
};

export const STORAGE_KEYS = {
    HIGH_SCORE_4X4: 'highScore4x4',
    USER_NAME: 'gameUserName',
    COINS: 'gameCoins', // 【追加】コインのストレージ保存キー
};

export const COIN_EXCHANGE = {
    COST: 3000, // 【追加】+1アイテム交換に必要なコスト
};

export const MONSTER = {
    MAX_OWNED: 20,
    MAX_PARTY: 6,
    MERGE_RATE: 0.5, // 合体時に引き継ぐステータスの割合 (50%)
};

export const DUNGEON = {
    ENEMY_BASE_HP: 2000,
    ENEMY_BASE_ATK: 5,

    // HPのインフレ設定パラメータ
    HP_GROWTH_RATE: 0.13,       // 10%
    HP_GROWTH_DECAY: 0.995,    // 99.5%
    HP_MIN_RATE: 1.001,        // 最小 100.1%

    // ATKのインフレ設定パラメータ
    ATK_GROWTH_RATE: 0.07,    // 5.5%
    ATK_GROWTH_DECAY: 0.996,   // 99.6%
    ATK_MIN_RATE: 1.001,       // 最小 100.1%

    // スカウト倍率の計算用パラメータ
    SCOUT_GROWTH_RATE: 0.07,
    SCOUT_GROWTH_DECAY: 0.996,
    SCOUT_MIN_RATE: 1.001,
    SCOUT_GROWTH_ADJUST: 0.04, // スカウト倍率の調整値（1.0に近いほど倍率が低くなる）
};

export class Dungeon {
    static scoutMultiplierFor(floor) {
        const targetFloor = Math.max(1, floor);
        let multiplier = 1.0;

        for (let n = 2; n <= targetFloor; n++) {
            let rate = 1 + DUNGEON.SCOUT_GROWTH_RATE * Math.pow(DUNGEON.SCOUT_GROWTH_DECAY, n);
            multiplier *= Math.max(DUNGEON.SCOUT_MIN_RATE, rate);
        }
        return Math.max(0.1, multiplier * DUNGEON.SCOUT_GROWTH_ADJUST);
    }

    static enemyFor(floor) {
        const targetFloor = Math.max(1, floor);

        let hp = DUNGEON.ENEMY_BASE_HP;
        let atk = DUNGEON.ENEMY_BASE_ATK;

        for (let n = 2; n <= targetFloor; n++) {
            let hpRate = 1 + DUNGEON.HP_GROWTH_RATE * Math.pow(DUNGEON.HP_GROWTH_DECAY, n);
            hpRate = Math.max(hpRate, DUNGEON.HP_MIN_RATE);
            hp *= hpRate;

            let atkRate = 1 + DUNGEON.ATK_GROWTH_RATE * Math.pow(DUNGEON.ATK_GROWTH_DECAY, n);
            atkRate = Math.max(atkRate, DUNGEON.ATK_MIN_RATE);
            atk *= atkRate;
        }

        return {
            maxHp: Math.floor(hp),
            atk: Math.floor(atk),
        };
    }
}

export class BattleManager {
    constructor() {
        this.dungeonFloor = 1;
        this.enemyMaxHp = 0;
        this.enemyHp = 0;
        this.enemyAtk = 0;
        this.setFloor(1);
    }

    setFloor(floor) {
        this.dungeonFloor = floor;
        const enemy = Dungeon.enemyFor(floor);
        this.enemyMaxHp = enemy.maxHp;
        this.enemyHp = enemy.maxHp;
        this.enemyAtk = enemy.atk;
    }

    reset(topMonsters) {
        this.enemyHp = this.enemyMaxHp;
        if (topMonsters && topMonsters.length > 0) {
            topMonsters.forEach(m => {
                m.currentHp = m.hp;
            });
        }
    }

    getTotalAtk(partyMonsters) {
        if (!partyMonsters || partyMonsters.length === 0) return 0;
        return partyMonsters.reduce((sum, m) => {
            const currentHp = m.currentHp !== undefined ? m.currentHp : m.hp;
            return currentHp > 0 ? sum + m.attack : sum;
        }, 0);
    }

    processCombat(partyMonsters, tileValue) {
        if (!partyMonsters || partyMonsters.length === 0) {
            return { isFloorCleared: false, isGameOver: false, attackEvents: [] };
        }

        let isFloorCleared = false;

        const livingMonsters = partyMonsters.filter(m => {
            const currentHp = m.currentHp !== undefined ? m.currentHp : m.hp;
            return currentHp > 0;
        });

        if (livingMonsters.length === 0) {
            return { isFloorCleared: false, isGameOver: true, attackEvents: [] };
        }

        const attackEvents = [];

        for (const monster of livingMonsters) {
            if (this.enemyHp <= 0) break;

            const damage = Math.floor(monster.attack * tileValue * tileValue);
            this.enemyHp -= damage;
            attackEvents.push({ monster, damage });

            if (this.enemyHp <= 0) {
                this.setFloor(this.dungeonFloor + 1);
                isFloorCleared = true;
                break;
            }
        }

        if (isFloorCleared) {
            return { isFloorCleared: true, isGameOver: false, attackEvents };
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
            return { isFloorCleared: false, isGameOver: allDead, attackEvents };
        }
    }
}
