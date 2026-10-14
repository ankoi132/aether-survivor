/**
 * main.js - Entrypoint, Game Loop a 60 FPS, Meta-Progressione Backend e Ciclo di Spedizione
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

window.addEventListener('DOMContentLoaded', async () => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // Elementi UI Principali
  const menuScreen = document.getElementById('main-menu');
  const gameHud = document.getElementById('game-hud');
  const modalLevelUp = document.getElementById('levelup-modal');
  const modalGameOver = document.getElementById('gameover-modal');

  // Elementi Profilo & Menu
  const inputNick = document.getElementById('player-nickname');
  const btnSaveNick = document.getElementById('btn-save-nick');
  const elMenuGold = document.getElementById('menu-gold');
  const elStatRuns = document.getElementById('stat-runs');
  const elStatKills = document.getElementById('stat-kills');
  const elStatHighLvl = document.getElementById('stat-high-lvl');
  const elStatBestTime = document.getElementById('stat-best-time');
  const elServerStatus = document.getElementById('server-status');

  const tabBtnTalents = document.getElementById('tab-btn-talents');
  const tabBtnBlacksmith = document.getElementById('tab-btn-blacksmith');
  const tabBtnInventory = document.getElementById('tab-btn-inventory');
  const tabBtnLeaderboard = document.getElementById('tab-btn-leaderboard');

  const tabTalents = document.getElementById('tab-talents');
  const tabBlacksmith = document.getElementById('tab-blacksmith');
  const tabInventory = document.getElementById('tab-inventory');
  const tabLeaderboard = document.getElementById('tab-leaderboard');

  const talentsContainer = document.getElementById('talents-container');
  const weaponsContainer = document.getElementById('weapons-container');
  const inventoryContainer = document.getElementById('inventory-container');
  const leaderboardRows = document.getElementById('leaderboard-rows');
  const btnStartRun = document.getElementById('btn-start-run');

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

  // Elementi In-Game Inventory / Zaino & Armeria
  const btnOpenBag = document.getElementById('btn-open-bag');
  const ingameModal = document.getElementById('ingame-inventory-modal');
  const btnCloseBag = document.getElementById('btn-close-bag');
  const btnResumeGame = document.getElementById('btn-resume-game');
  const ingameTabBtnLoot = document.getElementById('ingame-tab-btn-loot');
  const ingameTabBtnWeapons = document.getElementById('ingame-tab-btn-weapons');
  const ingameTabBtnForge = document.getElementById('ingame-tab-btn-forge');
  const ingameTabLoot = document.getElementById('ingame-tab-loot');
  const ingameTabWeapons = document.getElementById('ingame-tab-weapons');
  const ingameTabForge = document.getElementById('ingame-tab-forge');
  const ingameLootContainer = document.getElementById('ingame-loot-container');
  const ingameWeaponsContainer = document.getElementById('ingame-weapons-container');
  const ingameForgeContainer = document.getElementById('ingame-forge-container');
  const weaponNotification = document.getElementById('weapon-notification');

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

  // =========================================================================
  // GESTIONE PROFILO, TALENTI & CLASSIFICA (API / BACKEND)
  // =========================================================================
  async function refreshProfile(nickname = inputNick.value) {
    currentProfile = await API.getProfile(nickname || 'Mago-' + Math.floor(1000 + Math.random() * 9000));
    inputNick.value = currentProfile.nickname;

    elMenuGold.textContent = `${currentProfile.gold}`;
    elStatRuns.textContent = `${currentProfile.totalRuns || 0}`;
    elStatKills.textContent = `${currentProfile.totalKills || 0}`;
    elStatHighLvl.textContent = `${currentProfile.highestLevel || 1}`;
    elStatBestTime.textContent = formatTime(currentProfile.bestSurvivalSeconds || 0);

    if (API.isOnline) {
      elServerStatus.textContent = 'Online (Server Sincronizzato)';
      elServerStatus.className = 'status-online';
    } else {
      elServerStatus.textContent = 'Offline (Salvataggio Locale)';
      elServerStatus.className = 'status-offline';
    }

    renderTalentsGrid();
    renderWeaponsGrid();
    renderInventoryGrid();
  }

  function renderTalentsGrid() {
    if (!currentProfile || !talentsContainer) return;
    talentsContainer.innerHTML = '';

    currentProfile.talentsCatalog.forEach(talent => {
      const card = document.createElement('div');
      card.className = 'talent-card';

      // Pips di rango [● ● ○ ○ ○]
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
            refreshProfile(currentProfile.nickname);
          } catch (err) {
            alert(err.message);
          }
        });
      }

      talentsContainer.appendChild(card);
    });
  }

  function renderWeaponsGrid() {
    if (!currentProfile || !weaponsContainer) return;
    weaponsContainer.innerHTML = '';

    currentProfile.weaponsCatalog.forEach(w => {
      const card = document.createElement('div');
      card.className = `weapon-card ${w.isEquipped ? 'equipped' : ''}`;

      let statusHtml = '';
      if (w.isEquipped) {
        statusHtml = `<div class="weapon-badge-equipped">✓ In Uso</div>`;
      }

      let reqHtml = '';
      let canAfford = false;

      if (w.isMaxLevel) {
        reqHtml = `<div class="weapon-req-box" style="color: #4ade80; text-align: center; font-weight: 700;">★ Maestria Massima (LV 5)</div>`;
      } else if (w.nextCost) {
        const goldHas = currentProfile.gold >= (w.nextCost.gold || 0);
        let matsOk = true;
        let matsRows = '';

        if (w.nextCost.materials) {
          for (const [matId, reqAmt] of Object.entries(w.nextCost.materials)) {
            const owned = (currentProfile.inventory && currentProfile.inventory[matId]) || 0;
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
            <div style="margin-top: 6px; font-size: 11px; color: #38bdf8; font-weight: 600;">✨ <b>Beneficio:</b> ${w.nextBenefit}</div>
          </div>
        `;
      }

      card.innerHTML = `
        ${statusHtml}
        <div>
          <div class="weapon-head">
            <div class="weapon-icon">${w.icon}</div>
            <div>
              <div class="weapon-title">${w.name}</div>
              <div class="weapon-type-tag">${w.typeName}</div>
            </div>
          </div>
          <div class="weapon-desc">${w.desc}</div>
        </div>

        <div>
          <div class="weapon-level-row">
            <span>Grado Forgiatura:</span>
            <span style="color: ${w.isUnlocked ? '#38bdf8' : '#94a3b8'};">
              ${w.isUnlocked ? `Livello ${w.currentLevel} / ${w.maxLevel}` : 'Bloccata'}
            </span>
          </div>

          <div style="margin: 8px 0;">
            ${reqHtml}
          </div>

          <div class="weapon-actions">
            ${!w.isMaxLevel ? `
              <button class="btn-forge" ${!canAfford ? 'disabled' : ''}>
                🔨 ${w.isUnlocked ? `Potenzia a LV ${w.currentLevel + 1}` : 'Forgia dal Fabbro'}
              </button>
            ` : ''}
            ${w.isUnlocked && !w.isEquipped ? `
              <button class="btn-equip">⚔️ Equipaggia</button>
            ` : ''}
          </div>
        </div>
      `;

      const btnForge = card.querySelector('.btn-forge');
      if (btnForge && canAfford) {
        btnForge.addEventListener('click', async () => {
          try {
            currentProfile = await API.craftOrUpgradeWeapon(w.id);
            refreshProfile(currentProfile.nickname);
          } catch (err) {
            alert(err.message);
          }
        });
      }

      const btnEquip = card.querySelector('.btn-equip');
      if (btnEquip) {
        btnEquip.addEventListener('click', async () => {
          try {
            currentProfile = await API.equipWeapon(w.id);
            refreshProfile(currentProfile.nickname);
          } catch (err) {
            alert(err.message);
          }
        });
      }

      weaponsContainer.appendChild(card);
    });
  }

  function renderInventoryGrid() {
    if (!currentProfile || !inventoryContainer) return;
    inventoryContainer.innerHTML = '';

    currentProfile.inventoryCatalog.forEach(item => {
      const card = document.createElement('div');
      card.className = 'inventory-item-card';

      const count = item.count || 0;
      card.innerHTML = `
        <div class="item-top">
          <div class="item-icon-box">${item.icon}</div>
          <div class="item-count-badge" style="opacity: ${count > 0 ? 1 : 0.4};">x${count}</div>
        </div>
        <div>
          <div class="item-name">${item.name}</div>
          <div class="item-rarity" style="color: ${item.color};">${item.rarity}</div>
        </div>
        <div class="item-desc">${item.desc}</div>
      `;

      inventoryContainer.appendChild(card);
    });
  }

  async function renderLeaderboard() {
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

  // Gestione Navigazione a 4 Schede
  function switchTab(btn, pane, callback) {
    [tabBtnTalents, tabBtnBlacksmith, tabBtnInventory, tabBtnLeaderboard].forEach(b => b?.classList.remove('active'));
    [tabTalents, tabBlacksmith, tabInventory, tabLeaderboard].forEach(p => p?.classList.remove('active'));
    btn?.classList.add('active');
    pane?.classList.add('active');
    if (callback) callback();
  }

  tabBtnTalents.addEventListener('click', () => switchTab(tabBtnTalents, tabTalents, renderTalentsGrid));
  tabBtnBlacksmith.addEventListener('click', () => switchTab(tabBtnBlacksmith, tabBlacksmith, renderWeaponsGrid));
  tabBtnInventory.addEventListener('click', () => switchTab(tabBtnInventory, tabInventory, renderInventoryGrid));
  tabBtnLeaderboard.addEventListener('click', () => switchTab(tabBtnLeaderboard, tabLeaderboard, renderLeaderboard));

  btnSaveNick.addEventListener('click', () => {
    refreshProfile(inputNick.value);
  });

  // =========================================================================
  // GESTIONE INVENTARIO & ARMERIA IN-GAME (Tasto I o pulsante Zaino)
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
    if (!ingameForgeContainer) return;
    ingameForgeContainer.innerHTML = '';

    if (!currentProfile) return;

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
    [ingameTabBtnLoot, ingameTabBtnWeapons, ingameTabBtnForge].forEach(b => b?.classList.remove('active'));
    [ingameTabLoot, ingameTabWeapons, ingameTabForge].forEach(p => p?.classList.remove('active'));

    if (tabName === 'loot') {
      ingameTabBtnLoot?.classList.add('active');
      ingameTabLoot?.classList.add('active');
      renderIngameLoot();
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
    isInventoryOpen = true;
    if (ingameModal) ingameModal.classList.remove('hidden');
    switchIngameTab(tab);
  }

  function closeIngameInventory() {
    isInventoryOpen = false;
    if (ingameModal) ingameModal.classList.add('hidden');
  }

  function toggleIngameInventory() {
    if (isInventoryOpen) closeIngameInventory();
    else openIngameInventory('loot');
  }

  if (btnOpenBag) btnOpenBag.addEventListener('click', () => toggleIngameInventory());
  if (btnCloseBag) btnCloseBag.addEventListener('click', () => closeIngameInventory());
  if (btnResumeGame) btnResumeGame.addEventListener('click', () => closeIngameInventory());

  if (ingameTabBtnLoot) ingameTabBtnLoot.addEventListener('click', () => switchIngameTab('loot'));
  if (ingameTabBtnWeapons) ingameTabBtnWeapons.addEventListener('click', () => switchIngameTab('weapons'));
  if (ingameTabBtnForge) ingameTabBtnForge.addEventListener('click', () => switchIngameTab('forge'));

  // =========================================================================
  // AVVIO DELLA SPEDIZIONE
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

    // 3. Popola i mostri randagi nei rispettivi biomi della grande mappa finita
    // Mostri ravvicinati appena fuori dal piazzale del villaggio per test immediato di combattimento e animazioni
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
    menuScreen.classList.add('hidden');
    gameHud.classList.remove('hidden');
    modalGameOver.classList.add('hidden');

    showWeaponNotification("Tasto [I]: Zaino/Inventario · Tasti [1/2/3]: Cambia Arma");
  }

  btnStartRun.addEventListener('click', startExpedition);

  // =========================================================================
  // GESTIONE FINE PARTITA & REGISTRAZIONE STATISTICHE
  // =========================================================================
  async function handleGameOver() {
    if (gameState === 'GAMEOVER') return;
    gameState = 'GAMEOVER';

    const totalItems = Object.values(combat.collectedItems || {}).reduce((a, b) => a + b, 0);

    // Invia i dati della spedizione al backend (inclusi i materiali raccolti) o salva in locale
    const runStats = {
      level: progression.level,
      kills: combat.kills,
      survivalSeconds: Math.floor(runSurvivalSeconds),
      goldEarned: combat.goldEarned,
      collectedItems: combat.collectedItems
    };

    const res = await API.submitRun(runStats);

    // Mostra il modale di riepilogo
    elSumTime.textContent = formatTime(runStats.survivalSeconds);
    elSumLevel.textContent = `${runStats.level}`;
    elSumKills.textContent = `${runStats.kills}`;
    elSumGold.textContent = `+${res.finalGold} 🪙`;
    if (elSumItems) elSumItems.textContent = `+${totalItems} 🎒`;
    elSumScore.textContent = `${res.score}`;

    gameHud.classList.add('hidden');
    modalGameOver.classList.remove('hidden');
  }

  player.onDeath = () => handleGameOver();

  btnReturnSanctuary.addEventListener('click', async () => {
    modalGameOver.classList.add('hidden');
    menuScreen.classList.remove('hidden');
    gameState = 'MENU';
    await refreshProfile();
  });

  // =========================================================================
  // LEVEL-UP & CARTE
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

  window.addEventListener('keydown', (e) => {
    if (progression.isPausedForLevelUp) {
      if (e.key === '1') progression.chooseUpgrade(0);
      else if (e.key === '2') progression.chooseUpgrade(1);
      else if (e.key === '3') progression.chooseUpgrade(2);
      return;
    }

    if (gameState === 'PLAYING') {
      // Tasti [I] e [B] per aprire/chiudere lo Zaino & Inventario
      if (e.code === 'KeyI' || e.code === 'KeyB' || e.key === 'i' || e.key === 'I' || e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        toggleIngameInventory();
        return;
      }

      // Tasto [ESC] per chiudere l'inventario se aperto
      if (e.key === 'Escape' || e.code === 'Escape') {
        if (isInventoryOpen) {
          closeIngameInventory();
          return;
        }
      }

      // Tasti rapidi 1, 2, 3 per cambiare arma all'istante
      if (e.key === '1') {
        equipWeapon('staff');
      } else if (e.key === '2') {
        equipWeapon('sword');
      } else if (e.key === '3') {
        equipWeapon('bow');
      }
    }
  });

  // =========================================================================
  // RIDIMENSIONAMENTO CANVAS
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

      // 1. UPDATE (Mondo in pausa se l'inventario o il level up è aperto)
      if (gameState === 'PLAYING') {
        if (!isInventoryOpen && !progression.isPausedForLevelUp) {
          runSurvivalSeconds += dt;
          player.update(dt, Input, world);
          combat.update(dt, player, world, camera);
          camera.follow(player.x, player.y, dt);
        }
      }

      // 2. RENDER PIPELINE
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;

      ctx.save();
      camera.apply(ctx);

      // Terreno
      world.drawGround(ctx, camera);

      // Gemme a terra
      combat.drawPickups(ctx);

      // Elementi verticali Y-Sort
      world.drawEntitiesAndProps(ctx, camera, [player, ...combat.getAllTargets()]);

      // Sfere orbitanti
      combat.drawOrbitOrbs(ctx, player);

      // Dardi e particelle
      combat.drawProjectiles(ctx);
      combat.drawFX(ctx);

      ctx.restore();

      // Vignettatura
      world.drawVignette(ctx, canvas.width, canvas.height);
      ctx.restore();

      // 3. AGGIORNAMENTO HUD DI GIOCO
      if (gameState === 'PLAYING') {
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

  // Inizializza il profilo utente all'avvio
  await refreshProfile();
  requestAnimationFrame(loop);
});
