/* Deployment State Machine (TypeScript / Phaser) */

import Phaser from 'phaser';
import { DeploymentState, DeploymentResult } from '../types/game';
import { CARD_TEMPLATES, SPELL_STATS } from '../config/gameConfig';
import { DeploymentValidator, ARENA } from './DeploymentValidator';
import { ElixirSystem } from './ElixirSystem';
import { Unit } from '../entities/Unit';
import { Tower } from '../entities/Tower';

/**
 * Callback interface so BattleScene can react to deployment events
 * without the DeploymentSystem needing to know scene internals.
 */
export interface DeploymentCallbacks {
  onUnitSpawned: (unit: Unit) => void;
  getPlayerUnits: () => Phaser.GameObjects.Group;
  getEnemyUnits: () => Phaser.GameObjects.Group;
  getTowers: () => Phaser.GameObjects.Group;
}

export class DeploymentSystem {
  private scene: Phaser.Scene;
  private elixirSystem: ElixirSystem;
  private callbacks: DeploymentCallbacks;

  // Deployment state
  private state: DeploymentState = {
    selectedCardId: null,
    selectedHandIndex: null,
    isDragging: false,
    dragPreview: null,
    placementPreview: null
  };

  // Hand management
  private playerHand: string[];
  private deckQueue: string[];
  private nextCard: string;
  private handCardImages: Phaser.GameObjects.Image[];
  private nextCardImage: Phaser.GameObjects.Image;

  // Visual elements
  private deploymentZoneOverlay: Phaser.GameObjects.Graphics | null = null;
  private dragPreviewGraphics: Phaser.GameObjects.Graphics | null = null;
  private feedbackText: Phaser.GameObjects.Text | null = null;
  private arenaHitZone: Phaser.GameObjects.Zone | null = null;

  // Listener references for cleanup

  constructor(
    scene: Phaser.Scene,
    elixirSystem: ElixirSystem,
    playerHand: string[],
    deckQueue: string[],
    nextCard: string,
    handCardImages: Phaser.GameObjects.Image[],
    nextCardImage: Phaser.GameObjects.Image,
    callbacks: DeploymentCallbacks
  ) {
    this.scene = scene;
    this.elixirSystem = elixirSystem;
    this.playerHand = playerHand;
    this.deckQueue = deckQueue;
    this.nextCard = nextCard;
    this.handCardImages = handCardImages;
    this.nextCardImage = nextCardImage;
    this.callbacks = callbacks;

    this.setupInputHandlers();
  }

  // ─── Public API ────────────────────────────────────────────────

  getState(): DeploymentState {
    return { ...this.state };
  }

  getNextCard(): string {
    return this.nextCard;
  }

  selectCard(handIndex: number): void {
    if (handIndex < 0 || handIndex >= this.playerHand.length) return;

    const cardId = this.playerHand[handIndex];
    const cardDef = CARD_TEMPLATES[cardId];
    if (!cardDef) return;

    // Check elixir before allowing selection
    if (!this.elixirSystem.canSpend(cardDef.cost)) {
      this.showFeedback('Not enough elixir');
      return;
    }

    // If same card tapped again, deselect
    if (this.state.selectedHandIndex === handIndex) {
      this.deselectCard();
      return;
    }

    // Deselect previous card if any
    if (this.state.selectedHandIndex !== null) {
      this.resetCardVisual(this.state.selectedHandIndex);
    }

    this.state.selectedCardId = cardId;
    this.state.selectedHandIndex = handIndex;

    // Visual: lift the selected card
    const cardImg = this.handCardImages[handIndex];
    this.scene.tweens.add({
      targets: cardImg,
      y: this.scene.scale.height - 72,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 100
    });

    // Show deployment zone overlay
    this.showDeploymentZone(cardDef.type === 'spell');
  }

  deselectCard(): void {
    if (this.state.selectedHandIndex !== null) {
      this.resetCardVisual(this.state.selectedHandIndex);
    }
    this.hideDeploymentZone();
    this.state.selectedCardId = null;
    this.state.selectedHandIndex = null;
  }

