import React, { useState, useEffect, useRef } from 'react';
import { useStudy } from '../context/StudyContext';
import {
  BookOpen,
  Sparkles,
  Copy,
  Printer,
  Volume2,
  VolumeX,
  Search,
  Trash2,
  Check,
  FileText,
  AlertTriangle,
  RotateCcw,
  Plus,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Calculator,
  Globe,
  FlaskConical,
  Zap,
  Target,
  ChevronDown,
  ChevronRight,
  Folder,
  Sun,
  User,
  Clock,
} from 'lucide-react';
import { StudyNote, NoteType } from '../types';
import { safeFetchJson } from '../utils/api';
import { saveUserNote, getUserNotes, deleteUserNote } from '../firebase';
import { getUserItem, setUserItem } from '../utils/userStorage';

type SubjectId = 'Mathematics' | 'Hindi' | 'English' | 'Social Science' | 'Science';

const SUBJECT_CARDS: {
  id: SubjectId;
  label: string;
  cardBg: string;
  cardBorder: string;
  activeBg: string;
  activeBorder: string;
  activeShadow: string;
  iconBg: string;
  iconType: 'math' | 'hindi' | 'english' | 'social' | 'science';
}[] = [
  {
    id: 'Mathematics',
    label: 'Mathematics',
    cardBg: 'bg-[#122244]/80',
    cardBorder: 'border-[#25447d]',
    activeBg: 'bg-gradient-to-b from-[#1d3f8a] via-[#16306b] to-[#10234f]',
    activeBorder: 'border-[#3b82f6]',
    activeShadow: 'shadow-[0_0_28px_rgba(59,130,246,0.42)]',
    iconBg: 'bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8]',
    iconType: 'math',
  },
  {
    id: 'Hindi',
    label: 'Hindi',
    cardBg: 'bg-[#241940]/85',
    cardBorder: 'border-[#3b2866]',
    activeBg: 'bg-gradient-to-b from-[#392569] via-[#2b1c50] to-[#1d1238]',
    activeBorder: 'border-[#a855f7]',
    activeShadow: 'shadow-[0_0_25px_rgba(168,85,247,0.38)]',
    iconBg: 'bg-gradient-to-br from-[#a855f7] to-[#7e22ce]',
    iconType: 'hindi',
  },
  {
    id: 'English',
    label: 'English',
    cardBg: 'bg-[#2e211b]/85',
    cardBorder: 'border-[#4d3529]',
    activeBg: 'bg-gradient-to-b from-[#4a3227] via-[#38251d] to-[#261914]',
    activeBorder: 'border-[#f97316]',
    activeShadow: 'shadow-[0_0_25px_rgba(249,115,22,0.38)]',
    iconBg: 'bg-gradient-to-br from-[#f97316] to-[#ea580c]',
    iconType: 'english',
  },
  {
    id: 'Social Science',
    label: 'Social Science',
    cardBg: 'bg-[#0e2e2b]/85',
    cardBorder: 'border-[#194e48]',
    activeBg: 'bg-gradient-to-b from-[#144741] via-[#103632] to-[#0b2623]',
    activeBorder: 'border-[#10b981]',
    activeShadow: 'shadow-[0_0_25px_rgba(16,185,129,0.38)]',
    iconBg: 'bg-gradient-to-br from-[#10b981] to-[#059669]',
    iconType: 'social',
  },
  {
    id: 'Science',
    label: 'Science',
    cardBg: 'bg-[#0d2c3a]/85',
    cardBorder: 'border-[#174b61]',
    activeBg: 'bg-gradient-to-b from-[#134257] via-[#0f3344] to-[#0b2430]',
    activeBorder: 'border-[#06b6d4]',
    activeShadow: 'shadow-[0_0_25px_rgba(6,182,212,0.38)]',
    iconBg: 'bg-gradient-to-br from-[#06b6d4] to-[#0891b2]',
    iconType: 'science',
  },
];

const POPULAR_TOPICS: Record<SubjectId, string[]> = {
  Mathematics: ['Algebra', 'Geometry', 'Trigonometry', 'Mensuration', 'Statistics', 'Number System'],
  Hindi: ['संधि और समास', 'अलंकार', 'मुहावरे और लोकोक्तियाँ', 'उपसर्ग और प्रत्यय', 'पत्र लेखन', 'संज्ञा और सर्वनाम'],
  English: ['Tenses', 'Active & Passive Voice', 'Direct & Indirect Speech', 'Modals', 'Parts of Speech', 'Figures of Speech'],
  'Social Science': [
    'The French Revolution',
    'The Great Depression',
    'Indian Constitution',
    '1857 Revolt',
    'Drainage & Rivers',
    'Democracy & Rights',
  ],
  Science: [
    'Cell - The Unit of Life',
    'Force & Laws of Motion',
    'Acids, Bases & Salts',
    'Light - Reflection & Refraction',
    'Photosynthesis',
    'Atoms & Molecules',
  ],
};

const DROPDOWN_TOPICS: Record<SubjectId, string[]> = {
  Mathematics: [
    'Quadratic Equations',
    'Algebra — Linear & Quadratic Equations',
    'Geometry — Lines, Angles & Triangles',
    'Trigonometry — Ratios & Identities',
    'Mensuration — Surface Area & Volume',
    'Statistics & Probability',
    'Number System & Real Numbers',
    'Polynomials & Factorisation',
  ],
  Hindi: [
    'संधि और समास (Sandhi & Samas)',
    'अलंकार — शब्दालंकार और अर्थालंकार',
    'मुहावरे और लोकोक्तियाँ (Idioms & Proverbs)',
    'उपसर्ग और प्रत्यय (Prefixes & Suffixes)',
    'पत्र लेखन और अनुच्छेद लेखन',
    'संज्ञा, सर्वनाम, विशेषण और क्रिया',
  ],
  English: [
    'Tenses',
    'Active and Passive Voice Conversion',
    'Direct and Indirect (Reported) Speech',
    'Subject-Verb Agreement & Modals',
    'Parts of Speech & Determiners',
    'Figures of Speech & Poetic Devices',
  ],
  'Social Science': [
    'The Great Depression',
    'The French Revolution — Timeline & Impact',
    'Making of the Indian Constitution',
    'Revolt of 1857 & Indian Freedom Struggle',
    'India — Size, Location & Physical Features',
    'Drainage System & Monsoon Climate of India',
  ],
  Science: [
    'Cell - The Unit of Life',
    'Force, Pressure & Newton’s Laws of Motion',
    'Acids, Bases, Salts & pH Scale',
    'Light — Reflection, Refraction & Lenses',
    'Photosynthesis & Nutrition in Plants',
    'Atoms, Molecules & Structure of Atom',
  ],
};

