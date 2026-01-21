import { useEffect, useState } from 'react';
import { GameStateMachine, resolveHandResults } from '../game/stateMachine';
import { getHandValue, resolveHand } from '../game/blackjack';
import { HandResult } from '../types';
import CardComponent from './CardComponent';
import './HandResolutionScreen.css';

interface HandResolutionScreenProps {
  state: GameStateMachine;
  onUpdate: (state: GameStateMachine) => void;
}

export default function HandResolutionScreen({ state, onUpdate }: HandResolutionScreenProps) {
  const [results, setResults] = useState<Array<{ handIndex: number; result: HandResult; payout: number }>>([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    // Calculate results after a brief delay
    const timer = setTimeout(() => {
      const dealer = state.currentDealer!;
      const dealerWinsOn22 = dealer.abilities.some(a => a.id === 'DEALER_WINS_ON_22');
      
      // Phase 2: Check for BLACKJACK_PAYS_1_TO_1 ability
      const blackjackPays1To1 = dealer.abilities.some(a => a.id === 'BLACKJACK_PAYS_1_TO_1');
      
      const calculatedResults = state.playerHands.map((hand, index) => {
        const result = resolveHand(hand, state.dealerHand, dealerWinsOn22);
        // Payout calculation: bet was already deducted, so:
        // - blackjack_win: bet + 1.5*bet = 2.5*bet total (or 1:1 if ability active)
        // - win: bet + bet = 2*bet total (bet back + win)
        // - loss: 0 (bet already lost)
        // - push: bet (bet back, no win)
        const payout = result === 'blackjack_win' 
          ? blackjackPays1To1
            ? state.run.currentBet + state.run.currentBet // 1:1 payout
            : state.run.currentBet + Math.floor(state.run.currentBet * 1.5) // 3:2 payout
          : result === 'win'
          ? state.run.currentBet + state.run.currentBet
          : result === 'loss'
          ? 0
          : state.run.currentBet; // push: bet back
        return { handIndex: index, result, payout };
      });
      
      setResults(calculatedResults);
      setShowResults(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, [state]);

  const handleContinue = () => {
    onUpdate(resolveHandResults(state));
  };

  // Total payout is the sum of all payouts (which includes bet returns)
  // Net change = totalPayout - (number of hands * bet) since bet was already deducted
  const totalPayout = results.reduce((sum, r) => sum + r.payout, 0);
  const netChange = totalPayout - (state.playerHands.length * state.run.currentBet);
  const dealerValue = getHandValue(state.dealerHand);

  return (
    <div className="screen">
      <h2 className="screen-title neon-text neon-cyan">Hand Resolution</h2>
      <div className="resolution-content">
        {/* Dealer Hand */}
        <div className="panel">
          <h3>Dealer Hand</h3>
          <div className="hand">
            {state.dealerHand.cards.map(card => (
              <CardComponent key={card.id} card={card} />
            ))}
          </div>
          <p className="hand-value-display">
            Dealer: {dealerValue > 21 ? 'BUST' : dealerValue}
          </p>
        </div>

        {/* Player Hands Results */}
        <div className="player-results">
          {state.playerHands.map((hand, index) => {
            const handValue = getHandValue(hand);
            const result = results.find(r => r.handIndex === index);
            
            return (
              <div key={index} className="panel result-panel">
                <h4>Hand {index + 1}</h4>
                <div className="hand">
                  {hand.cards.map(card => (
                    <CardComponent key={card.id} card={card} />
                  ))}
                </div>
                <p className="hand-value-display">
                  Your Total: {handValue > 21 ? 'BUST' : handValue}
                </p>
                {showResults && result && (
                    <div className={`result-badge ${result.result}`}>
                      {result.result === 'blackjack_win' && '⚡ BLACKJACK WIN ⚡'}
                      {result.result === 'win' && 'WIN'}
                      {result.result === 'loss' && 'LOSS'}
                      {result.result === 'push' && 'PUSH (Replay Hand)'}
                      <div className="payout">
                        {result.result === 'loss' 
                          ? `-${state.run.currentBet} chips`
                          : result.result === 'push'
                          ? `${result.payout} chips (bet returned)`
                          : `+${result.payout - state.run.currentBet} chips (net)`}
                      </div>
                      {result.result !== 'loss' && result.result !== 'push' && (
                        <div className="payout-detail" style={{ fontSize: '12px', opacity: 0.7, marginTop: '4px' }}>
                          (Bet returned: {state.run.currentBet} + Win: {result.payout - state.run.currentBet})
                        </div>
                      )}
                    </div>
                )}
              </div>
            );
          })}
        </div>

        {showResults && (
          <div className="total-result panel">
            <h3>Total Result</h3>
            <div className={`total-payout ${netChange >= 0 ? 'positive chip-gain' : 'negative chip-loss'}`}>
              {netChange > 0 ? '+' : ''}{netChange} chips
            </div>
            <div className="new-chip-total">
              New Total: {state.run.chips + totalPayout} chips
            </div>
            {netChange !== 0 && (
              <div className="payout-breakdown" style={{ fontSize: '12px', opacity: 0.7, marginTop: '10px' }}>
                (Bets returned: {state.playerHands.length * state.run.currentBet} + Net: {netChange})
              </div>
            )}
          </div>
        )}

        {showResults && (
          <div className="continue-section">
            {results.some(r => r.result === 'win' || r.result === 'blackjack_win') ? (
              <div>
                <p className="info-text" style={{ color: '#00ff00', marginBottom: '15px' }}>
                  ⚡ You won! Advancing to shop...
                </p>
                <button className="btn btn-primary" onClick={handleContinue}>
                  Continue to Shop
                </button>
              </div>
            ) : (
              <div>
                <p className="info-text" style={{ color: '#ffaa00', marginBottom: '15px' }}>
                  {results.some(r => r.result === 'push') 
                    ? 'Push - Bet returned. Place another bet to continue.'
                    : 'You lost. Place another bet to try again.'}
                </p>
                <button className="btn btn-primary" onClick={handleContinue}>
                  Place New Bet
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
