import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';

const basePath = 'D:/Dev/Promethia/tilesets/SERENE_VILLAGE_REVAMPED';
const s16 = PNG.sync.read(fs.readFileSync(path.join(basePath, 'Serene_Village_16x16.png')));
const outDir = 'D:/Dev/survivor-game/assets/sprites/world';
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function slice(src, x, y, w, h) {
  const dst = new PNG({ width: w, height: h });
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const srcIdx = ((y + r) * src.width + (x + c)) * 4;
      const dstIdx = (r * w + c) * 4;
      for (let k = 0; k < 4; k++) dst.data[dstIdx + k] = src.data[srcIdx + k];
    }
  }
  return dst;
}

function hexToRgba(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}

function setPixel(png, x, y, hex) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const idx = (y * png.width + x) * 4;
  const [r, g, b, a] = hexToRgba(hex);
  png.data[idx] = r;
  png.data[idx + 1] = g;
  png.data[idx + 2] = b;
  png.data[idx + 3] = a;
}

function createEmpty(w, h) {
  const png = new PNG({ width: w, height: h });
  for (let i = 0; i < w * h * 4; i += 4) png.data[i + 3] = 0;
  return png;
}

function applyOutline(png, edgeHex = '#090d16') {
  const marks = [];
  const W = png.width, H = png.height;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4;
      if (png.data[idx + 3] > 0) continue;
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => {
        const xx = x + a, yy = y + b;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) return false;
        return png.data[(yy * W + xx) * 4 + 3] > 0;
      });
      if (near) marks.push([x, y]);
    }
  }
  for (const [x, y] of marks) setPixel(png, x, y, edgeHex);
}

// 1. EXTRACT SERENE VILLAGE NATIVE ASSETS (32x48 trees, 80x54 and 48x54 houses)
fs.writeFileSync(path.join(outDir, 'tree_oak.png'), PNG.sync.write(slice(s16, 11 * 16, 12 * 16, 32, 48)));
fs.writeFileSync(path.join(outDir, 'tree_oak_gold.png'), PNG.sync.write(slice(s16, 9 * 16, 12 * 16, 32, 48)));
fs.writeFileSync(path.join(outDir, 'tree_oak_teal.png'), PNG.sync.write(slice(s16, 13 * 16, 12 * 16, 32, 48)));

fs.writeFileSync(path.join(outDir, 'house_red.png'), PNG.sync.write(slice(s16, 0, 25 * 16 + 2, 80, 54)));
fs.writeFileSync(path.join(outDir, 'house_red_small.png'), PNG.sync.write(slice(s16, 0, 21 * 16 + 2, 48, 54)));
fs.writeFileSync(path.join(outDir, 'house_blue.png'), PNG.sync.write(slice(s16, 0, 41 * 16 + 2, 80, 54)));
fs.writeFileSync(path.join(outDir, 'house_blue_small.png'), PNG.sync.write(slice(s16, 0, 37 * 16 + 2, 48, 54)));
fs.writeFileSync(path.join(outDir, 'cabin_wood.png'), PNG.sync.write(slice(s16, 0, 33 * 16 + 2, 80, 54)));
fs.writeFileSync(path.join(outDir, 'cabin_wood_small.png'), PNG.sync.write(slice(s16, 0, 29 * 16 + 2, 48, 54)));

// Rocks & Nature from Serene Village
fs.writeFileSync(path.join(outDir, 'rock.png'), PNG.sync.write(slice(s16, 16, 15 * 16 + 4, 24, 20)));

const sandRock = slice(s16, 16, 15 * 16 + 4, 24, 20);
for (let i = 0; i < sandRock.width * sandRock.height * 4; i += 4) {
  if (sandRock.data[i + 3] > 10) {
    sandRock.data[i] = Math.min(255, Math.round(sandRock.data[i] * 1.35 + 30));
    sandRock.data[i + 1] = Math.min(255, Math.round(sandRock.data[i + 1] * 0.95 + 10));
    sandRock.data[i + 2] = Math.round(sandRock.data[i + 2] * 0.45);
  }
}
fs.writeFileSync(path.join(outDir, 'sand_rock.png'), PNG.sync.write(sandRock));
fs.writeFileSync(path.join(outDir, 'glowing_mushrooms.png'), PNG.sync.write(slice(s16, 8 * 16, 13 * 16, 26, 26)));

