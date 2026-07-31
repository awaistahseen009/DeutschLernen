'use client';

import React, { useState } from 'react';
import { Mail, Lock, X, User } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: { email: string }) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

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

      onLoginSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-charcoal-950/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-cream-50 rounded-3xl border border-gold-500/40 p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-charcoal-800 hover:bg-cream-200 rounded-xl"
        >
          <X size={18} />
        </button>

        <div className="text-center pb-3 border-b border-cream-200">
          <div className="w-12 h-12 bg-cream-900 text-gold-400 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-md border border-gold-500/30">
            <User size={24} />
          </div>
          <h2 className="font-serif text-2xl font-bold text-charcoal-900">Admin Login</h2>
          <p className="text-xs text-cream-800 mt-1">
            Erstmaliges Passwort über CMD festlegen: <br />
            <code className="bg-cream-200 px-2 py-0.5 rounded text-[11px] font-mono font-bold text-charcoal-900">
              node scripts/setup-admin.js admin@domain.com deinPasswort
            </code>
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs border border-rose-200 font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-charcoal-900 mb-1">E-Mail Adresse</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-3 text-cream-800" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@deutschmeister.de"
                className="w-full bg-cream-100 border border-cream-300 rounded-xl pl-9 pr-3 py-2.5 text-xs text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-gold-500 font-medium"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-charcoal-900 mb-1">Passwort</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-3 text-cream-800" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-cream-100 border border-cream-300 rounded-xl pl-9 pr-3 py-2.5 text-xs text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-gold-500 font-medium"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-cream-900 hover:bg-charcoal-900 text-gold-400 font-bold text-xs rounded-2xl shadow-md disabled:opacity-50 transition-colors border border-gold-500/30"
          >
            {isLoading ? 'Anmelden...' : 'Anmelden & Neon DB Verbinden'}
          </button>
        </form>
      </div>
    </div>
  );
};
