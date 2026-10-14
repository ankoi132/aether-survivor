/**
 * entities/target.js - Bersagli di prova (Manichini da addestramento e Slime di prova)
 * Dotati di HP, barra vitale fluttuante, flash bianco all'impatto, flinch elastico e knockback fisico.
 */
import { Sprites } from '../core/sprites.js';
import { FX } from '../core/fx.js';

export class TrainingTarget {
  constructor(x, y, name = 'Fantoccio da Guerra', maxHp = 60) {
    this.startX = x;
    this.startY = y;
    this.x = x;
    this.y = y;
    this.name = name;
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.r = 13; // Raggio hitbox

    this.vx = 0;
    this.vy = 0;
    this.flash = 0;
    this.squashTimer = 0;
    this.dead = false;
    this.respawnTimer = 0;
  }

  takeDamage(amount, knockAngle = 0, knockForce = 120, attackType = 'magic') {
    if (this.dead) return;

    this.hp = Math.max(0, this.hp - amount);
    this.flash = 0.12; // 120ms di flash bianco all'impatto
    this.squashTimer = 0.15; // flinch elastico

    // Applicazione del contraccolpo (knockback)
    this.vx = Math.cos(knockAngle) * knockForce;
    this.vy = Math.sin(knockAngle) * knockForce;

    // Effetti visivi differenziati per tipo di colpo subito
    if (attackType === 'slash') {
      FX.addSlashCut(this.x, this.y - 8, knockAngle, 32);
      FX.addShockwave(this.x, this.y - 8, 18, '#ffffff', 0.15);
      FX.addDamageNumber(this.x, this.y - 20, amount, true);
    } else if (attackType === 'pierce') {
      FX.burst(this.x, this.y - 8, '#fef08a', 5, 105);
      FX.addShockwave(this.x, this.y - 8, 14, '#f59e0b', 0.14);
      FX.addDamageNumber(this.x, this.y - 20, amount, false);
    } else {
      FX.burst(this.x, this.y - 8, '#38bdf8', 6, 85);
      FX.addDamageNumber(this.x, this.y - 20, amount, false);
    }

    if (this.hp <= 0) {
      this.dead = true;
      this.respawnTimer = 2.4; // Respawna dopo 2.4s per continuare l'addestramento
      FX.addShockwave(this.x, this.y - 6, 28, '#b45309', 0.22);
      FX.addBones(this.x, this.y - 6, 5); // schegge e supporti di legno
      FX.addSmokePuff(this.x, this.y - 10, '#78716c');
      FX.burst(this.x, this.y - 10, '#f59e0b', 14, 140);
    }
  }

  update(dt, world) {
    // Gestione rigenerazione dopo la sconfitta
    if (this.dead) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.dead = false;
        this.hp = this.maxHp;
        this.x = this.startX;
        this.y = this.startY;
        this.vx = 0;
        this.vy = 0;
        this.squashTimer = 0;
        this.flash = 0;
        FX.addShockwave(this.x, this.y - 6, 20, '#22c55e', 0.18);
        FX.burst(this.x, this.y - 10, '#22c55e', 12, 100);
      }
      return;
    }

    if (this.flash > 0) this.flash -= dt;
    if (this.squashTimer > 0) this.squashTimer -= dt;

    // Attrito sul knockback
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= Math.exp(-9.0 * dt);
    this.vy *= Math.exp(-9.0 * dt);

    // Collisione con i muri
    world.collide(this);
  }

  draw(ctx) {
    if (this.dead) return;

    // 1. Ombra a terra
    Sprites.drawShadow(ctx, this.x, this.y + 2, 11);

    const P = Sprites.PX;
    const cx = Math.round(this.x);
    const cy = Math.round(this.y);

    ctx.save();

    // Flinch elastico (squash & stretch) al colpo
    if (this.squashTimer > 0) {
      const progress = this.squashTimer / 0.15;
      const scaleX = 1 + Math.sin(progress * Math.PI) * 0.24;
      const scaleY = 1 - Math.sin(progress * Math.PI) * 0.18;
      ctx.translate(cx, cy);
      ctx.scale(scaleX, scaleY);
      ctx.translate(-cx, -cy);
    }

    // 2. Disegno Pixel-Art del Manichino da Addestramento
    // Palo di supporto in legno
    ctx.fillStyle = '#451a03';
    ctx.fillRect(cx - 2 * P, cy - 10 * P, 4 * P, 10 * P);

    // Corpo di paglia imbottito
    ctx.fillStyle = this.flash > 0 ? '#ffffff' : '#ca8a04';
    ctx.fillRect(cx - 5 * P, cy - 14 * P, 10 * P, 8 * P);

    // Cinghie di cuoio e bersaglio rosso centrale
    if (this.flash <= 0) {
      ctx.fillStyle = '#78350f';
      ctx.fillRect(cx - 5 * P, cy - 12 * P, 10 * P, 2 * P);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(cx - 2 * P, cy - 11 * P, 4 * P, 4 * P);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - 1 * P, cy - 10 * P, 2 * P, 2 * P);
    }

    // Testa / Elmo di ferro da allenamento
    ctx.fillStyle = this.flash > 0 ? '#ffffff' : '#64748b';
    ctx.fillRect(cx - 4 * P, cy - 18 * P, 8 * P, 5 * P);
    ctx.fillStyle = '#334155';
    ctx.fillRect(cx - 3 * P, cy - 16 * P, 6 * P, 1.5 * P);

    // 3. Barra della salute fluttuante sopra la testa
    const barW = 28;
    const barH = 4;
    const barX = Math.round(this.x - barW / 2);
    const barY = Math.round(this.y - 24 * P);

    // Sfondo barra scuro
    ctx.fillStyle = 'rgba(8, 10, 16, 0.75)';
    ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

    // Barra vitale proporzionale (verde -> rosso)
    const hpRatio = this.hp / this.maxHp;
    ctx.fillStyle = hpRatio > 0.5 ? '#22c55e' : (hpRatio > 0.25 ? '#eab308' : '#ef4444');
    ctx.fillRect(barX, barY, Math.round(barW * hpRatio), barH);

    ctx.restore();
  }
}
