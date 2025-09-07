

import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import BrainDump from './components/BrainDump';
import BrainDumpModal from './components/BrainDumpModal';
import MomentumMap from './components/MomentumMap';
import TaskPage from './components/TaskPage';
import CalendarPage from './components/CalendarPage';
import { BrainDumpItem, Note, SavedTask, MomentumMapData, EnergyTag } from './contracts';
import { ScheduleEvent, SmartReminder, ContextTag, ReminderStatus, DNDWindow, TimeLearningSettings, CompletionRecord, ThemeSettings, ThemeName, CustomThemeProperties, Confirmation, UndoAction, Cluster, Result } from './types';
import { getCompletionHistory, addRecordToHistory } from './utils/timeAnalytics';
import TimeLearningSettingsPage from './components/TimeLearningSettings';
import { themes, themePresets } from './utils/styles';
import { determineOptimalTheme } from './utils/themeEngine';
import ThemeSettingsModal from './components/ThemeSettingsModal';
import ThemeSuggestionToast from './components/ThemeSuggestionToast';
import SuccessToast from './components/SuccessToast';
import ConfirmationModal from './components/ConfirmationModal';
import UndoToast from './components/UndoToast';
import { auth } from './utils/firebase';
// Use modular imports for firebase/auth to resolve member export errors.
import { onAuthStateChanged, User } from 'firebase/auth';
import { hasLocalData, migrateLocalToFirestore } from './utils/migration';
import { saveDocument, loadAllData } from './utils/dataService';
import MigrationModal from './components/MigrationModal';
import MobileTabBar from './components/MobileTabBar';
import StatsPage from './components/StatsPage';
import { processBrainDumpText } from './services/geminiService';
import { DataProvider } from './src/context/DataContext';


const mockBrainDumpItems: BrainDumpItem[] = [
  {
    id: 'bd-mock-1',
    item: 'Draft Q3 marketing strategy document',
    tags: ['Work', 'Marketing', 'Q3 Planning', 'Urgent'],
    isUrgent: true,
    timeEstimateMinutesP50: 90,
    timeEstimateMinutesP90: 120,
    blockers: ['Awaiting final budget numbers'],
  },
  {
    id: 'bd-mock-2',
    item: 'Book dentist appointment for next month',
    tags: ['Personal', 'Health'],
    isUrgent: false,
    timeEstimateMinutesP50: 5,
    timeEstimateMinutesP90: 10,
    blockers: [],
  },
];

const mockSavedTasks: SavedTask[] = [
  {
    id: 'map-mock-1',
    nickname: 'Launch New Feature',
    note: 'Paused this to work on a critical bug fix. Ready to resume with user testing chunk.',
    savedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    mapData: {
      version: 1,
      finishLine: {
        statement: 'Successfully launch the new "AI Insights" feature to all users',
        acceptanceCriteria: [
          'Feature is live and accessible to 100% of the user base.',
          'No critical bugs reported within the first 72 hours.',
          'Positive feedback received from at least 10 users.',
        ],
      },
      chunks: [
        {
          id: 'chunk-mock-1-1', title: 'Finalize UI/UX Design',
          subSteps: [
            { id: 'ss-mock-1-1-1', description: 'Incorporate feedback from stakeholder review', isComplete: true },
            { id: 'ss-mock-1-1-2', description: 'Create final high-fidelity mockups in Figma', isComplete: true },
            { id: 'ss-mock-1-1-3', description: 'Prepare design assets for development handoff', isComplete: true },
          ],
          p50: 60, p90: 90, energyTag: EnergyTag.Creative, blockers: [], isComplete: true,
        },
        {
          id: 'chunk-mock-1-2', title: 'Frontend Development',
          subSteps: [
            { id: 'ss-mock-1-2-1', description: 'Set up component structure', isComplete: true },
            { id: 'ss-mock-1-2-2', description: 'Implement UI based on Figma designs', isComplete: true },
            { id: 'ss-mock-1-2-3', description: 'Integrate with backend API endpoints', isComplete: false },
            { id: 'ss-mock-1-2-4', description: 'Write unit tests for key components', isComplete: false },
          ],
          p50: 120, p90: 180, energyTag: EnergyTag.Tedious, blockers: ['Waiting on final API schema'], isComplete: false,
        },
      ],
    },
    progress: { completedChunks: 1, totalChunks: 2, completedSubSteps: 5, totalSubSteps: 7 },
  },
];

