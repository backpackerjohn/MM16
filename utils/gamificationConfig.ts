// src/gamification/config.ts
export const MXP = {
  FIRST_BYTE: 4,
  P50: 3,
  P90: 1,
  TIMER_MILESTONES: 2,
  STOP_ON_TIME: 2,
  EARLY_BLOCKER: 2,
  EARLY_BLOCKER_WINDOW_SEC: 300, // 5 minutes
  PARENT_GOAL_DAILY_CAP: 10,
  TIMER_MILESTONES_AT: [180, 600, 900] as const, // 3m, 10m, 15m
  SHIELDS_PER_DAY_CAP: 1,
};

export const FLAGS = {
  REFLECTION_GATE_SECONDS: 10,
  ENABLE_TIER1_GAMIFICATION: true,
};
