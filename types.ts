export interface Note {
  text: string;
  shareWithAI: boolean;
}

export interface BrainDumpItem {
  id: string;
  item: string;
  tags: string[];
  isUrgent: boolean;
  categoryId?: string;
  blockers?: string[];
  timeEstimateMinutesP50?: number;
  timeEstimateMinutesP90?: number;
}

export interface Cluster {
  clusterName: string;
  itemIds: string[];
  estimatedTime: string;
}

// New Types for Suggestions
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

// Momentum Map Types
export interface FinishLine {
  statement: string;
  acceptanceCriteria: string[];
  note?: Note;
}

export interface SubStep {
  id: string;
  description: string;
  isComplete: boolean;
  isBlocked?: boolean;
  blockers?: string[];
  note?: Note;
  startedAt?: string; // ISO string
  completedAt?: string; // ISO string
}

export enum EnergyTag {
  Creative = 'Creative',
  Tedious = 'Tedious',
  Admin = 'Admin',
  Social = 'Social',
  Errand = 'Errand',
}

export interface Reflection {
  helped: string;
  trippedUp: string;
}

export interface Chunk {
  id: string;
  title: string;
  subSteps: SubStep[];
  p50: number; // minutes
  p90: number; // minutes
  energyTag: EnergyTag;
  blockers: string[];
  isComplete: boolean;
  note?: Note;
  reflection?: Reflection;
  startedAt?: string; // ISO string
  completedAt?: string; // ISO string
  
  // New fields for personalized estimation
  personalizedP50?: number;
  personalizedP90?: number;
  confidence?: 'low' | 'medium' | 'high';
  confidenceValue?: number;
  confidenceReason?: string;
  warning?: string;
}

export interface MomentumMapData {
  finishLine: FinishLine;
  chunks: Chunk[];
}

export interface SavedTask {
  id: string;
  nickname?: string;
  note: string;
  savedAt: string; // ISO string
  mapData: MomentumMapData;
  progress: {
    completedChunks: number;
    totalChunks: number;
    completedSubSteps: number;
    totalSubSteps: number;
  };
}

// Calendar and Reminder Types
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
  
  // "Smart" properties
  why: string; // "Why this time" explanation
  isLocked: boolean; // "don't auto-shift this reminder"
  isExploratory: boolean; // Flag for a test/exploration slot
  status: ReminderStatus;
  
  // For micro-learning
  snoozeHistory: number[]; // Array of snooze durations in minutes [10, 10, 10]
  lastShiftSuggestion?: string; // ISO String, to prevent re-prompting
  
  // For snoozing
  snoozedUntil: string | null; // ISO string

  // V2 System Additions
  successHistory: SuccessState[]; // For info panel
  isStackedHabit?: boolean; // For habit stacking guardrail
  habitId?: string; // Links to a MicroHabit ID
  originalOffsetMinutes?: number; // For reverting exploratory changes
  lastInteraction?: string; // ISO String, for detecting ignored reminders
  flexibilityMinutes?: number; // How many minutes reminder can be shifted
  allowExploration?: boolean; // User setting to allow AI to test new times
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
  estimatedDurationMinutes: number; // The P50 estimate at the time of completion
  energyTag: EnergyTag; 
  completedAt: string; // ISO string
  subStepCount: number; 
  dayOfWeek: number; // 0=Sun, 6=Sat
  difficulty: UserDifficulty;
  timeOfDay: TimeOfDay;
  isHyperfocus?: boolean;
}

export interface TimeLearningSettings {
    isEnabled: boolean;
    sensitivity: number; // e.g., 0.3 for default alpha in EWMA
}

// --- Theming Types ---
export type ThemeName = 'Focus' | 'Creative' | 'Recovery' | 'Evening';

export type PresetName = 'Default' | 'High Contrast' | 'Reduced Motion' | 'Minimal Stimulation';

export interface CustomThemeProperties {
    animationSpeed: number; // Multiplier, e.g., 1 is normal, 0 is none
    colorIntensity: number; // Multiplier, e.g., 1 is normal, 0 is none
    uiContrastLevel: number; // Multiplier, e.g., 1 is normal
    textContrastLevel: number; // Multiplier, e.g., 1 is normal
}

export interface ThemeSettings {
    mode: 'auto' | 'manual';
    manualTheme: ThemeName;
    customThemeProperties: CustomThemeProperties;
    userOverrides: {
      lastOverride?: number; // timestamp
      // could add more complex tracking here later
    };
}

// This is a map of HSL values, not final CSS colors
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
    energyTags?: EnergyTag[]; // When to suggest based on completed chunk's tag
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