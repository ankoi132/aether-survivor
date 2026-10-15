/**
 * systems/combat.js - Sistema di Combattimento Fantasy Multiarma (Bastone, Spada, Arco),
 * Drop di Artefatti/Materiali dai mostri e Gestione Collisioni
 */
import { Projectile } from '../entities/projectile.js';
import { TrainingTarget } from '../entities/target.js';
import { GemPickup } from '../entities/pickup.js';
import { ItemPickup } from '../entities/item_pickup.js';
import { SlashEffect } from '../entities/slash_effect.js';
import { FX } from '../core/fx.js';
import { WEAPONS_DEF } from '../core/crafting.js';

export class CombatSystem {
  constructor() {
    this.projectiles = [];
    this.slashes = [];
    this.trainingTargets = [];
    this.enemies = [];
    this.pickups = [];
    this.itemPickups = [];

    // Inventario temporaneo raccolto durante la spedizione
    this.collectedItems = {};

    // Parametri arma equipaggiata
    this.weaponId = 'staff';
    this.weaponLevel = 1;
    this.weaponName = 'Bastone dell\'Arcimago';
    this.baseCooldown = 0.85;
    this.cooldownTimer = 0;
    this.attackRange = 320;
    this.currentTarget = null;

    // Statistiche potenziabili durante la run
    this.projectilesPerShot = 1;
    this.damageMultiplier = 1.0;
    this.hasOrbitOrb = false;
    this.orbitOrbsCount = 0;
    this.orbitAngle = 0;
    this.orbitDamageTimer = 0;

    // Statistiche della spedizione
    this.kills = 0;
    this.goldEarned = 0;

    // Imposta manichini e arma iniziale
    this.setupDemoTargets();
    this.setWeapon('staff', 1);
  }

  setupDemoTargets() {
    this.trainingTargets = [
      new TrainingTarget(120, -50, 'Manichino Est', 60),
      new TrainingTarget(-130, 40, 'Manichino Ovest', 60)
    ];
  }

  /**
   * Configura l'arma equipaggiata e le sue statistiche forgiate
   */
  setWeapon(weaponId = 'staff', level = 1, bonusDamage = 0) {
    const def = WEAPONS_DEF[weaponId] || WEAPONS_DEF.staff;
    this.weaponId = def.id;
    this.weaponLevel = Math.max(1, Math.min(def.maxLevel, level));
    this.weaponName = def.name;

    // Calcola bonus dai livelli di forgiatura
    let totalDmgBonus = 0;
    let cdReduction = 0;
    let extraProj = 0;
    let extraPierce = 0;
    let rangeBonus = 0;
    let knockbackBonus = 0;
    let fullCircle = false;
    let extraArrows = 0;

    if (def.upgrades) {
      for (let lvl = 2; lvl <= this.weaponLevel; lvl++) {
        const u = def.upgrades.find(up => up.level === lvl);
        if (u && u.stats) {
          if (u.stats.damageBonus) totalDmgBonus += u.stats.damageBonus;
          if (u.stats.cooldownReduction) cdReduction += u.stats.cooldownReduction;
          if (u.stats.extraProjectiles) extraProj += u.stats.extraProjectiles;
          if (u.stats.extraPierce) extraPierce += u.stats.extraPierce;
          if (u.stats.rangeBonus) rangeBonus += u.stats.rangeBonus;
          if (u.stats.knockbackBonus) knockbackBonus += u.stats.knockbackBonus;
          if (u.stats.fullCircle) fullCircle = true;
          if (u.stats.extraArrows) extraArrows += u.stats.extraArrows;
        }
      }
    }

    if (this.weaponId === 'sword') {
      this.baseCooldown = Math.max(0.28, def.baseStats.cooldown - cdReduction);
      this.attackRange = def.baseStats.range + rangeBonus;
      this.swordDamage = def.baseStats.damage + totalDmgBonus + bonusDamage;
      this.swordRange = this.attackRange;
      this.swordArc = fullCircle ? Math.PI * 2 : def.baseStats.arcAngle;
      this.swordKnockback = def.baseStats.knockback + knockbackBonus;
    } else if (this.weaponId === 'bow') {
      this.baseCooldown = Math.max(0.35, def.baseStats.cooldown - cdReduction);
      this.attackRange = def.baseStats.range;
      this.bowDamage = def.baseStats.damage + totalDmgBonus + bonusDamage;
      this.bowPierce = def.baseStats.pierce + extraPierce;
      this.bowArrowsCount = 1 + extraArrows;
      this.bowSpeed = def.baseStats.speed;
    } else {
      // staff
      this.baseCooldown = Math.max(0.40, def.baseStats.cooldown - cdReduction);
      this.attackRange = def.baseStats.range;
      this.staffDamage = def.baseStats.damage + totalDmgBonus + bonusDamage;
      this.projectilesPerShot = def.baseStats.projectiles + extraProj;
    }

    this.cooldownTimer = 0;
  }

