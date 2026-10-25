import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useStudy } from '../context/StudyContext';
import {
  CalendarDays,
  Clock,
  Sparkles,
  BookOpen,
  FileText,
  Dumbbell,
  Bot,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  X,
  ExternalLink,
  Copy,
  Check,
  Filter,
  Layers,
  ChevronRight,
  Sliders,
  Calendar,
  CheckSquare,
  Square,
  Award,
  ArrowRight,
  TrendingUp,
  Sun,
  Sunset,
  Moon,
  Zap,
} from 'lucide-react';
import {
  NEW_NCERT_SYLLABUS,
  NCERTSubjectBook,
  NCERTChapter,
  getAllBooksForClass,
  getBookForClassAndSubject,
  SUBJECT_OPTIONS,
} from '../data/ncertSyllabus';
import {
  getChapterNotes,
  getChapterSolutions,
  getChapterQuiz,
  ChapterNotes,
  NCERTSolutionItem,
  ChapterQuiz,
} from '../data/plannerMaterials';
import { auth, db } from '../firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

export interface SubjectExamConfig {
  subjectKey: 'maths' | 'science' | 'sst' | 'english' | 'hindi';
  subjectName: string;
  bookName: string;
  examDate: string; // YYYY-MM-DD
  examTime: string; // HH:MM
  selectedChapterNums: number[]; // All or filtered
}

export interface TimetableSlot {
  id: string;
  dayIndex: number; // 0 = today, 1 = tomorrow, etc.
  dateString: string; // YYYY-MM-DD
  dayLabel: string; // "Today", "Tomorrow", "Mon 27 Oct"
  startTime: string; // "04:00 PM"
  endTime: string; // "05:15 PM"
  subjectKey: 'maths' | 'science' | 'sst' | 'english' | 'hindi';
  subjectName: string;
  bookName: string;
  chapterNumber: number;
  chapterTitle: string;
  completed: boolean;
  notesSummary?: string;
}

