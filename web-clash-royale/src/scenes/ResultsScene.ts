/* Royal Arenas Results Scene (Phaser) */

import Phaser from 'phaser';

export class ResultsScene extends Phaser.Scene {
  private winner = 'draw';
  private score = '0 - 0';

  constructor() {
    super('ResultsScene');
  }

  init(data: { winner: string; score: string }): void {
    this.winner = data.winner || 'draw';
    this.score = data.score || '0 - 0';
  }

  create(): void {
    const width = this.scale.width;
    const height = this.scale.height;

    // 1. Background
    const bg = this.add.graphics();
    bg.fillStyle(0x0e1017, 0.95);
    bg.fillRect(0, 0, width, height);

    // 2. Banner Result
    let resultTitle = 'MATCH OVER';
    let bannerColor = 0xf1c40f; // Gold for draw
    let message = 'It was a tight battle!';

    if (this.winner === 'blue') {
      resultTitle = 'VICTORY';
      bannerColor = 0x2ecc71; // Green for win
      message = 'You outplayed the Robot AI!';
    } else if (this.winner === 'red') {
      resultTitle = 'DEFEAT';
      bannerColor = 0xe74c3c; // Red for loss
      message = 'The Robot AI outsmarted you.';
    }

    this.add.text(width / 2, height / 2 - 120, resultTitle, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '36px',
      fontStyle: 'bold',
      color: '#' + bannerColor.toString(16),
      shadow: { color: '#000', blur: 6, fill: true, stroke: true, offsetY: 2 }
    }).setOrigin(0.5);

    // Score display
    this.add.text(width / 2, height / 2 - 50, this.score, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Message
    this.add.text(width / 2, height / 2, message, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '12px',
      color: '#888a9c'
    }).setOrigin(0.5);

    // 3. Return home button
    const homeBtnBg = this.add.graphics();
    homeBtnBg.fillStyle(0xf1c40f, 1);
    homeBtnBg.fillRoundedRect(-80, -22, 160, 44, 12);
    homeBtnBg.lineStyle(2, 0xffffff, 1);
    homeBtnBg.strokeRoundedRect(-80, -22, 160, 44, 12);

    const homeLabel = this.add.text(0, 0, 'HOME LOBBY', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#1a1505'
    }).setOrigin(0.5);

    const homeBtn = this.add.container(width / 2, height / 2 + 80, [homeBtnBg, homeLabel]);
    homeBtn.setSize(160, 44);
    homeBtn.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      this.scene.start('LobbyScene');
    });

    // 4. Restart Battle button
    const restartBtnBg = this.add.graphics();
    restartBtnBg.fillStyle(0x34495e, 1);
    restartBtnBg.fillRoundedRect(-80, -22, 160, 44, 12);
    restartBtnBg.lineStyle(2, 0x5a738e, 1);
    restartBtnBg.strokeRoundedRect(-80, -22, 160, 44, 12);

    const restartLabel = this.add.text(0, 0, 'BATTLE AGAIN', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    const restartBtn = this.add.container(width / 2, height / 2 + 140, [restartBtnBg, restartLabel]);
    restartBtn.setSize(160, 44);
    restartBtn.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      this.scene.start('BattleScene');
    });
  }
}
export default ResultsScene;
