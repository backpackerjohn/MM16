import React, { useEffect, useState } from 'react';
import CheckCircleIcon from './icons/CheckCircleIcon';

interface SuccessToastProps {
  message: string | null;
  onDismiss: () => void;
}

const SuccessToast: React.FC<SuccessToastProps> = ({ message, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        // Allow fade-out animation before clearing message
        setTimeout(onDismiss, 300);
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [message, onDismiss]);

  return (
    <div
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[80] transition-all duration-300 ${
        isVisible && message ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
      role="alert"
      aria-live="assertive"
    >
      <div className="bg-[var(--color-surface)] rounded-xl shadow-2xl p-4 w-full max-w-md border border-[var(--color-border)] flex items-center gap-3">
        <CheckCircleIcon className="h-6 w-6 text-[var(--color-success)] flex-shrink-0" />
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">{message}</p>
      </div>
    </div>
  );
};

export default SuccessToast;
