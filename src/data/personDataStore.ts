/**
 * Unified Person Data Store (`/src/data/personDataStore.ts`)
 *
 * Centralizes and persists the ENTIRE data of a person in a single structured
 * record (`PersonCompleteData`). Synchronizes seamlessly across:
 *   1. Email-scoped `localStorage` (`studybot_person_master_record::<email>`)
 *   2. Server-side disk file (`/person_data.json` via `/api/person-data`)
 *   3. Firebase Firestore (`users/<emailKey>`)
 *   4. Downloadable / Importable `.json` file for user backup & restore
 */

import {
  StudentProfile,
  StudyStats,
  StudyNote,
  MistakeRecord,
  PromptHistoryItem,
  Flashcard,
} from '../types';
import {
  getActiveEmail,
  getUserItem,
  normalizeEmail,
  setUserItem,
  emailToFirestoreKey,
} from '../utils/userStorage';
import {
  saveCompletePersonDataToFirestore,
  getCompletePersonDataFromFirestore,
  getUserNotes,
} from '../firebase';

export interface PersonAccountInfo {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  provider: 'google' | 'lovable' | 'email';
  accountPlan: 'Free Plan' | 'Scholar Pro';
}

export interface PersonSettingsPreferences {
  themeMode: 'Light' | 'Dark' | 'System';
  notifications: {
    studyReminders: boolean;
    testResults: boolean;
    dailyMotivation: boolean;
  };
}

export interface PersonStudyPlannerSnapshot {
  examType: string;
  examDate: string;
  dailyHours: number;
  studyWindow: string;
  examConfigs: Record<string, any>;
  timetable: any[];
}

export interface PersonFlashcardsSnapshot {
  activeDeckName: string;
  cards: Flashcard[];
  masteredIds: number[];
}

export interface PersonStudyTimerSnapshot {
  savedTimers: {
    id: string;
    title: string;
    focusMinutes: number;
    breakMinutes: number;
    tag?: string;
    iconType: 'book' | 'flask' | 'timer';
  }[];
  completedSessions: {
    id: string;
    subject: string;
    topic: string;
    durationMinutes: number;
    modeLabel: string;
    completedAt: string;
    dateKey: string;
    starsEarned: number;
  }[];
}

export interface PersonCompleteData {
  schemaVersion: string;
  updatedAt: string;
  account: PersonAccountInfo;
  profile: StudentProfile;
  settings: PersonSettingsPreferences;
  stats: StudyStats;
  dailyStudyLog: Record<string, number>;
  notes: StudyNote[];
  mockTests: any[];
  studyPlanner: PersonStudyPlannerSnapshot;
  flashcards: PersonFlashcardsSnapshot;
  studyTimer: PersonStudyTimerSnapshot;
  mistakes: MistakeRecord[];
  tutorHistory: PromptHistoryItem[];
  recentScans: any[];
}

const PERSON_MASTER_KEY = 'studybot_person_master_record_v1';
const SETTINGS_STORAGE_KEY = 'studybot_app_settings_v1';

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function getPersonSettings(emailOverride?: string | null): PersonSettingsPreferences {
  const email = normalizeEmail(emailOverride ?? getActiveEmail()) || 'aaravsharma@gmail.com';
  const defaultSettings: PersonSettingsPreferences = {
    themeMode: 'Dark',
    notifications: {
      studyReminders: true,
      testResults: true,
      dailyMotivation: false,
    },
  };
  const raw = getUserItem(SETTINGS_STORAGE_KEY, email);
  if (!raw) return defaultSettings;
  const parsed = safeJsonParse<Partial<PersonSettingsPreferences>>(raw, {});
  return {
    themeMode: parsed.themeMode || 'Dark',
    notifications: {
      studyReminders: parsed.notifications?.studyReminders ?? true,
      testResults: parsed.notifications?.testResults ?? true,
      dailyMotivation: parsed.notifications?.dailyMotivation ?? false,
    },
  };
}

export function savePersonSettings(
  settings: Partial<PersonSettingsPreferences>,
  emailOverride?: string | null
): PersonSettingsPreferences {
  const email = normalizeEmail(emailOverride ?? getActiveEmail()) || 'aaravsharma@gmail.com';
  const current = getPersonSettings(email);
  const merged: PersonSettingsPreferences = {
    themeMode: settings.themeMode ?? current.themeMode,
    notifications: {
      studyReminders:
        settings.notifications?.studyReminders ?? current.notifications.studyReminders,
      testResults: settings.notifications?.testResults ?? current.notifications.testResults,
      dailyMotivation:
        settings.notifications?.dailyMotivation ?? current.notifications.dailyMotivation,
    },
  };
  setUserItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged), email);
  return merged;
}

