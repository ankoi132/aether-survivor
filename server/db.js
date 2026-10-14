/**
 * server/db.js - Database persistente per Aether Survivor
 * Salva i profili, i talenti acquistati, l'oro e la classifica in un file JSON atomico.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

import { TALENTS_DEF } from '../src/core/talents.js';

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
        gold: 100, // Bonus iniziale per i nuovi avventurieri!
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
      this.profiles.set(key, newProfile);
      this.save();
    }

    const p = this.profiles.get(key);
    return {
      ...p,
      calculatedStats: this.calculateStats(p.talents),
      talentsCatalog: Object.values(TALENTS_DEF).map(def => ({
        ...def,
        currentRank: p.talents[def.id] || 0,
        nextCost: (p.talents[def.id] || 0) >= def.maxRank ? null : this.getCostForTalent(def.id, p.talents[def.id] || 0)
      }))
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

  recordRun(rawNickname, runData) {
    const nick = (rawNickname || 'MagoAnonimo').trim();
    const profile = this.getOrCreateProfile(nick);

    const kills = Number(runData.kills) || 0;
    const level = Number(runData.level) || 1;
    const survivalSeconds = Number(runData.survivalSeconds) || 0;
    const rawGold = Number(runData.goldEarned) || 0;

    // Applica moltiplicatore oro del talento "Alchimia Runica"
    const goldMultiplier = 1 + (profile.talents.gold_gain || 0) * TALENTS_DEF.gold_gain.bonusPerRank;
    const finalGold = Math.round(rawGold * goldMultiplier);

    // Aggiorna profilo
    const p = this.profiles.get(nick.toLowerCase());
    p.gold += finalGold;
    p.totalRuns += 1;
    p.totalKills += kills;
    p.highestLevel = Math.max(p.highestLevel, level);
    p.bestSurvivalSeconds = Math.max(p.bestSurvivalSeconds, survivalSeconds);

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

    // Ordina e conserva i migliori 20 record
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
