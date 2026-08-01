'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Gauge,
  Brain,
  Radio,
  Zap,
  Settings,
  Save,
  UserRound,
  Layers,
  Volume2
} from 'lucide-react';

interface CallTabProps {
  selectedVoiceURI: string;
  germanVoices?: SpeechSynthesisVoice[];
}

type CallMessage = { sender: 'bot' | 'user'; text: string };
type CallLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
type Persona = 'friendly' | 'teacher' | 'examiner' | 'travel' | 'work';

const levels: CallLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];
const personas: Array<{ id: Persona; label: string }> = [
  { id: 'friendly', label: 'Freundlich' },
  { id: 'teacher', label: 'Lehrer' },
  { id: 'examiner', label: 'Pruefer' },
  { id: 'travel', label: 'Reise' },
  { id: 'work', label: 'Arbeit' }
];

const cloudVoices = [
  { voiceURI: 'de-DE-Journey-F', name: 'Journey Female', lang: 'de-DE' },
  { voiceURI: 'de-DE-Journey-D', name: 'Journey Male', lang: 'de-DE' },
  { voiceURI: 'de-DE-Neural2-C', name: 'Neural2 Female', lang: 'de-DE' },
  { voiceURI: 'de-DE-Neural2-D', name: 'Neural2 Male', lang: 'de-DE' },
  { voiceURI: 'de-DE-Wavenet-A', name: 'Wavenet A', lang: 'de-DE' },
  { voiceURI: 'de-DE-Wavenet-B', name: 'Wavenet B', lang: 'de-DE' },
  { voiceURI: 'de-DE-Wavenet-C', name: 'Wavenet C', lang: 'de-DE' },
  { voiceURI: 'de-DE-Wavenet-D', name: 'Wavenet D', lang: 'de-DE' }
];

