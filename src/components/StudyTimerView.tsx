import React, { useState, useEffect, useRef } from 'react';
import { useStudy } from '../context/StudyContext';
import { getUserItem, setUserItem } from '../utils/userStorage';
import { playStudyChime } from './RemindersView';
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  Check,
  Coffee,
  Settings,
  BookOpen,
  FlaskConical,
  Timer,
  MoreVertical,
  ChevronRight,
  X,
  Plus,
  Trash2,
  Pencil,
} from 'lucide-react';

export interface TimerSessionLog {
  id: string;
  subject: string;
  topic: string;
  durationMinutes: number;
  modeLabel: string;
  completedAt: string;
  dateKey: string;
  starsEarned: number;
}

export interface SavedUserTimer {
  id: string;
  title: string;
  focusMinutes: number;
  breakMinutes: number;
  tag?: string;
  iconType: 'book' | 'flask' | 'timer';
}

const TIMER_SESSIONS_KEY = 'studybot_timer_sessions';
const SAVED_TIMERS_KEY = 'studybot_saved_custom_timers_v1';

const DEFAULT_USER_TIMERS: SavedUserTimer[] = [
  {
    id: 'maths-revision',
    title: 'Maths Revision',
    focusMinutes: 25,
    breakMinutes: 5,
    tag: '(Pomodoro)',
    iconType: 'book',
  },
  {
    id: 'physics-practice',
    title: 'Physics Practice',
    focusMinutes: 40,
    breakMinutes: 10,
    iconType: 'flask',
  },
  {
    id: 'english-reading',
    title: 'English Reading',
    focusMinutes: 30,
    breakMinutes: 10,
    iconType: 'book',
  },
  {
    id: 'custom-timer-45',
    title: 'Custom Timer',
    focusMinutes: 45,
    breakMinutes: 15,
    iconType: 'timer',
  },
];

type ModeCardId = 'focus' | 'short-break' | 'long-break' | 'custom';

