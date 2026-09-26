'use strict';

export class TopMonster {
    constructor(canvasWidth, canvasHeight, tileValue = null, initialScore = 10) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.x = 0;
        this.y = 0;
        this.type = 0;
        this.radius = 12;
        this.attack = 1;
        this.hp = 1;

        if (tileValue !== null) {
            this.type = (tileValue - 1) % 6;
            this.radius = Math.min(8 + tileValue, 16);
        } else {
            this.type = Math.floor(Math.random() * 3);
            this.radius = 12;
        }

        const ratio = Math.random();
        const atkBase = Math.floor(initialScore * ratio);
        this.attack = Math.max(1, atkBase);
        this.hp = Math.max(1, initialScore - this.attack);
    }

    update() {
        // モンスターは動かさない要件のため、移動処理はありません
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // 死亡判定（currentHp が 0 以下の場合）
        const isDead = this.currentHp !== undefined && this.currentHp <= 0;

        // 死亡時は縦幅を縮めてぐったりした表現にする
        const scaleY = isDead ? 0.5 : 1.0;
        ctx.scale(1.0, scaleY);

        const colors = ['#FF5722', '#9C27B0', '#00BCD4', '#FFEB3B', '#4CAF50', '#E91E63'];
        ctx.fillStyle = colors[this.type % colors.length];

        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (isDead) {
            // 死亡時：目の中を×にする
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            const size = 2.5;

            // 1つ目の目の×
            const eye1X = this.radius * 0.1;
            const eye1Y = -this.radius * 0.15;
            ctx.beginPath();
            ctx.moveTo(eye1X - size, eye1Y - size);
            ctx.lineTo(eye1X + size, eye1Y + size);
            ctx.moveTo(eye1X + size, eye1Y - size);
            ctx.lineTo(eye1X - size, eye1Y + size);
            ctx.stroke();

            // 2つ目の目の×
            const eye2X = this.radius * 0.6;
            const eye2Y = 0;
            ctx.beginPath();
            ctx.moveTo(eye2X - size, eye2Y - size);
            ctx.lineTo(eye2X + size, eye2Y + size);
            ctx.moveTo(eye2X + size, eye2Y - size);
            ctx.lineTo(eye2X - size, eye2Y + size);
            ctx.stroke();
        } else {
            // 生存時：右向きの状態で、目を横並びに2個配置（少し前後にずらして奥行き表現）[cite: 98]
            ctx.fillStyle = '#FFF';
            ctx.beginPath();
            ctx.arc(this.radius * 0.1, -this.radius * 0.25, this.radius * 0.24, 0, Math.PI * 2);
            ctx.arc(this.radius * 0.4, -0, this.radius * 0.24, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(this.radius * 0.15, -this.radius * 0.25, this.radius * 0.11, 0, Math.PI * 2);
            ctx.arc(this.radius * 0.45, -0, this.radius * 0.11, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

        ctx.save();
        ctx.font = '8px Arial';
        ctx.fillStyle = '#FFF';
        ctx.textAlign = 'center';
        // ぐったりして縦幅が縮んだ分、ATKテキストの位置も微調整
        const textY = this.y - (this.radius * scaleY) - 4;
        ctx.fillText(`ATK:${this.attack.toLocaleString()}`, this.x, textY);
        ctx.restore();
    }
}
