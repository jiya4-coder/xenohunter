import React, { createContext, useContext, useState, useEffect } from 'react';
import { StudentProfile, StudyStats, MistakeRecord, PromptHistoryItem } from '../types';
import {
  auth,
  db,
  signInWithGoogle,
  signOutAccount,
  saveUserProfile,
  getUserProfile,
  getUserMistakes,
  saveUserMistake,
  deleteUserMistake,
  updateUserMistakeMastery,
  getUserChatPrompts,
  saveUserChatPrompt,
  deleteUserChatPrompt,
  toggleStarUserChatPrompt,
} from '../firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

export interface AuthUserInfo {
  uid: string;
  email: string | null;
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
  loginWithGoogle: () => Promise<void>;
  loginWithLovable: () => Promise<void>;
  loginWithEmailOtp: (email: string) => Promise<void>;
  verifyEmailOtp: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  mistakes: MistakeRecord[];
  addMistake: (mistake: Omit<MistakeRecord, 'id' | 'timestamp' | 'mastered'>) => void;
  toggleMistakeMastered: (id: string) => void;
  removeMistake: (id: string) => void;
  clearAllMistakes: () => void;
  promptHistory: PromptHistoryItem[];
  addPromptHistory: (item: { prompt: string; responsePreview?: string; fullResponse?: string; mode?: string; subject?: string }) => void;
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
}

const defaultProfile: StudentProfile = {
  name: 'Aarav',
  classLevel: 'Class 9',
  primaryExam: 'CBSE',
  secondaryExams: ['NTSE', 'Olympiad'],
  language: 'English',
  dailyHours: 3,
  persona: 'Friendly & Encouraging Mentor',
  onboarded: true,
};

const defaultStats: StudyStats = {
  studyTimeMinutes: 160, // 2h 40m
  questionsSolved: 133,
  correctAnswers: 114,
  testAccuracy: 86,
  dayStreak: 7,
  starsEarned: 130,
  badgesCount: 5,
};

const defaultMistakes: MistakeRecord[] = [
  {
    id: 'mistake-friction-1',
    testTopic: 'Science: Motion, Force & Friction',
    subject: 'Science',
    classLevel: 'Class 9',
    question: 'Why do rolling bearings dramatically reduce friction compared to sliding contact?',
    options: [
      'They generate an opposing electromagnetic field.',
      'Rolling friction has much smaller surface area of contact and less microscopic interlocking than sliding friction.',
      'Rolling objects possess negative inertia in inertial frames.',
      'They increase fluid drag resistance.',
    ],
    userAnswer: 0,
    correctAnswer: 1,
    userAnswerText: 'They generate an opposing electromagnetic field.',
    correctAnswerText: 'Rolling friction has much smaller surface area of contact and less microscopic interlocking than sliding friction.',
    explanation: 'Friction arises from microscopic surface irregularities (ridges and grooves). When a ball or roller rolls, the area of contact at any instant is minute, and there is no relative sliding to break surface weld junctions. Hence, F_rolling << F_sliding.',
    date: '10/24/2026',
    timestamp: Date.now() - 3600000 * 2,
    mastered: false,
    retryAttempts: 1,
  },
  {
    id: 'mistake-pressure-2',
    testTopic: 'Science: Pressure & Force',
    subject: 'Science',
    classLevel: 'Class 8',
    question: 'Why are school bag shoulder straps made wide rather than thin strings?',
    options: [
      'To increase the total weight acting downward.',
      'To decrease the contact area so pressure on shoulders increases.',
      'To increase surface contact area, thereby significantly reducing pressure (P = Force / Area) exerted on the shoulders.',
      'To create balanced electrostatic attraction.',
    ],
    userAnswer: 1,
    correctAnswer: 2,
    userAnswerText: 'To decrease the contact area so pressure on shoulders increases.',
    correctAnswerText: 'To increase surface contact area, thereby significantly reducing pressure (P = Force / Area) exerted on the shoulders.',
    explanation: 'Pressure is force acting perpendicularly per unit area (P = F / A). By the inverse area principle, increasing the contact area (A) reduces pressure (P) for the same weight, preventing painful cuts into the student\'s shoulders.',
    date: '10/24/2026',
    timestamp: Date.now() - 3600000 * 5,
    mastered: false,
    retryAttempts: 0,
  },
  {
    id: 'mistake-math-3',
    testTopic: 'Mathematics: Linear Equations in One Variable',
    subject: 'Mathematics',
    classLevel: 'Class 8',
    question: 'If 3(x - 4) = 2x + 5, what is the correct value of x?',
    options: ['x = 9', 'x = 17', 'x = 1', 'x = -7'],
    userAnswer: 0,
    correctAnswer: 1,
    userAnswerText: 'x = 9',
    correctAnswerText: 'x = 17',
    explanation: 'Expand the LHS: 3x - 12 = 2x + 5. Transpose 2x to LHS: 3x - 2x = 5 + 12 (notice the sign flips from -12 to +12). Therefore, x = 17. The common mistake is forgetting to multiply 3 by -4, or transposing -12 without changing its sign.',
    date: '10/23/2026',
    timestamp: Date.now() - 3600000 * 24,
    mastered: true,
    retryAttempts: 2,
  },
];

