import { GameState, GameRun, Hand, Card, HandResult, Dealer, RunConfig, RunMode, ShopItem } from '../types';
import { createStandardDeck, shuffleDeck, drawCard, burnCard } from './shoe';
import { getHandValue, isBust, resolveHand, calculatePayout, canSplit } from './blackjack';
import { getDealerForWave } from './dealers';
import { SHOE_HACKS, getShoeHack, getHackCost } from './shoeHacks';
import { ACTION_CARDS, getActionCard } from './actionCards';
import { generateShopItems } from './shop';
import { SeededRNG } from './rng';

export interface GameStateMachine {
  state: GameState;
  run: GameRun;
  currentDealer: Dealer | null;
  playerHands: Hand[];
  dealerHand: Hand;
  dealerHoleCardRevealed: boolean;
  playerTotalHidden: boolean;
  dealerUpcardHidden: boolean;
  hitCount: number;
  maxHits: number;
  peekedHoleCard: boolean;
  canStand: boolean;
  emergencyChipsAmount: number;
  minBet: number;
  burnedCards: Card[]; // Track cards that were burned (permanently removed)
  lastBurnedCard: Card | null; // Track the most recently burned card for display
  // Phase 2: Boss ability flags
  allCardsHidden?: boolean;
  noSplit?: boolean;
  startWithOneCard?: boolean;
  // Action card effects
  firewallActive?: boolean; // Firewall prevents bust once
  peekedNextCard?: Card | null; // Double Vision: revealed next card in shoe
  insuranceActive?: boolean; // Insurance: get bet back if dealer has blackjack
  extraHitAvailable?: boolean; // Extra Hit: one free hit that doesn't count against limit
  glitchHitActive?: boolean; // Glitch Hit: next hit draws two cards, choose one
  glitchHitCards?: [Card, Card] | null; // Glitch Hit: the two cards to choose from
  swapActive?: boolean; // Swap: player can swap one of their cards with dealer upcard
  selectedPlayerCardIndex?: number | null; // Swap: which player card is selected (-1 = none selected)
}

const STARTING_CHIPS = 100;
const STARTING_LIVES = 3;
const EMERGENCY_CHIPS = 100;

// Phase 2: Create default run configs
// Ascension effects:
// - Starting chips: +10% per level (Ascension 1 = 110 chips, Ascension 10 = 200 chips)
// - Emergency chips: -10% per level (Ascension 1 = 90 chips, Ascension 10 = 50 chips)
// - Minimum bets: +10% per level (harder to afford bets)
// - Shop prices: +10% per level (more expensive upgrades)
// - In Survival Mode: Dealers get extra abilities earlier
export function createStageModeConfig(ascensionLevel: number = 0): RunConfig {
  const multiplier = 1 + (ascensionLevel * 0.1);
  return {
    mode: 'STAGE',
    startingLives: STARTING_LIVES,
    emergencyChipValue: Math.floor(EMERGENCY_CHIPS / multiplier),
    bossFrequency: 5,
    difficultyMultiplier: multiplier,
    ascensionLevel,
  };
}

export function createSurvivalModeConfig(ascensionLevel: number = 0): RunConfig {
  const multiplier = 1 + (ascensionLevel * 0.1);
  return {
    mode: 'SURVIVAL',
    startingLives: STARTING_LIVES,
    emergencyChipValue: Math.floor(EMERGENCY_CHIPS / multiplier),
    bossFrequency: 10, // Bosses every 10 waves in Survival
    difficultyMultiplier: multiplier,
    ascensionLevel,
  };
}

export function createInitialState(): GameStateMachine {
  const initialShoe = shuffleDeck(createStandardDeck());
  const defaultConfig = createStageModeConfig(0);
  
  return {
    state: 'MENU',
    run: {
      wave: 0,
      chips: STARTING_CHIPS,
      lives: defaultConfig.startingLives,
      score: 0,
      currentBet: 0,
      shoe: initialShoe,
      shoeHacks: SHOE_HACKS.map(h => ({ ...h, purchased: false })),
      actionCards: ACTION_CARDS.map(c => ({ ...c, used: false })),
      usedActionCardsThisHand: new Set(),
      config: defaultConfig,
    },
    currentDealer: null,
    playerHands: [],
    dealerHand: { cards: [], isSplit: false, isAceSplit: false },
    dealerHoleCardRevealed: false,
    playerTotalHidden: false,
    dealerUpcardHidden: false,
    hitCount: 0,
    maxHits: Infinity,
    peekedHoleCard: false,
    canStand: true,
    emergencyChipsAmount: defaultConfig.emergencyChipValue,
    minBet: Math.floor(10 * defaultConfig.difficultyMultiplier),
    burnedCards: [],
    lastBurnedCard: null,
    allCardsHidden: false,
    noSplit: false,
    startWithOneCard: false,
    firewallActive: false,
    peekedNextCard: null,
    insuranceActive: false,
    extraHitAvailable: false,
    glitchHitActive: false,
    glitchHitCards: null,
    swapActive: false,
    selectedPlayerCardIndex: null,
  };
}

