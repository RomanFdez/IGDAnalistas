import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext'; // This will resolve to the active AuthContext
import { useNavigate } from 'react-router-dom';
import {
    Box, Paper, Typography, TextField, Button, Container, Alert
} from '@mui/material';

export default function Login() {
    const { login, loginWithMicrosoft, user } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Navigate once user is authenticated
    React.useEffect(() => {
        if (user) {
            navigate('/');
        }
    }, [user, navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Login triggers onAuthStateChanged, which updates user, which triggers useEffect above.
            const success = await login(email, password);
            if (!success) {
                setError('No se pudo iniciar sesión. Verifica tus credenciales.');
                setLoading(false);
            }
            // Do NOT navigate here. Wait for user state.
        } catch (err) {
            setError('Error al iniciar sesión: ' + err.message);
            setLoading(false);
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
                            Imputaciones GD
                        </Typography>
                        <Typography variant="subtitle1" color="text.secondary">
                            Acceso seguro
                        </Typography>
                    </Box>

                    {error && <Alert severity="error" sx={{ width: '100%' }}>{error}</Alert>}

                    <Button
                        fullWidth
                        variant="outlined"
                        onClick={async () => {
                            try {
                                await loginWithMicrosoft();
                            } catch (e) {
                                setError('Error con Microsoft: ' + e.message);
                            }
                        }}
                        startIcon={
                            <img src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg" alt="Microsoft" style={{ width: 20, height: 20 }} />
                        }
                        sx={{ mb: 2, textTransform: 'none', fontWeight: 'bold', color: '#5e5e5e', borderColor: '#c8c8c8' }}
                    >
                        Iniciar sesión con Microsoft
                    </Button>

                    <Typography variant="body2" color="text.secondary" sx={{ width: '100%', textAlign: 'center', my: 2 }}>
                        o usa tu correo
                    </Typography>

                    <form onSubmit={handleLogin} style={{ width: '100%' }}>
                        <TextField
                            label="Correo Electrónico"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            fullWidth
                            required
                            autoFocus
                            sx={{ mb: 3 }}
                        />

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
                            disabled={loading}
                            sx={{ py: 1.5, fontSize: '1.1rem' }}
                        >
                            {loading ? 'Entrando...' : 'Entrar'}
                        </Button>

                    </form>
                </Paper>
            </Container>
        </Box>
    );
}
