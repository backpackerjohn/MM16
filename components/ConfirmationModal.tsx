import React, { useEffect } from 'react';
import ExclamationCircleIcon from './icons/ExclamationCircleIcon';
import Button from './ui/Button';
import ModalFooter from './ui/ModalFooter';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  isDestructive?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  isDestructive = false,
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
          {isDestructive && (
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
              <ExclamationCircleIcon className="h-6 w-6 text-[var(--color-danger)]" />
            </div>
          )}
          <div className="flex-1">
            <h2 id="confirmation-modal-title" className="text-xl font-bold text-[var(--color-text-primary)]">
              {title}
            </h2>
            <p className="text-[var(--color-text-secondary)] mt-2">
              {message}
            </p>
          </div>
        </div>

        <ModalFooter>
            <Button onClick={onClose} variant="secondary">
                Cancel
            </Button>
            <Button onClick={onConfirm} variant={isDestructive ? "destructive" : "primary"}>
                {confirmText}
            </Button>
        </ModalFooter>
      </div>
    </div>
  );
};

export default ConfirmationModal;