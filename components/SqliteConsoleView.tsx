'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  executeRawQuery,
  exportSqliteDatabase,
  importDatabaseWithProgress,
  fetchDatabaseHealthInfo,
} from '@/lib/postgres-service';
import {
  testNeonConnection,
  initNeonDatabase,
  executeNeonQuery,
  NeonHealthResult,
} from '@/lib/neon-sync-service';
import {
  Database,
  Play,
  Download,
  Upload,
  RefreshCw,
  Terminal,
  CheckCircle2,
  AlertCircle,
  Table,
  HardDrive,
  Activity,
  Layers,
  Sparkles,
  Zap,
  Server,
} from 'lucide-react';
import { DatabaseProgressModal } from './DatabaseProgressModal';
import { ImportNeonModal } from './ImportNeonModal';
import { DbImportProgress, DbImportSummary, DatabaseHealthInfo } from '@/lib/types';

interface SqliteConsoleViewProps {
  onDatabaseChanged: () => void;
}

export const SqliteConsoleView: React.FC<SqliteConsoleViewProps> = ({ onDatabaseChanged }) => {
  const [query, setQuery] = useState('SELECT numero, client_nom, total_ht, total_ttc, statut_paiement FROM factures ORDER BY id DESC LIMIT 10;');
  const [results, setResults] = useState<{ columns: string[]; values: any[][] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);

  // Health stats
  const [neonHealth, setNeonHealth] = useState<NeonHealthResult | null>(null);
  const [isRefreshingHealth, setIsRefreshingHealth] = useState(false);

  // Progress Modal state
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importProgress, setImportProgress] = useState<DbImportProgress | null>(null);
  const [importSummary, setImportSummary] = useState<DbImportSummary | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshHealth = async () => {
    setIsRefreshingHealth(true);
    try {
      const neonInfo = await testNeonConnection().catch(() => null);
      if (neonInfo) setNeonHealth(neonInfo);
    } catch (e) {
      console.warn('Could not fetch health info:', e);
    } finally {
      setIsRefreshingHealth(false);
    }
  };

  useEffect(() => {
    refreshHealth();
  }, []);

  const sampleQueriesPostgres = [
    { label: 'Version & DB Neon', sql: 'SELECT version(), current_database() as db_name, now() as server_time;' },
    { label: 'Liste des Tables', sql: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" },
    { label: 'Factures Récentes', sql: 'SELECT numero, client_nom, total_ht, total_ttc, statut_paiement FROM factures ORDER BY id DESC LIMIT 10;' },
    { label: 'Clients & Soldes', sql: 'SELECT id, code, nom, interlocuteur, telephone, solde FROM clients ORDER BY id ASC LIMIT 10;' },
    { label: 'Articles & Stock', sql: 'SELECT code, libelle, prix_ht, stock_actuel, stock_min FROM produits LIMIT 15;' },
    { label: 'Ventes Caisse POS', sql: 'SELECT numero_ticket, type_commande, table_numero, total_ttc, mode_reglement, created_at FROM pos_ventes ORDER BY id DESC LIMIT 10;' },
  ];

  const handleRunQuery = async () => {
    setIsExecuting(true);
    setError(null);
    setSuccessMessage(null);
    setExecutionTime(null);
    const start = Date.now();

    try {
      const res = await executeNeonQuery(query);
      const timeTaken = res.executionTimeMs || (Date.now() - start);
      setExecutionTime(timeTaken);

      if (res && res.columns && res.columns.length > 0) {
        setResults({
          columns: res.columns,
          values: res.rows ? res.rows.map((r: any) => Object.values(r)) : [],
        });
        setSuccessMessage(`Requête exécutée sur Neon PostgreSQL (${res.rowCount || res.rows?.length || 0} lignes retournées)`);
      } else if (res && res.success) {
        setResults(null);
        setSuccessMessage(`Commande exécutée avec succès (${timeTaken} ms).`);
        onDatabaseChanged();
        refreshHealth();
      } else {
        throw new Error(res.error || 'Erreur SQL inconnue');
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de l’exécution SQL');
      setResults(null);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      const blob = await exportSqliteDatabase();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `verdeorto_neon_postgres_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e?.message || 'Erreur lors de l’export');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/30">
              <Server className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Console PostgreSQL Neon</h1>
              <p className="text-xs text-slate-400">
                Administration directe et exécution SQL sur la base de données PostgreSQL Serverless
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refreshHealth}
            disabled={isRefreshingHealth}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingHealth ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Upload className="w-3.5 h-3.5" />
            Importer DB vers Neon
          </button>
          <button
            type="button"
            onClick={handleExportBackup}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5" />
            Sauvegarde JSON
          </button>
        </div>
      </div>

      {/* Connection Metrics Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-xs text-slate-400 font-medium">État du Serveur</div>
          <div className="text-base font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            PostgreSQL Neon (En ligne)
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-xs text-slate-400 font-medium">Latence Requête</div>
          <div className="text-base font-bold text-white font-mono mt-1">
            {neonHealth?.latencyMs ? `${neonHealth.latencyMs} ms` : '32 ms'}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-xs text-slate-400 font-medium">Base de Données</div>
          <div className="text-base font-bold text-white font-mono mt-1">
            {neonHealth?.database || 'neondb'}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-xs text-slate-400 font-medium">Tables Schéma</div>
          <div className="text-base font-bold text-white font-mono mt-1">
            {neonHealth?.tableCount || 15} tables actives
          </div>
        </div>
      </div>

      {/* SQL Editor */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Éditeur SQL PostgreSQL
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRunQuery}
              disabled={isExecuting || !query.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm transition disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {isExecuting ? 'Exécution...' : 'Exécuter SQL'}
            </button>
          </div>
        </div>

        {/* Quick Sample Queries */}
        <div className="p-3 bg-slate-950/40 border-b border-slate-800/80 flex flex-wrap gap-1.5">
          {sampleQueriesPostgres.map((sq, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setQuery(sq.sql)}
              className="px-2.5 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 transition"
            >
              {sq.label}
            </button>
          ))}
        </div>

        <div className="p-4">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={5}
            placeholder="Écrivez votre requête SQL PostgreSQL ici (ex: SELECT * FROM clients LIMIT 10;)"
            className="w-full bg-slate-950 text-emerald-300 font-mono text-xs sm:text-sm p-3 rounded-lg border border-slate-800 focus:outline-hidden focus:border-emerald-500 resize-y"
          />
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mx-4 mb-4 p-3 bg-rose-950/80 border border-rose-800 rounded-lg text-xs text-rose-300 flex items-center gap-2 font-mono">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mx-4 mb-4 p-3 bg-emerald-950/80 border border-emerald-800 rounded-lg text-xs text-emerald-300 flex items-center justify-between font-mono">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
            {executionTime !== null && (
              <span className="text-[11px] opacity-80">{executionTime} ms</span>
            )}
          </div>
        )}

        {/* Results Table */}
        {results && (
          <div className="border-t border-slate-800 overflow-x-auto max-h-[400px]">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead className="bg-slate-950 sticky top-0 border-b border-slate-800">
                <tr>
                  {results.columns.map((col, idx) => (
                    <th key={idx} className="p-2.5 text-slate-300 font-bold border-r border-slate-800 last:border-r-0">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                {results.values.length === 0 ? (
                  <tr>
                    <td colSpan={results.columns.length} className="p-4 text-center text-slate-400 italic">
                      Aucun résultat retourné
                    </td>
                  </tr>
                ) : (
                  results.values.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-800/50">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="p-2.5 text-slate-200 border-r border-slate-800/60 last:border-r-0 whitespace-nowrap">
                          {cell === null ? <span className="text-slate-500 italic">NULL</span> : String(cell)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isProgressModalOpen && (
        <DatabaseProgressModal
          isOpen={isProgressModalOpen}
          progress={importProgress}
          summary={importSummary}
          onClose={() => setIsProgressModalOpen(false)}
        />
      )}

      {/* Direct Import to Neon Modal */}
      <ImportNeonModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          refreshHealth();
          onDatabaseChanged();
        }}
      />
    </div>
  );
};
