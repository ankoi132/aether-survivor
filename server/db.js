/**
 * server/db.js - Database persistente per Aether Survivor
 * Salva i profili, l'inventario artefatti/materiali, le armi forgiate, i talenti e la classifica in un file JSON atomico.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

import { TALENTS_DEF } from '../src/core/talents.js';
import { WEAPONS_DEF, MATERIALS_DEF } from '../src/core/crafting.js';

class Database {
  constructor() {
    this.profiles = new Map();
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
        if (data.profiles) {
          for (const [k, v] of Object.entries(data.profiles)) {
            this.profiles.set(k.toLowerCase(), v);
          }
        }
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
        profiles: Object.fromEntries(this.profiles.entries()),
        leaderboard: this.leaderboard
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      console.error('Errore durante il salvataggio su disco del database:', err);
    }
  }

  getCostForTalent(talentId, currentRank) {
    const def = TALENTS_DEF[talentId];
    if (!def) return 999999;
    return Math.floor(def.baseCost * Math.pow(def.costMult, currentRank));
  }

  calculateStats(talents = {}) {
    return {
      bonusHp: (talents.max_hp || 0) * TALENTS_DEF.max_hp.bonusPerRank,
      bonusDamage: (talents.damage || 0) * TALENTS_DEF.damage.bonusPerRank,
      speedMultiplier: 1 + (talents.speed || 0) * TALENTS_DEF.speed.bonusPerRank,
      magnetMultiplier: 1 + (talents.magnet || 0) * TALENTS_DEF.magnet.bonusPerRank,
      goldMultiplier: 1 + (talents.gold_gain || 0) * TALENTS_DEF.gold_gain.bonusPerRank
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
        equippedWeapon: 'staff'
      };
      this.profiles.set(key, newProfile);
      this.save();
    }

    const p = this.profiles.get(key);

    // Garanzia di retrocompatibilità se il profilo esisteva prima di questo aggiornamento
    if (!p.inventory) {
      p.inventory = {
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

    return {
      ...p,
      calculatedStats: this.calculateStats(p.talents),
      talentsCatalog: Object.values(TALENTS_DEF).map(def => ({
        ...def,
        currentRank: p.talents[def.id] || 0,
        nextCost: (p.talents[def.id] || 0) >= def.maxRank ? null : this.getCostForTalent(def.id, p.talents[def.id] || 0)
      })),
      weaponsCatalog,
      inventoryCatalog
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
      // Sblocco dell'arma
      if (!def.unlockCost) {
        p.weapons[weaponId] = 1;
        this.save();
        return this.getOrCreateProfile(nick);
      }
      goldCost = def.unlockCost.gold || 0;
      materialsCost = def.unlockCost.materials || {};
    } else {
      // Potenziamento
      const nextUp = def.upgrades.find(u => u.level === currentLevel + 1);
      if (!nextUp) {
        throw new Error('Nessun potenziamento disponibile');
      }
      goldCost = nextUp.gold || 0;
      materialsCost = nextUp.materials || {};
    }

    // Verifica oro
    if (p.gold < goldCost) {
      throw new Error(`Oro insufficiente: servono ${goldCost} oro ma ne possiedi ${p.gold}`);
    }

    // Verifica materiali nell'inventario
    for (const [matId, reqAmount] of Object.entries(materialsCost)) {
      const owned = p.inventory[matId] || 0;
      if (owned < reqAmount) {
        const matDef = MATERIALS_DEF[matId] || { name: matId };
        throw new Error(`Materiali insufficienti: servono ${reqAmount}x ${matDef.name} ma ne possiedi solo ${owned}`);
      }
    }

    // Deduci oro e materiali
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

  recordRun(rawNickname, runData) {
    const nick = (rawNickname || 'MagoAnonimo').trim();
    const profile = this.getOrCreateProfile(nick);

    const kills = Number(runData.kills) || 0;
    const level = Number(runData.level) || 1;
    const survivalSeconds = Number(runData.survivalSeconds) || 0;
    const rawGold = Number(runData.goldEarned) || 0;

    // Moltiplicatore oro del talento
    const goldMultiplier = 1 + (profile.talents.gold_gain || 0) * TALENTS_DEF.gold_gain.bonusPerRank;
    const finalGold = Math.round(rawGold * goldMultiplier);

    const p = this.profiles.get(nick.toLowerCase());
    p.gold += finalGold;
    p.totalRuns += 1;
    p.totalKills += kills;
    p.highestLevel = Math.max(p.highestLevel, level);
    p.bestSurvivalSeconds = Math.max(p.bestSurvivalSeconds, survivalSeconds);

    // Salva gli artefatti e materiali raccolti nell'inventario del profilo
    if (runData.collectedItems && typeof runData.collectedItems === 'object') {
      p.inventory = p.inventory || {};
      for (const [itemId, count] of Object.entries(runData.collectedItems)) {
        p.inventory[itemId] = (p.inventory[itemId] || 0) + Number(count || 0);
      }
    }

    // Registra nella classifica
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
