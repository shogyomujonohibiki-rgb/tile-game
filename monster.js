'use strict';

export class TopMonster {
constructor(canvasWidth, canvasHeight, tileValue = null, initialScore = 10) {
        // --- 1. 基本パラメータ・プロパティの定義 ---
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.type = 0;
        this.radius = 8;
        this.attack = 1;
        this.hp = 1;

        // --- 2. 初期値の計算・代入処理 ---
        this.x = Math.random() * (canvasWidth - 30) + 15;
        this.y = Math.random() * (canvasHeight - 30) + 15;

        this.vx = (Math.random() - 0.5) * 1.2;
        this.vy = (Math.random() - 0.5) * 1.2;

        if (tileValue !== null) {
            this.type = (tileValue - 1) % 6;
            this.radius = Math.min(6 + tileValue, 14);
        } else {
            this.type = Math.floor(Math.random() * 3);
            this.radius = 8;
        }

        const ratio = Math.random();
        const atkBase = Math.floor(initialScore * ratio);
        this.attack = Math.max(1, atkBase);
        this.hp = Math.max(1, initialScore - this.attack);
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x - this.radius < 0 || this.x + this.radius > this.canvasWidth) {
            this.vx *= -1;
            this.x = Math.max(this.radius, Math.min(this.canvasWidth - this.radius, this.x));
        }
        if (this.y - this.radius < 0 || this.y + this.radius > this.canvasHeight) {
            this.vy *= -1;
            this.y = Math.max(this.radius, Math.min(this.canvasHeight - this.radius, this.y));
        }

        if (Math.random() < 0.02) {
            this.vx += (Math.random() - 0.5) * 0.4;
            this.vy += (Math.random() - 0.5) * 0.4;
            this.vx = Math.max(-1.2, Math.min(1.2, this.vx));
            this.vy = Math.max(-1.2, Math.min(1.2, this.vy));
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        const colors = ['#FF5722', '#9C27B0', '#00BCD4', '#FFEB3B', '#4CAF50', '#E91E63'];
        ctx.fillStyle = colors[this.type % colors.length];

        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(-this.radius * 0.35, -this.radius * 0.28, this.radius * 0.3, 0, Math.PI * 2);
        ctx.arc(this.radius * 0.35, -this.radius * 0.28, this.radius * 0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000';
        const eyeOffsetX = this.vx > 0 ? this.radius * 0.1 : -this.radius * 0.1;
        const eyeOffsetY = this.vy > 0 ? this.radius * 0.1 : -this.radius * 0.1;
        ctx.beginPath();
        ctx.arc(-this.radius * 0.35 + eyeOffsetX, -this.radius * 0.28 + eyeOffsetY, this.radius * 0.14, 0, Math.PI * 2);
        ctx.arc(this.radius * 0.35 + eyeOffsetX, -this.radius * 0.28 + eyeOffsetY, this.radius * 0.14, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        ctx.save();
        ctx.font = '8px Arial';
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.fillText(`ATK:${this.attack} HP:${this.hp}`, this.x, this.y - this.radius - 4);
        ctx.restore();
    }
}
