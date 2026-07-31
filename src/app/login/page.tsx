'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, UserCheck, Sparkles, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login fehlgeschlagen');
      }

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Background Accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="bg-cream-100 rounded-3xl border border-cream-300 shadow-2xl p-8 sm:p-10 max-w-md w-full z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-cream-900 text-gold-400 rounded-2xl flex items-center justify-center mx-auto shadow-md border border-gold-500/30 font-serif text-3xl font-bold">
            D
          </div>
          <h1 className="font-serif text-3xl font-bold text-charcoal-900 tracking-tight mt-3">
            DeutschMeister
          </h1>
          <p className="text-xs text-cream-800 font-medium">
            Melde dich an, um auf dein deutsches Sprachportal zuzugreifen.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 text-rose-700 rounded-2xl text-xs border border-rose-200 font-semibold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-charcoal-900 mb-1.5 uppercase tracking-wider">
              E-Mail Adresse
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-3.5 top-3.5 text-cream-800" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="deine.email@domain.de"
                className="w-full bg-cream-50 border border-cream-300 rounded-2xl pl-10 pr-4 py-3 text-xs text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-gold-500 font-medium shadow-inner"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-charcoal-900 mb-1.5 uppercase tracking-wider">
              Passwort
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-3.5 text-cream-800" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-cream-50 border border-cream-300 rounded-2xl pl-10 pr-4 py-3 text-xs text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-gold-500 font-medium shadow-inner"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-cream-900 hover:bg-charcoal-900 text-gold-400 font-bold text-xs rounded-2xl shadow-lg disabled:opacity-50 transition-transform active:scale-95 border border-gold-500/30 flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin text-gold-400" />
                <span>Anmelden...</span>
              </>
            ) : (
              <>
                <UserCheck size={16} /> Anmelden & Portal Öffnen
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-cream-200 text-[11px] text-cream-800 flex items-center justify-center gap-1.5">
          <Sparkles size={14} className="text-gold-600" /> High-Frequency Vocab, Realtime Voice & Neon DB
        </div>
      </div>
    </div>
  );
}
