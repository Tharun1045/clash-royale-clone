/* Royal Arenas Boot Scene (Phaser) */

import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    // Load minimal boot assets (e.g. logo, loading progress background)
  }

  create(): void {
    this.scene.start('PreloadScene');
  }
}
export default BootScene;
