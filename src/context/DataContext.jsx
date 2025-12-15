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

export const DataProvider = ({ children }) => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [imputations, setImputations] = useState([]);
    const [weekLocks, setWeekLocks] = useState({}); // { '2023-W48': true } if locked
    // New dynamic state for Task Types
    const [taskTypes, setTaskTypes] = useState([]);

    // Cargar datos iniciales
    useEffect(() => {
        let storedTasks = JSON.parse(localStorage.getItem('tasks') || '[]');
        let storedImputations = JSON.parse(localStorage.getItem('imputations') || '[]');
        const storedLocks = JSON.parse(localStorage.getItem('weekLocks') || '{}');
        let storedTaskTypes = JSON.parse(localStorage.getItem('taskTypes') || '[]');

        // Initialize Task Types if empty
        if (storedTaskTypes.length === 0) {
            storedTaskTypes = DEFAULT_TASK_TYPES;
            localStorage.setItem('taskTypes', JSON.stringify(storedTaskTypes));
        }

        // --- SEED DATA LOGIC ---
        // Ensuring test data exists for current week if missing

        const now = new Date();
        const currentWeekId = `${getYear(now)}-W${getISOWeek(now)}`;

        // 1. Ensure Permanent/Structural Tasks Always Exist
        const requiredTasks = [
            {
                id: 'T-EST-NOIMP',
                code: 'Estructural',
                name: 'No imputable',
                description: 'Otro tipo de tareas no relacionadas con Hitos de Mapfre.',
                active: true,
                targetRoles: ['ANALYST'],
                permanent: true
            }
        ];

        let tasksUpdated = false;

        // Cleanup: Remove legacy T-EST if present
        if (storedTasks.some(t => t.id === 'T-EST')) {
            storedTasks = storedTasks.filter(t => t.id !== 'T-EST');
            tasksUpdated = true;
        }
        requiredTasks.forEach(reqTask => {
            if (!storedTasks.find(t => t.id === reqTask.id)) {
                storedTasks.push(reqTask);
                tasksUpdated = true;
            } else {
                // Optional: Update definition if it changed (e.g. targetRoles added)
                const existing = storedTasks.find(t => t.id === reqTask.id);
                if (JSON.stringify(existing.targetRoles) !== JSON.stringify(reqTask.targetRoles)) {
                    Object.assign(existing, reqTask);
                    tasksUpdated = true;
                }
            }
        });

        // Initial seed for demo purposes (only if fresh)
        const hasAnaData = storedImputations.some(i => i.weekId === currentWeekId && i.userId === 'u1');

        if (!hasAnaData) {
            console.log("Seeding initial data...");

            const seedTasks = [
                { id: 'T-ANA1', code: 'PROJ-001', name: 'Desarrollo Feature A', active: true, assignedUserIds: ['u1'] },
                { id: 'T-ANA2', code: 'PROJ-002', name: 'Planificación Q4', active: true, assignedUserIds: ['u1'] },
                { id: 'T-PED1', code: 'MGMT-001', name: 'Gestión y Recuperación', active: true, assignedUserIds: ['u2'] }
            ];

            seedTasks.forEach(st => {
                if (!storedTasks.find(t => t.id === st.id)) {
                    storedTasks.push(st);
                    tasksUpdated = true;
                }
            });

            // 2. Add Imputations

            // Ana: 40h TRABAJADO, 3h PRE_IMPUTADO
            const anaImps = [
                {
                    id: crypto.randomUUID(),
                    weekId: currentWeekId,
                    taskId: 'T-ANA1',
                    userId: 'u1',
                    hours: { mon: 8, tue: 8, wed: 8, thu: 8, fri: 8 }, // 40h
                    type: 'TRABAJADO',
                    seg: false,
                    status: 'DRAFT'
                },
                {
                    id: crypto.randomUUID(),
                    weekId: currentWeekId,
                    taskId: 'T-ANA2',
                    userId: 'u1',
                    hours: { mon: 3, tue: 0, wed: 0, thu: 0, fri: 0 }, // 3h
                    type: 'PRE_IMPUTADO',
                    seg: true,
                    status: 'DRAFT'
                }
            ];

            // Pedro: 15h RECUPERADO
            const pedroImps = [
                {
                    id: crypto.randomUUID(),
                    weekId: currentWeekId,
                    taskId: 'T-PED1',
                    userId: 'u2',
                    hours: { mon: 8, tue: 7, wed: 0, thu: 0, fri: 0 }, // 15h
                    type: 'RECUPERADO',
                    seg: false,
                    status: 'DRAFT'
                }
            ];

            storedImputations = [...storedImputations, ...anaImps, ...pedroImps];

            // Note: We used to save here, but better to save at end of effect or rely on state update
        }

        // If we updated storedTasks directly, save it back to LS immediately so state init picks it up
        // actually, we are initializing state from storedTasks variable, so just need to setTasks.
        // But to persist for next reload if we changed it in memory:
        if (tasksUpdated) {
            localStorage.setItem('tasks', JSON.stringify(storedTasks));
        }

        if (!hasAnaData) {
            localStorage.setItem('imputations', JSON.stringify(storedImputations));
        }

        setTasks(storedTasks);
        setImputations(storedImputations);
        setWeekLocks(storedLocks);
        setTaskTypes(storedTaskTypes);
    }, []);

    // Persistir cambios
    useEffect(() => {
        if (tasks.length > 0) localStorage.setItem('tasks', JSON.stringify(tasks));
    }, [tasks]);

    useEffect(() => {
        if (imputations.length > 0) localStorage.setItem('imputations', JSON.stringify(imputations));
    }, [imputations]);

    useEffect(() => {
        localStorage.setItem('weekLocks', JSON.stringify(weekLocks));
    }, [weekLocks]);

    useEffect(() => {
        if (taskTypes.length > 0) localStorage.setItem('taskTypes', JSON.stringify(taskTypes));
    }, [taskTypes]);

    // --- ACTIONS ---

    const addTask = (newTask) => {
        setTasks(prev => [...prev, { ...newTask, id: crypto.randomUUID(), active: true, assignedUserIds: [user.id] }]);
    };

    const updateTaskAssignee = (taskId, userId) => {
        setTasks(prev => prev.map(t => {
            if (t.id !== taskId) return t;
            const currentAssignees = t.assignedUserIds || [];
            if (!currentAssignees.includes(userId)) {
                return { ...t, assignedUserIds: [...currentAssignees, userId] };
            }
            return t;
        }));
    }

    const toggleTaskStatus = (taskId) => {
        setTasks(prev => prev.map(t => {
            if (t.id === taskId) {
                if (t.permanent) return t; // Cannot toggle permanent tasks
                return { ...t, active: !t.active };
            }
            return t;
        }));
    };

    const addOrUpdateImputation = (imputation) => {
        setImputations(prev => {
            const existingIndex = prev.findIndex(i => i.id === imputation.id);
            if (existingIndex >= 0) {
                const newImps = [...prev];
                newImps[existingIndex] = imputation;
                return newImps;
            }
            return [...prev, { ...imputation, id: crypto.randomUUID() }];
        });
    };

    const deleteImputation = (id) => {
        setImputations(prev => prev.filter(i => i.id !== id));
    };

    const toggleWeekLock = (weekId) => {
        setWeekLocks(prev => {
            const newLocks = { ...prev, [weekId]: !prev[weekId] };
            return newLocks;
        });
    };

    const isWeekLocked = (weekId) => !!weekLocks[weekId];

    const updateTaskType = (typeId, changes) => {
        setTaskTypes(prev => prev.map(t => t.id === typeId ? { ...t, ...changes } : t));
    };

    const deleteTaskType = (typeId) => {
        // Validation: Check if used in imputations
        const isUsed = imputations.some(i => i.type === typeId);
        if (isUsed) {
            throw new Error(`No se puede eliminar: El tipo de tarea está en uso en ${imputations.filter(i => i.type === typeId).length} imputaciones.`);
        }
        setTaskTypes(prev => prev.filter(t => t.id !== typeId));
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
            getTasksForUser, getAllTasks,
            getTasksForUser, getAllTasks,
            updateTaskType, deleteTaskType
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => useContext(DataContext);