// Phase 2: Updated to accept RunConfig
// Roguelike Shop System: Initialize new fields
export function startNewRun(state: GameStateMachine, config: RunConfig): GameStateMachine {
  const initialShoe = shuffleDeck(createStandardDeck());
  const startingChips = Math.floor(STARTING_CHIPS * config.difficultyMultiplier);
  const seed = Date.now(); // Use timestamp as seed
  
  return {
    ...state,
    state: 'WAVE_INTRO',
    run: {
      wave: 1,
      chips: startingChips,
      lives: config.startingLives,
      score: 0,
      currentBet: 0,
      shoe: initialShoe,
      shoeHacks: SHOE_HACKS.map(h => ({ ...h, purchased: false })), // Legacy
      actionCards: ACTION_CARDS.map(c => ({ ...c, used: false })), // Legacy
      usedActionCardsThisHand: new Set(),
      config,
      // Roguelike Shop System
      seed,
      shopIndex: 0,
      shop: { items: [], rerollsUsed: 0 },
      ownedShoeHacks: {},
      actionDeck: [],
      actionHand: [],
      actionDiscard: [],
      actionDrawCount: 3,
      actionCardsUsedThisHand: 0,
    },
    currentDealer: getDealerForWave(1, config.mode, config.ascensionLevel),
    playerHands: [],
    dealerHand: { cards: [], isSplit: false, isAceSplit: false },
    dealerHoleCardRevealed: false,
    playerTotalHidden: false,
    dealerUpcardHidden: false,
    hitCount: 0,
    maxHits: Infinity,
    peekedHoleCard: false,
    canStand: true,
    emergencyChipsAmount: config.emergencyChipValue,
    // Phase 2: Account for DOUBLE_MIN_BET ability
    minBet: (() => {
      const baseMinBet = Math.floor((10 + (1 - 1) * 5) * config.difficultyMultiplier);
      const dealer = getDealerForWave(1, config.mode, config.ascensionLevel);
      return dealer.abilities.some(a => a.id === 'DOUBLE_MIN_BET') 
        ? baseMinBet * 2 
        : baseMinBet;
    })(),
    burnedCards: [],
    lastBurnedCard: null,
    allCardsHidden: false,
    noSplit: false,
    startWithOneCard: false,
    firewallActive: false,
    peekedNextCard: null,
    insuranceActive: false,
    extraHitAvailable: false,
    glitchHitActive: false,
    glitchHitCards: null,
    swapActive: false,
    selectedPlayerCardIndex: null,
  };
}

export function applyShoeHacks(state: GameStateMachine): GameStateMachine {
  let shoe = [...state.run.shoe];
  
  for (const hack of state.run.shoeHacks) {
    if (hack.purchased) {
      shoe = hack.effect(shoe);
    }
  }
  
  return {
    ...state,
    run: {
      ...state.run,
      shoe: shuffleDeck(shoe), // Reshuffle after hacks
    },
  };
}

export function proceedToBetting(state: GameStateMachine): GameStateMachine {
  // Check if player needs emergency chips
  if (state.run.chips < state.minBet) {
    return {
      ...state,
      state: 'EMERGENCY_CHIPS',
    };
  }
  
  return {
    ...state,
    state: 'BETTING',
  };
}

export function acceptEmergencyChips(state: GameStateMachine): GameStateMachine {
  if (state.run.lives <= 0) {
    return {
      ...state,
      state: 'GAME_OVER',
    };
  }
  
  // Phase 2: Use config emergency chip value
  const emergencyAmount = state.run.config.emergencyChipValue;
  
  return {
    ...state,
    state: 'BETTING',
    run: {
      ...state.run,
      chips: state.run.chips + emergencyAmount,
      lives: state.run.lives - 1,
    },
  };
}

export function sellLifeForChips(state: GameStateMachine): GameStateMachine {
  if (state.run.lives <= 0) {
    return state; // Can't sell if no lives
  }
  
  // Phase 2: Use config emergency chip value
  const emergencyAmount = state.run.config.emergencyChipValue;
  
  return {
    ...state,
    run: {
      ...state.run,
      chips: state.run.chips + emergencyAmount,
      lives: state.run.lives - 1,
    },
  };
}

export function placeBet(state: GameStateMachine, betAmount?: number): GameStateMachine {
  const bet = betAmount ?? state.minBet;
  const config = state.run.config;
  
  // Phase 2: minBet already accounts for DOUBLE_MIN_BET in state, so just check against it
  if (bet < state.minBet || bet > state.run.chips) {
    return state; // Invalid bet
  }
  
  // Apply dealer abilities
  const dealer = state.currentDealer!;
  let playerTotalHidden = false;
  let dealerUpcardHidden = false;
  let maxHits = Infinity;
  let canStand = true;
  let allCardsHidden = false;
  let noSplit = false;
  let startWithOneCard = false;
  
  // Phase 2: Check if HIDE_ALL_PLAYER_CARDS is present first
  // If it is, we'll show total but hide cards (so player isn't completely blind)
  const hasHideAllCards = dealer.abilities.some(a => a.id === 'HIDE_ALL_PLAYER_CARDS');
  
  for (const ability of dealer.abilities) {
    // Phase 2: If HIDE_ALL_PLAYER_CARDS is active, ignore HIDE_PLAYER_TOTAL
    // This ensures player can always see either cards OR total
    if (ability.id === 'HIDE_PLAYER_TOTAL' && !hasHideAllCards) {
      playerTotalHidden = true;
    }
    if (ability.id === 'HIDE_DEALER_UPCARD') {
      dealerUpcardHidden = true;
    }
    if (ability.id === 'ONE_LESS_ACTION') {
      maxHits = 2;
    }
    if (ability.id === 'FORCED_HIT_UNDER_12') {
      canStand = false; // Will be checked dynamically
    }
    // Phase 2: New boss abilities
    if (ability.id === 'HIDE_ALL_PLAYER_CARDS') {
      allCardsHidden = true;
      // Don't hide total when cards are hidden - player needs to see something!
      // playerTotalHidden stays false so total is visible
    }
    if (ability.id === 'NO_SPLIT') {
      noSplit = true;
    }
    if (ability.id === 'PLAYER_STARTS_WITH_ONE_CARD') {
      startWithOneCard = true;
    }
  }
  
  return {
    ...state,
    state: 'HAND',
    run: {
      ...state.run,
      chips: state.run.chips - bet,
      currentBet: bet,
      usedActionCardsThisHand: new Set(),
    },
    playerHands: [],
    dealerHand: { cards: [], isSplit: false, isAceSplit: false },
    dealerHoleCardRevealed: false,
    // Phase 2: If all cards are hidden, show total (don't hide it)
    // This ensures player can always see either cards OR total
    playerTotalHidden: allCardsHidden ? false : playerTotalHidden,
    dealerUpcardHidden,
    hitCount: 0,
    maxHits,
    canStand,
    peekedHoleCard: false,
    burnedCards: [],
    lastBurnedCard: null,
    // Phase 2: Store boss ability flags for UI
    allCardsHidden: allCardsHidden || false,
    noSplit: noSplit || false,
    startWithOneCard: startWithOneCard || false,
    firewallActive: false, // Reset firewall for new hand
    peekedNextCard: null, // Reset peeked card for new hand
    insuranceActive: false, // Reset insurance for new hand
    extraHitAvailable: false, // Reset extra hit for new hand
    glitchHitActive: false, // Reset glitch hit for new hand
  };
}