const defaultPromptHistory: PromptHistoryItem[] = [
  {
    id: 'prompt-newton-1',
    prompt: "Explain Newton's third law of motion with everyday examples like walking and swimming.",
    responsePreview: 'For every action, there is an equal and opposite reaction. When you walk, your foot pushes backward on the ground...',
    fullResponse: "## 💡 Newton's Third Law of Motion (Action & Reaction)\n\n### The Fundamental Law\n*To every action, there is always an equal and opposite reaction.*\n\nMathematically:\n**F_AB = - F_BA**\n\n### 3 Real-World Everyday Examples:\n1. **Walking on Earth**:\n   - **Action**: Your foot pushes backward on the floor.\n   - **Reaction**: The floor exerts an equal forward normal force pushing you ahead.\n2. **Swimming in a Pool**:\n   - **Action**: Hands push water backwards.\n   - **Reaction**: Water pushes the swimmer forward.\n3. **Rocket Launch**:\n   - **Action**: High-velocity exhaust gas expelled downward.\n   - **Reaction**: Rocket accelerates upward into space.\n\n### ⚠️ Critical Board Exam Caution:\nAction and reaction forces **never** act on the same body! They act on two different bodies simultaneously, which is why they do not cancel each other out.",
    timestamp: '10:15 AM',
    date: 'Today',
    epoch: Date.now() - 3600000 * 2,
    mode: 'tutor',
    subject: 'Science',
    classLevel: 'Class 9',
    starred: true,
  },
  {
    id: 'prompt-photosynth-2',
    prompt: 'How does photosynthesis occur in plants? Break down light and dark reactions simply.',
    responsePreview: 'Photosynthesis is the biochemical process by which green plants synthesize carbohydrates (glucose) from carbon dioxide and water using sunlight...',
    fullResponse: '## 🌿 Photosynthesis in Green Plants\n\n### Overall Chemical Equation\n**6CO₂ + 6H₂O + Sunlight (Chlorophyll) → C₆H₁₂O₆ + 6O₂**\n\n### 1. Light-Dependent Reactions (in Thylakoid membranes):\n- Solar energy absorbed by chlorophyll pigments.\n- **Photolysis of water**: Water molecules split into H⁺ ions, electrons, and Oxygen gas (O₂ released as byproduct).\n- Energy stored in ATP and NADPH molecules.\n\n### 2. Light-Independent / Dark Reactions (Calvin Cycle in Stroma):\n- CO₂ enters through stomata.\n- Enzymes utilize ATP and NADPH to reduce CO₂ into Glucose (C₆H₁₂O₆).\n\n### 🌟 Key Takeaway for Revision:\nStomata regulate gas exchange and transpiration using surrounding guard cells.',
    timestamp: 'Yesterday at 4:40 PM',
    date: 'Yesterday',
    epoch: Date.now() - 3600000 * 26,
    mode: 'tutor',
    subject: 'Science',
    classLevel: 'Class 8',
    starred: true,
  },
  {
    id: 'prompt-factorise-3',
    prompt: 'Step by step method to factorise quadratic polynomial x² + 7x + 12 by splitting the middle term.',
    responsePreview: 'Find two numbers whose product is 12 and sum is 7. The numbers are 3 and 4...',
    fullResponse: '## 📐 Factorising Quadratic Polynomial: x² + 7x + 12\n\n### Standard Form Comparison:\n**ax² + bx + c = 0**\nHere: a = 1, b = 7, c = 12.\n\n### Step 1: Find two numbers (p and q) such that:\n- **Product (p × q)** = a × c = 1 × 12 = **12**\n- **Sum (p + q)** = b = **7**\n\nFactors of 12:\n- 1 × 12 (sum = 13) ❌\n- 2 × 6 (sum = 8) ❌\n- **3 × 4 (sum = 7)** ✅\n\n### Step 2: Split the middle term 7x into 3x + 4x:\n= x² + 3x + 4x + 12\n\n### Step 3: Group into pairs and factor out GCF:\n= x(x + 3) + 4(x + 3)\n\n### Step 4: Extract common binomial factor:\n= **(x + 3)(x + 4)**\n\n🎉 Final answer: **(x + 3)(x + 4)**',
    timestamp: 'Oct 22 at 6:10 PM',
    date: '2 days ago',
    epoch: Date.now() - 3600000 * 48,
    mode: 'tutor',
    subject: 'Mathematics',
    classLevel: 'Class 9',
    starred: false,
  },
  {
    id: 'prompt-pressure-4',
    prompt: 'Why is pressure inversely proportional to surface area? Give 2 real applications.',
    responsePreview: 'Pressure is defined as force per unit area: P = F / A. When contact area decreases, pressure increases dramatically for the same force...',
    fullResponse: '## ⚖️ Pressure & Surface Area Relationship\n\n### Formula:\n**Pressure (P) = Force (F) / Area (A)**\nUnits: Pascal (Pa) or N/m².\n\nBecause **Area (A)** is in the denominator, Pressure is **inversely proportional** to Area:\n- Smaller Area → Higher Pressure\n- Larger Area → Lower Pressure\n\n### 2 Everyday Applications:\n1. **Sharp Knife vs Blunt Knife**:\n   A sharp blade has an extremely thin edge (minute area), concentrating cutting force into immense pressure to slice vegetables effortlessly.\n2. **Wide Camels Foot / Heavy Trucks with 10+ Wheels**:\n   Large tire footprint distributes huge vehicle weight over broad area, lowering ground pressure so vehicles do not sink into soft sand or asphalt.',
    timestamp: 'Oct 21 at 2:20 PM',
    date: '3 days ago',
    epoch: Date.now() - 3600000 * 72,
    mode: 'tutor',
    subject: 'Science',
    classLevel: 'Class 8',
    starred: false,
  },
];

