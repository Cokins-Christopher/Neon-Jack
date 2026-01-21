import { ActionCard, HandContext } from '../types';
import { drawCard, shuffleDeck } from './shoe';

export const ACTION_CARDS: ActionCard[] = [
  {
    id: 'PEEK_HOLE_CARD',
    name: 'Peek',
    description: 'Reveal dealer hole card this hand',
    timing: 'after_deal',
    cost: 0,
    effect: () => {}, // Handled in UI/state
    used: false,
  },
  {
    id: 'REDEAL_HAND',
    name: 'Redeal',
    description: 'Discard your hand and draw a new two-card hand',
    timing: 'after_deal',
    cost: 0,
    effect: async (context) => {
      // Handled in state - replace player hand
    },
    used: false,
  },
  {
    id: 'SWAP_WITH_DEALER',
    name: 'Swap',
    description: 'Swap one of your cards with dealer upcard',
    timing: 'during_decision',
    cost: 0,
    effect: () => {}, // Handled in UI/state
    used: false,
  },
  {
    id: 'LOCK_CARD_VALUE',
    name: 'Lock',
    description: 'Lock one card value (prevents ace value changes)',
    timing: 'during_decision',
    cost: 0,
    effect: () => {}, // Handled in UI/state
    used: false,
  },
  {
    id: 'GLITCH_HIT',
    name: 'Glitch Hit',
    description: 'Next hit draws two cards; choose one to keep',
    timing: 'during_decision',
    cost: 0,
    effect: () => {}, // Handled in state
    used: false,
  },
  {
    id: 'FIREWALL',
    name: 'Firewall',
    description: 'Prevent bust once this hand (set total to 21 if you would bust)',
    timing: 'during_decision',
    cost: 0,
    effect: () => {}, // Handled in state
    used: false,
  },
  {
    id: 'OVERCLOCK',
    name: 'Overclock',
    description: 'Take one extra action beyond limits',
    timing: 'during_decision',
    cost: 0,
    effect: () => {}, // Handled in state
    used: false,
  },
  {
    id: 'SCRAMBLE',
    name: 'Scramble',
    description: 'Shuffle remaining shoe',
    timing: 'during_decision',
    cost: 0,
    effect: (context) => {
      context.shoe = shuffleDeck(context.shoe);
    },
    used: false,
  },
  {
    id: 'PATCH',
    name: 'Patch',
    description: 'Remove one negative dealer modifier for this hand only',
    timing: 'before_deal',
    cost: 0,
    effect: () => {}, // Handled in state
    used: false,
  },
  {
    id: 'DOUBLE_VISION',
    name: 'Double Vision',
    description: 'See the next card in the shoe for 10 seconds',
    timing: 'during_decision',
    cost: 0,
    effect: () => {}, // Handled in UI/state
    used: false,
  },
];

export function getActionCard(id: string): ActionCard | undefined {
  return ACTION_CARDS.find(card => card.id === id);
}
