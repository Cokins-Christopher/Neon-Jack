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
  shoeHacks: ShoeHack[];
  actionCards: ActionCard[];
  usedActionCardsThisHand: Set<string>;
  config: RunConfig; // Phase 2: Run configuration
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
  effect: (context: HandContext) => Promise<void> | void;
  used: boolean;
}

export interface ShoeHack {
  id: string;
  name: string;
  description: string;
  cost: number;
  effect: (shoe: Card[]) => Card[];
  purchased: boolean;
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
