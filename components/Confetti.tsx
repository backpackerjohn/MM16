import React from 'react';

const ConfettiPiece: React.FC<{ initialX: number; delay: number; duration: number; color: string }> = ({
  initialX,
  delay,
  duration,
  color,
}) => {
  const styles: React.CSSProperties = {
    position: 'absolute',
    width: '8px',
    height: '16px',
    background: color,
    top: '-20px',
    left: `${initialX}%`,
    opacity: 0,
    animation: `fall ${duration}s linear ${delay}s infinite`,
  };

  return <div style={styles} />;
};

const Confetti: React.FC = () => {
  const numPieces = 100;
  const colors = ['#C75E4A', '#F9A826', '#5A9A78', '#4A90E2', '#D0021B'];

  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
       <style>
        {`
          @keyframes fall {
            0% {
              opacity: 1;
              transform: translateY(0) rotateZ(0deg);
            }
            100% {
              opacity: 0.5;
              transform: translateY(100vh) rotateZ(720deg);
            }
          }
        `}
      </style>
      {Array.from({ length: numPieces }).map((_, index) => (
        <ConfettiPiece
          key={index}
          initialX={Math.random() * 100}
          delay={Math.random() * 5}
          duration={3 + Math.random() * 4}
          color={colors[Math.floor(Math.random() * colors.length)]}
        />
      ))}
    </div>
  );
};

export default Confetti;
