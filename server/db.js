/**
 * server/db.js - Database persistente per Aether Survivor con Sistema Account,
 * Autenticazione crittografica (salt + scrypt), salvataggio progressi e predisposizione In-App Purchases
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

import { TALENTS_DEF } from '../src/core/talents.js';
import { WEAPONS_DEF, MATERIALS_DEF, EQUIPMENT_DEF, REFINING_RECIPES } from '../src/core/crafting.js';

// Funzioni crittografiche sicure basate sulle API native di Node.js
function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function generateToken() {
  return 'aeth_' + crypto.randomBytes(32).toString('hex');
}

class Database {
  constructor() {
    this.accounts = new Map(); // key = usernameLower -> account obj
    this.profiles = new Map(); // key = usernameLower -> profile obj
    this.leaderboard = [];
    this.init();
  }

  init() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const data = JSON.parse(raw);

        // 1. Carica Account
        if (data.accounts) {
          for (const [k, v] of Object.entries(data.accounts)) {
            this.accounts.set(k.toLowerCase(), v);
          }
        }

        // 2. Carica Profili di gioco
        if (data.profiles) {
          for (const [k, v] of Object.entries(data.profiles)) {
            this.profiles.set(k.toLowerCase(), v);
          }
        }

        // 3. Carica Classifica
        if (Array.isArray(data.leaderboard)) {
          this.leaderboard = data.leaderboard;
        }
      } catch (err) {
        console.error('Errore nel caricamento del database, inizializzazione default:', err);
      }
    }
  }

  save() {
    try {
      const obj = {
        accounts: Object.fromEntries(this.accounts.entries()),
        profiles: Object.fromEntries(this.profiles.entries()),
        leaderboard: this.leaderboard
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      console.error('Errore durante il salvataggio su disco del database:', err);
    }
  }

  // =========================================================================
  // GESTIONE ACCOUNT & AUTENTICAZIONE (Pronto per Supabase e In-App Purchases)
  // =========================================================================

  /**
   * Registra un nuovo account giocatore con password protetta da salt + hash
   */
  registerAccount(rawUsername, rawPassword, rawEmail = '') {
    const username = (rawUsername || '').trim();
    const password = (rawPassword || '').trim();
    const email = (rawEmail || '').trim().toLowerCase();

    if (!username || username.length < 3) {
      throw new Error('Il nome utente deve contenere almeno 3 caratteri.');
    }
    if (username.length > 20) {
      throw new Error('Il nome utente non può superare i 20 caratteri.');
    }
    if (!/^[a-zA-Z0-9_\-]+$/.test(username)) {
      throw new Error('Il nome utente può contenere solo lettere, numeri, trattini e underscore.');
    }
    if (!password || password.length < 4) {
      throw new Error('La password deve contenere almeno 4 caratteri.');
    }

    const key = username.toLowerCase();
    if (this.accounts.has(key)) {
      throw new Error(`L'account "${username}" esiste già! Scegli un altro nome o accedi.`);
    }

    if (email) {
      for (const acc of this.accounts.values()) {
        if (acc.email && acc.email.toLowerCase() === email) {
          throw new Error('Questa email è già associata a un altro account.');
        }
      }
    }

    const salt = generateSalt();
    const passwordHash = hashPassword(password, salt);
    const token = generateToken();
    const id = 'usr_' + crypto.randomBytes(8).toString('hex');

    const account = {
      id,
      username,
      email,
      passwordHash,
      salt,
      token,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      inAppPurchases: [], // Array per salvare transazioni, bundle, skin o pass futuri
      inventorySlots: 32
    };

    this.accounts.set(key, account);

    // Crea o collega il profilo di gioco
    const profile = this.getOrCreateProfile(username);
    profile.accountId = id;

    this.save();

    return {
      token,
      user: {
        id: account.id,
        username: account.username,
        email: account.email,
        createdAt: account.createdAt,
        inAppPurchases: account.inAppPurchases
      },
      profile
    };
  }

  /**
   * Effettua il login verificando le credenziali
   */
  loginAccount(rawIdentifier, rawPassword) {
    const identifier = (rawIdentifier || '').trim().toLowerCase();
    const password = (rawPassword || '').trim();

    if (!identifier || !password) {
      throw new Error('Nome utente e password sono obbligatori.');
    }

    // Ricerca per username o per email
    let account = this.accounts.get(identifier);
    if (!account) {
      for (const acc of this.accounts.values()) {
        if (acc.email && acc.email.toLowerCase() === identifier) {
          account = acc;
          break;
        }
      }
    }

    if (!account) {
      throw new Error('Account non trovato. Controlla il nome utente o registrati.');
    }

    const testHash = hashPassword(password, account.salt);
    if (testHash !== account.passwordHash) {
      throw new Error('Password errata. Riprova.');
    }

    // Rinnova token di sessione
    account.token = generateToken();
    account.lastLogin = new Date().toISOString();
    this.save();

    const profile = this.getOrCreateProfile(account.username);
    profile.accountId = account.id;

    return {
      token: account.token,
      user: {
        id: account.id,
        username: account.username,
        email: account.email,
        createdAt: account.createdAt,
        inAppPurchases: account.inAppPurchases || []
      },
      profile
    };
  }

  /**
   * Trova l'account e il profilo corrispondente al token di sessione
   */
  getAccountByToken(token) {
    if (!token) return null;
    for (const acc of this.accounts.values()) {
      if (acc.token && acc.token === token) {
        const profile = this.getOrCreateProfile(acc.username);
        return {
          user: {
            id: acc.id,
            username: acc.username,
            email: acc.email,
            createdAt: acc.createdAt,
            inAppPurchases: acc.inAppPurchases || []
          },
          profile
        };
      }
    }
    return null;
  }

  /**
   * Disconnette l'account invalidando il token di sessione
   */
  logoutAccount(token) {
    if (!token) return;
    for (const acc of this.accounts.values()) {
      if (acc.token && acc.token === token) {
        acc.token = null;
        this.save();
        break;
      }
    }
  }

  // =========================================================================
  // GESTIONE PROFILO DI GIOCO, TALENTI, FORGIA & CLASSIFICA
  // =========================================================================

  getCostForTalent(talentId, currentRank) {
    const def = TALENTS_DEF[talentId];
    if (!def) return 999999;
    return Math.floor(def.baseCost * Math.pow(def.costMult, currentRank));
  }

  calculateStats(talents = {}, equipment = {}) {
    const bonusHpTalent = (talents.max_hp || 0) * (TALENTS_DEF.max_hp?.bonusPerRank || 15);
    const bonusDmgTalent = (talents.damage || 0) * (TALENTS_DEF.damage?.bonusPerRank || 3);
    const speedMultTalent = (talents.speed || 0) * (TALENTS_DEF.speed?.bonusPerRank || 0.04);
    const magnetMultTalent = (talents.magnet || 0) * (TALENTS_DEF.magnet?.bonusPerRank || 0.08);
    const goldMultTalent = (talents.gold_gain || 0) * (TALENTS_DEF.gold_gain?.bonusPerRank || 0.10);

    let bonusHp = bonusHpTalent;
    let defense = 0;
    let bonusDamage = bonusDmgTalent;
    let speedBonusTotal = 0;
    let critChance = 0;
    let critDamage = 50; // base +50% extra sui critici (tot 1.5x)
    let hpRegen = 0;
    let lifeSteal = 0;
    let dodgeChance = 0;
    let cooldownReduction = 0;
    let ignoreWaterSlow = false;

    if (equipment && typeof equipment === 'object') {
      for (const [slot, eqId] of Object.entries(equipment)) {
        if (!eqId) continue;
        const eqDef = EQUIPMENT_DEF[eqId];
        if (eqDef && eqDef.stats) {
          const s = eqDef.stats;
          if (s.maxHp) bonusHp += s.maxHp;
          if (s.defense) defense += s.defense;
          if (s.bonusDamage) bonusDamage += s.bonusDamage;
          if (s.speedBonus) speedBonusTotal += s.speedBonus;
          if (s.critChance) critChance += s.critChance;
          if (s.critDamage) critDamage += s.critDamage;
          if (s.hpRegen) hpRegen += s.hpRegen;
          if (s.lifeSteal) lifeSteal += s.lifeSteal;
          if (s.dodgeChance) dodgeChance += s.dodgeChance;
          if (s.cooldownReduction) cooldownReduction += s.cooldownReduction;
          if (s.ignoreWaterSlow) ignoreWaterSlow = true;
        }
      }
    }

    const damageReductionPercent = defense > 0 ? Math.round((defense / (defense + 100)) * 100) : 0;

    return {
      bonusHp,
      defense,
      damageReductionPercent,
      bonusDamage,
      speedMultiplier: 1 + speedMultTalent + (speedBonusTotal / 100),
      speedBonusPercent: Math.round((speedMultTalent * 100) + speedBonusTotal),
      magnetMultiplier: 1 + magnetMultTalent,
      goldMultiplier: 1 + goldMultTalent,
      critChance: Math.min(75, critChance),
      critDamage,
      hpRegen,
      lifeSteal,
      dodgeChance: Math.min(50, dodgeChance),
      cooldownReduction: Math.min(0.40, cooldownReduction),
      ignoreWaterSlow
    };
  }

  getOrCreateProfile(rawNickname) {
    const nick = (rawNickname || 'MagoAnonimo').trim();
    const key = nick.toLowerCase();

    if (!this.profiles.has(key)) {
      const newProfile = {
        nickname: nick,
        createdAt: new Date().toISOString(),
        gold: 150, // Bonus iniziale di avvio
        totalRuns: 0,
        totalKills: 0,
        highestLevel: 1,
        bestSurvivalSeconds: 0,
        talents: {
          max_hp: 0,
          damage: 0,
          speed: 0,
          magnet: 0,
          gold_gain: 0
        },
        inventory: {
          copper_ore: 6,
          ancient_wood: 4,
          slime_gel: 4,
          ice_crystal: 0,
          sun_amber: 0,
          magma_core: 0,
          ancient_bone: 3,
          iron_scrap: 4,
          arcane_rune: 1
        },
        weapons: {
          staff: 1, // Sbloccato all'inizio
          sword: 0, // Da forgiare dal fabbro
          bow: 0    // Da forgiare dal fabbro
        },
        equippedWeapon: 'staff',
        equipment: {
          armor: null,
          helmet: null,
          boots: null,
          amulet: null,
          ring: null
        },
        craftedItems: [],
        inAppPurchases: []
      };
      this.profiles.set(key, newProfile);
      this.save();
    }

    const p = this.profiles.get(key);

    // Garanzia di retrocompatibilità
    if (!p.inventory) {
      p.inventory = {
        copper_ore: 6,
        ancient_wood: 4,
        slime_gel: 4,
        ice_crystal: 0,
        sun_amber: 0,
        magma_core: 0,
        ancient_bone: 3,
        iron_scrap: 4,
        arcane_rune: 1
      };
    }
    if (!p.weapons) {
      p.weapons = { staff: 1, sword: 0, bow: 0 };
    }
    if (!p.equippedWeapon) {
      p.equippedWeapon = 'staff';
    }
    if (!p.equipment) {
      p.equipment = { armor: null, helmet: null, boots: null, amulet: null, ring: null };
    }
    if (!Array.isArray(p.craftedItems)) {
      p.craftedItems = [];
    }
    if (!p.inAppPurchases) {
      p.inAppPurchases = [];
    }

    // Catalogo armi e stato di forgiatura
    const weaponsCatalog = Object.values(WEAPONS_DEF).map(def => {
      const currentLevel = p.weapons[def.id] || 0;
      let nextCost = null;
      let nextBenefit = null;
      if (currentLevel === 0) {
        nextCost = def.unlockCost;
        nextBenefit = 'Forgia e sblocca quest\'arma per le spedizioni';
      } else if (currentLevel < def.maxLevel) {
        const up = def.upgrades.find(u => u.level === currentLevel + 1);
        if (up) {
          nextCost = { gold: up.gold, materials: up.materials };
          nextBenefit = up.benefit;
        }
      }
      return {
        ...def,
        currentLevel,
        isUnlocked: currentLevel >= 1,
        isEquipped: p.equippedWeapon === def.id,
        isMaxLevel: currentLevel >= def.maxLevel,
        nextCost,
        nextBenefit
      };
    });

    // Catalogo inventario e materiali posseduti
    const inventoryCatalog = Object.values(MATERIALS_DEF).map(mat => ({
      ...mat,
      count: p.inventory[mat.id] || 0
    }));

    // Catalogo Equipaggiamento da forgiare
    const equipmentCatalog = Object.values(EQUIPMENT_DEF).map(def => {
      const isEquipped = p.equipment && p.equipment[def.slot] === def.id;
      const isOwned = p.craftedItems.includes(def.id);
      let canCraft = p.gold >= (def.craftCost?.gold || 0);
      if (canCraft && def.craftCost?.materials) {
        for (const [mId, amt] of Object.entries(def.craftCost.materials)) {
          if ((p.inventory[mId] || 0) < amt) {
            canCraft = false;
            break;
          }
        }
      }
      return {
        ...def,
        isEquipped,
        isOwned,
        canCraft
      };
    });

    // Catalogo Raffinazione Risorse
    const refiningCatalog = REFINING_RECIPES.map(rec => {
      let canRefine = p.gold >= (rec.goldCost || 0);
      if (canRefine && rec.inputs) {
        for (const [mId, amt] of Object.entries(rec.inputs)) {
          if ((p.inventory[mId] || 0) < amt) {
            canRefine = false;
            break;
          }
        }
      }
      return {
        ...rec,
        canRefine,
        outputDef: MATERIALS_DEF[rec.output.itemId] || { name: rec.output.itemId, icon: '📦', color: '#fff' }
      };
    });

    // Catalogo Oggetti Riciclabili / Salvage
    const salvageCatalog = p.craftedItems.map(eqId => {
      const def = EQUIPMENT_DEF[eqId] || { id: eqId, name: eqId, slot: 'unknown', icon: '📦', rarity: 'Comune', salvageYield: {} };
      const isEquipped = p.equipment && p.equipment[def.slot] === eqId;
      return {
        ...def,
        isEquipped
      };
    });

    // Pezzi correntemente equipaggiati con definizioni
    const equippedPieces = {};
    for (const slot of ['armor', 'helmet', 'boots', 'amulet', 'ring']) {
      const eqId = p.equipment ? p.equipment[slot] : null;
      equippedPieces[slot] = eqId ? (EQUIPMENT_DEF[eqId] || null) : null;
    }

    return {
      ...p,
      calculatedStats: this.calculateStats(p.talents, p.equipment),
      talentsCatalog: Object.values(TALENTS_DEF).map(def => ({
        ...def,
        currentRank: p.talents[def.id] || 0,
        nextCost: (p.talents[def.id] || 0) >= def.maxRank ? null : this.getCostForTalent(def.id, p.talents[def.id] || 0)
      })),
      weaponsCatalog,
      inventoryCatalog,
      equipmentCatalog,
      refiningCatalog,
      salvageCatalog,
      equippedPieces
    };
  }

  upgradeTalent(rawNickname, talentId) {
    const nick = (rawNickname || '').trim();
    const key = nick.toLowerCase();
    const profile = this.profiles.get(key);

    if (!profile) {
      throw new Error('Profilo non trovato');
    }

    const def = TALENTS_DEF[talentId];
    if (!def) {
      throw new Error('Talento non valido');
    }

    const currentRank = profile.talents[talentId] || 0;
    if (currentRank >= def.maxRank) {
      throw new Error('Talento già al rango massimo');
    }

    const cost = this.getCostForTalent(talentId, currentRank);
    if (profile.gold < cost) {
      throw new Error(`Oro insufficiente: servono ${cost} oro ma ne possiedi ${profile.gold}`);
    }

    profile.gold -= cost;
    profile.talents[talentId] = currentRank + 1;
    this.save();

    return this.getOrCreateProfile(nick);
  }

  /**
   * Forgia o potenzia un'arma dal Fabbro
   */
  craftOrUpgradeWeapon(rawNickname, weaponId) {
    const nick = (rawNickname || '').trim();
    const key = nick.toLowerCase();
    const p = this.profiles.get(key);

    if (!p) {
      throw new Error('Profilo non trovato');
    }

    const def = WEAPONS_DEF[weaponId];
    if (!def) {
      throw new Error('Arma non valida');
    }

    const currentLevel = p.weapons[weaponId] || 0;
    if (currentLevel >= def.maxLevel) {
      throw new Error('Quest\'arma ha già raggiunto il livello massimo di forgiatura!');
    }

    let goldCost = 0;
    let materialsCost = {};

    if (currentLevel === 0) {
      if (!def.unlockCost) {
        p.weapons[weaponId] = 1;
        this.save();
        return this.getOrCreateProfile(nick);
      }
      goldCost = def.unlockCost.gold || 0;
      materialsCost = def.unlockCost.materials || {};
    } else {
      const nextUp = def.upgrades.find(u => u.level === currentLevel + 1);
      if (!nextUp) {
        throw new Error('Nessun potenziamento disponibile');
      }
      goldCost = nextUp.gold || 0;
      materialsCost = nextUp.materials || {};
    }

    if (p.gold < goldCost) {
      throw new Error(`Oro insufficiente: servono ${goldCost} oro ma ne possiedi ${p.gold}`);
    }

    for (const [matId, reqAmount] of Object.entries(materialsCost)) {
      const owned = p.inventory[matId] || 0;
      if (owned < reqAmount) {
        const matDef = MATERIALS_DEF[matId] || { name: matId };
        throw new Error(`Materiali insufficienti: servono ${reqAmount}x ${matDef.name} ma ne possiedi solo ${owned}`);
      }
    }

    p.gold -= goldCost;
    for (const [matId, reqAmount] of Object.entries(materialsCost)) {
      p.inventory[matId] = Math.max(0, (p.inventory[matId] || 0) - reqAmount);
    }

    p.weapons[weaponId] = currentLevel + 1;
    this.save();

    return this.getOrCreateProfile(nick);
  }

  /**
   * Equipaggia un'arma sbloccata
   */
  equipWeapon(rawNickname, weaponId) {
    const nick = (rawNickname || '').trim();
    const key = nick.toLowerCase();
    const p = this.profiles.get(key);

    if (!p) {
      throw new Error('Profilo non trovato');
    }

    if ((p.weapons[weaponId] || 0) < 1) {
      throw new Error('Devi prima forgiare quest\'arma dal Fabbro per poterla equipaggiare!');
    }

    p.equippedWeapon = weaponId;
    this.save();

    return this.getOrCreateProfile(nick);
  }

  /**
   * Forgia un pezzo di equipaggiamento (Diablo Style) dal Fabbro
   */
  craftEquipment(rawNickname, equipId) {
    const nick = (rawNickname || '').trim();
    const key = nick.toLowerCase();
    const p = this.profiles.get(key);
    if (!p) throw new Error('Profilo non trovato');

    const def = EQUIPMENT_DEF[equipId];
    if (!def) throw new Error('Pezzo d\'equipaggiamento non valido');

    const goldCost = def.craftCost?.gold || 0;
    const matsCost = def.craftCost?.materials || {};

    if (p.gold < goldCost) {
      throw new Error(`Oro insufficiente: servono ${goldCost} oro ma ne possiedi ${p.gold}`);
    }

    for (const [mId, req] of Object.entries(matsCost)) {
      const owned = p.inventory[mId] || 0;
      if (owned < req) {
        const matDef = MATERIALS_DEF[mId] || { name: mId };
        throw new Error(`Materiale insufficiente: servono ${req}x ${matDef.name} ma ne possiedi ${owned}`);
      }
    }

    p.gold -= goldCost;
    for (const [mId, req] of Object.entries(matsCost)) {
      p.inventory[mId] = Math.max(0, (p.inventory[mId] || 0) - req);
    }

    p.craftedItems = p.craftedItems || [];
    p.craftedItems.push(equipId);

    // Se lo slot è vuoto, equipaggia automaticamente il pezzo
    p.equipment = p.equipment || {};
    if (!p.equipment[def.slot]) {
      p.equipment[def.slot] = equipId;
    }

    this.save();
    return this.getOrCreateProfile(nick);
  }

  /**
   * Equipaggia un pezzo di armatura o gioiello posseduto (Diablo Style)
   */
  equipItem(rawNickname, equipId) {
    const nick = (rawNickname || '').trim();
    const key = nick.toLowerCase();
    const p = this.profiles.get(key);
    if (!p) throw new Error('Profilo non trovato');

    const def = EQUIPMENT_DEF[equipId];
    if (!def) throw new Error('Oggetto non valido');

    if (!p.craftedItems || !p.craftedItems.includes(equipId)) {
      throw new Error('Non possiedi questo oggetto nel tuo inventario forgiato!');
    }

    p.equipment = p.equipment || {};
    p.equipment[def.slot] = equipId;
    this.save();
    return this.getOrCreateProfile(nick);
  }

  /**
   * Rimuove un pezzo equipaggiato dallo slot
   */
  unequipItem(rawNickname, slot) {
    const nick = (rawNickname || '').trim();
    const key = nick.toLowerCase();
    const p = this.profiles.get(key);
    if (!p) throw new Error('Profilo non trovato');

    p.equipment = p.equipment || {};
    p.equipment[slot] = null;
    this.save();
    return this.getOrCreateProfile(nick);
  }

  /**
   * Raffina risorse grezze alla forgia (Albion Online Style)
   */
  refineResource(rawNickname, recipeId, quantity = 1) {
    const nick = (rawNickname || '').trim();
    const key = nick.toLowerCase();
    const p = this.profiles.get(key);
    if (!p) throw new Error('Profilo non trovato');

    const recipe = REFINING_RECIPES.find(r => r.id === recipeId);
    if (!recipe) throw new Error('Ricetta di raffinazione non valida');

    const times = Math.max(1, Math.min(50, Math.floor(quantity)));
    const totalGold = (recipe.goldCost || 0) * times;

    if (p.gold < totalGold) {
      throw new Error(`Oro insufficiente per raffinare ${times}x: servono ${totalGold} oro`);
    }

    for (const [mId, req] of Object.entries(recipe.inputs)) {
      const totalReq = req * times;
      const owned = p.inventory[mId] || 0;
      if (owned < totalReq) {
        const matDef = MATERIALS_DEF[mId] || { name: mId };
        throw new Error(`Materiali grezzi insufficienti: servono ${totalReq}x ${matDef.name}`);
      }
    }

    p.gold -= totalGold;
    for (const [mId, req] of Object.entries(recipe.inputs)) {
      p.inventory[mId] = Math.max(0, (p.inventory[mId] || 0) - req * times);
    }

    const outId = recipe.output.itemId;
    const outAmt = (recipe.output.count || 1) * times;
    p.inventory[outId] = (p.inventory[outId] || 0) + outAmt;

    this.save();
    return this.getOrCreateProfile(nick);
  }

  /**
   * Smantella un pezzo d'equipaggiamento forgiato per recuperare materiali (Diablo Salvage)
   */
  salvageItem(rawNickname, equipId) {
    const nick = (rawNickname || '').trim();
    const key = nick.toLowerCase();
    const p = this.profiles.get(key);
    if (!p) throw new Error('Profilo non trovato');

    const def = EQUIPMENT_DEF[equipId];
    if (!def) throw new Error('Oggetto non valido per lo smantellamento');

    const idx = (p.craftedItems || []).indexOf(equipId);
    if (idx === -1) {
      throw new Error('Non possiedi questo pezzo nel tuo forziere per riciclarlo');
    }

    // Rimuovi un pezzo
    p.craftedItems.splice(idx, 1);

    // Se era equipaggiato, rimuovilo
    if (p.equipment && p.equipment[def.slot] === equipId) {
      if (!p.craftedItems.includes(equipId)) {
        p.equipment[def.slot] = null;
      }
    }

    // Restituisci materiali riciclati
    if (def.salvageYield) {
      for (const [mId, count] of Object.entries(def.salvageYield)) {
        p.inventory[mId] = (p.inventory[mId] || 0) + count;
      }
    }

    this.save();
    return this.getOrCreateProfile(nick);
  }

  recordRun(rawNickname, runData) {
    const nick = (rawNickname || 'MagoAnonimo').trim();
    const profile = this.getOrCreateProfile(nick);

    const kills = Number(runData.kills) || 0;
    const level = Number(runData.level) || 1;
    const survivalSeconds = Number(runData.survivalSeconds) || 0;
    const rawGold = Number(runData.goldEarned) || 0;

    const goldMultiplier = 1 + (profile.talents.gold_gain || 0) * TALENTS_DEF.gold_gain.bonusPerRank;
    const finalGold = Math.round(rawGold * goldMultiplier);

    const p = this.profiles.get(nick.toLowerCase());
    p.gold += finalGold;
    p.totalRuns += 1;
    p.totalKills += kills;
    p.highestLevel = Math.max(p.highestLevel, level);
    p.bestSurvivalSeconds = Math.max(p.bestSurvivalSeconds, survivalSeconds);

    if (runData.collectedItems && typeof runData.collectedItems === 'object') {
      p.inventory = p.inventory || {};
      for (const [itemId, count] of Object.entries(runData.collectedItems)) {
        p.inventory[itemId] = (p.inventory[itemId] || 0) + Number(count || 0);
      }
    }

    const score = kills * 50 + level * 200 + Math.floor(survivalSeconds * 10);
    this.leaderboard.push({
      nickname: nick,
      score,
      level,
      kills,
      survivalSeconds,
      date: new Date().toISOString()
    });

    this.leaderboard.sort((a, b) => b.score - a.score);
    this.leaderboard = this.leaderboard.slice(0, 20);

    this.save();

    return {
      profile: this.getOrCreateProfile(nick),
      finalGold,
      score
    };
  }

  getLeaderboard() {
    return this.leaderboard;
  }
}

export const db = new Database();
