/**
 * entities/enemy.js - Nemici fantasy randagi che popolano la mappa (no onde, no spawner infinito)
 */
import { Sprites } from '../core/sprites.js';
import { FX } from '../core/fx.js';

export class Enemy {
  constructor(x, y, kind = 'slime_forest') {
    this.x = x;
    this.y = y;
    this.kind = kind; // 'slime_forest', 'slime_water', 'skeleton'
    this.spawnX = x;
    this.spawnY = y;

    // Statistiche per tipo
    if (kind === 'slime_forest') {
      this.name = 'Slime Silvano';
      this.maxHp = 35;
      this.baseSpd = 50;
      this.r = 13;
      this.aggroRadius = 180;
      this.xpValue = 12;
      this.gemType = 'cyan';
      this.contactDamage = 6;
      this.goldValue = 4;
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
    } else {
      this.name = 'Scheletro Guardiano';
      this.maxHp = 70;
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

    // Macchina a stati: 'WANDER' | 'CHASE'
    this.state = 'WANDER';
    this.wanderTimer = Math.random() * 2;
    this.wanderAngle = Math.random() * Math.PI * 2;
    this.isWanderMoving = false;

    // Orientamento e animazione
    this.dir = 0;
    this.animTimer = Math.random() * 2;
    this.frame = 0;

    // Knockback e feedback
    this.vx = 0;
    this.vy = 0;
    this.flashTimer = 0;
    this.alertTimer = 0;
  }

  takeDamage(dmg, knockbackAngle, knockbackForce = 120) {
    if (this.dead) return;

    this.hp = Math.max(0, this.hp - dmg);
    this.flashTimer = 0.12;

    // Se viene colpito mentre vaga, entra immediatamente in allerta
    if (this.state === 'WANDER') {
      this.state = 'CHASE';
      this.alertTimer = 0.8;
    }

    // Applicazione del knockback
    this.vx += Math.cos(knockbackAngle) * knockbackForce;
    this.vy += Math.sin(knockbackAngle) * knockbackForce;

    // Feedback particelle e numero fluttuante
    FX.burst(this.x, this.y - 8, '#f8fafc', 5, 80);
    FX.addDamageNumber(this.x, this.y - 20, dmg, false);

    if (this.hp <= 0) {
      this.dead = true;
      const deathColor = this.kind.startsWith('slime') ? '#22c55e' : '#cbd5e1';
      FX.burst(this.x, this.y - 10, deathColor, 12, 110);
    }
  }

  update(dt, player, world) {
    if (this.dead) return;

    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
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
      // Se il giocatore entra nel raggio di percezione: ALLERTA!
      if (dist < this.aggroRadius) {
        this.state = 'CHASE';
        this.alertTimer = 0.8;
      } else {
        // Pattugliamento pacifico dell'area
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
      // Se il giocatore fugge molto lontano, il nemico si calma
      if (dist > this.aggroRadius * 1.7) {
        this.state = 'WANDER';
        this.wanderTimer = 2.0;
        this.isWanderMoving = false;
      } else if (dist > 18) {
        // Inseguimento fluido del giocatore
        const angle = Math.atan2(dy, dx);
        this.dir = Sprites.dirFromAngle(angle);

        let spd = this.baseSpd;
        if (world.isLiquid(this.x, this.y)) {
          spd *= 0.65;
        }

        this.x += Math.cos(angle) * spd * dt;
        this.y += Math.sin(angle) * spd * dt;
        this.animTimer += dt * 7;
      }
    }

    // 4. Risoluzione collisioni con l'ambiente (scivola su muri, rocce, alberi)
    world.collide(this);

    // Calcolo frame animazione
    this.frame = Math.floor(this.animTimer) % 4;
  }

  draw(ctx) {
    if (this.dead) return;

    // Ombra a terra
    Sprites.drawShadow(ctx, this.x, this.y + 4, this.kind.startsWith('slime') ? 9 : 10);

    ctx.save();
    if (this.flashTimer > 0) {
      ctx.filter = 'brightness(2.2)';
    }

    // Render dello sprite pixel-art
    if (this.kind === 'slime_forest') {
      const sprite = Sprites.getSlimeSprite('forest', this.frame);
      const sw = sprite.width;
      const sh = sprite.height;
      ctx.drawImage(sprite, Math.round(this.x - sw / 2), Math.round(this.y - sh + 8));
    } else if (this.kind === 'slime_water') {
      const sprite = Sprites.getSlimeSprite('water', this.frame);
      const sw = sprite.width;
      const sh = sprite.height;
      ctx.drawImage(sprite, Math.round(this.x - sw / 2), Math.round(this.y - sh + 8));
    } else {
      const isWalking = this.state === 'CHASE' || (this.state === 'WANDER' && this.isWanderMoving);
      const sprite = Sprites.getSkeletonSprite(this.dir, isWalking, this.frame);
      const sw = sprite.width;
      const sh = sprite.height;
      ctx.drawImage(sprite, Math.round(this.x - sw / 2), Math.round(this.y - sh + 8));
    }

    ctx.restore();

    // 3. Indicatore di Allerta (!) quando viene ingaggiato
    if (this.alertTimer > 0) {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('!', Math.round(this.x), Math.round(this.y - 28));
    }

    // 4. Barra della vita sopra il nemico se ha subito danno
    if (this.hp < this.maxHp) {
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
