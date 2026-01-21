import { GameStateMachine } from '../game/stateMachine';
import { Card } from '../types';
import CardComponent from './CardComponent';
import './DeckViewer.css';

interface DeckViewerProps {
  state: GameStateMachine;
  onClose: () => void;
}

export default function DeckViewer({ state, onClose }: DeckViewerProps) {
  const shoe = state.run.shoe;
  
  // Count cards by rank (separate glitch cards)
  const cardCounts: Record<string, number> = {};
  const cardSamples: Record<string, Card> = {};
  let glitchCount = 0;
  let glitchSample: Card | null = null;
  
  shoe.forEach(card => {
    if (card.isGlitch) {
      glitchCount++;
      if (!glitchSample) {
        glitchSample = card;
      }
    } else {
      const key = card.rank;
      if (!cardCounts[key]) {
        cardCounts[key] = 0;
        cardSamples[key] = card;
      }
      cardCounts[key]++;
    }
  });
  
  const sortedRanks = Object.keys(cardCounts).sort((a, b) => {
    const order: Record<string, number> = {
      'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6,
      '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
    };
    return (order[a] || 99) - (order[b] || 99);
  });
  
  const totalCards = shoe.length;
  
  return (
    <div className="deck-viewer-overlay" onClick={onClose}>
      <div className="deck-viewer-panel panel" onClick={(e) => e.stopPropagation()}>
        <div className="deck-viewer-header">
          <h2 className="neon-text neon-cyan">Deck Composition</h2>
          <button className="btn" onClick={onClose} style={{ marginLeft: 'auto' }}>
            Close
          </button>
        </div>
        
        <div className="deck-stats">
          <div className="stat">
            <div className="stat-label">Total Cards</div>
            <div className="stat-value">{totalCards}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Remaining</div>
            <div className="stat-value">{totalCards}</div>
          </div>
        </div>
        
        <div className="deck-composition">
          <h3 className="section-title">Cards by Rank</h3>
          <div className="card-list">
            {sortedRanks.map(rank => {
              const count = cardCounts[rank];
              const sample = cardSamples[rank];
              const percentage = ((count / totalCards) * 100).toFixed(1);
              
              return (
                <div key={rank} className="card-entry">
                  <div className="card-preview">
                    <CardComponent card={sample} />
                  </div>
                  <div className="card-info">
                    <div className="card-rank-name">{rank === 'A' ? 'Ace' : rank === 'J' ? 'Jack' : rank === 'Q' ? 'Queen' : rank === 'K' ? 'King' : rank}</div>
                    <div className="card-count">
                      {count} card{count !== 1 ? 's' : ''} ({percentage}%)
                    </div>
                  </div>
                </div>
              );
            })}
            {glitchCount > 0 && glitchSample && (
              <div className="card-entry card-entry-glitch">
                <div className="card-preview">
                  <CardComponent card={glitchSample} />
                </div>
                <div className="card-info">
                  <div className="card-rank-name" style={{ color: '#ff00ff' }}>⚡ Glitch Card</div>
                  <div className="card-count">
                    {glitchCount} card{glitchCount !== 1 ? 's' : ''} ({((glitchCount / totalCards) * 100).toFixed(1)}%)
                  </div>
                  <div className="card-description" style={{ fontSize: '12px', opacity: 0.8, marginTop: '5px' }}>
                    Can count as any value 1-11
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {state.run.shoeHacks.some(h => h.purchased) && (
          <div className="active-hacks">
            <h3 className="section-title">Active Shoe Hacks</h3>
            <div className="hacks-list">
              {state.run.shoeHacks
                .filter(h => h.purchased)
                .map(hack => (
                  <div key={hack.id} className="hack-badge">
                    {hack.name}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
