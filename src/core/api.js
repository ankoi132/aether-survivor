/**
 * core/api.js - Client API Bridge con Autenticazione Account, Token di Sessione
 * e Fallback Offline Automatico per Aether Survivor
 */
import { TALENTS_DEF } from './talents.js';
import { WEAPONS_DEF, MATERIALS_DEF, EQUIPMENT_DEF, REFINING_RECIPES } from './crafting.js';

const API_BASE = window.location.protocol.startsWith('http') ? '' : 'http://localhost:3000';

class GameAPI {
  constructor() {
    this.token = localStorage.getItem('aether_auth_token') || null;
    this.nickname = localStorage.getItem('aether_nickname') || 'Mago-' + Math.floor(1000 + Math.random() * 9000);
    this.currentUser = null;
    this.isGuest = !this.token;
    this.isOnline = false;
    this.checkHealth();
  }

  async checkHealth() {
    try {
      const res = await fetch(`${API_BASE}/api/health`, { method: 'GET' });
      if (res.ok) {
        this.isOnline = true;
      }
    } catch {
      this.isOnline = false;
    }
  }

  _authHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  // =========================================================================
  // METODI DI AUTENTICAZIONE ACCOUNT
  // =========================================================================

  /**
   * Registra un nuovo account
   */
  async register(username, password, email = '') {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Errore durante la registrazione');
    }

    this.token = data.token;
    this.currentUser = data.user;
    this.nickname = data.user.username;
    this.isGuest = false;

    localStorage.setItem('aether_auth_token', this.token);
    localStorage.setItem('aether_nickname', this.nickname);

