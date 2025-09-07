import { EnergyTag } from '../contracts';

// src/gamification/types.ts
export type GamEvent =
  | { type:'quest_created'; questId:string; parentGoalId?:string }
  | { type:'quest_first_byte'; questId:string; parentGoalId?:string }
  | { type:'quest_completed'; questId:string; parentGoalId?:string; finishedWithin:'P50'|'P90'|'AFTER' }
  | { type:'split_performed'; parentGoalId:string; childIds:string[] }
  | { type:'blocker_logged'; questId?:string; timerId?:string; blocker:'too_big'|'unclear'|'waiting'|'dread'; early:boolean }
  | { type:'timer_started'; timerId:string; plannedSeconds:number; questId?:string }
  | { type:'timer_milestone'; timerId:string; atSeconds:number }           // 180, 600, 900
  | { type:'timer_stopped_on_time'; timerId:string; actualSeconds:number; plannedSeconds:number }
  | { type:'timer_resumed'; timerId:string }
  | { type:'anchor_completed'; anchorId:string; withinWindow:boolean; partial:boolean; graceUsed:boolean }
  | { type:'streak_updated'; anchorId:string; day:string; windowMet:boolean; partial:boolean; graceUsed:boolean }
  | { type:'celebration_shown'; celebration:'toast'|'confetti'|'none'; reducedMotion:boolean };

export type EventRecord = GamEvent & {
  eventId:string;
  timestamp:string; // ISO String
  energyTag?: EnergyTag;
  sessionId?:string;
};
