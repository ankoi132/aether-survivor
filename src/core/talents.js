/**
 * core/talents.js - Catalogo dei Talenti Permanenti della Meta-Progressione
 * Condiviso tra Client e Server.
 */
export const TALENTS_DEF = {
  max_hp: {
    id: 'max_hp',
    name: 'Vitalità Arcana',
    desc: '+15 HP massimi alla salute del Mago',
    icon: '❤️',
    maxRank: 5,
    baseCost: 50,
    costMult: 1.5,
    bonusPerRank: 15
  },
  damage: {
    id: 'damage',
    name: 'Potenza Celestiale',
    desc: '+3 al danno base di tutti gli incantesimi',
    icon: '⚡',
    maxRank: 5,
    baseCost: 75,
    costMult: 1.6,
    bonusPerRank: 3
  },
  speed: {
    id: 'speed',
    name: 'Passo del Vento',
    desc: '+6% alla velocità di camminata permanente',
    icon: '👟',
    maxRank: 5,
    baseCost: 60,
    costMult: 1.5,
    bonusPerRank: 0.06
  },
  magnet: {
    id: 'magnet',
    name: 'Magnete Astrale',
    desc: '+20% raggio di attrazione permanente per le gemme',
    icon: '🧲',
    maxRank: 5,
    baseCost: 40,
    costMult: 1.4,
    bonusPerRank: 0.20
  },
  gold_gain: {
    id: 'gold_gain',
    name: 'Alchimia Runica',
    desc: '+15% all\'oro guadagnato da ogni spedizione',
    icon: '🪙',
    maxRank: 5,
    baseCost: 80,
    costMult: 1.7,
    bonusPerRank: 0.15
  }
};
