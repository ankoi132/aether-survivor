/**
 * world/world.js - Generatore procedurale del mondo a 5 biomi (Foresta, Neve, Deserto, Vulcano, Paesino)
 * con autotiling 16-bit, props tematici ed edifici del villaggio ispirati al reverse engineering.
 */
import { Tiles } from './tiles.js';
import { Sprites } from '../core/sprites.js';

const VILLAGE_BUILDINGS = [
  { type: 'house_red', tx: -7, ty: -6, wTiles: 4, hTiles: 3, name: 'Taverna del Viandante' },
  { type: 'house_blue', tx: 3, ty: -6, wTiles: 4, hTiles: 3, name: 'Torre dell\'Arcimago' },
  { type: 'house_blue', tx: -7, ty: 3, wTiles: 4, hTiles: 3, name: 'Bottega delle Pozioni' },
  { type: 'house_red', tx: 3, ty: 3, wTiles: 4, hTiles: 3, name: 'Fucina & Armeria' }
];

const VILLAGE_PROPS = [
  { type: 'well', tx: 0, ty: -1 },
  { type: 'lamppost', tx: -2, ty: -3 },
  { type: 'lamppost', tx: 2, ty: -3 },
  { type: 'lamppost', tx: -2, ty: 1 },
  { type: 'lamppost', tx: 2, ty: 1 }
];

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
    this.TILE_WATER = 2;            // Acqua nei laghi / Lava incandescente nel vulcano
    this.TILE_TREE = 3;             // Quercia verde (Bosco)
    this.TILE_ROCK = 4;             // Roccia d'ardesia
    this.TILE_PINE = 5;             // Abete innevato (Montagne / Neve)
    this.TILE_CACTUS = 6;           // Cactus Saguaro (Deserto)
    this.TILE_VOLCANO_ROCK = 7;     // Roccia magmatica con crepe incandescenti (Vulcano)
    this.TILE_SAND_ROCK = 8;        // Roccia d'arenaria (Deserto)

    // Limiti della Grande Mappa Finita (101x101 tile = 3232x3232 px)
    this.MAP_RADIUS = 50;
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
   * Determina a quale dei 5 biomi appartiene una coordinata di mappa:
   * 1. 'village': Paesino e Santuario centrale (|tx| <= 8, |ty| <= 8)
   * 2. 'snow': Montagne Innevate a Nord (ty < -8)
   * 3. 'desert': Deserto e Canyon di Sabbia a Sud-Ovest (tx < 0, ty > 8)
   * 4. 'volcano': Caldera Vulcanica e Lava a Sud-Est / Est (tx >= 0, ty > 8 o tx > 8)
   * 5. 'forest': Bosco e Radure Silvane a Ovest (tx < -8, -8 <= ty <= 8)
   */
  getBiome(tx, ty) {
    if (Math.abs(tx) <= 8 && Math.abs(ty) <= 8) {
      return 'village';
    }
    if (ty < -8) {
      return 'snow';
    }
    if (tx < 0 && ty > 8) {
      return 'desert';
    }
    if (tx > 8 || (tx >= 0 && ty > 8)) {
      return 'volcano';
    }
    return 'forest';
  }

  isBuildingSolid(tx, ty) {
    // 1. Edifici (pareti e basamento sono solidi, lasciando spazio sul tetto per l'effetto 2.5D)
    for (const b of VILLAGE_BUILDINGS) {
      if (tx >= b.tx && tx < b.tx + b.wTiles && ty >= b.ty + 1 && ty < b.ty + b.hTiles) {
        return true;
      }
    }
    // 2. Pozzo
    for (const p of VILLAGE_PROPS) {
      if (p.type === 'well' && p.tx === tx && p.ty === ty) {
        return true;
      }
      if (p.type === 'lamppost' && p.tx === tx && p.ty === ty) {
        return true;
      }
    }
    return false;
  }

  getTileType(tx, ty) {
    // 1. Confini naturali invalicabili: catena montuosa e scogliere esterne
    if (Math.abs(tx) >= this.MAP_RADIUS - 3 || Math.abs(ty) >= this.MAP_RADIUS - 3) {
      return this.TILE_WALL;
    }

    // 2. Paesino Centrale: pavimento lastricato sicuro senza ostacoli casuali
    const biome = this.getBiome(tx, ty);
    if (biome === 'village') {
      return this.TILE_FLOOR;
    }

    const wallNoise = this.hash2D(tx, ty, 42);
    const waterNoise = this.hash2D(Math.floor(tx / 3), Math.floor(ty / 3), 101);
    const propNoise = this.hash2D(tx, ty, 77);

    // 3. Montagne Innevate (Nord)
    if (biome === 'snow') {
      if (wallNoise > 0.81) return this.TILE_WALL;
      if (waterNoise > 0.82) return this.TILE_WATER; // Lago ghiacciato
      if (propNoise > 0.77) return this.TILE_PINE;
      if (propNoise > 0.73) return this.TILE_ROCK;
      return this.TILE_FLOOR;
    }

    // 4. Deserto e Canyon (Sud-Ovest)
    if (biome === 'desert') {
      if (wallNoise > 0.83) return this.TILE_WALL; // Pareti di arenaria
      if (waterNoise > 0.90) return this.TILE_WATER; // Oasi rare
      if (propNoise > 0.81) return this.TILE_CACTUS;
      if (propNoise > 0.77) return this.TILE_SAND_ROCK;
      return this.TILE_FLOOR;
    }

    // 5. Vulcano e Caldera Ardente (Sud-Est / Est)
    if (biome === 'volcano') {
      if (wallNoise > 0.80) return this.TILE_WALL; // Scogliere di ossidiana
      if (waterNoise > 0.74) return this.TILE_WATER; // Fiumi di lava fusa!
      if (propNoise > 0.78) return this.TILE_VOLCANO_ROCK;
      if (propNoise > 0.74) return this.TILE_ROCK;
      return this.TILE_FLOOR;
    }

    // 6. Bosco (Ovest)
    if (wallNoise > 0.86) return this.TILE_WALL;
    if (waterNoise > 0.77) return this.TILE_WATER;
    if (propNoise > 0.76) return this.TILE_TREE;
    if (propNoise > 0.72) return this.TILE_ROCK;

    return this.TILE_FLOOR;
  }

  getKind(tx, ty) {
    const t = this.getTileType(tx, ty);
    if (t === this.TILE_WALL) return 'wall';
    if (t === this.TILE_WATER) return 'liquid';
    return 'floor';
  }

  isSolid(tx, ty) {
    const t = this.getTileType(tx, ty);
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
    return this.getTileType(tx, ty) === this.TILE_WATER;
  }

  /**
   * Trova una posizione valida e sicura (non solida, non in acqua/lava)
   * con supporto opzionale per bioma specifico.
   */
  findValidSpawn(minDist = 250, maxDist = 1350, targetBiome = null) {
    for (let attempts = 0; attempts < 60; attempts++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = minDist + Math.random() * (maxDist - minDist);
      const px = Math.cos(angle) * dist;
      const py = Math.sin(angle) * dist;

      const tx = this.tileOf(px);
      const ty = this.tileOf(py);

      if (Math.abs(tx) < this.MAP_RADIUS - 5 && Math.abs(ty) < this.MAP_RADIUS - 5) {
        if (!this.isSolid(tx, ty) && !this.isLiquid(px, py)) {
          const currentBiome = this.getBiome(tx, ty);
          if (targetBiome) {
            if (currentBiome === targetBiome) {
              return { x: px, y: py };
            }
          } else {
            // Se nessun bioma target è specificato, evita di spawnare nel santuario del villaggio
            if (currentBiome !== 'village') {
              return { x: px, y: py };
            }
          }
        }
      }
    }
    // Fallback sicuro se i tentativi non trovano il bioma esatto
    return { x: 320, y: 320 };
  }

  /**
   * Risolve le collisioni (cerchio vs AABB) in due passaggi per scivolamento continuo
   */
  collide(entity) {
    const r = entity.r;
    let collided = false;

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
   * Restituisce il canvas del chunk renderizzato con il vero motore di autotiling 16-bit
   */
  getChunkCanvas(cx, cy) {
    const key = `${cx},${cy}`;
    if (this.chunkCanvases.has(key)) {
      return this.chunkCanvases.get(key);
    }

    // Dipinge il terreno e le pareti passando la funzione del bioma
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

    // Inserisce gli edifici e i lampioni del Paesino nel chunk corrispondente
    for (const b of VILLAGE_BUILDINGS) {
      const anchorX = (b.tx + b.wTiles / 2) * this.TS;
      const anchorY = (b.ty + b.hTiles) * this.TS;
      const bChunkX = Math.floor(anchorX / this.CW);
      const bChunkY = Math.floor(anchorY / this.CW);
      if (bChunkX === cx && bChunkY === cy) {
        props.push({ type: b.type, x: anchorX, y: anchorY });
      }
    }

    for (const p of VILLAGE_PROPS) {
      const anchorX = p.tx * this.TS + this.TS / 2;
      const anchorY = p.ty * this.TS + this.TS;
      const pChunkX = Math.floor(anchorX / this.CW);
      const pChunkY = Math.floor(anchorY / this.CW);
      if (pChunkX === cx && pChunkY === cy) {
        props.push({ type: p.type, x: anchorX, y: anchorY });
      }
    }

    this.chunkProps.set(key, props);
    return canvas;
  }

  /**
   * Disegna il terreno autotiled
   */
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

  /**
   * Disegna oggetti dello scenario ed entità con ordinamento Y (profondità visiva top-down 2.5D)
   */
  drawEntitiesAndProps(ctx, camera, entities = []) {
    const startCx = Math.floor((camera.left() - 80) / this.CW);
    const endCx = Math.floor((camera.left() + camera.w + 80) / this.CW);
    const startCy = Math.floor((camera.top() - 80) / this.CW);
    const endCy = Math.floor((camera.top() + camera.h + 80) / this.CW);

    const drawList = [];

    // Raccoglie i props dai chunk visibili
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
                  // Ombra morbida alla base della casa
                  ctx.fillStyle = 'rgba(6, 8, 14, 0.45)';
                  ctx.fillRect(Math.round(p.x - sw / 2 + 10), Math.round(p.y - 8), sw - 20, 14);
                  ctx.drawImage(sprite, Math.round(p.x - sw / 2), Math.round(p.y - sh + 8), sw, sh);
                } else if (p.type === 'well') {
                  Sprites.drawShadow(ctx, p.x, p.y - 2, 14);
                  ctx.drawImage(sprite, Math.round(p.x - sw / 2), Math.round(p.y - sh + 6), sw, sh);
                } else if (p.type === 'lamppost') {
                  Sprites.drawShadow(ctx, p.x, p.y - 1, 7);
                  // Alone di luce dorata sul terreno
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

    // Aggiunge le entità mobili (giocatore, nemici)
    for (const e of entities) {
      if (camera.sees(e.x, e.y, 80)) {
        drawList.push({
          y: e.y,
          draw: () => e.draw(ctx)
        });
      }
    }

    // Ordinamento Y-Sort: gli elementi più in basso coprono quelli più in alto
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
