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

const defaultDecks: Record<string, Flashcard[]> = {
  'Physics & Motion': [
    {
      id: 1,
      front: "What is Newton's First Law of Motion (Law of Inertia)?",
      back: 'An object will remain at rest or continue to move at a constant velocity unless acted upon by an external net force.',
      tip: 'Inertia depends directly on the mass of the object.',
      category: 'Physics',
    },
    {
      id: 2,
      front: 'Write the 3rd equation of motion and condition for applicability.',
      back: 'v² = u² + 2as (where v is final velocity, u is initial velocity, a is acceleration, s is displacement).',
      tip: 'Only valid for constant/uniform acceleration along a straight line.',
      category: 'Physics',
    },
    {
      id: 3,
      front: 'What is the relationship between Work and Kinetic Energy?',
      back: 'Work-Energy Theorem: Total work done on an object by all forces equals the change in its kinetic energy (W = ΔK = ½mv² - ½mu²).',
      tip: 'Can be applied to both constant and variable forces.',
      category: 'Physics',
    },
    {
      id: 4,
      front: 'What is Snell’s Law of Refraction?',
      back: 'n₁ · sin(θ₁) = n₂ · sin(θ₂), where n is refractive index and θ is the angle with the normal.',
      tip: 'When light moves from rarer to denser medium, it bends TOWARD the normal.',
      category: 'Physics',
    },
    {
      id: 5,
      front: 'What is Electric Power in terms of current and resistance?',
      back: 'P = V · I = I² · R = V² / R. Measured in Watts (Joules per second).',
      tip: 'In series circuits, use P = I²R; in parallel, use P = V²/R.',
      category: 'Physics',
    },
  ],
  'Chemistry & Periodic Table': [
    {
      id: 101,
      front: 'Why do noble gases (Group 18) have very low chemical reactivity?',
      back: 'They have a completely filled valence electron shell (octet or duplet in He), giving them extraordinary thermodynamic stability.',
      tip: 'He, Ne, Ar, Kr, Xe, Rn.',
      category: 'Chemistry',
    },
    {
      id: 102,
      front: 'What is the difference between Oxidation and Reduction (OIL RIG)?',
      back: 'Oxidation Is Loss of electrons (increase in oxidation number); Reduction Is Gain of electrons (decrease in oxidation number).',
      tip: 'Mnemonic: OIL RIG (Oxidation Is Loss, Reduction Is Gain).',
      category: 'Chemistry',
    },
    {
      id: 103,
      front: 'What happens to atomic radius across a period from left to right?',
      back: 'Atomic radius DECREASES across a period because effective nuclear charge increases while electrons are added to the same energy shell.',
      tip: 'Fluorine has a smaller radius than Lithium.',
      category: 'Chemistry',
    },
    {
      id: 104,
      front: 'What is Le Chatelier’s Principle?',
      back: 'If a dynamic equilibrium is disturbed by changing conditions (temperature, pressure, concentration), the position of equilibrium shifts to counteract the change.',
      tip: 'Increasing pressure shifts equilibrium to the side with fewer gas moles.',
      category: 'Chemistry',
    },
  ],
  'Biology Essentials': [
    {
      id: 201,
      front: 'Why is ATP called the energy currency of the cell?',
      back: 'Adenosine Triphosphate stores readily usable chemical energy in its high-energy phosphoanhydride bonds, released when hydrolyzed to ADP + Pi.',
      tip: 'Produced in mitochondria during oxidative phosphorylation.',
      category: 'Biology',
    },
    {
      id: 202,
      front: 'What are the 4 main blood groups in the ABO system?',
      back: 'A, B, AB, and O. Determined by presence or absence of A and B antigens on red blood cell membranes.',
      tip: 'O- is universal donor; AB+ is universal recipient.',
      category: 'Biology',
    },
    {
      id: 203,
      front: 'What is the main function of the Xylem vs Phloem in plants?',
      back: 'Xylem transports water and dissolved minerals unidirectionally from roots to leaves. Phloem translocates sucrose and organic nutrients bidirectionally.',
      tip: 'Xylem = water (upward); Phloem = food (all directions).',
      category: 'Biology',
    },
  ],
};

export const FlashcardsView: React.FC = () => {
  const { profile, addStars, addStudyMinutes } = useStudy();

  const [activeDeckName, setActiveDeckName] = useState<string>('Physics & Motion');
  const [cards, setCards] = useState<Flashcard[]>(defaultDecks['Physics & Motion']);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredIds, setMasteredIds] = useState<number[]>([]);

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
