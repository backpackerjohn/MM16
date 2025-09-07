import React, { useEffect, useMemo, useState } from 'react';
import { logEvent } from '../../gamification';
import { MXP } from '../../gamification/config';

type Props = {
  timerId: string;
  plannedSeconds: number;
  running: boolean;
  elapsedSeconds: number;
  onReflection?: () => void;
};

export default function TimerBossBar({ timerId, plannedSeconds, running, elapsedSeconds, onReflection }: Props) {
  const [milestoneAwarded, setMilestoneAwarded] = useState(false);
  const pct = Math.min(100, Math.round((elapsedSeconds / plannedSeconds) * 100));
  const maxMilestone = useMemo(() => Math.max(...MXP.TIMER_MILESTONES_AT), []);

  useEffect(() => {
    if (running && !milestoneAwarded && elapsedSeconds >= maxMilestone) {
      logEvent({ type:'timer_milestone', timerId, atSeconds: maxMilestone });
      setMilestoneAwarded(true);
    }
  }, [elapsedSeconds, milestoneAwarded, running, timerId, maxMilestone]);

  return (
    <div className="w-full">
      <div className="h-3 rounded-full bg-[var(--color-surface-variant)] overflow-hidden">
        <div
          className="h-3 bg-[var(--color-primary-accent)] transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}