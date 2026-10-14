# Specifiche Tecniche e di Game Design — Aether Survivor

## 1. Visione del Gioco
**Aether Survivor** è un roguelike *bullet heaven / horde survival* originale ambientato in un universo fantasy arcanopunk. Il giocatore controlla un Mago Arcano (Spellblade) che deve sopravvivere a orde crescenti di creature corrotte, potenziando incantesimi ed esplorando un mondo infinito con terreni interattivi.

---

## 2. Fase A: Movimento, Mappa e Telecamera (Implementata)

### 2.1 Tabella Parametri Matematici
| Parametro | Valore | Note di Design |
| :--- | :--- | :--- |
| **Dimensione Tile** | `32 px` (16 px nativi × 2x pixel scale) | Griglia del mondo coerente con estetica 16-bit |
| **Dimensione Chunk** | `16x16 tile` (512x512 px) | Unità di generazione e caching su canvas |
| **Raggio Collisione Eroe** | `14 px` (diametro 28 px) | Circolare, scivola dentro corridoi larghi 32 px |
| **Velocità Base ($spd$)** | `105 px/s` | Conforme al bilanciamento dei giochi survivor |
| **Freno Terreno Liquido** | `× 0.6` | 40% di penalità di velocità nell'acqua |
| **Camera View Target** | `768x420 px` | Vista costante proporzionale in qualsiasi aspect ratio |
| **Camera Damp Rate** | `9.0` | Smorzamento esponenziale indipendente dal framerate |
| **Direzioni** | `8 direzioni` | 0: Giù, 1: Giù-Dx, 2: Dx, 3: Su-Dx, 4: Su, 5: Su-Sx, 6: Sx, 7: Giù-Sx |

---

### 2.2 Macchina a Stati del Personaggio (Fase A)
```
          ┌─────────────────────────┐
          │          IDLE           │
          │  Respiro (3.5 FPS, 4f)  │
          └────────────┬────────────┘
                       │ ▲
       Tasti WASD      │ │ Rilascio
       premuti         ▼ │ tasti
          ┌─────────────────────────┐
          │         WALK            │
          │ Camminata (8 FPS, 4f)   │
          └────────────┬────────────┘
                       │
       Entrata in      ▼
          ┌─────────────────────────┐
          │      WATER SLOW         │
          │ Vel x0.6 + Splash Part. │
          └─────────────────────────┘
```

---

### 2.3 Algoritmo di Collisione Cerchio vs AABB (2 Passaggi)
Risolve il problema del blocco negli angoli tra due tile solidi adiacenti:
1. Identifica i tile solidi nel range `[entity.x - r, entity.x + r]`.
2. Trova il punto di clamping $Q = (\text{clamp}(x, bx_0, bx_1), \text{clamp}(y, by_0, by_1))$.
3. Calcola il vettore di penetrazione e spinge l'entità all'esterno lungo la normale.
4. Esegue un secondo passaggio per assorbire componenti ortogonali e permettere lo scivolamento continuo lungo i muri.

---

## 3. Prossime Fasi di Sviluppo in Sequenza

### ⚔️ Fase B: Sistema di Combattimento Automatico
- **Attacco Base (Dardi Arcani / Dardi di Fuoco)**:
  - Generazione proiettili con velocità `320 px/s`.
  - Cooldown: `0.9s`.
  - Auto-targeting automatico (cerca il nemico più vicino entro un raggio di 260 px).
  - Hitbox circolare proiettile (`r = 5 px`).
  - Numeri di danno fluttuanti (`Damage Numbers`) e micro-screenshake all'impatto.

### 👾 Fase C: Orde di Nemici, Spawner e Raccolta
- **Nemici Base**:
  - *Slime della Palude* (lenti, deboli: HP 25, Vel 45 px/s).
  - *Scheletri Guerrieri* (medi: HP 45, Vel 70 px/s).
- **Sistema di Spawn**:
  - Generazione circolare appena fuori dal campo visivo della telecamera (`outerRadius = 450 px`).
  - Onde crescenti di difficoltà ogni 30-45 secondi.
- **Raccolta Gemme & Livelli**:
  - Drop di sfere d'esperienza blu/oro alla morte dei nemici.
  - Attrazione magnetica delle sfere quando il giocatore si avvicina (`raggio calamita = 80 px`).
  - Schermata di Level-Up con scelta tra 3 carte di potenziamento (Danno, Velocità, Raggio, Frequenza di tiro).
