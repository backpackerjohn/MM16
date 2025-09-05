import React, { useState, useEffect, useMemo } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { MomentumMapData, FinishLine, Chunk, SubStep, Note, EnergyTag, Reflection, SavedTask, CompletionRecord, TimeLearningSettings, UserDifficulty } from '../types';

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


const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const generateInitialPlan = async (goal: string, history: Record<EnergyTag, CompletionRecord[]>): Promise<MomentumMapData> => {
    const schema = {
        type: Type.OBJECT,
        properties: {
            finishLine: {
                type: Type.OBJECT,
                properties: {
                    statement: { type: Type.STRING },
                    acceptanceCriteria: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['statement', 'acceptanceCriteria'],
            },
            chunks: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        title: { type: Type.STRING },
                        subSteps: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    isComplete: { type: Type.BOOLEAN },
                                },
                                required: ['id', 'description', 'isComplete'],
                            },
                        },
                        p50: { type: Type.NUMBER },
                        p90: { type: Type.NUMBER },
                        energyTag: { type: Type.STRING, enum: Object.values(EnergyTag) },
                        blockers: { type: Type.ARRAY, items: { type: Type.STRING } },
                        isComplete: { type: Type.BOOLEAN },
                        warning: { type: Type.STRING, description: 'A gentle warning if an estimate seems unusually high or low based on user history.' }
                    },
                    required: ['id', 'title', 'subSteps', 'p50', 'p90', 'energyTag', 'blockers', 'isComplete'],
                },
            },
        },
        required: ['finishLine', 'chunks'],
    };

    const historySummary = Object.entries(history)
        .filter(([, records]) => records.length > 3)
        .map(([tag, records]) => {
            const avgDeviation = records.reduce((acc, r) => acc + (r.actualDurationMinutes - r.estimatedDurationMinutes), 0) / records.length;
            return `- For '${tag}' tasks, user's actual time is, on average, ${Math.round(avgDeviation)} minutes ${avgDeviation > 0 ? 'longer' : 'shorter'} than estimated.`;
        }).join('\n');
    
    const prompt = `
      You are a world-class project manager. Create a detailed project plan for the following high-level goal.
      The plan should have a clear "Finish Line" and be broken down into logical "Chunks" of work. Each chunk should be about 25-90 minutes of focused work.
      
      **User Performance History:**
      Use this summary of the user's past performance to create more accurate and personalized time estimates. Adjust your P50/P90 estimates based on these patterns.
      ${historySummary || "No significant user history available. Use general estimates."}

      **Instructions:**
      1.  **Finish Line**: Define the final goal and list 3-5 concrete acceptance criteria.
      2.  **Chunks**: Break the project into logical chunks. For each chunk:
          - Give it a clear, actionable title.
          - Break it down into 2-5 small, concrete sub-steps.
          - Provide P50 (median) and P90 (pessimistic) time estimates in WHOLE MINUTES, informed by the user's history.
          - Assign an appropriate EnergyTag.
          - If your estimate for a chunk deviates significantly from what the user's history suggests (e.g., you estimate 30m for a Creative task but they usually take 60m), add a brief, friendly 'warning' message explaining the potential discrepancy.
          - List any potential initial blockers.
          - Generate unique IDs for chunks and sub-steps (e.g., "chunk-1", "ss-1-1").
          - Set initial "isComplete" status to false for all items.

      Return a single JSON object that strictly follows the provided schema.

      **High-Level Goal**: "${goal}"
    `;

    try {
        const apiCall = ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema },
        });

        const timeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Request timed out after 60 seconds. The AI might be busy, please try again.")), 60000)
        );

        const response = await Promise.race([apiCall, timeout]);

        const jsonStr = (response as any).text.trim();
        return JSON.parse(jsonStr) as MomentumMapData;
    } catch (error) {
        console.error("Error generating initial plan:", error);
         if (error instanceof Error) {
            throw new Error(error.message);
        }
        throw new Error("The AI failed to generate a plan. Please try again later.");
    }
};


