'use client';

import React, { useState } from 'react';
import { Lock, KeyRound, ArrowRight, LogOut, AlertCircle, Delete } from 'lucide-react';
import { AppUser } from '@/lib/types';
import { authenticateWithPin, authenticateWithPassword } from '@/lib/postgres-service';

interface LockScreenModalProps {
  user: AppUser;
  onUnlock: () => void;
  onLogout: () => void;
}

export const LockScreenModal: React.FC<LockScreenModalProps> = ({
  user,
  onUnlock,
  onLogout
}) => {
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'pin' | 'password'>('pin');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePinDigit = (digit: string) => {
    if (pin.length < 6) {
      const newPin = pin + digit;
      setPin(newPin);
      setError(null);
      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const verifyPin = async (pinToTest: string) => {
    setLoading(true);
    setError(null);
    try {
      if (user.pin_code && user.pin_code === pinToTest) {
        onUnlock();
      } else {
        const verifiedUser = await authenticateWithPin(pinToTest);
        if (verifiedUser && verifiedUser.id === user.id) {
          onUnlock();
        } else {
          setError('Code PIN incorrect.');
          setPin('');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur lors du déverrouillage');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const verified = await authenticateWithPassword(user.username, password);
      if (verified) {
        onUnlock();
      } else {
        setError('Mot de passe incorrect.');
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur lors du déverrouillage');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 font-sans text-white">
      <div className="max-w-xs w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 text-center">
        
        {/* User Avatar */}
        <div className="relative mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-xl font-black text-white shadow-lg shadow-emerald-950">
          {user.avatar || user.nom_complet.slice(0, 2).toUpperCase()}
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-bold border-2 border-slate-900">
            <Lock className="w-3 h-3" />
          </div>
        </div>

        <div>
          <h2 className="text-base font-bold text-white">{user.nom_complet}</h2>
          <p className="text-xs text-slate-400">Session verrouillée • Rôle {user.role}</p>
        </div>

        {error && (
          <div className="p-2 bg-red-950/60 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center justify-center gap-1.5 animate-shake">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {mode === 'pin' ? (
          <div className="space-y-4">
            {/* PIN Indicators */}
            <div className="flex justify-center items-center gap-2.5 py-1">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                    pin.length > idx
                      ? 'bg-emerald-400 border-emerald-400 scale-110 shadow-xs shadow-emerald-400'
                      : 'border-slate-700 bg-slate-950'
                  }`}
                />
              ))}
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-2 max-w-[220px] mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handlePinDigit(digit)}
                  className="h-11 bg-slate-800 hover:bg-slate-700 active:bg-emerald-600 text-white text-base font-bold rounded-xl border border-slate-700/60 shadow-xs transition active:scale-95 flex items-center justify-center"
                >
                  {digit}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setPin('')}
                className="h-11 bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-white text-[10px] font-bold rounded-xl border border-slate-800 transition flex items-center justify-center"
              >
                C
              </button>

              <button
                type="button"
                onClick={() => handlePinDigit('0')}
                className="h-11 bg-slate-800 hover:bg-slate-700 active:bg-emerald-600 text-white text-base font-bold rounded-xl border border-slate-700/60 shadow-xs transition active:scale-95 flex items-center justify-center"
              >
                0
              </button>

              <button
                type="button"
                onClick={() => setPin((p) => p.slice(0, -1))}
                className="h-11 bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-bold rounded-xl border border-slate-800 transition flex items-center justify-center"
              >
                <Delete className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setMode('password')}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
            >
              Déverrouiller par mot de passe
            </button>
          </div>
        ) : (
          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Votre mot de passe"
              required
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
            >
              <span>Déverrouiller</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setMode('pin')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold block mx-auto"
            >
              Retour au code PIN
            </button>
          </form>
        )}

        <div className="pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onLogout}
            className="w-full py-1.5 text-xs text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-xl transition flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            Changer d'utilisateur / Déconnexion
          </button>
        </div>

      </div>
    </div>
  );
};
