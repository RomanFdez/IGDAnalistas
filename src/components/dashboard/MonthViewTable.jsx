
import React from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel,
    Paper, Box, Typography, Tooltip, Chip
} from '@mui/material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function MonthViewTable({
    monthDetails,
    tasks,
    taskTypes,
    monthOrderBy,
    monthOrder,
    onRequestSort
}) {
    if (!monthDetails) return null;

    return (
        <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ mb: 3 }}>
            <Table size="small" stickyHeader>
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ bgcolor: 'background.default', minWidth: 200, left: 0, position: 'sticky', zIndex: 2 }}>
                            <TableSortLabel
                                active={monthOrderBy === 'task'}
                                direction={monthOrderBy === 'task' ? monthOrder : 'asc'}
                                onClick={() => onRequestSort('task')}
                            >
                                Tarea
                            </TableSortLabel>
                        </TableCell>
                        <TableCell sx={{ bgcolor: 'background.default', minWidth: 100, left: 200, position: 'sticky', zIndex: 2 }}>
                            <TableSortLabel
                                active={monthOrderBy === 'type'}
                                direction={monthOrderBy === 'type' ? monthOrder : 'asc'}
                                onClick={() => onRequestSort('type')}
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
    );
}
