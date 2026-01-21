import { ShoeHack, Card } from '../types';
import { createStandardDeck } from './shoe';

export const SHOE_HACKS: ShoeHack[] = [
  {
    id: 'ADD_2_ACES',
    name: 'Ace Injection',
    description: 'Add 2 extra aces to the shoe',
    cost: 50,
    effect: (shoe: Card[]) => {
      const newShoe = [...shoe];
      const suits: Array<'hearts' | 'diamonds' | 'clubs' | 'spades'> = ['hearts', 'diamonds', 'clubs', 'spades'];
      for (let i = 0; i < 2; i++) {
        newShoe.push({
          suit: suits[i % 4],
          rank: 'A',
          id: `hack-ace-${i}-${Math.random().toString(36).substr(2, 9)}`,
        });
      }
      return newShoe;
    },
    purchased: false,
  },
  {
    id: 'REMOVE_4_LOW',
    name: 'Low Card Removal',
    description: 'Remove 4 low cards (2s and 3s) from shoe',
    cost: 40,
    effect: (shoe: Card[]) => {
      const newShoe = [...shoe];
      let removed = 0;
      for (let i = newShoe.length - 1; i >= 0 && removed < 4; i--) {
        if (newShoe[i].rank === '2' || newShoe[i].rank === '3') {
          newShoe.splice(i, 1);
          removed++;
        }
      }
      return newShoe;
    },
    purchased: false,
  },
  {
    id: 'ADD_GLITCH_CARD',
    name: 'Glitch Card',
    description: 'Add a special Glitch card (counts as any value 1-11)',
    cost: 75,
    effect: (shoe: Card[]) => {
      const newShoe = [...shoe];
      newShoe.push({
        suit: 'spades',
        rank: 'A', // Displayed as A but functions as glitch
        id: `glitch-${Math.random().toString(36).substr(2, 9)}`,
        isGlitch: true,
      });
      return newShoe;
    },
    purchased: false,
  },
  {
    id: 'BIAS_TENS_UP',
    name: 'Ten Bias',
    description: 'Increase probability of drawing 10/J/Q/K',
    cost: 60,
    effect: (shoe: Card[]) => {
      const newShoe = [...shoe];
      const suits: Array<'hearts' | 'diamonds' | 'clubs' | 'spades'> = ['hearts', 'diamonds', 'clubs', 'spades'];
      const tens: Array<'10' | 'J' | 'Q' | 'K'> = ['10', 'J', 'Q', 'K'];
      for (let i = 0; i < 4; i++) {
        newShoe.push({
          suit: suits[i % 4],
          rank: tens[i % 4],
          id: `hack-ten-${i}-${Math.random().toString(36).substr(2, 9)}`,
        });
      }
      return newShoe;
    },
    purchased: false,
  },
  {
    id: 'REMOVE_4_TENS',
    name: 'Ten Removal',
    description: 'Remove 4 tens from shoe (hard mode, grants strategy advantage)',
    cost: 30,
    effect: (shoe: Card[]) => {
      const newShoe = [...shoe];
      let removed = 0;
      for (let i = newShoe.length - 1; i >= 0 && removed < 4; i--) {
        if (['10', 'J', 'Q', 'K'].includes(newShoe[i].rank)) {
          newShoe.splice(i, 1);
          removed++;
        }
      }
      return newShoe;
    },
    purchased: false,
  },
];

export function getShoeHack(id: string): ShoeHack | undefined {
  return SHOE_HACKS.find(hack => hack.id === id);
}
