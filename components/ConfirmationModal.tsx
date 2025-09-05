import React, { useEffect } from 'react';
import ExclamationCircleIcon from './icons/ExclamationCircleIcon';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
}) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex items-center justify-center p-4 transition-opacity duration-300 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-modal-title"
    >
      <div
        className="bg-[var(--color-surface)] rounded-2xl shadow-2xl p-8 w-full max-w-md transform transition-all duration-300 scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
            <ExclamationCircleIcon className="h-6 w-6 text-[var(--color-danger)]" />
          </div>
          <div className="flex-1">
            <h2 id="confirmation-modal-title" className="text-xl font-bold text-[var(--color-text-primary)]">
              {title}
            </h2>
            <p className="text-[var(--color-text-secondary)] mt-2">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-4">
          <button
            onClick={onClose}
            className="mt-3 sm:mt-0 w-full sm:w-auto px-6 py-2 font-semibold text-[var(--color-text-secondary)] bg-transparent border border-[var(--color-border)] hover:bg-[var(--color-surface-sunken)] rounded-lg transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="w-full sm:w-auto px-6 py-2 font-bold text-[var(--color-danger-text)] bg-[var(--color-danger)] rounded-lg hover:bg-[var(--color-danger-hover)] transition-all shadow-md"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
