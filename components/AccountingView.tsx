'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  JournalEntry,
  PlanAccount,
  AccountingJournal,
  FixedAsset,
  Facture,
  Reglement,
  Produit
} from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  OFFICIAL_PCGM_ACCOUNTS,
  MOROCCAN_JOURNALS,
  computeGeneralBalance,
  calculateCPC,
  calculateBilan,
  calculateSIMPLTVA,
  calculateSIMPLIS,
  generateFiduciaireExportCSV,
  generateDepreciationJournalEntry
} from '@/lib/moroccan-accounting';
import {
  saveJournalEntry,
  deleteJournalEntry,
  syncAllOperationalEntries,
  saveFixedAsset,
  deleteFixedAsset
} from '@/lib/postgres-service';
import {
  BookOpen,
  Scale,
  FileSpreadsheet,
  Building,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Plus,
  Trash2,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  FileText,
  Calendar,
  Eye,
  X,
  Printer
} from 'lucide-react';

export type AccountingTab = 'JOURNAL' | 'PCGM' | 'BALANCE' | 'SYNTHESE' | 'FISCALITE' | 'IMMOBILISATIONS' | 'EXPORT';

interface AccountingViewProps {
  entries: JournalEntry[];
  accounts?: PlanAccount[];
  journals?: AccountingJournal[];
  assets?: FixedAsset[];
  factures?: Facture[];
  reglements?: Reglement[];
  onRefresh?: () => void;
}

