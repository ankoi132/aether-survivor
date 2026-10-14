/**
 * core/fx.js - Sistema di Particelle ed Effetti Visivi Pixel-Art (Danno fluttuante, scintille, scie)
 */
export const FX = (() => {
  const particles = [];
  const damageTexts = [];

  return {
    /**
     * Esplosione circolare di particelle di impatto
     */
    burst(x, y, color = '#38bdf8', count = 8, speed = 120) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const s = speed * (0.3 + Math.random() * 0.7);
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * s,
          vy: Math.sin(angle) * s,
          color,
          size: Math.random() < 0.3 ? 3 : 2,
          life: 0.25 + Math.random() * 0.25,
          t: 0
        });
      }
    },

    /**
     * Scia o scintilla direzionale
     */
    spark(x, y, color = '#bae6fd', size = 2) {
      particles.push({
        x: x + (Math.random() * 4 - 2),
        y: y + (Math.random() * 4 - 2),
        vx: (Math.random() * 20 - 10),
        vy: (Math.random() * 20 - 10),
        color,
        size,
        life: 0.18 + Math.random() * 0.12,
        t: 0
      });
    },

    /**
     * Numero di danno fluttuante che sale verso l'alto e sfuma
     */
    addDamageNumber(x, y, amount, isCrit = false) {
      damageTexts.push({
        x: x + (Math.random() * 12 - 6),
        y: y - 10,
        text: `-${amount}`,
        vy: -48,
        life: 0.75,
        t: 0,
        isCrit
      });
    },

    number(x, y, amount, color = '#fde047') {
      damageTexts.push({
        x: x + (Math.random() * 12 - 6),
        y: y - 10,
        text: `-${amount}`,
        vy: -48,
        life: 0.75,
        t: 0,
        isCrit: color === '#fde047'
      });
    },

    update(dt) {
      // 1. Aggiorna particelle
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.t += dt;
        if (p.t >= p.life) {
          particles.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.92;
        p.vy *= 0.92;
      }

      // 2. Aggiorna numeri di danno
      for (let i = damageTexts.length - 1; i >= 0; i--) {
        const d = damageTexts[i];
        d.t += dt;
        if (d.t >= d.life) {
          damageTexts.splice(i, 1);
          continue;
        }
        d.y += d.vy * dt;
        d.vy *= 0.93; // Decelera gradualmente verso l'alto
      }
    },

    draw(ctx) {
      ctx.save();

      // Disegna particelle
      for (const p of particles) {
        const alpha = Math.max(0, 1 - p.t / p.life);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.fillRect(Math.round(p.x - p.size / 2), Math.round(p.y - p.size / 2), p.size, p.size);
      }

      // Disegna numeri di danno pixel art
      ctx.font = 'bold 13px "Courier New", monospace, sans-serif';
      ctx.textAlign = 'center';
      for (const d of damageTexts) {
        const alpha = Math.max(0, 1 - d.t / d.life);
        ctx.globalAlpha = alpha;

        // Contorno scuro per leggibilità su qualsiasi sfondo
        ctx.fillStyle = '#080a0f';
        ctx.fillText(d.text, Math.round(d.x) + 1, Math.round(d.y) + 1);
        ctx.fillText(d.text, Math.round(d.x) - 1, Math.round(d.y) - 1);

        // Colore principale (dorato per critico, azzurro/bianco per dardo arcano)
        ctx.fillStyle = d.isCrit ? '#fde047' : '#e0f2fe';
        ctx.fillText(d.text, Math.round(d.x), Math.round(d.y));
      }

      ctx.restore();
    }
  };
})();
