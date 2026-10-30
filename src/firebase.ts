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
  initializeFirestore,
  setLogLevel,
  doc,
  setDoc,
  getDoc,
  getDocFromServer,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  deleteDoc,
  serverTimestamp,
  Firestore,
} from 'firebase/firestore';
import config from '../firebase-applet-config.json';
import { emailToFirestoreKey, getActiveEmail, normalizeEmail } from './utils/userStorage';

// Silence internal @firebase/firestore WebChannel timeout console errors when operating in offline/fallback mode
try {
  setLogLevel('silent');
} catch (_) {}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

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
const dbApp = !getApps().some((a) => a.name === 'firestore-app')
  ? initializeApp(firebaseConfig, 'firestore-app')
  : getApp('firestore-app');

// Initialize default app for Google Auth
const app = !getApps().some((a) => a.name === '[DEFAULT]')
  ? initializeApp(firebaseConfig)
  : getApp();

export const auth = getAuth(app);

function createFirestoreInstance(): Firestore {
  const databaseId = config.firestoreDatabaseId || '(default)';
  try {
    return initializeFirestore(
      dbApp,
      {
        experimentalAutoDetectLongPolling: true,
      },
      databaseId
    );
  } catch (_) {
    return getFirestore(dbApp, databaseId);
  }
}

export const db = createFirestoreInstance();
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

let firestoreAvailable = true;

async function withFirestoreGuard<T>(op: () => Promise<T>, fallback: T): Promise<T> {
  if (!firestoreAvailable) return fallback;
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    const timeoutPromise = new Promise<T>((resolve) => {
      timer = setTimeout(() => {
        firestoreAvailable = false;
        resolve(fallback);
      }, 3500);
    });
    return await Promise.race([op(), timeoutPromise]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes('client is offline') ||
      msg.includes('Could not reach Cloud Firestore backend') ||
      msg.includes('unavailable')
    ) {
      firestoreAvailable = false;
    }
    throw err;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  const msg = error instanceof Error ? error.message : String(error);
  if (
    msg.includes('client is offline') ||
    msg.includes('Could not reach Cloud Firestore backend') ||
    msg.includes('unavailable')
  ) {
    firestoreAvailable = false;
  }
  const errInfo: FirestoreErrorInfo = {
    error: msg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email || getActiveEmail() || null,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL,
        })) || [],
    },
    operationType,
    path,
  };
  return errInfo;
}

async function testConnection() {
  try {
    await withFirestoreGuard(
      () => getDocFromServer(doc(db, 'test', 'connection')),
      null
    );
  } catch (_) {
    // Gracefully operate in local + backend file sync mode when Firestore is offline
    firestoreAvailable = false;
  }
}

if (typeof window !== 'undefined') {
  testConnection();
}

/**
 * Resolves the canonical Firestore document ID for a user based on their Email ID.
 */
export function resolveUserEmailKey(emailOrUid?: string | null): string {
  const candidate = emailOrUid || auth.currentUser?.email || getActiveEmail();
  if (!candidate) return '';
  // If candidate is an email, normalize it directly
  if (candidate.includes('@')) {
    return emailToFirestoreKey(candidate);
  }
  // Otherwise fall back to active email if available
  const activeEmail = getActiveEmail();
  if (activeEmail) {
    return emailToFirestoreKey(activeEmail);
  }
  if (candidate.startsWith('student-') || candidate === 'aarav-demo') {
    return '';
  }
  return emailToFirestoreKey(candidate);
}

// Helper for Google Sign-in with fallback
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.warn('Popup blocked or failed, attempting redirect or fallback', error);
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

