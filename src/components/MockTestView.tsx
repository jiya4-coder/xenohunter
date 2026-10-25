import React, { useState, useEffect } from 'react';
import { useStudy } from '../context/StudyContext';
import {
  SlidersHorizontal,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  Trophy,
  Loader2,
  Clock,
  Bookmark,
  Flag,
  Award,
  ChevronRight,
  AlertCircle,
  FileText,
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { MockQuestion, MockTestResult } from '../types';
import { safeFetchJson } from '../utils/api';
import { recordMockTest } from '../utils/achievementEngine';

export const MockTestView: React.FC = () => {
  const { profile, addQuestionAttempt, addStars, addStudyMinutes, setActiveTab, addMistake } = useStudy();

  const [topic, setTopic] = useState('Science: Motion, Force & Laws (Class 9)');
  const [subject, setSubject] = useState<'Science' | 'Mathematics' | 'Social Science' | 'English'>('Science');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [questionCount, setQuestionCount] = useState(5);
  const [negativeMarking, setNegativeMarking] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active test state
  const [testActive, setTestActive] = useState(false);
  const [questions, setQuestions] = useState<MockQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>([]);
  const [markedForReview, setMarkedForReview] = useState<boolean[]>([]);
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testResult, setTestResult] = useState<MockTestResult | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Test timer
  const [secondsRemaining, setSecondsRemaining] = useState(300);

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
  }, [testActive, testSubmitted]);

  // Client normalizer to ensure answers are numbers
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
        options: Array.isArray(q.options) && q.options.length >= 2 ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'],
        answer: answerIdx,
        explanation: q.explanation || 'Standard textbook explanation.',
      };
    });
  };

  const handleStartTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const fallbackQuestions: MockQuestion[] = Array.from({ length: questionCount }, (_, i) => ({
        id: i + 1,
        question: `Question ${i + 1} (${subject} · ${profile.classLevel}): Which fundamental concept accurately applies to "${topic}"?`,
        options: [
          'It is a proven scientific law that follows the conservation principle.',
          'It is an irreversible process occurring only at absolute zero.',
          'It applies only to non-inertial frames of reference.',
          'None of the above options are conceptually valid.',
        ],
        answer: 0,
        explanation: `In ${subject} for ${profile.classLevel}, this principle is fundamental and governed by standard conservation and syllabus definitions.`,
      }));

      const data = await safeFetchJson<{ questions: MockQuestion[] }>(
        '/api/generate-mock-test',
        {
          method: 'POST',
          body: JSON.stringify({
            topic: `${subject}: ${topic}`,
            difficulty,
            count: questionCount,
            negativeMarking,
            studentProfile: profile,
          }),
        },
        { questions: fallbackQuestions }
      );

      const rawQuestions = data.questions && data.questions.length > 0 ? data.questions : fallbackQuestions;
      const loadedQuestions = normalizeQuestionsClient(rawQuestions);
      setQuestions(loadedQuestions);
      setUserAnswers(new Array(loadedQuestions.length).fill(null));
      setMarkedForReview(new Array(loadedQuestions.length).fill(false));
      setCurrentQuestionIndex(0);
      setSecondsRemaining(questionCount * 60); // 1 minute per question
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
        // Automatically save to the student's Mistake Book!
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

    const marksPerCorrect = 1;
    const penaltyPerWrong = negativeMarking ? 0.25 : 0;
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
    addStudyMinutes(Math.max(Math.ceil((questionCount * 60 - secondsRemaining) / 60), 2));
    addStars(Math.round(finalScore * 5));

    // Save to shared mock test records & trigger achievement engine
    recordMockTest({
      name: `Mock Test: ${topic}`,
      subject,
      score: Number(finalScore.toFixed(2)),
      maxScore,
      focusArea: accuracy === 100 ? 'Flawless 100% Score!' : accuracy >= 90 ? 'Excellent score (90%+)' : `Revise: ${topic}`,
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

  const currQ = questions[currentQuestionIndex];

  // Presets strictly for Class 4th to 9th
  const classSyllabusPresets: Record<string, string[]> = {
    Science: [
      'Class 9: Motion & Force Laws',
      'Class 8: Combustion & Flame',
      'Class 7: Acids, Bases & Salts',
      'Class 6: Light, Shadows & Reflections',
      'Class 5: Human Body & Organs',
      'Class 4: Living & Non-Living Things',
    ],
    Mathematics: [
      'Class 9: Polynomials & Coordinate Geometry',
      'Class 8: Linear Equations in One Variable',
      'Class 7: Fractions & Decimals',
      'Class 6: Integers & Basic Algebra',
      'Class 5: Factors, Multiples & LCM/HCF',
      'Class 4: Basic Multiplication & Division',
    ],
    'Social Science': [
      'Class 9: French Revolution & Nazism',
      'Class 8: Our Pasts III & British Rule',
      'Class 7: Delhi Sultans & Mughal Empire',
      'Class 6: Solar System & Early Humans',
    ],
    English: [
      'Class 9: Tenses & Reported Speech',
      'Class 8: Active & Passive Voice',
      'Class 7: Prepositions & Conjunctions',
      'Class 6: Nouns, Pronouns & Adjectives',
    ],
  };

  return (
    <div className="h-[calc(100vh-2.5rem)] overflow-y-auto bg-[#07090e] p-4 md:p-8 select-none font-['Sora']">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-500/10 border border-blue-500/30 px-3 py-0.5 text-xs font-bold text-blue-400">
                PRO EXAM PORTAL
              </span>
              <span className="text-xs text-slate-400 font-semibold">
                {profile.classLevel} · {profile.primaryExam}
              </span>
            </div>
            <h1 className="mt-1 text-2xl md:text-3xl font-extrabold text-white">
              Mock Examination Arena
            </h1>
            <p className="text-xs md:text-sm text-slate-400">
              Exam-hall test simulator with live timer, question palette & marking rules.
            </p>
          </div>

          {testActive && !testSubmitted && (
            <div className="flex items-center gap-3">
              <div
                className={`flex items-center gap-2 rounded-xl px-4 py-2 border font-mono text-sm font-bold shadow-lg ${
                  secondsRemaining < 60
                    ? 'border-rose-500/60 bg-rose-500/15 text-rose-300 animate-pulse'
                    : 'border-blue-500/40 bg-[#0d152a] text-blue-300'
                }`}
              >
                <Clock className="h-4 w-4" />
                <span>{formatTimer(secondsRemaining)}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 shadow-md transition-all active:scale-95"
              >
                Submit Exam
              </button>
            </div>
          )}
        </div>

        {/* 1. Setup Form */}
        {!testActive ? (
          <div className="rounded-3xl border border-white/10 bg-[#0d1222] p-6 md:p-8 shadow-2xl space-y-6">
            <div className="flex items-center gap-2.5 text-white font-bold text-lg border-b border-white/10 pb-4">
              <SlidersHorizontal className="h-5 w-5 text-blue-400" />
              <span>Configure Your Examination Paper (Class 4th to 9th)</span>
            </div>

            <form onSubmit={handleStartTest} className="space-y-6">
              {/* Subject selector */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-2">
                  Select Subject
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {(['Science', 'Mathematics', 'Social Science', 'English'] as const).map((sub) => (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => {
                        setSubject(sub);
                        setTopic(classSyllabusPresets[sub][0] || 'General');
                      }}
                      className={`rounded-xl border p-3 text-xs md:text-sm font-bold transition-all text-center ${
                        subject === sub
                          ? 'border-blue-500 bg-blue-600/20 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]'
                          : 'border-white/10 bg-[#12182b] text-slate-400 hover:border-slate-600 hover:text-white'
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>

              {/* Topic / Chapter */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-1.5">
                  Chapter / Topic
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Motion & Laws, Fractions, French Revolution..."
                  className="w-full rounded-xl border border-white/10 bg-[#080c18] px-4 py-3 text-sm text-white focus:border-blue-500 focus:outline-none"
                  required
                />
                {/* Syllabus Quick Chips */}
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <span className="text-[0.7rem] text-slate-500 self-center">Popular chapters:</span>
                  {(classSyllabusPresets[subject] || []).slice(0, 4).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setTopic(p)}
                      className="rounded-lg border border-white/5 bg-[#12182b] px-2.5 py-1 text-[0.68rem] text-slate-300 hover:border-blue-500/50 hover:text-white"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty & Question count */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-2">
                    Difficulty Level
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Easy', 'Medium', 'Hard'] as const).map((diff) => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => setDifficulty(diff)}
                        className={`rounded-xl border py-2.5 text-xs font-bold transition-all text-center ${
                          difficulty === diff
                            ? 'border-blue-500 bg-blue-600/20 text-white shadow-sm'
                            : 'border-white/10 bg-[#12182b] text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                    <span>Number of Questions</span>
                    <span className="text-blue-400 font-bold">{questionCount} Questions ({questionCount} mins)</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[5, 10, 15, 20].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setQuestionCount(num)}
                        className={`rounded-xl border py-2.5 text-xs font-bold transition-all text-center ${
                          questionCount === num
                            ? 'border-blue-500 bg-blue-600/20 text-white shadow-sm'
                            : 'border-white/10 bg-[#12182b] text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        {num} Qs
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Negative Marking */}
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#080c18] p-4">
                <div>
                  <h4 className="text-sm font-bold text-white">Negative Marking Policy</h4>
                  <p className="text-xs text-slate-400">
                    Correct: <strong className="text-emerald-400">+1.00</strong> · Incorrect:{' '}
                    <strong className="text-rose-400">{negativeMarking ? '−0.25' : '0.00'}</strong> · Unattempted: 0
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setNegativeMarking(!negativeMarking)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    negativeMarking ? 'bg-blue-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      negativeMarking ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {error && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-[#2563eb] py-4 text-sm font-bold text-white shadow-[0_0_25px_rgba(37,99,235,0.4)] hover:bg-[#1d4ed8] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" /> Preparing Exam Questions...
                  </>
                ) : (
                  <>
                    Start Examination Now <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>
          </div>
        ) : testSubmitted && testResult ? (
          /* 2. Professional Report Card & Results View */
          <div className="space-y-6 animate-in fade-in">
            {/* Scorecard Banner */}
            <div className="rounded-3xl border border-blue-500/30 bg-[#0d1426] p-6 md:p-8 shadow-2xl text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-400 border border-amber-400/30 mb-3">
                <Trophy className="h-8 w-8" />
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white">
                Official Examination Scorecard
              </h2>
              <p className="text-xs md:text-sm text-slate-400 mt-1">
                Candidate: {profile.name} · {profile.classLevel} ({profile.primaryExam}) · {testResult.topic}
              </p>

              {/* Metrics Grid */}
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="rounded-2xl border border-white/10 bg-[#070b16] p-4">
                  <div className="text-2xl md:text-3xl font-black text-blue-400">
                    {testResult.score} / {testResult.maxScore}
                  </div>
                  <div className="text-xs text-slate-400 font-bold mt-1">Total Score</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#070b16] p-4">
                  <div className="text-2xl md:text-3xl font-black text-emerald-400">
                    {testResult.accuracy}%
                  </div>
                  <div className="text-xs text-slate-400 font-bold mt-1">Accuracy</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#070b16] p-4">
                  <div className="text-2xl md:text-3xl font-black text-emerald-400">
                    {testResult.correctCount}
                  </div>
                  <div className="text-xs text-slate-400 font-bold mt-1">Correct (+1)</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#070b16] p-4">
                  <div className="text-2xl md:text-3xl font-black text-rose-400">
                    {testResult.wrongCount}
                  </div>
                  <div className="text-xs text-slate-400 font-bold mt-1">
                    Wrong ({testResult.negativeMarking ? '−0.25' : '0'})
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setTestActive(false);
                    setTestSubmitted(false);
                  }}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-500 shadow-md"
                >
                  <RotateCcw className="h-4 w-4 inline mr-1.5" /> Start New Test
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('/tutor')}
                  className="rounded-xl border border-white/10 bg-[#12182b] px-5 py-2.5 text-xs font-bold text-slate-200 hover:text-white hover:border-blue-500/50"
                >
                  Ask AI Tutor to Explain Mistakes →
                </button>
                {testResult.wrongCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('/mistakes')}
                    className="rounded-xl border border-rose-500/40 bg-rose-500/15 px-5 py-2.5 text-xs font-bold text-rose-300 hover:bg-rose-500/25 transition-all shadow-md flex items-center gap-1.5"
                  >
                    <span>📕 Open Mistake Book ({testResult.wrongCount})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Detailed Question Review */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-400" />
                <span>Question-by-Question Detailed Analysis ({questions.length})</span>
              </h3>

              {questions.map((q, idx) => {
                const userAns = userAnswers[idx];
                const isCorrect = userAns !== null && Number(userAns) === Number(q.answer);
                const isSkipped = userAns === null || userAns === undefined;

                return (
                  <div
                    key={q.id}
                    className="rounded-2xl border border-white/10 bg-[#0d1222] p-5 space-y-3"
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
                          <span className="text-[0.68rem] font-bold text-blue-400 uppercase tracking-wider block">
                            Question {idx + 1}
                          </span>
                          <h4 className="font-semibold text-white text-sm md:text-base leading-snug">
                            {q.question}
                          </h4>
                        </div>
                      </div>

                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          isCorrect
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : isSkipped
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {isCorrect ? '+1.00' : isSkipped ? '0.00' : testResult.negativeMarking ? '−0.25' : '0.00'}
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
                                : 'border-white/5 bg-[#080c18] text-slate-400'
                            }`}
                          >
                            <span className="font-bold">{'ABCD'[optIdx]}.</span>
                            <span className="flex-1">{opt}</span>
                            {isActualCorrect && <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                            {isChosen && !isCorrect && <XCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />}
                          </div>
                        );
                      })}
                    </div>

                    <div className="rounded-xl border border-white/5 bg-[#080c18] p-3 text-xs text-slate-300">
                      <strong className="text-blue-400">Explanation & Marking Concept: </strong>
                      {q.explanation}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* 3. Professional Live Exam Arena */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Question Paper Area */}
            <div className="lg:col-span-2 space-y-5">
              {currQ && (
                <div className="rounded-3xl border border-white/10 bg-[#0d1222] p-6 shadow-2xl space-y-6">
                  {/* Top Question Status bar */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-blue-600/30 border border-blue-500/40 px-2.5 py-1 text-xs font-bold text-blue-300">
                        Q.{currentQuestionIndex + 1}
                      </span>
                      <span className="text-xs text-slate-400">Single Choice Question</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-emerald-400 font-bold">+1.00</span>
                      <span className="text-slate-500">|</span>
                      <span className="text-rose-400 font-bold">
                        {negativeMarking ? '−0.25' : '0.00'}
                      </span>
                    </div>
                  </div>

                  {/* Question Prompt */}
                  <div>
                    <h2 className="text-base md:text-lg font-bold text-white leading-relaxed">
                      {currQ.question}
                    </h2>
                  </div>

                  {/* Options */}
                  <div className="grid gap-3">
                    {currQ.options.map((opt, optIdx) => {
                      const isSelected = userAnswers[currentQuestionIndex] === optIdx;
                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => handleSelectAnswer(optIdx)}
                          className={`flex items-center p-4 rounded-2xl border text-left transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-600/20 text-white shadow-lg'
                              : 'border-white/10 bg-[#080c18] text-slate-300 hover:border-slate-600 hover:bg-[#0c1224]'
                          }`}
                        >
                          <span
                            className={`mr-3.5 flex h-7 w-7 items-center justify-center rounded-xl text-xs font-bold ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'border border-white/10 bg-[#12182b] text-slate-400'
                            }`}
                          >
                            {'ABCD'[optIdx]}
                          </span>
                          <span className="text-xs md:text-sm font-medium">{opt}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Bottom Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-white/10">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleToggleReview}
                        className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                          markedForReview[currentQuestionIndex]
                            ? 'border-purple-500 bg-purple-600/20 text-purple-300'
                            : 'border-white/10 bg-[#080c18] text-slate-400 hover:text-white'
                        }`}
                      >
                        <Flag className="h-3.5 w-3.5" />
                        <span>{markedForReview[currentQuestionIndex] ? 'Marked' : 'Mark for Review'}</span>
                      </button>

                      {userAnswers[currentQuestionIndex] !== null && (
                        <button
                          type="button"
                          onClick={handleClearAnswer}
                          className="rounded-xl border border-white/10 bg-[#080c18] px-3 py-2 text-xs font-semibold text-slate-400 hover:text-rose-400"
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
                        className="rounded-xl border border-white/10 bg-[#080c18] px-4 py-2 text-xs font-bold text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5"
                      >
                        <ArrowLeft className="h-4 w-4 inline mr-1" /> Prev
                      </button>

                      {currentQuestionIndex === questions.length - 1 ? (
                        <button
                          type="button"
                          onClick={() => setShowSubmitModal(true)}
                          className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Submit Test</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setCurrentQuestionIndex((i) => Math.min(questions.length - 1, i + 1))}
                          className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-500 shadow-md transition-all active:scale-95"
                        >
                          Next <ArrowRight className="h-4 w-4 inline ml-1" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Col: Professional Question Palette Panel */}
            <div className="space-y-4">
              <div className="rounded-3xl border border-white/10 bg-[#0d1222] p-5 shadow-2xl space-y-4">
                <div className="border-b border-white/10 pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Question Palette
                  </h3>
                  <p className="text-[0.68rem] text-slate-500 mt-0.5">
                    Click any number to jump directly
                  </p>
                </div>

                {/* Status Legend */}
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
                    <span className="h-3 w-3 rounded-md border border-blue-500 bg-blue-600/30" />
                    <span>Current</span>
                  </div>
                </div>

                {/* Question Numbers Grid */}
                <div className="grid grid-cols-5 gap-2 pt-2 border-t border-white/10">
                  {questions.map((_, i) => {
                    const isAnswered = userAnswers[i] !== null;
                    const isMarked = markedForReview[i];
                    const isCurrent = i === currentQuestionIndex;

                    let bgClass = 'bg-[#12182b] text-slate-400 border border-white/5';
                    if (isAnswered) bgClass = 'bg-emerald-600 text-white font-bold';
                    if (isMarked) bgClass = 'bg-purple-600 text-white font-bold';
                    if (isCurrent) bgClass += ' ring-2 ring-blue-400 scale-105';

                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setCurrentQuestionIndex(i)}
                        className={`h-10 rounded-xl text-xs font-bold transition-all flex items-center justify-center relative ${bgClass}`}
                      >
                        <span>{i + 1}</span>
                        {isMarked && isAnswered && (
                          <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-emerald-300" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Dedicated Palette Submit Button */}
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(true)}
                  className="w-full mt-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 text-xs font-bold text-white hover:from-blue-500 hover:to-indigo-500 shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Submit Examination</span>
                </button>
              </div>

              {/* Candidate Info Box */}
              <div className="rounded-2xl border border-white/10 bg-[#0d1222] p-4 text-xs text-slate-300 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Candidate:</span>
                  <span className="font-bold text-white">{profile.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Grade:</span>
                  <span className="font-bold text-blue-400">{profile.classLevel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Exam:</span>
                  <span className="font-bold text-slate-300">{profile.primaryExam}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Submit Confirmation Modal */}
        {showSubmitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0d1222] p-6 shadow-2xl space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Submit Examination?</h3>
                  <p className="text-xs text-slate-400">Review your attempt status before final submission</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                  <div className="text-xl font-black text-emerald-400">
                    {userAnswers.filter((a) => a !== null).length}
                  </div>
                  <div className="text-[0.65rem] text-emerald-200 uppercase font-bold mt-0.5">Answered</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#070b16] p-3">
                  <div className="text-xl font-black text-slate-400">
                    {userAnswers.filter((a) => a === null).length}
                  </div>
                  <div className="text-[0.65rem] text-slate-400 uppercase font-bold mt-0.5">Unattempted</div>
                </div>
                <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-3">
                  <div className="text-xl font-black text-purple-400">
                    {markedForReview.filter(Boolean).length}
                  </div>
                  <div className="text-[0.65rem] text-purple-200 uppercase font-bold mt-0.5">Marked</div>
                </div>
              </div>

              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200/90 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                <span>
                  Time remaining: <strong>{formatTimer(secondsRemaining)}</strong>. Once submitted, your score and detailed answer solutions will be generated.
                </span>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="flex-1 rounded-xl border border-white/10 bg-[#12182b] py-3 text-xs font-bold text-slate-300 hover:text-white hover:border-slate-500 transition-all"
                >
                  Return to Exam
                </button>
                <button
                  type="button"
                  onClick={handleSubmitTest}
                  className="flex-1 rounded-xl bg-blue-600 py-3 text-xs font-bold text-white hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all"
                >
                  Confirm Submit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