interface NoteDepthOption {
  id: 'concise' | 'standard' | 'deep_dive';
  title: string;
  description: string;
  badgeText: string;
  noteType: NoteType;
  icon: 'zap' | 'doc' | 'target';
}

const NOTE_DEPTH_OPTIONS: NoteDepthOption[] = [
  {
    id: 'concise',
    title: 'Concise Notes',
    description: 'Quick and easy notes for fast revision.',
    badgeText: 'Best for quick revision',
    noteType: 'summary',
    icon: 'zap',
  },
  {
    id: 'standard',
    title: 'Standard Notes',
    description: 'Balanced notes with key concepts and examples.',
    badgeText: 'Most Popular',
    noteType: 'executive_master',
    icon: 'doc',
  },
  {
    id: 'deep_dive',
    title: 'Deep Dive Notes',
    description: 'Detailed notes with in-depth explanations, examples and practice questions.',
    badgeText: 'Best for concept clarity',
    noteType: 'detailed_chapter',
    icon: 'target',
  },
];

const NOTEBOOK_CONFIG: {
  subject: SubjectId;
  title: string;
  folderColor: string;
  defaultSubtitle: string;
}[] = [
  {
    subject: 'Mathematics',
    title: 'Maths Notebook',
    folderColor: 'text-[#3b82f6] fill-[#3b82f6]',
    defaultSubtitle: '12 notes · Last updated 2 days ago',
  },
  {
    subject: 'Science',
    title: 'Science Notebook',
    folderColor: 'text-[#2dd4bf] fill-[#2dd4bf]',
    defaultSubtitle: '8 notes · Last updated 4 days ago',
  },
  {
    subject: 'English',
    title: 'English Notebook',
    folderColor: 'text-[#fbbf24] fill-[#fbbf24]',
    defaultSubtitle: '5 notes · Last updated 6 days ago',
  },
  {
    subject: 'Social Science',
    title: 'Social Science Notebook',
    folderColor: 'text-[#a855f7] fill-[#a855f7]',
    defaultSubtitle: '3 notes · Last updated 1 week ago',
  },
  {
    subject: 'Hindi',
    title: 'Hindi Notebook',
    folderColor: 'text-[#f472b6] fill-[#f472b6]',
    defaultSubtitle: '4 notes · Last updated 1 week ago',
  },
];

