# Specifiche Tecniche e di Game Design — Aether Survivor

## 1. Visione del Gioco
**Aether Survivor** è un roguelike *bullet heaven / horde survival* originale ambientato in un universo fantasy arcanopunk. Il giocatore controlla un Mago Arcano che deve sopravvivere a orde crescenti di creature, potenziando incantesimi ed esplorando un mondo infinito generato proceduralmente con terreni e scogliere autotiled.

---

## 2. Fase A: Movimento, Mappa e Telecamera (Completata)
- **Dimensione Tile**: 32 px (16 px nativi × 2x pixel scale).
- **Chunk**: 16×16 tile (512×512 px) con autotiling procedurale a 16-bit (scogliere 3D, coste d'acqua con schiuma, sentieri di terra).
- **Movimento**: 8 direzioni con normalizzazione diagonale ($dx, dy / \text{hypot}$).
- **Velocità Base**: `105 px/s` (ridotta a `x0.6` quando si cammina nell'acqua).
- **Collisione**: Cerchio vs AABB a 2 passaggi per scivolamento continuo lungo i muri.
- **Telecamera**: Smorzamento esponenziale framerate-independent ($rate = 9.0$) con subpixel snapping e screen-shake.

---

## 3. Fase B: Sistema di Combattimento Automatico (Completata)

### 3.1 Parametri Matematici dell'Attacco [OSSERVATO & IMPLEMENTATO]
| Parametro | Valore | Note Tecniche |
| :--- | :--- | :--- |
| **Incantesimo** | *Dardo Arcano* | Proiettile magico a scia luminosa |
| **Danno Base** | `18` | Danno inflitto per ogni colpo andato a segno |
| **Velocità Proiettile** | `350 px/s` | Raggiunge il bersaglio rapidamente senza risultare istantaneo |
| **Gittata Massima** | `~380 px` (`life = 1.1s`) | Raggio operativo prima della dissoluzione |
| **Raggio di Mira Automatico** | `300 px` | Distanza massima entro cui il mago rileva i nemici |
| **Tempo di Ricarica (Cooldown)** | `0.85 s` (850 ms) | Frequenza base di fuoco |
| **Raggio Hitbox Proiettile** | `5 px` | Cerchio di collisione con bersagli e muri |
| **Raggio Hitbox Bersaglio** | `13 px` | Cerchio di ricezione danno |
| **Knockback (Rinculo)** | `110 px/s` (smorzato a $rate = 9.0$) | Spinta fisica all'indietro lungo la traiettoria |
| **Hit Flash** | `0.15 s` (150 ms) | Flash bianco su sprite al momento dell'impatto |
| **Screen Shake Impatto** | `0.16` | Micro-scossa telecamera per conferire peso al colpo |
| **Collisione Muri** | Distruzione immediata | I proiettili non attraversano scogliere o rocce |

### 3.2 Flusso dell'Auto-Targeting
```
                 ┌─────────────────────────────────┐
                 │ Cerca bersaglio vivo più vicino │
                 │        entro raggio 300px       │
                 └───────────────┬─────────────────┘
                                 │
                   Bersaglio     ▼     Nessun bersaglio
                 ┌───────────────┴───────────────┐
                 │                               │
                 ▼                               ▼
    ┌─────────────────────────┐     ┌─────────────────────────┐
    │  Cooldown Timer <= 0 ?  │     │  Conserva cooldown      │
    └────────────┬────────────┘     │  pronto (barra al 100%) │
                 │                  └─────────────────────────┘
         SÌ      ▼      NO
    ┌─────────────────────────┐
    │ Calcola angolo mira     │
    │ Spawna Dardo da bastone │
    │ Reset Cooldown a 0.85s  │
    └─────────────────────────┘
```

---

## 4. Fase C: Mappa Finita Esplorabile, Nemici Randagi e Level-Up (Completata)

### 4.1 La Grande Mappa Finita (101×101 Tile)
- **Dimensioni**: Raggio 50 tile da `tx = -50` a `tx = +50` (totale 101×101 tile = 3.232×3.232 pixel).
- **Confini Naturali Invalicabili**: Catena montuosa e scogliere esterne a 3 strati di roccia (`TILE_WALL`) che impediscono qualsiasi fuga nel vuoto.
- **Biomi Esplorabili**:
  1. **Santuario dello Spawn (Centro)**: Radura erbosa protetta senza ostacoli con 2 manichini da allenamento.
  2. **Foresta Silvana (Nord-Ovest)**: Bosco fitto di alberi secolari, radure e sentieri, popolato da Slime Silvani.
  3. **Baia delle Acque Mistiche (Sud-Est)**: Laghi sinuosi che rallentano il passo (`x0.6`), popolati da Slime delle Onde.
  4. **Rovine dei Titani (Nord-Est / Sud-Ovest)**: Monoliti di pietra e mura diroccate, presidiate da Scheletri Guardiani.

### 4.2 Nemici Randagi nel Mondo (Nessuna Orda Continua)
Al via vengono distribuiti circa 44 nemici distribuiti nella mappa:
- **Slime Silvano**: 35 HP, 50 px/s, aggro 180 px, rilascia Gemma Ciano (12 XP). Animazione di deformazione gelatinosa (*squish & bounce*).
- **Slime delle Onde**: 45 HP, 62 px/s, aggro 195 px, rilascia Gemma Ciano (16 XP).
- **Scheletro Guardiano**: 70 HP, 72 px/s, aggro 210 px, rilascia Gemma Smeraldo (25 XP). Camminata zoppicante e fendente di spada.

**Comportamento (Macchina a Stati)**:
- `WANDER`: Pattuglia liberamente la propria zona senza aggredire il giocatore.
- `CHASE`: Si attiva SOLO se il giocatore entra nel raggio di percezione visiva (180-210 px), mostrando un alert visivo (`!`). Se il giocatore fugge oltre 1.7x il raggio, il nemico perde l'interesse e torna a vagare.
- `HURT`: Subisce rinculo proporzionale alla traiettoria del dardo, flash bianco e numeri di danno fluttuanti.
- `DEAD`: Esplosione in particelle e drop immediato di una Gemma di Mana/Esperienza.

### 4.3 Gemme di Mana e Attrazione Magnetica
- Le gemme fluttuano a terra con oscillazione sinusoidale.
- Quando il giocatore si avvicina entro il raggio magnetico (`player.magnetRadius`, base 85 px), la gemma accelera verso di lui con accelerazione esponenziale.
- Alla raccolta incrementa l'XP della barra superiore.

### 4.4 Sistema di Level-Up e Benedizioni Arcane
Al riempimento della barra XP:
1. Il gioco entra in pausa controllata.
2. Appare a schermo intero una raffinata modale fantasy che propone 3 carte potenziamento casuali tra:
   - 🏹 **Tiro Arcano Multiplo**: +1 Dardo Arcano simultaneo a ventaglio.
   - ⚡ **Potenza Celestiale**: +30% danno su tutti gli incantesimi.
   - 🌪️ **Cadenza Rapida**: -22% al tempo di ricarica del bastone.
   - 🧲 **Magnete Astrale**: +60% raggio di attrazione gemme.
   - 👟 **Passo del Vento**: +18% velocità di movimento.
   - 🔥 **Sfera di Fuoco Protettiva**: Globo magico orbitante che brucia i nemici a contatto.
3. Il giocatore seleziona la carta con il mouse o premendo `[1]`, `[2]`, `[3]` sulla tastiera e la partita riprende all'istante.

