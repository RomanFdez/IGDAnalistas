import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { format, startOfWeek, addWeeks, subWeeks, addDays, getISOWeek, getYear } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    Box, Typography, Paper, IconButton, Button, Select, MenuItem,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, TextField,
    FormControl, Checkbox, InputBase, Tooltip, Link, Chip, Alert, Dialog
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
    ChevronLeft, ChevronRight, Lock, LockOpen, Add, DeleteOutline, AddCircleOutline, Search, InfoOutlined
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

    const [currentWeekStart, setCurrentWeekStart] = useState(
        startOfWeek(new Date(), { weekStartsOn: 1 })
    );

    const weekId = useMemo(() => {
        return `${getYear(currentWeekStart)}-W${getISOWeek(currentWeekStart)}`;
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

    const handlePrevWeek = () => setCurrentWeekStart(d => subWeeks(d, 1));
    const handleNextWeek = () => setCurrentWeekStart(d => addWeeks(d, 1));

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
            {/* Header */}
            <Paper elevation={0} variant="outlined" sx={{ p: 2, mb: 3, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <IconButton onClick={handlePrevWeek} size="small" sx={{ border: '1px solid #ddd' }}><ChevronLeft /></IconButton>
                    <Box sx={{ textAlign: 'center', minWidth: 150 }}>
                        <Typography variant="h6" sx={{ textTransform: 'capitalize', fontWeight: 'bold' }}>
                            {format(currentWeekStart, 'MMMM yyyy', { locale: es })}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Semana {getISOWeek(currentWeekStart)}
                        </Typography>
                    </Box>
                    <IconButton onClick={handleNextWeek} size="small" sx={{ border: '1px solid #ddd' }}><ChevronRight /></IconButton>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    {isLocked && (
                        <Chip icon={<Lock />} label="Semana Bloqueada" color="error" variant="outlined" />
                    )}

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 0.5, border: '1px solid #ddd', borderRadius: 2, bgcolor: 'background.default' }}>
                        {myTasks.length > 0 ? (
                            <Select
                                value={selectedTaskId}
                                onChange={e => setSelectedTaskId(e.target.value)}
                                disabled={isLocked}
                                displayEmpty
                                variant="standard"
                                disableUnderline
                                sx={{ minWidth: 200, px: 2, fontSize: '0.875rem' }}
                            >
                                <MenuItem value=""><em>Seleccionar Tarea...</em></MenuItem>
                                {myTasks.map(t => <MenuItem key={t.id} value={t.id}>{t.code} - {t.name}</MenuItem>)}
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
                        >
                            <Add />
                        </Button>

                        <Button
                            onClick={() => setOpenTaskDialog(true)}
                            size="small"
                            sx={{ minWidth: 0, textTransform: 'none', fontWeight: 'bold' }}
                        >
                            + Tarea
                        </Button>
                    </Box>
                </Box>
            </Paper>

            <TaskFormDialog
                open={openTaskDialog}
                onClose={() => setOpenTaskDialog(false)}
                onTaskCreated={() => {
                    // Optional: Select the new task automatically? 
                    // For now just close, user will see it in list.
                }}
            />

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
                    />
                </Box>
            )}

            {/* Main Table */}
            <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ overflow: 'hidden' }}>
                <Table size="small">
                    <TableHead sx={{ bgcolor: 'background.default' }}>
                        <TableRow>
                            <TableCell width="30%">
                                <TableSortLabel
                                    active={orderBy === 'task'}
                                    direction={orderBy === 'task' ? order : 'asc'}
                                    onClick={() => handleRequestSort('task')}
                                >
                                    Tarea
                                </TableSortLabel>
                            </TableCell>
                            <TableCell width="15%">
                                <TableSortLabel
                                    active={orderBy === 'type'}
                                    direction={orderBy === 'type' ? order : 'asc'}
                                    onClick={() => handleRequestSort('type')}
                                >
                                    Tipo
                                </TableSortLabel>
                            </TableCell>
                            <TableCell width="5%" align="center">
                                <TableSortLabel
                                    active={orderBy === 'seg'}
                                    direction={orderBy === 'seg' ? order : 'asc'}
                                    onClick={() => handleRequestSort('seg')}
                                >
                                    SEG
                                </TableSortLabel>
                            </TableCell>
                            {weekDays.map(d => (
                                <TableCell key={d.label} align="center" sx={{ textTransform: 'capitalize' }}>
                                    {d.label.split(' ')[0]}
                                </TableCell>
                            ))}
                            <TableCell width="8%" align="center" sx={{ fontWeight: 'bold' }}>Total</TableCell>
                            <TableCell width="5%"></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sortedAndFilteredImputations.map(imp => {
                            const task = tasks.find(t => t.id === imp.taskId);
                            const typeConfig = taskTypes.find(t => t.id === imp.type);
                            // Use custom theme colors - wait, theme.palette.taskTypes is static. 
                            // We need to use typeConfig.color if available, or fallback to theme.
                            const rowColor = typeConfig?.color || theme.palette.taskTypes[imp.type] || '#fff';

                            return (
                                <TableRow key={imp.id} sx={{ bgcolor: rowColor, '&:hover': { filter: 'brightness(0.98)' } }}>
                                    <TableCell sx={{ display: 'flex', alignItems: 'center' }}>
                                        <IconButton
                                            onClick={() => setTaskDescription(task)}
                                            size="small"
                                            color="info"
                                            sx={{ mr: 1 }}
                                        >
                                            <InfoOutlined fontSize="small" />
                                        </IconButton>
                                        <Tooltip title="Ver descripción">
                                            <Typography variant="body2" noWrap sx={{ maxWidth: 250, fontWeight: 'medium' }}>
                                                {task?.code} - {task?.name}
                                            </Typography>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell>
                                        <FormControl fullWidth size="small" variant="standard">
                                            <Select
                                                value={imp.type}
                                                onChange={(e) => updateField(imp, 'type', e.target.value)}
                                                disabled={isLocked}
                                                disableUnderline
                                                sx={{ fontSize: '0.875rem' }}
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
                                    </TableCell>
                                    <TableCell align="center">
                                        <Checkbox
                                            checked={imp.seg}
                                            onChange={(e) => updateField(imp, 'seg', e.target.checked)}
                                            disabled={isLocked}
                                            size="small"
                                        />
                                    </TableCell>
                                    {dayKeys.map(day => (
                                        <TableCell key={day} align="center" sx={{ p: 0.5 }}>
                                            <InputBase
                                                value={imp.hours[day] || ''}
                                                onChange={(e) => updateHours(imp, day, e.target.value)}
                                                disabled={isLocked}
                                                type="number"
                                                inputProps={{ min: 0, max: 24, step: 0.5, style: { textAlign: 'center' } }}
                                                sx={{
                                                    bgcolor: 'rgba(255,255,255,0.6)',
                                                    borderRadius: 1,
                                                    fontSize: '0.9rem',
                                                    width: '100%',
                                                    '&.Mui-focused': { bgcolor: '#fff', boxShadow: 1 },
                                                    // Hide Spinners
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
                                    ))}
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                                        {Object.values(imp.hours).reduce((a, b) => a + b, 0)}h
                                    </TableCell>
                                    <TableCell align="center">
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

            {/* Task Description Dialog */}
            <Dialog open={!!taskDescription} onClose={() => setTaskDescription(null)} maxWidth="xs" fullWidth>
                <Box sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                        {taskDescription?.code} - {taskDescription?.name}
                    </Typography>
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
                            const worked = totalsByType.find(t => t.type.id === 'TRABAJADO_JIRA')?.total || 0;
                            const target = 40;
                            const diff = worked - target;
                            const progress = Math.min((worked / target) * 100, 100);

                            let statusColor = 'warning.main';
                            let statusText = `Te faltan ${Math.abs(diff)}h`;
                            let statusIcon = "⏳";

                            if (worked > 40) {
                                statusColor = 'error.main';
                                statusText = `Exceso: +${diff}h`;
                                statusIcon = "⚠️";
                            } else if (worked === 40) {
                                statusColor = 'success.main';
                                statusText = "Objetivo cumplido.";
                                statusIcon = "✅";
                            }

                            return (
                                <Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                                            HORAS TRABAJADAS
                                        </Typography>
                                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: statusColor }}>
                                            {worked} / {target} h
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
                                                {worked < 40 ? 'Completa tu jornada semanal' : worked > 40 ? 'Revisa tus horas extras' : 'semana completa'}
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
