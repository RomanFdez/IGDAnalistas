import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState([]); // List of all users for Admin

    // Listen to Auth State
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Get extra user data from Firestore
                const userDocRef = doc(db, 'users', firebaseUser.uid);
                const userDoc = await getDoc(userDocRef);

                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    // Merge auth data with firestore data
                    setUser({
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                        ...userData
                    });
                } else {
                    // Fallback if no specific doc (shouldn't happen if setup correctly)
                    setUser(firebaseUser);
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const login = async (email, password) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            return true;
        } catch (error) {
            console.error("Login Check Error:", error);
            alert("Error de autenticación: " + error.message);
            return false;
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            setUser(null);
        } catch (error) {
            console.error("Logout Error:", error);
        }
    };

    // Admin: Add User
    // NOTE: In client-side logic, creating a user logs them in immediately.
    // For a proper Admin panel, you should use a Firebase Cloud Function.
    // This implementation is a placeholder that would switch the current session (NOT IDEAL).
    const addUser = async (name, surname, password, isApprover, email) => {
        // TODO: Implement via Cloud Function to avoid logging out the admin.
        alert('Para añadir usuarios en Firebase, por favor usa la Consola de Firebase o implementa una Cloud Function.');
        return;

        /* 
        // Logic for Cloud Function:
        const roles = ['ANALYST'];
        if (isApprover) roles.push('APPROVER');
        
        // 1. Create Auth User (Admin SDK)
        // 2. Create Firestore Doc
        await setDoc(doc(db, 'users', uid), {
            id: uid,
            name: `${name} ${surname}`,
            roles,
            active: true,
            email
        });
        */
    };

    const toggleUserStatus = async (userId) => {
        // Logic to update Firestore
        // Note: Disabling in Firestore doesn't prevent Auth login automatically without a Cloud Function check or Claims.
        // We will just check 'active' flag in the UI/Rules.
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            await updateDoc(userRef, {
                active: !userSnap.data().active
            });
        }
    };

    const updateUser = async (userId, changes) => {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, changes);
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            login,
            logout,
            addUser,
            toggleUserStatus,
            updateUser,
            users
        }}>
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                    <h2>Cargando sistema...</h2>
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
