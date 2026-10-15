/**
 * main.js - Entrypoint, Game Loop a 60 FPS, Nuova Architettura UI:
 * - Hero Title Screen animata con particelle magiche dell'Aether
 * - Minimappa Radar live a 5 Biomi interattiva
 * - Mappa Tattica espansa con coordinate e punti di riferimento
 * - Zaino In-Game con Grimorio dei Talenti (potenziabili durante la run!)
 * - Menu di Gioco con Impostazioni, Negozio, Amici, Statistiche e Salvataggio
 */
import { Input } from './core/input.js';
import { Camera } from './core/camera.js';
import { World, SETTLEMENTS, ROAD_SEGMENTS, TRAIL_SEGMENTS, POINTS_OF_INTEREST } from './world/world.js';
import { Player } from './entities/player.js';
import { Enemy } from './entities/enemy.js';
import { Chest } from './entities/chest.js';
import { CombatSystem } from './systems/combat.js';
import { ProgressionSystem } from './systems/progression.js';
import { API } from './core/api.js';
import { MATERIALS_DEF, WEAPONS_DEF } from './core/crafting.js';
import { FX } from './core/fx.js';
import { Tiles } from './world/tiles.js';
import { Sprites } from './core/sprites.js';

window.addEventListener('DOMContentLoaded', async () => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // Elementi UI Principali
  const menuScreen = document.getElementById('main-menu');
  const gameHud = document.getElementById('game-hud');
  const modalLevelUp = document.getElementById('levelup-modal');
  const modalGameOver = document.getElementById('gameover-modal');

  // Canvas Particelle Sfondo Titolo
  const titleCanvas = document.getElementById('title-bg-canvas');
  const titleCtx = titleCanvas ? titleCanvas.getContext('2d') : null;

  // Elementi Profilo & Account
  const elNicknameDisplay = document.getElementById('player-nickname-display');
  const elAccountBadge = document.getElementById('account-status-badge');
  const btnSwitchAccount = document.getElementById('btn-switch-account');
  const elMenuGold = document.getElementById('menu-gold');
  const elStatKills = document.getElementById('stat-kills');
  const elStatHighLvl = document.getElementById('stat-high-lvl');
  const elStatBestTime = document.getElementById('stat-best-time');
  const elServerStatus = document.getElementById('server-status');
  const btnStartRun = document.getElementById('btn-start-run');

  // Modale Autenticazione (Login & Registrazione)
  const authModal = document.getElementById('auth-modal');
  const authTabBtnLogin = document.getElementById('auth-tab-btn-login');
  const authTabBtnRegister = document.getElementById('auth-tab-btn-register');
  const authAlert = document.getElementById('auth-alert');
  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');
  const inputLoginUser = document.getElementById('login-username');
  const inputLoginPass = document.getElementById('login-password');
  const inputRegUser = document.getElementById('register-username');
  const inputRegEmail = document.getElementById('register-email');
  const inputRegPass = document.getElementById('register-password');
  const inputRegPassConfirm = document.getElementById('register-password-confirm');
  const btnContinueGuest = document.getElementById('btn-continue-guest');

  // Modale Classifica Globale
  const btnOpenLeaderboard = document.getElementById('btn-open-leaderboard');
  const leaderboardModal = document.getElementById('leaderboard-modal');
  const leaderboardRows = document.getElementById('leaderboard-rows');
  const btnCloseLeaderboard = document.getElementById('btn-close-leaderboard');
  const btnCloseLeaderboardFoot = document.getElementById('btn-close-leaderboard-foot');

  // Elementi HUD di Gioco
  const elFps = document.getElementById('hud-fps');
  const elTimer = document.getElementById('hud-timer');
  const elEnemies = document.getElementById('hud-enemies');
  const elLevel = document.getElementById('hud-level');
  const elXpFill = document.getElementById('xp-fill');
  const elXpText = document.getElementById('xp-text');
  const elHpFill = document.getElementById('hp-fill');
  const elHpText = document.getElementById('hp-text');
  const elRunGold = document.getElementById('hud-run-gold');
  const elRunItems = document.getElementById('hud-run-items');
  const elWeaponIcon = document.getElementById('hud-weapon-icon');
  const elWeaponName = document.getElementById('hud-weapon-name');
  const elDamage = document.getElementById('hud-damage');
  const elTarget = document.getElementById('hud-target');
  const elCdFill = document.getElementById('hud-cd-fill');
  const cardsContainer = document.getElementById('upgrade-cards');
  const weaponNotification = document.getElementById('weapon-notification');

  // Action Bar HUD
  const hudBtnBag = document.getElementById('hud-btn-bag');
  const hudBtnMap = document.getElementById('hud-btn-map');
  const hudBtnMenu = document.getElementById('hud-btn-menu');

  // Widget Minimappa Live
  const minimapWidget = document.getElementById('minimap-widget');
  const minimapCanvas = document.getElementById('minimap-canvas');
  const minimapCtx = minimapCanvas ? minimapCanvas.getContext('2d') : null;
  const minimapBiomeName = document.getElementById('minimap-biome-name');
  const btnExpandMinimap = document.getElementById('btn-expand-minimap');

  // Modale Mappa Tattica Espansa
  const expandedMapModal = document.getElementById('expanded-map-modal');
  const expandedCanvas = document.getElementById('expanded-map-canvas');
  const expandedCtx = expandedCanvas ? expandedCanvas.getContext('2d') : null;
  const mapCoordsText = document.getElementById('map-coords-text');
  const mapCurrentBiomeText = document.getElementById('map-current-biome-text');
  const btnCloseMap = document.getElementById('btn-close-map');
  const btnResumeFromMap = document.getElementById('btn-resume-from-map');

  // Modale Zaino & Talenti In-Game
  const ingameModal = document.getElementById('ingame-inventory-modal');
  const btnCloseBag = document.getElementById('btn-close-bag');
  const btnResumeGame = document.getElementById('btn-resume-game');
  const ingameTabBtnLoot = document.getElementById('ingame-tab-btn-loot');
  const ingameTabBtnTalents = document.getElementById('ingame-tab-btn-talents');
  const ingameTabBtnForge = document.getElementById('ingame-tab-btn-forge');
  const ingameTabBtnWeapons = document.getElementById('ingame-tab-btn-weapons');
  const ingameTabLoot = document.getElementById('ingame-tab-loot');
  const ingameTabTalents = document.getElementById('ingame-tab-talents');
  const ingameTabForge = document.getElementById('ingame-tab-forge');
  const ingameTabWeapons = document.getElementById('ingame-tab-weapons');
  const ingameLootContainer = document.getElementById('ingame-loot-container');
  const talentsContainer = document.getElementById('talents-container');
  const ingameForgeContainer = document.getElementById('ingame-forge-container');
  const ingameWeaponsContainer = document.getElementById('ingame-weapons-container');

  // Modale Menu di Gioco In-Game
  const gameMenuModal = document.getElementById('game-menu-modal');
  const btnCloseGameMenu = document.getElementById('btn-close-game-menu');
  const btnMenuResume = document.getElementById('btn-menu-resume');
  const btnMenuQuit = document.getElementById('btn-menu-quit');
  const menuTabBtnSettings = document.getElementById('menu-tab-btn-settings');
  const menuTabBtnShop = document.getElementById('menu-tab-btn-shop');
  const menuTabBtnFriends = document.getElementById('menu-tab-btn-friends');
  const menuTabBtnStats = document.getElementById('menu-tab-btn-stats');
  const menuTabSettings = document.getElementById('menu-tab-settings');
  const menuTabShop = document.getElementById('menu-tab-shop');
  const menuTabFriends = document.getElementById('menu-tab-friends');
  const menuTabStats = document.getElementById('menu-tab-stats');
  const settingVolume = document.getElementById('setting-volume');
  const settingDmgNumbers = document.getElementById('setting-dmg-numbers');
  const settingFxSparks = document.getElementById('setting-fx-sparks');
  const btnToggleFullscreen = document.getElementById('btn-toggle-fullscreen');
  const myFriendIdDisplay = document.getElementById('my-friend-id-display');
  const btnCopyFriendCode = document.getElementById('btn-copy-friend-code');
  const menuStatTime = document.getElementById('menu-stat-time');
  const menuStatLvl = document.getElementById('menu-stat-lvl');
  const menuStatKills = document.getElementById('menu-stat-kills');
  const menuStatGold = document.getElementById('menu-stat-gold');

  // Elementi Riepilogo Fine Spedizione
  const elSumTime = document.getElementById('sum-time');
  const elSumLevel = document.getElementById('sum-level');
  const elSumKills = document.getElementById('sum-kills');
  const elSumGold = document.getElementById('sum-gold');
  const elSumItems = document.getElementById('sum-items');
  const elSumScore = document.getElementById('sum-score');
  const btnReturnSanctuary = document.getElementById('btn-return-sanctuary');

  // Elementi Prompt Interattivo HUD & Modale Fabbro
  const hudInteractPrompt = document.getElementById('hud-interact-prompt');
  const hudInteractLabel = document.getElementById('hud-interact-label');
  const blacksmithModal = document.getElementById('blacksmith-modal');
  const bsModalName = document.getElementById('bs-modal-name');
  const bsModalTitle = document.getElementById('bs-modal-title');
  const bsModalQuote = document.getElementById('bs-modal-quote');
  const blacksmithForgeContainer = document.getElementById('blacksmith-forge-container');
  const btnCloseBlacksmith = document.getElementById('btn-close-blacksmith');
  const btnResumeFromBlacksmith = document.getElementById('btn-resume-from-blacksmith');
  const forgeNearBlacksmithBtnBox = document.getElementById('forge-near-blacksmith-btn-box');
  const btnOpenNearBlacksmith = document.getElementById('btn-open-near-blacksmith');
  const nearBsName = document.getElementById('near-bs-name');

  // Stato Globale
  let gameState = 'MENU'; // 'MENU' | 'PLAYING' | 'GAMEOVER'
  let currentProfile = null;
  let runSurvivalSeconds = 0;
  let isInventoryOpen = false;
  let isMapOpen = false;
  let isMenuOpen = false;
  let isBlacksmithOpen = false;
  let currentNearbyInteractable = null;
  let activeBlacksmith = null;
  let chests = [];
  let mysteryPillars = [];
  let notificationTimeout = null;

  // Tracciamento Coordinate Mouse e Click Manuale
  let mouseScreen = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  let isMouseDown = false;

  window.addEventListener('mousemove', (e) => {
    mouseScreen.x = e.clientX;
    mouseScreen.y = e.clientY;
  });

  window.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      isMouseDown = true;
      // Se clicchi sul canvas di gioco, verifica se stai cliccando su forziere, fabbro o runa
      if (gameState === 'PLAYING' && !isInventoryOpen && !isMapOpen && !isMenuOpen && !isBlacksmithOpen) {
        const aim = camera.screenToWorld(e.clientX, e.clientY, canvas);
        handleWorldClickInteraction(aim);
      }
    }
  });

  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
      isMouseDown = false;
    }
  });

  // Istanze di gioco
  const camera = new Camera(768, 420);
  const world = new World(2026);
  const player = new Player(0, 0);
  const combat = new CombatSystem();
  const progression = new ProgressionSystem(player, combat);

  camera.snapTo(player.x, player.y);

  function formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function getBiomeInfo(worldX, worldY) {
    const sz = world.getSafeZone(worldX, worldY);
    if (sz) {
      return { key: 'village', name: `🏰 ${sz.name}`, color: sz.color };
    }
    const tx = world.tileOf(worldX);
    const ty = world.tileOf(worldY);
    const biomeKey = world.getBiome(tx, ty);
    switch (biomeKey) {
      case 'river': return { key: 'river', name: '🌊 Fiume & Cascate', color: '#06b6d4' };
      case 'snow': return { key: 'snow', name: '❄️ Vette Innevate', color: '#7dd3fc' };
      case 'desert': return { key: 'desert', name: '🏜️ Deserto delle Dune', color: '#f59e0b' };
      case 'volcano': return { key: 'volcano', name: '🌋 Caldera Vulcanica', color: '#ef4444' };
      case 'forest':
      default:
        return { key: 'forest', name: '🌲 Bosco Silvano', color: '#22c55e' };
    }
  }

  // =========================================================================
  // 1. PARTICELLE E SFONDO ANIMATO DELLA SCHERMATA TITOLO
  // =========================================================================
  let titleParticles = [];

  function initTitleParticles() {
    if (!titleCanvas) return;
    titleCanvas.width = window.innerWidth;
    titleCanvas.height = window.innerHeight;
    titleParticles = [];
    const count = Math.min(85, Math.floor(window.innerWidth / 16));
    for (let i = 0; i < count; i++) {
      titleParticles.push({
        x: Math.random() * titleCanvas.width,
        y: Math.random() * titleCanvas.height,
        radius: 1 + Math.random() * 2.6,
        speedY: 18 + Math.random() * 38,
        speedX: (Math.random() - 0.5) * 16,
        alpha: 0.2 + Math.random() * 0.7,
        color: Math.random() > 0.4 ? '#38bdf8' : (Math.random() > 0.5 ? '#a855f7' : '#fde047'),
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  function updateAndDrawTitleBackground(dt, time) {
    if (!titleCtx || !titleCanvas || gameState !== 'MENU') return;
    titleCtx.clearRect(0, 0, titleCanvas.width, titleCanvas.height);

    const cx = titleCanvas.width / 2;
    const cy = titleCanvas.height / 2;

    // Bagliore radiale centrale dell'Aether
    const grad = titleCtx.createRadialGradient(cx, cy, 80, cx, cy, Math.max(cx, cy));
    grad.addColorStop(0, 'rgba(14, 165, 233, 0.15)');
    grad.addColorStop(0.45, 'rgba(88, 28, 135, 0.08)');
    grad.addColorStop(1, 'rgba(5, 8, 17, 0)');
    titleCtx.fillStyle = grad;
    titleCtx.fillRect(0, 0, titleCanvas.width, titleCanvas.height);

    // Cerchio runico rotante nello sfondo
    titleCtx.save();
    titleCtx.translate(cx, cy * 0.72);
    titleCtx.rotate(time * 0.05);
    titleCtx.strokeStyle = 'rgba(56, 189, 248, 0.09)';
    titleCtx.lineWidth = 1.5;
    titleCtx.beginPath();
    titleCtx.arc(0, 0, 190, 0, Math.PI * 2);
    titleCtx.stroke();
    titleCtx.beginPath();
    titleCtx.arc(0, 0, 150, 0, Math.PI * 2);
    titleCtx.stroke();
    for (let a = 0; a < 8; a++) {
      const angle = (a * Math.PI) / 4;
      titleCtx.beginPath();
      titleCtx.moveTo(Math.cos(angle) * 150, Math.sin(angle) * 150);
      titleCtx.lineTo(Math.cos(angle) * 190, Math.sin(angle) * 190);
      titleCtx.stroke();
    }
    titleCtx.restore();

    // Mote di luce e stelle ascendenti
    for (const p of titleParticles) {
      p.y -= p.speedY * dt;
      p.x += Math.sin(time * 1.5 + p.phase) * (p.speedX * dt);
      if (p.y < -10) {
        p.y = titleCanvas.height + 10;
        p.x = Math.random() * titleCanvas.width;
      }
      const pulseAlpha = Math.sin(time * 2 + p.phase) * 0.2 + p.alpha;
      titleCtx.save();
      titleCtx.globalAlpha = Math.max(0.1, Math.min(1, pulseAlpha));
      titleCtx.fillStyle = p.color;
      titleCtx.beginPath();
      titleCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      titleCtx.fill();
      titleCtx.restore();
    }
  }

  // =========================================================================
  // 2. GESTIONE PROFILO & STATISTICHE CARRIERA
  // =========================================================================
  async function refreshProfile(nickname = (API.currentUser ? API.currentUser.username : API.nickname)) {
    currentProfile = await API.getProfile(nickname || 'Mago-' + Math.floor(1000 + Math.random() * 9000));

    if (elNicknameDisplay) {
      elNicknameDisplay.textContent = currentProfile.nickname;
    }

    if (myFriendIdDisplay) {
      const code = Math.abs(currentProfile.nickname.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 1000)) % 9000 + 1000;
      myFriendIdDisplay.textContent = `AETH-${code}`;
    }

    if (elAccountBadge) {
      if (API.isGuest) {
        elAccountBadge.textContent = '⚠️ Ospite (Locale)';
        elAccountBadge.className = 'badge-guest';
      } else {
        elAccountBadge.textContent = '🛡️ Online';
        elAccountBadge.className = 'badge-account';
      }
    }

    if (elMenuGold) elMenuGold.textContent = `${currentProfile.gold}`;
    if (elStatKills) elStatKills.textContent = `${currentProfile.totalKills || 0}`;
    if (elStatHighLvl) elStatHighLvl.textContent = `${currentProfile.highestLevel || 1}`;
    if (elStatBestTime) elStatBestTime.textContent = formatTime(currentProfile.bestSurvivalSeconds || 0);

    if (elServerStatus) {
      if (API.isOnline) {
        elServerStatus.textContent = 'Online';
        elServerStatus.className = 'status-online';
      } else {
        elServerStatus.textContent = 'Offline (Locale)';
        elServerStatus.className = 'status-offline';
      }
    }

    renderTalentsGrid();
    renderIngameWeapons();
    renderIngameForge();
    renderIngameLoot();
  }

  // =========================================================================
  // 3. GRIMORIO TALENTI (POTENZIAMENTI IN-GAME!)
  // =========================================================================
  function renderTalentsGrid() {
    if (!currentProfile || !talentsContainer) return;
    talentsContainer.innerHTML = '';

    currentProfile.talentsCatalog.forEach(talent => {
      const card = document.createElement('div');
      card.className = 'talent-card';

      let pipsHtml = '';
      for (let i = 0; i < talent.maxRank; i++) {
        pipsHtml += `<div class="pip ${i < talent.currentRank ? 'filled' : ''}"></div>`;
      }

      const isMaxed = talent.currentRank >= talent.maxRank;
      const canAfford = !isMaxed && currentProfile.gold >= talent.nextCost;

      card.innerHTML = `
        <div>
          <div class="talent-head">
            <span class="talent-icon">${talent.icon}</span>
            <div class="talent-title">${talent.name}</div>
          </div>
          <div class="talent-desc">${talent.desc}</div>
        </div>
        <div>
          <div class="talent-rank-row">
            <span>Rango ${talent.currentRank}/${talent.maxRank}</span>
            <div class="rank-pips">${pipsHtml}</div>
          </div>
          <button class="btn-upgrade" ${!canAfford ? 'disabled' : ''} style="width: 100%; margin-top: 8px;">
            ${isMaxed ? 'Rango Massimo' : `Potenzia (${talent.nextCost} 🪙)`}
          </button>
        </div>
      `;

      const btnUpgrade = card.querySelector('.btn-upgrade');
      if (canAfford) {
        btnUpgrade.addEventListener('click', async () => {
          try {
            currentProfile = await API.upgradeTalent(talent.id);
            // Applica immediatamente i benefici all'eroe durante la partita
            player.applyPermanentStats(currentProfile.calculatedStats);
            showWeaponNotification(`✨ Talento potenziato: ${talent.name}!`);
            refreshProfile(currentProfile.nickname);
          } catch (err) {
            alert(err.message);
          }
        });
      }

      talentsContainer.appendChild(card);
    });
  }

  // =========================================================================
  // 4. CLASSIFICA GLOBALE
  // =========================================================================
  async function renderLeaderboard() {
    if (!leaderboardRows) return;
    leaderboardRows.innerHTML = '<tr><td colspan="6" style="text-align:center;">Caricamento classifica...</td></tr>';
    const list = await API.getLeaderboard();
    leaderboardRows.innerHTML = '';

    if (!list || list.length === 0) {
      leaderboardRows.innerHTML = '<tr><td colspan="6" style="text-align:center;">Nessun record ancora registrato! Sii il primo!</td></tr>';
      return;
    }

    list.forEach((item, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 800; color: ${index === 0 ? '#fde047' : (index === 1 ? '#cbd5e1' : (index === 2 ? '#b45309' : '#94a3b8'))};">#${index + 1}</td>
        <td style="font-weight: 700; color: #f8fafc;">${item.nickname}</td>
        <td style="font-weight: 800; color: #38bdf8;">${item.score}</td>
        <td>LV ${item.level}</td>
        <td>${item.kills}</td>
        <td>${formatTime(item.survivalSeconds)}</td>
      `;
      leaderboardRows.appendChild(tr);
    });
  }

  if (btnOpenLeaderboard) {
    btnOpenLeaderboard.addEventListener('click', () => {
      leaderboardModal?.classList.remove('hidden');
      renderLeaderboard();
    });
  }
  if (btnCloseLeaderboard) btnCloseLeaderboard.addEventListener('click', () => leaderboardModal?.classList.add('hidden'));
  if (btnCloseLeaderboardFoot) btnCloseLeaderboardFoot.addEventListener('click', () => leaderboardModal?.classList.add('hidden'));

  // =========================================================================
  // 5. GESTIONE AUTENTICAZIONE ACCOUNT (LOGIN & REGISTRAZIONE)
  // =========================================================================
  function showAuthAlert(msg, isError = true) {
    if (!authAlert) return;
    authAlert.textContent = msg;
    authAlert.className = `auth-alert ${isError ? 'error' : 'success'}`;
    authAlert.classList.remove('hidden');
  }

  function hideAuthAlert() {
    if (!authAlert) return;
    authAlert.classList.add('hidden');
  }

  function openAuthModal(initialTab = 'login') {
    hideAuthAlert();
    authModal?.classList.remove('hidden');
    switchAuthTab(initialTab);
  }

  function closeAuthModal() {
    authModal?.classList.add('hidden');
  }

  function switchAuthTab(tab) {
    hideAuthAlert();
    if (tab === 'login') {
      authTabBtnLogin?.classList.add('active');
      authTabBtnRegister?.classList.remove('active');
      formLogin?.classList.remove('hidden');
      formRegister?.classList.add('hidden');
      if (inputLoginUser) inputLoginUser.focus();
    } else {
      authTabBtnRegister?.classList.add('active');
      authTabBtnLogin?.classList.remove('active');
      formRegister?.classList.remove('hidden');
      formLogin?.classList.add('hidden');
      if (inputRegUser) inputRegUser.focus();
    }
  }

  if (authTabBtnLogin) authTabBtnLogin.addEventListener('click', () => switchAuthTab('login'));
  if (authTabBtnRegister) authTabBtnRegister.addEventListener('click', () => switchAuthTab('register'));

  if (btnSwitchAccount) {
    btnSwitchAccount.addEventListener('click', () => {
      openAuthModal('login');
    });
  }

  if (btnContinueGuest) {
    btnContinueGuest.addEventListener('click', () => {
      API.isGuest = true;
      closeAuthModal();
      refreshProfile();
    });
  }

  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAuthAlert();
      const user = inputLoginUser.value.trim();
      const pass = inputLoginPass.value;
      if (!user || !pass) {
        showAuthAlert('Inserisci nome utente e password.');
        return;
      }
      try {
        showAuthAlert('Accesso in corso...', false);
        const res = await API.login(user, pass);
        closeAuthModal();
        await refreshProfile(res.user.username);
      } catch (err) {
        showAuthAlert(err.message || 'Errore durante l\'accesso.', true);
      }
    });
  }

  if (formRegister) {
    formRegister.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAuthAlert();
      const user = inputRegUser.value.trim();
      const email = inputRegEmail.value.trim();
      const pass = inputRegPass.value;
      const passConfirm = inputRegPassConfirm.value;

      if (!user || user.length < 3) {
        showAuthAlert('Il nome deve contenere almeno 3 caratteri.', true);
        return;
      }
      if (pass.length < 4) {
        showAuthAlert('La password deve contenere almeno 4 caratteri.', true);
        return;
      }
      if (pass !== passConfirm) {
        showAuthAlert('Le due password non corrispondono!', true);
        return;
      }

      try {
        showAuthAlert('Creazione account in corso...', false);
        const res = await API.register(user, pass, email);
        closeAuthModal();
        await refreshProfile(res.user.username);
      } catch (err) {
        showAuthAlert(err.message || 'Errore durante la registrazione.', true);
      }
    });
  }

  // =========================================================================
  // 6. GESTIONE ARMI & INVENTARIO IN-GAME
  // =========================================================================
  function showWeaponNotification(text) {
    if (!weaponNotification) return;
    weaponNotification.textContent = text;
    weaponNotification.classList.remove('hidden');
    clearTimeout(notificationTimeout);
    notificationTimeout = setTimeout(() => {
      weaponNotification.classList.add('hidden');
    }, 2200);
  }

  function equipWeapon(weaponId) {
    const level = (currentProfile && currentProfile.weapons && currentProfile.weapons[weaponId]) || 1;
    player.weapon = weaponId;
    combat.setWeapon(weaponId, level, player.permanentBonusDamage || 0);

    if (currentProfile) {
      currentProfile.equippedWeapon = weaponId;
    }

    if (elWeaponIcon) elWeaponIcon.textContent = weaponId === 'sword' ? '🗡️' : (weaponId === 'bow' ? '🏹' : '🪄');
    if (elWeaponName) elWeaponName.textContent = combat.weaponName;

    let dmg = 18;
    if (weaponId === 'sword') dmg = combat.swordDamage || 28;
    else if (weaponId === 'bow') dmg = combat.bowDamage || 22;
    else dmg = combat.staffDamage || 18;
    if (elDamage) elDamage.textContent = `${Math.round(dmg * combat.damageMultiplier)}`;

    const weaponNames = {
      staff: "Bastone dell'Arcimago 🪄",
      sword: "Spada da Cavaliere 🗡️",
      bow: "Arco dei Guardaboschi 🏹"
    };
    showWeaponNotification(`⚔️ Arma Equipaggiata: ${weaponNames[weaponId] || weaponId}`);
    renderIngameWeapons();
  }

  function renderIngameLoot() {
    if (!ingameLootContainer) return;
    ingameLootContainer.innerHTML = '';

    const allMaterials = Object.values(MATERIALS_DEF);
    allMaterials.forEach(mat => {
      const runCount = (combat.collectedItems && combat.collectedItems[mat.id]) || 0;
      const totalOwned = (currentProfile && currentProfile.inventory && currentProfile.inventory[mat.id]) || 0;

      const card = document.createElement('div');
      card.className = 'inventory-item-card';
      card.innerHTML = `
        <div class="item-top">
          <div class="item-icon-box">${mat.icon}</div>
          <div class="item-count-badge" style="opacity: ${runCount > 0 ? 1 : 0.45};">
            +${runCount} raccolti ora
          </div>
        </div>
        <div>
          <div class="item-name">${mat.name}</div>
          <div class="item-rarity" style="color: ${mat.color};">${mat.rarity} · In archivio: ${totalOwned}</div>
        </div>
        <div class="item-desc">${mat.desc}</div>
      `;
      ingameLootContainer.appendChild(card);
    });
  }

  function renderIngameWeapons() {
    if (!ingameWeaponsContainer) return;
    ingameWeaponsContainer.innerHTML = '';

    const weaponsList = [
      {
        id: 'staff',
        key: '1',
        name: "Bastone dell'Arcimago",
        icon: '🪄',
        type: 'Magia a Distanza (Dardi Autoguidati)',
        desc: 'Scaglia dardi arcani luminosi che inseguono automaticamente i nemici nel raggio d\'azione.',
        stats: 'Danno: 18 · Dardi: 1-3 · Gittata: Lunga'
      },
      {
        id: 'sword',
        key: '2',
        name: 'Spada da Cavaliere',
        icon: '🗡️',
        type: 'Mischia ad Area (Fendenti Ravvicinati)',
        desc: 'Colpisce con violenti archi di taglio semicircolari, scintille metalliche e forte respinta indietro (knockback).',
        stats: 'Danno: 28 · Raggio arco: 92px · Spinta: Alta'
      },
      {
        id: 'bow',
        key: '3',
        name: 'Arco dei Guardaboschi',
        icon: '🏹',
        type: 'Frecce Perforanti a Lungo Raggio',
        desc: 'Scocca frecce fulminee che trapassano 2 o più nemici in linea retta a grandissima distanza.',
        stats: 'Danno: 22 · Perforazione: 2 bersagli · Velocità freccia: Altissima'
      }
    ];

    weaponsList.forEach(w => {
      const isCurrent = combat.weaponId === w.id;
      const card = document.createElement('div');
      card.className = `weapon-card ${isCurrent ? 'equipped' : ''}`;
      card.innerHTML = `
        ${isCurrent ? '<div class="weapon-badge-equipped">✓ In Uso Ora</div>' : ''}
        <div>
          <div class="weapon-head">
            <div class="weapon-icon">${w.icon}</div>
            <div>
              <div class="weapon-title">${w.name} [Tasto ${w.key}]</div>
              <div class="weapon-type-tag">${w.type}</div>
            </div>
          </div>
          <div class="weapon-desc">${w.desc}</div>
          <div style="font-size: 11px; color: #38bdf8; font-weight: 700; margin-top: 6px;">⚡ ${w.stats}</div>
        </div>
        <div style="margin-top: 10px;">
          <button class="btn-equip" style="width: 100%;">
            ${isCurrent ? '✓ Già Equipaggiata' : `⚔️ Equipaggia Subito [Tasto ${w.key}]`}
          </button>
        </div>
      `;

      const btn = card.querySelector('.btn-equip');
      btn.addEventListener('click', () => {
        equipWeapon(w.id);
      });

      ingameWeaponsContainer.appendChild(card);
    });
  }

  // Classe Entità Monolite Runico per il Mistero delle Cascate
  class MysteryPillar {
    constructor(x, y, index, name) {
      this.x = x;
      this.y = y;
      this.index = index;
      this.name = name;
      this.activated = false;
      this.r = 20;
      this.pulseTimer = 0;
    }

    activate() {
      if (this.activated) return;
      this.activated = true;
      FX.burst(this.x, this.y - 14, '#06b6d4', 22, 110);
      FX.floatingText(this.x, this.y - 30, `✨ ${this.name} Risvegliata!`, '#67e8f9');
    }

    update(dt) {
      this.pulseTimer += dt;
    }

    draw(ctx) {
      Sprites.drawShadow(ctx, this.x, this.y - 2, 14);
      const spriteType = this.activated ? 'runic_pillar_lit' : 'runic_pillar';
      const sprite = Tiles.getPropSprite(spriteType);
      if (this.activated) {
        const pulse = 0.7 + Math.sin(this.pulseTimer * 4) * 0.3;
        const glow = ctx.createRadialGradient(this.x, this.y - 18, 4, this.x, this.y - 18, 42);
        glow.addColorStop(0, `rgba(6, 182, 212, ${0.45 * pulse})`);
        glow.addColorStop(1, 'rgba(6, 182, 212, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(this.x, this.y - 18, 42, 0, Math.PI * 2);
        ctx.fill();
      }
      if (sprite) {
        const sw = sprite.width * 2;
        const sh = sprite.height * 2;
        ctx.drawImage(sprite, Math.round(this.x - sw / 2), Math.round(this.y - sh + 6), sw, sh);
      }
      ctx.save();
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      if (this.activated) {
        ctx.fillStyle = '#67e8f9';
        ctx.fillText(`✓ ${this.name}`, Math.round(this.x), Math.round(this.y - 34));
      } else {
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`🔮 ${this.name}`, Math.round(this.x), Math.round(this.y - 34));
      }
      ctx.restore();
    }
  }

  // Visualizzazione Ricette Forgia nello Zaino (Consultazione)
  function renderIngameForge() {
    if (!ingameForgeContainer || !currentProfile) return;
    ingameForgeContainer.innerHTML = '';

    // Controlla se il giocatore è vicino a un fabbro nel villaggio
    const nearbyBs = world.getNearbyBlacksmith(player.x, player.y, 110);
    if (nearbyBs && forgeNearBlacksmithBtnBox && nearBsName) {
      forgeNearBlacksmithBtnBox.classList.remove('hidden');
      nearBsName.textContent = nearbyBs.name;
    } else if (forgeNearBlacksmithBtnBox) {
      forgeNearBlacksmithBtnBox.classList.add('hidden');
    }

    currentProfile.weaponsCatalog.forEach(w => {
      const card = document.createElement('div');
      card.className = `weapon-card ${w.isEquipped ? 'equipped' : ''}`;

      let reqHtml = '';
      if (w.isMaxLevel) {
        reqHtml = `<div class="weapon-req-box" style="color: #4ade80; text-align: center; font-weight: 700;">★ Grado Massimo (LV 5)</div>`;
      } else if (w.nextCost) {
        const goldHas = currentProfile.gold >= (w.nextCost.gold || 0);
        let matsRows = '';

        if (w.nextCost.materials) {
          for (const [matId, reqAmt] of Object.entries(w.nextCost.materials)) {
            const owned = ((currentProfile.inventory && currentProfile.inventory[matId]) || 0) + ((combat.collectedItems && combat.collectedItems[matId]) || 0);
            const hasEnough = owned >= reqAmt;
            const matDef = MATERIALS_DEF[matId] || { name: matId, icon: '📦' };
            matsRows += `
              <div class="req-item ${hasEnough ? 'has' : 'missing'}">
                <span>${matDef.icon} ${matDef.name}:</span>
                <span>${owned} / ${reqAmt}</span>
              </div>
            `;
          }
        }

        reqHtml = `
          <div class="weapon-req-box">
            <div class="weapon-req-title">${w.isUnlocked ? 'Requisiti Potenziamento:' : 'Materiali per Forgiare:'}</div>
            <div class="req-item ${goldHas ? 'has' : 'missing'}">
              <span>🪙 Oro:</span>
              <span>${currentProfile.gold} / ${w.nextCost.gold || 0}</span>
            </div>
            ${matsRows}
            <div style="margin-top: 6px; font-size: 11px; color: #38bdf8; font-weight: 600;">✨ ${w.nextBenefit}</div>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="weapon-head">
          <div class="weapon-icon">${w.icon}</div>
          <div>
            <div class="weapon-title">${w.name}</div>
            <div class="weapon-type-tag">Grado: Livello ${w.currentLevel} / ${w.maxLevel}</div>
          </div>
        </div>
        <div style="margin: 8px 0;">${reqHtml}</div>
        <button class="btn-forge btn-forge-info" style="width: 100%; opacity: 0.85;">
          ${nearbyBs ? `🔨 Parla con ${nearbyBs.name} per Forgiare` : '📍 Trova un Fabbro nei Villaggi per Forgiare'}
        </button>
      `;

      const btnInfo = card.querySelector('.btn-forge-info');
      btnInfo?.addEventListener('click', () => {
        if (nearbyBs) {
          openBlacksmithModal(nearbyBs);
        } else {
          showWeaponNotification("Visita l'NPC Fabbro in uno dei villaggi protetti per lavorare quest'arma!");
        }
      });

      ingameForgeContainer.appendChild(card);
    });
  }

  // Modale Fucina Dedicata del Fabbro NPC (Dove avviene la forgiatura reale!)
  function renderBlacksmithForge(bs) {
    if (!blacksmithForgeContainer || !currentProfile) return;
    blacksmithForgeContainer.innerHTML = '';

    currentProfile.weaponsCatalog.forEach(w => {
      const card = document.createElement('div');
      card.className = `weapon-card ${w.isEquipped ? 'equipped' : ''}`;

      let reqHtml = '';
      let canAfford = false;

      if (w.isMaxLevel) {
        reqHtml = `<div class="weapon-req-box" style="color: #4ade80; text-align: center; font-weight: 700;">★ Grado Massimo (LV 5)</div>`;
      } else if (w.nextCost) {
        const goldHas = currentProfile.gold >= (w.nextCost.gold || 0);
        let matsOk = true;
        let matsRows = '';

        if (w.nextCost.materials) {
          for (const [matId, reqAmt] of Object.entries(w.nextCost.materials)) {
            const owned = ((currentProfile.inventory && currentProfile.inventory[matId]) || 0) + ((combat.collectedItems && combat.collectedItems[matId]) || 0);
            const hasEnough = owned >= reqAmt;
            if (!hasEnough) matsOk = false;
            const matDef = MATERIALS_DEF[matId] || { name: matId, icon: '📦' };
            matsRows += `
              <div class="req-item ${hasEnough ? 'has' : 'missing'}">
                <span>${matDef.icon} ${matDef.name}:</span>
                <span>${owned} / ${reqAmt}</span>
              </div>
            `;
          }
        }

        canAfford = goldHas && matsOk;

        reqHtml = `
          <div class="weapon-req-box">
            <div class="weapon-req-title">${w.isUnlocked ? 'Requisiti Tempra:' : 'Materiali Forgiatura:'}</div>
            <div class="req-item ${goldHas ? 'has' : 'missing'}">
              <span>🪙 Oro:</span>
              <span>${currentProfile.gold} / ${w.nextCost.gold || 0}</span>
            </div>
            ${matsRows}
            <div style="margin-top: 6px; font-size: 11px; color: #38bdf8; font-weight: 600;">✨ ${w.nextBenefit}</div>
          </div>
        `;
      }

      card.innerHTML = `
        <div class="weapon-head">
          <div class="weapon-icon">${w.icon}</div>
          <div>
            <div class="weapon-title">${w.name}</div>
            <div class="weapon-type-tag">Grado Attuale: Livello ${w.currentLevel} / ${w.maxLevel}</div>
          </div>
        </div>
        <div style="margin: 8px 0;">${reqHtml}</div>
        <button class="btn-forge" ${!canAfford ? 'disabled' : ''} style="width: 100%;">
          🔨 ${w.isUnlocked ? `Tempra a Livello ${w.currentLevel + 1}` : 'Forgia Nuova Arma'}
        </button>
      `;

      const btnForge = card.querySelector('.btn-forge');
      if (btnForge && canAfford) {
        btnForge.addEventListener('click', async () => {
          try {
            currentProfile = await API.craftOrUpgradeWeapon(w.id);
            FX.burst(player.x, player.y, '#f59e0b', 24, 120);
            showWeaponNotification(`🔨 ${w.name} lavorata con successo da ${bs.name}!`);
            renderBlacksmithForge(bs);
            renderIngameForge();
            renderIngameWeapons();
            equipWeapon(combat.weaponId);
          } catch (err) {
            alert(err.message);
          }
        });
      }

      blacksmithForgeContainer.appendChild(card);
    });
  }

  function openBlacksmithModal(bs) {
    if (gameState !== 'PLAYING') return;
    activeBlacksmith = bs;
    closeIngameInventory();
    closeTacticalMap();
    closeGameMenu();

    isBlacksmithOpen = true;
    if (bsModalName) bsModalName.textContent = bs.name;
    if (bsModalTitle) bsModalTitle.textContent = `${bs.title} · ${bs.villageName || 'Villaggio'}`;
    if (bsModalQuote) bsModalQuote.textContent = `"${bs.quote}"`;

    blacksmithModal?.classList.remove('hidden');
    renderBlacksmithForge(bs);
  }

  function closeBlacksmithModal() {
    isBlacksmithOpen = false;
    activeBlacksmith = null;
    blacksmithModal?.classList.add('hidden');
  }

  if (btnCloseBlacksmith) btnCloseBlacksmith.addEventListener('click', closeBlacksmithModal);
  if (btnResumeFromBlacksmith) btnResumeFromBlacksmith.addEventListener('click', closeBlacksmithModal);
  if (btnOpenNearBlacksmith) {
    btnOpenNearBlacksmith.addEventListener('click', () => {
      const nearbyBs = world.getNearbyBlacksmith(player.x, player.y, 110);
      if (nearbyBs) openBlacksmithModal(nearbyBs);
    });
  }

  function switchIngameTab(tabName) {
    [ingameTabBtnLoot, ingameTabBtnTalents, ingameTabBtnForge, ingameTabBtnWeapons].forEach(b => b?.classList.remove('active'));
    [ingameTabLoot, ingameTabTalents, ingameTabForge, ingameTabWeapons].forEach(p => p?.classList.remove('active'));

    if (tabName === 'loot') {
      ingameTabBtnLoot?.classList.add('active');
      ingameTabLoot?.classList.add('active');
      renderIngameLoot();
    } else if (tabName === 'talents') {
      ingameTabBtnTalents?.classList.add('active');
      ingameTabTalents?.classList.add('active');
      renderTalentsGrid();
    } else if (tabName === 'weapons') {
      ingameTabBtnWeapons?.classList.add('active');
      ingameTabWeapons?.classList.add('active');
      renderIngameWeapons();
    } else {
      ingameTabBtnForge?.classList.add('active');
      ingameTabForge?.classList.add('active');
      renderIngameForge();
    }
  }

  function openIngameInventory(tab = 'loot') {
    if (gameState !== 'PLAYING') return;
    closeTacticalMap();
    closeGameMenu();
    closeBlacksmithModal();
    isInventoryOpen = true;
    ingameModal?.classList.remove('hidden');
    switchIngameTab(tab);
  }

  function closeIngameInventory() {
    isInventoryOpen = false;
    ingameModal?.classList.add('hidden');
  }

  function toggleIngameInventory() {
    if (isInventoryOpen) closeIngameInventory();
    else openIngameInventory('loot');
  }

  if (hudBtnBag) hudBtnBag.addEventListener('click', () => toggleIngameInventory());
  if (btnCloseBag) btnCloseBag.addEventListener('click', () => closeIngameInventory());
  if (btnResumeGame) btnResumeGame.addEventListener('click', () => closeIngameInventory());

  if (ingameTabBtnLoot) ingameTabBtnLoot.addEventListener('click', () => switchIngameTab('loot'));
  if (ingameTabBtnTalents) ingameTabBtnTalents.addEventListener('click', () => switchIngameTab('talents'));
  if (ingameTabBtnForge) ingameTabBtnForge.addEventListener('click', () => switchIngameTab('forge'));
  if (ingameTabBtnWeapons) ingameTabBtnWeapons.addEventListener('click', () => switchIngameTab('weapons'));

  // =========================================================================
  // 7. MINIMAPPA LIVE RADAR & MAPPA TATTICA ESPANSA
  // =========================================================================
  function renderMinimap() {
    if (!minimapCtx || !minimapCanvas || gameState !== 'PLAYING') return;

    const w = minimapCanvas.width;
    const h = minimapCanvas.height;
    const cx = w / 2;
    const cy = h / 2;

    const mapExtent = (world.MAP_RADIUS * world.TS) * 2; // 7680 px
    const scale = w / mapExtent;

    minimapCtx.clearRect(0, 0, w, h);

    // Sfondo base
    minimapCtx.fillStyle = '#080c14';
    minimapCtx.fillRect(0, 0, w, h);

    // 1. Grandi quadranti sfumati dei Biomi
    // Nord: Neve
    minimapCtx.fillStyle = 'rgba(125, 211, 252, 0.35)';
    minimapCtx.fillRect(0, 0, w, cy - 25 * world.TS * scale);

    // Sud-Ovest: Deserto
    minimapCtx.fillStyle = 'rgba(217, 119, 6, 0.35)';
    minimapCtx.fillRect(0, cy + 20 * world.TS * scale, cx, h);

    // Est: Vulcano
    minimapCtx.fillStyle = 'rgba(185, 28, 28, 0.35)';
    minimapCtx.fillRect(cx + 18 * world.TS * scale, cy - 15 * world.TS * scale, cx, h);

    // Ovest: Bosco
    minimapCtx.fillStyle = 'rgba(22, 101, 52, 0.4)';
    minimapCtx.fillRect(0, cy - 25 * world.TS * scale, cx + 18 * world.TS * scale, 45 * world.TS * scale);

    // 2. Fiume serpeggiante in blu cielo
    minimapCtx.strokeStyle = '#0284c7';
    minimapCtx.lineWidth = 2.5;
    minimapCtx.beginPath();
    for (let ty = -world.MAP_RADIUS; ty <= world.MAP_RADIUS; ty += 4) {
      const rx = world.getRiverCenterX(ty) * world.TS;
      const ry = ty * world.TS;
      const mx = cx + rx * scale;
      const my = cy + ry * scale;
      if (ty === -world.MAP_RADIUS) minimapCtx.moveTo(mx, my);
      else minimapCtx.lineTo(mx, my);
    }
    minimapCtx.stroke();

    // 3. Strade Maestre (linee dorate tenui)
    minimapCtx.strokeStyle = 'rgba(245, 158, 11, 0.55)';
    minimapCtx.lineWidth = 1;
    for (const r of ROAD_SEGMENTS) {
      minimapCtx.beginPath();
      minimapCtx.moveTo(cx + r.x1 * world.TS * scale, cy + r.y1 * world.TS * scale);
      minimapCtx.lineTo(cx + r.x2 * world.TS * scale, cy + r.y2 * world.TS * scale);
      minimapCtx.stroke();
    }

    // 3b. Sentieri sterrati dei Biomi (linee tratteggiate)
    minimapCtx.strokeStyle = 'rgba(217, 119, 6, 0.45)';
    minimapCtx.lineWidth = 0.8;
    minimapCtx.setLineDash([2, 2]);
    for (const t of TRAIL_SEGMENTS) {
      minimapCtx.beginPath();
      minimapCtx.moveTo(cx + t.x1 * world.TS * scale, cy + t.y1 * world.TS * scale);
      minimapCtx.lineTo(cx + t.x2 * world.TS * scale, cy + t.y2 * world.TS * scale);
      minimapCtx.stroke();
    }
    minimapCtx.setLineDash([]);

    // 4. Città e Insediamenti con perimetro Safe Zone protetto
    for (const s of SETTLEMENTS) {
      const sx = cx + s.centerTx * world.TS * scale;
      const sy = cy + s.centerTy * world.TS * scale;
      const sr = s.radiusTiles * world.TS * scale;

      // Perimetro Safe Zone
      minimapCtx.fillStyle = 'rgba(56, 189, 248, 0.2)';
      minimapCtx.beginPath();
      minimapCtx.arc(sx, sy, sr, 0, Math.PI * 2);
      minimapCtx.fill();

      // Centro città
      minimapCtx.fillStyle = s.color || '#38bdf8';
      minimapCtx.beginPath();
      minimapCtx.arc(sx, sy, s.id === 'citadel' ? 3.5 : 2.5, 0, Math.PI * 2);
      minimapCtx.fill();
    }

    // 4b. Marker POI (Boss 👑 e Mistero 🔮)
    minimapCtx.font = '7px sans-serif';
    minimapCtx.textAlign = 'center';
    for (const poi of POINTS_OF_INTEREST) {
      const px = cx + poi.tx * world.TS * scale;
      const py = cy + poi.ty * world.TS * scale;
      minimapCtx.fillText(poi.icon, px, py + 2.5);
    }

    // 5. Nemici come puntini rossi (esclusi dalle città)
    minimapCtx.fillStyle = '#f87171';
    for (const en of combat.enemies) {
      const mx = cx + en.x * scale;
      const my = cy + en.y * scale;
      if (mx >= 0 && mx < w && my >= 0 && my < h) {
        minimapCtx.fillRect(mx - 0.75, my - 0.75, 1.5, 1.5);
      }
    }

    // 6. Giocatore come punto ciano pulsante
    const px = cx + player.x * scale;
    const py = cy + player.y * scale;

    minimapCtx.fillStyle = 'rgba(56, 189, 248, 0.4)';
    minimapCtx.beginPath();
    minimapCtx.arc(px, py, 4, 0, Math.PI * 2);
    minimapCtx.fill();

    minimapCtx.fillStyle = '#ffffff';
    minimapCtx.beginPath();
    minimapCtx.arc(px, py, 2, 0, Math.PI * 2);
    minimapCtx.fill();

    // Bordo radar
    minimapCtx.strokeStyle = '#0284c7';
    minimapCtx.lineWidth = 1.5;
    minimapCtx.strokeRect(0, 0, w, h);

    // Etichetta del bioma/città corrente
    const curB = getBiomeInfo(player.x, player.y);
    if (minimapBiomeName) {
      minimapBiomeName.textContent = curB.name;
    }
  }

  function renderTacticalMap() {
    if (!expandedCtx || !expandedCanvas) return;
    const w = expandedCanvas.width;
    const h = expandedCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const mapExtent = (world.MAP_RADIUS * world.TS) * 2; // 7680 px
    const scale = w / mapExtent;

    expandedCtx.clearRect(0, 0, w, h);

    // Sfondo pergamena scura
    expandedCtx.fillStyle = '#080c14';
    expandedCtx.fillRect(0, 0, w, h);

    // Griglia coordinate
    expandedCtx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
    expandedCtx.lineWidth = 1;
    for (let x = 0; x <= w; x += 46) {
      expandedCtx.beginPath();
      expandedCtx.moveTo(x, 0);
      expandedCtx.lineTo(x, h);
      expandedCtx.stroke();
    }
    for (let y = 0; y <= h; y += 46) {
      expandedCtx.beginPath();
      expandedCtx.moveTo(0, y);
      expandedCtx.lineTo(w, y);
      expandedCtx.stroke();
    }

    // Zone Biomi Sfumate
    // Neve (Nord)
    expandedCtx.fillStyle = 'rgba(125, 211, 252, 0.22)';
    expandedCtx.fillRect(0, 0, w, cy - 25 * world.TS * scale);
    expandedCtx.fillStyle = '#7dd3fc';
    expandedCtx.font = 'bold 10px sans-serif';
    expandedCtx.fillText('❄️ VETTE INNEVATE', 20, 25);

    // Bosco (Ovest)
    expandedCtx.fillStyle = 'rgba(22, 101, 52, 0.25)';
    expandedCtx.fillRect(0, cy - 25 * world.TS * scale, cx, 50 * world.TS * scale);
    expandedCtx.fillStyle = '#4ade80';
    expandedCtx.fillText('🌲 BOSCO SILVANO', 20, cy - 15);

    // Deserto (Sud-Ovest)
    expandedCtx.fillStyle = 'rgba(217, 119, 6, 0.25)';
    expandedCtx.fillRect(0, cy + 25 * world.TS * scale, cx + 10, h - (cy + 25 * world.TS * scale));
    expandedCtx.fillStyle = '#fde047';
    expandedCtx.fillText('🏜️ DESERTO DELLE DUNE', 20, h - 20);

    // Vulcano (Est / Sud-Est)
    expandedCtx.fillStyle = 'rgba(185, 28, 28, 0.25)';
    expandedCtx.fillRect(cx + 20 * world.TS * scale, cy - 20 * world.TS * scale, cx, h);
    expandedCtx.fillStyle = '#f87171';
    expandedCtx.fillText('🌋 CALDERA VULCANICA', cx + 45, cy + 50);

    // Fiume Serpeggiante e Cascate (Nastro azzurro)
    expandedCtx.strokeStyle = '#0284c7';
    expandedCtx.lineWidth = 7;
    expandedCtx.beginPath();
    for (let ty = -world.MAP_RADIUS; ty <= world.MAP_RADIUS; ty += 2) {
      const rx = world.getRiverCenterX(ty) * world.TS;
      const ry = ty * world.TS;
      const mx = cx + rx * scale;
      const my = cy + ry * scale;
      if (ty === -world.MAP_RADIUS) expandedCtx.moveTo(mx, my);
      else expandedCtx.lineTo(mx, my);
    }
    expandedCtx.stroke();

    expandedCtx.strokeStyle = '#7dd3fc';
    expandedCtx.lineWidth = 3;
    expandedCtx.stroke();

    // Simbolo Cascate sul Fiume
    const wfX = cx + (-40 * world.TS) * scale;
    const wfY = cy + (22 * world.TS) * scale;
    expandedCtx.fillStyle = '#ffffff';
    expandedCtx.font = 'bold 9px sans-serif';
    expandedCtx.fillText('🌊 CASCATE', wfX - 18, wfY - 14);

    // Rete Stradale Maestra (Linee dorate con bagliore)
    expandedCtx.strokeStyle = 'rgba(245, 158, 11, 0.75)';
    expandedCtx.lineWidth = 2.2;
    for (const r of ROAD_SEGMENTS) {
      expandedCtx.beginPath();
      expandedCtx.moveTo(cx + r.x1 * world.TS * scale, cy + r.y1 * world.TS * scale);
      expandedCtx.lineTo(cx + r.x2 * world.TS * scale, cy + r.y2 * world.TS * scale);
      expandedCtx.stroke();
    }

    // Sentieri Selvaggi dei Biomi (Linee tratteggiate ambra)
    expandedCtx.strokeStyle = 'rgba(217, 119, 6, 0.65)';
    expandedCtx.lineWidth = 1.4;
    expandedCtx.setLineDash([4, 3]);
    for (const t of TRAIL_SEGMENTS) {
      expandedCtx.beginPath();
      expandedCtx.moveTo(cx + t.x1 * world.TS * scale, cy + t.y1 * world.TS * scale);
      expandedCtx.lineTo(cx + t.x2 * world.TS * scale, cy + t.y2 * world.TS * scale);
      expandedCtx.stroke();
    }
    expandedCtx.setLineDash([]); // Ripristina linea continua

    // Città e Villaggi Fortificati (Safe Zones)
    for (const s of SETTLEMENTS) {
      const sx = cx + s.centerTx * world.TS * scale;
      const sy = cy + s.centerTy * world.TS * scale;
      const sr = s.radiusTiles * world.TS * scale;

      // Cerchio Safe Zone con bagliore
      expandedCtx.fillStyle = 'rgba(56, 189, 248, 0.15)';
      expandedCtx.beginPath();
      expandedCtx.arc(sx, sy, sr, 0, Math.PI * 2);
      expandedCtx.fill();

      expandedCtx.strokeStyle = s.color || '#38bdf8';
      expandedCtx.lineWidth = 1.5;
      expandedCtx.stroke();

      // Icona ed etichetta città
      expandedCtx.fillStyle = '#ffffff';
      expandedCtx.beginPath();
      expandedCtx.arc(sx, sy, 3, 0, Math.PI * 2);
      expandedCtx.fill();

      // Fabbro nel villaggio
      if (s.blacksmith) {
        expandedCtx.font = '9px sans-serif';
        expandedCtx.textAlign = 'center';
        expandedCtx.fillText('🔨', sx + 9, sy - 2);
      }

      expandedCtx.font = 'bold 9px sans-serif';
      expandedCtx.fillStyle = s.color || '#38bdf8';
      expandedCtx.textAlign = 'center';
      expandedCtx.fillText(s.name, sx, sy - sr - 3);
      expandedCtx.font = '8px sans-serif';
      expandedCtx.fillStyle = '#94a3b8';
      expandedCtx.fillText('🛡️ Safe Zone', sx, sy + sr + 9);
      expandedCtx.textAlign = 'left';
    }

    // Punti d'Interesse Speciali: Boss e Misteri delle Cascate
    for (const poi of POINTS_OF_INTEREST) {
      const px = cx + poi.tx * world.TS * scale;
      const py = cy + poi.ty * world.TS * scale;

      expandedCtx.save();
      // Cerchio di rispetto POI
      expandedCtx.fillStyle = poi.type === 'boss' ? 'rgba(239, 68, 68, 0.22)' : 'rgba(6, 182, 212, 0.22)';
      expandedCtx.beginPath();
      expandedCtx.arc(px, py, 11, 0, Math.PI * 2);
      expandedCtx.fill();

      expandedCtx.strokeStyle = poi.color || '#fde047';
      expandedCtx.lineWidth = 1.4;
      expandedCtx.stroke();

      // Icona (👑 o 🔮)
      expandedCtx.font = '11px sans-serif';
      expandedCtx.textAlign = 'center';
      expandedCtx.fillText(poi.icon, px, py + 4);

      // Cartiglio con nome
      expandedCtx.font = 'bold 8px sans-serif';
      expandedCtx.fillStyle = poi.color || '#fde047';
      expandedCtx.fillText(poi.name, px, py + 16);
      expandedCtx.restore();
    }

    // Nemici come punti rossi
    expandedCtx.fillStyle = '#ef4444';
    for (const en of combat.enemies) {
      const ex = cx + en.x * scale;
      const ey = cy + en.y * scale;
      if (ex >= 0 && ex < w && ey >= 0 && ey < h) {
        expandedCtx.beginPath();
        expandedCtx.arc(ex, ey, 2, 0, Math.PI * 2);
        expandedCtx.fill();
      }
    }

    // Giocatore con radar pulsante
    const px = cx + player.x * scale;
    const py = cy + player.y * scale;

    expandedCtx.strokeStyle = '#38bdf8';
    expandedCtx.lineWidth = 2;
    expandedCtx.beginPath();
    expandedCtx.arc(px, py, 8, 0, Math.PI * 2);
    expandedCtx.stroke();

    expandedCtx.fillStyle = 'rgba(56, 189, 248, 0.35)';
    expandedCtx.beginPath();
    expandedCtx.arc(px, py, 12, 0, Math.PI * 2);
    expandedCtx.fill();

    expandedCtx.fillStyle = '#ffffff';
    expandedCtx.beginPath();
    expandedCtx.arc(px, py, 3, 0, Math.PI * 2);
    expandedCtx.fill();

    // Bordo cornice
    expandedCtx.strokeStyle = '#38bdf8';
    expandedCtx.lineWidth = 2;
    expandedCtx.strokeRect(0, 0, w, h);

    if (mapCoordsText) {
      mapCoordsText.textContent = `X: ${Math.round(player.x)}, Y: ${Math.round(player.y)}`;
    }
    const curB = getBiomeInfo(player.x, player.y);
    if (mapCurrentBiomeText) {
      mapCurrentBiomeText.textContent = curB.name;
      mapCurrentBiomeText.style.color = curB.color;
    }
  }

  function openTacticalMap() {
    if (gameState !== 'PLAYING') return;
    closeIngameInventory();
    closeGameMenu();
    closeBlacksmithModal();
    isMapOpen = true;
    expandedMapModal?.classList.remove('hidden');
    renderTacticalMap();
  }

  function closeTacticalMap() {
    isMapOpen = false;
    expandedMapModal?.classList.add('hidden');
  }

  function toggleTacticalMap() {
    if (isMapOpen) closeTacticalMap();
    else openTacticalMap();
  }

  if (hudBtnMap) hudBtnMap.addEventListener('click', () => toggleTacticalMap());
  if (minimapWidget) minimapWidget.addEventListener('click', () => openTacticalMap());
  if (btnExpandMinimap) btnExpandMinimap.addEventListener('click', (e) => {
    e.stopPropagation();
    openTacticalMap();
  });
  if (btnCloseMap) btnCloseMap.addEventListener('click', () => closeTacticalMap());
  if (btnResumeFromMap) btnResumeFromMap.addEventListener('click', () => closeTacticalMap());

  // =========================================================================
  // 8. GESTIONE MENU DI GIOCO IN-GAME (Impostazioni / Shop / Amici / Esci)
  // =========================================================================
  function switchGameMenuTab(tabName) {
    [menuTabBtnSettings, menuTabBtnShop, menuTabBtnFriends, menuTabBtnStats].forEach(b => b?.classList.remove('active'));
    [menuTabSettings, menuTabShop, menuTabFriends, menuTabStats].forEach(p => p?.classList.remove('active'));

    if (tabName === 'settings') {
      menuTabBtnSettings?.classList.add('active');
      menuTabSettings?.classList.add('active');
    } else if (tabName === 'shop') {
      menuTabBtnShop?.classList.add('active');
      menuTabShop?.classList.add('active');
    } else if (tabName === 'friends') {
      menuTabBtnFriends?.classList.add('active');
      menuTabFriends?.classList.add('active');
    } else {
      menuTabBtnStats?.classList.add('active');
      menuTabStats?.classList.add('active');
      updateRunStatsInMenu();
    }
  }

  function updateRunStatsInMenu() {
    if (menuStatTime) menuStatTime.textContent = formatTime(runSurvivalSeconds);
    if (menuStatLvl) menuStatLvl.textContent = `${progression.level}`;
    if (menuStatKills) menuStatKills.textContent = `${combat.kills}`;
    if (menuStatGold) menuStatGold.textContent = `+${combat.goldEarned} 🪙`;
  }

  function openGameMenu(tab = 'settings') {
    if (gameState !== 'PLAYING') return;
    closeIngameInventory();
    closeTacticalMap();
    closeBlacksmithModal();
    isMenuOpen = true;
    gameMenuModal?.classList.remove('hidden');
    switchGameMenuTab(tab);
    updateRunStatsInMenu();
  }

  function closeGameMenu() {
    isMenuOpen = false;
    gameMenuModal?.classList.add('hidden');
  }

  function toggleGameMenu() {
    if (isMenuOpen) closeGameMenu();
    else openGameMenu('settings');
  }

  if (hudBtnMenu) hudBtnMenu.addEventListener('click', () => toggleGameMenu());
  if (btnCloseGameMenu) btnCloseGameMenu.addEventListener('click', () => closeGameMenu());
  if (btnMenuResume) btnMenuResume.addEventListener('click', () => closeGameMenu());

  if (menuTabBtnSettings) menuTabBtnSettings.addEventListener('click', () => switchGameMenuTab('settings'));
  if (menuTabBtnShop) menuTabBtnShop.addEventListener('click', () => switchGameMenuTab('shop'));
  if (menuTabBtnFriends) menuTabBtnFriends.addEventListener('click', () => switchGameMenuTab('friends'));
  if (menuTabBtnStats) menuTabBtnStats.addEventListener('click', () => switchGameMenuTab('stats'));

  // Toggle Settings
  if (settingDmgNumbers) {
    settingDmgNumbers.addEventListener('change', (e) => {
      FX.showDamageNumbers = e.target.checked;
    });
  }

  if (settingFxSparks) {
    settingFxSparks.addEventListener('change', (e) => {
      FX.showSparks = e.target.checked;
    });
  }

  if (btnToggleFullscreen) {
    btnToggleFullscreen.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        btnToggleFullscreen.textContent = '🖥️ Esci da Fullscreen';
      } else {
        document.exitFullscreen().catch(() => {});
        btnToggleFullscreen.textContent = '🖥️ Attiva Fullscreen';
      }
    });
  }

  if (btnCopyFriendCode) {
    btnCopyFriendCode.addEventListener('click', () => {
      if (myFriendIdDisplay) {
        navigator.clipboard.writeText(myFriendIdDisplay.textContent).then(() => {
          btnCopyFriendCode.textContent = '✓ Copiato!';
          setTimeout(() => { btnCopyFriendCode.textContent = 'Copia'; }, 2000);
        }).catch(() => {});
      }
    });
  }

  // Esci dalla sessione e salva i progressi al server
  if (btnMenuQuit) {
    btnMenuQuit.addEventListener('click', async () => {
      if (confirm('Vuoi terminare la spedizione ora? I progressi, l\'oro e i materiali raccolti verranno salvati.')) {
        closeGameMenu();
        await handleGameOver();
      }
    });
  }

  // =========================================================================
  // 9. AVVIO DELLA SPEDIZIONE
  // =========================================================================
  function startExpedition() {
    gameState = 'PLAYING';
    runSurvivalSeconds = 0;

    // 1. Applica le statistiche permanenti della meta-progressione all'eroe
    player.applyPermanentStats(currentProfile.calculatedStats);
    player.x = 0;
    player.y = 50;
    camera.snapTo(player.x, player.y);

    // Configura l'arma equipaggiata e le statistiche forgiate
    const eqWeapon = currentProfile.equippedWeapon || 'staff';
    const eqLevel = (currentProfile.weapons && currentProfile.weapons[eqWeapon]) || 1;
    player.weapon = eqWeapon;
    combat.setWeapon(eqWeapon, eqLevel, player.permanentBonusDamage || 0);

    // 2. Reset combattimento e progressione di run
    combat.kills = 0;
    combat.goldEarned = 0;
    combat.collectedItems = {};
    combat.itemPickups = [];
    combat.projectiles = [];
    combat.slashes = [];
    combat.pickups = [];
    combat.enemies = [];
    combat.hasOrbitOrb = false;
    combat.damageMultiplier = 1.0;

    progression.level = 1;
    progression.currentXp = 0;
    progression.nextLevelXp = 25;
    progression.isPausedForLevelUp = false;

    // Aggiorna indicatore arma nel HUD
    if (elWeaponIcon) elWeaponIcon.textContent = combat.weaponId === 'sword' ? '🗡️' : (combat.weaponId === 'bow' ? '🏹' : '🪄');
    if (elWeaponName) elWeaponName.textContent = combat.weaponName;

    // 3. Inizializza Forzieri, Boss e Mistero delle Cascate dai Punti d'Interesse
    chests = [];
    mysteryPillars = [];

    POINTS_OF_INTEREST.forEach(poi => {
      if (poi.type === 'boss') {
        // Spawna il Boss leggendario nella sua arena
        const bossEnemy = new Enemy(poi.tx * world.TS, poi.ty * world.TS, poi.bossKind);
        combat.enemies.push(bossEnemy);

        // Posiziona il Forziere Sacro bloccato a lato del Boss
        const chest = new Chest((poi.tx + 1.8) * world.TS, poi.ty * world.TS, poi);
        chests.push(chest);
      } else if (poi.type === 'mystery') {
        // Forziere Sommerso delle Cascate
        const wfChest = new Chest(poi.tx * world.TS, poi.ty * world.TS, poi);
        chests.push(wfChest);

        // 3 Monoliti Runici da attivare nella grotta delle cascate
        mysteryPillars = [
          new MysteryPillar((poi.tx - 2.2) * world.TS, (poi.ty - 1.2) * world.TS, 1, 'Runa del Flusso'),
          new MysteryPillar((poi.tx + 2.2) * world.TS, (poi.ty - 1.2) * world.TS, 2, 'Runa della Marea'),
          new MysteryPillar(poi.tx * world.TS, (poi.ty + 2.2) * world.TS, 3, 'Runa degli Abissi')
        ];
      }
    });

    // Callback sconfitta Boss: sblocco glorioso e infallibile del forziere leggendario!
    combat.onBossKilled = (boss) => {
      const matchChest = chests.find(c => {
        if (!c.poi) return false;
        if (c.poi.bossKind === boss.kind) return true;
        const shortKind = boss.kind.replace('boss_', '');
        return c.poi.id.includes(shortKind) || (c.id && c.id.includes(shortKind));
      });

      if (matchChest) {
        matchChest.unlock();
        camera.kick(0.48);
        showWeaponNotification(`👑 ${boss.name} Sconfitto! ${matchChest.name} SBLOCCATO!`);
      }
    };

    // 4. Popola i mostri nei rispettivi biomi della vasta mappa
    combat.enemies.push(new Enemy(140, -170, 'slime_forest'));
    combat.enemies.push(new Enemy(180, -190, 'slime_forest'));
    combat.enemies.push(new Enemy(-160, -170, 'slime_ice'));
    combat.enemies.push(new Enemy(-180, 150, 'slime_sand'));
    combat.enemies.push(new Enemy(170, 160, 'skeleton'));

    // Bosco Silvano
    for (let i = 0; i < 14; i++) {
      const pt = world.findValidSpawn(350, 2600, 'forest');
      combat.enemies.push(new Enemy(pt.x, pt.y, 'slime_forest'));
    }
    // Vette Innevate
    for (let i = 0; i < 14; i++) {
      const pt = world.findValidSpawn(350, 2600, 'snow');
      combat.enemies.push(new Enemy(pt.x, pt.y, 'slime_ice'));
    }
    // Deserto delle Dune
    for (let i = 0; i < 14; i++) {
      const pt = world.findValidSpawn(350, 2600, 'desert');
      combat.enemies.push(new Enemy(pt.x, pt.y, 'slime_sand'));
    }
    // Caldera Vulcanica
    for (let i = 0; i < 14; i++) {
      const pt = world.findValidSpawn(350, 2600, 'volcano');
      combat.enemies.push(new Enemy(pt.x, pt.y, 'slime_magma'));
    }
    // Fiume e Cascate (Slime d'Acqua)
    for (let i = 0; i < 12; i++) {
      const pt = world.findValidSpawn(350, 2600, 'river');
      combat.enemies.push(new Enemy(pt.x, pt.y, 'slime_water'));
    }
    // Scheletri guardiani erranti ai confini e rovine
    for (let i = 0; i < 20; i++) {
      const pt = world.findValidSpawn(400, 2800);
      combat.enemies.push(new Enemy(pt.x, pt.y, 'skeleton'));
    }

    // 5. Cambia schermata
    closeIngameInventory();
    closeTacticalMap();
    closeGameMenu();
    closeBlacksmithModal();
    menuScreen?.classList.add('hidden');
    gameHud?.classList.remove('hidden');
    modalGameOver?.classList.add('hidden');

    showWeaponNotification("⚔️ Clicca col MOUSE per attaccare! [E]: Interagisci · [1/2/3]: Armi · [I]: Zaino");
  }

  // Interazione diretta cliccando col MOUSE su Forzieri, Fabbri o Rune nel mondo
  function handleWorldClickInteraction(aimWorld) {
    if (!aimWorld || gameState !== 'PLAYING') return false;

    // 1. Click su Forziere
    for (const ch of chests) {
      if (ch.hitTest(aimWorld.x, aimWorld.y) || Math.hypot(aimWorld.x - ch.x, aimWorld.y - ch.y) <= 42) {
        if (Math.hypot(player.x - ch.x, player.y - ch.y) <= 90) {
          // Verifica fail-safe: se il forziere è marcato locked ma il boss è già morto, sbloccalo subito!
          if (ch.isLocked && ch.poi && ch.poi.bossKind) {
            const bossAlive = combat.enemies.some(e => e.kind === ch.poi.bossKind && !e.dead && !e.isDying);
            if (!bossAlive) {
              ch.unlock();
            }
          }

          if (ch.isLocked) {
            showWeaponNotification(`🔒 ${ch.name} è sigillato! Sconfiggi il Boss custode!`);
          } else if (!ch.isOpen) {
            const opened = ch.open(combat, player);
            if (opened) {
              camera.kick(0.35);
              showWeaponNotification(`✨ Hai aperto ${ch.name}! Oro, XP e artefatti riscattati!`);
              renderIngameLoot();
              renderIngameForge();
            }
          }
          return true; // Click assorbito per l'interazione
        }
      }
    }

    // 2. Click su Fabbro del Villaggio
    const nearbyBs = world.getNearbyBlacksmith(player.x, player.y, 90);
    if (nearbyBs) {
      const bsWorldX = nearbyBs.tx * world.TS;
      const bsWorldY = nearbyBs.ty * world.TS;
      if (Math.hypot(aimWorld.x - bsWorldX, aimWorld.y - bsWorldY) <= 42) {
        openBlacksmithModal(nearbyBs);
        return true;
      }
    }

    // 3. Click su Runa della Cascata
    for (const p of mysteryPillars) {
      if (Math.hypot(aimWorld.x - p.x, aimWorld.y - p.y) <= 38) {
        if (Math.hypot(player.x - p.x, player.y - p.y) <= 85 && !p.activated) {
          p.activate();
          camera.kick(0.2);
          const activeCount = mysteryPillars.filter(pil => pil.activated).length;
          if (activeCount === mysteryPillars.length) {
            const wfChest = chests.find(c => c.id === 'chest_waterfall');
            if (wfChest && wfChest.isLocked) {
              wfChest.unlock();
              camera.kick(0.48);
              showWeaponNotification('🌊 Il Sigillo delle Tre Rune è infranto! Forziere Sommerso SBLOCCATO!');
            }
          } else {
            showWeaponNotification(`🔮 Runa attivata (${activeCount}/${mysteryPillars.length})! Trova le altre rune della cascata!`);
          }
          return true;
        }
      }
    }

    return false;
  }

  // Gestione dell'interazione con Fabbro, Forzieri e Rune con [E] o click sul prompt
  function handleInteraction() {
    if (!currentNearbyInteractable || gameState !== 'PLAYING') return;

    if (currentNearbyInteractable.type === 'blacksmith') {
      openBlacksmithModal(currentNearbyInteractable.data);
    } else if (currentNearbyInteractable.type === 'chest') {
      const ch = currentNearbyInteractable.data;

      // Fail-safe: se il forziere è marcato locked ma il boss è già morto, sbloccalo subito!
      if (ch.isLocked && ch.poi && ch.poi.bossKind) {
        const bossAlive = combat.enemies.some(e => e.kind === ch.poi.bossKind && !e.dead && !e.isDying);
        if (!bossAlive) {
          ch.unlock();
        }
      }

      if (ch.isLocked) {
        showWeaponNotification(`🔒 ${ch.name} è sigillato! Sconfiggi il Boss custode!`);
      } else if (!ch.isOpen) {
        const opened = ch.open(combat, player);
        if (opened) {
          camera.kick(0.35);
          showWeaponNotification(`✨ Hai aperto ${ch.name}! Oro, XP e artefatti riscattati!`);
          renderIngameLoot();
          renderIngameForge();
        }
      }
    } else if (currentNearbyInteractable.type === 'mystery_pillar') {
      const p = currentNearbyInteractable.data;
      if (!p.activated) {
        p.activate();
        camera.kick(0.2);
        const activeCount = mysteryPillars.filter(pil => pil.activated).length;
        if (activeCount === mysteryPillars.length) {
          const wfChest = chests.find(c => c.id === 'chest_waterfall');
          if (wfChest && wfChest.isLocked) {
            wfChest.unlock();
            camera.kick(0.48);
            showWeaponNotification('🌊 Il Sigillo delle Tre Rune è infranto! Forziere Sommerso SBLOCCATO!');
          }
        } else {
          showWeaponNotification(`🔮 Runa attivata (${activeCount}/${mysteryPillars.length})! Trova le altre rune della cascata!`);
        }
      }
    }
  }

  hudInteractPrompt?.addEventListener('click', handleInteraction);
  btnStartRun?.addEventListener('click', startExpedition);

  // =========================================================================
  // 10. GESTIONE FINE PARTITA & REGISTRAZIONE STATISTICHE
  // =========================================================================
  async function handleGameOver() {
    if (gameState === 'GAMEOVER') return;
    gameState = 'GAMEOVER';

    const totalItems = Object.values(combat.collectedItems || {}).reduce((a, b) => a + b, 0);

    const runStats = {
      level: progression.level,
      kills: combat.kills,
      survivalSeconds: Math.floor(runSurvivalSeconds),
      goldEarned: combat.goldEarned,
      collectedItems: combat.collectedItems
    };

    const res = await API.submitRun(runStats);

    // Mostra il modale di riepilogo
    if (elSumTime) elSumTime.textContent = formatTime(runStats.survivalSeconds);
    if (elSumLevel) elSumLevel.textContent = `${runStats.level}`;
    if (elSumKills) elSumKills.textContent = `${runStats.kills}`;
    if (elSumGold) elSumGold.textContent = `+${res.finalGold} 🪙`;
    if (elSumItems) elSumItems.textContent = `+${totalItems} 🎒`;
    if (elSumScore) elSumScore.textContent = `${res.score}`;

    gameHud?.classList.add('hidden');
    modalGameOver?.classList.remove('hidden');
  }

  player.onDeath = () => handleGameOver();

  btnReturnSanctuary?.addEventListener('click', async () => {
    modalGameOver?.classList.add('hidden');
    menuScreen?.classList.remove('hidden');
    gameState = 'MENU';
    await refreshProfile();
  });

  // =========================================================================
  // 11. LEVEL-UP & CARTE
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
    modalLevelUp?.classList.add('hidden');
  };

  // =========================================================================
  // 12. GESTIONE INPUT TASTIERA
  // =========================================================================
  window.addEventListener('keydown', (e) => {
    if (progression.isPausedForLevelUp) {
      if (e.key === '1') progression.chooseUpgrade(0);
      else if (e.key === '2') progression.chooseUpgrade(1);
      else if (e.key === '3') progression.chooseUpgrade(2);
      return;
    }

    if (gameState === 'PLAYING') {
      // Tasto [E] per interagire con Fabbro, Forzieri e Rune
      if (e.code === 'KeyE' || e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        if (isBlacksmithOpen) {
          closeBlacksmithModal();
          return;
        }
        if (!isInventoryOpen && !isMapOpen && !isMenuOpen) {
          handleInteraction();
        }
        return;
      }

      // Tasti [I] e [B] per Zaino/Inventario
      if (e.code === 'KeyI' || e.code === 'KeyB' || e.key === 'i' || e.key === 'I' || e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        toggleIngameInventory();
        return;
      }

      // Tasto [M] per Mappa Tattica
      if (e.code === 'KeyM' || e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleTacticalMap();
        return;
      }

      // Tasto [ESC] per chiudere o aprire i menu
      if (e.key === 'Escape' || e.code === 'Escape') {
        if (isBlacksmithOpen) {
          closeBlacksmithModal();
          return;
        }
        if (isMapOpen) {
          closeTacticalMap();
          return;
        }
        if (isInventoryOpen) {
          closeIngameInventory();
          return;
        }
        if (isMenuOpen) {
          closeGameMenu();
          return;
        }
        // Se nessun menu è aperto, apri il Game Menu
        openGameMenu('settings');
        return;
      }

      // Cambio arma rapido con 1, 2, 3 (se i menu non sono aperti)
      if (!isInventoryOpen && !isMapOpen && !isMenuOpen && !isBlacksmithOpen) {
        if (e.key === '1') equipWeapon('staff');
        else if (e.key === '2') equipWeapon('sword');
        else if (e.key === '3') equipWeapon('bow');
      }
    }
  });

  // =========================================================================
  // 13. RIDIMENSIONAMENTO CANVAS
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
    initTitleParticles();
  }

  window.addEventListener('resize', handleResize);
  handleResize();

  // =========================================================================
  // 14. GAME LOOP A 60 FPS
  // =========================================================================
  let lastTime = performance.now();
  let frameCount = 0;
  let fpsTimer = 0;
  let currentFps = 60;
  let minimapTimer = 0;
  let enemyRespawnTimer = 0;

  function spawnEnemyForLocation(x, y) {
    const tx = world.tileOf(x);
    const ty = world.tileOf(y);
    const b = world.getBiome(tx, ty);
    let kind = 'slime_forest';
    if (b === 'river') kind = 'slime_water';
    else if (b === 'snow') kind = 'slime_ice';
    else if (b === 'desert') kind = 'slime_sand';
    else if (b === 'volcano') kind = 'slime_magma';
    else if (Math.random() < 0.28) kind = 'skeleton';
    return new Enemy(x, y, kind);
  }

  // Mirino Arcano Crosshair (con indicatore di mira e cooldown sul mouse)
  function drawCrosshairHUD(ctx, screenX, screenY, dpr = 1) {
    const cx = screenX * dpr;
    const cy = screenY * dpr;

    const isLockedOn = Boolean(combat.currentTarget);
    const isOverInteract = Boolean(currentNearbyInteractable);
    const color = isOverInteract ? '#fde047' : (isLockedOn ? '#ef4444' : '#38bdf8');
    const cdProgress = combat.cooldownProgress;
    const r = Math.round(13 * dpr);

    ctx.save();
    ctx.translate(cx, cy);

    // 1. Arco circolare indicatore di Cooldown dell'arma
    if (cdProgress < 1.0) {
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.7)';
      ctx.lineWidth = 3.5 * dpr;
      ctx.beginPath();
      ctx.arc(0, 0, r + 4.5 * dpr, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.4 * dpr;
      ctx.beginPath();
      ctx.arc(0, 0, r + 4.5 * dpr, -Math.PI / 2, -Math.PI / 2 + cdProgress * Math.PI * 2);
      ctx.stroke();
    }

    // 2. Cerchio del mirino
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6 * dpr;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Tacche cardinali
    const gap = 3 * dpr;
    const len = 5 * dpr;
    ctx.beginPath(); ctx.moveTo(0, -(r + gap)); ctx.lineTo(0, -(r + gap + len)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, (r + gap)); ctx.lineTo(0, (r + gap + len)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-(r + gap), 0); ctx.lineTo(-(r + gap + len), 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo((r + gap), 0); ctx.lineTo((r + gap + len), 0); ctx.stroke();

    // 4. Puntino centrale o diamante se bersaglio agganciato
    ctx.fillStyle = color;
    if (isLockedOn) {
      const dSize = 3 * dpr;
      ctx.beginPath();
      ctx.moveTo(0, -dSize);
      ctx.lineTo(dSize, 0);
      ctx.lineTo(0, dSize);
      ctx.lineTo(-dSize, 0);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, 2 * dpr, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

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

      // Se siamo nella schermata iniziale, aggiorna lo sfondo animato
      if (gameState === 'MENU') {
        updateAndDrawTitleBackground(dt, currentTime / 1000);
      }

      // 1. UPDATE (Mondo in pausa se Zaino, Mappa, Menu, Fabbro o LevelUp sono aperti)
      const isPaused = isInventoryOpen || isMapOpen || isMenuOpen || isBlacksmithOpen || progression.isPausedForLevelUp;
      if (gameState === 'PLAYING') {
        if (!isPaused) {
          runSurvivalSeconds += dt;
          player.update(dt, Input, world);

          // Calcolo mira con il mouse nel mondo e trigger attacco manuale
          const aimWorld = camera.screenToWorld(mouseScreen.x, mouseScreen.y, canvas);
          const isAttacking = (isMouseDown || Input.isDown('space'));
          combat.update(dt, player, world, camera, isAttacking, aimWorld);

          camera.follow(player.x, player.y, dt);

          // Rilevamento interazioni vicine (Fabbro, Forzieri, Monoliti delle Cascate)
          let foundInteractable = null;

          // 1. Fabbro del villaggio più vicino (entro 85px)
          const nearbyBs = world.getNearbyBlacksmith(player.x, player.y, 85);
          if (nearbyBs) {
            foundInteractable = {
              type: 'blacksmith',
              data: nearbyBs,
              label: `Parla con ${nearbyBs.name} (Fabbro)`
            };
          }

          // 2. Forzieri del Tesoro Ancestrali (entro 85px)
          if (!foundInteractable) {
            for (const ch of chests) {
              const dist = Math.hypot(player.x - ch.x, player.y - ch.y);
              if (dist <= 85 && !ch.isOpen) {
                // Controllo fail-safe continuo: se il forziere è sigillato ma il boss dell'arena è già morto, sbloccalo subito!
                if (ch.isLocked && ch.poi && ch.poi.bossKind) {
                  const bossStillAlive = combat.enemies.some(e => e.kind === ch.poi.bossKind && !e.dead && !e.isDying);
                  if (!bossStillAlive) {
                    ch.unlock();
                  }
                }

                foundInteractable = {
                  type: 'chest',
                  data: ch,
                  label: ch.isLocked ? `🔒 ${ch.name} (Sigillato)` : `Apri ${ch.name}`
                };
                break;
              }
            }
          }

          // 3. Monoliti Runici della Cascata (entro 80px)
          if (!foundInteractable) {
            for (const p of mysteryPillars) {
              const dist = Math.hypot(player.x - p.x, player.y - p.y);
              if (dist <= 80 && !p.activated) {
                foundInteractable = {
                  type: 'mystery_pillar',
                  data: p,
                  label: `Attiva ${p.name}`
                };
                break;
              }
            }
          }

          currentNearbyInteractable = foundInteractable;
          if (hudInteractPrompt && hudInteractLabel) {
            if (foundInteractable && !isInventoryOpen && !isMapOpen && !isMenuOpen && !isBlacksmithOpen) {
              hudInteractPrompt.classList.remove('hidden');
              hudInteractLabel.textContent = foundInteractable.label;
            } else {
              hudInteractPrompt.classList.add('hidden');
            }
          }

          // Aggiorna forzieri e rune
          chests.forEach(ch => ch.update(dt, player));
          mysteryPillars.forEach(p => p.update(dt));

          // Generazione periodica dinamica di mostri attorno all'eroe (MAI in Safe Zone)
          enemyRespawnTimer += dt;
          if (enemyRespawnTimer >= 3.0 && combat.enemies.length < 75) {
            enemyRespawnTimer = 0;
            const pt = world.findValidSpawn(460, 950, null, player.x, player.y);
            if (!world.isSafeZone(pt.x, pt.y)) {
              combat.enemies.push(spawnEnemyForLocation(pt.x, pt.y));
            }
          }
        }
      }

      // 2. RENDER PIPELINE DEL MONDO
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;

      ctx.save();
      camera.apply(ctx);

      // Terreno
      world.drawGround(ctx, camera);

      // Gemme e artefatti a terra
      combat.drawPickups(ctx);

      // Elementi verticali Y-Sort (Giocatore, Forzieri, Rune, Boss e Mostri)
      world.drawEntitiesAndProps(ctx, camera, [
        player,
        ...chests,
        ...mysteryPillars,
        ...combat.getAllTargets()
      ]);

      // Sfere orbitanti
      combat.drawOrbitOrbs(ctx, player);

      // Dardi, frecce e fendenti
      combat.drawProjectiles(ctx);
      combat.drawFX(ctx);

      ctx.restore();

      // Vignettatura d'atmosfera
      world.drawVignette(ctx, canvas.width, canvas.height);

      // Mirino Arcano Crosshair con indicatore di Cooldown e puntamento manuale
      if (gameState === 'PLAYING' && !isPaused) {
        drawCrosshairHUD(ctx, mouseScreen.x, mouseScreen.y, camera.dpr);
      }

      ctx.restore();

      // 3. MINIMAPPA LIVE E HUD
      if (gameState === 'PLAYING') {
        minimapTimer += dt;
        if (minimapTimer >= 0.08) { // Aggiornamento minimappa a ~12 Hz
          minimapTimer = 0;
          renderMinimap();
          if (isMapOpen) {
            renderTacticalMap();
          }
        }

        if (elFps) elFps.textContent = `${currentFps}`;
        if (elTimer) elTimer.textContent = formatTime(runSurvivalSeconds);
        if (elEnemies) elEnemies.textContent = `${combat.enemies.length}`;

        if (elLevel) elLevel.textContent = `${progression.level}`;
        if (elXpFill) elXpFill.style.width = `${Math.round(progression.progressRatio * 100)}%`;
        if (elXpText) elXpText.textContent = `${progression.currentXp} / ${progression.nextLevelXp} XP`;

        const hpRatio = Math.max(0, player.hp / player.maxHp);
        if (elHpFill) elHpFill.style.width = `${Math.round(hpRatio * 100)}%`;
        if (elHpText) elHpText.textContent = `${Math.max(0, Math.round(player.hp))} / ${player.maxHp} HP`;

        if (elRunGold) elRunGold.textContent = `${combat.goldEarned}`;
        const runItemsCount = Object.values(combat.collectedItems || {}).reduce((a, b) => a + b, 0);
        if (elRunItems) elRunItems.textContent = `${runItemsCount}`;

        let currentBaseDmg = 18;
        if (combat.weaponId === 'sword') currentBaseDmg = combat.swordDamage || 28;
        else if (combat.weaponId === 'bow') currentBaseDmg = combat.bowDamage || 22;
        else currentBaseDmg = combat.staffDamage || 18;

        if (elDamage) elDamage.textContent = `${Math.round(currentBaseDmg * combat.damageMultiplier)}`;
        if (elTarget) {
          elTarget.textContent = combat.currentTarget ? combat.currentTarget.name : 'Nessuno';
          elTarget.style.color = combat.currentTarget ? '#38bdf8' : '#94a3b8';
        }

        if (elCdFill) {
          const pct = Math.round(combat.cooldownProgress * 100);
          elCdFill.style.width = `${pct}%`;
          elCdFill.style.backgroundColor = pct >= 100 ? '#38bdf8' : '#0284c7';
        }
      }

      Input.endFrame();
    } catch (err) {
      console.error('Errore durante il ciclo di gioco:', err);
    }

    requestAnimationFrame(loop);
  }

  // Inizializza sessione utente all'avvio
  const session = await API.restoreSession();
  if (session && session.user) {
    await refreshProfile(session.user.username);
  } else {
    await refreshProfile();
    openAuthModal('login');
  }

  requestAnimationFrame(loop);
});
