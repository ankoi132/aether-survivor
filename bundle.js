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
    /**
     * Converte le coordinate schermo/mouse (clientX, clientY) in coordinate assolute del mondo di gioco
     */
    screenToWorld(clientX, clientY, canvas) {
      const rect = canvas.getBoundingClientRect();
      const canvasX = (clientX - rect.left) * (canvas.width / rect.width);
      const canvasY = (clientY - rect.top) * (canvas.height / rect.height);
      const worldX = canvasX / this.scale + this.left() - this.shakeX;
      const worldY = canvasY / this.scale + this.top() - this.shakeY;
      return { x: worldX, y: worldY };
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
        // Lastricato in caldo calcare Serene Village (Cittadella, Sylva)
        floor: ["#a5907b", "#bfa892", "#8c7b6d"],
        dirt: ["#7d6961", "#6b5851", "#5a4943"],
        speck: "#4a3e3d",
        light: "#d7c4a7",
        flowers: ["#fde047", "#f472b6", "#ffffff"],
        wallTop: ["#8c7b6d", "#a5907b", "#7d6961"],
        wallLight: "#d7c4a7",
        wallEdge: "#3a2e2b",
        wallFace: ["#5a4943", "#43342f"],
        wallFaceDark: "#2b211e",
        liq: "#0284c7",
        liqDeep: "#0369a1",
        foam: "#e0f2fe",
        shore: "#8c7b6d"
      },
      village_volcano: {
        // Lastricato di basalto e ardesia scura vulcanica (Rocca di Cineris)
        floor: ["#27272a", "#18181b", "#3f3f46"],
        dirt: ["#18181b", "#09090b", "#27272a"],
        speck: "#09090b",
        light: "#52525b",
        flowers: ["#f59e0b", "#ef4444", "#facc15"],
        wallTop: ["#27272a", "#3f3f46", "#18181b"],
        wallLight: "#52525b",
        wallEdge: "#09090b",
        wallFace: ["#18181b", "#09090b"],
        wallFaceDark: "#020617",
        liq: "#dc2626",
        liqDeep: "#991b1b",
        foam: "#facc15",
        shore: "#27272a"
      },
      village_snow: {
        // Lastricato di pietra alpina con brina e neve (Frostpeak)
        floor: ["#94a3b8", "#cbd5e1", "#64748b"],
        dirt: ["#64748b", "#475569", "#334155"],
        speck: "#475569",
        light: "#e2e8f0",
        flowers: ["#7dd3fc", "#ffffff", "#93c5fd"],
        wallTop: ["#64748b", "#94a3b8", "#475569"],
        wallLight: "#e2e8f0",
        wallEdge: "#1e293b",
        wallFace: ["#334155", "#1e293b"],
        wallFaceDark: "#0f172a",
        liq: "#0284c7",
        liqDeep: "#0369a1",
        foam: "#e0f2fe",
        shore: "#94a3b8"
      },
      village_desert: {
        // Lastricato di arenaria dorata delle carovane (Oasi di Al-Zahir)
        floor: ["#d97706", "#b45309", "#f59e0b"],
        dirt: ["#92400e", "#78350f", "#451a03"],
        speck: "#78350f",
        light: "#fde047",
        flowers: ["#facc15", "#ef4444", "#fbbf24"],
        wallTop: ["#b45309", "#d97706", "#92400e"],
        wallLight: "#fde047",
        wallEdge: "#451a03",
        wallFace: ["#78350f", "#451a03"],
        wallFaceDark: "#291402",
        liq: "#0284c7",
        liqDeep: "#0369a1",
        foam: "#e0f2fe",
        shore: "#d97706"
      },
      village_river: {
        // Lastricato di ciottoli fluviali levigati (Borgo delle Cascate)
        floor: ["#64748b", "#718096", "#475569"],
        dirt: ["#475569", "#334155", "#1e293b"],
        speck: "#334155",
        light: "#94a3b8",
        flowers: ["#38bdf8", "#e0f2fe", "#67e8f9"],
        wallTop: ["#475569", "#64748b", "#334155"],
        wallLight: "#94a3b8",
        wallEdge: "#1e293b",
        wallFace: ["#334155", "#1e293b"],
        wallFaceDark: "#0f172a",
        liq: "#0284c7",
        liqDeep: "#0369a1",
        foam: "#ffffff",
        shore: "#64748b"
      },
      river: {
        floor: ["#16a34a", "#22c55e", "#15803d"],
        // Sponde verdi e fresche del fiume
        dirt: ["#3f4d36", "#4d5c41", "#35432d"],
        // Sponde terrose e limo fluviale naturale
        speck: "#14532d",
        light: "#4ade80",
        flowers: ["#38bdf8", "#67e8f9", "#f472b6", "#ffffff"],
        // Ninfee e cannette fiorite
        wallTop: ["#475569", "#64748b", "#334155"],
        // Scogliere della cascata
        wallLight: "#94a3b8",
        wallEdge: "#1e293b",
        wallFace: ["#334155", "#1e293b"],
        wallFaceDark: "#0f172a",
        liq: "#0284c7",
        liqDeep: "#0369a1",
        foam: "#ffffff",
        // Schiuma bianca spumeggiante della cascata
        shore: "#15803d"
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
      const kind = at(tx, ty);
      if (kind === "bridge") {
        const cWoodDark = pack("#3e2723");
        const cWoodMid = pack("#5d4037");
        const cWoodLight = pack("#8d6e63");
        const cNail = pack("#1e293b");
        for (let y = 0; y < T; y++) {
          for (let x = 0; x < T; x++) {
            const isPlankEdge = y % 4 === 0 || (x === 0 || x === T - 1);
            let col = isPlankEdge ? cWoodDark : hash(tx * T + x, ty * T + y, 5) > 0.5 ? cWoodMid : cWoodLight;
            if ((x === 2 || x === T - 3) && y % 4 === 2) col = cNail;
            P.set(ox + x, oy + y, col);
          }
        }
        return;
      }
      if (kind === "road") {
        let cCobbleBase, cCobbleLight, cCobbleDark, cMortar;
        if (biome === "snow") {
          cCobbleLight = pack("#e2e8f0");
          cCobbleBase = pack("#94a3b8");
          cCobbleDark = pack("#64748b");
          cMortar = pack("#475569");
        } else if (biome === "desert") {
          cCobbleLight = pack("#fde047");
          cCobbleBase = pack("#d97706");
          cCobbleDark = pack("#b45309");
          cMortar = pack("#78350f");
        } else if (biome === "volcano") {
          cCobbleLight = pack("#52525b");
          cCobbleBase = pack("#27272a");
          cCobbleDark = pack("#18181b");
          cMortar = pack("#09090b");
        } else {
          cCobbleLight = pack("#d7c4a7");
          cCobbleBase = pack("#a5907b");
          cCobbleDark = pack("#7d6961");
          cMortar = pack("#3a3a50");
        }
        const nR = at(tx, ty - 1) === "road" || at(tx, ty - 1) === "bridge";
        const sR = at(tx, ty + 1) === "road" || at(tx, ty + 1) === "bridge";
        const wR = at(tx - 1, ty) === "road" || at(tx - 1, ty) === "bridge";
        const eR = at(tx + 1, ty) === "road" || at(tx + 1, ty) === "bridge";
        for (let y = 0; y < T; y++) {
          for (let x = 0; x < T; x++) {
            const gx = tx * T + x, gy = ty * T + y;
            if (!wR && x === 0 || !eR && x === T - 1 || !nR && y === 0 || !sR && y === T - 1) {
              if (hash(gx, gy, 8) > 0.45) {
                P.set(ox + x, oy + y, C.floor[0]);
                continue;
              }
            }
            const stoneRow = Math.floor(gy / 3);
            const rowShift = stoneRow % 2 === 0 ? 0 : 2;
            const lx = (gx + rowShift) % 5;
            const ly = gy % 3;
            let col;
            if (lx === 0 || ly === 0) {
              col = cMortar;
            } else if (lx === 1 && ly === 1) {
              col = cCobbleLight;
            } else if (lx === 4 || ly === 2) {
              col = cCobbleDark;
            } else {
              col = hash(gx >> 1, gy >> 1, 14) > 0.6 ? cCobbleLight : cCobbleBase;
            }
            P.set(ox + x, oy + y, col);
          }
        }
        return;
      }
      if (kind === "trail") {
        let cTrailBase, cTrailLight, cTrailDark, cGravel;
        if (biome === "snow") {
          cTrailLight = pack("#ffffff");
          cTrailBase = pack("#cbd5e1");
          cTrailDark = pack("#94a3b8");
          cGravel = pack("#64748b");
        } else if (biome === "desert") {
          cTrailLight = pack("#fef08a");
          cTrailBase = pack("#ca8a04");
          cTrailDark = pack("#a16207");
          cGravel = pack("#78350f");
        } else if (biome === "volcano") {
          cTrailLight = pack("#52525b");
          cTrailBase = pack("#3f3f46");
          cTrailDark = pack("#27272a");
          cGravel = pack("#18181b");
        } else {
          cTrailLight = pack("#d29f51");
          cTrailBase = pack("#cb9a4e");
          cTrailDark = pack("#cb8a46");
          cGravel = pack("#bb6d33");
        }
        const nT = at(tx, ty - 1) === "trail" || at(tx, ty - 1) === "bridge";
        const sT = at(tx, ty + 1) === "trail" || at(tx, ty + 1) === "bridge";
        const wT = at(tx - 1, ty) === "trail" || at(tx - 1, ty) === "bridge";
        const eT = at(tx + 1, ty) === "trail" || at(tx + 1, ty) === "bridge";
        for (let y = 0; y < T; y++) {
          for (let x = 0; x < T; x++) {
            const gx = tx * T + x, gy = ty * T + y;
            if (!wT && x <= 1 || !eT && x >= T - 2 || !nT && y <= 1 || !sT && y >= T - 2) {
              const fringeR = hash(gx, gy, 7);
              const distBorder = Math.min(!wT ? x : 9, !eT ? T - 1 - x : 9, !nT ? y : 9, !sT ? T - 1 - y : 9);
              if (fringeR > distBorder * 0.45) {
                P.set(ox + x, oy + y, C.floor[Math.floor(hash(gx, gy, 9) * C.floor.length)]);
                continue;
              }
            }
            const wave = Math.sin((gx + gy) * 0.35) * 0.5 + hash(gx >> 1, gy >> 1, 10) * 0.5;
            let col = wave > 0.6 ? cTrailLight : wave < -0.2 ? cTrailDark : cTrailBase;
            const g = hash(gx, gy, 15);
            if (g < 0.04) col = cGravel;
            else if (g > 0.97) col = cTrailLight;
            P.set(ox + x, oy + y, col);
          }
        }
        return;
      }
      if (kind === "shallow") {
        const cSand = pack("#0284c7");
        const cWater1 = pack("#38bdf8");
        const cWater2 = pack("#7dd3fc");
        const cFoam = pack("#e0f2fe");
        for (let y = 0; y < T; y++) {
          for (let x = 0; x < T; x++) {
            const gx = tx * T + x, gy = ty * T + y;
            const wave = hash(gx >> 1, gy >> 1, 19);
            let col = wave > 0.6 ? cWater2 : wave > 0.25 ? cWater1 : cSand;
            if (hash(gx, gy, 20) < 0.08) col = cFoam;
            P.set(ox + x, oy + y, col);
          }
        }
        return;
      }
      let dirtCount = 0;
      const isVillage = biome.startsWith("village");
      if (isVillage) {
        let cCobbleLight, cCobbleBase, cCobbleDark, cMortar, cAccent;
        if (biome === "village_volcano") {
          cCobbleLight = pack("#52525b");
          cCobbleBase = pack("#27272a");
          cCobbleDark = pack("#18181b");
          cMortar = pack("#09090b");
          cAccent = pack("#ef4444");
        } else if (biome === "village_snow") {
          cCobbleLight = pack("#e2e8f0");
          cCobbleBase = pack("#94a3b8");
          cCobbleDark = pack("#64748b");
          cMortar = pack("#475569");
          cAccent = pack("#ffffff");
        } else if (biome === "village_desert") {
          cCobbleLight = pack("#fde047");
          cCobbleBase = pack("#d97706");
          cCobbleDark = pack("#b45309");
          cMortar = pack("#78350f");
          cAccent = pack("#fbbf24");
        } else if (biome === "village_river") {
          cCobbleLight = pack("#94a3b8");
          cCobbleBase = pack("#64748b");
          cCobbleDark = pack("#475569");
          cMortar = pack("#1e293b");
          cAccent = pack("#38bdf8");
        } else {
          cCobbleLight = pack("#d7c4a7");
          cCobbleBase = pack("#a5907b");
          cCobbleDark = pack("#7d6961");
          cMortar = pack("#4a3e3d");
          cAccent = pack("#bfa892");
        }
        for (let y = 0; y < T; y++) {
          for (let x = 0; x < T; x++) {
            const gx = tx * T + x, gy = ty * T + y;
            const stoneRow = Math.floor(gy / 3);
            const rowShift = stoneRow % 2 === 0 ? 0 : 2;
            const stoneCol = Math.floor((gx + rowShift) / 5);
            const lx = (gx + rowShift) % 5;
            const ly = gy % 3;
            const sHash = hash(stoneCol, stoneRow, 23);
            let baseCol = cCobbleBase;
            if (sHash > 0.68) baseCol = cCobbleLight;
            else if (sHash < 0.28) baseCol = cCobbleDark;
            let col;
            if (lx === 0 || ly === 0) {
              col = cMortar;
              if (biome === "village_volcano" && hash(gx, gy, 31) < 0.025) {
                col = cAccent;
              }
            } else if (lx === 1 && ly === 1) {
              col = cCobbleLight;
            } else if (lx === 4 || ly === 2) {
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
      const P = Pix(32, 36);
      const cWoodDark = pack("#382b1d");
      const cWood = pack("#5b4a34");
      const cWoodLight = pack("#786245");
      const cShingleDark = pack("#1e293b");
      const cShingle = pack("#334155");
      const cShingleLight = pack("#475569");
      const cRope = pack("#d97706");
      const cWaterDark = pack("#0284c7");
      const cWaterLight = pack("#38bdf8");
      const cWaterFoam = pack("#e0f2fe");
      const cStoneDark = pack("#1e293b");
      const cStoneMid = pack("#334155");
      const cStoneLight = pack("#475569");
      const cStoneRim = pack("#64748b");
      const cEdge = pack("#090d16");
      for (let y = 21; y <= 33; y++) {
        for (let x = 4; x <= 27; x++) {
          const dx = (x - 15.5) / 11.5;
          const dyTop = (y - 21.5) / 3.5;
          const isTopRim = dx * dx + dyTop * dyTop <= 1 && y <= 24;
          if (isTopRim) {
            const isWater = dx * dx * 1.5 + (y - 22.5) * (y - 22.5) <= 1;
            if (isWater) {
              const col = x % 3 === 0 && y === 22 ? cWaterFoam : (x + y) % 2 === 0 ? cWaterLight : cWaterDark;
              P.set(x, y, col);
            } else {
              P.set(x, y, y === 21 ? cStoneRim : cStoneLight);
            }
          } else if (y >= 23) {
            const isLeft = x <= 9;
            const isRight = x >= 22;
            const isMortar = y % 4 === 0 || (x + Math.floor(y / 4) * 3) % 5 === 0;
            let col = isMortar ? cStoneDark : isLeft ? cStoneLight : isRight ? cStoneDark : cStoneMid;
            if (y === 33) col = cStoneDark;
            P.set(x, y, col);
          }
        }
      }
      for (let y = 11; y <= 24; y++) {
        for (let x = 6; x <= 8; x++) {
          P.set(x, y, x === 6 ? cWoodLight : x === 8 ? cWoodDark : cWood);
        }
        for (let x = 23; x <= 25; x++) {
          P.set(x, y, x === 23 ? cWoodLight : x === 25 ? cWoodDark : cWood);
        }
      }
      for (let x = 6; x <= 25; x++) {
        P.set(x, 12, cWoodLight);
        P.set(x, 13, cWood);
        P.set(x, 14, cWoodDark);
      }
      for (let x = 12; x <= 19; x++) {
        P.set(x, 15, x % 2 === 0 ? pack("#fde047") : cRope);
        P.set(x, 16, x % 2 === 0 ? cRope : pack("#92400e"));
      }
      for (let y = 17; y <= 21; y++) P.set(15, y, cRope);
      for (let y = 20; y <= 23; y++) {
        for (let x = 13; x <= 17; x++) {
          P.set(x, y, y === 20 || x === 13 || x === 17 ? pack("#475569") : cWood);
        }
      }
      for (let y = 3; y <= 11; y++) {
        const t = (y - 3) / 8;
        const span = Math.round(2 + t * 13);
        for (let x = 15 - span; x <= 16 + span; x++) {
          const isRidge = x === 15 || x === 16;
          const isShingleEdge = y % 3 === 0;
          let col = isRidge ? pack("#64748b") : x < 15 ? cShingleLight : cShingle;
          if (isShingleEdge) col = cShingleLight;
          if (y === 11) col = cShingleDark;
          P.set(x, y, col);
        }
      }
      outline(P, cEdge);
      return P.canvas();
    }
    function paintLamppost() {
      const P = Pix(16, 34);
      const cIronDark = pack("#020617");
      const cIron = pack("#1e293b");
      const cIronMid = pack("#334155");
      const cIronLight = pack("#64748b");
      const cGlass = pack("#e0f2fe");
      const cGlow = pack("#fde047");
      const cCore = pack("#ffffff");
      const cEdge = pack("#020617");
      for (let x = 5; x <= 10; x++) P.set(x, 32, cIron);
      for (let x = 6; x <= 9; x++) P.set(x, 31, cIronMid);
      for (let y = 13; y <= 30; y++) {
        P.set(7, y, cIronLight);
        P.set(8, y, cIron);
      }
      for (let x = 7; x <= 12; x++) P.set(x, 8, cIronMid);
      P.set(13, 9, cIronLight);
      P.set(13, 10, cIron);
      for (let x = 10; x <= 14; x++) {
        P.set(x, 11, cIronMid);
        P.set(x, 18, cIron);
      }
      for (let y = 12; y <= 17; y++) {
        P.set(10, y, cIronDark);
        P.set(14, y, cIronDark);
        for (let x = 11; x <= 13; x++) {
          P.set(x, y, y === 14 && x === 12 ? cCore : y >= 13 && y <= 15 ? cGlow : cGlass);
        }
      }
      outline(P, cEdge);
      return P.canvas();
    }
    function paintBlacksmith() {
      const P = Pix(38, 36);
      const cSkin = pack("#fcd34d");
      const cBeard = pack("#92400e");
      const cApron = pack("#78350f");
      const cApronDark = pack("#451a03");
      const cSteel = pack("#cbd5e1");
      const cSteelDark = pack("#475569");
      const cHotMetal = pack("#f97316");
      const cGlow = pack("#fde047");
      const cWood = pack("#5b4a34");
      const cEdge = pack("#090d16");
      for (let y = 18; y <= 32; y++) {
        for (let x = 6; x <= 18; x++) {
          const isAnvilTop = y <= 22;
          const isAnvilHorn = y === 20 && (x < 8 || x > 16);
          if (isAnvilTop || isAnvilHorn || y > 22 && x >= 10 && x <= 14 || y >= 30) {
            P.set(x, y, cSteelDark);
          }
        }
      }
      for (let x = 8; x <= 15; x++) {
        P.set(x, 19, cHotMetal);
        P.set(x, 18, cGlow);
      }
      for (let y = 26; y <= 33; y++) {
        P.set(22, y, cApronDark);
        P.set(23, y, cApronDark);
        P.set(26, y, cApronDark);
        P.set(27, y, cApronDark);
      }
      for (let y = 14; y <= 26; y++) {
        for (let x = 20; x <= 29; x++) {
          P.set(x, y, x === 20 || x === 29 ? cApronDark : cApron);
        }
      }
      for (let y = 6; y <= 13; y++) {
        for (let x = 21; x <= 28; x++) {
          if (y <= 8) P.set(x, y, cSteel);
          else if (y === 9 || y === 10) P.set(x, y, cSkin);
          else P.set(x, y, cBeard);
        }
      }
      P.set(22, 9, pack("#0f172a"));
      P.set(26, 9, pack("#0f172a"));
      for (let x = 15; x <= 20; x++) P.set(x, 12, cSkin);
      for (let y = 8; y <= 16; y++) P.set(15, y, cWood);
      for (let y = 6; y <= 10; y++) {
        for (let x = 13; x <= 17; x++) P.set(x, y, cSteel);
      }
      outline(P, cEdge);
      return P.canvas();
    }
    function paintWaterMill() {
      const W = 64, H = 56;
      const P = Pix(W, H);
      const cStone = pack("#475569");
      const cStoneDark = pack("#1e293b");
      const cWood = pack("#78350f");
      const cWoodDark = pack("#451a03");
      const cRoof = pack("#0284c7");
      const cRoofLight = pack("#38bdf8");
      const cWater = pack("#7dd3fc");
      const cEdge = pack("#090d16");
      for (let y = 22; y <= 50; y++) {
        for (let x = 8; x <= 44; x++) {
          P.set(x, y, x % 5 === 0 || y % 5 === 0 ? cStoneDark : cStone);
        }
      }
      for (let y = 36; y <= 49; y++) {
        for (let x = 22; x <= 29; x++) P.set(x, y, cWoodDark);
      }
      for (let y = 8; y <= 23; y++) {
        const span = Math.round((y - 8) / 15 * 22);
        for (let x = 26 - span; x <= 26 + span; x++) {
          P.set(x, y, y % 2 === 0 ? cRoofLight : cRoof);
        }
      }
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
      for (let x = 46; x <= 58; x++) {
        P.set(x, 51, cWater);
        if (x % 2 === 0) P.set(x, 52, pack("#ffffff"));
      }
      outline(P, cEdge);
      return P.canvas();
    }
    function paintDesertTent() {
      const W = 58, H = 46;
      const P = Pix(W, H);
      const cCloth = pack("#d97706");
      const cClothLight = pack("#fde047");
      const cClothRed = pack("#dc2626");
      const cPole = pack("#78350f");
      const cInside = pack("#451a03");
      const cEdge = pack("#090d16");
      for (let y = 10; y <= 40; y++) {
        const span = Math.round(Math.sin((y - 10) / 30 * Math.PI) * 25);
        for (let x = 29 - span; x <= 29 + span; x++) {
          const stripe = Math.floor(Math.abs(x - 29) / 4) % 3;
          P.set(x, y, stripe === 0 ? cClothLight : stripe === 1 ? cCloth : cClothRed);
        }
      }
      for (let y = 26; y <= 40; y++) {
        const span = Math.round((40 - y) / 14 * 8);
        for (let x = 29 - span; x <= 29 + span; x++) P.set(x, y, cInside);
      }
      for (let y = 4; y <= 9; y++) P.set(29, y, cClothLight);
      outline(P, cEdge);
      return P.canvas();
    }
    function paintSnowCabin() {
      const W = 62, H = 54;
      const P = Pix(W, H);
      const cLog = pack("#5b4a34");
      const cLogDark = pack("#382b1d");
      const cSnow = pack("#f8fafc");
      const cSnowShadow = pack("#cbd5e1");
      const cGlow = pack("#fde047");
      const cEdge = pack("#090d16");
      for (let y = 24; y <= 48; y++) {
        for (let x = 8; x <= 53; x++) {
          P.set(x, y, y % 4 === 0 ? cLogDark : cLog);
        }
      }
      for (let y = 30; y <= 38; y++) {
        for (let x = 14; x <= 20; x++) P.set(x, y, cGlow);
        for (let x = 41; x <= 47; x++) P.set(x, y, cGlow);
      }
      for (let y = 34; y <= 48; y++) {
        for (let x = 27; x <= 34; x++) P.set(x, y, cLogDark);
      }
      for (let y = 8; y <= 26; y++) {
        const span = Math.round((y - 8) / 18 * 28);
        for (let x = 31 - span; x <= 31 + span; x++) {
          P.set(x, y, y <= 14 ? cSnow : y % 3 === 0 ? cSnowShadow : cSnow);
        }
      }
      outline(P, cEdge);
      return P.canvas();
    }
    function paintWoodCabin() {
      const W = 58, H = 50;
      const P = Pix(W, H);
      const cWood = pack("#5b4a34");
      const cMoss = pack("#15803d");
      const cMossLight = pack("#4ade80");
      const cDoor = pack("#3b2d1f");
      const cGlow = pack("#a7f3d0");
      const cEdge = pack("#090d16");
      for (let y = 22; y <= 44; y++) {
        for (let x = 8; x <= 50; x++) {
          P.set(x, y, x % 5 === 0 ? cDoor : cWood);
        }
      }
      for (let y = 28; y <= 34; y++) {
        for (let x = 14; x <= 20; x++) P.set(x, y, cGlow);
      }
      for (let y = 30; y <= 44; y++) {
        for (let x = 26; x <= 33; x++) P.set(x, y, cDoor);
      }
      for (let y = 8; y <= 23; y++) {
        const span = Math.round((y - 8) / 15 * 26);
        for (let x = 29 - span; x <= 29 + span; x++) {
          P.set(x, y, (x + y) % 3 === 0 ? cMossLight : cMoss);
        }
      }
      outline(P, cEdge);
      return P.canvas();
    }
    function paintVolcanoFort() {
      const W = 80, H = 64;
      const P = Pix(W, H);
      const cMortar = pack("#09090b");
      const cBasaltShadow = pack("#14171d");
      const cBasaltBase = pack("#1e232d");
      const cBasaltMid = pack("#2c3240");
      const cBasaltLight = pack("#414a5d");
      const cBasaltRim = pack("#5a647a");
      const cIron = pack("#52525b");
      const cWoodDark = pack("#271b14");
      const cWoodMid = pack("#3d281a");
      const cLavaGlow = pack("#fef08a");
      const cLavaMid = pack("#f59e0b");
      const cLavaDark = pack("#ef4444");
      const cEdge = pack("#020617");
      function block(x0, y0, w, h) {
        for (let y = y0; y < y0 + h; y++) {
          for (let x = x0; x < x0 + w; x++) {
            if (x === x0 || y === y0) P.set(x, y, cBasaltLight);
            else if (x === x0 + w - 1 || y === y0 + h - 1) P.set(x, y, cBasaltShadow);
            else P.set(x, y, (x + y) % 3 === 0 ? cBasaltMid : cBasaltBase);
          }
        }
      }
      for (let y = 20; y <= 58; y++) {
        for (let x = 22; x <= 57; x++) P.set(x, y, cBasaltBase);
      }
      for (let y = 22; y <= 57; y += 5) {
        const shift = Math.floor((y - 22) / 5) % 2 === 0 ? 0 : 4;
        for (let x = 22; x <= 57; x += 8) {
          if (x + shift + 7 <= 57) block(x + shift, y, 7, 4);
        }
      }
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
      const merlons = [[[4, 9], [12, 16], [19, 24]], [[55, 60], [63, 67], [70, 75]]];
      for (const group of merlons) {
        for (const [x1, x2] of group) {
          for (let x = x1; x <= x2; x++) {
            P.set(x, 10, cBasaltRim);
            P.set(x, 11, cBasaltLight);
            for (let y = 12; y <= 16; y++) {
              P.set(x, y, x === x1 ? cBasaltLight : x === x2 ? cBasaltShadow : cBasaltMid);
            }
          }
        }
      }
      for (let x = 4; x <= 24; x++) P.set(x, 17, cBasaltLight);
      for (let x = 55; x <= 75; x++) P.set(x, 17, cBasaltLight);
      const midM = [[26, 30], [35, 40], [45, 50]];
      for (const [x1, x2] of midM) {
        for (let x = x1; x <= x2; x++) {
          P.set(x, 18, cBasaltRim);
          P.set(x, 19, cBasaltLight);
          P.set(x, 20, cBasaltMid);
        }
      }
      for (let x = 25; x <= 54; x++) P.set(x, 23, cBasaltLight);
      function arrowslit(cx, cy, h) {
        for (let dy = 0; dy < h; dy++) {
          P.set(cx - 1, cy + dy, cMortar);
          P.set(cx, cy + dy, dy === 0 ? cLavaGlow : dy === h - 1 ? cLavaDark : cLavaMid);
          P.set(cx + 1, cy + dy, cMortar);
        }
      }
      arrowslit(14, 25, 7);
      arrowslit(14, 40, 6);
      arrowslit(65, 25, 7);
      arrowslit(65, 40, 6);
      arrowslit(34, 29, 5);
      arrowslit(45, 29, 5);
      for (let y = 38; y <= 58; y++) {
        for (let x = 32; x <= 47; x++) {
          const dx = (x - 39.5) / 7.5;
          const dy = (y - 45) / 7;
          const isArch = y <= 45 && dx * dx + dy * dy <= 1 || y > 45 && x >= 33 && x <= 46;
          const isDoor = y <= 45 && dx * dx * 1.5 + dy * dy * 1.5 <= 1 || y > 45 && x >= 35 && x <= 44;
          if (isArch && !isDoor) {
            P.set(x, y, y === 38 || x === 33 || x === 46 ? cBasaltRim : cBasaltLight);
          } else if (isDoor) {
            const isIronStrap = y === 44 || y === 51;
            P.set(x, y, isIronStrap ? cIron : x % 3 === 0 ? cWoodDark : cWoodMid);
            if (y === 58) P.set(x, y, cLavaMid);
          }
        }
      }
      for (const tx of [29, 50]) {
        P.set(tx, 44, cIron);
        P.set(tx, 45, cIron);
        P.set(tx, 43, pack("#451a03"));
        P.set(tx, 42, cLavaMid);
        P.set(tx, 41, cLavaGlow);
        P.set(tx, 40, pack("#ffffff"));
      }
      outline(P, cEdge);
      return P.canvas();
    }
    function paintAetherObelisk() {
      const W = 36, H = 68;
      const P = Pix(W, H);
      const cStepBase = pack("#334155");
      const cStepMid = pack("#475569");
      const cStepTop = pack("#64748b");
      const cMarbleLit = pack("#cbd5e1");
      const cMarbleHighlight = pack("#f1f5f9");
      const cEdge = pack("#090d16");
      const cCrysShadow = pack("#0369a1");
      const cCrysMid = pack("#0284c7");
      const cCrysLit = pack("#38bdf8");
      const cCrysBright = pack("#7dd3fc");
      const cCrysSpecular = pack("#ffffff");
      const cRuneGlow = pack("#c084fc");
      const cRuneCore = pack("#f472b6");
      for (let y = 58; y <= 64; y++) {
        for (let x = 4; x <= 31; x++) {
          P.set(x, y, y === 58 ? cMarbleHighlight : x <= 6 ? cStepTop : x >= 29 ? cStepBase : cStepMid);
        }
      }
      for (let y = 52; y <= 58; y++) {
        for (let x = 7; x <= 28; x++) {
          P.set(x, y, y === 52 ? cMarbleHighlight : x <= 9 ? cMarbleLit : x >= 26 ? cStepMid : cStepTop);
        }
      }
      for (let y = 46; y <= 52; y++) {
        for (let x = 10; x <= 25; x++) {
          P.set(x, y, y === 46 ? cMarbleHighlight : x <= 12 ? cMarbleLit : x >= 23 ? cStepMid : cMarbleLit);
        }
      }
      for (let y = 8; y <= 46; y++) {
        const p = (y - 8) / 38;
        const halfW = Math.round(1 + p * 8);
        const cx = 17;
        for (let x = cx - halfW; x <= cx + halfW; x++) {
          const isSpine = x === cx;
          const isLeft = x < cx;
          const distFromCenter = Math.abs(x - cx);
          let col;
          if (isSpine) {
            col = y % 4 === 0 ? cCrysSpecular : cCrysBright;
          } else if (isLeft) {
            col = distFromCenter <= Math.round(halfW * 0.5) ? cCrysBright : cCrysLit;
          } else {
            col = distFromCenter <= Math.round(halfW * 0.5) ? cCrysMid : cCrysShadow;
          }
          const isRuneY = y === 18 || y === 26 || y === 34 || y === 40;
          if (isRuneY && distFromCenter <= 2) {
            col = distFromCenter === 0 ? cRuneCore : cRuneGlow;
          }
          P.set(x, y, col);
        }
      }
      P.set(17, 3, cCrysSpecular);
      P.set(16, 4, cCrysBright);
      P.set(17, 4, cCrysSpecular);
      P.set(18, 4, cCrysMid);
      P.set(17, 5, cCrysLit);
      outline(P, cEdge);
      return P.canvas();
    }
    function paintBrazier() {
      const P = Pix(24, 30);
      const cIronDark = pack("#090d16");
      const cIron = pack("#1e293b");
      const cIronMid = pack("#334155");
      const cIronLight = pack("#64748b");
      const cCoal = pack("#450a0a");
      const cEmber = pack("#b91c1c");
      const cFlame1 = pack("#dc2626");
      const cFlame2 = pack("#f97316");
      const cFlame3 = pack("#fde047");
      const cFlameCore = pack("#ffffff");
      const cEdge = pack("#05070a");
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
      for (let y = 14; y <= 19; y++) {
        const t = (y - 14) / 5;
        const w = Math.round(8 - t * 4);
        for (let x = 11 - w; x <= 12 + w; x++) {
          let col = y === 14 ? cIronLight : x < 11 ? cIronMid : x > 13 ? cIronDark : cIron;
          if (y === 15 && x >= 7 && x <= 16) col = (x + y) % 2 === 0 ? cEmber : cCoal;
          P.set(x, y, col);
        }
      }
      const flameRows = [
        { y: 13, xMin: 6, xMax: 17, col: cFlame2 },
        { y: 12, xMin: 7, xMax: 16, col: cFlame2 },
        { y: 11, xMin: 8, xMax: 15, col: cFlame3 },
        { y: 10, xMin: 8, xMax: 15, col: cFlame3 },
        { y: 9, xMin: 9, xMax: 14, col: cFlameCore },
        { y: 8, xMin: 9, xMax: 14, col: cFlameCore },
        { y: 7, xMin: 10, xMax: 13, col: cFlame3 },
        { y: 6, xMin: 10, xMax: 13, col: cFlame2 },
        { y: 5, xMin: 11, xMax: 12, col: cFlame1 }
      ];
      for (const row of flameRows) {
        for (let x = row.xMin; x <= row.xMax; x++) {
          P.set(x, row.y, row.col);
        }
      }
      P.set(7, 10, cFlame1);
      P.set(16, 10, cFlame1);
      P.set(8, 7, cFlame2);
      P.set(15, 7, cFlame2);
      outline(P, cEdge);
      return P.canvas();
    }
    function paintPalmTree() {
      const P = Pix(38, 48);
      const cTrunk = pack("#78350f");
      const cTrunkDark = pack("#451a03");
      const cFrond = pack("#16a34a");
      const cFrondLight = pack("#4ade80");
      const cEdge = pack("#090d16");
      for (let y = 18; y <= 45; y++) {
        const curve = Math.round(Math.sin((y - 18) / 27 * Math.PI) * 5);
        const cx = 19 + curve;
        for (let x = cx - 2; x <= cx + 2; x++) {
          P.set(x, y, y % 3 === 0 ? cTrunkDark : cTrunk);
        }
      }
      const fronds = [
        [-14, -8],
        [14, -8],
        [-12, 6],
        [12, 6],
        [0, -12],
        [-8, -4],
        [8, -4]
      ];
      for (const [fx, fy] of fronds) {
        for (let i = 0; i <= 12; i++) {
          const px = Math.round(19 + fx * i / 12);
          const py = Math.round(18 + fy * i / 12 + i * i / 24);
          P.set(px, py, cFrond);
          P.set(px, py - 1, cFrondLight);
        }
      }
      outline(P, cEdge);
      return P.canvas();
    }
    function paintFountain() {
      const W = 40, H = 34;
      const P = Pix(W, H);
      const cStoneRim = pack("#64748b");
      const cStoneDark = pack("#334155");
      const cStoneLight = pack("#cbd5e1");
      const cWaterDeep = pack("#0284c7");
      const cWaterMid = pack("#38bdf8");
      const cWaterLit = pack("#7dd3fc");
      const cWaterFoam = pack("#e0f2fe");
      const cEdge = pack("#090d16");
      const cx = 20, cy = 20;
      for (let y = 8; y <= 30; y++) {
        for (let x = 4; x <= 36; x++) {
          const dx = (x - cx) / 15;
          const dy = (y - cy) / 10;
          const d = dx * dx + dy * dy;
          if (d > 1) continue;
          if (d > 0.72) {
            P.set(x, y, y < cy ? cStoneLight : x > cx ? cStoneDark : cStoneRim);
          } else {
            const r = Math.sin(x * 0.8 + y * 0.8) * 0.5 + 0.5;
            let col = d < 0.25 ? cWaterLit : r > 0.6 ? cWaterMid : cWaterDeep;
            P.set(x, y, col);
          }
        }
      }
      for (let y = 10; y <= 20; y++) {
        P.set(cx - 2, y, cStoneLight);
        P.set(cx - 1, y, cStoneRim);
        P.set(cx, y, cStoneRim);
        P.set(cx + 1, y, cStoneDark);
      }
      for (let x = cx - 4; x <= cx + 4; x++) {
        P.set(x, 10, cStoneLight);
      }
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
    function paintMushrooms() {
      const P = Pix(26, 28);
      const cStem = pack("#cbd5e1");
      const cCap = pack("#a855f7");
      const cCapLight = pack("#c084fc");
      const cDots = pack("#38bdf8");
      const cEdge = pack("#090d16");
      for (let y = 14; y <= 26; y++) {
        P.set(10, y, cStem);
        P.set(11, y, cStem);
        P.set(17, y + 2, cStem);
      }
      for (let y = 6; y <= 14; y++) {
        const span = Math.round((y - 6) / 8 * 8);
        for (let x = 11 - span; x <= 11 + span; x++) {
          P.set(x, y, x % 3 === 0 && y % 3 === 0 ? cDots : y <= 8 ? cCapLight : cCap);
        }
      }
      outline(P, cEdge);
      return P.canvas();
    }
    function paintChest(isOpen = false) {
      const P = Pix(26, 24);
      const cWood = pack("#78350f");
      const cWoodDark = pack("#451a03");
      const cGold = pack("#facc15");
      const cGoldLight = pack("#fde047");
      const cGemRed = pack("#ef4444");
      const cGemCyan = pack("#38bdf8");
      const cInside = pack("#18181b");
      const cEdge = pack("#090d16");
      if (!isOpen) {
        for (let y = 8; y <= 21; y++) {
          for (let x = 3; x <= 22; x++) {
            const isGoldTrim = x === 3 || x === 22 || x === 9 || x === 16 || y === 8 || y === 14 || y === 21;
            P.set(x, y, isGoldTrim ? cGold : y % 2 === 0 ? cWoodDark : cWood);
          }
        }
        for (let y = 13; y <= 16; y++) {
          for (let x = 12; x <= 14; x++) P.set(x, y, cGoldLight);
        }
        P.set(13, 14, cEdge);
      } else {
        for (let y = 11; y <= 22; y++) {
          for (let x = 3; x <= 22; x++) {
            const isGoldTrim = x === 3 || x === 22 || y === 22;
            P.set(x, y, isGoldTrim ? cGold : cWoodDark);
          }
        }
        for (let y = 8; y <= 13; y++) {
          for (let x = 5; x <= 20; x++) {
            const r = hash(x, y, 77);
            P.set(x, y, r < 0.25 ? cGemRed : r < 0.5 ? cGemCyan : r < 0.8 ? cGold : cGoldLight);
          }
        }
        for (let y = 2; y <= 8; y++) {
          for (let x = 4; x <= 21; x++) {
            P.set(x, y, x === 4 || x === 21 || y === 2 ? cGold : cWood);
          }
        }
      }
      outline(P, cEdge);
      return P.canvas();
    }
    function paintRunicPillar(isLit = false) {
      const P = Pix(20, 38);
      const cStone = pack("#475569");
      const cStoneLight = pack("#64748b");
      const cRuneGlow = pack(isLit ? "#38bdf8" : "#334155");
      const cRuneBright = pack(isLit ? "#ffffff" : "#475569");
      const cEdge = pack("#090d16");
      for (let y = 6; y <= 34; y++) {
        for (let x = 4; x <= 15; x++) {
          P.set(x, y, x === 4 || x === 15 ? cStone : cStoneLight);
        }
      }
      for (let y of [12, 18, 24, 30]) {
        P.set(9, y, cRuneBright);
        P.set(10, y, cRuneBright);
        P.set(8, y - 1, cRuneGlow);
        P.set(11, y - 1, cRuneGlow);
      }
      outline(P, cEdge);
      return P.canvas();
    }
    function paintWaypointPortal() {
      const P = Pix(28, 24);
      const cStoneDark = pack("#1e293b");
      const cStoneMid = pack("#334155");
      const cStoneLight = pack("#64748b");
      const cRuneCyan = pack("#0284c7");
      const cRuneBright = pack("#38bdf8");
      const cCrystalCore = pack("#ffffff");
      const cCrystalCyan = pack("#7dd3fc");
      const cEdge = pack("#090d16");
      const cx = 14, cy = 15, rx = 12, ry = 7;
      for (let y = 0; y < 24; y++) {
        for (let x = 0; x < 28; x++) {
          const dx = (x - cx) / rx;
          const dy = (y - cy) / ry;
          const d = dx * dx + dy * dy;
          if (d <= 1) {
            if (d > 0.72) {
              P.set(x, y, y > cy ? cStoneDark : cStoneMid);
            } else if (d > 0.38) {
              const angle = Math.atan2(y - cy, x - cx);
              const isRune = Math.sin(angle * 6) > 0.2;
              P.set(x, y, isRune ? cRuneBright : cRuneCyan);
            } else {
              P.set(x, y, d > 0.15 ? cRuneBright : cStoneLight);
            }
          }
        }
      }
      const cry = [
        { x: 14, y: 3, col: cCrystalCore },
        { x: 13, y: 4, col: cCrystalCore },
        { x: 14, y: 4, col: cCrystalCore },
        { x: 15, y: 4, col: cCrystalCore },
        { x: 12, y: 5, col: cCrystalCyan },
        { x: 13, y: 5, col: cCrystalCore },
        { x: 14, y: 5, col: cCrystalCore },
        { x: 15, y: 5, col: cCrystalCyan },
        { x: 12, y: 6, col: cRuneCyan },
        { x: 13, y: 6, col: cCrystalCyan },
        { x: 14, y: 6, col: cCrystalCore },
        { x: 15, y: 6, col: cCrystalCyan },
        { x: 16, y: 6, col: cRuneCyan },
        { x: 13, y: 7, col: cCrystalCyan },
        { x: 14, y: 7, col: cCrystalCore },
        { x: 15, y: 7, col: cCrystalCyan },
        { x: 14, y: 8, col: cRuneBright }
      ];
      for (const pt of cry) {
        P.set(pt.x, pt.y, pt.col);
      }
      outline(P, cEdge);
      return P.canvas();
    }
    function paintMiningNode(oreType = "copper") {
      const P = Pix(22, 18);
      const cStoneDark = pack("#1e293b");
      const cStoneMid = pack("#334155");
      const cStoneLight = pack("#64748b");
      const cEdge = pack("#090d16");
      let cOreDark, cOreBright, cOreShine;
      if (oreType === "iron") {
        cOreDark = pack("#64748b");
        cOreBright = pack("#cbd5e1");
        cOreShine = pack("#ffffff");
      } else if (oreType === "obsidian") {
        cOreDark = pack("#3b0764");
        cOreBright = pack("#9333ea");
        cOreShine = pack("#e9d5ff");
      } else {
        cOreDark = pack("#9a3412");
        cOreBright = pack("#f97316");
        cOreShine = pack("#ffedd5");
      }
      for (let y = 3; y <= 15; y++) {
        for (let x = 2; x <= 19; x++) {
          const nx = (x - 10.5) / 8.5;
          const ny = (y - 9.5) / 6;
          if (nx * nx + ny * ny <= 1) {
            P.set(x, y, y > 11 ? cStoneDark : x < 10 ? cStoneLight : cStoneMid);
          }
        }
      }
      const oreSpots = [
        { x: 7, y: 7, col: cOreShine },
        { x: 8, y: 7, col: cOreBright },
        { x: 8, y: 8, col: cOreDark },
        { x: 13, y: 6, col: cOreShine },
        { x: 14, y: 6, col: cOreBright },
        { x: 13, y: 7, col: cOreBright },
        { x: 10, y: 11, col: cOreBright },
        { x: 11, y: 11, col: cOreShine },
        { x: 11, y: 12, col: cOreDark },
        { x: 6, y: 12, col: cOreBright },
        { x: 16, y: 10, col: cOreBright }
      ];
      for (const spot of oreSpots) {
        P.set(spot.x, spot.y, spot.col);
      }
      outline(P, cEdge);
      return P.canvas();
    }
    function paintLotus() {
      const P = Pix(20, 16);
      const cLeafDark = pack("#14532d");
      const cLeaf = pack("#16a34a");
      const cPetalDark = pack("#0284c7");
      const cPetalLight = pack("#38bdf8");
      const cPetalCore = pack("#ffffff");
      const cStamen = pack("#fde047");
      const cEdge = pack("#022c22");
      for (let y = 9; y <= 14; y++) {
        for (let x = 2; x <= 17; x++) {
          const dx = (x - 9.5) / 7.5;
          const dy = (y - 11.5) / 2.8;
          if (dx * dx + dy * dy <= 1) {
            P.set(x, y, x === 10 && y === 12 ? 0 : y > 12 ? cLeafDark : cLeaf);
          }
        }
      }
      const petals = [
        { x: 9, y: 4, col: cPetalCore },
        { x: 10, y: 4, col: cPetalCore },
        { x: 8, y: 5, col: cPetalLight },
        { x: 9, y: 5, col: cPetalCore },
        { x: 10, y: 5, col: cPetalCore },
        { x: 11, y: 5, col: cPetalLight },
        { x: 7, y: 6, col: cPetalDark },
        { x: 8, y: 6, col: cPetalLight },
        { x: 9, y: 6, col: cStamen },
        { x: 10, y: 6, col: cStamen },
        { x: 11, y: 6, col: cPetalLight },
        { x: 12, y: 6, col: cPetalDark },
        { x: 6, y: 7, col: cPetalDark },
        { x: 7, y: 7, col: cPetalLight },
        { x: 8, y: 7, col: cPetalLight },
        { x: 11, y: 7, col: cPetalLight },
        { x: 12, y: 7, col: cPetalLight },
        { x: 13, y: 7, col: cPetalDark },
        { x: 8, y: 8, col: cPetalDark },
        { x: 9, y: 8, col: cPetalLight },
        { x: 10, y: 8, col: cPetalLight },
        { x: 11, y: 8, col: cPetalDark }
      ];
      for (const pt of petals) {
        P.set(pt.x, pt.y, pt.col);
      }
      outline(P, cEdge);
      return P.canvas();
    }
    function paintSunSpur() {
      const P = Pix(18, 22);
      const cStemDark = pack("#78350f");
      const cStem = pack("#d97706");
      const cStemLight = pack("#f59e0b");
      const cBloomDark = pack("#ea580c");
      const cBloomLight = pack("#facc15");
      const cBloomCore = pack("#ffffff");
      const cEdge = pack("#451a03");
      for (let y = 8; y <= 19; y++) {
        for (let x = 7; x <= 10; x++) {
          P.set(x, y, x === 7 ? cStemDark : x === 8 ? cStem : cStemLight);
        }
      }
      P.set(5, 11, cStemLight);
      P.set(6, 12, cStem);
      P.set(12, 14, cStemLight);
      P.set(11, 15, cStem);
      P.set(5, 17, cStemLight);
      P.set(6, 17, cStem);
      const bloom = [
        { x: 8, y: 3, col: cBloomCore },
        { x: 9, y: 3, col: cBloomCore },
        { x: 7, y: 4, col: cBloomLight },
        { x: 8, y: 4, col: cBloomCore },
        { x: 9, y: 4, col: cBloomCore },
        { x: 10, y: 4, col: cBloomLight },
        { x: 6, y: 5, col: cBloomDark },
        { x: 7, y: 5, col: cBloomLight },
        { x: 8, y: 5, col: cBloomLight },
        { x: 9, y: 5, col: cBloomLight },
        { x: 10, y: 5, col: cBloomLight },
        { x: 11, y: 5, col: cBloomDark },
        { x: 7, y: 6, col: cBloomDark },
        { x: 8, y: 6, col: cBloomLight },
        { x: 9, y: 6, col: cBloomLight },
        { x: 10, y: 6, col: cBloomDark },
        { x: 8, y: 7, col: cBloomDark },
        { x: 9, y: 7, col: cBloomDark }
      ];
      for (const b of bloom) {
        P.set(b.x, b.y, b.col);
      }
      outline(P, cEdge);
      return P.canvas();
    }
    function paintAetherGeode() {
      const P = Pix(22, 22);
      const cRockDark = pack("#0f172a");
      const cRockMid = pack("#1e293b");
      const cCryDark = pack("#0284c7");
      const cCryBright = pack("#38bdf8");
      const cCryShine = pack("#7dd3fc");
      const cCryCore = pack("#ffffff");
      const cEdge = pack("#020617");
      for (let y = 6; y <= 18; y++) {
        for (let x = 3; x <= 18; x++) {
          const nx = (x - 10.5) / 7.5;
          const ny = (y - 12) / 6;
          if (nx * nx + ny * ny <= 1) {
            P.set(x, y, y > 14 || x < 7 ? cRockDark : cRockMid);
          }
        }
      }
      const crystals = [
        { x: 10, y: 3, col: cCryCore },
        { x: 9, y: 4, col: cCryBright },
        { x: 10, y: 4, col: cCryCore },
        { x: 11, y: 4, col: cCryBright },
        { x: 8, y: 5, col: cCryDark },
        { x: 9, y: 5, col: cCryBright },
        { x: 10, y: 5, col: cCryShine },
        { x: 11, y: 5, col: cCryBright },
        { x: 13, y: 5, col: cCryCore },
        { x: 14, y: 5, col: cCryShine },
        { x: 8, y: 6, col: cCryDark },
        { x: 9, y: 6, col: cCryBright },
        { x: 10, y: 6, col: cCryBright },
        { x: 12, y: 6, col: cCryDark },
        { x: 13, y: 6, col: cCryBright },
        { x: 14, y: 6, col: cCryCore },
        { x: 9, y: 7, col: cCryDark },
        { x: 10, y: 7, col: cCryBright },
        { x: 11, y: 7, col: cCryBright },
        { x: 13, y: 7, col: cCryBright },
        { x: 10, y: 8, col: cCryDark },
        { x: 11, y: 8, col: cCryDark }
      ];
      for (const c of crystals) {
        P.set(c.x, c.y, c.col);
      }
      outline(P, cEdge);
      return P.canvas();
    }
    function paintDepletedNode() {
      const P = Pix(20, 14);
      const cDust = pack("#334155");
      const cCrag = pack("#475569");
      const cHole = pack("#0f172a");
      const cEdge = pack("#090d16");
      for (let y = 3; y <= 11; y++) {
        for (let x = 2; x <= 17; x++) {
          const nx = (x - 9.5) / 7.5;
          const ny = (y - 7) / 4;
          if (nx * nx + ny * ny <= 1) {
            const isHole = x >= 7 && x <= 12 && y >= 5 && y <= 8;
            P.set(x, y, isHole ? cHole : y > 8 ? cDust : cCrag);
          }
        }
      }
      outline(P, cEdge);
      return P.canvas();
    }
    const WORLD_ASSET_PATHS = {
      tree: "assets/sprites/world/tree_oak.png",
      tree_gold: "assets/sprites/world/tree_oak_gold.png",
      tree_teal: "assets/sprites/world/tree_oak_teal.png",
      pine: "assets/sprites/world/tree_pine.png",
      pine_large: "assets/sprites/world/tree_pine_large.png",
      cactus: "assets/sprites/world/tree_cactus.png",
      palm_tree: "assets/sprites/world/tree_palm.png",
      house_red: "assets/sprites/world/house_red.png",
      house_red_small: "assets/sprites/world/house_red_small.png",
      house_dark_volcano: "assets/sprites/world/house_dark_volcano.png",
      house_dark_volcano_small: "assets/sprites/world/house_dark_volcano_small.png",
      house_blue: "assets/sprites/world/house_blue.png",
      house_blue_small: "assets/sprites/world/house_blue_small.png",
      cabin_wood: "assets/sprites/world/cabin_wood.png",
      cabin_wood_small: "assets/sprites/world/cabin_wood_small.png",
      cabin_snow: "assets/sprites/world/cabin_snow.png",
      water_mill: "assets/sprites/world/water_mill.png",
      fort_volcano: "assets/sprites/world/fort_volcano.png",
      tent_desert: "assets/sprites/world/tent_desert.png",
      rock: "assets/sprites/world/rock.png",
      sand_rock: "assets/sprites/world/sand_rock.png",
      volcano_rock: "assets/sprites/world/volcano_rock.png",
      glowing_mushrooms: "assets/sprites/world/glowing_mushrooms.png",
      well: "assets/sprites/world/well.png",
      brazier_fire: "assets/sprites/world/brazier_fire.png",
      lamppost: "assets/sprites/world/lamppost.png",
      fountain: "assets/sprites/world/fountain.png"
    };
    const worldImages = {};
    if (typeof Image !== "undefined") {
      for (const [k, src] of Object.entries(WORLD_ASSET_PATHS)) {
        const img = new Image();
        img.src = src;
        worldImages[k] = img;
      }
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
        const img = worldImages[type];
        if (img && img.complete && img.naturalWidth > 0) {
          return img;
        }
        if (!propCache.has(type)) {
          if (type === "tree" || type === "tree_gold" || type === "tree_teal") propCache.set(type, paintTree());
          else if (type === "pine" || type === "pine_large") propCache.set(type, paintPine());
          else if (type === "cactus") propCache.set(type, paintCactus());
          else if (type === "volcano_rock") propCache.set(type, paintVolcanoRock());
          else if (type === "sand_rock") propCache.set(type, paintRock("sand"));
          else if (type === "rock") propCache.set(type, paintRock("slate"));
          else if (type === "house_red" || type === "house_red_small") propCache.set(type, paintHouse("red"));
          else if (type === "house_blue" || type === "house_blue_small") propCache.set(type, paintHouse("blue"));
          else if (type === "house_dark_volcano" || type === "house_dark_volcano_small") propCache.set(type, paintHouse("blue"));
          else if (type === "well") propCache.set(type, paintWell());
          else if (type === "lamppost") propCache.set(type, paintLamppost());
          else if (type === "blacksmith_npc") propCache.set(type, paintBlacksmith());
          else if (type === "water_mill") propCache.set(type, paintWaterMill());
          else if (type === "tent_desert") propCache.set(type, paintDesertTent());
          else if (type === "cabin_snow") propCache.set(type, paintSnowCabin());
          else if (type === "cabin_wood" || type === "cabin_wood_small") propCache.set(type, paintWoodCabin());
          else if (type === "fort_volcano") propCache.set(type, paintVolcanoFort());
          else if (type === "aether_obelisk") propCache.set(type, paintAetherObelisk());
          else if (type === "brazier_fire") propCache.set(type, paintBrazier());
          else if (type === "palm_tree") propCache.set(type, paintPalmTree());
          else if (type === "fountain") propCache.set(type, paintFountain());
          else if (type === "glowing_mushrooms") propCache.set(type, paintMushrooms());
          else if (type === "chest_closed") propCache.set(type, paintChest(false));
          else if (type === "chest_open") propCache.set(type, paintChest(true));
          else if (type === "runic_pillar") propCache.set(type, paintRunicPillar(false));
          else if (type === "runic_pillar_lit") propCache.set(type, paintRunicPillar(true));
          else if (type === "waypoint_portal") propCache.set(type, paintWaypointPortal());
          else if (type === "node_copper") propCache.set(type, paintMiningNode("copper"));
          else if (type === "node_iron") propCache.set(type, paintMiningNode("iron"));
          else if (type === "node_obsidian") propCache.set(type, paintMiningNode("obsidian"));
          else if (type === "node_lotus") propCache.set(type, paintLotus());
          else if (type === "node_sun") propCache.set(type, paintSunSpur());
          else if (type === "node_geode") propCache.set(type, paintAetherGeode());
          else if (type === "node_depleted") propCache.set(type, paintDepletedNode());
        }
        return propCache.get(type);
      }
    };
  })();

  // src/core/sprites.js
  var Sprites = (() => {
    const PX = 2;
    const cache = /* @__PURE__ */ new Map();
    const ASSETS = {
      // Eroi (3 frame x 4 direzioni)
      hero_hunter: "assets/sprites/hero/hero_hunter.png",
      hero_spartan: "assets/sprites/hero/hero_spartan.png",
      hero_pirate: "assets/sprites/hero/hero_pirate.png",
      hero_adventurer: "assets/sprites/hero/hero_adventurer.png",
      hero_knight: "assets/sprites/hero/hero_knight.png",
      hero_mage: "assets/sprites/hero/hero_mage.png",
      // Fabbri NPC dei 6 Villaggi
      bs_citadel: "assets/sprites/npcs/blacksmith_thorgar.png",
      bs_waterfall: "assets/sprites/npcs/blacksmith_ronald.png",
      bs_frostpeak: "assets/sprites/npcs/blacksmith_vorn.png",
      bs_oasis: "assets/sprites/npcs/blacksmith_rashid.png",
      bs_cineris: "assets/sprites/npcs/blacksmith_ignis.png",
      bs_sylva: "assets/sprites/npcs/blacksmith_elora.png",
      // Scheletro Guardiano (Skeleton01)
      skel_walk: "assets/sprites/skeleton/skel_walk.png",
      skel_idle: "assets/sprites/skeleton/skel_idle.png",
      skel_die: "assets/sprites/skeleton/skel_die.png",
      skel_attack: "assets/sprites/skeleton/skel_attack.png",
      // Orco Guerriero (Orc01)
      orc_front_walk: "assets/sprites/orc/orc_front_walk.png",
      orc_front_idle: "assets/sprites/orc/orc_front_idle.png",
      orc_front_die: "assets/sprites/orc/orc_front_die.png",
      // Pipistrello dell'Ombra (Bat01)
      bat_front_walk: "assets/sprites/bat/bat_front_walk.png",
      bat_front_idle: "assets/sprites/bat/bat_front_idle.png",
      bat_front_die: "assets/sprites/bat/bat_front_die.png"
    };
    const HERO_SKINS = [
      {
        id: "hero_hunter",
        name: "Cacciatore Silvano",
        role: "Ranger & Tracciatore",
        desc: "Maestro delle foreste ancestrali con cappuccio silvano, corazza di cuoio rinforzato e stivali da boscaiolo. Letale e silenzioso.",
        icon: "\u{1F3F9}",
        themeColor: "#22c55e"
      },
      {
        id: "hero_spartan",
        name: "Guerriero Spartano",
        role: "Oplita di Sparta",
        desc: "Indomito guerriero con elmo corinzio a cresta cremisi, corazza anatomica di bronzo lucido, mantello scarlatto e schinieri dorati.",
        icon: "\u{1F6E1}\uFE0F",
        themeColor: "#ef4444"
      },
      {
        id: "hero_pirate",
        name: "Corsaro dei Sette Mari",
        role: "Navigatore & Predone",
        desc: "Capitano temerario con tricorno da corsaro piumato, benda nera sull'occhio, giubba navale blu con bottoni dorati e fascia cremisi.",
        icon: "\u2693",
        themeColor: "#38bdf8"
      },
      {
        id: "hero_adventurer",
        name: "Viandante dell'Aether",
        role: "Esploratore dei Portali",
        desc: "Il leggendario viandante con mantello cremisi e chioma fulva, pronto a svelare i segreti delle 5 terre elementali.",
        icon: "\u{1F9ED}",
        themeColor: "#f59e0b"
      },
      {
        id: "hero_knight",
        name: "Cavaliere d'Argento",
        role: "Paladino Reale",
        desc: "Guardia d'\xE9lite della Cittadella protetta da una pesante armatura d'argento lucente e celata temprata.",
        icon: "\u2694\uFE0F",
        themeColor: "#e2e8f0"
      },
      {
        id: "hero_mage",
        name: "Arcanista di Cineris",
        role: "Mago Elementale",
        desc: "Studioso delle rune cosmiche avvolto in vesti ametista e cappuccio impregnato di polvere di mana puro.",
        icon: "\u{1F52E}",
        themeColor: "#a855f7"
      }
    ];
    const images = {};
    let assetsLoaded = false;
    function loadAssets() {
      if (typeof Image === "undefined") return;
      let pending = Object.keys(ASSETS).length;
      for (const [key, src] of Object.entries(ASSETS)) {
        const img = new Image();
        img.src = src;
        img.onload = () => {
          pending--;
          if (pending <= 0) assetsLoaded = true;
        };
        img.onerror = () => {
          pending--;
        };
        images[key] = img;
      }
    }
    loadAssets();
    function isReady(key) {
      const img = images[key];
      return img && img.complete && img.naturalWidth > 0;
    }
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
    function drawShadow(ctx, x, y, radius = 7) {
      ctx.save();
      ctx.fillStyle = "rgba(10, 15, 26, 0.22)";
      ctx.beginPath();
      ctx.ellipse(Math.round(x), Math.round(y), Math.round(radius * 1.3), Math.round(radius * 0.52), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    function drawHero(ctx, x, y, dir, isWalking, frame, weapon = "staff", animTimer = 0, skin = "hero_hunter") {
      const skinKey = skin && isReady(skin) ? skin : isReady("hero_hunter") ? "hero_hunter" : isReady("hero_adventurer") ? "hero_adventurer" : null;
      if (skinKey) {
        const img = images[skinKey];
        let row = 0;
        if (dir === 4 || dir === 3 || dir === 5) row = 3;
        else if (dir === 2 || dir === 1) row = 2;
        else if (dir === 6 || dir === 7) row = 1;
        else row = 0;
        let col = 1;
        let bob = 0;
        if (isWalking) {
          const walkCycle = [1, 0, 1, 2];
          const step = Math.floor(animTimer * 1.5) % 4;
          col = walkCycle[step];
          bob = (col === 1 ? -1 : 0) * PX;
        } else {
          bob = Math.round(Math.sin(animTimer * 2.5) * 0.5 * PX);
        }
        const sw = 16;
        const sh = 20;
        const dw = 16 * PX;
        const dh = 20 * PX;
        const dx = Math.round(x - dw / 2);
        const dy = Math.round(y - dh + 2) + bob;
        if (row === 3) {
          drawEquippedWeapon(ctx, x, y, dir, row, weapon, bob, true);
        }
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, col * sw, row * sh, sw, sh, dx, dy, dw, dh);
        ctx.restore();
        if (row !== 3) {
          drawEquippedWeapon(ctx, x, y, dir, row, weapon, bob, false);
        }
        return;
      }
      const fb = renderHeroFrame(dir, isWalking, frame, weapon);
      ctx.drawImage(fb, Math.round(x - fb.width / 2), Math.round(y - fb.height + 2));
    }
    function drawHeroPreview(ctx, x, y, skinId, frame = 1, dir = 0, scale = 2) {
      const skinKey = skinId && isReady(skinId) ? skinId : isReady("hero_hunter") ? "hero_hunter" : "hero_adventurer";
      if (!isReady(skinKey)) return;
      const img = images[skinKey];
      let row = 0;
      if (dir === 4 || dir === 3 || dir === 5) row = 3;
      else if (dir === 2 || dir === 1) row = 2;
      else if (dir === 6 || dir === 7) row = 1;
      else row = 0;
      const col = frame % 3;
      const sw = 16;
      const sh = 20;
      const dw = 16 * scale;
      const dh = 20 * scale;
      const dx = Math.round(x - dw / 2);
      const dy = Math.round(y - dh / 2);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, col * sw, row * sh, sw, sh, dx, dy, dw, dh);
      ctx.restore();
    }
    function drawEquippedWeapon(ctx, x, y, dir, row, weapon, bob = 0, isBehind = false) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      let handX, handY;
      if (row === 0) {
        handX = Math.round(x + 5 * PX);
        handY = Math.round(y - 8 * PX + bob);
      } else if (row === 1) {
        handX = Math.round(x - 5 * PX);
        handY = Math.round(y - 7 * PX + bob);
      } else if (row === 2) {
        handX = Math.round(x + 5 * PX);
        handY = Math.round(y - 7 * PX + bob);
      } else {
        handX = Math.round(x + 5 * PX);
        handY = Math.round(y - 9 * PX + bob);
      }
      if (weapon === "sword") {
        ctx.fillStyle = "#b45309";
        ctx.fillRect(handX - 1 * PX, handY + 1 * PX, 2 * PX, 2 * PX);
        ctx.fillStyle = "#f59e0b";
        ctx.fillRect(handX - 2 * PX, handY, 4 * PX, 1 * PX);
        ctx.fillStyle = "#94a3b8";
        ctx.fillRect(handX - 1 * PX, handY - 5 * PX, 2 * PX, 5 * PX);
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(handX, handY - 5 * PX, 1 * PX, 5 * PX);
      } else if (weapon === "bow") {
        ctx.fillStyle = "#78350f";
        ctx.fillRect(handX, handY - 4 * PX, 1 * PX, 8 * PX);
        ctx.fillRect(handX + (row === 1 ? -1 * PX : 1 * PX), handY - 5 * PX, 1 * PX, 2 * PX);
        ctx.fillRect(handX + (row === 1 ? -1 * PX : 1 * PX), handY + 3 * PX, 1 * PX, 2 * PX);
        ctx.fillStyle = "rgba(241, 245, 249, 0.75)";
        ctx.fillRect(handX + (row === 1 ? 1 * PX : -1 * PX), handY - 4 * PX, 1, 8 * PX);
      } else {
        ctx.fillStyle = "#451a03";
        ctx.fillRect(handX, handY - 6 * PX, 1 * PX, 9 * PX);
        ctx.fillStyle = "#78350f";
        ctx.fillRect(handX, handY - 5 * PX, 1 * PX, 7 * PX);
        ctx.fillStyle = "#0284c7";
        ctx.fillRect(handX - 1 * PX, handY - 8 * PX, 3 * PX, 2 * PX);
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(handX, handY - 8 * PX, 1 * PX, 2 * PX);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(handX, handY - 7 * PX, 1 * PX, 1 * PX);
      }
      ctx.restore();
    }
    function drawSkeleton(ctx, x, y, dir, isWalking, frame, isDying = false, deathTimer = 0, deathMaxTimer = 0.36, animTimer = 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      drawShadow(ctx, x, y, 7);
      if (isDying && isReady("skel_die")) {
        const img = images["skel_die"];
        const p = 1 - Math.max(0, deathTimer / deathMaxTimer);
        const frameIdx = Math.min(5, Math.floor(p * 6));
        const sw = 48, sh = 48;
        const dw = 48, dh = 48;
        ctx.globalAlpha = Math.max(0.1, 1 - p * 0.9);
        ctx.drawImage(img, frameIdx * sw, 0, sw, sh, Math.round(x - dw / 2), Math.round(y - 37), dw, dh);
        ctx.restore();
        return;
      }
      const isFacingWest = dir === 5 || dir === 6 || dir === 7;
      const imgKey = isWalking ? "skel_walk" : "skel_idle";
      if (isReady(imgKey)) {
        const img = images[imgKey];
        const maxFrames = isWalking ? 8 : 5;
        const frameIdx = Math.floor(animTimer * (isWalking ? 1.6 : 1)) % maxFrames;
        const sw = 48, sh = 48;
        const dw = 48, dh = 48;
        const dx = Math.round(x - dw / 2);
        const dy = Math.round(y - 37);
        if (isFacingWest) {
          ctx.translate(Math.round(x), 0);
          ctx.scale(-1, 1);
          ctx.drawImage(img, frameIdx * sw, 0, sw, sh, -Math.round(dw / 2), dy, dw, dh);
        } else {
          ctx.drawImage(img, frameIdx * sw, 0, sw, sh, dx, dy, dw, dh);
        }
        ctx.restore();
        return;
      }
      ctx.restore();
      const fb = renderSkeletonFrame(dir, isWalking, frame);
      ctx.drawImage(fb, Math.round(x - fb.width / 2), Math.round(y - fb.height + 2));
    }
    function drawOrc(ctx, x, y, dir, isWalking, frame, isDying = false, deathTimer = 0, deathMaxTimer = 0.45, animTimer = 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      drawShadow(ctx, x, y, 9);
      if (isDying && isReady("orc_front_die")) {
        const img = images["orc_front_die"];
        const p = 1 - Math.max(0, deathTimer / deathMaxTimer);
        const frameIdx = Math.min(5, Math.floor(p * 6));
        const sw = 48, sh = 48;
        const dw = 48, dh = 48;
        ctx.globalAlpha = Math.max(0.1, 1 - p * 0.9);
        ctx.drawImage(img, frameIdx * sw, 0, sw, sh, Math.round(x - dw / 2), Math.round(y - 37), dw, dh);
        ctx.restore();
        return;
      }
      const imgKey = isWalking ? "orc_front_walk" : "orc_front_idle";
      if (isReady(imgKey)) {
        const img = images[imgKey];
        const maxFrames = isWalking ? 10 : 6;
        const frameIdx = Math.floor(animTimer * (isWalking ? 1.8 : 1)) % maxFrames;
        const sw = 48, sh = 48;
        const dw = 48, dh = 48;
        const isFacingWest = dir === 5 || dir === 6 || dir === 7;
        if (isFacingWest) {
          ctx.translate(Math.round(x), 0);
          ctx.scale(-1, 1);
          ctx.drawImage(img, frameIdx * sw, 0, sw, sh, -Math.round(dw / 2), Math.round(y - 37), dw, dh);
        } else {
          ctx.drawImage(img, frameIdx * sw, 0, sw, sh, Math.round(x - dw / 2), Math.round(y - 37), dw, dh);
        }
        ctx.restore();
        return;
      }
      ctx.restore();
    }
    function drawBat(ctx, x, y, dir, isWalking, frame, isDying = false, deathTimer = 0, deathMaxTimer = 0.3, animTimer = 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      drawShadow(ctx, x, y, 5);
      const bob = Math.round(Math.sin(animTimer * 7) * 3);
      const flyY = y - 14 + bob;
      if (isDying && isReady("bat_front_die")) {
        const img = images["bat_front_die"];
        const p = 1 - Math.max(0, deathTimer / deathMaxTimer);
        const frameIdx = Math.min(10, Math.floor(p * 11));
        const sw = 32, sh = 32;
        ctx.globalAlpha = Math.max(0.1, 1 - p);
        ctx.drawImage(img, frameIdx * sw, 0, sw, sh, Math.round(x - 16), Math.round(flyY - 16), 32, 32);
        ctx.restore();
        return;
      }
      const imgKey = isWalking ? "bat_front_walk" : "bat_front_idle";
      if (isReady(imgKey)) {
        const img = images[imgKey];
        const maxFrames = isWalking ? 4 : 8;
        const frameIdx = Math.floor(animTimer * 6) % maxFrames;
        const sw = 32, sh = 32;
        ctx.drawImage(img, frameIdx * sw, 0, sw, sh, Math.round(x - 16), Math.round(flyY - 16), 32, 32);
        ctx.restore();
        return;
      }
      ctx.restore();
    }
    function drawBlacksmithNPC(ctx, x, y, bsId = "bs_citadel", playerX = 0, playerY = 0, animTimer = 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      const imgKey = bsId || "bs_citadel";
      const distToPlayer = Math.hypot(playerX - x, playerY - y);
      drawShadow(ctx, x + 3 * PX, y, 7);
      drawShadow(ctx, x - 10 * PX, y, 6);
      let row = 0;
      if (distToPlayer < 85) {
        const dx = playerX - x;
        const dy = playerY - y;
        if (Math.abs(dx) > Math.abs(dy)) {
          row = dx > 0 ? 2 : 1;
        } else {
          row = dy > 0 ? 0 : 3;
        }
      } else {
        row = 1;
      }
      if (isReady(imgKey)) {
        const img = images[imgKey];
        const isHammering = distToPlayer >= 85;
        const hammerCycle = [1, 0, 1, 2];
        const col = isHammering ? hammerCycle[Math.floor(animTimer * 2) % 4] : 1;
        const sw = 16, sh = 20;
        const dw = 16 * PX, dh = 20 * PX;
        const fx = Math.round(x - dw / 2 + 3 * PX);
        const fy = Math.round(y - dh + 2);
        ctx.drawImage(img, col * sw, row * sh, sw, sh, fx, fy, dw, dh);
        if (isHammering && col === 2 && Math.random() < 0.25) {
          ctx.fillStyle = "#fde047";
          ctx.fillRect(Math.round(x - 9 * PX), Math.round(y - 7 * PX), 2 * PX, 2 * PX);
          ctx.fillStyle = "#f97316";
          ctx.fillRect(Math.round(x - 8 * PX), Math.round(y - 9 * PX), 1.5 * PX, 1.5 * PX);
        }
      }
      const anvilX = Math.round(x - 14 * PX);
      const anvilY = Math.round(y - 8 * PX);
      const anvilW = 10 * PX;
      const anvilH = 8 * PX;
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(anvilX - 1, anvilY - 1, anvilW + 2, anvilH + 2);
      ctx.fillStyle = "#475569";
      ctx.fillRect(anvilX, anvilY, anvilW, anvilH);
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(anvilX + 1 * PX, anvilY + 1 * PX, anvilW - 2 * PX, 2 * PX);
      ctx.fillStyle = "#334155";
      ctx.fillRect(anvilX + 3 * PX, anvilY + 3 * PX, 4 * PX, anvilH - 3 * PX);
      ctx.fillStyle = "#f97316";
      ctx.fillRect(anvilX + 2 * PX, anvilY + 1 * PX, 6 * PX, 1.5 * PX);
      ctx.fillStyle = "#fde047";
      ctx.fillRect(anvilX + 3 * PX, anvilY + 1 * PX, 3 * PX, 1 * PX);
      const tagW = 66;
      const tagH = 15;
      const tagY = Math.round(y - 48);
      ctx.fillStyle = "rgba(15, 23, 42, 0.65)";
      ctx.fillRect(Math.round(x - tagW / 2), tagY, tagW, tagH);
      ctx.strokeStyle = "rgba(245, 158, 11, 0.65)";
      ctx.lineWidth = 1;
      ctx.strokeRect(Math.round(x - tagW / 2), tagY, tagW, tagH);
      ctx.font = "500 10px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#fde047";
      ctx.fillText("\u{1F528} Fabbro [E]", Math.round(x), tagY + 11);
      ctx.restore();
    }
    function renderBossMagmaFrame(animTimer) {
      const w = 32 * PX, h = 32 * PX;
      const { canvas, ctx } = createOffscreen(w, h);
      const cx = Math.floor(w / 2);
      const cy = h - 2 * PX;
      const bob = Math.round(Math.sin(animTimer * 3) * 1 * PX);
      ctx.fillStyle = "#09090b";
      ctx.fillRect(cx - 7 * PX, cy - 3 * PX, 5 * PX, 3 * PX);
      ctx.fillRect(cx + 2 * PX, cy - 3 * PX, 5 * PX, 3 * PX);
      ctx.fillStyle = "#ea580c";
      ctx.fillRect(cx - 6 * PX, cy - 1 * PX, 3 * PX, 1 * PX);
      ctx.fillRect(cx + 3 * PX, cy - 1 * PX, 3 * PX, 1 * PX);
      ctx.fillStyle = "#18181b";
      ctx.fillRect(cx - 6 * PX, cy - 8 * PX + bob, 4 * PX, 6 * PX);
      ctx.fillRect(cx + 2 * PX, cy - 8 * PX + bob, 4 * PX, 6 * PX);
      ctx.fillStyle = "#09090b";
      ctx.fillRect(cx - 9 * PX, cy - 18 * PX + bob, 18 * PX, 11 * PX);
      ctx.fillStyle = "#27272a";
      ctx.fillRect(cx - 8 * PX, cy - 17 * PX + bob, 16 * PX, 9 * PX);
      ctx.fillStyle = "#7f1d1d";
      ctx.fillRect(cx - 4 * PX, cy - 15 * PX + bob, 8 * PX, 6 * PX);
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(cx - 3 * PX, cy - 14 * PX + bob, 6 * PX, 4 * PX);
      ctx.fillStyle = "#fde047";
      ctx.fillRect(cx - 1 * PX, cy - 13 * PX + bob, 2 * PX, 2 * PX);
      ctx.fillStyle = "#18181b";
      ctx.fillRect(cx - 11 * PX, cy - 18 * PX + bob, 4 * PX, 6 * PX);
      ctx.fillRect(cx + 7 * PX, cy - 18 * PX + bob, 4 * PX, 6 * PX);
      ctx.fillStyle = "#f97316";
      ctx.fillRect(cx - 11 * PX, cy - 14 * PX + bob, 2 * PX, 3 * PX);
      ctx.fillRect(cx + 9 * PX, cy - 14 * PX + bob, 2 * PX, 3 * PX);
      ctx.fillStyle = "#27272a";
      ctx.fillRect(cx - 12 * PX, cy - 13 * PX + bob, 3 * PX, 8 * PX);
      ctx.fillRect(cx + 9 * PX, cy - 13 * PX + bob, 3 * PX, 8 * PX);
      ctx.fillStyle = "#ea580c";
      ctx.fillRect(cx - 12 * PX, cy - 7 * PX + bob, 3 * PX, 3 * PX);
      ctx.fillRect(cx + 9 * PX, cy - 7 * PX + bob, 3 * PX, 3 * PX);
      ctx.fillStyle = "#09090b";
      ctx.fillRect(cx - 5 * PX, cy - 25 * PX + bob, 10 * PX, 8 * PX);
      ctx.fillStyle = "#18181b";
      ctx.fillRect(cx - 4 * PX, cy - 24 * PX + bob, 8 * PX, 6 * PX);
      ctx.fillStyle = "#fde047";
      ctx.fillRect(cx - 3 * PX, cy - 22 * PX + bob, 2 * PX, 2 * PX);
      ctx.fillRect(cx + 1 * PX, cy - 22 * PX + bob, 2 * PX, 2 * PX);
      ctx.fillStyle = "#7f1d1d";
      ctx.fillRect(cx - 7 * PX, cy - 28 * PX + bob, 3 * PX, 5 * PX);
      ctx.fillRect(cx + 4 * PX, cy - 28 * PX + bob, 3 * PX, 5 * PX);
      ctx.fillStyle = "#ea580c";
      ctx.fillRect(cx - 8 * PX, cy - 30 * PX + bob, 3 * PX, 3 * PX);
      ctx.fillRect(cx + 5 * PX, cy - 30 * PX + bob, 3 * PX, 3 * PX);
      ctx.fillStyle = "#fde047";
      ctx.fillRect(cx - 8 * PX, cy - 31 * PX + bob, 2 * PX, 2 * PX);
      ctx.fillRect(cx + 6 * PX, cy - 31 * PX + bob, 2 * PX, 2 * PX);
      return canvas;
    }
    function renderBossGolemFrame(animTimer) {
      const w = 32 * PX, h = 32 * PX;
      const { canvas, ctx } = createOffscreen(w, h);
      const cx = Math.floor(w / 2);
      const cy = h - 2 * PX;
      const bob = Math.round(Math.sin(animTimer * 2.5) * 1 * PX);
      ctx.fillStyle = "#334155";
      ctx.fillRect(cx - 7 * PX, cy - 3 * PX, 5 * PX, 3 * PX);
      ctx.fillRect(cx + 2 * PX, cy - 3 * PX, 5 * PX, 3 * PX);
      ctx.fillStyle = "#475569";
      ctx.fillRect(cx - 6 * PX, cy - 8 * PX + bob, 4 * PX, 6 * PX);
      ctx.fillRect(cx + 2 * PX, cy - 8 * PX + bob, 4 * PX, 6 * PX);
      ctx.fillStyle = "#334155";
      ctx.fillRect(cx - 9 * PX, cy - 18 * PX + bob, 18 * PX, 11 * PX);
      ctx.fillStyle = "#64748b";
      ctx.fillRect(cx - 8 * PX, cy - 17 * PX + bob, 16 * PX, 9 * PX);
      ctx.fillStyle = "#0284c7";
      ctx.fillRect(cx - 4 * PX, cy - 15 * PX + bob, 8 * PX, 5 * PX);
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(cx - 3 * PX, cy - 14 * PX + bob, 6 * PX, 3 * PX);
      ctx.fillStyle = "#e0f2fe";
      ctx.fillRect(cx - 1 * PX, cy - 13 * PX + bob, 2 * PX, 2 * PX);
      ctx.fillStyle = "#bae6fd";
      ctx.fillRect(cx - 11 * PX, cy - 20 * PX + bob, 3 * PX, 8 * PX);
      ctx.fillRect(cx + 8 * PX, cy - 20 * PX + bob, 3 * PX, 8 * PX);
      ctx.fillStyle = "#e0f2fe";
      ctx.fillRect(cx - 10 * PX, cy - 22 * PX + bob, 2 * PX, 3 * PX);
      ctx.fillRect(cx + 8 * PX, cy - 22 * PX + bob, 2 * PX, 3 * PX);
      ctx.fillStyle = "#475569";
      ctx.fillRect(cx - 12 * PX, cy - 13 * PX + bob, 3 * PX, 8 * PX);
      ctx.fillRect(cx + 9 * PX, cy - 13 * PX + bob, 3 * PX, 8 * PX);
      ctx.fillStyle = "#334155";
      ctx.fillRect(cx - 5 * PX, cy - 25 * PX + bob, 10 * PX, 8 * PX);
      ctx.fillStyle = "#64748b";
      ctx.fillRect(cx - 4 * PX, cy - 24 * PX + bob, 8 * PX, 6 * PX);
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(cx - 3 * PX, cy - 22 * PX + bob, 6 * PX, 2 * PX);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(cx - 1 * PX, cy - 22 * PX + bob, 2 * PX, 2 * PX);
      ctx.fillStyle = "#cbd5e1";
      ctx.fillRect(cx - 4 * PX, cy - 27 * PX + bob, 8 * PX, 3 * PX);
      ctx.fillStyle = "#e0f2fe";
      ctx.fillRect(cx - 3 * PX, cy - 28 * PX + bob, 6 * PX, 2 * PX);
      return canvas;
    }
    function renderBossDuneFrame(animTimer) {
      const w = 32 * PX, h = 32 * PX;
      const { canvas, ctx } = createOffscreen(w, h);
      const cx = Math.floor(w / 2);
      const cy = h - 2 * PX;
      const bob = Math.round(Math.sin(animTimer * 2.5) * 1 * PX);
      ctx.fillStyle = "#78350f";
      ctx.fillRect(cx - 7 * PX, cy - 3 * PX, 5 * PX, 3 * PX);
      ctx.fillRect(cx + 2 * PX, cy - 3 * PX, 5 * PX, 3 * PX);
      ctx.fillStyle = "#b45309";
      ctx.fillRect(cx - 6 * PX, cy - 8 * PX + bob, 4 * PX, 6 * PX);
      ctx.fillRect(cx + 2 * PX, cy - 8 * PX + bob, 4 * PX, 6 * PX);
      ctx.fillStyle = "#78350f";
      ctx.fillRect(cx - 9 * PX, cy - 18 * PX + bob, 18 * PX, 11 * PX);
      ctx.fillStyle = "#d97706";
      ctx.fillRect(cx - 8 * PX, cy - 17 * PX + bob, 16 * PX, 9 * PX);
      ctx.fillStyle = "#f59e0b";
      ctx.fillRect(cx - 4 * PX, cy - 15 * PX + bob, 8 * PX, 5 * PX);
      ctx.fillStyle = "#fde047";
      ctx.fillRect(cx - 2 * PX, cy - 14 * PX + bob, 4 * PX, 3 * PX);
      ctx.fillStyle = "#92400e";
      ctx.fillRect(cx - 11 * PX, cy - 18 * PX + bob, 4 * PX, 6 * PX);
      ctx.fillRect(cx + 7 * PX, cy - 18 * PX + bob, 4 * PX, 6 * PX);
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(cx - 10 * PX, cy - 16 * PX + bob, 2 * PX, 3 * PX);
      ctx.fillRect(cx + 8 * PX, cy - 16 * PX + bob, 2 * PX, 3 * PX);
      ctx.fillStyle = "#b45309";
      ctx.fillRect(cx - 12 * PX, cy - 13 * PX + bob, 3 * PX, 8 * PX);
      ctx.fillRect(cx + 9 * PX, cy - 13 * PX + bob, 3 * PX, 8 * PX);
      ctx.fillStyle = "#facc15";
      ctx.fillRect(cx - 14 * PX, cy - 11 * PX + bob, 3 * PX, 6 * PX);
      ctx.fillRect(cx + 11 * PX, cy - 11 * PX + bob, 3 * PX, 6 * PX);
      ctx.fillStyle = "#78350f";
      ctx.fillRect(cx - 5 * PX, cy - 25 * PX + bob, 10 * PX, 8 * PX);
      ctx.fillStyle = "#d97706";
      ctx.fillRect(cx - 4 * PX, cy - 24 * PX + bob, 8 * PX, 6 * PX);
      ctx.fillStyle = "#fde047";
      ctx.fillRect(cx - 3 * PX, cy - 22 * PX + bob, 6 * PX, 2 * PX);
      ctx.fillStyle = "#f59e0b";
      ctx.fillRect(cx - 4 * PX, cy - 27 * PX + bob, 8 * PX, 3 * PX);
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(cx - 2 * PX, cy - 29 * PX + bob, 4 * PX, 3 * PX);
      return canvas;
    }
    function renderBossTreantFrame(animTimer) {
      const w = 32 * PX, h = 32 * PX;
      const { canvas, ctx } = createOffscreen(w, h);
      const cx = Math.floor(w / 2);
      const cy = h - 2 * PX;
      const bob = Math.round(Math.sin(animTimer * 2) * 1 * PX);
      ctx.fillStyle = "#271202";
      ctx.fillRect(cx - 7 * PX, cy - 3 * PX, 5 * PX, 3 * PX);
      ctx.fillRect(cx + 2 * PX, cy - 3 * PX, 5 * PX, 3 * PX);
      ctx.fillStyle = "#451a03";
      ctx.fillRect(cx - 9 * PX, cy - 18 * PX + bob, 18 * PX, 16 * PX);
      ctx.fillStyle = "#78350f";
      ctx.fillRect(cx - 8 * PX, cy - 17 * PX + bob, 16 * PX, 14 * PX);
      ctx.fillStyle = "#166534";
      ctx.fillRect(cx - 6 * PX, cy - 14 * PX + bob, 4 * PX, 6 * PX);
      ctx.fillRect(cx + 2 * PX, cy - 15 * PX + bob, 5 * PX, 7 * PX);
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(cx - 1 * PX, cy - 12 * PX + bob, 2 * PX, 4 * PX);
      ctx.fillStyle = "#451a03";
      ctx.fillRect(cx - 12 * PX, cy - 14 * PX + bob, 3 * PX, 8 * PX);
      ctx.fillRect(cx + 9 * PX, cy - 14 * PX + bob, 3 * PX, 8 * PX);
      ctx.fillStyle = "#16a34a";
      ctx.fillRect(cx - 13 * PX, cy - 8 * PX + bob, 4 * PX, 4 * PX);
      ctx.fillRect(cx + 9 * PX, cy - 8 * PX + bob, 4 * PX, 4 * PX);
      ctx.fillStyle = "#14532d";
      ctx.fillRect(cx - 4 * PX, cy - 21 * PX + bob, 3 * PX, 3 * PX);
      ctx.fillRect(cx + 1 * PX, cy - 21 * PX + bob, 3 * PX, 3 * PX);
      ctx.fillStyle = "#4ade80";
      ctx.fillRect(cx - 3 * PX, cy - 20 * PX + bob, 2 * PX, 2 * PX);
      ctx.fillRect(cx + 2 * PX, cy - 20 * PX + bob, 2 * PX, 2 * PX);
      ctx.fillStyle = "#15803d";
      ctx.fillRect(cx - 10 * PX, cy - 29 * PX + bob, 20 * PX, 9 * PX);
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(cx - 8 * PX, cy - 31 * PX + bob, 16 * PX, 5 * PX);
      ctx.fillStyle = "#86efac";
      ctx.fillRect(cx - 4 * PX, cy - 31 * PX + bob, 8 * PX, 2 * PX);
      return canvas;
    }
    function drawBoss(ctx, enemy, dt = 0) {
      const animTimer = enemy.animTimer || Date.now() / 1e3;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      drawShadow(ctx, enemy.x, enemy.y, 11);
      let bossCanvas;
      const kind = enemy.kind;
      const cacheKey = `boss_${kind}_${Math.floor(animTimer * 2) % 2}`;
      if (!cache.has(cacheKey)) {
        if (kind === "boss_magma") {
          bossCanvas = renderBossMagmaFrame(animTimer);
        } else if (kind === "boss_golem") {
          bossCanvas = renderBossGolemFrame(animTimer);
        } else if (kind === "boss_scorpion") {
          bossCanvas = renderBossDuneFrame(animTimer);
        } else {
          bossCanvas = renderBossTreantFrame(animTimer);
        }
        cache.set(cacheKey, bossCanvas);
      } else {
        bossCanvas = cache.get(cacheKey);
      }
      const bw = bossCanvas.width;
      const bh = bossCanvas.height;
      ctx.drawImage(bossCanvas, Math.round(enemy.x - bw / 2), Math.round(enemy.y - bh + 4));
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
      let sx = 0, sy = 0, yOff = 0;
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
    function getSlimeSprite(type, frame) {
      const key = `slime_${type}_${frame}`;
      if (!cache.has(key)) {
        cache.set(key, renderSlimeFrame(type, frame));
      }
      return cache.get(key);
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
      ctx.lineTo(cx + 3 * PX, cy);
      ctx.lineTo(cx, cy - 1 * PX);
      ctx.lineTo(cx - 3 * PX, cy);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = cBright;
      ctx.fillRect(cx - 1 * PX, cy - 3 * PX, 2 * PX, 3 * PX);
      return canvas;
    }
    function getGemSprite(color, frame = 0) {
      const key = `gem_${color}_${frame}`;
      if (!cache.has(key)) {
        cache.set(key, renderGemFrame(color, frame));
      }
      return cache.get(key);
    }
    const PALETTE = {
      outline: "#090d16",
      cloakMain: "#312e81",
      skin: "#fde047"
    };
    function renderHeroFrame(dir, isWalking, frameIndex, weapon = "staff") {
      const w = 16 * PX;
      const h = 20 * PX;
      const { canvas, ctx } = createOffscreen(w, h);
      const cx = Math.floor(w / 2);
      const cy = Math.floor(h / 2);
      ctx.fillStyle = PALETTE.outline;
      ctx.fillRect(cx - 4 * PX, cy - 8 * PX, 8 * PX, 16 * PX);
      ctx.fillStyle = PALETTE.cloakMain;
      ctx.fillRect(cx - 3 * PX, cy - 7 * PX, 6 * PX, 14 * PX);
      ctx.fillStyle = PALETTE.skin;
      ctx.fillRect(cx - 2 * PX, cy - 6 * PX, 4 * PX, 4 * PX);
      return canvas;
    }
    function renderSkeletonFrame(dir, isWalking, frameIndex) {
      const w = 24 * PX;
      const h = 28 * PX;
      const { canvas, ctx } = createOffscreen(w, h);
      const cx = Math.floor(w / 2);
      const cy = Math.floor(h / 2);
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(cx - 4 * PX, cy - 10 * PX, 8 * PX, 18 * PX);
      ctx.fillStyle = "#cbd5e1";
      ctx.fillRect(cx - 3 * PX, cy - 9 * PX, 6 * PX, 16 * PX);
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(cx - 2 * PX, cy - 7 * PX, 2, 2);
      ctx.fillRect(cx + 1 * PX, cy - 7 * PX, 2, 2);
      return canvas;
    }
    function getHeroSprite(dir, isWalking, frame, weapon = "staff") {
      const key = `hero_${weapon}_${dir}_${isWalking ? 1 : 0}_${frame}`;
      if (!cache.has(key)) {
        const { canvas, ctx } = createOffscreen(32, 40);
        drawHero(ctx, 16, 38, dir, isWalking, frame, weapon, 0);
        cache.set(key, canvas);
      }
      return cache.get(key);
    }
    function getSkeletonSprite(dir, isWalking, frame) {
      const key = `skel_${dir}_${isWalking ? 1 : 0}_${frame}`;
      if (!cache.has(key)) {
        const { canvas, ctx } = createOffscreen(48, 48);
        drawSkeleton(ctx, 24, 37, dir, isWalking, frame, false, 0, 0.36, 0);
        cache.set(key, canvas);
      }
      return cache.get(key);
    }
    return {
      PX,
      dirFromAngle,
      drawShadow,
      drawHero,
      drawHeroPreview,
      HERO_SKINS,
      getSkins: () => HERO_SKINS,
      getHeroSprite,
      drawSkeleton,
      getSkeletonSprite,
      drawOrc,
      drawBat,
      drawBoss,
      drawBlacksmithNPC,
      getSlimeSprite,
      getGemSprite,
      loadAssets
    };
  })();

  // src/core/fx.js
  var FX = /* @__PURE__ */ (() => {
    const particles = [];
    const shockwaves = [];
    const slashCuts = [];
    const bones = [];
    const damageTexts = [];
    return {
      showDamageNumbers: true,
      showSparks: true,
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
        if (this.showSparks !== false) {
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
        }
        if (this.showDamageNumbers !== false) {
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
        }
        ctx.restore();
      }
    };
  })();

  // src/core/crafting.js
  var MATERIALS_DEF = {
    // --- MINERALI E LINGOTTI ---
    copper_ore: {
      id: "copper_ore",
      name: "Minerale di Rame",
      icon: "\u{1FAA8}",
      category: "mineral",
      desc: "Minerale grezzo ramato estratto dai filoni rocciosi del bosco e delle rive fluviali.",
      color: "#f97316",
      rarity: "Comune",
      sellValue: 4
    },
    iron_ore: {
      id: "iron_ore",
      name: "Minerale di Ferro",
      icon: "\u26CF\uFE0F",
      category: "mineral",
      desc: "Ferro grezzo denso e pesante estratto dalle scogliere montane e dalle gole desertiche.",
      color: "#94a3b8",
      rarity: "Comune",
      sellValue: 8
    },
    obsidian_ore: {
      id: "obsidian_ore",
      name: "Ossidiana Vulcanica",
      icon: "\u{1F311}",
      category: "mineral",
      desc: "Vetro vulcanico magmatico nerastro carico di calore e durezza titanica.",
      color: "#7c3aed",
      rarity: "Raro",
      sellValue: 20
    },
    copper_bar: {
      id: "copper_bar",
      name: "Lingotto di Bronzo Antico",
      icon: "\u{1F9F1}",
      category: "mineral",
      desc: "Lingotto raffinato alla fonderia, perfetto per finiture e leghe flessibili.",
      color: "#ea580c",
      rarity: "Comune",
      sellValue: 18
    },
    iron_scrap: {
      id: "iron_scrap",
      name: "Metallo Temprato",
      icon: "\u2699\uFE0F",
      category: "mineral",
      desc: "Lingotti e piastre di metallo purificato usati per forgiare armi e armature indistruttibili.",
      color: "#cbd5e1",
      rarity: "Non Comune",
      sellValue: 30
    },
    obsidian_bar: {
      id: "obsidian_bar",
      name: "Lingotto d'Ossidiana",
      icon: "\u{1F52E}",
      category: "mineral",
      desc: "Lega vulcanica purificata nel crogiolo magmatico, resistente a temperature estreme.",
      color: "#a855f7",
      rarity: "Raro",
      sellValue: 65
    },
    // --- LEGNAME E FIBRE ---
    ancient_wood: {
      id: "ancient_wood",
      name: "Legno di Quercia Antica",
      icon: "\u{1FAB5}",
      category: "wood_fiber",
      desc: "Tronchi nobili e stagionati abbattuti dalle foreste secolari di Sylva.",
      color: "#b45309",
      rarity: "Comune",
      sellValue: 5
    },
    frost_pine_wood: {
      id: "frost_pine_wood",
      name: "Abete del Permafrost",
      icon: "\u{1F332}",
      category: "wood_fiber",
      desc: "Legno resiliente impregnato di crio-linfa raccolto sulle vette ghiacciate di Frostpeak.",
      color: "#38bdf8",
      rarity: "Non Comune",
      sellValue: 12
    },
    desert_hardwood: {
      id: "desert_hardwood",
      name: "Legno Fossile del Deserto",
      icon: "\u{1FA93}",
      category: "wood_fiber",
      desc: "Rami fossili induriti da secoli di sole cocente nelle dune dell'Oasi di Al-Zahir.",
      color: "#d97706",
      rarity: "Non Comune",
      sellValue: 15
    },
    river_fiber: {
      id: "river_fiber",
      name: "Fibra di Canapa Fluviale",
      icon: "\u{1F33E}",
      category: "wood_fiber",
      desc: "Fibre tenaci raccolte lungo i canneti e le cascate, usate per corde, archi e fodere.",
      color: "#06b6d4",
      rarity: "Comune",
      sellValue: 6
    },
    // --- ERBE E PIANTE ALCHEMICHE ---
    life_lotus: {
      id: "life_lotus",
      name: "Loto Vitale delle Cascate",
      icon: "\u{1FAB7}",
      category: "herb",
      desc: "Fiore acquatico miracoloso che sboccia sulle rapide. Emana una fragranza che rigenera la linfa vitale.",
      color: "#38bdf8",
      rarity: "Non Comune",
      sellValue: 16
    },
    frost_bloom: {
      id: "frost_bloom",
      name: "Bocciolo di Gelo",
      icon: "\u{1F4A0}",
      category: "herb",
      desc: "Piccolo fiore cristallino che cresce tra la neve eterna, impiegato in amuleti difensivi.",
      color: "#7dd3fc",
      rarity: "Non Comune",
      sellValue: 18
    },
    fire_root: {
      id: "fire_root",
      name: "Radice Magmatica",
      icon: "\u{1F336}\uFE0F",
      category: "herb",
      desc: "Radice ardente che cresce nelle crepe di zolfo, carica di sostanze infiammabili.",
      color: "#ef4444",
      rarity: "Raro",
      sellValue: 28
    },
    // --- TROFEI DI CREATURE E PELLI ---
    slime_gel: {
      id: "slime_gel",
      name: "Gel Silvano",
      icon: "\u{1F9EA}",
      category: "trophy",
      desc: "Materia gelatinosa pura raccolta dagli Slime del Bosco.",
      color: "#22c55e",
      rarity: "Comune",
      sellValue: 6
    },
    ancient_bone: {
      id: "ancient_bone",
      name: "Osso Antico",
      icon: "\u{1F9B4}",
      category: "trophy",
      desc: "Resto pietrificato degli scheletri a guardia delle antiche rovine.",
      color: "#cbd5e1",
      rarity: "Comune",
      sellValue: 8
    },
    beast_leather: {
      id: "beast_leather",
      name: "Pelle di Cuoio Lavorata",
      icon: "\u{1F4DC}",
      category: "trophy",
      desc: "Pelli conciate resistenti usate per imbottire armature, impugnature e stivali.",
      color: "#854d0e",
      rarity: "Comune",
      sellValue: 14
    },
    chitin_plate: {
      id: "chitin_plate",
      name: "Scaglia di Carapace",
      icon: "\u{1F6E1}\uFE0F",
      category: "trophy",
      desc: "Guscio chitinoso ultrarigido rilasciato dai mostri delle dune e della caldera.",
      color: "#eab308",
      rarity: "Non Comune",
      sellValue: 22
    },
    // --- GEMME, ESSENZE E CRISTALLI MAGICI ---
    arcane_dust: {
      id: "arcane_dust",
      name: "Polvere Arcana di Riciclo",
      icon: "\u2728",
      category: "magical",
      desc: "Polvere luccicante ottenuta dallo smantellamento di oggetti e materiali alla fucina.",
      color: "#c084fc",
      rarity: "Comune",
      sellValue: 12
    },
    aether_shard: {
      id: "aether_shard",
      name: "Frammento d'Aether Puro",
      icon: "\u{1F48E}",
      category: "magical",
      desc: "Scheggia primordiale di pura energia dimensionale caduta dai cieli dell'Aether.",
      color: "#38bdf8",
      rarity: "Raro",
      sellValue: 45
    },
    ice_crystal: {
      id: "ice_crystal",
      name: "Cristallo Gelido",
      icon: "\u2744\uFE0F",
      category: "magical",
      desc: "Ghiaccio perenne non fondente che brilla sulle vette innevate.",
      color: "#38bdf8",
      rarity: "Non Comune",
      sellValue: 20
    },
    sun_amber: {
      id: "sun_amber",
      name: "Ambra delle Sabbie",
      icon: "\u2600\uFE0F",
      category: "magical",
      desc: "Gemma solare fossilizzata tra le dune ardenti del deserto.",
      color: "#f59e0b",
      rarity: "Non Comune",
      sellValue: 24
    },
    magma_core: {
      id: "magma_core",
      name: "Nucleo di Lava",
      icon: "\u{1F525}",
      category: "magical",
      desc: "Frammento incandescente di roccia e fuoco elementale della caldera.",
      color: "#ef4444",
      rarity: "Raro",
      sellValue: 35
    },
    arcane_rune: {
      id: "arcane_rune",
      name: "Runa Arcana Antica",
      icon: "\u{1F52E}",
      category: "magical",
      desc: "Raro artefatto runico carico di antica magia elementale.",
      color: "#c084fc",
      rarity: "Raro",
      sellValue: 60
    }
  };
  var RESOURCE_NODES_DEF = {
    mining_copper: {
      id: "mining_copper",
      name: "Filone di Rame",
      category: "mining",
      icon: "\u26CF\uFE0F",
      spriteType: "node_copper",
      color: "#f97316",
      harvestDuration: 1.2,
      respawnDuration: 45,
      xpReward: 16,
      drops: [
        { itemId: "copper_ore", count: [2, 3], chance: 1 },
        { itemId: "iron_scrap", count: [1, 1], chance: 0.25 }
      ]
    },
    mining_iron: {
      id: "mining_iron",
      name: "Filone di Ferro",
      category: "mining",
      icon: "\u26CF\uFE0F",
      spriteType: "node_iron",
      color: "#94a3b8",
      harvestDuration: 1.4,
      respawnDuration: 50,
      xpReward: 22,
      drops: [
        { itemId: "iron_ore", count: [2, 4], chance: 1 },
        { itemId: "iron_scrap", count: [1, 2], chance: 0.35 }
      ]
    },
    mining_obsidian: {
      id: "mining_obsidian",
      name: "Giacimento d'Ossidiana",
      category: "mining",
      icon: "\u26CF\uFE0F",
      spriteType: "node_obsidian",
      color: "#a855f7",
      harvestDuration: 1.8,
      respawnDuration: 60,
      xpReward: 35,
      drops: [
        { itemId: "obsidian_ore", count: [2, 3], chance: 1 },
        { itemId: "magma_core", count: [1, 1], chance: 0.3 }
      ]
    },
    tree_ancient: {
      id: "tree_ancient",
      name: "Quercia Antica di Sylva",
      category: "lumberjack",
      icon: "\u{1FA93}",
      spriteType: "tree",
      color: "#b45309",
      harvestDuration: 1.3,
      respawnDuration: 45,
      xpReward: 18,
      drops: [
        { itemId: "ancient_wood", count: [2, 4], chance: 1 },
        { itemId: "slime_gel", count: [1, 2], chance: 0.4 }
      ]
    },
    tree_frost: {
      id: "tree_frost",
      name: "Abete Glaciale",
      category: "lumberjack",
      icon: "\u{1FA93}",
      spriteType: "pine",
      color: "#38bdf8",
      harvestDuration: 1.4,
      respawnDuration: 50,
      xpReward: 24,
      drops: [
        { itemId: "frost_pine_wood", count: [2, 3], chance: 1 },
        { itemId: "ice_crystal", count: [1, 1], chance: 0.35 }
      ]
    },
    plant_lotus: {
      id: "plant_lotus",
      name: "Loto delle Cascate",
      category: "herbalism",
      icon: "\u{1F33F}",
      spriteType: "node_lotus",
      color: "#06b6d4",
      harvestDuration: 0.9,
      respawnDuration: 40,
      xpReward: 18,
      drops: [
        { itemId: "life_lotus", count: [1, 2], chance: 1 },
        { itemId: "river_fiber", count: [2, 3], chance: 0.8 }
      ]
    },
    plant_sun: {
      id: "plant_sun",
      name: "Spina Solare delle Dune",
      category: "herbalism",
      icon: "\u{1F33F}",
      spriteType: "node_sun",
      color: "#f59e0b",
      harvestDuration: 1,
      respawnDuration: 45,
      xpReward: 20,
      drops: [
        { itemId: "desert_hardwood", count: [2, 3], chance: 1 },
        { itemId: "sun_amber", count: [1, 1], chance: 0.35 }
      ]
    },
    geode_aether: {
      id: "geode_aether",
      name: "Monolite d'Aether",
      category: "arcane",
      icon: "\u{1F48E}",
      spriteType: "node_geode",
      color: "#38bdf8",
      harvestDuration: 1.6,
      respawnDuration: 65,
      xpReward: 40,
      drops: [
        { itemId: "aether_shard", count: [2, 3], chance: 1 },
        { itemId: "arcane_rune", count: [1, 1], chance: 0.4 }
      ]
    }
  };
  var EQUIPMENT_DEF = {
    // ==================== CORAZZE / TORACE (Armor) ====================
    armor_novice: {
      id: "armor_novice",
      name: "Giaco del Viandante",
      slot: "armor",
      rarity: "Comune",
      icon: "\u{1F94B}",
      color: "#94a3b8",
      desc: "Corpetto leggero in cuoio e fibre vegetali che assorbe i primi colpi.",
      stats: {
        bonusHp: 30,
        defense: 8
      },
      recipe: {
        gold: 50,
        materials: { beast_leather: 3, ancient_wood: 3 }
      },
      salvage: { gold: 20, materials: { arcane_dust: 2, beast_leather: 1 } }
    },
    armor_iron: {
      id: "armor_iron",
      name: "Corazza a Piastre d'Acciaio",
      slot: "armor",
      rarity: "Non Comune",
      icon: "\u{1F6E1}\uFE0F",
      color: "#22c55e",
      desc: "Solida corazza militare forgiata con placche d'acciaio temprato.",
      stats: {
        bonusHp: 65,
        defense: 20
      },
      recipe: {
        gold: 130,
        materials: { iron_scrap: 6, copper_bar: 4, beast_leather: 3 }
      },
      salvage: { gold: 50, materials: { arcane_dust: 4, iron_scrap: 2 } }
    },
    armor_frost: {
      id: "armor_frost",
      name: "Baluardo del Crio-Acciaio",
      slot: "armor",
      rarity: "Raro",
      icon: "\u2744\uFE0F",
      color: "#38bdf8",
      desc: "Forgiata a Frostpeak. L'acciaio perenne ghiaccia gli attacchi nemici e dona rigenerazione costante.",
      stats: {
        bonusHp: 120,
        defense: 35,
        hpRegen: 1.8
      },
      recipe: {
        gold: 260,
        materials: { iron_scrap: 10, ice_crystal: 4, frost_pine_wood: 5 }
      },
      salvage: { gold: 100, materials: { arcane_dust: 6, ice_crystal: 2 } }
    },
    armor_volcano: {
      id: "armor_volcano",
      name: "Pettorale di Magma della Fenice",
      slot: "armor",
      rarity: "Epico",
      icon: "\u{1F525}",
      color: "#c084fc",
      desc: "Irradia un calore infernale. Riflette 18 danni da scottatura a qualsiasi mostro ti colpisca.",
      stats: {
        bonusHp: 190,
        defense: 52,
        hpRegen: 3.2,
        thorns: 18
      },
      recipe: {
        gold: 440,
        materials: { obsidian_bar: 8, magma_core: 5, arcane_rune: 3 }
      },
      salvage: { gold: 160, materials: { arcane_dust: 10, magma_core: 2 } }
    },
    armor_aether: {
      id: "armor_aether",
      name: "Armatura Celestiale dell'Aether",
      slot: "armor",
      rarity: "Leggendario",
      icon: "\u{1F451}",
      color: "#f59e0b",
      desc: "Artefatto divino forgiato nel cuore della Cittadella. Genera una barriera di luce che dimezza i danni subiti.",
      stats: {
        bonusHp: 300,
        defense: 80,
        hpRegen: 5,
        aetherShield: true
      },
      recipe: {
        gold: 750,
        materials: { obsidian_bar: 12, aether_shard: 8, arcane_rune: 6 }
      },
      salvage: { gold: 300, materials: { arcane_dust: 18, aether_shard: 4 } }
    },
    // ==================== ELMI / CORONE (Helmet) ====================
    helmet_cloth: {
      id: "helmet_cloth",
      name: "Cappuccio del Viandante",
      slot: "helmet",
      rarity: "Comune",
      icon: "\u{1F9E2}",
      color: "#94a3b8",
      desc: "Tessuto traspirante in canapa fluviale che favorisce la concentrazione magica.",
      stats: {
        bonusHp: 15,
        cooldownReduction: 0.05
      },
      recipe: {
        gold: 40,
        materials: { river_fiber: 4, beast_leather: 2 }
      },
      salvage: { gold: 15, materials: { arcane_dust: 2 } }
    },
    helmet_iron: {
      id: "helmet_iron",
      name: "Celata di Ferro delle Guardie",
      slot: "helmet",
      rarity: "Non Comune",
      icon: "\u{1FA96}",
      color: "#22c55e",
      desc: "Protegge la testa con un robusto frontale forgiato a mano.",
      stats: {
        bonusHp: 35,
        defense: 10,
        cooldownReduction: 0.08
      },
      recipe: {
        gold: 110,
        materials: { iron_scrap: 5, ancient_bone: 4 }
      },
      salvage: { gold: 40, materials: { arcane_dust: 3, iron_scrap: 1 } }
    },
    helmet_sylva: {
      id: "helmet_sylva",
      name: "Corona delle Fronde di Sylva",
      slot: "helmet",
      rarity: "Raro",
      icon: "\u{1F33F}",
      color: "#38bdf8",
      desc: "Intrecciata con germogli dell'Albero della Vita, amplifica l'energia dei dardi e degli attacchi.",
      stats: {
        bonusHp: 60,
        cooldownReduction: 0.14,
        bonusDamage: 12
      },
      recipe: {
        gold: 220,
        materials: { ancient_wood: 8, slime_gel: 6, arcane_rune: 2 }
      },
      salvage: { gold: 80, materials: { arcane_dust: 5, arcane_rune: 1 } }
    },
    helmet_archmage: {
      id: "helmet_archmage",
      name: "Diadema dell'Arcimago Ancestrale",
      slot: "helmet",
      rarity: "Epico",
      icon: "\u2728",
      color: "#c084fc",
      desc: "Incastonato con gemme magiche purpuree. Riduce del 22% i tempi di ricarica di ogni incantesimo e arma.",
      stats: {
        bonusHp: 95,
        defense: 24,
        cooldownReduction: 0.22,
        bonusDamage: 24
      },
      recipe: {
        gold: 400,
        materials: { obsidian_bar: 6, sun_amber: 6, arcane_rune: 4 }
      },
      salvage: { gold: 150, materials: { arcane_dust: 8, sun_amber: 2 } }
    },
    helmet_titan: {
      id: "helmet_titan",
      name: "Corona d'Oro del Colosso delle Dune",
      slot: "helmet",
      rarity: "Leggendario",
      icon: "\u2600\uFE0F",
      color: "#f59e0b",
      desc: "La sacra corona della Sfinge. Ricarica le abilit\xE0 all'istante (-30%) e scaglia archi voltaici sui nemici vicini.",
      stats: {
        bonusHp: 160,
        defense: 42,
        cooldownReduction: 0.3,
        bonusDamage: 38,
        chainLightning: true
      },
      recipe: {
        gold: 680,
        materials: { sun_amber: 10, obsidian_bar: 10, arcane_rune: 6 }
      },
      salvage: { gold: 260, materials: { arcane_dust: 16, obsidian_bar: 3 } }
    },
    // ==================== STIVALI / CALZARI (Boots) ====================
    boots_leather: {
      id: "boots_leather",
      name: "Stivali da Cacciatore",
      slot: "boots",
      rarity: "Comune",
      icon: "\u{1F97E}",
      color: "#94a3b8",
      desc: "Calzature da marcia in cuoio che aumentano la velocit\xE0 di corsa.",
      stats: {
        speedMultiplier: 1.08,
        magnetMultiplier: 1.1
      },
      recipe: {
        gold: 45,
        materials: { beast_leather: 4, river_fiber: 2 }
      },
      salvage: { gold: 15, materials: { arcane_dust: 2 } }
    },
    boots_river: {
      id: "boots_river",
      name: "Calzari delle Maree Fluviali",
      slot: "boots",
      rarity: "Non Comune",
      icon: "\u{1F30A}",
      color: "#22c55e",
      desc: "Trattati con oli di loto, ti permettono di correre nei guadi e nell'acqua senza subire alcun rallentamento!",
      stats: {
        speedMultiplier: 1.15,
        ignoreWaterSlow: true,
        bonusHp: 25
      },
      recipe: {
        gold: 120,
        materials: { river_fiber: 6, beast_leather: 4, copper_bar: 3 }
      },
      salvage: { gold: 45, materials: { arcane_dust: 3, copper_bar: 1 } }
    },
    boots_dune: {
      id: "boots_dune",
      name: "Schinieri del Predatore delle Dune",
      slot: "boots",
      rarity: "Raro",
      icon: "\u{1F3DC}\uFE0F",
      color: "#38bdf8",
      desc: "Scattanti e silenziosi: aumentano la velocit\xE0 del 22% e conferiscono il 10% di schivata su ogni colpo subito.",
      stats: {
        speedMultiplier: 1.22,
        dodgeChance: 0.1,
        magnetMultiplier: 1.3
      },
      recipe: {
        gold: 240,
        materials: { sun_amber: 5, beast_leather: 6, ancient_bone: 5 }
      },
      salvage: { gold: 90, materials: { arcane_dust: 5, sun_amber: 1 } }
    },
    boots_hermes: {
      id: "boots_hermes",
      name: "Ali del Vento dell'Aether",
      slot: "boots",
      rarity: "Leggendario",
      icon: "\u{1FABD}",
      color: "#f59e0b",
      desc: "L'eroe fluttua sfiorando il suolo con il +35% di velocit\xE0, +20% di schivata e un raggio magnetico immenso.",
      stats: {
        speedMultiplier: 1.35,
        dodgeChance: 0.2,
        magnetMultiplier: 1.6,
        bonusHp: 65,
        ignoreWaterSlow: true
      },
      recipe: {
        gold: 620,
        materials: { arcane_rune: 6, aether_shard: 8, obsidian_bar: 6 }
      },
      salvage: { gold: 240, materials: { arcane_dust: 15, aether_shard: 3 } }
    },
    // ==================== AMULETI (Amulet) ====================
    amulet_copper: {
      id: "amulet_copper",
      name: "Talismano di Rame dell'Esploratore",
      slot: "amulet",
      rarity: "Comune",
      icon: "\u{1F4FF}",
      color: "#94a3b8",
      desc: "Ciondolo porta-fortuna che incrementa l'oro raccolto dai nemici e forzieri.",
      stats: {
        goldMultiplier: 1.15,
        critChance: 0.03
      },
      recipe: {
        gold: 60,
        materials: { copper_bar: 4, ancient_wood: 4 }
      },
      salvage: { gold: 20, materials: { arcane_dust: 2 } }
    },
    amulet_frost: {
      id: "amulet_frost",
      name: "Pendente del Cristallo Glaciale",
      slot: "amulet",
      rarity: "Raro",
      icon: "\u{1F48E}",
      color: "#38bdf8",
      desc: "Sintonizza la vista del mago per individuare i punti deboli: +8% colpo critico e +14 danno bonus.",
      stats: {
        goldMultiplier: 1.25,
        critChance: 0.08,
        bonusDamage: 14
      },
      recipe: {
        gold: 210,
        materials: { ice_crystal: 5, copper_bar: 5, arcane_rune: 2 }
      },
      salvage: { gold: 75, materials: { arcane_dust: 5, ice_crystal: 1 } }
    },
    amulet_dragon: {
      id: "amulet_dragon",
      name: "Cuore del Drago di Magma",
      slot: "amulet",
      rarity: "Epico",
      icon: "\u{1F409}",
      color: "#c084fc",
      desc: "La furia ardente del vulcano: +15% probabilit\xE0 di colpo critico e moltiplicatore danno critico portato a 2.2x!",
      stats: {
        bonusDamage: 30,
        critChance: 0.15,
        critMultiplier: 2.2,
        hpRegen: 2.2
      },
      recipe: {
        gold: 420,
        materials: { magma_core: 6, obsidian_bar: 6, arcane_rune: 4 }
      },
      salvage: { gold: 160, materials: { arcane_dust: 9, magma_core: 2 } }
    },
    amulet_star: {
      id: "amulet_star",
      name: "Occhio dell'Infinito Aether",
      slot: "amulet",
      rarity: "Leggendario",
      icon: "\u{1F52E}",
      color: "#f59e0b",
      desc: "Il leggendario talismano dei Fondatori: +25% critico, +50% oro e trasforma il 9% dei danni inflitti in guarigione immediata (Furto Vitale)!",
      stats: {
        bonusDamage: 48,
        critChance: 0.25,
        critMultiplier: 2.5,
        goldMultiplier: 1.5,
        lifeSteal: 0.09
      },
      recipe: {
        gold: 720,
        materials: { aether_shard: 10, arcane_rune: 7, magma_core: 6 }
      },
      salvage: { gold: 280, materials: { arcane_dust: 18, aether_shard: 4 } }
    },
    // ==================== ANELLI (Ring) ====================
    ring_iron: {
      id: "ring_iron",
      name: "Fede di Ferro da Battaglia",
      slot: "ring",
      rarity: "Comune",
      icon: "\u{1F48D}",
      color: "#94a3b8",
      desc: "Semplice fascia d'acciaio incisa con rune marziali per rinforzare i colpi.",
      stats: {
        bonusDamage: 8,
        defense: 5
      },
      recipe: {
        gold: 50,
        materials: { iron_scrap: 4, copper_bar: 2 }
      },
      salvage: { gold: 18, materials: { arcane_dust: 2 } }
    },
    ring_amber: {
      id: "ring_amber",
      name: "Anello del Sole d'Oriente",
      slot: "ring",
      rarity: "Non Comune",
      icon: "\u{1F536}",
      color: "#22c55e",
      desc: "L'ambra solare incanalata nell'anello velocizza i riflessi e l'attacco del +10%.",
      stats: {
        bonusDamage: 16,
        attackSpeed: 0.1
      },
      recipe: {
        gold: 130,
        materials: { sun_amber: 4, iron_scrap: 4 }
      },
      salvage: { gold: 45, materials: { arcane_dust: 3, sun_amber: 1 } }
    },
    ring_golem: {
      id: "ring_golem",
      name: "Sigillo del Signore del Gelo",
      slot: "ring",
      rarity: "Raro",
      icon: "\u{1F4A0}",
      color: "#38bdf8",
      desc: "I tuoi attacchi avvolgono i nemici in un gelo penetrante, rallentandoli del 35% per 1.5 secondi.",
      stats: {
        bonusDamage: 25,
        defense: 12,
        slowEnemiesOnHit: 0.35
      },
      recipe: {
        gold: 260,
        materials: { ice_crystal: 6, obsidian_bar: 4, arcane_rune: 2 }
      },
      salvage: { gold: 95, materials: { arcane_dust: 6, ice_crystal: 2 } }
    },
    ring_infernal: {
      id: "ring_infernal",
      name: "Fede dell'Apocalisse Vulcanica",
      slot: "ring",
      rarity: "Epico",
      icon: "\u{1F30B}",
      color: "#c084fc",
      desc: "I mostri sconfitti esplodono in fiamme incandescenti, infliggendo 35 danni ad area a tutti i mostri adiacenti.",
      stats: {
        bonusDamage: 40,
        attackSpeed: 0.18,
        explosionOnKill: 35
      },
      recipe: {
        gold: 450,
        materials: { magma_core: 6, obsidian_bar: 8, arcane_rune: 4 }
      },
      salvage: { gold: 170, materials: { arcane_dust: 10, magma_core: 2 } }
    },
    ring_eternal: {
      id: "ring_eternal",
      name: "Anello dell'Immortalit\xE0 di Thorgar",
      slot: "ring",
      rarity: "Leggendario",
      icon: "\u{1F48D}",
      color: "#f59e0b",
      desc: "Il capolavoro supremo forgiato dal Gran Fabbro Reale. Conferisce vigore sovrumano (+80 HP, +58 Danno, +28 Difesa e rigenerazione perenne).",
      stats: {
        bonusDamage: 58,
        defense: 28,
        attackSpeed: 0.25,
        bonusHp: 80,
        hpRegen: 3.5
      },
      recipe: {
        gold: 780,
        materials: { aether_shard: 10, obsidian_bar: 10, arcane_rune: 8 }
      },
      salvage: { gold: 300, materials: { arcane_dust: 20, obsidian_bar: 4 } }
    }
  };
  var REFINING_RECIPES = [
    {
      id: "refine_copper",
      name: "Fondi Lingotto di Bronzo Antico",
      category: "smelting",
      icon: "\u{1F9F1}",
      cost: { gold: 20, materials: { copper_ore: 3 } },
      output: { itemId: "copper_bar", count: 1 },
      desc: "Fondi 3x Minerale di Rame grezzo alla fonderia per ottenere 1x Lingotto di Bronzo Antico."
    },
    {
      id: "refine_iron",
      name: "Forgia Metallo Temprato",
      category: "smelting",
      icon: "\u2699\uFE0F",
      cost: { gold: 30, materials: { iron_ore: 3 } },
      output: { itemId: "iron_scrap", count: 1 },
      desc: "Purifica 3x Minerale di Ferro grezzo per ottenere 1x Metallo Temprato d'acciaio."
    },
    {
      id: "refine_obsidian",
      name: "Fondi Lingotto d'Ossidiana",
      category: "smelting",
      icon: "\u{1F52E}",
      cost: { gold: 60, materials: { obsidian_ore: 3 } },
      output: { itemId: "obsidian_bar", count: 1 },
      desc: "Lavora 3x Ossidiana Vulcanica nel crogiolo per ottenere 1x Lingotto d'Ossidiana temprata."
    },
    {
      id: "refine_leather",
      name: "Concia Cuoio Lavorato",
      category: "tanning",
      icon: "\u{1F4DC}",
      cost: { gold: 25, materials: { ancient_wood: 3, river_fiber: 2 } },
      output: { itemId: "beast_leather", count: 1 },
      desc: "Tratta le fibre e i tannini di legno antico per confezionare 1x Pelle di Cuoio flessibile."
    },
    {
      id: "refine_rune",
      name: "Sintetizza Runa Arcana",
      category: "alchemy",
      icon: "\u{1F52E}",
      cost: { gold: 90, materials: { aether_shard: 3, life_lotus: 1 } },
      output: { itemId: "arcane_rune", count: 1 },
      desc: "Incapsula il potere di 3x Frammenti d'Aether e 1x Loto Vitale per sintetizzare 1x Runa Arcana."
    }
  ];
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

  // src/entities/resource_node.js
  var ResourceNode = class {
    constructor(x, y, nodeType = "mining_copper") {
      this.x = x;
      this.y = y;
      this.nodeType = nodeType;
      this.def = RESOURCE_NODES_DEF[nodeType] || RESOURCE_NODES_DEF.mining_copper;
      this.id = `${nodeType}_${Math.round(x)}_${Math.round(y)}`;
      this.r = 16;
      this.state = "ready";
      this.maxCharges = 3;
      this.charges = 3;
      this.channelProgress = 0;
      this.harvestDuration = this.def.harvestDuration || 1.2;
      this.respawnTimer = 0;
      this.respawnDuration = this.def.respawnDuration || 45;
      this.pulseTimer = Math.random() * Math.PI * 2;
      this.sparkleTimer = Math.random() * 2;
    }
    get isHarvesting() {
      return this.state === "harvesting";
    }
    get isDepleted() {
      return this.state === "depleted";
    }
    get progress() {
      return this.channelProgress;
    }
    canInteract(playerX, playerY, maxDist = 75) {
      if (this.state === "depleted") return false;
      const d = Math.hypot(this.x - playerX, this.y - playerY);
      return d <= maxDist;
    }
    hitTest(worldX, worldY, padding = 24) {
      return Math.abs(worldX - this.x) <= padding && (worldY >= this.y - 32 - padding && worldY <= this.y + padding);
    }
    startHarvest(player) {
      if (this.state !== "ready") return false;
      this.state = "harvesting";
      this.channelProgress = 0;
      FX.spark(this.x, this.y - 12, this.def.color, 4);
      return true;
    }
    cancelHarvest() {
      if (this.state === "harvesting") {
        this.state = "ready";
        this.channelProgress = 0;
      }
    }
    completeHarvest(combat, player) {
      this.state = "ready";
      this.channelProgress = 0;
      this.charges--;
      if (this.def.xpReward && combat) {
        combat.pickups.push(new GemPickup(this.x, this.y + 2, this.def.xpReward, "sapphire"));
      }
      if (this.def.drops && combat) {
        let angle = -Math.PI / 2;
        const totalDrops = [];
        for (const drop of this.def.drops) {
          if (Math.random() <= (drop.chance || 1)) {
            const [minC, maxC] = drop.count || [1, 1];
            const count = minC + Math.floor(Math.random() * (maxC - minC + 1));
            for (let i = 0; i < count; i++) {
              totalDrops.push(drop.itemId);
            }
          }
        }
        const step = Math.PI * 2 / Math.max(1, totalDrops.length);
        totalDrops.forEach((matId, idx) => {
          const dist = 18 + idx % 2 * 12;
          const ox = Math.cos(angle) * dist;
          const oy = Math.sin(angle) * dist;
          combat.itemPickups.push(new ItemPickup(this.x + ox, this.y + oy, matId));
          angle += step;
        });
      }
      FX.burst(this.x, this.y - 14, this.def.color, 14, 110);
      FX.addFloatingText(this.x, this.y - 28, `+${this.def.name}`, this.def.color);
      if (this.charges <= 0) {
        this.state = "depleted";
        this.respawnTimer = this.respawnDuration;
        FX.burst(this.x, this.y - 8, "#64748b", 8, 60);
      }
    }
    update(dt, player, combat) {
      this.pulseTimer += dt * 3.2;
      this.sparkleTimer -= dt;
      if (this.state === "depleted") {
        this.respawnTimer -= dt;
        if (this.respawnTimer <= 0) {
          this.state = "ready";
          this.charges = this.maxCharges;
          FX.burst(this.x, this.y - 12, this.def.color, 16, 100);
          FX.addFloatingText(this.x, this.y - 30, `\u2728 ${this.def.name} Ricresciuto!`, this.def.color);
        }
        return;
      }
      if (this.state === "ready" && this.sparkleTimer <= 0) {
        this.sparkleTimer = 1.2 + Math.random() * 1.5;
        FX.spark(this.x + (Math.random() * 20 - 10), this.y - 8 - Math.random() * 16, this.def.color, 2);
      }
      if (this.state === "harvesting") {
        const dist = Math.hypot(this.x - player.x, this.y - player.y);
        if (dist > 85) {
          this.cancelHarvest();
          return;
        }
        this.channelProgress += dt / this.harvestDuration;
        if (Math.random() < 0.45) {
          FX.spark(this.x + (Math.random() * 16 - 8), this.y - 10 + (Math.random() * 8 - 4), this.def.color, 3);
        }
        if (this.channelProgress >= 1) {
          this.completeHarvest(combat, player);
        }
      }
    }
    draw(ctx, camera) {
      if (camera && !camera.sees(this.x, this.y, 80)) return;
      Sprites.drawShadow(ctx, this.x, this.y + 4, 14);
      const spriteType = this.state === "depleted" ? "node_depleted" : this.def.spriteType || "node_copper";
      const sprite = Tiles.getPropSprite(spriteType);
      if (sprite) {
        const sw = sprite.width * 2;
        const sh = sprite.height * 2;
        ctx.save();
        if (this.state === "depleted") {
          ctx.globalAlpha = 0.55;
        }
        ctx.drawImage(sprite, Math.round(this.x - sw / 2), Math.round(this.y - sh + 8), sw, sh);
        ctx.restore();
      } else {
        ctx.save();
        ctx.fillStyle = this.def.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y - 8, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      if (this.state === "ready") {
        ctx.save();
        const bob = Math.sin(this.pulseTimer) * 2;
        const badgeY = Math.round(this.y - 36 + bob);
        ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
        ctx.beginPath();
        ctx.roundRect(Math.round(this.x - 22), badgeY - 14, 44, 16, 4);
        ctx.fill();
        ctx.strokeStyle = this.def.color;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#ffffff";
        let dots = "\u25CF".repeat(this.charges) + "\u25CB".repeat(this.maxCharges - this.charges);
        ctx.fillText(`${this.def.icon} ${dots}`, Math.round(this.x), badgeY - 6);
        ctx.restore();
      }
      if (this.state === "harvesting") {
        ctx.save();
        const barW = 54;
        const barH = 7;
        const barX = Math.round(this.x - barW / 2);
        const barY = Math.round(this.y - 44);
        ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
        ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1;
        ctx.strokeRect(barX - 2, barY - 2, barW + 4, barH + 4);
        const fillW = Math.max(0, Math.min(barW, Math.round(barW * this.channelProgress)));
        const grad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
        grad.addColorStop(0, this.def.color);
        grad.addColorStop(1, "#ffffff");
        ctx.fillStyle = grad;
        ctx.fillRect(barX, barY, fillW, barH);
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "#e2e8f0";
        ctx.fillText(`Raccolta in corso...`, Math.round(this.x), barY - 5);
        ctx.restore();
      }
      if (this.state === "depleted") {
        ctx.save();
        ctx.font = "9px sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "#94a3b8";
        const secsLeft = Math.ceil(this.respawnTimer);
        ctx.fillText(`\u23F3 Ricresce in ${secsLeft}s`, Math.round(this.x), Math.round(this.y - 28));
        ctx.restore();
      }
    }
  };

  // src/world/world.js
  var SETTLEMENTS = [
    {
      id: "citadel",
      name: "Cittadella dell'Aether",
      title: "Capitale Elementale",
      type: "capital",
      centerTx: 0,
      centerTy: 0,
      radiusTiles: 13,
      // ~416px raggio di protezione
      color: "#38bdf8",
      waypoint: { tx: -1, ty: 1 },
      blacksmith: {
        id: "bs_citadel",
        name: "Mastro Thorgar",
        title: "Gran Fabbro Reale",
        quote: "Salute, eroe dell'Aether! La mia forgia arde col fuoco sacro. Portami acciaio e rune e plasmer\xF2 per te armi degne di un re!",
        tx: 5,
        ty: 4
      },
      buildings: [
        { type: "aether_obelisk", tx: 0, ty: -3, wTiles: 2, hTiles: 4, name: "Obelisco dell'Aether" },
        { type: "house_blue", tx: -8, ty: -7, wTiles: 5, hTiles: 3, name: "Torre dell'Arcimago" },
        { type: "house_red", tx: 4, ty: -7, wTiles: 5, hTiles: 3, name: "Taverna della Corona" },
        { type: "fountain", tx: -4, ty: 3, wTiles: 3, hTiles: 2, name: "Fontana delle Stelle" },
        { type: "house_blue_small", tx: -8, ty: 3, wTiles: 3, hTiles: 3, name: "Bottega degli Elisir" }
      ],
      props: [
        { type: "waypoint_portal", tx: -1, ty: 1 },
        { type: "blacksmith_npc", tx: 5, ty: 4 },
        { type: "well", tx: 0, ty: 5 },
        { type: "lamppost", tx: -3, ty: -2 },
        { type: "lamppost", tx: 3, ty: -2 },
        { type: "lamppost", tx: -3, ty: 3 },
        { type: "lamppost", tx: 3, ty: 3 }
      ]
    },
    {
      id: "waterfall_village",
      name: "Borgo delle Cascate",
      title: "Villaggio del Fiume & Mulino",
      type: "river_town",
      centerTx: -40,
      centerTy: 22,
      radiusTiles: 12,
      color: "#06b6d4",
      waypoint: { tx: -38, ty: 22 },
      blacksmith: {
        id: "bs_waterfall",
        name: "Mastro Finn",
        title: "Fabbro delle Maree",
        quote: "L'acqua gelida della cascata tempra l'acciaio meglio di qualsiasi olio! Fammi vedere che rottami hai raccolto lungo il fiume!",
        tx: -35,
        ty: 24
      },
      buildings: [
        { type: "water_mill", tx: -42, ty: 25, wTiles: 4, hTiles: 3, name: "Mulino della Cascata" },
        { type: "house_blue", tx: -46, ty: 17, wTiles: 5, hTiles: 3, name: "Locanda dei Pescatori" },
        { type: "house_red_small", tx: -36, ty: 17, wTiles: 3, hTiles: 3, name: "Bottega delle Reti" }
      ],
      props: [
        { type: "waypoint_portal", tx: -38, ty: 22 },
        { type: "blacksmith_npc", tx: -35, ty: 24 },
        { type: "well", tx: -40, ty: 20 },
        { type: "lamppost", tx: -43, ty: 21 },
        { type: "lamppost", tx: -37, ty: 21 },
        { type: "lamppost", tx: -40, ty: 26 }
      ]
    },
    {
      id: "frostpeak",
      name: "Avamposto di Frostpeak",
      title: "Rifugio delle Vette Innevate",
      type: "snow_outpost",
      centerTx: 20,
      centerTy: -75,
      radiusTiles: 11,
      color: "#7dd3fc",
      waypoint: { tx: 20, ty: -73 },
      blacksmith: {
        id: "bs_frostpeak",
        name: "Mastra Astrid",
        title: "Forgiatrice dei Ghiacci",
        quote: "Il permafrost spezza le lame fragili. Qui tempreremo le tue armi col crio-acciaio delle vette montane!",
        tx: 23,
        ty: -73
      },
      buildings: [
        { type: "cabin_snow", tx: 15, ty: -80, wTiles: 3, hTiles: 3, name: "Rifugio del Permafrost" },
        { type: "cabin_snow", tx: 23, ty: -80, wTiles: 3, hTiles: 3, name: "Osservatorio del Nord" }
      ],
      props: [
        { type: "waypoint_portal", tx: 20, ty: -73 },
        { type: "blacksmith_npc", tx: 23, ty: -73 },
        { type: "brazier_fire", tx: 18, ty: -74 },
        { type: "brazier_fire", tx: 22, ty: -74 },
        { type: "well", tx: 20, ty: -76 }
      ]
    },
    {
      id: "oasis",
      name: "Oasi di Al-Zahir",
      title: "Carovana delle Dune",
      type: "desert_oasis",
      centerTx: -70,
      centerTy: 65,
      radiusTiles: 11,
      color: "#f59e0b",
      waypoint: { tx: -70, ty: 63 },
      blacksmith: {
        id: "bs_oasis",
        name: "Mastro Rashid",
        title: "Armaiolo delle Sabbie",
        quote: "Pace su di te, viaggiatore delle dune! Il sole ardente forgia le armi pi\xF9 flessibili e micidiali. Cosa creiamo oggi?",
        tx: -66,
        ty: 66
      },
      buildings: [
        { type: "tent_desert", tx: -75, ty: 60, wTiles: 4, hTiles: 3, name: "Padiglione del Sultano" },
        { type: "tent_desert", tx: -66, ty: 60, wTiles: 4, hTiles: 3, name: "Bazaar delle Dune" }
      ],
      props: [
        { type: "waypoint_portal", tx: -70, ty: 63 },
        { type: "blacksmith_npc", tx: -66, ty: 66 },
        { type: "palm_tree", tx: -73, ty: 64 },
        { type: "palm_tree", tx: -67, ty: 64 },
        { type: "palm_tree", tx: -71, ty: 67 },
        { type: "well", tx: -70, ty: 65 }
      ]
    },
    {
      id: "cineris",
      name: "Rocca di Cineris",
      title: "Fortezza del Fuoco",
      type: "volcano_fort",
      centerTx: 70,
      centerTy: 45,
      radiusTiles: 11,
      color: "#ef4444",
      waypoint: { tx: 70, ty: 43 },
      blacksmith: {
        id: "bs_cineris",
        name: "Mastro Ignis",
        title: "Fabbro di Magma",
        quote: "Solo chi sopporta il calore dell'inferno merita una lama di vero magma! Mostrami i tuoi nuclei ardenti!",
        tx: 74,
        ty: 46
      },
      buildings: [
        { type: "fort_volcano", tx: 66, ty: 40, wTiles: 5, hTiles: 4, name: "Bastione di Basalto" },
        { type: "house_dark_volcano", tx: 73, ty: 40, wTiles: 5, hTiles: 3, name: "Caserma delle Ceneri" }
      ],
      props: [
        { type: "waypoint_portal", tx: 70, ty: 43 },
        { type: "blacksmith_npc", tx: 74, ty: 46 },
        { type: "brazier_fire", tx: 67, ty: 45 },
        { type: "brazier_fire", tx: 73, ty: 45 },
        { type: "well", tx: 70, ty: 46 }
      ]
    },
    {
      id: "sylva",
      name: "Borgo di Sylva",
      title: "Santuario Silvano",
      type: "forest_haven",
      centerTx: -75,
      centerTy: -35,
      radiusTiles: 11,
      color: "#22c55e",
      waypoint: { tx: -75, ty: -33 },
      blacksmith: {
        id: "bs_sylva",
        name: "Mastra Elora",
        title: "Artigiana delle Fronde",
        quote: "Gli alberi sussurrano i segreti della terra. Posso fondere la resina d'ambra e il metallo per darti archi e bastoni ineguagliabili.",
        tx: -71,
        ty: -34
      },
      buildings: [
        { type: "cabin_wood", tx: -81, ty: -40, wTiles: 5, hTiles: 3, name: "Santuario della Quercia" },
        { type: "cabin_wood_small", tx: -71, ty: -40, wTiles: 3, hTiles: 3, name: "Erboristeria di Sylva" }
      ],
      props: [
        { type: "waypoint_portal", tx: -75, ty: -33 },
        { type: "blacksmith_npc", tx: -71, ty: -34 },
        { type: "glowing_mushrooms", tx: -77, ty: -34 },
        { type: "glowing_mushrooms", tx: -73, ty: -36 },
        { type: "well", tx: -75, ty: -35 }
      ]
    }
  ];
  var POINTS_OF_INTEREST = [
    {
      id: "boss_forest",
      type: "boss",
      name: "Radura del Treant Ancestrale",
      title: "Custode delle Radici",
      biome: "forest",
      tx: -95,
      ty: -85,
      bossKind: "boss_treant",
      chestId: "chest_forest",
      chestName: "Forziere di Smeraldo Antico",
      color: "#22c55e",
      icon: "\u{1F451}",
      loot: { gold: 220, xp: 180, items: { slime_gel: 4, iron_scrap: 3, arcane_rune: 2 } }
    },
    {
      id: "boss_snow",
      type: "boss",
      name: "Trono del Golem Glaciale",
      title: "Signore del Permafrost",
      biome: "snow",
      tx: 25,
      ty: -110,
      bossKind: "boss_golem",
      chestId: "chest_snow",
      chestName: "Forziere di Cristallo Perenne",
      color: "#7dd3fc",
      icon: "\u{1F451}",
      loot: { gold: 300, xp: 220, items: { ice_crystal: 4, iron_scrap: 3, arcane_rune: 2 } }
    },
    {
      id: "boss_desert",
      type: "boss",
      name: "Tempio del Colosso delle Dune",
      title: "Flagello delle Sabbie",
      biome: "desert",
      tx: -105,
      ty: 98,
      bossKind: "boss_scorpion",
      chestId: "chest_desert",
      chestName: "Forziere d'Oro della Sfinge",
      color: "#f59e0b",
      icon: "\u{1F451}",
      loot: { gold: 350, xp: 260, items: { sun_amber: 5, iron_scrap: 4, arcane_rune: 2 } }
    },
    {
      id: "boss_volcano",
      type: "boss",
      name: "Cratere del Titano di Magma",
      title: "Incarnazione del Fuoco",
      biome: "volcano",
      tx: 102,
      ty: 86,
      bossKind: "boss_magma",
      chestId: "chest_volcano",
      chestName: "Forziere di Ossidiana Vulcanica",
      color: "#ef4444",
      icon: "\u{1F451}",
      loot: { gold: 450, xp: 320, items: { magma_core: 5, iron_scrap: 4, arcane_rune: 3 } }
    },
    {
      id: "mystery_waterfall",
      type: "mystery",
      name: "Grotta Segreta delle Cascate",
      title: "Enigma delle Tre Rune",
      biome: "river",
      tx: -52,
      ty: 22,
      chestId: "chest_waterfall",
      chestName: "Forziere Sommerso delle Cascate",
      color: "#06b6d4",
      icon: "\u{1F52E}",
      loot: { gold: 400, xp: 300, items: { arcane_rune: 3, ice_crystal: 4, slime_gel: 4 } }
    }
  ];
  var ROAD_SEGMENTS = [
    // 1. Strada Imperiale del Nord: Cittadella -> Valico dei Monti -> Frostpeak
    { x1: 0, y1: 0, x2: 8, y2: -35 },
    { x1: 8, y1: -35, x2: 20, y2: -75 },
    // 2. Via Fluviale dell'Ovest: Cittadella -> Ponte dell'Aether -> Borgo delle Cascate
    { x1: 0, y1: 0, x2: -20, y2: 10 },
    { x1: -20, y1: 10, x2: -40, y2: 22 },
    // 3. Via delle Ceneri (Est): Cittadella -> Gola di Zolfo -> Rocca di Cineris
    { x1: 0, y1: 0, x2: 35, y2: 20 },
    { x1: 35, y1: 20, x2: 70, y2: 45 },
    // 4. Pista Carovaniera di Al-Zahir: Cittadella -> Dune Basse -> Oasi di Al-Zahir
    { x1: 0, y1: 0, x2: -35, y2: 35 },
    { x1: -35, y1: 35, x2: -70, y2: 65 },
    // 5. Cammino Silvano: Cittadella -> Radura di Mezzo -> Borgo di Sylva
    { x1: 0, y1: 0, x2: -35, y2: -18 },
    { x1: -35, y1: -18, x2: -75, y2: -35 },
    // 6. Raccordo Borgo delle Cascate <-> Oasi di Al-Zahir
    { x1: -40, y1: 22, x2: -55, y2: 45 },
    { x1: -55, y1: 45, x2: -70, y2: 65 },
    // 7. Raccordo Borgo delle Cascate <-> Borgo di Sylva
    { x1: -40, y1: 22, x2: -58, y2: -8 },
    { x1: -58, y1: -8, x2: -75, y2: -35 }
  ];
  var TRAIL_SEGMENTS = [
    // Sentiero 1: Sylva -> Radura del Treant Ancestrale (Boss Bosco)
    { x1: -75, y1: -35, x2: -86, y2: -60 },
    { x1: -86, y1: -60, x2: -95, y2: -85 },
    // Sentiero 2: Frostpeak -> Trono del Golem dei Ghiacci (Boss Montagne)
    { x1: 20, y1: -75, x2: 22, y2: -92 },
    { x1: 22, y1: -92, x2: 25, y2: -110 },
    // Sentiero 3: Al-Zahir -> Tempio della Sfinge (Boss Deserto)
    { x1: -70, y1: 65, x2: -88, y2: 82 },
    { x1: -88, y1: 82, x2: -105, y2: 98 },
    // Sentiero 4: Cineris -> Cratere del Titano di Magma (Boss Vulcano)
    { x1: 70, y1: 45, x2: 86, y2: 65 },
    { x1: 86, y1: 65, x2: 102, y2: 86 },
    // Sentiero 5: Borgo delle Cascate -> Grotta del Mistero sotto la Cascata
    { x1: -40, y1: 22, x2: -46, y2: 22 },
    { x1: -46, y1: 22, x2: -52, y2: 22 },
    // Sentieri di raccordo trasversale tra biomi:
    // Frostpeak -> Passaggio Orientale verso Cineris
    { x1: 20, y1: -75, x2: 50, y2: -20 },
    { x1: 50, y1: -20, x2: 70, y2: 45 },
    // Sylva -> Alture di Frostpeak
    { x1: -75, y1: -35, x2: -30, y2: -55 },
    { x1: -30, y1: -55, x2: 20, y2: -75 }
  ];
  var RESOURCE_SPOTS = [
    // --- BOSCO DI SYLVA (Rame, Querce Antiche, Geodi Arcani) ---
    { type: "mining_copper", tx: -50, ty: -20 },
    { type: "mining_copper", tx: -65, ty: -48 },
    { type: "mining_copper", tx: -82, ty: -25 },
    { type: "mining_copper", tx: -30, ty: -46 },
    { type: "mining_copper", tx: -15, ty: -35 },
    { type: "mining_copper", tx: -45, ty: -68 },
    { type: "mining_copper", tx: -10, ty: -20 },
    { type: "mining_copper", tx: 8, ty: -28 },
    { type: "tree_ancient", tx: -86, ty: -52 },
    { type: "tree_ancient", tx: -72, ty: -22 },
    { type: "tree_ancient", tx: -62, ty: -58 },
    { type: "tree_ancient", tx: -42, ty: -42 },
    { type: "tree_ancient", tx: -28, ty: -62 },
    { type: "tree_ancient", tx: -92, ty: -34 },
    { type: "tree_ancient", tx: -18, ty: -48 },
    // --- BIOMA DEL FIUME & CASCATE (Loto delle Ninfee, Rame Fluviale) ---
    { type: "plant_lotus", tx: -44, ty: 15 },
    { type: "plant_lotus", tx: -34, ty: 18 },
    { type: "plant_lotus", tx: -42, ty: 30 },
    { type: "plant_lotus", tx: -52, ty: 26 },
    { type: "plant_lotus", tx: -32, ty: 28 },
    { type: "plant_lotus", tx: -24, ty: 12 },
    { type: "plant_lotus", tx: -56, ty: 34 },
    { type: "mining_copper", tx: -38, ty: 36 },
    { type: "mining_copper", tx: -48, ty: 12 },
    { type: "mining_copper", tx: -28, ty: 32 },
    // --- VETTE DI FROSTPEAK (Ferro Montano, Abeti del Permafrost) ---
    { type: "mining_iron", tx: 14, ty: -62 },
    { type: "mining_iron", tx: 32, ty: -68 },
    { type: "mining_iron", tx: 10, ty: -84 },
    { type: "mining_iron", tx: 26, ty: -92 },
    { type: "mining_iron", tx: 36, ty: -54 },
    { type: "mining_iron", tx: 6, ty: -74 },
    { type: "mining_iron", tx: 42, ty: -78 },
    { type: "tree_frost", tx: 16, ty: -70 },
    { type: "tree_frost", tx: 28, ty: -84 },
    { type: "tree_frost", tx: 8, ty: -66 },
    { type: "tree_frost", tx: 24, ty: -96 },
    { type: "tree_frost", tx: 34, ty: -64 },
    { type: "tree_frost", tx: 12, ty: -86 },
    // --- DESERTO DI AL-ZAHIR (Spine Solari, Minerale Ferroso delle Sabbie) ---
    { type: "mining_iron", tx: -58, ty: 54 },
    { type: "mining_iron", tx: -76, ty: 74 },
    { type: "mining_iron", tx: -48, ty: 68 },
    { type: "mining_iron", tx: -82, ty: 48 },
    { type: "mining_iron", tx: -64, ty: 82 },
    { type: "mining_iron", tx: -54, ty: 62 },
    { type: "plant_sun", tx: -74, ty: 56 },
    { type: "plant_sun", tx: -66, ty: 74 },
    { type: "plant_sun", tx: -56, ty: 66 },
    { type: "plant_sun", tx: -84, ty: 64 },
    { type: "plant_sun", tx: -60, ty: 80 },
    { type: "plant_sun", tx: -78, ty: 50 },
    // --- ZONA VULCANICA DI CINERIS (Giacimenti d'Ossidiana, Ferro Vulcanico) ---
    { type: "mining_obsidian", tx: 58, ty: 34 },
    { type: "mining_obsidian", tx: 76, ty: 56 },
    { type: "mining_obsidian", tx: 82, ty: 38 },
    { type: "mining_obsidian", tx: 64, ty: 54 },
    { type: "mining_obsidian", tx: 54, ty: 44 },
    { type: "mining_obsidian", tx: 86, ty: 28 },
    { type: "mining_obsidian", tx: 72, ty: 62 },
    { type: "mining_obsidian", tx: 92, ty: 52 },
    { type: "mining_iron", tx: 52, ty: 28 },
    { type: "mining_iron", tx: 60, ty: 48 },
    { type: "mining_iron", tx: 80, ty: 46 },
    // --- GEODI D'AETHER (Filoni Arcani presso rovine e crocevia) ---
    { type: "geode_aether", tx: 2, ty: -24 },
    { type: "geode_aether", tx: -16, ty: 16 },
    { type: "geode_aether", tx: 22, ty: 22 },
    { type: "geode_aether", tx: -22, ty: -16 },
    { type: "geode_aether", tx: 12, ty: -46 },
    { type: "geode_aether", tx: -52, ty: -6 },
    { type: "geode_aether", tx: 46, ty: -22 },
    { type: "geode_aether", tx: 36, ty: 36 },
    { type: "geode_aether", tx: -72, ty: 12 },
    { type: "geode_aether", tx: 72, ty: 14 }
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
      this.TILE_BRIDGE = 9;
      this.TILE_SHALLOW_WATER = 10;
      this.TILE_ROAD = 11;
      this.TILE_TRAIL = 12;
      this.MAP_RADIUS = 120;
      this.minTile = -this.MAP_RADIUS;
      this.maxTile = this.MAP_RADIUS;
      this.minX = (this.minTile + 2) * this.TS;
      this.maxX = (this.maxTile - 2) * this.TS;
      this.minY = (this.minTile + 2) * this.TS;
      this.maxY = (this.maxTile - 2) * this.TS;
      this.chunkCanvases = /* @__PURE__ */ new Map();
      this.chunkProps = /* @__PURE__ */ new Map();
      this.resourceNodes = RESOURCE_SPOTS.map((spot) => {
        const wx = spot.tx * this.TS + this.TS / 2;
        const wy = spot.ty * this.TS + this.TS / 2;
        return new ResourceNode(wx, wy, spot.type);
      });
    }
    /**
     * Restituisce il nodo risorsa più vicino e interagibile
     */
    getNearbyResourceNode(playerX, playerY, maxDist = 75) {
      let nearest = null;
      let minDist = maxDist;
      for (const node of this.resourceNodes) {
        if (node.state === "depleted") continue;
        const d = Math.hypot(node.x - playerX, node.y - playerY);
        if (d <= minDist) {
          minDist = d;
          nearest = node;
        }
      }
      return nearest;
    }
    /**
     * Cerca un nodo risorsa cliccato alle coordinate del mondo
     */
    getResourceNodeAt(worldX, worldY, padding = 24) {
      for (const node of this.resourceNodes) {
        if (node.hitTest(worldX, worldY, padding)) {
          return node;
        }
      }
      return null;
    }
    /**
     * Aggiorna lo stato di tutti i nodi di risorsa (canalizzazione, respawn)
     */
    updateResourceNodes(dt, player, combat) {
      for (const node of this.resourceNodes) {
        node.update(dt, player, combat);
      }
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
     * Verifica se un tile fa parte di una strada maestra lastricata
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
     * Verifica se un tile fa parte di un sentiero selvaggio di terra e ghiaia
     */
    isTrail(tx, ty) {
      for (const seg of TRAIL_SEGMENTS) {
        const d = distToSegment(tx, ty, seg.x1, seg.y1, seg.x2, seg.y2);
        if (d <= 1.25) {
          return true;
        }
      }
      return false;
    }
    /**
     * Cerca l'NPC Fabbro più vicino entro un dato raggio dal giocatore
     */
    getNearbyBlacksmith(playerX, playerY, maxDist = 75) {
      for (const s of SETTLEMENTS) {
        if (!s.blacksmith) continue;
        const bx = s.blacksmith.tx * this.TS + this.TS / 2;
        const by = s.blacksmith.ty * this.TS + this.TS;
        if (Math.hypot(playerX - bx, playerY - by) <= maxDist) {
          return {
            ...s.blacksmith,
            settlementName: s.name,
            settlementId: s.id,
            settlementColor: s.color,
            worldX: bx,
            worldY: by
          };
        }
      }
      return null;
    }
    /**
     * Cerca il Portale di Teletrasporto / Waypoint dell'Aether più vicino entro un dato raggio dal giocatore
     */
    getNearbyWaypoint(playerX, playerY, maxDist = 85) {
      for (const s of SETTLEMENTS) {
        if (!s.waypoint) continue;
        const wx = s.waypoint.tx * this.TS + this.TS / 2;
        const wy = s.waypoint.ty * this.TS + this.TS / 2;
        if (Math.hypot(playerX - wx, playerY - wy) <= maxDist) {
          return {
            ...s.waypoint,
            settlementId: s.id,
            settlementName: s.name,
            settlementTitle: s.title,
            settlementColor: s.color,
            worldX: wx,
            worldY: wy
          };
        }
      }
      return null;
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
      const sz = this.getSafeZone(wx, wy);
      if (sz) {
        if (sz.id === "cineris") return "village_volcano";
        if (sz.id === "frostpeak") return "village_snow";
        if (sz.id === "oasis") return "village_desert";
        if (sz.id === "waterfall_village") return "village_river";
        return "village";
      }
      const riverCx = this.getRiverCenterX(ty);
      const distRiver = Math.abs(tx - riverCx);
      if (distRiver <= 6.5) {
        return "river";
      }
      const warp = Math.sin(ty * 0.042) * 14 + Math.cos(tx * 0.042) * 12 + Math.sin((tx + ty) * 0.02) * 8;
      const effTx = tx + warp;
      const effTy = ty + warp;
      if (effTy < -32) {
        return "snow";
      }
      if (effTx > 28 && effTy > -20) {
        return "volcano";
      }
      if (effTy > 30 && effTx < 22) {
        return "desert";
      }
      return "forest";
    }
    isBuildingSolid(tx, ty) {
      for (const s of SETTLEMENTS) {
        for (const b of s.buildings) {
          if (tx >= b.tx && tx < b.tx + b.wTiles && ty >= b.ty + 1 && ty < b.ty + b.hTiles) {
            return true;
          }
        }
        for (const p of s.props) {
          if ((p.type === "well" || p.type === "lamppost") && p.tx === tx && p.ty === ty) {
            return true;
          }
        }
      }
      return false;
    }
    isNearWater(tx, ty, bufferTiles = 2.4) {
      for (let dy = -Math.ceil(bufferTiles); dy <= Math.ceil(bufferTiles); dy++) {
        const rcx = this.getRiverCenterX(ty + dy);
        if (Math.abs(tx - rcx) <= 2.4 + bufferTiles) {
          return true;
        }
      }
      for (let dy = -Math.ceil(bufferTiles); dy <= Math.ceil(bufferTiles); dy++) {
        for (let dx = -Math.ceil(bufferTiles); dx <= Math.ceil(bufferTiles); dx++) {
          const lk = this.hash2D(Math.floor((tx + dx) / 3), Math.floor((ty + dy) / 3), 101);
          if (lk > 0.93) return true;
        }
      }
      return false;
    }
    getTileType(tx, ty) {
      if (Math.abs(tx) >= this.MAP_RADIUS - 3 || Math.abs(ty) >= this.MAP_RADIUS - 3) {
        return this.TILE_WALL;
      }
      const wx = tx * this.TS;
      const wy = ty * this.TS;
      const sz = this.getSafeZone(wx, wy);
      if (sz) {
        return this.TILE_FLOOR;
      }
      for (const poi of POINTS_OF_INTEREST) {
        const dPoi = Math.hypot(tx - poi.tx, ty - poi.ty);
        if (dPoi <= 4.8) {
          return this.TILE_FLOOR;
        }
      }
      const onRoad = this.isRoad(tx, ty);
      const onTrail = this.isTrail(tx, ty);
      const riverCx = this.getRiverCenterX(ty);
      const distRiver = Math.abs(tx - riverCx);
      if ((onRoad || onTrail) && distRiver <= 2.8) {
        return this.TILE_BRIDGE;
      }
      if (onRoad) {
        return this.TILE_ROAD;
      }
      if (onTrail) {
        return this.TILE_TRAIL;
      }
      if (distRiver <= 2.4) {
        const isFord = Math.abs(ty - 22) <= 3 && Math.abs(tx - -40) <= 14 || Math.floor(Math.abs(ty) / 16) % 3 === 0 && distRiver <= 1.6;
        if (isFord) {
          return this.TILE_SHALLOW_WATER;
        }
        return this.TILE_WATER;
      }
      const biome = this.getBiome(tx, ty);
      const wallNoise = this.hash2D(tx, ty, 42);
      const lakeNoise = this.hash2D(Math.floor(tx / 3), Math.floor(ty / 3), 101);
      const propNoise = this.hash2D(tx, ty, 77);
      let nearSettlement = false;
      for (const s of SETTLEMENTS) {
        if (Math.hypot(tx - s.centerTx, ty - s.centerTy) < s.radiusTiles + 5) {
          nearSettlement = true;
          break;
        }
      }
      const nearRoad = this.isRoad(tx, ty) || this.isTrail(tx, ty);
      const bx0 = Math.floor(tx / 3) * 3;
      const by0 = Math.floor(ty / 3) * 3;
      const b00 = this.getBiome(bx0, by0);
      const b22 = this.getBiome(bx0 + 2, by0 + 2);
      const b02 = this.getBiome(bx0, by0 + 2);
      const b20 = this.getBiome(bx0 + 2, by0);
      const canSpawnLake = !nearSettlement && !nearRoad && (b00 === biome && b22 === biome && b02 === biome && b20 === biome);
      const nearWater = this.isNearWater(tx, ty, 2.4);
      if (biome === "river") {
        if (!nearWater && propNoise > 0.92) return this.TILE_TREE;
        return this.TILE_FLOOR;
      }
      if (biome === "snow") {
        if (wallNoise > 0.96) return this.TILE_WALL;
        if (canSpawnLake && lakeNoise > 0.94) return this.TILE_WATER;
        if (!nearWater && propNoise > 0.88) return this.TILE_PINE;
        return this.TILE_FLOOR;
      }
      if (biome === "desert") {
        if (wallNoise > 0.96) return this.TILE_WALL;
        if (canSpawnLake && lakeNoise > 0.96) return this.TILE_WATER;
        if (!nearWater && propNoise > 0.9) return this.TILE_CACTUS;
        return this.TILE_FLOOR;
      }
      if (biome === "volcano") {
        if (wallNoise > 0.96) return this.TILE_WALL;
        if (canSpawnLake && lakeNoise > 0.93) return this.TILE_WATER;
        return this.TILE_FLOOR;
      }
      if (wallNoise > 0.96) return this.TILE_WALL;
      if (canSpawnLake && lakeNoise > 0.94) return this.TILE_WATER;
      if (!nearWater && propNoise > 0.88) return this.TILE_TREE;
      return this.TILE_FLOOR;
    }
    getKind(tx, ty) {
      const t = this.getTileType(tx, ty);
      if (t === this.TILE_WALL) return "wall";
      if (t === this.TILE_WATER) return "liquid";
      if (t === this.TILE_BRIDGE) return "bridge";
      if (t === this.TILE_ROAD) return "road";
      if (t === this.TILE_TRAIL) return "trail";
      if (t === this.TILE_SHALLOW_WATER) return "shallow";
      return "floor";
    }
    isSolid(tx, ty) {
      const t = this.getTileType(tx, ty);
      if (t === this.TILE_BRIDGE || t === this.TILE_SHALLOW_WATER || t === this.TILE_ROAD || t === this.TILE_TRAIL) {
        return false;
      }
      return t === this.TILE_WALL || t === this.TILE_WATER || t === this.TILE_TREE || t === this.TILE_PINE || t === this.TILE_CACTUS || t === this.TILE_VOLCANO_ROCK || t === this.TILE_SAND_ROCK || t === this.TILE_ROCK || this.isBuildingSolid(tx, ty);
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
          if (this.isSafeZone(px, py)) continue;
          if (!this.isSolid(tx, ty) && !this.isLiquid(px, py)) {
            const currentBiome = this.getBiome(tx, ty);
            if (targetBiome) {
              if (currentBiome === targetBiome) {
                return { x: px, y: py };
              }
            } else {
              if (!currentBiome.startsWith("village")) {
                return { x: px, y: py };
              }
            }
          }
        }
      }
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
      const props = [];
      for (let lty = 0; lty < this.N; lty++) {
        for (let ltx = 0; ltx < this.N; ltx++) {
          const tx = cx * this.N + ltx;
          const ty = cy * this.N + lty;
          const t = this.getTileType(tx, ty);
          if (t === this.TILE_TREE) {
            const b = this.getBiome(tx, ty);
            let treeType = "tree";
            const treeVar = this.hash2D(tx, ty, 314);
            if (b === "river") {
              treeType = treeVar > 0.4 ? "tree_teal" : "tree";
            } else if (treeVar > 0.65) {
              treeType = "tree_gold";
            } else if (treeVar < 0.15) {
              treeType = "tree_teal";
            }
            props.push({ type: treeType, x: tx * this.TS + this.TS / 2, y: ty * this.TS + this.TS });
          } else if (t === this.TILE_PINE) {
            const isLarge = this.hash2D(tx, ty, 888) > 0.45;
            props.push({
              type: isLarge ? "pine_large" : "pine",
              x: tx * this.TS + this.TS / 2,
              y: ty * this.TS + this.TS
            });
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
            props.push({
              type: p.type,
              x: anchorX,
              y: anchorY,
              blacksmithId: s.blacksmith ? s.blacksmith.id : null
            });
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
                  const isBuilding = p.type === "house_red" || p.type === "house_red_small" || p.type === "house_blue" || p.type === "house_blue_small" || p.type === "house_dark_volcano" || p.type === "house_dark_volcano_small" || p.type === "water_mill" || p.type === "tent_desert" || p.type === "cabin_snow" || p.type === "cabin_wood" || p.type === "cabin_wood_small" || p.type === "fort_volcano";
                  if (isBuilding) {
                    ctx.fillStyle = "rgba(6, 8, 14, 0.45)";
                    ctx.fillRect(Math.round(p.x - sw / 2 + 8), Math.round(p.y - 8), sw - 16, 14);
                    ctx.drawImage(sprite, Math.round(p.x - sw / 2), Math.round(p.y - sh + 8), sw, sh);
                  } else if (p.type === "blacksmith_npc") {
                    const player = entities[0] || { x: 0, y: 0 };
                    Sprites.drawBlacksmithNPC(ctx, p.x, p.y, p.blacksmithId || "bs_citadel", player.x, player.y, Date.now() / 1e3);
                  } else if (p.type === "waypoint_portal") {
                    Sprites.drawShadow(ctx, p.x, p.y - 1, 12);
                    const pulse = Math.sin(Date.now() / 280) * 0.12 + 0.38;
                    const glow = ctx.createRadialGradient(p.x, p.y - 12, 6, p.x, p.y - 12, 45);
                    glow.addColorStop(0, `rgba(56, 189, 248, ${pulse})`);
                    glow.addColorStop(0.6, `rgba(14, 165, 233, ${pulse * 0.3})`);
                    glow.addColorStop(1, "rgba(56, 189, 248, 0)");
                    ctx.fillStyle = glow;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y - 12, 45, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.save();
                    ctx.strokeStyle = `rgba(56, 189, 248, ${pulse + 0.25})`;
                    ctx.lineWidth = 1.4;
                    ctx.beginPath();
                    ctx.ellipse(p.x, p.y - 1, 18, 9, 0, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.restore();
                    ctx.drawImage(sprite, Math.round(p.x - sw / 2), Math.round(p.y - sh + 6), sw, sh);
                    ctx.save();
                    ctx.font = "500 10px system-ui, -apple-system, sans-serif";
                    ctx.textAlign = "center";
                    ctx.fillStyle = "rgba(15, 23, 42, 0.65)";
                    ctx.fillRect(Math.round(p.x - 42), Math.round(p.y - sh - 14), 84, 15);
                    ctx.strokeStyle = "rgba(56, 189, 248, 0.65)";
                    ctx.lineWidth = 1;
                    ctx.strokeRect(Math.round(p.x - 42), Math.round(p.y - sh - 14), 84, 15);
                    ctx.fillStyle = "#7dd3fc";
                    ctx.fillText("\u{1F300} Portale [E]", Math.round(p.x), Math.round(p.y - sh - 3));
                    ctx.restore();
                  } else if (p.type === "aether_obelisk") {
                    Sprites.drawShadow(ctx, p.x, p.y - 1, 14);
                    const glow = ctx.createRadialGradient(p.x, p.y - 36, 10, p.x, p.y - 36, 80);
                    glow.addColorStop(0, "rgba(56, 189, 248, 0.28)");
                    glow.addColorStop(1, "rgba(56, 189, 248, 0)");
                    ctx.fillStyle = glow;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y - 36, 80, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.drawImage(sprite, Math.round(p.x - sw / 2), Math.round(p.y - sh + 8), sw, sh);
                  } else if (p.type === "brazier_fire") {
                    Sprites.drawShadow(ctx, p.x, p.y - 2, 10);
                    const glow = ctx.createRadialGradient(p.x, p.y - 14, 4, p.x, p.y - 14, 42);
                    glow.addColorStop(0, "rgba(249, 115, 22, 0.28)");
                    glow.addColorStop(1, "rgba(249, 115, 22, 0)");
                    ctx.fillStyle = glow;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y - 14, 42, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.drawImage(sprite, Math.round(p.x - sw / 2), Math.round(p.y - sh + 4), sw, sh);
                  } else if (p.type === "fountain") {
                    Sprites.drawShadow(ctx, p.x, p.y - 2, 18);
                    ctx.drawImage(sprite, Math.round(p.x - sw / 2), Math.round(p.y - sh + 6), sw, sh);
                  } else if (p.type === "glowing_mushrooms") {
                    Sprites.drawShadow(ctx, p.x, p.y - 2, 12);
                    const glow = ctx.createRadialGradient(p.x, p.y - 10, 4, p.x, p.y - 10, 36);
                    glow.addColorStop(0, "rgba(168, 85, 247, 0.25)");
                    glow.addColorStop(1, "rgba(168, 85, 247, 0)");
                    ctx.fillStyle = glow;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y - 10, 36, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.drawImage(sprite, Math.round(p.x - sw / 2), Math.round(p.y - sh + 4), sw, sh);
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
                    const isTree = p.type === "tree" || p.type === "tree_gold" || p.type === "tree_teal" || p.type === "pine" || p.type === "pine_large" || p.type === "palm_tree";
                    const rad = p.type === "pine_large" ? 16 : isTree ? 14 : p.type === "cactus" ? 10 : 12;
                    Sprites.drawShadow(ctx, p.x, p.y - 2, rad);
                    const yOff = p.type === "pine_large" ? 10 : isTree ? 8 : 4;
                    ctx.drawImage(sprite, Math.round(p.x - sw / 2), Math.round(p.y - sh + yOff), sw, sh);
                  }
                }
              });
            }
          }
        }
      }
      if (this.resourceNodes) {
        for (const node of this.resourceNodes) {
          if (camera.sees(node.x, node.y, 80)) {
            drawList.push({
              y: node.y,
              draw: () => node.draw(ctx, camera)
            });
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
      this.defense = 0;
      this.damageReductionPercent = 0;
      this.critChance = 0;
      this.critDamage = 50;
      this.hpRegen = 0;
      this.lifeSteal = 0;
      this.dodgeChance = 0;
      this.cooldownReduction = 0;
      this.ignoreWaterSlow = false;
      this.invulnerableTimer = 0;
      this.dir = 0;
      this.moveAngle = Math.PI / 2;
      this.walking = false;
      this.inLiquid = false;
      this.animTimer = 0;
      this.frame = 0;
      this.weapon = "staff";
      this.skin = "hero_hunter";
    }
    setSkin(skinId) {
      if (skinId) {
        this.skin = skinId;
      }
    }
    applyPermanentStats(stats = {}) {
      this.maxHp = 100 + (stats.bonusHp || 0);
      this.hp = Math.min(this.hp, this.maxHp);
      if (this.hp <= 0) this.hp = this.maxHp;
      this.baseSpd = Math.round(105 * (stats.speedMultiplier || 1));
      this.magnetRadius = Math.round(85 * (stats.magnetMultiplier || 1));
      this.permanentBonusDamage = stats.bonusDamage || 0;
      this.defense = stats.defense || 0;
      this.damageReductionPercent = stats.damageReductionPercent || 0;
      this.critChance = stats.critChance || 0;
      this.critDamage = stats.critDamage || 50;
      this.hpRegen = stats.hpRegen || 0;
      this.lifeSteal = stats.lifeSteal || 0;
      this.dodgeChance = stats.dodgeChance || 0;
      this.cooldownReduction = stats.cooldownReduction || 0;
      this.ignoreWaterSlow = !!stats.ignoreWaterSlow;
    }
    takeDamage(amount) {
      if (this.invulnerableTimer > 0 || this.hp <= 0) return;
      if (this.dodgeChance > 0 && Math.random() * 100 < this.dodgeChance) {
        this.invulnerableTimer = 0.35;
        FX.addFloatingText(this.x, this.y - 24, "SCHIVATA! \u{1F4A8}", "#38bdf8");
        FX.spark(this.x, this.y - 8, "#7dd3fc", 4);
        return;
      }
      const reduction = this.defense > 0 ? this.defense / (this.defense + 100) : 0;
      const finalDmg = Math.max(1, Math.round(amount * (1 - reduction)));
      this.hp = Math.max(0, this.hp - finalDmg);
      this.invulnerableTimer = 0.6;
      FX.addFloatingText(this.x, this.y - 18, `-${finalDmg}`, "#ef4444");
      if (this.hp <= 0 && this.onDeath) {
        this.onDeath();
      }
    }
    get currentSpeed() {
      let s = this.baseSpd;
      if (this.inLiquid && !this.ignoreWaterSlow) {
        s *= 0.6;
      }
      return s;
    }
    update(dt, input, world) {
      if (this.invulnerableTimer > 0) {
        this.invulnerableTimer -= dt;
      }
      if (this.hpRegen > 0 && this.hp > 0 && this.hp < this.maxHp) {
        this.hp = Math.min(this.maxHp, this.hp + this.hpRegen * dt);
      }
      const [ax, ay] = input.axis();
      this.walking = ax !== 0 || ay !== 0;
      if (this.walking) {
        this.moveAngle = Math.atan2(ay, ax);
        this.dir = Sprites.dirFromAngle(this.moveAngle);
        let spd = this.currentSpeed;
        if (world.isShallowWater(this.x, this.y) && !this.ignoreWaterSlow) {
          spd *= 0.85;
        }
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
      this.inShallowWater = world.isShallowWater(this.x, this.y);
    }
    draw(ctx) {
      if (this.invulnerableTimer > 0 && Math.floor(this.invulnerableTimer * 20) % 2 === 0) {
        return;
      }
      Sprites.drawShadow(ctx, this.x, this.y, 7);
      Sprites.drawHero(ctx, this.x, this.y, this.dir, this.walking, this.frame, this.weapon, this.animTimer || 0, this.skin);
      if ((this.inLiquid || this.inShallowWater) && this.walking) {
        ctx.fillStyle = "rgba(56, 189, 248, 0.75)";
        const splashX = this.x + (Math.random() * 16 - 8);
        const splashY = this.y + (Math.random() * 6 - 3);
        ctx.fillRect(Math.round(splashX), Math.round(splashY), 3, 3);
      }
    }
  };

  // src/entities/enemy.js
  var ENEMY_COLORS = {
    slime_forest: "#22c55e",
    slime_ice: "#93c5fd",
    slime_sand: "#f59e0b",
    slime_magma: "#ef4444",
    slime_water: "#0284c7",
    skeleton: "#cbd5e1",
    orc: "#84cc16",
    bat: "#a855f7",
    boss_treant: "#22c55e",
    boss_golem: "#7dd3fc",
    boss_scorpion: "#f59e0b",
    boss_magma: "#ef4444"
  };
  var Enemy = class {
    constructor(x, y, kind = "slime_forest") {
      this.x = x;
      this.y = y;
      this.kind = kind;
      this.spawnX = x;
      this.spawnY = y;
      this.color = ENEMY_COLORS[kind] || "#22c55e";
      this.isBoss = false;
      if (kind === "boss_treant") {
        this.name = "Treant Ancestrale";
        this.isBoss = true;
        this.maxHp = 650;
        this.baseSpd = 36;
        this.r = 26;
        this.aggroRadius = 320;
        this.xpValue = 180;
        this.gemType = "emerald";
        this.contactDamage = 16;
        this.goldValue = 140;
      } else if (kind === "boss_golem") {
        this.name = "Golem dei Ghiacci";
        this.isBoss = true;
        this.maxHp = 780;
        this.baseSpd = 40;
        this.r = 28;
        this.aggroRadius = 340;
        this.xpValue = 220;
        this.gemType = "emerald";
        this.contactDamage = 20;
        this.goldValue = 180;
      } else if (kind === "boss_scorpion") {
        this.name = "Colosso delle Dune";
        this.isBoss = true;
        this.maxHp = 880;
        this.baseSpd = 52;
        this.r = 28;
        this.aggroRadius = 350;
        this.xpValue = 260;
        this.gemType = "emerald";
        this.contactDamage = 24;
        this.goldValue = 220;
      } else if (kind === "boss_magma") {
        this.name = "Titano di Magma";
        this.isBoss = true;
        this.maxHp = 1050;
        this.baseSpd = 45;
        this.r = 30;
        this.aggroRadius = 360;
        this.xpValue = 320;
        this.gemType = "emerald";
        this.contactDamage = 28;
        this.goldValue = 260;
      } else if (kind === "slime_forest") {
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
      } else if (kind === "orc") {
        this.name = "Orco Predone";
        this.maxHp = 95;
        this.baseSpd = 62;
        this.r = 15;
        this.aggroRadius = 220;
        this.xpValue = 30;
        this.gemType = "emerald";
        this.contactDamage = 16;
        this.goldValue = 15;
      } else if (kind === "bat") {
        this.name = "Pipistrello dell'Ombra";
        this.maxHp = 30;
        this.baseSpd = 90;
        this.r = 12;
        this.aggroRadius = 240;
        this.xpValue = 14;
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
        if (world.isSafeZone(player.x, player.y) || dist > this.aggroRadius * 1.7) {
          this.state = "WANDER";
          this.wanderTimer = 2.5;
          this.isWanderMoving = false;
        } else if (dist > 18) {
          const angle = Math.atan2(dy, dx);
          this.dir = Sprites.dirFromAngle(angle);
          let spd = this.baseSpd;
          if (world.isLiquid(this.x, this.y)) {
            spd *= 0.55;
          } else if (world.isShallowWater(this.x, this.y)) {
            spd *= 0.85;
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
        if (this.kind.startsWith("slime_")) {
          const p = 1 - this.deathTimer / this.deathMaxTimer;
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
        } else if (this.kind === "orc") {
          Sprites.drawOrc(ctx, this.x, this.y, this.dir, false, 0, true, this.deathTimer, this.deathMaxTimer, this.animTimer);
        } else if (this.kind === "bat") {
          Sprites.drawBat(ctx, this.x, this.y, this.dir, false, 0, true, this.deathTimer, this.deathMaxTimer, this.animTimer);
        } else if (this.isBoss) {
          Sprites.drawBoss(ctx, this);
        } else {
          Sprites.drawSkeleton(ctx, this.x, this.y, this.dir, false, 0, true, this.deathTimer, this.deathMaxTimer, this.animTimer);
        }
        return;
      }
      if (!this.isBoss) {
        const shadowR = this.kind.startsWith("slime") ? 6 : 7;
        Sprites.drawShadow(ctx, this.x, this.y, shadowR);
      }
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
      const isWalking = this.state === "CHASE" || this.state === "WANDER" && this.isWanderMoving;
      if (this.isBoss) {
        Sprites.drawBoss(ctx, this);
      } else if (this.kind.startsWith("slime_")) {
        const slimeType = this.kind.replace("slime_", "");
        const sprite = Sprites.getSlimeSprite(slimeType, this.frame);
        const sw = sprite.width;
        const sh = sprite.height;
        ctx.drawImage(sprite, Math.round(this.x - sw / 2), Math.round(this.y - sh + 8));
      } else if (this.kind === "orc") {
        Sprites.drawOrc(ctx, this.x, this.y, this.dir, isWalking, this.frame, false, 0, 0, this.animTimer);
      } else if (this.kind === "bat") {
        Sprites.drawBat(ctx, this.x, this.y, this.dir, isWalking, this.frame, false, 0, 0, this.animTimer);
      } else {
        Sprites.drawSkeleton(ctx, this.x, this.y, this.dir, isWalking, this.frame, false, 0, 0, this.animTimer);
      }
      ctx.restore();
      if (this.alertTimer > 0) {
        ctx.fillStyle = "#ef4444";
        ctx.font = "bold 12px monospace";
        ctx.textAlign = "center";
        ctx.fillText("!", Math.round(this.x), Math.round(this.y - 28));
      }
      if (this.isBoss) {
        const barW = 74;
        const barH = 5;
        const bx = Math.round(this.x - barW / 2);
        const by = Math.round(this.y - 56);
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "#fde047";
        ctx.fillText(`\u{1F451} ${this.name}`, Math.round(this.x), by - 4);
        ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
        ctx.fillRect(bx - 2, by - 2, barW + 4, barH + 4);
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 1;
        ctx.strokeRect(bx - 2, by - 2, barW + 4, barH + 4);
        const pct = Math.max(0, this.hp / this.maxHp);
        ctx.fillStyle = pct > 0.4 ? "#ef4444" : "#b91c1c";
        ctx.fillRect(bx, by, Math.round(barW * pct), barH);
      } else if (this.hp < this.maxHp) {
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

  // src/entities/chest.js
  var Chest = class {
    constructor(x, y, poiDef) {
      this.x = x;
      this.y = y;
      this.poi = poiDef;
      this.id = poiDef.chestId;
      this.name = poiDef.chestName;
      this.isLocked = true;
      this.isOpen = false;
      this.loot = poiDef.loot || { gold: 200, xp: 150, items: { iron_scrap: 2 } };
      this.r = 18;
      this.pulseTimer = 0;
    }
    unlock() {
      if (!this.isLocked) return;
      this.isLocked = false;
      FX.burst(this.x, this.y - 10, "#fde047", 18, 120);
      FX.floatingText(this.x, this.y - 28, "\u{1F513} Forziere Sbloccato!", "#fde047");
    }
    open(combat, player) {
      if (this.isOpen || this.isLocked) return false;
      this.isOpen = true;
      combat.goldEarned += this.loot.gold || 150;
      combat.pickups.push(new GemPickup(this.x, this.y + 4, this.loot.xp || 180, "emerald"));
      if (this.loot.items) {
        let angle = 0;
        const count = Object.keys(this.loot.items).length;
        const step = Math.PI * 2 / Math.max(1, count);
        for (const [matId, amt] of Object.entries(this.loot.items)) {
          for (let i = 0; i < amt; i++) {
            const dist = 24 + i * 8;
            const ox = Math.cos(angle) * dist;
            const oy = Math.sin(angle) * dist;
            combat.itemPickups.push(new ItemPickup(this.x + ox, this.y + oy, matId));
          }
          angle += step;
        }
      }
      FX.burst(this.x, this.y - 8, "#f59e0b", 25, 140);
      FX.burst(this.x, this.y - 8, "#38bdf8", 16, 100);
      FX.floatingText(this.x, this.y - 32, `+${this.loot.gold} \u{1FA99}`, "#fde047");
      return true;
    }
    canInteract(playerX, playerY, maxDist = 85) {
      if (this.isOpen) return false;
      const d = Math.hypot(this.x - playerX, this.y - playerY);
      return d <= maxDist;
    }
    hitTest(worldX, worldY, padding = 26) {
      return Math.abs(worldX - this.x) <= padding && (worldY >= this.y - 36 - padding && worldY <= this.y + padding);
    }
    update(dt, player) {
      this.pulseTimer += dt;
    }
    draw(ctx) {
      Sprites.drawShadow(ctx, this.x, this.y + 2, 16);
      if (!this.isLocked && !this.isOpen) {
        const pulse = 0.65 + Math.sin(this.pulseTimer * 4.5) * 0.35;
        ctx.save();
        const beamGrad = ctx.createLinearGradient(this.x, this.y, this.x, this.y - 140);
        beamGrad.addColorStop(0, `rgba(250, 204, 21, ${0.45 * pulse})`);
        beamGrad.addColorStop(0.4, `rgba(253, 224, 71, ${0.25 * pulse})`);
        beamGrad.addColorStop(1, "rgba(250, 204, 21, 0)");
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(this.x - 14, this.y);
        ctx.lineTo(this.x + 14, this.y);
        ctx.lineTo(this.x + 28, this.y - 140);
        ctx.lineTo(this.x - 28, this.y - 140);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        const glow = ctx.createRadialGradient(this.x, this.y - 6, 6, this.x, this.y - 6, 44);
        glow.addColorStop(0, `rgba(250, 204, 21, ${0.5 * pulse})`);
        glow.addColorStop(0.6, `rgba(245, 158, 11, ${0.25 * pulse})`);
        glow.addColorStop(1, "rgba(250, 204, 21, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(this.x, this.y - 6, 44, 0, Math.PI * 2);
        ctx.fill();
      }
      const spriteType = this.isOpen ? "chest_open" : "chest_closed";
      const sprite = Tiles.getPropSprite(spriteType);
      if (sprite) {
        const sw = sprite.width * 2;
        const sh = sprite.height * 2;
        ctx.drawImage(sprite, Math.round(this.x - sw / 2), Math.round(this.y - sh + 8), sw, sh);
      }
      ctx.save();
      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "center";
      if (this.isOpen) {
        ctx.fillStyle = "#94a3b8";
        ctx.fillText("\u2713 Forziere Riscattato", Math.round(this.x), Math.round(this.y - 24));
      } else if (this.isLocked) {
        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        ctx.fillRect(Math.round(this.x - 52), Math.round(this.y - 36), 104, 16);
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 1;
        ctx.strokeRect(Math.round(this.x - 52), Math.round(this.y - 36), 104, 16);
        ctx.fillStyle = "#f87171";
        ctx.fillText(`\u{1F512} ${this.poi.title || this.name}`, Math.round(this.x), Math.round(this.y - 24));
      } else {
        const pulseY = Math.sin(this.pulseTimer * 5) * 3;
        ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
        ctx.fillRect(Math.round(this.x - 50), Math.round(this.y - 42 + pulseY), 100, 18);
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(Math.round(this.x - 50), Math.round(this.y - 42 + pulseY), 100, 18);
        ctx.fillStyle = "#fde047";
        ctx.fillText("\u2B50 [E] o Clicca per Aprire!", Math.round(this.x), Math.round(this.y - 29 + pulseY));
      }
      ctx.restore();
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
    setWeapon(weaponId = "staff", level = 1, bonusDamage = 0, cooldownReduction = 0) {
      const def = WEAPONS_DEF[weaponId] || WEAPONS_DEF.staff;
      this.weaponId = def.id;
      this.weaponLevel = Math.max(1, Math.min(def.maxLevel, level));
      this.weaponName = def.name;
      let totalDmgBonus = 0;
      let cdReduction = cooldownReduction || 0;
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
        this.baseCooldown = Math.max(0.2, def.baseStats.cooldown - cdReduction);
        this.attackRange = def.baseStats.range + rangeBonus;
        this.swordDamage = def.baseStats.damage + totalDmgBonus + bonusDamage;
        this.swordRange = this.attackRange;
        this.swordArc = fullCircle ? Math.PI * 2 : def.baseStats.arcAngle;
        this.swordKnockback = def.baseStats.knockback + knockbackBonus;
      } else if (this.weaponId === "bow") {
        this.baseCooldown = Math.max(0.25, def.baseStats.cooldown - cdReduction);
        this.attackRange = def.baseStats.range;
        this.bowDamage = def.baseStats.damage + totalDmgBonus + bonusDamage;
        this.bowPierce = def.baseStats.pierce + extraPierce;
        this.bowArrowsCount = 1 + extraArrows;
        this.bowSpeed = def.baseStats.speed;
      } else {
        this.baseCooldown = Math.max(0.28, def.baseStats.cooldown - cdReduction);
        this.attackRange = def.baseStats.range;
        this.staffDamage = def.baseStats.damage + totalDmgBonus + bonusDamage;
        this.projectilesPerShot = def.baseStats.projectiles + extraProj;
      }
      this.cooldownTimer = 0;
    }
    dealDamageToTarget(target, baseDmg, angle, knockback, attackType, player) {
      let finalDmg = baseDmg;
      let isCrit = false;
      if (player && player.critChance > 0 && Math.random() * 100 < player.critChance) {
        isCrit = true;
        const critExtra = (player.critDamage || 50) / 100;
        finalDmg = Math.round(finalDmg * (1 + critExtra));
      }
      target.takeDamage(finalDmg, angle, knockback, attackType);
      if (isCrit) {
        FX.burst(target.x, target.y - 8, "#f59e0b", 8, 140);
        FX.addFloatingText(target.x, target.y - 28, `\u{1F4A5} ${finalDmg} CRIT!`, "#fde047");
      }
      if (player && player.lifeSteal > 0 && player.hp > 0 && player.hp < player.maxHp) {
        const heal = Math.max(1, Math.round(finalDmg * (player.lifeSteal / 100)));
        player.hp = Math.min(player.maxHp, player.hp + heal);
        FX.spark(player.x, player.y - 8, "#22c55e", 2);
      }
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
      if (kind === "boss_treant") {
        drops.push("slime_gel", "slime_gel", "iron_scrap", "arcane_rune");
      } else if (kind === "boss_golem") {
        drops.push("ice_crystal", "ice_crystal", "iron_scrap", "arcane_rune");
      } else if (kind === "boss_scorpion") {
        drops.push("sun_amber", "sun_amber", "iron_scrap", "arcane_rune");
      } else if (kind === "boss_magma") {
        drops.push("magma_core", "magma_core", "iron_scrap", "arcane_rune");
      } else if (kind === "slime_forest") {
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
    findTargetNearAim(aimWorld, player) {
      if (!aimWorld) return this.findNearestTarget(player);
      let best = null;
      let bestDist2 = 95 * 95;
      for (const target of this.getAllTargets()) {
        if (target.dead || target.isDying) continue;
        const dx = target.x - aimWorld.x;
        const dy = target.y - aimWorld.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestDist2) {
          bestDist2 = d2;
          best = target;
        }
      }
      return best || this.findNearestTarget(player);
    }
    update(dt, player, world, camera, isAttacking = false, aimWorld = null) {
      this.currentTarget = this.findTargetNearAim(aimWorld, player);
      if (this.cooldownTimer > 0) {
        this.cooldownTimer -= dt;
      }
      if (isAttacking && this.cooldownTimer <= 0) {
        let aimAngle = player.facingAngle || 0;
        if (aimWorld) {
          aimAngle = Math.atan2(aimWorld.y - (player.y - 10), aimWorld.x - player.x);
          player.facing = Math.cos(aimAngle) < 0 ? "left" : "right";
          player.facingAngle = aimAngle;
        }
        if (this.weaponId === "sword") {
          this.performSwordCleave(player, aimWorld, camera, aimAngle);
          this.cooldownTimer = this.baseCooldown;
        } else if (this.weaponId === "bow") {
          this.fireBowArrows(player, aimWorld, aimAngle);
          this.cooldownTimer = this.baseCooldown;
        } else {
          this.fireArcaneDarts(player, aimWorld, aimAngle);
          this.cooldownTimer = this.baseCooldown;
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
          if (e.isBoss) {
            camera.kick(0.48);
            FX.burst(e.x, e.y - 12, "#fde047", 32, 180);
            FX.burst(e.x, e.y - 12, e.color || "#ef4444", 26, 140);
            FX.floatingText(e.x, e.y - 40, `\u{1F451} ${e.name} Sconfitto!`, "#fde047");
            if (this.onBossKilled) {
              this.onBossKilled(e);
            }
          }
          this.pickups.push(new GemPickup(e.x, e.y, e.xpValue, e.gemType));
          const drops = this.rollMonsterDrops(e.kind);
          for (const itemId of drops) {
            const ox = Math.random() * 26 - 13;
            const oy = Math.random() * 26 - 13;
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
              this.dealDamageToTarget(target, dmg, angle, 90, "magic", player);
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
            this.dealDamageToTarget(t, p.dmg, angle, p.type === "arrow" ? 140 : 115, attackType, player);
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
     * Attacco Spada: fendente ravvicinato ad area orientato verso il cursore del mouse
     */
    performSwordCleave(player, aimWorld, camera, aimAngle = null) {
      let angle = aimAngle;
      if (angle === null || angle === void 0) {
        if (aimWorld) {
          angle = Math.atan2(aimWorld.y - player.y, aimWorld.x - player.x);
        } else {
          angle = player.moveAngle || Math.PI / 2;
        }
      }
      const range = this.swordRange || 96;
      const arc = this.swordArc || Math.PI * 0.95;
      const dmg = Math.round(this.swordDamage * this.damageMultiplier);
      const knockback = this.swordKnockback || 200;
      this.slashes.push(new SlashEffect(player.x, player.y - 6, angle, range, arc));
      camera.kick(0.18);
      for (const t of this.getAllTargets()) {
        if (t.dead || t.isDying) continue;
        const dx = t.x - player.x;
        const dy = t.y - (player.y - 6);
        const dist = Math.hypot(dx, dy);
        if (dist <= range + t.r) {
          const enemyAngle = Math.atan2(dy, dx);
          let diff = Math.abs(enemyAngle - angle);
          while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);
          if (arc >= Math.PI * 1.9 || diff <= arc / 2 + 0.2) {
            this.dealDamageToTarget(t, dmg, enemyAngle, knockback, "slash", player);
            FX.burst(t.x, t.y - 8, "#f8fafc", 5, 120);
            FX.spark(t.x, t.y - 8, "#fde047", 4);
          }
        }
      }
    }
    /**
     * Attacco Arco: frecce rapide e perforanti verso il cursore del mouse
     */
    fireBowArrows(player, aimWorld, aimAngle = null) {
      let baseAngle = aimAngle;
      if (baseAngle === null || baseAngle === void 0) {
        if (aimWorld) {
          baseAngle = Math.atan2(aimWorld.y - (player.y - 12), aimWorld.x - player.x);
        } else {
          baseAngle = player.facingAngle || 0;
        }
      }
      const dmg = Math.round(this.bowDamage * this.damageMultiplier);
      const count = this.bowArrowsCount || 1;
      const spreadAngle = 0.14;
      const startAngle = baseAngle - (count - 1) * spreadAngle / 2;
      for (let i = 0; i < count; i++) {
        const angle = startAngle + i * spreadAngle;
        const spawnX = player.x + Math.cos(angle) * 12;
        const spawnY = player.y - 12 + Math.sin(angle) * 12;
        this.projectiles.push(
          new Projectile(spawnX, spawnY, angle, {
            type: "arrow",
            dmg,
            speed: this.bowSpeed || 560,
            pierce: this.bowPierce || 2
          })
        );
      }
      FX.spark(player.x, player.y - 12, "#fef08a", 5);
    }
    /**
     * Attacco Bastone: dardi arcani a ventaglio verso il cursore del mouse
     */
    fireArcaneDarts(player, aimWorld, aimAngle = null) {
      let baseAngle = aimAngle;
      if (baseAngle === null || baseAngle === void 0) {
        if (aimWorld) {
          baseAngle = Math.atan2(aimWorld.y - (player.y - 12), aimWorld.x - player.x);
        } else {
          baseAngle = player.facingAngle || 0;
        }
      }
      const baseDmg = (this.staffDamage || 18) + (player.permanentBonusDamage || 0);
      const dmg = Math.round(baseDmg * this.damageMultiplier);
      const count = this.projectilesPerShot;
      const spreadAngle = 0.2;
      const startAngle = baseAngle - (count - 1) * spreadAngle / 2;
      for (let i = 0; i < count; i++) {
        const angle = startAngle + i * spreadAngle;
        const spawnX = player.x + Math.cos(angle) * 14;
        const spawnY = player.y - 12 + Math.sin(angle) * 14;
        this.projectiles.push(
          new Projectile(spawnX, spawnY, angle, {
            type: "dart",
            speed: 400,
            dmg,
            r: 5
          })
        );
        FX.burst(spawnX, spawnY, "#38bdf8", 3, 70);
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
      this.token = localStorage.getItem("aether_auth_token") || null;
      this.nickname = localStorage.getItem("aether_nickname") || "Mago-" + Math.floor(1e3 + Math.random() * 9e3);
      this.currentUser = null;
      this.isGuest = !this.token;
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
    _authHeaders() {
      const headers = { "Content-Type": "application/json" };
      if (this.token) {
        headers["Authorization"] = `Bearer ${this.token}`;
      }
      return headers;
    }
    // =========================================================================
    // METODI DI AUTENTICAZIONE ACCOUNT
    // =========================================================================
    /**
     * Registra un nuovo account
     */
    async register(username, password, email = "") {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, email })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Errore durante la registrazione");
      }
      this.token = data.token;
      this.currentUser = data.user;
      this.nickname = data.user.username;
      this.isGuest = false;
      localStorage.setItem("aether_auth_token", this.token);
      localStorage.setItem("aether_nickname", this.nickname);
      return data;
    }
    /**
     * Effettua l'accesso a un account esistente
     */
    async login(username, password) {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Errore durante l'accesso");
      }
      this.token = data.token;
      this.currentUser = data.user;
      this.nickname = data.user.username;
      this.isGuest = false;
      localStorage.setItem("aether_auth_token", this.token);
      localStorage.setItem("aether_nickname", this.nickname);
      return data;
    }
    /**
     * Disconnette l'account e torna in modalità ospite
     */
    async logout() {
      if (this.token) {
        try {
          await fetch(`${API_BASE}/api/auth/logout`, {
            method: "POST",
            headers: this._authHeaders()
          });
        } catch {
        }
      }
      this.token = null;
      this.currentUser = null;
      this.isGuest = true;
      localStorage.removeItem("aether_auth_token");
    }
    /**
     * Tenta di ripristinare la sessione attiva salvata in localStorage
     */
    async restoreSession() {
      if (!this.token) {
        this.isGuest = true;
        return null;
      }
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          method: "GET",
          headers: this._authHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            this.currentUser = data.user;
            this.nickname = data.user.username;
            this.isGuest = false;
            localStorage.setItem("aether_nickname", this.nickname);
            return data;
          }
        }
      } catch {
      }
      return null;
    }
    // =========================================================================
    // LOGICA OFFLINE LOCALSTORAGE (Per ospiti o assenza di connessione)
    // =========================================================================
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
            copper_ore: 6,
            ancient_wood: 4,
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
          equippedWeapon: "staff",
          equipment: {
            armor: null,
            helmet: null,
            boots: null,
            amulet: null,
            ring: null
          },
          craftedItems: [],
          inAppPurchases: []
        };
        localStorage.setItem(key, JSON.stringify(p));
      }
      if (!p.inventory) {
        p.inventory = {
          copper_ore: 6,
          ancient_wood: 4,
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
      if (!p.equippedSkin) {
        p.equippedSkin = localStorage.getItem("aether_equipped_skin") || "hero_hunter";
      }
      if (!p.unlockedSkins) {
        p.unlockedSkins = ["hero_hunter", "hero_spartan", "hero_pirate", "hero_adventurer", "hero_knight", "hero_mage"];
      }
      if (!p.equipment) {
        p.equipment = { armor: null, helmet: null, boots: null, amulet: null, ring: null };
      }
      if (!Array.isArray(p.craftedItems)) {
        p.craftedItems = [];
      }
      if (!p.inAppPurchases) {
        p.inAppPurchases = [];
      }
      return p;
    }
    _saveLocalProfile(profile) {
      const key = `aether_profile_${profile.nickname.toLowerCase()}`;
      localStorage.setItem(key, JSON.stringify(profile));
    }
    _formatProfile(profile) {
      const talents = profile.talents || {};
      const equipment = profile.equipment || {};
      const bonusHpTalent = (talents.max_hp || 0) * (TALENTS_DEF.max_hp?.bonusPerRank || 15);
      const bonusDmgTalent = (talents.damage || 0) * (TALENTS_DEF.damage?.bonusPerRank || 3);
      const speedMultTalent = (talents.speed || 0) * (TALENTS_DEF.speed?.bonusPerRank || 0.04);
      const magnetMultTalent = (talents.magnet || 0) * (TALENTS_DEF.magnet?.bonusPerRank || 0.08);
      const goldMultTalent = (talents.gold_gain || 0) * (TALENTS_DEF.gold_gain?.bonusPerRank || 0.1);
      let bonusHp = bonusHpTalent;
      let defense = 0;
      let bonusDamage = bonusDmgTalent;
      let speedBonusTotal = 0;
      let critChance = 0;
      let critDamage = 50;
      let hpRegen = 0;
      let lifeSteal = 0;
      let dodgeChance = 0;
      let cooldownReduction = 0;
      let ignoreWaterSlow = false;
      if (equipment && typeof equipment === "object") {
        for (const [slot, eqId] of Object.entries(equipment)) {
          if (!eqId) continue;
          const eqDef = EQUIPMENT_DEF[eqId];
          if (eqDef && eqDef.stats) {
            const s = eqDef.stats;
            if (s.maxHp) bonusHp += s.maxHp;
            if (s.defense) defense += s.defense;
            if (s.bonusDamage) bonusDamage += s.bonusDamage;
            if (s.speedBonus) speedBonusTotal += s.speedBonus;
            if (s.critChance) critChance += s.critChance;
            if (s.critDamage) critDamage += s.critDamage;
            if (s.hpRegen) hpRegen += s.hpRegen;
            if (s.lifeSteal) lifeSteal += s.lifeSteal;
            if (s.dodgeChance) dodgeChance += s.dodgeChance;
            if (s.cooldownReduction) cooldownReduction += s.cooldownReduction;
            if (s.ignoreWaterSlow) ignoreWaterSlow = true;
          }
        }
      }
      const damageReductionPercent = defense > 0 ? Math.round(defense / (defense + 100) * 100) : 0;
      const calculatedStats = {
        bonusHp,
        defense,
        damageReductionPercent,
        bonusDamage,
        speedMultiplier: 1 + speedMultTalent + speedBonusTotal / 100,
        speedBonusPercent: Math.round(speedMultTalent * 100 + speedBonusTotal),
        magnetMultiplier: 1 + magnetMultTalent,
        goldMultiplier: 1 + goldMultTalent,
        critChance: Math.min(75, critChance),
        critDamage,
        hpRegen,
        lifeSteal,
        dodgeChance: Math.min(50, dodgeChance),
        cooldownReduction: Math.min(0.4, cooldownReduction),
        ignoreWaterSlow
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
      const equipmentCatalog = Object.values(EQUIPMENT_DEF).map((def) => {
        const isEquipped = profile.equipment && profile.equipment[def.slot] === def.id;
        const isOwned = (profile.craftedItems || []).includes(def.id);
        let canCraft = profile.gold >= (def.craftCost?.gold || 0);
        if (canCraft && def.craftCost?.materials) {
          for (const [mId, amt] of Object.entries(def.craftCost.materials)) {
            if ((profile.inventory[mId] || 0) < amt) {
              canCraft = false;
              break;
            }
          }
        }
        return {
          ...def,
          isEquipped,
          isOwned,
          canCraft
        };
      });
      const refiningCatalog = REFINING_RECIPES.map((rec) => {
        let canRefine = profile.gold >= (rec.goldCost || 0);
        if (canRefine && rec.inputs) {
          for (const [mId, amt] of Object.entries(rec.inputs)) {
            if ((profile.inventory[mId] || 0) < amt) {
              canRefine = false;
              break;
            }
          }
        }
        return {
          ...rec,
          canRefine,
          outputDef: MATERIALS_DEF[rec.output.itemId] || { name: rec.output.itemId, icon: "\u{1F4E6}", color: "#fff" }
        };
      });
      const salvageCatalog = (profile.craftedItems || []).map((eqId) => {
        const def = EQUIPMENT_DEF[eqId] || { id: eqId, name: eqId, slot: "unknown", icon: "\u{1F4E6}", rarity: "Comune", salvageYield: {} };
        const isEquipped = profile.equipment && profile.equipment[def.slot] === eqId;
        return {
          ...def,
          isEquipped
        };
      });
      const equippedPieces = {};
      for (const slot of ["armor", "helmet", "boots", "amulet", "ring"]) {
        const eqId = profile.equipment ? profile.equipment[slot] : null;
        equippedPieces[slot] = eqId ? EQUIPMENT_DEF[eqId] || null : null;
      }
      return {
        ...profile,
        calculatedStats,
        talentsCatalog,
        weaponsCatalog,
        inventoryCatalog,
        equipmentCatalog,
        refiningCatalog,
        salvageCatalog,
        equippedPieces
      };
    }
    // =========================================================================
    // METODI PUBBLICI DI GIOCO
    // =========================================================================
    async getProfile(nickname = this.nickname) {
      this.nickname = nickname;
      localStorage.setItem("aether_nickname", nickname);
      try {
        const headers = this._authHeaders();
        const res = await fetch(`${API_BASE}/api/profile/${encodeURIComponent(nickname)}`, { headers });
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
            headers: this._authHeaders(),
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
            headers: this._authHeaders(),
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
            headers: this._authHeaders(),
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
    async equipSkin(skinId) {
      localStorage.setItem("aether_equipped_skin", skinId);
      if (this.isOnline) {
        try {
          const res = await fetch(`${API_BASE}/api/skin/equip`, {
            method: "POST",
            headers: this._authHeaders(),
            body: JSON.stringify({ nickname: this.nickname, skinId })
          });
          if (res.ok) {
            const json = await res.json();
            if (json.success) return json.profile;
          }
        } catch {
        }
      }
      const p = this._getLocalProfile(this.nickname);
      p.equippedSkin = skinId;
      this._saveLocalProfile(p);
      return this._formatProfile(p);
    }
    async craftEquipment(equipId) {
      if (this.isOnline) {
        try {
          const res = await fetch(`${API_BASE}/api/blacksmith/craft-equipment`, {
            method: "POST",
            headers: this._authHeaders(),
            body: JSON.stringify({ nickname: this.nickname, equipId })
          });
          if (res.ok) {
            const json = await res.json();
            if (json.success) return json.profile;
          }
        } catch (err) {
          console.warn("Errore server forgiatura equipaggiamento, fallback offline:", err);
        }
      }
      const p = this._getLocalProfile(this.nickname);
      const def = EQUIPMENT_DEF[equipId];
      if (!def) throw new Error("Pezzo d'equipaggiamento non valido");
      const goldCost = def.craftCost?.gold || 0;
      const matsCost = def.craftCost?.materials || {};
      if (p.gold < goldCost) throw new Error(`Oro insufficiente: servono ${goldCost} oro`);
      for (const [mId, req] of Object.entries(matsCost)) {
        if ((p.inventory[mId] || 0) < req) {
          const matDef = MATERIALS_DEF[mId] || { name: mId };
          throw new Error(`Materiale insufficiente: servono ${req}x ${matDef.name}`);
        }
      }
      p.gold -= goldCost;
      for (const [mId, req] of Object.entries(matsCost)) {
        p.inventory[mId] = Math.max(0, (p.inventory[mId] || 0) - req);
      }
      p.craftedItems = p.craftedItems || [];
      p.craftedItems.push(equipId);
      p.equipment = p.equipment || {};
      if (!p.equipment[def.slot]) {
        p.equipment[def.slot] = equipId;
      }
      this._saveLocalProfile(p);
      return this._formatProfile(p);
    }
    async equipItem(equipId) {
      if (this.isOnline) {
        try {
          const res = await fetch(`${API_BASE}/api/equipment/equip`, {
            method: "POST",
            headers: this._authHeaders(),
            body: JSON.stringify({ nickname: this.nickname, equipId })
          });
          if (res.ok) {
            const json = await res.json();
            if (json.success) return json.profile;
          }
        } catch {
        }
      }
      const p = this._getLocalProfile(this.nickname);
      const def = EQUIPMENT_DEF[equipId];
      if (!def) throw new Error("Oggetto non valido");
      if (!p.craftedItems || !p.craftedItems.includes(equipId)) {
        throw new Error("Non possiedi questo oggetto!");
      }
      p.equipment = p.equipment || {};
      p.equipment[def.slot] = equipId;
      this._saveLocalProfile(p);
      return this._formatProfile(p);
    }
    async unequipItem(slot) {
      if (this.isOnline) {
        try {
          const res = await fetch(`${API_BASE}/api/equipment/unequip`, {
            method: "POST",
            headers: this._authHeaders(),
            body: JSON.stringify({ nickname: this.nickname, slot })
          });
          if (res.ok) {
            const json = await res.json();
            if (json.success) return json.profile;
          }
        } catch {
        }
      }
      const p = this._getLocalProfile(this.nickname);
      p.equipment = p.equipment || {};
      p.equipment[slot] = null;
      this._saveLocalProfile(p);
      return this._formatProfile(p);
    }
    async refineResource(recipeId, quantity = 1) {
      if (this.isOnline) {
        try {
          const res = await fetch(`${API_BASE}/api/blacksmith/refine`, {
            method: "POST",
            headers: this._authHeaders(),
            body: JSON.stringify({ nickname: this.nickname, recipeId, quantity })
          });
          if (res.ok) {
            const json = await res.json();
            if (json.success) return json.profile;
          }
        } catch (err) {
          console.warn("Errore server raffinazione, fallback offline:", err);
        }
      }
      const p = this._getLocalProfile(this.nickname);
      const recipe = REFINING_RECIPES.find((r) => r.id === recipeId);
      if (!recipe) throw new Error("Ricetta non valida");
      const times = Math.max(1, Math.min(50, Math.floor(quantity)));
      const totalGold = (recipe.goldCost || 0) * times;
      if (p.gold < totalGold) throw new Error(`Oro insufficiente: servono ${totalGold} oro`);
      for (const [mId, req] of Object.entries(recipe.inputs)) {
        const totalReq = req * times;
        if ((p.inventory[mId] || 0) < totalReq) {
          const matDef = MATERIALS_DEF[mId] || { name: mId };
          throw new Error(`Materiali insufficienti: servono ${totalReq}x ${matDef.name}`);
        }
      }
      p.gold -= totalGold;
      for (const [mId, req] of Object.entries(recipe.inputs)) {
        p.inventory[mId] = Math.max(0, (p.inventory[mId] || 0) - req * times);
      }
      const outId = recipe.output.itemId;
      const outAmt = (recipe.output.count || 1) * times;
      p.inventory[outId] = (p.inventory[outId] || 0) + outAmt;
      this._saveLocalProfile(p);
      return this._formatProfile(p);
    }
    async salvageItem(equipId) {
      if (this.isOnline) {
        try {
          const res = await fetch(`${API_BASE}/api/blacksmith/salvage`, {
            method: "POST",
            headers: this._authHeaders(),
            body: JSON.stringify({ nickname: this.nickname, equipId })
          });
          if (res.ok) {
            const json = await res.json();
            if (json.success) return json.profile;
          }
        } catch (err) {
          console.warn("Errore server salvage, fallback offline:", err);
        }
      }
      const p = this._getLocalProfile(this.nickname);
      const def = EQUIPMENT_DEF[equipId];
      if (!def) throw new Error("Oggetto non valido");
      const idx = (p.craftedItems || []).indexOf(equipId);
      if (idx === -1) throw new Error("Non possiedi questo oggetto!");
      p.craftedItems.splice(idx, 1);
      if (p.equipment && p.equipment[def.slot] === equipId) {
        if (!p.craftedItems.includes(equipId)) {
          p.equipment[def.slot] = null;
        }
      }
      if (def.salvageYield) {
        for (const [mId, count] of Object.entries(def.salvageYield)) {
          p.inventory[mId] = (p.inventory[mId] || 0) + count;
        }
      }
      this._saveLocalProfile(p);
      return this._formatProfile(p);
    }
    async submitRun(runStats) {
      if (this.isOnline) {
        try {
          const res = await fetch(`${API_BASE}/api/runs/complete`, {
            method: "POST",
            headers: this._authHeaders(),
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
    const titleCanvas = document.getElementById("title-bg-canvas");
    const titleCtx = titleCanvas ? titleCanvas.getContext("2d") : null;
    const elNicknameDisplay = document.getElementById("player-nickname-display");
    const elAccountBadge = document.getElementById("account-status-badge");
    const btnSwitchAccount = document.getElementById("btn-switch-account");
    const elMenuGold = document.getElementById("menu-gold");
    const elStatKills = document.getElementById("stat-kills");
    const elStatHighLvl = document.getElementById("stat-high-lvl");
    const elStatBestTime = document.getElementById("stat-best-time");
    const elServerStatus = document.getElementById("server-status");
    const btnStartRun = document.getElementById("btn-start-run");
    const authModal = document.getElementById("auth-modal");
    const authTabBtnLogin = document.getElementById("auth-tab-btn-login");
    const authTabBtnRegister = document.getElementById("auth-tab-btn-register");
    const authAlert = document.getElementById("auth-alert");
    const formLogin = document.getElementById("form-login");
    const formRegister = document.getElementById("form-register");
    const inputLoginUser = document.getElementById("login-username");
    const inputLoginPass = document.getElementById("login-password");
    const inputRegUser = document.getElementById("register-username");
    const inputRegEmail = document.getElementById("register-email");
    const inputRegPass = document.getElementById("register-password");
    const inputRegPassConfirm = document.getElementById("register-password-confirm");
    const btnContinueGuest = document.getElementById("btn-continue-guest");
    const btnOpenLeaderboard = document.getElementById("btn-open-leaderboard");
    const leaderboardModal = document.getElementById("leaderboard-modal");
    const leaderboardRows = document.getElementById("leaderboard-rows");
    const btnCloseLeaderboard = document.getElementById("btn-close-leaderboard");
    const btnCloseLeaderboardFoot = document.getElementById("btn-close-leaderboard-foot");
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
    const weaponNotification = document.getElementById("weapon-notification");
    const hudBtnBag = document.getElementById("hud-btn-bag");
    const hudBtnMap = document.getElementById("hud-btn-map");
    const hudBtnMenu = document.getElementById("hud-btn-menu");
    const minimapWidget = document.getElementById("minimap-widget");
    const minimapCanvas = document.getElementById("minimap-canvas");
    const minimapCtx = minimapCanvas ? minimapCanvas.getContext("2d") : null;
    const minimapBiomeName = document.getElementById("minimap-biome-name");
    const btnExpandMinimap = document.getElementById("btn-expand-minimap");
    const expandedMapModal = document.getElementById("expanded-map-modal");
    const expandedCanvas = document.getElementById("expanded-map-canvas");
    const expandedCtx = expandedCanvas ? expandedCanvas.getContext("2d") : null;
    const mapCoordsText = document.getElementById("map-coords-text");
    const mapCurrentBiomeText = document.getElementById("map-current-biome-text");
    const btnCloseMap = document.getElementById("btn-close-map");
    const btnResumeFromMap = document.getElementById("btn-resume-from-map");
    const ingameModal = document.getElementById("ingame-inventory-modal");
    const btnCloseBag = document.getElementById("btn-close-bag");
    const btnResumeGame = document.getElementById("btn-resume-game");
    const ingameTabBtnLoot = document.getElementById("ingame-tab-btn-loot");
    const ingameTabBtnTalents = document.getElementById("ingame-tab-btn-talents");
    const ingameTabBtnForge = document.getElementById("ingame-tab-btn-forge");
    const ingameTabBtnWeapons = document.getElementById("ingame-tab-btn-weapons");
    const ingameTabLoot = document.getElementById("ingame-tab-loot");
    const ingameTabTalents = document.getElementById("ingame-tab-talents");
    const ingameTabForge = document.getElementById("ingame-tab-forge");
    const ingameTabWeapons = document.getElementById("ingame-tab-weapons");
    const ingameLootContainer = document.getElementById("ingame-loot-container");
    const talentsContainer = document.getElementById("talents-container");
    const ingameForgeContainer = document.getElementById("ingame-forge-container");
    const ingameWeaponsContainer = document.getElementById("ingame-weapons-container");
    const gameMenuModal = document.getElementById("game-menu-modal");
    const btnCloseGameMenu = document.getElementById("btn-close-game-menu");
    const btnMenuResume = document.getElementById("btn-menu-resume");
    const btnMenuQuit = document.getElementById("btn-menu-quit");
    const menuTabBtnSettings = document.getElementById("menu-tab-btn-settings");
    const menuTabBtnShop = document.getElementById("menu-tab-btn-shop");
    const menuTabBtnFriends = document.getElementById("menu-tab-btn-friends");
    const menuTabBtnStats = document.getElementById("menu-tab-btn-stats");
    const menuTabSettings = document.getElementById("menu-tab-settings");
    const menuTabShop = document.getElementById("menu-tab-shop");
    const menuTabFriends = document.getElementById("menu-tab-friends");
    const menuTabStats = document.getElementById("menu-tab-stats");
    const settingVolume = document.getElementById("setting-volume");
    const settingDmgNumbers = document.getElementById("setting-dmg-numbers");
    const settingFxSparks = document.getElementById("setting-fx-sparks");
    const btnToggleFullscreen = document.getElementById("btn-toggle-fullscreen");
    const myFriendIdDisplay = document.getElementById("my-friend-id-display");
    const btnCopyFriendCode = document.getElementById("btn-copy-friend-code");
    const menuStatTime = document.getElementById("menu-stat-time");
    const menuStatLvl = document.getElementById("menu-stat-lvl");
    const menuStatKills = document.getElementById("menu-stat-kills");
    const menuStatGold = document.getElementById("menu-stat-gold");
    const elSumTime = document.getElementById("sum-time");
    const elSumLevel = document.getElementById("sum-level");
    const elSumKills = document.getElementById("sum-kills");
    const elSumGold = document.getElementById("sum-gold");
    const elSumItems = document.getElementById("sum-items");
    const elSumScore = document.getElementById("sum-score");
    const btnReturnSanctuary = document.getElementById("btn-return-sanctuary");
    const hudInteractPrompt = document.getElementById("hud-interact-prompt");
    const hudInteractLabel = document.getElementById("hud-interact-label");
    const blacksmithModal = document.getElementById("blacksmith-modal");
    const bsModalName = document.getElementById("bs-modal-name");
    const bsModalTitle = document.getElementById("bs-modal-title");
    const bsModalQuote = document.getElementById("bs-modal-quote");
    const blacksmithForgeContainer = document.getElementById("blacksmith-forge-container");
    const btnCloseBlacksmith = document.getElementById("btn-close-blacksmith");
    const btnResumeFromBlacksmith = document.getElementById("btn-resume-from-blacksmith");
    const forgeNearBlacksmithBtnBox = document.getElementById("forge-near-blacksmith-btn-box");
    const btnOpenNearBlacksmith = document.getElementById("btn-open-near-blacksmith");
    const nearBsName = document.getElementById("near-bs-name");
    const hudBtnTeleport = document.getElementById("hud-btn-teleport");
    const teleportModal = document.getElementById("teleport-modal");
    const btnCloseTeleport = document.getElementById("btn-close-teleport");
    const btnResumeFromTeleport = document.getElementById("btn-resume-from-teleport");
    const teleportDestinationsList = document.getElementById("teleport-destinations-list");
    const bsTabBtnCraft = document.getElementById("bs-tab-btn-craft");
    const bsTabBtnRefine = document.getElementById("bs-tab-btn-refine");
    const bsTabBtnSalvage = document.getElementById("bs-tab-btn-salvage");
    const bsTabBtnHero = document.getElementById("bs-tab-btn-hero");
    const bsTabCraft = document.getElementById("bs-tab-craft");
    const bsTabRefine = document.getElementById("bs-tab-refine");
    const bsTabSalvage = document.getElementById("bs-tab-salvage");
    const bsTabHero = document.getElementById("bs-tab-hero");
    const blacksmithRefineContainer = document.getElementById("blacksmith-refine-container");
    const blacksmithSalvageContainer = document.getElementById("blacksmith-salvage-container");
    const blacksmithHeroContainer = document.getElementById("blacksmith-hero-container");
    const ingameTabBtnEquipment = document.getElementById("ingame-tab-btn-equipment");
    const ingameTabEquipment = document.getElementById("ingame-tab-equipment");
    const ingameHeroContainer = document.getElementById("ingame-hero-container");
    const heroPreviewCanvas = document.getElementById("hero-preview-canvas");
    const heroPreviewCtx = heroPreviewCanvas ? heroPreviewCanvas.getContext("2d") : null;
    const btnPrevSkin = document.getElementById("btn-prev-skin");
    const btnNextSkin = document.getElementById("btn-next-skin");
    const heroSkinBadgeIcon = document.getElementById("hero-skin-badge-icon");
    const heroSkinBadgeName = document.getElementById("hero-skin-badge-name");
    const heroSkinBadgeStatus = document.getElementById("hero-skin-badge-status");
    const ingameTabBtnSkins = document.getElementById("ingame-tab-btn-skins");
    const ingameTabSkins = document.getElementById("ingame-tab-skins");
    const ingameSkinsContainer = document.getElementById("ingame-skins-container");
    let currentCraftCategory = "all";
    let currentBsTab = "craft";
    let gameState = "MENU";
    let currentProfile = null;
    let runSurvivalSeconds = 0;
    let isInventoryOpen = false;
    let isMapOpen = false;
    let isMenuOpen = false;
    let isBlacksmithOpen = false;
    let isTeleportOpen = false;
    let currentNearbyInteractable = null;
    let activeBlacksmith = null;
    let chests = [];
    let mysteryPillars = [];
    let notificationTimeout = null;
    let mouseScreen = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    let isMouseDown = false;
    window.addEventListener("mousemove", (e) => {
      mouseScreen.x = e.clientX;
      mouseScreen.y = e.clientY;
    });
    window.addEventListener("mousedown", (e) => {
      if (e.button === 0) {
        isMouseDown = true;
        if (gameState === "PLAYING" && !isInventoryOpen && !isMapOpen && !isMenuOpen && !isBlacksmithOpen && !isTeleportOpen) {
          const aim = camera.screenToWorld(e.clientX, e.clientY, canvas);
          const didInteract = handleWorldClickInteraction(aim);
          if (didInteract) {
            isMouseDown = false;
          }
        }
      }
    });
    window.addEventListener("mouseup", (e) => {
      if (e.button === 0) {
        isMouseDown = false;
      }
    });
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
    function getBiomeInfo(worldX, worldY) {
      const sz = world.getSafeZone(worldX, worldY);
      if (sz) {
        return { key: "village", name: `\u{1F3F0} ${sz.name}`, color: sz.color };
      }
      const tx = world.tileOf(worldX);
      const ty = world.tileOf(worldY);
      const biomeKey = world.getBiome(tx, ty);
      switch (biomeKey) {
        case "river":
          return { key: "river", name: "\u{1F30A} Fiume & Cascate", color: "#06b6d4" };
        case "snow":
          return { key: "snow", name: "\u2744\uFE0F Vette Innevate", color: "#7dd3fc" };
        case "desert":
          return { key: "desert", name: "\u{1F3DC}\uFE0F Deserto delle Dune", color: "#f59e0b" };
        case "volcano":
          return { key: "volcano", name: "\u{1F30B} Caldera Vulcanica", color: "#ef4444" };
        case "forest":
        default:
          return { key: "forest", name: "\u{1F332} Bosco Silvano", color: "#22c55e" };
      }
    }
    let titleParticles = [];
    function initTitleParticles() {
      if (!titleCanvas) return;
      titleCanvas.width = window.innerWidth;
      titleCanvas.height = window.innerHeight;
      titleParticles = [];
      const count = Math.min(85, Math.floor(window.innerWidth / 16));
      for (let i = 0; i < count; i++) {
        titleParticles.push({
          x: Math.random() * titleCanvas.width,
          y: Math.random() * titleCanvas.height,
          radius: 1 + Math.random() * 2.6,
          speedY: 18 + Math.random() * 38,
          speedX: (Math.random() - 0.5) * 16,
          alpha: 0.2 + Math.random() * 0.7,
          color: Math.random() > 0.4 ? "#38bdf8" : Math.random() > 0.5 ? "#a855f7" : "#fde047",
          phase: Math.random() * Math.PI * 2
        });
      }
    }
    function updateAndDrawTitleBackground(dt, time) {
      if (!titleCtx || !titleCanvas || gameState !== "MENU") return;
      titleCtx.clearRect(0, 0, titleCanvas.width, titleCanvas.height);
      const cx = titleCanvas.width / 2;
      const cy = titleCanvas.height / 2;
      const grad = titleCtx.createRadialGradient(cx, cy, 80, cx, cy, Math.max(cx, cy));
      grad.addColorStop(0, "rgba(14, 165, 233, 0.15)");
      grad.addColorStop(0.45, "rgba(88, 28, 135, 0.08)");
      grad.addColorStop(1, "rgba(5, 8, 17, 0)");
      titleCtx.fillStyle = grad;
      titleCtx.fillRect(0, 0, titleCanvas.width, titleCanvas.height);
      titleCtx.save();
      titleCtx.translate(cx, cy * 0.72);
      titleCtx.rotate(time * 0.05);
      titleCtx.strokeStyle = "rgba(56, 189, 248, 0.09)";
      titleCtx.lineWidth = 1.5;
      titleCtx.beginPath();
      titleCtx.arc(0, 0, 190, 0, Math.PI * 2);
      titleCtx.stroke();
      titleCtx.beginPath();
      titleCtx.arc(0, 0, 150, 0, Math.PI * 2);
      titleCtx.stroke();
      for (let a = 0; a < 8; a++) {
        const angle = a * Math.PI / 4;
        titleCtx.beginPath();
        titleCtx.moveTo(Math.cos(angle) * 150, Math.sin(angle) * 150);
        titleCtx.lineTo(Math.cos(angle) * 190, Math.sin(angle) * 190);
        titleCtx.stroke();
      }
      titleCtx.restore();
      for (const p of titleParticles) {
        p.y -= p.speedY * dt;
        p.x += Math.sin(time * 1.5 + p.phase) * (p.speedX * dt);
        if (p.y < -10) {
          p.y = titleCanvas.height + 10;
          p.x = Math.random() * titleCanvas.width;
        }
        const pulseAlpha = Math.sin(time * 2 + p.phase) * 0.2 + p.alpha;
        titleCtx.save();
        titleCtx.globalAlpha = Math.max(0.1, Math.min(1, pulseAlpha));
        titleCtx.fillStyle = p.color;
        titleCtx.beginPath();
        titleCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        titleCtx.fill();
        titleCtx.restore();
      }
    }
    const allSkins = Sprites.getSkins();
    let currentSkinIndex = 0;
    function updateSkinBadge() {
      const skin = allSkins[currentSkinIndex] || allSkins[0];
      if (!skin) return;
      if (heroSkinBadgeIcon) heroSkinBadgeIcon.textContent = skin.icon;
      if (heroSkinBadgeName) heroSkinBadgeName.textContent = skin.name;
      if (heroSkinBadgeStatus) {
        const isEquipped = player.skin === skin.id;
        heroSkinBadgeStatus.textContent = isEquipped ? "In Uso" : "Clicca per equipaggiare";
        heroSkinBadgeStatus.className = isEquipped ? "skin-equipped-tag" : "skin-select-tag";
      }
    }
    async function selectSkinByIndex(idx) {
      if (idx < 0) idx = allSkins.length - 1;
      if (idx >= allSkins.length) idx = 0;
      currentSkinIndex = idx;
      const skin = allSkins[currentSkinIndex];
      player.setSkin(skin.id);
      updateSkinBadge();
      try {
        currentProfile = await API.equipSkin(skin.id);
      } catch (err) {
        console.warn("Errore salvataggio skin:", err);
      }
      renderIngameSkins();
    }
    function updateAndDrawHeroPreview(dt, time) {
      if (!heroPreviewCtx || !heroPreviewCanvas || gameState !== "MENU") return;
      heroPreviewCtx.clearRect(0, 0, heroPreviewCanvas.width, heroPreviewCanvas.height);
      const skin = allSkins[currentSkinIndex] || allSkins[0];
      const animTimer = time * 2;
      const bob = Math.round(Math.sin(animTimer * 2.5) * 1.5);
      heroPreviewCtx.save();
      heroPreviewCtx.fillStyle = "rgba(10, 15, 26, 0.45)";
      heroPreviewCtx.beginPath();
      heroPreviewCtx.ellipse(32, 68, 18, 6, 0, 0, Math.PI * 2);
      heroPreviewCtx.fill();
      heroPreviewCtx.restore();
      Sprites.drawHero(heroPreviewCtx, 32, 66 + bob, 0, false, 1, player.weapon, animTimer, skin.id);
    }
    function renderIngameSkins() {
      if (!ingameSkinsContainer) return;
      ingameSkinsContainer.innerHTML = "";
      allSkins.forEach((skin, idx) => {
        const isEquipped = player.skin === skin.id;
        const card = document.createElement("div");
        card.className = `skin-card ${isEquipped ? "active" : ""}`;
        const pedestal = document.createElement("div");
        pedestal.className = "skin-card-pedestal";
        const c = document.createElement("canvas");
        c.className = "skin-card-canvas";
        c.width = 48;
        c.height = 60;
        const cCtx = c.getContext("2d");
        Sprites.drawHero(cCtx, 24, 52, 0, false, 1, player.weapon, 0, skin.id);
        pedestal.appendChild(c);
        card.appendChild(pedestal);
        const header = document.createElement("div");
        header.className = "skin-card-header";
        header.innerHTML = `
        <div class="skin-card-title">${skin.icon} ${skin.name}</div>
        <div class="skin-card-role">${skin.role}</div>
      `;
        card.appendChild(header);
        const desc = document.createElement("div");
        desc.className = "skin-card-desc";
        desc.textContent = skin.desc;
        card.appendChild(desc);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `btn-equip-skin ${isEquipped ? "btn-equipped" : "btn-to-equip"}`;
        btn.textContent = isEquipped ? "\u2713 IN USO" : "EQUIPAGGIA";
        btn.addEventListener("click", async (e) => {
          e.stopPropagation();
          if (isEquipped) return;
          selectSkinByIndex(idx);
          showWeaponNotification(`\u{1F3AD} Aspetto equipaggiato: ${skin.name}!`);
        });
        card.appendChild(btn);
        card.addEventListener("click", () => {
          if (!isEquipped) {
            selectSkinByIndex(idx);
            showWeaponNotification(`\u{1F3AD} Aspetto equipaggiato: ${skin.name}!`);
          }
        });
        ingameSkinsContainer.appendChild(card);
      });
    }
    if (btnPrevSkin) {
      btnPrevSkin.addEventListener("click", (e) => {
        e.stopPropagation();
        selectSkinByIndex(currentSkinIndex - 1);
      });
    }
    if (btnNextSkin) {
      btnNextSkin.addEventListener("click", (e) => {
        e.stopPropagation();
        selectSkinByIndex(currentSkinIndex + 1);
      });
    }
    if (heroSkinBadgeStatus) {
      heroSkinBadgeStatus.addEventListener("click", () => {
        selectSkinByIndex(currentSkinIndex);
      });
    }
    async function refreshProfile(nickname = API.currentUser ? API.currentUser.username : API.nickname) {
      currentProfile = await API.getProfile(nickname || "Mago-" + Math.floor(1e3 + Math.random() * 9e3));
      if (currentProfile && currentProfile.equippedSkin) {
        player.setSkin(currentProfile.equippedSkin);
      }
      const foundIdx = allSkins.findIndex((s) => s.id === player.skin);
      if (foundIdx >= 0) currentSkinIndex = foundIdx;
      updateSkinBadge();
      if (elNicknameDisplay) {
        elNicknameDisplay.textContent = currentProfile.nickname;
      }
      if (myFriendIdDisplay) {
        const code = Math.abs(currentProfile.nickname.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 1e3)) % 9e3 + 1e3;
        myFriendIdDisplay.textContent = `AETH-${code}`;
      }
      if (elAccountBadge) {
        if (API.isGuest) {
          elAccountBadge.textContent = "\u26A0\uFE0F Ospite (Locale)";
          elAccountBadge.className = "badge-guest";
        } else {
          elAccountBadge.textContent = "\u{1F6E1}\uFE0F Online";
          elAccountBadge.className = "badge-account";
        }
      }
      if (elMenuGold) elMenuGold.textContent = `${currentProfile.gold}`;
      if (elStatKills) elStatKills.textContent = `${currentProfile.totalKills || 0}`;
      if (elStatHighLvl) elStatHighLvl.textContent = `${currentProfile.highestLevel || 1}`;
      if (elStatBestTime) elStatBestTime.textContent = formatTime(currentProfile.bestSurvivalSeconds || 0);
      if (elServerStatus) {
        if (API.isOnline) {
          elServerStatus.textContent = "Online";
          elServerStatus.className = "status-online";
        } else {
          elServerStatus.textContent = "Offline (Locale)";
          elServerStatus.className = "status-offline";
        }
      }
      renderTalentsGrid();
      renderIngameWeapons();
      renderIngameForge();
      renderIngameLoot();
      renderIngameSkins();
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
              player.applyPermanentStats(currentProfile.calculatedStats);
              showWeaponNotification(`\u2728 Talento potenziato: ${talent.name}!`);
              refreshProfile(currentProfile.nickname);
            } catch (err) {
              alert(err.message);
            }
          });
        }
        talentsContainer.appendChild(card);
      });
    }
    async function renderLeaderboard() {
      if (!leaderboardRows) return;
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
    if (btnOpenLeaderboard) {
      btnOpenLeaderboard.addEventListener("click", () => {
        leaderboardModal?.classList.remove("hidden");
        renderLeaderboard();
      });
    }
    if (btnCloseLeaderboard) btnCloseLeaderboard.addEventListener("click", () => leaderboardModal?.classList.add("hidden"));
    if (btnCloseLeaderboardFoot) btnCloseLeaderboardFoot.addEventListener("click", () => leaderboardModal?.classList.add("hidden"));
    function showAuthAlert(msg, isError = true) {
      if (!authAlert) return;
      authAlert.textContent = msg;
      authAlert.className = `auth-alert ${isError ? "error" : "success"}`;
      authAlert.classList.remove("hidden");
    }
    function hideAuthAlert() {
      if (!authAlert) return;
      authAlert.classList.add("hidden");
    }
    function openAuthModal(initialTab = "login") {
      hideAuthAlert();
      authModal?.classList.remove("hidden");
      switchAuthTab(initialTab);
    }
    function closeAuthModal() {
      authModal?.classList.add("hidden");
    }
    function switchAuthTab(tab) {
      hideAuthAlert();
      if (tab === "login") {
        authTabBtnLogin?.classList.add("active");
        authTabBtnRegister?.classList.remove("active");
        formLogin?.classList.remove("hidden");
        formRegister?.classList.add("hidden");
        if (inputLoginUser) inputLoginUser.focus();
      } else {
        authTabBtnRegister?.classList.add("active");
        authTabBtnLogin?.classList.remove("active");
        formRegister?.classList.remove("hidden");
        formLogin?.classList.add("hidden");
        if (inputRegUser) inputRegUser.focus();
      }
    }
    if (authTabBtnLogin) authTabBtnLogin.addEventListener("click", () => switchAuthTab("login"));
    if (authTabBtnRegister) authTabBtnRegister.addEventListener("click", () => switchAuthTab("register"));
    if (btnSwitchAccount) {
      btnSwitchAccount.addEventListener("click", () => {
        openAuthModal("login");
      });
    }
    if (btnContinueGuest) {
      btnContinueGuest.addEventListener("click", () => {
        API.isGuest = true;
        closeAuthModal();
        refreshProfile();
      });
    }
    if (formLogin) {
      formLogin.addEventListener("submit", async (e) => {
        e.preventDefault();
        hideAuthAlert();
        const user = inputLoginUser.value.trim();
        const pass = inputLoginPass.value;
        if (!user || !pass) {
          showAuthAlert("Inserisci nome utente e password.");
          return;
        }
        try {
          showAuthAlert("Accesso in corso...", false);
          const res = await API.login(user, pass);
          closeAuthModal();
          await refreshProfile(res.user.username);
        } catch (err) {
          showAuthAlert(err.message || "Errore durante l'accesso.", true);
        }
      });
    }
    if (formRegister) {
      formRegister.addEventListener("submit", async (e) => {
        e.preventDefault();
        hideAuthAlert();
        const user = inputRegUser.value.trim();
        const email = inputRegEmail.value.trim();
        const pass = inputRegPass.value;
        const passConfirm = inputRegPassConfirm.value;
        if (!user || user.length < 3) {
          showAuthAlert("Il nome deve contenere almeno 3 caratteri.", true);
          return;
        }
        if (pass.length < 4) {
          showAuthAlert("La password deve contenere almeno 4 caratteri.", true);
          return;
        }
        if (pass !== passConfirm) {
          showAuthAlert("Le due password non corrispondono!", true);
          return;
        }
        try {
          showAuthAlert("Creazione account in corso...", false);
          const res = await API.register(user, pass, email);
          closeAuthModal();
          await refreshProfile(res.user.username);
        } catch (err) {
          showAuthAlert(err.message || "Errore durante la registrazione.", true);
        }
      });
    }
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
    class MysteryPillar {
      constructor(x, y, index, name) {
        this.x = x;
        this.y = y;
        this.index = index;
        this.name = name;
        this.activated = false;
        this.r = 20;
        this.pulseTimer = 0;
      }
      activate() {
        if (this.activated) return;
        this.activated = true;
        FX.burst(this.x, this.y - 14, "#06b6d4", 22, 110);
        FX.floatingText(this.x, this.y - 30, `\u2728 ${this.name} Risvegliata!`, "#67e8f9");
      }
      update(dt) {
        this.pulseTimer += dt;
      }
      draw(ctx2) {
        Sprites.drawShadow(ctx2, this.x, this.y - 2, 14);
        const spriteType = this.activated ? "runic_pillar_lit" : "runic_pillar";
        const sprite = Tiles.getPropSprite(spriteType);
        if (this.activated) {
          const pulse = 0.7 + Math.sin(this.pulseTimer * 4) * 0.3;
          const glow = ctx2.createRadialGradient(this.x, this.y - 18, 4, this.x, this.y - 18, 42);
          glow.addColorStop(0, `rgba(6, 182, 212, ${0.45 * pulse})`);
          glow.addColorStop(1, "rgba(6, 182, 212, 0)");
          ctx2.fillStyle = glow;
          ctx2.beginPath();
          ctx2.arc(this.x, this.y - 18, 42, 0, Math.PI * 2);
          ctx2.fill();
        }
        if (sprite) {
          const sw = sprite.width * 2;
          const sh = sprite.height * 2;
          ctx2.drawImage(sprite, Math.round(this.x - sw / 2), Math.round(this.y - sh + 6), sw, sh);
        }
        ctx2.save();
        ctx2.font = "bold 8px sans-serif";
        ctx2.textAlign = "center";
        if (this.activated) {
          ctx2.fillStyle = "#67e8f9";
          ctx2.fillText(`\u2713 ${this.name}`, Math.round(this.x), Math.round(this.y - 34));
        } else {
          ctx2.fillStyle = "#94a3b8";
          ctx2.fillText(`\u{1F52E} ${this.name}`, Math.round(this.x), Math.round(this.y - 34));
        }
        ctx2.restore();
      }
    }
    function renderIngameForge() {
      if (!ingameForgeContainer || !currentProfile) return;
      ingameForgeContainer.innerHTML = "";
      const nearbyBs = world.getNearbyBlacksmith(player.x, player.y, 110);
      if (nearbyBs && forgeNearBlacksmithBtnBox && nearBsName) {
        forgeNearBlacksmithBtnBox.classList.remove("hidden");
        nearBsName.textContent = nearbyBs.name;
      } else if (forgeNearBlacksmithBtnBox) {
        forgeNearBlacksmithBtnBox.classList.add("hidden");
      }
      currentProfile.weaponsCatalog.forEach((w) => {
        const card = document.createElement("div");
        card.className = `weapon-card ${w.isEquipped ? "equipped" : ""}`;
        let reqHtml = "";
        if (w.isMaxLevel) {
          reqHtml = `<div class="weapon-req-box" style="color: #4ade80; text-align: center; font-weight: 700;">\u2605 Grado Massimo (LV 5)</div>`;
        } else if (w.nextCost) {
          const goldHas = currentProfile.gold >= (w.nextCost.gold || 0);
          let matsRows = "";
          if (w.nextCost.materials) {
            for (const [matId, reqAmt] of Object.entries(w.nextCost.materials)) {
              const owned = (currentProfile.inventory && currentProfile.inventory[matId] || 0) + (combat.collectedItems && combat.collectedItems[matId] || 0);
              const hasEnough = owned >= reqAmt;
              const matDef = MATERIALS_DEF[matId] || { name: matId, icon: "\u{1F4E6}" };
              matsRows += `
              <div class="req-item ${hasEnough ? "has" : "missing"}">
                <span>${matDef.icon} ${matDef.name}:</span>
                <span>${owned} / ${reqAmt}</span>
              </div>
            `;
            }
          }
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
            <div class="weapon-type-tag">Grado: Livello ${w.currentLevel} / ${w.maxLevel}</div>
          </div>
        </div>
        <div style="margin: 8px 0;">${reqHtml}</div>
        <button class="btn-forge btn-forge-info" style="width: 100%; opacity: 0.85;">
          ${nearbyBs ? `\u{1F528} Parla con ${nearbyBs.name} per Forgiare` : "\u{1F4CD} Trova un Fabbro nei Villaggi per Forgiare"}
        </button>
      `;
        const btnInfo = card.querySelector(".btn-forge-info");
        btnInfo?.addEventListener("click", () => {
          if (nearbyBs) {
            openBlacksmithModal(nearbyBs);
          } else {
            showWeaponNotification("Visita l'NPC Fabbro in uno dei villaggi protetti per lavorare quest'arma!");
          }
        });
        ingameForgeContainer.appendChild(card);
      });
    }
    function renderHeroOverview(container) {
      if (!container || !currentProfile) return;
      container.innerHTML = "";
      const stats = currentProfile.calculatedStats || {};
      const eq = currentProfile.equippedPieces || {};
      const equippedWeaponDef = WEAPONS_DEF[combat.weaponId] || WEAPONS_DEF.staff;
      const weaponLvl = currentProfile.weapons && currentProfile.weapons[combat.weaponId] || 1;
      const overview = document.createElement("div");
      overview.className = "hero-overview-container";
      const paperdollBox = document.createElement("div");
      paperdollBox.className = "hero-paperdoll-box";
      paperdollBox.innerHTML = `
      <div style="font-size: 13px; font-weight: 800; color: #fde047; text-align: center;">\u{1F464} Slot Equipaggiamento</div>
      <div class="hero-paperdoll-grid">
        <!-- RIGA 1: Vuoto, Elmo, Amuleto -->
        <div style="opacity: 0;"></div>
        <div class="paperdoll-slot ${eq.helmet ? "equipped rarity-" + (eq.helmet.rarity || "common").toLowerCase() : ""}" data-slot="helmet" title="${eq.helmet ? eq.helmet.name + " (Clicca per rimuovere)" : "Slot Elmo (Vuoto)"}">
          <div class="${eq.helmet ? "paperdoll-item-icon" : "paperdoll-placeholder-icon"}">${eq.helmet ? eq.helmet.icon : "\u{1FA96}"}</div>
          <div class="paperdoll-slot-label">${eq.helmet ? eq.helmet.name.slice(0, 10) : "Elmo"}</div>
        </div>
        <div class="paperdoll-slot ${eq.amulet ? "equipped rarity-" + (eq.amulet.rarity || "common").toLowerCase() : ""}" data-slot="amulet" title="${eq.amulet ? eq.amulet.name + " (Clicca per rimuovere)" : "Slot Amuleto (Vuoto)"}">
          <div class="${eq.amulet ? "paperdoll-item-icon" : "paperdoll-placeholder-icon"}">${eq.amulet ? eq.amulet.icon : "\u{1F4FF}"}</div>
          <div class="paperdoll-slot-label">${eq.amulet ? eq.amulet.name.slice(0, 10) : "Amuleto"}</div>
        </div>

        <!-- RIGA 2: Arma, Corazza, Anello -->
        <div class="paperdoll-slot equipped" data-slot="weapon" title="${equippedWeaponDef.name} Lv.${weaponLvl}">
          <div class="paperdoll-item-icon">${equippedWeaponDef.icon}</div>
          <div class="paperdoll-slot-label">Arma (Lv.${weaponLvl})</div>
        </div>
        <div class="paperdoll-slot ${eq.armor ? "equipped rarity-" + (eq.armor.rarity || "common").toLowerCase() : ""}" data-slot="armor" title="${eq.armor ? eq.armor.name + " (Clicca per rimuovere)" : "Slot Corazza (Vuoto)"}">
          <div class="${eq.armor ? "paperdoll-item-icon" : "paperdoll-placeholder-icon"}">${eq.armor ? eq.armor.icon : "\u{1F6E1}\uFE0F"}</div>
          <div class="paperdoll-slot-label">${eq.armor ? eq.armor.name.slice(0, 10) : "Corazza"}</div>
        </div>
        <div class="paperdoll-slot ${eq.ring ? "equipped rarity-" + (eq.ring.rarity || "common").toLowerCase() : ""}" data-slot="ring" title="${eq.ring ? eq.ring.name + " (Clicca per rimuovere)" : "Slot Anello (Vuoto)"}">
          <div class="${eq.ring ? "paperdoll-item-icon" : "paperdoll-placeholder-icon"}">${eq.ring ? eq.ring.icon : "\u{1F48D}"}</div>
          <div class="paperdoll-slot-label">${eq.ring ? eq.ring.name.slice(0, 10) : "Anello"}</div>
        </div>

        <!-- RIGA 3: Vuoto, Stivali, Vuoto -->
        <div style="opacity: 0;"></div>
        <div class="paperdoll-slot ${eq.boots ? "equipped rarity-" + (eq.boots.rarity || "common").toLowerCase() : ""}" data-slot="boots" title="${eq.boots ? eq.boots.name + " (Clicca per rimuovere)" : "Slot Stivali (Vuoto)"}">
          <div class="${eq.boots ? "paperdoll-item-icon" : "paperdoll-placeholder-icon"}">${eq.boots ? eq.boots.icon : "\u{1F97E}"}</div>
          <div class="paperdoll-slot-label">${eq.boots ? eq.boots.name.slice(0, 10) : "Stivali"}</div>
        </div>
        <div style="opacity: 0;"></div>
      </div>
      <div style="font-size: 10px; color: #94a3b8; text-align: center;">\u{1F4A1} Clicca su uno slot equipaggiato per rimuoverlo</div>
    `;
      paperdollBox.querySelectorAll(".paperdoll-slot").forEach((el) => {
        const slot = el.dataset.slot;
        if (slot && slot !== "weapon" && eq[slot]) {
          el.addEventListener("click", async () => {
            try {
              currentProfile = await API.unequipItem(slot);
              player.applyPermanentStats(currentProfile.calculatedStats);
              showWeaponNotification(`\u{1F6E1}\uFE0F Rimosso ${eq[slot].name}!`);
              renderHeroOverview(container);
              if (activeBlacksmith) renderBlacksmithCraft(currentCraftCategory, activeBlacksmith);
            } catch (err) {
              alert(err.message);
            }
          });
        }
      });
      const statsPanel = document.createElement("div");
      statsPanel.className = "hero-stats-panel";
      statsPanel.innerHTML = `
      <div class="hero-stats-title">\u2694\uFE0F Parametri Combattivi Totali</div>
      <div class="hero-stat-row"><span>\u{1F49A} Salute Massima:</span><span class="hero-stat-val">${player.maxHp} HP</span></div>
      <div class="hero-stat-row"><span>\u{1F6E1}\uFE0F Difesa Totale:</span><span class="hero-stat-val">${stats.defense || 0} (${stats.damageReductionPercent || 0}% Riduzione Danno)</span></div>
      <div class="hero-stat-row"><span>\u{1F5E1}\uFE0F Danno Bonus Armi:</span><span class="hero-stat-val">+${stats.bonusDamage || 0}</span></div>
      <div class="hero-stat-row"><span>\u26A1 Velocit\xE0 di Corsa:</span><span class="hero-stat-val">+${stats.speedBonusPercent || 0}%</span></div>
      <div class="hero-stat-row"><span>\u{1F4A5} Colpo Critico:</span><span class="hero-stat-val">${stats.critChance || 0}% (+${stats.critDamage || 50}% Danno)</span></div>
      <div class="hero-stat-row"><span>\u{1F33F} Rigenerazione Salute:</span><span class="hero-stat-val">+${stats.hpRegen || 0} HP / sec</span></div>
      <div class="hero-stat-row"><span>\u{1FA78} Furto Vitale (Life Steal):</span><span class="hero-stat-val">${stats.lifeSteal || 0}%</span></div>
      <div class="hero-stat-row"><span>\u{1F4A8} Schivata Completa:</span><span class="hero-stat-val">${stats.dodgeChance || 0}%</span></div>
      <div class="hero-stat-row"><span>\u23F1\uFE0F Riduzione Ricarica Armi:</span><span class="hero-stat-val">-${Math.round((stats.cooldownReduction || 0) * 100)}%</span></div>
      <div class="hero-stat-row"><span>\u{1F30A} Cammina su Acqua & Guadi:</span><span class="hero-stat-val" style="color: ${stats.ignoreWaterSlow ? "#4ade80" : "#94a3b8"};">${stats.ignoreWaterSlow ? "\u2705 Piena Velocit\xE0" : "\u274C Rallentato (-40%)"}</span></div>
    `;
      overview.appendChild(paperdollBox);
      overview.appendChild(statsPanel);
      container.appendChild(overview);
      const ownedBox = document.createElement("div");
      ownedBox.style.marginTop = "14px";
      ownedBox.innerHTML = `<div style="font-size: 13px; font-weight: 800; color: #fde047; margin-bottom: 8px;">\u{1F392} Oggetti Forgiati in Archivio (${currentProfile.craftedItems?.length || 0})</div>`;
      const ownedGrid = document.createElement("div");
      ownedGrid.className = "weapons-grid";
      if (!currentProfile.craftedItems || currentProfile.craftedItems.length === 0) {
        ownedGrid.innerHTML = `<div style="grid-column: 1/-1; padding: 18px; text-align: center; color: #64748b; font-size: 12px; font-style: italic;">Non possiedi ancora oggetti forgiati. Forgiane uno dal Fabbro!</div>`;
      } else {
        currentProfile.craftedItems.forEach((eqId) => {
          const def = EQUIPMENT_DEF[eqId];
          if (!def) return;
          const isEq = currentProfile.equipment && currentProfile.equipment[def.slot] === eqId;
          const card = document.createElement("div");
          const rarityClass = "rarity-" + (def.rarity || "common").toLowerCase();
          card.className = `equip-card ${rarityClass} ${isEq ? "equipped" : ""}`;
          let statsHtml = "";
          if (def.stats) {
            for (const [k, v] of Object.entries(def.stats)) {
              if (!v) continue;
              let label = k;
              if (k === "maxHp") label = `+${v} Salute Massima`;
              else if (k === "defense") label = `+${v} Difesa`;
              else if (k === "bonusDamage") label = `+${v} Danno`;
              else if (k === "speedBonus") label = `+${v}% Velocit\xE0`;
              else if (k === "critChance") label = `+${v}% Critico`;
              else if (k === "hpRegen") label = `+${v} HP/s Rigenerazione`;
              else if (k === "lifeSteal") label = `+${v}% Furto Vitale`;
              else if (k === "dodgeChance") label = `+${v}% Schivata`;
              else if (k === "ignoreWaterSlow") label = `Cammina sull'acqua senza rallentare`;
              statsHtml += `<div class="equip-stat-item">\u2726 ${label}</div>`;
            }
          }
          card.innerHTML = `
          <div>
            <div class="equip-head">
              <div class="equip-icon-box" style="border-color: ${def.color};">${def.icon}</div>
              <div class="equip-meta">
                <div class="equip-name" style="color: ${def.color};">${def.name}</div>
                <div class="equip-tags">
                  <span class="tag-slot">${def.slot.toUpperCase()}</span>
                  <span class="tag-rarity" style="color: ${def.color}; border: 1px solid ${def.color};">${def.rarity}</span>
                </div>
              </div>
            </div>
            <div class="equip-stats-box">${statsHtml}</div>
          </div>
          <button class="btn-craft-action primary btn-toggle-equip" style="margin-top: 8px;">
            ${isEq ? "\u2713 Equipaggiato (Clicca per rimuovere)" : "\u{1F6E1}\uFE0F Equipaggia Pezzo"}
          </button>
        `;
          const btnToggle = card.querySelector(".btn-toggle-equip");
          btnToggle?.addEventListener("click", async () => {
            try {
              if (isEq) {
                currentProfile = await API.unequipItem(def.slot);
                showWeaponNotification(`Rimosso ${def.name}`);
              } else {
                currentProfile = await API.equipItem(def.id);
                showWeaponNotification(`Equipaggiato ${def.name}!`);
              }
              player.applyPermanentStats(currentProfile.calculatedStats);
              renderHeroOverview(container);
              if (activeBlacksmith) renderBlacksmithCraft(currentCraftCategory, activeBlacksmith);
            } catch (err) {
              alert(err.message);
            }
          });
          ownedGrid.appendChild(card);
        });
      }
      ownedBox.appendChild(ownedGrid);
      container.appendChild(ownedBox);
    }
    function renderBlacksmithCraft(category = "all", bs) {
      if (!blacksmithForgeContainer || !currentProfile) return;
      blacksmithForgeContainer.innerHTML = "";
      currentCraftCategory = category;
      document.querySelectorAll(".craft-filter-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.category === category);
      });
      if (category === "all" || category === "weapon") {
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
              <div class="weapon-req-title">${w.isUnlocked ? "Requisiti Tempra:" : "Materiali Forgiatura:"}</div>
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
              <div class="weapon-type-tag">Grado Attuale: Livello ${w.currentLevel} / ${w.maxLevel}</div>
            </div>
          </div>
          <div style="margin: 8px 0;">${reqHtml}</div>
          <button class="btn-forge" ${!canAfford ? "disabled" : ""} style="width: 100%;">
            \u{1F528} ${w.isUnlocked ? `Tempra a Livello ${w.currentLevel + 1}` : "Forgia Nuova Arma"}
          </button>
        `;
          const btnForge = card.querySelector(".btn-forge");
          if (btnForge && canAfford) {
            btnForge.addEventListener("click", async () => {
              try {
                currentProfile = await API.craftOrUpgradeWeapon(w.id);
                FX.burst(player.x, player.y, "#f59e0b", 24, 120);
                showWeaponNotification(`\u{1F528} ${w.name} lavorata con successo da ${bs.name}!`);
                renderBlacksmithCraft(currentCraftCategory, bs);
                renderIngameForge();
                renderIngameWeapons();
                equipWeapon(combat.weaponId);
              } catch (err) {
                alert(err.message);
              }
            });
          }
          blacksmithForgeContainer.appendChild(card);
        });
      }
      if (category !== "weapon") {
        const filtered = (currentProfile.equipmentCatalog || []).filter((item) => {
          if (category === "all") return true;
          if (category === "jewelry") return item.slot === "amulet" || item.slot === "ring";
          return item.slot === category;
        });
        filtered.forEach((eq) => {
          const card = document.createElement("div");
          const rarityClass = "rarity-" + (eq.rarity || "common").toLowerCase();
          card.className = `equip-card ${rarityClass} ${eq.isEquipped ? "equipped" : ""}`;
          let statsHtml = "";
          if (eq.stats) {
            for (const [k, v] of Object.entries(eq.stats)) {
              if (!v) continue;
              let label = k;
              if (k === "maxHp") label = `+${v} Salute Massima`;
              else if (k === "defense") label = `+${v} Difesa`;
              else if (k === "bonusDamage") label = `+${v} Danno`;
              else if (k === "speedBonus") label = `+${v}% Velocit\xE0`;
              else if (k === "critChance") label = `+${v}% Critico`;
              else if (k === "hpRegen") label = `+${v} HP/s Rigenerazione`;
              else if (k === "lifeSteal") label = `+${v}% Furto Vitale`;
              else if (k === "dodgeChance") label = `+${v}% Schivata`;
              else if (k === "ignoreWaterSlow") label = `Cammina sull'acqua senza rallentare`;
              statsHtml += `<div class="equip-stat-item">\u2726 ${label}</div>`;
            }
          }
          let reqRows = "";
          let canAfford = currentProfile.gold >= (eq.craftCost?.gold || 0);
          reqRows += `
          <div class="req-item ${currentProfile.gold >= (eq.craftCost?.gold || 0) ? "has" : "missing"}">
            <span>\u{1FA99} Oro:</span>
            <span>${currentProfile.gold} / ${eq.craftCost?.gold || 0}</span>
          </div>
        `;
          if (eq.craftCost?.materials) {
            for (const [mId, reqAmt] of Object.entries(eq.craftCost.materials)) {
              const owned = (currentProfile.inventory && currentProfile.inventory[mId] || 0) + (combat.collectedItems && combat.collectedItems[mId] || 0);
              const hasEnough = owned >= reqAmt;
              if (!hasEnough) canAfford = false;
              const matDef = MATERIALS_DEF[mId] || { name: mId, icon: "\u{1F4E6}" };
              reqRows += `
              <div class="req-item ${hasEnough ? "has" : "missing"}">
                <span>${matDef.icon} ${matDef.name}:</span>
                <span>${owned} / ${reqAmt}</span>
              </div>
            `;
            }
          }
          card.innerHTML = `
          <div>
            <div class="equip-head">
              <div class="equip-icon-box" style="border-color: ${eq.color};">${eq.icon}</div>
              <div class="equip-meta">
                <div class="equip-name" style="color: ${eq.color};">${eq.name}</div>
                <div class="equip-tags">
                  <span class="tag-slot">${eq.slot.toUpperCase()}</span>
                  <span class="tag-rarity" style="color: ${eq.color}; border: 1px solid ${eq.color};">${eq.rarity}</span>
                </div>
              </div>
            </div>
            <div class="equip-desc">${eq.desc}</div>
            <div class="equip-stats-box">${statsHtml}</div>
            <div class="weapon-req-box">${reqRows}</div>
          </div>
          <button class="btn-craft-action primary btn-craft-item" ${!canAfford ? "disabled" : ""} style="margin-top: 10px;">
            \u{1F528} Forgia ${eq.name}
          </button>
        `;
          const btnCraft = card.querySelector(".btn-craft-item");
          if (btnCraft && canAfford) {
            btnCraft.addEventListener("click", async () => {
              try {
                currentProfile = await API.craftEquipment(eq.id);
                player.applyPermanentStats(currentProfile.calculatedStats);
                FX.burst(player.x, player.y, eq.color || "#f59e0b", 24, 130);
                showWeaponNotification(`\u{1F528} ${eq.name} forgiato con successo da ${bs.name}!`);
                renderBlacksmithCraft(currentCraftCategory, bs);
              } catch (err) {
                alert(err.message);
              }
            });
          }
          blacksmithForgeContainer.appendChild(card);
        });
      }
    }
    function renderBlacksmithRefining(bs) {
      if (!blacksmithRefineContainer || !currentProfile) return;
      blacksmithRefineContainer.innerHTML = "";
      (currentProfile.refiningCatalog || []).forEach((rec) => {
        const card = document.createElement("div");
        card.className = "refine-card";
        let inputsHtml = "";
        let canAfford1 = currentProfile.gold >= (rec.goldCost || 0);
        for (const [mId, amt] of Object.entries(rec.inputs)) {
          const owned = currentProfile.inventory && currentProfile.inventory[mId] || 0;
          const hasEnough = owned >= amt;
          if (!hasEnough) canAfford1 = false;
          const inDef = MATERIALS_DEF[mId] || { name: mId, icon: "\u{1F4E6}" };
          inputsHtml += `
          <div class="refine-item-token" style="color: ${hasEnough ? "#e2e8f0" : "#f87171"};">
            ${inDef.icon} ${inDef.name}: <b>${owned}/${amt}</b>
          </div>
        `;
        }
        const outDef = rec.outputDef;
        card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 13.5px; font-weight: 800; color: #f8fafc;">${rec.name}</div>
          <div style="font-size: 11px; color: #fde047; font-weight: 700;">\u{1FA99} ${rec.goldCost} oro</div>
        </div>
        <div style="font-size: 11px; color: #94a3b8; font-style: italic;">${rec.desc}</div>
        <div class="refine-recipe-flow">
          <div class="refine-side">${inputsHtml}</div>
          <div class="refine-arrow">\u2794</div>
          <div class="refine-side" style="align-items: center;">
            <div style="font-size: 26px;">${outDef.icon}</div>
            <div style="font-size: 11px; font-weight: 800; color: ${outDef.color || "#38bdf8"};">+${rec.output.count} ${outDef.name}</div>
          </div>
        </div>
        <div class="refine-actions-row">
          <button class="btn-craft-action primary btn-refine-1" ${!canAfford1 ? "disabled" : ""} style="flex: 1;">
            \u2728 Raffina 1x
          </button>
          <button class="btn-craft-action primary btn-refine-5" ${!canAfford1 ? "disabled" : ""} style="flex: 1;">
            \u2728 Raffina 5x
          </button>
        </div>
      `;
        const btn1 = card.querySelector(".btn-refine-1");
        btn1?.addEventListener("click", async () => {
          try {
            currentProfile = await API.refineResource(rec.id, 1);
            FX.burst(player.x, player.y, outDef.color || "#38bdf8", 18, 100);
            showWeaponNotification(`\u2728 Raffinato 1x ${outDef.name}!`);
            renderBlacksmithRefining(bs);
            renderIngameLoot();
          } catch (err) {
            alert(err.message);
          }
        });
        const btn5 = card.querySelector(".btn-refine-5");
        btn5?.addEventListener("click", async () => {
          try {
            currentProfile = await API.refineResource(rec.id, 5);
            FX.burst(player.x, player.y, outDef.color || "#38bdf8", 26, 140);
            showWeaponNotification(`\u2728 Raffinato 5x ${outDef.name}!`);
            renderBlacksmithRefining(bs);
            renderIngameLoot();
          } catch (err) {
            alert(err.message);
          }
        });
        blacksmithRefineContainer.appendChild(card);
      });
    }
    function renderBlacksmithSalvage(bs) {
      if (!blacksmithSalvageContainer || !currentProfile) return;
      blacksmithSalvageContainer.innerHTML = "";
      const salvageable = (currentProfile.salvageCatalog || []).filter((item) => !item.isEquipped);
      if (salvageable.length === 0) {
        blacksmithSalvageContainer.innerHTML = `
        <div style="grid-column: 1/-1; padding: 24px; text-align: center; color: #64748b; font-size: 13px; font-style: italic;">
          Non possiedi pezzi forgiati non equipaggiati da smantellare.<br>
          Forgia armature dal Fabbro o rimuovi quelle equipaggiate nella Scheda Eroe per poterle riciclare!
        </div>
      `;
        return;
      }
      salvageable.forEach((item) => {
        const card = document.createElement("div");
        const rarityClass = "rarity-" + (item.rarity || "common").toLowerCase();
        card.className = `salvage-card ${rarityClass}`;
        let yieldHtml = "";
        if (item.salvageYield) {
          for (const [mId, count] of Object.entries(item.salvageYield)) {
            const matDef = MATERIALS_DEF[mId] || { name: mId, icon: "\u{1F4E6}" };
            yieldHtml += `<div>\u2726 +${count}x ${matDef.icon} ${matDef.name}</div>`;
          }
        }
        card.innerHTML = `
        <div class="equip-head">
          <div class="equip-icon-box" style="border-color: ${item.color};">${item.icon}</div>
          <div class="equip-meta">
            <div class="equip-name" style="color: ${item.color};">${item.name}</div>
            <div class="equip-tags">
              <span class="tag-slot">${(item.slot || "equip").toUpperCase()}</span>
              <span class="tag-rarity" style="color: ${item.color}; border: 1px solid ${item.color};">${item.rarity}</span>
            </div>
          </div>
        </div>
        <div class="salvage-yield-box">
          <div style="font-size: 10px; color: #94a3b8; margin-bottom: 2px;">MATERIALI RECUPERATI:</div>
          ${yieldHtml}
        </div>
        <button class="btn-craft-action btn-do-salvage" style="background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); color: #fff;">
          \u267B\uFE0F Smantella & Ricicla
        </button>
      `;
        const btnSal = card.querySelector(".btn-do-salvage");
        btnSal?.addEventListener("click", async () => {
          try {
            currentProfile = await API.salvageItem(item.id);
            FX.burst(player.x, player.y, "#ef4444", 20, 110);
            showWeaponNotification(`\u267B\uFE0F ${item.name} smantellato con successo!`);
            renderBlacksmithSalvage(bs);
            renderIngameLoot();
          } catch (err) {
            alert(err.message);
          }
        });
        blacksmithSalvageContainer.appendChild(card);
      });
    }
    function switchBlacksmithTab(tabName) {
      currentBsTab = tabName;
      [bsTabBtnCraft, bsTabBtnRefine, bsTabBtnSalvage, bsTabBtnHero].forEach((b) => b?.classList.remove("active"));
      [bsTabCraft, bsTabRefine, bsTabSalvage, bsTabHero].forEach((p) => p?.classList.remove("active"));
      if (tabName === "refine") {
        bsTabBtnRefine?.classList.add("active");
        bsTabRefine?.classList.add("active");
        renderBlacksmithRefining(activeBlacksmith);
      } else if (tabName === "salvage") {
        bsTabBtnSalvage?.classList.add("active");
        bsTabSalvage?.classList.add("active");
        renderBlacksmithSalvage(activeBlacksmith);
      } else if (tabName === "hero") {
        bsTabBtnHero?.classList.add("active");
        bsTabHero?.classList.add("active");
        renderHeroOverview(blacksmithHeroContainer);
      } else {
        bsTabBtnCraft?.classList.add("active");
        bsTabCraft?.classList.add("active");
        renderBlacksmithCraft(currentCraftCategory, activeBlacksmith);
      }
    }
    function openBlacksmithModal(bs) {
      if (gameState !== "PLAYING") return;
      activeBlacksmith = bs;
      closeIngameInventory();
      closeTacticalMap();
      closeGameMenu();
      closeTeleportModal();
      isBlacksmithOpen = true;
      if (bsModalName) bsModalName.textContent = bs.name;
      if (bsModalTitle) bsModalTitle.textContent = `${bs.title} \xB7 ${bs.villageName || bs.settlementName || "Villaggio"}`;
      if (bsModalQuote) bsModalQuote.textContent = `"${bs.quote}"`;
      blacksmithModal?.classList.remove("hidden");
      switchBlacksmithTab("craft");
    }
    function closeBlacksmithModal() {
      isBlacksmithOpen = false;
      activeBlacksmith = null;
      blacksmithModal?.classList.add("hidden");
    }
    function openTeleportModal() {
      if (gameState !== "PLAYING") return;
      closeIngameInventory();
      closeTacticalMap();
      closeGameMenu();
      closeBlacksmithModal();
      isTeleportOpen = true;
      teleportModal?.classList.remove("hidden");
      renderTeleportDestinations();
    }
    function closeTeleportModal() {
      isTeleportOpen = false;
      teleportModal?.classList.add("hidden");
    }
    function toggleTeleportModal() {
      if (isTeleportOpen) closeTeleportModal();
      else openTeleportModal();
    }
    function teleportTo(settlement) {
      if (!settlement || !settlement.waypoint) return;
      const targetX = settlement.waypoint.tx * world.TS + world.TS / 2;
      const targetY = settlement.waypoint.ty * world.TS + world.TS;
      if (Math.hypot(player.x - targetX, player.y - targetY) < 130) {
        showWeaponNotification(`\u{1F4CD} Ti trovi gi\xE0 a ${settlement.name}!`);
        closeTeleportModal();
        return;
      }
      FX.addShockwave(player.x, player.y, 85, "#38bdf8", 0.45);
      FX.burst(player.x, player.y, "#38bdf8", 25, 140);
      FX.burst(player.x, player.y, "#ffffff", 15, 180);
      camera.kick(0.4);
      player.x = targetX;
      player.y = targetY;
      camera.snapTo(player.x, player.y);
      const color = settlement.color || "#38bdf8";
      FX.addShockwave(player.x, player.y, 95, color, 0.5);
      FX.burst(player.x, player.y, color, 30, 160);
      FX.burst(player.x, player.y, "#fde047", 15, 130);
      camera.kick(0.35);
      closeTeleportModal();
      closeTacticalMap();
      showWeaponNotification(`\u{1F300} Teletrasporto riuscito: Benvenuto a ${settlement.name}!`);
    }
    function renderTeleportDestinations() {
      if (!teleportDestinationsList) return;
      teleportDestinationsList.innerHTML = "";
      const iconMap = {
        citadel: "\u{1F3F0}",
        waterfall_village: "\u{1F30A}",
        frostpeak: "\u2744\uFE0F",
        oasis: "\u{1F3DC}\uFE0F",
        cineris: "\u{1F30B}",
        sylva: "\u{1F332}"
      };
      SETTLEMENTS.forEach((s) => {
        const card = document.createElement("div");
        const distPx = Math.hypot(player.x - s.centerTx * world.TS, player.y - s.centerTy * world.TS);
        const isHere = distPx < 350;
        const distMeters = Math.round(distPx / 16);
        card.className = `teleport-destination-card ${isHere ? "current-location" : ""}`;
        card.style.borderColor = s.color || "#38bdf8";
        const icon = iconMap[s.id] || "\u{1F3F0}";
        card.innerHTML = `
        <div class="destination-header">
          <div class="destination-icon-box" style="border-color: ${s.color || "#38bdf8"}; color: ${s.color || "#38bdf8"};">
            ${icon}
          </div>
          <div>
            <div class="destination-title">${s.name}</div>
            <div class="destination-sub">${s.title}</div>
          </div>
        </div>

        <div class="destination-dist">
          <span>\u{1F4CF}</span>
          <span>${isHere ? "Sei in questa Safe Zone" : `Distanza: ${distMeters} m (~${Math.round(distPx / world.TS)} tiles)`}</span>
        </div>

        <div style="margin-top: 4px;">
          ${isHere ? `<span class="badge-current-location">\u{1F4CD} Sei qui attualmente</span>` : `<button type="button" class="btn-teleport-warp" data-dest="${s.id}">\u{1F300} Viaggia a ${s.name}</button>`}
        </div>
      `;
        if (!isHere) {
          const btn = card.querySelector(".btn-teleport-warp");
          if (btn) {
            btn.addEventListener("click", () => teleportTo(s));
          }
        }
        teleportDestinationsList.appendChild(card);
      });
    }
    if (hudBtnTeleport) hudBtnTeleport.addEventListener("click", () => toggleTeleportModal());
    if (btnCloseTeleport) btnCloseTeleport.addEventListener("click", () => closeTeleportModal());
    if (btnResumeFromTeleport) btnResumeFromTeleport.addEventListener("click", () => closeTeleportModal());
    if (btnCloseBlacksmith) btnCloseBlacksmith.addEventListener("click", closeBlacksmithModal);
    if (btnResumeFromBlacksmith) btnResumeFromBlacksmith.addEventListener("click", closeBlacksmithModal);
    if (btnOpenNearBlacksmith) {
      btnOpenNearBlacksmith.addEventListener("click", () => {
        const nearbyBs = world.getNearbyBlacksmith(player.x, player.y, 110);
        if (nearbyBs) openBlacksmithModal(nearbyBs);
      });
    }
    if (bsTabBtnCraft) bsTabBtnCraft.addEventListener("click", () => switchBlacksmithTab("craft"));
    if (bsTabBtnRefine) bsTabBtnRefine.addEventListener("click", () => switchBlacksmithTab("refine"));
    if (bsTabBtnSalvage) bsTabBtnSalvage.addEventListener("click", () => switchBlacksmithTab("salvage"));
    if (bsTabBtnHero) bsTabBtnHero.addEventListener("click", () => switchBlacksmithTab("hero"));
    document.querySelectorAll(".craft-filter-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        document.querySelectorAll(".craft-filter-btn").forEach((b) => b.classList.remove("active"));
        const target = e.currentTarget;
        target.classList.add("active");
        currentCraftCategory = target.getAttribute("data-cat") || "all";
        renderBlacksmithCraft(currentCraftCategory, activeBlacksmith);
      });
    });
    function switchIngameTab(tabName) {
      [ingameTabBtnLoot, ingameTabBtnTalents, ingameTabBtnForge, ingameTabBtnWeapons, ingameTabBtnEquipment, ingameTabBtnSkins].forEach((b) => b?.classList.remove("active"));
      [ingameTabLoot, ingameTabTalents, ingameTabForge, ingameTabWeapons, ingameTabEquipment, ingameTabSkins].forEach((p) => p?.classList.remove("active"));
      if (tabName === "loot") {
        ingameTabBtnLoot?.classList.add("active");
        ingameTabLoot?.classList.add("active");
        renderIngameLoot();
      } else if (tabName === "talents") {
        ingameTabBtnTalents?.classList.add("active");
        ingameTabTalents?.classList.add("active");
        renderTalentsGrid();
      } else if (tabName === "weapons") {
        ingameTabBtnWeapons?.classList.add("active");
        ingameTabWeapons?.classList.add("active");
        renderIngameWeapons();
      } else if (tabName === "equipment") {
        ingameTabBtnEquipment?.classList.add("active");
        ingameTabEquipment?.classList.add("active");
        renderHeroOverview(ingameHeroContainer);
      } else if (tabName === "skins") {
        ingameTabBtnSkins?.classList.add("active");
        ingameTabSkins?.classList.add("active");
        renderIngameSkins();
      } else {
        ingameTabBtnForge?.classList.add("active");
        ingameTabForge?.classList.add("active");
        renderIngameForge();
      }
    }
    function openIngameInventory(tab = "loot") {
      if (gameState !== "PLAYING") return;
      closeTacticalMap();
      closeGameMenu();
      closeBlacksmithModal();
      closeTeleportModal();
      isInventoryOpen = true;
      ingameModal?.classList.remove("hidden");
      switchIngameTab(tab);
    }
    function closeIngameInventory() {
      isInventoryOpen = false;
      ingameModal?.classList.add("hidden");
    }
    function toggleIngameInventory() {
      if (isInventoryOpen) closeIngameInventory();
      else openIngameInventory("loot");
    }
    if (hudBtnBag) hudBtnBag.addEventListener("click", () => toggleIngameInventory());
    if (btnCloseBag) btnCloseBag.addEventListener("click", () => closeIngameInventory());
    if (btnResumeGame) btnResumeGame.addEventListener("click", () => closeIngameInventory());
    if (ingameTabBtnLoot) ingameTabBtnLoot.addEventListener("click", () => switchIngameTab("loot"));
    if (ingameTabBtnTalents) ingameTabBtnTalents.addEventListener("click", () => switchIngameTab("talents"));
    if (ingameTabBtnForge) ingameTabBtnForge.addEventListener("click", () => switchIngameTab("forge"));
    if (ingameTabBtnWeapons) ingameTabBtnWeapons.addEventListener("click", () => switchIngameTab("weapons"));
    if (ingameTabBtnEquipment) ingameTabBtnEquipment.addEventListener("click", () => switchIngameTab("equipment"));
    if (ingameTabBtnSkins) ingameTabBtnSkins.addEventListener("click", () => switchIngameTab("skins"));
    function renderMinimap() {
      if (!minimapCtx || !minimapCanvas || gameState !== "PLAYING") return;
      const w = minimapCanvas.width;
      const h = minimapCanvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const mapExtent = world.MAP_RADIUS * world.TS * 2;
      const scale = w / mapExtent;
      minimapCtx.clearRect(0, 0, w, h);
      minimapCtx.fillStyle = "#080c14";
      minimapCtx.fillRect(0, 0, w, h);
      minimapCtx.fillStyle = "rgba(125, 211, 252, 0.35)";
      minimapCtx.fillRect(0, 0, w, cy - 25 * world.TS * scale);
      minimapCtx.fillStyle = "rgba(217, 119, 6, 0.35)";
      minimapCtx.fillRect(0, cy + 20 * world.TS * scale, cx, h);
      minimapCtx.fillStyle = "rgba(185, 28, 28, 0.35)";
      minimapCtx.fillRect(cx + 18 * world.TS * scale, cy - 15 * world.TS * scale, cx, h);
      minimapCtx.fillStyle = "rgba(22, 101, 52, 0.4)";
      minimapCtx.fillRect(0, cy - 25 * world.TS * scale, cx + 18 * world.TS * scale, 45 * world.TS * scale);
      minimapCtx.strokeStyle = "#0284c7";
      minimapCtx.lineWidth = 2.5;
      minimapCtx.beginPath();
      for (let ty = -world.MAP_RADIUS; ty <= world.MAP_RADIUS; ty += 4) {
        const rx = world.getRiverCenterX(ty) * world.TS;
        const ry = ty * world.TS;
        const mx = cx + rx * scale;
        const my = cy + ry * scale;
        if (ty === -world.MAP_RADIUS) minimapCtx.moveTo(mx, my);
        else minimapCtx.lineTo(mx, my);
      }
      minimapCtx.stroke();
      minimapCtx.strokeStyle = "rgba(245, 158, 11, 0.55)";
      minimapCtx.lineWidth = 1;
      for (const r of ROAD_SEGMENTS) {
        minimapCtx.beginPath();
        minimapCtx.moveTo(cx + r.x1 * world.TS * scale, cy + r.y1 * world.TS * scale);
        minimapCtx.lineTo(cx + r.x2 * world.TS * scale, cy + r.y2 * world.TS * scale);
        minimapCtx.stroke();
      }
      minimapCtx.strokeStyle = "rgba(217, 119, 6, 0.45)";
      minimapCtx.lineWidth = 0.8;
      minimapCtx.setLineDash([2, 2]);
      for (const t of TRAIL_SEGMENTS) {
        minimapCtx.beginPath();
        minimapCtx.moveTo(cx + t.x1 * world.TS * scale, cy + t.y1 * world.TS * scale);
        minimapCtx.lineTo(cx + t.x2 * world.TS * scale, cy + t.y2 * world.TS * scale);
        minimapCtx.stroke();
      }
      minimapCtx.setLineDash([]);
      for (const s of SETTLEMENTS) {
        const sx = cx + s.centerTx * world.TS * scale;
        const sy = cy + s.centerTy * world.TS * scale;
        const sr = s.radiusTiles * world.TS * scale;
        minimapCtx.fillStyle = "rgba(56, 189, 248, 0.2)";
        minimapCtx.beginPath();
        minimapCtx.arc(sx, sy, sr, 0, Math.PI * 2);
        minimapCtx.fill();
        minimapCtx.fillStyle = s.color || "#38bdf8";
        minimapCtx.beginPath();
        minimapCtx.arc(sx, sy, s.id === "citadel" ? 3.5 : 2.5, 0, Math.PI * 2);
        minimapCtx.fill();
      }
      minimapCtx.font = "7px sans-serif";
      minimapCtx.textAlign = "center";
      for (const poi of POINTS_OF_INTEREST) {
        const px2 = cx + poi.tx * world.TS * scale;
        const py2 = cy + poi.ty * world.TS * scale;
        minimapCtx.fillText(poi.icon, px2, py2 + 2.5);
      }
      minimapCtx.fillStyle = "#f87171";
      for (const en of combat.enemies) {
        const mx = cx + en.x * scale;
        const my = cy + en.y * scale;
        if (mx >= 0 && mx < w && my >= 0 && my < h) {
          minimapCtx.fillRect(mx - 0.75, my - 0.75, 1.5, 1.5);
        }
      }
      const px = cx + player.x * scale;
      const py = cy + player.y * scale;
      minimapCtx.fillStyle = "rgba(56, 189, 248, 0.4)";
      minimapCtx.beginPath();
      minimapCtx.arc(px, py, 4, 0, Math.PI * 2);
      minimapCtx.fill();
      minimapCtx.fillStyle = "#ffffff";
      minimapCtx.beginPath();
      minimapCtx.arc(px, py, 2, 0, Math.PI * 2);
      minimapCtx.fill();
      minimapCtx.strokeStyle = "#0284c7";
      minimapCtx.lineWidth = 1.5;
      minimapCtx.strokeRect(0, 0, w, h);
      const curB = getBiomeInfo(player.x, player.y);
      if (minimapBiomeName) {
        minimapBiomeName.textContent = curB.name;
      }
    }
    function renderTacticalMap() {
      if (!expandedCtx || !expandedCanvas) return;
      const w = expandedCanvas.width;
      const h = expandedCanvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const mapExtent = world.MAP_RADIUS * world.TS * 2;
      const scale = w / mapExtent;
      expandedCtx.clearRect(0, 0, w, h);
      expandedCtx.fillStyle = "#080c14";
      expandedCtx.fillRect(0, 0, w, h);
      expandedCtx.strokeStyle = "rgba(148, 163, 184, 0.08)";
      expandedCtx.lineWidth = 1;
      for (let x = 0; x <= w; x += 46) {
        expandedCtx.beginPath();
        expandedCtx.moveTo(x, 0);
        expandedCtx.lineTo(x, h);
        expandedCtx.stroke();
      }
      for (let y = 0; y <= h; y += 46) {
        expandedCtx.beginPath();
        expandedCtx.moveTo(0, y);
        expandedCtx.lineTo(w, y);
        expandedCtx.stroke();
      }
      expandedCtx.fillStyle = "rgba(125, 211, 252, 0.22)";
      expandedCtx.fillRect(0, 0, w, cy - 25 * world.TS * scale);
      expandedCtx.fillStyle = "#7dd3fc";
      expandedCtx.font = "bold 10px sans-serif";
      expandedCtx.fillText("\u2744\uFE0F VETTE INNEVATE", 20, 25);
      expandedCtx.fillStyle = "rgba(22, 101, 52, 0.25)";
      expandedCtx.fillRect(0, cy - 25 * world.TS * scale, cx, 50 * world.TS * scale);
      expandedCtx.fillStyle = "#4ade80";
      expandedCtx.fillText("\u{1F332} BOSCO SILVANO", 20, cy - 15);
      expandedCtx.fillStyle = "rgba(217, 119, 6, 0.25)";
      expandedCtx.fillRect(0, cy + 25 * world.TS * scale, cx + 10, h - (cy + 25 * world.TS * scale));
      expandedCtx.fillStyle = "#fde047";
      expandedCtx.fillText("\u{1F3DC}\uFE0F DESERTO DELLE DUNE", 20, h - 20);
      expandedCtx.fillStyle = "rgba(185, 28, 28, 0.25)";
      expandedCtx.fillRect(cx + 20 * world.TS * scale, cy - 20 * world.TS * scale, cx, h);
      expandedCtx.fillStyle = "#f87171";
      expandedCtx.fillText("\u{1F30B} CALDERA VULCANICA", cx + 45, cy + 50);
      expandedCtx.strokeStyle = "#0284c7";
      expandedCtx.lineWidth = 7;
      expandedCtx.beginPath();
      for (let ty = -world.MAP_RADIUS; ty <= world.MAP_RADIUS; ty += 2) {
        const rx = world.getRiverCenterX(ty) * world.TS;
        const ry = ty * world.TS;
        const mx = cx + rx * scale;
        const my = cy + ry * scale;
        if (ty === -world.MAP_RADIUS) expandedCtx.moveTo(mx, my);
        else expandedCtx.lineTo(mx, my);
      }
      expandedCtx.stroke();
      expandedCtx.strokeStyle = "#7dd3fc";
      expandedCtx.lineWidth = 3;
      expandedCtx.stroke();
      const wfX = cx + -40 * world.TS * scale;
      const wfY = cy + 22 * world.TS * scale;
      expandedCtx.fillStyle = "#ffffff";
      expandedCtx.font = "bold 9px sans-serif";
      expandedCtx.fillText("\u{1F30A} CASCATE", wfX - 18, wfY - 14);
      expandedCtx.strokeStyle = "rgba(245, 158, 11, 0.75)";
      expandedCtx.lineWidth = 2.2;
      for (const r of ROAD_SEGMENTS) {
        expandedCtx.beginPath();
        expandedCtx.moveTo(cx + r.x1 * world.TS * scale, cy + r.y1 * world.TS * scale);
        expandedCtx.lineTo(cx + r.x2 * world.TS * scale, cy + r.y2 * world.TS * scale);
        expandedCtx.stroke();
      }
      expandedCtx.strokeStyle = "rgba(217, 119, 6, 0.65)";
      expandedCtx.lineWidth = 1.4;
      expandedCtx.setLineDash([4, 3]);
      for (const t of TRAIL_SEGMENTS) {
        expandedCtx.beginPath();
        expandedCtx.moveTo(cx + t.x1 * world.TS * scale, cy + t.y1 * world.TS * scale);
        expandedCtx.lineTo(cx + t.x2 * world.TS * scale, cy + t.y2 * world.TS * scale);
        expandedCtx.stroke();
      }
      expandedCtx.setLineDash([]);
      for (const s of SETTLEMENTS) {
        const sx = cx + s.centerTx * world.TS * scale;
        const sy = cy + s.centerTy * world.TS * scale;
        const sr = s.radiusTiles * world.TS * scale;
        expandedCtx.fillStyle = "rgba(56, 189, 248, 0.15)";
        expandedCtx.beginPath();
        expandedCtx.arc(sx, sy, sr, 0, Math.PI * 2);
        expandedCtx.fill();
        expandedCtx.strokeStyle = s.color || "#38bdf8";
        expandedCtx.lineWidth = 1.5;
        expandedCtx.stroke();
        expandedCtx.fillStyle = "#ffffff";
        expandedCtx.beginPath();
        expandedCtx.arc(sx, sy, 3, 0, Math.PI * 2);
        expandedCtx.fill();
        let badges = "";
        if (s.blacksmith) badges += "\u{1F528} ";
        if (s.waypoint) badges += "\u{1F300}";
        if (badges) {
          expandedCtx.font = "9px sans-serif";
          expandedCtx.textAlign = "center";
          expandedCtx.fillText(badges, sx, sy - 2);
        }
        expandedCtx.font = "bold 9px sans-serif";
        expandedCtx.fillStyle = s.color || "#38bdf8";
        expandedCtx.textAlign = "center";
        expandedCtx.fillText(s.name, sx, sy - sr - 3);
        expandedCtx.font = "8px sans-serif";
        expandedCtx.fillStyle = "#94a3b8";
        expandedCtx.fillText("\u{1F6E1}\uFE0F Safe Zone", sx, sy + sr + 9);
        expandedCtx.font = "7.5px sans-serif";
        expandedCtx.fillStyle = "#38bdf8";
        expandedCtx.fillText("\u{1F300} Clicca per Viaggiare", sx, sy + sr + 18);
        expandedCtx.textAlign = "left";
      }
      for (const poi of POINTS_OF_INTEREST) {
        const px2 = cx + poi.tx * world.TS * scale;
        const py2 = cy + poi.ty * world.TS * scale;
        expandedCtx.save();
        expandedCtx.fillStyle = poi.type === "boss" ? "rgba(239, 68, 68, 0.22)" : "rgba(6, 182, 212, 0.22)";
        expandedCtx.beginPath();
        expandedCtx.arc(px2, py2, 11, 0, Math.PI * 2);
        expandedCtx.fill();
        expandedCtx.strokeStyle = poi.color || "#fde047";
        expandedCtx.lineWidth = 1.4;
        expandedCtx.stroke();
        expandedCtx.font = "11px sans-serif";
        expandedCtx.textAlign = "center";
        expandedCtx.fillText(poi.icon, px2, py2 + 4);
        expandedCtx.font = "bold 8px sans-serif";
        expandedCtx.fillStyle = poi.color || "#fde047";
        expandedCtx.fillText(poi.name, px2, py2 + 16);
        expandedCtx.restore();
      }
      expandedCtx.fillStyle = "#ef4444";
      for (const en of combat.enemies) {
        const ex = cx + en.x * scale;
        const ey = cy + en.y * scale;
        if (ex >= 0 && ex < w && ey >= 0 && ey < h) {
          expandedCtx.beginPath();
          expandedCtx.arc(ex, ey, 2, 0, Math.PI * 2);
          expandedCtx.fill();
        }
      }
      const px = cx + player.x * scale;
      const py = cy + player.y * scale;
      expandedCtx.strokeStyle = "#38bdf8";
      expandedCtx.lineWidth = 2;
      expandedCtx.beginPath();
      expandedCtx.arc(px, py, 8, 0, Math.PI * 2);
      expandedCtx.stroke();
      expandedCtx.fillStyle = "rgba(56, 189, 248, 0.35)";
      expandedCtx.beginPath();
      expandedCtx.arc(px, py, 12, 0, Math.PI * 2);
      expandedCtx.fill();
      expandedCtx.fillStyle = "#ffffff";
      expandedCtx.beginPath();
      expandedCtx.arc(px, py, 3, 0, Math.PI * 2);
      expandedCtx.fill();
      expandedCtx.strokeStyle = "#38bdf8";
      expandedCtx.lineWidth = 2;
      expandedCtx.strokeRect(0, 0, w, h);
      if (mapCoordsText) {
        mapCoordsText.textContent = `X: ${Math.round(player.x)}, Y: ${Math.round(player.y)}`;
      }
      const curB = getBiomeInfo(player.x, player.y);
      if (mapCurrentBiomeText) {
        mapCurrentBiomeText.textContent = curB.name;
        mapCurrentBiomeText.style.color = curB.color;
      }
    }
    function openTacticalMap() {
      if (gameState !== "PLAYING") return;
      closeIngameInventory();
      closeGameMenu();
      closeBlacksmithModal();
      closeTeleportModal();
      isMapOpen = true;
      expandedMapModal?.classList.remove("hidden");
      renderTacticalMap();
    }
    function closeTacticalMap() {
      isMapOpen = false;
      expandedMapModal?.classList.add("hidden");
    }
    function toggleTacticalMap() {
      if (isMapOpen) closeTacticalMap();
      else openTacticalMap();
    }
    if (hudBtnMap) hudBtnMap.addEventListener("click", () => toggleTacticalMap());
    if (minimapWidget) minimapWidget.addEventListener("click", () => openTacticalMap());
    if (btnExpandMinimap) btnExpandMinimap.addEventListener("click", (e) => {
      e.stopPropagation();
      openTacticalMap();
    });
    if (btnCloseMap) btnCloseMap.addEventListener("click", () => closeTacticalMap());
    if (btnResumeFromMap) btnResumeFromMap.addEventListener("click", () => closeTacticalMap());
    if (expandedCanvas) {
      expandedCanvas.style.cursor = "pointer";
      expandedCanvas.addEventListener("click", (e) => {
        if (gameState !== "PLAYING") return;
        const rect = expandedCanvas.getBoundingClientRect();
        const clickX = (e.clientX - rect.left) * (expandedCanvas.width / rect.width);
        const clickY = (e.clientY - rect.top) * (expandedCanvas.height / rect.height);
        const scale = expandedCanvas.width / ((world.MAP_RADIUS * 2 + 1) * world.TS);
        const cx = expandedCanvas.width / 2;
        const cy = expandedCanvas.height / 2;
        for (const s of SETTLEMENTS) {
          const sx = cx + s.centerTx * world.TS * scale;
          const sy = cy + s.centerTy * world.TS * scale;
          const sr = s.radiusTiles * world.TS * scale;
          if (Math.hypot(clickX - sx, clickY - sy) <= Math.max(sr + 8, 24)) {
            teleportTo(s);
            return;
          }
        }
        for (const poi of POINTS_OF_INTEREST) {
          const px = cx + poi.tx * world.TS * scale;
          const py = cy + poi.ty * world.TS * scale;
          if (Math.hypot(clickX - px, clickY - py) <= 24) {
            showWeaponNotification(`\u26A0\uFE0F ${poi.name} \xE8 una zona Boss! Raggiungila a piedi lungo strade e sentieri.`);
            return;
          }
        }
      });
    }
    document.querySelectorAll(".btn-map-travel").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const sId = btn.getAttribute("data-settlement");
        const targetSettlement = SETTLEMENTS.find((s) => s.id === sId);
        if (targetSettlement) {
          teleportTo(targetSettlement);
        }
      });
    });
    function switchGameMenuTab(tabName) {
      [menuTabBtnSettings, menuTabBtnShop, menuTabBtnFriends, menuTabBtnStats].forEach((b) => b?.classList.remove("active"));
      [menuTabSettings, menuTabShop, menuTabFriends, menuTabStats].forEach((p) => p?.classList.remove("active"));
      if (tabName === "settings") {
        menuTabBtnSettings?.classList.add("active");
        menuTabSettings?.classList.add("active");
      } else if (tabName === "shop") {
        menuTabBtnShop?.classList.add("active");
        menuTabShop?.classList.add("active");
      } else if (tabName === "friends") {
        menuTabBtnFriends?.classList.add("active");
        menuTabFriends?.classList.add("active");
      } else {
        menuTabBtnStats?.classList.add("active");
        menuTabStats?.classList.add("active");
        updateRunStatsInMenu();
      }
    }
    function updateRunStatsInMenu() {
      if (menuStatTime) menuStatTime.textContent = formatTime(runSurvivalSeconds);
      if (menuStatLvl) menuStatLvl.textContent = `${progression.level}`;
      if (menuStatKills) menuStatKills.textContent = `${combat.kills}`;
      if (menuStatGold) menuStatGold.textContent = `+${combat.goldEarned} \u{1FA99}`;
    }
    function openGameMenu(tab = "settings") {
      if (gameState !== "PLAYING") return;
      closeIngameInventory();
      closeTacticalMap();
      closeBlacksmithModal();
      closeTeleportModal();
      isMenuOpen = true;
      gameMenuModal?.classList.remove("hidden");
      switchGameMenuTab(tab);
      updateRunStatsInMenu();
    }
    function closeGameMenu() {
      isMenuOpen = false;
      gameMenuModal?.classList.add("hidden");
    }
    function toggleGameMenu() {
      if (isMenuOpen) closeGameMenu();
      else openGameMenu("settings");
    }
    if (hudBtnMenu) hudBtnMenu.addEventListener("click", () => toggleGameMenu());
    if (btnCloseGameMenu) btnCloseGameMenu.addEventListener("click", () => closeGameMenu());
    if (btnMenuResume) btnMenuResume.addEventListener("click", () => closeGameMenu());
    if (menuTabBtnSettings) menuTabBtnSettings.addEventListener("click", () => switchGameMenuTab("settings"));
    if (menuTabBtnShop) menuTabBtnShop.addEventListener("click", () => switchGameMenuTab("shop"));
    if (menuTabBtnFriends) menuTabBtnFriends.addEventListener("click", () => switchGameMenuTab("friends"));
    if (menuTabBtnStats) menuTabBtnStats.addEventListener("click", () => switchGameMenuTab("stats"));
    if (settingDmgNumbers) {
      settingDmgNumbers.addEventListener("change", (e) => {
        FX.showDamageNumbers = e.target.checked;
      });
    }
    if (settingFxSparks) {
      settingFxSparks.addEventListener("change", (e) => {
        FX.showSparks = e.target.checked;
      });
    }
    if (btnToggleFullscreen) {
      btnToggleFullscreen.addEventListener("click", () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {
          });
          btnToggleFullscreen.textContent = "\u{1F5A5}\uFE0F Esci da Fullscreen";
        } else {
          document.exitFullscreen().catch(() => {
          });
          btnToggleFullscreen.textContent = "\u{1F5A5}\uFE0F Attiva Fullscreen";
        }
      });
    }
    if (btnCopyFriendCode) {
      btnCopyFriendCode.addEventListener("click", () => {
        if (myFriendIdDisplay) {
          navigator.clipboard.writeText(myFriendIdDisplay.textContent).then(() => {
            btnCopyFriendCode.textContent = "\u2713 Copiato!";
            setTimeout(() => {
              btnCopyFriendCode.textContent = "Copia";
            }, 2e3);
          }).catch(() => {
          });
        }
      });
    }
    if (btnMenuQuit) {
      btnMenuQuit.addEventListener("click", async () => {
        if (confirm("Vuoi terminare la spedizione ora? I progressi, l'oro e i materiali raccolti verranno salvati.")) {
          closeGameMenu();
          await handleGameOver();
        }
      });
    }
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
      chests = [];
      mysteryPillars = [];
      POINTS_OF_INTEREST.forEach((poi) => {
        if (poi.type === "boss") {
          const bossEnemy = new Enemy(poi.tx * world.TS, poi.ty * world.TS, poi.bossKind);
          combat.enemies.push(bossEnemy);
          const chest = new Chest((poi.tx + 1.8) * world.TS, poi.ty * world.TS, poi);
          chests.push(chest);
        } else if (poi.type === "mystery") {
          const wfChest = new Chest(poi.tx * world.TS, poi.ty * world.TS, poi);
          chests.push(wfChest);
          mysteryPillars = [
            new MysteryPillar((poi.tx - 2.2) * world.TS, (poi.ty - 1.2) * world.TS, 1, "Runa del Flusso"),
            new MysteryPillar((poi.tx + 2.2) * world.TS, (poi.ty - 1.2) * world.TS, 2, "Runa della Marea"),
            new MysteryPillar(poi.tx * world.TS, (poi.ty + 2.2) * world.TS, 3, "Runa degli Abissi")
          ];
        }
      });
      combat.onBossKilled = (boss) => {
        const matchChest = chests.find((c) => {
          if (!c.poi) return false;
          if (c.poi.bossKind === boss.kind) return true;
          const shortKind = boss.kind.replace("boss_", "");
          return c.poi.id.includes(shortKind) || c.id && c.id.includes(shortKind);
        });
        if (matchChest) {
          matchChest.unlock();
          camera.kick(0.48);
          showWeaponNotification(`\u{1F451} ${boss.name} Sconfitto! ${matchChest.name} SBLOCCATO!`);
        }
      };
      combat.enemies.push(new Enemy(140, -170, "slime_forest"));
      combat.enemies.push(new Enemy(180, -190, "slime_forest"));
      combat.enemies.push(new Enemy(-160, -170, "slime_ice"));
      combat.enemies.push(new Enemy(-180, 150, "slime_sand"));
      combat.enemies.push(new Enemy(170, 160, "skeleton"));
      for (let i = 0; i < 14; i++) {
        const pt = world.findValidSpawn(350, 2600, "forest");
        combat.enemies.push(new Enemy(pt.x, pt.y, "slime_forest"));
      }
      for (let i = 0; i < 14; i++) {
        const pt = world.findValidSpawn(350, 2600, "snow");
        combat.enemies.push(new Enemy(pt.x, pt.y, "slime_ice"));
      }
      for (let i = 0; i < 14; i++) {
        const pt = world.findValidSpawn(350, 2600, "desert");
        combat.enemies.push(new Enemy(pt.x, pt.y, "slime_sand"));
      }
      for (let i = 0; i < 14; i++) {
        const pt = world.findValidSpawn(350, 2600, "volcano");
        combat.enemies.push(new Enemy(pt.x, pt.y, "slime_magma"));
      }
      for (let i = 0; i < 12; i++) {
        const pt = world.findValidSpawn(350, 2600, "river");
        combat.enemies.push(new Enemy(pt.x, pt.y, "slime_water"));
      }
      for (let i = 0; i < 20; i++) {
        const pt = world.findValidSpawn(400, 2800);
        combat.enemies.push(new Enemy(pt.x, pt.y, "skeleton"));
      }
      closeIngameInventory();
      closeTacticalMap();
      closeGameMenu();
      closeBlacksmithModal();
      menuScreen?.classList.add("hidden");
      gameHud?.classList.remove("hidden");
      modalGameOver?.classList.add("hidden");
      showWeaponNotification("\u2694\uFE0F Clicca col MOUSE per attaccare! [E]: Interagisci \xB7 [1/2/3]: Armi \xB7 [I]: Zaino");
    }
    function handleWorldClickInteraction(aimWorld) {
      if (!aimWorld || gameState !== "PLAYING") return false;
      for (const ch of chests) {
        if (ch.hitTest(aimWorld.x, aimWorld.y) || Math.hypot(aimWorld.x - ch.x, aimWorld.y - ch.y) <= 42) {
          if (Math.hypot(player.x - ch.x, player.y - ch.y) <= 90) {
            if (ch.isLocked && ch.poi && ch.poi.bossKind) {
              const bossAlive = combat.enemies.some((e) => e.kind === ch.poi.bossKind && !e.dead && !e.isDying);
              if (!bossAlive) {
                ch.unlock();
              }
            }
            if (ch.isLocked) {
              showWeaponNotification(`\u{1F512} ${ch.name} \xE8 sigillato! Sconfiggi il Boss custode!`);
            } else if (!ch.isOpen) {
              const opened = ch.open(combat, player);
              if (opened) {
                camera.kick(0.35);
                showWeaponNotification(`\u2728 Hai aperto ${ch.name}! Oro, XP e artefatti riscattati!`);
                renderIngameLoot();
                renderIngameForge();
              }
            }
            return true;
          }
        }
      }
      const nearbyBs = world.getNearbyBlacksmith(player.x, player.y, 90);
      if (nearbyBs) {
        const bsWorldX = nearbyBs.tx * world.TS;
        const bsWorldY = nearbyBs.ty * world.TS;
        if (Math.hypot(aimWorld.x - bsWorldX, aimWorld.y - bsWorldY) <= 42) {
          openBlacksmithModal(nearbyBs);
          return true;
        }
      }
      for (const p of mysteryPillars) {
        if (Math.hypot(aimWorld.x - p.x, aimWorld.y - p.y) <= 38) {
          if (Math.hypot(player.x - p.x, player.y - p.y) <= 85 && !p.activated) {
            p.activate();
            camera.kick(0.2);
            const activeCount = mysteryPillars.filter((pil) => pil.activated).length;
            if (activeCount === mysteryPillars.length) {
              const wfChest = chests.find((c) => c.id === "chest_waterfall");
              if (wfChest && wfChest.isLocked) {
                wfChest.unlock();
                camera.kick(0.48);
                showWeaponNotification("\u{1F30A} Il Sigillo delle Tre Rune \xE8 infranto! Forziere Sommerso SBLOCCATO!");
              }
            } else {
              showWeaponNotification(`\u{1F52E} Runa attivata (${activeCount}/${mysteryPillars.length})! Trova le altre rune della cascata!`);
            }
            return true;
          }
        }
      }
      const nearbyWp = world.getNearbyWaypoint(player.x, player.y, 95);
      if (nearbyWp) {
        if (Math.hypot(aimWorld.x - nearbyWp.worldX, aimWorld.y - nearbyWp.worldY) <= 46) {
          openTeleportModal();
          return true;
        }
      }
      const clickedNode = world.getResourceNodeAt(aimWorld.x, aimWorld.y, 36);
      if (clickedNode) {
        if (Math.hypot(player.x - clickedNode.x, player.y - clickedNode.y) <= 85) {
          if (!clickedNode.isDepleted) {
            if (!clickedNode.isHarvesting) {
              clickedNode.startHarvest(player);
              showWeaponNotification(`\u26CF\uFE0F Raccolta di ${clickedNode.def.name}... Resta vicino!`);
            }
          } else {
            showWeaponNotification(`\u23F3 Questo giacimento \xE8 esaurito! Ricrescer\xE0 tra poco.`);
          }
          return true;
        } else {
          showWeaponNotification(`\u26CF\uFE0F Avvicinati a ${clickedNode.def.name} per raccogliere!`);
          return true;
        }
      }
      return false;
    }
    function handleInteraction() {
      if (!currentNearbyInteractable || gameState !== "PLAYING") return;
      if (currentNearbyInteractable.type === "blacksmith") {
        openBlacksmithModal(currentNearbyInteractable.data);
      } else if (currentNearbyInteractable.type === "waypoint") {
        openTeleportModal();
      } else if (currentNearbyInteractable.type === "resource_node") {
        const node = currentNearbyInteractable.data;
        if (node.isHarvesting) {
        } else if (node.isDepleted) {
          showWeaponNotification(`\u23F3 Questo giacimento \xE8 esaurito! Ricrescer\xE0 tra poco.`);
        } else {
          node.startHarvest(player);
          showWeaponNotification(`\u26CF\uFE0F Raccolta di ${node.def.name}... Resta vicino!`);
        }
      } else if (currentNearbyInteractable.type === "chest") {
        const ch = currentNearbyInteractable.data;
        if (ch.isLocked && ch.poi && ch.poi.bossKind) {
          const bossAlive = combat.enemies.some((e) => e.kind === ch.poi.bossKind && !e.dead && !e.isDying);
          if (!bossAlive) {
            ch.unlock();
          }
        }
        if (ch.isLocked) {
          showWeaponNotification(`\u{1F512} ${ch.name} \xE8 sigillato! Sconfiggi il Boss custode!`);
        } else if (!ch.isOpen) {
          const opened = ch.open(combat, player);
          if (opened) {
            camera.kick(0.35);
            showWeaponNotification(`\u2728 Hai aperto ${ch.name}! Oro, XP e artefatti riscattati!`);
            renderIngameLoot();
            renderIngameForge();
          }
        }
      } else if (currentNearbyInteractable.type === "mystery_pillar") {
        const p = currentNearbyInteractable.data;
        if (!p.activated) {
          p.activate();
          camera.kick(0.2);
          const activeCount = mysteryPillars.filter((pil) => pil.activated).length;
          if (activeCount === mysteryPillars.length) {
            const wfChest = chests.find((c) => c.id === "chest_waterfall");
            if (wfChest && wfChest.isLocked) {
              wfChest.unlock();
              camera.kick(0.48);
              showWeaponNotification("\u{1F30A} Il Sigillo delle Tre Rune \xE8 infranto! Forziere Sommerso SBLOCCATO!");
            }
          } else {
            showWeaponNotification(`\u{1F52E} Runa attivata (${activeCount}/${mysteryPillars.length})! Trova le altre rune della cascata!`);
          }
        }
      }
    }
    hudInteractPrompt?.addEventListener("click", handleInteraction);
    btnStartRun?.addEventListener("click", startExpedition);
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
      if (elSumTime) elSumTime.textContent = formatTime(runStats.survivalSeconds);
      if (elSumLevel) elSumLevel.textContent = `${runStats.level}`;
      if (elSumKills) elSumKills.textContent = `${runStats.kills}`;
      if (elSumGold) elSumGold.textContent = `+${res.finalGold} \u{1FA99}`;
      if (elSumItems) elSumItems.textContent = `+${totalItems} \u{1F392}`;
      if (elSumScore) elSumScore.textContent = `${res.score}`;
      gameHud?.classList.add("hidden");
      modalGameOver?.classList.remove("hidden");
    }
    player.onDeath = () => handleGameOver();
    btnReturnSanctuary?.addEventListener("click", async () => {
      modalGameOver?.classList.add("hidden");
      menuScreen?.classList.remove("hidden");
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
      modalLevelUp?.classList.add("hidden");
    };
    window.addEventListener("keydown", (e) => {
      if (progression.isPausedForLevelUp) {
        if (e.key === "1") progression.chooseUpgrade(0);
        else if (e.key === "2") progression.chooseUpgrade(1);
        else if (e.key === "3") progression.chooseUpgrade(2);
        return;
      }
      if (gameState === "PLAYING") {
        if (e.code === "KeyE" || e.key === "e" || e.key === "E") {
          e.preventDefault();
          if (isBlacksmithOpen) {
            closeBlacksmithModal();
            return;
          }
          if (isTeleportOpen) {
            closeTeleportModal();
            return;
          }
          if (!isInventoryOpen && !isMapOpen && !isMenuOpen && !isTeleportOpen) {
            handleInteraction();
          }
          return;
        }
        if (e.code === "KeyT" || e.key === "t" || e.key === "T") {
          e.preventDefault();
          toggleTeleportModal();
          return;
        }
        if (e.code === "KeyI" || e.code === "KeyB" || e.key === "i" || e.key === "I" || e.key === "b" || e.key === "B") {
          e.preventDefault();
          toggleIngameInventory();
          return;
        }
        if (e.code === "KeyM" || e.key === "m" || e.key === "M") {
          e.preventDefault();
          toggleTacticalMap();
          return;
        }
        if (e.key === "Escape" || e.code === "Escape") {
          if (isTeleportOpen) {
            closeTeleportModal();
            return;
          }
          if (isBlacksmithOpen) {
            closeBlacksmithModal();
            return;
          }
          if (isMapOpen) {
            closeTacticalMap();
            return;
          }
          if (isInventoryOpen) {
            closeIngameInventory();
            return;
          }
          if (isMenuOpen) {
            closeGameMenu();
            return;
          }
          openGameMenu("settings");
          return;
        }
        if (!isInventoryOpen && !isMapOpen && !isMenuOpen && !isBlacksmithOpen && !isTeleportOpen) {
          if (e.key === "1") equipWeapon("staff");
          else if (e.key === "2") equipWeapon("sword");
          else if (e.key === "3") equipWeapon("bow");
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
      initTitleParticles();
    }
    window.addEventListener("resize", handleResize);
    handleResize();
    let lastTime = performance.now();
    let frameCount = 0;
    let fpsTimer = 0;
    let currentFps = 60;
    let minimapTimer = 0;
    let enemyRespawnTimer = 0;
    function spawnEnemyForLocation(x, y) {
      const tx = world.tileOf(x);
      const ty = world.tileOf(y);
      const b = world.getBiome(tx, ty);
      const roll = Math.random();
      let kind = "slime_forest";
      if (b === "river") {
        if (roll < 0.55) kind = "slime_water";
        else if (roll < 0.85) kind = "bat";
        else kind = "skeleton";
      } else if (b === "snow") {
        if (roll < 0.5) kind = "slime_ice";
        else if (roll < 0.8) kind = "skeleton";
        else kind = "bat";
      } else if (b === "desert") {
        if (roll < 0.45) kind = "slime_sand";
        else if (roll < 0.8) kind = "orc";
        else kind = "skeleton";
      } else if (b === "volcano") {
        if (roll < 0.45) kind = "slime_magma";
        else if (roll < 0.8) kind = "orc";
        else kind = "skeleton";
      } else {
        if (roll < 0.45) kind = "slime_forest";
        else if (roll < 0.7) kind = "skeleton";
        else if (roll < 0.9) kind = "bat";
        else kind = "orc";
      }
      return new Enemy(x, y, kind);
    }
    function drawCrosshairHUD(ctx2, screenX, screenY, dpr = 1) {
      const cx = screenX * dpr;
      const cy = screenY * dpr;
      const isLockedOn = Boolean(combat.currentTarget);
      const isOverInteract = Boolean(currentNearbyInteractable);
      const color = isOverInteract ? "#fde047" : isLockedOn ? "#ef4444" : "#38bdf8";
      const cdProgress = combat.cooldownProgress;
      const r = Math.round(13 * dpr);
      ctx2.save();
      ctx2.translate(cx, cy);
      if (cdProgress < 1) {
        ctx2.strokeStyle = "rgba(15, 23, 42, 0.7)";
        ctx2.lineWidth = 3.5 * dpr;
        ctx2.beginPath();
        ctx2.arc(0, 0, r + 4.5 * dpr, 0, Math.PI * 2);
        ctx2.stroke();
        ctx2.strokeStyle = "#38bdf8";
        ctx2.lineWidth = 2.4 * dpr;
        ctx2.beginPath();
        ctx2.arc(0, 0, r + 4.5 * dpr, -Math.PI / 2, -Math.PI / 2 + cdProgress * Math.PI * 2);
        ctx2.stroke();
      }
      ctx2.strokeStyle = color;
      ctx2.lineWidth = 1.6 * dpr;
      ctx2.beginPath();
      ctx2.arc(0, 0, r, 0, Math.PI * 2);
      ctx2.stroke();
      const gap = 3 * dpr;
      const len = 5 * dpr;
      ctx2.beginPath();
      ctx2.moveTo(0, -(r + gap));
      ctx2.lineTo(0, -(r + gap + len));
      ctx2.stroke();
      ctx2.beginPath();
      ctx2.moveTo(0, r + gap);
      ctx2.lineTo(0, r + gap + len);
      ctx2.stroke();
      ctx2.beginPath();
      ctx2.moveTo(-(r + gap), 0);
      ctx2.lineTo(-(r + gap + len), 0);
      ctx2.stroke();
      ctx2.beginPath();
      ctx2.moveTo(r + gap, 0);
      ctx2.lineTo(r + gap + len, 0);
      ctx2.stroke();
      ctx2.fillStyle = color;
      if (isLockedOn) {
        const dSize = 3 * dpr;
        ctx2.beginPath();
        ctx2.moveTo(0, -dSize);
        ctx2.lineTo(dSize, 0);
        ctx2.lineTo(0, dSize);
        ctx2.lineTo(-dSize, 0);
        ctx2.closePath();
        ctx2.fill();
      } else {
        ctx2.beginPath();
        ctx2.arc(0, 0, 2 * dpr, 0, Math.PI * 2);
        ctx2.fill();
      }
      ctx2.restore();
    }
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
        if (gameState === "MENU") {
          updateAndDrawTitleBackground(dt, currentTime / 1e3);
          updateAndDrawHeroPreview(dt, currentTime / 1e3);
        }
        const isPaused = isInventoryOpen || isMapOpen || isMenuOpen || isBlacksmithOpen || isTeleportOpen || progression.isPausedForLevelUp;
        if (gameState === "PLAYING") {
          if (!isPaused) {
            runSurvivalSeconds += dt;
            player.update(dt, Input, world);
            const aimWorld = camera.screenToWorld(mouseScreen.x, mouseScreen.y, canvas);
            const isAttacking = isMouseDown || Input.isDown("space");
            combat.update(dt, player, world, camera, isAttacking, aimWorld);
            camera.follow(player.x, player.y, dt);
            let foundInteractable = null;
            const nearbyBs = world.getNearbyBlacksmith(player.x, player.y, 85);
            if (nearbyBs) {
              foundInteractable = {
                type: "blacksmith",
                data: nearbyBs,
                label: `Parla con ${nearbyBs.name} (Fabbro)`
              };
            }
            if (!foundInteractable) {
              for (const ch of chests) {
                const dist = Math.hypot(player.x - ch.x, player.y - ch.y);
                if (dist <= 85 && !ch.isOpen) {
                  if (ch.isLocked && ch.poi && ch.poi.bossKind) {
                    const bossStillAlive = combat.enemies.some((e) => e.kind === ch.poi.bossKind && !e.dead && !e.isDying);
                    if (!bossStillAlive) {
                      ch.unlock();
                    }
                  }
                  foundInteractable = {
                    type: "chest",
                    data: ch,
                    label: ch.isLocked ? `\u{1F512} ${ch.name} (Sigillato)` : `Apri ${ch.name}`
                  };
                  break;
                }
              }
            }
            if (!foundInteractable) {
              for (const p of mysteryPillars) {
                const dist = Math.hypot(player.x - p.x, player.y - p.y);
                if (dist <= 80 && !p.activated) {
                  foundInteractable = {
                    type: "mystery_pillar",
                    data: p,
                    label: `Attiva ${p.name}`
                  };
                  break;
                }
              }
            }
            if (!foundInteractable) {
              const nearbyWp = world.getNearbyWaypoint(player.x, player.y, 85);
              if (nearbyWp) {
                foundInteractable = {
                  type: "waypoint",
                  data: nearbyWp,
                  label: `Portale dell'Aether (${nearbyWp.settlementName})`
                };
              }
            }
            if (!foundInteractable) {
              const nearbyNode = world.getNearbyResourceNode(player.x, player.y, 75);
              if (nearbyNode) {
                if (nearbyNode.isHarvesting) {
                  const pct = Math.round(nearbyNode.progress * 100);
                  foundInteractable = {
                    type: "resource_node",
                    data: nearbyNode,
                    label: `Estraendo ${nearbyNode.def.name}... (${pct}%)`
                  };
                } else if (!nearbyNode.isDepleted) {
                  foundInteractable = {
                    type: "resource_node",
                    data: nearbyNode,
                    label: `Estrai ${nearbyNode.def.name} (${nearbyNode.charges}/${nearbyNode.maxCharges}) [E o Click]`
                  };
                }
              }
            }
            currentNearbyInteractable = foundInteractable;
            if (hudInteractPrompt && hudInteractLabel) {
              if (foundInteractable && !isInventoryOpen && !isMapOpen && !isMenuOpen && !isBlacksmithOpen && !isTeleportOpen) {
                hudInteractPrompt.classList.remove("hidden");
                hudInteractLabel.textContent = foundInteractable.label;
              } else {
                hudInteractPrompt.classList.add("hidden");
              }
            }
            world.updateResourceNodes(dt, player, combat);
            chests.forEach((ch) => ch.update(dt, player));
            mysteryPillars.forEach((p) => p.update(dt));
            enemyRespawnTimer += dt;
            if (enemyRespawnTimer >= 3 && combat.enemies.length < 75) {
              enemyRespawnTimer = 0;
              const pt = world.findValidSpawn(460, 950, null, player.x, player.y);
              if (!world.isSafeZone(pt.x, pt.y)) {
                combat.enemies.push(spawnEnemyForLocation(pt.x, pt.y));
              }
            }
          }
        }
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = false;
        ctx.save();
        camera.apply(ctx);
        world.drawGround(ctx, camera);
        combat.drawPickups(ctx);
        world.drawEntitiesAndProps(ctx, camera, [
          player,
          ...chests,
          ...mysteryPillars,
          ...combat.getAllTargets()
        ]);
        combat.drawOrbitOrbs(ctx, player);
        combat.drawProjectiles(ctx);
        combat.drawFX(ctx);
        ctx.restore();
        world.drawVignette(ctx, canvas.width, canvas.height);
        if (gameState === "PLAYING" && !isPaused) {
          drawCrosshairHUD(ctx, mouseScreen.x, mouseScreen.y, camera.dpr);
        }
        ctx.restore();
        if (gameState === "PLAYING") {
          minimapTimer += dt;
          if (minimapTimer >= 0.08) {
            minimapTimer = 0;
            renderMinimap();
            if (isMapOpen) {
              renderTacticalMap();
            }
          }
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
    const session = await API.restoreSession();
    if (session && session.user) {
      await refreshProfile(session.user.username);
    } else {
      await refreshProfile();
      openAuthModal("login");
    }
    requestAnimationFrame(loop);
  });
})();
//# sourceMappingURL=bundle.js.map
