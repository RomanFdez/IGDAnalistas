import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getISOWeek, getYear, startOfWeek } from 'date-fns';

const DataContext = createContext(null);

const DEFAULT_TASK_TYPES = [
    { id: 'TRABAJADO', label: 'Trabajado', color: '#E8F5E9', structural: false },
    { id: 'JIRA', label: 'Jira', color: '#C8E6C9', structural: false },
    { id: 'YA_IMPUTADO', label: 'Ya imputado', color: '#E3F2FD', structural: false },
    { id: 'PRE_IMPUTADO', label: 'Pre-imputado', color: '#BBDEFB', structural: false },
    { id: 'SIN_PROYECTO', label: 'Sin proyecto', color: '#F5F5F5', structural: false },
    { id: 'PENDIENTE', label: 'Pendiente', color: '#FCE4EC', structural: false },
    { id: 'REGULARIZADO', label: 'Regularizado', color: '#FFE0B2', structural: false },
    { id: 'RECUPERADO', label: 'Recuperado', color: '#E1BEE7', structural: false },
    { id: 'VACACIONES', label: 'Vacaciones', color: '#FAFAFA', structural: false },
    { id: 'ENFERMEDAD', label: 'Enfermedad', color: '#EEEEEE', structural: false },
    { id: 'FESTIVO', label: 'Festivo', color: '#E0E0E0', structural: false },
    { id: 'BAJA', label: 'Baja', color: '#FBE9E7', structural: false },
    { id: 'OTROS', label: 'Otros', color: '#ECEFF1', structural: false }
];