  beginCardDrag(handIndex: number, pointer: Phaser.Input.Pointer): void {
    const cardId = this.playerHand[handIndex];
    const cardDef = CARD_TEMPLATES[cardId];
    if (!cardDef || !this.elixirSystem.canSpend(cardDef.cost)) {
      this.showFeedback('Not enough elixir');
      return;
    }

    // Select the card as well
    if (this.state.selectedHandIndex !== null && this.state.selectedHandIndex !== handIndex) {
      this.resetCardVisual(this.state.selectedHandIndex);
    }

    this.state.selectedCardId = cardId;
    this.state.selectedHandIndex = handIndex;
    this.state.isDragging = true;

    // Visual: lift card
    const cardImg = this.handCardImages[handIndex];
    this.scene.tweens.add({
      targets: cardImg,
      y: this.scene.scale.height - 72,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 100
    });

    // Create drag preview graphics
    this.dragPreviewGraphics = this.scene.add.graphics();
    this.dragPreviewGraphics.setDepth(95);

    // Show deployment zone
    this.showDeploymentZone(cardDef.type === 'spell');

    // Initial update
    this.updateCardDrag(pointer);
  }

  updateCardDrag(pointer: Phaser.Input.Pointer): void {
    if (!this.state.isDragging || !this.state.selectedCardId) return;

    const camera = this.scene.cameras.main;
    const worldPoint = camera.getWorldPoint(pointer.x, pointer.y);

    // Clear and redraw drag preview
    if (this.dragPreviewGraphics) {
      this.dragPreviewGraphics.clear();

      const cardDef = CARD_TEMPLATES[this.state.selectedCardId];
      const isSpell = cardDef.type === 'spell';
      const isValid = isSpell
        ? (worldPoint.y > ARENA.TOP_MARGIN && worldPoint.y < ARENA.HUD_TOP)
        : DeploymentValidator.isValidPlayerZone(worldPoint.x, worldPoint.y);

      const color = isValid ? 0x2ecc71 : 0xe74c3c;
      this.dragPreviewGraphics.lineStyle(2.5, color, 0.7);

      if (isSpell) {
        const radius = SPELL_STATS[this.state.selectedCardId]?.radius || 50;
        this.dragPreviewGraphics.strokeCircle(worldPoint.x, worldPoint.y, radius);
      } else {
        this.dragPreviewGraphics.strokeCircle(worldPoint.x, worldPoint.y, 20);
        // Unit placement crosshair
        this.dragPreviewGraphics.fillStyle(color, 0.25);
        this.dragPreviewGraphics.fillCircle(worldPoint.x, worldPoint.y, 20);
      }
    }
  }

  finishCardDrag(pointer: Phaser.Input.Pointer): void {
    if (!this.state.isDragging || !this.state.selectedCardId) {
      this.clearDragVisuals();
      return;
    }

    const camera = this.scene.cameras.main;
    const worldPoint = camera.getWorldPoint(pointer.x, pointer.y);

    // Attempt deployment at release point
    this.attemptDeployment(this.state.selectedCardId, worldPoint.x, worldPoint.y);

    // Always clear drag state
    this.state.isDragging = false;
    this.clearDragVisuals();
  }

  attemptDeployment(cardId: string, worldX: number, worldY: number): DeploymentResult {
    const cardDef = CARD_TEMPLATES[cardId];
    if (!cardDef) return { success: false, reason: 'Unknown card' };

    // Validate
    const result = DeploymentValidator.validate(
      worldX, worldY, cardDef, this.elixirSystem.getElixir()
    );

    if (!result.success) {
      this.showFeedback(result.reason || 'Cannot deploy here');
      // Reset card visual but keep selected state cleared
      this.deselectCard();
      return result;
    }

    // Spend elixir
    if (!this.elixirSystem.spend(cardDef.cost)) {
      this.showFeedback('Not enough elixir');
      this.deselectCard();
      return { success: false, reason: 'Not enough elixir' };
    }

    // Deploy
    if (cardDef.type === 'spell') {
      this.deploySpell(cardId, worldX, worldY);
    } else {
      this.deployTroop(cardId, worldX, worldY);
    }

    // Rotate deck
    const handIndex = this.state.selectedHandIndex!;
    this.deckQueue.push(this.playerHand[handIndex]);
    this.playerHand[handIndex] = this.nextCard;
    this.nextCard = this.deckQueue.shift() || 'knight';

    // Update card images
    this.handCardImages[handIndex].setTexture(`card_${this.playerHand[handIndex]}`);
    this.nextCardImage.setTexture(`card_${this.nextCard}`);

    // Clear state
    this.deselectCard();

    return { success: true };
  }

  clearDeploymentState(): void {
    if (this.state.selectedHandIndex !== null) {
      this.resetCardVisual(this.state.selectedHandIndex);
    }
    this.state.selectedCardId = null;
    this.state.selectedHandIndex = null;
    this.state.isDragging = false;
    this.clearDragVisuals();
    this.hideDeploymentZone();
    this.hideFeedback();
  }

