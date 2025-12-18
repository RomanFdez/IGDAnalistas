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
    const myTasks = getTasksForUser(user.id)
        .filter(t => t.active)
        .sort((a, b) => a.code.localeCompare(b.code));

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
                let count = 0;

                for (const row of rows) {
                    if (!row.trim()) continue;
                    const cols = row.split(';');
                    if (cols.length < 3) continue;

                    const clean = (val) => val ? val.replace(/^"|"$/g, '').trim() : '';

                    const week = clean(cols[0]);
                    const taskCode = clean(cols[1]);
                    const typeId = clean(cols[2]);

                    if (!week || !taskCode || !typeId) continue;

                    // 1. Find Task
                    const task = tasks.find(t => t.code === taskCode);
                    if (!task) {
                        console.warn(`Tarea desconocida: ${taskCode}`);
                        continue;
                    }

                    // 2. Validate Lock
                    if (isWeekLocked(week)) {
                        console.warn(`Semana bloqueada: ${week}`);
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
                    // Constraint: Check if already exists to keep ID?
                    // addOrUpdateImputation handles logic but often requires ID for update.
                    // If no ID provided, it might create duplicate if backend doesn't check unique(week, user, task, type).
                    // The DataContext `addOrUpdateImputation` likely checks availability?
                    // Let's check logic: It's typically: "If ID exists, update. Else create."
                    // But here we don't have ID.
                    // We must find existing imputation for this key.

                    const existing = imputations.find(i =>
                        i.userId === user.id &&
                        i.weekId === week &&
                        i.taskId === task.id &&
                        i.type === typeId
                    );

                    if (existing) {
                        await addOrUpdateImputation({ ...imputationData, id: existing.id });
                    } else {
                        await addOrUpdateImputation(imputationData);
                    }
                    count++;
                }
                alert(`Importación completada. Se procesaron/actualizaron ${count} registros.`);
                // Refresh? Context updates should trigger re-render.
            } catch (error) {
                console.error(error);
                alert('Error al procesar el archivo CSV.');
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
                <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ mb: 3 }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ bgcolor: 'background.default', minWidth: 200, left: 0, position: 'sticky', zIndex: 2 }}>
                                    <TableSortLabel
                                        active={monthOrderBy === 'task'}
                                        direction={monthOrderBy === 'task' ? monthOrder : 'asc'}
                                        onClick={() => handleMonthRequestSort('task')}
                                    >
                                        Tarea
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell sx={{ bgcolor: 'background.default', minWidth: 100, left: 200, position: 'sticky', zIndex: 2 }}>
                                    <TableSortLabel
                                        active={monthOrderBy === 'type'}
                                        direction={monthOrderBy === 'type' ? monthOrder : 'asc'}
                                        onClick={() => handleMonthRequestSort('type')}
                                    >
                                        Tipo
                                    </TableSortLabel>
                                </TableCell>
                                {monthDetails.days.map(d => (
                                    <TableCell key={d.toISOString()} align="center" sx={{ bgcolor: 'background.default', minWidth: 40, px: 0.5 }}>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <Typography variant="caption" sx={{ textTransform: 'capitalize', color: 'text.secondary' }}>
                                                {format(d, 'EEE', { locale: es })}
                                            </Typography>
                                            <Typography variant="body2" fontWeight="bold">
                                                {format(d, 'd')}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                ))}
                                <TableCell align="center" sx={{ bgcolor: 'background.default', fontWeight: 'bold', minWidth: 60 }}>Total</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {monthDetails.rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3 + monthDetails.days.length} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                        No hay imputaciones en este mes.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                monthDetails.rows.map(row => {
                                    const task = tasks.find(t => t.id === row.taskId);
                                    const typeInfo = taskTypes.find(t => t.id === row.type);
                                    return (
                                        <TableRow key={`${row.taskId}-${row.type}`} hover>
                                            <TableCell sx={{ left: 0, position: 'sticky', bgcolor: 'background.paper', zIndex: 1, borderRight: '1px solid #eee' }}>
                                                <Tooltip title={`${task?.code} - ${task?.name}`}>
                                                    <Typography variant="body2" noWrap sx={{ maxWidth: 180 }}>
                                                        {task?.code === 'Estructural' ? 'Estructural' : `${task?.hito || '-'} - ${task?.description || task?.name}`}
                                                    </Typography>
                                                </Tooltip>
                                                {row.status !== 'APPROVED' && row.imputationRef && ( // We need a way to reference the single imputation if aggregating. Wait, month view aggregates by task/type for the row, but `row` is constructed.
                                                    // Ah, Month view aggregates multiple imputations across days? No, row key is taskId+typeId.
                                                    // But logic says: "Iterate Mon-Fri of that week" ... "row[key].total += hours".
                                                    // Wait, `imputations` is a flat list. One imputation per week/task/type.
                                                    // If a row in Month view represents that single imputation record (which spans a week), we can attach the note to it.
                                                    // But Month view spans multiple weeks. A row in month view might aggregate data from multiple weekly imputation records if "taskId+typeId" is the key?
                                                    // No, typically Month view shows rows per Task+Type. If multiple weeks are involved, we have multiple imputation records (one per week).
                                                    // So we cannot easily attach a single note to a "Month View Row" because it aggregates multiple DB records (weeks).
                                                    // The user request says "cuando la imputación sea de tipo pendiente". "Imputación" usually refers to the weekly record.
                                                    // In Week view, it's 1:1. In Month view, it's N:1.
                                                    // Let's implement it in Week View first as it's the primary "imputation" view.
                                                    // Should we implement in Month View? If so, which imputation record holds the note? The user might expect the note to be per week.
                                                    // If I add it to the row, which week's note am I editing?
                                                    // Let's assume Week View is the target for now, or clarify. But user said "en la pagina de imputaciones" (Dashboard).
                                                    // I will add it to Week View reliably. For Month view, I'll skip unless user clarifies, as it's ambiguous (aggregates multiple weeks).
                                                    // Wait, if I assume Month view just lists tasks, and displays days...
                                                    // Actually, let's stick to Week View where `imp` is clearly defined.
                                                    null
                                                )}
                                            </TableCell>
                                            <TableCell sx={{ left: 200, position: 'sticky', bgcolor: 'background.paper', zIndex: 1, borderRight: '1px solid #eee' }}>
                                                <Chip
                                                    label={typeInfo?.label || row.type}
                                                    size="small"
                                                    sx={{
                                                        bgcolor: typeInfo?.color || '#eee',
                                                        borderRadius: 1,
                                                        height: 24,
                                                        fontSize: '0.75rem'
                                                    }}
                                                />
                                            </TableCell>
                                            {monthDetails.days.map(d => {
                                                const val = row.dailyValues[format(d, 'yyyy-MM-dd')];
                                                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                                return (
                                                    <TableCell
                                                        key={d.toISOString()}
                                                        align="center"
                                                        sx={{
                                                            bgcolor: isWeekend ? '#fafafa' : 'inherit',
                                                            color: val ? 'text.primary' : 'text.disabled',
                                                            p: 0.5
                                                        }}
                                                    >
                                                        {val || '-'}
                                                    </TableCell>
                                                );
                                            })}
                                            <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: 'grey.50' }}>
                                                {row.total}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
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
                    <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ overflowX: 'auto' }}>
                        <Table size="small" sx={{ minWidth: 1000, '& td': { py: 0.5, fontSize: '0.85rem', border: 'none', borderBottom: '1px solid #e0e0e0' }, '& th': { py: 0.5, fontSize: '0.85rem', border: 'none', borderBottom: '1px solid #e0e0e0' } }}>
                            <TableHead sx={{ bgcolor: 'background.default' }}>
                                <TableRow>
                                    <TableCell width="37%" sx={{ bgcolor: 'background.default', left: 0, position: { xs: 'static', md: 'sticky' }, zIndex: 2, borderRight: '1px solid #e0e0e0' }}>
                                        <TableSortLabel
                                            active={orderBy === 'task'}
                                            direction={orderBy === 'task' ? order : 'asc'}
                                            onClick={() => handleRequestSort('task')}
                                        >
                                            Tarea
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell width="12%" sx={{ bgcolor: 'background.default', left: '37%', position: { xs: 'static', md: 'sticky' }, zIndex: 2, borderLeft: '1px solid #e0e0e0' }}>
                                        <TableSortLabel
                                            active={orderBy === 'type'}
                                            direction={orderBy === 'type' ? order : 'asc'}
                                            onClick={() => handleRequestSort('type')}
                                        >
                                            Tipo
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell width="1%" align="center" sx={{ borderRight: '1px solid #e0e0e0' }}>
                                        <TableSortLabel
                                            active={orderBy === 'seg'}
                                            direction={orderBy === 'seg' ? order : 'asc'}
                                            onClick={() => handleRequestSort('seg')}
                                        >
                                            SEG
                                        </TableSortLabel>
                                    </TableCell>
                                    {weekDays.map((d, i) => (
                                        <TableCell width="8%" key={d.label} align="center" sx={{ textTransform: 'capitalize', borderLeft: i === 0 ? '1px solid #e0e0e0 !important' : 'none !important', borderRight: i === weekDays.length - 1 ? '1px solid #e0e0e0 !important' : 'none !important' }}>
                                            {d.label.split(' ')[0]}
                                        </TableCell>
                                    ))}
                                    <TableCell width="5%" align="right" sx={{ fontWeight: 'bold', borderLeft: '1px solid #e0e0e0', pr: 1 }}>Total</TableCell>
                                    <TableCell width="2%" align="left" sx={{ pl: 0 }}></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {sortedAndFilteredImputations.map(imp => {
                                    const task = tasks.find(t => t.id === imp.taskId);
                                    const typeConfig = taskTypes.find(t => t.id === imp.type);
                                    // Row color always white as per design, type color is only for the chip
                                    const rowColor = 'background.paper';

                                    return (

                                        <TableRow key={imp.id} sx={{ height: '45px', bgcolor: rowColor, '&:hover': { bgcolor: '#fafafa' }, '& td': { border: 'none', borderBottom: '1px solid #e0e0e0', py: '0 !important' } }}>
                                            <TableCell sx={{ left: 0, position: { xs: 'static', md: 'sticky' }, bgcolor: 'background.paper', zIndex: 1, maxWidth: '400px', borderRight: '1px solid #e0e0e0' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Box sx={{ display: 'flex', flexShrink: 0 }}>
                                                        <IconButton
                                                            onClick={() => setTaskDescription(task)}
                                                            size="small"
                                                            color="info"
                                                            sx={{ p: 0.5 }}
                                                        >
                                                            <InfoOutlined fontSize="small" />
                                                        </IconButton>
                                                        {imp.status !== 'APPROVED' && (
                                                            <Tooltip title={imp.note || "Añadir nota"}>
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => handleOpenNote(imp)}
                                                                    color={imp.note ? "primary" : "default"}
                                                                    sx={{ p: 0.5 }}
                                                                >
                                                                    <Comment fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        )}
                                                    </Box>
                                                    <Tooltip title={
                                                        <Box>
                                                            <Typography variant="body2">{task?.name}</Typography>
                                                            {task?.utes > 0 && (
                                                                <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#ffcc80' }}>
                                                                    UTES: {(() => {
                                                                        const totalConsumed = imputations
                                                                            .filter(i => i.taskId === task.id)
                                                                            .reduce((acc, curr) => {
                                                                                const typeInfo = taskTypes.find(t => t.id === curr.type);
                                                                                if (typeInfo && typeInfo.subtractsFromBudget === false) return acc;
                                                                                return acc + Object.values(curr.hours).reduce((a, b) => a + (Number(b) || 0), 0);
                                                                            }, 0);
                                                                        const remaining = task.utes - totalConsumed;
                                                                        return (
                                                                            <span style={{ color: remaining < 0 ? '#ff5252' : 'inherit', fontWeight: remaining < 0 ? 'bold' : 'normal' }}>
                                                                                {remaining.toLocaleString('es-ES', { maximumFractionDigits: 1 })} disponibles / {task.utes}
                                                                            </span>
                                                                        );
                                                                    })()}
                                                                </Typography>
                                                            )}
                                                        </Box>
                                                    }>
                                                        <Box sx={{ minWidth: 0, flex: 1 }}>
                                                            <Typography variant="body2" noWrap sx={{ fontWeight: 'medium' }}>
                                                                {task?.code === 'Estructural' ? 'Estructural' : `${task?.hito || '-'} - ${task?.description || task?.name}`}
                                                            </Typography>
                                                            {task?.utes > 0 && (
                                                                <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                                                                    <Tooltip title="UTES Pendientes de Imputar">
                                                                        <Typography variant="caption" sx={{ color: 'text.secondary', bgcolor: 'rgba(0,0,0,0.05)', px: 0.5, borderRadius: 0.5 }}>
                                                                            {(() => {
                                                                                const taskImputations = imputations.filter(i => i.taskId === task.id);
                                                                                const preImputedTotal = taskImputations.reduce((sum, imp) => {
                                                                                    return imp.type === 'PRE_IMPUTADO' ? sum + Object.values(imp.hours).reduce((a, b) => a + (Number(b) || 0), 0) : sum;
                                                                                }, 0);
                                                                                const yaImputadoTotal = taskImputations.reduce((sum, imp) => {
                                                                                    return imp.type === 'YA_IMPUTADO' ? sum + Object.values(imp.hours).reduce((a, b) => a + (Number(b) || 0), 0) : sum;
                                                                                }, 0);
                                                                                const preRemaining = preImputedTotal - yaImputadoTotal;

                                                                                return (
                                                                                    <span style={{ color: preRemaining < 0 ? '#d32f2f' : (preRemaining > 0 ? '#2e7d32' : 'inherit'), fontWeight: preRemaining !== 0 ? 'bold' : 'normal' }}>
                                                                                        {preRemaining.toFixed(1)} Preimputadas
                                                                                    </span>
                                                                                );
                                                                            })()}
                                                                        </Typography>
                                                                    </Tooltip>

                                                                    <Tooltip title="UTES Preimputadas Disponibles">
                                                                        <Typography variant="caption" sx={{ color: 'text.secondary', bgcolor: 'rgba(0,0,0,0.05)', px: 0.5, borderRadius: 0.5 }}>
                                                                            {(() => {
                                                                                const taskImputations = imputations.filter(i => i.taskId === task.id);
                                                                                const preImputedTotal = taskImputations.reduce((sum, imp) => {
                                                                                    return imp.type === 'PRE_IMPUTADO' ? sum + Object.values(imp.hours).reduce((a, b) => a + (Number(b) || 0), 0) : sum;
                                                                                }, 0);
                                                                                const yaImputadoTotal = taskImputations.reduce((sum, imp) => {
                                                                                    return imp.type === 'YA_IMPUTADO' ? sum + Object.values(imp.hours).reduce((a, b) => a + (Number(b) || 0), 0) : sum;
                                                                                }, 0);
                                                                                const preRemaining = preImputedTotal - yaImputadoTotal;

                                                                                return (
                                                                                    <span style={{ color: preRemaining < 0 ? '#d32f2f' : (preRemaining > 0 ? '#2e7d32' : 'inherit'), fontWeight: preRemaining !== 0 ? 'bold' : 'normal' }}>
                                                                                        {preRemaining.toFixed(1)} Preimputadas
                                                                                    </span>
                                                                                );
                                                                            })()}
                                                                        </Typography>
                                                                    </Tooltip>
                                                                </Box>
                                                            )}
                                                        </Box>
                                                    </Tooltip>
                                                </Box>
                                            </TableCell>
                                            <TableCell sx={{ left: '37%', position: { xs: 'static', md: 'sticky' }, bgcolor: 'background.paper', zIndex: 1, p: '4px !important', borderLeft: '1px solid #e0e0e0' }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                                    <FormControl size="small" variant="standard" sx={{ width: '130px' }}>
                                                        <Select
                                                            value={imp.type}
                                                            onChange={(e) => updateField(imp, 'type', e.target.value)}
                                                            disabled={isLocked}
                                                            disableUnderline
                                                            sx={{
                                                                fontSize: '0.75rem',
                                                                bgcolor: typeConfig?.color || '#eee',
                                                                borderRadius: 1,
                                                                px: 1,
                                                                py: 0.2, // Compact
                                                                textAlign: 'center',
                                                                fontWeight: 'medium',
                                                                color: 'text.primary',
                                                                '& .MuiSelect-select': { pr: '24px !important', display: 'flex', justifyContent: 'center' },
                                                                '& .MuiSvgIcon-root': { display: isLocked ? 'none' : 'block' }
                                                            }}
                                                        >
                                                            {taskTypes.filter(t => {
                                                                const isStructural = task?.code === 'Estructural';
                                                                // Dynamic check for structural or not
                                                                // If t.structural is defined, use it.
                                                                if (t.structural !== undefined) {
                                                                    return isStructural ? t.structural : !t.structural;
                                                                }

                                                                // Fallback to ID check if property not set correctly yet
                                                                if (isStructural) {
                                                                    return ['SIN_PROYECTO', 'VACACIONES', 'ENFERMEDAD', 'FESTIVO', 'BAJA', 'OTROS'].includes(t.id);
                                                                } else {
                                                                    return ['TRABAJADO', 'JIRA', 'YA_IMPUTADO', 'PRE_IMPUTADO', 'PENDIENTE', 'REGULARIZADO', 'RECUPERADO'].includes(t.id);
                                                                }
                                                            }).map(t => <MenuItem key={t.id} value={t.id}>{t.label}</MenuItem>)}
                                                        </Select>
                                                    </FormControl>
                                                </Box>
                                            </TableCell>
                                            <TableCell align="center" sx={{ borderRight: '1px solid #e0e0e0' }}>
                                                <Checkbox
                                                    checked={imp.seg}
                                                    onChange={(e) => updateField(imp, 'seg', e.target.checked)}
                                                    disabled={isLocked}
                                                    size="small"
                                                />
                                            </TableCell>
                                            {weekDays.map((d, i) => {
                                                const dayKey = dayKeys[i];
                                                return (
                                                    <TableCell key={d.label} align="center" sx={{ p: '2px !important', borderLeft: i === 0 ? '1px solid #e0e0e0 !important' : 'none !important', borderRight: i === weekDays.length - 1 ? '1px solid #e0e0e0 !important' : 'none !important' }}>
                                                        <InputBase
                                                            value={imp.hours[dayKey] === 0 ? '' : imp.hours[dayKey]}
                                                            placeholder="-"
                                                            onChange={(e) => updateHours(imp, dayKey, e.target.value)}
                                                            disabled={isLocked}
                                                            inputProps={{
                                                                min: 0,
                                                                max: 24,
                                                                step: 0.5,
                                                                style: { textAlign: 'center' }
                                                            }}
                                                            sx={{
                                                                width: '40px', // Fixed width
                                                                height: '32px', // Consistency
                                                                margin: '0 auto', // Center in cell
                                                                fontSize: '0.85rem',
                                                                border: '1px solid #e0e0e0', // Subtle border
                                                                borderRadius: 1, // Rounded corners
                                                                bgcolor: isLocked ? 'transparent' : '#fff',
                                                                '&:hover': {
                                                                    borderColor: isLocked ? '#e0e0e0' : 'primary.main',
                                                                },
                                                                '& input': { textAlign: 'center', cursor: isLocked ? 'default' : 'text', py: 0.5 },
                                                                '& input::placeholder': { color: '#ccc', opacity: 1 },
                                                                '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
                                                                    '-webkit-appearance': 'none',
                                                                    margin: 0,
                                                                },
                                                                '& input[type=number]': {
                                                                    '-moz-appearance': 'textfield',
                                                                },
                                                            }}
                                                        />
                                                    </TableCell>
                                                );
                                            })}
                                            <TableCell align="right" sx={{ fontWeight: 'bold', borderLeft: '1px solid #e0e0e0', pr: 1 }}>
                                                {Object.values(imp.hours).reduce((a, b) => a + b, 0)}h
                                            </TableCell>
                                            <TableCell align="left" sx={{ pl: 0 }}>
                                                {!isLocked && (
                                                    <IconButton onClick={() => deleteImputation(imp.id)} size="small" color="error">
                                                        <DeleteOutline fontSize="small" />
                                                    </IconButton>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}

                                {/* Totals */}
                                <TableRow sx={{ bgcolor: 'grey.100', borderTop: '2px solid #e0e0e0' }}>
                                    <TableCell colSpan={3} align="right" sx={{ fontWeight: 'bold' }}>Totales Semanales:</TableCell>
                                    {dayKeys.map(day => (
                                        <TableCell key={day} align="center" sx={{ fontWeight: 'bold' }}>{dailyTotals[day]}</TableCell>
                                    ))}
                                    <TableCell align="center" sx={{ color: 'primary.main', fontWeight: 'bold', fontSize: '1.1rem' }}>
                                        {grandTotal}h
                                    </TableCell>
                                    <TableCell />
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>
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
