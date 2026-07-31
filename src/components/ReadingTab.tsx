'use client';

import React, { useState, useEffect } from 'react';
import { 
  Newspaper, 
  Sparkles, 
  RefreshCw, 
  CheckCircle2, 
  HelpCircle, 
  Bot, 
  CheckCircle,
  Award
} from 'lucide-react';

interface ReadingTabProps {
  onWordLeftClick: (word: string) => void;
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

export const ReadingTab: React.FC<ReadingTabProps> = ({ onWordLeftClick }) => {
  const [topic, setTopic] = useState<string>('Nachrichten');
  const [passage, setPassage] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [gradingResult, setGradingResult] = useState<any>(null);
  const [isGrading, setIsGrading] = useState<boolean>(false);
  const [hoverTooltip, setHoverTooltip] = useState<HoverTooltip | null>(null);

  const topics = ['Nachrichten', 'Sport', 'Unterhaltung', 'Politik', 'Technologie', 'Alltag'];

  const fetchPassage = async (selectedTopic: string) => {
    setIsLoading(true);
    setGradingResult(null);
    setUserAnswers({});
    try {
      const res = await fetch('/api/reading/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: selectedTopic })
      });
      const data = await res.json();
      setPassage(data);
    } catch (err) {
      console.error('Failed to fetch passage:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPassage(topic);
  }, []);

  // Hover or Underline word lookup
  const handleWordHover = async (e: React.MouseEvent<HTMLSpanElement>, cleanWord: string) => {
    if (!cleanWord || cleanWord.length < 2) return;

    const rect = e.currentTarget.getBoundingClientRect();
    
    // Set immediate position placeholder
    setHoverTooltip({
      word: cleanWord,
      translation: 'Lädt Übersetzung...',
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY - 80
    });

    try {
      const res = await fetch('/api/dictionary/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: cleanWord, contextSentence: passage?.content?.slice(0, 150) })
      });
      const data = await res.json();

      setHoverTooltip({
        word: cleanWord,
        partOfSpeech: data.partOfSpeech,
        translation: data.englishTranslation,
        definition: data.germanDefinition,
        grammarNote: data.grammarNote,
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY - 90
      });
    } catch (err) {
      setHoverTooltip(null);
    }
  };

  const handleWordMouseLeave = () => {
    setHoverTooltip(null);
  };

