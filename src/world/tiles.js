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
      // Lastricato in caldo calcare Serene Village (Cittadella, Sylva)
      floor: ['#a5907b', '#bfa892', '#8c7b6d'],
      dirt: ['#7d6961', '#6b5851', '#5a4943'],
      speck: '#4a3e3d',
      light: '#d7c4a7',
      flowers: ['#fde047', '#f472b6', '#ffffff'],
      wallTop: ['#8c7b6d', '#a5907b', '#7d6961'],
      wallLight: '#d7c4a7',
      wallEdge: '#3a2e2b',
      wallFace: ['#5a4943', '#43342f'],
      wallFaceDark: '#2b211e',
      liq: '#0284c7',
      liqDeep: '#0369a1',
      foam: '#e0f2fe',
      shore: '#8c7b6d'
    },
    village_volcano: {
      // Lastricato di basalto e ardesia scura vulcanica (Rocca di Cineris)
      floor: ['#27272a', '#18181b', '#3f3f46'],
      dirt: ['#18181b', '#09090b', '#27272a'],
      speck: '#09090b',
      light: '#52525b',
      flowers: ['#f59e0b', '#ef4444', '#facc15'],
      wallTop: ['#27272a', '#3f3f46', '#18181b'],
      wallLight: '#52525b',
      wallEdge: '#09090b',
      wallFace: ['#18181b', '#09090b'],
      wallFaceDark: '#020617',
      liq: '#dc2626',
      liqDeep: '#991b1b',
      foam: '#facc15',
      shore: '#27272a'
    },
    village_snow: {
      // Lastricato di pietra alpina con brina e neve (Frostpeak)
      floor: ['#94a3b8', '#cbd5e1', '#64748b'],
      dirt: ['#64748b', '#475569', '#334155'],
      speck: '#475569',
      light: '#e2e8f0',
      flowers: ['#7dd3fc', '#ffffff', '#93c5fd'],
      wallTop: ['#64748b', '#94a3b8', '#475569'],
      wallLight: '#e2e8f0',
      wallEdge: '#1e293b',
      wallFace: ['#334155', '#1e293b'],
      wallFaceDark: '#0f172a',
      liq: '#0284c7',
      liqDeep: '#0369a1',
      foam: '#e0f2fe',
      shore: '#94a3b8'
    },
    village_desert: {
      // Lastricato di arenaria dorata delle carovane (Oasi di Al-Zahir)
      floor: ['#d97706', '#b45309', '#f59e0b'],
      dirt: ['#92400e', '#78350f', '#451a03'],
      speck: '#78350f',
      light: '#fde047',
      flowers: ['#facc15', '#ef4444', '#fbbf24'],
      wallTop: ['#b45309', '#d97706', '#92400e'],
      wallLight: '#fde047',
      wallEdge: '#451a03',
      wallFace: ['#78350f', '#451a03'],
      wallFaceDark: '#291402',
      liq: '#0284c7',
      liqDeep: '#0369a1',
      foam: '#e0f2fe',
      shore: '#d97706'
    },
    village_river: {
      // Lastricato di ciottoli fluviali levigati (Borgo delle Cascate)
      floor: ['#64748b', '#718096', '#475569'],
      dirt: ['#475569', '#334155', '#1e293b'],
      speck: '#334155',
      light: '#94a3b8',
      flowers: ['#38bdf8', '#e0f2fe', '#67e8f9'],
      wallTop: ['#475569', '#64748b', '#334155'],
      wallLight: '#94a3b8',
      wallEdge: '#1e293b',
      wallFace: ['#334155', '#1e293b'],
      wallFaceDark: '#0f172a',
      liq: '#0284c7',
      liqDeep: '#0369a1',
      foam: '#ffffff',
      shore: '#64748b'
    },
    river: {
      floor: ['#16a34a', '#22c55e', '#15803d'], // Sponde verdi e fresche del fiume
      dirt: ['#3f4d36', '#4d5c41', '#35432d'],  // Sponde terrose e limo fluviale naturale
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

    // 2. Strade principali (Lastricato a ciottoli sfalsati stile Serene Village)
    if (kind === 'road') {
      let cCobbleBase, cCobbleLight, cCobbleDark, cMortar;
      if (biome === 'snow') {
        // Lastricato di pietra alpina con polvere di neve
        cCobbleLight = pack('#e2e8f0');
        cCobbleBase  = pack('#94a3b8');
        cCobbleDark  = pack('#64748b');
        cMortar      = pack('#475569');
      } else if (biome === 'desert') {
        // Lastricato di arenaria chiara delle carovane
        cCobbleLight = pack('#fde047');
        cCobbleBase  = pack('#d97706');
        cCobbleDark  = pack('#b45309');
        cMortar      = pack('#78350f');
      } else if (biome === 'volcano') {
        // Lastricato di basalto scuro
        cCobbleLight = pack('#52525b');
        cCobbleBase  = pack('#27272a');
        cCobbleDark  = pack('#18181b');
        cMortar      = pack('#09090b');
      } else {
        // Serene Village warm limestone cobbles (foresta, capitale, fiume)
        cCobbleLight = pack('#d7c4a7');
        cCobbleBase  = pack('#a5907b');
        cCobbleDark  = pack('#7d6961');
        cMortar      = pack('#3a3a50');
      }

      const nR = at(tx, ty - 1) === 'road' || at(tx, ty - 1) === 'bridge';
      const sR = at(tx, ty + 1) === 'road' || at(tx, ty + 1) === 'bridge';
      const wR = at(tx - 1, ty) === 'road' || at(tx - 1, ty) === 'bridge';
      const eR = at(tx + 1, ty) === 'road' || at(tx + 1, ty) === 'bridge';

      for (let y = 0; y < T; y++) {
        for (let x = 0; x < T; x++) {
          const gx = tx * T + x, gy = ty * T + y;

          // Bordi sfumati naturalmente verso il terreno circostante
          if ((!wR && x === 0) || (!eR && x === T - 1) || (!nR && y === 0) || (!sR && y === T - 1)) {
            if (hash(gx, gy, 8) > 0.45) {
              P.set(ox + x, oy + y, C.floor[0]);
              continue;
            }
          }

          // Ciottoli sfalsati organici 4x3 con luce in alto a sinistra
          const stoneRow = Math.floor(gy / 3);
          const rowShift = (stoneRow % 2 === 0) ? 0 : 2;
          const lx = (gx + rowShift) % 5;
          const ly = gy % 3;

          let col;
          if (lx === 0 || ly === 0) {
            col = cMortar; // Fuga tra le pietre
          } else if (lx === 1 && ly === 1) {
            col = cCobbleLight; // Riflesso superiore
          } else if (lx === 4 || ly === 2) {
            col = cCobbleDark; // Ombra inferiore
          } else {
            col = (hash(gx >> 1, gy >> 1, 14) > 0.6) ? cCobbleLight : cCobbleBase;
          }

          P.set(ox + x, oy + y, col);
        }
      }
      return;
    }

    // 2b. Sentieri selvaggi di terra battuta (stile Serene Village)
    if (kind === 'trail') {
      let cTrailBase, cTrailLight, cTrailDark, cGravel;
      if (biome === 'snow') {
        // Sentiero battuto nella neve alpina (senza sgranature o strisce scure)
        cTrailLight = pack('#ffffff');
        cTrailBase  = pack('#cbd5e1');
        cTrailDark  = pack('#94a3b8');
        cGravel     = pack('#64748b');
      } else if (biome === 'desert') {
        // Pista sabbiosa battuta
        cTrailLight = pack('#fef08a');
        cTrailBase  = pack('#ca8a04');
        cTrailDark  = pack('#a16207');
        cGravel     = pack('#78350f');
      } else if (biome === 'volcano') {
        // Sentiero di cenere battuta
        cTrailLight = pack('#52525b');
        cTrailBase  = pack('#3f3f46');
        cTrailDark  = pack('#27272a');
        cGravel     = pack('#18181b');
      } else {
        // Serene Village terra battuta calda naturale
        cTrailLight = pack('#d29f51');
        cTrailBase  = pack('#cb9a4e');
        cTrailDark  = pack('#cb8a46');
        cGravel     = pack('#bb6d33');
      }

      const nT = at(tx, ty - 1) === 'trail' || at(tx, ty - 1) === 'bridge';
      const sT = at(tx, ty + 1) === 'trail' || at(tx, ty + 1) === 'bridge';
      const wT = at(tx - 1, ty) === 'trail' || at(tx - 1, ty) === 'bridge';
      const eT = at(tx + 1, ty) === 'trail' || at(tx + 1, ty) === 'bridge';

      for (let y = 0; y < T; y++) {
        for (let x = 0; x < T; x++) {
          const gx = tx * T + x, gy = ty * T + y;

          // Sfumatura organica delle frange del sentiero verso erba o neve
          if ((!wT && x <= 1) || (!eT && x >= T - 2) || (!nT && y <= 1) || (!sT && y >= T - 2)) {
            const fringeR = hash(gx, gy, 7);
            const distBorder = Math.min(!wT ? x : 9, !eT ? T - 1 - x : 9, !nT ? y : 9, !sT ? T - 1 - y : 9);
            if (fringeR > distBorder * 0.45) {
              P.set(ox + x, oy + y, C.floor[Math.floor(hash(gx, gy, 9) * C.floor.length)]);
              continue;
            }
          }

          // Corpo del sentiero morbido e continuo
          const wave = Math.sin((gx + gy) * 0.35) * 0.5 + hash(gx >> 1, gy >> 1, 10) * 0.5;
          let col = (wave > 0.6) ? cTrailLight : (wave < -0.2 ? cTrailDark : cTrailBase);

          // Rari granelli di ghiaia discreti (solo 4% di occorrenza)
          const g = hash(gx, gy, 15);
          if (g < 0.04) col = cGravel;
          else if (g > 0.97) col = cTrailLight;

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
    const isVillage = biome.startsWith('village');

    if (isVillage) {
      // LASTICATO ORGANICO A SANPIETRINI / PIAZZA DEL VILLAGGIO (Stile Serene Village)
      let cCobbleLight, cCobbleBase, cCobbleDark, cMortar, cAccent;
      if (biome === 'village_volcano') {
        // Piazza monumentale in basalto e ardesia scura vulcanica (Rocca di Cineris)
        cCobbleLight = pack('#52525b');
        cCobbleBase  = pack('#27272a');
        cCobbleDark  = pack('#18181b');
        cMortar      = pack('#09090b');
        cAccent      = pack('#ef4444'); // fessure di brace ardente
      } else if (biome === 'village_snow') {
        // Pietra alpina e brina/polvere di neve (Frostpeak)
        cCobbleLight = pack('#e2e8f0');
        cCobbleBase  = pack('#94a3b8');
        cCobbleDark  = pack('#64748b');
        cMortar      = pack('#475569');
        cAccent      = pack('#ffffff');
      } else if (biome === 'village_desert') {
        // Arenaria dorata con sabbia fine tra le fughe (Al-Zahir)
        cCobbleLight = pack('#fde047');
        cCobbleBase  = pack('#d97706');
        cCobbleDark  = pack('#b45309');
        cMortar      = pack('#78350f');
        cAccent      = pack('#fbbf24');
      } else if (biome === 'village_river') {
        // Ciottoli fluviali levigati dall'acqua (Borgo delle Cascate)
        cCobbleLight = pack('#94a3b8');
        cCobbleBase  = pack('#64748b');
        cCobbleDark  = pack('#475569');
        cMortar      = pack('#1e293b');
        cAccent      = pack('#38bdf8');
      } else {
        // Caldo calcare naturale Serene Village (Cittadella dell'Aether, Borgo di Sylva)
        cCobbleLight = pack('#d7c4a7');
        cCobbleBase  = pack('#a5907b');
        cCobbleDark  = pack('#7d6961');
        cMortar      = pack('#4a3e3d');
        cAccent      = pack('#bfa892');
      }

      for (let y = 0; y < T; y++) {
        for (let x = 0; x < T; x++) {
          const gx = tx * T + x, gy = ty * T + y;

          // Ciottoli / Sanpietrini rettangolari sfalsati (running bond 5x3)
          const stoneRow = Math.floor(gy / 3);
          const rowShift = (stoneRow % 2 === 0) ? 0 : 2;
          const stoneCol = Math.floor((gx + rowShift) / 5);
          const lx = (gx + rowShift) % 5;
          const ly = gy % 3;

          // Variazione naturale concio per concio
          const sHash = hash(stoneCol, stoneRow, 23);
          let baseCol = cCobbleBase;
          if (sHash > 0.68) baseCol = cCobbleLight;
          else if (sHash < 0.28) baseCol = cCobbleDark;

          let col;
          if (lx === 0 || ly === 0) {
            // Fuga sottile di malta tra i conci
            col = cMortar;
            // Rare micro-fessure di brace a Cineris
            if (biome === 'village_volcano' && hash(gx, gy, 31) < 0.025) {
              col = cAccent;
            }
          } else if (lx === 1 && ly === 1) {
            // Riflesso superiore sinistro (luce zenitale 3/4)
            col = cCobbleLight;
          } else if (lx === 4 || ly === 2) {
            // Ombra inferiore destra del concio
            col = cCobbleDark;
          } else {
            col = baseCol;
          }

          P.set(ox + x, oy + y, col);
        }
      }
    } else {
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

          if (isDirt && !dirtAt(lx, ly - 1)) col = C.speck;
          else if (!isDirt && dirtAt(lx, ly - 1) && r < 0.5) col = C.light;

          P.set(ox + x, oy + y, col);
        }
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

  // 7. Pozzo del Villaggio (32x36 Isometric 3/4)
  function paintWell() {
    const P = Pix(32, 36);
    const cWoodDark = pack('#382b1d');
    const cWood = pack('#5b4a34');
    const cWoodLight = pack('#786245');
    const cShingleDark = pack('#1e293b');
    const cShingle = pack('#334155');
    const cShingleLight = pack('#475569');
    const cRope = pack('#d97706');
    const cWaterDark = pack('#0284c7');
    const cWaterLight = pack('#38bdf8');
    const cWaterFoam = pack('#e0f2fe');
    const cStoneDark = pack('#1e293b');
    const cStoneMid = pack('#334155');
    const cStoneLight = pack('#475569');
    const cStoneRim = pack('#64748b');
    const cEdge = pack('#090d16');

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
            P.set(x, y, col);
          } else {
            P.set(x, y, y === 21 ? cStoneRim : cStoneLight);
          }
        } else if (y >= 23) {
          const isLeft = x <= 9;
          const isRight = x >= 22;
          const isMortar = (y % 4 === 0) || ((x + Math.floor(y / 4) * 3) % 5 === 0);
          let col = isMortar ? cStoneDark : (isLeft ? cStoneLight : (isRight ? cStoneDark : cStoneMid));
          if (y === 33) col = cStoneDark;
          P.set(x, y, col);
        }
      }
    }

    // Timber upright posts
    for (let y = 11; y <= 24; y++) {
      for (let x = 6; x <= 8; x++) {
        P.set(x, y, x === 6 ? cWoodLight : (x === 8 ? cWoodDark : cWood));
      }
      for (let x = 23; x <= 25; x++) {
        P.set(x, y, x === 23 ? cWoodLight : (x === 25 ? cWoodDark : cWood));
      }
    }
    // Cross beam
    for (let x = 6; x <= 25; x++) {
      P.set(x, 12, cWoodLight);
      P.set(x, 13, cWood);
      P.set(x, 14, cWoodDark);
    }

    // Spooled windlass axle & iron crank
    for (let x = 12; x <= 19; x++) {
      P.set(x, 15, (x % 2 === 0) ? pack('#fde047') : cRope);
      P.set(x, 16, (x % 2 === 0) ? cRope : pack('#92400e'));
    }
    // Suspended bucket
    for (let y = 17; y <= 21; y++) P.set(15, y, cRope);
    for (let y = 20; y <= 23; y++) {
      for (let x = 13; x <= 17; x++) {
        P.set(x, y, (y === 20 || x === 13 || x === 17) ? pack('#475569') : cWood);
      }
    }

    // Gabled roof with shaded shingles
    for (let y = 3; y <= 11; y++) {
      const t = (y - 3) / 8;
      const span = Math.round(2 + t * 13);
      for (let x = 15 - span; x <= 16 + span; x++) {
        const isRidge = (x === 15 || x === 16);
        const isShingleEdge = (y % 3 === 0);
        let col = isRidge ? pack('#64748b') : (x < 15 ? cShingleLight : cShingle);
        if (isShingleEdge) col = cShingleLight;
        if (y === 11) col = cShingleDark;
        P.set(x, y, col);
      }
    }

    outline(P, cEdge);
    return P.canvas();
  }

  // 8. Lampione in ferro (16x34)
  function paintLamppost() {
    const P = Pix(16, 34);
    const cIronDark = pack('#020617');
    const cIron = pack('#1e293b');
    const cIronMid = pack('#334155');
    const cIronLight = pack('#64748b');
    const cGlass = pack('#e0f2fe');
    const cGlow = pack('#fde047');
    const cCore = pack('#ffffff');
    const cEdge = pack('#020617');

    // Tiered pedestal
    for (let x = 5; x <= 10; x++) P.set(x, 32, cIron);
    for (let x = 6; x <= 9; x++) P.set(x, 31, cIronMid);

    // Slender post
    for (let y = 13; y <= 30; y++) {
      P.set(7, y, cIronLight);
      P.set(8, y, cIron);
    }
    // Scrolled bracket & lantern
    for (let x = 7; x <= 12; x++) P.set(x, 8, cIronMid);
    P.set(13, 9, cIronLight); P.set(13, 10, cIron);

    for (let x = 10; x <= 14; x++) {
      P.set(x, 11, cIronMid);
      P.set(x, 18, cIron);
    }
    for (let y = 12; y <= 17; y++) {
      P.set(10, y, cIronDark);
      P.set(14, y, cIronDark);
      for (let x = 11; x <= 13; x++) {
        P.set(x, y, (y === 14 && x === 12) ? cCore : (y >= 13 && y <= 15 ? cGlow : cGlass));
      }
    }

    outline(P, cEdge);
    return P.canvas();
  }

  // 9. NPC Fabbro con Incudine e Martello
  function paintBlacksmith() {
    const P = Pix(38, 36);
    const cSkin = pack('#fcd34d');
    const cBeard = pack('#92400e');
    const cApron = pack('#78350f');
    const cApronDark = pack('#451a03');
    const cSteel = pack('#cbd5e1');
    const cSteelDark = pack('#475569');
    const cHotMetal = pack('#f97316');
    const cGlow = pack('#fde047');
    const cWood = pack('#5b4a34');
    const cEdge = pack('#090d16');

    // Incudine in ferro scuro (a sinistra)
    for (let y = 18; y <= 32; y++) {
      for (let x = 6; x <= 18; x++) {
        const isAnvilTop = y <= 22;
        const isAnvilHorn = y === 20 && (x < 8 || x > 16);
        if (isAnvilTop || isAnvilHorn || (y > 22 && x >= 10 && x <= 14) || y >= 30) {
          P.set(x, y, cSteelDark);
        }
      }
    }
    // Lama incandescente sopra l'incudine
    for (let x = 8; x <= 15; x++) {
      P.set(x, 19, cHotMetal);
      P.set(x, 18, cGlow);
    }

    // Fabbro (a destra dell'incudine)
    // Gambe e stivali
    for (let y = 26; y <= 33; y++) {
      P.set(22, y, cApronDark);
      P.set(23, y, cApronDark);
      P.set(26, y, cApronDark);
      P.set(27, y, cApronDark);
    }
    // Corpo e grembiule in cuoio
    for (let y = 14; y <= 26; y++) {
      for (let x = 20; x <= 29; x++) {
        P.set(x, y, (x === 20 || x === 29) ? cApronDark : cApron);
      }
    }
    // Testa, elmo/fronte e barba
    for (let y = 6; y <= 13; y++) {
      for (let x = 21; x <= 28; x++) {
        if (y <= 8) P.set(x, y, cSteel); // Elmetto d'acciaio
        else if (y === 9 || y === 10) P.set(x, y, cSkin); // Viso
        else P.set(x, y, cBeard); // Folta barba da fabbro
      }
    }
    // Occhi
    P.set(22, 9, pack('#0f172a'));
    P.set(26, 9, pack('#0f172a'));

    // Braccio con martello alzato
    for (let x = 15; x <= 20; x++) P.set(x, 12, cSkin);
    // Manico del martello
    for (let y = 8; y <= 16; y++) P.set(15, y, cWood);
    // Testa del martello in acciaio
    for (let y = 6; y <= 10; y++) {
      for (let x = 13; x <= 17; x++) P.set(x, y, cSteel);
    }

    outline(P, cEdge);
    return P.canvas();
  }

  // 10. Mulino ad Acqua (Borgo delle Cascate)
  function paintWaterMill() {
    const W = 64, H = 56;
    const P = Pix(W, H);
    const cStone = pack('#475569');
    const cStoneDark = pack('#1e293b');
    const cWood = pack('#78350f');
    const cWoodDark = pack('#451a03');
    const cRoof = pack('#0284c7');
    const cRoofLight = pack('#38bdf8');
    const cWater = pack('#7dd3fc');
    const cEdge = pack('#090d16');

    // Corpo del mulino in pietra e travi
    for (let y = 22; y <= 50; y++) {
      for (let x = 8; x <= 44; x++) {
        P.set(x, y, (x % 5 === 0 || y % 5 === 0) ? cStoneDark : cStone);
      }
    }
    // Porta e finestra
    for (let y = 36; y <= 49; y++) {
      for (let x = 22; x <= 29; x++) P.set(x, y, cWoodDark);
    }
    // Tetto azzurro ardesia
    for (let y = 8; y <= 23; y++) {
      const span = Math.round(((y - 8) / 15) * 22);
      for (let x = 26 - span; x <= 26 + span; x++) {
        P.set(x, y, (y % 2 === 0) ? cRoofLight : cRoof);
      }
    }

    // Grande Ruota Idraulica ad Acqua (sul lato destro)
    const rcx = 52, rcy = 36, rr = 15;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      for (let r = 3; r <= rr; r++) {
        const px = Math.round(rcx + Math.cos(a) * r);
        const py = Math.round(rcy + Math.sin(a) * r);
        P.set(px, py, cWoodDark);
      }
    }
    for (let a = 0; a < Math.PI * 2; a += 0.1) {
      P.set(Math.round(rcx + Math.cos(a) * rr), Math.round(rcy + Math.sin(a) * rr), cWood);
    }
    // Schizzi d'acqua sotto la ruota
    for (let x = 46; x <= 58; x++) {
      P.set(x, 51, cWater);
      if (x % 2 === 0) P.set(x, 52, pack('#ffffff'));
    }

    outline(P, cEdge);
    return P.canvas();
  }

  // 11. Tenda Beduina del Deserto (Oasi di Al-Zahir)
  function paintDesertTent() {
    const W = 58, H = 46;
    const P = Pix(W, H);
    const cCloth = pack('#d97706');
    const cClothLight = pack('#fde047');
    const cClothRed = pack('#dc2626');
    const cPole = pack('#78350f');
    const cInside = pack('#451a03');
    const cEdge = pack('#090d16');

    // Palo centrale e tendaggio a cupola
    for (let y = 10; y <= 40; y++) {
      const span = Math.round(Math.sin(((y - 10) / 30) * Math.PI) * 25);
      for (let x = 29 - span; x <= 29 + span; x++) {
        const stripe = Math.floor(Math.abs(x - 29) / 4) % 3;
        P.set(x, y, stripe === 0 ? cClothLight : (stripe === 1 ? cCloth : cClothRed));
      }
    }
    // Entrata aperta in ombra
    for (let y = 26; y <= 40; y++) {
      const span = Math.round(((40 - y) / 14) * 8);
      for (let x = 29 - span; x <= 29 + span; x++) P.set(x, y, cInside);
    }
    // Puntale dorato
    for (let y = 4; y <= 9; y++) P.set(29, y, cClothLight);

    outline(P, cEdge);
    return P.canvas();
  }

  // 12. Chalet Innevato di Frostpeak
  function paintSnowCabin() {
    const W = 62, H = 54;
    const P = Pix(W, H);
    const cLog = pack('#5b4a34');
    const cLogDark = pack('#382b1d');
    const cSnow = pack('#f8fafc');
    const cSnowShadow = pack('#cbd5e1');
    const cGlow = pack('#fde047');
    const cEdge = pack('#090d16');

    // Pareti a tronchi di pino
    for (let y = 24; y <= 48; y++) {
      for (let x = 8; x <= 53; x++) {
        P.set(x, y, (y % 4 === 0) ? cLogDark : cLog);
      }
    }
    // Finestre calde dorate
    for (let y = 30; y <= 38; y++) {
      for (let x = 14; x <= 20; x++) P.set(x, y, cGlow);
      for (let x = 41; x <= 47; x++) P.set(x, y, cGlow);
    }
    // Porta in legno pesante
    for (let y = 34; y <= 48; y++) {
      for (let x = 27; x <= 34; x++) P.set(x, y, cLogDark);
    }
    // Spesso strato di neve sul tetto spiovente
    for (let y = 8; y <= 26; y++) {
      const span = Math.round(((y - 8) / 18) * 28);
      for (let x = 31 - span; x <= 31 + span; x++) {
        P.set(x, y, y <= 14 ? cSnow : (y % 3 === 0 ? cSnowShadow : cSnow));
      }
    }
    outline(P, cEdge);
    return P.canvas();
  }

  // 13. Capanna Silvana di Sylva
  function paintWoodCabin() {
    const W = 58, H = 50;
    const P = Pix(W, H);
    const cWood = pack('#5b4a34');
    const cMoss = pack('#15803d');
    const cMossLight = pack('#4ade80');
    const cDoor = pack('#3b2d1f');
    const cGlow = pack('#a7f3d0');
    const cEdge = pack('#090d16');

    for (let y = 22; y <= 44; y++) {
      for (let x = 8; x <= 50; x++) {
        P.set(x, y, (x % 5 === 0) ? cDoor : cWood);
      }
    }
    // Finestrella verde bosco
    for (let y = 28; y <= 34; y++) {
      for (let x = 14; x <= 20; x++) P.set(x, y, cGlow);
    }
    // Porta
    for (let y = 30; y <= 44; y++) {
      for (let x = 26; x <= 33; x++) P.set(x, y, cDoor);
    }
    // Tetto di paglia e muschio silvano
    for (let y = 8; y <= 23; y++) {
      const span = Math.round(((y - 8) / 15) * 26);
      for (let x = 29 - span; x <= 29 + span; x++) {
        P.set(x, y, (x + y) % 3 === 0 ? cMossLight : cMoss);
      }
    }
    outline(P, cEdge);
    return P.canvas();
  }

  // 14. Fortezza Vulcanica di Cineris (80x64 Isometric 3/4 Keep)
  function paintVolcanoFort() {
    const W = 80, H = 64;
    const P = Pix(W, H);
    const cMortar = pack('#09090b');
    const cBasaltShadow = pack('#14171d');
    const cBasaltBase = pack('#1e232d');
    const cBasaltMid = pack('#2c3240');
    const cBasaltLight = pack('#414a5d');
    const cBasaltRim = pack('#5a647a');
    const cIron = pack('#52525b');
    const cWoodDark = pack('#271b14');
    const cWoodMid = pack('#3d281a');
    const cLavaGlow = pack('#fef08a');
    const cLavaMid = pack('#f59e0b');
    const cLavaDark = pack('#ef4444');
    const cEdge = pack('#020617');

    function block(x0, y0, w, h) {
      for (let y = y0; y < y0 + h; y++) {
        for (let x = x0; x < x0 + w; x++) {
          if (x === x0 || y === y0) P.set(x, y, cBasaltLight);
          else if (x === x0 + w - 1 || y === y0 + h - 1) P.set(x, y, cBasaltShadow);
          else P.set(x, y, ((x + y) % 3 === 0) ? cBasaltMid : cBasaltBase);
        }
      }
    }

    // Central Keep Walls
    for (let y = 20; y <= 58; y++) {
      for (let x = 22; x <= 57; x++) P.set(x, y, cBasaltBase);
    }
    for (let y = 22; y <= 57; y += 5) {
      const shift = Math.floor((y - 22) / 5) % 2 === 0 ? 0 : 4;
      for (let x = 22; x <= 57; x += 8) {
        if (x + shift + 7 <= 57) block(x + shift, y, 7, 4);
      }
    }

    // Left and Right Towers
    for (let y = 16; y <= 58; y++) {
      for (let x = 4; x <= 24; x++) P.set(x, y, cBasaltBase);
      for (let x = 55; x <= 75; x++) P.set(x, y, cBasaltBase);
    }
    for (let y = 16; y <= 57; y += 5) {
      const shift = Math.floor((y - 16) / 5) % 2 === 0 ? 0 : 3;
      for (let x = 4; x <= 24; x += 7) {
        if (x + shift + 6 <= 24) block(x + shift, y, 6, 4);
      }
      for (let x = 55; x <= 75; x += 7) {
        if (x + shift + 6 <= 75) block(x + shift, y, 6, 4);
      }
    }

    // 3D Merlons on Left & Right Towers
    const merlons = [[[4, 9], [12, 16], [19, 24]], [[55, 60], [63, 67], [70, 75]]];
    for (const group of merlons) {
      for (const [x1, x2] of group) {
        for (let x = x1; x <= x2; x++) {
          P.set(x, 10, cBasaltRim);
          P.set(x, 11, cBasaltLight);
          for (let y = 12; y <= 16; y++) {
            P.set(x, y, (x === x1) ? cBasaltLight : (x === x2 ? cBasaltShadow : cBasaltMid));
          }
        }
      }
    }
    for (let x = 4; x <= 24; x++) P.set(x, 17, cBasaltLight);
    for (let x = 55; x <= 75; x++) P.set(x, 17, cBasaltLight);

    // Central Walkway & Merlons
    const midM = [[26, 30], [35, 40], [45, 50]];
    for (const [x1, x2] of midM) {
      for (let x = x1; x <= x2; x++) {
        P.set(x, 18, cBasaltRim); P.set(x, 19, cBasaltLight); P.set(x, 20, cBasaltMid);
      }
    }
    for (let x = 25; x <= 54; x++) P.set(x, 23, cBasaltLight);

    // Arrowslits
    function arrowslit(cx, cy, h) {
      for (let dy = 0; dy < h; dy++) {
        P.set(cx - 1, cy + dy, cMortar);
        P.set(cx, cy + dy, dy === 0 ? cLavaGlow : (dy === h - 1 ? cLavaDark : cLavaMid));
        P.set(cx + 1, cy + dy, cMortar);
      }
    }
    arrowslit(14, 25, 7); arrowslit(14, 40, 6);
    arrowslit(65, 25, 7); arrowslit(65, 40, 6);
    arrowslit(34, 29, 5); arrowslit(45, 29, 5);

    // Grand Portal Gate
    for (let y = 38; y <= 58; y++) {
      for (let x = 32; x <= 47; x++) {
        const dx = (x - 39.5) / 7.5;
        const dy = (y - 45) / 7;
        const isArch = (y <= 45 && dx * dx + dy * dy <= 1.0) || (y > 45 && x >= 33 && x <= 46);
        const isDoor = (y <= 45 && dx * dx * 1.5 + dy * dy * 1.5 <= 1.0) || (y > 45 && x >= 35 && x <= 44);
        if (isArch && !isDoor) {
          P.set(x, y, (y === 38 || x === 33 || x === 46) ? cBasaltRim : cBasaltLight);
        } else if (isDoor) {
          const isIronStrap = (y === 44 || y === 51);
          P.set(x, y, isIronStrap ? cIron : ((x % 3 === 0) ? cWoodDark : cWoodMid));
          if (y === 58) P.set(x, y, cLavaMid);
        }
      }
    }

    // Sconces
    for (const tx of [29, 50]) {
      P.set(tx, 44, cIron); P.set(tx, 45, cIron);
      P.set(tx, 43, pack('#451a03'));
      P.set(tx, 42, cLavaMid); P.set(tx, 41, cLavaGlow); P.set(tx, 40, pack('#ffffff'));
    }

    outline(P, cEdge);
    return P.canvas();
  }

  // 15. Grande Obelisco Runico dell'Aether (Centro Capitale)
  function paintAetherObelisk() {
    const W = 36, H = 68;
    const P = Pix(W, H);

    // Tavolozza per basamento marmoreo scolpito
    const cStepBase = pack('#334155');
    const cStepMid = pack('#475569');
    const cStepTop = pack('#64748b');
    const cMarbleLit = pack('#cbd5e1');
    const cMarbleHighlight = pack('#f1f5f9');
    const cEdge = pack('#090d16');

    // Tavolozza per guglia di cristallo con sfaccettature 3D
    const cCrysShadow = pack('#0369a1');
    const cCrysMid = pack('#0284c7');
    const cCrysLit = pack('#38bdf8');
    const cCrysBright = pack('#7dd3fc');
    const cCrysSpecular = pack('#ffffff');
    const cRuneGlow = pack('#c084fc');
    const cRuneCore = pack('#f472b6');

    // 1. Basamento a gradini di marmo scolpito con zoccolo modanato
    for (let y = 58; y <= 64; y++) {
      for (let x = 4; x <= 31; x++) {
        P.set(x, y, y === 58 ? cMarbleHighlight : (x <= 6 ? cStepTop : (x >= 29 ? cStepBase : cStepMid)));
      }
    }
    for (let y = 52; y <= 58; y++) {
      for (let x = 7; x <= 28; x++) {
        P.set(x, y, y === 52 ? cMarbleHighlight : (x <= 9 ? cMarbleLit : (x >= 26 ? cStepMid : cStepTop)));
      }
    }
    for (let y = 46; y <= 52; y++) {
      for (let x = 10; x <= 25; x++) {
        P.set(x, y, y === 46 ? cMarbleHighlight : (x <= 12 ? cMarbleLit : (x >= 23 ? cStepMid : cMarbleLit)));
      }
    }

    // 2. Monolite di Cristallo dell'Aether (Sfaccettato a 4 piani di luce con spigolo centrale)
    for (let y = 8; y <= 46; y++) {
      const p = (y - 8) / 38;
      const halfW = Math.round(1 + p * 8);
      const cx = 17;

      for (let x = cx - halfW; x <= cx + halfW; x++) {
        const isSpine = (x === cx);
        const isLeft = (x < cx);
        const distFromCenter = Math.abs(x - cx);

        let col;
        if (isSpine) {
          col = (y % 4 === 0) ? cCrysSpecular : cCrysBright;
        } else if (isLeft) {
          // Faccia illuminata da Nord-Ovest
          col = distFromCenter <= Math.round(halfW * 0.5) ? cCrysBright : cCrysLit;
        } else {
          // Faccia in ombra verso Est
          col = distFromCenter <= Math.round(halfW * 0.5) ? cCrysMid : cCrysShadow;
        }

        // Intagli runici arcani che pulsano lungo il fusto
        const isRuneY = (y === 18 || y === 26 || y === 34 || y === 40);
        if (isRuneY && distFromCenter <= 2) {
          col = (distFromCenter === 0) ? cRuneCore : cRuneGlow;
        }

        P.set(x, y, col);
      }
    }

    // 3. Shard di cristallo fluttuante sopra l'apice
    P.set(17, 3, cCrysSpecular);
    P.set(16, 4, cCrysBright);
    P.set(17, 4, cCrysSpecular);
    P.set(18, 4, cCrysMid);
    P.set(17, 5, cCrysLit);

    outline(P, cEdge);
    return P.canvas();
  }

  // 16. Braciere Ardente (24x30 Wrought Iron Brazier)
  function paintBrazier() {
    const P = Pix(24, 30);
    const cIronDark = pack('#090d16');
    const cIron = pack('#1e293b');
    const cIronMid = pack('#334155');
    const cIronLight = pack('#64748b');
    const cCoal = pack('#450a0a');
    const cEmber = pack('#b91c1c');
    const cFlame1 = pack('#dc2626');
    const cFlame2 = pack('#f97316');
    const cFlame3 = pack('#fde047');
    const cFlameCore = pack('#ffffff');
    const cEdge = pack('#05070a');

    // Curved Tripod Legs
    const legs = [
      [[5, 27], [6, 26], [7, 25], [8, 23], [9, 21], [10, 19]],
      [[11, 27], [11, 25], [11, 23], [11, 21], [11, 19]],
      [[18, 27], [17, 26], [16, 25], [15, 23], [14, 21], [13, 19]]
    ];
    for (const leg of legs) {
      for (const [lx, ly] of leg) {
        P.set(lx, ly, cIron);
        P.set(lx + 1, ly, cIronMid);
      }
    }
    for (let x = 8; x <= 15; x++) P.set(x, 22, cIronLight);

    // Flared Iron Bowl
    for (let y = 14; y <= 19; y++) {
      const t = (y - 14) / 5;
      const w = Math.round(8 - t * 4);
      for (let x = 11 - w; x <= 12 + w; x++) {
        let col = (y === 14) ? cIronLight : (x < 11 ? cIronMid : (x > 13 ? cIronDark : cIron));
        if (y === 15 && x >= 7 && x <= 16) col = ((x + y) % 2 === 0) ? cEmber : cCoal;
        P.set(x, y, col);
      }
    }

    // Living flames
    const flameRows = [
      { y: 13, xMin: 6, xMax: 17, col: cFlame2 },
      { y: 12, xMin: 7, xMax: 16, col: cFlame2 },
      { y: 11, xMin: 8, xMax: 15, col: cFlame3 },
      { y: 10, xMin: 8, xMax: 15, col: cFlame3 },
      { y: 9,  xMin: 9, xMax: 14, col: cFlameCore },
      { y: 8,  xMin: 9, xMax: 14, col: cFlameCore },
      { y: 7,  xMin: 10, xMax: 13, col: cFlame3 },
      { y: 6,  xMin: 10, xMax: 13, col: cFlame2 },
      { y: 5,  xMin: 11, xMax: 12, col: cFlame1 }
    ];
    for (const row of flameRows) {
      for (let x = row.xMin; x <= row.xMax; x++) {
        P.set(x, row.y, row.col);
      }
    }
    P.set(7, 10, cFlame1); P.set(16, 10, cFlame1);
    P.set(8, 7, cFlame2);  P.set(15, 7, cFlame2);

    outline(P, cEdge);
    return P.canvas();
  }

  // 17. Palma da dattero del Deserto
  function paintPalmTree() {
    const P = Pix(38, 48);
    const cTrunk = pack('#78350f');
    const cTrunkDark = pack('#451a03');
    const cFrond = pack('#16a34a');
    const cFrondLight = pack('#4ade80');
    const cEdge = pack('#090d16');

    // Tronco curvo a segmenti
    for (let y = 18; y <= 45; y++) {
      const curve = Math.round(Math.sin(((y - 18) / 27) * Math.PI) * 5);
      const cx = 19 + curve;
      for (let x = cx - 2; x <= cx + 2; x++) {
        P.set(x, y, (y % 3 === 0) ? cTrunkDark : cTrunk);
      }
    }
    // Foglie a raggiera (fronde)
    const fronds = [
      [-14, -8], [14, -8], [-12, 6], [12, 6], [0, -12], [-8, -4], [8, -4]
    ];
    for (const [fx, fy] of fronds) {
      for (let i = 0; i <= 12; i++) {
        const px = Math.round(19 + (fx * i) / 12);
        const py = Math.round(18 + (fy * i) / 12 + (i * i) / 24);
        P.set(px, py, cFrond);
        P.set(px, py - 1, cFrondLight);
      }
    }
    outline(P, cEdge);
    return P.canvas();
  }

  // 18. Fontana Imperiale (Ottagonale con Zampillo e Onde d'Acqua)
  function paintFountain() {
    const W = 40, H = 34;
    const P = Pix(W, H);
    const cStoneRim = pack('#64748b');
    const cStoneDark = pack('#334155');
    const cStoneLight = pack('#cbd5e1');
    const cWaterDeep = pack('#0284c7');
    const cWaterMid = pack('#38bdf8');
    const cWaterLit = pack('#7dd3fc');
    const cWaterFoam = pack('#e0f2fe');
    const cEdge = pack('#090d16');

    const cx = 20, cy = 20;

    // Vasca ottagonale modellata
    for (let y = 8; y <= 30; y++) {
      for (let x = 4; x <= 36; x++) {
        const dx = (x - cx) / 15;
        const dy = (y - cy) / 10;
        const d = dx * dx + dy * dy;
        if (d > 1.0) continue;

        if (d > 0.72) {
          // Bordo in pietra modanata
          P.set(x, y, y < cy ? cStoneLight : (x > cx ? cStoneDark : cStoneRim));
        } else {
          // Acqua limpida sfumata
          const r = Math.sin(x * 0.8 + y * 0.8) * 0.5 + 0.5;
          let col = d < 0.25 ? cWaterLit : (r > 0.6 ? cWaterMid : cWaterDeep);
          P.set(x, y, col);
        }
      }
    }

    // Pilastro centrale della fontana
    for (let y = 10; y <= 20; y++) {
      P.set(cx - 2, y, cStoneLight);
      P.set(cx - 1, y, cStoneRim);
      P.set(cx, y, cStoneRim);
      P.set(cx + 1, y, cStoneDark);
    }
    // Coppa superiore
    for (let x = cx - 4; x <= cx + 4; x++) {
      P.set(x, 10, cStoneLight);
    }

    // Zampillo d'acqua che sgorga e gocce
    P.set(cx, 4, cWaterFoam);
    P.set(cx - 1, 5, cWaterLit);
    P.set(cx, 5, cWaterFoam);
    P.set(cx + 1, 5, cWaterLit);
    P.set(cx - 2, 6, cWaterLit);
    P.set(cx + 2, 6, cWaterLit);
    P.set(cx - 3, 8, cWaterFoam);
    P.set(cx + 3, 8, cWaterFoam);

    outline(P, cEdge);
    return P.canvas();
  }

  // 19. Funghi Giganti Fosforescenti (Sylva)
  function paintMushrooms() {
    const P = Pix(26, 28);
    const cStem = pack('#cbd5e1');
    const cCap = pack('#a855f7');
    const cCapLight = pack('#c084fc');
    const cDots = pack('#38bdf8');
    const cEdge = pack('#090d16');

    // Gambi
    for (let y = 14; y <= 26; y++) {
      P.set(10, y, cStem);
      P.set(11, y, cStem);
      P.set(17, y + 2, cStem);
    }
    // Cappella grande
    for (let y = 6; y <= 14; y++) {
      const span = Math.round(((y - 6) / 8) * 8);
      for (let x = 11 - span; x <= 11 + span; x++) {
        P.set(x, y, (x % 3 === 0 && y % 3 === 0) ? cDots : (y <= 8 ? cCapLight : cCap));
      }
    }
    outline(P, cEdge);
    return P.canvas();
  }

  // 20. Forziere del Tesoro (Chiuso e Aperto)
  function paintChest(isOpen = false) {
    const P = Pix(26, 24);
    const cWood = pack('#78350f');
    const cWoodDark = pack('#451a03');
    const cGold = pack('#facc15');
    const cGoldLight = pack('#fde047');
    const cGemRed = pack('#ef4444');
    const cGemCyan = pack('#38bdf8');
    const cInside = pack('#18181b');
    const cEdge = pack('#090d16');

    if (!isOpen) {
      // Forziere Chiuso con serratura d'oro
      for (let y = 8; y <= 21; y++) {
        for (let x = 3; x <= 22; x++) {
          const isGoldTrim = x === 3 || x === 22 || x === 9 || x === 16 || y === 8 || y === 14 || y === 21;
          P.set(x, y, isGoldTrim ? cGold : ((y % 2 === 0) ? cWoodDark : cWood));
        }
      }
      // Serratura con buco della chiave
      for (let y = 13; y <= 16; y++) {
        for (let x = 12; x <= 14; x++) P.set(x, y, cGoldLight);
      }
      P.set(13, 14, cEdge);
    } else {
      // Forziere Aperto straripante di tesori e gemme scintillanti
      for (let y = 11; y <= 22; y++) {
        for (let x = 3; x <= 22; x++) {
          const isGoldTrim = x === 3 || x === 22 || y === 22;
          P.set(x, y, isGoldTrim ? cGold : cWoodDark);
        }
      }
      // Interno forziere traboccante di monete e gemme
      for (let y = 8; y <= 13; y++) {
        for (let x = 5; x <= 20; x++) {
          const r = hash(x, y, 77);
          P.set(x, y, r < 0.25 ? cGemRed : (r < 0.5 ? cGemCyan : (r < 0.8 ? cGold : cGoldLight)));
        }
      }
      // Coperchio sollevato inclinato indietro
      for (let y = 2; y <= 8; y++) {
        for (let x = 4; x <= 21; x++) {
          P.set(x, y, (x === 4 || x === 21 || y === 2) ? cGold : cWood);
        }
      }
    }
    outline(P, cEdge);
    return P.canvas();
  }

  // 21. Pilastro Runico Elementale (Mistero delle Cascate)
  function paintRunicPillar(isLit = false) {
    const P = Pix(20, 38);
    const cStone = pack('#475569');
    const cStoneLight = pack('#64748b');
    const cRuneGlow = pack(isLit ? '#38bdf8' : '#334155');
    const cRuneBright = pack(isLit ? '#ffffff' : '#475569');
    const cEdge = pack('#090d16');

    for (let y = 6; y <= 34; y++) {
      for (let x = 4; x <= 15; x++) {
        P.set(x, y, (x === 4 || x === 15) ? cStone : cStoneLight);
      }
    }
    // Runa mistica incisa
    for (let y of [12, 18, 24, 30]) {
      P.set(9, y, cRuneBright);
      P.set(10, y, cRuneBright);
      P.set(8, y - 1, cRuneGlow);
      P.set(11, y - 1, cRuneGlow);
    }
    outline(P, cEdge);
    return P.canvas();
  }

  // 22. Portale di Teletrasporto / Waypoint dell'Aether
  function paintWaypointPortal() {
    const P = Pix(28, 24);
    const cStoneDark = pack('#1e293b');
    const cStoneMid = pack('#334155');
    const cStoneLight = pack('#64748b');
    const cRuneCyan = pack('#0284c7');
    const cRuneBright = pack('#38bdf8');
    const cCrystalCore = pack('#ffffff');
    const cCrystalCyan = pack('#7dd3fc');
    const cEdge = pack('#090d16');

    // Basamento ellittico runico 2.5D
    const cx = 14, cy = 15, rx = 12, ry = 7;
    for (let y = 0; y < 24; y++) {
      for (let x = 0; x < 28; x++) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        const d = dx * dx + dy * dy;
        if (d <= 1.0) {
          if (d > 0.72) {
            P.set(x, y, (y > cy) ? cStoneDark : cStoneMid);
          } else if (d > 0.38) {
            const angle = Math.atan2(y - cy, x - cx);
            const isRune = Math.sin(angle * 6) > 0.2;
            P.set(x, y, isRune ? cRuneBright : cRuneCyan);
          } else {
            P.set(x, y, (d > 0.15) ? cRuneBright : cStoneLight);
          }
        }
      }
    }

    // Cristallo dell'Aether fluttuante al centro
    const cry = [
      { x: 14, y: 3, col: cCrystalCore },
      { x: 13, y: 4, col: cCrystalCore }, { x: 14, y: 4, col: cCrystalCore }, { x: 15, y: 4, col: cCrystalCore },
      { x: 12, y: 5, col: cCrystalCyan }, { x: 13, y: 5, col: cCrystalCore }, { x: 14, y: 5, col: cCrystalCore }, { x: 15, y: 5, col: cCrystalCyan },
      { x: 12, y: 6, col: cRuneCyan }, { x: 13, y: 6, col: cCrystalCyan }, { x: 14, y: 6, col: cCrystalCore }, { x: 15, y: 6, col: cCrystalCyan }, { x: 16, y: 6, col: cRuneCyan },
      { x: 13, y: 7, col: cCrystalCyan }, { x: 14, y: 7, col: cCrystalCore }, { x: 15, y: 7, col: cCrystalCyan },
      { x: 14, y: 8, col: cRuneBright }
    ];
    for (const pt of cry) {
      P.set(pt.x, pt.y, pt.col);
    }

    outline(P, cEdge);
    return P.canvas();
  }

  // 23. Nodi Minerari di Raccolta (Rame, Ferro, Ossidiana)
  function paintMiningNode(oreType = 'copper') {
    const P = Pix(22, 18);
    const cStoneDark = pack('#1e293b');
    const cStoneMid = pack('#334155');
    const cStoneLight = pack('#64748b');
    const cEdge = pack('#090d16');

    let cOreDark, cOreBright, cOreShine;
    if (oreType === 'iron') {
      cOreDark = pack('#64748b');
      cOreBright = pack('#cbd5e1');
      cOreShine = pack('#ffffff');
    } else if (oreType === 'obsidian') {
      cOreDark = pack('#3b0764');
      cOreBright = pack('#9333ea');
      cOreShine = pack('#e9d5ff');
    } else {
      // copper
      cOreDark = pack('#9a3412');
      cOreBright = pack('#f97316');
      cOreShine = pack('#ffedd5');
    }

    // Struttura rocciosa asimmetrica
    for (let y = 3; y <= 15; y++) {
      for (let x = 2; x <= 19; x++) {
        const nx = (x - 10.5) / 8.5;
        const ny = (y - 9.5) / 6.0;
        if (nx * nx + ny * ny <= 1.0) {
          P.set(x, y, (y > 11) ? cStoneDark : (x < 10 ? cStoneLight : cStoneMid));
        }
      }
    }

    // Vene di minerale prezioso e cristalli scintillanti incastonati
    const oreSpots = [
      { x: 7, y: 7, col: cOreShine }, { x: 8, y: 7, col: cOreBright }, { x: 8, y: 8, col: cOreDark },
      { x: 13, y: 6, col: cOreShine }, { x: 14, y: 6, col: cOreBright }, { x: 13, y: 7, col: cOreBright },
      { x: 10, y: 11, col: cOreBright }, { x: 11, y: 11, col: cOreShine }, { x: 11, y: 12, col: cOreDark },
      { x: 6, y: 12, col: cOreBright }, { x: 16, y: 10, col: cOreBright }
    ];
    for (const spot of oreSpots) {
      P.set(spot.x, spot.y, spot.col);
    }

    outline(P, cEdge);
    return P.canvas();
  }

  // 24. Loto delle Cascate (Erboristeria Fluviale)
  function paintLotus() {
    const P = Pix(20, 16);
    const cLeafDark = pack('#14532d');
    const cLeaf = pack('#16a34a');
    const cPetalDark = pack('#0284c7');
    const cPetalLight = pack('#38bdf8');
    const cPetalCore = pack('#ffffff');
    const cStamen = pack('#fde047');
    const cEdge = pack('#022c22');

    // Foglia di ninfea tonda alla base
    for (let y = 9; y <= 14; y++) {
      for (let x = 2; x <= 17; x++) {
        const dx = (x - 9.5) / 7.5;
        const dy = (y - 11.5) / 2.8;
        if (dx * dx + dy * dy <= 1.0) {
          P.set(x, y, (x === 10 && y === 12) ? 0 : (y > 12 ? cLeafDark : cLeaf));
        }
      }
    }

    // Petali di loto sbocciati verso l'alto
    const petals = [
      { x: 9, y: 4, col: cPetalCore }, { x: 10, y: 4, col: cPetalCore },
      { x: 8, y: 5, col: cPetalLight }, { x: 9, y: 5, col: cPetalCore }, { x: 10, y: 5, col: cPetalCore }, { x: 11, y: 5, col: cPetalLight },
      { x: 7, y: 6, col: cPetalDark }, { x: 8, y: 6, col: cPetalLight }, { x: 9, y: 6, col: cStamen }, { x: 10, y: 6, col: cStamen }, { x: 11, y: 6, col: cPetalLight }, { x: 12, y: 6, col: cPetalDark },
      { x: 6, y: 7, col: cPetalDark }, { x: 7, y: 7, col: cPetalLight }, { x: 8, y: 7, col: cPetalLight }, { x: 11, y: 7, col: cPetalLight }, { x: 12, y: 7, col: cPetalLight }, { x: 13, y: 7, col: cPetalDark },
      { x: 8, y: 8, col: cPetalDark }, { x: 9, y: 8, col: cPetalLight }, { x: 10, y: 8, col: cPetalLight }, { x: 11, y: 8, col: cPetalDark }
    ];
    for (const pt of petals) {
      P.set(pt.x, pt.y, pt.col);
    }

    outline(P, cEdge);
    return P.canvas();
  }

  // 25. Spina Solare delle Dune (Erboristeria Desertica)
  function paintSunSpur() {
    const P = Pix(18, 22);
    const cStemDark = pack('#78350f');
    const cStem = pack('#d97706');
    const cStemLight = pack('#f59e0b');
    const cBloomDark = pack('#ea580c');
    const cBloomLight = pack('#facc15');
    const cBloomCore = pack('#ffffff');
    const cEdge = pack('#451a03');

    // Fusto spinoso desertico
    for (let y = 8; y <= 19; y++) {
      for (let x = 7; x <= 10; x++) {
        P.set(x, y, (x === 7) ? cStemDark : (x === 8 ? cStem : cStemLight));
      }
    }
    // Spine laterali
    P.set(5, 11, cStemLight); P.set(6, 12, cStem);
    P.set(12, 14, cStemLight); P.set(11, 15, cStem);
    P.set(5, 17, cStemLight); P.set(6, 17, cStem);

    // Fiore solare fiammeggiante in cima
    const bloom = [
      { x: 8, y: 3, col: cBloomCore }, { x: 9, y: 3, col: cBloomCore },
      { x: 7, y: 4, col: cBloomLight }, { x: 8, y: 4, col: cBloomCore }, { x: 9, y: 4, col: cBloomCore }, { x: 10, y: 4, col: cBloomLight },
      { x: 6, y: 5, col: cBloomDark }, { x: 7, y: 5, col: cBloomLight }, { x: 8, y: 5, col: cBloomLight }, { x: 9, y: 5, col: cBloomLight }, { x: 10, y: 5, col: cBloomLight }, { x: 11, y: 5, col: cBloomDark },
      { x: 7, y: 6, col: cBloomDark }, { x: 8, y: 6, col: cBloomLight }, { x: 9, y: 6, col: cBloomLight }, { x: 10, y: 6, col: cBloomDark },
      { x: 8, y: 7, col: cBloomDark }, { x: 9, y: 7, col: cBloomDark }
    ];
    for (const b of bloom) {
      P.set(b.x, b.y, b.col);
    }

    outline(P, cEdge);
    return P.canvas();
  }

  // 26. Geode / Monolite d'Aether (Cristalli Arcani)
  function paintAetherGeode() {
    const P = Pix(22, 22);
    const cRockDark = pack('#0f172a');
    const cRockMid = pack('#1e293b');
    const cCryDark = pack('#0284c7');
    const cCryBright = pack('#38bdf8');
    const cCryShine = pack('#7dd3fc');
    const cCryCore = pack('#ffffff');
    const cEdge = pack('#020617');

    // Conchiglia rocciosa spaccata
    for (let y = 6; y <= 18; y++) {
      for (let x = 3; x <= 18; x++) {
        const nx = (x - 10.5) / 7.5;
        const ny = (y - 12.0) / 6.0;
        if (nx * nx + ny * ny <= 1.0) {
          P.set(x, y, (y > 14 || x < 7) ? cRockDark : cRockMid);
        }
      }
    }

    // Grappolo di cristalli di quarzo d'Aether appuntiti verso l'alto
    const crystals = [
      { x: 10, y: 3, col: cCryCore },
      { x: 9, y: 4, col: cCryBright }, { x: 10, y: 4, col: cCryCore }, { x: 11, y: 4, col: cCryBright },
      { x: 8, y: 5, col: cCryDark }, { x: 9, y: 5, col: cCryBright }, { x: 10, y: 5, col: cCryShine }, { x: 11, y: 5, col: cCryBright },
      { x: 13, y: 5, col: cCryCore }, { x: 14, y: 5, col: cCryShine },
      { x: 8, y: 6, col: cCryDark }, { x: 9, y: 6, col: cCryBright }, { x: 10, y: 6, col: cCryBright }, { x: 12, y: 6, col: cCryDark }, { x: 13, y: 6, col: cCryBright }, { x: 14, y: 6, col: cCryCore },
      { x: 9, y: 7, col: cCryDark }, { x: 10, y: 7, col: cCryBright }, { x: 11, y: 7, col: cCryBright }, { x: 13, y: 7, col: cCryBright },
      { x: 10, y: 8, col: cCryDark }, { x: 11, y: 8, col: cCryDark }
    ];
    for (const c of crystals) {
      P.set(c.x, c.y, c.col);
    }

    outline(P, cEdge);
    return P.canvas();
  }

  // 27. Nodo Esaurito / Depleted (Roccia Svuotata in attesa di respawn)
  function paintDepletedNode() {
    const P = Pix(20, 14);
    const cDust = pack('#334155');
    const cCrag = pack('#475569');
    const cHole = pack('#0f172a');
    const cEdge = pack('#090d16');

    for (let y = 3; y <= 11; y++) {
      for (let x = 2; x <= 17; x++) {
        const nx = (x - 9.5) / 7.5;
        const ny = (y - 7.0) / 4.0;
        if (nx * nx + ny * ny <= 1.0) {
          // Cavità vuota al centro
          const isHole = (x >= 7 && x <= 12 && y >= 5 && y <= 8);
          P.set(x, y, isHole ? cHole : (y > 8 ? cDust : cCrag));
        }
      }
    }
    outline(P, cEdge);
    return P.canvas();
  }

  const WORLD_ASSET_PATHS = {
    tree: 'assets/sprites/world/tree_oak.png',
    tree_gold: 'assets/sprites/world/tree_oak_gold.png',
    tree_teal: 'assets/sprites/world/tree_oak_teal.png',
    pine: 'assets/sprites/world/tree_pine.png',
    pine_large: 'assets/sprites/world/tree_pine_large.png',
    cactus: 'assets/sprites/world/tree_cactus.png',
    palm_tree: 'assets/sprites/world/tree_palm.png',
    house_red: 'assets/sprites/world/house_red.png',
    house_red_small: 'assets/sprites/world/house_red_small.png',
    house_dark_volcano: 'assets/sprites/world/house_dark_volcano.png',
    house_dark_volcano_small: 'assets/sprites/world/house_dark_volcano_small.png',
    house_blue: 'assets/sprites/world/house_blue.png',
    house_blue_small: 'assets/sprites/world/house_blue_small.png',
    cabin_wood: 'assets/sprites/world/cabin_wood.png',
    cabin_wood_small: 'assets/sprites/world/cabin_wood_small.png',
    cabin_snow: 'assets/sprites/world/cabin_snow.png',
    water_mill: 'assets/sprites/world/water_mill.png',
    fort_volcano: 'assets/sprites/world/fort_volcano.png',
    tent_desert: 'assets/sprites/world/tent_desert.png',
    rock: 'assets/sprites/world/rock.png',
    sand_rock: 'assets/sprites/world/sand_rock.png',
    volcano_rock: 'assets/sprites/world/volcano_rock.png',
    glowing_mushrooms: 'assets/sprites/world/glowing_mushrooms.png',
    well: 'assets/sprites/world/well.png',
    brazier_fire: 'assets/sprites/world/brazier_fire.png',
    lamppost: 'assets/sprites/world/lamppost.png',
    fountain: 'assets/sprites/world/fountain.png'
  };

  const worldImages = {};
  if (typeof Image !== 'undefined') {
    for (const [k, src] of Object.entries(WORLD_ASSET_PATHS)) {
      const img = new Image();
      img.src = src;
      worldImages[k] = img;
    }
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
      // 1. Risorsa nativa pre-renderizzata da Serene Village / Tileset
      const img = worldImages[type];
      if (img && img.complete && img.naturalWidth > 0) {
        return img;
      }

      // 2. Fallback procedurale per retrocompatibilità e avvio istantaneo
      if (!propCache.has(type)) {
        if (type === 'tree' || type === 'tree_gold' || type === 'tree_teal') propCache.set(type, paintTree());
        else if (type === 'pine' || type === 'pine_large') propCache.set(type, paintPine());
        else if (type === 'cactus') propCache.set(type, paintCactus());
        else if (type === 'volcano_rock') propCache.set(type, paintVolcanoRock());
        else if (type === 'sand_rock') propCache.set(type, paintRock('sand'));
        else if (type === 'rock') propCache.set(type, paintRock('slate'));
        else if (type === 'house_red' || type === 'house_red_small') propCache.set(type, paintHouse('red'));
        else if (type === 'house_blue' || type === 'house_blue_small') propCache.set(type, paintHouse('blue'));
        else if (type === 'house_dark_volcano' || type === 'house_dark_volcano_small') propCache.set(type, paintHouse('blue'));
        else if (type === 'well') propCache.set(type, paintWell());
        else if (type === 'lamppost') propCache.set(type, paintLamppost());
        else if (type === 'blacksmith_npc') propCache.set(type, paintBlacksmith());
        else if (type === 'water_mill') propCache.set(type, paintWaterMill());
        else if (type === 'tent_desert') propCache.set(type, paintDesertTent());
        else if (type === 'cabin_snow') propCache.set(type, paintSnowCabin());
        else if (type === 'cabin_wood' || type === 'cabin_wood_small') propCache.set(type, paintWoodCabin());
        else if (type === 'fort_volcano') propCache.set(type, paintVolcanoFort());
        else if (type === 'aether_obelisk') propCache.set(type, paintAetherObelisk());
        else if (type === 'brazier_fire') propCache.set(type, paintBrazier());
        else if (type === 'palm_tree') propCache.set(type, paintPalmTree());
        else if (type === 'fountain') propCache.set(type, paintFountain());
        else if (type === 'glowing_mushrooms') propCache.set(type, paintMushrooms());
        else if (type === 'chest_closed') propCache.set(type, paintChest(false));
        else if (type === 'chest_open') propCache.set(type, paintChest(true));
        else if (type === 'runic_pillar') propCache.set(type, paintRunicPillar(false));
        else if (type === 'runic_pillar_lit') propCache.set(type, paintRunicPillar(true));
        else if (type === 'waypoint_portal') propCache.set(type, paintWaypointPortal());
        else if (type === 'node_copper') propCache.set(type, paintMiningNode('copper'));
        else if (type === 'node_iron') propCache.set(type, paintMiningNode('iron'));
        else if (type === 'node_obsidian') propCache.set(type, paintMiningNode('obsidian'));
        else if (type === 'node_lotus') propCache.set(type, paintLotus());
        else if (type === 'node_sun') propCache.set(type, paintSunSpur());
        else if (type === 'node_geode') propCache.set(type, paintAetherGeode());
        else if (type === 'node_depleted') propCache.set(type, paintDepletedNode());
      }
      return propCache.get(type);
    }
  };
})();
