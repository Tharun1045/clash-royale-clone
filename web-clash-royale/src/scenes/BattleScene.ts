/* Royal Arenas Core Battle Scene (Phaser) */

import Phaser from 'phaser';
import { Unit } from '../entities/Unit';
import { Tower } from '../entities/Tower';
import { Projectile } from '../entities/Projectile';
import { ElixirSystem } from '../systems/ElixirSystem';
import { AISystem } from '../systems/AISystem';
import { CombatSystem, CombatEntity } from '../systems/CombatSystem';
import { Pathfinding } from '../utils/Pathfinding';
import { CARD_TEMPLATES, SPELL_STATS } from '../config/gameConfig';

export class BattleScene extends Phaser.Scene {
  // Systems
  private elixirSystem!: ElixirSystem;
  private aiSystem!: AISystem;
  
  // Game state
  private activeDeck: string[] = [];
  private playerHand: string[] = [];
  private deckQueue: string[] = [];
  private nextCard = '';

  private playerCrowns = 0;
  private enemyCrowns = 0;
  private timeRemaining = 180; // 3 minutes
  private isSuddenDeath = false;
  private isGameOver = false;

  // Phaser groups
  private playerUnits!: Phaser.GameObjects.Group;
  private enemyUnits!: Phaser.GameObjects.Group;
  private projectiles!: Phaser.GameObjects.Group;
  private towers!: Phaser.GameObjects.Group;

  // Drag and Drop Deployment
  private draggingCardId: string | null = null;
  private draggingCardSlotIndex = -1;
  private dragPreviewCircle: Phaser.GameObjects.Graphics | null = null;

  // UI objects
  private elixirFillBar!: Phaser.GameObjects.Graphics;
  private elixirCountText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private crownScoreText!: Phaser.GameObjects.Text;
  private handCardImages: Phaser.GameObjects.Image[] = [];
  private nextCardImage!: Phaser.GameObjects.Image;

  // Tower references
  private leftPrincessTowerBlue!: Tower;
  private rightPrincessTowerBlue!: Tower;
  private kingTowerBlue!: Tower;
  private leftPrincessTowerRed!: Tower;
  private rightPrincessTowerRed!: Tower;
  private kingTowerRed!: Tower;

  constructor() {
    super('BattleScene');
  }

  init(): void {
    // Load player deck
    const saved = localStorage.getItem('player_deck');
    if (saved) {
      try {
        this.activeDeck = JSON.parse(saved);
      } catch {
        this.activeDeck = ['knight', 'archers', 'giant', 'baby_dragon', 'skeleton_army', 'mini_pekka', 'fireball', 'arrows'];
      }
    } else {
      this.activeDeck = ['knight', 'archers', 'giant', 'baby_dragon', 'skeleton_army', 'mini_pekka', 'fireball', 'arrows'];
    }

    // Shuffle active deck to initialize hand
    const deck = [...this.activeDeck];
    Phaser.Utils.Array.Shuffle(deck);
    this.playerHand = deck.slice(0, 4);
    this.deckQueue = deck.slice(4);
    this.nextCard = this.deckQueue.shift() || 'knight';

    this.playerCrowns = 0;
    this.enemyCrowns = 0;
    this.timeRemaining = 180;
    this.isSuddenDeath = false;
    this.isGameOver = false;
  }

  create(): void {
    const width = this.scale.width;
    const height = this.scale.height;

    // Initialize systems
    this.elixirSystem = new ElixirSystem(4, 0.35, 10);
    this.aiSystem = new AISystem(this.activeDeck, 0.32, 3500);

    // Initialize physics/scene groups
    this.playerUnits = this.add.group();
    this.enemyUnits = this.add.group();
    this.projectiles = this.add.group();
    this.towers = this.add.group();

    // 1. Draw Battlefield Arena Layout
    this.drawArena(width, height);

    // 2. Spawn Towers
    this.spawnTowers();

    // 3. Setup HUD UI Panel Overlay
    this.createHUD(width, height);

    // 4. Setup Input Drag listeners
    this.setupCardDragListeners(height);

    // 5. Timer timer loop
    this.time.addEvent({
      delay: 1000,
      callback: this.tickTimer,
      callbackScope: this,
      loop: true
    });
  }

