/**
 * core/crafting.js - Definizioni di Materiali, Risorse, Nodi di Raccolta (Albion Style),
 * Equipaggiamento con Slot e Rarità (Diablo Style), Ricette di Forgiatura e Raffinazione
 */

// =========================================================================
// 1. MATERIALI E RISORSE (Albion Online & Diablo Style)
// =========================================================================
export const MATERIALS_DEF = {
  // --- MINERALI E LINGOTTI ---
  copper_ore: {
    id: 'copper_ore',
    name: 'Minerale di Rame',
    icon: '🪨',
    category: 'mineral',
    desc: 'Minerale grezzo ramato estratto dai filoni rocciosi del bosco e delle rive fluviali.',
    color: '#f97316',
    rarity: 'Comune',
    sellValue: 4
  },
  iron_ore: {
    id: 'iron_ore',
    name: 'Minerale di Ferro',
    icon: '⛏️',
    category: 'mineral',
    desc: 'Ferro grezzo denso e pesante estratto dalle scogliere montane e dalle gole desertiche.',
    color: '#94a3b8',
    rarity: 'Comune',
    sellValue: 8
  },
  obsidian_ore: {
    id: 'obsidian_ore',
    name: 'Ossidiana Vulcanica',
    icon: '🌑',
    category: 'mineral',
    desc: 'Vetro vulcanico magmatico nerastro carico di calore e durezza titanica.',
    color: '#7c3aed',
    rarity: 'Raro',
    sellValue: 20
  },
  copper_bar: {
    id: 'copper_bar',
    name: 'Lingotto di Bronzo Antico',
    icon: '🧱',
    category: 'mineral',
    desc: 'Lingotto raffinato alla fonderia, perfetto per finiture e leghe flessibili.',
    color: '#ea580c',
    rarity: 'Comune',
    sellValue: 18
  },
  iron_scrap: {
    id: 'iron_scrap',
    name: 'Metallo Temprato',
    icon: '⚙️',
    category: 'mineral',
    desc: 'Lingotti e piastre di metallo purificato usati per forgiare armi e armature indistruttibili.',
    color: '#cbd5e1',
    rarity: 'Non Comune',
    sellValue: 30
  },
  obsidian_bar: {
    id: 'obsidian_bar',
    name: 'Lingotto d\'Ossidiana',
    icon: '🔮',
    category: 'mineral',
    desc: 'Lega vulcanica purificata nel crogiolo magmatico, resistente a temperature estreme.',
    color: '#a855f7',
    rarity: 'Raro',
    sellValue: 65
  },

  // --- LEGNAME E FIBRE ---
  ancient_wood: {
    id: 'ancient_wood',
    name: 'Legno di Quercia Antica',
    icon: '🪵',
    category: 'wood_fiber',
    desc: 'Tronchi nobili e stagionati abbattuti dalle foreste secolari di Sylva.',
    color: '#b45309',
    rarity: 'Comune',
    sellValue: 5
  },
  frost_pine_wood: {
    id: 'frost_pine_wood',
    name: 'Abete del Permafrost',
    icon: '🌲',
    category: 'wood_fiber',
    desc: 'Legno resiliente impregnato di crio-linfa raccolto sulle vette ghiacciate di Frostpeak.',
    color: '#38bdf8',
    rarity: 'Non Comune',
    sellValue: 12
  },
  desert_hardwood: {
    id: 'desert_hardwood',
    name: 'Legno Fossile del Deserto',
    icon: '🪓',
    category: 'wood_fiber',
    desc: 'Rami fossili induriti da secoli di sole cocente nelle dune dell\'Oasi di Al-Zahir.',
    color: '#d97706',
    rarity: 'Non Comune',
    sellValue: 15
  },
  river_fiber: {
    id: 'river_fiber',
    name: 'Fibra di Canapa Fluviale',
    icon: '🌾',
    category: 'wood_fiber',
    desc: 'Fibre tenaci raccolte lungo i canneti e le cascate, usate per corde, archi e fodere.',
    color: '#06b6d4',
    rarity: 'Comune',
    sellValue: 6
  },

  // --- ERBE E PIANTE ALCHEMICHE ---
  life_lotus: {
    id: 'life_lotus',
    name: 'Loto Vitale delle Cascate',
    icon: '🪷',
    category: 'herb',
    desc: 'Fiore acquatico miracoloso che sboccia sulle rapide. Emana una fragranza che rigenera la linfa vitale.',
    color: '#38bdf8',
    rarity: 'Non Comune',
    sellValue: 16
  },
  frost_bloom: {
    id: 'frost_bloom',
    name: 'Bocciolo di Gelo',
    icon: '💠',
    category: 'herb',
    desc: 'Piccolo fiore cristallino che cresce tra la neve eterna, impiegato in amuleti difensivi.',
    color: '#7dd3fc',
    rarity: 'Non Comune',
    sellValue: 18
  },
  fire_root: {
    id: 'fire_root',
    name: 'Radice Magmatica',
    icon: '🌶️',
    category: 'herb',
    desc: 'Radice ardente che cresce nelle crepe di zolfo, carica di sostanze infiammabili.',
    color: '#ef4444',
    rarity: 'Raro',
    sellValue: 28
  },

  // --- TROFEI DI CREATURE E PELLI ---
  slime_gel: {
    id: 'slime_gel',
    name: 'Gel Silvano',
    icon: '🧪',
    category: 'trophy',
    desc: 'Materia gelatinosa pura raccolta dagli Slime del Bosco.',
    color: '#22c55e',
    rarity: 'Comune',
    sellValue: 6
  },
  ancient_bone: {
    id: 'ancient_bone',
    name: 'Osso Antico',
    icon: '🦴',
    category: 'trophy',
    desc: 'Resto pietrificato degli scheletri a guardia delle antiche rovine.',
    color: '#cbd5e1',
    rarity: 'Comune',
    sellValue: 8
  },
  beast_leather: {
    id: 'beast_leather',
    name: 'Pelle di Cuoio Lavorata',
    icon: '📜',
    category: 'trophy',
    desc: 'Pelli conciate resistenti usate per imbottire armature, impugnature e stivali.',
    color: '#854d0e',
    rarity: 'Comune',
    sellValue: 14
  },
  chitin_plate: {
    id: 'chitin_plate',
    name: 'Scaglia di Carapace',
    icon: '🛡️',
    category: 'trophy',
    desc: 'Guscio chitinoso ultrarigido rilasciato dai mostri delle dune e della caldera.',
    color: '#eab308',
    rarity: 'Non Comune',
    sellValue: 22
  },

  // --- GEMME, ESSENZE E CRISTALLI MAGICI ---
  arcane_dust: {
    id: 'arcane_dust',
    name: 'Polvere Arcana di Riciclo',
    icon: '✨',
    category: 'magical',
    desc: 'Polvere luccicante ottenuta dallo smantellamento di oggetti e materiali alla fucina.',
    color: '#c084fc',
    rarity: 'Comune',
    sellValue: 12
  },
  aether_shard: {
    id: 'aether_shard',
    name: 'Frammento d\'Aether Puro',
    icon: '💎',
    category: 'magical',
    desc: 'Scheggia primordiale di pura energia dimensionale caduta dai cieli dell\'Aether.',
    color: '#38bdf8',
    rarity: 'Raro',
    sellValue: 45
  },
  ice_crystal: {
    id: 'ice_crystal',
    name: 'Cristallo Gelido',
    icon: '❄️',
    category: 'magical',
    desc: 'Ghiaccio perenne non fondente che brilla sulle vette innevate.',
    color: '#38bdf8',
    rarity: 'Non Comune',
    sellValue: 20
  },
  sun_amber: {
    id: 'sun_amber',
    name: 'Ambra delle Sabbie',
    icon: '☀️',
    category: 'magical',
    desc: 'Gemma solare fossilizzata tra le dune ardenti del deserto.',
    color: '#f59e0b',
    rarity: 'Non Comune',
    sellValue: 24
  },
  magma_core: {
    id: 'magma_core',
    name: 'Nucleo di Lava',
    icon: '🔥',
    category: 'magical',
    desc: 'Frammento incandescente di roccia e fuoco elementale della caldera.',
    color: '#ef4444',
    rarity: 'Raro',
    sellValue: 35
  },
  arcane_rune: {
    id: 'arcane_rune',
    name: 'Runa Arcana Antica',
    icon: '🔮',
    category: 'magical',
    desc: 'Raro artefatto runico carico di antica magia elementale.',
    color: '#c084fc',
    rarity: 'Raro',
    sellValue: 60
  }
};

