'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Sparkles, 
  Loader2, 
  Volume2, 
  BookOpen, 
  Gauge, 
  Plus, 
  Trash2, 
  FolderPlus, 
  Play, 
  Folder, 
  CheckCircle, 
  Heart, 
  ChevronLeft, 
  ChevronRight,
  Layers,
  Award
} from 'lucide-react';
import { speakTextWithCache } from '@/lib/tts';
import { VocabItem } from '@/data/vocabData';

interface PageToCardsTabProps {
  selectedVoiceURI: string;
  onSelectVocab: (item: VocabItem) => void;
  onAppendCustomVocab: (items: VocabItem[]) => void;
  learnedIds: string[];
  favorites: Record<string, string>;
  onToggleLearned: (id: string, learned: boolean) => void;
  onToggleFavorite: (id: string, favorite: boolean) => void;
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

const clientDictCache = new Map<string, any>();

export const PageToCardsTab: React.FC<PageToCardsTabProps> = ({
  selectedVoiceURI,
  onSelectVocab,
  onAppendCustomVocab,
  learnedIds,
  favorites,
  onToggleLearned,
  onToggleFavorite
}) => {
  const [viewMode, setActiveViewMode] = useState<'library' | 'create' | 'detail'>('library');
  const [rawText, setRawText] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [projects, setProjects] = useState<any[]>([]);
  const [activeProject, setActiveProject] = useState<any>(null);

  const [activeFolder, setActiveFolder] = useState<'verbs' | 'nouns' | 'adjectives' | 'idioms'>('verbs');
  const [currentIndex, setCurrentIndex] = useState(0);

  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [hoverTooltip, setHoverTooltip] = useState<HoverTooltip | null>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load saved projects from Neon PostgreSQL on mount
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/page-to-cards');
      if (res.ok) {
        const data = await res.json();
        if (data.projects) {
          setProjects(data.projects);
          
          // Send all extracted cards from projects to main Dashboard VocabTab
          const allItems: VocabItem[] = [];
          data.projects.forEach((proj: any) => {
            if (proj.result) {
              const res = proj.result;
              if (res.verbs) allItems.push(...res.verbs);
              if (res.nouns) allItems.push(...res.nouns);
              if (res.adjectives) allItems.push(...res.adjectives);
              if (res.idioms) allItems.push(...res.idioms);
            }
          });

          if (allItems.length > 0) {
            onAppendCustomVocab(allItems);
          }

          if (data.projects.length > 0 && !activeProject) {
            setActiveProject(data.projects[0]);
          }
        }
      }
    } catch (e) {
      console.warn('Fetch text projects error');
    }
  };

  const handleProcessText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/page-to-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          rawText, 
          customTitle: projectTitle || undefined 
        })
      });
      const data = await res.json();
      setActiveProject(data);
      setActiveFolder('verbs');
      setCurrentIndex(0);
      setActiveViewMode('detail');

      // Append new cards to Dashboard VocabTab
      const newItems: VocabItem[] = [];
      if (data.result) {
        if (data.result.verbs) newItems.push(...data.result.verbs);
        if (data.result.nouns) newItems.push(...data.result.nouns);
        if (data.result.adjectives) newItems.push(...data.result.adjectives);
        if (data.result.idioms) newItems.push(...data.result.idioms);
      }
      if (newItems.length > 0) {
        onAppendCustomVocab(newItems);
      }

      fetchProjects();
    } catch (err) {
      console.error('Process text error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm('Möchtest du dieses Projekt wirklich löschen?')) return;

    try {
      await fetch('/api/page-to-cards', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: projectId })
      });

      setProjects(prev => prev.filter(p => p.id !== projectId));
      if (activeProject?.id === projectId) {
        setActiveProject(null);
        setActiveViewMode('library');
      }
    } catch (err) {
      console.error('Delete project failed:', err);
    }
  };

  // Interactive Underlined Word Hover
  const handleWordHover = async (e: React.MouseEvent<HTMLSpanElement>, cleanWord: string, context?: string) => {
    if (!cleanWord || cleanWord.length < 2) return;
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);

    const rect = e.currentTarget.getBoundingClientRect();
    const cacheKey = cleanWord.toLowerCase();

    const x = Math.max(120, Math.min(window.innerWidth - 120, rect.left + (rect.width / 2)));
    const y = Math.max(10, rect.top - 4);

    if (clientDictCache.has(cacheKey)) {
      const cached = clientDictCache.get(cacheKey);
      setHoverTooltip({
        word: cleanWord,
        partOfSpeech: cached.partOfSpeech,
        translation: cached.englishTranslation,
        definition: cached.germanDefinition,
        grammarNote: cached.grammarNote,
        x,
        y
      });
      return;
    }

    setHoverTooltip({
      word: cleanWord,
      translation: 'Lädt Übersetzung...',
      x,
      y
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
        x,
        y
      });
    } catch (err) {
      setHoverTooltip(null);
    }
  };

  const handleMouseLeaveWord = () => {
    hoverTimerRef.current = setTimeout(() => {
      setHoverTooltip(null);
    }, 250);
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
          onMouseLeave={handleMouseLeaveWord}
          className="hover-word"
        >
          {chunk}
        </span>
      );
    });
  };

  const playSpeech = (text: string) => {
    speakTextWithCache(text, speechRate, selectedVoiceURI);
  };

  const speeds = [0.5, 0.75, 1.0, 1.25, 1.5];

  // Helper to get active cards array
  const folderData = activeProject?.result;
  const currentFolderItems: any[] = folderData ? (folderData[activeFolder] || []) : [];
  const currentCard = currentFolderItems[currentIndex] || currentFolderItems[0];

  const isLearned = currentCard ? learnedIds.includes(currentCard.id) : false;
  const isFav = currentCard ? (currentCard.id in favorites) : false;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 relative">
      {/* Floating Hover Card */}
      {hoverTooltip && (
        <div 
          onMouseEnter={() => {
            if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
          }}
          onMouseLeave={() => setHoverTooltip(null)}
          style={{ top: `${hoverTooltip.y}px`, left: `${hoverTooltip.x}px` }}
          className="fixed z-50 bg-cream-900 text-cream-50 p-3 rounded-2xl shadow-2xl border border-gold-500/50 text-xs max-w-xs transform -translate-x-1/2 -translate-y-full transition-all cursor-default"
        >
          <div className="flex items-center justify-between border-b border-gold-500/30 pb-1 mb-1.5 gap-3">
            <div className="flex items-center gap-1.5">
              <strong className="text-gold-400 font-serif text-base">{hoverTooltip.word}</strong>
              <button
                onClick={() => playSpeech(hoverTooltip.word)}
                className="p-1 bg-cream-800 hover:bg-gold-500 hover:text-charcoal-900 text-gold-400 rounded-lg transition-colors"
                title="Aussprache abspielen"
              >
                <Volume2 size={14} />
              </button>
            </div>
            {hoverTooltip.partOfSpeech && (
              <span className="text-[10px] bg-cream-800 text-gold-300 px-2 py-0.5 rounded uppercase font-bold">
                {hoverTooltip.partOfSpeech}
              </span>
            )}
          </div>

          <div className="text-cream-50 font-bold text-sm mb-1">
            {hoverTooltip.translation}
          </div>

          {hoverTooltip.definition && (
            <div className="text-[11px] text-cream-200 italic leading-snug">
              {hoverTooltip.definition}
            </div>
          )}
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-cream-50 p-6 rounded-3xl border border-cream-300/80 shadow-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-gold-700 uppercase tracking-widest flex items-center gap-1.5">
            <FileText size={16} className="text-gold-600" /> Seite zu Karten (Paragraph Extractor)
          </span>
          <h2 className="font-serif text-3xl font-bold text-charcoal-900 mt-1">Satz- & Ordner-Extraktor</h2>
          <p className="text-xs text-cream-800 mt-1">Extrahiert lückenlos alle Verben, Nomen, Adjektive & Idiome in separate Ordner.</p>
        </div>

        {/* Speed Controls Selector */}
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

      {/* View Switcher Header */}
      <div className="flex items-center gap-3 bg-cream-200/80 p-1.5 rounded-2xl border border-cream-300/60">
        <button
          onClick={() => setActiveViewMode('library')}
          className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            viewMode === 'library' ? 'bg-cream-900 text-gold-400 shadow-sm' : 'text-charcoal-800 hover:text-charcoal-900'
          }`}
        >
          <Folder size={16} /> Text-Projekte ({projects.length})
        </button>

        <button
          onClick={() => setActiveViewMode('create')}
          className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            viewMode === 'create' ? 'bg-cream-900 text-gold-400 shadow-sm' : 'text-charcoal-800 hover:text-charcoal-900'
          }`}
        >
          <FolderPlus size={16} /> Neues Projekt / Absatz Einfügen
        </button>

        {activeProject && (
          <button
            onClick={() => setActiveViewMode('detail')}
            className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              viewMode === 'detail' ? 'bg-cream-900 text-gold-400 shadow-sm' : 'text-charcoal-800 hover:text-charcoal-900'
            }`}
          >
            <Layers size={16} /> Offenes Projekt
          </button>
        )}
      </div>

      {/* VIEW 1: PROJECTS LIBRARY */}
      {viewMode === 'library' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-2xl font-bold text-charcoal-900">Gespeicherte Text-Projekte</h3>
            <button
              onClick={() => setActiveViewMode('create')}
              className="px-4 py-2 bg-cream-900 text-gold-400 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-md border border-gold-500/30"
            >
              <Plus size={16} /> Absatz Analysieren
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="bg-cream-50 rounded-3xl border border-cream-300 p-12 text-center text-cream-800 space-y-3">
              <FileText size={40} className="text-gold-600 mx-auto" />
              <h4 className="font-serif font-bold text-xl text-charcoal-900">Noch keine Text-Projekte gespeichert</h4>
              <p className="text-xs">Füge einen deutschen Absatz ein, um automatisch lückenlose Ordner mit Lernkarten zu generieren.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((proj) => {
                const res = proj.result || {};
                const vCount = res.verbs?.length || 0;
                const nCount = res.nouns?.length || 0;
                const aCount = res.adjectives?.length || 0;
                const iCount = res.idioms?.length || 0;
                const totalCards = vCount + nCount + aCount + iCount;

                return (
                  <div
                    key={proj.id}
                    onClick={() => {
                      setActiveProject(proj);
                      setActiveFolder('verbs');
                      setCurrentIndex(0);
                      setActiveViewMode('detail');
                    }}
                    className="bg-cream-50 rounded-3xl border border-cream-300 p-6 shadow-sm hover:shadow-md hover:border-gold-500/50 transition-all cursor-pointer space-y-3 relative group"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-cream-200 text-charcoal-800 rounded-md uppercase">
                          Projekt Ordner
                        </span>
                        <h4 className="font-serif font-bold text-xl text-charcoal-900 mt-1">
                          {proj.title || 'Deutscher Absatz Extrakt'}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => handleDeleteProject(proj.id, e)}
                          className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl border border-rose-200"
                          title="Projekt löschen"
                        >
                          <Trash2 size={16} />
                        </button>
                        <div className="p-2 bg-cream-100 text-gold-700 rounded-xl">
                          <Play size={18} />
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-cream-800 line-clamp-3 font-serif italic">
                      "{proj.rawText}"
                    </p>

                    <div className="pt-2 border-t border-cream-200 flex items-center justify-between text-[11px] text-cream-800 font-semibold">
                      <span>📁 {vCount} Verben · {nCount} Nomen · {aCount} Adjektive · {iCount} Idiome</span>
                      <span className="font-bold text-gold-700">Ordner öffnen →</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: CREATE NEW PARAGRAPH EXTRACTION */}
      {viewMode === 'create' && (
        <div className="bg-cream-50 rounded-3xl border border-cream-300 p-6 sm:p-8 shadow-elevated space-y-6">
          <div className="border-b border-cream-200 pb-3">
            <h3 className="font-serif text-2xl font-bold text-charcoal-900">Neuen Absatz analysieren & Ordner erstellen</h3>
            <p className="text-xs text-cream-800 mt-0.5">Extrahiert lückenlos alle Verben, Nomen, Adjektive & Redewendungen in separate Ordner mit 5 Beispielsätzen.</p>
          </div>

          <form onSubmit={handleProcessText} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-charcoal-900 mb-1.5 uppercase tracking-wider">
                Projekt-Titel / Name
              </label>
              <input
                type="text"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                placeholder="z.B. Artikel über Klimawandel & Technologie"
                className="w-full bg-cream-100 border border-cream-300 rounded-2xl px-4 py-3 text-xs text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-gold-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-charcoal-900 mb-1.5 uppercase tracking-wider">
                Deutschen Absatz / Text einfügen
              </label>
              <textarea
                rows={7}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Füge hier deinen deutschen Text oder Zeitungsabsatz ein..."
                className="w-full bg-cream-100 border border-cream-300 rounded-2xl p-4 text-xs sm:text-sm text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-gold-500 font-serif leading-relaxed"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !rawText.trim()}
              className="w-full py-4 bg-cream-900 hover:bg-charcoal-900 text-gold-400 font-bold text-xs rounded-2xl shadow-md disabled:opacity-50 transition-colors flex items-center justify-center gap-2 border border-gold-500/30"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin text-gold-400" />
                  <span>Extrahiere lückenlose Ordner...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} /> Absatz Analysieren & Ordner Generieren
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* VIEW 3: ACTIVE PROJECT FOLDERS & DASHBOARD-STYLE CARDS */}
      {viewMode === 'detail' && activeProject && (
        <div className="space-y-6">
          {/* Project Title Header */}
          <div className="bg-cream-50 rounded-3xl border border-cream-300 p-6 shadow-soft flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold px-2.5 py-0.5 bg-cream-900 text-gold-400 rounded-md uppercase">
                Aktives Projekt
              </span>
              <h3 className="font-serif text-2xl font-bold text-charcoal-900 mt-1">
                {activeProject.title || 'Deutscher Absatz Extrakt'}
              </h3>
            </div>

            <button
              onClick={() => handleDeleteProject(activeProject.id)}
              className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl border border-rose-200"
              title="Projekt löschen"
            >
              <Trash2 size={18} />
            </button>
          </div>

          {/* Folder Category Switcher Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-cream-200/80 p-1.5 rounded-2xl border border-cream-300/60">
            <button
              onClick={() => { setActiveFolder('verbs'); setCurrentIndex(0); }}
              className={`py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeFolder === 'verbs' ? 'bg-cream-900 text-gold-400 shadow-sm' : 'text-charcoal-800 hover:text-charcoal-900'
              }`}
            >
              📁 Verben ({folderData?.verbs?.length || 0})
            </button>

            <button
              onClick={() => { setActiveFolder('nouns'); setCurrentIndex(0); }}
              className={`py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeFolder === 'nouns' ? 'bg-cream-900 text-gold-400 shadow-sm' : 'text-charcoal-800 hover:text-charcoal-900'
              }`}
            >
              📁 Nomen ({folderData?.nouns?.length || 0})
            </button>

            <button
              onClick={() => { setActiveFolder('adjectives'); setCurrentIndex(0); }}
              className={`py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeFolder === 'adjectives' ? 'bg-cream-900 text-gold-400 shadow-sm' : 'text-charcoal-800 hover:text-charcoal-900'
              }`}
            >
              📁 Adjektive ({folderData?.adjectives?.length || 0})
            </button>

            <button
              onClick={() => { setActiveFolder('idioms'); setCurrentIndex(0); }}
              className={`py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeFolder === 'idioms' ? 'bg-cream-900 text-gold-400 shadow-sm' : 'text-charcoal-800 hover:text-charcoal-900'
              }`}
            >
              📁 Idiome ({folderData?.idioms?.length || 0})
            </button>
          </div>

          {/* Active Folder Card Display (Matching Main Dashboard Design) */}
          {!currentCard ? (
            <div className="bg-cream-50 rounded-3xl border border-cream-300 p-12 text-center text-cream-800 space-y-2">
              <Folder size={36} className="text-gold-600 mx-auto" />
              <h4 className="font-serif font-bold text-lg text-charcoal-900">Keine Elemente in diesem Ordner</h4>
              <p className="text-xs">Im analysierten Text wurden keine Wörter dieser Kategorie gefunden.</p>
            </div>
          ) : (
            <div className="bg-cream-50 rounded-3xl border border-cream-300 p-6 sm:p-8 shadow-elevated space-y-6 relative">
              {/* Card Header */}
              <div className="flex items-center justify-between pb-6 border-b border-cream-200">
                <div className="flex items-center gap-2.5">
                  <span className="px-3 py-1 bg-cream-900 text-gold-400 rounded-xl text-xs font-bold uppercase tracking-wider">
                    {currentCard.level || 'B1'}
                  </span>
                  <span className="px-3 py-1 bg-cream-200 text-charcoal-800 rounded-xl text-xs font-semibold uppercase">
                    {currentCard.type}
                  </span>
                  {currentCard.originalInText && (
                    <span className="px-3 py-1 bg-gold-500/20 text-gold-700 rounded-xl text-xs font-bold border border-gold-500/30">
                      Im Text: "{currentCard.originalInText}"
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onToggleFavorite(currentCard.id, !isFav)}
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
                    onClick={() => onToggleLearned(currentCard.id, !isLearned)}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-bold border flex items-center gap-1.5 transition-colors ${
                      isLearned 
                        ? 'bg-emerald-900 text-emerald-300 border-emerald-700' 
                        : 'bg-cream-100 text-charcoal-900 border-cream-300 hover:bg-cream-200'
                    }`}
                  >
                    <CheckCircle size={16} />
                    {isLearned ? 'Gemeistert' : 'Als gelernt markieren'}
                  </button>
                </div>
              </div>

              {/* Main Card Body */}
              <div className="py-6 flex flex-col items-center text-center">
                <div className="flex items-center gap-3">
                  <h1 className="font-serif text-4xl sm:text-5xl font-bold text-charcoal-900 tracking-tight">
                    {currentCard.article && <span className="text-gold-700 font-normal mr-2">{currentCard.article}</span>}
                    {currentCard.word}
                  </h1>
                  <button
                    onClick={() => playSpeech(currentCard.word)}
                    className="p-3 bg-cream-900 text-gold-400 hover:bg-charcoal-900 rounded-2xl shadow-md transition-transform hover:scale-105 flex items-center gap-1"
                    title="Aussprache anhören (Cached)"
                  >
                    <Volume2 size={22} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{speechRate}x</span>
                  </button>
                </div>

                <p className="text-lg text-cream-800 mt-2 font-serif italic">
                  "{currentCard.translation}"
                </p>

                <button
                  onClick={() => onSelectVocab(currentCard)}
                  className="mt-4 px-4 py-2 bg-cream-200 hover:bg-cream-300 text-charcoal-900 rounded-xl text-xs font-bold flex items-center gap-2 border border-cream-300 transition-colors"
                >
                  <BookOpen size={15} className="text-gold-600" />
                  Grammatik in der rechten Seitenleiste öffnen
                </button>
              </div>

              {/* 5 Example Sentences with Underlined Dot Interactive Hover Words */}
              <div className="space-y-3 pt-6 border-t border-cream-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-bold text-charcoal-900 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles size={14} className="text-gold-600" /> 5 Beispielsätze (Hover über ein Wort für Übersetzung & Audio)
                  </div>
                  <span className="text-[10px] font-semibold text-cream-800 italic">Tempo: {speechRate}x (Cached)</span>
                </div>

                {currentCard.sentences?.map((sent: any, idx: number) => (
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

              {/* Next / Prev Card Controls */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-cream-200">
                <button
                  onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0}
                  className="px-5 py-2.5 bg-cream-200 hover:bg-cream-300 text-charcoal-900 rounded-2xl text-xs font-bold flex items-center gap-2 border border-cream-300 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft size={16} /> Vorherige Karte
                </button>

                <span className="text-xs font-semibold text-cream-800">
                  {currentIndex + 1} von {currentFolderItems.length} Karten in 📁 {activeFolder}
                </span>

                <button
                  onClick={() => setCurrentIndex(prev => (prev + 1) % currentFolderItems.length)}
                  disabled={currentFolderItems.length <= 1}
                  className="px-5 py-2.5 bg-cream-900 hover:bg-charcoal-900 text-gold-400 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-md disabled:opacity-40 transition-colors font-bold"
                >
                  Nächste Karte <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