const StudyContext = createContext<StudyContextType | undefined>(undefined);

export const StudyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<StudentProfile>(() => {
    try {
      const saved = localStorage.getItem('studybot_profile');
      return saved ? JSON.parse(saved) : defaultProfile;
    } catch {
      return defaultProfile;
    }
  });

  const [stats, setStats] = useState<StudyStats>(() => {
    try {
      const saved = localStorage.getItem('studybot_stats');
      return saved ? JSON.parse(saved) : defaultStats;
    } catch {
      return defaultStats;
    }
  });

  const [mistakes, setMistakes] = useState<MistakeRecord[]>(() => {
    try {
      const saved = localStorage.getItem('studybot_mistakes');
      return saved ? JSON.parse(saved) : defaultMistakes;
    } catch {
      return defaultMistakes;
    }
  });

  const [promptHistory, setPromptHistory] = useState<PromptHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('studybot_prompt_history');
      return saved ? JSON.parse(saved) : defaultPromptHistory;
    } catch {
      return defaultPromptHistory;
    }
  });

  // Auth state
  const [currentUser, setCurrentUser] = useState<AuthUserInfo | null>(() => {
    try {
      const saved = localStorage.getItem('studybot_user');
      return saved
        ? JSON.parse(saved)
        : {
            uid: 'aarav-demo',
            email: 'aarav.sharma@gmail.com',
            displayName: 'Aarav',
            photoURL: null,
            provider: 'google',
          };
    } catch {
      return null;
    }
  });

  const isSignedIn = !!currentUser;

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

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        const userInfo: AuthUserInfo = {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName || profile.name || 'Aarav',
          photoURL: fbUser.photoURL,
          provider: 'google',
        };
        setCurrentUser(userInfo);
        localStorage.setItem('studybot_user', JSON.stringify(userInfo));

        // Load or save to Firestore
        const remoteProfile = await getUserProfile(fbUser.uid);
        if (remoteProfile) {
          updateProfile({
            name: remoteProfile.displayName || profile.name,
            classLevel: remoteProfile.classLevel || profile.classLevel,
            primaryExam: remoteProfile.primaryExam || profile.primaryExam,
          });
        } else {
          await saveUserProfile(fbUser, { ...profile, ...stats });
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      const fbUser = await signInWithGoogle();
      if (fbUser) {
        const userInfo: AuthUserInfo = {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName || 'Aarav',
          photoURL: fbUser.photoURL,
          provider: 'google',
        };
        setCurrentUser(userInfo);
        localStorage.setItem('studybot_user', JSON.stringify(userInfo));
        await saveUserProfile(fbUser, profile);
      }
    } catch (e) {
      console.warn('Fallback to Gmail simulated user for iframe environment:', e);
      const mockGoogleUser: AuthUserInfo = {
        uid: 'google-user-' + Date.now(),
        email: 'aarav.sharma@gmail.com',
        displayName: 'Aarav',
        photoURL: null,
        provider: 'google',
      };
      setCurrentUser(mockGoogleUser);
      localStorage.setItem('studybot_user', JSON.stringify(mockGoogleUser));
    }
  };

  const loginWithLovable = async () => {
    const lovableUser: AuthUserInfo = {
      uid: 'lovable-user-' + Date.now(),
      email: 'scholar@lovable.app',
      displayName: 'Aarav',
      photoURL: null,
      provider: 'lovable',
    };
    setCurrentUser(lovableUser);
    localStorage.setItem('studybot_user', JSON.stringify(lovableUser));
  };

  const loginWithEmailOtp = async (email: string) => {
    // Generates/sends OTP
    localStorage.setItem('pending_otp_email', email);
  };

  const verifyEmailOtp = async (email: string, code: string) => {
    const emailUser: AuthUserInfo = {
      uid: 'email-' + email.replace(/[^a-zA-Z0-9]/g, '_'),
      email,
      displayName: email.split('@')[0],
      photoURL: null,
      provider: 'email',
    };
    setCurrentUser(emailUser);
    localStorage.setItem('studybot_user', JSON.stringify(emailUser));
  };

  const logout = async () => {
    try {
      await signOutAccount();
    } catch {}
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
      try {
        localStorage.setItem('studybot_profile', JSON.stringify(updated));
      } catch {}
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
      try {
        localStorage.setItem('studybot_stats', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const addStudyMinutes = (minutes: number) => {
    setStats((prev) => {
      const updated = {
        ...prev,
        studyTimeMinutes: prev.studyTimeMinutes + minutes,
      };
      try {
        localStorage.setItem('studybot_stats', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      const todayKey = new Date().toISOString().split('T')[0];
      const savedLogs = JSON.parse(localStorage.getItem('studybot_daily_study_log') || '{}');
      savedLogs[todayKey] = (savedLogs[todayKey] || 0) + minutes;
      localStorage.setItem('studybot_daily_study_log', JSON.stringify(savedLogs));
      window.dispatchEvent(new Event('studybot:study-log-updated'));
    } catch {}
  };

  const addStars = (stars: number) => {
    setStats((prev) => {
      const updated = {
        ...prev,
        starsEarned: prev.starsEarned + stars,
      };
      try {
        localStorage.setItem('studybot_stats', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Load mistakes from Firestore if user logs in
  useEffect(() => {
    getUserMistakes()
      .then((remote: any) => {
        if (remote && remote.length > 0) {
          setMistakes(remote);
        }
      })
      .catch(() => {});
  }, [currentUser]);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem('studybot_mistakes', JSON.stringify(mistakes));
    } catch {}
  }, [mistakes]);

  const addMistake = (item: Omit<MistakeRecord, 'id' | 'timestamp' | 'mastered'>) => {
    const newRecord: MistakeRecord = {
      ...item,
      id: `mistake-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now(),
      mastered: false,
      retryAttempts: 0,
    };
    setMistakes((prev) => {
      // Don't add duplicate if exact question already exists unmastered
      const exists = prev.some((m) => m.question === item.question && !m.mastered);
      if (exists) return prev;
      return [newRecord, ...prev];
    });
    if (currentUser?.uid) {
      saveUserMistake(currentUser.uid, newRecord);
    }
  };

  const toggleMistakeMastered = (id: string) => {
    setMistakes((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          const updated = { ...m, mastered: !m.mastered };
          if (currentUser?.uid) {
            updateUserMistakeMastery(currentUser.uid, id, updated.mastered);
          }
          return updated;
        }
        return m;
      })
    );
  };

  const removeMistake = (id: string) => {
    setMistakes((prev) => prev.filter((m) => m.id !== id));
    if (currentUser?.uid) {
      deleteUserMistake(currentUser.uid, id);
    }
  };

  const clearAllMistakes = () => {
    setMistakes([]);
    localStorage.removeItem('studybot_mistakes');
  };

  // Load prompt history from Firestore if user logs in
  useEffect(() => {
    getUserChatPrompts()
      .then((remote: any) => {
        if (remote && remote.length > 0) {
          setPromptHistory(remote);
        }
      })
      .catch(() => {});
  }, [currentUser]);

  // Sync prompt history to local storage
  useEffect(() => {
    try {
      localStorage.setItem('studybot_prompt_history', JSON.stringify(promptHistory));
    } catch {}
  }, [promptHistory]);

  const addPromptHistory = (item: {
    prompt: string;
    responsePreview?: string;
    fullResponse?: string;
    mode?: string;
    subject?: string;
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
    };

    setPromptHistory((prev) => {
      const filtered = prev.filter(
        (p) => p.prompt.toLowerCase() !== item.prompt.trim().toLowerCase()
      );
      return [newRecord, ...filtered].slice(0, 50);
    });

    if (currentUser?.uid) {
      saveUserChatPrompt(currentUser.uid, newRecord);
    }
  };

  const toggleStarPrompt = (id: string) => {
    setPromptHistory((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const updated = { ...p, starred: !p.starred };
          if (currentUser?.uid) {
            toggleStarUserChatPrompt(currentUser.uid, id, !!updated.starred);
          }
          return updated;
        }
        return p;
      })
    );
  };

  const removePromptHistory = (id: string) => {
    setPromptHistory((prev) => prev.filter((p) => p.id !== id));
    if (currentUser?.uid) {
      deleteUserChatPrompt(currentUser.uid, id);
    }
  };

  const clearPromptHistory = () => {
    setPromptHistory([]);
    try {
      localStorage.removeItem('studybot_prompt_history');
    } catch {}
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