// =========================================================================
// 2. NODI DI RACCOLTA RISORSE NEL MONDO (Albion Online Style)
// =========================================================================
export const RESOURCE_NODES_DEF = {
  mining_copper: {
    id: 'mining_copper',
    name: 'Filone di Rame',
    category: 'mining',
    icon: '⛏️',
    spriteType: 'node_copper',
    color: '#f97316',
    harvestDuration: 1.2,
    respawnDuration: 45,
    xpReward: 16,
    drops: [
      { itemId: 'copper_ore', count: [2, 3], chance: 1.0 },
      { itemId: 'iron_scrap', count: [1, 1], chance: 0.25 }
    ]
  },
  mining_iron: {
    id: 'mining_iron',
    name: 'Filone di Ferro',
    category: 'mining',
    icon: '⛏️',
    spriteType: 'node_iron',
    color: '#94a3b8',
    harvestDuration: 1.4,
    respawnDuration: 50,
    xpReward: 22,
    drops: [
      { itemId: 'iron_ore', count: [2, 4], chance: 1.0 },
      { itemId: 'iron_scrap', count: [1, 2], chance: 0.35 }
    ]
  },
  mining_obsidian: {
    id: 'mining_obsidian',
    name: 'Giacimento d\'Ossidiana',
    category: 'mining',
    icon: '⛏️',
    spriteType: 'node_obsidian',
    color: '#a855f7',
    harvestDuration: 1.8,
    respawnDuration: 60,
    xpReward: 35,
    drops: [
      { itemId: 'obsidian_ore', count: [2, 3], chance: 1.0 },
      { itemId: 'magma_core', count: [1, 1], chance: 0.30 }
    ]
  },
  tree_ancient: {
    id: 'tree_ancient',
    name: 'Quercia Antica di Sylva',
    category: 'lumberjack',
    icon: '🪓',
    spriteType: 'tree',
    color: '#b45309',
    harvestDuration: 1.3,
    respawnDuration: 45,
    xpReward: 18,
    drops: [
      { itemId: 'ancient_wood', count: [2, 4], chance: 1.0 },
      { itemId: 'slime_gel', count: [1, 2], chance: 0.40 }
    ]
  },
  tree_frost: {
    id: 'tree_frost',
    name: 'Abete Glaciale',
    category: 'lumberjack',
    icon: '🪓',
    spriteType: 'pine',
    color: '#38bdf8',
    harvestDuration: 1.4,
    respawnDuration: 50,
    xpReward: 24,
    drops: [
      { itemId: 'frost_pine_wood', count: [2, 3], chance: 1.0 },
      { itemId: 'ice_crystal', count: [1, 1], chance: 0.35 }
    ]
  },
  plant_lotus: {
    id: 'plant_lotus',
    name: 'Loto delle Cascate',
    category: 'herbalism',
    icon: '🌿',
    spriteType: 'node_lotus',
    color: '#06b6d4',
    harvestDuration: 0.9,
    respawnDuration: 40,
    xpReward: 18,
    drops: [
      { itemId: 'life_lotus', count: [1, 2], chance: 1.0 },
      { itemId: 'river_fiber', count: [2, 3], chance: 0.80 }
    ]
  },
  plant_sun: {
    id: 'plant_sun',
    name: 'Spina Solare delle Dune',
    category: 'herbalism',
    icon: '🌿',
    spriteType: 'node_sun',
    color: '#f59e0b',
    harvestDuration: 1.0,
    respawnDuration: 45,
    xpReward: 20,
    drops: [
      { itemId: 'desert_hardwood', count: [2, 3], chance: 1.0 },
      { itemId: 'sun_amber', count: [1, 1], chance: 0.35 }
    ]
  },
  geode_aether: {
    id: 'geode_aether',
    name: 'Monolite d\'Aether',
    category: 'arcane',
    icon: '💎',
    spriteType: 'node_geode',
    color: '#38bdf8',
    harvestDuration: 1.6,
    respawnDuration: 65,
    xpReward: 40,
    drops: [
      { itemId: 'aether_shard', count: [2, 3], chance: 1.0 },
      { itemId: 'arcane_rune', count: [1, 1], chance: 0.40 }
    ]
  }
};

