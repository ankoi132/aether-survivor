/**
 * world/world.js - Grande Mappa Finita Espansa (7700x7700 px, R=120 tile)
 * - 6 Città e Villaggi Fortificati con Safe Zone protette (nessun mob spawna o può entrare!)
 * - Rete organica di Strade Principali, Sentieri e Ponti di legno
 * - Nuovo Bioma del Fiume con zone d'acqua bassa (guadi) attraversabili a piedi
 * - Borgo delle Cascate arroccato su una scogliera fluviale con mulino ad acqua
 * - Transizioni dei biomi organiche e sfumate con noise multi-ottava
 */
import { Tiles } from './tiles.js';
import { Sprites } from '../core/sprites.js';
import { ResourceNode } from '../entities/resource_node.js';

export const SETTLEMENTS = [
  {
    id: 'citadel',
    name: "Cittadella dell'Aether",
    title: "Capitale Elementale",
    type: 'capital',
    centerTx: 0,
    centerTy: 0,
    radiusTiles: 13, // ~416px raggio di protezione
    color: '#38bdf8',
    waypoint: { tx: -1, ty: 1 },
    blacksmith: {
      id: 'bs_citadel',
      name: 'Mastro Thorgar',
      title: 'Gran Fabbro Reale',
      quote: 'Salute, eroe dell\'Aether! La mia forgia arde col fuoco sacro. Portami acciaio e rune e plasmerò per te armi degne di un re!',
      tx: 5,
      ty: 4
    },
    buildings: [
      { type: 'aether_obelisk', tx: 0, ty: -3, wTiles: 2, hTiles: 4, name: "Obelisco dell'Aether" },
      { type: 'house_blue', tx: -8, ty: -7, wTiles: 4, hTiles: 3, name: 'Torre dell\'Arcimago' },
      { type: 'house_red', tx: 4, ty: -7, wTiles: 4, hTiles: 3, name: 'Taverna della Corona' },
      { type: 'fountain', tx: -4, ty: 3, wTiles: 3, hTiles: 2, name: 'Fontana delle Stelle' },
      { type: 'house_blue', tx: -8, ty: 3, wTiles: 4, hTiles: 3, name: 'Bottega degli Elisir' }
    ],
    props: [
      { type: 'waypoint_portal', tx: -1, ty: 1 },
      { type: 'blacksmith_npc', tx: 5, ty: 4 },
      { type: 'well', tx: 0, ty: 5 },
      { type: 'lamppost', tx: -3, ty: -2 },
      { type: 'lamppost', tx: 3, ty: -2 },
      { type: 'lamppost', tx: -3, ty: 3 },
      { type: 'lamppost', tx: 3, ty: 3 }
    ]
  },
  {
    id: 'waterfall_village',
    name: "Borgo delle Cascate",
    title: "Villaggio del Fiume & Mulino",
    type: 'river_town',
    centerTx: -40,
    centerTy: 22,
    radiusTiles: 12,
    color: '#06b6d4',
    waypoint: { tx: -38, ty: 22 },
    blacksmith: {
      id: 'bs_waterfall',
      name: 'Mastro Finn',
      title: 'Fabbro delle Maree',
      quote: 'L\'acqua gelida della cascata tempra l\'acciaio meglio di qualsiasi olio! Fammi vedere che rottami hai raccolto lungo il fiume!',
      tx: -35,
      ty: 24
    },
    buildings: [
      { type: 'water_mill', tx: -42, ty: 25, wTiles: 4, hTiles: 3, name: 'Mulino della Cascata' },
      { type: 'house_blue', tx: -45, ty: 17, wTiles: 4, hTiles: 3, name: 'Locanda dei Pescatori' },
      { type: 'house_red', tx: -36, ty: 17, wTiles: 4, hTiles: 3, name: 'Bottega delle Reti' }
    ],
    props: [
      { type: 'waypoint_portal', tx: -38, ty: 22 },
      { type: 'blacksmith_npc', tx: -35, ty: 24 },
      { type: 'well', tx: -40, ty: 20 },
      { type: 'lamppost', tx: -43, ty: 21 },
      { type: 'lamppost', tx: -37, ty: 21 },
      { type: 'lamppost', tx: -40, ty: 26 }
    ]
  },
  {
    id: 'frostpeak',
    name: "Avamposto di Frostpeak",
    title: "Rifugio delle Vette Innevate",
    type: 'snow_outpost',
    centerTx: 20,
    centerTy: -75,
    radiusTiles: 11,
    color: '#7dd3fc',
    waypoint: { tx: 20, ty: -73 },
    blacksmith: {
      id: 'bs_frostpeak',
      name: 'Mastra Astrid',
      title: 'Forgiatrice dei Ghiacci',
      quote: 'Il permafrost spezza le lame fragili. Qui tempreremo le tue armi col crio-acciaio delle vette montane!',
      tx: 23,
      ty: -73
    },
    buildings: [
      { type: 'cabin_snow', tx: 15, ty: -80, wTiles: 4, hTiles: 3, name: 'Rifugio del Permafrost' },
      { type: 'cabin_snow', tx: 23, ty: -80, wTiles: 4, hTiles: 3, name: 'Osservatorio del Nord' }
    ],
    props: [
      { type: 'waypoint_portal', tx: 20, ty: -73 },
      { type: 'blacksmith_npc', tx: 23, ty: -73 },
      { type: 'brazier_fire', tx: 18, ty: -74 },
      { type: 'brazier_fire', tx: 22, ty: -74 },
      { type: 'well', tx: 20, ty: -76 }
    ]
  },
  {
    id: 'oasis',
    name: "Oasi di Al-Zahir",
    title: "Carovana delle Dune",
    type: 'desert_oasis',
    centerTx: -70,
    centerTy: 65,
    radiusTiles: 11,
    color: '#f59e0b',
    waypoint: { tx: -70, ty: 63 },
    blacksmith: {
      id: 'bs_oasis',
      name: 'Mastro Rashid',
      title: 'Armaiolo delle Sabbie',
      quote: 'Pace su di te, viaggiatore delle dune! Il sole ardente forgia le armi più flessibili e micidiali. Cosa creiamo oggi?',
      tx: -66,
      ty: 66
    },
    buildings: [
      { type: 'tent_desert', tx: -75, ty: 60, wTiles: 4, hTiles: 3, name: 'Padiglione del Sultano' },
      { type: 'tent_desert', tx: -66, ty: 60, wTiles: 4, hTiles: 3, name: 'Bazaar delle Dune' }
    ],
    props: [
      { type: 'waypoint_portal', tx: -70, ty: 63 },
      { type: 'blacksmith_npc', tx: -66, ty: 66 },
      { type: 'palm_tree', tx: -73, ty: 64 },
      { type: 'palm_tree', tx: -67, ty: 64 },
      { type: 'palm_tree', tx: -71, ty: 67 },
      { type: 'well', tx: -70, ty: 65 }
    ]
  },
  {
    id: 'cineris',
    name: "Rocca di Cineris",
    title: "Fortezza del Fuoco",
    type: 'volcano_fort',
    centerTx: 70,
    centerTy: 45,
    radiusTiles: 11,
    color: '#ef4444',
    waypoint: { tx: 70, ty: 43 },
    blacksmith: {
      id: 'bs_cineris',
      name: 'Mastro Ignis',
      title: 'Fabbro di Magma',
      quote: 'Solo chi sopporta il calore dell\'inferno merita una lama di vero magma! Mostrami i tuoi nuclei ardenti!',
      tx: 74,
      ty: 46
    },
    buildings: [
      { type: 'fort_volcano', tx: 66, ty: 40, wTiles: 4, hTiles: 4, name: 'Bastione di Basalto' },
      { type: 'house_red', tx: 73, ty: 40, wTiles: 4, hTiles: 3, name: 'Caserma delle Ceneri' }
    ],
    props: [
      { type: 'waypoint_portal', tx: 70, ty: 43 },
      { type: 'blacksmith_npc', tx: 74, ty: 46 },
      { type: 'brazier_fire', tx: 67, ty: 45 },
      { type: 'brazier_fire', tx: 73, ty: 45 },
      { type: 'well', tx: 70, ty: 46 }
    ]
  },
  {
    id: 'sylva',
    name: "Borgo di Sylva",
    title: "Santuario Silvano",
    type: 'forest_haven',
    centerTx: -75,
    centerTy: -35,
    radiusTiles: 11,
    color: '#22c55e',
    waypoint: { tx: -75, ty: -33 },
    blacksmith: {
      id: 'bs_sylva',
      name: 'Mastra Elora',
      title: 'Artigiana delle Fronde',
      quote: 'Gli alberi sussurrano i segreti della terra. Posso fondere la resina d\'ambra e il metallo per darti archi e bastoni ineguagliabili.',
      tx: -71,
      ty: -34
    },
    buildings: [
      { type: 'cabin_wood', tx: -80, ty: -40, wTiles: 4, hTiles: 3, name: 'Santuario della Quercia' },
      { type: 'cabin_wood', tx: -72, ty: -40, wTiles: 4, hTiles: 3, name: 'Erboristeria di Sylva' }
    ],
    props: [
      { type: 'waypoint_portal', tx: -75, ty: -33 },
      { type: 'blacksmith_npc', tx: -71, ty: -34 },
      { type: 'glowing_mushrooms', tx: -77, ty: -34 },
      { type: 'glowing_mushrooms', tx: -73, ty: -36 },
      { type: 'well', tx: -75, ty: -35 }
    ]
  }
];

