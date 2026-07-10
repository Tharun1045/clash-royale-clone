/* Royal Arenas Game Configuration Entrypoint (TypeScript/Phaser) */

import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { LobbyScene } from './scenes/LobbyScene';
import { DeckBuilderScene } from './scenes/DeckBuilderScene';
import { BattleScene } from './scenes/BattleScene';
import { ResultsScene } from './scenes/ResultsScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 360,
  height: 640,
  parent: 'game-container',
  backgroundColor: '#0b0c10',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  render: {
    antialias: true,
    pixelArt: false
  },
  scene: [BootScene, PreloadScene, LobbyScene, DeckBuilderScene, BattleScene, ResultsScene]
};

// Initialise Phaser Game
export const game = new Phaser.Game(config);
export default game;
