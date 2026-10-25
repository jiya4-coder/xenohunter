import React, { useState, useEffect, useMemo } from 'react';
import { useStudy } from '../context/StudyContext';
import confetti from 'canvas-confetti';
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  Award,
  Trophy,
  Sparkles,
  Calendar,
  Filter,
  Plus,
  Edit3,
  ChevronDown,
  ChevronRight,
  BookOpen,
  ListChecks,
  Target,
  BarChart2,
  List,
  Compass,
  Flame,
  Check,
  AlertCircle,
  HelpCircle,
  X,
  ArrowRight,
  RotateCcw,
  Star,
  Zap,
  FileText,
  AlertTriangle,
  Lightbulb,
  XCircle,
  Trash2,
  Sliders,
  CheckCheck,
} from 'lucide-react';
import type { TimetableSlot } from './StudyPlannerView';

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
    totalChapters: 10,
    chapters: [
      { id: 'm-1', number: 1, title: 'Number Systems', status: 'revised' },
      { id: 'm-2', number: 2, title: 'Polynomials & Middle-Term Splitting', status: 'done' },
      { id: 'm-3', number: 3, title: 'Coordinate Geometry', status: 'revised' },
      { id: 'm-4', number: 4, title: 'Linear Equations in Two Variables', status: 'done' },
      { id: 'm-5', number: 5, title: 'Introduction to Euclid’s Geometry', status: 'done' },
      { id: 'm-6', number: 6, title: 'Lines and Angles', status: 'done' },
      { id: 'm-7', number: 7, title: 'Triangles & Congruence Theorems', status: 'done' },
      { id: 'm-8', number: 8, title: 'Quadrilaterals', status: 'done' },
      { id: 'm-9', number: 9, title: 'Circles & Angle Subtended Properties', status: 'pending' },
      { id: 'm-10', number: 10, title: 'Surface Areas and Volumes', status: 'pending' },
    ],
  },
  {
    id: 'science',
    name: 'Science (Physics, Chem, Bio)',
    icon: '🔬',
    color: 'from-emerald-600 to-teal-600',
    accentBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    totalChapters: 12,
    chapters: [
      { id: 's-1', number: 1, title: 'Matter in Our Surroundings', status: 'revised' },
      { id: 's-2', number: 2, title: 'Is Matter Around Us Pure?', status: 'done' },
      { id: 's-3', number: 3, title: 'Atoms and Molecules', status: 'revised' },
      { id: 's-4', number: 4, title: 'Structure of the Atom', status: 'done' },
      { id: 's-5', number: 5, title: 'The Fundamental Unit of Life (Cell)', status: 'revised' },
      { id: 's-6', number: 6, title: 'Tissues (Plant & Animal)', status: 'done' },
      { id: 's-7', number: 7, title: 'Motion (Speed, Velocity, Acceleration)', status: 'done' },
      { id: 's-8', number: 8, title: 'Force and Laws of Motion & Friction', status: 'done' },
      { id: 's-9', number: 9, title: 'Gravitation & Floatation Principles', status: 'pending' },
      { id: 's-10', number: 10, title: 'Work, Energy and Power', status: 'pending' },
      { id: 's-11', number: 11, title: 'Sound & Echo Calculations', status: 'pending' },
      { id: 's-12', number: 12, title: 'Improvement in Food Resources', status: 'pending' },
    ],
  },
  {
    id: 'cs',
    name: 'Computer Science & IT',
    icon: '💻',
    color: 'from-purple-600 to-fuchsia-600',
    accentBg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    totalChapters: 8,
    chapters: [
      { id: 'cs-1', number: 1, title: 'Computer System Overview & Hardware', status: 'revised' },
      { id: 'cs-2', number: 2, title: 'Operating Systems & File Management', status: 'done' },
      { id: 'cs-3', number: 3, title: 'Word Processing & Presentation Tools', status: 'done' },
      { id: 'cs-4', number: 4, title: 'Spreadsheet Formulas & Data Charts', status: 'revised' },
      { id: 'cs-5', number: 5, title: 'Introduction to Python Programming', status: 'done' },
      { id: 'cs-6', number: 6, title: 'Data Types, Loops and Conditionals', status: 'done' },
      { id: 'cs-7', number: 7, title: 'Cyber Safety & Digital Ethics', status: 'pending' },
      { id: 'cs-8', number: 8, title: 'Algorithms & Flowchart Logic', status: 'pending' },
    ],
  },
  {
    id: 'sst',
    name: 'Social Science',
    icon: '🌍',
    color: 'from-amber-600 to-orange-600',
    accentBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    totalChapters: 12,
    chapters: [
      { id: 'sst-1', number: 1, title: 'The French Revolution', status: 'revised' },
      { id: 'sst-2', number: 2, title: 'Socialism in Europe & Russian Revolution', status: 'done' },
      { id: 'sst-3', number: 3, title: 'Nazism and the Rise of Hitler', status: 'done' },
      { id: 'sst-4', number: 4, title: 'India: Size and Location', status: 'revised' },
      { id: 'sst-5', number: 5, title: 'Physical Features of India', status: 'done' },
      { id: 'sst-6', number: 6, title: 'Drainage & River Basins', status: 'done' },
      { id: 'sst-7', number: 7, title: 'What is Democracy? Why Democracy?', status: 'done' },
      { id: 'sst-8', number: 8, title: 'Constitutional Design', status: 'pending' },
      { id: 'sst-9', number: 9, title: 'Electoral Politics in India', status: 'pending' },
      { id: 'sst-10', number: 10, title: 'The Story of Village Palampur', status: 'pending' },
      { id: 'sst-11', number: 11, title: 'People as Resource & Employment', status: 'pending' },
      { id: 'sst-12', number: 12, title: 'Poverty as a Challenge', status: 'pending' },
    ],
  },
  {
    id: 'english',
    name: 'English Language & Lit',
    icon: '📚',
    color: 'from-cyan-600 to-blue-600',
    accentBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    totalChapters: 8,
    chapters: [
      { id: 'en-1', number: 1, title: 'The Fun They Had (Prose)', status: 'revised' },
      { id: 'en-2', number: 2, title: 'The Sound of Music & Evelyn Glennie', status: 'done' },
      { id: 'en-3', number: 3, title: 'The Road Not Taken (Poetry)', status: 'revised' },
      { id: 'en-4', number: 4, title: 'The Little Girl & Kezia’s World', status: 'done' },
      { id: 'en-5', number: 5, title: 'A Truly Beautiful Mind (Einstein)', status: 'done' },
      { id: 'en-6', number: 6, title: 'Tenses & Modals Grammar Rules', status: 'pending' },
      { id: 'en-7', number: 7, title: 'Reported Speech & Direct-Indirect', status: 'pending' },
      { id: 'en-8', number: 8, title: 'Descriptive Paragraph Writing', status: 'pending' },
    ],
  },
];

