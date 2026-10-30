import React, { useState, useEffect, useMemo } from 'react';
import { useStudy } from '../context/StudyContext';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  Clock,
  Award,
  Trophy,
  Sparkles,
  Calendar,
  Plus,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Target,
  RotateCcw,
  Star,
  FileText,
  AlertTriangle,
  Lightbulb,
  Trash2,
  CheckCheck,
  Check,
  X,
  FlaskConical,
  Globe,
} from 'lucide-react';
import type { TimetableSlot } from './StudyPlannerView';
import { getUserItem, setUserItem } from '../utils/userStorage';
import { saveUserMockTests } from '../firebase';
import { getDailyStudyLogs } from '../utils/achievementEngine';

// ====================================================================
// Type Definitions
// ====================================================================

export interface SyllabusChapter {
  id: string;
  number: number;
  title: string;
  status: 'done' | 'revised' | 'pending';
  notesCount?: number;
}

export interface SubjectSyllabus {
  id: string;
  name: string;
  icon: string;
  color: string;
  accentBg: string;
  totalChapters: number;
  chapters: SyllabusChapter[];
}

export interface MockTestRecord {
  id: string;
  name: string;
  subject: string;
  score: number;
  maxScore: number;
  date: string;
  focusArea: string;
  timeTaken?: number;
}

export interface TodayPlannerTask {
  id: string;
  subject: string;
  title: string;
  completed: boolean;
  timeSlot: string;
}

// ====================================================================
// Default Seed Data
// ====================================================================

const INITIAL_SUBJECTS: SubjectSyllabus[] = [
  {
    id: 'maths',
    name: 'Mathematics',
    icon: '📐',
    color: 'from-blue-600 to-indigo-600',
    accentBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    totalChapters: 8,
    chapters: [
      { id: 'm-1', number: 1, title: 'Number Systems', status: 'pending' },
      { id: 'm-2', number: 2, title: 'Polynomials & Middle-Term Splitting', status: 'pending' },
      { id: 'm-3', number: 3, title: 'Coordinate Geometry', status: 'pending' },
      { id: 'm-4', number: 4, title: 'Linear Equations in Two Variables', status: 'pending' },
      { id: 'm-5', number: 5, title: 'Introduction to Euclid’s Geometry', status: 'pending' },
      { id: 'm-6', number: 6, title: 'Lines and Angles', status: 'pending' },
      { id: 'm-7', number: 7, title: 'Triangles & Congruence Theorems', status: 'pending' },
      { id: 'm-8', number: 8, title: 'Quadrilaterals & Circles', status: 'pending' },
    ],
  },
  {
    id: 'science',
    name: 'Science',
    icon: '🔬',
    color: 'from-emerald-600 to-teal-600',
    accentBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    totalChapters: 8,
    chapters: [
      { id: 's-1', number: 1, title: 'Matter in Our Surroundings', status: 'pending' },
      { id: 's-2', number: 2, title: 'Is Matter Around Us Pure?', status: 'pending' },
      { id: 's-3', number: 3, title: 'Atoms and Molecules', status: 'pending' },
      { id: 's-4', number: 4, title: 'Structure of the Atom', status: 'pending' },
      { id: 's-5', number: 5, title: 'The Fundamental Unit of Life (Cell)', status: 'pending' },
      { id: 's-6', number: 6, title: 'Tissues (Plant & Animal)', status: 'pending' },
      { id: 's-7', number: 7, title: 'Motion (Speed, Velocity, Acceleration)', status: 'pending' },
      { id: 's-8', number: 8, title: 'Force and Laws of Motion & Gravitation', status: 'pending' },
    ],
  },
  {
    id: 'sst',
    name: 'Social Science',
    icon: '🌍',
    color: 'from-amber-600 to-orange-600',
    accentBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    totalChapters: 6,
    chapters: [
      { id: 'sst-1', number: 1, title: 'The French Revolution', status: 'pending' },
      { id: 'sst-2', number: 2, title: 'Socialism in Europe & Russian Revolution', status: 'pending' },
      { id: 'sst-3', number: 3, title: 'India: Size and Location', status: 'pending' },
      { id: 'sst-4', number: 4, title: 'Physical Features of India', status: 'pending' },
      { id: 'sst-5', number: 5, title: 'What is Democracy? Why Democracy?', status: 'pending' },
      { id: 'sst-6', number: 6, title: 'Constitutional Design & Electoral Politics', status: 'pending' },
    ],
  },
  {
    id: 'english',
    name: 'English',
    icon: '📚',
    color: 'from-purple-600 to-fuchsia-600',
    accentBg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    totalChapters: 5,
    chapters: [
      { id: 'en-1', number: 1, title: 'The Fun They Had (Prose)', status: 'pending' },
      { id: 'en-2', number: 2, title: 'The Sound of Music & Evelyn Glennie', status: 'pending' },
      { id: 'en-3', number: 3, title: 'The Road Not Taken (Poetry)', status: 'pending' },
      { id: 'en-4', number: 4, title: 'Tenses & Modals Grammar Rules', status: 'pending' },
      { id: 'en-5', number: 5, title: 'Reported Speech & Descriptive Writing', status: 'pending' },
    ],
  },
];

const INITIAL_MOCK_TESTS: MockTestRecord[] = [];
const INITIAL_TODAY_TASKS: TodayPlannerTask[] = [];

