'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  JournalEntry,
  PlanAccount,
  AccountType,
  AccountClassId,
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
  Calendar,
  Eye,
  X,
  Printer,
  Edit,
  ChevronDown,
  SlidersHorizontal,
} from 'lucide-react';
import { DateRangeFilter } from '@/components/DateRangeFilter';

export type AccountingTab = 'JOURNAL' | 'PCGM' | 'BALANCE' | 'SYNTHESE' | 'FISCALITE' | 'IMMOBILISATIONS' | 'EXPORT';

interface AccountingViewProps {
  entries: JournalEntry[];
  accounts?: PlanAccount[];
  journals?: AccountingJournal[];
  assets?: FixedAsset[];
  factures?: Facture[];
  reglements?: Reglement[];
  initialTab?: AccountingTab;
  onNavigateTab?: (tab: string) => void;
  onRefresh?: () => void;
  onUpdateAccounts?: (accounts: PlanAccount[]) => void;
  onCreateEntry?: () => void;
  onEditEntry?: (entry: JournalEntry) => void;
  onCreateAsset?: () => void;
  onEditAsset?: (asset: FixedAsset) => void;
}

export function AccountingView({
  entries = [],
  accounts = OFFICIAL_PCGM_ACCOUNTS,
  journals = MOROCCAN_JOURNALS,
  assets = [],
  factures = [],
  reglements = [],
  initialTab = 'JOURNAL',
  onNavigateTab,
  onRefresh,
  onUpdateAccounts,
  onCreateEntry,
  onEditEntry,
  onCreateAsset,
  onEditAsset,
}: AccountingViewProps) {
  const [currentTab, setCurrentTab] = useState<AccountingTab>(initialTab || 'JOURNAL');
  const [localAccounts, setLocalAccounts] = useState<PlanAccount[]>(accounts);

  useEffect(() => {
    setLocalAccounts(accounts);
  }, [accounts]);

  useEffect(() => {
    if (initialTab && initialTab !== currentTab) {
      setCurrentTab(initialTab);
    }
  }, [initialTab]);

  const handleTabChange = (newTab: AccountingTab) => {
    setCurrentTab(newTab);
    if (onNavigateTab) {
      const tabMap: Record<AccountingTab, string> = {
        JOURNAL: 'accounting-journal',
        PCGM: 'accounting-pcgm',
        BALANCE: 'accounting-balance',
        SYNTHESE: 'accounting-cpc',
        FISCALITE: 'accounting-fiscalite',
        IMMOBILISATIONS: 'accounting-assets',
        EXPORT: 'accounting-export',
      };
      onNavigateTab(tabMap[newTab] || 'accounting');
    }
  };
  const [selectedJournal, setSelectedJournal] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [pcgmClasse, setPcgmClasse] = useState<number>(1);
  const [pcgmSearch, setPcgmSearch] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Date and KPI popups
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [showDatePopup, setShowDatePopup] = useState<boolean>(false);
  const [showKpiPopup, setShowKpiPopup] = useState<boolean>(false);
  const datePopoverRef = React.useRef<HTMLDivElement>(null);
  const kpiPopoverRef = React.useRef<HTMLDivElement>(null);

  // Plan Comptable Edit Modal State
  const [showAccountModal, setShowAccountModal] = useState<boolean>(false);
  const [editingAccount, setEditingAccount] = useState<PlanAccount | null>(null);
  const [accountCode, setAccountCode] = useState<string>('');
  const [accountLibelle, setAccountLibelle] = useState<string>('');
  const [accountLibelleAr, setAccountLibelleAr] = useState<string>('');
  const [accountClasse, setAccountClasse] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1);
  const [accountType, setAccountType] = useState<AccountType>('asset');

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (datePopoverRef.current && !datePopoverRef.current.contains(e.target as Node)) {
        setShowDatePopup(false);
      }
      if (kpiPopoverRef.current && !kpiPopoverRef.current.contains(e.target as Node)) {
        setShowKpiPopup(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openNewAccountModal = () => {
    setEditingAccount(null);
    setAccountCode(`${pcgmClasse}111`);
    setAccountLibelle('');
    setAccountLibelleAr('');
    setAccountClasse(pcgmClasse as any);
    setAccountType(
      pcgmClasse === 1 || pcgmClasse === 4 ? 'liability' : pcgmClasse === 6 ? 'expense' : pcgmClasse === 7 ? 'revenue' : 'asset'
    );
    setShowAccountModal(true);
  };

  const openEditAccountModal = (acc: PlanAccount) => {
    setEditingAccount(acc);
    setAccountCode(acc.code);
    setAccountLibelle(acc.libelle);
    setAccountLibelleAr(acc.libelle_ar || '');
    setAccountClasse(acc.classe);
    setAccountType(acc.type);
    setShowAccountModal(true);
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountCode.trim() || !accountLibelle.trim()) return;

    let updated: PlanAccount[];
    if (editingAccount) {
      updated = localAccounts.map((a) =>
        a.code === editingAccount.code
          ? {
              ...a,
              code: accountCode.trim(),
              libelle: accountLibelle.trim(),
              libelle_ar: accountLibelleAr.trim() || undefined,
              classe: accountClasse,
              type: accountType,
            }
          : a
      );
    } else {
      const exists = localAccounts.some((a) => a.code === accountCode.trim());
      if (exists) {
        alert(`Le compte ${accountCode.trim()} existe déjà.`);
        return;
      }
      const newAcc: PlanAccount = {
        code: accountCode.trim(),
        libelle: accountLibelle.trim(),
        libelle_ar: accountLibelleAr.trim() || undefined,
        classe: accountClasse,
        type: accountType,
        allow_entry: true,
      };
      updated = [...localAccounts, newAcc].sort((a, b) => a.code.localeCompare(b.code));
    }
    setLocalAccounts(updated);
    if (onUpdateAccounts) onUpdateAccounts(updated);
    setShowAccountModal(false);
  };

  const handleDeleteAccount = (code: string) => {
    if (confirm(`Confirmer la suppression du compte ${code} ?`)) {
      const updated = localAccounts.filter((a) => a.code !== code);
      setLocalAccounts(updated);
      if (onUpdateAccounts) onUpdateAccounts(updated);
    }
  };

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
      
      const docDate = e.date ? e.date.slice(0, 10) : '';
      const matchDateStart = !filterStartDate || docDate >= filterStartDate;
      const matchDateEnd = !filterEndDate || docDate <= filterEndDate;

      return matchJournal && matchSearch && matchDateStart && matchDateEnd;
    });
  }, [entries, selectedJournal, searchTerm, filterStartDate, filterEndDate]);

  // Filtered PCGM Accounts
  const filteredAccounts = useMemo(() => {
    return localAccounts.filter(a => {
      const matchClasse = a.classe === pcgmClasse;
      const matchSearch = !pcgmSearch ||
        a.code.includes(pcgmSearch) ||
        a.libelle.toLowerCase().includes(pcgmSearch.toLowerCase()) ||
        (a.libelle_ar && a.libelle_ar.includes(pcgmSearch));
      return matchClasse && matchSearch;
    });
  }, [localAccounts, pcgmClasse, pcgmSearch]);

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
      source_type: 'manuel',
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
    <div className="space-y-4">
      {/* Top Unified Accounting Toolbar */}
      <div className="bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Title + Multi-page Sub-Tabs */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-indigo-600 shrink-0" />
            <h2 className="text-sm font-bold text-slate-900 tracking-tight whitespace-nowrap">
              Comptabilité (PCGM)
            </h2>
          </div>

          <div className="h-4 w-px bg-slate-200" />

          {/* Quick Sub-page Pills */}
          <div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar">
            {[
              { id: 'JOURNAL', label: 'Journal', icon: BookOpen },
              { id: 'PCGM', label: 'Plan PCGM', icon: Layers },
              { id: 'BALANCE', label: 'Balance', icon: Scale },
              { id: 'SYNTHESE', label: 'Bilan / CPC', icon: FileSpreadsheet },
              { id: 'IMMOBILISATIONS', label: 'Immobilisations', icon: TrendingUp },
              { id: 'FISCALITE', label: 'Fiscalité', icon: Building },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id as AccountingTab)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Popover Buttons: Période & KPIs */}
          <div className="flex items-center gap-1.5">
            {/* DATE / PERIODE POPUP */}
            <div className="relative" ref={datePopoverRef}>
              <button
                type="button"
                onClick={() => {
                  setShowDatePopup((prev) => !prev);
                  setShowKpiPopup(false);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border transition shadow-2xs ${
                  filterStartDate || filterEndDate
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span className="truncate max-w-[150px]">
                  {filterStartDate && filterEndDate ? `${formatDate(filterStartDate)} - ${formatDate(filterEndDate)}` : 'Période'}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showDatePopup && (
                <div className="absolute left-0 mt-2 z-50 bg-white rounded-xl border border-slate-200 shadow-xl p-3.5 w-auto min-w-[320px] animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                      Période comptable
                    </span>
                    {(filterStartDate || filterEndDate) && (
                      <button
                        type="button"
                        onClick={() => {
                          setFilterStartDate('');
                          setFilterEndDate('');
                        }}
                        className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold"
                      >
                        Effacer
                      </button>
                    )}
                  </div>
                  <DateRangeFilter
                    startDate={filterStartDate}
                    endDate={filterEndDate}
                    onDateChange={(start, end) => {
                      setFilterStartDate(start);
                      setFilterEndDate(end);
                    }}
                    variant="indigo"
                  />
                  <div className="pt-2 mt-2 border-t border-slate-100 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowDatePopup(false)}
                      className="px-3 py-1 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 shadow-xs"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* FINANCIAL KPIS POPUP */}
            <div className="relative" ref={kpiPopoverRef}>
              <button
                type="button"
                onClick={() => {
                  setShowKpiPopup((prev) => !prev);
                  setShowDatePopup(false);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border transition shadow-2xs ${
                  ecartBalance === 0
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-rose-50 border-rose-300 text-rose-800'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                <span>
                  {ecartBalance === 0 ? 'Équilibré (0.00)' : `Écart: ${formatCurrency(ecartBalance)}`}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showKpiPopup && (
                <div className="absolute left-0 mt-2 z-50 bg-white rounded-xl border border-slate-200 shadow-xl p-3.5 w-[300px] space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-xs font-bold text-slate-800">Indicateurs Financiers</span>
                    <button
                      type="button"
                      onClick={() => setShowKpiPopup(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Débit</span>
                      <span className="font-mono font-bold text-slate-900">{formatCurrency(totalDebitAll)}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Crédit</span>
                      <span className="font-mono font-bold text-slate-900">{formatCurrency(totalCreditAll)}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 col-span-2 flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Résultat Net :</span>
                      <span className={`font-mono font-bold ${cpc.resultat_net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatCurrency(cpc.resultat_net)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncOperational}
            disabled={isSyncing}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-lg text-xs font-medium transition shadow-2xs disabled:opacity-50"
            title="Synchroniser"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-600' : ''}`} />
            <span className="hidden xl:inline">Synchroniser</span>
          </button>

          {currentTab === 'PCGM' ? (
            <button
              onClick={openNewAccountModal}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Compte</span>
            </button>
          ) : currentTab === 'IMMOBILISATIONS' ? (
            <button
              onClick={() => (onCreateAsset ? onCreateAsset() : setShowAssetModal(true))}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Immobilisation</span>
            </button>
          ) : (
            <button
              onClick={() => (onCreateEntry ? onCreateEntry() : setShowEntryModal(true))}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Écriture</span>
            </button>
          )}
        </div>
      </div>

      {syncFeedback && (
        <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-700 text-xs flex items-center justify-between">
          <span>{syncFeedback}</span>
          <button onClick={() => setSyncFeedback(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* TAB 1: JOURNAL & GRAND LIVRE */}
      {currentTab === 'JOURNAL' && (
        <div className="space-y-2.5">
          {/* Streamlined Filter Bar */}
          <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Journal:</span>
              {['ALL', 'VTE', 'ACH', 'BNQ', 'CA', 'OD', 'PAIE', 'IMM'].map(j => (
                <button
                  key={j}
                  onClick={() => setSelectedJournal(j)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                    selectedJournal === j
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {j === 'ALL' ? 'Tous' : j}
                </button>
              ))}
            </div>

            <div className="relative w-48">
              <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher libellé, réf..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-7 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
              />
            </div>
            <div className="text-xs text-slate-500 font-medium">
              {filteredEntries.length} écriture(s)
            </div>
          </div>

          {/* Journal Entries List Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-semibold divide-x divide-slate-200 border-b border-slate-200 text-xs sticky top-0 z-10">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Journal</th>
                    <th className="py-2.5 px-3">N° Pièce / Réf</th>
                    <th className="py-2.5 px-3">Libellé de l'Écriture</th>
                    <th className="py-2.5 px-3">Imputations Comptables (Débit / Crédit)</th>
                    <th className="py-2.5 px-3 text-right">Débit (DH)</th>
                    <th className="py-2.5 px-3 text-right">Crédit (DH)</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
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
                      <tr key={entry.id || entry.numero} className="hover:bg-blue-50/40 transition divide-x divide-slate-200 border-b border-slate-200">
                        <td className="py-2.5 px-3 text-xs font-medium text-slate-600 whitespace-nowrap">
                          {formatDate(entry.date)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 text-xs font-bold rounded bg-slate-100 text-slate-700">
                            {entry.journal_code}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            onClick={() => onEditEntry && onEditEntry(entry)}
                            className="font-mono text-xs font-medium text-blue-600 hover:text-blue-800 underline cursor-pointer"
                          >
                            {entry.numero}
                          </span>
                          {entry.reference && (
                            <span className="block text-[11px] text-slate-400 font-mono">
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
                              type="button"
                              onClick={() => setViewingEntry(entry)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition"
                              title="Voir détail de l'écriture"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onEditEntry && onEditEntry(entry)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition"
                              title="Modifier cette écriture"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
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
        <div className="space-y-2.5">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
            {/* Class Selector 1 to 7 */}
            <div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar">
              {[
                { cl: 1, label: 'Cl. 1 : Financement' },
                { cl: 2, label: 'Cl. 2 : Actif Immob.' },
                { cl: 3, label: 'Cl. 3 : Actif Circ.' },
                { cl: 4, label: 'Cl. 4 : Passif Circ.' },
                { cl: 5, label: 'Cl. 5 : Trésorerie' },
                { cl: 6, label: 'Cl. 6 : Charges' },
                { cl: 7, label: 'Cl. 7 : Produits' },
              ].map(item => (
                <button
                  key={item.cl}
                  onClick={() => setPcgmClasse(item.cl)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap border ${
                    pcgmClasse === item.cl
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-48">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filtrer comptes..."
                  value={pcgmSearch}
                  onChange={(e) => setPcgmSearch(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <button
                type="button"
                onClick={openNewAccountModal}
                className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Compte</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-semibold divide-x divide-slate-200 border-b border-slate-200 text-xs sticky top-0 z-10">
                  <th className="py-2.5 px-3 w-28">N° Compte</th>
                  <th className="py-2.5 px-3">Intitulé Officiel (Français)</th>
                  <th className="py-2.5 px-3 text-right font-arabic">الاسم المحاسبي (العربية)</th>
                  <th className="py-2.5 px-3 w-28">Classe</th>
                  <th className="py-2.5 px-3 w-28">Type</th>
                  <th className="py-2.5 px-3 text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredAccounts.map(acc => (
                  <tr key={acc.code} className="hover:bg-blue-50/40 transition divide-x divide-slate-200 border-b border-slate-200">
                    <td className="py-2.5 px-3 font-mono font-medium text-blue-600">
                      {acc.code}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {acc.libelle}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-500 font-arabic text-xs" dir="rtl">
                      {acc.libelle_ar || '-'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                        Classe {acc.classe}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-[11px] capitalize text-slate-500 font-mono">
                        {acc.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEditAccountModal(acc)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Modifier ce compte"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAccount(acc.code)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                          title="Supprimer ce compte"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-semibold divide-x divide-slate-200 border-b border-slate-200 text-xs sticky top-0 z-10">
                  <th className="py-2.5 px-3 w-28">N° Compte</th>
                  <th className="py-2.5 px-3">Intitulé du Compte</th>
                  <th className="py-2.5 px-3 text-right">Cumul Débit</th>
                  <th className="py-2.5 px-3 text-right">Cumul Crédit</th>
                  <th className="py-2.5 px-3 text-right">Solde Débiteur</th>
                  <th className="py-2.5 px-3 text-right">Solde Créditeur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {balanceList.map(b => (
                  <tr key={b.code} className="hover:bg-blue-50/40 transition divide-x divide-slate-200 border-b border-slate-200">
                    <td className="py-2.5 px-3 font-mono font-medium text-blue-600">
                      {b.code}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {b.libelle}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-900">
                      {b.total_debit > 0 ? formatCurrency(b.total_debit) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-900">
                      {b.total_credit > 0 ? formatCurrency(b.total_credit) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                      {b.solde_debit > 0 ? formatCurrency(b.solde_debit) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-700">
                      {b.solde_credit > 0 ? formatCurrency(b.solde_credit) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-bold text-xs divide-x divide-slate-200 border-t-2 border-slate-300">
                  <td colSpan={2} className="py-2.5 px-3 uppercase text-slate-800">
                    TOTAUX GÉNÉRAUX DE LA BALANCE
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-900">
                    {formatCurrency(balanceList.reduce((s, b) => s + b.total_debit, 0))}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-900">
                    {formatCurrency(balanceList.reduce((s, b) => s + b.total_credit, 0))}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                    {formatCurrency(balanceList.reduce((s, b) => s + b.solde_debit, 0))}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-blue-700">
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
              onClick={() => (onCreateAsset ? onCreateAsset() : setShowAssetModal(true))}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition"
            >
              <Plus className="w-4 h-4" />
              Ajouter Immobilisation
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-semibold divide-x divide-slate-200 border-b border-slate-200 text-xs sticky top-0 z-10">
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Désignation</th>
                  <th className="py-2.5 px-3">Date Acq.</th>
                  <th className="py-2.5 px-3 text-right">Valeur d'Acquisition</th>
                  <th className="py-2.5 px-3 text-center">Durée / Taux</th>
                  <th className="py-2.5 px-3 text-right">Amort. Cumulés</th>
                  <th className="py-2.5 px-3 text-right">VNA (Valeur Nette)</th>
                  <th className="py-2.5 px-3 text-center">Statut</th>
                  <th className="py-2.5 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {assets.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      Aucune immobilisation enregistrée. Cliquez sur « Ajouter Immobilisation ».
                    </td>
                  </tr>
                ) : (
                  assets.map(asset => (
                    <tr key={asset.id || asset.code} className="hover:bg-blue-50/40 transition divide-x divide-slate-200 border-b border-slate-200">
                      <td
                        className="py-2.5 px-3 font-mono font-medium text-blue-600 hover:text-blue-800 underline cursor-pointer"
                        onClick={() => onEditAsset && onEditAsset(asset)}
                      >
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
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEditAsset && onEditAsset(asset)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition"
                            title="Modifier cette immobilisation"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm(`Supprimer définitivement l'immobilisation ${asset.code} (${asset.designation}) ?`)) {
                                if (asset.id) await deleteFixedAsset(asset.id);
                                if (onRefresh) onRefresh();
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition"
                            title="Supprimer cette immobilisation"
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
                    onChange={(e) => setNewEntry({ ...newEntry, journal_code: e.target.value as any })}
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
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-xs border-b border-slate-200 divide-x divide-slate-200">
                  <tr>
                    <th className="p-2.5">Compte</th>
                    <th className="p-2.5">Libellé du compte</th>
                    <th className="p-2.5 text-right">Débit</th>
                    <th className="p-2.5 text-right">Crédit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 divide-x divide-slate-100 bg-white">
                  {viewingEntry.lines?.map((line, i) => (
                    <tr key={i} className="hover:bg-slate-50/80">
                      <td className="p-2.5 font-mono font-bold text-blue-600">{line.compte_code || line.account_code}</td>
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

      {/* Account Add/Edit Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                {editingAccount ? `Modifier Compte ${editingAccount.code}` : 'Ajouter un Compte PCGM'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAccountModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Numéro de Compte (Code)</label>
                <input
                  type="text"
                  required
                  value={accountCode}
                  onChange={(e) => setAccountCode(e.target.value)}
                  placeholder="Ex: 61111"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Intitulé Officiel (Français)</label>
                <input
                  type="text"
                  required
                  value={accountLibelle}
                  onChange={(e) => setAccountLibelle(e.target.value)}
                  placeholder="Ex: Achats de matières consommables"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Intitulé en Arabe (Optionnel)</label>
                <input
                  type="text"
                  dir="rtl"
                  value={accountLibelleAr}
                  onChange={(e) => setAccountLibelleAr(e.target.value)}
                  placeholder="الاسم المحاسبي..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-right font-arabic focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Classe PCGM</label>
                  <select
                    value={accountClasse}
                    onChange={(e) => setAccountClasse(Number(e.target.value) as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={1}>Classe 1 - Financement</option>
                    <option value={2}>Classe 2 - Actif Immob.</option>
                    <option value={3}>Classe 3 - Actif Circulant</option>
                    <option value={4}>Classe 4 - Passif Circulant</option>
                    <option value={5}>Classe 5 - Trésorerie</option>
                    <option value={6}>Classe 6 - Charges</option>
                    <option value={7}>Classe 7 - Produits</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nature / Type</label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="asset">Actif</option>
                    <option value="liability">Passif</option>
                    <option value="equity">Capitaux Propres</option>
                    <option value="expense">Charge</option>
                    <option value="revenue">Produit</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
                >
                  {editingAccount ? 'Mettre à jour' : 'Enregistrer le compte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
