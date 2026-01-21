import { useState } from 'react';
import { GameStateMachine, purchaseShoeHack, proceedToNextWave } from '../game/stateMachine';
import DeckViewer from './DeckViewer';
import './ShopScreen.css';

interface ShopScreenProps {
  state: GameStateMachine;
  onUpdate: (state: GameStateMachine) => void;
}

export default function ShopScreen({ state, onUpdate }: ShopScreenProps) {
  const [showDeckViewer, setShowDeckViewer] = useState(false);

  const handlePurchaseHack = (hackId: string) => {
    const newState = purchaseShoeHack(state, hackId);
    onUpdate(newState);
    // If deck viewer is open, it will automatically update with new state
  };

  const handleContinue = () => {
    onUpdate(proceedToNextWave(state));
  };

  const isLastWave = state.run.wave >= 10;
  const isBossWave = state.currentDealer?.isBoss;

  return (
    <div className="screen">
      <h2 className="screen-title neon-text neon-cyan">Shop</h2>
      <div className="shop-content">
        <div className="shop-stats panel">
          <div className="stat">
            <div className="stat-label">Chips</div>
            <div className="stat-value">{state.run.chips}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Lives</div>
            <div className="stat-value" style={{ color: state.run.lives > 0 ? '#ff0000' : '#666' }}>
              {state.run.lives}
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">Wave</div>
            <div className="stat-value">
              {state.run.config.mode === 'STAGE' 
                ? `${state.run.wave}/25`
                : state.run.wave}
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">Score</div>
            <div className="stat-value">{state.run.score}</div>
          </div>
        </div>

        <div className="shop-actions-top">
          <button 
            className="btn" 
            onClick={() => setShowDeckViewer(true)}
          >
            View Deck ({state.run.shoe.length} cards)
          </button>
        </div>

        <div className="shop-section panel">
          <h3 className="section-title">Shoe Hacks</h3>
          <div className="hacks-grid">
            {state.run.shoeHacks.map(hack => (
              <div 
                key={hack.id} 
                className={`hack-item ${hack.purchased ? 'purchased' : ''}`}
              >
                <h4 className="hack-name">{hack.name}</h4>
                <p className="hack-description">{hack.description}</p>
                <div className="hack-cost">
                  {hack.purchased ? (
                    <span className="purchased-badge">PURCHASED</span>
                  ) : (
                    <>
                      <span>
                        {Math.floor(hack.cost * state.run.config.difficultyMultiplier)} chips
                        {state.run.config.ascensionLevel > 0 && (
                          <span style={{ fontSize: '10px', opacity: 0.7, marginLeft: '5px' }}>
                            (base: {hack.cost})
                          </span>
                        )}
                      </span>
                      <button
                        className="btn btn-primary"
                        onClick={() => handlePurchaseHack(hack.id)}
                        disabled={state.run.chips < Math.floor(hack.cost * state.run.config.difficultyMultiplier)}
                      >
                        Buy
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="shop-section panel">
          <h3 className="section-title">Action Cards</h3>
          <p style={{ opacity: 0.7, textAlign: 'center' }}>
            Action cards are available during hands. (MVP: All cards available, no purchase needed)
          </p>
        </div>

        <div className="continue-section">
          <button className="btn btn-primary" onClick={handleContinue} style={{ fontSize: '18px', padding: '15px 30px' }}>
            {isLastWave ? 'View Results' : 'Continue to Wave ' + (state.run.wave + 1)}
          </button>
          <p style={{ marginTop: '10px', opacity: 0.7, fontSize: '14px', textAlign: 'center' }}>
            You can continue without purchasing anything
          </p>
        </div>
      </div>
      
      {showDeckViewer && (
        <DeckViewer 
          state={state} 
          onClose={() => setShowDeckViewer(false)} 
        />
      )}
    </div>
  );
}
