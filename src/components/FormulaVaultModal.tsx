import React, { useState } from 'react';
import { useStudy } from '../context/StudyContext';
import { X, Search, Copy, Check, Bookmark, Sparkles } from 'lucide-react';

interface FormulaItem {
  id: string;
  subject: 'Physics' | 'Chemistry' | 'Mathematics' | 'Biology';
  title: string;
  formula: string;
  meaning: string;
  tip: string;
}

const formulaDatabase: FormulaItem[] = [
  // Physics
  {
    id: 'p1',
    subject: 'Physics',
    title: "Newton's Second Law & Momentum",
    formula: 'F = m · a = dp / dt',
    meaning: 'Force = mass × acceleration = rate of change of momentum',
    tip: 'SI unit: Newton (N). Holds for constant mass in inertial frames.',
  },
  {
    id: 'p2',
    subject: 'Physics',
    title: 'Kinematic Equations of Motion',
    formula: 'v = u + at  |  s = ut + ½at²  |  v² = u² + 2as',
    meaning: 'u: initial velocity, v: final velocity, a: acceleration, s: displacement, t: time',
    tip: 'Valid only when acceleration a is constant.',
  },
  {
    id: 'p3',
    subject: 'Physics',
    title: "Ohm's Law & Electrical Power",
    formula: 'V = I · R  |  P = V · I = I²R = V² / R',
    meaning: 'Voltage = Current × Resistance; Power in Watts',
    tip: 'Resistance depends on temperature: R = R₀(1 + αΔT).',
  },
  {
    id: 'p4',
    subject: 'Physics',
    title: 'Mirror & Lens Formula',
    formula: 'Mirror: 1/f = 1/v + 1/u  |  Lens: 1/f = 1/v - 1/u',
    meaning: 'f: focal length, v: image distance, u: object distance (Cartesian sign convention)',
    tip: 'Concave mirror focal length is negative; convex lens focal length is positive.',
  },
  {
    id: 'p5',
    subject: 'Physics',
    title: 'Work, Kinetic Energy & Potential Energy',
    formula: 'W = F · d · cos(θ)  |  KE = ½mv²  |  PE = mgh',
    meaning: 'Work-Energy Theorem: Work done by all forces equals change in kinetic energy ΔKE.',
    tip: 'Conservative forces conserve mechanical energy: KE₁ + PE₁ = KE₂ + PE₂.',
  },
  // Chemistry
  {
    id: 'c1',
    subject: 'Chemistry',
    title: 'Ideal Gas Equation',
    formula: 'P · V = n · R · T',
    meaning: 'P: pressure (atm/Pa), V: volume (L/m³), n: moles, R: gas constant, T: temperature in Kelvin',
    tip: 'R = 0.0821 L·atm/(mol·K) = 8.314 J/(mol·K). Always convert °C to Kelvin!',
  },
  {
    id: 'c2',
    subject: 'Chemistry',
    title: 'Molarity & Molality',
    formula: 'M = moles of solute / Liters of solution  |  m = moles of solute / kg of solvent',
    meaning: 'Molarity is temperature dependent; Molality is temperature independent.',
    tip: 'Dilution formula: M₁V₁ = M₂V₂.',
  },
  {
    id: 'c3',
    subject: 'Chemistry',
    title: 'pH and pOH Definition',
    formula: 'pH = -log₁₀[H⁺]  |  pOH = -log₁₀[OH⁻]  |  pH + pOH = 14 (at 25°C)',
    meaning: 'Measure of acidity/basicity on logarithmic scale',
    tip: 'For pure water at 25°C, [H⁺] = 10⁻⁷ M, so pH = 7.',
  },
  {
    id: 'c4',
    subject: 'Chemistry',
    title: 'Gibbs Free Energy & Spontaneity',
    formula: 'ΔG = ΔH - T · ΔS',
    meaning: 'ΔH: enthalpy, T: temperature (K), ΔS: entropy',
    tip: 'Reaction is spontaneous at constant T and P if ΔG < 0.',
  },
  // Mathematics
  {
    id: 'm1',
    subject: 'Mathematics',
    title: 'Quadratic Equation Roots & Discriminant',
    formula: 'x = (-b ± √(b² - 4ac)) / (2a)  |  D = b² - 4ac',
    meaning: 'D > 0: two real distinct roots; D = 0: two equal real roots; D < 0: complex roots',
    tip: 'Sum of roots α + β = -b/a, Product of roots αβ = c/a.',
  },
  {
    id: 'm2',
    subject: 'Mathematics',
    title: 'Pythagorean Trigonometric Identities',
    formula: 'sin²θ + cos²θ = 1  |  1 + tan²θ = sec²θ  |  1 + cot²θ = cosec²θ',
    meaning: 'Fundamental relations for all angles θ',
    tip: 'Double angle: sin(2θ) = 2sinθcosθ, cos(2θ) = cos²θ - sin²θ = 2cos²θ - 1.',
  },
  {
    id: 'm3',
    subject: 'Mathematics',
    title: 'Arithmetic Progression (A.P.)',
    formula: 'aₙ = a + (n - 1)d  |  Sₙ = n/2 · [2a + (n - 1)d] = n/2 · [a + l]',
    meaning: 'a: first term, d: common difference, aₙ: nth term, Sₙ: sum of first n terms',
    tip: 'Three consecutive terms in A.P. can be taken as (a - d), a, (a + d).',
  },
  {
    id: 'm4',
    subject: 'Mathematics',
    title: 'Basic Derivatives & Integrals',
    formula: 'd/dx(xⁿ) = n·xⁿ⁻¹  |  ∫ xⁿ dx = (xⁿ⁺¹)/(n+1) + C (n ≠ -1)',
    meaning: 'Power rule of calculus for differentiation and anti-differentiation',
    tip: 'd/dx(eˣ) = eˣ, d/dx(ln x) = 1/x, d/dx(sin x) = cos x, d/dx(cos x) = -sin x.',
  },
  // Biology
  {
    id: 'b1',
    subject: 'Biology',
    title: 'Cellular Respiration Reaction',
    formula: 'C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + 36–38 ATP',
    meaning: 'Glucose aerobic oxidation yielding biological energy currency ATP',
    tip: 'Glycolysis occurs in cytoplasm; Krebs cycle and oxidative phosphorylation in mitochondria.',
  },
  {
    id: 'b2',
    subject: 'Biology',
    title: 'Photosynthesis Balanced Equation',
    formula: '6CO₂ + 12H₂O + Light → C₆H₁₂O₆ + 6O₂ + 6H₂O (in Chloroplasts)',
    meaning: 'Light-dependent and light-independent (Calvin cycle) reactions',
    tip: 'Chlorophyll-a is the primary photosynthetic pigment absorbing blue & red light.',
  },
];