  update(time: number, delta: number): void {
    if (this.isGameOver) return;

    const dtSeconds = delta / 1000;

    // Update Elixir Systems
    this.elixirSystem.update(dtSeconds);
    this.aiSystem.update(dtSeconds, time, (cardId, x, y) => this.spawnAIUnit(cardId, x, y));

    // Update HUD Elixir metrics
    this.updateHUDViews();

    // Update pathfinding and movements for all active units
    const leftPrincessAliveRed = this.leftPrincessTowerRed.hp > 0;
    const rightPrincessAliveRed = this.rightPrincessTowerRed.hp > 0;
    const kingAliveRed = this.kingTowerRed.hp > 0;

    const leftPrincessAliveBlue = this.leftPrincessTowerBlue.hp > 0;
    const rightPrincessAliveBlue = this.rightPrincessTowerBlue.hp > 0;
    const kingAliveBlue = this.kingTowerBlue.hp > 0;

    const allUnits = [...this.playerUnits.getChildren(), ...this.enemyUnits.getChildren()] as Unit[];
    const allTowers = this.towers.getChildren() as Tower[];

    // 1. Core AI scanning and target locks
    allUnits.forEach(unit => {
      const isRed = unit.team === 'red';
      
      // Build list of all potential combat entities
      const combatEntities: CombatEntity[] = [];
      allUnits.forEach(u => {
        if (u !== unit && u.hp > 0) {
          combatEntities.push({
            id: u.id, x: u.x, y: u.y, hp: u.hp, maxHp: u.maxHp,
            range: u.range, damage: u.damage, hitSpeed: u.hitSpeed,
            isAir: u.isAir, team: u.team, targets: u.targets, lastAttackTime: u.lastAttackTime
          });
        }
      });
      allTowers.forEach(t => {
        if (t.hp > 0) {
          combatEntities.push({
            id: t.id, x: t.x, y: t.y, hp: t.hp, maxHp: t.maxHp,
            range: t.range, damage: t.damage, hitSpeed: t.hitSpeed,
            isAir: t.isAir, isTower: true, team: t.team, targets: 'any', lastAttackTime: t.lastAttackTime
          });
        }
      });

      // Scan closest target
      const attackerEntity: CombatEntity = {
        id: unit.id, x: unit.x, y: unit.y, hp: unit.hp, maxHp: unit.maxHp,
        range: unit.range, damage: unit.damage, hitSpeed: unit.hitSpeed,
        isAir: unit.isAir, team: unit.team, targets: unit.targets, lastAttackTime: unit.lastAttackTime
      };

      const scannedTarget = CombatSystem.findNearestTarget(attackerEntity, combatEntities, 180);
      if (scannedTarget) {
        // Link reference
        const matched = allUnits.find(u => u.id === scannedTarget.id) || allTowers.find(t => t.id === scannedTarget.id);
        unit.targetEntity = matched;
      } else {
        unit.targetEntity = null;
      }

      // Generate waypoints paths
      const waypoints = Pathfinding.getPath(
        { x: unit.x, y: unit.y },
        isRed,
        isRed ? leftPrincessAliveBlue : leftPrincessAliveRed,
        isRed ? rightPrincessAliveBlue : rightPrincessAliveRed,
        isRed ? kingAliveBlue : kingAliveRed
      );

      unit.updateMovement(dtSeconds, waypoints);

      // Attack if within range
      if (unit.targetEntity && unit.targetEntity.hp > 0) {
        const isTargetTower = unit.targetEntity.isTower;
        
        // Match attacker combat entity to mutate stats
        const attackerMap = attackerEntity;
        const targetMap: CombatEntity = {
          id: unit.targetEntity.id, x: unit.targetEntity.x, y: unit.targetEntity.y,
          hp: unit.targetEntity.hp, maxHp: unit.targetEntity.maxHp, range: unit.targetEntity.range,
          damage: unit.targetEntity.damage, hitSpeed: unit.targetEntity.hitSpeed, isAir: unit.targetEntity.isAir,
          team: unit.targetEntity.team, targets: isTargetTower ? 'any' : unit.targetEntity.targets,
          lastAttackTime: unit.targetEntity.lastAttackTime
        };

        CombatSystem.executeAttack(attackerMap, targetMap, time, (dmg, isCrit) => {
          // Play visual projectile launch if ranged
          if (unit.range > 30) {
            const projectileKey = unit.unitType === 'baby_dragon' ? 'proj_fireball' : 'proj_arrow';
            const duration = unit.unitType === 'baby_dragon' ? 500 : 400;
            
            new Projectile(this, projectileKey, unit.x, unit.y, unit.targetEntity, dmg, duration, (p) => {
              this.spawnDamageNumber(p.x, p.y, dmg, isCrit);
            });
          } else {
            // Melee strike immediate damage application
            unit.targetEntity.takeDamage(dmg);
            this.spawnDamageNumber(unit.targetEntity.x, unit.targetEntity.y, dmg, isCrit);
            
            // Strike recoil wiggle tween
            this.tweens.add({
              targets: unit,
              scaleX: 1.15,
              scaleY: 1.15,
              duration: 80,
              yoyo: true
            });
          }
          unit.lastAttackTime = time;
        });
      }
    });

    // 2. Towers Defensive shooting
    allTowers.forEach(tower => {
      if (tower.hp <= 0) return;

      const opposingUnits = (tower.team === 'blue' ? this.enemyUnits : this.playerUnits).getChildren() as Unit[];
      const targetEntities: CombatEntity[] = opposingUnits.map(u => ({
        id: u.id, x: u.x, y: u.y, hp: u.hp, maxHp: u.maxHp,
        range: u.range, damage: u.damage, hitSpeed: u.hitSpeed,
        isAir: u.isAir, team: u.team, targets: u.targets, lastAttackTime: u.lastAttackTime
      }));

      const attackerTowerEntity: CombatEntity = {
        id: tower.id, x: tower.x, y: tower.y, hp: tower.hp, maxHp: tower.maxHp,
        range: tower.range, damage: tower.damage, hitSpeed: tower.hitSpeed,
        isAir: tower.isAir, isTower: true, team: tower.team, targets: 'any', lastAttackTime: tower.lastAttackTime
      };

      const scannedTarget = CombatSystem.findNearestTarget(attackerTowerEntity, targetEntities, tower.range);
      if (scannedTarget) {
        const targetUnit = opposingUnits.find(u => u.id === scannedTarget.id);
        if (targetUnit) {
          const cooldownMs = tower.hitSpeed * 1000;
          if (time - tower.lastAttackTime >= cooldownMs) {
            tower.lastAttackTime = time;

            // Princess tower fires arrows, King tower fires cannons (drawn as fireball projectiles)
            const projKey = tower.towerType === 'king' ? 'proj_fireball' : 'proj_arrow';
            new Projectile(this, projKey, tower.x, tower.y, targetUnit, tower.damage, 450, (p) => {
              targetUnit.takeDamage(tower.damage);
              this.spawnDamageNumber(p.x, p.y, tower.damage, false);
            });
          }
        }
      }
    });

    // 3. Update active projectiles
    const activeProjectiles = this.projectiles.getChildren() as Projectile[];
    activeProjectiles.forEach(proj => proj.updateProjectile(delta));
  }

