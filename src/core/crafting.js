/**
 * core/crafting.js - Definizioni di Materiali, Artefatti e Forgiatura Armi per Aether Survivor
 * Utilizzato sia dal Client che dal Server per garantire coerenza assoluta nelle ricette.
 */

export const MATERIALS_DEF = {
  slime_gel: {
    id: 'slime_gel',
    name: 'Gel Silvano',
    icon: '🧪',
    desc: 'Materia gelatinosa pura raccolta dagli Slime del Bosco.',
    color: '#22c55e',
    rarity: 'Comune'
  },
  ice_crystal: {
    id: 'ice_crystal',
    name: 'Cristallo Gelido',
    icon: '❄️',
    desc: 'Ghiaccio perenne non fondente che brilla sulle vette innevate.',
    color: '#38bdf8',
    rarity: 'Non Comune'
  },
  sun_amber: {
    id: 'sun_amber',
    name: 'Ambra delle Sabbie',
    icon: '☀️',
    desc: 'Gemma solare fossilizzata tra le dune ardenti del deserto.',
    color: '#f59e0b',
    rarity: 'Non Comune'
  },
  magma_core: {
    id: 'magma_core',
    name: 'Nucleo di Lava',
    icon: '🔥',
    desc: 'Frammento incandescente di roccia e fuoco elementale della caldera.',
    color: '#ef4444',
    rarity: 'Raro'
  },
  ancient_bone: {
    id: 'ancient_bone',
    name: 'Osso Antico',
    icon: '🦴',
    desc: 'Resto pietrificato degli scheletri a guardia delle antiche rovine.',
    color: '#cbd5e1',
    rarity: 'Comune'
  },
  iron_scrap: {
    id: 'iron_scrap',
    name: 'Metallo Temprato',
    icon: '⚙️',
    desc: 'Lingotti e frammenti di metallo usati per forgiare armi robuste.',
    color: '#94a3b8',
    rarity: 'Comune'
  },
  arcane_rune: {
    id: 'arcane_rune',
    name: 'Runa Arcana',
    icon: '✨',
    desc: 'Raro artefatto runico carico di antica magia elementale.',
    color: '#c084fc',
    rarity: 'Raro'
  }
};

