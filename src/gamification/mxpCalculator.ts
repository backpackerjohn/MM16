import { EventRecord } from './types';
import { MXP } from './config';

export function computeDailyMXP(events: EventRecord[], dayISO: string) {
  const dayEvents = events.filter(e => e.timestamp.slice(0,10) === dayISO);
  let total = 0;

  const firstByteSeen = new Set<string>();
  const timerAwarded = new Set<string>();
  const parentDaily = new Map<string, number>();

  function addCapped(parentGoalId: string | undefined, points: number) {
    if (!parentGoalId) { total += points; return; }
    const used = parentDaily.get(parentGoalId) || 0;
    const grant = Math.max(0, Math.min(points, MXP.PARENT_GOAL_DAILY_CAP - used));
    parentDaily.set(parentGoalId, used + grant);
    total += grant;
  }

  for (const e of dayEvents) {
    switch (e.type) {
      case 'quest_first_byte': {
        const key = `${e.questId}@${dayISO}`;
        if (!firstByteSeen.has(key)) {
          firstByteSeen.add(key);
          addCapped(e.parentGoalId, MXP.FIRST_BYTE);
        }
        break;
      }
      case 'quest_completed':
        if (e.finishedWithin === 'P50') addCapped(e.parentGoalId, MXP.P50);
        else if (e.finishedWithin === 'P90') addCapped(e.parentGoalId, MXP.P90);
        break;
      case 'timer_milestone':
        if (!timerAwarded.has(e.timerId)) {
          timerAwarded.add(e.timerId);
          total += MXP.TIMER_MILESTONES;
        }
        break;
      case 'timer_stopped_on_time':
        total += MXP.STOP_ON_TIME;
        break;
      case 'blocker_logged':
        if (e.early) total += MXP.EARLY_BLOCKER;
        break;
    }
  }

  return { day: dayISO, total };
}

export function rollingMXP(events: EventRecord[], days: number, endDayISO?: string) {
  const end = endDayISO ?? new Date().toISOString().slice(0,10);
  const endDate = new Date(end);
  const out = [] as { day: string; total: number }[];
  for (let i=days-1;i>=0;i--) {
    const d = new Date(endDate);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0,10);
    out.push(computeDailyMXP(events, iso));
  }
  return out;
}