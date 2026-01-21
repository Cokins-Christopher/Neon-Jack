import './VictoryScreen.css';

import { GameStateMachine } from '../game/stateMachine';

interface VictoryScreenProps {
  state: GameStateMachine;
  onRestart: () => void;
}

export default function VictoryScreen({ state, onRestart }: VictoryScreenProps) {
  return (
    <div className="screen">
      <div className="panel panel-green">
        <h1 className="screen-title neon-text neon-green">
          ⚡ VICTORY ⚡
        </h1>
        <div className="victory-content">
          <p className="victory-message">
            You defeated THE HOUSE!
          </p>
          <div className="final-stats">
            <div className="stat">
              <div className="stat-label">Waves Cleared</div>
              <div className="stat-value" style={{ color: '#00ff00' }}>
                {state.run.wave}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Final Chips</div>
              <div className="stat-value" style={{ color: '#00ff00' }}>
                {state.run.chips}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Score</div>
              <div className="stat-value" style={{ color: '#00ff00' }}>
                {state.run.score}
              </div>
            </div>
            {state.run.config.ascensionLevel > 0 && (
              <div className="stat">
                <div className="stat-label">Ascension</div>
                <div className="stat-value" style={{ color: '#00ff00', fontSize: '16px' }}>
                  {state.run.config.ascensionLevel}
                </div>
              </div>
            )}
          </div>
          <button className="btn btn-primary" onClick={onRestart}>
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
}
