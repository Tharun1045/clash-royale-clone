/* Deployment Validation Logic (TypeScript) */

import { CardDefinition, DeploymentResult } from '../types/game';

/** Arena layout constants matching BattleScene and Pathfinding */
export const ARENA = {
  WIDTH: 360,
  HEIGHT: 640,
  /** Top of header bar */
  TOP_MARGIN: 52,
  /** River top edge Y */
  RIVER_TOP: 304,
  /** River bottom edge Y */
  RIVER_BOTTOM: 336,
  /** Top of HUD panel at bottom */
  HUD_TOP: 520,   // height - 120
  /** Player deployment zone: below river, above HUD */
  PLAYER_ZONE_TOP: 336,
  PLAYER_ZONE_BOTTOM: 520,
  /** Left arena edge */
  LEFT: 10,
  /** Right arena edge */
  RIGHT: 350
} as const;

export class DeploymentValidator {
  /**
   * Validates whether a deployment at the given world coordinates is allowed.
   */
  static validate(
    worldX: number,
    worldY: number,
    cardDef: CardDefinition,
    currentElixir: number
  ): DeploymentResult {
    // 1. Elixir check
    if (currentElixir < cardDef.cost) {
      return { success: false, reason: 'Not enough elixir' };
    }

    // 2. Arena bounds check
    if (worldX < ARENA.LEFT || worldX > ARENA.RIGHT) {
      return { success: false, reason: 'Invalid position' };
    }

    // Spells can target anywhere on the arena (including enemy side)
    if (cardDef.type === 'spell') {
      if (worldY < ARENA.TOP_MARGIN || worldY > ARENA.HUD_TOP) {
        return { success: false, reason: 'Invalid position' };
      }
      return { success: true };
    }

    // 3. Troops: must deploy on player side (below river, above HUD)
    if (worldY < ARENA.PLAYER_ZONE_TOP) {
      return { success: false, reason: 'Deploy on your side' };
    }
    if (worldY > ARENA.PLAYER_ZONE_BOTTOM) {
      return { success: false, reason: 'Invalid position' };
    }

    // 4. River rejection (should not happen for player side, but safety check)
    if (worldY >= ARENA.RIVER_TOP && worldY <= ARENA.RIVER_BOTTOM) {
      return { success: false, reason: 'Invalid position' };
    }

    return { success: true };
  }

  /**
   * Returns true if the given world coordinates are inside the valid player deployment zone.
   * Used for preview coloring (green vs red).
   */
  static isValidPlayerZone(worldX: number, worldY: number): boolean {
    return (
      worldX >= ARENA.LEFT &&
      worldX <= ARENA.RIGHT &&
      worldY > ARENA.PLAYER_ZONE_TOP &&
      worldY < ARENA.PLAYER_ZONE_BOTTOM
    );
  }
}
