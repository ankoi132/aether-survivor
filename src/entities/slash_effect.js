/**
 * entities/slash_effect.js - Effetto visivo animato ad arco rotante del fendente della Spada
 */
export class SlashEffect {
  constructor(x, y, angle, radius = 92, arc = Math.PI * 0.95) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.radius = radius;
    this.arc = arc;
    this.life = 0.18;
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
    const alpha = Math.max(0, 1 - Math.pow(progress, 1.4));

    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(this.y));

    // L'arco compie uno sweep dinamico con testa e coda
    const totalArc = this.arc;
    const start = this.angle - totalArc / 2;

    const headArc = Math.min(totalArc, totalArc * Math.min(1, progress * 2.2));
    const tailProgress = Math.max(0, (progress - 0.28) / 0.72);
    const tailOffset = totalArc * tailProgress;

    const drawStart = start + tailOffset;
    const drawEnd = start + headArc;

    if (drawEnd > drawStart) {
      // 1. Alone d'aria tagliente
      ctx.strokeStyle = `rgba(56, 189, 248, ${alpha * 0.45})`;
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius - 2, drawStart, drawEnd);
      ctx.stroke();

      // 2. Lama d'acciaio
      ctx.strokeStyle = `rgba(226, 232, 240, ${alpha * 0.95})`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, drawStart, drawEnd);
      ctx.stroke();

      // 3. Filo di taglio candido splendente
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, drawStart + 0.04, drawEnd);
      ctx.stroke();

      // Scintilla di punta alla testa del fendente
      const tipX = Math.cos(drawEnd) * this.radius;
      const tipY = Math.sin(drawEnd) * this.radius;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(tipX, tipY, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
