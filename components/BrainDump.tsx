import React, { useState, useMemo, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { BrainDumpItem, Cluster, Note, ClusterPlan, RefinementSuggestion, ClusterMove, Confirmation } from '../types';
import TrashIcon from './icons/TrashIcon';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const refineItemsWithNotes = async (items: BrainDumpItem[], notes: Record<string, Note>): Promise<RefinementSuggestion[]> => {
    const schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                itemId: { type: Type.STRING },
                proposedTags: { type: Type.ARRAY, items: { type: Type.STRING } },
                proposedUrgency: { type: Type.STRING, enum: ['low', 'normal', 'high'] },
                blockers: { type: Type.ARRAY, items: { type: Type.STRING } },
                timeEstimateMinutesP50: { type: Type.NUMBER },
                timeEstimateMinutesP90: { type: Type.NUMBER },
                confidence: { type: Type.NUMBER },
                rationale: { type: Type.STRING },
                 createdAt: { type: Type.STRING }
            },
            required: ['itemId', 'proposedTags', 'proposedUrgency', 'blockers', 'timeEstimateMinutesP50', 'timeEstimateMinutesP90', 'confidence', 'rationale', 'createdAt']
        }
    };

    const itemsForPrompt = items.map(item => ({
        id: item.id,
        item: item.item,
        tags: item.tags,
        note: (notes[item.id] && notes[item.id].shareWithAI) ? notes[item.id].text : null
    }));

    const prompt = `
      You are an expert project manager. Analyze this list of tasks. For each task, provide refined metadata based on its description and any provided notes.
      - **Task Archetypes**: Identify the type of task (e.g., errand with travel, deep work, meeting, admin). This informs the time estimate.
      - **P50/P90 Time Estimates**: Provide a 50th percentile (P50, median) and 90th percentile (P90, pessimistic) time estimate in WHOLE MINUTES. P90 must be >= P50. A large gap between P50 and P90 indicates uncertainty or dependencies.
      - **Blockers**: Identify any dependencies or obstacles (e.g., "awaiting feedback", "requires travel").
      - **Confidence**: Rate your confidence in the analysis from 0.0 to 1.0.
      - **Rationale**: Provide a one-sentence justification for your suggestions.
      - **Urgency**: Classify as 'low', 'normal', or 'high'.
      - **CreatedAt**: Use the current ISO 8601 timestamp.
      - **Privacy**: A null note means the user did not consent to sharing it. Analyze based on the item text alone.

      Return a JSON array of suggestion objects, strictly following the schema.

      **Input Items:**
      ${JSON.stringify(itemsForPrompt)}
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });
        const jsonStr = response.text.trim();
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Error refining items:", error);
        throw new Error("The AI failed to refine the items.");
    }
};

const planCluster = async (items: BrainDumpItem[], refinements: RefinementSuggestion[]): Promise<{ moves: ClusterMove[]; summary: string; clusters: Cluster[] }> => {
    const itemMap = new Map(items.map(i => [i.id, i]));
    const itemsForClustering = refinements.map(ref => ({
        id: ref.itemId,
        item: itemMap.get(ref.itemId)?.item || '',
        refinedTags: ref.proposedTags,
        p90: ref.timeEstimateMinutesP90,
        blockers: ref.blockers,
    }));
    
    const schema = {
        type: Type.OBJECT,
        properties: {
            summary: { type: Type.STRING },
            clusters: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        clusterName: { type: Type.STRING },
                        itemIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                        estimatedTime: { type: Type.STRING }
                    },
                    required: ['clusterName', 'itemIds', 'estimatedTime']
                }
            }
        },
        required: ['summary', 'clusters']
    };

    const prompt = `
      Given this list of tasks and their refined metadata (tags, time estimates), your job is to organize them into logical clusters.
      1.  **Create Clusters**: Group items into clusters with descriptive names (e.g., "Q3 Marketing Plan", "Household Errands"). Every item must belong to one cluster.
      2.  **Estimate Cluster Time**: Sum the P90 estimates for all items in a cluster and provide a human-readable total time (e.g., "3 hours 30 minutes", "5 days").
      3.  **Write Summary**: Provide a brief, 1-2 sentence summary of the organizational changes.
      
      Return a single JSON object with "summary" and "clusters".

      **Input Data:**
      ${JSON.stringify(itemsForClustering)}
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema }
        });
        const jsonStr = response.text.trim();
        const result = JSON.parse(jsonStr);

        // For this version, we will create placeholder moves. A more advanced version would have the AI generate these directly.
        const moves: ClusterMove[] = []; 
        
        return { ...result, moves };
    } catch (error) {
        console.error("Error planning cluster:", error);
        throw new Error("The AI failed to plan the clusters.");
    }
};

