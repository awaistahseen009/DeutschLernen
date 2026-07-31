'use client';

import React from 'react';
import { VocabItem } from '@/data/vocabData';
import { Heart, Volume2, BookOpen } from 'lucide-react';

interface FavoritesTabProps {
  vocabList: VocabItem[];
  favorites: Record<string, string>;
  onToggleFavorite: (id: string, favorite: boolean) => void;
  onSelectVocab: (item: VocabItem) => void;
  selectedVoiceURI: string;
}

export const FavoritesTab: React.FC<FavoritesTabProps> = ({
  vocabList,
  favorites,
  onToggleFavorite,
  onSelectVocab,
  selectedVoiceURI
}) => {
  const favoritedItems = vocabList.filter(v => v.id in favorites);

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'de-DE';
    if (selectedVoiceURI) {
      const voices = window.speechSynthesis.getVoices();
      const foundVoice = voices.find(v => v.voiceURI === selectedVoiceURI);
      if (foundVoice) utterance.voice = foundVoice;
    }
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="bg-cream-50 p-6 rounded-3xl border border-cream-300/80 shadow-soft">
        <span className="text-xs font-semibold text-gold-700 uppercase tracking-widest">Gespeicherte Inhalte</span>
        <h2 className="font-serif text-3xl font-bold text-charcoal-900 mt-1">Favoriten & Notizen</h2>
        <p className="text-xs text-cream-800 mt-1">Deine geseicherten Wörter, Sätze und Notizen an einem Ort.</p>
      </div>

      {favoritedItems.length === 0 ? (
        <div className="bg-cream-50 rounded-3xl border border-cream-300 p-12 text-center text-cream-800">
          <Heart size={40} className="text-cream-400 mx-auto mb-3" />
          <h3 className="font-serif font-bold text-xl text-charcoal-900">Noch keine Favoriten</h3>
          <p className="text-xs mt-1">Klicke auf das Herz-Symbol auf einer belieben Lernkarte, um sie hier zu speichern.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {favoritedItems.map(item => (
            <div key={item.id} className="bg-cream-50 rounded-3xl border border-cream-300 p-6 shadow-sm space-y-3 relative">
              <div className="flex items-center justify-between border-b border-cream-200 pb-3">
                <div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 bg-cream-900 text-gold-400 rounded-md uppercase">
                    {item.level}
                  </span>
                  <h3 className="font-serif font-bold text-2xl text-charcoal-900 mt-1">
                    {item.article && <span className="text-gold-700 font-normal mr-1">{item.article}</span>}
                    {item.word}
                  </h3>
                  <p className="text-xs text-cream-800 italic">"{item.translation}"</p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => speakText(item.word)}
                    className="p-2 bg-cream-100 hover:bg-cream-200 text-charcoal-900 rounded-xl"
                  >
                    <Volume2 size={16} />
                  </button>

                  <button
                    onClick={() => onToggleFavorite(item.id, false)}
                    className="p-2 bg-rose-50 text-rose-600 rounded-xl"
                  >
                    <Heart size={16} fill="currentColor" />
                  </button>
                </div>
              </div>

              {/* Sample Sentences */}
              <div className="space-y-2 pt-1">
                <div className="text-[10px] font-bold text-cream-800 uppercase tracking-wider">Beispielsätze:</div>
                {item.sentences.slice(0, 2).map((s, idx) => (
                  <div key={idx} className="p-2.5 bg-cream-100 rounded-xl text-xs">
                    <p className="font-semibold text-charcoal-900">{s.german}</p>
                    <p className="text-[11px] text-cream-800 italic">{s.english}</p>
                  </div>
                ))}
              </div>

              {item.type === 'verb' && (
                <button
                  onClick={() => onSelectVocab(item)}
                  className="w-full py-2 bg-cream-200 hover:bg-cream-300 text-charcoal-900 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-cream-300"
                >
                  <BookOpen size={14} className="text-gold-600" /> Konjugation in Seitenleiste öffnen
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
