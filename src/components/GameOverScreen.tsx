import './GameOverScreen.css';

import { GameStateMachine } from '../game/stateMachine';

interface GameOverScreenProps {
  state: GameStateMachine;
  onRestart: () => void;
}

export default function GameOverScreen({ state, onRestart }: GameOverScreenProps) {
  return (
    <div className="screen">
      <div className="panel panel-danger">
        <h1 className="screen-title neon-text" style={{ color: '#ff0000' }}>
          GAME OVER
        </h1>
        <div className="game-over-content">
          <div className="final-stats">
            <div className="stat">
              <div className="stat-label">Waves Cleared</div>
              <div className="stat-value" style={{ color: '#ff0000' }}>
                {state.run.wave}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Final Chips</div>
              <div className="stat-value" style={{ color: '#ff0000' }}>
                {state.run.chips}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Score</div>
              <div className="stat-value" style={{ color: '#ff0000' }}>
                {state.run.score}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Mode</div>
              <div className="stat-value" style={{ color: '#ff0000', fontSize: '16px' }}>
                {state.run.config.mode}
              </div>
            </div>
            {state.run.config.ascensionLevel > 0 && (
              <div className="stat">
                <div className="stat-label">Ascension</div>
                <div className="stat-value" style={{ color: '#ff0000', fontSize: '16px' }}>
                  {state.run.config.ascensionLevel}
                </div>
              </div>
            )}
          </div>
          <button className="btn btn-primary" onClick={onRestart}>
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
