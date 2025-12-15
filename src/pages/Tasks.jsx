import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useTheme } from '@mui/material/styles';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton, TextField,
  ToggleButtonGroup, ToggleButton, TablePagination, Grid, TableSortLabel,
  Card, CardContent, FormControl, InputLabel, Select, MenuItem, Divider,
  Tooltip, Dialog
} from '@mui/material';
import {
  Add, PowerSettingsNew, PowerOff, Search, FilterList, InfoOutlined, Lock
} from '@mui/icons-material';
import TaskFormDialog from '../components/TaskFormDialog';
import { getYear, getMonth, getISOWeek, setISOWeek, startOfYear, eachWeekOfInterval, endOfMonth, startOfMonth, format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Tasks() {
  const { user } = useAuth();
  const { getAllTasks, toggleTaskStatus, imputations, taskTypes } = useData();
  const theme = useTheme();

  const [open, setOpen] = useState(false);
  const [taskDescription, setTaskDescription] = useState(null);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination State
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  // Sorting State
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('code');

  // Summary Widget State
  const [summaryMode, setSummaryMode] = useState('ANUAL'); // ANUAL, MENSUAL, SEMANAL
  const [summaryYear, setSummaryYear] = useState(new Date().getFullYear());
  const [summaryMonth, setSummaryMonth] = useState(new Date().getMonth());
  const [summaryWeek, setSummaryWeek] = useState('');

  const allTasks = getAllTasks();
  const myTasks = allTasks.filter(t => t.assignedUserIds?.includes(user.id));

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const filteredTasks = useMemo(() => {
    return myTasks.filter(t => {
      const matchesStatus =
        filterStatus === 'ALL' ? true :
          filterStatus === 'ACTIVE' ? t.active : !t.active;

      const query = searchQuery.toLowerCase();
      const matchesSearch =
        t.code.toLowerCase().includes(query) ||
        t.name.toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    }).sort((a, b) => {
      const isAsc = order === 'asc';
      if (orderBy === 'code') {
        return isAsc ? a.code.localeCompare(b.code) : b.code.localeCompare(a.code);
      } else {
        return isAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
    });
  }, [myTasks, filterStatus, searchQuery, order, orderBy]);

  // Derived Summary Data
  const summaryData = useMemo(() => {
    let relevantImps = imputations.filter(i => i.userId === user.id);

    const totals = {};
    taskTypes.forEach(t => totals[t.id] = 0);

    // Add "Trabajado + JIRA" grouping later or calculate it directly?
    // Requirement said "information of total imputed by type".
    // Reusing logic from dashboard: Separate TRABAJADO, JIRA, etc.

    relevantImps.forEach(imp => {
      // weekId format: "YYYY-Www"
      const [yStr, wStr] = imp.weekId.split('-W');
      const impYear = parseInt(yStr);
      const impWeek = parseInt(wStr);

      // Calculate "Month" of this week.
      // A week can belong to two months. We use the Monday of the week to determine the month.
      const mondayDate = setISOWeek(startOfYear(new Date(impYear, 0, 1)), impWeek);
      const impMonth = getMonth(mondayDate);

      // Filters
      if (impYear !== summaryYear) return;

      if (summaryMode === 'MENSUAL' || summaryMode === 'SEMANAL') {
        // Note: If week overlaps, strict month logic might exclude end-of-month days.
        // Simplification: Check if the week *starts* in the selected month.
        if (impMonth !== summaryMonth) return;
      }

      if (summaryMode === 'SEMANAL') {
        if (impWeek !== summaryWeek) return;
      }

      // Sum hours
      const weeklySum = Object.values(imp.hours).reduce((a, b) => a + b, 0);
      totals[imp.type] += weeklySum;
    });

    return totals;
  }, [imputations, user.id, summaryMode, summaryYear, summaryMonth, summaryWeek, taskTypes]);

  // Helper to generate weeks for selected Month
  const availableWeeks = useMemo(() => {
    if (summaryMode !== 'SEMANAL') return [];
    // Generate weeks that fall within Year/Month
    const start = startOfMonth(new Date(summaryYear, summaryMonth));
    const end = endOfMonth(start);
    return eachWeekOfInterval({ start, end }, { weekStartsOn: 1 }).map(d => {
      const w = getISOWeek(d);
      return { val: w, label: `Semana ${w} (${format(d, 'd MMM', { locale: es })})` };
    });
  }, [summaryYear, summaryMonth, summaryMode]);

  // Set default week when weeks change
  useMemo(() => {
    if (summaryMode === 'SEMANAL' && availableWeeks.length > 0) {
      // If current selection is invalid, reset
      if (!availableWeeks.find(w => w.val === summaryWeek)) {
        setSummaryWeek(availableWeeks[0].val);
      }
    }
  }, [availableWeeks, summaryMode]);


  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const visibleTasks = filteredTasks.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 3 }, (_, i) => current - i);
  }, []);

  const months = [
    { val: 0, label: 'Enero' }, { val: 1, label: 'Febrero' }, { val: 2, label: 'Marzo' },
    { val: 3, label: 'Abril' }, { val: 4, label: 'Mayo' }, { val: 5, label: 'Junio' },
    { val: 6, label: 'Julio' }, { val: 7, label: 'Agosto' }, { val: 8, label: 'Septiembre' },
    { val: 9, label: 'Octubre' }, { val: 10, label: 'Noviembre' }, { val: 11, label: 'Diciembre' }
  ];

  return (
    <Box sx={{ animate: 'fade-in' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" color="text.primary">Gestión de Tareas</Typography>
          <Typography variant="body2" color="text.secondary">Administra tus tareas asignadas</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpen(true)}
        >
          Nueva Tarea
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* LEFT COLUMN: TASKS TABLE */}
        <Grid item xs={12} md={8}>
          <Paper elevation={0} variant="outlined" sx={{ mb: 2, p: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <TextField
                size="small"
                placeholder="Buscar código o nombre..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                InputProps={{ startAdornment: <Search color="action" fontSize="small" sx={{ mr: 1 }} /> }}
                sx={{ flexGrow: 1 }}
              />
              <ToggleButtonGroup
                value={filterStatus}
                exclusive
                onChange={(e, v) => v && setFilterStatus(v)}
                size="small"
              >
                <ToggleButton value="ALL">Todas</ToggleButton>
                <ToggleButton value="ACTIVE">Activas</ToggleButton>
                <ToggleButton value="INACTIVE">Inactivas</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'background.default' }}>
                  <TableRow>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'code'}
                        direction={orderBy === 'code' ? order : 'asc'}
                        onClick={() => handleRequestSort('code')}
                      >
                        Código
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === 'name'}
                        direction={orderBy === 'name' ? order : 'asc'}
                        onClick={() => handleRequestSort('name')}
                      >
                        Nombre
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="center">Estado</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleTasks.length === 0 ? (
                    <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>No se encontraron tareas.</TableCell></TableRow>
                  ) : visibleTasks.map(task => (
                    <TableRow key={task.id} hover>
                      <TableCell component="th" scope="row">{task.code}</TableCell>
                      <TableCell>
                        <Typography variant="body2">{task.name}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={task.active ? 'Activa' : 'Inactiva'}
                          color={task.active ? 'success' : 'default'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                          <IconButton
                            onClick={() => setTaskDescription(task)}
                            size="small"
                            color="info"
                            sx={{ color: 'text.secondary' }}
                          >
                            <InfoOutlined />
                          </IconButton>
                          {task.permanent ? (
                            <Tooltip title="Tarea Permanente">
                              <IconButton size="small" disabled>
                                <Lock fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          ) : (
                            <IconButton
                              onClick={() => toggleTaskStatus(task.id)}
                              color={task.active ? 'error' : 'success'}
                              size="small"
                            >
                              {task.active ? <PowerSettingsNew /> : <PowerOff />}
                            </IconButton>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[15, 25, 50]}
              component="div"
              count={filteredTasks.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage="Filas:"
            />
          </Paper>
        </Grid>

        {/* RIGHT COLUMN: SUMMARY WIDGET */}
        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <FilterList color="primary" />
                <Typography variant="h6">Resumen Imputado</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                Total de horas imputadas filtradas por periodo.
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Periodo</InputLabel>
                  <Select value={summaryMode} label="Periodo" onChange={e => setSummaryMode(e.target.value)}>
                    <MenuItem value="ANUAL">Anual</MenuItem>
                    <MenuItem value="MENSUAL">Mensual</MenuItem>
                    <MenuItem value="SEMANAL">Semanal</MenuItem>
                  </Select>
                </FormControl>

                <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
                  {/* Always Year */}
                  <FormControl size="small" fullWidth>
                    <InputLabel>Año</InputLabel>
                    <Select value={summaryYear} label="Año" onChange={e => setSummaryYear(e.target.value)}>
                      {years.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                    </Select>
                  </FormControl>

                  {/* Month if Mensual or Semanal */}
                  {(summaryMode === 'MENSUAL' || summaryMode === 'SEMANAL') && (
                    <FormControl size="small" fullWidth>
                      <InputLabel>Mes</InputLabel>
                      <Select value={summaryMonth} label="Mes" onChange={e => setSummaryMonth(e.target.value)}>
                        {months.map(m => <MenuItem key={m.val} value={m.val}>{m.label}</MenuItem>)}
                      </Select>
                    </FormControl>
                  )}

                  {/* Week if Semanal */}
                  {(summaryMode === 'SEMANAL') && (
                    <FormControl size="small" fullWidth>
                      <InputLabel>Semana</InputLabel>
                      <Select
                        value={summaryWeek}
                        label="Semana"
                        onChange={e => setSummaryWeek(e.target.value)}
                        disabled={availableWeeks.length === 0}
                      >
                        {availableWeeks.map(w => (
                          <MenuItem key={w.val} value={w.val}>{w.label}</MenuItem>
                        ))}
                        {availableWeeks.length === 0 && <MenuItem value="">Sin semanas</MenuItem>}
                      </Select>
                    </FormControl>
                  )}
                </Box>
              </Box>

              <Divider sx={{ mb: 2 }} />

              <Table size="small">
                <TableBody>
                  {taskTypes.map(type => {
                    const total = summaryData[type.id] || 0;
                    if (total === 0) return null;
                    return (
                      <TableRow key={type.id} sx={{ bgcolor: type.color || theme.palette.taskTypes?.[type.id] }}>
                        <TableCell sx={{ fontWeight: 'medium' }}>{type.label}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>{total}h</TableCell>
                      </TableRow>
                    );
                  })}
                  {Object.values(summaryData).every(v => v === 0) && (
                    <TableRow>
                      <TableCell colSpan={2} align="center" sx={{ color: 'text.secondary' }}>
                        Sin datos para el filtro seleccionado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

            </CardContent>
          </Card>
        </Grid>
      </Grid>

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

      {/* Dialog for New Task */}
      <TaskFormDialog
        open={open}
        onClose={() => setOpen(false)}
      />
    </Box>
  );
}
