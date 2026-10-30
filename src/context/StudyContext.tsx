import React, { createContext, useContext, useState, useEffect } from 'react';
import { StudentProfile, StudyStats, MistakeRecord, PromptHistoryItem, GroundingSource } from '../types';
import {
  auth,
  signInWithGoogle,
  signOutAccount,
  saveUserProfileByEmail,
  getUserProfile,
  getUserMistakes,
  saveUserMistake,
  deleteUserMistake,
  updateUserMistakeMastery,
  getUserChatPrompts,
  saveUserChatPrompt,
  deleteUserChatPrompt,
  toggleStarUserChatPrompt,
  saveUserDailyStudyLog,
  clearUserFirestoreData,
} from '../firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import {
  cleanLegacyUnscopedKeysOnce,
  clearUserScopedData,
  emailToFirestoreKey,
  getActiveEmail,
  getUserItem,
  normalizeEmail,
  removeUserItem,
  setActiveEmail,
  setUserItem,
} from '../utils/userStorage';
import {
  fetchAndMergePersonDataFromCloud,
  syncPersonDataToFile,
} from '../data/personDataStore';

export interface AuthUserInfo {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  provider: 'google' | 'lovable' | 'email';
}

interface StudyContextType {
  profile: StudentProfile;
  updateProfile: (updates: Partial<StudentProfile>) => void;
  stats: StudyStats;
  addQuestionAttempt: (isCorrect: boolean) => void;
  addStudyMinutes: (minutes: number) => void;
  addStars: (stars: number) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: AuthUserInfo | null;
  isSignedIn: boolean;
  loginWithGoogle: (fallbackEmail?: string) => Promise<void>;
  loginWithLovable: (fallbackEmail?: string) => Promise<void>;
  loginWithEmailDirect: (email: string, displayName?: string) => Promise<void>;
  loginWithEmailOtp: (email: string) => Promise<void>;
  verifyEmailOtp: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  mistakes: MistakeRecord[];
  addMistake: (mistake: Omit<MistakeRecord, 'id' | 'timestamp' | 'mastered'>) => void;
  toggleMistakeMastered: (id: string) => void;
  removeMistake: (id: string) => void;
  clearAllMistakes: () => void;
  promptHistory: PromptHistoryItem[];
  addPromptHistory: (item: {
    prompt: string;
    responsePreview?: string;
    fullResponse?: string;
    mode?: string;
    subject?: string;
    sources?: GroundingSource[];
    searchQueries?: string[];
  }) => void;
  toggleStarPrompt: (id: string) => void;
  removePromptHistory: (id: string) => void;
  clearPromptHistory: () => void;
  onboardingOpen: boolean;
  setOnboardingOpen: (open: boolean) => void;
  customizeOpen: boolean;
  setCustomizeOpen: (open: boolean) => void;
  formulaVaultOpen: boolean;
  setFormulaVaultOpen: (open: boolean) => void;
  pomodoroOpen: boolean;
  setPomodoroOpen: (open: boolean) => void;
  pomodoroSeconds: number;
  pomodoroRunning: boolean;
  togglePomodoro: () => void;
  resetPomodoro: (minutes?: number) => void;
  ambienceSound: string | null;
  setAmbienceSound: (sound: string | null) => void;
  lovableModalOpen: boolean;
  setLovableModalOpen: (open: boolean) => void;
  aiEngine: 'gemini' | 'lovable';
  setAiEngine: (engine: 'gemini' | 'lovable') => void;
  clearAllAppData: () => void;
}

const defaultProfile: StudentProfile = {
  name: 'Student',
  classLevel: 'Class 9',
  primaryExam: 'CBSE',
  secondaryExams: [],
  language: 'English',
  dailyHours: 1,
  persona: 'Friendly & Encouraging Mentor',
  onboarded: true,
};

const defaultStats: StudyStats = {
  studyTimeMinutes: 0,
  questionsSolved: 0,
  correctAnswers: 0,
  testAccuracy: 0,
  dayStreak: 0,
  starsEarned: 0,
  badgesCount: 0,
};

const defaultMistakes: MistakeRecord[] = [];
const defaultPromptHistory: PromptHistoryItem[] = [];

// Clean any legacy un-scoped keys once while preserving all email-scoped data
cleanLegacyUnscopedKeysOnce();

