import { batchWriteLocalData } from './dataService';

// Defines the list of keys in localStorage that should be migrated to Firestore.
const MIGRATION_KEYS = [
    'brainDumpItems',
    'brainDumpNotes',
    'savedMomentumMaps',
    'activeMapData',
    'scheduleEvents',
    'smartReminders',
    'dndWindows',
    'pauseUntil',
    'onboardingPreview',
    'timeLearningSettings',
    'themeSettings',
    'clustersData'
];

/**
 * Checks if there is any data in localStorage that needs to be migrated.
 * @returns {boolean} - True if at least one of the migration keys exists, false otherwise.
 */
export const hasLocalData = (): boolean => {
    return MIGRATION_KEYS.some(key => localStorage.getItem(key) !== null);
};

/**
 * Reads all specified data from localStorage, prepares it, and writes it to Firestore in a single batch.
 * @param {string} userId - The ID of the authenticated user.
 */
export const migrateLocalToFirestore = async (userId: string) => {
    const dataToMigrate: Record<string, any> = {};

    for (const key of MIGRATION_KEYS) {
        try {
            const localDataString = localStorage.getItem(key);
            if (localDataString) {
                dataToMigrate[key] = JSON.parse(localDataString);
            }
        } catch (error) {
            console.error(`Error parsing localStorage key "${key}" during migration:`, error);
            // Continue the migration even if one key fails to parse.
        }
    }
    
    // Only perform a write if there is actually data to migrate.
    if (Object.keys(dataToMigrate).length > 0) {
        await batchWriteLocalData(userId, dataToMigrate);
    }
};