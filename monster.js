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

        // 体のインデックスを 0 から順番に通し番号で定義 (全15種類)
        const bodyIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
        
        // 振りなおしたインデックスに合わせて振り子運動するパーツを指定 (例: 旧 9,38,13,59 → 新 4,5,8,12)
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

        // 目のインデックスを 0 から順番に通し番号で定義 (全10種類)
        const eyeIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

        const s = savedData || {};
        this.bodyType = s.bodyType !== undefined ? s.bodyType : bodyIndices[Math.floor(Math.random() * bodyIndices.length)];
        this.paletteIndex = s.paletteIndex !== undefined ? s.paletteIndex : Math.floor(Math.random() * palettes.length);
        this.palette = palettes[this.paletteIndex];
        
        // 付属パーツ（すべての装飾パーツを非表示に設定）[cite: 10]
        this.hasHorn = false;
        this.hasWing = false;
        this.hasTail = false;
        
        // 目タイプを全パターンから選択
        this.eyeType = s.eyeType !== undefined ? s.eyeType : eyeIndices[Math.floor(Math.random() * eyeIndices.length)];

        if (tileValue !== null) {
            this.radius = Math.min(10 + tileValue * 1.5, 20);
        }

        const ratio = Math.random();
        const atkBase = Math.floor(initialScore * ratio);
        this.attack = Math.max(1, atkBase);
        this.hp = Math.max(1, initialScore - this.attack);
        
        this.startTime = Date.now();
    }

    update() {
        // 更新処理
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // 体の上下浮遊表現は停止済み[cite: 10]

        const isDead = this.currentHp !== undefined && this.currentHp <= 0;
        if (isDead) {
            ctx.scale(1.0, 0.4);
        }

        const time = (Date.now() - this.startTime) / 1000;

        // --- 体の描画と回転アニメーション ---
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
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        
        const type = this.bodyType;
        const r = this.radius;

        // 新しい通し番号（0〜14）に基づくボディ形状の分岐
        switch(type) {
            case 0: ctx.arc(0, 0, r, 0, Math.PI * 2); break; // 旧0
            case 1:  // 旧5
                for(let i = 0; i < 6; i++) {
                    let a = i * Math.PI / 3;
                    i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
                }
                ctx.closePath(); break;
            case 2:  // 旧8
            case 3:  // 旧34
            {
                let spikes = 6 + (type === 2 ? 10 : 8);
                let innerRatio = 0.4 + (type % 3) * 0.1;
                for(let i = 0; i < spikes; i++) {
                    let a = i * Math.PI / (spikes / 2);
                    let rad = i % 2 === 0 ? r * 1.1 : r * innerRatio;
                    i === 0 ? ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad) : ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
                }
                ctx.closePath(); break;
            }
            case 4:  // 旧9
            case 5:  // 旧38
            {
                let offsetY = r * (0.2 + (type % 5) * 0.1);
                let radiusScale = 0.8 + (type % 3) * 0.15;
                ctx.arc(0, offsetY, r * radiusScale, 0, Math.PI); 
                ctx.lineTo(0, -r * (1.0 + (type % 2) * 0.3)); 
                ctx.closePath(); break;
            }
            case 6:  // 旧12
            case 7:  // 旧44
            { 
                let thick = r * (0.3 + (type % 3) * 0.1);
                let len = r * (1.1 + (type % 2) * 0.3);
                ctx.rect(-thick, -len, thick * 2, len * 2); 
                ctx.rect(-len, -thick, len * 2, thick * 2); 
                break;
            }
            case 8:  // 旧13
            { 
                let skew = 1.2;
                ctx.moveTo(-r * 0.6, -r * 1.2); 
                ctx.quadraticCurveTo(r * 1.2 * skew, -r * 0.3, r * 0.8, r * 1.2); 
                ctx.lineTo(-r * 0.8, r * 1.2); 
                ctx.quadraticCurveTo(-r * 1.2 * skew, -r * 0.3, -r * 0.6, -r * 1.2); 
                break;
            }
            case 9:  // 旧17
            case 10: // 旧55
            { 
                let coreSize = r * 0.8; 
                ctx.arc(0, 0, coreSize, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                let count = 8 + (type % 4) * 2;
                for(let i = 0; i < count; i++) {
                    let a = i * Math.PI / (count / 2);
                    ctx.beginPath();
                    ctx.moveTo(Math.cos(a) * coreSize, Math.sin(a) * coreSize);
                    ctx.lineTo(Math.cos(a) * r * 1.05, Math.sin(a) * r * 1.05);
                    ctx.stroke();
                }
                break;
            }
            case 11: // 旧117
            { 
                let coreSize = r * 0.55; 
                ctx.arc(0, 0, coreSize, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                let count = 8 + (type % 4) * 2;
                for(let i = 0; i < count; i++) {
                    let a = i * Math.PI / (count / 2);
                    ctx.beginPath();
                    ctx.moveTo(Math.cos(a) * coreSize, Math.sin(a) * coreSize);
                    ctx.lineTo(Math.cos(a) * r * 1.2, Math.sin(a) * r * 1.2); 
                    ctx.stroke();
                }
                break;
            }
            case 12: // 旧59
            {
                ctx.arc(0, -r * 0.2, r * 1.0, Math.PI, 0); 
                ctx.lineTo(r * 0.9, r * 0.6); 
                ctx.quadraticCurveTo(0, r * 1.0, -r * 0.9, r * 0.6); 
                ctx.closePath(); break;
            }
            case 13: // 旧23
            { 
                let vertices = 5 + (type % 4);
                for(let i = 0; i < vertices; i++) {
                    let a = i * 2 * Math.PI / vertices - Math.PI / 2;
                    i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
                }
                ctx.closePath(); break;
            }
            case 14: // 旧70
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
            const eyeMove = Math.sin(time * 4 + this.eyeType) * 1.5;
            [-6, 6].forEach(ex => {
                ctx.save(); 
                ctx.translate(ex, -2 + eyeMove);
                ctx.fillStyle = '#FFF'; 
                ctx.strokeStyle = '#000'; 
                ctx.lineWidth = 1;
                ctx.beginPath();
                
                // 新しい通し番号（0〜9）に基づく目の形状の分岐
                switch(this.eyeType) {
                    case 0: // 旧0
                        ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); 
                        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(1.5, 0, 2.5, 0, Math.PI * 2); ctx.fill(); 
                        break;
                    case 1: // 旧11
                        ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); 
                        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(1.5, 0, 1.5, 0, Math.PI * 2); ctx.fill(); 
                        break;
                    case 2: // 旧310
                        ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); 
                        ctx.beginPath(); ctx.arc(1.2, 0, 1.5, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill(); 
                        break;
                    case 3: // 旧409
                        ctx.rect(-5, -5, 10, 10); ctx.fillStyle = '#FFF'; ctx.fill(); ctx.stroke();
                        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(1.5, 0, 2, 0, Math.PI * 2); ctx.fill(); 
                        break;
                    case 4: // 旧508
                        ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fillStyle = '#FFF'; ctx.fill(); ctx.stroke();
                        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(1.5, 0, 2, 0, Math.PI * 2); ctx.fill();
                        ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(0, -7); ctx.moveTo(0, 5); ctx.lineTo(0, 7); ctx.stroke(); 
                        break;
                    case 5: // 旧511
                        ctx.beginPath(); 
                        ctx.arc(1.5, 0, 2.2, 0, Math.PI * 2); 
                        ctx.fillStyle = '#000000'; 
                        ctx.fill(); 
                        ctx.strokeStyle = '#FFFFFF'; 
                        ctx.lineWidth = 1.2; 
                        ctx.stroke();
                        break;
                    case 6: // 旧602
                        ctx.arc(0, -2, 5, 0, Math.PI); ctx.fillStyle = '#FFF'; ctx.fill(); ctx.stroke();
                        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(1.5, -1, 1.8, 0, Math.PI * 2); ctx.fill(); 
                        break;
                    case 7: // 旧603
                        ctx.moveTo(0, -6); ctx.lineTo(5.5, 0); ctx.lineTo(0, 6); ctx.lineTo(-5.5, 0); ctx.closePath();
                        ctx.fillStyle = '#FFFDE7'; ctx.fill(); ctx.stroke();
                        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(1.5, 0, 2, 0, Math.PI * 2); ctx.fill(); 
                        break;
                    case 8: // 旧700
                        ctx.ellipse(0, 0, 5, 4, 0, 0, Math.PI * 2); ctx.fillStyle = '#FFF'; ctx.fill(); ctx.stroke();
                        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(1.5, 0, 2, 0, Math.PI * 2); ctx.fill(); 
                        break;
                    case 9: // 旧710
                        ctx.arc(0, 0, 4.5, 0, Math.PI * 2); ctx.fillStyle = '#FFF'; ctx.fill(); ctx.stroke();
                        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(1.5, 0.5, 1.8, 0, Math.PI * 2); ctx.fill();
                        ctx.strokeStyle = '#000'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-4, -4); ctx.lineTo(4, -1); ctx.stroke(); 
                        break;
                    default:
                        ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); 
                        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(1.5, 0, 2.5, 0, Math.PI * 2); ctx.fill();
                        break;
                }
                ctx.restore();
            });
        }

        ctx.restore();

        // --- ATKテキストの描画 ---
        ctx.save();
        ctx.font = '8px Arial';
        ctx.fillStyle = '#FFF';
        ctx.textAlign = 'center';
        const textY = this.y - this.radius - 6;
        ctx.fillText(`ATK:${this.attack.toLocaleString()}`, this.x, textY);
        ctx.restore();
    }
}
