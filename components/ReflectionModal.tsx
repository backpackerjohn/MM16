import React, { useState, useEffect } from 'react';
import { Chunk, Reflection } from '../types';

interface ReflectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (chunkId: string, reflection: Reflection) => void;
  chunk: Chunk | null;
  onSuccess: (message: string) => void;
}

const ReflectionModal: React.FC<ReflectionModalProps> = ({ isOpen, onClose, onSave, chunk, onSuccess }) => {
  const [helped, setHelped] = useState('');
  const [trippedUp, setTrippedUp] = useState('');

  useEffect(() => {
    if (!isOpen) {
      // Reset fields when closing
      setTimeout(() => {
        setHelped('');
        setTrippedUp('');
      }, 300); // delay to allow for exit animation
    }
  }, [isOpen]);
  
  const handleSubmit = () => {
    if (!chunk) return;
    onSave(chunk.id, { helped, trippedUp });
    onSuccess("Reflection saved. Great insight!");
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 transition-opacity duration-300"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reflection-modal-title"
    >
      <div 
        className="bg-[var(--color-surface)] rounded-2xl shadow-2xl p-8 w-full max-w-lg transform transition-all duration-300 scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="reflection-modal-title" className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
          Chunk Complete! Time to Reflect.
        </h2>
        <p className="text-[var(--color-text-secondary)] mb-6">
            You just finished: <span className="font-semibold text-[var(--color-text-primary)]">"{chunk?.title}"</span>
        </p>
        
        <div className="space-y-4">
            <div>
                <label htmlFor="helped-input" className="block text-sm font-semibold text-[var(--color-text-primary)] mb-1">
                    What went well with this chunk?
                </label>
                <textarea 
                    id="helped-input"
                    value={helped}
                    onChange={(e) => setHelped(e.target.value)}
                    className="w-full h-24 p-3 border border-[var(--color-border)] rounded-md focus:ring-2 focus:ring-[var(--color-primary-accent)] transition-shadow resize-y bg-transparent" 
                    placeholder="e.g., I had all the info I needed, I was in a good flow state..."
                    autoFocus
                />
            </div>
            <div>
                <label htmlFor="tripped-up-input" className="block text-sm font-semibold text-[var(--color-text-primary)] mb-1">
                    What was a challenge or slowed you down?
                </label>
                <textarea 
                    id="tripped-up-input"
                    value={trippedUp}
                    onChange={(e) => setTrippedUp(e.target.value)}
                    className="w-full h-24 p-3 border border-[var(--color-border)] rounded-md focus:ring-2 focus:ring-[var(--color-primary-accent)] transition-shadow resize-y bg-transparent" 
                    placeholder="e.g., I was blocked waiting for feedback, the requirements were unclear..."
                />
            </div>
        </div>

        <div className="mt-6 flex justify-end items-center space-x-4">
          <button 
            onClick={onClose} 
            className="px-6 py-2 font-semibold text-[var(--color-text-secondary)] bg-transparent border border-[var(--color-border)] hover:bg-[var(--color-surface-sunken)] rounded-lg transition-all"
          >
            Skip for now
          </button>
          <button 
            onClick={handleSubmit} 
            className="px-6 py-2 font-bold text-[var(--color-primary-accent-text)] bg-[var(--color-primary-accent)] rounded-lg hover:bg-[var(--color-primary-accent-hover)] transition-all shadow-md"
          >
            Save Reflection
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReflectionModal;