const mockScheduleEvents: ScheduleEvent[] = [
  { id: 'se-1', day: 'Monday', title: 'Morning Commute', startTime: '08:00', endTime: '08:45', contextTags: [ContextTag.Travel, ContextTag.Rushed, ContextTag.LowEnergy] },
  { id: 'se-2', day: 'Monday', title: 'Team Standup', startTime: '09:00', endTime: '09:30', contextTags: [ContextTag.Work, ContextTag.HighEnergy] },
  { id: 'se-3', day: 'Monday', title: 'Deep Work: Project Apollo', startTime: '09:30', endTime: '12:00', contextTags: [ContextTag.Work, ContextTag.HighEnergy], bufferMinutes: { prep: 5, recovery: 15 } },
  { id: 'se-4', day: 'Wednesday', title: 'Gym Session', startTime: '18:00', endTime: '19:00', contextTags: [ContextTag.Personal, ContextTag.HighEnergy], bufferMinutes: { prep: 15, recovery: 20 } },
  { id: 'se-5', day: 'Friday', title: 'Coffee & Chill', startTime: '08:15', endTime: '08:45', contextTags: [ContextTag.Personal, ContextTag.Relaxed, ContextTag.LowEnergy] }
];

const mockSmartReminders: SmartReminder[] = [
    { id: 'sr-1', eventId: 'se-2', offsetMinutes: -10, message: 'Review yesterday\'s notes for standup.', why: 'So you feel prepared and on top of your tasks.', isLocked: false, isExploratory: false, status: ReminderStatus.Active, snoozeHistory: [], snoozedUntil: null, successHistory: ['success', 'success', 'snoozed'], lastInteraction: new Date(Date.now() - 86400000).toISOString(), allowExploration: true },
    { id: 'sr-2', eventId: 'se-3', offsetMinutes: -5, message: 'Silence phone and open project docs.', why: 'To minimize distractions for your deep work block.', isLocked: true, isExploratory: false, status: ReminderStatus.Active, snoozeHistory: [], snoozedUntil: null, successHistory: ['success', 'success', 'success'], lastInteraction: new Date(Date.now() - 86400000).toISOString(), allowExploration: false },
    { id: 'sr-3', eventId: 'se-4', offsetMinutes: -30, message: 'Pack gym bag and fill water bottle.', why: 'This reduces friction to get your workout started.', isLocked: false, isExploratory: false, status: ReminderStatus.Active, snoozeHistory: [10, 10, 10], snoozedUntil: null, successHistory: ['snoozed', 'snoozed', 'snoozed', 'success'], lastInteraction: new Date().toISOString(), allowExploration: true },
    { id: 'sr-4', eventId: 'se-4', offsetMinutes: -15, originalOffsetMinutes: -20, message: 'Eat a pre-workout snack.', why: 'Experimenting with energy levels before your gym session.', isLocked: false, isExploratory: true, status: ReminderStatus.Active, snoozeHistory: [], snoozedUntil: null, successHistory: ['ignored', 'ignored'], lastInteraction: new Date().toISOString(), allowExploration: true },
    { id: 'sr-5-stack', eventId: 'se-5', offsetMinutes: 30, message: '5-min stretching.', why: 'Stacking a healthy habit onto your existing coffee routine.', isLocked: false, isExploratory: false, status: ReminderStatus.Active, snoozeHistory: [], snoozedUntil: null, successHistory: [], isStackedHabit: true, lastInteraction: new Date(Date.now() - 86400000).toISOString(), allowExploration: true }
];

