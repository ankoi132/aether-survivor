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

export const SETTLEMENTS = [
  {
    id: 'citadel',
    name: "Cittadella dell'Aether",
    title: "Capitale Elementale",
    type: 'capital',
    centerTx: 0,
    centerTy: 0,
    radiusTiles: 12, // ~384px raggio di protezione
    color: '#38bdf8',
    buildings: [
      { type: 'house_red', tx: -7, ty: -6, wTiles: 4, hTiles: 3, name: 'Taverna del Viandante' },
      { type: 'house_blue', tx: 3, ty: -6, wTiles: 4, hTiles: 3, name: 'Torre dell\'Arcimago' },
      { type: 'house_blue', tx: -7, ty: 3, wTiles: 4, hTiles: 3, name: 'Bottega delle Pozioni' },
      { type: 'house_red', tx: 3, ty: 3, wTiles: 4, hTiles: 3, name: 'Fucina & Armeria' }
    ],
    props: [
      { type: 'well', tx: 0, ty: -1 },
      { type: 'lamppost', tx: -3, ty: -3 },
      { type: 'lamppost', tx: 3, ty: -3 },
      { type: 'lamppost', tx: -3, ty: 2 },
      { type: 'lamppost', tx: 3, ty: 2 }
    ]
  },
  {
    id: 'waterfall_village',
    name: "Borgo delle Cascate",
    title: "Villaggio del Fiume & Mulino",
    type: 'river_town',
    centerTx: -40,
    centerTy: 22,
    radiusTiles: 11,
    color: '#06b6d4',
    buildings: [
      { type: 'house_blue', tx: -44, ty: 18, wTiles: 4, hTiles: 3, name: 'Locanda della Cascata' },
      { type: 'house_blue', tx: -36, ty: 18, wTiles: 4, hTiles: 3, name: 'Bottega dei Pescatori' },
      { type: 'house_red', tx: -42, ty: 25, wTiles: 4, hTiles: 3, name: 'Mulino ad Acqua' }
    ],
    props: [
      { type: 'well', tx: -40, ty: 22 },
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
    radiusTiles: 10,
    color: '#7dd3fc',
    buildings: [
      { type: 'house_red', tx: 16, ty: -79, wTiles: 4, hTiles: 3, name: 'Rifugio dei Ghiacci' },
      { type: 'house_blue', tx: 22, ty: -79, wTiles: 4, hTiles: 3, name: 'Osservatorio Astrale' }
    ],
    props: [
      { type: 'well', tx: 20, ty: -75 },
      { type: 'lamppost', tx: 17, ty: -74 },
      { type: 'lamppost', tx: 23, ty: -74 }
    ]
  },
  {
    id: 'oasis',
    name: "Oasi di Al-Zahir",
    title: "Carovana delle Dune",
    type: 'desert_oasis',
    centerTx: -70,
    centerTy: 65,
    radiusTiles: 10,
    color: '#f59e0b',
    buildings: [
      { type: 'house_red', tx: -74, ty: 61, wTiles: 4, hTiles: 3, name: 'Bazaar delle Spezie' },
      { type: 'house_blue', tx: -66, ty: 61, wTiles: 4, hTiles: 3, name: 'Tenda del Califfo' }
    ],
    props: [
      { type: 'well', tx: -70, ty: 65 },
      { type: 'lamppost', tx: -72, ty: 64 },
      { type: 'lamppost', tx: -68, ty: 64 }
    ]
  },
  {
    id: 'cineris',
    name: "Rocca di Cineris",
    title: "Fortezza del Fuoco",
    type: 'volcano_fort',
    centerTx: 70,
    centerTy: 45,
    radiusTiles: 10,
    color: '#ef4444',
    buildings: [
      { type: 'house_red', tx: 66, ty: 41, wTiles: 4, hTiles: 3, name: 'Fucina di Magma' },
      { type: 'house_blue', tx: 72, ty: 41, wTiles: 4, hTiles: 3, name: 'Torre di Guardia' }
    ],
    props: [
      { type: 'well', tx: 70, ty: 45 },
      { type: 'lamppost', tx: 67, ty: 44 },
      { type: 'lamppost', tx: 73, ty: 44 }
    ]
  },
  {
    id: 'sylva',
    name: "Borgo di Sylva",
    title: "Santuario Silvano",
    type: 'forest_haven',
    centerTx: -75,
    centerTy: -35,
    radiusTiles: 10,
    color: '#22c55e',
    buildings: [
      { type: 'house_blue', tx: -79, ty: -39, wTiles: 4, hTiles: 3, name: 'Bottega degli Antidoti' },
      { type: 'house_red', tx: -71, ty: -39, wTiles: 4, hTiles: 3, name: 'Locanda della Quercia' }
    ],
    props: [
      { type: 'well', tx: -75, ty: -35 },
      { type: 'lamppost', tx: -77, ty: -34 },
      { type: 'lamppost', tx: -73, ty: -34 }
    ]
  }
];

// Segmenti della Rete Stradale che collegano le città
const ROAD_SEGMENTS = [
  { x1: 0, y1: 0, x2: 20, y2: -75 },     // Cittadella -> Frostpeak (Nord)
  { x1: 0, y1: 0, x2: -40, y2: 22 },     // Cittadella -> Borgo delle Cascate (Ovest/Sud-Ovest)
  { x1: 0, y1: 0, x2: 70, y2: 45 },      // Cittadella -> Cineris (Est)
  { x1: 0, y1: 0, x2: -70, y2: 65 },     // Cittadella -> Al-Zahir (Sud-Ovest)
  { x1: 0, y1: 0, x2: -75, y2: -35 },    // Cittadella -> Sylva (Ovest)
  { x1: -40, y1: 22, x2: -70, y2: 65 },  // Borgo delle Cascate -> Al-Zahir
  { x1: -40, y1: 22, x2: -75, y2: -35 }  // Borgo delle Cascate -> Sylva
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
   * Verifica se un tile fa parte di una strada principale
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

    // 3. Se attraversa un fiume su una strada -> PONTE IN LEGNO (Walkable!)
    const onRoad = this.isRoad(tx, ty);
    const riverCx = this.getRiverCenterX(ty);
    const distRiver = Math.abs(tx - riverCx);

    if (onRoad && distRiver <= 2.8) {
      return this.TILE_BRIDGE;
    }

    // 4. Se è una strada di collegamento tra città -> Strada lastricata (Walkable e sgombra!)
    if (onRoad) {
      return this.TILE_ROAD;
    }

    // 5. Fiume, Cascate e Guadi
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

    // 6. Bioma Fiume (Sponde verdeggianti e canneti)
    if (biome === 'river') {
      if (propNoise > 0.84) return this.TILE_TREE;
      if (propNoise > 0.80) return this.TILE_ROCK;
      return this.TILE_FLOOR;
    }

    // 7. Montagne Innevate (Nord)
    if (biome === 'snow') {
      if (wallNoise > 0.82) return this.TILE_WALL;
      if (lakeNoise > 0.84) return this.TILE_WATER;
      if (propNoise > 0.78) return this.TILE_PINE;
      if (propNoise > 0.74) return this.TILE_ROCK;
      return this.TILE_FLOOR;
    }

    // 8. Deserto delle Dune (Sud-Ovest)
    if (biome === 'desert') {
      if (wallNoise > 0.84) return this.TILE_WALL;
      if (lakeNoise > 0.91) return this.TILE_WATER;
      if (propNoise > 0.82) return this.TILE_CACTUS;
      if (propNoise > 0.78) return this.TILE_SAND_ROCK;
      return this.TILE_FLOOR;
    }

    // 9. Caldera Vulcanica (Est / Sud-Est)
    if (biome === 'volcano') {
      if (wallNoise > 0.81) return this.TILE_WALL;
      if (lakeNoise > 0.76) return this.TILE_WATER; // Lava
      if (propNoise > 0.79) return this.TILE_VOLCANO_ROCK;
      if (propNoise > 0.75) return this.TILE_ROCK;
      return this.TILE_FLOOR;
    }

    // 10. Bosco Silvano (Ovest / Centro-Ovest)
    if (wallNoise > 0.86) return this.TILE_WALL;
    if (lakeNoise > 0.82) return this.TILE_WATER;
    if (propNoise > 0.77) return this.TILE_TREE;
    if (propNoise > 0.73) return this.TILE_ROCK;

    return this.TILE_FLOOR;
  }

  getKind(tx, ty) {
    const t = this.getTileType(tx, ty);
    if (t === this.TILE_WALL) return 'wall';
    if (t === this.TILE_WATER) return 'liquid';
    if (t === this.TILE_BRIDGE) return 'bridge';
    if (t === this.TILE_ROAD) return 'road';
    if (t === this.TILE_SHALLOW_WATER) return 'shallow';
    return 'floor';
  }

  isSolid(tx, ty) {
    const t = this.getTileType(tx, ty);
    // Ponti, guadi e strade NON sono solidi: sono pienamente calpestabili!
    if (t === this.TILE_BRIDGE || t === this.TILE_SHALLOW_WATER || t === this.TILE_ROAD) {
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
          props.push({ type: p.type, x: anchorX, y: anchorY });
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

                if (p.type === 'house_red' || p.type === 'house_blue') {
                  ctx.fillStyle = 'rgba(6, 8, 14, 0.45)';
                  ctx.fillRect(Math.round(p.x - sw / 2 + 10), Math.round(p.y - 8), sw - 20, 14);
                  ctx.drawImage(sprite, Math.round(p.x - sw / 2), Math.round(p.y - sh + 8), sw, sh);
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
                  const rad = (p.type === 'tree' || p.type === 'pine') ? 14 : (p.type === 'cactus' ? 10 : 12);
                  Sprites.drawShadow(ctx, p.x, p.y - 2, rad);
                  const yOff = (p.type === 'tree' || p.type === 'pine') ? 8 : 4;
                  ctx.drawImage(sprite, Math.round(p.x - sw / 2), Math.round(p.y - sh + yOff), sw, sh);
                }
              }
            });
          }
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
