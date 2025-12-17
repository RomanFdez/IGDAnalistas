import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Models
import User from './models/User.js';
import Task from './models/Task.js';
import TaskType from './models/TaskType.js';
import Imputation from './models/Imputation.js';
import WeekLock from './models/WeekLock.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://igdapp:Castellae1259@192.168.1.63/igdanalistas?authSource=admin';

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB at', MONGO_URI))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Models imported at top

// --- Routes ---

// 1. Auth & Users
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        // Simple plain-text password check (as per existing logic, migration to bcrypt later)
        // Adjust query to match how we store users (by name or separate username field? Schema says 'name', assuming unique names or IDs)
        // Current frontend sends 'username' which matches 'name' in our seed data.
        const user = await User.findOne({ name: username, password: password });
        if (user) {
            res.json(user);
        } else {
            res.status(401).json({ message: 'Credenciales inválidas' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({});
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const newUser = new User(req.body);
        await newUser.save();
        res.status(201).json(newUser);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/users/:id', async (req, res) => {
    try {
        // Update by ID (custom string ID)
        const updatedUser = await User.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
        res.json(updatedUser);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Initial Data Sync
app.get('/api/initial-data', async (req, res) => {
    try {
        const [taskTypes, tasks, imputations, weekLocks] = await Promise.all([
            TaskType.find({}),
            Task.find({}),
            Imputation.find({}),
            WeekLock.find({})
        ]);

        // Transform weekLocks array to object { weekId: true }
        const locksMap = weekLocks.reduce((acc, lock) => {
            if (lock.isLocked) acc[lock.weekId] = true;
            return acc;
        }, {});

        res.json({ taskTypes, tasks, imputations, weekLocks: locksMap });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Task Types
app.post('/api/task-types', async (req, res) => {
    try {
        const newItem = new TaskType(req.body);
        await newItem.save();
        res.status(201).json(newItem);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/task-types/:id', async (req, res) => {
    try {
        console.log(`[PUT TaskType] Updating ${req.params.id} with:`, req.body);
        const updated = await TaskType.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
        console.log(`[PUT TaskType] Result:`, updated);
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/task-types/:id', async (req, res) => {
    try {
        // Check usage before delete
        const used = await Imputation.exists({ type: req.params.id });
        if (used) {
            return res.status(400).json({ message: 'No se puede eliminar: tipo en uso.' });
        }
        await TaskType.deleteOne({ id: req.params.id });
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Tasks
app.post('/api/tasks', async (req, res) => {
    try {
        const newItem = new Task(req.body);
        await newItem.save();
        res.status(201).json(newItem);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/tasks/:id', async (req, res) => {
    try {
        const updated = await Task.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/tasks/:id', async (req, res) => {
    try {
        await Task.deleteOne({ id: req.params.id });
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Imputations
app.post('/api/imputations', async (req, res) => {
    // Upsert logic: if ID exists, update, else create
    try {
        const { id } = req.body;
        const existing = await Imputation.findOne({ id });
        if (existing) {
            const updated = await Imputation.findOneAndUpdate({ id }, req.body, { new: true });
            res.json(updated);
        } else {
            const newItem = new Imputation(req.body);
            await newItem.save();
            res.status(201).json(newItem);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/imputations/:id', async (req, res) => {
    try {
        await Imputation.deleteOne({ id: req.params.id });
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. Week Locks
app.post('/api/locks', async (req, res) => {
    try {
        const { weekId, isLocked } = req.body;
        // Upsert
        const updated = await WeekLock.findOneAndUpdate(
            { weekId },
            { isLocked },
            { upsert: true, new: true }
        );
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Seeding ---
const seedGlobalTasks = async () => {
    try {
        const structuralTask = await Task.findOne({ code: 'Estructural' });
        if (!structuralTask) {
            const newTask = new Task({
                id: 'estructural-global', // Fixed ID
                code: 'Estructural',
                name: 'No Imputable',
                description: 'Tarea estructural para imputaciones generales.',
                isGlobal: true,
                active: true,
                permanent: true,
                utes: 0
            });
            await newTask.save();
            console.log('✅ Seeded Global Task: Estructural');
        } else {
            // Ensure it is global if it exists (legacy fix)
            if (!structuralTask.isGlobal) {
                structuralTask.isGlobal = true;
                await structuralTask.save();
                console.log('🔄 Updated Estructural Task to be Global');
            }
        }
    } catch (err) {
        console.error('❌ Error seeding global tasks:', err);
    }
};

const seedTaskTypes = async () => {
    try {
        // Migration: Ensure all TaskTypes have 'computesInWeek'
        const result = await TaskType.updateMany(
            { computesInWeek: { $exists: false } }, // If missing
            { $set: { computesInWeek: true } } // Default to true (safe fallback for existing worked/jira types)
        );
        // Also force specific structural types to false if this is first run? 
        // Logic: The user wants flexibility. We defaulting to TRUE means all existing types (Worked, Jira) count.
        // We might want to set specific structural ones to true/false based on user preference, but for now defaulting to true is safer than false.

        if (result.modifiedCount > 0) {
            console.log(`✅ Migrated ${result.modifiedCount} TaskTypes to include 'computesInWeek'`);
        }

        // Migration: Ensure all TaskTypes have 'subtractsFromBudget'
        const result2 = await TaskType.updateMany(
            { subtractsFromBudget: { $exists: false } },
            { $set: { subtractsFromBudget: true } }
        );

        if (result2.modifiedCount > 0) {
            console.log(`✅ Migrated ${result2.modifiedCount} TaskTypes to include 'subtractsFromBudget'`);
        }
    } catch (err) {
        console.error('❌ Error migrating TaskTypes:', err);
    }
}

const seedUsers = async () => {
    try {
        let adminUser = await User.findOne({ name: 'Admin' });
        if (!adminUser) {
            const newUser = new User({
                id: 'admin-user',
                name: 'Admin',
                password: 'admin',
                roles: ['APPROVER'],
                maxHours: 40
            });
            await newUser.save();
            console.log('✅ Seeded Default Admin User');
        } else {
            // Update existing Admin if roles are missing (fix for deployment)
            if (!adminUser.roles || !adminUser.roles.includes('APPROVER')) {
                adminUser.roles = ['APPROVER'];
                await adminUser.save();
                console.log('🔄 Updated Admin User roles to APPROVER');
            }
        }
    } catch (err) {
        console.error('❌ Error seeding users:', err);
    }
}

// Serve Static Assets in Production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../dist')));

    app.get(/.*/, (req, res) => {
        res.sendFile(path.resolve(__dirname, '../dist', 'index.html'));
    });
}

// Start Server
app.listen(PORT, async () => {
    await seedGlobalTasks();
    // Commented out to prevent potential conflicts if this was unintended (though it seems safe as it is migration only)
    // await seedTaskTypes(); 
    // Re-enabling because it handles migration of new fields.
    await seedTaskTypes();
    await seedUsers();
    console.log(`🚀 Server running on port ${PORT}`);
});
