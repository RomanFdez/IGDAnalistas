import React, { useMemo } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { DataProvider, useData } from './context/DataContext'
import { ThemeProvider, CssBaseline, createTheme } from '@mui/material';
import Login from './pages/Login'
import MigrationPage from './pages/Migration'
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Approvals from './pages/Approvals';
import Statistics from './pages/Statistics';
// UserManagement import removed
import Admin from './pages/Admin';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
// Imports cleaned up

const theme = createTheme({
    palette: {
        primary: { main: '#d50000' }, // Mapfre Red
        secondary: { main: '#37474f' },
        background: { default: '#f5f5f5' },
        taskTypes: {
            TRABAJADO: '#E8F5E9',      // Verde
            JIRA: '#C8E6C9',           // Verde oscuro (Green 100)
            YA_IMPUTADO: '#E3F2FD',    // Azul (Blue 50)
            PRE_IMPUTADO: '#BBDEFB',   // Azul oscuro (Blue 100)
            SIN_PROYECTO: '#F5F5F5',   // Gris (Grey 100)
            PENDIENTE: '#FCE4EC',      // Rosa
            REGULARIZADO: '#FFE0B2',   // Naranja (Orange 100)
            RECUPERADO: '#E1BEE7',     // Morado (Purple 100)
            VACACIONES: '#FAFAFA',     // Gris (Grey 50)
            ENFERMEDAD: '#EEEEEE',     // Gris (Grey 200)
            FESTIVO: '#E0E0E0',        // Gris (Grey 300)
            BAJA: '#FBE9E7',           // Kept as existing (Deep Orange 50/reddish)
            OTROS: '#ECEFF1'           // Kept as existing (Blue Grey 50)
        }
    },
    typography: { fontFamily: 'Roboto, sans-serif' }
});

function App() {
    return (
        <AuthProvider>
            <DataProvider>
                <ThemeProvider theme={theme}>
                    <CssBaseline />
                    <Router>
                        <Routes>
                            <Route path="/login" element={<Login />} />
                            <Route path="/migrate" element={<MigrationPage />} />
                            <Route path="/" element={<Navigate to="/dashboard" />} />

                            <Route path="/dashboard" element={
                                <ProtectedRoute>
                                    <Layout><Dashboard /></Layout>
                                </ProtectedRoute>
                            } />

                            <Route path="/tasks" element={
                                <ProtectedRoute>
                                    <Layout><Tasks /></Layout>
                                </ProtectedRoute>
                            } />

                            <Route path="/approvals" element={
                                <ProtectedRoute>
                                    <Layout><Approvals /></Layout>
                                </ProtectedRoute>
                            } />

                            <Route path="/statistics" element={
                                <ProtectedRoute roles={['APPROVER']}>
                                    <Layout><Statistics /></Layout>
                                </ProtectedRoute>
                            } />

                            {/* Route /users removed - Merged into Admin */}

                            <Route path="/admin" element={
                                <ProtectedRoute roles={['APPROVER']}>
                                    <Layout><Admin /></Layout>
                                </ProtectedRoute>
                            } />
                        </Routes>
                    </Router>
                </ThemeProvider>
            </DataProvider>
        </AuthProvider>
    );
}

export default App
