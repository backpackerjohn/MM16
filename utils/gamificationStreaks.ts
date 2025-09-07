import { EventRecord } from './gamificationTypes';

const getDayKey = (date: Date): string => date.toISOString().slice(0, 10);

/**
 * Calculates the current streak for a given anchor, ending on a specific date.
 * This handles "compassionate streaks" where a day can be missed but the streak continues.
 * @param events All historical events.
 * @param anchorId The ID of the anchor to check.
 * @param endDate The date to calculate the streak up to (usually today).
 * @param graceDays The number of consecutive days that can be missed before a streak breaks.
 * @returns The current streak count.
 */
export function getAnchorStreak(events: EventRecord[], anchorId: string, endDate: Date, graceDays: number = 1): number {
    const anchorEvents = events.filter(e =>
        (e.type === 'anchor_completed' || e.type === 'streak_updated') && e.anchorId === anchorId
    ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (anchorEvents.length === 0) {
        return 0;
    }

    const completionDays = new Set<string>();
    for (const event of anchorEvents) {
        if (event.type === 'anchor_completed' && (event.withinWindow || event.graceUsed)) {
            completionDays.add(getDayKey(new Date(event.timestamp)));
        } else if (event.type === 'streak_updated' && (event.windowMet || event.graceUsed)) {
            completionDays.add(getDayKey(new Date(event.timestamp)));
        }
    }
    
    let streak = 0;
    let missedDays = 0;
    let currentDate = new Date(endDate);
    currentDate.setHours(12, 0, 0, 0);

    // Check if today counts
    if (completionDays.has(getDayKey(currentDate))) {
        streak++;
    } else {
        // If today isn't completed, the streak is 0 unless we look backwards
        // This logic assumes we check from "yesterday" backwards
    }
    
    currentDate.setDate(currentDate.getDate() - 1); // Start checking from yesterday

    for (let i = 0; i < 365; i++) { // Limit search to a year
        const dayKey = getDayKey(currentDate);

        if (completionDays.has(dayKey)) {
            streak++;
            missedDays = 0; // Reset grace counter
        } else {
            missedDays++;
            if (missedDays > graceDays) {
                break; // Streak is broken
            }
        }
        currentDate.setDate(currentDate.getDate() - 1);
    }
    
    // Final check for today's contribution if streak continued from past days
    const todayKey = getDayKey(endDate);
    if (!completionDays.has(todayKey) && streak > 0) {
      // The loop started yesterday. If today isn't complete, the streak is from past days.
      // But if yesterday was also missed, the streak is 0.
      if (missedDays > 0) {
         // Yesterday was missed, but within grace. If today is also missed, streak is broken.
         if (!completionDays.has(getDayKey(new Date(new Date().setDate(new Date().getDate()-1))))) {
            const yesterdayKey = getDayKey(new Date(new Date().setDate(endDate.getDate() - 1)));
            if (!completionDays.has(yesterdayKey)) return 0;
         }
      }
    } else if (completionDays.has(todayKey) && streak === 0) {
        // Only today is completed.
        streak = 1;
    }


    return streak;
}
