import React from 'react';
import { useReducedMotion } from './hooks/useReducedMotion';

const InlineConfettiPiece: React.FC<{ delay: number; duration: number; color: string; initialX: number; initialRotation: number; }> = ({ delay, duration, color, initialX, initialRotation }) => {
  const styles: React.CSSProperties = {
    position: 'absolute',
    width: '6px',
    height: '12px',
    background: color,
    top: '-20px',
    left: `${initialX}%`,
    opacity: 0,
    animation: `fall-inline ${duration}s ease-out ${delay}s forwards`,
    transform: `rotate(${initialRotation}deg)`,
  };
  return <div style={styles} />;
};

const InlineConfetti: React.FC = () => {
  const reducedMotion = useReducedMotion();
  const numPieces = 30;
  const colors = ['#C75E4A', '#F9A826', '#5A9A78', '#4A90E2'];

  if (reducedMotion) {
      return null;
  }

  return (
    <>
      <style>{`
        @keyframes fall-inline {
          0% {
            opacity: 1;
            transform: translateY(0) rotate(var(--initial-rotation));
          }
          100% {
            opacity: 0;
            transform: translateY(150px) rotate(calc(var(--initial-rotation) + 360deg));
          }
        }
      `}</style>
      <div className="absolute inset-0 z-10 pointer-events-none">
        {Array.from({ length: numPieces }).map((_, index) => (
          <InlineConfettiPiece
            key={index}
            initialX={Math.random() * 100}
            initialRotation={Math.random() * 360}
            delay={Math.random() * 0.5}
            duration={1.5 + Math.random() * 1}
            color={colors[Math.floor(Math.random() * colors.length)]}
          />
        ))}
      </div>
    </>
  );
};

export default InlineConfetti;