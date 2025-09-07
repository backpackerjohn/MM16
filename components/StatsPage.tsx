import React, { useState, useMemo } from 'react';
import { loadEvents } from '../../utils/gamificationEventLogger';
import { 
    selectTodayWins, 
    selectRollingMXP,
    selectStreakSummary,
    selectTimerBehavior,
    selectBlockers
} from '../../utils/gamificationSelectors';
import { EventRecord } from '../../utils/gamificationTypes';

const StatCard: React.FC<{ title: string; value: string | number; subtext?: string; children?: React.ReactNode }> = ({ title, value, subtext, children }) => (
    <div className="bg-[var(--color-surface)] p-6 rounded-xl border border-[var(--color-border)] text-center content-card jade-mint">
        <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">{title}</h3>
        <p className="text-5xl font-extrabold text-[var(--color-text-primary)] mt-2">{value}</p>
        {subtext && <p className="text-sm text-[var(--color-text-subtle)] mt-1">{subtext}</p>}
        {children}
    </div>
);

const LineChart: React.FC<{ data: { day: string; total: number }[], label: string }> = ({ data, label }) => {
    const SVG_WIDTH = 550;
    const SVG_HEIGHT = 250;
    const PADDING = { top: 20, right: 20, bottom: 40, left: 40 };
    const chartWidth = SVG_WIDTH - PADDING.left - PADDING.right;
    const chartHeight = SVG_HEIGHT - PADDING.top - PADDING.bottom;

    const maxVal = Math.max(...data.map(d => d.total), 10); // Ensure a minimum height
    const getX = (index: number) => PADDING.left + (index / (data.length - 1)) * chartWidth;
    const getY = (value: number) => PADDING.top + chartHeight - (value / maxVal) * chartHeight;

    const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${getX(i)},${getY(d.total)}`).join(' ');
    const areaPath = `${path} L${getX(data.length - 1)},${getY(0)} L${getX(0)},${getY(0)} Z`;

    return (
        <div className="mt-4">
             <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="w-full h-auto">
                <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-primary-accent)" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="var(--color-primary-accent)" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path d={areaPath} fill="url(#areaGradient)" />
                <path d={path} fill="none" stroke="var(--color-primary-accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                {data.map((d, i) => (
                    <g key={i}>
                        <circle cx={getX(i)} cy={getY(d.total)} r="4" fill="var(--color-primary-accent)" />
                         <text x={getX(i)} y={SVG_HEIGHT - PADDING.bottom + 15} textAnchor="middle" fill="var(--color-text-subtle)" fontSize="10">
                            {new Date(d.day + 'T12:00:00Z').toLocaleDateString(undefined, { weekday: 'short' })}
                        </text>
                    </g>
                ))}
            </svg>
        </div>
    );
};


const StatsPage: React.FC = () => {
    const [events] = useState<EventRecord[]>(() => loadEvents());
    const [timeframe, setTimeframe] = useState<7 | 28>(7);

    const todayWins = useMemo(() => selectTodayWins(events), [events]);
    const rollingMxp = useMemo(() => selectRollingMXP(events, timeframe), [events, timeframe]);
    const streaks = useMemo(() => selectStreakSummary(events, timeframe), [events, timeframe]);
    const timerBehavior = useMemo(() => selectTimerBehavior(events, timeframe), [events, timeframe]);
    const blockers = useMemo(() => selectBlockers(events, timeframe), [events, timeframe]);

    const todayMxp = rollingMxp.find(d => d.day === new Date().toISOString().slice(0, 10))?.total || 0;

  return (
    <main className="container mx-auto p-8">
      <div className="flex justify-between items-start mb-6">
        <div>
            <div className="section-header-wrapper jade-mint">
                <h1 className="text-3xl font-bold">My Stats</h1>
            </div>
            <p className="text-[var(--color-text-secondary)] mt-2 max-w-2xl">Your personal productivity dashboard. See your patterns and celebrate your progress.</p>
        </div>
        <div className="flex items-center space-x-1 p-1 bg-[var(--color-surface-sunken)] rounded-lg">
            <button onClick={() => setTimeframe(7)} className={`px-3 py-1.5 text-sm font-bold rounded-md ${timeframe === 7 ? 'bg-[var(--color-surface)] shadow-sm text-[var(--color-primary-accent)]' : 'text-[var(--color-text-secondary)]'}`}>7 Days</button>
            <button onClick={() => setTimeframe(28)} className={`px-3 py-1.5 text-sm font-bold rounded-md ${timeframe === 28 ? 'bg-[var(--color-surface)] shadow-sm text-[var(--color-primary-accent)]' : 'text-[var(--color-text-secondary)]'}`}>28 Days</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Today's MXP" value={todayMxp} subtext="Momentum Points" />
        <StatCard title="Tasks Started" value={todayWins.firstBytes} subtext="First Byte Bonus" />
        <StatCard title="Milestones Hit" value={todayWins.milestones} subtext="In focus sessions" />
        <StatCard title="Early Blockers" value={todayWins.earlyBlockers} subtext="Spotted & logged" />
      </div>

      <div className="bg-[var(--color-surface)] p-6 rounded-xl border border-[var(--color-border)] mb-8">
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">MXP Trend</h2>
        <p className="text-[var(--color-text-secondary)] mb-2">Your Momentum Points earned over the last {timeframe} days.</p>
        <LineChart data={rollingMxp} label="MXP" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
              <div className="bg-[var(--color-surface)] p-6 rounded-xl border border-[var(--color-border)]">
                  <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">Top Streaks</h2>
                  {streaks.length > 0 ? (
                      <div className="space-y-3">
                          {streaks.slice(0, 5).map(s => (
                              <div key={s.anchorId} className="flex items-center justify-between">
                                  <span className="font-semibold text-[var(--color-text-secondary)] truncate pr-4">{s.anchorId.replace('onboard-work-', '')}</span>
                                  <span className="font-bold text-[var(--color-text-primary)]">🔥 {s.streak} days</span>
                              </div>
                          ))}
                      </div>
                  ) : <p className="text-[var(--color-text-subtle)]">Complete daily anchors to build streaks!</p>}
              </div>
              <div className="bg-[var(--color-surface)] p-6 rounded-xl border border-[var(--color-border)]">
                  <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">Common Blockers</h2>
                   {Object.keys(blockers).length > 0 ? (
                      <div className="space-y-3">
                          {Object.entries(blockers).sort(([,a],[,b]) => b-a).map(([type, count]) => (
                               <div key={type} className="flex items-center justify-between text-sm">
                                  <span className="font-semibold text-[var(--color-text-secondary)] capitalize">{type.replace('_', ' ')}</span>
                                  <span className="font-bold text-[var(--color-text-primary)]">{count}</span>
                              </div>
                          ))}
                      </div>
                  ) : <p className="text-[var(--color-text-subtle)]">No blockers logged recently.</p>}
              </div>
          </div>
          <div className="lg:col-span-2 bg-[var(--color-surface)] p-6 rounded-xl border border-[var(--color-border)]">
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">Focus Session Insights</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="bg-[var(--color-surface-sunken)] p-4 rounded-lg">
                    <h3 className="text-sm font-semibold text-[var(--color-text-secondary)]">Median Session</h3>
                    <p className="text-3xl font-bold text-[var(--color-text-primary)] mt-1">{timerBehavior.medianSession.toFixed(0)} <span className="text-lg">min</span></p>
                </div>
                 <div className="bg-[var(--color-surface-sunken)] p-4 rounded-lg">
                    <h3 className="text-sm font-semibold text-[var(--color-text-secondary)]">On-Time Stop Rate</h3>
                    <p className="text-3xl font-bold text-[var(--color-text-primary)] mt-1">{(todayWins.stopOnTimeRate * 100).toFixed(0)}<span className="text-lg">%</span></p>
                </div>
                 <div className="bg-[var(--color-surface-sunken)] p-4 rounded-lg">
                    <h3 className="text-sm font-semibold text-[var(--color-text-secondary)]">Milestone Hit Rate</h3>
                    <p className="text-3xl font-bold text-[var(--color-text-primary)] mt-1">{(timerBehavior.milestoneHitRate * 100).toFixed(0)}<span className="text-lg">%</span></p>
                </div>
            </div>
            <p className="text-xs text-[var(--color-text-subtle)] text-center mt-4">Metrics based on your focus timer usage in the last {timeframe} days.</p>
          </div>
      </div>
    </main>
  );
};

export default StatsPage;