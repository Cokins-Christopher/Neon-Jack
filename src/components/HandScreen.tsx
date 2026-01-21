import { useState, useEffect } from 'react';
import { GameStateMachine, playerHit, playerStand, playerSplit, resolveDealerHand } from '../game/stateMachine';
import { getHandValue, isBust, canSplit } from '../game/blackjack';
import CardComponent from './CardComponent';
import './HandScreen.css';

interface HandScreenProps {
  state: GameStateMachine;
  onUpdate: (state: GameStateMachine) => void;
}

export default function HandScreen({ state, onUpdate }: HandScreenProps) {
  const [activeHandIndex, setActiveHandIndex] = useState(0);
  const [peekedHoleCard, setPeekedHoleCard] = useState(state.peekedHoleCard);

  const activeHand = state.playerHands[activeHandIndex];
  const activeHandValue = activeHand ? getHandValue(activeHand) : 0;
  const activeHandBust = activeHand ? isBust(activeHand) : false;
  
  // Phase 2: Check for NO_SPLIT ability (from state or dealer)
  const noSplitAbility = state.noSplit ?? state.currentDealer?.abilities.some(a => a.id === 'NO_SPLIT') ?? false;
  const canSplitHand = !noSplitAbility && activeHand 
    ? canSplit(activeHand) && state.run.chips >= state.run.currentBet 
    : false;
  
  // Phase 2: Check for HIDE_ALL_PLAYER_CARDS ability (from state or dealer)
  const allCardsHidden = state.allCardsHidden ?? state.currentDealer?.abilities.some(a => a.id === 'HIDE_ALL_PLAYER_CARDS') ?? false;
  // Ace splits allow unlimited hits, so ignore maxHits limit for ace splits
  const isAceSplit = activeHand?.isAceSplit ?? false;
  const canHit = !activeHandBust && (isAceSplit || state.hitCount < state.maxHits);
  
  // Check if forced hit ability is active
  const hasForcedHitAbility = state.currentDealer?.abilities.some(a => a.id === 'FORCED_HIT_UNDER_12') ?? false;
  // Can stand if: not bust, and either no forced hit ability OR hand value is >= 12
  // Special case: if hand is exactly 21, always allow standing (you can't hit anyway)
  const canStandNow = !activeHandBust && (!hasForcedHitAbility || activeHandValue >= 12 || activeHandValue === 21);

  // Check if all hands are done
  const allHandsDone = state.playerHands.every(hand => 
    isBust(hand) || getHandValue(hand) === 21
  );

  const handleHit = () => {
    if (canHit) {
      onUpdate(playerHit(state, activeHandIndex));
    }
  };

  const handleStand = () => {
    if (canStandNow) {
      // Move to next hand if split, or resolve dealer
      if (activeHandIndex < state.playerHands.length - 1) {
        setActiveHandIndex(activeHandIndex + 1);
      } else {
        // All hands done, resolve dealer
        onUpdate(resolveDealerHand(state));
      }
    }
  };

  // Auto-advance when hand is done (bust or 21)
  useEffect(() => {
    if (activeHand) {
      const handValue = getHandValue(activeHand);
      const handBust = isBust(activeHand);
      
      // If all hands are done, immediately resolve dealer
      if (allHandsDone) {
        const timer = setTimeout(() => {
          onUpdate(resolveDealerHand(state));
        }, 1000);
        return () => clearTimeout(timer);
      }
      
      // If current hand is done but not all hands, move to next hand
      if ((handBust || handValue === 21) && !allHandsDone) {
        const timer = setTimeout(() => {
          if (activeHandIndex < state.playerHands.length - 1) {
            // Move to next hand
            setActiveHandIndex(activeHandIndex + 1);
          } else {
            // All hands done, resolve dealer
            onUpdate(resolveDealerHand(state));
          }
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeHand, activeHandIndex, allHandsDone]);

  const handleSplit = () => {
    if (canSplitHand) {
      const newState = playerSplit(state, activeHandIndex);
      onUpdate(newState);
    }
  };

  const dealerUpcard = state.dealerHand.cards[0];
  const dealerHoleCard = state.dealerHand.cards[1];

  return (
    <div className="screen">
      <div className="hand-screen">
        {/* Stats Bar */}
        <div className="stats-bar">
          <div className="stat">
            <div className="stat-label">Chips</div>
            <div className="stat-value" id="chip-display">{state.run.chips}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Lives</div>
            <div className="stat-value" style={{ color: state.run.lives > 0 ? '#ff0000' : '#666' }}>
              {state.run.lives}
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">Bet</div>
            <div className="stat-value">{state.run.currentBet}</div>
          </div>
        </div>

        {/* Dealer Section */}
        <div className="dealer-section panel">
          <h3 className="section-title">Dealer</h3>
          <div className="hand dealer-hand">
            {dealerUpcard && (
              <CardComponent 
                card={dealerUpcard} 
                hidden={state.dealerUpcardHidden && !peekedHoleCard}
              />
            )}
            {dealerHoleCard && (
              <CardComponent 
                card={dealerHoleCard} 
                hidden={!state.dealerHoleCardRevealed && !peekedHoleCard}
              />
            )}
          </div>
          {state.dealerUpcardHidden && !peekedHoleCard && (
            <p className="info-text">Upcard Hidden</p>
          )}
          {/* Show burned card if burn ability is active */}
          {state.lastBurnedCard && state.currentDealer?.abilities.some(a => a.id === 'BURN_TOP_CARD_ON_HIT') && (
            <div style={{ marginTop: '15px', padding: '10px', background: 'rgba(255, 0, 0, 0.1)', border: '1px solid #ff0000', borderRadius: '5px' }}>
              <p style={{ fontSize: '12px', color: '#ff0000', margin: '0 0 5px 0', textAlign: 'center' }}>⚡ BURNED CARD ⚡</p>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <CardComponent card={state.lastBurnedCard} hidden={false} />
              </div>
            </div>
          )}
        </div>

        {/* Player Hands */}
        <div className="player-section">
          <h3 className="section-title">Your Hand{state.playerHands.length > 1 ? 's' : ''}</h3>
          {state.playerHands.map((hand, index) => {
            const handValue = getHandValue(hand);
            const handBust = isBust(hand);
            const isActive = index === activeHandIndex;
            
            return (
              <div key={index} className={`hand-container ${isActive ? 'active' : ''}`}>
                <div className="hand-info">
                  <span>Hand {index + 1}</span>
                  {!state.playerTotalHidden && (
                    <span className={`hand-value ${handBust ? 'bust screen-shake' : handValue === 21 ? 'blackjack neon-pulse' : ''}`}>
                      {handBust ? 'BUST' : handValue === 21 ? '21 ⚡' : handValue}
                    </span>
                  )}
                  {state.playerTotalHidden && (
                    <span className="hand-value" style={{ opacity: 0.5 }}>
                      ???
                    </span>
                  )}
                </div>
                <div className="hand">
                  {hand.cards.map((card, cardIndex) => (
                    <CardComponent 
                      key={card.id} 
                      card={card} 
                      hidden={allCardsHidden}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="actions panel">
          {allHandsDone ? (
            <div className="hand-complete-message">
              <p className="info-text" style={{ color: '#00ffff', fontSize: '18px', marginBottom: '15px' }}>
                Hand complete. Resolving dealer...
              </p>
              <button 
                className="btn btn-primary" 
                onClick={() => onUpdate(resolveDealerHand(state))}
              >
                Continue to Resolution
              </button>
            </div>
          ) : (
            <>
              <div className="action-buttons">
                <button 
                  className="btn btn-primary" 
                  onClick={handleHit}
                  disabled={!canHit || allHandsDone}
                >
                  Hit
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={handleStand}
                  disabled={!canStandNow || allHandsDone}
                >
                  Stand
                </button>
                {canSplitHand && (
                  <button 
                    className="btn" 
                    onClick={handleSplit}
                    disabled={allHandsDone}
                  >
                    Split ({state.run.currentBet} chips)
                  </button>
                )}
              </div>
            </>
          )}
          {state.hitCount >= state.maxHits && !isAceSplit && (
            <p className="warning-text">Action limit reached!</p>
          )}
          {!canStandNow && hasForcedHitAbility && activeHandValue < 12 && (
            <p className="warning-text">Must hit when total is under 12!</p>
          )}
          {activeHandValue === 21 && !activeHandBust && (
            <p className="info-text" style={{ color: '#00ff00' }}>Blackjack! (21)</p>
          )}
        </div>

        {/* Action Cards (simplified for MVP) */}
        {state.run.actionCards.length > 0 && (
          <div className="action-cards-section panel">
            <h4>Action Cards (MVP: Coming Soon)</h4>
            <p style={{ opacity: 0.6, fontSize: '12px' }}>
              Action card system implemented in logic, UI integration pending
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
