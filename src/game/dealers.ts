import { Dealer, DealerAbility, HandContext } from '../types';
import { burnCard } from './shoe';

export const DEALER_ABILITIES: Record<string, DealerAbility> = {
  DEALER_WINS_ON_22: {
    id: 'DEALER_WINS_ON_22',
    name: 'House Edge',
    description: 'Dealer wins on 22 instead of busting',
    effect: () => {}, // Handled in resolution logic
  },
  HIDE_PLAYER_TOTAL: {
    id: 'HIDE_PLAYER_TOTAL',
    name: 'Data Scramble',
    description: 'Your hand total is hidden (cards still visible)',
    effect: () => {}, // Handled in UI
  },
  HIDE_DEALER_UPCARD: {
    id: 'HIDE_DEALER_UPCARD',
    name: 'Encrypted Upcard',
    description: 'Dealer upcard is hidden until reveal',
    effect: () => {}, // Handled in UI
  },
  FORCED_HIT_UNDER_12: {
    id: 'FORCED_HIT_UNDER_12',
    name: 'Compulsion Protocol',
    description: 'You must hit if your total is under 12',
    effect: () => {}, // Handled in UI/state
  },
  ONE_LESS_ACTION: {
    id: 'ONE_LESS_ACTION',
    name: 'Action Limit',
    description: 'You can only hit twice per hand',
    effect: () => {}, // Handled in state
  },
  BURN_TOP_CARD_ON_HIT: {
    id: 'BURN_TOP_CARD_ON_HIT',
    name: 'Card Burn',
    description: 'Each hit burns the top card before drawing',
    effect: (context) => {
      burnCard(context.shoe);
    },
  },
  // Phase 2: New abilities for bosses
  HIDE_ALL_PLAYER_CARDS: {
    id: 'HIDE_ALL_PLAYER_CARDS',
    name: 'Total Blackout',
    description: 'All your cards are hidden (only count visible)',
    effect: () => {}, // Handled in UI
    hook: 'afterDeal',
  },
  BLACKJACK_PAYS_1_TO_1: {
    id: 'BLACKJACK_PAYS_1_TO_1',
    name: 'Reduced Payout',
    description: 'Blackjack pays 1:1 instead of 3:2',
    effect: () => {}, // Handled in payout logic
    hook: 'onResolve',
  },
  DEALER_DRAWS_3_CHOOSES_BEST: {
    id: 'DEALER_DRAWS_3_CHOOSES_BEST',
    name: 'Optimal Draw',
    description: 'Dealer draws 3 cards and chooses the best hand',
    effect: () => {}, // Handled in dealer resolution
    hook: 'onDealerAction',
  },
  DOUBLE_MIN_BET: {
    id: 'DOUBLE_MIN_BET',
    name: 'High Stakes',
    description: 'Minimum bet is doubled',
    effect: () => {}, // Handled in betting logic
  },
  NO_SPLIT: {
    id: 'NO_SPLIT',
    name: 'No Splits',
    description: 'You cannot split pairs',
    effect: () => {}, // Handled in UI/state
  },
  DEALER_STANDS_ON_16: {
    id: 'DEALER_STANDS_ON_16',
    name: 'Early Stand',
    description: 'Dealer stands on 16 instead of 17',
    effect: () => {}, // Handled in dealer logic
    hook: 'onDealerAction',
  },
  PLAYER_STARTS_WITH_ONE_CARD: {
    id: 'PLAYER_STARTS_WITH_ONE_CARD',
    name: 'Handicap',
    description: 'You start with only one card',
    effect: () => {}, // Handled in deal logic
    hook: 'beforeDeal',
  },
};

