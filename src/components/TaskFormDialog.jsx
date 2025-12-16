import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import {
    Box, Button, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField
} from '@mui/material';

export default function TaskFormDialog({ open, onClose, onTaskCreated, taskToEdit }) {
    const { addTask, updateTask } = useData();

    // Initialize state with taskToEdit values if present, or defaults
    const [newCode, setNewCode] = useState(taskToEdit?.code || '');
    const [newName, setNewName] = useState(taskToEdit?.name || '');
    const [newDesc, setNewDesc] = useState(taskToEdit?.description || '');
    const [newUtes, setNewUtes] = useState(taskToEdit?.utes || '');

    // Update state when taskToEdit changes or dialog opens
    React.useEffect(() => {
        if (open) {
            setNewCode(taskToEdit?.code || '');
            setNewName(taskToEdit?.name || '');
            setNewDesc(taskToEdit?.description || '');
            setNewUtes(taskToEdit?.utes || '');
        }
    }, [open, taskToEdit]);

    // State for validation errors
    const [codeError, setCodeError] = useState(false);
    const [nameError, setNameError] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        let hasError = false;

        // Validate code
        if (!newCode.trim()) {
            setCodeError(true);
            hasError = true;
        } else {
            setCodeError(false);
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
                utes: newUtes ? Number(newUtes) : 0
            });
            if (onTaskCreated) onTaskCreated(taskToEdit);
        } else {
            // Create task (helper in DataContext assigns user)
            const createdTask = await addTask({
                code: newCode,
                name: newName,
                description: newDesc,
                utes: newUtes ? Number(newUtes) : 0
            });
            if (onTaskCreated) onTaskCreated(createdTask);
        }

        // Reset form
        setNewCode('');
        setNewName('');
        setNewDesc('');
        setNewUtes('');

        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <form onSubmit={handleSubmit}>
                <DialogTitle>{taskToEdit ? "Editar Tarea" : "Nueva Tarea"}</DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1, '& .MuiInputLabel-root': { bgcolor: 'background.paper', px: 0.5 } }}>
                        <TextField
                            autoFocus={!taskToEdit}
                            margin="dense"
                            label="Código Tarea"
                            fullWidth
                            variant="outlined"
                            value={newCode}
                            onChange={(e) => setNewCode(e.target.value)}
                            required
                            disabled={!!taskToEdit} // Disable editing of code
                            error={codeError}
                            helperText={codeError ? "El código es requerido" : ""}
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
