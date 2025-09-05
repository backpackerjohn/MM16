import React, { useState, useMemo } from 'react';
import { SavedTask, SubStep, UndoAction } from '../types';
import TrashIcon from './icons/TrashIcon';

interface TaskPageProps {
  savedTasks: SavedTask[];
  setSavedTasks: React.Dispatch<React.SetStateAction<SavedTask[]>>;
  onResume: (task: SavedTask) => void;
  onUndo: (props: Omit<UndoAction, 'id'>) => void;
}

const TaskPage: React.FC<TaskPageProps> = ({ savedTasks, setSavedTasks, onResume, onUndo }) => {
  type SortOption = 'Most Recent' | 'Finish Line' | 'Unfinished Only';
  const [sortBy, setSortBy] = useState<SortOption>('Most Recent');
  const [editingTask, setEditingTask] = useState<{ id: string; note: string; nickname: string } | null>(null);

  const sortedTasks = useMemo(() => {
    let tasks = [...savedTasks];
    
    if (sortBy === 'Unfinished Only') {
      tasks = tasks.filter(t => t.progress.completedSubSteps < t.progress.totalSubSteps);
    }

    switch (sortBy) {
      case 'Most Recent':
        return tasks.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
      case 'Finish Line':
        return tasks.sort((a, b) => (a.nickname || a.mapData.finishLine.statement).localeCompare(b.nickname || b.mapData.finishLine.statement));
      default:
        return tasks;
    }
  }, [savedTasks, sortBy]);

  const handleDelete = (taskId: string) => {
    const taskToDelete = savedTasks.find(t => t.id === taskId);
    if (!taskToDelete) return;

    const originalTasks = [...savedTasks];
    setSavedTasks(tasks => tasks.filter(t => t.id !== taskId));
    
    onUndo({
        message: `Deleted "${taskToDelete.nickname || taskToDelete.mapData.finishLine.statement}"`,
        onUndo: () => {
            setSavedTasks(originalTasks);
        }
    });
  };
  
  const handleSaveEdit = () => {
    if (!editingTask) return;
    setSavedTasks(tasks => tasks.map(t => t.id === editingTask.id ? { ...t, note: editingTask.note, nickname: editingTask.nickname } : t));
    setEditingTask(null);
  };
  
  const handleResume = (task: SavedTask) => {
      const nextMove = findNextBestMove(task);
      // alert(`Resumed: ${task.nickname || task.mapData.finishLine.statement}. Next - ${nextMove ? nextMove.description : 'Final review!'}`);
      onResume(task);
  };

  const findNextBestMove = (task: SavedTask): SubStep | null => {
    for (const chunk of task.mapData.chunks) {
        if (!chunk.isComplete) {
            for (const subStep of chunk.subSteps) {
                if (!subStep.isComplete && !subStep.isBlocked) {
                    return subStep;
                }
            }
        }
    }
    return null;
  };

  const renderTaskCard = (task: SavedTask) => {
    const isEditing = editingTask?.id === task.id;
    const nextBestMove = findNextBestMove(task);
    const progressPercentage = task.progress.totalSubSteps > 0 ? (task.progress.completedSubSteps / task.progress.totalSubSteps) * 100 : 0;
    
    return (
      <div key={task.id} className="bg-[var(--color-surface)] p-6 rounded-xl shadow-sm border border-[var(--color-border)] flex flex-col transition-all duration-300 hover:shadow-md hover:border-[var(--color-border-hover)]">
        {isEditing ? (
            <div className="flex-1">
                <input
                    type="text"
                    value={editingTask.nickname}
                    onChange={(e) => setEditingTask({ ...editingTask, nickname: e.target.value })}
                    placeholder="Add a nickname..."
                    className="w-full text-xl font-bold text-[var(--color-text-primary)] border-b-2 border-dashed border-[var(--color-border-hover)] focus:border-[var(--color-primary-accent)] focus:outline-none pb-1 bg-transparent"
                />
                <textarea
                    value={editingTask.note}
                    onChange={(e) => setEditingTask({ ...editingTask, note: e.target.value })}
                    className="w-full mt-3 p-2 border border-[var(--color-border-hover)] rounded-md text-sm focus:ring-1 focus:ring-[var(--color-primary-accent)] focus:border-[var(--color-primary-accent)] bg-transparent"
                    autoFocus
                    rows={3}
                />
            </div>
        ) : (
            <div className="flex-1 cursor-pointer" onClick={() => handleResume(task)}>
                <h3 className="text-xl font-bold text-[var(--color-text-primary)] truncate" title={task.mapData.finishLine.statement}>
                    {task.nickname || task.mapData.finishLine.statement}
                </h3>
                {task.nickname && <p className="text-sm text-[var(--color-text-subtle)] truncate -mt-1">{task.mapData.finishLine.statement}</p>}

                {task.note && task.note !== 'No note added.' ? (
                    <p className="mt-2 text-[var(--color-text-secondary)] italic">"{task.note}"</p>
                ) : (
                    <p className="mt-2 text-[var(--color-text-subtle)] italic">No note added.</p>
                )}
                
                <div className="mt-4">
                    <div className="w-full bg-[var(--color-surface-sunken)] rounded-full h-2">
                        <div className="bg-[var(--color-success)] h-2 rounded-full" style={{ width: `${progressPercentage}%` }}></div>
                    </div>
                    <p className="text-xs text-[var(--color-text-subtle)] mt-1.5 font-medium">
                        <strong>{task.progress.completedChunks}</strong> of <strong>{task.progress.totalChunks}</strong> chunks &middot; <strong>{task.progress.completedSubSteps}</strong> of <strong>{task.progress.totalSubSteps}</strong> steps
                    </p>
                </div>
                
                <div className="mt-3">
                    <p className="text-sm text-[var(--color-text-primary)]">
                        <span className="font-semibold">Next:</span> {nextBestMove ? nextBestMove.description : 'All steps complete!'}
                    </p>
                </div>

                <p className="text-xs text-[var(--color-text-subtle)] mt-4">
                    Saved: {new Date(task.savedAt).toLocaleString()}
                </p>
            </div>
        )}
        
        <div className="mt-4 pt-4 border-t border-[var(--color-border)]/80 flex items-center gap-2">
            {isEditing ? (
                <>
                    <button onClick={() => setEditingTask(null)} className="px-4 py-2 text-sm font-bold text-[var(--color-text-secondary)] bg-[var(--color-surface-sunken)] hover:bg-[var(--color-border)] rounded-lg transition-all">Cancel</button>
                    <button onClick={handleSaveEdit} className="flex-1 px-4 py-2 text-sm font-semibold text-[var(--color-primary-accent-text)] bg-[var(--color-primary-accent)] hover:bg-[var(--color-primary-accent-hover)] rounded-lg transition-all">Save Changes</button>
                </>
            ) : (
                <>
                    <button onClick={(e) => { e.stopPropagation(); setEditingTask({ id: task.id, note: task.note, nickname: task.nickname || '' }); }} className="px-4 py-2 text-sm font-bold text-[var(--color-text-secondary)] bg-[var(--color-surface-sunken)] hover:bg-[var(--color-border)] rounded-lg transition-all">Edit</button>
                    <button onClick={(e) => { e.stopPropagation(); handleResume(task); }} className="flex-1 px-4 py-2 text-sm font-semibold text-[var(--color-primary-accent-text)] bg-[var(--color-primary-accent)] hover:bg-[var(--color-primary-accent-hover)] rounded-lg transition-all shadow-sm">Resume</button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }} className="p-2 text-[var(--color-text-subtle)] hover:text-[var(--color-danger)] hover:bg-red-100 rounded-full transition-colors" title="Delete Task">
                        <TrashIcon className="h-5 w-5" />
                    </button>
                </>
            )}
        </div>
      </div>
    );
  };

  return (
    <main className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-4xl font-bold text-[var(--color-text-primary)]">Saved Momentum Maps</h1>
          <p className="text-[var(--color-text-secondary)] mt-2 max-w-2xl">Resume a saved map, or review your progress.</p>
        </div>
        <div className="flex items-center space-x-2">
          <label htmlFor="sort-tasks" className="text-sm font-semibold text-[var(--color-text-secondary)]">Sort by:</label>
          <select
            id="sort-tasks"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="p-2 border border-[var(--color-border)] rounded-lg text-sm font-semibold focus:ring-2 focus:ring-[var(--color-primary-accent)] transition-shadow bg-transparent"
          >
            <option>Most Recent</option>
            <option>Finish Line</option>
            <option>Unfinished Only</option>
          </select>
        </div>
      </div>
      
      {sortedTasks.length > 0 ? (
        <div className="max-w-4xl mx-auto space-y-4">
          {sortedTasks.map(renderTaskCard)}
        </div>
      ) : (
        <div className="text-center py-20 bg-[var(--color-surface)] rounded-2xl shadow-sm border border-[var(--color-border)]">
          <h2 className="text-2xl font-semibold text-[var(--color-text-primary)]">No Saved Maps Yet</h2>
          <p className="text-[var(--color-text-secondary)] mt-2">Go to your Momentum Map and use the save button in the bottom-left to save a map for later.</p>
        </div>
      )}
    </main>
  );
};

export default TaskPage;