const rePlanIncompleteChunks = async (finishLine: FinishLine, completedSubSteps: { id: string; description: string }[], incompleteChunks: Chunk[]): Promise<Chunk[]> => {
     const schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                subSteps: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            description: { type: Type.STRING },
                            isComplete: { type: Type.BOOLEAN },
                        },
                        required: ['id', 'description', 'isComplete'],
                    },
                },
                p50: { type: Type.NUMBER },
                p90: { type: Type.NUMBER },
                energyTag: { type: Type.STRING, enum: Object.values(EnergyTag) },
                blockers: { type: Type.ARRAY, items: { type: Type.STRING } },
                isComplete: { type: Type.BOOLEAN },
            },
            required: ['id', 'title', 'subSteps', 'p50', 'p90', 'energyTag', 'blockers', 'isComplete'],
        },
    };

    const prompt = `
        You are a world-class project manager, tasked with re-planning a project because the final goal has changed.
        
        **New Goal (Finish Line)**: ${finishLine.statement}
        **New Acceptance Criteria**: ${finishLine.acceptanceCriteria.join(', ')}

        **Completed Work (DO NOT CHANGE)**:
        The following sub-steps have already been completed and must remain in the plan as-is.
        - ${completedSubSteps.map(s => s.description).join('\n- ') || 'None'}

        **Existing Incomplete Chunks (ADJUST THESE)**:
        Analyze the following incomplete chunks and adjust their titles, sub-steps, and estimates to align with the *new* Finish Line.
        You can add, remove, or modify chunks and sub-steps as needed to create the most efficient path to the new goal.
        Preserve existing IDs if a chunk or sub-step is only slightly modified. Create new IDs for entirely new items.
        
        **Return a JSON array of the NEW, re-planned chunks.**

        **Incomplete Chunks to Re-plan**:
        ${JSON.stringify(incompleteChunks, null, 2)}
    `;

     try {
        const apiCall = ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema },
        });

        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Request timed out after 60 seconds. The AI might be busy, please try again.")), 60000)
        );
        
        const response = await Promise.race([apiCall, timeout]);
        
        const jsonStr = (response as any).text.trim();
        return JSON.parse(jsonStr) as Chunk[];
    } catch (error) {
        console.error("Error replanning:", error);
        if (error instanceof Error) {
            throw new Error(error.message);
        }
        throw new Error("The AI failed to re-plan. Please try again.");
    }
}

