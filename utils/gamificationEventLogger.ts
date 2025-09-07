import { GamEvent, EventRecord } from './gamificationTypes';
import { EnergyTag } from '../contracts';

const KEY = 'momentumMapEventLog:v1';

export function logEvent(e: GamEvent, extra?: { energyTag?: EnergyTag, sessionId?: string }): EventRecord {
  const record: EventRecord = {
    ...e,
    ...extra,
    eventId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  
  // In a real app, this might dispatch to a telemetry service.
  // console.log('[Gamification Event]', record);

  const arr = loadEvents();
  arr.push(record);
  
  try {
    localStorage.setItem(KEY, JSON.stringify(arr));
  } catch (error) {
    console.error("Could not save event log, it might be full.", error);
  }

  return record;
}

export function loadEvents(): EventRecord[] {
  try {
    const data = localStorage.getItem(KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function clearEvents() {
  localStorage.removeItem(KEY);
}
