'use client';

import React from 'react';
import {
  Upload,
  Database,
  CheckCircle2,
  AlertCircle,
  Clock,
  HardDrive,
  FileCheck,
  Layers,
  Sparkles,
  RefreshCw,
  X
} from 'lucide-react';
import { DbImportProgress, DbImportSummary } from '@/lib/types';

interface DatabaseProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  progress: DbImportProgress | null;
  summary: DbImportSummary | null;
  onRetry?: () => void;
}

export const DatabaseProgressModal: React.FC<DatabaseProgressModalProps> = ({
  isOpen,
  onClose,
  progress,
  summary,
  onRetry,
}) => {
  if (!isOpen || !progress) return null;

  const isUploading = progress.phase === 'uploading';
  const isProcessing = ['validating', 'processing', 'persisting'].includes(progress.phase);
  const isSuccess = progress.phase === 'success';
  const isError = progress.phase === 'error' || !!progress.error;

  const fileSizeMb = progress.fileSizeBytes
    ? (progress.fileSizeBytes / (1024 * 1024)).toFixed(2)
    : '0.00';
  const loadedMb = progress.loadedBytes
    ? (progress.loadedBytes / (1024 * 1024)).toFixed(2)
    : '0.00';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-100 flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isSuccess
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : isError
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            }`}>
              {isSuccess ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : isError ? (
                <AlertCircle className="w-5 h-5" />
              ) : isUploading ? (
                <Upload className="w-5 h-5 animate-bounce" />
              ) : (
                <Database className="w-5 h-5 animate-spin" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {isSuccess
                  ? 'Importation réussie'
                  : isError
                  ? "Erreur d'importation"
                  : 'Restauration de la Base de Données'}
              </h3>
              <p className="text-xs text-slate-400">
                {progress.fileName || 'Fichier SQLite3'} ({fileSizeMb} Mo)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Main Progress Indicator */}
          {!isSuccess && !isError && (
            <div className="space-y-4">
              {/* Overall Progress */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                  <span className="text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    Progression globale
                  </span>
                  <span className="text-blue-400 font-mono text-sm font-bold">
                    {progress.overallPercent}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${Math.min(100, Math.max(2, progress.overallPercent))}%` }}
                  />
                </div>
              </div>

              {/* Dual Progress Bars: Upload vs Treatment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* 1. Upload Progression */}
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1 font-medium">
                      <Upload className="w-3.5 h-3.5 text-sky-400" />
                      1. Lecture / Upload
                    </span>
                    <span className={`font-mono font-bold ${progress.uploadPercent === 100 ? 'text-emerald-400' : 'text-sky-400'}`}>
                      {progress.uploadPercent}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-200 ${
                        progress.uploadPercent === 100 ? 'bg-emerald-500' : 'bg-sky-500'
                      }`}
                      style={{ width: `${progress.uploadPercent}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {loadedMb} Mo / {fileSizeMb} Mo
                  </div>
                </div>

                {/* 2. SQLite Treatment Progression */}
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1 font-medium">
                      <Database className="w-3.5 h-3.5 text-indigo-400" />
                      2. Traitement SQL
                    </span>
                    <span className={`font-mono font-bold ${progress.treatmentPercent === 100 ? 'text-emerald-400' : 'text-indigo-400'}`}>
                      {progress.treatmentPercent}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-200 ${
                        progress.treatmentPercent === 100 ? 'bg-emerald-500' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${progress.treatmentPercent}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {isProcessing ? 'Validation & migration...' : isUploading ? 'En attente...' : 'Terminé'}
                  </div>
                </div>
              </div>

              {/* Status Message */}
              <div className="p-3.5 bg-blue-950/30 border border-blue-900/50 rounded-xl flex items-start gap-3">
                <RefreshCw className="w-4 h-4 text-blue-400 animate-spin shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5 min-w-0">
                  <div className="font-semibold text-white truncate">
                    {progress.currentStepMessage}
                  </div>
                  {progress.detailMessage && (
                    <div className="text-slate-400 text-[11px]">
                      {progress.detailMessage}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Success Screen */}
          {isSuccess && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">
                    Restauration terminée avec succès
                  </h4>
                  <p className="text-xs text-emerald-300/80 mt-0.5">
                    {progress.detailMessage || 'Toutes les données ont été injectées et vérifiées dans le moteur SQLite.'}
                  </p>
                </div>
              </div>

              {/* Metrics Grid */}
              {summary && (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <div className="text-lg font-bold text-emerald-400 font-mono">
                      {summary.produitsCount}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">Articles</div>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <div className="text-lg font-bold text-sky-400 font-mono">
                      {summary.clientsCount}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">Clients</div>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <div className="text-lg font-bold text-indigo-400 font-mono">
                      {summary.tablesCount}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">Tables SQL</div>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <div className="text-lg font-bold text-amber-400 font-mono">
                      {summary.facturesCount}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">Factures</div>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <div className="text-lg font-bold text-purple-400 font-mono">
                      {summary.blCount}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">Bons de Livr.</div>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                    <div className="text-lg font-bold text-teal-400 font-mono">
                      {summary.fournisseursCount}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">Fournisseurs</div>
                  </div>
                </div>
              )}

              {/* Technical Details Footer */}
              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 px-1">
                <span className="flex items-center gap-1">
                  <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                  Taille : {fileSizeMb} Mo
                </span>
                {summary && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Durée : {summary.durationMs} ms
                  </span>
                )}
                <span className="flex items-center gap-1 text-emerald-400">
                  <FileCheck className="w-3.5 h-3.5" />
                  Intégrité : {summary?.integrityStatus || 'ok'}
                </span>
              </div>
            </div>
          )}

          {/* Error Screen */}
          {isError && (
            <div className="space-y-4">
              <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="font-bold text-white">Échec du traitement du fichier</div>
                  <div className="text-rose-300 leading-relaxed">
                    {progress.error || progress.detailMessage || 'Le fichier SQLite fourni est invalide ou corrompu.'}
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Assurez-vous de fournir un fichier au format <span className="font-mono text-slate-200">.sqlite</span>, <span className="font-mono text-slate-200">.db</span> ou <span className="font-mono text-slate-200">.sqlite3</span> valide.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-3">
          {isSuccess && (
            <button
              onClick={onClose}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition active:scale-95 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Accéder à l'application
            </button>
          )}

          {isError && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Fermer
              </button>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Réessayer
                </button>
              )}
            </>
          )}

          {!isSuccess && !isError && (
            <div className="w-full flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                Traitement en tâche de fond sécurisée
              </span>
              <span className="font-mono text-slate-300">
                {progress.elapsedMs ? `${(progress.elapsedMs / 1000).toFixed(1)}s` : ''}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
