/**
 * systems/combat.js - Sistema di Combattimento Fantasy (Auto-Aim, Proiettili Multipli, Sfera Protettiva, Nemici e Gemme)
 */
import { Projectile } from '../entities/projectile.js';
import { TrainingTarget } from '../entities/target.js';
import { GemPickup } from '../entities/pickup.js';
import { FX } from '../core/fx.js';

export class CombatSystem {
  constructor() {
    this.projectiles = [];
    this.trainingTargets = [];
    this.enemies = [];
    this.pickups = [];

    // Parametri attacco "Dardo Arcano"
    this.baseCooldown = 0.85; // 850ms tra un dardo e l'altro
    this.cooldownTimer = 0;
    this.attackRange = 310;   // Raggio di puntamento automatico in pixel
    this.currentTarget = null;

    // Statistiche potenziabili (Fase C + Meta-Progressione)
    this.projectilesPerShot = 1;
    this.damageMultiplier = 1.0;
    this.hasOrbitOrb = false;
    this.orbitOrbsCount = 0;
    this.orbitAngle = 0;
    this.orbitDamageTimer = 0;

    // Statistiche della spedizione attuale
    this.kills = 0;
    this.goldEarned = 0;

    // Crea 2 manichini da allenamento nel Santuario centrale
    this.setupDemoTargets();
  }

  setupDemoTargets() {
    this.trainingTargets = [
      new TrainingTarget(120, -50, 'Manichino Est', 60),
      new TrainingTarget(-130, 40, 'Manichino Ovest', 60)
    ];
  }

  getAllTargets() {
    return [...this.trainingTargets, ...this.enemies];
  }

  findNearestTarget(player) {
    let nearest = null;
    let minDist2 = this.attackRange * this.attackRange;

    for (const target of this.getAllTargets()) {
      if (target.dead) continue;
      const dx = target.x - player.x;
      const dy = target.y - player.y;
      const d2 = dx * dx + dy * dy;

      if (d2 < minDist2) {
        minDist2 = d2;
        nearest = target;
      }
    }

    return nearest;
  }

  update(dt, player, world, camera) {
    // 1. Cerca il bersaglio più vicino
    this.currentTarget = this.findNearestTarget(player);

    // 2. Cooldown e Lancio Automatico
    if (this.cooldownTimer > 0) {
      this.cooldownTimer -= dt;
    }

    if (this.currentTarget && this.cooldownTimer <= 0) {
      this.fireArcaneDarts(player, this.currentTarget);
      this.cooldownTimer = this.baseCooldown;
    }

    // 3. Aggiorna manichini da addestramento
    for (const t of this.trainingTargets) {
      t.update(dt, world);
    }

    // 4. Aggiorna nemici randagi
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(dt, player, world);

      // Danno da contatto nemico -> giocatore
      if (!e.dead && player.hp > 0) {
        const cdx = e.x - player.x;
        const cdy = e.y - player.y;
        const cdist2 = cdx * cdx + cdy * cdy;
        const touchR = e.r + player.r;
        if (cdist2 < touchR * touchR) {
          player.takeDamage(e.contactDamage || 8);
          camera.kick(0.24);
          FX.burst(player.x, player.y - 8, '#ef4444', 5, 80);
        }
      }

      if (e.dead) {
        // Registra uccisione e oro guadagnato
        this.kills++;
        this.goldEarned += (e.goldValue || 4);

        // Rilascio gemma di Mana/XP
        this.pickups.push(new GemPickup(e.x, e.y, e.xpValue, e.gemType));
        this.enemies.splice(i, 1);
      }
    }

