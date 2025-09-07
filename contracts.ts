// This file contains the core, stable data contracts for the application.
// These interfaces should only be changed with a version bump and a corresponding decoder function.

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

// --- Momentum Map Contracts ---

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
  firstByteAt?: string; // ISO string, for gamification
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
  
  personalizedP50?: number;
  personalizedP90?: number;
  confidence?: 'low' | 'medium' | 'high';
  confidenceValue?: number;
  confidenceReason?: string;
  warning?: string;
}

export interface MomentumMapData {
  version: 1;
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