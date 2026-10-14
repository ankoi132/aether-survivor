/**
 * core/input.js - Gestione Input (Tastiera, mouse, normalizzazione vettoriale)
 */
export const Input = (() => {
  const down = new Set();
  const pressed = new Set();
  let mousePos = { x: 0, y: 0, isDown: false };

  const MOVE_KEYS = {
    up: ['keyw', 'arrowup'],
    down: ['keys', 'arrowdown'],
    left: ['keya', 'arrowleft'],
    right: ['keyd', 'arrowright']
  };

  function normalizzaCodice(e) {
    return (e.code || e.key).toLowerCase();
  }

  window.addEventListener('keydown', (e) => {
    const c = normalizzaCodice(e);
    if (!down.has(c)) {
      pressed.add(c);
    }
    down.add(c);

    // Evita lo scroll accidentale della pagina nel browser
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'space', 'tab'].includes(c)) {
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', (e) => {
    down.delete(normalizzaCodice(e));
  });

  window.addEventListener('blur', () => {
    down.clear();
    pressed.clear();
  });

  window.addEventListener('mousemove', (e) => {
    mousePos.x = e.clientX;
    mousePos.y = e.clientY;
  });

  window.addEventListener('mousedown', () => { mousePos.isDown = true; });
  window.addEventListener('mouseup', () => { mousePos.isDown = false; });

  return {
    /**
     * Restituisce il vettore di movimento [ax, ay] normalizzato.
     * In diagonale la lunghezza è esattamente 1.0 (evita il bug della camminata più veloce a 45°).
     */
    axis() {
      let x = 0, y = 0;
      if (MOVE_KEYS.left.some(k => down.has(k)))  x -= 1;
      if (MOVE_KEYS.right.some(k => down.has(k))) x += 1;
      if (MOVE_KEYS.up.some(k => down.has(k)))    y -= 1;
      if (MOVE_KEYS.down.some(k => down.has(k)))  y += 1;

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