// PUNTI D'INTERESSE SPECIALI: Boss con Forzieri e Misteri
export const POINTS_OF_INTEREST = [
  {
    id: 'boss_forest',
    type: 'boss',
    name: 'Radura del Treant Ancestrale',
    title: 'Custode delle Radici',
    biome: 'forest',
    tx: -95,
    ty: -85,
    bossKind: 'boss_treant',
    chestId: 'chest_forest',
    chestName: 'Forziere di Smeraldo Antico',
    color: '#22c55e',
    icon: '👑',
    loot: { gold: 220, xp: 180, items: { slime_gel: 4, iron_scrap: 3, arcane_rune: 2 } }
  },
  {
    id: 'boss_snow',
    type: 'boss',
    name: 'Trono del Golem Glaciale',
    title: 'Signore del Permafrost',
    biome: 'snow',
    tx: 25,
    ty: -110,
    bossKind: 'boss_golem',
    chestId: 'chest_snow',
    chestName: 'Forziere di Cristallo Perenne',
    color: '#7dd3fc',
    icon: '👑',
    loot: { gold: 300, xp: 220, items: { ice_crystal: 4, iron_scrap: 3, arcane_rune: 2 } }
  },
  {
    id: 'boss_desert',
    type: 'boss',
    name: 'Tempio del Colosso delle Dune',
    title: 'Flagello delle Sabbie',
    biome: 'desert',
    tx: -105,
    ty: 98,
    bossKind: 'boss_scorpion',
    chestId: 'chest_desert',
    chestName: 'Forziere d\'Oro della Sfinge',
    color: '#f59e0b',
    icon: '👑',
    loot: { gold: 350, xp: 260, items: { sun_amber: 5, iron_scrap: 4, arcane_rune: 2 } }
  },
  {
    id: 'boss_volcano',
    type: 'boss',
    name: 'Cratere del Titano di Magma',
    title: 'Incarnazione del Fuoco',
    biome: 'volcano',
    tx: 102,
    ty: 86,
    bossKind: 'boss_magma',
    chestId: 'chest_volcano',
    chestName: 'Forziere di Ossidiana Vulcanica',
    color: '#ef4444',
    icon: '👑',
    loot: { gold: 450, xp: 320, items: { magma_core: 5, iron_scrap: 4, arcane_rune: 3 } }
  },
  {
    id: 'mystery_waterfall',
    type: 'mystery',
    name: 'Grotta Segreta delle Cascate',
    title: 'Enigma delle Tre Rune',
    biome: 'river',
    tx: -52,
    ty: 22,
    chestId: 'chest_waterfall',
    chestName: 'Forziere Sommerso delle Cascate',
    color: '#06b6d4',
    icon: '🔮',
    loot: { gold: 400, xp: 300, items: { arcane_rune: 3, ice_crystal: 4, slime_gel: 4 } }
  }
];

// Strade Maestre Lastricate che collegano le città con curve organiche
export const ROAD_SEGMENTS = [
  // 1. Strada Imperiale del Nord: Cittadella -> Valico dei Monti -> Frostpeak
  { x1: 0, y1: 0, x2: 8, y2: -35 },
  { x1: 8, y1: -35, x2: 20, y2: -75 },

  // 2. Via Fluviale dell'Ovest: Cittadella -> Ponte dell'Aether -> Borgo delle Cascate
  { x1: 0, y1: 0, x2: -20, y2: 10 },
  { x1: -20, y1: 10, x2: -40, y2: 22 },

  // 3. Via delle Ceneri (Est): Cittadella -> Gola di Zolfo -> Rocca di Cineris
  { x1: 0, y1: 0, x2: 35, y2: 20 },
  { x1: 35, y1: 20, x2: 70, y2: 45 },

  // 4. Pista Carovaniera di Al-Zahir: Cittadella -> Dune Basse -> Oasi di Al-Zahir
  { x1: 0, y1: 0, x2: -35, y2: 35 },
  { x1: -35, y1: 35, x2: -70, y2: 65 },

  // 5. Cammino Silvano: Cittadella -> Radura di Mezzo -> Borgo di Sylva
  { x1: 0, y1: 0, x2: -35, y2: -18 },
  { x1: -35, y1: -18, x2: -75, y2: -35 },

  // 6. Raccordo Borgo delle Cascate <-> Oasi di Al-Zahir
  { x1: -40, y1: 22, x2: -55, y2: 45 },
  { x1: -55, y1: 45, x2: -70, y2: 65 },

  // 7. Raccordo Borgo delle Cascate <-> Borgo di Sylva
  { x1: -40, y1: 22, x2: -58, y2: -8 },
  { x1: -58, y1: -8, x2: -75, y2: -35 }
];

