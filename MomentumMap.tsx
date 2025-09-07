

import React, { useState, useEffect, useMemo } from 'react';
import { MomentumMapData, FinishLine, Chunk, SubStep, Note, EnergyTag, Reflection, SavedTask } from '../contracts';
import { CompletionRecord, TimeLearningSettings, UserDifficulty } from '../types';

import FinishLineIcon from './icons/FinishLineIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import NoteIcon from './icons/NoteIcon';
import TargetIcon from './icons/TargetIcon';
import ListViewIcon from './icons/ListViewIcon';
import CardViewIcon from './icons/CardViewIcon';
import ClockIcon from './icons/ClockIcon';
import EnergyIcon from './icons/EnergyIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import ReflectionModal from './ReflectionModal';
import Confetti from './Confetti';
import TrophyIcon from './icons/TrophyIcon';
import ShareIcon from './icons/ShareIcon';
import SplitIcon from './icons/SplitIcon';
import HandRaisedIcon from './icons/HandRaisedIcon';
import SplitChunkModal from './SplitChunkModal';
import UnblockerModal from './UnblockerModal';
import PlayIcon from './icons/PlayIcon';
import LockIcon from './icons/LockIcon';
import SkipIcon from './icons/SkipIcon';
import SaveMapModal from './SaveTaskModal';
import { getPersonalizedEstimate, getTimeOfDay } from '../utils/timeAnalytics';
import CompletionFeedbackCard from './CompletionFeedbackCard';
import DropdownMenu from './DropdownMenu';
import MoreOptionsIcon from './icons/MoreOptionsIcon';
import WandIcon from './icons/WandIcon';
import InlineConfetti from './InlineConfetti';
import CheckIcon from './icons/CheckIcon';
import { 
    generateMomentumMap, 
    replanMomentumMap, 
    suggestChunkSplit, 
    suggestUnblocker, 
    suggestChunkTitle 
} from '../services/geminiService';


interface MomentumMapProps {
  activeMap: MomentumMapData | null;
  setActiveMap: React.Dispatch<React.SetStateAction<MomentumMapData | null>>;
  setSavedTasks: React.Dispatch<React.SetStateAction<SavedTask[]>>;
  completionHistory: Record<EnergyTag, CompletionRecord[]>;
  onNewCompletionRecord: (record: Omit<CompletionRecord, 'id' | 'timeOfDay'>) => void;
  timeLearningSettings: TimeLearningSettings;
  onSuccess: (message: string) => void;
}

const loadingMessages = [
    { title: "Did you know?", text: "People with ADHD often excel in creative fields and crisis situations due to their unique way of thinking." },
    { title: "Quick Tip:", text: "Break large tasks into tiny, manageable steps. The smaller, the better!" },
    { title: "Inspiration", text: "Progress, not perfection. Every small step forward is a victory." },
    { title: "ADHD Fact:", text: "Hyperfocus, the ability to concentrate intensely on an interesting project, is a common ADHD trait." },
    { title: "Food for Thought", text: "Your brain is not broken, it just works differently. Embrace your unique strengths." },
    { title: "Inspiration", text: "The secret of getting ahead is getting started." },
    { title: "Did you know?", text: "Many successful entrepreneurs have ADHD, leveraging their creativity and risk-taking abilities." },
    { title: "Quick Tip:", text: "Use visual timers to help make time feel more tangible and stay on track." },
];

