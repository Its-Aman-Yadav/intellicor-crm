import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { Lead } from '@/types/crm';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

export const DEFAULT_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: '',
  authDomain: 'intellicor-crm.firebaseapp.com',
  projectId: 'intellicor-crm',
  storageBucket: 'intellicor-crm.firebasestorage.app',
  messagingSenderId: '268193386935',
  appId: '1:268193386935:web:7b7ef46157233a24a45832',
};

const FIREBASE_CONFIG_STORAGE_KEY = 'intellicor_firebase_config_v1';

export function getStoredFirebaseConfig(): FirebaseConfig {
  // 1. Check user override in localStorage
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(FIREBASE_CONFIG_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // fallback
    }
  }

  // 2. Check environment variables
  if (
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  ) {
    return {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain:
        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
        'intellicor-crm.firebaseapp.com',
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket:
        process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
        'intellicor-crm.firebasestorage.app',
      messagingSenderId:
        process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '268193386935',
      appId:
        process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
        '1:268193386935:web:7b7ef46157233a24a45832',
    };
  }

  // 3. Built-in configuration from project
  return DEFAULT_FIREBASE_CONFIG;
}

export function saveStoredFirebaseConfig(config: FirebaseConfig): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(FIREBASE_CONFIG_STORAGE_KEY, JSON.stringify(config));
}

export function clearStoredFirebaseConfig(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(FIREBASE_CONFIG_STORAGE_KEY);
}

let cachedApp: FirebaseApp | null = null;
let cachedDb: Firestore | null = null;

export function getFirebaseDb(): Firestore | null {
  if (cachedDb) return cachedDb;

  const config = getStoredFirebaseConfig();
  if (!config || !config.apiKey || !config.projectId) {
    return null;
  }

  try {
    cachedApp = getApps().length > 0 ? getApp() : initializeApp(config);
    cachedDb = getFirestore(cachedApp);
    return cachedDb;
  } catch (err) {
    console.error('Failed to initialize Firestore instance:', err);
    return null;
  }
}

export function isFirestoreConfigured(): boolean {
  const config = getStoredFirebaseConfig();
  return Boolean(config && config.apiKey && config.projectId);
}

export async function saveLeadToFirestore(lead: Lead): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db) return false;

  try {
    const leadRef = doc(db, 'leads', lead.id);
    await setDoc(leadRef, lead, { merge: true });
    return true;
  } catch (err) {
    console.error('Error saving lead to Firestore:', err);
    throw err;
  }
}

export async function deleteLeadFromFirestore(leadId: string): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db) return false;

  try {
    const leadRef = doc(db, 'leads', leadId);
    await deleteDoc(leadRef);
    return true;
  } catch (err) {
    console.error('Error deleting lead from Firestore:', err);
    throw err;
  }
}

export async function syncAllLeadsToFirestore(leads: Lead[]): Promise<number> {
  const db = getFirebaseDb();
  if (!db) throw new Error('Firestore is not configured');

  try {
    const batch = writeBatch(db);
    leads.forEach((lead) => {
      const ref = doc(db, 'leads', lead.id);
      batch.set(ref, lead, { merge: true });
    });
    await batch.commit();
    return leads.length;
  } catch (err) {
    console.error('Error batch syncing leads to Firestore:', err);
    throw err;
  }
}

export function subscribeToFirestoreLeads(
  onUpdate: (leads: Lead[]) => void,
  onError?: (err: Error) => void
): (() => void) | null {
  const db = getFirebaseDb();
  if (!db) return null;

  try {
    const leadsCollection = collection(db, 'leads');
    const unsubscribe = onSnapshot(
      leadsCollection,
      (snapshot) => {
        const remoteLeads: Lead[] = [];
        snapshot.forEach((doc) => {
          remoteLeads.push(doc.data() as Lead);
        });
        onUpdate(remoteLeads);
      },
      (error) => {
        console.error('Firestore listener error:', error);
        if (onError) onError(error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.error('Failed to subscribe to Firestore:', err);
    if (onError && err instanceof Error) onError(err);
    return null;
  }
}
