import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore with offline persistence
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
}, firebaseConfig.firestoreDatabaseId);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const signInWithGoogle = async () => {
  try {
    // Ensure persistence is set to local
    await setPersistence(auth, browserLocalPersistence);
    return await signInWithPopup(auth, googleProvider);
  } catch (error: any) {
    if (error.code === 'auth/cancelled-popup-request') {
      console.warn("Google Login Cancelled by user.");
      return null;
    }
    
    if (error.code === 'auth/network-request-failed') {
      console.error("Network error during login. This often happens if the domain is not authorized in Firebase Console or if a browser extension is blocking the request.");
    }

    console.error("Google Login Error:", error);
    throw error;
  }
};

export const logout = () => signOut(auth);

export * from './utils/firestoreError';