const generateSplitSuggestion = async (chunk: Chunk): Promise<Chunk[]> => {
    const chunkSchema = {
        type: Type.OBJECT,
        properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            subSteps: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        id: { type: Type.STRING },
                        description: { type: Type.STRING },
                        isComplete: { type: Type.BOOLEAN },
                    },
                    required: ['id', 'description', 'isComplete'],
                },
            },
            p50: { type: Type.NUMBER },
            p90: { type: Type.NUMBER },
            energyTag: { type: Type.STRING, enum: Object.values(EnergyTag) },
            blockers: { type: Type.ARRAY, items: { type: Type.STRING } },
            isComplete: { type: Type.BOOLEAN },
        },
        required: ['id', 'title', 'subSteps', 'p50', 'p90', 'energyTag', 'blockers', 'isComplete'],
    };

    const schema = {
        type: Type.ARRAY,
        items: chunkSchema,
    };
    
    const prompt = `
      You are an expert project manager. A user finds a "chunk" of work too large and wants to split it.
      Your task is to break the given chunk into 2 or 3 smaller, more manageable chunks.

      - Each new chunk should be a logical sub-part of the original.
      - Each new chunk should have a clear, actionable title.
      - Distribute the original sub-steps among the new chunks. You can rephrase them for clarity if needed.
      - Create new P50 and P90 estimates for each new chunk. The sum of the new P90s should be roughly equal to the original P90.
      - Assign the same EnergyTag as the original.
      - Generate new unique IDs for the new chunks (e.g., "chunk-1-split-a") and their sub-steps (e.g., "ss-1-a-1").
      - Set "isComplete" to false.

      **Original Chunk to Split:**
      ${JSON.stringify({ title: chunk.title, subSteps: chunk.subSteps.map(s => s.description), p90: chunk.p90, energyTag: chunk.energyTag }, null, 2)}

      Return a JSON array of the new chunk objects, strictly following the schema.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema },
        });
        const jsonStr = response.text.trim();
        return JSON.parse(jsonStr) as Chunk[];
    } catch (error) {
        console.error("Error generating split suggestion:", error);
        throw new Error("The AI failed to suggest a split. Please try again or split it manually.");
    }
};

const generateUnblockerSuggestion = async (subStep: SubStep, context: string): Promise<string> => {
    const schema = {
        type: Type.OBJECT,
        properties: {
            suggestion: { type: Type.STRING },
        },
        required: ['suggestion'],
    };

    const prompt = `
      You are a helpful productivity coach. A user is feeling stuck on a task.
      Your goal is to suggest a single, tiny, concrete, and easy-to-start "micro-step" to help them get moving.
      This micro-step should take less than 5 minutes to complete. It's about building momentum, not solving the whole problem.

      - Focus on a physical action (e.g., "Open a new document and title it...", "Draft a one-sentence email to...").
      - Do not suggest just "thinking about it" or "making a plan".
      - The suggestion should be a simple declarative sentence.

      **Project Goal:** ${context}
      **Stuck on this sub-step:** "${subStep.description}"
      **Known blockers:** ${subStep.blockers?.join(', ') || 'None specified'}

      Return a single JSON object with one key, "suggestion", containing the string for the micro-step.
      Example: { "suggestion": "Open a new email draft to John Smith with the subject 'Quick question'." }
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema },
        });
        const jsonStr = response.text.trim();
        const result = JSON.parse(jsonStr);
        return result.suggestion;
    } catch (error) {
        console.error("Error generating unblocker suggestion:", error);
        throw new Error("The AI failed to provide a suggestion. Try rephrasing your goal.");
    }
};

