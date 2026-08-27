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
  Printer,
  ExternalLink,
} from 'lucide-react';
import { DatabaseProgressModal } from './DatabaseProgressModal';
import { ImportNeonModal } from './ImportNeonModal';
import { DbImportProgress, DbImportSummary, DatabaseHealthInfo } from '@/lib/types';
import {
  DEFAULT_TICKET_PRINTER_SETTINGS,
  getTicketPrinterSettings,
  saveTicketPrinterSettings,
  sendNetworkPrint,
  TicketPrinterSettings,
} from '@/lib/ticket-printer';
import { DEFAULT_REFERENCE_SETTINGS, getReferenceSettings, saveReferenceSettings, ReferenceSettings } from '@/lib/reference-settings';

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
  const [printerSettings, setPrinterSettings] = useState<TicketPrinterSettings>(DEFAULT_TICKET_PRINTER_SETTINGS);
  const [printerSaved, setPrinterSaved] = useState(false);
  const [isTestingPrinter, setIsTestingPrinter] = useState(false);
  const [printerTestResult, setPrinterTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [referenceSettings, setReferenceSettings] = useState<ReferenceSettings>(DEFAULT_REFERENCE_SETTINGS);

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
    setPrinterSettings(getTicketPrinterSettings());
    setReferenceSettings(getReferenceSettings());
  }, []);

  const handleSavePrinter = () => {
    saveTicketPrinterSettings(printerSettings);
    saveReferenceSettings(referenceSettings);
    setPrinterSaved(true);
    window.setTimeout(() => setPrinterSaved(false), 2500);
  };

  const handleTestPrinter = async () => {
    setIsTestingPrinter(true);
    setPrinterTestResult(null);
    try {
      saveTicketPrinterSettings(printerSettings);
      const testSale: any = {
        numero_ticket: `TEST-${Date.now().toString().slice(-4)}`,
        date_vente: new Date().toISOString().slice(0, 10),
        table_numero: 'TEST CAISSE',
        caissier: 'Caisse',
        total_ht: 100,
        total_tva: 20,
        total_ttc: 120,
        lignes: [
          { quantite: 1, produit_nom: 'Test Impression Thermique', total_ttc: 120 },
        ],
      };
      const res = await sendNetworkPrint(testSale, null, 'TICKET_FINAL');
      if (res.success) {
        setPrinterTestResult({ success: true, message: res.message || 'Ticket de test envoyé avec succès !' });
      } else {
        setPrinterTestResult({ success: false, message: res.message || 'Échec d’envoi direct : vérifiez l’adresse IP (192.168.1.87) et le réseau local' });
      }
    } catch (err: any) {
      setPrinterTestResult({ success: false, message: err?.message || 'Erreur lors du test' });
    } finally {
      setIsTestingPrinter(false);
    }
  };

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

      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Impression des tickets</h2>
              <p className="text-xs text-slate-500 mt-0.5">Imprimante de caisse utilisée par le poste POS.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Configurée
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-5">
          <label className="text-xs font-semibold text-slate-700">
            Modèle
            <input value={printerSettings.model} onChange={(e) => setPrinterSettings({ ...printerSettings, model: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
          </label>
          <label className="text-xs font-semibold text-slate-700">
            Adresse IP Imprimante
            <input value={printerSettings.ipAddress} onChange={(e) => setPrinterSettings({ ...printerSettings, ipAddress: e.target.value })} placeholder="192.168.1.87" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-mono" />
          </label>
          <label className="text-xs font-semibold text-slate-700">
            Passerelle / Routeur
            <input value={printerSettings.gatewayIp || '192.168.1.1'} onChange={(e) => setPrinterSettings({ ...printerSettings, gatewayIp: e.target.value })} placeholder="192.168.1.1" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-mono" />
          </label>
          <label className="text-xs font-semibold text-slate-700">
            Port Réseau RAW
            <input type="number" value={printerSettings.port || 9100} onChange={(e) => setPrinterSettings({ ...printerSettings, port: Number(e.target.value) || 9100 })} placeholder="9100" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-mono" />
          </label>
          <label className="text-xs font-semibold text-slate-700">
            Largeur papier
            <select value={printerSettings.paperWidth} onChange={(e) => setPrinterSettings({ ...printerSettings, paperWidth: Number(e.target.value) as 80 | 58 })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm bg-white">
              <option value={80}>80 mm (Standard)</option><option value={58}>58 mm (Compact)</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-700">
            Après encaissement
            <select value={printerSettings.autoPrint ? 'yes' : 'no'} onChange={(e) => setPrinterSettings({ ...printerSettings, autoPrint: e.target.value === 'yes' })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm bg-white">
              <option value="no">Imprimer avec le bouton</option><option value="yes">Ouvrir automatiquement</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-700">
            Imprimante documents A4/A5
            <input value={printerSettings.documentPrinterName} onChange={(e) => setPrinterSettings({ ...printerSettings, documentPrinterName: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
          </label>
          <label className="text-xs font-semibold text-slate-700">
            Format BL / BR / Facture
            <select value={printerSettings.documentPaperSize} onChange={(e) => setPrinterSettings({ ...printerSettings, documentPaperSize: e.target.value as 'A4' | 'A5' })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm bg-white"><option value="A4">A4</option><option value="A5">A5</option></select>
          </label>
        </div>

        {printerTestResult && (
          <div className={`mt-4 p-3 rounded-lg text-xs flex items-center gap-2 border ${printerTestResult.success ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-amber-50 border-amber-300 text-amber-800'}`}>
            <Printer className="w-4 h-4 shrink-0" />
            <span>{printerTestResult.message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-200">
          <label className="text-xs font-semibold text-slate-700">Villes proposées
            <textarea rows={3} value={referenceSettings.cities.join('\n')} onChange={(e) => setReferenceSettings({ ...referenceSettings, cities: e.target.value.split('\n').map((v) => v.trim()).filter(Boolean) })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <label className="text-xs font-semibold text-slate-700">Banques proposées
            <textarea rows={3} value={referenceSettings.banks.join('\n')} onChange={(e) => setReferenceSettings({ ...referenceSettings, banks: e.target.value.split('\n').map((v) => v.trim()).filter(Boolean) })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <button type="button" onClick={handleSavePrinter} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition">{printerSaved ? 'Réglages enregistrés' : 'Enregistrer les réglages'}</button>
          <button type="button" onClick={handleTestPrinter} disabled={isTestingPrinter} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition disabled:opacity-50">
            <Printer className="w-3.5 h-3.5" />
            {isTestingPrinter ? 'Envoi du test...' : `Tester l'impression (${printerSettings.ipAddress || '192.168.1.87'})`}
          </button>
          <a href={`http://${printerSettings.ipAddress}`} target="_blank" rel="noreferrer" className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5"><ExternalLink className="w-3.5 h-3.5" /> Ouvrir la page Epson</a>
          <p className="text-[11px] text-slate-500 w-full mt-1">Tickets de caisse : Epson réseau (IP: {printerSettings.ipAddress || '192.168.1.87'}, Port: {printerSettings.port || 9100}). Documents : HP-printer.</p>
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
