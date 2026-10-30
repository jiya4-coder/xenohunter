import React, { useState, useMemo } from 'react';
import { useStudy } from '../context/StudyContext';
import {
  Play,
  BookOpen,
  Sparkles,
  CheckCircle2,
  Clock,
  Search,
  MessageCircle,
  Dumbbell,
  Layers,
  ChevronRight,
  Volume2,
  VolumeX,
  RotateCcw,
  Pause,
  Film,
  Lightbulb,
} from 'lucide-react';
import {
  getAllBooksForClass,
  SUBJECT_OPTIONS,
} from '../data/ncertSyllabus';
import { ProgressView } from './ProgressView';

interface ConceptLesson {
  id: string;
  subjectKey: string;
  subjectName: string;
  bookName: string;
  chapterNumber: number;
  title: string;
  duration: string;
  keyTakeaways: string[];
  visualAnalogy: string;
  formulaOrRule: string;
}

export const LearnView: React.FC = () => {
  const { profile, setActiveTab, addStudyMinutes } = useStudy();

  const currentClassNum = useMemo(() => {
    const match = profile.classLevel.match(/\d+/);
    const num = match ? parseInt(match[0], 10) : 9;
    return num >= 4 && num <= 9 ? num : 9;
  }, [profile.classLevel]);

  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [isPlayingLesson, setIsPlayingLesson] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [showInteractiveStudio, setShowInteractiveStudio] = useState<boolean>(false);

  const classBooks = useMemo(() => getAllBooksForClass(currentClassNum), [currentClassNum]);

  const lessons = useMemo<ConceptLesson[]>(() => {
    const list: ConceptLesson[] = [];
    classBooks.forEach((book) => {
      book.chapters.forEach((ch, idx) => {
        list.push({
          id: `${book.subjectKey}-ch-${ch.number}`,
          subjectKey: book.subjectKey,
          subjectName: book.subjectName,
          bookName: book.bookName,
          chapterNumber: ch.number,
          title: ch.title,
          duration: `${8 + (idx % 7)} min`,
          keyTakeaways: [
            `Core NCERT concept & definition of ${ch.title} (${book.classLevel})`,
            `Step-by-step mechanism, diagrams, and real-world applications`,
            `High-yield exam questions and common mistakes to avoid`,
          ],
          visualAnalogy: `Think of ${ch.title} through everyday observations around you — connecting textbook rules from "${book.bookName}" directly to real-life phenomena.`,
          formulaOrRule: ch.unit ? `Unit: ${ch.unit} • ${book.bookName}` : `Official NCF-SE Chapter ${ch.number} • ${book.bookName}`,
        });
      });
    });
    return list;
  }, [classBooks]);

  const filteredLessons = useMemo(() => {
    return lessons.filter((lesson) => {
      if (selectedSubject !== 'all' && lesson.subjectKey !== selectedSubject) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          lesson.title.toLowerCase().includes(q) ||
          lesson.subjectName.toLowerCase().includes(q) ||
          lesson.bookName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [lessons, selectedSubject, searchQuery]);

  const activeLesson = useMemo(() => {
    if (!activeLessonId) return filteredLessons[0] || lessons[0] || null;
    return lessons.find((l) => l.id === activeLessonId) || filteredLessons[0] || null;
  }, [activeLessonId, filteredLessons, lessons]);

  const handleToggleNarrate = (lesson: ConceptLesson) => {
    if (!('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const script = `Welcome to the StudyBot AI concept lesson on Chapter ${lesson.chapterNumber}: ${lesson.title}, from ${lesson.bookName} for ${profile.classLevel}. Key takeaways: First, ${lesson.keyTakeaways[0]}. Second, ${lesson.keyTakeaways[1]}. Visual Analogy: ${lesson.visualAnalogy}`;
    const utterance = new SpeechSynthesisUtterance(script);
    utterance.rate = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    setIsPlayingLesson(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleMarkComplete = (id: string) => {
    if (!completedLessons.includes(id)) {
      setCompletedLessons((prev) => [...prev, id]);
      addStudyMinutes(10);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16 font-['Sora'] select-none">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#0c1428] p-6">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-300">
            <Play className="h-6 w-6 fill-current" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Learn — Video Lessons &amp; Concept Explorer
            </h1>
            <p className="text-xs md:text-sm text-slate-400 mt-0.5">
              Watch interactive concept explainers, listen to voiceover lessons, and explore {profile.classLevel} chapters.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowInteractiveStudio(!showInteractiveStudio)}
            className="flex items-center gap-2 rounded-xl border border-blue-500/40 bg-blue-600/20 px-4 py-2.5 text-xs font-bold text-blue-300 hover:bg-blue-600/30 transition-all cursor-pointer"
          >
            <Film className="h-4 w-4" />
            <span>{showInteractiveStudio ? 'Show Chapter Lessons' : 'Interactive Video Studio'}</span>
          </button>
        </div>
      </div>

      {showInteractiveStudio ? (
        <ProgressView />
      ) : (
        <>
          {/* Featured Active Concept Video Player */}
          {activeLesson && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Video / Visual Concept Stage */}
              <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-[#0a1020] overflow-hidden flex flex-col justify-between shadow-xl">
                <div className="relative p-6 md:p-8 bg-gradient-to-br from-[#101c3d] via-[#0c1428] to-[#080d1a] min-h-[290px] flex flex-col justify-between border-b border-white/10">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-blue-300">
                      {activeLesson.subjectName} · {activeLesson.bookName} · Ch {activeLesson.chapterNumber}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Clock className="h-3.5 w-3.5 text-blue-400" />
                      {activeLesson.duration}
                    </span>
                  </div>

                  <div className="my-6 space-y-3">
                    <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                      {activeLesson.title}
                    </h2>
                    <p className="text-xs md:text-sm text-slate-300 leading-relaxed max-w-2xl">
                      {activeLesson.visualAnalogy}
                    </p>
                    <div className="pt-2 flex flex-wrap gap-2">
                      {activeLesson.keyTakeaways.map((pt, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          <span>{pt}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Interactive Playback Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10">
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsPlayingLesson(!isPlayingLesson);
                          handleToggleNarrate(activeLesson);
                        }}
                        className="flex items-center gap-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] px-4 py-2.5 text-xs font-bold text-white shadow-lg transition-all cursor-pointer"
                      >
                        {isSpeaking ? (
                          <>
                            <Pause className="h-4 w-4" /> Pause Audio Lesson
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 fill-current" /> Play Concept Lesson
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleNarrate(activeLesson)}
                        className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-2.5 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
                      >
                        {isSpeaking ? (
                          <>
                            <VolumeX className="h-4 w-4 text-rose-400" /> Mute Voiceover
                          </>
                        ) : (
                          <>
                            <Volume2 className="h-4 w-4 text-blue-400" /> Listen Voiceover
                          </>
                        )}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleMarkComplete(activeLesson.id)}
                      className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                        completedLessons.includes(activeLesson.id)
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-white/5 text-slate-300 border border-white/10 hover:border-emerald-500/40 hover:text-emerald-300'
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>
                        {completedLessons.includes(activeLesson.id) ? 'Completed (+10m)' : 'Mark Completed'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Quick Study Actions Bar */}
                <div className="p-4 bg-[#080d1a] flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Lightbulb className="h-4 w-4 text-amber-400" />
                    Deepen your understanding of <strong className="text-white">{activeLesson.title}</strong>:
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('/tutor')}
                      className="flex items-center gap-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 px-3 py-1.5 text-xs font-semibold text-blue-300 hover:bg-blue-600/30 transition-all cursor-pointer"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> Ask AI Tutor
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('/notes')}
                      className="flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-blue-400" /> Generate AI Notes
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('/practice')}
                      className="flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
                    >
                      <Dumbbell className="h-3.5 w-3.5 text-emerald-400" /> Practice Questions
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('/flashcards')}
                      className="flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
                    >
                      <Layers className="h-3.5 w-3.5 text-amber-400" /> Flashcards
                    </button>
                  </div>
                </div>
              </div>

              {/* Up Next Playlist Sidebar */}
              <div className="rounded-2xl border border-white/10 bg-[#0a1020] p-4 flex flex-col h-[390px]">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h3 className="text-sm font-bold text-white">
                    {profile.classLevel} Concept Playlist
                  </h3>
                  <span className="text-xs text-slate-400">{filteredLessons.length} lessons</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 mt-3 pr-1">
                  {filteredLessons.map((item) => {
                    const isCurrent = activeLesson?.id === item.id;
                    const isDone = completedLessons.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveLessonId(item.id)}
                        className={`w-full flex items-center justify-between rounded-xl p-3 text-left transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-[#1660d8] text-white shadow-md'
                            : 'bg-[#0e1629] text-slate-300 hover:bg-[#141f38] border border-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <div
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                              isCurrent ? 'bg-white/20 text-white' : 'bg-blue-500/15 text-blue-400'
                            }`}
                          >
                            {isDone ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : item.chapterNumber}
                          </div>
                          <div className="truncate">
                            <div className="text-xs font-bold truncate">{item.title}</div>
                            <div className={`text-[0.68rem] truncate ${isCurrent ? 'text-blue-100' : 'text-slate-400'}`}>
                              {item.subjectName} · {item.duration}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className={`h-4 w-4 shrink-0 ${isCurrent ? 'text-white' : 'text-slate-500'}`} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Subject Filter & Search Bar */}
          <div className="rounded-2xl border border-white/10 bg-[#0a1020] p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setSelectedSubject('all')}
                  className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                    selectedSubject === 'all'
                      ? 'bg-[#1660d8] text-white'
                      : 'bg-[#0e1629] text-slate-300 hover:text-white border border-white/10'
                  }`}
                >
                  All Subjects
                </button>
                {SUBJECT_OPTIONS.map((subj) => (
                  <button
                    key={subj.key}
                    type="button"
                    onClick={() => setSelectedSubject(subj.key)}
                    className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      selectedSubject === subj.key
                        ? 'bg-[#1660d8] text-white'
                        : 'bg-[#0e1629] text-slate-300 hover:text-white border border-white/10'
                    }`}
                  >
                    <span>{subj.icon}</span>
                    <span>{subj.label}</span>
                  </button>
                ))}
              </div>

              <div className="relative min-w-[240px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search chapters & concepts..."
                  className="w-full rounded-xl border border-white/10 bg-[#070b16] pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Grid of All Concept Lessons */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredLessons.map((lesson) => {
                const isDone = completedLessons.includes(lesson.id);
                return (
                  <div
                    key={lesson.id}
                    onClick={() => {
                      setActiveLessonId(lesson.id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="group cursor-pointer rounded-2xl border border-white/10 bg-[#0d152a] p-4 hover:border-blue-500/50 hover:bg-[#111c38] transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[0.68rem] text-slate-400 mb-2">
                        <span className="font-semibold text-blue-400">
                          {lesson.subjectName} · Ch {lesson.chapterNumber}
                        </span>
                        <span>{lesson.duration}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                        {lesson.title}
                      </h4>
                      <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                        {lesson.bookName} — Interactive concept overview &amp; exam takeaways
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 group-hover:text-blue-300">
                        <Play className="h-3.5 w-3.5 fill-current" /> Watch &amp; Listen
                      </span>
                      {isDone && (
                        <span className="text-[0.68rem] font-semibold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Completed
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