// Default featured notes matching the screenshot's Recent Notes section
const DEFAULT_RECENT_NOTES: (StudyNote & { depthLabel: string; relativeTimeLabel: string })[] = [
  {
    id: 'preset-quadratic-equations',
    title: 'Quadratic Equations (Maths)',
    topic: 'Quadratic Equations',
    noteType: 'executive_master',
    subject: 'Mathematics',
    classLevel: 'Class 9',
    depthLabel: 'Standard',
    relativeTimeLabel: '2 days ago',
    executiveSummary:
      'A quadratic equation in the variable x is an equation of the form ax² + bx + c = 0, where a, b, c are real numbers and a ≠ 0. Its roots can be found by factorisation, completing the square, or using the quadratic formula.',
    conceptSections: [
      {
        number: 1,
        title: 'Standard Form & Roots',
        points: [
          {
            term: 'Standard Quadratic Equation',
            definition: 'ax² + bx + c = 0, where a ≠ 0.',
            subPoints: [
              'A real number α is called a root if aα² + bα + c = 0.',
              'A quadratic equation has at most two roots.',
            ],
          },
          {
            term: 'Discriminant (D)',
            definition: 'D = b² - 4ac determines the nature of the roots.',
            subPoints: [
              'If D > 0: Two distinct real roots.',
              'If D = 0: Two equal real roots.',
              'If D < 0: No real roots.',
            ],
          },
        ],
      },
    ],
    formulaTable: {
      columns: ['Concept / Quantity', 'Formula / Rule', 'Condition', 'Key Takeaway'],
      rows: [
        {
          concept: 'Quadratic Formula',
          formula: 'x = (-b ± √(b² - 4ac)) / 2a',
          unit: 'a ≠ 0',
          takeaway: 'Finds roots of any quadratic equation directly.',
        },
        {
          concept: 'Sum of Roots (α + β)',
          formula: '-b / a',
          unit: 'Coefficient ratio',
          takeaway: 'Relates linear coefficient to roots.',
        },
        {
          concept: 'Product of Roots (α · β)',
          formula: 'c / a',
          unit: 'Constant ratio',
          takeaway: 'Relates constant term to roots.',
        },
      ],
    },
    content: 'Quadratic Equations structured study notes.',
    keyTakeaways: [
      'Always write the equation in standard form ax² + bx + c = 0 before identifying a, b, and c.',
      'Check the discriminant D = b² - 4ac first to quickly know whether real roots exist.',
    ],
    examTips: [
      'State the formula clearly before substituting numbers to secure step marks.',
      'In word problems, reject negative roots when the variable represents length, time, or speed.',
    ],
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'preset-cell-unit-of-life',
    title: 'Cell - The Unit of Life (Science)',
    topic: 'Cell - The Unit of Life',
    noteType: 'summary',
    subject: 'Science',
    classLevel: 'Class 9',
    depthLabel: 'Concise',
    relativeTimeLabel: '3 days ago',
    executiveSummary:
      'The cell is the fundamental structural and functional unit of all living organisms. Discovered by Robert Hooke in 1665, cells are classified into Prokaryotic (lacking a true nucleus) and Eukaryotic (possessing a membrane-bound nucleus and organelles).',
    conceptSections: [
      {
        number: 1,
        title: 'Major Cell Organelles',
        points: [
          {
            term: 'Nucleus',
            definition: 'Brain of the cell containing chromosomes and DNA that control heredity and cellular activities.',
          },
          {
            term: 'Mitochondria',
            definition: 'Powerhouse of the cell; synthesizes energy in the form of ATP (Adenosine Triphosphate).',
          },
          {
            term: 'Plastids & Cell Wall',
            definition: 'Present only in plant cells; chloroplasts contain chlorophyll for photosynthesis.',
          },
        ],
      },
    ],
    formulaTable: {
      columns: ['Organelle', 'Key Function', 'Found In', 'Key Takeaway'],
      rows: [
        {
          concept: 'Mitochondria',
          formula: 'ATP Synthesis',
          unit: 'Plant & Animal Cells',
          takeaway: 'Has its own DNA and ribosomes.',
        },
        {
          concept: 'Lysosomes',
          formula: 'Digestive Enzymes',
          unit: 'Eukaryotic Cells',
          takeaway: 'Known as suicide bags of the cell.',
        },
        {
          concept: 'Ribosomes',
          formula: 'Protein Synthesis',
          unit: 'All Living Cells',
          takeaway: 'Non-membrane bound organelle.',
        },
      ],
    },
    content: 'Cell - The Unit of Life concise notes.',
    keyTakeaways: [
      'Plasma membrane is selectively permeable and regulates entry/exit via diffusion and osmosis.',
      'Plant cells have a rigid cellulose cell wall and large central vacuole, unlike animal cells.',
    ],
    examTips: [
      'Draw a neat labelled diagram when comparing Plant and Animal cells.',
      'Remember why Mitochondria and Plastids are called semi-autonomous organelles.',
    ],
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 'preset-great-depression',
    title: 'The Great Depression (Social Science)',
    topic: 'The Great Depression',
    noteType: 'detailed_chapter',
    subject: 'Social Science',
    classLevel: 'Class 9',
    depthLabel: 'Deep Dive',
    relativeTimeLabel: '5 days ago',
    executiveSummary:
      'The Great Depression began around 1929 and lasted till the mid-1930s. During this period, most parts of the world experienced catastrophic declines in production, employment, incomes, and trade following the Wall Street Exchange crash.',
    conceptSections: [
      {
        number: 1,
        title: 'Key Causes & Global Impact',
        points: [
          {
            term: 'Agricultural Overproduction',
            definition: 'Falling agricultural prices forced farmers to produce more, worsening the glut and driving prices down further.',
          },
          {
            term: 'Withdrawal of US Loans',
            definition: 'Countries dependent on US credit faced acute banking crises and currency collapse when US lenders panicked in 1928–1929.',
          },
        ],
      },
    ],
    formulaTable: {
      columns: ['Event / Period', 'Year / Timeline', 'Region', 'Key Impact'],
      rows: [
        {
          concept: 'Wall Street Crash',
          formula: 'October 1929',
          unit: 'USA',
          takeaway: 'Triggered global financial panic and bank failures.',
        },
        {
          concept: 'Impact on India',
          formula: '1928 – 1934',
          unit: 'Colonial India',
          takeaway: 'India’s imports and exports nearly halved; wheat prices fell by 50%.',
        },
      ],
    },
    content: 'The Great Depression deep dive notes.',
    keyTakeaways: [
      'Agricultural regions and communities were the worst affected due to steeper price drops than industrial goods.',
      'Rural indebtedness in India intensified, fueling support for the Civil Disobedience Movement.',
    ],
    examTips: [
      'Structure 5-mark answers into two clear parts: (1) Causes of the Depression and (2) Impact on India.',
    ],
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'preset-tenses-english',
    title: 'Tenses (English)',
    topic: 'Tenses',
    noteType: 'executive_master',
    subject: 'English',
    classLevel: 'Class 9',
    depthLabel: 'Standard',
    relativeTimeLabel: '1 week ago',
    executiveSummary:
      'Tenses indicate the time of an action or state of being (Present, Past, or Future) and its degree of completeness (Simple, Continuous, Perfect, or Perfect Continuous).',
    conceptSections: [
      {
        number: 1,
        title: 'Core Tense Rules & Usage',
        points: [
          {
            term: 'Present Perfect Tense',
            definition: 'Used for actions completed in the recent past whose effect continues in the present (has/have + V3).',
          },
          {
            term: 'Past Perfect Tense',
            definition: 'Used for the earlier of two past actions (had + V3 before Simple Past V2).',
          },
        ],
      },
    ],
    formulaTable: {
      columns: ['Tense Name', 'Structure / Rule', 'Signal Words', 'Example'],
      rows: [
        {
          concept: 'Simple Present',
          formula: 'Subject + V1(s/es) + Object',
          unit: 'always, daily, usually',
          takeaway: 'She writes notes every day.',
        },
        {
          concept: 'Present Continuous',
          formula: 'is/am/are + V1-ing',
          unit: 'now, currently, at present',
          takeaway: 'They are studying for the exam.',
        },
        {
          concept: 'Past Perfect',
          formula: 'had + V3 (Past Participle)',
          unit: 'before, already, by the time',
          takeaway: 'The train had left before we reached.',
        },
      ],
    },
    content: 'Tenses standard English grammar notes.',
    keyTakeaways: [
      'Universal truths and habitual actions always take the Simple Present tense.',
      'Use "since" for a specific point in time and "for" for a duration of time in Perfect Continuous tenses.',
    ],
    examTips: [
      'In gap-filling questions, check adjacent clauses first to maintain sequence of tenses.',
    ],
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
];

function buildClientFallbackNote(
  chosenTopic: string,
  chosenSubject: SubjectId,
  classLevel: string,
  noteType: NoteType
): StudyNote {
  const clean = chosenTopic.trim() || 'Study Topic';
  return {
    id: `note-${Date.now()}`,
    title: `${clean} (${chosenSubject === 'Mathematics' ? 'Maths' : chosenSubject})`,
    topic: clean,
    noteType,
    subject: chosenSubject,
    classLevel,
    executiveSummary: `${clean} is a high-priority topic in ${chosenSubject} (${classLevel}) covering essential definitions, governing rules, step-by-step mechanisms, and practical applications for exam mastery.`,
    conceptSections: [
      {
        number: 1,
        title: `Core Concepts & Definitions of ${clean}`,
        points: [
          {
            term: `Fundamental Principle of ${clean}`,
            definition: `Explains the foundational meaning, classification, and governing laws of ${clean} in ${chosenSubject}.`,
            subPoints: [
              `Defines key variables, properties, and conditions associated with ${clean}.`,
              `Connects textbook theory to step-by-step problem solving and real-world examples.`,
            ],
          },
        ],
      },
      {
        number: 2,
        title: `Working Mechanism & Exam Applications`,
        points: [
          {
            term: 'Step-by-Step Application',
            definition: `Identify given parameters, apply the core rule or formula of ${clean}, and verify with proper units or examples.`,
          },
        ],
      },
    ],
    formulaTable: {
      columns: ['Concept / Aspect', 'Formula / Rule', 'Context / Scope', 'Key Takeaway'],
      rows: [
        {
          concept: `Core Definition of ${clean}`,
          formula: `Primary principle & rule of ${clean}`,
          unit: chosenSubject,
          takeaway: 'Start every exam answer with a clear 1-sentence definition.',
        },
        {
          concept: 'Stepwise Application',
          formula: 'Concept → Rule / Formula → Conclusion',
          unit: classLevel,
          takeaway: 'Include a concrete example or diagram for full marks.',
        },
      ],
    },
    content: `## ${clean}\nStructured study notes for ${clean} (${chosenSubject}).`,
    keyTakeaways: [
      `Master the core definition, classification, and rules of ${clean}.`,
      `Practice worked examples and review the summary table before exams.`,
    ],
    examTips: [
      `Underline technical keywords and headings when answering questions on ${clean}.`,
      `Include a neat diagram, formula, or real-life example wherever applicable.`,
    ],
    tags: [chosenSubject, classLevel],
    createdAt: new Date().toISOString(),
  };
}

function cleanMathText(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 / $2')
    .replace(/\$\\text\{([^}]+)\}\$/g, '$1')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\$\\rightarrow\$/g, '→')
    .replace(/\\rightarrow/g, '→')
    .replace(/\$F_\{?net\}?\$/g, 'F_net')
    .replace(/\$P\$/g, 'P')
    .replace(/\$([a-zA-Z0-9_\-+*/|()= ]+)\$/g, '$1')
    .replace(/\\implies/g, '⟹')
    .trim();
}

