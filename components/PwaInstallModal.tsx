'use client';

import React from 'react';
import {
  Share,
  PlusSquare,
  Smartphone,
  Tablet,
  CheckCircle,
  X,
  Sparkles,
  Wifi,
  ShieldCheck,
  Zap
} from 'lucide-react';

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isIPad?: boolean;
  isIOS?: boolean;
  onDirectInstall?: () => void;
}

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({
  isOpen,
  onClose,
  isIPad = true,
  isIOS = true,
  onDirectInstall,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-950/60 shrink-0">
              <Tablet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">Installer sur iPad & Tablette</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-950 text-emerald-300 border border-emerald-800">
                  PWA Standalone
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Caisse tactile plein écran avec SQLite persistant 100% hors-ligne
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col items-center gap-1.5">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-slate-200 text-[11px]">Plein Écran</span>
            <span className="text-[9px] text-slate-400">Sans barre d'adresse</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col items-center gap-1.5">
            <Wifi className="w-4 h-4 text-teal-400" />
            <span className="font-bold text-slate-200 text-[11px]">100% Hors-Ligne</span>
            <span className="text-[9px] text-slate-400">Fonctionne sans Wi-Fi</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-slate-200 text-[11px]">Tactile Optimisé</span>
            <span className="text-[9px] text-slate-400">Boutons & Numpad iPad</span>
          </div>
        </div>

        {/* Step-by-Step Instructions for iPad / iOS Safari */}
        <div className="space-y-3 bg-slate-950/90 p-4 rounded-2xl border border-slate-800">
          <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Installation en 3 étapes simples (Safari iPad)
          </h4>

          <div className="space-y-3 pt-1 text-xs">
            {/* Step 1 */}
            <div className="flex items-start gap-3 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80">
              <div className="w-6 h-6 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center font-black text-xs shrink-0">
                1
              </div>
              <div className="flex-1">
                <p className="text-slate-200 font-semibold flex items-center gap-1.5 flex-wrap">
                  Touchez l'icône <strong>Partager</strong>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-blue-400 font-bold border border-slate-700 text-[11px]">
                    <Share className="w-3 h-3" /> Partager
                  </span>
                  dans la barre Safari (en haut ou en bas).
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80">
              <div className="w-6 h-6 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center font-black text-xs shrink-0">
                2
              </div>
              <div className="flex-1">
                <p className="text-slate-200 font-semibold flex items-center gap-1.5 flex-wrap">
                  Faites défiler le menu et sélectionnez
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-emerald-400 font-bold border border-slate-700 text-[11px]">
                    <PlusSquare className="w-3 h-3" /> Sur l'écran d'accueil
                  </span>
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80">
              <div className="w-6 h-6 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center font-black text-xs shrink-0">
                3
              </div>
              <div className="flex-1">
                <p className="text-slate-200 font-semibold">
                  Touchez <strong className="text-emerald-400">"Ajouter"</strong> en haut à droite. L'icône <strong className="text-white">Verde Orto POS</strong> apparaîtra sur votre écran d'accueil d'iPad !
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-between gap-3 pt-2">
          {onDirectInstall && (
            <button
              type="button"
              onClick={() => {
                onDirectInstall();
                onClose();
              }}
              className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-950/80 flex items-center justify-center gap-2 transition"
            >
              <Tablet className="w-4 h-4" />
              <span>Lancer l'Installation Immédiate</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition"
          >
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>J'ai compris / Fermer</span>
          </button>
        </div>
      </div>
    </div>
  );
};