const INITIAL_MOCK_TESTS: MockTestRecord[] = [
  { id: 'mt-1', name: 'Mock Test 1: Number Systems & Motion', subject: 'Maths & Science', score: 68, maxScore: 100, date: 'Oct 04', focusArea: 'Revise: Rationalisation & Vectors' },
  { id: 'mt-2', name: 'Mock Test 2: Atoms, Molecules & Cell', subject: 'Science', score: 72, maxScore: 100, date: 'Oct 08', focusArea: 'Revise: Molecular Mass & Mitochondria' },
  { id: 'mt-3', name: 'Mock Test 3: Polynomials Factoring', subject: 'Mathematics', score: 74, maxScore: 100, date: 'Oct 11', focusArea: 'Revise: Splitting Middle Term' },
  { id: 'mt-4', name: 'Mock Test 4: French Revolution & Civics', subject: 'Social Science', score: 70, maxScore: 100, date: 'Oct 14', focusArea: 'Revise: Estates General & Preamble' },
  { id: 'mt-5', name: 'Mock Test 5: Computer Basics & Python', subject: 'Computer Science', score: 80, maxScore: 100, date: 'Oct 16', focusArea: 'Revise: Loops & Indentation' },
  { id: 'mt-6', name: 'Mock Test 6: Force, Pressure & Friction', subject: 'Science', score: 75, maxScore: 100, date: 'Oct 18', focusArea: 'Revise: Ball Bearings & Pascal Formula' },
  { id: 'mt-7', name: 'Mock Test 7: Grammar & Reading Comprehension', subject: 'English', score: 82, maxScore: 100, date: 'Oct 20', focusArea: 'Revise: Reported Speech Rules' },
  { id: 'mt-8', name: 'Mock Test 8: Coordinate Geometry & Lines', subject: 'Mathematics', score: 79, maxScore: 100, date: 'Oct 22', focusArea: 'Revise: Alternate Interior Angles' },
  { id: 'mt-9', name: 'Mock Test 9: Work, Energy & Sound Basics', subject: 'Science', score: 81, maxScore: 100, date: 'Oct 23', focusArea: 'Revise: Kinetic Energy Derivation' },
  { id: 'mt-10', name: 'Mock Test 10: Linear Equations in Two Vars', subject: 'Mathematics', score: 84, maxScore: 100, date: 'Oct 24', focusArea: 'Revise: Graphical Intersections' },
  { id: 'mt-11', name: 'Mock Test 11: Term 1 Comprehensive Diagnostic', subject: 'All Subjects', score: 82, maxScore: 100, date: 'Oct 24', focusArea: 'Revise: Tissues & River Basins' },
  { id: 'mt-12', name: 'Mock Test 12: Pre-Board Speed Drill #12', subject: 'Maths & Science', score: 88, maxScore: 100, date: 'Oct 25', focusArea: 'Revise: Sound Reflection & Echoes' },
];

const INITIAL_TODAY_TASKS: TodayPlannerTask[] = [
  { id: 't-1', subject: 'Mathematics', title: 'Revise Formula Sheet: Polynomials ($P = F/A$ & Factoring)', completed: true, timeSlot: '04:00 PM' },
  { id: 't-2', subject: 'Science', title: 'Practice 5 Numerical Problems on Pressure & Force', completed: true, timeSlot: '04:45 PM' },
  { id: 't-3', subject: 'Science', title: 'Solve 10 MCQs on Cell Organelles & Osmosis', completed: true, timeSlot: '05:30 PM' },
  { id: 't-4', subject: 'Social Science', title: 'Quick 15-min Flashcard Revision on French Revolution', completed: true, timeSlot: '06:15 PM' },
  { id: 't-5', subject: 'Mathematics', title: 'Complete NCERT Exercise 8.2 on Circles & Notes', completed: false, timeSlot: '07:00 PM' },
];



