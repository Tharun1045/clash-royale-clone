/* Opponent AI Bot Card Deployment Logic (TypeScript) */

import { CARD_TEMPLATES } from '../config/gameConfig';

export class AISystem {
  private elixir: number;
  private maxElixir: number;
  private regenRatePerSecond: number;
  private deck: string[];
  private decisionFrequencyMs: number;
  private lastDecisionTimeMs: number;

  constructor(deck: string[], regenRate = 0.32, decisionFreq = 3000) {
    this.elixir = 4;
    this.maxElixir = 10;
    this.regenRatePerSecond = regenRate;
    this.deck = [...deck];
    this.decisionFrequencyMs = decisionFreq;
    this.lastDecisionTimeMs = 0;
  }

  update(dtSeconds: number, currentTimeMs: number, onDeploy: (cardId: string, x: number, y: number) => void): void {
    // Regenerate bot elixir
    this.elixir = Math.min(this.maxElixir, this.elixir + this.regenRatePerSecond * dtSeconds);

    // Run decision on cooldown checks
    if (currentTimeMs - this.lastDecisionTimeMs >= this.decisionFrequencyMs) {
      this.lastDecisionTimeMs = currentTimeMs;
      this.makeDecision(onDeploy);
    }
  }

  private makeDecision(onDeploy: (cardId: string, x: number, y: number) => void): void {
    if (this.deck.length === 0) return;

    // Pick a card randomly
    const cardId = this.deck[Math.floor(Math.random() * this.deck.length)];
    const card = CARD_TEMPLATES[cardId];
    
    if (card && this.elixir >= card.cost) {
      this.elixir -= card.cost;
      
      // Deploy randomly on Red side (Y coordinates between 50 and 220)
      const rx = 60 + Math.random() * 240;
      const ry = 60 + Math.random() * 160;
      
      onDeploy(cardId, rx, ry);
    }
  }

  getElixir(): number {
    return this.elixir;
  }

  setRegenMultiplier(mult: number): void {
    this.regenRatePerSecond = 0.32 * mult;
  }

  reset(): void {
    this.elixir = 4;
    this.lastDecisionTimeMs = 0;
  }
}