const LoadingIndicator: React.FC = () => {
    const [message, setMessage] = useState(loadingMessages[0]);
    
    useEffect(() => {
        const randomIndex = Math.floor(Math.random() * loadingMessages.length);
        setMessage(loadingMessages[randomIndex]);
        
        const interval = setInterval(() => {
            const newIndex = Math.floor(Math.random() * loadingMessages.length);
            setMessage(loadingMessages[newIndex]);
        }, 5000); // Change message every 5 seconds

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="text-center py-20">
            <svg className="animate-spin mx-auto h-12 w-12 text-[var(--color-primary-accent)] mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">{message.title}</h2>
            <p className="text-[var(--color-text-secondary)] max-w-md mx-auto mt-2">{message.text}</p>
        </div>
    );
};


const MomentumMap: React.FC<MomentumMapProps> = ({ activeMap, setActiveMap, setSavedTasks, completionHistory, onNewCompletionRecord, timeLearningSettings, onSuccess }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [view, setView] = useState<'list' | 'card'>('list');
    const [goalInput, setGoalInput] = useState('');

    const [editedFinishLine, setEditedFinishLine] = useState<FinishLine | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const [isReplanning, setIsReplanning] = useState(false);

    const [openChunks, setOpenChunks] = useState<string[]>([]);
    const [reflectingChunk, setReflectingChunk] = useState<Chunk | null>(null);
    const [feedbackChunk, setFeedbackChunk] = useState<Chunk | null>(null);
    const [actualDuration, setActualDuration] = useState(0);
    const [chunkToSplit, setChunkToSplit] = useState<Chunk | null>(null);
    const [unblockingStep, setUnblockingStep] = useState<{chunkId: string, subStep: SubStep} | null>(null);
    const [unblockerSuggestion, setUnblockerSuggestion] = useState<string>('');
    const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);
    
    const [editingNote, setEditingNote] = useState<{ type: 'finishLine' | 'chunk' | 'subStep'; id: string } | null>(null);
    const [noteContent, setNoteContent] = useState({ text: '', shareWithAI: true });
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    
    const [editingEntity, setEditingEntity] = useState<{ id: string, type: 'chunk' | 'subStep', chunkId?: string, error?: string } | null>(null);
    const [editingValue, setEditingValue] = useState('');
    const [isSuggestingTitle, setIsSuggestingTitle] = useState<string | null>(null);


    useEffect(() => {
        if (activeMap) {
            setEditedFinishLine(activeMap.finishLine);
        }
    }, [activeMap]);

    const activeChunk = useMemo(() => activeMap?.chunks.find(c => c.startedAt && !c.completedAt), [activeMap]);

    useEffect(() => {
        if (activeChunk) {
            const timer = setInterval(() => {
                const elapsed = Math.round((Date.now() - new Date(activeChunk.startedAt!).getTime()) / 1000);
                setElapsedSeconds(elapsed);
            }, 1000); // Update every second for real-time feedback
            return () => clearInterval(timer);
        } else {
            setElapsedSeconds(0);
        }
    }, [activeChunk]);


    const handleGenerateInitialPlan = async (goal: string) => {
        if (!goal.trim()) {
            setError("Please enter a goal to generate a roadmap.");
            return;
        }
        setIsLoading(true);
        setError(null);
        
        const result = await generateMomentumMap(goal, completionHistory);
        setIsLoading(false);

        if (result.ok) {
            setActiveMap(result.data);
            setOpenChunks(result.data.chunks.map(c => c.id));
        } else {
            // FIX: Explicitly check for the 'false' case to ensure correct type narrowing.
            if (result.ok === false) {
                setError(result.error);
            }
        }
    };
    
    const handleReplan = async () => {
        if (!editedFinishLine || !activeMap) return;
        setIsReplanning(true);
        setError(null);

        const completedChunks: Chunk[] = [];
        const incompleteChunks: Chunk[] = [];
        const completedSubSteps: SubStep[] = [];

        activeMap.chunks.forEach(chunk => {
            const completedSS = chunk.subSteps.filter(ss => ss.isComplete);
            const incompleteSS = chunk.subSteps.filter(ss => !ss.isComplete);
            
            completedSubSteps.push(...completedSS);

            if (incompleteSS.length === 0) {
                completedChunks.push(chunk);
            } else if (completedSS.length === 0) {
                incompleteChunks.push(chunk);
            } else {
                completedChunks.push({ ...chunk, subSteps: completedSS });
                incompleteChunks.push({ ...chunk, subSteps: incompleteSS });
            }
        });

        const result = await replanMomentumMap(editedFinishLine, completedSubSteps, incompleteChunks);
        setIsReplanning(false);

        if (result.ok) {
            const newMapData: MomentumMapData = {
                version: 1,
                finishLine: editedFinishLine,
                chunks: [...completedChunks, ...result.data],
            };
            setActiveMap(newMapData);
            setIsDirty(false);
        } else {
            // FIX: Explicitly check for the 'false' case to ensure correct type narrowing.
            if (result.ok === false) {
                setError(result.error);
            }
        }
    };

    const handleToggleSubStep = (chunkId: string, subStepId: string) => {
        setActiveMap(prev => {
            if (!prev) return null;

            let newlyCompletedChunk: Chunk | null = null;
            const now = new Date();
            const nowISO = now.toISOString();

            const newChunks = prev.chunks.map(chunk => {
                if (chunk.id !== chunkId) return chunk;

                const originalSubStep = chunk.subSteps.find(ss => ss.id === subStepId);
                if (!originalSubStep) return chunk;

                const isBecomingComplete = !originalSubStep.isComplete;
                
                const newSubSteps = chunk.subSteps.map(ss => {
                    if (ss.id !== subStepId) return ss;
                    return {
                        ...ss,
                        isComplete: isBecomingComplete,
                        startedAt: ss.startedAt || (isBecomingComplete ? nowISO : undefined),
                        completedAt: isBecomingComplete ? nowISO : undefined,
                    };
                });
                
                const wasChunkStarted = !!chunk.startedAt || chunk.subSteps.some(ss => ss.isComplete && ss.id !== subStepId);
                const isChunkNowStarted = wasChunkStarted || isBecomingComplete;
                
                const areAllSubStepsComplete = newSubSteps.every(ss => ss.isComplete);

                const updatedChunk = {
                    ...chunk,
                    subSteps: newSubSteps,
                    isComplete: areAllSubStepsComplete,
                    startedAt: chunk.startedAt || (isChunkNowStarted ? nowISO : undefined),
                    completedAt: areAllSubStepsComplete ? (chunk.completedAt || nowISO) : undefined,
                };
                
                if (updatedChunk.isComplete && !chunk.isComplete) {
                     if (updatedChunk.startedAt) {
                        const durationMs = now.getTime() - new Date(updatedChunk.startedAt).getTime();
                        const durationMins = Math.round(durationMs / 60000);
                        setActualDuration(durationMins > 0 ? durationMins : 1);
                    } else {
                        setActualDuration(updatedChunk.p50); // Fallback
                    }
                    newlyCompletedChunk = updatedChunk;
                }

                return updatedChunk;
            });

            if (newlyCompletedChunk) {
                setTimeout(() => setFeedbackChunk(newlyCompletedChunk), 400);
            }

            return { ...prev, chunks: newChunks };
        });
    };

    const handleCompleteChunk = (chunkId: string) => {
        setActiveMap(prev => {
            if (!prev) return null;
    
            let newlyCompletedChunk: Chunk | null = null;
            const now = new Date();
            const nowISO = now.toISOString();
    
            const newChunks = prev.chunks.map(chunk => {
                if (chunk.id !== chunkId) return chunk;
    
                const wasAlreadyComplete = chunk.isComplete;
                if (wasAlreadyComplete) return chunk;
    
                const newSubSteps = chunk.subSteps.map(ss => ({
                    ...ss,
                    isComplete: true,
                    startedAt: ss.startedAt || nowISO,
                    completedAt: ss.completedAt || nowISO,
                }));
    
                const updatedChunk = {
                    ...chunk,
                    subSteps: newSubSteps,
                    isComplete: true,
                    startedAt: chunk.startedAt || nowISO,
                    completedAt: nowISO,
                };
    
                if (updatedChunk.startedAt) {
                    const durationMs = now.getTime() - new Date(updatedChunk.startedAt).getTime();
                    const durationMins = Math.round(durationMs / 60000);
                    setActualDuration(durationMins > 0 ? durationMins : 1);
                } else {
                    setActualDuration(updatedChunk.p50); // Fallback
                }
                newlyCompletedChunk = updatedChunk;
    
                return updatedChunk;
            });
    
            if (newlyCompletedChunk) {
                setTimeout(() => setFeedbackChunk(newlyCompletedChunk), 400);
            }
    
            return { ...prev, chunks: newChunks };
        });
    };

    const handleFeedbackSubmit = (difficulty: UserDifficulty) => {
        if (!feedbackChunk) return;

        const record: Omit<CompletionRecord, 'id' | 'timeOfDay'> = {
            actualDurationMinutes: actualDuration,
            estimatedDurationMinutes: feedbackChunk.p50,
            energyTag: feedbackChunk.energyTag,
            completedAt: new Date().toISOString(),
            subStepCount: feedbackChunk.subSteps.length,
            dayOfWeek: new Date().getDay(),
            difficulty: difficulty,
        };

        onNewCompletionRecord(record);
    };

    const handleCompletionFlowEnd = () => {
        if (!feedbackChunk) return;

        // If the chunk doesn't have a reflection yet, open the reflection modal.
        if (!feedbackChunk.reflection) {
            setReflectingChunk(feedbackChunk);
        }
        
        // This closes the feedback card. The reflection modal will open if set.
        setFeedbackChunk(null);
    };

    const handleSaveMap = (note: string) => {
        if (!activeMap) return;
    
        const totalChunks = activeMap.chunks.length;
        const completedChunks = activeMap.chunks.filter(c => c.isComplete).length;
        const totalSubSteps = activeMap.chunks.reduce((sum, chunk) => sum + chunk.subSteps.length, 0);
        const completedSubSteps = activeMap.chunks.reduce((sum, chunk) => sum + chunk.subSteps.filter(ss => ss.isComplete).length, 0);
    
        const newSavedTask: SavedTask = {
            id: `map-${Date.now()}`,
            note: note,
            savedAt: new Date().toISOString(),
            mapData: activeMap,
            progress: {
                totalChunks,
                completedChunks,
                totalSubSteps,
                completedSubSteps,
            }
        };
    
        setSavedTasks(prev => [newSavedTask, ...prev]);
        setIsSaveModalOpen(false);
        onSuccess('Momentum Map saved! Find it on your Task Page.');
    };

    const handleSaveNote = (type: 'finishLine' | 'chunk' | 'subStep', id: string, chunkId?: string) => {
        setActiveMap(prev => {
            if (!prev) return null;

            const newNote: Note = { text: noteContent.text, shareWithAI: noteContent.shareWithAI };

            if (type === 'finishLine') {
                return {
                    ...prev,
                    finishLine: { ...prev.finishLine, note: newNote }
                };
            }

            const newChunks = prev.chunks.map(chunk => {
                if (type === 'chunk' && chunk.id === id) {
                    return { ...chunk, note: newNote };
                }
                if (type === 'subStep' && chunk.id === chunkId) {
                    const newSubSteps = chunk.subSteps.map(ss =>
                        ss.id === id ? { ...ss, note: newNote } : ss
                    );
                    return { ...chunk, subSteps: newSubSteps };
                }
                return chunk;
            });

            return { ...prev, chunks: newChunks };
        });

        setEditingNote(null);
        setNoteContent({ text: '', shareWithAI: true });
    };

    const handleToggleBlocked = (chunkId: string, subStepId: string) => {
        setActiveMap(prev => {
            if (!prev) return null;
            const newChunks = prev.chunks.map(chunk => {
                if (chunk.id === chunkId) {
                    const newSubSteps = chunk.subSteps.map(ss =>
                        ss.id === subStepId ? { ...ss, isBlocked: !ss.isBlocked } : ss
                    );
                    return { ...chunk, subSteps: newSubSteps };
                }
                return chunk;
            });
            return { ...prev, chunks: newChunks };
        });
    };

    const handleSkipSubStep = (chunkId: string, subStepId: string) => {
        setActiveMap(prev => {
            if (!prev) return null;
            const newChunks = prev.chunks.map(chunk => {
                if (chunk.id === chunkId) {
                    const subStepToSkip = chunk.subSteps.find(ss => ss.id === subStepId);
                    if (!subStepToSkip) return chunk;

                    const otherSubSteps = chunk.subSteps.filter(ss => ss.id !== subStepId);
                    const newSubSteps = [...otherSubSteps, subStepToSkip];
                    
                    return { ...chunk, subSteps: newSubSteps };
                }
                return chunk;
            });
            return { ...prev, chunks: newChunks };
        });
    };

    const handleSaveReflection = (chunkId: string, reflection: Reflection) => {
        setActiveMap(prev => {
            if (!prev) return null;
            const newChunks = prev.chunks.map(chunk => 
                chunk.id === chunkId ? { ...chunk, reflection } : chunk
            );
            return { ...prev, chunks: newChunks };
        });
        setReflectingChunk(null);
    };

    const handleSaveSplit = (newChunks: Chunk[]) => {
        if (!chunkToSplit) return;
        setActiveMap(prev => {
            if (!prev) return null;
            const chunkIndex = prev.chunks.findIndex(c => c.id === chunkToSplit.id);
            if (chunkIndex === -1) return prev;
            
            const newMapChunks = [...prev.chunks];
            newMapChunks.splice(chunkIndex, 1, ...newChunks);

            return { ...prev, chunks: newMapChunks };
        });
        setChunkToSplit(null);
    };

    const handleOpenUnblockerModal = async (chunkId: string, subStep: SubStep) => {
        setUnblockingStep({ chunkId, subStep });
        setIsGeneratingSuggestion(true);
        setUnblockerSuggestion('');
        const result = await suggestUnblocker(subStep, activeMap?.finishLine.statement || '');
        setIsGeneratingSuggestion(false);
        if (result.ok) {
            setUnblockerSuggestion(result.data);
        } else {
            // FIX: Explicitly check for the 'false' case to ensure correct type narrowing.
            if (result.ok === false) {
                setError(result.error);
            }
            setUnblockingStep(null); // Close modal on error
        }
    };
    
    const handleAcceptUnblocker = (suggestionText: string) => {
        if (!unblockingStep) return;
        
        setActiveMap(prev => {
            if (!prev) return null;
            const { chunkId, subStep } = unblockingStep;

            const newChunks = prev.chunks.map(chunk => {
                if (chunk.id === chunkId) {
                    const subStepIndex = chunk.subSteps.findIndex(ss => ss.id === subStep.id);
                    if (subStepIndex === -1) return chunk;

                    const newSubStep: SubStep = {
                        id: `ss-${chunkId}-unblock-${Date.now()}`,
                        description: suggestionText,
                        isComplete: false,
                    };

                    const newSubSteps = [...chunk.subSteps];
                    newSubSteps.splice(subStepIndex, 0, newSubStep);
                    return { ...chunk, subSteps: newSubSteps };
                }
                return chunk;
            });
            return { ...prev, chunks: newChunks };
        });

        setUnblockingStep(null);
    };
    
    const handleToggleChunk = (chunkId: string) => {
        setOpenChunks(prev => prev.includes(chunkId) ? prev.filter(id => id !== chunkId) : [...prev, chunkId]);
    };
    
    const handleFocusOnStep = (subStepId: string) => {
        const element = document.getElementById(subStepId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('animate-pulse-once');
            setTimeout(() => element.classList.remove('animate-pulse-once'), 1500);
        }
    };

    const handleSuggestTitle = async (chunk: Chunk) => {
        setIsSuggestingTitle(chunk.id);
        const result = await suggestChunkTitle(chunk.subSteps);
        setIsSuggestingTitle(null);
        if (result.ok) {
            setActiveMap(prev => {
                if (!prev) return null;
                const newChunks = prev.chunks.map(c => c.id === chunk.id ? { ...c, title: result.data } : c);
                return { ...prev, chunks: newChunks };
            });
        } else {
            // FIX: Explicitly check for the 'false' case to ensure correct type narrowing.
            if (result.ok === false) {
                setError(result.error);
            }
        }
    };

    const handleSaveEditing = () => {
        if (!editingEntity || !activeMap) return;
        const { id, type, chunkId } = editingEntity;
        const value = editingValue.trim();

        if (type === 'subStep') {
            if (value === '') {
                setEditingEntity(prev => prev ? { ...prev, error: "Description can't be empty." } : null);
                return;
            }
            setActiveMap(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    chunks: prev.chunks.map(c => c.id === chunkId ? { ...c, subSteps: c.subSteps.map(ss => ss.id === id ? { ...ss, description: value } : ss) } : c)
                };
            });
        }

        if (type === 'chunk') {
            const isDuplicate = activeMap.chunks.some(c => c.id !== id && c.title.toLowerCase() === value.toLowerCase());
            if (isDuplicate) {
                setEditingEntity(prev => prev ? { ...prev, error: "Chunk title must be unique." } : null);
                return;
            }
            setActiveMap(prev => {
                if (!prev) return null;
                return { ...prev, chunks: prev.chunks.map(c => c.id === id ? { ...c, title: value } : c) };
            });
        }

        setEditingEntity(null);
        setEditingValue('');
    };

    const nextBestMove = useMemo(() => {
        if (!activeMap) return null;
        for (const chunk of activeMap.chunks) {
            for (const subStep of chunk.subSteps) {
                if (!subStep.isComplete && !subStep.isBlocked) {
                    return { chunk, subStep };
                }
            }
        }
        return null;
    }, [activeMap]);
    
    const chunksWithPersonalizedEstimates = useMemo(() => {
        if (!activeMap) return [];
        const now = new Date();
        const currentTimeOfDay = getTimeOfDay(now);
        const dayOfWeek = now.getDay(); // 0 for Sunday, 1 for Monday, etc.

        return activeMap.chunks.map(chunk => {
            if (chunk.isComplete || !timeLearningSettings.isEnabled) return chunk;
            
            const estimate = getPersonalizedEstimate(
                completionHistory,
                { 
                    energyTag: chunk.energyTag, 
                    subStepCount: chunk.subSteps.length,
                    timeOfDay: currentTimeOfDay,
                    dayOfWeek: dayOfWeek,
                },
                timeLearningSettings.sensitivity
            );

            if (estimate) {
                return {
                    ...chunk,
                    personalizedP50: estimate.p50,
                    personalizedP90: estimate.p90,
                    confidence: estimate.confidence,
                    confidenceValue: estimate.confidenceValue,
                    confidenceReason: estimate.confidenceReason,
                };
            }
            return chunk;
        });
    }, [activeMap, completionHistory, timeLearningSettings]);

    const isProjectComplete = useMemo(() => {
        if (!activeMap || activeMap.chunks.length === 0) return false;
        return activeMap.chunks.every(chunk => chunk.isComplete);
    }, [activeMap]);

    const NoteEditor: React.FC<{
        onSave: () => void;
        onCancel: () => void;
    }> = ({ onSave, onCancel }) => (
        <div className="mt-2 space-y-2 p-2 bg-[var(--color-surface-sunken)] rounded-[var(--border-radius-md)] border border-[var(--color-border)]">
            <textarea
                className="w-full p-2 border border-[var(--color-border-hover)] rounded-[var(--border-radius-md)] text-sm focus:ring-1 focus:ring-[var(--color-primary-accent)] focus:border-[var(--color-primary-accent)] bg-transparent"
                placeholder="Add your note..."
                value={noteContent.text}
                onChange={(e) => setNoteContent(prev => ({ ...prev, text: e.target.value }))}
                autoFocus
                rows={3}
            />
            <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <input
                        id={`privacy-check-${editingNote?.id}`}
                        type="checkbox"
                        checked={noteContent.shareWithAI}
                        onChange={e => setNoteContent(prev => ({...prev, shareWithAI: e.target.checked}))}
                        className="h-4 w-4 rounded border-gray-300 text-[var(--color-primary-accent)] focus:ring-[var(--color-primary-accent)]"
                    />
                    <label htmlFor={`privacy-check-${editingNote?.id}`} className="text-xs text-[var(--color-text-subtle)]">Allow AI analysis</label>
                </div>
                <div className="flex space-x-2">
                    <button onClick={onCancel} className="px-3 py-1 text-sm font-semibold text-[var(--color-text-secondary)] bg-[var(--color-surface)] hover:bg-[var(--color-border)] border border-[var(--color-border)] rounded-md transition-colors">Cancel</button>
                    <button onClick={onSave} className="px-3 py-1 text-sm font-semibold text-[var(--color-primary-accent-text)] bg-[var(--color-primary-accent)] hover:bg-[var(--color-primary-accent-hover)] rounded-md transition-colors">Save</button>
                </div>
            </div>
        </div>
    );
    
    const renderError = () => (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-6 rounded-r-lg my-8" role="alert">
            <p className="font-bold">An Error Occurred</p>
            <p>{error}</p>
            <button 
                onClick={() => {
                    setError(null);
                    if (!activeMap) {
                        setGoalInput('');
                    }
                }} 
                className="mt-4 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700"
            >
                Try Again
            </button>
        </div>
    );

    const renderNextBestMoveRibbon = () => {
        if (isProjectComplete) return null;
        const isAllDone = !nextBestMove;
        return (
            <div 
                onClick={() => nextBestMove && handleFocusOnStep(nextBestMove.subStep.id)}
                className={`sticky top-0 z-40 mb-8 p-4 rounded-xl shadow-lg border flex items-center space-x-4 transition-all duration-300 ${isAllDone ? 'bg-green-100 border-green-300' : 'bg-[var(--color-surface)] border-[var(--color-border-hover)] hover:shadow-xl hover:-translate-y-1 cursor-pointer'}`}
            >
                <div className={`flex-shrink-0 rounded-full h-12 w-12 flex items-center justify-center ${isAllDone ? 'bg-[var(--color-success)]' : 'bg-[var(--color-warning)]'}`}>
                    <TargetIcon className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1">
                    <p className={`font-bold text-lg ${isAllDone ? 'text-green-800' : 'text-[var(--color-text-primary)]'}`}>
                        {isAllDone ? "All tasks are complete!" : "Next Best Move"}
                    </p>
                    <p className={`text-[var(--color-text-secondary)] ${isAllDone ? 'text-green-700' : ''}`}>
                         {isAllDone ? "Congratulations on finishing everything." : nextBestMove?.subStep.description}
                    </p>
                </div>
            </div>
        );
    };

    const renderFinishLine = () => (
         <div className="content-card bg-[var(--color-surface)] p-6 rounded-2xl mb-8 relative">
            <div className="flex items-start space-x-5">
                <FinishLineIcon className="h-10 w-10 text-[var(--color-primary-accent)] mt-1 flex-shrink-0" />
                <div className="flex-1">
                    <input 
                        className="text-2xl font-bold text-[var(--color-text-primary)] w-full bg-transparent focus:outline-none focus:bg-[var(--color-surface-sunken)] rounded p-1 -m-1"
                        value={editedFinishLine?.statement || ''}
                        onChange={e => {
                            setEditedFinishLine(p => p ? { ...p, statement: e.target.value } : null);
                            setIsDirty(true);
                        }}
                    />
                    <ul className="mt-4 space-y-2 list-disc list-inside text-[var(--color-text-secondary)]">
                        {editedFinishLine?.acceptanceCriteria.map((item, index) => (
                           <li key={index} className="flex items-center group">
                               <input 
                                   className="flex-grow bg-transparent focus:outline-none focus:bg-[var(--color-surface-sunken)] rounded p-1"
                                   value={item}
                                   onChange={e => {
                                       const newCriteria = [...(editedFinishLine?.acceptanceCriteria || [])];
                                       newCriteria[index] = e.target.value;
                                       setEditedFinishLine(p => p ? { ...p, acceptanceCriteria: newCriteria } : null);
                                       setIsDirty(true);
                                   }}
                               />
                               <button 
                                 onClick={() => {
                                    const newCriteria = (editedFinishLine?.acceptanceCriteria || []).filter((_, i) => i !== index);
                                    setEditedFinishLine(p => p ? { ...p, acceptanceCriteria: newCriteria } : null);
                                    setIsDirty(true);
                                 }}
                                 className="ml-2 text-[var(--color-text-subtle)] hover:text-[var(--color-danger)] opacity-0 group-hover:opacity-100 transition-opacity"
                                 title="Remove criterion"
                               >
                                   <TrashIcon className="h-4 w-4" />
                               </button>
                           </li>
                        ))}
                    </ul>
                     <button 
                        onClick={() => {
                            const newCriteria = [...(editedFinishLine?.acceptanceCriteria || []), ''];
                            setEditedFinishLine(p => p ? { ...p, acceptanceCriteria: newCriteria } : null);
                            setIsDirty(true);
                        }}
                        className="mt-3 flex items-center space-x-1.5 text-sm font-semibold text-[var(--color-primary-accent)] hover:text-[var(--color-primary-accent-hover)]"
                     >
                         <PlusIcon className="h-4 w-4" />
                         <span>Add criterion</span>
                     </button>
                </div>
            </div>
            {isDirty && (
                <div className="mt-4 pt-4 border-t flex justify-end">
                    <button 
                        onClick={handleReplan}
                        disabled={isReplanning}
                        className="px-5 py-2.5 font-semibold text-[var(--color-primary-accent-text)] bg-[var(--color-primary-accent)] rounded-lg hover:bg-[var(--color-primary-accent-hover)] transition-all shadow-md disabled:bg-stone-400 flex items-center"
                    >
                         {isReplanning && <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                        {isReplanning ? 'Re-planning...' : 'Re-plan Roadmap'}
                    </button>
                </div>
            )}
        </div>
    );
    
    const renderSubStep = (chunk: Chunk, subStep: SubStep) => {
        const isEditingThisNote = editingNote?.type === 'subStep' && editingNote.id === subStep.id;
        const isEditingThisSubStep = editingEntity?.type === 'subStep' && editingEntity.id === subStep.id;
    
        return (
            <div key={subStep.id} id={subStep.id} className="group flex items-start space-x-3 p-2 rounded-lg hover:bg-[var(--color-surface-sunken)]/80 transition-colors">
                <input
                    type="checkbox"
                    checked={subStep.isComplete}
                    onChange={() => handleToggleSubStep(chunk.id, subStep.id)}
                    className="animated-checkbox mt-1"
                    aria-label={subStep.description}
                />
                <div className="flex-1">
                    {isEditingThisSubStep ? (
                         <div>
                            <input
                                type="text"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onBlur={handleSaveEditing}
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveEditing()}
                                className={`w-full bg-transparent p-0.5 rounded focus:outline-none focus:ring-1 ring-[var(--color-primary-accent)] ${editingEntity?.error ? 'ring-2 ring-red-500' : ''}`}
                                autoFocus
                            />
                            {editingEntity?.error && <p className="text-xs text-red-600 mt-1">{editingEntity.error}</p>}
                        </div>
                    ) : (
                        <span 
                            onDoubleClick={() => { setEditingEntity({ id: subStep.id, type: 'subStep', chunkId: chunk.id }); setEditingValue(subStep.description); }}
                            className={`transition-colors ${subStep.isComplete ? 'text-[var(--color-text-subtle)] line-through' : 'text-[var(--color-text-primary)]'} ${subStep.isBlocked ? 'text-stone-400 italic' : ''}`}>
                            {subStep.description}
                        </span>
                    )}
    
                    {subStep.note && !isEditingThisNote && (
                        <p className="mt-2 text-sm text-[var(--color-text-secondary)] bg-[var(--color-surface-sunken)] p-2 rounded-md whitespace-pre-wrap border">{subStep.note.text}</p>
                    )}
                    {isEditingThisNote && (
                        <NoteEditor
                            onSave={() => handleSaveNote('subStep', subStep.id, chunk.id)}
                            onCancel={() => setEditingNote(null)}
                        />
                    )}
                </div>
                <div className="flex items-center space-x-1 ml-auto pl-2">
                    {!subStep.isComplete && (
                         <button
                            onClick={() => console.log("Timer started for", subStep.id)}
                            title="Start timer for this step"
                            className="p-1.5 rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-primary-accent)] transition-colors"
                        >
                            <PlayIcon className="h-5 w-5" />
                        </button>
                    )}
                    <button 
                        onClick={() => {
                            if (isEditingThisNote) {
                                setEditingNote(null);
                            } else {
                                setEditingNote({ type: 'subStep', id: subStep.id });
                                setNoteContent({
                                    text: subStep.note?.text || '',
                                    shareWithAI: subStep.note?.shareWithAI ?? true,
                                });
                            }
                        }}
                        className={`p-1.5 rounded-full transition-colors ${isEditingThisNote ? 'bg-[var(--color-primary-accent)] text-white hover:bg-[var(--color-primary-accent-hover)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-text-primary)]'}`} 
                        title="Add/Edit Note"
                    >
                        <NoteIcon hasNote={!!subStep.note} className="h-5 w-5" />
                    </button>
                    <DropdownMenu
                        trigger={
                            <button
                                title="More options"
                                className="p-1.5 rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-text-primary)]"
                            >
                                <MoreOptionsIcon className="h-5 w-5" />
                            </button>
                        }
                    >
                        {!subStep.isComplete && (
                            <>
                                <button
                                    onClick={() => handleToggleBlocked(chunk.id, subStep.id)}
                                    className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-sunken)] rounded-md"
                                >
                                    <LockIcon className={`h-4 w-4 ${subStep.isBlocked ? 'text-red-600' : 'text-stone-500'}`} />
                                    <span>{subStep.isBlocked ? "Unblock Task" : "Mark as Blocked"}</span>
                                </button>
                                 <button
                                    onClick={() => handleSkipSubStep(chunk.id, subStep.id)}
                                    className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-sunken)] rounded-md"
                                >
                                    <SkipIcon className="h-4 w-4 text-blue-600" />
                                    <span>Skip for now</span>
                                </button>
                                <button
                                    onClick={() => handleOpenUnblockerModal(chunk.id, subStep)}
                                    className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-sunken)] rounded-md"
                                >
                                    <HandRaisedIcon className="h-4 w-4 text-yellow-600" />
                                    <span>I'm stuck!</span>
                                </button>
                            </>
                        )}
                    </DropdownMenu>
                </div>
            </div>
        );
    };

    const renderChunkHeader = (chunk: Chunk, isActive: boolean, elapsedSeconds: number) => {
        const p50 = chunk.personalizedP50 || chunk.p50;
        const p90 = chunk.personalizedP90 || chunk.p90;
        const confidenceColors = {
            low: 'bg-orange-100 text-orange-800 border-orange-200',
            medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            high: 'bg-green-100 text-green-800 border-green-200'
        };

        const elapsedMinutes = Math.floor(elapsedSeconds / 60);
        const progressPercent = p90 > 0 ? Math.min(100, (elapsedMinutes / p90) * 100) : 0;
        const remainingMinutes = p90 - elapsedMinutes;

        let progressBarColor = 'bg-green-500';
        if (progressPercent > 90) progressBarColor = 'bg-red-500';
        else if (progressPercent > 75) progressBarColor = 'bg-yellow-500';

        const isEditingThisChunk = editingEntity?.type === 'chunk' && editingEntity.id === chunk.id;
        const canSuggestTitle = !chunk.title && chunk.subSteps.length >= 2;
        const isSuggestingThisTitle = isSuggestingTitle === chunk.id;

        return (
            <div>
                <div className="flex items-start space-x-3">
                    <div className="flex-1">
                        {isEditingThisChunk ? (
                            <div>
                                <input
                                    type="text"
                                    value={editingValue}
                                    onChange={(e) => setEditingValue(e.target.value)}
                                    onBlur={handleSaveEditing}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEditing()}
                                    className={`w-full text-xl font-bold bg-transparent p-0.5 rounded focus:outline-none focus:ring-1 ring-[var(--color-primary-accent)] ${editingEntity?.error ? 'ring-2 ring-red-500' : ''}`}
                                    autoFocus
                                />
                                {editingEntity?.error && <p className="text-xs text-red-600 mt-1">{editingEntity.error}</p>}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <h3 className="text-xl font-bold text-[var(--color-text-primary)]" onDoubleClick={() => { setEditingEntity({ id: chunk.id, type: 'chunk' }); setEditingValue(chunk.title); }}>
                                    {chunk.title || <span className="text-[var(--color-text-subtle)] italic">Untitled Chunk</span>}
                                </h3>
                                {canSuggestTitle && (
                                    <button 
                                        onClick={() => handleSuggestTitle(chunk)} 
                                        disabled={isSuggestingThisTitle}
                                        className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-[var(--color-primary-accent)] bg-[var(--color-surface-sunken)] rounded-full hover:bg-[var(--color-border)] disabled:opacity-50"
                                        title="Suggest a title with AI"
                                    >
                                        {isSuggestingThisTitle ? <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle opacity="25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path opacity="75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <WandIcon className="h-4 w-4" />}
                                        <span>{isSuggestingThisTitle ? 'Suggesting...' : 'Suggest Title'}</span>
                                    </button>
                                )}
                            </div>
                        )}
                        <div className="flex items-center space-x-4 text-sm text-[var(--color-text-secondary)] mt-1 flex-wrap">
                            <div className="flex items-center space-x-1.5" title={chunk.confidenceReason || `P50-P90 Estimate: ${p50}-${p90}m`}>
                                <ClockIcon className="h-4 w-4" />
                                <span>{p50}-{p90}m</span>
                            </div>
                            <div className="flex items-center space-x-1.5" title={`Energy: ${chunk.energyTag}`}>
                                <EnergyIcon className="h-4 w-4" />
                                <span>{chunk.energyTag}</span>
                            </div>
                            {chunk.confidence && chunk.confidenceValue !== undefined && (
                                <div 
                                    className={`flex items-center space-x-1.5 font-semibold text-xs capitalize px-2 py-0.5 rounded-full border ${confidenceColors[chunk.confidence]}`}
                                    title={chunk.confidenceReason}
                                >
                                <span>Confidence: {Math.round(chunk.confidenceValue * 100)}%</span>
                                </div>
                            )}
                        </div>
                        {chunk.warning && <p className="text-xs text-amber-700 bg-amber-100 p-1.5 rounded-md mt-2">💡 {chunk.warning}</p>}
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-24 bg-stone-200 rounded-full h-2.5">
                            <div className="bg-[var(--color-success)] h-2.5 rounded-full" style={{ width: `${(chunk.subSteps.filter(s => s.isComplete).length / chunk.subSteps.length) * 100}%` }}></div>
                        </div>
                        <span className="text-sm font-medium text-[var(--color-text-secondary)] w-12 text-right">
                            {chunk.subSteps.filter(s => s.isComplete).length}/{chunk.subSteps.length}
                        