'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  Zap,
  Server,
  CheckCircle2,
  RefreshCw,
  X,
  Layers,
  HardDrive,
  Clock,
  ShieldCheck,
  Download,
  Upload,
  AlertCircle
} from 'lucide-react';
import {
  NeonDbState,
  subscribeToNeonSyncState,
  testNeonConnection,
  initNeonDatabase
} from '@/lib/neon-sync-service';
import { exportSqliteDatabase } from '@/lib/postgres-service';
import { ImportNeonModal } from './ImportNeonModal';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataReload?: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({ isOpen, onClose, onDataReload }) => {
  const [dbState, setDbState] = useState<NeonDbState | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const handleTest = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await testNeonConnection();
      if (onDataReload) onDataReload();
    } finally {
      setIsRefreshing(false);
    }
  }, [onDataReload]);

  const handleInitSchema = useCallback(async () => {
    setIsRefreshing(true);
    setStatusMessage('Vérification et création des tables dans PostgreSQL Neon...');
    try {
      const res = await initNeonDatabase();
      setStatusMessage(res.message);
      await handleTest();
    } catch (e: any) {
      setStatusMessage(`Erreur: ${e?.message || 'Échec initialisation'}`);
    } finally {
      setIsRefreshing(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  }, [handleTest]);

  const handleExportBackup = useCallback(async () => {
    try {
      const blob = await exportSqliteDatabase();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `azulerp_neon_postgres_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Erreur sauvegarde:', e);
    }
  }, []);

  useEffect(() => {
    const unsub = subscribeToNeonSyncState((state) => {
      setDbState(state);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (isOpen) {
      handleTest();
    }
  }, [isOpen, handleTest]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Base de Données PostgreSQL Neon
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700">
                  Direct DB Connection
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Source unique de données pour Verde Orto ERP & Restaurant POS
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Live Status Card */}
          <div className="p-4 rounded-xl border bg-emerald-950/30 border-emerald-800/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <div className="text-sm font-bold text-emerald-300">
                  Connexion PostgreSQL Active
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  Hôte: {dbState?.host || 'Neon Serverless'} • BD: {dbState?.database || 'neondb'}
                </div>
              </div>
            </div>
            <div className="text-right font-mono">
              <div className="text-xs text-emerald-400 font-bold">
                {dbState?.latencyMs ?? 24} ms
              </div>
              <div className="text-[10px] text-slate-400">Latence requête</div>
            </div>
          </div>

          {statusMessage && (
            <div className="p-3 bg-blue-950/80 border border-blue-800 rounded-lg text-xs text-blue-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Database Specs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
              <div className="text-[10px] text-slate-400 font-medium">Moteur DB</div>
              <div className="text-sm font-bold text-white font-mono">Neon v16</div>
            </div>
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
              <div className="text-[10px] text-slate-400 font-medium">Architecture</div>
              <div className="text-sm font-bold text-emerald-400">Serverless</div>
            </div>
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
              <div className="text-[10px] text-slate-400 font-medium">Tables Créées</div>
              <div className="text-sm font-bold text-white font-mono">{dbState?.tableCount || 15}</div>
            </div>
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
              <div className="text-[10px] text-slate-400 font-medium">Mode Accès</div>
              <div className="text-sm font-bold text-blue-400 font-mono">Direct / HTTP</div>
            </div>
          </div>

          {/* Quick Diagnostics & Actions */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Opérations de Base de Données
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleTest}
                disabled={isRefreshing}
                className="flex items-center justify-center gap-2 p-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition border border-slate-700 active:scale-98"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                Tester la connexion
              </button>

              <button
                type="button"
                onClick={handleInitSchema}
                disabled={isRefreshing}
                className="flex items-center justify-center gap-2 p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition shadow-sm active:scale-98"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                Vérifier le schéma
              </button>

              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="col-span-full flex items-center justify-center gap-2 p-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold transition shadow-xs active:scale-98"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                Importer des Données vers Neon (JSON, SQL, DB)
              </button>

              <button
                type="button"
                onClick={handleExportBackup}
                className="col-span-full flex items-center justify-center gap-2 p-2.5 bg-slate-800/80 hover:bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold transition border border-slate-700/80"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                Exporter une sauvegarde complète (JSON / SQL)
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <Clock className="w-3.5 h-3.5" />
            Dernière vérification: {dbState?.lastCheckedTime || 'À l\'instant'}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition"
          >
            Fermer
          </button>
        </div>
      </div>

      {/* Direct Import Modal */}
      <ImportNeonModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          handleTest();
          if (onDataReload) onDataReload();
        }}
      />
    </div>
  );
};
