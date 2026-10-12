'use strict';

export const Icons = {
    colorize: "M20.71 5.63l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-3.12 3.12-1.93-1.91-1.41 1.41 1.93 1.91-5.66 5.66V18h3.75l5.66-5.66 1.91 1.93 1.41-1.41-1.91-1.93 3.12-3.12c.39-.39.39-1.03 0-1.42zM6.92 19L5 17.08l5.06-5.06 1.92 1.92L6.92 19z",
    favorite: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
    swords: "m6.25,13.18l10.37,-11.07l5.35,-0.99l-0.14,4.37l-12.68,10l1.41,1.27l-1.41,1.69l-1.69,-1.27l-2.39,3.52l-3.38,-2.54c0,0 3.01,-2.45 3.01,-2.45c0,0 -2.39,-2.11 -2.45,-2.2c-0.06,-0.08 1.75,-2.31 1.69,-2.39c-0.06,-0.08 2.31,2.06 2.31,2.06z"

};

/**
 * Canvasコンテキストにマテリアルアイコンを描画する関数
 * @param {CanvasRenderingContext2D} ctx - キャンバスのコンテキスト
 * @param {string} iconName - アイコン名 ('colorize', 'favorite', 'swords')
 * @param {number} x - 描画位置X
 * @param {number} y - 描画位置Y
 * @param {number} [size=24] - アイコンのサイズ（デフォルト24px）
 * @param {string} [fillColor='#FFFFFF'] - 中身の塗りつぶし色
 * @param {string} [strokeColor=null] - 輪郭の色
 * @param {number} [lineWidth=1] - 輪郭の太さ
 */
export function drawIcon(ctx, iconName, x, y, size = 24, fillColor = '#FFFFFF', strokeColor = null, lineWidth = 1) {
    const pathData = Icons[iconName];
    if (!pathData) return;

    ctx.save();
    ctx.translate(x, y);
    const scale = size / 24;
    ctx.scale(scale, scale);
    
    const p = new Path2D(pathData);

    // 塗りつぶし描画
    if (fillColor && fillColor !== 'transparent' && fillColor !== 'rgba(0,0,0,0)') {
        ctx.fillStyle = fillColor;
        ctx.fill(p, 'nonzero');
    }

    // 輪郭（線）描画
    if (strokeColor && strokeColor !== 'transparent' && lineWidth > 0) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.stroke(p);
    }

    ctx.restore();
}
