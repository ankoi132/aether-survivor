/**
 * core/sprites.js - Generatore di Sprite Pixel Art per Eroe Fantasy (16-bit)
 */
export const Sprites = (() => {
  const PX = 2; // Pixel art scaling factor
  const cache = new Map();

  function dirFromAngle(angle) {
    return ((Math.round((Math.PI / 2 - angle) / (Math.PI / 4)) % 8) + 8) % 8;
  }

  function createOffscreen(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    return { canvas: c, ctx };
  }

  const PALETTE = {
    outline: '#090d16',
    cloakDark: '#1e1b4b',
    cloakMain: '#312e81',
    cloakLight: '#4f46e5',
    tunic: '#0284c7',
    tunicLight: '#38bdf8',
    belt: '#b45309',
    buckle: '#fde047',
    skin: '#fde047',
    skinShadow: '#d97706',
    hair: '#e2e8f0',
    hairShadow: '#94a3b8',
    boots: '#0f172a',
    staffWood: '#451a03',
    staffLight: '#78350f',
    gemGlow: '#38bdf8',
    gemCore: '#ffffff'
  };

  function renderHeroFrame(dir, isWalking, frameIndex) {
    const w = 26 * PX;
    const h = 28 * PX;
    const { canvas, ctx } = createOffscreen(w, h);

    const bob = isWalking ? Math.sin(frameIndex * Math.PI) * 1.5 * PX : (frameIndex % 2 === 1 ? -1 * PX : 0);
    const leg = isWalking ? (frameIndex % 2 === 0 ? 1 : -1) * 2 * PX : 0;

    const cx = Math.floor(w / 2);
    const cy = Math.floor(h / 2) + bob;

    const isFacingUp = dir === 3 || dir === 4 || dir === 5;
    const isFacingRight = dir === 1 || dir === 2 || dir === 3;
    const isFacingLeft = dir === 5 || dir === 6 || dir === 7;

    // 1. Contorno & Mantello Posteriore
    ctx.fillStyle = PALETTE.outline;
    ctx.fillRect(cx - 6 * PX, cy - 4 * PX, 12 * PX, 13 * PX);
    ctx.fillStyle = PALETTE.cloakDark;
    ctx.fillRect(cx - 5 * PX, cy - 3 * PX, 10 * PX, 11 * PX);

    // 2. Stivali e Gambe
    ctx.fillStyle = PALETTE.outline;
    ctx.fillRect(cx - 4 * PX - 1, cy + 6 * PX + leg - 1, 3 * PX + 2, 4 * PX + 2);
    ctx.fillRect(cx + 1 * PX - 1, cy + 6 * PX - leg - 1, 3 * PX + 2, 4 * PX + 2);
    ctx.fillStyle = PALETTE.boots;
    ctx.fillRect(cx - 4 * PX, cy + 6 * PX + leg, 3 * PX, 4 * PX);
    ctx.fillRect(cx + 1 * PX, cy + 6 * PX - leg, 3 * PX, 4 * PX);

    // 3. Tunica e Cintura
    ctx.fillStyle = PALETTE.cloakMain;
    ctx.fillRect(cx - 4 * PX, cy - 4 * PX, 8 * PX, 10 * PX);
    ctx.fillStyle = PALETTE.cloakLight;
    ctx.fillRect(isFacingLeft ? cx - 4 * PX : cx + 2 * PX, cy - 4 * PX, 2 * PX, 10 * PX);

    // Cintura dorata
    ctx.fillStyle = PALETTE.belt;
    ctx.fillRect(cx - 4 * PX, cy + 2 * PX, 8 * PX, 2 * PX);
    ctx.fillStyle = PALETTE.buckle;
    ctx.fillRect(cx - 1 * PX, cy + 2 * PX, 2 * PX, 2 * PX);

    // 4. Testa e Capelli
    ctx.fillStyle = PALETTE.outline;
    ctx.fillRect(cx - 5 * PX, cy - 12 * PX, 10 * PX, 8 * PX);
    ctx.fillStyle = PALETTE.hair;
    ctx.fillRect(cx - 4 * PX, cy - 11 * PX, 8 * PX, 7 * PX);
    ctx.fillStyle = PALETTE.hairShadow;
    ctx.fillRect(cx - 4 * PX, cy - 6 * PX, 8 * PX, 2 * PX);

    // 5. Viso (se non guarda a nord)
    if (!isFacingUp) {
      ctx.fillStyle = PALETTE.skin;
      ctx.fillRect(cx - 3 * PX, cy - 9 * PX, 6 * PX, 5 * PX);
      ctx.fillStyle = PALETTE.skinShadow;
      ctx.fillRect(cx - 3 * PX, cy - 5 * PX, 6 * PX, 1 * PX);

      // Occhi
      ctx.fillStyle = '#0f172a';
      if (isFacingRight) {
        ctx.fillRect(cx + 1 * PX, cy - 8 * PX, 2 * PX, 2 * PX);
      } else if (isFacingLeft) {
        ctx.fillRect(cx - 3 * PX, cy - 8 * PX, 2 * PX, 2 * PX);
      } else {
        ctx.fillRect(cx - 2 * PX, cy - 8 * PX, 1.5 * PX, 2 * PX);
        ctx.fillRect(cx + 1 * PX, cy - 8 * PX, 1.5 * PX, 2 * PX);
      }
    }

    // 6. Cappuccio Arcano
    ctx.fillStyle = PALETTE.cloakMain;
    ctx.fillRect(cx - 5 * PX, cy - 13 * PX, 10 * PX, 3 * PX);
    ctx.fillStyle = PALETTE.cloakLight;
    ctx.fillRect(cx - 4 * PX, cy - 14 * PX, 8 * PX, 2 * PX);

    // 7. Bastone Arcano con Gemma Celestiale
    const staffX = isFacingLeft ? cx - 8 * PX : cx + 6 * PX;
    const staffY = cy - 9 * PX;

    // Asta di legno
    ctx.fillStyle = PALETTE.outline;
    ctx.fillRect(staffX - 1, staffY - 1, 2 * PX + 2, 16 * PX + 2);
    ctx.fillStyle = PALETTE.staffWood;
    ctx.fillRect(staffX, staffY, 2 * PX, 16 * PX);
    ctx.fillStyle = PALETTE.staffLight;
    ctx.fillRect(staffX, staffY, 1 * PX, 16 * PX);

    // Gemma di mana con alone luminoso
    ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.fillRect(staffX - 2 * PX, staffY - 3 * PX, 6 * PX, 6 * PX);
    ctx.fillStyle = PALETTE.gemGlow;
    ctx.fillRect(staffX - 1 * PX, staffY - 2 * PX, 4 * PX, 4 * PX);
    ctx.fillStyle = PALETTE.gemCore;
    ctx.fillRect(staffX, staffY - 1 * PX, 2 * PX, 2 * PX);

    return canvas;
  }

  function drawShadow(ctx, x, y, radius = 10) {
    ctx.save();
    ctx.fillStyle = 'rgba(8, 12, 20, 0.45)';
    ctx.beginPath();
    ctx.ellipse(Math.round(x), Math.round(y), radius * PX, (radius * 0.42) * PX, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function renderSlimeFrame(type = 'forest', frameIndex = 0) {
    const w = 22 * PX;
    const h = 20 * PX;
    const { canvas, ctx } = createOffscreen(w, h);

    let cOutline = '#052e16', cBase = '#16a34a', cLight = '#4ade80', cHighlight = '#bbf7d0';
    if (type === 'water') {
      cOutline = '#082f49'; cBase = '#0284c7'; cLight = '#38bdf8'; cHighlight = '#bae6fd';
    } else if (type === 'ice') {
      cOutline = '#1e293b'; cBase = '#93c5fd'; cLight = '#dbeafe'; cHighlight = '#ffffff';
    } else if (type === 'sand') {
      cOutline = '#78350f'; cBase = '#d97706'; cLight = '#fbbf24'; cHighlight = '#fef08a';
    } else if (type === 'magma') {
      cOutline = '#451a03'; cBase = '#dc2626'; cLight = '#f97316'; cHighlight = '#fde047';
    }

    const cx = Math.floor(w / 2);
    // Animazione di squish/bounce (0: normale, 1: schiacciato a terra, 2: allungato in aria, 3: ritorno)
    let sx = 0;
    let sy = 0;
    let yOff = 0;
    if (frameIndex === 1) {
      sx = 2 * PX;
      sy = -2 * PX;
      yOff = 2 * PX;
    } else if (frameIndex === 2) {
      sx = -1 * PX;
      sy = 3 * PX;
      yOff = -3 * PX;
    }

    const bx = cx - 7 * PX - sx / 2;
    const by = h - 14 * PX - sy + yOff;
    const bw = 14 * PX + sx;
    const bh = 10 * PX + sy;

    // Slime disegnato in pixel-art puro con fillRect (compatibile al 100% senza roundRect)
    const rx = Math.round(bx);
    const ry = Math.round(by);
    const rw = Math.round(bw);
    const rh = Math.round(bh);

    // 1. Contorno nero/scuro
    ctx.fillStyle = cOutline;
    ctx.fillRect(rx + 2 * PX, ry, rw - 4 * PX, rh);
    ctx.fillRect(rx, ry + 2 * PX, rw, rh - 2 * PX);
    ctx.fillRect(rx + 1 * PX, ry + 1 * PX, rw - 2 * PX, rh - 1 * PX);

    // 2. Corpo gelatinoso
    ctx.fillStyle = cBase;
    ctx.fillRect(rx + 2 * PX, ry + 1 * PX, rw - 4 * PX, rh - 2 * PX);
    ctx.fillRect(rx + 1 * PX, ry + 2 * PX, rw - 2 * PX, rh - 3 * PX);

    // 3. Riflesso superiore lucido
    ctx.fillStyle = cLight;
    ctx.fillRect(rx + 3 * PX, ry + 2 * PX, rw - 6 * PX, 2 * PX);
    ctx.fillStyle = cHighlight;
    ctx.fillRect(rx + 4 * PX, ry + 2 * PX, 3 * PX, 1 * PX);

    // 4. Occhietti carini e riflesso luminoso
    const eyeY = ry + Math.floor(rh * 0.42);
    ctx.fillStyle = cOutline;
    ctx.fillRect(cx - 4 * PX, eyeY, 2 * PX, 3 * PX);
    ctx.fillRect(cx + 2 * PX, eyeY, 2 * PX, 3 * PX);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 4 * PX, eyeY, 1 * PX, 1 * PX);
    ctx.fillRect(cx + 2 * PX, eyeY, 1 * PX, 1 * PX);

    return canvas;
  }

  function renderSkeletonFrame(dir, isWalking, frameIndex) {
    const w = 24 * PX;
    const h = 28 * PX;
    const { canvas, ctx } = createOffscreen(w, h);

    const cx = Math.floor(w / 2);
    const bob = isWalking ? (frameIndex % 2 === 1 ? -1 * PX : 0) : 0;
    const cy = Math.floor(h / 2) + bob;
    const leg = isWalking ? (frameIndex % 2 === 0 ? 1 : -1) * 2 * PX : 0;

    const isFacingLeft = dir === 5 || dir === 6 || dir === 7;

    // 1. Gambe ossee
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx - 3 * PX - 1, cy + 5 * PX + leg - 1, 2 * PX + 2, 5 * PX + 2);
    ctx.fillRect(cx + 1 * PX - 1, cy + 5 * PX - leg - 1, 2 * PX + 2, 5 * PX + 2);

    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(cx - 3 * PX, cy + 5 * PX + leg, 2 * PX, 5 * PX);
    ctx.fillRect(cx + 1 * PX, cy + 5 * PX - leg, 2 * PX, 5 * PX);

    // 2. Gabbia toracica scheletrica
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx - 4 * PX - 1, cy - 3 * PX - 1, 8 * PX + 2, 8 * PX + 2);
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(cx - 4 * PX, cy - 3 * PX, 8 * PX, 8 * PX);

    // Fessure costole scure
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(cx - 3 * PX, cy - 1 * PX, 6 * PX, 1 * PX);
    ctx.fillRect(cx - 3 * PX, cy + 1 * PX, 6 * PX, 1 * PX);
    ctx.fillRect(cx - 2 * PX, cy + 3 * PX, 4 * PX, 1 * PX);

    // 3. Teschio con elmo di ferro arrugginito
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx - 4 * PX - 1, cy - 11 * PX - 1, 8 * PX + 2, 8 * PX + 2);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(cx - 4 * PX, cy - 11 * PX, 8 * PX, 8 * PX);

    // Elmo di ferro consumato
    ctx.fillStyle = '#475569';
    ctx.fillRect(cx - 5 * PX, cy - 13 * PX, 10 * PX, 4 * PX);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(cx - 4 * PX, cy - 12 * PX, 8 * PX, 1 * PX);
    // Corno/cresta elmo
    ctx.fillStyle = '#78350f';
    ctx.fillRect(cx - 1 * PX, cy - 15 * PX, 2 * PX, 2 * PX);

    // Occhiaie sinistre con bagliore rosso
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx - 3 * PX, cy - 8 * PX, 2 * PX, 2 * PX);
    ctx.fillRect(cx + 1 * PX, cy - 8 * PX, 2 * PX, 2 * PX);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(cx - 2 * PX, cy - 8 * PX, 1 * PX, 1 * PX);
    ctx.fillRect(cx + 2 * PX, cy - 8 * PX, 1 * PX, 1 * PX);

    // Denti
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx - 2 * PX, cy - 4 * PX, 4 * PX, 1 * PX);

    // 4. Spada arrugginita
    const swordX = isFacingLeft ? cx - 8 * PX : cx + 6 * PX;
    const swordY = cy - 6 * PX;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(swordX - 1, swordY - 1, 2 * PX + 2, 12 * PX + 2);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(swordX, swordY, 2 * PX, 12 * PX);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(swordX, swordY, 1 * PX, 12 * PX);
    // Elsa
    ctx.fillStyle = '#9a3412';
    ctx.fillRect(swordX - 2 * PX, swordY + 8 * PX, 6 * PX, 2 * PX);

    return canvas;
  }

  function renderGemFrame(color = 'cyan', frameIndex = 0) {
    const w = 14 * PX;
    const h = 16 * PX;
    const { canvas, ctx } = createOffscreen(w, h);

    const cx = Math.floor(w / 2);
    const cy = Math.floor(h / 2);

    const isEmerald = color === 'emerald';
    const cDark = isEmerald ? '#064e3b' : '#0369a1';
    const cMain = isEmerald ? '#10b981' : '#38bdf8';
    const cBright = isEmerald ? '#a7f3d0' : '#e0f2fe';

    // Cristallo romboidale sfaccettato
    ctx.fillStyle = '#090d16';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6 * PX);
    ctx.lineTo(cx + 5 * PX, cy);
    ctx.lineTo(cx, cy + 6 * PX);
    ctx.lineTo(cx - 5 * PX, cy);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = cDark;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 5 * PX);
    ctx.lineTo(cx + 4 * PX, cy);
    ctx.lineTo(cx, cy + 5 * PX);
    ctx.lineTo(cx - 4 * PX, cy);
    ctx.closePath();
    ctx.fill();

    // Faccetta superiore lucida
    ctx.fillStyle = cMain;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 5 * PX);
    ctx.lineTo(cx + 4 * PX, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx - 4 * PX, cy);
    ctx.closePath();
    ctx.fill();

    // Riflesso brillante
    ctx.fillStyle = cBright;
    ctx.fillRect(cx - 1 * PX, cy - 3 * PX, 2 * PX, 3 * PX);

    return canvas;
  }

  function getHeroSprite(dir, isWalking, frame) {
    const key = `hero_${dir}_${isWalking ? 1 : 0}_${frame}`;
    if (!cache.has(key)) {
      cache.set(key, renderHeroFrame(dir, isWalking, frame));
    }
    return cache.get(key);
  }

  function getSlimeSprite(type, frame) {
    const key = `slime_${type}_${frame}`;
    if (!cache.has(key)) {
      cache.set(key, renderSlimeFrame(type, frame));
    }
    return cache.get(key);
  }

  function getSkeletonSprite(dir, isWalking, frame) {
    const key = `skel_${dir}_${isWalking ? 1 : 0}_${frame}`;
    if (!cache.has(key)) {
      cache.set(key, renderSkeletonFrame(dir, isWalking, frame));
    }
    return cache.get(key);
  }

  function getGemSprite(color, frame = 0) {
    const key = `gem_${color}_${frame}`;
    if (!cache.has(key)) {
      cache.set(key, renderGemFrame(color, frame));
    }
    return cache.get(key);
  }

  return {
    PX,
    dirFromAngle,
    getHeroSprite,
    getSlimeSprite,
    getSkeletonSprite,
    getGemSprite,
    drawShadow
  };
})();

