import { describe, it, expect, beforeEach } from 'vitest';
import { ElixirSystem } from './ElixirSystem';

describe('ElixirSystem', () => {
  let system: ElixirSystem;

  beforeEach(() => {
    system = new ElixirSystem(4, 0.35, 10);
  });

  it('should initialize with correct values', () => {
    expect(system.getElixir()).toBe(4);
    expect(system.getMultiplier()).toBe(1.0);
  });

  it('should accumulate elixir over time', () => {
    // 2 seconds at 0.35 elixir/sec should add 0.7 elixir
    system.update(2.0);
    expect(system.getElixir()).toBeCloseTo(4.7);
  });

  it('should cap elixir at max limit', () => {
    // Large time delta to ensure capping
    system.update(30.0);
    expect(system.getElixir()).toBe(10);
  });

  it('should spend elixir correctly', () => {
    const success = system.spend(3);
    expect(success).toBe(true);
    expect(system.getElixir()).toBe(1);
  });

  it('should not spend if insufficient elixir', () => {
    const success = system.spend(5);
    expect(success).toBe(false);
    expect(system.getElixir()).toBe(4);
  });

  it('should apply multiplier during update ticks', () => {
    system.setMultiplier(2.0);
    // 2 seconds at 0.35 * 2.0 = 1.4 added
    system.update(2.0);
    expect(system.getElixir()).toBeCloseTo(5.4);
  });
});
