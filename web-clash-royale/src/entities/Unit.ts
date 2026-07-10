/* Unit GameObject Container Class (Phaser) */

import Phaser from 'phaser';
import { UnitDefinition, Position } from '../types/game';
import { UNIT_STATS } from '../config/gameConfig';

export class Unit extends Phaser.GameObjects.Container {
  public id: string;
  public unitType: string;
  public team: 'blue' | 'red';
  public hp: number;
  public maxHp: number;
  public speed: number;
  public range: number;
  public damage: number;
  public hitSpeed: number;
  public isAir: boolean;
  public isSplash = false;
  public splashRadius = 0;
  public lastAttackTime = 0;

  public targets: 'any' | 'towers';
  public targetEntity: any = null;
  public pathWaypoints: Position[] = [];
  public currentWaypointIndex = 0;

  private baseSprite: Phaser.GameObjects.Image;
  private healthBar: Phaser.GameObjects.Graphics;
  private iconText: Phaser.GameObjects.Text;
  private bobTimer = 0;

  constructor(
    scene: Phaser.Scene,
    id: string,
    unitType: string,
    x: number,
    y: number,
    team: 'blue' | 'red'
  ) {
    super(scene, x, y);
    this.id = id;
    this.unitType = unitType;
    this.team = team;

    const stats: UnitDefinition = UNIT_STATS[unitType];
    this.hp = stats.hp;
    this.maxHp = stats.hp;
    this.speed = stats.speed;
    this.range = stats.range;
    this.damage = stats.damage;
    this.hitSpeed = stats.hitSpeed;
    this.isAir = stats.isAir;
    this.targets = stats.targets;

    if (stats.isSplash) {
      this.isSplash = true;
      this.splashRadius = stats.splashRadius || 30;
    }

    // 1. Draw base sprite texture generated in PreloadScene
    const texName = `unit_${unitType}_${team}`;
    this.baseSprite = scene.add.image(0, 0, texName);
    this.add(this.baseSprite);

    // 2. Overlaid emoji icon
    this.iconText = scene.add.text(0, -1, stats.icon, { fontSize: '10px' }).setOrigin(0.5);
    this.add(this.iconText);

    // 3. Health bar graphics slider
    this.healthBar = scene.add.graphics();
    this.add(this.healthBar);
    this.updateHealthBar();

    scene.add.existing(this);
  }

  public updateMovement(dtSeconds: number, waypoints: Position[]): void {
    if (this.hp <= 0) return;

    let targetX = this.x;
    let targetY = this.y;
    let targetChosen = false;

    // Priority 1: Pursue combat target if scanned
    if (this.targetEntity && this.targetEntity.hp > 0) {
      targetX = this.targetEntity.x;
      targetY = this.targetEntity.y;
      targetChosen = true;
    } else {
      // Priority 2: Walk path waypoints
      if (this.currentWaypointIndex < waypoints.length) {
        const wp = waypoints[this.currentWaypointIndex];
        const distToWp = Phaser.Math.Distance.Between(this.x, this.y, wp.x, wp.y);
        
        if (distToWp < 15) {
          this.currentWaypointIndex++;
        }
        
        if (this.currentWaypointIndex < waypoints.length) {
          targetX = waypoints[this.currentWaypointIndex].x;
          targetY = waypoints[this.currentWaypointIndex].y;
          targetChosen = true;
        }
      }
    }

    if (targetChosen) {
      const distance = Phaser.Math.Distance.Between(this.x, this.y, targetX, targetY);
      const attackRange = this.targetEntity ? this.range : 15;

      if (distance > attackRange) {
        // Move towards target coordinates
        const angle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
        const vx = Math.cos(angle) * this.speed * 60 * dtSeconds;
        const vy = Math.sin(angle) * this.speed * 60 * dtSeconds;

        this.x += vx;
        this.y += vy;

        // Visual Bobbing walk animation
        this.bobTimer += dtSeconds * 12;
        const scaleBob = 1.0 + Math.sin(this.bobTimer) * 0.08;
        this.baseSprite.setScale(1.0, scaleBob);

        // Face movement direction
        this.rotation = angle;
        this.iconText.rotation = -angle; // keeps emoji straight
      } else {
        // Stop movement
        this.baseSprite.setScale(1.0);
      }
    }
  }

  public takeDamage(amount: number): void {
    if (this.hp <= 0) return;
    this.hp = Math.max(0, this.hp - amount);
    this.updateHealthBar();

    // Hit flash tint
    this.baseSprite.setTint(0xffffff);
    this.scene.time.delayedCall(80, () => {
      this.baseSprite.clearTint();
    });

    if (this.hp <= 0) {
      this.destroySequence();
    }
  }

  private updateHealthBar(): void {
    this.healthBar.clear();
    if (this.hp <= 0) return;

    const w = 18;
    const h = 3.5;
    const px = -w / 2;
    const py = -16;

    const fraction = this.hp / this.maxHp;
    const color = fraction > 0.4 ? 0x2ecc71 : 0xe74c3c;

    // Gray border background
    this.healthBar.fillStyle(0x000000, 0.6);
    this.healthBar.fillRect(px - 0.5, py - 0.5, w + 1, h + 1);
    // Green/Red fill
    this.healthBar.fillStyle(color, 1);
    this.healthBar.fillRect(px, py, w * fraction, h);
  }

  private destroySequence(): void {
    this.healthBar.clear();
    this.baseSprite.setAlpha(0.5);

    // Spawn tiny puff particle burst on death
    const emitter = this.scene.add.particles(this.x, this.y, 'proj_arrow', {
      speed: { min: 10, max: 40 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      lifespan: 400,
      quantity: 5
    });
    this.scene.time.delayedCall(400, () => emitter.destroy());

    this.destroy();
  }
}
export default Unit;
