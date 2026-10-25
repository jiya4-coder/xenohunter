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
  ChevronDown,
  ChevronUp,
  ListOrdered,
  HelpCircle,
  FileText,
  Dumbbell,
} from 'lucide-react';
import { StudyChat } from './StudyChat';
import {
  NEW_NCERT_SYLLABUS,
  NCERTSubjectBook,
  NCERTChapter,
  getAllBooksForClass,
  SUBJECT_OPTIONS,
} from '../data/ncertSyllabus';

export const NCERTBooksView: React.FC = () => {
  const { profile, updateProfile, setActiveTab } = useStudy();

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
  const [expandedBookId, setExpandedBookId] = useState<string | null>(null);

  const classes = [4, 5, 6, 7, 8, 9];

  // Get books for current selected class from the official syllabus
  const classBooks = useMemo(() => {
    return getAllBooksForClass(selectedClass);
  }, [selectedClass]);

  // Filter books according to subject and search query
  const filteredBooks = useMemo(() => {
    return classBooks.filter((b) => {
      // Subject filter
      if (selectedSubject !== 'all' && b.subjectKey !== selectedSubject) {
        return false;
      }

      // Search query filter (matches book title, chapter title, or subject)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesBook = b.bookName.toLowerCase().includes(query) || (b.hindiName && b.hindiName.includes(query));
        const matchesSubject = b.subjectName.toLowerCase().includes(query);
        const matchesChapter = b.chapters.some((c) => c.title.toLowerCase().includes(query));
        if (!matchesBook && !matchesSubject && !matchesChapter) return false;
      }

      return true;
    });
  }, [classBooks, selectedSubject, searchQuery]);

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrlId(id);
    setTimeout(() => setCopiedUrlId(null), 1800);
  };

  const handleQuickChapterAction = (book: NCERTSubjectBook, chapter: NCERTChapter, action: 'doubt' | 'summary' | 'practice') => {
    if (action === 'doubt') {
      setActiveTab('/tutor');
    } else if (action === 'summary') {
      setActiveTab('/summarize');
    } else if (action === 'practice') {
      setActiveTab('/practice');
    }
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
              <span>OFFICIAL NEW NCERT SYLLABUS (2026–27 NCF-SE EDITION)</span>
              <span className="text-white/30">·</span>
              <span>Classes 4 to 9</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <span>NCERT Books & Textbooks</span>
              <span className="rounded-full bg-blue-500/20 border border-blue-400/40 px-3 py-1 text-xs md:text-sm font-semibold text-blue-300">
                NCF-SE 2023 / NEP 2020
              </span>
            </h1>
            <p className="mt-2 text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Explore the newly released NCERT textbooks for Classes 4 through 9: <strong>Maths Mela</strong>, <strong>Our Wondrous World</strong>, <strong>Santoor</strong>, <strong>Veena</strong>, <strong>Ganita Prakash</strong>, <strong>Curiosity</strong>, <strong>Exploring Society</strong>, <strong>Poorvi</strong>, <strong>Malhar</strong>, <strong>Ganita Manjari</strong>, <strong>Exploration</strong>, <strong>Understanding Society</strong>, <strong>Kaveri</strong>, and <strong>Ganga</strong>.
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
              <span>2026–27 Textbooks</span>
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
            <span>Click any textbook to inspect chapter titles or open the official NCERT portal directly.</span>
          </span>
          <span className="text-white/20">|</span>
          <span className="text-slate-400">Strictly adheres to NEP 2020 competency framework</span>
        </div>
      </div>

      {activeTabMode === 'solutions' ? (
        /* Embedded NCERT AI Solutions Chat */
        <div className="rounded-3xl border border-white/10 bg-[#0a1020] p-4 shadow-xl">
          <StudyChat
            mode="ncert"
            title={`NCERT Class ${selectedClass} Exercise Solutions & Doubt Solver`}
            subtitle="Get instant board-compliant solutions for new 2026–27 NCF-SE textbook exercises with LaTeX working."
            placeholder={`Ask any Class ${selectedClass} NCERT question... e.g. Class ${selectedClass} Maths Exercise 2.1 Question 3`}
            suggestions={[
              `Class ${selectedClass} Science intext questions with answers`,
              `Class ${selectedClass} Maths chapter exercise solutions with LaTeX`,
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
                    onClick={() => {
                      setSelectedClass(cls);
                      updateProfile({ classLevel: `Class ${cls}` });
                    }}
                    className={`relative flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-xs font-extrabold transition-all shrink-0 ${
                      isSelected
                        ? 'bg-[#2563eb] text-white shadow-[0_0_20px_rgba(37,99,235,0.45)] scale-105 border border-blue-400'
                        : 'border border-white/10 bg-[#0d1428] text-slate-300 hover:border-blue-500/40 hover:bg-[#121c38] hover:text-white'
                    }`}
                  >
                    <span>Class {cls}</span>
                    {isEnrolled && (
                      <span
                        className={`text-[0.62rem] px-1.5 py-0.2 rounded-full font-bold ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-blue-500/20 text-blue-300'
                        }`}
                      >
                        Enrolled
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Stats pill */}
            <div className="text-xs text-slate-400 shrink-0 flex items-center gap-2">
              <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 font-medium">
                {selectedClass <= 5 ? 'Preparatory Stage' : selectedClass <= 8 ? 'Middle Stage' : 'Secondary Stage'} · {filteredBooks.length} Books
              </span>
            </div>
          </div>

          {/* 3. Search and Subject Filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Subject filter chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <Filter className="h-3.5 w-3.5 text-slate-500 shrink-0 mr-1" />
              <button
                type="button"
                onClick={() => setSelectedSubject('all')}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all shrink-0 ${
                  selectedSubject === 'all'
                    ? 'bg-blue-600/30 border border-blue-500/60 text-blue-200'
                    : 'border border-white/10 bg-[#0e1426] text-slate-400 hover:text-slate-200 hover:border-white/20'
                }`}
              >
                All Subjects
              </button>
              {SUBJECT_OPTIONS.map((subj) => {
                const isSelected = selectedSubject === subj.key;
                return (
                  <button
                    key={subj.key}
                    type="button"
                    onClick={() => setSelectedSubject(subj.key)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-blue-600/30 border border-blue-500/60 text-blue-200'
                        : 'border border-white/10 bg-[#0e1426] text-slate-400 hover:text-slate-200 hover:border-white/20'
                    }`}
                  >
                    <span>{subj.icon}</span>
                    <span>{subj.label}</span>
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
                placeholder={`Search Class ${selectedClass} chapters or books...`}
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
              const isExpanded = expandedBookId === book.id;
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
                      <div className="flex items-center gap-1.5 font-bold text-slate-300">
                        <span className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-0.5 text-[0.7rem] font-bold text-blue-300">
                          {book.classLevel}
                        </span>
                        <span className={`rounded-lg border px-2.5 py-0.5 text-[0.7rem] font-semibold ${book.badgeColor}`}>
                          {book.subjectName}
                        </span>
                      </div>

                      <span className="text-[0.68rem] text-slate-400 font-medium">
                        {book.totalChapters} Chapters
                      </span>
                    </div>

                    {/* Book Cover Illustration Header */}
                    <div className="flex items-start gap-3.5 mb-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600/30 to-purple-600/30 border border-white/15 text-2xl shadow-md">
                        {book.iconText}
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold text-white leading-tight group-hover:text-blue-300 transition-colors">
                          "{book.bookName}"
                        </h3>
                        {book.hindiName && (
                          <div className="text-xs text-slate-400 font-medium">
                            ({book.hindiName})
                          </div>
                        )}
                        <p className="mt-0.5 text-[0.68rem] text-blue-400 font-mono">
                          {book.edition}
                        </p>
                      </div>
                    </div>

                    {/* Chapter Directory Accordion Toggle */}
                    <div className="mb-4">
                      <button
                        type="button"
                        onClick={() => setExpandedBookId(isExpanded ? null : book.id)}
                        className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-[#070b16] px-3 py-2 text-xs text-slate-300 hover:border-blue-500/40 hover:bg-[#0c1328] transition-all"
                      >
                        <span className="flex items-center gap-2 font-semibold text-slate-200">
                          <ListOrdered className="h-3.5 w-3.5 text-blue-400" />
                          <span>{isExpanded ? 'Hide Chapter List' : `View All ${book.totalChapters} Chapters`}</span>
                        </span>
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>

                      {/* Expandable Chapter List */}
                      {isExpanded && (
                        <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-[#050813] p-2 space-y-1.5 scrollbar-thin">
                          {book.chapters.map((ch) => (
                            <div
                              key={ch.number}
                              className="group/ch rounded-lg border border-white/5 bg-[#090e1e] p-2 hover:border-blue-500/40 transition-all flex items-start justify-between gap-2"
                            >
                              <div className="text-[0.72rem] leading-snug">
                                <span className="font-bold text-blue-300 mr-1.5">Ch {ch.number}:</span>
                                <span className="text-slate-200 font-medium">{ch.title}</span>
                                {ch.unit && (
                                  <div className="text-[0.62rem] text-slate-400">{ch.unit}</div>
                                )}
                              </div>
                              <div className="flex items-center gap-1 opacity-80 group-hover/ch:opacity-100">
                                <button
                                  type="button"
                                  onClick={() => handleQuickChapterAction(book, ch, 'doubt')}
                                  title="Ask AI Doubt on this chapter"
                                  className="p-1 rounded bg-blue-600/20 text-blue-300 hover:bg-blue-600/40"
                                >
                                  <HelpCircle className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Secondary Book Link if available (e.g. Class 8 SST Part 2) */}
                    {book.secondaryPortalUrl && (
                      <div className="mb-4 rounded-xl border border-white/5 bg-[#070b16] p-2.5 flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-medium truncate pr-2">
                          📚 {book.secondaryTitle}
                        </span>
                        <a
                          href={book.secondaryPortalUrl}
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
                      href={book.portalUrl}
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
                        onClick={() => handleCopyUrl(book.portalUrl, book.id)}
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
                        onClick={() => setActiveTab('/tutor')}
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
        </div>
      )}
    </div>
  );
};
