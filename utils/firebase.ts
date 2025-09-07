


import { initializeApp } from 'firebase/app';
// FIX: Use a named import for 'initializeFirestore' to resolve the module resolution error.
import { initializeFirestore } from 'firebase/firestore';
// Use modular imports for firebase/auth to resolve member export errors.
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

let app;
let db;
let auth;

// Ensure this code only runs on the client side and that the configuration is present.
if (typeof window !== 'undefined' && firebaseConfig.projectId) {
  try {
    app = initializeApp(firebaseConfig);
    
    // Initialize Firestore with settings to handle potential issues with undefined properties.
    // FIX: Call the directly imported `initializeFirestore` function.
    db = initializeFirestore(app, {
      ignoreUndefinedProperties: true,
    });

    auth = getAuth(app);

    // Set up an observer on the Auth object to handle user state.
    // If no user is signed in, it attempts to sign them in anonymously.
    onAuthStateChanged(auth, (user) => {
      if (!user) {
        signInAnonymously(auth).catch((error) => {
          console.error("Anonymous sign-in failed:", error);
        });
      }
    });
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }

} else {
    // This warning helps diagnose issues if Firebase variables are missing
    // or if this code is accidentally run in a server-side environment.
    console.warn("Firebase configuration is missing or not running in a client environment.");
}

// Export the initialized instances for use in other parts of the app.
export { db, auth };