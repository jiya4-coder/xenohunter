import React, { useState, useMemo } from 'react';
import { useStudy } from '../context/StudyContext';
import {
  BookOpen,
  ExternalLink,
  Search,
  Sparkles,
  BookMarked,
  Filter,
  CheckCircle2,
  Layers,
  GraduationCap,
  ArrowRight,
  Copy,
  Check,
  Bot,
  Info,
} from 'lucide-react';
import { StudyChat } from './StudyChat';

export interface NCERTBook {
  id: string;
  classLevel: string; // 'Class 4' | 'Class 5' | 'Class 6' | 'Class 7' | 'Class 8' | 'Class 9'
  classNumber: number;
  subject: 'Hindi' | 'English' | 'Maths' | 'Science' | 'Evs' | 'Sst';
  subjectTitle: string;
  bookTitle: string;
  hindiTitle?: string;
  url: string;
  secondaryUrl?: string;
  secondaryTitle?: string;
  chaptersCount: number;
  description: string;
  themeColor: string;
  iconText: string;
}

export const NCERT_BOOKS_DATA: NCERTBook[] = [
  // Class 4
  {
    id: 'c4-hindi',
    classLevel: 'Class 4',
    classNumber: 4,
    subject: 'Hindi',
    subjectTitle: 'Hindi (हिंदी)',
    bookTitle: 'Veena / Rimjhim (वीणा / रिमझिम)',
    url: 'https://ncert.nic.in/textbook.php?dhve1=0-13',
    chaptersCount: 13,
    description: 'NCERT Class 4 Hindi textbook covering stories, poems, moral lessons, and reading comprehension.',
    themeColor: 'from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-300',
    iconText: 'हिं',
  },
  {
    id: 'c4-english',
    classLevel: 'Class 4',
    classNumber: 4,
    subject: 'English',
    subjectTitle: 'English',
    bookTitle: 'Mridang / Marigold (मृदंग / मैरीगोल्ड)',
    url: 'https://ncert.nic.in/textbook.php?dhve1=0-13',
    chaptersCount: 13,
    description: 'Foundational English literature, communicative prose, rhymes, and grammar for Class 4.',
    themeColor: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-300',
    iconText: 'Eng',
  },
  {
    id: 'c4-maths',
    classLevel: 'Class 4',
    classNumber: 4,
    subject: 'Maths',
    subjectTitle: 'Mathematics (गणित)',
    bookTitle: 'Math-Magic / Ganit Ka Jadu (गणित का जादू)',
    url: 'https://ncert.nic.in/textbook.php?demm1=0-14',
    chaptersCount: 14,
    description: 'Illustrated mathematics for Class 4: building with bricks, long and short, trip to Bhopal, tick-tick-tick.',
    themeColor: 'from-blue-500/20 to-cyan-500/20 border-blue-500/40 text-blue-300',
    iconText: 'Math',
  },
  {
    id: 'c4-evs',
    classLevel: 'Class 4',
    classNumber: 4,
    subject: 'Evs',
    subjectTitle: 'Environmental Studies (EVS)',
    bookTitle: 'Looking Around / Aas Paas (आस पास)',
    url: 'https://ncert.nic.in/textbook.php?deev1=0-10',
    chaptersCount: 10,
    description: 'EVS for Class 4: Going to school, ear to ear, a day with Nandu, the story of Amrita, Anita and honeybees.',
    themeColor: 'from-lime-500/20 to-green-500/20 border-lime-500/40 text-lime-300',
    iconText: 'EVS',
  },

  // Class 5
  {
    id: 'c5-hindi',
    classLevel: 'Class 5',
    classNumber: 5,
    subject: 'Hindi',
    subjectTitle: 'Hindi (हिंदी)',
    bookTitle: 'Veena / Rimjhim 5 (वीणा / रिमझिम भाग 5)',
    url: 'https://ncert.nic.in/textbook.php?ehve1=0-12',
    chaptersCount: 12,
    description: 'Class 5 Hindi textbook with classical stories, poems, moral narratives, and vocabulary development.',
    themeColor: 'from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-300',
    iconText: 'हिं',
  },
  {
    id: 'c5-english',
    classLevel: 'Class 5',
    classNumber: 5,
    subject: 'English',
    subjectTitle: 'English',
    bookTitle: 'Santoor / Marigold 5 (संतूर / मैरीगोल्ड भाग 5)',
    url: 'https://ncert.nic.in/textbook.php?eesa1=0-10',
    chaptersCount: 10,
    description: 'Class 5 English prose, poems, grammar activities, vocabulary builders, and reading exercises.',
    themeColor: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-300',
    iconText: 'Eng',
  },
  {
    id: 'c5-maths',
    classLevel: 'Class 5',
    classNumber: 5,
    subject: 'Maths',
    subjectTitle: 'Mathematics (गणित)',
    bookTitle: 'Math-Magic / Ganit Ka Jadu 5 (गणित का जादू भाग 5)',
    url: 'https://ncert.nic.in/textbook.php?deev1=0-10',
    chaptersCount: 10,
    description: 'Class 5 Mathematics: The Fish Tale, Shapes & Angles, How Many Squares, Parts & Wholes, Does it Look the Same?',
    themeColor: 'from-blue-500/20 to-cyan-500/20 border-blue-500/40 text-blue-300',
    iconText: 'Math',
  },
  {
    id: 'c5-evs',
    classLevel: 'Class 5',
    classNumber: 5,
    subject: 'Evs',
    subjectTitle: 'Environmental Studies (EVS)',
    bookTitle: 'Looking Around / Aas Paas 5 (आस पास भाग 5)',
    url: 'https://ncert.nic.in/textbook.php?eeev1=0-10',
    chaptersCount: 10,
    description: 'Class 5 EVS: Super senses, a snake charmer story, from tasting to digesting, seeds and seeds, every drop counts.',
    themeColor: 'from-lime-500/20 to-green-500/20 border-lime-500/40 text-lime-300',
    iconText: 'EVS',
  },

  // Class 6
  {
    id: 'c6-hindi',
    classLevel: 'Class 6',
    classNumber: 6,
    subject: 'Hindi',
    subjectTitle: 'Hindi (हिंदी)',
    bookTitle: 'Malhar / Vasant 1 (मल्हार / वसंत भाग 1)',
    url: 'https://ncert.nic.in/textbook.php?fhml1=0-13',
    chaptersCount: 13,
    description: 'Official NCERT Class 6 Hindi textbook featuring modern and classical Hindi literature, poems, and stories.',
    themeColor: 'from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-300',
    iconText: 'हिं',
  },
  {
    id: 'c6-english',
    classLevel: 'Class 6',
    classNumber: 6,
    subject: 'English',
    subjectTitle: 'English',
    bookTitle: 'Poorvi / Honeysuckle (पूर्वी / हनीसकल)',
    url: 'https://ncert.nic.in/textbook.php?fhml1=0-13',
    chaptersCount: 13,
    description: 'Class 6 English textbook with timeless poems, reading comprehensions, vocabulary and grammar lessons.',
    themeColor: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-300',
    iconText: 'Eng',
  },
  {
    id: 'c6-maths',
    classLevel: 'Class 6',
    classNumber: 6,
    subject: 'Maths',
    subjectTitle: 'Mathematics (गणित)',
    bookTitle: 'Ganita Prakash / Mathematics 6 (गणित प्रकाश)',
    url: 'https://ncert.nic.in/textbook.php?fegp1=0-10',
    chaptersCount: 10,
    description: 'NCERT Class 6 Mathematics: Knowing Our Numbers, Whole Numbers, Playing with Numbers, Basic Geometrical Ideas, Integers, Fractions.',
    themeColor: 'from-blue-500/20 to-cyan-500/20 border-blue-500/40 text-blue-300',
    iconText: 'Math',
  },
  {
    id: 'c6-science',
    classLevel: 'Class 6',
    classNumber: 6,
    subject: 'Science',
    subjectTitle: 'Science (विज्ञान)',
    bookTitle: 'Curiosity / Science 6 (जिज्ञासा / विज्ञान)',
    url: 'https://ncert.nic.in/textbook.php?fecu1=0-12',
    chaptersCount: 12,
    description: 'NCERT Class 6 Science: Components of Food, Sorting Materials, Separation of Substances, Getting to Know Plants, Body Movements, Light & Shadows.',
    themeColor: 'from-purple-500/20 to-indigo-500/20 border-purple-500/40 text-purple-300',
    iconText: 'Sci',
  },
  {
    id: 'c6-sst',
    classLevel: 'Class 6',
    classNumber: 6,
    subject: 'Sst',
    subjectTitle: 'Social Science (सामाजिक विज्ञान)',
    bookTitle: 'Exploring Society / Social Science (समाज का अन्वेषण)',
    url: 'https://ncert.nic.in/textbook.php?fees1=0-14',
    chaptersCount: 14,
    description: 'NCERT Class 6 Social Science: Our Pasts (History), The Earth Our Habitat (Geography), Social & Political Life (Civics).',
    themeColor: 'from-rose-500/20 to-pink-500/20 border-rose-500/40 text-rose-300',
    iconText: 'SST',
  },

  // Class 7
  {
    id: 'c7-hindi',
    classLevel: 'Class 7',
    classNumber: 7,
    subject: 'Hindi',
    subjectTitle: 'Hindi (हिंदी)',
    bookTitle: 'Vasant 2 / Malhar (वसंत भाग 2 / मल्हार)',
    url: 'https://ncert.nic.in/textbook.php?ghml1=0-10',
    chaptersCount: 10,
    description: 'Class 7 Hindi textbook: Ham Panchhi Unmukt Gagan Ke, Dadi Maa, Himalaya Ki Betiyan, Kathputli, Mithaiwala.',
    themeColor: 'from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-300',
    iconText: 'हिं',
  },
  {
    id: 'c7-english',
    classLevel: 'Class 7',
    classNumber: 7,
    subject: 'English',
    subjectTitle: 'English',
    bookTitle: 'Honeycomb & An Alien Hand (हनीकॉम्ब)',
    url: 'https://ncert.nic.in/textbook.php?gepr1=0-5',
    chaptersCount: 5,
    description: 'Class 7 English textbook: Three Questions, A Gift of Chappals, Gopal and the Hilsa Fish, The Ashes That Made Trees Bloom.',
    themeColor: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-300',
    iconText: 'Eng',
  },
  {
    id: 'c7-maths',
    classLevel: 'Class 7',
    classNumber: 7,
    subject: 'Maths',
    subjectTitle: 'Mathematics (गणित)',
    bookTitle: 'Mathematics 7 (गणित भाग 7)',
    url: 'https://ncert.nic.in/textbook.php?gegp1=0-8',
    chaptersCount: 8,
    description: 'Class 7 Mathematics: Integers, Fractions and Decimals, Data Handling, Simple Equations, Lines and Angles, Triangles.',
    themeColor: 'from-blue-500/20 to-cyan-500/20 border-blue-500/40 text-blue-300',
    iconText: 'Math',
  },
  {
    id: 'c7-science',
    classLevel: 'Class 7',
    classNumber: 7,
    subject: 'Science',
    subjectTitle: 'Science (विज्ञान)',
    bookTitle: 'Science 7 (विज्ञान भाग 7)',
    url: 'https://ncert.nic.in/textbook.php?gegp1=0-8',
    chaptersCount: 8,
    description: 'Class 7 Science: Nutrition in Plants, Nutrition in Animals, Heat, Acids Bases and Salts, Physical and Chemical Changes, Respiration in Organisms.',
    themeColor: 'from-purple-500/20 to-indigo-500/20 border-purple-500/40 text-purple-300',
    iconText: 'Sci',
  },
  {
    id: 'c7-sst',
    classLevel: 'Class 7',
    classNumber: 7,
    subject: 'Sst',
    subjectTitle: 'Social Science (सामाजिक विज्ञान)',
    bookTitle: 'Our Pasts II / Social and Political Life II',
    url: 'https://ncert.nic.in/textbook.php?gees1=0-12',
    chaptersCount: 12,
    description: 'Class 7 Social Science: Medieval Indian History, Our Environment (Geography), and Equality in Democracy (Civics).',
    themeColor: 'from-rose-500/20 to-pink-500/20 border-rose-500/40 text-rose-300',
    iconText: 'SST',
  },

  // Class 8
  {
    id: 'c8-hindi',
    classLevel: 'Class 8',
    classNumber: 8,
    subject: 'Hindi',
    subjectTitle: 'Hindi (हिंदी)',
    bookTitle: 'Vasant 3 / Bharat Ki Khoj (वसंत भाग 3)',
    url: 'https://ncert.nic.in/textbook.php?hhml1=0-10',
    chaptersCount: 10,
    description: 'Class 8 Hindi textbook: Dhwani, Lakh Ki Chudiyan, Bus Ki Yatra, Deewano Ki Hasti, Chitthiyon Ki Anuthi Duniya.',
    themeColor: 'from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-300',
    iconText: 'हिं',
  },
  {
    id: 'c8-english',
    classLevel: 'Class 8',
    classNumber: 8,
    subject: 'English',
    subjectTitle: 'English',
    bookTitle: 'Honeydew & It So Happened (हनीड्यू)',
    url: 'https://ncert.nic.in/textbook.php?hhml1=0-10',
    chaptersCount: 10,
    description: 'Class 8 English textbook: The Best Christmas Present in the World, The Tsunami, Glimpses of the Past, Bepin Choudhury.',
    themeColor: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-300',
    iconText: 'Eng',
  },
  {
    id: 'c8-maths',
    classLevel: 'Class 8',
    classNumber: 8,
    subject: 'Maths',
    subjectTitle: 'Mathematics (गणित)',
    bookTitle: 'Mathematics 8 (गणित भाग 8)',
    url: 'https://ncert.nic.in/textbook.php?hegp2=0-7',
    chaptersCount: 7,
    description: 'Class 8 Mathematics: Rational Numbers, Linear Equations in One Variable, Understanding Quadrilaterals, Data Handling, Algebraic Expressions.',
    themeColor: 'from-blue-500/20 to-cyan-500/20 border-blue-500/40 text-blue-300',
    iconText: 'Math',
  },
  {
    id: 'c8-science',
    classLevel: 'Class 8',
    classNumber: 8,
    subject: 'Science',
    subjectTitle: 'Science (विज्ञान)',
    bookTitle: 'Science 8 (विज्ञान भाग 8)',
    url: 'https://ncert.nic.in/textbook.php?hecu1=0-13',
    chaptersCount: 13,
    description: 'Class 8 Science: Crop Production, Microorganisms, Coal & Petroleum, Combustion & Flame, Conservation of Plants & Animals, Force & Pressure, Friction, Sound.',
    themeColor: 'from-purple-500/20 to-indigo-500/20 border-purple-500/40 text-purple-300',
    iconText: 'Sci',
  },
  {
    id: 'c8-sst',
    classLevel: 'Class 8',
    classNumber: 8,
    subject: 'Sst',
    subjectTitle: 'Social Science (सामाजिक विज्ञान)',
    bookTitle: 'Our Pasts III & Social and Political Life III',
    url: 'https://ncert.nic.in/textbook.php?hees1=0-7',
    secondaryUrl: 'https://ncert.nic.in/textbook.php?hees2=0-8',
    secondaryTitle: 'Part 2: Social & Political Life III',
    chaptersCount: 7,
    description: 'Class 8 Social Science: Modern Indian History (East India Company to Independence), Resources and Law & Social Justice.',
    themeColor: 'from-rose-500/20 to-pink-500/20 border-rose-500/40 text-rose-300',
    iconText: 'SST',
  },

  // Class 9
  {
    id: 'c9-hindi',
    classLevel: 'Class 9',
    classNumber: 9,
    subject: 'Hindi',
    subjectTitle: 'Hindi (हिंदी)',
    bookTitle: 'Kshitij / Kritika / Sparsh (क्षितिज / कृतिका / स्पर्श)',
    url: 'https://ncert.nic.in/textbook.php?ihga1=0-12',
    chaptersCount: 12,
    description: 'Class 9 Hindi textbook: Do Bailon Ki Katha, Lhasa Ki Aur, Upbhoktavadi Ki Sanskriti, Premchand Ke Phate Joote, Kabir Sakhiyan.',
    themeColor: 'from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-300',
    iconText: 'हिं',
  },
  {
    id: 'c9-english',
    classLevel: 'Class 9',
    classNumber: 9,
    subject: 'English',
    subjectTitle: 'English',
    bookTitle: 'Beehive & Moments (बिहाइव / मोमेंट्स)',
    url: 'https://ncert.nic.in/textbook.php?iebe1=0-8',
    chaptersCount: 8,
    description: 'Class 9 English textbook: The Fun They Had, The Sound of Music, The Little Girl, A Truly Beautiful Mind, The Snake and the Mirror.',
    themeColor: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-300',
    iconText: 'Eng',
  },
  {
    id: 'c9-maths',
    classLevel: 'Class 9',
    classNumber: 9,
    subject: 'Maths',
    subjectTitle: 'Mathematics (गणित)',
    bookTitle: 'Mathematics 9 (गणित भाग 9)',
    url: 'https://ncert.nic.in/textbook.php?iemh1=0-8',
    chaptersCount: 8,
    description: 'Class 9 Mathematics: Number Systems, Polynomials, Coordinate Geometry, Linear Equations in Two Variables, Lines and Angles, Triangles.',
    themeColor: 'from-blue-500/20 to-cyan-500/20 border-blue-500/40 text-blue-300',
    iconText: 'Math',
  },
  {
    id: 'c9-science',
    classLevel: 'Class 9',
    classNumber: 9,
    subject: 'Science',
    subjectTitle: 'Science (विज्ञान)',
    bookTitle: 'Science 9 (विज्ञान भाग 9)',
    url: 'https://ncert.nic.in/textbook.php?iemh1=0-8',
    chaptersCount: 8,
    description: 'Class 9 Science: Matter in Our Surroundings, Is Matter Around Us Pure, Atoms and Molecules, Structure of the Atom, Cell - The Fundamental Unit of Life, Tissues, Motion, Force.',
    themeColor: 'from-purple-500/20 to-indigo-500/20 border-purple-500/40 text-purple-300',
    iconText: 'Sci',
  },
  {
    id: 'c9-sst',
    classLevel: 'Class 9',
    classNumber: 9,
    subject: 'Sst',
    subjectTitle: 'Social Science (सामाजिक विज्ञान)',
    bookTitle: 'India & Contemporary World I / Contemporary India I',
    url: 'https://ncert.nic.in/textbook.php?iest1=0-9',
    chaptersCount: 9,
    description: 'Class 9 Social Science: The French Revolution, Socialism in Europe, Nazism & Rise of Hitler, India - Size and Location, Physical Features of India.',
    themeColor: 'from-rose-500/20 to-pink-500/20 border-rose-500/40 text-rose-300',
    iconText: 'SST',
  },
];