export const CallTab: React.FC<CallTabProps> = ({ selectedVoiceURI, germanVoices = [] }) => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [callVoiceURI, setCallVoiceURI] = useState(selectedVoiceURI);
  const [callLevel, setCallLevel] = useState<CallLevel>('B1');
  const [persona, setPersona] = useState<Persona>('friendly');
  const [customSystemPrompt, setCustomSystemPrompt] = useState('');
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [callMessages, setCallMessages] = useState<CallMessage[]>([]);
  const [pineconeMemoryCount, setPineconeMemoryCount] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (selectedVoiceURI && !callVoiceURI) setCallVoiceURI(selectedVoiceURI);
  }, [selectedVoiceURI, callVoiceURI]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/call');
        if (!res.ok) return;
        const data = await res.json();
        const settings = data.settings || {};
        if (levels.includes(settings.level)) setCallLevel(settings.level);
        if (personas.some((p) => p.id === settings.persona)) setPersona(settings.persona);
        if (typeof settings.customSystemPrompt === 'string') setCustomSystemPrompt(settings.customSystemPrompt);
        if (settings.voiceUri) setCallVoiceURI(settings.voiceUri);
        if (settings.speechRate) setSpeechRate(Number(settings.speechRate));
        if (typeof settings.memoryEnabled === 'boolean') setMemoryEnabled(settings.memoryEnabled);
      } catch {
        console.warn('Call settings load failed');
      }
    };

    loadSettings();
  }, []);

  useEffect(() => {
    if (isCallActive) {
      timerRef.current = setInterval(() => setCallDuration((prev) => prev + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setCallDuration(0);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isCallActive]);

  const speakTextWithRate = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'de-DE';
    utterance.rate = speechRate;

    if (callVoiceURI) {
      const voices = window.speechSynthesis.getVoices();
      const foundVoice = voices.find((v) => v.voiceURI === callVoiceURI);
      if (foundVoice) utterance.voice = foundVoice;
    }

    utterance.onstart = () => setIsAiSpeaking(true);
    utterance.onend = () => setIsAiSpeaking(false);
    utterance.onerror = () => setIsAiSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const saveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await fetch('/api/call', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: callLevel,
          persona,
          customSystemPrompt,
          voiceUri: callVoiceURI,
          speechRate,
          memoryEnabled
        })
      });
    } catch {
      console.warn('Call settings save failed');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleStartCall = () => {
    setIsCallActive(true);
    saveSettings();
    const greeting = callLevel === 'A1'
      ? 'Hallo! Schoen, dass du da bist. Wie geht es dir heute?'
      : 'Hallo! Schoen, dass du anrufst. Worueber moechtest du heute auf Deutsch sprechen?';
    setCallMessages([{ sender: 'bot', text: greeting }]);
    speakTextWithRate(greeting);
  };

  const handleEndCall = () => {
    window.speechSynthesis.cancel();
    setIsCallActive(false);
    setIsAiSpeaking(false);
    setIsListeningMic(false);
  };

  const handleMicListen = () => {
    if (isMuted || isAiSpeaking) return;
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech Recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'de-DE';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListeningMic(true);

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsListeningMic(false);
      if (!transcript.trim()) return;

      const startTime = Date.now();
      const newHistory: CallMessage[] = [...callMessages, { sender: 'user', text: transcript }];
      setCallMessages(newHistory);

      try {
        const res = await fetch('/api/call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userMessage: transcript,
            messageHistory: newHistory.slice(-30),
            settings: {
              level: callLevel,
              persona,
              customSystemPrompt,
              voiceUri: callVoiceURI,
              speechRate,
              memoryEnabled
            }
          })
        });
        const data = await res.json();
        setLatencyMs(Date.now() - startTime);

        const reply = data.response || 'Ich habe dich verstanden. Erzaehl mir mehr.';
        if (typeof data.memoriesUsed === 'number') setPineconeMemoryCount(data.memoriesUsed);

        setCallMessages((prev) => [...prev, { sender: 'bot', text: reply }]);
        speakTextWithRate(reply);
      } catch (err) {
        console.error('Call send error:', err);
      }
    };

    recognition.onerror = () => setIsListeningMic(false);
    recognition.onend = () => setIsListeningMic(false);
    recognition.start();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const speeds = [0.75, 0.9, 1.0, 1.1, 1.25, 1.5];
  const voiceOptions = [
    ...cloudVoices,
    ...germanVoices.map((voice) => ({ voiceURI: voice.voiceURI, name: voice.name, lang: voice.lang }))
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="bg-cream-50 p-6 rounded-3xl border border-cream-300/80 shadow-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-gold-700 uppercase tracking-widest flex items-center gap-1.5">
            <Radio size={14} className="text-emerald-600 animate-pulse" /> Echtzeit KI Anruf & Pinecone Memory
          </span>
          <h2 className="font-serif text-3xl font-bold text-charcoal-900 mt-1">Natuerlicher Sprach-Anruf</h2>
          <p className="text-xs text-cream-800 mt-1">Level-gesteuerter Gemini Tutor, schnelle STT Antworten, Stimmenwahl und Langzeitgedaechtnis.</p>
        </div>

        <div className="bg-cream-100 p-2 rounded-2xl border border-cream-300 flex items-center gap-1.5 shadow-sm">
          <Gauge size={16} className="text-gold-700 ml-1" />
          <span className="text-[11px] font-bold text-charcoal-900 uppercase mr-1">Tempo:</span>
          {speeds.map((sp) => (
            <button
              key={sp}
              onClick={() => setSpeechRate(sp)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                speechRate === sp ? 'bg-cream-900 text-gold-400 shadow-sm' : 'text-charcoal-800 hover:bg-cream-200'
              }`}
            >
              {sp}x
            </button>
          ))}
        </div>
      </div>

      <div className="bg-cream-50 rounded-3xl border border-cream-300 p-5 sm:p-6 shadow-soft space-y-4 overflow-hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-xs font-semibold text-gold-700 uppercase tracking-widest flex items-center gap-1.5">
              <Settings size={15} /> Anruf Einstellungen
            </span>
            <h3 className="font-serif text-xl font-bold text-charcoal-900 mt-1">Level, Persona, Stimme & Memory</h3>
          </div>
          <button
            onClick={saveSettings}
            disabled={isSavingSettings}
            className="px-3 py-2 bg-cream-900 text-gold-400 rounded-xl text-xs font-bold flex items-center gap-2 disabled:opacity-60"
          >
            <Save size={15} /> {isSavingSettings ? 'Speichert...' : 'Speichern'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-charcoal-900 mb-2 uppercase">
              <Layers size={14} className="text-gold-600" /> Sprachniveau
            </label>
            <div className="grid grid-cols-5 gap-1.5 bg-cream-200 p-1.5 rounded-2xl border border-cream-300">
              {levels.map((level) => (
                <button
                  key={level}
                  onClick={() => setCallLevel(level)}
                  className={`py-2 rounded-xl text-xs font-bold ${callLevel === level ? 'bg-cream-900 text-gold-400' : 'text-charcoal-800 hover:bg-cream-300'}`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-charcoal-900 mb-2 uppercase">
              <UserRound size={14} className="text-gold-600" /> Persona
            </label>
            <select
              value={persona}
              onChange={(e) => setPersona(e.target.value as Persona)}
              className="w-full bg-cream-100 border border-cream-300 rounded-2xl px-3 py-2.5 text-xs font-bold text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-gold-500"
            >
              {personas.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-charcoal-900 mb-2 uppercase">
              <Volume2 size={14} className="text-gold-600" /> Stimme
            </label>
            <select
              value={callVoiceURI}
              onChange={(e) => setCallVoiceURI(e.target.value)}
              className="w-full bg-cream-100 border border-cream-300 rounded-2xl px-3 py-2.5 text-xs font-bold text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-gold-500"
            >
              <option value="">Browser Standard Deutsch</option>
              {voiceOptions.map((voice) => (
                <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} ({voice.lang})</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-3 bg-cream-100 border border-cream-300 rounded-2xl px-4 py-3 text-xs font-bold text-charcoal-900">
            <input
              type="checkbox"
              checked={memoryEnabled}
              onChange={(e) => setMemoryEnabled(e.target.checked)}
              className="accent-gold-600"
            />
            Pinecone Langzeitgedaechtnis aktivieren
          </label>
        </div>

        <textarea
          value={customSystemPrompt}
          onChange={(e) => setCustomSystemPrompt(e.target.value)}
          rows={3}
          placeholder="Optional: z.B. Sei streng mit meiner Aussprache, uebe Vorstellungsgespraeche, korrigiere nur auf B1-Niveau..."
          className="w-full bg-cream-100 border border-cream-300 rounded-2xl p-3 text-xs text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-gold-500 resize-none"
        />
      </div>

      <div className="bg-cream-900 text-cream-50 rounded-3xl border border-gold-500/40 p-8 sm:p-12 shadow-2xl relative overflow-hidden flex flex-col items-center text-center space-y-8">
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-charcoal-800/80 rounded-full text-xs text-gold-400 border border-gold-500/30 shadow-inner max-w-full">
            <Brain size={15} className="text-gold-400 shrink-0" />
            <span className="truncate">Pinecone Memory: {memoryEnabled ? (pineconeMemoryCount > 0 ? `${pineconeMemoryCount} Erinnerungen genutzt` : 'Bereit') : 'Aus'}</span>
          </div>

          <h3 className="font-serif text-3xl sm:text-4xl font-bold text-cream-50 tracking-tight">
            DeutschMeister Voice Call
          </h3>

          <div className="flex items-center justify-center gap-3 text-xs text-cream-300 font-mono tracking-wider">
            <span>{isCallActive ? `Dauer: ${formatDuration(callDuration)}` : `Bereit fuer ${callLevel}`}</span>
            {latencyMs && isCallActive && (
              <span className="flex items-center gap-1 text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/30">
                <Zap size={12} /> {latencyMs}ms
              </span>
            )}
          </div>
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center my-2">
          {isAiSpeaking && (
            <div className="flex items-center gap-1.5 h-12 mb-4">
              {[40, 70, 100, 60, 90, 50, 80, 40].map((h, i) => (
                <div key={i} style={{ height: `${h}%` }} className="w-1.5 bg-gold-400 rounded-full animate-bounce" />
              ))}
            </div>
          )}

          {isListeningMic && (
            <div className="flex items-center gap-1.5 h-12 mb-4">
              {[60, 90, 40, 100, 70, 50].map((h, i) => (
                <div key={i} style={{ height: `${h}%` }} className="w-1.5 bg-rose-500 rounded-full animate-pulse" />
              ))}
            </div>
          )}

          <div className={`w-40 h-40 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-300 border-2 ${
            isCallActive
              ? (isAiSpeaking ? 'bg-gold-500/20 border-gold-400 scale-105' : isListeningMic ? 'bg-rose-500/20 border-rose-400 scale-105' : 'bg-charcoal-800 border-gold-500/30')
              : 'bg-charcoal-800/80 border-cream-300/20'
          }`}>
            <div className="w-22 h-22 rounded-full bg-cream-900 border border-gold-500/40 flex items-center justify-center text-gold-400 shadow-inner p-5">
              <Phone size={40} className={isCallActive ? 'animate-bounce' : ''} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-cream-200 mt-2">
              {isAiSpeaking ? 'KI spricht...' : isListeningMic ? 'Hoert zu...' : isCallActive ? 'Anruf aktiv' : 'Aufgelegt'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6 z-10 pt-2">
          {!isCallActive ? (
            <button
              onClick={handleStartCall}
              className="px-8 py-4 bg-emerald-700 hover:bg-emerald-600 text-cream-50 font-bold text-sm rounded-2xl shadow-xl flex items-center gap-3 transition-transform hover:scale-105 border border-emerald-500/40"
            >
              <Phone size={20} /> Anruf Starten
            </button>
          ) : (
            <>
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`p-4 rounded-2xl shadow-lg border transition-all ${
                  isMuted ? 'bg-rose-900/80 text-rose-300 border-rose-600' : 'bg-charcoal-800 text-cream-50 border-gold-500/30 hover:bg-charcoal-800/80'
                }`}
                title={isMuted ? 'Mikrofon einschalten' : 'Stummschalten'}
              >
                {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
              </button>

              <button
                onClick={handleMicListen}
                disabled={isMuted || isListeningMic || isAiSpeaking}
                className={`px-8 py-4 font-bold text-xs rounded-2xl shadow-xl flex items-center gap-2 border transition-all ${
                  isListeningMic ? 'bg-rose-600 text-white animate-pulse border-rose-400' : 'bg-gold-500 hover:bg-gold-400 text-charcoal-900 border-gold-400'
                } disabled:opacity-50`}
              >
                <Mic size={18} /> {isListeningMic ? 'Sprechen...' : isAiSpeaking ? 'KI spricht' : 'Sprechen'}
              </button>

              <button
                onClick={handleEndCall}
                className="p-4 bg-rose-700 hover:bg-rose-600 text-white rounded-2xl shadow-lg border border-rose-500/40 transition-transform hover:scale-105"
                title="Anruf Beenden"
              >
                <PhoneOff size={22} />
              </button>
            </>
          )}
        </div>

        {callMessages.length > 0 && (
          <div className="w-full max-h-52 overflow-y-auto overflow-x-hidden p-4 bg-charcoal-950/80 rounded-2xl border border-gold-500/20 text-left space-y-2 text-xs z-10 shadow-inner">
            <div className="flex items-center justify-between gap-2 border-b border-gold-500/20 pb-1 mb-2">
              <span className="text-[10px] font-bold text-gold-400 uppercase tracking-widest truncate">
                Echtzeit Gespraechsprotokoll ({callMessages.length})
              </span>
              <span className="text-[10px] text-cream-300 shrink-0">Memory alle 30 Nachrichten</span>
            </div>
            {callMessages.map((msg, idx) => (
              <div key={idx} className={`p-2.5 rounded-xl break-words ${msg.sender === 'user' ? 'bg-gold-500/10 text-gold-300 font-semibold text-right' : 'bg-charcoal-900 text-cream-100'}`}>
                <strong>{msg.sender === 'bot' ? 'KI Partner' : 'Du'}:</strong> {msg.text}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
