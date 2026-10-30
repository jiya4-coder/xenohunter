import React, { useState } from 'react';
import { useStudy } from '../context/StudyContext';
import {
  Home,
  MessageCircle,
  ListChecks,
  FileText,
  Target,
  RotateCcw,
  BookOpen,
  Layers,
  CalendarDays,
  Bot,
  Menu,
  X,
  RefreshCw,
  Maximize2,
  LogOut,
  ChevronDown,
  Check,
  Sparkles,
  BookMarked,
  Camera,
  BarChart2,
  Trophy,
  Mail,
  Bell,
  BellRing,
  Clock,
  Timer,
  PlayCircle,
  Bookmark,
  Settings,
  GraduationCap,
  User,
} from 'lucide-react';
import { getUserItem, setUserItem } from '../utils/userStorage';
import {
  StudyReminder,
  REMINDERS_STORAGE_KEY,
  REMINDER_SOUND_KEY,
  playStudyChime,
  formatTime12Hour,
} from './RemindersView';
import { getUserReminders, saveUserReminders } from '../firebase';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const {
    activeTab,
    setActiveTab,
    profile,
    updateProfile,
    mistakes,
    currentUser,
    logout,
    setCustomizeOpen,
    pomodoroSeconds,
    pomodoroRunning,
  } = useStudy();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [classDropdownOpen, setClassDropdownOpen] = useState(false);

  const [reminders, setReminders] = useState<StudyReminder[]>(() => {
    try {
      const saved = getUserItem(REMINDERS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeAlert, setActiveAlert] = useState<StudyReminder | null>(null);

  React.useEffect(() => {
    const reloadReminders = () => {
      try {
        const saved = getUserItem(REMINDERS_STORAGE_KEY);
        setReminders(saved ? JSON.parse(saved) : []);
      } catch {
        setReminders([]);
      }
    };
    const handleClear = () => {
      setReminders([]);
      setActiveAlert(null);
    };

    if (currentUser?.email) {
      getUserReminders(currentUser.email)
        .then((remote) => {
          if (Array.isArray(remote) && remote.length > 0) {
            setReminders(remote);
            setUserItem(REMINDERS_STORAGE_KEY, JSON.stringify(remote));
          }
        })
        .catch(() => {});
    }

    window.addEventListener('studybot:data-cleared', handleClear);
    window.addEventListener('studybot:reminders-updated', reloadReminders);
    window.addEventListener('studybot:user-changed', reloadReminders);
    return () => {
      window.removeEventListener('studybot:data-cleared', handleClear);
      window.removeEventListener('studybot:reminders-updated', reloadReminders);
      window.removeEventListener('studybot:user-changed', reloadReminders);
    };
  }, [currentUser?.email]);

  // Listen for manual/test notification triggers and scheduled clock matches
  React.useEffect(() => {
    const fireAlert = (rem: StudyReminder) => {
      setActiveAlert(rem);
      const soundPref = getUserItem(REMINDER_SOUND_KEY);
      if (soundPref !== 'false') {
        playStudyChime();
      }
      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        try {
          new Notification(`📚 Study Reminder: ${rem.title}`, {
            body: `${rem.subject} • ${rem.durationMinutes} min study goal (${formatTime12Hour(rem.time)})`,
          });
        } catch {}
      }
    };

    const handleManualTrigger = (e: Event) => {
      const custom = e as CustomEvent<StudyReminder>;
      if (custom.detail) {
        fireAlert(custom.detail);
      }
    };

    window.addEventListener('studybot:trigger-reminder', handleManualTrigger);

    const checkSchedule = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const currentHHMM = `${hh}:${mm}`;
      const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const dayOfWeek = now.getDay();

      let changed = false;
      const updated = reminders.map((rem) => {
        if (!rem.enabled) return rem;
        if (rem.time !== currentHHMM) return rem;
        if (rem.lastTriggeredDate === todayKey) return rem;

        if (rem.repeat === 'weekdays' && (dayOfWeek === 0 || dayOfWeek === 6)) return rem;
        if (rem.repeat === 'weekends' && dayOfWeek !== 0 && dayOfWeek !== 6) return rem;

        changed = true;
        fireAlert(rem);
        return {
          ...rem,
          lastTriggeredDate: todayKey,
          enabled: rem.repeat === 'once' ? false : rem.enabled,
        };
      });

      if (changed) {
        setReminders(updated);
        setUserItem(REMINDERS_STORAGE_KEY, JSON.stringify(updated));
        if (currentUser?.email) {
          saveUserReminders(currentUser.email, updated);
        }
      }
    };

    const timer = setInterval(checkSchedule, 10000);
    return () => {
      window.removeEventListener('studybot:trigger-reminder', handleManualTrigger);
      clearInterval(timer);
    };
  }, [reminders, currentUser?.email]);

  const handleSnoozeAlert = () => {
    if (!activeAlert) return;
    const fiveMinLater = new Date(Date.now() + 5 * 60 * 1000);
    const hh = String(fiveMinLater.getHours()).padStart(2, '0');
    const mm = String(fiveMinLater.getMinutes()).padStart(2, '0');
    const snoozedTime = `${hh}:${mm}`;

    const snoozedReminder: StudyReminder = {
      ...activeAlert,
      id: `snooze-${Date.now()}`,
      title: `${activeAlert.title} (Snoozed)`,
      time: snoozedTime,
      repeat: 'once',
      enabled: true,
      lastTriggeredDate: undefined,
    };

    const next = [snoozedReminder, ...reminders];
    setReminders(next);
    setUserItem(REMINDERS_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('studybot:reminders-updated'));
    setActiveAlert(null);
  };

  const unmasteredMistakesCount = mistakes.filter((m) => !m.mastered).length;
  const activeRemindersCount = reminders.filter((r) => r.enabled).length;
  const timerMins = Math.floor(pomodoroSeconds / 60);
  const timerSecs = pomodoroSeconds % 60;
  const liveTimerBadge = pomodoroRunning
    ? `${String(timerMins).padStart(2, '0')}:${String(timerSecs).padStart(2, '0')}`
    : undefined;

  // Navigation items in StudyBot AI sidebar
  const navItems: {
    to: string;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: number;
    badgeText?: string;
  }[] = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/tutor', label: 'AI Tutor', icon: MessageCircle },
    { to: '/scanner', label: 'Problem Scanner', icon: Camera },
    { to: '/notes', label: 'AI Notes', icon: FileText },
    { to: '/mock-test', label: 'Mock Tests', icon: ListChecks },
    {
      to: '/mistakes',
      label: 'Mistake Book',
      icon: BookMarked,
      badge: unmasteredMistakesCount > 0 ? unmasteredMistakesCount : undefined,
    },
    { to: '/ncert', label: 'NCERT Books', icon: BookOpen },
    { to: '/planner', label: 'Study Planner', icon: CalendarDays },
    {
      to: '/timer',
      label: 'Study Timer',
      icon: Timer,
      badgeText: liveTimerBadge,
    },
    { to: '/progress', label: 'Your Progress', icon: BarChart2 },
    { to: '/achievements', label: 'Achievements', icon: Trophy },
  ];

  const userName = currentUser?.displayName || profile.name || 'Student';

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#060b16] text-[#ecebfa] select-none font-['Sora']">
      {/* Top Bar */}
      <div className="flex h-9 w-full items-center justify-between border-b border-white/5 bg-[#050912] px-4 text-xs text-slate-400">
        <div className="hidden md:flex items-center gap-2 text-[0.7rem] text-emerald-400 font-medium truncate max-w-[260px]">
          <Mail className="h-3 w-3 text-emerald-400 shrink-0" />
          <span className="truncate" title={`Data stored for ${currentUser?.email || 'No Email'}`}>
            {currentUser?.email || 'Guest'}
          </span>
        </div>
        <div className="font-semibold text-slate-300 tracking-wide text-xs">
          StudyBot AI — Personal Study Companion
        </div>
        <div className="flex items-center gap-2">
          {/* Quick Class Switcher in Top Bar */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setClassDropdownOpen(!classDropdownOpen)}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#0d1527] px-2.5 py-1 text-[0.68rem] font-semibold text-slate-200 hover:border-blue-500/40 transition-all cursor-pointer"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>{profile.classLevel}</span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>
            {classDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setClassDropdownOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1.5 w-48 z-50 rounded-xl border border-white/10 bg-[#0d1326] p-1.5 shadow-2xl">
                  {['Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9'].map((cls) => {
                    const isSelected = profile.classLevel.toLowerCase().includes(cls.toLowerCase());
                    return (
                      <button
                        key={cls}
                        type="button"
                        onClick={() => {
                          updateProfile({ classLevel: cls });
                          setClassDropdownOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#1660d8] text-white'
                            : 'text-slate-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <span>{cls} · CBSE</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
              } else {
                document.exitFullscreen().catch(() => {});
              }
            }}
            className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
            title="Fullscreen"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main Body: Left Sidebar + Right Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar matching Screenshot */}
        <aside className="hidden md:flex w-64 flex-col border-r border-white/[0.07] bg-[#060b16] h-full select-none">
          {/* Brand Header */}
          <div
            onClick={() => setActiveTab('/')}
            className="flex items-center gap-3 px-5 pt-5 pb-4 cursor-pointer shrink-0"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1660d8] text-white shadow-[0_0_20px_rgba(22,96,216,0.5)]">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-bold text-white tracking-tight leading-tight">
                StudyBot AI
              </div>
              <div className="text-[0.7rem] text-slate-400">
                Your AI Study Companion
              </div>
            </div>
          </div>

          {/* All App Features Navigation List */}
          <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.to;
              return (
                <button
                  key={item.to}
                  type="button"
                  onClick={() => setActiveTab(item.to)}
                  className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-[0.82rem] font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#1660d8] text-white font-semibold shadow-[0_4px_15px_rgba(22,96,216,0.35)]'
                      : 'text-slate-300 hover:bg-white/[0.05] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <Icon
                      className={`h-[18px] w-[18px] shrink-0 ${
                        isActive ? 'text-white' : 'text-slate-400'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {item.badgeText && (
                      <span
                        className={`text-[0.65rem] font-semibold ${
                          isActive ? 'text-blue-100' : 'text-blue-400'
                        }`}
                      >
                        {item.badgeText}
                      </span>
                    )}
                    {item.badge !== undefined && (
                      <span
                        className={`text-xs font-bold ${
                          isActive ? 'text-white' : 'text-blue-400'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Bottom Section: Tip Card (on AI Notes) / Companion Card (on Study Planner) + Settings + User / Sign In Button */}
          <div className="px-3 pt-2 pb-4 border-t border-white/[0.07] space-y-2.5 shrink-0">
            {activeTab === '/notes' && (
              <div className="rounded-xl border border-[#1d2d4e] bg-[#0a1326] p-3 text-xs leading-relaxed shadow-inner">
                <div className="flex items-start gap-2">
                  <span className="text-sm leading-none mt-0.5">💡</span>
                  <p className="text-[11.5px] leading-snug text-[#60a5fa]">
                    <strong className="font-bold text-white">Tip:</strong> Good notes today builds confidence tomorrow.
                  </p>
                </div>
              </div>
            )}

            {activeTab === '/planner' && (
              <div
                onClick={() => setActiveTab('/tutor')}
                className="group relative overflow-hidden rounded-2xl border border-[#1e3463] bg-gradient-to-br from-[#0e1e3f] via-[#0b1730] to-[#081022] p-3.5 shadow-lg cursor-pointer hover:border-[#3b82f6]/60 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#162d59] border border-[#2b4c8c] text-[#60a5fa] shadow-inner">
                    <Bot className="h-6 w-6 text-sky-300" />
                  </div>
                  <div className="min-w-0 flex-1 pr-5">
                    <div className="text-xs font-extrabold text-white leading-tight">
                      Your AI Study Companion
                    </div>
                    <div className="text-[10.5px] text-[#60a5fa] mt-0.5 leading-snug">
                      Plan • Learn • Practice
                      <br />
                      Succeed
                    </div>
                  </div>
                </div>
                <div className="absolute bottom-2.5 right-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#2563eb] text-white shadow-md group-hover:scale-105 transition-transform">
                  <span className="text-xs leading-none">→</span>
                </div>
              </div>
            )}

            {activeTab === '/settings' && (
              <div
                onClick={() => setActiveTab('/planner')}
                className="group relative overflow-hidden rounded-2xl border border-[#1e3463] bg-gradient-to-br from-[#0e1e3f] via-[#0b1730] to-[#081022] p-3.5 shadow-lg cursor-pointer hover:border-[#3b82f6]/60 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#162d59] border border-[#2b4c8c] text-[#60a5fa] shadow-inner">
                    <Bot className="h-6 w-6 text-sky-300" />
                  </div>
                  <div className="min-w-0 flex-1 pr-5">
                    <div className="text-xs font-extrabold text-white leading-tight">
                      Keep Going!
                    </div>
                    <div className="text-[10.5px] text-[#8ab4f8] mt-0.5 leading-snug">
                      Small steps every day lead to big results!
                    </div>
                  </div>
                </div>
                <div className="absolute bottom-2.5 right-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#2563eb] text-white shadow-md group-hover:scale-105 transition-transform">
                  <span className="text-xs leading-none">→</span>
                </div>
              </div>
            )}

            {activeTab === '/achievements' && (
              <div
                onClick={() => setActiveTab('/mock-test')}
                className="group relative overflow-hidden rounded-2xl border border-[#1e3463] bg-gradient-to-br from-[#0e1e3f] via-[#0b1730] to-[#081022] p-3.5 shadow-lg cursor-pointer hover:border-[#3b82f6]/60 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#162d59] border border-[#2b4c8c] text-[#60a5fa] shadow-inner">
                    <Bot className="h-6 w-6 text-sky-300" />
                  </div>
                  <div className="min-w-0 flex-1 pr-5">
                    <div className="text-xs font-extrabold text-white leading-tight">
                      Earn XP
                      <br />
                      Unlock Badges
                    </div>
                    <div className="text-[10.5px] text-[#8ab4f8] mt-0.5 leading-snug">
                      Be a Top Learner!
                    </div>
                  </div>
                </div>
                <div className="absolute bottom-2.5 right-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#2563eb] text-white shadow-md group-hover:scale-105 transition-transform">
                  <span className="text-xs leading-none">→</span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('/settings')}
              className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-[0.82rem] font-medium transition-all cursor-pointer ${
                activeTab === '/settings'
                  ? 'bg-[#1660d8] text-white font-semibold shadow-[0_4px_15px_rgba(22,96,216,0.35)]'
                  : 'text-slate-300 hover:bg-white/[0.05] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Settings
                  className={`h-[18px] w-[18px] ${
                    activeTab === '/settings' ? 'text-white' : 'text-slate-400'
                  }`}
                />
                <span>Settings</span>
              </div>
            </button>

            <button
              type="button"
              onClick={logout}
              title={
                currentUser?.email
                  ? `Signed in as ${currentUser.email} — Click to switch account`
                  : 'Sign In'
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1660d8] hover:bg-[#1d6fe8] px-4 py-2.5 text-xs font-semibold text-white shadow-[0_4px_15px_rgba(22,96,216,0.35)] transition-all cursor-pointer"
            >
              <User className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {currentUser?.email ? `${userName} (Switch)` : 'Sign In'}
              </span>
            </button>
          </div>
        </aside>

        {/* Mobile Header Bar */}
        <div className="md:hidden flex h-14 w-full items-center justify-between border-b border-white/10 bg-[#060b16] px-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-slate-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1660d8] text-white">
                <Bot className="h-4 w-4" />
              </div>
              <span className="font-bold text-white text-sm">StudyBot AI</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCustomizeOpen(true)}
              className="p-1.5 text-slate-400 hover:text-white"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-rose-400"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-x-0 top-23 z-50 border-b border-white/10 bg-[#060b16]/95 p-4 backdrop-blur-xl shadow-2xl max-h-[calc(100vh-6rem)] overflow-y-auto scrollbar-thin">
            <div className="grid grid-cols-2 gap-2">
              {[...navItems, { to: '/settings', label: 'Settings', icon: Settings }].map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.to;
                return (
                  <button
                    key={item.to}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.to);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center justify-between rounded-xl p-2.5 text-xs font-bold ${
                      isActive
                        ? 'bg-[#1660d8] text-white'
                        : 'border border-white/10 bg-[#0c1428] text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick Class Selector in Mobile Menu */}
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="text-[0.68rem] font-bold text-slate-400 mb-2 uppercase tracking-wider flex items-center justify-between">
                <span>Select Class (NCF-SE 2026–27)</span>
                <span className="text-emerald-400 font-bold">{profile.classLevel}</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {['Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9'].map((cls) => {
                  const isSelected = profile.classLevel.toLowerCase().includes(cls.toLowerCase());
                  return (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => {
                        updateProfile({ classLevel: cls });
                        setMobileMenuOpen(false);
                      }}
                      className={`rounded-lg py-1.5 px-2 text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {cls}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Main Content Body */}
        <main
          className={`flex-1 bg-[#07090e] relative ${
            activeTab === '/tutor'
              ? 'overflow-hidden p-0'
              : 'overflow-y-auto p-4 md:p-8'
          }`}
        >
          {/* Global Study Reminder Notification Toast */}
          {activeAlert && (
            <div className="fixed top-14 right-4 z-50 w-full max-w-sm rounded-2xl border border-blue-500/60 bg-[#0d152c] p-4 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-200">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
                    <BellRing className="h-5 w-5 animate-bounce" />
                  </div>
                  <div>
                    <div className="text-[0.68rem] font-extrabold uppercase tracking-wider text-sky-400">
                      Study Reminder • {formatTime12Hour(activeAlert.time)}
                    </div>
                    <h4 className="text-sm font-extrabold text-white leading-snug">
                      {activeAlert.title}
                    </h4>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveAlert(null)}
                  className="text-slate-400 hover:text-white p-1"
                  title="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-2.5 flex items-center gap-2 text-xs text-slate-300 bg-white/5 rounded-xl px-3 py-2 border border-white/10">
                <Clock className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>
                  Subject: <strong className="text-white">{activeAlert.subject}</strong> • Goal:{' '}
                  <strong className="text-emerald-300">{activeAlert.durationMinutes} mins</strong>
                </span>
              </div>

              <div className="mt-3.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const subj = activeAlert.subject.toLowerCase();
                    if (subj.includes('mock')) {
                      setActiveTab('/mock-test');
                    } else if (subj.includes('ncert')) {
                      setActiveTab('/ncert');
                    } else {
                      setActiveTab('/practice');
                    }
                    setActiveAlert(null);
                  }}
                  className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 py-2 px-3 text-xs font-bold text-white text-center transition-all cursor-pointer"
                >
                  Start Studying
                </button>
                <button
                  type="button"
                  onClick={handleSnoozeAlert}
                  className="rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 py-2 px-3 text-xs font-bold text-slate-200 transition-all cursor-pointer"
                >
                  Snooze 5m
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAlert(null)}
                  className="rounded-xl border border-white/10 bg-transparent hover:bg-white/5 py-2 px-2.5 text-xs font-semibold text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {children}
        </main>
      </div>
    </div>
  );
};
