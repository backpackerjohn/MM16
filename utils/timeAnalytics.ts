import { EnergyTag } from '../contracts';
import { CompletionRecord, UserDifficulty, TimeOfDay } from '../types';

const HISTORY_KEY = 'momentumMapCompletionHistory';
const MAX_RECORDS_PER_TAG = 100;

export const getTimeOfDay = (date: Date): TimeOfDay => {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  return 'evening'; // 17:00 to 04:59
};

export const getCompletionHistory = (): Record<EnergyTag, CompletionRecord[]> => {
    try {
        const stored = localStorage.getItem(HISTORY_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            const fullHistory: Record<EnergyTag, CompletionRecord[]> = {} as any;
            for (const tag of Object.values(EnergyTag)) {
                // Backfill timeOfDay for older records for smooth migration
                fullHistory[tag] = (parsed[tag] || []).map((rec: CompletionRecord) => {
                    if (!rec.timeOfDay && rec.completedAt) {
                        return { ...rec, timeOfDay: getTimeOfDay(new Date(rec.completedAt)) };
                    }
                    return rec;
                });
            }
            return fullHistory;
        }
    } catch (e) {
        console.error("Failed to parse completion history:", e);
    }
    return Object.values(EnergyTag).reduce((acc, tag) => ({ ...acc, [tag]: [] }), {} as Record<EnergyTag, CompletionRecord[]>);
};

const saveCompletionHistory = (history: Record<EnergyTag, CompletionRecord[]>) => {
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
        console.error("Failed to save completion history:", e);
    }
};

export const addRecordToHistory = (record: Omit<CompletionRecord, 'id' | 'timeOfDay'>): Record<EnergyTag, CompletionRecord[]> => {
    const history = getCompletionHistory();
    const completedAtDate = new Date(record.completedAt);
    const newRecord: CompletionRecord = {
        ...record,
        id: `cr-${Date.now()}`,
        timeOfDay: getTimeOfDay(completedAtDate),
    };

    // Hyperfocus detection: flag sessions that take more than 3x the estimated time.
    if (record.estimatedDurationMinutes > 0 && (record.actualDurationMinutes / record.estimatedDurationMinutes > 3)) {
        newRecord.isHyperfocus = true;
    }
    
    const recordsForTag = history[record.energyTag] || [];
    recordsForTag.push(newRecord);

    if (recordsForTag.length > MAX_RECORDS_PER_TAG) {
        recordsForTag.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
        history[record.energyTag] = recordsForTag.slice(0, MAX_RECORDS_PER_TAG);
    } else {
        history[record.energyTag] = recordsForTag;
    }

    saveCompletionHistory(history);
    return history;
};

export const resetCompletionHistory = () => {
    localStorage.removeItem(HISTORY_KEY);
};

const calculateEWMA = (data: number[], alpha: number = 0.3): number => {
  if (data.length === 0) return 0;
  return data.reduce((ewma, value) => alpha * value + (1 - alpha) * ewma, data[0]);
};

const calculateEstimateFromRecords = (records: CompletionRecord[], subStepCount: number, sensitivity: number) => {
    if (records.length === 0) {
        return { p50: 0, p90: 0, stdDev: 0 };
    }
    const adjustedDurations = records.map(r => r.actualDurationMinutes / r.difficulty);
    const totalAdjustedMinutes = adjustedDurations.reduce((sum, d) => sum + d, 0);
    const totalSubSteps = records.reduce((sum, r) => sum + r.subStepCount, 0);
    const avgMinutesPerSubStep = totalSubSteps > 0 ? totalAdjustedMinutes / totalSubSteps : 0;
    const complexityBasedEstimate = avgMinutesPerSubStep * subStepCount;

    const sortedRecords = [...records].sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());
    const recentPerformanceEstimate = calculateEWMA(
        sortedRecords.map(r => r.actualDurationMinutes / r.difficulty),
        sensitivity
    );
    
    const blendedP50 = complexityBasedEstimate * 0.5 + recentPerformanceEstimate * 0.5;
    const variance = adjustedDurations.map(d => (d - blendedP50) ** 2).reduce((sum, sq) => sum + sq, 0) / adjustedDurations.length;
    const stdDev = Math.sqrt(variance);
    const blendedP90 = blendedP50 + 1.3 * stdDev;

    return { p50: blendedP50, p90: blendedP90, stdDev };
};

