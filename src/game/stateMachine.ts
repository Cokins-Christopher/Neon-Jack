import { GameState, GameRun, Hand, Card, HandResult, Dealer, RunConfig, RunMode } from '../types';
import { createStandardDeck, shuffleDeck, drawCard, burnCard } from './shoe';
import { getHandValue, isBust, resolveHand, calculatePayout, canSplit } from './blackjack';
import { getDealerForWave } from './dealers';
import { SHOE_HACKS } from './shoeHacks';
import { ACTION_CARDS } from './actionCards';

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
  };
}

// Phase 2: Updated to accept RunConfig
export function startNewRun(state: GameStateMachine, config: RunConfig): GameStateMachine {
  const initialShoe = shuffleDeck(createStandardDeck());
  const startingChips = Math.floor(STARTING_CHIPS * config.difficultyMultiplier);
  
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
      shoeHacks: SHOE_HACKS.map(h => ({ ...h, purchased: false })),
      actionCards: ACTION_CARDS.map(c => ({ ...c, used: false })),
      usedActionCardsThisHand: new Set(),
      config,
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
  };
}

// Phase 2: Updated to handle boss abilities
export function dealInitialHands(state: GameStateMachine): GameStateMachine {
  const shoe = [...state.run.shoe];
  const dealer = state.currentDealer!;
  
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
    },
    playerHands: [playerHand],
    dealerHand,
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
  
  const newCard = drawCard(shoe);
  if (newCard) {
    hand.cards = [...hand.cards, newCard];
    playerHands[handIndex] = hand;
  }
  
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
    burnedCards,
    lastBurnedCard, // Show the burned card in UI
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
    const result = resolveHand(playerHand, state.dealerHand, dealerWinsOn22);
    const payout = calculatePayout(result, state.run.currentBet, blackjackPays1To1);
    totalPayout += payout;
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
  
  // Collect all cards from hands to return to shoe (except burned cards)
  const cardsToReturn: Card[] = [];
  for (const hand of state.playerHands) {
    cardsToReturn.push(...hand.cards);
  }
  cardsToReturn.push(...state.dealerHand.cards);
  
  // Return all cards to shoe and reshuffle (burned cards stay removed)
  const newShoe = [...state.run.shoe, ...cardsToReturn];
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
      },
      burnedCards: [],
    lastBurnedCard: null, // Reset burned cards for next hand
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
      },
      burnedCards: [],
    lastBurnedCard: null, // Reset burned cards for next hand
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
      },
      playerHands: [],
      dealerHand: { cards: [], isSplit: false, isAceSplit: false },
      dealerHoleCardRevealed: false,
      peekedHoleCard: false,
      hitCount: 0,
      burnedCards: [],
    lastBurnedCard: null, // Reset burned cards for next hand
      allCardsHidden: false, // Reset for next hand
      noSplit: false,
      startWithOneCard: false,
    };
  }
  
  // Only continue to shop if player won at least one hand
  return {
    ...state,
    state: 'SHOP',
    run: {
      ...state.run,
      chips: newChips,
      score: newScore,
      shoe: shuffledShoe,
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
