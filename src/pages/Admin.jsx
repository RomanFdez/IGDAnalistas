
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import {
    Box, Typography, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Checkbox, IconButton, Switch,
    Tabs, Tab, Grid, TextField, Button, Divider, Chip, FormControlLabel, Tooltip,
    Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { Save, PersonAdd, School, VpnKey, DeleteOutline, Add, FileDownload, FileUpload } from '@mui/icons-material';

function TaskTypesTab() {
    const { taskTypes, updateTaskType, deleteTaskType, addTaskType } = useData();
    const [openAdd, setOpenAdd] = useState(false);
    const [newType, setNewType] = useState({ id: '', label: '', color: '#ffffff', structural: false });

    const handleColorChange = (id, newColor) => {
        updateTaskType(id, { color: newColor });
    };

    const handleStructuralChange = (id, isStructural) => {
        updateTaskType(id, { structural: isStructural });
    };

    const handleDeleteType = (id) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este tipo de tarea?')) {
            try {
                deleteTaskType(id);
            } catch (error) {
                alert(error.message);
            }
        }
    };

    const handleCreateType = () => {
        if (!newType.id || !newType.label) return;
        addTaskType(newType);
        setOpenAdd(false);
        setNewType({ id: '', label: '', color: '#ffffff', structural: false });
    };

    const handleExport = () => {
        const headers = ['id', 'label', 'color', 'structural', 'computesInWeek', 'subtractsFromBudget'];
        const csvContent = [
            headers.join(';'),
            ...taskTypes.map(t => [
                t.id,
                `"${t.label}"`,
                t.color,
                t.structural,
                t.computesInWeek,
                t.subtractsFromBudget
            ].join(';'))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'tipos_tarea.csv';
        link.click();
    };

    const handleImport = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const rows = text.split('\n').slice(1); // Skip header
                let count = 0;
                rows.forEach(row => {
                    if (!row.trim()) return;

                    const cols = row.split(';');
                    if (cols.length < 2) return;

                    // Clean quotes if present
                    const clean = (val) => val ? val.replace(/^"|"$/g, '').trim() : '';

                    const id = clean(cols[0]);
                    const label = clean(cols[1]);
                    if (!id) return;

                    const typeData = {
                        id: id,
                        label: label,
                        color: clean(cols[2]) || '#ffffff',
                        structural: cols[3] === 'true',
                        computesInWeek: cols[4] !== 'false',
                        subtractsFromBudget: cols[5] !== 'false'
                    };

                    // Check if exists
                    const exists = taskTypes.find(t => t.id === typeData.id);
                    if (exists) {
                        updateTaskType(typeData.id, typeData);
                    } else {
                        addTaskType(typeData);
                    }
                    count++;
                });
                alert(`Importación completada. Se procesaron ${count} tipos.`);
            } catch (error) {
                console.error(error);
                alert('Error al procesar el archivo CSV.');
            }
            event.target.value = null; // Reset input
        };
        reader.readAsText(file);
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h6" color="text.primary">Tipos de Tarea</Typography>
                    <Typography variant="body2" color="text.secondary">Gestiona los tipos de tareas disponibles</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button startIcon={<FileDownload />} onClick={handleExport} color="inherit">
                        Exportar
                    </Button>
                    <Button startIcon={<FileUpload />} component="label" color="inherit">
                        Importar
                        <input type="file" hidden accept=".csv" onChange={handleImport} />
                    </Button>
                    <Button variant="contained" startIcon={<Add />} onClick={() => setOpenAdd(true)}>
                        Nuevo Tipo
                    </Button>
                </Box>
            </Box>
            <TableContainer component={Paper} variant="outlined" elevation={0}>
                <Table size="small">
                    <TableHead sx={{ bgcolor: 'background.default' }}>
                        <TableRow>
                            <TableCell>ID</TableCell>
                            <TableCell>Etiqueta</TableCell>
                            <TableCell>Color de Fondo</TableCell>
                            <TableCell align="center">Es Estructural</TableCell>
                            <TableCell align="center">Computa Sem.</TableCell>
                            <TableCell align="center">Resta UTES</TableCell>
                            <TableCell width={50}></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {taskTypes.map((type) => (
                            <TableRow key={type.id} hover sx={{ '& td': { py: 0.5 } }}>
                                <TableCell>{type.id}</TableCell>
                                <TableCell>
                                    <TextField
                                        variant="outlined"
                                        size="small"
                                        value={type.label}
                                        onChange={(e) => updateTaskType(type.id, { label: e.target.value })}
                                        sx={{ fontWeight: 'medium', bgcolor: 'white', '& .MuiInputBase-input': { py: 0.5 } }}
                                        fullWidth
                                    />
                                </TableCell>
                                <TableCell>
                                    <Box
                                        sx={{
                                            width: 28,
                                            height: 28,
                                            bgcolor: type.color,
                                            border: '1px solid #ddd',
                                            borderRadius: 1,
                                            cursor: 'pointer',
                                            position: 'relative'
                                        }}
                                    >
                                        <input
                                            type="color"
                                            value={type.color}
                                            onChange={(e) => handleColorChange(type.id, e.target.value)}
                                            style={{
                                                opacity: 0,
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                width: '100%',
                                                height: '100%',
                                                cursor: 'pointer'
                                            }}
                                        />
                                    </Box>
                                </TableCell>
                                <TableCell align="center">
                                    <Switch
                                        size="small"
                                        checked={!!type.structural}
                                        onChange={(e) => handleStructuralChange(type.id, e.target.checked)}
                                        color="primary"
                                    />
                                </TableCell>
                                <TableCell align="center">
                                    <Switch
                                        size="small"
                                        checked={type.computesInWeek !== false} // Default true
                                        onChange={(e) => updateTaskType(type.id, { computesInWeek: e.target.checked })}
                                        color="secondary"
                                    />
                                </TableCell>
                                <TableCell align="center">
                                    <Switch
                                        size="small"
                                        checked={type.subtractsFromBudget !== false} // Default true
                                        onChange={(e) => updateTaskType(type.id, { subtractsFromBudget: e.target.checked })}
                                        color="warning"
                                    />
                                </TableCell>
                                <TableCell>
                                    <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => handleDeleteType(type.id)}
                                        title="Eliminar Tipo de Tarea"
                                    >
                                        <DeleteOutline />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Add Type Dialog */}
            <Dialog open={openAdd} onClose={() => setOpenAdd(false)}>
                <DialogTitle>Nuevo Tipo de Tarea</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1, minWidth: 300 }}>
                        <TextField
                            required
                            label="ID (Único, ej: VIAJE)"
                            value={newType.id}
                            onChange={(e) => setNewType({ ...newType, id: e.target.value.toUpperCase() })}
                            fullWidth
                            helperText="Debe ser único, sin espacios y en mayúsculas"
                        />
                        <TextField
                            required
                            label="Etiqueta"
                            value={newType.label}
                            onChange={(e) => setNewType({ ...newType, label: e.target.value })}
                            fullWidth
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography>Color:</Typography>
                            <Box
                                sx={{
                                    width: 40,
                                    height: 40,
                                    bgcolor: newType.color,
                                    border: '1px solid #ccc',
                                    borderRadius: 1,
                                    position: 'relative',
                                    cursor: 'pointer',
                                    overflow: 'hidden'
                                }}
                            >
                                <input
                                    type="color"
                                    value={newType.color}
                                    onChange={(e) => setNewType({ ...newType, color: e.target.value })}
                                    style={{
                                        position: 'absolute',
                                        top: '-50%',
                                        left: '-50%',
                                        width: '200%',
                                        height: '200%',
                                        opacity: 0,
                                        cursor: 'pointer'
                                    }}
                                />
                            </Box>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', bgcolor: 'grey.100', px: 1, borderRadius: 1 }}>
                                {newType.color}
                            </Typography>
                        </Box>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={newType.computesInWeek !== false}
                                    onChange={(e) => setNewType({ ...newType, computesInWeek: e.target.checked })}
                                />
                            }
                            label="Computa en Total Semanal"
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={newType.subtractsFromBudget !== false}
                                    onChange={(e) => setNewType({ ...newType, subtractsFromBudget: e.target.checked })}
                                    color="warning"
                                />
                            }
                            label="Resta UTES de la Tarea"
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={!!newType.structural}
                                    onChange={(e) => setNewType({ ...newType, structural: e.target.checked })}
                                    color="primary"
                                />
                            }
                            label="Es Estructural (No se puede imputar directamente)"
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenAdd(false)}>Cancelar</Button>
                    <Button
                        onClick={handleCreateType}
                        variant="contained"
                        disabled={!newType.id || !newType.label}
                    >
                        Crear
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

