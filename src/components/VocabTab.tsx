'use client';

import React, { useState, useEffect } from 'react';
import { 
  VocabItem, 
  SentenceExample 
} from '@/data/vocabData';
import { 
  Volume2, 
  Heart, 
  CheckCircle, 
  BookOpen, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles,
  Award,
  Gauge,
  Highlighter
} from 'lucide-react';
import { speakTextWithCache } from '@/lib/tts';

interface VocabTabProps {
  vocabList: VocabItem[];
  learnedIds: string[];
  favorites: Record<string, string>;
  onToggleLearned: (id: string, learned: boolean) => void;
  onToggleFavorite: (id: string, favorite: boolean) => void;
  onSelectVocab: (item: VocabItem) => void;
  selectedVoiceURI: string;
}

interface HoverTooltip {
  word: string;
  partOfSpeech?: string;
  translation?: string;
  definition?: string;
  grammarNote?: string;
  x: number;
  y: number;
}

// Client-side dictionary cache for 0ms hover latency
const clientDictCache = new Map<string, any>();

export const VocabTab: React.FC<VocabTabProps> = ({
  vocabList,
  learnedIds,
  favorites,
  onToggleLearned,
  onToggleFavorite,
  onSelectVocab,
  selectedVoiceURI
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [userQuizAnswers, setUserQuizAnswers] = useState<Record<number, number>>({});
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [hoverTooltip, setHoverTooltip] = useState<HoverTooltip | null>(null);

  const categories = ['ALL', ...Array.from(new Set(vocabList.map(v => v.category)))];

  const filteredVocab = selectedCategory === 'ALL' 
    ? vocabList 
    : vocabList.filter(v => v.category === selectedCategory);

  const currentItem = filteredVocab[currentIndex] || filteredVocab[0];

  const playSpeech = (text: string) => {
    speakTextWithCache(text, speechRate, selectedVoiceURI);
  };

  useEffect(() => {
    if (learnedIds.length > 0 && learnedIds.length % 20 === 0 && !isQuizModalOpen) {
      setIsQuizModalOpen(true);
    }
  }, [learnedIds.length]);

  const handleNextCard = () => {
    if (currentIndex < filteredVocab.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const handlePrevCard = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    } else {
      setCurrentIndex(filteredVocab.length - 1);
    }
  };

  // Hover or Text Selection Lookup with 0ms Client Cache
  const handleWordHover = async (e: React.MouseEvent<HTMLSpanElement>, cleanWord: string, context?: string) => {
    if (!cleanWord || cleanWord.length < 2) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const cacheKey = cleanWord.toLowerCase();

    if (clientDictCache.has(cacheKey)) {
      const cached = clientDictCache.get(cacheKey);
      setHoverTooltip({
        word: cleanWord,
        partOfSpeech: cached.partOfSpeech,
        translation: cached.englishTranslation,
        definition: cached.germanDefinition,
        grammarNote: cached.grammarNote,
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY - 85
      });
      return;
    }

    setHoverTooltip({
      word: cleanWord,
      translation: 'Lädt Übersetzung...',
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY - 85
    });

    try {
      const res = await fetch('/api/dictionary/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: cleanWord, contextSentence: context })
      });
      const data = await res.json();
      clientDictCache.set(cacheKey, data);

      setHoverTooltip({
        word: cleanWord,
        partOfSpeech: data.partOfSpeech,
        translation: data.englishTranslation,
        definition: data.germanDefinition,
        grammarNote: data.grammarNote,
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY - 85
      });
    } catch (err) {
      setHoverTooltip(null);
    }
  };

  const renderInteractiveText = (text: string, context?: string) => {
    if (!text) return null;
    const words = text.split(/(\s+)/);

    return words.map((chunk, idx) => {
      if (/^\s+$/.test(chunk)) return <span key={idx}>{chunk}</span>;
      const cleanWord = chunk.replace(/[.,/#!$%^&*;:{}=\-_`~()"?]/g, '');

      return (
        <span
          key={idx}
          onMouseEnter={(e) => handleWordHover(e, cleanWord, context)}
          onMouseLeave={() => setHoverTooltip(null)}
          className="hover-word"
          title="Hover: Übersetzung anzeigen"
        >
          {chunk}
        </span>
      );
    });
  };

  if (!currentItem) {
    return <div className="p-8 text-center text-charcoal-900 font-serif text-lg">Keine Wörter gefunden.</div>;
  }

  const isLearned = learnedIds.includes(currentItem.id);
  const isFav = currentItem.id in favorites;

  const quizItems = vocabList.slice(0, 5);

  const submitQuiz = () => {
    let score = 0;
    quizItems.forEach((item, idx) => {
      if (userQuizAnswers[idx] === 0) score++;
    });
    setQuizScore(score);
  };

  const speeds = [0.5, 0.75, 1.0, 1.25, 1.5];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 relative">
      {/* Floating Hover Tooltip showing English Translation + German Context */}
      {hoverTooltip && (
        <div 
          style={{ top: `${hoverTooltip.y}px`, left: `${hoverTooltip.x}px` }}
          className="fixed z-50 bg-cream-900 text-cream-50 p-3.5 rounded-2xl shadow-2xl border border-gold-500/40 text-xs max-w-xs pointer-events-none transform -translate-x-1/2 transition-opacity"
        >
          <div className="flex items-center justify-between border-b border-gold-500/30 pb-1 mb-1">
            <strong className="text-gold-400 font-serif text-sm">{hoverTooltip.word}</strong>
            {hoverTooltip.partOfSpeech && <span className="text-[10px] text-cream-300 uppercase">{hoverTooltip.partOfSpeech}</span>}
          </div>
          <div className="text-cream-50 font-bold text-sm mb-1">{hoverTooltip.translation}</div>
          {hoverTooltip.definition && <div className="text-[11px] text-cream-200 italic">{hoverTooltip.definition}</div>}
          {hoverTooltip.grammarNote && <div className="text-[10px] text-gold-400/80 mt-1">{hoverTooltip.grammarNote}</div>}
        </div>
      )}

      {/* Top Banner & Category Chips */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-cream-50 p-6 rounded-3xl border border-cream-300/80 shadow-soft">
        <div>
          <span className="text-xs font-semibold text-gold-700 uppercase tracking-widest">Wortschatz, Verben & Nomen</span>
          <h2 className="font-serif text-3xl font-bold text-charcoal-900 mt-1">Lernkarten</h2>
          <p className="text-xs text-cream-800 mt-1">Bewege die Maus über ein Wort für Übersetzung, Definition & Grammatik-Seitenleiste.</p>
        </div>

        {/* Speed Rate Control Toggle */}
        <div className="bg-cream-100 p-2 rounded-2xl border border-cream-300 flex items-center gap-1.5 shadow-sm">
          <Gauge size={16} className="text-gold-700 ml-1" />
          <span className="text-[11px] font-bold text-charcoal-900 uppercase mr-1">Tempo:</span>
          {speeds.map(sp => (
            <button
              key={sp}
              onClick={() => setSpeechRate(sp)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                speechRate === sp 
                  ? 'bg-cream-900 text-gold-400 shadow-sm' 
                  : 'text-charcoal-800 hover:bg-cream-200'
              }`}
            >
              {sp}x
            </button>
          ))}
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setSelectedCategory(cat);
              setCurrentIndex(0);
            }}
            className={`
              px-3.5 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all border
              ${selectedCategory === cat 
                ? 'bg-cream-900 text-gold-400 border-gold-500/40 shadow-sm' 
                : 'bg-cream-100 text-charcoal-800 border-cream-300 hover:bg-cream-200'}
            `}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Main Flashcard Container */}
      <div className="bg-cream-50 rounded-3xl border border-cream-300 p-6 sm:p-8 shadow-elevated transition-all relative">
        <div className="flex items-center justify-between pb-6 border-b border-cream-200">
          <div className="flex items-center gap-2.5">
            <span className="px-3 py-1 bg-cream-900 text-gold-400 rounded-xl text-xs font-bold uppercase tracking-wider">
              {currentItem.level}
            </span>
            <span className="px-3 py-1 bg-cream-200 text-charcoal-800 rounded-xl text-xs font-semibold">
              {currentItem.category}
            </span>
            <span className="px-3 py-1 bg-gold-500/20 text-gold-700 rounded-xl text-xs font-bold border border-gold-500/30 uppercase">
              {currentItem.type} (Grammatik in Seitenleiste)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleFavorite(currentItem.id, !isFav)}
              className={`p-2.5 rounded-2xl border transition-colors ${
                isFav 
                  ? 'bg-rose-50 text-rose-600 border-rose-200' 
                  : 'bg-cream-100 text-cream-800 border-cream-300 hover:bg-cream-200'
              }`}
              title="Favorit speichern"
            >
              <Heart size={18} fill={isFav ? 'currentColor' : 'none'} />
            </button>

            <button
              onClick={() => onToggleLearned(currentItem.id, !isLearned)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold border flex items-center gap-1.5 transition-colors ${
                isLearned 
                  ? 'bg-emerald-900 text-emerald-300 border-emerald-700' 
                  : 'bg-cream-100 text-charcoal-900 border-cream-300 hover:bg-cream-200'
              }`}
            >
              <CheckCircle size={16} />
              {isLearned ? 'Gelernt' : 'Als gelernt markieren'}
            </button>
          </div>
        </div>

        <div className="py-8 flex flex-col items-center text-center">
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-4xl sm:text-5xl font-bold text-charcoal-900 tracking-tight">
              {currentItem.article && <span className="text-gold-700 font-normal mr-2">{currentItem.article}</span>}
              {currentItem.word}
            </h1>
            <button
              onClick={() => playSpeech(currentItem.word)}
              className="p-3 bg-cream-900 text-gold-400 hover:bg-charcoal-900 rounded-2xl shadow-md transition-transform hover:scale-105 flex items-center gap-1"
              title="Aussprache anhören (Cached)"
            >
              <Volume2 size={22} />
              <span className="text-[10px] font-bold uppercase tracking-wider">{speechRate}x</span>
            </button>
          </div>

          <p className="text-lg text-cream-800 mt-2 font-serif italic">
            "{currentItem.translation}"
          </p>

          <button
            onClick={() => onSelectVocab(currentItem)}
            className="mt-4 px-4 py-2 bg-cream-200 hover:bg-cream-300 text-charcoal-900 rounded-xl text-xs font-bold flex items-center gap-2 border border-cream-300 transition-colors"
          >
            <BookOpen size={15} className="text-gold-600" />
            Rechte Seitenleiste: {currentItem.type === 'verb' ? 'Konjugationen' : 'Kasus Deklinationen'} anzeigen
          </button>
        </div>

        {/* 5 Sentence Options with Hover Translation & Voice Buttons */}
        <div className="space-y-3 pt-6 border-t border-cream-200">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-bold text-charcoal-900 uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={14} className="text-gold-600" /> 5 Beispielsätze (Hover über ein Wort für Übersetzung)
            </div>
            <span className="text-[10px] font-semibold text-cream-800 italic">Tempo: {speechRate}x (Cached)</span>
          </div>

          {currentItem.sentences.map((sent: SentenceExample, idx: number) => (
            <div 
              key={idx}
              className="p-4 bg-cream-100/90 rounded-2xl border border-cream-300/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-gold-500/40 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-cream-900 text-gold-400 rounded-md uppercase tracking-wider">
                    {sent.tenseOrCase}
                  </span>
                  <p className="text-sm font-semibold text-charcoal-900">
                    {renderInteractiveText(sent.german, sent.german)}
                  </p>
                </div>
                <p className="text-xs text-cream-800 italic pl-1">{sent.english}</p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  onClick={() => playSpeech(sent.german)}
                  className="p-2.5 bg-cream-50 hover:bg-cream-900 hover:text-gold-400 text-charcoal-900 rounded-xl border border-cream-300 transition-colors flex items-center gap-1.5 font-bold text-xs"
                  title="Satz mit Cache vorlesen"
                >
                  <Volume2 size={16} />
                  <span className="text-[10px]">{speechRate}x</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-8 pt-6 border-t border-cream-200">
          <button
            onClick={handlePrevCard}
            className="px-5 py-2.5 bg-cream-200 hover:bg-cream-300 text-charcoal-900 rounded-2xl text-xs font-bold flex items-center gap-2 border border-cream-300 transition-colors"
          >
            <ChevronLeft size={16} /> Vorherige Karte
          </button>

          <span className="text-xs font-semibold text-cream-800">
            {currentIndex + 1} von {filteredVocab.length}
          </span>

          <button
            onClick={handleNextCard}
            className="px-5 py-2.5 bg-cream-900 hover:bg-charcoal-900 text-gold-400 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-md transition-colors font-bold"
          >
            Nächste Karte <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* 20-Word Milestone Quiz Modal */}
      {isQuizModalOpen && (
        <div className="fixed inset-0 z-50 bg-charcoal-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-cream-50 rounded-3xl border border-gold-500/40 p-6 sm:p-8 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-6">
            <div className="text-center pb-4 border-b border-cream-200">
              <div className="w-14 h-14 bg-cream-900 text-gold-400 rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-md border border-gold-500/30">
                <Award size={28} />
              </div>
              <h2 className="font-serif text-2xl font-bold text-charcoal-900">20 Wörter Absolviert! Quizzeit</h2>
              <p className="text-xs text-cream-800 mt-1">Überprüfe dein Wissen zu den gelernten Wörtern.</p>
            </div>

            {quizScore !== null ? (
              <div className="text-center space-y-4 py-6">
                <div className="text-4xl font-serif font-bold text-gold-700">
                  {quizScore} / {quizItems.length} Richtig
                </div>
                <p className="text-xs text-charcoal-900">
                  {quizScore >= 4 ? 'Hervorragende Leistung! Du machst fantastische Fortschritte.' : 'Gute Arbeit! Wiederhole noch etwas die Beispielsätze.'}
                </p>
                <button
                  onClick={() => {
                    setIsQuizModalOpen(false);
                    setQuizScore(null);
                  }}
                  className="px-6 py-3 bg-cream-900 text-gold-400 font-bold text-xs rounded-2xl shadow-md hover:bg-charcoal-900 transition-colors font-bold"
                >
                  Weiterlernen
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {quizItems.map((q, qIdx) => (
                  <div key={q.id} className="p-4 bg-cream-100 rounded-2xl border border-cream-300">
                    <p className="text-xs font-bold text-charcoal-900 mb-2">
                      {qIdx + 1}. Was bedeutet das Wort <strong>"{q.word}"</strong>?
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {[q.translation, 'to go away', 'to sleep well', 'to write a letter'].map((opt, oIdx) => (
                        <button
                          key={oIdx}
                          onClick={() => setUserQuizAnswers(prev => ({ ...prev, [qIdx]: oIdx }))}
                          className={`p-2.5 rounded-xl border text-left font-semibold transition-all ${
                            userQuizAnswers[qIdx] === oIdx
                              ? 'bg-cream-900 text-gold-400 border-gold-500'
                              : 'bg-cream-50 text-charcoal-900 border-cream-300 hover:bg-cream-200'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                <button
                  onClick={submitQuiz}
                  className="w-full py-3.5 bg-cream-900 hover:bg-charcoal-900 text-gold-400 font-bold text-xs rounded-2xl shadow-md transition-colors font-bold"
                >
                  Quiz Einreichen & Ergebis Speichern
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

function learnedCountForDisplay(count: number) {
  const nextTarget = Math.ceil((count + 1) / 20) * 20;
  return `${count} / ${nextTarget} (Quiz bei ${nextTarget})`;
}
