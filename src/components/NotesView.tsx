import React, { useState, useEffect } from 'react';
import { useStudy } from '../context/StudyContext';
import {
  BookOpen,
  Sparkles,
  Copy,
  Printer,
  Bookmark,
  Volume2,
  VolumeX,
  Search,
  Trash2,
  Check,
  SlidersHorizontal,
  Layers,
  FileText,
  Lightbulb,
  AlertTriangle,
  RotateCcw,
  Plus,
  ArrowRight,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
} from 'lucide-react';
import { StudyNote, NoteType, ConceptSection, FormulaTableRow } from '../types';
import { safeFetchJson } from '../utils/api';
import { saveUserNote, getUserNotes, deleteUserNote } from '../firebase';

const noteTypesConfig: {
  id: NoteType;
  label: string;
  badge: string;
  icon: string;
  description: string;
}[] = [
  {
    id: 'executive_master',
    label: 'Executive Summary & Formula Table',
    badge: 'Recommended · All-In-One',
    icon: '📌',
    description: 'Executive summary paragraph, numbered concept definitions, and a 4-column formulas/rules table.',
  },
  {
    id: 'cornell',
    label: 'Cornell Notes',
    badge: 'Dual-Column Cues & Summary',
    icon: '📑',
    description: 'Ivy-League format with question cues on the left, notes on the right, and review synthesis below.',
  },
  {
    id: 'formula_definitions',
    label: 'Formula & Definition Vault',
    badge: 'Equations & SI Units',
    icon: '📐',
    description: 'Must-know equations, algebraic rules, SI units, variables, and common examiner traps.',
  },
  {
    id: 'summary',
    label: 'Quick Revision Sheet',
    badge: 'Rapid 5-Min Recap',
    icon: '⚡',
    description: 'High-density bullet points, mnemonics, and essential concepts for fast pre-exam review.',
  },
  {
    id: 'mindmap',
    label: 'Conceptual Flow / Mind-Map',
    badge: 'Visual Tree Hierarchy',
    icon: '🧠',
    description: 'Organized root concepts branching into sub-principles, cause-and-effect links, and relationships.',
  },
  {
    id: 'qa_revision',
    label: 'Exam Q&A Bank',
    badge: 'Expected Board Questions',
    icon: '🎯',
    description: 'Targeted short and long questions with model step-by-step scoring answers.',
  },
];

const popularTopicPresets: Record<string, string[]> = {
  Science: [
    'Force, Pressure & Friction (Class 8/9)',
    'Newton’s 3 Laws of Motion & Momentum (Class 9)',
    'Cell Structure: Plant vs Animal Organelles (Class 8/9)',
    'Acids, Bases, Indicators & Neutralization (Class 7)',
    'Photosynthesis & Plant Nutrition (Class 6/7)',
    'Combustion, Flame & Fuels (Class 8)',
  ],
  Mathematics: [
    'Linear Equations in One Variable (Class 8)',
    'Polynomials & Remainder Theorem (Class 9)',
    'Fractions, Decimals & Percentages (Class 6/7)',
    'Coordinate Geometry & Cartesian Plane (Class 9)',
    'Triangles: Congruence & Similarity Criteria (Class 9)',
    'HCF, LCM & Prime Factorization (Class 5/6)',
  ],
  'Social Science': [
    'The French Revolution: Timeline & Causes (Class 9)',
    'Our Pasts: British Rule & 1857 Revolt (Class 8)',
    'Delhi Sultanate & Mughal Architecture (Class 7)',
    'Globe: Latitudes, Longitudes & Time Zones (Class 6)',
  ],
  English: [
    'Tenses: Present, Past & Future Rules (Class 8/9)',
    'Active vs Passive Voice with Conversions (Class 8)',
    'Direct & Indirect Reported Speech (Class 9)',
    'Parts of Speech & Common Errors (Class 6/7)',
  ],
};

