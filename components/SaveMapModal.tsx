import React, { useState, useEffect } from 'react';

interface SaveMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: string) => void;
}

const SaveMapModal: React.FC<SaveMapModalProps> = ({ isOpen, onClose, onSave }) => {
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => setNote(''), 300); // Reset after closing animation
    }
  }, [isOpen]);

  const handleSubmit = () => {
    onSave(note || 'No note added.');
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex items-center justify-center p-4 transition-opacity duration-300"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-map-modal-title"
    >
      <div 
        className="bg-[var(--color-surface)] rounded-2xl shadow-2xl p-8 w-full max-w-lg transform transition-all duration-300 scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
            <h2 id="save-map-modal-title" className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
            Save Momentum Map
            </h2>
            <p className="text-[var(--color-text-secondary)] mb-4">
            Add an optional note to remember your progress or context.
            </p>
            
            <div className="space-y-4">
            <div>
                <label htmlFor="note-input" className="block text-sm font-semibold text-[var(--color-text-primary)] mb-1">
                Add a note to remember where you left off:
                </label>
                <textarea 
                id="note-input"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full h-24 p-3 border border-[var(--color-border)] rounded-md focus:ring-2 focus:ring-[var(--color-primary-accent)] transition-shadow resize-y bg-transparent" 
                placeholder="e.g., Paused after chunk 2, continue with chunk 3 tomorrow..."
                autoFocus
                />
            </div>
            </div>

            <div className="mt-6 flex justify-end items-center space-x-4">
            <button 
                type="button"
                onClick={onClose} 
                className="px-6 py-2 font-semibold text-[var(--color-text-secondary)] bg-transparent border border-[var(--color-border)] hover:bg-[var(--color-surface-sunken)] rounded-lg transition-all"
            >
                Cancel
            </button>
            <button 
                type="submit"
                className="px-6 py-2 font-bold text-[var(--color-primary-accent-text)] bg-[var(--color-primary-accent)] rounded-lg hover:bg-[var(--color-primary-accent-hover)] transition-all shadow-md"
            >
                Save Map
            </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default SaveMapModal;