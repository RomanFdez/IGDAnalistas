import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './FirebaseAuthContext'; // Note: Must match the provider being used
import {
    collection,
    addDoc,
    setDoc,
    doc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
    where
} from 'firebase/firestore';
import { db } from '../firebase/config';

const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
    const { user } = useAuth();

    const [tasks, setTasks] = useState([]);
    const [imputations, setImputations] = useState([]);
    const [weekLocks, setWeekLocks] = useState({});
    const [taskTypes, setTaskTypes] = useState([]);

    // Real-time Listeners
    useEffect(() => {
        if (!user) return;

        // 1. Tasks Listener
        // TODO: Optimize query if dataset is huge. For now, get all tasks.
        const tasksQ = query(collection(db, 'tasks'));
        const unsubTasks = onSnapshot(tasksQ, (snapshot) => {
            const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
            setTasks(list);
        });

        // 2. Task Types Listener
        const typesQ = query(collection(db, 'taskTypes'));
        const unsubTypes = onSnapshot(typesQ, (snapshot) => {
            const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
            setTaskTypes(list);
        });

        // 3. Imputations Listener
        // Might want to filter by date or user?
        const impsQ = query(collection(db, 'imputations'));
        const unsubImps = onSnapshot(impsQ, (snapshot) => {
            const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
            setImputations(list);
        });

        // 4. Week Locks
        const locksQ = query(collection(db, 'weekLocks'));
        const unsubLocks = onSnapshot(locksQ, (snapshot) => {
            const locksMap = {};
            snapshot.docs.forEach(d => {
                if (d.data().isLocked) locksMap[d.id] = true;
            });
            setWeekLocks(locksMap);
        });

        return () => {
            unsubTasks();
            unsubTypes();
            unsubImps();
            unsubLocks();
        };
    }, [user]);

    // --- ACTIONS ---

    const addTask = async (newTask) => {
        // Remove ID if present to let Firestore auto-gen, or use it as doc ID?
        // Current app uses UUIDs. We can use them as Doc IDs.
        const id = newTask.id || doc(collection(db, 'tasks')).id;
        const taskWithId = { ...newTask, id, active: true, assignedUserIds: [user.uid || user.id] }; // user.uid from Firebase

        await setDoc(doc(db, 'tasks', id), taskWithId);
        return taskWithId;
    };

    const updateTask = async (taskId, updates) => {
        await updateDoc(doc(db, 'tasks', taskId), updates);
    };

    const deleteTask = async (taskId) => {
        await deleteDoc(doc(db, 'tasks', taskId));
    };

    const updateTaskAssignee = async (taskId, userId) => {
        // We need to read the current task to know array? 
        // Or use arrayUnion. 
        // For now, simple read-modify-write via updates handled by component logic calling updateTask?
        // But here we had a specific method.
        // Let's rely on the optimistic update logic or just fetch? 
        // Firestore updateDoc can't toggle easily without knowing current state unless we use arrayUnion.

        // Simpler: Read, Check, Write.
        // Note: The listener will update the UI.
        const taskRef = doc(db, 'tasks', taskId);
        // We can't do the "read" here easily without async.
        // But we have `tasks` state!
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const currentAssignees = task.assignedUserIds || [];
        if (!currentAssignees.includes(userId)) {
            const newAssignees = [...currentAssignees, userId];
            await updateDoc(taskRef, { assignedUserIds: newAssignees });
        }
    };

    const toggleTaskStatus = async (taskId) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        await updateDoc(doc(db, 'tasks', taskId), { active: !task.active });
    };

    const addOrUpdateImputation = async (imputation) => {
        // Use ID as doc key
        const id = imputation.id || doc(collection(db, 'imputations')).id;
        await setDoc(doc(db, 'imputations', id), { ...imputation, id }, { merge: true });
    };

    const deleteImputation = async (id) => {
        await deleteDoc(doc(db, 'imputations', id));
    };

    const toggleWeekLock = async (weekId) => {
        const isLocked = !weekLocks[weekId];
        // Collection: weekLocks, DocId: weekId
        await setDoc(doc(db, 'weekLocks', weekId), { weekId, isLocked }, { merge: true });
    };

    const isWeekLocked = (weekId) => !!weekLocks[weekId];

    const addTaskType = async (newType) => {
        const id = newType.id || doc(collection(db, 'taskTypes')).id;
        await setDoc(doc(db, 'taskTypes', id), { ...newType, id });
    };

    const updateTaskType = async (typeId, changes) => {
        await updateDoc(doc(db, 'taskTypes', typeId), changes);
    };

    const deleteTaskType = async (typeId) => {
        await deleteDoc(doc(db, 'taskTypes', typeId));
    };

    // Getters
    const getTasksForUser = (userId) => {
        const isCurrentUser = user && (user.uid === userId || user.id === userId);
        const userRoles = isCurrentUser ? (user.roles || []) : [];

        return tasks.filter(t => {
            if (t.assignedUserIds?.includes(userId)) return true;
            if (t.isGlobal) return true;
            if (t.targetRoles && isCurrentUser) {
                return t.targetRoles.some(role => userRoles.includes(role));
            }
            return false;
        });
    };
    const getAllTasks = () => tasks;

    return (
        <DataContext.Provider value={{
            tasks, imputations, weekLocks, taskTypes,
            addTask, toggleTaskStatus, updateTaskAssignee,
            addOrUpdateImputation, deleteImputation,
            toggleWeekLock, isWeekLocked,
            getTasksForUser, getAllTasks, deleteTask,
            updateTask,
            updateTaskType, deleteTaskType, addTaskType
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => useContext(DataContext);
