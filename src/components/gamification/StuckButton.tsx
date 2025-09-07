import React from 'react';
import { canGrantShieldToday, logEvent } from '../../gamification';
import { MXP } from '../../gamification/config';

type Props = { questId?: string; timerId?: string; timerStartedAt?: number };

export default function StuckButton({ questId, timerId, timerStartedAt }: Props) {
  return (
    <button
      className="px-3 py-2 rounded-md border border-[var(--color-border)]
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-accent)]
                 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
      onClick={() => {
        const now = Date.now();
        const early =
          !timerStartedAt ||
          (now - (timerStartedAt || now)) / 1000 <= MXP.EARLY_BLOCKER_WINDOW_SEC;

        logEvent({ type:'blocker_logged', questId, timerId, blocker:'unclear', early });

        const day = new Date().toISOString().slice(0,10);
        if (early && canGrantShieldToday([], day)) {
          // Show toast: +MXP + Shield
        }
      }}
    >
      I’m stuck
    </button>
  );
}