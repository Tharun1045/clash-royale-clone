/* Royal Arenas Home Lobby Scene (Phaser) */

import Phaser from 'phaser';

export class LobbyScene extends Phaser.Scene {
  private particles: Phaser.GameObjects.Graphics[] = [];

  constructor() {
    super('LobbyScene');
  }

  create(): void {
    const width = this.scale.width;
    const height = this.scale.height;

    // 1. Draw animated gradient background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x111424, 0x111424, 0x080911, 0x080911, 1);
    bg.fillRect(0, 0, width, height);

    // 2. Spawn ambient floating background particle rings
    for (let i = 0; i < 15; i++) {
      const px = Math.random() * width;
      const py = height + Math.random() * 100;
      const size = 3 + Math.random() * 5;
      
      const particle = this.add.graphics();
      particle.fillStyle(0xd633ff, 0.15); // soft purple glowing circles
      particle.fillCircle(0, 0, size);
      particle.setPosition(px, py);
      
      this.particles.push(particle);
    }

    // 3. Game Logo
    const titleText = this.add.text(width / 2, 100, 'ROYAL ARENAS', {
      fontFamily: 'Outfit, Montserrat, sans-serif',
      fontSize: '34px',
      fontStyle: 'bold',
      color: '#ffebcc',
      shadow: { color: '#5c3c24', blur: 6, stroke: true, fill: true, offsetY: 4 }
    }).setOrigin(0.5);

    // Bounce floating logo effect
    this.tweens.add({
      targets: titleText,
      y: 92,
      duration: 2000,
      ease: 'Sine.easeInOut',
      yoyo: true,
      loop: -1
    });

    // 4. Currency Overlay Header Panel
    this.add.text(40, 24, '🪙 1,500', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffffff'
    });
    
    this.add.text(width - 110, 24, '💎 250', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffffff'
    });

    // 5. Large "BATTLE" button
    const battleBtnBg = this.add.graphics();
    battleBtnBg.fillGradientStyle(0xf1c40f, 0xf1c40f, 0xd4ac0d, 0xd4ac0d, 1);
    battleBtnBg.fillRoundedRect(-85, -30, 170, 60, 18);
    battleBtnBg.lineStyle(2, 0xffffff, 1);
    battleBtnBg.strokeRoundedRect(-85, -30, 170, 60, 18);
    
    const battleLabel = this.add.text(0, 0, 'BATTLE', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#1a1505'
    }).setOrigin(0.5);

    const battleContainer = this.add.container(width / 2, height - 180, [battleBtnBg, battleLabel]);
    battleContainer.setSize(170, 60);
    battleContainer.setInteractive({ useHandCursor: true });

    // Hover scales
    battleContainer.on('pointerover', () => {
      this.tweens.add({ targets: battleContainer, scaleX: 1.05, scaleY: 1.05, duration: 150 });
    });
    battleContainer.on('pointerout', () => {
      this.tweens.add({ targets: battleContainer, scaleX: 1.0, scaleY: 1.0, duration: 150 });
    });

    // Trigger Play Scene
    battleContainer.on('pointerdown', () => {
      this.tweens.add({
        targets: battleContainer,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 100,
        yoyo: true,
        onComplete: () => {
          this.scene.start('BattleScene');
        }
      });
    });

    // 6. Navigation Tabs footer
    const navBg = this.add.graphics();
    navBg.fillStyle(0x151720, 1);
    navBg.fillRect(0, height - 52, width, 52);
    navBg.lineStyle(2, 0x2d303f, 1);
    navBg.strokeLineShape(new Phaser.Geom.Line(0, height - 52, width, height - 52));

    this.add.text(width / 4, height - 26, 'CARDS 🃏', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#888a9c'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      this.scene.start('DeckBuilderScene');
    });

    this.add.text((width / 4) * 3, height - 26, 'BATTLE ⚔️', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#f1c40f'
    }).setOrigin(0.5);
  }

  update(_time: number, delta: number): void {
    // Animate background particles upwards
    const speed = 0.05 * delta;
    this.particles.forEach(p => {
      p.y -= speed;
      if (p.y < -20) {
        p.y = this.scale.height + 20;
        p.x = Math.random() * this.scale.width;
      }
    });
  }
}
export default LobbyScene;