export const getPersonalizedEstimate = (
  history: Record<EnergyTag, CompletionRecord[]>,
  newChunkContext: { 
    energyTag: EnergyTag; 
    subStepCount: number; 
    timeOfDay: TimeOfDay;
    dayOfWeek: number;
  },
  sensitivity: number = 0.3
): { 
  p50: number; 
  p90: number; 
  confidence: 'low' | 'medium' | 'high';
  confidenceValue: number;
  confidenceReason: string;
} | null => {
  const allRecordsForTag = history[newChunkContext.energyTag] || [];
  const regularRecordsForTag = allRecordsForTag.filter(r => !r.isHyperfocus);

  if (regularRecordsForTag.length < 5) return null;

  const minRecords = 5;
  const { energyTag, timeOfDay, subStepCount, dayOfWeek } = newChunkContext;
  const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];

  const exactMatchRecords = regularRecordsForTag.filter(r => r.timeOfDay === timeOfDay && r.dayOfWeek === dayOfWeek);
  const weeklyMatchRecords = regularRecordsForTag.filter(r => r.dayOfWeek === dayOfWeek);
  const allRegularRecordsInHistory = Object.values(history).flat().filter(r => !r.isHyperfocus);
  const timeMatchRecords = allRegularRecordsInHistory.filter(r => r.timeOfDay === timeOfDay);

  const estimates = {
    exact: exactMatchRecords.length >= minRecords ? calculateEstimateFromRecords(exactMatchRecords, subStepCount, sensitivity) : null,
    weekly: weeklyMatchRecords.length >= minRecords ? calculateEstimateFromRecords(weeklyMatchRecords, subStepCount, sensitivity) : null,
    energy: regularRecordsForTag.length >= minRecords ? calculateEstimateFromRecords(regularRecordsForTag, subStepCount, sensitivity) : null,
    time: timeMatchRecords.length >= minRecords ? calculateEstimateFromRecords(timeMatchRecords, subStepCount, sensitivity) : null,
  };

  let totalWeight = 0;
  let weightedP50 = 0;
  let weightedP90 = 0;
  const weights = { exact: 0.5, weekly: 0.2, energy: 0.2, time: 0.1 };

  if (estimates.exact) {
    totalWeight += weights.exact;
    weightedP50 += estimates.exact.p50 * weights.exact;
    weightedP90 += estimates.exact.p90 * weights.exact;
  }
  if (estimates.weekly) {
    totalWeight += weights.weekly;
    weightedP50 += estimates.weekly.p50 * weights.weekly;
    weightedP90 += estimates.weekly.p90 * weights.weekly;
  }
  if (estimates.energy) {
    totalWeight += weights.energy;
    weightedP50 += estimates.energy.p50 * weights.energy;
    weightedP90 += estimates.energy.p90 * weights.energy;
  }
  if (estimates.time) {
    totalWeight += weights.time;
    weightedP50 += estimates.time.p50 * weights.time;
    weightedP90 += estimates.time.p90 * weights.time;
  }

  if (totalWeight === 0) return null;

  const finalP50 = weightedP50 / totalWeight;
  const finalP90 = weightedP90 / totalWeight;

  let confidenceSourceRecords: CompletionRecord[] = [];
  let confidenceReason = "";
  if (estimates.exact) {
      confidenceSourceRecords = exactMatchRecords;
      confidenceReason = `Based on ${exactMatchRecords.length} similar tasks (${energyTag}, ${timeOfDay} on ${dayName}s).`;
  } else if (estimates.weekly) {
      confidenceSourceRecords = weeklyMatchRecords;
      confidenceReason = `Based on ${weeklyMatchRecords.length} similar '${energyTag}' tasks on ${dayName}s.`;
  } else if (estimates.energy) {
      confidenceSourceRecords = regularRecordsForTag;
      confidenceReason = `Based on ${regularRecordsForTag.length} tasks with a '${energyTag}' tag.`;
  } else {
      confidenceSourceRecords = timeMatchRecords;
      confidenceReason = `Based on ${timeMatchRecords.length} tasks completed in the ${timeOfDay}.`;
  }

  const recordCount = confidenceSourceRecords.length;
  const stdDev = estimates.exact?.stdDev ?? estimates.weekly?.stdDev ?? estimates.energy?.stdDev ?? estimates.time?.stdDev ?? finalP50;
  
  const countConfidence = Math.min(1, recordCount / 30);
  const variancePenalty = 1 - Math.min(1, stdDev / (finalP50 || 1));
  const confidenceValue = countConfidence * variancePenalty;

  const confidence: 'low' | 'medium' | 'high' = confidenceValue < 0.4 ? 'low' : confidenceValue < 0.75 ? 'medium' : 'high';
  confidenceReason += ` Confidence: ${Math.round(confidenceValue * 100)}%`;

  return {
    p50: Math.round(Math.max(5, finalP50)),
    p90: Math.round(Math.max(finalP50 + 5, finalP90)),
    confidence,
    confidenceValue,
    confidenceReason,
  };
};

