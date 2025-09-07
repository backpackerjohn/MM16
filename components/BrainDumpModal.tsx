import React, { useState } from 'react';
import Button from './ui/Button';
import ModalFooter from './ui/ModalFooter';
import { Result } from '../types';
import Modal from './ui/Modal';
import { useData } from '../src/context/DataContext';
import { BrainDumpItem } from '../contracts';

interface BrainDumpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (text: string) => Promise<Result<BrainDumpItem[]>>;
  onSuccess: (message: string) => void;
}

const BrainDumpModal: React.FC<BrainDumpModalProps> = ({ isOpen, onClose, onSubmit, onSuccess }) => {
  const { setProcessedItems } = useData();
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    
    const result = await onSubmit(inputText);

    // FIX: Explicitly check for the 'false' case to ensure correct type narrowing.
    if (result.ok === false) {
      // Error is set and handled by the parent component (App.tsx)
      console.error("Submission failed", result.error);
      setIsProcessing(false);
      return;
    }
    
    setProcessedItems(prev => [...prev, ...result.data]);
    setInputText('');
    onSuccess("Thoughts processed successfully!");
    onClose();
    setIsProcessing(false);
  };

  const modalFooter = (
      <ModalFooter>
          <Button 
              type="button"
              onClick={onClose} 
              variant="secondary"
          >
              Cancel
          </Button>
          <Button 
              type="submit"
              variant="primary"
              isLoading={isProcessing}
              disabled={!inputText.trim()}
              form="brain-dump-form"
          >
              Process Thoughts
          </Button>
      </ModalFooter>
  );

  return (
    <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Quick Brain Dump"
        footer={modalFooter}
    >
        <form id="brain-dump-form" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
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
        </form>
    </Modal>
  );
};

export default BrainDumpModal;