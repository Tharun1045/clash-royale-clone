/* TypeScript Type Definitions for Royal Arenas (Phaser) */

export type RarityType = 'common' | 'rare' | 'epic';
export type CardType = 'troop' | 'spell';
export type TeamType = 'blue' | 'red';
export type UnitTargetPreference = 'any' | 'towers';

export interface Position {
  x: number;
  y: number;
}

export interface CardDefinition {
  id: string;
  name: string;
  cost: number;
  icon: string;
  rarity: RarityType;
  description: string;
  type: CardType;
}

export interface UnitDefinition {
  name: string;
  hp: number;
  speed: number;
  range: number;
  damage: number;
  hitSpeed: number;
  targets: UnitTargetPreference;
  isAir: boolean;
  isSplash?: boolean;
  splashRadius?: number;
  radius: number;
  color: string;
  icon: string;
}

export interface TowerDefinition {
  hp: number;
  range: number;
  damage: number;
  hitSpeed: number;
  radius: number;
}

export interface SpellDefinition {
  name: string;
  damage: number;
  towerDamage: number;
  radius: number;
  travelTime: number;
  color: string;
  particleColor: string;
  icon: string;
}

export interface DeckState {
  cards: string[];
  hand: string[];
  nextCard: string;
}

export interface DamageEvent {
  targetId: string;
  damage: number;
  isCritical: boolean;
  position: { x: number; y: number };
}

export interface PlayerState {
  name: string;
  team: TeamType;
  elixir: number;
  maxElixir: number;
  deckState: DeckState;
  crowns: number;
}

export interface MatchState {
  timeRemaining: number;
  isSuddenDeath: boolean;
  isGameOver: boolean;
  winner: TeamType | 'draw' | null;
}
