import { useState, useEffect } from 'react';
import { GameStateMachine, placeBet, dealInitialHands, sellLifeForChips } from '../game/stateMachine';
import './BettingScreen.css';

interface BettingScreenProps {
  state: GameStateMachine;
  onUpdate: (state: GameStateMachine) => void;
}

export default function BettingScreen({ state, onUpdate }: BettingScreenProps) {
  const [betAmount, setBetAmount] = useState(Math.min(state.minBet, state.run.chips));
  const [chipAnimation, setChipAnimation] = useState<{ value: number; key: number } | null>(null);

  // Update bet amount when chips change (e.g., after selling a life)
  useEffect(() => {
    if (state.run.chips < betAmount) {
      setBetAmount(Math.min(state.minBet, state.run.chips));
    } else if (state.run.chips >= state.minBet && betAmount < state.minBet) {
      setBetAmount(state.minBet);
    }
  }, [state.run.chips, state.minBet, betAmount]);

  const handlePlaceBet = () => {
    if (betAmount < state.minBet || betAmount > state.run.chips) {
      return; // Invalid bet
    }
    let newState = placeBet(state, betAmount);
    newState = dealInitialHands(newState);
    onUpdate(newState);
  };

  const handleSellLife = () => {
    if (state.run.lives > 0) {
      onUpdate(sellLifeForChips(state));
    }
  };

  const handleAddChip = (value: number) => {
    const newAmount = Math.min(betAmount + value, state.run.chips);
    if (newAmount >= state.minBet) {
      setBetAmount(newAmount);
      // Trigger animation
      setChipAnimation({ value, key: Date.now() });
      // Clear animation after it completes
      setTimeout(() => setChipAnimation(null), 600);
    }
  };

  const handleMinBet = () => {
    setBetAmount(state.minBet);
  };

  const handleAllIn = () => {
    setBetAmount(state.run.chips);
  };

  return (
    <div className="screen">
      <h2 className="screen-title neon-text neon-cyan">Place Your Bet</h2>
      <div className="betting-content">
        <div className="panel">
          <div className="betting-info">
            <p>Minimum Bet: <span className="neon-green">{state.minBet} chips</span></p>
            <p>Your Chips: <span className="neon-cyan">{state.run.chips} chips</span></p>
            <p>Lives: <span className="neon-pink" style={{ color: state.run.lives > 0 ? '#ff0000' : '#666' }}>{state.run.lives}</span></p>
            {state.run.chips < state.minBet && (
              <p className="warning-message" style={{ color: '#ffaa00', marginTop: '10px', fontSize: '14px' }}>
                ⚠️ You don't have enough chips for the minimum bet!
              </p>
            )}
          </div>
          
          <div className="bet-selection">
            <label className="bet-label">Set Your Bet:</label>
            
            {/* Quick Bet Buttons */}
            <div className="quick-bet-buttons">
              <button
                className="quick-bet-btn min-bet-btn"
                onClick={handleMinBet}
                disabled={state.run.chips < state.minBet}
              >
                Min Bet ({state.minBet})
              </button>
              <button
                className="quick-bet-btn all-in-btn"
                onClick={handleAllIn}
                disabled={state.run.chips < state.minBet}
              >
                All In ({state.run.chips})
              </button>
            </div>

            {/* Chip Buttons */}
            <div className="chip-buttons-container">
              <label className="chip-label">Add Chips:</label>
              <div className="chip-buttons">
                <button
                  key="chip-1"
                  className={`chip-btn chip-1 ${chipAnimation?.value === 1 ? 'chip-animate' : ''}`}
                  onClick={() => handleAddChip(1)}
                  disabled={betAmount >= state.run.chips}
                >
                  +1
                </button>
                <button
                  key="chip-5"
                  className={`chip-btn chip-5 ${chipAnimation?.value === 5 ? 'chip-animate' : ''}`}
                  onClick={() => handleAddChip(5)}
                  disabled={betAmount >= state.run.chips}
                >
                  +5
                </button>
                <button
                  key="chip-25"
                  className={`chip-btn chip-25 ${chipAnimation?.value === 25 ? 'chip-animate' : ''}`}
                  onClick={() => handleAddChip(25)}
                  disabled={betAmount >= state.run.chips}
                >
                  +25
                </button>
                <button
                  key="chip-100"
                  className={`chip-btn chip-100 ${chipAnimation?.value === 100 ? 'chip-animate' : ''}`}
                  onClick={() => handleAddChip(100)}
                  disabled={betAmount >= state.run.chips}
                >
                  +100
                </button>
              </div>
            </div>

            {/* Custom Input */}
            <div className="custom-bet">
              <label>Custom Amount:</label>
              <input
                type="number"
                min={state.minBet}
                max={state.run.chips}
                value={betAmount}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || state.minBet;
                  setBetAmount(Math.max(state.minBet, Math.min(value, state.run.chips)));
                }}
                className="bet-input"
              />
            </div>
            
            <p className="bet-amount-display">
              Bet Amount: <span className="neon-pink">{betAmount} chips</span>
            </p>
          </div>

          <div className="betting-actions">
            <button 
              className="btn btn-primary" 
              onClick={handlePlaceBet}
              disabled={betAmount < state.minBet || betAmount > state.run.chips}
            >
              Place Bet ({betAmount} chips)
            </button>
            
            {state.run.lives > 0 && (
              <button 
                className="btn btn-danger" 
                onClick={handleSellLife}
                style={{ marginTop: '15px' }}
              >
                Sell 1 Life for +{state.emergencyChipsAmount} Chips
              </button>
            )}
            
            {state.run.chips < state.minBet && state.run.lives <= 0 && (
              <p className="warning-message" style={{ color: '#ff0000', marginTop: '15px', textAlign: 'center' }}>
                No lives remaining. Game Over.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