// Initial note matching user's exact uploaded screenshots
const initialSampleNotes: StudyNote[] = [
  {
    id: 'sample-force-pressure-friction',
    title: 'Force, Pressure & Friction — Master Study Notes',
    topic: 'Force, Pressure & Friction',
    noteType: 'executive_master',
    subject: 'Science',
    classLevel: 'Class 8/9',
    executiveSummary:
      'Force is an external push or pull arising from an interaction between objects that can change their state of motion, direction, or shape, and it generates pressure when distributed over a surface area. Friction is a self-adjusting contact force caused by microscopic surface interlocking that opposes relative motion, acting as a vital yet wear-inducing "necessary evil" in daily life.',
    conceptSections: [
      {
        number: 1,
        title: 'Force and Its Characteristics',
        points: [
          {
            term: 'Force',
            definition:
              'A push or a pull exerted on an object resulting from its interaction with another object. It has both magnitude (strength) and direction.',
          },
          {
            term: 'Net Force (F_net)',
            definition: 'The overall combined force acting on an object:',
            subPoints: [
              'If forces act in the same direction, they add up: F_net = F_1 + F_2.',
              'If forces act in opposite directions, they subtract: F_net = |F_1 - F_2|.',
              'If opposing forces are equal, F_net = 0 (Balanced forces; no change in state of motion).',
            ],
          },
          {
            term: 'Effects of Force',
            definition: 'An applied unbalanced force produces observable changes:',
            subPoints: [
              'Can change the state of motion (speed up, slow down, or stop an object).',
              'Can change the direction of motion.',
              'Can change the shape or size of an object (deformation).',
            ],
          },
        ],
      },
      {
        number: 2,
        title: 'Types of Forces',
        points: [
          {
            term: 'Contact Forces',
            definition: 'Forces that require physical contact between two interacting bodies (e.g., Muscular Force, Frictional Force, Tension).',
          },
          {
            term: 'Non-Contact (Action-at-a-Distance) Forces',
            definition: 'Forces acting without physical touch across a field (e.g., Gravitational Force, Electrostatic Force, Magnetic Force).',
          },
        ],
      },
      {
        number: 3,
        title: 'Pressure',
        points: [
          {
            term: 'Pressure',
            definition: 'The force acting perpendicularly per unit area of a surface.',
          },
          {
            term: 'Inverse Area Principle',
            definition:
              'Smaller contact area → Greater pressure (e.g., sharp knife cuts better than a blunt one; school bags have broad shoulder straps to minimize pressure).',
          },
          {
            term: 'Fluid Pressure',
            definition:
              'Liquids and gases exert pressure in all directions and equally at the same depth on the walls of their container.',
          },
          {
            term: 'Atmospheric Pressure',
            definition:
              "The pressure exerted by the weight of the air column above Earth's surface; it decreases as altitude increases.",
          },
        ],
      },
      {
        number: 4,
        title: 'Friction',
        points: [
          {
            term: 'Origin of Friction',
            definition:
              'Caused by the interlocking of microscopic irregularities (ridges and grooves) on two contacting surfaces.',
          },
          {
            term: 'Types of Friction',
            definition: 'Friction manifests in four distinct behavioral modes:',
            subPoints: [
              'Static Friction: Resists the initiation of motion (maximum value is called limiting friction).',
              'Sliding Friction: Resists motion when an object slides over a surface (slightly less than static friction).',
              'Rolling Friction: Resists motion when an object rolls over a surface (much smaller than sliding friction).',
              'Fluid Friction (Drag): Frictional force exerted by fluids (liquids and gases) on moving objects; minimized using streamlined shapes.',
            ],
          },
          {
            term: 'Methods to Change Friction',
            definition: 'Techniques used to control frictional grip:',
            subPoints: [
              'Increase: Treaded tires, spiked shoes (gymnasts/athletes), applying coarse powder to hands.',
              'Decrease: Lubricants (oil, grease, graphite), ball bearings, polishing contacting surfaces.',
            ],
          },
        ],
      },
    ],
    formulaTable: {
      columns: ['Concept / Quantity', 'Formula / Rule', 'SI Unit / Measurement', 'Key Takeaway'],
      rows: [
        {
          concept: 'Pressure (P)',
          formula: 'P = Force (F) / Area (A)',
          unit: 'Pascal (Pa) or N/m²',
          takeaway: 'Halving the area doubles the pressure for a constant force.',
        },
        {
          concept: 'Net Force (Parallel)',
          formula: 'F_net = F_1 + F_2',
          unit: 'Newton (N)',
          takeaway: 'Applied forces in the same direction reinforce each other.',
        },
        {
          concept: 'Net Force (Opposing)',
          formula: 'F_net = F_1 - F_2',
          unit: 'Newton (N)',
          takeaway: 'Acts in the direction of the larger applied force.',
        },
        {
          concept: 'Hierarchy of Friction',
          formula: 'F_static > F_sliding > F_rolling',
          unit: 'Newton (N)',
          takeaway: 'It is easier to keep a body moving than to start it from rest.',
        },
      ],
    },
    content: `## 📌 Executive Summary
Force is an external push or pull arising from an interaction between objects that can change their state of motion, direction, or shape, and it generates pressure when distributed over a surface area. Friction is a self-adjusting contact force caused by microscopic surface interlocking that opposes relative motion, acting as a vital yet wear-inducing "necessary evil" in daily life.

---

## 🧠 Key Definitions & Concepts

### 1. Force and Its Characteristics
- **Force**: A push or a pull exerted on an object resulting from its interaction with another object. It has both **magnitude** (strength) and **direction**.
- **Net Force ($F_{net}$)**:
  - If forces act in the **same direction**, they add up: $F_{net} = F_1 + F_2$.
  - If forces act in **opposite directions**, they subtract: $F_{net} = |F_1 - F_2|$.
  - If opposing forces are equal, $F_{net} = 0$ (Balanced forces; no change in state of motion).
- **Effects of Force**:
  - Can change the state of motion (speed up, slow down, or stop an object).
  - Can change the direction of motion.
  - Can change the shape or size of an object (deformation).

### 2. Types of Forces
- **Contact Forces**: Muscular force, Frictional force.
- **Non-Contact Forces**: Gravitational force, Electrostatic force, Magnetic force.

### 3. Pressure
- **Pressure**: The force acting perpendicularly per unit area of a surface.
- **Inverse Area Principle**: Smaller contact area $\\rightarrow$ Greater pressure (e.g., sharp knife cuts better than a blunt one).
- **Fluid Pressure**: Liquids and gases exert pressure in all directions and equally at the same depth on the walls of their container.
- **Atmospheric Pressure**: The pressure exerted by the weight of the air column above Earth's surface; it decreases as altitude increases.

### 4. Friction
- **Origin of Friction**: Caused by the interlocking of microscopic irregularities (ridges and grooves) on two contacting surfaces.
- **Types of Friction**:
  - *Static Friction*: Resists the initiation of motion (maximum value is called limiting friction).
  - *Sliding Friction*: Resists motion when an object slides over a surface (slightly less than static friction).
  - *Rolling Friction*: Resists motion when an object rolls over a surface (much smaller than sliding friction).
  - *Fluid Friction (Drag)*: Frictional force exerted by fluids (liquids and gases) on moving objects; minimized using streamlined shapes.
- *Methods to change friction*:
  - *Increase*: Treaded tires, spiked shoes (athletes), rough surfaces.
  - *Decrease*: Lubricants (oil, grease, graphite), ball bearings, polishing surfaces.

---

## 📐 Important Formulas / Rules / Dates

| Concept / Quantity | Formula / Rule | SI Unit / Measurement | Key Takeaway |
| :--- | :--- | :--- | :--- |
| **Pressure ($P$)** | $P = \\frac{\\text{Force }(F)}{\\text{Area }(A)}$ | Pascal ($\\text{Pa}$) or $\\text{N/m}^2$ | Halving the area doubles the pressure for a constant force. |
| **Net Force (Parallel)** | $F_{net} = F_1 + F_2$ | Newton ($\\text{N}$) | Applied forces in the same direction reinforce each other. |
| **Net Force (Opposing)** | $F_{net} = F_1 - F_2$ | Newton ($\\text{N}$) | Acts in the direction of the larger applied force. |
| **Hierarchy of Friction** | $F_{\\text{static}} > F_{\\text{sliding}} > F_{\\text{rolling}}$ | Newton ($\\text{N}$) | It is easier to keep a body moving than to start it from rest. |`,
    keyTakeaways: [
      'Force has both magnitude and direction (vector quantity)',
      'Pressure is inversely proportional to surface contact area (P = F / A)',
      'Friction originates from microscopic irregularities; Rolling friction < Sliding friction < Static friction',
    ],
    examTips: [
      'Always specify units: Newtons (N) for force, Pascals (Pa or N/m²) for pressure',
      'Explain broad shoulder straps on school bags: larger area distributes weight, reducing pressure on shoulders',
    ],
    tags: ['Physics', 'Science', 'Class 8', 'Class 9', 'Force'],
    createdAt: new Date().toISOString(),
  },
];

