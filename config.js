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
};

export const MONSTER = {
    MAX_OWNED: 20,
    MAX_PARTY: 6,
};

export const DUNGEON = {
    ENEMY_BASE_HP: 10000,
    ENEMY_HP_GROWTH: 1.1,
    ENEMY_BASE_ATK: 5,
    ENEMY_ATK_GROWTH: 1.035,
};

export class Dungeon {
    // 階層 → 敵ステータス。敵の強さの式はここだけに置く
    static enemyFor(floor) {
        const n = Math.max(1, floor) - 1;
        return {
            maxHp: Math.floor(DUNGEON.ENEMY_BASE_HP * Math.pow(DUNGEON.ENEMY_HP_GROWTH, n)),
            atk: Math.floor(DUNGEON.ENEMY_BASE_ATK * Math.pow(DUNGEON.ENEMY_ATK_GROWTH, n)),
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

        // 1匹ずつ順番にダメージを与える
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
            // 敵からの反撃（先頭の生存モンスターが被弾）
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
