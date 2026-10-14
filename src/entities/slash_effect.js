/**
 * entities/slash_effect.js - Effetto visivo del fendente d'acciaio della Spada
 */
export class SlashEffect {
  constructor(x, y, angle, radius = 92, arc = Math.PI * 0.95) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.radius = radius;
    this.arc = arc;
    this.life = 0.16;
    this.t = 0;
    this.dead = false;
  }

  update(dt) {
    this.t += dt;
    if (this.t >= this.life) {
      this.dead = true;
    }
  }

  draw(ctx) {
    if (this.dead) return;

    const progress = this.t / this.life;
    const alpha = Math.max(0, 1 - progress);

    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(this.y));

    // Inizia l'arco del fendente
    const startAngle = this.angle - this.arc / 2;
    const endAngle = this.angle + this.arc / 2;

    // 1. Spessore esterno luminoso
    ctx.strokeStyle = `rgba(226, 232, 240, ${alpha * 0.9})`;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, startAngle, endAngle);
    ctx.stroke();

    // 2. Lama interna affilata e splendente
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, startAngle + 0.1, endAngle - 0.1);
    ctx.stroke();

    // 3. Alone d'aria tagliente
    ctx.strokeStyle = `rgba(56, 189, 248, ${alpha * 0.4})`;
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius - 4, startAngle, endAngle);
    ctx.stroke();

    ctx.restore();
  }
}
