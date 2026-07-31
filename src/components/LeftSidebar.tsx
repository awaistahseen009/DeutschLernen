'use client';

import React from 'react';
import { 
  BookOpen, 
  Newspaper, 
  Mic, 
  Phone,
  Heart, 
  Sparkles, 
  Volume2, 
  User, 
  Menu, 
  X,
  Layers,
  Youtube,
  LogOut
} from 'lucide-react';

interface LeftSidebarProps {
  activeTab: 'vocab' | 'reading' | 'exercises' | 'call' | 'favorites' | 'youtube';
  setActiveTab: (tab: 'vocab' | 'reading' | 'exercises' | 'call' | 'favorites' | 'youtube') => void;
  selectedLevel: string;
  setSelectedLevel: (level: string) => void;
  germanVoices: SpeechSynthesisVoice[];
  selectedVoiceURI: string;
  setSelectedVoiceURI: (uri: string) => void;
  learnedCount: number;
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
  onOpenLogin: () => void;
  currentUser: { email: string } | null;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  activeTab,
  setActiveTab,
  selectedLevel,
  setSelectedLevel,
  germanVoices,
  selectedVoiceURI,
  setSelectedVoiceURI,
  learnedCount,
  isOpenMobile,
  setIsOpenMobile,
  onOpenLogin,
  currentUser
}) => {
  const levels = ['ALL', 'A1', 'A2', 'B1', 'B2'];

  const navItems = [
    { id: 'vocab', label: 'Wortschatz & Verben', sub: 'Flashcards & Conjugations', icon: BookOpen },
    { id: 'youtube', label: 'YouTube Extractor', sub: 'Transcripts & Auto-Flashcards', icon: Youtube },
    { id: 'reading', label: 'KI Lesetexte', sub: 'Interactive Passages & Hover', icon: Newspaper },
    { id: 'exercises', label: 'Sprechen, Schreiben & Hören', sub: 'AI Conversations & 15Q Quiz', icon: Mic },
    { id: 'call', label: 'Echtzeit KI Anruf', sub: 'Live Voice Call & Pinecone Memory', icon: Phone },
    { id: 'favorites', label: 'Favoriten & Notizen', sub: 'Saved Cards & Sentences', icon: Heart },
  ] as const;

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    } catch (err) {
      window.location.href = '/login';
    }
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button 
        onClick={() => setIsOpenMobile(!isOpenMobile)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-cream-900 text-cream-50 rounded-xl shadow-lg border border-gold-500/30"
        aria-label="Toggle Navigation"
      >
        {isOpenMobile ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Backdrop for Mobile */}
      {isOpenMobile && (
        <div 
          onClick={() => setIsOpenMobile(false)} 
          className="lg:hidden fixed inset-0 bg-charcoal-950/60 backdrop-blur-sm z-40 transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 left-0 bottom-0 z-40 w-80 bg-cream-100 border-r border-cream-300/80 p-6 flex flex-col justify-between
        transform transition-transform duration-300 ease-in-out overflow-y-auto
        ${isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand Header */}
        <div>
          <div className="flex items-center gap-3 pb-6 border-b border-cream-300/60">
            <div className="w-11 h-11 rounded-2xl bg-cream-900 text-gold-500 flex items-center justify-center font-serif text-2xl font-bold shadow-md border border-gold-500/30">
              D
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-charcoal-900 tracking-wide">
                DeutschMeister
              </h1>
              <p className="text-xs text-cream-800 tracking-wider uppercase font-semibold">
                High-Frequency German
              </p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="mt-6 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as any);
                    setIsOpenMobile(false);
                  }}
                  className={`
                    w-full flex items-center gap-3.5 p-3.5 rounded-2xl text-left transition-all duration-200 group
                    ${isActive 
                      ? 'bg-cream-900 text-cream-50 shadow-md border border-gold-500/30' 
                      : 'hover:bg-cream-200/80 text-charcoal-800'}
                  `}
                >
                  <div className={`
                    p-2 rounded-xl transition-colors
                    ${isActive ? 'bg-gold-500/20 text-gold-400' : 'bg-cream-200 text-cream-800 group-hover:bg-cream-300'}
                  `}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold text-sm ${isActive ? 'text-cream-50' : 'text-charcoal-900'}`}>
                      {item.label}
                    </div>
                    <div className={`text-xs truncate ${isActive ? 'text-cream-300' : 'text-cream-800'}`}>
                      {item.sub}
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Level Filter Section */}
          <div className="mt-6 pt-5 border-t border-cream-300/60">
            <div className="flex items-center gap-2 text-xs font-semibold text-cream-800 uppercase tracking-wider mb-3">
              <Layers size={14} className="text-gold-600" /> Sprachniveau Filter
            </div>
            <div className="grid grid-cols-5 gap-1.5 bg-cream-200/80 p-1.5 rounded-2xl border border-cream-300/50">
              {levels.map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setSelectedLevel(lvl)}
                  className={`
                    py-1.5 rounded-xl text-xs font-bold transition-all
                    ${selectedLevel === lvl 
                      ? 'bg-cream-900 text-gold-400 shadow-sm' 
                      : 'text-charcoal-800 hover:text-charcoal-900 hover:bg-cream-300/50'}
                  `}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Voice Selector Dropdown */}
          <div className="mt-5 pt-5 border-t border-cream-300/60">
            <label className="flex items-center gap-2 text-xs font-semibold text-cream-800 uppercase tracking-wider mb-2">
              <Volume2 size={14} className="text-gold-600" /> Deutsche Sprachausgabe Stimmen
            </label>
            <div className="relative">
              <select
                value={selectedVoiceURI}
                onChange={(e) => setSelectedVoiceURI(e.target.value)}
                className="w-full bg-cream-50 border border-cream-300 text-charcoal-900 text-xs rounded-xl p-3 pr-8 focus:ring-2 focus:ring-gold-500 focus:outline-none font-bold shadow-sm cursor-pointer"
              >
                <option value="">🎙️ Google Deutsch (Standard)</option>
                <option value="de-DE-Standard-A">🇩🇪 Katja (Natürliche Frauenstimme)</option>
                <option value="de-DE-Standard-B">🇩🇪 Stefan (Natürliche Männerstimme)</option>
                <option value="de-DE-Wavenet-A">🇩🇪 Marlene (HQ Neural Voice)</option>
                <option value="de-DE-Wavenet-B">🇩🇪 Hans (HQ Neural Voice)</option>
                {germanVoices.map((voice) => (
                  <option key={voice.voiceURI} value={voice.voiceURI}>
                    🔊 {voice.name} ({voice.lang})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Footer & User / Stats & Signout */}
        <div className="pt-5 border-t border-cream-300/60 space-y-3 mt-6">
          <div className="bg-cream-200/90 rounded-2xl p-3 border border-cream-300/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sparkles size={16} className="text-gold-600" />
              <div>
                <div className="text-xs font-semibold text-charcoal-900">Gelernt</div>
                <div className="text-[11px] text-cream-800">{learnedCount} Wörter gemeistert</div>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-cream-900 text-gold-400 rounded-lg">
              {learnedCount}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenLogin}
              className="flex-1 flex items-center justify-between p-3 bg-cream-50 hover:bg-cream-200 rounded-2xl border border-cream-300 text-xs font-medium text-charcoal-900 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cream-900 text-cream-50 flex items-center justify-center font-bold">
                  <User size={15} />
                </div>
                <div className="text-left min-w-0">
                  <div className="font-bold text-charcoal-900 truncate max-w-[110px]">{currentUser ? currentUser.email : 'Admin Login'}</div>
                  <div className="text-[10px] text-cream-800">Neon DB Sync</div>
                </div>
              </div>
            </button>

            <button
              onClick={handleSignOut}
              className="p-3 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-2xl border border-rose-200 transition-colors flex items-center gap-1 shrink-0 font-bold text-xs"
              title="Abmelden (Sign Out)"
            >
              <LogOut size={16} />
              <span>Abmelden</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