export const FormulaVaultModal: React.FC = () => {
  const { formulaVaultOpen, setFormulaVaultOpen } = useStudy();
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!formulaVaultOpen) return null;

  const subjects = ['All', 'Physics', 'Chemistry', 'Mathematics', 'Biology'];

  const filtered = formulaDatabase.filter((item) => {
    const matchSubject = selectedSubject === 'All' || item.subject === selectedSubject;
    const matchSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.formula.toLowerCase().includes(search.toLowerCase()) ||
      item.meaning.toLowerCase().includes(search.toLowerCase());
    return matchSubject && matchSearch;
  });

  const handleCopy = (formula: string, id: string) => {
    navigator.clipboard.writeText(formula);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-[oklch(27%_0.03_264)] bg-[oklch(17.5%_0.025_264)] shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-[oklch(27%_0.03_264)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Bookmark className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Formula & Cheat Sheet Vault <Sparkles className="h-4 w-4 text-amber-400" />
              </h2>
              <p className="text-xs text-slate-400">High-yield equations, definitions and exam mnemonics</p>
            </div>
          </div>
          <button
            onClick={() => setFormulaVaultOpen(false)}
            className="rounded-full p-2 text-muted-foreground hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="p-4 border-b border-[oklch(27%_0.03_264)] space-y-3 bg-[oklch(14%_0.02_264)]">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search formula, concept, or term (e.g. Newton, Ohm, Quadratic, ATP)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-[oklch(27%_0.03_264)] bg-[oklch(17.5%_0.025_264)] pl-10 pr-4 py-2 text-xs md:text-sm text-white focus:border-purple-500 focus:outline-none placeholder:text-slate-500"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {subjects.map((sub) => (
              <button
                key={sub}
                onClick={() => setSelectedSubject(sub)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                  selectedSubject === sub
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-[oklch(22%_0.03_264)] text-slate-300 hover:bg-[oklch(27%_0.03_264)]'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>

        {/* List of Formulas */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No formulas matched your search. Try another keyword.
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-[oklch(27%_0.03_264)] bg-[oklch(14%_0.02_264)] p-4 transition-all hover:border-purple-500/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[0.65rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        item.subject === 'Physics'
                          ? 'bg-sky-500/20 text-sky-300'
                          : item.subject === 'Chemistry'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : item.subject === 'Mathematics'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {item.subject}
                    </span>
                    <h4 className="text-sm font-bold text-white">{item.title}</h4>
                  </div>
                  <button
                    onClick={() => handleCopy(item.formula, item.id)}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    {copiedId === item.id ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Copy
                      </>
                    )}
                  </button>
                </div>

                <div className="rounded-lg bg-[oklch(11.5%_0.02_264)] border border-purple-500/30 p-2.5 font-mono text-xs md:text-sm text-purple-300 font-semibold select-all">
                  {item.formula}
                </div>

                <p className="mt-2 text-xs text-slate-300 leading-relaxed">{item.meaning}</p>
                <p className="mt-1 text-[0.7rem] text-slate-400 italic">💡 Tip: {item.tip}</p>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[oklch(27%_0.03_264)] text-center text-xs text-slate-500">
          Tip: Tap Copy to paste any formula straight into your AI Tutor or notes!
        </div>
      </div>
    </div>
  );
};
