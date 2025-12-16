import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    Box, Paper, Typography, MenuItem, TextField, Button, Container
} from '@mui/material';
import { AccountCircle } from '@mui/icons-material';

export default function Login() {
    const { login, USERS } = useAuth();
    const navigate = useNavigate();
    const [selectedId, setSelectedId] = useState('');
    const [password, setPassword] = useState('');

    useEffect(() => {
        if (USERS && USERS.length > 0 && !selectedId) {
            setSelectedId(USERS[0].id);
        }
    }, [USERS, selectedId]);

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!selectedId || !password) return;

        // The API/AuthContext now expects the 'username' (name property) for the API call 
        // OR the AuthContext handles the lookup? 
        // Let's modify handleLogin to find the user object and pass the name if needed, 
        // OR rely on AuthContext to do the right thing. 
        // Looking at AuthContext changes: api/login expects { username, password }.
        // If I pass ID to AuthContext.login, it needs to be adapted.

        // Let's fix this here: Get the name from the selected ID.
        const userObj = USERS.find(u => u.id === selectedId);
        if (userObj) {
            const success = await login(userObj.name, password); // Pass Name as Username
            if (success) {
                navigate('/');
            }
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'background.default'
            }}
        >
            <Container maxWidth="xs">
                <Paper
                    elevation={3}
                    sx={{
                        p: 4,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 3
                    }}
                >
                    <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" component="h1" color="primary" fontWeight="bold">
                            Imputaciones GD Analistas
                        </Typography>
                        <Typography variant="subtitle1" color="text.secondary">
                            Imputad malditos... v1.0
                        </Typography>
                    </Box>

                    <form onSubmit={handleLogin} style={{ width: '100%' }}>
                        <TextField
                            select
                            label="Selecciona Usuario"
                            value={selectedId}
                            onChange={(e) => setSelectedId(e.target.value)}
                            fullWidth
                            sx={{ mb: 3 }}
                        >
                            {USERS.map((option) => (
                                <MenuItem key={option.id} value={option.id}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <AccountCircle color="action" />
                                        {option.name} ({option.roles.join(', ')})
                                    </Box>
                                </MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            label="Contraseña"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            fullWidth
                            required
                            sx={{ mb: 3 }}
                        />

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            size="large"
                            sx={{ py: 1.5, fontSize: '1.1rem' }}
                        >
                            Entrar
                        </Button>
                    </form>
                </Paper>
            </Container>
        </Box>
    );
}
