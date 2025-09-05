import { HabitStats } from '../types';

const HABIT_STATS_KEY = 'momentumMapHabitStats';

// Gets all stats from storage
export const getHabitStats = (): Record<string, HabitStats> => {
    try {
        const stored = localStorage.getItem(HABIT_STATS_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch (e) {
        console.error("Failed to parse habit stats:", e);
        return {};
    }
};

// Saves all stats to storage
const saveHabitStats = (stats: Record<string, HabitStats>) => {
    try {
        localStorage.setItem(HABIT_STATS_KEY, JSON.stringify(stats));
    } catch (e) {
        console.error("Failed to save habit stats:", e);
    }
};

// Checks if two dates are on consecutive days
const areDatesConsecutive = (date1: Date, date2: Date): boolean => {
    const d1 = new Date(date1);
    d1.setHours(0, 0, 0, 0);
    const d2 = new Date(date2);
    d2.setHours(0, 0, 0, 0);
    
    const oneDay = 24 * 60 * 60 * 1000;
    const diffDays = Math.round(Math.abs((d1.getTime() - d2.getTime()) / oneDay));
    return diffDays === 1;
};

// Checks if two dates are on the same day (ignoring time)
const areDatesSameDay = (date1: Date, date2: Date): boolean => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
};

/**
 * Records a habit completion, updates streaks, and saves to localStorage.
 * Returns the new streak and whether it's a new longest streak.
 */
export const recordHabitCompletion = (habitId: string): { newStreak: number; isNewLongest: boolean } => {
    const allStats = getHabitStats();
    const habitStats = allStats[habitId] || {
        completionTimestamps: [],
        currentStreak: 0,
        longestStreak: 0,
    };

    const now = new Date();
    const nowISO = now.toISOString();

    const lastCompletion = habitStats.completionTimestamps.length > 0
        ? new Date(habitStats.completionTimestamps[habitStats.completionTimestamps.length - 1])
        : null;

    // Avoid multiple completions on the same day counting towards streak
    if (lastCompletion && areDatesSameDay(now, lastCompletion)) {
        return { newStreak: habitStats.currentStreak, isNewLongest: false };
    }

    // Update completion timestamps
    habitStats.completionTimestamps.push(nowISO);
    if (habitStats.completionTimestamps.length > 100) { // Prune history
        habitStats.completionTimestamps.shift();
    }

    // Update streak
    if (lastCompletion && areDatesConsecutive(now, lastCompletion)) {
        habitStats.currentStreak += 1;
    } else {
        habitStats.currentStreak = 1; // Reset streak
    }

    // Update longest streak
    let isNewLongest = false;
    if (habitStats.currentStreak > habitStats.longestStreak) {
        habitStats.longestStreak = habitStats.currentStreak;
        isNewLongest = true;
    }

    // Save back to storage
    allStats[habitId] = habitStats;
    saveHabitStats(allStats);

    return { newStreak: habitStats.currentStreak, isNewLongest };
};
