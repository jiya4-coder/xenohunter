import React, { useState } from 'react';
import { useStudy } from '../context/StudyContext';
import {
  Layers,
  Sparkles,
  RotateCw,
  CheckCircle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Lightbulb,
  Plus,
  Loader2,
  Trophy,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Flashcard } from '../types';
import { safeFetchJson } from '../utils/api';
import { getUserItem, setUserItem } from '../utils/userStorage';

const defaultDecks: Record<string, Flashcard[]> = {};

export const FlashcardsView: React.FC = () => {
  const { profile, addStars, addStudyMinutes } = useStudy();

  const [activeDeckName, setActiveDeckName] = useState<string>(() => {
    return getUserItem('studybot_flashcards_deck_name') || '';
  });
  const [cards, setCards] = useState<Flashcard[]>(() => {
    try {
      const saved = getUserItem('studybot_flashcards_cards');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredIds, setMasteredIds] = useState<number[]>(() => {
    try {
      const saved = getUserItem('studybot_flashcards_mastered');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  React.useEffect(() => {
    setUserItem('studybot_flashcards_deck_name', activeDeckName);
    setUserItem('studybot_flashcards_cards', JSON.stringify(cards));
    setUserItem('studybot_flashcards_mastered', JSON.stringify(masteredIds));
    window.dispatchEvent(new Event('studybot:study-log-updated'));
  }, [activeDeckName, cards, masteredIds]);

  React.useEffect(() => {
    const handleClear = () => {
      setActiveDeckName('');
      setCards([]);
      setCurrentIndex(0);
      setIsFlipped(false);
      setMasteredIds([]);
    };
    const handleUserReload = () => {
      setActiveDeckName(getUserItem('studybot_flashcards_deck_name') || '');
      try {
        const savedCards = getUserItem('studybot_flashcards_cards');
        setCards(savedCards ? JSON.parse(savedCards) : []);
      } catch {
        setCards([]);
      }
      try {
        const savedMastered = getUserItem('studybot_flashcards_mastered');
        setMasteredIds(savedMastered ? JSON.parse(savedMastered) : []);
      } catch {
        setMasteredIds([]);
      }
    };
    window.addEventListener('studybot:data-cleared', handleClear);
    window.addEventListener('studybot:user-changed', handleUserReload);
    return () => {
      window.removeEventListener('studybot:data-cleared', handleClear);
      window.removeEventListener('studybot:user-changed', handleUserReload);
    };
  }, []);

  // Generation state
  const [customTopic, setCustomTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTopic.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const fallbackDeck: Flashcard[] = [
        {
          id: 1,
          front: `What is the core definition of "${customTopic.trim()}"?`,
          back: `In ${profile.classLevel} syllabus, this concept is central to understanding the chapter fundamentals.`,
          tip: 'Review this definition before school exams.',
          category: customTopic.trim(),
        },
        {
          id: 2,
          front: `State one key property or rule of "${customTopic.trim()}".`,
          back: 'It follows the standard curriculum laws and syllabus formulas.',
          tip: 'Always write SI units in numericals.',
          category: customTopic.trim(),
        },
      ];

      const data = await safeFetchJson<Flashcard[]>(
        '/api/generate-flashcards',
        {
          method: 'POST',
          body: JSON.stringify({
            topic: customTopic.trim(),
            count: 8,
            studentProfile: profile,
          }),
        },
        fallbackDeck
      );

      const loadedDeck = Array.isArray(data) && data.length > 0 ? data : fallbackDeck;
      setCards(loadedDeck);
      setActiveDeckName(customTopic.trim());
      setCurrentIndex(0);
      setIsFlipped(false);
      setMasteredIds([]);
      setCustomTopic('');
      addStars(10);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Could not generate flashcards. Try another topic.');
    } finally {
      setLoading(false);
    }
  };

  const currentCard = cards[currentIndex];

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const handleMarkMastered = () => {
    if (!currentCard) return;
    if (!masteredIds.includes(currentCard.id)) {
      setMasteredIds((prev) => [...prev, currentCard.id]);
      addStars(3);
      addStudyMinutes(1);
      if (masteredIds.length + 1 === cards.length) {
        try {
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        } catch {}
      }
    }
    handleNext();
  };

  const handleDeckSelect = (deckKey: string) => {
    setActiveDeckName(deckKey);
    setCards(defaultDecks[deckKey]);
    setCurrentIndex(0);
    setIsFlipped(false);
    setMasteredIds([]);
  };

  return (
    <div className="h-[calc(100vh-4rem)] overflow-y-auto bg-background p-4 md:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="glass-badge">
                <Sparkles className="h-3 w-3 text-amber-400" /> ACTIVE RECALL
              </span>
              <span className="text-xs text-muted-foreground">Class {profile.classLevel} · Smart Flashcards</span>
            </div>
            <h1 className="mt-1 text-2xl md:text-3xl font-extrabold text-foreground">
              Smart Flashcards
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              Flip to test yourself, remember core concepts, and track mastered facts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold">Mastered:</span>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {masteredIds.length} / {cards.length}
            </span>
          </div>
        </div>

        {/* Deck Selector & AI Creator */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {Object.keys(defaultDecks).map((name) => (
              <button
                key={name}
                onClick={() => handleDeckSelect(name)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  activeDeckName === name
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-card border border-border text-slate-300 hover:border-slate-500'
                }`}
              >
                {name}
              </button>
            ))}
          </div>

          {/* AI Generator Input */}
          <form onSubmit={handleGenerateDeck} className="flex gap-2">
            <input
              type="text"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              placeholder="Or enter any topic for instant AI flashcards (e.g. Optics, Trigonometry, World War II)..."
              className="flex-1 rounded-xl border border-[oklch(27%_0.03_264)] bg-[oklch(14%_0.02_264)] px-3.5 py-2 text-xs md:text-sm text-white focus:border-purple-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !customTopic.trim()}
              className="btn-mint !py-2 !px-4 text-xs font-bold disabled:opacity-40"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate
            </button>
          </form>
          {error && <p className="text-xs text-rose-400">{error}</p>}
        </div>

        {/* 3D Flip Flashcard */}
        {currentCard ? (
          <div className="space-y-4">
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className="perspective-1000 min-h-[300px] md:min-h-[340px] cursor-pointer select-none"
            >
              <div
                className={`relative h-full w-full rounded-3xl border border-purple-500/40 p-6 md:p-10 shadow-2xl transition-all duration-500 transform-style-3d ${
                  isFlipped ? 'bg-gradient-to-br from-indigo-950/80 to-purple-900/60' : 'bg-[oklch(17.5%_0.025_264)]'
                }`}
              >
                {/* Badge & flip tip */}
                <div className="flex items-center justify-between text-xs text-slate-400 mb-6">
                  <span className="font-bold uppercase tracking-wider text-purple-400">
                    Card {currentIndex + 1} of {cards.length} · {currentCard.category || activeDeckName}
                  </span>
                  <span className="flex items-center gap-1 text-[0.7rem] text-slate-400">
                    <RotateCw className="h-3.5 w-3.5 text-purple-400" /> Tap anywhere to flip
                  </span>
                </div>

                {/* Card Content */}
                <div className="flex min-h-[170px] flex-col justify-center items-center text-center">
                  {!isFlipped ? (
                    <div>
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 block">
                        Question / Prompt
                      </span>
                      <h3 className="text-xl md:text-2xl font-bold text-white leading-relaxed">
                        {currentCard.front}
                      </h3>
                    </div>
                  ) : (
                    <div>
                      <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-2 block">
                        Answer & Key Concept
                      </span>
                      <p className="text-base md:text-lg text-slate-100 leading-relaxed font-medium">
                        {currentCard.back}
                      </p>
                      {currentCard.tip && (
                        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-purple-500/20 px-3 py-1 text-xs text-purple-300 border border-purple-500/30">
                          <Lightbulb className="h-3.5 w-3.5 text-amber-300" /> {currentCard.tip}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Bottom status */}
                <div className="mt-6 flex items-center justify-between text-xs border-t border-white/10 pt-4">
                  <span className="text-slate-400">
                    {isFlipped ? '🧠 Concept verified' : '🤔 Think of the answer first'}
                  </span>
                  {masteredIds.includes(currentCard.id) && (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5" /> Mastered
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation and Mastery controls */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={handlePrev}
                className="chip !py-2.5 !px-4 text-xs"
              >
                <ArrowLeft className="h-4 w-4" /> Prev
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleNext}
                  className="rounded-full border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
                >
                  Need Review
                </button>
                <button
                  onClick={handleMarkMastered}
                  className="flex items-center gap-1.5 rounded-full bg-emerald-600/20 border border-emerald-500/50 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-600/30 transition-all"
                >
                  <CheckCircle className="h-3.5 w-3.5" /> Got It!
                </button>
              </div>

              <button
                onClick={handleNext}
                className="btn-mint !py-2.5 !px-4 !text-xs"
              >
                Next <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400">
            No cards in this deck. Try picking another deck above.
          </div>
        )}
      </div>
    </div>
  );
};
