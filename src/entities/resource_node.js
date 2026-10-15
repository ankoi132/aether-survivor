/**
 * entities/resource_node.js - Nodi di Raccolta Risorse nel Mondo (Albion Online Style)
 * Supporta canalizzazione con barra di progresso, cariche multiple, respawn e rilascio materiali
 */
import { Tiles } from '../world/tiles.js';
import { Sprites } from '../core/sprites.js';
import { FX } from '../core/fx.js';
import { ItemPickup } from './item_pickup.js';
import { GemPickup } from './pickup.js';
import { RESOURCE_NODES_DEF, MATERIALS_DEF } from '../core/crafting.js';

export class ResourceNode {
  constructor(x, y, nodeType = 'mining_copper') {
    this.x = x;
    this.y = y;
    this.nodeType = nodeType;
    this.def = RESOURCE_NODES_DEF[nodeType] || RESOURCE_NODES_DEF.mining_copper;
    this.id = `${nodeType}_${Math.round(x)}_${Math.round(y)}`;

    this.r = 16;
    this.state = 'ready'; // 'ready' | 'harvesting' | 'depleted'
    this.maxCharges = 3;
    this.charges = 3;
    this.channelProgress = 0; // da 0.0 a 1.0
    this.harvestDuration = this.def.harvestDuration || 1.2;
    this.respawnTimer = 0;
    this.respawnDuration = this.def.respawnDuration || 45;

    this.pulseTimer = Math.random() * Math.PI * 2;
    this.sparkleTimer = Math.random() * 2;
  }

  get isHarvesting() { return this.state === 'harvesting'; }
  get isDepleted() { return this.state === 'depleted'; }
  get progress() { return this.channelProgress; }

  canInteract(playerX, playerY, maxDist = 75) {
    if (this.state === 'depleted') return false;
    const d = Math.hypot(this.x - playerX, this.y - playerY);
    return d <= maxDist;
  }

  hitTest(worldX, worldY, padding = 24) {
    return Math.abs(worldX - this.x) <= padding && (worldY >= this.y - 32 - padding && worldY <= this.y + padding);
  }

  startHarvest(player) {
    if (this.state !== 'ready') return false;
    this.state = 'harvesting';
    this.channelProgress = 0;
    FX.spark(this.x, this.y - 12, this.def.color, 4);
    return true;
  }

  cancelHarvest() {
    if (this.state === 'harvesting') {
      this.state = 'ready';
      this.channelProgress = 0;
    }
  }

  completeHarvest(combat, player) {
    this.state = 'ready';
    this.channelProgress = 0;
    this.charges--;

    // 1. Assegna ricompensa XP (Gemma di mana rilasciata al suolo)
    if (this.def.xpReward && combat) {
      combat.pickups.push(new GemPickup(this.x, this.y + 2, this.def.xpReward, 'sapphire'));
    }

    // 2. Genera e rilascia materiali fisici magnetici
    if (this.def.drops && combat) {
      let angle = -Math.PI / 2;
      const totalDrops = [];
      for (const drop of this.def.drops) {
        if (Math.random() <= (drop.chance || 1.0)) {
          const [minC, maxC] = drop.count || [1, 1];
          const count = minC + Math.floor(Math.random() * (maxC - minC + 1));
          for (let i = 0; i < count; i++) {
            totalDrops.push(drop.itemId);
          }
        }
      }

      const step = (Math.PI * 2) / Math.max(1, totalDrops.length);
      totalDrops.forEach((matId, idx) => {
        const dist = 18 + (idx % 2) * 12;
        const ox = Math.cos(angle) * dist;
        const oy = Math.sin(angle) * dist;
        combat.itemPickups.push(new ItemPickup(this.x + ox, this.y + oy, matId));
        angle += step;
      });
    }

    // 3. Effetti particellari e testo fluttuante
    FX.burst(this.x, this.y - 14, this.def.color, 14, 110);
    FX.addFloatingText(this.x, this.y - 28, `+${this.def.name}`, this.def.color);

    // 4. Se le cariche sono esaurite, il nodo diventa depleted e parte il respawn
    if (this.charges <= 0) {
      this.state = 'depleted';
      this.respawnTimer = this.respawnDuration;
      FX.burst(this.x, this.y - 8, '#64748b', 8, 60);
    }
  }

