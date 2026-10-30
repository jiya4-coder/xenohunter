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
  RotateCcw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Copy,
  Check,
  Calendar,
  Award,
  ArrowRight,
  Sun,
  Sunset,
  Moon,
  Search,
  Bell,
  Pencil,
  Calculator,
  FlaskConical,
  Globe,
  MoreVertical,
  Plus,
  CornerDownRight,
} from 'lucide-react';
import {
  NCERTChapter,
  getAllBooksForClass,
  getBookForClassAndSubject,
} from '../data/ncertSyllabus';
import {
  getChapterNotes,
  getChapterSolutions,
  getChapterQuiz,
  ChapterNotes,
  NCERTSolutionItem,
  ChapterQuiz,
} from '../data/plannerMaterials';
import { saveUserPlannerData, getUserPlannerData } from '../firebase';
import { getUserItem, setUserItem } from '../utils/userStorage';

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
  dayIndex: number; // 0 = Day 1, 1 = Day 2, etc.
  dateString: string; // YYYY-MM-DD
  dayLabel: string; // "Day 1", "Day 2", etc.
  startTime: string; // "04:00 PM"
  endTime: string; // "05:15 PM"
  durationLabel?: string; // "1h 30m", "1h 00m", "45m", "30m"
  taskType?: 'concept' | 'practice' | 'notes' | 'revision';
  subjectKey: 'maths' | 'science' | 'sst' | 'english' | 'hindi';
  subjectBadgeLabel?: string; // "Mathematics", "Science", "English", "Revision", "Social Science"
  subjectName: string;
  bookName: string;
  chapterNumber: number;
  chapterTitle: string;
  completed: boolean;
  notesSummary?: string;
}

const EXAM_TYPE_OPTIONS = [
  'Board Exam (CBSE)',
  'Final Annual Exam (CBSE)',
  'Half-Yearly Exam',
  'Unit Test / Periodic Test',
  'Olympiad / Scholarship Exam',
];