// Roguelike Shop System: Rebuild shoe from owned hacks
function rebuildShoeWithHacks(state: GameStateMachine): Card[] {
  let shoe = createStandardDeck();
  
  // Apply all owned hacks in sorted order (by id for consistency)
  const hackIds = Object.keys(state.run.ownedShoeHacks).sort();
  for (const hackId of hackIds) {
    const hack = getShoeHack(hackId);
    if (hack) {
      const stacks = state.run.ownedShoeHacks[hackId].stacks;
      shoe = hack.effect(shoe, stacks);
    }
  }
  
  return shuffleDeck(shoe);
}

// Phase 2: Updated to handle boss abilities
// Roguelike Shop System: Draw action cards and rebuild shoe
export function dealInitialHands(state: GameStateMachine): GameStateMachine {
  // Rebuild shoe with owned hacks
  const shoe = rebuildShoeWithHacks(state);
  const dealer = state.currentDealer!;
  
  // Draw action cards for this hand
  let actionDeck = [...state.run.actionDeck];
  let actionDiscard = [...state.run.actionDiscard];
  const actionHand: string[] = [];
  const drawCount = state.run.actionDrawCount;
  
  for (let i = 0; i < drawCount && actionDeck.length > 0; i++) {
    actionHand.push(actionDeck.shift()!);
  }
  
  // If deck empty, shuffle discard back
  if (actionDeck.length === 0 && actionDiscard.length > 0) {
    const rng = new SeededRNG(state.run.seed + state.run.wave * 100);
    actionDeck = rng.shuffle([...actionDiscard]);
    actionDiscard = []; // Clear discard pile after shuffling it back
  }
  
  // Phase 2: Check for PLAYER_STARTS_WITH_ONE_CARD ability
  const startWithOneCard = dealer.abilities.some(a => a.id === 'PLAYER_STARTS_WITH_ONE_CARD');
  
  const playerHand: Hand = {
    cards: startWithOneCard 
      ? [drawCard(shoe)!]
      : [drawCard(shoe)!, drawCard(shoe)!],
    isSplit: false,
    isAceSplit: false,
  };
  const dealerHand: Hand = {
    cards: [drawCard(shoe)!, drawCard(shoe)!],
    isSplit: false,
    isAceSplit: false,
  };
  
  return {
    ...state,
    run: {
      ...state.run,
      shoe,
      actionHand,
      actionDeck, // Update with new deck (either drawn from or shuffled from discard)
      actionDiscard, // Update with cleared discard if we shuffled
      actionCardsUsedThisHand: 0, // Reset action card usage for new hand
    },
    playerHands: [playerHand],
    dealerHand,
    firewallActive: false, // Reset firewall for new hand
    peekedNextCard: null, // Reset peeked card for new hand
    insuranceActive: false, // Reset insurance for new hand
    extraHitAvailable: false, // Reset extra hit for new hand
    glitchHitActive: false, // Reset glitch hit for new hand
  };
}