export function AccountingView({
  entries = [],
  accounts = OFFICIAL_PCGM_ACCOUNTS,
  journals = MOROCCAN_JOURNALS,
  assets = [],
  factures = [],
  reglements = [],
  onRefresh
}: AccountingViewProps) {
  const [currentTab, setCurrentTab] = useState<AccountingTab>('JOURNAL');
  const [selectedJournal, setSelectedJournal] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [pcgmClasse, setPcgmClasse] = useState<number>(1);
  const [pcgmSearch, setPcgmSearch] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Modals state
  const [showEntryModal, setShowEntryModal] = useState<boolean>(false);
  const [showAssetModal, setShowAssetModal] = useState<boolean>(false);
  const [viewingEntry, setViewingEntry] = useState<JournalEntry | null>(null);

  // New Journal Entry Form State
  const [newEntry, setNewEntry] = useState<Partial<JournalEntry>>({
    date: new Date().toISOString().split('T')[0],
    journal_code: 'OD',
    libelle: '',
    reference: '',
    lines: [
      { compte_code: '3421', compte_libelle: 'Clients', debit: 0, credit: 0 },
      { compte_code: '7111', compte_libelle: 'Ventes de marchandises au Maroc', debit: 0, credit: 0 }
    ]
  });

  // New Asset Form State
  const [newAsset, setNewAsset] = useState<Partial<FixedAsset>>({
    code: `IMM-${Date.now().toString().slice(-4)}`,
    designation: '',
    compte_immobilisation: '2340',
    compte_amortissement: '2834',
    compte_dotation: '6193',
    valeur_acquisition: 0,
    date_acquisition: new Date().toISOString().split('T')[0],
    date_mise_service: new Date().toISOString().split('T')[0],
    duree_annees: 5,
    methode: 'lineaire',
    taux: 20,
    amortissements_cumules: 0,
    vna: 0,
    statut: 'en_service',
  });

  // Silent automatic background sync: ensures all validated invoices & payments are posted without user intervention
  useEffect(() => {
    syncAllOperationalEntries()
      .then((res) => {
        if (res && res.count > 0 && onRefresh) {
          onRefresh();
        }
      })
      .catch((err) => {
        console.warn('[Accounting] Auto-sync notice:', err);
      });
  }, []);

  // 1. Calculations and Aggregations
  const balanceRecord = useMemo(() => computeGeneralBalance(entries), [entries]);
  const balanceList = useMemo(() => Object.values(balanceRecord).filter(b => b.total_debit > 0 || b.total_credit > 0), [balanceRecord]);
  const cpc = useMemo(() => calculateCPC(entries), [entries]);
  const bilan = useMemo(() => calculateBilan(entries), [entries]);
  const simplTva = useMemo(() => calculateSIMPLTVA(entries), [entries]);
  const simplIs = useMemo(() => calculateSIMPLIS(entries), [entries]);

  // Overall totals
  const totalDebitAll = entries.reduce((s, e) => s + (Number(e.total_debit) || 0), 0);
  const totalCreditAll = entries.reduce((s, e) => s + (Number(e.total_credit) || 0), 0);
  const ecartBalance = Math.abs(totalDebitAll - totalCreditAll);

  // Filtered entries for Journal Table
  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      const matchJournal = selectedJournal === 'ALL' || e.journal_code === selectedJournal;
      const matchSearch = !searchTerm ||
        e.numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.libelle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.reference?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchJournal && matchSearch;
    });
  }, [entries, selectedJournal, searchTerm]);

  // Filtered PCGM Accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter(a => {
      const matchClasse = a.classe === pcgmClasse;
      const matchSearch = !pcgmSearch ||
        a.code.includes(pcgmSearch) ||
        a.libelle.toLowerCase().includes(pcgmSearch.toLowerCase()) ||
        (a.libelle_ar && a.libelle_ar.includes(pcgmSearch));
      return matchClasse && matchSearch;
    });
  }, [accounts, pcgmClasse, pcgmSearch]);

  // Handle Syncing all operational entries
  const handleSyncOperational = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await syncAllOperationalEntries();
      setSyncFeedback(`Synchronisation réussie : ${res.count} nouvelle(s) écriture(s) comptabilisée(s).`);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setSyncFeedback(`Erreur de synchronisation: ${err?.message || err}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle saving new entry
  const handleSaveEntry = async () => {
    const totalD = (newEntry.lines || []).reduce((s, l) => s + Number(l.debit || 0), 0);
    const totalC = (newEntry.lines || []).reduce((s, l) => s + Number(l.credit || 0), 0);

    if (Math.abs(totalD - totalC) > 0.05) {
      alert(`L'écriture n'est pas équilibrée ! Débit (${totalD.toFixed(2)}) ≠ Crédit (${totalC.toFixed(2)})`);
      return;
    }
    if (!newEntry.libelle) {
      alert('Veuillez spécifier un libellé pour l’écriture.');
      return;
    }

    const fullEntry: JournalEntry = {
      numero: `ECR-${Date.now().toString().slice(-6)}`,
      date: newEntry.date || new Date().toISOString().split('T')[0],
      journal_code: newEntry.journal_code || 'OD',
      libelle: newEntry.libelle,
      reference: newEntry.reference || '',
      status: 'valide',
      total_debit: Math.round(totalD * 100) / 100,
      total_credit: Math.round(totalC * 100) / 100,
      source_type: 'MANUEL',
      lines: (newEntry.lines || []).map((l, i) => ({
        id: i + 1,
        compte_code: l.compte_code,
        compte_libelle: l.compte_libelle,
        debit: Number(l.debit || 0),
        credit: Number(l.credit || 0),
      })),
      created_at: new Date().toISOString(),
    };

    try {
      await saveJournalEntry(fullEntry);
      setShowEntryModal(false);
      setNewEntry({
        date: new Date().toISOString().split('T')[0],
        journal_code: 'OD',
        libelle: '',
        reference: '',
        lines: [
          { compte_code: '3421', compte_libelle: 'Clients', debit: 0, credit: 0 },
          { compte_code: '7111', compte_libelle: 'Ventes', debit: 0, credit: 0 }
        ]
      });
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    }
  };

  // Handle saving new asset
  const handleSaveAsset = async () => {
    if (!newAsset.designation || !newAsset.valeur_acquisition) {
      alert('Veuillez remplir la désignation et la valeur d’acquisition.');
      return;
    }
    const valAcq = Number(newAsset.valeur_acquisition);
    const duree = Number(newAsset.duree_annees) || 5;
    const taux = 100 / duree;

    const fullAsset: FixedAsset = {
      ...newAsset as FixedAsset,
      valeur_acquisition: valAcq,
      duree_annees: duree,
      taux,
      vna: valAcq - (Number(newAsset.amortissements_cumules) || 0),
    };

    try {
      await saveFixedAsset(fullAsset);
      setShowAssetModal(false);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    }
  };

  // Export CSV
  const handleDownloadFEC = () => {
    const csvContent = generateFiduciaireExportCSV(entries);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `FEC_Comptabilite_Maroc_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800/80 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Intégration Automatique Temps Réel
              </span>
              <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                PCGM & LF 2026
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <Scale className="w-8 h-8 text-indigo-400" />
              Comptabilité Générale & Liasse Fiscale
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Journaux auxiliaires, Grand Livre, Balance 6 colonnes, Bilan & CPC (CGNC) et télédéclarations DGI
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSyncOperational}
              disabled={isSyncing}
              title="Vérifier et forcer la synchronisation manuelle des écritures historiques"
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-50 text-slate-200 rounded-xl font-medium transition text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              Resynchroniser l'historique
            </button>

            <button
              onClick={() => setShowEntryModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition shadow-lg shadow-emerald-600/30 text-sm"
            >
              <Plus className="w-4 h-4" />
              Nouvelle Écriture
            </button>
          </div>
        </div>

        {syncFeedback && (
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm flex items-center justify-between">
            <span>{syncFeedback}</span>
            <button onClick={() => setSyncFeedback(null)} className="text-emerald-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Global Key Figures */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800">
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-3 border border-slate-700/50">
            <p className="text-xs text-slate-400 uppercase font-medium">Total Débit</p>
            <p className="text-lg font-bold text-white mt-1">{formatCurrency(totalDebitAll)}</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-3 border border-slate-700/50">
            <p className="text-xs text-slate-400 uppercase font-medium">Total Crédit</p>
            <p className="text-lg font-bold text-white mt-1">{formatCurrency(totalCreditAll)}</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-3 border border-slate-700/50">
            <p className="text-xs text-slate-400 uppercase font-medium">Équilibre Comptable</p>
            <p className={`text-lg font-bold mt-1 flex items-center gap-1 ${ecartBalance === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {ecartBalance === 0 ? (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Équilibré (0.00 DH)
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4" /> Écart : {formatCurrency(ecartBalance)}
                </>
              )}
            </p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-3 border border-slate-700/50">
            <p className="text-xs text-slate-400 uppercase font-medium">Résultat Net Provisoire</p>
            <p className={`text-lg font-bold mt-1 ${cpc.resultat_net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatCurrency(cpc.resultat_net)}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto gap-2 pb-1">
        {[
          { id: 'JOURNAL', label: 'Journal & Grand Livre', icon: BookOpen },
          { id: 'PCGM', label: 'Plan Comptable (PCGM)', icon: Layers },
          { id: 'BALANCE', label: 'Balance Générale (6 Col)', icon: Scale },
          { id: 'SYNTHESE', label: 'Bilan & CPC (CGNC)', icon: FileSpreadsheet },
          { id: 'FISCALITE', label: 'SIMPL-TVA & SIMPL-IS', icon: Building },
          { id: 'IMMOBILISATIONS', label: 'Immobilisations', icon: TrendingUp },
          { id: 'EXPORT', label: 'Export Fichier FEC / CSV', icon: Download },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id as AccountingTab)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: JOURNAL & GRAND LIVRE */}
      {currentTab === 'JOURNAL' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher écriture, libellé, réf..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                />
              </div>

              {/* Journal Filter Buttons */}
              <div className="flex items-center gap-1 overflow-x-auto py-1">
                <button
                  onClick={() => setSelectedJournal('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    selectedJournal === 'ALL'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  Tous ({entries.length})
                </button>
                {journals.map(j => {
                  const count = entries.filter(e => e.journal_code === j.code).length;
                  return (
                    <button
                      key={j.code}
                      onClick={() => setSelectedJournal(j.code)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                        selectedJournal === j.code
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {j.code} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {filteredEntries.length} écriture(s) affichée(s)
            </div>
          </div>

          {/* Journal Entries List Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase">
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Journal</th>
                    <th className="py-3.5 px-4">N° Pièce / Réf</th>
                    <th className="py-3.5 px-4">Libellé de l'Écriture</th>
                    <th className="py-3.5 px-4">Imputations Comptables (Débit / Crédit)</th>
                    <th className="py-3.5 px-4 text-right">Débit (DH)</th>
                    <th className="py-3.5 px-4 text-right">Crédit (DH)</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="font-medium text-slate-500">Aucune écriture comptable trouvée</p>
                        <p className="text-xs mt-1">Cliquez sur « Synchroniser » pour générer les écritures à partir de vos factures et paiements.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredEntries.map(entry => (
                      <tr key={entry.id || entry.numero} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {formatDate(entry.date)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                            {entry.journal_code}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-mono text-xs font-semibold text-slate-900 dark:text-white">
                            {entry.numero}
                          </span>
                          {entry.reference && (
                            <span className="block text-xs text-slate-400 font-mono">
                              Réf: {entry.reference}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-medium text-slate-900 dark:text-white">
                            {entry.libelle}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="space-y-1 min-w-[280px]">
                            {entry.lines?.map((line, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs py-0.5 border-b border-slate-100 dark:border-slate-800/40 last:border-0">
                                <span className="font-mono font-medium text-indigo-600 dark:text-indigo-400">
                                  {line.compte_code || line.account_code}
                                  <span className="text-slate-500 dark:text-slate-400 font-sans ml-1.5 font-normal truncate max-w-[140px] inline-block align-bottom">
                                    {line.compte_libelle || line.account_label}
                                  </span>
                                </span>
                                <div className="space-x-2 font-mono">
                                  {line.debit > 0 && <span className="text-slate-900 dark:text-white font-semibold">D: {formatCurrency(line.debit)}</span>}
                                  {line.credit > 0 && <span className="text-slate-500 font-semibold">C: {formatCurrency(line.credit)}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {formatCurrency(entry.total_debit)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {formatCurrency(entry.total_credit)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setViewingEntry(entry)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition"
                              title="Voir détail"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm(`Supprimer l'écriture ${entry.numero} ?`)) {
                                  if (entry.id) await deleteJournalEntry(entry.id);
                                  if (onRefresh) onRefresh();
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PCGM (PLAN COMPTABLE) */}
      {currentTab === 'PCGM' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Class Selector 1 to 7 */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 w-full md:w-auto">
              {[
                { cl: 1, label: 'Classe 1 : Financement Permanent' },
                { cl: 2, label: 'Classe 2 : Actif Immobilisé' },
                { cl: 3, label: 'Classe 3 : Actif Circulant' },
                { cl: 4, label: 'Classe 4 : Passif Circulant' },
                { cl: 5, label: 'Classe 5 : Trésorerie' },
                { cl: 6, label: 'Classe 6 : Charges' },
                { cl: 7, label: 'Classe 7 : Produits' },
              ].map(item => (
                <button
                  key={item.cl}
                  onClick={() => setPcgmClasse(item.cl)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    pcgmClasse === item.cl
                      ? 'bg-indigo-600 text-white shadow'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrer comptes..."
                value={pcgmSearch}
                onChange={(e) => setPcgmSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase">
                  <th className="py-3.5 px-4 w-32">N° Compte</th>
                  <th className="py-3.5 px-4">Intitulé Officiel (Français)</th>
                  <th className="py-3.5 px-4 text-right font-arabic">الاسم المحاسبي (العربية)</th>
                  <th className="py-3.5 px-4">Classe</th>
                  <th className="py-3.5 px-4">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredAccounts.map(acc => (
                  <tr key={acc.code} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {acc.code}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                      {acc.libelle}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500 dark:text-slate-400 font-arabic text-sm" dir="rtl">
                      {acc.libelle_ar || '-'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                        Classe {acc.classe}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs capitalize text-slate-500">
                        {acc.type}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: BALANCE GÉNÉRALE DES COMPTES */}
      {currentTab === 'BALANCE' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Balance Générale à 6 Colonnes</h3>
              <p className="text-xs text-slate-500 mt-0.5">Vérification de l'égalité Débit/Crédit et des soldes clôturés</p>
            </div>
            <button
              onClick={handleDownloadFEC}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition"
            >
              <Download className="w-4 h-4" />
              Exporter Balance
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase">
                  <th className="py-3.5 px-4 w-28">N° Compte</th>
                  <th className="py-3.5 px-4">Intitulé du Compte</th>
                  <th className="py-3.5 px-4 text-right">Cumul Débit</th>
                  <th className="py-3.5 px-4 text-right">Cumul Crédit</th>
                  <th className="py-3.5 px-4 text-right">Solde Débiteur</th>
                  <th className="py-3.5 px-4 text-right">Solde Créditeur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {balanceList.map(b => (
                  <tr key={b.code} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {b.code}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                      {b.libelle}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-900 dark:text-white">
                      {b.total_debit > 0 ? formatCurrency(b.total_debit) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-900 dark:text-white">
                      {b.total_credit > 0 ? formatCurrency(b.total_credit) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {b.solde_debit > 0 ? formatCurrency(b.solde_debit) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {b.solde_credit > 0 ? formatCurrency(b.solde_credit) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 dark:bg-slate-800/80 font-bold text-sm border-t-2 border-slate-300 dark:border-slate-700">
                  <td colSpan={2} className="py-3.5 px-4 uppercase text-slate-700 dark:text-slate-300">
                    TOTAUX GÉNÉRAUX DE LA BALANCE
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-900 dark:text-white">
                    {formatCurrency(balanceList.reduce((s, b) => s + b.total_debit, 0))}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-900 dark:text-white">
                    {formatCurrency(balanceList.reduce((s, b) => s + b.total_credit, 0))}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(balanceList.reduce((s, b) => s + b.solde_debit, 0))}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-indigo-600 dark:text-indigo-400">
                    {formatCurrency(balanceList.reduce((s, b) => s + b.solde_credit, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: BILAN & CPC (LIASSE FISCALE CGNC) */}
      {currentTab === 'SYNTHESE' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CPC : Compte de Produits et Charges */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                État de Synthèse Officiel
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                Compte de Produits et Charges (CPC)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Classes 6 et 7 du Plan Comptable Général Marocain</p>
            </div>

            {/* Exploitation */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">I. Exploitation</h4>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800 text-sm text-indigo-600 font-bold">
                <span>Total Produits d'Exploitation (I)</span>
                <span className="font-mono">{formatCurrency(cpc.produits_exploitation)}</span>
              </div>

              <div className="pt-2 space-y-1.5">
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800 text-sm text-rose-600 font-bold">
                  <span>Total Charges d'Exploitation (II)</span>
                  <span className="font-mono">{formatCurrency(cpc.charges_exploitation)}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex justify-between items-center font-bold text-sm">
                <span>RÉSULTAT D'EXPLOITATION (I - II)</span>
                <span className={`font-mono ${cpc.resultat_exploitation >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatCurrency(cpc.resultat_exploitation)}
                </span>
              </div>
            </div>

            {/* Résultat Net Final */}
            <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl flex justify-between items-center font-bold">
              <div>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 uppercase">Résultat Net de l'Exercice</p>
                <p className="text-lg text-slate-900 dark:text-white">Bénéfice / Perte</p>
              </div>
              <span className={`text-2xl font-mono ${cpc.resultat_net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                {formatCurrency(cpc.resultat_net)}
              </span>
            </div>
          </div>

          {/* BILAN : Actif & Passif */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                État de Synthèse Officiel
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                Bilan Simplifié (Actif & Passif)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Classes 1 à 5 du Plan Comptable Général Marocain</p>
            </div>

            {/* Actif */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">ACTIF</h4>
              {bilan.actif.immobilise.map(r => (
                <div key={r.code} className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800 text-sm">
                  <span>{r.libelle}</span>
                  <span className="font-mono font-medium">{formatCurrency(r.net)}</span>
                </div>
              ))}
              {bilan.actif.circulant.map(r => (
                <div key={r.code} className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800 text-sm">
                  <span>{r.libelle}</span>
                  <span className="font-mono font-medium">{formatCurrency(r.net)}</span>
                </div>
              ))}
              {bilan.actif.tresorerie.map(r => (
                <div key={r.code} className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800 text-sm">
                  <span>{r.libelle}</span>
                  <span className="font-mono font-medium">{formatCurrency(r.net)}</span>
                </div>
              ))}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl flex justify-between items-center font-bold text-sm text-emerald-800 dark:text-emerald-300">
                <span>TOTAL ACTIF</span>
                <span className="font-mono text-base">{formatCurrency(bilan.actif.total)}</span>
              </div>
            </div>

            {/* Passif */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">PASSIF</h4>
              {bilan.passif.financement_permanent.map(r => (
                <div key={r.code} className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800 text-sm">
                  <span>{r.libelle}</span>
                  <span className="font-mono font-medium">{formatCurrency(r.net)}</span>
                </div>
              ))}
              {bilan.passif.passif_circulant.map(r => (
                <div key={r.code} className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800 text-sm">
                  <span>{r.libelle}</span>
                  <span className="font-mono font-medium">{formatCurrency(r.net)}</span>
                </div>
              ))}
              {bilan.passif.tresorerie.map(r => (
                <div key={r.code} className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800 text-sm">
                  <span>{r.libelle}</span>
                  <span className="font-mono font-medium">{formatCurrency(r.net)}</span>
                </div>
              ))}
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl flex justify-between items-center font-bold text-sm text-indigo-800 dark:text-indigo-300">
                <span>TOTAL PASSIF</span>
                <span className="font-mono text-base">{formatCurrency(bilan.passif.total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: FISCALITÉ MAROCAINE (SIMPL-TVA & SIMPL-IS) */}
      {currentTab === 'FISCALITE' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SIMPL-TVA */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                  Déclaration Fiscale DGI
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  SIMPL-TVA (Régime Débit / Encaissement)
                </h3>
              </div>
              <div className="p-2.5 bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 rounded-xl">
                <Building className="w-6 h-6" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800 text-sm">
                <span>TVA Facturée Collectée (4455)</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {formatCurrency(simplTva.total_tva_collectee)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800 text-sm">
                <span>TVA Récupérable sur Charges (34552)</span>
                <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                  - {formatCurrency(simplTva.tva_deductible_charges)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800 text-sm">
                <span>TVA Récupérable sur Immobilisations (34551)</span>
                <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                  - {formatCurrency(simplTva.tva_deductible_immobilisations)}
                </span>
              </div>

              <div className={`p-4 rounded-xl font-bold flex justify-between items-center ${
                simplTva.tva_nette_due > 0
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              }`}>
                <div>
                  <p className="text-xs uppercase font-medium">Position Fiscale Nette</p>
                  <p className="text-base font-bold">
                    {simplTva.tva_nette_due > 0 ? 'TVA Nette à Verser au Trésor' : 'Crédit de TVA à Reporter'}
                  </p>
                </div>
                <span className="text-xl font-mono">
                  {formatCurrency(simplTva.tva_nette_due > 0 ? simplTva.tva_nette_due : simplTva.credit_tva_a_reporter)}
                </span>
              </div>
            </div>
          </div>

          {/* SIMPL-IS */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Impôt sur les Sociétés
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  SIMPL-IS (Barème Progressif 2026)
                </h3>
              </div>
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800 text-sm">
                <span>Bénéfice Net Fiscal Estimé</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {formatCurrency(simplIs.resultat_fiscal_imposable)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800 text-sm">
                <span>Tranche IS Applicable</span>
                <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                  {simplIs.tranche_applicable}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800 text-sm">
                <span>Cotisation Minimale (0.5% du CA HT)</span>
                <span className="font-mono text-slate-600 dark:text-slate-400">
                  {formatCurrency(simplIs.cotisation_minimale)}
                </span>
              </div>

              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl font-bold flex justify-between items-center text-indigo-900 dark:text-indigo-300">
                <div>
                  <p className="text-xs uppercase font-medium">IS Exigible de l'Exercice</p>
                  <p className="text-base font-bold">Total Impôt sur les Sociétés</p>
                </div>
                <span className="text-xl font-mono">
                  {formatCurrency(simplIs.impot_du_definitif)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: IMMOBILISATIONS */}
      {currentTab === 'IMMOBILISATIONS' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Registre des Immobilisations & Amortissements</h3>
              <p className="text-xs text-slate-500 mt-0.5">Suivi des biens durables, taux d'amortissement et VNA</p>
            </div>
            <button
              onClick={() => setShowAssetModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition"
            >
              <Plus className="w-4 h-4" />
              Ajouter Immobilisation
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase">
                  <th className="py-3.5 px-4">Code</th>
                  <th className="py-3.5 px-4">Désignation</th>
                  <th className="py-3.5 px-4">Date Acq.</th>
                  <th className="py-3.5 px-4 text-right">Valeur d'Acquisition</th>
                  <th className="py-3.5 px-4 text-center">Durée / Taux</th>
                  <th className="py-3.5 px-4 text-right">Amort. Cumulés</th>
                  <th className="py-3.5 px-4 text-right">VNA (Valeur Nette)</th>
                  <th className="py-3.5 px-4 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {assets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Aucune immobilisation enregistrée. Cliquez sur « Ajouter Immobilisation ».
                    </td>
                  </tr>
                ) : (
                  assets.map(asset => (
                    <tr key={asset.id || asset.code} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {asset.code}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                        {asset.designation}
                        <span className="block text-xs text-slate-400 font-mono">
                          Compte: {asset.compte_immobilisation}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">
                        {formatDate(asset.date_acquisition)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(asset.valeur_acquisition)}
                      </td>
                      <td className="py-3 px-4 text-center text-xs">
                        <span className="font-semibold">{asset.duree_annees} ans</span>
                        <span className="text-slate-400 block font-mono">({asset.taux}%)</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-400">
                        {formatCurrency(asset.amortissements_cumules)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(asset.vna)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          {asset.statut}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: EXPORT FIDUCIAIRE / FEC */}
      {currentTab === 'EXPORT' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center max-w-2xl mx-auto space-y-4">
          <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto">
            <Download className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
            Export Grand Livre & Fichier FEC pour Fiduciaire
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Générez le fichier normalisé conforme aux exigences fiscales marocaines (DGI) et compatible avec tous les logiciels comptables (Sage, Ciel, Cegid, Odoo).
          </p>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl text-left text-xs font-mono text-slate-600 dark:text-slate-400 space-y-1">
            <p className="font-bold text-slate-800 dark:text-slate-200 mb-2 font-sans">Format des colonnes d'export :</p>
            <p>JournalCode | JournalLib | EcritureNum | EcritureDate | CompteNum | CompteLib | PieceRef | EcritureLib | Debit | Credit</p>
          </div>

          <button
            onClick={handleDownloadFEC}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition shadow-lg shadow-indigo-600/30 text-sm mx-auto"
          >
            <Download className="w-5 h-5" />
            Télécharger le fichier CSV / FEC
          </button>
        </div>
      )}

      {/* MODAL: NOUVELLE ÉCRITURE MANUELLE */}
      {showEntryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Nouvelle Écriture Comptable</h3>
                <p className="text-xs text-slate-500">Saisie en partie double selon le PCGM</p>
              </div>
              <button onClick={() => setShowEntryModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Date</label>
                  <input
                    type="date"
                    value={newEntry.date}
                    onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Journal</label>
                  <select
                    value={newEntry.journal_code}
                    onChange={(e) => setNewEntry({ ...newEntry, journal_code: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                  >
                    {journals.map(j => (
                      <option key={j.code} value={j.code}>{j.code} - {j.nom}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Référence Pièce</label>
                  <input
                    type="text"
                    placeholder="Ex: CHQ-4829, FACT-102"
                    value={newEntry.reference}
                    onChange={(e) => setNewEntry({ ...newEntry, reference: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Libellé de l'Écriture *</label>
                <input
                  type="text"
                  placeholder="Ex: Paiement facture fournisseur par virement"
                  value={newEntry.libelle}
                  onChange={(e) => setNewEntry({ ...newEntry, libelle: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium"
                />
              </div>

              {/* Lines Table */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Lignes Comptables (Débit / Crédit)</label>
                  <button
                    type="button"
                    onClick={() => {
                      setNewEntry({
                        ...newEntry,
                        lines: [...(newEntry.lines || []), { compte_code: '5141', compte_libelle: 'Banques', debit: 0, credit: 0 }]
                      });
                    }}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Ajouter une ligne
                  </button>
                </div>

                <div className="space-y-2">
                  {newEntry.lines?.map((line, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                      <input
                        type="text"
                        placeholder="Compte (ex: 3421)"
                        value={line.compte_code}
                        onChange={(e) => {
                          const code = e.target.value;
                          const found = accounts.find(a => a.code === code);
                          const updated = [...(newEntry.lines || [])];
                          updated[idx] = {
                            ...updated[idx],
                            compte_code: code,
                            compte_libelle: found ? found.libelle : updated[idx].compte_libelle
                          };
                          setNewEntry({ ...newEntry, lines: updated });
                        }}
                        className="w-28 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold"
                      />
                      <input
                        type="text"
                        placeholder="Intitulé du compte"
                        value={line.compte_libelle}
                        onChange={(e) => {
                          const updated = [...(newEntry.lines || [])];
                          updated[idx] = { ...updated[idx], compte_libelle: e.target.value };
                          setNewEntry({ ...newEntry, lines: updated });
                        }}
                        className="flex-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      />
                      <input
                        type="number"
                        placeholder="Débit"
                        value={line.debit || ''}
                        onChange={(e) => {
                          const updated = [...(newEntry.lines || [])];
                          updated[idx] = { ...updated[idx], debit: parseFloat(e.target.value) || 0 };
                          setNewEntry({ ...newEntry, lines: updated });
                        }}
                        className="w-28 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-right"
                      />
                      <input
                        type="number"
                        placeholder="Crédit"
                        value={line.credit || ''}
                        onChange={(e) => {
                          const updated = [...(newEntry.lines || [])];
                          updated[idx] = { ...updated[idx], credit: parseFloat(e.target.value) || 0 };
                          setNewEntry({ ...newEntry, lines: updated });
                        }}
                        className="w-28 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-right"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (newEntry.lines || []).filter((_, i) => i !== idx);
                          setNewEntry({ ...newEntry, lines: updated });
                        }}
                        className="text-slate-400 hover:text-rose-500 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Balance footer in modal */}
                {(() => {
                  const d = (newEntry.lines || []).reduce((s, l) => s + Number(l.debit || 0), 0);
                  const c = (newEntry.lines || []).reduce((s, l) => s + Number(l.credit || 0), 0);
                  const diff = Math.abs(d - c);
                  return (
                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-between text-xs font-mono font-bold mt-3">
                      <span>Total Débit: {formatCurrency(d)}</span>
                      <span>Total Crédit: {formatCurrency(c)}</span>
                      <span className={diff < 0.05 ? 'text-emerald-600' : 'text-rose-600'}>
                        {diff < 0.05 ? '✓ Équilibré' : `Écart : ${formatCurrency(diff)}`}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowEntryModal(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveEntry}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/20"
              >
                Valider et Comptabiliser
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOUVELLE IMMOBILISATION */}
      {showAssetModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Ajouter une Immobilisation</h3>
              <button onClick={() => setShowAssetModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Désignation du Bien</label>
                <input
                  type="text"
                  placeholder="Ex: Four rotatif industriel 80L"
                  value={newAsset.designation}
                  onChange={(e) => setNewAsset({ ...newAsset, designation: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Valeur d'Acquisition (DH)</label>
                  <input
                    type="number"
                    value={newAsset.valeur_acquisition || ''}
                    onChange={(e) => setNewAsset({ ...newAsset, valeur_acquisition: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Durée (Années)</label>
                  <input
                    type="number"
                    value={newAsset.duree_annees}
                    onChange={(e) => setNewAsset({ ...newAsset, duree_annees: parseInt(e.target.value, 10) || 5 })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Date d'Acquisition</label>
                  <input
                    type="date"
                    value={newAsset.date_acquisition}
                    onChange={(e) => setNewAsset({ ...newAsset, date_acquisition: e.target.value, date_mise_service: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Compte Immobilisation</label>
                  <select
                    value={newAsset.compte_immobilisation}
                    onChange={(e) => setNewAsset({ ...newAsset, compte_immobilisation: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono"
                  >
                    <option value="2332">2332 - Matériel et outillage</option>
                    <option value="2340">2340 - Matériel de transport</option>
                    <option value="2351">2351 - Mobilier de bureau</option>
                    <option value="2355">2355 - Matériel informatique</option>
                    <option value="2321">2321 - Bâtiments industriels</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAssetModal(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveAsset}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-600/20"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VOIR DÉTAIL D'UNE ÉCRITURE */}
      {viewingEntry && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Journal: {viewingEntry.journal_code}</span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Écriture n° {viewingEntry.numero}</h3>
              </div>
              <button onClick={() => setViewingEntry(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-sm space-y-1">
              <p><span className="text-slate-400">Date :</span> <span className="font-semibold">{formatDate(viewingEntry.date)}</span></p>
              <p><span className="text-slate-400">Libellé :</span> <span className="font-semibold">{viewingEntry.libelle}</span></p>
              {viewingEntry.reference && <p><span className="text-slate-400">Réf :</span> <span className="font-mono">{viewingEntry.reference}</span></p>}
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="p-2.5">Compte</th>
                    <th className="p-2.5">Libellé du compte</th>
                    <th className="p-2.5 text-right">Débit</th>
                    <th className="p-2.5 text-right">Crédit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {viewingEntry.lines?.map((line, i) => (
                    <tr key={i}>
                      <td className="p-2.5 font-mono font-bold text-indigo-600">{line.compte_code || line.account_code}</td>
                      <td className="p-2.5">{line.compte_libelle || line.account_label}</td>
                      <td className="p-2.5 text-right font-mono font-bold">{line.debit > 0 ? formatCurrency(line.debit) : '-'}</td>
                      <td className="p-2.5 text-right font-mono font-bold">{line.credit > 0 ? formatCurrency(line.credit) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewingEntry(null)}
                className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
