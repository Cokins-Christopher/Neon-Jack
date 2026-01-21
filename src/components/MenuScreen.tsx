import { useState } from 'react';
import { RunMode } from '../types';
import './MenuScreen.css';

interface MenuScreenProps {
  onStart: (mode: RunMode, ascensionLevel: number) => void;
}

export default function MenuScreen({ onStart }: MenuScreenProps) {
  const [selectedMode, setSelectedMode] = useState<RunMode>('STAGE');
  const [ascensionLevel, setAscensionLevel] = useState(0);

  return (
    <div className="screen menu-screen">
      <h1 className="screen-title neon-text neon-cyan">NEON JACK</h1>
      <div className="menu-content">
        <p className="menu-subtitle neon-pink">Cyberpunk Blackjack Roguelike</p>
        
        {/* Phase 2: Mode Selection */}
        <div className="mode-selection">
          <h3 className="section-title">Select Mode</h3>
          <div className="mode-buttons">
            <button
              className={`btn ${selectedMode === 'STAGE' ? 'btn-primary' : ''}`}
              onClick={() => setSelectedMode('STAGE')}
            >
              Stage Mode
            </button>
            <button
              className={`btn ${selectedMode === 'SURVIVAL' ? 'btn-primary' : ''}`}
              onClick={() => setSelectedMode('SURVIVAL')}
            >
              Survival Mode
            </button>
          </div>
          <div className="mode-description">
            {selectedMode === 'STAGE' ? (
              <p>Face 25 waves. Defeat all 5 bosses to win.</p>
            ) : (
              <p>Infinite waves. Survive as long as possible.</p>
            )}
          </div>
        </div>

        {/* Phase 2: Ascension Selection */}
        <div className="ascension-selection">
          <label className="ascension-label">
            Ascension Level: <span className="neon-cyan">{ascensionLevel}</span>
          </label>
          <input
            type="range"
            min="0"
            max="10"
            value={ascensionLevel}
            onChange={(e) => setAscensionLevel(parseInt(e.target.value))}
            className="ascension-slider"
          />
          <p className="ascension-info">
            {ascensionLevel === 0 
              ? 'Base difficulty'
              : `+${(ascensionLevel * 10).toFixed(0)}% starting chips & bets, -${(ascensionLevel * 10).toFixed(0)}% emergency chips`}
          </p>
        </div>

        <button 
          className="btn btn-primary" 
          onClick={() => onStart(selectedMode, ascensionLevel)}
          style={{ fontSize: '18px', padding: '15px 30px', marginTop: '20px' }}
        >
          Start {selectedMode === 'STAGE' ? 'Stage' : 'Survival'} Run
        </button>
        
        <div className="menu-info">
          {selectedMode === 'STAGE' ? (
            <>
              <p>Face 25 waves of dealers</p>
              <p>Defeat all 5 bosses to win</p>
              <p>Bosses at waves 5, 10, 15, 20, 25</p>
            </>
          ) : (
            <>
              <p>Infinite waves</p>
              <p>Survive as long as possible</p>
              <p>Score = waves survived</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
