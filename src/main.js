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
import { World } from './world/world.js';
import { Player } from './entities/player.js';
import { Enemy } from './entities/enemy.js';
import { CombatSystem } from './systems/combat.js';
import { ProgressionSystem } from './systems/progression.js';
import { API } from './core/api.js';
import { MATERIALS_DEF, WEAPONS_DEF } from './core/crafting.js';
import { FX } from './core/fx.js';

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

  // Stato Globale
  let gameState = 'MENU'; // 'MENU' | 'PLAYING' | 'GAMEOVER'
  let currentProfile = null;
  let runSurvivalSeconds = 0;
  let isInventoryOpen = false;
  let isMapOpen = false;
  let isMenuOpen = false;
  let notificationTimeout = null;

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
    const tx = world.tileOf(worldX);
    const ty = world.tileOf(worldY);
    const biomeKey = world.getBiome(tx, ty);
    switch (biomeKey) {
      case 'village': return { key: 'village', name: '🏰 Villaggio', color: '#64748b' };
      case 'snow': return { key: 'snow', name: '❄️ Vette Innevate', color: '#7dd3fc' };
      case 'desert': return { key: 'desert', name: '🏜️ Deserto', color: '#f59e0b' };
      case 'volcano': return { key: 'volcano', name: '🌋 Vulcano', color: '#ef4444' };
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

  function renderIngameForge() {
    if (!ingameForgeContainer || !currentProfile) return;
    ingameForgeContainer.innerHTML = '';

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
            <div class="weapon-type-tag">Grado Forgiatura: Livello ${w.currentLevel} / ${w.maxLevel}</div>
          </div>
        </div>
        <div style="margin: 8px 0;">${reqHtml}</div>
        <button class="btn-forge" ${!canAfford ? 'disabled' : ''} style="width: 100%;">
          🔨 ${w.isUnlocked ? `Potenzia a Livello ${w.currentLevel + 1}` : 'Forgia dal Fabbro'}
        </button>
      `;

      const btnForge = card.querySelector('.btn-forge');
      if (btnForge && canAfford) {
        btnForge.addEventListener('click', async () => {
          try {
            currentProfile = await API.craftOrUpgradeWeapon(w.id);
            renderIngameForge();
            renderIngameWeapons();
            equipWeapon(combat.weaponId);
          } catch (err) {
            alert(err.message);
          }
        });
      }

      ingameForgeContainer.appendChild(card);
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

    const mapExtent = (world.MAP_RADIUS * world.TS) * 2; // 3200 px
    const scale = w / mapExtent;

    minimapCtx.clearRect(0, 0, w, h);

    // Sfondo base
    minimapCtx.fillStyle = '#080c14';
    minimapCtx.fillRect(0, 0, w, h);

    const vSize = 512 * scale;
    const vLeft = cx - vSize / 2;
    const vTop = cy - vSize / 2;

    // 1. Neve (Nord)
    minimapCtx.fillStyle = 'rgba(125, 211, 252, 0.45)';
    minimapCtx.fillRect(0, 0, w, cy - vSize / 2);

    // 2. Deserto (Sud Ovest)
    minimapCtx.fillStyle = 'rgba(217, 119, 6, 0.45)';
    minimapCtx.fillRect(0, cy + vSize / 2, cx, h - (cy + vSize / 2));

    // 3. Vulcano (Est / Sud Est)
    minimapCtx.fillStyle = 'rgba(185, 28, 28, 0.45)';
    minimapCtx.fillRect(cx, cy - vSize / 2, cx, h - (cy - vSize / 2));

    // 4. Bosco (Ovest)
    minimapCtx.fillStyle = 'rgba(22, 101, 52, 0.55)';
    minimapCtx.fillRect(0, cy - vSize / 2, cx - vSize / 2, vSize);

    // 5. Villaggio (Centro)
    minimapCtx.fillStyle = '#475569';
    minimapCtx.fillRect(vLeft, vTop, vSize, vSize);
    minimapCtx.strokeStyle = '#94a3b8';
    minimapCtx.lineWidth = 1;
    minimapCtx.strokeRect(vLeft, vTop, vSize, vSize);

    // Nemici come puntini rossi
    minimapCtx.fillStyle = '#f87171';
    for (const en of combat.enemies) {
      const mx = cx + en.x * scale;
      const my = cy + en.y * scale;
      if (mx >= 0 && mx < w && my >= 0 && my < h) {
        minimapCtx.fillRect(mx - 1, my - 1, 2, 2);
      }
    }

    // Giocatore come punto ciano pulsante
    const px = cx + player.x * scale;
    const py = cy + player.y * scale;

    minimapCtx.fillStyle = 'rgba(56, 189, 248, 0.35)';
    minimapCtx.beginPath();
    minimapCtx.arc(px, py, 4, 0, Math.PI * 2);
    minimapCtx.fill();

    minimapCtx.fillStyle = '#38bdf8';
    minimapCtx.beginPath();
    minimapCtx.arc(px, py, 2, 0, Math.PI * 2);
    minimapCtx.fill();

    // Bordo radar
    minimapCtx.strokeStyle = '#0284c7';
    minimapCtx.lineWidth = 1.5;
    minimapCtx.strokeRect(0, 0, w, h);

    // Etichetta del bioma corrente
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
    const mapExtent = (world.MAP_RADIUS * world.TS) * 2;
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

    const vSize = 512 * scale;
    const vLeft = cx - vSize / 2;
    const vTop = cy - vSize / 2;

    // 1. Neve (Nord)
    expandedCtx.fillStyle = 'rgba(125, 211, 252, 0.3)';
    expandedCtx.fillRect(0, 0, w, cy - vSize / 2);
    expandedCtx.fillStyle = '#7dd3fc';
    expandedCtx.font = 'bold 11px sans-serif';
    expandedCtx.fillText('❄️ VETTE INNEVATE', 20, 30);

    // 2. Bosco Silvano (Ovest)
    expandedCtx.fillStyle = 'rgba(22, 101, 52, 0.4)';
    expandedCtx.fillRect(0, cy - vSize / 2, cx - vSize / 2, vSize);
    expandedCtx.fillStyle = '#4ade80';
    expandedCtx.fillText('🌲 BOSCO SILVANO', 15, cy);

    // 3. Deserto delle Dune (Sud Ovest)
    expandedCtx.fillStyle = 'rgba(217, 119, 6, 0.35)';
    expandedCtx.fillRect(0, cy + vSize / 2, cx, h - (cy + vSize / 2));
    expandedCtx.fillStyle = '#fde047';
    expandedCtx.fillText('🏜️ DESERTO DELLE DUNE', 20, h - 25);

    // 4. Caldera Vulcanica (Est / Sud Est)
    expandedCtx.fillStyle = 'rgba(185, 28, 28, 0.35)';
    expandedCtx.fillRect(cx, cy - vSize / 2, cx, h - (cy - vSize / 2));
    expandedCtx.fillStyle = '#f87171';
    expandedCtx.fillText('🌋 CALDERA VULCANICA', cx + 30, cy + 40);

    // 5. Villaggio Centrale
    expandedCtx.fillStyle = '#334155';
    expandedCtx.fillRect(vLeft, vTop, vSize, vSize);
    expandedCtx.strokeStyle = '#94a3b8';
    expandedCtx.lineWidth = 1.5;
    expandedCtx.strokeRect(vLeft, vTop, vSize, vSize);
    expandedCtx.fillStyle = '#f8fafc';
    expandedCtx.font = 'bold 10px sans-serif';
    expandedCtx.textAlign = 'center';
    expandedCtx.fillText('🏰 VILLAGGIO', cx, cy - 8);
    expandedCtx.font = '9px sans-serif';
    expandedCtx.fillStyle = '#38bdf8';
    expandedCtx.fillText('Zona Protetta', cx, cy + 6);
    expandedCtx.textAlign = 'left';

    // Edifici del villaggio
    const bScale = world.TS * scale;
    expandedCtx.fillStyle = '#64748b';
    expandedCtx.fillRect(cx + (-7 * bScale), cy + (-6 * bScale), 4 * bScale, 3 * bScale);
    expandedCtx.fillRect(cx + (3 * bScale), cy + (-6 * bScale), 4 * bScale, 3 * bScale);
    expandedCtx.fillRect(cx + (-7 * bScale), cy + (3 * bScale), 4 * bScale, 3 * bScale);
    expandedCtx.fillRect(cx + (3 * bScale), cy + (3 * bScale), 4 * bScale, 3 * bScale);

    // Nemici
    expandedCtx.fillStyle = '#ef4444';
    for (const en of combat.enemies) {
      const ex = cx + en.x * scale;
      const ey = cy + en.y * scale;
      if (ex >= 0 && ex < w && ey >= 0 && ey < h) {
        expandedCtx.beginPath();
        expandedCtx.arc(ex, ey, 2.5, 0, Math.PI * 2);
        expandedCtx.fill();
      }
    }

    // Giocatore con radar pulsante
    const px = cx + player.x * scale;
    const py = cy + player.y * scale;

    expandedCtx.strokeStyle = '#38bdf8';
    expandedCtx.lineWidth = 2;
    expandedCtx.beginPath();
    expandedCtx.arc(px, py, 9, 0, Math.PI * 2);
    expandedCtx.stroke();

    expandedCtx.fillStyle = 'rgba(56, 189, 248, 0.4)';
    expandedCtx.beginPath();
    expandedCtx.arc(px, py, 14, 0, Math.PI * 2);
    expandedCtx.fill();

    expandedCtx.fillStyle = '#ffffff';
    expandedCtx.beginPath();
    expandedCtx.arc(px, py, 3.5, 0, Math.PI * 2);
    expandedCtx.fill();

    // Bordo
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

    // 3. Popola i mostri nei rispettivi biomi della mappa
    combat.enemies.push(new Enemy(140, -170, 'slime_forest'));
    combat.enemies.push(new Enemy(180, -190, 'slime_forest'));
    combat.enemies.push(new Enemy(-160, -170, 'slime_ice'));
    combat.enemies.push(new Enemy(-180, 150, 'slime_sand'));
    combat.enemies.push(new Enemy(170, 160, 'skeleton'));

    for (let i = 0; i < 10; i++) {
      const pt = world.findValidSpawn(300, 1300, 'forest');
      combat.enemies.push(new Enemy(pt.x, pt.y, 'slime_forest'));
    }
    for (let i = 0; i < 10; i++) {
      const pt = world.findValidSpawn(300, 1300, 'snow');
      combat.enemies.push(new Enemy(pt.x, pt.y, 'slime_ice'));
    }
    for (let i = 0; i < 10; i++) {
      const pt = world.findValidSpawn(300, 1300, 'desert');
      combat.enemies.push(new Enemy(pt.x, pt.y, 'slime_sand'));
    }
    for (let i = 0; i < 10; i++) {
      const pt = world.findValidSpawn(300, 1300, 'volcano');
      combat.enemies.push(new Enemy(pt.x, pt.y, 'slime_magma'));
    }
    for (let i = 0; i < 14; i++) {
      const pt = world.findValidSpawn(350, 1400);
      combat.enemies.push(new Enemy(pt.x, pt.y, 'skeleton'));
    }

    // 4. Cambia schermata
    closeIngameInventory();
    closeTacticalMap();
    closeGameMenu();
    menuScreen?.classList.add('hidden');
    gameHud?.classList.remove('hidden');
    modalGameOver?.classList.add('hidden');

    showWeaponNotification("Tasto [I]: Zaino/Talenti · [M]: Mappa · [ESC]: Menu · [1/2/3]: Armi");
  }

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
      if (!isInventoryOpen && !isMapOpen && !isMenuOpen) {
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

      // 1. UPDATE (Mondo in pausa se Zaino, Mappa, Menu o LevelUp sono aperti)
      const isPaused = isInventoryOpen || isMapOpen || isMenuOpen || progression.isPausedForLevelUp;
      if (gameState === 'PLAYING') {
        if (!isPaused) {
          runSurvivalSeconds += dt;
          player.update(dt, Input, world);
          combat.update(dt, player, world, camera);
          camera.follow(player.x, player.y, dt);
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

      // Elementi verticali Y-Sort
      world.drawEntitiesAndProps(ctx, camera, [player, ...combat.getAllTargets()]);

      // Sfere orbitanti
      combat.drawOrbitOrbs(ctx, player);

      // Dardi, frecce e fendenti
      combat.drawProjectiles(ctx);
      combat.drawFX(ctx);

      ctx.restore();

      // Vignettatura
      world.drawVignette(ctx, canvas.width, canvas.height);
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
