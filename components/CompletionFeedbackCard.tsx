import React, { useState, useEffect } from 'react';
import Confetti from './Confetti';
import { Chunk } from '../contracts';
import { UserDifficulty, MicroHabit, HabitStats } from '../types';
import { getHabitSuggestion } from '../utils/habitStacking';
import { getHabitStats, recordHabitCompletion } from '../utils/habitAnalytics';
import WandIcon from './icons/WandIcon';
import TrophyIcon from './icons/TrophyIcon';


interface Props {
    isOpen: boolean;
    chunk: Chunk;
    actualDuration: number;
    newEstimate: { p50: number, p90: number } | null;
    onFeedback: (difficulty: UserDifficulty) => void;
    onFlowComplete: () => void;
}

const CompletionFeedbackCard: React.FC<Props> = ({ isOpen, chunk, actualDuration, newEstimate, onFeedback, onFlowComplete }) => {
    type View = 'feedback' | 'habit' | 'celebration';
    const [view, setView] = useState<View>('feedback');
    const [habitSuggestion, setHabitSuggestion] = useState<MicroHabit | null>(null);
    const [allHabitStats, setAllHabitStats] = useState<Record<string, HabitStats>>({});
    const [celebrationMessage, setCelebrationMessage] = useState('');

    useEffect(() => {
        if (isOpen) {
            setView('feedback');
            setHabitSuggestion(null);
            setCelebrationMessage('');
            setAllHabitStats(getHabitStats());
        }
    }, [isOpen]);

    if (!isOpen || !chunk) return null;

    const originalEstimate = chunk.p50;

    const handleFeedback = (difficulty: UserDifficulty) => {
        onFeedback(difficulty);
        const suggestion = getHabitSuggestion({ completedEnergyTag: chunk.energyTag });
        setHabitSuggestion(suggestion);
        setView('habit');
    };
    
    const handleAcceptHabit = () => {
        if (!habitSuggestion) return;
        const { newStreak, isNewLongest } = recordHabitCompletion(habitSuggestion.id);
        
        let message = `Habit complete! Your new streak is ${newStreak} day${newStreak > 1 ? 's' : ''}.`;
        if (isNewLongest && newStreak > 1) {
            message += " That's a new personal best! 🎉";
        }
        setCelebrationMessage(message);
        setView('celebration');

        setTimeout(() => {
            onFlowComplete();
        }, 3000);
    };

    const handleNewSuggestion = () => {
        const suggestion = getHabitSuggestion({ completedEnergyTag: chunk.energyTag });
        setHabitSuggestion(suggestion);
    };
    
    const renderContent = () => {
        switch (view) {
            case 'feedback':
                return (
                    <>
                        <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">Chunk Complete!</h2>
                        <p className="text-[var(--color-text-secondary)] mb-4">You finished: <span className="font-semibold text-[var(--color-text-primary)]">"{chunk.title}"</span></p>

                        <div className="bg-[var(--color-surface-sunken)] p-4 rounded-lg my-6 border border-[var(--color-border)]">
                            <p className="text-lg text-[var(--color-text-primary)]">
                                Estimated: <span className="font-bold">{originalEstimate} min</span>
                                <span className="text-2xl mx-2">&rarr;</span>
                                Actual: <span className="font-bold">{actualDuration} min</span>
                            </p>
                            {newEstimate && (
                                <p className="text-sm text-[var(--color-text-subtle)] mt-2">
                                    I'm learning! The new estimate for similar tasks is now ~{newEstimate.p50} min.
                                </p>
                            )}
                        </div>

                        <p className="font-semibold text-[var(--color-text-primary)] mb-3">How did that feel?</p>
                        <div className="flex justify-center gap-3">
                            <button onClick={() => handleFeedback(UserDifficulty.Harder)} className="flex-1 px-4 py-3 font-semibold text-[var(--color-text-secondary)] bg-transparent border border-[var(--color-border)] hover:bg-[var(--color-surface-sunken)] rounded-lg">Harder than usual</button>
                            <button onClick={() => handleFeedback(UserDifficulty.Typical)} className="flex-1 px-4 py-3 font-bold text-[var(--color-primary-accent-text)] bg-[var(--color-primary-accent)] hover:bg-[var(--color-primary-accent-hover)] rounded-lg shadow-sm">This was typical</button>
                            <button onClick={() => handleFeedback(UserDifficulty.Easier)} className="flex-1 px-4 py-3 font-semibold text-[var(--color-text-secondary)] bg-transparent border border-[var(--color-border)] hover:bg-[var(--color-surface-sunken)] rounded-lg">Easier than usual</button>
                        </div>
                    </>
                );
            case 'habit':
                 if (!habitSuggestion) {
                     return <button onClick={onFlowComplete} className="w-full px-4 py-3 font-semibold text-[var(--color-primary-accent-text)] bg-[var(--color-primary-accent)] hover:bg-[var(--color-primary-accent-hover)] rounded-lg shadow-sm">Continue</button>;
                 }
                 const currentStreak = allHabitStats[habitSuggestion.id]?.currentStreak || 0;
                 return (
                     <>
                        <WandIcon className="h-10 w-10 text-[var(--color-primary-accent)] mx-auto mb-3" />
                        <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">Build Your Momentum</h2>
                        <p className="text-[var(--color-text-secondary)] mb-4">Nice work! Now, how about a quick micro-habit to keep the ball rolling?</p>

                        <div className="bg-[var(--color-surface-sunken)] p-4 rounded-lg my-6 border border-[var(--color-border)] text-left">
                             <div className="flex justify-between items-center">
                                <p className="font-bold text-[var(--color-text-primary)]">{habitSuggestion.name} <span className="text-sm font-medium text-[var(--color-text-subtle)]">({habitSuggestion.durationMinutes} min)</span></p>
                                {currentStreak > 0 && <span className="text-sm font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">🔥 {currentStreak} Day Streak</span>}
                             </div>
                             <p className="text-sm text-[var(--color-text-secondary)] mt-1">{habitSuggestion.description}</p>
                        </div>

                        <div className="flex justify-center gap-3">
                            <button onClick={onFlowComplete} className="flex-1 px-4 py-3 font-bold text-[var(--color-text-secondary)] bg-[var(--color-surface-sunken)] hover:bg-[var(--color-border)] rounded-lg border border-[var(--color-border-hover)]">Skip for now</button>
                             <button onClick={handleNewSuggestion} className="px-4 py-3 font-bold text-[var(--color-text-secondary)] bg-[var(--color-surface-sunken)] hover:bg-[var(--color-border)] rounded-lg border border-[var(--color-border-hover)]">Suggest another</button>
                            <button onClick={handleAcceptHabit} className="flex-1 px-4 py-3 font-semibold text-[var(--color-primary-accent-text)] bg-[var(--color-primary-accent)] hover:bg-[var(--color-primary-accent-hover)] rounded-lg shadow-sm">Let's do it!</button>
                        </div>
                    </>
                );
            case 'celebration':
                 return (
                    <>
                        <TrophyIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Great Job!</h2>
                        <p className="text-[var(--color-text-secondary)] text-lg">{celebrationMessage}</p>
                    </>
                );
            default:
                return null;
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
            <Confetti />
            <div className="bg-[var(--color-surface)] rounded-2xl shadow-2xl p-8 w-full max-w-lg transform transition-all duration-300 scale-100 text-center relative z-10 animate-fade-in">
                {renderContent()}
            </div>
        </div>
    );
};
export default CompletionFeedbackCard;