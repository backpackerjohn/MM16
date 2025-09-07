
import React, { useState, useMemo, useEffect } from 'react';
import { EnergyTag } from '../contracts';
import { ScheduleEvent, SmartReminder, ReminderStatus, ContextTag, SuccessState, DNDWindow, MicroHabit, UndoAction } from '../types';
import BellIcon from './icons/BellIcon';
import WandIcon from './icons/WandIcon';
import LockIcon from './icons/LockIcon';
import LockOpenIcon from './icons/LockOpenIcon';
import InfoIcon from './icons/InfoIcon';
import PauseIcon from './icons/PauseIcon';
import CalendarIcon from './icons/CalendarIcon';
import GearIcon from './icons/GearIcon';
import PlusIcon from './icons/PlusIcon';
import DuplicateIcon from './icons/DuplicateIcon';
import AddAnchorModal from './AddAnchorModal';
import AddReminderModal from './AddReminderModal';
import AiChat from './AiChat';
import { getAnchorColor } from '../utils/styles';
import { getHabitSuggestion } from '../utils/habitStacking';
import { recordHabitCompletion } from '../utils/habitAnalytics';
import ProgressIndicator from './ProgressIndicator';
import DropdownMenu from './DropdownMenu';
import MoreOptionsIcon from './icons/MoreOptionsIcon';
import TrashIcon from './icons/TrashIcon';
import { parseNaturalLanguageReminder } from '../services/geminiService';

// --- CONSTANTS & HELPERS ---
const DAYS_OF_WEEK: ScheduleEvent['day'][] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const formatTimeForToast = (time: string): string => {
    if (!time) return '';
    const [hourStr, minuteStr] = time.split(':');
    let hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    hour = hour ? hour : 12; // the hour '0' should be '12'
    return `${hour}${minuteStr !== '00' ? `:${minuteStr}` : ''}${ampm}`;
};

export const formatDaysForToast = (days: ScheduleEvent['day'][]) => {
    if (days.length === 0) return '';
    const dayMap: Record<ScheduleEvent['day'], string> = {
        Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu',
        Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun'
    };
    const sortedDays = DAYS_OF_WEEK.filter(d => days.includes(d));

    if (days.length >= 5 && sortedDays.join(',').includes('Monday,Tuesday,Wednesday,Thursday,Friday')) return 'Weekdays';
    if (sortedDays.length === 2 && sortedDays.includes('Saturday') && sortedDays.includes('Sunday')) return 'Weekends';
    
    return sortedDays.map(d => dayMap[d]).join(', ');
};

export const formatOffsetForToast = (offsetMinutes: number) => {
    if (offsetMinutes === 0) return "at the start of";
    const minutes = Math.abs(offsetMinutes);
    const beforeOrAfter = offsetMinutes < 0 ? "before" : "after";
    return `${minutes} minute${minutes > 1 ? 's' : ''} ${beforeOrAfter}`;
};

