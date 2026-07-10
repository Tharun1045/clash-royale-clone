/* Elixir System Tick Accumulator (TypeScript) */

export class ElixirSystem {
  private elixir: number;
  private maxElixir: number;
  private regenRatePerSecond: number;
  private multiplier: number;

  constructor(initialElixir = 4, regenRate = 0.35, maxElixir = 10) {
    this.elixir = initialElixir;
    this.maxElixir = maxElixir;
    this.regenRatePerSecond = regenRate;
    this.multiplier = 1.0;
  }

  update(dtSeconds: number): void {
    const regen = this.regenRatePerSecond * this.multiplier * dtSeconds;
    this.elixir = Math.min(this.maxElixir, this.elixir + regen);
  }

  getElixir(): number {
    return this.elixir;
  }

  canSpend(cost: number): boolean {
    return this.elixir >= cost;
  }

  spend(cost: number): boolean {
    if (this.canSpend(cost)) {
      this.elixir -= cost;
      return true;
    }
    return false;
  }

  setMultiplier(mult: number): void {
    this.multiplier = mult;
  }

  getMultiplier(): number {
    return this.multiplier;
  }

  reset(initialElixir = 4): void {
    this.elixir = initialElixir;
    this.multiplier = 1.0;
  }
}
