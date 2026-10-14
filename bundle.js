(() => {
  // src/core/input.js
  var Input = (() => {
    const down = /* @__PURE__ */ new Set();
    const pressed = /* @__PURE__ */ new Set();
    let mousePos = { x: 0, y: 0, isDown: false };
    const MOVE_KEYS = {
      up: ["keyw", "arrowup"],
      down: ["keys", "arrowdown"],
      left: ["keya", "arrowleft"],
      right: ["keyd", "arrowright"]
    };
    function normalizzaCodice(e) {
      return (e.code || e.key).toLowerCase();
    }
    window.addEventListener("keydown", (e) => {
      const c = normalizzaCodice(e);
      if (!down.has(c)) {
        pressed.add(c);
      }
      down.add(c);
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "space", "tab"].includes(c)) {
        e.preventDefault();
      }
    });
    window.addEventListener("keyup", (e) => {
      down.delete(normalizzaCodice(e));
    });
    window.addEventListener("blur", () => {
      down.clear();
      pressed.clear();
    });
    window.addEventListener("mousemove", (e) => {
      mousePos.x = e.clientX;
      mousePos.y = e.clientY;
    });
    window.addEventListener("mousedown", () => {
      mousePos.isDown = true;
    });
    window.addEventListener("mouseup", () => {
      mousePos.isDown = false;
    });
    return {
      /**
       * Restituisce il vettore di movimento [ax, ay] normalizzato.
       * In diagonale la lunghezza è esattamente 1.0 (evita il bug della camminata più veloce a 45°).
       */
      axis() {
        let x = 0, y = 0;
        if (MOVE_KEYS.left.some((k) => down.has(k))) x -= 1;
        if (MOVE_KEYS.right.some((k) => down.has(k))) x += 1;
        if (MOVE_KEYS.up.some((k) => down.has(k))) y -= 1;
        if (MOVE_KEYS.down.some((k) => down.has(k))) y += 1;
        const len = Math.hypot(x, y);
        return len > 1e-6 ? [x / len, y / len] : [0, 0];
      },
      isDown(code) {
        return down.has(code.toLowerCase());
      },
      isTap(code) {
        return pressed.has(code.toLowerCase());
      },
      mouse() {
        return mousePos;
      },
      endFrame() {
        pressed.clear();
      }
    };
  })();

  // src/core/camera.js
  var Camera = class {
    constructor(viewW = 768, minViewH = 420) {
      this.x = 0;
      this.y = 0;
      this.viewW = viewW;
      this.minViewH = minViewH;
      this.w = viewW;
      this.h = minViewH;
      this.scale = 1;
      this.dpr = 1;
      this.shake = 0;
      this.shakeX = 0;
      this.shakeY = 0;
    }
    resize(canvasWidth, canvasHeight, dpr = 1) {
      this.dpr = dpr;
      this.scale = Math.min(canvasWidth / this.viewW, canvasHeight / this.minViewH);
      this.w = canvasWidth / this.scale;
      this.h = canvasHeight / this.scale;
    }
    follow(targetX, targetY, dt) {
      const factor = 1 - Math.exp(-9 * dt);
      this.x += (targetX - this.x) * factor;
      this.y += (targetY - this.y) * factor;
      if (this.shake > 0) {
        this.shake = Math.max(0, this.shake - dt * 2.5);
        const amp = this.shake * 6;
        this.shakeX = (Math.random() * 2 - 1) * amp;
        this.shakeY = (Math.random() * 2 - 1) * amp;
      } else {
        this.shakeX = 0;
        this.shakeY = 0;
      }
    }
    snapTo(targetX, targetY) {
      this.x = targetX;
      this.y = targetY;
    }
    kick(amount = 0.5) {
      this.shake = Math.min(1.2, this.shake + amount);
    }
    left() {
      return this.x - this.w / 2;
    }
    top() {
      return this.y - this.h / 2;
    }
    sees(px, py, pad = 64) {
      return px >= this.left() - pad && px <= this.left() + this.w + pad && py >= this.top() - pad && py <= this.top() + this.h + pad;
    }
    apply(ctx) {
      ctx.scale(this.scale, this.scale);
      const tx = -this.left() + this.shakeX;
      const ty = -this.top() + this.shakeY;
      ctx.translate(Math.round(tx), Math.round(ty));
    }
  };

  // src/world/tiles.js
  function rgb(hex) {
    const h = hex.replace("#", "");
    const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
    return [n >> 16 & 255, n >> 8 & 255, n & 255];
  }
  function pack(hex, a = 255) {
    const [r, g, b] = rgb(hex);
    return (a << 24 | b << 16 | g << 8 | r) >>> 0;
  }
  function mixPack(h1, h2, t) {
    const a = rgb(h1), b = rgb(h2);
    const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
    return (255 << 24 | c[2] << 16 | c[1] << 8 | c[0]) >>> 0;
  }
  function Pix(w, h) {
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    const c = cv.getContext("2d");
    const img = c.createImageData(w, h);
    const buf = new Uint32Array(img.data.buffer);
    return {
      w,
      h,
      set(x, y, col) {
        if (x >= 0 && y >= 0 && x < w && y < h) {
          buf[y * w + x] = col;
        }
      },
      get(x, y) {
        return x >= 0 && y >= 0 && x < w && y < h ? buf[y * w + x] : 0;
      },
      canvas() {
        c.putImageData(img, 0, 0);
        return cv;
      }
    };
  }
  function hash(x, y, s = 0) {
    let h = x * 374761393 + y * 668265263 + (s + 13) * 1442695040888963300 ^ 1542469173;
    h = Math.imul(h ^ h >>> 13, 1274126177);
    return ((h ^ h >>> 16) >>> 0) / 4294967296;
  }
  var Tiles = (() => {
    const T = 16;
    const BIOME_DATA = {
      forest: {
        floor: ["#4d7338", "#5b8543", "#436630"],
        dirt: ["#69563d", "#786245", "#5b4a34"],
        speck: "#354f26",
        light: "#72a654",
        flowers: ["#fde047", "#f472b6", "#38bdf8", "#ffffff"],
        wallTop: ["#64748b", "#718096", "#526075"],
        wallLight: "#94a3b8",
        wallEdge: "#1e293b",
        wallFace: ["#475569", "#3b4759"],
        wallFaceDark: "#0f172a",
        liq: "#0284c7",
        liqDeep: "#0369a1",
        foam: "#bae6fd",
        shore: "#3d4f2a"
      },
      snow: {
        floor: ["#e2e8f0", "#f1f5f9", "#cbd5e1"],
        dirt: ["#94a3b8", "#a8b8cc", "#64748b"],
        speck: "#94a3b8",
        light: "#ffffff",
        flowers: ["#bfdbfe", "#ffffff", "#93c5fd"],
        wallTop: ["#cbd5e1", "#e2e8f0", "#94a3b8"],
        wallLight: "#ffffff",
        wallEdge: "#334155",
        wallFace: ["#64748b", "#475569"],
        wallFaceDark: "#1e293b",
        liq: "#1d4ed8",
        liqDeep: "#1e3a8a",
        foam: "#bfdbfe",
        shore: "#94a3b8"
      },
      desert: {
        floor: ["#d97706", "#eab308", "#ca8a04"],
        dirt: ["#b45309", "#92400e", "#78350f"],
        speck: "#92400e",
        light: "#fde047",
        flowers: ["#ef4444", "#f97316", "#fbbf24"],
        wallTop: ["#c2410c", "#ea580c", "#9a3412"],
        wallLight: "#fb923c",
        wallEdge: "#7c2d12",
        wallFace: ["#9a3412", "#7c2d12"],
        wallFaceDark: "#431407",
        liq: "#0284c7",
        liqDeep: "#0369a1",
        foam: "#7dd3fc",
        shore: "#b45309"
      },
      volcano: {
        floor: ["#18181b", "#27272a", "#09090b"],
        dirt: ["#451a03", "#78350f", "#27272a"],
        speck: "#ea580c",
        light: "#f97316",
        flowers: ["#f97316", "#ef4444", "#facc15"],
        wallTop: ["#0f172a", "#1e293b", "#090d16"],
        wallLight: "#475569",
        wallEdge: "#020617",
        wallFace: ["#1e1b4b", "#0f172a"],
        wallFaceDark: "#020617",
        liq: "#dc2626",
        liqDeep: "#991b1b",
        foam: "#facc15",
        // Schiuma incandescente di lava!
        shore: "#78350f"
      },
      village: {
        floor: ["#64748b", "#718096", "#526075"],
        // Lastricato in pietra
        dirt: ["#475569", "#334155", "#475569"],
        // Sentieri di ciottoli
        speck: "#334155",
        light: "#94a3b8",
        flowers: ["#fde047", "#f472b6", "#ffffff"],
        wallTop: ["#475569", "#526075", "#334155"],
        wallLight: "#94a3b8",
        wallEdge: "#0f172a",
        wallFace: ["#334155", "#1e293b"],
        wallFaceDark: "#0f172a",
        liq: "#0284c7",
        liqDeep: "#0369a1",
        foam: "#e0f2fe",
        shore: "#475569"
      }
    };
    const PALETTES = {};
    for (const [name, B] of Object.entries(BIOME_DATA)) {
      const C = {};
      for (const k of ["floor", "dirt", "wallTop", "wallFace", "flowers"]) {
        C[k] = B[k].map((h) => pack(h));
      }
      for (const k of ["speck", "light", "wallLight", "wallEdge", "wallFaceDark", "liq", "liqDeep", "foam", "shore"]) {
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
      let dirtCount = 0;
      const isVillage = biome === "village";
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
      if (at(tx, ty - 1) === "wall") {
        for (let x = 0; x < T; x++) {
          P.set(ox + x, oy, C.wallFaceDark);
          if ((x + ty) % 2 === 0) P.set(ox + x, oy + 1, C.speck);
        }
      }
      const d = hash(tx, ty, 14);
      const fx = ox + 3 + Math.floor(hash(tx, ty, 15) * 10);
      const fy = oy + 4 + Math.floor(hash(tx, ty, 16) * 9);
      if (dirtCount <= T * T / 2 && !isVillage) {
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
      const W = (x, y) => at(x, y) === "wall";
      const n = W(tx, ty - 1), s = W(tx, ty + 1), w = W(tx - 1, ty), e = W(tx + 1, ty);
      const FACE = s ? 0 : 6;
      for (let y = 0; y < T; y++) {
        for (let x = 0; x < T; x++) {
          if (!n && !w && x + y < 3) continue;
          if (!n && !e && T - 1 - x + y < 3) continue;
          if (!s && !w && x + (T - 1 - y) < 2) continue;
          if (!s && !e && T - 1 - x + (T - 1 - y) < 2) continue;
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
      const L = (x, y) => at(x, y) === "liquid";
      const n = L(tx, ty - 1), s = L(tx, ty + 1), w = L(tx - 1, ty), e = L(tx + 1, ty);
      const nw = L(tx - 1, ty - 1), ne = L(tx + 1, ty - 1), sw = L(tx - 1, ty + 1), se = L(tx + 1, ty + 1);
      const BIG = 99;
      for (let y = 0; y < T; y++) {
        for (let x = 0; x < T; x++) {
          if (!n && !w && x + y < 3) continue;
          if (!n && !e && T - 1 - x + y < 3) continue;
          if (!s && !w && x + (T - 1 - y) < 3) continue;
          if (!s && !e && T - 1 - x + (T - 1 - y) < 3) continue;
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
            return xx >= 0 && yy >= 0 && xx < P.w && yy < P.h && P.get(xx, yy) >>> 24;
          });
          if (near) marks.push([x, y]);
        }
      }
      for (const [x, y] of marks) P.set(x, y, col);
    }
    function paintTree() {
      const P = Pix(32, 42);
      const L = ["#166534", "#15803d", "#22c55e", "#4ade80"].map((h) => pack(h));
      const Tr = ["#451a03", "#78350f"].map((h) => pack(h));
      const edge = pack("#0f172a");
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
          return hash(x, y, 41) < 0.15 && idx > 0 ? L[idx - 1] : L[idx];
        });
      }
      outline(P, edge);
      return P.canvas();
    }
    function paintPine() {
      const P = Pix(32, 46);
      const green = pack("#064e3b");
      const snow = pack("#f8fafc");
      const snowShadow = pack("#cbd5e1");
      const trunk = pack("#451a03");
      const edge = pack("#090d16");
      for (let y = 36; y < 44; y++) {
        for (let x = 14; x <= 17; x++) P.set(x, y, trunk);
      }
      const tiers = [
        { yTop: 6, yBot: 18, wMax: 9 },
        { yTop: 15, yBot: 28, wMax: 13 },
        { yTop: 24, yBot: 38, wMax: 16 }
      ];
      for (const tier of tiers) {
        for (let y = tier.yTop; y <= tier.yBot; y++) {
          const span = Math.round((y - tier.yTop) / (tier.yBot - tier.yTop) * tier.wMax);
          for (let x = 16 - span; x <= 16 + span; x++) {
            const isSnow = y - tier.yTop < 3;
            P.set(x, y, isSnow ? x % 2 === 0 ? snow : snowShadow : green);
          }
        }
      }
      outline(P, edge);
      return P.canvas();
    }
    function paintCactus() {
      const P = Pix(26, 38);
      const cMain = pack("#15803d");
      const cLight = pack("#22c55e");
      const cDark = pack("#14532d");
      const edge = pack("#052e16");
      for (let y = 6; y < 36; y++) {
        for (let x = 11; x <= 15; x++) {
          P.set(x, y, x === 11 ? cLight : x === 15 ? cDark : cMain);
        }
      }
      for (let x = 4; x <= 11; x++) P.set(x, 22, cMain);
      for (let y = 14; y <= 22; y++) {
        P.set(4, y, cLight);
        P.set(5, y, cMain);
      }
      for (let x = 15; x <= 22; x++) P.set(x, 18, cMain);
      for (let y = 10; y <= 18; y++) {
        P.set(21, y, cMain);
        P.set(22, y, cDark);
      }
      outline(P, edge);
      return P.canvas();
    }
    function paintVolcanoRock() {
      const P = Pix(26, 20);
      const cDark = pack("#09090b");
      const cMid = pack("#27272a");
      const cFire = pack("#ea580c");
      const cYellow = pack("#facc15");
      const edge = pack("#000000");
      for (let y = 2; y <= 17; y++) {
        for (let x = 2; x <= 23; x++) {
          const nx = (x - 12.5) / 10.5;
          const ny = (y - 9.5) / 7.5;
          if (nx * nx + ny * ny > 1) continue;
          let c = hash(x, y, 91) > 0.4 ? cDark : cMid;
          if (Math.abs(x - y + 2) <= 1 && y > 5 && y < 15) {
            c = hash(x, y, 92) > 0.5 ? cFire : cYellow;
          }
          P.set(x, y, c);
        }
      }
      outline(P, edge);
      return P.canvas();
    }
    function paintRock(colorType = "slate") {
      const P = Pix(24, 18);
      const R = colorType === "sand" ? ["#7c2d12", "#c2410c", "#fb923c"].map((h) => pack(h)) : ["#475569", "#64748b", "#94a3b8"].map((h) => pack(h));
      const edge = pack("#0f172a");
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
    function paintHouse(roofType = "red") {
      const W = 64;
      const H = 54;
      const P = Pix(W, H);
      const isRed = roofType === "red";
      const cRoofDark = pack(isRed ? "#991b1b" : "#1e3a8a");
      const cRoofMain = pack(isRed ? "#dc2626" : "#2563eb");
      const cRoofLight = pack(isRed ? "#ef4444" : "#60a5fa");
      const cWallStone = pack("#e2e8f0");
      const cWallShadow = pack("#94a3b8");
      const cBeamWood = pack("#451a03");
      const cDoor = pack("#78350f");
      const cWindowGlow = pack("#fde047");
      const cWindowFrame = pack("#1e293b");
      const cChimney = pack("#475569");
      const cEdge = pack("#090d16");
      for (let y = 4; y <= 16; y++) {
        for (let x = 10; x <= 16; x++) P.set(x, y, cChimney);
      }
      for (let x = 9; x <= 17; x++) P.set(x, 4, cEdge);
      for (let y = 26; y < 50; y++) {
        for (let x = 8; x < 56; x++) {
          const isStone = x % 6 === 0 || y % 6 === 0 ? cWallShadow : cWallStone;
          P.set(x, y, isStone);
        }
      }
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
      for (let y = 35; y < 49; y++) {
        for (let x = 28; x <= 35; x++) P.set(x, y, cDoor);
      }
      P.set(34, 42, pack("#facc15"));
      const windows = [16, 42];
      for (const wx of windows) {
        for (let y = 33; y <= 41; y++) {
          for (let x = wx; x <= wx + 7; x++) {
            const isFrame = x === wx || x === wx + 7 || y === 33 || y === 41 || x === wx + 3 || y === 37;
            P.set(x, y, isFrame ? cWindowFrame : cWindowGlow);
          }
        }
      }
      const roofTopY = 8;
      const roofBotY = 27;
      for (let y = roofTopY; y <= roofBotY; y++) {
        const span = Math.round((y - roofTopY) / (roofBotY - roofTopY) * 28);
        for (let x = 32 - span; x <= 32 + span; x++) {
          const isBorder = x === 32 - span || x === 32 + span;
          const shingle = y % 3 === 0 ? cRoofLight : isBorder ? cRoofDark : cRoofMain;
          P.set(x, y, shingle);
        }
      }
      for (let x = 3; x <= 61; x++) P.set(x, 27, cBeamWood);
      outline(P, cEdge);
      return P.canvas();
    }
    function paintWell() {
      const P = Pix(28, 30);
      const cStone = pack("#64748b");
      const cStoneLight = pack("#94a3b8");
      const cWood = pack("#5b4a34");
      const cWater = pack("#0284c7");
      const cEdge = pack("#0f172a");
      for (let y = 2; y <= 9; y++) {
        const span = Math.round((y - 2) / 7 * 11);
        for (let x = 14 - span; x <= 14 + span; x++) P.set(x, y, cWood);
      }
      for (let y = 9; y <= 20; y++) {
        P.set(5, y, cWood);
        P.set(22, y, cWood);
      }
      for (let y = 18; y <= 26; y++) {
        for (let x = 3; x <= 24; x++) {
          P.set(x, y, y === 18 && x > 7 && x < 20 ? cWater : x % 3 === 0 ? cStoneLight : cStone);
        }
      }
      outline(P, cEdge);
      return P.canvas();
    }
    function paintLamppost() {
      const P = Pix(16, 32);
      const cIron = pack("#1e293b");
      const cGlow = pack("#fde047");
      const cEdge = pack("#020617");
      for (let y = 8; y <= 29; y++) {
        P.set(7, y, cIron);
        P.set(8, y, cIron);
      }
      for (let y = 4; y <= 10; y++) {
        for (let x = 5; x <= 10; x++) {
          P.set(x, y, x === 5 || x === 10 || y === 4 || y === 10 ? cIron : cGlow);
        }
      }
      outline(P, cEdge);
      return P.canvas();
    }
    const propCache = /* @__PURE__ */ new Map();
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
            const biome = getBiome ? getBiome(tx, ty) : "forest";
            const C = PALETTES[biome] || PALETTES.forest;
            paintFloor(P, C, ox, oy, tx, ty, dirtAt, at, biome);
            if (kind === "wall") {
              paintWall(P, C, ox, oy, tx, ty, at);
            } else if (kind === "liquid") {
              paintLiquid(P, C, ox, oy, tx, ty, at);
            }
          }
        }
        return P.canvas();
      },
      getPropSprite(type) {
        if (!propCache.has(type)) {
          if (type === "tree") propCache.set(type, paintTree());
          else if (type === "pine") propCache.set(type, paintPine());
          else if (type === "cactus") propCache.set(type, paintCactus());
          else if (type === "volcano_rock") propCache.set(type, paintVolcanoRock());
          else if (type === "sand_rock") propCache.set(type, paintRock("sand"));
          else if (type === "rock") propCache.set(type, paintRock("slate"));
          else if (type === "house_red") propCache.set(type, paintHouse("red"));
          else if (type === "house_blue") propCache.set(type, paintHouse("blue"));
          else if (type === "well") propCache.set(type, paintWell());
          else if (type === "lamppost") propCache.set(type, paintLamppost());
        }
        return propCache.get(type);
      }
    };
  })();

  // src/core/sprites.js
  var Sprites = /* @__PURE__ */ (() => {
    const PX = 2;
    const cache = /* @__PURE__ */ new Map();
    function dirFromAngle(angle) {
      return (Math.round((Math.PI / 2 - angle) / (Math.PI / 4)) % 8 + 8) % 8;
    }
    function createOffscreen(w, h) {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      return { canvas: c, ctx };
    }
    const PALETTE = {
      outline: "#090d16",
      cloakDark: "#1e1b4b",
      cloakMain: "#312e81",
      cloakLight: "#4f46e5",
      tunic: "#0284c7",
      tunicLight: "#38bdf8",
      belt: "#b45309",
      buckle: "#fde047",
      skin: "#fde047",
      skinShadow: "#d97706",
      hair: "#e2e8f0",
      hairShadow: "#94a3b8",
      boots: "#0f172a",
      staffWood: "#451a03",
      staffLight: "#78350f",
      gemGlow: "#38bdf8",
      gemCore: "#ffffff"
    };
    function renderHeroFrame(dir, isWalking, frameIndex, weapon = "staff") {
      const w = 26 * PX;
      const h = 28 * PX;
      const { canvas, ctx } = createOffscreen(w, h);
      const bob = isWalking ? Math.sin(frameIndex * Math.PI) * 1.5 * PX : frameIndex % 2 === 1 ? -1 * PX : 0;
      const leg = isWalking ? (frameIndex % 2 === 0 ? 1 : -1) * 2 * PX : 0;
      const cx = Math.floor(w / 2);
      const cy = Math.floor(h / 2) + bob;
      const isFacingUp = dir === 3 || dir === 4 || dir === 5;
      const isFacingRight = dir === 1 || dir === 2 || dir === 3;
      const isFacingLeft = dir === 5 || dir === 6 || dir === 7;
      ctx.fillStyle = PALETTE.outline;
      ctx.fillRect(cx - 6 * PX, cy - 4 * PX, 12 * PX, 13 * PX);
      ctx.fillStyle = PALETTE.cloakDark;
      ctx.fillRect(cx - 5 * PX, cy - 3 * PX, 10 * PX, 11 * PX);
      ctx.fillStyle = PALETTE.outline;
      ctx.fillRect(cx - 4 * PX - 1, cy + 6 * PX + leg - 1, 3 * PX + 2, 4 * PX + 2);
      ctx.fillRect(cx + 1 * PX - 1, cy + 6 * PX - leg - 1, 3 * PX + 2, 4 * PX + 2);
      ctx.fillStyle = PALETTE.boots;
      ctx.fillRect(cx - 4 * PX, cy + 6 * PX + leg, 3 * PX, 4 * PX);
      ctx.fillRect(cx + 1 * PX, cy + 6 * PX - leg, 3 * PX, 4 * PX);
      ctx.fillStyle = PALETTE.cloakMain;
      ctx.fillRect(cx - 4 * PX, cy - 4 * PX, 8 * PX, 10 * PX);
      ctx.fillStyle = PALETTE.cloakLight;
      ctx.fillRect(isFacingLeft ? cx - 4 * PX : cx + 2 * PX, cy - 4 * PX, 2 * PX, 10 * PX);
      ctx.fillStyle = PALETTE.belt;
      ctx.fillRect(cx - 4 * PX, cy + 2 * PX, 8 * PX, 2 * PX);
      ctx.fillStyle = PALETTE.buckle;
      ctx.fillRect(cx - 1 * PX, cy + 2 * PX, 2 * PX, 2 * PX);
      ctx.fillStyle = PALETTE.outline;
      ctx.fillRect(cx - 5 * PX, cy - 12 * PX, 10 * PX, 8 * PX);
      ctx.fillStyle = PALETTE.hair;
      ctx.fillRect(cx - 4 * PX, cy - 11 * PX, 8 * PX, 7 * PX);
      ctx.fillStyle = PALETTE.hairShadow;
      ctx.fillRect(cx - 4 * PX, cy - 6 * PX, 8 * PX, 2 * PX);
      if (!isFacingUp) {
        ctx.fillStyle = PALETTE.skin;
        ctx.fillRect(cx - 3 * PX, cy - 9 * PX, 6 * PX, 5 * PX);
        ctx.fillStyle = PALETTE.skinShadow;
        ctx.fillRect(cx - 3 * PX, cy - 5 * PX, 6 * PX, 1 * PX);
        ctx.fillStyle = "#0f172a";
        if (isFacingRight) {
          ctx.fillRect(cx + 1 * PX, cy - 8 * PX, 2 * PX, 2 * PX);
        } else if (isFacingLeft) {
          ctx.fillRect(cx - 3 * PX, cy - 8 * PX, 2 * PX, 2 * PX);
        } else {
          ctx.fillRect(cx - 2 * PX, cy - 8 * PX, 1.5 * PX, 2 * PX);
          ctx.fillRect(cx + 1 * PX, cy - 8 * PX, 1.5 * PX, 2 * PX);
        }
      }
      ctx.fillStyle = PALETTE.cloakMain;
      ctx.fillRect(cx - 5 * PX, cy - 13 * PX, 10 * PX, 3 * PX);
      ctx.fillStyle = PALETTE.cloakLight;
      ctx.fillRect(cx - 4 * PX, cy - 14 * PX, 8 * PX, 2 * PX);
      const wepX = isFacingLeft ? cx - 8 * PX : cx + 6 * PX;
      const wepY = cy - 9 * PX;
      if (weapon === "sword") {
        ctx.fillStyle = PALETTE.outline;
        ctx.fillRect(wepX - 1, wepY - 2 * PX, 2 * PX + 2, 13 * PX + 2);
        ctx.fillStyle = "#e2e8f0";
        ctx.fillRect(wepX, wepY - 2 * PX, 2 * PX, 13 * PX);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(wepX, wepY - 2 * PX, 1 * PX, 13 * PX);
        ctx.fillStyle = PALETTE.outline;
        ctx.fillRect(wepX - 2 * PX - 1, wepY + 8 * PX - 1, 6 * PX + 2, 2 * PX + 2);
        ctx.fillStyle = "#f59e0b";
        ctx.fillRect(wepX - 2 * PX, wepY + 8 * PX, 6 * PX, 2 * PX);
        ctx.fillStyle = "#78350f";
        ctx.fillRect(wepX, wepY + 10 * PX, 2 * PX, 3 * PX);
        ctx.fillStyle = "#f59e0b";
        ctx.fillRect(wepX, wepY + 13 * PX, 2 * PX, 1 * PX);
      } else if (weapon === "bow") {
        ctx.fillStyle = PALETTE.outline;
        ctx.fillRect(wepX - 1, wepY - 1 * PX, 3 * PX + 2, 16 * PX + 2);
        ctx.fillStyle = "#92400e";
        ctx.fillRect(wepX, wepY - 1 * PX, 3 * PX, 16 * PX);
        ctx.fillStyle = "#d97706";
        ctx.fillRect(wepX + 1 * PX, wepY + 1 * PX, 1 * PX, 12 * PX);
        ctx.fillStyle = "#f8fafc";
        const cordX = isFacingLeft ? wepX + 3 * PX : wepX - 1 * PX;
        ctx.fillRect(cordX, wepY, 1 * PX, 14 * PX);
      } else {
        ctx.fillStyle = PALETTE.outline;
        ctx.fillRect(wepX - 1, wepY - 1, 2 * PX + 2, 16 * PX + 2);
        ctx.fillStyle = PALETTE.staffWood;
        ctx.fillRect(wepX, wepY, 2 * PX, 16 * PX);
        ctx.fillStyle = PALETTE.staffLight;
        ctx.fillRect(wepX, wepY, 1 * PX, 16 * PX);
        ctx.fillStyle = "rgba(56, 189, 248, 0.4)";
        ctx.fillRect(wepX - 2 * PX, wepY - 3 * PX, 6 * PX, 6 * PX);
        ctx.fillStyle = PALETTE.gemGlow;
        ctx.fillRect(wepX - 1 * PX, wepY - 2 * PX, 4 * PX, 4 * PX);
        ctx.fillStyle = PALETTE.gemCore;
        ctx.fillRect(wepX, wepY - 1 * PX, 2 * PX, 2 * PX);
      }
      return canvas;
    }
    function drawShadow(ctx, x, y, radius = 10) {
      ctx.save();
      ctx.fillStyle = "rgba(8, 12, 20, 0.45)";
      ctx.beginPath();
      ctx.ellipse(Math.round(x), Math.round(y), radius * PX, radius * 0.42 * PX, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    function renderSlimeFrame(type = "forest", frameIndex = 0) {
      const w = 22 * PX;
      const h = 20 * PX;
      const { canvas, ctx } = createOffscreen(w, h);
      let cOutline = "#052e16", cBase = "#16a34a", cLight = "#4ade80", cHighlight = "#bbf7d0";
      if (type === "water") {
        cOutline = "#082f49";
        cBase = "#0284c7";
        cLight = "#38bdf8";
        cHighlight = "#bae6fd";
      } else if (type === "ice") {
        cOutline = "#1e293b";
        cBase = "#93c5fd";
        cLight = "#dbeafe";
        cHighlight = "#ffffff";
      } else if (type === "sand") {
        cOutline = "#78350f";
        cBase = "#d97706";
        cLight = "#fbbf24";
        cHighlight = "#fef08a";
      } else if (type === "magma") {
        cOutline = "#451a03";
        cBase = "#dc2626";
        cLight = "#f97316";
        cHighlight = "#fde047";
      }
      const cx = Math.floor(w / 2);
      let sx = 0;
      let sy = 0;
      let yOff = 0;
      if (frameIndex === 1) {
        sx = 2 * PX;
        sy = -2 * PX;
        yOff = 2 * PX;
      } else if (frameIndex === 2) {
        sx = -1 * PX;
        sy = 3 * PX;
        yOff = -3 * PX;
      }
      const bx = cx - 7 * PX - sx / 2;
      const by = h - 14 * PX - sy + yOff;
      const bw = 14 * PX + sx;
      const bh = 10 * PX + sy;
      const rx = Math.round(bx);
      const ry = Math.round(by);
      const rw = Math.round(bw);
      const rh = Math.round(bh);
      ctx.fillStyle = cOutline;
      ctx.fillRect(rx + 2 * PX, ry, rw - 4 * PX, rh);
      ctx.fillRect(rx, ry + 2 * PX, rw, rh - 2 * PX);
      ctx.fillRect(rx + 1 * PX, ry + 1 * PX, rw - 2 * PX, rh - 1 * PX);
      ctx.fillStyle = cBase;
      ctx.fillRect(rx + 2 * PX, ry + 1 * PX, rw - 4 * PX, rh - 2 * PX);
      ctx.fillRect(rx + 1 * PX, ry + 2 * PX, rw - 2 * PX, rh - 3 * PX);
      ctx.fillStyle = cLight;
      ctx.fillRect(rx + 3 * PX, ry + 2 * PX, rw - 6 * PX, 2 * PX);
      ctx.fillStyle = cHighlight;
      ctx.fillRect(rx + 4 * PX, ry + 2 * PX, 3 * PX, 1 * PX);
      const eyeY = ry + Math.floor(rh * 0.42);
      ctx.fillStyle = cOutline;
      ctx.fillRect(cx - 4 * PX, eyeY, 2 * PX, 3 * PX);
      ctx.fillRect(cx + 2 * PX, eyeY, 2 * PX, 3 * PX);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(cx - 4 * PX, eyeY, 1 * PX, 1 * PX);
      ctx.fillRect(cx + 2 * PX, eyeY, 1 * PX, 1 * PX);
      return canvas;
    }
    function renderSkeletonFrame(dir, isWalking, frameIndex) {
      const w = 24 * PX;
      const h = 28 * PX;
      const { canvas, ctx } = createOffscreen(w, h);
      const cx = Math.floor(w / 2);
      const bob = isWalking ? frameIndex % 2 === 1 ? -1 * PX : 0 : 0;
      const cy = Math.floor(h / 2) + bob;
      const leg = isWalking ? (frameIndex % 2 === 0 ? 1 : -1) * 2 * PX : 0;
      const isFacingLeft = dir === 5 || dir === 6 || dir === 7;
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(cx - 3 * PX - 1, cy + 5 * PX + leg - 1, 2 * PX + 2, 5 * PX + 2);
      ctx.fillRect(cx + 1 * PX - 1, cy + 5 * PX - leg - 1, 2 * PX + 2, 5 * PX + 2);
      ctx.fillStyle = "#cbd5e1";
      ctx.fillRect(cx - 3 * PX, cy + 5 * PX + leg, 2 * PX, 5 * PX);
      ctx.fillRect(cx + 1 * PX, cy + 5 * PX - leg, 2 * PX, 5 * PX);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(cx - 4 * PX - 1, cy - 3 * PX - 1, 8 * PX + 2, 8 * PX + 2);
      ctx.fillStyle = "#f1f5f9";
      ctx.fillRect(cx - 4 * PX, cy - 3 * PX, 8 * PX, 8 * PX);
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(cx - 3 * PX, cy - 1 * PX, 6 * PX, 1 * PX);
      ctx.fillRect(cx - 3 * PX, cy + 1 * PX, 6 * PX, 1 * PX);
      ctx.fillRect(cx - 2 * PX, cy + 3 * PX, 4 * PX, 1 * PX);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(cx - 4 * PX - 1, cy - 11 * PX - 1, 8 * PX + 2, 8 * PX + 2);
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(cx - 4 * PX, cy - 11 * PX, 8 * PX, 8 * PX);
      ctx.fillStyle = "#475569";
      ctx.fillRect(cx - 5 * PX, cy - 13 * PX, 10 * PX, 4 * PX);
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(cx - 4 * PX, cy - 12 * PX, 8 * PX, 1 * PX);
      ctx.fillStyle = "#78350f";
      ctx.fillRect(cx - 1 * PX, cy - 15 * PX, 2 * PX, 2 * PX);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(cx - 3 * PX, cy - 8 * PX, 2 * PX, 2 * PX);
      ctx.fillRect(cx + 1 * PX, cy - 8 * PX, 2 * PX, 2 * PX);
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(cx - 2 * PX, cy - 8 * PX, 1 * PX, 1 * PX);
      ctx.fillRect(cx + 2 * PX, cy - 8 * PX, 1 * PX, 1 * PX);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(cx - 2 * PX, cy - 4 * PX, 4 * PX, 1 * PX);
      const swordX = isFacingLeft ? cx - 8 * PX : cx + 6 * PX;
      const swordY = cy - 6 * PX;
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(swordX - 1, swordY - 1, 2 * PX + 2, 12 * PX + 2);
      ctx.fillStyle = "#64748b";
      ctx.fillRect(swordX, swordY, 2 * PX, 12 * PX);
      ctx.fillStyle = "#cbd5e1";
      ctx.fillRect(swordX, swordY, 1 * PX, 12 * PX);
      ctx.fillStyle = "#9a3412";
      ctx.fillRect(swordX - 2 * PX, swordY + 8 * PX, 6 * PX, 2 * PX);
      return canvas;
    }
    function renderGemFrame(color = "cyan", frameIndex = 0) {
      const w = 14 * PX;
      const h = 16 * PX;
      const { canvas, ctx } = createOffscreen(w, h);
      const cx = Math.floor(w / 2);
      const cy = Math.floor(h / 2);
      const isEmerald = color === "emerald";
      const cDark = isEmerald ? "#064e3b" : "#0369a1";
      const cMain = isEmerald ? "#10b981" : "#38bdf8";
      const cBright = isEmerald ? "#a7f3d0" : "#e0f2fe";
      ctx.fillStyle = "#090d16";
      ctx.beginPath();
      ctx.moveTo(cx, cy - 6 * PX);
      ctx.lineTo(cx + 5 * PX, cy);
      ctx.lineTo(cx, cy + 6 * PX);
      ctx.lineTo(cx - 5 * PX, cy);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = cDark;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 5 * PX);
      ctx.lineTo(cx + 4 * PX, cy);
      ctx.lineTo(cx, cy + 5 * PX);
      ctx.lineTo(cx - 4 * PX, cy);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = cMain;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 5 * PX);
      ctx.lineTo(cx + 4 * PX, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx - 4 * PX, cy);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = cBright;
      ctx.fillRect(cx - 1 * PX, cy - 3 * PX, 2 * PX, 3 * PX);
      return canvas;
    }
    function getHeroSprite(dir, isWalking, frame, weapon = "staff") {
      const key = `hero_${weapon}_${dir}_${isWalking ? 1 : 0}_${frame}`;
      if (!cache.has(key)) {
        cache.set(key, renderHeroFrame(dir, isWalking, frame, weapon));
      }
      return cache.get(key);
    }
    function getSlimeSprite(type, frame) {
      const key = `slime_${type}_${frame}`;
      if (!cache.has(key)) {
        cache.set(key, renderSlimeFrame(type, frame));
      }
      return cache.get(key);
    }
    function getSkeletonSprite(dir, isWalking, frame) {
      const key = `skel_${dir}_${isWalking ? 1 : 0}_${frame}`;
      if (!cache.has(key)) {
        cache.set(key, renderSkeletonFrame(dir, isWalking, frame));
      }
      return cache.get(key);
    }
    function getGemSprite(color, frame = 0) {
      const key = `gem_${color}_${frame}`;
      if (!cache.has(key)) {
        cache.set(key, renderGemFrame(color, frame));
      }
      return cache.get(key);
    }
    return {
      PX,
      dirFromAngle,
      getHeroSprite,
      getSlimeSprite,
      getSkeletonSprite,
      getGemSprite,
      drawShadow
    };
  })();

  // src/world/world.js
  var VILLAGE_BUILDINGS = [
    { type: "house_red", tx: -7, ty: -6, wTiles: 4, hTiles: 3, name: "Taverna del Viandante" },
    { type: "house_blue", tx: 3, ty: -6, wTiles: 4, hTiles: 3, name: "Torre dell'Arcimago" },
    { type: "house_blue", tx: -7, ty: 3, wTiles: 4, hTiles: 3, name: "Bottega delle Pozioni" },
    { type: "house_red", tx: 3, ty: 3, wTiles: 4, hTiles: 3, name: "Fucina & Armeria" }
  ];
  var VILLAGE_PROPS = [
    { type: "well", tx: 0, ty: -1 },
    { type: "lamppost", tx: -2, ty: -3 },
    { type: "lamppost", tx: 2, ty: -3 },
    { type: "lamppost", tx: -2, ty: 1 },
    { type: "lamppost", tx: 2, ty: 1 }
  ];
  var World = class {
    constructor(seed = 2026) {
      this.seed = seed;
      this.T = Tiles.T;
      this.PX = Sprites.PX;
      this.TS = this.T * this.PX;
      this.N = 16;
      this.CW = this.N * this.TS;
      this.TILE_FLOOR = 0;
      this.TILE_WALL = 1;
      this.TILE_WATER = 2;
      this.TILE_TREE = 3;
      this.TILE_ROCK = 4;
      this.TILE_PINE = 5;
      this.TILE_CACTUS = 6;
      this.TILE_VOLCANO_ROCK = 7;
      this.TILE_SAND_ROCK = 8;
      this.MAP_RADIUS = 50;
      this.minTile = -this.MAP_RADIUS;
      this.maxTile = this.MAP_RADIUS;
      this.minX = (this.minTile + 2) * this.TS;
      this.maxX = (this.maxTile - 2) * this.TS;
      this.minY = (this.minTile + 2) * this.TS;
      this.maxY = (this.maxTile - 2) * this.TS;
      this.chunkCanvases = /* @__PURE__ */ new Map();
      this.chunkProps = /* @__PURE__ */ new Map();
    }
    hash2D(x, y, s = 0) {
      let h = x * 374761393 + y * 668265263 + (this.seed + s) * 1442695040888963300 ^ 1542469173;
      h = Math.imul(h ^ h >>> 13, 1274126177);
      return ((h ^ h >>> 16) >>> 0) / 4294967296;
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
        return "village";
      }
      if (ty < -8) {
        return "snow";
      }
      if (tx < 0 && ty > 8) {
        return "desert";
      }
      if (tx > 8 || tx >= 0 && ty > 8) {
        return "volcano";
      }
      return "forest";
    }
    isBuildingSolid(tx, ty) {
      for (const b of VILLAGE_BUILDINGS) {
        if (tx >= b.tx && tx < b.tx + b.wTiles && ty >= b.ty + 1 && ty < b.ty + b.hTiles) {
          return true;
        }
      }
      for (const p of VILLAGE_PROPS) {
        if (p.type === "well" && p.tx === tx && p.ty === ty) {
          return true;
        }
        if (p.type === "lamppost" && p.tx === tx && p.ty === ty) {
          return true;
        }
      }
      return false;
    }
    getTileType(tx, ty) {
      if (Math.abs(tx) >= this.MAP_RADIUS - 3 || Math.abs(ty) >= this.MAP_RADIUS - 3) {
        return this.TILE_WALL;
      }
      const biome = this.getBiome(tx, ty);
      if (biome === "village") {
        return this.TILE_FLOOR;
      }
      const wallNoise = this.hash2D(tx, ty, 42);
      const waterNoise = this.hash2D(Math.floor(tx / 3), Math.floor(ty / 3), 101);
      const propNoise = this.hash2D(tx, ty, 77);
      if (biome === "snow") {
        if (wallNoise > 0.81) return this.TILE_WALL;
        if (waterNoise > 0.82) return this.TILE_WATER;
        if (propNoise > 0.77) return this.TILE_PINE;
        if (propNoise > 0.73) return this.TILE_ROCK;
        return this.TILE_FLOOR;
      }
      if (biome === "desert") {
        if (wallNoise > 0.83) return this.TILE_WALL;
        if (waterNoise > 0.9) return this.TILE_WATER;
        if (propNoise > 0.81) return this.TILE_CACTUS;
        if (propNoise > 0.77) return this.TILE_SAND_ROCK;
        return this.TILE_FLOOR;
      }
      if (biome === "volcano") {
        if (wallNoise > 0.8) return this.TILE_WALL;
        if (waterNoise > 0.74) return this.TILE_WATER;
        if (propNoise > 0.78) return this.TILE_VOLCANO_ROCK;
        if (propNoise > 0.74) return this.TILE_ROCK;
        return this.TILE_FLOOR;
      }
      if (wallNoise > 0.86) return this.TILE_WALL;
      if (waterNoise > 0.77) return this.TILE_WATER;
      if (propNoise > 0.76) return this.TILE_TREE;
      if (propNoise > 0.72) return this.TILE_ROCK;
      return this.TILE_FLOOR;
    }
    getKind(tx, ty) {
      const t = this.getTileType(tx, ty);
      if (t === this.TILE_WALL) return "wall";
      if (t === this.TILE_WATER) return "liquid";
      return "floor";
    }
    isSolid(tx, ty) {
      const t = this.getTileType(tx, ty);
      return t === this.TILE_WALL || t === this.TILE_WATER || t === this.TILE_TREE || t === this.TILE_PINE || t === this.TILE_CACTUS || t === this.TILE_VOLCANO_ROCK || t === this.TILE_SAND_ROCK || t === this.TILE_ROCK || this.isBuildingSolid(tx, ty);
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
              if (currentBiome !== "village") {
                return { x: px, y: py };
              }
            }
          }
        }
      }
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
                entity.x += dx / dist * overlap;
                entity.y += dy / dist * overlap;
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
      const canvas = Tiles.paintChunk(
        cx,
        cy,
        this.N,
        (tx, ty) => this.getKind(tx, ty),
        (tx, ty) => this.getBiome(tx, ty),
        this.seed
      );
      this.chunkCanvases.set(key, canvas);
      const props = [];
      for (let lty = 0; lty < this.N; lty++) {
        for (let ltx = 0; ltx < this.N; ltx++) {
          const tx = cx * this.N + ltx;
          const ty = cy * this.N + lty;
          const t = this.getTileType(tx, ty);
          if (t === this.TILE_TREE) {
            props.push({ type: "tree", x: tx * this.TS + this.TS / 2, y: ty * this.TS + this.TS });
          } else if (t === this.TILE_PINE) {
            props.push({ type: "pine", x: tx * this.TS + this.TS / 2, y: ty * this.TS + this.TS });
          } else if (t === this.TILE_CACTUS) {
            props.push({ type: "cactus", x: tx * this.TS + this.TS / 2, y: ty * this.TS + this.TS });
          } else if (t === this.TILE_VOLCANO_ROCK) {
            props.push({ type: "volcano_rock", x: tx * this.TS + this.TS / 2, y: ty * this.TS + this.TS / 2 });
          } else if (t === this.TILE_SAND_ROCK) {
            props.push({ type: "sand_rock", x: tx * this.TS + this.TS / 2, y: ty * this.TS + this.TS / 2 });
          } else if (t === this.TILE_ROCK) {
            props.push({ type: "rock", x: tx * this.TS + this.TS / 2, y: ty * this.TS + this.TS / 2 });
          }
        }
      }
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
                  if (p.type === "house_red" || p.type === "house_blue") {
                    ctx.fillStyle = "rgba(6, 8, 14, 0.45)";
                    ctx.fillRect(Math.round(p.x - sw / 2 + 10), Math.round(p.y - 8), sw - 20, 14);
                    ctx.drawImage(sprite, Math.round(p.x - sw / 2), Math.round(p.y - sh + 8), sw, sh);
                  } else if (p.type === "well") {
                    Sprites.drawShadow(ctx, p.x, p.y - 2, 14);
                    ctx.drawImage(sprite, Math.round(p.x - sw / 2), Math.round(p.y - sh + 6), sw, sh);
                  } else if (p.type === "lamppost") {
                    Sprites.drawShadow(ctx, p.x, p.y - 1, 7);
                    const glow = ctx.createRadialGradient(p.x, p.y - 28, 4, p.x, p.y - 28, 46);
                    glow.addColorStop(0, "rgba(253, 224, 71, 0.22)");
                    glow.addColorStop(1, "rgba(253, 224, 71, 0)");
                    ctx.fillStyle = glow;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y - 28, 46, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.drawImage(sprite, Math.round(p.x - sw / 2), Math.round(p.y - sh + 4), sw, sh);
                  } else {
                    const rad = p.type === "tree" || p.type === "pine" ? 14 : p.type === "cactus" ? 10 : 12;
                    Sprites.drawShadow(ctx, p.x, p.y - 2, rad);
                    const yOff = p.type === "tree" || p.type === "pine" ? 8 : 4;
                    ctx.drawImage(sprite, Math.round(p.x - sw / 2), Math.round(p.y - sh + yOff), sw, sh);
                  }
                }
              });
            }
          }
        }
      }
      for (const e of entities) {
        if (camera.sees(e.x, e.y, 80)) {
          drawList.push({
            y: e.y,
            draw: () => e.draw(ctx)
          });
        }
      }
      drawList.sort((a, b) => a.y - b.y);
      for (const item of drawList) {
        item.draw();
      }
    }
    drawVignette(ctx, width, height) {
      const gradient = ctx.createRadialGradient(
        width / 2,
        height / 2,
        Math.min(width, height) * 0.35,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.78
      );
      gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
      gradient.addColorStop(1, "rgba(6, 8, 14, 0.65)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }
  };

  // src/entities/player.js
  var Player = class {
    constructor(x = 0, y = 0) {
      this.x = x;
      this.y = y;
      this.r = 14;
      this.baseSpd = 105;
      this.hp = 100;
      this.maxHp = 100;
      this.magnetRadius = 85;
      this.permanentBonusDamage = 0;
      this.invulnerableTimer = 0;
      this.dir = 0;
      this.moveAngle = Math.PI / 2;
      this.walking = false;
      this.inLiquid = false;
      this.animTimer = 0;
      this.frame = 0;
      this.weapon = "staff";
    }
    applyPermanentStats(stats = {}) {
      this.maxHp = 100 + (stats.bonusHp || 0);
      this.hp = this.maxHp;
      this.baseSpd = Math.round(105 * (stats.speedMultiplier || 1));
      this.magnetRadius = Math.round(85 * (stats.magnetMultiplier || 1));
      this.permanentBonusDamage = stats.bonusDamage || 0;
    }
    takeDamage(amount) {
      if (this.invulnerableTimer > 0 || this.hp <= 0) return;
      this.hp = Math.max(0, this.hp - amount);
      this.invulnerableTimer = 0.6;
      if (this.hp <= 0 && this.onDeath) {
        this.onDeath();
      }
    }
    get currentSpeed() {
      let s = this.baseSpd;
      if (this.inLiquid) {
        s *= 0.6;
      }
      return s;
    }
    update(dt, input, world) {
      if (this.invulnerableTimer > 0) {
        this.invulnerableTimer -= dt;
      }
      const [ax, ay] = input.axis();
      this.walking = ax !== 0 || ay !== 0;
      if (this.walking) {
        this.moveAngle = Math.atan2(ay, ax);
        this.dir = Sprites.dirFromAngle(this.moveAngle);
        const spd = this.currentSpeed;
        this.x += ax * spd * dt;
        this.y += ay * spd * dt;
        this.animTimer += dt * 8;
        this.frame = Math.floor(this.animTimer) % 4;
      } else {
        this.animTimer += dt * 3.5;
        this.frame = Math.floor(this.animTimer) % 4;
      }
      world.collide(this);
      this.inLiquid = world.isLiquid(this.x, this.y);
    }
    draw(ctx) {
      if (this.invulnerableTimer > 0 && Math.floor(this.invulnerableTimer * 20) % 2 === 0) {
        return;
      }
      Sprites.drawShadow(ctx, this.x, this.y + 4, 11);
      const sprite = Sprites.getHeroSprite(this.dir, this.walking, this.frame, this.weapon);
      const sw = sprite.width;
      const sh = sprite.height;
      ctx.drawImage(
        sprite,
        Math.round(this.x - sw / 2),
        Math.round(this.y - sh + 8)
      );
      if (this.inLiquid && this.walking) {
        ctx.fillStyle = "rgba(56, 189, 248, 0.7)";
        const splashX = this.x + (Math.random() * 16 - 8);
        const splashY = this.y + (Math.random() * 6 - 3);
        ctx.fillRect(Math.round(splashX), Math.round(splashY), 3, 3);
      }
    }
  };

  // src/core/fx.js
  var FX = /* @__PURE__ */ (() => {
    const particles = [];
    const shockwaves = [];
    const slashCuts = [];
    const bones = [];
    const damageTexts = [];
    return {
      /**
       * Esplosione circolare di particelle colorate
       */
      burst(x, y, color = "#38bdf8", count = 8, speed = 120) {
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const s = speed * (0.35 + Math.random() * 0.65);
          particles.push({
            x,
            y,
            vx: Math.cos(angle) * s,
            vy: Math.sin(angle) * s,
            color,
            size: Math.random() < 0.35 ? 3 : 2,
            life: 0.25 + Math.random() * 0.22,
            t: 0
          });
        }
      },
      /**
       * Scia o scintilla direzionale ad alta velocità
       */
      spark(x, y, color = "#bae6fd", size = 2) {
        particles.push({
          x: x + (Math.random() * 4 - 2),
          y: y + (Math.random() * 4 - 2),
          vx: Math.random() * 30 - 15,
          vy: Math.random() * 30 - 15,
          color,
          size,
          life: 0.16 + Math.random() * 0.12,
          t: 0
        });
      },
      /**
       * Anello di onde d'urto ad espansione rapida (impatto colpi e morte mob)
       */
      addShockwave(x, y, maxRadius = 32, color = "#ffffff", duration = 0.24) {
        shockwaves.push({
          x,
          y,
          radius: 4,
          maxRadius,
          color,
          life: duration,
          t: 0
        });
      },
      /**
       * Taglio di fendente d'acciaio con scintille lungo l'angolo d'impatto
       */
      addSlashCut(x, y, angle, length = 26, color = "#ffffff") {
        slashCuts.push({
          x,
          y,
          angle,
          length,
          color,
          life: 0.14,
          t: 0
        });
        for (let i = 0; i < 4; i++) {
          const pAngle = angle + Math.PI / 2 * (Math.random() > 0.5 ? 1 : -1) + (Math.random() * 0.6 - 0.3);
          const spd = 60 + Math.random() * 90;
          particles.push({
            x,
            y,
            vx: Math.cos(pAngle) * spd,
            vy: Math.sin(pAngle) * spd,
            color: Math.random() > 0.3 ? "#fde047" : "#ffffff",
            size: 2,
            life: 0.15 + Math.random() * 0.1,
            t: 0
          });
        }
      },
      /**
       * Sbuffo di fumo o polvere che sale dolcemente
       */
      addSmokePuff(x, y, color = "#94a3b8") {
        for (let i = 0; i < 5; i++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.random() * 8;
          particles.push({
            x: x + Math.cos(angle) * dist,
            y: y + Math.sin(angle) * dist,
            vx: Math.random() * 20 - 10,
            vy: -25 - Math.random() * 25,
            color,
            size: 4 + Math.floor(Math.random() * 3),
            life: 0.35 + Math.random() * 0.2,
            t: 0
          });
        }
      },
      /**
       * Frammenti ossei che rimbalzano al suolo per la morte dello scheletro
       */
      addBones(x, y, count = 6) {
        for (let i = 0; i < count; i++) {
          const angle = -Math.PI / 2 + (Math.random() * 1.6 - 0.8);
          const speed = 70 + Math.random() * 90;
          bones.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            gravity: 280,
            rotation: Math.random() * Math.PI * 2,
            vRot: Math.random() * 12 - 6,
            size: i === 0 ? 6 : 4,
            // Il primo pezzo è il teschio!
            isSkull: i === 0,
            groundY: y + 10 + Math.random() * 8,
            bounces: 2,
            life: 0.55 + Math.random() * 0.2,
            t: 0
          });
        }
      },
      /**
       * Spruzzi e globuli gelatinosi per la morte degli slime
       */
      addSlimeSplat(x, y, color = "#22c55e", count = 10) {
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const spd = 60 + Math.random() * 110;
          particles.push({
            x,
            y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd + 20,
            // Leggera caduta verso terra
            color,
            size: Math.random() < 0.4 ? 4 : 3,
            life: 0.3 + Math.random() * 0.2,
            t: 0
          });
        }
      },
      /**
       * Numero di danno fluttuante con pop-scale iniziale e critico
       */
      addDamageNumber(x, y, amount, isCrit = false) {
        damageTexts.push({
          x: x + (Math.random() * 14 - 7),
          y: y - 10,
          text: isCrit ? `-${amount}!` : `-${amount}`,
          vy: isCrit ? -54 : -42,
          life: 0.72,
          t: 0,
          isCrit,
          scale: isCrit ? 1.4 : 1.15
        });
      },
      /**
       * Testo fluttuante colorato per la raccolta di oggetti e artefatti
       */
      addFloatingText(x, y, text, color = "#22c55e") {
        damageTexts.push({
          x: x + (Math.random() * 8 - 4),
          y: y - 12,
          text,
          vy: -36,
          life: 0.85,
          t: 0,
          color,
          scale: 1.05
        });
      },
      update(dt) {
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.t += dt;
          if (p.t >= p.life) {
            particles.splice(i, 1);
            continue;
          }
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vx *= 0.91;
          p.vy *= 0.91;
        }
        for (let i = shockwaves.length - 1; i >= 0; i--) {
          const sw = shockwaves[i];
          sw.t += dt;
          if (sw.t >= sw.life) {
            shockwaves.splice(i, 1);
            continue;
          }
          const progress = sw.t / sw.life;
          sw.radius = 4 + (sw.maxRadius - 4) * Math.sin(progress * Math.PI * 0.5);
        }
        for (let i = slashCuts.length - 1; i >= 0; i--) {
          const sc = slashCuts[i];
          sc.t += dt;
          if (sc.t >= sc.life) {
            slashCuts.splice(i, 1);
          }
        }
        for (let i = bones.length - 1; i >= 0; i--) {
          const b = bones[i];
          b.t += dt;
          if (b.t >= b.life) {
            bones.splice(i, 1);
            continue;
          }
          b.vy += b.gravity * dt;
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          b.rotation += b.vRot * dt;
          if (b.y >= b.groundY && b.bounces > 0) {
            b.y = b.groundY;
            b.vy = -b.vy * 0.45;
            b.vx *= 0.65;
            b.vRot *= 0.6;
            b.bounces--;
          }
        }
        for (let i = damageTexts.length - 1; i >= 0; i--) {
          const d = damageTexts[i];
          d.t += dt;
          if (d.t >= d.life) {
            damageTexts.splice(i, 1);
            continue;
          }
          d.y += d.vy * dt;
          d.vy *= 0.93;
          if (d.scale > 1) {
            d.scale = Math.max(1, d.scale - dt * 2.5);
          }
        }
      },
      draw(ctx) {
        ctx.save();
        for (const sw of shockwaves) {
          const alpha = Math.max(0, 1 - sw.t / sw.life);
          ctx.strokeStyle = sw.color;
          ctx.globalAlpha = alpha * 0.85;
          ctx.lineWidth = Math.max(1.5, 3 * (1 - sw.t / sw.life));
          ctx.beginPath();
          ctx.arc(Math.round(sw.x), Math.round(sw.y), Math.round(sw.radius), 0, Math.PI * 2);
          ctx.stroke();
        }
        for (const sc of slashCuts) {
          const alpha = Math.max(0, 1 - sc.t / sc.life);
          ctx.save();
          ctx.translate(Math.round(sc.x), Math.round(sc.y));
          ctx.rotate(sc.angle);
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = sc.color;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(-sc.length / 2, 0);
          ctx.lineTo(sc.length / 2, 0);
          ctx.stroke();
          ctx.strokeStyle = "#fde047";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(-sc.length / 3, -1);
          ctx.lineTo(sc.length / 3, 1);
          ctx.stroke();
          ctx.restore();
        }
        for (const b of bones) {
          const alpha = Math.max(0, 1 - b.t / b.life * 0.8);
          ctx.save();
          ctx.translate(Math.round(b.x), Math.round(b.y));
          ctx.rotate(b.rotation);
          ctx.globalAlpha = alpha;
          if (b.isSkull) {
            ctx.fillStyle = "#0f172a";
            ctx.fillRect(-3, -3, 6, 6);
            ctx.fillStyle = "#f8fafc";
            ctx.fillRect(-2, -2, 5, 5);
            ctx.fillStyle = "#ef4444";
            ctx.fillRect(-1, -1, 1, 1);
            ctx.fillRect(1, -1, 1, 1);
          } else {
            ctx.fillStyle = "#0f172a";
            ctx.fillRect(-3, -1, 6, 3);
            ctx.fillStyle = "#cbd5e1";
            ctx.fillRect(-2, 0, 5, 2);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(-2, 0, 2, 1);
          }
          ctx.restore();
        }
        for (const p of particles) {
          const alpha = Math.max(0, 1 - p.t / p.life);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = alpha;
          ctx.fillRect(Math.round(p.x - p.size / 2), Math.round(p.y - p.size / 2), p.size, p.size);
        }
        for (const d of damageTexts) {
          const alpha = Math.max(0, 1 - d.t / d.life);
          ctx.save();
          ctx.globalAlpha = alpha;
          const fontSize = Math.round(13 * (d.scale || 1));
          ctx.font = `bold ${fontSize}px "Courier New", monospace, sans-serif`;
          ctx.textAlign = "center";
          ctx.fillStyle = "#080a0f";
          ctx.fillText(d.text, Math.round(d.x) + 1, Math.round(d.y) + 1);
          ctx.fillText(d.text, Math.round(d.x) - 1, Math.round(d.y) - 1);
          ctx.fillStyle = d.color || (d.isCrit ? "#fde047" : "#e0f2fe");
          ctx.fillText(d.text, Math.round(d.x), Math.round(d.y));
          ctx.restore();
        }
        ctx.restore();
      }
    };
  })();

  // src/entities/enemy.js
  var ENEMY_COLORS = {
    slime_forest: "#22c55e",
    slime_ice: "#93c5fd",
    slime_sand: "#f59e0b",
    slime_magma: "#ef4444",
    slime_water: "#0284c7",
    skeleton: "#cbd5e1"
  };
  var Enemy = class {
    constructor(x, y, kind = "slime_forest") {
      this.x = x;
      this.y = y;
      this.kind = kind;
      this.spawnX = x;
      this.spawnY = y;
      this.color = ENEMY_COLORS[kind] || "#22c55e";
      if (kind === "slime_forest") {
        this.name = "Slime Silvano";
        this.maxHp = 35;
        this.baseSpd = 50;
        this.r = 13;
        this.aggroRadius = 180;
        this.xpValue = 12;
        this.gemType = "cyan";
        this.contactDamage = 6;
        this.goldValue = 4;
      } else if (kind === "slime_ice") {
        this.name = "Slime dei Ghiacci";
        this.maxHp = 42;
        this.baseSpd = 54;
        this.r = 13;
        this.aggroRadius = 190;
        this.xpValue = 15;
        this.gemType = "cyan";
        this.contactDamage = 7;
        this.goldValue = 5;
      } else if (kind === "slime_sand") {
        this.name = "Slime delle Dune";
        this.maxHp = 50;
        this.baseSpd = 58;
        this.r = 13;
        this.aggroRadius = 200;
        this.xpValue = 18;
        this.gemType = "cyan";
        this.contactDamage = 9;
        this.goldValue = 7;
      } else if (kind === "slime_magma") {
        this.name = "Slime di Lava";
        this.maxHp = 60;
        this.baseSpd = 65;
        this.r = 13;
        this.aggroRadius = 210;
        this.xpValue = 22;
        this.gemType = "emerald";
        this.contactDamage = 12;
        this.goldValue = 9;
      } else if (kind === "slime_water") {
        this.name = "Slime delle Onde";
        this.maxHp = 45;
        this.baseSpd = 62;
        this.r = 13;
        this.aggroRadius = 195;
        this.xpValue = 16;
        this.gemType = "cyan";
        this.contactDamage = 8;
        this.goldValue = 6;
      } else {
        this.name = "Scheletro Guardiano";
        this.maxHp = 75;
        this.baseSpd = 72;
        this.r = 14;
        this.aggroRadius = 210;
        this.xpValue = 25;
        this.gemType = "emerald";
        this.contactDamage = 14;
        this.goldValue = 12;
      }
      this.hp = this.maxHp;
      this.dead = false;
      this.isDying = false;
      this.hasDroppedLoot = false;
      this.deathTimer = 0;
      this.deathMaxTimer = 0.36;
      this.state = "WANDER";
      this.wanderTimer = Math.random() * 2;
      this.wanderAngle = Math.random() * Math.PI * 2;
      this.isWanderMoving = false;
      this.dir = 0;
      this.animTimer = Math.random() * 2;
      this.frame = 0;
      this.vx = 0;
      this.vy = 0;
      this.flashTimer = 0;
      this.squashTimer = 0;
      this.alertTimer = 0;
    }
    takeDamage(dmg, knockbackAngle, knockbackForce = 120, attackType = "magic") {
      if (this.dead || this.isDying) return;
      this.hp = Math.max(0, this.hp - dmg);
      this.flashTimer = 0.12;
      this.squashTimer = 0.15;
      if (this.state === "WANDER") {
        this.state = "CHASE";
        this.alertTimer = 0.8;
      }
      this.vx += Math.cos(knockbackAngle) * knockbackForce;
      this.vy += Math.sin(knockbackAngle) * knockbackForce;
      if (attackType === "slash") {
        FX.addSlashCut(this.x, this.y - 8, knockbackAngle, 32);
        FX.addShockwave(this.x, this.y - 8, 18, "#ffffff", 0.15);
        FX.addDamageNumber(this.x, this.y - 20, dmg, true);
      } else if (attackType === "pierce") {
        FX.burst(this.x, this.y - 8, "#fef08a", 5, 105);
        FX.addShockwave(this.x, this.y - 8, 14, "#f59e0b", 0.14);
        FX.addDamageNumber(this.x, this.y - 20, dmg, false);
      } else {
        FX.burst(this.x, this.y - 8, "#38bdf8", 6, 85);
        FX.addDamageNumber(this.x, this.y - 20, dmg, false);
      }
      if (this.hp <= 0 && !this.isDying) {
        this.isDying = true;
        this.state = "DYING";
        this.deathTimer = this.deathMaxTimer;
        if (this.kind.startsWith("slime_")) {
          FX.addShockwave(this.x, this.y + 4, 28, this.color, 0.22);
          FX.addSlimeSplat(this.x, this.y - 4, this.color, 12);
          FX.burst(this.x, this.y - 6, this.color, 14, 130);
        } else {
          FX.addShockwave(this.x, this.y + 4, 32, "#cbd5e1", 0.24);
          FX.addBones(this.x, this.y - 6, 6);
          FX.addSmokePuff(this.x, this.y - 10, "#64748b");
          FX.burst(this.x, this.y - 6, "#f8fafc", 8, 90);
        }
      }
    }
    update(dt, player, world) {
      if (this.dead) return;
      if (this.isDying) {
        this.deathTimer -= dt;
        const friction2 = Math.exp(-12 * dt);
        this.vx *= friction2;
        this.vy *= friction2;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        if (this.deathTimer <= 0) {
          this.dead = true;
        }
        return;
      }
      if (this.flashTimer > 0) {
        this.flashTimer -= dt;
      }
      if (this.squashTimer > 0) {
        this.squashTimer -= dt;
      }
      if (this.alertTimer > 0) {
        this.alertTimer -= dt;
      }
      const friction = Math.exp(-9 * dt);
      this.vx *= friction;
      this.vy *= friction;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (this.state === "WANDER") {
        if (dist < this.aggroRadius) {
          this.state = "CHASE";
          this.alertTimer = 0.8;
        } else {
          this.wanderTimer -= dt;
          if (this.wanderTimer <= 0) {
            this.isWanderMoving = Math.random() > 0.4;
            this.wanderAngle = Math.random() * Math.PI * 2;
            this.wanderTimer = 1.8 + Math.random() * 2.5;
          }
          if (this.isWanderMoving) {
            const spd = this.baseSpd * 0.45;
            this.x += Math.cos(this.wanderAngle) * spd * dt;
            this.y += Math.sin(this.wanderAngle) * spd * dt;
            this.dir = Sprites.dirFromAngle(this.wanderAngle);
            this.animTimer += dt * 4;
          } else {
            this.animTimer += dt * 2;
          }
        }
      } else if (this.state === "CHASE") {
        if (dist > this.aggroRadius * 1.7) {
          this.state = "WANDER";
          this.wanderTimer = 2;
          this.isWanderMoving = false;
        } else if (dist > 18) {
          const angle = Math.atan2(dy, dx);
          this.dir = Sprites.dirFromAngle(angle);
          let spd = this.baseSpd;
          if (world.isLiquid(this.x, this.y)) {
            spd *= 0.65;
          }
          this.x += Math.cos(angle) * spd * dt;
          this.y += Math.sin(angle) * spd * dt;
          this.animTimer += dt * 7;
        }
      }
      world.collide(this);
      this.frame = Math.floor(this.animTimer) % 4;
    }
    draw(ctx) {
      if (this.dead) return;
      if (this.isDying) {
        const p = 1 - this.deathTimer / this.deathMaxTimer;
        if (this.kind.startsWith("slime_")) {
          const scaleX = 1 + p * 0.85;
          const scaleY = Math.max(0.06, 1 - p * 1.15);
          ctx.save();
          ctx.translate(Math.round(this.x), Math.round(this.y + 4));
          ctx.scale(scaleX, scaleY);
          ctx.globalAlpha = Math.max(0, 1 - p * 0.85);
          if (p < 0.3) {
            ctx.filter = "brightness(3.2)";
          }
          const slimeType = this.kind.replace("slime_", "");
          const sprite = Sprites.getSlimeSprite(slimeType, 1);
          const sw = sprite.width;
          const sh = sprite.height;
          ctx.drawImage(sprite, Math.round(-sw / 2), Math.round(-sh + 4));
          ctx.restore();
        } else {
          ctx.save();
          ctx.translate(Math.round(this.x), Math.round(this.y + 4 + p * 8));
          ctx.rotate(p * 0.65 * (this.vx >= 0 ? 1 : -1));
          ctx.globalAlpha = Math.max(0, 1 - p);
          if (p < 0.25) {
            ctx.filter = "brightness(3.0)";
          }
          const sprite = Sprites.getSkeletonSprite(this.dir, false, 0);
          const sw = sprite.width;
          const sh = sprite.height;
          ctx.drawImage(sprite, Math.round(-sw / 2), Math.round(-sh + 8));
          ctx.restore();
        }
        return;
      }
      Sprites.drawShadow(ctx, this.x, this.y + 4, this.kind.startsWith("slime") ? 9 : 10);
      ctx.save();
      if (this.squashTimer > 0) {
        const flinchAmt = this.squashTimer / 0.15 * 0.22;
        ctx.translate(Math.round(this.x), Math.round(this.y));
        ctx.scale(1 + flinchAmt, 1 - flinchAmt);
        ctx.translate(-Math.round(this.x), -Math.round(this.y));
      }
      if (this.flashTimer > 0) {
        ctx.filter = "brightness(2.8)";
      }
      if (this.kind.startsWith("slime_")) {
        const slimeType = this.kind.replace("slime_", "");
        const sprite = Sprites.getSlimeSprite(slimeType, this.frame);
        const sw = sprite.width;
        const sh = sprite.height;
        ctx.drawImage(sprite, Math.round(this.x - sw / 2), Math.round(this.y - sh + 8));
      } else {
        const isWalking = this.state === "CHASE" || this.state === "WANDER" && this.isWanderMoving;
        const sprite = Sprites.getSkeletonSprite(this.dir, isWalking, this.frame);
        const sw = sprite.width;
        const sh = sprite.height;
        ctx.drawImage(sprite, Math.round(this.x - sw / 2), Math.round(this.y - sh + 8));
      }
      ctx.restore();
      if (this.alertTimer > 0) {
        ctx.fillStyle = "#ef4444";
        ctx.font = "bold 12px monospace";
        ctx.textAlign = "center";
        ctx.fillText("!", Math.round(this.x), Math.round(this.y - 28));
      }
      if (this.hp < this.maxHp) {
        const barW = 24;
        const barH = 3;
        const bx = Math.round(this.x - barW / 2);
        const by = Math.round(this.y - 24);
        ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
        ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
        const pct = Math.max(0, this.hp / this.maxHp);
        ctx.fillStyle = pct > 0.4 ? "#ef4444" : "#b91c1c";
        ctx.fillRect(bx, by, Math.round(barW * pct), barH);
      }
    }
  };

  // src/entities/projectile.js
  var Projectile = class {
    constructor(x, y, angle, options = {}) {
      this.x = x;
      this.y = y;
      this.angle = angle;
      this.type = options.type || "dart";
      this.speed = options.speed || (this.type === "arrow" ? 520 : 340);
      this.vx = Math.cos(angle) * this.speed;
      this.vy = Math.sin(angle) * this.speed;
      this.dmg = options.dmg || 18;
      this.r = options.r || (this.type === "arrow" ? 6 : 5);
      this.pierce = options.pierce || (this.type === "arrow" ? 2 : 1);
      this.life = options.life || (this.type === "arrow" ? 1 : 1.1);
      this.t = 0;
      this.dead = false;
      this.hitTargets = /* @__PURE__ */ new Set();
      this.trailTimer = 0;
      this.color = options.color || (this.type === "arrow" ? "#f59e0b" : "#38bdf8");
      this.coreColor = "#ffffff";
    }
    update(dt, world) {
      this.t += dt;
      if (this.t >= this.life) {
        this.dead = true;
        return;
      }
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.trailTimer += dt;
      if (this.trailTimer >= 0.04) {
        this.trailTimer = 0;
        if (this.type === "arrow") {
          FX.spark(this.x, this.y, "#fef08a", 1.5);
        } else {
          FX.spark(this.x, this.y, "#bae6fd", 2);
        }
      }
      const tx = world.tileOf(this.x);
      const ty = world.tileOf(this.y);
      if (world.isSolid(tx, ty)) {
        this.dead = true;
        FX.burst(this.x, this.y, this.type === "arrow" ? "#d97706" : "#93c5fd", 6, 80);
      }
    }
    draw(ctx) {
      ctx.save();
      if (this.type === "arrow") {
        ctx.translate(Math.round(this.x), Math.round(this.y));
        ctx.rotate(this.angle);
        ctx.fillStyle = "rgba(254, 240, 138, 0.3)";
        ctx.fillRect(-16, -2, 12, 4);
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(-12, -2, 22, 4);
        ctx.fillStyle = "#92400e";
        ctx.fillRect(-11, -1, 20, 2);
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(8, -3, 5, 6);
        ctx.fillStyle = "#e2e8f0";
        ctx.fillRect(9, -2, 4, 4);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(10, -1, 3, 2);
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(-12, -4, 4, 2);
        ctx.fillRect(-12, 2, 4, 2);
        ctx.fillStyle = "#bae6fd";
        ctx.fillRect(-10, -3, 2, 1);
        ctx.fillRect(-10, 2, 2, 1);
      } else {
        ctx.fillStyle = "rgba(56, 189, 248, 0.35)";
        ctx.beginPath();
        ctx.arc(Math.round(this.x), Math.round(this.y), this.r * 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(Math.round(this.x), Math.round(this.y), this.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = this.coreColor;
        ctx.beginPath();
        ctx.arc(Math.round(this.x), Math.round(this.y), this.r * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  };

  // src/entities/target.js
  var TrainingTarget = class {
    constructor(x, y, name = "Fantoccio da Guerra", maxHp = 60) {
      this.startX = x;
      this.startY = y;
      this.x = x;
      this.y = y;
      this.name = name;
      this.maxHp = maxHp;
      this.hp = maxHp;
      this.r = 13;
      this.vx = 0;
      this.vy = 0;
      this.flash = 0;
      this.squashTimer = 0;
      this.dead = false;
      this.respawnTimer = 0;
    }
    takeDamage(amount, knockAngle = 0, knockForce = 120, attackType = "magic") {
      if (this.dead) return;
      this.hp = Math.max(0, this.hp - amount);
      this.flash = 0.12;
      this.squashTimer = 0.15;
      this.vx = Math.cos(knockAngle) * knockForce;
      this.vy = Math.sin(knockAngle) * knockForce;
      if (attackType === "slash") {
        FX.addSlashCut(this.x, this.y - 8, knockAngle, 32);
        FX.addShockwave(this.x, this.y - 8, 18, "#ffffff", 0.15);
        FX.addDamageNumber(this.x, this.y - 20, amount, true);
      } else if (attackType === "pierce") {
        FX.burst(this.x, this.y - 8, "#fef08a", 5, 105);
        FX.addShockwave(this.x, this.y - 8, 14, "#f59e0b", 0.14);
        FX.addDamageNumber(this.x, this.y - 20, amount, false);
      } else {
        FX.burst(this.x, this.y - 8, "#38bdf8", 6, 85);
        FX.addDamageNumber(this.x, this.y - 20, amount, false);
      }
      if (this.hp <= 0) {
        this.dead = true;
        this.respawnTimer = 2.4;
        FX.addShockwave(this.x, this.y - 6, 28, "#b45309", 0.22);
        FX.addBones(this.x, this.y - 6, 5);
        FX.addSmokePuff(this.x, this.y - 10, "#78716c");
        FX.burst(this.x, this.y - 10, "#f59e0b", 14, 140);
      }
    }
    update(dt, world) {
      if (this.dead) {
        this.respawnTimer -= dt;
        if (this.respawnTimer <= 0) {
          this.dead = false;
          this.hp = this.maxHp;
          this.x = this.startX;
          this.y = this.startY;
          this.vx = 0;
          this.vy = 0;
          this.squashTimer = 0;
          this.flash = 0;
          FX.addShockwave(this.x, this.y - 6, 20, "#22c55e", 0.18);
          FX.burst(this.x, this.y - 10, "#22c55e", 12, 100);
        }
        return;
      }
      if (this.flash > 0) this.flash -= dt;
      if (this.squashTimer > 0) this.squashTimer -= dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vx *= Math.exp(-9 * dt);
      this.vy *= Math.exp(-9 * dt);
      world.collide(this);
    }
    draw(ctx) {
      if (this.dead) return;
      Sprites.drawShadow(ctx, this.x, this.y + 2, 11);
      const P = Sprites.PX;
      const cx = Math.round(this.x);
      const cy = Math.round(this.y);
      ctx.save();
      if (this.squashTimer > 0) {
        const progress = this.squashTimer / 0.15;
        const scaleX = 1 + Math.sin(progress * Math.PI) * 0.24;
        const scaleY = 1 - Math.sin(progress * Math.PI) * 0.18;
        ctx.translate(cx, cy);
        ctx.scale(scaleX, scaleY);
        ctx.translate(-cx, -cy);
      }
      ctx.fillStyle = "#451a03";
      ctx.fillRect(cx - 2 * P, cy - 10 * P, 4 * P, 10 * P);
      ctx.fillStyle = this.flash > 0 ? "#ffffff" : "#ca8a04";
      ctx.fillRect(cx - 5 * P, cy - 14 * P, 10 * P, 8 * P);
      if (this.flash <= 0) {
        ctx.fillStyle = "#78350f";
        ctx.fillRect(cx - 5 * P, cy - 12 * P, 10 * P, 2 * P);
        ctx.fillStyle = "#dc2626";
        ctx.fillRect(cx - 2 * P, cy - 11 * P, 4 * P, 4 * P);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(cx - 1 * P, cy - 10 * P, 2 * P, 2 * P);
      }
      ctx.fillStyle = this.flash > 0 ? "#ffffff" : "#64748b";
      ctx.fillRect(cx - 4 * P, cy - 18 * P, 8 * P, 5 * P);
      ctx.fillStyle = "#334155";
      ctx.fillRect(cx - 3 * P, cy - 16 * P, 6 * P, 1.5 * P);
      const barW = 28;
      const barH = 4;
      const barX = Math.round(this.x - barW / 2);
      const barY = Math.round(this.y - 24 * P);
      ctx.fillStyle = "rgba(8, 10, 16, 0.75)";
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
      const hpRatio = this.hp / this.maxHp;
      ctx.fillStyle = hpRatio > 0.5 ? "#22c55e" : hpRatio > 0.25 ? "#eab308" : "#ef4444";
      ctx.fillRect(barX, barY, Math.round(barW * hpRatio), barH);
      ctx.restore();
    }
  };

  // src/entities/pickup.js
  var GemPickup = class {
    constructor(x, y, xpValue = 10, type = "cyan") {
      this.x = x;
      this.y = y;
      this.xpValue = xpValue;
      this.type = type;
      this.r = 6;
      this.dead = false;
      this.timer = Math.random() * Math.PI * 2;
      this.flying = false;
      this.flySpeed = 60;
    }
    update(dt, player) {
      if (this.dead) return;
      this.timer += dt * 3.5;
      const dx = player.x - this.x;
      const dy = player.y - 8 - this.y;
      const dist2 = dx * dx + dy * dy;
      const dist = Math.sqrt(dist2);
      const magnetRange = player.magnetRadius || 85;
      if (dist < magnetRange) {
        this.flying = true;
      }
      if (this.flying) {
        this.flySpeed = Math.min(520, this.flySpeed + dt * 650);
        if (dist > 1) {
          this.x += dx / dist * this.flySpeed * dt;
          this.y += dy / dist * this.flySpeed * dt;
        }
        if (dist < player.r + this.r + 4) {
          this.dead = true;
          const color = this.type === "emerald" ? "#34d399" : "#38bdf8";
          FX.burst(this.x, this.y, color, 5, 70);
          player.gainXp(this.xpValue);
        }
      }
    }
    draw(ctx) {
      if (this.dead) return;
      const bob = Math.sin(this.timer) * 3;
      Sprites.drawShadow(ctx, this.x, this.y + 4, 4);
      const sprite = Sprites.getGemSprite(this.type, 0);
      const sw = sprite.width;
      const sh = sprite.height;
      ctx.drawImage(
        sprite,
        Math.round(this.x - sw / 2),
        Math.round(this.y - sh / 2 + bob)
      );
    }
  };

  // src/core/crafting.js
  var MATERIALS_DEF = {
    slime_gel: {
      id: "slime_gel",
      name: "Gel Silvano",
      icon: "\u{1F9EA}",
      desc: "Materia gelatinosa pura raccolta dagli Slime del Bosco.",
      color: "#22c55e",
      rarity: "Comune"
    },
    ice_crystal: {
      id: "ice_crystal",
      name: "Cristallo Gelido",
      icon: "\u2744\uFE0F",
      desc: "Ghiaccio perenne non fondente che brilla sulle vette innevate.",
      color: "#38bdf8",
      rarity: "Non Comune"
    },
    sun_amber: {
      id: "sun_amber",
      name: "Ambra delle Sabbie",
      icon: "\u2600\uFE0F",
      desc: "Gemma solare fossilizzata tra le dune ardenti del deserto.",
      color: "#f59e0b",
      rarity: "Non Comune"
    },
    magma_core: {
      id: "magma_core",
      name: "Nucleo di Lava",
      icon: "\u{1F525}",
      desc: "Frammento incandescente di roccia e fuoco elementale della caldera.",
      color: "#ef4444",
      rarity: "Raro"
    },
    ancient_bone: {
      id: "ancient_bone",
      name: "Osso Antico",
      icon: "\u{1F9B4}",
      desc: "Resto pietrificato degli scheletri a guardia delle antiche rovine.",
      color: "#cbd5e1",
      rarity: "Comune"
    },
    iron_scrap: {
      id: "iron_scrap",
      name: "Metallo Temprato",
      icon: "\u2699\uFE0F",
      desc: "Lingotti e frammenti di metallo usati per forgiare armi robuste.",
      color: "#94a3b8",
      rarity: "Comune"
    },
    arcane_rune: {
      id: "arcane_rune",
      name: "Runa Arcana",
      icon: "\u2728",
      desc: "Raro artefatto runico carico di antica magia elementale.",
      color: "#c084fc",
      rarity: "Raro"
    }
  };
  var WEAPONS_DEF = {
    staff: {
      id: "staff",
      name: "Bastone dell'Arcimago",
      icon: "\u{1FA84}",
      typeName: "Magia a Distanza (Dardi Autoguidati)",
      desc: "Scaglia dardi arcani luminosi che inseguono i bersagli pi\xF9 vicini con precisione fatata.",
      maxLevel: 5,
      unlockCost: null,
      // Sbloccato di default
      baseStats: {
        damage: 18,
        cooldown: 0.85,
        range: 320,
        projectiles: 1,
        speed: 380
      },
      upgrades: [
        {
          level: 2,
          gold: 80,
          materials: { slime_gel: 4, arcane_rune: 1 },
          benefit: "+6 Danno, +1 Dardo magico",
          stats: { damageBonus: 6, extraProjectiles: 1, cooldownReduction: 0.05 }
        },
        {
          level: 3,
          gold: 160,
          materials: { slime_gel: 6, ice_crystal: 3, arcane_rune: 2 },
          benefit: "+8 Danno, -15% Tempo di Ricarica",
          stats: { damageBonus: 14, extraProjectiles: 1, cooldownReduction: 0.15 }
        },
        {
          level: 4,
          gold: 260,
          materials: { ice_crystal: 5, magma_core: 3, arcane_rune: 3 },
          benefit: "+10 Danno, +1 Dardo aggiuntivo (3 dardi)",
          stats: { damageBonus: 24, extraProjectiles: 2, cooldownReduction: 0.18 }
        },
        {
          level: 5,
          gold: 400,
          materials: { magma_core: 6, arcane_rune: 5 },
          benefit: "+16 Danno, Dardi di Mana Instabile ad alta velocit\xE0",
          stats: { damageBonus: 40, extraProjectiles: 2, cooldownReduction: 0.25 }
        }
      ]
    },
    sword: {
      id: "sword",
      name: "Spada da Cavaliere",
      icon: "\u{1F5E1}\uFE0F",
      typeName: "Mischia ad Area (Fendenti Ravvicinati)",
      desc: "Esegue rapidi fendenti semicircolari ad ampio raggio con elevato danno da taglio e potente spinta indietro (knockback).",
      maxLevel: 5,
      unlockCost: {
        gold: 120,
        materials: { iron_scrap: 4, ancient_bone: 3 }
      },
      baseStats: {
        damage: 28,
        cooldown: 0.55,
        range: 92,
        knockback: 180,
        arcAngle: Math.PI * 0.95
      },
      upgrades: [
        {
          level: 2,
          gold: 100,
          materials: { iron_scrap: 5, ancient_bone: 4 },
          benefit: "+8 Danno da taglio, +16px Ampiezza fendente",
          stats: { damageBonus: 8, rangeBonus: 16, cooldownReduction: 0.04 }
        },
        {
          level: 3,
          gold: 180,
          materials: { iron_scrap: 8, sun_amber: 3, ancient_bone: 5 },
          benefit: "+12 Danno, +35% Spinta Indietro (Knockback)",
          stats: { damageBonus: 20, rangeBonus: 22, knockbackBonus: 70 }
        },
        {
          level: 4,
          gold: 280,
          materials: { iron_scrap: 10, magma_core: 3, arcane_rune: 2 },
          benefit: "+15 Danno, -20% Tempo di Recupero tra i colpi",
          stats: { damageBonus: 35, rangeBonus: 30, cooldownReduction: 0.12 }
        },
        {
          level: 5,
          gold: 420,
          materials: { iron_scrap: 15, magma_core: 5, arcane_rune: 4 },
          benefit: "+22 Danno, Lama di Fiamme Runica a Vortice 360\xB0",
          stats: { damageBonus: 57, rangeBonus: 42, fullCircle: true }
        }
      ]
    },
    bow: {
      id: "bow",
      name: "Arco dei Guardaboschi",
      icon: "\u{1F3F9}",
      typeName: "Frecce Perforanti a Lungo Raggio",
      desc: "Scocca frecce aerodinamiche ad altissima velocit\xE0 che trapassano i nemici in linea retta a grande distanza.",
      maxLevel: 5,
      unlockCost: {
        gold: 120,
        materials: { ancient_bone: 4, sun_amber: 3 }
      },
      baseStats: {
        damage: 22,
        cooldown: 0.7,
        range: 440,
        pierce: 2,
        speed: 520
      },
      upgrades: [
        {
          level: 2,
          gold: 100,
          materials: { ancient_bone: 5, sun_amber: 4 },
          benefit: "+6 Danno, +1 Bersaglio trapassabile (Pierce 3)",
          stats: { damageBonus: 6, extraPierce: 1, cooldownReduction: 0.05 }
        },
        {
          level: 3,
          gold: 180,
          materials: { sun_amber: 6, ice_crystal: 4, iron_scrap: 4 },
          benefit: "+10 Danno, +25% Velocit\xE0 di volo della freccia",
          stats: { damageBonus: 16, extraPierce: 1, speedBonus: 130 }
        },
        {
          level: 4,
          gold: 280,
          materials: { sun_amber: 8, magma_core: 4, arcane_rune: 2 },
          benefit: "+14 Danno, Tiro Doppio (2 frecce parallele)",
          stats: { damageBonus: 30, extraPierce: 2, extraArrows: 1 }
        },
        {
          level: 5,
          gold: 420,
          materials: { sun_amber: 10, arcane_rune: 4, magma_core: 5 },
          benefit: "+20 Danno, Frecce di Cristallo Solare a Perforazione Totale",
          stats: { damageBonus: 50, infinitePierce: true, extraArrows: 1 }
        }
      ]
    }
  };

  // src/entities/item_pickup.js
  var ItemPickup = class {
    constructor(x, y, itemId = "slime_gel") {
      this.x = x;
      this.y = y;
      this.itemId = itemId;
      this.def = MATERIALS_DEF[itemId] || { name: "Artefatto", icon: "\u{1F4E6}", color: "#f8fafc" };
      this.r = 8;
      this.dead = false;
      this.timer = Math.random() * Math.PI * 2;
      this.flying = false;
      this.flySpeed = 70;
    }
    update(dt, player, onCollect) {
      if (this.dead) return;
      this.timer += dt * 4;
      const dx = player.x - this.x;
      const dy = player.y - 8 - this.y;
      const dist2 = dx * dx + dy * dy;
      const dist = Math.sqrt(dist2);
      const magnetRange = (player.magnetRadius || 85) * 1.15;
      if (dist < magnetRange) {
        this.flying = true;
      }
      if (this.flying) {
        this.flySpeed = Math.min(560, this.flySpeed + dt * 700);
        if (dist > 1) {
          this.x += dx / dist * this.flySpeed * dt;
          this.y += dy / dist * this.flySpeed * dt;
        }
        if (dist < player.r + this.r + 4) {
          this.dead = true;
          FX.burst(this.x, this.y, this.def.color, 8, 95);
          FX.addFloatingText(this.x, this.y - 18, `+1 ${this.def.name}`, this.def.color);
          if (onCollect) {
            onCollect(this.itemId);
          }
        }
      }
    }
    draw(ctx) {
      if (this.dead) return;
      const bob = Math.sin(this.timer) * 3.5;
      Sprites.drawShadow(ctx, this.x, this.y + 4, 5);
      ctx.save();
      const drawY = Math.round(this.y + bob - 6);
      ctx.fillStyle = this.def.color + "33";
      ctx.beginPath();
      ctx.arc(Math.round(this.x), drawY, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(this.def.icon, Math.round(this.x), drawY);
      ctx.restore();
    }
  };

  // src/entities/slash_effect.js
  var SlashEffect = class {
    constructor(x, y, angle, radius = 92, arc = Math.PI * 0.95) {
      this.x = x;
      this.y = y;
      this.angle = angle;
      this.radius = radius;
      this.arc = arc;
      this.life = 0.18;
      this.t = 0;
      this.dead = false;
    }
    update(dt) {
      this.t += dt;
      if (this.t >= this.life) {
        this.dead = true;
      }
    }
    draw(ctx) {
      if (this.dead) return;
      const progress = this.t / this.life;
      const alpha = Math.max(0, 1 - Math.pow(progress, 1.4));
      ctx.save();
      ctx.translate(Math.round(this.x), Math.round(this.y));
      const totalArc = this.arc;
      const start = this.angle - totalArc / 2;
      const headArc = Math.min(totalArc, totalArc * Math.min(1, progress * 2.2));
      const tailProgress = Math.max(0, (progress - 0.28) / 0.72);
      const tailOffset = totalArc * tailProgress;
      const drawStart = start + tailOffset;
      const drawEnd = start + headArc;
      if (drawEnd > drawStart) {
        ctx.strokeStyle = `rgba(56, 189, 248, ${alpha * 0.45})`;
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius - 2, drawStart, drawEnd);
        ctx.stroke();
        ctx.strokeStyle = `rgba(226, 232, 240, ${alpha * 0.95})`;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, drawStart, drawEnd);
        ctx.stroke();
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, drawStart + 0.04, drawEnd);
        ctx.stroke();
        const tipX = Math.cos(drawEnd) * this.radius;
        const tipY = Math.sin(drawEnd) * this.radius;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(tipX, tipY, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  };

  // src/systems/combat.js
  var CombatSystem = class {
    constructor() {
      this.projectiles = [];
      this.slashes = [];
      this.trainingTargets = [];
      this.enemies = [];
      this.pickups = [];
      this.itemPickups = [];
      this.collectedItems = {};
      this.weaponId = "staff";
      this.weaponLevel = 1;
      this.weaponName = "Bastone dell'Arcimago";
      this.baseCooldown = 0.85;
      this.cooldownTimer = 0;
      this.attackRange = 320;
      this.currentTarget = null;
      this.projectilesPerShot = 1;
      this.damageMultiplier = 1;
      this.hasOrbitOrb = false;
      this.orbitOrbsCount = 0;
      this.orbitAngle = 0;
      this.orbitDamageTimer = 0;
      this.kills = 0;
      this.goldEarned = 0;
      this.setupDemoTargets();
      this.setWeapon("staff", 1);
    }
    setupDemoTargets() {
      this.trainingTargets = [
        new TrainingTarget(120, -50, "Manichino Est", 60),
        new TrainingTarget(-130, 40, "Manichino Ovest", 60)
      ];
    }
    /**
     * Configura l'arma equipaggiata e le sue statistiche forgiate
     */
    setWeapon(weaponId = "staff", level = 1, bonusDamage = 0) {
      const def = WEAPONS_DEF[weaponId] || WEAPONS_DEF.staff;
      this.weaponId = def.id;
      this.weaponLevel = Math.max(1, Math.min(def.maxLevel, level));
      this.weaponName = def.name;
      let totalDmgBonus = 0;
      let cdReduction = 0;
      let extraProj = 0;
      let extraPierce = 0;
      let rangeBonus = 0;
      let knockbackBonus = 0;
      let fullCircle = false;
      let extraArrows = 0;
      if (def.upgrades) {
        for (let lvl = 2; lvl <= this.weaponLevel; lvl++) {
          const u = def.upgrades.find((up) => up.level === lvl);
          if (u && u.stats) {
            if (u.stats.damageBonus) totalDmgBonus += u.stats.damageBonus;
            if (u.stats.cooldownReduction) cdReduction += u.stats.cooldownReduction;
            if (u.stats.extraProjectiles) extraProj += u.stats.extraProjectiles;
            if (u.stats.extraPierce) extraPierce += u.stats.extraPierce;
            if (u.stats.rangeBonus) rangeBonus += u.stats.rangeBonus;
            if (u.stats.knockbackBonus) knockbackBonus += u.stats.knockbackBonus;
            if (u.stats.fullCircle) fullCircle = true;
            if (u.stats.extraArrows) extraArrows += u.stats.extraArrows;
          }
        }
      }
      if (this.weaponId === "sword") {
        this.baseCooldown = Math.max(0.28, def.baseStats.cooldown - cdReduction);
        this.attackRange = def.baseStats.range + rangeBonus;
        this.swordDamage = def.baseStats.damage + totalDmgBonus + bonusDamage;
        this.swordRange = this.attackRange;
        this.swordArc = fullCircle ? Math.PI * 2 : def.baseStats.arcAngle;
        this.swordKnockback = def.baseStats.knockback + knockbackBonus;
      } else if (this.weaponId === "bow") {
        this.baseCooldown = Math.max(0.35, def.baseStats.cooldown - cdReduction);
        this.attackRange = def.baseStats.range;
        this.bowDamage = def.baseStats.damage + totalDmgBonus + bonusDamage;
        this.bowPierce = def.baseStats.pierce + extraPierce;
        this.bowArrowsCount = 1 + extraArrows;
        this.bowSpeed = def.baseStats.speed;
      } else {
        this.baseCooldown = Math.max(0.4, def.baseStats.cooldown - cdReduction);
        this.attackRange = def.baseStats.range;
        this.staffDamage = def.baseStats.damage + totalDmgBonus + bonusDamage;
        this.projectilesPerShot = def.baseStats.projectiles + extraProj;
      }
      this.cooldownTimer = 0;
    }
    getAllTargets() {
      return [...this.trainingTargets, ...this.enemies];
    }
    findNearestTarget(player) {
      let nearest = null;
      let minDist2 = this.attackRange * this.attackRange;
      for (const target of this.getAllTargets()) {
        if (target.dead || target.isDying) continue;
        const dx = target.x - player.x;
        const dy = target.y - player.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < minDist2) {
          minDist2 = d2;
          nearest = target;
        }
      }
      return nearest;
    }
    /**
     * Genera la lista di oggetti e artefatti rilasciati da un nemico sconfitto
     */
    rollMonsterDrops(kind) {
      const drops = [];
      const r = Math.random();
      if (kind === "slime_forest") {
        if (r < 0.75) drops.push("slime_gel");
        if (Math.random() < 0.22) drops.push("iron_scrap");
      } else if (kind === "slime_ice") {
        if (r < 0.7) drops.push("ice_crystal");
        if (Math.random() < 0.2) drops.push("arcane_rune");
      } else if (kind === "slime_sand") {
        if (r < 0.7) drops.push("sun_amber");
        if (Math.random() < 0.25) drops.push("iron_scrap");
      } else if (kind === "slime_magma") {
        if (r < 0.65) drops.push("magma_core");
        if (Math.random() < 0.22) drops.push("arcane_rune");
      } else if (kind === "slime_water") {
        if (r < 0.7) drops.push("slime_gel");
        if (Math.random() < 0.2) drops.push("ice_crystal");
      } else {
        if (r < 0.75) drops.push("ancient_bone");
        if (Math.random() < 0.4) drops.push("iron_scrap");
      }
      return drops;
    }
    update(dt, player, world, camera) {
      this.currentTarget = this.findNearestTarget(player);
      if (this.cooldownTimer > 0) {
        this.cooldownTimer -= dt;
      }
      if (this.cooldownTimer <= 0) {
        if (this.weaponId === "sword") {
          if (this.currentTarget) {
            this.performSwordCleave(player, this.currentTarget, camera);
            this.cooldownTimer = this.baseCooldown;
          }
        } else if (this.weaponId === "bow") {
          if (this.currentTarget) {
            this.fireBowArrows(player, this.currentTarget);
            this.cooldownTimer = this.baseCooldown;
          }
        } else {
          if (this.currentTarget) {
            this.fireArcaneDarts(player, this.currentTarget);
            this.cooldownTimer = this.baseCooldown;
          }
        }
      }
      for (let i = this.slashes.length - 1; i >= 0; i--) {
        const s = this.slashes[i];
        s.update(dt);
        if (s.dead) this.slashes.splice(i, 1);
      }
      for (const t of this.trainingTargets) {
        t.update(dt, world);
      }
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        e.update(dt, player, world);
        if (!e.dead && !e.isDying && player.hp > 0) {
          const cdx = e.x - player.x;
          const cdy = e.y - player.y;
          const cdist2 = cdx * cdx + cdy * cdy;
          const touchR = e.r + player.r;
          if (cdist2 < touchR * touchR) {
            player.takeDamage(e.contactDamage || 8);
            camera.kick(0.24);
            FX.burst(player.x, player.y - 8, "#ef4444", 5, 80);
          }
        }
        if (e.isDying && !e.hasDroppedLoot) {
          e.hasDroppedLoot = true;
          this.kills++;
          this.goldEarned += e.goldValue || 4;
          this.pickups.push(new GemPickup(e.x, e.y, e.xpValue, e.gemType));
          const drops = this.rollMonsterDrops(e.kind);
          for (const itemId of drops) {
            const ox = Math.random() * 22 - 11;
            const oy = Math.random() * 22 - 11;
            this.itemPickups.push(new ItemPickup(e.x + ox, e.y + oy, itemId));
          }
        }
        if (e.dead) {
          this.enemies.splice(i, 1);
        }
      }
      for (let i = this.pickups.length - 1; i >= 0; i--) {
        const g = this.pickups[i];
        g.update(dt, player);
        if (g.dead) {
          this.pickups.splice(i, 1);
        }
      }
      for (let i = this.itemPickups.length - 1; i >= 0; i--) {
        const item = this.itemPickups[i];
        item.update(dt, player, (itemId) => {
          this.collectedItems[itemId] = (this.collectedItems[itemId] || 0) + 1;
        });
        if (item.dead) {
          this.itemPickups.splice(i, 1);
        }
      }
      if (this.hasOrbitOrb) {
        this.orbitAngle += dt * 3.8;
        if (this.orbitDamageTimer > 0) {
          this.orbitDamageTimer -= dt;
        }
        const orbRadius = 42;
        const orbX = player.x + Math.cos(this.orbitAngle) * orbRadius;
        const orbY = player.y - 8 + Math.sin(this.orbitAngle) * orbRadius;
        if (Math.random() < 0.4) {
          FX.burst(orbX, orbY, "#f97316", 1, 30);
        }
        if (this.orbitDamageTimer <= 0) {
          for (const target of this.getAllTargets()) {
            if (target.dead) continue;
            const odx = target.x - orbX;
            const ody = target.y - orbY;
            if (odx * odx + ody * ody < (target.r + 14) * (target.r + 14)) {
              const angle = Math.atan2(ody, odx);
              const dmg = Math.round(14 * this.damageMultiplier);
              target.takeDamage(dmg, angle, 90, "magic");
              this.orbitDamageTimer = 0.28;
              camera.kick(0.12);
              break;
            }
          }
        }
      }
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const p = this.projectiles[i];
        p.update(dt, world);
        if (p.dead) {
          this.projectiles.splice(i, 1);
          continue;
        }
        for (const t of this.getAllTargets()) {
          if (t.dead || p.hitTargets.has(t)) continue;
          const dx = t.x - p.x;
          const dy = t.y - p.y;
          const dist2 = dx * dx + dy * dy;
          const hitRadius = p.r + t.r;
          if (dist2 < hitRadius * hitRadius) {
            p.hitTargets.add(t);
            const angle = Math.atan2(p.vy, p.vx);
            const attackType = p.type === "arrow" ? "pierce" : "magic";
            t.takeDamage(p.dmg, angle, p.type === "arrow" ? 140 : 115, attackType);
            camera.kick(0.15);
            p.pierce--;
            if (p.pierce <= 0) {
              p.dead = true;
              this.projectiles.splice(i, 1);
              break;
            }
          }
        }
      }
      FX.update(dt);
    }
    /**
     * Attacco Spada: fendente ravvicinato ad area che colpisce tutti i nemici nell'arco
     */
    performSwordCleave(player, target, camera) {
      let angle = player.moveAngle || Math.PI / 2;
      if (target) {
        angle = Math.atan2(target.y - player.y, target.x - player.x);
      }
      const range = this.swordRange || 92;
      const arc = this.swordArc || Math.PI * 0.95;
      const dmg = Math.round(this.swordDamage * this.damageMultiplier);
      const knockback = this.swordKnockback || 180;
      this.slashes.push(new SlashEffect(player.x, player.y - 6, angle, range, arc));
      camera.kick(0.18);
      for (const t of this.getAllTargets()) {
        if (t.dead) continue;
        const dx = t.x - player.x;
        const dy = t.y - (player.y - 6);
        const dist = Math.hypot(dx, dy);
        if (dist <= range + t.r) {
          const enemyAngle = Math.atan2(dy, dx);
          let diff = Math.abs(enemyAngle - angle);
          while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);
          if (arc >= Math.PI * 1.9 || diff <= arc / 2 + 0.18) {
            t.takeDamage(dmg, enemyAngle, knockback, "slash");
            FX.burst(t.x, t.y - 8, "#f8fafc", 4, 110);
          }
        }
      }
    }
    /**
     * Attacco Arco: frecce rapide e perforanti a lunga gittata
     */
    fireBowArrows(player, target) {
      const dx = target.x - player.x;
      const dy = target.y - (player.y - 12);
      const baseAngle = Math.atan2(dy, dx);
      const dmg = Math.round(this.bowDamage * this.damageMultiplier);
      const count = this.bowArrowsCount || 1;
      const spreadAngle = 0.14;
      const startAngle = baseAngle - (count - 1) * spreadAngle / 2;
      for (let i = 0; i < count; i++) {
        const angle = startAngle + i * spreadAngle;
        const spawnX = player.x + Math.cos(angle) * 10;
        const spawnY = player.y - 12 + Math.sin(angle) * 10;
        this.projectiles.push(
          new Projectile(spawnX, spawnY, angle, {
            type: "arrow",
            dmg,
            speed: this.bowSpeed || 520,
            pierce: this.bowPierce || 2
          })
        );
      }
      FX.spark(player.x, player.y - 12, "#fef08a", 4);
    }
    /**
     * Attacco Bastone: dardi arcani a ventaglio
     */
    fireArcaneDarts(player, target) {
      const dx = target.x - player.x;
      const dy = target.y - (player.y - 12);
      const baseAngle = Math.atan2(dy, dx);
      const baseDmg = (this.staffDamage || 18) + (player.permanentBonusDamage || 0);
      const dmg = Math.round(baseDmg * this.damageMultiplier);
      const count = this.projectilesPerShot;
      const spreadAngle = 0.22;
      const startAngle = baseAngle - (count - 1) * spreadAngle / 2;
      for (let i = 0; i < count; i++) {
        const angle = startAngle + i * spreadAngle;
        const spawnX = player.x + Math.cos(angle) * 12;
        const spawnY = player.y - 12 + Math.sin(angle) * 12;
        this.projectiles.push(
          new Projectile(spawnX, spawnY, angle, {
            type: "dart",
            speed: 370,
            dmg,
            r: 5
          })
        );
        FX.burst(spawnX, spawnY, "#38bdf8", 3, 60);
      }
    }
    get cooldownProgress() {
      return Math.min(1, Math.max(0, 1 - this.cooldownTimer / this.baseCooldown));
    }
    drawProjectiles(ctx) {
      for (const p of this.projectiles) {
        p.draw(ctx);
      }
      for (const s of this.slashes) {
        s.draw(ctx);
      }
    }
    drawOrbitOrbs(ctx, player) {
      if (!this.hasOrbitOrb) return;
      const orbRadius = 42;
      const orbX = player.x + Math.cos(this.orbitAngle) * orbRadius;
      const orbY = player.y - 8 + Math.sin(this.orbitAngle) * orbRadius;
      ctx.save();
      const grad = ctx.createRadialGradient(orbX, orbY, 2, orbX, orbY, 14);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.4, "#fbbf24");
      grad.addColorStop(0.8, "#f97316");
      grad.addColorStop(1, "rgba(239, 68, 68, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(Math.round(orbX), Math.round(orbY), 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    drawPickups(ctx) {
      for (const p of this.pickups) {
        p.draw(ctx);
      }
      for (const it of this.itemPickups) {
        it.draw(ctx);
      }
    }
    drawFX(ctx) {
      FX.draw(ctx);
    }
  };

  // src/systems/progression.js
  var ProgressionSystem = class {
    constructor(player, combat) {
      this.player = player;
      this.combat = combat;
      this.level = 1;
      this.currentXp = 0;
      this.nextLevelXp = 25;
      this.isPausedForLevelUp = false;
      this.currentChoices = [];
      this.UPGRADE_CATALOG = [
        {
          id: "multi_dart",
          title: "Tiro Arcano Multiplo",
          desc: "Lancia +1 Dardo Arcano simultaneo a ventaglio",
          icon: "\u{1F3F9}",
          apply: (p, c) => {
            c.projectilesPerShot = (c.projectilesPerShot || 1) + 1;
          }
        },
        {
          id: "spell_power",
          title: "Potenza Celestiale",
          desc: "+30% di danno inflitto da ogni incantesimo",
          icon: "\u26A1",
          apply: (p, c) => {
            c.damageMultiplier = (c.damageMultiplier || 1) * 1.3;
          }
        },
        {
          id: "haste",
          title: "Cadenza Rapida",
          desc: "-22% al tempo di ricarica del bastone magico",
          icon: "\u{1F32A}\uFE0F",
          apply: (p, c) => {
            c.baseCooldown = Math.max(0.25, c.baseCooldown * 0.78);
          }
        },
        {
          id: "magnet",
          title: "Magnete Astrale",
          desc: "+60% raggio di attrazione per le gemme di mana",
          icon: "\u{1F9F2}",
          apply: (p, c) => {
            p.magnetRadius = (p.magnetRadius || 85) * 1.6;
          }
        },
        {
          id: "wind_step",
          title: "Passo del Vento",
          desc: "+18% alla velocit\xE0 di movimento del mago",
          icon: "\u{1F45F}",
          apply: (p, c) => {
            p.baseSpd = Math.round(p.baseSpd * 1.18);
          }
        },
        {
          id: "fire_orb",
          title: "Sfera di Fuoco Protettiva",
          desc: "Evoca un globo magico rotante che brucia i nemici vicini",
          icon: "\u{1F525}",
          apply: (p, c) => {
            c.hasOrbitOrb = true;
            c.orbitOrbsCount = (c.orbitOrbsCount || 0) + 1;
          }
        }
      ];
      this.player.gainXp = (amount) => this.addXp(amount);
    }
    addXp(amount) {
      this.currentXp += amount;
      if (this.currentXp >= this.nextLevelXp && !this.isPausedForLevelUp) {
        this.levelUp();
      }
    }
    levelUp() {
      this.currentXp -= this.nextLevelXp;
      this.level++;
      this.nextLevelXp = Math.floor(25 * Math.pow(1.32, this.level - 1));
      const shuffled = [...this.UPGRADE_CATALOG].sort(() => 0.5 - Math.random());
      this.currentChoices = shuffled.slice(0, 3);
      this.isPausedForLevelUp = true;
      if (this.onLevelUpCallback) {
        this.onLevelUpCallback(this.level, this.currentChoices);
      }
    }
    chooseUpgrade(index) {
      if (!this.isPausedForLevelUp || !this.currentChoices[index]) return;
      const chosen = this.currentChoices[index];
      chosen.apply(this.player, this.combat);
      this.isPausedForLevelUp = false;
      this.currentChoices = [];
      if (this.onUpgradeChosenCallback) {
        this.onUpgradeChosenCallback(chosen);
      }
      if (this.currentXp >= this.nextLevelXp) {
        this.levelUp();
      }
    }
    get progressRatio() {
      return Math.min(1, Math.max(0, this.currentXp / this.nextLevelXp));
    }
  };

  // src/core/talents.js
  var TALENTS_DEF = {
    max_hp: {
      id: "max_hp",
      name: "Vitalit\xE0 Arcana",
      desc: "+15 HP massimi alla salute del Mago",
      icon: "\u2764\uFE0F",
      maxRank: 5,
      baseCost: 50,
      costMult: 1.5,
      bonusPerRank: 15
    },
    damage: {
      id: "damage",
      name: "Potenza Celestiale",
      desc: "+3 al danno base di tutti gli incantesimi",
      icon: "\u26A1",
      maxRank: 5,
      baseCost: 75,
      costMult: 1.6,
      bonusPerRank: 3
    },
    speed: {
      id: "speed",
      name: "Passo del Vento",
      desc: "+6% alla velocit\xE0 di camminata permanente",
      icon: "\u{1F45F}",
      maxRank: 5,
      baseCost: 60,
      costMult: 1.5,
      bonusPerRank: 0.06
    },
    magnet: {
      id: "magnet",
      name: "Magnete Astrale",
      desc: "+20% raggio di attrazione permanente per le gemme",
      icon: "\u{1F9F2}",
      maxRank: 5,
      baseCost: 40,
      costMult: 1.4,
      bonusPerRank: 0.2
    },
    gold_gain: {
      id: "gold_gain",
      name: "Alchimia Runica",
      desc: "+15% all'oro guadagnato da ogni spedizione",
      icon: "\u{1FA99}",
      maxRank: 5,
      baseCost: 80,
      costMult: 1.7,
      bonusPerRank: 0.15
    }
  };

  // src/core/api.js
  var API_BASE = window.location.protocol.startsWith("http") ? "" : "http://localhost:3000";
  var GameAPI = class {
    constructor() {
      this.nickname = localStorage.getItem("aether_nickname") || "Mago-" + Math.floor(1e3 + Math.random() * 9e3);
      this.isOnline = false;
      this.checkHealth();
    }
    async checkHealth() {
      try {
        const res = await fetch(`${API_BASE}/api/health`, { method: "GET" });
        if (res.ok) {
          this.isOnline = true;
        }
      } catch {
        this.isOnline = false;
      }
    }
    // --- LOGICA OFFLINE LOCALSTORAGE ---
    _getLocalProfile(nickname) {
      const key = `aether_profile_${nickname.toLowerCase()}`;
      const raw = localStorage.getItem(key);
      let p = null;
      if (raw) {
        try {
          p = JSON.parse(raw);
        } catch {
        }
      }
      if (!p) {
        p = {
          nickname,
          gold: 150,
          totalRuns: 0,
          totalKills: 0,
          highestLevel: 1,
          bestSurvivalSeconds: 0,
          talents: {
            max_hp: 0,
            damage: 0,
            speed: 0,
            magnet: 0,
            gold_gain: 0
          },
          inventory: {
            slime_gel: 4,
            ice_crystal: 0,
            sun_amber: 0,
            magma_core: 0,
            ancient_bone: 3,
            iron_scrap: 4,
            arcane_rune: 1
          },
          weapons: {
            staff: 1,
            sword: 0,
            bow: 0
          },
          equippedWeapon: "staff"
        };
        localStorage.setItem(key, JSON.stringify(p));
      }
      if (!p.inventory) {
        p.inventory = {
          slime_gel: 4,
          ice_crystal: 0,
          sun_amber: 0,
          magma_core: 0,
          ancient_bone: 3,
          iron_scrap: 4,
          arcane_rune: 1
        };
      }
      if (!p.weapons) {
        p.weapons = { staff: 1, sword: 0, bow: 0 };
      }
      if (!p.equippedWeapon) {
        p.equippedWeapon = "staff";
      }
      return p;
    }
    _saveLocalProfile(profile) {
      const key = `aether_profile_${profile.nickname.toLowerCase()}`;
      localStorage.setItem(key, JSON.stringify(profile));
    }
    _formatProfile(profile) {
      const talents = profile.talents || {};
      const calculatedStats = {
        bonusHp: (talents.max_hp || 0) * 15,
        bonusDamage: (talents.damage || 0) * 3,
        speedMultiplier: 1 + (talents.speed || 0) * 0.06,
        magnetMultiplier: 1 + (talents.magnet || 0) * 0.2,
        goldMultiplier: 1 + (talents.gold_gain || 0) * 0.15
      };
      const talentsCatalog = Object.values(TALENTS_DEF).map((def) => {
        const rank = talents[def.id] || 0;
        const nextCost = rank >= def.maxRank ? null : Math.floor(def.baseCost * Math.pow(def.costMult, rank));
        return {
          ...def,
          currentRank: rank,
          nextCost
        };
      });
      const weaponsCatalog = Object.values(WEAPONS_DEF).map((def) => {
        const currentLevel = profile.weapons[def.id] || 0;
        let nextCost = null;
        let nextBenefit = null;
        if (currentLevel === 0) {
          nextCost = def.unlockCost;
          nextBenefit = "Forgia e sblocca quest'arma per le spedizioni";
        } else if (currentLevel < def.maxLevel) {
          const up = def.upgrades.find((u) => u.level === currentLevel + 1);
          if (up) {
            nextCost = { gold: up.gold, materials: up.materials };
            nextBenefit = up.benefit;
          }
        }
        return {
          ...def,
          currentLevel,
          isUnlocked: currentLevel >= 1,
          isEquipped: profile.equippedWeapon === def.id,
          isMaxLevel: currentLevel >= def.maxLevel,
          nextCost,
          nextBenefit
        };
      });
      const inventoryCatalog = Object.values(MATERIALS_DEF).map((mat) => ({
        ...mat,
        count: profile.inventory[mat.id] || 0
      }));
      return {
        ...profile,
        calculatedStats,
        talentsCatalog,
        weaponsCatalog,
        inventoryCatalog
      };
    }
    // --- METODI PUBBLICI ---
    async getProfile(nickname) {
      this.nickname = nickname;
      localStorage.setItem("aether_nickname", nickname);
      try {
        const res = await fetch(`${API_BASE}/api/profile/${encodeURIComponent(nickname)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            this.isOnline = true;
            return json.profile;
          }
        }
      } catch {
      }
      this.isOnline = false;
      const p = this._getLocalProfile(nickname);
      return this._formatProfile(p);
    }
    async upgradeTalent(talentId) {
      if (this.isOnline) {
        try {
          const res = await fetch(`${API_BASE}/api/talents/upgrade`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nickname: this.nickname, talentId })
          });
          if (res.ok) {
            const json = await res.json();
            if (json.success) return json.profile;
          }
        } catch {
        }
      }
      const p = this._getLocalProfile(this.nickname);
      const def = TALENTS_DEF[talentId];
      const rank = p.talents[talentId] || 0;
      const cost = Math.floor(def.baseCost * Math.pow(def.costMult, rank));
      if (p.gold < cost) throw new Error("Oro insufficiente");
      if (rank >= def.maxRank) throw new Error("Rango massimo gi\xE0 raggiunto");
      p.gold -= cost;
      p.talents[talentId] = rank + 1;
      this._saveLocalProfile(p);
      return this._formatProfile(p);
    }
    async craftOrUpgradeWeapon(weaponId) {
      if (this.isOnline) {
        try {
          const res = await fetch(`${API_BASE}/api/blacksmith/craft`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nickname: this.nickname, weaponId })
          });
          if (res.ok) {
            const json = await res.json();
            if (json.success) return json.profile;
          }
        } catch (err) {
          console.warn("Errore server forgiatura, fallback offline:", err);
        }
      }
      const p = this._getLocalProfile(this.nickname);
      const def = WEAPONS_DEF[weaponId];
      if (!def) throw new Error("Arma non valida");
      const currentLevel = p.weapons[weaponId] || 0;
      if (currentLevel >= def.maxLevel) throw new Error("Livello massimo gi\xE0 raggiunto!");
      let goldCost = 0;
      let materialsCost = {};
      if (currentLevel === 0) {
        goldCost = def.unlockCost ? def.unlockCost.gold || 0 : 0;
        materialsCost = def.unlockCost ? def.unlockCost.materials || {} : {};
      } else {
        const up = def.upgrades.find((u) => u.level === currentLevel + 1);
        goldCost = up.gold || 0;
        materialsCost = up.materials || {};
      }
      if (p.gold < goldCost) throw new Error(`Oro insufficiente: servono ${goldCost} oro`);
      for (const [matId, req] of Object.entries(materialsCost)) {
        if ((p.inventory[matId] || 0) < req) {
          const matDef = MATERIALS_DEF[matId] || { name: matId };
          throw new Error(`Materiale insufficiente: servono ${req}x ${matDef.name}`);
        }
      }
      p.gold -= goldCost;
      for (const [matId, req] of Object.entries(materialsCost)) {
        p.inventory[matId] = Math.max(0, (p.inventory[matId] || 0) - req);
      }
      p.weapons[weaponId] = currentLevel + 1;
      this._saveLocalProfile(p);
      return this._formatProfile(p);
    }
    async equipWeapon(weaponId) {
      if (this.isOnline) {
        try {
          const res = await fetch(`${API_BASE}/api/weapons/equip`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nickname: this.nickname, weaponId })
          });
          if (res.ok) {
            const json = await res.json();
            if (json.success) return json.profile;
          }
        } catch {
        }
      }
      const p = this._getLocalProfile(this.nickname);
      if ((p.weapons[weaponId] || 0) < 1) {
        throw new Error("Devi prima forgiare quest'arma dal Fabbro!");
      }
      p.equippedWeapon = weaponId;
      this._saveLocalProfile(p);
      return this._formatProfile(p);
    }
    async submitRun(runStats) {
      if (this.isOnline) {
        try {
          const res = await fetch(`${API_BASE}/api/runs/complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nickname: this.nickname,
              ...runStats
            })
          });
          if (res.ok) {
            const json = await res.json();
            if (json.success) return json.result;
          }
        } catch {
        }
      }
      const p = this._getLocalProfile(this.nickname);
      const goldMultiplier = 1 + (p.talents.gold_gain || 0) * 0.15;
      const finalGold = Math.round((runStats.goldEarned || 0) * goldMultiplier);
      p.gold += finalGold;
      p.totalRuns += 1;
      p.totalKills += runStats.kills || 0;
      p.highestLevel = Math.max(p.highestLevel, runStats.level || 1);
      p.bestSurvivalSeconds = Math.max(p.bestSurvivalSeconds, runStats.survivalSeconds || 0);
      if (runStats.collectedItems) {
        for (const [matId, count] of Object.entries(runStats.collectedItems)) {
          p.inventory[matId] = (p.inventory[matId] || 0) + count;
        }
      }
      this._saveLocalProfile(p);
      return {
        profile: this._formatProfile(p),
        finalGold,
        score: (runStats.kills || 0) * 50 + (runStats.level || 1) * 200 + Math.floor((runStats.survivalSeconds || 0) * 10)
      };
    }
    async getLeaderboard() {
      if (this.isOnline) {
        try {
          const res = await fetch(`${API_BASE}/api/leaderboard`);
          if (res.ok) {
            const json = await res.json();
            if (json.success) return json.leaderboard;
          }
        } catch {
        }
      }
      const p = this._getLocalProfile(this.nickname);
      return [
        {
          nickname: p.nickname,
          score: p.totalKills * 50 + p.highestLevel * 200 + Math.floor(p.bestSurvivalSeconds * 10),
          level: p.highestLevel,
          kills: p.totalKills,
          survivalSeconds: p.bestSurvivalSeconds,
          date: (/* @__PURE__ */ new Date()).toISOString()
        }
      ];
    }
  };
  var API = new GameAPI();

  // src/main.js
  window.addEventListener("DOMContentLoaded", async () => {
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    const menuScreen = document.getElementById("main-menu");
    const gameHud = document.getElementById("game-hud");
    const modalLevelUp = document.getElementById("levelup-modal");
    const modalGameOver = document.getElementById("gameover-modal");
    const inputNick = document.getElementById("player-nickname");
    const btnSaveNick = document.getElementById("btn-save-nick");
    const elMenuGold = document.getElementById("menu-gold");
    const elStatRuns = document.getElementById("stat-runs");
    const elStatKills = document.getElementById("stat-kills");
    const elStatHighLvl = document.getElementById("stat-high-lvl");
    const elStatBestTime = document.getElementById("stat-best-time");
    const elServerStatus = document.getElementById("server-status");
    const tabBtnTalents = document.getElementById("tab-btn-talents");
    const tabBtnBlacksmith = document.getElementById("tab-btn-blacksmith");
    const tabBtnInventory = document.getElementById("tab-btn-inventory");
    const tabBtnLeaderboard = document.getElementById("tab-btn-leaderboard");
    const tabTalents = document.getElementById("tab-talents");
    const tabBlacksmith = document.getElementById("tab-blacksmith");
    const tabInventory = document.getElementById("tab-inventory");
    const tabLeaderboard = document.getElementById("tab-leaderboard");
    const talentsContainer = document.getElementById("talents-container");
    const weaponsContainer = document.getElementById("weapons-container");
    const inventoryContainer = document.getElementById("inventory-container");
    const leaderboardRows = document.getElementById("leaderboard-rows");
    const btnStartRun = document.getElementById("btn-start-run");
    const elFps = document.getElementById("hud-fps");
    const elTimer = document.getElementById("hud-timer");
    const elEnemies = document.getElementById("hud-enemies");
    const elLevel = document.getElementById("hud-level");
    const elXpFill = document.getElementById("xp-fill");
    const elXpText = document.getElementById("xp-text");
    const elHpFill = document.getElementById("hp-fill");
    const elHpText = document.getElementById("hp-text");
    const elRunGold = document.getElementById("hud-run-gold");
    const elRunItems = document.getElementById("hud-run-items");
    const elWeaponIcon = document.getElementById("hud-weapon-icon");
    const elWeaponName = document.getElementById("hud-weapon-name");
    const elDamage = document.getElementById("hud-damage");
    const elTarget = document.getElementById("hud-target");
    const elCdFill = document.getElementById("hud-cd-fill");
    const cardsContainer = document.getElementById("upgrade-cards");
    const btnOpenBag = document.getElementById("btn-open-bag");
    const ingameModal = document.getElementById("ingame-inventory-modal");
    const btnCloseBag = document.getElementById("btn-close-bag");
    const btnResumeGame = document.getElementById("btn-resume-game");
    const ingameTabBtnLoot = document.getElementById("ingame-tab-btn-loot");
    const ingameTabBtnWeapons = document.getElementById("ingame-tab-btn-weapons");
    const ingameTabBtnForge = document.getElementById("ingame-tab-btn-forge");
    const ingameTabLoot = document.getElementById("ingame-tab-loot");
    const ingameTabWeapons = document.getElementById("ingame-tab-weapons");
    const ingameTabForge = document.getElementById("ingame-tab-forge");
    const ingameLootContainer = document.getElementById("ingame-loot-container");
    const ingameWeaponsContainer = document.getElementById("ingame-weapons-container");
    const ingameForgeContainer = document.getElementById("ingame-forge-container");
    const weaponNotification = document.getElementById("weapon-notification");
    const elSumTime = document.getElementById("sum-time");
    const elSumLevel = document.getElementById("sum-level");
    const elSumKills = document.getElementById("sum-kills");
    const elSumGold = document.getElementById("sum-gold");
    const elSumItems = document.getElementById("sum-items");
    const elSumScore = document.getElementById("sum-score");
    const btnReturnSanctuary = document.getElementById("btn-return-sanctuary");
    let gameState = "MENU";
    let currentProfile = null;
    let runSurvivalSeconds = 0;
    let isInventoryOpen = false;
    let notificationTimeout = null;
    const camera = new Camera(768, 420);
    const world = new World(2026);
    const player = new Player(0, 0);
    const combat = new CombatSystem();
    const progression = new ProgressionSystem(player, combat);
    camera.snapTo(player.x, player.y);
    function formatTime(totalSeconds) {
      const mins = Math.floor(totalSeconds / 60);
      const secs = Math.floor(totalSeconds % 60);
      return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    async function refreshProfile(nickname = inputNick.value) {
      currentProfile = await API.getProfile(nickname || "Mago-" + Math.floor(1e3 + Math.random() * 9e3));
      inputNick.value = currentProfile.nickname;
      elMenuGold.textContent = `${currentProfile.gold}`;
      elStatRuns.textContent = `${currentProfile.totalRuns || 0}`;
      elStatKills.textContent = `${currentProfile.totalKills || 0}`;
      elStatHighLvl.textContent = `${currentProfile.highestLevel || 1}`;
      elStatBestTime.textContent = formatTime(currentProfile.bestSurvivalSeconds || 0);
      if (API.isOnline) {
        elServerStatus.textContent = "Online (Server Sincronizzato)";
        elServerStatus.className = "status-online";
      } else {
        elServerStatus.textContent = "Offline (Salvataggio Locale)";
        elServerStatus.className = "status-offline";
      }
      renderTalentsGrid();
      renderWeaponsGrid();
      renderInventoryGrid();
    }
    function renderTalentsGrid() {
      if (!currentProfile || !talentsContainer) return;
      talentsContainer.innerHTML = "";
      currentProfile.talentsCatalog.forEach((talent) => {
        const card = document.createElement("div");
        card.className = "talent-card";
        let pipsHtml = "";
        for (let i = 0; i < talent.maxRank; i++) {
          pipsHtml += `<div class="pip ${i < talent.currentRank ? "filled" : ""}"></div>`;
        }
        const isMaxed = talent.currentRank >= talent.maxRank;
        const canAfford = !isMaxed && currentProfile.gold >= talent.nextCost;
        card.innerHTML = `
        <div>
          <div class="talent-head">
            <span class="talent-icon">${talent.icon}</span>
            <div class="talent-title">${talent.name}</div>
          </div>
          <div class="talent-desc">${talent.desc}</div>
        </div>
        <div>
          <div class="talent-rank-row">
            <span>Rango ${talent.currentRank}/${talent.maxRank}</span>
            <div class="rank-pips">${pipsHtml}</div>
          </div>
          <button class="btn-upgrade" ${!canAfford ? "disabled" : ""} style="width: 100%; margin-top: 8px;">
            ${isMaxed ? "Rango Massimo" : `Potenzia (${talent.nextCost} \u{1FA99})`}
          </button>
        </div>
      `;
        const btnUpgrade = card.querySelector(".btn-upgrade");
        if (canAfford) {
          btnUpgrade.addEventListener("click", async () => {
            try {
              currentProfile = await API.upgradeTalent(talent.id);
              refreshProfile(currentProfile.nickname);
            } catch (err) {
              alert(err.message);
            }
          });
        }
        talentsContainer.appendChild(card);
      });
    }
    function renderWeaponsGrid() {
      if (!currentProfile || !weaponsContainer) return;
      weaponsContainer.innerHTML = "";
      currentProfile.weaponsCatalog.forEach((w) => {
        const card = document.createElement("div");
        card.className = `weapon-card ${w.isEquipped ? "equipped" : ""}`;
        let statusHtml = "";
        if (w.isEquipped) {
          statusHtml = `<div class="weapon-badge-equipped">\u2713 In Uso</div>`;
        }
        let reqHtml = "";
        let canAfford = false;
        if (w.isMaxLevel) {
          reqHtml = `<div class="weapon-req-box" style="color: #4ade80; text-align: center; font-weight: 700;">\u2605 Maestria Massima (LV 5)</div>`;
        } else if (w.nextCost) {
          const goldHas = currentProfile.gold >= (w.nextCost.gold || 0);
          let matsOk = true;
          let matsRows = "";
          if (w.nextCost.materials) {
            for (const [matId, reqAmt] of Object.entries(w.nextCost.materials)) {
              const owned = currentProfile.inventory && currentProfile.inventory[matId] || 0;
              const hasEnough = owned >= reqAmt;
              if (!hasEnough) matsOk = false;
              const matDef = MATERIALS_DEF[matId] || { name: matId, icon: "\u{1F4E6}" };
              matsRows += `
              <div class="req-item ${hasEnough ? "has" : "missing"}">
                <span>${matDef.icon} ${matDef.name}:</span>
                <span>${owned} / ${reqAmt}</span>
              </div>
            `;
            }
          }
          canAfford = goldHas && matsOk;
          reqHtml = `
          <div class="weapon-req-box">
            <div class="weapon-req-title">${w.isUnlocked ? "Requisiti Potenziamento:" : "Materiali per Forgiare:"}</div>
            <div class="req-item ${goldHas ? "has" : "missing"}">
              <span>\u{1FA99} Oro:</span>
              <span>${currentProfile.gold} / ${w.nextCost.gold || 0}</span>
            </div>
            ${matsRows}
            <div style="margin-top: 6px; font-size: 11px; color: #38bdf8; font-weight: 600;">\u2728 <b>Beneficio:</b> ${w.nextBenefit}</div>
          </div>
        `;
        }
        card.innerHTML = `
        ${statusHtml}
        <div>
          <div class="weapon-head">
            <div class="weapon-icon">${w.icon}</div>
            <div>
              <div class="weapon-title">${w.name}</div>
              <div class="weapon-type-tag">${w.typeName}</div>
            </div>
          </div>
          <div class="weapon-desc">${w.desc}</div>
        </div>

        <div>
          <div class="weapon-level-row">
            <span>Grado Forgiatura:</span>
            <span style="color: ${w.isUnlocked ? "#38bdf8" : "#94a3b8"};">
              ${w.isUnlocked ? `Livello ${w.currentLevel} / ${w.maxLevel}` : "Bloccata"}
            </span>
          </div>

          <div style="margin: 8px 0;">
            ${reqHtml}
          </div>

          <div class="weapon-actions">
            ${!w.isMaxLevel ? `
              <button class="btn-forge" ${!canAfford ? "disabled" : ""}>
                \u{1F528} ${w.isUnlocked ? `Potenzia a LV ${w.currentLevel + 1}` : "Forgia dal Fabbro"}
              </button>
            ` : ""}
            ${w.isUnlocked && !w.isEquipped ? `
              <button class="btn-equip">\u2694\uFE0F Equipaggia</button>
            ` : ""}
          </div>
        </div>
      `;
        const btnForge = card.querySelector(".btn-forge");
        if (btnForge && canAfford) {
          btnForge.addEventListener("click", async () => {
            try {
              currentProfile = await API.craftOrUpgradeWeapon(w.id);
              refreshProfile(currentProfile.nickname);
            } catch (err) {
              alert(err.message);
            }
          });
        }
        const btnEquip = card.querySelector(".btn-equip");
        if (btnEquip) {
          btnEquip.addEventListener("click", async () => {
            try {
              currentProfile = await API.equipWeapon(w.id);
              refreshProfile(currentProfile.nickname);
            } catch (err) {
              alert(err.message);
            }
          });
        }
        weaponsContainer.appendChild(card);
      });
    }
    function renderInventoryGrid() {
      if (!currentProfile || !inventoryContainer) return;
      inventoryContainer.innerHTML = "";
      currentProfile.inventoryCatalog.forEach((item) => {
        const card = document.createElement("div");
        card.className = "inventory-item-card";
        const count = item.count || 0;
        card.innerHTML = `
        <div class="item-top">
          <div class="item-icon-box">${item.icon}</div>
          <div class="item-count-badge" style="opacity: ${count > 0 ? 1 : 0.4};">x${count}</div>
        </div>
        <div>
          <div class="item-name">${item.name}</div>
          <div class="item-rarity" style="color: ${item.color};">${item.rarity}</div>
        </div>
        <div class="item-desc">${item.desc}</div>
      `;
        inventoryContainer.appendChild(card);
      });
    }
    async function renderLeaderboard() {
      leaderboardRows.innerHTML = '<tr><td colspan="6" style="text-align:center;">Caricamento classifica...</td></tr>';
      const list = await API.getLeaderboard();
      leaderboardRows.innerHTML = "";
      if (!list || list.length === 0) {
        leaderboardRows.innerHTML = '<tr><td colspan="6" style="text-align:center;">Nessun record ancora registrato! Sii il primo!</td></tr>';
        return;
      }
      list.forEach((item, index) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
        <td style="font-weight: 800; color: ${index === 0 ? "#fde047" : index === 1 ? "#cbd5e1" : index === 2 ? "#b45309" : "#94a3b8"};">#${index + 1}</td>
        <td style="font-weight: 700; color: #f8fafc;">${item.nickname}</td>
        <td style="font-weight: 800; color: #38bdf8;">${item.score}</td>
        <td>LV ${item.level}</td>
        <td>${item.kills}</td>
        <td>${formatTime(item.survivalSeconds)}</td>
      `;
        leaderboardRows.appendChild(tr);
      });
    }
    function switchTab(btn, pane, callback) {
      [tabBtnTalents, tabBtnBlacksmith, tabBtnInventory, tabBtnLeaderboard].forEach((b) => b?.classList.remove("active"));
      [tabTalents, tabBlacksmith, tabInventory, tabLeaderboard].forEach((p) => p?.classList.remove("active"));
      btn?.classList.add("active");
      pane?.classList.add("active");
      if (callback) callback();
    }
    tabBtnTalents.addEventListener("click", () => switchTab(tabBtnTalents, tabTalents, renderTalentsGrid));
    tabBtnBlacksmith.addEventListener("click", () => switchTab(tabBtnBlacksmith, tabBlacksmith, renderWeaponsGrid));
    tabBtnInventory.addEventListener("click", () => switchTab(tabBtnInventory, tabInventory, renderInventoryGrid));
    tabBtnLeaderboard.addEventListener("click", () => switchTab(tabBtnLeaderboard, tabLeaderboard, renderLeaderboard));
    btnSaveNick.addEventListener("click", () => {
      refreshProfile(inputNick.value);
    });
    function showWeaponNotification(text) {
      if (!weaponNotification) return;
      weaponNotification.textContent = text;
      weaponNotification.classList.remove("hidden");
      clearTimeout(notificationTimeout);
      notificationTimeout = setTimeout(() => {
        weaponNotification.classList.add("hidden");
      }, 2200);
    }
    function equipWeapon(weaponId) {
      const level = currentProfile && currentProfile.weapons && currentProfile.weapons[weaponId] || 1;
      player.weapon = weaponId;
      combat.setWeapon(weaponId, level, player.permanentBonusDamage || 0);
      if (currentProfile) {
        currentProfile.equippedWeapon = weaponId;
      }
      if (elWeaponIcon) elWeaponIcon.textContent = weaponId === "sword" ? "\u{1F5E1}\uFE0F" : weaponId === "bow" ? "\u{1F3F9}" : "\u{1FA84}";
      if (elWeaponName) elWeaponName.textContent = combat.weaponName;
      let dmg = 18;
      if (weaponId === "sword") dmg = combat.swordDamage || 28;
      else if (weaponId === "bow") dmg = combat.bowDamage || 22;
      else dmg = combat.staffDamage || 18;
      if (elDamage) elDamage.textContent = `${Math.round(dmg * combat.damageMultiplier)}`;
      const weaponNames = {
        staff: "Bastone dell'Arcimago \u{1FA84}",
        sword: "Spada da Cavaliere \u{1F5E1}\uFE0F",
        bow: "Arco dei Guardaboschi \u{1F3F9}"
      };
      showWeaponNotification(`\u2694\uFE0F Arma Equipaggiata: ${weaponNames[weaponId] || weaponId}`);
      renderIngameWeapons();
    }
    function renderIngameLoot() {
      if (!ingameLootContainer) return;
      ingameLootContainer.innerHTML = "";
      const allMaterials = Object.values(MATERIALS_DEF);
      allMaterials.forEach((mat) => {
        const runCount = combat.collectedItems && combat.collectedItems[mat.id] || 0;
        const totalOwned = currentProfile && currentProfile.inventory && currentProfile.inventory[mat.id] || 0;
        const card = document.createElement("div");
        card.className = "inventory-item-card";
        card.innerHTML = `
        <div class="item-top">
          <div class="item-icon-box">${mat.icon}</div>
          <div class="item-count-badge" style="opacity: ${runCount > 0 ? 1 : 0.45};">
            +${runCount} raccolti ora
          </div>
        </div>
        <div>
          <div class="item-name">${mat.name}</div>
          <div class="item-rarity" style="color: ${mat.color};">${mat.rarity} \xB7 In archivio: ${totalOwned}</div>
        </div>
        <div class="item-desc">${mat.desc}</div>
      `;
        ingameLootContainer.appendChild(card);
      });
    }
    function renderIngameWeapons() {
      if (!ingameWeaponsContainer) return;
      ingameWeaponsContainer.innerHTML = "";
      const weaponsList = [
        {
          id: "staff",
          key: "1",
          name: "Bastone dell'Arcimago",
          icon: "\u{1FA84}",
          type: "Magia a Distanza (Dardi Autoguidati)",
          desc: "Scaglia dardi arcani luminosi che inseguono automaticamente i nemici nel raggio d'azione.",
          stats: "Danno: 18 \xB7 Dardi: 1-3 \xB7 Gittata: Lunga"
        },
        {
          id: "sword",
          key: "2",
          name: "Spada da Cavaliere",
          icon: "\u{1F5E1}\uFE0F",
          type: "Mischia ad Area (Fendenti Ravvicinati)",
          desc: "Colpisce con violenti archi di taglio semicircolari, scintille metalliche e forte respinta indietro (knockback).",
          stats: "Danno: 28 \xB7 Raggio arco: 92px \xB7 Spinta: Alta"
        },
        {
          id: "bow",
          key: "3",
          name: "Arco dei Guardaboschi",
          icon: "\u{1F3F9}",
          type: "Frecce Perforanti a Lungo Raggio",
          desc: "Scocca frecce fulminee che trapassano 2 o pi\xF9 nemici in linea retta a grandissima distanza.",
          stats: "Danno: 22 \xB7 Perforazione: 2 bersagli \xB7 Velocit\xE0 freccia: Altissima"
        }
      ];
      weaponsList.forEach((w) => {
        const isCurrent = combat.weaponId === w.id;
        const card = document.createElement("div");
        card.className = `weapon-card ${isCurrent ? "equipped" : ""}`;
        card.innerHTML = `
        ${isCurrent ? '<div class="weapon-badge-equipped">\u2713 In Uso Ora</div>' : ""}
        <div>
          <div class="weapon-head">
            <div class="weapon-icon">${w.icon}</div>
            <div>
              <div class="weapon-title">${w.name} [Tasto ${w.key}]</div>
              <div class="weapon-type-tag">${w.type}</div>
            </div>
          </div>
          <div class="weapon-desc">${w.desc}</div>
          <div style="font-size: 11px; color: #38bdf8; font-weight: 700; margin-top: 6px;">\u26A1 ${w.stats}</div>
        </div>
        <div style="margin-top: 10px;">
          <button class="btn-equip" style="width: 100%;">
            ${isCurrent ? "\u2713 Gi\xE0 Equipaggiata" : `\u2694\uFE0F Equipaggia Subito [Tasto ${w.key}]`}
          </button>
        </div>
      `;
        const btn = card.querySelector(".btn-equip");
        btn.addEventListener("click", () => {
          equipWeapon(w.id);
        });
        ingameWeaponsContainer.appendChild(card);
      });
    }
    function renderIngameForge() {
      if (!ingameForgeContainer) return;
      ingameForgeContainer.innerHTML = "";
      if (!currentProfile) return;
      currentProfile.weaponsCatalog.forEach((w) => {
        const card = document.createElement("div");
        card.className = `weapon-card ${w.isEquipped ? "equipped" : ""}`;
        let reqHtml = "";
        let canAfford = false;
        if (w.isMaxLevel) {
          reqHtml = `<div class="weapon-req-box" style="color: #4ade80; text-align: center; font-weight: 700;">\u2605 Grado Massimo (LV 5)</div>`;
        } else if (w.nextCost) {
          const goldHas = currentProfile.gold >= (w.nextCost.gold || 0);
          let matsOk = true;
          let matsRows = "";
          if (w.nextCost.materials) {
            for (const [matId, reqAmt] of Object.entries(w.nextCost.materials)) {
              const owned = (currentProfile.inventory && currentProfile.inventory[matId] || 0) + (combat.collectedItems && combat.collectedItems[matId] || 0);
              const hasEnough = owned >= reqAmt;
              if (!hasEnough) matsOk = false;
              const matDef = MATERIALS_DEF[matId] || { name: matId, icon: "\u{1F4E6}" };
              matsRows += `
              <div class="req-item ${hasEnough ? "has" : "missing"}">
                <span>${matDef.icon} ${matDef.name}:</span>
                <span>${owned} / ${reqAmt}</span>
              </div>
            `;
            }
          }
          canAfford = goldHas && matsOk;
          reqHtml = `
          <div class="weapon-req-box">
            <div class="weapon-req-title">${w.isUnlocked ? "Requisiti Potenziamento:" : "Materiali per Forgiare:"}</div>
            <div class="req-item ${goldHas ? "has" : "missing"}">
              <span>\u{1FA99} Oro:</span>
              <span>${currentProfile.gold} / ${w.nextCost.gold || 0}</span>
            </div>
            ${matsRows}
            <div style="margin-top: 6px; font-size: 11px; color: #38bdf8; font-weight: 600;">\u2728 ${w.nextBenefit}</div>
          </div>
        `;
        }
        card.innerHTML = `
        <div class="weapon-head">
          <div class="weapon-icon">${w.icon}</div>
          <div>
            <div class="weapon-title">${w.name}</div>
            <div class="weapon-type-tag">Grado Forgiatura: Livello ${w.currentLevel} / ${w.maxLevel}</div>
          </div>
        </div>
        <div style="margin: 8px 0;">${reqHtml}</div>
        <button class="btn-forge" ${!canAfford ? "disabled" : ""} style="width: 100%;">
          \u{1F528} ${w.isUnlocked ? `Potenzia a Livello ${w.currentLevel + 1}` : "Forgia dal Fabbro"}
        </button>
      `;
        const btnForge = card.querySelector(".btn-forge");
        if (btnForge && canAfford) {
          btnForge.addEventListener("click", async () => {
            try {
              currentProfile = await API.craftOrUpgradeWeapon(w.id);
              renderIngameForge();
              renderIngameWeapons();
              equipWeapon(combat.weaponId);
            } catch (err) {
              alert(err.message);
            }
          });
        }
        ingameForgeContainer.appendChild(card);
      });
    }
    function switchIngameTab(tabName) {
      [ingameTabBtnLoot, ingameTabBtnWeapons, ingameTabBtnForge].forEach((b) => b?.classList.remove("active"));
      [ingameTabLoot, ingameTabWeapons, ingameTabForge].forEach((p) => p?.classList.remove("active"));
      if (tabName === "loot") {
        ingameTabBtnLoot?.classList.add("active");
        ingameTabLoot?.classList.add("active");
        renderIngameLoot();
      } else if (tabName === "weapons") {
        ingameTabBtnWeapons?.classList.add("active");
        ingameTabWeapons?.classList.add("active");
        renderIngameWeapons();
      } else {
        ingameTabBtnForge?.classList.add("active");
        ingameTabForge?.classList.add("active");
        renderIngameForge();
      }
    }
    function openIngameInventory(tab = "loot") {
      if (gameState !== "PLAYING") return;
      isInventoryOpen = true;
      if (ingameModal) ingameModal.classList.remove("hidden");
      switchIngameTab(tab);
    }
    function closeIngameInventory() {
      isInventoryOpen = false;
      if (ingameModal) ingameModal.classList.add("hidden");
    }
    function toggleIngameInventory() {
      if (isInventoryOpen) closeIngameInventory();
      else openIngameInventory("loot");
    }
    if (btnOpenBag) btnOpenBag.addEventListener("click", () => toggleIngameInventory());
    if (btnCloseBag) btnCloseBag.addEventListener("click", () => closeIngameInventory());
    if (btnResumeGame) btnResumeGame.addEventListener("click", () => closeIngameInventory());
    if (ingameTabBtnLoot) ingameTabBtnLoot.addEventListener("click", () => switchIngameTab("loot"));
    if (ingameTabBtnWeapons) ingameTabBtnWeapons.addEventListener("click", () => switchIngameTab("weapons"));
    if (ingameTabBtnForge) ingameTabBtnForge.addEventListener("click", () => switchIngameTab("forge"));
    function startExpedition() {
      gameState = "PLAYING";
      runSurvivalSeconds = 0;
      player.applyPermanentStats(currentProfile.calculatedStats);
      player.x = 0;
      player.y = 50;
      camera.snapTo(player.x, player.y);
      const eqWeapon = currentProfile.equippedWeapon || "staff";
      const eqLevel = currentProfile.weapons && currentProfile.weapons[eqWeapon] || 1;
      player.weapon = eqWeapon;
      combat.setWeapon(eqWeapon, eqLevel, player.permanentBonusDamage || 0);
      combat.kills = 0;
      combat.goldEarned = 0;
      combat.collectedItems = {};
      combat.itemPickups = [];
      combat.projectiles = [];
      combat.slashes = [];
      combat.pickups = [];
      combat.enemies = [];
      combat.hasOrbitOrb = false;
      combat.damageMultiplier = 1;
      progression.level = 1;
      progression.currentXp = 0;
      progression.nextLevelXp = 25;
      progression.isPausedForLevelUp = false;
      if (elWeaponIcon) elWeaponIcon.textContent = combat.weaponId === "sword" ? "\u{1F5E1}\uFE0F" : combat.weaponId === "bow" ? "\u{1F3F9}" : "\u{1FA84}";
      if (elWeaponName) elWeaponName.textContent = combat.weaponName;
      combat.enemies.push(new Enemy(140, -170, "slime_forest"));
      combat.enemies.push(new Enemy(180, -190, "slime_forest"));
      combat.enemies.push(new Enemy(-160, -170, "slime_ice"));
      combat.enemies.push(new Enemy(-180, 150, "slime_sand"));
      combat.enemies.push(new Enemy(170, 160, "skeleton"));
      for (let i = 0; i < 10; i++) {
        const pt = world.findValidSpawn(300, 1300, "forest");
        combat.enemies.push(new Enemy(pt.x, pt.y, "slime_forest"));
      }
      for (let i = 0; i < 10; i++) {
        const pt = world.findValidSpawn(300, 1300, "snow");
        combat.enemies.push(new Enemy(pt.x, pt.y, "slime_ice"));
      }
      for (let i = 0; i < 10; i++) {
        const pt = world.findValidSpawn(300, 1300, "desert");
        combat.enemies.push(new Enemy(pt.x, pt.y, "slime_sand"));
      }
      for (let i = 0; i < 10; i++) {
        const pt = world.findValidSpawn(300, 1300, "volcano");
        combat.enemies.push(new Enemy(pt.x, pt.y, "slime_magma"));
      }
      for (let i = 0; i < 14; i++) {
        const pt = world.findValidSpawn(350, 1400);
        combat.enemies.push(new Enemy(pt.x, pt.y, "skeleton"));
      }
      closeIngameInventory();
      menuScreen.classList.add("hidden");
      gameHud.classList.remove("hidden");
      modalGameOver.classList.add("hidden");
      showWeaponNotification("Tasto [I]: Zaino/Inventario \xB7 Tasti [1/2/3]: Cambia Arma");
    }
    btnStartRun.addEventListener("click", startExpedition);
    async function handleGameOver() {
      if (gameState === "GAMEOVER") return;
      gameState = "GAMEOVER";
      const totalItems = Object.values(combat.collectedItems || {}).reduce((a, b) => a + b, 0);
      const runStats = {
        level: progression.level,
        kills: combat.kills,
        survivalSeconds: Math.floor(runSurvivalSeconds),
        goldEarned: combat.goldEarned,
        collectedItems: combat.collectedItems
      };
      const res = await API.submitRun(runStats);
      elSumTime.textContent = formatTime(runStats.survivalSeconds);
      elSumLevel.textContent = `${runStats.level}`;
      elSumKills.textContent = `${runStats.kills}`;
      elSumGold.textContent = `+${res.finalGold} \u{1FA99}`;
      if (elSumItems) elSumItems.textContent = `+${totalItems} \u{1F392}`;
      elSumScore.textContent = `${res.score}`;
      gameHud.classList.add("hidden");
      modalGameOver.classList.remove("hidden");
    }
    player.onDeath = () => handleGameOver();
    btnReturnSanctuary.addEventListener("click", async () => {
      modalGameOver.classList.add("hidden");
      menuScreen.classList.remove("hidden");
      gameState = "MENU";
      await refreshProfile();
    });
    progression.onLevelUpCallback = (lvl, choices) => {
      if (!cardsContainer || !modalLevelUp) return;
      cardsContainer.innerHTML = "";
      choices.forEach((choice, idx) => {
        const card = document.createElement("div");
        card.className = "upgrade-card";
        card.innerHTML = `
        <div class="card-key">[${idx + 1}]</div>
        <div class="card-icon">${choice.icon}</div>
        <div class="card-title">${choice.title}</div>
        <div class="card-desc">${choice.desc}</div>
      `;
        card.addEventListener("click", () => {
          progression.chooseUpgrade(idx);
        });
        cardsContainer.appendChild(card);
      });
      modalLevelUp.classList.remove("hidden");
    };
    progression.onUpgradeChosenCallback = () => {
      if (modalLevelUp) {
        modalLevelUp.classList.add("hidden");
      }
    };
    window.addEventListener("keydown", (e) => {
      if (progression.isPausedForLevelUp) {
        if (e.key === "1") progression.chooseUpgrade(0);
        else if (e.key === "2") progression.chooseUpgrade(1);
        else if (e.key === "3") progression.chooseUpgrade(2);
        return;
      }
      if (gameState === "PLAYING") {
        if (e.code === "KeyI" || e.code === "KeyB" || e.key === "i" || e.key === "I" || e.key === "b" || e.key === "B") {
          e.preventDefault();
          toggleIngameInventory();
          return;
        }
        if (e.key === "Escape" || e.code === "Escape") {
          if (isInventoryOpen) {
            closeIngameInventory();
            return;
          }
        }
        if (e.key === "1") {
          equipWeapon("staff");
        } else if (e.key === "2") {
          equipWeapon("sword");
        } else if (e.key === "3") {
          equipWeapon("bow");
        }
      }
    });
    function handleResize() {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      camera.resize(canvas.width, canvas.height, dpr);
    }
    window.addEventListener("resize", handleResize);
    handleResize();
    let lastTime = performance.now();
    let frameCount = 0;
    let fpsTimer = 0;
    let currentFps = 60;
    function loop(currentTime) {
      try {
        const rawDt = (currentTime - lastTime) / 1e3;
        lastTime = currentTime;
        const dt = Math.min(Math.max(rawDt, 0), 0.1);
        frameCount++;
        fpsTimer += dt;
        if (fpsTimer >= 0.5) {
          currentFps = Math.round(frameCount / fpsTimer);
          frameCount = 0;
          fpsTimer = 0;
        }
        if (gameState === "PLAYING") {
          if (!isInventoryOpen && !progression.isPausedForLevelUp) {
            runSurvivalSeconds += dt;
            player.update(dt, Input, world);
            combat.update(dt, player, world, camera);
            camera.follow(player.x, player.y, dt);
          }
        }
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = false;
        ctx.save();
        camera.apply(ctx);
        world.drawGround(ctx, camera);
        combat.drawPickups(ctx);
        world.drawEntitiesAndProps(ctx, camera, [player, ...combat.getAllTargets()]);
        combat.drawOrbitOrbs(ctx, player);
        combat.drawProjectiles(ctx);
        combat.drawFX(ctx);
        ctx.restore();
        world.drawVignette(ctx, canvas.width, canvas.height);
        ctx.restore();
        if (gameState === "PLAYING") {
          if (elFps) elFps.textContent = `${currentFps}`;
          if (elTimer) elTimer.textContent = formatTime(runSurvivalSeconds);
          if (elEnemies) elEnemies.textContent = `${combat.enemies.length}`;
          if (elLevel) elLevel.textContent = `${progression.level}`;
          if (elXpFill) elXpFill.style.width = `${Math.round(progression.progressRatio * 100)}%`;
          if (elXpText) elXpText.textContent = `${progression.currentXp} / ${progression.nextLevelXp} XP`;
          const hpRatio = Math.max(0, player.hp / player.maxHp);
          if (elHpFill) elHpFill.style.width = `${Math.round(hpRatio * 100)}%`;
          if (elHpText) elHpText.textContent = `${Math.max(0, Math.round(player.hp))} / ${player.maxHp} HP`;
          if (elRunGold) elRunGold.textContent = `${combat.goldEarned}`;
          const runItemsCount = Object.values(combat.collectedItems || {}).reduce((a, b) => a + b, 0);
          if (elRunItems) elRunItems.textContent = `${runItemsCount}`;
          let currentBaseDmg = 18;
          if (combat.weaponId === "sword") currentBaseDmg = combat.swordDamage || 28;
          else if (combat.weaponId === "bow") currentBaseDmg = combat.bowDamage || 22;
          else currentBaseDmg = combat.staffDamage || 18;
          if (elDamage) elDamage.textContent = `${Math.round(currentBaseDmg * combat.damageMultiplier)}`;
          if (elTarget) {
            elTarget.textContent = combat.currentTarget ? combat.currentTarget.name : "Nessuno";
            elTarget.style.color = combat.currentTarget ? "#38bdf8" : "#94a3b8";
          }
          if (elCdFill) {
            const pct = Math.round(combat.cooldownProgress * 100);
            elCdFill.style.width = `${pct}%`;
            elCdFill.style.backgroundColor = pct >= 100 ? "#38bdf8" : "#0284c7";
          }
        }
        Input.endFrame();
      } catch (err) {
        console.error("Errore durante il ciclo di gioco:", err);
      }
      requestAnimationFrame(loop);
    }
    await refreshProfile();
    requestAnimationFrame(loop);
  });
})();
//# sourceMappingURL=bundle.js.map
