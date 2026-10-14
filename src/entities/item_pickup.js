/**
 * entities/item_pickup.js - Oggetti e artefatti rilasciati dai mostri con attrazione magnetica
 */
import { Sprites } from '../core/sprites.js';
import { FX } from '../core/fx.js';
import { MATERIALS_DEF } from '../core/crafting.js';

export class ItemPickup {
  constructor(x, y, itemId = 'slime_gel') {
    this.x = x;
    this.y = y;
    this.itemId = itemId;
    this.def = MATERIALS_DEF[itemId] || { name: 'Artefatto', icon: '📦', color: '#f8fafc' };
    this.r = 8;
    this.dead = false;

    this.timer = Math.random() * Math.PI * 2;
    this.flying = false;
    this.flySpeed = 70;
  }

  update(dt, player, onCollect) {
    if (this.dead) return;

    this.timer += dt * 4.0;

    const dx = player.x - this.x;
    const dy = (player.y - 8) - this.y;
    const dist2 = dx * dx + dy * dy;
    const dist = Math.sqrt(dist2);

    // Raggio magnetico del giocatore
    const magnetRange = (player.magnetRadius || 85) * 1.15;

    if (dist < magnetRange) {
      this.flying = true;
    }

    if (this.flying) {
      this.flySpeed = Math.min(560, this.flySpeed + dt * 700);
      if (dist > 1) {
        this.x += (dx / dist) * this.flySpeed * dt;
        this.y += (dy / dist) * this.flySpeed * dt;
      }

      // Raccolta
      if (dist < player.r + this.r + 4) {
        this.dead = true;
        FX.burst(this.x, this.y, this.def.color, 8, 95);
        FX.addFloatingText(this.x, this.y - 18, `+1 ${this.def.name}`, this.def.color);
        if (onCollect) {
          onCollect(this.itemId);
        }
      }
    }
  }

  draw(ctx) {
    if (this.dead) return;

    const bob = Math.sin(this.timer) * 3.5;

    // Ombra a terra
    Sprites.drawShadow(ctx, this.x, this.y + 4, 5);

    // Icona / Oggetto a terra con bagliore
    ctx.save();
    const drawY = Math.round(this.y + bob - 6);

    // Piccolo alone colorato
    ctx.fillStyle = this.def.color + '33';
    ctx.beginPath();
    ctx.arc(Math.round(this.x), drawY, 11, 0, Math.PI * 2);
    ctx.fill();

    // Icona dell'artefatto
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.def.icon, Math.round(this.x), drawY);
    ctx.restore();
  }
}
