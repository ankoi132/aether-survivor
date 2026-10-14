# ✨ Aether Survivor

> Un gioco d'azione e sopravvivenza roguelike 2D originale in pixel art fantasy, sviluppato con motore Canvas HTML5 puro e predisposto per multiplayer scalabile su web con backend di persistenza.

---

## 🌟 Panoramica del Progetto

**Aether Survivor** combina l'adrenalina del genere *bullet heaven / survivor* con l'esplorazione di un mondo fantasy vivo e strutturato.
Il client è scritto in JavaScript moderno puro senza framework pesanti esterni, garantendo massime prestazioni a 60 FPS, rendering pixel-perfect e caricamento istantaneo su qualsiasi browser (desktop e mobile).

---

## 🗺️ Architettura e Fasi di Sviluppo

### Fasi Completate (Client Core)

- **Fase A — Movimento, Mappa & Telecamera**:
  - Movimento fluido a 8 direzioni con normalizzazione vettoriale diagonale.
  - Rallentamento dinamico del passo quando si attraversano specchi d'acqua (`x0.6`).
  - Risoluzione collisioni a 2 passaggi (Cerchio vs AABB) per scivolamento continuo lungo scogliere e ostacoli.
  - Algoritmo di **autotiling a 16-bit** (coste lacustri con schiuma, scogliere 3D, sentieri di terra, alberi volumetrici).
  - Telecamera fluida framerate-independent con smorzamento esponenziale, subpixel snapping e screen-shake d'impatto.
  - Centratura e scaling pixel-perfect indipendenti dalla risoluzione dello schermo o dal fattore DPR (100%, 125%, 150%).

- **Fase B — Combattimento Automatico & FX**:
  - Puntamento automatico intelligente dei bersagli nemici entro il raggio d'attacco (310 px).
  - Lancio cadenzato di **Dardi Arcani** con scia di particelle luminose.
  - Feedback d'impatto viscerale: flash bianco, rinculo fisico (knockback), numeri di danno fluttuanti e screen-shake.

- **Fase C — Grande Mappa Finita, Nemici Randagi & Level-Up**:
  - **Mappa Finita Esplorabile (101×101 Tile = 3.232×3.232 px)** racchiusa da un anello perimetrale invalicabile di alte montagne e scogliere.
  - 4 Biomi tematici: *Santuario Centrale*, *Foresta Silvana*, *Baia delle Acque Mistiche*, *Rovine dei Titani*.
  - **Nessuna orda infinita o spawner forzato**: ~44 mostri fantasy (Slime Silvani, Slime d'Acqua, Scheletri Guardiani) pattugliano pacificamente il mondo ed entrano in allerta solo se ti avvicini al loro raggio visivo.
  - **Gemme di Mana Magnetiche**: rilascio di XP alla sconfitta dei mostri con attrazione gravitazionale verso il giocatore.
  - **Sistema di Level-Up**: pausa del gioco con modale di scelta tra 3 carte benedizione casuali (Dardo Multiplo, Danno +30%, Passo del Vento, Magnete Astrale, Cadenza Rapida, Sfera di Fuoco Protettiva).

---

## 🚀 Prossimi Passi: Backend & Web Multiplayer

Il progetto è strutturato modularmente per accogliere l'architettura multiplayer e la persistenza server:

```
┌────────────────────────────────┐         ┌────────────────────────────────┐
│      Browser Client (P1)       │         │      Browser Client (P2)       │
│  Input + Rendering Canvas 2D   │         │  Input + Rendering Canvas 2D   │
└───────────────┬────────────────┘         └────────────────┬───────────────┘
                │                                           │
                │        WebSocket (Eventi Real-Time)       │
                └───────────────────┬───────────────────────┘
                                    ▼
                ┌───────────────────────────────────────────┐
                │        Node.js Game Server (Autorevole)   │
                │   - Stanze / Lobby di gioco (Rooms)       │
                │   - Sincronizzazione posizioni e mostri   │
                │   - Validazione anti-cheat                │
                └───────────────────┬───────────────────────┘
                                    ▼
                ┌───────────────────────────────────────────┐
                │          Backend API & Database           │
                │   - Autenticazione & Profili Utente       │
                │   - Salvataggio progressi, talenti e sblocchi
                │   - Classifiche globali (Leaderboards)    │
                └───────────────────────────────────────────┘
```

---

## 🛠️ Come Avviare il Progetto in Locale

### Prerequisiti
- **Node.js** (versione 18 o superiore consigliata).

### Installazione e Build
```bash
# Installa le dipendenze di build
npm install

# Compila il bundle client ottimizzato
npm run build
```

### Avvio
Apri direttamente con doppio clic il file `index.html` in qualsiasi browser, oppure avvia un server di sviluppo locale:
```bash
npm start
```

---

## 🎮 Comandi di Gioco
- **W, A, S, D** oppure **Frecce Direzionali**: Movimento del Mago Arcano.
- **Attacco**: Completamente automatico all'avvicinamento dei mostri.
- **Scelta Potenziamenti**: Clic del mouse oppure tasti **[1]**, **[2]**, **[3]**.
