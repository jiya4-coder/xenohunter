import React, { useState } from 'react';
import { useStudy } from '../context/StudyContext';
import {
  LayoutDashboard,
  MessageCircle,
  ListChecks,
  FileText,
  Dumbbell,
  RotateCcw,
  BookOpen,
  Layers,
  CalendarDays,
  Bot,
  Menu,
  X,
  Flame,
  Globe,
  Share2,
  Monitor,
  RefreshCw,
  Maximize2,
  LogOut,
  ChevronRight,
  ChevronDown,
  Check,
  Sparkles,
  BookMarked,
  Camera,
  TrendingUp,
  Trophy,
} from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const {
    activeTab,
    setActiveTab,
    profile,
    updateProfile,
    stats,
    mistakes,
    currentUser,
    logout,
    setCustomizeOpen,
    setLovableModalOpen,
  } = useStudy();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [classDropdownOpen, setClassDropdownOpen] = useState(false);

  const [recentScans, setRecentScans] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('studybot_recent_scans');
      return saved ? JSON.parse(saved) : [
        {
          id: 'science-1',
          title: 'Force & Pressure Copy',
          subject: 'Science',
          time: 'Yesterday',
        },
        {
          id: 'math-1',
          title: 'Polynomials Classwork',
          subject: 'Maths',
          time: '2 days ago',
        },
      ];
    } catch {
      return [];
    }
  });

  const unmasteredMistakesCount = mistakes.filter((m) => !m.mastered).length;

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/progress', label: 'My Progress', icon: TrendingUp },
    { to: '/achievements', label: 'Achievements', icon: Trophy, badgeText: '🏆 Badges' },
    { to: '/tutor', label: 'AI Tutor', icon: MessageCircle },
    { to: '/scanner', label: 'Problem Scanner', icon: Camera, badgeText: '✨ AI' },
    { to: '/notes', label: 'AI Notes', icon: Sparkles },
    { to: '/mock-test', label: 'Mock Tests', icon: ListChecks },
    {
      to: '/mistakes',
      label: 'Mistake Book',
      icon: BookMarked,
      badge: unmasteredMistakesCount > 0 ? unmasteredMistakesCount : undefined,
    },
    { to: '/ncert', label: 'NCERT Books', icon: BookOpen },
    { to: '/summarize', label: 'Summarizer', icon: FileText },
    { to: '/practice', label: 'Practice', icon: Dumbbell },
    { to: '/revision', label: 'Revision', icon: RotateCcw },
    { to: '/flashcards', label: 'Flashcards', icon: Layers },
    { to: '/planner', label: 'Study Planner', icon: CalendarDays },
  ];

  const userName = currentUser?.displayName || profile.name || 'Aarav';
  const providerLabel = currentUser?.provider === 'google' ? 'Google' : currentUser?.provider === 'lovable' ? 'Lovable' : 'Email';

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#07090e] text-[#ecebfa] select-none font-['Sora']">
      {/* 1. Very Top Browser/Preview Chrome Bar (matching Image 2) */}
      <div className="flex h-10 w-full items-center justify-between border-b border-white/10 bg-[#090d18] px-4 text-xs text-slate-300">
        <div className="w-24 hidden md:block" />
        <div className="font-semibold text-slate-200 tracking-wide text-xs">
          StudyBot AI — Personal Study Companion
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLovableModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[0.7rem] font-bold text-slate-200 hover:bg-white/10 transition-colors"
          >
            <Share2 className="h-3 w-3 text-blue-400" />
            <span>Remix</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[0.7rem] font-bold text-slate-200 hover:bg-white/10 transition-colors"
          >
            <Monitor className="h-3 w-3 text-slate-400" />
            <span>Device</span>
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="p-1 rounded text-slate-400 hover:text-white"
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
            className="p-1 rounded text-slate-400 hover:text-white"
            title="Fullscreen"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Middle Body: Sidebar + Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar (matching Image 2) */}
        <aside className="hidden md:flex w-64 flex-col border-r border-white/10 bg-[#080c18] h-full overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20 select-none">
          <div className="p-4 space-y-4 flex-1">
            {/* Logo */}
            <div
              onClick={() => setActiveTab('/')}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2563eb] text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <div className="text-base font-extrabold text-white tracking-tight">
                  StudyBot <span className="text-[#38bdf8]">AI</span>
                </div>
                <div className="text-[0.68rem] text-slate-400">
                  Workspace v2.8 · All-in-1
                </div>
              </div>
            </div>

            {/* 3 Pills under logo (matching Image 2) */}
            <div className="space-y-1.5 pt-1 relative">
              {/* Interactive Class Switcher Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setClassDropdownOpen(!classDropdownOpen)}
                  className="flex w-full items-center justify-between rounded-full border border-blue-500/30 bg-[#12182b] px-3.5 py-1.5 text-xs font-semibold text-slate-200 hover:border-blue-400 hover:bg-[#182038] transition-all shadow-sm group"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{profile.classLevel} · {profile.primaryExam}</span>
                  </div>
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 group-hover:text-blue-400 ${
                      classDropdownOpen ? 'rotate-180 text-blue-400' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Menu */}
                {classDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setClassDropdownOpen(false)}
                    />
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl border border-white/10 bg-[#0d1326] p-2 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-2 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-slate-400 border-b border-white/5 pb-1.5 mb-1.5 flex items-center justify-between">
                        <span>Select Class (NCF-SE)</span>
                        <span className="text-[0.6rem] text-blue-400 font-normal">2026–27</span>
                      </div>
                      <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                        {[
                          { cls: 'Class 4', stage: 'Preparatory Stage', books: 'Maths Mela · Wondrous World' },
                          { cls: 'Class 5', stage: 'Preparatory Stage', books: 'Maths Mela · Santoor' },
                          { cls: 'Class 6', stage: 'Middle Stage', books: 'Ganita Prakash · Curiosity' },
                          { cls: 'Class 7', stage: 'Middle Stage', books: 'Ganita Prakash · Curiosity' },
                          { cls: 'Class 8', stage: 'Middle Stage', books: 'Ganita Prakash · Curiosity' },
                          { cls: 'Class 9', stage: 'Secondary Stage', books: 'Ganita Manjari · Exploration' },
                        ].map((item) => {
                          const isSelected = profile.classLevel.toLowerCase().includes(item.cls.toLowerCase());
                          return (
                            <button
                              key={item.cls}
                              type="button"
                              onClick={() => {
                                updateProfile({ classLevel: item.cls });
                                setClassDropdownOpen(false);
                              }}
                              className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left transition-all ${
                                isSelected
                                  ? 'bg-[#1d3557] text-white border border-blue-500/50 shadow-sm'
                                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
                              }`}
                            >
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1.5 text-xs font-bold">
                                  <span>{item.cls} · CBSE</span>
                                  {isSelected && (
                                    <span className="rounded bg-blue-500/20 px-1.5 py-0.2 text-[0.6rem] font-extrabold text-blue-300 border border-blue-400/30">
                                      Active
                                    </span>
                                  )}
                                </div>
                                <span className="text-[0.62rem] text-slate-400">
                                  {item.stage} · {item.books}
                                </span>
                              </div>
                              {isSelected && <Check className="h-4 w-4 text-emerald-400 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-2 pt-1.5 border-t border-white/5">
                        <button
                          type="button"
                          onClick={() => {
                            setClassDropdownOpen(false);
                            setCustomizeOpen(true);
                          }}
                          className="flex w-full items-center justify-center gap-1 rounded-lg py-1 text-[0.68rem] font-semibold text-slate-400 hover:text-blue-300 hover:bg-white/5 transition-all"
                        >
                          <span>⚙️ Customize full profile...</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Streak Pill */}
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-[#12182b] px-3.5 py-1.5 text-xs font-semibold text-slate-300">
                <span className="text-sm">🔥</span>
                <span>{stats.dayStreak} day streak</span>
              </div>

              {/* User Account / Google Sign-in Pill */}
              <button
                type="button"
                onClick={logout}
                title="Click to sign out / switch account"
                className="flex w-full items-center justify-between rounded-full border border-white/10 bg-[#12182b] px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:border-rose-500/50 hover:text-rose-300 transition-all"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-slate-400">→</span>
                  <span className="truncate">{userName} · {providerLabel}</span>
                </div>
                <LogOut className="h-3 w-3 text-slate-400 shrink-0" />
              </button>
            </div>

            {/* Navigation Menu Links */}
            <nav className="space-y-1 pt-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.to;
                return (
                  <button
                    key={item.to}
                    onClick={() => setActiveTab(item.to)}
                    className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#182b52] text-white border border-[#2563eb]/60 shadow-[0_0_15px_rgba(37,99,235,0.25)]'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`h-4 w-4 ${
                          isActive ? 'text-[#38bdf8]' : 'text-slate-400'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {(item as any).badgeText && (
                        <span className="rounded-full bg-blue-500/20 border border-blue-500/40 px-1.5 py-0.5 text-[0.62rem] font-bold text-blue-300">
                          {(item as any).badgeText}
                        </span>
                      )}
                      {item.badge !== undefined && (
                        <span className="rounded-full bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 text-[0.65rem] font-bold text-rose-300">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </nav>

            {/* Recent Scans Mini-List (Zone A) */}
            {recentScans.length > 0 && (
              <div className="mt-4 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between text-[0.65rem] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
                  <span className="flex items-center gap-1.5 text-blue-400">
                    <Camera className="h-3 w-3 text-cyan-400" />
                    Recent Scans
                  </span>
                  <span className="text-[0.6rem] text-slate-500 font-normal">History</span>
                </div>
                <div className="space-y-1">
                  {recentScans.slice(0, 3).map((scan, idx) => (
                    <button
                      key={scan.id || idx}
                      type="button"
                      onClick={() => {
                        setActiveTab('/scanner');
                        window.dispatchEvent(new CustomEvent('studybot:load-scan', { detail: scan }));
                      }}
                      className="flex w-full items-center justify-between rounded-xl p-2 text-left text-xs hover:bg-white/5 transition-all group"
                      title={`Reopen ${scan.title}`}
                    >
                      <div className="truncate pr-1">
                        <p className="text-[0.72rem] font-semibold text-slate-200 group-hover:text-blue-300 truncate">
                          {scan.title}
                        </p>
                        <span className="text-[0.62rem] text-slate-500">
                          {scan.subject} · {scan.time || 'Yesterday'}
                        </span>
                      </div>
                      <ChevronRight className="h-3 w-3 text-slate-600 group-hover:text-blue-400 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tip Card (matching AI Tutor screenshot) */}
          <div className="p-3 space-y-2 border-t border-white/10 mt-auto shrink-0">
            <div className="rounded-xl border border-white/5 bg-[#0e1426] p-3 text-[0.7rem] text-slate-400 leading-relaxed">
              <span className="font-bold text-amber-400">💡 Tip: </span>
              after every answer, try a learning aid like <strong className="text-white">Quiz me</strong> or <strong className="text-white">Draw a diagram</strong>.
            </div>

            {/* Lovable App View Switch */}
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#10162a] p-2.5">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-400" />
                <span className="text-xs font-bold text-slate-200">Lovable App View</span>
              </div>
              <button
                type="button"
                onClick={() => setLovableModalOpen(true)}
                className="rounded-lg bg-blue-600/30 border border-blue-500/50 px-2.5 py-1 text-[0.7rem] font-bold text-blue-300 hover:bg-blue-600/50 transition-all"
              >
                Switch
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile Header Bar */}
        <div className="md:hidden flex h-14 w-full items-center justify-between border-b border-white/10 bg-[#080c18] px-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-slate-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2563eb] text-white">
                <Bot className="h-4 w-4" />
              </div>
              <span className="font-bold text-white text-sm">StudyBot AI</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLovableModalOpen(true)}
              className="rounded-full bg-blue-600/30 px-2.5 py-1 text-[0.68rem] font-bold text-blue-300 border border-blue-500/40"
            >
              Lovable View
            </button>
            <button
              onClick={logout}
              className="p-1 text-slate-400 hover:text-rose-400"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-x-0 top-24 z-50 border-b border-white/10 bg-[#080c18]/95 p-4 backdrop-blur-xl shadow-2xl max-h-[calc(100vh-6.5rem)] overflow-y-auto scrollbar-thin">
            <div className="grid grid-cols-2 gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.to;
                return (
                  <button
                    key={item.to}
                    onClick={() => {
                      setActiveTab(item.to);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center justify-between rounded-xl p-2.5 text-xs font-bold ${
                      isActive
                        ? 'bg-[#182b52] text-white border border-[#2563eb]'
                        : 'border border-white/10 bg-[#10162a] text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-[#38bdf8]" />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span className="rounded-full bg-rose-500/20 px-1.5 py-0.5 text-[0.65rem] font-bold text-rose-300">
                        {item.badge}
                      </span>
                    )}
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
        <main className="flex-1 overflow-y-auto bg-[#07090e] p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};