const categoryColors: { [key: string]: string } = {
    'work': 'bg-blue-100 text-blue-800', 'personal': 'bg-green-100 text-green-800', 'ideas': 'bg-yellow-100 text-yellow-800', 'tasks': 'bg-purple-100 text-purple-800', 'urgent': 'bg-red-100 text-red-800', 'default': 'bg-stone-100 text-stone-800'
};

interface BrainDumpProps {
    processedItems: BrainDumpItem[];
    setProcessedItems: React.Dispatch<React.SetStateAction<BrainDumpItem[]>>;
    notes: Record<string, Note>;
    setNotes: React.Dispatch<React.SetStateAction<Record<string, Note>>>;
    clusters: Cluster[];
    setClusters: React.Dispatch<React.SetStateAction<Cluster[]>>;
    handleProcess: (text: string) => Promise<void>;
    error: string | null;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
    onConfirm: (props: Omit<Confirmation, 'isOpen'>) => void;
}

const BrainDump: React.FC<BrainDumpProps> = ({
    processedItems,
    setProcessedItems,
    notes,
    setNotes,
    clusters,
    setClusters,
    handleProcess: handleProcessProp,
    error,
    setError,
    onConfirm,
}) => {
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
        try {
            await handleProcessProp(inputText);
            setInputText('');
            setClusters([]);
            setSelectedCluster(null);
        } catch (e: any) {
            // Error is already set in the prop handler
        } finally {
            setIsLoading(false);
        }
    };

    const handleCluster = async () => {
        if (processedItems.length === 0) return;
        setIsClustering(true);
        setError(null);
        try {
            const refinements = await refineItemsWithNotes(processedItems, notes);
            const plan = await planCluster(processedItems, refinements);
            setSuggestions({ ...plan, refinements });
            setClusters(plan.clusters); // Update clusters for card view
            setIsSuggestionTrayOpen(true);
        } catch (e: any) { setError(e.message); } finally { setIsClustering(false); }
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
    const getTagColor = (tag: string) => categoryColors[Object.keys(categoryColors).find(k => tag.toLowerCase().includes(k))] || categoryColors['default'];

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
            <div key={item.id} className={`group relative bg-[var(--color-surface)] p-4 rounded-[var(--border-radius-lg)] shadow-sm border transition-all duration-200 flex items-start space-x-4 ${isSelected ? 'shadow-md border-[var(--color-primary-accent)]' : 'border-[var(--color-border)] hover:shadow-md'}`}>
                <input type="checkbox" checked={isSelected} onChange={() => handleToggleSelect(item.id)} className="mt-1 h-4 w-4 rounded border-gray-300 text-[var(--color-primary-accent)] focus:ring-[var(--color-primary-accent)]" aria-label={`Select item: ${item.item}`}/>
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
                           <span key={tag} className={`group/tag relative px-2.5 py-0.5 text-xs font-semibold rounded-full flex items-center gap-1.5 ${getTagColor(tag)}`}>
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
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002 2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" /></svg>
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
                <h1 className="text-4xl font-bold text-[var(--color-text-primary)] mb-2">Brain Dump</h1>
                <p className="text-[var(--color-text-secondary)] mb-6">Capture your thoughts, ideas, and tasks. The AI will intelligently split, categorize, and organize everything for you.</p>

                <div className="bg-[var(--color-surface)] p-6 rounded-[var(--border-radius-xl)] shadow-lg border border-[var(--color-border)]">
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
                                            <div key={cluster.clusterName} onClick={() => setSelectedCluster(cluster)} className="bg-[var(--color-surface)] p-6 rounded-[var(--border-radius-xl)] shadow-sm border border-[var(--color-border)] cursor-pointer transition-all hover:shadow-xl hover:border-[var(--color-primary-accent)] hover:-translate-y-1">
                                                <h3 className="text-xl font-bold text-[var(--color-text-primary)] truncate mb-3">{cluster.clusterName}</h3>
                                                <div className="border-t my-4 border-[var(--color-border)]"></div>
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
