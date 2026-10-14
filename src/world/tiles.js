/**
 * world/tiles.js - Motore di Autotiling Pixel Art 16-bit procedurale
 * Ispirato fedelmente all'architettura di PokéSurvivor:
 * Genera scogliere 3D, coste d'acqua con schiuma, sentieri di terra organici e alberi ombreggiati.
 */

// Helper colori: conversione Hex -> RGBA Uint32 empaquetado in Little-Endian
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

/**
 * Buffer di pixel ad alte prestazioni (Uint32Array su ImageData)
 */
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

// PRNG Hash deterministico per dettagli e rumore
function hash(x, y, s = 0) {
  let h = (x * 374761393 + y * 668265263 + (s + 13) * 1442695040888963407) ^ 0x5bf03635;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export const Tiles = (() => {
  const T = 16; // Tile nativo 16x16 pixel

  // Palette Biomi Fantasy
  const BIOMES = [
    {
      name: 'Foresta Arcana',
      liquid: 'water',
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
      shore: '#3d4f2a',
      leaf: ['#166534', '#15803d', '#22c55e', '#4ade80'],
      trunk: ['#451a03', '#78350f'],
      rock: ['#64748b', '#94a3b8', '#cbd5e1']
    }
  ];

  // Genera maschera organica per i sentieri di terra nel prato
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

  // 1. Pavimento (Erba e Terra con autotiling morbido, fiori e ciuffi)
  function paintFloor(P, C, ox, oy, tx, ty, dirtAt, at) {
    let dirtCount = 0;
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

        // Bordo sfumato tra terra ed erba
        if (isDirt && !dirtAt(lx, ly - 1)) col = C.speck;
        else if (!isDirt && dirtAt(lx, ly - 1) && r < 0.5) col = C.light;

        P.set(ox + x, oy + y, col);
      }
    }

    // Ombra di contatto sotto le pareti a nord
    if (at(tx, ty - 1) === 'wall') {
      for (let x = 0; x < T; x++) {
        P.set(ox + x, oy, C.wallFaceDark);
        if ((x + ty) % 2 === 0) P.set(ox + x, oy + 1, C.speck);
      }
    }

    // Dettagli decorativi: fiorellini di campo o ciuffi d'erba alta
    const d = hash(tx, ty, 14);
    const fx = ox + 3 + Math.floor(hash(tx, ty, 15) * 10);
    const fy = oy + 4 + Math.floor(hash(tx, ty, 16) * 9);
    if (dirtCount <= (T * T) / 2) {
      if (d < 0.18) {
        // Ciuffetto d'erba
        P.set(fx, fy, C.light);
        P.set(fx - 1, fy - 1, C.light);
        P.set(fx + 1, fy - 1, C.light);
      } else if (d > 0.88) {
        // Fiorellino colorato
        const fCol = C.flowers[Math.floor(hash(tx, ty, 17) * C.flowers.length)];
        P.set(fx, fy, fCol);
        P.set(fx, fy + 1, C.speck);
      }
    }
  }

  // 2. Muri e Scogliere 3D (Autotiling con facciata verticale e spigoli arrotondati)
  function paintWall(P, C, ox, oy, tx, ty, at) {
    const W = (x, y) => at(x, y) === 'wall';
    const n = W(tx, ty - 1), s = W(tx, ty + 1), w = W(tx - 1, ty), e = W(tx + 1, ty);
    // Se a sud c'è spazio aperto, mostra 6 pixel di facciata rocciosa 3D verso il giocatore
    const FACE = s ? 0 : 6;

    for (let y = 0; y < T; y++) {
      for (let x = 0; x < T; x++) {
        // Angoli esterni arrotondati (mostrano il prato sottostante)
        if (!n && !w && x + y < 3) continue;
        if (!n && !e && (T - 1 - x) + y < 3) continue;
        if (!s && !w && x + (T - 1 - y) < 2) continue;
        if (!s && !e && (T - 1 - x) + (T - 1 - y) < 2) continue;

        const gx = tx * T + x, gy = ty * T + y;
        let col;

        if (y >= T - FACE) {
          // Facciata verticale 3D
          const fy = y - (T - FACE);
          col = C.wallFace[(x + (hash(gx, 0, 21) < 0.5 ? 0 : 1)) % 3 === 0 ? 1 : 0];
          if (fy === 0) col = C.wallEdge;
          else if (y === T - 1) col = C.wallFaceDark;
          else if (hash(gx, gy, 22) < 0.08) col = C.wallFaceDark;
        } else {
          // Superficie piana superiore della roccia
          col = C.wallTop[Math.floor(hash(gx >> 1, gy >> 1, 23) * 2.2 + hash(gx, gy, 24) * 0.8) % C.wallTop.length];
          if (hash(gx, gy, 25) < 0.06) col = C.wallLight;

          // Bordo superiore illuminato, contorni laterali marcati
          if (!n && y === 0) col = C.wallEdge;
          else if (!n && y === 1) col = C.wallLight;
          if (!w && x === 0) col = C.wallEdge;
          if (!e && x === T - 1) col = C.wallEdge;
        }

        P.set(ox + x, oy + y, col);
      }
    }
  }

  // 3. Laghi e Liquidi (Autotiling con battigia, schiuma e gradiente di profondità)
  function paintLiquid(P, C, ox, oy, tx, ty, at) {
    const L = (x, y) => at(x, y) === 'liquid';
    const n = L(tx, ty - 1), s = L(tx, ty + 1), w = L(tx - 1, ty), e = L(tx + 1, ty);
    const nw = L(tx - 1, ty - 1), ne = L(tx + 1, ty - 1), sw = L(tx - 1, ty + 1), se = L(tx + 1, ty + 1);
    const BIG = 99;

    for (let y = 0; y < T; y++) {
      for (let x = 0; x < T; x++) {
        // Angoli esterni arrotondati
        if (!n && !w && x + y < 3) continue;
        if (!n && !e && (T - 1 - x) + y < 3) continue;
        if (!s && !w && x + (T - 1 - y) < 3) continue;
        if (!s && !e && (T - 1 - x) + (T - 1 - y) < 3) continue;

        // Calcolo della distanza dalla riva all'interno del tile
        let d = Math.min(n ? BIG : y, s ? BIG : T - 1 - y, w ? BIG : x, e ? BIG : T - 1 - x);
        if (n && w && !nw) d = Math.min(d, Math.hypot(x, y) - 0.5);
        if (n && e && !ne) d = Math.min(d, Math.hypot(T - 1 - x, y) - 0.5);
        if (s && w && !sw) d = Math.min(d, Math.hypot(x, T - 1 - y) - 0.5);
        if (s && e && !se) d = Math.min(d, Math.hypot(T - 1 - x, T - 1 - y) - 0.5);

        const gx = tx * T + x, gy = ty * T + y;
        const r = hash(gx, gy, 31);
        let col;

        if (d < 1) col = C.shore;                       // Bordo di fango/terra della riva
        else if (d < 2) col = C.foam;                   // Riga di schiuma d'acqua chiara
        else if (d < 4) col = C.liqLight;               // Acqua bassa traslucida
        else if (d < 7) col = r < 0.5 ? C.liq : C.liqLight;
        else col = C.liqDeep;                           // Acqua profonda scura

        // Riflessi d'onda luminosi casuali
        if (d >= 3 && hash(gx >> 2, gy, 33) < 0.05 && (gx & 3) !== 3) {
          col = C.liqLight;
        }

        P.set(ox + x, oy + y, col);
      }
    }
  }

  // 4. Props: Alberi e Rocce ad alta definizione pixel art
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

  function paintTree() {
    const B = BIOMES[0];
    const P = Pix(32, 42);
    const L = B.leaf.map(h => pack(h));
    const Tr = B.trunk.map(h => pack(h));
    const edge = pack('#0f172a');

    // Tronco d'albero con radici
    for (let y = 26; y < 40; y++) {
      for (let x = 14; x < 19; x++) {
        P.set(x, y, Tr[x === 14 || x === 18 ? 0 : 1]);
      }
    }
    P.set(13, 39, Tr[0]);
    P.set(19, 39, Tr[0]);

    // Chioma volumetrica con cerchi ombreggiati (luce da nord-ovest)
    const foliage = [
      [16, 20, 11],
      [9, 17, 8],
      [23, 17, 8],
      [16, 11, 9],
      [11, 23, 7],
      [21, 23, 7]
    ];

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

  function paintRock() {
    const B = BIOMES[0];
    const P = Pix(24, 18);
    const R = B.rock.map(h => pack(h));
    const edge = pack('#0f172a');

    for (let y = 2; y <= 15; y++) {
      for (let x = 2; x <= 21; x++) {
        const nx = (x - 11.5) / 9.5;
        const ny = (y - 9.5) / 7;
        const d = nx * nx + ny * ny;
        if (d > 1) continue;
        const lit = -nx * 0.55 - ny * 0.85;
        let c = R[lit > 0.35 ? 2 : lit > -0.1 ? 1 : 0];
        if (y >= 14) c = R[0];
        P.set(x, y, c);
      }
    }
    outline(P, edge);
    return P.canvas();
  }

  const propCache = new Map();

  return {
    T,
    paintChunk(cx, cy, n, at, seed = 0) {
      const B = BIOMES[0];
      const P = Pix(n * T, n * T);
      const C = {};

      for (const k of ['floor', 'dirt', 'wallTop', 'wallFace', 'flowers', 'leaf']) {
        C[k] = B[k].map(h => pack(h));
      }
      for (const k of ['speck', 'light', 'wallLight', 'wallEdge', 'wallFaceDark', 'liq', 'liqDeep', 'foam', 'shore']) {
        C[k] = pack(B[k]);
      }
      C.liqLight = mixPack(B.liq, B.foam, 0.35);

      const tx0 = cx * n, ty0 = cy * n;
      const dirtAt = dirtMask(tx0 * T, ty0 * T, n * T, seed);

      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          const tx = tx0 + i, ty = ty0 + j;
          const ox = i * T, oy = j * T;
          const kind = at(tx, ty);

          // 1. Pavimento base sotto tutto
          paintFloor(P, C, ox, oy, tx, ty, dirtAt, at);

          // 2. Elementi autotiled soprastanti
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
        else if (type === 'rock') propCache.set(type, paintRock());
      }
      return propCache.get(type);
    }
  };
})();
