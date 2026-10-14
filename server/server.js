/**
 * server/server.js - Server Backend REST API & Static Hosting per Aether Survivor
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

// 1. Endpoint di stato
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', game: 'Aether Survivor', time: new Date().toISOString() });
});

// 2. Profilo giocatore e talenti
app.get('/api/profile/:nickname', (req, res) => {
  try {
    const profile = db.getOrCreateProfile(req.params.nickname);
    res.json({ success: true, profile });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 3. Acquisto e potenziamento talenti
app.post('/api/talents/upgrade', (req, res) => {
  try {
    const { nickname, talentId } = req.body;
    if (!nickname || !talentId) {
      return res.status(400).json({ success: false, error: 'Nickname e talentId sono obbligatori' });
    }
    const profile = db.upgradeTalent(nickname, talentId);
    res.json({ success: true, profile });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 4. Fine partita e registrazione statistiche
app.post('/api/runs/complete', (req, res) => {
  try {
    const { nickname, kills, level, survivalSeconds, goldEarned } = req.body;
    if (!nickname) {
      return res.status(400).json({ success: false, error: 'Nickname obbligatorio' });
    }
    const result = db.recordRun(nickname, { kills, level, survivalSeconds, goldEarned });
    res.json({ success: true, result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 5. Classifica Globale
app.get('/api/leaderboard', (req, res) => {
  try {
    const leaderboard = db.getLeaderboard();
    res.json({ success: true, leaderboard });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Hosting statico del client di gioco (bundle.js, index.html, assets)
app.use(express.static(ROOT_DIR));

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`✨ Aether Survivor Server in ascolto su: http://localhost:${PORT}`);
  console.log(`🎮 Apri il link nel tuo browser per giocare online!`);
  console.log(`======================================================\n`);
});
