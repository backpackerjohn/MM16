import { EventRecord, GamEvent } from './types';

const KEY = 'momentumMapEventLog:v1';

export function loadEvents(): EventRecord[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
}

function saveEvents(events: EventRecord[]) {
  localStorage.setItem(KEY, JSON.stringify(events));
}

export function logEvent(e: GamEvent, extra?: Partial<EventRecord>): EventRecord {
  // FIX: Cast the created record to EventRecord to satisfy TypeScript's strict union checks.
  const record = {
    ...e,
    ...extra,
    eventId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  } as EventRecord;
  const all = loadEvents();
  all.push(record);
  saveEvents(all);
  return record;
}

export function clearEvents() {
  localStorage.removeItem(KEY);
}