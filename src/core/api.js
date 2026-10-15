/**
 * core/api.js - Client API Bridge con Autenticazione Account, Token di Sessione
 * e Fallback Offline Automatico per Aether Survivor
 */
import { TALENTS_DEF } from './talents.js';
import { WEAPONS_DEF, MATERIALS_DEF } from './crafting.js';

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
        inAppPurchases: []
      };
      localStorage.setItem(key, JSON.stringify(p));
    }

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
    const calculatedStats = {
      bonusHp: (talents.max_hp || 0) * 15,
      bonusDamage: (talents.damage || 0) * 3,
      speedMultiplier: 1 + (talents.speed || 0) * 0.06,
      magnetMultiplier: 1 + (talents.magnet || 0) * 0.20,
      goldMultiplier: 1 + (talents.gold_gain || 0) * 0.15
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

    return {
      ...profile,
      calculatedStats,
      talentsCatalog,
      weaponsCatalog,
      inventoryCatalog
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
