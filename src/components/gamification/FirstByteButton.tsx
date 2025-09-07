import React from 'react';
import { logEvent } from '../../gamification';
import { MXP } from '../../gamification/config';

type Props = { questId: string; parentGoalId?: string; onClick?: () => void };

export default function FirstByteButton({ questId, parentGoalId, onClick }: Props) {
  return (
    <button
      className="px-3 py-2 rounded-lg bg-[var(--color-primary-accent)] text-[var(--color-on-primary)]
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-accent)]
                 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
      onClick={() => {
        logEvent({ type:'quest_first_byte', questId, parentGoalId });
        onClick?.();
      }}
    >
      Start (First Byte)
    </button>
  );
}