export const DEALERS: Dealer[] = [
  {
    id: 'dealer_1',
    name: 'Chip',
    description: 'A basic dealer with minimal interference',
    abilities: [],
    isBoss: false,
  },
  {
    id: 'dealer_2',
    name: 'Glitch',
    description: 'Hides information to confuse players',
    abilities: [DEALER_ABILITIES.HIDE_PLAYER_TOTAL],
    isBoss: false,
  },
  {
    id: 'dealer_3',
    name: 'Burn',
    description: 'Burns cards on every hit',
    abilities: [DEALER_ABILITIES.BURN_TOP_CARD_ON_HIT],
    isBoss: false,
  },
  {
    id: 'dealer_4',
    name: 'Compulse',
    description: 'Forces aggressive play',
    abilities: [
      DEALER_ABILITIES.FORCED_HIT_UNDER_12,
      DEALER_ABILITIES.HIDE_DEALER_UPCARD,
    ],
    isBoss: false,
  },
  {
    id: 'dealer_5',
    name: 'Limit',
    description: 'Restricts your actions',
    abilities: [
      DEALER_ABILITIES.ONE_LESS_ACTION,
      DEALER_ABILITIES.HIDE_PLAYER_TOTAL,
    ],
    isBoss: false,
  },
  {
    id: 'boss_1',
    name: 'THE HOUSE',
    description: 'The ultimate dealer with unfair advantages',
    abilities: [
      DEALER_ABILITIES.DEALER_WINS_ON_22,
      DEALER_ABILITIES.HIDE_DEALER_UPCARD,
      DEALER_ABILITIES.ONE_LESS_ACTION,
    ],
    isBoss: true,
  },
  // Phase 2: Additional bosses
  {
    id: 'boss_2',
    name: 'THE VOID',
    description: 'A dealer that hides everything from you',
    abilities: [
      DEALER_ABILITIES.HIDE_ALL_PLAYER_CARDS, // Hides cards but shows total
      DEALER_ABILITIES.HIDE_DEALER_UPCARD,
      DEALER_ABILITIES.BLACKJACK_PAYS_1_TO_1,
      // Removed HIDE_PLAYER_TOTAL - conflicts with HIDE_ALL_PLAYER_CARDS
      // Player must be able to see either cards OR total, never both hidden
    ],
    isBoss: true,
  },
  {
    id: 'boss_3',
    name: 'THE OPTIMIZER',
    description: 'Uses perfect strategy against you',
    abilities: [
      DEALER_ABILITIES.DEALER_DRAWS_3_CHOOSES_BEST,
      DEALER_ABILITIES.DEALER_STANDS_ON_16,
      DEALER_ABILITIES.DOUBLE_MIN_BET,
    ],
    isBoss: true,
  },
  {
    id: 'boss_4',
    name: 'THE HANDICAPPER',
    description: 'Stacks the deck against you from the start',
    abilities: [
      DEALER_ABILITIES.PLAYER_STARTS_WITH_ONE_CARD,
      DEALER_ABILITIES.NO_SPLIT,
      DEALER_ABILITIES.FORCED_HIT_UNDER_12,
      DEALER_ABILITIES.ONE_LESS_ACTION,
    ],
    isBoss: true,
  },
  {
    id: 'boss_5',
    name: 'THE COLLECTOR',
    description: 'Takes everything and gives nothing back',
    abilities: [
      DEALER_ABILITIES.BLACKJACK_PAYS_1_TO_1,
      DEALER_ABILITIES.DOUBLE_MIN_BET,
      DEALER_ABILITIES.BURN_TOP_CARD_ON_HIT,
      DEALER_ABILITIES.DEALER_WINS_ON_22,
    ],
    isBoss: true,
  },
];

// Phase 2: Extended dealer selection
export function getDealerForWave(wave: number, mode: 'STAGE' | 'SURVIVAL' = 'STAGE', ascensionLevel: number = 0): Dealer {
  const allBosses = DEALERS.filter(d => d.isBoss);
  const regularDealers = DEALERS.filter(d => !d.isBoss);
  
  if (mode === 'STAGE') {
    // Stage Mode: boss every 5 waves
    if (wave % 5 === 0) {
      const bossIndex = Math.floor((wave / 5) - 1) % allBosses.length;
      return allBosses[bossIndex] || allBosses[0];
    }
    // Regular dealers for non-boss waves
    const dealerIndex = (wave - 1) % regularDealers.length;
    return regularDealers[dealerIndex] || regularDealers[0];
  } else {
    // Survival Mode: bosses every 10 waves, difficulty scales
    if (wave % 10 === 0) {
      const bossIndex = Math.floor((wave / 10) - 1) % allBosses.length;
      return allBosses[bossIndex] || allBosses[0];
    }
    // Regular dealers with scaling difficulty
    const dealerIndex = (wave - 1) % regularDealers.length;
    const baseDealer = regularDealers[dealerIndex] || regularDealers[0];
    
    // Phase 2: Scale abilities based on wave and ascension
    if (wave > 10 || ascensionLevel > 0) {
      return scaleDealerDifficulty(baseDealer, wave, ascensionLevel);
    }
    
    return baseDealer;
  }
}

// Phase 2: Scale dealer difficulty for Survival Mode and ascensions
function scaleDealerDifficulty(dealer: Dealer, wave: number, ascensionLevel: number): Dealer {
  // Add extra abilities based on wave progression
  const extraAbilities: DealerAbility[] = [];
  const waveTier = Math.floor(wave / 5);
  const ascensionBonus = ascensionLevel;
  
  // Add abilities based on difficulty
  if (waveTier + ascensionBonus >= 1) {
    extraAbilities.push(DEALER_ABILITIES.HIDE_PLAYER_TOTAL);
  }
  if (waveTier + ascensionBonus >= 2) {
    extraAbilities.push(DEALER_ABILITIES.ONE_LESS_ACTION);
  }
  if (waveTier + ascensionBonus >= 3) {
    extraAbilities.push(DEALER_ABILITIES.BURN_TOP_CARD_ON_HIT);
  }
  
  // Don't duplicate abilities
  const existingIds = new Set(dealer.abilities.map(a => a.id));
  const newAbilities = extraAbilities.filter(a => !existingIds.has(a.id));
  
  return {
    ...dealer,
    abilities: [...dealer.abilities, ...newAbilities],
  };
}