export async function saveUserProfileByEmail(
  email: string,
  profileData: any,
  statsData?: any,
  extraData?: Record<string, any>
) {
  if (!firestoreAvailable) return;
  const emailKey = resolveUserEmailKey(email);
  if (!emailKey) return;
  const path = `users/${emailKey}`;
  try {
    const userRef = doc(db, 'users', emailKey);
    const payload: Record<string, any> = {
      uid: emailKey,
      email: normalizeEmail(email),
      displayName: profileData?.name || 'Student',
      classLevel: profileData?.classLevel || 'Class 9',
      primaryExam: profileData?.primaryExam || 'CBSE',
      secondaryExams: profileData?.secondaryExams || [],
      language: profileData?.language || 'English',
      dailyHours: profileData?.dailyHours || 1,
      persona: profileData?.persona || 'Friendly & Encouraging Mentor',
      onboarded: profileData?.onboarded ?? true,
      updatedAt: serverTimestamp(),
    };

    if (statsData) {
      payload.dayStreak = statsData.dayStreak ?? 0;
      payload.questionsSolved = statsData.questionsSolved ?? 0;
      payload.correctAnswers = statsData.correctAnswers ?? 0;
      payload.testAccuracy = statsData.testAccuracy ?? 0;
      payload.studyTimeMinutes = statsData.studyTimeMinutes ?? 0;
      payload.starsEarned = statsData.starsEarned ?? 0;
      payload.badgesCount = statsData.badgesCount ?? 0;
    }

    if (extraData) {
      Object.assign(payload, extraData);
    }

    await withFirestoreGuard(() => setDoc(userRef, payload, { merge: true }), undefined);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function saveUserProfile(user: FirebaseUser | { uid: string; email: string | null; displayName?: string | null; photoURL?: string | null }, profileData: any) {
  const email = user.email || getActiveEmail();
  if (!email) return;
  await saveUserProfileByEmail(email, {
    ...profileData,
    name: user.displayName || profileData?.name || 'Student',
  }, profileData);
}

// Safely sign out anonymous sessions to prevent token-service errors
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

export async function getUserProfile(emailOrUid?: string) {
  if (!firestoreAvailable) return null;
  const emailKey = resolveUserEmailKey(emailOrUid);
  if (!emailKey) return null;
  const path = `users/${emailKey}`;
  try {
    const userRef = doc(db, 'users', emailKey);
    const snap = await withFirestoreGuard(() => getDoc(userRef), null);
    if (snap && snap.exists()) {
      return snap.data();
    }
  } catch (err: any) {
    handleFirestoreError(err, OperationType.GET, path);
  }
  return null;
}

export async function saveUserDailyStudyLog(emailOrUid: string, dailyStudyLog: Record<string, number>) {
  if (!firestoreAvailable) return;
  const emailKey = resolveUserEmailKey(emailOrUid);
  if (!emailKey) return;
  const path = `users/${emailKey}`;
  try {
    const userRef = doc(db, 'users', emailKey);
    await withFirestoreGuard(
      () =>
        setDoc(
          userRef,
          {
            uid: emailKey,
            email: emailKey,
            dailyStudyLog,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        ),
      undefined
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function saveUserMockTests(emailOrUid: string, mockTests: any[]) {
  if (!firestoreAvailable) return;
  const emailKey = resolveUserEmailKey(emailOrUid);
  if (!emailKey) return;
  const path = `users/${emailKey}`;
  try {
    const userRef = doc(db, 'users', emailKey);
    await withFirestoreGuard(
      () =>
        setDoc(
          userRef,
          {
            uid: emailKey,
            email: emailKey,
            mockTests: mockTests.slice(0, 100),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        ),
      undefined
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function saveUserRecentScans(emailOrUid: string, recentScans: any[]) {
  if (!firestoreAvailable) return;
  const emailKey = resolveUserEmailKey(emailOrUid);
  if (!emailKey) return;
  const path = `users/${emailKey}`;
  try {
    const userRef = doc(db, 'users', emailKey);
    // Strip oversized base64 thumbnails if needed to stay well within Firestore 1MB doc limit
    const compactScans = recentScans.slice(0, 8).map((s) => ({
      id: s.id,
      title: s.title,
      subject: s.subject,
      time: s.time,
      data: s.data,
    }));
    await withFirestoreGuard(
      () =>
        setDoc(
          userRef,
          {
            uid: emailKey,
            email: emailKey,
            recentScans: compactScans,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        ),
      undefined
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function saveUserPlannerData(
  emailOrUid: string,
  classNum: number,
  plannerPayload: {
    dailyHours: number;
    studyWindow: string;
    timetable: any[];
    examConfigs: Record<string, any>;
  }
) {
  if (!firestoreAvailable) return;
  const emailKey = resolveUserEmailKey(emailOrUid);
  if (!emailKey) return;
  const path = `users/${emailKey}/planner/c${classNum}`;
  try {
    const docRef = doc(db, 'users', emailKey, 'planner', `c${classNum}`);
    await withFirestoreGuard(
      () =>
        setDoc(
          docRef,
          {
            classNum,
            dailyHours: plannerPayload.dailyHours,
            studyWindow: plannerPayload.studyWindow,
            timetable: plannerPayload.timetable.slice(0, 150),
            examConfigs: plannerPayload.examConfigs,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        ),
      undefined
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function getUserPlannerData(emailOrUid: string, classNum: number) {
  if (!firestoreAvailable) return null;
  const emailKey = resolveUserEmailKey(emailOrUid);
  if (!emailKey) return null;
  const path = `users/${emailKey}/planner/c${classNum}`;
  try {
    const docRef = doc(db, 'users', emailKey, 'planner', `c${classNum}`);
    const snap = await withFirestoreGuard(() => getDoc(docRef), null);
    if (snap && snap.exists()) {
      return snap.data();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
  return null;
}

export async function saveUserNote(emailOrUid: string, note: any) {
  if (!firestoreAvailable) return;
  const emailKey = resolveUserEmailKey(emailOrUid);
  if (!emailKey || !note?.id) return;
  const path = `users/${emailKey}/notes/${note.id}`;
  try {
    const noteRef = doc(db, 'users', emailKey, 'notes', note.id);
    await withFirestoreGuard(
      () =>
        setDoc(noteRef, {
          ...note,
          userEmail: emailKey,
          updatedAt: serverTimestamp(),
        }),
      undefined
    );
  } catch (err: any) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function getUserNotes(emailOrUid?: string) {
  if (!firestoreAvailable) return [];
  const emailKey = resolveUserEmailKey(emailOrUid);
  if (!emailKey) return [];
  const path = `users/${emailKey}/notes`;
  try {
    const notesRef = collection(db, 'users', emailKey, 'notes');
    const q = query(notesRef, orderBy('createdAt', 'desc'), limit(50));
    const snap = await withFirestoreGuard(() => getDocs(q), null);
    if (!snap) return [];
    return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
  } catch (err: any) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

export async function deleteUserNote(emailOrUid: string, noteId: string) {
  if (!firestoreAvailable) return;
  const emailKey = resolveUserEmailKey(emailOrUid);
  if (!emailKey || !noteId) return;
  const path = `users/${emailKey}/notes/${noteId}`;
  try {
    const noteRef = doc(db, 'users', emailKey, 'notes', noteId);
    await withFirestoreGuard(() => deleteDoc(noteRef), undefined);
  } catch (err: any) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveUserMistake(emailOrUid: string, mistake: any) {
  if (!firestoreAvailable) return;
  const emailKey = resolveUserEmailKey(emailOrUid);
  if (!emailKey || !mistake?.id) return;
  const path = `users/${emailKey}/mistakes/${mistake.id}`;
  try {
    const mistakeRef = doc(db, 'users', emailKey, 'mistakes', mistake.id);
    await withFirestoreGuard(
      () =>
        setDoc(mistakeRef, {
          ...mistake,
          userEmail: emailKey,
          updatedAt: serverTimestamp(),
        }),
      undefined
    );
  } catch (err: any) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function getUserMistakes(emailOrUid?: string) {
  if (!firestoreAvailable) return [];
  const emailKey = resolveUserEmailKey(emailOrUid);
  if (!emailKey) return [];
  const path = `users/${emailKey}/mistakes`;
  try {
    const ref = collection(db, 'users', emailKey, 'mistakes');
    const q = query(ref, orderBy('timestamp', 'desc'), limit(100));
    const snap = await withFirestoreGuard(() => getDocs(q), null);
    if (!snap) return [];
    return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
  } catch (err: any) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

export async function deleteUserMistake(emailOrUid: string, mistakeId: string) {
  if (!firestoreAvailable) return;
  const emailKey = resolveUserEmailKey(emailOrUid);
  if (!emailKey || !mistakeId) return;
  const path = `users/${emailKey}/mistakes/${mistakeId}`;
  try {
    const ref = doc(db, 'users', emailKey, 'mistakes', mistakeId);
    await withFirestoreGuard(() => deleteDoc(ref), undefined);
  } catch (err: any) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function updateUserMistakeMastery(emailOrUid: string, mistakeId: string, mastered: boolean) {
  if (!firestoreAvailable) return;
  const emailKey = resolveUserEmailKey(emailOrUid);
  if (!emailKey || !mistakeId) return;
  const path = `users/${emailKey}/mistakes/${mistakeId}`;
  try {
    const ref = doc(db, 'users', emailKey, 'mistakes', mistakeId);
    await withFirestoreGuard(
      () => setDoc(ref, { mastered, updatedAt: serverTimestamp() }, { merge: true }),
      undefined
    );
  } catch (err: any) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function saveUserChatPrompt(emailOrUid: string, item: any) {
  if (!firestoreAvailable) return;
  const emailKey = resolveUserEmailKey(emailOrUid);
  if (!emailKey || !item?.id) return;
  const path = `users/${emailKey}/chat_messages/${item.id}`;
  try {
    const ref = doc(db, 'users', emailKey, 'chat_messages', item.id);
    await withFirestoreGuard(
      () =>
        setDoc(ref, {
          ...item,
          userEmail: emailKey,
          updatedAt: serverTimestamp(),
        }),
      undefined
    );
  } catch (err: any) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function getUserChatPrompts(emailOrUid?: string) {
  if (!firestoreAvailable) return [];
  const emailKey = resolveUserEmailKey(emailOrUid);
  if (!emailKey) return [];
  const path = `users/${emailKey}/chat_messages`;
  try {
    const ref = collection(db, 'users', emailKey, 'chat_messages');
    const q = query(ref, orderBy('epoch', 'desc'), limit(100));
    const snap = await withFirestoreGuard(() => getDocs(q), null);
    if (!snap) return [];
    return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
  } catch (err: any) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

export async function deleteUserChatPrompt(emailOrUid: string, id: string) {
  if (!firestoreAvailable) return;
  const emailKey = resolveUserEmailKey(emailOrUid);
  if (!emailKey || !id) return;
  const path = `users/${emailKey}/chat_messages/${id}`;
  try {
    const ref = doc(db, 'users', emailKey, 'chat_messages', id);
    await withFirestoreGuard(() => deleteDoc(ref), undefined);
  } catch (err: any) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function toggleStarUserChatPrompt(emailOrUid: string, id: string, starred: boolean) {
  if (!firestoreAvailable) return;
  const emailKey = resolveUserEmailKey(emailOrUid);
  if (!emailKey || !id) return;
  const path = `users/${emailKey}/chat_messages/${id}`;
  try {
    const ref = doc(db, 'users', emailKey, 'chat_messages', id);
    await withFirestoreGuard(
      () => setDoc(ref, { starred, updatedAt: serverTimestamp() }, { merge: true }),
      undefined
    );
  } catch (err: any) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function saveUserReminders(emailOrUid: string, reminders: any[]) {
  if (!firestoreAvailable) return;
  const emailKey = resolveUserEmailKey(emailOrUid);
  if (!emailKey) return;
  const path = `users/${emailKey}`;
  try {
    const userRef = doc(db, 'users', emailKey);
    await withFirestoreGuard(
      () =>
        setDoc(
          userRef,
          {
            uid: emailKey,
            email: emailKey,
            reminders: reminders.slice(0, 100),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        ),
      undefined
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function getUserReminders(emailOrUid?: string): Promise<any[] | null> {
  if (!firestoreAvailable) return null;
  const emailKey = resolveUserEmailKey(emailOrUid);
  if (!emailKey) return null;
  const path = `users/${emailKey}`;
  try {
    const userRef = doc(db, 'users', emailKey);
    const snap = await withFirestoreGuard(() => getDoc(userRef), null);
    if (snap && snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data?.reminders)) {
        return data.reminders;
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
  return null;
}

export async function clearUserFirestoreData(emailOrUid?: string) {
  if (!firestoreAvailable) return;
  const emailKey = resolveUserEmailKey(emailOrUid);
  if (!emailKey) return;
  const path = `users/${emailKey}`;
  try {
    const userRef = doc(db, 'users', emailKey);
    await withFirestoreGuard(
      () =>
        setDoc(
          userRef,
          {
            uid: emailKey,
            email: emailKey,
            dayStreak: 0,
            questionsSolved: 0,
            correctAnswers: 0,
            testAccuracy: 0,
            studyTimeMinutes: 0,
            starsEarned: 0,
            badgesCount: 0,
            dailyStudyLog: {},
            mockTests: [],
            recentScans: [],
            reminders: [],
            personSnapshot: null,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        ),
      undefined
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

/**
 * Saves the complete unified PersonCompleteData record to Firestore under `users/{emailKey}`
 * so that signing in with the same ID on any device restores all user data.
 */
export async function saveCompletePersonDataToFirestore(
  emailOrUid: string,
  personData: Record<string, any>
) {
  if (!firestoreAvailable) return;
  const emailKey = resolveUserEmailKey(emailOrUid);
  if (!emailKey || !personData) return;
  const path = `users/${emailKey}`;
  try {
    const userRef = doc(db, 'users', emailKey);
    // Keep document compact and well under 1MB Firestore limit
    const compactSnapshot = {
      ...personData,
      notes: Array.isArray(personData.notes) ? personData.notes.slice(0, 40) : [],
      mockTests: Array.isArray(personData.mockTests) ? personData.mockTests.slice(0, 80) : [],
      mistakes: Array.isArray(personData.mistakes) ? personData.mistakes.slice(0, 80) : [],
      tutorHistory: Array.isArray(personData.tutorHistory) ? personData.tutorHistory.slice(0, 40) : [],
      recentScans: Array.isArray(personData.recentScans) ? personData.recentScans.slice(0, 10) : [],
    };
    await withFirestoreGuard(
      () =>
        setDoc(
          userRef,
          {
            uid: emailKey,
            email: normalizeEmail(emailOrUid),
            displayName: personData.profile?.name || personData.account?.displayName || 'Student',
            classLevel: personData.profile?.classLevel || 'Class 10',
            primaryExam: personData.profile?.primaryExam || 'CBSE',
            language: personData.profile?.language || 'English',
            dailyHours: personData.profile?.dailyHours ?? 3,
            persona: personData.profile?.persona || 'Friendly & Encouraging Mentor',
            personSnapshot: compactSnapshot,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        ),
      undefined
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

/**
 * Fetches the unified PersonCompleteData snapshot from Firestore `users/{emailKey}` for cross-device restoration.
 */
export async function getCompletePersonDataFromFirestore(
  emailOrUid?: string
): Promise<Record<string, any> | null> {
  if (!firestoreAvailable) return null;
  const emailKey = resolveUserEmailKey(emailOrUid);
  if (!emailKey) return null;
  const path = `users/${emailKey}`;
  try {
    const userRef = doc(db, 'users', emailKey);
    const snap = await withFirestoreGuard(() => getDoc(userRef), null);
    if (snap && snap.exists()) {
      const data = snap.data();
      if (data?.personSnapshot && typeof data.personSnapshot === 'object') {
        return data.personSnapshot;
      }
      return data;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
  return null;
}

