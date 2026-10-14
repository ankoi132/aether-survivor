/**
 * entities/projectile.js - Proiettili magici (Dardo Arcano) e Frecce Perforanti con scia particellare e collisione ambientale
 */
import { FX } from '../core/fx.js';

export class Projectile {
  constructor(x, y, angle, options = {}) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.type = options.type || 'dart'; // 'dart' | 'arrow'
    this.speed = options.speed || (this.type === 'arrow' ? 520 : 340);
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
    this.dmg = options.dmg || 18;
    this.r = options.r || (this.type === 'arrow' ? 6 : 5);
    this.pierce = options.pierce || (this.type === 'arrow' ? 2 : 1);
    this.life = options.life || (this.type === 'arrow' ? 1.0 : 1.1);
    this.t = 0;
    this.dead = false;
    this.hitTargets = new Set();

    this.trailTimer = 0;
    this.color = options.color || (this.type === 'arrow' ? '#f59e0b' : '#38bdf8');
    this.coreColor = '#ffffff';
  }

  update(dt, world) {
    this.t += dt;
    if (this.t >= this.life) {
      this.dead = true;
      return;
    }

    // Movimento lineare
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Generazione scia luminosa
    this.trailTimer += dt;
    if (this.trailTimer >= 0.04) {
      this.trailTimer = 0;
      if (this.type === 'arrow') {
        FX.spark(this.x, this.y, '#fef08a', 1.5);
      } else {
        FX.spark(this.x, this.y, '#bae6fd', 2);
      }
    }

    // Collisione con muri o scogliere della mappa
    const tx = world.tileOf(this.x);
    const ty = world.tileOf(this.y);
    if (world.isSolid(tx, ty)) {
      this.dead = true;
      FX.burst(this.x, this.y, this.type === 'arrow' ? '#d97706' : '#93c5fd', 6, 80);
    }
  }

  draw(ctx) {
    ctx.save();

    if (this.type === 'arrow') {
      // Render freccia orientata lungo l'angolo di volo
      ctx.translate(Math.round(this.x), Math.round(this.y));
      ctx.rotate(this.angle);

      // Scia aerodinamica
      ctx.fillStyle = 'rgba(254, 240, 138, 0.3)';
      ctx.fillRect(-16, -2, 12, 4);

      // Asta in legno
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-12, -2, 22, 4);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(-11, -1, 20, 2);

      // Punta di metallo argentato
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(8, -3, 5, 6);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(9, -2, 4, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(10, -1, 3, 2);

      // Piume dell'impennaggio
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-12, -4, 4, 2);
      ctx.fillRect(-12, 2, 4, 2);
      ctx.fillStyle = '#bae6fd';
      ctx.fillRect(-10, -3, 2, 1);
      ctx.fillRect(-10, 2, 2, 1);
    } else {
      // Dardo Arcano con alone luminoso esterno
      ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.beginPath();
      ctx.arc(Math.round(this.x), Math.round(this.y), this.r * 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Dardo di mana brillante
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(Math.round(this.x), Math.round(this.y), this.r, 0, Math.PI * 2);
      ctx.fill();

      // Nucleo candido
      ctx.fillStyle = this.coreColor;
      ctx.beginPath();
      ctx.arc(Math.round(this.x), Math.round(this.y), this.r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
