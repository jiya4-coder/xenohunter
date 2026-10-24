import React, { useState } from 'react';
import { useStudy } from '../context/StudyContext';
import { X, Check, Sliders, RefreshCw, Sparkles, BookOpen, Clock, Globe } from 'lucide-react';

const classOptions = [
  'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9'
];

const examOptions = [
  'CBSE', 'ICSE / State Board', 'Science Olympiad (NSO)', 'Math Olympiad (IMO)', 'NTSE Foundation', 'School Unit Tests'
];

const languages = ['English', 'Hindi', 'Hinglish'];

const personas = [
  { id: 'Friendly & Encouraging Mentor', name: 'Friendly Mentor', desc: 'Patient, warm, step-by-step encouragement' },
  { id: 'Socratic Tutor', name: 'Socratic Tutor', desc: 'Asks smart questions to help you deduce answers yourself' },
  { id: 'Strict Professor', name: 'Strict Board Examiner', desc: 'Precise exam marks breakdown & strict keyword checks' },
  { id: 'Speed Problem Solver', name: 'Competition Coach', desc: 'Focus on speed shortcuts, elimination tricks, and formulas' },
];

export const CustomizeProfileModal: React.FC = () => {
  const { profile, updateProfile, customizeOpen, setCustomizeOpen } = useStudy();

  const [name, setName] = useState(profile.name || 'Aarav');
  const [cls, setCls] = useState(profile.classLevel || 'Class 9');
  const [exam, setExam] = useState(profile.primaryExam || 'CBSE');
  const [lang, setLang] = useState(profile.language || 'English');
  const [hours, setHours] = useState(profile.dailyHours || 3);
  const [persona, setPersona] = useState(profile.persona || 'Friendly & Encouraging Mentor');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!customizeOpen) return null;

  const handleSave = () => {
    updateProfile({
      name,
      classLevel: cls,
      primaryExam: exam,
      language: lang,
      dailyHours: hours,
      persona,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setCustomizeOpen(false);
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[oklch(27%_0.03_264)] bg-[oklch(17.5%_0.025_264)] p-6 md:p-8 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-[oklch(27%_0.03_264)]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Customize StudyBot AI</h2>
              <p className="text-xs text-slate-400">Tailor your study partner, syllabus, and difficulty</p>
            </div>
          </div>
          <button
            onClick={() => setCustomizeOpen(false)}
            className="rounded-full p-2 text-muted-foreground hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 pt-4">
          {/* Scholar Name */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Your Name / Title</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[oklch(27%_0.03_264)] bg-[oklch(14%_0.02_264)] px-3.5 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-none"
              placeholder="e.g. Scholar, Aryan, Priya..."
            />
          </div>

          {/* Class Level */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-sky-400" /> Class Level
            </label>
            <div className="grid grid-cols-3 gap-2 mt-1.5">
              {classOptions.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCls(c)}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                    cls === c
                      ? 'border-purple-500 bg-purple-500/20 text-white'
                      : 'border-[oklch(27%_0.03_264)] bg-[oklch(14%_0.02_264)] text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Primary Exam */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Target Exam Goal</label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {examOptions.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setExam(e)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                    exam === e
                      ? 'border-purple-500 bg-purple-500/20 text-white font-bold'
                      : 'border-[oklch(27%_0.03_264)] bg-[oklch(14%_0.02_264)] text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {exam === e && '⭐ '}
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-lime-400" /> AI Explanations Language
            </label>
            <div className="grid grid-cols-3 gap-2 mt-1.5">
              {languages.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                    lang === l
                      ? 'border-purple-500 bg-purple-500/20 text-white'
                      : 'border-[oklch(27%_0.03_264)] bg-[oklch(14%_0.02_264)] text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {l === 'English' ? '🇬🇧 English' : l === 'Hindi' ? '🇮🇳 Hindi' : '🗣️ Hinglish'}
                </button>
              ))}
            </div>
          </div>

          {/* Tutor Persona */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-pink-400" /> Tutor Personality Style
            </label>
            <div className="space-y-2 mt-1.5">
              {personas.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPersona(p.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                    persona === p.id
                      ? 'border-purple-500 bg-purple-500/15 text-white'
                      : 'border-[oklch(27%_0.03_264)] bg-[oklch(14%_0.02_264)] text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs md:text-sm text-white">{p.name}</div>
                    <div className="text-[0.7rem] md:text-xs text-slate-400">{p.desc}</div>
                  </div>
                  {persona === p.id && <Check className="h-4 w-4 text-purple-400 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Daily Hours Goal */}
          <div>
            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-amber-400" /> Daily Target Hours
              </span>
              <span className="text-purple-400 font-bold">{hours} Hours</span>
            </div>
            <input
              type="range"
              min="1"
              max="8"
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="w-full mt-2 accent-purple-500 cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-[oklch(27%_0.03_264)]">
          <button
            type="button"
            onClick={() => setCustomizeOpen(false)}
            className="chip !py-2.5 text-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="btn-mint !text-sm"
          >
            {savedSuccess ? (
              <>
                <Check className="h-4 w-4" /> Saved!
              </>
            ) : (
              'Apply Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
