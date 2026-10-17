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

// Dark Volcano Slate & Basalt Houses (for Rocca di Cineris)
function makeDarkVolcanoHouse(src) {
  const dst = new PNG({ width: src.width, height: src.height });
  for (let i = 0; i < src.width * src.height * 4; i += 4) {
    const a = src.data[i + 3];
    if (a < 10) {
      dst.data[i + 3] = 0;
      continue;
    }
    const r = src.data[i], g = src.data[i + 1], b = src.data[i + 2];
    const lum = (r * 0.3 + g * 0.59 + b * 0.11) / 255;

    // Check features: Roof (red tiles), Walls (cream plaster), Timber, Windows
    const isRedRoof = (r > 120 && g < 90 && b < 90) || (r > 165 && g < 135 && b < 135);
    const isWallCream = (r > 155 && g > 135 && b > 105);
    const isTimber = (r > 95 && r < 175 && g > 65 && g < 125 && b < 85);
    const isWindow = (r > 55 && r < 115 && g > 55 && g < 115 && b > 75 && b < 135);

    if (isRedRoof) {
      // Dark lustrous basalt & obsidian slate roof shingles
      const baseGray = Math.round(28 + lum * 65);
      dst.data[i] = Math.round(baseGray * 0.88);
      dst.data[i + 1] = Math.round(baseGray * 0.95);
      dst.data[i + 2] = Math.round(baseGray * 1.15);
      dst.data[i + 3] = a;
    } else if (isWallCream) {
      // Dressed dark volcanic basalt blocks
      const baseGray = Math.round(32 + lum * 50);
      dst.data[i] = baseGray;
      dst.data[i + 1] = baseGray;
      dst.data[i + 2] = Math.round(baseGray * 1.06);
      dst.data[i + 3] = a;
    } else if (isTimber) {
      // Charred bog-oak blackened timber framing
      dst.data[i] = Math.round(r * 0.32 + 6);
      dst.data[i + 1] = Math.round(g * 0.28 + 4);
      dst.data[i + 2] = Math.round(b * 0.28 + 4);
      dst.data[i + 3] = a;
    } else if (isWindow) {
      // Glowing hearth fire / molten magma interior
      dst.data[i] = 245;
      dst.data[i + 1] = 158;
      dst.data[i + 2] = 11;
      dst.data[i + 3] = a;
    } else {
      // Base shadows & stone foundations
      dst.data[i] = Math.round(r * 0.65);
      dst.data[i + 1] = Math.round(g * 0.65);
      dst.data[i + 2] = Math.round(b * 0.72);
      dst.data[i + 3] = a;
    }
  }
  return dst;
}

const darkHouseBig = makeDarkVolcanoHouse(slice(s16, 0, 25 * 16 + 2, 80, 54));
fs.writeFileSync(path.join(outDir, 'house_dark_volcano.png'), PNG.sync.write(darkHouseBig));

const darkHouseSmall = makeDarkVolcanoHouse(slice(s16, 0, 21 * 16 + 2, 48, 54));
fs.writeFileSync(path.join(outDir, 'house_dark_volcano_small.png'), PNG.sync.write(darkHouseSmall));

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

