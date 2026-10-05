'use strict';

import { Dungeon } from './config.js';

export class TopMonster {
    constructor(canvasWidth, canvasHeight, tileValue = null, initialScore = 10, savedData = null, currentFloor = 1) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.x = 0;
        this.y = 0;
        this.radius = 12;

        this.startTime = Date.now();

        const bodyIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
        const pendulumIndices = [4, 5, 8, 12];
        this.pendulumIndices = pendulumIndices;

        this.config = {
            baseSpeed: 0.8 + Math.random() * 1.2,
            phase: Math.random() * Math.PI * 2,
            modSpeed: 0.5 + Math.random() * 1.0,
            pendulumFreq: 2.0 + Math.random() * 1.0
        };

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

        const eyeIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

        const s = savedData || {};
        this.bodyType = s.bodyType !== undefined ? s.bodyType : bodyIndices[Math.floor(Math.random() * bodyIndices.length)];
        this.paletteIndex = s.paletteIndex !== undefined ? s.paletteIndex : Math.floor(Math.random() * palettes.length);
        this.palette = palettes[this.paletteIndex];

        this.hasHorn = s.hasHorn !== undefined ? s.hasHorn : false;
        this.hornType = s.hornType !== undefined ? s.hornType : null;
        this.hornCount = s.hornCount !== undefined ? s.hornCount : 0;
        this.hasWing = s.hasWing !== undefined ? s.hasWing : false;
        this.wingType = s.wingType !== undefined ? s.wingType : null;
        this.hasTail = s.hasTail !== undefined ? s.hasTail : false;
        this.tailType = s.tailType !== undefined ? s.tailType : null;

        this.eyeType = s.eyeType !== undefined ? s.eyeType : eyeIndices[Math.floor(Math.random() * eyeIndices.length)];

        // --- ステータスおよび合体関連の初期化 ---
        if (s.originalAttack !== undefined && s.originalHp !== undefined) {
            this.originalAttack = s.originalAttack;
            this.originalHp = s.originalHp;
        } else if (s.attack !== undefined && s.hp !== undefined) {
            this.originalAttack = s.attack;
            this.originalHp = s.hp;
        } else {
            // スカウト倍率を適用してステータスを決定
            const scoutMultiplier = Dungeon.scoutMultiplierFor ? Dungeon.scoutMultiplierFor(currentFloor) : 1.0;
            const basePower = Math.max(10, Math.floor(initialScore * scoutMultiplier));

            this.originalAttack = Math.max(1, Math.floor(Math.random() * basePower) + 1);
            this.originalHp = basePower - this.originalAttack;
        }

