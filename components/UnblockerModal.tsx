import React, { useState, useEffect } from 'react';

interface UnblockerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (suggestionText: string) => void;
  suggestion: string;
  isLoading: boolean;
  blockedStepText: string;
}

const UnblockerModal: React.FC<UnblockerModalProps> = ({ 
  isOpen, 
  onClose, 
  onAccept, 
  suggestion, 
  isLoading,
  blockedStepText
}) => {
  const [editedSuggestion, setEditedSuggestion] = useState('');

  useEffect(() => {
    if (suggestion) {
      setEditedSuggestion(suggestion);
    }
  }, [suggestion]);

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

  const handleAccept = () => {
    onAccept(editedSuggestion);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 transition-opacity duration-300"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="unblocker-modal-title"
    >
      <div 
        className="bg-[var(--color-surface)] rounded-2xl shadow-2xl p-8 w-full max-w-lg transform transition-all duration-300 scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={(e) => { e.preventDefault(); handleAccept(); }}>
            <h2 id="unblocker-modal-title" className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
            Feeling Stuck?
            </h2>
            <p className="text-[var(--color-text-secondary)] mb-4">
                You're blocked on: <span className="font-semibold text-[var(--color-text-primary)]">"{blockedStepText}"</span>
            </p>
            
            <div className="mt-6 p-4 border bg-[var(--color-surface-sunken)] rounded-lg min-h-[160px] flex items-center justify-center">
            {isLoading ? (
                <div className="text-center text-[var(--color-text-secondary)]">
                    <svg className="animate-spin mx-auto h-8 w-8 text-[var(--color-primary-accent)] mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <p className="font-semibold">AI is thinking of a micro-step to get you unblocked...</p>
                </div>
            ) : (
                <div>
                <label htmlFor="suggestion-textarea" className="font-semibold text-[var(--color-text-primary)]">Here's a small first step to try:</label>
                <textarea 
                    id="suggestion-textarea"
                    value={editedSuggestion}
                    onChange={(e) => setEditedSuggestion(e.target.value)}
                    className="mt-2 w-full h-24 p-3 border border-[var(--color-border)] rounded-md focus:ring-2 focus:ring-[var(--color-primary-accent)] transition-shadow resize-y bg-transparent" 
                    aria-label="AI suggestion for unblocking task"
                    autoFocus
                />
                </div>
            )}
            </div>

            <div className="mt-6 flex justify-end items-center space-x-2">
            <button 
                type="button"
                onClick={onClose} 
                className="px-6 py-2 font-semibold text-[var(--color-text-secondary)] bg-transparent hover:bg-[var(--color-surface-sunken)] rounded-lg transition-all"
            >
                Ignore
            </button>
            <button 
                type="submit"
                disabled={isLoading || !editedSuggestion.trim()}
                className="px-6 py-2 font-bold text-[var(--color-primary-accent-text)] bg-[var(--color-primary-accent)] rounded-lg hover:bg-[var(--color-primary-accent-hover)] transition-all shadow-md disabled:bg-stone-400 disabled:cursor-not-allowed"
            >
                Accept and Add Step
            </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default UnblockerModal;