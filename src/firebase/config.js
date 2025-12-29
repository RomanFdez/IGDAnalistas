// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Replace the following with your app's Firebase project configuration
// See: https://firebase.google.com/docs/web/learn-more#config-object
export const firebaseConfig = {
    apiKey: "AIzaSyAOdRnWeZongByOo_HuqimZKGa9AmLixGY",
    authDomain: "imputacionesgd.firebaseapp.com",
    projectId: "imputacionesgd",
    storageBucket: "imputacionesgd.firebasestorage.app",
    messagingSenderId: "452590703438",
    appId: "1:452590703438:web:d1507a8e7ea5e7787b441f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Conditional Analytics (only in browser)
let analytics;
if (typeof window !== 'undefined') {
    analytics = getAnalytics(app);
}

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
