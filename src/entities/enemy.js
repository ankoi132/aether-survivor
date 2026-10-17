/**
 * entities/enemy.js - Nemici fantasy con macchine a stati, animazioni di impatto (flinch/flash)
 * e animazioni di morte differenziate per bioma (dissolvenza/splat per slime, crollo ossa per scheletri)
 */
import { Sprites } from '../core/sprites.js';
import { FX } from '../core/fx.js';

export const ENEMY_COLORS = {
  slime_forest: '#22c55e',
  slime_ice: '#93c5fd',
  slime_sand: '#f59e0b',
  slime_magma: '#ef4444',
  slime_water: '#0284c7',
  skeleton: '#cbd5e1',
  orc: '#84cc16',
  bat: '#a855f7',
  boss_treant: '#22c55e',
  boss_golem: '#7dd3fc',
  boss_scorpion: '#f59e0b',
  boss_magma: '#ef4444'
};

export class Enemy {
  constructor(x, y, kind = 'slime_forest') {
    this.x = x;
    this.y = y;
    this.kind = kind;
    this.spawnX = x;
    this.spawnY = y;
    this.color = ENEMY_COLORS[kind] || '#22c55e';
    this.isBoss = false;

    // Statistiche per tipo
    if (kind === 'boss_treant') {
      this.name = 'Treant Ancestrale';
      this.isBoss = true;
      this.maxHp = 650;
      this.baseSpd = 36;
      this.r = 26;
      this.aggroRadius = 320;
      this.xpValue = 180;
      this.gemType = 'emerald';
      this.contactDamage = 16;
      this.goldValue = 140;
    } else if (kind === 'boss_golem') {
      this.name = 'Golem dei Ghiacci';
      this.isBoss = true;
      this.maxHp = 780;
      this.baseSpd = 40;
      this.r = 28;
      this.aggroRadius = 340;
      this.xpValue = 220;
      this.gemType = 'emerald';
      this.contactDamage = 20;
      this.goldValue = 180;
    } else if (kind === 'boss_scorpion') {
      this.name = 'Colosso delle Dune';
      this.isBoss = true;
      this.maxHp = 880;
      this.baseSpd = 52;
      this.r = 28;
      this.aggroRadius = 350;
      this.xpValue = 260;
      this.gemType = 'emerald';
      this.contactDamage = 24;
      this.goldValue = 220;
    } else if (kind === 'boss_magma') {
      this.name = 'Titano di Magma';
      this.isBoss = true;
      this.maxHp = 1050;
      this.baseSpd = 45;
      this.r = 30;
      this.aggroRadius = 360;
      this.xpValue = 320;
      this.gemType = 'emerald';
      this.contactDamage = 28;
      this.goldValue = 260;
    } else if (kind === 'slime_forest') {
      this.name = 'Slime Silvano';
      this.maxHp = 35;
      this.baseSpd = 50;
      this.r = 13;
      this.aggroRadius = 180;
      this.xpValue = 12;
      this.gemType = 'cyan';
      this.contactDamage = 6;
      this.goldValue = 4;
    } else if (kind === 'slime_ice') {
      this.name = 'Slime dei Ghiacci';
      this.maxHp = 42;
      this.baseSpd = 54;
      this.r = 13;
      this.aggroRadius = 190;
      this.xpValue = 15;
      this.gemType = 'cyan';
      this.contactDamage = 7;
      this.goldValue = 5;
    } else if (kind === 'slime_sand') {
      this.name = 'Slime delle Dune';
      this.maxHp = 50;
      this.baseSpd = 58;
      this.r = 13;
      this.aggroRadius = 200;
      this.xpValue = 18;
      this.gemType = 'cyan';
      this.contactDamage = 9;
      this.goldValue = 7;
    } else if (kind === 'slime_magma') {
      this.name = 'Slime di Lava';
      this.maxHp = 60;
      this.baseSpd = 65;
      this.r = 13;
      this.aggroRadius = 210;
      this.xpValue = 22;
      this.gemType = 'emerald';
      this.contactDamage = 12;
      this.goldValue = 9;
    } else if (kind === 'slime_water') {
      this.name = 'Slime delle Onde';
      this.maxHp = 45;
      this.baseSpd = 62;
      this.r = 13;
      this.aggroRadius = 195;
      this.xpValue = 16;
      this.gemType = 'cyan';
      this.contactDamage = 8;
      this.goldValue = 6;
    } else if (kind === 'orc') {
      this.name = 'Orco Predone';
      this.maxHp = 95;
      this.baseSpd = 62;
      this.r = 15;
      this.aggroRadius = 220;
      this.xpValue = 30;
      this.gemType = 'emerald';
      this.contactDamage = 16;
      this.goldValue = 15;
    } else if (kind === 'bat') {
      this.name = 'Pipistrello dell\'Ombra';
      this.maxHp = 30;
      this.baseSpd = 90;
      this.r = 12;
      this.aggroRadius = 240;
      this.xpValue = 14;
      this.gemType = 'cyan';
      this.contactDamage = 8;
      this.goldValue = 6;
    } else {
      this.name = 'Scheletro Guardiano';
      this.maxHp = 75;
      this.baseSpd = 72;
      this.r = 14;
      this.aggroRadius = 210;
      this.xpValue = 25;
      this.gemType = 'emerald';
      this.contactDamage = 14;
      this.goldValue = 12;
    }

    this.hp = this.maxHp;
    this.dead = false;
    this.isDying = false;
    this.hasDroppedLoot = false;
    this.deathTimer = 0;
    this.deathMaxTimer = 0.36;

    // Macchina a stati: 'WANDER' | 'CHASE' | 'DYING'
    this.state = 'WANDER';
    this.wanderTimer = Math.random() * 2;
    this.wanderAngle = Math.random() * Math.PI * 2;
    this.isWanderMoving = false;

    // Orientamento e animazione
    this.dir = 0;
    this.animTimer = Math.random() * 2;
    this.frame = 0;

    // Knockback, flash e flinch (squash & stretch sui colpi)
    this.vx = 0;
    this.vy = 0;
    this.flashTimer = 0;
    this.squashTimer = 0;
    this.alertTimer = 0;
  }