// Sentieri Selvaggi dei Biomi e Vie dei Boss / Misteri (Terra battuta e ghiaia)
export const TRAIL_SEGMENTS = [
  // Sentiero 1: Sylva -> Radura del Treant Ancestrale (Boss Bosco)
  { x1: -75, y1: -35, x2: -86, y2: -60 },
  { x1: -86, y1: -60, x2: -95, y2: -85 },

  // Sentiero 2: Frostpeak -> Trono del Golem dei Ghiacci (Boss Montagne)
  { x1: 20, y1: -75, x2: 22, y2: -92 },
  { x1: 22, y1: -92, x2: 25, y2: -110 },

  // Sentiero 3: Al-Zahir -> Tempio della Sfinge (Boss Deserto)
  { x1: -70, y1: 65, x2: -88, y2: 82 },
  { x1: -88, y1: 82, x2: -105, y2: 98 },

  // Sentiero 4: Cineris -> Cratere del Titano di Magma (Boss Vulcano)
  { x1: 70, y1: 45, x2: 86, y2: 65 },
  { x1: 86, y1: 65, x2: 102, y2: 86 },

  // Sentiero 5: Borgo delle Cascate -> Grotta del Mistero sotto la Cascata
  { x1: -40, y1: 22, x2: -46, y2: 22 },
  { x1: -46, y1: 22, x2: -52, y2: 22 },

  // Sentieri di raccordo trasversale tra biomi:
  // Frostpeak -> Passaggio Orientale verso Cineris
  { x1: 20, y1: -75, x2: 50, y2: -20 },
  { x1: 50, y1: -20, x2: 70, y2: 45 },

  // Sylva -> Alture di Frostpeak
  { x1: -75, y1: -35, x2: -30, y2: -55 },
  { x1: -30, y1: -55, x2: 20, y2: -75 }
];

// =========================================================================
// DISTRIBUZIONE DETERMINISTICA DEI NODI DI RACCOLTA (Albion Online Style)
// =========================================================================
export const RESOURCE_SPOTS = [
  // --- BOSCO DI SYLVA (Rame, Querce Antiche, Geodi Arcani) ---
  { type: 'mining_copper', tx: -50, ty: -20 },
  { type: 'mining_copper', tx: -65, ty: -48 },
  { type: 'mining_copper', tx: -82, ty: -25 },
  { type: 'mining_copper', tx: -30, ty: -46 },
  { type: 'mining_copper', tx: -15, ty: -35 },
  { type: 'mining_copper', tx: -45, ty: -68 },
  { type: 'mining_copper', tx: -10, ty: -20 },
  { type: 'mining_copper', tx: 8, ty: -28 },

  { type: 'tree_ancient', tx: -86, ty: -52 },
  { type: 'tree_ancient', tx: -72, ty: -22 },
  { type: 'tree_ancient', tx: -62, ty: -58 },
  { type: 'tree_ancient', tx: -42, ty: -42 },
  { type: 'tree_ancient', tx: -28, ty: -62 },
  { type: 'tree_ancient', tx: -92, ty: -34 },
  { type: 'tree_ancient', tx: -18, ty: -48 },

  // --- BIOMA DEL FIUME & CASCATE (Loto delle Ninfee, Rame Fluviale) ---
  { type: 'plant_lotus', tx: -44, ty: 15 },
  { type: 'plant_lotus', tx: -34, ty: 18 },
  { type: 'plant_lotus', tx: -42, ty: 30 },
  { type: 'plant_lotus', tx: -52, ty: 26 },
  { type: 'plant_lotus', tx: -32, ty: 28 },
  { type: 'plant_lotus', tx: -24, ty: 12 },
  { type: 'plant_lotus', tx: -56, ty: 34 },
  { type: 'mining_copper', tx: -38, ty: 36 },
  { type: 'mining_copper', tx: -48, ty: 12 },
  { type: 'mining_copper', tx: -28, ty: 32 },

  // --- VETTE DI FROSTPEAK (Ferro Montano, Abeti del Permafrost) ---
  { type: 'mining_iron', tx: 14, ty: -62 },
  { type: 'mining_iron', tx: 32, ty: -68 },
  { type: 'mining_iron', tx: 10, ty: -84 },
  { type: 'mining_iron', tx: 26, ty: -92 },
  { type: 'mining_iron', tx: 36, ty: -54 },
  { type: 'mining_iron', tx: 6, ty: -74 },
  { type: 'mining_iron', tx: 42, ty: -78 },

  { type: 'tree_frost', tx: 16, ty: -70 },
  { type: 'tree_frost', tx: 28, ty: -84 },
  { type: 'tree_frost', tx: 8, ty: -66 },
  { type: 'tree_frost', tx: 24, ty: -96 },
  { type: 'tree_frost', tx: 34, ty: -64 },
  { type: 'tree_frost', tx: 12, ty: -86 },

  // --- DESERTO DI AL-ZAHIR (Spine Solari, Minerale Ferroso delle Sabbie) ---
  { type: 'mining_iron', tx: -58, ty: 54 },
  { type: 'mining_iron', tx: -76, ty: 74 },
  { type: 'mining_iron', tx: -48, ty: 68 },
  { type: 'mining_iron', tx: -82, ty: 48 },
  { type: 'mining_iron', tx: -64, ty: 82 },
  { type: 'mining_iron', tx: -54, ty: 62 },

  { type: 'plant_sun', tx: -74, ty: 56 },
  { type: 'plant_sun', tx: -66, ty: 74 },
  { type: 'plant_sun', tx: -56, ty: 66 },
  { type: 'plant_sun', tx: -84, ty: 64 },
  { type: 'plant_sun', tx: -60, ty: 80 },
  { type: 'plant_sun', tx: -78, ty: 50 },

  // --- ZONA VULCANICA DI CINERIS (Giacimenti d'Ossidiana, Ferro Vulcanico) ---
  { type: 'mining_obsidian', tx: 58, ty: 34 },
  { type: 'mining_obsidian', tx: 76, ty: 56 },
  { type: 'mining_obsidian', tx: 82, ty: 38 },
  { type: 'mining_obsidian', tx: 64, ty: 54 },
  { type: 'mining_obsidian', tx: 54, ty: 44 },
  { type: 'mining_obsidian', tx: 86, ty: 28 },
  { type: 'mining_obsidian', tx: 72, ty: 62 },
  { type: 'mining_obsidian', tx: 92, ty: 52 },
  { type: 'mining_iron', tx: 52, ty: 28 },
  { type: 'mining_iron', tx: 60, ty: 48 },
  { type: 'mining_iron', tx: 80, ty: 46 },

  // --- GEODI D'AETHER (Filoni Arcani presso rovine e crocevia) ---
  { type: 'geode_aether', tx: 2, ty: -24 },
  { type: 'geode_aether', tx: -16, ty: 16 },
  { type: 'geode_aether', tx: 22, ty: 22 },
  { type: 'geode_aether', tx: -22, ty: -16 },
  { type: 'geode_aether', tx: 12, ty: -46 },
  { type: 'geode_aether', tx: -52, ty: -6 },
  { type: 'geode_aether', tx: 46, ty: -22 },
  { type: 'geode_aether', tx: 36, ty: 36 },
  { type: 'geode_aether', tx: -72, ty: 12 },
  { type: 'geode_aether', tx: 72, ty: 14 }
];

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}

