import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BrainDumpItem, Note } from '../../contracts';
import { Cluster } from '../../types';
import { auth } from '../../utils/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { saveDocument, loadAllData } from '../../utils/dataService';

// Mock data from App.tsx as a fallback
const mockBrainDumpItems: BrainDumpItem[] = [
  {
    id: 'bd-mock-1',
    item: 'Draft Q3 marketing strategy document',
    tags: ['Work', 'Marketing', 'Q3 Planning', 'Urgent'],
    isUrgent: true,
    timeEstimateMinutesP50: 90,
    timeEstimateMinutesP90: 120,
    blockers: ['Awaiting final budget numbers'],
  },
  {
    id: 'bd-mock-2',
    item: 'Book dentist appointment for next month',
    tags: ['Personal', 'Health'],
    isUrgent: false,
    timeEstimateMinutesP50: 5,
    timeEstimateMinutesP90: 10,
    blockers: [],
  },
];

interface IDataContext {
    processedItems: BrainDumpItem[];
    setProcessedItems: React.Dispatch<React.SetStateAction<BrainDumpItem[]>>;
    notes: Record<string, Note>;
    setNotes: React.Dispatch<React.SetStateAction<Record<string, Note>>>;
    clusters: Cluster[];
    setClusters: React.Dispatch<React.SetStateAction<Cluster[]>>;
}

const DataContext = createContext<IDataContext | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // State management moved from App.tsx
    const [processedItems, setProcessedItems] = useState<BrainDumpItem[]>(() => { try { const i = localStorage.getItem('brainDumpItems'); return i ? JSON.parse(i) : mockBrainDumpItems; } catch { return mockBrainDumpItems; } });
    const [notes, setNotes] = useState<Record<string, Note>>(() => { try { const n = localStorage.getItem('brainDumpNotes'); return n ? JSON.parse(n) : {}; } catch { return {}; } });
    const [clusters, setClusters] = useState<Cluster[]>(() => { try { const c = localStorage.getItem('clustersData'); return c ? JSON.parse(c) : []; } catch { return []; } });

    // Auth and data loading state, local to this provider
    const [user, setUser] = useState<User | null>(null);
    const [isDataLoaded, setIsDataLoaded] = useState(false);

    // Effect to handle auth changes and load initial data from Firestore
    useEffect(() => {
        if (!auth) {
            setIsDataLoaded(true); // If firebase fails, we proceed with local data
            return;
        }
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                try {
                    const firestoreData = await loadAllData(currentUser.uid);
                    // This provider only cares about the data it manages
                    if (firestoreData.brainDumpItems) setProcessedItems(firestoreData.brainDumpItems);
                    if (firestoreData.brainDumpNotes) setNotes(firestoreData.brainDumpNotes);
                    if (firestoreData.clustersData) setClusters(firestoreData.clustersData);
                } catch (error) {
                    console.error("Failed to load Brain Dump data from Firestore:", error);
                } finally {
                    setIsDataLoaded(true);
                }
            } else {
                setIsDataLoaded(true); // No user, proceed with local/default data
            }
        });
        return () => unsubscribe();
    }, []);

    // Persistence effects moved from App.tsx
    useEffect(() => {
        if (isDataLoaded) {
            localStorage.setItem('brainDumpItems', JSON.stringify(processedItems));
            if (user) saveDocument(user.uid, 'brainDumpItems', processedItems);
        }
    }, [processedItems, user, isDataLoaded]);

    useEffect(() => {
        if (isDataLoaded) {
            localStorage.setItem('brainDumpNotes', JSON.stringify(notes));
            if (user) saveDocument(user.uid, 'brainDumpNotes', notes);
        }
    }, [notes, user, isDataLoaded]);

    useEffect(() => {
        if (isDataLoaded) {
            localStorage.setItem('clustersData', JSON.stringify(clusters));
            if (user) saveDocument(user.uid, 'clustersData', clusters);
        }
    }, [clusters, user, isDataLoaded]);

    const value = {
        processedItems,
        setProcessedItems,
        notes,
        setNotes,
        clusters,
        setClusters,
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = (): IDataContext => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};