interface MomentumMapProps {
  activeMap: MomentumMapData | null;
  setActiveMap: React.Dispatch<React.SetStateAction<MomentumMapData | null>>;
  setSavedTasks: React.Dispatch<React.SetStateAction<SavedTask[]>>;
  completionHistory: Record<EnergyTag, CompletionRecord[]>;
  onNewCompletionRecord: (record: Omit<CompletionRecord, 'id' | 'timeOfDay'>) => void;
  timeLearningSettings: TimeLearningSettings;
  onSuccess: (message: string) => void;
}


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
        try {
            const data = await generateInitialPlan(goal, completionHistory);
            setActiveMap(data);
            setOpenChunks(data.chunks.map(c => c.id));
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
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

        try {
            const newIncompleteChunks = await rePlanIncompleteChunks(editedFinishLine, completedSubSteps, incompleteChunks);
            const newMapData = {
                finishLine: editedFinishLine,
                chunks: [...completedChunks, ...newIncompleteChunks],
            };
            setActiveMap(newMapData);
            setIsDirty(false);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsReplanning(false);
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
        try {
            const suggestion = await generateUnblockerSuggestion(subStep, activeMap?.finishLine.statement || '');
            setUnblockerSuggestion(suggestion);
        } catch (e: any) {
            setError(e.message);
            setUnblockingStep(null); // Close modal on error
        } finally {
            setIsGeneratingSuggestion(false);
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
        // FIX: Use chunkId in the callback, not an undefined 'id'.
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

    const renderLoading = () => (
        <div className="text-center py-20">
            <svg className="animate-spin mx-auto h-12 w-12 text-[var(--color-primary-accent)] mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">AI is building your roadmap...</h2>
            <p className="text-[var(--color-text-secondary)]">This might take a moment.</p>
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
         <div className="bg-[var(--color-surface)] p-6 rounded-2xl shadow-lg border border-[var(--color-border)] mb-8 relative">
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

        return (
            <div key={subStep.id} id={subStep.id} className="group flex items-start space-x-3 p-2 rounded-lg hover:bg-[var(--color-surface-sunken)]/80 transition-colors">
                <input
                    type="checkbox"
                    checked={subStep.isComplete}
                    onChange={() => handleToggleSubStep(chunk.id, subStep.id)}
                    className="mt-1 h-5 w-5 rounded-md border-stone-300 text-[var(--color-primary-accent)] focus:ring-[var(--color-primary-accent)] focus:ring-offset-2"
                    aria-label={subStep.description}
                />
                <div className="flex-1">
                    <span className={`transition-colors ${subStep.isComplete ? 'text-[var(--color-text-subtle)] line-through' : 'text-[var(--color-text-primary)]'} ${subStep.isBlocked ? 'text-stone-400 italic' : ''}`}>
                        {subStep.description}
                    </span>
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
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!subStep.isComplete && (
                         <button
                            onClick={() => console.log("Timer started for", subStep.id)}
                            title="Start timer for this step"
                            className="p-1.5 rounded-full hover:bg-[var(--color-surface)]"
                        >
                            <PlayIcon className="h-5 w-5 text-green-600" />
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
                        className={`p-1.5 rounded-full transition-colors ${isEditingThisNote ? 'bg-[var(--color-primary-accent)] text-white hover:bg-[var(--color-primary-accent-hover)]' : 'text-[var(--color-text-subtle)] hover:bg-[var(--color-surface)]'}`} 
                        title="Add/Edit Note"
                    >
                        <NoteIcon hasNote={!!subStep.note} className="h-5 w-5" />
                    </button>
                    {!subStep.isComplete && (
                        <DropdownMenu
                            trigger={
                                <button
                                    title="More options"
                                    className="p-1.5 rounded-full text-[var(--color-text-subtle)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]"
                                >
                                    <MoreOptionsIcon className="h-5 w-5" />
                                </button>
                            }
                        >
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
                        </DropdownMenu>
                    )}
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

        return (
            <div>
                <div className="flex items-center space-x-3">
                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-[var(--color-text-primary)]">{chunk.title}</h3>
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
                        </span>
                    </div>
                </div>
                {isActive && (
                    <div className="mt-3">
                        <div className="flex justify-between items-center text-xs font-semibold mb-1">
                            <span className="text-[var(--color-text-secondary)]">Progress</span>
                            <span className={remainingMinutes < 0 ? 'text-red-600' : 'text-[var(--color-text-primary)]'}>
                                {remainingMinutes >= 0 ? `~${remainingMinutes}m remaining` : `${-remainingMinutes}m over`}
                            </span>
                        </div>
                        <div className="w-full bg-[var(--color-surface-sunken)] rounded-full h-1.5 border">
                            <div className={`${progressBarColor} h-1.5 rounded-full transition-all duration-500`} style={{ width: `${progressPercent}%` }}></div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    const renderListView = () => (
        <div className="space-y-4">
            {chunksWithPersonalizedEstimates.map(chunk => (
                <div key={chunk.id} data-chunkid={chunk.id} className={`bg-[var(--color-surface)] p-4 rounded-xl shadow-sm border border-[var(--color-border)] transition-all duration-300 ${chunk.isComplete ? 'opacity-60 bg-[var(--color-surface-sunken)]' : ''}`}>
                    <div className="flex items-center">
                        <div className="flex-1 cursor-pointer" onClick={() => handleToggleChunk(chunk.id)}>
                            {renderChunkHeader(chunk, chunk.id === activeChunk?.id, elapsedSeconds)}
                        </div>
                         <div className="flex items-center space-x-1 pl-2">
                             {!chunk.isComplete && (
                                <button
                                    onClick={() => setChunkToSplit(chunk)}
                                    title="Split into smaller chunks"
                                    className="p-1.5 rounded-full text-[var(--color-text-subtle)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-text-primary)]"
                                >
                                    <SplitIcon className="h-5 w-5" />
                                </button>
                            )}
                            <button onClick={() => handleToggleChunk(chunk.id)} className="p-1 rounded-full text-[var(--color-text-subtle)] hover:bg-[var(--color-surface-sunken)]">
                                {openChunks.includes(chunk.id) ? <ChevronDownIcon className="h-6 w-6"/> : <ChevronRightIcon className="h-6 w-6"/>}
                            </button>
                        </div>
                    </div>
                    {openChunks.includes(chunk.id) && (
                        <div className="mt-4 pt-4 border-t border-[var(--color-border)]/80 space-y-1">
                           {chunk.subSteps.map(ss => renderSubStep(chunk, ss))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );

    const renderCardView = () => (
         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {chunksWithPersonalizedEstimates.map(chunk => (
                <div key={chunk.id} data-chunkid={chunk.id} className={`bg-[var(--color-surface)] p-6 rounded-2xl shadow-sm border border-[var(--color-border)] flex flex-col transition-all duration-300 ${chunk.isComplete ? 'opacity-60 bg-[var(--color-surface-sunken)]' : 'hover:shadow-lg hover:border-[var(--color-primary-accent)] hover:-translate-y-1'}`}>
                    <div className="flex items-start">
                         <div className="flex-1">{renderChunkHeader(chunk, chunk.id === activeChunk?.id, elapsedSeconds)}</div>
                        {!chunk.isComplete && (
                             <button
                                onClick={() => setChunkToSplit(chunk)}
                                title="Split into smaller chunks"
                                className="p-1.5 rounded-full text-[var(--color-text-subtle)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-text-primary)] -mt-1 -mr-1"
                            >
                                <SplitIcon className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                    <div className="mt-4 pt-4 border-t border-[var(--color-border)]/80 space-y-1 flex-1">
                        {chunk.subSteps.map(ss => renderSubStep(chunk, ss))}
                    </div>
                </div>
            ))}
        </div>
    );

    const renderCompletionScreen = () => {
        if (!activeMap) return null;

        const totalChunks = activeMap.chunks.length;
        const totalSubSteps = activeMap.chunks.reduce((sum, chunk) => sum + chunk.subSteps.length, 0);
        const totalP50 = activeMap.chunks.reduce((sum, chunk) => sum + chunk.p50, 0);
        const totalP90 = activeMap.chunks.reduce((sum, chunk) => sum + chunk.p90, 0);
        const formatMinutes = (minutes: number) => {
            const h = Math.floor(minutes / 60);
            const m = minutes % 60;
            return `${h > 0 ? `${h}h ` : ''}${m}m`;
        }

        const handleExport = () => {
            let text = `**Momentum Achieved: ${activeMap.finishLine.statement}**\n\n`;
            text += "**Acceptance Criteria:**\n";
            activeMap.finishLine.acceptanceCriteria.forEach(ac => text += `- [x] ${ac}\n`);
            text += "\n---\n\n**Roadmap:**\n\n";
            activeMap.chunks.forEach(chunk => {
                text += `**${chunk.title}** (Est: ${chunk.p50}-${chunk.p90}m | Energy: ${chunk.energyTag})\n`;
                chunk.subSteps.forEach(ss => text += `- [x] ${ss.description}\n`);
                if(chunk.reflection) {
                    text += `  - _Reflection:_ Helped: ${chunk.reflection.helped} | Tripped Up: ${chunk.reflection.trippedUp}\n`
                }
                text += "\n";
            });
            navigator.clipboard.writeText(text).then(() => alert("Roadmap copied to clipboard!"));
        };

        return (
            <div className="relative overflow-hidden">
                <Confetti />
                <div className="text-center bg-[var(--color-surface)] p-10 rounded-2xl shadow-2xl border border-[var(--color-border)]/80 z-10 relative">
                    <TrophyIcon className="h-20 w-20 text-yellow-500 mx-auto mb-4" />
                    <h1 className="text-5xl font-extrabold text-[var(--color-primary-accent)] mb-2 tracking-tight">Momentum Achieved!</h1>
                    <p className="text-xl text-[var(--color-text-secondary)] max-w-2xl mx-auto mb-8">
                        Congratulations! You've successfully completed your goal: "{activeMap.finishLine.statement}"
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-left my-10 max-w-4xl mx-auto">
                        <div className="bg-[var(--color-surface-sunken)] p-4 rounded-lg">
                            <h3 className="text-[var(--color-text-subtle)] font-semibold text-sm">Total Chunks</h3>
                            <p className="text-[var(--color-text-primary)] font-bold text-3xl">{totalChunks}</p>
                        </div>
                        <div className="bg-[var(--color-surface-sunken)] p-4 rounded-lg">
                            <h3 className="text-[var(--color-text-subtle)] font-semibold text-sm">Total Sub-steps</h3>
                            <p className="text-[var(--color-text-primary)] font-bold text-3xl">{totalSubSteps}</p>
                        </div>
                        <div className="bg-[var(--color-surface-sunken)] p-4 rounded-lg col-span-2">
                            <h3 className="text-[var(--color-text-subtle)] font-semibold text-sm">Total Estimated Time</h3>
                            <p className="text-[var(--color-text-primary)] font-bold text-3xl">{formatMinutes(totalP50)} - {formatMinutes(totalP90)}</p>
                        </div>
                    </div>
                    
                    <div className="max-w-xl mx-auto text-left mb-10">
                        <h3 className="font-bold text-[var(--color-text-primary)] text-lg mb-3">Acceptance Criteria Met:</h3>
                        <ul className="space-y-2">
                            {activeMap.finishLine.acceptanceCriteria.map((item, index) => (
                                <li key={index} className="flex items-center text-[var(--color-text-secondary)] bg-green-50/70 p-2 rounded-md">
                                    <svg className="h-5 w-5 text-green-600 mr-3 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="flex justify-center items-center space-x-4">
                        <button 
                            onClick={handleExport}
                            className="flex items-center space-x-2 px-5 py-3 text-sm font-semibold text-[var(--color-text-secondary)] bg-[var(--color-surface)] border border-[var(--color-border-hover)] hover:bg-[var(--color-surface-sunken)] rounded-lg transition-all duration-300 shadow-sm"
                        >
                            <ShareIcon className="h-5 w-5" />
                            <span>Export Roadmap</span>
                        </button>
                        <button
                            onClick={() => {
                                setActiveMap(null);
                                setGoalInput('');
                            }}
                            className="flex items-center space-x-2 px-5 py-3 text-sm font-semibold text-[var(--color-primary-accent-text)] bg-[var(--color-primary-accent)] hover:bg-[var(--color-primary-accent-hover)] rounded-lg transition-all duration-300 shadow-md">
                            <span>Start a New Map</span>
                        </button>
                    </div>
                </div>
            </div>
        )
    }


    if (isLoading) return <main className="container mx-auto p-8">{renderLoading()}</main>;

    if (!activeMap) {
        return (
            <main className="container mx-auto p-8">
                {error ? renderError() : (
                    <div className="text-center py-20 bg-[var(--color-surface)] rounded-2xl shadow-lg border max-w-3xl mx-auto">
                        <FinishLineIcon className="h-12 w-12 text-[var(--color-primary-accent)] mx-auto mb-4" />
                        <h2 className="text-3xl font-bold text-[var(--color-text-primary)]">What's Your Finish Line?</h2>
                        <p className="text-[var(--color-text-secondary)] mt-2 mb-6 max-w-lg mx-auto">Describe your high-level goal, and the AI will generate a step-by-step roadmap to get you there.</p>
                        <div className="flex flex-col sm:flex-row justify-center items-stretch gap-2 mt-4 px-8">
                            <input
                                type="text"
                                value={goalInput}
                                onChange={(e) => setGoalInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleGenerateInitialPlan(goalInput); }}
                                placeholder="e.g., Launch a new productivity app"
                                className="w-full max-w-md p-4 border border-[var(--color-border-hover)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary-accent)] transition-shadow text-base bg-transparent"
                                autoFocus
                            />
                            <button 
                                onClick={() => handleGenerateInitialPlan(goalInput)} 
                                disabled={!goalInput.trim()}
                                className="w-full sm:w-auto px-6 py-4 font-semibold text-[var(--color-primary-accent-text)] bg-[var(--color-primary-accent)] rounded-lg hover:bg-[var(--color-primary-accent-hover)] transition-all shadow-md disabled:bg-stone-400 flex items-center justify-center text-base"
                            >
                                Generate Roadmap
                            </button>
                        </div>
                    </div>
                )}
            </main>
        );
    }

    if (isProjectComplete) return <main className="container mx-auto p-8">{renderCompletionScreen()}</main>;
    
    return (
        <main className="container mx-auto p-8">
            <style>{`.animate-pulse-once { animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1); }`}</style>
            
            {renderNextBestMoveRibbon()}

            {renderFinishLine()}

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-[var(--color-text-primary)]">Your Roadmap</h2>
                <div className="flex items-center space-x-1 p-1 bg-[var(--color-surface-sunken)] rounded-lg">
                    <button 
                        onClick={() => setView('list')} 
                        className={`flex items-center space-x-2 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${view === 'list' ? 'bg-[var(--color-surface)] shadow-sm text-[var(--color-primary-accent)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'}`}
                    >
                        <ListViewIcon className="h-5 w-5" />
                        <span>List</span>
                    </button>
                    <button 
                        onClick={() => setView('card')} 
                        className={`flex items-center space-x-2 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${view === 'card' ? 'bg-[var(--color-surface)] shadow-sm text-[var(--color-primary-accent)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'}`}
                    >
                        <CardViewIcon className="h-5 w-5" />
                        <span>Card</span>
                    </button>
                </div>
            </div>

            {error && renderError()}
            
            {view === 'list' ? renderListView() : renderCardView()}

            <CompletionFeedbackCard
                isOpen={!!feedbackChunk}
                chunk={feedbackChunk!}
                actualDuration={actualDuration}
                newEstimate={feedbackChunk ? getPersonalizedEstimate(
                    completionHistory, 
                    { 
                        energyTag: feedbackChunk.energyTag, 
                        subStepCount: feedbackChunk.subSteps.length,
                        timeOfDay: getTimeOfDay(new Date()),
                        dayOfWeek: new Date().getDay(),
                    },
                    timeLearningSettings.sensitivity
                ) : null}
                onFeedback={handleFeedbackSubmit}
                onFlowComplete={handleCompletionFlowEnd}
            />
            <ReflectionModal
                isOpen={!!reflectingChunk}
                onClose={() => setReflectingChunk(null)}
                onSave={handleSaveReflection}
                chunk={reflectingChunk}
                onSuccess={onSuccess}
            />
            <SplitChunkModal
                isOpen={!!chunkToSplit}
                onClose={() => setChunkToSplit(null)}
                onSave={handleSaveSplit}
                chunkToSplit={chunkToSplit}
                onGenerateSplit={generateSplitSuggestion}
            />
            <UnblockerModal
                isOpen={!!unblockingStep}
                onClose={() => setUnblockingStep(null)}
                onAccept={handleAcceptUnblocker}
                suggestion={unblockerSuggestion}
                isLoading={isGeneratingSuggestion}
                blockedStepText={unblockingStep?.subStep.description || ''}
            />
            <SaveMapModal
                isOpen={isSaveModalOpen}
                onClose={() => setIsSaveModalOpen(false)}
                onSave={handleSaveMap}
            />
             <div className="fixed bottom-8 left-8 z-50">
                <button
                    onClick={() => setIsSaveModalOpen(true)}
                    disabled={!activeMap}
                    className="px-5 py-3 font-semibold text-[var(--color-primary-accent-text)] bg-[var(--color-primary-accent)] rounded-full hover:bg-[var(--color-primary-accent-hover)] transition-all shadow-lg flex items-center space-x-3 disabled:bg-stone-400 disabled:cursor-not-allowed"
                    title="Save Momentum Map"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v12l-5-3-5 3V4z" /></svg>
                    <span className="hidden sm:inline">Save Momentum Map</span>
                </button>
            </div>
        </main>
    );
};

export default MomentumMap;