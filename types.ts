// General utility type for functions that can fail, returning either data or an error.
export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

// --- Brain Dump & AI Suggestion Types ---
export interface Cluster {
  clusterName: string;
  itemIds: string[];
  estimatedTime: string;
}

export interface RefinementSuggestion {
  itemId: string;
  proposedTags: string[];
  proposedUrgency: 'low' | 'normal' | 'high';
  blockers: string[];
  timeEstimateMinutesP50: number;
  timeEstimateMinutesP90: number;
  confidence: number; // 0-1
  rationale: string; // <=140 chars
  createdAt: string; // ISO string
}

export interface ClusterMove {
    itemId: string;
    fromCategoryId?: string;
    toCategoryId: string;
    confidence: number;
    rationale: string;
}

export interface ClusterPlan {
    refinements: RefinementSuggestion[];
    moves: ClusterMove[];
    summary: string; // <= 200 chars
}


// --- Calendar and Reminder Types ---
export enum ContextTag {
  Rushed = 'rushed',
  Relaxed = 'relaxed',
  HighEnergy = 'high-energy',
  LowEnergy = 'low-energy',
  Work = 'work',
  School = 'school',
  Personal = 'personal',
  Prep = 'prep',
  Travel = 'travel',
  Recovery = 'recovery',
}

export interface ScheduleEvent { // This is an "Anchor"
  id: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  title: string;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  bufferMinutes?: {
    prep?: number;
    recovery?: number;
  };
  contextTags?: ContextTag[];
}

export interface DNDWindow {
  day: ScheduleEvent['day'];
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
}

export enum ReminderStatus {
  Active = 'active',
  Snoozed = 'snoozed',
  Done = 'done',
  Paused = 'paused',
  Ignored = 'ignored',
}

export type SuccessState = 'success' | 'snoozed' | 'ignored';

export interface SmartReminder {
  id: string;
  eventId: string; // Links to a ScheduleEvent
  offsetMinutes: number; // How many minutes before/after (+) event.startTime
  message: string;
  
  why: string; 
  isLocked: boolean;
  isExploratory: boolean;
  status: ReminderStatus;
  
  snoozeHistory: number[];
  lastShiftSuggestion?: string;
  
  snoozedUntil: string | null;

  successHistory: SuccessState[];
  isStackedHabit?: boolean;
  habitId?: string;
  originalOffsetMinutes?: number;
  lastInteraction?: string;
  flexibilityMinutes?: number;
  allowExploration?: boolean;
}


// --- Time Learning Types ---
export enum UserDifficulty {
    Easier = 0.8,
    Typical = 1.0,
    Harder = 1.25,
}

export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

export interface CompletionRecord {
  id: string; 
  actualDurationMinutes: number; 
  estimatedDurationMinutes: number;
  energyTag: 'Creative' | 'Tedious' | 'Admin' | 'Social' | 'Errand'; 
  completedAt: string; // ISO string
  subStepCount: number; 
  dayOfWeek: number; // 0=Sun, 6=Sat
  difficulty: UserDifficulty;
  timeOfDay: TimeOfDay;
  isHyperfocus?: boolean;
}

export interface TimeLearningSettings {
    isEnabled: boolean;
    sensitivity: number;
    density: 'comfortable' | 'compact';
}

// --- Theming Types ---
export type ThemeName = 'Focus' | 'Creative' | 'Recovery' | 'Evening';

export type PresetName = 'Default' | 'High Contrast' | 'Reduced Motion' | 'Minimal Stimulation';

export interface CustomThemeProperties {
    animationSpeed: number;
    colorIntensity: number;
    uiContrastLevel: number;
    textContrastLevel: number;
}

export interface ThemeSettings {
    mode: 'auto' | 'manual';
    manualTheme: ThemeName;
    customThemeProperties: CustomThemeProperties;
    userOverrides: {
      lastOverride?: number;
    };
}

export interface ThemeProperties {
    '--color-bg-h': number; '--color-bg-s': string; '--color-bg-l': string;
    '--color-surface-h': number; '--color-surface-s': string; '--color-surface-l': string;
    '--color-surface-sunken-h': number; '--color-surface-sunken-s': string; '--color-surface-sunken-l': string;
    '--color-text-primary-h': number; '--color-text-primary-s': string; '--color-text-primary-l': string;
    '--color-text-secondary-h': number; '--color-text-secondary-s': string; '--color-text-secondary-l': string;
    '--color-text-subtle-h': number; '--color-text-subtle-s': string; '--color-text-subtle-l': string;
    '--color-border-h': number; '--color-border-s': string; '--color-border-l': string;
    '--color-border-hover-h': number; '--color-border-hover-s': string; '--color-border-hover-l': string;
    '--color-primary-accent-h': number; '--color-primary-accent-s': string; '--color-primary-accent-l': string;
    '--color-primary-accent-text-h': number; '--color-primary-accent-text-s': string; '--color-primary-accent-text-l': string;
    '--color-secondary-accent-h': number; '--color-secondary-accent-s': string; '--color-secondary-accent-l': string;
    '--color-secondary-accent-text-h': number; '--color-secondary-accent-text-s': string; '--color-secondary-accent-text-l': string;
    '--color-success-h': number; '--color-success-s': string; '--color-success-l': string;
    '--color-warning-h': number; '--color-warning-s': string; '--color-warning-l': string;
    '--color-danger-h': number; '--color-danger-s': string; '--color-danger-l': string;
}

// --- Habit Stacking Types ---
export enum HabitCategory {
  Physical = 'Physical',
  Cognitive = 'Cognitive',
  Transitional = 'Transitional',
}

export enum HabitEnergyRequirement {
  Low = 'Low',
  Medium = 'Medium',
}

export interface MicroHabit {
  id: string;
  name: string;
  description: string;
  category: HabitCategory;
  durationMinutes: number;
  energyRequirement: HabitEnergyRequirement;
  optimalContexts: {
    energyTags?: ('Creative' | 'Tedious' | 'Admin' | 'Social' | 'Errand')[];
  };
}

export interface HabitStats {
  completionTimestamps: string[];
  currentStreak: number;
  longestStreak: number;
}

// --- Global UI Types ---

export interface Confirmation {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
}

export interface UndoAction {
    id: number;
    message: string;
    onUndo: () => void;
}