// =========================================================================
// 3. CATALOGO EQUIPAGGIAMENTO A SLOT & RARITÀ (Diablo Style)
// =========================================================================
export const EQUIPMENT_DEF = {
  // ==================== CORAZZE / TORACE (Armor) ====================
  armor_novice: {
    id: 'armor_novice',
    name: 'Giaco del Viandante',
    slot: 'armor',
    rarity: 'Comune',
    icon: '🥋',
    color: '#94a3b8',
    desc: 'Corpetto leggero in cuoio e fibre vegetali che assorbe i primi colpi.',
    stats: {
      bonusHp: 30,
      defense: 8
    },
    recipe: {
      gold: 50,
      materials: { beast_leather: 3, ancient_wood: 3 }
    },
    salvage: { gold: 20, materials: { arcane_dust: 2, beast_leather: 1 } }
  },
  armor_iron: {
    id: 'armor_iron',
    name: 'Corazza a Piastre d\'Acciaio',
    slot: 'armor',
    rarity: 'Non Comune',
    icon: '🛡️',
    color: '#22c55e',
    desc: 'Solida corazza militare forgiata con placche d\'acciaio temprato.',
    stats: {
      bonusHp: 65,
      defense: 20
    },
    recipe: {
      gold: 130,
      materials: { iron_scrap: 6, copper_bar: 4, beast_leather: 3 }
    },
    salvage: { gold: 50, materials: { arcane_dust: 4, iron_scrap: 2 } }
  },
  armor_frost: {
    id: 'armor_frost',
    name: 'Baluardo del Crio-Acciaio',
    slot: 'armor',
    rarity: 'Raro',
    icon: '❄️',
    color: '#38bdf8',
    desc: 'Forgiata a Frostpeak. L\'acciaio perenne ghiaccia gli attacchi nemici e dona rigenerazione costante.',
    stats: {
      bonusHp: 120,
      defense: 35,
      hpRegen: 1.8
    },
    recipe: {
      gold: 260,
      materials: { iron_scrap: 10, ice_crystal: 4, frost_pine_wood: 5 }
    },
    salvage: { gold: 100, materials: { arcane_dust: 6, ice_crystal: 2 } }
  },
  armor_volcano: {
    id: 'armor_volcano',
    name: 'Pettorale di Magma della Fenice',
    slot: 'armor',
    rarity: 'Epico',
    icon: '🔥',
    color: '#c084fc',
    desc: 'Irradia un calore infernale. Riflette 18 danni da scottatura a qualsiasi mostro ti colpisca.',
    stats: {
      bonusHp: 190,
      defense: 52,
      hpRegen: 3.2,
      thorns: 18
    },
    recipe: {
      gold: 440,
      materials: { obsidian_bar: 8, magma_core: 5, arcane_rune: 3 }
    },
    salvage: { gold: 160, materials: { arcane_dust: 10, magma_core: 2 } }
  },
  armor_aether: {
    id: 'armor_aether',
    name: 'Armatura Celestiale dell\'Aether',
    slot: 'armor',
    rarity: 'Leggendario',
    icon: '👑',
    color: '#f59e0b',
    desc: 'Artefatto divino forgiato nel cuore della Cittadella. Genera una barriera di luce che dimezza i danni subiti.',
    stats: {
      bonusHp: 300,
      defense: 80,
      hpRegen: 5.0,
      aetherShield: true
    },
    recipe: {
      gold: 750,
      materials: { obsidian_bar: 12, aether_shard: 8, arcane_rune: 6 }
    },
    salvage: { gold: 300, materials: { arcane_dust: 18, aether_shard: 4 } }
  },

  // ==================== ELMI / CORONE (Helmet) ====================
  helmet_cloth: {
    id: 'helmet_cloth',
    name: 'Cappuccio del Viandante',
    slot: 'helmet',
    rarity: 'Comune',
    icon: '🧢',
    color: '#94a3b8',
    desc: 'Tessuto traspirante in canapa fluviale che favorisce la concentrazione magica.',
    stats: {
      bonusHp: 15,
      cooldownReduction: 0.05
    },
    recipe: {
      gold: 40,
      materials: { river_fiber: 4, beast_leather: 2 }
    },
    salvage: { gold: 15, materials: { arcane_dust: 2 } }
  },
  helmet_iron: {
    id: 'helmet_iron',
    name: 'Celata di Ferro delle Guardie',
    slot: 'helmet',
    rarity: 'Non Comune',
    icon: '🪖',
    color: '#22c55e',
    desc: 'Protegge la testa con un robusto frontale forgiato a mano.',
    stats: {
      bonusHp: 35,
      defense: 10,
      cooldownReduction: 0.08
    },
    recipe: {
      gold: 110,
      materials: { iron_scrap: 5, ancient_bone: 4 }
    },
    salvage: { gold: 40, materials: { arcane_dust: 3, iron_scrap: 1 } }
  },
  helmet_sylva: {
    id: 'helmet_sylva',
    name: 'Corona delle Fronde di Sylva',
    slot: 'helmet',
    rarity: 'Raro',
    icon: '🌿',
    color: '#38bdf8',
    desc: 'Intrecciata con germogli dell\'Albero della Vita, amplifica l\'energia dei dardi e degli attacchi.',
    stats: {
      bonusHp: 60,
      cooldownReduction: 0.14,
      bonusDamage: 12
    },
    recipe: {
      gold: 220,
      materials: { ancient_wood: 8, slime_gel: 6, arcane_rune: 2 }
    },
    salvage: { gold: 80, materials: { arcane_dust: 5, arcane_rune: 1 } }
  },
  helmet_archmage: {
    id: 'helmet_archmage',
    name: 'Diadema dell\'Arcimago Ancestrale',
    slot: 'helmet',
    rarity: 'Epico',
    icon: '✨',
    color: '#c084fc',
    desc: 'Incastonato con gemme magiche purpuree. Riduce del 22% i tempi di ricarica di ogni incantesimo e arma.',
    stats: {
      bonusHp: 95,
      defense: 24,
      cooldownReduction: 0.22,
      bonusDamage: 24
    },
    recipe: {
      gold: 400,
      materials: { obsidian_bar: 6, sun_amber: 6, arcane_rune: 4 }
    },
    salvage: { gold: 150, materials: { arcane_dust: 8, sun_amber: 2 } }
  },
  helmet_titan: {
    id: 'helmet_titan',
    name: 'Corona d\'Oro del Colosso delle Dune',
    slot: 'helmet',
    rarity: 'Leggendario',
    icon: '☀️',
    color: '#f59e0b',
    desc: 'La sacra corona della Sfinge. Ricarica le abilità all\'istante (-30%) e scaglia archi voltaici sui nemici vicini.',
    stats: {
      bonusHp: 160,
      defense: 42,
      cooldownReduction: 0.30,
      bonusDamage: 38,
      chainLightning: true
    },
    recipe: {
      gold: 680,
      materials: { sun_amber: 10, obsidian_bar: 10, arcane_rune: 6 }
    },
    salvage: { gold: 260, materials: { arcane_dust: 16, obsidian_bar: 3 } }
  },

  // ==================== STIVALI / CALZARI (Boots) ====================
  boots_leather: {
    id: 'boots_leather',
    name: 'Stivali da Cacciatore',
    slot: 'boots',
    rarity: 'Comune',
    icon: '🥾',
    color: '#94a3b8',
    desc: 'Calzature da marcia in cuoio che aumentano la velocità di corsa.',
    stats: {
      speedMultiplier: 1.08,
      magnetMultiplier: 1.10
    },
    recipe: {
      gold: 45,
      materials: { beast_leather: 4, river_fiber: 2 }
    },
    salvage: { gold: 15, materials: { arcane_dust: 2 } }
  },
  boots_river: {
    id: 'boots_river',
    name: 'Calzari delle Maree Fluviali',
    slot: 'boots',
    rarity: 'Non Comune',
    icon: '🌊',
    color: '#22c55e',
    desc: 'Trattati con oli di loto, ti permettono di correre nei guadi e nell\'acqua senza subire alcun rallentamento!',
    stats: {
      speedMultiplier: 1.15,
      ignoreWaterSlow: true,
      bonusHp: 25
    },
    recipe: {
      gold: 120,
      materials: { river_fiber: 6, beast_leather: 4, copper_bar: 3 }
    },
    salvage: { gold: 45, materials: { arcane_dust: 3, copper_bar: 1 } }
  },
  boots_dune: {
    id: 'boots_dune',
    name: 'Schinieri del Predatore delle Dune',
    slot: 'boots',
    rarity: 'Raro',
    icon: '🏜️',
    color: '#38bdf8',
    desc: 'Scattanti e silenziosi: aumentano la velocità del 22% e conferiscono il 10% di schivata su ogni colpo subito.',
    stats: {
      speedMultiplier: 1.22,
      dodgeChance: 0.10,
      magnetMultiplier: 1.30
    },
    recipe: {
      gold: 240,
      materials: { sun_amber: 5, beast_leather: 6, ancient_bone: 5 }
    },
    salvage: { gold: 90, materials: { arcane_dust: 5, sun_amber: 1 } }
  },
  boots_hermes: {
    id: 'boots_hermes',
    name: 'Ali del Vento dell\'Aether',
    slot: 'boots',
    rarity: 'Leggendario',
    icon: '🪽',
    color: '#f59e0b',
    desc: 'L\'eroe fluttua sfiorando il suolo con il +35% di velocità, +20% di schivata e un raggio magnetico immenso.',
    stats: {
      speedMultiplier: 1.35,
      dodgeChance: 0.20,
      magnetMultiplier: 1.60,
      bonusHp: 65,
      ignoreWaterSlow: true
    },
    recipe: {
      gold: 620,
      materials: { arcane_rune: 6, aether_shard: 8, obsidian_bar: 6 }
    },
    salvage: { gold: 240, materials: { arcane_dust: 15, aether_shard: 3 } }
  },

  // ==================== AMULETI (Amulet) ====================
  amulet_copper: {
    id: 'amulet_copper',
    name: 'Talismano di Rame dell\'Esploratore',
    slot: 'amulet',
    rarity: 'Comune',
    icon: '📿',
    color: '#94a3b8',
    desc: 'Ciondolo porta-fortuna che incrementa l\'oro raccolto dai nemici e forzieri.',
    stats: {
      goldMultiplier: 1.15,
      critChance: 0.03
    },
    recipe: {
      gold: 60,
      materials: { copper_bar: 4, ancient_wood: 4 }
    },
    salvage: { gold: 20, materials: { arcane_dust: 2 } }
  },
  amulet_frost: {
    id: 'amulet_frost',
    name: 'Pendente del Cristallo Glaciale',
    slot: 'amulet',
    rarity: 'Raro',
    icon: '💎',
    color: '#38bdf8',
    desc: 'Sintonizza la vista del mago per individuare i punti deboli: +8% colpo critico e +14 danno bonus.',
    stats: {
      goldMultiplier: 1.25,
      critChance: 0.08,
      bonusDamage: 14
    },
    recipe: {
      gold: 210,
      materials: { ice_crystal: 5, copper_bar: 5, arcane_rune: 2 }
    },
    salvage: { gold: 75, materials: { arcane_dust: 5, ice_crystal: 1 } }
  },
  amulet_dragon: {
    id: 'amulet_dragon',
    name: 'Cuore del Drago di Magma',
    slot: 'amulet',
    rarity: 'Epico',
    icon: '🐉',
    color: '#c084fc',
    desc: 'La furia ardente del vulcano: +15% probabilità di colpo critico e moltiplicatore danno critico portato a 2.2x!',
    stats: {
      bonusDamage: 30,
      critChance: 0.15,
      critMultiplier: 2.2,
      hpRegen: 2.2
    },
    recipe: {
      gold: 420,
      materials: { magma_core: 6, obsidian_bar: 6, arcane_rune: 4 }
    },
    salvage: { gold: 160, materials: { arcane_dust: 9, magma_core: 2 } }
  },
  amulet_star: {
    id: 'amulet_star',
    name: 'Occhio dell\'Infinito Aether',
    slot: 'amulet',
    rarity: 'Leggendario',
    icon: '🔮',
    color: '#f59e0b',
    desc: 'Il leggendario talismano dei Fondatori: +25% critico, +50% oro e trasforma il 9% dei danni inflitti in guarigione immediata (Furto Vitale)!',
    stats: {
      bonusDamage: 48,
      critChance: 0.25,
      critMultiplier: 2.5,
      goldMultiplier: 1.50,
      lifeSteal: 0.09
    },
    recipe: {
      gold: 720,
      materials: { aether_shard: 10, arcane_rune: 7, magma_core: 6 }
    },
    salvage: { gold: 280, materials: { arcane_dust: 18, aether_shard: 4 } }
  },

  // ==================== ANELLI (Ring) ====================
  ring_iron: {
    id: 'ring_iron',
    name: 'Fede di Ferro da Battaglia',
    slot: 'ring',
    rarity: 'Comune',
    icon: '💍',
    color: '#94a3b8',
    desc: 'Semplice fascia d\'acciaio incisa con rune marziali per rinforzare i colpi.',
    stats: {
      bonusDamage: 8,
      defense: 5
    },
    recipe: {
      gold: 50,
      materials: { iron_scrap: 4, copper_bar: 2 }
    },
    salvage: { gold: 18, materials: { arcane_dust: 2 } }
  },
  ring_amber: {
    id: 'ring_amber',
    name: 'Anello del Sole d\'Oriente',
    slot: 'ring',
    rarity: 'Non Comune',
    icon: '🔶',
    color: '#22c55e',
    desc: 'L\'ambra solare incanalata nell\'anello velocizza i riflessi e l\'attacco del +10%.',
    stats: {
      bonusDamage: 16,
      attackSpeed: 0.10
    },
    recipe: {
      gold: 130,
      materials: { sun_amber: 4, iron_scrap: 4 }
    },
    salvage: { gold: 45, materials: { arcane_dust: 3, sun_amber: 1 } }
  },
  ring_golem: {
    id: 'ring_golem',
    name: 'Sigillo del Signore del Gelo',
    slot: 'ring',
    rarity: 'Raro',
    icon: '💠',
    color: '#38bdf8',
    desc: 'I tuoi attacchi avvolgono i nemici in un gelo penetrante, rallentandoli del 35% per 1.5 secondi.',
    stats: {
      bonusDamage: 25,
      defense: 12,
      slowEnemiesOnHit: 0.35
    },
    recipe: {
      gold: 260,
      materials: { ice_crystal: 6, obsidian_bar: 4, arcane_rune: 2 }
    },
    salvage: { gold: 95, materials: { arcane_dust: 6, ice_crystal: 2 } }
  },
  ring_infernal: {
    id: 'ring_infernal',
    name: 'Fede dell\'Apocalisse Vulcanica',
    slot: 'ring',
    rarity: 'Epico',
    icon: '🌋',
    color: '#c084fc',
    desc: 'I mostri sconfitti esplodono in fiamme incandescenti, infliggendo 35 danni ad area a tutti i mostri adiacenti.',
    stats: {
      bonusDamage: 40,
      attackSpeed: 0.18,
      explosionOnKill: 35
    },
    recipe: {
      gold: 450,
      materials: { magma_core: 6, obsidian_bar: 8, arcane_rune: 4 }
    },
    salvage: { gold: 170, materials: { arcane_dust: 10, magma_core: 2 } }
  },
  ring_eternal: {
    id: 'ring_eternal',
    name: 'Anello dell\'Immortalità di Thorgar',
    slot: 'ring',
    rarity: 'Leggendario',
    icon: '💍',
    color: '#f59e0b',
    desc: 'Il capolavoro supremo forgiato dal Gran Fabbro Reale. Conferisce vigore sovrumano (+80 HP, +58 Danno, +28 Difesa e rigenerazione perenne).',
    stats: {
      bonusDamage: 58,
      defense: 28,
      attackSpeed: 0.25,
      bonusHp: 80,
      hpRegen: 3.5
    },
    recipe: {
      gold: 780,
      materials: { aether_shard: 10, obsidian_bar: 10, arcane_rune: 8 }
    },
    salvage: { gold: 300, materials: { arcane_dust: 20, obsidian_bar: 4 } }
  }
};

