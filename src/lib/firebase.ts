// 🔴 FIREBASE DISABLED - FULLY MIGRATED TO SUPABASE
// Firebase SDK remains installed for rollback safety only.
// All database operations now use Supabase via @/lib/supabase.service.
// Auth was migrated in Phase 1; Firestore data migration is now complete.

import { initializeApp, getApps, getApp } from "firebase/app";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error("Firebase environment variables are missing.");
}

const isFirstInit = getApps().length === 0;
const app = isFirstInit ? initializeApp(firebaseConfig) : getApp();

// 🔴 FIRESTORE DISABLED - All data operations migrated to Supabase PostgreSQL
// const db = isFirstInit
//   ? initializeFirestore(app, {
//       localCache: persistentLocalCache({ tabManager: persistentSingleTabManager({}) }),
//     })
//   : getFirestore(app);

// 🔴 FIREBASE DISABLED - Firestore instance no longer needed
// export { app, db };
export { app };