  const handleSubmitAnswers = async () => {
    if (!passage) return;
    setIsGrading(true);
    try {
      const res = await fetch('/api/reading/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passageId: passage.id,
          passageContent: passage.content,
          questions: passage.questions,
          userAnswers
        })
      });
      const data = await res.json();
      setGradingResult(data);
    } catch (err) {
      console.error('Grading error:', err);
    } finally {
      setIsGrading(false);
    }
  };

  // Render passage with wrap words for hover & left-click
  const renderInteractivePassage = (text: string) => {
    if (!text) return null;
    const words = text.split(/(\s+)/);

    return words.map((chunk, idx) => {
      if (/^\s+$/.test(chunk)) return <span key={idx}>{chunk}</span>;
      const cleanWord = chunk.replace(/[.,/#!$%^&*;:{}=\-_`~()"?]/g, '');

      return (
        <span
          key={idx}
          onClick={() => onWordLeftClick(cleanWord)}
          onMouseEnter={(e) => handleWordHover(e, cleanWord)}
          onMouseLeave={handleWordMouseLeave}
          className="hover-word"
          title="Links-Klick: KI Tutor fragen | Hover: Schnell-Übersetzung"
        >
          {chunk}
        </span>
      );
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 relative">
      {/* Floating Hover Tooltip */}
      {hoverTooltip && (
        <div 
          style={{ top: `${hoverTooltip.y}px`, left: `${hoverTooltip.x}px` }}
          className="fixed z-50 bg-cream-900 text-cream-50 p-3.5 rounded-2xl shadow-2xl border border-gold-500/40 text-xs max-w-xs pointer-events-none transform -translate-x-1/2 transition-opacity"
        >
          <div className="flex items-center justify-between border-b border-gold-500/30 pb-1 mb-1">
            <strong className="text-gold-400 font-serif text-sm">{hoverTooltip.word}</strong>
            {hoverTooltip.partOfSpeech && <span className="text-[10px] text-cream-300 uppercase">{hoverTooltip.partOfSpeech}</span>}
          </div>
          <div className="text-cream-50 font-semibold mb-1">{hoverTooltip.translation}</div>
          {hoverTooltip.grammarNote && <div className="text-[11px] text-cream-300 italic">{hoverTooltip.grammarNote}</div>}
          <div className="text-[10px] text-gold-400/80 mt-1">Links-Klick zum Chatten mit KI-Tutor</div>
        </div>
      )}

      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-cream-50 p-6 rounded-3xl border border-cream-300/80 shadow-soft">
        <div>
          <span className="text-xs font-semibold text-gold-700 uppercase tracking-widest">Echtzeit Leseverstehen</span>
          <h2 className="font-serif text-3xl font-bold text-charcoal-900 mt-1">KI Lesetexte & Interaktive Wörter</h2>
          <p className="text-xs text-cream-800 mt-1">Bewege die Maus über ein Wort für Schnell-Bedeutung oder klicke links, um den KI Tutor zu befragen.</p>
        </div>

        <button
          onClick={() => fetchPassage(topic)}
          disabled={isLoading}
          className="px-5 py-3 bg-cream-900 hover:bg-charcoal-900 text-gold-400 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-md transition-all border border-gold-500/30"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          Neuen Text Generieren
        </button>
      </div>

      {/* Topic Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {topics.map((t) => (
          <button
            key={t}
            onClick={() => {
              setTopic(t);
              fetchPassage(t);
            }}
            className={`
              px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all border
              ${topic === t 
                ? 'bg-cream-900 text-gold-400 border-gold-500/40 shadow-sm' 
                : 'bg-cream-100 text-charcoal-800 border-cream-300 hover:bg-cream-200'}
            `}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Passage Display Card */}
      {isLoading ? (
        <div className="bg-cream-50 rounded-3xl border border-cream-300 p-12 text-center space-y-3">
          <RefreshCw size={32} className="animate-spin text-gold-600 mx-auto" />
          <h3 className="font-serif font-bold text-xl text-charcoal-900">Gemini generiert einen aktuellen Text...</h3>
          <p className="text-xs text-cream-800">Aktuelle Themen aus {topic} werden mit reichhaltigem Wortschatz strukturiert.</p>
        </div>
      ) : passage ? (
        <div className="bg-cream-50 rounded-3xl border border-cream-300 p-6 sm:p-8 shadow-elevated space-y-6">
          <div className="border-b border-cream-200 pb-4">
            <span className="px-3 py-1 bg-cream-200 text-charcoal-900 rounded-xl text-xs font-bold uppercase tracking-wider">
              {passage.topic}
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-charcoal-900 mt-2">
              {passage.title}
            </h1>
          </div>

          {/* Interactive Paragraph Body */}
          <div className="prose text-charcoal-900 leading-relaxed text-base sm:text-lg font-serif space-y-4">
            {passage.content.split('\n\n').map((paragraph: string, pIdx: number) => (
              <p key={pIdx} className="bg-cream-100/50 p-4 rounded-2xl border border-cream-200/60">
                {renderInteractivePassage(paragraph)}
              </p>
            ))}
          </div>

          {/* Structured Comprehension Questions */}
          <div className="pt-8 border-t border-cream-200 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-2xl font-bold text-charcoal-900">Verständnisfragen zum Text</h3>
              <span className="text-xs text-cream-800">5 Fragen mit KI-Bewertung</span>
            </div>

            {passage.questions?.map((q: any, qIdx: number) => (
              <div key={q.id || qIdx} className="p-5 bg-cream-100/90 rounded-2xl border border-cream-300/80 space-y-3">
                <p className="text-sm font-bold text-charcoal-900">
                  {qIdx + 1}. {q.questionGerman}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {q.options?.map((opt: string, oIdx: number) => {
                    const optKey = String.fromCharCode(65 + oIdx); // 'A', 'B', 'C', 'D'
                    const isSelected = userAnswers[q.id || `q${qIdx + 1}`] === optKey;

                    return (
                      <button
                        key={oIdx}
                        onClick={() => setUserAnswers(prev => ({ ...prev, [q.id || `q${qIdx + 1}`]: optKey }))}
                        className={`p-3 rounded-xl border text-left font-semibold transition-all ${
                          isSelected
                            ? 'bg-cream-900 text-gold-400 border-gold-500 shadow-sm'
                            : 'bg-cream-50 text-charcoal-900 border-cream-300 hover:bg-cream-200'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Grading Results Display */}
            {gradingResult && (
              <div className="bg-cream-900 text-cream-50 p-6 rounded-3xl border border-gold-500/40 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-gold-500/30 pb-3">
                  <div className="flex items-center gap-3">
                    <Award size={28} className="text-gold-400" />
                    <div>
                      <h4 className="font-serif text-xl font-bold text-cream-50">KI Auswertung & Ergebnis</h4>
                      <p className="text-xs text-cream-300">In der Neon-Datenbank gespeichert</p>
                    </div>
                  </div>
                  <div className="text-3xl font-serif font-bold text-gold-400">
                    {gradingResult.scorePercent}%
                  </div>
                </div>

                <p className="text-xs text-cream-100 leading-relaxed">
                  {gradingResult.feedback}
                </p>
              </div>
            )}

            <button
              onClick={handleSubmitAnswers}
              disabled={isGrading || Object.keys(userAnswers).length === 0}
              className="w-full py-4 bg-cream-900 hover:bg-charcoal-900 text-gold-400 font-bold text-xs rounded-2xl shadow-md disabled:opacity-50 transition-colors flex items-center justify-center gap-2 border border-gold-500/30"
            >
              {isGrading ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Antworten von KI Bewerten & In Datenbank Speichern
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
