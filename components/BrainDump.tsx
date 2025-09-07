import React, { useState, useMemo } from 'react';
import { BrainDumpItem, Note } from '../contracts';
import { Cluster, ClusterPlan, RefinementSuggestion, ClusterMove, Confirmation, Result } from '../types';
import TrashIcon from './icons/TrashIcon';
import { tagThemeTokens } from '../utils/styles';
import { refineBrainDumpItems, planBrainDumpClusters } from '../services/geminiService';
import { useData } from '../src/context/DataContext';

interface BrainDumpProps {
    handleProcess: (text: string) => Promise<Result<BrainDumpItem[]>>;
    error: string | null;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
    onConfirm: (props: Omit<Confirmation, 'isOpen'>) => void;
}

const BrainDump: React.FC<BrainDumpProps> = ({
    handleProcess: handleProcessProp,
    error,
    setError,
    onConfirm,
}) => {
    const { processedItems, setProcessedItems, notes, setNotes, clusters, setClusters } = useData();

    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isClustering, setIsClustering] = useState(false);
    
    const [suggestions, setSuggestions] = useState<ClusterPlan | null>(null);
    const [isSuggestionTrayOpen, setIsSuggestionTrayOpen] = useState(false);
    
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [view, setView] = useState<'list' | 'card'>('list');
    const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [currentNoteText, setCurrentNoteText] = useState('');
    const [currentNotePrivacy, setCurrentNotePrivacy] = useState(true);

    const handleProcess = async () => {
        if (!inputText.trim()) return;
        setIsLoading(true);
        const result = await handleProcessProp(inputText);
        if (result.ok) {
            setProcessedItems(prev => [...prev, ...result.data]);
            setInputText('');
            setClusters([]);
            setSelectedCluster(null);
        }
        // Error is set in the parent component via the Result type
        setIsLoading(false);
    };

    const handleCluster = async () => {
        if (processedItems.length === 0) return;
        setIsClustering(true);
        setError(null);

        try {
            const refinementsResult = await refineBrainDumpItems(processedItems, notes);
            
            // FIX: Explicitly check for the 'false' case to ensure correct type narrowing.
            if (refinementsResult.ok === false) {
                setError(refinementsResult.error);
                setIsClustering(false);
                return;
            }
            
            const planResult = await planBrainDumpClusters(processedItems, refinementsResult.data);
            
            // FIX: Explicitly check for the 'false' case to ensure correct type narrowing.
            if (planResult.ok === false) {
                setError(planResult.error);
                setIsClustering(false);
                return;
            }

            setSuggestions({ ...planResult.data, refinements: refinementsResult.data });
            setClusters(planResult.data.clusters);
            setIsSuggestionTrayOpen(true);
        } finally {
            setIsClustering(false);
        }
    };

    const handleDeleteSelected = () => {
        if (selectedItems.length === 0) return;
        onConfirm({
            title: `Delete ${selectedItems.length} item(s)?`,
            message: "This action cannot be undone. Are you sure you want to permanently delete the selected thoughts?",
            confirmText: "Yes, Delete",
            onConfirm: () => {
                setProcessedItems(p => p.filter(i => !selectedItems.includes(i.id)));
                setSelectedItems([]);
            }
        });
    };

    const handleSaveNote = (itemId: string) => {
        const newNote: Note = { text: currentNoteText, shareWithAI: currentNotePrivacy };
        setNotes(prev => ({ ...prev, [itemId]: newNote }));
        setEditingNoteId(null);
        setCurrentNoteText('');
    };

    const handleApplyAllSuggestions = () => {
        if (!suggestions) return;
        
        const updatedItems = processedItems.map(item => {
            const refinement = suggestions.refinements.find(r => r.itemId === item.id);
            if (refinement) {
                return {
                    ...item,
                    tags: refinement.proposedTags,
                    isUrgent: refinement.proposedUrgency === 'high',
                    blockers: refinement.blockers,
                    timeEstimateMinutesP50: refinement.timeEstimateMinutesP50,
                    timeEstimateMinutesP90: refinement.timeEstimateMinutesP90,
                };
            }
            return item;
        });

        setProcessedItems(updatedItems);
        setSuggestions(null);
        setIsSuggestionTrayOpen(false);
    };

    const handleToggleSelect = (id: string) => setSelectedItems(p => p.includes(id) ? p.filter(i => i !== id) : [...p, id]);
    const handleRemoveTag = (itemId: string, tagToRemove: string) => setProcessedItems(p => p.map(i => i.id === itemId ? { ...i, tags: i.tags.filter(t => t !== tagToRemove) } : i));
    const handleAddNewTag = (itemId: string, newTag: string) => {
        const fTag = newTag.charAt(0).toUpperCase() + newTag.slice(1);
        setProcessedItems(p => p.map(i => i.id === itemId && !i.tags.find(t => t.toLowerCase() === fTag.toLowerCase()) ? { ...i, tags: [...i.tags, fTag] } : i));
    };
    
    const getTagStyle = (tag: string): React.CSSProperties => {
        const key = Object.keys(tagThemeTokens).find(k => tag.toLowerCase().includes(k)) || 'default';
        return {
            backgroundColor: tagThemeTokens[key].bg,
            color: tagThemeTokens[key].text,
        };
    };


    const selectedClusterItems = useMemo(() => {
        if (!selectedCluster) return [];
        const itemMap = new Map(processedItems.map(item => [item.id, item]));
        return selectedCluster.itemIds.map(id => itemMap.get(id)).filter((i): i is BrainDumpItem => !!i);
    }, [selectedCluster, processedItems]);

    const renderItem = (item: BrainDumpItem) => {
        const isSelected = selectedItems.includes(item.id);
        const isEditingNote = editingNoteId === item.id;
        const note = notes[item.id];

        return (
            <div key={item.id} className={`content-card group relative bg-[var(--color-surface)] p-4 rounded-[var(--border-radius-lg)] transition-all duration-200 flex items-start space-x-4 ${isSelected ? 'shadow-md border-[var(--color-primary-accent)] ring-1 ring-[var(--color-primary-accent)]' : 'hover:shadow-md'}`}>
                <input type="checkbox" checked={isSelected} onChange={() => handleToggleSelect(item.id)} className="animated-checkbox mt-1" aria-label={`Select item: ${item.item}`}/>
                <div className="flex-1">
                    <p className="text-[var(--color-text-primary)]">{item.item}</p>
                    {note && !isEditingNote && <p className="mt-2 text-sm text-[var(--color-text-secondary)] bg-[var(--color-surface-sunken)] p-2 rounded-[var(--border-radius-md)] whitespace-pre-wrap">{note.text}</p>}
                    {isEditingNote && (
                         <div className="mt-2 space-y-2">
                             <textarea className="w-full p-2 border border-[var(--color-border)] rounded-[var(--border-radius-md)] text-sm focus:ring-1 focus:ring-[var(--color-primary-accent)] focus:border-[var(--color-primary-accent)] bg-transparent" placeholder="Add your note..." value={currentNoteText} onChange={(e) => setCurrentNoteText(e.target.value)} autoFocus rows={4}/>
                             <div className="flex justify-between items-center">
                                 <div className="flex items-center space-x-2">
                                     <input id="privacy-check" type="checkbox" checked={currentNotePrivacy} onChange={e => setCurrentNotePrivacy(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-[var(--color-primary-accent)] focus:ring-[var(--color-primary-accent)]" />
                                     <label htmlFor="privacy-check" className="text-xs text-[var(--color-text-subtle)]">Allow AI analysis</label>
                                 </div>
                                 <div className="flex space-x-2">
                                    <button onClick={() => setEditingNoteId(null)} className="px-3 py-1 text-sm font-semibold text-[var(--color-text-secondary)] bg-[var(--color-surface-sunken)] hover:bg-[var(--color-border)] rounded-[var(--border-radius-md)] transition-colors">Cancel</button>
                                    <button onClick={() => handleSaveNote(item.id)} className="px-3 py-1 text-sm font-semibold text-[var(--color-primary-accent-text)] bg-[var(--color-primary-accent)] hover:bg-[var(--color-primary-accent-hover)] rounded-[var(--border-radius-md)] transition-colors">Save</button>
                                 </div>
                             </div>
                         </div>
                    )}
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {item.tags.map(tag => (
                           <span key={tag} style={getTagStyle(tag)} className="group/tag relative px-2.5 py-0.5 text-xs font-semibold rounded-full flex items-center gap-1.5">
                               {tag} <button onClick={() => handleRemoveTag(item.id, tag)} className="opacity-0 group-hover/tag:opacity-100 text-stone-500 hover:text-stone-900 transition-opacity" title={`Remove tag: ${tag}`}>&times;</button>
                           </span>
                        ))}
                        <input type="text" placeholder="+ Add tag" onKeyDown={(e) => { if (e.key === 'Enter') { const v = e.currentTarget.value.trim(); if (v) { handleAddNewTag(item.id, v); e.currentTarget.value = ''; } } }} className="text-xs px-2 py-1 border border-dashed border-[var(--color-border)] rounded-[var(--border-radius-md)] w-24 focus:w-32 focus:ring-1 focus:ring-[var(--color-primary-accent)] focus:border-[var(--color-primary-accent)] transition-all bg-transparent"/>
                         {(item.timeEstimateMinutesP50 !== undefined && item.timeEstimateMinutesP90 !== undefined) && (
                            <div className="flex items-center space-x-1 text-xs text-[var(--color-text-subtle)] font-medium ml-auto pl-2" title="P50-P90 Time Estimate">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span>{item.timeEstimateMinutesP50}&ndash;{item.timeEstimateMinutesP90}m</span>
                            </div>
                         )}
                         {item.blockers && item.blockers.length > 0 && (
                            <div className="flex items-center space-x-1 text-xs text-red-600 font-medium ml-2" title={`Blockers: ${item.blockers.join(', ')}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" /></svg>
                                <span>{item.blockers.length}</span>
                            </div>
                         )}
                    </div>
                </div>
                <button onClick={() => { setEditingNoteId(isEditingNote ? null : item.id); setCurrentNoteText(note?.text || ''); setCurrentNotePrivacy(note?.shareWithAI ?? true); }} title="Add/Edit Note" className={`p-1 rounded-full transition-colors opacity-0 group-hover:opacity-100 ${isEditingNote ? 'bg-[var(--color-primary-accent)] text-white' : 'text-[var(--color-text-subtle)] hover:text-[var(--color-primary-accent)] hover:bg-[var(--color-surface-sunken)]'}`}><svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button>
            </div>
        )
    };
    
    const renderSuggestionTray = () => (
        <div className="fixed inset-y-0 right-0 w-full md:w-1/3 xl:w-1/4 bg-[var(--color-surface)] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out translate-x-0 border-l border-[var(--color-border)] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-[var(--color-surface-sunken)]">
                <h2 className="text-xl font-bold text-[var(--color-text-primary)]">AI Suggestions</h2>
                <button onClick={() => setIsSuggestionTrayOpen(false)} className="p-1 rounded-full hover:bg-[var(--color-border)]">&times;</button>
            </div>
            <div className="p-4 text-sm text-[var(--color-text-secondary)] italic">
                {suggestions?.summary}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {suggestions?.refinements.map(ref => {
                    const originalItem = processedItems.find(i => i.id === ref.itemId);
                    if (!originalItem) return null;
                    return (
                        <div key={ref.itemId} className="bg-[var(--color-surface-sunken)]/80 p-3 rounded-[var(--border-radius-lg)] border border-[var(--color-border)]">
                            <p className="font-semibold text-[var(--color-text-primary)] mb-1">{originalItem.item}</p>
                            <p className="text-xs text-[var(--color-text-subtle)] mb-2 italic">"{ref.rationale}" ({Math.round(ref.confidence * 100)}% confidence)</p>
                            <div className="text-xs space-y-1">
                                <p><strong>Time:</strong> {ref.timeEstimateMinutesP50}-{ref.timeEstimateMinutesP90}m</p>
                                <p><strong>Tags:</strong> {ref.proposedTags.join(', ')}</p>
                                {ref.blockers.length > 0 && <p><strong>Blockers:</strong> {ref.blockers.join(', ')}</p>}
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="p-4 border-t bg-[var(--color-surface)] space-y-2">
                 <button onClick={handleApplyAllSuggestions} className="w-full px-4 py-2 font-semibold text-[var(--color-primary-accent-text)] bg-[var(--color-primary-accent)] rounded-[var(--border-radius-md)] hover:bg-[var(--color-primary-accent-hover)] transition-all">Apply All Suggestions</button>
                 <button onClick={() => setIsSuggestionTrayOpen(false)} className="w-full px-4 py-2 font-semibold text-[var(--color-text-secondary)] bg-[var(--color-surface-sunken)] hover:bg-[var(--color-border)] rounded-[var(--border-radius-md)] transition-all">Dismiss</button>
            </div>
        </div>
    );

    return (
        <main className="container mx-auto p-8">
            <div className={`transition-all duration-300 ${isSuggestionTrayOpen ? 'max-w-4xl' : 'max-w-4xl mx-auto'}`}>
                <h1 className="text-4xl font-bold text-[var(--color-text-primary)] mb-6">Brain Dump</h1>
                <p className="text-[var(--color-text-secondary)] -mt-4 mb-6">Capture your thoughts, ideas, and tasks. The AI will intelligently split, categorize, and organize everything for you.</p>

                <div className="content-card bg-[var(--color-surface)] p-6 rounded-[var(--border-radius-xl)]">
                    <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Follow up with John about Q2 budget..." className="w-full h-48 p-4 bg-transparent border border-[var(--color-border-hover)] rounded-[var(--border-radius-md)] focus:ring-2 focus:ring-[var(--color-primary-accent)] transition-shadow resize-none" />
                    <div className="mt-4 flex justify-end">
                        <button onClick={handleProcess} disabled={isLoading} className="px-6 py-3 font-semibold text-[var(--color-primary-accent-text)] bg-[var(--color-primary-accent)] rounded-[var(--border-radius-md)] hover:bg-[var(--color-primary-accent-hover)] transition-all shadow-md disabled:bg-stone-400 flex items-center">
                            {isLoading ? 'Processing...' : 'Process Thoughts'}
                        </button>
                    </div>
                </div>

                {error && <div className="mt-6 p-4 bg-red-100 text-red-700 border rounded-lg">{error}</div>}
                
                {processedItems.length > 0 && (
                    <div className="mt-8">
                        <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                            <h2 className="text-3xl font-bold text-[var(--color-text-primary)]">Organized Thoughts</h2>
                            <div className="flex items-center space-x-2 p-1 bg-[var(--color-surface-sunken)] rounded-[var(--border-radius-md)]">
                                <button onClick={() => setView('list')} className={`px-3 py-1 text-sm font-semibold rounded-[var(--border-radius-sm)] ${view === 'list' ? 'bg-[var(--color-surface)] shadow-sm text-[var(--color-primary-accent)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'}`}>List</button>
                                <button onClick={() => { setView('card'); setSelectedCluster(null); }} className={`px-3 py-1 text-sm font-semibold rounded-[var(--border-radius-sm)] ${view === 'card' ? 'bg-[var(--color-surface)] shadow-sm text-[var(--color-primary-accent)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]'}`}>Card</button>
                                <button onClick={handleCluster} disabled={isClustering} className={`px-3 py-1 text-sm font-semibold rounded-[var(--border-radius-sm)] flex items-center text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]`}>
                                    {isClustering && <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle opacity="25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path opacity="75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                                    Cluster
                                </button>
                                {selectedItems.length > 0 && (
                                    <button onClick={handleDeleteSelected} className="px-3 py-1 text-sm font-semibold rounded-[var(--border-radius-sm)] flex items-center text-[var(--color-danger)] hover:bg-red-100 transition-colors">
                                        <TrashIcon className="h-4 w-4 mr-1.5" />
                                        Delete ({selectedItems.length})
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="space-y-3">
                            {view === 'list' && processedItems.map(item => renderItem(item))}
                            {view === 'card' && (
                                !selectedCluster ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                                        {clusters.map(cluster => (
                                            <div key={cluster.clusterName} onClick={() => setSelectedCluster(cluster)} className="content-card bg-[var(--color-surface)] p-6 rounded-[var(--border-radius-xl)] cursor-pointer transition-all hover:-translate-y-1">
                                                <h3 className="text-xl font-bold text-[var(--color-text-primary)] truncate mb-3">{cluster.clusterName}</h3>
                                                <div className="border-t my-4 inset-divider"></div>
                                                <div className="flex justify-between items-center text-[var(--color-text-secondary)]">
                                                    <span className="font-semibold text-sm">{cluster.itemIds.length} Thoughts</span>
                                                    <span className="font-semibold text-sm">{cluster.estimatedTime}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="pt-4">
                                        <button onClick={() => setSelectedCluster(null)} className="mb-4 flex items-center space-x-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-primary-accent)]">
                                            <span>&larr; Back to Clusters</span>
                                        </button>
                                        <h3 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">{selectedCluster.clusterName}</h3>
                                        <div className="space-y-3">{selectedClusterItems.map(item => renderItem(item))}</div>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                )}
            </div>
            {isSuggestionTrayOpen && suggestions && renderSuggestionTray()}
        </main>
    );
};

export default BrainDump;