  getAllTargets() {
    return [...this.trainingTargets, ...this.enemies];
  }

  findNearestTarget(player) {
    let nearest = null;
    let minDist2 = this.attackRange * this.attackRange;

    for (const target of this.getAllTargets()) {
      if (target.dead || target.isDying) continue;
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

  /**
   * Genera la lista di oggetti e artefatti rilasciati da un nemico sconfitto
   */
  rollMonsterDrops(kind) {
    const drops = [];
    const r = Math.random();

    if (kind === 'boss_treant') {
      drops.push('slime_gel', 'slime_gel', 'iron_scrap', 'arcane_rune');
    } else if (kind === 'boss_golem') {
      drops.push('ice_crystal', 'ice_crystal', 'iron_scrap', 'arcane_rune');
    } else if (kind === 'boss_scorpion') {
      drops.push('sun_amber', 'sun_amber', 'iron_scrap', 'arcane_rune');
    } else if (kind === 'boss_magma') {
      drops.push('magma_core', 'magma_core', 'iron_scrap', 'arcane_rune');
    } else if (kind === 'slime_forest') {
      if (r < 0.75) drops.push('slime_gel');
      if (Math.random() < 0.22) drops.push('iron_scrap');
    } else if (kind === 'slime_ice') {
      if (r < 0.70) drops.push('ice_crystal');
      if (Math.random() < 0.20) drops.push('arcane_rune');
    } else if (kind === 'slime_sand') {
      if (r < 0.70) drops.push('sun_amber');
      if (Math.random() < 0.25) drops.push('iron_scrap');
    } else if (kind === 'slime_magma') {
      if (r < 0.65) drops.push('magma_core');
      if (Math.random() < 0.22) drops.push('arcane_rune');
    } else if (kind === 'slime_water') {
      if (r < 0.70) drops.push('slime_gel');
      if (Math.random() < 0.20) drops.push('ice_crystal');
    } else {
      // skeleton
      if (r < 0.75) drops.push('ancient_bone');
      if (Math.random() < 0.40) drops.push('iron_scrap');
    }
    return drops;
  }

  findTargetNearAim(aimWorld, player) {
    if (!aimWorld) return this.findNearestTarget(player);
    let best = null;
    let bestDist2 = 95 * 95;
    for (const target of this.getAllTargets()) {
      if (target.dead || target.isDying) continue;
      const dx = target.x - aimWorld.x;
      const dy = target.y - aimWorld.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestDist2) {
        bestDist2 = d2;
        best = target;
      }
    }
    return best || this.findNearestTarget(player);
  }

  update(dt, player, world, camera, isAttacking = false, aimWorld = null) {
    // 1. Cerca il bersaglio in base alla posizione mirata con il mouse
    this.currentTarget = this.findTargetNearAim(aimWorld, player);

    // 2. Cooldown timer dell'arma
    if (this.cooldownTimer > 0) {
      this.cooldownTimer -= dt;
    }

    // 3. Attacco manuale su CLICK DEL MOUSE o tasto fuoco (MAI più automatico!)
    if (isAttacking && this.cooldownTimer <= 0) {
      let aimAngle = player.facingAngle || 0;
      if (aimWorld) {
        aimAngle = Math.atan2(aimWorld.y - (player.y - 10), aimWorld.x - player.x);
        player.facing = Math.cos(aimAngle) < 0 ? 'left' : 'right';
        player.facingAngle = aimAngle;
      }

      if (this.weaponId === 'sword') {
        this.performSwordCleave(player, aimWorld, camera, aimAngle);
        this.cooldownTimer = this.baseCooldown;
      } else if (this.weaponId === 'bow') {
        this.fireBowArrows(player, aimWorld, aimAngle);
        this.cooldownTimer = this.baseCooldown;
      } else {
        // staff
        this.fireArcaneDarts(player, aimWorld, aimAngle);
        this.cooldownTimer = this.baseCooldown;
      }
    }

    // 4. Aggiorna fendenti visivi
    for (let i = this.slashes.length - 1; i >= 0; i--) {
      const s = this.slashes[i];
      s.update(dt);
      if (s.dead) this.slashes.splice(i, 1);
    }

    // 4. Aggiorna manichini da addestramento
    for (const t of this.trainingTargets) {
      t.update(dt, world);
    }

    // 5. Aggiorna nemici randagi
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(dt, player, world);

      // Danno da contatto nemico -> giocatore (solo se vivo e non morente)
      if (!e.dead && !e.isDying && player.hp > 0) {
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

      // Rilascio di XP e artefatti appena il mostro riceve il colpo di grazia
      if (e.isDying && !e.hasDroppedLoot) {
        e.hasDroppedLoot = true;
        this.kills++;
        this.goldEarned += (e.goldValue || 4);

        if (e.isBoss) {
          camera.kick(0.48);
          FX.burst(e.x, e.y - 12, '#fde047', 32, 180);
          FX.burst(e.x, e.y - 12, e.color || '#ef4444', 26, 140);
          FX.floatingText(e.x, e.y - 40, `👑 ${e.name} Sconfitto!`, '#fde047');
          if (this.onBossKilled) {
            this.onBossKilled(e);
          }
        }

        // 1. Rilascio gemma di Mana/XP
        this.pickups.push(new GemPickup(e.x, e.y, e.xpValue, e.gemType));

        // 2. Rilascio di Oggetti e Artefatti da raccogliere
        const drops = this.rollMonsterDrops(e.kind);
        for (const itemId of drops) {
          const ox = (Math.random() * 26 - 13);
          const oy = (Math.random() * 26 - 13);
          this.itemPickups.push(new ItemPickup(e.x + ox, e.y + oy, itemId));
        }
      }

      // Rimozione definitiva solo quando l'animazione di morte è completata
      if (e.dead) {
        this.enemies.splice(i, 1);
      }
    }

    // 6. Aggiorna gemme di mana
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const g = this.pickups[i];
      g.update(dt, player);
      if (g.dead) {
        this.pickups.splice(i, 1);
      }
    }

    // 7. Aggiorna oggetti e artefatti da raccogliere
    for (let i = this.itemPickups.length - 1; i >= 0; i--) {
      const item = this.itemPickups[i];
      item.update(dt, player, (itemId) => {
        this.collectedItems[itemId] = (this.collectedItems[itemId] || 0) + 1;
      });
      if (item.dead) {
        this.itemPickups.splice(i, 1);
      }
    }

    // 8. Aggiorna Sfera Protettiva Orbitante
    if (this.hasOrbitOrb) {
      this.orbitAngle += dt * 3.8;
      if (this.orbitDamageTimer > 0) {
        this.orbitDamageTimer -= dt;
      }

      const orbRadius = 42;
      const orbX = player.x + Math.cos(this.orbitAngle) * orbRadius;
      const orbY = (player.y - 8) + Math.sin(this.orbitAngle) * orbRadius;

      if (Math.random() < 0.4) {
        FX.burst(orbX, orbY, '#f97316', 1, 30);
      }

      if (this.orbitDamageTimer <= 0) {
        for (const target of this.getAllTargets()) {
          if (target.dead) continue;
          const odx = target.x - orbX;
          const ody = target.y - orbY;
          if (odx * odx + ody * ody < (target.r + 14) * (target.r + 14)) {
            const angle = Math.atan2(ody, odx);
            const dmg = Math.round(14 * this.damageMultiplier);
            target.takeDamage(dmg, angle, 90, 'magic');
            this.orbitDamageTimer = 0.28;
            camera.kick(0.12);
            break;
          }
        }
      }
    }

    // 9. Aggiorna proiettili (Dardi o Frecce) con perforazione
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update(dt, world);

      if (p.dead) {
        this.projectiles.splice(i, 1);
        continue;
      }

      for (const t of this.getAllTargets()) {
        if (t.dead || p.hitTargets.has(t)) continue;

        const dx = t.x - p.x;
        const dy = t.y - p.y;
        const dist2 = dx * dx + dy * dy;
        const hitRadius = p.r + t.r;

        if (dist2 < hitRadius * hitRadius) {
          p.hitTargets.add(t);
          const angle = Math.atan2(p.vy, p.vx);
          const attackType = p.type === 'arrow' ? 'pierce' : 'magic';
          t.takeDamage(p.dmg, angle, p.type === 'arrow' ? 140 : 115, attackType);
          camera.kick(0.15);

          p.pierce--;
          if (p.pierce <= 0) {
            p.dead = true;
            this.projectiles.splice(i, 1);
            break;
          }
        }
      }
    }

