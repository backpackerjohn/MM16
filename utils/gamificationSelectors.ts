import { EventRecord } from './gamificationTypes';
import { computeDailyMXP } from './gamificationMxpCalculator';
import { getAnchorStreak } from './gamificationStreaks';

function getISODateString(date: Date) {
    return date.toISOString().slice(0, 10);
}

export function selectTodayWins(events: EventRecord[]) {
    const todayISO = getISODateString(new Date());
    const todayEvents = events.filter(e => e.timestamp.startsWith(todayISO));

    const firstBytes = todayEvents.filter(e => e.type === 'quest_first_byte').length;
    const milestones = todayEvents.filter(e => e.type === 'timer_milestone').length;
    const earlyBlockers = todayEvents.filter(e => e.type === 'blocker_logged' && e.early).length;

    const stoppedTimers = todayEvents.filter(e => e.type === 'timer_stopped_on_time' || (e.type === 'quest_completed' && e.parentGoalId)); // crude but works
    const onTimeStops = todayEvents.filter(e => e.type === 'timer_stopped_on_time').length;
    const stopOnTimeRate = stoppedTimers.length > 0 ? onTimeStops / stoppedTimers.length : 0;

    return { firstBytes, milestones, stopOnTimeRate, earlyBlockers };
}

export function selectRollingMXP(events: EventRecord[], days: number) {
    const today = new Date();
    const results: { day: string; total: number }[] = [];
    for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dayISO = getISODateString(date);
        results.push(computeDailyMXP(events, dayISO));
    }
    return results.reverse();
}

export function selectStreakSummary(events: EventRecord[], days: number) {
    // FIX: Use a type predicate with `Extract` to help TypeScript narrow the union type and safely access `anchorId`.
    const anchorIds = [...new Set(events.filter((e): e is Extract<EventRecord, { type: 'anchor_completed' }> => e.type === 'anchor_completed').map(e => e.anchorId))];
    const summary: Record<string, { streak: number, anchorId: string }> = {};

    for (const anchorId of anchorIds) {
        const streak = getAnchorStreak(events, anchorId, new Date());
        if (streak > 0) {
            summary[anchorId] = { streak, anchorId };
        }
    }
    return Object.values(summary).sort((a,b) => b.streak - a.streak);
}

export function selectTimerBehavior(events: EventRecord[], days: number) {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - days);
    const dateRangeEvents = events.filter(e => new Date(e.timestamp) >= startDate);

    // FIX: Use a type predicate with `Extract` to help TypeScript narrow the union type and safely access `actualSeconds`.
    const timerStopEvents = dateRangeEvents.filter((e): e is Extract<EventRecord, { type: 'timer_stopped_on_time' }> => e.type === 'timer_stopped_on_time');
    if (timerStopEvents.length === 0) return { medianSession: 0, milestoneHitRate: 0, returnAfterPauseRate: 0 };

    const durations = timerStopEvents.map(e => e.actualSeconds).sort((a, b) => a - b);
    const mid = Math.floor(durations.length / 2);
    const medianSession = durations.length % 2 === 0 ? (durations[mid-1] + durations[mid]) / 2 : durations[mid];
    
    // FIX: Use a type predicate with `Extract` to help TypeScript narrow the union type and safely access `timerId`.
    const uniqueTimersWithMilestones = new Set(dateRangeEvents.filter((e): e is Extract<EventRecord, { type: 'timer_milestone' }> => e.type === 'timer_milestone').map(e => e.timerId));
    // FIX: Use a type predicate with `Extract` to help TypeScript narrow the union type and safely access `timerId`.
    const uniqueTimersStarted = new Set(dateRangeEvents.filter((e): e is Extract<EventRecord, { type: 'timer_started' }> => e.type === 'timer_started').map(e => e.timerId));
    const milestoneHitRate = uniqueTimersStarted.size > 0 ? uniqueTimersWithMilestones.size / uniqueTimersStarted.size : 0;

    // This is a proxy, not a perfect measure
    // FIX: Use a type predicate with `Extract` to help TypeScript narrow the union type and safely access `timerId`.
    const resumedTimers = new Set(dateRangeEvents.filter((e): e is Extract<EventRecord, { type: 'timer_resumed' }> => e.type === 'timer_resumed').map(e => e.timerId));
    const returnAfterPauseRate = uniqueTimersStarted.size > 0 ? resumedTimers.size / uniqueTimersStarted.size : 0;
    
    return { medianSession: medianSession / 60, milestoneHitRate, returnAfterPauseRate };
}

export function selectBlockers(events: EventRecord[], days: number) {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - days);
    const dateRangeEvents = events.filter(e => e.timestamp >= startDate.toISOString() && e.type === 'blocker_logged');
    
    const counts = dateRangeEvents.reduce((acc, event) => {
        if (event.type === 'blocker_logged') {
            acc[event.blocker] = (acc[event.blocker] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    return counts;
}