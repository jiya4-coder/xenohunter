import React, { useState, useMemo, useEffect } from 'react';
import { useStudy } from '../context/StudyContext';
import {
  Search,
  ArrowRight,
  MessageCircle,
  Play,
  Target,
  ListChecks,
  CalendarDays,
  FileText,
  ChevronRight,
  Bell,
  Plus,
  BarChart2,
  Camera,
  BookMarked,
  BookOpen,
  RotateCcw,
  Layers,
  Timer,
  Trophy,
  Bookmark,
  GraduationCap,
  X,
  HelpCircle,
  Dumbbell,
  ExternalLink,
  Clock,
} from 'lucide-react';
import {
  NEW_NCERT_SYLLABUS,
  getBookForClassAndSubject,
  SUBJECT_OPTIONS,
  NCERTChapter,
} from '../data/ncertSyllabus';
import { getUserItem } from '../utils/userStorage';
import { StudyReminder, REMINDERS_STORAGE_KEY, formatTime12Hour } from './RemindersView';

export const Dashboard: React.FC = () => {
  const { profile, stats, mistakes, setActiveTab, currentUser } = useStudy();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAllFeatures, setShowAllFeatures] = useState(false);

  // Reminders state synced with email-scoped storage
  const [reminders, setReminders] = useState<StudyReminder[]>(() => {
    try {
      const saved = getUserItem(REMINDERS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Mock tests state for progress calculation
  const [mockTests, setMockTests] = useState<any[]>(() => {
    try {
      const saved = getUserItem('studybot_progress_mocktests');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const reloadData = () => {
      try {
        const savedRem = getUserItem(REMINDERS_STORAGE_KEY);
        setReminders(savedRem ? JSON.parse(savedRem) : []);
      } catch {
        setReminders([]);
      }
      try {
        const savedTests = getUserItem('studybot_progress_mocktests');
        setMockTests(savedTests ? JSON.parse(savedTests) : []);
      } catch {
        setMockTests([]);
      }
    };

    window.addEventListener('studybot:reminders-updated', reloadData);
    window.addEventListener('studybot:mocktest-updated', reloadData);
    window.addEventListener('studybot:user-changed', reloadData);
    window.addEventListener('studybot:data-cleared', reloadData);
    return () => {
      window.removeEventListener('studybot:reminders-updated', reloadData);
      window.removeEventListener('studybot:mocktest-updated', reloadData);
      window.removeEventListener('studybot:user-changed', reloadData);
      window.removeEventListener('studybot:data-cleared', reloadData);
    };
  }, [currentUser?.email]);

  const upcomingReminders = useMemo(() => {
    return reminders.filter((r) => r.enabled).slice(0, 3);
  }, [reminders]);

  // Subject progress calculation (Mathematics, Physics, Chemistry, Computer Science)
  const subjectProgress = useMemo(() => {
    const baseActivity = Math.min(100, Math.round((stats.studyTimeMinutes / 180) * 40 + (stats.questionsSolved / 30) * 60));

    const getSubjScore = (keywords: string[], offset: number) => {
      const matchingTests = mockTests.filter((t) =>
        keywords.some((k) => String(t.subject || t.topic || '').toLowerCase().includes(k))
      );
      if (matchingTests.length > 0) {
        const avg = Math.round(
          matchingTests.reduce((acc, t) => acc + (Number(t.accuracy ?? t.score) || 0), 0) /
            matchingTests.length
        );
        return Math.min(100, Math.max(0, avg));
      }
      if (stats.studyTimeMinutes === 0 && stats.questionsSolved === 0) return 0;
      return Math.min(100, Math.max(0, baseActivity - offset));
    };

    const mathPct = getSubjScore(['math', 'algebra', 'geometry', 'quadratic'], 0);
    const physPct = getSubjScore(['physic', 'force', 'motion', 'light', 'science'], 5);
    const chemPct = getSubjScore(['chem', 'acid', 'atom', 'matter'], 8);
    const csPct = getSubjScore(['computer', 'code', 'algorithm', 'ai'], 10);

    const overall = Math.round((mathPct + physPct + chemPct + csPct) / 4);

    return {
      overall,
      subjects: [
        { name: 'Mathematics', color: '#3b82f6', percent: mathPct },
        { name: 'Physics', color: '#8b5cf6', percent: physPct },
        { name: 'Chemistry', color: '#10b981', percent: chemPct },
        { name: 'Computer Science', color: '#f59e0b', percent: csPct },
      ],
    };
  }, [stats.studyTimeMinutes, stats.questionsSolved, mockTests]);

  // Primary Quick Access cards
  const primaryQuickAccess = [
    {
      to: '/tutor',
      title: 'AI Tutor',
      desc: 'Ask questions, get instant help',
      icon: MessageCircle,
      iconBg: 'bg-[#2563eb]',
    },
    {
      to: '/scanner',
      title: 'Problem Scanner',
      desc: 'Scan notebook pages & doubts',
      icon: Camera,
      iconBg: 'bg-[#6366f1]',
    },
    {
      to: '/mock-test',
      title: 'Mock Tests',
      desc: 'Check your understanding',
      icon: ListChecks,
      iconBg: 'bg-[#2563eb]',
    },
    {
      to: '/planner',
      title: 'Study Planner',
      desc: 'Plan your study schedule',
      icon: CalendarDays,
      iconBg: 'bg-[#2563eb]',
    },
    {
      to: '/notes',
      title: 'AI Notes',
      desc: 'Keep your notes organized',
      icon: FileText,
      iconBg: 'bg-[#2563eb]',
    },
    {
      to: '/mistakes',
      title: 'Mistake Book',
      desc: `${mistakes.filter((m) => !m.mastered).length} active mistakes to master`,
      icon: BookMarked,
      iconBg: 'bg-[#e11d48]',
    },
  ];

  // Additional app features for instant access
  const extraQuickAccess = [
    {
      to: '/ncert',
      title: 'NCERT Books',
      desc: 'Official 2026–27 NCF-SE textbooks',
      icon: BookOpen,
      iconBg: 'bg-[#10b981]',
    },
    {
      to: '/timer',
      title: 'Study Timer',
      desc: 'Pomodoro focus timer & tracker',
      icon: Timer,
      iconBg: 'bg-[#2563eb]',
    },
    {
      to: '/achievements',
      title: 'Achievements',
      desc: 'Badges, streaks & milestones',
      icon: Trophy,
      iconBg: 'bg-[#eab308]',
    },
  ];

  // Extract class number (4 to 9) for textbook explorer
  const currentClassNum = useMemo(() => {
    const match = profile.classLevel.match(/\d+/);
    const num = match ? parseInt(match[0], 10) : 9;
    return num >= 4 && num <= 9 ? num : 9;
  }, [profile.classLevel]);

  const [selectedSubjectKey, setSelectedSubjectKey] = useState<'maths' | 'science' | 'sst' | 'english' | 'hindi'>('science');
  const [chapterExplorerOpen, setChapterExplorerOpen] = useState(false);

  const currentBook = useMemo(() => {
    return getBookForClassAndSubject(currentClassNum, selectedSubjectKey) || NEW_NCERT_SYLLABUS[9]['science'];
  }, [currentClassNum, selectedSubjectKey]);

  const handleLaunchChapter = (_ch: NCERTChapter, action: 'doubt' | 'notes' | 'practice') => {
    setChapterExplorerOpen(false);
    if (action === 'doubt') setActiveTab('/tutor');
    else if (action === 'notes') setActiveTab('/notes');
    else if (action === 'practice') setActiveTab('/mock-test');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim().toLowerCase();
    if (!q) return;
    if (q.includes('timer') || q.includes('pomodoro')) setActiveTab('/timer');
    else if (q.includes('mock') || q.includes('test')) setActiveTab('/mock-test');
    else if (q.includes('scan') || q.includes('photo')) setActiveTab('/scanner');
    else if (q.includes('note')) setActiveTab('/notes');
    else if (q.includes('ncert') || q.includes('book')) setActiveTab('/ncert');
    else if (q.includes('progress')) setActiveTab('/progress');
    else if (q.includes('plan')) setActiveTab('/planner');
    else setActiveTab('/tutor');
  };

  // SVG Circle Math for Overall Progress
  const circleRadius = 46;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset =
    circleCircumference - (subjectProgress.overall / 100) * circleCircumference;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16 font-['Sora'] select-none">
      {/* 1. Top Search Bar matching Screenshot */}
      <form onSubmit={handleSearchSubmit} className="max-w-xl">
        <div className="flex items-center gap-3 rounded-full border border-white/10 bg-[#0c1427] px-4 py-2.5 shadow-inner focus-within:border-blue-500/50 transition-all">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search anything... (chapters, topics, questions)"
            className="w-full bg-transparent text-xs md:text-sm text-white placeholder:text-slate-400 focus:outline-none"
          />
        </div>
      </form>

      {/* 2. Welcome to StudyBot AI Hero Banner matching Screenshot */}
      <section
        className="relative overflow-hidden rounded-3xl border border-blue-500/25 px-6 py-7 md:px-10 md:py-8 shadow-2xl"
        style={{
          background:
            'radial-gradient(circle at 75% 50%, rgba(29, 78, 216, 0.38), transparent 60%), linear-gradient(135deg, #0c1938 0%, #09132b 55%, #0d1f49 100%)',
        }}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-lg">
            <div className="text-lg md:text-xl font-semibold text-blue-300/90">
              Welcome to
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              StudyBot <span className="text-[#3b82f6]">AI</span>
            </h1>
            <div className="pt-1 space-y-0.5">
              <p className="text-xs md:text-sm font-medium text-slate-200">
                Your personalized AI study companion.
              </p>
              <p className="text-xs md:text-sm text-blue-300/80">
                Learn smarter, practice better, achieve more.
              </p>
            </div>
            <div className="pt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('/tutor')}
                className="inline-flex items-center gap-2 rounded-full bg-[#1660d8] hover:bg-[#1d6fe8] px-5 py-2.5 text-xs md:text-sm font-semibold text-white shadow-[0_4px_20px_rgba(22,96,216,0.5)] transition-all cursor-pointer"
              >
                <span>
                  {currentUser?.email
                    ? `Start Learning (${profile.classLevel})`
                    : 'Sign in to get started'}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setChapterExplorerOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 px-4 py-2.5 text-xs font-semibold text-slate-200 transition-all cursor-pointer"
              >
                <BookOpen className="h-3.5 w-3.5 text-blue-400" />
                <span>{profile.classLevel} NCERT Chapters</span>
              </button>
            </div>
          </div>

          {/* Right Friendly Robot Illustration & "Better Learning Together" */}
          <div className="hidden sm:flex items-center gap-5 pr-2">
            <div className="relative flex items-center">
              {/* Floating speech bubble */}
              <div className="mr-3 flex h-11 w-11 items-center justify-center rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 shadow-lg">
                <Target className="h-5 w-5" />
              </div>

              {/* Cute 3D-style Robot SVG */}
              <div className="relative flex flex-col items-center">
                {/* Antenna */}
                <div className="h-3 w-1 bg-blue-400 rounded-full" />
                <div className="h-3 w-3 -mt-4 rounded-full bg-cyan-300 shadow-[0_0_12px_#67e8f9]" />
                {/* Robot Head */}
                <div className="mt-1 flex h-24 w-28 items-center justify-center rounded-[2rem] bg-gradient-to-b from-white via-blue-50 to-blue-200 p-2.5 shadow-[0_10px_30px_rgba(37,99,235,0.45)] border-2 border-blue-300/60">
                  {/* Screen Face */}
                  <div className="flex h-full w-full flex-col items-center justify-center rounded-[1.4rem] bg-[#0c1938] px-3 py-2 shadow-inner">
                    {/* Happy Eyes */}
                    <div className="flex items-center gap-5">
                      <div className="h-2.5 w-4 rounded-t-full border-t-[3px] border-cyan-300" />
                      <div className="h-2.5 w-4 rounded-t-full border-t-[3px] border-cyan-300" />
                    </div>
                    {/* Smile */}
                    <div className="mt-1.5 h-2 w-4 rounded-b-full border-b-[2.5px] border-cyan-300" />
                  </div>
                </div>
                {/* Robot Torso */}
                <div className="-mt-1.5 h-10 w-16 rounded-b-2xl bg-gradient-to-b from-blue-100 to-blue-300 shadow-md border border-blue-300/40" />
              </div>
            </div>

            {/* Handwritten-style motto */}
            <div className=" -rotate-6 text-left font-semibold text-blue-200/90 leading-snug">
              <div className="text-base md:text-lg tracking-wide">Better</div>
              <div className="text-base md:text-lg tracking-wide">Learning</div>
              <div className="text-base md:text-lg tracking-wide">Together</div>
              <div className="mt-1 h-0.5 w-16 rounded-full bg-blue-400/60" />
              <div className="mt-0.5 ml-2 h-0.5 w-12 rounded-full bg-blue-400/40" />
            </div>
          </div>
        </div>
      </section>

      {/* 3. Main 2-Column Content Grid matching Screenshot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Columns: Quick Access + Your Progress */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Access Section */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base md:text-lg font-bold text-white">Quick Access</h2>
                <p className="text-xs text-slate-400">Jump into what you want to do</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAllFeatures(!showAllFeatures)}
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
              >
                {showAllFeatures ? 'Show Main 6' : `View All Tools (${primaryQuickAccess.length + extraQuickAccess.length}) →`}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {(showAllFeatures
                ? [...primaryQuickAccess, ...extraQuickAccess]
                : primaryQuickAccess
              ).map((card) => {
                const Icon = card.icon;
                return (
                  <button
                    key={card.to}
                    type="button"
                    onClick={() => setActiveTab(card.to)}
                    className="group flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#0b1325] p-4 text-left hover:border-blue-500/40 hover:bg-[#0f1a33] transition-all shadow-md cursor-pointer min-h-[118px]"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.iconBg} text-white shadow-md`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors truncate">
                          {card.title}
                        </h3>
                        <p className="mt-1 text-xs text-slate-400 leading-relaxed line-clamp-2">
                          {card.desc}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end mt-2">
                      <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Your Progress Card matching Screenshot */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0b1325] p-5 md:p-6 shadow-lg">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <BarChart2 className="h-5 w-5 text-white" />
                <h2 className="text-base font-bold text-white">Your Progress</h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('/progress')}
                className="flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
              >
                <span>View Details</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-8">
              {/* Circular Overall Progress Ring */}
              <div className="flex flex-col items-center shrink-0">
                <div className="relative flex h-28 w-28 items-center justify-center">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 110 110">
                    <circle
                      cx="55"
                      cy="55"
                      r={circleRadius}
                      fill="transparent"
                      stroke="#172442"
                      strokeWidth="9"
                    />
                    <circle
                      cx="55"
                      cy="55"
                      r={circleRadius}
                      fill="transparent"
                      stroke="#2563eb"
                      strokeWidth="9"
                      strokeLinecap="round"
                      strokeDasharray={circleCircumference}
                      strokeDashoffset={strokeDashoffset}
                    />
                  </svg>
                  <span className="absolute text-xl font-bold text-white">
                    {subjectProgress.overall}%
                  </span>
                </div>
                <span className="mt-2 text-xs text-slate-400">Overall Progress</span>
              </div>

              {/* 4 Subject Bars */}
              <div className="w-full flex-1 space-y-3.5">
                {subjectProgress.subjects.map((subj) => (
                  <div key={subj.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: subj.color }}
                        />
                        <span className="font-medium text-slate-200">{subj.name}</span>
                      </div>
                      <span className="text-slate-400 font-medium">{subj.percent}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#15203b]">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${subj.percent}%`,
                          backgroundColor: subj.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Motivational Mountain Card */}
        <div className="space-y-6">

          {/* Motivational Mountain Card matching Screenshot */}
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b1325] p-6 shadow-lg min-h-[210px] flex flex-col justify-between">
            <div className="relative z-10 space-y-2.5 max-w-[230px]">
              {/* Green Leaf Icon */}
              <div className="inline-flex items-center text-emerald-400">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8Z" />
                </svg>
              </div>
              <h3 className="text-lg font-extrabold text-white leading-snug">
                Small steps make
                <br />
                big progress
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                You don't have to be great today,
                <br />
                just better than yesterday.
              </p>
            </div>

            {/* Mountain Peak & Flag SVG Illustration at bottom right */}
            <svg
              className="pointer-events-none absolute bottom-0 right-0 h-36 w-56"
              viewBox="0 0 240 150"
              fill="none"
            >
              <defs>
                <linearGradient id="mountainGrad" x1="180" y1="30" x2="180" y2="150" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.65" />
                  <stop offset="100%" stopColor="#0b1325" stopOpacity="0.05" />
                </linearGradient>
              </defs>
              {/* Winding path */}
              <path
                d="M10 145 Q 60 140, 95 110 T 145 105"
                stroke="#1d4ed8"
                strokeWidth="2"
                fill="none"
                opacity="0.7"
              />
              {/* Main Mountain */}
              <path
                d="M120 150 L185 38 L240 150 Z"
                fill="url(#mountainGrad)"
              />
              {/* Snow/Highlight cap */}
              <path
                d="M185 38 L168 68 L178 64 L185 72 L193 63 L202 68 Z"
                fill="#3b82f6"
                opacity="0.7"
              />
              {/* Flag on summit */}
              <line x1="185" y1="38" x2="185" y2="18" stroke="#60a5fa" strokeWidth="2" />
              <path d="M185 18 L202 23 L185 28 Z" fill="#3b82f6" />
            </svg>
          </div>
        </div>
      </div>

      {/* Chapter Explorer Modal */}
      {chapterExplorerOpen && currentBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-md"
            onClick={() => setChapterExplorerOpen(false)}
          />

          <div className="relative z-50 flex max-h-[85vh] w-full max-w-3xl flex-col rounded-3xl border border-white/15 bg-[#090e1c] p-6 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600/20 border border-blue-500/40 text-2xl">
                  {currentBook.iconText}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {currentBook.classLevel} — {currentBook.bookName}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Official 2026–27 NCF-SE Chapter Directory · {currentBook.totalChapters} Chapters
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setChapterExplorerOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Subject switcher tabs inside modal */}
            <div className="flex items-center gap-2 overflow-x-auto py-3 border-b border-white/10">
              {SUBJECT_OPTIONS.map((subj) => (
                <button
                  key={subj.key}
                  type="button"
                  onClick={() => setSelectedSubjectKey(subj.key as any)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold shrink-0 cursor-pointer ${
                    selectedSubjectKey === subj.key
                      ? 'bg-[#1660d8] text-white'
                      : 'bg-white/5 text-slate-300 hover:text-white'
                  }`}
                >
                  <span>{subj.icon}</span>
                  <span>{subj.label}</span>
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-2.5 pr-1">
              {currentBook.chapters.map((ch) => (
                <div
                  key={ch.number}
                  className="rounded-2xl border border-white/10 bg-[#0d1428] p-3.5 transition-all hover:border-blue-500/40 hover:bg-[#111933] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-blue-400">Ch {ch.number}</span>
                      {ch.unit && <span className="text-[0.68rem] text-slate-400">· {ch.unit}</span>}
                    </div>
                    <h4 className="mt-0.5 text-sm font-bold text-white">{ch.title}</h4>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleLaunchChapter(ch, 'doubt')}
                      className="flex items-center gap-1 rounded-xl bg-blue-600/20 border border-blue-500/40 px-2.5 py-1.5 text-[0.7rem] font-bold text-blue-300 hover:bg-blue-600/40 transition-all cursor-pointer"
                    >
                      <HelpCircle className="h-3 w-3" />
                      <span>Ask AI</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLaunchChapter(ch, 'notes')}
                      className="flex items-center gap-1 rounded-xl bg-white/5 border border-white/10 px-2.5 py-1.5 text-[0.7rem] font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
                    >
                      <FileText className="h-3 w-3" />
                      <span>AI Notes</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLaunchChapter(ch, 'practice')}
                      className="flex items-center gap-1 rounded-xl bg-white/5 border border-white/10 px-2.5 py-1.5 text-[0.7rem] font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
                    >
                      <Dumbbell className="h-3 w-3" />
                      <span>MCQs</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-white/10 pt-3 flex items-center justify-between text-xs text-slate-400">
              <span>Explore chapters and ask AI Tutor any question.</span>
              <a
                href={currentBook.portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-bold text-blue-400 hover:text-blue-300 hover:underline"
              >
                <span>Official PDF Portal</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
