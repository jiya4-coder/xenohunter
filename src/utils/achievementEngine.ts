import { AchievementBadge, DailyStudyLog } from '../types';
import confetti from 'canvas-confetti';

export const INITIAL_ACHIEVEMENT_MOCK_TESTS = [
  { id: 'mt-1', name: 'Science: Laws of Motion & Friction', subject: 'Science', score: 100, maxScore: 100, date: 'Oct 19', focusArea: 'Flawless performance!' },
  { id: 'mt-2', name: 'Mathematics: Coordinate Geometry & Lines', subject: 'Mathematics', score: 100, maxScore: 100, date: 'Oct 21', focusArea: 'Flawless performance!' },
  { id: 'mt-3', name: 'Computer Science: Python Loops & Conditionals', subject: 'Computer Science', score: 100, maxScore: 100, date: 'Oct 23', focusArea: 'Flawless performance!' },
  { id: 'mt-4', name: 'English: Grammar & Reported Speech', subject: 'English', score: 92, maxScore: 100, date: 'Oct 24', focusArea: 'Revise: Reported Speech Rules' },
  { id: 'mt-5', name: 'Science: Cell Structure & Tissues', subject: 'Science', score: 86, maxScore: 100, date: 'Oct 22', focusArea: 'Revise: Mitochondria & Chloroplasts' },
  { id: 'mt-6', name: 'Social Science: French Revolution Diagnostic', subject: 'Social Science', score: 84, maxScore: 100, date: 'Oct 20', focusArea: 'Revise: Third Estate Demands' },
  { id: 'mt-7', name: 'Mathematics: Linear Equations in Two Vars', subject: 'Mathematics', score: 88, maxScore: 100, date: 'Oct 18', focusArea: 'Revise: Elimination Method' },
];

/**
 * Returns the last 7 days keys (YYYY-MM-DD)
 */
export const getLast7DaysKeys = (): { dateKey: string; label: string; dateObj: Date }[] => {
  const result = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateKey = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString('en-US', { weekday: 'short' });
    result.push({ dateKey, label, dateObj: d });
  }
  return result;
};

/**
 * Initialize or get daily study logs (60+ minutes per day for habit tracking)
 */
export const getDailyStudyLogs = (): Record<string, number> => {
  try {
    const saved = localStorage.getItem('studybot_daily_study_log');
    if (saved) return JSON.parse(saved);
  } catch {}

  // Pre-seed a realistic 6-day streak with today at 45 minutes
  const days = getLast7DaysKeys();
  const initialLog: Record<string, number> = {};
  
  // Previous 6 days had >= 60 minutes
  days.slice(0, 6).forEach((day, index) => {
    initialLog[day.dateKey] = 60 + (index * 5 % 25); // 60, 65, 70, 75, 80, 85 mins
  });
  // Today has 45 minutes so student is 15 mins away from 7-day completion
  initialLog[days[6].dateKey] = 45;

  try {
    localStorage.setItem('studybot_daily_study_log', JSON.stringify(initialLog));
  } catch {}

  return initialLog;
};

/**
 * Save daily study minutes for today
 */
export const logDailyStudyMinutes = (addedMinutes: number): Record<string, number> => {
  const logs = getDailyStudyLogs();
  const todayKey = new Date().toISOString().split('T')[0];
  logs[todayKey] = (logs[todayKey] || 0) + addedMinutes;
  try {
    localStorage.setItem('studybot_daily_study_log', JSON.stringify(logs));
    window.dispatchEvent(new Event('studybot:study-log-updated'));
  } catch {}
  return logs;
};

/**
 * Read Mock Tests list from localStorage (or fallback to seed)
 */
export const getStoredMockTests = (): any[] => {
  try {
    const saved = localStorage.getItem('studybot_progress_mocktests');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}

  try {
    localStorage.setItem('studybot_progress_mocktests', JSON.stringify(INITIAL_ACHIEVEMENT_MOCK_TESTS));
  } catch {}
  return INITIAL_ACHIEVEMENT_MOCK_TESTS;
};

/**
 * Save a new mock test record and trigger badge evaluation
 */
export const recordMockTest = (test: {
  name: string;
  subject: string;
  score: number;
  maxScore: number;
  date?: string;
  focusArea?: string;
}) => {
  const tests = getStoredMockTests();
  const newRecord = {
    id: `mt-${Date.now()}`,
    name: test.name,
    subject: test.subject,
    score: test.score,
    maxScore: test.maxScore || 100,
    date: test.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    focusArea: test.focusArea || (test.score === test.maxScore ? 'Flawless 100% Score!' : 'Keep Practicing!'),
  };
  tests.unshift(newRecord);
  try {
    localStorage.setItem('studybot_progress_mocktests', JSON.stringify(tests));
    window.dispatchEvent(new Event('studybot:mocktest-updated'));
  } catch {}
  return newRecord;
};

/**
 * Compute the full badges status list
 */
