import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import {
    Box, Typography, Paper, Grid, FormControl, InputLabel, Select, MenuItem,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Tabs, Tab, Checkbox
} from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

// Helper to get Year and Week Number from "2023-W01"
const parseWeekId = (weekId) => {
    const [yearStr, weekStr] = weekId.split('-W');
    return { year: parseInt(yearStr), week: parseInt(weekStr) };
};

// Helper: Get Month Index (0-11) from Week info roughly
const getMonthFromWeek = (year, week) => {
    const simpleDate = new Date(year, 0, 1 + (week - 1) * 7);
    return simpleDate.getMonth();
};

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function ImputationStatsTab() {
    const { imputations, taskTypes } = useData();
    const { USERS } = useAuth();

    // Filter States
    const currentYear = new Date().getFullYear();
    const [filterYear, setFilterYear] = useState(currentYear);
    const [filterMonth, setFilterMonth] = useState('ALL');
    const [filterWeek, setFilterWeek] = useState('ALL');

    // Processing Data
    const filteredData = useMemo(() => {
        return imputations.filter(imp => {
            const { year, week } = parseWeekId(imp.weekId);

            // Year Filter
            if (filterYear && year !== filterYear) return false;

            // Week Filter
            if (filterWeek !== 'ALL' && week !== filterWeek) return false;

            // Month Filter (Approximate: Week N in Year Y)
            if (filterMonth !== 'ALL') {
                const month = getMonthFromWeek(year, week);
                if (month !== filterMonth) return false;
            }

            return true;
        });
    }, [imputations, filterYear, filterMonth, filterWeek]);

    // Pivot Data: User -> { [TypeId]: hours, total: hours }
    const pivotData = useMemo(() => {
        const userMap = {};

        // Initialize all users
        USERS.forEach(u => {
            userMap[u.id] = {
                id: u.id,
                name: u.name,
                total: 0,
                byType: {}
            };
            taskTypes.forEach(t => userMap[u.id].byType[t.id] = 0);
        });

        filteredData.forEach(imp => {
            if (!userMap[imp.userId]) return; // Should not happen usually

            // Calculate total hours in this imputation
            const hours = Object.values(imp.hours).reduce((a, b) => a + (Number(b) || 0), 0);

            userMap[imp.userId].byType[imp.type] = (userMap[imp.userId].byType[imp.type] || 0) + hours;
            userMap[imp.userId].total += hours;
        });

        return Object.values(userMap);
    }, [filteredData, USERS, taskTypes]);

    // Chart Data: Total hours per Type (for the filtered period)
    const chartData = useMemo(() => {
        const data = taskTypes.map(t => ({
            name: t.label,
            color: t.color, // Color from DB
            hours: 0
        }));

        filteredData.forEach(imp => {
            const typeIndex = data.findIndex(d => d.name === taskTypes.find(tt => tt.id === imp.type)?.label);
            if (typeIndex >= 0) {
                const h = Object.values(imp.hours).reduce((a, b) => a + (Number(b) || 0), 0);
                data[typeIndex].hours += h;
            }
        });

        return data.filter(d => d.hours > 0);
    }, [filteredData, taskTypes]);

    return (
        <Box>
            {/* Filters */}
            <Paper sx={{ p: 2, mb: 4 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Año</InputLabel>
                            <Select
                                value={filterYear}
                                label="Año"
                                onChange={(e) => setFilterYear(e.target.value)}
                            >
                                <MenuItem value={2023}>2023</MenuItem>
                                <MenuItem value={2024}>2024</MenuItem>
                                <MenuItem value={2025}>2025</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Mes</InputLabel>
                            <Select
                                value={filterMonth}
                                label="Mes"
                                onChange={(e) => setFilterMonth(e.target.value)}
                            >
                                <MenuItem value="ALL">Todos</MenuItem>
                                {MONTHS.map((m, i) => (
                                    <MenuItem key={i} value={i}>{m}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Semana</InputLabel>
                            <Select
                                value={filterWeek}
                                label="Semana"
                                onChange={(e) => setFilterWeek(e.target.value)}
                            >
                                <MenuItem value="ALL">Todas</MenuItem>
                                {Array.from({ length: 53 }, (_, i) => i + 1).map(w => (
                                    <MenuItem key={w} value={w}>Semana {w}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            </Paper>

            {/* Matrix Table */}
            <Typography variant="h6" sx={{ mb: 2 }}>Desglose por Usuario y Tipo de Tarea (Horas)</Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 4, maxHeight: 600 }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>Usuario</TableCell>
                            {taskTypes.map(type => (
                                <TableCell key={type.id} align="center" sx={{ bgcolor: type.color, color: 'text.primary', fontWeight: 'bold', minWidth: 60, px: 0.5, fontSize: '0.75rem' }}>
                                    {type.label}
                                </TableCell>
                            ))}
                            <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: 'grey.200' }}>TOTAL</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {pivotData.map((row) => (
                            <TableRow key={row.id} hover>
                                <TableCell sx={{ fontWeight: 'medium' }}>{row.name}</TableCell>
                                {taskTypes.map(type => (
                                    <TableCell key={type.id} align="center" sx={{ px: 0.5 }}>
                                        {row.byType[type.id] > 0 ? (
                                            <Typography variant="body2" fontSize="0.8rem">{row.byType[type.id]}</Typography>
                                        ) : (
                                            <Typography variant="caption" color="text.disabled">-</Typography>
                                        )}
                                    </TableCell>
                                ))}
                                <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: 'grey.50' }}>
                                    {row.total}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Chart Widget */}
            <Typography variant="h6" sx={{ mb: 2 }}>Resumen Global de Horas</Typography>
            <Paper sx={{ p: 3, height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <RechartsTooltip />
                        <Legend />
                        <Bar dataKey="hours" name="Horas Imputadas" fill="#d50000" />
                    </BarChart>
                </ResponsiveContainer>
            </Paper>
        </Box>
    );
}

function MonthlyStatsTab() {
    const { imputations, taskTypes } = useData();
    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState(currentYear);
    const [disabledTypes, setDisabledTypes] = useState([]); // Array of IDs to exclude
    const [segFilter, setSegFilter] = useState('ALL'); // 'ALL', 'SEG', 'NO_SEG'

    const toggleType = (id) => {
        setDisabledTypes(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    // Matrix: Rows = TaskTypes, Cols = Months
    const matrixData = useMemo(() => {
        // Init rows
        const rows = taskTypes.map(t => ({
            ...t,
            months: Array(12).fill(0), // [Jan, Feb, ...]
            total: 0
        }));

        const filteredImps = imputations.filter(imp => {
            const { year: impYear } = parseWeekId(imp.weekId);

            // Year Filter
            if (impYear !== year) return false;

            // SEG Filter
            if (segFilter === 'SEG' && !imp.seg) return false;
            if (segFilter === 'NO_SEG' && imp.seg) return false;

            return true;
        });

        filteredImps.forEach(imp => {
            const { year: y, week } = parseWeekId(imp.weekId);
            const monthIdx = getMonthFromWeek(y, week);
            const hours = Object.values(imp.hours).reduce((a, b) => a + (Number(b) || 0), 0);

            const row = rows.find(r => r.id === imp.type);
            if (row) {
                row.months[monthIdx] += hours;
                row.total += hours;
            }
        });

        return rows;
    }, [imputations, taskTypes, year, segFilter]);

    // Helper to get total for a set of IDs in a specific month index
    const getMonthSum = (monthIdx, ids) => {
        return ids.reduce((acc, id) => {
            const row = matrixData.find(r => r.id === id);
            return acc + (row?.months[monthIdx] || 0);
        }, 0);
    };

    // Helper to get row object for a specific ID
    const getRow = (id) => matrixData.find(r => r.id === id);

    // Calculate Summary Rows
    const summaryRows = useMemo(() => {
        const months = Array.from({ length: 12 }, (_, i) => i);

        // 1. UTES a facturar
        const row1 = months.map(i => getMonthSum(i, ['TRABAJADO', 'JIRA', 'PRE_IMPUTADO', 'REGULARIZADO', 'RECUPERADO']));

        // 2. Pérdida facturación (SIN_PROYECTO + ENFERMEDAD - RECUPERADO)
        const row2 = months.map(i => {
            const sum = getMonthSum(i, ['SIN_PROYECTO', 'ENFERMEDAD']);
            const rec = getMonthSum(i, ['RECUPERADO']);
            return sum - rec;
        });

        // 3. Eficiencia del servicio %
        const row3 = months.map((_, i) => {
            const r1 = row1[i];
            const r2 = row2[i];
            const denom = r1 + r2;
            return denom === 0 ? 0 : (r1 / denom) * 100;
        });

        // 4. Pendientes Serv. Acumulado
        const row4 = [];
        let acc4 = 0;
        months.forEach(i => {
            const pen = getMonthSum(i, ['PENDIENTE']);
            const reg = getMonthSum(i, ['REGULARIZADO']);
            const val = pen - reg;
            acc4 += val;
            row4.push(acc4);
        });

        // 5. Preimputado Serv. Acumulado
        const row5 = [];
        let acc5 = 0;
        months.forEach(i => {
            const pre = getMonthSum(i, ['PRE_IMPUTADO']);
            const ya = getMonthSum(i, ['YA_IMPUTADO']);
            const val = pre - ya;
            acc5 += val;
            row5.push(acc5);
        });

        // 6. Realmente Trabajadas
        const row6 = months.map(i => getMonthSum(i, ['TRABAJADO', 'JIRA', 'REGULARIZADO', 'RECUPERADO', 'YA_IMPUTADO']));

        return { row1, row2, row3, row4, row5, row6 };
    }, [matrixData]);

    // Calculate Horizontal Totals for Summary Rows (where applicable)
    // For accumulated rows (4 & 5), the "Total" column typically shows the final value or sum? 
    // Standard interpretation for "Acumulado" tables: The last column usually shows the *current* accumulated status, 
    // but the table has a "Total" column. 
    // Let's assume the "Total" column for accumulated rows should show the final accumulated value (Dec).
    // For others (SUM), it's the sum of the year.
    // For Efficiency, it's the efficiency of the totals.

    const summaryTotals = useMemo(() => {
        const r1Total = summaryRows.row1.reduce((a, b) => a + b, 0);
        const r2Total = summaryRows.row2.reduce((a, b) => a + b, 0);
        const r3Total = (r1Total + r2Total) === 0 ? 0 : (r1Total / (r1Total + r2Total)) * 100;
        const r4Total = summaryRows.row4[11]; // Final value
        const r5Total = summaryRows.row5[11]; // Final value
        const r6Total = summaryRows.row6.reduce((a, b) => a + b, 0);

        return { r1Total, r2Total, r3Total, r4Total, r5Total, r6Total };
    }, [summaryRows]);

    return (
        <Box>
            <Paper sx={{ p: 2, mb: 4 }}>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Año</InputLabel>
                            <Select value={year} label="Año" onChange={(e) => setYear(e.target.value)}>
                                <MenuItem value={2023}>2023</MenuItem>
                                <MenuItem value={2024}>2024</MenuItem>
                                <MenuItem value={2025}>2025</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Filtro SEG</InputLabel>
                            <Select value={segFilter} label="Filtro SEG" onChange={(e) => setSegFilter(e.target.value)}>
                                <MenuItem value="ALL">Todos</MenuItem>
                                <MenuItem value="SEG">Solo SEG</MenuItem>
                                <MenuItem value="NO_SEG">No SEG</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            </Paper>

            <TableContainer component={Paper} variant="outlined">
                <Table size="small" sx={{ '& td': { py: 0.25, fontSize: '0.8rem' }, '& th': { py: 0.5, fontSize: '0.8rem' } }}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Tipo de Tarea</TableCell>
                            {MONTHS.map(m => (
                                <TableCell key={m} align="center" sx={{ fontWeight: 'bold', px: 0.5 }}>{m.substring(0, 3)}</TableCell>
                            ))}
                            <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: 'grey.100' }}>TOTAL</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {matrixData.map(row => {
                            const isDisabled = disabledTypes.includes(row.id);
                            return (
                                <TableRow key={row.id} hover sx={{ opacity: isDisabled ? 0.5 : 1 }}>
                                    <TableCell sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.25 }}>
                                        <Checkbox
                                            size="small"
                                            checked={!isDisabled}
                                            onChange={() => toggleType(row.id)}
                                            color="primary"
                                            sx={{ p: 0.5 }}
                                        />
                                        <Box sx={{ width: 14, height: 14, bgcolor: row.color, borderRadius: 0.5, border: '1px solid #ddd' }} />
                                        {row.label}
                                    </TableCell>
                                    {row.months.map((val, idx) => (
                                        <TableCell key={idx} align="center" sx={{ px: 0.5 }}>
                                            {val > 0 ? val : <Typography variant="caption" color="text.disabled">-</Typography>}
                                        </TableCell>
                                    ))}
                                    <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: 'grey.50' }}>{row.total}</TableCell>
                                </TableRow>
                            );
                        })}

                        {/* Summary Rows Divider */}
                        <TableRow><TableCell colSpan={14} sx={{ bgcolor: 'divider', height: '2px', p: 0 }} /></TableRow>

                        {/* 1. UTES a facturar */}
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                            <TableCell sx={{ fontWeight: 'bold' }}>UTES a facturar</TableCell>
                            {summaryRows.row1.map((val, i) => <TableCell key={i} align="center">{val > 0 ? val : '-'}</TableCell>)}
                            <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: 'grey.200' }}>{summaryTotals.r1Total}</TableCell>
                        </TableRow>

                        {/* 2. Pérdida facturación */}
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                            <TableCell sx={{ fontWeight: 'bold' }}>Pérdida facturación</TableCell>
                            {summaryRows.row2.map((val, i) => <TableCell key={i} align="center">{val !== 0 ? val : '-'}</TableCell>)}
                            <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: 'grey.200' }}>{summaryTotals.r2Total}</TableCell>
                        </TableRow>

                        {/* 3. Eficiencia del servicio */}
                        <TableRow sx={{ bgcolor: 'grey.100' }}>
                            <TableCell sx={{ fontWeight: 'bold' }}>Eficiencia del servicio %</TableCell>
                            {summaryRows.row3.map((val, i) => <TableCell key={i} align="center">{val > 0 ? val.toFixed(1) + '%' : '-'}</TableCell>)}
                            <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: 'grey.300' }}>{summaryTotals.r3Total.toFixed(1)}%</TableCell>
                        </TableRow>

                        {/* 4. Pendientes Serv. Acumulado */}
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                            <TableCell sx={{ fontWeight: 'bold' }}>Pendientes Serv. Acumulado</TableCell>
                            {summaryRows.row4.map((val, i) => <TableCell key={i} align="center">{val !== 0 ? val : '-'}</TableCell>)}
                            <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: 'grey.200' }}>{summaryTotals.r4Total}</TableCell>
                        </TableRow>

                        {/* 5. Preimputado Serv. Acumulado */}
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                            <TableCell sx={{ fontWeight: 'bold' }}>Preimputado Serv. Acumulado</TableCell>
                            {summaryRows.row5.map((val, i) => <TableCell key={i} align="center">{val !== 0 ? val : '-'}</TableCell>)}
                            <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: 'grey.200' }}>{summaryTotals.r5Total}</TableCell>
                        </TableRow>

                        {/* 6. Realmente Trabajadas */}
                        <TableRow sx={{ bgcolor: 'primary.50' }}>
                            <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Realmente Trabajadas</TableCell>
                            {summaryRows.row6.map((val, i) => <TableCell key={i} align="center" sx={{ fontWeight: 'bold' }}>{val > 0 ? val : '-'}</TableCell>)}
                            <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: 'primary.100', color: 'primary.dark' }}>{summaryTotals.r6Total}</TableCell>
                        </TableRow>

                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}

export default function Statistics() {
    const [tabIndex, setTabIndex] = useState(0);

    return (
        <Box>
            <Typography variant="h4" sx={{ mb: 2, fontWeight: 'bold', color: 'primary.main' }}>
                Estadísticas
            </Typography>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)}>
                    <Tab label="Estadísticas por Usuario" />
                    <Tab label="Estadísticas Anuales" />
                </Tabs>
            </Box>

            {tabIndex === 0 && <ImputationStatsTab />}
            {tabIndex === 1 && <MonthlyStatsTab />}
        </Box>
    );
}
