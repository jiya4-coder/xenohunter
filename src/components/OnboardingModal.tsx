import React, { useState } from 'react';
import { useStudy } from '../context/StudyContext';
import { Check, Sparkles, ArrowRight, X } from 'lucide-react';
import confetti from 'canvas-confetti';

const classOptions = [
  { v: 'Class 4', e: '🎒' },
  { v: 'Class 5', e: '✏️' },
  { v: 'Class 6', e: '🌱' },
  { v: 'Class 7', e: '🌿' },
  { v: 'Class 8', e: '🍀' },
  { v: 'Class 9', e: '📘' },
];

function getExamsForClass(cls: string): string[] {
  const num = parseInt(cls.replace(/\D/g, ''), 10);
  if (num <= 5) return ['CBSE School Exams', 'Science Olympiad (NSO)', 'Math Olympiad (IMO)', 'English Olympiad (IEO)'];
  if (num <= 8) return ['CBSE School Exams', 'Olympiad (NSO/IMO)', 'NTSE Foundation', 'Scholarship Tests'];
  return ['CBSE School Exams', 'ICSE / State Board', 'NTSE Foundation', 'Olympiad', 'JEE/NEET Foundation'];
}

const languages = [
  { v: 'English', e: '🇬🇧' },
  { v: 'Hindi', e: '🇮🇳' },
  { v: 'Hinglish', e: '🗣️' },
];

const personas = [
  { id: 'Friendly & Encouraging Mentor', label: 'Friendly Mentor', desc: 'Patient, warm, step-by-step guidance' },
  { id: 'Socratic Tutor', label: 'Socratic Tutor', desc: 'Asks guiding questions to help you figure it out' },
  { id: 'Strict Professor', label: 'Board Examiner', desc: 'Strict marking criteria, precise exam keywords' },
];

