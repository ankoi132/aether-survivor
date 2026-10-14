/**
 * core/fx.js - Sistema di Effetti Visivi e Particelle Pixel-Art Avanzato
 * Gestisce:
 * - Shockwave ad anello espandibile
 * - Scintille e tagli direzionali per colpi di spada e frecce
 * - Detriti ossei che rimbalzano per la morte dello scheletro
 * - Globuli e macchie di melma per la morte degli slime
 * - Nuvole di fumo spettrale / sbuffi di polvere
 * - Numeri di danno con animazione di pop e critici d'impatto
 * - Testi fluttuanti per la raccolta di artefatti
 */
export const FX = (() => {
  const particles = [];
  const shockwaves = [];
  const slashCuts = [];
  const bones = [];
  const damageTexts = [];

  return {
    /**
     * Esplosione circolare di particelle colorate
     */
    burst(x, y, color = '#38bdf8', count = 8, speed = 120) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const s = speed * (0.35 + Math.random() * 0.65);
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * s,
          vy: Math.sin(angle) * s,
          color,
          size: Math.random() < 0.35 ? 3 : 2,
          life: 0.25 + Math.random() * 0.22,
          t: 0
        });
      }
    },

    /**
     * Scia o scintilla direzionale ad alta velocità
     */
    spark(x, y, color = '#bae6fd', size = 2) {
      particles.push({
        x: x + (Math.random() * 4 - 2),
        y: y + (Math.random() * 4 - 2),
        vx: (Math.random() * 30 - 15),
        vy: (Math.random() * 30 - 15),
        color,
        size,
        life: 0.16 + Math.random() * 0.12,
        t: 0
      });
    },

    /**
     * Anello di onde d'urto ad espansione rapida (impatto colpi e morte mob)
     */
    addShockwave(x, y, maxRadius = 32, color = '#ffffff', duration = 0.24) {
      shockwaves.push({
        x,
        y,
        radius: 4,
        maxRadius,
        color,
        life: duration,
        t: 0
      });
    },

    /**
     * Taglio di fendente d'acciaio con scintille lungo l'angolo d'impatto
     */
    addSlashCut(x, y, angle, length = 26, color = '#ffffff') {
      slashCuts.push({
        x,
        y,
        angle,
        length,
        color,
        life: 0.14,
        t: 0
      });
      // Spruzzi di scintille metalliche lungo la lama
      for (let i = 0; i < 4; i++) {
        const pAngle = angle + (Math.PI / 2) * (Math.random() > 0.5 ? 1 : -1) + (Math.random() * 0.6 - 0.3);
        const spd = 60 + Math.random() * 90;
        particles.push({
          x,
          y,
          vx: Math.cos(pAngle) * spd,
          vy: Math.sin(pAngle) * spd,
          color: Math.random() > 0.3 ? '#fde047' : '#ffffff',
          size: 2,
          life: 0.15 + Math.random() * 0.1,
          t: 0
        });
      }
    },

    /**
     * Sbuffo di fumo o polvere che sale dolcemente
     */
    addSmokePuff(x, y, color = '#94a3b8') {
      for (let i = 0; i < 5; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 8;
        particles.push({
          x: x + Math.cos(angle) * dist,
          y: y + Math.sin(angle) * dist,
          vx: (Math.random() * 20 - 10),
          vy: -25 - Math.random() * 25,
          color,
          size: 4 + Math.floor(Math.random() * 3),
          life: 0.35 + Math.random() * 0.2,
          t: 0
        });
      }
    },

    /**
     * Frammenti ossei che rimbalzano al suolo per la morte dello scheletro
     */
    addBones(x, y, count = 6) {
      for (let i = 0; i < count; i++) {
        const angle = -Math.PI / 2 + (Math.random() * 1.6 - 0.8);
        const speed = 70 + Math.random() * 90;
        bones.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          gravity: 280,
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() * 12 - 6),
          size: i === 0 ? 6 : 4, // Il primo pezzo è il teschio!
          isSkull: i === 0,
          groundY: y + 10 + Math.random() * 8,
          bounces: 2,
          life: 0.55 + Math.random() * 0.2,
          t: 0
        });
      }
    },

    /**
     * Spruzzi e globuli gelatinosi per la morte degli slime
     */
    addSlimeSplat(x, y, color = '#22c55e', count = 10) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = 60 + Math.random() * 110;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd + 20, // Leggera caduta verso terra
          color,
          size: Math.random() < 0.4 ? 4 : 3,
          life: 0.3 + Math.random() * 0.2,
          t: 0
        });
      }
    },

    /**
     * Numero di danno fluttuante con pop-scale iniziale e critico
     */
    addDamageNumber(x, y, amount, isCrit = false) {
      damageTexts.push({
        x: x + (Math.random() * 14 - 7),
        y: y - 10,
        text: isCrit ? `-${amount}!` : `-${amount}`,
        vy: isCrit ? -54 : -42,
        life: 0.72,
        t: 0,
        isCrit,
        scale: isCrit ? 1.4 : 1.15
      });
    },

    /**
     * Testo fluttuante colorato per la raccolta di oggetti e artefatti
     */
    addFloatingText(x, y, text, color = '#22c55e') {
      damageTexts.push({
        x: x + (Math.random() * 8 - 4),
        y: y - 12,
        text,
        vy: -36,
        life: 0.85,
        t: 0,
        color,
        scale: 1.05
      });
    },

    update(dt) {
      // 1. Particelle standard
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.t += dt;
        if (p.t >= p.life) {
          particles.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.91;
        p.vy *= 0.91;
      }

      // 2. Onde d'urto (Shockwaves)
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.t += dt;
        if (sw.t >= sw.life) {
          shockwaves.splice(i, 1);
          continue;
        }
        const progress = sw.t / sw.life;
        sw.radius = 4 + (sw.maxRadius - 4) * Math.sin(progress * Math.PI * 0.5);
      }

      // 3. Tagli di lama (Slash Cuts)
      for (let i = slashCuts.length - 1; i >= 0; i--) {
        const sc = slashCuts[i];
        sc.t += dt;
        if (sc.t >= sc.life) {
          slashCuts.splice(i, 1);
        }
      }

      // 4. Detriti ossei con fisica e rimbalzi
      for (let i = bones.length - 1; i >= 0; i--) {
        const b = bones[i];
        b.t += dt;
        if (b.t >= b.life) {
          bones.splice(i, 1);
          continue;
        }
        b.vy += b.gravity * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.rotation += b.vRot * dt;

        // Rimbalzo sul pavimento
        if (b.y >= b.groundY && b.bounces > 0) {
          b.y = b.groundY;
          b.vy = -b.vy * 0.45;
          b.vx *= 0.65;
          b.vRot *= 0.6;
          b.bounces--;
        }
      }

      // 5. Testi di danno e feedback
      for (let i = damageTexts.length - 1; i >= 0; i--) {
        const d = damageTexts[i];
        d.t += dt;
        if (d.t >= d.life) {
          damageTexts.splice(i, 1);
          continue;
        }
        d.y += d.vy * dt;
        d.vy *= 0.93;
        // Pop scaling che ritorna a dimensione normale
        if (d.scale > 1.0) {
          d.scale = Math.max(1.0, d.scale - dt * 2.5);
        }
      }
    },

    draw(ctx) {
      ctx.save();

      // 1. Onde d'urto circolari
      for (const sw of shockwaves) {
        const alpha = Math.max(0, 1 - sw.t / sw.life);
        ctx.strokeStyle = sw.color;
        ctx.globalAlpha = alpha * 0.85;
        ctx.lineWidth = Math.max(1.5, 3 * (1 - sw.t / sw.life));
        ctx.beginPath();
        ctx.arc(Math.round(sw.x), Math.round(sw.y), Math.round(sw.radius), 0, Math.PI * 2);
        ctx.stroke();
      }

      // 2. Tagli di lama (Slash Cuts)
      for (const sc of slashCuts) {
        const alpha = Math.max(0, 1 - sc.t / sc.life);
        ctx.save();
        ctx.translate(Math.round(sc.x), Math.round(sc.y));
        ctx.rotate(sc.angle);
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = sc.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-sc.length / 2, 0);
        ctx.lineTo(sc.length / 2, 0);
        ctx.stroke();

        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-sc.length / 3, -1);
        ctx.lineTo(sc.length / 3, 1);
        ctx.stroke();
        ctx.restore();
      }

      // 3. Detriti ossei rotanti
      for (const b of bones) {
        const alpha = Math.max(0, 1 - (b.t / b.life) * 0.8);
        ctx.save();
        ctx.translate(Math.round(b.x), Math.round(b.y));
        ctx.rotate(b.rotation);
        ctx.globalAlpha = alpha;

        if (b.isSkull) {
          // Mini-teschio
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(-3, -3, 6, 6);
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(-2, -2, 5, 5);
          // Occhiaie
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(-1, -1, 1, 1);
          ctx.fillRect(1, -1, 1, 1);
        } else {
          // Osso / costola
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(-3, -1, 6, 3);
          ctx.fillStyle = '#cbd5e1';
          ctx.fillRect(-2, 0, 5, 2);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-2, 0, 2, 1);
        }
        ctx.restore();
      }

      // 4. Particelle pixel art
      for (const p of particles) {
        const alpha = Math.max(0, 1 - p.t / p.life);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.fillRect(Math.round(p.x - p.size / 2), Math.round(p.y - p.size / 2), p.size, p.size);
      }

      // 5. Testi e Numeri fluttuanti con Pop Scaling
      for (const d of damageTexts) {
        const alpha = Math.max(0, 1 - d.t / d.life);
        ctx.save();
        ctx.globalAlpha = alpha;

        const fontSize = Math.round(13 * (d.scale || 1.0));
        ctx.font = `bold ${fontSize}px "Courier New", monospace, sans-serif`;
        ctx.textAlign = 'center';

        // Ombra/contorno scuro
        ctx.fillStyle = '#080a0f';
        ctx.fillText(d.text, Math.round(d.x) + 1, Math.round(d.y) + 1);
        ctx.fillText(d.text, Math.round(d.x) - 1, Math.round(d.y) - 1);

        // Colore primario
        ctx.fillStyle = d.color || (d.isCrit ? '#fde047' : '#e0f2fe');
        ctx.fillText(d.text, Math.round(d.x), Math.round(d.y));

        ctx.restore();
      }

      ctx.restore();
    }
  };
})();