    // 5. Aggiorna gemme di mana (con attrazione magnetica)
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const g = this.pickups[i];
      g.update(dt, player);
      if (g.dead) {
        this.pickups.splice(i, 1);
      }
    }

    // 6. Aggiorna Sfera Protettiva Orbitante (se sbloccata)
    if (this.hasOrbitOrb) {
      this.orbitAngle += dt * 3.8;
      if (this.orbitDamageTimer > 0) {
        this.orbitDamageTimer -= dt;
      }

      const orbRadius = 42;
      const orbX = player.x + Math.cos(this.orbitAngle) * orbRadius;
      const orbY = (player.y - 8) + Math.sin(this.orbitAngle) * orbRadius;

      // Particelle della scia di fuoco
      if (Math.random() < 0.4) {
        FX.burst(orbX, orbY, '#f97316', 1, 30);
      }

      // Danno ai nemici a contatto
      if (this.orbitDamageTimer <= 0) {
        for (const target of this.getAllTargets()) {
          if (target.dead) continue;
          const odx = target.x - orbX;
          const ody = target.y - orbY;
          if (odx * odx + ody * ody < (target.r + 14) * (target.r + 14)) {
            const angle = Math.atan2(ody, odx);
            const dmg = Math.round(14 * this.damageMultiplier);
            target.takeDamage(dmg, angle, 90);
            this.orbitDamageTimer = 0.28;
            camera.kick(0.12);
            break;
          }
        }
      }
    }

    // 7. Aggiorna i proiettili e gestisci le collisioni
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(dt, world);

      if (p.dead) {
        this.projectiles.splice(i, 1);
        continue;
      }

      for (const t of this.getAllTargets()) {
        if (t.dead) continue;

        const dx = t.x - p.x;
        const dy = t.y - p.y;
        const dist2 = dx * dx + dy * dy;
        const hitRadius = p.r + t.r;

        if (dist2 < hitRadius * hitRadius) {
          const angle = Math.atan2(p.vy, p.vx);
          t.takeDamage(p.dmg, angle, 115);
          camera.kick(0.16);

          p.dead = true;
          this.projectiles.splice(i, 1);
          break;
        }
      }
    }

    // 8. Aggiorna particelle e testi fluttuanti
    FX.update(dt);
  }

  fireArcaneDarts(player, target) {
    const dx = target.x - player.x;
    const dy = target.y - (player.y - 12);
    const baseAngle = Math.atan2(dy, dx);

    const baseDmg = 18 + (player.permanentBonusDamage || 0);
    const dmg = Math.round(baseDmg * this.damageMultiplier);
    const count = this.projectilesPerShot;

    // Se spara più proiettili, li distribuisce a ventaglio
    const spreadAngle = 0.22;
    const startAngle = baseAngle - ((count - 1) * spreadAngle) / 2;

    for (let i = 0; i < count; i++) {
      const angle = startAngle + i * spreadAngle;
      const spawnX = player.x + (Math.cos(angle) * 12);
      const spawnY = (player.y - 12) + (Math.sin(angle) * 12);

      this.projectiles.push(new Projectile(spawnX, spawnY, angle, {
        speed: 360,
        dmg: dmg,
        r: 5
      }));

      FX.burst(spawnX, spawnY, '#38bdf8', 3, 60);
    }
  }

  get cooldownProgress() {
    return Math.min(1, Math.max(0, 1 - (this.cooldownTimer / this.baseCooldown)));
  }

  drawProjectiles(ctx) {
    for (const p of this.projectiles) {
      p.draw(ctx);
    }

    // Disegna la Sfera di Fuoco se sbloccata
    if (this.hasOrbitOrb && this.currentTarget) {
      // Disegnata in drawEntitiesAndProps o qui
    }
  }

  drawOrbitOrbs(ctx, player) {
    if (!this.hasOrbitOrb) return;

    const orbRadius = 42;
    const orbX = player.x + Math.cos(this.orbitAngle) * orbRadius;
    const orbY = (player.y - 8) + Math.sin(this.orbitAngle) * orbRadius;

    ctx.save();
    // Alone infuocato
    const grad = ctx.createRadialGradient(orbX, orbY, 2, orbX, orbY, 14);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, '#fbbf24');
    grad.addColorStop(0.8, '#f97316');
    grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(Math.round(orbX), Math.round(orbY), 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawPickups(ctx) {
    for (const p of this.pickups) {
      p.draw(ctx);
    }
  }

  drawFX(ctx) {
    FX.draw(ctx);
  }
}
