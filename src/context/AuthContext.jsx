import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    getAuth,
    signInWithPopup,
    OAuthProvider
} from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { auth, db, firebaseConfig } from '../firebase/config';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState([]); // List of all users for Admin

    // Listen to Auth State
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    const userDocRef = doc(db, 'users', firebaseUser.uid);
                    const userDoc = await getDoc(userDocRef);

                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        setUser({
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            ...userData
                        });
                    } else {
                        console.warn("User authenticated but no Firestore profile found.");
                        setUser({
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            roles: [],
                            name: firebaseUser.email.split('@')[0]
                        });
                    }
                } catch (error) {
                    console.error("Error fetching user profile:", error);
                    setUser(firebaseUser);
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Fetch all users if current user is APPROVER or ADMIN
    useEffect(() => {
        if (user && (user.roles?.includes('APPROVER') || user.roles?.includes('ADMIN'))) {
            // Import collection/getDocs if not imported? They are imported.
            // Using getDocs to fetch all users.
            const fetchAllUsers = async () => {
                try {
                    const q = collection(db, 'users');
                    const snap = await getDocs(q);

                    let rawList = snap.docs.map(d => {
                        const data = d.data();
                        return { ...data, id: data.id || d.id, docId: d.id };
                    });

                    // Filter out "movedTo" docs
                    rawList = rawList.filter(u => !u.movedTo);

                    // Deduplicate by 'id'
                    const uniqueMap = new Map();
                    rawList.forEach(u => {
                        if (!uniqueMap.has(u.id)) {
                            uniqueMap.set(u.id, u);
                        } else {
                            const existing = uniqueMap.get(u.id);
                            // If current 'u' is better (migrated), replace.
                            if (u.migrated && !existing.migrated) {
                                uniqueMap.set(u.id, u);
                            }
                        }
                    });

                    setUsers(Array.from(uniqueMap.values()));
                } catch (e) {
                    console.error("Error fetching users list:", e);
                }
            };
            fetchAllUsers();
        }
    }, [user]);

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

    const loginWithMicrosoft = async () => {
        try {
            const provider = new OAuthProvider('microsoft.com');
            // Optional: provider.setCustomParameters({ prompt: 'select_account' });

            await signInWithPopup(auth, provider);
            return true;
        } catch (error) {
            console.error("Microsoft Login Error:", error);
            throw error; // Propagate error to UI
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            return true;
        } catch (error) {
            console.error("Logout Error:", error);
            return false;
        }
    };

    // Helper: Create Auth User without logging out Admin
    const createAuthUser = async (email, password) => {
        let secondaryApp;
        try {
            secondaryApp = initializeApp(firebaseConfig, "SecondaryApp" + Date.now());
            const secondaryAuth = getAuth(secondaryApp);
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
            await signOut(secondaryAuth);
            return userCredential.user.uid;
        } catch (error) {
            throw error;
        } finally {
            if (secondaryApp) await deleteApp(secondaryApp);
        }
    };

    const addUser = async (name, surname, password, isApprover, email) => {
        try {
            if (!email) throw new Error("El email es obligatorio");

            const uid = await createAuthUser(email, password);

            const userData = {
                uid: uid,
                name: `${name} ${surname}`.trim(),
                email: email,
                roles: isApprover ? ['ANALYST', 'APPROVER'] : ['ANALYST'],
                active: true,
                migrated: false
            };

            await setDoc(doc(db, 'users', uid), userData);

            setUsers(prev => [...prev, { ...userData, id: uid }]);

            alert('Usuario creado correctamente en Firebase.');
        } catch (error) {
            console.error("Add User Error:", error);
            alert("Error creando usuario: " + error.message);
            throw error;
        }
    };

    const migrateBatch = async (usersList, domain) => {
        let successCount = 0;
        let errors = [];

        for (const u of usersList) {
            try {
                let email = u.email;
                if (!email) {
                    // Sanitize name: "Álvaro Román " -> "alvaro.roman"
                    const normalized = u.name.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                    const cleanName = normalized.replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.');
                    email = `${cleanName}@${domain}`;
                }

                // Password: Use exist or '123456' or similar? Backup has password.
                // If password missing, use default.
                const pwd = u.password || 'Malditos2025';

                const uid = await createAuthUser(email, pwd);

                const userData = {
                    uid: uid,
                    id: u.id,
                    name: u.name,
                    email: email,
                    roles: u.roles || ['ANALYST'],
                    active: u.active !== undefined ? u.active : true,
                    migrated: true
                };

                await setDoc(doc(db, 'users', uid), userData);
                successCount++;
            } catch (err) {
                console.error(`Error migrating ${u.name}:`, err);
                if (err.code === 'auth/email-already-in-use') {
                    errors.push(`${u.name}: Email ya existe. Omitido.`);
                } else {
                    errors.push(`${u.name}: ${err.message}`);
                }
            }
        }

        if (successCount > 0) {
            const q = collection(db, 'users');
            const snap = await getDocs(q);
            const list = snap.docs.map(d => ({ ...d.data(), id: d.data().id || d.id }));
            setUsers(list);
        }

        return { successCount, errors };
    };

    // Helper: Generate Auth Users for existing Firestore profiles
    const syncFirestoreToAuth = async () => {
        const q = collection(db, 'users');
        const snap = await getDocs(q);
        const allDocs = snap.docs.map(d => ({ ...d.data(), docId: d.id }));

        let success = 0;
        let errors = [];

        for (const u of allDocs) {

            // Skip if inactive or moved
            if (u.active === false || u.movedTo) continue;

            if (!u.email) {
                // If no email, check if we can generate it? No, user said they edited them.
                errors.push(`${u.name || u.id}: No tiene email.`);
                continue;
            }

            try {
                // Try to create Auth
                // If password missing, default.
                const pwd = u.password || 'Malditos2025';

                let uid;
                try {
                    // Try creating. If exists, we catch it.
                    uid = await createAuthUser(u.email, pwd);
                } catch (e) {
                    if (e.code === 'auth/email-already-in-use') {
                        errors.push(`${u.email}: Ya existe en Auth.`);
                        continue;
                    }
                    throw e; // Other error
                }

                if (uid) {
                    // Create new doc at UID
                    const newUserData = {
                        ...u,
                        uid: uid,
                        migrated: true
                    };

                    await setDoc(doc(db, 'users', uid), newUserData);

                    // Mark old doc as moved/inactive
                    if (u.docId !== uid) {
                        await updateDoc(doc(db, 'users', u.docId), { movedTo: uid, active: false });
                    }
                    success++;
                }

            } catch (err) {
                console.error("Sync Error", err);
                errors.push(`${u.name}: ${err.message}`);
            }
        }

        // Refresh
        const qRe = collection(db, 'users');
        const snapRe = await getDocs(qRe);
        const list = snapRe.docs.map(d => ({ ...d.data(), id: d.data().id || d.id }));
        setUsers(list);

        return { success, errors };
    };

    const toggleUserStatus = async (userId) => {
        // Need docId
        const localUser = users.find(u => u.id === userId);
        const refId = localUser?.docId || userId;

        const userRef = doc(db, 'users', refId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const newStatus = !userSnap.data().active;
            await updateDoc(userRef, {
                active: newStatus
            });
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, active: newStatus } : u));
        }
    };

    const updateUser = async (userId, changes) => {
        const localUser = users.find(u => u.id === userId);
        const refId = localUser?.docId || userId;

        const userRef = doc(db, 'users', refId);
        await updateDoc(userRef, changes);
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...changes } : u));
    };

    return (
        <AuthContext.Provider value={{
            user, loading,
            login, logout, users,
            addUser, toggleUserStatus, updateUser,
            createAuthUser, migrateBatch, syncFirestoreToAuth,
            loginWithMicrosoft
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
