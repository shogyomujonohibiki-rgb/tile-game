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
    ENEMY_ATK_GROWTH: 1.05,
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