  takeDamage(dmg, knockbackAngle, knockbackForce = 120, attackType = 'magic') {
    if (this.dead || this.isDying) return;

    this.hp = Math.max(0, this.hp - dmg);
    this.flashTimer = 0.12;
    this.squashTimer = 0.15;

    // Se viene colpito mentre vaga, entra immediatamente in allerta
    if (this.state === 'WANDER') {
      this.state = 'CHASE';
      this.alertTimer = 0.8;
    }

    // Applicazione del knockback
    this.vx += Math.cos(knockbackAngle) * knockbackForce;
    this.vy += Math.sin(knockbackAngle) * knockbackForce;

    // Effetti grafici differenziati per tipo di attacco subito
    if (attackType === 'slash') {
      // Colpo di Spada: taglio di lama brillante, scintille metalliche e numero critico
      FX.addSlashCut(this.x, this.y - 8, knockbackAngle, 32);
      FX.addShockwave(this.x, this.y - 8, 18, '#ffffff', 0.15);
      FX.addDamageNumber(this.x, this.y - 20, dmg, true);
    } else if (attackType === 'pierce') {
      // Colpo d'Arco: perforazione rapida, onda d'urto stretta
      FX.burst(this.x, this.y - 8, '#fef08a', 5, 105);
      FX.addShockwave(this.x, this.y - 8, 14, '#f59e0b', 0.14);
      FX.addDamageNumber(this.x, this.y - 20, dmg, false);
    } else {
      // Colpo Magico (Bastone / Sfera): alone arcano
      FX.burst(this.x, this.y - 8, '#38bdf8', 6, 85);
      FX.addDamageNumber(this.x, this.y - 20, dmg, false);
    }

    // Raggiunta salute zero: inizio animazione di morte
    if (this.hp <= 0 && !this.isDying) {
      this.isDying = true;
      this.state = 'DYING';
      this.deathTimer = this.deathMaxTimer;

      if (this.kind.startsWith('slime_')) {
        // Morte Slime: onda d'urto colorata, globuli e bolle gelatinose che esplodono
        FX.addShockwave(this.x, this.y + 4, 28, this.color, 0.22);
        FX.addSlimeSplat(this.x, this.y - 4, this.color, 12);
        FX.burst(this.x, this.y - 6, this.color, 14, 130);
      } else {
        // Morte Scheletro: onda d'urto, ossa rotanti che rimbalzano al suolo e fumo spettrale
        FX.addShockwave(this.x, this.y + 4, 32, '#cbd5e1', 0.24);
        FX.addBones(this.x, this.y - 6, 6);
        FX.addSmokePuff(this.x, this.y - 10, '#64748b');
        FX.burst(this.x, this.y - 6, '#f8fafc', 8, 90);
      }
    }
  }

