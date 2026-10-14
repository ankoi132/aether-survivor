(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res, err) => function __init() {
    if (err) throw err[0];
    try {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
    } catch (e) {
      throw err = [e], e;
    }
  };
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };

  // src/core/input.js
  var Input;
  var init_input = __esm({
    "src/core/input.js"() {
      Input = (() => {
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
    }
  });

  // src/core/camera.js
  var Camera;
  var init_camera = __esm({
    "src/core/camera.js"() {
      Camera = class {
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
    }
  });

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
  var Tiles;
  var init_tiles = __esm({
    "src/world/tiles.js"() {
      Tiles = /* @__PURE__ */ (() => {
        const T = 16;
        const BIOMES = [
          {
            name: "Foresta Arcana",
            liquid: "water",
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
            shore: "#3d4f2a",
            leaf: ["#166534", "#15803d", "#22c55e", "#4ade80"],
            trunk: ["#451a03", "#78350f"],
            rock: ["#64748b", "#94a3b8", "#cbd5e1"]
          }
        ];
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
          if (dirtCount <= T * T / 2) {
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
          const B = BIOMES[0];
          const P = Pix(32, 42);
          const L = B.leaf.map((h) => pack(h));
          const Tr = B.trunk.map((h) => pack(h));
          const edge = pack("#0f172a");
          for (let y = 26; y < 40; y++) {
            for (let x = 14; x < 19; x++) {
              P.set(x, y, Tr[x === 14 || x === 18 ? 0 : 1]);
            }
          }
          P.set(13, 39, Tr[0]);
          P.set(19, 39, Tr[0]);
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
              return hash(x, y, 41) < 0.15 && idx > 0 ? L[idx - 1] : L[idx];
            });
          }
          outline(P, edge);
          return P.canvas();
        }
        function paintRock() {
          const B = BIOMES[0];
          const P = Pix(24, 18);
          const R = B.rock.map((h) => pack(h));
          const edge = pack("#0f172a");
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
        const propCache = /* @__PURE__ */ new Map();
        return {
          T,
          paintChunk(cx, cy, n, at, seed = 0) {
            const B = BIOMES[0];
            const P = Pix(n * T, n * T);
            const C = {};
            for (const k of ["floor", "dirt", "wallTop", "wallFace", "flowers", "leaf"]) {
              C[k] = B[k].map((h) => pack(h));
            }
            for (const k of ["speck", "light", "wallLight", "wallEdge", "wallFaceDark", "liq", "liqDeep", "foam", "shore"]) {
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
                paintFloor(P, C, ox, oy, tx, ty, dirtAt, at);
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
              else if (type === "rock") propCache.set(type, paintRock());
            }
            return propCache.get(type);
          }
        };
      })();
    }
  });

  // src/core/sprites.js
  var Sprites;
  var init_sprites = __esm({
    "src/core/sprites.js"() {
      Sprites = /* @__PURE__ */ (() => {
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
        function renderHeroFrame(dir, isWalking, frameIndex) {
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
          const staffX = isFacingLeft ? cx - 8 * PX : cx + 6 * PX;
          const staffY = cy - 9 * PX;
          ctx.fillStyle = PALETTE.outline;
          ctx.fillRect(staffX - 1, staffY - 1, 2 * PX + 2, 16 * PX + 2);
          ctx.fillStyle = PALETTE.staffWood;
          ctx.fillRect(staffX, staffY, 2 * PX, 16 * PX);
          ctx.fillStyle = PALETTE.staffLight;
          ctx.fillRect(staffX, staffY, 1 * PX, 16 * PX);
          ctx.fillStyle = "rgba(56, 189, 248, 0.4)";
          ctx.fillRect(staffX - 2 * PX, staffY - 3 * PX, 6 * PX, 6 * PX);
          ctx.fillStyle = PALETTE.gemGlow;
          ctx.fillRect(staffX - 1 * PX, staffY - 2 * PX, 4 * PX, 4 * PX);
          ctx.fillStyle = PALETTE.gemCore;
          ctx.fillRect(staffX, staffY - 1 * PX, 2 * PX, 2 * PX);
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
          const isWater = type === "water";
          const cOutline = isWater ? "#082f49" : "#052e16";
          const cBase = isWater ? "#0284c7" : "#16a34a";
          const cLight = isWater ? "#38bdf8" : "#4ade80";
          const cHighlight = isWater ? "#bae6fd" : "#bbf7d0";
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
        function getHeroSprite(dir, isWalking, frame) {
          const key = `hero_${dir}_${isWalking ? 1 : 0}_${frame}`;
          if (!cache.has(key)) {
            cache.set(key, renderHeroFrame(dir, isWalking, frame));
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
    }
  });

  // src/world/world.js
  var World;
  var init_world = __esm({
    "src/world/world.js"() {
      init_tiles();
      init_sprites();
      World = class {
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
        getTileType(tx, ty) {
          if (Math.abs(tx) >= this.MAP_RADIUS - 3 || Math.abs(ty) >= this.MAP_RADIUS - 3) {
            return this.TILE_WALL;
          }
          if (Math.abs(tx) <= 5 && Math.abs(ty) <= 5) {
            return this.TILE_FLOOR;
          }
          const isWaterBiome = tx > 0 && ty > 0;
          const waterThreshold = isWaterBiome ? 0.65 : 0.82;
          const waterNoise = this.hash2D(Math.floor(tx / 3), Math.floor(ty / 3), 101);
          if (waterNoise > waterThreshold) {
            return this.TILE_WATER;
          }
          const isRuinsBiome = tx > 0 && ty < 0;
          const wallNoise = this.hash2D(tx, ty, 42);
          if (wallNoise > (isRuinsBiome ? 0.84 : 0.91)) {
            return this.TILE_WALL;
          }
          const isForestBiome = tx < 0 && ty < 0;
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
          if (t === this.TILE_WALL) return "wall";
          if (t === this.TILE_WATER) return "liquid";
          return "floor";
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
          const canvas = Tiles.paintChunk(cx, cy, this.N, (tx, ty) => this.getKind(tx, ty), this.seed);
          this.chunkCanvases.set(key, canvas);
          const props = [];
          for (let lty = 0; lty < this.N; lty++) {
            for (let ltx = 0; ltx < this.N; ltx++) {
              const tx = cx * this.N + ltx;
              const ty = cy * this.N + lty;
              const t = this.getTileType(tx, ty);
              if (t === this.TILE_TREE) {
                props.push({ type: "tree", x: tx * this.TS + this.TS / 2, y: ty * this.TS + this.TS });
              } else if (t === this.TILE_ROCK) {
                props.push({ type: "rock", x: tx * this.TS + this.TS / 2, y: ty * this.TS + this.TS / 2 });
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
                      Sprites.drawShadow(ctx, p.x, p.y - 2, p.type === "tree" ? 14 : 10);
                      ctx.drawImage(
                        sprite,
                        Math.round(p.x - sw / 2),
                        Math.round(p.y - sh + (p.type === "tree" ? 8 : 4)),
                        sw,
                        sh
                      );
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
    }
  });

  // src/entities/player.js
  var Player;
  var init_player = __esm({
    "src/entities/player.js"() {
      init_sprites();
      Player = class {
        constructor(x = 0, y = 0) {
          this.x = x;
          this.y = y;
          this.r = 14;
          this.baseSpd = 105;
          this.hp = 100;
          this.maxHp = 100;
          this.magnetRadius = 85;
          this.dir = 0;
          this.moveAngle = Math.PI / 2;
          this.walking = false;
          this.inLiquid = false;
          this.animTimer = 0;
          this.frame = 0;
        }
        get currentSpeed() {
          let s = this.baseSpd;
          if (this.inLiquid) {
            s *= 0.6;
          }
          return s;
        }
        update(dt, input, world) {
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
          Sprites.drawShadow(ctx, this.x, this.y + 4, 11);
          const sprite = Sprites.getHeroSprite(this.dir, this.walking, this.frame);
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
    }
  });

  // src/core/fx.js
  var FX;
  var init_fx = __esm({
    "src/core/fx.js"() {
      FX = /* @__PURE__ */ (() => {
        const particles = [];
        const damageTexts = [];
        return {
          /**
           * Esplosione circolare di particelle di impatto
           */
          burst(x, y, color = "#38bdf8", count = 8, speed = 120) {
            for (let i = 0; i < count; i++) {
              const angle = Math.random() * Math.PI * 2;
              const s = speed * (0.3 + Math.random() * 0.7);
              particles.push({
                x,
                y,
                vx: Math.cos(angle) * s,
                vy: Math.sin(angle) * s,
                color,
                size: Math.random() < 0.3 ? 3 : 2,
                life: 0.25 + Math.random() * 0.25,
                t: 0
              });
            }
          },
          /**
           * Scia o scintilla direzionale
           */
          spark(x, y, color = "#bae6fd", size = 2) {
            particles.push({
              x: x + (Math.random() * 4 - 2),
              y: y + (Math.random() * 4 - 2),
              vx: Math.random() * 20 - 10,
              vy: Math.random() * 20 - 10,
              color,
              size,
              life: 0.18 + Math.random() * 0.12,
              t: 0
            });
          },
          /**
           * Numero di danno fluttuante che sale verso l'alto e sfuma
           */
          addDamageNumber(x, y, amount, isCrit = false) {
            damageTexts.push({
              x: x + (Math.random() * 12 - 6),
              y: y - 10,
              text: `-${amount}`,
              vy: -48,
              life: 0.75,
              t: 0,
              isCrit
            });
          },
          number(x, y, amount, color = "#fde047") {
            damageTexts.push({
              x: x + (Math.random() * 12 - 6),
              y: y - 10,
              text: `-${amount}`,
              vy: -48,
              life: 0.75,
              t: 0,
              isCrit: color === "#fde047"
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
              p.vx *= 0.92;
              p.vy *= 0.92;
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
            }
          },
          draw(ctx) {
            ctx.save();
            for (const p of particles) {
              const alpha = Math.max(0, 1 - p.t / p.life);
              ctx.fillStyle = p.color;
              ctx.globalAlpha = alpha;
              ctx.fillRect(Math.round(p.x - p.size / 2), Math.round(p.y - p.size / 2), p.size, p.size);
            }
            ctx.font = 'bold 13px "Courier New", monospace, sans-serif';
            ctx.textAlign = "center";
            for (const d of damageTexts) {
              const alpha = Math.max(0, 1 - d.t / d.life);
              ctx.globalAlpha = alpha;
              ctx.fillStyle = "#080a0f";
              ctx.fillText(d.text, Math.round(d.x) + 1, Math.round(d.y) + 1);
              ctx.fillText(d.text, Math.round(d.x) - 1, Math.round(d.y) - 1);
              ctx.fillStyle = d.isCrit ? "#fde047" : "#e0f2fe";
              ctx.fillText(d.text, Math.round(d.x), Math.round(d.y));
            }
            ctx.restore();
          }
        };
      })();
    }
  });

  // src/entities/enemy.js
  var Enemy;
  var init_enemy = __esm({
    "src/entities/enemy.js"() {
      init_sprites();
      init_fx();
      Enemy = class {
        constructor(x, y, kind = "slime_forest") {
          this.x = x;
          this.y = y;
          this.kind = kind;
          this.spawnX = x;
          this.spawnY = y;
          if (kind === "slime_forest") {
            this.name = "Slime Silvano";
            this.maxHp = 35;
            this.baseSpd = 50;
            this.r = 13;
            this.aggroRadius = 180;
            this.xpValue = 12;
            this.gemType = "cyan";
          } else if (kind === "slime_water") {
            this.name = "Slime delle Onde";
            this.maxHp = 45;
            this.baseSpd = 62;
            this.r = 13;
            this.aggroRadius = 195;
            this.xpValue = 16;
            this.gemType = "cyan";
          } else {
            this.name = "Scheletro Guardiano";
            this.maxHp = 70;
            this.baseSpd = 72;
            this.r = 14;
            this.aggroRadius = 210;
            this.xpValue = 25;
            this.gemType = "emerald";
          }
          this.hp = this.maxHp;
          this.dead = false;
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
          this.alertTimer = 0;
        }
        takeDamage(dmg, knockbackAngle, knockbackForce = 120) {
          if (this.dead) return;
          this.hp = Math.max(0, this.hp - dmg);
          this.flashTimer = 0.12;
          if (this.state === "WANDER") {
            this.state = "CHASE";
            this.alertTimer = 0.8;
          }
          this.vx += Math.cos(knockbackAngle) * knockbackForce;
          this.vy += Math.sin(knockbackAngle) * knockbackForce;
          FX.burst(this.x, this.y - 8, "#f8fafc", 5, 80);
          FX.addDamageNumber(this.x, this.y - 20, dmg, false);
          if (this.hp <= 0) {
            this.dead = true;
            const deathColor = this.kind.startsWith("slime") ? "#22c55e" : "#cbd5e1";
            FX.burst(this.x, this.y - 10, deathColor, 12, 110);
          }
        }
        update(dt, player, world) {
          if (this.dead) return;
          if (this.flashTimer > 0) {
            this.flashTimer -= dt;
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
          Sprites.drawShadow(ctx, this.x, this.y + 4, this.kind.startsWith("slime") ? 9 : 10);
          ctx.save();
          if (this.flashTimer > 0) {
            ctx.filter = "brightness(2.2)";
          }
          if (this.kind === "slime_forest") {
            const sprite = Sprites.getSlimeSprite("forest", this.frame);
            const sw = sprite.width;
            const sh = sprite.height;
            ctx.drawImage(sprite, Math.round(this.x - sw / 2), Math.round(this.y - sh + 8));
          } else if (this.kind === "slime_water") {
            const sprite = Sprites.getSlimeSprite("water", this.frame);
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
    }
  });

  // src/entities/projectile.js
  var Projectile;
  var init_projectile = __esm({
    "src/entities/projectile.js"() {
      init_fx();
      Projectile = class {
        constructor(x, y, angle, options = {}) {
          this.x = x;
          this.y = y;
          this.speed = options.speed || 340;
          this.vx = Math.cos(angle) * this.speed;
          this.vy = Math.sin(angle) * this.speed;
          this.dmg = options.dmg || 18;
          this.r = options.r || 5;
          this.life = options.life || 1.1;
          this.t = 0;
          this.dead = false;
          this.trailTimer = 0;
          this.color = options.color || "#38bdf8";
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
            FX.spark(this.x, this.y, "#bae6fd", 2);
          }
          const tx = world.tileOf(this.x);
          const ty = world.tileOf(this.y);
          if (world.isSolid(tx, ty)) {
            this.dead = true;
            FX.burst(this.x, this.y, "#93c5fd", 6, 80);
          }
        }
        draw(ctx) {
          ctx.save();
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
          ctx.restore();
        }
      };
    }
  });

  // src/entities/target.js
  var TrainingTarget;
  var init_target = __esm({
    "src/entities/target.js"() {
      init_sprites();
      init_fx();
      TrainingTarget = class {
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
          this.dead = false;
          this.respawnTimer = 0;
        }
        takeDamage(amount, knockAngle = 0, knockForce = 120) {
          if (this.dead) return;
          this.hp -= amount;
          this.flash = 0.15;
          this.vx = Math.cos(knockAngle) * knockForce;
          this.vy = Math.sin(knockAngle) * knockForce;
          FX.addDamageNumber(this.x, this.y - 12, amount);
          FX.burst(this.x, this.y - 6, "#38bdf8", 6, 90);
          if (this.hp <= 0) {
            this.hp = 0;
            this.dead = true;
            this.respawnTimer = 2.2;
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
              FX.burst(this.x, this.y - 10, "#22c55e", 12, 100);
            }
            return;
          }
          if (this.flash > 0) this.flash -= dt;
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
    }
  });

  // src/entities/pickup.js
  var GemPickup;
  var init_pickup = __esm({
    "src/entities/pickup.js"() {
      init_sprites();
      init_fx();
      GemPickup = class {
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
    }
  });

  // src/systems/combat.js
  var CombatSystem;
  var init_combat = __esm({
    "src/systems/combat.js"() {
      init_projectile();
      init_target();
      init_pickup();
      init_fx();
      CombatSystem = class {
        constructor() {
          this.projectiles = [];
          this.trainingTargets = [];
          this.enemies = [];
          this.pickups = [];
          this.baseCooldown = 0.85;
          this.cooldownTimer = 0;
          this.attackRange = 310;
          this.currentTarget = null;
          this.projectilesPerShot = 1;
          this.damageMultiplier = 1;
          this.hasOrbitOrb = false;
          this.orbitOrbsCount = 0;
          this.orbitAngle = 0;
          this.orbitDamageTimer = 0;
          this.setupDemoTargets();
        }
        setupDemoTargets() {
          this.trainingTargets = [
            new TrainingTarget(120, -50, "Manichino Est", 60),
            new TrainingTarget(-130, 40, "Manichino Ovest", 60)
          ];
        }
        getAllTargets() {
          return [...this.trainingTargets, ...this.enemies];
        }
        findNearestTarget(player) {
          let nearest = null;
          let minDist2 = this.attackRange * this.attackRange;
          for (const target of this.getAllTargets()) {
            if (target.dead) continue;
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
        update(dt, player, world, camera) {
          this.currentTarget = this.findNearestTarget(player);
          if (this.cooldownTimer > 0) {
            this.cooldownTimer -= dt;
          }
          if (this.currentTarget && this.cooldownTimer <= 0) {
            this.fireArcaneDarts(player, this.currentTarget);
            this.cooldownTimer = this.baseCooldown;
          }
          for (const t of this.trainingTargets) {
            t.update(dt, world);
          }
          for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            e.update(dt, player, world);
            if (e.dead) {
              this.pickups.push(new GemPickup(e.x, e.y, e.xpValue, e.gemType));
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
                  target.takeDamage(dmg, angle, 90);
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
              if (t.dead) continue;
              const dx = t.x - p.x;
              const dy = t.y - p.y;
              const dist2 = dx * dx + dy * dy;
              const hitRadius = p.r + t.r;
              if (dist2 < hitRadius * hitRadius) {
                const angle = Math.atan2(p.vy, p.vx);
                t.takeDamage(p.dmg, angle, 115);
                camera.kick(0.16);
                p.dead = true;
                this.projectiles.splice(i, 1);
                break;
              }
            }
          }
          FX.update(dt);
        }
        fireArcaneDarts(player, target) {
          const dx = target.x - player.x;
          const dy = target.y - (player.y - 12);
          const baseAngle = Math.atan2(dy, dx);
          const dmg = Math.round(18 * this.damageMultiplier);
          const count = this.projectilesPerShot;
          const spreadAngle = 0.22;
          const startAngle = baseAngle - (count - 1) * spreadAngle / 2;
          for (let i = 0; i < count; i++) {
            const angle = startAngle + i * spreadAngle;
            const spawnX = player.x + Math.cos(angle) * 12;
            const spawnY = player.y - 12 + Math.sin(angle) * 12;
            this.projectiles.push(new Projectile(spawnX, spawnY, angle, {
              speed: 360,
              dmg,
              r: 5
            }));
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
          if (this.hasOrbitOrb && this.currentTarget) {
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
        }
        drawFX(ctx) {
          FX.draw(ctx);
        }
      };
    }
  });

  // src/systems/progression.js
  var ProgressionSystem;
  var init_progression = __esm({
    "src/systems/progression.js"() {
      ProgressionSystem = class {
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
    }
  });

  // src/main.js
  var require_main = __commonJS({
    "src/main.js"() {
      init_input();
      init_camera();
      init_world();
      init_player();
      init_enemy();
      init_combat();
      init_progression();
      window.addEventListener("DOMContentLoaded", () => {
        const canvas = document.getElementById("gameCanvas");
        const ctx = canvas.getContext("2d");
        const elFps = document.getElementById("hud-fps");
        const elPos = document.getElementById("hud-pos");
        const elEnemies = document.getElementById("hud-enemies");
        const elLevel = document.getElementById("hud-level");
        const elXpFill = document.getElementById("xp-fill");
        const elXpText = document.getElementById("xp-text");
        const elDamage = document.getElementById("hud-damage");
        const elTarget = document.getElementById("hud-target");
        const elCdFill = document.getElementById("hud-cd-fill");
        const modalLevelUp = document.getElementById("levelup-modal");
        const cardsContainer = document.getElementById("upgrade-cards");
        const camera = new Camera(768, 420);
        const world = new World(2026);
        const player = new Player(0, 0);
        const combat = new CombatSystem();
        const progression = new ProgressionSystem(player, combat);
        camera.snapTo(player.x, player.y);
        function populateWorldEnemies() {
          for (let i = 0; i < 18; i++) {
            const pt = world.findValidSpawn(260, 1250);
            combat.enemies.push(new Enemy(pt.x, pt.y, "slime_forest"));
          }
          for (let i = 0; i < 12; i++) {
            const pt = world.findValidSpawn(280, 1300);
            combat.enemies.push(new Enemy(pt.x, pt.y, "slime_water"));
          }
          for (let i = 0; i < 14; i++) {
            const pt = world.findValidSpawn(320, 1380);
            combat.enemies.push(new Enemy(pt.x, pt.y, "skeleton"));
          }
        }
        populateWorldEnemies();
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
        window.addEventListener("error", (event) => {
          console.error("CRASH RILEVATO NEL GIOCO:", event.error || event.message);
        });
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
            if (!progression.isPausedForLevelUp) {
              player.update(dt, Input, world);
              combat.update(dt, player, world, camera);
              camera.follow(player.x, player.y, dt);
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
            if (elFps) elFps.textContent = `${currentFps}`;
            if (elPos) elPos.textContent = `X: ${Math.round(player.x)}, Y: ${Math.round(player.y)}`;
            if (elEnemies) elEnemies.textContent = `${combat.enemies.length}`;
            if (elLevel) elLevel.textContent = `${progression.level}`;
            if (elXpFill) elXpFill.style.width = `${Math.round(progression.progressRatio * 100)}%`;
            if (elXpText) elXpText.textContent = `${progression.currentXp} / ${progression.nextLevelXp} XP`;
            if (elDamage) elDamage.textContent = `${Math.round(18 * combat.damageMultiplier)}`;
            if (elTarget) {
              elTarget.textContent = combat.currentTarget ? combat.currentTarget.name : "Nessuno";
              elTarget.style.color = combat.currentTarget ? "#38bdf8" : "#94a3b8";
            }
            if (elCdFill) {
              const pct = Math.round(combat.cooldownProgress * 100);
              elCdFill.style.width = `${pct}%`;
              elCdFill.style.backgroundColor = pct >= 100 ? "#38bdf8" : "#0284c7";
            }
            Input.endFrame();
          } catch (err) {
            console.error("Errore durante il ciclo di gioco:", err);
          }
          requestAnimationFrame(loop);
        }
        requestAnimationFrame(loop);
      });
    }
  });
  require_main();
})();
//# sourceMappingURL=bundle.js.map
