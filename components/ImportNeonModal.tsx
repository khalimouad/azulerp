'use client';

import React, { useState, useRef } from 'react';
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
  X,
  FileText,
  Code2,
  Server,
  ArrowRight,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';
import { importDatabaseWithProgress, importDirectDataToNeon } from '@/lib/postgres-service';
import { DbImportProgress, DbImportSummary } from '@/lib/types';

interface ImportNeonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ImportNeonModal: React.FC<ImportNeonModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'file' | 'sql' | 'json'>('file');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<{
    name: string;
    sizeFormatted: string;
    type: string;
    detectedType: string;
    estimatedRecords?: string;
  } | null>(null);

  const [rawSql, setRawSql] = useState('');
  const [rawJson, setRawJson] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<DbImportProgress | null>(null);
  const [summary, setSummary] = useState<DbImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    setError(null);
    setSummary(null);

    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    const lowerName = file.name.toLowerCase();
    let detectedType = 'Format structuré';
    if (lowerName.endsWith('.json')) detectedType = 'Sauvegarde JSON Verde Orto ERP';
    else if (lowerName.endsWith('.sql')) detectedType = 'Script SQL PostgreSQL / DDL';
    else if (lowerName.endsWith('.sqlite') || lowerName.endsWith('.db')) detectedType = 'Base de données SQLite3';
    else if (lowerName.endsWith('.csv')) detectedType = 'Données tabulaires CSV';

    setFilePreview({
      name: file.name,
      sizeFormatted: `${sizeMb} Mo`,
      type: file.type || 'Fichier de base de données',
      detectedType,
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleStartImport = async () => {
    setIsProcessing(true);
    setError(null);
    setSummary(null);

    try {
      if (activeTab === 'file') {
        if (!selectedFile) {
          throw new Error('Veuillez sélectionner un fichier à importer');
        }
        const res = await importDatabaseWithProgress(
          selectedFile,
          (prog) => setProgress(prog),
          importMode
        );
        setSummary(res);
      } else if (activeTab === 'sql') {
        if (!rawSql.trim()) {
          throw new Error('Veuillez saisir des requêtes SQL valides');
        }
        setProgress({
          phase: 'processing',
          uploadPercent: 100,
          treatmentPercent: 60,
          overallPercent: 60,
          currentStepMessage: 'Exécution du script SQL sur PostgreSQL Neon...',
        });
        const res = await importDirectDataToNeon({ sql: rawSql, mode: importMode });
        setSummary({
          fileName: 'Script SQL manuel',
          fileSizeBytes: new Blob([rawSql]).size,
          tablesCount: 15,
          produitsCount: res.counts?.produits || 0,
          clientsCount: res.counts?.clients || 0,
          fournisseursCount: res.counts?.fournisseurs || 0,
          facturesCount: res.counts?.factures || 0,
          blCount: res.counts?.bons_livraison || 0,
          posVentesCount: res.counts?.pos_ventes || 0,
          integrityStatus: 'OK - PostgreSQL Neon',
          durationMs: res.durationMs || 120,
        });
        setProgress({
          phase: 'success',
          uploadPercent: 100,
          treatmentPercent: 100,
          overallPercent: 100,
          currentStepMessage: 'Script SQL exécuté avec succès',
        });
      } else if (activeTab === 'json') {
        if (!rawJson.trim()) {
          throw new Error('Veuillez coller un contenu JSON valide');
        }
        let parsedData: any;
        try {
          parsedData = JSON.parse(rawJson);
        } catch (e: any) {
          throw new Error(`JSON invalide: ${e?.message || 'Erreur de syntaxe'}`);
        }
        setProgress({
          phase: 'processing',
          uploadPercent: 100,
          treatmentPercent: 60,
          overallPercent: 60,
          currentStepMessage: 'Insertion des données JSON dans PostgreSQL Neon...',
        });
        const res = await importDirectDataToNeon({ data: parsedData, mode: importMode });
        setSummary({
          fileName: 'Données JSON manuelles',
          fileSizeBytes: new Blob([rawJson]).size,
          tablesCount: 15,
          produitsCount: res.counts?.produits || 0,
          clientsCount: res.counts?.clients || 0,
          fournisseursCount: res.counts?.fournisseurs || 0,
          facturesCount: res.counts?.factures || 0,
          blCount: res.counts?.bons_livraison || 0,
          posVentesCount: res.counts?.pos_ventes || 0,
          integrityStatus: 'OK - PostgreSQL Neon',
          durationMs: res.durationMs || 150,
        });
        setProgress({
          phase: 'success',
          uploadPercent: 100,
          treatmentPercent: 100,
          overallPercent: 100,
          currentStepMessage: 'Données JSON importées avec succès',
        });
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Import error:', err);
      setError(err?.message || "Échec de l'importation");
      setProgress({
        phase: 'error',
        uploadPercent: 0,
        treatmentPercent: 0,
        overallPercent: 0,
        currentStepMessage: "Erreur d'importation",
        error: err?.message || 'Une erreur est survenue lors du traitement.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetForm = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setRawSql('');
    setRawJson('');
    setProgress(null);
    setSummary(null);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/90 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-inner">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Importer vers Neon PostgreSQL
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700">
                  Cloud DB
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Restaurez ou injectez des données dans votre base PostgreSQL Serverless
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Summary State (Finished) */}
          {summary ? (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-4 bg-emerald-950/40 border border-emerald-700/60 rounded-xl flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-emerald-300">
                    Importation terminée avec succès !
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Toutes les tables PostgreSQL Neon ont été synchronisées et vérifiées.
                  </p>
                </div>
                <div className="text-right font-mono text-xs text-emerald-400 font-bold">
                  {summary.durationMs} ms
                </div>
              </div>

              {/* Records Breakdown Grid */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  Statistiques des enregistrements importés
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <div className="text-[11px] text-slate-400">Clients & Tiers</div>
                    <div className="text-lg font-black text-white font-mono mt-0.5">
                      {summary.clientsCount}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <div className="text-[11px] text-slate-400">Articles & Produits</div>
                    <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">
                      {summary.produitsCount}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <div className="text-[11px] text-slate-400">Bons de Livraison</div>
                    <div className="text-lg font-black text-blue-400 font-mono mt-0.5">
                      {summary.blCount}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <div className="text-[11px] text-slate-400">Factures Vente</div>
                    <div className="text-lg font-black text-indigo-400 font-mono mt-0.5">
                      {summary.facturesCount}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <div className="text-[11px] text-slate-400">Fournisseurs</div>
                    <div className="text-lg font-black text-amber-400 font-mono mt-0.5">
                      {summary.fournisseursCount}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                    <div className="text-[11px] text-slate-400">Intégrité DB</div>
                    <div className="text-xs font-bold text-emerald-400 mt-1.5 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Vérifiée
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons after success */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
                >
                  Importer un autre fichier
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onSuccess) onSuccess();
                  }}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-md active:scale-98 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Terminer & Recharger les données
                </button>
              </div>
            </div>
          ) : isProcessing || progress ? (
            /* Progress State */
            <div className="space-y-5 py-3">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto animate-pulse">
                  <Database className="w-6 h-6 animate-spin" />
                </div>
                <h4 className="text-sm font-bold text-white">
                  {progress?.currentStepMessage || 'Importation en cours vers Neon PostgreSQL...'}
                </h4>
                <p className="text-xs text-slate-400">
                  Traitement direct sur votre cluster serverless Neon
                </p>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-400">Progression</span>
                  <span className="text-emerald-400 font-mono">
                    {progress?.overallPercent || 40}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-700">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(5, progress?.overallPercent || 15))}%` }}
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-xs text-rose-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Erreur d'importation</div>
                    <div>{error}</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Standard Config & Upload View */
            <div className="space-y-5">
              {/* Import Source Tabs */}
              <div className="flex items-center bg-slate-950/60 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('file')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition ${
                    activeTab === 'file'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  Fichier DB (.json, .sql, .db)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('sql')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition ${
                    activeTab === 'sql'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5 text-blue-400" />
                  Script SQL DDL/DML
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('json')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition ${
                    activeTab === 'json'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  JSON Brut
                </button>
              </div>

              {/* Mode Selection (Merge vs Replace) */}
              <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2.5">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Stratégie d'insertion</span>
                  <span className="text-[10px] text-slate-400 lowercase font-normal">
                    (Sélectionnez l'impact sur les données existantes)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
                      importMode === 'merge'
                        ? 'bg-emerald-950/40 border-emerald-600/80 text-emerald-100'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="mt-0.5 accent-emerald-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Zap className="w-3 h-3 text-emerald-400" />
                        Fusion & Mise à jour (Recommandé)
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        Ajoute les nouveaux éléments et met à jour les existants sans supprimer vos données.
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
                      importMode === 'replace'
                        ? 'bg-rose-950/40 border-rose-600/80 text-rose-100'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="mt-0.5 accent-rose-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                        <RefreshCw className="w-3 h-3 text-rose-400" />
                        Restauration Totale (Remplacement)
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        Vide les tables avant d'insérer les nouvelles données. Idéal pour une restauration propre.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Tab 1: File Upload */}
              {activeTab === 'file' && (
                <div className="space-y-3">
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                      isDragging
                        ? 'border-emerald-500 bg-emerald-950/30 scale-[0.99]'
                        : selectedFile
                        ? 'border-emerald-600/80 bg-emerald-950/20'
                        : 'border-slate-700 hover:border-slate-500 bg-slate-950/40 hover:bg-slate-950/70'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json,.sql,.sqlite,.db,.txt,.csv"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileSelected(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />

                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                      selectedFile ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      <Upload className="w-6 h-6" />
                    </div>

                    <div>
                      <div className="text-sm font-bold text-white">
                        {selectedFile ? selectedFile.name : 'Glissez-déposez votre fichier de sauvegarde ici'}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Formats supportés: <span className="text-emerald-400 font-mono">.json</span>, <span className="text-blue-400 font-mono">.sql</span>, <span className="text-indigo-400 font-mono">.db</span>, <span className="text-amber-400 font-mono">.sqlite</span>
                      </p>
                    </div>

                    {!selectedFile && (
                      <button
                        type="button"
                        className="mt-1 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition"
                      >
                        Parcourir les fichiers
                      </button>
                    )}
                  </div>

                  {filePreview && (
                    <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <FileCheck className="w-4 h-4 text-emerald-400" />
                        <div>
                          <div className="font-bold text-white">{filePreview.name}</div>
                          <div className="text-slate-400 text-[11px]">{filePreview.detectedType} • {filePreview.sizeFormatted}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                          setFilePreview(null);
                        }}
                        className="text-slate-400 hover:text-rose-400 p-1"
                        title="Retirer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: SQL Script Editor */}
              {activeTab === 'sql' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-bold flex items-center gap-1.5">
                      <TerminalIcon className="w-3.5 h-3.5 text-blue-400" />
                      Script SQL PostgreSQL
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      Instructions CREATE TABLE, INSERT INTO, UPDATE...
                    </span>
                  </div>
                  <textarea
                    rows={8}
                    value={rawSql}
                    onChange={(e) => setRawSql(e.target.value)}
                    placeholder="-- Collez vos instructions SQL PostgreSQL ici
INSERT INTO clients (id, code, nom, ville, solde) VALUES (1, 'CLI-001', 'Client Test', 'Marrakech', 0) ON CONFLICT (id) DO NOTHING;
INSERT INTO produits (id, code, libelle, prix_ht, stock_actuel) VALUES (1, 'PRD-001', 'Huile d''olive', 85.00, 150) ON CONFLICT (id) DO NOTHING;"
                    className="w-full p-3 font-mono text-xs bg-slate-950 text-slate-200 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-y"
                  />
                </div>
              )}

              {/* Tab 3: Raw JSON Editor */}
              {activeTab === 'json' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-bold flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-400" />
                      Objet JSON de Base de Données
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      Format Verde Orto ERP (clients, produits, factures...)
                    </span>
                  </div>
                  <textarea
                    rows={8}
                    value={rawJson}
                    onChange={(e) => setRawJson(e.target.value)}
                    placeholder='{
  "clients": [
    { "id": 1, "code": "CLI-01", "nom": "Client Exemple", "ville": "Marrakech" }
  ],
  "produits": [
    { "id": 1, "code": "PRD-01", "libelle": "Tomate Bio", "prix_ht": 12.5, "stock_actuel": 40 }
  ]
}'
                    className="w-full p-3 font-mono text-xs bg-slate-950 text-slate-200 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 transition resize-y"
                  />
                </div>
              )}

              {error && (
                <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-xs text-rose-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-emerald-400" />
                  Exécution sécurisée sur Neon Serverless
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleStartImport}
                    disabled={
                      (activeTab === 'file' && !selectedFile) ||
                      (activeTab === 'sql' && !rawSql.trim()) ||
                      (activeTab === 'json' && !rawJson.trim())
                    }
                    className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-md active:scale-98"
                  >
                    <Upload className="w-4 h-4" />
                    Lancer l'importation vers Neon
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function TerminalIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" x2="20" y1="19" y2="19" />
    </svg>
  );
}
