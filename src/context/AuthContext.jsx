import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const DEFAULT_USERS = [
    { id: 'u1', name: 'Ana Analista', roles: ['ANALYST'], active: true, password: '123' },
    { id: 'u2', name: 'Pedro Aprobador', roles: ['ANALYST', 'APPROVER'], active: true, password: '123' },
    { id: 'u3', name: 'Carlos Coordinador', roles: ['APPROVER'], active: true, password: '123' }
];

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const storedUser = localStorage.getItem('currentUser');
        return storedUser ? JSON.parse(storedUser) : null;
    });

    const [users, setUsers] = useState([]);

    // Fetch Users on Mount
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await fetch('/api/users');
                if (response.ok) {
                    const data = await response.json();
                    setUsers(data);
                } else {
                    console.error('Failed to fetch users');
                }
            } catch (error) {
                console.error('Error loading users:', error);
            }
        };
        fetchUsers();
    }, []);

    const login = async (username, password) => { // Changed arg from userId to username to match login form usually or adaption
        // Actually the Login.jsx likely passes (userId, password) based on selection.
        // But with real auth, we usually send credentials.
        // Let's keep the existing UI logic if possible: The UI selects a user ID from a list? 
        // No, Login.jsx usually has inputs. Let's check Login.jsx usage.

        // Retaining hybrid approach: If we want to validate securely, we should hit /api/login
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                const userData = await response.json();
                if (!userData.active) {
                    alert('Usuario desactivado');
                    return false;
                }
                setUser(userData);
                localStorage.setItem('currentUser', JSON.stringify(userData)); // Keep session in LS for reload
                return true;
            } else {
                alert('Credenciales incorrectas');
                return false;
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Error de conexión');
            return false;
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('currentUser');
    };

    const addUser = async (name, surname, password, isApprover) => {
        const roles = ['ANALYST'];
        if (isApprover) roles.push('APPROVER');

        const newUser = {
            id: crypto.randomUUID(),
            name: `${name} ${surname}`,
            roles,
            active: true,
            password: password || '123'
        };

        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser)
            });
            if (res.ok) {
                const savedUser = await res.json();
                setUsers(prev => [...prev, savedUser]);
            }
        } catch (error) {
            console.error('Error adding user:', error);
        }
    };

    const updateUser = async (userId, changes) => {
        // Optimistic update
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...changes } : u));
        try {
            await fetch(`/api/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(changes)
            });
        } catch (error) {
            console.error('Error updating user:', error);
        }
    };

    const toggleUserStatus = async (userId) => {
        const userToUpdate = users.find(u => u.id === userId);
        if (!userToUpdate) return;

        const newStatus = !userToUpdate.active;
        updateUser(userId, { active: newStatus });
    };

    const USERS = users; // Keep checking compatibility

    return (
        <AuthContext.Provider value={{ user, login, logout, USERS, addUser, toggleUserStatus, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
