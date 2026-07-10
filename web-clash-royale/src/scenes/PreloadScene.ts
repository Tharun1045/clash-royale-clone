/* Royal Arenas Preload Scene (Phaser) */

import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    // Add loading progress bar HUD
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 120, height / 2 - 15, 240, 30);
    
    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xd633ff, 1); // Elixir purple progress bar
      progressBar.fillRect(width / 2 - 115, height / 2 - 10, 230 * value, 20);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
    });

    // Preload JPG Card illustrations from assets
    this.load.image('card_knight', 'assets/cards/knight.jpg');
    this.load.image('card_archers', 'assets/cards/archers.jpg');
    this.load.image('card_giant', 'assets/cards/giant.jpg');
    this.load.image('card_baby_dragon', 'assets/cards/baby_dragon.jpg');
    this.load.image('card_skeleton_army', 'assets/cards/skeleton_army.jpg');
    this.load.image('card_mini_pekka', 'assets/cards/mini_pekka.jpg');
    this.load.image('card_fireball', 'assets/cards/fireball.jpg');
    this.load.image('card_arrows', 'assets/cards/arrows.jpg');
  }

  create(): void {
    // Programmatically generate geometric texture graphics for units and buildings
    this.createProceduralTextures();
    this.scene.start('LobbyScene');
  }

  private createProceduralTextures(): void {
    const generateColoredUnit = (key: string, fillColor: number, _iconStr: string, radius = 12) => {
      const g = this.add.graphics();
      // Unit body
      g.fillStyle(fillColor, 1);
      g.lineStyle(2, 0xffffff, 1);
      g.fillCircle(radius, radius, radius - 2);
      g.strokeCircle(radius, radius, radius - 2);
      
      // Face indicator arrow direction
      g.fillStyle(0xffffff, 0.8);
      g.beginPath();
      g.moveTo(radius + radius - 4, radius);
      g.lineTo(radius + 2, radius - 4);
      g.lineTo(radius + 2, radius + 4);
      g.closePath();
      g.fill();

      g.generateTexture(key, radius * 2, radius * 2);
      g.destroy();
    };

    // Spawn Player Blue & Enemy Red textures
    generateColoredUnit('unit_knight_blue', 0x3498db, '⚔️', 12);
    generateColoredUnit('unit_knight_red', 0xe74c3c, '⚔️', 12);
    
    generateColoredUnit('unit_archer_blue', 0xe67e22, '🏹', 9);
    generateColoredUnit('unit_archer_red', 0xc0392b, '🏹', 9);
    
    generateColoredUnit('unit_giant_blue', 0xd35400, '✊', 18);
    generateColoredUnit('unit_giant_red', 0x900c3f, '✊', 18);
    
    generateColoredUnit('unit_baby_dragon_blue', 0x2ecc71, '🐉', 13);
    generateColoredUnit('unit_baby_dragon_red', 0x27ae60, '🐉', 13);
    
    generateColoredUnit('unit_skeleton_blue', 0xecf0f1, '💀', 7);
    generateColoredUnit('unit_skeleton_red', 0xbdc3c7, '💀', 7);
    
    generateColoredUnit('unit_mini_pekka_blue', 0x1abc9c, '🤖', 13);
    generateColoredUnit('unit_mini_pekka_red', 0x16a085, '🤖', 13);

    // Towers
    const generateTower = (key: string, baseColor: number, size = 32) => {
      const g = this.add.graphics();
      g.fillStyle(0x7f8c8d, 1); // stone background
      g.fillRect(0, 0, size, size);
      
      g.fillStyle(baseColor, 0.75); // team flag color
      g.fillRect(4, 4, size - 8, size - 8);
      
      g.lineStyle(3, 0xffffff, 1);
      g.strokeRect(0, 0, size, size);
      
      g.generateTexture(key, size, size);
      g.destroy();
    };
    generateTower('tower_princess_blue', 0x2980b9, 36);
    generateTower('tower_princess_red', 0xc0392b, 36);
    generateTower('tower_king_blue', 0x1b4f72, 44);
    generateTower('tower_king_red', 0x78281f, 44);

    // Projectiles
    const generateProjectile = (key: string, color: number, r = 4) => {
      const g = this.add.graphics();
      g.fillStyle(color, 1);
      g.fillCircle(r, r, r);
      g.generateTexture(key, r * 2, r * 2);
      g.destroy();
    };
    generateProjectile('proj_arrow', 0xf1c40f, 3);
    generateProjectile('proj_fireball', 0xe67e22, 6);
  }
}
export default PreloadScene;