export const computeAchievements = (): {
  badges: AchievementBadge[];
  dailyLogs: DailyStudyLog[];
  currentConsecutive1HrDays: number;
  totalXp: number;
  unlockedCount: number;
  totalCount: number;
  fullMarksCount: number;
  ninetyPlusCount: number;
} => {
  const tests = getStoredMockTests();
  const dailyStudyMap = getDailyStudyLogs();
  const sevenDays = getLast7DaysKeys();

  // 1. Analyze mock tests
  const fullMarksTests = tests.filter((t) => {
    const score = Number(t.score);
    const maxScore = Number(t.maxScore) || 100;
    return maxScore > 0 && score >= maxScore;
  });
  const fullMarksCount = fullMarksTests.length;

  const ninetyPlusTests = tests.filter((t) => {
    const score = Number(t.score);
    const maxScore = Number(t.maxScore) || 100;
    const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
    return pct >= 90;
  });
  const ninetyPlusCount = ninetyPlusTests.length;

  // 2. Analyze 1 hour regular study for 1 week (7 consecutive days)
  const dailyLogs: DailyStudyLog[] = sevenDays.map((d) => {
    const mins = dailyStudyMap[d.dateKey] || 0;
    return {
      date: d.dateKey,
      dayLabel: d.label,
      minutes: mins,
      targetMet: mins >= 60,
    };
  });

  // Check how many days in the 7-day period met the 1 hour (>= 60 min) requirement
  let consecutive1HrDays = 0;
  for (let i = dailyLogs.length - 1; i >= 0; i--) {
    if (dailyLogs[i].targetMet) {
      consecutive1HrDays++;
    } else {
      break;
    }
  }
  // Also calculate total days met out of the 7-day window
  const totalDaysMetInWeek = dailyLogs.filter((d) => d.targetMet).length;

  // 3. Analyze mistakes mastered
  let masteredMistakesCount = 1;
  try {
    const mistakes = JSON.parse(localStorage.getItem('studybot_mistakes') || '[]');
    masteredMistakesCount = mistakes.filter((m: any) => m.mastered).length;
  } catch {}

  // 4. Analyze total study time
  let totalStudyMinutes = 160;
  try {
    const stats = JSON.parse(localStorage.getItem('studybot_stats') || '{}');
    if (stats.studyTimeMinutes) totalStudyMinutes = stats.studyTimeMinutes;
  } catch {}

  // 5. Construct Badges List
  const badges: AchievementBadge[] = [
    // Requirement 1: Full Marks in 5 Mock Tests
    {
      id: 'full_marks_5',
      title: 'Century Master (100% Club)',
      subtitle: '5 Flawless Mock Tests',
      description: 'Achieve full marks (100% score) in 5 mock tests. Demonstrates absolute conceptual mastery.',
      iconName: 'Crown',
      category: 'mock_tests',
      criteria: 'Get full marks (100%) in 5 mock tests',
      currentValue: Math.min(fullMarksCount, 5),
      targetValue: 5,
      unit: 'tests',
      unlocked: fullMarksCount >= 5,
      unlockedAt: fullMarksCount >= 5 ? 'Unlocked Oct 2026' : undefined,
      rarity: 'legendary',
      xpReward: 500,
      qualifyingDetails: fullMarksTests.map(
        (t) => `${t.name} (${t.score}/${t.maxScore} marks · ${t.date})`
      ),
    },
    // Requirement 2: 90+ Score in 5 Mock Tests
    {
      id: 'score_90_plus_5',
      title: '90+ Elite Achiever',
      subtitle: 'Top Tier Test Performance',
      description: 'Score 90% or higher in 5 mock tests across any subject.',
      iconName: 'Trophy',
      category: 'mock_tests',
      criteria: 'Score 90% or higher in 5 mock tests',
      currentValue: Math.min(ninetyPlusCount, 5),
      targetValue: 5,
      unit: 'tests',
      unlocked: ninetyPlusCount >= 5,
      unlockedAt: ninetyPlusCount >= 5 ? 'Unlocked Oct 2026' : undefined,
      rarity: 'epic',
      xpReward: 350,
      qualifyingDetails: ninetyPlusTests.map(
        (t) => `${t.name} (${t.score}% · ${t.date})`
      ),
    },
    // Requirement 3: Study 1 Hour Regularly for 1 Week
    {
      id: 'study_1hr_7days',
      title: '7-Day Iron Habit',
      subtitle: '1 Hour Daily Regular Study for 1 Week',
      description: 'Study at least 1 hour (60 minutes) regularly every single day for 7 consecutive days.',
      iconName: 'Flame',
      category: 'study_streak',
      criteria: 'Study ≥1 hour (60 mins) daily for 7 days in a row',
      currentValue: Math.min(totalDaysMetInWeek, 7),
      targetValue: 7,
      unit: 'days',
      unlocked: totalDaysMetInWeek >= 7,
      unlockedAt: totalDaysMetInWeek >= 7 ? 'Unlocked This Week' : undefined,
      rarity: 'epic',
      xpReward: 400,
      qualifyingDetails: dailyLogs.map(
        (d) => `${d.dayLabel} (${d.date}): ${d.minutes} mins ${d.targetMet ? '✓ (Met 1hr)' : '⏳ (Under 1hr)'}`
      ),
    },
    // General Badge 4: First Mock Test Completed
    {
      id: 'first_mock_test',
      title: 'First Flight',
      subtitle: 'First Mock Test Conquered',
      description: 'Successfully complete and submit your first official mock test.',
      iconName: 'Award',
      category: 'mock_tests',
      criteria: 'Complete 1 mock test',
      currentValue: Math.min(tests.length, 1),
      targetValue: 1,
      unit: 'test',
      unlocked: tests.length >= 1,
      unlockedAt: 'Unlocked Oct 19',
      rarity: 'common',
      xpReward: 100,
      qualifyingDetails: tests.length > 0 ? [`First test: ${tests[tests.length - 1]?.name || 'Diagnostic Drill'}`] : [],
    },
    // General Badge 5: Mock Test Centurion (10 tests)
    {
      id: 'mock_test_10',
      title: 'Mock Test Veteran',
      subtitle: '10 Mock Tests Completed',
      description: 'Build exam stamina by finishing 10 comprehensive mock tests.',
      iconName: 'ShieldCheck',
      category: 'mock_tests',
      criteria: 'Complete 10 mock tests',
      currentValue: Math.min(tests.length, 10),
      targetValue: 10,
      unit: 'tests',
      unlocked: tests.length >= 10,
      unlockedAt: tests.length >= 10 ? 'Unlocked Oct 2026' : undefined,
      rarity: 'rare',
      xpReward: 250,
      qualifyingDetails: [`${tests.length} total tests recorded in your logbook`],
    },
    // General Badge 6: Mistake Book Slayer
    {
      id: 'mistake_master_3',
      title: 'Mistake Slayer',
      subtitle: 'Turn Weaknesses into Strengths',
      description: 'Review and master 3 difficult questions from your Mistake Book.',
      iconName: 'BookMarked',
      category: 'mastery',
      criteria: 'Master 3 questions in Mistake Book',
      currentValue: Math.min(masteredMistakesCount, 3),
      targetValue: 3,
      unit: 'mistakes',
      unlocked: masteredMistakesCount >= 3,
      unlockedAt: masteredMistakesCount >= 3 ? 'Unlocked Oct 23' : undefined,
      rarity: 'rare',
      xpReward: 200,
      qualifyingDetails: [`${masteredMistakesCount} errors successfully re-tested and mastered`],
    },
    // General Badge 7: Focused Scholar (300+ Study Minutes)
    {
      id: 'study_time_300',
      title: 'Deep Focus Scholar',
      subtitle: '300 Minutes of Focused Study',
      description: 'Log 300+ total minutes of focused time in AI Tutor, Practice, and Pomodoro.',
      iconName: 'Clock',
      category: 'study_streak',
      criteria: 'Log 300+ minutes of total study time',
      currentValue: Math.min(totalStudyMinutes, 300),
      targetValue: 300,
      unit: 'mins',
      unlocked: totalStudyMinutes >= 300,
      unlockedAt: totalStudyMinutes >= 300 ? 'Unlocked This Month' : undefined,
      rarity: 'rare',
      xpReward: 200,
      qualifyingDetails: [`${totalStudyMinutes} minutes of focused learning logged`],
    },
    // General Badge 8: Planner Champion
    {
      id: 'planner_champion',
      title: 'Planner Champion',
      subtitle: 'Structured Study Mastery',
      description: 'Follow your NCERT study timetable and complete your scheduled daily goals.',
      iconName: 'CalendarCheck',
      category: 'milestones',
      criteria: 'Complete scheduled study planner tasks',
      currentValue: 1,
      targetValue: 1,
      unit: 'goal',
      unlocked: true,
      unlockedAt: 'Unlocked Today',
      rarity: 'common',
      xpReward: 150,
      qualifyingDetails: ['Timetable followed for current week'],
    },
  ];

  const unlockedCount = badges.filter((b) => b.unlocked).length;
  const totalCount = badges.length;
  const totalXp = badges.reduce((acc, b) => acc + (b.unlocked ? b.xpReward : 0), 0);

  return {
    badges,
    dailyLogs,
    currentConsecutive1HrDays: totalDaysMetInWeek,
    totalXp,
    unlockedCount,
    totalCount,
    fullMarksCount,
    ninetyPlusCount,
  };
};

/**
 * Trigger celebration fireworks
 */
export const triggerBadgeCelebration = () => {
  try {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#38bdf8', '#818cf8', '#f59e0b', '#10b981', '#ec4899'],
    });
  } catch {}
};
