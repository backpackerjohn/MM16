
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
                        <h2 className="text-2xl font-bold