export const ProgressRoadmapView: React.FC = () => {
  const {
    profile,
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
      const saved = localStorage.getItem(`studybot_timetable_c${currentClassNum}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Synced Subject Exam Configs from Study Planner
  const [examConfigs, setExamConfigs] = useState<Record<string, any>>(() => {
    try {
      const saved = localStorage.getItem(`studybot_exam_configs_c${currentClassNum}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Two-way synchronization with Study Planner
  useEffect(() => {
    const syncPlannerData = () => {
      try {
        const savedSlots = localStorage.getItem(`studybot_timetable_c${currentClassNum}`);
        if (savedSlots) {
          setPlannerSlots(JSON.parse(savedSlots));
        }
        const savedConfigs = localStorage.getItem(`studybot_exam_configs_c${currentClassNum}`);
        if (savedConfigs) {
          setExamConfigs(JSON.parse(savedConfigs));
        }
      } catch (_) {}
    };

    syncPlannerData();
    window.addEventListener('studybot:timetable-updated', syncPlannerData);
    window.addEventListener('storage', syncPlannerData);
    return () => {
      window.removeEventListener('studybot:timetable-updated', syncPlannerData);
      window.removeEventListener('storage', syncPlannerData);
    };
  }, [currentClassNum]);

  // Local storage persisted state
  const [subjects, setSubjects] = useState<SubjectSyllabus[]>(() => {
    try {
      const saved = localStorage.getItem('studybot_progress_subjects');
      return saved ? JSON.parse(saved) : INITIAL_SUBJECTS;
    } catch {
      return INITIAL_SUBJECTS;
    }
  });

  const [mockTests, setMockTests] = useState<MockTestRecord[]>(() => {
    try {
      const saved = localStorage.getItem('studybot_progress_mocktests');
      return saved ? JSON.parse(saved) : INITIAL_MOCK_TESTS;
    } catch {
      return INITIAL_MOCK_TESTS;
    }
  });

  const [todayTasks, setTodayTasks] = useState<TodayPlannerTask[]>(() => {
    try {
      const saved = localStorage.getItem('studybot_progress_today_tasks');
      return saved ? JSON.parse(saved) : INITIAL_TODAY_TASKS;
    } catch {
      return INITIAL_TODAY_TASKS;
    }
  });

  const [totalCompletedTasks, setTotalCompletedTasks] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('studybot_progress_total_tasks');
      return saved ? Number(saved) : 142;
    } catch {
      return 142;
    }
  });

  // UI state
  const [bottomActiveTab, setBottomActiveTab] = useState<'planner_report' | 'mock_mistakes'>('planner_report');

  // Filter state for Mock Test Mistakes & Study Planner Report
  const [mistakeFilter, setMistakeFilter] = useState<'all' | 'unmastered' | 'mastered'>('all');
  const [mistakeSubjectFilter, setMistakeSubjectFilter] = useState<string>('all');
  const [rebalanceNotification, setRebalanceNotification] = useState<string | null>(null);

  // Modals state (Log Mock Test modal is kept active)
  const [logMockModalOpen, setLogMockModalOpen] = useState<boolean>(false);

  // Form State for Log Mock Test Modal
  const [newMockSubject, setNewMockSubject] = useState<string>('Mathematics');
  const [newMockName, setNewMockName] = useState<string>('Pre-Board Chapter Quiz #13');
  const [newMockScore, setNewMockScore] = useState<string>('85');
  const [newMockMaxScore, setNewMockMaxScore] = useState<string>('100');
  const [newMockHardTopics, setNewMockHardTopics] = useState<string>('Surface Area formulas, Angle theorem in circles');

  // Persist state updates to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('studybot_progress_mocktests', JSON.stringify(mockTests));
    } catch (_) {}
  }, [mockTests]);

  useEffect(() => {
    try {
      localStorage.setItem('studybot_progress_today_tasks', JSON.stringify(todayTasks));
    } catch (_) {}
  }, [todayTasks]);

  useEffect(() => {
    try {
      localStorage.setItem('studybot_progress_total_tasks', String(totalCompletedTasks));
    } catch (_) {}
  }, [totalCompletedTasks]);

  // Nearest Exam from Study Planner exam configs
  const nearestExam = useMemo(() => {
    const configs = Object.values(examConfigs) as { subjectName?: string; examDate?: string }[];
    if (configs.length === 0) {
      return { daysLeft: 24, label: '🎯 Final Exams in 24 Days', subjectName: 'Final Exams' };
    }
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
      return { daysLeft: 24, label: '🎯 Final Exams in 24 Days', subjectName: 'Final Exams' };
    }

    const diffText = minDiff === 0 ? 'Today!' : `${minDiff} Day${minDiff > 1 ? 's' : ''}`;
    return {
      daysLeft: minDiff,
      label: `🎯 ${nearest.subjectName || 'Exam'} in ${diffText}`,
      subjectName: nearest.subjectName || 'Exam',
    };
  }, [examConfigs]);

  // Today's slots from Study Planner
  const todayPlannerSlots = useMemo(() => {
    return plannerSlots.filter((s) => s.dayIndex === 0);
  }, [plannerSlots]);

  const hasLivePlanner = plannerSlots.length > 0;

  // Real-time planner velocity & counts
  const plannerTotalTasks = hasLivePlanner ? plannerSlots.length : 180;
  const plannerCompletedTasks = hasLivePlanner
    ? plannerSlots.filter((s) => s.completed).length
    : totalCompletedTasks;
  const plannerVelocity = Math.round((plannerCompletedTasks / (plannerTotalTasks || 1)) * 100);

  const todayCompletedCount = useMemo(() => {
    if (todayPlannerSlots.length > 0) {
      return todayPlannerSlots.filter((s) => s.completed).length;
    }
    return todayTasks.filter((t) => t.completed).length;
  }, [todayPlannerSlots, todayTasks]);

  const todayTotalCount = useMemo(() => {
    if (todayPlannerSlots.length > 0) {
      return todayPlannerSlots.length;
    }
    return todayTasks.length;
  }, [todayPlannerSlots, todayTasks]);

  // Active today task (either live from Study Planner or fallback)
  const activeTodayTask = useMemo(() => {
    if (todayPlannerSlots.length > 0) {
      const nextUnchecked = todayPlannerSlots.find((s) => !s.completed);
      if (nextUnchecked) {
        return {
          id: nextUnchecked.id,
          title: `${nextUnchecked.chapterTitle} (${nextUnchecked.subjectName})`,
          completed: false,
          timeSlot: `${nextUnchecked.startTime} – ${nextUnchecked.endTime}`,
          isPlannerSlot: true,
        };
      }
      return null;
    }
    const nextUnchecked = todayTasks.find((t) => !t.completed);
    if (nextUnchecked) {
      return {
        id: nextUnchecked.id,
        title: `${nextUnchecked.title} (${nextUnchecked.subject})`,
        completed: false,
        timeSlot: nextUnchecked.timeSlot,
        isPlannerSlot: false,
      };
    }
    return null;
  }, [todayPlannerSlots, todayTasks]);

  // Next unchecked task fallback reference
  const nextUncheckedTask = useMemo(() => {
    return todayTasks.find((t) => !t.completed) || null;
  }, [todayTasks]);

  // ====================================================================
  // Handlers
  // ====================================================================



  // One-click toggle today's planner task or live Study Planner slot
  const handleTogglePlannerSlot = (taskId: string, isPlannerSlot?: boolean) => {
    if (hasLivePlanner && (isPlannerSlot || plannerSlots.some((s) => s.id === taskId))) {
      const next = plannerSlots.map((s) => (s.id === taskId ? { ...s, completed: !s.completed } : s));
      setPlannerSlots(next);
      try {
        localStorage.setItem(`studybot_timetable_c${currentClassNum}`, JSON.stringify(next));
        window.dispatchEvent(new CustomEvent('studybot:timetable-updated'));
      } catch (_) {}

      const slot = plannerSlots.find((s) => s.id === taskId);
      if (slot && !slot.completed) {
        addStudyMinutes(45);
        confetti({
          particleCount: 25,
          spread: 50,
          origin: { y: 0.7 },
          colors: ['#10b981', '#3b82f6', '#fbbf24'],
        });
      }
      return;
    }

    // Fallback toggle for static todayTasks
    setTodayTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const nowCompleted = !t.completed;
        if (nowCompleted) {
          setTotalCompletedTasks((count) => count + 1);
          addStudyMinutes(15);
          confetti({
            particleCount: 25,
            spread: 50,
            origin: { y: 0.7 },
            colors: ['#10b981', '#3b82f6', '#fbbf24'],
          });
        } else {
          setTotalCompletedTasks((count) => Math.max(0, count - 1));
        }
        return { ...t, completed: nowCompleted };
      })
    );
  };

  const handleTogglePlannerTask = (taskId: string) => {
    handleTogglePlannerSlot(taskId, false);
  };

  // Submit Mock Test
  const handleSubmitMockTest = (e: React.FormEvent) => {
    e.preventDefault();
    const sc = parseFloat(newMockScore) || 0;
    const maxSc = parseFloat(newMockMaxScore) || 100;
    const pct = Math.round((sc / maxSc) * 100);

    const newRecord: MockTestRecord = {
      id: `mt-${Date.now()}`,
      name: newMockName.trim() || `Mock Test #${mockTests.length + 1}`,
      subject: newMockSubject,
      score: sc,
      maxScore: maxSc,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      focusArea: newMockHardTopics.trim() ? `Revise: ${newMockHardTopics.trim()}` : 'Great overall retention!',
    };

    const updatedList = [...mockTests, newRecord];
    setMockTests(updatedList);
    try {
      localStorage.setItem('studybot_progress_mocktests', JSON.stringify(updatedList));
      window.dispatchEvent(new Event('studybot:mocktest-updated'));
    } catch (_) {}
    setLogMockModalOpen(false);
    addStudyMinutes(45);

    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899'],
    });
  };



  // Subject-wise Study Planner Breakdown (tells percent of work done per subject)
  const subjectPlannerStats = useMemo(() => {
    const subjectsMap: Record<
      string,
      {
        total: number;
        completed: number;
        name: string;
        icon: string;
        nextChapter?: string;
        examDate?: string;
      }
    > = {
      maths: { total: 0, completed: 0, name: 'Mathematics', icon: '📐' },
      science: { total: 0, completed: 0, name: 'Science', icon: '🔬' },
      sst: { total: 0, completed: 0, name: 'Social Science', icon: '🌍' },
      english: { total: 0, completed: 0, name: 'English', icon: '📚' },
      hindi: { total: 0, completed: 0, name: 'Hindi', icon: '🇮🇳' },
    };

    if (plannerSlots.length > 0) {
      plannerSlots.forEach((slot) => {
        const key = slot.subjectKey || 'maths';
        if (!subjectsMap[key]) {
          subjectsMap[key] = {
            total: 0,
            completed: 0,
            name: slot.subjectName || key,
            icon: '📖',
          };
        }
        subjectsMap[key].total += 1;
        if (slot.completed) {
          subjectsMap[key].completed += 1;
        } else if (!subjectsMap[key].nextChapter) {
          subjectsMap[key].nextChapter = slot.chapterTitle;
        }
      });
    } else {
      // Fallback from subjects state
      subjects.forEach((s) => {
        const done = s.chapters.filter((c) => c.status !== 'pending').length;
        subjectsMap[s.id] = {
          total: s.totalChapters,
          completed: done,
          name: s.name,
          icon: s.icon,
          nextChapter: s.chapters.find((c) => c.status === 'pending')?.title,
        };
      });
    }

    // Attach exam dates if available from examConfigs
    Object.keys(subjectsMap).forEach((k) => {
      if (examConfigs[k]?.examDate) {
        subjectsMap[k].examDate = examConfigs[k].examDate;
      }
    });

    return Object.entries(subjectsMap).map(([key, val]) => {
      const pct = val.total > 0 ? Math.round((val.completed / val.total) * 100) : 0;
      return {
        key,
        ...val,
        percent: pct,
      };
    });
  }, [plannerSlots, subjects, examConfigs]);

  // Executive AI Report of the Study Planner
  const plannerReport = useMemo(() => {
    const totalSlots = plannerTotalTasks;
    const completedSlots = plannerCompletedTasks;
    const remainingSlots = Math.max(0, totalSlots - completedSlots);
    const overallPct = plannerVelocity;

    const hoursPerDay = profile.dailyHours || 3;
    const remainingHours = Math.round(remainingSlots * 1.25);
    const daysNeeded = Math.ceil(remainingHours / (hoursPerDay || 3));

    // Calculate completion date estimate
    const estDate = new Date();
    estDate.setDate(estDate.getDate() + Math.max(1, daysNeeded));
    const estDateFormatted = estDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    // Pacing status & diagnostic report
    let statusLabel = '🟢 On Track for Target Exams';
    let statusDescription = `At your current velocity of ${hoursPerDay} hrs/day, you are projected to complete 100% of your exam preparation by ${estDateFormatted} (${
      nearestExam.daysLeft > daysNeeded
        ? `${nearestExam.daysLeft - daysNeeded} days buffer before your first exam`
        : 'right on schedule'
    }).`;

    if (overallPct >= 75) {
      statusLabel = '⚡ Ahead of Target Pace';
      statusDescription = `Superb consistency! You have completed ${overallPct}% of all scheduled study planner tasks. You will have plenty of time for full-length mock drills.`;
    } else if (overallPct < 40) {
      statusLabel = '🟡 Needs Accelerated Pace';
      statusDescription = `You have ${remainingSlots} study sessions remaining. Consider logging an extra 30–45 mins this weekend to stay comfortably ahead of exam dates.`;
    }

    const sortedByPercent = [...subjectPlannerStats].sort((a, b) => b.percent - a.percent);
    const leadingSubject = sortedByPercent[0] || null;
    const focusSubject = sortedByPercent[sortedByPercent.length - 1] || null;

    return {
      totalSlots,
      completedSlots,
      remainingSlots,
      overallPct,
      hoursPerDay,
      remainingHours,
      daysNeeded,
      estDateFormatted,
      statusLabel,
      statusDescription,
      leadingSubject,
      focusSubject,
    };
  }, [plannerTotalTasks, plannerCompletedTasks, plannerVelocity, profile.dailyHours, nearestExam.daysLeft, subjectPlannerStats]);

  // 1-Click Rebalance Timetable from My Progress
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
      localStorage.setItem(`studybot_timetable_c${currentClassNum}`, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('studybot:timetable-updated'));
    } catch (_) {}

    setRebalanceNotification(
      `🔄 ${uncompletedToday.length} unfinished study session${
        uncompletedToday.length > 1 ? 's have' : ' has'
      } been shifted into tomorrow without changing exam dates!`
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
    const masteryRate = total > 0 ? Math.round((mastered / total) * 100) : 100;
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

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-[#07090e] text-[#ecebfa] font-['Sora'] select-none p-4 md:p-6 lg:p-7 space-y-5 scrollbar-thin">
      {/* ====================================================================
          TOP HEADER: Clean Title, Countdown & Action Controls
          ==================================================================== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-inner">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-white tracking-wide">
                My Exam Progress
              </h1>
            </div>
          </div>

          {/* Target Exam Countdown Pill (Click to open Study Planner) */}
          <button
            type="button"
            onClick={() => setActiveTab('/planner')}
            className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-gradient-to-r from-amber-950/40 to-amber-900/20 px-3 py-1 text-xs font-semibold text-amber-300 shadow-sm hover:border-amber-400 hover:bg-amber-900/40 transition-all cursor-pointer group active:scale-95"
            title="Click to view exam schedule in Study Planner"
          >
            <Target className="h-3.5 w-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
            <span>{nearestExam.label}</span>
          </button>

          <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/30 px-2.5 py-1 text-[0.7rem] font-medium text-emerald-300">
            <Sparkles className="h-3 w-3 text-emerald-400" />
            <span>Class {currentClassNum} · 2026–27 NCF-SE</span>
          </div>
        </div>

        {/* Right Controls: Subject Filter + Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* 📅 Open Study Planner CTA */}
          <button
            type="button"
            onClick={() => setActiveTab('/planner')}
            className="flex items-center gap-1.5 rounded-xl border border-blue-500/35 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-300 hover:bg-blue-500/20 hover:text-white transition-all shadow-sm active:scale-95"
            title="Open Study Planner & Day-by-Day Action Timetable"
          >
            <Calendar className="h-3.5 w-3.5 text-blue-400" />
            <span>📅 Study Planner</span>
          </button>

          {/* 🏆 Achievements & Badges CTA */}
          <button
            type="button"
            onClick={() => setActiveTab('/achievements')}
            className="flex items-center gap-1.5 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 hover:text-white transition-all shadow-sm active:scale-95"
            title="View Badges & Achievements (5x Full Marks, 90+ Score & 1-Hr Streak)"
          >
            <Trophy className="h-3.5 w-3.5 text-amber-400" />
            <span>🏆 Achievements</span>
          </button>


          {/* + Log Mock Test Primary CTA */}
          <button
            type="button"
            onClick={() => setLogMockModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-[0_0_20px_rgba(37,99,235,0.35)] hover:brightness-110 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>+ Log Mock Test</span>
          </button>
        </div>
      </div>

      {/* Re-balance Toast Banner (If triggered from Progress) */}
      {rebalanceNotification && (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-500/40 bg-emerald-950/70 p-3 text-xs font-bold text-emerald-200 animate-in fade-in duration-200 shadow-lg">
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
          SECTION 3: STUDY PLANNER WORK PROGRESS, REPORT & MOCK TEST MISTAKES
          (Replaces the removed circled roadmap & heatmap section)
          ==================================================================== */}
      <div className="rounded-2xl border border-white/10 bg-[#0b1222] p-5 shadow-md">
        {/* Unified Card Header with 2-Tab Switcher */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-4 mb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 tracking-wide">
              <span>📊</span> Study Planner Work &amp; Mock Test Diagnostics
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live connection to your Master Timetable: track percent of work completed, executive schedule report, and questions to revise from mock tests.
            </p>
          </div>

          {/* 2-Tab Switcher */}
          <div className="flex items-center rounded-xl bg-white/5 p-1 border border-white/10">
            <button
              type="button"
              onClick={() => setBottomActiveTab('planner_report')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                bottomActiveTab === 'planner_report'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="h-3.5 w-3.5 text-blue-300" />
              <span>📋 Planner Work &amp; Report</span>
            </button>
            <button
              type="button"
              onClick={() => setBottomActiveTab('mock_mistakes')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                bottomActiveTab === 'mock_mistakes'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              <span>🎯 Mock Test Mistakes ({mistakeMetrics.total})</span>
            </button>
          </div>
        </div>

        {/* TAB 1: 📋 Study Planner Work Progress & Executive Report */}
        {bottomActiveTab === 'planner_report' && (
          <div className="space-y-5 py-1">
            {/* 3 Top Summary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Card 1: How many percent of work is done */}
              <div className="rounded-xl border border-white/10 bg-[#080d19] p-4 flex flex-col justify-between hover:border-blue-500/30 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span>⚡</span> Work Done in Planner
                  </span>
                  <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[0.65rem] font-bold text-blue-400 border border-blue-500/20">
                    {plannerReport.overallPct >= 75 ? 'Ahead of Pace' : 'Active Progress'}
                  </span>
                </div>

                <div className="my-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white tracking-tight">
                      {plannerReport.overallPct}%
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">of work done</span>
                  </div>
                  <p className="text-[0.72rem] text-slate-400 mt-1">
                    <strong className="text-emerald-400 font-bold">{plannerReport.completedSlots}</strong> of{' '}
                    <strong className="text-white">{plannerReport.totalSlots}</strong> scheduled study sessions finished.
                  </p>
                </div>

                {/* Progress bar */}
                <div className="space-y-1 mt-1">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800 border border-white/5">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-teal-400 rounded-full transition-all duration-700"
                      style={{ width: `${plannerReport.overallPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[0.65rem] text-slate-500 font-mono">
                    <span>{plannerReport.remainingSlots} sessions left</span>
                    <span>Target: 100%</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Today's Work Completion */}
              <div className="rounded-xl border border-white/10 bg-[#080d19] p-4 flex flex-col justify-between hover:border-emerald-500/30 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span>📅</span> Today's Workload
                  </span>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[0.65rem] font-bold text-emerald-400 border border-emerald-500/20">
                    {todayCompletedCount >= todayTotalCount && todayTotalCount > 0 ? 'Completed' : 'In Action'}
                  </span>
                </div>

                <div className="my-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-emerald-400 tracking-tight">
                      {todayCompletedCount} / {todayTotalCount}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">tasks today</span>
                  </div>
                  <p className="text-[0.72rem] text-slate-400 mt-1">
                    {todayTotalCount > todayCompletedCount ? (
                      <span>
                        <strong className="text-amber-300">{todayTotalCount - todayCompletedCount} more target</strong> to complete today's goal.
                      </span>
                    ) : (
                      <span className="text-emerald-300 font-medium">All planned timetable slots done for today! 🎉</span>
                    )}
                  </p>
                </div>

                <div className="mt-1 pt-2 border-t border-white/5 flex items-center justify-between text-[0.68rem]">
                  <span className="text-slate-400 truncate max-w-[180px]">
                    {activeTodayTask ? `Next: ${activeTodayTask.title}` : 'All caught up!'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('/planner')}
                    className="text-cyan-400 hover:underline font-semibold shrink-0"
                  >
                    Open Day →
                  </button>
                </div>
              </div>

              {/* Card 3: Curriculum Velocity & Forecast */}
              <div className="rounded-xl border border-white/10 bg-[#080d19] p-4 flex flex-col justify-between hover:border-purple-500/30 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span>⏱️</span> Velocity &amp; Forecast
                  </span>
                  <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[0.65rem] font-bold text-purple-300 border border-purple-500/20">
                    {plannerReport.hoursPerDay}h / Day Capacity
                  </span>
                </div>

                <div className="my-2">
                  <div className="text-xs text-slate-400 mb-0.5 font-medium">Estimated 100% Completion:</div>
                  <div className="text-xl sm:text-2xl font-extrabold text-white">
                    {plannerReport.estDateFormatted}
                  </div>
                  <p className="text-[0.7rem] text-slate-400 mt-1">
                    {nearestExam.daysLeft > 0 ? (
                      <span className="text-cyan-300 font-medium">
                        🎯 Next exam in {nearestExam.daysLeft} days ({nearestExam.subjectName})
                      </span>
                    ) : (
                      <span>Exams in progress</span>
                    )}
                  </p>
                </div>

                <div className="mt-1 pt-2 border-t border-white/5 flex items-center justify-between text-[0.68rem] text-slate-400">
                  <span>Pacing: Steady &amp; Balanced</span>
                  <button
                    type="button"
                    onClick={handleRebalanceFromProgress}
                    className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition-colors"
                    title="Shift any missed tasks forward"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Re-balance</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Subject-Wise Work Breakdown (Tells percent of work done per subject) */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>📚</span> Subject-Wise Study Planner Work Breakdown
                </h4>
                <span className="text-[0.68rem] text-slate-400">Synced with 2026–27 NCERT Curricula</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {subjectPlannerStats.map((subj) => (
                  <div
                    key={subj.key}
                    className="rounded-xl border border-white/10 bg-[#080d19] p-3 flex flex-col justify-between hover:border-blue-500/40 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                          <span>{subj.icon}</span>
                          <span className="truncate">{subj.name}</span>
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[0.62rem] font-bold ${
                            subj.percent >= 75
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : subj.percent >= 45
                              ? 'bg-blue-500/20 text-blue-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {subj.percent}% Done
                        </span>
                      </div>

                      {/* Smooth Progress Bar */}
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800 mb-2">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-500"
                          style={{ width: `${subj.percent}%` }}
                        />
                      </div>

                      <div className="text-[0.68rem] text-slate-400 flex justify-between font-mono mb-1">
                        <span>{subj.completed} / {subj.total} Sessions</span>
                        <span>{subj.total - subj.completed} left</span>
                      </div>
                    </div>

                    <div className="text-[0.65rem] text-slate-400 border-t border-white/5 pt-1.5 mt-1.5 truncate">
                      {subj.nextChapter ? (
                        <span className="truncate block" title={subj.nextChapter}>
                          Next: <strong className="text-slate-200">{subj.nextChapter}</strong>
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-medium">All sessions completed!</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Executive AI Diagnostic Report of the Study Planner */}
            <div className="rounded-xl border border-blue-500/30 bg-gradient-to-r from-[#0d162d] via-[#091122] to-[#0d162d] p-4 shadow-sm">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-white/10 pb-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                    <Sparkles className="h-4 w-4 text-cyan-300" />
                  </div>
                  <div>
                    <h4 className="text-xs md:text-sm font-bold text-white flex items-center gap-2">
                      <span>Executive Study Planner Diagnostic Report</span>
                      <span className="rounded-full bg-emerald-500/20 border border-emerald-400/30 px-2 py-0.5 text-[0.65rem] font-bold text-emerald-300">
                        {plannerReport.statusLabel}
                      </span>
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                      {plannerReport.statusDescription}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleRebalanceFromProgress}
                    className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/25 transition-all active:scale-95 shadow-sm"
                    title="Shifts any unfinished slots without breaking exam dates"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>🔄 Re-balance Timetable</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('/planner')}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs font-bold text-white transition-all active:scale-95 shadow-sm"
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Open Planner Hub ➔</span>
                  </button>
                </div>
              </div>

              {/* 2 Diagnostic Callouts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg bg-white/5 p-2.5 border border-white/5 flex items-start gap-2.5">
                  <span className="text-base">🏆</span>
                  <div>
                    <span className="font-bold text-white block">Leading Subject Mastery</span>
                    <span className="text-slate-300 text-[0.72rem] leading-relaxed">
                      You are strongest in <strong className="text-emerald-400">{plannerReport.leadingSubject?.name || 'Mathematics'}</strong> with{' '}
                      <strong className="text-emerald-400">{plannerReport.leadingSubject?.percent || 0}%</strong> of planned work completed.
                    </span>
                  </div>
                </div>

                <div className="rounded-lg bg-white/5 p-2.5 border border-white/5 flex items-start gap-2.5">
                  <span className="text-base">🎯</span>
                  <div>
                    <span className="font-bold text-white block">Recommended Priority Focus</span>
                    <span className="text-slate-300 text-[0.72rem] leading-relaxed">
                      Allocate extra revision to <strong className="text-amber-300">{plannerReport.focusSubject?.name || 'Science'}</strong> ({plannerReport.focusSubject?.percent || 0}% work done) to balance your exam readiness.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: 🎯 Mock Test Mistakes & Conceptual Diagnostics */}
        {bottomActiveTab === 'mock_mistakes' && (
          <div className="space-y-4 py-1">
            {/* Top Metric Strip & Filter Controls */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-white/10 pb-3">
              {/* Counters */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-slate-300 font-semibold">
                  Total Mistakes Logged: <strong className="text-white font-mono">{mistakeMetrics.total}</strong>
                </span>
                <span className="rounded-lg bg-red-500/15 border border-red-500/30 px-2.5 py-1 text-red-300 font-semibold">
                  🔴 Needs Revision: <strong className="font-mono">{mistakeMetrics.unmastered}</strong>
                </span>
                <span className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-emerald-300 font-semibold">
                  🟢 Mastered: <strong className="font-mono">{mistakeMetrics.mastered}</strong>
                </span>
                <span className="rounded-lg bg-blue-500/15 border border-blue-500/30 px-2.5 py-1 text-blue-300 font-semibold">
                  Resolution Rate: <strong className="font-mono">{mistakeMetrics.masteryRate}%</strong>
                </span>
              </div>

              {/* Filter Controls */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                {/* Mastery Filter Toggle */}
                <div className="flex items-center rounded-lg bg-white/5 p-1 border border-white/10 text-xs">
                  <button
                    type="button"
                    onClick={() => setMistakeFilter('all')}
                    className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                      mistakeFilter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All ({mistakeMetrics.total})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMistakeFilter('unmastered')}
                    className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                      mistakeFilter === 'unmastered' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Unmastered ({mistakeMetrics.unmastered})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMistakeFilter('mastered')}
                    className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                      mistakeFilter === 'mastered' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Mastered ({mistakeMetrics.mastered})
                  </button>
                </div>

                {/* Subject Filter Dropdown */}
                <select
                  value={mistakeSubjectFilter}
                  onChange={(e) => setMistakeSubjectFilter(e.target.value)}
                  className="rounded-lg border border-white/10 bg-[#080d19] py-1 px-2.5 text-xs text-white focus:border-blue-400 focus:outline-none cursor-pointer"
                >
                  <option value="all">All Subjects ▾</option>
                  <option value="science">🔬 Science</option>
                  <option value="mathematics">📐 Mathematics</option>
                  <option value="social">🌍 Social Science</option>
                  <option value="english">📚 English</option>
                </select>
              </div>
            </div>

            {/* List of Mock Test Mistake Items */}
            {filteredMistakes.length > 0 ? (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
                {filteredMistakes.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-xl border p-4 transition-all ${
                      m.mastered
                        ? 'border-emerald-500/30 bg-[#071318]/70 hover:border-emerald-500/50'
                        : 'border-red-500/30 bg-[#160c14]/70 hover:border-red-500/50'
                    }`}
                  >
                    {/* Top Row: Subject, Topic & Status */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-white/10 px-2 py-0.5 text-[0.68rem] font-bold text-white uppercase">
                          {m.subject || 'Mock Test'}
                        </span>
                        <span className="text-xs font-bold text-cyan-300">
                          {m.testTopic}
                        </span>
                        <span className="text-[0.68rem] text-slate-400 font-mono">
                          • {m.date || 'Recent Mock'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[0.65rem] font-bold border ${
                            m.mastered
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-red-500/20 text-red-300 border-red-500/40'
                          }`}
                        >
                          {m.mastered ? '🟢 Mastered & Retained' : '🔴 Needs Revision'}
                        </span>
                      </div>
                    </div>

                    {/* Question Statement */}
                    <div className="text-xs sm:text-sm font-semibold text-white mb-3 leading-relaxed">
                      ❓ {m.question}
                    </div>

                    {/* Side-by-Side Mistake vs Correct Answer */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-3 text-xs">
                      {/* What user answered */}
                      <div className="rounded-lg border border-red-500/30 bg-red-950/25 p-2.5 text-slate-200">
                        <span className="text-[0.65rem] font-bold text-red-400 uppercase tracking-wider block mb-1">
                          ❌ Your Choice in Mock Test:
                        </span>
                        <span className="text-red-200 font-medium">
                          {m.userAnswerText || 'Unattempted / Incorrect Choice'}
                        </span>
                      </div>

                      {/* Correct answer */}
                      <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/25 p-2.5 text-slate-200">
                        <span className="text-[0.65rem] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                          ✅ Correct NCERT Solution:
                        </span>
                        <span className="text-emerald-200 font-medium">
                          {m.correctAnswerText || 'See full solution explanation below'}
                        </span>
                      </div>
                    </div>

                    {/* Conceptual Explanation Box */}
                    {m.explanation && (
                      <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-2.5 text-xs text-slate-200 mb-3">
                        <span className="text-[0.68rem] font-bold text-amber-300 flex items-center gap-1 mb-1">
                          <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
                          <span>Why this answer is correct &amp; Core Concept:</span>
                        </span>
                        <p className="text-slate-300 text-[0.72rem] leading-relaxed">
                          {m.explanation}
                        </p>
                      </div>
                    )}

                    {/* Actions Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                      <button
                        type="button"
                        onClick={() => handleToggleMistake(m.id)}
                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                          m.mastered
                            ? 'bg-white/10 text-slate-300 hover:bg-white/20'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                        }`}
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                        <span>{m.mastered ? 'Mark as Unresolved' : 'Mark Mastered & Understood'}</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveTab('/practice')}
                          className="text-cyan-400 hover:underline text-[0.72rem] font-semibold"
                        >
                          Practice Similar Questions →
                        </button>

                        <button
                          type="button"
                          onClick={() => removeMistake(m.id)}
                          className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-white/5 transition-colors"
                          title="Remove from Mistake Vault"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/15 bg-white/5 p-8 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-2 opacity-80" />
                <h4 className="text-sm font-bold text-white mb-1">No Mistakes in this Filter!</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
                  {mistakeFilter === 'unmastered'
                    ? 'All mock test mistakes have been mastered! Great job locking in concepts.'
                    : 'Take a chapter quiz or mock test to diagnose areas for revision.'}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('/mock-test')}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 transition-colors shadow-md"
                >
                  Start New Mock Test →
                </button>
              </div>
            )}

            {/* Recent Mock Test History Strip */}
            <div className="rounded-xl border border-white/5 bg-[#080d19] p-3 text-xs">
              <span className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Recent Mock Test Focus Areas &amp; Revision Log:
              </span>
              <div className="flex flex-wrap gap-2">
                {mockTests.slice(-4).map((t) => (
                  <div
                    key={t.id}
                    className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[0.7rem] text-slate-300 flex items-center gap-1.5"
                  >
                    <span className="font-bold text-white">{t.name}:</span>
                    <span className="text-amber-300">{t.focusArea}</span>
                    <span className="text-emerald-400 font-mono font-bold">({t.score}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ====================================================================
          MODAL 1: 1-Click "Log Mock Test" Mini-Popup
          ==================================================================== */}
      {logMockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative flex w-full max-w-md flex-col rounded-3xl border border-blue-500/40 bg-[#0c1424] p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setLogMockModalOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Log Mock Test Score</h3>
                <p className="text-xs text-slate-400">Record your score in 5 seconds to update progress</p>
              </div>
            </div>

            <form onSubmit={handleSubmitMockTest} className="space-y-4">
              {/* Field 1: Subject & Test Name */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Subject
                </label>
                <select
                  value={newMockSubject}
                  onChange={(e) => setNewMockSubject(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#080d19] py-2 px-3 text-xs text-white focus:border-blue-400 focus:outline-none"
                >
                  <option value="Mathematics">📐 Mathematics</option>
                  <option value="Science">🔬 Science (Physics, Chem, Bio)</option>
                  <option value="Computer Science">💻 Computer Science & IT</option>
                  <option value="Social Science">🌍 Social Science</option>
                  <option value="English">📚 English Language & Lit</option>
                  <option value="All Subjects">⭐ Comprehensive All Subjects</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Test / Paper Name
                </label>
                <input
                  type="text"
                  value={newMockName}
                  onChange={(e) => setNewMockName(e.target.value)}
                  placeholder="e.g. Chapter 8 Force & Pressure Mock"
                  required
                  className="w-full rounded-xl border border-white/10 bg-[#080d19] py-2 px-3 text-xs text-white placeholder-slate-500 focus:border-blue-400 focus:outline-none"
                />
              </div>

              {/* Field 2: Marks Scored / Total Marks */}
              <div className="grid grid-cols-2 gap-3">
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
                    className="w-full rounded-xl border border-white/10 bg-[#080d19] py-2 px-3 text-xs text-white font-mono focus:border-blue-400 focus:outline-none"
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
                    className="w-full rounded-xl border border-white/10 bg-[#080d19] py-2 px-3 text-xs text-white font-mono focus:border-blue-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Field 3: Topics Found Hard */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Topics I Found Hard (Optional)
                </label>
                <input
                  type="text"
                  value={newMockHardTopics}
                  onChange={(e) => setNewMockHardTopics(e.target.value)}
                  placeholder="e.g. Pascal formula calculation, friction inequality"
                  className="w-full rounded-xl border border-white/10 bg-[#080d19] py-2 px-3 text-xs text-white placeholder-slate-500 focus:border-blue-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
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
                  Save &amp; Update Stats
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
};