  private drawArena(width: number, height: number): void {
    // Checkered grass boxes
    const grid = this.add.graphics();
    const boxSize = 20;
    for (let x = 0; x < width; x += boxSize) {
      for (let y = 52; y < height - 120; y += boxSize) {
        const isDark = (x / boxSize + y / boxSize) % 2 === 0;
        grid.fillStyle(isDark ? 0x27ae60 : 0x2ecc71, 1);
        grid.fillRect(x, y, boxSize, boxSize);
      }
    }

    // River
    const river = this.add.graphics();
    river.fillStyle(0x2980b9, 1); // dark blue river
    river.fillRect(0, 304, width, 32);

    // River banks lines
    river.lineStyle(1.5, 0x1b4f72, 0.8);
    river.strokeLineShape(new Phaser.Geom.Line(0, 304, width, 304));
    river.strokeLineShape(new Phaser.Geom.Line(0, 336, width, 336));

    // Two bridges
    const drawBridge = (x: number) => {
      const bridge = this.add.graphics();
      // bridge stone background
      bridge.fillStyle(0x7f8c8d, 1);
      bridge.fillRect(x - 18, 304, 36, 32);
      // wooden planks borders
      bridge.fillStyle(0x875e3c, 1);
      bridge.fillRect(x - 18, 304, 4, 32);
      bridge.fillRect(x + 14, 304, 4, 32);
    };
    drawBridge(90);
    drawBridge(270);
  }

