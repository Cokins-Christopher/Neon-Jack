import { GameStateMachine, acceptEmergencyChips } from '../game/stateMachine';
import './EmergencyChipsScreen.css';

interface EmergencyChipsScreenProps {
  state: GameStateMachine;
  onUpdate: (state: GameStateMachine) => void;
}

export default function EmergencyChipsScreen({ state, onUpdate }: EmergencyChipsScreenProps) {
  const handleAccept = () => {
    onUpdate(acceptEmergencyChips(state));
  };

  const handleDecline = () => {
    // Game over
    onUpdate({
      ...state,
      state: 'GAME_OVER',
    });
  };

  return (
    <div className="screen">
      <div className="panel panel-danger">
        <h2 className="neon-text" style={{ color: '#ff0000', marginBottom: '20px' }}>
          ⚠️ EMERGENCY CHIPS REQUIRED ⚠️
        </h2>
        <p style={{ marginBottom: '20px', fontSize: '18px' }}>
          You don't have enough chips for the minimum bet ({state.minBet} chips).
        </p>
        <p style={{ marginBottom: '20px' }}>
          Sacrifice <span className="neon-pink" style={{ fontSize: '24px', fontWeight: 'bold' }}>1 LIFE</span> to receive{' '}
          <span className="neon-green" style={{ fontSize: '24px', fontWeight: 'bold' }}>+{state.emergencyChipsAmount} CHIPS</span>?
        </p>
        <div className="emergency-stats">
          <div className="stat">
            <div className="stat-label">Current Lives</div>
            <div className="stat-value" style={{ color: state.run.lives > 0 ? '#ff0000' : '#666' }}>
              {state.run.lives}
            </div>
          </div>
          <div className="stat">
            <div className="stat-label">After Sacrifice</div>
            <div className="stat-value" style={{ color: state.run.lives > 1 ? '#ff0000' : '#666' }}>
              {state.run.lives - 1}
            </div>
          </div>
        </div>
        <div className="emergency-actions">
          <button className="btn btn-danger" onClick={handleAccept} disabled={state.run.lives <= 0}>
            Accept ({state.run.lives > 0 ? 'Sacrifice 1 Life' : 'No Lives Left'})
          </button>
          <button className="btn" onClick={handleDecline}>
            Decline (Game Over)
          </button>
        </div>
      </div>
    </div>
  );
}
