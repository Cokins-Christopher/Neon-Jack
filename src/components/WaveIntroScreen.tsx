import { GameStateMachine, proceedToBetting } from '../game/stateMachine';
import './WaveIntroScreen.css';

interface WaveIntroScreenProps {
  state: GameStateMachine;
  onUpdate: (state: GameStateMachine) => void;
}

export default function WaveIntroScreen({ state, onUpdate }: WaveIntroScreenProps) {
  const dealer = state.currentDealer!;
  const isBoss = dealer.isBoss;

  const handleContinue = () => {
    onUpdate(proceedToBetting(state));
  };

  return (
    <div className="screen">
      <h2 className="screen-title neon-text neon-cyan">Wave {state.run.wave}</h2>
      <div className="wave-intro-content">
        <div className={`panel ${isBoss ? 'panel-pink' : ''}`}>
          <h3 className={`dealer-name ${isBoss ? 'neon-pink boss-glitch' : 'neon-cyan'}`}>
            {isBoss && '⚡ '}
            {dealer.name}
            {isBoss && ' ⚡'}
          </h3>
          <p className="dealer-description">{dealer.description}</p>
          
          {dealer.abilities.length > 0 && (
            <div className="abilities">
              <h4 className="abilities-title">Abilities:</h4>
              {dealer.abilities.map(ability => (
                <div key={ability.id} className="ability">
                  <span className="ability-name">{ability.name}</span>
                  <span className="ability-desc">: {ability.description}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="wave-stats">
          <div className="stat">
            <div className="stat-label">Minimum Bet</div>
            <div className="stat-value">{state.minBet}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Your Chips</div>
            <div className="stat-value">{state.run.chips}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Lives</div>
            <div className="stat-value">{state.run.lives}</div>
          </div>
          <div className="stat">
            <div className="stat-label">Wave</div>
            <div className="stat-value">
              {state.run.config.mode === 'STAGE' 
                ? `${state.run.wave}/25`
                : state.run.wave}
            </div>
          </div>
          {state.run.config.ascensionLevel > 0 && (
            <div className="stat">
              <div className="stat-label">Ascension</div>
              <div className="stat-value">{state.run.config.ascensionLevel}</div>
            </div>
          )}
        </div>

        <button className="btn btn-primary" onClick={handleContinue}>
          Continue
        </button>
      </div>
    </div>
  );
}