/**
 * Collects all data belonging to a person from every module in the app
 * into a single unified `PersonCompleteData` object.
 */
export function buildCompletePersonData(emailOverride?: string | null): PersonCompleteData {
  const email =
    normalizeEmail(emailOverride ?? getActiveEmail()) || 'aaravsharma@gmail.com';

  // 1. Account & User Info
  const rawUser =
    typeof window !== 'undefined' ? localStorage.getItem('studybot_user') : null;
  const parsedUser = safeJsonParse<any>(rawUser, null);

  // 2. Profile
  const defaultProfile: StudentProfile = {
    name: parsedUser?.displayName || 'Aarav Sharma',
    classLevel: 'Class 10',
    primaryExam: 'CBSE',
    secondaryExams: [],
    language: 'English',
    dailyHours: 3,
    persona: 'Friendly & Encouraging Mentor',
    onboarded: true,
  };
  const profile: StudentProfile = {
    ...defaultProfile,
    ...safeJsonParse<Partial<StudentProfile>>(getUserItem('studybot_profile', email), {}),
  };

  // Extract numeric class level for class-keyed planner items
  const classMatch = (profile.classLevel || 'Class 10').match(/\d+/);
  const classNum = classMatch ? Number(classMatch[0]) : 10;

  // 3. Account object
  const accountPlan =
    (getUserItem('studybot_account_plan', email) as 'Free Plan' | 'Scholar Pro') ||
    'Free Plan';
  const account: PersonAccountInfo = {
    uid: emailToFirestoreKey(email),
    email,
    displayName:
      profile.name && profile.name !== 'Student'
        ? profile.name
        : parsedUser?.displayName || email.split('@')[0] || 'Aarav Sharma',
    photoURL: parsedUser?.photoURL || null,
    provider: parsedUser?.provider || 'email',
    accountPlan,
  };

  // 4. Settings
  const settings = getPersonSettings(email);

  // 5. Stats & Daily Study Log
  const defaultStats: StudyStats = {
    studyTimeMinutes: 0,
    questionsSolved: 0,
    correctAnswers: 0,
    testAccuracy: 0,
    dayStreak: 0,
    starsEarned: 0,
    badgesCount: 0,
  };
  const stats: StudyStats = {
    ...defaultStats,
    ...safeJsonParse<Partial<StudyStats>>(getUserItem('studybot_stats', email), {}),
  };

  const dailyStudyLog = safeJsonParse<Record<string, number>>(
    getUserItem('studybot_daily_study_log', email),
    {}
  );

  // 6. AI Notes
  const notesV2 = safeJsonParse<StudyNote[]>(
    getUserItem('studybot_saved_notes_v2', email),
    []
  );
  const notesLegacy = safeJsonParse<StudyNote[]>(
    getUserItem('studybot_saved_notes', email),
    []
  );
  const notes = notesV2.length > 0 ? notesV2 : notesLegacy;

  // 7. Mock Tests
  const mockTests = safeJsonParse<any[]>(
    getUserItem('studybot_progress_mocktests', email),
    []
  );

  // 8. Study Planner
  const studyPlanner: PersonStudyPlannerSnapshot = {
    examType:
      getUserItem(`studybot_planner_exam_type_c${classNum}`, email) ||
      'Board Exam (CBSE)',
    examDate:
      getUserItem(`studybot_planner_global_exam_date_c${classNum}`, email) ||
      '2025-05-15',
    dailyHours: Number(
      getUserItem(`studybot_planner_daily_hours_c${classNum}`, email) ||
        profile.dailyHours ||
        3
    ),
    studyWindow:
      getUserItem(`studybot_planner_window_c${classNum}`, email) || 'evening',
    examConfigs: safeJsonParse<Record<string, any>>(
      getUserItem(`studybot_planner_exam_configs_c${classNum}`, email),
      {}
    ),
    timetable: safeJsonParse<any[]>(
      getUserItem(`studybot_planner_timetable_c${classNum}`, email),
      []
    ),
  };

  // 9. Flashcards
  const flashcards: PersonFlashcardsSnapshot = {
    activeDeckName: getUserItem('studybot_flashcards_deck_name', email) || '',
    cards: safeJsonParse<Flashcard[]>(
      getUserItem('studybot_flashcards_cards', email),
      []
    ),
    masteredIds: safeJsonParse<number[]>(
      getUserItem('studybot_flashcards_mastered', email),
      []
    ),
  };

  // 10. Study Timers
  const studyTimer: PersonStudyTimerSnapshot = {
    savedTimers: safeJsonParse<any[]>(
      getUserItem('studybot_saved_custom_timers_v1', email),
      []
    ),
    completedSessions: safeJsonParse<any[]>(
      getUserItem('studybot_timer_sessions', email),
      []
    ),
  };

  // 11. Mistake Book, AI Tutor History, Problem Scans
  const mistakes = safeJsonParse<MistakeRecord[]>(
    getUserItem('studybot_mistakes', email),
    []
  );
  const tutorHistory = safeJsonParse<PromptHistoryItem[]>(
    getUserItem('studybot_prompt_history', email),
    []
  );
  const recentScans = safeJsonParse<any[]>(
    getUserItem('studybot_recent_scans', email),
    []
  );

  const completeData: PersonCompleteData = {
    schemaVersion: '1.0.0',
    updatedAt: new Date().toISOString(),
    account,
    profile,
    settings,
    stats,
    dailyStudyLog,
    notes,
    mockTests,
    studyPlanner,
    flashcards,
    studyTimer,
    mistakes,
    tutorHistory,
    recentScans,
  };

  // Save master snapshot in localStorage as well
  setUserItem(PERSON_MASTER_KEY, JSON.stringify(completeData), email);

  return completeData;
}

