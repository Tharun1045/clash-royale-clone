/* Projectile GameObject Container Class (Phaser) */

import Phaser from 'phaser';

export class Projectile extends Phaser.GameObjects.Image {
  public target: any;
  public damage: number;
  public startX: number;
  public startY: number;
  public destinationX = 0;
  public destinationY = 0;
  
  private travelDurationMs: number;
  private elapsedMs = 0;
  private onImpactCallback: (proj: Projectile) => void;

  constructor(
    scene: Phaser.Scene,
    textureKey: string,
    startX: number,
    startY: number,
    target: any,
    damage: number,
    durationMs = 400,
    onImpact: (proj: Projectile) => void
  ) {
    super(scene, startX, startY, textureKey);
    this.target = target;
    this.damage = damage;
    this.startX = startX;
    this.startY = startY;
    this.travelDurationMs = durationMs;
    this.onImpactCallback = onImpact;

    if (target) {
      this.destinationX = target.x;
      this.destinationY = target.y;
    }

    scene.add.existing(this);
  }

  public updateProjectile(dtMs: number): void {
    this.elapsedMs += dtMs;
    const progress = Math.min(1.0, this.elapsedMs / this.travelDurationMs);

    // Dynamic destination tracking if target is alive
    if (this.target && this.target.hp > 0) {
      this.destinationX = this.target.x;
      this.destinationY = this.target.y;
    }

    // Linear interpolate
    const currentX = Phaser.Math.Linear(this.startX, this.destinationX, progress);
    const currentY = Phaser.Math.Linear(this.startY, this.destinationY, progress);

    // Apply high parabolic vertical flight arc height (offset Y)
    const arcHeight = 40 * Math.sin(progress * Math.PI);
    this.setPosition(currentX, currentY - arcHeight);

    // Face rotation direction
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.destinationX, this.destinationY);
    this.rotation = angle;

    if (progress >= 1.0) {
      this.impact();
    }
  }

  private impact(): void {
    // Deal Damage to target
    if (this.target && this.target.hp > 0) {
      this.target.takeDamage(this.damage);
    }

    // Spawn tiny impact ring sparks
    const emitter = this.scene.add.particles(this.x, this.y, this.texture.key, {
      speed: { min: 10, max: 40 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.6, end: 0 },
      lifespan: 300,
      quantity: 6
    });
    this.scene.time.delayedCall(300, () => emitter.destroy());

    this.onImpactCallback(this);
    this.destroy();
  }
}
export default Projectile;
