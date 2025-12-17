import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import {
    format, startOfWeek, getISOWeek, getYear, getMonth,
    startOfMonth, endOfMonth, eachWeekOfInterval, setISOWeek, startOfYear
} from 'date-fns';
import { es } from 'date-fns/locale';
import { useTheme } from '@mui/material/styles';
import {
    Box, Typography, Button, Paper, Grid, Card, CardContent, Divider,
    Table, TableBody, TableCell, TableHead, TableRow, Avatar, IconButton,
    Alert, Chip, Dialog, Tooltip, FormControl, InputLabel, Select, MenuItem, TextField, Checkbox
} from '@mui/material';
import {
    Lock, LockOpen, Download, ChevronLeft, ChevronRight, Person, InfoOutlined, Search
} from '@mui/icons-material';
import * as XLSX from 'xlsx';

export default function Approvals() {
    const { user, USERS } = useAuth();
    const { imputations, isWeekLocked, toggleWeekLock, tasks, taskTypes, addOrUpdateImputation } = useData();
    const theme = useTheme();

    // Selector State
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedWeek, setSelectedWeek] = useState(getISOWeek(new Date()));
    const [selectedAnalystId, setSelectedAnalystId] = useState(''); // '' means All

    const [taskDescription, setTaskDescription] = useState(null);

    // Initial load: Ensure selectedWeek matches current date (already set in initial state, 
    // but useful if we wanted to sync 'Month' correctly if week spans months).
    // For simplicity, initial state capture is enough for "default to current".

    // Calculate derived values
    const years = useMemo(() => {
        const current = new Date().getFullYear();
        return Array.from({ length: 3 }, (_, i) => current - i + 1).sort((a, b) => b - a); // Next Year, Current, Last
    }, []);

    const months = [
        { val: 0, label: 'Enero' }, { val: 1, label: 'Febrero' }, { val: 2, label: 'Marzo' },
        { val: 3, label: 'Abril' }, { val: 4, label: 'Mayo' }, { val: 5, label: 'Junio' },
        { val: 6, label: 'Julio' }, { val: 7, label: 'Agosto' }, { val: 8, label: 'Septiembre' },
        { val: 9, label: 'Octubre' }, { val: 10, label: 'Noviembre' }, { val: 11, label: 'Diciembre' }
    ];

    const availableWeeks = useMemo(() => {
        const start = startOfMonth(new Date(selectedYear, selectedMonth));
        const end = endOfMonth(start);

        return eachWeekOfInterval({ start, end }, { weekStartsOn: 1 }).map(d => {
            const w = getISOWeek(d);
            return {
                val: w,
                label: `Semana ${w} (${format(startOfWeek(d, { weekStartsOn: 1 }), 'd MMM', { locale: es })} - ${format(addDays(startOfWeek(d, { weekStartsOn: 1 }), 4), 'd MMM', { locale: es })})`
            };
        });

        // helper to get friday date for display label? 
        // eachWeekOfInterval returns the mondays (or start of week).
        function addDays(date, days) {
            const result = new Date(date);
            result.setDate(result.getDate() + days);
            return result;
        }
    }, [selectedYear, selectedMonth]);

    // Safety: If selectedWeek is not in availableWeeks (e.g. changing month), reset to first available
    useEffect(() => {
        if (availableWeeks.length > 0) {
            const exists = availableWeeks.find(w => w.val === selectedWeek);
            if (!exists) {
                setSelectedWeek(availableWeeks[0].val);
            }
        }
    }, [availableWeeks, selectedWeek]);


    const weekId = `${selectedYear}-W${selectedWeek}`; // Simple construction. 
    // Note: Edge case around year boundaries (e.g. Week 1 of 2025 starting in Dec 2024) 
    // is handled by ISO week year logic usually, but here we strictly compose YYYY-Www. 
    // Our DataContext expects this format.

    const isLocked = isWeekLocked(weekId);
    const weekImputations = imputations.filter(i => i.weekId === weekId);

    // Filter Analysts
    const allAnalysts = USERS.filter(u => u.roles.includes('ANALYST')).sort((a, b) => a.name.localeCompare(b.name));
    const usersWithData = selectedAnalystId
        ? allAnalysts.filter(u => u.id === selectedAnalystId)
        : allAnalysts;

    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'task', direction: 'asc' });

    const handleSort = (key) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const userSummaries = usersWithData.map(u => {
        const userImps = weekImputations.filter(i => i.userId === u.id);

        // Calculate Totals based on 'computesInWeek'
        let computable = 0;
        let otherTotal = 0;
        let otherBreakdown = {};

        userImps.forEach(i => {
            const total = Object.values(i.hours).reduce((a, b) => a + b, 0);
            const typeConfig = taskTypes.find(t => t.id === i.type);

            // Default to true if property is missing (for backward compatibility), 
            // unless explicitly false.
            const isComputable = typeConfig?.computesInWeek !== false;

            if (isComputable) {
                computable += total;
            } else {
                otherTotal += total;
                otherBreakdown[i.type] = (otherBreakdown[i.type] || 0) + total;
            }
        });
        const totalHours = computable + otherTotal;

        // Enhance & Filter
        let enhancedImps = userImps.map(imp => {
            const t = tasks.find(task => task.id === imp.taskId);
            return { ...imp, task: t };
        }).filter(imp => {
            if (!searchTerm) return true;
            const term = searchTerm.toLowerCase();
            return imp.task?.code.toLowerCase().includes(term) || imp.task?.name.toLowerCase().includes(term) || imp.task?.hito?.toLowerCase().includes(term);
        });

        // SORTING LOGIC FOR LIST DISPLAY (Widget Order Requirement: Worked > Jira > Others Alpha)
        // However, user also requested "Permite ordenar por Tarea y por Tipo".
        // This implies the Table sort overrides the default grouping? 
        // User request: "En el widget... primero deben salir las de tipo Trabajdo... luego...". 
        // AND "Permite ordenar por Tarea y por Tipo".
        // Usually explicit sort overrides default view. I will implement default sort as requested, 
        // but if user clicks headers, it sorts by that.

        enhancedImps.sort((a, b) => {
            // 1. Dynamic Sort (User Interaction)
            if (sortConfig.key) {
                let valA, valB;
                if (sortConfig.key === 'task') {
                    // Sort by Hito - Name as requested for display
                    const hitoA = a.task?.hito || '';
                    const hitoB = b.task?.hito || '';
                    const nameA = a.task?.name || '';
                    const nameB = b.task?.name || '';
                    valA = `${hitoA} - ${nameA}`;
                    valB = `${hitoB} - ${nameB}`;
                } else if (sortConfig.key === 'type') {
                    valA = a.type;
                    valB = b.type;
                }

                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0; // Fallback to default if equal
            }

            // 2. Default Sort (Requirement: Trabajado > Jira > Others Alpha by Label)
            const typePriority = { 'TRABAJADO': 0, 'JIRA': 1 };
            const pA = typePriority[a.type] !== undefined ? typePriority[a.type] : 2;
            const pB = typePriority[b.type] !== undefined ? typePriority[b.type] : 2;

            if (pA !== pB) return pA - pB;

            // If both are priority 2 (Others), sort by Type Label Alpha
            if (pA === 2) {
                const labelA = taskTypes.find(t => t.id === a.type)?.label || '';
                const labelB = taskTypes.find(t => t.id === b.type)?.label || '';
                if (labelA !== labelB) return labelA.localeCompare(labelB);
            }

            // Finally by Task Hito (replacing Code)
            return (a.task?.hito || '').localeCompare(b.task?.hito || '');
        });

        return { user: u, totalHours, computable, other: otherTotal, otherBreakdown, imputations: enhancedImps };
    });

    const handleExportExcel = () => {
        const exportData = weekImputations.map(imp => {
            const u = USERS.find(u => u.id === imp.userId);
            const t = tasks.find(t => t.id === imp.taskId);
            return {
                Semana: weekId,
                Analista: u?.name || 'Unknown',
                Hito: t?.hito,
                CodigoTarea: t?.code,
                NombreTarea: t?.name,
                Tipo: imp.type,
                Lunes: imp.hours.mon,
                Martes: imp.hours.tue,
                Miercoles: imp.hours.wed,
                Jueves: imp.hours.thu,
                Viernes: imp.hours.fri,
                Total: Object.values(imp.hours).reduce((a, b) => a + b, 0),
                Seguimiento: imp.seg ? 'SI' : 'NO',
                Aprobado: imp.approved ? 'SI' : 'NO'
            };
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Imputaciones");
        XLSX.writeFile(wb, `Imputaciones_${weekId}.xlsx`);
    };

    const handleToggleApproved = async (imp, isApproved) => {
        await addOrUpdateImputation({ ...imp, approved: isApproved });
    };

    if (!user.roles.includes('APPROVER')) return <Alert severity="error">Acceso denegado</Alert>;

    return (
        <Box sx={{ animate: 'fade-in' }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2 }}>
                <Box>
                    <Typography variant="h5" color="text.primary">Aprobaciones</Typography>
                    <Typography variant="body2" color="text.secondary">Revisión y cierre de semanas</Typography>
                </Box>

                <Paper variant="outlined" sx={{ display: 'flex', alignItems: 'center', p: 1, gap: 2, borderRadius: 2, bgcolor: 'background.paper' }}>
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                        <InputLabel>Año</InputLabel>
                        <Select value={selectedYear} label="Año" onChange={e => setSelectedYear(e.target.value)}>
                            {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                        </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Mes</InputLabel>
                        <Select value={selectedMonth} label="Mes" onChange={e => setSelectedMonth(e.target.value)}>
                            {months.map(m => <MenuItem key={m.val} value={m.val}>{m.label}</MenuItem>)}
                        </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Semana</InputLabel>
                        <Select
                            value={selectedWeek}
                            label="Semana"
                            onChange={e => setSelectedWeek(e.target.value)}
                            disabled={availableWeeks.length === 0}
                        >
                            {availableWeeks.map(w => (
                                <MenuItem key={w.val} value={w.val}>{w.label}</MenuItem>
                            ))}
                            {availableWeeks.length === 0 && <MenuItem value="">Sin semanas</MenuItem>}
                        </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Analista</InputLabel>
                        <Select
                            value={selectedAnalystId}
                            label="Analista"
                            onChange={e => setSelectedAnalystId(e.target.value)}
                        >
                            <MenuItem value=""><em>Todos los analistas</em></MenuItem>
                            {allAnalysts.map(u => (
                                <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Paper>
            </Box>

            {/* Actions Grid */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {/* Search Widget */}
                <Grid item xs={12} md={5}>
                    <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <TextField
                                placeholder="Buscar tarea por hito, código o nombre..."
                                size="small"
                                fullWidth
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                InputProps={{ startAdornment: <Search sx={{ color: 'text.secondary', mr: 1 }} /> }}
                                variant="outlined"
                                sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'background.default' } }}
                            />
                        </CardContent>
                    </Card>
                </Grid>

                {/* Week Status Widget */}
                <Grid item xs={12} md={4}>
                    <Card
                        variant="outlined"
                        sx={{
                            height: '100%',
                            bgcolor: isLocked ? 'error.lighter' : 'success.lighter',
                            borderColor: isLocked ? 'error.main' : 'success.main',
                            borderWidth: 1
                        }}
                    >
                        <CardContent sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', gap: 2 }}>
                            <Box sx={{ mb: { xs: 2, sm: 0 } }}>
                                <Typography variant="h6" color={isLocked ? 'error.main' : 'success.main'} fontWeight="bold">
                                    {isLocked ? 'Semana Cerrada' : 'Semana Abierta'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {isLocked ? 'Los analistas no pueden editar' : 'Edición permitida'}
                                </Typography>
                            </Box>
                            <Button
                                variant="contained"
                                color={isLocked ? 'error' : 'success'}
                                onClick={() => toggleWeekLock(weekId)}
                                startIcon={isLocked ? <Lock /> : <LockOpen />}
                                fullWidth={false}
                                sx={{ width: { xs: '100%', sm: 'auto' } }}
                            >
                                {isLocked ? 'Abrir' : 'Cerrar'}
                            </Button>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Export Widget */}
                <Grid item xs={12} md={3}>
                    <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, display: 'flex', justifyContent: 'center' }}>
                            <Button
                                variant="outlined"
                                onClick={handleExportExcel}
                                startIcon={<Download />}
                                fullWidth
                                color="success"
                            >
                                Exportar Excel
                            </Button>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Analysts Grid */}
            <Grid container spacing={3}>
                {!selectedAnalystId ? (
                    <>
                        {/* SUMMARY TABLE OF HOURS PER ANALYST */}
                        <Grid item xs={12}>
                            <Card variant="outlined" sx={{ borderRadius: 2 }}>
                                <Box sx={{ p: 2, bgcolor: 'background.default', borderBottom: '1px solid #eee' }}>
                                    <Typography variant="subtitle2" fontWeight="bold">Resumen de Horas por Analista</Typography>
                                </Box>
                                <Box sx={{ p: 0 }}>
                                    {(() => {
                                        // 1. Identify all non-computable types that have at least one entry > 0 across all summaries
                                        const otherTypesSet = new Set();
                                        userSummaries.forEach(s => {
                                            if (s.otherBreakdown) {
                                                Object.keys(s.otherBreakdown).forEach(typeId => otherTypesSet.add(typeId));
                                            }
                                        });
                                        const otherTypesPresent = Array.from(otherTypesSet).sort();

                                        return (
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell>Analista</TableCell>
                                                        <TableCell align="center">Horas Computables</TableCell>
                                                        {otherTypesPresent.map(typeId => {
                                                            const label = taskTypes.find(t => t.id === typeId)?.label || typeId;
                                                            return <TableCell key={typeId} align="center">{label}</TableCell>;
                                                        })}
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {userSummaries.sort((a, b) => a.user.name.localeCompare(b.user.name)).map(summary => (
                                                        <TableRow key={summary.user.id}>
                                                            <TableCell sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                                <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>{summary.user.name.charAt(0)}</Avatar>
                                                                <Typography variant="body2">{summary.user.name}</Typography>
                                                            </TableCell>
                                                            <TableCell align="center">
                                                                <Tooltip title={`Horas Computables (${taskTypes.filter(t => t.computesInWeek !== false).map(t => t.label).join(', ')})`}>
                                                                    <Chip
                                                                        label={`${summary.computable}h`}
                                                                        color={summary.computable >= 40 ? 'success' : 'warning'}
                                                                        size="small"
                                                                        sx={{ fontWeight: 'bold' }}
                                                                    />
                                                                </Tooltip>
                                                            </TableCell>
                                                            {otherTypesPresent.map(typeId => {
                                                                const val = summary.otherBreakdown?.[typeId] || 0;
                                                                return (
                                                                    <TableCell key={typeId} align="center">
                                                                        {val > 0 ? (
                                                                            <Typography variant="caption" color="text.secondary">
                                                                                {val}h
                                                                            </Typography>
                                                                        ) : (
                                                                            <Typography variant="caption" color="text.disabled">-</Typography>
                                                                        )}
                                                                    </TableCell>
                                                                );
                                                            })}
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        );
                                    })()}
                                </Box>
                            </Card>
                        </Grid>

                        {/* UNIFIED VIEW: ALL ANALYSTS IMPUTATIONS */}
                        <Grid item xs={12}>
                            <Card variant="outlined" sx={{ borderRadius: 2 }}>
                                <Box sx={{ p: 2, bgcolor: 'background.default', borderBottom: '1px solid #eee' }}>
                                    <Typography variant="subtitle2" fontWeight="bold">Detalle de Imputaciones (Consolidado)</Typography>
                                    <Typography variant="caption" color="text.secondary">Todas las tareas de todos los analistas</Typography>
                                </Box>
                                <Box sx={{ p: 0 }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell
                                                    width="15%"
                                                    onClick={() => handleSort('analyst')}
                                                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                                                >
                                                    Analista {sortConfig.key === 'analyst' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                                </TableCell>
                                                <TableCell
                                                    width="35%"
                                                    onClick={() => handleSort('task')}
                                                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                                                >
                                                    Tarea {sortConfig.key === 'task' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                                </TableCell>
                                                <TableCell
                                                    width="10%"
                                                    onClick={() => handleSort('type')}
                                                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                                                >
                                                    Tipo {sortConfig.key === 'type' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                                </TableCell>
                                                <TableCell align="center" width="5%">SEG</TableCell>
                                                <TableCell align="center">L</TableCell>
                                                <TableCell align="center">M</TableCell>
                                                <TableCell align="center">X</TableCell>
                                                <TableCell align="center">J</TableCell>
                                                <TableCell align="center">V</TableCell>
                                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Total</TableCell>
                                                <TableCell align="center">OK</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {userSummaries.flatMap(s => s.imputations.map(i => ({ ...i, userName: s.user.name }))).length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={11} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                                        Sin imputaciones registradas.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                userSummaries.flatMap(s => s.imputations.map(i => ({ ...i, userName: s.user.name })))
                                                    .sort((a, b) => {
                                                        if (sortConfig.key === 'analyst') {
                                                            const res = a.userName.localeCompare(b.userName);
                                                            return sortConfig.direction === 'asc' ? res : -res;
                                                        }
                                                        // If sorting by task or type, rely on the values
                                                        if (sortConfig.key === 'task') {
                                                            const valA = `${a.task?.hito || ''} - ${a.task?.name || ''}`;
                                                            const valB = `${b.task?.hito || ''} - ${b.task?.name || ''}`;
                                                            const res = valA.localeCompare(valB);
                                                            if (res !== 0) return sortConfig.direction === 'asc' ? res : -res;
                                                        }
                                                        if (sortConfig.key === 'type') {
                                                            const res = a.type.localeCompare(b.type);
                                                            if (res !== 0) return sortConfig.direction === 'asc' ? res : -res;
                                                        }

                                                        // Default tie-breaker: Analyst Name -> Task Hito
                                                        const userRes = a.userName.localeCompare(b.userName);
                                                        if (userRes !== 0) return userRes;
                                                        return (a.task?.hito || '').localeCompare(b.task?.hito || '');
                                                    })
                                                    .map(imp => {
                                                        const total = Object.values(imp.hours).reduce((a, b) => a + b, 0);
                                                        const color = theme.palette.taskTypes[imp.type];
                                                        const typeLabel = taskTypes.find(t => t.id === imp.type)?.label;
                                                        const isApproved = imp.approved === true;

                                                        return (
                                                            <TableRow
                                                                key={imp.id}
                                                                sx={{
                                                                    bgcolor: color,
                                                                    '& .MuiTypography-root': { color: isApproved ? 'text.disabled' : 'inherit' },
                                                                    '& .MuiTableCell-root': { color: isApproved ? 'text.disabled' : 'inherit' }
                                                                }}
                                                            >
                                                                <TableCell sx={{ fontWeight: 'medium' }}>{imp.userName}</TableCell>
                                                                <TableCell
                                                                    sx={{ display: 'flex', alignItems: 'center', gap: 1, borderBottom: 'none' }}
                                                                >
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() => setTaskDescription(imp.task)}
                                                                        color={isApproved ? "default" : "info"}
                                                                    >
                                                                        <InfoOutlined fontSize="small" />
                                                                    </IconButton>
                                                                    <Box>
                                                                        <Typography variant="body2" fontWeight="medium">
                                                                            {imp.task?.code === 'Estructural' ? 'Estructural' : `${imp.task?.hito || '-'} - ${imp.task?.name}`}
                                                                        </Typography>
                                                                    </Box>
                                                                </TableCell>
                                                                <TableCell sx={{ fontSize: '0.75rem' }}>{typeLabel}</TableCell>
                                                                <TableCell align="center">
                                                                    <Checkbox
                                                                        checked={!!imp.seg}
                                                                        size="small"
                                                                        disabled
                                                                        sx={{ p: 0 }}
                                                                    />
                                                                </TableCell>
                                                                <TableCell align="center">{imp.hours.mon || '-'}</TableCell>
                                                                <TableCell align="center">{imp.hours.tue || '-'}</TableCell>
                                                                <TableCell align="center">{imp.hours.wed || '-'}</TableCell>
                                                                <TableCell align="center">{imp.hours.thu || '-'}</TableCell>
                                                                <TableCell align="center">{imp.hours.fri || '-'}</TableCell>
                                                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>{total}</TableCell>
                                                                <TableCell align="center">
                                                                    <Checkbox
                                                                        checked={isApproved}
                                                                        onChange={(e) => handleToggleApproved(imp, e.target.checked)}
                                                                        size="small"
                                                                        color="success"
                                                                        disabled={!isLocked}
                                                                    />
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })
                                            )}
                                        </TableBody>
                                    </Table>
                                </Box>
                            </Card>
                        </Grid>
                    </>
                ) : (
                    /* INDIVIDUAL CARDS VIEW */
                    usersWithData.map(u => {
                        const summary = userSummaries.find(s => s.user.id === u.id) || { user: u, totalHours: 0, workedAndJira: 0, other: 0, imputations: [] };
                        return (
                            <Grid item xs={12} key={u.id}>
                                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                                    <Box sx={{ p: 2, bgcolor: 'background.default', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>{u.name.charAt(0)}</Avatar>
                                            <Box>
                                                <Typography variant="subtitle2" fontWeight="bold">{u.name}</Typography>
                                                <Typography variant="caption" color="text.secondary">{summary.imputations.length} tareas</Typography>
                                            </Box>
                                        </Box>
                                        <Box sx={{ textAlign: 'right' }}>
                                            <Tooltip title={`Horas Computables (${taskTypes.filter(t => t.computesInWeek !== false).map(t => t.label).join(', ')})`}>
                                                <Chip
                                                    label={`${summary.computable}h`}
                                                    color={summary.computable >= 40 ? 'success' : 'warning'}
                                                    size="small"
                                                    sx={{ fontWeight: 'bold' }}
                                                />
                                            </Tooltip>
                                            {Object.entries(summary.otherBreakdown || {}).map(([typeId, hours]) => {
                                                const typeLabel = taskTypes.find(t => t.id === typeId)?.label || typeId;
                                                return (
                                                    <Typography key={typeId} variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                                                        {typeLabel}: {hours}h
                                                    </Typography>
                                                );
                                            })}
                                        </Box>
                                    </Box>

                                    <Box sx={{ p: 0 }}>
                                        {summary.imputations.length > 0 ? (
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell
                                                            width="40%"
                                                            onClick={() => handleSort('task')}
                                                            sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                                                        >
                                                            Tarea {sortConfig.key === 'task' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                                        </TableCell>
                                                        <TableCell
                                                            width="15%"
                                                            onClick={() => handleSort('type')}
                                                            sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                                                        >
                                                            Tipo {sortConfig.key === 'type' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                                        </TableCell>
                                                        <TableCell align="center" width="5%">SEG</TableCell>
                                                        <TableCell align="center">L</TableCell>
                                                        <TableCell align="center">M</TableCell>
                                                        <TableCell align="center">X</TableCell>
                                                        <TableCell align="center">J</TableCell>
                                                        <TableCell align="center">V</TableCell>
                                                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>Total</TableCell>
                                                        <TableCell align="center">OK</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {summary.imputations.map(imp => {
                                                        const total = Object.values(imp.hours).reduce((a, b) => a + b, 0);
                                                        const color = theme.palette.taskTypes[imp.type];
                                                        const typeLabel = taskTypes.find(t => t.id === imp.type)?.label;
                                                        const isApproved = imp.approved === true;
                                                        return (
                                                            <TableRow
                                                                key={imp.id}
                                                                sx={{
                                                                    bgcolor: color,
                                                                    '& .MuiTypography-root': { color: isApproved ? 'text.disabled' : 'inherit' },
                                                                    '& .MuiTableCell-root': { color: isApproved ? 'text.disabled' : 'inherit' }
                                                                }}
                                                            >
                                                                <TableCell
                                                                    sx={{ display: 'flex', alignItems: 'center', gap: 1, borderBottom: 'none' }}
                                                                >
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() => setTaskDescription(imp.task)}
                                                                        color={isApproved ? "default" : "info"}
                                                                    >
                                                                        <InfoOutlined fontSize="small" />
                                                                    </IconButton>
                                                                    <Box>
                                                                        <Typography variant="body2" fontWeight="medium">
                                                                            {imp.task?.code === 'Estructural' ? 'Estructural' : `${imp.task?.hito || '-'} - ${imp.task?.name}`}
                                                                        </Typography>
                                                                    </Box>
                                                                </TableCell>
                                                                <TableCell sx={{ fontSize: '0.75rem' }}>{typeLabel}</TableCell>
                                                                <TableCell align="center">
                                                                    <Checkbox
                                                                        checked={!!imp.seg}
                                                                        size="small"
                                                                        disabled
                                                                        sx={{ p: 0 }}
                                                                    />
                                                                </TableCell>
                                                                <TableCell align="center">{imp.hours.mon || '-'}</TableCell>
                                                                <TableCell align="center">{imp.hours.tue || '-'}</TableCell>
                                                                <TableCell align="center">{imp.hours.wed || '-'}</TableCell>
                                                                <TableCell align="center">{imp.hours.thu || '-'}</TableCell>
                                                                <TableCell align="center">{imp.hours.fri || '-'}</TableCell>
                                                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>{total}</TableCell>
                                                                <TableCell align="center">
                                                                    <Checkbox
                                                                        checked={isApproved}
                                                                        onChange={(e) => handleToggleApproved(imp, e.target.checked)}
                                                                        size="small"
                                                                        color="success"
                                                                        disabled={!isLocked}
                                                                    />
                                                                </TableCell>
                                                            </TableRow>
                                                        )
                                                    })}
                                                </TableBody>
                                            </Table>
                                        ) : (
                                            <Box sx={{ p: 3, textAlign: 'center' }}>
                                                <Typography variant="caption" color="text.secondary">Sin imputaciones {searchTerm ? 'que coincidan con la búsqueda' : 'registradas esta semana'}.</Typography>
                                            </Box>
                                        )}
                                    </Box>
                                </Card>
                            </Grid>
                        );
                    }))}
            </Grid>

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
        </Box>
    );
}
