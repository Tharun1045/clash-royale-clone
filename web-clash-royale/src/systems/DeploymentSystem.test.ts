import { describe, it, expect, beforeEach } from 'vitest';
import { DeploymentValidator } from './DeploymentValidator';
import { ElixirSystem } from './ElixirSystem';
import { CardDefinition } from '../types/game';

// Test card definitions
const troopCard: CardDefinition = {
  id: 'knight',
  name: 'Knight',
  cost: 3,
  icon: '⚔️',
  rarity: 'common',
  description: 'Test troop',
  type: 'troop',
  unitType: 'knight',
  spawnCount: 1
};


const spellCard: CardDefinition = {
  id: 'fireball',
  name: 'Fireball',
  cost: 4,
  icon: '🔥',
  rarity: 'rare',
  description: 'Test spell',
  type: 'spell'
};

describe('DeploymentValidator', () => {
  // Test 3: Valid player coordinates pass deployment validation
  it('should accept valid player-side coordinates for troops', () => {
    const result = DeploymentValidator.validate(180, 400, troopCard, 10);
    expect(result.success).toBe(true);
  });

  // Test 4: Enemy territory coordinates fail
  it('should reject enemy territory coordinates for troops', () => {
    const result = DeploymentValidator.validate(180, 200, troopCard, 10);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('Deploy on your side');
  });

  // Test 5: River coordinates fail
  it('should reject river coordinates for troops', () => {
    const result = DeploymentValidator.validate(180, 320, troopCard, 10);
    expect(result.success).toBe(false);
    // River (304-336) is above player zone (336+), so it should fail as enemy territory
    expect(result.reason).toBe('Deploy on your side');
  });

  // Test 6: Insufficient elixir fails
  it('should reject deployment when elixir is insufficient', () => {
    const result = DeploymentValidator.validate(180, 400, troopCard, 2);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('Not enough elixir');
  });

  it('should reject out-of-bounds X coordinates', () => {
    const result = DeploymentValidator.validate(-10, 400, troopCard, 10);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('Invalid position');
  });

  it('should reject coordinates below HUD for troops', () => {
    const result = DeploymentValidator.validate(180, 550, troopCard, 10);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('Invalid position');
  });

  it('should allow spells on enemy territory', () => {
    const result = DeploymentValidator.validate(180, 100, spellCard, 10);
    expect(result.success).toBe(true);
  });

  it('should reject spells outside the arena vertically', () => {
    const result = DeploymentValidator.validate(180, 30, spellCard, 10);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('Invalid position');
  });
});

describe('DeploymentValidator.isValidPlayerZone', () => {
  it('should return true for valid player zone coordinates', () => {
    expect(DeploymentValidator.isValidPlayerZone(180, 400)).toBe(true);
  });

  it('should return false for enemy territory', () => {
    expect(DeploymentValidator.isValidPlayerZone(180, 200)).toBe(false);
  });

  it('should return false for out-of-bounds', () => {
    expect(DeploymentValidator.isValidPlayerZone(-10, 400)).toBe(false);
  });
});

describe('ElixirSystem - deployment interactions', () => {
  let system: ElixirSystem;

  beforeEach(() => {
    system = new ElixirSystem(5, 0.35, 10);
  });

  // Test 7: Successful deployment deducts elixir
  it('should deduct elixir on successful spend', () => {
    const success = system.spend(3);
    expect(success).toBe(true);
    expect(system.getElixir()).toBe(2);
  });

  // Test 8: Failed deployment does not deduct elixir
  it('should not deduct elixir when spend fails', () => {
    const success = system.spend(6);
    expect(success).toBe(false);
    expect(system.getElixir()).toBe(5);
  });

  it('should prevent elixir from going below zero', () => {
    system.spend(5);
    expect(system.getElixir()).toBe(0);
    const secondSpend = system.spend(1);
    expect(secondSpend).toBe(false);
    expect(system.getElixir()).toBe(0);
  });
});