export const StudyTimerView: React.FC = () => {
  const {
    currentUser,
    addStudyMinutes,
    addStars,
    pomodoroSeconds,
    pomodoroRunning,
    togglePomodoro,
    resetPomodoro,
  } = useStudy();

  const activeEmail = currentUser?.email || null;

  // Active mode card ('focus' | 'short-break' | 'long-break' | 'custom')
  const [selectedMode, setSelectedMode] = useState<ModeCardId>('focus');
  const [activeTimerLabel, setActiveTimerLabel] = useState<string>('Focus Time');
  const [activeTechniqueName, setActiveTechniqueName] = useState<string>('Pomodoro Technique');
  const [activeFocusMins, setActiveFocusMins] = useState<number>(25);
  const [activeBreakMins, setActiveBreakMins] = useState<number>(5);
  const [totalSessionSeconds, setTotalSessionSeconds] = useState<number>(25 * 60);
  const [activeSavedTimerId, setActiveSavedTimerId] = useState<string | null>(null);

  // User timers list ("Your Timers")
  const [userTimers, setUserTimers] = useState<SavedUserTimer[]>(() => {
    try {
      const saved = getUserItem(SAVED_TIMERS_KEY, activeEmail);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_USER_TIMERS;
  });

  // Modals & menus
  const [customModalOpen, setCustomModalOpen] = useState<boolean>(false);
  const [editingTimerId, setEditingTimerId] = useState<string | null>(null);
  const [customTitleInput, setCustomTitleInput] = useState<string>('Custom Timer');
  const [customFocusInput, setCustomFocusInput] = useState<number>(45);
  const [customBreakInput, setCustomBreakInput] = useState<number>(15);
  const [customIconType, setCustomIconType] = useState<'book' | 'flask' | 'timer'>('timer');
  const [saveToYourTimers, setSaveToYourTimers] = useState<boolean>(true);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showAllTimers, setShowAllTimers] = useState<boolean>(false);
  const [completionBanner, setCompletionBanner] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = getUserItem(SAVED_TIMERS_KEY, activeEmail);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setUserTimers(parsed);
          return;
        }
      }
    } catch {}
    setUserTimers(DEFAULT_USER_TIMERS);
  }, [activeEmail]);

  const saveTimersList = (nextList: SavedUserTimer[]) => {
    setUserTimers(nextList);
    setUserItem(SAVED_TIMERS_KEY, JSON.stringify(nextList), activeEmail);
  };

  // Keep totalSessionSeconds synced if pomodoroSeconds exceeds it
  useEffect(() => {
    if (pomodoroSeconds > totalSessionSeconds) {
      setTotalSessionSeconds(pomodoroSeconds);
    }
  }, [pomodoroSeconds, totalSessionSeconds]);

  // Detect timer completion
  const prevSecondsRef = useRef<number>(pomodoroSeconds);
  useEffect(() => {
    if (prevSecondsRef.current > 0 && pomodoroSeconds === 0) {
      const completedMins = Math.max(1, Math.round(totalSessionSeconds / 60));
      const isBreak = selectedMode === 'short-break' || selectedMode === 'long-break';

      try {
        playStudyChime();
      } catch {}

      if (!isBreak) {
        const diffMinutes = completedMins - 25;
        if (diffMinutes > 0) {
          addStudyMinutes(diffMinutes);
        }
        const starsEarned = Math.max(5, Math.round(completedMins * 0.6));
        addStars(starsEarned);

        // Save to session log
        try {
          const now = new Date();
          const todayKey = now.toISOString().split('T')[0];
          const rawSessions = getUserItem(TIMER_SESSIONS_KEY, activeEmail);
          const prevSessions: TimerSessionLog[] = rawSessions ? JSON.parse(rawSessions) : [];
          const newEntry: TimerSessionLog = {
            id: `timer-${Date.now()}`,
            subject: activeTimerLabel,
            topic: activeTechniqueName,
            durationMinutes: completedMins,
            modeLabel: activeTimerLabel,
            completedAt: now.toISOString(),
            dateKey: todayKey,
            starsEarned,
          };
          setUserItem(
            TIMER_SESSIONS_KEY,
            JSON.stringify([newEntry, ...prevSessions].slice(0, 100)),
            activeEmail
          );
        } catch {}

        setCompletionBanner(
          `Great job! Completed ${completedMins}m of ${activeTimerLabel} (+${starsEarned} ⭐)`
        );
      } else {
        setCompletionBanner('Break complete! Ready for your next focus session?');
      }
    }
    prevSecondsRef.current = pomodoroSeconds;
  }, [pomodoroSeconds]);

  // Select one of the 4 Mode Cards
  const handleSelectModeCard = (mode: ModeCardId) => {
    setCompletionBanner(null);
    setActiveSavedTimerId(null);

    if (mode === 'focus') {
      setSelectedMode('focus');
      setActiveTimerLabel('Focus Time');
      setActiveTechniqueName('Pomodoro Technique');
      setActiveFocusMins(25);
      setActiveBreakMins(5);
      setTotalSessionSeconds(25 * 60);
      resetPomodoro(25);
    } else if (mode === 'short-break') {
      setSelectedMode('short-break');
      setActiveTimerLabel('Short Break');
      setActiveTechniqueName('Short Break');
      setTotalSessionSeconds(5 * 60);
      resetPomodoro(5);
    } else if (mode === 'long-break') {
      setSelectedMode('long-break');
      setActiveTimerLabel('Long Break');
      setActiveTechniqueName('Long Break');
      setTotalSessionSeconds(15 * 60);
      resetPomodoro(15);
    } else if (mode === 'custom') {
      setEditingTimerId(null);
      setCustomTitleInput('Custom Focus');
      setCustomFocusInput(activeFocusMins || 45);
      setCustomBreakInput(activeBreakMins || 15);
      setCustomIconType('timer');
      setSaveToYourTimers(false);
      setCustomModalOpen(true);
    }
  };

  // Start or pause a timer from "Your Timers" list
  const handleStartSavedTimer = (timer: SavedUserTimer) => {
    setCompletionBanner(null);
    if (activeSavedTimerId === timer.id && totalSessionSeconds === timer.focusMinutes * 60) {
      togglePomodoro();
      return;
    }

    setSelectedMode(timer.focusMinutes === 25 && timer.breakMinutes === 5 ? 'focus' : 'custom');
    setActiveSavedTimerId(timer.id);
    setActiveTimerLabel('Focus Time');
    setActiveTechniqueName(
      timer.tag ? `${timer.title} ${timer.tag}` : timer.title
    );
    setActiveFocusMins(timer.focusMinutes);
    setActiveBreakMins(timer.breakMinutes);
    setTotalSessionSeconds(timer.focusMinutes * 60);
    resetPomodoro(timer.focusMinutes);
    setTimeout(() => {
      togglePomodoro();
    }, 30);
  };

  const handleApplyCustomModal = (e: React.FormEvent) => {
    e.preventDefault();
    const fMins = Math.min(180, Math.max(1, Number(customFocusInput) || 25));
    const bMins = Math.min(60, Math.max(1, Number(customBreakInput) || 5));
    const title = customTitleInput.trim() || 'Custom Timer';

    if (editingTimerId) {
      const updated = userTimers.map((t) =>
        t.id === editingTimerId
          ? {
              ...t,
              title,
              focusMinutes: fMins,
              breakMinutes: bMins,
              iconType: customIconType,
            }
          : t
      );
      saveTimersList(updated);
    } else if (saveToYourTimers) {
      const newTimer: SavedUserTimer = {
        id: `custom-${Date.now()}`,
        title,
        focusMinutes: fMins,
        breakMinutes: bMins,
        iconType: customIconType,
      };
      saveTimersList([...userTimers, newTimer]);
      setActiveSavedTimerId(newTimer.id);
    }

    setSelectedMode('custom');
    setActiveTimerLabel('Focus Time');
    setActiveTechniqueName(title);
    setActiveFocusMins(fMins);
    setActiveBreakMins(bMins);
    setTotalSessionSeconds(fMins * 60);
    resetPomodoro(fMins);
    setCustomModalOpen(false);
    setEditingTimerId(null);
  };

  const handleDeleteSavedTimer = (id: string) => {
    const filtered = userTimers.filter((t) => t.id !== id);
    saveTimersList(filtered.length > 0 ? filtered : DEFAULT_USER_TIMERS);
    setOpenMenuId(null);
  };

  // Format MM:SS
  const totalMins = Math.floor(pomodoroSeconds / 60);
  const secs = pomodoroSeconds % 60;
  const formattedTime = `${String(totalMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  // Circular Ring Geometry matching the screenshot's ~75% illuminated blue arc
  const ringSize = 284;
  const strokeWidth = 10;
  const center = ringSize / 2;
  const radius = center - strokeWidth - 8;
  const circumference = 2 * Math.PI * radius;

  // When timer is at initial state (not yet ticked down), show the iconic 75% glowing arc from the design;
  // while counting down, animate the remaining ratio smoothly
  const isAtFullStart = pomodoroSeconds === totalSessionSeconds && !pomodoroRunning;
  const remainingRatio =
    totalSessionSeconds > 0
      ? Math.min(1, Math.max(0.05, pomodoroSeconds / totalSessionSeconds))
      : 0.75;
  const visualArcRatio = isAtFullStart ? 0.74 : remainingRatio;
  const strokeDashoffset = circumference * (1 - visualArcRatio);

  const displayedTimers = showAllTimers ? userTimers : userTimers.slice(0, 4);

  const renderTimerRowIcon = (iconType: 'book' | 'flask' | 'timer') => {
    if (iconType === 'flask') {
      return <FlaskConical className="h-5 w-5 text-[#38bdf8]" />;
    }
    if (iconType === 'timer') {
      return <Timer className="h-5 w-5 text-[#60a5fa]" />;
    }
    return <BookOpen className="h-5 w-5 text-[#60a5fa]" />;
  };

  return (
    <div className="h-[calc(100vh-2.5rem)] overflow-y-auto bg-[#030917] text-white select-none font-['Sora',sans-serif]">
      <div
        className="min-h-full px-4 py-5 md:px-8 md:py-6"
        style={{
          background:
            'radial-gradient(circle at 50% 34%, rgba(29, 99, 242, 0.22) 0%, rgba(10, 28, 68, 0.12) 38%, transparent 68%), #030917',
        }}
      >
        <div className="mx-auto max-w-[1120px] space-y-6">
          {/* ==================== 1. TOP HEADER BANNER CARD ==================== */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-[#142c59] bg-gradient-to-r from-[#07152e] via-[#091b3b] to-[#07142b] px-6 py-4 shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
            <div className="flex items-center gap-4">
              {/* Glowing Blue Clock Icon Box */}
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#60a5fa]/40 bg-gradient-to-b from-[#2563eb] to-[#1d4ed8] shadow-[0_0_25px_rgba(37,99,235,0.65)]">
                <Clock className="h-8 w-8 text-white stroke-[2.2]" />
              </div>
              <div>
                <h1 className="text-xl md:text-[26px] font-bold tracking-tight text-white">
                  Study Timer
                </h1>
                <p className="mt-0.5 text-xs md:text-sm text-slate-300/90">
                  Stay focused. Make progress.
                </p>
              </div>
            </div>

            {/* Right Pomodoro Technique Pill Button */}
            <button
              type="button"
              onClick={() => handleSelectModeCard('focus')}
              className="flex items-center justify-between sm:justify-start gap-3.5 rounded-2xl border border-[#1d3b72] bg-[#0a1c3d]/90 hover:border-[#38bdf8]/60 hover:bg-[#0e244d] px-4 py-2.5 text-left transition-all shadow-inner cursor-pointer"
              title="Click to reset to Pomodoro 25m / 5m"
            >
              {/* Tomato Icon Badge */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2a1832] border border-rose-500/25 shadow-inner">
                <svg viewBox="0 0 36 36" className="h-6 w-6">
                  <circle cx="18" cy="20" r="11" fill="#ef4444" />
                  <path
                    d="M14 15C12 17 12 21 14 24"
                    stroke="#fca5a5"
                    strokeWidth="2"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <path
                    d="M18 7V12M18 11L13 8M18 11L23 8M18 11L15 13M18 11L21 13"
                    stroke="#22c55e"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <div className="pr-2">
                <div className="text-xs md:text-sm font-bold text-white leading-tight">
                  {activeTechniqueName}
                </div>
                <div className="mt-0.5 text-[11px] md:text-xs text-sky-300/85 font-medium">
                  Focus {activeFocusMins} min <span className="mx-1 text-slate-400">•</span> Break{' '}
                  {activeBreakMins} min
                </div>
              </div>

              <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
            </button>
          </div>

          {completionBanner && (
            <div className="flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-200">
              <span>{completionBanner}</span>
              <button
                type="button"
                onClick={() => setCompletionBanner(null)}
                className="text-emerald-300 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ==================== 2. CENTER CIRCULAR TIMER + QUOTE + MASCOT ==================== */}
          <div className="relative grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-6 py-2">
            {/* Left Motivational Handwritten-style Quote */}
            <div className="hidden md:flex flex-col items-center justify-center select-none">
              <div className="-rotate-6 text-center space-y-0.5 text-slate-300/90 text-base lg:text-[17px] font-medium leading-relaxed tracking-wide">
                <div>“Better focus</div>
                <div>today,</div>
                <div>bigger dreams</div>
                <div>tomorrow.”</div>
                {/* Underline & Curved Arrow */}
                <div className="pt-2 flex items-center justify-center gap-3">
                  <div className="h-[2px] w-16 rounded-full bg-[#38bdf8]/60 -rotate-3" />
                  <svg
                    viewBox="0 0 40 36"
                    className="h-7 w-8 text-[#38bdf8]/75"
                    fill="none"
                  >
                    <path
                      d="M4 30C14 24 22 15 26 5M26 5L19 9M26 5L30 13"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Center Glowing Circular Countdown Dial */}
            <div className="relative mx-auto flex items-center justify-center">
              {/* Outer Ambient Blue Halo */}
              <div
                className="pointer-events-none absolute -inset-6 rounded-full opacity-75 blur-2xl"
                style={{
                  background:
                    'radial-gradient(circle, rgba(29, 108, 246, 0.42) 0%, rgba(14, 165, 233, 0.12) 55%, transparent 75%)',
                }}
              />

              {/* Circular Dial Container */}
              <div className="relative flex h-[284px] w-[284px] items-center justify-center rounded-full bg-gradient-to-b from-[#07142c] to-[#040c1d] shadow-[0_0_50px_rgba(29,108,246,0.32),inset_0_0_35px_rgba(14,42,92,0.7)] border border-[#173366]">
                <svg
                  width={ringSize}
                  height={ringSize}
                  viewBox={`0 0 ${ringSize} ${ringSize}`}
                  className="absolute inset-0 -rotate-90"
                >
                  <defs>
                    <linearGradient id="timerArcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="50%" stopColor="#1d6cf6" />
                      <stop offset="100%" stopColor="#2563eb" />
                    </linearGradient>
                    <filter id="arcGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Background Track Ring */}
                  <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="transparent"
                    stroke="#0d2147"
                    strokeWidth={strokeWidth}
                  />

                  {/* Glowing Progress Arc */}
                  <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="transparent"
                    stroke="url(#timerArcGrad)"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    filter="url(#arcGlow)"
                    className="transition-all duration-500"
                  />
                </svg>

                {/* Top 12-o'clock Glowing Blue-White Orb */}
                <div
                  className="pointer-events-none absolute top-[9px] left-1/2 -translate-x-1/2 h-4 w-4 rounded-full bg-[#60a5fa] ring-4 ring-[#1d6cf6]/40 shadow-[0_0_16px_#38bdf8]"
                />

                {/* Inner Dial Content: Digital Time + Label + Play/Pause Button */}
                <div className="relative z-10 flex flex-col items-center justify-center text-center pt-4">
                  <div className="text-5xl sm:text-[54px] font-bold tracking-tight text-white leading-none drop-shadow-[0_2px_12px_rgba(56,189,248,0.25)]">
                    {formattedTime}
                  </div>
                  <div className="mt-2.5 text-sm md:text-base font-medium text-slate-300">
                    {activeTimerLabel}
                  </div>

                  {/* Play / Pause Button + Subtle Reset when needed */}
                  <div className="mt-5 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={togglePomodoro}
                      className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-b from-[#2563eb] to-[#1d4ed8] text-white shadow-[0_0_26px_rgba(37,99,235,0.8)] hover:scale-105 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                      title={pomodoroRunning ? 'Pause Timer' : 'Start Timer'}
                    >
                      {pomodoroRunning ? (
                        <Pause className="h-6 w-6 fill-current" />
                      ) : (
                        <Play className="h-6 w-6 fill-current ml-0.5" />
                      )}
                    </button>

                    {(pomodoroRunning || pomodoroSeconds !== totalSessionSeconds) && (
                      <button
                        type="button"
                        onClick={() => {
                          const mins = Math.max(1, Math.round(totalSessionSeconds / 60));
                          resetPomodoro(mins);
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-[#1e3d75] bg-[#0a1936] text-slate-300 hover:border-[#38bdf8] hover:text-white transition-all cursor-pointer"
                        title="Reset Timer"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right StudyBot Mascot with "You can do it!", Plant & Books */}
            <div className="hidden md:flex flex-col items-center justify-center select-none">
              <div className="relative flex flex-col items-center">
                {/* "You can do it!" tilted text */}
                <div className="-rotate-12 mb-1 mr-10 text-center text-sm font-semibold text-slate-300/90 leading-tight">
                  <div>You can</div>
                  <div>do it!</div>
                </div>

                {/* Mascot + Sprout Pot + Books SVG Illustration */}
                <svg
                  viewBox="0 0 210 155"
                  className="h-40 w-52 drop-shadow-[0_10px_22px_rgba(14,165,233,0.28)]"
                >
                  <defs>
                    <linearGradient id="timerBotHead" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#f8fafc" />
                      <stop offset="60%" stopColor="#bfdbfe" />
                      <stop offset="100%" stopColor="#60a5fa" />
                    </linearGradient>
                    <linearGradient id="timerBotScreen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#09152b" />
                      <stop offset="100%" stopColor="#173060" />
                    </linearGradient>
                  </defs>

                  {/* Ground shadow */}
                  <ellipse cx="105" cy="142" rx="78" ry="8" fill="#020611" opacity="0.65" />

                  {/* Excitement Spark Lines */}
                  <line x1="42" y1="56" x2="50" y2="59" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" />
                  <line x1="40" y1="66" x2="49" y2="66" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" />
                  <line x1="164" y1="45" x2="156" y2="50" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" />
                  <line x1="168" y1="55" x2="159" y2="57" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" />

                  {/* Left Potted Plant */}
                  <g transform="translate(22, 92)">
                    {/* Leaves */}
                    <path d="M22 25V10" stroke="#10b981" strokeWidth="2.4" strokeLinecap="round" />
                    <path d="M22 18C14 18 10 12 12 6C18 6 22 12 22 18Z" fill="#10b981" />
                    <path d="M22 14C30 14 34 8 32 2C26 2 22 8 22 14Z" fill="#34d399" />
                    {/* Blue Pot */}
                    <rect x="8" y="24" width="28" height="20" rx="6" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="1.5" />
                    <ellipse cx="22" cy="25" rx="12" ry="3" fill="#0f172a" />
                  </g>

                  {/* Sitting StudyBot Robot */}
                  <g transform="translate(58, 18)">
                    {/* Antenna */}
                    <line x1="46" y1="6" x2="46" y2="18" stroke="#60a5fa" strokeWidth="3.5" strokeLinecap="round" />
                    <circle cx="46" cy="5" r="4.5" fill="#38bdf8" />
                    {/* Ears */}
                    <rect x="8" y="34" width="8" height="16" rx="4" fill="#2563eb" />
                    <rect x="76" y="34" width="8" height="16" rx="4" fill="#2563eb" />
                    {/* Head */}
                    <rect
                      x="14"
                      y="18"
                      width="64"
                      height="48"
                      rx="23"
                      fill="url(#timerBotHead)"
                      stroke="#3b82f6"
                      strokeWidth="2"
                    />
                    {/* Visor Screen */}
                    <rect
                      x="22"
                      y="26"
                      width="48"
                      height="30"
                      rx="14"
                      fill="url(#timerBotScreen)"
                    />
                    {/* Happy Arc Eyes */}
                    <path
                      d="M31 40C33 36 37 36 39 40"
                      stroke="#e0f2fe"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                      fill="none"
                    />
                    <path
                      d="M53 40C55 36 59 36 61 40"
                      stroke="#e0f2fe"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                      fill="none"
                    />
                    {/* Smile */}
                    <path
                      d="M41 47Q46 52 51 47"
                      stroke="#38bdf8"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      fill="none"
                    />
                    {/* Torso */}
                    <rect
                      x="26"
                      y="68"
                      width="40"
                      height="34"
                      rx="14"
                      fill="url(#timerBotHead)"
                      stroke="#3b82f6"
                      strokeWidth="2"
                    />
                    <rect x="35" y="76" width="22" height="12" rx="5" fill="#3b82f6" opacity="0.45" />
                    {/* Sitting Legs / Feet */}
                    <ellipse cx="32" cy="108" rx="10" ry="7" fill="#2563eb" />
                    <ellipse cx="60" cy="108" rx="10" ry="7" fill="#2563eb" />
                  </g>

                  {/* Right Stack of Two Books */}
                  <g transform="translate(142, 108)">
                    {/* Top Book */}
                    <rect x="4" y="0" width="42" height="12" rx="3" fill="#2563eb" stroke="#60a5fa" strokeWidth="1.2" />
                    <rect x="7" y="3" width="36" height="6" rx="1.5" fill="#e2e8f0" />
                    {/* Bottom Book */}
                    <rect x="0" y="13" width="48" height="13" rx="3" fill="#1d4ed8" stroke="#38bdf8" strokeWidth="1.2" />
                    <rect x="4" y="16" width="40" height="7" rx="1.5" fill="#f1f5f9" />
                  </g>
                </svg>
              </div>
            </div>
          </div>

          {/* ==================== 3. FOUR MODE SELECTION CARDS ==================== */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: Focus Time */}
            <button
              type="button"
              onClick={() => handleSelectModeCard('focus')}
              className={`relative flex flex-col items-center justify-center rounded-2xl border p-5 text-center transition-all cursor-pointer ${
                selectedMode === 'focus'
                  ? 'border-[#38bdf8] bg-gradient-to-b from-[#0b234d] to-[#071633] shadow-[0_0_24px_rgba(37,99,235,0.4)]'
                  : 'border-[#162d59] bg-[#061228]/90 hover:border-[#2563eb]/60 hover:bg-[#091a38]'
              }`}
            >
              {selectedMode === 'focus' && (
                <span className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-[#2563eb] text-white shadow-md">
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                </span>
              )}
              {/* Target / Bullseye Icon */}
              <div className="mb-2.5 flex h-10 w-10 items-center justify-center text-[#38bdf8]">
                <svg viewBox="0 0 36 36" className="h-8 w-8" fill="none">
                  <circle cx="17" cy="19" r="11" stroke="currentColor" strokeWidth="2.3" />
                  <circle cx="17" cy="19" r="6" stroke="currentColor" strokeWidth="2.3" />
                  <circle cx="17" cy="19" r="2" fill="currentColor" />
                  <path
                    d="M23 13L30 6M30 6H25M30 6V11"
                    stroke="currentColor"
                    strokeWidth="2.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="text-sm md:text-[15px] font-bold text-white">Focus Time</div>
              <div className="mt-0.5 text-xs text-sky-300/80">25 minutes</div>
            </button>

            {/* Card 2: Short Break */}
            <button
              type="button"
              onClick={() => handleSelectModeCard('short-break')}
              className={`relative flex flex-col items-center justify-center rounded-2xl border p-5 text-center transition-all cursor-pointer ${
                selectedMode === 'short-break'
                  ? 'border-[#38bdf8] bg-gradient-to-b from-[#0b234d] to-[#071633] shadow-[0_0_24px_rgba(37,99,235,0.4)]'
                  : 'border-[#162d59] bg-[#061228]/90 hover:border-[#2563eb]/60 hover:bg-[#091a38]'
              }`}
            >
              {selectedMode === 'short-break' && (
                <span className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-[#2563eb] text-white shadow-md">
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                </span>
              )}
              <div className="mb-2.5 flex h-10 w-10 items-center justify-center text-slate-300">
                <Coffee className="h-7 w-7" />
              </div>
              <div className="text-sm md:text-[15px] font-bold text-white">Short Break</div>
              <div className="mt-0.5 text-xs text-slate-400">5 minutes</div>
            </button>

            {/* Card 3: Long Break */}
            <button
              type="button"
              onClick={() => handleSelectModeCard('long-break')}
              className={`relative flex flex-col items-center justify-center rounded-2xl border p-5 text-center transition-all cursor-pointer ${
                selectedMode === 'long-break'
                  ? 'border-[#38bdf8] bg-gradient-to-b from-[#0b234d] to-[#071633] shadow-[0_0_24px_rgba(37,99,235,0.4)]'
                  : 'border-[#162d59] bg-[#061228]/90 hover:border-[#2563eb]/60 hover:bg-[#091a38]'
              }`}
            >
              {selectedMode === 'long-break' && (
                <span className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-[#2563eb] text-white shadow-md">
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                </span>
              )}
              {/* Green Sprout Icon */}
              <div className="mb-2.5 flex h-10 w-10 items-center justify-center">
                <svg viewBox="0 0 36 36" className="h-7 w-7" fill="none">
                  <path d="M18 30V16" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M18 23C11 23 7 17 9 11C15 11 18 17 18 23Z" fill="#10b981" />
                  <path d="M18 18C25 18 29 12 27 6C21 6 18 12 18 18Z" fill="#34d399" />
                </svg>
              </div>
              <div className="text-sm md:text-[15px] font-bold text-white">Long Break</div>
              <div className="mt-0.5 text-xs text-slate-400">15 minutes</div>
            </button>

            {/* Card 4: Custom */}
            <button
              type="button"
              onClick={() => handleSelectModeCard('custom')}
              className={`relative flex flex-col items-center justify-center rounded-2xl border p-5 text-center transition-all cursor-pointer ${
                selectedMode === 'custom'
                  ? 'border-[#38bdf8] bg-gradient-to-b from-[#0b234d] to-[#071633] shadow-[0_0_24px_rgba(37,99,235,0.4)]'
                  : 'border-[#162d59] bg-[#061228]/90 hover:border-[#2563eb]/60 hover:bg-[#091a38]'
              }`}
            >
              {selectedMode === 'custom' && (
                <span className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-[#2563eb] text-white shadow-md">
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                </span>
              )}
              <div className="mb-2.5 flex h-10 w-10 items-center justify-center text-slate-300">
                <Settings className="h-7 w-7" />
              </div>
              <div className="text-sm md:text-[15px] font-bold text-white">Custom</div>
              <div className="mt-0.5 text-xs text-slate-400">Set your own</div>
            </button>
          </div>

          {/* ==================== 4. YOUR TIMERS LIST CARD ==================== */}
          <div className="rounded-2xl border border-[#162d59] bg-[#061228]/95 p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#13284c] pb-3.5">
              <div className="flex items-center gap-2.5">
                <Clock className="h-5 w-5 text-[#60a5fa]" />
                <h2 className="text-base font-bold text-white">Your Timers</h2>
              </div>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setEditingTimerId(null);
                    setCustomTitleInput('Subject Practice');
                    setCustomFocusInput(35);
                    setCustomBreakInput(10);
                    setCustomIconType('book');
                    setSaveToYourTimers(true);
                    setCustomModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 text-[#38bdf8]" />
                  <span>Add Timer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAllTimers((prev) => !prev)}
                  className="text-xs font-semibold text-[#38bdf8] hover:text-sky-300 transition-colors cursor-pointer"
                >
                  {showAllTimers && userTimers.length > 4 ? 'Show Less' : 'View All'}
                </button>
              </div>
            </div>

            <div className="divide-y divide-[#13284c]">
              {displayedTimers.map((timer) => {
                const isThisTimerActiveAndRunning =
                  activeSavedTimerId === timer.id &&
                  pomodoroRunning &&
                  totalSessionSeconds === timer.focusMinutes * 60;

                return (
                  <div
                    key={timer.id}
                    className="relative flex items-center justify-between gap-4 py-3.5 first:pt-4 last:pb-1"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#1c386b] bg-[#0a1c3a] shadow-inner">
                        {renderTimerRowIcon(timer.iconType)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate">{timer.title}</div>
                        <div className="mt-0.5 text-xs text-slate-400 flex flex-wrap items-center gap-1">
                          <span className="font-semibold text-[#38bdf8]">
                            {timer.focusMinutes}m
                          </span>
                          <span>Focus</span>
                          <span className="mx-1 text-slate-500">+</span>
                          <span className="font-semibold text-[#38bdf8]">
                            {timer.breakMinutes}m
                          </span>
                          <span>Break</span>
                          {timer.tag && (
                            <span className="ml-1.5 text-slate-400">{timer.tag}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartSavedTimer(timer)}
                        className={`rounded-full px-7 py-2 text-xs font-bold text-white transition-all cursor-pointer ${
                          isThisTimerActiveAndRunning
                            ? 'bg-emerald-600 shadow-[0_0_16px_rgba(16,185,129,0.5)] hover:bg-emerald-500'
                            : 'bg-gradient-to-r from-[#1d63f2] to-[#2563eb] shadow-[0_0_16px_rgba(37,99,235,0.45)] hover:brightness-110'
                        }`}
                      >
                        {isThisTimerActiveAndRunning ? 'Pause' : 'Start'}
                      </button>

                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenMenuId((prev) => (prev === timer.id ? null : timer.id))
                          }
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
                          title="Timer options"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        {openMenuId === timer.id && (
                          <div className="absolute right-0 bottom-full mb-1 z-30 w-36 rounded-xl border border-[#1e3d75] bg-[#07152e] p-1.5 shadow-2xl">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTimerId(timer.id);
                                setCustomTitleInput(timer.title);
                                setCustomFocusInput(timer.focusMinutes);
                                setCustomBreakInput(timer.breakMinutes);
                                setCustomIconType(timer.iconType);
                                setSaveToYourTimers(true);
                                setOpenMenuId(null);
                                setCustomModalOpen(true);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-slate-200 hover:bg-white/10 cursor-pointer"
                            >
                              <Pencil className="h-3.5 w-3.5 text-[#38bdf8]" />
                              <span>Edit Timer</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSavedTimer(timer.id)}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-rose-300 hover:bg-rose-500/15 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ==================== CUSTOM TIMER MODAL ==================== */}
          {customModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="w-full max-w-md rounded-2xl border border-[#1e3d75] bg-[#07142b] p-6 shadow-2xl space-y-5">
                <div className="flex items-center justify-between border-b border-[#142952] pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2563eb]/20 text-[#38bdf8]">
                      <Settings className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">
                        {editingTimerId ? 'Edit Timer' : 'Set Custom Study Timer'}
                      </h3>
                      <p className="text-xs text-slate-400">
                        Configure your custom focus and break duration
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCustomModalOpen(false)}
                    className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleApplyCustomModal} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Timer Name
                    </label>
                    <input
                      type="text"
                      value={customTitleInput}
                      onChange={(e) => setCustomTitleInput(e.target.value)}
                      placeholder="e.g. Maths Revision, Chemistry Numericals..."
                      className="w-full rounded-xl border border-[#1b3668] bg-[#040d1e] px-3.5 py-2.5 text-xs md:text-sm text-white placeholder:text-slate-500 focus:border-[#38bdf8] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Focus Duration (mins)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={180}
                        value={customFocusInput}
                        onChange={(e) => setCustomFocusInput(Number(e.target.value))}
                        className="w-full rounded-xl border border-[#1b3668] bg-[#040d1e] px-3.5 py-2.5 text-sm font-bold text-white focus:border-[#38bdf8] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Break Duration (mins)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={customBreakInput}
                        onChange={(e) => setCustomBreakInput(Number(e.target.value))}
                        className="w-full rounded-xl border border-[#1b3668] bg-[#040d1e] px-3.5 py-2.5 text-sm font-bold text-white focus:border-[#38bdf8] focus:outline-none"
                      />
                    </div>
                  </div>

                  {!editingTimerId && (
                    <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={saveToYourTimers}
                        onChange={(e) => setSaveToYourTimers(e.target.checked)}
                        className="h-4 w-4 rounded border-[#1b3668] bg-[#040d1e] text-[#2563eb]"
                      />
                      <span>Save to "Your Timers" list for one-click access</span>
                    </label>
                  )}

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setCustomModalOpen(false)}
                      className="flex-1 rounded-xl border border-[#1b3668] bg-[#0a1936] py-2.5 text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 rounded-xl bg-gradient-to-r from-[#1d63f2] to-[#2563eb] py-2.5 text-xs font-bold text-white shadow-lg hover:brightness-110 cursor-pointer"
                    >
                      Apply Timer
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
