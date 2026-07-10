/* Tower GameObject Container Class (Phaser) */

import Phaser from 'phaser';
import { TowerDefinition } from '../types/game';
import { TOWER_STATS } from '../config/gameConfig';

export class Tower extends Phaser.GameObjects.Container {
  public id: string;
  public team: 'blue' | 'red';
  public towerType: 'princess' | 'king';
  public hp: number;
  public maxHp: number;
  public range: number;
  public damage: number;
  public hitSpeed: number;
  public lastAttackTime = 0;
  
  public isTower = true;
  public isAir = false;
  public targets: 'any' = 'any';

  private baseSprite: Phaser.GameObjects.Image;
  private healthBar: Phaser.GameObjects.Graphics;
  private rangeIndicator: Phaser.GameObjects.Graphics | null = null;
  private onDeathCallback: () => void;

  constructor(
    scene: Phaser.Scene,
    id: string,
    x: number,
    y: number,
    team: 'blue' | 'red',
    towerType: 'princess' | 'king',
    onDeath: () => void
  ) {
    super(scene, x, y);
    this.id = id;
    this.team = team;
    this.towerType = towerType;

    const stats: TowerDefinition = TOWER_STATS[towerType];
    this.hp = stats.hp;
    this.maxHp = stats.hp;
    this.range = stats.range;
    this.damage = stats.damage;
    this.hitSpeed = stats.hitSpeed;
    this.onDeathCallback = onDeath;

    // 1. Draw base sprite texture generated in PreloadScene
    const texName = `tower_${towerType}_${team}`;
    this.baseSprite = scene.add.image(0, 0, texName);
    this.add(this.baseSprite);

    // 2. Health bar
    this.healthBar = scene.add.graphics();
    this.add(this.healthBar);
    this.updateHealthBar();

    scene.add.existing(this);
  }

  public takeDamage(amount: number): void {
    if (this.hp <= 0) return;
    this.hp = Math.max(0, this.hp - amount);
    this.updateHealthBar();

    // Hit flash reaction
    this.baseSprite.setTint(0xffffff);
    this.scene.time.delayedCall(80, () => {
      this.baseSprite.clearTint();
    });

    if (this.hp <= 0) {
      this.destroySequence();
    }
  }

  public showRangeIndicator(show: boolean): void {
    if (show) {
      if (!this.rangeIndicator) {
        this.rangeIndicator = this.scene.add.graphics();
        this.rangeIndicator.lineStyle(1.5, this.team === 'blue' ? 0x3498db : 0xe74c3c, 0.45);
        this.rangeIndicator.strokeCircle(this.x, this.y, this.range);
      }
    } else {
      if (this.rangeIndicator) {
        this.rangeIndicator.destroy();
        this.rangeIndicator = null;
      }
    }
  }

  private updateHealthBar(): void {
    this.healthBar.clear();
    if (this.hp <= 0) return;

    const w = 32;
    const h = 4.5;
    const px = -w / 2;
    const py = -24;

    const fraction = this.hp / this.maxHp;
    const color = fraction > 0.4 ? 0x2ecc71 : 0xe74c3c;

    // Gray border background
    this.healthBar.fillStyle(0x000000, 0.6);
    this.healthBar.fillRect(px - 1, py - 1, w + 2, h + 2);
    // Green/Red fill
    this.healthBar.fillStyle(color, 1);
    this.healthBar.fillRect(px, py, w * fraction, h);
  }

  private destroySequence(): void {
    // Rubble visuals: gray scale tint
    this.baseSprite.setTint(0x7f8c8d);
    this.healthBar.clear();

    if (this.rangeIndicator) {
      this.rangeIndicator.destroy();
    }

    // Spawn visual explosion burst particles
    const emitter = this.scene.add.particles(this.x, this.y, 'proj_fireball', {
      speed: { min: 20, max: 80 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      blendMode: 'ADD',
      lifespan: 600,
      quantity: 12
    });
    this.scene.time.delayedCall(600, () => emitter.destroy());

    // Screenshake viewport check
    this.scene.cameras.main.shake(300, 0.02);

    this.onDeathCallback();
  }
}
export default Tower;