export class World {
  constructor(seed = 2026) {
    this.seed = seed;
    this.T = Tiles.T;               // 16 px base
    this.PX = Sprites.PX;           // Scala 2x
    this.TS = this.T * this.PX;     // 32 px nel mondo
    this.N = 16;                    // 16 tile per chunk
    this.CW = this.N * this.TS;     // 512 px per chunk

    // Tipi di tile
    this.TILE_FLOOR = 0;
    this.TILE_WALL = 1;
    this.TILE_WATER = 2;            // Acqua profonda / lava profonda
    this.TILE_TREE = 3;             // Quercia verde (Bosco)
    this.TILE_ROCK = 4;             // Roccia d'ardesia
    this.TILE_PINE = 5;             // Abete innevato (Montagne / Neve)
    this.TILE_CACTUS = 6;           // Cactus Saguaro (Deserto)
    this.TILE_VOLCANO_ROCK = 7;     // Roccia magmatica con crepe incandescenti (Vulcano)
    this.TILE_SAND_ROCK = 8;        // Roccia d'arenaria (Deserto)
    this.TILE_BRIDGE = 9;           // Ponte in legno attraversabile
    this.TILE_SHALLOW_WATER = 10;   // Guado / acqua bassa attraversabile a piedi
    this.TILE_ROAD = 11;            // Strada battuta / lastricata
    this.TILE_TRAIL = 12;           // Sentiero selvaggio di terra e ghiaia (connette i biomi e porta ai boss)

    // Limiti della Grande Mappa Finita (241x241 tile = 7712x7712 px)
    this.MAP_RADIUS = 120;
    this.minTile = -this.MAP_RADIUS;
    this.maxTile = this.MAP_RADIUS;
    this.minX = (this.minTile + 2) * this.TS;
    this.maxX = (this.maxTile - 2) * this.TS;
    this.minY = (this.minTile + 2) * this.TS;
    this.maxY = (this.maxTile - 2) * this.TS;

    this.chunkCanvases = new Map();
    this.chunkProps = new Map();

    // Inizializza i nodi fisici di raccolta del mondo
    this.resourceNodes = RESOURCE_SPOTS.map(spot => {
      const wx = spot.tx * this.TS + this.TS / 2;
      const wy = spot.ty * this.TS + this.TS / 2;
      return new ResourceNode(wx, wy, spot.type);
    });
  }

  /**
   * Restituisce il nodo risorsa più vicino e interagibile
   */
  getNearbyResourceNode(playerX, playerY, maxDist = 75) {
    let nearest = null;
    let minDist = maxDist;
    for (const node of this.resourceNodes) {
      if (node.state === 'depleted') continue;
      const d = Math.hypot(node.x - playerX, node.y - playerY);
      if (d <= minDist) {
        minDist = d;
        nearest = node;
      }
    }
    return nearest;
  }

  /**
   * Cerca un nodo risorsa cliccato alle coordinate del mondo
   */
  getResourceNodeAt(worldX, worldY, padding = 24) {
    for (const node of this.resourceNodes) {
      if (node.hitTest(worldX, worldY, padding)) {
        return node;
      }
    }
    return null;
  }

  /**
   * Aggiorna lo stato di tutti i nodi di risorsa (canalizzazione, respawn)
   */
  updateResourceNodes(dt, player, combat) {
    for (const node of this.resourceNodes) {
      node.update(dt, player, combat);
    }
  }