  private spawnTowers(): void {
    // Blue Player Towers
    this.leftPrincessTowerBlue = new Tower(this, 'blue_princess_left', 90, 500, 'blue', 'princess', () => this.handleTowerCollapse('red'));
    this.rightPrincessTowerBlue = new Tower(this, 'blue_princess_right', 270, 500, 'blue', 'princess', () => this.handleTowerCollapse('red'));
    this.kingTowerBlue = new Tower(this, 'blue_king', 180, 560, 'blue', 'king', () => this.endMatch('red'));

    // Red Enemy Towers
    this.leftPrincessTowerRed = new Tower(this, 'red_princess_left', 90, 140, 'red', 'princess', () => this.handleTowerCollapse('blue'));
    this.rightPrincessTowerRed = new Tower(this, 'red_princess_right', 270, 140, 'red', 'princess', () => this.handleTowerCollapse('blue'));
    this.kingTowerRed = new Tower(this, 'red_king', 180, 80, 'red', 'king', () => this.endMatch('blue'));

    this.towers.add(this.leftPrincessTowerBlue);
    this.towers.add(this.rightPrincessTowerBlue);
    this.towers.add(this.kingTowerBlue);
    
    this.towers.add(this.leftPrincessTowerRed);
    this.towers.add(this.rightPrincessTowerRed);
    this.towers.add(this.kingTowerRed);
  }

  private createHUD(width: number, height: number): void {
    // Header Bar Text (Score and timer overlays)
    this.timerText = this.add.text(width / 2, 26, '3:00', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5).setDepth(200);

    this.crownScoreText = this.add.text(width / 2 - 60, 26, '0 - 0', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#f1c40f'
    }).setOrigin(0.5).setDepth(200);

    // Bottom Elixir Slider Fill HUD background shape
    const elixirPanel = this.add.graphics();
    elixirPanel.fillStyle(0x0e1017, 1);
    elixirPanel.fillRect(0, height - 120, width, 120);
    elixirPanel.lineStyle(2, 0x2d303f, 1);
    elixirPanel.strokeLineShape(new Phaser.Geom.Line(0, height - 120, width, height - 120));

    this.elixirFillBar = this.add.graphics();
    elixirPanel.setDepth(150);
    this.elixirFillBar.setDepth(160);

    // Elixir value count text
    this.elixirCountText = this.add.text(25, height - 100, '4', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5).setDepth(180);

    // Render Hand cards visual slots at bottom
    const startX = 75;
    const cardWidth = 52;
    const spacing = 62;

    for (let i = 0; i < 4; i++) {
      const cx = startX + i * spacing;
      const cy = height - 52;
      const imgKey = `card_${this.playerHand[i]}`;
      
      const cardImg = this.add.image(cx, cy, imgKey).setDisplaySize(cardWidth, 70);
      cardImg.setInteractive({ useHandCursor: true });
      cardImg.setDepth(180);
      
      this.handCardImages.push(cardImg);
    }

