import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    Box, Paper, Typography, TextField, Button, Container, Alert, MenuItem,
    Stepper, Step, StepLabel
} from '@mui/material';
import { collection, getDocs, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';

export default function MigrationPage() {
    const navigate = useNavigate();
    const [activeStep, setActiveStep] = useState(0);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // 1. Fetch Users from Firestore (migrated data)
    useEffect(() => {
        const fetchUsers = async () => {
            const querySnapshot = await getDocs(collection(db, 'users'));
            // Modified filter: Show non-migrated users OR users without UID
            const list = querySnapshot.docs.map(d => ({
                id: d.id,
                ...d.data()
            })).filter(u => !u.migrated && !u.uid);
            setUsers(list);
        };
        fetchUsers();
    }, []);

    const handleRegister = async () => {
        setError('');
        setLoading(true);
        try {
            let user;
            try {
                // A. Create Auth User
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                user = userCredential.user;
            } catch (authError) {
                if (authError.code === 'auth/email-already-in-use') {
                    // Try to login instead
                    try {
                        const loginCredential = await signInWithEmailAndPassword(auth, email, password);
                        user = loginCredential.user;
                        console.log("Logged in existing user for linking:", user.email);
                    } catch (loginError) {
                        throw new Error("El usuario ya existe y la contraseña es incorrecta. No se puede vincular.");
                    }
                } else {
                    throw authError; // Re-throw other errors
                }
            }

            if (!user) throw new Error("No se pudo autenticar al usuario.");

            // B. Link to Firestore Document
            // Prepare new data
            const sourceDoc = users.find(u => u.id === selectedUser);
            if (!sourceDoc) throw new Error("Usuario seleccionado no encontrado en la lista.");

            const oldUserDocRef = doc(db, 'users', selectedUser);

            const newData = { ...sourceDoc, uid: user.uid, email: user.email, migrated: true };
            // We KEEP the id (e.g. "u-1") so that user.id remains valid for legacy checks.
            // delete newData.id; 

            // 1. Update OLD doc to point to NEW (optional, mostly for consistency or redirect)
            await updateDoc(oldUserDocRef, {
                uid: user.uid,
                email: user.email,
                migrated: true
            });

            // 2. Create NEW doc at /users/{uid}
            await setDoc(doc(db, 'users', user.uid), newData);

            alert("Migración completada. Bienvenido.");
            window.location.href = '/'; // Hard redirect to force context update
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
            <Container maxWidth="sm">
                <Paper sx={{ p: 4 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h5">Migración de Cuenta</Typography>
                        {auth.currentUser && (
                            <Button size="small" color="inherit" onClick={() => signOut(auth).then(() => window.location.reload())}>
                                Cerrar Sesión
                            </Button>
                        )}
                    </Box>

                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                    <Stepper activeStep={activeStep} orientation="vertical">
                        <Step>
                            <StepLabel>Selecciona tu usuario antiguo</StepLabel>
                            {activeStep === 0 && (
                                <Box sx={{ mt: 2 }}>
                                    <TextField select fullWidth label="Usuario" value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
                                        {users.map(u => (
                                            <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>
                                        ))}
                                    </TextField>
                                    <Button sx={{ mt: 2 }} variant="contained" onClick={() => selectedUser && setActiveStep(1)}>Siguiente</Button>
                                </Box>
                            )}
                        </Step>
                        <Step>
                            <StepLabel>Crea tus credenciales (o vincula existente)</StepLabel>
                            {activeStep === 1 && (
                                <Box sx={{ mt: 2 }}>
                                    <Alert severity="info" sx={{ mb: 2 }}>
                                        Si ya has creado una cuenta, usa el mismo email y contraseña para vincularla.
                                    </Alert>
                                    <TextField fullWidth label="Email" value={email} onChange={e => setEmail(e.target.value)} sx={{ mb: 2 }} />
                                    <TextField fullWidth type="password" label="Contraseña" value={password} onChange={e => setPassword(e.target.value)} sx={{ mb: 2 }} />
                                    <Button variant="contained" onClick={handleRegister} disabled={loading}>{loading ? 'Migrando...' : 'Finalizar'}</Button>
                                </Box>
                            )}
                        </Step>
                    </Stepper>
                </Paper>
            </Container>
        </Box>
    );
}
