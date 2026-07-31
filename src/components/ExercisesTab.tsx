'use client';

import React, { useState, useEffect } from 'react';
import { 
  Mic, 
  MicOff,
  PenTool, 
  Headphones, 
  Volume2, 
  CheckCircle2, 
  RefreshCw, 
  Award,
  Sparkles
} from 'lucide-react';

interface ExercisesTabProps {
  selectedVoiceURI: string;
}

export const ExercisesTab: React.FC<ExercisesTabProps> = ({ selectedVoiceURI }) => {
  const [subTab, setSubTab] = useState<'speaking' | 'writing' | 'listening'>('speaking');

  // Speaking state & STT
  const [speakingMessages, setSpeakingMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string }>>([
    { sender: 'bot', text: 'Hallo! Lass uns auf Deutsch sprechen. Klicke auf das Mikrofon oder schreibe deine Antwort.' }
  ]);
  const [speakingInput, setSpeakingInput] = useState('');
  const [isSpeakingLoading, setIsSpeakingLoading] = useState(false);
  const [isListeningMicrophone, setIsListeningMicrophone] = useState(false);

  // Writing state
  const [writingPromptIndex, setWritingPromptIndex] = useState(0);
  const writingPrompts = [
    { title: 'Traumreise planen', english: 'Write a short email (4-5 sentences) to a friend describing your dream holiday in Germany and why you want to visit.' },
    { title: 'Mein Arbeitsalltag', english: 'Write a description of your daily work or study routine and how you manage stress and free time.' },
    { title: 'Umweltschutz im Alltag', english: 'Express your opinion on environmental protection and recycling in everyday life.' }
  ];
  const [userWritingText, setUserWritingText] = useState('');
  const [writingGrading, setWritingGrading] = useState<any>(null);
  const [isWritingLoading, setIsWritingLoading] = useState(false);

  // Listening state
  const [listeningData, setListeningData] = useState<any>(null);
  const [isListeningLoading, setIsListeningLoading] = useState(false);
  const [userListeningAnswers, setUserListeningAnswers] = useState<Record<number, number>>({});
  const [listeningScore, setListeningScore] = useState<number | null>(null);

  // TTS Speech
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

  // STT Microphone Recording
  const startMicrophoneSTT = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech Recognition (STT) is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'de-DE';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListeningMicrophone(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSpeakingInput(transcript);
      setIsListeningMicrophone(false);
    };

    recognition.onerror = () => {
      setIsListeningMicrophone(false);
    };

    recognition.onend = () => {
      setIsListeningMicrophone(false);
    };

    recognition.start();
  };

  const handleSendSpeaking = async (textOver?: string) => {
    const textToSend = textOver || speakingInput;
    if (!textToSend.trim()) return;
    setSpeakingInput('');
    setSpeakingMessages(prev => [...prev, { sender: 'user', text: textToSend }]);
    setIsSpeakingLoading(true);

    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: `Ich übe Deutsch sprechen. Ich habe gesagt: "${textToSend}". Korrigiere eventuelle Fehler sanft und antworte mir auf Deutsch.` })
      });
      const data = await res.json();
      const reply = data.response || 'Toll gemacht!';
      setSpeakingMessages(prev => [...prev, { sender: 'bot', text: reply }]);
      speakText(reply);
    } catch (err) {
      setSpeakingMessages(prev => [...prev, { sender: 'bot', text: 'Fehler bei der Verbindung.' }]);
    } finally {
      setIsSpeakingLoading(false);
    }
  };

  const handleGradeWriting = async () => {
    if (!userWritingText.trim()) return;
    setIsWritingLoading(true);
    try {
      const res = await fetch('/api/writing/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptEnglish: writingPrompts[writingPromptIndex].english,
          userGermanText: userWritingText
        })
      });
      const data = await res.json();
      setWritingGrading(data);
    } catch (err) {
      console.error('Writing grade error:', err);
    } finally {
      setIsWritingLoading(false);
    }
  };

  const handleGenerateListening = async () => {
    setIsListeningLoading(true);
    setListeningScore(null);
    setUserListeningAnswers({});
    try {
      const res = await fetch('/api/listening/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'Alltag, Umwelt und Kultur', action: 'generate' })
      });
      const data = await res.json();
      setListeningData(data);
    } catch (err) {
      console.error('Listening generate error:', err);
    } finally {
      setIsListeningLoading(false);
    }
  };

  const submitListeningQuiz = async () => {
    if (!listeningData?.questions) return;
    let score = 0;
    listeningData.questions.forEach((q: any, idx: number) => {
      if (userListeningAnswers[idx] === q.correctAnswer) score++;
    });
    setListeningScore(score);

    try {
      await fetch('/api/listening/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_score',
          dialogueTitle: listeningData.title,
          score,
          totalQuestions: listeningData.questions.length
        })
      });
    } catch (e) {
      console.warn('DB save score skipped');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-cream-50 p-6 rounded-3xl border border-cream-300/80 shadow-soft">
        <span className="text-xs font-semibold text-gold-700 uppercase tracking-widest">Interaktive KI Übungen (TTS & STT)</span>
        <h2 className="font-serif text-3xl font-bold text-charcoal-900 mt-1">Sprechen, Schreiben & Hören</h2>
        <p className="text-xs text-cream-800 mt-1">Sprich direkt über das Mikrofon (STT), verfasse Texte & mache 15-Fragen Quizzes.</p>
      </div>

      {/* Sub-Tab Switches */}
      <div className="flex items-center gap-2 bg-cream-200/80 p-1.5 rounded-2xl border border-cream-300/60">
        <button
          onClick={() => setSubTab('speaking')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            subTab === 'speaking' ? 'bg-cream-900 text-gold-400 shadow-sm' : 'text-charcoal-800 hover:text-charcoal-900'
          }`}
        >
          <Mic size={16} /> Sprech-Training (STT)
        </button>
        <button
          onClick={() => setSubTab('writing')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            subTab === 'writing' ? 'bg-cream-900 text-gold-400 shadow-sm' : 'text-charcoal-800 hover:text-charcoal-900'
          }`}
        >
          <PenTool size={16} /> Schreib-Prüfung
        </button>
        <button
          onClick={() => setSubTab('listening')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            subTab === 'listening' ? 'bg-cream-900 text-gold-400 shadow-sm' : 'text-charcoal-800 hover:text-charcoal-900'
          }`}
        >
          <Headphones size={16} /> Hören & 15Q Quiz
        </button>
      </div>

      {/* SUB-TAB 1: SPEAKING ROLEPLAY WITH STT */}
      {subTab === 'speaking' && (
        <div className="bg-cream-50 rounded-3xl border border-cream-300 p-6 sm:p-8 shadow-elevated space-y-4">
          <div className="flex items-center justify-between border-b border-cream-200 pb-3">
            <div>
              <h3 className="font-serif text-2xl font-bold text-charcoal-900">Echtzeit Sprach-Dialog (Mikrofon STT)</h3>
              <p className="text-xs text-cream-800">Klicke das Mikrofon an, um deine Stimme auf Deutsch aufzunehmen.</p>
            </div>
            
            <button
              onClick={startMicrophoneSTT}
              className={`p-3.5 rounded-2xl shadow-md border transition-all ${
                isListeningMicrophone 
                  ? 'bg-rose-600 text-white animate-pulse border-rose-700' 
                  : 'bg-cream-900 text-gold-400 border-gold-500/30 hover:scale-105'
              }`}
              title="Mikrofon-Spracherkennung (STT) starten"
            >
              {isListeningMicrophone ? <MicOff size={22} /> : <Mic size={22} />}
            </button>
          </div>

          {isListeningMicrophone && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-bold animate-pulse text-center">
              🎙️ Sprich jetzt auf Deutsch... Deine Stimme wird erkannt!
            </div>
          )}

          <div className="h-80 overflow-y-auto space-y-3 pr-2 border border-cream-200 p-4 rounded-2xl bg-cream-100/50">
            {speakingMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                  msg.sender === 'user'
                    ? 'ml-auto bg-cream-900 text-cream-50 border border-gold-500/20'
                    : 'bg-cream-50 text-charcoal-900 border border-cream-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-bold text-[10px] text-gold-700">
                    {msg.sender === 'bot' ? 'KI Deutsch-Partner' : 'Du'}
                  </span>
                  {msg.sender === 'bot' && (
                    <button onClick={() => speakText(msg.text)} className="hover:text-gold-600">
                      <Volume2 size={14} />
                    </button>
                  )}
                </div>
                <div>{msg.text}</div>
              </div>
            ))}
            {isSpeakingLoading && (
              <div className="text-xs text-cream-800 italic flex items-center gap-2 p-2">
                <RefreshCw size={14} className="animate-spin text-gold-600" /> KI Partner antwortet...
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <input
              type="text"
              value={speakingInput}
              onChange={(e) => setSpeakingInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendSpeaking()}
              placeholder="Schreibe oder sprich über das Mikrofon..."
              className="flex-1 bg-cream-50 border border-cream-300 rounded-2xl px-4 py-3 text-xs text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
            <button
              onClick={() => handleSendSpeaking()}
              disabled={isSpeakingLoading || !speakingInput.trim()}
              className="px-6 py-3 bg-cream-900 text-gold-400 font-bold text-xs rounded-2xl shadow-md hover:bg-charcoal-900 transition-colors border border-gold-500/30"
            >
              Senden
            </button>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: WRITING SUBMISSION & GRADING */}
      {subTab === 'writing' && (
        <div className="bg-cream-50 rounded-3xl border border-cream-300 p-6 sm:p-8 shadow-elevated space-y-6">
          <div className="border-b border-cream-200 pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-serif text-2xl font-bold text-charcoal-900">Schreib-Aufgabe & KI Korrektur</h3>
              <p className="text-xs text-cream-800">Verfasse einen deutschen Text und erhalte detailliertes Feedback.</p>
            </div>
            <div className="flex gap-1.5">
              {writingPrompts.map((_, pIdx) => (
                <button
                  key={pIdx}
                  onClick={() => {
                    setWritingPromptIndex(pIdx);
                    setWritingGrading(null);
                    setUserWritingText('');
                  }}
                  className={`w-8 h-8 rounded-xl font-bold text-xs ${
                    writingPromptIndex === pIdx ? 'bg-cream-900 text-gold-400' : 'bg-cream-200 text-charcoal-800'
                  }`}
                >
                  {pIdx + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 bg-cream-100 rounded-2xl border border-cream-300">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gold-700">Thema {writingPromptIndex + 1}: {writingPrompts[writingPromptIndex].title}</span>
            <p className="text-sm font-semibold text-charcoal-900 mt-1">{writingPrompts[writingPromptIndex].english}</p>
          </div>

          <textarea
            rows={6}
            value={userWritingText}
            onChange={(e) => setUserWritingText(e.target.value)}
            placeholder="Schreibe deinen deutschen Text hier..."
            className="w-full bg-cream-50 border border-cream-300 rounded-2xl p-4 text-sm text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-gold-500 font-serif"
          />

          <button
            onClick={handleGradeWriting}
            disabled={isWritingLoading || !userWritingText.trim()}
            className="w-full py-4 bg-cream-900 hover:bg-charcoal-900 text-gold-400 font-bold text-xs rounded-2xl shadow-md transition-colors flex items-center justify-center gap-2 border border-gold-500/30"
          >
            {isWritingLoading ? <RefreshCw size={16} className="animate-spin" /> : <PenTool size={16} />}
            Text von KI Bewerten & In Datenbank Speichern
          </button>

          {/* Writing Grading Result */}
          {writingGrading && (
            <div className="p-6 bg-cream-900 text-cream-50 rounded-3xl border border-gold-500/40 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-gold-500/30 pb-3">
                <div className="flex items-center gap-3">
                  <Award size={28} className="text-gold-400" />
                  <div>
                    <h4 className="font-serif text-xl font-bold">Bewertung: {writingGrading.score} / 100</h4>
                    <p className="text-xs text-cream-300">Grammatik: {writingGrading.grammarScore}% | Wortschatz: {writingGrading.vocabScore}%</p>
                  </div>
                </div>
              </div>

              <div>
                <strong className="text-gold-400 text-xs uppercase tracking-wider">Verbesserte Version:</strong>
                <p className="text-xs text-cream-100 font-serif italic mt-1 p-3 bg-charcoal-900/60 rounded-xl border border-gold-500/20">
                  "{writingGrading.improvedVersion}"
                </p>
              </div>

              <div className="text-xs text-cream-200">
                <strong>Feedback:</strong> {writingGrading.overallFeedback}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: LISTENING DIALOGUE & 15Q QUIZ */}
      {subTab === 'listening' && (
        <div className="bg-cream-50 rounded-3xl border border-cream-300 p-6 sm:p-8 shadow-elevated space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-cream-200 pb-4">
            <div>
              <h3 className="font-serif text-2xl font-bold text-charcoal-900">Hörübung & 15-Fragen Quiz</h3>
              <p className="text-xs text-cream-800">Höre dir das deutsche Gespräch an und beantworte alle 15 Fragen.</p>
            </div>

            <button
              onClick={handleGenerateListening}
              disabled={isListeningLoading}
              className="px-5 py-3 bg-cream-900 hover:bg-charcoal-900 text-gold-400 font-bold text-xs rounded-2xl shadow-md transition-colors flex items-center gap-2 border border-gold-500/30"
            >
              <RefreshCw size={16} className={isListeningLoading ? 'animate-spin' : ''} />
              Neuen Hör-Dialog Generieren
            </button>
          </div>

          {!listeningData && !isListeningLoading && (
            <div className="p-8 text-center bg-cream-100 rounded-2xl border border-cream-300">
              <Headphones size={36} className="text-gold-700 mx-auto mb-2" />
              <p className="text-xs font-bold text-charcoal-900">Klicke oben auf "Neuen Hör-Dialog Generieren", um zu starten.</p>
            </div>
          )}

          {isListeningLoading && (
            <div className="p-8 text-center space-y-2">
              <RefreshCw size={28} className="animate-spin text-gold-600 mx-auto" />
              <p className="text-xs font-semibold text-charcoal-900">Gemini erstellt ein natürliches Gespräch & 15 Fragen...</p>
            </div>
          )}

          {listeningData && (
            <div className="space-y-6">
              {/* Dialogue Transcript with Audio Play */}
              <div className="p-6 bg-cream-100 rounded-2xl border border-cream-300 space-y-3">
                <div className="flex items-center justify-between border-b border-cream-200 pb-2">
                  <h4 className="font-serif font-bold text-lg text-charcoal-900">{listeningData.title}</h4>
                  <button
                    onClick={() => {
                      const fullText = listeningData.dialogue.map((d: any) => `${d.speaker}: ${d.german}`).join('. ');
                      speakText(fullText);
                    }}
                    className="px-3 py-1.5 bg-cream-900 text-gold-400 rounded-xl text-xs font-bold flex items-center gap-1.5"
                  >
                    <Volume2 size={15} /> Gesamten Dialog Anhören
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {listeningData.dialogue?.map((line: any, dIdx: number) => (
                    <div key={dIdx} className="text-xs flex items-start gap-2 p-2 bg-cream-50 rounded-xl border border-cream-200">
                      <strong className="text-gold-700 min-w-[60px]">{line.speaker}:</strong>
                      <div className="flex-1">
                        <span className="font-medium text-charcoal-900">{line.german}</span>
                        <div className="text-[10px] text-cream-800 italic">{line.english}</div>
                      </div>
                      <button onClick={() => speakText(line.german)} className="hover:text-gold-600 text-cream-800">
                        <Volume2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 15 Questions List */}
              <div className="space-y-4">
                <h4 className="font-serif font-bold text-xl text-charcoal-900">15 Verständnisfragen</h4>

                {listeningData.questions?.map((q: any, qIdx: number) => (
                  <div key={qIdx} className="p-4 bg-cream-100 rounded-2xl border border-cream-300 space-y-2">
                    <p className="text-xs font-bold text-charcoal-900">
                      {qIdx + 1}. {q.question}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {q.options?.map((opt: string, oIdx: number) => (
                        <button
                          key={oIdx}
                          onClick={() => setUserListeningAnswers(prev => ({ ...prev, [qIdx]: oIdx }))}
                          className={`p-2.5 rounded-xl border text-left font-semibold transition-all ${
                            userListeningAnswers[qIdx] === oIdx
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

                {listeningScore !== null ? (
                  <div className="p-6 bg-cream-900 text-gold-400 rounded-3xl text-center space-y-2 border border-gold-500/40">
                    <Award size={32} className="mx-auto" />
                    <h3 className="font-serif text-2xl font-bold">Ergebnis: {listeningScore} / {listeningData.questions.length} Richtig</h3>
                    <p className="text-xs text-cream-100">In Neon PostgreSQL Datenbank gespeichert!</p>
                  </div>
                ) : (
                  <button
                    onClick={submitListeningQuiz}
                    disabled={Object.keys(userListeningAnswers).length < 15}
                    className="w-full py-4 bg-cream-900 hover:bg-charcoal-900 text-gold-400 font-bold text-xs rounded-2xl shadow-md disabled:opacity-50 transition-colors border border-gold-500/30"
                  >
                    15 Fragen Auswerten & Speichern
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
