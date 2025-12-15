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
            return impYear === year;
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
    }, [imputations, taskTypes, year]);

    // Calculate Column Totals
    const columnTotals = useMemo(() => {
        const totals = Array(12).fill(0);
        let grandTotal = 0;
        matrixData.forEach(row => {
            if (disabledTypes.includes(row.id)) return; // Exclude disabled

            row.months.forEach((val, idx) => {
                totals[idx] += val;
            });
            grandTotal += row.total;
        });
        return { months: totals, total: grandTotal };
    }, [matrixData, disabledTypes]);

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
                        {/* Totals Row */}
                        <TableRow sx={{ bgcolor: 'grey.100' }}>
                            <TableCell sx={{ fontWeight: 'bold' }}>TOTAL ESTADÍSTICO</TableCell>
                            {columnTotals.months.map((val, idx) => (
                                <TableCell key={idx} align="center" sx={{ fontWeight: 'bold' }}>
                                    {val > 0 ? val : '-'}
                                </TableCell>
                            ))}
                            <TableCell align="center" sx={{ fontWeight: 'bold', bgcolor: 'grey.300', fontSize: '1.05rem' }}>
                                {columnTotals.total}
                            </TableCell>
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
                    <Tab label="Estadísticas de Imputación" />
                    <Tab label="Estadísticas Mensuales" />
                </Tabs>
            </Box>

            {tabIndex === 0 && <ImputationStatsTab />}
            {tabIndex === 1 && <MonthlyStatsTab />}
        </Box>
    );
}
