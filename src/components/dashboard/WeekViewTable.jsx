import React from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel,
    Paper, Box, Typography, IconButton, Tooltip, FormControl, Select, MenuItem, Checkbox,
    InputBase
} from '@mui/material';
import { DeleteOutline, InfoOutlined, Comment } from '@mui/icons-material';

export default function WeekViewTable({
    imputations,
    tasks,
    taskTypes,
    weekDays,
    dayKeys,
    isLocked,
    orderBy,
    order,
    onRequestSort,
    onUpdateHours,
    onUpdateField,
    onDelete,
    onOpenNote,
    setTaskDescription,
    dailyTotals,
    grandTotal
}) {

    const handleKeyDown = (e, rowIndex, dayIndex) => {
        let nextRow = rowIndex;
        let nextDay = dayIndex;

        if (e.key === 'ArrowUp') {
            nextRow = Math.max(0, rowIndex - 1);
            e.preventDefault();
        } else if (e.key === 'ArrowDown') {
            nextRow = Math.min(imputations.length - 1, rowIndex + 1);
            e.preventDefault();
        } else if (e.key === 'ArrowLeft') {
            nextDay = Math.max(0, dayIndex - 1);
            e.preventDefault();
        } else if (e.key === 'ArrowRight') {
            nextDay = Math.min(dayKeys.length - 1, dayIndex + 1);
            e.preventDefault();
        } else {
            return;
        }

        const nextId = `input-${nextRow}-${nextDay}`;
        const el = document.getElementById(nextId);
        if (el) {
            el.focus();
            setTimeout(() => el.select && el.select(), 0);
        }
    };

    return (
        <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 1000, '& td': { py: 0.5, fontSize: '0.85rem', border: 'none', borderBottom: '1px solid #e0e0e0' }, '& th': { py: 0.5, fontSize: '0.85rem', border: 'none', borderBottom: '1px solid #e0e0e0' } }}>
                <TableHead sx={{ bgcolor: 'background.default' }}>
                    <TableRow>
                        <TableCell width="37%" sx={{ bgcolor: 'background.default', left: 0, position: { xs: 'static', md: 'sticky' }, zIndex: 2, borderRight: '1px solid #e0e0e0' }}>
                            <TableSortLabel
                                active={orderBy === 'task'}
                                direction={orderBy === 'task' ? order : 'asc'}
                                onClick={() => onRequestSort('task')}
                            >
                                Tarea
                            </TableSortLabel>
                        </TableCell>
                        <TableCell width="12%" sx={{ bgcolor: 'background.default', left: '37%', position: { xs: 'static', md: 'sticky' }, zIndex: 2, borderLeft: '1px solid #e0e0e0' }}>
                            <TableSortLabel
                                active={orderBy === 'type'}
                                direction={orderBy === 'type' ? order : 'asc'}
                                onClick={() => onRequestSort('type')}
                            >
                                Tipo
                            </TableSortLabel>
                        </TableCell>
                        <TableCell width="1%" align="center" sx={{ borderRight: '1px solid #e0e0e0' }}>
                            <TableSortLabel
                                active={orderBy === 'seg'}
                                direction={orderBy === 'seg' ? order : 'asc'}
                                onClick={() => onRequestSort('seg')}
                            >
                                SEG
                            </TableSortLabel>
                        </TableCell>
                        {weekDays.map((d, i) => (
                            <TableCell width="8%" key={d.label} align="center" sx={{ textTransform: 'capitalize', borderLeft: i === 0 ? '1px solid #e0e0e0 !important' : 'none !important', borderRight: i === weekDays.length - 1 ? '1px solid #e0e0e0 !important' : 'none !important' }}>
                                {d.label}
                            </TableCell>
                        ))}
                        <TableCell width="5%" align="right" sx={{ fontWeight: 'bold', borderLeft: '1px solid #e0e0e0', pr: 1 }}>Total</TableCell>
                        <TableCell width="2%" align="left" sx={{ pl: 0 }}></TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {imputations.map((imp, rowIndex) => {
                        const task = tasks.find(t => t.id === imp.taskId);
                        const typeConfig = taskTypes.find(t => t.id === imp.type);
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
                                                        onClick={() => onOpenNote(imp)}
                                                        color={imp.note ? "primary" : "default"}
                                                        sx={{ p: 0.5 }}
                                                    >
                                                        <Comment fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </Box>
                                        <Box sx={{ minWidth: 0, flex: 1 }}>
                                            <Tooltip title={`Code: ${task?.code}`}>
                                                <Typography variant="body2" noWrap sx={{ fontWeight: 'medium' }}>
                                                    {task?.code === 'Estructural' ? 'Estructural' : `${task?.hito || '-'} - ${task?.description || task?.name}`}
                                                </Typography>
                                            </Tooltip>
                                        </Box>
                                    </Box>
                                </TableCell>
                                <TableCell sx={{ left: '37%', position: { xs: 'static', md: 'sticky' }, bgcolor: 'background.paper', zIndex: 1, p: '4px !important', borderLeft: '1px solid #e0e0e0' }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                        <FormControl size="small" variant="standard" sx={{ width: '130px' }}>
                                            <Select
                                                value={imp.type}
                                                onChange={(e) => onUpdateField(imp, 'type', e.target.value)}
                                                disabled={isLocked}
                                                disableUnderline
                                                sx={{
                                                    fontSize: '0.75rem',
                                                    bgcolor: typeConfig?.color || '#eee',
                                                    borderRadius: 1,
                                                    px: 1,
                                                    py: 0.2,
                                                    textAlign: 'center',
                                                    fontWeight: 'medium',
                                                    color: 'text.primary',
                                                    '& .MuiSelect-select': { pr: '24px !important', display: 'flex', justifyContent: 'center' },
                                                    '& .MuiSvgIcon-root': { display: isLocked ? 'none' : 'block' }
                                                }}
                                            >
                                                {taskTypes.filter(t => {
                                                    const isStructural = task?.code === 'Estructural';
                                                    if (t.structural !== undefined) {
                                                        return isStructural ? t.structural : !t.structural;
                                                    }
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
                                        onChange={(e) => onUpdateField(imp, 'seg', e.target.checked)}
                                        disabled={isLocked}
                                        size="small"
                                    />
                                </TableCell>
                                {weekDays.map((d, i) => {
                                    const dayKey = dayKeys[i];
                                    return (
                                        <TableCell key={d.label} align="center" sx={{ p: '2px !important', borderLeft: i === 0 ? '1px solid #e0e0e0 !important' : 'none !important', borderRight: i === weekDays.length - 1 ? '1px solid #e0e0e0 !important' : 'none !important' }}>
                                            <InputBase
                                                inputProps={{
                                                    id: `input-${rowIndex}-${i}`,
                                                    min: 0,
                                                    max: 24,
                                                    step: 0.5,
                                                    style: { textAlign: 'center' },
                                                    autoComplete: 'off',
                                                    'data-1p-ignore': true
                                                }}
                                                value={imp.hours[dayKey] === 0 ? '' : imp.hours[dayKey]}
                                                placeholder="-"
                                                onChange={(e) => onUpdateHours(imp, dayKey, e.target.value)}
                                                onKeyDown={(e) => handleKeyDown(e, rowIndex, i)}
                                                disabled={isLocked}
                                                sx={{
                                                    width: '40px',
                                                    height: '32px',
                                                    margin: '0 auto',
                                                    fontSize: '0.85rem',
                                                    border: '1px solid #e0e0e0',
                                                    borderRadius: 1,
                                                    bgcolor: isLocked ? 'transparent' : '#fff',
                                                    '&:hover': {
                                                        borderColor: isLocked ? '#e0e0e0' : 'primary.main',
                                                    },
                                                    '& input': { textAlign: 'center', cursor: isLocked ? 'default' : 'text', py: 0.5 },
                                                    '& input::placeholder': { color: '#ccc', opacity: 1 },
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
                                        <IconButton onClick={() => onDelete(imp.id)} size="small" color="error">
                                            <DeleteOutline fontSize="small" />
                                        </IconButton>
                                    )}
                                </TableCell>
                            </TableRow>
                        );
                    })}

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
    );
}