const useTheme = (activeMap: MomentumMapData | null, scheduleEvents: ScheduleEvent[], dndWindows: DNDWindow[]) => {
    const [themeSettings, setThemeSettings] = useState<ThemeSettings>(() => {
        const defaultSettings: ThemeSettings = { 
            mode: 'auto', 
            manualTheme: 'Creative',
            customThemeProperties: themePresets.Default,
            userOverrides: {},
        };
        try {
            const storedString = localStorage.getItem('themeSettings');
            if (!storedString) return defaultSettings;
            
            const storedSettings = JSON.parse(storedString);
            
            if (storedSettings.customThemeProperties && 'contrastLevel' in storedSettings.customThemeProperties) {
                storedSettings.customThemeProperties.uiContrastLevel = storedSettings.customThemeProperties.contrastLevel;
                storedSettings.customThemeProperties.textContrastLevel = storedSettings.customThemeProperties.contrastLevel;
                delete storedSettings.customThemeProperties.contrastLevel;
            }
            
            return {
                ...defaultSettings,
                ...storedSettings,
                customThemeProperties: {
                    ...defaultSettings.customThemeProperties,
                    ...(storedSettings.customThemeProperties || {}),
                }
            };
        } catch {
             return defaultSettings;
        }
    });

    const [activeThemeName, setActiveThemeName] = useState<ThemeName>('Creative');
    const [themeSuggestion, setThemeSuggestion] = useState<ThemeName | null>(null);
    const [previewTheme, setPreviewTheme] = useState<ThemeName | null>(null);

    useEffect(() => {
        const activeChunk = activeMap?.chunks.find(c => c.startedAt && !c.completedAt) || null;
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const currentDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()] as ScheduleEvent['day'];
        
        const currentEvents = scheduleEvents.filter(e => {
            return e.day === currentDay && e.startTime <= currentTime && e.endTime >= currentTime;
        });
        
        const optimalTheme = determineOptimalTheme({
            activeChunk,
            currentEvents,
            scheduleEvents,
            currentTime: now,
            dndWindows
        });

        const currentTheme = themeSettings.mode === 'auto' ? activeThemeName : themeSettings.manualTheme;
        
        if (themeSettings.mode === 'auto' && optimalTheme !== currentTheme && optimalTheme !== themeSuggestion) {
            const lastOverrideTime = themeSettings.userOverrides.lastOverride;
            if (lastOverrideTime && (Date.now() - lastOverrideTime) < 5 * 60 * 1000) { // 5 min cooldown
              return;
            }
            setThemeSuggestion(optimalTheme);
        } else if (themeSettings.mode === 'manual' && themeSuggestion) {
            setThemeSuggestion(null);
        }

        if (themeSettings.mode === 'manual') {
          setActiveThemeName(themeSettings.manualTheme);
        }

    }, [activeMap, scheduleEvents, dndWindows, themeSettings.mode, activeThemeName, themeSuggestion, themeSettings.manualTheme, themeSettings.userOverrides.lastOverride]);

    useEffect(() => {
        const root = document.documentElement;
        
        const activeEffectiveTheme = themeSettings.mode === 'manual' ? themeSettings.manualTheme : activeThemeName;
        const themeToApplyName = previewTheme || activeEffectiveTheme;

        const themeProperties = themes[themeToApplyName];
        Object.entries(themeProperties).forEach(([key, value]) => {
            root.style.setProperty(key, value);
        });

        const custom = themeSettings.customThemeProperties;
        root.style.setProperty('--animation-speed-modifier', String(custom.animationSpeed));
        root.style.setProperty('--color-intensity-modifier', String(custom.colorIntensity));
        root.style.setProperty('--ui-contrast-modifier', String(custom.uiContrastLevel));
        root.style.setProperty('--text-contrast-modifier', String(custom.textContrastLevel));

    }, [activeThemeName, themeSettings, previewTheme]);

    const acceptThemeSuggestion = () => {
        if (themeSuggestion) {
            setActiveThemeName(themeSuggestion);
            setThemeSuggestion(null);
            setPreviewTheme(null);
        }
    };
    
    const dismissThemeSuggestion = () => {
        setThemeSuggestion(null);
        setPreviewTheme(null);
    };

    const startThemePreview = (theme: ThemeName) => {
        setPreviewTheme(theme);
    };

    const clearThemePreview = () => {
        setPreviewTheme(null);
    };

    const displayThemeName = themeSettings.mode === 'auto' 
      ? `Auto: ${activeThemeName}` 
      : activeThemeName;

    return { themeSettings, setThemeSettings, activeTheme: displayThemeName, themeSuggestion, acceptThemeSuggestion, dismissThemeSuggestion, setActiveThemeName, startThemePreview, clearThemePreview };
};


