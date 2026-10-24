import React from 'react';
import { useStudy } from '../context/StudyContext';
import {
  Clock,
  CheckCircle2,
  Target,
  ArrowRight,
  Bot,
  Calendar,
  Sparkles,
  BookMarked,
  AlertTriangle,
  BookOpen,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { profile, stats, mistakes, setActiveTab, currentUser } = useStudy();

  const greetingName = currentUser?.displayName || profile.name || 'Scholar';
  const studyHours = Math.floor(stats.studyTimeMinutes / 60);
  const studyMins = stats.studyTimeMinutes % 60;
  const studyTimeString = `${studyHours}h ${studyMins}m`;

  const unmasteredCount = mistakes.filter((m) => !m.mastered).length;
  const masteredCount = mistakes.filter((m) => m.mastered).length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* 1. Hero Card (matching Image 2) */}
      <section
        className="relative overflow-hidden rounded-3xl border border-blue-500/20 p-6 md:p-10 shadow-2xl"
        style={{
          background:
            'radial-gradient(ellipse at 85% 0%, rgba(37, 99, 235, 0.35), transparent 60%), linear-gradient(160deg, #0f1c38 0%, #091024 100%)',
        }}
      >
        {/* Badges row */}
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-bold tracking-wider text-[#38bdf8]">
          <span>ALL-IN-1</span>
          <span className="text-blue-500/60">·</span>
          <span>NCERT 2026–27</span>
          <span className="text-blue-500/60">·</span>
          <span>MARKDOWN</span>
          <span className="text-blue-500/60">·</span>
          <span>MISTAKE BOOK</span>
          <span className="text-blue-500/60">·</span>
          <span>NCERT BOOKS</span>
        </div>

        {/* Heading */}
        <h1 className="max-w-3xl text-3xl md:text-5xl font-extrabold leading-tight text-white tracking-tight">
          Your AI-Powered{' '}
          <span className="bg-gradient-to-r from-[#38bdf8] via-[#60a5fa] to-[#93c5fd] bg-clip-text text-transparent">
            Personal Study Companion
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-3.5 max-w-2xl text-sm md:text-base text-slate-300 leading-relaxed font-normal">
          One workspace for doubts, mock tests, NCERT textbooks, solutions, mistake book analysis, flashcards and a smart exam
          planner — built for Classes 4–9.
        </p>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap items-center gap-3.5">
          <button
            type="button"
            onClick={() => setActiveTab('/tutor')}
            className="flex items-center gap-2 rounded-full bg-[#2563eb] px-6 py-3 text-sm font-bold text-white shadow-[0_0_25px_rgba(37,99,235,0.5)] hover:bg-[#1d4ed8] hover:scale-105 transition-all"
          >
            <Bot className="h-4 w-4" />
            <span>Open AI Tutor</span>
            <ArrowRight className="h-4 w-4 ml-1" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('/ncert')}
            className="flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-600/15 px-5 py-3 text-sm font-bold text-emerald-300 hover:border-emerald-400 hover:bg-emerald-600/25 transition-all shadow-md"
          >
            <BookOpen className="h-4 w-4 text-emerald-400" />
            <span>NCERT Books (4–9)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('/notes')}
            className="flex items-center gap-2 rounded-full border border-blue-500/40 bg-blue-600/15 px-5 py-3 text-sm font-bold text-blue-300 hover:border-blue-400 hover:bg-blue-600/25 transition-all shadow-md"
          >
            <Sparkles className="h-4 w-4 text-blue-400" />
            <span>AI Notes Generator</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('/mistakes')}
            className="flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-600/15 px-5 py-3 text-sm font-bold text-rose-300 hover:border-rose-400 hover:bg-rose-600/25 transition-all shadow-md"
          >
            <BookMarked className="h-4 w-4 text-rose-400" />
            <span>Mistake Book</span>
            {unmasteredCount > 0 && (
              <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[0.68rem] font-black text-white">
                {unmasteredCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('/planner')}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-[#0d1426] px-5 py-3 text-sm font-bold text-slate-200 hover:border-blue-500/40 hover:bg-[#121c36] transition-all"
          >
            <span className="text-base">📅</span>
            <span>Plan my exams</span>
          </button>
        </div>
      </section>

      {/* 2. Today Learning Snapshot (matching Image 2) */}
      <section className="rounded-3xl border border-white/10 bg-[#0a1020] p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm md:text-base font-bold text-[#38bdf8]">
              👋 Good evening, {greetingName}!
            </h3>
            <p className="text-xs text-slate-400">Here's your learning snapshot for today.</p>
          </div>
          <span className="rounded-full bg-blue-500/10 border border-blue-500/30 px-2.5 py-0.5 text-[0.68rem] font-bold text-blue-400">
            LIVE
          </span>
        </div>

        {/* 4 Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Metric 1: Study time */}
          <div className="rounded-2xl border border-white/10 bg-[#070b16] p-4 transition-all hover:border-blue-500/40">
            <Clock className="h-4 w-4 text-[#38bdf8]" />
            <div className="mt-2 text-2xl font-black text-white">{studyTimeString}</div>
            <div className="mt-0.5 text-xs text-slate-400 font-medium">Study time today</div>
          </div>

          {/* Metric 2: Questions solved */}
          <div className="rounded-2xl border border-white/10 bg-[#070b16] p-4 transition-all hover:border-blue-500/40">
            <CheckCircle2 className="h-4 w-4 text-[#38bdf8]" />
            <div className="mt-2 text-2xl font-black text-white">{stats.questionsSolved}</div>
            <div className="mt-0.5 text-xs text-slate-400 font-medium">Questions solved</div>
          </div>

          {/* Metric 3: Test accuracy */}
          <div className="rounded-2xl border border-white/10 bg-[#070b16] p-4 transition-all hover:border-blue-500/40">
            <Target className="h-4 w-4 text-[#38bdf8]" />
            <div className="mt-2 text-2xl font-black text-white">{stats.testAccuracy}%</div>
            <div className="mt-0.5 text-xs text-slate-400 font-medium">Test accuracy</div>
          </div>

          {/* Metric 4: Mistake Book */}
          <div
            onClick={() => setActiveTab('/mistakes')}
            className="cursor-pointer rounded-2xl border border-rose-500/20 bg-[#140b12] p-4 transition-all hover:border-rose-500/60 hover:bg-[#1a0f18] group"
          >
            <div className="flex items-center justify-between">
              <BookMarked className="h-4 w-4 text-rose-400 group-hover:scale-110 transition-transform" />
              {unmasteredCount > 0 ? (
                <span className="rounded-full bg-rose-500/20 text-rose-300 text-[0.65rem] px-2 py-0.5 font-bold">
                  Needs Review
                </span>
              ) : (
                <span className="rounded-full bg-emerald-500/20 text-emerald-300 text-[0.65rem] px-2 py-0.5 font-bold">
                  All Clear!
                </span>
              )}
            </div>
            <div className="mt-2 text-2xl font-black text-rose-200">
              {unmasteredCount} <span className="text-xs text-slate-400 font-normal">/ {mistakes.length} total</span>
            </div>
            <div className="mt-0.5 text-xs text-slate-400 font-medium group-hover:text-rose-300 transition-colors">
              Mistakes to revise →
            </div>
          </div>
        </div>

        {/* Continue Learning Banner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('/revision')}
            className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#0e162c] px-5 py-3.5 text-xs md:text-sm font-semibold text-slate-200 transition-all hover:border-[#2563eb] hover:bg-[#121c38]"
          >
            <span className="flex items-center gap-2">
              <span>▶</span>
              <span>Continue learning: Science · Chapter 8 — Motion</span>
            </span>
            <ArrowRight className="h-4 w-4 text-[#38bdf8]" />
          </button>

          {unmasteredCount > 0 ? (
            <button
              type="button"
              onClick={() => setActiveTab('/mistakes')}
              className="flex items-center justify-between rounded-2xl border border-rose-500/30 bg-[#160d1b] px-5 py-3.5 text-xs md:text-sm font-semibold text-rose-200 transition-all hover:border-rose-500 hover:bg-[#201127]"
            >
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                <span>Practice {unmasteredCount} mistake{unmasteredCount > 1 ? 's' : ''} in your Mistake Book</span>
              </span>
              <ArrowRight className="h-4 w-4 text-rose-400" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActiveTab('/mock-test')}
              className="flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-[#0c1815] px-5 py-3.5 text-xs md:text-sm font-semibold text-emerald-200 transition-all hover:border-emerald-500 hover:bg-[#10231e]"
            >
              <span className="flex items-center gap-2">
                <span>🎯</span>
                <span>Take a fresh Mock Test to challenge yourself</span>
              </span>
              <ArrowRight className="h-4 w-4 text-emerald-400" />
            </button>
          )}
        </div>
      </section>
    </div>
  );
};
