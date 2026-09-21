'use strict';

import { DUNGEON } from './config.js';

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