const Dashboard: React.FC = () => {
  return (
    <main className="container mx-auto p-8">
      <div className="text-center mt-10">
        <h1 className="text-5xl font-extrabold text-[var(--color-text-primary)] mb-6 tracking-tight gradient-text">
          Welcome to Momentum AI
        </h1>
        <p className="text-xl text-[var(--color-text-secondary)] max-w-2xl mx-auto mb-6">
          Your journey to peak productivity starts here. This dashboard will help you visualize progress and organize your ideas effortlessly.
        </p>
        <div className="mt-12 p-10 bg-[var(--color-surface)] rounded-2xl shadow-lg border border-[var(--color-border)]">
           <p className="text-[var(--color-text-secondary)] text-lg">Application content will be built here in subsequent steps.</p>
        </div>
      </div>
    </main>
  );
};

type OnboardingPreviewData = { newAnchors: ScheduleEvent[]; newDnd: DNDWindow[] };

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('Momentum Map');
  const [isBrainDumpModalOpen, setIsBrainDumpModalOpen] = useState(false);
  const [isThemeSettingsModalOpen, setIsThemeSettingsModalOpen] = useState(false);
  
  const [savedTasks, setSavedTasks] = useState<SavedTask[]>(() => { 
    try { 
        const t = localStorage.getItem('savedMomentumMaps'); 
        const tasks = t ? JSON.parse(t) : mockSavedTasks;
        // Upgrade data on read for backward compatibility
        return tasks.map((task: SavedTask) => {
            if (task.mapData && !task.mapData.version) {
                return { ...task, mapData: { ...task.mapData, version: 1 } };
            }
            return task;
        });
    } catch { return mockSavedTasks; }
  });
  const [activeMapData, setActiveMapData] = useState<MomentumMapData | null>(() => { 
    try { 
        const m = localStorage.getItem('activeMapData'); 
        const data = m ? JSON.parse(m) : null;
        // Upgrade data on read for backward compatibility
        if (data && !data.version) {
            data.version = 1;
        }
        return data;
    } catch { return null; } 
  });
  
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>(() => { try { const s = localStorage.getItem('scheduleEvents'); return s ? JSON.parse(s) : mockScheduleEvents; } catch { return mockScheduleEvents; } });
  const [smartReminders, setSmartReminders] = useState<SmartReminder[]>(() => { try { const r = localStorage.getItem('smartReminders'); return r ? JSON.parse(r) : mockSmartReminders; } catch { return mockSmartReminders; } });
  const [dndWindows, setDndWindows] = useState<DNDWindow[]>(() => { try { const d = localStorage.getItem('dndWindows'); return d ? JSON.parse(d) : []; } catch { return []; } });
  const [pauseUntil, setPauseUntil] = useState<string | null>(() => { try { const p = localStorage.getItem('pauseUntil'); return p ? p : null; } catch { return null; } });
  const [onboardingPreview, setOnboardingPreview] = useState<OnboardingPreviewData | null>(() => { try { const p = localStorage.getItem('onboardingPreview'); return p ? JSON.parse(p) : null; } catch { return null; } });

  const [completionHistory, setCompletionHistory] = useState<Record<EnergyTag, CompletionRecord[]>>(() => getCompletionHistory());
  const [timeLearningSettings, setTimeLearningSettings] = useState<TimeLearningSettings>(() => {
    try {
        const s = localStorage.getItem('timeLearningSettings');
        return s ? JSON.parse(s) : { isEnabled: true, sensitivity: 0.3, density: 'comfortable' };
    } catch {
        return { isEnabled: true, sensitivity: 0.3, density: 'comfortable' };
    }
  });
  
  const { themeSettings, setThemeSettings, activeTheme, themeSuggestion, acceptThemeSuggestion, dismissThemeSuggestion, setActiveThemeName, startThemePreview, clearThemePreview } = useTheme(activeMapData, scheduleEvents, dndWindows);

  const [error, setError] = useState<string|null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null);
  const undoTimeoutRef = useRef<number | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'migrating' | 'success' | 'error'>('idle');
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  useEffect(() => { 
    if (isDataLoaded) {
      localStorage.setItem('savedMomentumMaps', JSON.stringify(savedTasks)); 
      if(user) saveDocument(user.uid, 'savedMomentumMaps', savedTasks);
    }
  }, [savedTasks, user, isDataLoaded]);

  useEffect(() => { 
    if (isDataLoaded) {
      if (activeMapData) {
        localStorage.setItem('activeMapData', JSON.stringify(activeMapData)); 
      } else {
        localStorage.removeItem('activeMapData');
      }
      if(user) saveDocument(user.uid, 'activeMapData', activeMapData);
    }
  }, [activeMapData, user, isDataLoaded]);
  
  useEffect(() => { 
    if (isDataLoaded) {
      localStorage.setItem('scheduleEvents', JSON.stringify(scheduleEvents)); 
      if(user) saveDocument(user.uid, 'scheduleEvents', scheduleEvents);
    }
  }, [scheduleEvents, user, isDataLoaded]);

  useEffect(() => { 
    if (isDataLoaded) {
      localStorage.setItem('smartReminders', JSON.stringify(smartReminders)); 
      if(user) saveDocument(user.uid, 'smartReminders', smartReminders);
    }
  }, [smartReminders, user, isDataLoaded]);

  useEffect(() => { 
    if (isDataLoaded) {
      localStorage.setItem('dndWindows', JSON.stringify(dndWindows)); 
      if(user) saveDocument(user.uid, 'dndWindows', dndWindows);
    }
  }, [dndWindows, user, isDataLoaded]);

  useEffect(() => { 
    if (isDataLoaded) {
      if (pauseUntil) {
        localStorage.setItem('pauseUntil', pauseUntil); 
      } else {
        localStorage.removeItem('pauseUntil');
      }
      if(user) saveDocument(user.uid, 'pauseUntil', pauseUntil);
    }
  }, [pauseUntil, user, isDataLoaded]);

  useEffect(() => { 
    if (isDataLoaded) {
      if (onboardingPreview) {
        localStorage.setItem('onboardingPreview', JSON.stringify(onboardingPreview)); 
      } else {
        localStorage.removeItem('onboardingPreview');
      }
      if(user) saveDocument(user.uid, 'onboardingPreview', onboardingPreview);
    }
  }, [onboardingPreview, user, isDataLoaded]);

  useEffect(() => {
    if (isDataLoaded) {
      localStorage.setItem('timeLearningSettings', JSON.stringify(timeLearningSettings));
      if(user) saveDocument(user.uid, 'timeLearningSettings', timeLearningSettings);
    }
  }, [timeLearningSettings, user, isDataLoaded]);

  useEffect(() => {
    if (isDataLoaded) {
        localStorage.setItem('themeSettings', JSON.stringify(themeSettings));
        if (user) {
            saveDocument(user.uid, 'themeSettings', themeSettings);
        }
    }
  }, [themeSettings, user, isDataLoaded]);
  
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
            const MIGRATION_FLAG = 'migrationCompleted_v1';
            const hasMigrated = localStorage.getItem(MIGRATION_FLAG) === 'true';

            if (!hasMigrated && hasLocalData()) {
                setMigrationStatus('migrating');
                try {
                    await migrateLocalToFirestore(currentUser.uid);
                    localStorage.setItem(MIGRATION_FLAG, 'true');
                    setMigrationStatus('success');
                } catch (error) {
                    console.error('Migration failed:', error);
                    setMigrationStatus('error');
                    setIsDataLoaded(true); 
                    return; 
                }
            }

            try {
                const firestoreData = await loadAllData(currentUser.uid);
                
                if (Object.keys(firestoreData).length > 0) {
                    
                    if (firestoreData.savedMomentumMaps) {
                        const tasks = firestoreData.savedMomentumMaps.map((task: SavedTask) => {
                            if (task.mapData && !task.mapData.version) {
                                return { ...task, mapData: { ...task.mapData, version: 1 } };
                            }
                            return task;
                        });
                        setSavedTasks(tasks);
                    }
                    if (firestoreData.activeMapData !== undefined) {
                        const mapData = firestoreData.activeMapData;
                        if (mapData && !mapData.version) {
                            mapData.version = 1;
                        }
                        setActiveMapData(mapData);
                    }
                    if (firestoreData.scheduleEvents) setScheduleEvents(firestoreData.scheduleEvents);
                    if (firestoreData.smartReminders) setSmartReminders(firestoreData.smartReminders);
                    if (firestoreData.dndWindows) setDndWindows(firestoreData.dndWindows);
                    if (firestoreData.pauseUntil !== undefined) setPauseUntil(firestoreData.pauseUntil);
                    if (firestoreData.onboardingPreview !== undefined) setOnboardingPreview(firestoreData.onboardingPreview);
                    if (firestoreData.timeLearningSettings) setTimeLearningSettings(firestoreData.timeLearningSettings);
                    if (firestoreData.themeSettings) {
                        setThemeSettings(prev => ({
                            ...prev,
                            ...firestoreData.themeSettings,
                            customThemeProperties: {
                                ...prev.customThemeProperties,
                                ...(firestoreData.themeSettings.customThemeProperties || {}),
                            }
                        }));
                    }
                }
                setIsDataLoaded(true);
            } catch (error) {
                console.error("Failed to load data from Firestore:", error);
                setIsDataLoaded(true);
            }
        } else {
            setIsDataLoaded(true);
        }
    });
    return () => unsubscribe();
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Emergency Calm Mode
      if (event.ctrlKey && event.shiftKey && event.key === 'E') {
        event.preventDefault();
        setThemeSettings(prev => ({
          ...prev,
          mode: 'manual',
          manualTheme: 'Recovery',
          customThemeProperties: themePresets['Minimal Stimulation'],
        }));
        setIsThemeSettingsModalOpen(true);
      }

      // Quick Brain Dump
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault();
        setIsBrainDumpModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setThemeSettings]);

  const showSuccessToast = (message: string) => {
    setToastMessage(message);
  };

  const showConfirmation = (props: Omit<Confirmation, 'isOpen'>) => {
    setConfirmation({ ...props, isOpen: true });
  };

  const handleConfirm = () => {
    if (confirmation && confirmation.onConfirm) {
        confirmation.onConfirm();
    }
    setConfirmation(null);
  };

  const handleCancelConfirmation = () => {
    setConfirmation(null);
  };

  const showUndoToast = (action: Omit<UndoAction, 'id'>) => {
    if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
    }
    const newAction = { ...action, id: Date.now() };
    setUndoAction(newAction);

    undoTimeoutRef.current = window.setTimeout(() => {
        setUndoAction(null);
    }, 6000);
  };

  const handleUndo = () => {
    if (undoAction && undoAction.onUndo) {
        undoAction.onUndo();
    }
    if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
    }
    setUndoAction(null);
  };

  const handleBrainDumpSubmit = async (text: string): Promise<Result<BrainDumpItem[]>> => {
    setError(null);
    const result = await processBrainDumpText(text);

    // FIX: Explicitly check for the 'false' case to ensure correct type narrowing.
    if (result.ok === false) {
      setError(result.error);
      return { ok: false, error: result.error };
    }
    
    handleNavigate('Brain Dump');
    return { ok: true, data: result.data };
  };
  
  const handleNavigate = (page: string) => {
    setCurrentPage(page);
  };

  const handleResumeMap = (task: SavedTask) => {
    setActiveMapData(task.mapData);
    handleNavigate('Momentum Map');
  };

  const handleNewCompletionRecord = (record: Omit<CompletionRecord, 'id'>) => {
    if (!timeLearningSettings.isEnabled) return;
    const newHistory = addRecordToHistory(record);
    setCompletionHistory(newHistory);
  };

  const renderPage = () => {
    if (!isDataLoaded && user) {
        return (
            <div className="flex justify-center items-center h-screen">
                <svg className="animate-spin h-12 w-12 text-[var(--color-primary-accent)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle opacity="25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path opacity="75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            </div>
        );
    }

    switch (currentPage) {
      case 'Dashboard':
        return <Dashboard />;
      case 'Momentum Map':
        return <MomentumMap 
                  activeMap={activeMapData}
                  setActiveMap={setActiveMapData}
                  setSavedTasks={setSavedTasks}
                  completionHistory={completionHistory}
                  onNewCompletionRecord={handleNewCompletionRecord}
                  timeLearningSettings={timeLearningSettings}
                  onSuccess={showSuccessToast}
                />;
      case 'Brain Dump':
        return <BrainDump 
                  handleProcess={handleBrainDumpSubmit}
                  error={error}
                  setError={setError}
                  onConfirm={showConfirmation}
                />;
      case 'Task':
        return <TaskPage 
                  savedTasks={savedTasks} 
                  setSavedTasks={setSavedTasks}
                  onResume={handleResumeMap} 
                  onUndo={showUndoToast}
                />;
      case 'Calendar':
        return <CalendarPage
                  scheduleEvents={scheduleEvents}
                  setScheduleEvents={setScheduleEvents}
                  smartReminders={smartReminders}
                  setSmartReminders={setSmartReminders}
                  dndWindows={dndWindows}
                  setDndWindows={setDndWindows}
                  pauseUntil={pauseUntil}
                  setPauseUntil={setPauseUntil}
                  onboardingPreview={onboardingPreview}
                  setOnboardingPreview={setOnboardingPreview}
                  onSuccess={showSuccessToast}
                  onUndo={showUndoToast}
                />;
       case 'Stats':
        return <StatsPage />;
      case 'Settings':
        return <TimeLearningSettingsPage
                  settings={timeLearningSettings}
                  setSettings={setTimeLearningSettings}
                  completionHistory={completionHistory}
                  setCompletionHistory={setCompletionHistory}
                  onConfirm={showConfirmation}
                />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className={`app-root preview-${previewMode} density-${timeLearningSettings.density}`}>
        <div className="app-content">
            <div className="min-h-screen antialiased">
                <Navbar 
                    currentPage={currentPage} 
                    onNavigate={handleNavigate} 
                    onBrainDumpClick={() => setIsBrainDumpModalOpen(true)} 
                    onThemeClick={() => setIsThemeSettingsModalOpen(true)}
                    activeTheme={activeTheme}
                    previewMode={previewMode}
                    setPreviewMode={setPreviewMode}
                />
                <DataProvider>
                    {renderPage()}
                    <BrainDumpModal 
                        isOpen={isBrainDumpModalOpen}
                        onClose={() => setIsBrainDumpModalOpen(false)}
                        onSubmit={handleBrainDumpSubmit}
                        onSuccess={showSuccessToast}
                    />
                </DataProvider>
                <ThemeSettingsModal
                    isOpen={isThemeSettingsModalOpen}
                    onClose={() => setIsThemeSettingsModalOpen(false)}
                    settings={themeSettings}
                    setSettings={setThemeSettings}
                    onThemeSelect={setActiveThemeName}
                />
                <ThemeSuggestionToast
                    suggestion={themeSuggestion}
                    onAccept={acceptThemeSuggestion}
                    onDismiss={dismissThemeSuggestion}
                    onPreviewStart={startThemePreview}
                    onPreviewEnd={clearThemePreview}
                />
                <SuccessToast
                    message={toastMessage}
                    onDismiss={() => setToastMessage(null)}
                />
                <ConfirmationModal
                    isOpen={confirmation?.isOpen || false}
                    onClose={handleCancelConfirmation}
                    onConfirm={handleConfirm}
                    title={confirmation?.title || ''}
                    message={confirmation?.message || ''}
                    confirmText={confirmation?.confirmText || 'Confirm'}
                    isDestructive={confirmation?.title.toLowerCase().includes('delete') || confirmation?.title.toLowerCase().includes('reset')}
                />
                <UndoToast
                    action={undoAction}
                    onUndo={handleUndo}
                    onDismiss={() => setUndoAction(null)}
                />
                {migrationStatus !== 'idle' && (
                    <MigrationModal 
                        status={migrationStatus} 
                        onClose={() => setMigrationStatus('idle')} 
                    />
                )}
            </div>
            <MobileTabBar currentPage={currentPage} onNavigate={handleNavigate} />
        </div>
    </div>
  );
};

export default App;