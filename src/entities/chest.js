/**
 * entities/chest.js - Forzieri del Tesoro Ancestrali per i Punti d'Interesse e Boss Arenas
 */
import { Tiles } from '../world/tiles.js';
import { Sprites } from '../core/sprites.js';
import { GemPickup } from './pickup.js';
import { ItemPickup } from './item_pickup.js';
import { FX } from '../core/fx.js';

export class Chest {
  constructor(x, y, poiDef) {
    this.x = x;
    this.y = y;
    this.poi = poiDef;
    this.id = poiDef.chestId;
    this.name = poiDef.chestName;
    this.isLocked = true;
    this.isOpen = false;
    this.loot = poiDef.loot || { gold: 200, xp: 150, items: { iron_scrap: 2 } };
    this.r = 18;
    this.pulseTimer = 0;
  }

  unlock() {
    if (!this.isLocked) return;
    this.isLocked = false;
    FX.burst(this.x, this.y - 10, '#fde047', 18, 120);
    FX.floatingText(this.x, this.y - 28, '🔓 Forziere Sbloccato!', '#fde047');
  }

  open(combat, player) {
    if (this.isOpen || this.isLocked) return false;
    this.isOpen = true;

    // 1. Assegna oro
    combat.goldEarned += (this.loot.gold || 150);

    // 2. Rilascia gemma di XP gigante
    combat.pickups.push(new GemPickup(this.x, this.y + 4, this.loot.xp || 180, 'emerald'));

    // 3. Rilascia i materiali rari a raggiera
    if (this.loot.items) {
      let angle = 0;
      const count = Object.keys(this.loot.items).length;
      const step = (Math.PI * 2) / Math.max(1, count);
      for (const [matId, amt] of Object.entries(this.loot.items)) {
        for (let i = 0; i < amt; i++) {
          const dist = 24 + (i * 8);
          const ox = Math.cos(angle) * dist;
          const oy = Math.sin(angle) * dist;
          combat.itemPickups.push(new ItemPickup(this.x + ox, this.y + oy, matId));
        }
        angle += step;
      }
    }

    // 4. Effetti visivi gloriosi
    FX.burst(this.x, this.y - 8, '#f59e0b', 25, 140);
    FX.burst(this.x, this.y - 8, '#38bdf8', 16, 100);
    FX.floatingText(this.x, this.y - 32, `+${this.loot.gold} 🪙`, '#fde047');
    return true;
  }

  update(dt, player) {
    this.pulseTimer += dt;
  }

  draw(ctx) {
    // 1. Ombra a terra
    Sprites.drawShadow(ctx, this.x, this.y + 2, 14);

    // 2. Bagliore se pronto all'apertura
    if (!this.isLocked && !this.isOpen) {
      const pulse = 0.5 + Math.sin(this.pulseTimer * 4) * 0.3;
      const glow = ctx.createRadialGradient(this.x, this.y - 6, 4, this.x, this.y - 6, 32);
      glow.addColorStop(0, `rgba(250, 204, 21, ${0.4 * pulse})`);
      glow.addColorStop(1, 'rgba(250, 204, 21, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(this.x, this.y - 6, 32, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Sprite forziere
    const spriteType = this.isOpen ? 'chest_open' : 'chest_closed';
    const sprite = Tiles.getPropSprite(spriteType);
    if (sprite) {
      const sw = sprite.width * 2;
      const sh = sprite.height * 2;
      ctx.drawImage(sprite, Math.round(this.x - sw / 2), Math.round(this.y - sh + 8), sw, sh);
    }

    // 4. Cartiglio indicatore sopra il forziere
    ctx.save();
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';

    if (this.isOpen) {
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('✓ Forziere Riscattato', Math.round(this.x), Math.round(this.y - 24));
    } else if (this.isLocked) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.fillRect(Math.round(this.x - 48), Math.round(this.y - 34), 96, 14);
      ctx.fillStyle = '#ef4444';
      ctx.fillText(`🔒 ${this.poi.title}`, Math.round(this.x), Math.round(this.y - 23));
    } else {
      // Sbloccato!
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(Math.round(this.x - 44), Math.round(this.y - 36), 88, 16);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.strokeRect(Math.round(this.x - 44), Math.round(this.y - 36), 88, 16);
      ctx.fillStyle = '#fde047';
      ctx.fillText('⭐ [E] Apri Forziere', Math.round(this.x), Math.round(this.y - 24));
    }
    ctx.restore();
  }
}
