'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  KeyRound,
  UserCheck,
  Lock,
  ArrowRight,
  Sparkles,
  Store,
  Briefcase,
  AlertCircle,
  Delete,
  CheckCircle2,
  Info
} from 'lucide-react';
import { AppUser } from '@/lib/types';
import { authenticateWithPassword, authenticateWithPin } from '@/lib/sqlite-service';

interface AuthViewProps {
  onLoginSuccess: (user: AppUser) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onLoginSuccess }) => {
  // Security standard: Password login required on initial startup, PIN for quick unlock
  const [authMode, setAuthMode] = useState<'password' | 'pin'>('password');
  
  // Password state
  const [identifier, setIdentifier] = useState('admin');
  const [password, setPassword] = useState('admin123');
  
  // PIN state
  const [pin, setPin] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Quick Demo Logins
  const handleQuickLogin = async (type: 'admin' | 'caisse' | 'gestion') => {
    setLoading(true);
    setError(null);
    try {
      let user: AppUser | null = null;
      if (type === 'admin') {
        user = await authenticateWithPassword('admin', 'admin123');
      } else if (type === 'caisse') {
        user = await authenticateWithPin('0000');
      } else if (type === 'gestion') {
        user = await authenticateWithPassword('gestion', 'gestion123');
      }

      if (user) {
        onLoginSuccess(user);
      } else {
        setError('Impossible de se connecter avec ce compte.');
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la connexion');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError('Veuillez renseigner votre identifiant et mot de passe.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const user = await authenticateWithPassword(identifier, password);
      if (user) {
        onLoginSuccess(user);
      } else {
        setError('Identifiant ou mot de passe incorrect.');
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const handlePinSubmit = async (pinValue?: string) => {
    const targetPin = pinValue || pin;
    if (!targetPin || targetPin.length < 4) {
      setError('Veuillez saisir un code PIN à 4 chiffres.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const user = await authenticateWithPin(targetPin);
      if (user) {
        onLoginSuccess(user);
      } else {
        setError('Code PIN invalide.');
        setPin('');
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur de connexion PIN');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handlePinDigit = (digit: string) => {
    if (pin.length < 6) {
      const newPin = pin + digit;
      setPin(newPin);
      setError(null);
      if (newPin.length === 4) {
        handlePinSubmit(newPin);
      }
    }
  };

  const handlePinBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handlePinClear = () => {
    setPin('');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Authentication Card */}
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-900/40 mx-auto">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Verde Orto</h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              ERP Commercial & Caisse Restaurant Sécurisés
            </p>
          </div>
        </div>

        {/* Mode Selector (PIN POS vs Password ERP) */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            id="auth-mode-pin-btn"
            onClick={() => {
              setAuthMode('pin');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition ${
              authMode === 'pin'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            Code PIN (Caisse)
          </button>
          <button
            type="button"
            id="auth-mode-password-btn"
            onClick={() => {
              setAuthMode('password');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition ${
              authMode === 'password'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            Mot de passe (ERP)
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Mode 1: PIN Pad (Ideal for Touchscreens and POS) */}
        {authMode === 'pin' && (
          <div className="space-y-5">
            {/* PIN Display Indicators */}
            <div className="flex justify-center items-center gap-3 py-2">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full border-2 transition-all ${
                    pin.length > idx
                      ? 'bg-emerald-400 border-emerald-400 scale-110 shadow-sm shadow-emerald-400'
                      : 'border-slate-700 bg-slate-950'
                  }`}
                />
              ))}
            </div>

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  id={`pin-key-${digit}`}
                  onClick={() => handlePinDigit(digit)}
                  disabled={loading}
                  className="h-13 bg-slate-800/80 hover:bg-slate-700 active:bg-emerald-600 text-white text-lg font-bold rounded-xl border border-slate-700/60 shadow-sm transition active:scale-95 flex items-center justify-center"
                >
                  {digit}
                </button>
              ))}

              <button
                type="button"
                id="pin-key-clear"
                onClick={handlePinClear}
                disabled={loading || pin.length === 0}
                className="h-13 bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-bold rounded-xl border border-slate-800 transition active:scale-95 flex items-center justify-center"
              >
                Effacer
              </button>

              <button
                type="button"
                id="pin-key-0"
                onClick={() => handlePinDigit('0')}
                disabled={loading}
                className="h-13 bg-slate-800/80 hover:bg-slate-700 active:bg-emerald-600 text-white text-lg font-bold rounded-xl border border-slate-700/60 shadow-sm transition active:scale-95 flex items-center justify-center"
              >
                0
              </button>

              <button
                type="button"
                id="pin-key-backspace"
                onClick={handlePinBackspace}
                disabled={loading || pin.length === 0}
                className="h-13 bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-bold rounded-xl border border-slate-800 transition active:scale-95 flex items-center justify-center"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            <button
              type="button"
              id="pin-submit-btn"
              onClick={() => handlePinSubmit()}
              disabled={loading || pin.length < 4}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-900/30 transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Ouvrir la session</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

        {/* Mode 2: Password Authentication */}
        {authMode === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-300">
                Identifiant ou Email
              </label>
              <input
                id="auth-username-input"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Ex: admin ou khalimouad@gmail.com"
                required
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-300">
                Mot de passe
              </label>
              <input
                id="auth-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            <button
              type="submit"
              id="auth-login-submit-btn"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-900/30 transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Connexion ERP</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Quick Demo Access Bar */}
        <div className="pt-3 border-t border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span>Accès rapide démo :</span>
            <span className="text-slate-500">1-clic</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              id="quick-login-admin"
              onClick={() => handleQuickLogin('admin')}
              className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl text-center group transition"
            >
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center text-xs font-black group-hover:bg-emerald-500 group-hover:text-white transition">
                AD
              </div>
              <div className="text-[11px] font-bold text-white mt-1">Admin</div>
              <div className="text-[9px] text-slate-400 font-mono">PIN: 1234</div>
            </button>

            <button
              type="button"
              id="quick-login-caisse"
              onClick={() => handleQuickLogin('caisse')}
              className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl text-center group transition"
            >
              <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center text-xs font-black group-hover:bg-amber-500 group-hover:text-white transition">
                CS
              </div>
              <div className="text-[11px] font-bold text-white mt-1">Caisse</div>
              <div className="text-[9px] text-slate-400 font-mono">PIN: 0000</div>
            </button>

            <button
              type="button"
              id="quick-login-gestion"
              onClick={() => handleQuickLogin('gestion')}
              className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl text-center group transition"
            >
              <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 mx-auto flex items-center justify-center text-xs font-black group-hover:bg-blue-500 group-hover:text-white transition">
                GC
              </div>
              <div className="text-[11px] font-bold text-white mt-1">Gestion</div>
              <div className="text-[9px] text-slate-400 font-mono">PIN: 5678</div>
            </button>
          </div>
        </div>

        {/* Security Footer Notice */}
        <div className="text-center">
          <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3 h-3 text-slate-400" />
            Authentification locale SQLite3 chiffrée & sessions actives
          </p>
        </div>

      </div>
    </div>
  );
};