// 2. REFINE SNOWY CABIN (CHALET) - Complete snow blanket over Serene Village Timber Cottage
function buildSnowCabin() {
  const png = slice(s16, 0, 21 * 16 + 2, 48, 54);

  const cSnowPure = '#ffffff';
  const cSnowLight = '#e2e8f0';
  const cSnowShadow = '#cbd5e1';
  const cSnowDark = '#94a3b8';
  const cGlow = '#fde047';

  // Cover entire roof area (y = 0 to 28) with thick snow drifts
  for (let y = 0; y <= 28; y++) {
    for (let x = 0; x < 48; x++) {
      const idx = (y * 48 + x) * 4;
      if (png.data[idx + 3] > 10) {
        if (y === 28) {
          const [r, g, b] = hexToRgba(cSnowDark);
          png.data[idx] = r; png.data[idx+1] = g; png.data[idx+2] = b;
        } else {
          const isTop = y <= 12;
          const [r, g, b] = hexToRgba(isTop ? cSnowPure : ((y % 3 === 0) ? cSnowLight : cSnowShadow));
          png.data[idx] = r; png.data[idx+1] = g; png.data[idx+2] = b;
        }
      }
    }
  }

  // Clear eaves line & add icicles
  for (let x = 4; x <= 43; x++) {
    if (x % 5 === 0) {
      setPixel(png, x, 28, cSnowLight);
      setPixel(png, x, 29, cSnowPure);
    }
  }

  // Warm glowing interior light through door window
  for (let y = 33; y <= 35; y++) {
    for (let x = 21; x <= 26; x++) setPixel(png, x, y, cGlow);
  }

  applyOutline(png, '#090d16');
  return png;
}
fs.writeFileSync(path.join(outDir, 'cabin_snow.png'), PNG.sync.write(buildSnowCabin()));

// 3. REFINE VOLCANO FORT (Cineris Keep) - 60x56
function buildVolcanoFort() {
  const W = 60, H = 56;
  const png = createEmpty(W, H);

  const cBasaltDark = '#09090b';
  const cBasalt = '#18181b';
  const cBasaltMid = '#27272a';
  const cBasaltLight = '#3f3f46';
  const cLava = '#ef4444';
  const cLavaGlow = '#facc15';
  const cIron = '#451a03';

  // Walls with basalt stone masonry
  for (let y = 14; y <= 51; y++) {
    for (let x = 4; x <= 55; x++) {
      let isMortar = (x % 7 === 0 || y % 6 === 0);
      let col = isMortar ? cBasaltDark : ((x % 3 === 0) ? cBasaltMid : cBasalt);
      if ((x === 17 || x === 42) && y >= 22 && y <= 45) {
        col = (x + y) % 2 === 0 ? cLavaGlow : cLava;
      }
      setPixel(png, x, y, col);
    }
  }

  // Symmetric Battlements (5 crenels)
  const merlons = [4, 15, 26, 37, 48];
  for (const mx of merlons) {
    for (let y = 7; y <= 13; y++) {
      for (let bx = 0; bx < 8; bx++) {
        setPixel(png, mx + bx, y, (y === 7) ? cBasaltLight : cBasalt);
      }
    }
  }

  // Heavy Iron Reinforced Gate
  for (let y = 34; y <= 51; y++) {
    for (let x = 25; x <= 34; x++) {
      setPixel(png, x, y, (x % 3 === 0 || y === 34) ? cBasaltLight : cIron);
    }
  }

  // Torches on sides
  for (const sx of [14, 45]) {
    for (let y = 22; y <= 28; y++) setPixel(png, sx, y, cLavaGlow);
  }

  applyOutline(png, '#020617');
  return png;
}
fs.writeFileSync(path.join(outDir, 'fort_volcano.png'), PNG.sync.write(buildVolcanoFort()));

