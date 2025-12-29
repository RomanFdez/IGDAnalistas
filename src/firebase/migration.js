
export const migrateDataToFirebase = async (backupData, db) => {
    // backupData = { users, tasks, taskTypes, imputations, weekLocks }

    // NOTE: This assumes 'db' is the initialized Firestore instance.
    // Also, we need to handle batch writes because of rate limits/size, 
    // but for small datasets simple loops are okay.

    const { collection, doc, setDoc, writeBatch } = await import('firebase/firestore');

    const collections = {
        users: backupData.users || [],
        tasks: backupData.tasks || [],
        taskTypes: backupData.taskTypes || [],
        imputations: backupData.imputations || [],
        weekLocks: backupData.weekLocks || [] // Note: verify format. Backup returns array of doc objects.
    };

    console.log("Starting Migration...");

    for (const [colName, items] of Object.entries(collections)) {
        console.log(`Migrating ${colName}: ${items.length} items...`);
        let batch = writeBatch(db);
        let count = 0;

        for (const item of items) {
            // Use existing ID or _id as Doc ID
            const docId = item.id || item._id;
            if (!docId) {
                console.warn(`Skipping item in ${colName} without ID`, item);
                continue;
            }

            // Remove _id from data to avoid confusion (Firestore handles Doc ID separate)
            const { _id, ...data } = item;

            // For weekLocks, if it's the Map from API, we need to convert?
            // Wait, /api/backup returns the raw array from Mongoose.
            // Mongoose WeekLock: { weekId, isLocked, ... }
            // If item has weekId, use it as Doc ID ?
            const finalId = colName === 'weekLocks' ? item.weekId : docId;

            const ref = doc(db, colName, String(finalId));
            batch.set(ref, data);

            count++;
            if (count % 400 === 0) {
                await batch.commit();
                batch = writeBatch(db);
                console.log(`  Committed batch for ${colName}`);
            }
        }
        await batch.commit();
        console.log(`Finished ${colName}`);
    }
    console.log("Migration Complete!");
};