function formatRelativeTime(isoDate?: string): string {
  if (!isoDate) return 'Recently';
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMins = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  return `${diffWeeks} week${diffWeeks === 1 ? '' : 's'} ago`;
}

export const NotesView: React.FC = () => {
  const { profile, currentUser, addStudyMinutes, addStars, setActiveTab } = useStudy();

  // Generator state matching screenshot defaults (Mathematics + Standard Notes)
  const [subject, setSubject] = useState<SubjectId>('Mathematics');
  const [topic, setTopic] = useState('');
  const [detailLevel, setDetailLevel] = useState<'concise' | 'standard' | 'deep_dive'>('standard');
  const [noteType, setNoteType] = useState<NoteType>('executive_master');
  const [topicDropdownOpen, setTopicDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Saved notes state
  const [savedNotes, setSavedNotes] = useState<StudyNote[]>(() => {
    try {
      const stored = getUserItem('studybot_saved_notes');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [currentNote, setCurrentNote] = useState<StudyNote | null>(null);

  // View mode: 'dashboard' (main UI from screenshot), 'viewer' (reading a note), 'notebook' (viewing saved notes in a notebook)
  const [viewMode, setViewMode] = useState<'dashboard' | 'viewer' | 'notebook'>('dashboard');
  const [selectedNotebookSubject, setSelectedNotebookSubject] = useState<string>('All');
  const [topSearchQuery, setTopSearchQuery] = useState('');

  // Note reader actions
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setTopicDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleClearData = () => {
      setSavedNotes([]);
      setCurrentNote(null);
      setViewMode('dashboard');
    };
    window.addEventListener('studybot:data-cleared', handleClearData);
    return () => window.removeEventListener('studybot:data-cleared', handleClearData);
  }, []);

  // Load from Firestore by email ID
  useEffect(() => {
    if (!currentUser?.email) return;
    getUserNotes(currentUser.email)
      .then((remoteNotes: any) => {
        if (remoteNotes && remoteNotes.length > 0) {
          setSavedNotes(remoteNotes);
        }
      })
      .catch(() => {});
  }, [currentUser?.email]);

  // Sync to email-scoped local storage
  useEffect(() => {
    try {
      setUserItem('studybot_saved_notes', JSON.stringify(savedNotes));
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

  const handleSelectDepth = (option: NoteDepthOption) => {
    setDetailLevel(option.id);
    setNoteType(option.noteType);
  };

  const handleGenerateNote = async (e?: React.FormEvent, overrideTopic?: string) => {
    if (e) e.preventDefault();
    const chosenTopic = (overrideTopic ?? topic).trim() || POPULAR_TOPICS[subject][0];
    if (!chosenTopic) return;

    setTopic(chosenTopic);
    setTopicDropdownOpen(false);

    setLoading(true);
    setError(null);

    try {
      const response = await safeFetchJson<StudyNote>(
        '/api/generate-notes',
        {
          method: 'POST',
          body: JSON.stringify({
            topic: chosenTopic,
            noteType,
            subject,
            detailLevel,
            studentProfile: profile,
          }),
        },
        buildClientFallbackNote(chosenTopic, subject, profile.classLevel, noteType)
      );

      setCurrentNote(response);
      setViewMode('viewer');
      addStudyMinutes(5);
      addStars(15);

      const updated = [
        response,
        ...savedNotes.filter(
          (n) => n.id !== response.id && n.topic.toLowerCase() !== response.topic.toLowerCase()
        ),
      ];
      setSavedNotes(updated);

      if (currentUser?.email) {
        saveUserNote(currentUser.email, response);
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
    if (!currentNote || typeof window === 'undefined' || !('speechSynthesis' in window)) return;

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
    if (currentUser?.email) {
      deleteUserNote(currentUser.email, noteId);
    }
    if (currentNote?.id === noteId) {
      setCurrentNote(updated[0] || null);
      if (updated.length === 0) {
        setViewMode('dashboard');
      }
    }
  };

  const renderSubjectIcon = (type: 'math' | 'hindi' | 'english' | 'social' | 'science') => {
    switch (type) {
      case 'math':
        return <Calculator className="h-6 w-6 text-white" />;
      case 'hindi':
        return <BookOpen className="h-6 w-6 text-white" />;
      case 'english':
        return <BookOpen className="h-6 w-6 text-white" />;
      case 'social':
        return <Globe className="h-6 w-6 text-white" />;
      case 'science':
        return <FlaskConical className="h-6 w-6 text-white" />;
    }
  };

  const renderParsedContent = () => {
    if (!currentNote) return null;
    if (currentNote.executiveSummary || currentNote.conceptSections || currentNote.formulaTable) {
      return (
        <div className="space-y-7 text-slate-100">
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

          <div className="border-t border-slate-800/80 my-6" />

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
              <div className="text-xs md:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                {cleanMathText(currentNote.content)}
              </div>
            )}
          </div>

          <div className="border-t border-slate-800/80 my-6" />

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
                        <td className="p-3.5 text-slate-300">{cleanMathText(row.takeaway)}</td>
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

    return (
      <div className="text-xs md:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
        {cleanMathText(currentNote.content)}
      </div>
    );
  };

  // Combine user's saved notes with the default notes for notebook & recent views
  const allAvailableNotes: StudyNote[] = [
    ...savedNotes,
    ...DEFAULT_RECENT_NOTES.filter((d) => !savedNotes.some((s) => s.id === d.id)),
  ];

  const recentNotesList =
    savedNotes.length > 0
      ? [
          ...savedNotes.slice(0, 4).map((n) => ({
            ...n,
            depthLabel:
              n.noteType === 'summary'
                ? 'Concise'
                : n.noteType === 'detailed_chapter'
                ? 'Deep Dive'
                : 'Standard',
            relativeTimeLabel: formatRelativeTime(n.createdAt),
          })),
          ...DEFAULT_RECENT_NOTES,
        ].slice(0, 4)
      : DEFAULT_RECENT_NOTES;

  const filteredNotebookNotes = allAvailableNotes.filter((n) => {
    const matchesSubject = selectedNotebookSubject === 'All' || n.subject === selectedNotebookSubject;
    const matchesQuery =
      !topSearchQuery.trim() ||
      n.title.toLowerCase().includes(topSearchQuery.toLowerCase()) ||
      n.topic.toLowerCase().includes(topSearchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(topSearchQuery.toLowerCase());
    return matchesSubject && matchesQuery;
  });

  const matchingDropdownTopics = (DROPDOWN_TOPICS[subject] || []).filter(
    (item) => !topic.trim() || item.toLowerCase().includes(topic.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-[1280px] space-y-5 pb-10 font-['Sora'] text-slate-100 select-none">
      {/* Top Search & Profile Bar matching Screenshot */}
      <div className="flex items-center justify-between gap-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (topSearchQuery.trim()) {
              handleGenerateNote(undefined, topSearchQuery.trim());
            }
          }}
          className="relative w-full max-w-[540px]"
        >
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={topSearchQuery}
            onChange={(e) => setTopSearchQuery(e.target.value)}
            placeholder="Search anything... (topics, chapters, questions)"
            className="w-full rounded-full border border-[#1e2d4a] bg-[#0c1528]/95 py-2.5 pl-11 pr-4 text-xs md:text-sm text-slate-100 placeholder-slate-400 shadow-inner focus:border-blue-500/60 focus:outline-none transition-all"
          />
        </form>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#0c1528]/80 text-slate-300 hover:text-white transition-colors"
            title="Theme"
          >
            <Sun className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('/settings')}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-[#0c1528]/80 py-1 pl-1 pr-2.5 hover:border-blue-500/40 transition-colors"
            title={currentUser?.email || profile.name || 'Profile'}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#60a5fa] to-[#2563eb] text-white shadow-sm">
              <User className="h-4 w-4" />
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Hero Header Banner with Robot sitting above the card */}
      <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-4 pt-1">
        <div className="space-y-1.5 z-10 pb-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (viewMode !== 'dashboard') {
                  setViewMode('dashboard');
                } else {
                  setActiveTab('/');
                }
              }}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
              title="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-2xl md:text-[28px] font-extrabold tracking-tight text-white">AI Notes</h1>
          </div>
          <p className="text-xs md:text-[15px] text-slate-100 font-normal">
            Get easy-to-understand, well-structured notes for any topic.
          </p>
          <p className="text-xs md:text-[14px] text-[#60a5fa] font-medium">
            Choose your subject, topic and note type — and let AI do the rest!
          </p>
        </div>

        {/* Right Cute 3D Robot Reading Book + "Better Notes Better You" */}
        <div className="hidden md:flex items-center gap-4 pr-6 -mb-5 z-20 select-none pointer-events-none">
          <div className="relative flex items-center">
            <svg
              className="h-32 w-48 overflow-visible drop-shadow-[0_12px_28px_rgba(37,99,235,0.45)]"
              viewBox="0 0 210 138"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Left 4-Point Stars */}
              <path
                d="M18 26L21 34L29 37L21 40L18 48L15 40L7 37L15 34L18 26Z"
                fill="#60A5FA"
                opacity="0.9"
              />
              <path
                d="M12 78L14 83L19 85L14 87L12 92L10 87L5 85L10 83L12 78Z"
                fill="#93C5FD"
                opacity="0.75"
              />
              {/* Right 4-Point Stars */}
              <path
                d="M180 20L182.5 27L189.5 29.5L182.5 32L180 39L177.5 32L170.5 29.5L177.5 27L180 20Z"
                fill="#60A5FA"
                opacity="0.9"
              />
              <path
                d="M174 66L175.5 70L179.5 71.5L175.5 73L174 77L172.5 73L168.5 71.5L172.5 70L174 66Z"
                fill="#60A5FA"
                opacity="0.65"
              />

              {/* Ambient Glow */}
              <circle cx="102" cy="70" r="52" fill="url(#notesRobotGlow)" />

              {/* Antenna */}
              <line x1="102" y1="8" x2="102" y2="21" stroke="#93C5FD" strokeWidth="4" strokeLinecap="round" />
              <circle cx="102" cy="7" r="5.5" fill="#60A5FA" />

              {/* Side Ear Pods */}
              <ellipse cx="48" cy="56" rx="7.5" ry="14" fill="#3B82F6" />
              <ellipse cx="156" cy="56" rx="7.5" ry="14" fill="#3B82F6" />

              {/* Robot 3D Head */}
              <rect
                x="53"
                y="20"
                width="98"
                height="68"
                rx="33"
                fill="url(#notesHeadGrad)"
                stroke="#BFDBFE"
                strokeWidth="2"
              />

              {/* Dark Visor Screen */}
              <rect
                x="65"
                y="31"
                width="74"
                height="45"
                rx="21"
                fill="#0D1F42"
                stroke="#3B82F6"
                strokeWidth="1.5"
              />

              {/* Happy Curved Eyes (^ ^) */}
              <path
                d="M81 51C83.5 45.5 89.5 45.5 92 51"
                stroke="#93C5FD"
                strokeWidth="3.4"
                strokeLinecap="round"
              />
              <path
                d="M112 51C114.5 45.5 120.5 45.5 123 51"
                stroke="#93C5FD"
                strokeWidth="3.4"
                strokeLinecap="round"
              />
              {/* Cute Smile */}
              <path
                d="M97 59C99.5 63.5 104.5 63.5 107 59"
                stroke="#93C5FD"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
              {/* Soft Cheek Glow */}
              <ellipse cx="78" cy="57" rx="4.5" ry="2.4" fill="#60A5FA" opacity="0.45" />
              <ellipse cx="126" cy="57" rx="4.5" ry="2.4" fill="#60A5FA" opacity="0.45" />

              {/* Robot Torso */}
              <rect x="75" y="86" width="54" height="34" rx="15" fill="url(#notesHeadGrad)" />

              {/* Open Blue & White Book */}
              <path
                d="M42 103L102 115V133L42 119V103Z"
                fill="#3B82F6"
                stroke="#93C5FD"
                strokeWidth="1.5"
              />
              <path
                d="M162 103L102 115V133L162 119V103Z"
                fill="#2563EB"
                stroke="#93C5FD"
                strokeWidth="1.5"
              />
              <path
                d="M46 97L102 111L158 97L102 115L46 97Z"
                fill="#EFF6FF"
              />
              {/* Robot Hands holding the book */}
              <circle cx="52" cy="111" r="7.5" fill="#DBEAFE" stroke="#60A5FA" strokeWidth="1.5" />
              <circle cx="152" cy="111" r="7.5" fill="#DBEAFE" stroke="#60A5FA" strokeWidth="1.5" />

              <defs>
                <radialGradient
                  id="notesRobotGlow"
                  cx="0"
                  cy="0"
                  r="1"
                  gradientUnits="userSpaceOnUse"
                  gradientTransform="translate(102 70) scale(54)"
                >
                  <stop stopColor="#3B82F6" stopOpacity="0.45" />
                  <stop offset="1" stopColor="#1E3A8A" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="notesHeadGrad" x1="102" y1="20" x2="102" y2="88" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#FFFFFF" />
                  <stop offset="0.65" stopColor="#DBEAFE" />
                  <stop offset="1" stopColor="#60A5FA" />
                </linearGradient>
              </defs>
            </svg>

            {/* Handwritten-style "Better Notes Better You" */}
            <div className="-rotate-12 transform pl-1 pb-4 text-[#60a5fa]">
              <p className="font-semibold italic text-[17px] leading-snug tracking-wide drop-shadow-[0_2px_10px_rgba(59,130,246,0.45)]">
                Better
                <br />
                &nbsp;&nbsp;Notes
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;Better
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;You
              </p>
              <div className="mt-1 ml-5 h-0.5 w-16 rounded-full bg-[#60a5fa]/75" />
              <div className="mt-1 ml-8 h-0.5 w-11 rounded-full bg-[#60a5fa]/55" />
            </div>
          </div>
        </div>
      </div>

      {/* DASHBOARD MODE (Main 2-column layout matching StudyBot AI Notes Dashboard.png) */}
      {viewMode === 'dashboard' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left Main Configuration Card (8 columns) */}
          <div className="xl:col-span-8 rounded-[22px] border border-[#1d2d4e] bg-[#0a1222]/95 p-6 md:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.55)] space-y-6">
            {/* STEP 1: Select Subject */}
            <div className="space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1d4ed8] text-sm font-bold text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]">
                  1
                </div>
                <div>
                  <h2 className="text-base md:text-[17px] font-bold text-white leading-tight">Select Subject</h2>
                  <p className="text-xs text-[#60a5fa] mt-0.5">Choose the subject you want notes for</p>
                </div>
              </div>

              {/* 5 Subject Cards Row */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 pt-1">
                {SUBJECT_CARDS.map((card) => {
                  const isSelected = subject === card.id;
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => {
                        setSubject(card.id);
                        setTopic('');
                      }}
                      className={`relative flex flex-col items-center justify-center rounded-2xl border p-4 min-h-[118px] transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? `${card.activeBg} ${card.activeBorder} ${card.activeShadow} ring-1 ring-blue-400/50 scale-[1.01]`
                          : `${card.cardBg} ${card.cardBorder} hover:brightness-115`
                      }`}
                    >
                      {/* Top-right Checkmark Badge when selected */}
                      {isSelected && (
                        <div className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#3b82f6] text-white shadow-md">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                      )}

                      {/* Circular Icon */}
                      <div
                        className={`relative flex h-12 w-12 items-center justify-center rounded-full ${card.iconBg} shadow-lg mb-3`}
                      >
                        {renderSubjectIcon(card.iconType)}
                        {isSelected && (
                          <Sparkles className="absolute -bottom-1.5 text-sky-200 h-3.5 w-3.5 fill-sky-200 animate-pulse" />
                        )}
                      </div>

                      <span className="text-xs md:text-[13px] font-semibold text-white tracking-tight text-center">
                        {card.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-[#182642]" />

            {/* STEP 2: Select Topic */}
            <div className="space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1d4ed8] text-sm font-bold text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]">
                  2
                </div>
                <div>
                  <h2 className="text-base md:text-[17px] font-bold text-white leading-tight">Select Topic</h2>
                  <p className="text-xs text-[#60a5fa] mt-0.5">Choose a chapter or specific topic</p>
                </div>
              </div>

              {/* Search or select a topic input + dropdown */}
              <div className="relative" ref={dropdownRef}>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={topic}
                    onFocus={() => setTopicDropdownOpen(true)}
                    onChange={(e) => {
                      setTopic(e.target.value);
                      setTopicDropdownOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        setTopicDropdownOpen(false);
                        if (topic.trim()) {
                          handleGenerateNote(undefined, topic.trim());
                        }
                      }
                    }}
                    placeholder="Search or select a topic... (type any topic in the world)"
                    className="w-full rounded-xl border border-[#223559] bg-[#101c33] py-3.5 pl-4 pr-11 text-xs md:text-sm text-white placeholder-slate-400 focus:border-[#3b82f6] focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setTopicDropdownOpen((prev) => !prev)}
                    className="absolute right-3 flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                    aria-label="Toggle topic list"
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-200 ${
                        topicDropdownOpen ? 'rotate-180 text-blue-400' : ''
                      }`}
                    />
                  </button>
                </div>

                {topicDropdownOpen && (topic.trim().length > 0 || matchingDropdownTopics.length > 0) && (
                  <div className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-[#253b63] bg-[#0e192e] p-1.5 shadow-2xl space-y-1">
                    {topic.trim().length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setTopicDropdownOpen(false);
                          handleGenerateNote(undefined, topic.trim());
                        }}
                        className="flex w-full items-center justify-between rounded-lg bg-[#162a52] border border-[#2b4c8c] px-3.5 py-2.5 text-left text-xs md:text-sm font-semibold text-white hover:bg-[#1d386e] transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2 truncate">
                          <Sparkles className="h-3.5 w-3.5 text-[#60a5fa] shrink-0" />
                          <span className="truncate">Generate AI Notes for &ldquo;{topic.trim()}&rdquo;</span>
                        </span>
                        <span className="ml-2 shrink-0 rounded-full bg-[#2563eb] px-2.5 py-0.5 text-[10px] font-bold text-white">
                          Any Topic →
                        </span>
                      </button>
                    )}
                    {matchingDropdownTopics.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          setTopic(item);
                          setTopicDropdownOpen(false);
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-3.5 py-2.5 text-left text-xs md:text-sm text-slate-200 hover:bg-[#1a2c4e] hover:text-white transition-colors cursor-pointer"
                      >
                        <span>{item}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Popular Topics */}
              <div className="space-y-2.5 pt-0.5">
                <p className="text-xs font-semibold text-slate-300">Popular Topics</p>
                <div className="flex flex-wrap gap-2.5">
                  {POPULAR_TOPICS[subject].map((popTopic) => {
                    const isChipActive = topic.toLowerCase() === popTopic.toLowerCase();
                    return (
                      <button
                        key={popTopic}
                        type="button"
                        onClick={() => setTopic(popTopic)}
                        className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                          isChipActive
                            ? 'border-[#3b82f6] bg-[#1d4ed8]/40 text-white shadow-[0_0_12px_rgba(59,130,246,0.3)]'
                            : 'border-[#223559] bg-[#111e36] text-slate-200 hover:border-[#3b82f6]/60 hover:bg-[#162747] hover:text-white'
                        }`}
                      >
                        {popTopic}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="border-t border-[#182642]" />

            {/* STEP 3: Choose Note Type */}
            <div className="space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1d4ed8] text-sm font-bold text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]">
                  3
                </div>
                <div>
                  <h2 className="text-base md:text-[17px] font-bold text-white leading-tight">Choose Note Type</h2>
                  <p className="text-xs text-[#60a5fa] mt-0.5">Select the level of detail you need</p>
                </div>
              </div>

              {/* 3 Note Type Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
                {NOTE_DEPTH_OPTIONS.map((opt) => {
                  const isSelected = detailLevel === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleSelectDepth(opt)}
                      className={`relative cursor-pointer rounded-2xl border p-4 flex flex-col justify-between min-h-[148px] transition-all duration-200 ${
                        isSelected
                          ? 'border-[#3b82f6] bg-gradient-to-b from-[#152c5b]/90 to-[#0e1e40]/95 shadow-[0_0_25px_rgba(37,99,235,0.28)] ring-1 ring-[#3b82f6]/50'
                          : 'border-[#1f3152] bg-[#0e182c]/90 hover:border-[#2e4978] hover:bg-[#121f38]'
                      }`}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                                isSelected
                                  ? 'bg-[#2563eb] text-white shadow-[0_0_12px_rgba(37,99,235,0.6)]'
                                  : 'bg-[#172a4a] text-[#60a5fa]'
                              }`}
                            >
                              {opt.icon === 'zap' && <Zap className="h-4 w-4 fill-current" />}
                              {opt.icon === 'doc' && <FileText className="h-4 w-4" />}
                              {opt.icon === 'target' && <Target className="h-4 w-4" />}
                            </div>
                            <h3 className="text-sm font-bold text-white">{opt.title}</h3>
                          </div>

                          {isSelected ? (
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#3b82f6] text-white shadow">
                              <Check className="h-3 w-3 stroke-[3]" />
                            </div>
                          ) : (
                            <div className="h-4 w-4 shrink-0 rounded-full border border-[#3b5586] bg-transparent" />
                          )}
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed pl-11">{opt.description}</p>
                      </div>

                      <div className="pl-11 pt-3">
                        <span
                          className={`inline-block rounded-full px-3 py-0.5 text-[11px] font-semibold ${
                            isSelected
                              ? 'bg-[#2563eb] text-white shadow-sm'
                              : 'bg-[#162644] text-[#93c5fd] border border-[#233963]'
                          }`}
                        >
                          {opt.badgeText}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                {error}
              </div>
            )}

            {/* Primary CTA Button: Generate Notes -> */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => handleGenerateNote()}
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-[#1d5be6] via-[#2563eb] to-[#3882f6] py-3.5 px-6 text-sm md:text-[15px] font-bold text-white shadow-[0_8px_25px_rgba(37,99,235,0.45)] hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-60 flex items-center justify-center gap-2.5 cursor-pointer"
              >
                {loading ? (
                  <>
                    <RotateCcw className="h-4 w-4 animate-spin" />
                    <span>Generating {subject} Notes...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 fill-white" />
                    <span>Generate Notes</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column (4 columns): My Notebooks + Recent Notes matching Screenshot */}
          <div className="xl:col-span-4 space-y-5">
            {/* 1. My Notebooks Card */}
            <div className="rounded-[22px] border border-[#1d2d4e] bg-[#0a1222]/95 p-5 md:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
              <div className="flex items-start justify-between gap-2 pb-3.5 border-b border-[#182642]">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-[#132342] border border-[#233b69] text-[#60a5fa]">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white leading-tight">My Notebooks</h3>
                    <p className="text-xs text-[#60a5fa] mt-0.5">Access your saved notes anytime</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedNotebookSubject('All');
                    setViewMode('notebook');
                  }}
                  className="flex items-center gap-1 text-xs font-medium text-[#60a5fa] hover:text-blue-300 transition-colors shrink-0 mt-1 cursor-pointer"
                >
                  <span>View All</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="divide-y divide-[#16223b] pt-1">
                {NOTEBOOK_CONFIG.map((nb) => {
                  const userNotesForSub = savedNotes.filter((n) => n.subject === nb.subject);
                  const subtitleText =
                    userNotesForSub.length > 0
                      ? `${userNotesForSub.length} note${userNotesForSub.length === 1 ? '' : 's'} · Last updated ${formatRelativeTime(
                          userNotesForSub[0]?.createdAt
                        )}`
                      : nb.defaultSubtitle;

                  return (
                    <button
                      key={nb.subject}
                      type="button"
                      onClick={() => {
                        setSelectedNotebookSubject(nb.subject);
                        setViewMode('notebook');
                      }}
                      className="group flex w-full items-center justify-between py-3 px-2 first:pt-3.5 last:pb-1 rounded-xl hover:bg-white/[0.03] transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#101c33] border border-white/5">
                          <Folder className={`h-5 w-5 ${nb.folderColor}`} />
                        </div>
                        <div>
                          <h4 className="text-xs md:text-[13px] font-bold text-white group-hover:text-[#60a5fa] transition-colors">
                            {nb.title}
                          </h4>
                          <p className="text-[11px] text-[#60a5fa]/80 mt-0.5">{subtitleText}</p>
                        </div>
                      </div>

                      <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Recent Notes Card matching Screenshot */}
            <div className="rounded-[22px] border border-[#1d2d4e] bg-[#0a1222]/95 p-5 md:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
              <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-[#182642]">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#132342] border border-[#233b69] text-[#60a5fa]">
                    <Clock className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-bold text-white leading-tight">Recent Notes</h3>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedNotebookSubject('All');
                    setViewMode('notebook');
                  }}
                  className="flex items-center gap-1 text-xs font-medium text-[#60a5fa] hover:text-blue-300 transition-colors shrink-0 cursor-pointer"
                >
                  <span>View All</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="divide-y divide-[#16223b] pt-1">
                {recentNotesList.map((rn) => (
                  <button
                    key={rn.id}
                    type="button"
                    onClick={() => {
                      setCurrentNote(rn);
                      setViewMode('viewer');
                    }}
                    className="group flex w-full items-center justify-between py-3 px-2 first:pt-3.5 last:pb-1 rounded-xl hover:bg-white/[0.03] transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#132548] border border-[#233e73] text-[#60a5fa]">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs md:text-[13px] font-bold text-white group-hover:text-[#60a5fa] transition-colors truncate">
                          {rn.title}
                        </h4>
                        <p className="text-[11px] text-[#60a5fa]/80 mt-0.5">
                          {rn.depthLabel} · {rn.relativeTimeLabel}
                        </p>
                      </div>
                    </div>

                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NOTE VIEWER MODE (When user generates or opens a note) */}
      {viewMode === 'viewer' && currentNote && (
        <div className="space-y-5 animate-in fade-in">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#1d2d4e] bg-[#0a1222] p-4 shadow-xl">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setViewMode('dashboard')}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#121e36] px-3 py-2 text-xs font-bold text-slate-200 hover:text-white hover:border-blue-500/40 transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to AI Notes</span>
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[0.68rem] font-bold uppercase px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                    {currentNote.subject}
                  </span>
                  <span className="text-xs text-slate-400">{currentNote.classLevel}</span>
                </div>
                <h2 className="text-lg md:text-xl font-bold text-white mt-0.5">{currentNote.title}</h2>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleToggleSpeak}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                  isSpeaking
                    ? 'border-blue-500 bg-blue-600 text-white animate-pulse'
                    : 'border-white/10 bg-[#12182b] text-slate-300 hover:text-white'
                }`}
              >
                {isSpeaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                <span>{isSpeaking ? 'Stop Audio' : 'Read Aloud'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#12182b] px-3 py-2 text-xs font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#12182b] px-3 py-2 text-xs font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print / PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('dashboard')}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-500 shadow-md transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Note</span>
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-[#1d2d4e] bg-[#080d1a] p-6 md:p-10 shadow-2xl space-y-6">
            {renderParsedContent()}

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

      {/* NOTEBOOK VIEW MODE (When user clicks a notebook in My Notebooks) */}
      {viewMode === 'notebook' && (
        <div className="space-y-5 animate-in fade-in">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#1d2d4e] bg-[#0a1222] p-4 shadow-xl">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setViewMode('dashboard')}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#121e36] px-3 py-2 text-xs font-bold text-slate-200 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to AI Notes</span>
              </button>
              <h2 className="text-base md:text-lg font-bold text-white">
                {selectedNotebookSubject === 'All' ? 'All Saved Notebooks' : `${selectedNotebookSubject} Notebook`}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(['All', 'Mathematics', 'Science', 'English', 'Social Science', 'Hindi'] as const).map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setSelectedNotebookSubject(sub)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    selectedNotebookSubject === sub
                      ? 'bg-blue-600 text-white'
                      : 'border border-white/5 bg-[#12182b] text-slate-400 hover:text-white'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>

          {filteredNotebookNotes.length === 0 ? (
            <div className="rounded-3xl border border-[#1d2d4e] bg-[#0a1222] p-12 text-center space-y-3">
              <BookOpen className="h-10 w-10 text-slate-500 mx-auto" />
              <h3 className="text-base font-bold text-white">No Saved Notes Yet</h3>
              <p className="text-xs text-slate-400">
                Select a subject and topic on the AI Notes dashboard to generate your first note.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (selectedNotebookSubject !== 'All') {
                    setSubject(selectedNotebookSubject as SubjectId);
                  }
                  setViewMode('dashboard');
                }}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 cursor-pointer"
              >
                Generate a Note
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredNotebookNotes.map((n) => (
                <div
                  key={n.id}
                  className="flex flex-col justify-between rounded-2xl border border-[#1d2d4e] bg-[#0a1222] p-5 shadow-xl hover:border-blue-500/40 transition-all group space-y-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-blue-500/15 border border-blue-500/30 px-2.5 py-0.5 text-[0.65rem] font-bold text-blue-400 uppercase">
                        {n.subject}
                      </span>
                      <span className="text-[0.65rem] text-slate-400">{formatRelativeTime(n.createdAt)}</span>
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
                      {!n.id.startsWith('preset-') && (
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(n.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Delete Note"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentNote(n);
                          setViewMode('viewer');
                        }}
                        className="flex items-center gap-1 rounded-xl bg-blue-600/30 border border-blue-500/40 px-3 py-1 text-xs font-bold text-blue-300 hover:bg-blue-600 hover:text-white transition-all cursor-pointer"
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
  );
};