export function playerHit(state: GameStateMachine, handIndex: number = 0): GameStateMachine {
  const shoe = [...state.run.shoe];
  const playerHands = [...state.playerHands];
  const hand = { ...playerHands[handIndex] };
  let burnedCards = [...state.burnedCards];
  
  // Check for burn card ability
  const dealer = state.currentDealer!;
  let lastBurnedCard: Card | null = null;
  for (const ability of dealer.abilities) {
    if (ability.id === 'BURN_TOP_CARD_ON_HIT') {
      const burned = drawCard(shoe);
      if (burned) {
        burnedCards.push(burned);
        lastBurnedCard = burned; // Track the most recent burned card
      }
    }
  }
  
  // Glitch Hit: Draw two cards, store them for player to choose
  let newCard: Card | null = null;
  let peekedNextCard: Card | null = null;
  let glitchHitActive: boolean | undefined = state.glitchHitActive;
  let glitchHitCards: [Card, Card] | null = null;
  
  if (state.glitchHitActive) {
    // Draw two cards and store them - player will choose which one to keep
    const card1 = drawCard(shoe);
    const card2 = drawCard(shoe);
    if (card1 && card2) {
      glitchHitCards = [card1, card2];
      // Don't add card to hand yet - wait for player to choose
      glitchHitActive = false; // Clear flag, but keep cards in state
    }
  } else if (state.peekedNextCard) {
    // Double Vision: Use the peeked card
    newCard = state.peekedNextCard;
    // Remove it from shoe (it's the first card)
    shoe.shift();
    // Add to burned cards (removed permanently)
    burnedCards.push(newCard);
    peekedNextCard = null; // Clear the peeked card
  } else {
    // Normal draw
    newCard = drawCard(shoe);
  }
  
  if (newCard) {
    hand.cards = [...hand.cards, newCard];
    playerHands[handIndex] = hand;
  }
  
  // Ace splits allow unlimited hits, so don't increment hit count for them
  // Extra Hit doesn't count against limit
  const isAceSplit = hand.isAceSplit;
  const isExtraHit = state.extraHitAvailable;
  const newHitCount = isAceSplit || isExtraHit ? state.hitCount : state.hitCount + 1;
  const extraHitAvailable = isExtraHit ? false : state.extraHitAvailable; // Clear after use
  
  const canStandNow = state.currentDealer?.abilities.some(a => a.id === 'FORCED_HIT_UNDER_12')
    ? getHandValue(hand) >= 12
    : true;
  
  return {
    ...state,
    run: {
      ...state.run,
      shoe,
    },
    playerHands,
    hitCount: newHitCount,
    canStand: canStandNow,
    burnedCards,
    lastBurnedCard, // Show the burned card in UI
    peekedNextCard, // Clear if used, keep if not
    extraHitAvailable, // Clear if used
    glitchHitActive, // Clear if used
    glitchHitCards, // Store cards for player to choose
  };
}

export function playerSplit(state: GameStateMachine, handIndex: number = 0): GameStateMachine {
  const shoe = [...state.run.shoe];
  const playerHands = [...state.playerHands];
  const hand = playerHands[handIndex];
  
  if (!canSplit(hand)) {
    return state;
  }
  
  // Check if player can afford another bet
  if (state.run.chips < state.run.currentBet) {
    return state; // Can't afford to split
  }
  
  // Split the hand
  const isAce = hand.cards[0].rank === 'A';
  const newHand1: Hand = {
    cards: [hand.cards[0], drawCard(shoe)!],
    isSplit: true,
    isAceSplit: isAce,
  };
  const newHand2: Hand = {
    cards: [hand.cards[1], drawCard(shoe)!],
    isSplit: true,
    isAceSplit: isAce,
  };
  
  playerHands[handIndex] = newHand1;
  playerHands.push(newHand2);
  
  return {
    ...state,
    run: {
      ...state.run,
      chips: state.run.chips - state.run.currentBet,
      shoe,
    },
    playerHands,
    burnedCards: state.burnedCards, // Preserve burned cards
  };
}

export function playerStand(state: GameStateMachine, handIndex: number = 0): GameStateMachine {
  // Mark this hand as done (stand)
  // Check if all hands are done
  const allHandsDone = state.playerHands.every(hand => 
    isBust(hand) || getHandValue(hand) === 21
  );
  
  if (allHandsDone) {
    return resolveDealerHand(state);
  }
  
  return state;
}

// Phase 2: Updated to support boss abilities
export function resolveDealerHand(state: GameStateMachine): GameStateMachine {
  const shoe = [...state.run.shoe];
  const dealer = state.currentDealer!;
  let dealerHand = { ...state.dealerHand };
  
  // Reveal hole card
  let dealerHoleCardRevealed = true;
  
  // Phase 2: Check for DEALER_DRAWS_3_CHOOSES_BEST ability
  const draws3ChoosesBest = dealer.abilities.some(a => a.id === 'DEALER_DRAWS_3_CHOOSES_BEST');
  const standsOn16 = dealer.abilities.some(a => a.id === 'DEALER_STANDS_ON_16');
  
  if (draws3ChoosesBest) {
    // Draw 3 cards and choose the best hand
    const option1 = { ...dealerHand, cards: [...dealerHand.cards, drawCard(shoe)!] };
    const option2 = { ...dealerHand, cards: [...dealerHand.cards, drawCard(shoe)!] };
    const option3 = { ...dealerHand, cards: [...dealerHand.cards, drawCard(shoe)!] };
    
    const value1 = getHandValue(option1);
    const value2 = getHandValue(option2);
    const value3 = getHandValue(option3);
    
    // Choose the best hand (highest value ≤ 21, or lowest if all bust)
    const options = [
      { hand: option1, value: value1 },
      { hand: option2, value: value2 },
      { hand: option3, value: value3 },
    ];
    
    const validOptions = options.filter(o => o.value <= 21);
    if (validOptions.length > 0) {
      dealerHand = validOptions.reduce((best, current) => 
        current.value > best.value ? current : best
      ).hand;
    } else {
      // All bust, choose lowest
      dealerHand = options.reduce((worst, current) => 
        current.value < worst.value ? current : worst
      ).hand;
    }
  } else {
    // Standard dealer play
    const standValue = standsOn16 ? 16 : 17;
    
    while (true) {
      const dealerValue = getHandValue(dealerHand);
      if (dealerValue >= standValue) {
        // Check if it's a soft 17 (only if not standsOn16)
        if (!standsOn16 && dealerValue === 17) {
          const hasAce = dealerHand.cards.some(c => c.rank === 'A');
          if (hasAce) {
            // Calculate if it's actually soft 17 (ace counting as 11)
            let softValue = 0;
            for (const card of dealerHand.cards) {
              if (card.rank === 'A') {
                softValue += 11;
              } else if (['J', 'Q', 'K'].includes(card.rank)) {
                softValue += 10;
              } else {
                softValue += parseInt(card.rank);
              }
            }
            // If soft value is 17, stand
            if (softValue === 17) {
              break;
            }
          }
        }
        // Hard standValue or higher, stand
        if (dealerValue >= standValue) {
          break;
        }
      }
      
      const newCard = drawCard(shoe);
      if (newCard) {
        dealerHand.cards = [...dealerHand.cards, newCard];
      } else {
        break;
      }
    }
  }
  
  return {
    ...state,
    state: 'HAND_RESOLUTION',
    run: {
      ...state.run,
      shoe,
    },
    dealerHand,
    dealerHoleCardRevealed,
    burnedCards: state.burnedCards, // Preserve burned cards
  };
}