  hash2D(x, y, s = 0) {
    let h = (x * 374761393 + y * 668265263 + (this.seed + s) * 1442695040888963407) ^ 0x5bf03635;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  tileOf(worldCoord) {
    return Math.floor(worldCoord / this.TS);
  }

  /**
   * Verifica se una coordinata si trova all'interno di una Safe Zone protetta
   */
  isSafeZone(worldX, worldY) {
    for (const s of SETTLEMENTS) {
      const sx = s.centerTx * this.TS;
      const sy = s.centerTy * this.TS;
      const r = s.radiusTiles * this.TS;
      if (Math.hypot(worldX - sx, worldY - sy) <= r) {
        return true;
      }
    }
    return false;
  }

  getSafeZone(worldX, worldY) {
    for (const s of SETTLEMENTS) {
      const sx = s.centerTx * this.TS;
      const sy = s.centerTy * this.TS;
      const r = s.radiusTiles * this.TS;
      if (Math.hypot(worldX - sx, worldY - sy) <= r) {
        return s;
      }
    }
    return null;
  }

  /**
   * Calcola la posizione centrale del grande Fiume serpeggiante ad una data Y
   */
  getRiverCenterX(ty) {
    return Math.sin(ty * 0.038) * 44 - 18 + Math.cos(ty * 0.08) * 9;
  }

  /**
   * Verifica se un tile fa parte di una strada maestra lastricata
   */
  isRoad(tx, ty) {
    for (const seg of ROAD_SEGMENTS) {
      const d = distToSegment(tx, ty, seg.x1, seg.y1, seg.x2, seg.y2);
      if (d <= 1.45) {
        return true;
      }
    }
    return false;
  }

  /**
   * Verifica se un tile fa parte di un sentiero selvaggio di terra e ghiaia
   */
  isTrail(tx, ty) {
    for (const seg of TRAIL_SEGMENTS) {
      const d = distToSegment(tx, ty, seg.x1, seg.y1, seg.x2, seg.y2);
      if (d <= 1.25) {
        return true;
      }
    }
    return false;
  }

  /**
   * Cerca l'NPC Fabbro più vicino entro un dato raggio dal giocatore
   */
  getNearbyBlacksmith(playerX, playerY, maxDist = 75) {
    for (const s of SETTLEMENTS) {
      if (!s.blacksmith) continue;
      const bx = s.blacksmith.tx * this.TS + this.TS / 2;
      const by = s.blacksmith.ty * this.TS + this.TS;
      if (Math.hypot(playerX - bx, playerY - by) <= maxDist) {
        return {
          ...s.blacksmith,
          settlementName: s.name,
          settlementId: s.id,
          settlementColor: s.color,
          worldX: bx,
          worldY: by
        };
      }
    }
    return null;
  }

  /**
   * Cerca il Portale di Teletrasporto / Waypoint dell'Aether più vicino entro un dato raggio dal giocatore
   */
  getNearbyWaypoint(playerX, playerY, maxDist = 85) {
    for (const s of SETTLEMENTS) {
      if (!s.waypoint) continue;
      const wx = s.waypoint.tx * this.TS + this.TS / 2;
      const wy = s.waypoint.ty * this.TS + this.TS / 2;
      if (Math.hypot(playerX - wx, playerY - wy) <= maxDist) {
        return {
          ...s.waypoint,
          settlementId: s.id,
          settlementName: s.name,
          settlementTitle: s.title,
          settlementColor: s.color,
          worldX: wx,
          worldY: wy
        };
      }
    }
    return null;
  }

  /**
   * Determina a quale bioma appartiene una coordinata con transizioni organiche e sfumate:
   * 1. 'village': dentro qualsiasi insediamento o città fortificata
   * 2. 'river': lungo il corso del fiume principale e cascate
   * 3. 'snow': a Nord tra le vette montane
   * 4. 'desert': a Sud-Ovest tra le dune sabbiose
   * 5. 'volcano': a Est/Sud-Est presso le terre ardenti
   * 6. 'forest': altrove tra radure, fitti boschi e querce
   */
  getBiome(tx, ty) {
    const wx = tx * this.TS;
    const wy = ty * this.TS;

    // 1. Safe Zone di qualsiasi insediamento
    if (this.isSafeZone(wx, wy)) {
      return 'village';
    }

    // 2. Fiume con meandri e cascate
    const riverCx = this.getRiverCenterX(ty);
    const distRiver = Math.abs(tx - riverCx);
    if (distRiver <= 6.5) {
      return 'river';
    }

    // 3. Transizioni organiche con rumore di distorsione spaziale
    const warp = Math.sin(ty * 0.042) * 14 + Math.cos(tx * 0.042) * 12 + Math.sin((tx + ty) * 0.02) * 8;
    const effTx = tx + warp;
    const effTy = ty + warp;

    if (effTy < -32) {
      return 'snow';
    }
    if (effTx > 28 && effTy > -20) {
      return 'volcano';
    }
    if (effTy > 30 && effTx < 22) {
      return 'desert';
    }

    return 'forest';
  }

  isBuildingSolid(tx, ty) {
    for (const s of SETTLEMENTS) {
      for (const b of s.buildings) {
        if (tx >= b.tx && tx < b.tx + b.wTiles && ty >= b.ty + 1 && ty < b.ty + b.hTiles) {
          return true;
        }
      }
      for (const p of s.props) {
        if ((p.type === 'well' || p.type === 'lamppost') && p.tx === tx && p.ty === ty) {
          return true;
        }
      }
    }
    return false;
  }

  getTileType(tx, ty) {
    // 1. Confini naturali esterni invalicabili della grande mappa
    if (Math.abs(tx) >= this.MAP_RADIUS - 3 || Math.abs(ty) >= this.MAP_RADIUS - 3) {
      return this.TILE_WALL;
    }

    // 2. Città e Villaggi: pavimento lastricato sicuro senza ostacoli procedurali
    const wx = tx * this.TS;
    const wy = ty * this.TS;
    const sz = this.getSafeZone(wx, wy);
    if (sz) {
      return this.TILE_FLOOR;
    }

    // 2b. Arene dei Boss e Punti d'Interesse: pavimento pulito e sgombro per arena e forzieri
    for (const poi of POINTS_OF_INTEREST) {
      const dPoi = Math.hypot(tx - poi.tx, ty - poi.ty);
      if (dPoi <= 4.8) {
        return this.TILE_FLOOR;
      }
    }

    // 3. Fiume, Cascate, Ponti e Guadi
    const onRoad = this.isRoad(tx, ty);
    const onTrail = this.isTrail(tx, ty);
    const riverCx = this.getRiverCenterX(ty);
    const distRiver = Math.abs(tx - riverCx);

    if ((onRoad || onTrail) && distRiver <= 2.8) {
      return this.TILE_BRIDGE;
    }

    // 4. Strade maestre lastricate e Sentieri selvaggi di terra battuta
    if (onRoad) {
      return this.TILE_ROAD;
    }
    if (onTrail) {
      return this.TILE_TRAIL;
    }

    // 5. Fiume e Guadi calpestabili
    if (distRiver <= 2.4) {
      // Zone di guado attraversabili (Shallow Water): vicino a Borgo Cascate o ogni intervallo regolare
      const isFord = (Math.abs(ty - 22) <= 3 && Math.abs(tx - (-40)) <= 14) ||
                     (Math.floor(Math.abs(ty) / 16) % 3 === 0 && distRiver <= 1.6);
      if (isFord) {
        return this.TILE_SHALLOW_WATER;
      }
      return this.TILE_WATER; // Acqua profonda
    }

    const biome = this.getBiome(tx, ty);
    const wallNoise = this.hash2D(tx, ty, 42);
    const lakeNoise = this.hash2D(Math.floor(tx / 3), Math.floor(ty / 3), 101);
    const propNoise = this.hash2D(tx, ty, 77);

    // DENSITÀ OTTIMIZZATA PER ATTRAVERSABILITÀ FLUIDA FUORI STRADA:
    // Muri e dirupi rari (solo top 6%), ampie aree aperte (88% calpestabile liberamente)
    // 6. Bioma Fiume (Sponde verdeggianti e canneti)
    if (biome === 'river') {
      if (propNoise > 0.90) return this.TILE_TREE;
      if (propNoise > 0.87) return this.TILE_ROCK;
      return this.TILE_FLOOR;
    }

    // 7. Montagne Innevate (Nord)
    if (biome === 'snow') {
      if (wallNoise > 0.94) return this.TILE_WALL;
      if (lakeNoise > 0.94) return this.TILE_WATER;
      if (propNoise > 0.88) return this.TILE_PINE;
      if (propNoise > 0.85) return this.TILE_ROCK;
      return this.TILE_FLOOR;
    }

    // 8. Deserto delle Dune (Sud-Ovest)
    if (biome === 'desert') {
      if (wallNoise > 0.94) return this.TILE_WALL;
      if (lakeNoise > 0.96) return this.TILE_WATER;
      if (propNoise > 0.90) return this.TILE_CACTUS;
      if (propNoise > 0.87) return this.TILE_SAND_ROCK;
      return this.TILE_FLOOR;
    }

    // 9. Caldera Vulcanica (Est / Sud-Est)
    if (biome === 'volcano') {
      if (wallNoise > 0.94) return this.TILE_WALL;
      if (lakeNoise > 0.92) return this.TILE_WATER; // Lava
      if (propNoise > 0.89) return this.TILE_VOLCANO_ROCK;
      if (propNoise > 0.86) return this.TILE_ROCK;
      return this.TILE_FLOOR;
    }

    // 10. Bosco Silvano (Ovest / Centro-Ovest)
    if (wallNoise > 0.95) return this.TILE_WALL;
    if (lakeNoise > 0.93) return this.TILE_WATER;
    if (propNoise > 0.88) return this.TILE_TREE;
    if (propNoise > 0.85) return this.TILE_ROCK;

    return this.TILE_FLOOR;
  }

  getKind(tx, ty) {
    const t = this.getTileType(tx, ty);
    if (t === this.TILE_WALL) return 'wall';
    if (t === this.TILE_WATER) return 'liquid';
    if (t === this.TILE_BRIDGE) return 'bridge';
    if (t === this.TILE_ROAD) return 'road';
    if (t === this.TILE_TRAIL) return 'trail';
    if (t === this.TILE_SHALLOW_WATER) return 'shallow';
    return 'floor';
  }

  isSolid(tx, ty) {
    const t = this.getTileType(tx, ty);
    // Ponti, guadi, strade e sentieri NON sono solidi: sono pienamente calpestabili!
    if (t === this.TILE_BRIDGE || t === this.TILE_SHALLOW_WATER || t === this.TILE_ROAD || t === this.TILE_TRAIL) {
      return false;
    }

    return (
      t === this.TILE_WALL ||
      t === this.TILE_WATER ||
      t === this.TILE_TREE ||
      t === this.TILE_PINE ||
      t === this.TILE_CACTUS ||
      t === this.TILE_VOLCANO_ROCK ||
      t === this.TILE_SAND_ROCK ||
      t === this.TILE_ROCK ||
      this.isBuildingSolid(tx, ty)
    );
  }

  isLiquid(x, y) {
    const tx = this.tileOf(x);
    const ty = this.tileOf(y);
    const t = this.getTileType(tx, ty);
    return t === this.TILE_WATER;
  }

  isShallowWater(x, y) {
    const tx = this.tileOf(x);
    const ty = this.tileOf(y);
    return this.getTileType(tx, ty) === this.TILE_SHALLOW_WATER;
  }

  /**
   * Trova una posizione valida di spawn.
   * GARANZIA CRITICA: Non spawna MAI all'interno di alcuna Safe Zone!
   */
  findValidSpawn(minDist = 300, maxDist = 2800, targetBiome = null, originX = 0, originY = 0) {
    for (let attempts = 0; attempts < 100; attempts++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = minDist + Math.random() * (maxDist - minDist);
      const px = originX + Math.cos(angle) * dist;
      const py = originY + Math.sin(angle) * dist;

      const tx = this.tileOf(px);
      const ty = this.tileOf(py);

      if (Math.abs(tx) < this.MAP_RADIUS - 6 && Math.abs(ty) < this.MAP_RADIUS - 6) {
        // MAI spawnare in Safe Zone!
        if (this.isSafeZone(px, py)) continue;

        if (!this.isSolid(tx, ty) && !this.isLiquid(px, py)) {
          const currentBiome = this.getBiome(tx, ty);
          if (targetBiome) {
            if (currentBiome === targetBiome) {
              return { x: px, y: py };
            }
          } else {
            if (currentBiome !== 'village') {
              return { x: px, y: py };
            }
          }
        }
      }
    }
    // Fallback sicuro al di fuori della capitale e di qualsiasi safe zone
    const fallbackX = originX !== 0 ? originX + 500 : 500;
    const fallbackY = originY !== 0 ? originY + 500 : 500;
    if (!this.isSafeZone(fallbackX, fallbackY)) {
      return { x: fallbackX, y: fallbackY };
    }
    return { x: 500, y: 500 };
  }

  /**
   * Risolve le collisioni (cerchio vs AABB) e APPLICA LA BARRIERA PROTETTIVA
   * delle Safe Zone: i mob non possono MAI entrare nelle città e villaggi!
   */
  collide(entity) {
    const r = entity.r;
    let collided = false;

    // BARRIERA RUNICA SAFE ZONE: respinge i nemici al di fuori del perimetro
    const isEnemy = !!entity.kind;
    if (isEnemy) {
      for (const s of SETTLEMENTS) {
        const sx = s.centerTx * this.TS;
        const sy = s.centerTy * this.TS;
        const safeR = s.radiusTiles * this.TS;
        const dx = entity.x - sx;
        const dy = entity.y - sy;
        const dist = Math.hypot(dx, dy);

        if (dist < safeR + entity.r) {
          collided = true;
          const angle = dist > 1e-4 ? Math.atan2(dy, dx) : Math.random() * Math.PI * 2;
          entity.x = sx + Math.cos(angle) * (safeR + entity.r + 2);
          entity.y = sy + Math.sin(angle) * (safeR + entity.r + 2);
          entity.vx = Math.cos(angle) * 70;
          entity.vy = Math.sin(angle) * 70;
        }
      }
    }

    // Risoluzione collisioni solide ambientali
    for (let pass = 0; pass < 2; pass++) {
      const minTx = this.tileOf(entity.x - r);
      const maxTx = this.tileOf(entity.x + r);
      const minTy = this.tileOf(entity.y - r);
      const maxTy = this.tileOf(entity.y + r);

      for (let ty = minTy; ty <= maxTy; ty++) {
        for (let tx = minTx; tx <= maxTx; tx++) {
          if (!this.isSolid(tx, ty)) continue;

          const bx0 = tx * this.TS;
          const by0 = ty * this.TS;
          const bx1 = bx0 + this.TS;
          const by1 = by0 + this.TS;

          const qx = Math.max(bx0, Math.min(entity.x, bx1));
          const qy = Math.max(by0, Math.min(entity.y, by1));

          const dx = entity.x - qx;
          const dy = entity.y - qy;
          const dist2 = dx * dx + dy * dy;

          if (dist2 < r * r) {
            collided = true;
            if (dist2 > 1e-6) {
              const dist = Math.sqrt(dist2);
              const overlap = r - dist;
              entity.x += (dx / dist) * overlap;
              entity.y += (dy / dist) * overlap;
            } else {
              const left = entity.x - bx0;
              const right = bx1 - entity.x;
              const top = entity.y - by0;
              const bottom = by1 - entity.y;
              const min = Math.min(left, right, top, bottom);

              if (min === left) entity.x = bx0 - r;
              else if (min === right) entity.x = bx1 + r;
              else if (min === top) entity.y = by0 - r;
              else entity.y = by1 + r;
            }
          }
        }
      }
    }

    return collided;
  }

  /**
   * Genera e memorizza il canvas del chunk con autotiling
   */
  getChunkCanvas(cx, cy) {
    const key = `${cx},${cy}`;
    if (this.chunkCanvases.has(key)) {
      return this.chunkCanvases.get(key);
    }

    const canvas = Tiles.paintChunk(
      cx,
      cy,
      this.N,
      (tx, ty) => this.getKind(tx, ty),
      (tx, ty) => this.getBiome(tx, ty),
      this.seed
    );
    this.chunkCanvases.set(key, canvas);

    // Registra i props procedurali presenti nel chunk
    const props = [];
    for (let lty = 0; lty < this.N; lty++) {
      for (let ltx = 0; ltx < this.N; ltx++) {
        const tx = cx * this.N + ltx;
        const ty = cy * this.N + lty;
        const t = this.getTileType(tx, ty);

        if (t === this.TILE_TREE) {
          props.push({ type: 'tree', x: tx * this.TS + this.TS / 2, y: ty * this.TS + this.TS });
        } else if (t === this.TILE_PINE) {
          props.push({ type: 'pine', x: tx * this.TS + this.TS / 2, y: ty * this.TS + this.TS });
        } else if (t === this.TILE_CACTUS) {
          props.push({ type: 'cactus', x: tx * this.TS + this.TS / 2, y: ty * this.TS + this.TS });
        } else if (t === this.TILE_VOLCANO_ROCK) {
          props.push({ type: 'volcano_rock', x: tx * this.TS + this.TS / 2, y: ty * this.TS + this.TS / 2 });
        } else if (t === this.TILE_SAND_ROCK) {
          props.push({ type: 'sand_rock', x: tx * this.TS + this.TS / 2, y: ty * this.TS + this.TS / 2 });
        } else if (t === this.TILE_ROCK) {
          props.push({ type: 'rock', x: tx * this.TS + this.TS / 2, y: ty * this.TS + this.TS / 2 });
        }
      }
    }

    // Inserisce gli edifici e le lanterne di tutti i 6 insediamenti nel chunk corrispondente
    for (const s of SETTLEMENTS) {
      for (const b of s.buildings) {
        const anchorX = (b.tx + b.wTiles / 2) * this.TS;
        const anchorY = (b.ty + b.hTiles) * this.TS;
        const bChunkX = Math.floor(anchorX / this.CW);
        const bChunkY = Math.floor(anchorY / this.CW);
        if (bChunkX === cx && bChunkY === cy) {
          props.push({ type: b.type, x: anchorX, y: anchorY });
        }
      }
      for (const p of s.props) {
        const anchorX = p.tx * this.TS + this.TS / 2;
        const anchorY = p.ty * this.TS + this.TS;
        const pChunkX = Math.floor(anchorX / this.CW);
        const pChunkY = Math.floor(anchorY / this.CW);
        if (pChunkX === cx && pChunkY === cy) {
          props.push({
            type: p.type,
            x: anchorX,
            y: anchorY,
            blacksmithId: s.blacksmith ? s.blacksmith.id : null
          });
        }
      }
    }

    this.chunkProps.set(key, props);
    return canvas;
  }

  drawGround(ctx, camera) {
    const startCx = Math.floor(camera.left() / this.CW);
    const endCx = Math.floor((camera.left() + camera.w) / this.CW);
    const startCy = Math.floor(camera.top() / this.CW);
    const endCy = Math.floor((camera.top() + camera.h) / this.CW);

    for (let cy = startCy; cy <= endCy; cy++) {
      for (let cx = startCx; cx <= endCx; cx++) {
        const chunkCanvas = this.getChunkCanvas(cx, cy);
        ctx.drawImage(
          chunkCanvas,
          cx * this.CW,
          cy * this.CW,
          this.CW + 1,
          this.CW + 1
        );
      }
    }
  }

  drawEntitiesAndProps(ctx, camera, entities = []) {
    const startCx = Math.floor((camera.left() - 80) / this.CW);
    const endCx = Math.floor((camera.left() + camera.w + 80) / this.CW);
    const startCy = Math.floor((camera.top() - 80) / this.CW);
    const endCy = Math.floor((camera.top() + camera.h + 80) / this.CW);

    const drawList = [];

    for (let cy = startCy; cy <= endCy; cy++) {
      for (let cx = startCx; cx <= endCx; cx++) {
        const key = `${cx},${cy}`;
        this.getChunkCanvas(cx, cy);
        const props = this.chunkProps.get(key) || [];
        for (const p of props) {
          if (camera.sees(p.x, p.y, 140)) {
            drawList.push({
              y: p.y,
              draw: () => {
                const sprite = Tiles.getPropSprite(p.type);
                if (!sprite) return;
                const sw = sprite.width * this.PX;
                const sh = sprite.height * this.PX;

                if (p.type === 'house_red' || p.type === 'house_blue' || p.type === 'water_mill' || p.type === 'tent_desert' || p.type === 'cabin_snow' || p.type === 'cabin_wood' || p.type === 'fort_volcano') {
                  ctx.fillStyle = 'rgba(6, 8, 14, 0.45)';
                  ctx.fillRect(Math.round(p.x - sw / 2 + 8), Math.round(p.y - 8), sw - 16, 14);
                  ctx.drawImage(sprite, Math.round(p.x - sw / 2), Math.round(p.y - sh + 8), sw, sh);
                } else if (p.type === 'blacksmith_npc') {
                  const player = entities[0] || { x: 0, y: 0 };
                  Sprites.drawBlacksmithNPC(ctx, p.x, p.y, p.blacksmithId || 'bs_citadel', player.x, player.y, Date.now() / 1000);
                } else if (p.type === 'waypoint_portal') {
                  Sprites.drawShadow(ctx, p.x, p.y - 2, 20);
                  const pulse = Math.sin(Date.now() / 280) * 0.12 + 0.38;
                  const glow = ctx.createRadialGradient(p.x, p.y - 12, 6, p.x, p.y - 12, 65);
                  glow.addColorStop(0, `rgba(56, 189, 248, ${pulse})`);
                  glow.addColorStop(0.6, `rgba(14, 165, 233, ${pulse * 0.4})`);
                  glow.addColorStop(1, 'rgba(56, 189, 248, 0)');
                  ctx.fillStyle = glow;
                  ctx.beginPath();
                  ctx.arc(p.x, p.y - 12, 65, 0, Math.PI * 2);
                  ctx.fill();

                  // Anello runico al suolo
                  ctx.save();
                  ctx.strokeStyle = `rgba(56, 189, 248, ${pulse + 0.25})`;
                  ctx.lineWidth = 1.6;
                  ctx.beginPath();
                  ctx.ellipse(p.x, p.y - 2, 22, 11, 0, 0, Math.PI * 2);
                  ctx.stroke();
                  ctx.restore();

                  ctx.drawImage(sprite, Math.round(p.x - sw / 2), Math.round(p.y - sh + 6), sw, sh);

                  // Cartiglio fluttuante
                  ctx.save();
                  ctx.font = 'bold 10px sans-serif';
                  ctx.textAlign = 'center';
                  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
                  ctx.fillRect(Math.round(p.x - 56), Math.round(p.y - sh - 18), 112, 17);
                  ctx.strokeStyle = '#38bdf8';
                  ctx.lineWidth = 1;
                  ctx.strokeRect(Math.round(p.x - 56), Math.round(p.y - sh - 18), 112, 17);
                  ctx.fillStyle = '#7dd3fc';
                  ctx.fillText('🌀 Portale Viaggio [E]', Math.round(p.x), Math.round(p.y - sh - 5));
                  ctx.restore();
                } else if (p.type === 'aether_obelisk') {
                  Sprites.drawShadow(ctx, p.x, p.y - 2, 22);
                  const glow = ctx.createRadialGradient(p.x, p.y - 36, 10, p.x, p.y - 36, 80);
                  glow.addColorStop(0, 'rgba(56, 189, 248, 0.28)');
                  glow.addColorStop(1, 'rgba(56, 189, 248, 0)');
                  ctx.fillStyle = glow;
                  ctx.beginPath();
                  ctx.arc(p.x, p.y - 36, 80, 0, Math.PI * 2);
                  ctx.fill();
                  ctx.drawImage(sprite, Math.round(p.x - sw / 2), Math.round(p.y - sh + 8), sw, sh);
                } else if (p.type === 'brazier_fire') {
                  Sprites.drawShadow(ctx, p.x, p.y - 2, 10);
                  const glow = ctx.createRadialGradient(p.x, p.y - 14, 4, p.x, p.y - 14, 42);
                  glow.addColorStop(0, 'rgba(249, 115, 22, 0.28)');
                  glow.addColorStop(1, 'rgba(249, 115, 22, 0)');
                  ctx.fillStyle = glow;
                  ctx.beginPath();
                  ctx.arc(p.x, p.y - 14, 42, 0, Math.PI * 2);
                  ctx.fill();
                  ctx.drawImage(sprite, Math.round(p.x - sw / 2), Math.round(p.y - sh + 4), sw, sh);
                } else if (p.type === 'fountain') {
                  Sprites.drawShadow(ctx, p.x, p.y - 2, 18);
                  ctx.drawImage(sprite, Math.round(p.x - sw / 2), Math.round(p.y - sh + 6), sw, sh);
                } else if (p.type === 'glowing_mushrooms') {
                  Sprites.drawShadow(ctx, p.x, p.y - 2, 12);
                  const glow = ctx.createRadialGradient(p.x, p.y - 10, 4, p.x, p.y - 10, 36);
                  glow.addColorStop(0, 'rgba(168, 85, 247, 0.25)');
                  glow.addColorStop(1, 'rgba(168, 85, 247, 0)');
                  ctx.fillStyle = glow;
                  ctx.beginPath();
                  ctx.arc(p.x, p.y - 10, 36, 0, Math.PI * 2);
                  ctx.fill();
                  ctx.drawImage(sprite, Math.round(p.x - sw / 2), Math.round(p.y - sh + 4), sw, sh);
                } else if (p.type === 'well') {
                  Sprites.drawShadow(ctx, p.x, p.y - 2, 14);
                  ctx.drawImage(sprite, Math.round(p.x - sw / 2), Math.round(p.y - sh + 6), sw, sh);
                } else if (p.type === 'lamppost') {
                  Sprites.drawShadow(ctx, p.x, p.y - 1, 7);
                  const glow = ctx.createRadialGradient(p.x, p.y - 28, 4, p.x, p.y - 28, 46);
                  glow.addColorStop(0, 'rgba(253, 224, 71, 0.22)');
                  glow.addColorStop(1, 'rgba(253, 224, 71, 0)');
                  ctx.fillStyle = glow;
                  ctx.beginPath();
                  ctx.arc(p.x, p.y - 28, 46, 0, Math.PI * 2);
                  ctx.fill();
                  ctx.drawImage(sprite, Math.round(p.x - sw / 2), Math.round(p.y - sh + 4), sw, sh);
                } else {
                  const rad = (p.type === 'tree' || p.type === 'pine' || p.type === 'palm_tree') ? 14 : (p.type === 'cactus' ? 10 : 12);
                  Sprites.drawShadow(ctx, p.x, p.y - 2, rad);
                  const yOff = (p.type === 'tree' || p.type === 'pine' || p.type === 'palm_tree') ? 8 : 4;
                  ctx.drawImage(sprite, Math.round(p.x - sw / 2), Math.round(p.y - sh + yOff), sw, sh);
                }
              }
            });
          }
        }
      }
    }

    // Nodi di Raccolta Risorse nel Mondo (Albion Online Style)
    if (this.resourceNodes) {
      for (const node of this.resourceNodes) {
        if (camera.sees(node.x, node.y, 80)) {
          drawList.push({
            y: node.y,
            draw: () => node.draw(ctx, camera)
          });
        }
      }
    }

    // Entità mobili (Player, Nemici)
    for (const e of entities) {
      if (camera.sees(e.x, e.y, 80)) {
        drawList.push({
          y: e.y,
          draw: () => e.draw(ctx)
        });
      }
    }

    // Ordinamento Y-Sort 2.5D
    drawList.sort((a, b) => a.y - b.y);

    for (const item of drawList) {
      item.draw();
    }
  }

  drawVignette(ctx, width, height) {
    const gradient = ctx.createRadialGradient(
      width / 2, height / 2, Math.min(width, height) * 0.35,
      width / 2, height / 2, Math.max(width, height) * 0.78
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(6, 8, 14, 0.65)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }
}
