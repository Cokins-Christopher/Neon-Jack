import { Card } from '../types';
import './CardComponent.css';

interface CardComponentProps {
  card: Card;
  hidden?: boolean;
}

export default function CardComponent({ card, hidden }: CardComponentProps) {
  if (hidden) {
    return (
      <div className="card card-back">
        <div className="card-pattern">?</div>
      </div>
    );
  }

  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const suitSymbol = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
  }[card.suit];

  return (
    <div className={`card ${isRed ? 'card-red' : 'card-black'} ${card.isGlitch ? 'card-glitch' : ''} card-deal-animation`}>
      <div className="card-rank">
        {card.isGlitch ? '⚡' : card.rank}
      </div>
      <div className="card-suit">
        {card.isGlitch ? '⚡' : suitSymbol}
      </div>
      {card.isGlitch && (
        <div className="card-glitch-label">GLITCH</div>
      )}
    </div>
  );
}
