/**
 * entities/projectile.js - Proiettili magici (Dardo Arcano) con scia particellare e collisione ambientale
 */
import { FX } from '../core/fx.js';

export class Projectile {
  constructor(x, y, angle, options = {}) {
    this.x = x;
    this.y = y;
    this.speed = options.speed || 340; // pixel al secondo
    this.vx = Math.cos(angle) * this.speed;
    this.vy = Math.sin(angle) * this.speed;
    this.dmg = options.dmg || 18;
    this.r = options.r || 5;           // raggio hitbox
    this.life = options.life || 1.1;   // durata massima in secondi (~370 px di gittata)
    this.t = 0;
    this.dead = false;

    this.trailTimer = 0;
    this.color = options.color || '#38bdf8';
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
      FX.spark(this.x, this.y, '#bae6fd', 2);
    }

    // Collisione con muri o rocce della mappa
    const tx = world.tileOf(this.x);
    const ty = world.tileOf(this.y);
    if (world.isSolid(tx, ty)) {
      this.dead = true;
      FX.burst(this.x, this.y, '#93c5fd', 6, 80);
    }
  }

  draw(ctx) {
    ctx.save();
    // Alone luminoso esterno
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
    ctx.restore();
  }
}