const timeToMinutes = (time: string): number => {
    if (!time) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

const minutesToTime = (minutes: number): string => {
    const h = Math.floor(minutes / 60) % 24;
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const doTimesOverlap = (startA: string, endA: string, startB: string, endB: string): boolean => {
    const startAMin = timeToMinutes(startA);
    const endAMin = timeToMinutes(endA);
    const startBMin = timeToMinutes(startB);
    const endBMin = timeToMinutes(endB);
    return startAMin < endBMin && endAMin > startBMin;
};

// --- TYPE DEFINITIONS ---
type OnboardingPreviewData = { newAnchors: ScheduleEvent[]; newDnd: DNDWindow[] };
type SettingsData = {
    globalAllowExperiments: boolean;
    maxFollowUps: 0 | 1;
    autoPauseThreshold: number;
    stackingGuardrailEnabled: boolean;
};
type ConflictType = {
    type: 'dnd' | 'overlap';
    eventToMoveId: string;
    targetDay: ScheduleEvent['day'];
    overlappingEventId?: string;
};

interface CalendarPageProps {
    scheduleEvents: ScheduleEvent[];
    setScheduleEvents: React.Dispatch<React.SetStateAction<ScheduleEvent[]>>;
    smartReminders: SmartReminder[];
    setSmartReminders: React.Dispatch<React.SetStateAction<SmartReminder[]>>;
    dndWindows: DNDWindow[];
    setDndWindows: React.Dispatch<React.SetStateAction<DNDWindow[]>>;
    pauseUntil: string | null;
    setPauseUntil: React.Dispatch<React.SetStateAction<string | null>>;
    onboardingPreview: OnboardingPreviewData | null;
    setOnboardingPreview: React.Dispatch<React.SetStateAction<OnboardingPreviewData | null>>;
    onSuccess: (message: string) => void;
    onUndo: (action: Omit<UndoAction, 'id'>) => void;
}
type ChangeHistoryItem = { id: number; message: string; undo: () => void; };

// --- ONBOARDING COMPONENT ---
const OnboardingFlow: React.FC<{ 
    isOpen: boolean;
    onComplete: (data: OnboardingPreviewData) => void;
    onClose: () => void;
    onboardingPreview: OnboardingPreviewData | null;
    setOnboardingPreview: React.Dispatch<React.SetStateAction<OnboardingPreviewData | null>>;
}> = ({ isOpen, onComplete, onClose, onboardingPreview, setOnboardingPreview }) => {
    const [step, setStep] = useState(1);
    
    type TimeBlock = { id: number; startTime: string; endTime: string; days: ScheduleEvent['day'][] };
    const initialBlocks: TimeBlock[] = [{ id: Date.now(), startTime: '09:00', endTime: '17:00', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] }];
    const [blocks, setBlocks] = useState<TimeBlock[]>(initialBlocks);
    const [activeBlockId, setActiveBlockId] = useState<number | null>(initialBlocks[0]?.id || null);
    const [customTime, setCustomTime] = useState<{ id: number; part: 'startTime' | 'endTime' } | null>(null);

    const initialDnd = { sleepStart: '23:00', sleepEnd: '07:00' };
    const [dndSettings, setDndSettings] = useState(initialDnd);
    
    const [generatedPreview, setGeneratedPreview] = useState<OnboardingPreviewData | null>(null);
    const [isCustomDnd, setIsCustomDnd] = useState(false);

    const generateDefaults = (): OnboardingPreviewData => {
        const newAnchors: ScheduleEvent[] = [];
        const newDnd: DNDWindow[] = [];
        const workDays: ScheduleEvent['day'][] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  
        workDays.forEach(day => {
          newAnchors.push({
            id: `onboard-work-${day}`,
            day,
            title: 'Work',
            startTime: '09:00',
            endTime: '17:00',
            contextTags: [ContextTag.Work, ContextTag.HighEnergy],
            bufferMinutes: { prep: 15 }
          });
        });
        
         newAnchors.push({
            id: `onboard-weekend-relax`,
            day: 'Saturday',
            title: 'Weekend Relaxation',
            startTime: '10:00',
            endTime: '12:00',
            contextTags: [ContextTag.Personal, ContextTag.Relaxed]
        });
  
        DAYS_OF_WEEK.forEach(day => {
          newDnd.push({
            day,
            startTime: '23:00',
            endTime: '07:00',
          });
        });
  
        return { newAnchors, newDnd };
    };

    useEffect(() => {
        if (isOpen) {
            if (onboardingPreview) {
                const anchorsByTime = onboardingPreview.newAnchors.reduce((acc, anchor) => {
                    const key = `${anchor.startTime}-${anchor.endTime}`;
                    const existing = acc[key];
                    const day = anchor.day as ScheduleEvent['day'];
                    if (existing) {
                        existing.days.push(day);
                    } else {
                        acc[key] = { startTime: anchor.startTime, endTime: anchor.endTime, days: [day] };
                    }
                    return acc;
                }, {} as Record<string, { startTime: string; endTime: string; days: ScheduleEvent['day'][] }>);

                const previewBlocks: TimeBlock[] = Object.values(anchorsByTime).map((blockData, index) => ({
                    id: Date.now() + index,
                    ...blockData
                }));

                if (previewBlocks.length > 0) {
                    setBlocks(previewBlocks);
                    setActiveBlockId(previewBlocks[0].id);
                }
                
                setGeneratedPreview(onboardingPreview);
                
                const dndWindow = onboardingPreview.newDnd[0];
                if (dndWindow) {
                    setDndSettings({
                        sleepStart: dndWindow.startTime,
                        sleepEnd: dndWindow.endTime,
                    });
                }
                setStep(4);
            } else {
                const newInitialBlocks: TimeBlock[] = [{ id: Date.now(), startTime: '09:00', endTime: '17:00', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] }];
                setBlocks(newInitialBlocks);
                setActiveBlockId(newInitialBlocks[0].id);
                setStep(1);
                setGeneratedPreview(null);
                setDndSettings(initialDnd);
            }
        }
    }, [isOpen, onboardingPreview]);
    
    const handleClose = () => {
        if (step < 4 && !onboardingPreview) {
            const defaults = generateDefaults();
            setOnboardingPreview(defaults);
        }
        onClose();
    };

    const handleConfirm = () => {
        if (generatedPreview) {
            onComplete(generatedPreview);
            setOnboardingPreview(null);
        }
    };

    const generateAndPreview = () => {
        const newAnchors: ScheduleEvent[] = [];
        blocks.forEach((block, blockIndex) => {
            if (block.startTime && block.endTime && block.days.length > 0) {
                block.days.forEach(day => {
                    newAnchors.push({
                        id: `onboard-work-${blockIndex}-${day}`,
                        day: day,
                        title: 'Work/School',
                        startTime: block.startTime,
                        endTime: block.endTime,
                        contextTags: [ContextTag.Work, ContextTag.HighEnergy],
                        bufferMinutes: { prep: 15, recovery: 15 }
                    });
                });
            }
        });

        const newDnd: DNDWindow[] = [];
        const { sleepStart, sleepEnd } = dndSettings;
        DAYS_OF_WEEK.forEach(day => {
            newDnd.push({ day, startTime: sleepStart, endTime: sleepEnd });
        });
        
        setGeneratedPreview({ newAnchors, newDnd });
        setStep(4);
    };
    
    const formatTimeForDisplay = (time: string): string => {
        if (!time) return '';
        const [hourStr, minuteStr] = time.split(':');
        let hour = parseInt(hourStr, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12;
        hour = hour ? hour : 12;
        return `${hour}${minuteStr !== '00' ? `:${minuteStr}` : ''} ${ampm}`;
    };
    
    const formatDays = (days: ScheduleEvent['day'][]) => {
        if (days.length === 0) return '';
        const dayMap: Record<ScheduleEvent['day'], string> = {
            Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu',
            Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun'
        };
        const sortedDays = DAYS_OF_WEEK.filter(d => days.includes(d));

        if (sortedDays.join(',') === 'Monday,Tuesday,Wednesday,Thursday,Friday') return 'Mon–Fri';
        if (sortedDays.join(',') === 'Saturday,Sunday') return 'Sat–Sun';
        if (sortedDays.length === 7) return 'Every day';

        return sortedDays.map(d => dayMap[d]).join(', ');
    };

    const updateBlock = (id: number, field: keyof Omit<TimeBlock, 'id'>, value: any) => {
        setBlocks(currentBlocks => currentBlocks.map(b => {
            if (b.id === id) {
                const updatedBlock = { ...b, [field]: value };
                if (field === 'startTime' && updatedBlock.endTime && timeToMinutes(value) >= timeToMinutes(updatedBlock.endTime)) {
                    updatedBlock.endTime = '';
                }
                return updatedBlock;
            }
            return b;
        }));
    };

    const toggleDay = (id: number, day: ScheduleEvent['day']) => {
        setBlocks(currentBlocks => currentBlocks.map(b => {
            if (b.id === id) {
                const newDays = b.days.includes(day)
                    ? b.days.filter(d => d !== day)
                    : [...b.days, day];
                return { ...b, days: newDays };
            }
            return b;
        }));
    };

    const addBlock = () => {
        const newBlock = { id: Date.now(), startTime: '', endTime: '', days: [] as ScheduleEvent['day'][] };
        setBlocks(currentBlocks => [...currentBlocks, newBlock]);
        setActiveBlockId(newBlock.id);
    };

    const removeBlock = (id: number) => {
        setBlocks(currentBlocks => {
            const newBlocks = currentBlocks.filter(b => b.id !== id);
            if (activeBlockId === id) {
                setActiveBlockId(newBlocks.length > 0 ? newBlocks[newBlocks.length - 1].id : null);
            }
            return newBlocks;
        });
    };

    if (!isOpen) {
        return null;
    }

    const dndOptions = [
        { label: '10 PM - 6 AM', start: '22:00', end: '06:00' },
        { label: '11 PM - 7 AM', start: '23:00', end: '07:00' },
        { label: '12 AM - 8 AM', start: '00:00', end: '08:00' },
    ];
    
    const stepLabels = ['Welcome', 'Schedule', 'DND', 'Review'];

    const renderStep = () => {
        switch (step) {
            case 1: return (
                <div>
                    <h2 className="text-3xl font-bold text-[var(--color-text-primary)]">Welcome! Let's set up your weekly rhythm.</h2>
                    <p className="mt-2 text-[var(--color-text-secondary)]">This helps us place reminders at the right time. We'll ask a few quick questions.</p>
                    <div className="mt-6 flex justify-center gap-4">
                        <button onClick={handleClose} className="px-6 py-3 font-semibold text-[var(--color-text-secondary)] bg-[var(--color-surface-sunken)] hover:bg-[var(--color-border)] rounded-lg">Skip for now</button>
                        <button onClick={() => setStep(2)} className="px-6 py-3 font-semibold text-[var(--color-primary-accent-text)] bg-[var(--color-primary-accent)] rounded-lg">Get Started</button>
                    </div>
                </div>
            );
            case 2:
                const startTimes = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00'];
                const endTimes = ['13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
                const daysOfWeekMap: { short: string; long: ScheduleEvent['day'] }[] = [
                    { short: 'Mon', long: 'Monday' }, { short: 'Tue', long: 'Tuesday' }, { short: 'Wed', long: 'Wednesday' },
                    { short: 'Thu', long: 'Thursday' }, { short: 'Fri', long: 'Friday' }, { short: 'Sat', long: 'Saturday' },
                    { short: 'Sun', long: 'Sunday' },
                ];
                const validBlocks = blocks.filter(b => b.startTime && b.endTime && b.days.length > 0);
                const activeBlock = blocks.find(b => b.id === activeBlockId);

                return (
                    <div>
                        <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">When do you usually work or have school?</h2>
                        <p className="mt-2 text-[var(--color-text-secondary)] max-w-lg mx-auto">Pick your start and end times, and select the days this applies to. You can always edit this later.</p>
                        
                        <div className="mt-4 space-y-2 max-h-60 overflow-y-auto pr-2 text-left">
                            {blocks.filter(b => b.id !== activeBlockId && b.startTime && b.endTime && b.days.length > 0).map(block => (
                                <div key={`summary-${block.id}`} onClick={() => setActiveBlockId(block.id)}
                                    className="p-3 border rounded-lg bg-[var(--color-surface)] cursor-pointer hover:bg-[var(--color-surface-sunken)] flex justify-between items-center animate-fade-in"
                                >
                                    <p className="text-sm text-[var(--color-text-primary)]">
                                        <span className="font-semibold">Work/School:</span> {formatTimeForDisplay(block.startTime)} – {formatTimeForDisplay(block.endTime)} ({formatDays(block.days)})
                                    </p>
                                    <button onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }} className="p-1 text-[var(--color-text-subtle)] hover:text-[var(--color-danger)] rounded-full flex-shrink-0" title="Remove block">
                                       <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                    </button>
                                </div>
                            ))}
                            {activeBlock && (
                                <div key={activeBlock.id} className="p-4 border-2 border-[var(--color-primary-accent)] rounded-lg bg-[var(--color-surface)] relative animate-fade-in">
                                    <div className="mb-3">
                                        <label className="font-semibold text-sm text-[var(--color-text-secondary)] block mb-2">Start Time</label>
                                        <div className="flex flex-wrap gap-2">
                                            {startTimes.map(st => (
                                                <button key={st} onClick={() => updateBlock(activeBlock.id, 'startTime', st)}
                                                    className={`px-3 py-1 text-sm font-semibold rounded-full border-2 transition-colors ${activeBlock.startTime === st ? 'bg-[var(--color-primary-accent)] text-[var(--color-primary-accent-text)] border-[var(--color-primary-accent)]' : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-primary-accent)]'}`}>
                                                    {formatTimeForDisplay(st)}
                                                </button>
                                            ))}
                                            {customTime?.id === activeBlock.id && customTime?.part === 'startTime' ? (
                                                <input type="time" defaultValue={activeBlock.startTime} onBlur={e => { if (e.target.value) updateBlock(activeBlock.id, 'startTime', e.target.value); setCustomTime(null); }} autoFocus className="p-1 border rounded-md text-sm w-28"/>
                                            ) : (
                                                <button onClick={() => setCustomTime({ id: activeBlock.id, part: 'startTime' })}
                                                    className={`px-3 py-1 text-sm font-semibold rounded-full border-2 transition-colors ${activeBlock.startTime && !startTimes.includes(activeBlock.startTime) ? 'bg-[var(--color-primary-accent)] text-[var(--color-primary-accent-text)] border-[var(--color-primary-accent)]' : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-primary-accent)]'}`}>
                                                    {activeBlock.startTime && !startTimes.includes(activeBlock.startTime) ? formatTimeForDisplay(activeBlock.startTime) : 'Custom'}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="font-semibold text-sm text-[var(--color-text-secondary)] block mb-2">End Time</label>
                                        <div className="flex flex-wrap gap-2">
                                            {endTimes.map(et => {
                                                const isDisabled = activeBlock.startTime ? timeToMinutes(et) <= timeToMinutes(activeBlock.startTime) : false;
                                                return (
                                                    <button key={et} disabled={isDisabled} onClick={() => updateBlock(activeBlock.id, 'endTime', et)}
                                                        className={`px-3 py-1 text-sm font-semibold rounded-full border-2 transition-colors ${activeBlock.endTime === et ? 'bg-[var(--color-primary-accent)] text-[var(--color-primary-accent-text)] border-[var(--color-primary-accent)]' : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)]'} ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-[var(--color-primary-accent)]'}`}>
                                                        {formatTimeForDisplay(et)}
                                                    </button>
                                                );
                                            })}
                                            {customTime?.id === activeBlock.id && customTime?.part === 'endTime' ? (
                                                <input type="time" defaultValue={activeBlock.endTime} onBlur={e => { if (e.target.value) updateBlock(activeBlock.id, 'endTime', e.target.value); setCustomTime(null); }} autoFocus className="p-1 border rounded-md text-sm w-28"/>
                                            ) : (
                                                <button onClick={() => setCustomTime({ id: activeBlock.id, part: 'endTime' })}
                                                    className={`px-3 py-1 text-sm font-semibold rounded-full border-2 transition-colors ${activeBlock.endTime && !endTimes.includes(activeBlock.endTime) ? 'bg-[var(--color-primary-accent)] text-[var(--color-primary-accent-text)] border-[var(--color-primary-accent)]' : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-primary-accent)]'}`}>
                                                    {activeBlock.endTime && !endTimes.includes(activeBlock.endTime) ? formatTimeForDisplay(activeBlock.endTime) : 'Custom'}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="font-semibold text-sm text-[var(--color-text-secondary)] block mb-2">On these days</label>
                                        <div className="flex flex-wrap gap-2">
                                            {daysOfWeekMap.map(day => (
                                                <button key={day.long} onClick={() => toggleDay(activeBlock.id, day.long)}
                                                    className={`w-12 py-1 text-sm font-semibold rounded-full border-2 transition-colors ${activeBlock.days.includes(day.long) ? 'bg-[var(--color-primary-accent)] text-[var(--color-primary-accent-text)] border-[var(--color-primary-accent)]' : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-primary-accent)]'}`}>
                                                    {day.short}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <button onClick={addBlock} className="mt-4 w-full text-sm font-semibold text-[var(--color-primary-accent)] hover:bg-[var(--color-surface-sunken)] p-2 rounded-lg border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-primary-accent)] transition-colors">
                            + Add Another Block
                        </button>
                        
                        <div className="mt-6 flex justify-center gap-4">
                            <button onClick={() => setStep(1)} className="px-6 py-3 font-semibold text-[var(--color-text-secondary)] bg-[var(--color-surface-sunken)] hover:bg-[var(--color-border)] rounded-lg">Back</button>
                            <button onClick={() => setStep(3)} disabled={validBlocks.length === 0} className="px-6 py-3 font-semibold text-[var(--color-primary-accent-text)] bg-[var(--color-primary-accent)] rounded-lg disabled:bg-stone-400">Looks good →</button>
                        </div>
                    </div>
                );
            case 3: return (
                 <div>
                    <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">When is your "Do Not Disturb" time?</h2>
                     <p className="mt-2 text-[var(--color-text-secondary)]">We'll avoid sending reminders during this window (e.g., when you're sleeping).</p>
                    <div className="mt-4 flex flex-wrap gap-3 justify-center">
                        {dndOptions.map(opt => (
                            <button
                                key={opt.label}
                                onClick={() => {
                                    setDndSettings({ sleepStart: opt.start, sleepEnd: opt.end });
                                    setIsCustomDnd(false);
                                }}
                                className={`px-4 py-2 font-semibold rounded-lg border-2 transition-colors ${
                                    dndSettings.sleepStart === opt.start && dndSettings.sleepEnd === opt.end && !isCustomDnd
                                    ? 'bg-[var(--color-primary-accent)] text-[var(--color-primary-accent-text)] border-[var(--color-primary-accent)]'
                                    : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-primary-accent)]'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                        <button
                            onClick={() => setIsCustomDnd(true)}
                            className={`px-4 py-2 font-semibold rounded-lg border-2 transition-colors ${
                                isCustomDnd
                                ? 'bg-[var(--color-primary-accent)] text-[var(--color-primary-accent-text)] border-[var(--color-primary-accent)]'
                                : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-primary-accent)]'
                            }`}
                        >
                            Custom
                        </button>
                    </div>
                    {isCustomDnd && (
                        <div className="mt-4 flex gap-4 items-center justify-center animate-fade-in">
                            <label>From:</label>
                            <input type="time" value={dndSettings.sleepStart} onChange={e => setDndSettings(p => ({...p, sleepStart: e.target.value}))} className="p-2 border rounded-md" />
                            <span>to</span>
                            <input type="time" value={dndSettings.sleepEnd} onChange={e => setDndSettings(p => ({...p, sleepEnd: e.target.value}))} className="p-2 border rounded-md" />
                        </div>
                    )}
                    <div className="mt-6 flex justify-center gap-4">
                        <button onClick={() => setStep(2)} className="px-6 py-3 font-semibold text-[var(--color-text-secondary)] bg-[var(--color-surface-sunken)] hover:bg-[var(--color-border)] rounded-lg">Back</button>
                        <button onClick={generateAndPreview} className="px-6 py-3 font-semibold text-[var(--color-primary-accent-text)] bg-[var(--color-primary-accent)] rounded-lg">Preview My Map</button>
                    </div>
                </div>
            );
            case 4: return (
                 <div>
                    <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Here's your suggested weekly map.</h2>
                     <p className="mt-2 text-[var(--color-text-secondary)]">This is a starting point based on common routines. You can edit this now, or change it any time from the calendar.</p>
                     <div className="mt-4 bg-[var(--color-surface-sunken)] p-4 rounded-lg border max-h-60 overflow-y-auto text-left space-y-3">
                         <div>
                            <h3 className="font-bold text-[var(--color-text-primary)]">Core Anchors:</h3>
                            {generatedPreview?.newAnchors.map(a => (
                                <p key={a.id} className="text-sm text-[var(--color-text-secondary)] pl-2">&bull; {a.day}: {a.title} ({formatTimeForDisplay(a.startTime)} - {formatTimeForDisplay(a.endTime)})</p>
                            ))}
                         </div>
                         <div>
                             <h3 className="font-bold text-[var(--color-text-primary)]">Do-Not-Disturb Window:</h3>
                             <p className="text-sm text-[var(--color-text-secondary)] pl-2">&bull; Daily from {formatTimeForDisplay(generatedPreview?.newDnd[0].startTime || '')} to {formatTimeForDisplay(generatedPreview?.newDnd[0].endTime || '')}</p>
                         </div>
                     </div>
                    <div className="mt-6 flex justify-center gap-4">
                        <button onClick={() => setStep(2)} className="px-6 py-3 font-semibold text-[var(--color-text-secondary)] bg-[var(--color-surface-sunken)] rounded-lg hover:bg-[var(--color-border)]">Edit Details</button>
                        <button onClick={handleConfirm} className="px-6 py-3 font-semibold text-[var(--color-primary-accent-text)] bg-[var(--color-primary-accent)] rounded-lg hover:bg-[var(--color-primary-accent-hover)]">Looks Good, Let's Go!</button>
                    </div>
                </div>
            );
            default: return null;
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
            <div className="bg-[var(--color-surface)] rounded-2xl shadow-2xl p-8 w-full max-w-2xl text-center transform transition-all">
                <ProgressIndicator currentStep={step} totalSteps={4} stepLabels={stepLabels} />
                {renderStep()}
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
const CalendarPage: React.FC<CalendarPageProps> = (props) => {
    const { 
        scheduleEvents, setScheduleEvents, 
        smartReminders, setSmartReminders, 
        dndWindows, setDndWindows,
        pauseUntil, setPauseUntil,
        onboardingPreview, setOnboardingPreview,
        onSuccess, onUndo
    } = props;
    
    const [viewMode, setViewMode] = useState<'week' | 'list'>('week');
    const [isAnchorModalOpen, setIsAnchorModalOpen] = useState(false);
    const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
    const [selectedDay, setSelectedDay] = useState<ScheduleEvent['day'] | 'All'>('All');
    const [draggedEventId, setDraggedEventId] = useState<string | null>(null);

    const [changeHistory, setChangeHistory] = useState<ChangeHistoryItem[]>([]);
    
    useEffect(() => {
        if (scheduleEvents.length === 0 && dndWindows.length === 0 && !onboardingPreview) {
            setIsOnboardingOpen(true);
        }
    }, [scheduleEvents, dndWindows, onboardingPreview]);
    
    const addChangeToHistory = (message: string, undoCallback: () => void) => {
        const newChange: ChangeHistoryItem = {
            id: Date.now(),
            message,
            undo: undoCallback,
        };
        setChangeHistory(prev => [newChange, ...prev.slice(0, 9)]);
        onSuccess(message);
        
        onUndo({
            message,
            onUndo: () => {
                undoCallback();
                setChangeHistory(prev => prev.filter(c => c.id !== newChange.id));
            }
        });
    };
    
    const isPaused = useMemo(() => {
        if (!pauseUntil) return false;
        return new Date() < new Date(pauseUntil);
    }, [pauseUntil]);

    const activeReminders = useMemo(() => {
        if (isPaused) return [];
        const now = new Date();
        const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
        const currentDay = DAYS_OF_WEEK[now.getDay() === 0 ? 6 : now.getDay() - 1];

        const anchorMap = new Map(scheduleEvents.map(e => [e.id, e]));

        return smartReminders.filter(reminder => {
            const anchor = anchorMap.get(reminder.eventId);
            if (!anchor || anchor.day !== currentDay) return false;

            const anchorStartTime = timeToMinutes(anchor.startTime);
            const reminderTime = anchorStartTime + reminder.offsetMinutes;
            
            // Check DND
            const isInDnd = dndWindows.some(dnd => {
                if (dnd.day !== currentDay) return false;
                const dndStart = timeToMinutes(dnd.startTime);
                const dndEnd = timeToMinutes(dnd.endTime);
                if (dndEnd < dndStart) { // overnight
                    return reminderTime >= dndStart || reminderTime < dndEnd;
                }
                return reminderTime >= dndStart && reminderTime < dndEnd;
            });
            if (isInDnd) return false;
            
            const snoozedUntilTime = reminder.snoozedUntil ? new Date(reminder.snoozedUntil).getTime() : 0;
            if (now.getTime() < snoozedUntilTime) return false;

            if (reminder.status === ReminderStatus.Done) return false;

            // Show reminders that are due now or within the next 15 minutes, and haven't been shown too recently
            const isDue = reminderTime <= currentTimeInMinutes && reminderTime > (currentTimeInMinutes - 15);
            
            // If the reminder was just snoozed, it won't be due, but we want to keep it visible for a moment
            const justInteracted = reminder.lastInteraction && (now.getTime() - new Date(reminder.lastInteraction).getTime() < 60000)

            return (isDue && reminder.status === ReminderStatus.Active) || justInteracted;
        });
    }, [isPaused, smartReminders, scheduleEvents, dndWindows]);
    
    const handleAddAnchor = (data: { title: string; startTime: string; endTime: string; days: ScheduleEvent['day'][] }) => {
        const originalEvents = [...scheduleEvents];
        const newEvents: ScheduleEvent[] = data.days.map(day => ({
            id: `anchor-${Date.now()}-${day}`,
            day,
            title: data.title,
            startTime: data.startTime,
            endTime: data.endTime,
            contextTags: [ContextTag.Personal] 
        }));
        setScheduleEvents(prev => [...prev, ...newEvents]);
        setIsAnchorModalOpen(false);
        const dayStr = formatDaysForToast(data.days);
        const timeStr = `${formatTimeForToast(data.startTime)}–${formatTimeForToast(data.endTime)}`;
        addChangeToHistory(`Anchor added: "${data.title}" on ${dayStr}, ${timeStr}.`, () => setScheduleEvents(originalEvents));
    };

    const handleAddReminder = async (text: string) => {
        const result = await parseNaturalLanguageReminder(text, scheduleEvents);
        
        // FIX: Use if/else block to ensure correct type narrowing for the `Result` type.
        if (result.ok === true) {
            const { anchorTitle, offsetMinutes, message, why } = result.data;
            const targetAnchors = scheduleEvents.filter(e => e.title === anchorTitle);
            if (targetAnchors.length === 0) {
                throw new Error(`Couldn't find an anchor named "${anchorTitle}".`);
            }
            
            const originalReminders = [...smartReminders];
            const newReminders: SmartReminder[] = targetAnchors.map(anchor => ({
                id: `sr-${anchor.id}-${Date.now()}`,
                eventId: anchor.id,
                offsetMinutes,
                message,
                why,
                isLocked: false,
                isExploratory: false,
                status: ReminderStatus.Active,
                snoozeHistory: [],
                snoozedUntil: null,
                successHistory: [],
                allowExploration: true,
            }));
            setSmartReminders(prev => [...prev, ...newReminders]);
            setIsReminderModalOpen(false);
            
            const offsetStr = formatOffsetForToast(offsetMinutes);
            addChangeToHistory(`Reminder set: "${message}" ${offsetStr} "${anchorTitle}".`, () => setSmartReminders(originalReminders));
        } else {
            throw new Error(result.error);
        }
    };

    const handleOnboardingComplete = (data: OnboardingPreviewData) => {
        setScheduleEvents(prev => [...prev, ...data.newAnchors]);
        setDndWindows(prev => [...prev, ...data.newDnd]);
        setIsOnboardingOpen(false);
        onSuccess("Your weekly map is set up!");
    };

    const handleDuplicateAnchor = (anchor: ScheduleEvent) => {
        const newAnchor: ScheduleEvent = {
            ...anchor,
            id: `anchor-copy-${Date.now()}`,
            title: `${anchor.title} (Copy)`
        };
        const originalEvents = [...scheduleEvents];
        setScheduleEvents(prev => [...prev, newAnchor]);
        addChangeToHistory(`Copied anchor "${anchor.title}".`, () => setScheduleEvents(originalEvents));
    };

    const handleDeleteAnchor = (anchorId: string) => {
        const originalEvents = [...scheduleEvents];
        const originalReminders = [...smartReminders];
        const anchorToDelete = scheduleEvents.find(a => a.id === anchorId);

        setScheduleEvents(prev => prev.filter(e => e.id !== anchorId));
        setSmartReminders(prev => prev.filter(r => r.eventId !== anchorId));
        
        addChangeToHistory(`Deleted anchor "${anchorToDelete?.title}".`, () => {
            setScheduleEvents(originalEvents);
            setSmartReminders(originalReminders);
        });
    };
    
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, eventId: string) => {
        setDraggedEventId(eventId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetDay: ScheduleEvent['day']) => {
        e.preventDefault();
        if (!draggedEventId) return;

        const originalEvents = [...scheduleEvents];
        const eventToMove = scheduleEvents.find(event => event.id === draggedEventId);
        
        if (eventToMove && eventToMove.day !== targetDay) {
            
            const conflictingEvent = scheduleEvents.find(event =>
                event.day === targetDay &&
                event.id !== draggedEventId &&
                doTimesOverlap(eventToMove.startTime, eventToMove.endTime, event.startTime, event.endTime)
            );
            
            if(conflictingEvent) {
                alert(`Cannot move "${eventToMove.title}". It conflicts with "${conflictingEvent.title}" on ${targetDay}.`);
                return;
            }

            setScheduleEvents(prev => prev.map(event =>
                event.id === draggedEventId ? { ...event, day: targetDay } : event
            ));
            addChangeToHistory(`Moved "${eventToMove.title}" to ${targetDay}.`, () => setScheduleEvents(originalEvents));
        }

        setDraggedEventId(null);
    };

    const renderWeekView = () => (
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {DAYS_OF_WEEK.map(day => (
          <div
            key={day}
            className="bg-[var(--color-surface)] rounded-lg p-3 space-y-3 border border-transparent transition-colors"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, day)}
          >
            <h3 className="font-bold text-center text-[var(--color-text-primary)]">{day}</h3>
            <div className="space-y-2 min-h-[100px]">
              {scheduleEvents.filter(e => e.day === day).sort((a,b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)).map(event => {
                const isDragging = draggedEventId === event.id;
                return (
                  <div
                    key={event.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, event.id)}
                    className={`calendar-anchor p-2 rounded-lg text-xs cursor-grab transition-all ${getAnchorColor(event.title)} ${isDragging ? 'opacity-50 scale-105 shadow-2xl' : 'shadow-sm'}`}
                  >
                    <p className="font-bold">{event.title}</p>
                    <p>{formatTimeForToast(event.startTime)} - {formatTimeForToast(event.endTime)}</p>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    );
    
    const renderListView = () => {
        const filteredEvents = selectedDay === 'All' ? scheduleEvents : scheduleEvents.filter(e => e.day === selectedDay);
        const filteredReminders = smartReminders.filter(r => {
            const anchor = scheduleEvents.find(e => e.id === r.eventId);
            return anchor && (selectedDay === 'All' || anchor.day === selectedDay);
        });

        // Fix: Explicitly define types for the combined list to help TypeScript with type narrowing.
        type AnchorItem = ScheduleEvent & { type: 'anchor' };
        type ReminderItem = SmartReminder & { type: 'reminder', anchorTime?: string, anchorDay?: ScheduleEvent['day'] };
        type CalendarItem = AnchorItem | ReminderItem;

        const allItems: CalendarItem[] = [
            ...filteredEvents.map((e): AnchorItem => ({ ...e, type: 'anchor' })),
            ...filteredReminders.map((r): ReminderItem => {
                const anchor = scheduleEvents.find(e => e.id === r.eventId);
                return { ...r, type: 'reminder', anchorTime: anchor?.startTime, anchorDay: anchor?.day };
            })
        ].sort((a, b) => {
            const dayA = a.type === 'anchor' ? a.day : a.anchorDay;
            const dayB = b.type === 'anchor' ? b.day : b.anchorDay;
            if (dayA && dayB && dayA !== dayB) return DAYS_OF_WEEK.indexOf(dayA) - DAYS_OF_WEEK.indexOf(dayB);

            const timeA = a.type === 'anchor' ? timeToMinutes(a.startTime) : timeToMinutes(a.anchorTime || '00:00') + a.offsetMinutes;
            const timeB = b.type === 'anchor' ? timeToMinutes(b.startTime) : timeToMinutes(b.anchorTime || '00:00') + b.offsetMinutes;
            return timeA - timeB;
        });
        
        // Group by category for a cleaner look
        const itemsByCategory = allItems.reduce((acc, item) => {
            const anchor = item.type === 'anchor' ? item : scheduleEvents.find(e => item.type === 'reminder' && e.id === item.eventId);
            if (!anchor) return acc;
            const title = anchor.title.toLowerCase();
            let category: string;
            if (title.includes('work') || title.includes('school')) category = 'work';
            else if (title.includes('gym') || title.includes('health') || title.includes('focus')) category = 'wellness';
            else if (title.includes('social') || title.includes('family')) category = 'social';
            else category = 'other';
            
            if (!acc[category]) acc[category] = [];
            acc[category].push(item);
            return acc;
        }, {} as Record<string, CalendarItem[]>);

        return (
            <div className="max-w-4xl mx-auto space-y-4">
                {Object.entries(itemsByCategory).map(([category, items]) => (
                    <div key={category} className={`calendar-category-box calendar-category-${category}`}>
                         <h3 className="font-bold text-lg text-[var(--color-text-primary)] capitalize mb-2">{category}</h3>
                         <div className="space-y-2">
                            {items.map(item => {
                                if (item.type === 'anchor') {
                                    return (
                                        <div key={item.id} className="bg-[var(--color-surface)] p-3 rounded-lg flex justify-between items-center shadow-sm">
                                            <div>
                                                <p className="font-semibold text-[var(--color-text-primary)]">{item.title}</p>
                                                <p className="text-sm text-[var(--color-text-secondary)]">{item.day} at {formatTimeForToast(item.startTime)} - {formatTimeForToast(item.endTime)}</p>
                                            </div>
                                            <DropdownMenu trigger={<button className="p-1.5 rounded-full text-[var(--color-text-subtle)] hover:bg-[var(--color-surface-sunken)]"><MoreOptionsIcon className="h-5 w-5"/></button>}>
                                                <button onClick={() => handleDuplicateAnchor(item)} className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-sunken)] rounded-md"><DuplicateIcon className="h-4 w-4" /> Duplicate</button>
                                                <button onClick={() => handleDeleteAnchor(item.id)} className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm text-[var(--color-danger)] hover:bg-red-100 rounded-md"><TrashIcon className="h-4 w-4" /> Delete</button>
                                            </DropdownMenu>
                                        </div>
                                    );
                                } else { // Reminder
                                    const anchor = scheduleEvents.find(e => e.id === item.eventId);
                                    if (!anchor) return null;
                                    return (
                                        <div key={item.id} className="bg-[var(--color-surface)] p-3 rounded-lg ml-4 border-l-4 border-[var(--color-border-hover)]">
                                            <p className="font-semibold text-[var(--color-text-primary)]">{item.message}</p>
                                            <p className="text-sm text-[var(--color-text-secondary)]">
                                                {formatOffsetForToast(item.offsetMinutes)} "{anchor.title}" on {anchor.day}s
                                            </p>
                                        </div>
                                    );
                                }
                            })}
                         </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderActiveReminder = (reminder: SmartReminder) => {
        const anchor = scheduleEvents.find(e => e.id === reminder.eventId);
        if (!anchor) return null;

        const handleInteraction = (newState: ReminderStatus, successState?: SuccessState) => {
            const originalReminders = [...smartReminders];
            setSmartReminders(prev => prev.map(r => {
                if (r.id !== reminder.id) return r;
                
                const newSuccessHistory = successState ? [...r.successHistory, successState].slice(-10) : r.successHistory;

                if(newState === ReminderStatus.Snoozed) {
                    const nextSnoozeDuration = Math.min(30, (r.snoozeHistory[0] || 5) * 2);
                    const snoozedUntil = new Date(Date.now() + nextSnoozeDuration * 60000).toISOString();
                    return { ...r, status: newState, lastInteraction: new Date().toISOString(), successHistory: newSuccessHistory, snoozedUntil, snoozeHistory: [nextSnoozeDuration, ...r.snoozeHistory] };
                }
                
                return { ...r, status: newState, lastInteraction: new Date().toISOString(), successHistory: newSuccessHistory, snoozedUntil: null };
            }));
            
            if (successState === 'success') {
                const habit = getHabitSuggestion({ completedEnergyTag: EnergyTag.Admin });
                if (habit) {
                    onSuccess(`Great job! Why not try a quick "${habit.name}"?`);
                    recordHabitCompletion(habit.id);
                } else {
                    onSuccess("Reminder completed. Well done!");
                }
            } else if (successState === 'snoozed') {
                onSuccess("Reminder snoozed.");
            }
            
            addChangeToHistory(`Reminder updated.`, () => setSmartReminders(originalReminders));
        };

        return (
            <div key={reminder.id} className="relative bg-[var(--color-surface)] p-4 rounded-xl shadow-lg border border-[var(--color-border-hover)] animate-fade-in max-w-sm w-full">
                <div className="flex items-start gap-3">
                    <BellIcon className="h-6 w-6 text-[var(--color-primary-accent)] mt-1" />
                    <div className="flex-1">
                        <p className="font-bold text-[var(--color-text-primary)]">{reminder.message}</p>
                        <p className="text-sm text-[var(--color-text-secondary)]">{reminder.why}</p>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <button onClick={() => {}} title={reminder.isLocked ? "This reminder timing is locked based on consistent success." : "Lock this reminder to prevent automatic adjustments."} className="p-1 text-[var(--color-text-subtle)] hover:text-[var(--color-primary-accent)]">
                            {reminder.isLocked ? <LockIcon className="h-4 w-4" /> : <LockOpenIcon className="h-4 w-4" />}
                        </button>
                         <button title="This is an experimental reminder time. Your feedback helps the system learn what works best for you!" className="p-1 text-[var(--color-text-subtle)] hover:text-[var(--color-primary-accent)]">
                            {reminder.isExploratory && <WandIcon className="h-4 w-4 text-blue-500" />}
                        </button>
                    </div>
                </div>
                <div className="mt-3 flex gap-2 justify-end">
                    <button onClick={() => handleInteraction(ReminderStatus.Snoozed, 'snoozed')} className="px-3 py-1.5 text-sm font-semibold text-[var(--color-text-secondary)] bg-[var(--color-surface-sunken)] hover:bg-[var(--color-border)] rounded-md">Snooze</button>
                    <button onClick={() => handleInteraction(ReminderStatus.Done, 'success')} className="px-3 py-1.5 text-sm font-semibold text-[var(--color-primary-accent-text)] bg-[var(--color-primary-accent)] hover:bg-[var(--color-primary-accent-hover)] rounded-md">Done</button>
                </div>
            </div>
        )
    };

    return (
        <main className="container mx-auto p-8">
            <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
                <div>
                    <div className="section-header-wrapper">
                        <h1 className="text-3xl font-bold">Calendar & Reminders</h1>
                    </div>
                    <p className="text-[var(--color-text-secondary)] mt-2 max-w-2xl">Manage your weekly anchors and the smart reminders attached to them.</p>
                </div>
                <div className="flex items-center space-x-2">
                    <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="p-2 rounded-lg bg-[var(--color-surface-sunken)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"><GearIcon className="h-5 w-5"/></button>
                    <button onClick={() => setIsReminderModalOpen(true)} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-[var(--color-text-secondary)] bg-[var(--color-surface-sunken)] hover:bg-[var(--color-border)] rounded-lg"><BellIcon className="h-5 w-5" /> Add Reminder</button>
                    <button onClick={() => setIsAnchorModalOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[var(--color-primary-accent-text)] bg-[var(--color-primary-accent)] hover:bg-[var(--color-primary-accent-hover)] rounded-lg shadow-sm"><PlusIcon className="h-5 w-5" /> Add Anchor</button>
                </div>
            </div>

            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-2 p-1 bg-[var(--color-surface-sunken)] rounded-lg">
                    <button onClick={() => setViewMode('week')} className={`px-3 py-1.5 text-sm font-bold rounded-md transition-colors ${viewMode === 'week' ? 'bg-[var(--color-surface)] shadow-sm text-[var(--color-primary-accent)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'}`}>Week</button>
                    <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 text-sm font-bold rounded-md transition-colors ${viewMode === 'list' ? 'bg-[var(--color-surface)] shadow-sm text-[var(--color-primary-accent)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'}`}>List</button>
                </div>
                {viewMode === 'list' && (
                    <div className="flex items-center gap-2">
                        {['All', ...DAYS_OF_WEEK].map(day => (
                            <button key={day} onClick={() => setSelectedDay(day as any)} className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${selectedDay === day ? 'bg-[var(--color-primary-accent)] text-white' : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)]'}`}>
                                {day}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            
            {viewMode === 'week' ? renderWeekView() : renderListView()}

             <div className="fixed bottom-6 right-6 z-50 space-y-3">
                {activeReminders.map(renderActiveReminder)}
             </div>
             
             {isPaused && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[var(--color-surface)] p-3 rounded-full shadow-lg flex items-center gap-3 border border-[var(--color-border)]">
                    <PauseIcon className="h-5 w-5 text-[var(--color-warning)]"/>
                    <p className="text-sm font-semibold text-[var(--color-text-secondary)]">Reminders are paused</p>
                    <button onClick={() => setPauseUntil(null)} className="text-sm font-bold text-[var(--color-primary-accent)] hover:underline">Resume</button>
                </div>
             )}
            
            <AddAnchorModal isOpen={isAnchorModalOpen} onClose={() => setIsAnchorModalOpen(false)} onSave={handleAddAnchor} />
            <AddReminderModal isOpen={isReminderModalOpen} onClose={() => setIsReminderModalOpen(false)} onSubmit={handleAddReminder} />

            <OnboardingFlow 
                isOpen={isOnboardingOpen} 
                onClose={() => setIsOnboardingOpen(false)}
                onComplete={handleOnboardingComplete}
                onboardingPreview={onboardingPreview}
                setOnboardingPreview={setOnboardingPreview}
            />

            <AiChat 
                scheduleEvents={scheduleEvents} setScheduleEvents={setScheduleEvents}
                smartReminders={smartReminders} setSmartReminders={setSmartReminders}
                pauseUntil={pauseUntil} setPauseUntil={setPauseUntil}
                addChangeToHistory={addChangeToHistory}
            />
        </main>
    );
};

export default CalendarPage;