    // Next Card preview slot
    this.nextCardImage = this.add.image(28, height - 42, `card_${this.nextCard}`).setDisplaySize(32, 42);
    this.nextCardImage.setDepth(180);
    this.nextCardImage.setAlpha(0.65);
  }

  private setupCardDragListeners(height: number): void {
    // Circular preview AOE ring
    this.dragPreviewCircle = this.add.graphics();
    this.dragPreviewCircle.setDepth(90);

    this.input.on('pointerdown', (_pointer: Phaser.Input.Pointer, gameObjects: any[]) => {
      if (this.isGameOver) return;

      // Check if clicked card image slot
      const clickedCardImg = gameObjects[0] as Phaser.GameObjects.Image;
      if (clickedCardImg && this.handCardImages.includes(clickedCardImg)) {
        const index = this.handCardImages.indexOf(clickedCardImg);
        const cardId = this.playerHand[index];
        const cardDef = CARD_TEMPLATES[cardId];

        if (cardDef && this.elixirSystem.canSpend(cardDef.cost)) {
          this.draggingCardId = cardId;
          this.draggingCardSlotIndex = index;

          // Lift card feedback
          this.tweens.add({
            targets: clickedCardImg,
            y: height - 70,
            scaleX: 1.15,
            scaleY: 1.15,
            duration: 100
          });
        }
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.draggingCardId) return;

      // Update drag circles preview rings
      this.dragPreviewCircle!.clear();
      
      const isSpell = CARD_TEMPLATES[this.draggingCardId].type === 'spell';
      const rangeVal = isSpell ? (SPELL_STATS[this.draggingCardId].radius || 50) : 25;
      const isValidZone = pointer.y > 320 && pointer.y < height - 120; // player field limit

      const color = isValidZone ? 0x2ecc71 : 0xe74c3c;
      this.dragPreviewCircle!.lineStyle(2, color, 0.65);
      
      if (isSpell) {
        this.dragPreviewCircle!.strokeCircle(pointer.x, pointer.y, rangeVal);
      } else {
        this.dragPreviewCircle!.strokeRect(pointer.x - rangeVal, pointer.y - rangeVal, rangeVal * 2, rangeVal * 2);
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.draggingCardId) return;

      const cardDef = CARD_TEMPLATES[this.draggingCardId];
      const isValidZone = pointer.y > 320 && pointer.y < height - 120;

      if (isValidZone && this.elixirSystem.spend(cardDef.cost)) {
        // Deploy unit/spell on coordinates
        this.deployPlayerCard(this.draggingCardId, pointer.x, pointer.y);

        // Cycle deck hand
        this.playerHand[this.draggingCardSlotIndex] = this.nextCard;
        this.deckQueue.push(this.draggingCardId);
        this.nextCard = this.deckQueue.shift() || 'knight';

        // Update visual textures on HUD slots
        this.handCardImages[this.draggingCardSlotIndex].setTexture(`card_${this.playerHand[this.draggingCardSlotIndex]}`);
        this.nextCardImage.setTexture(`card_${this.nextCard}`);
      }

      // Reset drag elements
      const activeSlotImg = this.handCardImages[this.draggingCardSlotIndex];
      this.tweens.add({
        targets: activeSlotImg,
        y: height - 52,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 120
      });

      this.draggingCardId = null;
      this.draggingCardSlotIndex = -1;
      this.dragPreviewCircle!.clear();
    });
  }

  private deployPlayerCard(cardId: string, x: number, y: number): void {
    const cardDef = CARD_TEMPLATES[cardId];
    if (!cardDef) return;

    if (cardDef.type === 'spell') {
      // Cast spell meteors
      const spellStats = SPELL_STATS[cardId];
      
      const spellImpact = this.add.graphics();
      spellImpact.fillStyle(0xe67e22, 0.4);
      spellImpact.fillCircle(x, y, spellStats.radius);
      spellImpact.setDepth(80);

      // Camera shakes
      this.cameras.main.shake(200, 0.015);

      this.time.delayedCall(spellStats.travelTime, () => {
        spellImpact.destroy();
        
        // Scan radial units
        const enemies = this.enemyUnits.getChildren() as Unit[];
        enemies.forEach(u => {
          const dist = Phaser.Math.Distance.Between(x, y, u.x, u.y);
          if (dist <= spellStats.radius) {
            u.takeDamage(spellStats.damage);
            this.spawnDamageNumber(u.x, u.y, spellStats.damage, true);
          }
        });

        // Scan radial towers
        const targetTowers = this.towers.getChildren() as Tower[];
        targetTowers.forEach(t => {
          if (t.team === 'red') {
            const dist = Phaser.Math.Distance.Between(x, y, t.x, t.y);
            if (dist <= spellStats.radius) {
              t.takeDamage(spellStats.towerDamage);
              this.spawnDamageNumber(t.x, t.y, spellStats.towerDamage, false);
            }
          }
        });

        // Spawn visual explosion effects particles
        const emitter = this.add.particles(x, y, 'proj_fireball', {
          speed: { min: 20, max: 100 },
          angle: { min: 0, max: 360 },
          scale: { start: 1.2, end: 0 },
          blendMode: 'ADD',
          lifespan: 400,
          quantity: 16
        });
        this.time.delayedCall(400, () => emitter.destroy());
      });
    } else {
      // Spawns troop unit
      this.spawnPlayerUnit(cardId, x, y);
    }
  }

  private spawnPlayerUnit(cardId: string, x: number, y: number): void {
    const id = `player_${cardId}_${Date.now()}`;
    const unit = new Unit(this, id, cardId, x, y, 'blue');
    this.playerUnits.add(unit);

    // Scale pop in
    unit.scaleX = 0;
    unit.scaleY = 0;
    this.tweens.add({ targets: unit, scaleX: 1, scaleY: 1, duration: 150 });
  }

  private spawnAIUnit(cardId: string, x: number, y: number): void {
    const id = `bot_${cardId}_${Date.now()}`;
    const unit = new Unit(this, id, cardId, x, y, 'red');
    this.enemyUnits.add(unit);
    
    // Scale pop in
    unit.scaleX = 0;
    unit.scaleY = 0;
    this.tweens.add({ targets: unit, scaleX: 1, scaleY: 1, duration: 150 });
  }

  private handleTowerCollapse(opposingTeam: 'blue' | 'red'): void {
    if (opposingTeam === 'blue') {
      this.playerCrowns++;
    } else {
      this.enemyCrowns++;
    }
    this.crownScoreText.setText(`${this.playerCrowns} - ${this.enemyCrowns}`);
  }

  private tickTimer(): void {
    if (this.isGameOver) return;

    this.timeRemaining = Math.max(0, this.timeRemaining - 1);
    
    const minutes = Math.floor(this.timeRemaining / 60);
    const seconds = this.timeRemaining % 60;
    this.timerText.setText(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);

    if (this.timeRemaining === 60) {
      // Sudden death alert triggers double elixir speed
      this.elixirSystem.setMultiplier(2.0);
      this.aiSystem.setRegenMultiplier(2.0);
    }

    if (this.timeRemaining <= 0) {
      if (this.playerCrowns !== this.enemyCrowns) {
        this.endMatch(this.playerCrowns > this.enemyCrowns ? 'blue' : 'red');
      } else if (!this.isSuddenDeath) {
        this.isSuddenDeath = true;
        this.timeRemaining = 60; // 1 min sudden death extension
      } else {
        this.endMatch('draw');
      }
    }
  }

  private updateHUDViews(): void {
    const width = this.scale.width;
    const height = this.scale.height;

    // Smooth filling elixir progress bar
    this.elixirFillBar.clear();
    
    const maxBarW = width - 80;
    const fraction = this.elixirSystem.getElixir() / 10;
    
    // Elixir progress fill
    this.elixirFillBar.fillStyle(0xd633ff, 1);
    this.elixirFillBar.fillRect(60, height - 106, maxBarW * fraction, 12);
    
    // Divider slots
    this.elixirFillBar.lineStyle(1.5, 0x2d303f, 0.4);
    for (let i = 1; i < 10; i++) {
      const dx = 60 + (maxBarW / 10) * i;
      this.elixirFillBar.strokeLineShape(new Phaser.Geom.Line(dx, height - 106, dx, height - 94));
    }

    this.elixirCountText.setText(Math.floor(this.elixirSystem.getElixir()).toString());
  }

  private spawnDamageNumber(x: number, y: number, damage: number, isCritical: boolean): void {
    const text = this.add.text(x, y - 10, `-${Math.round(damage)}`, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: isCritical ? '13px' : '10px',
      fontStyle: 'bold',
      color: isCritical ? '#f1c40f' : '#ffffff',
      stroke: '#000000',
      strokeThickness: 2.5
    }).setOrigin(0.5);

    this.tweens.add({
      targets: text,
      y: y - 36,
      alpha: 0,
      duration: 750,
      onComplete: () => text.destroy()
    });
  }

  private endMatch(winnerTeam: 'blue' | 'red' | 'draw'): void {
    this.isGameOver = true;
    this.scene.start('ResultsScene', { winner: winnerTeam, score: `${this.playerCrowns} - ${this.enemyCrowns}` });
  }
}
export default BattleScene;
