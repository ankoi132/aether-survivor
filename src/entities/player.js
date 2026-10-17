/**
 * entities/player.js - Il protagonista fantasy giocabile (Mago Arcano)
 */
import { Sprites } from '../core/sprites.js';
import { FX } from '../core/fx.js';

export class Player {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
    this.r = 14;              // Raggio hitbox di collisione (28px di diametro, tile da 32px)
    this.baseSpd = 105;       // Velocità base: 105 pixel al secondo
    this.hp = 100;
    this.maxHp = 100;
    this.magnetRadius = 85;   // Raggio di attrazione magnetica per gemme di mana
    this.permanentBonusDamage = 0;
    this.defense = 0;
    this.damageReductionPercent = 0;
    this.critChance = 0;
    this.critDamage = 50;
    this.hpRegen = 0;
    this.lifeSteal = 0;
    this.dodgeChance = 0;
    this.cooldownReduction = 0;
    this.ignoreWaterSlow = false;
    this.invulnerableTimer = 0;

    // Orientamento e animazione
    this.dir = 0;             // 0: Giù, 1: Giù-Destra, 2: Destra, etc.
    this.moveAngle = Math.PI / 2; // Angolo iniziale (verso il basso)
    this.walking = false;
    this.inLiquid = false;

    this.animTimer = 0;
    this.frame = 0;
    this.weapon = 'staff'; // 'staff' | 'sword' | 'bow'
  }

  applyPermanentStats(stats = {}) {
    this.maxHp = 100 + (stats.bonusHp || 0);
    this.hp = Math.min(this.hp, this.maxHp);
    if (this.hp <= 0) this.hp = this.maxHp;
    this.baseSpd = Math.round(105 * (stats.speedMultiplier || 1.0));
    this.magnetRadius = Math.round(85 * (stats.magnetMultiplier || 1.0));
    this.permanentBonusDamage = stats.bonusDamage || 0;
    this.defense = stats.defense || 0;
    this.damageReductionPercent = stats.damageReductionPercent || 0;
    this.critChance = stats.critChance || 0;
    this.critDamage = stats.critDamage || 50;
    this.hpRegen = stats.hpRegen || 0;
    this.lifeSteal = stats.lifeSteal || 0;
    this.dodgeChance = stats.dodgeChance || 0;
    this.cooldownReduction = stats.cooldownReduction || 0;
    this.ignoreWaterSlow = !!stats.ignoreWaterSlow;
  }

  takeDamage(amount) {
    if (this.invulnerableTimer > 0 || this.hp <= 0) return;

    // 1. Controllo Schivata (Dodge Chance)
    if (this.dodgeChance > 0 && Math.random() * 100 < this.dodgeChance) {
      this.invulnerableTimer = 0.35;
      FX.addFloatingText(this.x, this.y - 24, 'SCHIVATA! 💨', '#38bdf8');
      FX.spark(this.x, this.y - 8, '#7dd3fc', 4);
      return;
    }

    // 2. Riduzione del danno tramite Difesa / Armatura (Diablo Formula)
    const reduction = this.defense > 0 ? (this.defense / (this.defense + 100)) : 0;
    const finalDmg = Math.max(1, Math.round(amount * (1 - reduction)));

    this.hp = Math.max(0, this.hp - finalDmg);
    this.invulnerableTimer = 0.6; // 600ms invulnerabilità
    FX.addFloatingText(this.x, this.y - 18, `-${finalDmg}`, '#ef4444');

    if (this.hp <= 0 && this.onDeath) {
      this.onDeath();
    }
  }

  get currentSpeed() {
    let s = this.baseSpd;
    // Se immerso in acqua profonda, rallenta solo se non ha stivali anfibi
    if (this.inLiquid && !this.ignoreWaterSlow) {
      s *= 0.6;
    }
    return s;
  }

  update(dt, input, world) {
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
    }

    // Rigenerazione passiva della salute da equipaggiamento
    if (this.hpRegen > 0 && this.hp > 0 && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + this.hpRegen * dt);
    }

    const [ax, ay] = input.axis();
    this.walking = ax !== 0 || ay !== 0;

    if (this.walking) {
      this.moveAngle = Math.atan2(ay, ax);
      this.dir = Sprites.dirFromAngle(this.moveAngle);

      // Movimento fluido integrato con delta time
      let spd = this.currentSpeed;
      if (world.isShallowWater(this.x, this.y) && !this.ignoreWaterSlow) {
        spd *= 0.85; // Leggero rallentamento realistico nei guadi
      }
      this.x += ax * spd * dt;
      this.y += ay * spd * dt;

      // Timer animazione camminata (~8 FPS)
      this.animTimer += dt * 8;
      this.frame = Math.floor(this.animTimer) % 4;
    } else {
      // Timer animazione respirazione/idle (~3.5 FPS)
      this.animTimer += dt * 3.5;
      this.frame = Math.floor(this.animTimer) % 4;
    }

    // Risoluzione delle collisioni con gli ostacoli della mappa (2 passaggi)
    world.collide(this);

    // Rilevamento terreno speciale
    this.inLiquid = world.isLiquid(this.x, this.y);
    this.inShallowWater = world.isShallowWater(this.x, this.y);
  }

  draw(ctx) {
    // Lampeggio visivo durante i frame di invulnerabilità
    if (this.invulnerableTimer > 0 && Math.floor(this.invulnerableTimer * 20) % 2 === 0) {
      return;
    }

    // 1. Ombra proiettata sotto i piedi
    Sprites.drawShadow(ctx, this.x, this.y + 4, 11);

    // 2. Sprite del personaggio 32x32 animato (con arma equipaggiata)
    Sprites.drawHero(ctx, this.x, this.y, this.dir, this.walking, this.frame, this.weapon, this.animTimer || 0);

    // 3. Effetto particelle schizzo se è in acqua o guado
    if ((this.inLiquid || this.inShallowWater) && this.walking) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.75)';
      const splashX = this.x + (Math.random() * 16 - 8);
      const splashY = this.y + (Math.random() * 6 - 3);
      ctx.fillRect(Math.round(splashX), Math.round(splashY), 3, 3);
    }
  }
}
