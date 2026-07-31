'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Youtube, 
  Sparkles, 
  Loader2, 
  Volume2, 
  BookOpen, 
  Gauge, 
  Video, 
  ListVideo, 
  Plus, 
  Trash2,
  Spline,
  FolderPlus,
  Play,
  FileText,
  Highlighter
} from 'lucide-react';
import { speakTextWithCache } from '@/lib/tts';
import { VocabItem } from '@/data/vocabData';

interface YoutubeTabProps {
  selectedVoiceURI: string;
  onSelectVocab: (item: VocabItem) => void;
  onAppendCustomVocab: (items: VocabItem[]) => void;
}

export const YoutubeTab: React.FC<YoutubeTabProps> = ({
  selectedVoiceURI,
  onSelectVocab,
  onAppendCustomVocab
}) => {
  const [viewMode, setActiveViewMode] = useState<'library' | 'create' | 'detail'>('library');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoCustomTitle, setVideoCustomTitle] = useState('');
  const [manualTranscript, setManualTranscript] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [processedVideos, setProcessedVideos] = useState<any[]>([]);
  const [activeVideo, setActiveVideo] = useState<any>(null);

  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [customChunks, setCustomChunks] = useState<Array<{ id: string; text: string }>>([]);
  const [highlightedText, setHighlightedText] = useState<string>('');

  const transcriptBoxRef = useRef<HTMLDivElement>(null);

  // Load processed videos from Neon PostgreSQL on mount
  useEffect(() => {
    fetchProcessedVideos();
  }, []);

  const fetchProcessedVideos = async () => {
    try {
      const res = await fetch('/api/youtube/transcribe');
      if (res.ok) {
        const data = await res.json();
        if (data.transcripts) {
          setProcessedVideos(data.transcripts);
          const allExtracted = data.transcripts.flatMap((t: any) => t.extractedVocab || []);
          if (allExtracted.length > 0) {
            onAppendCustomVocab(allExtracted);
          }

          if (data.transcripts.length > 0 && !activeVideo) {
            setActiveVideo(data.transcripts[0]);
            if (data.transcripts[0].chunksJson) {
              setCustomChunks(data.transcripts[0].chunksJson);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Fetch processed videos error');
    }
  };

  const handleProcessNewVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/youtube/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          videoUrl, 
          videoTitle: videoCustomTitle || undefined,
          manualTranscript 
        })
      });
      const data = await res.json();
      setActiveVideo(data);
      setCustomChunks([]);
      setActiveViewMode('detail');

      if (data.extractedVocab && data.extractedVocab.length > 0) {
        onAppendCustomVocab(data.extractedVocab);
      }

      fetchProcessedVideos();
    } catch (err) {
      console.error('Process video error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteVideo = async (videoId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm('Möchtest du dieses verarbeitete Video wirklich löschen?')) return;

    try {
      await fetch('/api/youtube/transcribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: videoId })
      });

      setProcessedVideos(prev => prev.filter(v => v.id !== videoId));
      if (activeVideo?.id === videoId) {
        setActiveVideo(null);
        setActiveViewMode('library');
      }
    } catch (err) {
      console.error('Delete video failed:', err);
    }
  };

  // Detect Text Highlighting/Selection inside Transcript Box
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection) {
      const text = selection.toString().trim();
      if (text.length >= 2) {
        setHighlightedText(text);
      }
    }
  };

  // Create Chunk Card from Highlighted Raw Text
  const handleCreateChunkFromHighlight = () => {
    if (!highlightedText) return;
    const newChunk = {
      id: `chunk_${Date.now()}`,
      text: highlightedText // Exact raw text as highlighted
    };
    setCustomChunks(prev => [newChunk, ...prev]);
    setHighlightedText('');
    window.getSelection()?.removeAllRanges();
  };

  const handleDeleteChunkCard = (chunkId: string) => {
    setCustomChunks(prev => prev.filter(c => c.id !== chunkId));
  };

  const speeds = [0.5, 0.75, 1.0, 1.25, 1.5];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-cream-50 p-6 rounded-3xl border border-cream-300/80 shadow-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-gold-700 uppercase tracking-widest flex items-center gap-1.5">
            <Youtube size={16} className="text-rose-600" /> YouTube Verarbeitete Videos & Transkripte
          </span>
          <h2 className="font-serif text-3xl font-bold text-charcoal-900 mt-1">Video Bibliothek & Custom Chunks</h2>
          <p className="text-xs text-cream-800 mt-1">Markiere beliebigen Text im Transkript, um sofort rohe Chunk-Karten zu erstellen.</p>
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

      {/* View Switcher Controls */}
      <div className="flex items-center gap-3 bg-cream-200/80 p-1.5 rounded-2xl border border-cream-300/60">
        <button
          onClick={() => setActiveViewMode('library')}
          className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            viewMode === 'library' ? 'bg-cream-900 text-gold-400 shadow-sm' : 'text-charcoal-800 hover:text-charcoal-900'
          }`}
        >
          <ListVideo size={16} /> Verarbeitete Videos ({processedVideos.length})
        </button>

        <button
          onClick={() => setActiveViewMode('create')}
          className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            viewMode === 'create' ? 'bg-cream-900 text-gold-400 shadow-sm' : 'text-charcoal-800 hover:text-charcoal-900'
          }`}
        >
          <FolderPlus size={16} /> Neues Video Verarbeiten
        </button>

        {activeVideo && (
          <button
            onClick={() => setActiveViewMode('detail')}
            className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              viewMode === 'detail' ? 'bg-cream-900 text-gold-400 shadow-sm' : 'text-charcoal-800 hover:text-charcoal-900'
            }`}
          >
            <FileText size={16} /> Aktuelles Transkript
          </button>
        )}
      </div>

      {/* VIEW 1: PROCESSED VIDEOS LIBRARY */}
      {viewMode === 'library' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-2xl font-bold text-charcoal-900">In Datenbank gespeicherte Videos</h3>
            <button
              onClick={() => setActiveViewMode('create')}
              className="px-4 py-2 bg-cream-900 text-gold-400 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-md border border-gold-500/30 font-bold"
            >
              <Plus size={16} /> Neues Video Hinzufügen
            </button>
          </div>

          {processedVideos.length === 0 ? (
            <div className="bg-cream-50 rounded-3xl border border-cream-300 p-12 text-center text-cream-800 space-y-3">
              <Youtube size={40} className="text-rose-600 mx-auto" />
              <h4 className="font-serif font-bold text-xl text-charcoal-900">Noch keine Videos verarbeitet</h4>
              <p className="text-xs">Klicke oben auf "Neues Video Verarbeiten", um einen YouTube Link einzufügen.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {processedVideos.map((vid) => (
                <div
                  key={vid.id}
                  onClick={() => {
                    setActiveVideo(vid);
                    if (vid.chunksJson) setCustomChunks(vid.chunksJson);
                    setActiveViewMode('detail');
                  }}
                  className="bg-cream-50 rounded-3xl border border-cream-300 p-6 shadow-sm hover:shadow-md hover:border-gold-500/50 transition-all cursor-pointer space-y-3 relative group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-100 text-rose-700 rounded-md uppercase">
                        YouTube Video
                      </span>
                      <h4 className="font-serif font-bold text-xl text-charcoal-900 mt-1">
                        {vid.videoTitle || 'Deutsches YouTube Video'}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => handleDeleteVideo(vid.id, e)}
                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl border border-rose-200"
                        title="Video löschen (CRUD Delete)"
                      >
                        <Trash2 size={16} />
                      </button>
                      <div className="p-2 bg-cream-100 text-gold-700 rounded-xl">
                        <Play size={18} />
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-cream-800 line-clamp-3 font-serif italic">
                    "{vid.transcript}"
                  </p>

                  <div className="pt-2 border-t border-cream-200 flex items-center justify-between text-[11px] text-cream-800">
                    <span>{vid.extractedVocab?.length || 0} Wortschatz-Karten</span>
                    <span className="font-bold text-gold-700">Transkript öffnen →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: CREATE NEW VIDEO PROCESSING */}
      {viewMode === 'create' && (
        <div className="bg-cream-50 rounded-3xl border border-cream-300 p-6 sm:p-8 shadow-elevated space-y-6">
          <div className="border-b border-cream-200 pb-3">
            <h3 className="font-serif text-2xl font-bold text-charcoal-900">Neues YouTube Video verarbeiten</h3>
            <p className="text-xs text-cream-800 mt-0.5">Erstellt das offizielle deutsche Transkript, speichert es in der Datenbank & generiert Wortschatz-Karten.</p>
          </div>

          <form onSubmit={handleProcessNewVideo} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-charcoal-900 mb-1.5 uppercase tracking-wider">
                Video-Name / Custom Titel
              </label>
              <input
                type="text"
                value={videoCustomTitle}
                onChange={(e) => setVideoCustomTitle(e.target.value)}
                placeholder="z.B. Nicos Weg B1 - Kapitel 4"
                className="w-full bg-cream-100 border border-cream-300 rounded-2xl px-4 py-3 text-xs text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-gold-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-charcoal-900 mb-1.5 uppercase tracking-wider">
                YouTube Video URL
              </label>
              <div className="relative">
                <Youtube size={18} className="absolute left-3.5 top-3.5 text-rose-600" />
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full bg-cream-100 border border-cream-300 rounded-2xl pl-10 pr-4 py-3 text-xs text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-gold-500 font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-charcoal-900 mb-1.5 uppercase tracking-wider">
                Optional: Offizielles deutsches Transkript eingeben
              </label>
              <textarea
                rows={4}
                value={manualTranscript}
                onChange={(e) => setManualTranscript(e.target.value)}
                placeholder="Füge hier optional das offizielle deutsche Transkript des Videos ein..."
                className="w-full bg-cream-100 border border-cream-300 rounded-2xl p-3 text-xs text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-gold-500 font-serif"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !videoUrl.trim()}
              className="w-full py-4 bg-cream-900 hover:bg-charcoal-900 text-gold-400 font-bold text-xs rounded-2xl shadow-md disabled:opacity-50 transition-colors flex items-center justify-center gap-2 border border-gold-500/30 font-bold"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin text-gold-400" />
                  <span>Extrahiere offizelles Transkript...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} /> Video Verarbeiten & In Datenbank Speichern
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* VIEW 3: ACTIVE VIDEO OFFICIAL TRANSCRIPT & HIGHLIGHT-TO-CHUNK */}
      {viewMode === 'detail' && activeVideo && (
        <div className="space-y-6">
          {/* Floating Highlight Action Bar */}
          {highlightedText && (
            <div className="sticky top-20 z-30 bg-cream-900 text-cream-50 p-4 rounded-2xl border border-gold-500/50 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-bounce">
              <div className="flex items-center gap-2 text-xs overflow-hidden">
                <Highlighter size={18} className="text-gold-400 shrink-0" />
                <span className="truncate max-w-md font-serif italic text-cream-100">
                  "{highlightedText}"
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleCreateChunkFromHighlight}
                  className="px-4 py-2 bg-gold-500 hover:bg-gold-400 text-charcoal-900 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <Plus size={15} /> Als Chunk-Karte erstellen (Roher Text)
                </button>
                <button
                  onClick={() => setHighlightedText('')}
                  className="px-2.5 py-2 bg-charcoal-800 text-cream-300 hover:text-white rounded-xl text-xs font-bold"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}

          {/* Official German Transcript Display Card */}
          <div className="bg-cream-50 rounded-3xl border border-cream-300 p-6 sm:p-8 shadow-elevated space-y-4">
            <div className="border-b border-cream-200 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 bg-rose-100 text-rose-700 rounded-md uppercase">
                  Offizielles Deutsches Transkript
                </span>
                <h3 className="font-serif text-2xl font-bold text-charcoal-900 mt-1">
                  {activeVideo.videoTitle || 'YouTube Video'}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => speakTextWithCache(activeVideo.transcript, speechRate, selectedVoiceURI)}
                  className="px-3 py-1.5 bg-cream-900 text-gold-400 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm font-bold"
                >
                  <Volume2 size={15} /> Transkript Anhören ({speechRate}x)
                </button>

                <button
                  onClick={() => handleDeleteVideo(activeVideo.id)}
                  className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl border border-rose-200"
                  title="Video löschen"
                >
                  <Trash2 size={16} />
                </button>

                <a
                  href={activeVideo.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-rose-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 hover:bg-rose-700"
                >
                  <Youtube size={14} /> YouTube
                </a>
              </div>
            </div>

            <p className="text-[11px] text-cream-800 italic">
              💡 Tipp: Markiere mit der Maus beliebigen Text im Transkript, um sofort eine rohe Chunk-Karte zu erstellen!
            </p>

            {/* Official Raw Transcript Body with Selection Listener */}
            <div 
              ref={transcriptBoxRef}
              onMouseUp={handleTextSelection}
              className="bg-cream-100 p-5 rounded-2xl border border-cream-300 text-xs sm:text-sm leading-relaxed text-charcoal-900 font-serif max-h-80 overflow-y-auto whitespace-pre-wrap select-text cursor-text"
            >
              {activeVideo.transcript}
            </div>
          </div>

          {/* Created Chunk Cards Section */}
          {customChunks.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-serif text-2xl font-bold text-charcoal-900">
                Erstellte Chunk-Karten ({customChunks.length})
              </h4>

              <div className="space-y-4">
                {customChunks.map((chunk, cIdx) => (
                  <div key={chunk.id} className="bg-cream-50 rounded-3xl border border-cream-300 p-5 sm:p-6 shadow-soft space-y-3 relative">
                    <div className="flex items-center justify-between border-b border-cream-200 pb-2">
                      <span className="px-2.5 py-0.5 bg-cream-900 text-gold-400 rounded-md text-[10px] font-bold uppercase">
                        Rohe Chunk-Karte #{cIdx + 1}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => speakTextWithCache(chunk.text, speechRate, selectedVoiceURI)}
                          className="px-3 py-1.5 bg-cream-900 text-gold-400 hover:bg-charcoal-900 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors font-bold"
                        >
                          <Volume2 size={16} /> Anhören ({speechRate}x)
                        </button>

                        <button
                          onClick={() => handleDeleteChunkCard(chunk.id)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl border border-rose-200"
                          title="Entfernen"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <p className="text-sm sm:text-base leading-relaxed text-charcoal-900 font-serif bg-cream-100/60 p-4 rounded-2xl border border-cream-200">
                      {chunk.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Extracted Flashcards Cards underneath */}
          <div className="space-y-4 pt-4 border-t border-cream-200">
            <h3 className="font-serif text-2xl font-bold text-charcoal-900">
              Extrahierte Wortschatz-Karten ({activeVideo.extractedVocab?.length || 0})
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeVideo.extractedVocab?.map((item: any, idx: number) => (
                <div key={idx} className="bg-cream-50 rounded-3xl border border-cream-300 p-6 shadow-soft space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-b border-cream-200 pb-3">
                      <span className="px-2.5 py-0.5 bg-cream-900 text-gold-400 rounded-md text-[10px] font-bold uppercase">
                        {item.type}
                      </span>
                      <button
                        onClick={() => speakTextWithCache(item.word, speechRate, selectedVoiceURI)}
                        className="p-2 bg-cream-100 hover:bg-cream-900 hover:text-gold-400 text-charcoal-900 rounded-xl border border-cream-300"
                        title="Aussprache anhören"
                      >
                        <Volume2 size={16} />
                      </button>
                    </div>

                    <h4 className="font-serif font-bold text-2xl text-charcoal-900">
                      {item.article && <span className="text-gold-700 font-normal mr-1">{item.article}</span>}
                      {item.word}
                    </h4>

                    <p className="text-sm font-serif italic text-cream-800">
                      "{item.translation}"
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-cream-200">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-charcoal-900">Beispielsatz:</div>
                    {item.sentences?.slice(0, 2).map((s: any, sIdx: number) => (
                      <div key={sIdx} className="p-2.5 bg-cream-100 rounded-xl text-xs border border-cream-200">
                        <span className="font-semibold text-charcoal-900">{s.german}</span>
                        <div className="text-[11px] text-cream-800 italic mt-0.5">{s.english}</div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => onSelectVocab(item)}
                    className="w-full py-2.5 bg-cream-200 hover:bg-cream-300 text-charcoal-900 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-cream-300 mt-2"
                  >
                    <BookOpen size={14} className="text-gold-600" /> Grammatik & Deklination
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
