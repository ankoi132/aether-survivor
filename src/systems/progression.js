/**
 * systems/progression.js - Gestione XP, Livelli, Carte Potenziamento e Pausa di Scelta
 */
export class ProgressionSystem {
  constructor(player, combat) {
    this.player = player;
    this.combat = combat;

    this.level = 1;
    this.currentXp = 0;
    this.nextLevelXp = 25;

    this.isPausedForLevelUp = false;
    this.currentChoices = [];

    // Catalogo dei potenziamenti disponibili
    this.UPGRADE_CATALOG = [
      {
        id: 'multi_dart',
        title: 'Tiro Arcano Multiplo',
        desc: 'Lancia +1 Dardo Arcano simultaneo a ventaglio',
        icon: '🏹',
        apply: (p, c) => {
          c.projectilesPerShot = (c.projectilesPerShot || 1) + 1;
        }
      },
      {
        id: 'spell_power',
        title: 'Potenza Celestiale',
        desc: '+30% di danno inflitto da ogni incantesimo',
        icon: '⚡',
        apply: (p, c) => {
          c.damageMultiplier = (c.damageMultiplier || 1.0) * 1.30;
        }
      },
      {
        id: 'haste',
        title: 'Cadenza Rapida',
        desc: '-22% al tempo di ricarica del bastone magico',
        icon: '🌪️',
        apply: (p, c) => {
          c.baseCooldown = Math.max(0.25, c.baseCooldown * 0.78);
        }
      },
      {
        id: 'magnet',
        title: 'Magnete Astrale',
        desc: '+60% raggio di attrazione per le gemme di mana',
        icon: '🧲',
        apply: (p, c) => {
          p.magnetRadius = (p.magnetRadius || 85) * 1.6;
        }
      },
      {
        id: 'wind_step',
        title: 'Passo del Vento',
        desc: '+18% alla velocità di movimento del mago',
        icon: '👟',
        apply: (p, c) => {
          p.baseSpd = Math.round(p.baseSpd * 1.18);
        }
      },
      {
        id: 'fire_orb',
        title: 'Sfera di Fuoco Protettiva',
        desc: 'Evoca un globo magico rotante che brucia i nemici vicini',
        icon: '🔥',
        apply: (p, c) => {
          c.hasOrbitOrb = true;
          c.orbitOrbsCount = (c.orbitOrbsCount || 0) + 1;
        }
      }
    ];

    // Collega l'evento di guadagno XP del giocatore
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
    // Formula di scaling XP progressione dolce
    this.nextLevelXp = Math.floor(25 * Math.pow(1.32, this.level - 1));

    // Estrae 3 scelte casuali uniche
    const shuffled = [...this.UPGRADE_CATALOG].sort(() => 0.5 - Math.random());
    this.currentChoices = shuffled.slice(0, 3);
    this.isPausedForLevelUp = true;

    // Notifica la UI
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

    // Se aveva accumulato abbastanza XP per un altro livello, riattiva subito
    if (this.currentXp >= this.nextLevelXp) {
      this.levelUp();
    }
  }

  get progressRatio() {
    return Math.min(1, Math.max(0, this.currentXp / this.nextLevelXp));
  }
}
