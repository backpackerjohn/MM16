// src/gamification/mxpCalculator.ts
import { EventRecord } from './gamificationTypes';
import { MXP } from './gamificationConfig';

export function computeDailyMXP(events: EventRecord[], dayISO: string) {
  const dayEvents = events.filter(e => e.timestamp.slice(0, 10) === dayISO);
  let total = 0;
  const firstByteSeen = new Set<string>();  // questId@day
  const timerSeen = new Set<string>();      // timerId
  const parentDaily = new Map<string, number>();

  function addCapped(parentGoalId: string | undefined, pts: number) {
    if (!parentGoalId) {
      total += pts;
      return;
    }
    const used = parentDaily.get(parentGoalId) || 0;
    const grant = Math.max(0, Math.min(pts, MXP.PARENT_GOAL_DAILY_CAP - used));
    if (grant > 0) {
        parentDaily.set(parentGoalId, used + grant);
        total += grant;
    }
    return grant > 0;
  }

  for (const e of dayEvents) {
    if (e.type === 'quest_first_byte') {
      const key = `${e.questId}@${dayISO}`;
      if (!firstByteSeen.has(key)) {
        firstByteSeen.add(key);
        addCapped(e.parentGoalId, MXP.FIRST_BYTE);
      }
    }
    if (e.type === 'quest_completed') {
      if (e.finishedWithin === 'P50') addCapped(e.parentGoalId, MXP.P50);
      else if (e.finishedWithin === 'P90') addCapped(e.parentGoalId, MXP.P90);
    }
    if (e.type === 'timer_milestone') {
      if (!timerSeen.has(e.timerId)) {
        timerSeen.add(e.timerId);
        total += MXP.TIMER_MILESTONES;
      }
    }
    if (e.type === 'timer_stopped_on_time') total += MXP.STOP_ON_TIME;
    if (e.type === 'blocker_logged' && e.early) total += MXP.EARLY_BLOCKER;
  }
  return { day: dayISO, total };
}