function formatDisplayExamDate(dateStr: string): string {
  if (!dateStr) return '15 May 2025';
  const parsed = new Date(`${dateStr}T00:00:00`);
  if (isNaN(parsed.getTime())) return '15 May 2025';
  return parsed.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDayHeaderDate(dateStr: string): { shortDate: string; weekday: string; dayMonth: string } {
  const parsed = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date();
  if (isNaN(parsed.getTime())) {
    return { shortDate: '15 Apr 2025', weekday: 'Monday', dayMonth: '15 Apr' };
  }
  const shortDate = parsed.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const weekday = parsed.toLocaleDateString('en-US', { weekday: 'long' });
  const dayMonth = parsed.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
  return { shortDate, weekday, dayMonth };
}

export const StudyPlannerView: React.FC = () => {
  const {
    profile,
    currentUser,
    updateProfile,
    setActiveTab,
    addStudyMinutes,
    addMistake,
    setCustomizeOpen,
  } = useStudy();

  // Current class number (4 to 9)
  const currentClassNum = useMemo(() => {
    const match = profile.classLevel.match(/\d+/);
    const num = match ? parseInt(match[0], 10) : 9;
    return num >= 4 && num <= 9 ? num : 9;
  }, [profile.classLevel]);

  // Top search query
  const [searchQuery, setSearchQuery] = useState('');

  // Exam Date & Exam Type state matching screenshot
  const [primaryExamDate, setPrimaryExamDate] = useState<string>(() => {
    const saved = getUserItem(`studybot_primary_exam_date_c${currentClassNum}`);
    if (saved) return saved;
    const d = new Date();
    d.setDate(d.getDate() + 25);
    return d.toISOString().split('T')[0];
  });

  const [selectedExamType, setSelectedExamType] = useState<string>(() => {
    return getUserItem(`studybot_exam_type_c${currentClassNum}`) || 'Board Exam (CBSE)';
  });

  // Collapsible Edit Plan / Setup Wizard
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardSubjectTab, setWizardSubjectTab] = useState<'maths' | 'science' | 'english' | 'sst' | 'hindi'>('maths');
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [rebalanceNotification, setRebalanceNotification] = useState<string | null>(null);

  const wizardSectionRef = useRef<HTMLDivElement>(null);
  const planResultsRef = useRef<HTMLDivElement>(null);

  // Daily capacity & window
  const [dailyHours, setDailyHours] = useState<number>(profile.dailyHours || 3);
  const [studyWindow, setStudyWindow] = useState<'morning' | 'evening' | 'night'>('evening');
  const [openChapterDropdown, setOpenChapterDropdown] = useState<string | null>(null);

  // Active View Switcher: 'daily' (Day-wise Plan) | 'chapter' (Chapter-wise Plan) | 'syllabus' (Syllabus Overview)
  const [viewMode, setViewMode] = useState<'daily' | 'chapter' | 'syllabus'>('daily');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string | null>(null);

  // Active day index for Day-wise Plan
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [dayCarouselStart, setDayCarouselStart] = useState<number>(0);
  const [showAllDayTasks, setShowAllDayTasks] = useState<boolean>(false);
  const [openTaskMenuId, setOpenTaskMenuId] = useState<string | null>(null);

  // Custom task modal / inline creator
  const [addingCustomTask, setAddingCustomTask] = useState(false);
  const [customTaskTitle, setCustomTaskTitle] = useState('');
  const [customTaskSubject, setCustomTaskSubject] = useState<'maths' | 'science' | 'english' | 'sst'>('maths');
  const [customTaskDuration, setCustomTaskDuration] = useState('1h 00m');

  const dateInputRef = useRef<HTMLInputElement>(null);

  // Slide-over Study Material Hub Drawer State
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

  // Default exam configs (defaults to reasonable initial chapter counts matching dashboard: 6, 7, 5, 6)
  const getDefaultExamConfigs = (
    classNum: number,
    baseDateStr?: string,
    existingConfigs?: Record<string, SubjectExamConfig>
  ): Record<string, SubjectExamConfig> => {
    const books = getAllBooksForClass(classNum);
    const baseDate = baseDateStr ? new Date(`${baseDateStr}T00:00:00`) : new Date(Date.now() + 25 * 86400000);

    const offsets: Record<string, number> = {
      maths: 0,
      science: 2,
      english: 4,
      sst: 6,
      hindi: 8,
    };

    const defaultCounts: Record<string, number> = {
      maths: 6,
      science: 7,
      english: 5,
      sst: 6,
      hindi: 5,
    };

    const configs: Record<string, SubjectExamConfig> = {};
    for (const b of books) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + (offsets[b.subjectKey] || 0));
      const dateStr = d.toISOString().split('T')[0];
      const existingSel = existingConfigs?.[b.subjectKey]?.selectedChapterNums;
      const defaultLimit = defaultCounts[b.subjectKey] || b.chapters.length;
      configs[b.subjectKey] = {
        subjectKey: b.subjectKey,
        subjectName: b.subjectName,
        bookName: b.bookName,
        examDate: dateStr,
        examTime: '09:00',
        selectedChapterNums:
          existingSel && existingSel.length > 0
            ? existingSel
            : b.chapters.slice(0, defaultLimit).map((c) => c.number),
      };
    }
    return configs;
  };

  const [examConfigs, setExamConfigs] = useState<Record<string, SubjectExamConfig>>(() => {
    const saved = getUserItem(`studybot_exam_configs_c${currentClassNum}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return getDefaultExamConfigs(currentClassNum, primaryExamDate);
  });

  useEffect(() => {
    const saved = getUserItem(`studybot_exam_configs_c${currentClassNum}`);
    if (saved) {
      try {
        setExamConfigs(JSON.parse(saved));
        return;
      } catch {}
    }
    setExamConfigs(getDefaultExamConfigs(currentClassNum, primaryExamDate));
  }, [currentClassNum, currentUser?.email]);

  // Timetable slots
  const [timetable, setTimetable] = useState<TimetableSlot[]>(() => {
    const saved = getUserItem(`studybot_timetable_c${currentClassNum}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return [];
  });

  // Hydrate planner data from Firestore for active email ID
  useEffect(() => {
    if (!currentUser?.email) return;
    getUserPlannerData(currentUser.email, currentClassNum)
      .then((remote) => {
        if (remote) {
          if (remote.examConfigs && Object.keys(remote.examConfigs).length > 0) {
            setExamConfigs(remote.examConfigs);
            setUserItem(`studybot_exam_configs_c${currentClassNum}`, JSON.stringify(remote.examConfigs));
          }
          if (Array.isArray(remote.timetable) && remote.timetable.length > 0) {
            setTimetable(remote.timetable);
            setUserItem(`studybot_timetable_c${currentClassNum}`, JSON.stringify(remote.timetable));
          }
        }
      })
      .catch(() => {});
  }, [currentClassNum, currentUser?.email]);

  // Calculate days until the target exam date
  const totalDaysUntilExam = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = primaryExamDate ? new Date(`${primaryExamDate}T00:00:00`) : new Date(Date.now() + 25 * 86400000);
    if (isNaN(target.getTime())) return 18;
    const diffDays = Math.ceil((target.getTime() - today.getTime()) / 86400000);
    return Math.max(6, Math.min(90, diffDays > 0 ? diffDays : 18));
  }, [primaryExamDate]);

  // Generate Timetable Algorithm — builds structured daily study plan from selected chapters & exam date
  const generateTimetable = (
    configs: Record<string, SubjectExamConfig>,
    hours: number,
    windowPref: string,
    showFeedback = false,
    overrideExamDate?: string
  ) => {
    const books = getAllBooksForClass(currentClassNum);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetExamStr = overrideExamDate || primaryExamDate;
    const targetDate = targetExamStr ? new Date(`${targetExamStr}T00:00:00`) : new Date(Date.now() + 25 * 86400000);
    const rawDays = !isNaN(targetDate.getTime())
      ? Math.ceil((targetDate.getTime() - today.getTime()) / 86400000)
      : 18;
    const totalDays = Math.max(6, Math.min(90, rawDays > 0 ? rawDays : 18));

    const newSlots: TimetableSlot[] = [];

    const mathsBook = books.find((b) => b.subjectKey === 'maths') || books[0];
    const scienceBook = books.find((b) => b.subjectKey === 'science') || books[1] || books[0];
    const englishBook = books.find((b) => b.subjectKey === 'english') || books[2] || books[0];
    const sstBook = books.find((b) => b.subjectKey === 'sst') || books[3] || books[0];
    const hindiBook = books.find((b) => b.subjectKey === 'hindi') || books[4] || books[0];

    const getSelectedChs = (b: typeof mathsBook) => {
      const sel = configs[b.subjectKey]?.selectedChapterNums;
      if (Array.isArray(sel) && sel.length > 0) {
        const sortedNums = [...sel].sort((a, bNum) => a - bNum);
        const filtered = b.chapters.filter((c) => sortedNums.includes(c.number));
        if (filtered.length > 0) return filtered;
      }
      return b.chapters.slice(0, 6);
    };

    const mathsChs = getSelectedChs(mathsBook);
    const scienceChs = getSelectedChs(scienceBook);
    const englishChs = getSelectedChs(englishBook);
    const sstChs = getSelectedChs(sstBook);
    const hindiChs = getSelectedChs(hindiBook);

    let baseTimeHour = 16; // 04:00 PM
    if (windowPref === 'morning') baseTimeHour = 6;
    if (windowPref === 'night') baseTimeHour = 19;

    const fmtTime = (totalM: number) => {
      const h = Math.floor(totalM / 60) % 24;
      const m = totalM % 60;
      const period = h >= 12 ? 'PM' : 'AM';
      const displayH = h % 12 === 0 ? 12 : h % 12;
      return `${displayH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
    };

    const mainDuration = hours >= 4 ? '1h 30m' : hours <= 2 ? '45m' : '1h 30m';
    const pracDuration = hours >= 4 ? '1h 15m' : hours <= 2 ? '30m' : '1h 00m';

    for (let day = 0; day < totalDays; day++) {
      const d = new Date(today);
      d.setDate(d.getDate() + day);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = `Day ${day + 1}`;

      const mCh = mathsChs[day % mathsChs.length];
      const sCh = scienceChs[day % scienceChs.length];
      const eCh = englishChs[day % englishChs.length];
      const ssCh = sstChs[day % sstChs.length];
      const hCh = hindiChs[day % hindiChs.length];

      // Slot 1: Mathematics (Concept + Notes)
      newSlots.push({
        id: `slot-${day}-0-maths-${mCh.number}-${Date.now()}`,
        dayIndex: day,
        dateString: dateStr,
        dayLabel,
        startTime: fmtTime(baseTimeHour * 60),
        endTime: fmtTime(baseTimeHour * 60 + 90),
        durationLabel: mainDuration,
        taskType: 'concept',
        subjectKey: 'maths',
        subjectBadgeLabel: 'Mathematics',
        subjectName: mathsBook.subjectName,
        bookName: mathsBook.bookName,
        chapterNumber: mCh.number,
        chapterTitle: `${mCh.title} (Concept + Notes)`,
        completed: false,
      });

      // Slot 2: Mathematics Practice Questions (1–20) or Social Science on alternate days
      if (day % 2 === 0) {
        newSlots.push({
          id: `slot-${day}-1-maths-prac-${mCh.number}-${Date.now()}`,
          dayIndex: day,
          dateString: dateStr,
          dayLabel,
          startTime: fmtTime(baseTimeHour * 60 + 95),
          endTime: fmtTime(baseTimeHour * 60 + 155),
          durationLabel: pracDuration,
          taskType: 'practice',
          subjectKey: 'maths',
          subjectBadgeLabel: 'Mathematics',
          subjectName: mathsBook.subjectName,
          bookName: mathsBook.bookName,
          chapterNumber: mCh.number,
          chapterTitle:
            day === 0
              ? `Practice Questions (1–20)`
              : `Practice Questions (1–20) — ${mCh.title}`,
          completed: false,
        });
      } else {
        newSlots.push({
          id: `slot-${day}-1-sst-${ssCh.number}-${Date.now()}`,
          dayIndex: day,
          dateString: dateStr,
          dayLabel,
          startTime: fmtTime(baseTimeHour * 60 + 95),
          endTime: fmtTime(baseTimeHour * 60 + 155),
          durationLabel: pracDuration,
          taskType: 'concept',
          subjectKey: 'sst',
          subjectBadgeLabel: 'Social Science',
          subjectName: sstBook.subjectName,
          bookName: sstBook.bookName,
          chapterNumber: ssCh.number,
          chapterTitle: `${ssCh.title} (Concept + Notes)`,
          completed: false,
        });
      }

      // Slot 3: Science (Notes)
      newSlots.push({
        id: `slot-${day}-2-science-${sCh.number}-${Date.now()}`,
        dayIndex: day,
        dateString: dateStr,
        dayLabel,
        startTime: fmtTime(baseTimeHour * 60 + 160),
        endTime: fmtTime(baseTimeHour * 60 + 250),
        durationLabel: mainDuration,
        taskType: 'notes',
        subjectKey: 'science',
        subjectBadgeLabel: 'Science',
        subjectName: scienceBook.subjectName,
        bookName: scienceBook.bookName,
        chapterNumber: sCh.number,
        chapterTitle: `${sCh.title} (Notes)`,
        completed: false,
      });

      // Slot 4: English (Practice)
      newSlots.push({
        id: `slot-${day}-3-english-${eCh.number}-${Date.now()}`,
        dayIndex: day,
        dateString: dateStr,
        dayLabel,
        startTime: fmtTime(baseTimeHour * 60 + 255),
        endTime: fmtTime(baseTimeHour * 60 + 300),
        durationLabel: '45m',
        taskType: 'practice',
        subjectKey: 'english',
        subjectBadgeLabel: 'English',
        subjectName: englishBook.subjectName,
        bookName: englishBook.bookName,
        chapterNumber: eCh.number,
        chapterTitle:
          day === 0
            ? `Reading Comprehension (Practice)`
            : `${eCh.title} (Practice)`,
        completed: false,
      });

      // Slot 5: Revision (Previous Day Topics)
      newSlots.push({
        id: `slot-${day}-4-revision-${ssCh.number}-${Date.now()}`,
        dayIndex: day,
        dateString: dateStr,
        dayLabel,
        startTime: fmtTime(baseTimeHour * 60 + 305),
        endTime: fmtTime(baseTimeHour * 60 + 335),
        durationLabel: '30m',
        taskType: 'revision',
        subjectKey: day % 2 === 0 ? 'sst' : 'hindi',
        subjectBadgeLabel: 'Revision',
        subjectName: day % 2 === 0 ? sstBook.subjectName : hindiBook.subjectName,
        bookName: day % 2 === 0 ? sstBook.bookName : hindiBook.bookName,
        chapterNumber: day % 2 === 0 ? ssCh.number : hCh.number,
        chapterTitle:
          day === 0
            ? `Previous Day Topics`
            : `Rapid Revision — ${day % 2 === 0 ? ssCh.title : hCh.title}`,
        completed: false,
      });
    }

    setTimetable(newSlots);
    setSelectedDayIndex(0);
    setDayCarouselStart(0);
    setUserItem(`studybot_timetable_c${currentClassNum}`, JSON.stringify(newSlots));
    setUserItem(`studybot_exam_configs_c${currentClassNum}`, JSON.stringify(configs));

    saveUserPlannerData(currentUser?.email || '', currentClassNum, {
      dailyHours: hours,
      studyWindow: windowPref,
      examConfigs: configs,
      timetable: newSlots.slice(0, 120),
    }).catch(() => {});

    window.dispatchEvent(new CustomEvent('studybot:timetable-updated'));

    if (showFeedback) {
      const totalSelectedChCount = Object.values(configs).reduce(
        (sum, c) => sum + (c.selectedChapterNums?.length || 0),
        0
      );
      setRebalanceNotification(
        `✨ Personalized ${selectedExamType} Study Plan created (${totalSelectedChCount} chapters across ${totalDays} days until ${formatDisplayExamDate(targetExamStr)})!`
      );
      setTimeout(() => setRebalanceNotification(null), 5000);
    }
  };

  // Auto-generate on initial load if empty
  useEffect(() => {
    if (timetable.length === 0) {
      generateTimetable(examConfigs, dailyHours, studyWindow, false);
    }
  }, [currentClassNum]);

  // Handle "Generate My Study Plan" button in the hero card
  const handleGenerateHeroStudyPlan = () => {
    setIsGeneratingPlan(true);
    setUserItem(`studybot_primary_exam_date_c${currentClassNum}`, primaryExamDate);
    setUserItem(`studybot_exam_type_c${currentClassNum}`, selectedExamType);
    const updatedConfigs = getDefaultExamConfigs(currentClassNum, primaryExamDate, examConfigs);
    setExamConfigs(updatedConfigs);
    generateTimetable(updatedConfigs, dailyHours, studyWindow, true, primaryExamDate);
    setWizardOpen(true);
    setTimeout(() => {
      setIsGeneratingPlan(false);
      wizardSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 250);
  };

  // Toggle task completion
  const handleToggleComplete = (slotId: string) => {
    setTimetable((prev) => {
      const next = prev.map((s) => (s.id === slotId ? { ...s, completed: !s.completed } : s));
      setUserItem(`studybot_timetable_c${currentClassNum}`, JSON.stringify(next));
      saveUserPlannerData(currentUser?.email || '', currentClassNum, {
        dailyHours,
        studyWindow,
        examConfigs,
        timetable: next.slice(0, 120),
      }).catch(() => {});
      window.dispatchEvent(new CustomEvent('studybot:timetable-updated'));
      return next;
    });
    addStudyMinutes(45);
  };

  // Synchronize timetable if toggled from My Progress
  useEffect(() => {
    const handleTimetableSync = () => {
      const saved = getUserItem(`studybot_timetable_c${currentClassNum}`);
      if (saved) {
        try {
          setTimetable(JSON.parse(saved));
        } catch {}
      }
    };
    window.addEventListener('studybot:timetable-updated', handleTimetableSync);
    window.addEventListener('storage', handleTimetableSync);
    return () => {
      window.removeEventListener('studybot:timetable-updated', handleTimetableSync);
      window.removeEventListener('storage', handleTimetableSync);
    };
  }, [currentClassNum, currentUser?.email]);

  // Rebalance unfinished tasks from selected day to next day
  const handleRebalanceSchedule = () => {
    setTimetable((prev) => {
      const missedToday = prev.filter((s) => s.dayIndex === selectedDayIndex && !s.completed);
      if (missedToday.length === 0) {
        setRebalanceNotification('All tasks for this day are already completed! Great job!');
        setTimeout(() => setRebalanceNotification(null), 3500);
        return prev;
      }

      const next = prev.map((slot) => {
        if (slot.dayIndex === selectedDayIndex && !slot.completed) {
          return {
            ...slot,
            dayIndex: slot.dayIndex + 1,
            dayLabel: `Day ${slot.dayIndex + 2}`,
          };
        }
        return slot;
      });

      setUserItem(`studybot_timetable_c${currentClassNum}`, JSON.stringify(next));
      saveUserPlannerData(currentUser?.email || '', currentClassNum, {
        dailyHours,
        studyWindow,
        examConfigs,
        timetable: next.slice(0, 120),
      }).catch(() => {});
      setRebalanceNotification(
        `🔄 ${missedToday.length} pending task${
          missedToday.length > 1 ? 's have' : ' has'
        } been re-balanced into Day ${selectedDayIndex + 2}!`
      );
      setTimeout(() => setRebalanceNotification(null), 4000);
      return next;
    });
  };

  // Add custom task to current day
  const handleAddCustomTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTaskTitle.trim()) return;
    const books = getAllBooksForClass(currentClassNum);
    const book = books.find((b) => b.subjectKey === customTaskSubject) || books[0];
    const currentDayDate =
      dayTabs.find((d) => d.index === selectedDayIndex)?.date || new Date().toISOString().split('T')[0];

    const badgeMap: Record<string, string> = {
      maths: 'Mathematics',
      science: 'Science',
      english: 'English',
      sst: 'Social Science',
    };

    const newSlot: TimetableSlot = {
      id: `custom-${Date.now()}`,
      dayIndex: selectedDayIndex,
      dateString: currentDayDate,
      dayLabel: `Day ${selectedDayIndex + 1}`,
      startTime: '06:00 PM',
      endTime: '07:00 PM',
      durationLabel: customTaskDuration,
      taskType: 'concept',
      subjectKey: customTaskSubject,
      subjectBadgeLabel: badgeMap[customTaskSubject] || 'Mathematics',
      subjectName: book.subjectName,
      bookName: book.bookName,
      chapterNumber: 1,
      chapterTitle: customTaskTitle.trim(),
      completed: false,
    };

    const next = [...timetable, newSlot];
    setTimetable(next);
    setUserItem(`studybot_timetable_c${currentClassNum}`, JSON.stringify(next));
    setCustomTaskTitle('');
    setAddingCustomTask(false);
  };

  // Delete a task slot
  const handleDeleteSlot = (slotId: string) => {
    setTimetable((prev) => {
      const next = prev.filter((s) => s.id !== slotId);
      setUserItem(`studybot_timetable_c${currentClassNum}`, JSON.stringify(next));
      return next;
    });
    setOpenTaskMenuId(null);
  };

  // Open Drawer for a specific Slot and Action
  const handleOpenStudyKit = (slot: TimetableSlot, tab: 'notes' | 'solutions' | 'mock_test') => {
    const cleanSlot: TimetableSlot = {
      ...slot,
      chapterTitle: slot.chapterTitle
        .replace(/\s*\(Concept \+ Notes\)/i, '')
        .replace(/\s*\(Notes\)/i, '')
        .replace(/\s*\(Practice\)/i, '')
        .replace(/^Practice Questions \(1–20\) — /i, '')
        .replace(/^Reading Comprehension & /i, '')
        .replace(/^Previous Day Topics & /i, '')
        .replace(/^Rapid Revision — /i, ''),
    };
    setActiveSlot(cleanSlot);
    setDrawerTab(tab);
    setDrawerOpen(true);
    setOpenTaskMenuId(null);
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

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

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

  const handleSubmitQuiz = () => {
    if (!activeQuiz) return;
    setQuizTimerActive(false);
    setQuizSubmitted(true);

    let score = 0;
    activeQuiz.questions.forEach((q) => {
      const userAns = quizAnswers[q.id];
      if (userAns === q.correctAnswerIndex) {
        score += 2;
      } else {
        addMistake({
          testTopic: `${activeSlot?.bookName || 'NCERT'} - Ch ${activeSlot?.chapterNumber || 1}: ${
            activeSlot?.chapterTitle || 'Chapter Test'
          }`,
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

  // Unique days list
  const dayTabs = useMemo(() => {
    const days: { index: number; label: string; date: string; dayMonth: string; weekday: string; shortDate: string }[] =
      [];
    const seen = new Set<number>();
    timetable.forEach((s) => {
      if (!seen.has(s.dayIndex)) {
        seen.add(s.dayIndex);
        const formatted = formatDayHeaderDate(s.dateString);
        days.push({
          index: s.dayIndex,
          label: `Day ${s.dayIndex + 1}`,
          date: s.dateString,
          dayMonth: formatted.dayMonth,
          weekday: formatted.weekday,
          shortDate: formatted.shortDate,
        });
      }
    });
    return days.sort((a, b) => a.index - b.index);
  }, [timetable]);

  const activeDayMeta = useMemo(() => {
    const found = dayTabs.find((d) => d.index === selectedDayIndex);
    if (found) return found;
    const f = formatDayHeaderDate(new Date().toISOString().split('T')[0]);
    return {
      index: selectedDayIndex,
      label: `Day ${selectedDayIndex + 1}`,
      date: new Date().toISOString().split('T')[0],
      dayMonth: f.dayMonth,
      weekday: f.weekday,
      shortDate: f.shortDate,
    };
  }, [dayTabs, selectedDayIndex]);

  // Filter slots for Daily view (and optional search / subject filter)
  const dailySlots = useMemo(() => {
    let list = timetable.filter((s) => s.dayIndex === selectedDayIndex);
    if (selectedSubjectFilter) {
      list = list.filter((s) => s.subjectKey === selectedSubjectFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.chapterTitle.toLowerCase().includes(q) ||
          s.subjectName.toLowerCase().includes(q) ||
          (s.subjectBadgeLabel || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [timetable, selectedDayIndex, selectedSubjectFilter, searchQuery]);

  const displayedDailySlots = showAllDayTasks ? dailySlots : dailySlots.slice(0, 5);

  // Subject Summary Metrics for the 4 Subject Cards & Progress Ring (driven by selected chapters & exam date)
  const subjectStats = useMemo(() => {
    const books = getAllBooksForClass(currentClassNum);
    const getStats = (
      key: 'maths' | 'science' | 'english' | 'sst',
      defaultChapters: number,
      dayRatio: number
    ) => {
      const book = books.find((b) => b.subjectKey === key);
      const selectedNums = examConfigs[key]?.selectedChapterNums;
      const totalCh =
        selectedNums && selectedNums.length > 0
          ? selectedNums.length
          : book
          ? Math.min(book.totalChapters, defaultChapters)
          : defaultChapters;
      const completedChSet = new Set(
        timetable
          .filter(
            (s) =>
              s.subjectKey === key &&
              s.completed &&
              (!selectedNums || selectedNums.length === 0 || selectedNums.includes(s.chapterNumber))
          )
          .map((s) => s.chapterNumber)
      );
      const doneCh = Math.min(totalCh, completedChSet.size);
      const calculatedDays = Math.max(
        totalCh,
        Math.round(totalDaysUntilExam * dayRatio)
      );
      return {
        totalChapters: totalCh,
        completedChapters: doneCh,
        daysAllocated: calculatedDays,
        book,
      };
    };

    const maths = getStats('maths', 6, 0.9);
    const science = getStats('science', 7, 0.85);
    const english = getStats('english', 5, 0.65);
    const sst = getStats('sst', 6, 0.75);

    const totalChaptersSum =
      maths.totalChapters + science.totalChapters + english.totalChapters + sst.totalChapters;
    const completedChaptersSum =
      maths.completedChapters +
      science.completedChapters +
      english.completedChapters +
      sst.completedChapters;

    const totalCompletedTasks = timetable.filter((s) => s.completed).length;
    const overallPercent =
      completedChaptersSum > 0
        ? Math.min(100, Math.round((completedChaptersSum / Math.max(1, totalChaptersSum)) * 100))
        : totalCompletedTasks > 0
        ? Math.min(100, Math.round((totalCompletedTasks / Math.max(1, timetable.length)) * 100))
        : 0;

    return {
      maths,
      science,
      english,
      sst,
      totalChaptersSum,
      overallPercent,
    };
  }, [timetable, currentClassNum, examConfigs, totalDaysUntilExam]);

  // Exam badge date parts for "Upcoming Exams" right-column card
  const examBadgeParts = useMemo(() => {
    const d = primaryExamDate ? new Date(`${primaryExamDate}T00:00:00`) : new Date('2025-05-15T00:00:00');
    if (isNaN(d.getTime())) return { dayNum: '15', monthShort: 'May', fullLabel: '15 May 2025' };
    return {
      dayNum: String(d.getDate()).padStart(2, '0'),
      monthShort: d.toLocaleDateString('en-US', { month: 'short' }),
      fullLabel: formatDisplayExamDate(primaryExamDate),
    };
  }, [primaryExamDate]);

  const userDisplayName = currentUser?.displayName || profile.name || 'Aarav Sharma';
  const userInitial = userDisplayName.trim().charAt(0).toUpperCase() || 'A';

  const getSubjectPillStyle = (slot: TimetableSlot) => {
    const label = slot.subjectBadgeLabel || slot.subjectName;
    if (label === 'Revision' || slot.taskType === 'revision') {
      return { text: 'Revision', className: 'bg-gradient-to-r from-[#0d9488] to-[#14b8a6] text-white' };
    }
    switch (slot.subjectKey) {
      case 'maths':
        return { text: 'Mathematics', className: 'bg-gradient-to-r from-[#2563eb] to-[#3b82f6] text-white' };
      case 'science':
        return { text: 'Science', className: 'bg-gradient-to-r from-[#059669] to-[#10b981] text-white' };
      case 'english':
        return { text: 'English', className: 'bg-gradient-to-r from-[#7c3aed] to-[#8b5cf6] text-white' };
      case 'sst':
        return { text: 'Social Science', className: 'bg-gradient-to-r from-[#d97706] to-[#f59e0b] text-white' };
      case 'hindi':
        return { text: 'Hindi', className: 'bg-gradient-to-r from-[#db2777] to-[#ec4899] text-white' };
      default:
        return { text: label, className: 'bg-[#2563eb] text-white' };
    }
  };

  // Donut chart SVG geometry
  const donutRadius = 44;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const donutDashOffset =
    donutCircumference - (subjectStats.overallPercent / 100) * donutCircumference;

  const visibleCarouselDays = dayTabs.slice(dayCarouselStart, dayCarouselStart + 6);

  return (
    <div className="mx-auto max-w-[1300px] space-y-5 pb-16 font-['Sora'] text-slate-100 select-none">
      {/* TOP BAR: Search Bar + Notification Bell + User Profile Pill */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
          }}
          className="relative w-full max-w-[540px]"
        >
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search anything... (chapters, topics, questions)"
            className="w-full rounded-full border border-[#1d2f52] bg-[#0c162c]/95 py-2.5 pl-11 pr-9 text-xs md:text-sm text-slate-100 placeholder-slate-400 shadow-inner focus:border-[#3b82f6] focus:outline-none transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </form>

        <div className="flex items-center gap-3.5">
          {/* Notification Bell with Red Dot */}
          <button
            type="button"
            onClick={() => setActiveTab('/reminders')}
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#1e3156] bg-[#0c162c] text-slate-200 hover:border-blue-500/50 hover:text-white transition-colors cursor-pointer"
            title="Study Reminders & Notifications"
          >
            <Bell className="h-[18px] w-[18px]" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-[#0c162c]" />
          </button>

          {/* User Avatar & Name Pill */}
          <button
            type="button"
            onClick={() => setCustomizeOpen(true)}
            className="flex items-center gap-2.5 rounded-full border border-[#1e3156] bg-[#0c162c]/90 py-1.5 pl-2 pr-3.5 hover:border-blue-500/50 transition-all cursor-pointer"
            title="Customize Profile & Class"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#3b82f6] to-[#2563eb] text-sm font-bold text-white shadow-md">
              {userInitial}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-xs font-bold text-white leading-tight">{userDisplayName}</div>
              <div className="text-[10.5px] text-slate-400 leading-tight">{profile.classLevel}</div>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 ml-0.5" />
          </button>
        </div>
      </div>

      {/* Rebalance / Plan Generated Notification Toast */}
      {rebalanceNotification && (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-500/40 bg-emerald-950/80 px-4 py-3 text-xs font-semibold text-emerald-200 shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{rebalanceNotification}</span>
          </div>
          <button
            type="button"
            onClick={() => setRebalanceNotification(null)}
            className="text-emerald-300 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* MAIN 2-COLUMN GRID (Left 8 cols + Right 4 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* ==================== LEFT COLUMN (8 COLS) ==================== */}
        <div className="xl:col-span-8 space-y-5">
          {/* 1. HERO CARD: Plan Your Exam Preparation */}
          <div
            className="relative overflow-hidden rounded-[22px] border border-[#1f3461] p-5 md:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.55)]"
            style={{
              background:
                'radial-gradient(circle at 18% 50%, rgba(37, 99, 235, 0.22), transparent 55%), radial-gradient(circle at 85% 20%, rgba(99, 102, 241, 0.18), transparent 50%), linear-gradient(135deg, #0c1a36 0%, #091328 60%, #0a152c 100%)',
            }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Left 7 cols: 3D Calendar Illustration + Heading + Description */}
              <div className="lg:col-span-7 flex flex-col sm:flex-row items-start sm:items-center gap-5">
                {/* 3D Calendar with Checkmark Badge SVG */}
                <div className="relative shrink-0">
                  <svg
                    className="h-28 w-28 drop-shadow-[0_12px_24px_rgba(37,99,235,0.4)]"
                    viewBox="0 0 120 120"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Subtle Back Shadow */}
                    <ellipse cx="58" cy="108" rx="38" ry="6" fill="#030712" opacity="0.55" />
                    {/* Calendar Base Body */}
                    <rect
                      x="14"
                      y="22"
                      width="82"
                      height="78"
                      rx="14"
                      fill="url(#calBodyGrad)"
                      stroke="#93C5FD"
                      strokeWidth="1.5"
                    />
                    {/* Calendar Blue Top Header */}
                    <path
                      d="M14 36C14 28.268 20.268 22 28 22H82C89.732 22 96 28.268 96 36V44H14V36Z"
                      fill="url(#calHeaderGrad)"
                    />
                    {/* 3 Top Spiral Rings */}
                    <rect x="30" y="13" width="7" height="16" rx="3.5" fill="#60A5FA" stroke="#DBEAFE" strokeWidth="1.2" />
                    <rect x="51" y="13" width="7" height="16" rx="3.5" fill="#60A5FA" stroke="#DBEAFE" strokeWidth="1.2" />
                    <rect x="72" y="13" width="7" height="16" rx="3.5" fill="#60A5FA" stroke="#DBEAFE" strokeWidth="1.2" />

                    {/* Calendar Grid Squares */}
                    <rect x="24" y="52" width="12" height="10" rx="2.5" fill="#3B82F6" opacity="0.85" />
                    <rect x="41" y="52" width="12" height="10" rx="2.5" fill="#60A5FA" opacity="0.65" />
                    <rect x="58" y="52" width="12" height="10" rx="2.5" fill="#60A5FA" opacity="0.65" />
                    <rect x="75" y="52" width="12" height="10" rx="2.5" fill="#93C5FD" opacity="0.5" />

                    <rect x="24" y="67" width="12" height="10" rx="2.5" fill="#60A5FA" opacity="0.65" />
                    <rect x="41" y="67" width="12" height="10" rx="2.5" fill="#2563EB" />
                    <rect x="58" y="67" width="12" height="10" rx="2.5" fill="#60A5FA" opacity="0.65" />
                    <rect x="75" y="67" width="12" height="10" rx="2.5" fill="#93C5FD" opacity="0.45" />

                    <rect x="24" y="82" width="12" height="10" rx="2.5" fill="#60A5FA" opacity="0.55" />
                    <rect x="41" y="82" width="12" height="10" rx="2.5" fill="#60A5FA" opacity="0.55" />
                    <rect x="58" y="82" width="12" height="10" rx="2.5" fill="#93C5FD" opacity="0.45" />

                    {/* Glowing Blue Checkmark Badge */}
                    <circle
                      cx="88"
                      cy="84"
                      r="19"
                      fill="url(#checkBadgeGrad)"
                      stroke="#BFDBFE"
                      strokeWidth="2"
                    />
                    <path
                      d="M80 84.5L85.5 90L96.5 79"
                      stroke="white"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    <defs>
                      <linearGradient id="calBodyGrad" x1="55" y1="22" x2="55" y2="100" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#EFF6FF" />
                        <stop offset="1" stopColor="#BFDBFE" />
                      </linearGradient>
                      <linearGradient id="calHeaderGrad" x1="14" y1="22" x2="96" y2="44" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#2563EB" />
                        <stop offset="1" stopColor="#3B82F6" />
                      </linearGradient>
                      <linearGradient id="checkBadgeGrad" x1="69" y1="65" x2="107" y2="103" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#3B82F6" />
                        <stop offset="1" stopColor="#1D4ED8" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>

                {/* Title & Subtitle */}
                <div className="space-y-2">
                  <h1 className="text-xl md:text-[24px] font-extrabold tracking-tight text-white leading-snug">
                    Plan Your Exam Preparation
                  </h1>
                  <p className="text-xs md:text-[13.5px] text-slate-300 leading-relaxed">
                    Select your exam date and let Study Bot AI create a personalized study plan with all the important chapters, topics and practice sessions for you.
                  </p>
                </div>
              </div>

              {/* Right 5 cols: Exam Date, Exam Type, Chapter Selector & Generate Button */}
              <div className="lg:col-span-5 rounded-2xl border border-[#233a69] bg-[#0d1933]/90 p-4 shadow-inner space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Select Exam Date */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-slate-200">
                      Select Exam Date
                    </label>
                    <div
                      onClick={() => {
                        if (dateInputRef.current) {
                          if ('showPicker' in HTMLInputElement.prototype) {
                            try {
                              dateInputRef.current.showPicker();
                              return;
                            } catch {}
                          }
                          dateInputRef.current.focus();
                        }
                      }}
                      className="relative flex items-center justify-between rounded-xl border border-[#294378] bg-[#122244] px-3 py-2.5 text-xs font-semibold text-white hover:border-[#3b82f6] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Calendar className="h-3.5 w-3.5 text-[#60a5fa] shrink-0" />
                        <span className="truncate">{formatDisplayExamDate(primaryExamDate)}</span>
                      </div>
                      <CalendarDays className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-1" />
                      <input
                        ref={dateInputRef}
                        type="date"
                        value={primaryExamDate}
                        onChange={(e) => {
                          if (e.target.value) {
                            const newDate = e.target.value;
                            setPrimaryExamDate(newDate);
                            setUserItem(`studybot_primary_exam_date_c${currentClassNum}`, newDate);
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </div>
                  </div>

                  {/* Select Exam Type */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-semibold text-slate-200">
                      Select Exam Type
                    </label>
                    <div className="relative">
                      <select
                        value={selectedExamType}
                        onChange={(e) => {
                          setSelectedExamType(e.target.value);
                          setUserItem(`studybot_exam_type_c${currentClassNum}`, e.target.value);
                        }}
                        className="w-full appearance-none rounded-xl border border-[#294378] bg-[#122244] py-2.5 pl-3 pr-8 text-xs font-semibold text-white hover:border-[#3b82f6] focus:border-[#3b82f6] focus:outline-none transition-colors cursor-pointer truncate"
                      >
                        {EXAM_TYPE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt} className="bg-[#0d1830] text-white">
                            {opt}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-300" />
                    </div>
                  </div>
                </div>

                {/* Quick Select Chapters & Exam Dates Trigger Bar */}
                <button
                  type="button"
                  onClick={() => setWizardOpen((prev) => !prev)}
                  className="flex w-full items-center justify-between rounded-xl border border-[#294378] bg-[#122244]/85 px-3 py-2 text-xs text-slate-200 hover:border-[#60a5fa] hover:text-white transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2 truncate">
                    <BookOpen className="h-3.5 w-3.5 text-[#60a5fa] shrink-0" />
                    <span className="font-semibold truncate">
                      Select Chapters ({subjectStats.totalChaptersSum} Chapters Selected)
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-[#60a5fa] shrink-0 ml-2">
                    {wizardOpen ? 'Hide ▲' : 'Choose ▼'}
                  </span>
                </button>

                {/* Generate My Study Plan Button */}
                <button
                  type="button"
                  onClick={handleGenerateHeroStudyPlan}
                  disabled={isGeneratingPlan}
                  className="w-full rounded-xl bg-gradient-to-r from-[#3b82f6] via-[#5865f2] to-[#7c5cff] py-3 px-4 text-xs md:text-sm font-bold text-white shadow-[0_8px_25px_rgba(88,101,242,0.45)] hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
                >
                  <Sparkles className={`h-4 w-4 fill-white ${isGeneratingPlan ? 'animate-spin' : ''}`} />
                  <span>
                    {isGeneratingPlan ? 'Creating Your Study Plan...' : 'Generate My Study Plan'}
                  </span>
                </button>

                <p className="text-center text-[10.5px] text-slate-400">
                  AI will analyse your syllabus and create a complete plan.
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Study Plan Creator: Select Exam Date & Chapters */}
          {wizardOpen && (
            <div
              ref={wizardSectionRef}
              className="rounded-[22px] border border-[#3b82f6]/50 bg-[#0b152b] p-5 md:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.65)] space-y-5 animate-in fade-in duration-200"
            >
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e335c] pb-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/25 border border-blue-500/40 text-[#60a5fa]">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base md:text-lg font-extrabold text-white">
                      Create Study Plan — Select Exam Date &amp; Chapters
                    </h2>
                    <p className="text-xs text-slate-300">
                      Choose your exam date and check the chapters you want to include in your daily study plan.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRebalanceSchedule}
                    className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/25 transition-all cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Re-balance Missed</span>
                  </button>
                  <select
                    value={profile.classLevel}
                    onChange={(e) => updateProfile({ classLevel: e.target.value })}
                    className="rounded-xl border border-[#294378] bg-[#122244] px-3 py-1.5 text-xs font-bold text-white focus:border-blue-500 focus:outline-none cursor-pointer"
                  >
                    <option value="Class 4">Class 4</option>
                    <option value="Class 5">Class 5</option>
                    <option value="Class 6">Class 6</option>
                    <option value="Class 7">Class 7</option>
                    <option value="Class 8">Class 8</option>
                    <option value="Class 9">Class 9</option>
                    <option value="Class 10">Class 10</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setWizardOpen(false)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* STEP 1: Date of Exam & Quick Presets */}
              <div className="rounded-2xl border border-[#1f3461] bg-[#0e1b36] p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-extrabold uppercase tracking-wider text-[#60a5fa]">
                      Step 1 • Select Date of Exam
                    </div>
                    <div className="text-xs text-slate-300 mt-0.5">
                      Your study plan will schedule tasks across <strong>{totalDaysUntilExam} days</strong> up to{' '}
                      <strong className="text-white">{formatDisplayExamDate(primaryExamDate)}</strong>.
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      value={primaryExamDate}
                      onChange={(e) => {
                        if (e.target.value) {
                          setPrimaryExamDate(e.target.value);
                          setUserItem(`studybot_primary_exam_date_c${currentClassNum}`, e.target.value);
                        }
                      }}
                      className="rounded-xl border border-[#3b82f6] bg-[#122244] px-3 py-2 text-xs font-bold text-white focus:outline-none cursor-pointer"
                    />
                    {[
                      { label: '+15 Days', days: 15 },
                      { label: '+25 Days', days: 25 },
                      { label: '+45 Days', days: 45 },
                      { label: '+60 Days', days: 60 },
                    ].map((preset) => (
                      <button
                        key={preset.days}
                        type="button"
                        onClick={() => {
                          const d = new Date();
                          d.setDate(d.getDate() + preset.days);
                          const iso = d.toISOString().split('T')[0];
                          setPrimaryExamDate(iso);
                          setUserItem(`studybot_primary_exam_date_c${currentClassNum}`, iso);
                        }}
                        className="rounded-lg border border-[#284275] bg-[#132344] px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 hover:border-[#60a5fa] hover:text-white transition-colors cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* STEP 2: Select Chapters Per Subject */}
              <div className="rounded-2xl border border-[#1f3461] bg-[#0e1b36] p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-extrabold uppercase tracking-wider text-[#60a5fa]">
                      Step 2 • Select Chapters for Each Subject
                    </div>
                    <div className="text-xs text-slate-300 mt-0.5">
                      Click a subject below and check or uncheck the chapters for your exam syllabus.
                    </div>
                  </div>
                  <span className="rounded-full border border-blue-500/40 bg-blue-500/15 px-3 py-1 text-xs font-bold text-blue-300">
                    Total Selected: {subjectStats.totalChaptersSum} Chapters
                  </span>
                </div>

                {/* Subject Selector Tabs */}
                <div className="flex flex-wrap gap-2">
                  {getAllBooksForClass(currentClassNum).map((b) => {
                    const cfg = examConfigs[b.subjectKey];
                    const selCount = cfg?.selectedChapterNums?.length ?? b.chapters.length;
                    const isActive = wizardSubjectTab === b.subjectKey;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setWizardSubjectTab(b.subjectKey)}
                        className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                          isActive
                            ? 'border-[#60a5fa] bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] text-white shadow-md'
                            : 'border-[#253c68] bg-[#122244] text-slate-300 hover:border-[#3b82f6] hover:text-white'
                        }`}
                      >
                        <span>{b.subjectName}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10.5px] ${
                            isActive ? 'bg-white/20 text-white' : 'bg-[#0b152b] text-[#60a5fa]'
                          }`}
                        >
                          {selCount}/{b.chapters.length}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Active Subject Chapter Checklist */}
                {(() => {
                  const activeBook =
                    getAllBooksForClass(currentClassNum).find(
                      (b) => b.subjectKey === wizardSubjectTab
                    ) || getAllBooksForClass(currentClassNum)[0];
                  if (!activeBook) return null;

                  const cfg = examConfigs[activeBook.subjectKey] || {
                    subjectKey: activeBook.subjectKey,
                    subjectName: activeBook.subjectName,
                    bookName: activeBook.bookName,
                    examDate: primaryExamDate,
                    examTime: '09:00',
                    selectedChapterNums: activeBook.chapters.map((c) => c.number),
                  };
                  const selectedNums = cfg.selectedChapterNums || [];

                  return (
                    <div className="space-y-3 pt-1">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-white">
                            {activeBook.subjectName} ({activeBook.bookName})
                          </span>
                          <div className="flex items-center gap-1.5 text-xs text-slate-300">
                            <span>Subject Exam Date:</span>
                            <input
                              type="date"
                              value={cfg.examDate || primaryExamDate}
                              onChange={(e) =>
                                setExamConfigs((prev) => ({
                                  ...prev,
                                  [activeBook.subjectKey]: {
                                    ...cfg,
                                    examDate: e.target.value,
                                  },
                                }))
                              }
                              className="rounded-lg border border-[#294378] bg-[#0b152b] px-2.5 py-1 text-xs text-white"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setExamConfigs((prev) => ({
                                ...prev,
                                [activeBook.subjectKey]: {
                                  ...cfg,
                                  selectedChapterNums: activeBook.chapters.map((c) => c.number),
                                },
                              }))
                            }
                            className="rounded-lg border border-blue-500/40 bg-blue-500/15 px-2.5 py-1 text-[11px] font-bold text-blue-300 hover:bg-blue-500/25 cursor-pointer"
                          >
                            Select All ({activeBook.chapters.length})
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setExamConfigs((prev) => ({
                                ...prev,
                                [activeBook.subjectKey]: {
                                  ...cfg,
                                  selectedChapterNums: activeBook.chapters
                                    .slice(0, Math.min(5, activeBook.chapters.length))
                                    .map((c) => c.number),
                                },
                              }))
                            }
                            className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-white cursor-pointer"
                          >
                            First 5 Chapters
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setExamConfigs((prev) => ({
                                ...prev,
                                [activeBook.subjectKey]: {
                                  ...cfg,
                                  selectedChapterNums: [activeBook.chapters[0]?.number || 1],
                                },
                              }))
                            }
                            className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-white cursor-pointer"
                          >
                            Reset to Ch 1
                          </button>
                        </div>
                      </div>

                      {/* Grid of Clickable Chapter Checkboxes */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                        {activeBook.chapters.map((ch) => {
                          const isChecked = selectedNums.includes(ch.number);
                          return (
                            <label
                              key={ch.number}
                              className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-xs transition-all cursor-pointer ${
                                isChecked
                                  ? 'border-[#3b82f6] bg-[#162b54] text-white shadow-sm'
                                  : 'border-[#1f3259] bg-[#0b152b]/80 text-slate-400 hover:border-blue-500/40 hover:text-slate-200'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  const nextNums = isChecked
                                    ? selectedNums.length > 1
                                      ? selectedNums.filter((n) => n !== ch.number)
                                      : selectedNums
                                    : [...selectedNums, ch.number].sort((a, bNum) => a - bNum);
                                  setExamConfigs((prev) => ({
                                    ...prev,
                                    [activeBook.subjectKey]: {
                                      ...cfg,
                                      selectedChapterNums: nextNums,
                                    },
                                  }));
                                }}
                                className="h-4 w-4 rounded border-white/25 bg-[#0b152b] text-blue-500 accent-blue-500 cursor-pointer shrink-0"
                              />
                              <span className="truncate font-medium">
                                <strong className="text-[#93c5fd]">Ch {ch.number}:</strong> {ch.title}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* STEP 3: Daily Hours & Study Window + Create Study Plan Button */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="rounded-2xl border border-[#1f3461] bg-[#0e1b36] p-3.5">
                  <div className="flex justify-between text-xs font-bold text-white mb-2">
                    <span>Daily Study Capacity:</span>
                    <span className="text-[#60a5fa]">{dailyHours} Hours / Day</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="8"
                    value={dailyHours}
                    onChange={(e) => setDailyHours(parseInt(e.target.value, 10))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>

                <div className="rounded-2xl border border-[#1f3461] bg-[#0e1b36] p-3.5">
                  <div className="text-xs font-bold text-white mb-2">Preferred Study Window:</div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'morning', label: 'Morning', icon: Sun },
                      { key: 'evening', label: 'Evening', icon: Sunset },
                      { key: 'night', label: 'Night', icon: Moon },
                    ].map((w) => {
                      const Icon = w.icon;
                      const isSel = studyWindow === w.key;
                      return (
                        <button
                          key={w.key}
                          type="button"
                          onClick={() => setStudyWindow(w.key as any)}
                          className={`flex items-center justify-center gap-1.5 rounded-xl py-1.5 px-2 text-xs font-bold transition-all cursor-pointer ${
                            isSel
                              ? 'border border-blue-500 bg-blue-600/30 text-white'
                              : 'border border-white/10 bg-[#0b152b] text-slate-400 hover:text-white'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5 text-blue-400" />
                          <span>{w.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setWizardOpen(false)}
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserItem(`studybot_primary_exam_date_c${currentClassNum}`, primaryExamDate);
                    setUserItem(`studybot_exam_type_c${currentClassNum}`, selectedExamType);
                    generateTimetable(examConfigs, dailyHours, studyWindow, true, primaryExamDate);
                    setWizardOpen(false);
                    setTimeout(() => {
                      planResultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 150);
                  }}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#3b82f6] via-[#5865f2] to-[#7c5cff] px-6 py-2.5 text-xs md:text-sm font-bold text-white shadow-[0_8px_25px_rgba(88,101,242,0.45)] hover:brightness-110 transition-all cursor-pointer"
                >
                  <Sparkles className="h-4 w-4 fill-white" />
                  <span>
                    Create Study Plan ({subjectStats.totalChaptersSum} Chapters • {totalDaysUntilExam} Days)
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* 2. MIDDLE CARD: Your Personalized Study Plan */}
          <div
            ref={planResultsRef}
            className="rounded-[22px] border border-[#1d2f52] bg-[#0a1326]/95 p-5 md:p-6 shadow-[0_18px_45px_rgba(0,0,0,0.5)] space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#3b82f6]/25 to-[#8b5cf6]/25 border border-[#4f6ef7]/40 text-[#818cf8]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base md:text-[18px] font-extrabold text-white leading-tight">
                    Your Personalized Study Plan
                  </h2>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Based on your exam date ({formatDisplayExamDate(primaryExamDate)}) and CBSE syllabus
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedSubjectFilter && (
                  <button
                    type="button"
                    onClick={() => setSelectedSubjectFilter(null)}
                    className="rounded-xl border border-blue-500/40 bg-blue-500/15 px-3 py-2 text-xs font-semibold text-blue-300 hover:text-white transition-colors cursor-pointer"
                  >
                    Show All Subjects ✕
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setWizardOpen((prev) => !prev)}
                  className="flex items-center gap-2 rounded-xl border border-[#263c66] bg-[#101d38] px-3.5 py-2 text-xs font-semibold text-slate-200 hover:border-[#3b82f6] hover:text-white transition-all cursor-pointer"
                >
                  <Pencil className="h-3.5 w-3.5 text-slate-300" />
                  <span>Edit Plan</span>
                </button>
              </div>
            </div>

            {/* 4 Subject Summary Cards Row matching Screenshot */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
              {/* Card 1: Mathematics */}
              <button
                type="button"
                onClick={() =>
                  setSelectedSubjectFilter((prev) => (prev === 'maths' ? null : 'maths'))
                }
                className={`group relative flex items-center justify-between rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                  selectedSubjectFilter === 'maths'
                    ? 'border-[#60a5fa] ring-2 ring-[#3b82f6]/40 bg-gradient-to-br from-[#18346e] to-[#0f224a]'
                    : 'border-[#213d73] bg-gradient-to-br from-[#132852]/95 to-[#0d1c3a]/95 hover:border-[#3b82f6]'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#3b82f6] to-[#2563eb] text-white shadow-md">
                    <Calculator className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs md:text-[14px] font-bold text-white truncate">
                      Mathematics
                    </div>
                    <div className="text-[11.5px] text-slate-300 mt-1">
                      {subjectStats.maths.totalChapters} Chapters
                    </div>
                    <div className="text-[11px] text-[#60a5fa] mt-0.5 font-medium">
                      {subjectStats.maths.daysAllocated} Days
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>

              {/* Card 2: Science */}
              <button
                type="button"
                onClick={() =>
                  setSelectedSubjectFilter((prev) => (prev === 'science' ? null : 'science'))
                }
                className={`group relative flex items-center justify-between rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                  selectedSubjectFilter === 'science'
                    ? 'border-[#34d399] ring-2 ring-[#10b981]/40 bg-gradient-to-br from-[#11423e] to-[#0b2b29]'
                    : 'border-[#184d47] bg-gradient-to-br from-[#0e3330]/95 to-[#092220]/95 hover:border-[#10b981]'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#10b981] to-[#059669] text-white shadow-md">
                    <FlaskConical className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs md:text-[14px] font-bold text-white truncate">
                      Science
                    </div>
                    <div className="text-[11.5px] text-slate-300 mt-1">
                      {subjectStats.science.totalChapters} Chapters
                    </div>
                    <div className="text-[11px] text-[#34d399] mt-0.5 font-medium">
                      {subjectStats.science.daysAllocated} Days
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>

              {/* Card 3: English */}
              <button
                type="button"
                onClick={() =>
                  setSelectedSubjectFilter((prev) => (prev === 'english' ? null : 'english'))
                }
                className={`group relative flex items-center justify-between rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                  selectedSubjectFilter === 'english'
                    ? 'border-[#a855f7] ring-2 ring-[#a855f7]/40 bg-gradient-to-br from-[#372263] to-[#231542]'
                    : 'border-[#3d2966] bg-gradient-to-br from-[#271945]/95 to-[#1a1030]/95 hover:border-[#a855f7]'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#a855f7] to-[#7e22ce] text-white shadow-md">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs md:text-[14px] font-bold text-white truncate">
                      English
                    </div>
                    <div className="text-[11.5px] text-slate-300 mt-1">
                      {subjectStats.english.totalChapters} Chapters
                    </div>
                    <div className="text-[11px] text-[#c084fc] mt-0.5 font-medium">
                      {subjectStats.english.daysAllocated} Days
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>

              {/* Card 4: Social Science */}
              <button
                type="button"
                onClick={() =>
                  setSelectedSubjectFilter((prev) => (prev === 'sst' ? null : 'sst'))
                }
                className={`group relative flex items-center justify-between rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                  selectedSubjectFilter === 'sst'
                    ? 'border-[#f59e0b] ring-2 ring-[#f59e0b]/40 bg-gradient-to-br from-[#472e19] to-[#2e1d10]'
                    : 'border-[#543720] bg-gradient-to-br from-[#332215]/95 to-[#21160d]/95 hover:border-[#f59e0b]'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#f59e0b] to-[#d97706] text-white shadow-md">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs md:text-[14px] font-bold text-white truncate">
                      Social Science
                    </div>
                    <div className="text-[11.5px] text-slate-300 mt-1">
                      {subjectStats.sst.totalChapters} Chapters
                    </div>
                    <div className="text-[11px] text-[#fbbf24] mt-0.5 font-medium">
                      {subjectStats.sst.daysAllocated} Days
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            </div>
          </div>

          {/* 3. BOTTOM CARD: Day-wise Plan | Chapter-wise Plan | Syllabus Overview + Tasks */}
          <div className="rounded-[22px] border border-[#1d2f52] bg-[#0a1326]/95 p-5 md:p-6 shadow-[0_18px_45px_rgba(0,0,0,0.5)] space-y-5">
            {/* Top Segmented Tabs + View Calendar Button */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center rounded-xl border border-[#22365e] bg-[#0e1a33] p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('daily')}
                  className={`rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'daily'
                      ? 'bg-gradient-to-r from-[#1d63ed] to-[#2563eb] text-white shadow-[0_4px_14px_rgba(37,99,235,0.45)]'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Day-wise Plan
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('chapter')}
                  className={`rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'chapter'
                      ? 'bg-gradient-to-r from-[#1d63ed] to-[#2563eb] text-white shadow-[0_4px_14px_rgba(37,99,235,0.45)]'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Chapter-wise Plan
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('syllabus')}
                  className={`rounded-lg px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'syllabus'
                      ? 'bg-gradient-to-r from-[#1d63ed] to-[#2563eb] text-white shadow-[0_4px_14px_rgba(37,99,235,0.45)]'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Syllabus Overview
                </button>
              </div>

              <button
                type="button"
                onClick={() => setCalendarModalOpen(true)}
                className="flex items-center gap-2 rounded-xl border border-[#263c66] bg-[#101d38] px-3.5 py-2 text-xs font-semibold text-slate-200 hover:border-[#3b82f6] hover:text-white transition-all cursor-pointer"
              >
                <CalendarDays className="h-3.5 w-3.5 text-[#60a5fa]" />
                <span>View Calendar</span>
              </button>
            </div>

            {/* TAB 1: DAY-WISE PLAN */}
            {viewMode === 'daily' && (
              <div className="space-y-4">
                {/* Inner Day Container Card */}
                <div className="rounded-2xl border border-[#1b2d50] bg-[#0c172e]/90 overflow-hidden">
                  {/* Selected Day Header Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#192a4a] px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#162b52] text-[#60a5fa]">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div className="flex items-center gap-2 text-sm md:text-[15px]">
                        <span className="font-extrabold text-white">{activeDayMeta.label}</span>
                        <span className="text-slate-600">|</span>
                        <span className="font-medium text-slate-200">{activeDayMeta.shortDate}</span>
                        <span className="font-medium text-[#60a5fa]">({activeDayMeta.weekday})</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setAddingCustomTask((prev) => !prev)}
                      className="flex items-center gap-1 text-xs font-semibold text-[#60a5fa] hover:text-white transition-colors cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Task</span>
                    </button>
                  </div>

                  {/* Optional Inline Custom Task Form */}
                  {addingCustomTask && (
                    <form
                      onSubmit={handleAddCustomTask}
                      className="flex flex-wrap items-center gap-2 border-b border-[#192a4a] bg-[#091224] px-4 py-3"
                    >
                      <select
                        value={customTaskSubject}
                        onChange={(e) => setCustomTaskSubject(e.target.value as any)}
                        className="rounded-lg border border-[#253c68] bg-[#101d38] px-2.5 py-1.5 text-xs font-semibold text-white"
                      >
                        <option value="maths">Mathematics</option>
                        <option value="science">Science</option>
                        <option value="english">English</option>
                        <option value="sst">Social Science</option>
                      </select>
                      <input
                        type="text"
                        value={customTaskTitle}
                        onChange={(e) => setCustomTaskTitle(e.target.value)}
                        placeholder="Enter chapter or practice topic..."
                        className="flex-1 min-w-[180px] rounded-lg border border-[#253c68] bg-[#101d38] px-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none"
                      />
                      <select
                        value={customTaskDuration}
                        onChange={(e) => setCustomTaskDuration(e.target.value)}
                        className="rounded-lg border border-[#253c68] bg-[#101d38] px-2.5 py-1.5 text-xs text-white"
                      >
                        <option value="30m">30m</option>
                        <option value="45m">45m</option>
                        <option value="1h 00m">1h 00m</option>
                        <option value="1h 30m">1h 30m</option>
                      </select>
                      <button
                        type="submit"
                        className="rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs font-bold text-white cursor-pointer"
                      >
                        Save
                      </button>
                    </form>
                  )}

                  {/* Task Rows */}
                  <div className="divide-y divide-[#172644]">
                    {displayedDailySlots.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400">
                        No study tasks match your filter. Click &ldquo;Generate My Study Plan&rdquo; above to reset.
                      </div>
                    ) : (
                      displayedDailySlots.map((slot) => {
                        const pill = getSubjectPillStyle(slot);
                        const isMenuOpen = openTaskMenuId === slot.id;

                        return (
                          <div
                            key={slot.id}
                            className={`relative flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 px-4 py-3.5 transition-colors ${
                              slot.completed
                                ? 'bg-emerald-950/15 hover:bg-emerald-950/25'
                                : 'hover:bg-white/[0.025]'
                            }`}
                          >
                            {/* Left: Checkbox + Subject Pill + Task Title */}
                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={() => handleToggleComplete(slot.id)}
                                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-[#324d80] bg-[#0e1a33] text-white hover:border-[#60a5fa] transition-colors cursor-pointer"
                                title={slot.completed ? 'Mark as Pending' : 'Mark as Completed'}
                              >
                                {slot.completed && (
                                  <div className="flex h-full w-full items-center justify-center rounded-[5px] bg-emerald-500 text-white">
                                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                                  </div>
                                )}
                              </button>

                              <span
                                className={`w-[108px] shrink-0 rounded-full py-1 px-2.5 text-center text-[11px] font-bold shadow-sm ${pill.className}`}
                              >
                                {pill.text}
                              </span>

                              <button
                                type="button"
                                onClick={() => handleOpenStudyKit(slot, 'notes')}
                                className={`text-left text-xs md:text-[13.5px] font-medium truncate hover:text-[#60a5fa] transition-colors cursor-pointer ${
                                  slot.completed ? 'line-through text-slate-400' : 'text-slate-100'
                                }`}
                                title="Click to open AI Notes, NCERT Solutions & Quiz for this topic"
                              >
                                {slot.chapterTitle}
                              </button>
                            </div>

                            {/* Right: Duration + Status Pill + Three-dots Menu */}
                            <div className="flex items-center gap-3 shrink-0 ml-8 sm:ml-0">
                              <div className="flex items-center gap-1.5 text-xs text-slate-300 min-w-[68px]">
                                <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span>{slot.durationLabel || '1h 00m'}</span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleToggleComplete(slot.id)}
                                className={`rounded-full px-3 py-1 text-[11px] font-semibold border transition-colors cursor-pointer ${
                                  slot.completed
                                    ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                                    : 'border-[#253b66] bg-[#132240] text-[#93c5fd] hover:border-[#3b82f6]'
                                }`}
                              >
                                {slot.completed ? 'Completed' : 'Pending'}
                              </button>

                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenTaskMenuId(isMenuOpen ? null : slot.id)
                                  }
                                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                                  aria-label="Task actions"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </button>

                                {isMenuOpen && (
                                  <div className="absolute right-0 top-full mt-1 z-30 w-48 rounded-xl border border-[#263d69] bg-[#0b152b] p-1.5 shadow-2xl space-y-1 text-xs">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenStudyKit(slot, 'notes')}
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-slate-200 hover:bg-[#16284c] hover:text-white cursor-pointer"
                                    >
                                      <FileText className="h-3.5 w-3.5 text-blue-400" />
                                      <span>Read AI Notes</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenStudyKit(slot, 'solutions')}
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-slate-200 hover:bg-[#16284c] hover:text-white cursor-pointer"
                                    >
                                      <BookOpen className="h-3.5 w-3.5 text-emerald-400" />
                                      <span>NCERT Solutions</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenStudyKit(slot, 'mock_test')}
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-slate-200 hover:bg-[#16284c] hover:text-white cursor-pointer"
                                    >
                                      <Dumbbell className="h-3.5 w-3.5 text-purple-400" />
                                      <span>Take 15m Quiz</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSlot(slot.id)}
                                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-rose-300 hover:bg-rose-500/15 cursor-pointer"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                      <span>Remove Task</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* + Show More Footer Row */}
                  <div className="border-t border-[#172644] py-2.5 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (dailySlots.length > 5) {
                          setShowAllDayTasks((prev) => !prev);
                        } else {
                          setAddingCustomTask((prev) => !prev);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#60a5fa] hover:text-blue-300 transition-colors cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>
                        {dailySlots.length > 5
                          ? showAllDayTasks
                            ? 'Show Less'
                            : `Show More (${dailySlots.length - 5} more)`
                          : 'Show More'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Bottom Horizontal Day Carousel matching Screenshot */}
                <div className="flex items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const nextIdx = Math.max(0, selectedDayIndex - 1);
                      setSelectedDayIndex(nextIdx);
                      if (nextIdx < dayCarouselStart) {
                        setDayCarouselStart(nextIdx);
                      }
                    }}
                    disabled={selectedDayIndex <= 0}
                    className="flex h-12 w-10 shrink-0 items-center justify-center rounded-xl border border-[#1f3259] bg-[#0e1a33] text-slate-300 hover:border-[#3b82f6] hover:text-white disabled:opacity-40 transition-all cursor-pointer"
                    aria-label="Previous day"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <div className="grid flex-1 grid-cols-3 sm:grid-cols-6 gap-2.5">
                    {visibleCarouselDays.map((day) => {
                      const isSelected = selectedDayIndex === day.index;
                      return (
                        <button
                          key={day.index}
                          type="button"
                          onClick={() => setSelectedDayIndex(day.index)}
                          className={`flex flex-col items-center justify-center rounded-xl border py-2.5 px-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#60a5fa] bg-gradient-to-b from-[#2563eb] to-[#1d4ed8] text-white shadow-[0_6px_20px_rgba(37,99,235,0.45)]'
                              : 'border-[#1e3156] bg-[#0e1a33]/90 text-slate-200 hover:border-[#3b82f6]/60 hover:bg-[#132344]'
                          }`}
                        >
                          <span className="text-xs font-bold leading-tight">{day.label}</span>
                          <span
                            className={`text-[11px] mt-0.5 ${
                              isSelected ? 'text-blue-100 font-medium' : 'text-slate-400'
                            }`}
                          >
                            {day.dayMonth}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const nextIdx = Math.min(dayTabs.length - 1, selectedDayIndex + 1);
                      setSelectedDayIndex(nextIdx);
                      if (nextIdx >= dayCarouselStart + 6) {
                        setDayCarouselStart(nextIdx - 5);
                      }
                    }}
                    disabled={selectedDayIndex >= dayTabs.length - 1}
                    className="flex h-12 w-10 shrink-0 items-center justify-center rounded-xl border border-[#1f3259] bg-[#0e1a33] text-slate-300 hover:border-[#3b82f6] hover:text-white disabled:opacity-40 transition-all cursor-pointer"
                    aria-label="Next day"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: CHAPTER-WISE PLAN */}
            {viewMode === 'chapter' && (
              <div className="space-y-3">
                {timetable.slice(0, 20).map((slot) => {
                  const pill = getSubjectPillStyle(slot);
                  return (
                    <div
                      key={slot.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#1d2f52] bg-[#0d1830] px-4 py-3 hover:border-[#3b82f6]/50 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => handleToggleComplete(slot.id)}
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-[#324d80] bg-[#0e1a33]"
                        >
                          {slot.completed && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                        </button>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${pill.className}`}
                        >
                          {pill.text}
                        </span>
                        <span className="text-xs md:text-sm font-semibold text-white truncate">
                          {slot.chapterTitle}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400">{slot.dayLabel}</span>
                        <button
                          type="button"
                          onClick={() => handleOpenStudyKit(slot, 'notes')}
                          className="rounded-lg border border-blue-500/30 bg-blue-600/15 px-2.5 py-1 text-xs font-semibold text-blue-300 hover:bg-blue-600/30 cursor-pointer"
                        >
                          Study Kit →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB 3: SYLLABUS OVERVIEW */}
            {viewMode === 'syllabus' && (
              <div className="space-y-4">
                {getAllBooksForClass(currentClassNum).map((b) => {
                  const completedInBook = timetable.filter(
                    (s) => s.subjectKey === b.subjectKey && s.completed
                  );
                  const uniqueDone = new Set(completedInBook.map((s) => s.chapterNumber)).size;
                  return (
                    <div
                      key={b.id}
                      className="rounded-2xl border border-[#1d2f52] bg-[#0c172e] p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-white text-sm">
                          {b.subjectName} — <span className="text-[#60a5fa]">{b.bookName}</span>
                        </div>
                        <span className="text-xs font-bold text-emerald-400">
                          {uniqueDone} / {b.totalChapters} Chapters Completed
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {b.chapters.map((ch) => {
                          const isDone = timetable.some(
                            (s) =>
                              s.subjectKey === b.subjectKey &&
                              s.chapterNumber === ch.number &&
                              s.completed
                          );
                          const mockSlot: TimetableSlot = {
                            id: `syl-${b.subjectKey}-${ch.number}`,
                            dayIndex: 0,
                            dateString: primaryExamDate,
                            dayLabel: 'Day 1',
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
                            <button
                              key={ch.number}
                              type="button"
                              onClick={() => handleOpenStudyKit(mockSlot, 'notes')}
                              className={`flex items-center justify-between rounded-xl border p-2.5 text-left text-xs transition-all cursor-pointer ${
                                isDone
                                  ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-200'
                                  : 'border-[#1f3259] bg-[#101d38] text-slate-200 hover:border-[#3b82f6]'
                              }`}
                            >
                              <span className="truncate pr-2">
                                <strong>Ch {ch.number}:</strong> {ch.title}
                              </span>
                              {isDone ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ==================== RIGHT COLUMN (4 COLS) ==================== */}
        <div className="xl:col-span-4 space-y-5">
          {/* RIGHT CARD 1: Study Plan Progress */}
          <div className="rounded-[22px] border border-[#1d2f52] bg-[#0a1326]/95 p-5 md:p-6 shadow-[0_18px_45px_rgba(0,0,0,0.5)] space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8] text-white shadow-[0_0_14px_rgba(59,130,246,0.5)]">
                <Sparkles className="h-3.5 w-3.5 fill-white" />
              </div>
              <h3 className="text-base font-extrabold text-white">Study Plan Progress</h3>
            </div>

            <div className="flex items-center justify-between gap-4 pt-1">
              {/* Left Circular Donut Ring */}
              <div className="flex flex-col items-center shrink-0">
                <div className="relative flex h-28 w-28 items-center justify-center">
                  <svg className="h-28 w-28 -rotate-90 transform" viewBox="0 0 108 108">
                    <circle
                      cx="54"
                      cy="54"
                      r={donutRadius}
                      stroke="#1b2e52"
                      strokeWidth="10"
                      fill="transparent"
                    />
                    <circle
                      cx="54"
                      cy="54"
                      r={donutRadius}
                      stroke="url(#plannerDonutGrad)"
                      strokeWidth="10"
                      strokeDasharray={donutCircumference}
                      strokeDashoffset={donutDashOffset}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-500"
                    />
                    <defs>
                      <linearGradient id="plannerDonutGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#10b981" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-extrabold text-white">
                      {subjectStats.overallPercent}%
                    </span>
                  </div>
                </div>
                <span className="mt-2 text-xs font-medium text-slate-300">Overall Progress</span>
              </div>

              {/* Right 4 Subject Progress Rows */}
              <div className="flex-1 space-y-3 pl-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#3b82f6] shadow-[0_0_8px_#3b82f6]" />
                    <span className="font-medium text-slate-200">Mathematics</span>
                  </div>
                  <span className="font-semibold text-slate-300">
                    {subjectStats.maths.completedChapters}/{subjectStats.maths.totalChapters}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#10b981] shadow-[0_0_8px_#10b981]" />
                    <span className="font-medium text-slate-200">Science</span>
                  </div>
                  <span className="font-semibold text-slate-300">
                    {subjectStats.science.completedChapters}/{subjectStats.science.totalChapters}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#a855f7] shadow-[0_0_8px_#a855f7]" />
                    <span className="font-medium text-slate-200">English</span>
                  </div>
                  <span className="font-semibold text-slate-300">
                    {subjectStats.english.completedChapters}/{subjectStats.english.totalChapters}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b] shadow-[0_0_8px_#f59e0b]" />
                    <span className="font-medium text-slate-200">Social Science</span>
                  </div>
                  <span className="font-semibold text-slate-300">
                    {subjectStats.sst.completedChapters}/{subjectStats.sst.totalChapters}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT CARD 2: Upcoming Exams */}
          <div className="rounded-[22px] border border-[#1d2f52] bg-[#0a1326]/95 p-5 md:p-6 shadow-[0_18px_45px_rgba(0,0,0,0.5)] space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#132548] border border-[#243f73] text-[#60a5fa]">
                <CalendarDays className="h-4 w-4" />
              </div>
              <h3 className="text-base font-extrabold text-white">Upcoming Exams</h3>
            </div>

            <div
              onClick={() => setWizardOpen(true)}
              className="group flex items-center justify-between rounded-2xl border border-[#243b67] bg-gradient-to-r from-[#112244] to-[#0d1933] p-3.5 hover:border-[#3b82f6] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-13 w-13 shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-b from-[#3b82f6] to-[#2563eb] text-white shadow-md px-3 py-1.5">
                  <span className="text-lg font-extrabold leading-none">
                    {examBadgeParts.dayNum}
                  </span>
                  <span className="text-[11px] font-medium text-blue-100 mt-0.5">
                    {examBadgeParts.monthShort}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white group-hover:text-[#60a5fa] transition-colors">
                    {selectedExamType}
                  </h4>
                  <p className="text-xs text-slate-300 mt-1">
                    {profile.classLevel} &nbsp;•&nbsp; {examBadgeParts.fullLabel}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
            </div>

            <button
              type="button"
              onClick={() => {
                if (dateInputRef.current) {
                  if ('showPicker' in HTMLInputElement.prototype) {
                    try {
                      dateInputRef.current.showPicker();
                      return;
                    } catch {}
                  }
                  dateInputRef.current.focus();
                } else {
                  setWizardOpen(true);
                }
              }}
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#60a5fa] hover:text-blue-300 transition-colors cursor-pointer"
            >
              <CornerDownRight className="h-3.5 w-3.5" />
              <span>Change Exam Date</span>
            </button>
          </div>

          {/* RIGHT CARD 3: Study Tips */}
          <div className="rounded-[22px] border border-[#1d2f52] bg-[#0a1326]/95 p-5 md:p-6 shadow-[0_18px_45px_rgba(0,0,0,0.5)] space-y-3.5">
            <div className="flex items-center gap-2.5">
              <span className="text-lg leading-none">💡</span>
              <h3 className="text-base font-extrabold text-white">Study Tips</h3>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-[#1c3354] bg-gradient-to-r from-[#0e1d38] via-[#0d2238] to-[#0c2938] p-4 pr-16">
              <p className="text-xs md:text-[13.5px] font-medium italic text-slate-100 leading-relaxed">
                &ldquo;Small steps every day lead to big results.&rdquo;
              </p>

              {/* Cute Plant Sprout SVG on Right */}
              <svg
                className="absolute bottom-0 right-3 h-14 w-12"
                viewBox="0 0 54 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M27 62V28"
                  stroke="#10B981"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <path
                  d="M27 38C15 38 10 27 12 18C21 18 27 25 27 38Z"
                  fill="#10B981"
                  opacity="0.85"
                />
                <path
                  d="M27 30C39 30 44 19 42 10C33 10 27 17 27 30Z"
                  fill="#34D399"
                />
              </svg>
            </div>
          </div>

          {/* RIGHT CARD 4: Need Help? Ask AI Tutor */}
          <div
            className="relative overflow-hidden rounded-[22px] border border-[#1f3666] p-5 md:p-6 shadow-[0_18px_45px_rgba(0,0,0,0.5)]"
            style={{
              background:
                'radial-gradient(circle at 85% 50%, rgba(37, 99, 235, 0.28), transparent 60%), linear-gradient(135deg, #0b162d 0%, #0d1d3d 100%)',
            }}
          >
            <div className="relative z-10 max-w-[62%] space-y-2">
              <div className="text-sm font-medium text-slate-200">Need Help?</div>
              <h3 className="text-lg font-extrabold text-[#38bdf8] leading-tight">Ask AI Tutor</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Get instant explanations, clear your doubts, anytime.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('/tutor')}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#1d5be6] to-[#2563eb] px-4 py-2.5 text-xs font-bold text-white shadow-[0_6px_20px_rgba(37,99,235,0.45)] hover:brightness-110 transition-all cursor-pointer"
                >
                  <span>Open AI Tutor</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Cute 3D Robot Illustration on Right */}
            <svg
              className="pointer-events-none absolute -bottom-2 right-1 h-36 w-36 drop-shadow-[0_10px_20px_rgba(37,99,235,0.4)]"
              viewBox="0 0 140 140"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Sparkle stars */}
              <circle cx="24" cy="30" r="2" fill="#60A5FA" />
              <circle cx="118" cy="24" r="2.5" fill="#93C5FD" />
              {/* Antenna */}
              <line x1="75" y1="16" x2="75" y2="28" stroke="#93C5FD" strokeWidth="4" strokeLinecap="round" />
              <circle cx="75" cy="14" r="5" fill="#60A5FA" />
              {/* Ear pods */}
              <ellipse cx="34" cy="58" rx="6" ry="12" fill="#3B82F6" />
              <ellipse cx="116" cy="58" rx="6" ry="12" fill="#3B82F6" />
              {/* Head */}
              <rect
                x="38"
                y="28"
                width="74"
                height="54"
                rx="26"
                fill="url(#tutorBotHead)"
                stroke="#BFDBFE"
                strokeWidth="1.5"
              />
              {/* Visor */}
              <rect
                x="47"
                y="37"
                width="56"
                height="36"
                rx="17"
                fill="#0B1936"
                stroke="#3B82F6"
                strokeWidth="1.2"
              />
              {/* Happy Eyes */}
              <path d="M59 53C61 48.5 66 48.5 68 53" stroke="#93C5FD" strokeWidth="3" strokeLinecap="round" />
              <path d="M82 53C84 48.5 89 48.5 91 53" stroke="#93C5FD" strokeWidth="3" strokeLinecap="round" />
              {/* Smile */}
              <path d="M71 60C73 63.5 77 63.5 79 60" stroke="#93C5FD" strokeWidth="2.5" strokeLinecap="round" />
              {/* Body */}
              <rect
                x="52"
                y="84"
                width="46"
                height="42"
                rx="18"
                fill="url(#tutorBotHead)"
                stroke="#93C5FD"
                strokeWidth="1.2"
              />
              <rect x="63" y="94" width="24" height="16" rx="6" fill="#2563EB" opacity="0.85" />
              {/* Waving Left Arm */}
              <path
                d="M50 92C38 86 32 76 34 68"
                stroke="#DBEAFE"
                strokeWidth="8"
                strokeLinecap="round"
              />
              {/* Right Arm */}
              <path
                d="M100 94C110 98 114 108 110 116"
                stroke="#DBEAFE"
                strokeWidth="8"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="tutorBotHead" x1="75" y1="28" x2="75" y2="126" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#FFFFFF" />
                  <stop offset="0.65" stopColor="#DBEAFE" />
                  <stop offset="1" stopColor="#60A5FA" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>

      {/* FULL CALENDAR MODAL (When clicking "View Calendar") */}
      {calendarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-4xl rounded-3xl border border-[#243b67] bg-[#091224] p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <CalendarDays className="h-5 w-5 text-[#60a5fa]" />
                <h2 className="text-lg font-extrabold text-white">
                  Complete Study Plan Calendar ({dayTabs.length} Days)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCalendarModalOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 overflow-y-auto pr-1">
              {dayTabs.map((d) => {
                const slots = timetable.filter((s) => s.dayIndex === d.index);
                const doneCount = slots.filter((s) => s.completed).length;
                return (
                  <div
                    key={d.index}
                    onClick={() => {
                      setSelectedDayIndex(d.index);
                      setViewMode('daily');
                      setCalendarModalOpen(false);
                    }}
                    className={`rounded-2xl border p-3.5 cursor-pointer transition-all ${
                      selectedDayIndex === d.index
                        ? 'border-[#3b82f6] bg-[#13254a]'
                        : 'border-white/10 bg-[#0d1830] hover:border-blue-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-extrabold text-white">
                        {d.label} • {d.dayMonth}
                      </span>
                      <span className="text-[11px] font-semibold text-[#60a5fa]">
                        {doneCount}/{slots.length} Done
                      </span>
                    </div>
                    <div className="space-y-1">
                      {slots.slice(0, 3).map((s) => (
                        <div key={s.id} className="text-[11px] text-slate-300 truncate">
                          • {s.subjectBadgeLabel || s.subjectName}: {s.chapterTitle}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SLIDE-OVER STUDY MATERIAL HUB DRAWER (Notes, NCERT Solutions, 15m Quiz) */}
      {drawerOpen && activeSlot && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="flex-1 max-w-none md:max-w-3xl w-full h-full bg-[#080d1a] border-l border-white/10 flex flex-col shadow-2xl overflow-hidden">
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
                    <span className="text-blue-300">&ldquo;{activeSlot.bookName}&rdquo;</span>
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
                  onClick={() => handleToggleComplete(activeSlot.id)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
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

            {/* Drawer Tab Switcher */}
            <div className="flex items-center border-b border-white/10 bg-[#090f20] px-4 pt-2">
              {[
                {
                  key: 'notes',
                  label: '📄 Crispy Notes',
                  count: `${activeNotes?.readingTimeMinutes || 8}m read`,
                },
                {
                  key: 'solutions',
                  label: '📖 NCERT Solutions',
                  count: `${activeSolutions.length} Q&As`,
                },
                { key: 'mock_test', label: '📝 Chapter Quiz', count: '15m Quiz' },
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
                    className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold transition-all cursor-pointer ${
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
              {drawerTab === 'notes' && activeNotes && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-blue-500/30 bg-blue-950/30 p-4 text-xs text-blue-200 leading-relaxed">
                    <div className="font-bold text-white mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                        Executive Chapter Summary
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
                        {copiedNotes ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        <span>{copiedNotes ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <p>{activeNotes.coreSummary}</p>
                  </div>

                  {activeNotes.formulasAndRules.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        📐 Core Formulas & Key Rules
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
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {drawerTab === 'solutions' && (
                <div className="space-y-3">
                  {activeSolutions.map((sol, sIdx) => {
                    const isExpanded = expandedSolutionIndex === sIdx;
                    return (
                      <div
                        key={sIdx}
                        className="rounded-2xl border border-white/10 bg-[#0d1428] overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedSolutionIndex(isExpanded ? null : sIdx)}
                          className="flex w-full items-start justify-between p-4 text-left hover:bg-white/5 gap-3"
                        >
                          <div>
                            <div className="text-[0.65rem] font-bold text-blue-400 uppercase mb-1">
                              {sol.type} · {sol.questionNumber}
                            </div>
                            <div className="text-xs md:text-sm font-bold text-white">
                              {sol.question}
                            </div>
                          </div>
                          <ChevronDown
                            className={`h-4 w-4 text-slate-400 shrink-0 mt-1 transition-transform ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                        {isExpanded && (
                          <div className="border-t border-white/10 bg-[#090e1c] p-4 text-xs space-y-3">
                            {sol.stepByStepSolution.map((step, stIdx) => (
                              <div
                                key={stIdx}
                                className="p-2.5 rounded-xl bg-white/5 text-slate-200 font-mono whitespace-pre-wrap"
                              >
                                {step}
                              </div>
                            ))}
                            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-2.5 text-emerald-300 font-bold">
                              Final Answer: <span className="text-white font-normal">{sol.finalAnswer}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {drawerTab === 'mock_test' && activeQuiz && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between rounded-2xl border border-purple-500/40 bg-purple-950/30 p-3.5">
                    <div className="text-xs font-bold text-white">
                      15-Minute Diagnostic Quiz ({activeQuiz.questions.length} Questions)
                    </div>
                    <div className="font-mono text-xs font-bold text-white">
                      ⏱ {formatTimer(quizSecondsLeft)}
                    </div>
                  </div>

                  {quizSubmitted && quizScore && (
                    <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-4 text-center">
                      <div className="text-2xl font-black text-emerald-400">
                        {quizScore.score} / {quizScore.total} Marks
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    {activeQuiz.questions.map((q, qIndex) => {
                      const selectedOption = quizAnswers[q.id];
                      return (
                        <div
                          key={q.id}
                          className="rounded-2xl border border-white/10 bg-[#0d1428] p-4 text-xs space-y-3"
                        >
                          <div className="font-bold text-white text-sm">
                            Q{qIndex + 1}. {q.question}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {q.options.map((opt, optIndex) => {
                              const isSel = selectedOption === optIndex;
                              return (
                                <button
                                  key={optIndex}
                                  type="button"
                                  disabled={quizSubmitted}
                                  onClick={() =>
                                    setQuizAnswers((prev) => ({ ...prev, [q.id]: optIndex }))
                                  }
                                  className={`rounded-xl border p-2.5 text-left text-xs transition-all ${
                                    isSel
                                      ? 'border-blue-500 bg-blue-600/30 text-white font-bold'
                                      : 'border-white/10 bg-[#090e1c] text-slate-300'
                                  }`}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {!quizSubmitted && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleSubmitQuiz}
                        disabled={Object.keys(quizAnswers).length === 0}
                        className="rounded-xl bg-purple-600 px-6 py-3 text-xs font-bold text-white hover:bg-purple-500 disabled:opacity-50"
                      >
                        Submit Quiz
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="border-t border-white/10 bg-[#0c1326] p-4 flex items-center justify-between">
              <span className="text-xs text-slate-400">Need deeper explanation on this topic?</span>
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  setActiveTab('/tutor');
                }}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 cursor-pointer"
              >
                <Bot className="h-3.5 w-3.5" />
                <span>Ask AI Tutor →</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
