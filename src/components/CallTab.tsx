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
  Sparkles,
  Zap
} from 'lucide-react';

interface CallTabProps {
  selectedVoiceURI: string;
}

export const CallTab: React.FC<CallTabProps> = ({ selectedVoiceURI }) => {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [speechRate, setSpeechRate] = useState<number>(1.0); // 0.5x, 0.75x, 1.0x, 1.25x, 1.5x
  const [callDuration, setCallDuration] = useState(0);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const [callMessages, setCallMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string }>>([]);
  const [pineconeMemoryCount, setPineconeMemoryCount] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Duration timer
  useEffect(() => {
    if (isCallActive) {
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setCallDuration(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isCallActive]);

  // Low-latency TTS with rate control
  const speakTextWithRate = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'de-DE';
    utterance.rate = speechRate;

    if (selectedVoiceURI) {
      const voices = window.speechSynthesis.getVoices();
      const foundVoice = voices.find(v => v.voiceURI === selectedVoiceURI);
      if (foundVoice) utterance.voice = foundVoice;
    }

    utterance.onstart = () => setIsAiSpeaking(true);
    utterance.onend = () => setIsAiSpeaking(false);
    utterance.onerror = () => setIsAiSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // Start Call
  const handleStartCall = () => {
    setIsCallActive(true);
    const greeting = 'Hallo! Schön, dass du anrufst. Ich bin dein deutscher KI-Anrufer. Wie geht es dir heute?';
    setCallMessages([{ sender: 'bot', text: greeting }]);
    speakTextWithRate(greeting);
  };

  // End Call
  const handleEndCall = () => {
    window.speechSynthesis.cancel();
    setIsCallActive(false);
    setIsAiSpeaking(false);
    setIsListeningMic(false);
  };

  // Microphone STT for Live Call
  const handleMicListen = () => {
    if (isMuted) return;
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech Recognition (STT) is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'de-DE';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListeningMic(true);
    };

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsListeningMic(false);

      if (!transcript.trim()) return;

      const startTime = Date.now();
      const newHistory = [...callMessages, { sender: 'user' as const, text: transcript }];
      setCallMessages(newHistory);

      try {
        const res = await fetch('/api/call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userMessage: transcript,
            messageHistory: newHistory,
            userId: '1'
          })
        });
        const data = await res.json();
        const endTime = Date.now();
        setLatencyMs(endTime - startTime);

        const reply = data.response || 'Ich habe dich verstanden!';

        if (data.memoriesUsed) setPineconeMemoryCount(data.memoriesUsed);

        setCallMessages(prev => [...prev, { sender: 'bot', text: reply }]);
        speakTextWithRate(reply);
      } catch (err) {
        console.error('Call send error:', err);
      }
    };

    recognition.onerror = () => {
      setIsListeningMic(false);
    };

    recognition.onend = () => {
      setIsListeningMic(false);
    };

    recognition.start();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const speeds = [0.5, 0.75, 1.0, 1.25, 1.5];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-cream-50 p-6 rounded-3xl border border-cream-300/80 shadow-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-gold-700 uppercase tracking-widest flex items-center gap-1.5">
            <Radio size={14} className="text-emerald-600 animate-pulse" /> Echtzeit KI Anruf & Pinecone Memory
          </span>
          <h2 className="font-serif text-3xl font-bold text-charcoal-900 mt-1">Natürlicher Sprach-Anruf</h2>
          <p className="text-xs text-cream-800 mt-1">Geringe Latenz, STT Spracherkennung, Pinecone Vector Vektorgedächtnis & Geschwindigkeitsregler.</p>
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

      {/* CALL CONSOLE UI */}
      <div className="bg-cream-900 text-cream-50 rounded-3xl border border-gold-500/40 p-8 sm:p-12 shadow-2xl relative overflow-hidden flex flex-col items-center text-center space-y-8">
        {/* Glow Effects */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Call Header Status */}
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-charcoal-800/80 rounded-full text-xs text-gold-400 border border-gold-500/30 shadow-inner">
            <Brain size={15} className="text-gold-400" />
            <span>Pinecone Vektorgedächtnis (index: <strong>germanlang</strong>): {pineconeMemoryCount > 0 ? `${pineconeMemoryCount} Erinnerungen` : 'Bereit'}</span>
          </div>

          <h3 className="font-serif text-3xl sm:text-4xl font-bold text-cream-50 tracking-tight">
            DeutschMeister Voice Call
          </h3>

          <div className="flex items-center justify-center gap-3 text-xs text-cream-300 font-mono tracking-wider">
            <span>{isCallActive ? `Dauer: ${formatDuration(callDuration)}` : 'Bereit für Anruf'}</span>
            {latencyMs && isCallActive && (
              <span className="flex items-center gap-1 text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/30">
                <Zap size={12} /> {latencyMs}ms Latenz
              </span>
            )}
          </div>
        </div>

        {/* Soundwave Equalizer & Audio Ring */}
        <div className="relative z-10 flex flex-col items-center justify-center my-2">
          {/* Animated Equalizer Waves */}
          {isAiSpeaking && (
            <div className="flex items-center gap-1.5 h-12 mb-4">
              {[40, 70, 100, 60, 90, 50, 80, 40].map((h, i) => (
                <div
                  key={i}
                  style={{ height: `${h}%` }}
                  className="w-1.5 bg-gold-400 rounded-full animate-bounce"
                />
              ))}
            </div>
          )}

          {isListeningMic && (
            <div className="flex items-center gap-1.5 h-12 mb-4">
              {[60, 90, 40, 100, 70, 50].map((h, i) => (
                <div
                  key={i}
                  style={{ height: `${h}%` }}
                  className="w-1.5 bg-rose-500 rounded-full animate-pulse"
                />
              ))}
            </div>
          )}

          <div className={`
            w-40 h-40 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-300 border-2
            ${isCallActive 
              ? (isAiSpeaking ? 'bg-gold-500/20 border-gold-400 scale-105' : isListeningMic ? 'bg-rose-500/20 border-rose-400 scale-105' : 'bg-charcoal-800 border-gold-500/30')
              : 'bg-charcoal-800/80 border-cream-300/20'}
          `}>
            <div className="w-22 h-22 rounded-full bg-cream-900 border border-gold-500/40 flex items-center justify-center text-gold-400 shadow-inner p-5">
              <Phone size={40} className={isCallActive ? 'animate-bounce' : ''} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-cream-200 mt-2">
              {isAiSpeaking ? 'KI Spricht...' : isListeningMic ? 'Hört zu...' : isCallActive ? 'Anruf Aktiv' : 'Aufgelegt'}
            </span>
          </div>
        </div>

        {/* Call Controls */}
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
              {/* Mute Button */}
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`p-4 rounded-2xl shadow-lg border transition-all ${
                  isMuted 
                    ? 'bg-rose-900/80 text-rose-300 border-rose-600' 
                    : 'bg-charcoal-800 text-cream-50 border-gold-500/30 hover:bg-charcoal-800/80'
                }`}
                title={isMuted ? 'Mikrofon einschalten' : 'Stummschalten'}
              >
                {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
              </button>

              {/* Speak / Microphone Push Button */}
              <button
                onClick={handleMicListen}
                disabled={isMuted || isListeningMic}
                className={`px-8 py-4 font-bold text-xs rounded-2xl shadow-xl flex items-center gap-2 border transition-all ${
                  isListeningMic
                    ? 'bg-rose-600 text-white animate-pulse border-rose-400'
                    : 'bg-gold-500 hover:bg-gold-400 text-charcoal-900 border-gold-400'
                }`}
              >
                <Mic size={18} /> {isListeningMic ? 'Sprechen...' : 'Sprechen (STT)'}
              </button>

              {/* End Call Button */}
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

        {/* Live Call Transcript */}
        {callMessages.length > 0 && (
          <div className="w-full max-h-52 overflow-y-auto p-4 bg-charcoal-950/80 rounded-2xl border border-gold-500/20 text-left space-y-2 text-xs z-10 shadow-inner">
            <div className="flex items-center justify-between border-b border-gold-500/20 pb-1 mb-2">
              <span className="text-[10px] font-bold text-gold-400 uppercase tracking-widest">
                Echtzeit Gesprächsprotokoll ({callMessages.length} Nachrichten)
              </span>
              <span className="text-[10px] text-cream-300">Sichert nach 30 Nachrichten in Pinecone</span>
            </div>
            {callMessages.map((msg, idx) => (
              <div key={idx} className={`p-2.5 rounded-xl ${msg.sender === 'user' ? 'bg-gold-500/10 text-gold-300 font-semibold text-right' : 'bg-charcoal-900 text-cream-100'}`}>
                <strong>{msg.sender === 'bot' ? 'KI Partner' : 'Du'}:</strong> {msg.text}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
