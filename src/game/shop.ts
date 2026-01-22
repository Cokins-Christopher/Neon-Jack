import { ShopItem, Rarity, GameRun } from '../types';
import { SeededRNG } from './rng';
import { SHOE_HACKS } from './shoeHacks';
import { ACTION_CARDS } from './actionCards';
import { getHackCost } from './shoeHacks';

// Rarity weights for shop generation
const RARITY_WEIGHTS: Record<Rarity, number> = {
  COMMON: 70,
  UNCOMMON: 25,
  RARE: 5,
  BOSS: 0, // Boss items only appear in special circumstances
};

// Adjust weights for Survival Mode based on wave
function getAdjustedWeights(wave: number, mode: 'STAGE' | 'SURVIVAL'): Record<Rarity, number> {
  if (mode === 'STAGE') {
    return RARITY_WEIGHTS;
  }
  
  // Survival Mode: higher waves get better items
  const waveBonus = Math.min(wave / 10, 1); // Cap at 1.0
  return {
    COMMON: 70 - waveBonus * 20,
    UNCOMMON: 25 + waveBonus * 10,
    RARE: 5 + waveBonus * 10,
    BOSS: waveBonus * 2,
  };
}

export function generateShopItems(run: GameRun): ShopItem[] {
  const rng = new SeededRNG(run.seed + run.shopIndex * 1000);
  const items: ShopItem[] = [];
  const weights = getAdjustedWeights(run.wave, run.config.mode);
  
  // Filter available hacks (not maxed)
  const availableHacks = SHOE_HACKS.filter(hack => {
    const owned = run.ownedShoeHacks[hack.id];
    return !owned || owned.stacks < hack.maxStacks;
  });
  
  // Filter available action cards (no limit, but we can add variety)
  const availableActionCards = ACTION_CARDS;
  
  // Generate 5 items
  // Ensure at least 2 shoe hacks, 2 action cards, 1 utility
  const targetCounts = {
    shoeHacks: 2,
    actionCards: 2,
    utility: 1,
  };
  
  let shoeHackCount = 0;
  let actionCardCount = 0;
  let utilityCount = 0;
  
  for (let i = 0; i < 5; i++) {
    const remaining = 5 - i;
    const needShoeHack = shoeHackCount < targetCounts.shoeHacks && remaining > (targetCounts.actionCards - actionCardCount + targetCounts.utility - utilityCount);
    const needActionCard = actionCardCount < targetCounts.actionCards && remaining > (targetCounts.shoeHacks - shoeHackCount + targetCounts.utility - utilityCount);
    const needUtility = utilityCount < targetCounts.utility && remaining > (targetCounts.shoeHacks - shoeHackCount + targetCounts.actionCards - actionCardCount);
    
    let item: ShopItem | null = null;
    
    if (needShoeHack && availableHacks.length > 0) {
      // Pick a random hack with rarity weighting
      const rarity = rng.weightedChoice([
        { item: 'COMMON' as Rarity, weight: weights.COMMON },
        { item: 'UNCOMMON' as Rarity, weight: weights.UNCOMMON },
        { item: 'RARE' as Rarity, weight: weights.RARE },
        { item: 'BOSS' as Rarity, weight: weights.BOSS },
      ]);
      
      const hacksOfRarity = availableHacks.filter(h => h.rarity === rarity);
      if (hacksOfRarity.length > 0) {
        const hack = rng.choice(hacksOfRarity);
        const currentStacks = run.ownedShoeHacks[hack.id]?.stacks || 0;
        const cost = getHackCost(hack, currentStacks);
        item = { kind: 'SHOE_HACK', id: hack.id, cost, rarity: hack.rarity };
        shoeHackCount++;
      }
    } else if (needActionCard && availableActionCards.length > 0) {
      const rarity = rng.weightedChoice([
        { item: 'COMMON' as Rarity, weight: weights.COMMON },
        { item: 'UNCOMMON' as Rarity, weight: weights.UNCOMMON },
        { item: 'RARE' as Rarity, weight: weights.RARE },
        { item: 'BOSS' as Rarity, weight: weights.BOSS },
      ]);
      
      const cardsOfRarity = availableActionCards.filter(c => c.rarity === rarity);
      if (cardsOfRarity.length > 0) {
        const card = rng.choice(cardsOfRarity);
        // Scale cost with difficulty
        const cost = Math.floor(card.baseCost * run.config.difficultyMultiplier);
        item = { kind: 'ACTION_CARD', id: card.id, cost, rarity: card.rarity };
        actionCardCount++;
      }
    } else if (needUtility) {
      // Add reroll or remove action card utility
      if (rng.nextFloat() < 0.5 && run.actionDeck.length > 0) {
        item = { kind: 'REMOVE_ACTION_CARD', cost: Math.floor(30 * run.config.difficultyMultiplier) };
      } else {
        item = { kind: 'REROLL_SHOP', cost: Math.floor(50 * run.config.difficultyMultiplier) };
      }
      utilityCount++;
    } else {
      // Random item
      const roll = rng.nextFloat();
      if (roll < 0.4 && availableHacks.length > 0) {
        const rarity = rng.weightedChoice([
          { item: 'COMMON' as Rarity, weight: weights.COMMON },
          { item: 'UNCOMMON' as Rarity, weight: weights.UNCOMMON },
          { item: 'RARE' as Rarity, weight: weights.RARE },
          { item: 'BOSS' as Rarity, weight: weights.BOSS },
        ]);
        const hacksOfRarity = availableHacks.filter(h => h.rarity === rarity);
        if (hacksOfRarity.length > 0) {
          const hack = rng.choice(hacksOfRarity);
          const currentStacks = run.ownedShoeHacks[hack.id]?.stacks || 0;
          const cost = getHackCost(hack, currentStacks);
          item = { kind: 'SHOE_HACK', id: hack.id, cost, rarity: hack.rarity };
        }
      } else if (availableActionCards.length > 0) {
        const rarity = rng.weightedChoice([
          { item: 'COMMON' as Rarity, weight: weights.COMMON },
          { item: 'UNCOMMON' as Rarity, weight: weights.UNCOMMON },
          { item: 'RARE' as Rarity, weight: weights.RARE },
          { item: 'BOSS' as Rarity, weight: weights.BOSS },
        ]);
        const cardsOfRarity = availableActionCards.filter(c => c.rarity === rarity);
        if (cardsOfRarity.length > 0) {
          const card = rng.choice(cardsOfRarity);
          const cost = Math.floor(card.baseCost * run.config.difficultyMultiplier);
          item = { kind: 'ACTION_CARD', id: card.id, cost, rarity: card.rarity };
        }
      }
    }
    
    if (item) {
      items.push(item);
    }
  }
  
  return items;
}