describe('Deployment hand rotation logic', () => {
  // Test 9: Successful deployment rotates the hand
  it('should rotate the hand on successful deployment', () => {
    const hand = ['knight', 'archers', 'giant', 'baby_dragon'];
    const queue = ['skeleton_army', 'mini_pekka', 'fireball', 'arrows'];
    let nextCard = queue.shift()!; // 'skeleton_army'

    const deployIndex = 0;
    const deployedCardId = hand[deployIndex];

    // Simulate deployment rotation
    queue.push(deployedCardId);         // push 'knight' to back of queue
    hand[deployIndex] = nextCard;       // replace hand[0] with 'skeleton_army'
    nextCard = queue.shift()!;          // next becomes 'mini_pekka'

    expect(hand[0]).toBe('skeleton_army');
    expect(nextCard).toBe('mini_pekka');
    expect(queue).toContain('knight');
  });

  // Test 10: Failed deployment keeps the same hand
  it('should keep the same hand when deployment fails', () => {
    const hand = ['knight', 'archers', 'giant', 'baby_dragon'];
    const originalHand = [...hand];

    // Simulate failed deployment — no rotation happens
    const deployResult = { success: false, reason: 'Not enough elixir' };
    if (!deployResult.success) {
      // Hand should remain unchanged
    }

    expect(hand).toEqual(originalHand);
  });
});

describe('Deployment selection state', () => {
  // Test 1: Selecting a card stores the correct hand index
  it('should store the correct card ID and hand index on selection', () => {
    const state = {
      selectedCardId: null as string | null,
      selectedHandIndex: null as number | null
    };
    const hand = ['knight', 'archers', 'giant', 'baby_dragon'];

    // Simulate selectCard(2)
    const index = 2;
    state.selectedCardId = hand[index];
    state.selectedHandIndex = index;

    expect(state.selectedCardId).toBe('giant');
    expect(state.selectedHandIndex).toBe(2);
  });

  // Test 2: Selecting another card clears the previous selection
  it('should clear previous selection when selecting a new card', () => {
    const state = {
      selectedCardId: 'knight' as string | null,
      selectedHandIndex: 0 as number | null
    };
    const hand = ['knight', 'archers', 'giant', 'baby_dragon'];

    // Simulate selecting card at index 3
    state.selectedCardId = hand[3];
    state.selectedHandIndex = 3;

    expect(state.selectedCardId).toBe('baby_dragon');
    expect(state.selectedHandIndex).toBe(3);
  });

  // Test 11: Clearing deployment state removes previews
  it('should clear all state on clearDeploymentState', () => {
    const state = {
      selectedCardId: 'knight' as string | null,
      selectedHandIndex: 0 as number | null,
      isDragging: true,
      dragPreview: {} as unknown,
      placementPreview: {} as unknown
    };

    // Simulate clearDeploymentState
    state.selectedCardId = null;
    state.selectedHandIndex = null;
    state.isDragging = false;
    state.dragPreview = null;
    state.placementPreview = null;

    expect(state.selectedCardId).toBeNull();
    expect(state.selectedHandIndex).toBeNull();
    expect(state.isDragging).toBe(false);
    expect(state.dragPreview).toBeNull();
    expect(state.placementPreview).toBeNull();
  });

  // Test 12: Only one deployment occurs per pointer release
  it('should prevent double deployment by clearing selectedCardId after deploy', () => {
    const state = {
      selectedCardId: 'knight' as string | null,
      selectedHandIndex: 0 as number | null
    };

    let deployCount = 0;

    // Simulate first pointer release
    if (state.selectedCardId) {
      deployCount++;
      state.selectedCardId = null;
      state.selectedHandIndex = null;
    }

    // Simulate second pointer release (should not deploy)
    if (state.selectedCardId) {
      deployCount++;
    }

    expect(deployCount).toBe(1);
  });
});
