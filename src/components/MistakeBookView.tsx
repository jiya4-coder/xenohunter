import React, { useState } from 'react';
import { useStudy } from '../context/StudyContext';
import {
  BookMarked,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Search,
  Filter,
  Trash2,
  Sparkles,
  ArrowRight,
  Lightbulb,
  Award,
  ChevronRight,
  SlidersHorizontal,
  Bot,
  HelpCircle,
  FileQuestion,
  BookOpen,
  Check,
  Flame,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { MistakeRecord } from '../types';

export const MistakeBookView: React.FC = () => {
  const {
    mistakes,
    toggleMistakeMastered,
    removeMistake,
    clearAllMistakes,
    setActiveTab,
    profile,
    addStars,
  } = useStudy();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<'all' | 'needs_review' | 'mastered'>('all');

  // Interactive Re-attempt modal or inline state
  const [retryingMistakeId, setRetryingMistakeId] = useState<string | null>(null);
  const [selectedRetryOption, setSelectedRetryOption] = useState<number | null>(null);
  const [retryResult, setRetryResult] = useState<{ isCorrect: boolean; message: string } | null>(null);

  const totalMistakes = mistakes.length;
  const masteredCount = mistakes.filter((m) => m.mastered).length;
  const pendingCount = totalMistakes - masteredCount;
  const masteryPercentage = totalMistakes > 0 ? Math.round((masteredCount / totalMistakes) * 100) : 0;

  const filteredMistakes = mistakes.filter((m) => {
    const matchesSearch =
      m.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.testTopic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.explanation.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = filterSubject === 'All' || m.subject === filterSubject;
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'mastered' && m.mastered) ||
      (filterStatus === 'needs_review' && !m.mastered);
    return matchesSearch && matchesSubject && matchesStatus;
  });

  const handleStartRetry = (mistake: MistakeRecord) => {
    setRetryingMistakeId(mistake.id);
    setSelectedRetryOption(null);
    setRetryResult(null);
  };

  const handleConfirmRetry = (mistake: MistakeRecord) => {
    if (selectedRetryOption === null) return;

    const isCorrect = Number(selectedRetryOption) === Number(mistake.correctAnswer);
    if (isCorrect) {
      setRetryResult({
        isCorrect: true,
        message: '🎉 Brilliant! You nailed it on re-attempt. Mistake marked as Mastered!',
      });
      toggleMistakeMastered(mistake.id);
      addStars(10);
      try {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      } catch {}
    } else {
      setRetryResult({
        isCorrect: false,
        message: 'Not quite right yet. Review the step-by-step concept below and try again!',
      });
    }
  };

  return (
    <div className="h-[calc(100vh-2.5rem)] overflow-y-auto bg-[#07090e] p-4 md:p-8 font-['Sora'] text-slate-100 select-none">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-rose-500/10 border border-rose-500/30 px-3 py-0.5 text-xs font-bold text-rose-400 flex items-center gap-1.5">
                <BookMarked className="h-3 w-3" /> EXAM MISTAKE BOOK
              </span>
              <span className="text-xs text-slate-400 font-semibold">
                {profile.classLevel} · {profile.primaryExam} Syllabus
              </span>
            </div>
            <h1 className="mt-1.5 text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Mistake Notebook & Error Log
            </h1>
            <p className="text-xs md:text-sm text-slate-400">
              Every incorrect mock test answer is automatically logged here with correct solutions and step-by-step explanations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('/mock-test')}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 shadow-md transition-all active:scale-95"
            >
              <span>Take New Mock Test</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Analytics & Mastery Status Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="rounded-2xl border border-white/10 bg-[#0d1222] p-4 flex items-center gap-3.5 shadow-xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30">
              <XCircle className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-white">{pendingCount}</div>
              <div className="text-xs text-slate-400 font-medium">To Review & Fix</div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0d1222] p-4 flex items-center gap-3.5 shadow-xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-emerald-400">{masteredCount}</div>
              <div className="text-xs text-slate-400 font-medium">Mastered Mistakes</div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0d1222] p-4 flex items-center gap-3.5 shadow-xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Award className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-white">{masteryPercentage}%</span>
                <span className="text-amber-400">Mastery Rate</span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${masteryPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3.5 rounded-3xl border border-white/10 bg-[#0d1222] p-4 shadow-xl">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search mistakes by question, topic or keyword..."
              className="w-full rounded-2xl border border-white/10 bg-[#080c18] pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Subject Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['All', 'Science', 'Mathematics', 'Social Science', 'English'] as const).map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => setFilterSubject(sub)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                  filterSubject === sub
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'border border-white/5 bg-[#12182b] text-slate-400 hover:text-white'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>

          {/* Status Filters */}
          <div className="flex items-center gap-1 border-l border-white/10 pl-3">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`rounded-xl px-2.5 py-1 text-xs font-semibold ${
                filterStatus === 'all' ? 'bg-white/10 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({totalMistakes})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('needs_review')}
              className={`rounded-xl px-2.5 py-1 text-xs font-semibold ${
                filterStatus === 'needs_review'
                  ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Needs Review ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('mastered')}
              className={`rounded-xl px-2.5 py-1 text-xs font-semibold ${
                filterStatus === 'mastered'
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Mastered ({masteredCount})
            </button>
          </div>
        </div>

        {/* Mistakes List */}
        {filteredMistakes.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-[#0d1222] p-12 text-center space-y-4 shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">No Unresolved Mistakes!</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                {searchQuery || filterSubject !== 'All' || filterStatus !== 'all'
                  ? 'No mistake records match your active filters. Try clearing search or status filters.'
                  : 'You have either answered all mock test questions correctly or marked all mistakes as Mastered! Excellent progress.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('/mock-test')}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-500 shadow-md inline-flex items-center gap-1.5"
            >
              <span>Take a Mock Test to Challenge Yourself</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMistakes.map((m, index) => {
              const isRetrying = retryingMistakeId === m.id;

              return (
                <div
                  key={m.id}
                  className={`rounded-3xl border transition-all p-6 shadow-2xl space-y-5 ${
                    m.mastered
                      ? 'border-emerald-500/30 bg-[#09131f]'
                      : 'border-white/10 bg-[#0d1222] hover:border-slate-600'
                  }`}
                >
                  {/* Top Bar: Subject, Date, Status */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3.5">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-blue-500/20 border border-blue-500/30 px-2.5 py-0.5 text-[0.68rem] font-bold text-blue-400 uppercase">
                        {m.subject}
                      </span>
                      <span className="text-xs text-slate-400 font-semibold">{m.testTopic}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-[0.68rem] text-slate-500">{m.date}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleMistakeMastered(m.id)}
                        className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                          m.mastered
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-white/5 text-slate-400 border border-white/10 hover:text-white hover:bg-white/10'
                        }`}
                        title="Mark whether you have mastered this concept"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>{m.mastered ? 'Mastered ✓' : 'Mark as Mastered'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => removeMistake(m.id)}
                        className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete from Mistake Book"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Question Prompt */}
                  <div className="space-y-1">
                    <span className="text-[0.68rem] font-bold uppercase tracking-wider text-slate-500">
                      Problem Statement
                    </span>
                    <h3 className="text-sm md:text-base font-bold text-white leading-relaxed">
                      {m.question}
                    </h3>
                  </div>

                  {/* Answer Comparison Box */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* Student's Wrong Answer */}
                    <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 space-y-1">
                      <div className="flex items-center gap-1.5 text-rose-400 text-xs font-bold">
                        <XCircle className="h-4 w-4 shrink-0" />
                        <span>Your Submitted Answer:</span>
                      </div>
                      <p className="text-xs md:text-sm text-rose-200 font-medium leading-relaxed pl-5">
                        {m.userAnswerText}
                      </p>
                    </div>

                    {/* Verified Correct Answer */}
                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>Correct Board Answer:</span>
                      </div>
                      <p className="text-xs md:text-sm text-emerald-200 font-semibold leading-relaxed pl-5">
                        {m.correctAnswerText}
                      </p>
                    </div>
                  </div>

                  {/* Step-by-Step Solution & Concept Explanation */}
                  <div className="rounded-2xl border border-blue-500/20 bg-[#070b16] p-4 md:p-5 space-y-2">
                    <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider">
                      <Lightbulb className="h-4 w-4" />
                      <span>Step-by-Step Solution & Marking Concept</span>
                    </div>
                    <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-normal whitespace-pre-wrap">
                      {m.explanation}
                    </p>
                  </div>

                  {/* Re-attempt / Practice Section */}
                  {isRetrying ? (
                    <div className="rounded-2xl border border-purple-500/30 bg-[#0d1426] p-5 space-y-4 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                          <RotateCcw className="h-4 w-4 animate-spin-slow" />
                          <span>Interactive Re-Attempt Mode</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setRetryingMistakeId(null)}
                          className="text-[0.68rem] text-slate-400 hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="grid gap-2">
                        {m.options.map((opt, optIdx) => (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => setSelectedRetryOption(optIdx)}
                            className={`flex items-center p-3 rounded-xl border text-left text-xs transition-all ${
                              selectedRetryOption === optIdx
                                ? 'border-purple-500 bg-purple-600/20 text-white font-bold'
                                : 'border-white/10 bg-[#080c18] text-slate-300 hover:border-slate-500'
                            }`}
                          >
                            <span className="mr-3 font-bold text-slate-400">{'ABCD'[optIdx]}.</span>
                            <span>{opt}</span>
                          </button>
                        ))}
                      </div>

                      {retryResult && (
                        <div
                          className={`rounded-xl p-3 text-xs font-semibold ${
                            retryResult.isCorrect
                              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                              : 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
                          }`}
                        >
                          {retryResult.message}
                        </div>
                      )}

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleConfirmRetry(m)}
                          disabled={selectedRetryOption === null}
                          className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-500 disabled:opacity-40 transition-colors shadow-md"
                        >
                          Check My New Answer
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => handleStartRetry(m)}
                        className="flex items-center gap-1.5 rounded-xl border border-purple-500/40 bg-purple-600/10 px-4 py-2 text-xs font-bold text-purple-300 hover:bg-purple-600/20 transition-all active:scale-95 shadow-sm"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Re-Solve Question (Practice)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('/tutor');
                        }}
                        className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:border-blue-500/40 transition-colors"
                      >
                        <Bot className="h-3.5 w-3.5 text-blue-400" />
                        <span>Ask AI Tutor to Explain Variant Questions →</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
