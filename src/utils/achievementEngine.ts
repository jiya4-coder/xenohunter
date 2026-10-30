import { AchievementBadge, DailyStudyLog } from '../types';
import confetti from 'canvas-confetti';
import { getActiveEmail, getUserItem, setUserItem } from './userStorage';
import { saveUserDailyStudyLog, saveUserMockTests } from '../firebase';

export const INITIAL_ACHIEVEMENT_MOCK_TESTS: any[] = [];

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
 * Get daily study logs (60+ minutes per day for habit tracking) scoped to current user's Email ID
 */
export const getDailyStudyLogs = (emailOverride?: string | null): Record<string, number> => {
  try {
    const saved = getUserItem('studybot_daily_study_log', emailOverride);
    if (saved) return JSON.parse(saved);
  } catch {}
  return {};
};

/**
 * Save daily study minutes for today scoped to the current user's Email ID
 */
export const logDailyStudyMinutes = (addedMinutes: number, emailOverride?: string | null): Record<string, number> => {
  const logs = getDailyStudyLogs(emailOverride);
  const todayKey = new Date().toISOString().split('T')[0];
  logs[todayKey] = (logs[todayKey] || 0) + addedMinutes;
  try {
    setUserItem('studybot_daily_study_log', JSON.stringify(logs), emailOverride);
    const email = emailOverride || getActiveEmail();
    if (email) {
      saveUserDailyStudyLog(email, logs);
    }
    window.dispatchEvent(new Event('studybot:study-log-updated'));
  } catch {}
  return logs;
};

/**
 * Read Mock Tests list from email-scoped localStorage
 */
export const getStoredMockTests = (emailOverride?: string | null): any[] => {
  try {
    const saved = getUserItem('studybot_progress_mocktests', emailOverride);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
};

/**
 * Save a new mock test record scoped to the current user's Email ID and trigger badge evaluation
 */
export const recordMockTest = (
  test: {
    name: string;
    subject: string;
    score: number;
    maxScore: number;
    date?: string;
    focusArea?: string;
  },
  emailOverride?: string | null
) => {
  const tests = getStoredMockTests(emailOverride);
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
    setUserItem('studybot_progress_mocktests', JSON.stringify(tests), emailOverride);
    const email = emailOverride || getActiveEmail();
    if (email) {
      saveUserMockTests(email, tests);
    }
    window.dispatchEvent(new Event('studybot:mocktest-updated'));
  } catch {}
  return newRecord;
};

/**
 * Compute the full badges status list for the active user's Email ID
 */
export const computeAchievements = (emailOverride?: string | null): {
  badges: AchievementBadge[];
  dailyLogs: DailyStudyLog[];
  currentConsecutive1HrDays: number;
  totalXp: number;
  unlockedCount: number;
  totalCount: number;
  fullMarksCount: number;
  ninetyPlusCount: number;
} => {
  const tests = getStoredMockTests(emailOverride);
  const dailyStudyMap = getDailyStudyLogs(emailOverride);
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
  const totalDaysMetInWeek = dailyLogs.filter((d) => d.targetMet).length;

  // 3. Analyze mistakes mastered
  let masteredMistakesCount = 0;
  try {
    const mistakes = JSON.parse(getUserItem('studybot_mistakes', emailOverride) || '[]');
    if (Array.isArray(mistakes)) {
      masteredMistakesCount = mistakes.filter((m: any) => m.mastered).length;
    }
  } catch {}

  // 4. Analyze total study time
  let totalStudyMinutes = 0;
  try {
    const stats = JSON.parse(getUserItem('studybot_stats', emailOverride) || '{}');
    if (typeof stats.studyTimeMinutes === 'number') totalStudyMinutes = stats.studyTimeMinutes;
  } catch {}

  // 5. Analyze completed planner tasks
  let completedPlannerCount = 0;
  try {
    for (let c = 4; c <= 9; c++) {
      const slots = JSON.parse(getUserItem(`studybot_timetable_c${c}`, emailOverride) || '[]');
      if (Array.isArray(slots)) {
        completedPlannerCount += slots.filter((s: any) => s.completed).length;
      }
    }
    const todayTasks = JSON.parse(getUserItem('studybot_progress_today_tasks', emailOverride) || '[]');
    if (Array.isArray(todayTasks)) {
      completedPlannerCount += todayTasks.filter((t: any) => t.completed).length;
    }
  } catch {}

  // 6. Construct Badges List
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
      unlockedAt: fullMarksCount >= 5 ? 'Unlocked' : undefined,
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
      unlockedAt: ninetyPlusCount >= 5 ? 'Unlocked' : undefined,
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
      unlockedAt: tests.length >= 1 ? 'Unlocked' : undefined,
      rarity: 'common',
      xpReward: 100,
      qualifyingDetails: tests.length > 0 ? [`First test: ${tests[tests.length - 1]?.name || 'Mock Test'}`] : [],
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
      unlockedAt: tests.length >= 10 ? 'Unlocked' : undefined,
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
      unlockedAt: masteredMistakesCount >= 3 ? 'Unlocked' : undefined,
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
      unlockedAt: totalStudyMinutes >= 300 ? 'Unlocked' : undefined,
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
      currentValue: Math.min(completedPlannerCount, 1),
      targetValue: 1,
      unit: 'goal',
      unlocked: completedPlannerCount >= 1,
      unlockedAt: completedPlannerCount >= 1 ? 'Unlocked' : undefined,
      rarity: 'common',
      xpReward: 150,
      qualifyingDetails: completedPlannerCount > 0 ? [`${completedPlannerCount} study planner tasks completed`] : [],
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
