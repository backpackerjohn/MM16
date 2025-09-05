import React, { useState, useEffect } from 'react';
import ExclamationCircleIcon from './icons/ExclamationCircleIcon';

interface AddReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (text: string) => Promise<void>;
}

const AddReminderModal: React.FC<AddReminderModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [inputText, setInputText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setInputText('');
            setIsProcessing(false);
            setError(null);
            setValidationError(null);
        }
    }, [isOpen]);

    const validate = () => {
        if (!inputText.trim()) {
            setValidationError("Please enter a reminder.");
            return false;
        }
        setValidationError(null);
        return true;
    };

    const handleSubmit = async () => {
        setError(null);
        if (!validate()) return;
        
        setIsProcessing(true);
        try {
            await onSubmit(inputText);
            // Parent component will close the modal on success
        } catch (e: any) {
            setError(e.message || "An unexpected error occurred.");
        } finally {
            setIsProcessing(false);
        }
    };
    
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex items-center justify-center p-4"
            onClick={onClose}
            role="dialog" aria-modal="true" aria-labelledby="add-reminder-title"
        >
            <div
                className="bg-[var(--color-surface)] rounded-2xl shadow-2xl p-8 w-full max-w-lg transform transition-all"
                onClick={e => e.stopPropagation()}
            >
                <h2 id="add-reminder-title" className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">Add a Smart Reminder</h2>
                <p className="text-[var(--color-text-secondary)] mb-4">Describe your reminder, and we'll schedule it intelligently based on your anchors.</p>

                <div>
                    <div className="relative">
                        <textarea
                            id="reminder-input"
                            value={inputText}
                            onChange={e => {
                                setInputText(e.target.value);
                                if (validationError) validate();
                            }}
                            onBlur={validate}
                            placeholder=" "
                            className={`peer block w-full h-28 px-4 pb-2.5 pt-4 text-sm bg-transparent border rounded-lg focus:ring-2 focus:ring-[var(--color-primary-accent)] resize-none ${validationError ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'}`}
                            autoFocus
                        />
                        <label
                            htmlFor="reminder-input"
                            className="absolute text-sm text-[var(--color-text-subtle)] duration-300 transform -translate-y-4 scale-75 top-4 z-10 origin-[0] start-4 peer-focus:text-[var(--color-primary-accent)] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4 pointer-events-none"
                        >
                            Reminder (e.g., 'Pack lunch 30 min before work')
                        </label>
                    </div>
                    {validationError && <p className="flex items-center gap-1 mt-2 text-sm text-[var(--color-danger)]"><ExclamationCircleIcon className="h-4 w-4"/>{validationError}</p>}
                </div>


                {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2 font-semibold text-[var(--color-text-secondary)] bg-transparent border border-[var(--color-border)] hover:bg-[var(--color-surface-sunken)] rounded-lg">
                        Cancel
                    </button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={isProcessing || !inputText.trim()}
                        className="px-5 py-2 font-bold text-[var(--color-primary-accent-text)] bg-[var(--color-primary-accent)] hover:bg-[var(--color-primary-accent-hover)] rounded-lg shadow-sm disabled:bg-stone-400 flex items-center"
                    >
                         {isProcessing && (
                            <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        )}
                        {isProcessing ? 'Scheduling...' : 'Create Reminder'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddReminderModal;
