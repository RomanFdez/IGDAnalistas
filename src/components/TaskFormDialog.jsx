import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import {
    Box, Button, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField
} from '@mui/material';

export default function TaskFormDialog({ open, onClose, onTaskCreated, taskToEdit }) {
    const { addTask, updateTask, tasks } = useData();

    // Initialize state with taskToEdit values if present, or defaults
    const [newName, setNewName] = useState(taskToEdit?.name || '');
    const [newDesc, setNewDesc] = useState(taskToEdit?.description || '');
    const [newHito, setNewHito] = useState(taskToEdit?.hito || '');
    const [newUtes, setNewUtes] = useState(taskToEdit?.utes || '');

    // Update state when taskToEdit changes or dialog opens
    React.useEffect(() => {
        if (open) {
            setNewName(taskToEdit?.name || '');
            setNewDesc(taskToEdit?.description || '');
            setNewHito(taskToEdit?.hito || '');
            setNewUtes(taskToEdit?.utes || '');
        }
    }, [open, taskToEdit]);

    // State for validation errors
    const [nameError, setNameError] = useState(false);
    const [hitoError, setHitoError] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        let hasError = false;

        // Validate hito
        if (!newHito.trim()) {
            setHitoError(true);
            hasError = true;
        } else {
            setHitoError(false);
        }

        // Validate name
        if (!newName.trim()) {
            setNameError(true);
            hasError = true;
        } else {
            setNameError(false);
        }

        if (hasError) {
            return; // Stop submission if there are errors
        }

        if (taskToEdit) {
            updateTask(taskToEdit.id, {
                name: newName,
                description: newDesc,
                hito: newHito,
                utes: newUtes ? Number(newUtes) : 0
            });
            if (onTaskCreated) onTaskCreated(taskToEdit);
        } else {
            // Generate Code: Hito + "-" + Incremental
            // Find counts of tasks with same Hito to determine next index
            // We'll use a simple regex to find the max index used for this Hito
            // Assumed format: HITO-1, HITO-2, etc.
            const prefix = `${newHito.trim()}-`;
            const matchingAndFormatted = tasks.filter(t => t.code && t.code.startsWith(prefix));

            let maxIndex = 0;
            matchingAndFormatted.forEach(t => {
                const rest = t.code.substring(prefix.length);
                const num = parseInt(rest, 10);
                if (!isNaN(num) && num > maxIndex) {
                    maxIndex = num;
                }
            });

            const nextCode = `${prefix}${maxIndex + 1}`;

            // Create task (helper in DataContext assigns user)
            const createdTask = await addTask({
                code: nextCode,
                name: newName,
                description: newDesc,
                hito: newHito,
                utes: newUtes ? Number(newUtes) : 0
            });
            if (onTaskCreated) onTaskCreated(createdTask);
        }

        // Reset form
        setNewName('');
        setNewDesc('');
        setNewHito('');
        setNewUtes('');

        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <form onSubmit={handleSubmit} autoComplete="off">
                <DialogTitle>{taskToEdit ? "Editar Tarea" : "Nueva Tarea"}</DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1, '& .MuiInputLabel-root': { bgcolor: 'background.paper', px: 0.5 } }}>
                        <TextField
                            autoFocus={!taskToEdit}
                            margin="dense"
                            label="Hito"
                            value={newHito}
                            onChange={(e) => setNewHito(e.target.value)}
                            fullWidth
                            variant="outlined"
                            required
                            error={hitoError}
                            helperText={hitoError ? "El Hito es requerido para generar el código" : "Ej: Fase1 (Generará Fase1-1, Fase1-2...)"}
                            placeholder="Ej: Entrega Fase 1"
                        />
                        <TextField
                            autoFocus={!!taskToEdit}
                            margin="dense"
                            label="Nombre Tarea"
                            fullWidth
                            variant="outlined"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            required
                            error={nameError}
                            helperText={nameError ? "El nombre es requerido" : ""}
                        />
                        <TextField
                            label="Descripción"
                            value={newDesc}
                            onChange={(e) => setNewDesc(e.target.value)}
                            multiline
                            rows={3}
                            fullWidth
                        />
                        <TextField
                            label="Número de UTES (Horas Presupuestadas)"
                            type="number"
                            value={newUtes}
                            onChange={(e) => setNewUtes(e.target.value)}
                            fullWidth
                            InputProps={{ inputProps: { min: 0 } }}
                            helperText="Opcional. Bolsa de horas total para la tarea."
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} color="inherit">Cancelar</Button>
                    <Button type="submit" variant="contained">{taskToEdit ? "Actualizar" : "Guardar"}</Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