export function resolveHandResults(state: GameStateMachine): GameStateMachine {
  const dealer = state.currentDealer!;
  const dealerWinsOn22 = dealer.abilities.some(a => a.id === 'DEALER_WINS_ON_22');
  
  let totalPayout = 0;
  let hasPush = false;
  let hasWin = false;
  let hasLoss = false;
  
  // Phase 2: Check for BLACKJACK_PAYS_1_TO_1 ability
  const blackjackPays1To1 = dealer.abilities.some(a => a.id === 'BLACKJACK_PAYS_1_TO_1');
  
  for (const playerHand of state.playerHands) {
    const playerValue = getHandValue(playerHand);
    let result: HandResult;
    let handPayout = 0;
    
    // FIREWALL: If player would bust and firewall is active, treat as 21 instead
    if (playerValue > 21 && state.firewallActive) {
      // Firewall prevents bust - treat as 21 (blackjack win if dealer doesn't have 21)
      const dealerValue = getHandValue(state.dealerHand);
      if (dealerValue === 21) {
        result = 'push'; // Both have 21
      } else {
        result = 'blackjack_win'; // Player has 21, dealer doesn't
      }
    } else {
      // Normal resolution
      result = resolveHand(playerHand, state.dealerHand, dealerWinsOn22);
    }
    
    // INSURANCE: If dealer has blackjack, get bet back
    if (state.insuranceActive && result === 'loss') {
      const dealerValue = getHandValue(state.dealerHand);
      const playerValue = getHandValue(playerHand);
      // Check if dealer has blackjack (21 with 2 cards)
      if (dealerValue === 21 && state.dealerHand.cards.length === 2) {
        handPayout = state.run.currentBet; // Get bet back
      } else {
        handPayout = calculatePayout(result, state.run.currentBet, blackjackPays1To1);
      }
    } else {
      handPayout = calculatePayout(result, state.run.currentBet, blackjackPays1To1);
    }
    
    totalPayout += handPayout;
    if (result === 'push') {
      hasPush = true;
    }
    if (result === 'win' || result === 'blackjack_win') {
      hasWin = true;
    }
    if (result === 'loss') {
      hasLoss = true;
    }
  }
  
  // Double Vision: If next card was peeked but not used, remove it from shoe (burn it)
  let finalBurnedCards = [...state.burnedCards];
  let finalShoe = [...state.run.shoe];
  if (state.peekedNextCard) {
    // Remove the peeked card from shoe (it's the first card)
    const removedCard = finalShoe.shift();
    if (removedCard) {
      finalBurnedCards.push(removedCard);
    }
  }
  
  // Collect all cards from hands to return to shoe (except burned cards)
  const cardsToReturn: Card[] = [];
  for (const hand of state.playerHands) {
    cardsToReturn.push(...hand.cards);
  }
  cardsToReturn.push(...state.dealerHand.cards);
  
  // Roguelike Shop System: Discard action hand
  const actionDiscard = [...state.run.actionDiscard, ...state.run.actionHand];
  
  // Return all cards to shoe and reshuffle (burned cards stay removed)
  // Note: Shoe will be rebuilt with hacks on next dealInitialHands
  const newShoe = [...finalShoe, ...cardsToReturn];
  const shuffledShoe = shuffleDeck(newShoe);
  
  const newChips = state.run.chips + totalPayout;
  const newWave = state.run.wave;
  const isBoss = dealer.isBoss;
  const config = state.run.config;
  
  // Phase 2: Calculate score based on mode
  let newScore = state.run.score;
  if (config.mode === 'SURVIVAL') {
    // Survival: score = waves survived
    newScore = newWave;
  } else {
    // Stage: score = waves + remaining lives + chips bonus
    newScore = newWave * 10 + state.run.lives * 5 + Math.floor(newChips / 10);
  }
  
  // Phase 2: Stage Mode extended to 25 waves (5 bosses: waves 5, 10, 15, 20, 25)
  // Victory only triggers on the final wave (25) when player wins
  const isLastWave = config.mode === 'STAGE' && newWave >= 25;
  
  // Phase 2: Victory only in Stage Mode - must be final wave (25) AND player must win
  if (config.mode === 'STAGE' && isLastWave && hasWin) {
    return {
      ...state,
      state: 'VICTORY',
      run: {
        ...state.run,
        chips: newChips,
        score: newScore,
        shoe: shuffledShoe,
        actionDiscard,
        actionHand: [],
        actionCardsUsedThisHand: 0,
      },
      burnedCards: finalBurnedCards,
      lastBurnedCard: null, // Reset burned cards for next hand
      peekedNextCard: null, // Clear peeked card
      insuranceActive: false, // Reset insurance
      extraHitAvailable: false, // Reset extra hit
      glitchHitActive: false, // Reset glitch hit
    };
  }
  
  // Phase 2: Survival Mode never has victory, only game over
  
  // Check game over
  if (state.run.lives <= 0 && newChips < state.minBet) {
    return {
      ...state,
      state: 'GAME_OVER',
      run: {
        ...state.run,
        chips: newChips,
        score: newWave,
        shoe: shuffledShoe,
        actionDiscard,
        actionHand: [],
        actionCardsUsedThisHand: 0,
      },
      burnedCards: finalBurnedCards,
      lastBurnedCard: null, // Reset burned cards for next hand
      peekedNextCard: null, // Clear peeked card
    };
  }
  
  // If no win (all push or all loss), go back to betting
  if (!hasWin) {
    return {
      ...state,
      state: 'BETTING',
      run: {
        ...state.run,
        chips: newChips, // Bet was returned on push, lost on loss
        currentBet: 0,
        shoe: shuffledShoe,
        actionDiscard,
        actionHand: [],
        actionCardsUsedThisHand: 0,
      },
      playerHands: [],
      dealerHand: { cards: [], isSplit: false, isAceSplit: false },
      dealerHoleCardRevealed: false,
      peekedHoleCard: false,
      hitCount: 0,
      burnedCards: finalBurnedCards,
      lastBurnedCard: null, // Reset burned cards for next hand
      allCardsHidden: false, // Reset for next hand
      noSplit: false,
      startWithOneCard: false,
      peekedNextCard: null, // Clear peeked card
      insuranceActive: false, // Reset insurance
      extraHitAvailable: false, // Reset extra hit
      glitchHitActive: false, // Reset glitch hit
    };
  }
  
  // Only continue to shop if player won at least one hand
  // Roguelike Shop System: Generate shop on entry
  const newShopIndex = state.run.shopIndex + 1;
  const shopItems = generateShopItems({
    ...state.run,
    shopIndex: newShopIndex - 1, // Use previous index for generation
  });
  
  return {
    ...state,
    state: 'SHOP',
    run: {
      ...state.run,
      shopIndex: newShopIndex,
      shop: {
        items: shopItems,
        rerollsUsed: 0,
      },
      chips: newChips,
      score: newScore,
      shoe: shuffledShoe,
      actionDiscard,
      actionHand: [],
        actionCardsUsedThisHand: 0,
    },
    burnedCards: [],
    lastBurnedCard: null, // Reset burned cards for next hand
  };
}

