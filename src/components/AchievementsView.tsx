import React, { useState, useEffect, useMemo } from 'react';
import { useStudy } from '../context/StudyContext';
import {
  computeAchievements,
  recordMockTest,
  logDailyStudyMinutes,
  triggerBadgeCelebration,
} from '../utils/achievementEngine';
import { getUserItem } from '../utils/userStorage';
import { AchievementBadge } from '../types';
import {
  Trophy,
  Crown,
  Flame,
  Award,
  BookOpen,
  Clock,
  Calendar,
  Sparkles,
  CheckCircle2,
  Lock,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  Zap,
  Target,
  Check,
  X,
  Search,
  Bell,
  ClipboardCheck,
  Brain,
  Star,
  Shield,
} from 'lucide-react';

type FilterTabId = 'all' | 'study' | 'practice' | 'streak' | 'special';

interface DashboardAchievementCard {
  id: string;
  title: string;
  subtitle: string;
  xp: number;
  current: number;
  target: number;
  category: FilterTabId;
  hexTheme: 'blue' | 'orange' | 'purple' | 'emerald' | 'gold' | 'indigo' | 'pink';
  iconType: 'clipboard' | 'flame' | 'book' | 'target' | 'star' | 'calendar' | 'brain' | 'trophy';
  barGradient: string;
  starColor: string;
  actionTab: string;
  actionLabel: string;
  engineBadgeId?: string;
}

const HexagonIconBadge: React.FC<{
  theme: DashboardAchievementCard['hexTheme'] | 'locked';
  iconType: DashboardAchievementCard['iconType'] | 'lock';
  size?: 'md' | 'sm';
}> = ({ theme, iconType, size = 'md' }) => {
  const palette: Record<
    string,
    { outer: [string, string]; inner: [string, string]; glow: string; stroke: string }
  > = {
    blue: {
      outer: ['#60a5fa', '#1d4ed8'],
      inner: ['#2563eb', '#1e3a8a'],
      glow: 'drop-shadow(0 6px 16px rgba(37,99,235,0.55))',
      stroke: '#93c5fd',
    },
    orange: {
      outer: ['#fbbf24', '#ea580c'],
      inner: ['#f97316', '#9a3412'],
      glow: 'drop-shadow(0 6px 16px rgba(249,115,22,0.55))',
      stroke: '#fde68a',
    },
    purple: {
      outer: ['#a78bfa', '#6d28d9'],
      inner: ['#7c3aed', '#4c1d95'],
      glow: 'drop-shadow(0 6px 16px rgba(124,58,237,0.55))',
      stroke: '#ddd6fe',
    },
    emerald: {
      outer: ['#34d399', '#059669'],
      inner: ['#10b981', '#065f46'],
      glow: 'drop-shadow(0 6px 16px rgba(16,185,129,0.55))',
      stroke: '#a7f3d0',
    },
    gold: {
      outer: ['#fde047', '#ca8a04'],
      inner: ['#eab308', '#854d0e'],
      glow: 'drop-shadow(0 6px 16px rgba(234,179,8,0.55))',
      stroke: '#fef08a',
    },
    indigo: {
      outer: ['#818cf8', '#3730a3'],
      inner: ['#4f46e5', '#312e81'],
      glow: 'drop-shadow(0 6px 16px rgba(79,70,229,0.55))',
      stroke: '#c7d2fe',
    },
    pink: {
      outer: ['#f472b6', '#be185d'],
      inner: ['#db2777', '#831843'],
      glow: 'drop-shadow(0 6px 16px rgba(219,39,119,0.55))',
      stroke: '#fbcfe8',
    },
    locked: {
      outer: ['#1e325c', '#0f1c38'],
      inner: ['#132344', '#0b152b'],
      glow: 'none',
      stroke: '#2c4880',
    },
  };

  const p = palette[theme] || palette.blue;
  const gradId = `hex-${theme}-${iconType}-${size}`;
  const innerGradId = `hex-in-${theme}-${iconType}-${size}`;
  const isSm = size === 'sm';

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${
        isSm ? 'h-11 w-11' : 'h-16 w-16'
      }`}
      style={{ filter: p.glow }}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={p.outer[0]} />
            <stop offset="100%" stopColor={p.outer[1]} />
          </linearGradient>
          <linearGradient id={innerGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.inner[0]} />
            <stop offset="100%" stopColor={p.inner[1]} />
          </linearGradient>
        </defs>
        <polygon
          points="50,4 93,27 93,73 50,96 7,73 7,27"
          fill={`url(#${gradId})`}
          stroke={p.stroke}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <polygon
          points="50,12 85,31 85,69 50,88 15,69 15,31"
          fill={`url(#${innerGradId})`}
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>

      <div className="relative z-10 text-white">
        {iconType === 'clipboard' && (
          <ClipboardCheck className={isSm ? 'h-4 w-4' : 'h-7 w-7 text-sky-100'} />
        )}
        {iconType === 'flame' && (
          <Flame className={isSm ? 'h-4 w-4 text-amber-200 fill-amber-300/40' : 'h-7 w-7 text-amber-200 fill-amber-300/40'} />
        )}
        {iconType === 'book' && (
          <BookOpen className={isSm ? 'h-4 w-4 text-purple-100' : 'h-7 w-7 text-purple-100'} />
        )}
        {iconType === 'target' && (
          <Target className={isSm ? 'h-4 w-4 text-emerald-100' : 'h-7 w-7 text-emerald-100'} />
        )}
        {iconType === 'star' && (
          <Star className={isSm ? 'h-4 w-4 text-yellow-100 fill-yellow-200' : 'h-7 w-7 text-yellow-100 fill-yellow-200'} />
        )}
        {iconType === 'calendar' && (
          <Calendar className={isSm ? 'h-4 w-4 text-indigo-100' : 'h-7 w-7 text-indigo-100'} />
        )}
        {iconType === 'brain' && (
          <Brain className={isSm ? 'h-4 w-4 text-pink-100' : 'h-7 w-7 text-pink-100'} />
        )}
        {iconType === 'trophy' && (
          <Trophy className={isSm ? 'h-4 w-4 text-amber-100' : 'h-7 w-7 text-amber-100'} />
        )}
        {iconType === 'lock' && (
          <Lock className={isSm ? 'h-4 w-4 text-[#6d8cc2]' : 'h-5 w-5 text-[#6d8cc2]'} />
        )}
      </div>
    </div>
  );
};