  update(dt, player, world) {
    if (this.dead) return;

    // Gestione fase di morte animata
    if (this.isDying) {
      this.deathTimer -= dt;
      // Il knockback decelera rapidamente
      const friction = Math.exp(-12.0 * dt);
      this.vx *= friction;
      this.vy *= friction;
      this.x += this.vx * dt;
      this.y += this.vy * dt;

      if (this.deathTimer <= 0) {
        this.dead = true;
      }
      return;
    }

    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
    }
    if (this.squashTimer > 0) {
      this.squashTimer -= dt;
    }
    if (this.alertTimer > 0) {
      this.alertTimer -= dt;
    }

    // 1. Smorzamento del knockback
    const friction = Math.exp(-9.0 * dt);
    this.vx *= friction;
    this.vy *= friction;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // 2. Calcolo distanza dal giocatore
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);

    // 3. Macchina a stati del comportamento
    if (this.state === 'WANDER') {
      if (dist < this.aggroRadius) {
        this.state = 'CHASE';
        this.alertTimer = 0.8;
      } else {
        this.wanderTimer -= dt;
        if (this.wanderTimer <= 0) {
          this.isWanderMoving = Math.random() > 0.4;
          this.wanderAngle = Math.random() * Math.PI * 2;
          this.wanderTimer = 1.8 + Math.random() * 2.5;
        }

        if (this.isWanderMoving) {
          const spd = this.baseSpd * 0.45;
          this.x += Math.cos(this.wanderAngle) * spd * dt;
          this.y += Math.sin(this.wanderAngle) * spd * dt;
          this.dir = Sprites.dirFromAngle(this.wanderAngle);
          this.animTimer += dt * 4;
        } else {
          this.animTimer += dt * 2;
        }
      }
    } else if (this.state === 'CHASE') {
      // Se il giocatore è entrato in una Safe Zone protetta (città/villaggio), il mob non può entrare e interrompe l'inseguimento
      if (world.isSafeZone(player.x, player.y) || dist > this.aggroRadius * 1.7) {
        this.state = 'WANDER';
        this.wanderTimer = 2.5;
        this.isWanderMoving = false;
      } else if (dist > 18) {
        const angle = Math.atan2(dy, dx);
        this.dir = Sprites.dirFromAngle(angle);

        let spd = this.baseSpd;
        if (world.isLiquid(this.x, this.y)) {
          spd *= 0.55;
        } else if (world.isShallowWater(this.x, this.y)) {
          spd *= 0.85;
        }

        this.x += Math.cos(angle) * spd * dt;
        this.y += Math.sin(angle) * spd * dt;
        this.animTimer += dt * 7;
      }
    }

    // 4. Risoluzione collisioni con l'ambiente
    world.collide(this);

    // Calcolo frame animazione
    this.frame = Math.floor(this.animTimer) % 4;
  }

  draw(ctx) {
    if (this.dead) return;

    // 1. Animazione di Morte
    if (this.isDying) {
      if (this.kind.startsWith('slime_')) {
        // Slime: schiacciamento sul terreno (squash) e dissolvenza con bolle (inalterato)
        const p = 1 - (this.deathTimer / this.deathMaxTimer);
        const scaleX = 1 + p * 0.85;
        const scaleY = Math.max(0.06, 1 - p * 1.15);

        ctx.save();
        ctx.translate(Math.round(this.x), Math.round(this.y + 4));
        ctx.scale(scaleX, scaleY);
        ctx.globalAlpha = Math.max(0, 1 - p * 0.85);

        if (p < 0.3) {
          ctx.filter = 'brightness(3.2)';
        }

        const slimeType = this.kind.replace('slime_', '');
        const sprite = Sprites.getSlimeSprite(slimeType, 1);
        const sw = sprite.width;
        const sh = sprite.height;
        ctx.drawImage(sprite, Math.round(-sw / 2), Math.round(-sh + 4));
        ctx.restore();
      } else if (this.kind === 'orc') {
        Sprites.drawOrc(ctx, this.x, this.y, this.dir, false, 0, true, this.deathTimer, this.deathMaxTimer, this.animTimer);
      } else if (this.kind === 'bat') {
        Sprites.drawBat(ctx, this.x, this.y, this.dir, false, 0, true, this.deathTimer, this.deathMaxTimer, this.animTimer);
      } else if (this.isBoss) {
        Sprites.drawBoss(ctx, this);
      } else {
        // Scheletro Guardiano: sgretolamento osseo sul terreno
        Sprites.drawSkeleton(ctx, this.x, this.y, this.dir, false, 0, true, this.deathTimer, this.deathMaxTimer, this.animTimer);
      }
      return;
    }

    // 2. Ombra a terra calibrata al suolo (i Boss disegnano la loro ombra in drawBoss)
    if (!this.isBoss) {
      const shadowR = this.kind.startsWith('slime') ? 6 : 7;
      Sprites.drawShadow(ctx, this.x, this.y, shadowR);
    }

    ctx.save();

    // Effetto Flinch / Squash sui colpi ricevuti
    if (this.squashTimer > 0) {
      const flinchAmt = (this.squashTimer / 0.15) * 0.22;
      ctx.translate(Math.round(this.x), Math.round(this.y));
      ctx.scale(1 + flinchAmt, 1 - flinchAmt);
      ctx.translate(-Math.round(this.x), -Math.round(this.y));
    }

    // Flash bianco d'impatto
    if (this.flashTimer > 0) {
      ctx.filter = 'brightness(2.8)';
    }

    // Render dello sprite pixel-art vivo (Boss dedicati, Slime, Scheletri, Orchi, Pipistrelli)
    const isWalking = this.state === 'CHASE' || (this.state === 'WANDER' && this.isWanderMoving);

    if (this.isBoss) {
      Sprites.drawBoss(ctx, this);
    } else if (this.kind.startsWith('slime_')) {
      // Slime: 100% inalterati come richiesto
      const slimeType = this.kind.replace('slime_', '');
      const sprite = Sprites.getSlimeSprite(slimeType, this.frame);
      const sw = sprite.width;
      const sh = sprite.height;
      ctx.drawImage(sprite, Math.round(this.x - sw / 2), Math.round(this.y - sh + 8));
    } else if (this.kind === 'orc') {
      Sprites.drawOrc(ctx, this.x, this.y, this.dir, isWalking, this.frame, false, 0, 0, this.animTimer);
    } else if (this.kind === 'bat') {
      Sprites.drawBat(ctx, this.x, this.y, this.dir, isWalking, this.frame, false, 0, 0, this.animTimer);
    } else {
      // Scheletro Guardiano (Skeleton01)
      Sprites.drawSkeleton(ctx, this.x, this.y, this.dir, isWalking, this.frame, false, 0, 0, this.animTimer);
    }

    ctx.restore();

    // 3. Indicatore di Allerta (!)
    if (this.alertTimer > 0) {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('!', Math.round(this.x), Math.round(this.y - 28));
    }

    // 4. Barra della vita sopra il nemico
    if (this.isBoss) {
      const barW = 74;
      const barH = 5;
      const bx = Math.round(this.x - barW / 2);
      const by = Math.round(this.y - 56);

      // Titolo del Boss
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fde047';
      ctx.fillText(`👑 ${this.name}`, Math.round(this.x), by - 4);

      // Barra HP dorata
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(bx - 2, by - 2, barW + 4, barH + 4);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx - 2, by - 2, barW + 4, barH + 4);

      const pct = Math.max(0, this.hp / this.maxHp);
      ctx.fillStyle = pct > 0.4 ? '#ef4444' : '#b91c1c';
      ctx.fillRect(bx, by, Math.round(barW * pct), barH);
    } else if (this.hp < this.maxHp) {
      const barW = 24;
      const barH = 3;
      const bx = Math.round(this.x - barW / 2);
      const by = Math.round(this.y - 24);

      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);

      const pct = Math.max(0, this.hp / this.maxHp);
      ctx.fillStyle = pct > 0.4 ? '#ef4444' : '#b91c1c';
      ctx.fillRect(bx, by, Math.round(barW * pct), barH);
    }
  }
}