// 4. REFINE DESERT TENT (Bazaar Pavilion) - 56x44
function buildDesertTent() {
  const W = 56, H = 44;
  const png = createEmpty(W, H);

  const cClothGold = '#f59e0b';
  const cClothLight = '#fde047';
  const cClothCrimson = '#dc2626';
  const cInside = '#451a03';
  const cShadow = '#291402';

  // Dome tent canopy with curved drapery
  for (let y = 8; y <= 38; y++) {
    const p = (y - 8) / 30;
    const span = Math.round(Math.sin(p * Math.PI) * 24);
    for (let x = 28 - span; x <= 28 + span; x++) {
      const stripe = Math.floor(Math.abs(x - 28) / 4) % 3;
      let col = stripe === 0 ? cClothLight : (stripe === 1 ? cClothGold : cClothCrimson);
      if (y >= 35) col = cShadow;
      setPixel(png, x, y, col);
    }
  }

  // Arched entrance draped back
  for (let y = 22; y <= 38; y++) {
    const span = Math.round(((38 - y) / 16) * 10);
    for (let x = 28 - span; x <= 28 + span; x++) {
      setPixel(png, x, y, cInside);
    }
  }

  // Golden pinnacle
  for (let y = 2; y <= 7; y++) setPixel(png, 28, y, cClothLight);

  applyOutline(png, '#090d16');
  return png;
}
fs.writeFileSync(path.join(outDir, 'tent_desert.png'), PNG.sync.write(buildDesertTent()));

// 5. CACTUS & PALM
function buildCactus() {
  const W = 26, H = 40;
  const png = createEmpty(W, H);

  const cEdge = '#052e16';
  const cDark = '#14532d';
  const cMid = '#16a34a';
  const cLight = '#4ade80';
  const cFlower = '#facc15';
  const cFlowerRed = '#ef4444';

  for (let y = 6; y <= 37; y++) {
    for (let x = 11; x <= 15; x++) {
      let col = (x === 11) ? cLight : (x === 15 ? cDark : ((x === 12 || x === 13) ? cMid : cDark));
      if (y % 4 === 0 && x >= 12 && x <= 14) col = cDark;
      setPixel(png, x, y, col);
    }
  }
  for (let x = 4; x <= 11; x++) {
    setPixel(png, x, 22, cMid); setPixel(png, x, 23, cDark);
  }
  for (let y = 14; y <= 22; y++) {
    for (let x = 4; x <= 7; x++) {
      setPixel(png, x, y, (x === 4) ? cLight : (x === 7 ? cDark : cMid));
    }
  }
  for (let x = 15; x <= 22; x++) {
    setPixel(png, x, 18, cMid); setPixel(png, x, 19, cDark);
  }
  for (let y = 10; y <= 18; y++) {
    for (let x = 19; x <= 22; x++) {
      setPixel(png, x, y, (x === 19) ? cLight : (x === 22 ? cDark : cMid));
    }
  }
  setPixel(png, 13, 4, cFlowerRed); setPixel(png, 13, 5, cFlower);
  setPixel(png, 5, 13, cFlower); setPixel(png, 21, 9, cFlower);

  applyOutline(png, cEdge);
  return png;
}
fs.writeFileSync(path.join(outDir, 'tree_cactus.png'), PNG.sync.write(buildCactus()));

