'use client';

import React, { useState, useEffect } from 'react';
import { VOCAB_DATABASE, VocabItem } from '@/data/vocabData';
import { LeftSidebar } from '@/components/LeftSidebar';
import { RightSidebar } from '@/components/RightSidebar';
import { VocabTab } from '@/components/VocabTab';
import { ReadingTab } from '@/components/ReadingTab';
import { ExercisesTab } from '@/components/ExercisesTab';
import { CallTab } from '@/components/CallTab';
import { FavoritesTab } from '@/components/FavoritesTab';
import { LoginModal } from '@/components/LoginModal';
import { Lock, User } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'vocab' | 'reading' | 'exercises' | 'call' | 'favorites'>('vocab');
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [germanVoices, setGermanVoices] = useState<SpeechSynthesisVoice[]>([]);

  // DB Synced Progress & Favorites
  const [learnedIds, setLearnedIds] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Record<string, string>>({});
  const [currentUser, setCurrentUser] = useState<{ email: string } | null>(null);

  // Sidebars open state
  const [isMobileLeftOpen, setIsMobileLeftOpen] = useState(false);
  const [isRightOpen, setIsRightOpen] = useState(true);

  // Selected item & chatbot word click
  const [selectedVocab, setSelectedVocab] = useState<VocabItem | null>(null);
  const [chatbotPromptWord, setChatbotPromptWord] = useState<string | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  // Auto open login on first load if not authenticated
  useEffect(() => {
    if (!currentUser) {
      setIsLoginOpen(true);
    }
  }, [currentUser]);

  // Load German TTS voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        const deVoices = voices.filter(v => v.lang.startsWith('de'));
        setGermanVoices(deVoices);
        if (deVoices.length > 0 && !selectedVoiceURI) {
          setSelectedVoiceURI(deVoices[0].voiceURI);
        }
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Fetch progress & favorites directly from Neon PostgreSQL API
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const res = await fetch('/api/vocab/progress');
        if (res.ok) {
          const data = await res.json();
          if (data.learnedIds) setLearnedIds(data.learnedIds);
          if (data.favorites) setFavorites(data.favorites);
        }
      } catch (err) {
        console.warn('DB fetch warning:', err);
      }
    };
    fetchUserData();
  }, []);

  const handleToggleLearned = async (id: string, learned: boolean) => {
    setLearnedIds(prev => 
      learned ? [...prev, id] : prev.filter(item => item !== id)
    );

    try {
      await fetch('/api/vocab/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vocabId: id, learned })
      });
    } catch (e) {
      console.warn('DB update learned failed');
    }
  };

  const handleToggleFavorite = async (id: string, favorite: boolean) => {
    setFavorites(prev => {
      const next = { ...prev };
      if (favorite) next[id] = '';
      else delete next[id];
      return next;
    });

    try {
      await fetch('/api/vocab/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vocabId: id, favorite })
      });
    } catch (e) {
      console.warn('DB update favorite failed');
    }
  };

  const filteredVocab = selectedLevel === 'ALL'
    ? VOCAB_DATABASE
    : VOCAB_DATABASE.filter(v => v.level === selectedLevel);

  return (
    <div className="min-h-screen bg-cream-50 flex">
      {/* Left Navigation Sidebar */}
      <LeftSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedLevel={selectedLevel}
        setSelectedLevel={setSelectedLevel}
        germanVoices={germanVoices}
        selectedVoiceURI={selectedVoiceURI}
        setSelectedVoiceURI={setSelectedVoiceURI}
        learnedCount={learnedIds.length}
        isOpenMobile={isMobileLeftOpen}
        setIsOpenMobile={setIsMobileLeftOpen}
        onOpenLogin={() => setIsLoginOpen(true)}
        currentUser={currentUser}
      />

      {/* Main Content View */}
      <main className={`
        flex-1 transition-all duration-300 p-4 sm:p-8 pt-20 lg:pt-8
        lg:ml-80 ${isRightOpen ? 'lg:mr-96' : 'lg:mr-0'}
      `}>
        {!currentUser && (
          <div className="mb-6 p-4 bg-amber-50 rounded-2xl border border-amber-300 flex items-center justify-between text-amber-900 text-xs">
            <div className="flex items-center gap-2">
              <Lock size={16} className="text-amber-700" />
              <span><strong>Gastmodus:</strong> Melde dich an, um deinen Lernfortschritt in der Neon PostgreSQL Datenbank zu speichern.</span>
            </div>
            <button
              onClick={() => setIsLoginOpen(true)}
              className="px-3 py-1.5 bg-cream-900 text-gold-400 font-bold rounded-xl text-xs hover:bg-charcoal-900 transition-colors"
            >
              Jetzt Anmelden
            </button>
          </div>
        )}

        {activeTab === 'vocab' && (
          <VocabTab
            vocabList={filteredVocab}
            learnedIds={learnedIds}
            favorites={favorites}
            onToggleLearned={handleToggleLearned}
            onToggleFavorite={handleToggleFavorite}
            onSelectVocab={(item) => {
              setSelectedVocab(item);
              setIsRightOpen(true);
            }}
            selectedVoiceURI={selectedVoiceURI}
          />
        )}

        {activeTab === 'reading' && (
          <ReadingTab
            onWordLeftClick={(word) => {
              setChatbotPromptWord(word);
              setIsRightOpen(true);
            }}
          />
        )}

        {activeTab === 'exercises' && (
          <ExercisesTab selectedVoiceURI={selectedVoiceURI} />
        )}

        {activeTab === 'call' && (
          <CallTab selectedVoiceURI={selectedVoiceURI} />
        )}

        {activeTab === 'favorites' && (
          <FavoritesTab
            vocabList={VOCAB_DATABASE}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            onSelectVocab={(item) => {
              setSelectedVocab(item);
              setIsRightOpen(true);
            }}
            selectedVoiceURI={selectedVoiceURI}
          />
        )}
      </main>

      {/* Right Drawer */}
      <RightSidebar
        selectedVocab={selectedVocab}
        chatbotPromptWord={chatbotPromptWord}
        isOpen={isRightOpen}
        setIsOpen={setIsRightOpen}
      />

      {/* Admin Login Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={(user) => setCurrentUser(user)}
      />
    </div>
  );
}
