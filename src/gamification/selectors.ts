import { EventRecord } from './types';

export function selectTodayWins(events: EventRecord[], dayISO: string) {
  const today = events.filter(e => e.timestamp.startsWith(dayISO));
  const firstBytes = today.filter(e => e.type==='quest_first_byte').length;
  const milestones = new Set(today.filter(e => e.type==='timer_milestone').map(e => (e as any).timerId)).size;
  const stops = today.filter(e => e.type==='timer_stopped_on_time').length;
  const timerStopsTotal = today.filter(e => e.type==='timer_stopped_on_time' || e.type==='timer_started').length;
  const earlyBlockers = today.filter(e => e.type==='blocker_logged' && e.early).length;

  const stopOnTimeRate = timerStopsTotal ? Math.round((stops / Math.max(1, stops)) * 100) : 0;
  return { firstBytes, milestones, earlyBlockers, stopOnTimeRate };
}

export function groupBy<T extends { timestamp: string }>(events: T[], key: (e:T)=>string) {
  return events.reduce((acc, e) => {
    const k = key(e); (acc[k] ||= []).push(e); return acc;
  }, {} as Record<string, T[]>);
}