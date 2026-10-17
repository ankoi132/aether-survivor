/**
 * core/sprites.js - Sistema Grafico Pixel Art Conforme 32x32
 * Supporta: Eroi, Fabbri NPC, Scheletri, Orchi, Pipistrelli, Boss maestosi dedicati e Slime classici.
 */

export const Sprites = (() => {
  const PX = 2; // Pixel art scaling factor nativo (1 px di sprite = 2 px di canvas)
  const cache = new Map();

  // Mappa degli asset grafici 16x20 / 32x32
  const ASSETS = {
    // Eroi (3 frame x 4 direzioni)
    hero_adventurer: 'assets/sprites/hero/hero_adventurer.png',
    hero_knight: 'assets/sprites/hero/hero_knight.png',
    hero_mage: 'assets/sprites/hero/hero_mage.png',

    // Fabbri NPC dei 6 Villaggi
    bs_citadel: 'assets/sprites/npcs/blacksmith_thorgar.png',
    bs_waterfall: 'assets/sprites/npcs/blacksmith_ronald.png',
    bs_frostpeak: 'assets/sprites/npcs/blacksmith_vorn.png',
    bs_oasis: 'assets/sprites/npcs/blacksmith_rashid.png',
    bs_cineris: 'assets/sprites/npcs/blacksmith_ignis.png',
    bs_sylva: 'assets/sprites/npcs/blacksmith_elora.png',

    // Scheletro Guardiano (Skeleton01)
    skel_walk: 'assets/sprites/skeleton/skel_walk.png',
    skel_idle: 'assets/sprites/skeleton/skel_idle.png',
    skel_die: 'assets/sprites/skeleton/skel_die.png',
    skel_attack: 'assets/sprites/skeleton/skel_attack.png',

    // Orco Guerriero (Orc01)
    orc_front_walk: 'assets/sprites/orc/orc_front_walk.png',
    orc_front_idle: 'assets/sprites/orc/orc_front_idle.png',
    orc_front_die: 'assets/sprites/orc/orc_front_die.png',

    // Pipistrello dell'Ombra (Bat01)
    bat_front_walk: 'assets/sprites/bat/bat_front_walk.png',
    bat_front_idle: 'assets/sprites/bat/bat_front_idle.png',
    bat_front_die: 'assets/sprites/bat/bat_front_die.png'
  };

  const images = {};
  let assetsLoaded = false;

  function loadAssets() {
    if (typeof Image === 'undefined') return;
    let pending = Object.keys(ASSETS).length;
    for (const [key, src] of Object.entries(ASSETS)) {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        pending--;
        if (pending <= 0) assetsLoaded = true;
      };
      img.onerror = () => {
        pending--;
      };
      images[key] = img;
    }
  }

  loadAssets();

  function isReady(key) {
    const img = images[key];
    return img && img.complete && img.naturalWidth > 0;
  }

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

  // =========================================================================
  // OMBRA MORBIDA E CALIBRATA (Appoggia i personaggi perfettamente al suolo)
  // =========================================================================
  function drawShadow(ctx, x, y, radius = 7) {
    ctx.save();
    ctx.fillStyle = 'rgba(10, 15, 26, 0.22)';
    ctx.beginPath();
    ctx.ellipse(Math.round(x), Math.round(y), Math.round(radius * 1.3), Math.round(radius * 0.52), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // =========================================================================
  // 1. PERSONAGGIO PRINCIPALE (Sprite 16x20 scalato a 32x40 con PX=2)
  // =========================================================================
  function drawHero(ctx, x, y, dir, isWalking, frame, weapon = 'staff', animTimer = 0) {
    if (isReady('hero_adventurer')) {
      const img = images['hero_adventurer'];
      // Mapping direzioni (Row 0: Sud/Down, Row 1: Ovest/Left, Row 2: Est/Right, Row 3: Nord/Up)
      let row = 0;
      if (dir === 4 || dir === 3 || dir === 5) row = 3;
      else if (dir === 2 || dir === 1) row = 2;
      else if (dir === 6 || dir === 7) row = 1;
      else row = 0;

      // Colonna camminata: [1, 0, 1, 2]
      let col = 1;
      let bob = 0;
      if (isWalking) {
        const walkCycle = [1, 0, 1, 2];
        const step = Math.floor(animTimer * 1.5) % 4;
        col = walkCycle[step];
        bob = (col === 1 ? -1 : 0) * PX;
      } else {
        bob = Math.round(Math.sin(animTimer * 2.5) * 0.5 * PX);
      }

      const sw = 16;
      const sh = 20;
      const dw = 16 * PX; // 32px
      const dh = 20 * PX; // 40px
      const dx = Math.round(x - dw / 2);
      const dy = Math.round(y - dh + 2) + bob;

      // Se guarda a Nord, disegna prima l'arma (dietro al corpo)
      if (row === 3) {
        drawEquippedWeapon(ctx, x, y, dir, row, weapon, bob, true);
      }

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, col * sw, row * sh, sw, sh, dx, dy, dw, dh);
      ctx.restore();

      // Se guarda verso Sud, Est o Ovest, disegna l'arma tenuta in mano
      if (row !== 3) {
        drawEquippedWeapon(ctx, x, y, dir, row, weapon, bob, false);
      }
      return;
    }

    // Fallback procedurale se l'immagine non è ancora pronta
    const fb = renderHeroFrame(dir, isWalking, frame, weapon);
    ctx.drawImage(fb, Math.round(x - fb.width / 2), Math.round(y - fb.height + 2));
  }

  // =========================================================================
  // ARMA IMPUGNATA IN MANO (Conforme al pixel art 32x32, proporzionata e tenuta salda)
  // =========================================================================
  function drawEquippedWeapon(ctx, x, y, dir, row, weapon, bob = 0, isBehind = false) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Posizionamento esatto della mano rispetto al corpo nei 4 orientamenti
    let handX, handY;
    if (row === 0) { // Sud / Frontale (mano destra a destra dell'eroe)
      handX = Math.round(x + 5 * PX);
      handY = Math.round(y - 8 * PX + bob);
    } else if (row === 1) { // Ovest / Sinistra (mano protesa avanti a sinistra)
      handX = Math.round(x - 5 * PX);
      handY = Math.round(y - 7 * PX + bob);
    } else if (row === 2) { // Est / Destra (mano protesa avanti a destra)
      handX = Math.round(x + 5 * PX);
      handY = Math.round(y - 7 * PX + bob);
    } else { // Nord / Spalle (mano a destra, disegnata dietro al dorso)
      handX = Math.round(x + 5 * PX);
      handY = Math.round(y - 9 * PX + bob);
    }

    if (weapon === 'sword') {
      // 1. Spada d'Acciaio Temprata
      // Impugnatura e pomo in cuoio/oro
      ctx.fillStyle = '#b45309';
      ctx.fillRect(handX - 1 * PX, handY + 1 * PX, 2 * PX, 2 * PX);
      // Elsa trasversale dorata
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(handX - 2 * PX, handY, 4 * PX, 1 * PX);
      // Lama affilata in acciaio lucido (5 pixel di estensione verso l'alto/avanti)
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(handX - 1 * PX, handY - 5 * PX, 2 * PX, 5 * PX);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(handX, handY - 5 * PX, 1 * PX, 5 * PX);
    } else if (weapon === 'bow') {
      // 2. Arco in Legno d'Olmo
      ctx.fillStyle = '#78350f';
      ctx.fillRect(handX, handY - 4 * PX, 1 * PX, 8 * PX);
      ctx.fillRect(handX + (row === 1 ? -1 * PX : 1 * PX), handY - 5 * PX, 1 * PX, 2 * PX);
      ctx.fillRect(handX + (row === 1 ? -1 * PX : 1 * PX), handY + 3 * PX, 1 * PX, 2 * PX);
      // Corda tesa sottile
      ctx.fillStyle = 'rgba(241, 245, 249, 0.75)';
      ctx.fillRect(handX + (row === 1 ? 1 * PX : -1 * PX), handY - 4 * PX, 1, 8 * PX);
    } else {
      // 3. Bastone Arcano con Gemma Elementale
      // Asta sottile in legno sagomato (1 pixel di spessore, lunghezza proporzionata)
      ctx.fillStyle = '#451a03';
      ctx.fillRect(handX, handY - 6 * PX, 1 * PX, 9 * PX);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(handX, handY - 5 * PX, 1 * PX, 7 * PX);
      // Gemma azzurra pulsante sulla sommità (2x2 pixel)
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(handX - 1 * PX, handY - 8 * PX, 3 * PX, 2 * PX);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(handX, handY - 8 * PX, 1 * PX, 2 * PX);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(handX, handY - 7 * PX, 1 * PX, 1 * PX);
    }

    ctx.restore();
  }

  // =========================================================================
  // 2. SCHELETRO GUARDIANO (Sidescroller Anim Sheet completo)
  // =========================================================================
  function drawSkeleton(ctx, x, y, dir, isWalking, frame, isDying = false, deathTimer = 0, deathMaxTimer = 0.36, animTimer = 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Ombra morbida sotto le ossa
    drawShadow(ctx, x, y, 7);

    // Morte: sgretolamento scheletrico al suolo
    if (isDying && isReady('skel_die')) {
      const img = images['skel_die'];
      const p = 1 - Math.max(0, deathTimer / deathMaxTimer);
      const frameIdx = Math.min(5, Math.floor(p * 6));
      const sw = 48, sh = 48;
      const dw = 48, dh = 48;
      ctx.globalAlpha = Math.max(0.1, 1 - p * 0.9);
      ctx.drawImage(img, frameIdx * sw, 0, sw, sh, Math.round(x - dw / 2), Math.round(y - 37), dw, dh);
      ctx.restore();
      return;
    }

    const isFacingWest = dir === 5 || dir === 6 || dir === 7;
    const imgKey = isWalking ? 'skel_walk' : 'skel_idle';

    if (isReady(imgKey)) {
      const img = images[imgKey];
      const maxFrames = isWalking ? 8 : 5;
      const frameIdx = Math.floor(animTimer * (isWalking ? 1.6 : 1.0)) % maxFrames;
      const sw = 48, sh = 48;
      const dw = 48, dh = 48;
      const dx = Math.round(x - dw / 2);
      const dy = Math.round(y - 37);

      if (isFacingWest) {
        ctx.translate(Math.round(x), 0);
        ctx.scale(-1, 1);
        ctx.drawImage(img, frameIdx * sw, 0, sw, sh, -Math.round(dw / 2), dy, dw, dh);
      } else {
        ctx.drawImage(img, frameIdx * sw, 0, sw, sh, dx, dy, dw, dh);
      }

      ctx.restore();
      return;
    }

    ctx.restore();
    const fb = renderSkeletonFrame(dir, isWalking, frame);
    ctx.drawImage(fb, Math.round(x - fb.width / 2), Math.round(y - fb.height + 2));
  }

  // =========================================================================
  // 3. ORCO GUERRIERO (Orc01)
  // =========================================================================
  function drawOrc(ctx, x, y, dir, isWalking, frame, isDying = false, deathTimer = 0, deathMaxTimer = 0.45, animTimer = 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    drawShadow(ctx, x, y, 9);

    if (isDying && isReady('orc_front_die')) {
      const img = images['orc_front_die'];
      const p = 1 - Math.max(0, deathTimer / deathMaxTimer);
      const frameIdx = Math.min(5, Math.floor(p * 6));
      const sw = 48, sh = 48;
      const dw = 48, dh = 48;
      ctx.globalAlpha = Math.max(0.1, 1 - p * 0.9);
      ctx.drawImage(img, frameIdx * sw, 0, sw, sh, Math.round(x - dw / 2), Math.round(y - 37), dw, dh);
      ctx.restore();
      return;
    }

    const imgKey = isWalking ? 'orc_front_walk' : 'orc_front_idle';
    if (isReady(imgKey)) {
      const img = images[imgKey];
      const maxFrames = isWalking ? 10 : 6;
      const frameIdx = Math.floor(animTimer * (isWalking ? 1.8 : 1.0)) % maxFrames;
      const sw = 48, sh = 48;
      const dw = 48, dh = 48;
      const isFacingWest = dir === 5 || dir === 6 || dir === 7;

      if (isFacingWest) {
        ctx.translate(Math.round(x), 0);
        ctx.scale(-1, 1);
        ctx.drawImage(img, frameIdx * sw, 0, sw, sh, -Math.round(dw / 2), Math.round(y - 37), dw, dh);
      } else {
        ctx.drawImage(img, frameIdx * sw, 0, sw, sh, Math.round(x - dw / 2), Math.round(y - 37), dw, dh);
      }
      ctx.restore();
      return;
    }

    ctx.restore();
  }

  // =========================================================================
  // 4. PIPISTRELLO DELL'OMBRA (Bat01)
  // =========================================================================
  function drawBat(ctx, x, y, dir, isWalking, frame, isDying = false, deathTimer = 0, deathMaxTimer = 0.3, animTimer = 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Ombra al suolo morbida
    drawShadow(ctx, x, y, 5);

    const bob = Math.round(Math.sin(animTimer * 7) * 3);
    const flyY = y - 14 + bob;

    if (isDying && isReady('bat_front_die')) {
      const img = images['bat_front_die'];
      const p = 1 - Math.max(0, deathTimer / deathMaxTimer);
      const frameIdx = Math.min(10, Math.floor(p * 11));
      const sw = 32, sh = 32;
      ctx.globalAlpha = Math.max(0.1, 1 - p);
      ctx.drawImage(img, frameIdx * sw, 0, sw, sh, Math.round(x - 16), Math.round(flyY - 16), 32, 32);
      ctx.restore();
      return;
    }

    const imgKey = isWalking ? 'bat_front_walk' : 'bat_front_idle';
    if (isReady(imgKey)) {
      const img = images[imgKey];
      const maxFrames = isWalking ? 4 : 8;
      const frameIdx = Math.floor(animTimer * 6) % maxFrames;
      const sw = 32, sh = 32;
      ctx.drawImage(img, frameIdx * sw, 0, sw, sh, Math.round(x - 16), Math.round(flyY - 16), 32, 32);
      ctx.restore();
      return;
    }

    ctx.restore();
  }

  // =========================================================================
  // 5. FABBRO DEI VILLAGGI (32x32 con Incudine e Tag Trasparente Non Invasivo)
  // =========================================================================
  function drawBlacksmithNPC(ctx, x, y, bsId = 'bs_citadel', playerX = 0, playerY = 0, animTimer = 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const imgKey = bsId || 'bs_citadel';
    const distToPlayer = Math.hypot(playerX - x, playerY - y);

    // 1. Ombre al suolo perfettamente appoggiate
    drawShadow(ctx, x + 3 * PX, y, 7);
    drawShadow(ctx, x - 10 * PX, y, 6);

    // 2. Orientamento: guarda il giocatore se vicino (< 85px), altrimenti guarda l'incudine a sinistra
    let row = 0; // Sud / Down
    if (distToPlayer < 85) {
      const dx = playerX - x;
      const dy = playerY - y;
      if (Math.abs(dx) > Math.abs(dy)) {
        row = dx > 0 ? 2 : 1; // Destra o Sinistra
      } else {
        row = dy > 0 ? 0 : 3; // Giù o Su
      }
    } else {
      row = 1; // Guarda verso l'incudine a sinistra
    }

    // 3. Rendering Fabbro (16x20 scalato a 32x40 con PX=2)
    if (isReady(imgKey)) {
      const img = images[imgKey];
      const isHammering = distToPlayer >= 85;
      const hammerCycle = [1, 0, 1, 2];
      const col = isHammering ? hammerCycle[Math.floor(animTimer * 2) % 4] : 1;

      const sw = 16, sh = 20;
      const dw = 16 * PX, dh = 20 * PX;
      const fx = Math.round(x - dw / 2 + 3 * PX);
      const fy = Math.round(y - dh + 2);

      ctx.drawImage(img, col * sw, row * sh, sw, sh, fx, fy, dw, dh);

      // Scintille periodiche del martello sull'incudine
      if (isHammering && col === 2 && Math.random() < 0.25) {
        ctx.fillStyle = '#fde047';
        ctx.fillRect(Math.round(x - 9 * PX), Math.round(y - 7 * PX), 2 * PX, 2 * PX);
        ctx.fillStyle = '#f97316';
        ctx.fillRect(Math.round(x - 8 * PX), Math.round(y - 9 * PX), 1.5 * PX, 1.5 * PX);
      }
    }

    // 4. Incudine pesante in ferro massiccio poggiata al suolo
    const anvilX = Math.round(x - 14 * PX);
    const anvilY = Math.round(y - 8 * PX);
    const anvilW = 10 * PX;
    const anvilH = 8 * PX;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(anvilX - 1, anvilY - 1, anvilW + 2, anvilH + 2);
    ctx.fillStyle = '#475569';
    ctx.fillRect(anvilX, anvilY, anvilW, anvilH);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(anvilX + 1 * PX, anvilY + 1 * PX, anvilW - 2 * PX, 2 * PX); // Piano superiore lucido
    ctx.fillStyle = '#334155';
    ctx.fillRect(anvilX + 3 * PX, anvilY + 3 * PX, 4 * PX, anvilH - 3 * PX); // Fusto centrale

    // Lama incandescente sopra l'incudine
    ctx.fillStyle = '#f97316';
    ctx.fillRect(anvilX + 2 * PX, anvilY + 1 * PX, 6 * PX, 1.5 * PX);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(anvilX + 3 * PX, anvilY + 1 * PX, 3 * PX, 1 * PX);

    // 5. Cartiglio interattivo: posizionato alto sopra la testa, compatto e traslucido
    const tagW = 66;
    const tagH = 15;
    const tagY = Math.round(y - 48);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.fillRect(Math.round(x - tagW / 2), tagY, tagW, tagH);
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.65)';
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(x - tagW / 2), tagY, tagW, tagH);

    ctx.font = '500 10px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fde047';
    ctx.fillText('🔨 Fabbro [E]', Math.round(x), tagY + 11);

    ctx.restore();
  }

  // =========================================================================
  // 6. BOSS DEL MONDO APERTO (Modelli Dedicati Nativi 32x32, Senza Zoom Sgranato)
  // =========================================================================

  // A. Demone / Titano di Magma (Caldera Vulcanica)
  function renderBossMagmaFrame(animTimer) {
    const w = 32 * PX, h = 32 * PX;
    const { canvas, ctx } = createOffscreen(w, h);
    const cx = Math.floor(w / 2);
    const cy = h - 2 * PX;
    const bob = Math.round(Math.sin(animTimer * 3) * 1 * PX);

    // Piedi vulcanici poggiati a terra
    ctx.fillStyle = '#09090b';
    ctx.fillRect(cx - 7 * PX, cy - 3 * PX, 5 * PX, 3 * PX);
    ctx.fillRect(cx + 2 * PX, cy - 3 * PX, 5 * PX, 3 * PX);
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(cx - 6 * PX, cy - 1 * PX, 3 * PX, 1 * PX);
    ctx.fillRect(cx + 3 * PX, cy - 1 * PX, 3 * PX, 1 * PX);

    // Gambe
    ctx.fillStyle = '#18181b';
    ctx.fillRect(cx - 6 * PX, cy - 8 * PX + bob, 4 * PX, 6 * PX);
    ctx.fillRect(cx + 2 * PX, cy - 8 * PX + bob, 4 * PX, 6 * PX);

    // Torso corazzato d'ossidiana
    ctx.fillStyle = '#09090b';
    ctx.fillRect(cx - 9 * PX, cy - 18 * PX + bob, 18 * PX, 11 * PX);
    ctx.fillStyle = '#27272a';
    ctx.fillRect(cx - 8 * PX, cy - 17 * PX + bob, 16 * PX, 9 * PX);

    // Nucleo ardente nel petto
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(cx - 4 * PX, cy - 15 * PX + bob, 8 * PX, 6 * PX);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(cx - 3 * PX, cy - 14 * PX + bob, 6 * PX, 4 * PX);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(cx - 1 * PX, cy - 13 * PX + bob, 2 * PX, 2 * PX);

    // Spallacci con colate di magma
    ctx.fillStyle = '#18181b';
    ctx.fillRect(cx - 11 * PX, cy - 18 * PX + bob, 4 * PX, 6 * PX);
    ctx.fillRect(cx + 7 * PX, cy - 18 * PX + bob, 4 * PX, 6 * PX);
    ctx.fillStyle = '#f97316';
    ctx.fillRect(cx - 11 * PX, cy - 14 * PX + bob, 2 * PX, 3 * PX);
    ctx.fillRect(cx + 9 * PX, cy - 14 * PX + bob, 2 * PX, 3 * PX);

    // Braccia e pugni d'ardesia
    ctx.fillStyle = '#27272a';
    ctx.fillRect(cx - 12 * PX, cy - 13 * PX + bob, 3 * PX, 8 * PX);
    ctx.fillRect(cx + 9 * PX, cy - 13 * PX + bob, 3 * PX, 8 * PX);
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(cx - 12 * PX, cy - 7 * PX + bob, 3 * PX, 3 * PX);
    ctx.fillRect(cx + 9 * PX, cy - 7 * PX + bob, 3 * PX, 3 * PX);

    // Teschio demoniaco
    ctx.fillStyle = '#09090b';
    ctx.fillRect(cx - 5 * PX, cy - 25 * PX + bob, 10 * PX, 8 * PX);
    ctx.fillStyle = '#18181b';
    ctx.fillRect(cx - 4 * PX, cy - 24 * PX + bob, 8 * PX, 6 * PX);

    // Occhi fiammeggianti
    ctx.fillStyle = '#fde047';
    ctx.fillRect(cx - 3 * PX, cy - 22 * PX + bob, 2 * PX, 2 * PX);
    ctx.fillRect(cx + 1 * PX, cy - 22 * PX + bob, 2 * PX, 2 * PX);

    // Corna ricurve ardenti
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(cx - 7 * PX, cy - 28 * PX + bob, 3 * PX, 5 * PX);
    ctx.fillRect(cx + 4 * PX, cy - 28 * PX + bob, 3 * PX, 5 * PX);
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(cx - 8 * PX, cy - 30 * PX + bob, 3 * PX, 3 * PX);
    ctx.fillRect(cx + 5 * PX, cy - 30 * PX + bob, 3 * PX, 3 * PX);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(cx - 8 * PX, cy - 31 * PX + bob, 2 * PX, 2 * PX);
    ctx.fillRect(cx + 6 * PX, cy - 31 * PX + bob, 2 * PX, 2 * PX);

    return canvas;
  }

  // B. Golem dei Ghiacci (Vette Innevate)
  function renderBossGolemFrame(animTimer) {
    const w = 32 * PX, h = 32 * PX;
    const { canvas, ctx } = createOffscreen(w, h);
    const cx = Math.floor(w / 2);
    const cy = h - 2 * PX;
    const bob = Math.round(Math.sin(animTimer * 2.5) * 1 * PX);

    // Piedi di roccia permafrost
    ctx.fillStyle = '#334155';
    ctx.fillRect(cx - 7 * PX, cy - 3 * PX, 5 * PX, 3 * PX);
    ctx.fillRect(cx + 2 * PX, cy - 3 * PX, 5 * PX, 3 * PX);

    // Gambe granitiche
    ctx.fillStyle = '#475569';
    ctx.fillRect(cx - 6 * PX, cy - 8 * PX + bob, 4 * PX, 6 * PX);
    ctx.fillRect(cx + 2 * PX, cy - 8 * PX + bob, 4 * PX, 6 * PX);

    // Torso massiccio crio-corazzato
    ctx.fillStyle = '#334155';
    ctx.fillRect(cx - 9 * PX, cy - 18 * PX + bob, 18 * PX, 11 * PX);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(cx - 8 * PX, cy - 17 * PX + bob, 16 * PX, 9 * PX);

    // Glifi crio-azzurri nel petto
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(cx - 4 * PX, cy - 15 * PX + bob, 8 * PX, 5 * PX);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(cx - 3 * PX, cy - 14 * PX + bob, 6 * PX, 3 * PX);
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(cx - 1 * PX, cy - 13 * PX + bob, 2 * PX, 2 * PX);

    // Spuntoni di ghiaccio cristallino sulle spalle
    ctx.fillStyle = '#bae6fd';
    ctx.fillRect(cx - 11 * PX, cy - 20 * PX + bob, 3 * PX, 8 * PX);
    ctx.fillRect(cx + 8 * PX, cy - 20 * PX + bob, 3 * PX, 8 * PX);
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(cx - 10 * PX, cy - 22 * PX + bob, 2 * PX, 3 * PX);
    ctx.fillRect(cx + 8 * PX, cy - 22 * PX + bob, 2 * PX, 3 * PX);

    // Braccia e pugni di pietra
    ctx.fillStyle = '#475569';
    ctx.fillRect(cx - 12 * PX, cy - 13 * PX + bob, 3 * PX, 8 * PX);
    ctx.fillRect(cx + 9 * PX, cy - 13 * PX + bob, 3 * PX, 8 * PX);

    // Testa monolitica
    ctx.fillStyle = '#334155';
    ctx.fillRect(cx - 5 * PX, cy - 25 * PX + bob, 10 * PX, 8 * PX);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(cx - 4 * PX, cy - 24 * PX + bob, 8 * PX, 6 * PX);

    // Fessura oculare azzurro ghiaccio
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(cx - 3 * PX, cy - 22 * PX + bob, 6 * PX, 2 * PX);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 1 * PX, cy - 22 * PX + bob, 2 * PX, 2 * PX);

    // Corona di permafrost
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(cx - 4 * PX, cy - 27 * PX + bob, 8 * PX, 3 * PX);
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(cx - 3 * PX, cy - 28 * PX + bob, 6 * PX, 2 * PX);

    return canvas;
  }

  // C. Colosso delle Dune (Deserto)
  function renderBossDuneFrame(animTimer) {
    const w = 32 * PX, h = 32 * PX;
    const { canvas, ctx } = createOffscreen(w, h);
    const cx = Math.floor(w / 2);
    const cy = h - 2 * PX;
    const bob = Math.round(Math.sin(animTimer * 2.5) * 1 * PX);

    // Piedi corazzati in bronzo e arenaria
    ctx.fillStyle = '#78350f';
    ctx.fillRect(cx - 7 * PX, cy - 3 * PX, 5 * PX, 3 * PX);
    ctx.fillRect(cx + 2 * PX, cy - 3 * PX, 5 * PX, 3 * PX);

    // Gambe con fasce desertiche
    ctx.fillStyle = '#b45309';
    ctx.fillRect(cx - 6 * PX, cy - 8 * PX + bob, 4 * PX, 6 * PX);
    ctx.fillRect(cx + 2 * PX, cy - 8 * PX + bob, 4 * PX, 6 * PX);

    // Pettorale dorato del deserto
    ctx.fillStyle = '#78350f';
    ctx.fillRect(cx - 9 * PX, cy - 18 * PX + bob, 18 * PX, 11 * PX);
    ctx.fillStyle = '#d97706';
    ctx.fillRect(cx - 8 * PX, cy - 17 * PX + bob, 16 * PX, 9 * PX);

    // Occhio di Ra dorato
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(cx - 4 * PX, cy - 15 * PX + bob, 8 * PX, 5 * PX);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(cx - 2 * PX, cy - 14 * PX + bob, 4 * PX, 3 * PX);

    // Spallacci ornati
    ctx.fillStyle = '#92400e';
    ctx.fillRect(cx - 11 * PX, cy - 18 * PX + bob, 4 * PX, 6 * PX);
    ctx.fillRect(cx + 7 * PX, cy - 18 * PX + bob, 4 * PX, 6 * PX);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(cx - 10 * PX, cy - 16 * PX + bob, 2 * PX, 3 * PX);
    ctx.fillRect(cx + 8 * PX, cy - 16 * PX + bob, 2 * PX, 3 * PX);

    // Braccia e scimitarre
    ctx.fillStyle = '#b45309';
    ctx.fillRect(cx - 12 * PX, cy - 13 * PX + bob, 3 * PX, 8 * PX);
    ctx.fillRect(cx + 9 * PX, cy - 13 * PX + bob, 3 * PX, 8 * PX);
    // Khopesh ricurve
    ctx.fillStyle = '#facc15';
    ctx.fillRect(cx - 14 * PX, cy - 11 * PX + bob, 3 * PX, 6 * PX);
    ctx.fillRect(cx + 11 * PX, cy - 11 * PX + bob, 3 * PX, 6 * PX);

    // Elmo a sciarpa / maschera faraonica
    ctx.fillStyle = '#78350f';
    ctx.fillRect(cx - 5 * PX, cy - 25 * PX + bob, 10 * PX, 8 * PX);
    ctx.fillStyle = '#d97706';
    ctx.fillRect(cx - 4 * PX, cy - 24 * PX + bob, 8 * PX, 6 * PX);

    // Fessura ambra
    ctx.fillStyle = '#fde047';
    ctx.fillRect(cx - 3 * PX, cy - 22 * PX + bob, 6 * PX, 2 * PX);

    // Copricapo scarabeo
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(cx - 4 * PX, cy - 27 * PX + bob, 8 * PX, 3 * PX);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(cx - 2 * PX, cy - 29 * PX + bob, 4 * PX, 3 * PX);

    return canvas;
  }

  // D. Treant Ancestrale (Foresta)
  function renderBossTreantFrame(animTimer) {
    const w = 32 * PX, h = 32 * PX;
    const { canvas, ctx } = createOffscreen(w, h);
    const cx = Math.floor(w / 2);
    const cy = h - 2 * PX;
    const bob = Math.round(Math.sin(animTimer * 2) * 1 * PX);

    // Radici nodose piantate nel terreno
    ctx.fillStyle = '#271202';
    ctx.fillRect(cx - 7 * PX, cy - 3 * PX, 5 * PX, 3 * PX);
    ctx.fillRect(cx + 2 * PX, cy - 3 * PX, 5 * PX, 3 * PX);

    // Tronco d'albero antico
    ctx.fillStyle = '#451a03';
    ctx.fillRect(cx - 9 * PX, cy - 18 * PX + bob, 18 * PX, 16 * PX);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(cx - 8 * PX, cy - 17 * PX + bob, 16 * PX, 14 * PX);

    // Muschio e linfa vitale
    ctx.fillStyle = '#166534';
    ctx.fillRect(cx - 6 * PX, cy - 14 * PX + bob, 4 * PX, 6 * PX);
    ctx.fillRect(cx + 2 * PX, cy - 15 * PX + bob, 5 * PX, 7 * PX);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(cx - 1 * PX, cy - 12 * PX + bob, 2 * PX, 4 * PX);

    // Rami/braccia
    ctx.fillStyle = '#451a03';
    ctx.fillRect(cx - 12 * PX, cy - 14 * PX + bob, 3 * PX, 8 * PX);
    ctx.fillRect(cx + 9 * PX, cy - 14 * PX + bob, 3 * PX, 8 * PX);
    ctx.fillStyle = '#16a34a';
    ctx.fillRect(cx - 13 * PX, cy - 8 * PX + bob, 4 * PX, 4 * PX);
    ctx.fillRect(cx + 9 * PX, cy - 8 * PX + bob, 4 * PX, 4 * PX);

    // Occhi spirituali di linfa smeraldo
    ctx.fillStyle = '#14532d';
    ctx.fillRect(cx - 4 * PX, cy - 21 * PX + bob, 3 * PX, 3 * PX);
    ctx.fillRect(cx + 1 * PX, cy - 21 * PX + bob, 3 * PX, 3 * PX);
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(cx - 3 * PX, cy - 20 * PX + bob, 2 * PX, 2 * PX);
    ctx.fillRect(cx + 2 * PX, cy - 20 * PX + bob, 2 * PX, 2 * PX);

    // Chioma fogliare maestosa
    ctx.fillStyle = '#15803d';
    ctx.fillRect(cx - 10 * PX, cy - 29 * PX + bob, 20 * PX, 9 * PX);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(cx - 8 * PX, cy - 31 * PX + bob, 16 * PX, 5 * PX);
    ctx.fillStyle = '#86efac';
    ctx.fillRect(cx - 4 * PX, cy - 31 * PX + bob, 8 * PX, 2 * PX);

    return canvas;
  }

  function drawBoss(ctx, enemy, dt = 0) {
    const animTimer = enemy.animTimer || (Date.now() / 1000);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Ombra calibrata morbida appoggiata al terreno
    drawShadow(ctx, enemy.x, enemy.y, 11);

    // 2. Rendering del Boss 32x32 dedicato nativo
    let bossCanvas;
    const kind = enemy.kind;
    const cacheKey = `boss_${kind}_${Math.floor(animTimer * 2) % 2}`;

    if (!cache.has(cacheKey)) {
      if (kind === 'boss_magma') {
        bossCanvas = renderBossMagmaFrame(animTimer);
      } else if (kind === 'boss_golem') {
        bossCanvas = renderBossGolemFrame(animTimer);
      } else if (kind === 'boss_scorpion') {
        bossCanvas = renderBossDuneFrame(animTimer);
      } else {
        bossCanvas = renderBossTreantFrame(animTimer);
      }
      cache.set(cacheKey, bossCanvas);
    } else {
      bossCanvas = cache.get(cacheKey);
    }

    const bw = bossCanvas.width;
    const bh = bossCanvas.height;
    // Il punto di appoggio dei piedi è a fondo frame: poggiano esattamente su enemy.y
    ctx.drawImage(bossCanvas, Math.round(enemy.x - bw / 2), Math.round(enemy.y - bh + 4));

    ctx.restore();
  }

  // =========================================================================
  // 7. SLIME (Fedelmente Ripristinato al Design Morbido, Lucido e Occhi Vivaci)
  // =========================================================================
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
    // Animazione di squish/bounce elastica (0: normale, 1: schiacciato a terra, 2: allungato in aria)
    let sx = 0, sy = 0, yOff = 0;
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

    const rx = Math.round(bx);
    const ry = Math.round(by);
    const rw = Math.round(bw);
    const rh = Math.round(bh);

    // 1. Contorno sagomato pixel art (con angoli arrotondati)
    ctx.fillStyle = cOutline;
    ctx.fillRect(rx + 2 * PX, ry, rw - 4 * PX, rh);
    ctx.fillRect(rx, ry + 2 * PX, rw, rh - 2 * PX);
    ctx.fillRect(rx + 1 * PX, ry + 1 * PX, rw - 2 * PX, rh - 1 * PX);

    // 2. Corpo gelatinoso bombato
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

  function getSlimeSprite(type, frame) {
    const key = `slime_${type}_${frame}`;
    if (!cache.has(key)) {
      cache.set(key, renderSlimeFrame(type, frame));
    }
    return cache.get(key);
  }

  // =========================================================================
  // 8. GEMME E PICKUP
  // =========================================================================
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

    ctx.fillStyle = cMain;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 5 * PX);
    ctx.lineTo(cx + 3 * PX, cy);
    ctx.lineTo(cx, cy - 1 * PX);
    ctx.lineTo(cx - 3 * PX, cy);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = cBright;
    ctx.fillRect(cx - 1 * PX, cy - 3 * PX, 2 * PX, 3 * PX);

    return canvas;
  }

  function getGemSprite(color, frame = 0) {
    const key = `gem_${color}_${frame}`;
    if (!cache.has(key)) {
      cache.set(key, renderGemFrame(color, frame));
    }
    return cache.get(key);
  }

  // Fallback procedurale per Hero se asset in caricamento
  const PALETTE = {
    outline: '#090d16',
    cloakMain: '#312e81',
    skin: '#fde047'
  };

  function renderHeroFrame(dir, isWalking, frameIndex, weapon = 'staff') {
    const w = 16 * PX;
    const h = 20 * PX;
    const { canvas, ctx } = createOffscreen(w, h);
    const cx = Math.floor(w / 2);
    const cy = Math.floor(h / 2);

    ctx.fillStyle = PALETTE.outline;
    ctx.fillRect(cx - 4 * PX, cy - 8 * PX, 8 * PX, 16 * PX);
    ctx.fillStyle = PALETTE.cloakMain;
    ctx.fillRect(cx - 3 * PX, cy - 7 * PX, 6 * PX, 14 * PX);
    ctx.fillStyle = PALETTE.skin;
    ctx.fillRect(cx - 2 * PX, cy - 6 * PX, 4 * PX, 4 * PX);
    return canvas;
  }

  function renderSkeletonFrame(dir, isWalking, frameIndex) {
    const w = 24 * PX;
    const h = 28 * PX;
    const { canvas, ctx } = createOffscreen(w, h);
    const cx = Math.floor(w / 2);
    const cy = Math.floor(h / 2);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx - 4 * PX, cy - 10 * PX, 8 * PX, 18 * PX);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(cx - 3 * PX, cy - 9 * PX, 6 * PX, 16 * PX);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(cx - 2 * PX, cy - 7 * PX, 2, 2);
    ctx.fillRect(cx + 1 * PX, cy - 7 * PX, 2, 2);
    return canvas;
  }

  function getHeroSprite(dir, isWalking, frame, weapon = 'staff') {
    const key = `hero_${weapon}_${dir}_${isWalking ? 1 : 0}_${frame}`;
    if (!cache.has(key)) {
      const { canvas, ctx } = createOffscreen(32, 40);
      drawHero(ctx, 16, 38, dir, isWalking, frame, weapon, 0);
      cache.set(key, canvas);
    }
    return cache.get(key);
  }

  function getSkeletonSprite(dir, isWalking, frame) {
    const key = `skel_${dir}_${isWalking ? 1 : 0}_${frame}`;
    if (!cache.has(key)) {
      const { canvas, ctx } = createOffscreen(48, 48);
      drawSkeleton(ctx, 24, 37, dir, isWalking, frame, false, 0, 0.36, 0);
      cache.set(key, canvas);
    }
    return cache.get(key);
  }

  return {
    PX,
    dirFromAngle,
    drawShadow,
    drawHero,
    getHeroSprite,
    drawSkeleton,
    getSkeletonSprite,
    drawOrc,
    drawBat,
    drawBoss,
    drawBlacksmithNPC,
    getSlimeSprite,
    getGemSprite,
    loadAssets
  };
})();