function UsersTab() {
    const { USERS, addUser, toggleUserStatus, updateUser } = useAuth();
    const [newName, setNewName] = useState('');
    const [newSurname, setNewSurname] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [isApprover, setIsApprover] = useState(false);

    // Edit State
    const [editUser, setEditUser] = useState(null);
    const [editName, setEditName] = useState('');
    const [editSurname, setEditSurname] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleAddUser = (e) => {
        e.preventDefault();
        if (newName.trim() && newSurname.trim() && newPassword.trim()) {
            addUser(newName, newSurname, newPassword, isApprover);
            setNewName('');
            setNewSurname('');
            setNewPassword('');
            setIsApprover(false);
        }
    };

    const handleToggleApprover = (userId, currentRoles) => {
        let newRoles = [...currentRoles];
        const isApprover = newRoles.includes('APPROVER');
        const user = USERS.find(u => u.id === userId);

        if (isApprover) {
            // Check: Ensure we don't remove the last ACTIVE approver
            if (user && user.active) {
                const activeApprovers = USERS.filter(u => u.active && u.roles.includes('APPROVER')).length;
                if (activeApprovers <= 1) {
                    alert('No se puede quitar el rol. Debe haber al menos un Aprobador activo en el sistema.');
                    return;
                }
            }
            // General safety: Ensure we don't remove the absolute last approver (even if everyone is inactive, though unlikely)
            const totalApprovers = USERS.filter(u => u.roles.includes('APPROVER')).length;
            if (totalApprovers <= 1) {
                alert('Debe haber al menos un usuario con rol de Aprobador.');
                return;
            }

            newRoles = newRoles.filter(r => r !== 'APPROVER');
        } else {
            // Adding APPROVER role
            newRoles.push('APPROVER');
        }
        updateUser(userId, { roles: newRoles });
    };

    const handleToggleStatus = (userId, isActive, roles) => {
        if (isActive) {
            // We are attempting to DEACTIVATE the user
            if (roles.includes('APPROVER')) {
                const activeApprovers = USERS.filter(u => u.active && u.roles.includes('APPROVER')).length;
                if (activeApprovers <= 1) {
                    alert('No se puede desactivar. Este es el único Aprobador activo en el sistema.');
                    return;
                }
            }
        }
        toggleUserStatus(userId);
    };

    const openEditDialog = (user) => {
        setEditUser(user);
        const parts = user.name.split(' ');
        setEditName(parts[0] || '');
        setEditSurname(parts.slice(1).join(' ') || '');
        setEditPassword('');
        setConfirmPassword('');
    };

    const handleSaveEdit = () => {
        if (!editUser) return;

        const updates = {};

        // Name Update
        if (editName.trim()) {
            updates.name = `${editName.trim()} ${editSurname.trim()} `;
        }

        // Password Update
        if (editPassword) {
            if (editPassword !== confirmPassword) {
                alert('Las contraseñas no coinciden');
                return;
            }
            updates.password = editPassword;
        }

        if (Object.keys(updates).length > 0) {
            updateUser(editUser.id, updates);
            setEditUser(null);
        }
    };

    return (
        <Grid container spacing={4}>
            {/* Formulario Alta */}
            <Grid item xs={12} md={4}>
                <Paper variant="outlined" sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonAdd fontSize="small" /> Alta de Usuario
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <form onSubmit={handleAddUser}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <TextField
                                label="Nombre"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                size="small"
                                required
                                fullWidth
                            />
                            <TextField
                                label="Apellidos"
                                value={newSurname}
                                onChange={e => setNewSurname(e.target.value)}
                                size="small"
                                required
                                fullWidth
                            />
                            <TextField
                                label="Contraseña"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                size="small"
                                required
                                fullWidth
                                type="password"
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={isApprover}
                                        onChange={e => setIsApprover(e.target.checked)}
                                    />
                                }
                                label="Es Aprobador"
                            />
                            <Button
                                type="submit"
                                variant="contained"
                                disabled={!newName || !newSurname || !newPassword}
                            >
                                Crear Usuario
                            </Button>
                        </Box>
                    </form>
                </Paper>
            </Grid>

            {/* Listado Usuarios */}
            <Grid item xs={12} md={8}>
                <Paper variant="outlined">
                    <Table size="small">
                        <TableHead sx={{ bgcolor: 'background.default' }}>
                            <TableRow>
                                <TableCell>Usuario</TableCell>
                                <TableCell>Roles</TableCell>
                                <TableCell>Estado</TableCell>
                                <TableCell width={50}></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {USERS.map(u => (
                                <TableRow key={u.id}>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight="medium">{u.name}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {/* <Chip label="ANALYST" size="small" color="default" variant="outlined" /> Redundant */}
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        size="small"
                                                        checked={u.roles.includes('APPROVER')}
                                                        onChange={() => handleToggleApprover(u.id, u.roles)}
                                                    />
                                                }
                                                label={<Typography variant="caption">Aprobador</Typography>}
                                            />
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Switch
                                            checked={u.active}
                                            onChange={() => handleToggleStatus(u.id, u.active, u.roles)}
                                            color="success"
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Button size="small" onClick={() => openEditDialog(u)}>
                                            Editar
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Paper>
            </Grid>

            {/* Edit User Dialog */}
            {editUser && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
                }}>
                    <Paper sx={{ p: 4, minWidth: 350, maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Typography variant="h6">Editar Usuario</Typography>
                        <Divider />

                        <Typography variant="subtitle2" color="primary">Datos Personales</Typography>
                        <TextField
                            label="Nombre"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            fullWidth
                            size="small"
                        />
                        <TextField
                            label="Apellidos"
                            value={editSurname}
                            onChange={e => setEditSurname(e.target.value)}
                            fullWidth
                            size="small"
                        />

                        <Typography variant="subtitle2" color="primary" sx={{ mt: 1 }}>Cambiar Contraseña (Opcional)</Typography>
                        <TextField
                            label="Nueva Contraseña"
                            type="password"
                            value={editPassword}
                            onChange={e => setEditPassword(e.target.value)}
                            fullWidth
                            size="small"
                        />
                        <TextField
                            label="Confirmar Contraseña"
                            type="password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            fullWidth
                            size="small"
                            error={!!editPassword && editPassword !== confirmPassword}
                            helperText={!!editPassword && editPassword !== confirmPassword ? "Las contraseñas no coinciden" : ""}
                        />

                        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
                            <Button onClick={() => setEditUser(null)} color="inherit">Cancelar</Button>
                            <Button
                                variant="contained"
                                onClick={handleSaveEdit}
                                disabled={!!editPassword && editPassword !== confirmPassword}
                            >
                                Guardar Cambios
                            </Button>
                        </Box>
                    </Paper>
                </div>
            )}
        </Grid>
    );
}

export default function Admin() {
    const [tabIndex, setTabIndex] = useState(0);

    const handleTabChange = (event, newValue) => {
        setTabIndex(newValue);
    };

    return (
        <Box>
            <Typography variant="h5" color="text.primary" sx={{ mb: 1 }}>Administración</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Panel de control global de la aplicación.
            </Typography>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={tabIndex} onChange={handleTabChange}>
                    <Tab label="Tipos de Tarea" />
                    <Tab label="Usuarios" />
                </Tabs>
            </Box>

            {tabIndex === 0 && <TaskTypesTab />}
            {tabIndex === 1 && <UsersTab />}
        </Box>
    );
}