    // 10. Aggiorna particelle ed effetti
    FX.update(dt);
  }

  /**
   * Attacco Spada: fendente ravvicinato ad area orientato verso il cursore del mouse
   */
  performSwordCleave(player, aimWorld, camera, aimAngle = null) {
    let angle = aimAngle;
    if (angle === null || angle === undefined) {
      if (aimWorld) {
        angle = Math.atan2(aimWorld.y - player.y, aimWorld.x - player.x);
      } else {
        angle = player.moveAngle || (Math.PI / 2);
      }
    }

    const range = this.swordRange || 96;
    const arc = this.swordArc || (Math.PI * 0.95);
    const dmg = Math.round(this.swordDamage * this.damageMultiplier);
    const knockback = this.swordKnockback || 200;

    // Genera l'effetto grafico dell'arco di taglio
    this.slashes.push(new SlashEffect(player.x, player.y - 6, angle, range, arc));
    camera.kick(0.18);

    // Applica danno e forte knockback a tutti i nemici nell'arco di taglio
    for (const t of this.getAllTargets()) {
      if (t.dead || t.isDying) continue;
      const dx = t.x - player.x;
      const dy = t.y - (player.y - 6);
      const dist = Math.hypot(dx, dy);

      if (dist <= range + t.r) {
        const enemyAngle = Math.atan2(dy, dx);
        let diff = Math.abs(enemyAngle - angle);
        while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);

        if (arc >= Math.PI * 1.9 || diff <= arc / 2 + 0.20) {
          t.takeDamage(dmg, enemyAngle, knockback, 'slash');
          FX.burst(t.x, t.y - 8, '#f8fafc', 5, 120);
          FX.spark(t.x, t.y - 8, '#fde047', 4);
        }
      }
    }
  }

  /**
   * Attacco Arco: frecce rapide e perforanti verso il cursore del mouse
   */
  fireBowArrows(player, aimWorld, aimAngle = null) {
    let baseAngle = aimAngle;
    if (baseAngle === null || baseAngle === undefined) {
      if (aimWorld) {
        baseAngle = Math.atan2(aimWorld.y - (player.y - 12), aimWorld.x - player.x);
      } else {
        baseAngle = player.facingAngle || 0;
      }
    }

    const dmg = Math.round(this.bowDamage * this.damageMultiplier);
    const count = this.bowArrowsCount || 1;
    const spreadAngle = 0.14;
    const startAngle = baseAngle - ((count - 1) * spreadAngle) / 2;

    for (let i = 0; i < count; i++) {
      const angle = startAngle + i * spreadAngle;
      const spawnX = player.x + (Math.cos(angle) * 12);
      const spawnY = (player.y - 12) + (Math.sin(angle) * 12);

      this.projectiles.push(
        new Projectile(spawnX, spawnY, angle, {
          type: 'arrow',
          dmg,
          speed: this.bowSpeed || 560,
          pierce: this.bowPierce || 2
        })
      );
    }
    FX.spark(player.x, player.y - 12, '#fef08a', 5);
  }

  /**
   * Attacco Bastone: dardi arcani a ventaglio verso il cursore del mouse
   */
  fireArcaneDarts(player, aimWorld, aimAngle = null) {
    let baseAngle = aimAngle;
    if (baseAngle === null || baseAngle === undefined) {
      if (aimWorld) {
        baseAngle = Math.atan2(aimWorld.y - (player.y - 12), aimWorld.x - player.x);
      } else {
        baseAngle = player.facingAngle || 0;
      }
    }

    const baseDmg = (this.staffDamage || 18) + (player.permanentBonusDamage || 0);
    const dmg = Math.round(baseDmg * this.damageMultiplier);
    const count = this.projectilesPerShot;

    const spreadAngle = 0.20;
    const startAngle = baseAngle - ((count - 1) * spreadAngle) / 2;

    for (let i = 0; i < count; i++) {
      const angle = startAngle + i * spreadAngle;
      const spawnX = player.x + (Math.cos(angle) * 14);
      const spawnY = (player.y - 12) + (Math.sin(angle) * 14);

      this.projectiles.push(
        new Projectile(spawnX, spawnY, angle, {
          type: 'dart',
          speed: 400,
          dmg: dmg,
          r: 5
        })
      );

      FX.burst(spawnX, spawnY, '#38bdf8', 3, 70);
    }
  }

  get cooldownProgress() {
    return Math.min(1, Math.max(0, 1 - (this.cooldownTimer / this.baseCooldown)));
  }

  drawProjectiles(ctx) {
    for (const p of this.projectiles) {
      p.draw(ctx);
    }
    for (const s of this.slashes) {
      s.draw(ctx);
    }
  }

  drawOrbitOrbs(ctx, player) {
    if (!this.hasOrbitOrb) return;

    const orbRadius = 42;
    const orbX = player.x + Math.cos(this.orbitAngle) * orbRadius;
    const orbY = (player.y - 8) + Math.sin(this.orbitAngle) * orbRadius;

    ctx.save();
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
    for (const it of this.itemPickups) {
      it.draw(ctx);
    }
  }

  drawFX(ctx) {
    FX.draw(ctx);
  }
}
