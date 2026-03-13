/// <reference types="vite/client" />
import { initializeApp } from 'firebase/app';
import { getDatabase, type Database } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const isConfigured =
  typeof firebaseConfig.apiKey === 'string' &&
  firebaseConfig.apiKey.length > 0 &&
  typeof firebaseConfig.databaseURL === 'string' &&
  firebaseConfig.databaseURL.length > 0;

let app: ReturnType<typeof initializeApp> | null = null;
let db: Database | null = null;

if (isConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    console.log('[Firebase] Initialized successfully. DB URL:', firebaseConfig.databaseURL);
  } catch (e) {
    console.warn('[Firebase] Failed to initialize:', e);
  }
} else {
  console.warn(
    '[Firebase] NOT configured. apiKey present:',
    typeof firebaseConfig.apiKey === 'string' && firebaseConfig.apiKey.length > 0,
    '| databaseURL present:',
    typeof firebaseConfig.databaseURL === 'string' && firebaseConfig.databaseURL.length > 0,
  );
}

export { db, isConfigured as isFirebaseConfigured };