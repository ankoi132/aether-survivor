/**
 * core/api.js - Client API Bridge con Fallback Offline Automatico
 * Comunica con il server REST di Aether Survivor o usa il salvataggio locale se offline.
 */
import { TALENTS_DEF } from './talents.js';

const API_BASE = window.location.protocol.startsWith('http') ? '' : 'http://localhost:3000';

class GameAPI {
  constructor() {
    this.nickname = localStorage.getItem('aether_nickname') || 'Mago-' + Math.floor(1000 + Math.random() * 9000);
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

  // --- LOGICA OFFLINE LOCALSTORAGE ---
  _getLocalProfile(nickname) {
    const key = `aether_profile_${nickname.toLowerCase()}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {}
    }

    const defaultProfile = {
      nickname,
      gold: 100,
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
      }
    };
    localStorage.setItem(key, JSON.stringify(defaultProfile));
    return defaultProfile;
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

    return {
      ...profile,
      calculatedStats,
      talentsCatalog
    };
  }

  // --- METODI PUBBLICI ---
  async getProfile(nickname) {
    this.nickname = nickname;
    localStorage.setItem('aether_nickname', nickname);

    try {
      const res = await fetch(`${API_BASE}/api/profile/${encodeURIComponent(nickname)}`);
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
          headers: { 'Content-Type': 'application/json' },
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

  async submitRun(runStats) {
    if (this.isOnline) {
      try {
        const res = await fetch(`${API_BASE}/api/runs/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
