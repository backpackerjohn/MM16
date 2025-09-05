import { db } from './firebase';
import { doc, writeBatch, setDoc, getDocs, collection } from 'firebase/firestore';

/**
 * Performs a batched write to Firestore to save multiple pieces of user data at once.
 * @param userId - The ID of the authenticated user.
 * @param dataToMigrate - An object where keys are the document IDs (matching localStorage keys)
 *                        and values are the data to be stored.
 */
export const batchWriteLocalData = async (userId: string, dataToMigrate: Record<string, any>) => {
    if (!db) throw new Error("Firestore is not initialized.");

    const batch = writeBatch(db);

    for (const key in dataToMigrate) {
        const value = dataToMigrate[key];
        if (value !== null && value !== undefined) {
            const docRef = doc(db, 'users', userId, 'appData', key);
            batch.set(docRef, { data: value });
        }
    }

    await batch.commit();
};

/**
 * Saves a single piece of application state to its own document in Firestore.
 * @param userId - The ID of the authenticated user.
 * @param docId - The key for the data, which will be the document ID.
 * @param data - The state data to save.
 */
export const saveDocument = async (userId: string, docId: string, data: any) => {
    if (!db || !userId) return;
    try {
        const docRef = doc(db, 'users', userId, 'appData', docId);
        // Using setDoc will create the document if it doesn't exist, or overwrite it if it does.
        await setDoc(docRef, { data });
    } catch (error) {
        console.error(`Error saving document ${docId}:`, error);
        // In a production app, you might want to add more robust error handling here.
    }
};

/**
 * Loads all application data for a given user from their 'appData' collection.
 * @param userId - The ID of the authenticated user.
 * @returns An object where keys are the document IDs and values are the corresponding data.
 */
export const loadAllData = async (userId: string): Promise<Record<string, any>> => {
    if (!db || !userId) return {};
    try {
        const appDataRef = collection(db, 'users', userId, 'appData');
        const querySnapshot = await getDocs(appDataRef);
        const allData: Record<string, any> = {};
        querySnapshot.forEach((doc) => {
            // Unpack the data from the 'data' field.
            allData[doc.id] = doc.data().data;
        });
        return allData;
    } catch (error) {
        console.error("Error loading all user data:", error);
        return {}; // Return an empty object on failure to prevent app crashes.
    }
};
