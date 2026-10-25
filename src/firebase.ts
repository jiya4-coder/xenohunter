import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  addDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import config from '../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId,
  measurementId: config.measurementId,
};

// Initialize dedicated Firebase app instance for Firestore without Auth binding
// This prevents token exchange calls to disabled securetoken.googleapis.com in project 624876270112
const dbApp = !getApps().some((a) => a.name === 'firestore-app')
  ? initializeApp(firebaseConfig, 'firestore-app')
  : getApp('firestore-app');

// Initialize default app for Google Auth
const app = !getApps().some((a) => a.name === '[DEFAULT]')
  ? initializeApp(firebaseConfig)
  : getApp();

export const auth = getAuth(app);
export const db = getFirestore(dbApp, config.firestoreDatabaseId || '(default)');
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Helper for Google Sign-in with fallback
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.warn('Popup blocked or failed, attempting redirect or mock fallback', error);
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
      try {
        await signInWithRedirect(auth, googleProvider);
      } catch (redirectErr) {
        console.error('Redirect sign in error:', redirectErr);
      }
    }
    throw error;
  }
}

export async function signOutAccount() {
  await signOut(auth);
}

export async function saveUserProfile(user: FirebaseUser, profileData: any) {
  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(
      userRef,
      {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || profileData.name || 'Scholar',
        photoURL: user.photoURL || null,
        classLevel: profileData.classLevel || 'Class 9',
        primaryExam: profileData.primaryExam || 'CBSE',
        language: profileData.language || 'English',
        dailyHours: profileData.dailyHours || 3,
        dayStreak: profileData.dayStreak || 7,
        questionsSolved: profileData.questionsSolved || 133,
        testAccuracy: profileData.testAccuracy || 86,
        studyTimeMinutes: profileData.studyTimeMinutes || 160,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error('Error saving user profile to Firestore:', err);
  }
}

// If an anonymous or stale token is in storage that cannot be refreshed due to Token Service API being disabled in GCP,
// safely sign out so it doesn't trigger continuous securetoken.googleapis.com token-service errors.
if (typeof window !== 'undefined') {
  onAuthStateChanged(auth, async (user) => {
    if (user && user.isAnonymous) {
      try {
        await signOut(auth);
      } catch (_) {}
    }
  });
}

export async function ensureAnonymousAuth() {
  return null;
}

export async function getUserProfile(uid?: string) {
  const targetUid = uid || auth.currentUser?.uid || 'aarav-demo';
  try {
    const userRef = doc(db, 'users', targetUid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (err: any) {
    console.warn('Could not fetch user profile from Firestore:', err?.message);
  }
  return null;
}

export async function saveUserNote(uid: string, note: any) {
  const targetUid = uid || auth.currentUser?.uid || 'aarav-demo';
  try {
    const noteRef = doc(db, 'users', targetUid, 'notes', note.id);
    await setDoc(noteRef, {
      ...note,
      updatedAt: serverTimestamp(),
    });
  } catch (err: any) {
    console.warn('Could not save note to Firestore:', err?.message);
  }
}

export async function getUserNotes(uid?: string) {
  const targetUid = uid || auth.currentUser?.uid || 'aarav-demo';
  try {
    const notesRef = collection(db, 'users', targetUid, 'notes');
    const q = query(notesRef, orderBy('createdAt', 'desc'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
  } catch (err: any) {
    console.warn('Could not fetch notes from Firestore (using local storage):', err?.message);
    return [];
  }
}

export async function deleteUserNote(uid: string, noteId: string) {
  const targetUid = uid || auth.currentUser?.uid || 'aarav-demo';
  try {
    const noteRef = doc(db, 'users', targetUid, 'notes', noteId);
    await deleteDoc(noteRef);
  } catch (err: any) {
    console.warn('Could not delete note from Firestore:', err?.message);
  }
}

export async function saveUserMistake(uid: string, mistake: any) {
  const targetUid = uid || auth.currentUser?.uid || 'aarav-demo';
  try {
    const mistakeRef = doc(db, 'users', targetUid, 'mistakes', mistake.id);
    await setDoc(mistakeRef, {
      ...mistake,
      updatedAt: serverTimestamp(),
    });
  } catch (err: any) {
    console.warn('Could not save mistake to Firestore:', err?.message);
  }
}

export async function getUserMistakes(uid?: string) {
  const targetUid = uid || auth.currentUser?.uid || 'aarav-demo';
  try {
    const ref = collection(db, 'users', targetUid, 'mistakes');
    const q = query(ref, orderBy('timestamp', 'desc'), limit(100));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
  } catch (err: any) {
    console.warn('Could not fetch mistakes from Firestore:', err?.message);
    return [];
  }
}

export async function deleteUserMistake(uid: string, mistakeId: string) {
  const targetUid = uid || auth.currentUser?.uid || 'aarav-demo';
  try {
    const ref = doc(db, 'users', targetUid, 'mistakes', mistakeId);
    await deleteDoc(ref);
  } catch (err: any) {
    console.warn('Could not delete mistake from Firestore:', err?.message);
  }
}

export async function updateUserMistakeMastery(uid: string, mistakeId: string, mastered: boolean) {
  const targetUid = uid || auth.currentUser?.uid || 'aarav-demo';
  try {
    const ref = doc(db, 'users', targetUid, 'mistakes', mistakeId);
    await setDoc(ref, { mastered, updatedAt: serverTimestamp() }, { merge: true });
  } catch (err: any) {
    console.warn('Could not update mistake mastery:', err?.message);
  }
}

export async function saveUserChatPrompt(uid: string, item: any) {
  const targetUid = uid || auth.currentUser?.uid || 'aarav-demo';
  try {
    const ref = doc(db, 'users', targetUid, 'chat_messages', item.id);
    await setDoc(ref, {
      ...item,
      updatedAt: serverTimestamp(),
    });
  } catch (err: any) {
    console.warn('Could not save prompt to Firestore:', err?.message);
  }
}

export async function getUserChatPrompts(uid?: string) {
  const targetUid = uid || auth.currentUser?.uid || 'aarav-demo';
  try {
    const ref = collection(db, 'users', targetUid, 'chat_messages');
    const q = query(ref, orderBy('epoch', 'desc'), limit(100));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
  } catch (err: any) {
    console.warn('Could not fetch chat prompts from Firestore:', err?.message);
    return [];
  }
}

export async function deleteUserChatPrompt(uid: string, id: string) {
  const targetUid = uid || auth.currentUser?.uid || 'aarav-demo';
  try {
    const ref = doc(db, 'users', targetUid, 'chat_messages', id);
    await deleteDoc(ref);
  } catch (err: any) {
    console.warn('Could not delete prompt from Firestore:', err?.message);
  }
}

export async function toggleStarUserChatPrompt(uid: string, id: string, starred: boolean) {
  const targetUid = uid || auth.currentUser?.uid || 'aarav-demo';
  try {
    const ref = doc(db, 'users', targetUid, 'chat_messages', id);
    await setDoc(ref, { starred, updatedAt: serverTimestamp() }, { merge: true });
  } catch (err: any) {
    console.warn('Could not toggle star on prompt:', err?.message);
  }
}