// ====================================================================
// Helper: Circular Donut Progress Gauge
// ====================================================================
const CircularGauge: React.FC<{
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  trackColor?: string;
  textClassName?: string;
}> = ({
  percentage,
  size = 92,
  strokeWidth = 9,
  color,
  trackColor = '#1e293b',
  textClassName = 'text-lg font-extrabold text-white',
}) => {
  const clamped = Math.max(0, Math.min(100, Math.round(percentage)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 transform">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className={`absolute ${textClassName}`}>{clamped}%</span>
    </div>
  );
};

// ====================================================================
// Main Progress Component
// ====================================================================

export const ProgressRoadmapView: React.FC = () => {
  const {
    profile,
    stats,
    currentUser,
    addStudyMinutes,
    setActiveTab,
    mistakes,
    toggleMistakeMastered,
    removeMistake,
  } = useStudy();

  // Current class number (4 to 9) for Study Planner sync
  const currentClassNum = useMemo(() => {
    const match = profile.classLevel.match(/\d+/);
    const num = match ? parseInt(match[0], 10) : 9;
    return num >= 4 && num <= 9 ? num : 9;
  }, [profile.classLevel]);

  // Real-time synced Timetable Slots from Study Planner
  const [plannerSlots, setPlannerSlots] = useState<TimetableSlot[]>(() => {
    try {
      const saved = getUserItem(`studybot_timetable_c${currentClassNum}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Synced Subject Exam Configs from Study Planner
  const [examConfigs, setExamConfigs] = useState<Record<string, any>>(() => {
    try {
      const saved = getUserItem(`studybot_exam_configs_c${currentClassNum}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Email-scoped local storage persisted state
  const [subjects, setSubjects] = useState<SubjectSyllabus[]>(() => {
    try {
      const saved = getUserItem('studybot_progress_subjects');
      return saved ? JSON.parse(saved) : INITIAL_SUBJECTS;
    } catch {
      return INITIAL_SUBJECTS;
    }
  });

  const [mockTests, setMockTests] = useState<MockTestRecord[]>(() => {
    try {
      const saved = getUserItem('studybot_progress_mocktests');
      return saved ? JSON.parse(saved) : INITIAL_MOCK_TESTS;
    } catch {
      return INITIAL_MOCK_TESTS;
    }
  });

  const [todayTasks, setTodayTasks] = useState<TodayPlannerTask[]>(() => {
    try {
      const saved = getUserItem('studybot_progress_today_tasks');
      return saved ? JSON.parse(saved) : INITIAL_TODAY_TASKS;
    } catch {
      return INITIAL_TODAY_TASKS;
    }
  });

  const [totalCompletedTasks, setTotalCompletedTasks] = useState<number>(() => {
    try {
      const saved = getUserItem('studybot_progress_total_tasks');
      return saved ? Number(saved) : 0;
    } catch {
      return 0;
    }
  });

  // Filter / Modal / UI States
  const [dateRangeFilter, setDateRangeFilter] = useState<'this_week' | 'last_month' | 'all_time'>('this_week');
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [plannerPeriodFilter, setPlannerPeriodFilter] = useState<'this_week' | 'today' | 'all_time'>('this_week');
  const [plannerDropdownOpen, setPlannerDropdownOpen] = useState(false);

  // Modals
  const [logMockModalOpen, setLogMockModalOpen] = useState(false);
  const [allMockTestsModalOpen, setAllMockTestsModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsActiveTab, setDetailsActiveTab] = useState<'subjects' | 'mistakes' | 'diagnostic'>('subjects');
  const [addTaskOpen, setAddTaskOpen] = useState(false);

  // Add Task Form State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskSubject, setNewTaskSubject] = useState<'Math' | 'Science' | 'SST' | 'English'>('Math');

  // Log Mock Test Form State
  const [newMockSubject, setNewMockSubject] = useState<string>('Science');
  const [newMockName, setNewMockName] = useState<string>('Science Chapter Mock Test');
  const [newMockScore, setNewMockScore] = useState<string>('88');
  const [newMockMaxScore, setNewMockMaxScore] = useState<string>('100');
  const [newMockTimeTaken, setNewMockTimeTaken] = useState<string>('34');
  const [newMockHardTopics, setNewMockHardTopics] = useState<string>('');

  // Mistake Vault filter states
  const [mistakeFilter, setMistakeFilter] = useState<'all' | 'unmastered' | 'mastered'>('all');
  const [mistakeSubjectFilter, setMistakeSubjectFilter] = useState<string>('all');
  const [rebalanceNotification, setRebalanceNotification] = useState<string | null>(null);

  // Two-way synchronization with Study Planner, Mock Tests, and User changes
  useEffect(() => {
    const syncAllData = () => {
      try {
        const savedSlots = getUserItem(`studybot_timetable_c${currentClassNum}`);
        setPlannerSlots(savedSlots ? JSON.parse(savedSlots) : []);

        const savedConfigs = getUserItem(`studybot_exam_configs_c${currentClassNum}`);
        setExamConfigs(savedConfigs ? JSON.parse(savedConfigs) : {});

        const savedTests = getUserItem('studybot_progress_mocktests');
        setMockTests(savedTests ? JSON.parse(savedTests) : []);

        const savedTasks = getUserItem('studybot_progress_today_tasks');
        setTodayTasks(savedTasks ? JSON.parse(savedTasks) : []);

        const savedSubjects = getUserItem('studybot_progress_subjects');
        setSubjects(savedSubjects ? JSON.parse(savedSubjects) : INITIAL_SUBJECTS);
      } catch (_) {}
    };

    syncAllData();
    window.addEventListener('studybot:timetable-updated', syncAllData);
    window.addEventListener('studybot:mocktest-updated', syncAllData);
    window.addEventListener('studybot:study-log-updated', syncAllData);
    window.addEventListener('studybot:user-changed', syncAllData);
    window.addEventListener('storage', syncAllData);
    return () => {
      window.removeEventListener('studybot:timetable-updated', syncAllData);
      window.removeEventListener('studybot:mocktest-updated', syncAllData);
      window.removeEventListener('studybot:study-log-updated', syncAllData);
      window.removeEventListener('studybot:user-changed', syncAllData);
      window.removeEventListener('storage', syncAllData);
    };
  }, [currentClassNum, currentUser?.email]);

  useEffect(() => {
    const handleClearData = () => {
      setSubjects(INITIAL_SUBJECTS);
      setMockTests([]);
      setTodayTasks([]);
      setTotalCompletedTasks(0);
      setPlannerSlots([]);
      setExamConfigs({});
    };
    window.addEventListener('studybot:data-cleared', handleClearData);
    return () => window.removeEventListener('studybot:data-cleared', handleClearData);
  }, []);

  // Persist state updates to email-scoped localStorage
  useEffect(() => {
    try {
      setUserItem('studybot_progress_mocktests', JSON.stringify(mockTests));
    } catch (_) {}
  }, [mockTests]);

  useEffect(() => {
    try {
      setUserItem('studybot_progress_today_tasks', JSON.stringify(todayTasks));
    } catch (_) {}
  }, [todayTasks]);

  useEffect(() => {
    try {
      setUserItem('studybot_progress_subjects', JSON.stringify(subjects));
    } catch (_) {}
  }, [subjects]);

  useEffect(() => {
    try {
      setUserItem('studybot_progress_total_tasks', String(totalCompletedTasks));
    } catch (_) {}
  }, [totalCompletedTasks]);

  // ====================================================================
  // Computed Greeting & Date Range
  // ====================================================================
  const greetingText = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const studentName = useMemo(() => {
    if (profile.name && profile.name !== 'Student') return profile.name;
    if (currentUser?.displayName) return currentUser.displayName;
    if (currentUser?.email) return currentUser.email.split('@')[0];
    return 'Student';
  }, [profile.name, currentUser]);

  const currentDateRangeLabel = useMemo(() => {
    if (dateRangeFilter === 'all_time') return 'All Time Records';
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (dateRangeFilter === 'this_week' ? 6 : 29));
    const fmt = (d: Date) =>
      d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${fmt(start)} – ${fmt(end)}`;
  }, [dateRangeFilter]);

  // ====================================================================
  // Computed Mock Test Metrics (Left Column)
  // ====================================================================
  const mockTestMetrics = useMemo(() => {
    const count = mockTests.length;
    if (count === 0) {
      return {
        averageScore: stats.testAccuracy > 0 ? Math.round(stats.testAccuracy) : 0,
        averageTrend: '+0% from last week',
        highestScore: 0,
        highestSubject: 'No tests yet',
        testsAttempted: 0,
        attemptedTrend: '0 from last week',
      };
    }

    const percentages = mockTests.map((t) => {
      const max = Number(t.maxScore) || 100;
      const sc = Number(t.score) || 0;
      return Math.min(100, Math.max(0, Math.round((sc / max) * 100)));
    });

    const avg = Math.round(percentages.reduce((a, b) => a + b, 0) / count);

    let maxPct = -1;
    let bestSubj = 'Science';
    mockTests.forEach((t) => {
      const max = Number(t.maxScore) || 100;
      const pct = Math.min(100, Math.max(0, Math.round(((Number(t.score) || 0) / max) * 100)));
      if (pct > maxPct) {
        maxPct = pct;
        bestSubj = t.subject || 'Science';
      }
    });

    // Clean short subject name
    const shortSubj = bestSubj.includes('Math')
      ? 'Mathematics'
      : bestSubj.includes('Science') && !bestSubj.includes('Social')
      ? 'Science'
      : bestSubj.includes('Social') || bestSubj.includes('SST')
      ? 'Social Science'
      : bestSubj.includes('English')
      ? 'English'
      : bestSubj.split(' ')[0];

    const diff = count > 1 ? Math.max(1, avg - percentages[percentages.length - 1]) : 8;

    return {
      averageScore: avg,
      averageTrend: `+${diff}% from last week`,
      highestScore: Math.max(0, maxPct),
      highestSubject: shortSubj,
      testsAttempted: count,
      attemptedTrend: `${count} from last week`,
    };
  }, [mockTests, stats.testAccuracy]);

  // Study Time Metric
  const studyTimeFormatted = useMemo(() => {
    const dailyLogs = getDailyStudyLogs(currentUser?.email);
    const weeklyLogMins = Object.values(dailyLogs).reduce((acc, v) => acc + (Number(v) || 0), 0);
    const totalMins = Math.max(stats.studyTimeMinutes || 0, weeklyLogMins);
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${hrs}h ${mins}m`;
  }, [stats.studyTimeMinutes, currentUser?.email]);

  // Subject-wise Performance Rings (Left Column: Mathematics, Science, Social Science, English)
  const subjectPerformanceRings = useMemo(() => {
    const coreSubjects = [
      { key: 'math', label: 'Mathematics', color: '#3b82f6', targetTotal: 8 },
      { key: 'science', label: 'Science', color: '#34d399', targetTotal: 8 },
      { key: 'social', label: 'Social Science', color: '#fbbf24', targetTotal: 6 },
      { key: 'english', label: 'English', color: '#a855f7', targetTotal: 5 },
    ];

    return coreSubjects.map((subj) => {
      const matchingTests = mockTests.filter((t) => {
        const s = (t.subject || '').toLowerCase();
        if (subj.key === 'math') return s.includes('math');
        if (subj.key === 'science') return s.includes('science') && !s.includes('social') && !s.includes('computer');
        if (subj.key === 'social') return s.includes('social') || s.includes('sst') || s.includes('history') || s.includes('geography');
        if (subj.key === 'english') return s.includes('english');
        return false;
      });

      const attempted = matchingTests.length;
      const totalTests = Math.max(subj.targetTotal, attempted);
      const avgPct =
        attempted > 0
          ? Math.round(
              matchingTests.reduce((acc, t) => {
                const max = Number(t.maxScore) || 100;
                return acc + Math.min(100, Math.round(((Number(t.score) || 0) / max) * 100));
              }, 0) / attempted
            )
          : 0;

      return {
        ...subj,
        percentage: avgPct,
        attempted,
        totalTests,
      };
    });
  }, [mockTests]);

  // ====================================================================
  // Computed Planner Work Report Metrics (Right Column)
  // ====================================================================
  const subjectPlannerBars = useMemo(() => {
    const coreList = [
      {
        key: 'maths',
        name: 'Mathematics',
        barColor: 'bg-[#3b82f6]',
        badgeBg: 'bg-[#3b82f6]',
        defaultTotal: 8,
      },
      {
        key: 'science',
        name: 'Science',
        barColor: 'bg-[#34d399]',
        badgeBg: 'bg-[#34d399]',
        defaultTotal: 8,
      },
      {
        key: 'sst',
        name: 'Social Science',
        barColor: 'bg-[#fbbf24]',
        badgeBg: 'bg-[#fbbf24]',
        defaultTotal: 6,
      },
      {
        key: 'english',
        name: 'English',
        barColor: 'bg-[#a855f7]',
        badgeBg: 'bg-[#a855f7]',
        defaultTotal: 5,
      },
    ];

    return coreList.map((item) => {
      // Combine live Study Planner slots + Subject syllabus chapters + Today's tasks for this subject
      const matchingSlots = plannerSlots.filter((s) => s.subjectKey === item.key);
      const matchingTodayTasks = todayTasks.filter((t) => {
        const sub = t.subject.toLowerCase();
        if (item.key === 'maths') return sub.includes('math');
        if (item.key === 'science') return sub.includes('science');
        if (item.key === 'sst') return sub.includes('sst') || sub.includes('social');
        if (item.key === 'english') return sub.includes('english');
        return false;
      });
      const subjSyllabus = subjects.find((s) => s.id === item.key);
      const syllabusDone = subjSyllabus
        ? subjSyllabus.chapters.filter((c) => c.status !== 'pending').length
        : 0;
      const syllabusTotal = subjSyllabus ? subjSyllabus.chapters.length : item.defaultTotal;

      if (matchingSlots.length > 0) {
        const done = matchingSlots.filter((s) => s.completed).length;
        const total = matchingSlots.length;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        return {
          ...item,
          completed: done,
          total,
          percent: pct,
        };
      }

      const completedCount = syllabusDone + matchingTodayTasks.filter((t) => t.completed).length;
      const totalCount = Math.max(
        item.defaultTotal,
        syllabusTotal + matchingTodayTasks.length
      );
      const clampedCompleted = Math.min(totalCount, completedCount);
      const pct = totalCount > 0 ? Math.round((clampedCompleted / totalCount) * 100) : 0;

      return {
        ...item,
        completed: clampedCompleted,
        total: totalCount,
        percent: pct,
      };
    });
  }, [plannerSlots, todayTasks, subjects]);

  // Unified Today's Plan Tasks List (merges live todayPlannerSlots + custom todayTasks)
  const unifiedTodayList = useMemo(() => {
    const todaySlots = plannerSlots
      .filter((s) => s.dayIndex === 0)
      .map((s) => {
        const subjTag =
          s.subjectKey === 'maths'
            ? 'Math'
            : s.subjectKey === 'science'
            ? 'Science'
            : s.subjectKey === 'sst'
            ? 'SST'
            : s.subjectKey === 'english'
            ? 'English'
            : s.subjectName;
        return {
          id: s.id,
          title: `NCERT Ch ${s.chapterNumber} – ${s.chapterTitle}`,
          subject: subjTag,
          completed: s.completed,
          isPlannerSlot: true,
        };
      });

    const customList = todayTasks.map((t) => ({
      id: t.id,
      title: t.title,
      subject: t.subject,
      completed: t.completed,
      isPlannerSlot: false,
    }));

    return [...todaySlots, ...customList];
  }, [plannerSlots, todayTasks]);

  const tasksLeftCount = useMemo(() => {
    return unifiedTodayList.filter((t) => !t.completed).length;
  }, [unifiedTodayList]);

  // Overall Progress Ring Percentage (Right Column)
  const overallProgressPercent = useMemo(() => {
    const totalSubjectCompleted = subjectPlannerBars.reduce((acc, s) => acc + s.completed, 0);
    const totalSubjectItems = subjectPlannerBars.reduce((acc, s) => acc + s.total, 0);
    const todayDone = unifiedTodayList.filter((t) => t.completed).length;
    const todayTotal = unifiedTodayList.length;

    const combinedDone = totalSubjectCompleted + todayDone;
    const combinedTotal = totalSubjectItems + todayTotal;

    if (combinedTotal === 0) return 0;
    return Math.min(100, Math.round((combinedDone / combinedTotal) * 100));
  }, [subjectPlannerBars, unifiedTodayList]);

  // Nearest Exam Countdown
  const nearestExam = useMemo(() => {
    const configs = Object.values(examConfigs) as { subjectName?: string; examDate?: string }[];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let minDiff = Infinity;
    let nearest: { subjectName?: string; examDate?: string } | null = null;

    for (const conf of configs) {
      if (conf?.examDate) {
        const d = new Date(conf.examDate);
        d.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < minDiff) {
          minDiff = diffDays;
          nearest = conf;
        }
      }
    }

    if (!nearest || minDiff === Infinity) {
      return { daysLeft: 24, subjectName: 'Final Exams' };
    }
    return {
      daysLeft: minDiff,
      subjectName: nearest.subjectName || 'Exam',
    };
  }, [examConfigs]);

  // ====================================================================
  // Interactive Handlers
  // ====================================================================

  const handleToggleTodayItem = (id: string, isPlannerSlot: boolean) => {
    if (isPlannerSlot) {
      const next = plannerSlots.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s));
      setPlannerSlots(next);
      try {
        setUserItem(`studybot_timetable_c${currentClassNum}`, JSON.stringify(next));
        window.dispatchEvent(new CustomEvent('studybot:timetable-updated'));
      } catch (_) {}

      const slot = plannerSlots.find((s) => s.id === id);
      if (slot && !slot.completed) {
        addStudyMinutes(30);
        confetti({
          particleCount: 25,
          spread: 50,
          origin: { y: 0.7 },
          colors: ['#34d399', '#3b82f6', '#fbbf24'],
        });
      }
      return;
    }

    setTodayTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const nowCompleted = !t.completed;
        if (nowCompleted) {
          setTotalCompletedTasks((c) => c + 1);
          addStudyMinutes(20);
          confetti({
            particleCount: 25,
            spread: 50,
            origin: { y: 0.7 },
            colors: ['#34d399', '#3b82f6', '#fbbf24'],
          });
        } else {
          setTotalCompletedTasks((c) => Math.max(0, c - 1));
        }
        return { ...t, completed: nowCompleted };
      })
    );
  };

  const handleAddTodayTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const newTask: TodayPlannerTask = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      subject: newTaskSubject,
      completed: false,
      timeSlot: 'Today',
    };
    setTodayTasks((prev) => [...prev, newTask]);
    setNewTaskTitle('');
    setAddTaskOpen(false);
  };

  const handleDeleteTodayTask = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTodayTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleToggleChapterStatus = (subjectId: string, chapterId: string) => {
    setSubjects((prev) =>
      prev.map((subj) => {
        if (subj.id !== subjectId) return subj;
        return {
          ...subj,
          chapters: subj.chapters.map((ch) => {
            if (ch.id !== chapterId) return ch;
            const nextStatus = ch.status === 'pending' ? 'done' : 'pending';
            if (nextStatus === 'done') {
              addStudyMinutes(25);
              confetti({
                particleCount: 20,
                spread: 45,
                origin: { y: 0.7 },
                colors: ['#34d399', '#3b82f6'],
              });
            }
            return { ...ch, status: nextStatus };
          }),
        };
      })
    );
  };

  const handleSubmitMockTest = (e: React.FormEvent) => {
    e.preventDefault();
    const sc = parseFloat(newMockScore) || 0;
    const maxSc = parseFloat(newMockMaxScore) || 100;
    const timeMins = parseInt(newMockTimeTaken, 10) || 30;

    const formattedDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const newRecord: MockTestRecord = {
      id: `mt-${Date.now()}`,
      name: newMockName.trim() || `${newMockSubject} Mock Test`,
      subject: newMockSubject,
      score: sc,
      maxScore: maxSc,
      date: formattedDate,
      timeTaken: timeMins,
      focusArea: newMockHardTopics.trim()
        ? `Revise: ${newMockHardTopics.trim()}`
        : 'Strong conceptual retention!',
    };

    const updatedList = [newRecord, ...mockTests];
    setMockTests(updatedList);
    try {
      setUserItem('studybot_progress_mocktests', JSON.stringify(updatedList));
      saveUserMockTests(currentUser?.email || '', updatedList).catch(() => {});
      window.dispatchEvent(new Event('studybot:mocktest-updated'));
    } catch (_) {}

    setLogMockModalOpen(false);
    addStudyMinutes(timeMins);

    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899'],
    });
  };

  const handleDeleteMockTest = (id: string) => {
    const updated = mockTests.filter((t) => t.id !== id);
    setMockTests(updated);
    try {
      setUserItem('studybot_progress_mocktests', JSON.stringify(updated));
      saveUserMockTests(currentUser?.email || '', updated).catch(() => {});
      window.dispatchEvent(new Event('studybot:mocktest-updated'));
    } catch (_) {}
  };

  // Rebalance Timetable from Progress
  const handleRebalanceFromProgress = () => {
    if (plannerSlots.length === 0) {
      setRebalanceNotification('Study Planner schedule is in sync! All targets on track.');
      setTimeout(() => setRebalanceNotification(null), 3500);
      return;
    }

    const uncompletedToday = plannerSlots.filter((s) => s.dayIndex === 0 && !s.completed);
    if (uncompletedToday.length === 0) {
      setRebalanceNotification('All targets for today are already complete! Great discipline! 🎉');
      setTimeout(() => setRebalanceNotification(null), 3500);
      return;
    }

    const updated = plannerSlots.map((slot) => {
      if (slot.dayIndex === 0 && !slot.completed) {
        return {
          ...slot,
          dayIndex: slot.dayIndex + 1,
          dayLabel: 'Tomorrow (Re-balanced)',
        };
      }
      return slot;
    });

    setPlannerSlots(updated);
    try {
      setUserItem(`studybot_timetable_c${currentClassNum}`, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('studybot:timetable-updated'));
    } catch (_) {}

    setRebalanceNotification(
      `🔄 ${uncompletedToday.length} unfinished study session${
        uncompletedToday.length > 1 ? 's have' : ' has'
      } been shifted into tomorrow!`
    );
    setTimeout(() => setRebalanceNotification(null), 4000);
  };

  // Mock Test Mistakes Filters & Metrics
  const filteredMistakes = useMemo(() => {
    return mistakes.filter((m) => {
      if (mistakeFilter === 'unmastered' && m.mastered) return false;
      if (mistakeFilter === 'mastered' && !m.mastered) return false;
      if (mistakeSubjectFilter !== 'all') {
        const query = mistakeSubjectFilter.toLowerCase();
        const matchesSubj =
          m.subject?.toLowerCase().includes(query) ||
          m.testTopic?.toLowerCase().includes(query);
        if (!matchesSubj) return false;
      }
      return true;
    });
  }, [mistakes, mistakeFilter, mistakeSubjectFilter]);

  const mistakeMetrics = useMemo(() => {
    const total = mistakes.length;
    const mastered = mistakes.filter((m) => m.mastered).length;
    const unmastered = total - mastered;
    const masteryRate = total > 0 ? Math.round((mastered / total) * 100) : 0;
    return { total, mastered, unmastered, masteryRate };
  }, [mistakes]);

  const handleToggleMistake = (id: string) => {
    toggleMistakeMastered(id);
    const m = mistakes.find((item) => item.id === id);
    if (m && !m.mastered) {
      confetti({
        particleCount: 30,
        spread: 50,
        origin: { y: 0.7 },
        colors: ['#10b981', '#34d399', '#6ee7b7'],
      });
    }
  };

  // Helper for Subject Pill Styling in Recent Mock Tests & Today's Plan
  const getSubjectBadgeClass = (subjectName: string) => {
    const s = (subjectName || '').toLowerCase();
    if (s.includes('science') && !s.includes('social')) {
      return 'bg-[#155e4b] text-[#6ee7b7] border border-[#34d399]/30';
    }
    if (s.includes('math')) {
      return 'bg-[#1e3a8a]/80 text-[#93c5fd] border border-[#3b82f6]/30';
    }
    if (s.includes('social') || s.includes('sst')) {
      return 'bg-[#785314] text-[#fde68a] border border-[#fbbf24]/30';
    }
    if (s.includes('english')) {
      return 'bg-[#582c83] text-[#e9d5ff] border border-[#a855f7]/30';
    }
    return 'bg-[#1e293b] text-slate-200 border border-white/10';
  };

  const getTestStatusPill = (pct: number) => {
    if (pct >= 80) {
      return {
        label: 'Excellent',
        className: 'bg-[#155e4b] text-[#6ee7b7] border border-[#34d399]/30',
      };
    }
    if (pct >= 70) {
      return {
        label: 'Good',
        className: 'bg-[#1e3a8a]/80 text-[#93c5fd] border border-[#3b82f6]/30',
      };
    }
    if (pct >= 60) {
      return {
        label: 'Average',
        className: 'bg-[#334155] text-slate-200 border border-slate-400/20',
      };
    }
    return {
      label: 'Needs Practice',
      className: 'bg-[#785314] text-[#fde68a] border border-[#fbbf24]/30',
    };
  };

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-[#0b1120] text-[#f1f5f9] font-['Sora'] select-none px-4 py-5 md:px-7 md:py-6 space-y-6 scrollbar-thin">
      {/* ====================================================================
          TOP HEADER BAR: Sun Icon + Greeting + Date Range Selector
          ==================================================================== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left: Sun Icon + Greeting */}
        <div className="flex items-center gap-4">
          {/* Custom Warm Sun Illustration */}
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
            <svg viewBox="0 0 64 64" className="h-12 w-12 drop-shadow-[0_0_12px_rgba(251,191,36,0.35)]">
              <circle cx="32" cy="32" r="15" fill="#fbbf24" />
              <g stroke="#fde68a" strokeWidth="3.5" strokeLinecap="round">
                <line x1="32" y1="6" x2="32" y2="11" />
                <line x1="32" y1="53" x2="32" y2="58" />
                <line x1="6" y1="32" x2="11" y2="32" />
                <line x1="53" y1="32" x2="58" y2="32" />
                <line x1="13.6" y1="13.6" x2="17.2" y2="17.2" />
                <line x1="46.8" y1="46.8" x2="50.4" y2="50.4" />
                <line x1="50.4" y1="13.6" x2="46.8" y2="17.2" />
                <line x1="17.2" y1="46.8" x2="13.6" y2="50.4" />
              </g>
            </svg>
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl md:text-[26px] font-bold text-white tracking-tight leading-tight">
              {greetingText}, {studentName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-0.5 flex items-center gap-1.5">
              <span>Keep going! You&apos;re doing great</span>
              <span className="text-emerald-400 text-sm">💚</span>
            </p>
          </div>
        </div>

        {/* Right: Quick Action Pills + Date Range Dropdown Pill */}
        <div className="flex flex-wrap items-center gap-2.5 self-end sm:self-auto">
          {/* Quick + Log Mock Test Button */}
          <button
            type="button"
            onClick={() => setLogMockModalOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-purple-400/30 bg-[#1a1836] hover:bg-[#24204a] px-3.5 py-2 text-xs font-semibold text-purple-200 transition-all shadow-sm active:scale-95"
            title="Log a Mock Test Score"
          >
            <Plus className="h-3.5 w-3.5 text-purple-400" />
            <span>Log Test</span>
          </button>

          {/* Date Range Dropdown Pill (Matches Screenshot Top-Right) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setDateDropdownOpen((o) => !o)}
              className="flex items-center gap-2.5 rounded-full border border-white/10 bg-[#131d33] hover:bg-[#192540] px-4 py-2 text-xs sm:text-sm font-medium text-slate-200 shadow-inner transition-all"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/20 text-blue-300">
                <Calendar className="h-3.5 w-3.5" />
              </div>
              <span>{currentDateRangeLabel}</span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>

            {dateDropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-white/10 bg-[#111a2e] p-1.5 shadow-2xl z-30">
                {[
                  { id: 'this_week', label: 'This Week (Last 7 Days)' },
                  { id: 'last_month', label: 'Last 30 Days' },
                  { id: 'all_time', label: 'All Time Records' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setDateRangeFilter(opt.id as any);
                      setDateDropdownOpen(false);
                    }}
                    className={`w-full text-left rounded-xl px-3 py-2 text-xs font-medium transition-colors flex items-center justify-between ${
                      dateRangeFilter === opt.id
                        ? 'bg-blue-600/20 text-blue-300 font-semibold'
                        : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {dateRangeFilter === opt.id && <Check className="h-3.5 w-3.5 text-blue-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rebalance Toast Notification */}
      {rebalanceNotification && (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-500/40 bg-emerald-950/70 px-4 py-3 text-xs font-bold text-emerald-200 shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{rebalanceNotification}</span>
          </div>
          <button
            type="button"
            onClick={() => setRebalanceNotification(null)}
            className="text-emerald-400 hover:text-white ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* ====================================================================
          MAIN TWO-COLUMN GRID:
          Left Column: Mock Test Results
          Right Column: Planner Work Report
          ==================================================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
        {/* ====================================================================
            LEFT COLUMN: MOCK TEST RESULTS
            ==================================================================== */}
        <div className="flex flex-col justify-between rounded-3xl border border-white/[0.08] bg-[#10182b] p-5 sm:p-6 shadow-2xl space-y-5">
          {/* Card Header */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              {/* Purple Circle Icon */}
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#a855f7] to-[#7e22ce] text-white shadow-[0_0_20px_rgba(168,85,247,0.35)]">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Mock Test Results
                </h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  Your performance in recent mock tests
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAllMockTestsModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#17223b] hover:bg-[#1e2c4c] px-3.5 py-2 text-xs font-semibold text-slate-200 transition-all shrink-0"
            >
              <span>View All</span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            </button>
          </div>

          {/* 4 Colored Stat Mini-Cards Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            {/* 1. Average Score (Teal Card) */}
            <div className="rounded-2xl border border-[#2dd4bf]/20 bg-gradient-to-b from-[#133538] to-[#0e2629] p-4 flex flex-col justify-between shadow-md">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#34d399] text-[#08221e] shadow-sm mb-3">
                <Target className="h-5 w-5 stroke-[2.2]" />
              </div>
              <div>
                <div className="text-xs font-medium text-slate-300">Average Score</div>
                <div className="text-2xl sm:text-[28px] font-extrabold text-white tracking-tight my-1">
                  {mockTestMetrics.averageScore}%
                </div>
                <div className="text-[11px] font-semibold text-[#34d399] flex items-center gap-1">
                  <span>↑</span>
                  <span>{mockTestMetrics.averageTrend}</span>
                </div>
              </div>
            </div>

            {/* 2. Highest Score (Purple Card) */}
            <div className="rounded-2xl border border-[#a855f7]/20 bg-gradient-to-b from-[#241d46] to-[#191433] p-4 flex flex-col justify-between shadow-md">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#a855f7] text-white shadow-sm mb-3">
                <Star className="h-5 w-5 fill-white" />
              </div>
              <div>
                <div className="text-xs font-medium text-slate-300">Highest Score</div>
                <div className="text-2xl sm:text-[28px] font-extrabold text-white tracking-tight my-1">
                  {mockTestMetrics.highestScore}%
                </div>
                <div className="text-xs font-medium text-slate-300 truncate">
                  ({mockTestMetrics.highestSubject})
                </div>
              </div>
            </div>

            {/* 3. Tests Attempted (Blue Card) */}
            <div className="rounded-2xl border border-[#3b82f6]/20 bg-gradient-to-b from-[#14294d] to-[#0f1f3c] p-4 flex flex-col justify-between shadow-md">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3b82f6] text-white shadow-sm mb-3">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-medium text-slate-300">Tests Attempted</div>
                <div className="text-2xl sm:text-[28px] font-extrabold text-white tracking-tight my-1">
                  {mockTestMetrics.testsAttempted}
                </div>
                <div className="text-[11px] font-semibold text-[#34d399] flex items-center gap-1">
                  <span>↑</span>
                  <span>{mockTestMetrics.attemptedTrend}</span>
                </div>
              </div>
            </div>

            {/* 4. Total Study Time (Burgundy/Rose Card) */}
            <div className="rounded-2xl border border-[#f472b6]/20 bg-gradient-to-b from-[#381b2e] to-[#271320] p-4 flex flex-col justify-between shadow-md">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f472b6] text-white shadow-sm mb-3">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-medium text-slate-300">Total Study Time</div>
                <div className="text-2xl sm:text-[26px] font-extrabold text-white tracking-tight my-1">
                  {studyTimeFormatted}
                </div>
                <div className="text-xs font-medium text-slate-300">this week</div>
              </div>
            </div>
          </div>

          {/* Subject-wise Performance Sub-Card */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#0c1324] p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Subject-wise Performance</h3>
              <button
                type="button"
                onClick={() => {
                  setDetailsActiveTab('mistakes');
                  setDetailsModalOpen(true);
                }}
                className="flex items-center gap-1 text-xs font-semibold text-[#60a5fa] hover:text-blue-300 transition-colors"
              >
                <span>View Details</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
              {subjectPerformanceRings.map((ring) => (
                <div key={ring.key} className="flex flex-col items-center text-center">
                  <CircularGauge
                    percentage={ring.percentage}
                    size={90}
                    strokeWidth={8.5}
                    color={ring.color}
                    trackColor="#1e293b"
                    textClassName="text-base font-extrabold text-white"
                  />
                  <div className="mt-2.5 text-xs sm:text-sm font-bold text-white">
                    {ring.label}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {ring.attempted} / {ring.totalTests} tests
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Mock Tests Table Sub-Card */}
          <div className="rounded-2xl border border-white/[0.07] bg-[#0c1324] p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                  <FileText className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-white">Recent Mock Tests</h3>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setLogMockModalOpen(true)}
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  + Log Test
                </button>
                <button
                  type="button"
                  onClick={() => setAllMockTestsModalOpen(true)}
                  className="flex items-center gap-1 text-xs font-semibold text-[#60a5fa] hover:text-blue-300 transition-colors"
                >
                  <span>View All</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.07] text-xs font-medium text-slate-400">
                    <th className="pb-2.5 pr-3 font-medium">Date</th>
                    <th className="pb-2.5 px-3 font-medium">Subject</th>
                    <th className="pb-2.5 px-3 font-medium">Score</th>
                    <th className="pb-2.5 px-3 font-medium">Time Taken</th>
                    <th className="pb-2.5 pl-3 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05] text-xs sm:text-sm">
                  {mockTests.length > 0 ? (
                    mockTests.slice(0, 5).map((test) => {
                      const max = Number(test.maxScore) || 100;
                      const pct = Math.min(
                        100,
                        Math.max(0, Math.round(((Number(test.score) || 0) / max) * 100))
                      );
                      const statusObj = getTestStatusPill(pct);
                      return (
                        <tr key={test.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 pr-3 text-slate-300 whitespace-nowrap">
                            {test.date}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${getSubjectBadgeClass(
                                test.subject
                              )}`}
                            >
                              {test.subject}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-bold text-white whitespace-nowrap">
                            {pct}%
                          </td>
                          <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                            {test.timeTaken || 34} min
                          </td>
                          <td className="py-3 pl-3 text-right whitespace-nowrap">
                            <span
                              className={`inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${statusObj.className}`}
                            >
                              {statusObj.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-7 text-center">
                        <p className="text-xs text-slate-400 mb-3">
                          No mock tests logged yet. Take an AI Mock Test or log your recent test score!
                        </p>
                        <div className="flex items-center justify-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => setLogMockModalOpen(true)}
                            className="rounded-xl bg-[#1e3a8a] hover:bg-blue-700 px-3.5 py-1.5 text-xs font-semibold text-blue-100 transition-colors"
                          >
                            + Log Mock Test
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTab('/mock-test')}
                            className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-slate-200 transition-colors"
                          >
                            Start AI Mock Test →
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ====================================================================
            RIGHT COLUMN: PLANNER WORK REPORT
            ==================================================================== */}
        <div className="flex flex-col justify-between rounded-3xl border border-white/[0.08] bg-[#10182b] p-5 sm:p-6 shadow-2xl space-y-5">
          {/* Top Section Wrapper */}
          <div className="space-y-5">
            {/* Card Header */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                {/* Green Circle Icon */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#4ade80] to-[#16a34a] text-[#052e16] shadow-[0_0_20px_rgba(74,222,128,0.3)]">
                  <Calendar className="h-6 w-6 stroke-[2.2]" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    Planner Work Report
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400">
                    Your daily study plan and task completion
                  </p>
                </div>
              </div>

              {/* This Week Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setPlannerDropdownOpen((o) => !o)}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#17223b] hover:bg-[#1e2c4c] px-3.5 py-2 text-xs font-semibold text-slate-200 transition-all shrink-0"
                >
                  <span>
                    {plannerPeriodFilter === 'this_week'
                      ? 'This Week'
                      : plannerPeriodFilter === 'today'
                      ? 'Today'
                      : 'All Time'}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>

                {plannerDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-white/10 bg-[#111a2e] p-1.5 shadow-2xl z-30">
                    {[
                      { id: 'this_week', label: 'This Week' },
                      { id: 'today', label: 'Today' },
                      { id: 'all_time', label: 'All Time' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setPlannerPeriodFilter(opt.id as any);
                          setPlannerDropdownOpen(false);
                        }}
                        className={`w-full text-left rounded-xl px-3 py-1.5 text-xs font-medium transition-colors flex items-center justify-between ${
                          plannerPeriodFilter === opt.id
                            ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                            : 'text-slate-300 hover:bg-white/5'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {plannerPeriodFilter === opt.id && (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        )}
                      </button>
                    ))}
                    <div className="my-1 border-t border-white/10" />
                    <button
                      type="button"
                      onClick={() => {
                        setPlannerDropdownOpen(false);
                        setActiveTab('/planner');
                      }}
                      className="w-full text-left rounded-xl px-3 py-1.5 text-xs font-semibold text-blue-300 hover:bg-white/5"
                    >
                      📅 Open Study Planner →
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPlannerDropdownOpen(false);
                        handleRebalanceFromProgress();
                      }}
                      className="w-full text-left rounded-xl px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-white/5"
                    >
                      🔄 Re-balance Today
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Overall Progress Split Row */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
              {/* Left 7 Cols: Overall Progress Circular Gauge Card */}
              <div className="sm:col-span-7 rounded-2xl border border-[#34d399]/20 bg-gradient-to-r from-[#112c34] to-[#0f222c] p-4 flex items-center gap-4 shadow-md">
                <CircularGauge
                  percentage={overallProgressPercent}
                  size={84}
                  strokeWidth={8.5}
                  color="#34d399"
                  trackColor="#1e3a3a"
                  textClassName="text-lg font-extrabold text-white"
                />
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">Overall Progress</h3>
                  <p className="text-xs sm:text-sm font-medium text-[#6ee7b7] mt-1 flex items-center gap-1.5">
                    <span>You&apos;re on track!</span>
                    <span>🌱</span>
                  </p>
                </div>
              </div>

              {/* Right 5 Cols: Keep it up! Encouragement Card */}
              <div
                onClick={() => setActiveTab('/achievements')}
                className="sm:col-span-5 rounded-2xl border border-[#34d399]/20 bg-gradient-to-br from-[#1c3b33] to-[#152d27] p-4 flex items-center gap-3 shadow-md cursor-pointer hover:brightness-110 transition-all"
                title="Click to view your Badges & Achievements"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-[#fbbf24]">
                  <Star className="h-6 w-6 fill-[#fbbf24]" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#fde68a]">Keep it up!</div>
                  <div className="text-xs text-slate-200 mt-0.5 flex items-center gap-1">
                    <span>You&apos;re doing great</span>
                    <span>💚</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Subject-wise Progress Sub-Card */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#0c1324] p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white">Subject-wise Progress</h3>
                <button
                  type="button"
                  onClick={() => {
                    setDetailsActiveTab('subjects');
                    setDetailsModalOpen(true);
                  }}
                  className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Update Chapters →
                </button>
              </div>

              <div className="space-y-3.5">
                {subjectPlannerBars.map((subj) => (
                  <div
                    key={subj.key}
                    onClick={() => {
                      setDetailsActiveTab('subjects');
                      setDetailsModalOpen(true);
                    }}
                    className="grid grid-cols-12 items-center gap-3 cursor-pointer group"
                    title="Click to update completed chapters"
                  >
                    {/* Subject Icon + Name (5 cols) */}
                    <div className="col-span-5 sm:col-span-4 flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${subj.badgeBg} text-white font-bold text-sm shadow-sm`}
                      >
                        {subj.key === 'maths' && <span className="font-serif text-base">Σ</span>}
                        {subj.key === 'science' && <FlaskConical className="h-4 w-4" />}
                        {subj.key === 'sst' && <Globe className="h-4 w-4" />}
                        {subj.key === 'english' && <BookOpen className="h-4 w-4" />}
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-slate-200 truncate group-hover:text-white transition-colors">
                        {subj.name}
                      </span>
                    </div>

                    {/* Progress Bar (5 cols) */}
                    <div className="col-span-4 sm:col-span-5">
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#1e293b]">
                        <div
                          className={`h-full rounded-full ${subj.barColor} transition-all duration-500`}
                          style={{ width: `${subj.percent}%` }}
                        />
                      </div>
                    </div>

                    {/* Fraction & Percentage (3 cols) */}
                    <div className="col-span-3 flex items-center justify-end gap-3 text-xs sm:text-sm">
                      <span className="text-slate-300 font-medium whitespace-nowrap">
                        {subj.completed} / {subj.total}
                      </span>
                      <span className="font-bold text-white w-9 text-right">
                        {subj.percent}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Today's Plan Sub-Card */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#0c1324] p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-bold text-white">Today&apos;s Plan</h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAddTaskOpen((o) => !o)}
                    className="rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-2.5 py-1 text-xs font-semibold text-slate-200 transition-colors"
                  >
                    + Add Task
                  </button>
                  <span className="rounded-full bg-[#172542] border border-blue-400/20 px-3 py-1 text-xs font-semibold text-blue-200">
                    {tasksLeftCount} {tasksLeftCount === 1 ? 'task' : 'tasks'} left
                  </span>
                </div>
              </div>

              {/* Inline Add Task Form */}
              {addTaskOpen && (
                <form
                  onSubmit={handleAddTodayTask}
                  className="mb-3.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-xl border border-blue-500/30 bg-[#111c33] p-2.5"
                >
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="e.g. NCERT Ch 3 – Motion (Read + Notes)"
                    className="flex-1 rounded-lg border border-white/10 bg-[#0b1220] px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-blue-400 focus:outline-none"
                    autoFocus
                  />
                  <select
                    value={newTaskSubject}
                    onChange={(e) => setNewTaskSubject(e.target.value as any)}
                    className="rounded-lg border border-white/10 bg-[#0b1220] px-2.5 py-1.5 text-xs text-white focus:border-blue-400 focus:outline-none"
                  >
                    <option value="Math">Math</option>
                    <option value="Science">Science</option>
                    <option value="SST">SST</option>
                    <option value="English">English</option>
                  </select>
                  <button
                    type="submit"
                    className="rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs font-bold text-white transition-colors"
                  >
                    Add
                  </button>
                </form>
              )}

              {/* Task Rows */}
              <div className="divide-y divide-white/[0.05]">
                {unifiedTodayList.length > 0 ? (
                  unifiedTodayList.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => handleToggleTodayItem(task.id, task.isPlannerSlot)}
                      className="flex items-center justify-between gap-3 py-2.5 cursor-pointer hover:bg-white/[0.02] px-1 rounded-lg transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {task.completed ? (
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#34d399] text-[#052e16]">
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="h-5 w-5 shrink-0 rounded-full border-2 border-slate-500 group-hover:border-slate-300 transition-colors" />
                        )}
                        <span
                          className={`text-xs sm:text-sm truncate ${
                            task.completed ? 'text-slate-300' : 'text-slate-200'
                          }`}
                        >
                          {task.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${getSubjectBadgeClass(
                            task.subject
                          )}`}
                        >
                          {task.subject}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold min-w-[64px] text-center ${
                            task.completed
                              ? 'bg-[#155e4b] text-[#6ee7b7]'
                              : 'bg-[#263248] text-slate-300'
                          }`}
                        >
                          {task.completed ? 'Done' : 'Pending'}
                        </span>
                        {!task.isPlannerSlot && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteTodayTask(task.id, e)}
                            className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-opacity p-0.5"
                            title="Delete task"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center">
                    <p className="text-xs text-slate-400 mb-3">
                      No tasks in Today&apos;s Plan yet. Add your daily study goals or generate a timetable in Study Planner!
                    </p>
                    <div className="flex items-center justify-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setAddTaskOpen(true)}
                        className="rounded-xl bg-[#155e4b] hover:bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-emerald-100 transition-colors"
                      >
                        + Add Today&apos;s Task
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('/planner')}
                        className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-slate-200 transition-colors"
                      >
                        Open Study Planner →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Motivational Banner (Matches Screenshot Bottom-Right) */}
          <div className="rounded-2xl border border-purple-400/20 bg-gradient-to-r from-[#2c225a] via-[#35286b] to-[#2a2054] px-4 py-3.5 flex items-center justify-center gap-2.5 shadow-lg">
            <Star className="h-5 w-5 text-[#fbbf24] fill-[#fbbf24] shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-slate-100 text-center">
              &ldquo;Consistent effort today brings big results tomorrow!&rdquo; 🌱
            </span>
          </div>
        </div>
      </div>

      {/* ====================================================================
          MODAL 1: Log Mock Test Score
          ==================================================================== */}
      {logMockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative flex w-full max-w-md flex-col rounded-3xl border border-blue-500/40 bg-[#0f172a] p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setLogMockModalOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Log Mock Test Score</h3>
                <p className="text-xs text-slate-400">Record your score to update Mock Test Results</p>
              </div>
            </div>

            <form onSubmit={handleSubmitMockTest} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Subject</label>
                <select
                  value={newMockSubject}
                  onChange={(e) => setNewMockSubject(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#090f1d] py-2.5 px-3 text-xs text-white focus:border-blue-400 focus:outline-none"
                >
                  <option value="Science">Science</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Social Science">Social Science</option>
                  <option value="English">English</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Test / Topic Name
                </label>
                <input
                  type="text"
                  value={newMockName}
                  onChange={(e) => setNewMockName(e.target.value)}
                  placeholder="e.g. Science Ch 5 & 6 Mock"
                  required
                  className="w-full rounded-xl border border-white/10 bg-[#090f1d] py-2.5 px-3 text-xs text-white placeholder-slate-500 focus:border-blue-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Marks Scored
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    value={newMockScore}
                    onChange={(e) => setNewMockScore(e.target.value)}
                    required
                    className="w-full rounded-xl border border-white/10 bg-[#090f1d] py-2 px-3 text-xs text-white font-mono focus:border-blue-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Total Marks
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={newMockMaxScore}
                    onChange={(e) => setNewMockMaxScore(e.target.value)}
                    required
                    className="w-full rounded-xl border border-white/10 bg-[#090f1d] py-2 px-3 text-xs text-white font-mono focus:border-blue-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Time (min)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="300"
                    value={newMockTimeTaken}
                    onChange={(e) => setNewMockTimeTaken(e.target.value)}
                    required
                    className="w-full rounded-xl border border-white/10 bg-[#090f1d] py-2 px-3 text-xs text-white font-mono focus:border-blue-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Topics Found Hard (Optional)
                </label>
                <input
                  type="text"
                  value={newMockHardTopics}
                  onChange={(e) => setNewMockHardTopics(e.target.value)}
                  placeholder="e.g. Equations of motion, numericals"
                  className="w-full rounded-xl border border-white/10 bg-[#090f1d] py-2.5 px-3 text-xs text-white placeholder-slate-500 focus:border-blue-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setLogMockModalOpen(false)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/30 hover:brightness-110"
                >
                  Save &amp; Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 2: View All Mock Tests History
          ==================================================================== */}
      {allMockTestsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative flex w-full max-w-2xl max-h-[85vh] flex-col rounded-3xl border border-white/15 bg-[#0f172a] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600/20 text-purple-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">All Mock Test Results</h3>
                  <p className="text-xs text-slate-400">
                    Complete history of your logged and AI-generated mock tests
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAllMockTestsModalOpen(false);
                    setLogMockModalOpen(true);
                  }}
                  className="rounded-xl bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs font-bold text-white"
                >
                  + Log New Score
                </button>
                <button
                  type="button"
                  onClick={() => setAllMockTestsModalOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              {mockTests.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-xs text-slate-400">
                      <th className="pb-2.5 pr-3">Date</th>
                      <th className="pb-2.5 px-3">Test Name</th>
                      <th className="pb-2.5 px-3">Subject</th>
                      <th className="pb-2.5 px-3">Score</th>
                      <th className="pb-2.5 px-3">Time</th>
                      <th className="pb-2.5 pl-3 text-right">Status</th>
                      <th className="pb-2.5 pl-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06] text-xs sm:text-sm">
                    {mockTests.map((t) => {
                      const max = Number(t.maxScore) || 100;
                      const pct = Math.min(
                        100,
                        Math.max(0, Math.round(((Number(t.score) || 0) / max) * 100))
                      );
                      const statusObj = getTestStatusPill(pct);
                      return (
                        <tr key={t.id} className="hover:bg-white/[0.02]">
                          <td className="py-3 pr-3 text-slate-300 whitespace-nowrap">{t.date}</td>
                          <td className="py-3 px-3 text-white font-medium">{t.name}</td>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${getSubjectBadgeClass(
                                t.subject
                              )}`}
                            >
                              {t.subject}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-bold text-white">{pct}%</td>
                          <td className="py-3 px-3 text-slate-300">{t.timeTaken || 34} min</td>
                          <td className="py-3 pl-3 text-right">
                            <span
                              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusObj.className}`}
                            >
                              {statusObj.label}
                            </span>
                          </td>
                          <td className="py-3 pl-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteMockTest(t.id)}
                              className="text-slate-500 hover:text-red-400 p-1"
                              title="Delete record"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="py-12 text-center text-xs text-slate-400">
                  No mock tests recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 3: Subject Details, Chapter Checklist & Mock Test Mistakes Vault
          ==================================================================== */}
      {detailsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative flex w-full max-w-3xl max-h-[88vh] flex-col rounded-3xl border border-white/15 bg-[#0f172a] p-6 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  Detailed Subject Progress &amp; Mistake Diagnostics
                </h3>
                <p className="text-xs text-slate-400">
                  Track chapter completion, review mock test mistakes, and manage your exam schedule
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-xl bg-white/5 p-1 border border-white/10 text-xs">
                  <button
                    type="button"
                    onClick={() => setDetailsActiveTab('subjects')}
                    className={`rounded-lg px-3 py-1 font-semibold transition-all ${
                      detailsActiveTab === 'subjects'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    📚 Chapters
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailsActiveTab('mistakes')}
                    className={`rounded-lg px-3 py-1 font-semibold transition-all ${
                      detailsActiveTab === 'mistakes'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🎯 Mistakes ({mistakeMetrics.total})
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setDetailsModalOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
              {detailsActiveTab === 'subjects' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {subjects.map((subj) => {
                    const doneCount = subj.chapters.filter((c) => c.status !== 'pending').length;
                    return (
                      <div
                        key={subj.id}
                        className="rounded-2xl border border-white/10 bg-[#0b1220] p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-white flex items-center gap-2">
                            <span>{subj.icon}</span>
                            <span>{subj.name}</span>
                          </span>
                          <span className="text-xs font-semibold text-emerald-400">
                            {doneCount} / {subj.chapters.length} Done
                          </span>
                        </div>
                        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                          {subj.chapters.map((ch) => (
                            <div
                              key={ch.id}
                              onClick={() => handleToggleChapterStatus(subj.id, ch.id)}
                              className="flex items-center justify-between gap-2 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] px-3 py-2 cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                {ch.status !== 'pending' ? (
                                  <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#34d399] text-[#052e16]">
                                    <Check className="h-3 w-3 stroke-[3]" />
                                  </div>
                                ) : (
                                  <div className="h-4 w-4 shrink-0 rounded-full border border-slate-500" />
                                )}
                                <span
                                  className={`text-xs truncate ${
                                    ch.status !== 'pending' ? 'text-slate-300' : 'text-slate-200'
                                  }`}
                                >
                                  Ch {ch.number}: {ch.title}
                                </span>
                              </div>
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                  ch.status !== 'pending'
                                    ? 'bg-[#155e4b] text-[#6ee7b7]'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {ch.status !== 'pending' ? 'Done' : 'Pending'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {detailsActiveTab === 'mistakes' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setMistakeFilter('all')}
                        className={`px-2.5 py-1 rounded-lg font-semibold ${
                          mistakeFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400'
                        }`}
                      >
                        All ({mistakeMetrics.total})
                      </button>
                      <button
                        type="button"
                        onClick={() => setMistakeFilter('unmastered')}
                        className={`px-2.5 py-1 rounded-lg font-semibold ${
                          mistakeFilter === 'unmastered'
                            ? 'bg-red-600 text-white'
                            : 'bg-white/5 text-slate-400'
                        }`}
                      >
                        Needs Revision ({mistakeMetrics.unmastered})
                      </button>
                      <button
                        type="button"
                        onClick={() => setMistakeFilter('mastered')}
                        className={`px-2.5 py-1 rounded-lg font-semibold ${
                          mistakeFilter === 'mastered'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white/5 text-slate-400'
                        }`}
                      >
                        Mastered ({mistakeMetrics.mastered})
                      </button>
                    </div>

                    <select
                      value={mistakeSubjectFilter}
                      onChange={(e) => setMistakeSubjectFilter(e.target.value)}
                      className="rounded-lg border border-white/10 bg-[#0b1220] py-1 px-2.5 text-xs text-white"
                    >
                      <option value="all">All Subjects</option>
                      <option value="science">Science</option>
                      <option value="mathematics">Mathematics</option>
                      <option value="social">Social Science</option>
                      <option value="english">English</option>
                    </select>
                  </div>

                  {filteredMistakes.length > 0 ? (
                    <div className="space-y-3">
                      {filteredMistakes.map((m) => (
                        <div
                          key={m.id}
                          className="rounded-2xl border border-white/10 bg-[#0b1220] p-4 space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-cyan-300">
                              {m.subject || 'Mock Test'} • {m.testTopic}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                m.mastered
                                  ? 'bg-[#155e4b] text-[#6ee7b7]'
                                  : 'bg-red-500/20 text-red-300'
                              }`}
                            >
                              {m.mastered ? 'Mastered' : 'Needs Practice'}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm font-semibold text-white">{m.question}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div className="rounded-lg border border-red-500/30 bg-red-950/20 p-2 text-red-200">
                              <strong className="block text-[10px] uppercase text-red-400">
                                Your Answer:
                              </strong>
                              {m.userAnswerText}
                            </div>
                            <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-2 text-emerald-200">
                              <strong className="block text-[10px] uppercase text-emerald-400">
                                Correct Solution:
                              </strong>
                              {m.correctAnswerText}
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                            <button
                              type="button"
                              onClick={() => handleToggleMistake(m.id)}
                              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1 font-semibold text-white"
                            >
                              <CheckCheck className="h-3.5 w-3.5" />
                              <span>{m.mastered ? 'Mark Unresolved' : 'Mark Mastered'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => removeMistake(m.id)}
                              className="text-slate-400 hover:text-red-400 p-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-10 text-center text-xs text-slate-400">
                      No mistakes recorded in this filter!
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
