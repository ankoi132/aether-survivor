/**
 * core/camera.js - Telecamera 2D con centratura perfetta e smorzamento framerate-independent
 */
export class Camera {
  constructor(viewW = 768, minViewH = 420) {
    this.x = 0;
    this.y = 0;
    this.viewW = viewW;
    this.minViewH = minViewH;
    this.w = viewW;
    this.h = minViewH;
    this.scale = 1;
    this.dpr = 1;

    // Screenshake
    this.shake = 0;
    this.shakeX = 0;
    this.shakeY = 0;
  }

  resize(canvasWidth, canvasHeight, dpr = 1) {
    this.dpr = dpr;
    // Calcola la scala per mantenere la risoluzione coerente
    this.scale = Math.min(canvasWidth / this.viewW, canvasHeight / this.minViewH);
    this.w = canvasWidth / this.scale;
    this.h = canvasHeight / this.scale;
  }

  follow(targetX, targetY, dt) {
    const factor = 1 - Math.exp(-9.0 * dt);
    this.x += (targetX - this.x) * factor;
    this.y += (targetY - this.y) * factor;

    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 2.5);
      const amp = this.shake * 6;
      this.shakeX = (Math.random() * 2 - 1) * amp;
      this.shakeY = (Math.random() * 2 - 1) * amp;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }
  }

  snapTo(targetX, targetY) {
    this.x = targetX;
    this.y = targetY;
  }

  kick(amount = 0.5) {
    this.shake = Math.min(1.2, this.shake + amount);
  }

  left() {
    return this.x - this.w / 2;
  }

  top() {
    return this.y - this.h / 2;
  }

  sees(px, py, pad = 64) {
    return (
      px >= this.left() - pad &&
      px <= this.left() + this.w + pad &&
      py >= this.top() - pad &&
      py <= this.top() + this.h + pad
    );
  }

  apply(ctx) {
    // 1. Applica la scala coerente per il display
    ctx.scale(this.scale, this.scale);

    // 2. Trasla in modo che (this.x, this.y) cada nel centro del viewport
    const tx = -this.left() + this.shakeX;
    const ty = -this.top() + this.shakeY;
    ctx.translate(Math.round(tx), Math.round(ty));
  }

  /**
   * Converte le coordinate schermo/mouse (clientX, clientY) in coordinate assolute del mondo di gioco
   */
  screenToWorld(clientX, clientY, canvas) {
    const rect = canvas.getBoundingClientRect();
    const canvasX = (clientX - rect.left) * (canvas.width / rect.width);
    const canvasY = (clientY - rect.top) * (canvas.height / rect.height);
    const worldX = canvasX / this.scale + this.left() - this.shakeX;
    const worldY = canvasY / this.scale + this.top() - this.shakeY;
    return { x: worldX, y: worldY };
  }
}