function buildPalm() {
  const W = 36, H = 48;
  const png = createEmpty(W, H);

  const cEdge = '#090d16';
  const cTrunkDark = '#451a03';
  const cTrunk = '#78350f';
  const cTrunkLight = '#b45309';
  const cFrondDark = '#14532d';
  const cFrond = '#16a34a';
  const cFrondLight = '#4ade80';
  const cDates = '#f59e0b';

  for (let y = 18; y <= 45; y++) {
    const p = (y - 18) / 27;
    const curve = Math.round(Math.sin(p * Math.PI) * 4);
    const cx = 17 + curve;
    for (let x = cx - 2; x <= cx + 2; x++) {
      let col = (y % 3 === 0) ? cTrunkDark : ((x < cx) ? cTrunkLight : cTrunk);
      setPixel(png, x, y, col);
    }
  }

  setPixel(png, 16, 17, cDates); setPixel(png, 17, 17, cDates);
  setPixel(png, 16, 18, cDates); setPixel(png, 18, 18, cDates);

  const frondRays = [
    [-15, -8], [15, -8], [-14, 6], [14, 6], [0, -13], [-9, -4], [9, -4], [-7, 8], [7, 8]
  ];
  for (const [fx, fy] of frondRays) {
    for (let i = 0; i <= 14; i++) {
      const px = Math.round(17 + (fx * i) / 14);
      const py = Math.round(17 + (fy * i) / 14 + (i * i) / 28);
      setPixel(png, px, py, cFrond);
      setPixel(png, px, py - 1, (i < 8) ? cFrondLight : cFrond);
      if (i > 8) setPixel(png, px, py + 1, cFrondDark);
    }
  }

  applyOutline(png, cEdge);
  return png;
}
fs.writeFileSync(path.join(outDir, 'tree_palm.png'), PNG.sync.write(buildPalm()));

// 6. VOLCANO ROCK & SNOWY PINE & WATER MILL
function buildVolcanoRock() {
  const W = 26, H = 22;
  const png = createEmpty(W, H);

  const cDark = '#09090b';
  const cMid = '#27272a';
  const cLight = '#3f3f46';
  const cLava = '#ef4444';
  const cYellow = '#facc15';

  for (let y = 3; y <= 18; y++) {
    for (let x = 3; x <= 22; x++) {
      const nx = (x - 12.5) / 9.5;
      const ny = (y - 10.5) / 7.5;
      if (nx * nx + ny * ny <= 1.0) {
        let col = (nx + ny < -0.2) ? cLight : ((nx + ny > 0.4) ? cDark : cMid);
        if (Math.abs(x - y + 2) <= 1 && y >= 6 && y <= 15) {
          col = (x % 2 === 0) ? cYellow : cLava;
        }
        setPixel(png, x, y, col);
      }
    }
  }

  applyOutline(png, '#000000');
  return png;
}
fs.writeFileSync(path.join(outDir, 'volcano_rock.png'), PNG.sync.write(buildVolcanoRock()));

