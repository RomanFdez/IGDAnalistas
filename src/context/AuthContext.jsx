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

    const [users, setUsers] = useState(() => {
        try {
            const storedUsers = localStorage.getItem('appUsers');
            let parsedUsers = storedUsers ? JSON.parse(storedUsers) : DEFAULT_USERS;

            if (!Array.isArray(parsedUsers)) {
                console.warn('Stored users is not an array, resetting to defaults.');
                parsedUsers = DEFAULT_USERS;
            }

            // Migration: Ensure all users have a password
            return parsedUsers.map(u => ({ ...u, password: u.password || '123' }));
        } catch (error) {
            console.error('Error loading users:', error);
            return DEFAULT_USERS.map(u => ({ ...u, password: u.password || '123' }));
        }
    });

    // Remove redundant useEffect for user init


    // Persist Users
    useEffect(() => {
        if (users.length > 0) {
            localStorage.setItem('appUsers', JSON.stringify(users));
        }
    }, [users]);

    const login = (userId, password) => {
        const foundUser = users.find(u => u.id === userId);
        if (foundUser) {
            if (!foundUser.active) {
                alert('Usuario desactivado');
                return false;
            }
            if (foundUser.password !== password) {
                alert('Contraseña incorrecta');
                return false;
            }
            setUser(foundUser);
            localStorage.setItem('currentUser', JSON.stringify(foundUser));
            return true;
        }
        return false;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('currentUser');
    };

    const addUser = (name, surname, password, isApprover) => {
        const roles = ['ANALYST'];
        if (isApprover) roles.push('APPROVER');

        const newUser = {
            id: crypto.randomUUID(),
            name: `${name} ${surname}`,
            roles,
            active: true,
            password: password || '123'
        };
        setUsers(prev => [...prev, newUser]);
    };

    const updateUser = (userId, changes) => {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...changes } : u));
    };

    const toggleUserStatus = (userId) => {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, active: !u.active } : u));
    };

    const USERS = users; // Keep checking compatibility

    return (
        <AuthContext.Provider value={{ user, login, logout, USERS, addUser, toggleUserStatus, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
