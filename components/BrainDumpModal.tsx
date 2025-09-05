import React, { useState, useEffect } from 'react';

interface BrainDumpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (text: string) => Promise<void>;
  onSuccess: (message: string) => void;
}

const BrainDumpModal: React.FC<BrainDumpModalProps> = ({ isOpen, onClose, onSubmit, onSuccess }) => {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

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

  const handleSubmit = async () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    try {
      await onSubmit(inputText);
      setInputText('');
      onSuccess("Thoughts processed successfully!");
      onClose();
    } catch (error) {
      // Error will be handled in the parent component
      console.error("Submission failed", error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 transition-opacity duration-300"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="brain-dump-modal-title"
    >
      <div 
        className="bg-[var(--color-surface)] rounded-[var(--border-radius-xl)] shadow-2xl p-8 w-full max-w-2xl transform transition-all duration-300 scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
            <h2 id="brain-dump-modal-title" className="text-3xl font-bold text-[var(--color-text-primary)] mb-4">
            Quick Brain Dump
            </h2>
            <p className="text-[var(--color-text-secondary)] mb-6">
            Capture what's on your mind. We'll organize it for you on the Brain Dump page.
            </p>
            <div className="relative">
                <textarea
                id="brain-dump-input"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder=" " 
                className="peer block w-full h-48 px-4 pb-2.5 pt-4 text-sm bg-transparent border border-[var(--color-border)] rounded-[var(--border-radius-md)] focus:ring-2 focus:ring-[var(--color-primary-accent)] transition-shadow resize-none" 
                aria-label="Brain dump input"
                autoFocus
                />
                <label
                    htmlFor="brain-dump-input"
                    className="absolute text-sm text-[var(--color-text-subtle)] duration-300 transform -translate-y-4 scale-75 top-4 z-10 origin-[0] start-4 peer-focus:text-[var(--color-primary-accent)] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4 pointer-events-none"
                >
                    Your thoughts (e.g., Follow up with Sarah...)
                </label>
            </div>
            <div className="mt-6 flex justify-end items-center space-x-4">
            <button 
                type="button"
                onClick={onClose} 
                className="px-6 py-3 font-semibold text-[var(--color-text-secondary)] bg-transparent border border-[var(--color-border)] hover:bg-[var(--color-surface-sunken)] rounded-lg transition-all"
            >
                Cancel
            </button>
            <button 
                type="submit"
                disabled={isProcessing || !inputText.trim()} 
                className="px-6 py-3 font-bold text-[var(--color-primary-accent-text)] bg-[var(--color-primary-accent)] rounded-[var(--border-radius-md)] hover:bg-[var(--color-primary-accent-hover)] transition-all shadow-md disabled:bg-stone-400 disabled:cursor-not-allowed flex items-center"
            >
                {isProcessing && (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                )}
                {isProcessing ? 'Processing...' : 'Process Thoughts'}
            </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default BrainDumpModal;