        this.addedAttack = s.addedAttack !== undefined ? s.addedAttack : 0;
        this.addedHp = s.addedHp !== undefined ? s.addedHp : 0;
        this.mergeCount = s.mergeCount !== undefined ? s.mergeCount : 0;
    }

    get attack() {
        return this.originalAttack + this.addedAttack;
    }

    get hp() {
        return this.originalHp + this.addedHp;
    }

    toSaveObject() {
        return {
            bodyType: this.bodyType,
            paletteIndex: this.paletteIndex,
            hasHorn: this.hasHorn,
            hornType: this.hornType,
            hornCount: this.hornCount,
            hasWing: this.hasWing,
            wingType: this.wingType,
            hasTail: this.hasTail,
            tailType: this.tailType,
            eyeType: this.eyeType,
            originalAttack: this.originalAttack,
            originalHp: this.originalHp,
            addedAttack: this.addedAttack,
            addedHp: this.addedHp,
            mergeCount: this.mergeCount
        };
    }

    update() {
        const isDead = this.currentHp !== undefined && this.currentHp <= 0;
        if (isDead) {
            return;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        const isDead = this.currentHp !== undefined && this.currentHp <= 0;
        if (isDead) {
            ctx.scale(1.0, 0.4);
        }

        const time = isDead ? 0 : (Date.now() - this.startTime) / 1000;

        ctx.save();
        let scaleX = 1 + Math.sin(time * 3 + this.bodyType) * 0.08;
        let scaleYAnim = 1 + Math.cos(time * 3 + this.bodyType) * 0.08;
        ctx.scale(scaleX, scaleYAnim);

        let cfg = this.config;
        if (this.pendulumIndices.includes(this.bodyType)) {
            let swingAngle = Math.sin(time * cfg.pendulumFreq + cfg.phase) * 0.35;
            ctx.rotate(swingAngle);
        } else {
            let t = time * cfg.modSpeed + cfg.phase;
            let rotation = time * cfg.baseSpeed + 0.5 * Math.sin(t);
            ctx.rotate(rotation);
        }

        ctx.fillStyle = this.palette.main;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();

        const type = this.bodyType;
        const r = this.radius;

        switch (type) {
            case 0: ctx.arc(0, 0, r, 0, Math.PI * 2); break;
            case 1:
                for (let i = 0; i < 6; i++) {
                    let a = i * Math.PI / 3;
                    i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
                }
                ctx.closePath(); break;
            case 2:
            case 3:
                {
                    let spikes = 6 + (type === 2 ? 10 : 8);
                    let innerRatio = 0.4 + (type % 3) * 0.1;
                    for (let i = 0; i < spikes; i++) {
                        let a = i * Math.PI / (spikes / 2);
                        let rad = i % 2 === 0 ? r * 1.1 : r * innerRatio;
                        i === 0 ? ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad) : ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
                    }
                    ctx.closePath(); break;
                }
            case 4:
            case 5:
                {
                    let offsetY = r * (0.2 + (type % 5) * 0.1);
                    let radiusScale = 0.8 + (type % 3) * 0.15;
                    ctx.arc(0, offsetY, r * radiusScale, 0, Math.PI);
                    ctx.lineTo(0, -r * (1.0 + (type % 2) * 0.3));
                    ctx.closePath(); break;
                }
            case 6:
            case 7:
                {
                    let thick = r * (0.3 + (type % 3) * 0.1);
                    let len = r * (1.1 + (type % 2) * 0.3);
                    ctx.rect(-thick, -len, thick * 2, len * 2);
                    ctx.rect(-len, -thick, len * 2, thick * 2);
                    break;
                }
            case 8:
                {
                    let skew = 1.2;
                    ctx.moveTo(-r * 0.6, -r * 1.2);
                    ctx.quadraticCurveTo(r * 1.2 * skew, -r * 0.3, r * 0.8, r * 1.2);
                    ctx.lineTo(-r * 0.8, r * 1.2);
                    ctx.quadraticCurveTo(-r * 1.2 * skew, -r * 0.3, -r * 0.6, -r * 1.2);
                    break;
                }
            case 9:
            case 10:
                {
                    let coreSize = r * 0.8;
                    ctx.arc(0, 0, coreSize, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                    let count = 8 + (type % 4) * 2;
                    for (let i = 0; i < count; i++) {
                        let a = i * Math.PI / (count / 2);
                        ctx.beginPath();
                        ctx.moveTo(Math.cos(a) * coreSize, Math.sin(a) * coreSize);
                        ctx.lineTo(Math.cos(a) * r * 1.05, Math.sin(a) * r * 1.05);
                        ctx.stroke();
                    }
                    break;
                }
            case 11:
                {
                    let coreSize = r * 0.55;
                    ctx.arc(0, 0, coreSize, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                    let count = 8 + (type % 4) * 2;
                    for (let i = 0; i < count; i++) {
                        let a = i * Math.PI / (count / 2);
                        ctx.beginPath();
                        ctx.moveTo(Math.cos(a) * coreSize, Math.sin(a) * coreSize);
                        ctx.lineTo(Math.cos(a) * r * 1.2, Math.sin(a) * r * 1.2);
                        ctx.stroke();
                    }
                    break;
                }
            case 12:
                {
                    ctx.arc(0, -r * 0.2, r * 1.0, Math.PI, 0);
                    ctx.lineTo(r * 0.9, r * 0.6);
                    ctx.quadraticCurveTo(0, r * 1.0, -r * 0.9, r * 0.6);
                    ctx.closePath(); break;
                }
            case 13:
                {
                    let vertices = 5 + (type % 4);
                    for (let i = 0; i < vertices; i++) {
                        let a = i * 2 * Math.PI / vertices - Math.PI / 2;
                        i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
                    }
                    ctx.closePath(); break;
                }
            case 14:
                {
                    let wFactor = 1.0 + (type % 3) * 0.2;
                    ctx.moveTo(-r, 0);
                    ctx.bezierCurveTo(-r, -r * 1.5 * wFactor, r * 0.5, -r * 1.5 * wFactor, r, -r * 0.3);
                    ctx.bezierCurveTo(r * 1.5, r, -r * 1.5, r * 1.2 * wFactor, -r, 0);
                    break;
                }
            default:
                ctx.arc(0, 0, r, 0, Math.PI * 2); break;
        }

        if (type !== 9 && type !== 10) {
            ctx.fill();
            ctx.stroke();
        }
        ctx.restore();

        if (isDead) {
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            const size = 3.5;
            [-6, 6].forEach(ex => {
                ctx.beginPath();
                ctx.moveTo(ex - size, -size);
                ctx.lineTo(ex + size, size);
                ctx.moveTo(ex + size, -size);
                ctx.lineTo(ex - size, size);
                ctx.stroke();
            });
        } else {
            const eyeMove = Math.sin(time * 4 + this.eyeType) * 1.0;
            [-6, 6].forEach(ex => {
                ctx.save();
                ctx.translate(ex, -2 + eyeMove);
                ctx.fillStyle = '#FFF';
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 1;
                ctx.beginPath();

                switch (this.eyeType) {
                    case 0:
                        ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(1, 0, 2.5, 0, Math.PI * 2); ctx.fill();
                        break;
                    case 1:
                        ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(1, 0, 1.8, 0, Math.PI * 2); ctx.fill();
                        break;
                    case 2:
                        ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
                        ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(4, 0); ctx.stroke();
                        break;
                    case 3:
                        ctx.rect(-5, -5, 10, 10); ctx.fillStyle = '#FFF'; ctx.fill(); ctx.stroke();
                        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(1, 0, 2, 0, Math.PI * 2); ctx.fill();
                        break;
                    case 4:
                        ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fillStyle = '#FFF'; ctx.fill(); ctx.stroke();
                        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill();
                        break;
                    case 5:
                        ctx.beginPath();
                        ctx.arc(1, 0, 2.2, 0, Math.PI * 2);
                        ctx.fillStyle = '#000000';
                        ctx.fill();
                        ctx.strokeStyle = '#FFFFFF';
                        ctx.lineWidth = 1;
                        ctx.stroke();
                        break;
                    case 6:
                        ctx.arc(0, -1, 5, 0, Math.PI); ctx.fillStyle = '#FFF'; ctx.fill(); ctx.stroke();
                        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(1, -0.5, 2, 0, Math.PI * 2); ctx.fill();
                        break;
                    case 7:
                        ctx.moveTo(0, -5.5); ctx.lineTo(5, 0); ctx.lineTo(0, 5.5); ctx.lineTo(-5, 0); ctx.closePath();
                        ctx.fillStyle = '#FFFDE7'; ctx.fill(); ctx.stroke();
                        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(1, 0, 2, 0, Math.PI * 2); ctx.fill();
                        break;
                    case 8:
                        ctx.ellipse(0, 0, 5, 3.5, 0, 0, Math.PI * 2); ctx.fillStyle = '#FFF'; ctx.fill(); ctx.stroke();
                        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(1, 0, 2, 0, Math.PI * 2); ctx.fill();
                        break;
                    case 9:
                        ctx.arc(0, 0, 4.5, 0, Math.PI * 2); ctx.fillStyle = '#FFF'; ctx.fill(); ctx.stroke();
                        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 1, 2, 0, Math.PI * 2); ctx.fill();
                        ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
                        ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(5, 0); ctx.stroke();
                        break;
                    default:
                        ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(1, 0, 2.5, 0, Math.PI * 2); ctx.fill();
                        break;
                }
                ctx.restore();
            });
        }

        ctx.restore();
    }
}