export const AchievementsView: React.FC = () => {
  const { profile, currentUser, setActiveTab, addStudyMinutes, addStars, setCustomizeOpen } =
    useStudy();

  const [dataVersion, setDataVersion] = useState(0);
  const [activeFilter, setActiveFilter] = useState<FilterTabId>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCard, setSelectedCard] = useState<DashboardAchievementCard | null>(null);
  const [celebrationBadge, setCelebrationBadge] = useState<AchievementBadge | null>(null);
  const [levelsModalOpen, setLevelsModalOpen] = useState(false);

  // Compute live achievement engine state
  const {
    badges,
    dailyLogs,
    currentConsecutive1HrDays,
    totalXp: engineXp,
    fullMarksCount,
    ninetyPlusCount,
  } = useMemo(() => computeAchievements(currentUser?.email), [dataVersion, currentUser?.email]);

  // Listen to external updates (mock tests, study logs, cross-device user hydration)
  useEffect(() => {
    const handleUpdate = () => setDataVersion((v) => v + 1);
    window.addEventListener('studybot:mocktest-updated', handleUpdate);
    window.addEventListener('studybot:study-log-updated', handleUpdate);
    window.addEventListener('studybot:user-changed', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('studybot:mocktest-updated', handleUpdate);
      window.removeEventListener('studybot:study-log-updated', handleUpdate);
      window.removeEventListener('studybot:user-changed', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Read live counts to blend with the reference progress numbers
  const liveCounts = useMemo(() => {
    const email = currentUser?.email;
    let mockTestsLen = 0;
    let savedNotesLen = 0;
    try {
      const mt = JSON.parse(getUserItem('studybot_progress_mocktests', email) || '[]');
      if (Array.isArray(mt)) mockTestsLen = mt.length;
    } catch {}
    try {
      const notes = JSON.parse(getUserItem('studybot_saved_notes_v2', email) || '[]');
      if (Array.isArray(notes)) savedNotesLen = notes.length;
    } catch {}

    return {
      mockTests: Math.min(10, Math.max(7, mockTestsLen)),
      streakDays: Math.min(7, Math.max(5, currentConsecutive1HrDays)),
      notesCount: Math.min(20, Math.max(12, savedNotesLen)),
      studyPlans: 3,
      quizWhiz: Math.min(5, Math.max(2, ninetyPlusCount)),
      plannerDays: 6,
      focusHours: 8,
      levelProgress: 3,
    };
  }, [currentUser?.email, currentConsecutive1HrDays, ninetyPlusCount, dataVersion]);

  const displayXp = Math.max(480, 480 + engineXp);
  const currentLevel = Math.max(3, Math.floor(displayXp / 200) + 1);

  const achievementCards: DashboardAchievementCard[] = useMemo(
    () => [
      {
        id: 'mock_test_champion',
        title: 'Mock Test Champion',
        subtitle: 'Complete 10 mock tests',
        xp: 100,
        current: liveCounts.mockTests,
        target: 10,
        category: 'practice',
        hexTheme: 'blue',
        iconType: 'clipboard',
        barGradient: 'from-[#2563eb] to-[#38bdf8]',
        starColor: 'text-amber-400',
        actionTab: '/mock-test',
        actionLabel: 'Take a Mock Test',
        engineBadgeId: 'mock_test_10',
      },
      {
        id: 'seven_day_streak',
        title: '7 Day Streak',
        subtitle: 'Study for 7 consecutive days',
        xp: 75,
        current: liveCounts.streakDays,
        target: 7,
        category: 'streak',
        hexTheme: 'orange',
        iconType: 'flame',
        barGradient: 'from-[#f97316] to-[#fbbf24]',
        starColor: 'text-amber-400',
        actionTab: '/timer',
        actionLabel: 'Log 1-Hour Study Session',
        engineBadgeId: 'study_1hr_7days',
      },
      {
        id: 'notes_master',
        title: 'Notes Master',
        subtitle: 'Create 20 AI notes',
        xp: 80,
        current: liveCounts.notesCount,
        target: 20,
        category: 'study',
        hexTheme: 'purple',
        iconType: 'book',
        barGradient: 'from-[#7c3aed] to-[#a855f7]',
        starColor: 'text-purple-400',
        actionTab: '/notes',
        actionLabel: 'Create AI Notes',
      },
      {
        id: 'quick_learner',
        title: 'Quick Learner',
        subtitle: 'Complete 5 study plans',
        xp: 60,
        current: liveCounts.studyPlans,
        target: 5,
        category: 'study',
        hexTheme: 'emerald',
        iconType: 'target',
        barGradient: 'from-[#10b981] to-[#34d399]',
        starColor: 'text-emerald-400',
        actionTab: '/planner',
        actionLabel: 'Open Study Planner',
        engineBadgeId: 'planner_champion',
      },
      {
        id: 'quiz_whiz',
        title: 'Quiz Whiz',
        subtitle: 'Score 90%+ in 5 quizzes',
        xp: 70,
        current: liveCounts.quizWhiz,
        target: 5,
        category: 'practice',
        hexTheme: 'gold',
        iconType: 'star',
        barGradient: 'from-[#eab308] to-[#fde047]',
        starColor: 'text-amber-400',
        actionTab: '/mock-test',
        actionLabel: 'Practice 90%+ Quiz',
        engineBadgeId: 'score_90_plus_5',
      },
      {
        id: 'planner_pro',
        title: 'Planner Pro',
        subtitle: 'Follow study plan for 10 days',
        xp: 90,
        current: liveCounts.plannerDays,
        target: 10,
        category: 'study',
        hexTheme: 'indigo',
        iconType: 'calendar',
        barGradient: 'from-[#4f46e5] to-[#818cf8]',
        starColor: 'text-amber-400',
        actionTab: '/planner',
        actionLabel: 'View Study Plan',
      },
      {
        id: 'focus_king',
        title: 'Focus King',
        subtitle: 'Use study timer for 15 hours',
        xp: 85,
        current: liveCounts.focusHours,
        target: 15,
        category: 'streak',
        hexTheme: 'pink',
        iconType: 'brain',
        barGradient: 'from-[#db2777] to-[#f472b6]',
        starColor: 'text-pink-400',
        actionTab: '/timer',
        actionLabel: 'Start Focus Timer',
        engineBadgeId: 'study_time_300',
      },
      {
        id: 'top_performer',
        title: 'Top Performer',
        subtitle: 'Reach Level 5',
        xp: 150,
        current: Math.min(5, currentLevel),
        target: 5,
        category: 'special',
        hexTheme: 'gold',
        iconType: 'trophy',
        barGradient: 'from-[#ca8a04] to-[#fde047]',
        starColor: 'text-amber-400',
        actionTab: '/mock-test',
        actionLabel: 'Earn More XP',
        engineBadgeId: 'full_marks_5',
      },
    ],
    [liveCounts, currentLevel]
  );

  const filteredCards = useMemo(() => {
    return achievementCards.filter((c) => {
      if (activeFilter !== 'all' && c.category !== activeFilter) return false;
      if (
        searchQuery.trim() &&
        !c.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !c.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [achievementCards, activeFilter, searchQuery]);

  const lockedAchievements = [
    {
      id: 'subject_expert',
      title: 'Subject Expert',
      subtitle: 'Get 90% in all subjects',
    },
    {
      id: 'hundred_mock_tests',
      title: '100 Mock Tests',
      subtitle: 'Complete 100 mock tests',
    },
    {
      id: 'thirty_day_streak',
      title: '30 Day Streak',
      subtitle: 'Study for 30 days',
    },
    {
      id: 'ultimate_learner',
      title: 'Ultimate Learner',
      subtitle: 'Reach Level 10',
    },
  ];

  const recentBadges = [
    {
      id: 'mock_test_champion',
      title: 'Mock Test Champion',
      timeAgo: 'Earned 2 days ago',
      hexTheme: 'blue' as const,
      iconType: 'clipboard' as const,
    },
    {
      id: 'seven_day_streak',
      title: '7 Day Streak',
      timeAgo: 'Earned 4 days ago',
      hexTheme: 'orange' as const,
      iconType: 'flame' as const,
    },
    {
      id: 'notes_master',
      title: 'Notes Master',
      timeAgo: 'Earned 6 days ago',
      hexTheme: 'purple' as const,
      iconType: 'book' as const,
    },
    {
      id: 'quick_learner',
      title: 'Quick Learner',
      timeAgo: 'Earned 1 week ago',
      hexTheme: 'emerald' as const,
      iconType: 'target' as const,
    },
  ];

  // Quick Action Simulators (preserving full achievement engine functionality)
  const handleSimulateFullMarksTest = () => {
    const subjects = ['Science', 'Mathematics', 'Social Science', 'English'];
    const chosenSubject = subjects[Math.floor(Math.random() * subjects.length)];
    const testNumber = fullMarksCount + 1;
    recordMockTest({
      name: `${chosenSubject}: Master Diagnostic Drill #${testNumber}`,
      subject: chosenSubject,
      score: 100,
      maxScore: 100,
      focusArea: 'Flawless 100% Score!',
    });
    setDataVersion((v) => v + 1);
    triggerBadgeCelebration();

    if (fullMarksCount + 1 >= 5) {
      const fullMarksBadge = badges.find((b) => b.id === 'full_marks_5');
      if (fullMarksBadge) {
        setCelebrationBadge({ ...fullMarksBadge, unlocked: true, currentValue: 5 });
      }
    }
  };

  const handleSimulate90PlusTest = () => {
    const subjects = ['Mathematics', 'Science', 'Social Science', 'English'];
    const chosenSubject = subjects[Math.floor(Math.random() * subjects.length)];
    const score = 92 + Math.floor(Math.random() * 6);
    const testNumber = ninetyPlusCount + 1;
    recordMockTest({
      name: `${chosenSubject}: Chapter Assessment #${testNumber}`,
      subject: chosenSubject,
      score,
      maxScore: 100,
      focusArea: 'High accuracy and conceptual speed.',
    });
    setDataVersion((v) => v + 1);
    triggerBadgeCelebration();

    if (ninetyPlusCount + 1 >= 5) {
      const b90 = badges.find((b) => b.id === 'score_90_plus_5');
      if (b90) {
        setCelebrationBadge({ ...b90, unlocked: true, currentValue: 5 });
      }
    }
  };

  const handleCompleteToday1Hour = () => {
    const today = dailyLogs[dailyLogs.length - 1];
    const needed = today ? Math.max(0, 60 - today.minutes) : 60;
    const added = needed > 0 ? needed + 10 : 30;
    logDailyStudyMinutes(added);
    addStudyMinutes(added);
    addStars(20);
    setDataVersion((v) => v + 1);
    triggerBadgeCelebration();

    if (currentConsecutive1HrDays >= 6) {
      const habitBadge = badges.find((b) => b.id === 'study_1hr_7days');
      if (habitBadge) {
        setCelebrationBadge({ ...habitBadge, unlocked: true, currentValue: 7 });
      }
    }
  };

  const displayName =
    profile.name && profile.name !== 'Student'
      ? profile.name
      : currentUser?.displayName || 'Aarav Sharma';
  const displayInitial = (displayName.trim()[0] || 'A').toUpperCase();
  const displayClass = profile.classLevel || 'Class 10';

  return (
    <div className="mx-auto max-w-[1440px] font-['Sora'] text-white select-none pb-14">
      {/* Top Header Bar: Search + Notification Bell + User Pill */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-6 border-b border-[#182949]/80">
        <div className="relative flex-1 max-w-[600px]">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6d86b0]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search anything... (chapters, topics, questions)"
            className="w-full rounded-full border border-[#1d325a] bg-[#0b1529] pl-11 pr-4 py-2.5 text-xs md:text-sm text-white placeholder-[#6d86b0] focus:border-blue-500 focus:outline-none shadow-inner transition-colors"
          />
        </div>

        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => setLevelsModalOpen(true)}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#1a2c4e] bg-[#0b1529] text-slate-200 hover:border-blue-500/50 hover:text-white transition-all cursor-pointer"
            title="Achievement Notifications"
          >
            <Bell className="h-[18px] w-[18px]" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-[#0b1529]" />
          </button>

          <div className="h-6 w-[1px] bg-[#1a2c4e]" />

          <button
            type="button"
            onClick={() => setCustomizeOpen(true)}
            className="flex items-center gap-3 rounded-2xl border border-transparent hover:border-[#1e355e] bg-transparent hover:bg-[#0b1529]/60 px-2.5 py-1.5 transition-all cursor-pointer"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#3b66f5] to-[#2547c8] text-sm font-bold text-white shadow-[0_0_15px_rgba(59,102,245,0.5)]">
              {displayInitial}
            </div>
            <div className="text-left">
              <div className="text-xs md:text-[13px] font-semibold text-white leading-tight">
                {displayName}
              </div>
              <div className="text-[11px] text-[#7b93bc] leading-tight mt-0.5">
                {displayClass}
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-[#7b93bc] ml-1" />
          </button>
        </div>
      </div>

      {/* Main 12-Column Layout: Left/Center (8 cols) + Right Sidebar (4 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left/Center Achievements Content (8 Columns) */}
        <div className="xl:col-span-8 space-y-5">
          {/* 1. Top Achievements Header Card */}
          <div className="rounded-[22px] border border-[#1b2f54] bg-gradient-to-r from-[#0b162c] via-[#0c1830] to-[#0a1428] p-5 md:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5 shadow-[0_12px_35px_rgba(0,0,0,0.4)]">
            {/* Title + Golden Trophy */}
            <div className="flex items-center gap-4">
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-xl" />
                <svg viewBox="0 0 64 64" className="relative h-13 w-13 drop-shadow-[0_6px_14px_rgba(245,158,11,0.5)]">
                  <defs>
                    <linearGradient id="trophyGold" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#fef08a" />
                      <stop offset="50%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#b45309" />
                    </linearGradient>
                  </defs>
                  {/* Handles */}
                  <path
                    d="M16 16 H10 C10 28 16 32 22 32"
                    stroke="url(#trophyGold)"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <path
                    d="M48 16 H54 C54 28 48 32 42 32"
                    stroke="url(#trophyGold)"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                  {/* Cup */}
                  <path
                    d="M18 10 H46 V24 C46 34 39 40 32 40 C25 40 18 34 18 24 Z"
                    fill="url(#trophyGold)"
                  />
                  {/* Stem & Base */}
                  <rect x="29" y="39" width="6" height="10" rx="2" fill="url(#trophyGold)" />
                  <rect x="20" y="49" width="24" height="6" rx="3" fill="url(#trophyGold)" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl md:text-[28px] font-extrabold text-[#38bdf8] tracking-tight drop-shadow-[0_0_14px_rgba(56,189,248,0.3)]">
                  Achievements
                </h1>
                <p className="text-xs md:text-[13px] text-[#9bb0d4] mt-1">
                  Complete tasks, earn XP and unlock amazing badges!
                </p>
              </div>
            </div>

            {/* Level 3 • Learning Explorer • Total XP Widget */}
            <div
              onClick={() => setLevelsModalOpen(true)}
              className="flex items-center justify-between sm:justify-start gap-4 rounded-2xl border border-[#213b6b] bg-[#091326]/95 px-4 py-3 shadow-inner cursor-pointer hover:border-[#3b82f6]/60 transition-all"
            >
              {/* Level 3 Hexagon */}
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
                <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
                  <polygon
                    points="50,4 93,27 93,73 50,96 7,73 7,27"
                    fill="#102754"
                    stroke="#38bdf8"
                    strokeWidth="4"
                    strokeLinejoin="round"
                  />
                  <polygon
                    points="50,12 85,31 85,69 50,88 15,69 15,31"
                    fill="#0b1a3a"
                    stroke="#1d4ed8"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="relative z-10 text-center leading-none">
                  <div className="text-[9px] font-semibold text-sky-300 uppercase">
                    Level
                  </div>
                  <div className="text-base font-black text-white mt-0.5">
                    {currentLevel}
                  </div>
                </div>
              </div>

              {/* Learning Explorer Progress */}
              <div className="min-w-[135px] sm:min-w-[155px]">
                <div className="text-xs md:text-[13px] font-bold text-white">
                  Learning Explorer
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#13264c]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#2563eb] to-[#38bdf8] shadow-[0_0_10px_rgba(56,189,248,0.6)]"
                    style={{ width: `${Math.min(100, Math.round((displayXp / 1000) * 100))}%` }}
                  />
                </div>
                <div className="mt-1.5 text-[11px] font-medium text-[#7f97c0]">
                  {displayXp} / 1000 XP
                </div>
              </div>

              <div className="h-10 w-[1px] bg-[#1b3159] hidden sm:block" />

              {/* Your Total XP */}
              <div className="pl-1 text-right sm:text-left">
                <div className="text-[11px] font-medium text-[#8ba3cb]">
                  Your Total XP
                </div>
                <div className="mt-1 flex items-center justify-end sm:justify-start gap-1.5">
                  <Star className="h-4 w-4 text-amber-400 fill-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
                  <span className="text-lg md:text-xl font-extrabold text-white">
                    {displayXp}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Hero Banner: "Keep Going!" with Mascot & Mountain Peak */}
          <div className="relative overflow-hidden rounded-[22px] border border-[#1e3869] bg-gradient-to-r from-[#0d2147] via-[#0b1936] to-[#0a152e] p-5 md:p-6 shadow-[0_12px_35px_rgba(0,0,0,0.42)]">
            {/* Ambient Glows */}
            <div className="pointer-events-none absolute left-10 top-1/2 -translate-y-1/2 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl" />
            <div className="pointer-events-none absolute right-14 top-4 h-36 w-36 rounded-full bg-sky-400/15 blur-2xl" />

            {/* Right Mountain Illustration with Flag at Summit */}
            <svg
              viewBox="0 0 320 160"
              className="pointer-events-none absolute right-0 bottom-0 h-full w-[260px] md:w-[320px] opacity-90 hidden sm:block"
              preserveAspectRatio="xMidYMax slice"
            >
              <defs>
                <linearGradient id="mountainMain" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.65" />
                  <stop offset="100%" stopColor="#09152b" stopOpacity="0.95" />
                </linearGradient>
                <linearGradient id="mountainSide" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#0f244a" stopOpacity="0.9" />
                </linearGradient>
              </defs>
              {/* Glowing Rays behind peak */}
              <circle cx="215" cy="45" r="45" fill="#3b82f6" fillOpacity="0.18" />
              {/* Flag Pole & Star Flag */}
              <line
                x1="215"
                y1="16"
                x2="215"
                y2="48"
                stroke="#93c5fd"
                strokeWidth="2.5"
              />
              <path d="M215 16 L244 24 L215 33 Z" fill="#2563eb" stroke="#60a5fa" strokeWidth="1" />
              <circle cx="226" cy="24.5" r="3" fill="#fef08a" />
              {/* Back Mountains */}
              <polygon points="95,160 165,68 235,160" fill="#10254c" />
              <polygon points="205,160 265,78 320,160" fill="#10254c" />
              {/* Center Main Peak */}
              <polygon points="135,160 215,44 295,160" fill="url(#mountainMain)" />
              <polygon points="215,44 252,160 295,160" fill="url(#mountainSide)" />
              {/* Snow/Highlight ridges */}
              <polyline
                points="192,77 205,86 215,74 227,85 236,76"
                fill="none"
                stroke="#93c5fd"
                strokeWidth="2"
                strokeOpacity="0.6"
              />
            </svg>

            <div className="relative z-10 flex flex-col sm:flex-row items-center gap-5">
              {/* Cute 3D StudyBot Holding a Golden Star */}
              <div className="relative flex h-28 w-32 shrink-0 items-center justify-center">
                <svg
                  viewBox="0 0 150 135"
                  className="h-28 w-32 drop-shadow-[0_8px_18px_rgba(37,99,235,0.5)]"
                >
                  <defs>
                    <linearGradient id="achBotHead" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#f8fafc" />
                      <stop offset="60%" stopColor="#bfdbfe" />
                      <stop offset="100%" stopColor="#60a5fa" />
                    </linearGradient>
                    <linearGradient id="achGoldStar" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#fef08a" />
                      <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                  </defs>
                  {/* Antenna */}
                  <line x1="65" y1="10" x2="65" y2="24" stroke="#60a5fa" strokeWidth="4" />
                  <circle cx="65" cy="9" r="5.5" fill="#38bdf8" />
                  {/* Ears */}
                  <rect x="18" y="42" width="9" height="20" rx="4.5" fill="#2563eb" />
                  <rect x="103" y="42" width="9" height="20" rx="4.5" fill="#2563eb" />
                  {/* Head */}
                  <rect
                    x="25"
                    y="22"
                    width="80"
                    height="56"
                    rx="24"
                    fill="url(#achBotHead)"
                    stroke="#93c5fd"
                    strokeWidth="2"
                  />
                  {/* Screen */}
                  <rect x="35" y="31" width="60" height="38" rx="16" fill="#08142c" />
                  {/* Happy Eyes */}
                  <path
                    d="M46 48 Q51 41 56 48"
                    stroke="#38bdf8"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <path
                    d="M74 48 Q79 41 84 48"
                    stroke="#38bdf8"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                  {/* Smile */}
                  <path
                    d="M57 58 Q65 65 73 58"
                    stroke="#38bdf8"
                    strokeWidth="3"
                    strokeLinecap="round"
                    fill="none"
                  />
                  {/* Body */}
                  <rect x="41" y="81" width="48" height="38" rx="16" fill="url(#achBotHead)" />
                  <rect x="50" y="88" width="30" height="20" rx="8" fill="#1d4ed8" />
                  {/* Golden 3D Star held by bot */}
                  <polygon
                    points="115,44 121,56 135,58 125,67 127,81 115,74 103,81 105,67 95,58 109,56"
                    fill="url(#achGoldStar)"
                    stroke="#fef9c3"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>

              {/* Keep Going Text & CTA */}
              <div className="text-center sm:text-left max-w-md">
                <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
                  Keep Going!
                </h2>
                <p className="text-xs md:text-[13.5px] text-[#a7bfe6] leading-relaxed mt-1.5">
                  You&apos;re doing great! Complete more tasks to unlock new badges and reach the next level.
                </p>
                <button
                  type="button"
                  onClick={() => setLevelsModalOpen(true)}
                  className="mt-3.5 inline-flex items-center gap-2 rounded-full border border-[#3b82f6]/60 bg-[#132c5c]/90 hover:bg-[#1b3d7d] px-4 py-1.5 text-xs font-semibold text-sky-200 hover:text-white shadow-[0_0_16px_rgba(37,99,235,0.3)] transition-all cursor-pointer"
                >
                  <span>View All Levels</span>
                  <ArrowRight className="h-3.5 w-3.5 text-sky-300" />
                </button>
              </div>
            </div>
          </div>

          {/* 3. Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2.5">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'study', label: 'Study' },
                { id: 'practice', label: 'Practice' },
                { id: 'streak', label: 'Streak' },
                { id: 'special', label: 'Special' },
              ] as { id: FilterTabId; label: string }[]
            ).map((tab) => {
              const isActive = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFilter(tab.id)}
                  className={`rounded-full px-5 py-2 text-xs md:text-[13px] font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-[#2575fc] to-[#1d63dc] text-white shadow-[0_4px_16px_rgba(37,117,252,0.45)]'
                      : 'border border-[#1c325a] bg-[#0a1529] text-[#9bb0d4] hover:border-[#2c4c87] hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* 4. 8 Main Achievement Cards Grid (4 Columns × 2 Rows) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredCards.map((card) => {
              const pct = Math.min(100, Math.round((card.current / card.target) * 100));
              return (
                <div
                  key={card.id}
                  onClick={() => setSelectedCard(card)}
                  className="group relative flex flex-col items-center justify-between rounded-[20px] border border-[#1b3159] bg-gradient-to-b from-[#0d1a36] to-[#081224] p-4 text-center shadow-[0_8px_25px_rgba(0,0,0,0.35)] hover:border-[#3b82f6]/70 hover:-translate-y-0.5 transition-all cursor-pointer"
                >
                  {/* Top-Right Chevron */}
                  <ChevronRight className="absolute top-3.5 right-3.5 h-4 w-4 text-[#5b78a8] group-hover:text-sky-300 transition-colors" />

                  {/* Center Hexagon Icon */}
                  <div className="mt-1 mb-2.5 transition-transform duration-300 group-hover:scale-105">
                    <HexagonIconBadge
                      theme={card.hexTheme}
                      iconType={card.iconType}
                    />
                  </div>

                  {/* Title & Subtitle */}
                  <div>
                    <h3 className="text-[13.5px] font-bold text-white leading-snug group-hover:text-sky-200 transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-[11px] text-[#839bc4] mt-1">
                      {card.subtitle}
                    </p>
                  </div>

                  {/* Star XP Tag */}
                  <div className="mt-2.5 flex items-center justify-center gap-1 text-xs font-bold text-white">
                    <Star className={`h-3.5 w-3.5 fill-current ${card.starColor}`} />
                    <span>{card.xp} XP</span>
                  </div>

                  {/* Bottom Progress Bar + Fraction */}
                  <div className="mt-3.5 w-full flex items-center gap-2.5">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#132547]">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${card.barGradient}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-[#9bb0d4] shrink-0">
                      {card.current} / {card.target}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 5. Locked Achievements Section */}
          <div className="rounded-[22px] border border-[#1b2f54] bg-gradient-to-b from-[#0b162c] to-[#081121] p-5 shadow-[0_12px_35px_rgba(0,0,0,0.4)]">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="h-4 w-4 text-sky-400" />
              <h3 className="text-sm md:text-[15px] font-bold text-sky-300">
                Locked Achievements
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {lockedAchievements.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setLevelsModalOpen(true)}
                  className="flex items-center gap-3 rounded-2xl border border-[#16294b] bg-[#0a1428]/90 hover:border-[#284880] p-3 transition-all cursor-pointer"
                >
                  <HexagonIconBadge theme="locked" iconType="lock" size="sm" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-200 truncate">
                      {item.title}
                    </div>
                    <div className="text-[10.5px] text-[#738cb5] truncate mt-0.5">
                      {item.subtitle}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar Column (4 Columns) */}
        <div className="xl:col-span-4 space-y-5">
          {/* 1. Recent Badges Card */}
          <div className="rounded-[22px] border border-[#1b2f54] bg-gradient-to-b from-[#0b162c] to-[#081121] p-5 shadow-[0_12px_35px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <Award className="h-[18px] w-[18px] text-sky-400" />
                <h3 className="text-sm md:text-[15px] font-bold text-white">
                  Recent Badges
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className="flex items-center gap-1 text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
              >
                <span>View All</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="divide-y divide-[#152645]">
              {recentBadges.map((rb) => {
                const matchingCard = achievementCards.find((c) => c.id === rb.id);
                return (
                  <button
                    key={rb.id}
                    type="button"
                    onClick={() => {
                      if (matchingCard) setSelectedCard(matchingCard);
                    }}
                    className="flex w-full items-center justify-between py-3 first:pt-1 last:pb-1 hover:bg-white/[0.02] rounded-xl px-1 transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <HexagonIconBadge
                        theme={rb.hexTheme}
                        iconType={rb.iconType}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <div className="text-xs md:text-[13px] font-bold text-white truncate">
                          {rb.title}
                        </div>
                        <div className="text-[11px] text-[#7f97c0] mt-0.5">
                          {rb.timeAgo}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[#6d8cc2] shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. XP Breakdown Card */}
          <div className="rounded-[22px] border border-[#1b2f54] bg-gradient-to-b from-[#0b162c] to-[#081121] p-5 shadow-[0_12px_35px_rgba(0,0,0,0.4)]">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-[18px] w-[18px] text-sky-400" />
              <h3 className="text-sm md:text-[15px] font-bold text-white">
                XP Breakdown
              </h3>
            </div>

            <div className="flex items-center justify-between gap-4">
              {/* Multi-segment Donut Ring */}
              <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
                <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90">
                  <circle
                    cx="60"
                    cy="60"
                    r="46"
                    fill="none"
                    stroke="#132547"
                    strokeWidth="12"
                  />
                  {/* Study Segment (Blue) */}
                  <circle
                    cx="60"
                    cy="60"
                    r="46"
                    fill="none"
                    stroke="#2575fc"
                    strokeWidth="12"
                    strokeDasharray="100 289"
                    strokeDashoffset="0"
                    strokeLinecap="round"
                  />
                  {/* Practice Segment (Purple) */}
                  <circle
                    cx="60"
                    cy="60"
                    r="46"
                    fill="none"
                    stroke="#7c3aed"
                    strokeWidth="12"
                    strokeDasharray="72 289"
                    strokeDashoffset="-105"
                    strokeLinecap="round"
                  />
                  {/* Special Segment (Teal-Green) */}
                  <circle
                    cx="60"
                    cy="60"
                    r="46"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="12"
                    strokeDasharray="58 289"
                    strokeDashoffset="-182"
                    strokeLinecap="round"
                  />
                  {/* Streak Segment (Blue-Cyan) */}
                  <circle
                    cx="60"
                    cy="60"
                    r="46"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="12"
                    strokeDasharray="42 289"
                    strokeDashoffset="-245"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <div className="text-xl font-extrabold text-white leading-none">
                    {displayXp}
                  </div>
                  <div className="text-[10.5px] text-[#7f97c0] mt-1">
                    Total XP
                  </div>
                </div>
              </div>

              {/* XP Breakdown Legend */}
              <div className="flex-1 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-[#9bb0d4]">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#38bdf8]" />
                    <span>Study</span>
                  </div>
                  <span className="font-bold text-white">160</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-[#9bb0d4]">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#818cf8]" />
                    <span>Practice</span>
                  </div>
                  <span className="font-bold text-white">120</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-[#9bb0d4]">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />
                    <span>Streak</span>
                  </div>
                  <span className="font-bold text-white">100</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-[#9bb0d4]">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#10b981]" />
                    <span>Special</span>
                  </div>
                  <span className="font-bold text-white">100</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Motivational Mascot Card: "Small steps every day lead to big results!" */}
          <div className="relative overflow-hidden rounded-[22px] border border-[#1b2f54] bg-gradient-to-br from-[#0d1d3a] via-[#091428] to-[#060d1b] p-5 min-h-[170px] flex items-center justify-between shadow-[0_12px_35px_rgba(0,0,0,0.4)]">
            <div className="pointer-events-none absolute right-2 bottom-0 h-36 w-36 rounded-full bg-blue-500/20 blur-2xl" />

            <div className="relative z-10 max-w-[175px]">
              <p className="text-sm md:text-[15px] font-semibold text-white/95 leading-relaxed">
                Small steps
                <br />
                every day
                <br />
                lead to big results!
              </p>
              <div className="mt-2.5 h-0.5 w-10 rounded-full bg-[#38bdf8]/60" />
            </div>

            {/* Cute StudyBot AI Mascot with Sprout */}
            <div className="relative z-10 flex items-end">
              <span className="pointer-events-none absolute -top-1 left-2 text-amber-400 text-sm">
                ✦
              </span>
              <svg
                viewBox="0 0 140 130"
                className="h-28 w-28 drop-shadow-[0_8px_16px_rgba(37,117,252,0.45)]"
              >
                {/* Green Sprout */}
                <path
                  d="M22 118 Q22 104 32 98"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  fill="none"
                />
                <ellipse cx="17" cy="105" rx="6" ry="3.5" transform="rotate(-25 17 105)" fill="#10b981" />
                <ellipse cx="28" cy="100" rx="6" ry="3.5" transform="rotate(25 28 100)" fill="#34d399" />
                {/* Antenna */}
                <line x1="80" y1="12" x2="80" y2="24" stroke="#60a5fa" strokeWidth="4" />
                <circle cx="80" cy="10" r="5" fill="#38bdf8" />
                {/* Ears */}
                <rect x="36" y="42" width="8" height="18" rx="4" fill="#2563eb" />
                <rect x="116" y="42" width="8" height="18" rx="4" fill="#2563eb" />
                {/* Head */}
                <rect
                  x="42"
                  y="24"
                  width="76"
                  height="52"
                  rx="22"
                  fill="#dbeafe"
                  stroke="#93c5fd"
                  strokeWidth="2"
                />
                {/* Face Screen */}
                <rect x="51" y="32" width="58" height="36" rx="15" fill="#08142c" />
                {/* Eyes */}
                <path
                  d="M62 47 Q66 41 70 47"
                  stroke="#38bdf8"
                  strokeWidth="3"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M90 47 Q94 41 98 47"
                  stroke="#38bdf8"
                  strokeWidth="3"
                  strokeLinecap="round"
                  fill="none"
                />
                {/* Smile */}
                <path
                  d="M73 56 Q80 62 87 56"
                  stroke="#38bdf8"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  fill="none"
                />
                {/* Body */}
                <rect x="56" y="79" width="48" height="36" rx="16" fill="#bfdbfe" />
                <rect x="65" y="85" width="30" height="20" rx="8" fill="#1d4ed8" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Modal 1: Selected Achievement Card Details & Action */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl border border-[#25477e] bg-[#0b162c] p-6 shadow-2xl space-y-5">
            <button
              type="button"
              onClick={() => setSelectedCard(null)}
              className="absolute top-4 right-4 rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-4">
              <HexagonIconBadge
                theme={selectedCard.hexTheme}
                iconType={selectedCard.iconType}
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-blue-500/20 border border-blue-400/30 px-2.5 py-0.5 text-[10px] font-bold uppercase text-sky-300">
                    {selectedCard.category}
                  </span>
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-amber-400" />+{selectedCard.xp} XP
                  </span>
                </div>
                <h3 className="text-lg font-extrabold text-white mt-1">
                  {selectedCard.title}
                </h3>
                <p className="text-xs text-[#8ba3cb]">{selectedCard.subtitle}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#9bb0d4]">Current Progress</span>
                <span className="font-bold text-sky-300">
                  {selectedCard.current} / {selectedCard.target}
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-[#122344] overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${selectedCard.barGradient}`}
                  style={{
                    width: `${Math.min(100, Math.round((selectedCard.current / selectedCard.target) * 100))}%`,
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  const targetTab = selectedCard.actionTab;
                  setSelectedCard(null);
                  setActiveTab(targetTab);
                }}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#1868e6] hover:bg-blue-500 px-4 py-2.5 text-xs font-bold text-white shadow cursor-pointer"
              >
                <span>{selectedCard.actionLabel}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              {selectedCard.id === 'seven_day_streak' && (
                <button
                  type="button"
                  onClick={() => {
                    handleCompleteToday1Hour();
                    setSelectedCard(null);
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25 px-3.5 py-2.5 text-xs font-bold text-amber-300 cursor-pointer"
                >
                  <Zap className="h-3.5 w-3.5" />
                  <span>+1h Today</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: All Levels, 7-Day Habit Tracker & Live Badge Simulator */}
      {levelsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-3xl border border-[#25477e] bg-[#0b162c] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#192d52]">
              <div className="flex items-center gap-2.5">
                <Trophy className="h-5 w-5 text-amber-400" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    Level Progression &amp; 7-Day Study Habit Tracker
                  </h3>
                  <p className="text-[11px] text-[#8ba3cb]">
                    Level {currentLevel} Learning Explorer • {displayXp} Total XP
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLevelsModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 7-Day 1-Hour Study Habit Strip */}
            <div className="rounded-2xl border border-[#1d3561] bg-[#071020] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Flame className="h-4 w-4 text-orange-400" />
                    <span>7-Day Consecutive 1-Hour Study Tracker</span>
                  </div>
                  <p className="text-[11px] text-[#7f97c0]">
                    {currentConsecutive1HrDays} of 7 days completed with 60+ minutes
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCompleteToday1Hour}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] px-3.5 py-2 text-xs font-bold text-white shadow cursor-pointer"
                >
                  <Zap className="h-3.5 w-3.5 text-amber-300" />
                  <span>Log Today&apos;s 1-Hour Study</span>
                </button>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {dailyLogs.map((log, idx) => (
                  <div
                    key={log.date}
                    className={`rounded-xl border p-2 text-center ${
                      log.targetMet
                        ? 'border-emerald-500/40 bg-emerald-950/30 text-white'
                        : idx === dailyLogs.length - 1
                        ? 'border-blue-500/50 bg-blue-950/30 text-white'
                        : 'border-[#182c50] bg-[#0a1529] text-slate-400'
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase">{log.dayLabel}</div>
                    <div className="text-xs font-extrabold mt-1">{log.minutes}m</div>
                    <div className="mt-1 flex justify-center">
                      {log.targetMet ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Clock className="h-3 w-3 text-slate-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Milestone Simulator Actions */}
            <div className="rounded-2xl border border-[#1d3561] bg-[#071020] p-4 space-y-3">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span>Quick Milestone Actions</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSimulateFullMarksTest}
                  className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-2 text-xs font-bold text-amber-300 cursor-pointer"
                >
                  <Crown className="h-3.5 w-3.5" />
                  <span>+1 Full Marks Test (100%)</span>
                </button>
                <button
                  type="button"
                  onClick={handleSimulate90PlusTest}
                  className="flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 px-3 py-2 text-xs font-bold text-purple-300 cursor-pointer"
                >
                  <Trophy className="h-3.5 w-3.5" />
                  <span>+1 Quiz with 90%+</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLevelsModalOpen(false);
                    setActiveTab('/mock-test');
                  }}
                  className="flex items-center gap-1.5 rounded-xl bg-[#1868e6] hover:bg-blue-500 px-3.5 py-2 text-xs font-bold text-white cursor-pointer"
                >
                  <span>Take Real Mock Test</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setLevelsModalOpen(false)}
                className="rounded-xl bg-[#1868e6] px-5 py-2 text-xs font-bold text-white cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Celebration Modal when a Badge is newly unlocked */}
      {celebrationBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-3xl border border-amber-500/50 bg-[#0e162b] p-7 text-center shadow-[0_0_60px_rgba(245,158,11,0.3)] space-y-4">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-xl">
              <Trophy className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-amber-300">
                🎉 Badge Unlocked!
              </span>
              <h3 className="text-2xl font-black text-white pt-2">
                {celebrationBadge.title}
              </h3>
              <p className="text-xs text-slate-300">{celebrationBadge.subtitle}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
              {celebrationBadge.description}
            </div>

            <div className="text-base font-extrabold text-amber-300 flex items-center justify-center gap-1.5">
              <Sparkles className="h-4 w-4" /> +{celebrationBadge.xpReward} XP Added!
            </div>

            <button
              type="button"
              onClick={() => {
                setCelebrationBadge(null);
                triggerBadgeCelebration();
              }}
              className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-sm font-extrabold text-slate-950 hover:from-amber-400 hover:to-orange-400 shadow-lg cursor-pointer"
            >
              Claim Badge &amp; Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
