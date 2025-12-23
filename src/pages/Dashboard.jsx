import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { format, startOfWeek, addWeeks, subWeeks, addDays, getISOWeek, getISOWeekYear, startOfMonth, endOfMonth, subMonths, addMonths, eachDayOfInterval, isSameMonth, setISOWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    Box, Typography, Paper, IconButton, Button, Select, MenuItem,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, TextField,
    FormControl, Checkbox, InputBase, Tooltip, Link, Chip, Alert, Dialog
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
    ChevronLeft, ChevronRight, Lock, LockOpen, Add, DeleteOutline, AddCircleOutline, Search, InfoOutlined, FileDownload, FileUpload, Comment
} from '@mui/icons-material';

import TaskFormDialog from '../components/TaskFormDialog';
import WeekViewTable from '../components/dashboard/WeekViewTable';
import MonthViewTable from '../components/dashboard/MonthViewTable';

export default function Dashboard() {
    const { user } = useAuth();
    const {
        tasks, imputations, isWeekLocked,
        addOrUpdateImputation, deleteImputation,
        getTasksForUser, taskTypes
    } = useData();
    const theme = useTheme();

    const [openTaskDialog, setOpenTaskDialog] = useState(false);
    const [taskDescription, setTaskDescription] = useState(null);
    const [noteDialog, setNoteDialog] = useState({ open: false, imputationId: null, note: '' });

    const handleOpenNote = (imputation) => {
        setNoteDialog({
            open: true,
            imputationId: imputation.id,
            imputationWeekId: imputation.weekId, // Needed for update
            imputationUserId: imputation.userId, // Needed for update
            imputationTaskId: imputation.taskId, // Needed for update
            imputationType: imputation.type, // Needed for update
            fullImputation: imputation,
            note: imputation.note || ''
        });
    };

    const handleSaveNote = () => {
        if (noteDialog.fullImputation) {
            addOrUpdateImputation({
                ...noteDialog.fullImputation,
                note: noteDialog.note
            });
            setNoteDialog({ ...noteDialog, open: false });
        }
    };

    const [currentWeekStart, setCurrentWeekStart] = useState(
        startOfWeek(new Date(), { weekStartsOn: 1 })
    );

    const weekId = useMemo(() => {
        return `${getISOWeekYear(currentWeekStart)}-W${getISOWeek(currentWeekStart)}`;
    }, [currentWeekStart]);

    const weekDays = useMemo(() => {
        return Array.from({ length: 5 }).map((_, i) => {
            const d = addDays(currentWeekStart, i);
            return { date: d, label: format(d, 'EEEE d', { locale: es }) };
        });
    }, [currentWeekStart]);

    const isLocked = isWeekLocked(weekId);
    const myImputations = imputations.filter(i => i.userId === user.id && i.weekId === weekId);
    const allMyImputations = useMemo(() => imputations.filter(i => i.userId === user.id), [imputations, user.id]);

    // Smart Suggestions: Sort myTasks by usage frequency
    const taskUsageCount = useMemo(() => {
        const counts = {};
        allMyImputations.forEach(imp => {
            counts[imp.taskId] = (counts[imp.taskId] || 0) + 1;
        });
        return counts;
    }, [allMyImputations]);

    const myTasks = useMemo(() => {
        const userTasks = getTasksForUser(user.id).filter(t => t.active);
        return userTasks.sort((a, b) => {
            // First by usage count (desc)
            const countA = taskUsageCount[a.id] || 0;
            const countB = taskUsageCount[b.id] || 0;
            if (countA !== countB) return countB - countA;
            // Then alphabetical code
            return a.code.localeCompare(b.code);
        });
    }, [getTasksForUser, user.id, taskUsageCount]);

    const [selectedTaskId, setSelectedTaskId] = useState('');

    const [viewMode, setViewMode] = useState('week'); // 'week' or 'month'
    const [monthOrder, setMonthOrder] = useState('asc');
    const [monthOrderBy, setMonthOrderBy] = useState('task'); // 'task' or 'type'

    const handleMonthRequestSort = (property) => {
        const isAsc = monthOrderBy === property && monthOrder === 'asc';
        setMonthOrder(isAsc ? 'desc' : 'asc');
        setMonthOrderBy(property);
    };

    const handlePrev = () => {
        if (viewMode === 'week') {
            setCurrentWeekStart(d => subWeeks(d, 1));
        } else {
            setCurrentWeekStart(d => subMonths(d, 1));
        }
    };

    const handleNext = () => {
        if (viewMode === 'week') {
            setCurrentWeekStart(d => addWeeks(d, 1));
        } else {
            setCurrentWeekStart(d => addMonths(d, 1));
        }
    };

    // Month View Calculations
    const monthDetails = useMemo(() => {
        if (viewMode !== 'month') return null;

        const start = startOfMonth(currentWeekStart);
        const end = endOfMonth(start);

        // Get all days in the month
        const days = eachDayOfInterval({ start, end });

        // Aggregate Data
        // Row Key: taskId + typeId
        const rows = {};
        const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri']; // Indices 0-4 relative to Monday

        imputations.filter(i => i.userId === user.id).forEach(imp => {
            // Parse Week ID to find its Monday
            let weekMonday;
            try {
                const [yStr, wStr] = imp.weekId.split('-W');
                if (!yStr || !wStr) return;
                // Jan 4th is always in ISO week 1
                weekMonday = startOfWeek(
                    setISOWeek(new Date(parseInt(yStr), 0, 4), parseInt(wStr)),
                    { weekStartsOn: 1 }
                );
            } catch (e) {
                return;
            }

            const key = `${imp.taskId}-${imp.type}`;

            // Iterate Mon-Fri of that week
            dayKeys.forEach((dKey, idx) => {
                const hours = imp.hours[dKey] || 0;
                if (hours === 0) return;

                const date = addDays(weekMonday, idx);

                // Only include if date falls in current month
                if (isSameMonth(date, currentWeekStart)) {
                    if (!rows[key]) {
                        rows[key] = {
                            taskId: imp.taskId,
                            type: imp.type,
                            dailyValues: {},
                            total: 0
                        };
                    }
                    const dateStr = format(date, 'yyyy-MM-dd');
                    rows[key].dailyValues[dateStr] = (rows[key].dailyValues[dateStr] || 0) + hours;
                    rows[key].total += hours;
                }
            });
        });

        // Sort rows
        const sortedRows = Object.values(rows).sort((a, b) => {
            const isAsc = monthOrder === 'asc';
            if (monthOrderBy === 'task') {
                const taskA = tasks.find(t => t.id === a.taskId);
                const taskB = tasks.find(t => t.id === b.taskId);
                const codeA = taskA?.code || '';
                const codeB = taskB?.code || '';
                return isAsc ? codeA.localeCompare(codeB) : codeB.localeCompare(codeA);
            } else {
                const typeA = taskTypes.find(t => t.id === a.type)?.label || '';
                const typeB = taskTypes.find(t => t.id === b.type)?.label || '';
                return isAsc ? typeA.localeCompare(typeB) : typeB.localeCompare(typeA);
            }
        });

        return { days, rows: sortedRows };
    }, [viewMode, currentWeekStart, imputations, user.id, monthOrder, monthOrderBy, tasks, taskTypes]);

    const handleExport = () => {
        const userImputations = imputations.filter(i => i.userId === user.id);
        const headers = ['Semana', 'CodigoTarea', 'Tipo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Seguimiento'];
        const csvContent = [
            headers.join(';'),
            ...userImputations.map(imp => {
                const task = tasks.find(t => t.id === imp.taskId);
                return [
                    imp.weekId,
                    task ? task.code : 'UNKNOWN',
                    imp.type,
                    imp.hours.mon,
                    imp.hours.tue,
                    imp.hours.wed,
                    imp.hours.thu,
                    imp.hours.fri,
                    imp.seg ? 'SI' : 'NO'
                ].join(';');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `imputaciones_${user.name.replace(/\s+/g, '_')}.csv`;
        link.click();
    };

    const handleImport = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target.result;
                const rows = text.split('\n').slice(1);
                let successCount = 0;
                let errors = [];

                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    if (!row.trim()) continue;
                    const cols = row.split(';');
                    const rowNum = i + 2; // +2 because skipped header (1) and 0-indexed

                    if (cols.length < 3) {
                        errors.push(`Fila ${rowNum}: Formato incorrecto, faltan columnas.`);
                        continue;
                    }

                    const clean = (val) => val ? val.replace(/^"|"$/g, '').trim() : '';
                    const week = clean(cols[0]);
                    const taskCode = clean(cols[1]);
                    const typeId = clean(cols[2]);

                    if (!week || !taskCode || !typeId) {
                        errors.push(`Fila ${rowNum}: Datos incompletos (Semana, Código o Tipo faltantes).`);
                        continue;
                    }

                    // 1. Find Task
                    const task = tasks.find(t => t.code === taskCode);
                    if (!task) {
                        errors.push(`Fila ${rowNum}: Código de tarea desconocido '${taskCode}'.`);
                        continue;
                    }

                    // 2. Validate Lock
                    if (isWeekLocked(week)) {
                        errors.push(`Fila ${rowNum}: La semana ${week} está bloqueada.`);
                        continue;
                    }

                    // 3. Construct Data
                    const imputationData = {
                        weekId: week,
                        taskId: task.id,
                        userId: user.id,
                        type: typeId,
                        hours: {
                            mon: parseFloat(clean(cols[3])) || 0,
                            tue: parseFloat(clean(cols[4])) || 0,
                            wed: parseFloat(clean(cols[5])) || 0,
                            thu: parseFloat(clean(cols[6])) || 0,
                            fri: parseFloat(clean(cols[7])) || 0
                        },
                        seg: clean(cols[8]).toUpperCase() === 'SI' || clean(cols[8]).toUpperCase() === 'TRUE',
                        status: 'DRAFT'
                    };

                    // 4. Upsert
                    const existing = imputations.find(imp =>
                        imp.userId === user.id &&
                        imp.weekId === week &&
                        imp.taskId === task.id &&
                        imp.type === typeId
                    );

                    try {
                        if (existing) {
                            await addOrUpdateImputation({ ...imputationData, id: existing.id });
                        } else {
                            await addOrUpdateImputation(imputationData);
                        }
                        successCount++;
                    } catch (err) {
                        errors.push(`Fila ${rowNum}: Error al guardar - ${err.message}`);
                    }
                }

                if (errors.length > 0) {
                    // Generate Error Report
                    const errorBlob = new Blob([errors.join('\n')], { type: 'text/plain' });
                    const errorLink = document.createElement('a');
                    errorLink.href = URL.createObjectURL(errorBlob);
                    errorLink.download = 'errores_importacion.txt';
                    errorLink.click();
                    alert(`Importación parcial: ${successCount} procesados. Se descargará un reporte con ${errors.length} errores.`);
                } else {
                    alert(`Importación completada con éxito. ${successCount} registros procesados.`);
                }

            } catch (error) {
                console.error(error);
                alert('Error crítico al procesar el archivo CSV.');
            }
            event.target.value = null;
        };
        reader.readAsText(file);
    };

    const handleAddRow = () => {
        if (!selectedTaskId) return;

        const task = myTasks.find(t => t.id === selectedTaskId);
        const isStructural = task?.code === 'Estructural';
        const defaultType = isStructural ? 'OTROS' : 'TRABAJADO';

        addOrUpdateImputation({
            weekId,
            taskId: selectedTaskId,
            userId: user.id,
            hours: { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0 },
            type: defaultType,
            seg: false,
            status: 'DRAFT'
        });
        setSelectedTaskId('');
    };

    const updateHours = (imputation, dayKey, value) => {
        if (isLocked) return;
        // Strict Number Validation: Allow empty string or numbers (including decimals). Reject others.
        if (value !== '' && !/^\d*\.?\d*$/.test(value)) return;

        const val = value === '' ? 0 : parseFloat(value);
        addOrUpdateImputation({ ...imputation, hours: { ...imputation.hours, [dayKey]: val } });
    };

    const updateField = (imputation, field, value) => {
        if (isLocked) return;
        addOrUpdateImputation({ ...imputation, [field]: value });
    };

    const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri'];
    const dailyTotals = dayKeys.reduce((acc, day) => {
        acc[day] = myImputations.reduce((sum, imp) => sum + (imp.hours[day] || 0), 0);
        return acc;
    }, {});
    const grandTotal = Object.values(dailyTotals).reduce((a, b) => a + b, 0);

    // Group totals by type with custom grouping for TRABAJADO + JIRA
    const rawTotals = taskTypes.map(type => {
        const impsOfType = myImputations.filter(i => i.type === type.id);
        const total = impsOfType.reduce((sum, imp) =>
            sum + Object.values(imp.hours).reduce((a, b) => a + b, 0), 0
        );
        return { type, total };
    });

    const workedAndJira = rawTotals.filter(t => t.type.id === 'TRABAJADO' || t.type.id === 'JIRA')
        .reduce((acc, curr) => acc + curr.total, 0);

    const otherTotals = rawTotals.filter(t => t.type.id !== 'TRABAJADO' && t.type.id !== 'JIRA' && t.total > 0);

    // Construct final list for display
    const totalsByType = [
        {
            type: { id: 'TRABAJADO_JIRA', label: 'Trabajado + JIRA' },
            total: workedAndJira
        },
        ...otherTotals
    ].filter(t => t.total > 0);

    // Search and Sort State
    const [searchQuery, setSearchQuery] = useState('');
    const [order, setOrder] = useState('asc');
    const [orderBy, setOrderBy] = useState('task'); // 'task', 'type', 'seg'

    const handleRequestSort = (property) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const sortedAndFilteredImputations = useMemo(() => {
        return myImputations.filter(imp => {
            if (!searchQuery) return true;
            const task = tasks.find(t => t.id === imp.taskId);
            const query = searchQuery.toLowerCase();
            return (
                task?.code.toLowerCase().includes(query) ||
                task?.name.toLowerCase().includes(query)
            );
        }).sort((a, b) => {
            const isAsc = order === 'asc';
            if (orderBy === 'task') {
                const taskA = tasks.find(t => t.id === a.taskId);
                const taskB = tasks.find(t => t.id === b.taskId);
                return isAsc
                    ? taskA?.code.localeCompare(taskB?.code)
                    : taskB?.code.localeCompare(taskA?.code);
            } else if (orderBy === 'type') {
                // Sort by label preferably, or id
                const typeA = taskTypes.find(t => t.id === a.type)?.label || '';
                const typeB = taskTypes.find(t => t.id === b.type)?.label || '';
                return isAsc ? typeA.localeCompare(typeB) : typeB.localeCompare(typeA);
            } else if (orderBy === 'seg') {
                // Boolean sort
                return isAsc ? (a.seg === b.seg ? 0 : a.seg ? -1 : 1) : (a.seg === b.seg ? 0 : a.seg ? 1 : -1);
            }
            return 0;
        });
    }, [myImputations, tasks, searchQuery, order, orderBy, taskTypes]);

    return (
        <Box>
            {/* Page Header */}
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h5" color="text.primary">Hoja de Tiempo</Typography>
                    <Typography variant="body2" color="text.secondary">Registra y gestiona tus imputaciones</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Box sx={{ bgcolor: 'background.paper', borderRadius: 1, border: '1px solid #ddd', p: 0.5, display: 'flex' }}>
                        <Button
                            size="small"
                            variant={viewMode === 'week' ? 'contained' : 'text'}
                            onClick={() => setViewMode('week')}
                            disableElevation
                        >
                            Semanal
                        </Button>
                        <Button
                            size="small"
                            variant={viewMode === 'month' ? 'contained' : 'text'}
                            onClick={() => setViewMode('month')}
                            disableElevation
                        >
                            Mensual
                        </Button>
                    </Box>

                    <Button startIcon={<FileDownload />} onClick={handleExport} color="inherit">
                        Exportar
                    </Button>
                    <Button startIcon={<FileUpload />} component="label" color="inherit">
                        Importar
                        <input type="file" hidden accept=".csv" onChange={handleImport} />
                    </Button>
                </Box>
            </Box>

            {/* Navigation */}
            <Paper elevation={0} variant="outlined" sx={{ p: 2, mb: 3, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <IconButton onClick={handlePrev} size="small" sx={{ border: '1px solid #ddd' }}><ChevronLeft /></IconButton>
                    <Box sx={{ textAlign: 'center', minWidth: 150 }}>
                        <Typography variant="h6" sx={{ textTransform: 'capitalize', fontWeight: 'bold' }}>
                            {viewMode === 'week'
                                ? format(currentWeekStart, 'MMMM yyyy', { locale: es })
                                : format(currentWeekStart, 'MMMM yyyy', { locale: es })
                            }
                        </Typography>
                        {viewMode === 'week' && (
                            <>
                                <Typography variant="caption" color="text.secondary" display="block">
                                    {weekId}
                                </Typography>
                                <Typography variant="caption" color="primary" fontWeight="bold">
                                    {format(currentWeekStart, 'd MMM', { locale: es })} - {format(addDays(currentWeekStart, 4), 'd MMM', { locale: es })}
                                </Typography>
                            </>
                        )}
                    </Box>
                    <IconButton onClick={handleNext} size="small" sx={{ border: '1px solid #ddd' }}><ChevronRight /></IconButton>
                </Box>

                {viewMode === 'week' && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                        {isLocked && (
                            <Chip icon={<Lock />} label="Semana Bloqueada" color="error" variant="outlined" />
                        )}

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 0.5, border: '1px solid #ddd', borderRadius: 2, bgcolor: 'background.default' }}>
                            {myTasks.length > 0 ? (
                                <Select
                                    value={selectedTaskId}
                                    onChange={e => {
                                        if (e.target.value === 'NEW_TASK') {
                                            setOpenTaskDialog(true);
                                        } else {
                                            setSelectedTaskId(e.target.value);
                                        }
                                    }}
                                    disabled={isLocked}
                                    displayEmpty
                                    variant="standard"
                                    disableUnderline
                                    sx={{ minWidth: 200, px: 2, fontSize: '0.875rem' }}
                                >
                                    <MenuItem value=""><em>Seleccionar Tarea para Imputar...</em></MenuItem>
                                    <MenuItem value="NEW_TASK" sx={{ color: 'primary.main', fontWeight: 'bold', borderBottom: '1px solid #eee' }}>
                                        <Add fontSize="small" sx={{ mr: 1 }} /> Nueva Tarea
                                    </MenuItem>
                                    {myTasks.map(t => <MenuItem key={t.id} value={t.id}>{t.code === 'Estructural' ? 'Estructural' : `${t.hito || '-'} - ${t.description || t.name}`}</MenuItem>)}
                                </Select>
                            ) : (
                                <Typography variant="body2" color="text.disabled" sx={{ px: 2 }}>Sin tareas activas</Typography>
                            )}

                            <Button
                                onClick={handleAddRow}
                                disabled={!selectedTaskId || isLocked}
                                variant="contained"
                                size="small"
                                sx={{ minWidth: 0, p: 1, borderRadius: 1.5 }}
                                title="Añadir Imputación"
                            >
                                <Add />
                            </Button>
                        </Box>
                    </Box>
                )}
            </Paper>

            <TaskFormDialog
                open={openTaskDialog}
                onClose={() => setOpenTaskDialog(false)}
                onTaskCreated={(newTask) => {
                    if (newTask && newTask.id) {
                        setSelectedTaskId(newTask.id);
                    }
                }}
            />

            {/* MONTH VIEW TABLE */}
            {viewMode === 'month' && monthDetails && (
                <MonthViewTable
                    monthDetails={monthDetails}
                    tasks={tasks}
                    taskTypes={taskTypes}
                    monthOrderBy={monthOrderBy}
                    monthOrder={monthOrder}
                    onRequestSort={handleMonthRequestSort}
                />
            )}

            {/* WEEK VIEW COMPONENTS */}
            {viewMode === 'week' && (
                <>
                    {/* Search Filter for Table */}
                    {myImputations.length > 0 && (
                        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-start' }}>
                            <TextField
                                size="small"
                                placeholder="Filtrar por tarea..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                InputProps={{ startAdornment: <Search color="action" fontSize="small" sx={{ mr: 1 }} /> }}
                                sx={{ maxWidth: 300 }}
                                autoComplete="off"
                            />
                        </Box>
                    )}

                    {/* Main Table */}
                    <WeekViewTable
                        imputations={sortedAndFilteredImputations}
                        allUserImputations={allMyImputations}
                        currentWeekStart={currentWeekStart}
                        tasks={tasks}
                        taskTypes={taskTypes}
                        weekDays={weekDays}
                        dayKeys={dayKeys}
                        isLocked={isLocked}
                        orderBy={orderBy}
                        order={order}
                        onRequestSort={handleRequestSort}
                        onUpdateHours={updateHours}
                        onUpdateField={updateField}
                        onDelete={deleteImputation}
                        onOpenNote={handleOpenNote}
                        setTaskDescription={setTaskDescription}
                        dailyTotals={dailyTotals}
                        grandTotal={grandTotal}
                    />
                </>
            )}
            {/* Task Description Dialog */}
            <Dialog open={!!taskDescription} onClose={() => setTaskDescription(null)} maxWidth="xs" fullWidth>
                <Box sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                        {taskDescription?.code} - {taskDescription?.name}
                    </Typography>
                    {taskDescription?.hito && (
                        <Typography variant="subtitle2" color="primary" gutterBottom>
                            Hito: {taskDescription.hito}
                        </Typography>
                    )}
                    <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                        {taskDescription?.description || 'Sin descripción disponible.'}
                    </Typography>
                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button onClick={() => setTaskDescription(null)} variant="contained" size="small">
                            Cerrar
                        </Button>
                    </Box>
                </Box>
            </Dialog>

            {/* Note Dialog */}
            <Dialog open={noteDialog.open} onClose={() => setNoteDialog({ ...noteDialog, open: false })} maxWidth="sm" fullWidth>
                <Box sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                        Añadir Nota a la Imputación
                    </Typography>
                    <TextField
                        multiline
                        rows={4}
                        fullWidth
                        variant="outlined"
                        placeholder="Escribe una nota aquí..."
                        value={noteDialog.note}
                        onChange={(e) => setNoteDialog({ ...noteDialog, note: e.target.value })}
                    />
                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                        <Button onClick={() => setNoteDialog({ ...noteDialog, open: false })}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveNote} variant="contained">
                            Guardar
                        </Button>
                    </Box>
                </Box>
            </Dialog>
            {myImputations.length === 0 && (
                <Alert severity="info" variant="outlined" sx={{ mt: 2 }}>
                    No tienes imputaciones para esta semana. Usa el selector arriba para añadir tareas.
                </Alert>
            )}

            {/* Summary by Type */}
            {totalsByType.length > 0 && (
                <Box sx={{ mt: 3, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, alignItems: 'flex-start', justifyContent: 'flex-end' }}>

                    {/* Visual Work Hours Tracker */}
                    {/* Visual Work Hours Tracker */}
                    <Paper
                        elevation={0}
                        variant="outlined"
                        sx={{
                            p: 2.5,
                            borderRadius: 3,
                            flex: 1,
                            maxWidth: { md: 400 }
                        }}
                    >
                        {(() => {
                            // Calculate Computable Hours Logic Updated:
                            // Use the 'computesInWeek' property from TaskType.
                            // If property is undefined, default to true (backward compatibility), 
                            // BUT structure types might default to false if not migrated properly, so be careful.
                            // Actually, we migrated them to true in backend. 
                            // The filtered list should be based on this flag.

                            const computableHours = rawTotals
                                .filter(t => {
                                    // t.type is the taskType object
                                    // Check if explicit boolean exists, otherwise default true?
                                    // Or rely on the list we had + new ones?
                                    // The user said: "El widget... mostrará la suma de las tareas que estén marcadas como 'computa en la semana'."
                                    // So we strictly follow the flag.
                                    return t.type.computesInWeek !== false;
                                })
                                .reduce((acc, curr) => acc + curr.total, 0);

                            const target = 40;
                            const diff = computableHours - target;
                            const progress = Math.min((computableHours / target) * 100, 100);

                            let statusColor = 'warning.main';
                            let statusText = `Te faltan ${Math.abs(diff)}h`;
                            let statusIcon = "⏳";

                            if (computableHours > 40) {
                                statusColor = 'error.main';
                                statusText = `Exceso: +${diff}h`;
                                statusIcon = "⚠️";
                            } else if (computableHours === 40) {
                                statusColor = 'success.main';
                                statusText = "Objetivo cumplido.";
                                statusIcon = "✅";
                            }

                            return (
                                <Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                                            TOTAL COMPUTABLE
                                        </Typography>
                                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: statusColor }}>
                                            {computableHours} / {target} h
                                        </Typography>
                                    </Box>

                                    <Box sx={{ position: 'relative', height: 10, borderRadius: 5, bgcolor: 'rgba(0,0,0,0.05)', mb: 2, overflow: 'hidden' }}>
                                        <Box
                                            sx={{
                                                width: `${progress}%`,
                                                height: '100%',
                                                bgcolor: statusColor,
                                                transition: 'width 0.5s ease',
                                                borderRadius: 5
                                            }}
                                        />
                                    </Box>

                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="h5">{statusIcon}</Typography>
                                        <Box>
                                            <Typography variant="body2" fontWeight="bold" sx={{ color: statusColor }}>
                                                {statusText}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {computableHours < 40 ? 'Completa tu jornada semanal' : computableHours > 40 ? 'Revisa tus horas extras' : 'semana completa'}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Box>
                            );
                        })()}
                    </Paper>

                    <Box sx={{ minWidth: 250 }}>
                        <Typography variant="subtitle2" gutterBottom color="text.secondary">Resumen por Tipo</Typography>
                        <TableContainer component={Paper} elevation={0} variant="outlined">
                            <Table size="small">
                                <TableBody>
                                    {totalsByType.map(group => (
                                        <TableRow key={group.type.id}>
                                            <TableCell component="th" scope="row" sx={{ bgcolor: group.type.id === 'TRABAJADO_JIRA' ? theme.palette.taskTypes['TRABAJADO'] : (group.type.color || theme.palette.taskTypes[group.type.id]), fontWeight: 'medium' }}>
                                                {group.type.label}
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                                {group.total}h
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                </Box>
            )
            }
        </Box >
    );
}
