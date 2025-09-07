// src/gamification/shields.ts
import { EventRecord } from './gamificationTypes';
import { MXP } from './gamificationConfig';

export function shieldsUsedToday(events: EventRecord[], dayISO: string): number {
  return events.filter(e => e.type === 'anchor_completed' && e.graceUsed && e.timestamp.startsWith(dayISO)).length;
}

export function shieldsGrantedToday(events: EventRecord[], dayISO: string): number {
    const earlyBlockers = events.filter(e => e.type === 'blocker_logged' && e.early && e.timestamp.startsWith(dayISO)).length;
    return Math.min(earlyBlockers, MXP.SHIELDS_PER_DAY_CAP);
}

export function canGrantShieldToday(events: EventRecord[], dayISO: string): boolean {
  return shieldsGrantedToday(events, dayISO) < MXP.SHIELDS_PER_DAY_CAP;
}

export function availableShieldsToday(events: EventRecord[], dayISO: string): number {
    const granted = shieldsGrantedToday(events, dayISO);
    const used = shieldsUsedToday(events, dayISO);
    return granted - used;
}
