import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellRing,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  Volume2,
  VolumeX,
  Sparkles,
  Calendar,
  BookOpen,
  Play,
  AlarmClock,
  Check,
  RotateCcw,
} from 'lucide-react';
import { useStudy } from '../context/StudyContext';
import { getUserItem, setUserItem } from '../utils/userStorage';
import { getUserReminders, saveUserReminders } from '../firebase';

export interface StudyReminder {
  id: string;
  title: string;
  time: string; // HH:MM in 24-hour format, e.g. "19:00"
  subject: string;
  repeat: 'daily' | 'weekdays' | 'weekends' | 'once';
  durationMinutes: number;
  enabled: boolean;
  createdAt: number;
  lastTriggeredDate?: string; // YYYY-MM-DD
}

export const REMINDERS_STORAGE_KEY = 'studybot_reminders';
export const REMINDER_SOUND_KEY = 'studybot_reminder_sound';

/**
 * Plays a gentle, pleasant two-tone study chime using the browser's Web Audio API.
 */
export function playStudyChime(): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const playNote = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.22, startTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playNote(587.33, now, 0.35); // D5
    playNote(880.0, now + 0.18, 0.55); // A5
  } catch {
    // Ignore audio context restrictions if user hasn't interacted yet
  }
}

export function formatTime12Hour(time24: string): string {
  if (!time24 || !time24.includes(':')) return time24;
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return time24;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

export function getTimeUntilString(time24: string): string {
  if (!time24 || !time24.includes(':')) return '';
  const [hStr, mStr] = time24.split(':');
  const targetH = parseInt(hStr, 10);
  const targetM = parseInt(mStr, 10);
  if (isNaN(targetH) || isNaN(targetM)) return '';

  const now = new Date();
  const target = new Date();
  target.setHours(targetH, targetM, 0, 0);

  let diffMs = target.getTime() - now.getTime();
  if (diffMs < -60000) {
    // Scheduled for tomorrow
    target.setDate(target.getDate() + 1);
    diffMs = target.getTime() - now.getTime();
  } else if (diffMs >= -60000 && diffMs <= 0) {
    return 'Due right now!';
  }

  const totalMinutes = Math.ceil(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (hours === 0) return `In ${mins} min${mins === 1 ? '' : 's'}`;
  if (mins === 0) return `In ${hours} hr${hours === 1 ? '' : 's'}`;
  return `In ${hours}h ${mins}m`;
}

const SUBJECT_OPTIONS = [
  'Mathematics',
  'Science',
  'Physics',
  'Chemistry',
  'Biology',
  'English',
  'Social Science',
  'Mock Test',
  'General Study',
];

const REPEAT_LABELS: Record<StudyReminder['repeat'], string> = {
  daily: 'Every Day',
  weekdays: 'Mon – Fri',
  weekends: 'Weekends',
  once: 'Once Today',
};

const QUICK_PRESETS: Array<{
  title: string;
  time: string;
  subject: string;
  repeat: StudyReminder['repeat'];
  durationMinutes: number;
  badge: string;
}> = [
  {
    title: 'Morning Formula & Concept Revision',
    time: '07:00',
    subject: 'Mathematics',
    repeat: 'daily',
    durationMinutes: 30,
    badge: '🌅 Morning 7:00 AM',
  },
  {
    title: 'Afternoon NCERT Chapter Reading',
    time: '16:30',
    subject: 'Science',
    repeat: 'daily',
    durationMinutes: 45,
    badge: '📘 Afternoon 4:30 PM',
  },
  {
    title: 'Daily 1-Hour Regular Study Session',
    time: '19:00',
    subject: 'General Study',
    repeat: 'daily',
    durationMinutes: 60,
    badge: '🔥 Evening 7:00 PM',
  },
  {
    title: 'Night Flashcards & Mistake Book Review',
    time: '21:00',
    subject: 'Mock Test',
    repeat: 'daily',
    durationMinutes: 20,
    badge: '🌙 Night 9:00 PM',
  },
];

export const RemindersView: React.FC = () => {
  const { currentUser, addStudyMinutes } = useStudy();

  const [reminders, setReminders] = useState<StudyReminder[]>(() => {
    try {
      const saved = getUserItem(REMINDERS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Form states for adding a new custom reminder
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('18:00');
  const [subject, setSubject] = useState('Mathematics');
  const [repeat, setRepeat] = useState<StudyReminder['repeat']>('daily');
  const [durationMinutes, setDurationMinutes] = useState<number>(60);

  // Notification preferences
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = getUserItem(REMINDER_SOUND_KEY);
    return saved !== 'false';
  });

  const [browserPermission, setBrowserPermission] = useState<string>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });

  const [currentTimeStr, setCurrentTimeStr] = useState<string>(() => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });

  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedbackBanner(msg);
    setTimeout(() => {
      setFeedbackBanner((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  // Keep live clock updated
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Load reminders for the active Email ID from localStorage and Firestore
  useEffect(() => {
    let isMounted = true;
    const loadForUser = async () => {
      try {
        const localRaw = getUserItem(REMINDERS_STORAGE_KEY);
        const localList: StudyReminder[] = localRaw ? JSON.parse(localRaw) : [];
        if (isMounted) setReminders(localList);

        if (currentUser?.email) {
          const remoteList = await getUserReminders(currentUser.email);
          if (isMounted && Array.isArray(remoteList)) {
            if (remoteList.length > 0 || localList.length === 0) {
              setReminders(remoteList);
              setUserItem(REMINDERS_STORAGE_KEY, JSON.stringify(remoteList));
              window.dispatchEvent(new CustomEvent('studybot:reminders-updated'));
            }
          }
        }
      } catch {
        // Ignore load errors
      }
    };

    loadForUser();

    const handleClear = () => {
      if (isMounted) setReminders([]);
    };
    const handleSync = () => {
      try {
        const saved = getUserItem(REMINDERS_STORAGE_KEY);
        if (isMounted) setReminders(saved ? JSON.parse(saved) : []);
      } catch {}
    };

    window.addEventListener('studybot:data-cleared', handleClear);
    window.addEventListener('studybot:reminders-updated', handleSync);
    window.addEventListener('studybot:user-changed', loadForUser);
    return () => {
      isMounted = false;
      window.removeEventListener('studybot:data-cleared', handleClear);
      window.removeEventListener('studybot:reminders-updated', handleSync);
      window.removeEventListener('studybot:user-changed', loadForUser);
    };
  }, [currentUser?.email]);

  const persistReminders = (updated: StudyReminder[]) => {
    setReminders(updated);
    setUserItem(REMINDERS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('studybot:reminders-updated'));
    if (currentUser?.email) {
      saveUserReminders(currentUser.email, updated);
    }
  };

  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim() || `${subject} Study Session`;
    const newReminder: StudyReminder = {
      id: `rem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: cleanTitle,
      time: time || '18:00',
      subject,
      repeat,
      durationMinutes,
      enabled: true,
      createdAt: Date.now(),
    };

    const next = [newReminder, ...reminders].sort((a, b) => a.time.localeCompare(b.time));
    persistReminders(next);
    setTitle('');
    showFeedback(`Reminder set for ${formatTime12Hour(newReminder.time)} — "${cleanTitle}"`);
  };

  const handleAddPreset = (preset: (typeof QUICK_PRESETS)[number]) => {
    const exists = reminders.some(
      (r) => r.title.toLowerCase() === preset.title.toLowerCase() && r.time === preset.time
    );
    if (exists) {
      showFeedback(`"${preset.title}" is already in your reminders list!`);
      return;
    }
    const newReminder: StudyReminder = {
      id: `rem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: preset.title,
      time: preset.time,
      subject: preset.subject,
      repeat: preset.repeat,
      durationMinutes: preset.durationMinutes,
      enabled: true,
      createdAt: Date.now(),
    };
    const next = [...reminders, newReminder].sort((a, b) => a.time.localeCompare(b.time));
    persistReminders(next);
    showFeedback(`Added "${preset.title}" at ${formatTime12Hour(preset.time)}`);
  };

  const handleAddOneMinuteTestReminder = () => {
    const oneMinLater = new Date(Date.now() + 60 * 1000);
    const hh = String(oneMinLater.getHours()).padStart(2, '0');
    const mm = String(oneMinLater.getMinutes()).padStart(2, '0');
    const timeStr = `${hh}:${mm}`;

    const newReminder: StudyReminder = {
      id: `rem-${Date.now()}`,
      title: 'Quick Study Check-In (1-Min Timer)',
      time: timeStr,
      subject: 'General Study',
      repeat: 'once',
      durationMinutes: 30,
      enabled: true,
      createdAt: Date.now(),
    };
    const next = [newReminder, ...reminders].sort((a, b) => a.time.localeCompare(b.time));
    persistReminders(next);
    showFeedback(`Scheduled a live reminder for ${formatTime12Hour(timeStr)} (in ~1 minute)!`);
  };

  const handleToggleReminder = (id: string) => {
    const next = reminders.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r));
    persistReminders(next);
  };

  const handleDeleteReminder = (id: string) => {
    const next = reminders.filter((r) => r.id !== id);
    persistReminders(next);
    showFeedback('Reminder removed.');
  };

  const handleTriggerNotificationNow = (reminder?: StudyReminder) => {
    const sample: StudyReminder = reminder || {
      id: `test-${Date.now()}`,
      title: title.trim() || 'Time for Your Daily Study Session!',
      time: new Date().toTimeString().slice(0, 5),
      subject: subject || 'Mathematics',
      repeat: 'daily',
      durationMinutes: durationMinutes || 60,
      enabled: true,
      createdAt: Date.now(),
    };

    window.dispatchEvent(
      new CustomEvent('studybot:trigger-reminder', {
        detail: sample,
      })
    );
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setUserItem(REMINDER_SOUND_KEY, String(next));
    if (next) {
      playStudyChime();
    }
  };

  const handleRequestBrowserPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const result = await Notification.requestPermission();
      setBrowserPermission(result);
      if (result === 'granted') {
        showFeedback('Browser study notifications enabled!');
      }
    } catch {
      // Ignore permission errors in restricted iframes
    }
  };

  const activeCount = reminders.filter((r) => r.enabled).length;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      {/* Top Header Card */}
      <div className="rounded-2xl border border-white/10 bg-[#0d1326] p-5 md:p-6 shadow-lg">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400">
                <BellRing className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
                  Study Reminders
                </h1>
                <p className="text-xs md:text-sm text-slate-400">
                  Get notified on time to study regularly and build your daily study habit.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Live Clock Pill */}
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#131b34] px-3.5 py-2 text-xs font-semibold text-slate-200 font-mono tabular-nums">
              <Clock className="h-4 w-4 text-sky-400" />
              <span>Now: {currentTimeStr}</span>
            </div>

            {/* Sound Toggle */}
            <button
              type="button"
              onClick={handleToggleSound}
              className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all ${
                soundEnabled
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                  : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
              }`}
              title="Toggle notification chime sound"
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="h-4 w-4 text-emerald-400" />
                  <span>Sound ON</span>
                </>
              ) : (
                <>
                  <VolumeX className="h-4 w-4 text-slate-400" />
                  <span>Sound Muted</span>
                </>
              )}
            </button>

            {/* Instant Test Notification Button */}
            <button
              type="button"
              onClick={() => handleTriggerNotificationNow()}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all cursor-pointer"
            >
              <Bell className="h-4 w-4" />
              <span>Test Notification</span>
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-semibold text-slate-200">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              {activeCount} Active Reminder{activeCount === 1 ? '' : 's'}
            </span>
            <span>•</span>
            <span>
              Saved for <strong className="text-sky-300">{currentUser?.email || 'your account'}</strong>
            </span>
          </div>

          {browserPermission !== 'unsupported' && browserPermission !== 'granted' && (
            <button
              type="button"
              onClick={handleRequestBrowserPermission}
              className="text-xs font-semibold text-sky-400 hover:text-sky-300 underline underline-offset-2"
            >
              Enable Browser Desktop Alerts
            </button>
          )}
        </div>
      </div>

      {/* Feedback Toast Banner */}
      {feedbackBanner && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-3 text-xs font-bold text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{feedbackBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="text-emerald-300 hover:text-white text-xs font-bold"
          >
            OK
          </button>
        </div>
      )}

      {/* Main 2-Column Layout: Left = Add Custom Reminder, Right = Quick Presets + Active Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Add Custom Reminder Form */}
        <div className="lg:col-span-5 space-y-5">
          <div className="rounded-2xl border border-white/10 bg-[#0d1326] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-sky-400" />
                <h2 className="text-base font-bold text-white">Add Custom Reminder</h2>
              </div>
              <span className="text-[0.68rem] text-slate-400 font-medium">Simple & Fast</span>
            </div>

            <form onSubmit={handleAddReminder} className="space-y-4">
              {/* Reminder Title */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  What do you want to study?
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Revise Chapter 4 Quadratic Equations"
                  className="w-full rounded-xl border border-white/15 bg-[#131b34] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Time & Subject Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Reminder Time
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                    className="w-full rounded-xl border border-white/15 bg-[#131b34] px-3.5 py-2.5 text-sm font-mono tabular-nums text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Subject
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-[#131b34] px-3 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                  >
                    {SUBJECT_OPTIONS.map((subj) => (
                      <option key={subj} value={subj} className="bg-[#0d1326] text-white">
                        {subj}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Repeat Schedule */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Repeat Schedule
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['daily', 'weekdays', 'weekends', 'once'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setRepeat(opt)}
                      className={`rounded-xl border py-2 px-3 text-xs font-bold transition-all ${
                        repeat === opt
                          ? 'border-blue-500 bg-blue-600/25 text-white'
                          : 'border-white/10 bg-[#131b34] text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {REPEAT_LABELS[opt]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Study Duration Goal */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Study Duration Goal
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[15, 30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDurationMinutes(mins)}
                      className={`rounded-xl border py-2 text-xs font-bold font-mono tabular-nums transition-all ${
                        durationMinutes === mins
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                          : 'border-white/10 bg-[#131b34] text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {mins} min
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 py-3 px-4 text-sm font-bold text-white shadow-md transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Add Study Reminder</span>
              </button>
            </form>
          </div>

          {/* Quick 1-Click Presets */}
          <div className="rounded-2xl border border-white/10 bg-[#0d1326] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <span>Quick 1-Click Study Reminders</span>
              </h3>
              <button
                type="button"
                onClick={handleAddOneMinuteTestReminder}
                className="text-[0.7rem] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1"
                title="Add a reminder for 1 minute from now to test live notifications"
              >
                <AlarmClock className="h-3.5 w-3.5" />
                <span>+ Remind in 1 Min</span>
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Tap any preset below to add it directly to your schedule:
            </p>
            <div className="space-y-2 pt-1">
              {QUICK_PRESETS.map((preset) => (
                <button
                  key={preset.title}
                  type="button"
                  onClick={() => handleAddPreset(preset)}
                  className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-[#131b34] hover:border-blue-500/50 hover:bg-[#172242] p-3 text-left transition-all group"
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-bold text-white group-hover:text-sky-300 truncate">
                      {preset.title}
                    </div>
                    <div className="text-[0.68rem] text-slate-400 mt-0.5 flex items-center gap-2">
                      <span className="font-mono text-sky-400 font-semibold">{preset.badge}</span>
                      <span>•</span>
                      <span>{preset.durationMinutes} min</span>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-lg bg-blue-600/20 border border-blue-500/30 px-2.5 py-1 text-[0.68rem] font-bold text-blue-300 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    + Add
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: User's Scheduled Reminders List */}
        <div className="lg:col-span-7 space-y-5">
          <div className="rounded-2xl border border-white/10 bg-[#0d1326] p-5 min-h-[420px] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-emerald-400" />
                <h2 className="text-base font-bold text-white">Your Study Reminders</h2>
              </div>
              <span className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-xs font-bold text-slate-300 font-mono tabular-nums">
                {reminders.length} Total
              </span>
            </div>

            {reminders.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-3">
                  <Bell className="h-7 w-7" />
                </div>
                <h3 className="text-base font-bold text-white">No Study Reminders Yet</h3>
                <p className="text-xs text-slate-400 max-w-sm mt-1 leading-relaxed">
                  Add your own study time on the left, or click a quick preset to get reminded when it is time to study.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleAddPreset(QUICK_PRESETS[2])}
                    className="rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-bold text-white transition-all cursor-pointer"
                  >
                    + Add Evening 7:00 PM Reminder
                  </button>
                  <button
                    type="button"
                    onClick={handleAddOneMinuteTestReminder}
                    className="rounded-xl border border-white/15 bg-[#131b34] hover:bg-white/10 px-4 py-2 text-xs font-bold text-slate-200 transition-all cursor-pointer"
                  >
                    + Remind Me in 1 Minute
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {reminders.map((rem) => {
                  const countdown = rem.enabled ? getTimeUntilString(rem.time) : 'Paused';
                  return (
                    <div
                      key={rem.id}
                      className={`rounded-xl border p-4 transition-all ${
                        rem.enabled
                          ? 'border-white/15 bg-[#131b34]'
                          : 'border-white/5 bg-[#0a0f1f] opacity-60'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Left: Time + Title + Details */}
                        <div className="flex items-start sm:items-center gap-3.5">
                          {/* Time Box */}
                          <div
                            className={`flex flex-col items-center justify-center rounded-xl border px-3 py-2 min-w-[92px] font-mono tabular-nums ${
                              rem.enabled
                                ? 'border-blue-500/40 bg-blue-600/15 text-sky-300'
                                : 'border-white/10 bg-white/5 text-slate-400'
                            }`}
                          >
                            <span className="text-sm font-extrabold">
                              {formatTime12Hour(rem.time)}
                            </span>
                            <span className="text-[0.65rem] text-emerald-400 font-semibold mt-0.5">
                              {countdown}
                            </span>
                          </div>

                          {/* Title & Metadata */}
                          <div className="space-y-1">
                            <div className="text-sm font-bold text-white">{rem.title}</div>
                            <div className="flex flex-wrap items-center gap-2 text-[0.7rem] text-slate-400">
                              <span className="rounded-md bg-white/5 border border-white/10 px-2 py-0.5 text-slate-200 font-semibold">
                                {rem.subject}
                              </span>
                              <span>•</span>
                              <span>{REPEAT_LABELS[rem.repeat]}</span>
                              <span>•</span>
                              <span className="font-mono tabular-nums">
                                {rem.durationMinutes} min goal
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Actions (Notify Test, Start Study, Toggle ON/OFF, Delete) */}
                        <div className="flex items-center justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                          <button
                            type="button"
                            onClick={() => handleTriggerNotificationNow(rem)}
                            className="rounded-lg border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 px-2.5 py-1.5 text-[0.7rem] font-bold text-sky-300 transition-all"
                            title="Preview this notification now"
                          >
                            Alert
                          </button>

                          {/* ON/OFF Switch */}
                          <button
                            type="button"
                            onClick={() => handleToggleReminder(rem.id)}
                            className={`rounded-lg px-3 py-1.5 text-[0.7rem] font-bold transition-all ${
                              rem.enabled
                                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                                : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'
                            }`}
                          >
                            {rem.enabled ? 'ON' : 'OFF'}
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDeleteReminder(rem.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                            title="Delete reminder"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Helpful Footer Strip for 1-Hour Regular Study Badge */}
            <div className="mt-auto pt-5">
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <span>🏆 Badge Tip: 7-Day 1-Hour Study Streak</span>
                  </div>
                  <p className="text-[0.72rem] text-slate-300">
                    Studying 60 minutes daily for 7 days unlocks the <strong className="text-white">Regular Scholar</strong> badge in Achievements!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    addStudyMinutes(60);
                    showFeedback('Logged 60 mins of study for today! Check Achievements tab.');
                  }}
                  className="shrink-0 flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-3.5 py-2 text-xs font-extrabold text-slate-950 transition-all cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Complete 1-Hr Study Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
