import React, { useEffect, useRef } from 'react';
import XIcon from '../icons/XIcon';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Focus trapping
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // If focus is already inside the modal (e.g., from an autoFocus prop), don't move it.
    if (!modalRef.current.contains(document.activeElement)) {
        firstElement?.focus();
    }

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) { // Shift+Tab
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else { // Tab
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    const modalElement = modalRef.current;
    modalElement.addEventListener('keydown', handleTabKey);

    return () => {
      modalElement?.removeEventListener('keydown', handleTabKey);
    };
  }, [isOpen]);


  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 transition-opacity duration-300 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className="bg-[var(--color-surface)] rounded-[var(--border-radius-xl)] shadow-2xl w-full max-w-2xl transform transition-all duration-300 scale-100 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-6 border-b border-[var(--color-border)] flex justify-between items-center flex-shrink-0">
            <h2 id="modal-title" className="text-2xl font-bold text-[var(--color-text-primary)]">
                {title}
            </h2>
            <button 
                onClick={onClose} 
                className="p-1 rounded-full text-[var(--color-text-subtle)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-text-primary)]"
                aria-label="Close modal"
            >
                <XIcon className="h-6 w-6" />
            </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
            {children}
        </div>
        
        {footer && (
            <footer className="flex-shrink-0 px-6 pb-6">
                {footer}
            </footer>
        )}
      </div>
    </div>
  );
};

export default Modal;