function buildSnowyPine() {
  const W = 32, H = 48;
  const png = createEmpty(W, H);

  const cEdge = '#090d16';
  const cTrunkDark = '#382b1d';
  const cTrunk = '#5b4a34';
  const cTrunkLight = '#786245';

  const cNeedleDarkest = '#022c22';
  const cNeedleDark = '#064e3b';
  const cNeedleMid = '#047857';
  const cNeedleLight = '#10b981';

  const cSnowShadow = '#94a3b8';
  const cSnowMid = '#cbd5e1';
  const cSnowLight = '#e2e8f0';
  const cSnowPure = '#ffffff';

  for (let y = 36; y <= 45; y++) {
    const w = (y >= 43) ? 3 : 2;
    for (let x = 16 - w; x <= 16 + w; x++) {
      let col = (x < 16) ? cTrunkLight : (x > 16 ? cTrunkDark : cTrunk);
      if (y === 45) col = cTrunkDark;
      setPixel(png, x, y, col);
    }
  }
  setPixel(png, 12, 45, cSnowLight); setPixel(png, 13, 45, cSnowPure);
  setPixel(png, 19, 45, cSnowPure); setPixel(png, 20, 45, cSnowLight);

  const layers = [
    { yTop: 4, yBot: 14, wMax: 7, snowDepth: 5, jagged: 2 },
    { yTop: 12, yBot: 24, wMax: 11, snowDepth: 6, jagged: 3 },
    { yTop: 21, yBot: 34, wMax: 14, snowDepth: 7, jagged: 4 },
    { yTop: 29, yBot: 42, wMax: 15, snowDepth: 7, jagged: 4 }
  ];

  for (const layer of layers) {
    const { yTop, yBot, wMax, snowDepth, jagged } = layer;
    for (let y = yTop; y <= yBot; y++) {
      const t = (y - yTop) / (yBot - yTop);
      let span = Math.round(1 + t * wMax);
      if (y >= yBot - 3) {
        const frill = (y === yBot) ? ((yTop + y) % 3 === 0 ? 0 : -jagged) : ((y % 2 === 0) ? 0 : -1);
        span += frill;
      }
      if (span <= 0) continue;

      const isSnow = (y - yTop) < snowDepth;

      for (let x = 16 - span; x <= 16 + span; x++) {
        const dx = (x - 16);
        const relX = Math.abs(dx) / span;

        if (isSnow) {
          if (y - yTop <= 1 && dx <= 1) {
            setPixel(png, x, y, cSnowPure);
          } else if (dx < 0 && relX < 0.6) {
            setPixel(png, x, y, (x + y) % 3 === 0 ? cSnowPure : cSnowLight);
          } else if (y === yTop + snowDepth - 1 || dx > span * 0.5) {
            setPixel(png, x, y, cSnowShadow);
          } else {
            setPixel(png, x, y, cSnowMid);
          }
        } else {
          if (dx < -span * 0.3) {
            setPixel(png, x, y, (x % 2 === 0) ? cNeedleLight : cNeedleMid);
          } else if (dx > span * 0.25) {
            setPixel(png, x, y, (x % 2 === 0) ? cNeedleDarkest : cNeedleDark);
          } else {
            setPixel(png, x, y, (x % 3 === 0) ? cNeedleMid : cNeedleDark);
          }
        }
      }
    }
  }

  setPixel(png, 16, 2, cSnowPure); setPixel(png, 16, 3, cSnowPure);
  setPixel(png, 15, 3, cSnowLight); setPixel(png, 17, 3, cSnowMid);
  setPixel(png, 11, 25, cSnowLight); setPixel(png, 11, 26, cSnowPure);
  setPixel(png, 21, 25, cSnowMid); setPixel(png, 21, 26, cSnowLight);
  setPixel(png, 8, 35, cSnowLight); setPixel(png, 8, 36, cSnowPure);
  setPixel(png, 24, 35, cSnowMid); setPixel(png, 24, 36, cSnowLight);

  applyOutline(png, cEdge);
  return png;
}
fs.writeFileSync(path.join(outDir, 'tree_pine.png'), PNG.sync.write(buildSnowyPine()));

function buildWaterMill() {
  const W = 70, H = 54;
  const png = createEmpty(W, H);

  const cottage = slice(s16, 0, 37 * 16 + 2, 48, 54);
  for (let y = 0; y < 54; y++) {
    for (let x = 0; x < 48; x++) {
      const srcIdx = (y * 48 + x) * 4;
      const dstIdx = (y * W + x) * 4;
      for (let k = 0; k < 4; k++) png.data[dstIdx + k] = cottage.data[srcIdx + k];
    }
  }

  const cWood = '#78350f';
  const cWoodDark = '#451a03';
  const cWater = '#38bdf8';
  const cFoam = '#ffffff';

  const rcx = 57, rcy = 36, rr = 13;
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
    for (let r = 3; r <= rr; r++) {
      const px = Math.round(rcx + Math.cos(a) * r);
      const py = Math.round(rcy + Math.sin(a) * r);
      setPixel(png, px, py, cWoodDark);
    }
  }
  for (let a = 0; a < Math.PI * 2; a += 0.1) {
    const px = Math.round(rcx + Math.cos(a) * rr);
    const py = Math.round(rcy + Math.sin(a) * rr);
    setPixel(png, px, py, cWood);
  }
  for (let x = 50; x <= 66; x++) {
    setPixel(png, x, 50, cWater);
    if (x % 2 === 0) setPixel(png, x, 51, cFoam);
  }

  applyOutline(png, '#090d16');
  return png;
}
fs.writeFileSync(path.join(outDir, 'water_mill.png'), PNG.sync.write(buildWaterMill()));

console.log('All world sprites refined successfully!');
