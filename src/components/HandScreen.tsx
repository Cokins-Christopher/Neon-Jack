import { useState, useEffect } from 'react';
import { GameStateMachine, playerHit, playerStand, playerSplit, resolveDealerHand, useActionCard, chooseGlitchHitCard, selectPlayerCardForSwap, executeSwap } from '../game/stateMachine';
import { getHandValue, isBust, canSplit } from '../game/blackjack';
import { getActionCard } from '../game/actionCards';
import CardComponent from './CardComponent';
import './HandScreen.css';

interface HandScreenProps {
  state: GameStateMachine;
  onUpdate: (state: GameStateMachine) => void;
}

export default function HandScreen({ state, onUpdate }: HandScreenProps) {
  const [activeHandIndex, setActiveHandIndex] = useState(0);
  // Use state.peekedHoleCard directly instead of local state
  const peekedHoleCard = state.peekedHoleCard;

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
  // Can't hit if glitch hit cards are waiting to be chosen or swap is active
  const canHit = !activeHandBust && !state.glitchHitCards && !state.swapActive && (isAceSplit || state.hitCount < state.maxHits);
  
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
              <div
                onClick={() => {
                  if (state.swapActive && state.selectedPlayerCardIndex !== null && state.selectedPlayerCardIndex !== undefined) {
                    onUpdate(executeSwap(state, activeHandIndex));
                  }
                }}
                style={{
                  cursor: state.swapActive && state.selectedPlayerCardIndex !== null && state.selectedPlayerCardIndex !== undefined
                    ? 'pointer'
                    : 'default',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  transform: state.swapActive && state.selectedPlayerCardIndex !== null && state.selectedPlayerCardIndex !== undefined
                    ? 'scale(1.1)'
                    : 'scale(1)',
                  boxShadow: state.swapActive && state.selectedPlayerCardIndex !== null && state.selectedPlayerCardIndex !== undefined
                    ? '0 0 20px #ff00ff, 0 0 40px #ff00ff'
                    : 'none',
                  borderRadius: '8px',
                  padding: '5px',
                }}
              >
                <CardComponent 
                  card={dealerUpcard} 
                  hidden={state.dealerUpcardHidden && !peekedHoleCard}
                />
              </div>
            )}
            {dealerHoleCard && (
              <CardComponent 
                card={dealerHoleCard} 
                hidden={!state.dealerHoleCardRevealed && !peekedHoleCard}
              />
            )}
          </div>
          {state.swapActive && (
            <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(255, 0, 255, 0.1)', border: '2px solid #ff00ff', borderRadius: '8px' }}>
              <p style={{ fontSize: '14px', color: '#ff00ff', margin: '0', textAlign: 'center', fontWeight: 'bold' }}>
                {state.selectedPlayerCardIndex !== null && state.selectedPlayerCardIndex !== undefined
                  ? '⚡ Click dealer upcard to swap ⚡'
                  : '⚡ SWAP MODE - Click one of your cards ⚡'}
              </p>
            </div>
          )}
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
          {/* Double Vision: Show peeked next card */}
          {state.peekedNextCard && (
            <div style={{ marginTop: '15px', padding: '15px', background: 'rgba(0, 255, 255, 0.1)', border: '2px solid #00ffff', borderRadius: '8px' }}>
              <p style={{ fontSize: '14px', color: '#00ffff', margin: '0 0 10px 0', textAlign: 'center', fontWeight: 'bold' }}>
                👁️ NEXT CARD (Double Vision)
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                <CardComponent card={state.peekedNextCard} hidden={false} />
              </div>
              <p style={{ fontSize: '12px', color: '#00ffff', textAlign: 'center', opacity: 0.8 }}>
                Hit to take this card, or Stand to skip it
              </p>
            </div>
          )}
          {/* Glitch Hit: Show two cards to choose from */}
          {state.glitchHitCards && (
            <div style={{ marginTop: '15px', padding: '15px', background: 'rgba(255, 0, 255, 0.1)', border: '2px solid #ff00ff', borderRadius: '8px' }}>
              <p style={{ fontSize: '14px', color: '#ff00ff', margin: '0 0 10px 0', textAlign: 'center', fontWeight: 'bold' }}>
                ⚡ GLITCH HIT - Choose a Card ⚡
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '10px' }}>
                {state.glitchHitCards.map((card, index) => (
                  <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <CardComponent card={card} hidden={false} />
                    <button
                      className="btn btn-primary"
                      onClick={() => onUpdate(chooseGlitchHitCard(state, index, activeHandIndex))}
                      style={{ 
                        marginTop: '10px',
                        fontSize: '12px',
                        padding: '8px 16px',
                        background: '#ff00ff',
                        borderColor: '#ff00ff'
                      }}
                    >
                      Choose This
                    </button>
                  </div>
                ))}
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
                  {hand.cards.map((card, cardIndex) => {
                    const isSelected = state.swapActive && 
                                      index === activeHandIndex && 
                                      state.selectedPlayerCardIndex === cardIndex;
                    return (
                      <div
                        key={card.id}
                        onClick={() => {
                          if (state.swapActive && index === activeHandIndex) {
                            onUpdate(selectPlayerCardForSwap(state, index, cardIndex));
                          }
                        }}
                        style={{
                          cursor: state.swapActive && index === activeHandIndex ? 'pointer' : 'default',
                          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                          transform: isSelected ? 'scale(1.15)' : state.swapActive && index === activeHandIndex ? 'scale(1.05)' : 'scale(1)',
                          boxShadow: isSelected 
                            ? '0 0 20px #ff00ff, 0 0 40px #ff00ff, 0 0 60px #ff00ff'
                            : state.swapActive && index === activeHandIndex
                            ? '0 0 10px #ff00ff'
                            : 'none',
                          borderRadius: '8px',
                          padding: '5px',
                          zIndex: isSelected ? 10 : 1,
                        }}
                      >
                        <CardComponent 
                          card={card} 
                          hidden={allCardsHidden}
                        />
                      </div>
                    );
                  })}
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
              {state.glitchHitCards ? (
                <div className="glitch-hit-message">
                  <p className="info-text" style={{ color: '#ff00ff', fontSize: '16px', marginBottom: '10px' }}>
                    Choose a card from above to continue
                  </p>
                </div>
              ) : state.swapActive ? (
                <div className="swap-message">
                  <p className="info-text" style={{ color: '#ff00ff', fontSize: '16px', marginBottom: '10px' }}>
                    {state.selectedPlayerCardIndex !== null && state.selectedPlayerCardIndex !== undefined
                      ? 'Click dealer upcard to swap'
                      : 'Click one of your cards to swap'}
                  </p>
                </div>
              ) : (
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
              )}
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

        {/* Action Cards */}
        {state.run.actionHand.length > 0 && (
          <div className="action-cards-section panel">
            <div className="action-cards-header">
              <h4>Action Cards</h4>
              <div className="action-cards-used">
                Used: <span style={{ color: state.run.actionCardsUsedThisHand < 2 ? '#00ff00' : '#ff0000' }}>
                  {state.run.actionCardsUsedThisHand}/2
                </span>
              </div>
            </div>
            <div className="action-cards-grid">
              {state.run.actionHand.map((cardId, index) => {
                const card = getActionCard(cardId);
                if (!card) return null;
                
                const isAfterDeal = card.timing === 'after_deal' && state.playerHands.length > 0 && state.hitCount === 0;
                const isDuringDecision = card.timing === 'during_decision' && !allHandsDone;
                const canUse = state.run.actionCardsUsedThisHand < 2;
                const canUseNow = (isAfterDeal || isDuringDecision) && canUse;
                
                return (
                  <div 
                    key={`${cardId}-${index}`}
                    className={`action-card-item ${!canUseNow ? 'disabled' : ''}`}
                    style={{
                      borderColor: canUseNow ? '#00ffff' : '#666',
                      opacity: canUseNow ? 1 : 0.5,
                    }}
                  >
                    <div className="action-card-header">
                      <div className="action-card-name">{card.name}</div>
                    </div>
                    <div className="action-card-description">{card.description}</div>
                    <button
                      className="btn btn-primary"
                      onClick={() => onUpdate(useActionCard(state, cardId, activeHandIndex))}
                      disabled={!canUseNow}
                      style={{ 
                        marginTop: '10px',
                        fontSize: '12px',
                        padding: '8px 16px'
                      }}
                    >
                      Use
                    </button>
                  </div>
                );
              })}
            </div>
            {state.run.actionHand.length === 0 && (
              <p style={{ textAlign: 'center', opacity: 0.6, fontSize: '12px', padding: '20px' }}>
                No action cards in hand. Draw more from your deck next hand.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
