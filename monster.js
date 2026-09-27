'use strict';

export class TopMonster {
    constructor(canvasWidth, canvasHeight, tileValue = null, initialScore = 10, savedData = null) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.x = 0;
        this.y = 0;
        this.radius = 16;
        this.attack = 1;
        this.hp = 1;

        // アニメーション用の位相やランダム係数
        this.animPhase = Math.random() * Math.PI * 2;
        this.animSpeed = 0.03 + Math.random() * 0.04;
        this.floatAmplitude = 4 + Math.random() * 6;

        // 多様性を生むパーツパラメータ（数万通りの組み合わせ）
        const palettes = [
            { main: '#FF5722', sub: '#FF8A65', accent: '#D84315' },
            { main: '#9C27B0', sub: '#BA68C8', accent: '#7B1FA2' },
            { main: '#00BCD4', sub: '#4DD0E1', accent: '#00838F' },
            { main: '#FFEB3B', sub: '#FFF176', accent: '#FBC02D' },
            { main: '#4CAF50', sub: '#81C784', accent: '#388E3C' },
            { main: '#E91E63', sub: '#F06292', accent: '#C2185B' },
            { main: '#3F51B5', sub: '#7986CB', accent: '#303F9F' },
            { main: '#FF9800', sub: '#FFB74D', accent: '#F57C00' }
        ];

        const s = savedData || {};
        this.bodyType = s.bodyType !== undefined ? s.bodyType : Math.floor(Math.random() * 4);
        this.paletteIndex = s.paletteIndex !== undefined ? s.paletteIndex : Math.floor(Math.random() * palettes.length);
        this.palette = palettes[this.paletteIndex];
        this.hasHorn = s.hasHorn !== undefined ? s.hasHorn : Math.random() > 0.3;
        this.hornType = s.hornType !== undefined ? s.hornType : Math.floor(Math.random() * 3);
        this.hornCount = s.hornCount !== undefined ? s.hornCount : (Math.random() > 0.7 ? 2 : 1);
        this.hasWing = s.hasWing !== undefined ? s.hasWing : Math.random() > 0.4;
        this.wingType = s.wingType !== undefined ? s.wingType : Math.floor(Math.random() * 3);
        this.hasTail = s.hasTail !== undefined ? s.hasTail : Math.random() > 0.3;
        this.tailType = s.tailType !== undefined ? s.tailType : Math.floor(Math.random() * 3);
        this.eyeType = s.eyeType !== undefined ? s.eyeType : Math.floor(Math.random() * 4);

        if (tileValue !== null) {
            this.radius = Math.min(10 + tileValue * 1.5, 20);
        }