// Phase 2: Updated to support both modes
export function proceedToNextWave(state: GameStateMachine): GameStateMachine {
  const nextWave = state.run.wave + 1;
  const config = state.run.config;
  
  // Phase 2: Stage Mode extended to 25 waves (all 5 bosses), Survival Mode is infinite
  if (config.mode === 'STAGE' && nextWave > 25) {
    return {
      ...state,
      state: 'VICTORY',
    };
  }
  
  // Phase 2: Scale min bet based on wave and difficulty
  const baseMinBet = 10 + (nextWave - 1) * 5;
  const scaledMinBet = Math.floor(baseMinBet * config.difficultyMultiplier);
  
  // Phase 2: Get dealer and check for DOUBLE_MIN_BET ability
  const nextDealer = getDealerForWave(nextWave, config.mode, config.ascensionLevel);
  const effectiveMinBet = nextDealer.abilities.some(a => a.id === 'DOUBLE_MIN_BET')
    ? scaledMinBet * 2
    : scaledMinBet;
  
  // Roguelike Shop System: Rebuild shoe for new wave
  const rebuiltShoe = rebuildShoeWithHacks({
    ...state,
    run: {
      ...state.run,
      wave: nextWave,
    },
  });
  
  return {
    ...state,
    state: 'WAVE_INTRO',
    run: {
      ...state.run,
      wave: nextWave,
      currentBet: 0,
      usedActionCardsThisHand: new Set(),
      // Phase 2: Update score in Survival Mode
      score: config.mode === 'SURVIVAL' ? nextWave : state.run.score,
      shoe: rebuiltShoe, // Rebuild shoe with all owned hacks
    },
    currentDealer: nextDealer,
    playerHands: [],
    dealerHand: { cards: [], isSplit: false, isAceSplit: false },
    dealerHoleCardRevealed: false,
    peekedHoleCard: false,
    hitCount: 0,
    minBet: effectiveMinBet,
    burnedCards: [],
    lastBurnedCard: null, // Reset burned cards for new wave
    allCardsHidden: false, // Reset for new wave
    noSplit: false,
    startWithOneCard: false,
  };
}