    return data;
  }

  /**
   * Effettua l'accesso a un account esistente
   */
  async login(username, password) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Errore durante l\'accesso');
    }

    this.token = data.token;
    this.currentUser = data.user;
    this.nickname = data.user.username;
    this.isGuest = false;

    localStorage.setItem('aether_auth_token', this.token);
    localStorage.setItem('aether_nickname', this.nickname);

    return data;
  }

  /**
   * Disconnette l'account e torna in modalità ospite
   */
  async logout() {
    if (this.token) {
      try {
        await fetch(`${API_BASE}/api/auth/logout`, {
          method: 'POST',
          headers: this._authHeaders()
        });
      } catch {}
    }

    this.token = null;
    this.currentUser = null;
    this.isGuest = true;
    localStorage.removeItem('aether_auth_token');
  }

  /**
   * Tenta di ripristinare la sessione attiva salvata in localStorage
   */
  async restoreSession() {
    if (!this.token) {
      this.isGuest = true;
      return null;
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        method: 'GET',
        headers: this._authHeaders()
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          this.currentUser = data.user;
          this.nickname = data.user.username;
          this.isGuest = false;
          localStorage.setItem('aether_nickname', this.nickname);
          return data;
        }
      }
    } catch {}

    // Token scaduto o server non raggiungibile
    return null;
  }

  // =========================================================================
  // LOGICA OFFLINE LOCALSTORAGE (Per ospiti o assenza di connessione)
  // =========================================================================

  _getLocalProfile(nickname) {
    const key = `aether_profile_${nickname.toLowerCase()}`;
    const raw = localStorage.getItem(key);
    let p = null;
    if (raw) {
      try {
        p = JSON.parse(raw);
      } catch {}
    }

    if (!p) {
      p = {
        nickname,
        gold: 150,
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
          staff: 1,
          sword: 0,
          bow: 0
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
      localStorage.setItem(key, JSON.stringify(p));
    }

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

    return p;
  }

  _saveLocalProfile(profile) {
    const key = `aether_profile_${profile.nickname.toLowerCase()}`;
    localStorage.setItem(key, JSON.stringify(profile));
  }

  _formatProfile(profile) {
    const talents = profile.talents || {};
    const equipment = profile.equipment || {};

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
    let critDamage = 50; // +50% extra base (tot 1.5x)
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

    const calculatedStats = {
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

    const talentsCatalog = Object.values(TALENTS_DEF).map(def => {
      const rank = talents[def.id] || 0;
      const nextCost = rank >= def.maxRank ? null : Math.floor(def.baseCost * Math.pow(def.costMult, rank));
      return {
        ...def,
        currentRank: rank,
        nextCost
      };
    });

    const weaponsCatalog = Object.values(WEAPONS_DEF).map(def => {
      const currentLevel = profile.weapons[def.id] || 0;
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
        isEquipped: profile.equippedWeapon === def.id,
        isMaxLevel: currentLevel >= def.maxLevel,
        nextCost,
        nextBenefit
      };
    });

    const inventoryCatalog = Object.values(MATERIALS_DEF).map(mat => ({
      ...mat,
      count: profile.inventory[mat.id] || 0
    }));

    const equipmentCatalog = Object.values(EQUIPMENT_DEF).map(def => {
      const isEquipped = profile.equipment && profile.equipment[def.slot] === def.id;
      const isOwned = (profile.craftedItems || []).includes(def.id);
      let canCraft = profile.gold >= (def.craftCost?.gold || 0);
      if (canCraft && def.craftCost?.materials) {
        for (const [mId, amt] of Object.entries(def.craftCost.materials)) {
          if ((profile.inventory[mId] || 0) < amt) {
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

    const refiningCatalog = REFINING_RECIPES.map(rec => {
      let canRefine = profile.gold >= (rec.goldCost || 0);
      if (canRefine && rec.inputs) {
        for (const [mId, amt] of Object.entries(rec.inputs)) {
          if ((profile.inventory[mId] || 0) < amt) {
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

    const salvageCatalog = (profile.craftedItems || []).map(eqId => {
      const def = EQUIPMENT_DEF[eqId] || { id: eqId, name: eqId, slot: 'unknown', icon: '📦', rarity: 'Comune', salvageYield: {} };
      const isEquipped = profile.equipment && profile.equipment[def.slot] === eqId;
      return {
        ...def,
        isEquipped
      };
    });

    const equippedPieces = {};
    for (const slot of ['armor', 'helmet', 'boots', 'amulet', 'ring']) {
      const eqId = profile.equipment ? profile.equipment[slot] : null;
      equippedPieces[slot] = eqId ? (EQUIPMENT_DEF[eqId] || null) : null;
    }

    return {
      ...profile,
      calculatedStats,
      talentsCatalog,
      weaponsCatalog,
      inventoryCatalog,
      equipmentCatalog,
      refiningCatalog,
      salvageCatalog,
      equippedPieces
    };
  }

  // =========================================================================
  // METODI PUBBLICI DI GIOCO
  // =========================================================================

  async getProfile(nickname = this.nickname) {
    this.nickname = nickname;
    localStorage.setItem('aether_nickname', nickname);

    try {
      const headers = this._authHeaders();
      const res = await fetch(`${API_BASE}/api/profile/${encodeURIComponent(nickname)}`, { headers });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          this.isOnline = true;
          return json.profile;
        }
      }
    } catch {}

    // Fallback Offline
    this.isOnline = false;
    const p = this._getLocalProfile(nickname);
    return this._formatProfile(p);
  }

  async upgradeTalent(talentId) {
    if (this.isOnline) {
      try {
        const res = await fetch(`${API_BASE}/api/talents/upgrade`, {
          method: 'POST',
          headers: this._authHeaders(),
          body: JSON.stringify({ nickname: this.nickname, talentId })
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success) return json.profile;
        }
      } catch {}
    }

    // Fallback Offline
    const p = this._getLocalProfile(this.nickname);
    const def = TALENTS_DEF[talentId];
    const rank = p.talents[talentId] || 0;
    const cost = Math.floor(def.baseCost * Math.pow(def.costMult, rank));

    if (p.gold < cost) throw new Error('Oro insufficiente');
    if (rank >= def.maxRank) throw new Error('Rango massimo già raggiunto');

    p.gold -= cost;
    p.talents[talentId] = rank + 1;
    this._saveLocalProfile(p);
    return this._formatProfile(p);
  }

  async craftOrUpgradeWeapon(weaponId) {
    if (this.isOnline) {
      try {
        const res = await fetch(`${API_BASE}/api/blacksmith/craft`, {
          method: 'POST',
          headers: this._authHeaders(),
          body: JSON.stringify({ nickname: this.nickname, weaponId })
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success) return json.profile;
        }
      } catch (err) {
        console.warn('Errore server forgiatura, fallback offline:', err);
      }
    }

    // Fallback Offline
    const p = this._getLocalProfile(this.nickname);
    const def = WEAPONS_DEF[weaponId];
    if (!def) throw new Error('Arma non valida');

    const currentLevel = p.weapons[weaponId] || 0;
    if (currentLevel >= def.maxLevel) throw new Error('Livello massimo già raggiunto!');

    let goldCost = 0;
    let materialsCost = {};

    if (currentLevel === 0) {
      goldCost = def.unlockCost ? (def.unlockCost.gold || 0) : 0;
      materialsCost = def.unlockCost ? (def.unlockCost.materials || {}) : {};
    } else {
      const up = def.upgrades.find(u => u.level === currentLevel + 1);
      goldCost = up.gold || 0;
      materialsCost = up.materials || {};
    }

    if (p.gold < goldCost) throw new Error(`Oro insufficiente: servono ${goldCost} oro`);
    for (const [matId, req] of Object.entries(materialsCost)) {
      if ((p.inventory[matId] || 0) < req) {
        const matDef = MATERIALS_DEF[matId] || { name: matId };
        throw new Error(`Materiale insufficiente: servono ${req}x ${matDef.name}`);
      }
    }

    p.gold -= goldCost;
    for (const [matId, req] of Object.entries(materialsCost)) {
      p.inventory[matId] = Math.max(0, (p.inventory[matId] || 0) - req);
    }
    p.weapons[weaponId] = currentLevel + 1;
    this._saveLocalProfile(p);
    return this._formatProfile(p);
  }

  async equipWeapon(weaponId) {
    if (this.isOnline) {
      try {
        const res = await fetch(`${API_BASE}/api/weapons/equip`, {
          method: 'POST',
          headers: this._authHeaders(),
          body: JSON.stringify({ nickname: this.nickname, weaponId })
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success) return json.profile;
        }
      } catch {}
    }

    // Fallback Offline
    const p = this._getLocalProfile(this.nickname);
    if ((p.weapons[weaponId] || 0) < 1) {
      throw new Error('Devi prima forgiare quest\'arma dal Fabbro!');
    }
    p.equippedWeapon = weaponId;
    this._saveLocalProfile(p);
    return this._formatProfile(p);
  }

  async craftEquipment(equipId) {
    if (this.isOnline) {
      try {
        const res = await fetch(`${API_BASE}/api/blacksmith/craft-equipment`, {
          method: 'POST',
          headers: this._authHeaders(),
          body: JSON.stringify({ nickname: this.nickname, equipId })
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success) return json.profile;
        }
      } catch (err) {
        console.warn('Errore server forgiatura equipaggiamento, fallback offline:', err);
      }
    }

    // Fallback Offline
    const p = this._getLocalProfile(this.nickname);
    const def = EQUIPMENT_DEF[equipId];
    if (!def) throw new Error('Pezzo d\'equipaggiamento non valido');

    const goldCost = def.craftCost?.gold || 0;
    const matsCost = def.craftCost?.materials || {};

    if (p.gold < goldCost) throw new Error(`Oro insufficiente: servono ${goldCost} oro`);
    for (const [mId, req] of Object.entries(matsCost)) {
      if ((p.inventory[mId] || 0) < req) {
        const matDef = MATERIALS_DEF[mId] || { name: mId };
        throw new Error(`Materiale insufficiente: servono ${req}x ${matDef.name}`);
      }
    }

    p.gold -= goldCost;
    for (const [mId, req] of Object.entries(matsCost)) {
      p.inventory[mId] = Math.max(0, (p.inventory[mId] || 0) - req);
    }
    p.craftedItems = p.craftedItems || [];
    p.craftedItems.push(equipId);
    p.equipment = p.equipment || {};
    if (!p.equipment[def.slot]) {
      p.equipment[def.slot] = equipId;
    }

    this._saveLocalProfile(p);
    return this._formatProfile(p);
  }

  async equipItem(equipId) {
    if (this.isOnline) {
      try {
        const res = await fetch(`${API_BASE}/api/equipment/equip`, {
          method: 'POST',
          headers: this._authHeaders(),
          body: JSON.stringify({ nickname: this.nickname, equipId })
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success) return json.profile;
        }
      } catch {}
    }

    // Fallback Offline
    const p = this._getLocalProfile(this.nickname);
    const def = EQUIPMENT_DEF[equipId];
    if (!def) throw new Error('Oggetto non valido');
    if (!p.craftedItems || !p.craftedItems.includes(equipId)) {
      throw new Error('Non possiedi questo oggetto!');
    }
    p.equipment = p.equipment || {};
    p.equipment[def.slot] = equipId;
    this._saveLocalProfile(p);
    return this._formatProfile(p);
  }

  async unequipItem(slot) {
    if (this.isOnline) {
      try {
        const res = await fetch(`${API_BASE}/api/equipment/unequip`, {
          method: 'POST',
          headers: this._authHeaders(),
          body: JSON.stringify({ nickname: this.nickname, slot })
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success) return json.profile;
        }
      } catch {}
    }

    // Fallback Offline
    const p = this._getLocalProfile(this.nickname);
    p.equipment = p.equipment || {};
    p.equipment[slot] = null;
    this._saveLocalProfile(p);
    return this._formatProfile(p);
  }

  async refineResource(recipeId, quantity = 1) {
    if (this.isOnline) {
      try {
        const res = await fetch(`${API_BASE}/api/blacksmith/refine`, {
          method: 'POST',
          headers: this._authHeaders(),
          body: JSON.stringify({ nickname: this.nickname, recipeId, quantity })
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success) return json.profile;
        }
      } catch (err) {
        console.warn('Errore server raffinazione, fallback offline:', err);
      }
    }

    // Fallback Offline
    const p = this._getLocalProfile(this.nickname);
    const recipe = REFINING_RECIPES.find(r => r.id === recipeId);
    if (!recipe) throw new Error('Ricetta non valida');

    const times = Math.max(1, Math.min(50, Math.floor(quantity)));
    const totalGold = (recipe.goldCost || 0) * times;
    if (p.gold < totalGold) throw new Error(`Oro insufficiente: servono ${totalGold} oro`);

    for (const [mId, req] of Object.entries(recipe.inputs)) {
      const totalReq = req * times;
      if ((p.inventory[mId] || 0) < totalReq) {
        const matDef = MATERIALS_DEF[mId] || { name: mId };
        throw new Error(`Materiali insufficienti: servono ${totalReq}x ${matDef.name}`);
      }
    }

    p.gold -= totalGold;
    for (const [mId, req] of Object.entries(recipe.inputs)) {
      p.inventory[mId] = Math.max(0, (p.inventory[mId] || 0) - req * times);
    }
    const outId = recipe.output.itemId;
    const outAmt = (recipe.output.count || 1) * times;
    p.inventory[outId] = (p.inventory[outId] || 0) + outAmt;

    this._saveLocalProfile(p);
    return this._formatProfile(p);
  }

  async salvageItem(equipId) {
    if (this.isOnline) {
      try {
        const res = await fetch(`${API_BASE}/api/blacksmith/salvage`, {
          method: 'POST',
          headers: this._authHeaders(),
          body: JSON.stringify({ nickname: this.nickname, equipId })
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success) return json.profile;
        }
      } catch (err) {
        console.warn('Errore server salvage, fallback offline:', err);
      }
    }

    // Fallback Offline
    const p = this._getLocalProfile(this.nickname);
    const def = EQUIPMENT_DEF[equipId];
    if (!def) throw new Error('Oggetto non valido');

    const idx = (p.craftedItems || []).indexOf(equipId);
    if (idx === -1) throw new Error('Non possiedi questo oggetto!');

    p.craftedItems.splice(idx, 1);
    if (p.equipment && p.equipment[def.slot] === equipId) {
      if (!p.craftedItems.includes(equipId)) {
        p.equipment[def.slot] = null;
      }
    }

    if (def.salvageYield) {
      for (const [mId, count] of Object.entries(def.salvageYield)) {
        p.inventory[mId] = (p.inventory[mId] || 0) + count;
      }
    }

    this._saveLocalProfile(p);
    return this._formatProfile(p);
  }

  async submitRun(runStats) {
    if (this.isOnline) {
      try {
        const res = await fetch(`${API_BASE}/api/runs/complete`, {
          method: 'POST',
          headers: this._authHeaders(),
          body: JSON.stringify({
            nickname: this.nickname,
            ...runStats
          })
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success) return json.result;
        }
      } catch {}
    }

    // Fallback Offline
    const p = this._getLocalProfile(this.nickname);
    const goldMultiplier = 1 + (p.talents.gold_gain || 0) * 0.15;
    const finalGold = Math.round((runStats.goldEarned || 0) * goldMultiplier);

    p.gold += finalGold;
    p.totalRuns += 1;
    p.totalKills += runStats.kills || 0;
    p.highestLevel = Math.max(p.highestLevel, runStats.level || 1);
    p.bestSurvivalSeconds = Math.max(p.bestSurvivalSeconds, runStats.survivalSeconds || 0);

    // Aggiungi materiali raccolti
    if (runStats.collectedItems) {
      for (const [matId, count] of Object.entries(runStats.collectedItems)) {
        p.inventory[matId] = (p.inventory[matId] || 0) + count;
      }
    }

    this._saveLocalProfile(p);

    return {
      profile: this._formatProfile(p),
      finalGold,
      score: (runStats.kills || 0) * 50 + (runStats.level || 1) * 200 + Math.floor((runStats.survivalSeconds || 0) * 10)
    };
  }

  async getLeaderboard() {
    if (this.isOnline) {
      try {
        const res = await fetch(`${API_BASE}/api/leaderboard`);
        if (res.ok) {
          const json = await res.json();
          if (json.success) return json.leaderboard;
        }
      } catch {}
    }

    // Fallback Offline: record locale
    const p = this._getLocalProfile(this.nickname);
    return [
      {
        nickname: p.nickname,
        score: p.totalKills * 50 + p.highestLevel * 200 + Math.floor(p.bestSurvivalSeconds * 10),
        level: p.highestLevel,
        kills: p.totalKills,
        survivalSeconds: p.bestSurvivalSeconds,
        date: new Date().toISOString()
      }
    ];
  }
}

export const API = new GameAPI();
