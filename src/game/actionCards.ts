import { ActionCard, HandContext, Rarity } from '../types';
import { drawCard, shuffleDeck } from './shoe';

export const ACTION_CARDS: ActionCard[] = [
  {
    id: 'PEEK_HOLE_CARD',
    name: 'Peek',
    description: 'Reveal dealer hole card this hand',
    timing: 'after_deal',
    cost: 0,
    baseCost: 40,
    rarity: 'COMMON',
    energyCost: 1,
    effect: () => {}, // Handled in UI/state
  },
  {
    id: 'REDEAL_HAND',
    name: 'Redeal',
    description: 'Discard your hand and draw a new two-card hand',
    timing: 'after_deal',
    cost: 0,
    baseCost: 60,
    rarity: 'COMMON',
    energyCost: 1,
    effect: async (context) => {
      // Handled in state - replace player hand
    },
  },
  {
    id: 'SWAP_WITH_DEALER',
    name: 'Swap',
    description: 'Swap one of your cards with dealer upcard',
    timing: 'during_decision',
    cost: 0,
    baseCost: 50,
    rarity: 'COMMON',
    energyCost: 1,
    effect: () => {}, // Handled in UI/state
  },
  {
    id: 'LOCK_CARD_VALUE',
    name: 'Lock',
    description: 'Lock one card value (prevents ace value changes)',
    timing: 'during_decision',
    cost: 0,
    baseCost: 45,
    rarity: 'COMMON',
    energyCost: 1,
    effect: () => {}, // Handled in UI/state
  },
  {
    id: 'GLITCH_HIT',
    name: 'Glitch Hit',
    description: 'Next hit draws two cards; choose one to keep',
    timing: 'during_decision',
    cost: 0,
    baseCost: 70,
    rarity: 'UNCOMMON',
    energyCost: 1,
    effect: () => {}, // Handled in state
  },
  {
    id: 'FIREWALL',
    name: 'Firewall',
    description: 'Prevent bust once this hand (set total to 21 if you would bust)',
    timing: 'during_decision',
    cost: 0,
    baseCost: 100,
    rarity: 'UNCOMMON',
    energyCost: 2,
    effect: () => {}, // Handled in state
  },
  {
    id: 'OVERCLOCK',
    name: 'Overclock',
    description: 'Take one extra action beyond limits',
    timing: 'during_decision',
    cost: 0,
    baseCost: 80,
    rarity: 'UNCOMMON',
    energyCost: 1,
    effect: () => {}, // Handled in state
  },
  {
    id: 'SCRAMBLE',
    name: 'Scramble',
    description: 'Shuffle remaining shoe',
    timing: 'during_decision',
    cost: 0,
    baseCost: 55,
    rarity: 'COMMON',
    energyCost: 1,
    effect: (context) => {
      context.shoe = shuffleDeck(context.shoe);
    },
  },
  {
    id: 'PATCH',
    name: 'Patch',
    description: 'Remove one negative dealer modifier for this hand only',
    timing: 'before_deal',
    cost: 0,
    baseCost: 90,
    rarity: 'UNCOMMON',
    energyCost: 1,
    effect: () => {}, // Handled in state
  },
  {
    id: 'DOUBLE_VISION',
    name: 'Double Vision',
    description: 'See the next card in the shoe for 10 seconds',
    timing: 'during_decision',
    cost: 0,
    baseCost: 65,
    rarity: 'COMMON',
    energyCost: 1,
    effect: () => {}, // Handled in UI/state
  },
  // Additional action cards for variety
  {
    id: 'EXTRA_HIT',
    name: 'Extra Hit',
    description: 'Take an additional hit without using action limit',
    timing: 'during_decision',
    cost: 0,
    baseCost: 75,
    rarity: 'COMMON',
    energyCost: 1,
    effect: () => {}, // Handled in state
  },
  {
    id: 'INSURANCE',
    name: 'Insurance',
    description: 'If dealer has blackjack, get your bet back',
    timing: 'after_deal',
    cost: 0,
    baseCost: 85,
    rarity: 'UNCOMMON',
    energyCost: 1,
    effect: () => {}, // Handled in state
  },
  {
    id: 'DOUBLE_DOWN',
    name: 'Double Down',
    description: 'Double your bet and take exactly one more card',
    timing: 'during_decision',
    cost: 0,
    baseCost: 95,
    rarity: 'UNCOMMON',
    energyCost: 2,
    effect: () => {}, // Handled in state
  },
  {
    id: 'TIME_STOP',
    name: 'Time Stop',
    description: 'Freeze dealer actions for one turn',
    timing: 'during_decision',
    cost: 0,
    baseCost: 120,
    rarity: 'RARE',
    energyCost: 2,
    effect: () => {}, // Handled in state
  },
  {
    id: 'PERFECT_DRAW',
    name: 'Perfect Draw',
    description: 'Draw the best possible card for your hand',
    timing: 'during_decision',
    cost: 0,
    baseCost: 150,
    rarity: 'RARE',
    energyCost: 2,
    effect: () => {}, // Handled in state
  },
  {
    id: 'REWIND',
    name: 'Rewind',
    description: 'Undo your last action',
    timing: 'during_decision',
    cost: 0,
    baseCost: 110,
    rarity: 'RARE',
    energyCost: 1,
    effect: () => {}, // Handled in state
  },
];

export function getActionCard(id: string): ActionCard | undefined {
  return ACTION_CARDS.find(card => card.id === id);
}
