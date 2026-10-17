import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';

const outDir = 'D:/Dev/survivor-game/assets/sprites/world';

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

function getPixel(png, x, y) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return null;
  const idx = (y * png.width + x) * 4;
  if (png.data[idx + 3] === 0) return null;
  return [png.data[idx], png.data[idx + 1], png.data[idx + 2], png.data[idx + 3]];
}

function createEmpty(w, h) {
  const png = new PNG({ width: w, height: h });
  for (let i = 0; i < w * h * 4; i += 4) png.data[i + 3] = 0;
  return png;
}

function applyOutline(png, edgeHex = '#1e293b') {
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

// Serene Village matching palette
const C = {
  // Bark
  barkEdge: '#3a3a50',
  barkDark: '#6b5437',
  barkMid: '#a9835f',
  barkLight: '#d0a86e',

  // Evergreen Needles (Deep alpine emerald and spruce shades)
  needlesShadow: '#1e382b',
  needlesDark: '#23533e',
  needlesMid: '#2e7456',
  needlesLight: '#439973',
  needlesBright: '#62be92',

  // Snow Pillow & Frost
  snowPure: '#ffffff',
  snowLight: '#e2e8f0',
  snowMid: '#cbd5e1',
  snowShadow: '#94a3b8',
  snowDeep: '#64748b'
};

/**
 * Disegna un ciuffo organico a ventaglio per i rami di pino
 */
function drawBough(png, cx, cy, rx, ry, hasSnow = true) {
  for (let dy = -ry; dy <= ry; dy++) {
    for (let dx = -rx; dx <= rx; dx++) {
      const dist = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
      if (dist <= 1.0) {
        const px = cx + dx;
        const py = cy + dy;
        // Shading organico basato su luce in alto a sinistra (-0.6, -0.8)
        const lit = (-dx * 0.7 - dy * 1.0) / Math.max(rx, ry);
        let col = C.needlesMid;
        if (lit < -0.4) col = C.needlesShadow;
        else if (lit < 0.0) col = C.needlesDark;
        else if (lit > 0.45) col = C.needlesBright;
        else if (lit > 0.15) col = C.needlesLight;

        setPixel(png, px, py, col);
      }
    }
  }

  // Frange e aghi pendenti sul bordo inferiore
  for (let dx = -rx + 1; dx <= rx - 1; dx += 2) {
    const tipY = cy + Math.round(ry * Math.sqrt(Math.max(0, 1 - (dx * dx) / (rx * rx))));
    setPixel(png, cx + dx, tipY, C.needlesDark);
    setPixel(png, cx + dx, tipY + 1, C.needlesShadow);
  }

  // Cappa di neve organica sopra il ramo
  if (hasSnow) {
    for (let dx = -rx + 1; dx <= rx - 1; dx++) {
      const topY = cy - Math.round(ry * Math.sqrt(Math.max(0, 1 - (dx * dx) / (rx * rx))));
      const thickness = Math.max(1, Math.round((ry * 0.45) * (1 - Math.abs(dx) / rx)));
      for (let t = 0; t <= thickness; t++) {
        const sy = topY + t;
        let sCol = C.snowMid;
        if (t === 0) sCol = (dx < 0) ? C.snowPure : C.snowLight;
        else if (t === 1) sCol = (dx < 0) ? C.snowLight : C.snowMid;
        else sCol = C.snowShadow;
        setPixel(png, cx + dx, sy, sCol);
      }
      // Ghiacciolo occasionale
      if (Math.abs(dx) % 5 === 2 && thickness >= 2) {
        setPixel(png, cx + dx, topY + thickness + 1, C.snowLight);
        setPixel(png, cx + dx, topY + thickness + 2, C.snowPure);
      }
    }
  }
}

/**
 * 1. PINO MEDIO (32 x 48 px) - Grandezza equivalente alle querce di Serene Village
 */
function buildPineMedium() {
  const W = 32, H = 48;
  const png = createEmpty(W, H);
  const cx = 16;

  // Tronco in legno con corteccia scanalata e radici
  for (let y = 30; y <= 45; y++) {
    const flare = y >= 43 ? (y - 42) : 0;
    for (let x = cx - 2 - flare; x <= cx + 2 + flare; x++) {
      let col = C.barkMid;
      if (x === cx - 2 - flare) col = C.barkLight;
      else if (x === cx + 2 + flare) col = C.barkDark;
      else if ((x + y) % 3 === 0) col = C.barkDark;
      setPixel(png, x, y, col);
    }
  }

  // 3 Balze di rami a cono con frange di aghi e neve soffice
  // Balza 3 (Inferiore - Più larga)
  drawBough(png, cx - 6, 32, 7, 5, true);
  drawBough(png, cx + 6, 32, 7, 5, true);
  drawBough(png, cx, 30, 9, 6, true);

  // Balza 2 (Media)
  drawBough(png, cx - 5, 23, 6, 4, true);
  drawBough(png, cx + 5, 23, 6, 4, true);
  drawBough(png, cx, 21, 8, 5, true);

  // Balza 1 (Cima/Apice)
  drawBough(png, cx - 3, 13, 5, 4, true);
  drawBough(png, cx + 3, 13, 5, 4, true);
  drawBough(png, cx, 11, 5, 5, true);

  // Punta innevata
  for (let y = 3; y <= 8; y++) {
    const w = Math.round((y - 3) * 0.8);
    for (let x = cx - w; x <= cx + w; x++) {
      const col = (x < cx) ? C.snowPure : (x === cx ? C.snowLight : C.snowMid);
      setPixel(png, x, y, col);
    }
  }
  setPixel(png, cx, 2, C.snowPure);

  applyOutline(png, '#090d16');
  return png;
}

/**
 * 2. PINO GRANDE (36 x 60 px) - Pino maestoso montano
 */
function buildPineLarge() {
  const W = 36, H = 60;
  const png = createEmpty(W, H);
  const cx = 18;

  // Tronco più alto e robusto
  for (let y = 38; y <= 57; y++) {
    const flare = y >= 54 ? Math.round((y - 53) * 1.2) : 0;
    for (let x = cx - 3 - flare; x <= cx + 3 + flare; x++) {
      let col = C.barkMid;
      if (x === cx - 3 - flare) col = C.barkLight;
      else if (x === cx + 3 + flare) col = C.barkDark;
      else if ((x + y * 2) % 4 === 0) col = C.barkDark;
      setPixel(png, x, y, col);
    }
  }

  // 4 Balze di rami montani maestosi
  // Balza 4 (Base maestosa)
  drawBough(png, cx - 8, 41, 9, 6, true);
  drawBough(png, cx + 8, 41, 9, 6, true);
  drawBough(png, cx, 39, 12, 7, true);

  // Balza 3 (Inferiore)
  drawBough(png, cx - 7, 31, 8, 5, true);
  drawBough(png, cx + 7, 31, 8, 5, true);
  drawBough(png, cx, 29, 10, 6, true);

  // Balza 2 (Media)
  drawBough(png, cx - 5, 21, 6, 5, true);
  drawBough(png, cx + 5, 21, 6, 5, true);
  drawBough(png, cx, 19, 8, 5, true);

  // Balza 1 (Cima/Apice)
  drawBough(png, cx - 3, 11, 5, 4, true);
  drawBough(png, cx + 3, 11, 5, 4, true);
  drawBough(png, cx, 9, 6, 5, true);

  // Guglia innevata apicale
  for (let y = 2; y <= 7; y++) {
    const w = Math.round((y - 2) * 0.75);
    for (let x = cx - w; x <= cx + w; x++) {
      const col = (x < cx) ? C.snowPure : (x === cx ? C.snowLight : C.snowMid);
      setPixel(png, x, y, col);
    }
  }
  setPixel(png, cx, 1, C.snowPure);

  applyOutline(png, '#090d16');
  return png;
}

const pineMed = buildPineMedium();
const pineLarge = buildPineLarge();

fs.writeFileSync(path.join(outDir, 'tree_pine.png'), PNG.sync.write(pineMed));
fs.writeFileSync(path.join(outDir, 'tree_pine_med.png'), PNG.sync.write(pineMed));
fs.writeFileSync(path.join(outDir, 'tree_pine_large.png'), PNG.sync.write(pineLarge));

console.log('✓ Pines generated successfully: tree_pine.png (32x48), tree_pine_large.png (36x60)');