export const NCERTBooksView: React.FC = () => {
  const { profile, setActiveTab } = useStudy();

  // Normalize student profile class to default selection (Classes 4-9)
  const defaultClassNumber = useMemo(() => {
    const match = profile.classLevel.match(/\d+/);
    const num = match ? parseInt(match[0], 10) : 9;
    return num >= 4 && num <= 9 ? num : 9;
  }, [profile.classLevel]);

  const [selectedClass, setSelectedClass] = useState<number>(defaultClassNumber);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTabMode, setActiveTabMode] = useState<'books' | 'solutions'>('books');
  const [copiedUrlId, setCopiedUrlId] = useState<string | null>(null);

  const classes = [4, 5, 6, 7, 8, 9];

  const subjects = [
    { id: 'all', label: 'All Subjects' },
    { id: 'Maths', label: 'Maths' },
    { id: 'Science', label: selectedClass <= 5 ? 'EVS' : 'Science' },
    { id: 'Sst', label: 'Social Science (SST)' },
    { id: 'Hindi', label: 'Hindi' },
    { id: 'English', label: 'English' },
  ];

  // Filter books according to class and subject
  const filteredBooks = useMemo(() => {
    return NCERT_BOOKS_DATA.filter((b) => {
      // Must match selected class
      if (b.classNumber !== selectedClass) return false;

      // Subject filter
      if (selectedSubject !== 'all') {
        if (selectedSubject === 'Science' && (b.subject === 'Science' || b.subject === 'Evs')) {
          // match
        } else if (b.subject !== selectedSubject) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = b.bookTitle.toLowerCase().includes(query);
        const matchesSubject = b.subjectTitle.toLowerCase().includes(query);
        const matchesDesc = b.description.toLowerCase().includes(query);
        if (!matchesTitle && !matchesSubject && !matchesDesc) return false;
      }

      return true;
    });
  }, [selectedClass, selectedSubject, searchQuery]);

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrlId(id);
    setTimeout(() => setCopiedUrlId(null), 1800);
  };

  const handleAskSolutions = (book: NCERTBook) => {
    setActiveTab('/tutor');
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-20 font-['Sora'] select-none">
      {/* 1. Header Hero Card */}
      <div
        className="relative overflow-hidden rounded-3xl border border-blue-500/20 p-6 md:p-8 shadow-2xl"
        style={{
          background:
            'radial-gradient(ellipse at 85% 0%, rgba(37, 99, 235, 0.35), transparent 60%), linear-gradient(160deg, #0f1c38 0%, #091024 100%)',
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#38bdf8]">
              <span className="flex h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
              <span>Official NCERT 2026–27 Digital Repository</span>
              <span className="text-white/30">·</span>
              <span>Classes 4 to 9</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <span>NCERT Books & Textbooks</span>
              <span className="rounded-full bg-blue-500/20 border border-blue-400/40 px-3 py-1 text-xs md:text-sm font-semibold text-blue-300">
                Direct Portal Links
              </span>
            </h1>
            <p className="mt-2 text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Access official Government of India NCERT textbook portals directly for each class and subject.
              Read chapters, view diagrams, solve exercises, and get AI-powered step-by-step solutions.
            </p>
          </div>

          {/* Toggle between Books Repository and AI Solutions */}
          <div className="flex items-center rounded-2xl border border-white/10 bg-[#070b16] p-1.5 shrink-0 shadow-lg">
            <button
              type="button"
              onClick={() => setActiveTabMode('books')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTabMode === 'books'
                  ? 'bg-[#2563eb] text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>Official Textbooks</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTabMode('solutions')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTabMode === 'solutions'
                  ? 'bg-[#2563eb] text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="h-4 w-4 text-[#38bdf8]" />
              <span>NCERT AI Solutions</span>
            </button>
          </div>
        </div>

        {/* Info Strip */}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-400 border-t border-white/10 pt-3">
          <span className="flex items-center gap-1.5 text-blue-300 font-semibold">
            <Info className="h-3.5 w-3.5 text-blue-400" />
            <span>Click any book to open the official NCERT portal with all chapters (PDF & online reader)</span>
          </span>
          <span className="text-white/20">|</span>
          <span>Verified Government Portal (ncert.nic.in)</span>
        </div>
      </div>

      {activeTabMode === 'solutions' ? (
        /* Embedded NCERT AI Solutions Chat */
        <div className="rounded-3xl border border-white/10 bg-[#0a1020] p-4 shadow-xl">
          <StudyChat
            mode="ncert"
            title="NCERT Exercise Solutions & Doubt Solver"
            subtitle="Get instant board-compliant solutions for Class 4 to 9 textbook exercises with step-by-step working."
            placeholder={`Ask any Class ${selectedClass} NCERT question... e.g. Class ${selectedClass} Maths Exercise 2.1 Question 3`}
            suggestions={[
              `Class ${selectedClass} Science intext questions with answers`,
              `Class ${selectedClass} Maths chapter exercise solutions`,
              `Class ${selectedClass} Social Science 5-mark board answers`,
              `Class ${selectedClass} English comprehension summary & word meanings`,
              `Class ${selectedClass} Hindi textbook questions and saransh`,
            ]}
          />
        </div>
      ) : (
        /* Books View */
        <div className="space-y-6">
          {/* 2. Class Selector Navigation (Classes 4 to 9) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                <GraduationCap className="h-4 w-4 text-blue-400" />
                Select Class:
              </span>
              {classes.map((cls) => {
                const isSelected = selectedClass === cls;
                const isEnrolled = defaultClassNumber === cls;
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => setSelectedClass(cls)}
                    className={`relative flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-xs font-extrabold transition-all shrink-0 ${
                      isSelected
                        ? 'bg-[#2563eb] text-white shadow-[0_0_20px_rgba(37,99,235,0.45)] scale-105 border border-blue-400'
                        : 'border border-white/10 bg-[#0d1428] text-slate-300 hover:border-blue-500/40 hover:bg-[#121c38] hover:text-white'
                    }`}
                  >
                    <span>Class {cls}</span>
                    {isEnrolled && (
                      <span className={`text-[0.62rem] px-1.5 py-0.2 rounded-full font-bold ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-blue-500/20 text-blue-300'
                      }`}>
                        You
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Stats pill */}
            <div className="text-xs text-slate-400 shrink-0 flex items-center gap-2">
              <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 font-medium">
                Showing Class {selectedClass} Textbooks ({filteredBooks.length} available)
              </span>
            </div>
          </div>

          {/* 3. Search and Subject Filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Subject filter chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <Filter className="h-3.5 w-3.5 text-slate-500 shrink-0 mr-1" />
              {subjects.map((subj) => {
                const isSelected = selectedSubject === subj.id;
                return (
                  <button
                    key={subj.id}
                    type="button"
                    onClick={() => setSelectedSubject(subj.id)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all shrink-0 ${
                      isSelected
                        ? 'bg-blue-600/30 border border-blue-500/60 text-blue-200'
                        : 'border border-white/10 bg-[#0e1426] text-slate-400 hover:text-slate-200 hover:border-white/20'
                    }`}
                  >
                    {subj.label}
                  </button>
                );
              })}
            </div>

            {/* Search Box */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search Class ${selectedClass} books...`}
                className="w-full rounded-2xl border border-white/10 bg-[#090e1c] pl-9 pr-8 py-2 text-xs text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* 4. Textbooks Grid for Selected Class */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredBooks.map((book) => {
              return (
                <div
                  key={book.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-[#0a1020] p-5 shadow-xl transition-all duration-200 hover:border-blue-500/50 hover:shadow-[0_8px_30px_rgba(37,99,235,0.15)]"
                >
                  {/* Subtle Top Gradient Line */}
                  <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${book.themeColor}`} />

                  {/* Top Card Info */}
                  <div>
                    {/* Badges row */}
                    <div className="flex items-center justify-between text-xs mb-3">
                      <span className="flex items-center gap-1.5 font-bold text-slate-300">
                        <span className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-0.5 text-[0.7rem] font-bold text-blue-300">
                          {book.classLevel}
                        </span>
                        <span className="rounded-lg bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 text-[0.7rem] font-semibold text-blue-400">
                          {book.subjectTitle}
                        </span>
                      </span>

                      <span className="text-[0.68rem] text-slate-400 font-medium">
                        {book.chaptersCount} Chapters
                      </span>
                    </div>

                    {/* Book Cover Illustration Header */}
                    <div className="flex items-start gap-3.5 mb-3">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${book.themeColor} font-black text-sm shadow-md`}>
                        {book.iconText}
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold text-white leading-tight group-hover:text-blue-300 transition-colors">
                          {book.bookTitle}
                        </h3>
                        <p className="mt-0.5 text-[0.7rem] text-slate-400 font-mono">
                          Official Code: {book.url.split('?')[1] || 'NCERT'}
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-3 mb-4">
                      {book.description}
                    </p>

                    {/* Secondary Book Link if available (e.g. Class 8 SST Part 2) */}
                    {book.secondaryUrl && (
                      <div className="mb-4 rounded-xl border border-white/5 bg-[#070b16] p-2.5 flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-medium truncate pr-2">
                          📚 {book.secondaryTitle}
                        </span>
                        <a
                          href={book.secondaryUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 flex items-center gap-1 text-[0.68rem] font-bold text-blue-400 hover:text-blue-300 hover:underline"
                        >
                          Open Part 2 <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Bottom Action Buttons */}
                  <div className="space-y-2 pt-3 border-t border-white/10">
                    {/* Primary Button: Open Official NCERT Portal */}
                    <a
                      href={book.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2563eb] px-4 py-3 text-xs font-extrabold text-white shadow-[0_0_15px_rgba(37,99,235,0.35)] transition-all hover:bg-[#1d4ed8] hover:scale-[1.02]"
                    >
                      <BookOpen className="h-4 w-4" />
                      <span>Open NCERT Book (Official Portal)</span>
                      <ExternalLink className="h-3.5 w-3.5 ml-0.5" />
                    </a>

                    {/* Secondary Actions Row */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyUrl(book.url, book.id)}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-[#0d1428] px-3 py-2 text-[0.7rem] font-semibold text-slate-300 hover:bg-[#121c38] hover:text-white transition-all"
                        title="Copy official NCERT URL to clipboard"
                      >
                        {copiedUrlId === book.id ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span>Copied Link</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 text-slate-400" />
                            <span>Copy URL</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAskSolutions(book)}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-600/10 px-3 py-2 text-[0.7rem] font-bold text-blue-300 hover:bg-blue-600/20 hover:border-blue-400 transition-all"
                        title="Ask AI Tutor to solve exercise questions"
                      >
                        <Sparkles className="h-3 w-3 text-[#38bdf8]" />
                        <span>AI Solutions →</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty State */}
          {filteredBooks.length === 0 && (
            <div className="rounded-3xl border border-white/10 bg-[#0a1020] p-12 text-center">
              <BookOpen className="mx-auto h-12 w-12 text-slate-500 mb-3" />
              <h3 className="text-base font-bold text-white">No textbooks found</h3>
              <p className="mt-1 text-xs text-slate-400">
                No NCERT books match your filter criteria for Class {selectedClass}. Try clearing search.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedSubject('all');
                }}
                className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500"
              >
                Clear Filters
              </button>
            </div>
          )}

          {/* 5. Direct Quick Links Summary Table for All Classes (4 to 9) */}
          <div className="rounded-3xl border border-white/10 bg-[#0a1020] p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>📑 Direct NCERT Portal Directory (Classes 4–9)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Quick access table containing all verified official NCERT URLs according to Class and Subject.
                </p>
              </div>
              <span className="text-[0.68rem] text-slate-500 font-mono">
                Source: ncert.nic.in/textbook.php
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 uppercase text-[0.65rem] font-bold tracking-wider">
                    <th className="py-2.5 px-3">Class</th>
                    <th className="py-2.5 px-3">Subject</th>
                    <th className="py-2.5 px-3">Official Textbook Name</th>
                    <th className="py-2.5 px-3">Official URL</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {NCERT_BOOKS_DATA.map((book) => (
                    <tr
                      key={`table-${book.id}`}
                      className="hover:bg-white/5 transition-colors group"
                    >
                      <td className="py-2.5 px-3 font-bold text-white whitespace-nowrap">
                        <span className="rounded-md bg-blue-500/20 px-2 py-0.5 text-blue-300">
                          {book.classLevel}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-200 whitespace-nowrap">
                        {book.subjectTitle}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 font-medium">
                        {book.bookTitle}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[0.68rem] max-w-xs truncate">
                        <a
                          href={book.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-blue-400 hover:underline"
                        >
                          {book.url}
                        </a>
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <a
                          href={book.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-600/30 border border-blue-500/50 px-2.5 py-1 text-[0.68rem] font-bold text-blue-300 hover:bg-blue-600/50 hover:text-white transition-all"
                        >
                          <span>Open</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
