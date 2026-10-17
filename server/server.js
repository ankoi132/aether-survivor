/**
 * server/server.js - Server Backend REST API & Static Hosting per Aether Survivor
 * Include autenticazione account (Registrazione / Login), sessioni e salvataggio dei progressi
 */
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Helper per estrarre il token bearer dalle richieste
function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return req.body?.token || req.query?.token || null;
}

// 1. Endpoint di stato
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', game: 'Aether Survivor', time: new Date().toISOString() });
});

// =========================================================================
// ROTTE DI AUTENTICAZIONE ACCOUNT
// =========================================================================

// Registrazione nuovo Account
app.post('/api/auth/register', (req, res) => {
  try {
    const { username, password, email } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Nome utente e password sono obbligatori' });
    }
    const result = db.registerAccount(username, password, email);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Login Account
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Nome utente e password sono obbligatori' });
    }
    const result = db.loginAccount(username, password);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Verifica Sessione Attuale
app.get('/api/auth/me', (req, res) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ success: false, error: 'Nessun token di autenticazione fornito' });
    }
    const data = db.getAccountByToken(token);
    if (!data) {
      return res.status(401).json({ success: false, error: 'Sessione scaduta o non valida' });
    }
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Logout Account
app.post('/api/auth/logout', (req, res) => {
  try {
    const token = extractToken(req);
    if (token) {
      db.logoutAccount(token);
    }
    res.json({ success: true, message: 'Disconnesso con successo' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================================
// ROTTE DI GIOCO & PROGRESSIONE
// =========================================================================

// Profilo giocatore e talenti
app.get('/api/profile/:nickname', (req, res) => {
  try {
    const profile = db.getOrCreateProfile(req.params.nickname);
    res.json({ success: true, profile });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Acquisto e potenziamento talenti
app.post('/api/talents/upgrade', (req, res) => {
  try {
    const token = extractToken(req);
    let nickname = req.body.nickname;

    if (token) {
      const auth = db.getAccountByToken(token);
      if (auth && auth.user) {
        nickname = auth.user.username;
      }
    }

    const { talentId } = req.body;
    if (!nickname || !talentId) {
      return res.status(400).json({ success: false, error: 'Nickname e talentId sono obbligatori' });
    }
    const profile = db.upgradeTalent(nickname, talentId);
    res.json({ success: true, profile });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Fine partita e registrazione statistiche con materiali raccolti
app.post('/api/runs/complete', (req, res) => {
  try {
    const token = extractToken(req);
    let nickname = req.body.nickname;

    if (token) {
      const auth = db.getAccountByToken(token);
      if (auth && auth.user) {
        nickname = auth.user.username;
      }
    }

    const { kills, level, survivalSeconds, goldEarned, collectedItems } = req.body;
    if (!nickname) {
      return res.status(400).json({ success: false, error: 'Nickname obbligatorio' });
    }
    const result = db.recordRun(nickname, { kills, level, survivalSeconds, goldEarned, collectedItems });
    res.json({ success: true, result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Forgiatura e Potenziamento Armi dal Fabbro
app.post('/api/blacksmith/craft', (req, res) => {
  try {
    const token = extractToken(req);
    let nickname = req.body.nickname;

    if (token) {
      const auth = db.getAccountByToken(token);
      if (auth && auth.user) {
        nickname = auth.user.username;
      }
    }

    const { weaponId } = req.body;
    if (!nickname || !weaponId) {
      return res.status(400).json({ success: false, error: 'Nickname e weaponId sono obbligatori' });
    }
    const profile = db.craftOrUpgradeWeapon(nickname, weaponId);
    res.json({ success: true, profile });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Equipaggia Arma per la spedizione
app.post('/api/weapons/equip', (req, res) => {
  try {
    const token = extractToken(req);
    let nickname = req.body.nickname;

    if (token) {
      const auth = db.getAccountByToken(token);
      if (auth && auth.user) {
        nickname = auth.user.username;
      }
    }

    const { weaponId } = req.body;
    if (!nickname || !weaponId) {
      return res.status(400).json({ success: false, error: 'Nickname e weaponId sono obbligatori' });
    }
    const profile = db.equipWeapon(nickname, weaponId);
    res.json({ success: true, profile });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Equipaggia Skin per l'Eroe
app.post('/api/skin/equip', (req, res) => {
  try {
    const token = extractToken(req);
    let nickname = req.body.nickname;

    if (token) {
      const auth = db.getAccountByToken(token);
      if (auth && auth.user) {
        nickname = auth.user.username;
      }
    }

    const { skinId } = req.body;
    if (!nickname || !skinId) {
      return res.status(400).json({ success: false, error: 'Nickname e skinId sono obbligatori' });
    }
    const profile = db.equipSkin(nickname, skinId);
    res.json({ success: true, profile });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Forgia Pezzo d'Equipaggiamento (Diablo Style)
app.post('/api/blacksmith/craft-equipment', (req, res) => {
  try {
    const token = extractToken(req);
    let nickname = req.body.nickname;
    if (token) {
      const auth = db.getAccountByToken(token);
      if (auth && auth.user) nickname = auth.user.username;
    }
    const { equipId } = req.body;
    if (!nickname || !equipId) {
      return res.status(400).json({ success: false, error: 'Nickname ed equipId sono obbligatori' });
    }
    const profile = db.craftEquipment(nickname, equipId);
    res.json({ success: true, profile });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Raffina Risorse (Albion Online Style)
app.post('/api/blacksmith/refine', (req, res) => {
  try {
    const token = extractToken(req);
    let nickname = req.body.nickname;
    if (token) {
      const auth = db.getAccountByToken(token);
      if (auth && auth.user) nickname = auth.user.username;
    }
    const { recipeId, quantity } = req.body;
    if (!nickname || !recipeId) {
      return res.status(400).json({ success: false, error: 'Nickname e recipeId sono obbligatori' });
    }
    const profile = db.refineResource(nickname, recipeId, quantity || 1);
    res.json({ success: true, profile });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Smantella / Salvage Pezzo d'Equipaggiamento (Diablo Style)
app.post('/api/blacksmith/salvage', (req, res) => {
  try {
    const token = extractToken(req);
    let nickname = req.body.nickname;
    if (token) {
      const auth = db.getAccountByToken(token);
      if (auth && auth.user) nickname = auth.user.username;
    }
    const { equipId } = req.body;
    if (!nickname || !equipId) {
      return res.status(400).json({ success: false, error: 'Nickname ed equipId sono obbligatori' });
    }
    const profile = db.salvageItem(nickname, equipId);
    res.json({ success: true, profile });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Equipaggia Armatura o Gioiello nello Slot
app.post('/api/equipment/equip', (req, res) => {
  try {
    const token = extractToken(req);
    let nickname = req.body.nickname;
    if (token) {
      const auth = db.getAccountByToken(token);
      if (auth && auth.user) nickname = auth.user.username;
    }
    const { equipId } = req.body;
    if (!nickname || !equipId) {
      return res.status(400).json({ success: false, error: 'Nickname ed equipId sono obbligatori' });
    }
    const profile = db.equipItem(nickname, equipId);
    res.json({ success: true, profile });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Rimuovi Equipaggiamento dallo Slot
app.post('/api/equipment/unequip', (req, res) => {
  try {
    const token = extractToken(req);
    let nickname = req.body.nickname;
    if (token) {
      const auth = db.getAccountByToken(token);
      if (auth && auth.user) nickname = auth.user.username;
    }
    const { slot } = req.body;
    if (!nickname || !slot) {
      return res.status(400).json({ success: false, error: 'Nickname e slot sono obbligatori' });
    }
    const profile = db.unequipItem(nickname, slot);
    res.json({ success: true, profile });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Classifica Globale
app.get('/api/leaderboard', (req, res) => {
  try {
    const leaderboard = db.getLeaderboard();
    res.json({ success: true, leaderboard });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Hosting statico del client di gioco senza cache del browser
app.use(express.static(ROOT_DIR, {
  etag: false,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`✨ Aether Survivor Server in ascolto su: http://localhost:${PORT}`);
  console.log(`🎮 Apri il link nel tuo browser per giocare online!`);
  console.log(`======================================================\n`);
});
