/**
 * world/tiles.js - Motore di Autotiling Pixel Art 16-bit Multibioma (Foresta, Neve, Deserto, Vulcano, Paesino)
 * Genera scogliere 3D, coste, lava, neve, dune, case ed edifici fantasy ispirati ai grandi classici RPG.
 */

function rgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function pack(hex, a = 255) {
  const [r, g, b] = rgb(hex);
  return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

function mixPack(h1, h2, t) {
  const a = rgb(h1), b = rgb(h2);
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return ((255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0;
}

function Pix(w, h) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d');
  const img = c.createImageData(w, h);
  const buf = new Uint32Array(img.data.buffer);
  return {
    w, h,
    set(x, y, col) {
      if (x >= 0 && y >= 0 && x < w && y < h) {
        buf[y * w + x] = col;
      }
    },
    get(x, y) {
      return (x >= 0 && y >= 0 && x < w && y < h) ? buf[y * w + x] : 0;
    },
    canvas() {
      c.putImageData(img, 0, 0);
      return cv;
    }
  };
}

function hash(x, y, s = 0) {
  let h = (x * 374761393 + y * 668265263 + (s + 13) * 1442695040888963407) ^ 0x5bf03635;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export const Tiles = (() => {
  const T = 16; // Tile nativo 16x16 pixel

  // =========================================================================
  // DEFINIZIONE DEI 5 BIOMI FANTASY
  // =========================================================================
  const BIOME_DATA = {
    forest: {
      floor: ['#4d7338', '#5b8543', '#436630'],
      dirt: ['#69563d', '#786245', '#5b4a34'],
      speck: '#354f26',
      light: '#72a654',
      flowers: ['#fde047', '#f472b6', '#38bdf8', '#ffffff'],
      wallTop: ['#64748b', '#718096', '#526075'],
      wallLight: '#94a3b8',
      wallEdge: '#1e293b',
      wallFace: ['#475569', '#3b4759'],
      wallFaceDark: '#0f172a',
      liq: '#0284c7',
      liqDeep: '#0369a1',
      foam: '#bae6fd',
      shore: '#3d4f2a'
    },
    snow: {
      floor: ['#e2e8f0', '#f1f5f9', '#cbd5e1'],
      dirt: ['#94a3b8', '#a8b8cc', '#64748b'],
      speck: '#94a3b8',
      light: '#ffffff',
      flowers: ['#bfdbfe', '#ffffff', '#93c5fd'],
      wallTop: ['#cbd5e1', '#e2e8f0', '#94a3b8'],
      wallLight: '#ffffff',
      wallEdge: '#334155',
      wallFace: ['#64748b', '#475569'],
      wallFaceDark: '#1e293b',
      liq: '#1d4ed8',
      liqDeep: '#1e3a8a',
      foam: '#bfdbfe',
      shore: '#94a3b8'
    },
    desert: {
      floor: ['#d97706', '#eab308', '#ca8a04'],
      dirt: ['#b45309', '#92400e', '#78350f'],
      speck: '#92400e',
      light: '#fde047',
      flowers: ['#ef4444', '#f97316', '#fbbf24'],
      wallTop: ['#c2410c', '#ea580c', '#9a3412'],
      wallLight: '#fb923c',
      wallEdge: '#7c2d12',
      wallFace: ['#9a3412', '#7c2d12'],
      wallFaceDark: '#431407',
      liq: '#0284c7',
      liqDeep: '#0369a1',
      foam: '#7dd3fc',
      shore: '#b45309'
    },
    volcano: {
      floor: ['#18181b', '#27272a', '#09090b'],
      dirt: ['#451a03', '#78350f', '#27272a'],
      speck: '#ea580c',
      light: '#f97316',
      flowers: ['#f97316', '#ef4444', '#facc15'],
      wallTop: ['#0f172a', '#1e293b', '#090d16'],
      wallLight: '#475569',
      wallEdge: '#020617',
      wallFace: ['#1e1b4b', '#0f172a'],
      wallFaceDark: '#020617',
      liq: '#dc2626',
      liqDeep: '#991b1b',
      foam: '#facc15', // Schiuma incandescente di lava!
      shore: '#78350f'
    },
    village: {
      floor: ['#64748b', '#718096', '#526075'], // Lastricato in pietra
      dirt: ['#475569', '#334155', '#475569'],  // Sentieri di ciottoli
      speck: '#334155',
      light: '#94a3b8',
      flowers: ['#fde047', '#f472b6', '#ffffff'],
      wallTop: ['#475569', '#526075', '#334155'],
      wallLight: '#94a3b8',
      wallEdge: '#0f172a',
      wallFace: ['#334155', '#1e293b'],
      wallFaceDark: '#0f172a',
      liq: '#0284c7',
      liqDeep: '#0369a1',
      foam: '#e0f2fe',
      shore: '#475569'
    },
    river: {
      floor: ['#16a34a', '#22c55e', '#15803d'], // Sponde verdi e fresche del fiume
      dirt: ['#0284c7', '#0369a1', '#38bdf8'],  // Rive sabbiose e fondale
      speck: '#14532d',
      light: '#4ade80',
      flowers: ['#38bdf8', '#67e8f9', '#f472b6', '#ffffff'], // Ninfee e cannette fiorite
      wallTop: ['#475569', '#64748b', '#334155'], // Scogliere della cascata
      wallLight: '#94a3b8',
      wallEdge: '#1e293b',
      wallFace: ['#334155', '#1e293b'],
      wallFaceDark: '#0f172a',
      liq: '#0284c7',
      liqDeep: '#0369a1',
      foam: '#ffffff', // Schiuma bianca spumeggiante della cascata
      shore: '#15803d'
    }
  };

  // Pre-pack dei colori in Little-Endian per massima velocità a 60 FPS
  const PALETTES = {};
  for (const [name, B] of Object.entries(BIOME_DATA)) {
    const C = {};
    for (const k of ['floor', 'dirt', 'wallTop', 'wallFace', 'flowers']) {
      C[k] = B[k].map(h => pack(h));
    }
    for (const k of ['speck', 'light', 'wallLight', 'wallEdge', 'wallFaceDark', 'liq', 'liqDeep', 'foam', 'shore']) {
      C[k] = pack(B[k]);
    }
    C.liqLight = mixPack(B.liq, B.foam, 0.35);
    PALETTES[name] = C;
  }

  function dirtMask(gx0, gy0, W, seed) {
    const S = 4, gw = Math.floor(W / S) + 3;
    const grid = new Float32Array(gw * gw);
    for (let j = 0; j < gw; j++) {
      for (let i = 0; i < gw; i++) {
        const x = (gx0 + (i - 1) * S) * 0.04;
        const y = (gy0 + (j - 1) * S) * 0.04;
        grid[j * gw + i] = (Math.sin(x) + Math.cos(y) + hash(Math.floor(x), Math.floor(y), seed)) * 0.5;
      }
    }
    const mask = new Uint8Array(W * (W + 1));
    for (let y = -1; y < W; y++) {
      const fy = (y + S) / S, j = Math.floor(fy), v = fy - j;
      for (let x = 0; x < W; x++) {
        const fx = (x + S) / S, i = Math.floor(fx), u = fx - i;
        const a = grid[j * gw + i], b = grid[j * gw + i + 1];
        const c = grid[(j + 1) * gw + i], d = grid[(j + 1) * gw + i + 1];
        let val = (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
        mask[(y + 1) * W + x] = val > 0.42 ? 1 : 0;
      }
    }
    return (x, y) => mask[(y + 1) * W + x] === 1;
  }

  function paintFloor(P, C, ox, oy, tx, ty, dirtAt, at, biome) {
    const kind = at(tx, ty);

    // 1. Ponte in legno attraversabile sopra il fiume
    if (kind === 'bridge') {
      const cWoodDark = pack('#3e2723');
      const cWoodMid = pack('#5d4037');
      const cWoodLight = pack('#8d6e63');
      const cNail = pack('#1e293b');
      for (let y = 0; y < T; y++) {
        for (let x = 0; x < T; x++) {
          const isPlankEdge = (y % 4 === 0) || (x === 0 || x === T - 1);
          let col = isPlankEdge ? cWoodDark : (hash(tx * T + x, ty * T + y, 5) > 0.5 ? cWoodMid : cWoodLight);
          if ((x === 2 || x === T - 3) && (y % 4 === 2)) col = cNail;
          P.set(ox + x, oy + y, col);
        }
      }
      return;
    }

    // 2. Strade principali e sentieri battuti di collegamento
    if (kind === 'road') {
      const cCobbleBase = pack('#64748b');
      const cCobbleLight = pack('#94a3b8');
      const cCobbleDark = pack('#334155');
      const cEarth = pack('#475569');
      for (let y = 0; y < T; y++) {
        for (let x = 0; x < T; x++) {
          const gx = tx * T + x, gy = ty * T + y;
          const isPebbleEdge = (gx % 5 === 0 || gy % 5 === 0);
          let col = isPebbleEdge ? cCobbleDark : (hash(gx, gy, 8) > 0.4 ? cCobbleLight : cCobbleBase);
          if (hash(gx >> 1, gy >> 1, 9) < 0.2) col = cEarth;
          P.set(ox + x, oy + y, col);
        }
      }
      return;
    }

    // 3. Guadi e acque basse attraversabili del fiume
    if (kind === 'shallow') {
      const cSand = pack('#0284c7');
      const cWater1 = pack('#38bdf8');
      const cWater2 = pack('#7dd3fc');
      const cFoam = pack('#e0f2fe');
      for (let y = 0; y < T; y++) {
        for (let x = 0; x < T; x++) {
          const gx = tx * T + x, gy = ty * T + y;
          const wave = hash(gx >> 1, gy >> 1, 19);
          let col = wave > 0.6 ? cWater2 : (wave > 0.25 ? cWater1 : cSand);
          if (hash(gx, gy, 20) < 0.08) col = cFoam;
          P.set(ox + x, oy + y, col);
        }
      }
      return;
    }

    let dirtCount = 0;
    const isVillage = biome === 'village';

    for (let y = 0; y < T; y++) {
      for (let x = 0; x < T; x++) {
        const gx = tx * T + x, gy = ty * T + y;
        const lx = ox + x, ly = oy + y;
        const isDirt = dirtAt(lx, ly);
        if (isDirt) dirtCount++;
        const pal = isDirt ? C.dirt : C.floor;

        const band = hash(gx >> 2, gy >> 2, 11) * 0.7 + hash(gx, gy, 12) * 0.5;
        let col = pal[Math.min(pal.length - 1, Math.floor(band * pal.length / 1.2))];

        const r = hash(gx, gy, 13);
        if (r < 0.04) col = C.speck;
        else if (r > 0.98) col = C.light;

        // Trama lastricata per il villaggio
        if (isVillage) {
          if ((x % 8 === 0 || y % 8 === 0) && (x + y) % 2 === 0) {
            col = C.speck;
          }
        }

        if (isDirt && !dirtAt(lx, ly - 1)) col = C.speck;
        else if (!isDirt && dirtAt(lx, ly - 1) && r < 0.5) col = C.light;

        P.set(ox + x, oy + y, col);
      }
    }

    // Ombra pareti a nord
    if (at(tx, ty - 1) === 'wall') {
      for (let x = 0; x < T; x++) {
        P.set(ox + x, oy, C.wallFaceDark);
        if ((x + ty) % 2 === 0) P.set(ox + x, oy + 1, C.speck);
      }
    }

    // Dettagli decorativi (fiori o erba/braci)
    const d = hash(tx, ty, 14);
    const fx = ox + 3 + Math.floor(hash(tx, ty, 15) * 10);
    const fy = oy + 4 + Math.floor(hash(tx, ty, 16) * 9);
    if (dirtCount <= (T * T) / 2 && !isVillage) {
      if (d < 0.18) {
        P.set(fx, fy, C.light);
        P.set(fx - 1, fy - 1, C.light);
        P.set(fx + 1, fy - 1, C.light);
      } else if (d > 0.88) {
        const fCol = C.flowers[Math.floor(hash(tx, ty, 17) * C.flowers.length)];
        P.set(fx, fy, fCol);
        P.set(fx, fy + 1, C.speck);
      }
    }
  }

  function paintWall(P, C, ox, oy, tx, ty, at) {
    const W = (x, y) => at(x, y) === 'wall';
    const n = W(tx, ty - 1), s = W(tx, ty + 1), w = W(tx - 1, ty), e = W(tx + 1, ty);
    const FACE = s ? 0 : 6;

    for (let y = 0; y < T; y++) {
      for (let x = 0; x < T; x++) {
        if (!n && !w && x + y < 3) continue;
        if (!n && !e && (T - 1 - x) + y < 3) continue;
        if (!s && !w && x + (T - 1 - y) < 2) continue;
        if (!s && !e && (T - 1 - x) + (T - 1 - y) < 2) continue;

        const gx = tx * T + x, gy = ty * T + y;
        let col;

        if (y >= T - FACE) {
          const fy = y - (T - FACE);
          col = C.wallFace[(x + (hash(gx, 0, 21) < 0.5 ? 0 : 1)) % 3 === 0 ? 1 : 0];
          if (fy === 0) col = C.wallEdge;
          else if (y === T - 1) col = C.wallFaceDark;
          else if (hash(gx, gy, 22) < 0.08) col = C.wallFaceDark;
        } else {
          col = C.wallTop[Math.floor(hash(gx >> 1, gy >> 1, 23) * 2.2 + hash(gx, gy, 24) * 0.8) % C.wallTop.length];
          if (hash(gx, gy, 25) < 0.06) col = C.wallLight;

          if (!n && y === 0) col = C.wallEdge;
          else if (!n && y === 1) col = C.wallLight;
          if (!w && x === 0) col = C.wallEdge;
          if (!e && x === T - 1) col = C.wallEdge;
        }

        P.set(ox + x, oy + y, col);
      }
    }
  }

  function paintLiquid(P, C, ox, oy, tx, ty, at) {
    const L = (x, y) => at(x, y) === 'liquid';
    const n = L(tx, ty - 1), s = L(tx, ty + 1), w = L(tx - 1, ty), e = L(tx + 1, ty);
    const nw = L(tx - 1, ty - 1), ne = L(tx + 1, ty - 1), sw = L(tx - 1, ty + 1), se = L(tx + 1, ty + 1);
    const BIG = 99;

    for (let y = 0; y < T; y++) {
      for (let x = 0; x < T; x++) {
        if (!n && !w && x + y < 3) continue;
        if (!n && !e && (T - 1 - x) + y < 3) continue;
        if (!s && !w && x + (T - 1 - y) < 3) continue;
        if (!s && !e && (T - 1 - x) + (T - 1 - y) < 3) continue;

        let d = Math.min(n ? BIG : y, s ? BIG : T - 1 - y, w ? BIG : x, e ? BIG : T - 1 - x);
        if (n && w && !nw) d = Math.min(d, Math.hypot(x, y) - 0.5);
        if (n && e && !ne) d = Math.min(d, Math.hypot(T - 1 - x, y) - 0.5);
        if (s && w && !sw) d = Math.min(d, Math.hypot(x, T - 1 - y) - 0.5);
        if (s && e && !se) d = Math.min(d, Math.hypot(T - 1 - x, T - 1 - y) - 0.5);

        const gx = tx * T + x, gy = ty * T + y;
        const r = hash(gx, gy, 31);
        let col;

        if (d < 1) col = C.shore;
        else if (d < 2) col = C.foam;
        else if (d < 4) col = C.liqLight;
        else if (d < 7) col = r < 0.5 ? C.liq : C.liqLight;
        else col = C.liqDeep;

        if (d >= 3 && hash(gx >> 2, gy, 33) < 0.05 && (gx & 3) !== 3) {
          col = C.liqLight;
        }

        P.set(ox + x, oy + y, col);
      }
    }
  }

  // =========================================================================
  // GENERATORI PROCEDURALI DI PROPS & EDIFICI (Pixel Art 16-bit)
  // =========================================================================
  function disc(P, cx, cy, r, colFn) {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d <= r) {
          const c = colFn(x, y, d / r);
          if (c != null) P.set(x, y, c);
        }
      }
    }
  }

  function outline(P, col) {
    const marks = [];
    for (let y = 0; y < P.h; y++) {
      for (let x = 0; x < P.w; x++) {
        if (P.get(x, y) >>> 24) continue;
        const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => {
          const xx = x + a, yy = y + b;
          return xx >= 0 && yy >= 0 && xx < P.w && yy < P.h && (P.get(xx, yy) >>> 24);
        });
        if (near) marks.push([x, y]);
      }
    }
    for (const [x, y] of marks) P.set(x, y, col);
  }

  // 1. Quercia della Foresta
  function paintTree() {
    const P = Pix(32, 42);
    const L = ['#166534', '#15803d', '#22c55e', '#4ade80'].map(h => pack(h));
    const Tr = ['#451a03', '#78350f'].map(h => pack(h));
    const edge = pack('#0f172a');

    for (let y = 26; y < 40; y++) {
      for (let x = 14; x < 19; x++) P.set(x, y, Tr[x === 14 || x === 18 ? 0 : 1]);
    }
    P.set(13, 39, Tr[0]);
    P.set(19, 39, Tr[0]);

    const foliage = [[16, 20, 11], [9, 17, 8], [23, 17, 8], [16, 11, 9], [11, 23, 7], [21, 23, 7]];
    for (const [bx, by, br] of foliage) {
      disc(P, bx, by, br, (x, y) => {
        const lit = ((x - bx) * -0.6 + (y - by) * -0.8) / br;
        const idx = lit > 0.4 ? 3 : lit > 0.05 ? 2 : lit > -0.4 ? 1 : 0;
        return (hash(x, y, 41) < 0.15 && idx > 0) ? L[idx - 1] : L[idx];
      });
    }
    outline(P, edge);
    return P.canvas();
  }

  // 2. Abete Innevato (Montagne / Neve)
  function paintPine() {
    const P = Pix(32, 46);
    const green = pack('#064e3b');
    const snow = pack('#f8fafc');
    const snowShadow = pack('#cbd5e1');
    const trunk = pack('#451a03');
    const edge = pack('#090d16');

    // Tronco
    for (let y = 36; y < 44; y++) {
      for (let x = 14; x <= 17; x++) P.set(x, y, trunk);
    }

    // 3 Livelli di chioma a triangolo con neve
    const tiers = [
      { yTop: 6, yBot: 18, wMax: 9 },
      { yTop: 15, yBot: 28, wMax: 13 },
      { yTop: 24, yBot: 38, wMax: 16 }
    ];

    for (const tier of tiers) {
      for (let y = tier.yTop; y <= tier.yBot; y++) {
        const span = Math.round(((y - tier.yTop) / (tier.yBot - tier.yTop)) * tier.wMax);
        for (let x = 16 - span; x <= 16 + span; x++) {
          const isSnow = (y - tier.yTop) < 3;
          P.set(x, y, isSnow ? (x % 2 === 0 ? snow : snowShadow) : green);
        }
      }
    }
    outline(P, edge);
    return P.canvas();
  }

  // 3. Cactus Saguaro (Deserto)
  function paintCactus() {
    const P = Pix(26, 38);
    const cMain = pack('#15803d');
    const cLight = pack('#22c55e');
    const cDark = pack('#14532d');
    const edge = pack('#052e16');

    // Fusto centrale
    for (let y = 6; y < 36; y++) {
      for (let x = 11; x <= 15; x++) {
        P.set(x, y, x === 11 ? cLight : (x === 15 ? cDark : cMain));
      }
    }
    // Braccio sinistro
    for (let x = 4; x <= 11; x++) P.set(x, 22, cMain);
    for (let y = 14; y <= 22; y++) {
      P.set(4, y, cLight);
      P.set(5, y, cMain);
    }
    // Braccio destro
    for (let x = 15; x <= 22; x++) P.set(x, 18, cMain);
    for (let y = 10; y <= 18; y++) {
      P.set(21, y, cMain);
      P.set(22, y, cDark);
    }
    outline(P, edge);
    return P.canvas();
  }

  // 4. Roccia Magmatica con crepe incandescenti (Vulcano)
  function paintVolcanoRock() {
    const P = Pix(26, 20);
    const cDark = pack('#09090b');
    const cMid = pack('#27272a');
    const cFire = pack('#ea580c');
    const cYellow = pack('#facc15');
    const edge = pack('#000000');

    for (let y = 2; y <= 17; y++) {
      for (let x = 2; x <= 23; x++) {
        const nx = (x - 12.5) / 10.5;
        const ny = (y - 9.5) / 7.5;
        if (nx * nx + ny * ny > 1) continue;
        let c = hash(x, y, 91) > 0.4 ? cDark : cMid;
        // Crepa di lava ardente
        if (Math.abs(x - y + 2) <= 1 && y > 5 && y < 15) {
          c = hash(x, y, 92) > 0.5 ? cFire : cYellow;
        }
        P.set(x, y, c);
      }
    }
    outline(P, edge);
    return P.canvas();
  }

  // 5. Roccia standard (Foresta/Deserto)
  function paintRock(colorType = 'slate') {
    const P = Pix(24, 18);
    const R = colorType === 'sand' 
      ? ['#7c2d12', '#c2410c', '#fb923c'].map(h => pack(h))
      : ['#475569', '#64748b', '#94a3b8'].map(h => pack(h));
    const edge = pack('#0f172a');

    for (let y = 2; y <= 15; y++) {
      for (let x = 2; x <= 21; x++) {
        const nx = (x - 11.5) / 9.5;
        const ny = (y - 9.5) / 7;
        if (nx * nx + ny * ny > 1) continue;
        const lit = -nx * 0.55 - ny * 0.85;
        let c = R[lit > 0.35 ? 2 : lit > -0.1 ? 1 : 0];
        if (y >= 14) c = R[0];
        P.set(x, y, c);
      }
    }
    outline(P, edge);
    return P.canvas();
  }

  // 6. Edificio / Casa del Paesino (Ispirato agli edifici 16-bit del reverse engineering)
  function paintHouse(roofType = 'red') {
    const W = 64; // 4 tile di larghezza
    const H = 54; // Altezza complessiva
    const P = Pix(W, H);

    const isRed = roofType === 'red';
    const cRoofDark = pack(isRed ? '#991b1b' : '#1e3a8a');
    const cRoofMain = pack(isRed ? '#dc2626' : '#2563eb');
    const cRoofLight = pack(isRed ? '#ef4444' : '#60a5fa');
    const cWallStone = pack('#e2e8f0');
    const cWallShadow = pack('#94a3b8');
    const cBeamWood = pack('#451a03');
    const cDoor = pack('#78350f');
    const cWindowGlow = pack('#fde047');
    const cWindowFrame = pack('#1e293b');
    const cChimney = pack('#475569');
    const cEdge = pack('#090d16');

    // Camino sul tetto
    for (let y = 4; y <= 16; y++) {
      for (let x = 10; x <= 16; x++) P.set(x, y, cChimney);
    }
    for (let x = 9; x <= 17; x++) P.set(x, 4, cEdge); // Coperchio camino

    // Muri della casa (piani inferiori)
    for (let y = 26; y < 50; y++) {
      for (let x = 8; x < 56; x++) {
        const isStone = (x % 6 === 0 || y % 6 === 0) ? cWallShadow : cWallStone;
        P.set(x, y, isStone);
      }
    }

    // Travi in legno verticali e zoccolo di pietra
    for (let y = 26; y < 50; y++) {
      P.set(8, y, cBeamWood);
      P.set(9, y, cBeamWood);
      P.set(54, y, cBeamWood);
      P.set(55, y, cBeamWood);
      P.set(31, y, cBeamWood);
      P.set(32, y, cBeamWood);
    }
    for (let x = 7; x <= 56; x++) {
      P.set(x, 49, cBeamWood);
      P.set(x, 50, cEdge);
    }

    // Porta in legno con arco
    for (let y = 35; y < 49; y++) {
      for (let x = 28; x <= 35; x++) P.set(x, y, cDoor);
    }
    P.set(34, 42, pack('#facc15')); // Maniglia d'oro

    // Finestre calde illuminate a sinistra e destra
    const windows = [16, 42];
    for (const wx of windows) {
      for (let y = 33; y <= 41; y++) {
        for (let x = wx; x <= wx + 7; x++) {
          const isFrame = x === wx || x === wx + 7 || y === 33 || y === 41 || x === wx + 3 || y === 37;
          P.set(x, y, isFrame ? cWindowFrame : cWindowGlow);
        }
      }
    }

    // Tetto a spiovente con tegole
    const roofTopY = 8;
    const roofBotY = 27;
    for (let y = roofTopY; y <= roofBotY; y++) {
      const span = Math.round(((y - roofTopY) / (roofBotY - roofTopY)) * 28);
      for (let x = 32 - span; x <= 32 + span; x++) {
        const isBorder = x === 32 - span || x === 32 + span;
        const shingle = (y % 3 === 0) ? cRoofLight : (isBorder ? cRoofDark : cRoofMain);
        P.set(x, y, shingle);
      }
    }

    // Grondaia
    for (let x = 3; x <= 61; x++) P.set(x, 27, cBeamWood);

    outline(P, cEdge);
    return P.canvas();
  }

  // 7. Pozzo del Villaggio
  function paintWell() {
    const P = Pix(28, 30);
    const cStone = pack('#64748b');
    const cStoneLight = pack('#94a3b8');
    const cWood = pack('#5b4a34');
    const cWater = pack('#0284c7');
    const cEdge = pack('#0f172a');

    // Tettuccio
    for (let y = 2; y <= 9; y++) {
      const span = Math.round(((y - 2) / 7) * 11);
      for (let x = 14 - span; x <= 14 + span; x++) P.set(x, y, cWood);
    }
    // Colonne in legno
    for (let y = 9; y <= 20; y++) {
      P.set(5, y, cWood);
      P.set(22, y, cWood);
    }
    // Vasca in pietra circolare
    for (let y = 18; y <= 26; y++) {
      for (let x = 3; x <= 24; x++) {
        P.set(x, y, y === 18 && x > 7 && x < 20 ? cWater : (x % 3 === 0 ? cStoneLight : cStone));
      }
    }
    outline(P, cEdge);
    return P.canvas();
  }

  // 8. Lampione in ferro
  function paintLamppost() {
    const P = Pix(16, 32);
    const cIron = pack('#1e293b');
    const cGlow = pack('#fde047');
    const cEdge = pack('#020617');

    for (let y = 8; y <= 29; y++) {
      P.set(7, y, cIron);
      P.set(8, y, cIron);
    }
    // Lanterna
    for (let y = 4; y <= 10; y++) {
      for (let x = 5; x <= 10; x++) {
        P.set(x, y, (x === 5 || x === 10 || y === 4 || y === 10) ? cIron : cGlow);
      }
    }
    outline(P, cEdge);
    return P.canvas();
  }

  const propCache = new Map();

  return {
    T,
    paintChunk(cx, cy, n, at, getBiome, seed = 0) {
      const P = Pix(n * T, n * T);
      const tx0 = cx * n, ty0 = cy * n;
      const dirtAt = dirtMask(tx0 * T, ty0 * T, n * T, seed);

      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          const tx = tx0 + i, ty = ty0 + j;
          const ox = i * T, oy = j * T;
          const kind = at(tx, ty);
          const biome = getBiome ? getBiome(tx, ty) : 'forest';
          const C = PALETTES[biome] || PALETTES.forest;

          // 1. Pavimento
          paintFloor(P, C, ox, oy, tx, ty, dirtAt, at, biome);

          // 2. Pareti montuose / scogliere
          if (kind === 'wall') {
            paintWall(P, C, ox, oy, tx, ty, at);
          } else if (kind === 'liquid') {
            paintLiquid(P, C, ox, oy, tx, ty, at);
          }
        }
      }

      return P.canvas();
    },

    getPropSprite(type) {
      if (!propCache.has(type)) {
        if (type === 'tree') propCache.set(type, paintTree());
        else if (type === 'pine') propCache.set(type, paintPine());
        else if (type === 'cactus') propCache.set(type, paintCactus());
        else if (type === 'volcano_rock') propCache.set(type, paintVolcanoRock());
        else if (type === 'sand_rock') propCache.set(type, paintRock('sand'));
        else if (type === 'rock') propCache.set(type, paintRock('slate'));
        else if (type === 'house_red') propCache.set(type, paintHouse('red'));
        else if (type === 'house_blue') propCache.set(type, paintHouse('blue'));
        else if (type === 'well') propCache.set(type, paintWell());
        else if (type === 'lamppost') propCache.set(type, paintLamppost());
      }
      return propCache.get(type);
    }
  };
})();