// =========================================================================
// 4. RICETTE DI RAFFINAZIONE RISORSE (Albion Online Style)
// =========================================================================
export const REFINING_RECIPES = [
  {
    id: 'refine_copper',
    name: 'Fondi Lingotto di Bronzo Antico',
    category: 'smelting',
    icon: '🧱',
    cost: { gold: 20, materials: { copper_ore: 3 } },
    output: { itemId: 'copper_bar', count: 1 },
    desc: 'Fondi 3x Minerale di Rame grezzo alla fonderia per ottenere 1x Lingotto di Bronzo Antico.'
  },
  {
    id: 'refine_iron',
    name: 'Forgia Metallo Temprato',
    category: 'smelting',
    icon: '⚙️',
    cost: { gold: 30, materials: { iron_ore: 3 } },
    output: { itemId: 'iron_scrap', count: 1 },
    desc: 'Purifica 3x Minerale di Ferro grezzo per ottenere 1x Metallo Temprato d\'acciaio.'
  },
  {
    id: 'refine_obsidian',
    name: 'Fondi Lingotto d\'Ossidiana',
    category: 'smelting',
    icon: '🔮',
    cost: { gold: 60, materials: { obsidian_ore: 3 } },
    output: { itemId: 'obsidian_bar', count: 1 },
    desc: 'Lavora 3x Ossidiana Vulcanica nel crogiolo per ottenere 1x Lingotto d\'Ossidiana temprata.'
  },
  {
    id: 'refine_leather',
    name: 'Concia Cuoio Lavorato',
    category: 'tanning',
    icon: '📜',
    cost: { gold: 25, materials: { ancient_wood: 3, river_fiber: 2 } },
    output: { itemId: 'beast_leather', count: 1 },
    desc: 'Tratta le fibre e i tannini di legno antico per confezionare 1x Pelle di Cuoio flessibile.'
  },
  {
    id: 'refine_rune',
    name: 'Sintetizza Runa Arcana',
    category: 'alchemy',
    icon: '🔮',
    cost: { gold: 90, materials: { aether_shard: 3, life_lotus: 1 } },
    output: { itemId: 'arcane_rune', count: 1 },
    desc: 'Incapsula il potere di 3x Frammenti d\'Aether e 1x Loto Vitale per sintetizzare 1x Runa Arcana.'
  }
];

// =========================================================================
// 5. DEFINIZIONE DELLE ARMI ORIGINALI E POTENZIAMENTI
// =========================================================================
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
