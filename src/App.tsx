import { useState, useCallback } from 'react';
import { GameStateMachine, createInitialState, startNewRun, createStageModeConfig, createSurvivalModeConfig } from './game/stateMachine';
import { RunMode } from './types';
import MenuScreen from './components/MenuScreen';
import WaveIntroScreen from './components/WaveIntroScreen';
import EmergencyChipsScreen from './components/EmergencyChipsScreen';
import BettingScreen from './components/BettingScreen';
import HandScreen from './components/HandScreen';
import HandResolutionScreen from './components/HandResolutionScreen';
import ShopScreen from './components/ShopScreen';
import GameOverScreen from './components/GameOverScreen';
import VictoryScreen from './components/VictoryScreen';
import './App.css';

function App() {
  const [gameState, setGameState] = useState<GameStateMachine>(createInitialState());

  const updateState = useCallback((newState: GameStateMachine) => {
    setGameState(newState);
  }, []);

  // Phase 2: Updated to accept mode and ascension
  const handleStartNewRun = useCallback((mode: RunMode, ascensionLevel: number) => {
    const config = mode === 'STAGE' 
      ? createStageModeConfig(ascensionLevel)
      : createSurvivalModeConfig(ascensionLevel);
    setGameState(startNewRun(gameState, config));
  }, [gameState]);

  const renderScreen = () => {
    switch (gameState.state) {
      case 'MENU':
        return <MenuScreen onStart={handleStartNewRun} />;
      case 'WAVE_INTRO':
        return <WaveIntroScreen state={gameState} onUpdate={updateState} />;
      case 'EMERGENCY_CHIPS':
        return <EmergencyChipsScreen state={gameState} onUpdate={updateState} />;
      case 'BETTING':
        return <BettingScreen state={gameState} onUpdate={updateState} />;
      case 'HAND':
        return <HandScreen state={gameState} onUpdate={updateState} />;
      case 'HAND_RESOLUTION':
        return <HandResolutionScreen state={gameState} onUpdate={updateState} />;
      case 'SHOP':
        return <ShopScreen state={gameState} onUpdate={updateState} />;
      case 'GAME_OVER':
        return <GameOverScreen state={gameState} onRestart={() => setGameState(createInitialState())} />;
      case 'VICTORY':
        return <VictoryScreen state={gameState} onRestart={() => setGameState(createInitialState())} />;
      default:
        return <MenuScreen onStart={handleStartNewRun} />;
    }
  };

  return (
    <div className="app">
      {renderScreen()}
    </div>
  );
}

export default App;