        const ratio = Math.random();
        const atkBase = Math.floor(initialScore * ratio);
        this.attack = Math.max(1, atkBase);
        this.hp = Math.max(1, initialScore - this.attack);
    }

    update() {
        const isDead = this.currentHp !== undefined && this.currentHp <= 0;
        if (isDead) return;

        this.animPhase += this.animSpeed;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // sin とランダムを組み合わせた常時動く浮遊・揺れ表現
        const sinY = Math.sin(this.animPhase) * this.floatAmplitude;
        const sinRotate = Math.sin(this.animPhase * 0.5) * 0.05;

        ctx.translate(0, sinY);
        ctx.rotate(sinRotate);

        const isDead = this.currentHp !== undefined && this.currentHp <= 0;
        const scaleY = isDead ? 0.4 : 1.0;
        ctx.scale(1.0, scaleY);

        // --- 尻尾の描画 ---
        if (this.hasTail && !isDead) {
            ctx.save();
            ctx.strokeStyle = this.palette.accent;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            const tailWave = Math.sin(this.animPhase * 2) * 5;

            ctx.beginPath();
            if (this.tailType === 0) {
                ctx.moveTo(-this.radius * 0.8, 0);
                ctx.quadraticCurveTo(-this.radius * 1.5, -10 + tailWave, -this.radius * 2, tailWave);
            } else if (this.tailType === 1) {
                ctx.moveTo(-this.radius * 0.8, 0);
                ctx.quadraticCurveTo(-this.radius * 1.6, 10 + tailWave, -this.radius * 2, 5 + tailWave);
            } else {
                ctx.moveTo(-this.radius * 0.8, 0);
                ctx.lineTo(-this.radius * 1.8, -5 + tailWave);
                ctx.lineTo(-this.radius * 1.5, 5 + tailWave);
            }
            ctx.stroke();
            ctx.restore();
        }

        // --- 羽の描画 ---
        if (this.hasWing && !isDead) {
            ctx.save();
            ctx.fillStyle = this.palette.sub;
            ctx.strokeStyle = this.palette.accent;
            ctx.lineWidth = 1.5;

            const wingFlap = Math.sin(this.animPhase * 4) * 0.2;
            ctx.translate(-this.radius * 0.2, -this.radius * 0.3);
            ctx.rotate(wingFlap);

            ctx.beginPath();
            if (this.wingType === 0) {
                ctx.ellipse(-10, -5, 12, 6, -Math.PI / 4, 0, Math.PI * 2);
            } else if (this.wingType === 1) {
                ctx.moveTo(0, 0);
                ctx.lineTo(-15, -12);
                ctx.lineTo(-10, -2);
                ctx.lineTo(-18, 5);
                ctx.closePath();
            } else {
                ctx.arc(-10, -8, 8, 0, Math.PI * 2);
            }
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        // --- 本体の描画 ---
        ctx.fillStyle = this.palette.main;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;

        ctx.beginPath();
        if (this.bodyType === 0) {
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        } else if (this.bodyType === 1) {
            ctx.ellipse(0, 0, this.radius * 1.2, this.radius * 0.9, 0, 0, Math.PI * 2);
        } else if (this.bodyType === 2) {
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i;
                const px = Math.cos(angle) * this.radius;
                const py = Math.sin(angle) * this.radius;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
        } else {
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI / 4) * i;
                const r = i % 2 === 0 ? this.radius : this.radius * 0.75;
                const px = Math.cos(angle) * r;
                const py = Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
        }
        ctx.fill();
        ctx.stroke();

        // --- 角の描画 ---
        if (this.hasHorn && !isDead) {
            ctx.fillStyle = this.palette.accent;
            ctx.strokeStyle = '#FFF';
            ctx.lineWidth = 1;

            const drawHorn = (hx, hy, hSign) => {
                ctx.save();
                ctx.translate(hx, hy);
                ctx.rotate(hSign * 0.3);
                ctx.beginPath();
                if (this.hornType === 0) {
                    ctx.moveTo(0, 0);
                    ctx.lineTo(hSign * 4, -this.radius * 0.8);
                    ctx.lineTo(-2, -this.radius * 0.4);
                } else if (this.hornType === 1) {
                    ctx.arc(0, -this.radius * 0.4, 5, 0, Math.PI * 1.5);
                } else {
                    ctx.moveTo(0, 0);
                    ctx.lineTo(hSign * 6, -this.radius * 0.5);
                    ctx.lineTo(hSign * 2, 0);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            };

            if (this.hornCount === 2) {
                drawHorn(-this.radius * 0.4, -this.radius * 0.7, -1);
                drawHorn(this.radius * 0.4, -this.radius * 0.7, 1);
            } else {
                drawHorn(0, -this.radius * 0.8, 1);
            }
        }

        // --- 目の描画 ---
        if (isDead) {
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1.5;
            const size = 3;
            [-6, 6].forEach(ex => {
                ctx.beginPath();
                ctx.moveTo(ex - size, -size);
                ctx.lineTo(ex + size, size);
                ctx.moveTo(ex + size, -size);
                ctx.lineTo(ex - size, size);
                ctx.stroke();
            });
        } else {
            ctx.fillStyle = '#FFF';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;

            const eyeOffsetX = 6;
            const eyeOffsetY = -2;

            [-eyeOffsetX, eyeOffsetX].forEach((ex) => {
                ctx.save();
                ctx.translate(ex, eyeOffsetY);
                ctx.beginPath();
                if (this.eyeType === 0) {
                    ctx.arc(0, 0, 5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    ctx.fillStyle = '#000';
                    ctx.beginPath();
                    ctx.arc(1, 0, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                } else if (this.eyeType === 1) {
                    ctx.moveTo(-5, 3);
                    ctx.lineTo(5, -3);
                    ctx.lineTo(5, 3);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                } else if (this.eyeType === 2) {
                    ctx.ellipse(0, 0, 3, 5, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    ctx.fillStyle = '#000';
                    ctx.fillRect(-1, -2, 2, 4);
                } else {
                    ctx.arc(0, 0, 5, Math.PI, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                }
                ctx.restore();
            });
        }

        ctx.restore();

        // ATKテキスト
        ctx.save();
        ctx.font = '8px Arial';
        ctx.fillStyle = '#FFF';
        ctx.textAlign = 'center';
        const textY = this.y + sinY - (this.radius * scaleY) - 6;
        ctx.fillText(`ATK:${this.attack.toLocaleString()}`, this.x, textY);
        ctx.restore();
    }
}
