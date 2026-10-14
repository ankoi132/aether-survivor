/**
 * entities/pickup.js - Gemme di Mana ed Esperienza fluttuanti con attrazione magnetica
 */
import { Sprites } from '../core/sprites.js';
import { FX } from '../core/fx.js';

export class GemPickup {
  constructor(x, y, xpValue = 10, type = 'cyan') {
    this.x = x;
    this.y = y;
    this.xpValue = xpValue;
    this.type = type; // 'cyan' (10 XP) o 'emerald' (25 XP)
    this.r = 6;
    this.dead = false;

    this.timer = Math.random() * Math.PI * 2;
    this.flying = false;
    this.flySpeed = 60;
  }

  update(dt, player) {
    if (this.dead) return;

    this.timer += dt * 3.5;

    // Distanza dal giocatore
    const dx = player.x - this.x;
    const dy = (player.y - 8) - this.y;
    const dist2 = dx * dx + dy * dy;
    const dist = Math.sqrt(dist2);

    // Raggio magnetico del giocatore (base 85px, aumentabile coi potenziamenti)
    const magnetRange = player.magnetRadius || 85;

    if (dist < magnetRange) {
      this.flying = true;
    }

    if (this.flying) {
      // Accelera dolcemente verso il giocatore
      this.flySpeed = Math.min(520, this.flySpeed + dt * 650);
      if (dist > 1) {
        this.x += (dx / dist) * this.flySpeed * dt;
        this.y += (dy / dist) * this.flySpeed * dt;
      }

      // Raggiunto il giocatore: raccolta!
      if (dist < player.r + this.r + 4) {
        this.dead = true;
        const color = this.type === 'emerald' ? '#34d399' : '#38bdf8';
        FX.burst(this.x, this.y, color, 5, 70);
        player.gainXp(this.xpValue);
      }
    }
  }

  draw(ctx) {
    if (this.dead) return;

    const bob = Math.sin(this.timer) * 3;

    // Ombra a terra
    Sprites.drawShadow(ctx, this.x, this.y + 4, 4);

    // Gemma fluttuante
    const sprite = Sprites.getGemSprite(this.type, 0);
    const sw = sprite.width;
    const sh = sprite.height;

    ctx.drawImage(
      sprite,
      Math.round(this.x - sw / 2),
      Math.round(this.y - sh / 2 + bob)
    );
  }
}
