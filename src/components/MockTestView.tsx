import React, { useState, useEffect, useRef } from 'react';
import { useStudy } from '../context/StudyContext';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Trophy,
  Loader2,
  Clock,
  Flag,
  AlertCircle,
  FileText,
  Check,
  Search,
  Bell,
  ChevronDown,
  Calculator,
  FlaskConical,
  BookOpen,
  Globe,
  Languages,
  ListChecks,
  BarChart3,
  HelpCircle,
  MinusCircle,
  Play,
  Plus,
  Minus,
  Pencil,
  Info,
  X,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { MockQuestion, MockTestResult } from '../types';
import { safeFetchJson } from '../utils/api';
import { recordMockTest } from '../utils/achievementEngine';

type SubjectOption = 'Mathematics' | 'Science' | 'English' | 'Social Science' | 'Hindi';

const SUBJECT_TOPICS: Record<SubjectOption, string[]> = {
  Mathematics: [
    'Quadratic Equations',
    'Real Numbers',
    'Polynomials',
    'Pair of Linear Equations in Two Variables',
    'Arithmetic Progressions',
    'Triangles & Similarity',
    'Coordinate Geometry',
    'Introduction to Trigonometry',
    'Some Applications of Trigonometry',
    'Circles',
    'Areas Related to Circles',
    'Surface Areas and Volumes',
    'Statistics',
    'Probability',
  ],
  Science: [
    'Chemical Reactions and Equations',
    'Acids, Bases and Salts',
    'Metals and Non-metals',
    'Carbon and its Compounds',
    'Life Processes & Photosynthesis',
    'Control and Coordination',
    'How do Organisms Reproduce?',
    'Heredity and Evolution',
    'Light – Reflection and Refraction',
    'The Human Eye and the Colourful World',
    'Electricity & Ohm’s Law',
    'Magnetic Effects of Electric Current',
    'Motion, Force and Newton’s Laws',
    'Gravitation & Floatation',
    'Cell: The Fundamental Unit of Life',
  ],
  English: [
    'Tenses & Verb Forms',
    'Modals & Auxiliaries',
    'Subject-Verb Concord',
    'Reported Speech (Direct & Indirect)',
    'Active and Passive Voice',
    'Determiners & Articles',
    'Clauses & Prepositions',
    'Reading Comprehension & Inference',
    'Figures of Speech & Poetic Devices',
    'Formal Letter & Analytical Paragraph',
  ],
  'Social Science': [
    'The Rise of Nationalism in Europe',
    'Nationalism in India',
    'The French Revolution',
    'Resources and Development',
    'Water Resources & Agriculture',
    'Minerals and Energy Resources',
    'Manufacturing Industries',
    'Power Sharing & Federalism',
    'Political Parties & Outcomes of Democracy',
    'Development & Sectors of the Indian Economy',
    'Money and Credit',
    'Globalisation and the Indian Economy',
  ],
  Hindi: [
    'संधि और संधि-विच्छेद (Sandhi)',
    'समास और उसके भेद (Samas)',
    'अलंकार — शब्दालंकार और अर्थालंकार',
    'मुहावरे और लोकोक्तियाँ (Idioms)',
    'उपसर्ग और प्रत्यय (Prefixes & Suffixes)',
    'पदबंध और वाक्य रूपांतरण',
    'वाच्य — कर्तृवाच्य, कर्मवाच्य, भाववाच्य',
    'संज्ञा, सर्वनाम, विशेषण और क्रिया',
    'अपठित गद्यांश एवं पद्यांश बोध',
  ],
};

// Client-side topic-aware fallback generator so any topic works offline or if API is busy
function buildClientFallbackQuestions(
  rawTopic: string,
  subject: SubjectOption,
  classLevel: string,
  difficulty: string,
  count: number
): MockQuestion[] {
  const cleanTopic = rawTopic.trim() || 'Quadratic Equations';
  const lower = `${subject} ${cleanTopic}`.toLowerCase();

  type QTemplate = { q: string; opts: [string, string, string, string]; ans: number; exp: string };

  const quadraticBank: QTemplate[] = [
    {
      q: 'Which of the following is the standard form of a quadratic equation in variable x?',
      opts: ['ax² + bx + c = 0, where a ≠ 0', 'ax + b = 0, where a ≠ 0', 'ax³ + bx² + cx + d = 0', 'ax² + bx + c = 0, where a = 0'],
      ans: 0,
      exp: 'A quadratic equation in x is a polynomial equation of degree 2 of the form ax² + bx + c = 0 with a ≠ 0.',
    },
    {
      q: 'What is the discriminant (D) of the quadratic equation ax² + bx + c = 0?',
      opts: ['b² - 4ac', 'b² + 4ac', '4ac - b²', '2b - 4ac'],
      ans: 0,
      exp: 'The discriminant D = b² - 4ac determines whether the roots are real and distinct (D > 0), real and equal (D = 0), or imaginary (D < 0).',
    },
    {
      q: 'What are the roots of the quadratic equation x² - 5x + 6 = 0?',
      opts: ['x = 2 and x = 3', 'x = -2 and x = -3', 'x = 1 and x = 6', 'x = -1 and x = 6'],
      ans: 0,
      exp: 'Splitting the middle term: x² - 2x - 3x + 6 = (x - 2)(x - 3) = 0, giving x = 2 and x = 3.',
    },
    {
      q: 'If the quadratic equation 2x² + kx + 3 = 0 has two equal real roots, then the value of k is:',
      opts: ['±2√6', '±6', '±3√2', '4'],
      ans: 0,
      exp: 'For equal real roots, D = b² - 4ac = 0 ⇒ k² - 4(2)(3) = 0 ⇒ k² = 24 ⇒ k = ±2√6.',
    },
    {
      q: 'What is the nature of the roots of the quadratic equation 2x² - 4x + 3 = 0?',
      opts: ['No real roots', 'Two distinct real roots', 'Two equal real roots', 'Rational and unequal roots'],
      ans: 0,
      exp: 'Discriminant D = (-4)² - 4(2)(3) = 16 - 24 = -8 < 0, so the equation has no real roots.',
    },
    {
      q: 'If x = 2 is a root of the quadratic equation 2x² + kx - 6 = 0, then the value of k is:',
      opts: ['-1', '1', '2', '-2'],
      ans: 0,
      exp: 'Substituting x = 2: 2(2)² + k(2) - 6 = 0 ⇒ 8 + 2k - 6 = 0 ⇒ 2k = -2 ⇒ k = -1.',
    },
  ];

  const genericTopicBank: QTemplate[] = [
    {
      q: `In the context of "${cleanTopic}" (${subject}), which of the following best states its foundational principle?`,
      opts: [
        `It defines the core concepts, governing laws/rules, and analytical relationships of ${cleanTopic}.`,
        `It states that ${cleanTopic} has no relation to standard ${subject} principles.`,
        `It applies only when all measurable parameters of ${cleanTopic} are zero.`,
        `None of the above statements is valid for ${cleanTopic}.`,
      ],
      ans: 0,
      exp: `In ${subject} (${classLevel}), ${cleanTopic} is governed by well-defined conceptual rules and systematic principles.`,
    },
    {
      q: `Which approach is most accurate when solving a ${difficulty.toLowerCase()}-level problem on "${cleanTopic}"?`,
      opts: [
        `Identify the given parameters, apply the core formula/rule of ${cleanTopic}, and verify units or context.`,
        `Ignore the given conditions and estimate an arbitrary answer.`,
        `Skip intermediate steps and reverse the sign of all values.`,
        `Assume ${cleanTopic} does not follow standard ${subject} conventions.`,
      ],
      ans: 0,
      exp: `Following a structured step-by-step method using the core rule of ${cleanTopic} ensures 100% accuracy in exams.`,
    },
    {
      q: `Which of the following is a key high-yield takeaway from the chapter/topic "${cleanTopic}"?`,
      opts: [
        `Understanding both the theoretical definition and practical application problems of ${cleanTopic}.`,
        `Memorizing isolated numbers without understanding how ${cleanTopic} works.`,
        `Omitting diagrams, formulas, and examples while studying ${cleanTopic}.`,
        `Treating ${cleanTopic} as unrelated to the rest of ${subject}.`,
      ],
      ans: 0,
      exp: `Board and school exams test both conceptual clarity and application-based problem solving on ${cleanTopic}.`,
    },
  ];

  const pool = lower.includes('quadratic')
    ? [...quadraticBank, ...genericTopicBank]
    : genericTopicBank;

  return Array.from({ length: count }, (_, i) => {
    const item = pool[i % pool.length];
    const shift = i % 4;
    const rotatedOpts = [
      item.opts[(0 + 4 - shift) % 4],
      item.opts[(1 + 4 - shift) % 4],
      item.opts[(2 + 4 - shift) % 4],
      item.opts[(3 + 4 - shift) % 4],
    ];
    const newAns = (item.ans + shift) % 4;
    return {
      id: i + 1,
      question:
        i < pool.length
          ? item.q
          : `[${cleanTopic} · Q${i + 1}] ${item.q}`,
      options: rotatedOpts,
      answer: newAns,
      explanation: item.exp,
    };
  });
}