/**
 * Syncs the person's complete unified data record to the backend `/person_data.json` file.
 */
export async function syncPersonDataToFile(
  emailOverride?: string | null
): Promise<PersonCompleteData> {
  const snapshot = buildCompletePersonData(emailOverride);
  try {
    await Promise.all([
      fetch('/api/person-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: snapshot.account.email,
          data: snapshot,
        }),
      }),
      saveCompletePersonDataToFirestore(snapshot.account.email, snapshot),
    ]);
  } catch (err) {
    console.warn('Could not sync person data file to server/cloud:', err);
  }
  return snapshot;
}

/**
 * Fetches a person's saved data by Email ID from both the server `/api/person-data`
 * and Firestore `users/<emailKey>`, merges non-empty arrays/records with local data,
 * and hydrates local storage so signing in with the same ID on any device restores all data.
 */
export async function fetchAndMergePersonDataFromCloud(
  emailOverride?: string | null
): Promise<PersonCompleteData | null> {
  const email = normalizeEmail(emailOverride ?? getActiveEmail());
  if (!email) return null;

  const localSnapshot = buildCompletePersonData(email);

  let serverPerson: Partial<PersonCompleteData> | null = null;
  let firestorePerson: Record<string, any> | null = null;
  let firestoreNotes: any[] = [];

  try {
    const [serverRes, fsDoc, fsNotes] = await Promise.all([
      fetch(`/api/person-data?email=${encodeURIComponent(email)}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      getCompletePersonDataFromFirestore(email).catch(() => null),
      getUserNotes(email).catch(() => []),
    ]);

    if (serverRes?.person && typeof serverRes.person === 'object') {
      serverPerson = serverRes.person;
    }
    if (fsDoc && typeof fsDoc === 'object') {
      firestorePerson = fsDoc;
    }
    if (Array.isArray(fsNotes)) {
      firestoreNotes = fsNotes;
    }
  } catch (e) {
    console.warn('Error fetching remote person data:', e);
  }

  const remoteSource: Partial<PersonCompleteData> = {
    ...(serverPerson || {}),
    ...(firestorePerson || {}),
  };

  // Merge helper: prefer non-empty array from local or remote
  const pickNonEmptyArray = <T>(localArr?: T[], remoteArr?: T[], fallbackArr: T[] = []): T[] => {
    if (Array.isArray(localArr) && localArr.length > 0) {
      if (Array.isArray(remoteArr) && remoteArr.length > localArr.length) {
        return remoteArr;
      }
      return localArr;
    }
    if (Array.isArray(remoteArr) && remoteArr.length > 0) return remoteArr;
    return fallbackArr;
  };

  const mergedNotes = pickNonEmptyArray(
    localSnapshot.notes,
    Array.isArray(remoteSource.notes) && remoteSource.notes.length > 0
      ? remoteSource.notes
      : firestoreNotes
  );

  const mergedMockTests = pickNonEmptyArray(
    localSnapshot.mockTests,
    remoteSource.mockTests
  );

  const mergedMistakes = pickNonEmptyArray(
    localSnapshot.mistakes,
    remoteSource.mistakes
  );

  const mergedTutorHistory = pickNonEmptyArray(
    localSnapshot.tutorHistory,
    remoteSource.tutorHistory
  );

  const mergedRecentScans = pickNonEmptyArray(
    localSnapshot.recentScans,
    remoteSource.recentScans
  );

  const mergedDailyLog: Record<string, number> = {
    ...(remoteSource.dailyStudyLog || {}),
    ...(localSnapshot.dailyStudyLog || {}),
  };

  const mergedProfile: StudentProfile = {
    ...localSnapshot.profile,
    ...(remoteSource.profile || {}),
    name:
      (localSnapshot.profile.name && localSnapshot.profile.name !== 'Student'
        ? localSnapshot.profile.name
        : remoteSource.profile?.name) ||
      email.split('@')[0] ||
      'Student',
  };

  const mergedStats: StudyStats = {
    studyTimeMinutes: Math.max(
      localSnapshot.stats.studyTimeMinutes || 0,
      remoteSource.stats?.studyTimeMinutes || 0
    ),
    questionsSolved: Math.max(
      localSnapshot.stats.questionsSolved || 0,
      remoteSource.stats?.questionsSolved || 0
    ),
    correctAnswers: Math.max(
      localSnapshot.stats.correctAnswers || 0,
      remoteSource.stats?.correctAnswers || 0
    ),
    testAccuracy:
      localSnapshot.stats.testAccuracy || remoteSource.stats?.testAccuracy || 0,
    dayStreak: Math.max(
      localSnapshot.stats.dayStreak || 0,
      remoteSource.stats?.dayStreak || 0
    ),
    starsEarned: Math.max(
      localSnapshot.stats.starsEarned || 0,
      remoteSource.stats?.starsEarned || 0
    ),
    badgesCount: Math.max(
      localSnapshot.stats.badgesCount || 0,
      remoteSource.stats?.badgesCount || 0
    ),
  };

  const mergedPlanner: PersonStudyPlannerSnapshot = {
    examType:
      remoteSource.studyPlanner?.examType ||
      localSnapshot.studyPlanner.examType ||
      'Board Exam (CBSE)',
    examDate:
      remoteSource.studyPlanner?.examDate ||
      localSnapshot.studyPlanner.examDate ||
      '2025-05-15',
    dailyHours:
      remoteSource.studyPlanner?.dailyHours ||
      localSnapshot.studyPlanner.dailyHours ||
      3,
    studyWindow:
      remoteSource.studyPlanner?.studyWindow ||
      localSnapshot.studyPlanner.studyWindow ||
      'evening',
    examConfigs: {
      ...(remoteSource.studyPlanner?.examConfigs || {}),
      ...(localSnapshot.studyPlanner.examConfigs || {}),
    },
    timetable: pickNonEmptyArray(
      localSnapshot.studyPlanner.timetable,
      remoteSource.studyPlanner?.timetable
    ),
  };

  const mergedFlashcards: PersonFlashcardsSnapshot = {
    activeDeckName:
      localSnapshot.flashcards.activeDeckName ||
      remoteSource.flashcards?.activeDeckName ||
      '',
    cards: pickNonEmptyArray(
      localSnapshot.flashcards.cards,
      remoteSource.flashcards?.cards
    ),
    masteredIds: pickNonEmptyArray(
      localSnapshot.flashcards.masteredIds,
      remoteSource.flashcards?.masteredIds
    ),
  };

  const mergedTimer: PersonStudyTimerSnapshot = {
    savedTimers: pickNonEmptyArray(
      localSnapshot.studyTimer.savedTimers,
      remoteSource.studyTimer?.savedTimers
    ),
    completedSessions: pickNonEmptyArray(
      localSnapshot.studyTimer.completedSessions,
      remoteSource.studyTimer?.completedSessions
    ),
  };

  const mergedComplete: PersonCompleteData = {
    schemaVersion: '1.0.0',
    updatedAt: new Date().toISOString(),
    account: {
      ...localSnapshot.account,
      ...(remoteSource.account || {}),
      email,
      uid: emailToFirestoreKey(email),
    },
    profile: mergedProfile,
    settings: remoteSource.settings || localSnapshot.settings,
    stats: mergedStats,
    dailyStudyLog: mergedDailyLog,
    notes: mergedNotes,
    mockTests: mergedMockTests,
    studyPlanner: mergedPlanner,
    flashcards: mergedFlashcards,
    studyTimer: mergedTimer,
    mistakes: mergedMistakes,
    tutorHistory: mergedTutorHistory,
    recentScans: mergedRecentScans,
  };

  hydrateFromPersonData(mergedComplete);
  await syncPersonDataToFile(email);
  return mergedComplete;
}

/**
 * Restores/hydrates all local state from a `PersonCompleteData` object
 * (e.g., when importing a `.json` file or loading from `/api/person-data`).
 */
export function hydrateFromPersonData(data: PersonCompleteData): void {
  if (!data || typeof data !== 'object') return;
  const email =
    normalizeEmail(data.account?.email || getActiveEmail()) ||
    'aaravsharma@gmail.com';

  if (data.profile) {
    setUserItem('studybot_profile', JSON.stringify(data.profile), email);
  }
  if (data.account?.accountPlan) {
    setUserItem('studybot_account_plan', data.account.accountPlan, email);
  }
  if (data.settings) {
    setUserItem(SETTINGS_STORAGE_KEY, JSON.stringify(data.settings), email);
  }
  if (data.stats) {
    setUserItem('studybot_stats', JSON.stringify(data.stats), email);
  }
  if (data.dailyStudyLog) {
    setUserItem('studybot_daily_study_log', JSON.stringify(data.dailyStudyLog), email);
  }
  if (Array.isArray(data.notes)) {
    setUserItem('studybot_saved_notes_v2', JSON.stringify(data.notes), email);
  }
  if (Array.isArray(data.mockTests)) {
    setUserItem('studybot_progress_mocktests', JSON.stringify(data.mockTests), email);
  }
  if (data.studyPlanner) {
    const classMatch = (data.profile?.classLevel || 'Class 10').match(/\d+/);
    const classNum = classMatch ? Number(classMatch[0]) : 10;
    if (data.studyPlanner.examType) {
      setUserItem(
        `studybot_planner_exam_type_c${classNum}`,
        data.studyPlanner.examType,
        email
      );
    }
    if (data.studyPlanner.examDate) {
      setUserItem(
        `studybot_planner_global_exam_date_c${classNum}`,
        data.studyPlanner.examDate,
        email
      );
    }
    if (data.studyPlanner.dailyHours) {
      setUserItem(
        `studybot_planner_daily_hours_c${classNum}`,
        String(data.studyPlanner.dailyHours),
        email
      );
    }
    if (data.studyPlanner.studyWindow) {
      setUserItem(
        `studybot_planner_window_c${classNum}`,
        data.studyPlanner.studyWindow,
        email
      );
    }
    if (data.studyPlanner.examConfigs) {
      setUserItem(
        `studybot_planner_exam_configs_c${classNum}`,
        JSON.stringify(data.studyPlanner.examConfigs),
        email
      );
    }
    if (Array.isArray(data.studyPlanner.timetable)) {
      setUserItem(
        `studybot_planner_timetable_c${classNum}`,
        JSON.stringify(data.studyPlanner.timetable),
        email
      );
    }
  }
  if (data.flashcards) {
    setUserItem(
      'studybot_flashcards_deck_name',
      data.flashcards.activeDeckName || '',
      email
    );
    setUserItem(
      'studybot_flashcards_cards',
      JSON.stringify(data.flashcards.cards || []),
      email
    );
    setUserItem(
      'studybot_flashcards_mastered',
      JSON.stringify(data.flashcards.masteredIds || []),
      email
    );
  }
  if (data.studyTimer) {
    if (Array.isArray(data.studyTimer.savedTimers)) {
      setUserItem(
        'studybot_saved_custom_timers_v1',
        JSON.stringify(data.studyTimer.savedTimers),
        email
      );
    }
    if (Array.isArray(data.studyTimer.completedSessions)) {
      setUserItem(
        'studybot_timer_sessions',
        JSON.stringify(data.studyTimer.completedSessions),
        email
      );
    }
  }
  if (Array.isArray(data.mistakes)) {
    setUserItem('studybot_mistakes', JSON.stringify(data.mistakes), email);
  }
  if (Array.isArray(data.tutorHistory)) {
    setUserItem('studybot_prompt_history', JSON.stringify(data.tutorHistory), email);
  }
  if (Array.isArray(data.recentScans)) {
    setUserItem('studybot_recent_scans', JSON.stringify(data.recentScans), email);
  }

  setUserItem(PERSON_MASTER_KEY, JSON.stringify(data), email);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('studybot:user-changed'));
    window.dispatchEvent(new Event('studybot:mocktest-updated'));
    window.dispatchEvent(new Event('studybot:study-log-updated'));
    window.dispatchEvent(new Event('studybot:timetable-updated'));
  }
}

/**
 * Triggers a browser download of the person's complete data as a formatted `.json` file.
 */
export function downloadPersonDataFile(emailOverride?: string | null): void {
  const data = buildCompletePersonData(emailOverride);
  const safeName = (data.profile.name || 'student')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_');
  const fileName = `${safeName}_person_data.json`;
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
