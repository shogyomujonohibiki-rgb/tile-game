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

        const colors = ['#FF5722', '#9C27B0', '#00BCD4', '#FFEB3B', '#4CAF50', '#E91E63'];
        ctx.fillStyle = colors[this.type % colors.length];

        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 右向きの状態で、目を横並びに2個配置（少し前後にずらして奥行き表現）
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

        ctx.restore();

        ctx.save();
        ctx.font = '8px Arial';
        ctx.fillStyle = '#FFF';
        ctx.textAlign = 'center';
        this.ctx?.fillText ? this.ctx.fillText(`ATK:${this.attack}`, this.x, this.y - this.radius - 4) : ctx.fillText(`ATK:${this.attack}`, this.x, this.y - this.radius - 4);
        ctx.restore();
    }
}
