import { ShoeHack, Card, Rarity } from '../types';
import { createStandardDeck } from './shoe';

// Roguelike Shop System: Updated ShoeHacks with stacking support
export const SHOE_HACKS: ShoeHack[] = [
  // COMMON HACKS
  {
    id: 'ADD_2_ACES',
    name: 'Ace Injection',
    description: (stacks: number) => `Add ${2 * stacks} extra aces to the shoe`,
    baseCost: 50,
    rarity: 'COMMON',
    maxStacks: 3,
    effect: (shoe: Card[], stacks: number) => {
      const newShoe = [...shoe];
      const suits: Array<'hearts' | 'diamonds' | 'clubs' | 'spades'> = ['hearts', 'diamonds', 'clubs', 'spades'];
      for (let i = 0; i < 2 * stacks; i++) {
        newShoe.push({
          suit: suits[i % 4],
          rank: 'A',
          id: `hack-ace-${i}-${Math.random().toString(36).substr(2, 9)}`,
        });
      }
      return newShoe;
    },
  },
  {
    id: 'REMOVE_4_LOW',
    name: 'Low Card Removal',
    description: (stacks: number) => `Remove ${4 * stacks} low cards (2s and 3s) from shoe`,
    baseCost: 40,
    rarity: 'COMMON',
    maxStacks: 3,
    effect: (shoe: Card[], stacks: number) => {
      const newShoe = [...shoe].filter(c => c != null); // Filter out any undefined/null entries
      let removed = 0;
      const target = 4 * stacks;
      for (let i = newShoe.length - 1; i >= 0 && removed < target; i--) {
        if (newShoe[i] && (newShoe[i].rank === '2' || newShoe[i].rank === '3')) {
          newShoe.splice(i, 1);
          removed++;
        }
      }
      return newShoe;
    },
  },
  {
    id: 'BIAS_TENS_UP',
    name: 'Ten Bias',
    description: (stacks: number) => `Add ${4 * stacks} extra 10/J/Q/K cards`,
    baseCost: 60,
    rarity: 'COMMON',
    maxStacks: 3,
    effect: (shoe: Card[], stacks: number) => {
      const newShoe = [...shoe];
      const suits: Array<'hearts' | 'diamonds' | 'clubs' | 'spades'> = ['hearts', 'diamonds', 'clubs', 'spades'];
      const tens: Array<'10' | 'J' | 'Q' | 'K'> = ['10', 'J', 'Q', 'K'];
      for (let i = 0; i < 4 * stacks; i++) {
        newShoe.push({
          suit: suits[i % 4],
          rank: tens[i % 4],
          id: `hack-ten-${i}-${Math.random().toString(36).substr(2, 9)}`,
        });
      }
      return newShoe;
    },
  },
  {
    id: 'ADD_GLITCH_CARD',
    name: 'Glitch Card',
    description: (stacks: number) => `Add ${stacks} special Glitch card${stacks > 1 ? 's' : ''} (counts as any value 1-11)`,
    baseCost: 75,
    rarity: 'COMMON',
    maxStacks: 2,
    effect: (shoe: Card[], stacks: number) => {
      const newShoe = [...shoe];
      for (let i = 0; i < stacks; i++) {
        newShoe.push({
          suit: 'spades',
          rank: 'A',
          id: `glitch-${i}-${Math.random().toString(36).substr(2, 9)}`,
          isGlitch: true,
        });
      }
      return newShoe;
    },
  },
  {
    id: 'REMOVE_4_TENS',
    name: 'Ten Removal',
    description: (stacks: number) => `Remove ${4 * stacks} tens from shoe (hard mode, grants strategy advantage)`,
    baseCost: 30,
    rarity: 'COMMON',
    maxStacks: 2,
    effect: (shoe: Card[], stacks: number) => {
      const newShoe = [...shoe].filter(c => c != null);
      let removed = 0;
      const target = 4 * stacks;
      for (let i = newShoe.length - 1; i >= 0 && removed < target; i--) {
        if (newShoe[i] && ['10', 'J', 'Q', 'K'].includes(newShoe[i].rank)) {
          newShoe.splice(i, 1);
          removed++;
        }
      }
      return newShoe;
    },
  },
  {
    id: 'ADD_ACE_PAIR',
    name: 'Ace Pair',
    description: (stacks: number) => `Add ${2 * stacks} aces (one red, one black)`,
    baseCost: 45,
    rarity: 'COMMON',
    maxStacks: 3,
    effect: (shoe: Card[], stacks: number) => {
      const newShoe = [...shoe];
      for (let i = 0; i < stacks; i++) {
        newShoe.push(
          { suit: 'hearts', rank: 'A', id: `hack-ace-h-${i}-${Math.random().toString(36).substr(2, 9)}` },
          { suit: 'spades', rank: 'A', id: `hack-ace-s-${i}-${Math.random().toString(36).substr(2, 9)}` }
        );
      }
      return newShoe;
    },
  },
  {
    id: 'REMOVE_2_4_5',
    name: 'Low Removal',
    description: (stacks: number) => `Remove ${3 * stacks} cards (2s, 4s, 5s)`,
    baseCost: 35,
    rarity: 'COMMON',
    maxStacks: 3,
    effect: (shoe: Card[], stacks: number) => {
      const newShoe = [...shoe].filter(c => c != null);
      let removed = 0;
      const target = 3 * stacks;
      for (let i = newShoe.length - 1; i >= 0 && removed < target; i--) {
        if (newShoe[i] && ['2', '4', '5'].includes(newShoe[i].rank)) {
          newShoe.splice(i, 1);
          removed++;
        }
      }
      return newShoe;
    },
  },
  {
    id: 'ADD_3_MID',
    name: 'Mid Card Boost',
    description: (stacks: number) => `Add ${3 * stacks} mid cards (6s, 7s, 8s)`,
    baseCost: 40,
    rarity: 'COMMON',
    maxStacks: 3,
    effect: (shoe: Card[], stacks: number) => {
      const newShoe = [...shoe];
      const suits: Array<'hearts' | 'diamonds' | 'clubs' | 'spades'> = ['hearts', 'diamonds', 'clubs', 'spades'];
      const mids: Array<'6' | '7' | '8'> = ['6', '7', '8'];
      for (let i = 0; i < 3 * stacks; i++) {
        newShoe.push({
          suit: suits[i % 4],
          rank: mids[i % 3],
          id: `hack-mid-${i}-${Math.random().toString(36).substr(2, 9)}`,
        });
      }
      return newShoe;
    },
  },

  // UNCOMMON HACKS
  {
    id: 'DOUBLE_ACES',
    name: 'Double Aces',
    description: (stacks: number) => `Double all aces in shoe (${stacks}x effect)`,
    baseCost: 100,
    rarity: 'UNCOMMON',
    maxStacks: 2,
    effect: (shoe: Card[], stacks: number) => {
      const newShoe = [...shoe];
      const aces = shoe.filter(c => c != null && c.rank === 'A' && !c.isGlitch);
      for (let s = 0; s < stacks; s++) {
        aces.forEach(ace => {
          newShoe.push({
            ...ace,
            id: `${ace.id}-dup-${s}-${Math.random().toString(36).substr(2, 9)}`,
          });
        });
      }
      return newShoe;
    },
  },
  {
    id: 'TRIPLE_TENS',
    name: 'Triple Tens',
    description: (stacks: number) => `Add ${2 * stacks} extra 10-value cards`,
    baseCost: 90,
    rarity: 'UNCOMMON',
    maxStacks: 2,
    effect: (shoe: Card[], stacks: number) => {
      const newShoe = [...shoe];
      const suits: Array<'hearts' | 'diamonds' | 'clubs' | 'spades'> = ['hearts', 'diamonds', 'clubs', 'spades'];
      for (let i = 0; i < 2 * stacks; i++) {
        newShoe.push(
          { suit: suits[i % 4], rank: '10', id: `hack-10-${i}-${Math.random().toString(36).substr(2, 9)}` },
          { suit: suits[(i + 1) % 4], rank: 'K', id: `hack-K-${i}-${Math.random().toString(36).substr(2, 9)}` }
        );
      }
      return newShoe;
    },
  },
  {
    id: 'REMOVE_ALL_2_3',
    name: 'Eliminate Low',
    description: (stacks: number) => `Remove all 2s and 3s from shoe`,
    baseCost: 80,
    rarity: 'UNCOMMON',
    maxStacks: 1,
    effect: (shoe: Card[], stacks: number) => {
      return shoe.filter(c => c != null && c.rank !== '2' && c.rank !== '3');
    },
  },
  {
    id: 'ADD_4_GLITCH',
    name: 'Glitch Pack',
    description: (stacks: number) => `Add ${4 * stacks} glitch cards`,
    baseCost: 200,
    rarity: 'UNCOMMON',
    maxStacks: 2,
    effect: (shoe: Card[], stacks: number) => {
      const newShoe = [...shoe];
      for (let i = 0; i < 4 * stacks; i++) {
        newShoe.push({
          suit: 'spades',
          rank: 'A',
          id: `glitch-pack-${i}-${Math.random().toString(36).substr(2, 9)}`,
          isGlitch: true,
        });
      }
      return newShoe;
    },
  },
  {
    id: 'BIAS_BLACKJACK',
    name: 'Blackjack Bias',
    description: (stacks: number) => `Add ${stacks} ace-ten pairs`,
    baseCost: 120,
    rarity: 'UNCOMMON',
    maxStacks: 2,
    effect: (shoe: Card[], stacks: number) => {
      const newShoe = [...shoe];
      const suits: Array<'hearts' | 'diamonds' | 'clubs' | 'spades'> = ['hearts', 'diamonds', 'clubs', 'spades'];
      for (let i = 0; i < stacks; i++) {
        newShoe.push(
          { suit: suits[i % 4], rank: 'A', id: `bj-ace-${i}-${Math.random().toString(36).substr(2, 9)}` },
          { suit: suits[(i + 1) % 4], rank: '10', id: `bj-ten-${i}-${Math.random().toString(36).substr(2, 9)}` }
        );
      }
      return newShoe;
    },
  },
  {
    id: 'REMOVE_6_7_8',
    name: 'Mid Removal',
    description: (stacks: number) => `Remove ${6 * stacks} mid cards (6s, 7s, 8s)`,
    baseCost: 70,
    rarity: 'UNCOMMON',
    maxStacks: 2,
    effect: (shoe: Card[], stacks: number) => {
      const newShoe = [...shoe].filter(c => c != null);
      let removed = 0;
      const target = 6 * stacks;
      for (let i = newShoe.length - 1; i >= 0 && removed < target; i--) {
        if (newShoe[i] && ['6', '7', '8'].includes(newShoe[i].rank)) {
          newShoe.splice(i, 1);
          removed++;
        }
      }
      return newShoe;
    },
  },
  {
    id: 'ADD_9_PAIRS',
    name: 'Nine Pairs',
    description: (stacks: number) => `Add ${2 * stacks} nines`,
    baseCost: 55,
    rarity: 'UNCOMMON',
    maxStacks: 3,
    effect: (shoe: Card[], stacks: number) => {
      const newShoe = [...shoe];
      const suits: Array<'hearts' | 'diamonds' | 'clubs' | 'spades'> = ['hearts', 'diamonds', 'clubs', 'spades'];
      for (let i = 0; i < 2 * stacks; i++) {
        newShoe.push({
          suit: suits[i % 4],
          rank: '9',
          id: `hack-9-${i}-${Math.random().toString(36).substr(2, 9)}`,
        });
      }
      return newShoe;
    },
  },

  // RARE HACKS
  {
    id: 'QUADRUPLE_ACES',
    name: 'Ace Explosion',
    description: (stacks: number) => `Add ${8 * stacks} aces`,
    baseCost: 250,
    rarity: 'RARE',
    maxStacks: 2,
    effect: (shoe: Card[], stacks: number) => {
      const newShoe = [...shoe];
      const suits: Array<'hearts' | 'diamonds' | 'clubs' | 'spades'> = ['hearts', 'diamonds', 'clubs', 'spades'];
      for (let i = 0; i < 8 * stacks; i++) {
        newShoe.push({
          suit: suits[i % 4],
          rank: 'A',
          id: `hack-ace-explosion-${i}-${Math.random().toString(36).substr(2, 9)}`,
        });
      }
      return newShoe;
    },
  },
  {
    id: 'PERFECT_SHOE',
    name: 'Perfect Shoe',
    description: (stacks: number) => `Add ${4 * stacks} perfect blackjack pairs (A+10)`,
    baseCost: 300,
    rarity: 'RARE',
    maxStacks: 2,
    effect: (shoe: Card[], stacks: number) => {
      const newShoe = [...shoe];
      const suits: Array<'hearts' | 'diamonds' | 'clubs' | 'spades'> = ['hearts', 'diamonds', 'clubs', 'spades'];
      for (let i = 0; i < 4 * stacks; i++) {
        newShoe.push(
          { suit: suits[i % 4], rank: 'A', id: `perfect-ace-${i}-${Math.random().toString(36).substr(2, 9)}` },
          { suit: suits[(i + 1) % 4], rank: '10', id: `perfect-ten-${i}-${Math.random().toString(36).substr(2, 9)}` }
        );
      }
      return newShoe;
    },
  },
  {
    id: 'REMOVE_ALL_LOW',
    name: 'Eliminate All Low',
    description: (stacks: number) => `Remove all 2-5 cards`,
    baseCost: 150,
    rarity: 'RARE',
    maxStacks: 1,
    effect: (shoe: Card[], stacks: number) => {
      return shoe.filter(c => c != null && !['2', '3', '4', '5'].includes(c.rank));
    },
  },
  {
    id: 'GLITCH_STORM',
    name: 'Glitch Storm',
    description: (stacks: number) => `Add ${10 * stacks} glitch cards`,
    baseCost: 500,
    rarity: 'RARE',
    maxStacks: 1,
    effect: (shoe: Card[], stacks: number) => {
      const newShoe = [...shoe];
      for (let i = 0; i < 10 * stacks; i++) {
        newShoe.push({
          suit: 'spades',
          rank: 'A',
          id: `glitch-storm-${i}-${Math.random().toString(36).substr(2, 9)}`,
          isGlitch: true,
        });
      }
      return newShoe;
    },
  },
  {
    id: 'TEN_FLOOD',
    name: 'Ten Flood',
    description: (stacks: number) => `Add ${12 * stacks} ten-value cards`,
    baseCost: 180,
    rarity: 'RARE',
    maxStacks: 2,
    effect: (shoe: Card[], stacks: number) => {
      const newShoe = [...shoe];
      const suits: Array<'hearts' | 'diamonds' | 'clubs' | 'spades'> = ['hearts', 'diamonds', 'clubs', 'spades'];
      const tens: Array<'10' | 'J' | 'Q' | 'K'> = ['10', 'J', 'Q', 'K'];
      for (let i = 0; i < 12 * stacks; i++) {
        newShoe.push({
          suit: suits[i % 4],
          rank: tens[i % 4],
          id: `ten-flood-${i}-${Math.random().toString(36).substr(2, 9)}`,
        });
      }
      return newShoe;
    },
  },
  {
    id: 'ACE_TEN_MATRIX',
    name: 'Ace-Ten Matrix',
    description: (stacks: number) => `Add ${6 * stacks} ace-ten pairs`,
    baseCost: 220,
    rarity: 'RARE',
    maxStacks: 2,
    effect: (shoe: Card[], stacks: number) => {
      const newShoe = [...shoe];
      const suits: Array<'hearts' | 'diamonds' | 'clubs' | 'spades'> = ['hearts', 'diamonds', 'clubs', 'spades'];
      for (let i = 0; i < 6 * stacks; i++) {
        newShoe.push(
          { suit: suits[i % 4], rank: 'A', id: `matrix-ace-${i}-${Math.random().toString(36).substr(2, 9)}` },
          { suit: suits[(i + 1) % 4], rank: '10', id: `matrix-ten-${i}-${Math.random().toString(36).substr(2, 9)}` }
        );
      }
      return newShoe;
    },
  },

  // BOSS HACKS
  {
    id: 'INFINITE_ACES',
    name: 'Infinite Aces',
    description: (stacks: number) => `Add ${20 * stacks} aces`,
    baseCost: 1000,
    rarity: 'BOSS',
    maxStacks: 1,
    effect: (shoe: Card[], stacks: number) => {
      const newShoe = [...shoe];
      const suits: Array<'hearts' | 'diamonds' | 'clubs' | 'spades'> = ['hearts', 'diamonds', 'clubs', 'spades'];
      for (let i = 0; i < 20 * stacks; i++) {
        newShoe.push({
          suit: suits[i % 4],
          rank: 'A',
          id: `infinite-ace-${i}-${Math.random().toString(36).substr(2, 9)}`,
        });
      }
      return newShoe;
    },
  },
  {
    id: 'PERFECT_DECK',
    name: 'Perfect Deck',
    description: (stacks: number) => `Add ${16 * stacks} perfect blackjack pairs`,
    baseCost: 1500,
    rarity: 'BOSS',
    maxStacks: 1,
    effect: (shoe: Card[], stacks: number) => {
      const newShoe = [...shoe];
      const suits: Array<'hearts' | 'diamonds' | 'clubs' | 'spades'> = ['hearts', 'diamonds', 'clubs', 'spades'];
      for (let i = 0; i < 16 * stacks; i++) {
        newShoe.push(
          { suit: suits[i % 4], rank: 'A', id: `perfect-deck-ace-${i}-${Math.random().toString(36).substr(2, 9)}` },
          { suit: suits[(i + 1) % 4], rank: '10', id: `perfect-deck-ten-${i}-${Math.random().toString(36).substr(2, 9)}` }
        );
      }
      return newShoe;
    },
  },
  {
    id: 'GLITCH_REALITY',
    name: 'Glitch Reality',
    description: (stacks: number) => `Add ${25 * stacks} glitch cards`,
    baseCost: 2000,
    rarity: 'BOSS',
    maxStacks: 1,
    effect: (shoe: Card[], stacks: number) => {
      const newShoe = [...shoe];
      for (let i = 0; i < 25 * stacks; i++) {
        newShoe.push({
          suit: 'spades',
          rank: 'A',
          id: `glitch-reality-${i}-${Math.random().toString(36).substr(2, 9)}`,
          isGlitch: true,
        });
      }
      return newShoe;
    },
  },
];

export function getShoeHack(id: string): ShoeHack | undefined {
  return SHOE_HACKS.find(hack => hack.id === id);
}

// Calculate cost for buying a hack with stacking
export function getHackCost(hack: ShoeHack, currentStacks: number): number {
  // Cost scaling: baseCost * (1 + 0.5 * (stacks))
  return Math.floor(hack.baseCost * (1 + 0.5 * currentStacks));
}
