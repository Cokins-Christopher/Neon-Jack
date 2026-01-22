import { useState } from 'react';
import { GameStateMachine, buyShopItem, proceedToNextWave } from '../game/stateMachine';
import { ShopItem, Rarity } from '../types';
import { getShoeHack } from '../game/shoeHacks';
import { getActionCard } from '../game/actionCards';
import DeckViewer from './DeckViewer';
import './ShopScreen.css';

interface ShopScreenProps {
  state: GameStateMachine;
  onUpdate: (state: GameStateMachine) => void;
}

const RARITY_COLORS: Record<Rarity, string> = {
  COMMON: '#ffffff',
  UNCOMMON: '#00ff00',
  RARE: '#0088ff',
  BOSS: '#ff00ff',
};

const RARITY_NAMES: Record<Rarity, string> = {
  COMMON: 'Common',
  UNCOMMON: 'Uncommon',
  RARE: 'Rare',
  BOSS: 'Boss',
};

export default function ShopScreen({ state, onUpdate }: ShopScreenProps) {
  const [showDeckViewer, setShowDeckViewer] = useState(false);

  const handleBuyItem = (itemIndex: number) => {
    const newState = buyShopItem(state, itemIndex);
    onUpdate(newState);
  };

  const handleContinue = () => {
    onUpdate(proceedToNextWave(state));
  };

  const isLastWave = state.run.config.mode === 'STAGE' && state.run.wave >= 25;

  const renderShopItem = (item: ShopItem, index: number) => {
    const canAfford = item.cost <= state.run.chips;
    let isMaxed = false;
    let stacks = 0;
    let description = '';
    let name = '';

    if (item.kind === 'SHOE_HACK') {
      const hack = getShoeHack(item.id);
      if (hack) {
        name = hack.name;
        stacks = state.run.ownedShoeHacks[item.id]?.stacks || 0;
        isMaxed = stacks >= hack.maxStacks;
        description = typeof hack.description === 'function' 
          ? hack.description(stacks + 1) 
          : hack.description;
      }
    } else if (item.kind === 'ACTION_CARD') {
      const card = getActionCard(item.id);
      if (card) {
        name = card.name;
        description = card.description;
      }
    } else if (item.kind === 'REROLL_SHOP') {
      name = 'Reroll Shop';
      description = 'Generate a new shop inventory';
    } else if (item.kind === 'REMOVE_ACTION_CARD') {
      name = 'Remove Action Card';
      description = `Remove a random action card from your deck (${state.run.actionDeck.length} cards)`;
    }

    const disabled = !canAfford || isMaxed;

    return (
      <div 
        key={index} 
        className={`shop-item ${disabled ? 'disabled' : ''}`}
        style={{
          borderColor: item.kind !== 'REROLL_SHOP' && item.kind !== 'REMOVE_ACTION_CARD' 
            ? RARITY_COLORS[item.rarity] 
            : '#00ffff',
        }}
      >
        <div className="shop-item-header">
          <h4 className="shop-item-name">{name}</h4>
          <span 
            className="shop-item-rarity"
            style={{ color: RARITY_COLORS[item.rarity] }}
          >
            {RARITY_NAMES[item.rarity]}
          </span>
        </div>
        <p className="shop-item-description">{description}</p>
        {item.kind === 'SHOE_HACK' && stacks > 0 && (
          <p className="shop-item-stacks" style={{ color: '#00ffff' }}>
            Stacks: {stacks}/{getShoeHack(item.id)?.maxStacks || 1}
          </p>
        )}
        <div className="shop-item-footer">
          <span className="shop-item-cost">{item.cost} chips</span>
          <button
            className="btn btn-primary"
            onClick={() => handleBuyItem(index)}
            disabled={disabled}
          >
            {isMaxed ? 'MAXED' : 'Buy'}
          </button>
        </div>
      </div>
    );
  };

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
            <div className="stat-label">Action Deck</div>
            <div className="stat-value">{state.run.actionDeck.length}</div>
          </div>
        </div>

        <div className="shop-section panel">
          <h3 className="section-title">Shop Inventory</h3>
          {state.run.shop.items.length === 0 ? (
            <p style={{ textAlign: 'center', opacity: 0.7, padding: '20px' }}>
              Shop is empty. Continue to next wave.
            </p>
          ) : (
            <div className="shop-items">
              {state.run.shop.items.map((item, index) => renderShopItem(item, index))}
            </div>
          )}
        </div>

        <div className="shop-section panel">
          <h3 className="section-title">Owned Shoe Hacks</h3>
          {Object.keys(state.run.ownedShoeHacks).length === 0 ? (
            <p style={{ textAlign: 'center', opacity: 0.7, padding: '20px' }}>
              No shoe hacks owned yet.
            </p>
          ) : (
            <div className="owned-hacks">
              {Object.entries(state.run.ownedShoeHacks).map(([hackId, { stacks }]) => {
                const hack = getShoeHack(hackId);
                if (!hack) return null;
                const description = typeof hack.description === 'function' 
                  ? hack.description(stacks) 
                  : hack.description;
                return (
                  <div key={hackId} className="owned-hack-item">
                    <h4>{hack.name}</h4>
                    <p>{description}</p>
                    <span style={{ color: RARITY_COLORS[hack.rarity] }}>
                      {RARITY_NAMES[hack.rarity]} • Stacks: {stacks}/{hack.maxStacks}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="continue-section">
          <button 
            className="btn btn-secondary" 
            onClick={() => setShowDeckViewer(true)}
            style={{ marginBottom: '10px' }}
          >
            View Deck
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleContinue}
            style={{ fontSize: '18px', padding: '15px 30px' }}
          >
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
