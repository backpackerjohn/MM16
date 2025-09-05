import React, { useEffect, useState } from 'react';
import { UndoAction } from '../types';
import UndoIcon from './icons/UndoIcon';

interface UndoToastProps {
  action: UndoAction | null;
  onUndo: () => void;
  onDismiss: () => void;
}

const UndoToast: React.FC<UndoToastProps> = ({ action, onUndo, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (action) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDismiss, 300); // Allow fade-out
      }, 5000); // 5 seconds to undo

      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [action, onDismiss]);

  const handleUndoClick = () => {
    onUndo();
  };

  return (
    <div
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[80] transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
      role="alert"
      aria-live="assertive"
    >
      <div className="bg-[var(--color-surface)] rounded-xl shadow-2xl p-4 w-full max-w-md border border-[var(--color-border)] flex items-center gap-4">
        <p className="text-sm font-semibold text-[var(--color-text-primary)] flex-1">{action?.message}</p>
        <button
          onClick={handleUndoClick}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-[var(--color-primary-accent)] bg-[var(--color-surface-sunken)] hover:bg-[var(--color-border)] rounded-lg border border-[var(--color-border-hover)]"
        >
          <UndoIcon className="h-4 w-4" />
          Undo
        </button>
      </div>
    </div>
  );
};

export default UndoToast;
