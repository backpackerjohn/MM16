import React, { useState, useEffect } from 'react';
import { Chunk, SubStep } from '../contracts';
import Button from './ui/Button';
import ModalFooter from './ui/ModalFooter';

interface SplitChunkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newChunks: Chunk[]) => void;
  chunkToSplit: Chunk | null;
  onGenerateSplit: (chunk: Chunk) => Promise<Chunk[]>;
}

const SplitChunkModal: React.FC<SplitChunkModalProps> = ({
  isOpen,
  onClose,
  onSave,
  chunkToSplit,
  onGenerateSplit,
}) => {
  const [newChunks, setNewChunks] = useState<Chunk[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset when a new chunk is selected or modal is closed
    if (isOpen && chunkToSplit) {
      setNewChunks([]); 
      setError(null);
    }
  }, [isOpen, chunkToSplit]);

  const handleGenerate = async () => {
    if (!chunkToSplit) return;
    setIsLoading(true);
    setError(null);
    try {
      const suggestedChunks = await onGenerateSplit(chunkToSplit);
      setNewChunks(suggestedChunks);
    } catch (err: any) {
      console.error("Failed to generate split:", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChunkChange = (chunkIndex: number, field: keyof Chunk, value: any) => {
    const updatedChunks = [...newChunks];
    updatedChunks[chunkIndex] = { ...updatedChunks[chunkIndex], [field]: value };
    setNewChunks(updatedChunks);
  };
  
  const handleSubStepChange = (chunkIndex: number, subStepIndex: number, value: string) => {
    const updatedChunks = [...newChunks];
    const updatedSubSteps = [...updatedChunks[chunkIndex].subSteps];
    updatedSubSteps[subStepIndex] = { ...updatedSubSteps[subStepIndex], description: value };
    updatedChunks[chunkIndex].subSteps = updatedSubSteps;
    setNewChunks(updatedChunks);
  };

  const handleAddSubStep = (chunkIndex: number) => {
    const updatedChunks = [...newChunks];
    const newSubStep: SubStep = {
        id: `new-ss-${Date.now()}`,
        description: '',
        isComplete: false,
    };
    updatedChunks[chunkIndex].subSteps.push(newSubStep);
    setNewChunks(updatedChunks);
  };
  
  const handleRemoveSubStep = (chunkIndex: number, subStepIndex: number) => {
    const updatedChunks = [...newChunks];
    updatedChunks[chunkIndex].subSteps.splice(subStepIndex, 1);
    setNewChunks(updatedChunks);
  };

  const handleAddNewChunk = () => {
      if (!chunkToSplit) return;
      const newChunk: Chunk = {
          id: `new-chunk-${Date.now()}`,
          title: '',
          subSteps: [],
          p50: 15,
          p90: 25,
          energyTag: chunkToSplit.energyTag,
          blockers: [],
          isComplete: false,
      };
      setNewChunks([...newChunks, newChunk]);
  };
  
  const handleRemoveChunk = (chunkIndex: number) => {
      const updatedChunks = [...newChunks];
      updatedChunks.splice(chunkIndex, 1);
      setNewChunks(updatedChunks);
  };

  const handleSave = () => {
    const isValid = newChunks.every(chunk => chunk.title.trim() !== '' && chunk.subSteps.every(ss => ss.description.trim() !== ''));
    if (!isValid || newChunks.length === 0) {
      alert("Please ensure all new chunks have a title and at least one sub-step with a description.");
      return;
    }
    onSave(newChunks);
    onClose();
  };

  if (!isOpen || !chunkToSplit) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 transition-opacity duration-300" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="split-chunk-title">
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-2xl p-8 w-full max-w-3xl transform transition-all duration-300 scale-100 flex flex-col h-[90vh]" onClick={e => e.stopPropagation()}>
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="flex flex-col h-full">
            <h2 id="split-chunk-title" className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">Split Chunk</h2>
            <p className="text-[var(--color-text-secondary)] mb-4">
                Breaking down: <span className="font-semibold text-[var(--color-text-primary)]">"{chunkToSplit.title}"</span>
            </p>
            
            {error && <div className="mb-4 p-3 bg-red-100 text-red-700 border rounded-lg text-sm">{error}</div>}

            <div className="flex-1 overflow-y-auto pr-4 -mr-4 space-y-4">
            {newChunks.length === 0 && !isLoading && (
                <div className="text-center p-8 border-2 border-dashed border-[var(--color-border)] rounded-lg flex flex-col items-center justify-center h-full">
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">How do you want to split this chunk?</h3>
                    <p className="text-[var(--color-text-secondary)] mt-2 mb-6 max-w-md">Break this large task into smaller, focused chunks of about 25 minutes each.</p>
                    <div className="flex gap-4">
                        <Button type="button" onClick={handleAddNewChunk} variant="secondary">
                            Add Manually
                        </Button>
                        <Button type="button" onClick={handleGenerate} variant="primary">
                            Suggest with AI
                        </Button>
                    </div>
                </div>
            )}

            {isLoading && (
                <div className="text-center p-8 flex flex-col items-center justify-center h-full">
                    <svg className="animate-spin h-10 w-10 text-[var(--color-primary-accent)] mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle opacity="25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path opacity="75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <p className="font-semibold text-[var(--color-text-secondary)]">AI is planning the best way to split this task...</p>
                </div>
            )}
            
            {newChunks.map((chunk, chunkIndex) => (
                <div key={chunk.id || chunkIndex} className="bg-[var(--color-surface-sunken)] p-4 rounded-lg border border-[var(--color-border)] relative group">
                    <button type="button" onClick={() => handleRemoveChunk(chunkIndex)} className="absolute top-2 right-2 p-1 rounded-full text-stone-400 hover:bg-red-100 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" title="Remove this chunk">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </button>
                    <input type="text" value={chunk.title} onChange={e => handleChunkChange(chunkIndex, 'title', e.target.value)} placeholder="New Chunk Title" className="w-full text-lg font-semibold border-b-2 border-[var(--color-border)] focus:border-[var(--color-primary-accent)] bg-transparent outline-none pb-1 mb-3 pr-8" />
                    <div className="space-y-2">
                        {chunk.subSteps.map((subStep, subStepIndex) => (
                            <div key={subStep.id || subStepIndex} className="flex items-center gap-2">
                            <input type="text" value={subStep.description} onChange={e => handleSubStepChange(chunkIndex, subStepIndex, e.target.value)} placeholder="Sub-step description" className="flex-1 px-2 py-1 border border-[var(--color-border-hover)] rounded-md text-sm focus:ring-1 focus:ring-[var(--color-primary-accent)] focus:border-[var(--color-primary-accent)] bg-transparent" />
                            <button type="button" onClick={() => handleRemoveSubStep(chunkIndex, subStepIndex)} className="text-stone-400 hover:text-red-500" title="Remove sub-step">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                            </button>
                            </div>
                        ))}
                    </div>
                    <button type="button" onClick={() => handleAddSubStep(chunkIndex)} className="mt-3 text-sm font-semibold text-[var(--color-primary-accent)] hover:text-opacity-80">+ Add Sub-step</button>
                </div>
            ))}

            {newChunks.length > 0 && (
                <button type="button" onClick={handleAddNewChunk} className="w-full mt-3 p-2 text-sm font-semibold text-[var(--color-text-secondary)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-sunken)] rounded-lg border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-primary-accent)] transition-colors">
                    + Add Another Chunk
                </button>
            )}

            </div>

            <ModalFooter>
                <Button type="button" onClick={onClose} variant="secondary">
                    Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={newChunks.length === 0 || isLoading}>
                    Save Split
                </Button>
            </ModalFooter>
        </form>
      </div>
    </div>
  );
};

export default SplitChunkModal;