import React, { useMemo } from 'react';
import { TimeLearningSettings, CompletionRecord, EnergyTag, Confirmation } from '../types';
import { resetCompletionHistory, analyzeTimeOfDayPerformance, analyzeDayOfWeekPerformance } from '../utils/timeAnalytics';

const AccuracyChart: React.FC<{ data: { label: string; avgDeviation: number }[] }> = ({ data }) => {
    if (data.length < 2) return null;

    const SVG_WIDTH = 550;
    const SVG_HEIGHT = 300;
    const PADDING = { top: 20, right: 30, bottom: 40, left: 50 };
    const chartWidth = SVG_WIDTH - PADDING.left - PADDING.right;
    const chartHeight = SVG_HEIGHT - PADDING.top - PADDING.bottom;

    const maxDev = Math.max(...data.map(d => d.avgDeviation));
    const minDev = 0;

    const getX = (index: number) => PADDING.left + (index / (data.length - 1)) * chartWidth;
    const getY = (value: number) => PADDING.top + chartHeight - ((value - minDev) / (maxDev - minDev)) * chartHeight;

    const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${getX(i)},${getY(d.avgDeviation)}`).join(' ');

    return (
        <div className="mt-4">
            <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="w-full h-auto">
                {/* Y-axis grid lines and labels */}
                {Array.from({ length: 5 }).map((_, i) => {
                    const y = PADDING.top + (i / 4) * chartHeight;
                    const value = maxDev - (i / 4) * (maxDev - minDev);
                    return (
                        <g key={i}>
                            <line x1={PADDING.left} y1={y} x2={PADDING.left + chartWidth} y2={y} stroke="var(--color-border)" strokeWidth="1" />
                            <text x={PADDING.left - 8} y={y + 4} textAnchor="end" fill="var(--color-text-subtle)" fontSize="10">
                                {Math.round(value)}m
                            </text>
                        </g>
                    );
                })}
                <line x1={PADDING.left} y1={PADDING.top} x2={PADDING.left} y2={PADDING.top + chartHeight} stroke="var(--color-border)" strokeWidth="1"/>

                {/* X-axis labels */}
                {data.map((d, i) => (
                    <text key={i} x={getX(i)} y={SVG_HEIGHT - PADDING.bottom + 15} textAnchor="middle" fill="var(--color-text-subtle)" fontSize="10">
                        {d.label}
                    </text>
                ))}

                {/* Line and Points */}
                <path d={path} fill="none" stroke="var(--color-primary-accent)" strokeWidth="2" />
                {data.map((d, i) => (
                    <circle key={i} cx={getX(i)} cy={getY(d.avgDeviation)} r="4" fill="var(--color-primary-accent)" />
                ))}
                 <text x={PADDING.left + chartWidth / 2} y={SVG_HEIGHT - 5} textAnchor="middle" fill="var(--color-text-subtle)" fontSize="12" fontWeight="medium">
                    Task Buckets
                </text>
            </svg>
        </div>
    );
};

interface Props {
    settings: TimeLearningSettings;
    setSettings: React.Dispatch<React.SetStateAction<TimeLearningSettings>>;
    completionHistory: Record<EnergyTag, CompletionRecord[]>;
    setCompletionHistory: React.Dispatch<React.SetStateAction<Record<EnergyTag, CompletionRecord[]>>>;
    onConfirm: (props: Omit<Confirmation, 'isOpen'>) => void;
}

const TimeLearningSettingsPage: React.FC<Props> = ({ settings, setSettings, completionHistory, setCompletionHistory, onConfirm }) => {
    
    const handleReset = () => {
        onConfirm({
            title: 'Reset All Learning Data?',
            message: 'This action is irreversible. All personalized time estimation history will be permanently deleted.',
            confirmText: 'Yes, Delete Everything',
            onConfirm: () => {
                resetCompletionHistory();
                setCompletionHistory(Object.values(EnergyTag).reduce((acc, tag) => ({ ...acc, [tag]: [] }), {} as Record<EnergyTag, CompletionRecord[]>));
            }
        });
    };

    const handleExport = () => {
        const dataStr = JSON.stringify(completionHistory, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'momentum-map-history.json';
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    };

    const { stats, chartData } = useMemo(() => {
        const allRecords = Object.values(completionHistory).flat();
        if (allRecords.length < 3) return { stats: null, chartData: [] };

        const totalOriginalDeviation = allRecords.reduce((sum, rec) => sum + Math.abs(rec.estimatedDurationMinutes - rec.actualDurationMinutes), 0);
        const avgOriginalDeviation = totalOriginalDeviation / allRecords.length;
        
        const stats = {
            avgOriginalDeviation: avgOriginalDeviation.toFixed(1),
            totalRecords: allRecords.length
        };

        const sortedRecords = [...allRecords].sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime());
        const BUCKET_SIZE = 5;
        if (sortedRecords.length < BUCKET_SIZE * 2) return { stats, chartData: [] };

        const buckets = [];
        for (let i = 0; i < sortedRecords.length; i += BUCKET_SIZE) {
            if(sortedRecords.slice(i, i + BUCKET_SIZE).length === BUCKET_SIZE) {
                 buckets.push(sortedRecords.slice(i, i + BUCKET_SIZE));
            }
        }
        
        const chartData = buckets.map((bucket, index) => {
            const totalDeviation = bucket.reduce((sum, rec) => sum + Math.abs(rec.estimatedDurationMinutes - rec.actualDurationMinutes), 0);
            return {
                label: `Tasks ${index * BUCKET_SIZE + 1}-${(index + 1) * BUCKET_SIZE}`,
                avgDeviation: totalDeviation / bucket.length,
            };
        });

        return { stats, chartData };
    }, [completionHistory]);

    const improvement = useMemo(() => {
        if (chartData.length < 2) return null;
        const first = chartData[0].avgDeviation;
        const last = chartData[chartData.length - 1].avgDeviation;
        if (first <= 0) return null;
        const change = ((first - last) / first) * 100;
        return {
            value: Math.round(change),
            isImprovement: change > 0,
        };
    }, [chartData]);

    const timeOfDayInsights = useMemo(() => {
        return analyzeTimeOfDayPerformance(completionHistory);
    }, [completionHistory]);

    const weeklyInsights = useMemo(() => {
        return analyzeDayOfWeekPerformance(completionHistory);
    }, [completionHistory]);

    return (
        <main className="container mx-auto p-8 max-w-2xl">
            <h1 className="text-4xl font-bold text-[var(--color-text-primary)] mb-2">Time Learning Settings</h1>
            <p className="text-[var(--color-text-secondary)] mb-8">Manage how Momentum Map learns from your work patterns to personalize your time estimates.</p>
            
            <div className="space-y-6">
                <div className="bg-[var(--color-surface)] p-6 rounded-2xl shadow-sm border">
                    <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">General</h2>
                    <div className="flex justify-between items-center">
                        <label htmlFor="enable-learning" className="font-semibold text-[var(--color-text-secondary)]">Enable Personalized Estimates</label>
                        <input type="checkbox" id="enable-learning" checked={settings.isEnabled} onChange={e => setSettings(s => ({ ...s, isEnabled: e.target.checked }))} className="h-6 w-11 appearance-none rounded-full bg-stone-300 checked:bg-[var(--color-success)] transition-colors duration-200 ease-in-out relative cursor-pointer before:content-[''] before:h-5 before:w-5 before:rounded-full before:bg-white before:absolute before:top-0.5 before:left-0.5 before:transition-transform before:duration-200 before:ease-in-out checked:before:translate-x-5" />
                    </div>
                </div>

                <div className={`bg-[var(--color-surface)] p-6 rounded-2xl shadow-sm border transition-opacity ${!settings.isEnabled ? 'opacity-50' : ''}`}>
                    <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">Configuration</h2>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="sensitivity" className="font-semibold text-[var(--color-text-secondary)]">Learning Sensitivity</label>
                            <p className="text-sm text-[var(--color-text-subtle)] mb-2">How much weight to give your most recent tasks. Higher is more reactive.</p>
                            <input type="range" id="sensitivity" min="0.1" max="0.9" step="0.1" value={settings.sensitivity} onChange={e => setSettings(s => ({ ...s, sensitivity: parseFloat(e.target.value) }))} disabled={!settings.isEnabled} className="w-full" />
                        </div>
                    </div>
                </div>

                <div className="bg-[var(--color-surface)] p-6 rounded-2xl shadow-sm border">
                    <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">Performance Dashboard</h2>
                    {stats ? (
                        <div className="text-center">
                             <p className="text-[var(--color-text-secondary)]">Based on <span className="font-bold text-[var(--color-text-primary)]">{stats.totalRecords}</span> completed chunks, your original estimates were off by an average of <span className="font-bold text-[var(--color-text-primary)]">{stats.avgOriginalDeviation} minutes</span>. The system is learning to reduce this gap.</p>
                             
                             <h3 className="text-lg font-bold text-[var(--color-text-primary)] mt-6 mb-2">Accuracy Over Time</h3>
                             <p className="text-sm text-[var(--color-text-secondary)] mb-4">This chart shows the average difference between your estimated and actual times, grouped in buckets of 5 tasks. A downward trend means your planning is getting more accurate!</p>
                             
                             {chartData.length > 0 ? (
                                <>
                                    <AccuracyChart data={chartData} />
                                    {improvement && (
                                        <div className="mt-4 p-3 bg-green-50 text-green-800 rounded-lg">
                                            <p className="font-semibold">
                                                {improvement.isImprovement 
                                                    ? `Fantastic! Your accuracy has improved by ${improvement.value}%. You're getting much better at estimating your work.`
                                                    : `Keep going! Your accuracy has changed by ${improvement.value}%. The system is still learning your rhythms.`
                                                }
                                            </p>
                                        </div>
                                    )}
                                </>
                             ) : (
                                <p className="text-[var(--color-text-secondary)] italic mt-4">Complete at least 10 tasks to see your accuracy trend chart.</p>
                             )}
                        </div>
                    ) : (
                        <p className="text-[var(--color-text-secondary)] text-center">Complete a few more chunks to see your performance data here.</p>
                    )}
                </div>
                
                {timeOfDayInsights.length > 0 && (
                     <div className="bg-[var(--color-surface)] p-6 rounded-2xl shadow-sm border">
                        <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">Your Productivity Peaks</h2>
                        <p className="text-sm text-[var(--color-text-secondary)] mb-4">Based on your history, here are some patterns we've noticed. Consider scheduling tasks during your peak times!</p>
                        <div className="space-y-3">
                            {timeOfDayInsights.map((insight, index) => (
                                <div key={index} className="p-3 bg-[var(--color-surface-sunken)] text-[var(--color-text-secondary)] rounded-lg text-sm flex items-start gap-3" >
                                    <span className="text-lg mt-0.5">{insight.split(' ')[0]}</span>
                                    <span dangerouslySetInnerHTML={{ __html: insight.substring(insight.indexOf(' ') + 1) }} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {weeklyInsights.length > 0 && (
                     <div className="bg-[var(--color-surface)] p-6 rounded-2xl shadow-sm border">
                        <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">Your Weekly Rhythm</h2>
                        <p className="text-sm text-[var(--color-text-secondary)] mb-4">Here's how your performance varies throughout the week.</p>
                        <div className="space-y-3">
                            {weeklyInsights.map((insight, index) => (
                                <div key={index} className="p-3 bg-[var(--color-surface-sunken)] text-[var(--color-text-secondary)] rounded-lg text-sm flex items-start gap-3" >
                                    <span className="text-lg mt-0.5">{insight.split(' ')[0]}</span>
                                    <span dangerouslySetInnerHTML={{ __html: insight.substring(insight.indexOf(' ') + 1) }} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="bg-[var(--color-surface)] p-6 rounded-2xl shadow-sm border">
                    <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">Data Management</h2>
                    <div className="flex justify-between items-center gap-4">
                        <button onClick={handleExport} className="flex-1 px-4 py-2 font-semibold text-[var(--color-text-secondary)] bg-[var(--color-surface-sunken)] hover:bg-[var(--color-border)] rounded-lg">Export My Data</button>
                        <button onClick={handleReset} className="flex-1 px-4 py-2 font-semibold text-[var(--color-danger-text)] bg-[var(--color-danger)] hover:bg-[var(--color-danger-hover)] rounded-lg">Reset Learning Data</button>
                    </div>
                </div>
            </div>
        </main>
    );
};
export default TimeLearningSettingsPage;