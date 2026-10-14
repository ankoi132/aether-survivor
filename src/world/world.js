/**
 * world/world.js - Generazione procedurale del mondo con l'autotiler autentico di tiles.js
 */
import { Tiles } from './tiles.js';
import { Sprites } from '../core/sprites.js';

export class World {
  constructor(seed = 2026) {
    this.seed = seed;
    this.T = Tiles.T;               // 16 px base
    this.PX = Sprites.PX;           // Scala 2x
    this.TS = this.T * this.PX;     // 32 px nel mondo
    this.N = 16;                    // 16 tile per chunk
    this.CW = this.N * this.TS;     // 512 px per chunk

    this.TILE_FLOOR = 0;
    this.TILE_WALL = 1;
    this.TILE_WATER = 2;
    this.TILE_TREE = 3;
    this.TILE_ROCK = 4;

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

  getTileType(tx, ty) {
    // 1. Confini naturali invalicabili: catena montuosa e scogliere esterne
    if (Math.abs(tx) >= this.MAP_RADIUS - 3 || Math.abs(ty) >= this.MAP_RADIUS - 3) {
      return this.TILE_WALL;
    }

    // 2. Santuario di Partenza (Centro): radura sicura senza ostacoli
    if (Math.abs(tx) <= 5 && Math.abs(ty) <= 5) {
      return this.TILE_FLOOR;
    }

    // 3. Bioma Sud-Est: Baia e Laghi Mistici
    const isWaterBiome = (tx > 0 && ty > 0);
    const waterThreshold = isWaterBiome ? 0.65 : 0.82;
    const waterNoise = this.hash2D(Math.floor(tx / 3), Math.floor(ty / 3), 101);
    if (waterNoise > waterThreshold) {
      return this.TILE_WATER;
    }

    // 4. Mura e Scogliere di Roccia (autotiled 3D)
    const isRuinsBiome = (tx > 0 && ty < 0);
    const wallNoise = this.hash2D(tx, ty, 42);
    if (wallNoise > (isRuinsBiome ? 0.84 : 0.91)) {
      return this.TILE_WALL;
    }

    // 5. Alberi e Rocce volumetriche Y-Sorted
    const isForestBiome = (tx < 0 && ty < 0);
    if (isForestBiome) {
      if (wallNoise > 0.76) return this.TILE_TREE;
      if (wallNoise > 0.72) return this.TILE_ROCK;
    } else {
      if (wallNoise > 0.85) return this.TILE_TREE;
      if (wallNoise > 0.81) return this.TILE_ROCK;
    }

    return this.TILE_FLOOR;
  }

  /**
   * Trova una posizione valida e sicura (non solida, non in acqua) per lo spawn di entità
   */
  findValidSpawn(minDist = 250, maxDist = 1350) {
    for (let attempts = 0; attempts < 50; attempts++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = minDist + Math.random() * (maxDist - minDist);
      const px = Math.cos(angle) * dist;
      const py = Math.sin(angle) * dist;

      const tx = this.tileOf(px);
      const ty = this.tileOf(py);

      if (Math.abs(tx) < this.MAP_RADIUS - 5 && Math.abs(ty) < this.MAP_RADIUS - 5) {
        if (!this.isSolid(tx, ty) && !this.isLiquid(px, py)) {
          return { x: px, y: py };
        }
      }
    }
    return { x: 300, y: 300 };
  }

  getKind(tx, ty) {
    const t = this.getTileType(tx, ty);
    if (t === this.TILE_WALL) return 'wall';
    if (t === this.TILE_WATER) return 'liquid';
    return 'floor';
  }

  isSolid(tx, ty) {
    const t = this.getTileType(tx, ty);
    return t === this.TILE_WALL || t === this.TILE_TREE || t === this.TILE_ROCK;
  }

  isLiquid(x, y) {
    const tx = this.tileOf(x);
    const ty = this.tileOf(y);
    return this.getTileType(tx, ty) === this.TILE_WATER;
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

    // Usa l'autotiler di tiles.js per dipingere terra, scogliere e laghi con transizioni reali
    const canvas = Tiles.paintChunk(cx, cy, this.N, (tx, ty) => this.getKind(tx, ty), this.seed);
    this.chunkCanvases.set(key, canvas);

    // Registra i props (alberi e rocce) presenti nel chunk
    const props = [];
    for (let lty = 0; lty < this.N; lty++) {
      for (let ltx = 0; ltx < this.N; ltx++) {
        const tx = cx * this.N + ltx;
        const ty = cy * this.N + lty;
        const t = this.getTileType(tx, ty);
        if (t === this.TILE_TREE) {
          props.push({ type: 'tree', x: tx * this.TS + this.TS / 2, y: ty * this.TS + this.TS });
        } else if (t === this.TILE_ROCK) {
          props.push({ type: 'rock', x: tx * this.TS + this.TS / 2, y: ty * this.TS + this.TS / 2 });
        }
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
        // Il chunk nativo è N*T (256x256), viene disegnato a CW (512x512) per il pixel scale 2x
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
   * Disegna oggetti dello scenario ed entità con ordinamento Y (profondità visiva top-down)
   */
  drawEntitiesAndProps(ctx, camera, entities = []) {
    const startCx = Math.floor((camera.left() - 60) / this.CW);
    const endCx = Math.floor((camera.left() + camera.w + 60) / this.CW);
    const startCy = Math.floor((camera.top() - 60) / this.CW);
    const endCy = Math.floor((camera.top() + camera.h + 60) / this.CW);

    const drawList = [];

    // Raccoglie i props dai chunk visibili
    for (let cy = startCy; cy <= endCy; cy++) {
      for (let cx = startCx; cx <= endCx; cx++) {
        const key = `${cx},${cy}`;
        this.getChunkCanvas(cx, cy);
        const props = this.chunkProps.get(key) || [];
        for (const p of props) {
          if (camera.sees(p.x, p.y, 90)) {
            drawList.push({
              y: p.y,
              draw: () => {
                const sprite = Tiles.getPropSprite(p.type);
                if (!sprite) return;
                const sw = sprite.width * this.PX;
                const sh = sprite.height * this.PX;
                Sprites.drawShadow(ctx, p.x, p.y - 2, p.type === 'tree' ? 14 : 10);
                ctx.drawImage(
                  sprite,
                  Math.round(p.x - sw / 2),
                  Math.round(p.y - sh + (p.type === 'tree' ? 8 : 4)),
                  sw,
                  sh
                );
              }
            });
          }
        }
      }
    }

    // Aggiunge le entità (giocatore, e in futuro i nemici)
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
