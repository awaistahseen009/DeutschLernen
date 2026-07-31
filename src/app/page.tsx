'use client';

import React, { useState, useEffect } from 'react';
import { VOCAB_DATABASE, VocabItem } from '@/data/vocabData';
import { LeftSidebar } from '@/components/LeftSidebar';
import { RightSidebar } from '@/components/RightSidebar';
import { VocabTab } from '@/components/VocabTab';
import { YoutubeTab } from '@/components/YoutubeTab';
import { ReadingTab } from '@/components/ReadingTab';
import { ExercisesTab } from '@/components/ExercisesTab';
import { CallTab } from '@/components/CallTab';
import { FavoritesTab } from '@/components/FavoritesTab';
import { LoginModal } from '@/components/LoginModal';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'vocab' | 'youtube' | 'reading' | 'exercises' | 'call' | 'favorites'>('vocab');
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [germanVoices, setGermanVoices] = useState<SpeechSynthesisVoice[]>([]);

  // DB Synced Progress & Favorites & Custom Vocab
  const [learnedIds, setLearnedIds] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Record<string, string>>({});
  const [customVocab, setCustomVocab] = useState<VocabItem[]>([]);
  const [currentUser, setCurrentUser] = useState<{ email: string } | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Sidebars open state
  const [isMobileLeftOpen, setIsMobileLeftOpen] = useState(false);
  const [isRightOpen, setIsRightOpen] = useState(true);

  // Selected item & chatbot word click
  const [selectedVocab, setSelectedVocab] = useState<VocabItem | null>(null);
  const [chatbotPromptWord, setChatbotPromptWord] = useState<string | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  // Verify auth session on load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setCurrentUser(data.user);
          }
        }
      } catch (err) {
        console.warn('Auth check warning:', err);
      } finally {
        setIsInitialLoading(false);
      }
    };
    checkAuth();
  }, []);

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

  // Fetch progress & favorites directly from Neon PostgreSQL API (Continuous progress tracking across sessions)
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
      } finally {
        setIsInitialLoading(false);
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

  const allVocabDatabase = [...VOCAB_DATABASE, ...customVocab];

  const filteredVocab = selectedLevel === 'ALL'
    ? allVocabDatabase
    : allVocabDatabase.filter(v => v.level === selectedLevel);

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3 text-charcoal-900">
          <Loader2 size={36} className="animate-spin text-gold-600" />
          <span className="font-serif text-lg font-bold">DeutschMeister wird geladen...</span>
        </div>
      </div>
    );
  }

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

        {activeTab === 'youtube' && (
          <YoutubeTab
            selectedVoiceURI={selectedVoiceURI}
            onSelectVocab={(item) => {
              setSelectedVocab(item);
              setIsRightOpen(true);
            }}
            onAppendCustomVocab={(items) => {
              setCustomVocab(prev => [...prev, ...items]);
            }}
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
            vocabList={allVocabDatabase}
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

      {/* Admin Login Modal (Triggered manually via sidebar button) */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={(user) => setCurrentUser(user)}
      />
    </div>
  );
}
