import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import {
    Box, Button, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField
} from '@mui/material';

export default function TaskFormDialog({ open, onClose, onTaskCreated }) {
    const { addTask } = useData();
    const [newCode, setNewCode] = useState('');
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');

    // State for validation errors
    const [codeError, setCodeError] = useState(false);
    const [nameError, setNameError] = useState(false);

    const handleSubmit = (e) => {
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

        // Create task (helper in DataContext assigns user)
        addTask({ code: newCode, name: newName, description: newDesc });

        // Reset form
        setNewCode('');
        setNewName('');
        setNewDesc('');

        // Notify parent
        if (onTaskCreated) onTaskCreated();

        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <form onSubmit={handleSubmit}>
                <DialogTitle>Nueva Tarea</DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField
                            autoFocus
                            margin="dense"
                            label="Código Tarea"
                            fullWidth
                            variant="outlined"
                            value={newCode}
                            onChange={(e) => setNewCode(e.target.value)}
                            required
                            error={codeError}
                            helperText={codeError ? "El código es requerido" : ""}
                        />
                        <TextField
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
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} color="inherit">Cancelar</Button>
                    <Button type="submit" variant="contained">Guardar</Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
