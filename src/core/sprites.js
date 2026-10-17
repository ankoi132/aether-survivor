/**
 * core/sprites.js - Sistema Grafico Avanzato per Eroi, NPC, Mobs e Boss (32x32 Pixel Art)
 * Ispirato agli asset di SuperRetroWorld, Skeleton01, Orc01 e Bat01.
 */

export const Sprites = (() => {
  const PX = 2; // Pixel art scaling factor
  const cache = new Map();

  // Mappa degli asset grafici 32x32 e spritesheet
  const ASSETS = {
    // Eroi
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

    // Scheletro Guardiano (TopDown)
    skel_front_walk: 'assets/sprites/skeleton/skel_front_walk.png',
    skel_back_walk: 'assets/sprites/skeleton/skel_back_walk.png',
    skel_right_walk: 'assets/sprites/skeleton/skel_right_walk.png',
    skel_front_idle: 'assets/sprites/skeleton/skel_front_idle.png',
    skel_back_idle: 'assets/sprites/skeleton/skel_back_idle.png',
    skel_right_idle: 'assets/sprites/skeleton/skel_right_idle.png',
    skel_front_die: 'assets/sprites/skeleton/skel_front_die.png',
    skel_front_attack: 'assets/sprites/skeleton/skel_front_attack.png',

    // Orco Guerriero / Warlord (TopDown)
    orc_front_walk: 'assets/sprites/orc/orc_front_walk.png',
    orc_back_walk: 'assets/sprites/orc/orc_back_walk.png',
    orc_right_walk: 'assets/sprites/orc/orc_right_walk.png',
    orc_front_idle: 'assets/sprites/orc/orc_front_idle.png',
    orc_front_attack: 'assets/sprites/orc/orc_front_attack.png',
    orc_front_die: 'assets/sprites/orc/orc_front_die.png',

    // Pipistrello dell'Ombra (32x32 TopDown)
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

  function drawShadow(ctx, x, y, radius = 10) {
    ctx.save();
    ctx.fillStyle = 'rgba(8, 12, 20, 0.45)';
    ctx.beginPath();
    ctx.ellipse(Math.round(x), Math.round(y), radius * PX, (radius * 0.42) * PX, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // =========================================================================
  // 1. PERSONAGGIO PRINCIPALE (32x32 SuperRetroWorld Style)
  // =========================================================================
  function drawHero(ctx, x, y, dir, isWalking, frame, weapon = 'staff', animTimer = 0) {
    if (isReady('hero_adventurer')) {
      const img = images['hero_adventurer'];
      // Determinazione riga direzione (0: Down, 1: Left, 2: Right, 3: Up)
      let row = 0;
      if (dir === 4 || dir === 3 || dir === 5) row = 3; // Nord / Up
      else if (dir === 2 || dir === 1) row = 2;         // Est / Right
      else if (dir === 6 || dir === 7) row = 1;         // Ovest / Left
      else row = 0;                                     // Sud / Down

      // Colonna frame camminata (sequenza ciclica 0 -> 1 -> 2 -> 1)
      let col = 1; // Centro / Idle
      let bob = 0;
      if (isWalking) {
        const walkCycle = [1, 0, 1, 2];
        const step = Math.floor(animTimer * 1.5) % 4;
        col = walkCycle[step];
        bob = (col === 1 ? -1 : 0) * PX;
      } else {
        bob = Math.round(Math.sin(animTimer * 2.5) * 0.75 * PX);
      }

      const sw = 32;
      const sh = 32;
      const dw = 32 * PX;
      const dh = 32 * PX;
      const dx = Math.round(x - dw / 2);
      const dy = Math.round(y - dh + 10) + bob;

      // Se guarda verso Nord, disegna prima l'arma (dietro al corpo)
      if (row === 3) {
        drawEquippedWeapon(ctx, x, y, dir, row, weapon, bob, true);
      }

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, col * sw, row * sh, sw, sh, dx, dy, dw, dh);
      ctx.restore();

      // Se guarda verso Sud, Est o Ovest, disegna l'arma in primo piano
      if (row !== 3) {
        drawEquippedWeapon(ctx, x, y, dir, row, weapon, bob, false);
      }
      return;
    }

    // Fallback procedurale se l'immagine non è ancora caricata
    const fb = renderHeroFrame(dir, isWalking, frame, weapon);
    ctx.drawImage(fb, Math.round(x - fb.width / 2), Math.round(y - fb.height + 8));
  }

  function drawEquippedWeapon(ctx, x, y, dir, row, weapon, bob = 0, isBehind = false) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    const isFacingLeft = row === 1;
    const isFacingRight = row === 2;
    const isFacingUp = row === 3;
    const isFacingDown = row === 0;

    const wepX = Math.round(x + (isFacingLeft ? -14 * PX : (isFacingRight ? 10 * PX : 9 * PX)));
    const wepY = Math.round(y - 20 * PX + bob + (isBehind ? 2 * PX : 0));

    if (weapon === 'sword') {
      // 1. Spada da Battaglia in Acciaio Temprato
      ctx.fillStyle = '#090d16';
      ctx.fillRect(wepX - 1, wepY - 4 * PX, 2 * PX + 2, 14 * PX + 2);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(wepX, wepY - 4 * PX, 2 * PX, 14 * PX);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(wepX, wepY - 4 * PX, 1 * PX, 14 * PX);

      // Guardia d'oro
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(wepX - 3 * PX, wepY + 6 * PX, 8 * PX, 2 * PX);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(wepX, wepY + 8 * PX, 2 * PX, 3 * PX);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(wepX, wepY + 11 * PX, 2 * PX, 1 * PX);
    } else if (weapon === 'bow') {
      // 2. Arco Lungo Curvo
      ctx.fillStyle = '#090d16';
      ctx.fillRect(wepX - 1, wepY - 3 * PX, 3 * PX + 2, 16 * PX + 2);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(wepX, wepY - 3 * PX, 3 * PX, 16 * PX);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(wepX + 1 * PX, wepY - 1 * PX, 1 * PX, 12 * PX);

      // Corda tesa e freccia
      ctx.fillStyle = '#f8fafc';
      const cordX = isFacingLeft ? wepX + 3 * PX : wepX - 1 * PX;
      ctx.fillRect(cordX, wepY - 2 * PX, 1 * PX, 14 * PX);
    } else {
      // 3. Bastone Arcano con Gemma di Mana Fluida
      ctx.fillStyle = '#090d16';
      ctx.fillRect(wepX - 1, wepY - 4 * PX, 2 * PX + 2, 18 * PX + 2);
      ctx.fillStyle = '#5b21b6';
      ctx.fillRect(wepX, wepY - 4 * PX, 2 * PX, 18 * PX);
      ctx.fillStyle = '#7c3aed';
      ctx.fillRect(wepX, wepY - 4 * PX, 1 * PX, 18 * PX);

      // Cristallo fluttuante
      const pulse = Math.sin(Date.now() / 220) * 0.2 + 0.8;
      ctx.fillStyle = `rgba(56, 189, 248, ${0.4 * pulse})`;
      ctx.fillRect(wepX - 3 * PX, wepY - 7 * PX, 8 * PX, 8 * PX);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(wepX - 2 * PX, wepY - 6 * PX, 6 * PX, 6 * PX);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(wepX - 1 * PX, wepY - 5 * PX, 3 * PX, 3 * PX);
    }

    ctx.restore();
  }

  // =========================================================================
  // 2. SCHELETRI GUARDIANI (Skeleton01 TopDown Animation)
  // =========================================================================
  function drawSkeleton(ctx, x, y, dir, isWalking, frame, isDying = false, deathTimer = 0, deathMaxTimer = 0.36, animTimer = 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // A. Animazione di Morte: disintegrazione e crollo osseo
    if (isDying && isReady('skel_front_die')) {
      const img = images['skel_front_die'];
      const p = 1 - Math.max(0, deathTimer / deathMaxTimer);
      const frameIdx = Math.min(5, Math.floor(p * 6));
      const sw = 48;
      const sh = 48;
      const dw = Math.round(48 * 1.35);
      const dh = Math.round(48 * 1.35);
      ctx.globalAlpha = Math.max(0.1, 1 - p * 0.9);
      ctx.drawImage(img, frameIdx * sw, 0, sw, sh, Math.round(x - dw / 2), Math.round(y - dh + 14), dw, dh);
      ctx.restore();
      return;
    }

    // B. Movimento e Direzione
    let imgKey = 'skel_front_walk';
    let flipX = false;
    const isFacingNorth = dir === 3 || dir === 4 || dir === 5;
    const isFacingEast = dir === 1 || dir === 2;
    const isFacingWest = dir === 6 || dir === 7;

    if (isWalking) {
      if (isFacingNorth) imgKey = 'skel_back_walk';
      else if (isFacingEast) imgKey = 'skel_right_walk';
      else if (isFacingWest) { imgKey = 'skel_right_walk'; flipX = true; }
      else imgKey = 'skel_front_walk';
    } else {
      if (isFacingNorth) imgKey = 'skel_back_idle';
      else if (isFacingEast) imgKey = 'skel_right_idle';
      else if (isFacingWest) { imgKey = 'skel_right_idle'; flipX = true; }
      else imgKey = 'skel_front_idle';
    }

    if (isReady(imgKey)) {
      const img = images[imgKey];
      const maxFrames = isWalking ? 8 : 5;
      const frameIdx = Math.floor(animTimer * (isWalking ? 1.6 : 1.0)) % maxFrames;
      const sw = 48;
      const sh = 48;
      const dw = Math.round(48 * 1.35);
      const dh = Math.round(48 * 1.35);
      const dx = Math.round(x - dw / 2);
      const dy = Math.round(y - dh + 14);

      if (flipX) {
        ctx.translate(Math.round(x), 0);
        ctx.scale(-1, 1);
        ctx.drawImage(img, frameIdx * sw, 0, sw, sh, -Math.round(dw / 2), dy, dw, dh);
      } else {
        ctx.drawImage(img, frameIdx * sw, 0, sw, sh, dx, dy, dw, dh);
      }

      // Bagliore occhi rossi minaccioso
      if (!isFacingNorth && Math.sin(animTimer * 4) > -0.2) {
        ctx.fillStyle = '#ef4444';
        const eyeOffsetX = flipX ? -4 : 3;
        ctx.fillRect(Math.round(x + eyeOffsetX - 2), Math.round(y - 28), 2, 2);
        ctx.fillRect(Math.round(x + eyeOffsetX + 3), Math.round(y - 28), 2, 2);
      }

      ctx.restore();
      return;
    }

    ctx.restore();
    // Fallback procedurale se non ancora caricato
    const fb = renderSkeletonFrame(dir, isWalking, frame);
    ctx.drawImage(fb, Math.round(x - fb.width / 2), Math.round(y - fb.height + 8));
  }

  // =========================================================================
  // 3. ORCO GUERRIERO (Orc01 TopDown Animation)
  // =========================================================================
  function drawOrc(ctx, x, y, dir, isWalking, frame, isDying = false, deathTimer = 0, deathMaxTimer = 0.45, animTimer = 0, scale = 1.0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    if (isDying && isReady('orc_front_die')) {
      const img = images['orc_front_die'];
      const p = 1 - Math.max(0, deathTimer / deathMaxTimer);
      const frameIdx = Math.min(5, Math.floor(p * 6));
      const sw = 48;
      const sh = 48;
      const dw = Math.round(48 * 1.45 * scale);
      const dh = Math.round(48 * 1.45 * scale);
      ctx.globalAlpha = Math.max(0.1, 1 - p * 0.9);
      ctx.drawImage(img, frameIdx * sw, 0, sw, sh, Math.round(x - dw / 2), Math.round(y - dh + 16 * scale), dw, dh);
      ctx.restore();
      return;
    }

    let imgKey = isWalking ? 'orc_front_walk' : 'orc_front_idle';
    let flipX = false;
    const isFacingNorth = dir === 3 || dir === 4 || dir === 5;
    const isFacingEast = dir === 1 || dir === 2;
    const isFacingWest = dir === 6 || dir === 7;

    if (isWalking) {
      if (isFacingNorth) imgKey = 'orc_back_walk';
      else if (isFacingEast) imgKey = 'orc_right_walk';
      else if (isFacingWest) { imgKey = 'orc_right_walk'; flipX = true; }
      else imgKey = 'orc_front_walk';
    } else {
      imgKey = 'orc_front_idle';
      if (isFacingWest) flipX = true;
    }

    if (isReady(imgKey)) {
      const img = images[imgKey];
      const maxFrames = isWalking ? 10 : 8;
      const frameIdx = Math.floor(animTimer * (isWalking ? 1.4 : 1.0)) % maxFrames;
      const sw = 48;
      const sh = 48;
      const dw = Math.round(48 * 1.45 * scale);
      const dh = Math.round(48 * 1.45 * scale);
      const dy = Math.round(y - dh + 16 * scale);

      if (flipX) {
        ctx.translate(Math.round(x), 0);
        ctx.scale(-1, 1);
        ctx.drawImage(img, frameIdx * sw, 0, sw, sh, -Math.round(dw / 2), dy, dw, dh);
      } else {
        ctx.drawImage(img, frameIdx * sw, 0, sw, sh, Math.round(x - dw / 2), dy, dw, dh);
      }
      ctx.restore();
      return;
    }

    ctx.restore();
    // Fallback generico
    const fb = renderSkeletonFrame(dir, isWalking, frame);
    ctx.drawImage(fb, Math.round(x - fb.width / 2), Math.round(y - fb.height + 8));
  }

  // =========================================================================
  // 4. PIPISTRELLO DELL'OMBRA (Bat01 32x32 TopDown)
  // =========================================================================
  function drawBat(ctx, x, y, dir, isWalking, frame, isDying = false, deathTimer = 0, deathMaxTimer = 0.3, animTimer = 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Ombra al suolo (staccata dal pipistrello volante)
    drawShadow(ctx, x, y + 6, 8);

    const bob = Math.round(Math.sin(animTimer * 7) * 4);
    const flyY = y - 10 + bob;

    if (isDying && isReady('bat_front_die')) {
      const img = images['bat_front_die'];
      const p = 1 - Math.max(0, deathTimer / deathMaxTimer);
      const frameIdx = Math.min(10, Math.floor(p * 11));
      const sw = 32;
      const sh = 32;
      const dw = 32 * PX;
      const dh = 32 * PX;
      ctx.globalAlpha = Math.max(0.1, 1 - p);
      ctx.drawImage(img, frameIdx * sw, 0, sw, sh, Math.round(x - dw / 2), Math.round(flyY - dh / 2), dw, dh);
      ctx.restore();
      return;
    }

    const imgKey = isWalking ? 'bat_front_walk' : 'bat_front_idle';
    if (isReady(imgKey)) {
      const img = images[imgKey];
      const maxFrames = isWalking ? 4 : 8;
      const frameIdx = Math.floor(animTimer * 6) % maxFrames;
      const sw = 32;
      const sh = 32;
      const dw = 32 * PX;
      const dh = 32 * PX;
      ctx.drawImage(img, frameIdx * sw, 0, sw, sh, Math.round(x - dw / 2), Math.round(flyY - dh / 2), dw, dh);
      ctx.restore();
      return;
    }

    ctx.restore();
  }

  // =========================================================================
  // 5. FABBRI DEI VILLAGGI NPC (32x32 con Incudine e Martello Attivo)
  // =========================================================================
  function drawBlacksmithNPC(ctx, x, y, bsId = 'bs_citadel', playerX = 0, playerY = 0, animTimer = 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // 1. Ombra sotto il fabbro e l'incudine
    drawShadow(ctx, x, y + 2, 16);

    // 2. Calcolo orientamento: guarda il giocatore se vicino (< 85px), altrimenti guarda l'incudine a sinistra
    const distToPlayer = Math.hypot(playerX - x, playerY - y);
    let row = 0; // Down
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

    // 3. Sprite 32x32 del Fabbro specifico
    const imgKey = bsId || 'bs_citadel';
    if (isReady(imgKey)) {
      const img = images[imgKey];
      const isHammering = distToPlayer >= 85;
      const hammerCycle = [1, 0, 1, 2];
      const col = isHammering ? hammerCycle[Math.floor(animTimer * 2) % 4] : 1;

      const sw = 32;
      const sh = 32;
      const dw = 32 * PX;
      const dh = 32 * PX;
      const fx = Math.round(x - dw / 2 + 6 * PX);
      const fy = Math.round(y - dh + 6);

      ctx.drawImage(img, col * sw, row * sh, sw, sh, fx, fy, dw, dh);

      // Scintille del martello sull'incudine periodiche
      if (isHammering && col === 2 && Math.random() < 0.25) {
        ctx.fillStyle = '#fde047';
        ctx.fillRect(Math.round(x - 14 * PX), Math.round(y - 8 * PX), 2 * PX, 2 * PX);
        ctx.fillStyle = '#f97316';
        ctx.fillRect(Math.round(x - 12 * PX), Math.round(y - 10 * PX), 1.5 * PX, 1.5 * PX);
      }
    }

    // 4. Incudine pesante in ferro massiccio (a sinistra del fabbro)
    const anvilX = Math.round(x - 14 * PX);
    const anvilY = Math.round(y - 12 * PX);

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(anvilX - 1, anvilY - 1, 14 * PX + 2, 10 * PX + 2);
    ctx.fillStyle = '#475569';
    ctx.fillRect(anvilX, anvilY, 14 * PX, 10 * PX);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(anvilX + 1 * PX, anvilY + 1 * PX, 12 * PX, 2 * PX); // Piano superiore lucido
    ctx.fillStyle = '#334155';
    ctx.fillRect(anvilX + 4 * PX, anvilY + 3 * PX, 6 * PX, 4 * PX);  // Piede incudine

    // Lama incandescente sopra l'incudine
    ctx.fillStyle = '#f97316';
    ctx.fillRect(anvilX + 3 * PX, anvilY + 1 * PX, 8 * PX, 1.5 * PX);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(anvilX + 5 * PX, anvilY + 1 * PX, 4 * PX, 1 * PX);

    // 5. Cartiglio interattivo fluttuante
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(Math.round(x - 42), Math.round(y - 54), 84, 18);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(x - 42), Math.round(y - 54), 84, 18);
    ctx.fillStyle = '#fde047';
    ctx.fillText('🔨 Fabbro [E]', Math.round(x), Math.round(y - 41));

    ctx.restore();
  }

  // =========================================================================
  // 6. BOSS DEL MONDO APERTO (Visual Elevati e Maestosi)
  // =========================================================================
  function drawBoss(ctx, enemy, dt = 0) {
    const isWalking = enemy.state === 'CHASE' || (enemy.state === 'WANDER' && enemy.isWanderMoving);
    const animTimer = enemy.animTimer || 0;

    ctx.save();

    // 1. Colosso delle Dune / Warlord delle Sabbie
    if (enemy.kind === 'boss_scorpion') {
      // Aura vortice di sabbia
      const pulse = Math.sin(Date.now() / 240) * 0.15 + 0.35;
      const glow = ctx.createRadialGradient(enemy.x, enemy.y - 16, 12, enemy.x, enemy.y - 16, 72);
      glow.addColorStop(0, `rgba(245, 158, 11, ${pulse})`);
      glow.addColorStop(0.7, `rgba(217, 119, 6, ${pulse * 0.4})`);
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y - 16, 72, 0, Math.PI * 2);
      ctx.fill();

      // Rendering Orco Warlord a scala 2.2x
      drawOrc(ctx, enemy.x, enemy.y, enemy.dir, isWalking, enemy.frame, enemy.isDying, enemy.deathTimer, enemy.deathMaxTimer, animTimer, 2.2);
      ctx.restore();
      return;
    }

    // 2. Titano di Magma (Volcanic Obsidian Colossus)
    if (enemy.kind === 'boss_magma') {
      const pulse = Math.sin(Date.now() / 200) * 0.18 + 0.45;
      const glow = ctx.createRadialGradient(enemy.x, enemy.y - 20, 14, enemy.x, enemy.y - 20, 85);
      glow.addColorStop(0, `rgba(239, 68, 68, ${pulse})`);
      glow.addColorStop(0.5, `rgba(249, 115, 22, ${pulse * 0.5})`);
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y - 20, 85, 0, Math.PI * 2);
      ctx.fill();

      // Titano con armatura d'ossidiana cornuta
      if (isReady('bs_cineris')) {
        const img = images['bs_cineris'];
        const row = (enemy.dir === 4 || enemy.dir === 3 || enemy.dir === 5) ? 3 : (enemy.dir === 2 ? 2 : (enemy.dir === 6 ? 1 : 0));
        const col = isWalking ? ([1, 0, 1, 2][Math.floor(animTimer * 1.4) % 4]) : 1;
        const sw = 32;
        const sh = 32;
        const dw = Math.round(32 * 2.5 * PX);
        const dh = Math.round(32 * 2.5 * PX);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, col * sw, row * sh, sw, sh, Math.round(enemy.x - dw / 2), Math.round(enemy.y - dh + 22), dw, dh);

        // Corna ardenti in pixel art
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(Math.round(enemy.x - 14 * PX), Math.round(enemy.y - dh + 8), 3 * PX, 5 * PX);
        ctx.fillRect(Math.round(enemy.x + 11 * PX), Math.round(enemy.y - dh + 8), 3 * PX, 5 * PX);
        ctx.fillStyle = '#fde047';
        ctx.fillRect(Math.round(enemy.x - 13 * PX), Math.round(enemy.y - dh + 5), 2 * PX, 3 * PX);
        ctx.fillRect(Math.round(enemy.x + 12 * PX), Math.round(enemy.y - dh + 5), 2 * PX, 3 * PX);
        ctx.restore();
        return;
      }
    }

    // 3. Golem dei Ghiacci (Frost Peak Ice Titan)
    if (enemy.kind === 'boss_golem') {
      const pulse = Math.sin(Date.now() / 250) * 0.15 + 0.38;
      const glow = ctx.createRadialGradient(enemy.x, enemy.y - 18, 12, enemy.x, enemy.y - 18, 78);
      glow.addColorStop(0, `rgba(125, 211, 252, ${pulse})`);
      glow.addColorStop(0.6, `rgba(2, 132, 199, ${pulse * 0.4})`);
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y - 18, 78, 0, Math.PI * 2);
      ctx.fill();

      if (isReady('hero_knight')) {
        const img = images['hero_knight'];
        const row = (enemy.dir === 4 || enemy.dir === 3 || enemy.dir === 5) ? 3 : (enemy.dir === 2 ? 2 : (enemy.dir === 6 ? 1 : 0));
        const col = isWalking ? ([1, 0, 1, 2][Math.floor(animTimer * 1.4) % 4]) : 1;
        const sw = 32;
        const sh = 32;
        const dw = Math.round(32 * 2.3 * PX);
        const dh = Math.round(32 * 2.3 * PX);
        ctx.imageSmoothingEnabled = false;

        // Tonalità crio-glaciale
        ctx.filter = 'hue-rotate(180deg) brightness(1.2) saturate(1.4)';
        ctx.drawImage(img, col * sw, row * sh, sw, sh, Math.round(enemy.x - dw / 2), Math.round(enemy.y - dh + 20), dw, dh);
        ctx.filter = 'none';

        // Punte di ghiaccio cristalline sulle spalle
        ctx.fillStyle = '#e0f2fe';
        ctx.fillRect(Math.round(enemy.x - 16 * PX), Math.round(enemy.y - dh + 18), 4 * PX, 6 * PX);
        ctx.fillRect(Math.round(enemy.x + 12 * PX), Math.round(enemy.y - dh + 18), 4 * PX, 6 * PX);
        ctx.restore();
        return;
      }
    }

    // 4. Treant Ancestrale (Ancient Forest Guardian)
    if (enemy.kind === 'boss_treant') {
      const pulse = Math.sin(Date.now() / 260) * 0.15 + 0.35;
      const glow = ctx.createRadialGradient(enemy.x, enemy.y - 18, 12, enemy.x, enemy.y - 18, 78);
      glow.addColorStop(0, `rgba(34, 197, 94, ${pulse})`);
      glow.addColorStop(0.6, `rgba(22, 101, 52, ${pulse * 0.4})`);
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y - 18, 78, 0, Math.PI * 2);
      ctx.fill();

      if (isReady('bs_elora')) {
        const img = images['bs_elora'];
        const row = (enemy.dir === 4 || enemy.dir === 3 || enemy.dir === 5) ? 3 : (enemy.dir === 2 ? 2 : (enemy.dir === 6 ? 1 : 0));
        const col = isWalking ? ([1, 0, 1, 2][Math.floor(animTimer * 1.3) % 4]) : 1;
        const sw = 32;
        const sh = 32;
        const dw = Math.round(32 * 2.3 * PX);
        const dh = Math.round(32 * 2.3 * PX);
        ctx.imageSmoothingEnabled = false;

        // Tonalità boscosa antica
        ctx.filter = 'hue-rotate(90deg) contrast(1.2)';
        ctx.drawImage(img, col * sw, row * sh, sw, sh, Math.round(enemy.x - dw / 2), Math.round(enemy.y - dh + 20), dw, dh);
        ctx.filter = 'none';

        // Rami e fronde superiori
        ctx.fillStyle = '#15803d';
        ctx.fillRect(Math.round(enemy.x - 14 * PX), Math.round(enemy.y - dh + 6), 6 * PX, 6 * PX);
        ctx.fillRect(Math.round(enemy.x + 8 * PX), Math.round(enemy.y - dh + 6), 6 * PX, 6 * PX);
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(Math.round(enemy.x - 10 * PX), Math.round(enemy.y - dh + 4), 3 * PX, 3 * PX);
        ctx.fillRect(Math.round(enemy.x + 7 * PX), Math.round(enemy.y - dh + 4), 3 * PX, 3 * PX);
        ctx.restore();
        return;
      }
    }

    ctx.restore();
  }

  // =========================================================================
  // 7. SLIME (Mantenuti 100% Intatti secondo richiesta utente)
  // =========================================================================
  function renderSlimeFrame(type = 'forest', frameIndex = 0) {
    const w = 22 * PX;
    const h = 20 * PX;
    const { canvas, ctx } = createOffscreen(w, h);

    let cOutline = '#052e16', cBase = '#16a34a', cLight = '#4ade80', cHighlight = '#bbf7d0';
    if (type === 'ice') {
      cOutline = '#0c4a6e'; cBase = '#0284c7'; cLight = '#38bdf8'; cHighlight = '#bae6fd';
    } else if (type === 'sand') {
      cOutline = '#451a03'; cBase = '#b45309'; cLight = '#f59e0b'; cHighlight = '#fde68a';
    } else if (type === 'magma') {
      cOutline = '#450a0a'; cBase = '#dc2626'; cLight = '#f87171'; cHighlight = '#fecaca';
    } else if (type === 'water') {
      cOutline = '#082f49'; cBase = '#0369a1'; cLight = '#0ea5e9'; cHighlight = '#7dd3fc';
    }

    const cx = Math.floor(w / 2);
    const cy = Math.floor(h / 2);

    let sx = 0, sy = 0, yOff = 0;
    if (frameIndex === 0) {
      sx = 0; sy = 0; yOff = 0;
    } else if (frameIndex === 1) {
      sx = 1 * PX; sy = -1 * PX; yOff = 1 * PX;
    } else if (frameIndex === 2) {
      sx = -1 * PX; sy = 1 * PX; yOff = -1 * PX;
    } else {
      sx = 0; sy = 0; yOff = 0;
    }

    const bx = cx - 8 * PX - sx;
    const by = cy - 5 * PX - sy + yOff;
    const bw = 16 * PX + sx * 2;
    const bh = 10 * PX + sy;

    const rx = Math.round(bx);
    const ry = Math.round(by);
    const rw = Math.round(bw);
    const rh = Math.round(bh);

    ctx.fillStyle = cOutline;
    ctx.fillRect(rx - 1, ry - 1, rw + 2, rh + 2);

    ctx.fillStyle = cBase;
    ctx.fillRect(rx, ry, rw, rh);

    ctx.fillStyle = cLight;
    ctx.fillRect(rx + 1 * PX, ry + 1 * PX, rw - 2 * PX, Math.round(rh * 0.45));

    ctx.fillStyle = cHighlight;
    ctx.fillRect(rx + 2 * PX, ry + 2 * PX, 3 * PX, 2 * PX);

    const eyeY = ry + Math.round(rh * 0.35);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx - 3 * PX, eyeY, 2 * PX, 2 * PX);
    ctx.fillRect(cx + 1 * PX, eyeY, 2 * PX, 2 * PX);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 2 * PX, eyeY, 1 * PX, 1 * PX);
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
    ctx.lineTo(cx + 4 * PX, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx - 4 * PX, cy);
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

  // Procedural fallback per Hero
  const PALETTE = {
    outline: '#090d16',
    cloakDark: '#1e1b4b',
    cloakMain: '#312e81',
    cloakLight: '#4f46e5',
    boots: '#0f172a',
    skin: '#fde047',
    skinShadow: '#d97706',
    hair: '#e2e8f0',
    hairShadow: '#94a3b8'
  };

  function renderHeroFrame(dir, isWalking, frameIndex, weapon = 'staff') {
    const w = 26 * PX;
    const h = 28 * PX;
    const { canvas, ctx } = createOffscreen(w, h);
    const bob = isWalking ? Math.sin(frameIndex * Math.PI) * 1.5 * PX : 0;
    const cx = Math.floor(w / 2);
    const cy = Math.floor(h / 2) + bob;

    ctx.fillStyle = PALETTE.outline;
    ctx.fillRect(cx - 5 * PX, cy - 10 * PX, 10 * PX, 18 * PX);
    ctx.fillStyle = PALETTE.cloakMain;
    ctx.fillRect(cx - 4 * PX, cy - 9 * PX, 8 * PX, 16 * PX);
    ctx.fillStyle = PALETTE.skin;
    ctx.fillRect(cx - 3 * PX, cy - 8 * PX, 6 * PX, 5 * PX);
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
      const { canvas, ctx } = createOffscreen(64, 64);
      drawHero(ctx, 32, 54, dir, isWalking, frame, weapon, 0);
      cache.set(key, canvas);
    }
    return cache.get(key);
  }

  function getSkeletonSprite(dir, isWalking, frame) {
    const key = `skel_${dir}_${isWalking ? 1 : 0}_${frame}`;
    if (!cache.has(key)) {
      const { canvas, ctx } = createOffscreen(64, 64);
      drawSkeleton(ctx, 32, 50, dir, isWalking, frame, false, 0, 0.36, 0);
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