// Roguelike Shop System: Buy shop item
export function buyShopItem(state: GameStateMachine, itemIndex: number): GameStateMachine {
  const item = state.run.shop.items[itemIndex];
  if (!item || item.cost > state.run.chips) {
    return state;
  }
  
  let newRun = { ...state.run };
  newRun.chips -= item.cost;
  
  if (item.kind === 'SHOE_HACK') {
    const hack = getShoeHack(item.id);
    if (!hack) return state;
    
    const currentStacks = newRun.ownedShoeHacks[item.id]?.stacks || 0;
    if (currentStacks >= hack.maxStacks) {
      return state; // Already maxed
    }
    
    // Add or increment stack
    newRun.ownedShoeHacks = {
      ...newRun.ownedShoeHacks,
      [item.id]: { stacks: currentStacks + 1 },
    };
    
    // Rebuild shoe immediately with new hack
    const tempState = {
      ...state,
      run: newRun,
    };
    newRun.shoe = rebuildShoeWithHacks(tempState);
    
    // Remove item from shop
    newRun.shop = {
      ...newRun.shop,
      items: newRun.shop.items.filter((_, i) => i !== itemIndex),
    };
  } else if (item.kind === 'ACTION_CARD') {
    // Add to action deck
    newRun.actionDeck = [...newRun.actionDeck, item.id];
    
    // Remove item from shop
    newRun.shop = {
      ...newRun.shop,
      items: newRun.shop.items.filter((_, i) => i !== itemIndex),
    };
  } else if (item.kind === 'REROLL_SHOP') {
    // Reroll shop
    newRun.shopIndex += 1;
    newRun.shop = {
      items: generateShopItems(newRun),
      rerollsUsed: newRun.shop.rerollsUsed + 1,
    };
  } else if (item.kind === 'REMOVE_ACTION_CARD') {
    // Remove random action card from deck
    if (newRun.actionDeck.length > 0) {
      const rng = new SeededRNG(newRun.seed + newRun.shopIndex * 1000 + newRun.shop.rerollsUsed);
      const indexToRemove = rng.nextInt(0, newRun.actionDeck.length);
      newRun.actionDeck = newRun.actionDeck.filter((_, i) => i !== indexToRemove);
    }
    
    // Remove item from shop
    newRun.shop = {
      ...newRun.shop,
      items: newRun.shop.items.filter((_, i) => i !== itemIndex),
    };
  }
  
  return {
    ...state,
    run: newRun,
  };
}

// Phase 2: Updated to scale action card costs with ascension
export function purchaseActionCard(state: GameStateMachine, cardId: string): GameStateMachine {
  const card = state.run.actionCards.find(c => c.id === cardId);
  if (!card) {
    return state;
  }
  
  // Phase 2: Scale cost with difficulty multiplier
  const scaledCost = Math.floor(card.cost * state.run.config.difficultyMultiplier);
  if (scaledCost > state.run.chips) {
    return state;
  }
  
  // Action cards are already available, this just marks them as owned
  // For MVP, all cards are available, cost is per-use
  return {
    ...state,
    run: {
      ...state.run,
      chips: state.run.chips - scaledCost,
    },
  };
}

// Roguelike Shop System: Use action card
export function useActionCard(state: GameStateMachine, cardId: string, handIndex: number = 0): GameStateMachine {
  const card = getActionCard(cardId);
  if (!card) return state;
  
  // Check if card is in hand
  if (!state.run.actionHand.includes(cardId)) {
    return state; // Card not in hand
  }
  
  // Check action card limit (2 per hand)
  if (state.run.actionCardsUsedThisHand >= 2) {
    return state; // Already used 2 action cards this hand
  }
  
  // Remove card from hand and add to discard
  const newActionHand = state.run.actionHand.filter(id => id !== cardId);
  const newActionDiscard = [...state.run.actionDiscard, cardId];
  
  // Increment usage counter
  const newActionCardsUsed = state.run.actionCardsUsedThisHand + 1;
  
  // Apply card effect based on type
  let newState = {
    ...state,
    run: {
      ...state.run,
      actionHand: newActionHand,
      actionDiscard: newActionDiscard,
      actionCardsUsedThisHand: newActionCardsUsed,
    },
  };
  
  // Handle specific card effects
  if (cardId === 'PEEK_HOLE_CARD') {
    newState = {
      ...newState,
      peekedHoleCard: true,
    };
  } else if (cardId === 'REDEAL_HAND') {
    // Redeal player hand - return old cards to shoe first
    const shoe = [...newState.run.shoe];
    const oldHand = newState.playerHands[handIndex];
    // Return old cards to shoe
    shoe.push(...oldHand.cards);
    // Shuffle to mix them in
    const shuffledShoe = shuffleDeck(shoe);
    // Draw new hand
    const newPlayerHand = {
      cards: [drawCard(shuffledShoe)!, drawCard(shuffledShoe)!],
      isSplit: false,
      isAceSplit: false,
    };
    const newPlayerHands = [...newState.playerHands];
    newPlayerHands[handIndex] = newPlayerHand;
    newState = {
      ...newState,
      playerHands: newPlayerHands,
      run: {
        ...newState.run,
        shoe: shuffledShoe,
      },
    };
  } else if (cardId === 'SCRAMBLE') {
    // Shuffle remaining shoe
    newState = {
      ...newState,
      run: {
        ...newState.run,
        shoe: shuffleDeck([...newState.run.shoe]),
      },
    };
  } else if (cardId === 'OVERCLOCK') {
    // Add one extra hit
    newState = {
      ...newState,
      maxHits: newState.maxHits + 1,
    };
  } else if (cardId === 'FIREWALL') {
    // Mark firewall active (will be checked in resolution)
    // This needs to be tracked in state
    newState = {
      ...newState,
      firewallActive: true,
    };
  } else if (cardId === 'DOUBLE_VISION') {
    // Reveal the next card in the shoe
    const shoe = [...newState.run.shoe];
    if (shoe.length > 0) {
      const nextCard = shoe[0]; // Peek at first card without removing it
      newState = {
        ...newState,
        peekedNextCard: nextCard,
      };
    }
  } else if (cardId === 'EXTRA_HIT') {
    // Extra hit that doesn't count against limit
    newState = {
      ...newState,
      extraHitAvailable: true,
    };
  } else if (cardId === 'INSURANCE') {
    // Insurance: get bet back if dealer has blackjack
    newState = {
      ...newState,
      insuranceActive: true,
    };
  } else if (cardId === 'GLITCH_HIT') {
    // Next hit draws two cards, choose one
    newState = {
      ...newState,
      glitchHitActive: true,
    };
  } else if (cardId === 'SWAP_WITH_DEALER') {
    // Enable swap mode - player selects their card first, then dealer card
    newState = {
      ...newState,
      swapActive: true,
      selectedPlayerCardIndex: null, // No card selected yet
    };
  }
  // Note: LOCK_CARD_VALUE, PATCH, DOUBLE_DOWN, TIME_STOP, PERFECT_DRAW, REWIND
  // are not yet implemented - they require more complex UI/state management
  
  return newState;
}