// Helper to clean math notations for beautiful readable display
function cleanMathText(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 / $2')
    .replace(/\$\\text\{([^}]+)\}\$/g, '$1')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\$\\rightarrow\$/g, '→')
    .replace(/\\rightarrow/g, '→')
    .replace(/\$F_\{?net\}?\$/g, 'F_net')
    .replace(/\$P\$/g, 'P')
    .replace(/\$([a-zA-Z0-9_\-\\+\\*/|()= ]+)\$/g, '$1')
    .replace(/\\\\implies/g, '⟹')
    .trim();
}

export const NotesView: React.FC = () => {
  const { profile, currentUser, addStudyMinutes, addStars } = useStudy();

  // Generator form state
  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState<'Science' | 'Mathematics' | 'Social Science' | 'English'>('Science');
  const [noteType, setNoteType] = useState<NoteType>('executive_master');
  const [detailLevel, setDetailLevel] = useState<'concise' | 'standard' | 'deep_dive'>('standard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active viewing state
  const [currentNote, setCurrentNote] = useState<StudyNote>(initialSampleNotes[0]);
  const [savedNotes, setSavedNotes] = useState<StudyNote[]>(() => {
    try {
      const stored = localStorage.getItem('studybot_saved_notes');
      return stored ? JSON.parse(stored) : initialSampleNotes;
    } catch {
      return initialSampleNotes;
    }
  });

  // UI modes
  const [activeTab, setActiveTab] = useState<'viewer' | 'create' | 'library'>('viewer');
  const [hideNotesForRecall, setHideNotesForRecall] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState<string>('All');

  // Load from Firestore if authenticated
  useEffect(() => {
    getUserNotes()
      .then((remoteNotes: any) => {
        if (remoteNotes && remoteNotes.length > 0) {
          setSavedNotes(remoteNotes);
        }
      })
      .catch(() => {});
  }, [currentUser]);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem('studybot_saved_notes', JSON.stringify(savedNotes));
    } catch {}
  }, [savedNotes]);

  // Clean up speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleGenerateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await safeFetchJson<StudyNote>(
        '/api/generate-notes',
        {
          method: 'POST',
          body: JSON.stringify({
            topic: topic.trim(),
            noteType,
            subject,
            detailLevel,
            studentProfile: profile,
          }),
        },
        initialSampleNotes[0]
      );

      setCurrentNote(response);
      setActiveTab('viewer');
      addStudyMinutes(5);
      addStars(15);

      // Auto save to collection
      const updated = [response, ...savedNotes.filter((n) => n.id !== response.id)];
      setSavedNotes(updated);

      if (currentUser?.uid) {
        saveUserNote(currentUser.uid, response);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Could not generate notes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!currentNote) return;
    const textToCopy = `# ${currentNote.title} (${currentNote.subject} · ${currentNote.classLevel})\n\n${currentNote.content}\n\n## Key Takeaways:\n${currentNote.keyTakeaways.map((t) => `- ${t}`).join('\n')}\n\n## Exam Tips:\n${currentNote.examTips.map((t) => `- ${t}`).join('\n')}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleToggleSpeak = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const cleanText = `${currentNote.title}. ${currentNote.executiveSummary || currentNote.content.replace(/#|\*|_|-/g, '')}.`;
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const handleDeleteNote = (noteId: string) => {
    const updated = savedNotes.filter((n) => n.id !== noteId);
    setSavedNotes(updated);
    if (currentUser?.uid) {
      deleteUserNote(currentUser.uid, noteId);
    }
    if (currentNote.id === noteId && updated.length > 0) {
      setCurrentNote(updated[0]);
    }
  };

  const filteredLibrary = savedNotes.filter((n) => {
    const matchQuery =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchSub = filterSubject === 'All' || n.subject === filterSubject;
    return matchQuery && matchSub;
  });

  // Parse markdown tables from string if formulaTable object is not present
  const renderParsedContent = () => {
    // If the note has structured executiveSummary & conceptSections, render high-fidelity UI matching screenshot
    if (currentNote.executiveSummary || currentNote.conceptSections || currentNote.formulaTable) {
      return (
        <div className="space-y-7 text-slate-100">
          {/* 1. 📌 Executive Summary */}
          {currentNote.executiveSummary && (
            <div className="space-y-3">
              <h2 className="text-base md:text-lg font-bold text-sky-400 flex items-center gap-2">
                <span>📌 Executive Summary</span>
              </h2>
              <p className="text-xs md:text-sm text-slate-200 leading-relaxed font-normal">
                {currentNote.executiveSummary}
              </p>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-slate-800/80 my-6" />

          {/* 2. 🧠 Key Definitions & Concepts */}
          <div className="space-y-6">
            <h2 className="text-base md:text-lg font-bold text-sky-400 flex items-center gap-2">
              <span>🧠 Key Definitions & Concepts</span>
            </h2>

            {currentNote.conceptSections && currentNote.conceptSections.length > 0 ? (
              <div className="space-y-6">
                {currentNote.conceptSections.map((sec, secIdx) => (
                  <div key={secIdx} className="space-y-3">
                    <h3 className="text-sm md:text-base font-bold text-sky-400">
                      {sec.number}. {sec.title}
                    </h3>
                    <div className="space-y-2 pl-2">
                      {sec.points.map((pt, ptIdx) => (
                        <div key={ptIdx} className="text-xs md:text-sm text-slate-200 leading-relaxed">
                          <div className="flex items-start gap-2">
                            <span className="text-slate-400 font-bold">•</span>
                            <div>
                              <strong className="text-white font-bold">{cleanMathText(pt.term)}: </strong>
                              <span>{cleanMathText(pt.definition)}</span>
                            </div>
                          </div>

                          {pt.subPoints && pt.subPoints.length > 0 && (
                            <div className="mt-1.5 pl-6 space-y-1">
                              {pt.subPoints.map((sp, spIdx) => (
                                <div key={spIdx} className="flex items-start gap-2 text-slate-300">
                                  <span className="text-slate-500">•</span>
                                  <span>{cleanMathText(sp)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Fallback to clean markdown lines */
              <div className="text-xs md:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                {cleanMathText(currentNote.content)}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-slate-800/80 my-6" />

          {/* 3. 📐 Important Formulas / Rules / Dates (4-column Table) */}
          <div className="space-y-4">
            <h2 className="text-base md:text-lg font-bold text-sky-400 flex items-center gap-2">
              <span>📐 Important Formulas / Rules / Dates</span>
            </h2>

            {currentNote.formulaTable && currentNote.formulaTable.rows.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-slate-800 shadow-2xl">
                <table className="w-full text-left text-xs md:text-sm border-collapse">
                  <thead>
                    <tr className="bg-[#0b1c38] text-sky-400 font-bold border-b border-slate-800">
                      <th className="p-3.5 border-r border-slate-800">Concept / Quantity</th>
                      <th className="p-3.5 border-r border-slate-800">Formula / Rule</th>
                      <th className="p-3.5 border-r border-slate-800">SI Unit / Measurement</th>
                      <th className="p-3.5">Key Takeaway</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-[#070b16]">
                    {currentNote.formulaTable.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-[#0c162d] transition-colors">
                        <td className="p-3.5 font-bold text-white border-r border-slate-800">
                          {cleanMathText(row.concept)}
                        </td>
                        <td className="p-3.5 font-mono text-blue-300 border-r border-slate-800 font-semibold">
                          {cleanMathText(row.formula)}
                        </td>
                        <td className="p-3.5 text-slate-300 border-r border-slate-800">
                          {cleanMathText(row.unit)}
                        </td>
                        <td className="p-3.5 text-slate-300">
                          {cleanMathText(row.takeaway)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </div>
      );
    }

    // Default clean markdown view
    return (
      <div className="text-xs md:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
        {cleanMathText(currentNote.content)}
      </div>
    );
  };

  return (
    <div className="h-[calc(100vh-2.5rem)] overflow-y-auto bg-[#07090e] p-4 md:p-8 font-['Sora'] text-slate-100 select-none">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-500/10 border border-blue-500/30 px-3 py-0.5 text-xs font-bold text-blue-400 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" /> AI STUDY NOTEBOOK
              </span>
              <span className="text-xs text-slate-400 font-semibold">
                {profile.classLevel} · {profile.primaryExam} Syllabus
              </span>
            </div>
            <h1 className="mt-1.5 text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Smart Notes Generator
            </h1>
            <p className="text-xs md:text-sm text-slate-400">
              Executive summaries, numbered definitions, and 4-column formula & rules tables.
            </p>
          </div>

          {/* Navigation Pill Switches */}
          <div className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-[#0d1222] p-1.5 shadow-xl">
            <button
              type="button"
              onClick={() => setActiveTab('viewer')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === 'viewer'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Active Note</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('create')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === 'create'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Note</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('library')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === 'library'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Notebook ({savedNotes.length})</span>
            </button>
          </div>
        </div>

        {/* 1. Note Viewer Mode (Active Note) */}
        {activeTab === 'viewer' && currentNote && (
          <div className="space-y-5 animate-in fade-in">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0d1222] p-4 shadow-xl">
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {noteTypesConfig.find((c) => c.id === currentNote.noteType)?.icon || '📌'}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[0.68rem] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                      {currentNote.subject}
                    </span>
                    <span className="text-xs text-slate-400">
                      {currentNote.classLevel} · {currentNote.noteType.toUpperCase().replace('_', ' ')}
                    </span>
                  </div>
                  <h2 className="text-lg md:text-xl font-bold text-white mt-0.5">{currentNote.title}</h2>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleToggleSpeak}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
                    isSpeaking
                      ? 'border-blue-500 bg-blue-600 text-white animate-pulse'
                      : 'border-white/10 bg-[#12182b] text-slate-300 hover:text-white'
                  }`}
                  title="Listen to notes read aloud"
                >
                  {isSpeaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                  <span>{isSpeaking ? 'Stop Audio' : 'Read Aloud'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#12182b] px-3 py-2 text-xs font-bold text-slate-300 hover:text-white transition-colors"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#12182b] px-3 py-2 text-xs font-bold text-slate-300 hover:text-white transition-colors"
                  title="Print or export as PDF"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print / PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('create')}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-500 shadow-md transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>New Note</span>
                </button>
              </div>
            </div>

            {/* Main Note Sheet (Matching User Screenshot Aesthetics) */}
            <div className="rounded-3xl border border-slate-800 bg-[#080d1a] p-6 md:p-10 shadow-2xl space-y-6">
              {renderParsedContent()}

              {/* Extra Exam Takeaways & Tips */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800/80">
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" /> Key Takeaways
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {currentNote.keyTakeaways.map((k, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-emerald-400 font-bold">✓</span>
                        <span>{cleanMathText(k)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" /> Board Examiner Tips
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {currentNote.examTips.map((t, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-amber-400 font-bold">💡</span>
                        <span>{cleanMathText(t)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Create Note Mode */}
        {activeTab === 'create' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Form */}
            <div className="lg:col-span-2 rounded-3xl border border-white/10 bg-[#0d1222] p-6 md:p-8 shadow-2xl space-y-6">
              <div className="flex items-center gap-2.5 text-white font-bold text-base border-b border-white/10 pb-4">
                <SlidersHorizontal className="h-5 w-5 text-blue-400" />
                <span>Configure Your AI Study Note</span>
              </div>

              <form onSubmit={handleGenerateNote} className="space-y-6">
                {/* 1. Subject Selector */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-2">
                    1. Select Subject
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {(['Science', 'Mathematics', 'Social Science', 'English'] as const).map((sub) => (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => {
                          setSubject(sub);
                          setTopic(popularTopicPresets[sub][0] || '');
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

                {/* 2. Topic Input */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      2. Chapter / Topic Name
                    </label>
                    <span className="text-[0.68rem] text-blue-400">Class 4th to 9th strictly</span>
                  </div>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Force, Pressure & Friction, Linear Equations, Light & Optics..."
                    className="w-full rounded-2xl border border-white/10 bg-[#080c18] px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none transition-all shadow-inner"
                    required
                  />

                  {/* Popular chips */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="text-[0.68rem] text-slate-500 self-center">Suggestions:</span>
                    {(popularTopicPresets[subject] || []).slice(0, 4).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setTopic(p)}
                        className="rounded-lg border border-white/5 bg-[#12182b] px-2.5 py-1 text-[0.68rem] text-slate-300 hover:border-blue-500/50 hover:text-white transition-colors"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Note Type Selector */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-2">
                    3. Select Note Format / Type
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {noteTypesConfig.map((cfg) => {
                      const isSelected = noteType === cfg.id;
                      return (
                        <div
                          key={cfg.id}
                          onClick={() => setNoteType(cfg.id)}
                          className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-600/15 shadow-[0_0_20px_rgba(37,99,235,0.25)] ring-1 ring-blue-500'
                              : 'border-white/10 bg-[#080c18] hover:border-slate-600 hover:bg-[#0c1224]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <span className="text-xl">{cfg.icon}</span>
                              <span className="font-bold text-white text-sm">{cfg.label}</span>
                            </div>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[0.62rem] font-bold ${
                                isSelected ? 'bg-blue-500 text-white' : 'bg-white/5 text-slate-400'
                              }`}
                            >
                              {cfg.badge}
                            </span>
                          </div>
                          <p className="mt-2 text-[0.72rem] text-slate-400 leading-relaxed">
                            {cfg.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Detail Level */}
                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#080c18] p-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white">Detail Depth</h4>
                    <p className="text-[0.7rem] text-slate-400">Choose how comprehensive the notes should be</p>
                  </div>
                  <div className="flex gap-2">
                    {(['concise', 'standard', 'deep_dive'] as const).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setDetailLevel(lvl)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold capitalize transition-all ${
                          detailLevel === lvl
                            ? 'bg-blue-600 text-white'
                            : 'bg-[#12182b] text-slate-400 hover:text-white'
                        }`}
                      >
                        {lvl.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 py-4 text-sm font-bold text-white shadow-[0_0_25px_rgba(37,99,235,0.4)] hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2.5 active:scale-[0.99]"
                >
                  {loading ? (
                    <>
                      <RotateCcw className="h-5 w-5 animate-spin" />
                      <span>Synthesizing Executive Notes with Formulas...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      <span>Generate {noteTypesConfig.find((c) => c.id === noteType)?.label} Note</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Right Col: Quick Library Preview */}
            <div className="space-y-4">
              <div className="rounded-3xl border border-white/10 bg-[#0d1222] p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Bookmark className="h-4 w-4 text-blue-400" />
                    <span>Recent Notes ({savedNotes.length})</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('library')}
                    className="text-[0.68rem] text-blue-400 hover:underline"
                  >
                    View All →
                  </button>
                </div>

                <div className="space-y-2.5">
                  {savedNotes.slice(0, 4).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        setCurrentNote(n);
                        setActiveTab('viewer');
                      }}
                      className="cursor-pointer rounded-2xl border border-white/5 bg-[#080c18] p-3 hover:border-blue-500/40 hover:bg-[#0c1224] transition-all space-y-1.5 group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[0.65rem] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
                          {n.subject}
                        </span>
                        <span className="text-[0.62rem] text-slate-500 capitalize">{n.noteType.replace('_', ' ')}</span>
                      </div>
                      <h4 className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors line-clamp-1">
                        {n.title}
                      </h4>
                      <p className="text-[0.68rem] text-slate-400 line-clamp-2">
                        {n.executiveSummary || n.keyTakeaways[0] || n.topic}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Format Guide Card */}
              <div className="rounded-3xl border border-sky-500/20 bg-sky-500/5 p-5 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-sky-400 font-bold">
                  <Lightbulb className="h-4 w-4" />
                  <span>3-Part Note Architecture</span>
                </div>
                <p className="text-slate-300 text-[0.72rem] leading-relaxed">
                  Every note includes:
                  <br />
                  1. <strong>📌 Executive Summary</strong> for instant big-picture comprehension.
                  <br />
                  2. <strong>🧠 Key Definitions</strong> with numbered subheadings & bullet points.
                  <br />
                  3. <strong>📐 4-Column Table</strong> with quantity, formula, SI unit, and takeaway!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 3. Library Mode */}
        {activeTab === 'library' && (
          <div className="space-y-6 animate-in fade-in">
            {/* Search & Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-[#0d1222] p-4 shadow-xl">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search notes by chapter, formula, or keywords..."
                  className="w-full rounded-2xl border border-white/10 bg-[#080c18] pl-10 pr-4 py-2.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Subject Filter Pills */}
              <div className="flex items-center gap-1.5">
                {(['All', 'Science', 'Mathematics', 'Social Science', 'English'] as const).map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setFilterSubject(sub)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                      filterSubject === sub
                        ? 'bg-blue-600 text-white'
                        : 'border border-white/5 bg-[#12182b] text-slate-400 hover:text-white'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid of Notes */}
            {filteredLibrary.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-[#0d1222] p-12 text-center space-y-3">
                <BookOpen className="h-10 w-10 text-slate-500 mx-auto" />
                <h3 className="text-base font-bold text-white">No Notes Found</h3>
                <p className="text-xs text-slate-400">
                  Try adjusting your search query or generate a new note from the Create tab.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('create')}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500"
                >
                  Create New Note Now
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredLibrary.map((n) => (
                  <div
                    key={n.id}
                    className="flex flex-col justify-between rounded-3xl border border-white/10 bg-[#0d1222] p-5 shadow-xl hover:border-blue-500/40 transition-all group space-y-4"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-blue-500/15 border border-blue-500/30 px-2.5 py-0.5 text-[0.65rem] font-bold text-blue-400 uppercase">
                          {n.subject}
                        </span>
                        <span className="text-[0.62rem] text-slate-500 font-semibold capitalize">
                          {n.noteType.replace('_', ' ')}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors line-clamp-1">
                        {n.title}
                      </h3>

                      <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                        {n.executiveSummary || n.keyTakeaways?.[0] || n.content.slice(0, 120)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/10 pt-3 text-xs">
                      <span className="text-[0.65rem] text-slate-500 font-mono">
                        {new Date(n.createdAt).toLocaleDateString()}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(n.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete Note"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentNote(n);
                            setActiveTab('viewer');
                          }}
                          className="flex items-center gap-1 rounded-xl bg-blue-600/30 border border-blue-500/40 px-3 py-1 text-xs font-bold text-blue-300 hover:bg-blue-600 hover:text-white transition-all"
                        >
                          <span>Open</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
