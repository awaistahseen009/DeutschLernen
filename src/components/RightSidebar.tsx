'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  ChevronLeft, 
  BookMarked, 
  Sparkles,
  Loader2,
  X,
  Grid
} from 'lucide-react';
import { VocabItem } from '@/data/vocabData';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
}

interface RightSidebarProps {
  selectedVocab: VocabItem | null;
  chatbotPromptWord: string | null;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  selectedVocab,
  chatbotPromptWord,
  isOpen,
  setIsOpen
}) => {
  const [activeRightTab, setActiveRightTab] = useState<'grammar' | 'chatbot'>('grammar');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'bot',
      text: 'Hallo! Ich bin dein deutscher KI-Tutor. Frage mich nach Bedeutungen, Deklinationen, Grammatik oder Beispielsätzen!'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Switch to chatbot and populate prompt if a word is left-clicked
  useEffect(() => {
    if (chatbotPromptWord) {
      setActiveRightTab('chatbot');
      setIsOpen(true);
      handleSendMessage(`Erkläre mir bitte das Wort "${chatbotPromptWord}" und zeige 2 Beispielsätze.`, chatbotPromptWord);
    }
  }, [chatbotPromptWord]);

  // Open right sidebar if grammar item selected
  useEffect(() => {
    if (selectedVocab) {
      setActiveRightTab('grammar');
    }
  }, [selectedVocab]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (textToSend?: string, wordContext?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), sender: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userMessage: text, 
          selectedWord: wordContext // Only pass selectedWord when triggered by a word click
        })
      });
      const data = await res.json();

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: data.response || 'Entschuldigung, ich konnte das leider nicht verarbeiten.'
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'bot',
        text: 'Es gab ein Verbindungsproblem mit dem KI-Tutor.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const verb = selectedVocab?.type === 'verb' ? selectedVocab : null;
  const conj = verb?.conjugation;

  const noun = selectedVocab?.type === 'noun' ? selectedVocab : null;
  const decl = noun?.declension;

  return (
    <>
      {/* Desktop Toggle Button when closed */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="hidden lg:flex fixed top-20 right-0 z-30 p-2.5 bg-cream-900 text-gold-400 rounded-l-2xl shadow-xl border-l border-t border-b border-gold-500/30 hover:bg-charcoal-900 transition-all items-center gap-2"
        >
          <ChevronLeft size={18} />
          <span className="text-xs font-serif font-bold tracking-wider uppercase pr-1">Grammatik & Chat</span>
        </button>
      )}

      {/* Right Sidebar Drawer */}
      <aside className={`
        fixed top-0 right-0 bottom-0 z-40 w-full sm:w-96 bg-cream-100 border-l border-cream-300/80 p-5 flex flex-col justify-between
        transform transition-transform duration-300 ease-in-out shadow-2xl
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between pb-4 border-b border-cream-300/60">
          <div className="flex items-center gap-2 bg-cream-200 p-1 rounded-2xl border border-cream-300/50">
            <button
              onClick={() => setActiveRightTab('grammar')}
              className={`
                px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5
                ${activeRightTab === 'grammar' 
                  ? 'bg-cream-900 text-gold-400 shadow-sm' 
                  : 'text-charcoal-800 hover:text-charcoal-900'}
              `}
            >
              <BookMarked size={14} /> Grammatik / Form
            </button>
            <button
              onClick={() => setActiveRightTab('chatbot')}
              className={`
                px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5
                ${activeRightTab === 'chatbot' 
                  ? 'bg-cream-900 text-gold-400 shadow-sm' 
                  : 'text-charcoal-800 hover:text-charcoal-900'}
              `}
            >
              <Bot size={14} /> KI Tutor Chat
            </button>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-cream-200 text-charcoal-800 rounded-xl transition-colors"
            title="Schließen"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab 1: Verb Conjugations / Noun Declensions */}
        {activeRightTab === 'grammar' && (
          <div className="flex-1 overflow-y-auto my-4 pr-1 space-y-5">
            {/* VERB CONJUGATIONS */}
            {verb && conj && (
              <div>
                <div className="bg-cream-900 text-cream-50 p-4 rounded-2xl border border-gold-500/30 shadow-md mb-4">
                  <div className="text-xs text-gold-400 uppercase tracking-widest font-semibold">Verb Konjugation</div>
                  <h2 className="font-serif text-2xl font-bold mt-1 text-cream-50">{verb.word}</h2>
                  <p className="text-xs text-cream-300 mt-0.5">{verb.translation}</p>
                </div>

                <div className="space-y-4">
                  {/* Präsens */}
                  <div className="bg-cream-50 p-4 rounded-2xl border border-cream-300/70 shadow-sm">
                    <h3 className="font-serif font-bold text-sm text-charcoal-900 border-b border-cream-200 pb-2 mb-2 flex items-center justify-between">
                      <span>Präsens (Gegenwart)</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-cream-800">ich:</span> <strong>{conj.praesens.ich}</strong></div>
                      <div><span className="text-cream-800">wir:</span> <strong>{conj.praesens.wir}</strong></div>
                      <div><span className="text-cream-800">du:</span> <strong>{conj.praesens.du}</strong></div>
                      <div><span className="text-cream-800">ihr:</span> <strong>{conj.praesens.ihr}</strong></div>
                      <div><span className="text-cream-800">er/sie/es:</span> <strong>{conj.praesens.er_sie_es}</strong></div>
                      <div><span className="text-cream-800">sie/Sie:</span> <strong>{conj.praesens.sie_Sie}</strong></div>
                    </div>
                  </div>

                  {/* Präteritum */}
                  <div className="bg-cream-50 p-4 rounded-2xl border border-cream-300/70 shadow-sm">
                    <h3 className="font-serif font-bold text-sm text-charcoal-900 border-b border-cream-200 pb-2 mb-2">
                      Präteritum (Vergangenheit)
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-cream-800">ich:</span> <strong>{conj.praeteritum.ich}</strong></div>
                      <div><span className="text-cream-800">wir:</span> <strong>{conj.praeteritum.wir}</strong></div>
                      <div><span className="text-cream-800">du:</span> <strong>{conj.praeteritum.du}</strong></div>
                      <div><span className="text-cream-800">ihr:</span> <strong>{conj.praeteritum.ihr}</strong></div>
                      <div><span className="text-cream-800">er/sie/es:</span> <strong>{conj.praeteritum.er_sie_es}</strong></div>
                      <div><span className="text-cream-800">sie/Sie:</span> <strong>{conj.praeteritum.sie_Sie}</strong></div>
                    </div>
                  </div>

                  {/* Perfekt */}
                  <div className="bg-cream-50 p-4 rounded-2xl border border-cream-300/70 shadow-sm">
                    <h3 className="font-serif font-bold text-sm text-charcoal-900 border-b border-cream-200 pb-2 mb-2">
                      Perfekt & Partizip II
                    </h3>
                    <div className="text-xs space-y-1">
                      <div><span className="text-cream-800">Hilfsverb:</span> <strong className="text-gold-700">{conj.perfekt.hilfsverb}</strong></div>
                      <div><span className="text-cream-800">Partizip II:</span> <strong>{conj.perfekt.partizip_ii}</strong></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* NOUN DECLENSIONS (Kasus: Nominativ, Akkusativ, Dativ, Genitiv) */}
            {noun && decl && (
              <div>
                <div className="bg-cream-900 text-cream-50 p-4 rounded-2xl border border-gold-500/30 shadow-md mb-4">
                  <div className="text-xs text-gold-400 uppercase tracking-widest font-semibold">Nomen Deklination (Kasus)</div>
                  <h2 className="font-serif text-2xl font-bold mt-1 text-cream-50">
                    <span className="text-gold-400 font-normal mr-2">{noun.article}</span>
                    {noun.word}
                  </h2>
                  <p className="text-xs text-cream-300 mt-0.5">{noun.translation} (Plural: {noun.plural})</p>
                </div>

                <div className="bg-cream-50 p-4 rounded-2xl border border-cream-300/70 shadow-sm space-y-3">
                  <h3 className="font-serif font-bold text-sm text-charcoal-900 border-b border-cream-200 pb-2 flex items-center justify-between">
                    <span>Kasus-Deklination Table</span>
                    <Grid size={14} className="text-gold-700" />
                  </h3>

                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 bg-cream-100/80 rounded-xl flex items-center justify-between">
                      <span className="font-bold text-charcoal-900">1. Nominativ (Wer/Was?):</span>
                      <strong className="text-gold-700">{decl.nominativ}</strong>
                    </div>
                    <div className="p-2.5 bg-cream-100/80 rounded-xl flex items-center justify-between">
                      <span className="font-bold text-charcoal-900">2. Akkusativ (Wen/Was?):</span>
                      <strong className="text-gold-700">{decl.akkusativ}</strong>
                    </div>
                    <div className="p-2.5 bg-cream-100/80 rounded-xl flex items-center justify-between">
                      <span className="font-bold text-charcoal-900">3. Dativ (Wem?):</span>
                      <strong className="text-gold-700">{decl.dativ}</strong>
                    </div>
                    <div className="p-2.5 bg-cream-100/80 rounded-xl flex items-center justify-between">
                      <span className="font-bold text-charcoal-900">4. Genitiv (Wessen?):</span>
                      <strong className="text-gold-700">{decl.genitiv}</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!verb && !noun && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-cream-800">
                <BookMarked size={40} className="text-cream-400 mb-3" />
                <h3 className="font-serif font-bold text-lg text-charcoal-900">Keine Grammatik-Karte gewählt</h3>
                <p className="text-xs mt-1 leading-relaxed">
                  Klicke auf eine Karte, um Konjugationen für Verben oder Kasus-Deklinationen (Nominativ, Akkusativ, Dativ, Genitiv) für Nomen anzuzeigen!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: AI Chatbot */}
        {activeRightTab === 'chatbot' && (
          <div className="flex-1 flex flex-col my-4 min-h-0">
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`
                    p-3.5 rounded-2xl text-xs max-w-[85%] leading-relaxed shadow-sm
                    ${msg.sender === 'user' 
                      ? 'ml-auto bg-cream-900 text-cream-50 rounded-br-none border border-gold-500/20' 
                      : 'bg-cream-50 text-charcoal-900 border border-cream-300/70 rounded-bl-none'}
                  `}
                >
                  {msg.sender === 'bot' && (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-gold-700 mb-1">
                      <Sparkles size={12} /> KI Deutsch-Tutor
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                </div>
              ))}
              {isLoading && (
                <div className="bg-cream-50 p-3 rounded-2xl text-xs text-cream-800 border border-cream-300/70 flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-gold-600" />
                  <span>Der Tutor denkt nach...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="mt-3 pt-3 border-t border-cream-300/60">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Frage etwas über Deutsch..."
                  className="flex-1 bg-cream-50 border border-cream-300 rounded-xl px-3 py-2 text-xs text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={isLoading || !inputText.trim()}
                  className="p-2.5 bg-cream-900 hover:bg-charcoal-900 text-gold-400 disabled:opacity-50 rounded-xl transition-colors flex items-center justify-center"
                >
                  {isLoading ? <Loader2 size={15} className="animate-spin text-gold-400" /> : <Send size={15} />}
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
