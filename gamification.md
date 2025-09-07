# Gamification System Documentation

This document outlines the Tier-1 gamification systems for the Momentum AI application. The goal is to provide positive reinforcement, create engaging feedback loops, and offer insights without introducing social pressure or shame-based mechanics.

## Changelog & Migration

-   **Version**: 1.0.0
-   **Date**: 2023-10-27
-   **Summary**: Initial release of the Tier-1 gamification system (MXP, Shields, Streaks).
-   **Migration Notes**:
    -   A new event log (`momentumMapEventLog:v1`) is created in `localStorage`. All gamification metrics start from zero.
    -   Existing tasks and goals do **not** grant retroactive points. The system is forward-looking only.
    -   A `quest_created` event will be backfilled for existing `SavedTask` items upon first load to ensure they can be tracked if resumed.
    -   The UI has been updated with new semantic color tokens and accessibility improvements (focus rings). A hard refresh may be required to clear any cached styles.

---

## 1. Event Schema

All gamification and statistical analysis are derived from a local, append-only event log. Events are designed to be small, immutable, and descriptive of a specific user action.

**Core Type (`EventRecord`):**

Each event includes a unique `eventId`, a `timestamp`, and an optional `energyTag` and `sessionId`.

**Event List:**

| Event Type                | Description                                                                                             | Payload                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `quest_created`           | A new sub-step/task has been created.                                                                   | `{ questId, parentGoalId? }`                                                                             |
| `quest_first_byte`        | The user has started the first piece of work on a quest.                                                | `{ questId, parentGoalId? }`                                                                             |
| `quest_completed`         | A quest has been marked as done.                                                                        | `{ questId, parentGoalId?, finishedWithin: 'P50'\|'P90'\|'AFTER' }`                                       |
| `split_performed`         | A larger chunk/goal was broken down into smaller quests.                                                | `{ parentGoalId, childIds[] }`                                                                           |
| `blocker_logged`          | The user has reported being stuck.                                                                      | `{ questId?, timerId?, blocker: 'too_big'\|..., early: boolean }`                                         |
| `timer_started`           | A focus timer session has begun.                                                                        | `{ timerId, plannedSeconds, questId? }`                                                                  |
| `timer_milestone`         | A significant duration milestone was reached in a single timer session.                                 | `{ timerId, atSeconds: 180\|600\|900 }`                                                                  |
| `timer_stopped_on_time`   | The user stopped the timer at or before the planned duration.                                           | `{ timerId, actualSeconds, plannedSeconds }`                                                             |
| `timer_resumed`           | A paused timer was resumed.                                                                             | `{ timerId }`                                                                                            |
| `anchor_completed`        | A daily anchor/ritual was completed.                                                                    | `{ anchorId, withinWindow: boolean, partial: boolean, graceUsed: boolean }`                              |
| `streak_updated`          | An anchor's completion status has affected its streak.                                                  | `{ anchorId, day, windowMet, partial, graceUsed }`                                                       |
| `celebration_shown`       | A visual celebration was triggered.                                                                     | `{ celebration: 'toast'\|'confetti'\|'none', reducedMotion: boolean }`                                  |

---

## 2. MXP (Momentum Experience Points) Economy

MXP is the core point system, awarded for positive, productive actions. It is designed to reward effort and consistency, not just raw output.

**MXP Awards Table:**

| Action                  | MXP Award                                   | Notes & Caps                                                                    |
| ----------------------- | ------------------------------------------- | ------------------------------------------------------------------------------- |
| **First Byte**          | +4 MXP                                      | Once per quest, per day.                                                        |
| **Quest Completion**    | +3 MXP (≤ P50) / +1 MXP (≤ P90)             |                                                                                 |
| **Split Cap**           | -                                           | Max **10 MXP** per day from a single parent goal (from all its children).       |
| **Timer Milestone**     | +2 MXP                                      | Once per timer session (at 3, 10, or 15 mins).                                  |
| **Stop Timer On Time**  | +2 MXP                                      | If timer stopped ≤ planned duration.                                            |
| **Early Blocker Log**   | +2 MXP                                      | If logged within 5 mins of starting a timer or before any work.                 |
| **Shield Grant**        | Grants 1 Shield                             | Capped at 1 Shield per day from early blocker logs.                             |

---

## 3. Shields & Compassionate Streaks

-   **Shields**: A resource to protect streaks. One Shield can be earned per day by logging a blocker early. It can be used to repair a missed anchor completion window for that same day, preserving the streak.
-   **Compassionate Streaks**: Streaks for daily anchors are designed to be flexible. They track completion within a defined window (e.g., before 12:00 PM) and can be maintained using a Shield if a day is missed.

---

## 4. Integration Guide

-   **Momentum Map**: The "Play" icon has been replaced with a "Start" button to initiate the "First Byte" and subsequent timer flow. Completion logic is hooked into the sub-step checkbox.
-   **Timers**: A new `TimerBar` component appears when a focus session is active. It gates rapid-restarts with a 10-second reflection interstitial.
-   **Blockers**: The "I'm stuck" modals now include blocker categories and automatically detect if the log is "early".
-   **Calendar**: Anchors for the current day now have a completion checkbox, which triggers all streak and shield logic.
-   **Stats Page**: The `StatsPage` component is now fully implemented, using selectors from `utils/gamificationSelectors.ts` to derive and display insights from the event log.