const generateUUID = () => {
    return (typeof crypto !== '' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
};

export const DataProvider = ({ children }) => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [imputations, setImputations] = useState([]);
    const [weekLocks, setWeekLocks] = useState({}); // { '2023-W48': true } if locked
    // New dynamic state for Task Types
    const [taskTypes, setTaskTypes] = useState([]);

    // Cargar datos iniciales desde API
    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/initial-data');
                if (res.ok) {
                    const data = await res.json();
                    setTaskTypes(data.taskTypes || []);
                    setTasks(data.tasks || []);
                    setImputations(data.imputations || []);
                    setWeekLocks(data.weekLocks || {});
                }
            } catch (error) {
                console.error("Error fetching initial data:", error);
            }
        };
        fetchData();
        // Remove manual seeding from here as backend should persist data
    }, []);

    // Remove localStorage effects

    // --- ACTIONS ---

    const addTask = async (newTask) => {
        const taskWithId = { ...newTask, id: generateUUID(), active: true, assignedUserIds: [user.id] };
        // Optimistic UI
        setTasks(prev => [...prev, taskWithId]);

        try {
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskWithId)
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || errData.message || 'Error creating task');
            }
        } catch (error) {
            console.error("Error creating task:", error);
            // Revert optimistic
            setTasks(prev => prev.filter(t => t.id !== taskWithId.id));
            throw error;
        }
        return taskWithId;
    };

    const updateTaskAssignee = async (taskId, userId) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const currentAssignees = task.assignedUserIds || [];
        if (!currentAssignees.includes(userId)) {
            const newAssignees = [...currentAssignees, userId];
            // Optimistic
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, assignedUserIds: newAssignees } : t));

            await fetch(`/api/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assignedUserIds: newAssignees })
            });
        }
    }

    const toggleTaskStatus = async (taskId) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task || task.permanent) return;

        const newActive = !task.active;
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, active: newActive } : t));

        await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ active: newActive })
        });
    };


    const updateTask = async (taskId, updates) => {
        // Optimistic
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));

        try {
            const res = await fetch(`/api/tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (!res.ok) throw new Error('Failed to update task');
        } catch (error) {
            console.error("Error updating task:", error);
            // Revert optimistic? Harder to do without previous state.
            // For now just throw so consumer knows.
            throw error;
        }
    };

    const deleteTask = async (taskId) => {
        setTasks(prev => prev.filter(t => t.id !== taskId));
        try {
            await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
        } catch (error) {
            console.error("Error deleting task:", error);
        }
    };

    const addOrUpdateImputation = async (imputation) => {
        const idToUse = imputation.id || generateUUID();
        const imputationWithId = { ...imputation, id: idToUse };

        // Optimistic
        setImputations(prev => {
            const existingIndex = prev.findIndex(i => i.id === idToUse);
            if (existingIndex >= 0) {
                const newImps = [...prev];
                newImps[existingIndex] = imputationWithId;
                return newImps;
            }
            return [...prev, imputationWithId];
        });

        try {
            await fetch('/api/imputations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(imputationWithId)
            });
        } catch (error) {
            console.error("Error saving imputation:", error);
            throw error;
        }
    };

    const deleteImputation = async (id) => {
        setImputations(prev => prev.filter(i => i.id !== id));
        try {
            await fetch(`/api/imputations/${id}`, { method: 'DELETE' });
        } catch (error) {
            console.error("Error deleting imputation:", error);
        }
    };

    const toggleWeekLock = async (weekId) => {
        const isLocked = !weekLocks[weekId];
        setWeekLocks(prev => ({ ...prev, [weekId]: isLocked }));

        try {
            await fetch('/api/locks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ weekId, isLocked })
            });
        } catch (error) {
            console.error("Error locking week:", error);
        }
    };

    const isWeekLocked = (weekId) => !!weekLocks[weekId];

    const updateTaskType = async (typeId, changes) => {
        setTaskTypes(prev => prev.map(t => t.id === typeId ? { ...t, ...changes } : t));

        try {
            await fetch(`/api/task-types/${typeId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(changes)
            });
        } catch (error) {
            console.error("Error updating Task Type:", error);
        }
    };

    const addTaskType = async (newType) => {
        // Optimistic
        setTaskTypes(prev => [...prev, newType]);

        try {
            await fetch('/api/task-types', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newType)
            });
        } catch (error) {
            console.error("Error creating Task Type:", error);
        }
    };

    const deleteTaskType = async (typeId) => {
        // Validation: Check if used in imputations
        const isUsed = imputations.some(i => i.type === typeId);
        if (isUsed) {
            throw new Error(`No se puede eliminar: El tipo de tarea está en uso en ${imputations.filter(i => i.type === typeId).length} imputaciones.`);
        }
        setTaskTypes(prev => prev.filter(t => t.id !== typeId)); // Optimistic

        try {
            const res = await fetch(`/api/task-types/${typeId}`, { method: 'DELETE' });
            if (!res.ok) {
                const err = await res.json();
                // Revert or alert? Warning user.
                alert("Error borrando en servidor: " + err.message);
            }
        } catch (error) {
            console.error("Error deleting Task Type:", error);
        }
    };

    // Getters helpers
    const getTasksForUser = (userId) => {
        // Need to find the user roles to check against targetRoles
        // Since we don't have the user object here passed in, use the `user` from context if it matches userId,
        // or we might need to look it up if getting tasks for *other* users.
        // BUT: DataContext does NOT have access to the full user list directly unless we pass it or import it.
        // HACK: We can simply access the `useAuth` user if the requested userId matches the current user.
        // If getting tasks for another user (e.g. admin view), we might miss the role check without the list.
        // HOWEVER, `getTasksForUser` is primarily used for the current user's dashboard/tasks view.

        // BETTER: Allow checking global/assigned regardless.
        // AND check targetRoles if we can get the user's roles.

        // Let's rely on the fact that `user` from `useAuth` is available in the component scope.
        // CAUTION: `user` (state) in DataProvider is the *current* user.

        const isCurrentUser = user && user.id === userId;
        const userRoles = isCurrentUser ? user.roles : [];

        return tasks.filter(t => {
            // 1. Explicitly assigned
            if (t.assignedUserIds?.includes(userId)) return true;
            // 2. Global task
            if (t.isGlobal) return true;
            // 3. Role based (only if we know the roles)
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
