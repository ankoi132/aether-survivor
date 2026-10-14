/**
 * entities/player.js - Il protagonista fantasy giocabile (Mago Arcano)
 */
import { Sprites } from '../core/sprites.js';

export class Player {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
    this.r = 14;              // Raggio hitbox di collisione (28px di diametro, tile da 32px)
    this.baseSpd = 105;       // Velocità base: 105 pixel al secondo
    this.hp = 100;
    this.maxHp = 100;
    this.magnetRadius = 85;   // Raggio di attrazione magnetica per gemme di mana

    // Orientamento e animazione
    this.dir = 0;             // 0: Giù, 1: Giù-Destra, 2: Destra, etc.
    this.moveAngle = Math.PI / 2; // Angolo iniziale (verso il basso)
    this.walking = false;
    this.inLiquid = false;

    this.animTimer = 0;
    this.frame = 0;
  }

  get currentSpeed() {
    let s = this.baseSpd;
    // Se immerso in acqua, la velocità si riduce del 40% (x0.6)
    if (this.inLiquid) {
      s *= 0.6;
    }
    return s;
  }

  update(dt, input, world) {
    const [ax, ay] = input.axis();
    this.walking = ax !== 0 || ay !== 0;

    if (this.walking) {
      this.moveAngle = Math.atan2(ay, ax);
      this.dir = Sprites.dirFromAngle(this.moveAngle);

      // Movimento fluido integrato con delta time
      const spd = this.currentSpeed;
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
  }

  draw(ctx) {
    // 1. Ombra proiettata sotto i piedi
    Sprites.drawShadow(ctx, this.x, this.y + 4, 11);

    // 2. Sprite del personaggio (centrato sui piedi)
    const sprite = Sprites.getHeroSprite(this.dir, this.walking, this.frame);
    const sw = sprite.width;
    const sh = sprite.height;

    ctx.drawImage(
      sprite,
      Math.round(this.x - sw / 2),
      Math.round(this.y - sh + 8)
    );

    // 3. Effetto particelle schizzo se è in acqua
    if (this.inLiquid && this.walking) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
      const splashX = this.x + (Math.random() * 16 - 8);
      const splashY = this.y + (Math.random() * 6 - 3);
      ctx.fillRect(Math.round(splashX), Math.round(splashY), 3, 3);
    }
  }
}