export const MockTestView: React.FC = () => {
  const {
    profile,
    currentUser,
    addQuestionAttempt,
    addStars,
    addStudyMinutes,
    setActiveTab,
    addMistake,
    setCustomizeOpen,
  } = useStudy();

  // Core Mock Test Configuration State (Defaulting to match screenshot)
  const [subject, setSubject] = useState<SubjectOption>('Mathematics');
  const [topic, setTopic] = useState<string>('Quadratic Equations');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [questionCount, setQuestionCount] = useState<number>(30);
  const [negativeMarking, setNegativeMarking] = useState<boolean>(true);

  // Marking Scheme state (+4 for correct | -1 for wrong by default, editable via "Edit")
  const [correctMarks, setCorrectMarks] = useState<number>(4);
  const [wrongPenalty, setWrongPenalty] = useState<number>(1);
  const [editingScheme, setEditingScheme] = useState<boolean>(false);

  // Top search bar & topic dropdown/modal states
  const [topSearchQuery, setTopSearchQuery] = useState<string>('');
  const [topicDropdownOpen, setTopicDropdownOpen] = useState<boolean>(false);
  const [allChaptersModalOpen, setAllChaptersModalOpen] = useState<boolean>(false);
  const [customTopicModalInput, setCustomTopicModalInput] = useState<string>('');
  const topicDropdownRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Active test state
  const [testActive, setTestActive] = useState<boolean>(false);
  const [questions, setQuestions] = useState<MockQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>([]);
  const [markedForReview, setMarkedForReview] = useState<boolean[]>([]);
  const [testSubmitted, setTestSubmitted] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<MockTestResult | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);

  // Test timer (in seconds)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(1800);

  // Close topic dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        topicDropdownRef.current &&
        !topicDropdownRef.current.contains(event.target as Node)
      ) {
        setTopicDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!testActive || testSubmitted) return;

    if (secondsRemaining <= 0) {
      handleSubmitTest();
      return;
    }

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [testActive, testSubmitted, secondsRemaining]);

  const normalizeQuestionsClient = (rawList: any[]): MockQuestion[] => {
    return rawList.map((q, idx) => {
      let answerIdx = 0;
      const rawAns = q.answer;
      if (typeof rawAns === 'number') {
        if (rawAns >= 0 && rawAns < (q.options?.length || 4)) answerIdx = rawAns;
        else if (rawAns >= 1 && rawAns <= (q.options?.length || 4)) answerIdx = rawAns - 1;
      } else if (typeof rawAns === 'string') {
        const clean = rawAns.trim().toUpperCase();
        if (clean === 'A' || clean === 'OPTION A' || clean === '1') answerIdx = 0;
        else if (clean === 'B' || clean === 'OPTION B' || clean === '2') answerIdx = 1;
        else if (clean === 'C' || clean === 'OPTION C' || clean === '3') answerIdx = 2;
        else if (clean === 'D' || clean === 'OPTION D' || clean === '4') answerIdx = 3;
      }
      return {
        id: q.id || idx + 1,
        question: q.question,
        options:
          Array.isArray(q.options) && q.options.length >= 2
            ? q.options
            : ['Option A', 'Option B', 'Option C', 'Option D'],
        answer: answerIdx,
        explanation: q.explanation || 'Step-by-step syllabus explanation.',
      };
    });
  };

  const handleSelectSubject = (newSubject: SubjectOption) => {
    setSubject(newSubject);
    // Only auto-switch topic if the current topic belongs to another subject's default list
    const isPresetFromOtherSubject = (Object.keys(SUBJECT_TOPICS) as SubjectOption[]).some(
      (s) => s !== newSubject && SUBJECT_TOPICS[s].includes(topic)
    );
    if (isPresetFromOtherSubject || !topic.trim()) {
      setTopic(SUBJECT_TOPICS[newSubject][0]);
    }
  };

  const handleAdjustQuestions = (delta: number) => {
    setQuestionCount((prev) => Math.min(60, Math.max(1, prev + delta)));
  };

  const handleStartTest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const effectiveTopic = topic.trim() || SUBJECT_TOPICS[subject][0] || 'General Syllabus';
    if (!topic.trim()) {
      setTopic(effectiveTopic);
    }

    setLoading(true);
    setError(null);

    try {
      const clampedQCount = Math.min(60, Math.max(1, questionCount));
      const fallbackQuestions = buildClientFallbackQuestions(
        effectiveTopic,
        subject,
        profile.classLevel || 'Class 10',
        difficulty,
        clampedQCount
      );

      const data = await safeFetchJson<{ questions: MockQuestion[] }>(
        '/api/generate-mock-test',
        {
          method: 'POST',
          body: JSON.stringify({
            topic: effectiveTopic,
            subject,
            difficulty,
            count: clampedQCount,
            negativeMarking,
            studentProfile: profile,
          }),
        },
        { questions: fallbackQuestions }
      );

      const rawQuestions =
        data.questions && data.questions.length > 0 ? data.questions : fallbackQuestions;
      const loadedQuestions = normalizeQuestionsClient(rawQuestions).slice(0, clampedQCount);
      setQuestions(loadedQuestions);
      setUserAnswers(new Array(loadedQuestions.length).fill(null));
      setMarkedForReview(new Array(loadedQuestions.length).fill(false));
      setCurrentQuestionIndex(0);
      setSecondsRemaining(loadedQuestions.length * 60); // 1 minute per question
      setTestActive(true);
      setTestSubmitted(false);
      setTestResult(null);
      setShowSubmitModal(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Could not generate test. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAnswer = (optionIdx: number) => {
    setUserAnswers((prev) => {
      const copy = [...prev];
      copy[currentQuestionIndex] = optionIdx;
      return copy;
    });
  };

  const handleClearAnswer = () => {
    setUserAnswers((prev) => {
      const copy = [...prev];
      copy[currentQuestionIndex] = null;
      return copy;
    });
  };

  const handleToggleReview = () => {
    setMarkedForReview((prev) => {
      const copy = [...prev];
      copy[currentQuestionIndex] = !copy[currentQuestionIndex];
      return copy;
    });
  };

  const handleSubmitTest = () => {
    setShowSubmitModal(false);
    let correct = 0;
    let wrong = 0;
    let skipped = 0;

    questions.forEach((q, idx) => {
      const userAns = userAnswers[idx];
      if (userAns === null || userAns === undefined) {
        skipped++;
      } else if (Number(userAns) === Number(q.answer)) {
        correct++;
        addQuestionAttempt(true);
      } else {
        wrong++;
        addQuestionAttempt(false);
        if (addMistake) {
          const wrongIdx = Number(userAns);
          const correctIdx = Number(q.answer);
          addMistake({
            testTopic: topic,
            subject,
            classLevel: profile.classLevel,
            question: q.question,
            options: q.options,
            userAnswer: wrongIdx,
            correctAnswer: correctIdx,
            userAnswerText: q.options[wrongIdx] || `Option ${'ABCD'[wrongIdx]}`,
            correctAnswerText: q.options[correctIdx] || `Option ${'ABCD'[correctIdx]}`,
            explanation: q.explanation || 'Step-by-step syllabus explanation provided.',
            date: new Date().toLocaleDateString(),
          });
        }
      }
    });

    const marksPerCorrect = correctMarks;
    const penaltyPerWrong = negativeMarking ? wrongPenalty : 0;
    const finalScore = Math.max(0, correct * marksPerCorrect - wrong * penaltyPerWrong);
    const maxScore = questions.length * marksPerCorrect;
    const accuracy = Math.round((correct / (correct + wrong || 1)) * 100);

    const result: MockTestResult = {
      topic,
      difficulty,
      negativeMarking,
      totalQuestions: questions.length,
      answeredCount: correct + wrong,
      correctCount: correct,
      wrongCount: wrong,
      skippedCount: skipped,
      score: Number(finalScore.toFixed(2)),
      maxScore,
      accuracy,
      date: new Date().toLocaleDateString(),
    };

    setTestResult(result);
    setTestSubmitted(true);
    addStudyMinutes(Math.max(Math.ceil((questions.length * 60 - secondsRemaining) / 60), 2));
    addStars(Math.max(5, Math.round(correct * 5)));

    recordMockTest({
      name: `Mock Test: ${topic}`,
      subject,
      score: Number(finalScore.toFixed(2)),
      maxScore,
      focusArea:
        accuracy === 100
          ? 'Flawless 100% Score!'
          : accuracy >= 90
          ? 'Excellent score (90%+)'
          : `Revise: ${topic}`,
    });

    if (accuracy >= 70) {
      try {
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
      } catch {}
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleTopSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topSearchQuery.trim()) {
      setTopic(topSearchQuery.trim());
      setTopSearchQuery('');
    }
  };

  const displayUserName = currentUser?.displayName || profile.name || 'Aarav Sharma';
  const displayAvatarChar = displayUserName.trim().charAt(0).toUpperCase() || 'A';
  const currQ = questions[currentQuestionIndex];
  const currentSubjectTopics = SUBJECT_TOPICS[subject] || SUBJECT_TOPICS.Mathematics;

  return (
    <div className="h-[calc(100vh-2.5rem)] overflow-y-auto bg-[#030916] text-white select-none font-['Sora',sans-serif]">
      {/* Background subtle radial glow matching the Study Bot AI Mock Test Dashboard */}
      <div
        className="min-h-full px-4 py-4 md:px-7 md:py-5"
        style={{
          background:
            'radial-gradient(circle at 20% 10%, rgba(29, 78, 216, 0.14) 0%, transparent 45%), radial-gradient(circle at 85% 20%, rgba(14, 165, 233, 0.1) 0%, transparent 50%), #030916',
        }}
      >
        <div className="mx-auto max-w-[1380px] space-y-5">
          {/* ==================== TOP SEARCH & PROFILE BAR ==================== */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <form onSubmit={handleTopSearchSubmit} className="relative flex-1 max-w-2xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={topSearchQuery}
                onChange={(e) => setTopSearchQuery(e.target.value)}
                placeholder="Search anything... (chapters, topics, questions)"
                className="w-full rounded-full border border-[#1a3360] bg-[#08152c]/90 pl-11 pr-24 py-2.5 text-xs md:text-sm text-white placeholder:text-slate-400 focus:border-[#38bdf8] focus:outline-none shadow-inner"
              />
              {topSearchQuery.trim() && (
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-[#2563eb] px-3 py-1 text-[11px] font-semibold text-white hover:bg-[#1d4ed8] transition-colors cursor-pointer"
                >
                  Set Topic
                </button>
              )}
            </form>

            <div className="flex items-center gap-4">
              {testActive && !testSubmitted && (
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex items-center gap-2 rounded-xl px-3.5 py-2 border font-mono text-xs md:text-sm font-bold shadow-lg ${
                      secondsRemaining < 60
                        ? 'border-rose-500/60 bg-rose-500/15 text-rose-300 animate-pulse'
                        : 'border-[#2563eb]/50 bg-[#081631] text-sky-300'
                    }`}
                  >
                    <Clock className="h-4 w-4 text-[#38bdf8]" />
                    <span>{formatTimer(secondsRemaining)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(true)}
                    className="rounded-xl bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] px-4 py-2 text-xs font-bold text-white hover:brightness-110 shadow-md transition-all cursor-pointer"
                  >
                    Submit Exam
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setActiveTab('/reminders')}
                className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#17305c] bg-[#07142b] text-slate-300 hover:border-[#38bdf8]/50 hover:text-white transition-colors cursor-pointer"
                title="Study Reminders & Notifications"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-[#07142b]" />
              </button>

              <button
                type="button"
                onClick={() => setCustomizeOpen(true)}
                className="flex items-center gap-3 rounded-full border border-[#17305c] bg-[#07142b]/90 pl-1.5 pr-3.5 py-1 hover:border-[#38bdf8]/50 transition-all cursor-pointer"
                title="Customize Student Profile"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#4f46e5] to-[#2563eb] text-xs font-bold text-white shadow-md">
                  {displayAvatarChar}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-white leading-tight">{displayUserName}</div>
                  <div className="text-[10px] text-slate-400 leading-tight">
                    {profile.classLevel || 'Class 10'}
                  </div>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
              </button>
            </div>
          </div>

          {/* ==================== 1. MOCK TEST DASHBOARD SETUP VIEW ==================== */}
          {!testActive ? (
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6 items-start">
              {/* LEFT COLUMN: CREATE MOCK TEST STEPS 1–5 */}
              <div className="space-y-4">
                {/* HERO BANNER: Create Mock Test */}
                <div className="relative overflow-hidden rounded-2xl border border-[#1b3970] bg-gradient-to-r from-[#07152e] via-[#0a1e42] to-[#081938] px-6 py-5 shadow-[0_12px_35px_rgba(0,0,0,0.45)]">
                  <div
                    className="pointer-events-none absolute inset-0 opacity-60"
                    style={{
                      background:
                        'radial-gradient(circle at 80% 50%, rgba(56, 189, 248, 0.16) 0%, transparent 60%)',
                    }}
                  />
                  <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {/* Glowing Clipboard Icon */}
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[#60a5fa]/40 bg-gradient-to-b from-[#2563eb] to-[#1d4ed8] shadow-[0_0_28px_rgba(37,99,235,0.6)]">
                        <svg
                          viewBox="0 0 48 48"
                          className="h-10 w-10 text-white"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <rect
                            x="10"
                            y="8"
                            width="28"
                            height="34"
                            rx="5"
                            fill="white"
                            fillOpacity="0.15"
                            stroke="white"
                            strokeWidth="2.75"
                          />
                          <rect x="17" y="4" width="14" height="7" rx="3" fill="white" />
                          <path
                            d="M16 20L19 23L24 17"
                            stroke="white"
                            strokeWidth="2.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M27 20H33"
                            stroke="white"
                            strokeWidth="2.75"
                            strokeLinecap="round"
                          />
                          <path
                            d="M16 30L19 33L24 27"
                            stroke="white"
                            strokeWidth="2.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M27 30H33"
                            stroke="white"
                            strokeWidth="2.75"
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>

                      <div>
                        <h1 className="text-xl md:text-[26px] font-bold tracking-tight text-white">
                          Create Mock Test
                        </h1>
                        <p className="mt-1 text-xs md:text-sm text-slate-300/90">
                          Customize your test and start practicing. Improve your accuracy and speed!
                        </p>
                      </div>
                    </div>

                    {/* Right Mascot & "Better Practice Better Results!" Callout */}
                    <div className="hidden md:flex items-center gap-3 pr-2">
                      <div className="text-right -rotate-6 select-none">
                        <div className="text-xs font-semibold italic text-sky-200 leading-tight">
                          Better Practice
                        </div>
                        <div className="text-xs font-bold italic text-white leading-tight">
                          Better Results!
                        </div>
                        <svg
                          className="ml-auto mt-1 h-4 w-12 text-[#38bdf8]"
                          viewBox="0 0 50 18"
                          fill="none"
                        >
                          <path
                            d="M2 12C16 16 32 14 45 5M45 5L38 4M45 5L42 12"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>

                      {/* Cute 3D StudyBot AI Mascot SVG */}
                      <div className="relative h-20 w-20 shrink-0 drop-shadow-[0_6px_16px_rgba(14,165,233,0.45)]">
                        <svg viewBox="0 0 100 100" className="h-full w-full">
                          <defs>
                            <linearGradient id="botBodyGrad" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor="#eff6ff" />
                              <stop offset="55%" stopColor="#bfdbfe" />
                              <stop offset="100%" stopColor="#60a5fa" />
                            </linearGradient>
                            <linearGradient id="botVisorGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#0f172a" />
                              <stop offset="100%" stopColor="#1e3a8a" />
                            </linearGradient>
                          </defs>
                          {/* Antenna */}
                          <line
                            x1="50"
                            y1="10"
                            x2="50"
                            y2="22"
                            stroke="#60a5fa"
                            strokeWidth="4"
                            strokeLinecap="round"
                          />
                          <circle cx="50" cy="9" r="5" fill="#38bdf8" />
                          {/* Ears */}
                          <rect x="14" y="38" width="8" height="16" rx="4" fill="#2563eb" />
                          <rect x="78" y="38" width="8" height="16" rx="4" fill="#2563eb" />
                          {/* Head */}
                          <rect
                            x="20"
                            y="22"
                            width="60"
                            height="46"
                            rx="22"
                            fill="url(#botBodyGrad)"
                            stroke="#3b82f6"
                            strokeWidth="2"
                          />
                          {/* Visor */}
                          <rect
                            x="27"
                            y="30"
                            width="46"
                            height="28"
                            rx="13"
                            fill="url(#botVisorGrad)"
                          />
                          {/* Happy Eyes */}
                          <path
                            d="M36 43C37.5 39.5 41.5 39.5 43 43"
                            stroke="#38bdf8"
                            strokeWidth="3"
                            strokeLinecap="round"
                            fill="none"
                          />
                          <path
                            d="M57 43C58.5 39.5 62.5 39.5 64 43"
                            stroke="#38bdf8"
                            strokeWidth="3"
                            strokeLinecap="round"
                            fill="none"
                          />
                          {/* Smile */}
                          <path
                            d="M44 50Q50 55 56 50"
                            stroke="#38bdf8"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            fill="none"
                          />
                          {/* Body */}
                          <rect
                            x="31"
                            y="70"
                            width="38"
                            height="24"
                            rx="11"
                            fill="url(#botBodyGrad)"
                            stroke="#3b82f6"
                            strokeWidth="2"
                          />
                          <rect x="40" y="76" width="20" height="10" rx="4" fill="#2563eb" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* STEP 1: SELECT SUBJECT */}
                <div className="rounded-2xl border border-[#162d59] bg-[#061126]/95 p-5 shadow-lg">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2563eb] text-xs font-bold text-white shadow-[0_0_12px_rgba(37,99,235,0.6)]">
                      1
                    </div>
                    <div>
                      <h2 className="text-sm md:text-base font-bold text-white leading-tight">
                        Select Subject
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Choose the subject for your mock test
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {(
                      [
                        {
                          name: 'Mathematics' as SubjectOption,
                          icon: Calculator,
                          iconBg: 'bg-[#2563eb]',
                        },
                        {
                          name: 'Science' as SubjectOption,
                          icon: FlaskConical,
                          iconBg: 'bg-[#173668]',
                        },
                        {
                          name: 'English' as SubjectOption,
                          icon: BookOpen,
                          iconBg: 'bg-[#5b21b6]',
                        },
                        {
                          name: 'Social Science' as SubjectOption,
                          icon: Globe,
                          iconBg: 'bg-[#1e3a8a]',
                        },
                        {
                          name: 'Hindi' as SubjectOption,
                          icon: Languages,
                          iconBg: 'bg-[#3730a3]',
                        },
                      ] as const
                    ).map((item) => {
                      const IconComponent = item.icon;
                      const isSelected = subject === item.name;
                      return (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => handleSelectSubject(item.name)}
                          className={`relative flex items-center gap-3 rounded-xl border px-3.5 py-3.5 text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#38bdf8] bg-gradient-to-r from-[#0d2857] to-[#163d7a] text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]'
                              : 'border-[#18315e] bg-[#081630]/85 text-slate-200 hover:border-[#2563eb]/60 hover:bg-[#0b1d3d]'
                          }`}
                        >
                          {isSelected && (
                            <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#38bdf8] text-[#030916] shadow-md">
                              <Check className="h-3 w-3 stroke-[3]" />
                            </span>
                          )}
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                              isSelected ? 'bg-[#2563eb]' : item.iconBg
                            } text-white shadow-inner`}
                          >
                            <IconComponent className="h-4 w-4" />
                          </div>
                          <span className="text-xs md:text-[13px] font-semibold truncate">
                            {item.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* STEP 2: SELECT TOPIC (DROPDOWN + TYPE ANY TOPIC + VIEW ALL CHAPTERS) */}
                <div className="rounded-2xl border border-[#162d59] bg-[#061126]/95 p-5 shadow-lg">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2563eb] text-xs font-bold text-white shadow-[0_0_12px_rgba(37,99,235,0.6)]">
                        2
                      </div>
                      <div>
                        <h2 className="text-sm md:text-base font-bold text-white leading-tight">
                          Select Topic
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Choose a specific chapter or type any custom topic you want to practice
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
                    {/* Interactive Combobox: Student can type ANY topic OR open chapter dropdown */}
                    <div ref={topicDropdownRef} className="relative flex-1">
                      <div className="flex items-center rounded-xl border border-[#1b3668] bg-[#040d1e] focus-within:border-[#38bdf8] transition-colors">
                        <input
                          type="text"
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          onFocus={() => setTopicDropdownOpen(true)}
                          placeholder="Type any topic (e.g., Quadratic Equations, Photosynthesis, Tenses...)"
                          className="w-full bg-transparent px-4 py-3 text-xs md:text-sm font-medium text-white placeholder:text-slate-500 focus:outline-none"
                        />
                        {topic && (
                          <button
                            type="button"
                            onClick={() => setTopic('')}
                            className="px-1.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                            title="Clear topic to type a custom topic"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setTopicDropdownOpen((prev) => !prev)}
                          className="px-3.5 py-3 text-slate-300 hover:text-white cursor-pointer"
                          title="Choose from syllabus chapters"
                        >
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${
                              topicDropdownOpen ? 'rotate-180 text-[#38bdf8]' : ''
                            }`}
                          />
                        </button>
                      </div>

                      {/* Dropdown Menu */}
                      {topicDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-64 overflow-y-auto rounded-xl border border-[#1e3d75] bg-[#07142b] p-1.5 shadow-2xl">
                          <div className="px-3 py-1.5 text-[11px] font-semibold text-sky-400 flex items-center justify-between border-b border-white/5 mb-1">
                            <span>{subject} Chapters — or type any custom topic above</span>
                            <Sparkles className="h-3 w-3" />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setTopic(`Full ${subject} Syllabus`);
                              setTopicDropdownOpen(false);
                            }}
                            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold text-sky-300 hover:bg-[#112852] transition-colors cursor-pointer"
                          >
                            <span>✨ Full {subject} Syllabus (Mixed Mock Test)</span>
                            {topic === `Full ${subject} Syllabus` && (
                              <Check className="h-3.5 w-3.5 text-[#38bdf8]" />
                            )}
                          </button>
                          {currentSubjectTopics.map((chap) => (
                            <button
                              key={chap}
                              type="button"
                              onClick={() => {
                                setTopic(chap);
                                setTopicDropdownOpen(false);
                              }}
                              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                                topic === chap
                                  ? 'bg-[#153268] text-white font-semibold'
                                  : 'text-slate-200 hover:bg-white/[0.06]'
                              }`}
                            >
                              <span>{chap}</span>
                              {topic === chap && <Check className="h-3.5 w-3.5 text-[#38bdf8]" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setCustomTopicModalInput(topic);
                        setAllChaptersModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs md:text-sm font-semibold text-[#38bdf8] hover:text-sky-300 whitespace-nowrap transition-colors cursor-pointer self-start sm:self-center"
                    >
                      <span>View All Chapters</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* STEP 3: SELECT DIFFICULTY LEVEL */}
                <div className="rounded-2xl border border-[#162d59] bg-[#061126]/95 p-5 shadow-lg">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2563eb] text-xs font-bold text-white shadow-[0_0_12px_rgba(37,99,235,0.6)]">
                      3
                    </div>
                    <div>
                      <h2 className="text-sm md:text-base font-bold text-white leading-tight">
                        Select Difficulty Level
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Choose the difficulty level of your test
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {/* Easy */}
                    <button
                      type="button"
                      onClick={() => setDifficulty('Easy')}
                      className={`relative flex items-center gap-3.5 rounded-xl border p-4 text-left transition-all cursor-pointer ${
                        difficulty === 'Easy'
                          ? 'border-emerald-400 bg-gradient-to-r from-[#062c2b] to-[#0a3f3c] shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                          : 'border-[#123d3d] bg-[#072227]/80 hover:border-emerald-500/50'
                      }`}
                    >
                      {difficulty === 'Easy' && (
                        <span className="absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400 text-[#030916]">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </span>
                      )}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#10b981] text-white shadow-md">
                        <FlaskConical className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">Easy</div>
                        <div className="text-xs text-slate-300/80">Build basics</div>
                      </div>
                    </button>

                    {/* Medium */}
                    <button
                      type="button"
                      onClick={() => setDifficulty('Medium')}
                      className={`relative flex items-center gap-3.5 rounded-xl border p-4 text-left transition-all cursor-pointer ${
                        difficulty === 'Medium'
                          ? 'border-[#38bdf8] bg-gradient-to-r from-[#0d2857] to-[#153e82] shadow-[0_0_22px_rgba(37,99,235,0.45)]'
                          : 'border-[#183363] bg-[#091936]/80 hover:border-[#38bdf8]/50'
                      }`}
                    >
                      {difficulty === 'Medium' && (
                        <span className="absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#38bdf8] text-[#030916]">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </span>
                      )}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2563eb] text-white shadow-md">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">Medium</div>
                        <div className="text-xs text-slate-200/90">Test your skills</div>
                      </div>
                    </button>

                    {/* Hard */}
                    <button
                      type="button"
                      onClick={() => setDifficulty('Hard')}
                      className={`relative flex items-center gap-3.5 rounded-xl border p-4 text-left transition-all cursor-pointer ${
                        difficulty === 'Hard'
                          ? 'border-purple-400 bg-gradient-to-r from-[#24124d] to-[#351a70] shadow-[0_0_20px_rgba(147,51,234,0.35)]'
                          : 'border-[#351d66] bg-[#160e33]/85 hover:border-purple-400/50'
                      }`}
                    >
                      {difficulty === 'Hard' && (
                        <span className="absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-purple-400 text-[#030916]">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </span>
                      )}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#7c3aed] text-white shadow-md">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">Hard</div>
                        <div className="text-xs text-slate-300/80">Challenge yourself</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* STEP 4 & STEP 5 SIDE-BY-SIDE */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* STEP 4: NUMBER OF QUESTIONS */}
                  <div className="rounded-2xl border border-[#162d59] bg-[#061126]/95 p-5 shadow-lg flex flex-col justify-between">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2563eb] text-xs font-bold text-white shadow-[0_0_12px_rgba(37,99,235,0.6)]">
                        4
                      </div>
                      <div>
                        <h2 className="text-sm md:text-base font-bold text-white leading-tight">
                          Number of Questions
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Set the number of questions (Max 60)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-[#1b3668] bg-[#040d1e] overflow-hidden">
                      <button
                        type="button"
                        onClick={() => handleAdjustQuestions(-5)}
                        disabled={questionCount <= 1}
                        className="flex h-12 w-14 items-center justify-center border-r border-[#1b3668] text-slate-300 hover:bg-white/5 hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
                        title="Decrease questions"
                      >
                        <Minus className="h-4 w-4" />
                      </button>

                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={questionCount}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) {
                            setQuestionCount(Math.min(60, Math.max(1, val)));
                          }
                        }}
                        className="w-full bg-transparent text-center text-base md:text-lg font-bold text-white focus:outline-none"
                      />

                      <button
                        type="button"
                        onClick={() => handleAdjustQuestions(5)}
                        disabled={questionCount >= 60}
                        className="flex h-12 w-14 items-center justify-center border-l border-[#1b3668] text-slate-300 hover:bg-white/5 hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
                        title="Increase questions"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* STEP 5: NEGATIVE MARKING */}
                  <div className="rounded-2xl border border-[#162d59] bg-[#061126]/95 p-5 shadow-lg flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2563eb] text-xs font-bold text-white shadow-[0_0_12px_rgba(37,99,235,0.6)]">
                          5
                        </div>
                        <div>
                          <h2 className="text-sm md:text-base font-bold text-white leading-tight">
                            Negative Marking
                          </h2>
                          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                            <span>Enable negative marking for wrong answers</span>
                            <Info className="h-3.5 w-3.5 text-slate-400 inline shrink-0" />
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setNegativeMarking((prev) => !prev)}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                          negativeMarking ? 'bg-[#2563eb]' : 'bg-slate-700'
                        }`}
                        aria-label="Toggle Negative Marking"
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            negativeMarking ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#142952]">
                      {editingScheme ? (
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <label className="text-slate-300">
                              +Correct:
                              <input
                                type="number"
                                min={1}
                                max={10}
                                value={correctMarks}
                                onChange={(e) =>
                                  setCorrectMarks(Math.max(1, Number(e.target.value) || 4))
                                }
                                className="ml-1 w-12 rounded border border-[#2563eb] bg-[#040d1e] px-1.5 py-0.5 text-center text-white"
                              />
                            </label>
                            <label className="text-slate-300">
                              -Wrong:
                              <input
                                type="number"
                                min={0}
                                max={5}
                                step="0.25"
                                value={wrongPenalty}
                                onChange={(e) =>
                                  setWrongPenalty(Math.max(0, Number(e.target.value) || 1))
                                }
                                className="ml-1 w-14 rounded border border-[#2563eb] bg-[#040d1e] px-1.5 py-0.5 text-center text-white"
                              />
                            </label>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditingScheme(false)}
                            className="rounded-lg bg-[#2563eb] px-2.5 py-1 text-[11px] font-bold text-white cursor-pointer"
                          >
                            Done
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-end justify-between">
                          <div>
                            <div className="text-xs font-semibold text-slate-300 underline decoration-slate-600 underline-offset-4">
                              Marking Scheme
                            </div>
                            <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-300">
                              <span>
                                <strong className="text-white">+{correctMarks}</strong> for correct
                              </span>
                              <span className="text-slate-600">|</span>
                              <span>
                                <strong className="text-white">
                                  {negativeMarking ? `-${wrongPenalty}` : '0'}
                                </strong>{' '}
                                for wrong
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setEditingScheme(true)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#38bdf8] hover:text-sky-300 transition-colors cursor-pointer"
                          >
                            <span>Edit</span>
                            <Pencil className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                    {error}
                  </div>
                )}

                {/* PRIMARY START MOCK TEST BUTTON */}
                <button
                  type="button"
                  onClick={() => handleStartTest()}
                  disabled={loading}
                  className="w-full rounded-2xl bg-gradient-to-r from-[#1d63f2] via-[#2563eb] to-[#1d63f2] py-4 text-sm md:text-base font-bold text-white shadow-[0_8px_28px_rgba(37,99,235,0.5)] hover:brightness-110 transition-all disabled:opacity-60 flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Generating {questionCount} Questions on "{topic}"...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-current" />
                      <span>Start Mock Test</span>
                    </>
                  )}
                </button>
              </div>

              {/* RIGHT COLUMN: TEST OVERVIEW, WHY TAKE MOCK TESTS, QUOTE CARD */}
              <div className="space-y-4">
                {/* 1. TEST OVERVIEW CARD */}
                <div className="rounded-2xl border border-[#162d59] bg-[#061126]/95 p-5 shadow-lg space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-[#142952] pb-3.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0e2a5c] text-[#38bdf8]">
                      <FlaskConical className="h-4 w-4" />
                    </div>
                    <h3 className="text-base font-bold text-white">Test Overview</h3>
                  </div>

                  <div className="space-y-3.5">
                    {/* Subject */}
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-500/30 bg-[#191c47] text-indigo-300">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs text-slate-400">Subject</div>
                        <div className="text-sm font-bold text-white truncate">{subject}</div>
                      </div>
                    </div>

                    {/* Topic */}
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-500/30 bg-[#0d2752] text-[#38bdf8]">
                        <ListChecks className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs text-slate-400">Topic</div>
                        <div className="text-sm font-bold text-white truncate">
                          {topic.trim() || 'All Topics'}
                        </div>
                      </div>
                    </div>

                    {/* Difficulty */}
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-[#332417] text-amber-400">
                        <BarChart3 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs text-slate-400">Difficulty</div>
                        <div className="text-sm font-bold text-white">{difficulty}</div>
                      </div>
                    </div>

                    {/* Total Questions */}
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal-500/30 bg-[#0c3138] text-teal-300">
                        <HelpCircle className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs text-slate-400">Total Questions</div>
                        <div className="text-sm font-bold text-white">
                          {questionCount}{' '}
                          <span className="font-normal text-slate-400">(Max 60)</span>
                        </div>
                      </div>
                    </div>

                    {/* Negative Marking */}
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-pink-500/30 bg-[#381534] text-pink-400">
                        <MinusCircle className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs text-slate-400">Negative Marking</div>
                        <div className="text-sm font-bold text-white">
                          {negativeMarking ? `Enabled (-${wrongPenalty})` : 'Disabled (0)'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. WHY TAKE MOCK TESTS CARD */}
                <div className="rounded-2xl border border-[#162d59] bg-[#061126]/95 p-5 shadow-lg space-y-3.5">
                  <div className="flex items-center gap-2.5 border-b border-[#142952] pb-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0c3138] text-teal-300">
                      <FlaskConical className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm md:text-base font-bold text-white">
                      Why Take Mock Tests?
                    </h3>
                  </div>

                  <ul className="space-y-3">
                    {[
                      'Understand your strengths & weaknesses',
                      'Improve speed and accuracy',
                      'Build exam confidence',
                      'Get personalized performance analysis',
                    ].map((benefit) => (
                      <li key={benefit} className="flex items-center gap-3 text-xs text-slate-200">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-teal-400/40 bg-teal-500/15 text-teal-300">
                          <Check className="h-3 w-3 stroke-[2.5]" />
                        </span>
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 3. MOTIVATIONAL QUOTE & MASCOT CARD */}
                <div className="relative overflow-hidden rounded-2xl border border-[#162d59] bg-gradient-to-br from-[#061229] via-[#081938] to-[#0a234f] p-5 shadow-lg min-h-[168px] flex flex-col justify-between">
                  <div>
                    <div className="text-3xl font-serif font-black text-[#38bdf8] leading-none">
                      “
                    </div>
                    <p className="mt-1 max-w-[200px] text-sm md:text-[15px] font-semibold text-white leading-snug">
                      “Small steps in practice lead to big results.”
                    </p>
                  </div>

                  {/* Sprout & Robot Illustration in Bottom Right */}
                  <div className="pointer-events-none absolute bottom-1 right-2 flex items-end gap-1">
                    {/* Green Sprout */}
                    <svg viewBox="0 0 36 42" className="h-9 w-8">
                      <path
                        d="M18 40V20"
                        stroke="#10b981"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      <path
                        d="M18 28C10 28 6 21 8 15C15 15 18 21 18 28Z"
                        fill="#10b981"
                      />
                      <path
                        d="M18 22C26 22 30 15 28 9C21 9 18 15 18 22Z"
                        fill="#34d399"
                      />
                    </svg>

                    {/* Cute 3D StudyBot Mascot */}
                    <svg viewBox="0 0 100 100" className="h-24 w-24 drop-shadow-[0_6px_15px_rgba(37,99,235,0.45)]">
                      <line
                        x1="50"
                        y1="10"
                        x2="50"
                        y2="22"
                        stroke="#60a5fa"
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                      <circle cx="50" cy="9" r="5" fill="#38bdf8" />
                      <rect x="14" y="38" width="8" height="16" rx="4" fill="#2563eb" />
                      <rect x="78" y="38" width="8" height="16" rx="4" fill="#2563eb" />
                      <rect
                        x="20"
                        y="22"
                        width="60"
                        height="46"
                        rx="22"
                        fill="#e0f2fe"
                        stroke="#3b82f6"
                        strokeWidth="2"
                      />
                      <rect x="27" y="30" width="46" height="28" rx="13" fill="#0f172a" />
                      <path
                        d="M36 43C37.5 39.5 41.5 39.5 43 43"
                        stroke="#38bdf8"
                        strokeWidth="3"
                        strokeLinecap="round"
                        fill="none"
                      />
                      <path
                        d="M57 43C58.5 39.5 62.5 39.5 64 43"
                        stroke="#38bdf8"
                        strokeWidth="3"
                        strokeLinecap="round"
                        fill="none"
                      />
                      <path
                        d="M44 50Q50 55 56 50"
                        stroke="#38bdf8"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        fill="none"
                      />
                      <rect
                        x="31"
                        y="70"
                        width="38"
                        height="24"
                        rx="11"
                        fill="#dbeafe"
                        stroke="#3b82f6"
                        strokeWidth="2"
                      />
                      <rect x="40" y="76" width="20" height="10" rx="4" fill="#2563eb" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          ) : testSubmitted && testResult ? (
            /* ==================== 2. SCORECARD & DETAILED SOLUTIONS VIEW ==================== */
            <div className="space-y-6 animate-in fade-in">
              <div className="rounded-3xl border border-[#1e3d75] bg-[#07142b] p-6 md:p-8 shadow-2xl text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-400 border border-amber-400/30 mb-3">
                  <Trophy className="h-8 w-8" />
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-white">
                  Mock Test Scorecard
                </h2>
                <p className="text-xs md:text-sm text-slate-400 mt-1">
                  {displayUserName} · {subject} ({testResult.topic}) · {testResult.difficulty}
                </p>

                <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  <div className="rounded-2xl border border-[#1b3668] bg-[#040d1e] p-4">
                    <div className="text-2xl md:text-3xl font-black text-[#38bdf8]">
                      {testResult.score} / {testResult.maxScore}
                    </div>
                    <div className="text-xs text-slate-400 font-bold mt-1">Total Score</div>
                  </div>
                  <div className="rounded-2xl border border-[#1b3668] bg-[#040d1e] p-4">
                    <div className="text-2xl md:text-3xl font-black text-emerald-400">
                      {testResult.accuracy}%
                    </div>
                    <div className="text-xs text-slate-400 font-bold mt-1">Accuracy</div>
                  </div>
                  <div className="rounded-2xl border border-[#1b3668] bg-[#040d1e] p-4">
                    <div className="text-2xl md:text-3xl font-black text-emerald-400">
                      {testResult.correctCount}
                    </div>
                    <div className="text-xs text-slate-400 font-bold mt-1">
                      Correct (+{correctMarks})
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[#1b3668] bg-[#040d1e] p-4">
                    <div className="text-2xl md:text-3xl font-black text-rose-400">
                      {testResult.wrongCount}
                    </div>
                    <div className="text-xs text-slate-400 font-bold mt-1">
                      Wrong ({testResult.negativeMarking ? `−${wrongPenalty}` : '0'})
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setTestActive(false);
                      setTestSubmitted(false);
                    }}
                    className="rounded-xl bg-[#2563eb] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#1d4ed8] shadow-md cursor-pointer"
                  >
                    <RotateCcw className="h-4 w-4 inline mr-1.5" /> Create Another Mock Test
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('/tutor')}
                    className="rounded-xl border border-[#1b3668] bg-[#0a1936] px-5 py-2.5 text-xs font-bold text-slate-200 hover:text-white hover:border-[#38bdf8] cursor-pointer"
                  >
                    Ask AI Tutor to Explain Mistakes →
                  </button>
                  {testResult.wrongCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('/mistakes')}
                      className="rounded-xl border border-rose-500/40 bg-rose-500/15 px-5 py-2.5 text-xs font-bold text-rose-300 hover:bg-rose-500/25 transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>📕 Open Mistake Book ({testResult.wrongCount})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Detailed Question-by-Question Review */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#38bdf8]" />
                  <span>Question-by-Question Solutions ({questions.length})</span>
                </h3>

                {questions.map((q, idx) => {
                  const userAns = userAnswers[idx];
                  const isCorrect = userAns !== null && Number(userAns) === Number(q.answer);
                  const isSkipped = userAns === null || userAns === undefined;

                  return (
                    <div
                      key={q.id}
                      className="rounded-2xl border border-[#162d59] bg-[#061126] p-5 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          {isCorrect ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                          ) : isSkipped ? (
                            <div className="h-5 w-5 rounded-full border border-slate-500 text-slate-400 flex items-center justify-center text-xs shrink-0 mt-0.5">
                              —
                            </div>
                          ) : (
                            <XCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <span className="text-[0.68rem] font-bold text-[#38bdf8] uppercase tracking-wider block">
                              Question {idx + 1}
                            </span>
                            <h4 className="font-semibold text-white text-sm md:text-base leading-snug">
                              {q.question}
                            </h4>
                          </div>
                        </div>

                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${
                            isCorrect
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : isSkipped
                              ? 'bg-slate-800 text-slate-400'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {isCorrect
                            ? `+${correctMarks}`
                            : isSkipped
                            ? '0'
                            : testResult.negativeMarking
                            ? `−${wrongPenalty}`
                            : '0'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {q.options.map((opt, optIdx) => {
                          const isChosen = userAns !== null && Number(userAns) === optIdx;
                          const isActualCorrect = Number(q.answer) === optIdx;
                          return (
                            <div
                              key={optIdx}
                              className={`p-2.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                                isActualCorrect
                                  ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-200 font-semibold'
                                  : isChosen && !isCorrect
                                  ? 'border-rose-500/60 bg-rose-500/15 text-rose-200'
                                  : 'border-[#162d59] bg-[#040d1e] text-slate-400'
                              }`}
                            >
                              <span className="font-bold">{'ABCD'[optIdx]}.</span>
                              <span className="flex-1">{opt}</span>
                              {isActualCorrect && (
                                <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                              )}
                              {isChosen && !isCorrect && (
                                <XCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="rounded-xl border border-[#162d59] bg-[#040d1e] p-3 text-xs text-slate-300">
                        <strong className="text-[#38bdf8]">Explanation: </strong>
                        {q.explanation}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ==================== 3. LIVE MOCK TEST ARENA ==================== */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-5">
                {currQ && (
                  <div className="rounded-3xl border border-[#162d59] bg-[#061126] p-6 shadow-2xl space-y-6">
                    <div className="flex items-center justify-between border-b border-[#142952] pb-4">
                      <div className="flex items-center gap-2.5">
                        <span className="rounded-lg bg-[#2563eb]/30 border border-[#38bdf8]/40 px-3 py-1 text-xs font-bold text-sky-300">
                          Question {currentQuestionIndex + 1} of {questions.length}
                        </span>
                        <span className="text-xs text-slate-400 truncate max-w-[240px]">
                          {subject} · {topic}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-emerald-400 font-bold">+{correctMarks}</span>
                        <span className="text-slate-500">|</span>
                        <span className="text-rose-400 font-bold">
                          {negativeMarking ? `−${wrongPenalty}` : '0'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h2 className="text-base md:text-lg font-bold text-white leading-relaxed">
                        {currQ.question}
                      </h2>
                    </div>

                    <div className="grid gap-3">
                      {currQ.options.map((opt, optIdx) => {
                        const isSelected = userAnswers[currentQuestionIndex] === optIdx;
                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => handleSelectAnswer(optIdx)}
                            className={`flex items-center p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'border-[#38bdf8] bg-gradient-to-r from-[#0d2857] to-[#153e82] text-white shadow-lg'
                                : 'border-[#162d59] bg-[#040d1e] text-slate-300 hover:border-[#2563eb]/60 hover:bg-[#081733]'
                            }`}
                          >
                            <span
                              className={`mr-3.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                                isSelected
                                  ? 'bg-[#2563eb] text-white shadow-md'
                                  : 'border border-[#1b3668] bg-[#0a1936] text-slate-400'
                              }`}
                            >
                              {'ABCD'[optIdx]}
                            </span>
                            <span className="text-xs md:text-sm font-medium">{opt}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-[#142952]">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleToggleReview}
                          className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                            markedForReview[currentQuestionIndex]
                              ? 'border-purple-500 bg-purple-600/20 text-purple-300'
                              : 'border-[#1b3668] bg-[#040d1e] text-slate-400 hover:text-white'
                          }`}
                        >
                          <Flag className="h-3.5 w-3.5" />
                          <span>
                            {markedForReview[currentQuestionIndex] ? 'Marked' : 'Mark for Review'}
                          </span>
                        </button>

                        {userAnswers[currentQuestionIndex] !== null && (
                          <button
                            type="button"
                            onClick={handleClearAnswer}
                            className="rounded-xl border border-[#1b3668] bg-[#040d1e] px-3 py-2 text-xs font-semibold text-slate-400 hover:text-rose-400 cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCurrentQuestionIndex((i) => Math.max(0, i - 1))}
                          disabled={currentQuestionIndex === 0}
                          className="rounded-xl border border-[#1b3668] bg-[#040d1e] px-4 py-2 text-xs font-bold text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5 cursor-pointer"
                        >
                          <ArrowLeft className="h-4 w-4 inline mr-1" /> Prev
                        </button>

                        {currentQuestionIndex === questions.length - 1 ? (
                          <button
                            type="button"
                            onClick={() => setShowSubmitModal(true)}
                            className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Submit Test</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setCurrentQuestionIndex((i) => Math.min(questions.length - 1, i + 1))
                            }
                            className="rounded-xl bg-[#2563eb] px-5 py-2 text-xs font-bold text-white hover:bg-[#1d4ed8] shadow-md transition-all cursor-pointer"
                          >
                            Next <ArrowRight className="h-4 w-4 inline ml-1" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Question Palette */}
              <div className="space-y-4">
                <div className="rounded-3xl border border-[#162d59] bg-[#061126] p-5 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-[#142952] pb-3">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Question Palette
                      </h3>
                      <p className="text-[0.68rem] text-slate-400 mt-0.5">
                        Click any number to jump directly
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTestActive(false);
                        setTestSubmitted(false);
                      }}
                      className="text-[11px] font-semibold text-slate-400 hover:text-rose-300 cursor-pointer"
                    >
                      Exit
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[0.68rem]">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <span className="h-3 w-3 rounded-md bg-emerald-500" />
                      <span>Answered ({userAnswers.filter((a) => a !== null).length})</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <span className="h-3 w-3 rounded-md bg-slate-700" />
                      <span>Not Answered ({userAnswers.filter((a) => a === null).length})</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <span className="h-3 w-3 rounded-md bg-purple-500" />
                      <span>Marked ({markedForReview.filter(Boolean).length})</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <span className="h-3 w-3 rounded-md border border-[#38bdf8] bg-[#2563eb]/30" />
                      <span>Current</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-2 pt-2 border-t border-[#142952] max-h-64 overflow-y-auto pr-1">
                    {questions.map((_, i) => {
                      const isAnswered = userAnswers[i] !== null;
                      const isMarked = markedForReview[i];
                      const isCurrent = i === currentQuestionIndex;

                      let bgClass = 'bg-[#091834] text-slate-300 border border-[#1b3668]';
                      if (isAnswered) bgClass = 'bg-emerald-600 text-white font-bold';
                      if (isMarked) bgClass = 'bg-purple-600 text-white font-bold';
                      if (isCurrent) bgClass += ' ring-2 ring-[#38bdf8] scale-105';

                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setCurrentQuestionIndex(i)}
                          className={`h-10 rounded-xl text-xs font-bold transition-all flex items-center justify-center relative cursor-pointer ${bgClass}`}
                        >
                          <span>{i + 1}</span>
                          {isMarked && isAnswered && (
                            <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-emerald-300" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(true)}
                    className="w-full mt-3 rounded-xl bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] py-2.5 text-xs font-bold text-white hover:brightness-110 shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Submit Mock Test</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ==================== VIEW ALL CHAPTERS / CUSTOM TOPIC MODAL ==================== */}
          {allChaptersModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="w-full max-w-2xl rounded-2xl border border-[#1e3d75] bg-[#061229] p-6 shadow-2xl space-y-5 max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between border-b border-[#142952] pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      Select Chapter or Enter Any Custom Topic ({subject})
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Pick from syllabus chapters below or type any topic in the world to generate a custom mock test
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAllChaptersModalOpen(false)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Custom Topic Input inside Modal */}
                <div className="rounded-xl border border-[#1e3d75] bg-[#040d1e] p-3.5 space-y-2">
                  <label className="text-xs font-bold text-sky-300 block">
                    ✨ Mock Test on Any Custom Topic:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customTopicModalInput}
                      onChange={(e) => setCustomTopicModalInput(e.target.value)}
                      placeholder="Type any topic (e.g., Quadratic Equations, Photosynthesis, Laws of Motion, Organic Chemistry...)"
                      className="flex-1 rounded-xl border border-[#1b3668] bg-[#07142b] px-3.5 py-2.5 text-xs md:text-sm text-white placeholder:text-slate-500 focus:border-[#38bdf8] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customTopicModalInput.trim()) {
                          setTopic(customTopicModalInput.trim());
                          setAllChaptersModalOpen(false);
                        }
                      }}
                      className="rounded-xl bg-[#2563eb] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#1d4ed8] transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Use Topic
                    </button>
                  </div>
                </div>

                {/* All Chapters Grid */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  <div className="text-xs font-semibold text-slate-400 mb-2">
                    Recommended {subject} Chapters:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {currentSubjectTopics.map((chap, idx) => {
                      const isSelected = topic === chap;
                      return (
                        <button
                          key={chap}
                          type="button"
                          onClick={() => {
                            setTopic(chap);
                            setAllChaptersModalOpen(false);
                          }}
                          className={`flex items-center justify-between rounded-xl border p-3 text-left text-xs transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#38bdf8] bg-[#102a56] text-white font-semibold'
                              : 'border-[#162d59] bg-[#08152e] text-slate-200 hover:border-[#2563eb]'
                          }`}
                        >
                          <span className="truncate pr-2">
                            {idx + 1}. {chap}
                          </span>
                          {isSelected && <Check className="h-4 w-4 text-[#38bdf8] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== SUBMIT CONFIRMATION MODAL ==================== */}
          {showSubmitModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="w-full max-w-md rounded-3xl border border-[#1e3d75] bg-[#07142b] p-6 shadow-2xl space-y-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2563eb]/20 text-[#38bdf8] border border-[#38bdf8]/30">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Submit Mock Test?</h3>
                    <p className="text-xs text-slate-400">
                      Review your attempt summary before submitting
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                    <div className="text-xl font-black text-emerald-400">
                      {userAnswers.filter((a) => a !== null).length}
                    </div>
                    <div className="text-[0.65rem] text-emerald-200 uppercase font-bold mt-0.5">
                      Answered
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#1b3668] bg-[#040d1e] p-3">
                    <div className="text-xl font-black text-slate-300">
                      {userAnswers.filter((a) => a === null).length}
                    </div>
                    <div className="text-[0.65rem] text-slate-400 uppercase font-bold mt-0.5">
                      Unattempted
                    </div>
                  </div>
                  <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-3">
                    <div className="text-xl font-black text-purple-400">
                      {markedForReview.filter(Boolean).length}
                    </div>
                    <div className="text-[0.65rem] text-purple-200 uppercase font-bold mt-0.5">
                      Marked
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200/90 flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                  <span>
                    Time remaining: <strong>{formatTimer(secondsRemaining)}</strong>. Once
                    submitted, your scorecard and question-by-question explanations will be shown.
                  </span>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(false)}
                    className="flex-1 rounded-xl border border-[#1b3668] bg-[#0a1936] py-3 text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer"
                  >
                    Return to Test
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitTest}
                    className="flex-1 rounded-xl bg-[#2563eb] py-3 text-xs font-bold text-white hover:bg-[#1d4ed8] shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all cursor-pointer"
                  >
                    Confirm Submit
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