  /** Must be called on scene shutdown to prevent duplicate listeners */
  destroy(): void {
    this.clearDeploymentState();
    if (this.arenaHitZone) {
      this.arenaHitZone.destroy();
      this.arenaHitZone = null;
    }
    if (this.deploymentZoneOverlay) {
      this.deploymentZoneOverlay.destroy();
      this.deploymentZoneOverlay = null;
    }
    if (this.dragPreviewGraphics) {
      this.dragPreviewGraphics.destroy();
      this.dragPreviewGraphics = null;
    }
    if (this.feedbackText) {
      this.feedbackText.destroy();
      this.feedbackText = null;
    }
    // Remove scene-level input listeners
    this.scene.input.off('pointermove');
    this.scene.input.off('pointerup');
  }

  // ─── Private: Input Setup ──────────────────────────────────────

  private setupInputHandlers(): void {

    // 1. Arena hit zone — invisible interactive rectangle covering the playable area
    //    Receives taps/clicks on the arena for tap-to-deploy
    this.arenaHitZone = this.scene.add.zone(
      ARENA.WIDTH / 2,
      (ARENA.TOP_MARGIN + ARENA.HUD_TOP) / 2,
      ARENA.WIDTH,
      ARENA.HUD_TOP - ARENA.TOP_MARGIN
    );
    this.arenaHitZone.setInteractive({ useHandCursor: false });
    this.arenaHitZone.setDepth(1); // above background, below everything else

    // Arena tap: deploy selected card at tapped position
    this.arenaHitZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.state.selectedCardId && !this.state.isDragging) {
        const camera = this.scene.cameras.main;
        const worldPoint = camera.getWorldPoint(pointer.x, pointer.y);
        this.attemptDeployment(this.state.selectedCardId, worldPoint.x, worldPoint.y);
      }
    });

    // 2. Card image listeners — tap to select, hold to drag
    this.handCardImages.forEach((cardImg, index) => {
      let dragStarted = false;

      cardImg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        dragStarted = false;

        // Set up a quick delayed check — if pointer moves enough, start drag
        const moveHandler = (movePointer: Phaser.Input.Pointer) => {
          const dx = movePointer.x - pointer.x;
          const dy = movePointer.y - pointer.y;
          if (Math.sqrt(dx * dx + dy * dy) > 8 && !dragStarted) {
            dragStarted = true;
            this.beginCardDrag(index, movePointer);
          }
          if (this.state.isDragging) {
            this.updateCardDrag(movePointer);
          }
        };

        const upHandler = (upPointer: Phaser.Input.Pointer) => {
          this.scene.input.off('pointermove', moveHandler);
          this.scene.input.off('pointerup', upHandler);

          if (dragStarted && this.state.isDragging) {
            // Finish drag deployment
            this.finishCardDrag(upPointer);
          } else {
            // Short tap — toggle card selection
            this.selectCard(index);
          }
        };

        this.scene.input.on('pointermove', moveHandler);
        this.scene.input.on('pointerup', upHandler);
      });
    });
  }

  // ─── Private: Deployment Logic ─────────────────────────────────

  private deployTroop(cardId: string, worldX: number, worldY: number): void {
    const cardDef = CARD_TEMPLATES[cardId];
    if (!cardDef) return;

    const unitType = cardDef.unitType || cardId;
    const spawnCount = cardDef.spawnCount || 1;

    for (let i = 0; i < spawnCount; i++) {
      // Spread multiple units in a small cluster
      const offsetX = spawnCount > 1 ? (Math.random() - 0.5) * 30 : 0;
      const offsetY = spawnCount > 1 ? (Math.random() - 0.5) * 30 : 0;

      const spawnX = Phaser.Math.Clamp(worldX + offsetX, ARENA.LEFT + 10, ARENA.RIGHT - 10);
      const spawnY = Phaser.Math.Clamp(worldY + offsetY, ARENA.PLAYER_ZONE_TOP + 5, ARENA.PLAYER_ZONE_BOTTOM - 5);

      const id = `player_${unitType}_${Date.now()}_${i}`;
      const unit = new Unit(this.scene, id, unitType, spawnX, spawnY, 'blue');

      // Scale pop-in animation
      unit.scaleX = 0;
      unit.scaleY = 0;
      this.scene.tweens.add({
        targets: unit,
        scaleX: 1,
        scaleY: 1,
        duration: 150,
        delay: i * 50 // stagger multi-unit spawns
      });

      this.callbacks.onUnitSpawned(unit);
    }
  }

  private deploySpell(cardId: string, worldX: number, worldY: number): void {
    const spellStats = SPELL_STATS[cardId];
    if (!spellStats) return;

    // Visual impact circle
    const spellImpact = this.scene.add.graphics();
    spellImpact.fillStyle(0xe67e22, 0.4);
    spellImpact.fillCircle(worldX, worldY, spellStats.radius);
    spellImpact.setDepth(80);

    // Camera shake
    this.scene.cameras.main.shake(200, 0.015);

    this.scene.time.delayedCall(spellStats.travelTime, () => {
      spellImpact.destroy();

      // Damage enemies in radius
      const enemies = this.callbacks.getEnemyUnits().getChildren() as Unit[];
      enemies.forEach(u => {
        const dist = Phaser.Math.Distance.Between(worldX, worldY, u.x, u.y);
        if (dist <= spellStats.radius) {
          u.takeDamage(spellStats.damage);
        }
      });

      // Damage enemy towers in radius
      const allTowers = this.callbacks.getTowers().getChildren() as Tower[];
      allTowers.forEach(t => {
        if (t.team === 'red') {
          const dist = Phaser.Math.Distance.Between(worldX, worldY, t.x, t.y);
          if (dist <= spellStats.radius) {
            t.takeDamage(spellStats.towerDamage);
          }
        }
      });

      // Explosion particles
      if (this.scene.textures.exists('proj_fireball')) {
        const emitter = this.scene.add.particles(worldX, worldY, 'proj_fireball', {
          speed: { min: 20, max: 100 },
          angle: { min: 0, max: 360 },
          scale: { start: 1.2, end: 0 },
          blendMode: 'ADD',
          lifespan: 400,
          quantity: 16
        });
        this.scene.time.delayedCall(400, () => emitter.destroy());
      }
    });
  }

  // ─── Private: Visual Helpers ───────────────────────────────────

  private resetCardVisual(handIndex: number): void {
    if (handIndex < 0 || handIndex >= this.handCardImages.length) return;
    const cardImg = this.handCardImages[handIndex];
    this.scene.tweens.add({
      targets: cardImg,
      y: this.scene.scale.height - 52,
      scaleX: 1.0,
      scaleY: 1.0,
      duration: 120
    });
  }

  private showDeploymentZone(isSpell: boolean): void {
    this.hideDeploymentZone();

    this.deploymentZoneOverlay = this.scene.add.graphics();
    this.deploymentZoneOverlay.setDepth(2);

    if (isSpell) {
      // Spells can target the full arena
      this.deploymentZoneOverlay.fillStyle(0x3498db, 0.1);
      this.deploymentZoneOverlay.fillRect(0, ARENA.TOP_MARGIN, ARENA.WIDTH, ARENA.HUD_TOP - ARENA.TOP_MARGIN);
      this.deploymentZoneOverlay.lineStyle(1.5, 0x3498db, 0.3);
      this.deploymentZoneOverlay.strokeRect(0, ARENA.TOP_MARGIN, ARENA.WIDTH, ARENA.HUD_TOP - ARENA.TOP_MARGIN);
    } else {
      // Troops: player half only
      this.deploymentZoneOverlay.fillStyle(0x2ecc71, 0.1);
      this.deploymentZoneOverlay.fillRect(0, ARENA.PLAYER_ZONE_TOP, ARENA.WIDTH, ARENA.PLAYER_ZONE_BOTTOM - ARENA.PLAYER_ZONE_TOP);
      this.deploymentZoneOverlay.lineStyle(1.5, 0x2ecc71, 0.3);
      this.deploymentZoneOverlay.strokeRect(0, ARENA.PLAYER_ZONE_TOP, ARENA.WIDTH, ARENA.PLAYER_ZONE_BOTTOM - ARENA.PLAYER_ZONE_TOP);
    }
  }

  private hideDeploymentZone(): void {
    if (this.deploymentZoneOverlay) {
      this.deploymentZoneOverlay.destroy();
      this.deploymentZoneOverlay = null;
    }
  }

  private clearDragVisuals(): void {
    if (this.dragPreviewGraphics) {
      this.dragPreviewGraphics.clear();
      this.dragPreviewGraphics.destroy();
      this.dragPreviewGraphics = null;
    }
  }

  private showFeedback(message: string): void {
    this.hideFeedback();

    const width = this.scene.scale.width;
    this.feedbackText = this.scene.add.text(width / 2, ARENA.PLAYER_ZONE_TOP - 20, message, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#e74c3c',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(250);

    // Auto-fade after 1.2s
    this.scene.tweens.add({
      targets: this.feedbackText,
      alpha: 0,
      y: ARENA.PLAYER_ZONE_TOP - 40,
      duration: 1200,
      onComplete: () => {
        this.hideFeedback();
      }
    });
  }

  private hideFeedback(): void {
    if (this.feedbackText) {
      this.feedbackText.destroy();
      this.feedbackText = null;
    }
  }
}