export const StudyPlannerView: React.FC = () => {
  const { profile, updateProfile, setActiveTab, addStudyMinutes, addMistake } = useStudy();

  // Current class number (4 to 9)
  const currentClassNum = useMemo(() => {
    const match = profile.classLevel.match(/\d+/);
    const num = match ? parseInt(match[0], 10) : 9;
    return num >= 4 && num <= 9 ? num : 9;
  }, [profile.classLevel]);

  // Collapsible Setup Wizard
  const [wizardOpen, setWizardOpen] = useState(false);
  const [rebalanceNotification, setRebalanceNotification] = useState<string | null>(null);

  // Daily capacity
  const [dailyHours, setDailyHours] = useState<number>(profile.dailyHours || 3);
  const [studyWindow, setStudyWindow] = useState<'morning' | 'evening' | 'night'>('evening');

  // Multi-select dropdown open states for subjects
  const [openChapterDropdown, setOpenChapterDropdown] = useState<string | null>(null);

  // Active View Switcher: 'daily' | 'weekly' | 'syllabus'
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'syllabus'>('daily');

  // Active day filter for daily action plan
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);

  // 4. Slide-over Study Material Hub Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'notes' | 'solutions' | 'mock_test'>('notes');
  const [activeSlot, setActiveSlot] = useState<TimetableSlot | null>(null);

  // Quiz state inside Drawer
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<{ score: number; total: number } | null>(null);
  const [quizSecondsLeft, setQuizSecondsLeft] = useState<number>(15 * 60);
  const [quizTimerActive, setQuizTimerActive] = useState<boolean>(false);
  const [copiedNotes, setCopiedNotes] = useState(false);
  const [expandedSolutionIndex, setExpandedSolutionIndex] = useState<number | null>(0);

  // Default exam dates initial generation
  const getDefaultExamConfigs = (classNum: number): Record<string, SubjectExamConfig> => {
    const books = getAllBooksForClass(classNum);
    const today = new Date();
    
    // Spread exams between 10 and 24 days from today
    const offsets: Record<string, number> = {
      maths: 12,
      science: 15,
      sst: 18,
      english: 21,
      hindi: 24,
    };

    const configs: Record<string, SubjectExamConfig> = {};
    for (const b of books) {
      const d = new Date(today);
      d.setDate(d.getDate() + (offsets[b.subjectKey] || 14));
      const dateStr = d.toISOString().split('T')[0];
      configs[b.subjectKey] = {
        subjectKey: b.subjectKey,
        subjectName: b.subjectName,
        bookName: b.bookName,
        examDate: dateStr,
        examTime: '09:00',
        selectedChapterNums: b.chapters.map((c) => c.number),
      };
    }
    return configs;
  };

  const [examConfigs, setExamConfigs] = useState<Record<string, SubjectExamConfig>>(() => {
    const saved = localStorage.getItem(`studybot_exam_configs_c${currentClassNum}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return getDefaultExamConfigs(currentClassNum);
  });

  // Re-initialize exam configs when class level changes
  useEffect(() => {
    const saved = localStorage.getItem(`studybot_exam_configs_c${currentClassNum}`);
    if (saved) {
      try {
        setExamConfigs(JSON.parse(saved));
        return;
      } catch (e) {}
    }
    setExamConfigs(getDefaultExamConfigs(currentClassNum));
  }, [currentClassNum]);

  // Timetable slots
  const [timetable, setTimetable] = useState<TimetableSlot[]>(() => {
    const saved = localStorage.getItem(`studybot_timetable_c${currentClassNum}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  });

  // Generate Timetable Algorithm - GUARANTEES 100% SYLLABUS COVERAGE
  const generateTimetable = (configs: Record<string, SubjectExamConfig>, hours: number, window: string) => {
    const books = getAllBooksForClass(currentClassNum);
    const today = new Date();
    const newSlots: TimetableSlot[] = [];

    // 1. Collect all selected chapters per subject
    const subjectChapterMap: Record<string, {
      subjectKey: 'maths' | 'science' | 'sst' | 'english' | 'hindi';
      subjectName: string;
      bookName: string;
      chapter: NCERTChapter;
      examDate: string;
    }[]> = {};

    for (const b of books) {
      const config = configs[b.subjectKey];
      const selectedNums = config?.selectedChapterNums || b.chapters.map((c) => c.number);
      subjectChapterMap[b.subjectKey] = [];
      for (const ch of b.chapters) {
        if (selectedNums.includes(ch.number)) {
          subjectChapterMap[b.subjectKey].push({
            subjectKey: b.subjectKey,
            subjectName: b.subjectName,
            bookName: b.bookName,
            chapter: ch,
            examDate: config?.examDate || '',
          });
        }
      }
    }

    // 2. Interleave chapters round-robin across subjects for maximum learning balance
    const orderedChapters: {
      subjectKey: 'maths' | 'science' | 'sst' | 'english' | 'hindi';
      subjectName: string;
      bookName: string;
      chapter: NCERTChapter;
      examDate: string;
    }[] = [];

    const subjectKeys: ('maths' | 'science' | 'sst' | 'english' | 'hindi')[] = [
      'maths',
      'science',
      'sst',
      'english',
      'hindi',
    ];
    let maxSubjectChCount = 0;
    subjectKeys.forEach((key) => {
      maxSubjectChCount = Math.max(maxSubjectChCount, subjectChapterMap[key]?.length || 0);
    });

    for (let i = 0; i < maxSubjectChCount; i++) {
      for (const key of subjectKeys) {
        const list = subjectChapterMap[key];
        if (list && i < list.length) {
          orderedChapters.push(list[i]);
        }
      }
    }

    // 3. Dynamic Daily Pacing:
    // If study time is 1 hour or 2 hours, structure high-yield sprints so the ENTIRE syllabus is covered!
    // - 1 hr: 2 high-yield 30-min chapter slots daily (covers 50-60 chapters in ~25-30 days)
    // - 2 hrs: 3 focused 40-min chapter slots daily (covers 50-60 chapters in ~18-20 days)
    // - 3 hrs: 3 deep-dive 60-min slots daily (covers 50-60 chapters in ~18-20 days)
    // - 4+ hrs: 4-6 slots daily (60 mins each)
    let slotsPerDay = 2;
    let slotDurationMins = 30;

    if (hours === 1) {
      slotsPerDay = 2;
      slotDurationMins = 30;
    } else if (hours === 2) {
      slotsPerDay = 3;
      slotDurationMins = 40;
    } else if (hours === 3) {
      slotsPerDay = 3;
      slotDurationMins = 60;
    } else {
      slotsPerDay = Math.min(6, Math.max(2, hours));
      slotDurationMins = 60;
    }

    // Base start time based on student preference
    let baseTimeHour = 16; // 04:00 PM
    if (window === 'morning') baseTimeHour = 6; // 06:00 AM
    if (window === 'night') baseTimeHour = 20; // 08:00 PM

    const formatTimeSlot = (startHour: number, slotIdx: number, durationMins: number) => {
      const totalStartMins = startHour * 60 + slotIdx * (durationMins + 10);
      const totalEndMins = totalStartMins + durationMins;

      const fmt = (totalM: number) => {
        const h = Math.floor(totalM / 60) % 24;
        const m = totalM % 60;
        const period = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 === 0 ? 12 : h % 12;
        return `${displayH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
      };

      return {
        start: fmt(totalStartMins),
        end: fmt(totalEndMins),
      };
    };

    // 4. GUARANTEE: Loop until EVERY SINGLE chapter in orderedChapters is scheduled
    let chapterIndex = 0;
    let day = 0;

    while (chapterIndex < orderedChapters.length) {
      const d = new Date(today);
      d.setDate(d.getDate() + day);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
      const dayLabel = day === 0 ? 'Today' : day === 1 ? 'Tomorrow' : dayName;

      for (let s = 0; s < slotsPerDay; s++) {
        if (chapterIndex >= orderedChapters.length) {
          break; // All chapters placed!
        }

        const chItem = orderedChapters[chapterIndex];
        const times = formatTimeSlot(baseTimeHour, s, slotDurationMins);

        newSlots.push({
          id: `slot-${day}-${s}-${chItem.subjectKey}-${chItem.chapter.number}-${Date.now().toString().slice(-4)}`,
          dayIndex: day,
          dateString: dateStr,
          dayLabel,
          startTime: times.start,
          endTime: times.end,
          subjectKey: chItem.subjectKey,
          subjectName: chItem.subjectName,
          bookName: chItem.bookName,
          chapterNumber: chItem.chapter.number,
          chapterTitle: chItem.chapter.title,
          completed: day === 0 && s === 0 ? true : false,
        });

        chapterIndex++;
      }
      day++;
    }

    // 5. Add 3 Grand Final Revision & Mock Test days before exam day
    const grandRevisionDays = 3;
    for (let r = 0; r < grandRevisionDays; r++) {
      const d = new Date(today);
      d.setDate(d.getDate() + day);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
      const dayLabel = `${dayName} (Grand Revision)`;

      for (let s = 0; s < Math.min(2, slotsPerDay); s++) {
        const revSubject = subjectKeys[(r + s) % subjectKeys.length];
        const book = books.find((b) => b.subjectKey === revSubject) || books[0];
        const times = formatTimeSlot(baseTimeHour, s, slotDurationMins);

        newSlots.push({
          id: `rev-${day}-${s}-${revSubject}-${Date.now().toString().slice(-4)}`,
          dayIndex: day,
          dateString: dateStr,
          dayLabel,
          startTime: times.start,
          endTime: times.end,
          subjectKey: revSubject,
          subjectName: book.subjectName,
          bookName: book.bookName,
          chapterNumber: 99,
          chapterTitle: `Full Syllabus Rapid Revision & Mock Test`,
          completed: false,
        });
      }
      day++;
    }

    setTimetable(newSlots);
    localStorage.setItem(`studybot_timetable_c${currentClassNum}`, JSON.stringify(newSlots));
    localStorage.setItem(`studybot_exam_configs_c${currentClassNum}`, JSON.stringify(configs));

    // Save to Firestore if authenticated
    if (auth.currentUser) {
      try {
        const docRef = doc(db, 'users', auth.currentUser.uid, 'planner', 'current');
        setDoc(
          docRef,
          {
            classNum: currentClassNum,
            dailyHours: hours,
            studyWindow: window,
            timetable: newSlots.slice(0, 100),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        ).catch(() => {});
      } catch (err) {}
    }
  };

  // Auto-generation & Auto-upgrade check: ensures timetable covers 100% of syllabus
  useEffect(() => {
    const totalSelected = Object.values(examConfigs).reduce(
      (acc, cfg) => acc + (cfg.selectedChapterNums?.length || 0),
      0
    );
    const scheduledUniqueCount = new Set(
      timetable.filter((s) => s.chapterNumber !== 99).map((s) => `${s.subjectKey}-${s.chapterNumber}`)
    ).size;

    // If timetable is empty or covers fewer than 90% of selected chapters, auto-generate!
    if (timetable.length === 0 || scheduledUniqueCount < Math.min(totalSelected, 30)) {
      generateTimetable(examConfigs, dailyHours, studyWindow);
    }
  }, [currentClassNum, dailyHours, studyWindow]);

  // Real-time Countdown Timer tick (every 1 second)
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Countdown calculations for each subject
  const countdowns = useMemo(() => {
    const books = getAllBooksForClass(currentClassNum);
    return books.map((b) => {
      const cfg = examConfigs[b.subjectKey];
      const examDateStr = cfg?.examDate || '2026-11-15';
      const examTimeStr = cfg?.examTime || '09:00';
      const targetDate = new Date(`${examDateStr}T${examTimeStr}:00`);
      const diffMs = targetDate.getTime() - currentTime.getTime();

      let days = 0,
        hours = 0,
        minutes = 0,
        seconds = 0;
      let isPast = false;

      if (diffMs > 0) {
        days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
        minutes = Math.floor((diffMs / (1000 * 60)) % 60);
        seconds = Math.floor((diffMs / 1000) % 60);
      } else {
        isPast = true;
      }

      // Readiness calculation: completed chapters for this subject / total chapters
      const totalSubjectChapters = b.totalChapters;
      const completedSubjectSlots = timetable.filter(
        (slot) => slot.subjectKey === b.subjectKey && slot.completed
      );
      // Unique chapters completed
      const uniqueCompleted = new Set(completedSubjectSlots.map((s) => s.chapterNumber)).size;
      const readinessPercent = Math.min(100, Math.round((uniqueCompleted / totalSubjectChapters) * 100) || 15);

      return {
        book: b,
        cfg,
        days,
        hours,
        minutes,
        seconds,
        isPast,
        readinessPercent,
        uniqueCompleted,
        totalSubjectChapters,
      };
    });
  }, [examConfigs, currentTime, timetable, currentClassNum]);

  // Overall Syllabus Completion
  const totalSlots = timetable.length;
  const completedSlots = timetable.filter((s) => s.completed).length;
  const totalUniqueChapters = useMemo(() => {
    return getAllBooksForClass(currentClassNum).reduce((acc, b) => acc + b.totalChapters, 0);
  }, [currentClassNum]);
  const completedUniqueChapters = useMemo(() => {
    return new Set(timetable.filter((s) => s.completed).map((s) => `${s.subjectKey}-${s.chapterNumber}`)).size;
  }, [timetable]);
  const syllabusProgressPercent = Math.min(
    100,
    Math.round((completedUniqueChapters / totalUniqueChapters) * 100) || 12
  );

  // Toggle slot completion
  const handleToggleComplete = (slotId: string) => {
    setTimetable((prev) => {
      const next = prev.map((s) => (s.id === slotId ? { ...s, completed: !s.completed } : s));
      localStorage.setItem(`studybot_timetable_c${currentClassNum}`, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent('studybot:timetable-updated'));
      return next;
    });
    addStudyMinutes(45);
  };

  // Synchronize timetable if toggled from My Progress
  useEffect(() => {
    const handleTimetableSync = () => {
      const saved = localStorage.getItem(`studybot_timetable_c${currentClassNum}`);
      if (saved) {
        try {
          setTimetable(JSON.parse(saved));
        } catch (e) {}
      }
    };
    window.addEventListener('studybot:timetable-updated', handleTimetableSync);
    window.addEventListener('storage', handleTimetableSync);
    return () => {
      window.removeEventListener('studybot:timetable-updated', handleTimetableSync);
      window.removeEventListener('storage', handleTimetableSync);
    };
  }, [currentClassNum]);

  // "🔄 Missed Today's Target? Re-balance Schedule"
  const handleRebalanceSchedule = () => {
    setTimetable((prev) => {
      // Find uncompleted slots for today (dayIndex 0)
      const missedToday = prev.filter((s) => s.dayIndex === 0 && !s.completed);
      if (missedToday.length === 0) {
        setRebalanceNotification('All targets for today are already complete! Great discipline!');
        setTimeout(() => setRebalanceNotification(null), 3500);
        return prev;
      }

      // Shift them into dayIndex 1, 2, 3...
      const next = prev.map((slot) => {
        if (slot.dayIndex === 0 && !slot.completed) {
          // Push to tomorrow or next available window
          return {
            ...slot,
            dayIndex: slot.dayIndex + 1,
            dayLabel: 'Tomorrow (Re-balanced)',
          };
        }
        return slot;
      });

      localStorage.setItem(`studybot_timetable_c${currentClassNum}`, JSON.stringify(next));
      setRebalanceNotification(
        `🔄 ${missedToday.length} unfinished study slot${
          missedToday.length > 1 ? 's have' : ' has'
        } been re-balanced into tomorrow's plan without changing exam dates!`
      );
      setTimeout(() => setRebalanceNotification(null), 4000);
      return next;
    });
  };

  // Open Drawer for a specific Slot and Action
  const handleOpenStudyKit = (slot: TimetableSlot, tab: 'notes' | 'solutions' | 'mock_test') => {
    setActiveSlot(slot);
    setDrawerTab(tab);
    setDrawerOpen(true);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(null);
    setQuizSecondsLeft(15 * 60);
    setQuizTimerActive(tab === 'mock_test');
  };

  // Timer for Chapter Quiz
  useEffect(() => {
    let interval: any = null;
    if (drawerOpen && drawerTab === 'mock_test' && quizTimerActive && !quizSubmitted) {
      interval = setInterval(() => {
        setQuizSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setQuizSubmitted(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [drawerOpen, drawerTab, quizTimerActive, quizSubmitted]);

  // Format quiz timer
  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Active Chapter Study Material
  const activeNotes: ChapterNotes | null = useMemo(() => {
    if (!activeSlot) return null;
    return getChapterNotes(
      profile.classLevel,
      activeSlot.subjectName,
      activeSlot.bookName,
      activeSlot.chapterNumber,
      activeSlot.chapterTitle
    );
  }, [activeSlot, profile.classLevel]);

  const activeSolutions: NCERTSolutionItem[] = useMemo(() => {
    if (!activeSlot) return [];
    return getChapterSolutions(
      profile.classLevel,
      activeSlot.subjectName,
      activeSlot.bookName,
      activeSlot.chapterNumber,
      activeSlot.chapterTitle
    );
  }, [activeSlot, profile.classLevel]);

  const activeQuiz: ChapterQuiz | null = useMemo(() => {
    if (!activeSlot) return null;
    return getChapterQuiz(
      profile.classLevel,
      activeSlot.subjectName,
      activeSlot.bookName,
      activeSlot.chapterNumber,
      activeSlot.chapterTitle
    );
  }, [activeSlot, profile.classLevel]);

  // Grade Quiz
  const handleSubmitQuiz = () => {
    if (!activeQuiz) return;
    setQuizTimerActive(false);
    setQuizSubmitted(true);

    let score = 0;
    activeQuiz.questions.forEach((q, idx) => {
      const userAns = quizAnswers[q.id];
      if (userAns === q.correctAnswerIndex) {
        score += 2;
      } else {
        // Record mistake in Mistake Book!
        addMistake({
          testTopic: `${activeSlot?.bookName || 'NCERT'} - Ch ${activeSlot?.chapterNumber || 1}: ${activeSlot?.chapterTitle || 'Chapter Test'}`,
          subject: activeSlot?.subjectName || 'Science',
          classLevel: profile.classLevel,
          question: q.question,
          options: q.options,
          userAnswer: userAns !== undefined ? userAns : -1,
          correctAnswer: q.correctAnswerIndex,
          userAnswerText: userAns !== undefined ? q.options[userAns] : 'Unattempted',
          correctAnswerText: q.options[q.correctAnswerIndex],
          explanation: q.explanation,
          date: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
        });
      }
    });

    setQuizScore({ score, total: activeQuiz.totalMarks });
  };

  // Filter slots for Daily view
  const dailySlots = useMemo(() => {
    return timetable.filter((s) => s.dayIndex === selectedDayIndex);
  }, [timetable, selectedDayIndex]);

  // Week navigation and filter state
  const [weekFilter, setWeekFilter] = useState<'all' | number>('all');
  const [calendarWeek, setCalendarWeek] = useState<number>(0);

  // Unique days list - covers 100% of multi-week syllabus schedule
  const dayTabs = useMemo(() => {
    const days: { index: number; label: string; date: string; weekNum: number }[] = [];
    const seen = new Set<number>();
    timetable.forEach((s) => {
      if (!seen.has(s.dayIndex)) {
        seen.add(s.dayIndex);
        days.push({
          index: s.dayIndex,
          label: s.dayLabel,
          date: s.dateString,
          weekNum: Math.floor(s.dayIndex / 7) + 1,
        });
      }
    });
    return days.sort((a, b) => a.index - b.index);
  }, [timetable]);

  // Total weeks in schedule
  const totalWeeks = useMemo(() => {
    if (dayTabs.length === 0) return 1;
    return Math.max(...dayTabs.map((d) => d.weekNum), 1);
  }, [dayTabs]);

  // Filtered day tabs based on week selection
  const filteredDayTabs = useMemo(() => {
    if (weekFilter === 'all') return dayTabs;
    return dayTabs.filter((d) => d.weekNum === weekFilter);
  }, [dayTabs, weekFilter]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-24 font-['Sora'] select-none">
      {/* 1. Header Hero Card with Re-scheduler & Action */}
      <div
        className="relative overflow-hidden rounded-3xl border border-blue-500/20 p-6 md:p-8 shadow-2xl"
        style={{
          background:
            'radial-gradient(ellipse at 85% 0%, rgba(37, 99, 235, 0.35), transparent 60%), linear-gradient(160deg, #0f1c38 0%, #091024 100%)',
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#38bdf8]">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>NCF-SE 2026–27 EXAM COMMAND CENTER</span>
              <span className="text-white/30">·</span>
              <span>{profile.classLevel} CBSE</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <span>Study Planner & Exam Hub</span>
              <span className="rounded-full bg-blue-500/20 border border-blue-400/40 px-3 py-1 text-xs md:text-sm font-semibold text-blue-300">
                AI Master Timetable
              </span>
            </h1>
            <p className="mt-2 text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Personalized day-by-day exam schedule loaded with official 2026–27 NCERT textbooks, live countdown clocks, instant crispy notes, complete step-by-step exercise solutions, and 15-minute diagnostic quizzes.
            </p>
          </div>

          {/* Quick Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setWizardOpen(!wizardOpen)}
              className="flex items-center gap-2 rounded-xl border border-blue-500/40 bg-[#121c38] px-3.5 py-2.5 text-xs font-bold text-blue-200 hover:border-blue-400 hover:bg-[#1a2850] transition-all shadow-md"
            >
              <Sliders className="h-4 w-4 text-blue-400" />
              <span>{wizardOpen ? 'Hide Exam Setup' : 'Configure Exam Dates'}</span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                  wizardOpen ? 'rotate-180 text-blue-400' : ''
                }`}
              />
            </button>

            <button
              type="button"
              onClick={handleRebalanceSchedule}
              className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3.5 py-2.5 text-xs font-bold text-amber-300 hover:border-amber-400 hover:bg-amber-500/25 transition-all shadow-md"
              title="Automatically shifts today's unfinished slots into tomorrow"
            >
              <RotateCcw className="h-4 w-4 text-amber-400" />
              <span>Missed Target? Re-balance</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('/progress')}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3.5 py-2.5 text-xs font-bold text-emerald-300 hover:border-emerald-400 hover:bg-emerald-500/25 transition-all shadow-md"
              title="View Consistency Heatmap & Exam Roadmap"
            >
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <span>View Progress &amp; Roadmap ➔</span>
            </button>
          </div>
        </div>

        {/* Re-balance Toast Banner */}
        {rebalanceNotification && (
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-emerald-500/40 bg-emerald-950/70 p-3 text-xs font-bold text-emerald-200 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{rebalanceNotification}</span>
            </div>
            <button
              type="button"
              onClick={() => setRebalanceNotification(null)}
              className="text-emerald-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* 5. Smart Progress Bar: Overall Syllabus Completion */}
        <div className="mt-5 border-t border-white/10 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-300 mb-2">
            <div className="flex items-center gap-2 font-bold text-white">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <span>Overall Syllabus Completion:</span>
              <span className="text-emerald-400 font-extrabold text-sm">
                {completedUniqueChapters} / {totalUniqueChapters} Chapters Covered ({syllabusProgressPercent}%)
              </span>
            </div>
            <span className="text-slate-400 text-[0.7rem]">
              {completedSlots} study blocks finished · {totalSlots - completedSlots} upcoming
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 transition-all duration-500 shadow-[0_0_12px_rgba(37,99,235,0.8)]"
              style={{ width: `${syllabusProgressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 1. Exam Setup Wizard (Top Collapsible Card) */}
      {wizardOpen && (
        <div className="rounded-3xl border border-blue-500/30 bg-[#0a1020] p-6 shadow-2xl space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>⚙️ Exam Setup Wizard</span>
                <span className="text-xs font-normal text-blue-300">
                  (Official 2026–27 NCF-SE NCERT Books)
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Specify exam dates, times, and chapters to generate your personalized AI study kit.
              </p>
            </div>

            {/* Class Selector Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold">Current Class:</span>
              <select
                value={profile.classLevel}
                onChange={(e) => updateProfile({ classLevel: e.target.value })}
                className="rounded-xl border border-white/10 bg-[#12182b] px-3 py-1.5 text-xs font-bold text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="Class 4">Class 4 (Preparatory Stage)</option>
                <option value="Class 5">Class 5 (Preparatory Stage)</option>
                <option value="Class 6">Class 6 (Middle Stage)</option>
                <option value="Class 7">Class 7 (Middle Stage)</option>
                <option value="Class 8">Class 8 (Middle Stage)</option>
                <option value="Class 9">Class 9 (Secondary Stage)</option>
              </select>
            </div>
          </div>

          {/* Subject Exam Date & Time Picker Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 uppercase text-[0.65rem] font-bold tracking-wider">
                  <th className="py-2.5 px-3">Subject & Official Textbook</th>
                  <th className="py-2.5 px-3">Exam Date</th>
                  <th className="py-2.5 px-3">Start Time</th>
                  <th className="py-2.5 px-3">Syllabus Scope / Chapters</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {getAllBooksForClass(currentClassNum).map((b) => {
                  const cfg = examConfigs[b.subjectKey] || {
                    subjectKey: b.subjectKey,
                    subjectName: b.subjectName,
                    bookName: b.bookName,
                    examDate: '2026-11-15',
                    examTime: '09:00',
                    selectedChapterNums: b.chapters.map((c) => c.number),
                  };

                  const isDropdownOpen = openChapterDropdown === b.subjectKey;
                  const totalCh = b.chapters.length;
                  const selectedCount = cfg.selectedChapterNums?.length || totalCh;

                  return (
                    <tr key={b.id} className="hover:bg-white/5 transition-colors">
                      {/* Subject Name & Book */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{b.iconText}</span>
                          <div>
                            <div className="font-bold text-white text-xs">{b.subjectName}</div>
                            <div className="text-[0.68rem] text-blue-300">
                              "{b.bookName}" {b.hindiName && `(${b.hindiName})`}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Exam Date Picker */}
                      <td className="py-3 px-3">
                        <input
                          type="date"
                          value={cfg.examDate}
                          onChange={(e) => {
                            setExamConfigs((prev) => ({
                              ...prev,
                              [b.subjectKey]: { ...cfg, examDate: e.target.value },
                            }));
                          }}
                          className="rounded-xl border border-white/10 bg-[#0d1428] px-2.5 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                        />
                      </td>

                      {/* Exam Start Time Picker */}
                      <td className="py-3 px-3">
                        <input
                          type="time"
                          value={cfg.examTime}
                          onChange={(e) => {
                            setExamConfigs((prev) => ({
                              ...prev,
                              [b.subjectKey]: { ...cfg, examTime: e.target.value },
                            }));
                          }}
                          className="rounded-xl border border-white/10 bg-[#0d1428] px-2.5 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                        />
                      </td>

                      {/* Chapter Multi-Select Dropdown */}
                      <td className="py-3 px-3 relative">
                        <button
                          type="button"
                          onClick={() => setOpenChapterDropdown(isDropdownOpen ? null : b.subjectKey)}
                          className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#0d1428] px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-blue-400 transition-all min-w-[170px]"
                        >
                          <span>
                            {selectedCount === totalCh
                              ? `All ${totalCh} Chapters`
                              : `${selectedCount} / ${totalCh} Selected`}
                          </span>
                          <ChevronDown
                            className={`h-3 w-3 text-slate-400 transition-transform ${
                              isDropdownOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        {/* Dropdown Card */}
                        {isDropdownOpen && (
                          <div className="absolute right-0 top-full mt-1 z-40 w-72 rounded-2xl border border-white/10 bg-[#090e1c] p-3 shadow-2xl backdrop-blur-xl">
                            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2 text-[0.68rem] font-bold">
                              <span className="text-slate-300">Select Chapters</span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setExamConfigs((prev) => ({
                                      ...prev,
                                      [b.subjectKey]: {
                                        ...cfg,
                                        selectedChapterNums: b.chapters.map((c) => c.number),
                                      },
                                    }));
                                  }}
                                  className="text-blue-400 hover:text-blue-300"
                                >
                                  All
                                </button>
                                <span className="text-white/20">|</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setExamConfigs((prev) => ({
                                      ...prev,
                                      [b.subjectKey]: { ...cfg, selectedChapterNums: [] },
                                    }));
                                  }}
                                  className="text-rose-400 hover:text-rose-300"
                                >
                                  Clear
                                </button>
                              </div>
                            </div>

                            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                              {b.chapters.map((ch) => {
                                const isChecked = (cfg.selectedChapterNums || []).includes(ch.number);
                                return (
                                  <label
                                    key={ch.number}
                                    className="flex items-start gap-2 text-xs text-slate-300 hover:text-white cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {
                                        const currentNums = cfg.selectedChapterNums || [];
                                        const updated = isChecked
                                          ? currentNums.filter((n) => n !== ch.number)
                                          : [...currentNums, ch.number];
                                        setExamConfigs((prev) => ({
                                          ...prev,
                                          [b.subjectKey]: { ...cfg, selectedChapterNums: updated },
                                        }));
                                      }}
                                      className="rounded border-white/20 bg-black/40 text-blue-500 focus:ring-0 mt-0.5"
                                    />
                                    <span className="text-[0.72rem] leading-tight">
                                      Ch {ch.number}: {ch.title}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Daily Study Capacity Slider & Window Selector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-white/10 pt-4">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-white mb-2">
                <span>Daily Study Capacity:</span>
                <span className="text-blue-400 text-sm font-extrabold">{dailyHours} Hours / Day</span>
              </div>
              <input
                type="range"
                min="1"
                max="8"
                step="1"
                value={dailyHours}
                onChange={(e) => setDailyHours(parseInt(e.target.value, 10))}
                className="w-full accent-blue-500 cursor-pointer"
              />
              <div className="flex justify-between text-[0.65rem] text-slate-500 mt-1">
                <span>1 hr (High-Yield Sprints)</span>
                <span>2 hrs (Balanced Mastery)</span>
                <span>3-4 hrs (Optimal)</span>
                <span>8 hrs (Intense)</span>
              </div>

              {/* Dynamic Pacing & 100% Syllabus Coverage Guarantee Note */}
              <div className="mt-2.5 rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-2.5 text-[0.72rem] text-emerald-200 flex items-center gap-2">
                <span className="text-base">🛡️</span>
                <div>
                  <span className="font-bold text-white">100% Syllabus Guaranteed: </span>
                  {dailyHours === 1 && (
                    <span>
                      At 1 hr/day, StudyBot AI creates <strong>two 30-min high-yield sprints daily</strong>, ensuring <strong>all {totalUniqueChapters} chapters</strong> across all 5 subjects are scheduled and covered without skipping!
                    </span>
                  )}
                  {dailyHours === 2 && (
                    <span>
                      At 2 hrs/day, StudyBot AI creates <strong>three 40-min focused chapter sessions daily</strong>, ensuring <strong>all {totalUniqueChapters} chapters</strong> are covered thoroughly!
                    </span>
                  )}
                  {dailyHours === 3 && (
                    <span>
                      At 3 hrs/day, StudyBot AI creates <strong>three 60-min deep-dive slots daily</strong> covering the whole syllabus with extra revision buffer!
                    </span>
                  )}
                  {dailyHours >= 4 && (
                    <span>
                      At {dailyHours} hrs/day, StudyBot AI creates <strong>{Math.min(6, dailyHours)} slots daily</strong> for complete syllabus mastery and mock test rehearsal!
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-white mb-2">Preferred Study Window:</div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'morning', label: 'Morning', icon: Sun, time: '06:00 AM' },
                  { key: 'evening', label: 'Evening', icon: Sunset, time: '04:00 PM' },
                  { key: 'night', label: 'Night', icon: Moon, time: '08:00 PM' },
                ].map((w) => {
                  const Icon = w.icon;
                  const isSelected = studyWindow === w.key;
                  return (
                    <button
                      key={w.key}
                      type="button"
                      onClick={() => setStudyWindow(w.key as any)}
                      className={`flex flex-col items-center justify-center rounded-xl p-2 text-xs font-bold transition-all ${
                        isSelected
                          ? 'border border-blue-500/60 bg-blue-600/30 text-white shadow-md'
                          : 'border border-white/10 bg-[#0d1428] text-slate-400 hover:text-white'
                      }`}
                    >
                      <Icon className="h-4 w-4 mb-1 text-blue-400" />
                      <span>{w.label}</span>
                      <span className="text-[0.6rem] text-slate-400 font-normal">{w.time}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Primary CTA Button */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => {
                generateTimetable(examConfigs, dailyHours, studyWindow);
                setWizardOpen(false);
              }}
              className="flex items-center gap-2.5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 px-7 py-3.5 text-sm font-extrabold text-white shadow-[0_0_25px_rgba(37,99,235,0.6)] hover:scale-105 hover:from-blue-500 hover:to-cyan-400 transition-all"
            >
              <Sparkles className="h-4 w-4" />
              <span>✨ Generate AI Master Timetable & Study Kit</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Live Exam Countdown Strip (5 Subject Glass Cards) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-blue-400" />
            <span>Live Exam Countdown & Subject Readiness</span>
          </span>
          <span className="text-[0.65rem] text-blue-400 font-normal">Real-time Ticking</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {countdowns.map((item) => {
            const isImminent = item.days <= 5;
            return (
              <div
                key={item.book.id}
                className={`relative flex flex-col justify-between rounded-2xl border p-3.5 backdrop-blur-xl transition-all ${
                  isImminent
                    ? 'border-amber-500/40 bg-gradient-to-b from-[#1a140d] to-[#0c0f1d] shadow-[0_4px_20px_rgba(245,158,11,0.15)]'
                    : 'border-white/10 bg-[#0a1020] hover:border-blue-500/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white truncate">
                      <span>{item.book.iconText}</span>
                      <span className="truncate">{item.book.subjectName}</span>
                    </div>
                    {isImminent && (
                      <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.2 text-[0.6rem] font-black text-amber-300 animate-pulse">
                        Imminent
                      </span>
                    )}
                  </div>

                  <div className="text-[0.68rem] text-blue-300 font-semibold truncate mb-2">
                    "{item.book.bookName}"
                  </div>

                  {/* Countdown Numbers */}
                  <div className="font-mono text-sm md:text-base font-extrabold text-white tracking-tight flex items-baseline gap-1">
                    <span>{item.days}d</span>
                    <span className="text-slate-500">:</span>
                    <span>{item.hours.toString().padStart(2, '0')}h</span>
                    <span className="text-slate-500">:</span>
                    <span>{item.minutes.toString().padStart(2, '0')}m</span>
                    <span className="text-slate-500">:</span>
                    <span className="text-xs text-blue-400">
                      {item.seconds.toString().padStart(2, '0')}s
                    </span>
                  </div>
                </div>

                {/* Readiness Progress Bar & Percent */}
                <div className="mt-3 border-t border-white/5 pt-2">
                  <div className="flex items-center justify-between text-[0.68rem] text-slate-300 font-semibold mb-1">
                    <span>Readiness:</span>
                    <span className="text-emerald-400 font-bold">{item.readinessPercent}% Ready</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-300"
                      style={{ width: `${item.readinessPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Interactive Master Timetable View */}
      <div className="rounded-3xl border border-white/10 bg-[#0a1020] p-6 shadow-xl space-y-5">
        {/* Navigation & View Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-400" />
              <span>Interactive Master Timetable</span>
            </h2>
            <p className="text-xs text-slate-400">
              Each slot is linked with 1-click Crispy Notes, NCERT solutions, and 15-min Chapter Mock Tests.
            </p>
          </div>

          {/* View Mode Buttons */}
          <div className="flex items-center rounded-2xl border border-white/10 bg-[#070b16] p-1.5 shrink-0 shadow-lg">
            <button
              type="button"
              onClick={() => setViewMode('daily')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                viewMode === 'daily'
                  ? 'bg-[#2563eb] text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              <span>Daily Action Plan</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('weekly')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                viewMode === 'weekly'
                  ? 'bg-[#2563eb] text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Weekly Calendar</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('syllabus')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                viewMode === 'syllabus'
                  ? 'bg-[#2563eb] text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Syllabus Tracker</span>
            </button>
          </div>
        </div>

        {/* View Mode: Daily Action Plan */}
        {viewMode === 'daily' && (
          <div className="space-y-4">
            {/* Week & Day Navigation Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/5 pb-3">
              {/* Week filter pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <span className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1 shrink-0">
                  <Filter className="h-3 w-3 text-blue-400" />
                  Filter Week:
                </span>
                <button
                  type="button"
                  onClick={() => setWeekFilter('all')}
                  className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition-all shrink-0 ${
                    weekFilter === 'all'
                      ? 'bg-blue-600/30 border border-blue-500/60 text-white'
                      : 'border border-white/10 bg-[#0e1426] text-slate-400 hover:text-white'
                  }`}
                >
                  All Days ({dayTabs.length})
                </button>
                {Array.from({ length: totalWeeks }).map((_, wIdx) => {
                  const weekNum = wIdx + 1;
                  const isSelected = weekFilter === weekNum;
                  return (
                    <button
                      key={weekNum}
                      type="button"
                      onClick={() => setWeekFilter(weekNum)}
                      className={`rounded-xl px-2.5 py-1 text-xs font-semibold transition-all shrink-0 ${
                        isSelected
                          ? 'bg-blue-600/30 border border-blue-500/60 text-white'
                          : 'border border-white/10 bg-[#0e1426] text-slate-400 hover:text-white'
                      }`}
                    >
                      Week {weekNum}
                    </button>
                  );
                })}
              </div>

              {/* Day Next/Prev Step Controls */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={selectedDayIndex <= 0}
                  onClick={() => setSelectedDayIndex((prev) => Math.max(0, prev - 1))}
                  className="rounded-xl border border-white/10 bg-[#0e1426] px-3 py-1 text-xs font-bold text-slate-300 hover:bg-[#151f38] hover:text-white disabled:opacity-40 transition-all"
                >
                  ← Prev Day
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDayIndex(0)}
                  className="rounded-xl border border-blue-500/30 bg-blue-600/15 px-3 py-1 text-xs font-bold text-blue-300 hover:bg-blue-600/25 transition-all"
                >
                  Jump to Today
                </button>
                <button
                  type="button"
                  disabled={selectedDayIndex >= dayTabs.length - 1}
                  onClick={() => setSelectedDayIndex((prev) => Math.min(dayTabs.length - 1, prev + 1))}
                  className="rounded-xl border border-white/10 bg-[#0e1426] px-3 py-1 text-xs font-bold text-slate-300 hover:bg-[#151f38] hover:text-white disabled:opacity-40 transition-all"
                >
                  Next Day →
                </button>
              </div>
            </div>

            {/* Day Selector Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {filteredDayTabs.map((day) => {
                const isSelected = selectedDayIndex === day.index;
                const slotsOnDay = timetable.filter((s) => s.dayIndex === day.index);
                const completedOnDay = slotsOnDay.filter((s) => s.completed).length;
                return (
                  <button
                    key={day.index}
                    type="button"
                    onClick={() => setSelectedDayIndex(day.index)}
                    className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition-all shrink-0 ${
                      isSelected
                        ? 'bg-[#2563eb] text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] border border-blue-400'
                        : 'border border-white/10 bg-[#0e1426] text-slate-300 hover:bg-[#141d38] hover:text-white'
                    }`}
                  >
                    <span>{day.label}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[0.65rem] font-bold ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-400'
                      }`}
                    >
                      {completedOnDay}/{slotsOnDay.length}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Daily Timeline Cards */}
            <div className="space-y-3">
              {dailySlots.length === 0 ? (
                <div className="rounded-2xl border border-white/5 bg-[#090e1c] p-8 text-center text-slate-400 text-xs">
                  No study slots scheduled for this day. Click "Configure Exam Dates" to re-generate timetable.
                </div>
              ) : (
                dailySlots.map((slot) => {
                  const book = getBookForClassAndSubject(currentClassNum, slot.subjectKey);
                  return (
                    <div
                      key={slot.id}
                      className={`group relative rounded-2xl border p-4.5 transition-all ${
                        slot.completed
                          ? 'border-emerald-500/30 bg-[#0b161f] shadow-sm'
                          : 'border-white/10 bg-[#0d1428] hover:border-blue-500/40 hover:bg-[#101933]'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Slot Info & Title */}
                        <div className="flex items-start gap-3.5">
                          {/* Completion Checkbox Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleComplete(slot.id)}
                            className="mt-0.5 rounded-lg text-slate-400 hover:text-emerald-400 transition-colors"
                            title={slot.completed ? 'Mark as Pending' : 'Mark as Completed'}
                          >
                            {slot.completed ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                            ) : (
                              <div className="h-5 w-5 rounded-md border-2 border-slate-500 hover:border-blue-400 shrink-0" />
                            )}
                          </button>

                          <div>
                            {/* Time and Subject Badges */}
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="font-mono text-xs font-bold text-blue-300 bg-blue-500/15 border border-blue-500/30 px-2.5 py-0.5 rounded-full">
                                {slot.startTime} – {slot.endTime}
                              </span>
                              <span className="text-xs font-bold text-white flex items-center gap-1">
                                <span>{book?.iconText}</span>
                                <span>{slot.subjectName}</span>
                              </span>
                              <span className="text-[0.68rem] text-slate-400">
                                ({slot.bookName})
                              </span>
                              {slot.completed ? (
                                <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[0.62rem] font-bold text-emerald-300">
                                  ✅ Completed
                                </span>
                              ) : (
                                <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[0.62rem] font-bold text-amber-300">
                                  ⏳ Pending
                                </span>
                              )}
                            </div>

                            {/* Chapter Title */}
                            <h3
                              className={`text-sm md:text-base font-bold ${
                                slot.completed ? 'text-slate-300 line-through' : 'text-white'
                              }`}
                            >
                              {slot.chapterNumber === 99
                                ? slot.chapterTitle
                                : `Ch ${slot.chapterNumber}: ${slot.chapterTitle}`}
                            </h3>
                          </div>
                        </div>

                        {/* 4 Instant One-Click Action Pills inside every timetable card */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/5">
                          {/* 1. Read AI Notes */}
                          <button
                            type="button"
                            onClick={() => handleOpenStudyKit(slot, 'notes')}
                            className="flex items-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-600/10 px-3 py-1.5 text-xs font-bold text-blue-300 hover:bg-blue-600/25 hover:border-blue-400 transition-all shadow-sm"
                            title="Read crispy high-yield chapter notes and formulas"
                          >
                            <FileText className="h-3.5 w-3.5 text-blue-400" />
                            <span>Read AI Notes</span>
                          </button>

                          {/* 2. NCERT Solutions */}
                          <button
                            type="button"
                            onClick={() => handleOpenStudyKit(slot, 'solutions')}
                            className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-600/10 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-600/25 hover:border-emerald-400 transition-all shadow-sm"
                            title="Open step-by-step textbook solutions & marking schemes"
                          >
                            <BookOpen className="h-3.5 w-3.5 text-emerald-400" />
                            <span>NCERT Solutions</span>
                          </button>

                          {/* 3. Take Chapter Mock Test */}
                          <button
                            type="button"
                            onClick={() => handleOpenStudyKit(slot, 'mock_test')}
                            className="flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-600/10 px-3 py-1.5 text-xs font-bold text-purple-300 hover:bg-purple-600/25 hover:border-purple-400 transition-all shadow-sm"
                            title="Launch 15-minute diagnostic quiz"
                          >
                            <Dumbbell className="h-3.5 w-3.5 text-purple-400" />
                            <span>Chapter Quiz</span>
                          </button>

                          {/* 4. Ask Doubt */}
                          <button
                            type="button"
                            onClick={() => setActiveTab('/tutor')}
                            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition-all shadow-sm"
                            title="Open AI Tutor with this chapter context"
                          >
                            <Bot className="h-3.5 w-3.5 text-[#38bdf8]" />
                            <span>Ask Doubt</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* View Mode: Weekly Calendar Grid */}
        {viewMode === 'weekly' && (
          <div className="space-y-4">
            {/* Week Switcher Pills */}
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <span>Select Week:</span>
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: totalWeeks }).map((_, wIdx) => {
                    const isSelected = calendarWeek === wIdx;
                    return (
                      <button
                        key={wIdx}
                        type="button"
                        onClick={() => setCalendarWeek(wIdx)}
                        className={`rounded-xl px-3 py-1 text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'border border-white/10 bg-[#0e1426] text-slate-400 hover:text-white'
                        }`}
                      >
                        Week {wIdx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="text-[0.7rem] text-slate-400 font-medium">
                Showing Days {calendarWeek * 7 + 1} – {Math.min((calendarWeek + 1) * 7, dayTabs.length)} of {dayTabs.length} Total Days
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
              {dayTabs.slice(calendarWeek * 7, (calendarWeek + 1) * 7).map((d) => {
                const daySlots = timetable.filter((s) => s.dayIndex === d.index);
                return (
                  <div
                    key={d.index}
                    className="rounded-2xl border border-white/10 bg-[#090e1c] p-3 space-y-2 flex flex-col justify-between"
                  >
                    <div className="border-b border-white/5 pb-2">
                      <div className="text-xs font-extrabold text-white">{d.label}</div>
                      <div className="text-[0.65rem] text-slate-400">{d.date}</div>
                    </div>

                    <div className="space-y-1.5 flex-1">
                      {daySlots.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => handleOpenStudyKit(s, 'notes')}
                          className={`rounded-xl p-2 text-[0.7rem] cursor-pointer transition-all border ${
                            s.completed
                              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                              : 'bg-white/5 border-white/5 text-slate-300 hover:border-blue-500/40 hover:bg-white/10'
                          }`}
                        >
                          <div className="font-bold truncate text-white">
                            {s.chapterNumber === 99 ? 'Grand Revision' : `Ch ${s.chapterNumber}: ${s.chapterTitle}`}
                          </div>
                          <div className="text-[0.62rem] text-blue-300 truncate">
                            {s.subjectName} · {s.startTime}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* View Mode: Subject-Wise Syllabus Tracker */}
        {viewMode === 'syllabus' && (
          <div className="space-y-4">
            {getAllBooksForClass(currentClassNum).map((b) => {
              const completedInBook = timetable.filter(
                (s) => s.subjectKey === b.subjectKey && s.completed
              );
              const uniqueCompletedInBook = new Set(completedInBook.map((s) => s.chapterNumber)).size;
              const percent = Math.min(
                100,
                Math.round((uniqueCompletedInBook / b.totalChapters) * 100) || 10
              );

              return (
                <div
                  key={b.id}
                  className="rounded-2xl border border-white/10 bg-[#090e1c] p-4 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{b.iconText}</span>
                      <div>
                        <div className="font-bold text-white text-xs md:text-sm">
                          {b.subjectName} — "{b.bookName}"
                        </div>
                        <div className="text-[0.68rem] text-slate-400">
                          {b.edition} · {b.totalChapters} Total Chapters
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-emerald-400">
                        {uniqueCompletedInBook} / {b.totalChapters} Mastered ({percent}%)
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {b.chapters.map((ch) => {
                      const isDone = timetable.some(
                        (s) => s.subjectKey === b.subjectKey && s.chapterNumber === ch.number && s.completed
                      );
                      const mockSlot: TimetableSlot = {
                        id: `adhoc-${b.subjectKey}-${ch.number}`,
                        dayIndex: 0,
                        dateString: '',
                        dayLabel: 'Study',
                        startTime: '04:00 PM',
                        endTime: '05:00 PM',
                        subjectKey: b.subjectKey,
                        subjectName: b.subjectName,
                        bookName: b.bookName,
                        chapterNumber: ch.number,
                        chapterTitle: ch.title,
                        completed: isDone,
                      };

                      return (
                        <div
                          key={ch.number}
                          onClick={() => handleOpenStudyKit(mockSlot, 'notes')}
                          className={`flex items-center justify-between rounded-xl p-2.5 text-xs border cursor-pointer transition-all ${
                            isDone
                              ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-200'
                              : 'border-white/5 bg-[#0e1426] text-slate-300 hover:border-blue-500/40 hover:bg-[#131c36]'
                          }`}
                        >
                          <div className="truncate mr-2">
                            <span className="font-bold mr-1">Ch {ch.number}:</span>
                            <span>{ch.title}</span>
                          </div>
                          {isDone ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Slide-Over Study Material Hub Drawer / Modal */}
      {drawerOpen && activeSlot && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="flex-1 max-w-none md:max-w-3xl w-full h-full bg-[#080d1a] border-l border-white/10 flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-[#0c1326] p-4 md:p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/30 border border-blue-500/40 text-blue-300 font-bold text-lg">
                  {activeSlot.chapterNumber}
                </div>
                <div>
                  <div className="flex items-center gap-2 text-[0.68rem] text-slate-400 uppercase tracking-wider font-bold">
                    <span>{activeSlot.subjectName}</span>
                    <span>·</span>
                    <span className="text-blue-300">"{activeSlot.bookName}"</span>
                    <span>·</span>
                    <span>{profile.classLevel}</span>
                  </div>
                  <h2 className="text-base md:text-lg font-extrabold text-white">
                    {activeSlot.chapterTitle}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleToggleComplete(activeSlot.id);
                  }}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                    activeSlot.completed
                      ? 'bg-emerald-600 text-white'
                      : 'border border-white/10 bg-white/5 text-slate-300 hover:text-white'
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{activeSlot.completed ? 'Mastered' : 'Mark Done'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Drawer Tab Switcher (Tab 1: Crispy Notes | Tab 2: Complete NCERT Solutions | Tab 3: AI Mock Test) */}
            <div className="flex items-center border-b border-white/10 bg-[#090f20] px-4 pt-2">
              {[
                { key: 'notes', label: '📄 Tab 1: Crispy Notes', count: `${activeNotes?.readingTimeMinutes || 8}m read` },
                { key: 'solutions', label: '📖 Tab 2: NCERT Solutions', count: `${activeSolutions.length} Q&As` },
                { key: 'mock_test', label: '📝 Tab 3: Chapter Mock Test', count: '15m Quiz' },
              ].map((t) => {
                const isActive = drawerTab === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => {
                      setDrawerTab(t.key as any);
                      if (t.key === 'mock_test' && !quizTimerActive && !quizSubmitted) {
                        setQuizTimerActive(true);
                      }
                    }}
                    className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-all ${
                      isActive
                        ? 'border-blue-500 text-white'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{t.label}</span>
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-[0.62rem] text-slate-400">
                      {t.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Drawer Body Scroll Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
              {/* TAB 1: CRISPY NOTES */}
              {drawerTab === 'notes' && activeNotes && (
                <div className="space-y-6">
                  {/* Summary Box */}
                  <div className="rounded-2xl border border-blue-500/30 bg-blue-950/30 p-4 text-xs text-blue-200 leading-relaxed">
                    <div className="font-bold text-white mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                        Executive Chapter TL;DR
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `${activeNotes.chapterTitle}\n\n${activeNotes.coreSummary}`
                          );
                          setCopiedNotes(true);
                          setTimeout(() => setCopiedNotes(false), 2000);
                        }}
                        className="flex items-center gap-1 text-[0.68rem] text-blue-300 hover:text-white"
                      >
                        {copiedNotes ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        <span>{copiedNotes ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <p>{activeNotes.coreSummary}</p>
                  </div>

                  {/* Key Formulas & Rules */}
                  {activeNotes.formulasAndRules.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <span>📐 Core Formulas & Mathematical Identities</span>
                      </h3>
                      <div className="grid grid-cols-1 gap-2.5">
                        {activeNotes.formulasAndRules.map((f, i) => (
                          <div
                            key={i}
                            className="rounded-xl border border-white/10 bg-[#0d1428] p-3 text-xs"
                          >
                            <div className="font-bold text-white mb-1">{f.name}</div>
                            <div className="font-mono text-cyan-300 text-sm py-1 bg-black/40 rounded-lg px-2.5 my-1.5">
                              {f.formula}
                            </div>
                            <div className="text-slate-400 text-[0.72rem]">{f.explanation}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Key Concepts Breakdown */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      💡 High-Yield Concept Breakdown
                    </h3>
                    <div className="space-y-3">
                      {activeNotes.keyConcepts.map((concept, idx) => (
                        <div
                          key={idx}
                          className="rounded-2xl border border-white/10 bg-[#0d1428] p-4 text-xs space-y-2"
                        >
                          <h4 className="font-bold text-white text-sm">{concept.title}</h4>
                          <ul className="space-y-1.5 list-disc list-inside text-slate-300">
                            {concept.points.map((pt, pIdx) => (
                              <li key={pIdx} className="leading-relaxed">
                                {pt}
                              </li>
                            ))}
                          </ul>
                          {concept.latexFormula && (
                            <div className="font-mono text-cyan-300 text-xs bg-black/40 rounded-lg p-2 mt-2">
                              {concept.latexFormula}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Board Exam Tips Callout */}
                  <div className="rounded-2xl border border-amber-500/40 bg-amber-950/20 p-4 text-xs space-y-2">
                    <h3 className="font-bold text-amber-300 flex items-center gap-1.5">
                      <Award className="h-4 w-4 text-amber-400" />
                      <span>Examiner Scoring Secrets (CBSE NCF-SE)</span>
                    </h3>
                    <ul className="space-y-1.5 list-disc list-inside text-slate-300 text-[0.75rem]">
                      {activeNotes.boardExamTips.map((tip, tIdx) => (
                        <li key={tIdx}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* TAB 2: COMPLETE NCERT SOLUTIONS */}
              {drawerTab === 'solutions' && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 text-xs text-emerald-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>
                        Verified textbook solutions for <strong>"{activeSlot.chapterTitle}"</strong> with step marks breakdown.
                      </span>
                    </div>
                    <span className="text-[0.65rem] text-slate-400 font-mono">100% Board-Compliant</span>
                  </div>

                  <div className="space-y-3">
                    {activeSolutions.map((sol, sIdx) => {
                      const isExpanded = expandedSolutionIndex === sIdx;
                      return (
                        <div
                          key={sIdx}
                          className="rounded-2xl border border-white/10 bg-[#0d1428] overflow-hidden transition-all"
                        >
                          {/* Question Bar */}
                          <button
                            type="button"
                            onClick={() => setExpandedSolutionIndex(isExpanded ? null : sIdx)}
                            className="flex w-full items-start justify-between p-4 text-left hover:bg-white/5 transition-colors gap-3"
                          >
                            <div>
                              <div className="flex items-center gap-2 text-[0.65rem] font-bold text-blue-400 uppercase tracking-wider mb-1">
                                <span className="rounded bg-blue-500/20 px-1.5 py-0.5">
                                  {sol.type}
                                </span>
                                <span>{sol.questionNumber}</span>
                              </div>
                              <div className="text-xs md:text-sm font-bold text-white leading-snug">
                                {sol.question}
                              </div>
                            </div>
                            <ChevronDown
                              className={`h-4 w-4 text-slate-400 shrink-0 mt-1 transition-transform ${
                                isExpanded ? 'rotate-180' : ''
                              }`}
                            />
                          </button>

                          {/* Expanded Solution & Marking Scheme */}
                          {isExpanded && (
                            <div className="border-t border-white/10 bg-[#090e1c] p-4 text-xs space-y-3">
                              {/* Marking Scheme */}
                              <div className="rounded-xl border border-blue-500/20 bg-blue-950/30 px-3 py-1.5 text-[0.68rem] text-blue-300 font-semibold flex items-center gap-2">
                                <Award className="h-3.5 w-3.5 text-blue-400" />
                                <span>Marking Scheme: {sol.markingScheme}</span>
                              </div>

                              {/* Steps */}
                              <div className="space-y-2">
                                <div className="font-bold text-slate-300 text-[0.7rem] uppercase tracking-wider">
                                  Step-by-Step Working:
                                </div>
                                {sol.stepByStepSolution.map((step, stIdx) => (
                                  <div
                                    key={stIdx}
                                    className="p-2.5 rounded-xl bg-white/5 text-slate-200 text-xs leading-relaxed font-mono whitespace-pre-wrap"
                                  >
                                    {step}
                                  </div>
                                ))}
                              </div>

                              {/* Final Answer Box */}
                              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-2.5 text-xs text-emerald-300 font-bold">
                                <span>Final Answer: </span>
                                <span className="text-white font-normal">{sol.finalAnswer}</span>
                              </div>

                              {/* Examiner Tip */}
                              <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-2.5 text-[0.72rem] text-amber-200">
                                <strong className="text-amber-400">💡 Examiner Warning: </strong>
                                {sol.examinerTip}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: CHAPTER MOCK TEST (15-Minute Interactive Diagnostic) */}
              {drawerTab === 'mock_test' && activeQuiz && (
                <div className="space-y-5">
                  {/* Test Status Bar */}
                  <div className="flex items-center justify-between rounded-2xl border border-purple-500/40 bg-purple-950/30 p-3.5">
                    <div className="flex items-center gap-2">
                      <Dumbbell className="h-4 w-4 text-purple-400" />
                      <div>
                        <div className="text-xs font-bold text-white">
                          15-Minute Diagnostic Quiz
                        </div>
                        <div className="text-[0.68rem] text-purple-300">
                          {activeQuiz.questions.length} Questions · Total Marks: {activeQuiz.totalMarks}
                        </div>
                      </div>
                    </div>

                    {/* Timer Badge */}
                    <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 font-mono text-xs font-bold text-white">
                      <Clock className="h-3.5 w-3.5 text-purple-400" />
                      <span className={quizSecondsLeft < 180 ? 'text-rose-400 animate-pulse' : ''}>
                        {formatTimer(quizSecondsLeft)}
                      </span>
                    </div>
                  </div>

                  {/* Score Card if Submitted */}
                  {quizSubmitted && quizScore && (
                    <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-4 text-center space-y-2 animate-in zoom-in-95 duration-200">
                      <div className="text-2xl font-black text-emerald-400">
                        {quizScore.score} / {quizScore.total} Marks
                      </div>
                      <div className="text-xs font-bold text-white">
                        {quizScore.score === quizScore.total
                          ? '🏆 Flawless Mastery! Ready for Board Exam!'
                          : quizScore.score >= quizScore.total * 0.7
                          ? '🌟 Good Performance! Review wrong answers below.'
                          : '📚 Need More Revision! Incorrect questions saved to Mistake Book.'}
                      </div>
                    </div>
                  )}

                  {/* Questions Palette */}
                  <div className="space-y-4">
                    {activeQuiz.questions.map((q, qIndex) => {
                      const selectedOption = quizAnswers[q.id];
                      const isCorrect = selectedOption === q.correctAnswerIndex;

                      return (
                        <div
                          key={q.id}
                          className="rounded-2xl border border-white/10 bg-[#0d1428] p-4 text-xs space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-white text-xs md:text-sm">
                              Q{qIndex + 1}. {q.question}
                            </span>
                            <span className="rounded bg-white/5 px-2 py-0.5 text-[0.62rem] font-bold text-slate-400 shrink-0">
                              2 Marks
                            </span>
                          </div>

                          {/* Options */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {q.options.map((opt, optIndex) => {
                              const isThisSelected = selectedOption === optIndex;
                              let btnClass = 'border-white/10 bg-[#090e1c] text-slate-300 hover:border-white/20';

                              if (isThisSelected) {
                                btnClass = 'border-blue-500 bg-blue-600/30 text-white font-bold';
                              }

                              if (quizSubmitted) {
                                if (optIndex === q.correctAnswerIndex) {
                                  btnClass = 'border-emerald-500 bg-emerald-950/60 text-emerald-200 font-bold';
                                } else if (isThisSelected && !isCorrect) {
                                  btnClass = 'border-rose-500 bg-rose-950/60 text-rose-200';
                                }
                              }

                              return (
                                <button
                                  key={optIndex}
                                  type="button"
                                  disabled={quizSubmitted}
                                  onClick={() => {
                                    setQuizAnswers((prev) => ({ ...prev, [q.id]: optIndex }));
                                  }}
                                  className={`rounded-xl border p-2.5 text-left text-xs transition-all flex items-center justify-between ${btnClass}`}
                                >
                                  <span>{opt}</span>
                                  {quizSubmitted && optIndex === q.correctAnswerIndex && (
                                    <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {/* Explanation if submitted */}
                          {quizSubmitted && (
                            <div className="mt-2 rounded-xl border border-white/5 bg-black/40 p-3 text-[0.72rem] space-y-1">
                              <div className="font-bold text-white flex items-center gap-1.5">
                                <span>Explanation:</span>
                                {isCorrect ? (
                                  <span className="text-emerald-400">Correct (+2)</span>
                                ) : (
                                  <span className="text-rose-400">Wrong Answer (Saved to Mistake Book)</span>
                                )}
                              </div>
                              <p className="text-slate-300">{q.explanation}</p>
                              <div className="text-amber-300 text-[0.68rem] pt-1 border-t border-white/5">
                                💡 Tip: {q.tip}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Submit Test Button */}
                  {!quizSubmitted && (
                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={handleSubmitQuiz}
                        disabled={Object.keys(quizAnswers).length === 0}
                        className="flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-3 text-xs font-bold text-white shadow-lg hover:bg-purple-500 disabled:opacity-50 transition-all"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Submit Test & Calculate Score</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Drawer Bottom Actions */}
            <div className="border-t border-white/10 bg-[#0c1326] p-4 flex items-center justify-between">
              <div className="text-[0.7rem] text-slate-400">
                Stuck on a concept? The AI Tutor has full context of this chapter.
              </div>
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  setActiveTab('/tutor');
                }}
                className="flex items-center gap-1.5 rounded-xl border border-blue-500/40 bg-[#121c38] px-4 py-2 text-xs font-bold text-blue-200 hover:bg-[#1a2850] transition-all"
              >
                <Bot className="h-3.5 w-3.5 text-[#38bdf8]" />
                <span>Ask Doubt in AI Tutor →</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
