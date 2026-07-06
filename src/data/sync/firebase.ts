import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';

/**
 * Firebase web config. The apiKey is a public project identifier by design
 * (Firebase security lives in Firestore rules), but we keep it in an env var
 * as standard practice.
 */
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: 'travel-os-ed86a.firebaseapp.com',
  projectId: 'travel-os-ed86a',
  storageBucket: 'travel-os-ed86a.firebasestorage.app',
  messagingSenderId: '925454683465',
  appId: '1:925454683465:web:2a8c7db8953624ae869e98',
};

let app: FirebaseApp | null = null;
let firestore: Firestore | null = null;

export function isFirebaseConfigured(): boolean {
  return Boolean(config.apiKey);
}

/** Lazy init: the app runs fully offline-local until sync is enabled. */
export function getFirestoreDb(): Firestore {
  if (!config.apiKey) throw new Error('missing VITE_FIREBASE_API_KEY');
  if (!app) {
    app = initializeApp(config);
    firestore = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      // Safari / iOS PWA often blocks Firestore's WebChannel; without this,
      // initial fetches work but realtime updates never arrive (one-way sync).
      experimentalAutoDetectLongPolling: true,
    });
  }
  return firestore!;
}