export const OnboardingModal: React.FC = () => {
  const { profile, updateProfile, onboardingOpen, setOnboardingOpen } = useStudy();
  const [step, setStep] = useState(0);

  const [selectedClass, setSelectedClass] = useState(profile.classLevel || 'Class 9');
  const [primaryGoal, setPrimaryGoal] = useState(profile.primaryExam || 'CBSE');
  const [secondaryGoals, setSecondaryGoals] = useState<string[]>(profile.secondaryExams || []);
  const [language, setLanguage] = useState(profile.language || 'English');
  const [dailyHours, setDailyHours] = useState(profile.dailyHours || 3);
  const [persona, setPersona] = useState(profile.persona || 'Friendly & Encouraging Mentor');

  if (!onboardingOpen) return null;

  const exams = getExamsForClass(selectedClass);

  const handleGoalToggle = (goal: string) => {
    if (!primaryGoal) {
      setPrimaryGoal(goal);
      return;
    }
    if (goal === primaryGoal) {
      if (secondaryGoals.length > 0) {
        setPrimaryGoal(secondaryGoals[0]);
        setSecondaryGoals(secondaryGoals.slice(1));
      }
      return;
    }
    if (secondaryGoals.includes(goal)) {
      setSecondaryGoals(secondaryGoals.filter((g) => g !== goal));
    } else {
      setSecondaryGoals([...secondaryGoals, goal]);
    }
  };

  const handleFinish = () => {
    updateProfile({
      classLevel: selectedClass,
      primaryExam: primaryGoal,
      secondaryExams: secondaryGoals,
      language,
      dailyHours,
      persona,
      onboarded: true,
    });
    try {
      confetti({ particleCount: 75, spread: 70, origin: { y: 0.6 } });
    } catch {}
    setOnboardingOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl border border-[oklch(27%_0.03_264)] bg-[oklch(17.5%_0.025_264)] p-6 md:p-8 shadow-2xl">
        {/* Close button */}
        <button
          onClick={() => setOnboardingOpen(false)}
          className="absolute top-4 right-4 rounded-full p-2 text-muted-foreground hover:bg-white/10 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i <= step ? 'bg-gradient-to-r from-purple-500 to-indigo-400' : 'bg-[oklch(22%_0.03_264)]'
                }`}
              />
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs font-bold uppercase tracking-widest text-indigo-400">
            <span>Step {step + 1} of 3</span>
            <span>StudyBot AI Setup</span>
          </div>
        </div>

        {/* Step 0: Class */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white">Which class are you in? 🎒</h2>
            <p className="text-xs md:text-sm text-slate-400">
              We personalize mock tests, syllabus, and tutor answers specifically for your level.
            </p>
            <div className="grid grid-cols-3 gap-3 pt-2">
              {classOptions.map((c) => (
                <button
                  key={c.v}
                  onClick={() => {
                    setSelectedClass(c.v);
                    const newExams = getExamsForClass(c.v);
                    setPrimaryGoal(newExams[0] || 'School Exams');
                    setSecondaryGoals([]);
                  }}
                  className={`panel !p-3 text-center transition-all hover:scale-105 ${
                    selectedClass === c.v
                      ? '!border-purple-500 shadow-[0_0_20px_rgba(124,92,250,0.4)] bg-purple-500/10'
                      : 'hover:border-purple-500/50'
                  }`}
                >
                  <div className="text-3xl mb-1">{c.e}</div>
                  <div className="font-bold text-sm md:text-base text-white">{c.v}</div>
                </button>
              ))}
            </div>
            <div className="flex justify-end pt-4">
              <button
                onClick={() => setStep(1)}
                className="btn-mint"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Target Goals */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white">What are you aiming for? 🎯</h2>
            <p className="text-xs md:text-sm text-slate-400">
              First tap = main goal <span className="text-amber-400 font-bold">⭐</span>. Tap more to add extra target exams.
            </p>
            <div className="flex flex-wrap gap-2.5 pt-2">
              {exams.map((ex) => {
                const isPrimary = ex === primaryGoal;
                const isSecondary = secondaryGoals.includes(ex);
                return (
                  <button
                    key={ex}
                    onClick={() => handleGoalToggle(ex)}
                    className={`chip !py-2.5 !px-4 text-sm transition-all ${
                      isPrimary
                        ? '!border-purple-500 !bg-purple-600/20 !text-white font-bold ring-2 ring-purple-500/40'
                        : isSecondary
                        ? '!border-indigo-400/70 !bg-indigo-900/30 !text-slate-200'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    {isPrimary && <span className="text-amber-400">⭐</span>}
                    {isSecondary && <Check className="h-3.5 w-3.5 text-indigo-400" />}
                    <span>{ex}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between pt-6 border-t border-[oklch(27%_0.03_264)]">
              <button
                onClick={() => setStep(0)}
                className="chip !py-2.5"
              >
                Back
              </button>
              <button
                onClick={() => setStep(2)}
                className="btn-mint"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Language, Hours & Persona */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white">Customize your AI study experience ⚡</h2>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Preferred Language</label>
              <div className="grid grid-cols-3 gap-2.5 mt-1.5">
                {languages.map((l) => (
                  <button
                    key={l.v}
                    onClick={() => setLanguage(l.v)}
                    className={`panel !p-2.5 text-center transition-all ${
                      language === l.v
                        ? '!border-purple-500 !bg-purple-500/15 !text-white font-bold'
                        : 'hover:border-slate-600'
                    }`}
                  >
                    <span className="mr-1.5 text-lg">{l.e}</span>
                    <span className="text-sm">{l.v}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-400">
                <span>Daily Study Goal</span>
                <span className="text-purple-400 font-bold">{dailyHours} Hours / day</span>
              </div>
              <input
                type="range"
                min="1"
                max="8"
                value={dailyHours}
                onChange={(e) => setDailyHours(Number(e.target.value))}
                className="w-full mt-2 accent-purple-500 cursor-pointer"
              />
              <div className="flex justify-between text-[0.7rem] text-slate-500 mt-1">
                <span>1h (Casual)</span>
                <span>4h (Dedicated)</span>
                <span>8h (Topper mode)</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Tutor Teaching Persona</label>
              <div className="grid grid-cols-1 gap-2 mt-1.5">
                {personas.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPersona(p.id)}
                    className={`flex items-start justify-between p-3 rounded-xl border text-left transition-all ${
                      persona === p.id
                        ? 'border-purple-500 bg-purple-500/15 text-white'
                        : 'border-[oklch(27%_0.03_264)] hover:border-slate-600 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-sm text-white">{p.label}</div>
                      <div className="text-xs text-slate-400">{p.desc}</div>
                    </div>
                    {persona === p.id && <Sparkles className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[oklch(27%_0.03_264)]">
              <button
                onClick={() => setStep(1)}
                className="chip !py-2.5"
              >
                Back
              </button>
              <button
                onClick={handleFinish}
                className="btn-mint"
              >
                Save & Start Studying <Sparkles className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
