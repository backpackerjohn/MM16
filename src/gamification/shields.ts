import { EventRecord } from './types';
import { MXP } from './config';

export function shieldsGrantedToday(events: EventRecord[], dayISO: string) {
  const earlyBlockers = events.filter(e => e.type==='blocker_logged' && e.early && e.timestamp.startsWith(dayISO)).length;
  return Math.min(earlyBlockers, MXP.SHIELDS_PER_DAY_CAP);
}

export function canGrantShieldToday(events: EventRecord[], dayISO: string) {
  return shieldsGrantedToday(events, dayISO) < MXP.SHIELDS_PER_DAY_CAP;
}