export const analyzeTimeOfDayPerformance = (history: Record<EnergyTag, CompletionRecord[]>): string[] => {
    const insights: string[] = [];
    const timesOfDay: TimeOfDay[] = ['morning', 'afternoon', 'evening'];
    const timeOfDayIcons = { morning: '☀️', afternoon: '🕶️', evening: '🌙' };

    for (const tag of Object.values(EnergyTag)) {
        const records = history[tag]?.filter(r => !r.isHyperfocus && r.estimatedDurationMinutes > 0) || [];
        if (records.length < 5) continue;

        const performanceByTime: { [key in TimeOfDay]?: { totalRatio: number; count: number } } = {};

        for (const record of records) {
            if (!performanceByTime[record.timeOfDay]) {
                performanceByTime[record.timeOfDay] = { totalRatio: 0, count: 0 };
            }
            const ratio = (record.actualDurationMinutes / record.difficulty) / record.estimatedDurationMinutes;
            performanceByTime[record.timeOfDay]!.totalRatio += ratio;
            performanceByTime[record.timeOfDay]!.count++;
        }

        const avgPerformances = timesOfDay
            .map(tod => {
                const data = performanceByTime[tod];
                if (data && data.count >= 3) {
                    return { timeOfDay: tod, avgRatio: data.totalRatio / data.count };
                }
                return null;
            })
            .filter((p): p is { timeOfDay: TimeOfDay; avgRatio: number } => p !== null);

        if (avgPerformances.length < 2) continue;

        const sortedPerformances = [...avgPerformances].sort((a, b) => a.avgRatio - b.avgRatio);
        const best = sortedPerformances[0];
        const worst = sortedPerformances[sortedPerformances.length - 1];

        if (worst.avgRatio > best.avgRatio * 1.10) {
            const improvement = Math.round(((worst.avgRatio - best.avgRatio) / worst.avgRatio) * 100);
            const insight = `${timeOfDayIcons[best.timeOfDay]} You tend to complete <strong>${tag}</strong> tasks about <strong>${improvement}% faster</strong> in the <strong>${best.timeOfDay}</strong>.`;
            insights.push(insight);
        }
    }

    return insights;
};

export const analyzeDayOfWeekPerformance = (history: Record<EnergyTag, CompletionRecord[]>): string[] => {
    const insights: string[] = [];
    const daysOfWeek = [ 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const dayOfWeekIndexes = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };

    for (const tag of Object.values(EnergyTag)) {
        const records = history[tag]?.filter(r => !r.isHyperfocus && r.estimatedDurationMinutes > 0) || [];
        if (records.length < 5) continue;

        const performanceByDay: { [key: number]: { totalRatio: number; count: number } } = {};

        for (const record of records) {
            if (!performanceByDay[record.dayOfWeek]) {
                performanceByDay[record.dayOfWeek] = { totalRatio: 0, count: 0 };
            }
            const ratio = (record.actualDurationMinutes / record.difficulty) / record.estimatedDurationMinutes;
            performanceByDay[record.dayOfWeek]!.totalRatio += ratio;
            performanceByDay[record.dayOfWeek]!.count++;
        }

        const avgPerformances = Object.entries(performanceByDay)
            .map(([dayIndex, data]) => {
                if (data.count >= 2) { // Lower threshold for days of week
                    return { day: parseInt(dayIndex), avgRatio: data.totalRatio / data.count };
                }
                return null;
            })
            .filter((p): p is { day: number; avgRatio: number } => p !== null);

        if (avgPerformances.length < 2) continue;

        const sortedPerformances = [...avgPerformances].sort((a, b) => a.avgRatio - b.avgRatio);
        const best = sortedPerformances[0];
        const worst = sortedPerformances[sortedPerformances.length - 1];

        if (worst.avgRatio > best.avgRatio * 1.10) {
            const improvement = Math.round(((worst.avgRatio - best.avgRatio) / worst.avgRatio) * 100);
            const bestDayName = daysOfWeek[best.day === 0 ? 6 : best.day -1]; // Adjust index for display
            const insight = `📊 On <strong>${bestDayName}s</strong>, you're about <strong>${improvement}% faster</strong> with <strong>${tag}</strong> tasks.`;
            insights.push(insight);
        }
    }

    return insights;
};
