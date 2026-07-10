/* Royal Arenas Deck Builder Scene (Phaser) */

import Phaser from 'phaser';
import { CARD_TEMPLATES, DEFAULT_DECK, FULL_COLLECTION } from '../config/gameConfig';

export class DeckBuilderScene extends Phaser.Scene {
  private activeDeck: string[] = [];
  private selectedSlotIndex = -1;
  private cardGroupObjects: Phaser.GameObjects.Container[] = [];

  constructor() {
    super('DeckBuilderScene');
  }

  init(): void {
    // Load deck configuration from localStorage or fallback defaults
    const saved = localStorage.getItem('player_deck');
    if (saved) {
      try {
        this.activeDeck = JSON.parse(saved);
      } catch {
        this.activeDeck = [...DEFAULT_DECK];
      }
    } else {
      this.activeDeck = [...DEFAULT_DECK];
    }
  }

  create(): void {
    const width = this.scale.width;
    const height = this.scale.height;

    // 1. Background
    const bg = this.add.graphics();
    bg.fillStyle(0x111424, 1);
    bg.fillRect(0, 0, width, height);

    // 2. Title header
    this.add.text(width / 2, 40, 'DECK BUILDER', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ffebcc'
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(width / 2, 65, 'Select a deck slot, then click a card below to swap', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '10px',
      color: '#888a9c'
    }).setOrigin(0.5);

    // Render Active Deck (Grid layout: 2 rows of 4 columns)
    this.renderGrids(width, height);

    // 3. Footer Back button
    const backBtnBg = this.add.graphics();
    backBtnBg.fillStyle(0x2c3e50, 1);
    backBtnBg.fillRoundedRect(-60, -20, 120, 40, 10);
    backBtnBg.lineStyle(2, 0x5a738e, 1);
    backBtnBg.strokeRoundedRect(-60, -20, 120, 40, 10);

    const backLabel = this.add.text(0, 0, 'BACK', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    const backBtn = this.add.container(width / 2, height - 40, [backBtnBg, backLabel]);
    backBtn.setSize(120, 40);
    backBtn.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      this.scene.start('LobbyScene');
    });
  }

  private renderGrids(width: number, height: number): void {
    // Clear previous containers
    this.cardGroupObjects.forEach(obj => obj.destroy());
    this.cardGroupObjects = [];

    // Active deck layout (rows = 2, cols = 4)
    const activeDeckYStart = 90;
    const colSpacing = 84;
    const rowSpacing = 110;
    const activeDeckXStart = (width - (3 * colSpacing)) / 2;

    for (let i = 0; i < 8; i++) {
      const index = i;
      const cardId = this.activeDeck[i];
      const col = i % 4;
      const row = Math.floor(i / 4);

      const cx = activeDeckXStart + col * colSpacing;
      const cy = activeDeckYStart + row * rowSpacing;

      const cardContainer = this.drawCardSlot(cx, cy, cardId, index === this.selectedSlotIndex);
      
      cardContainer.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        this.selectedSlotIndex = index;
        this.renderGrids(width, height); // Re-draw selection highlights
      });

      this.cardGroupObjects.push(cardContainer);
    }

    // Collection layout (grid: 2 rows of 4 columns, showing all cards in registry)
    const collectionYStart = 330;
    const collectionXStart = (width - (3 * colSpacing)) / 2;

    this.add.text(width / 2, collectionYStart - 20, 'CARD COLLECTION', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#ffebcc'
    }).setOrigin(0.5);

    for (let i = 0; i < FULL_COLLECTION.length; i++) {
      const cardId = FULL_COLLECTION[i];
      const col = i % 4;
      const row = Math.floor(i / 4);

      const cx = collectionXStart + col * colSpacing;
      const cy = collectionYStart + row * rowSpacing;

      const cardContainer = this.drawCardSlot(cx, cy, cardId, false);
      
      cardContainer.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        this.swapCard(cardId);
      });

      this.cardGroupObjects.push(cardContainer);
    }
  }

  private drawCardSlot(x: number, y: number, cardId: string, isSelected: boolean): Phaser.GameObjects.Container {
    const cardDef = CARD_TEMPLATES[cardId];
    
    // Draw background card shape
    const cardBg = this.add.graphics();
    const borderCol = isSelected ? 0xf1c40f : 0x3c3f50;
    const fillCol = 0x202430;
    
    cardBg.fillStyle(fillCol, 1);
    cardBg.fillRoundedRect(-36, -48, 72, 96, 8);
    cardBg.lineStyle(isSelected ? 3.5 : 2, borderCol, 1);
    cardBg.strokeRoundedRect(-36, -48, 72, 96, 8);

    // Illustrated card portrait image if available, else fallback icon text
    const imageKey = `card_${cardId}`;
    let artObj: Phaser.GameObjects.GameObject;
    
    if (this.textures.exists(imageKey)) {
      const img = this.add.image(0, -10, imageKey);
      img.setDisplaySize(66, 56);
      artObj = img;
    } else {
      artObj = this.add.text(0, -10, cardDef ? cardDef.icon : '🃏', { fontSize: '24px' }).setOrigin(0.5);
    }

    // Name tag
    const nameStr = cardDef ? cardDef.name : 'Unknown';
    const nameLabel = this.add.text(0, 32, nameStr, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '7.5px',
      fontStyle: 'bold',
      color: '#ffebcc'
    }).setOrigin(0.5);

    // Elixir cost Tag circle
    const costCircle = this.add.graphics();
    costCircle.fillStyle(0xd633ff, 1); // purple elixir badge
    costCircle.fillCircle(-26, -38, 9);
    costCircle.lineStyle(1, 0xffffff, 1);
    costCircle.strokeCircle(-26, -38, 9);

    const costVal = cardDef ? cardDef.cost.toString() : '0';
    const costText = this.add.text(-26, -38, costVal, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    const container = this.add.container(x, y, [cardBg, artObj, nameLabel, costCircle, costText]);
    container.setSize(72, 96);
    return container;
  }

  private swapCard(collectionCardId: string): void {
    if (this.selectedSlotIndex === -1) return;

    // Check if card is already in active deck (prevent duplicate cards)
    if (this.activeDeck.includes(collectionCardId)) return;

    this.activeDeck[this.selectedSlotIndex] = collectionCardId;
    this.selectedSlotIndex = -1; // Reset selection index

    localStorage.setItem('player_deck', JSON.stringify(this.activeDeck));
    this.renderGrids(this.scale.width, this.scale.height);
  }
}
export default DeckBuilderScene;