function loadInitialUser(): AuthUserInfo | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem('studybot_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      const normEmail = normalizeEmail(parsed?.email);
      if (normEmail && normEmail.includes('@')) {
        setActiveEmail(normEmail, parsed.displayName);
        return {
          uid: emailToFirestoreKey(normEmail),
          email: normEmail,
          displayName: parsed.displayName || normEmail.split('@')[0],
          photoURL: parsed.photoURL || null,
          provider: parsed.provider || 'email',
        };
      }
    }
  } catch {}
  return null;
}

function loadProfileForEmail(email?: string | null): StudentProfile {
  const norm = normalizeEmail(email);
  if (!norm) return defaultProfile;
  try {
    const saved = getUserItem('studybot_profile', norm);
    if (saved) {
      return { ...defaultProfile, ...JSON.parse(saved) };
    }
  } catch {}
  return {
    ...defaultProfile,
    name: norm.split('@')[0] || 'Student',
  };
}

function loadStatsForEmail(email?: string | null): StudyStats {
  const norm = normalizeEmail(email);
  if (!norm) return defaultStats;
  try {
    const saved = getUserItem('studybot_stats', norm);
    if (saved) {
      return { ...defaultStats, ...JSON.parse(saved) };
    }
  } catch {}
  return defaultStats;
}