  update(dt, player, combat) {
    this.pulseTimer += dt * 3.2;
    this.sparkleTimer -= dt;

    // Gestione respawn
    if (this.state === 'depleted') {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.state = 'ready';
        this.charges = this.maxCharges;
        FX.burst(this.x, this.y - 12, this.def.color, 16, 100);
        FX.addFloatingText(this.x, this.y - 30, `✨ ${this.def.name} Ricresciuto!`, this.def.color);
      }
      return;
    }

    // Particelle scintillio periodico per nodi pronti
    if (this.state === 'ready' && this.sparkleTimer <= 0) {
      this.sparkleTimer = 1.2 + Math.random() * 1.5;
      FX.spark(this.x + (Math.random() * 20 - 10), this.y - 8 - Math.random() * 16, this.def.color, 2);
    }

    // Gestione canalizzazione
    if (this.state === 'harvesting') {
      const dist = Math.hypot(this.x - player.x, this.y - player.y);
      if (dist > 85) {
        // Il giocatore si è allontanato troppo, interrompe la canalizzazione
        this.cancelHarvest();
        return;
      }

      this.channelProgress += dt / this.harvestDuration;

      // Particelle di scavo/raccolta continue
      if (Math.random() < 0.45) {
        FX.spark(this.x + (Math.random() * 16 - 8), this.y - 10 + (Math.random() * 8 - 4), this.def.color, 3);
      }

      if (this.channelProgress >= 1.0) {
        this.completeHarvest(combat, player);
      }
    }
  }

  draw(ctx, camera) {
    if (camera && !camera.sees(this.x, this.y, 80)) return;

    // 1. Ombra proiettata al suolo
    Sprites.drawShadow(ctx, this.x, this.y + 4, 14);

    // 2. Sprite del nodo
    const spriteType = (this.state === 'depleted') ? 'node_depleted' : (this.def.spriteType || 'node_copper');
    const sprite = Tiles.getPropSprite(spriteType);

    if (sprite) {
      const sw = sprite.width * 2;
      const sh = sprite.height * 2;
      ctx.save();
      if (this.state === 'depleted') {
        ctx.globalAlpha = 0.55;
      }
      ctx.drawImage(sprite, Math.round(this.x - sw / 2), Math.round(this.y - sh + 8), sw, sh);
      ctx.restore();
    } else {
      // Fallback geometrico d'emergenza
      ctx.save();
      ctx.fillStyle = this.def.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y - 8, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 3. Indicatore di cariche e badge di interazione se pronto
    if (this.state === 'ready') {
      // Badge icona e cariche rimaste
      ctx.save();
      const bob = Math.sin(this.pulseTimer) * 2;
      const badgeY = Math.round(this.y - 36 + bob);

      // Sfondo fumetto scuro con bordo del colore della risorsa
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.beginPath();
      ctx.roundRect(Math.round(this.x - 22), badgeY - 14, 44, 16, 4);
      ctx.fill();
      ctx.strokeStyle = this.def.color;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Icona e pallini cariche
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      let dots = '●'.repeat(this.charges) + '○'.repeat(this.maxCharges - this.charges);
      ctx.fillText(`${this.def.icon} ${dots}`, Math.round(this.x), badgeY - 6);
      ctx.restore();
    }

    // 4. Barra di Canalizzazione durante la raccolta
    if (this.state === 'harvesting') {
      ctx.save();
      const barW = 54;
      const barH = 7;
      const barX = Math.round(this.x - barW / 2);
      const barY = Math.round(this.y - 44);

      // Sfondo barra
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX - 2, barY - 2, barW + 4, barH + 4);

      // Riempimento progresso
      const fillW = Math.max(0, Math.min(barW, Math.round(barW * this.channelProgress)));
      const grad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
      grad.addColorStop(0, this.def.color);
      grad.addColorStop(1, '#ffffff');
      ctx.fillStyle = grad;
      ctx.fillRect(barX, barY, fillW, barH);

      // Testo Canalizzazione
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(`Raccolta in corso...`, Math.round(this.x), barY - 5);
      ctx.restore();
    }

    // 5. Timer di ricrescita per nodi esauriti
    if (this.state === 'depleted') {
      ctx.save();
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#94a3b8';
      const secsLeft = Math.ceil(this.respawnTimer);
      ctx.fillText(`⏳ Ricresce in ${secsLeft}s`, Math.round(this.x), Math.round(this.y - 28));
      ctx.restore();
    }
  }
}
