/**
 * main.js - Entrypoint, Game Loop a 60 FPS e orchestrazione (Fase A + B + C)
 */
import { Input } from './core/input.js';
import { Camera } from './core/camera.js';
import { World } from './world/world.js';
import { Player } from './entities/player.js';
import { Enemy } from './entities/enemy.js';
import { CombatSystem } from './systems/combat.js';
import { ProgressionSystem } from './systems/progression.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // Elementi HUD Minimalista (non invasivo, bordi schermo)
  const elFps = document.getElementById('hud-fps');
  const elPos = document.getElementById('hud-pos');
  const elEnemies = document.getElementById('hud-enemies');
  const elLevel = document.getElementById('hud-level');
  const elXpFill = document.getElementById('xp-fill');
  const elXpText = document.getElementById('xp-text');
  const elDamage = document.getElementById('hud-damage');
  const elTarget = document.getElementById('hud-target');
  const elCdFill = document.getElementById('hud-cd-fill');

  // Elementi Modale Level-Up
  const modalLevelUp = document.getElementById('levelup-modal');
  const cardsContainer = document.getElementById('upgrade-cards');

  // Istanze dei sistemi principali
  const camera = new Camera(768, 420);
  const world = new World(2026);
  const player = new Player(0, 0);
  const combat = new CombatSystem();
  const progression = new ProgressionSystem(player, combat);

  // Centratura immediata della telecamera sullo spawn dell'eroe
  camera.snapTo(player.x, player.y);

  // =========================================================================
  // FASE C: Popolazione della Grande Mappa Finita con Nemici Randagi
  // (Nessuna orda a spawner continuo: nemici distribuiti che pattugliano il mondo)
  // =========================================================================
  function populateWorldEnemies() {
    // 1. Slime Silvani (Foresta e radure del Nord-Ovest)
    for (let i = 0; i < 18; i++) {
      const pt = world.findValidSpawn(260, 1250);
      combat.enemies.push(new Enemy(pt.x, pt.y, 'slime_forest'));
    }

    // 2. Slime delle Onde (Baia e specchi d'acqua del Sud-Est)
    for (let i = 0; i < 12; i++) {
      const pt = world.findValidSpawn(280, 1300);
      combat.enemies.push(new Enemy(pt.x, pt.y, 'slime_water'));
    }

    // 3. Scheletri Guardiani (Rovine di pietra del Nord-Est e Sud-Ovest)
    for (let i = 0; i < 14; i++) {
      const pt = world.findValidSpawn(320, 1380);
      combat.enemies.push(new Enemy(pt.x, pt.y, 'skeleton'));
    }
  }

  populateWorldEnemies();

  // =========================================================================
  // GESTIONE EVENTI LEVEL-UP & CARTE DI POTENZIAMENTO
  // =========================================================================
  progression.onLevelUpCallback = (lvl, choices) => {
    if (!cardsContainer || !modalLevelUp) return;
    cardsContainer.innerHTML = '';

    choices.forEach((choice, idx) => {
      const card = document.createElement('div');
      card.className = 'upgrade-card';
      card.innerHTML = `
        <div class="card-key">[${idx + 1}]</div>
        <div class="card-icon">${choice.icon}</div>
        <div class="card-title">${choice.title}</div>
        <div class="card-desc">${choice.desc}</div>
      `;
      card.addEventListener('click', () => {
        progression.chooseUpgrade(idx);
      });
      cardsContainer.appendChild(card);
    });

    modalLevelUp.classList.remove('hidden');
  };

  progression.onUpgradeChosenCallback = () => {
    if (modalLevelUp) {
      modalLevelUp.classList.add('hidden');
    }
  };

  // Scorciatoie da tastiera per le carte (1, 2, 3)
  window.addEventListener('keydown', (e) => {
    if (progression.isPausedForLevelUp) {
      if (e.key === '1') progression.chooseUpgrade(0);
      else if (e.key === '2') progression.chooseUpgrade(1);
      else if (e.key === '3') progression.chooseUpgrade(2);
    }
  });

  // =========================================================================
  // RIDIMENSIONAMENTO & CENTRATURA PIXEL-PERFECT (Qualsiasi DPR / Risoluzione)
  // =========================================================================
  function handleResize() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    camera.resize(canvas.width, canvas.height, dpr);
  }

  window.addEventListener('resize', handleResize);
  handleResize();

  // =========================================================================
  // GESTIONE ERRORI GLOBALE (Previene freeze improvvisi)
  // =========================================================================
  window.addEventListener('error', (event) => {
    console.error('CRASH RILEVATO NEL GIOCO:', event.error || event.message);
  });

  // =========================================================================
  // GAME LOOP A 60 FPS
  // =========================================================================
  let lastTime = performance.now();
  let frameCount = 0;
  let fpsTimer = 0;
  let currentFps = 60;

  function loop(currentTime) {
    try {
      const rawDt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      const dt = Math.min(Math.max(rawDt, 0), 0.1);

      frameCount++;
      fpsTimer += dt;
      if (fpsTimer >= 0.5) {
        currentFps = Math.round(frameCount / fpsTimer);
        frameCount = 0;
        fpsTimer = 0;
      }

      // 1. UPDATE (Messo in pausa durante la scelta del Level-Up)
      if (!progression.isPausedForLevelUp) {
        player.update(dt, Input, world);
        combat.update(dt, player, world, camera);
        camera.follow(player.x, player.y, dt);
      }

      // 2. RENDER PIPELINE
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;

      ctx.save();
      camera.apply(ctx);

      // a. Terreno autotiled (prato, scogliere montuose perimetrali, specchi d'acqua)
      world.drawGround(ctx, camera);

      // b. Gemme di Mana ed Esperienza a terra (prima degli elementi verticali)
      combat.drawPickups(ctx);

      // c. Elementi verticali Y-Sort (alberi, rocce, manichini, nemici randagi e giocatore)
      world.drawEntitiesAndProps(ctx, camera, [player, ...combat.getAllTargets()]);

      // d. Sfere di fuoco orbitanti
      combat.drawOrbitOrbs(ctx, player);

      // e. Dardi magici e particelle FX
      combat.drawProjectiles(ctx);
      combat.drawFX(ctx);

      ctx.restore();

      // f. Atmosfera e vignettatura scura sui bordi
      world.drawVignette(ctx, canvas.width, canvas.height);

      ctx.restore();

      // 3. AGGIORNAMENTO HUD MINIMALISTA
      if (elFps) elFps.textContent = `${currentFps}`;
      if (elPos) elPos.textContent = `X: ${Math.round(player.x)}, Y: ${Math.round(player.y)}`;
      if (elEnemies) elEnemies.textContent = `${combat.enemies.length}`;

      if (elLevel) elLevel.textContent = `${progression.level}`;
      if (elXpFill) elXpFill.style.width = `${Math.round(progression.progressRatio * 100)}%`;
      if (elXpText) elXpText.textContent = `${progression.currentXp} / ${progression.nextLevelXp} XP`;

      if (elDamage) elDamage.textContent = `${Math.round(18 * combat.damageMultiplier)}`;
      if (elTarget) {
        elTarget.textContent = combat.currentTarget ? combat.currentTarget.name : 'Nessuno';
        elTarget.style.color = combat.currentTarget ? '#38bdf8' : '#94a3b8';
      }

      if (elCdFill) {
        const pct = Math.round(combat.cooldownProgress * 100);
        elCdFill.style.width = `${pct}%`;
        elCdFill.style.backgroundColor = pct >= 100 ? '#38bdf8' : '#0284c7';
      }

      Input.endFrame();
    } catch (err) {
      console.error('Errore durante il ciclo di gioco:', err);
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
});