// 3. REFINE VOLCANO FORT (Bastione di Basalto) - 80x64 Isometric 3/4 Castle
function buildVolcanoFort() {
  const W = 80, H = 64;
  const png = createEmpty(W, H);

  const cMortar = '#09090b';
  const cBasaltShadow = '#14171d';
  const cBasaltBase = '#1e232d';
  const cBasaltMid = '#2c3240';
  const cBasaltLight = '#414a5d';
  const cBasaltRim = '#5a647a';
  const cIron = '#52525b';
  const cWoodDark = '#271b14';
  const cWoodMid = '#3d281a';
  const cLavaGlow = '#fef08a';
  const cLavaMid = '#f59e0b';
  const cLavaDark = '#ef4444';

  // 1. Soft foundation shadow on the ground
  for (let y = 58; y <= 63; y++) {
    for (let x = 2; x <= 77; x++) {
      const dx = (x - 39.5) / 38;
      const dy = (y - 59.5) / 3;
      if (dx * dx + dy * dy <= 1.0) setPixel(png, x, y, '#05070a');
    }
  }

  // Helper to paint textured basalt block
  function paintBlock(x0, y0, w, h, isTopRim = false) {
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) {
        if (x === x0 || y === y0) {
          setPixel(png, x, y, isTopRim ? cBasaltRim : cBasaltLight);
        } else if (x === x0 + w - 1 || y === y0 + h - 1) {
          setPixel(png, x, y, cBasaltShadow);
        } else {
          setPixel(png, x, y, ((x + y) % 3 === 0) ? cBasaltMid : cBasaltBase);
        }
      }
    }
  }

  // 2. Central Keep Body (x: 22..57, y: 20..58)
  for (let y = 20; y <= 58; y++) {
    for (let x = 22; x <= 57; x++) {
      setPixel(png, x, y, cBasaltBase);
    }
  }
  // Central Keep Ashlar Masonry
  for (let y = 22; y <= 57; y += 5) {
    const rowIdx = Math.floor((y - 22) / 5);
    const shift = (rowIdx % 2 === 0) ? 0 : 4;
    for (let x = 22; x <= 57; x += 8) {
      const bx = x + shift;
      if (bx + 7 <= 57) paintBlock(bx, y, 7, 4);
    }
  }

  // 3. Left Tower (x: 4..24, y: 10..58)
  for (let y = 16; y <= 58; y++) {
    for (let x = 4; x <= 24; x++) {
      setPixel(png, x, y, cBasaltBase);
    }
  }
  for (let y = 16; y <= 57; y += 5) {
    const rowIdx = Math.floor((y - 16) / 5);
    const shift = (rowIdx % 2 === 0) ? 0 : 3;
    for (let x = 4; x <= 24; x += 7) {
      const bx = x + shift;
      if (bx + 6 <= 24) paintBlock(bx, y, 6, 4);
    }
  }

  // 4. Right Tower (x: 55..75, y: 10..58)
  for (let y = 16; y <= 58; y++) {
    for (let x = 55; x <= 75; x++) {
      setPixel(png, x, y, cBasaltBase);
    }
  }
  for (let y = 16; y <= 57; y += 5) {
    const rowIdx = Math.floor((y - 16) / 5);
    const shift = (rowIdx % 2 === 0) ? 0 : 3;
    for (let x = 55; x <= 75; x += 7) {
      const bx = x + shift;
      if (bx + 6 <= 75) paintBlock(bx, y, 6, 4);
    }
  }

  // 5. Left Tower Battlements (3 3D Merlons at x: [4..9], [12..16], [19..24])
  const leftMerlons = [[4, 9], [12, 16], [19, 24]];
  for (const [x1, x2] of leftMerlons) {
    // 3D top face (lit)
    for (let x = x1; x <= x2; x++) {
      setPixel(png, x, 10, cBasaltRim);
      setPixel(png, x, 11, cBasaltLight);
    }
    // Front vertical face
    for (let y = 12; y <= 16; y++) {
      for (let x = x1; x <= x2; x++) {
        setPixel(png, x, y, (x === x1) ? cBasaltLight : (x === x2 ? cBasaltShadow : cBasaltMid));
      }
    }
  }
  // Left tower parapet floor / walkway
  for (let x = 4; x <= 24; x++) {
    setPixel(png, x, 16, cBasaltShadow);
    setPixel(png, x, 17, cBasaltLight); // String course cornice
  }

  // 6. Right Tower Battlements (3 3D Merlons at x: [55..60], [63..67], [70..75])
  const rightMerlons = [[55, 60], [63, 67], [70, 75]];
  for (const [x1, x2] of rightMerlons) {
    for (let x = x1; x <= x2; x++) {
      setPixel(png, x, 10, cBasaltRim);
      setPixel(png, x, 11, cBasaltLight);
    }
    for (let y = 12; y <= 16; y++) {
      for (let x = x1; x <= x2; x++) {
        setPixel(png, x, y, (x === x1) ? cBasaltLight : (x === x2 ? cBasaltShadow : cBasaltMid));
      }
    }
  }
  for (let x = 55; x <= 75; x++) {
    setPixel(png, x, 16, cBasaltShadow);
    setPixel(png, x, 17, cBasaltLight);
  }

  // 7. Central Keep Walkway & Merlons (x: 25..54, y: 19..23)
  const midMerlons = [[26, 30], [35, 40], [45, 50]];
  for (const [x1, x2] of midMerlons) {
    for (let x = x1; x <= x2; x++) {
      setPixel(png, x, 18, cBasaltRim);
      setPixel(png, x, 19, cBasaltLight);
      setPixel(png, x, 20, cBasaltMid);
      setPixel(png, x, 21, cBasaltShadow);
    }
  }
  for (let x = 25; x <= 54; x++) {
    setPixel(png, x, 22, cBasaltShadow);
    setPixel(png, x, 23, cBasaltLight); // Corbel table cornice
  }
  // Corbel brackets under central walkway
  for (let cx = 26; cx <= 52; cx += 5) {
    setPixel(png, cx, 24, cBasaltShadow);
    setPixel(png, cx, 25, cBasaltShadow);
  }

  // 8. Arched Gothic Arrowslits with Burning Magma Glow
  function paintArrowslit(cx, cy, h) {
    for (let dy = 0; dy < h; dy++) {
      const y = cy + dy;
      setPixel(png, cx - 1, y, cMortar);
      setPixel(png, cx, y, dy === 0 ? cLavaGlow : (dy === h - 1 ? cLavaDark : cLavaMid));
      setPixel(png, cx + 1, y, cMortar);
    }
    setPixel(png, cx, cy - 1, cBasaltLight); // Keystone
  }
  // Left tower arrowslits
  paintArrowslit(14, 25, 7);
  paintArrowslit(14, 40, 6);
  // Right tower arrowslits
  paintArrowslit(65, 25, 7);
  paintArrowslit(65, 40, 6);
  // Central upper embrasures
  paintArrowslit(34, 29, 5);
  paintArrowslit(45, 29, 5);

  // 9. Monumental Portal Gate (Arched Basalt Portal with Iron-Banded Portcullis)
  // Outer stone arch (x: 32..47, y: 38..58)
  for (let y = 38; y <= 58; y++) {
    for (let x = 32; x <= 47; x++) {
      const dx = (x - 39.5) / 7.5;
      const dy = (y - 45) / 7;
      const isArch = (y <= 45 && dx * dx + dy * dy <= 1.0) || (y > 45 && x >= 33 && x <= 46);
      const isInnerDoor = (y <= 45 && dx * dx * 1.5 + dy * dy * 1.5 <= 1.0) || (y > 45 && x >= 35 && x <= 44);

      if (isArch && !isInnerDoor) {
        // Radial arch voussoirs
        setPixel(png, x, y, (y === 38 || x === 33 || x === 46) ? cBasaltRim : cBasaltLight);
      } else if (isInnerDoor) {
        // Reinforced wooden gate with iron portcullis
        const isPlank = (x % 3 === 0);
        const isIronStrap = (y === 44 || y === 51);
        const isSpike = (y === 56 && (x === 36 || x === 39 || x === 42));

        if (isSpike) {
          setPixel(png, x, y, cIron);
        } else if (isIronStrap) {
          setPixel(png, x, y, ((x + y) % 2 === 0) ? '#94a3b8' : cIron);
        } else if (isPlank) {
          setPixel(png, x, y, cWoodDark);
        } else {
          setPixel(png, x, y, cWoodMid);
        }

        // Inner glowing threshold
        if (y === 58) {
          setPixel(png, x, y, cLavaMid);
        }
      }
    }
  }

  // 10. Wall Sconce Torches by the Grand Gate
  for (const tx of [29, 50]) {
    // Sconce iron bracket
    setPixel(png, tx, 44, cIron);
    setPixel(png, tx, 45, cIron);
    setPixel(png, tx + (tx === 29 ? 1 : -1), 45, cIron);
    // Torch bowl
    setPixel(png, tx, 43, '#451a03');
    // Vivid living flame
    setPixel(png, tx, 42, cLavaMid);
    setPixel(png, tx, 41, cLavaGlow);
    setPixel(png, tx, 40, '#ffffff');
    setPixel(png, tx + (tx === 29 ? -1 : 1), 41, cLavaDark);
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

// 7. VILLAGE PROPS IN DETAILED 32x32 / ISOMETRIC 3/4 STYLE

// 7a. Stone Village Well (32x36)
function buildWell() {
  const W = 32, H = 36;
  const png = createEmpty(W, H);

  const cWoodDark = '#382b1d';
  const cWood = '#5b4a34';
  const cWoodLight = '#786245';
  const cShingleDark = '#1e293b';
  const cShingle = '#334155';
  const cShingleLight = '#475569';
  const cRope = '#d97706';
  const cWaterDark = '#0284c7';
  const cWaterLight = '#38bdf8';
  const cWaterFoam = '#e0f2fe';
  const cStoneDark = '#1e293b';
  const cStoneMid = '#334155';
  const cStoneLight = '#475569';
  const cStoneRim = '#64748b';

  // Soft base shadow
  for (let y = 32; y <= 35; y++) {
    for (let x = 3; x <= 28; x++) {
      const dx = (x - 15.5) / 13;
      const dy = (y - 33.5) / 2;
      if (dx * dx + dy * dy <= 1.0) setPixel(png, x, y, '#05070a');
    }
  }

  // Stone basin with isometric curved rim & deep water inside
  for (let y = 21; y <= 33; y++) {
    for (let x = 4; x <= 27; x++) {
      const dx = (x - 15.5) / 11.5;
      const dyTop = (y - 21.5) / 3.5;
      const isTopRim = (dx * dx + dyTop * dyTop <= 1.0) && y <= 24;

      if (isTopRim) {
        const isWater = (dx * dx * 1.5 + (y - 22.5) * (y - 22.5) <= 1.0);
        if (isWater) {
          const col = (x % 3 === 0 && y === 22) ? cWaterFoam : ((x + y) % 2 === 0 ? cWaterLight : cWaterDark);
          setPixel(png, x, y, col);
        } else {
          setPixel(png, x, y, y === 21 ? cStoneRim : cStoneLight);
        }
      } else if (y >= 23) {
        const isLeft = x <= 9;
        const isRight = x >= 22;
        const isMortar = (y % 4 === 0) || ((x + Math.floor(y / 4) * 3) % 5 === 0);
        let col = isMortar ? cStoneDark : (isLeft ? cStoneLight : (isRight ? cStoneDark : cStoneMid));
        if (y === 33) col = cStoneDark;
        setPixel(png, x, y, col);
      }
    }
  }

  // Timber upright posts
  for (let y = 11; y <= 24; y++) {
    for (let x = 6; x <= 8; x++) {
      setPixel(png, x, y, x === 6 ? cWoodLight : (x === 8 ? cWoodDark : cWood));
    }
    for (let x = 23; x <= 25; x++) {
      setPixel(png, x, y, x === 23 ? cWoodLight : (x === 25 ? cWoodDark : cWood));
    }
  }

  // Cross beam
  for (let x = 6; x <= 25; x++) {
    setPixel(png, x, 12, cWoodLight);
    setPixel(png, x, 13, cWood);
    setPixel(png, x, 14, cWoodDark);
  }
  setPixel(png, 9, 15, cWood); setPixel(png, 10, 16, cWoodLight);
  setPixel(png, 22, 15, cWood); setPixel(png, 21, 16, cWoodLight);

  // Spooled windlass axle & iron crank
  for (let x = 12; x <= 19; x++) {
    setPixel(png, x, 15, (x % 2 === 0) ? '#fde047' : cRope);
    setPixel(png, x, 16, (x % 2 === 0) ? cRope : '#92400e');
  }
  setPixel(png, 26, 15, '#94a3b8'); setPixel(png, 27, 15, '#64748b');
  setPixel(png, 27, 16, '#64748b'); setPixel(png, 27, 17, '#475569');

  // Suspended wooden bucket with water
  for (let y = 17; y <= 21; y++) setPixel(png, 15, y, cRope);
  for (let y = 20; y <= 23; y++) {
    for (let x = 13; x <= 17; x++) {
      let col = (y === 20 || x === 13 || x === 17) ? '#475569' : cWood;
      if (y === 21 && x >= 14 && x <= 16) col = cWaterLight;
      setPixel(png, x, y, col);
    }
  }

  // Gabled roof with shaded shingles
  for (let y = 3; y <= 11; y++) {
    const t = (y - 3) / 8;
    const span = Math.round(2 + t * 13);
    for (let x = 15 - span; x <= 16 + span; x++) {
      const isRidge = (x === 15 || x === 16);
      const isShingleEdge = (y % 3 === 0);
      let col = isRidge ? '#64748b' : (x < 15 ? cShingleLight : cShingle);
      if (isShingleEdge) col = cShingleLight;
      if (y === 11) col = cShingleDark;
      setPixel(png, x, y, col);
    }
  }

  applyOutline(png, '#090d16');
  return png;
}
fs.writeFileSync(path.join(outDir, 'well.png'), PNG.sync.write(buildWell()));

// 7b. Wrought Iron Brazier with Living Flame (24x30)
function buildBrazier() {
  const W = 24, H = 30;
  const png = createEmpty(W, H);

  const cIronDark = '#090d16';
  const cIron = '#1e293b';
  const cIronMid = '#334155';
  const cIronLight = '#64748b';
  const cCoal = '#450a0a';
  const cEmber = '#b91c1c';
  const cFlame1 = '#dc2626';
  const cFlame2 = '#f97316';
  const cFlame3 = '#fde047';
  const cFlameCore = '#ffffff';

  // Base shadow
  for (let x = 4; x <= 19; x++) setPixel(png, x, 28, '#05070a');

  // Curved Tripod Legs
  const legs = [
    [[5, 27], [6, 26], [7, 25], [8, 23], [9, 21], [10, 19]],
    [[11, 27], [11, 25], [11, 23], [11, 21], [11, 19]],
    [[18, 27], [17, 26], [16, 25], [15, 23], [14, 21], [13, 19]]
  ];
  for (const leg of legs) {
    for (const [lx, ly] of leg) {
      setPixel(png, lx, ly, cIron);
      setPixel(png, lx + 1, ly, cIronMid);
    }
  }
  // Iron support collar
  for (let x = 8; x <= 15; x++) setPixel(png, x, 22, cIronLight);

  // Flared Iron Bowl (x: 3..20, y: 14..19)
  for (let y = 14; y <= 19; y++) {
    const t = (y - 14) / 5;
    const w = Math.round(8 - t * 4);
    for (let x = 11 - w; x <= 12 + w; x++) {
      let col = (y === 14) ? cIronLight : (x < 11 ? cIronMid : (x > 13 ? cIronDark : cIron));
      if (y === 15 && x >= 7 && x <= 16) col = ((x + y) % 2 === 0) ? cEmber : cCoal;
      setPixel(png, x, y, col);
    }
  }
  // Side ring handles
  setPixel(png, 2, 16, cIronLight); setPixel(png, 2, 17, cIron);
  setPixel(png, 21, 16, cIronLight); setPixel(png, 21, 17, cIron);

  // Multi-tier living flame (White hot core -> Vivid orange -> Crimson tips)
  const flameRows = [
    { y: 13, xMin: 6, xMax: 17, col: cFlame2 },
    { y: 12, xMin: 7, xMax: 16, col: cFlame2 },
    { y: 11, xMin: 8, xMax: 15, col: cFlame3 },
    { y: 10, xMin: 8, xMax: 15, col: cFlame3 },
    { y: 9,  xMin: 9, xMax: 14, col: cFlameCore },
    { y: 8,  xMin: 9, xMax: 14, col: cFlameCore },
    { y: 7,  xMin: 10, xMax: 13, col: cFlame3 },
    { y: 6,  xMin: 10, xMax: 13, col: cFlame2 },
    { y: 5,  xMin: 11, xMax: 12, col: cFlame1 },
    { y: 4,  xMin: 11, xMax: 12, col: cFlame1 }
  ];
  for (const row of flameRows) {
    for (let x = row.xMin; x <= row.xMax; x++) {
      setPixel(png, x, row.y, row.col);
    }
  }
  // Flickering sparks & licking embers
  setPixel(png, 7, 10, cFlame1);
  setPixel(png, 16, 10, cFlame1);
  setPixel(png, 8, 7, cFlame2);
  setPixel(png, 15, 7, cFlame2);
  setPixel(png, 11, 3, cFlame1);
  setPixel(png, 13, 2, cFlame3);

  applyOutline(png, '#05070a');
  return png;
}
fs.writeFileSync(path.join(outDir, 'brazier_fire.png'), PNG.sync.write(buildBrazier()));

// 7c. Wrought Iron Lamppost (16x34)
function buildLamppost() {
  const W = 16, H = 34;
  const png = createEmpty(W, H);

  const cIronDark = '#020617';
  const cIron = '#1e293b';
  const cIronMid = '#334155';
  const cIronLight = '#64748b';
  const cGlass = '#e0f2fe';
  const cGlow = '#fde047';
  const cCore = '#ffffff';

  // Base shadow
  setPixel(png, 6, 33, '#05070a'); setPixel(png, 7, 33, '#05070a');
  setPixel(png, 8, 33, '#05070a'); setPixel(png, 9, 33, '#05070a');

  // Tiered pedestal
  for (let x = 5; x <= 10; x++) setPixel(png, x, 32, cIron);
  for (let x = 6; x <= 9; x++) setPixel(png, x, 31, cIronMid);
  for (let x = 6; x <= 9; x++) setPixel(png, x, 30, cIronLight);

  // Slender central post
  for (let y = 13; y <= 29; y++) {
    setPixel(png, 7, y, cIronLight);
    setPixel(png, 8, y, cIron);
  }
  // Post collars
  setPixel(png, 6, 21, cIronLight); setPixel(png, 9, 21, cIron);
  setPixel(png, 6, 13, cIronLight); setPixel(png, 9, 13, cIron);

  // Top scrolled iron bracket
  for (let x = 7; x <= 12; x++) setPixel(png, x, 8, cIronMid);
  setPixel(png, 13, 9, cIronLight); setPixel(png, 13, 10, cIron);

  // Glass lantern housing (x: 10..14, y: 11..18)
  for (let x = 10; x <= 14; x++) {
    setPixel(png, x, 11, cIronMid); // Cap
    setPixel(png, x, 18, cIron);    // Finial cup
  }
  for (let y = 12; y <= 17; y++) {
    setPixel(png, 10, y, cIronDark);
    setPixel(png, 14, y, cIronDark);
    for (let x = 11; x <= 13; x++) {
      let col = (y === 14 && x === 12) ? cCore : (y >= 13 && y <= 15 ? cGlow : cGlass);
      setPixel(png, x, y, col);
    }
  }
  // Pinnacle
  setPixel(png, 12, 10, cIronLight);
  setPixel(png, 12, 19, cIronDark);

  applyOutline(png, '#020617');
  return png;
}
fs.writeFileSync(path.join(outDir, 'lamppost.png'), PNG.sync.write(buildLamppost()));

// 7d. Star Fountain (48x36)
function buildFountain() {
  const W = 48, H = 36;
  const png = createEmpty(W, H);

  const cStoneLight = '#94a3b8';
  const cStoneMid = '#64748b';
  const cStoneDark = '#334155';
  const cWaterLight = '#7dd3fc';
  const cWaterMid = '#0284c7';
  const cFoam = '#ffffff';

  // Base shadow
  for (let y = 30; y <= 35; y++) {
    for (let x = 4; x <= 43; x++) {
      const dx = (x - 23.5) / 19;
      const dy = (y - 32.5) / 2.5;
      if (dx * dx + dy * dy <= 1.0) setPixel(png, x, y, '#05070a');
    }
  }

  // Lower monumental stone basin (Isometric 3/4)
  for (let y = 18; y <= 32; y++) {
    for (let x = 4; x <= 43; x++) {
      const dx = (x - 23.5) / 18.5;
      const dyTop = (y - 19) / 5;
      const isTop = (dx * dx + dyTop * dyTop <= 1.0) && y <= 23;

      if (isTop) {
        const isWater = (dx * dx * 1.3 + (y - 20) * (y - 20) / 4 <= 1.0);
        if (isWater) {
          const col = ((x + y) % 3 === 0) ? cFoam : ((x % 2 === 0) ? cWaterLight : cWaterMid);
          setPixel(png, x, y, col);
        } else {
          setPixel(png, x, y, y === 18 ? cStoneLight : cStoneMid);
        }
      } else if (y >= 22) {
        const isMortar = (y % 4 === 0) || ((x + y) % 6 === 0);
        setPixel(png, x, y, isMortar ? cStoneDark : (x < 24 ? cStoneLight : cStoneMid));
      }
    }
  }

  // Central column pedestal & upper basin
  for (let y = 10; y <= 20; y++) {
    for (let x = 21; x <= 26; x++) {
      setPixel(png, x, y, (x === 21) ? cStoneLight : (x === 26 ? cStoneDark : cStoneMid));
    }
  }
  // Upper cup (x: 17..30, y: 10..13)
  for (let y = 10; y <= 13; y++) {
    for (let x = 17; x <= 30; x++) {
      const isEdge = (x === 17 || x === 30 || y === 10);
      setPixel(png, x, y, isEdge ? cStoneLight : cWaterLight);
    }
  }

  // Sparkling Water Jet & Cascade Sprays
  for (let y = 2; y <= 9; y++) {
    setPixel(png, 23, y, cFoam);
    setPixel(png, 24, y, cWaterLight);
  }
  setPixel(png, 22, 5, cWaterLight); setPixel(png, 25, 5, cFoam);
  setPixel(png, 20, 8, cWaterLight); setPixel(png, 27, 8, cWaterLight);
  setPixel(png, 19, 11, cFoam); setPixel(png, 28, 11, cFoam);

  applyOutline(png, '#020617');
  return png;
}
fs.writeFileSync(path.join(outDir, 'fountain.png'), PNG.sync.write(buildFountain()));

console.log('All world sprites refined successfully!');
