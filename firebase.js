import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyB5irj-80rpE73sdDESmvpZ6_bTzlwNjdo",
  authDomain: "camera-spec-finder.firebaseapp.com",
  projectId: "camera-spec-finder",
  storageBucket: "camera-spec-finder.firebasestorage.app",
  messagingSenderId: "862939642767",
  appId: "1:862939642767:web:7f056f12e67f7be5d329fa"
};

// Initialize Firebase (prevent duplicate app error during SSR/prerendering)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Auth
export const auth = getAuth(app);

export default app;
