import React, { useState, useEffect } from 'react';
import { FLAGS } from '../../utils/gamificationConfig';

interface ReflectionInterstitialProps {
  onDismiss: () => void;
  onSelectAction: (action: 'continue' | 'switch_task' | 'log_blocker') => void;
}

const ReflectionInterstitial: React.FC<ReflectionInterstitialProps> = ({ onDismiss, onSelectAction }) => {
  const [countdown, setCountdown] = useState(FLAGS.REFLECTION_GATE_SECONDS);

  useEffect(() => {
    if (countdown <= 0) {
      onDismiss();
      return;
    }

    const timer = setInterval(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, onDismiss]);

  const handleAction = (action: 'continue' | 'switch_task' | 'log_blocker') => {
    onSelectAction(action);
    onDismiss();
  };
  
  const progress = (countdown / FLAGS.REFLECTION_GATE_SECONDS) * 100;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-[90] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-2xl p-8 w-full max-w-lg text-center transform transition-all relative">
        <div className="absolute top-0 left-0 h-1 bg-[var(--color-primary-accent)]" style={{ width: `${progress}%`, transition: 'width 1s linear' }}></div>
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Timer Complete!</h2>
        <p className="mt-2 text-[var(--color-text-secondary)]">Take a deep breath. What's next?</p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
                onClick={() => handleAction('continue')}
                className="p-4 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface-sunken)] hover:border-[var(--color-primary-accent)] transition-colors"
            >
                <span className="text-2xl">➡️</span>
                <p className="font-semibold mt-2">Continue Next Step</p>
            </button>
            <button
                onClick={() => handleAction('switch_task')}
                className="p-4 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface-sunken)] hover:border-[var(--color-primary-accent)] transition-colors"
            >
                <span className="text-2xl">🔄</span>
                <p className="font-semibold mt-2">Switch Task</p>
            </button>
            <button
                onClick={() => handleAction('log_blocker')}
                className="p-4 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface-sunken)] hover:border-[var(--color-primary-accent)] transition-colors"
            >
                <span className="text-2xl">🚧</span>
                <p className="font-semibold mt-2">Log a Blocker</p>
            </button>
        </div>
         <p className="text-xs text-[var(--color-text-subtle)] mt-6">Auto-continuing in {countdown}s...</p>
      </div>
    </div>
  );
};

export default ReflectionInterstitial;
