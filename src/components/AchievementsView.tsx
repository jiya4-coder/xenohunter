import React, { useState, useEffect, useMemo } from 'react';
import { useStudy } from '../context/StudyContext';
import {
  computeAchievements,
  recordMockTest,
  logDailyStudyMinutes,
  triggerBadgeCelebration,
  getLast7DaysKeys,
} from '../utils/achievementEngine';
import { AchievementBadge, BadgeCategory } from '../types';
import {
  Trophy,
  Crown,
  Flame,
  Award,
  ShieldCheck,
  BookMarked,
  Clock,
  CalendarCheck,
  Sparkles,
  CheckCircle2,
  Lock,
  ChevronRight,
  ArrowRight,
  Info,
  Zap,
  PlusCircle,
  RotateCcw,
  Target,
  Check,
  Calendar,
  X,
  ExternalLink,
} from 'lucide-react';

export const AchievementsView: React.FC = () => {
  const { profile, setActiveTab, addStudyMinutes, addStars } = useStudy();

  // Engine state
  const [dataVersion, setDataVersion] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [selectedBadge, setSelectedBadge] = useState<AchievementBadge | null>(null);
  const [celebrationBadge, setCelebrationBadge] = useState<AchievementBadge | null>(null);

  // Compute live achievement state
  const {
    badges,
    dailyLogs,
    currentConsecutive1HrDays,
    totalXp,
    unlockedCount,
    totalCount,
    fullMarksCount,
    ninetyPlusCount,
  } = useMemo(() => computeAchievements(), [dataVersion]);

  // Listen to external events
  useEffect(() => {
    const handleUpdate = () => setDataVersion((v) => v + 1);
    window.addEventListener('studybot:mocktest-updated', handleUpdate);
    window.addEventListener('studybot:study-log-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('studybot:mocktest-updated', handleUpdate);
      window.removeEventListener('studybot:study-log-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Icon mapping
  const renderBadgeIcon = (iconName: string, className = 'w-7 h-7') => {
    switch (iconName) {
      case 'Crown':
        return <Crown className={className} />;
      case 'Trophy':
        return <Trophy className={className} />;
      case 'Flame':
        return <Flame className={className} />;
      case 'Award':
        return <Award className={className} />;
      case 'ShieldCheck':
        return <ShieldCheck className={className} />;
      case 'BookMarked':
        return <BookMarked className={className} />;
      case 'Clock':
        return <Clock className={className} />;
      case 'CalendarCheck':
        return <CalendarCheck className={className} />;
      default:
        return <Award className={className} />;
    }
  };

  // Badge rarity theme styles
  const getRarityTheme = (rarity: AchievementBadge['rarity'], unlocked: boolean) => {
    if (!unlocked) {
      return {
        cardBorder: 'border-white/10 hover:border-white/20 bg-[#0d121f]/70',
        iconBg: 'bg-white/5 text-slate-500 border border-white/10',
        badgeColor: 'text-slate-400 bg-white/5 border border-white/10',
        glow: '',
      };
    }
    switch (rarity) {
      case 'legendary':
        return {
          cardBorder: 'border-amber-500/40 bg-gradient-to-b from-amber-950/20 via-[#0e1424] to-[#0a0e1c] shadow-[0_0_30px_rgba(245,158,11,0.12)]',
          iconBg: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
          badgeColor: 'text-amber-300 bg-amber-500/10 border border-amber-500/30',
          glow: 'from-amber-500/20 to-orange-500/10',
        };
      case 'epic':
        return {
          cardBorder: 'border-purple-500/40 bg-gradient-to-b from-purple-950/20 via-[#0e1424] to-[#0a0e1c] shadow-[0_0_30px_rgba(168,85,247,0.12)]',
          iconBg: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
          badgeColor: 'text-purple-300 bg-purple-500/10 border border-purple-500/30',
          glow: 'from-purple-500/20 to-indigo-500/10',
        };
      case 'rare':
        return {
          cardBorder: 'border-cyan-500/40 bg-gradient-to-b from-cyan-950/20 via-[#0e1424] to-[#0a0e1c] shadow-[0_0_25px_rgba(6,182,212,0.12)]',
          iconBg: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
          badgeColor: 'text-cyan-300 bg-cyan-500/10 border border-cyan-500/30',
          glow: 'from-cyan-500/20 to-blue-500/10',
        };
      case 'common':
      default:
        return {
          cardBorder: 'border-emerald-500/40 bg-gradient-to-b from-emerald-950/20 via-[#0e1424] to-[#0a0e1c] shadow-[0_0_25px_rgba(16,185,129,0.1)]',
          iconBg: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
          badgeColor: 'text-emerald-300 bg-emerald-500/10 border border-emerald-500/30',
          glow: 'from-emerald-500/20 to-teal-500/10',
        };
    }
  };

  // Quick Action: Simulate 100% Mock Test
  const handleSimulateFullMarksTest = () => {
    const subjects = ['Science', 'Mathematics', 'Computer Science', 'English'];
    const chosenSubject = subjects[Math.floor(Math.random() * subjects.length)];
    const testNumber = fullMarksCount + 1;
    const testTitle = `${chosenSubject}: Master Diagnostic Drill #${testNumber}`;
    
    recordMockTest({
      name: testTitle,
      subject: chosenSubject,
      score: 100,
      maxScore: 100,
      focusArea: 'Flawless 100% Score!',
    });
    
    setDataVersion((v) => v + 1);
    triggerBadgeCelebration();

    // Check if this unlocked the 5 full marks badge or 90+ badge
    const newCount = fullMarksCount + 1;
    if (newCount === 5) {
      const fullMarksBadge = badges.find((b) => b.id === 'full_marks_5');
      if (fullMarksBadge) {
        setCelebrationBadge({ ...fullMarksBadge, unlocked: true, currentValue: 5 });
      }
    }
  };

  // Quick Action: Simulate 90%+ Mock Test
  const handleSimulate90PlusTest = () => {
    const subjects = ['Mathematics', 'Science', 'Social Science', 'English'];
    const chosenSubject = subjects[Math.floor(Math.random() * subjects.length)];
    const score = 92 + Math.floor(Math.random() * 6); // 92 to 97
    const testNumber = ninetyPlusCount + 1;
    
    recordMockTest({
      name: `${chosenSubject}: Advanced Chapter Assessment #${testNumber}`,
      subject: chosenSubject,
      score,
      maxScore: 100,
      focusArea: 'Excellent conceptual speed and high accuracy.',
    });
    
    setDataVersion((v) => v + 1);
    triggerBadgeCelebration();

    if (ninetyPlusCount + 1 === 5) {
      const b90 = badges.find((b) => b.id === 'score_90_plus_5');
      if (b90) {
        setCelebrationBadge({ ...b90, unlocked: true, currentValue: 5 });
      }
    }
  };

  // Quick Action: Log Today's Study to reach >= 60 minutes
  const handleCompleteToday1Hour = () => {
    const today = dailyLogs[dailyLogs.length - 1];
    const needed = Math.max(0, 60 - today.minutes);
    const added = needed > 0 ? needed + 10 : 30; // Push beyond 60m
    
    logDailyStudyMinutes(added);
    addStudyMinutes(added);
    addStars(20);
    setDataVersion((v) => v + 1);
    triggerBadgeCelebration();

    // If this completed the 7th day
    if (currentConsecutive1HrDays >= 6) {
      const habitBadge = badges.find((b) => b.id === 'study_1hr_7days');
      if (habitBadge) {
        setCelebrationBadge({ ...habitBadge, unlocked: true, currentValue: 7 });
      }
    }
  };

  // Reset to initial testing seed
  const handleResetData = () => {
    localStorage.removeItem('studybot_daily_study_log');
    localStorage.removeItem('studybot_progress_mocktests');
    setDataVersion((v) => v + 1);
  };

  // Filtered badges list
  const filteredBadges = useMemo(() => {
    return badges.filter((b) => {
      // Category filter
      if (activeCategory !== 'all' && b.category !== activeCategory) {
        return false;
      }
      // Status filter
      if (statusFilter === 'unlocked' && !b.unlocked) return false;
      if (statusFilter === 'locked' && b.unlocked) return false;
      return true;
    });
  }, [badges, activeCategory, statusFilter]);

  const unlockPercentage = Math.round((unlockedCount / (totalCount || 1)) * 100);

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-20 select-none">
      {/* 1. Header Banner */}
      <section
        className="relative overflow-hidden rounded-3xl border border-blue-500/20 p-6 md:p-8 shadow-2xl"
        style={{
          background:
            'radial-gradient(ellipse at 80% 0%, rgba(99, 102, 241, 0.25), transparent 60%), linear-gradient(160deg, #0d152c 0%, #07090e 100%)',
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">
                <Trophy className="h-3.5 w-3.5 text-amber-400" />
                Student Honors & Milestones
              </span>
              <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">
                {profile.classLevel} · {profile.primaryExam}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Achievements & Badges
            </h1>
            <p className="text-sm text-slate-300 max-w-xl">
              Earn distinguished badges by mastering mock tests with 90%+ scores, achieving full marks, and sustaining a daily 1-hour study habit for a week.
            </p>
          </div>

          {/* XP & Trophy Summary Widget */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5 text-center">
              <div className="text-xs font-semibold text-slate-400">Badges Unlocked</div>
              <div className="mt-1 flex items-baseline justify-center gap-1">
                <span className="text-2xl font-black text-white">{unlockedCount}</span>
                <span className="text-xs text-slate-400">/ {totalCount}</span>
              </div>
              <div className="mt-1 text-[11px] font-bold text-emerald-400">{unlockPercentage}% completed</div>
            </div>

            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3.5 text-center">
              <div className="text-xs font-semibold text-amber-300">Trophy Score</div>
              <div className="mt-1 flex items-baseline justify-center gap-1">
                <span className="text-2xl font-black text-amber-300">{totalXp}</span>
                <span className="text-xs text-amber-400/80">XP</span>
              </div>
              <div className="mt-1 text-[11px] font-semibold text-slate-300">Scholar Rank</div>
            </div>

            <div className="col-span-2 md:col-span-1 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-3.5 text-center">
              <div className="text-xs font-semibold text-indigo-300">1-Hour Streak</div>
              <div className="mt-1 flex items-baseline justify-center gap-1">
                <span className="text-2xl font-black text-indigo-300">{currentConsecutive1HrDays}</span>
                <span className="text-xs text-indigo-400/80">/ 7 Days</span>
              </div>
              <div className="mt-1 text-[11px] font-semibold text-slate-300">
                {currentConsecutive1HrDays >= 7 ? '✓ 1-Week Habit Met!' : `${7 - currentConsecutive1HrDays} days left`}
              </div>
            </div>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="mt-6 pt-5 border-t border-white/10">
          <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
            <span className="font-semibold text-slate-200">Overall Badge Mastery Journey</span>
            <span className="font-mono text-emerald-400 font-bold">{unlockedCount} of {totalCount} Badges Claimed</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-900/80 border border-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 transition-all duration-700 ease-out"
              style={{ width: `${unlockPercentage}%` }}
            />
          </div>
        </div>
      </section>

      {/* 2. Interactive 7-Day 1-Hour Habit Spotlight Card */}
      <section className="rounded-3xl border border-indigo-500/20 bg-[#0a0f1d] p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-white/10">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-indigo-500/10 border border-indigo-500/30 p-3 text-indigo-400">
              <Flame className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">7-Day Iron Habit: Daily 1-Hour Study Tracker</h2>
                <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[11px] font-bold text-indigo-300 border border-indigo-500/30">
                  Target: 60+ min/day
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Study 1 hour regularly for 1 full week to unlock the prestigious <span className="text-indigo-300 font-semibold">7-Day Iron Habit</span> badge.
              </p>
            </div>
          </div>

          {/* Quick Action Button for Habit */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCompleteToday1Hour}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg hover:from-indigo-500 hover:to-blue-500 transition-all active:scale-95 cursor-pointer"
            >
              <Zap className="h-4 w-4 text-amber-300" />
              <span>Log Today's 1-Hour Study Session</span>
            </button>
          </div>
        </div>

        {/* 7 Days Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 mt-5">
          {dailyLogs.map((log, idx) => {
            const isToday = idx === dailyLogs.length - 1;
            const targetMet = log.targetMet;
            return (
              <div
                key={log.date}
                className={`relative rounded-2xl border p-3.5 flex flex-col justify-between transition-all ${
                  targetMet
                    ? 'border-emerald-500/40 bg-emerald-950/20 text-white'
                    : isToday
                    ? 'border-indigo-500/50 bg-indigo-950/20 text-white shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                    : 'border-white/10 bg-white/5 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    {log.dayLabel}
                  </span>
                  {targetMet ? (
                    <span className="flex items-center justify-center h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </span>
                  ) : (
                    <span className="flex items-center justify-center h-5 w-5 rounded-full bg-slate-800 text-slate-500 text-[10px] font-mono">
                      {idx + 1}
                    </span>
                  )}
                </div>

                <div className="my-2.5">
                  <div className="text-xl font-black">
                    {log.minutes} <span className="text-xs font-normal text-slate-400">min</span>
                  </div>
                  <div className="text-[11px] font-medium text-slate-400 mt-0.5">
                    {targetMet ? '≥ 1 Hour Done' : `${Math.max(0, 60 - log.minutes)}m needed`}
                  </div>
                </div>

                {/* Mini progress bar toward 60 mins */}
                <div className="h-1.5 w-full rounded-full bg-black/40 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      targetMet ? 'bg-emerald-400' : 'bg-indigo-400'
                    }`}
                    style={{ width: `${Math.min(100, (log.minutes / 60) * 100)}%` }}
                  />
                </div>

                {isToday && (
                  <span className="absolute -top-2 right-3 rounded-full bg-blue-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow">
                    Today
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Status banner */}
        <div className="mt-4 flex flex-wrap items-center justify-between text-xs text-slate-300 bg-white/5 rounded-xl px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-indigo-400" />
            <span>
              <strong className="text-white">{currentConsecutive1HrDays} of 7 days</strong> completed with 1+ hour of study.
            </span>
          </div>
          {currentConsecutive1HrDays >= 7 ? (
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Badge Unlocked! 400 XP Added
            </span>
          ) : (
            <span className="text-indigo-300 font-semibold">
              Complete {7 - currentConsecutive1HrDays} more day(s) to unlock the 7-Day Iron Habit Badge!
            </span>
          )}
        </div>
      </section>

      {/* 3. Filter Bar & Quick Test Simulator Bar */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl border border-white/10 bg-[#090d18]">
            {[
              { id: 'all', label: 'All Badges' },
              { id: 'mock_tests', label: 'Mock Test Honors' },
              { id: 'study_streak', label: 'Habits & Streaks' },
              { id: 'mastery', label: 'Mastery & Notes' },
              { id: 'milestones', label: 'Milestones' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  activeCategory === tab.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Status filters */}
          <div className="flex items-center gap-1.5">
            {[
              { id: 'all', label: 'All' },
              { id: 'unlocked', label: `Unlocked (${unlockedCount})` },
              { id: 'locked', label: `In Progress (${totalCount - unlockedCount})` },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id as any)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all border cursor-pointer ${
                  statusFilter === st.id
                    ? 'border-blue-500/40 bg-blue-500/10 text-blue-300'
                    : 'border-white/5 bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Simulator Bar (Demonstrating Mock Test Score Badges in Real-Time) */}
        <div className="rounded-2xl border border-white/10 bg-[#0b101e] p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-white">Live Badge Progression Tester:</span>{' '}
              <span className="text-slate-400">
                Log test scores or study time to see the badges dynamically advance and unlock with sound & confetti.
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSimulateFullMarksTest}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition-all cursor-pointer active:scale-95"
              title="Adds a mock test with 100% score"
            >
              <Crown className="h-3.5 w-3.5" />
              <span>+1 Full Marks Test (100%)</span>
              <span className="ml-1 text-[10px] rounded bg-amber-400/20 px-1 py-0.2 text-amber-200">
                {fullMarksCount}/5
              </span>
            </button>

            <button
              type="button"
              onClick={handleSimulate90PlusTest}
              className="flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-bold text-purple-300 hover:bg-purple-500/20 transition-all cursor-pointer active:scale-95"
              title="Adds a mock test with 90%+ score"
            >
              <Trophy className="h-3.5 w-3.5" />
              <span>+1 Test with 90%+</span>
              <span className="ml-1 text-[10px] rounded bg-purple-400/20 px-1 py-0.2 text-purple-200">
                {ninetyPlusCount}/5
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('/mock-test')}
              className="flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-500 transition-all cursor-pointer"
            >
              <span>Take Real Test</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* 4. Badges Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredBadges.map((badge) => {
          const isUnlocked = badge.unlocked;
          const theme = getRarityTheme(badge.rarity, isUnlocked);
          const progressPct = Math.min(100, Math.round((badge.currentValue / badge.targetValue) * 100));

          return (
            <div
              key={badge.id}
              onClick={() => setSelectedBadge(badge)}
              className={`group relative rounded-3xl border p-5 flex flex-col justify-between transition-all duration-300 cursor-pointer hover:-translate-y-1 ${theme.cardBorder}`}
            >
              {/* Header: Icon & Rarity Tag */}
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className={`rounded-2xl p-3.5 ${theme.iconBg} relative transition-transform duration-300 group-hover:scale-105`}>
                    {renderBadgeIcon(badge.iconName, 'w-6 h-6')}
                    {isUnlocked && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white shadow">
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${theme.badgeColor}`}>
                      {badge.rarity}
                    </span>
                    <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />+{badge.xpReward} XP
                    </span>
                  </div>
                </div>

                {/* Title & Description */}
                <div className="mt-4 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-extrabold text-white group-hover:text-blue-300 transition-colors">
                      {badge.title}
                    </h3>
                  </div>
                  <div className="text-xs font-semibold text-slate-400">
                    {badge.subtitle}
                  </div>
                  <p className="text-xs text-slate-300/90 leading-relaxed pt-1">
                    {badge.description}
                  </p>
                </div>
              </div>

              {/* Progress & Status footer */}
              <div className="mt-5 pt-4 border-t border-white/10 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-400">
                    {isUnlocked ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Badge Claimed
                      </span>
                    ) : (
                      <span className="text-slate-400 flex items-center gap-1">
                        <Lock className="h-3 w-3 text-slate-500" />
                        Progress
                      </span>
                    )}
                  </span>
                  <span className="font-mono text-xs font-bold text-white">
                    {badge.currentValue} / {badge.targetValue} {badge.unit} ({progressPct}%)
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-2 w-full rounded-full bg-black/50 overflow-hidden border border-white/5">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      isUnlocked
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                        : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                    }`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                {/* Criteria footnote & Click hint */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span className="truncate max-w-[200px]" title={badge.criteria}>
                    {badge.criteria}
                  </span>
                  <span className="text-blue-400 group-hover:underline flex items-center gap-0.5 shrink-0 font-medium">
                    Details <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* 5. Detailed Badge Breakdown Modal */}
      {selectedBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl border border-white/20 bg-[#0d1322] p-6 shadow-2xl space-y-5">
            {/* Close button */}
            <button
              type="button"
              onClick={() => setSelectedBadge(null)}
              className="absolute top-4 right-4 rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-4">
              <div className="rounded-2xl p-4 bg-white/5 border border-white/10 text-white">
                {renderBadgeIcon(selectedBadge.iconName, 'w-8 h-8 text-amber-300')}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-300">
                    {selectedBadge.rarity}
                  </span>
                  <span className="text-xs font-bold text-amber-400">+{selectedBadge.xpReward} XP</span>
                </div>
                <h3 className="text-xl font-black text-white">{selectedBadge.title}</h3>
                <p className="text-xs text-slate-400">{selectedBadge.subtitle}</p>
              </div>
            </div>

            {/* Criteria Box */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Unlock Requirement</div>
              <p className="text-sm font-semibold text-white">{selectedBadge.criteria}</p>
              <p className="text-xs text-slate-300">{selectedBadge.description}</p>
            </div>

            {/* Current Status Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Your Current Completion</span>
                <span className="font-mono font-bold text-emerald-400">
                  {selectedBadge.currentValue} / {selectedBadge.targetValue} {selectedBadge.unit}
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-black/60 overflow-hidden border border-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (selectedBadge.currentValue / selectedBadge.targetValue) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Qualifying History Records */}
            {selectedBadge.qualifyingDetails && selectedBadge.qualifyingDetails.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Qualifying Records ({selectedBadge.qualifyingDetails.length})
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {selectedBadge.qualifyingDetails.map((detail, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-xs text-slate-200 flex items-center gap-2"
                    >
                      <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setSelectedBadge(null);
                  if (selectedBadge.category === 'mock_tests') {
                    setActiveTab('/mock-test');
                  } else if (selectedBadge.category === 'study_streak') {
                    handleCompleteToday1Hour();
                  } else {
                    setActiveTab('/mistakes');
                  }
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-500 transition-colors cursor-pointer"
              >
                <span>
                  {selectedBadge.unlocked
                    ? 'Review Study Material'
                    : selectedBadge.category === 'mock_tests'
                    ? 'Take a Mock Test Now'
                    : selectedBadge.category === 'study_streak'
                    ? 'Log 1 Hour Today'
                    : 'Practice Mistakes'}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Celebration Modal when a Badge is newly unlocked */}
      {celebrationBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-amber-500/50 bg-[#0e162b] p-7 text-center shadow-[0_0_60px_rgba(245,158,11,0.3)] space-y-4">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-xl">
              {renderBadgeIcon(celebrationBadge.iconName, 'w-10 h-10')}
            </div>

            <div className="space-y-1">
              <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-amber-300">
                🎉 Badge Unlocked!
              </span>
              <h3 className="text-2xl font-black text-white pt-2">{celebrationBadge.title}</h3>
              <p className="text-xs text-slate-300">{celebrationBadge.subtitle}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300">
              {celebrationBadge.description}
            </div>

            <div className="text-base font-extrabold text-amber-300 flex items-center justify-center gap-1.5">
              <Sparkles className="h-4 w-4" /> +{celebrationBadge.xpReward} XP Added to Your Profile!
            </div>

            <button
              type="button"
              onClick={() => {
                setCelebrationBadge(null);
                triggerBadgeCelebration();
              }}
              className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-sm font-extrabold text-slate-950 hover:from-amber-400 hover:to-orange-400 shadow-lg cursor-pointer transition-transform active:scale-95"
            >
              Claim Badge & Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
