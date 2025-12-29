import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, roles }) => {
    const { user, loading } = useAuth();

    if (loading) return null; // Or a spinner

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (roles && roles.length > 0) {
        const hasRole = roles.some(role => user.roles?.includes(role));
        if (!hasRole) {
            return <Navigate to="/dashboard" replace />;
        }
    }

    return children ? children : <Outlet />;
};

export default ProtectedRoute;