// Swap: Select player card for swap
export function selectPlayerCardForSwap(state: GameStateMachine, handIndex: number, cardIndex: number): GameStateMachine {
  if (!state.swapActive) {
    return state; // Swap not active
  }
  
  const hand = state.playerHands[handIndex];
  if (!hand || cardIndex < 0 || cardIndex >= hand.cards.length) {
    return state; // Invalid card index
  }
  
  return {
    ...state,
    selectedPlayerCardIndex: cardIndex,
  };
}

// Swap: Execute the swap between player card and dealer upcard
export function executeSwap(state: GameStateMachine, handIndex: number): GameStateMachine {
  if (!state.swapActive || state.selectedPlayerCardIndex === null || state.selectedPlayerCardIndex === undefined) {
    return state; // Swap not ready
  }
  
  const playerHands = [...state.playerHands];
  const hand = { ...playerHands[handIndex] };
  const dealerHand = { ...state.dealerHand };
  
  // Get the selected player card
  const playerCard = hand.cards[state.selectedPlayerCardIndex];
  if (!playerCard) {
    return state; // Invalid card
  }
  
  // Get dealer upcard (first card)
  const dealerUpcard = dealerHand.cards[0];
  if (!dealerUpcard) {
    return state; // No dealer upcard
  }
  
  // Swap the cards
  const newPlayerCards = [...hand.cards];
  newPlayerCards[state.selectedPlayerCardIndex] = dealerUpcard;
  hand.cards = newPlayerCards;
  
  const newDealerCards = [...dealerHand.cards];
  newDealerCards[0] = playerCard;
  dealerHand.cards = newDealerCards;
  
  playerHands[handIndex] = hand;
  
  return {
    ...state,
    playerHands: playerHands,
    dealerHand: dealerHand,
    swapActive: false, // Clear swap mode
    selectedPlayerCardIndex: null,
  };
}

// Glitch Hit: Choose which card to keep
export function chooseGlitchHitCard(state: GameStateMachine, cardIndex: number, handIndex: number = 0): GameStateMachine {
  if (!state.glitchHitCards || cardIndex < 0 || cardIndex > 1) {
    return state; // Invalid state or index
  }
  
  const playerHands = [...state.playerHands];
  const hand = { ...playerHands[handIndex] };
  const chosenCard = state.glitchHitCards[cardIndex];
  const otherCard = state.glitchHitCards[1 - cardIndex];
  
  // Add chosen card to hand
  hand.cards = [...hand.cards, chosenCard];
  playerHands[handIndex] = hand;
  
  // Return other card to shoe
  const shoe = [...state.run.shoe];
  shoe.push(otherCard);
  
  // Ace splits allow unlimited hits, so don't increment hit count for them
  const isAceSplit = hand.isAceSplit;
  const newHitCount = isAceSplit ? state.hitCount : state.hitCount + 1;
  
  const canStandNow = state.currentDealer?.abilities.some(a => a.id === 'FORCED_HIT_UNDER_12')
    ? getHandValue(hand) >= 12
    : true;
  
  return {
    ...state,
    run: {
      ...state.run,
      shoe,
    },
    playerHands,
    hitCount: newHitCount,
    canStand: canStandNow,
    glitchHitCards: null, // Clear after choice
  };
}

// Phase 2: Updated to scale shop prices with ascension
export function purchaseShoeHack(state: GameStateMachine, hackId: string): GameStateMachine {
  const hack = state.run.shoeHacks.find(h => h.id === hackId);
  if (!hack || hack.purchased) {
    return state;
  }
  
  // Phase 2: Scale cost with difficulty multiplier
  const scaledCost = Math.floor(hack.cost * state.run.config.difficultyMultiplier);
  if (scaledCost > state.run.chips) {
    return state;
  }
  
  const updatedHacks = state.run.shoeHacks.map(h =>
    h.id === hackId ? { ...h, purchased: true } : h
  );
  
  // Apply hack to shoe
  const newShoe = hack.effect([...state.run.shoe]);
  
  return {
    ...state,
    run: {
      ...state.run,
      chips: state.run.chips - scaledCost,
      shoeHacks: updatedHacks,
      shoe: shuffleDeck(newShoe),
    },
  };
}
