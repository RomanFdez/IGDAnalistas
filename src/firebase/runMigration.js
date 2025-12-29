
import { readFile } from 'fs/promises';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, writeBatch } from 'firebase/firestore';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. Load Backup JSON
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUP_PATH = path.join(__dirname, '../../backup_2025-12-29.json');

// 2. Load Config manually (since it's a browser module usually)
// We need to parse src/firebase/config.js or just ask user to safeguard.
// BETTER: Import the config file if it was a module, but it uses export default which Node handles if type=module.
// Our package.json has "type": "module", so we can import directly!
import { default as firebaseApp, db } from './config.js';

const migrate = async () => {
    try {
        console.log('📖 Reading backup file...');
        const dataRaw = await readFile(BACKUP_PATH, 'utf-8');
        const backupData = JSON.parse(dataRaw);

        // Collections based on JSON keys
        const collections = {
            users: backupData.users || [],
            tasks: backupData.tasks || [],
            taskTypes: backupData.taskTypes || [],
            imputations: backupData.imputations || [],
            // weekLocks structure might differ, check JSON
            weekLocks: backupData.weekLocks || []
        };

        console.log('🚀 Starting Migration to Firestore...');

        for (const [colName, items] of Object.entries(collections)) {
            if (!Array.isArray(items) || items.length === 0) {
                console.log(`⚠️ Skipping ${colName} (empty or not array)`);
                continue;
            }

            console.log(`📦 Migrating ${colName}: ${items.length} items...`);
            let batch = writeBatch(db);
            let count = 0;
            let total = 0;

            for (const item of items) {
                // Determine Doc ID
                // Users have 'id' field (u-...)
                // Tasks have 'id' (uuid)
                // TaskTypes have 'id' (TRABAJADO)
                // Imputations have 'id' (uuid)
                // WeekLocks in Mongoose were array of objects? JSON check needed.

                let docId = item.id;

                // Special handling for WeekLocks if they don't have 'id' but 'weekId'
                if (colName === 'weekLocks' && !docId && item.weekId) {
                    docId = item.weekId;
                }

                // If still no ID, use Firestore auto-id (shouldn't happen for valid backup)
                const docRef = docId
                    ? doc(db, colName, String(docId))
                    : doc(collection(db, colName));

                // Clean data: remove _id, __v (Mongoose specific)
                const { _id, __v, ...cleanData } = item;

                batch.set(docRef, cleanData);

                count++;
                total++;

                // Commit batches of 400 (limit is 500)
                if (count >= 400) {
                    await batch.commit();
                    console.log(`   Processed ${total} items...`);
                    batch = writeBatch(db);
                    count = 0;
                }
            }

            if (count > 0) {
                await batch.commit();
            }
            console.log(`✅ Finished ${colName}: ${total} items.`);
        }

        console.log('🎉 Migration Complete Successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Migration Failed:', error);
        process.exit(1);
    }
};

migrate();