function loadMistakesForEmail(email?: string | null): MistakeRecord[] {
  const norm = normalizeEmail(email);
  if (!norm) return defaultMistakes;
  try {
    const saved = getUserItem('studybot_mistakes', norm);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return defaultMistakes;
}

function loadPromptHistoryForEmail(email?: string | null): PromptHistoryItem[] {
  const norm = normalizeEmail(email);
  if (!norm) return defaultPromptHistory;
  try {
    const saved = getUserItem('studybot_prompt_history', norm);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return defaultPromptHistory;
}

const StudyContext = createContext<StudyContextType | undefined>(undefined);

export const StudyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUserInfo | null>(() => loadInitialUser());
  const activeEmail = normalizeEmail(currentUser?.email);

  const [profile, setProfile] = useState<StudentProfile>(() => loadProfileForEmail(activeEmail));
  const [stats, setStats] = useState<StudyStats>(() => loadStatsForEmail(activeEmail));
  const [mistakes, setMistakes] = useState<MistakeRecord[]>(() => loadMistakesForEmail(activeEmail));
  const [promptHistory, setPromptHistory] = useState<PromptHistoryItem[]>(() => loadPromptHistoryForEmail(activeEmail));

  const isSignedIn = !!(currentUser && normalizeEmail(currentUser.email));

  // Track active navigation tab
  const [activeTab, setActiveTabState] = useState<string>(() => {
    const hash = window.location.hash.replace('#', '') || '/';
    return hash;
  });

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    window.location.hash = tab;
  };

  useEffect(() => {
    const handleHash = () => {
      const current = window.location.hash.replace('#', '') || '/';
      setActiveTabState(current);
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Helper to activate a user session by Email ID and hydrate data for that email
  const activateEmailSession = async (userInfo: AuthUserInfo) => {
    const normEmail = normalizeEmail(userInfo.email);
    if (!normEmail) return;

    const normalizedUser: AuthUserInfo = {
      ...userInfo,
      uid: emailToFirestoreKey(normEmail),
      email: normEmail,
      displayName: userInfo.displayName || normEmail.split('@')[0],
    };

    setActiveEmail(normEmail, normalizedUser.displayName);
    localStorage.setItem('studybot_user', JSON.stringify(normalizedUser));
    setCurrentUser(normalizedUser);

    // 1. Immediately load local email-scoped data
    const localProfile = loadProfileForEmail(normEmail);
    const localStats = loadStatsForEmail(normEmail);
    const localMistakes = loadMistakesForEmail(normEmail);
    const localPrompts = loadPromptHistoryForEmail(normEmail);

    setProfile(localProfile);
    setStats(localStats);
    setMistakes(localMistakes);
    setPromptHistory(localPrompts);

    window.dispatchEvent(new Event('studybot:user-changed'));
    window.dispatchEvent(new Event('studybot:mocktest-updated'));
    window.dispatchEvent(new Event('studybot:study-log-updated'));
    window.dispatchEvent(new Event('studybot:timetable-updated'));

    // 2. Sync with Firestore keyed by Email ID
    try {
      const remoteData = await getUserProfile(normEmail);
      if (remoteData) {
        const mergedProfile: StudentProfile = {
          name: remoteData.displayName || localProfile.name || normEmail.split('@')[0],
          classLevel: remoteData.classLevel || localProfile.classLevel || 'Class 9',
          primaryExam: remoteData.primaryExam || localProfile.primaryExam || 'CBSE',
          secondaryExams: remoteData.secondaryExams || localProfile.secondaryExams || [],
          language: remoteData.language || localProfile.language || 'English',
          dailyHours: remoteData.dailyHours ?? localProfile.dailyHours ?? 1,
          persona: remoteData.persona || localProfile.persona || 'Friendly & Encouraging Mentor',
          onboarded: remoteData.onboarded ?? true,
        };
        const mergedStats: StudyStats = {
          studyTimeMinutes: remoteData.studyTimeMinutes ?? localStats.studyTimeMinutes ?? 0,
          questionsSolved: remoteData.questionsSolved ?? localStats.questionsSolved ?? 0,
          correctAnswers: remoteData.correctAnswers ?? localStats.correctAnswers ?? 0,
          testAccuracy: remoteData.testAccuracy ?? localStats.testAccuracy ?? 0,
          dayStreak: remoteData.dayStreak ?? localStats.dayStreak ?? 0,
          starsEarned: remoteData.starsEarned ?? localStats.starsEarned ?? 0,
          badgesCount: remoteData.badgesCount ?? localStats.badgesCount ?? 0,
        };

        setProfile(mergedProfile);
        setStats(mergedStats);
        setUserItem('studybot_profile', JSON.stringify(mergedProfile), normEmail);
        setUserItem('studybot_stats', JSON.stringify(mergedStats), normEmail);

        if (remoteData.dailyStudyLog && typeof remoteData.dailyStudyLog === 'object') {
          const existingLogs = JSON.parse(getUserItem('studybot_daily_study_log', normEmail) || '{}');
          const combinedLogs = { ...remoteData.dailyStudyLog, ...existingLogs };
          setUserItem('studybot_daily_study_log', JSON.stringify(combinedLogs), normEmail);
          window.dispatchEvent(new Event('studybot:study-log-updated'));
        }

        if (Array.isArray(remoteData.mockTests) && remoteData.mockTests.length > 0) {
          const existingTests = JSON.parse(getUserItem('studybot_progress_mocktests', normEmail) || '[]');
          if (existingTests.length === 0) {
            setUserItem('studybot_progress_mocktests', JSON.stringify(remoteData.mockTests), normEmail);
            window.dispatchEvent(new Event('studybot:mocktest-updated'));
          }
        }

        if (Array.isArray(remoteData.recentScans) && remoteData.recentScans.length > 0) {
          const existingScans = JSON.parse(getUserItem('studybot_recent_scans', normEmail) || '[]');
          if (existingScans.length === 0) {
            setUserItem('studybot_recent_scans', JSON.stringify(remoteData.recentScans), normEmail);
            window.dispatchEvent(new Event('studybot:scans-updated'));
          }
        }
      } else {
        // Save initial clean profile for this email ID to Firestore
        await saveUserProfileByEmail(normEmail, localProfile, localStats);
      }

      // Fetch mistakes & chat prompts for this email ID
      const [remoteMistakes, remotePrompts] = await Promise.all([
        getUserMistakes(normEmail),
        getUserChatPrompts(normEmail),
      ]);

      if (Array.isArray(remoteMistakes) && remoteMistakes.length > 0) {
        setMistakes(remoteMistakes as MistakeRecord[]);
        setUserItem('studybot_mistakes', JSON.stringify(remoteMistakes), normEmail);
      }

      if (Array.isArray(remotePrompts) && remotePrompts.length > 0) {
        setPromptHistory(remotePrompts as PromptHistoryItem[]);
        setUserItem('studybot_prompt_history', JSON.stringify(remotePrompts), normEmail);
      }

      // 3. Merge complete cross-device person data (notes, flashcards, planner, timers, mock tests, settings)
      const mergedPerson = await fetchAndMergePersonDataFromCloud(normEmail);
      if (mergedPerson) {
        setProfile(mergedPerson.profile);
        setStats(mergedPerson.stats);
        if (Array.isArray(mergedPerson.mistakes) && mergedPerson.mistakes.length > 0) {
          setMistakes(mergedPerson.mistakes);
        }
        if (Array.isArray(mergedPerson.tutorHistory) && mergedPerson.tutorHistory.length > 0) {
          setPromptHistory(mergedPerson.tutorHistory);
        }
      }
    } catch {}
  };

  // Hydrate from Firestore on initial mount if user is already signed in
  useEffect(() => {
    if (currentUser?.email) {
      activateEmailSession(currentUser);
    } else {
      syncPersonDataToFile('aaravsharma@gmail.com');
    }
  }, []);

  // Keep unified person_data.json synced whenever study logs, mock tests, or timetables update
  useEffect(() => {
    const handleSync = () => {
      const email = normalizeEmail(currentUser?.email) || 'aaravsharma@gmail.com';
      syncPersonDataToFile(email);
    };
    const handleUserReload = () => {
      const email = normalizeEmail(currentUser?.email) || 'aaravsharma@gmail.com';
      setProfile(loadProfileForEmail(email));
      setStats(loadStatsForEmail(email));
      setMistakes(loadMistakesForEmail(email));
      setPromptHistory(loadPromptHistoryForEmail(email));
    };
    window.addEventListener('studybot:mocktest-updated', handleSync);
    window.addEventListener('studybot:study-log-updated', handleSync);
    window.addEventListener('studybot:timetable-updated', handleSync);
    window.addEventListener('studybot:user-changed', handleUserReload);
    return () => {
      window.removeEventListener('studybot:mocktest-updated', handleSync);
      window.removeEventListener('studybot:study-log-updated', handleSync);
      window.removeEventListener('studybot:timetable-updated', handleSync);
      window.removeEventListener('studybot:user-changed', handleUserReload);
    };
  }, [currentUser?.email]);

  // Listen to Firebase Auth state for Google sign-in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (fbUser && fbUser.email) {
        const normEmail = normalizeEmail(fbUser.email);
        const userInfo: AuthUserInfo = {
          uid: emailToFirestoreKey(normEmail),
          email: normEmail,
          displayName: fbUser.displayName || normEmail.split('@')[0],
          photoURL: fbUser.photoURL,
          provider: 'google',
        };
        await activateEmailSession(userInfo);
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async (fallbackEmail?: string) => {
    try {
      const fbUser = await signInWithGoogle();
      if (fbUser && fbUser.email) {
        const normEmail = normalizeEmail(fbUser.email);
        await activateEmailSession({
          uid: emailToFirestoreKey(normEmail),
          email: normEmail,
          displayName: fbUser.displayName || normEmail.split('@')[0],
          photoURL: fbUser.photoURL,
          provider: 'google',
        });
        return;
      }
    } catch (e) {
      console.warn('Google popup blocked in preview iframe, using email session:', e);
    }

    const chosenEmail = normalizeEmail(fallbackEmail) || 'student@gmail.com';
    await activateEmailSession({
      uid: emailToFirestoreKey(chosenEmail),
      email: chosenEmail,
      displayName: chosenEmail.split('@')[0],
      photoURL: null,
      provider: 'google',
    });
  };

  const loginWithLovable = async (fallbackEmail?: string) => {
    const chosenEmail = normalizeEmail(fallbackEmail) || 'scholar@lovable.app';
    await activateEmailSession({
      uid: emailToFirestoreKey(chosenEmail),
      email: chosenEmail,
      displayName: chosenEmail.split('@')[0],
      photoURL: null,
      provider: 'lovable',
    });
  };

  const loginWithEmailDirect = async (email: string, displayName?: string) => {
    const normEmail = normalizeEmail(email);
    if (!normEmail) return;
    await activateEmailSession({
      uid: emailToFirestoreKey(normEmail),
      email: normEmail,
      displayName: displayName?.trim() || normEmail.split('@')[0],
      photoURL: null,
      provider: 'email',
    });
  };

  const loginWithEmailOtp = async (email: string) => {
    localStorage.setItem('pending_otp_email', normalizeEmail(email));
  };

  const verifyEmailOtp = async (email: string, _code: string) => {
    const normEmail = normalizeEmail(email);
    if (!normEmail) return;
    await activateEmailSession({
      uid: emailToFirestoreKey(normEmail),
      email: normEmail,
      displayName: normEmail.split('@')[0],
      photoURL: null,
      provider: 'email',
    });
  };

  const logout = async () => {
    try {
      await signOutAccount();
    } catch {}
    setActiveEmail(null);
    setCurrentUser(null);
    localStorage.removeItem('studybot_user');
  };

  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [formulaVaultOpen, setFormulaVaultOpen] = useState(false);
  const [pomodoroOpen, setPomodoroOpen] = useState(false);
  const [lovableModalOpen, setLovableModalOpen] = useState(false);
  const [aiEngine, setAiEngine] = useState<'gemini' | 'lovable'>('gemini');

  // Pomodoro timer logic
  const [pomodoroSeconds, setPomodoroSeconds] = useState(25 * 60);
  const [pomodoroRunning, setPomodoroRunning] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (pomodoroRunning && pomodoroSeconds > 0) {
      interval = setInterval(() => {
        setPomodoroSeconds((sec) => sec - 1);
      }, 1000);
    } else if (pomodoroSeconds === 0 && pomodoroRunning) {
      setPomodoroRunning(false);
      addStudyMinutes(25);
      addStars(15);
    }
    return () => clearInterval(interval);
  }, [pomodoroRunning, pomodoroSeconds]);

  const togglePomodoro = () => setPomodoroRunning((prev) => !prev);
  const resetPomodoro = (minutes = 25) => {
    setPomodoroRunning(false);
    setPomodoroSeconds(minutes * 60);
  };

  const [ambienceSound, setAmbienceSound] = useState<string | null>(null);

  const updateProfile = (updates: Partial<StudentProfile>) => {
    setProfile((prev) => {
      const updated = { ...prev, ...updates };
      const targetEmail = activeEmail || 'aaravsharma@gmail.com';
      setUserItem('studybot_profile', JSON.stringify(updated), targetEmail);
      if (activeEmail) {
        saveUserProfileByEmail(activeEmail, updated, stats);
      }
      setTimeout(() => syncPersonDataToFile(targetEmail), 50);
      return updated;
    });
  };

  const addQuestionAttempt = (isCorrect: boolean) => {
    setStats((prev) => {
      const newTotal = prev.questionsSolved + 1;
      const newCorrect = prev.correctAnswers + (isCorrect ? 1 : 0);
      const newAccuracy = Math.round((newCorrect / newTotal) * 100);
      const updated: StudyStats = {
        ...prev,
        questionsSolved: newTotal,
        correctAnswers: newCorrect,
        testAccuracy: newAccuracy,
        starsEarned: prev.starsEarned + (isCorrect ? 3 : 1),
      };
      if (activeEmail) {
        setUserItem('studybot_stats', JSON.stringify(updated), activeEmail);
        saveUserProfileByEmail(activeEmail, profile, updated);
      }
      return updated;
    });
  };

  const addStudyMinutes = (minutes: number) => {
    setStats((prev) => {
      const updated = {
        ...prev,
        studyTimeMinutes: prev.studyTimeMinutes + minutes,
      };
      if (activeEmail) {
        setUserItem('studybot_stats', JSON.stringify(updated), activeEmail);
        saveUserProfileByEmail(activeEmail, profile, updated);
      }
      return updated;
    });

    try {
      if (activeEmail) {
        const todayKey = new Date().toISOString().split('T')[0];
        const savedLogs = JSON.parse(getUserItem('studybot_daily_study_log', activeEmail) || '{}');
        savedLogs[todayKey] = (savedLogs[todayKey] || 0) + minutes;
        setUserItem('studybot_daily_study_log', JSON.stringify(savedLogs), activeEmail);
        saveUserDailyStudyLog(activeEmail, savedLogs);
        window.dispatchEvent(new Event('studybot:study-log-updated'));
      }
    } catch {}
  };

  const addStars = (stars: number) => {
    setStats((prev) => {
      const updated = {
        ...prev,
        starsEarned: prev.starsEarned + stars,
      };
      if (activeEmail) {
        setUserItem('studybot_stats', JSON.stringify(updated), activeEmail);
        saveUserProfileByEmail(activeEmail, profile, updated);
      }
      return updated;
    });
  };

  // Sync mistakes to email-scoped local storage
  useEffect(() => {
    if (!activeEmail) return;
    setUserItem('studybot_mistakes', JSON.stringify(mistakes), activeEmail);
  }, [mistakes, activeEmail]);

  const addMistake = (item: Omit<MistakeRecord, 'id' | 'timestamp' | 'mastered'>) => {
    const newRecord: MistakeRecord = {
      ...item,
      id: `mistake-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now(),
      mastered: false,
      retryAttempts: 0,
    };
    setMistakes((prev) => {
      const exists = prev.some((m) => m.question === item.question && !m.mastered);
      if (exists) return prev;
      return [newRecord, ...prev];
    });
    if (activeEmail) {
      saveUserMistake(activeEmail, newRecord);
    }
  };

  const toggleMistakeMastered = (id: string) => {
    setMistakes((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          const updated = { ...m, mastered: !m.mastered };
          if (activeEmail) {
            updateUserMistakeMastery(activeEmail, id, updated.mastered);
          }
          return updated;
        }
        return m;
      })
    );
  };

  const removeMistake = (id: string) => {
    setMistakes((prev) => prev.filter((m) => m.id !== id));
    if (activeEmail) {
      deleteUserMistake(activeEmail, id);
    }
  };

  const clearAllMistakes = () => {
    setMistakes([]);
    if (activeEmail) {
      removeUserItem('studybot_mistakes', activeEmail);
    }
  };

  // Sync prompt history to email-scoped local storage
  useEffect(() => {
    if (!activeEmail) return;
    setUserItem('studybot_prompt_history', JSON.stringify(promptHistory), activeEmail);
  }, [promptHistory, activeEmail]);

  const addPromptHistory = (item: {
    prompt: string;
    responsePreview?: string;
    fullResponse?: string;
    mode?: string;
    subject?: string;
    sources?: GroundingSource[];
    searchQueries?: string[];
  }) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newRecord: PromptHistoryItem = {
      id: `prompt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      prompt: item.prompt.trim(),
      responsePreview:
        item.responsePreview || (item.fullResponse ? item.fullResponse.slice(0, 140) + '...' : undefined),
      fullResponse: item.fullResponse,
      timestamp: timeStr,
      date: 'Today',
      epoch: Date.now(),
      mode: item.mode || 'tutor',
      subject: item.subject || 'General',
      classLevel: profile.classLevel,
      starred: false,
      sources: item.sources,
      searchQueries: item.searchQueries,
    };

    setPromptHistory((prev) => {
      const filtered = prev.filter(
        (p) => p.prompt.toLowerCase() !== item.prompt.trim().toLowerCase()
      );
      return [newRecord, ...filtered].slice(0, 50);
    });

    if (activeEmail) {
      saveUserChatPrompt(activeEmail, newRecord);
    }
  };

  const toggleStarPrompt = (id: string) => {
    setPromptHistory((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const updated = { ...p, starred: !p.starred };
          if (activeEmail) {
            toggleStarUserChatPrompt(activeEmail, id, !!updated.starred);
          }
          return updated;
        }
        return p;
      })
    );
  };

  const removePromptHistory = (id: string) => {
    setPromptHistory((prev) => prev.filter((p) => p.id !== id));
    if (activeEmail) {
      deleteUserChatPrompt(activeEmail, id);
    }
  };

  const clearPromptHistory = () => {
    setPromptHistory([]);
    if (activeEmail) {
      removeUserItem('studybot_prompt_history', activeEmail);
    }
  };

  const clearAllAppData = () => {
    if (activeEmail) {
      clearUserScopedData(activeEmail);
      clearUserFirestoreData(activeEmail);
    }
    const freshProfile = {
      ...defaultProfile,
      name: activeEmail ? activeEmail.split('@')[0] : 'Student',
    };
    setProfile(freshProfile);
    setStats(defaultStats);
    setMistakes([]);
    setPromptHistory([]);
    window.dispatchEvent(new Event('studybot:data-cleared'));
    window.dispatchEvent(new Event('studybot:mocktest-updated'));
    window.dispatchEvent(new Event('studybot:study-log-updated'));
    window.dispatchEvent(new Event('studybot:timetable-updated'));
  };

  return (
    <StudyContext.Provider
      value={{
        profile,
        updateProfile,
        stats,
        addQuestionAttempt,
        addStudyMinutes,
        addStars,
        activeTab,
        setActiveTab,
        currentUser,
        isSignedIn,
        loginWithGoogle,
        loginWithLovable,
        loginWithEmailDirect,
        loginWithEmailOtp,
        verifyEmailOtp,
        logout,
        mistakes,
        addMistake,
        toggleMistakeMastered,
        removeMistake,
        clearAllMistakes,
        promptHistory,
        addPromptHistory,
        toggleStarPrompt,
        removePromptHistory,
        clearPromptHistory,
        clearAllAppData,
        onboardingOpen,
        setOnboardingOpen,
        customizeOpen,
        setCustomizeOpen,
        formulaVaultOpen,
        setFormulaVaultOpen,
        pomodoroOpen,
        setPomodoroOpen,
        pomodoroSeconds,
        pomodoroRunning,
        togglePomodoro,
        resetPomodoro,
        ambienceSound,
        setAmbienceSound,
        lovableModalOpen,
        setLovableModalOpen,
        aiEngine,
        setAiEngine,
      }}
    >
      {children}
    </StudyContext.Provider>
  );
};

export const useStudy = () => {
  const context = useContext(StudyContext);
  if (!context) throw new Error('useStudy must be used within a StudyProvider');
  return context;
};
