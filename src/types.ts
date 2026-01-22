export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string;
  isGlitch?: boolean; // Special card that can count as any value 1-11
}

export interface Hand {
  cards: Card[];
  isSplit: boolean;
  isAceSplit: boolean;
}

export type GameState = 
  | 'MENU'
  | 'WAVE_INTRO'
  | 'EMERGENCY_CHIPS'
  | 'BETTING'
  | 'HAND'
  | 'HAND_RESOLUTION'
  | 'SHOP'
  | 'GAME_OVER'
  | 'VICTORY';

export interface GameRun {
  wave: number;
  chips: number;
  lives: number;
  score: number;
  currentBet: number;
  shoe: Card[];
  shoeHacks: ShoeHack[]; // Legacy - kept for backward compatibility
  actionCards: ActionCard[]; // Legacy - kept for backward compatibility
  usedActionCardsThisHand: Set<string>;
  config: RunConfig; // Phase 2: Run configuration
  // Roguelike Shop System
  seed: number; // Seeded RNG for deterministic shop generation
  shopIndex: number; // Increments each shop visit
  shop: ShopState; // Current shop inventory
  ownedShoeHacks: Record<string, { stacks: number }>; // Owned hacks with stack count
  actionDeck: string[]; // Action cards owned (duplicates allowed)
  actionHand: string[]; // Cards drawn for current hand
  actionDiscard: string[]; // Discard pile
  actionDrawCount: number; // Cards drawn per hand (default 3)
  actionCardsUsedThisHand: number; // Count of action cards used this hand (max 2)
}

// Phase 2: Ability hook system (additive, non-breaking)
export type AbilityHook = 
  | 'beforeDeal'
  | 'afterDeal'
  | 'onPlayerAction'
  | 'onDealerAction'
  | 'onResolve';

export interface DealerAbility {
  id: string;
  name: string;
  description: string;
  effect: (context: HandContext) => void; // Legacy support
  hook?: AbilityHook; // Phase 2: Hook timing
  hookEffect?: (context: HandContext) => void; // Phase 2: Hook-based effect
}

export interface Dealer {
  id: string;
  name: string;
  description: string;
  abilities: DealerAbility[];
  isBoss: boolean;
  portrait?: string;
}

export interface HandContext {
  playerHands: Hand[];
  dealerHand: Hand;
  shoe: Card[];
  dealerAbilities: DealerAbility[];
  actionCards: ActionCard[];
  usedActionCards: Set<string>;
  bet: number;
}

export interface ActionCard {
  id: string;
  name: string;
  description: string;
  timing: 'before_deal' | 'after_deal' | 'during_decision' | 'after_reveal';
  cost: number; // 0 = once per hand, >0 = chip cost
  baseCost: number; // Shop cost
  rarity: Rarity;
  energyCost?: number; // Energy cost to play (default 1)
  effect: (context: HandContext) => Promise<void> | void;
  used?: boolean; // Legacy support
}

// Roguelike Shop System: Rarity and Shop Items
export type Rarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'BOSS';

export type ShopItem =
  | { kind: 'SHOE_HACK'; id: string; cost: number; rarity: Rarity }
  | { kind: 'ACTION_CARD'; id: string; cost: number; rarity: Rarity }
  | { kind: 'REROLL_SHOP'; cost: number }
  | { kind: 'REMOVE_ACTION_CARD'; cost: number };

export interface ShopState {
  items: ShopItem[];
  rerollsUsed: number;
}

export interface ShoeHack {
  id: string;
  name: string;
  description: string | ((stacks: number) => string);
  baseCost: number;
  rarity: Rarity;
  maxStacks: number;
  effect: (shoe: Card[], stacks: number) => Card[];
  purchased?: boolean; // Legacy support
}

export type HandResult = 'win' | 'loss' | 'push' | 'blackjack_win';

// Phase 2: Run Configuration
export type RunMode = 'STAGE' | 'SURVIVAL';

export interface RunConfig {
  mode: RunMode;
  startingLives: number;
  emergencyChipValue: number;
  bossFrequency: number; // Boss every N waves (Stage Mode only)
  difficultyMultiplier: number; // For ascension scaling
  ascensionLevel: number; // 0 = base difficulty
}