export const WEAPONS_DEF = {
  staff: {
    id: 'staff',
    name: 'Bastone dell\'Arcimago',
    icon: '🪄',
    typeName: 'Magia a Distanza (Dardi Autoguidati)',
    desc: 'Scaglia dardi arcani luminosi che inseguono i bersagli più vicini con precisione fatata.',
    maxLevel: 5,
    unlockCost: null, // Sbloccato di default
    baseStats: {
      damage: 18,
      cooldown: 0.85,
      range: 320,
      projectiles: 1,
      speed: 380
    },
    upgrades: [
      {
        level: 2,
        gold: 80,
        materials: { slime_gel: 4, arcane_rune: 1 },
        benefit: '+6 Danno, +1 Dardo magico',
        stats: { damageBonus: 6, extraProjectiles: 1, cooldownReduction: 0.05 }
      },
      {
        level: 3,
        gold: 160,
        materials: { slime_gel: 6, ice_crystal: 3, arcane_rune: 2 },
        benefit: '+8 Danno, -15% Tempo di Ricarica',
        stats: { damageBonus: 14, extraProjectiles: 1, cooldownReduction: 0.15 }
      },
      {
        level: 4,
        gold: 260,
        materials: { ice_crystal: 5, magma_core: 3, arcane_rune: 3 },
        benefit: '+10 Danno, +1 Dardo aggiuntivo (3 dardi)',
        stats: { damageBonus: 24, extraProjectiles: 2, cooldownReduction: 0.18 }
      },
      {
        level: 5,
        gold: 400,
        materials: { magma_core: 6, arcane_rune: 5 },
        benefit: '+16 Danno, Dardi di Mana Instabile ad alta velocità',
        stats: { damageBonus: 40, extraProjectiles: 2, cooldownReduction: 0.25 }
      }
    ]
  },
  sword: {
    id: 'sword',
    name: 'Spada da Cavaliere',
    icon: '🗡️',
    typeName: 'Mischia ad Area (Fendenti Ravvicinati)',
    desc: 'Esegue rapidi fendenti semicircolari ad ampio raggio con elevato danno da taglio e potente spinta indietro (knockback).',
    maxLevel: 5,
    unlockCost: {
      gold: 120,
      materials: { iron_scrap: 4, ancient_bone: 3 }
    },
    baseStats: {
      damage: 28,
      cooldown: 0.55,
      range: 92,
      knockback: 180,
      arcAngle: Math.PI * 0.95
    },
    upgrades: [
      {
        level: 2,
        gold: 100,
        materials: { iron_scrap: 5, ancient_bone: 4 },
        benefit: '+8 Danno da taglio, +16px Ampiezza fendente',
        stats: { damageBonus: 8, rangeBonus: 16, cooldownReduction: 0.04 }
      },
      {
        level: 3,
        gold: 180,
        materials: { iron_scrap: 8, sun_amber: 3, ancient_bone: 5 },
        benefit: '+12 Danno, +35% Spinta Indietro (Knockback)',
        stats: { damageBonus: 20, rangeBonus: 22, knockbackBonus: 70 }
      },
      {
        level: 4,
        gold: 280,
        materials: { iron_scrap: 10, magma_core: 3, arcane_rune: 2 },
        benefit: '+15 Danno, -20% Tempo di Recupero tra i colpi',
        stats: { damageBonus: 35, rangeBonus: 30, cooldownReduction: 0.12 }
      },
      {
        level: 5,
        gold: 420,
        materials: { iron_scrap: 15, magma_core: 5, arcane_rune: 4 },
        benefit: '+22 Danno, Lama di Fiamme Runica a Vortice 360°',
        stats: { damageBonus: 57, rangeBonus: 42, fullCircle: true }
      }
    ]
  },
  bow: {
    id: 'bow',
    name: 'Arco dei Guardaboschi',
    icon: '🏹',
    typeName: 'Frecce Perforanti a Lungo Raggio',
    desc: 'Scocca frecce aerodinamiche ad altissima velocità che trapassano i nemici in linea retta a grande distanza.',
    maxLevel: 5,
    unlockCost: {
      gold: 120,
      materials: { ancient_bone: 4, sun_amber: 3 }
    },
    baseStats: {
      damage: 22,
      cooldown: 0.70,
      range: 440,
      pierce: 2,
      speed: 520
    },
    upgrades: [
      {
        level: 2,
        gold: 100,
        materials: { ancient_bone: 5, sun_amber: 4 },
        benefit: '+6 Danno, +1 Bersaglio trapassabile (Pierce 3)',
        stats: { damageBonus: 6, extraPierce: 1, cooldownReduction: 0.05 }
      },
      {
        level: 3,
        gold: 180,
        materials: { sun_amber: 6, ice_crystal: 4, iron_scrap: 4 },
        benefit: '+10 Danno, +25% Velocità di volo della freccia',
        stats: { damageBonus: 16, extraPierce: 1, speedBonus: 130 }
      },
      {
        level: 4,
        gold: 280,
        materials: { sun_amber: 8, magma_core: 4, arcane_rune: 2 },
        benefit: '+14 Danno, Tiro Doppio (2 frecce parallele)',
        stats: { damageBonus: 30, extraPierce: 2, extraArrows: 1 }
      },
      {
        level: 5,
        gold: 420,
        materials: { sun_amber: 10, arcane_rune: 4, magma_core: 5 },
        benefit: '+20 Danno, Frecce di Cristallo Solare a Perforazione Totale',
        stats: { damageBonus: 50, infinitePierce: true, extraArrows: 1 }
      }
    ]
  }
};
