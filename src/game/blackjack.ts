import { Card, Hand, HandResult } from '../types';

export function getCardValue(card: Card, useAceHigh: boolean = true): number {
  // Glitch cards can be any value 1-11, default to 11 (ace high) or 1 (ace low)
  if (card.isGlitch) {
    return useAceHigh ? 11 : 1;
  }
  if (card.rank === 'A') {
    return useAceHigh ? 11 : 1;
  }
  if (['J', 'Q', 'K'].includes(card.rank)) {
    return 10;
  }
  return parseInt(card.rank);
}

export function getHandValue(hand: Hand): number {
  // Separate fixed cards from flexible cards
  let fixedTotal = 0;
  const aces: Card[] = [];
  const glitchCards: Card[] = [];

  for (const card of hand.cards) {
    if (card.isGlitch) {
      glitchCards.push(card);
    } else if (card.rank === 'A') {
      aces.push(card);
    } else if (['J', 'Q', 'K'].includes(card.rank)) {
      fixedTotal += 10;
    } else {
      fixedTotal += parseInt(card.rank);
    }
  }

  // Find the best total by trying all combinations of ace and glitch values
  // Aces can be 11 or 1, glitch cards can be 1-11
  function findBestTotal(aceIndex: number, glitchIndex: number, currentTotal: number): number {
    // Base case: all cards assigned
    if (aceIndex >= aces.length && glitchIndex >= glitchCards.length) {
      return currentTotal <= 21 ? currentTotal : 0;
    }

    let best = 0;

    // Assign next ace (11 or 1)
    if (aceIndex < aces.length) {
      // Try ace as 11
      const total11 = currentTotal + 11;
      if (total11 <= 21) {
        const result = findBestTotal(aceIndex + 1, glitchIndex, total11);
        best = Math.max(best, result);
      }
      // Try ace as 1
      const total1 = currentTotal + 1;
      const result = findBestTotal(aceIndex + 1, glitchIndex, total1);
      best = Math.max(best, result);
    }
    // Assign next glitch card (1-11)
    else if (glitchIndex < glitchCards.length) {
      for (let value = 1; value <= 11; value++) {
        const newTotal = currentTotal + value;
        if (newTotal <= 21) {
          const result = findBestTotal(aceIndex, glitchIndex + 1, newTotal);
          best = Math.max(best, result);
        }
      }
    }

    return best;
  }

  const bestTotal = findBestTotal(0, 0, fixedTotal);
  
  // If no valid combination found (all would bust), return minimum values
  if (bestTotal === 0) {
    return fixedTotal + aces.length + glitchCards.length;
  }

  return bestTotal;
}

export function isBlackjack(hand: Hand): boolean {
  return hand.cards.length === 2 && getHandValue(hand) === 21;
}

export function isBust(hand: Hand): boolean {
  return getHandValue(hand) > 21;
}

export function canSplit(hand: Hand): boolean {
  if (hand.cards.length !== 2) return false;
  if (hand.isSplit) return false;
  return getCardValue(hand.cards[0], false) === getCardValue(hand.cards[1], false);
}

export function resolveHand(
  playerHand: Hand,
  dealerHand: Hand,
  dealerWinsOn22: boolean = false
): HandResult {
  const playerValue = getHandValue(playerHand);
  const dealerValue = getHandValue(dealerHand);

  // Player bust
  if (playerValue > 21) {
    return 'loss';
  }

  // Dealer bust (unless special rule)
  if (dealerValue > 21) {
    if (dealerWinsOn22 && dealerValue === 22) {
      return 'loss';
    }
    return isBlackjack(playerHand) ? 'blackjack_win' : 'win';
  }

  // Natural blackjack
  if (isBlackjack(playerHand) && !isBlackjack(dealerHand)) {
    return 'blackjack_win';
  }

  if (isBlackjack(dealerHand) && !isBlackjack(playerHand)) {
    return 'loss';
  }

  // Compare values
  if (playerValue > dealerValue) {
    return playerValue === 21 ? 'blackjack_win' : 'win';
  }

  if (playerValue < dealerValue) {
    return 'loss';
  }

  return 'push';
}

// Phase 2: Updated to support BLACKJACK_PAYS_1_TO_1 ability
export function calculatePayout(result: HandResult, bet: number, blackjackPays1To1: boolean = false): number {
  switch (result) {
    case 'blackjack_win':
      // Phase 2: Check for reduced payout ability
      if (blackjackPays1To1) {
        // Pays 1:1 instead of 3:2
        return bet + bet; // Bet back + 1x bet
      }
      // Bet was already deducted, so return bet + 1.5*bet = 2.5*bet total
      return bet + Math.floor(bet * 1.5);
    case 'win':
      // Bet was already deducted, so return bet + bet = 2*bet total (bet back + win)
      return bet + bet;
    case 'loss':
      // Bet was already deducted, so return 0 (already lost)
      return 0;
    case 'push':
      // Bet was already deducted, so return bet back (no win, no loss)
      return bet;
  }
}
