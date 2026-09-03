'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Facture, CompanyInfo, DocumentState } from '@/lib/types';
import { compareDocumentNumbersDesc, formatCurrency, formatDate, getCurrentYearDateRange, toNumeric } from '@/lib/utils';
import { generateFacturePdf } from '@/lib/pdf-generator';
import { TablePagination } from '@/components/TablePagination';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import {
  Plus,
  Printer,
  Trash2,
  Eye,
  Edit,
  CreditCard,
  CheckCircle2,
  Clock,
  Ban,
  RotateCcw,
  AlertCircle,
  FileText,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Search,
  X,
} from 'lucide-react';

interface FacturesViewProps {
  factures: Facture[];
  company: CompanyInfo;
  isLoading?: boolean;
  onRefresh?: () => void;
  onOpenNewFacture: () => void;
  onOpenBatchInvoicing: () => void;
  onEditFacture?: (facture: Facture) => void;
  onOpenPaymentModal: (facture: Facture) => void;
  onViewFacture: (facture: Facture) => void;
  onDeleteFacture: (id: number) => void;
  onUpdateFactureState?: (id: number, newState: DocumentState) => Promise<void>;
}

export const FacturesView: React.FC<FacturesViewProps> = ({
  factures,
  company,
  isLoading = false,
  onRefresh,
  onOpenNewFacture,
  onOpenBatchInvoicing,
  onEditFacture,
  onOpenPaymentModal,
  onViewFacture,
  onDeleteFacture,
  onUpdateFactureState,
}) => {
  // Filters
  const [filterNum, setFilterNum] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterStartDate, setFilterStartDate] = useState(() => getCurrentYearDateRange().start);
  const [filterEndDate, setFilterEndDate] = useState(() => getCurrentYearDateRange().end);
  const [filterSociete, setFilterSociete] = useState('');
  const [filterEtat, setFilterEtat] = useState<'ALL' | 'VALIDE' | 'BROUILLON' | 'ANNULE'>('ALL');
  const [filterStatutPaiement, setFilterStatutPaiement] = useState<'ALL' | 'SOLDE' | 'PARTIEL' | 'IMPAYE'>('ALL');
  const [selectedFactureId, setSelectedFactureId] = useState<number | null>(null);
  const [showMobileKpiDetails, setShowMobileKpiDetails] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterEtat, filterStatutPaiement, filterNum, filterDate, filterStartDate, filterEndDate, filterSociete]);

  const filteredFactures = useMemo(() => {
    return factures.filter((f) => {
      const etat: DocumentState = f.etat || 'Validé';
      if (filterEtat === 'VALIDE' && etat !== 'Validé') return false;
      if (filterEtat === 'BROUILLON' && etat !== 'Brouillon') return false;
      if (filterEtat === 'ANNULE' && etat !== 'Annulé') return false;

      if (filterStatutPaiement !== 'ALL') {
        if (filterStatutPaiement === 'SOLDE' && f.statut_paiement !== 'Soldé') return false;
        if (filterStatutPaiement === 'IMPAYE' && f.statut_paiement !== 'Impayé') return false;
        if (filterStatutPaiement === 'PARTIEL' && f.statut_paiement !== 'Partiel') return false;
      }

      if (filterNum && !f.numero.toLowerCase().includes(filterNum.toLowerCase())) return false;
      if (filterDate && !f.date.includes(filterDate)) return false;

      // Date Range Filter
      const docDate = f.date ? f.date.slice(0, 10) : '';
      if (filterStartDate && docDate < filterStartDate) return false;
      if (filterEndDate && docDate > filterEndDate) return false;

      if (filterSociete && !f.client_nom.toLowerCase().includes(filterSociete.toLowerCase())) return false;

      return true;
    }).sort((a, b) =>
      compareDocumentNumbersDesc(a.numero, b.numero) ||
      (a.client_nom || '').localeCompare(b.client_nom || '', 'fr', { sensitivity: 'base' }) ||
      new Date(b.date).getTime() - new Date(a.date).getTime() ||
      b.id - a.id
    );
  }, [factures, filterEtat, filterStatutPaiement, filterNum, filterDate, filterStartDate, filterEndDate, filterSociete]);

  const paginatedFactures = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredFactures.slice(start, start + pageSize);
  }, [filteredFactures, currentPage, pageSize]);

  // Totals calculations
  const totals = useMemo(() => {
    return filteredFactures.reduce(
      (acc, f) => {
        acc.totalHt += toNumeric(f.total_ht);
        acc.tva20 += toNumeric(f.tva_20);
        acc.tva10 += toNumeric(f.tva_10);
        acc.totalTva += toNumeric(f.total_tva);
        acc.totalTtc += toNumeric(f.total_ttc);
        acc.montantRegle += toNumeric(f.montant_regle);
        acc.restePayer += toNumeric(f.reste_a_payer);
        return acc;
      },
      { totalHt: 0, tva20: 0, tva10: 0, totalTva: 0, totalTtc: 0, montantRegle: 0, restePayer: 0 }
    );
  }, [filteredFactures]);

  const totalLines = useMemo(
    () => filteredFactures.reduce((count, facture) => count + (facture.lignes?.length || 0), 0),
    [filteredFactures]
  );

  const counts = useMemo(() => {
    return {
      all: factures.length,
      valide: factures.filter((f) => (f.etat || 'Validé') === 'Validé').length,
      brouillon: factures.filter((f) => f.etat === 'Brouillon').length,
      annule: factures.filter((f) => f.etat === 'Annulé').length,
      solde: factures.filter((f) => f.statut_paiement === 'Soldé').length,
      partiel: factures.filter((f) => f.statut_paiement === 'Partiel').length,
      impaye: factures.filter((f) => f.statut_paiement === 'Impayé').length,
    };
  }, [factures]);

  return (
    <div className="space-y-4">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER (Compact on mobile, full on desktop) */}
      {/* ========================================================================= */}
      {/* Mobile Top Header (sm:hidden) */}
      <div className="flex items-center justify-between gap-2 p-3 bg-white rounded-xl border border-slate-200 shadow-xs sm:hidden">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-5 h-5 text-blue-600 shrink-0" />
          <div className="min-w-0">
            <h2 className="font-bold text-slate-900 text-sm truncate flex items-center gap-1.5">
              Factures
              <span className="text-[11px] font-semibold px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {filteredFactures.length}
              </span>
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 transition active:scale-95 disabled:opacity-50"
              title="Actualiser"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          )}
          <button
            onClick={onOpenBatchInvoicing}
            className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition active:scale-95"
            title="Facturation en lot"
          >
            🔄 Lots
          </button>
          <button
            onClick={onOpenNewFacture}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition shadow-xs active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Facture</span>
          </button>
        </div>
      </div>

      {/* Desktop Top Header (hidden sm:flex) */}
      <div className="hidden sm:flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Liste des Factures Clients (2026)
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {filteredFactures.length} factures • {totalLines} lignes
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestion du cycle de vie en 3 états (Brouillon, Validé, Annulé), TVA marocaine, encaissements et restes à payer
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 transition shadow-xs disabled:opacity-50"
              title="Recharger les factures"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
              <span>Actualiser</span>
            </button>
          )}
          <button
            onClick={onOpenBatchInvoicing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition shadow-xs"
          >
            🔄 Facturer des BLs en lot
          </button>
          <button
            onClick={onOpenNewFacture}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition shadow-xs active:scale-95"
          >
            <Plus className="w-4 h-4" />
            + Ajouter une Facture
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. FINANCIAL SUMMARY: REPLIABLE MINI-BAR ON MOBILE (md:hidden) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden md:hidden">
        {/* Compact summary bar */}
        <button
          type="button"
          onClick={() => setShowMobileKpiDetails(!showMobileKpiDetails)}
          className="w-full px-3 py-2.5 flex items-center justify-between text-xs bg-gradient-to-r from-slate-50 via-white to-slate-50 hover:bg-slate-100/70 transition"
        >
          <div className="flex items-center gap-2 font-mono flex-wrap">
            <span className="text-slate-500 font-sans text-[11px]">Facturé:</span>
            <span className="font-bold text-slate-900">{formatCurrency(totals.totalTtc)}</span>
            <span className="text-slate-300">•</span>
            <span className="text-rose-600 font-sans text-[11px]">Reste:</span>
            <span className="font-bold text-rose-700">{formatCurrency(totals.restePayer)}</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-blue-600 font-semibold shrink-0">
            <span>{showMobileKpiDetails ? 'Moins' : 'Détails'}</span>
            {showMobileKpiDetails ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </div>
        </button>

        {/* Expanded detail cards */}
        {showMobileKpiDetails && (
          <div className="p-2.5 border-t border-slate-100 grid grid-cols-2 gap-2 bg-slate-50/70 animate-in fade-in duration-150">
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-emerald-600">Total Encaissé</span>
              <div className="text-xs font-mono font-black text-emerald-700 mt-0.5">
                {formatCurrency(totals.montantRegle)}
              </div>
              <span className="text-[10px] text-emerald-600 font-medium">
                {totals.totalTtc > 0 ? ((totals.montantRegle / totals.totalTtc) * 100).toFixed(0) : '0'}% recouvré
              </span>
            </div>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total HT & TVA</span>
              <div className="text-xs font-mono font-bold text-slate-700 mt-0.5">
                HT: {formatCurrency(totals.totalHt, false)}
              </div>
              <div className="text-[10px] font-mono text-slate-500">
                TVA: {formatCurrency(totals.totalTva, false)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. MOBILE SEARCH & QUICK FILTER CHIPS (md:hidden) */}
      {/* ========================================================================= */}
      <div className="space-y-2 md:hidden">
        {/* Search input + Filter toggle button */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher N°, Client..."
              value={filterNum || filterSociete}
              onChange={(e) => {
                setFilterNum(e.target.value);
                setFilterSociete(e.target.value);
              }}
              className="w-full pl-8 pr-7 py-2 text-xs bg-white text-slate-800 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
            />
            {(filterNum || filterSociete) && (
              <button
                type="button"
                onClick={() => {
                  setFilterNum('');
                  setFilterSociete('');
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition shadow-xs shrink-0 ${
              showMobileFilters || filterStartDate || filterEndDate
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filtres</span>
            {(filterStartDate || filterEndDate) && (
              <span className="w-2 h-2 rounded-full bg-blue-600" />
            )}
          </button>
        </div>

        {/* 1-Tap horizontal filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 text-xs whitespace-nowrap">
          <button
            onClick={() => {
              setFilterEtat('ALL');
              setFilterStatutPaiement('ALL');
            }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition shrink-0 ${
              filterEtat === 'ALL' && filterStatutPaiement === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Toutes ({counts.all})
          </button>
          <button
            onClick={() => {
              setFilterEtat('VALIDE');
              setFilterStatutPaiement('IMPAYE');
            }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition shrink-0 flex items-center gap-1 ${
              filterStatutPaiement === 'IMPAYE'
                ? 'bg-rose-600 text-white shadow-xs font-bold'
                : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
            }`}
          >
            🔴 Impayées ({counts.impaye})
          </button>
          <button
            onClick={() => {
              setFilterEtat('VALIDE');
              setFilterStatutPaiement('PARTIEL');
            }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition shrink-0 flex items-center gap-1 ${
              filterStatutPaiement === 'PARTIEL'
                ? 'bg-purple-600 text-white shadow-xs font-bold'
                : 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-50'
            }`}
          >
            Partielles ({counts.partiel})
          </button>
          <button
            onClick={() => {
              setFilterEtat('VALIDE');
              setFilterStatutPaiement('SOLDE');
            }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition shrink-0 flex items-center gap-1 ${
              filterStatutPaiement === 'SOLDE'
                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
            }`}
          >
            Soldées ({counts.solde})
          </button>
          <button
            onClick={() => {
              setFilterEtat('BROUILLON');
              setFilterStatutPaiement('ALL');
            }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition shrink-0 flex items-center gap-1 ${
              filterEtat === 'BROUILLON'
                ? 'bg-slate-700 text-white shadow-xs font-bold'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            Brouillons ({counts.brouillon})
          </button>
        </div>

        {/* Expandable Mobile Date Filter Sheet */}
        {showMobileFilters && (
          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 border-b border-slate-100 pb-1.5">
              <span>Filtrer par date</span>
              <button
                onClick={() => setShowMobileFilters(false)}
                className="text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <DateRangeFilter
              startDate={filterStartDate}
              endDate={filterEndDate}
              onDateChange={(start, end) => {
                setFilterStartDate(start);
                setFilterEndDate(end);
              }}
              variant="blue"
            />
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. DESKTOP FILTER BAR (Full WinDev layout - hidden md:flex) */}
      {/* ========================================================================= */}
      <div className="hidden md:flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center gap-2.5">
          {/* State tabs */}
          <div className="flex items-center gap-1.5 text-xs overflow-x-auto pb-1 md:pb-0 no-scrollbar whitespace-nowrap">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">État :</span>
            <button
              onClick={() => setFilterEtat('ALL')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition shrink-0 ${
                filterEtat === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Toutes ({counts.all})
            </button>
            <button
              onClick={() => setFilterEtat('VALIDE')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition flex items-center gap-1 shrink-0 ${
                filterEtat === 'VALIDE'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Validées ({counts.valide})
            </button>
            <button
              onClick={() => setFilterEtat('BROUILLON')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition flex items-center gap-1 shrink-0 ${
                filterEtat === 'BROUILLON'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Brouillons ({counts.brouillon})
            </button>
            <button
              onClick={() => setFilterEtat('ANNULE')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition flex items-center gap-1 shrink-0 ${
                filterEtat === 'ANNULE'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'
              }`}
            >
              <Ban className="w-3.5 h-3.5" />
              Annulées ({counts.annule})
            </button>
          </div>

          {/* Payment tabs */}
          <div className="flex items-center gap-1 text-xs border-t md:border-t-0 md:border-l border-slate-200 pt-2 md:pt-0 md:pl-3 overflow-x-auto pb-1 md:pb-0 no-scrollbar whitespace-nowrap">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">Règlement :</span>
            <button
              onClick={() => setFilterStatutPaiement('ALL')}
              className={`px-2 py-1 rounded text-xs transition shrink-0 ${
                filterStatutPaiement === 'ALL'
                  ? 'bg-blue-100 text-blue-800 font-bold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setFilterStatutPaiement('SOLDE')}
              className={`px-2 py-1 rounded text-xs transition shrink-0 ${
                filterStatutPaiement === 'SOLDE'
                  ? 'bg-emerald-100 text-emerald-800 font-bold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Soldées ({counts.solde})
            </button>
            <button
              onClick={() => setFilterStatutPaiement('PARTIEL')}
              className={`px-2 py-1 rounded text-xs transition shrink-0 ${
                filterStatutPaiement === 'PARTIEL'
                  ? 'bg-purple-100 text-purple-800 font-bold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Partielles ({counts.partiel})
            </button>
            <button
              onClick={() => setFilterStatutPaiement('IMPAYE')}
              className={`px-2 py-1 rounded text-xs transition shrink-0 ${
                filterStatutPaiement === 'IMPAYE'
                  ? 'bg-rose-100 text-rose-800 font-bold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Impayées ({counts.impaye})
            </button>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="flex items-center">
          <DateRangeFilter
            startDate={filterStartDate}
            endDate={filterEndDate}
            onDateChange={(start, end) => {
              setFilterStartDate(start);
              setFilterEndDate(end);
            }}
            variant="blue"
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. MOBILE CARD LIST (Smartphone View - block md:hidden) */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-3">
        {isLoading ? (
          <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
            <span className="text-sm font-medium text-slate-700">Chargement des factures...</span>
          </div>
        ) : filteredFactures.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400 text-sm">
            Aucune facture ne correspond aux critères de recherche.
          </div>
        ) : (
          paginatedFactures.map((facture) => {
            const isSelected = selectedFactureId === facture.id;
            const etat: DocumentState = facture.etat || 'Validé';
            const isValide = etat === 'Validé';
            const isBrouillon = etat === 'Brouillon';
            const isAnnule = etat === 'Annulé';
            const isSolde = facture.statut_paiement === 'Soldé';
            const isPartiel = facture.statut_paiement === 'Partiel';
            const isUnpaid = toNumeric(facture.montant_regle) <= 0.009;

            return (
              <div
                key={facture.id}
                className={`bg-white rounded-xl border transition shadow-xs overflow-hidden ${
                  isAnnule
                    ? 'border-rose-200 bg-rose-50/10'
                    : isBrouillon
                    ? 'border-slate-300 bg-slate-50/40'
                    : isSelected
                    ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20'
                    : 'border-slate-200 hover:border-blue-300'
                }`}
              >
                {/* Mobile Card Top Bar */}
                <div className="p-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-mono font-bold text-sm text-slate-900 ${isAnnule ? 'line-through text-slate-400' : ''}`}>
                        {facture.numero}
                      </span>
                      {facture.bl_associes && facture.bl_associes.length > 0 && (
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                          {facture.bl_associes.length} BLs liés
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {formatDate(facture.date)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* État */}
                    {isValide && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Validée
                      </span>
                    )}
                    {isBrouillon && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                        Brouillon
                      </span>
                    )}
                    {isAnnule && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                        Annulée
                      </span>
                    )}

                    {/* Paiement */}
                    {isValide && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          isSolde
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : isPartiel
                            ? 'bg-purple-100 text-purple-800 border-purple-300'
                            : 'bg-rose-100 text-rose-800 border-rose-300'
                        }`}
                      >
                        {facture.statut_paiement || 'Impayé'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Mobile Card Body: Client Name & Financials */}
                <div
                  className="p-3.5 space-y-2 cursor-pointer active:bg-slate-50 transition"
                  onClick={() => {
                    setSelectedFactureId(facture.id);
                    onViewFacture(facture);
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Client / Société</span>
                      <div className="font-bold text-slate-900 text-sm truncate">{facture.client_nom}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Total TTC</span>
                      <div className="font-mono font-black text-slate-950 text-base">
                        {formatCurrency(facture.total_ttc)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 font-mono">
                    <div className="text-slate-500 text-[11px]">
                      HT: <span className="font-semibold text-slate-700">{formatCurrency(facture.total_ht, false)}</span> • TVA: <span className="font-semibold text-slate-700">{formatCurrency(facture.total_tva, false)}</span>
                    </div>
                    <div className="text-right">
                      {!isSolde && toNumeric(facture.reste_a_payer) > 0 ? (
                        <div className="text-rose-600 font-bold text-xs">
                          Reste: {formatCurrency(facture.reste_a_payer)}
                        </div>
                      ) : (
                        <div className="text-emerald-700 font-semibold text-xs">
                          Soldée (100%)
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mobile Card Bottom: Action Buttons */}
                <div className="bg-slate-50/90 px-3 py-2 border-t border-slate-100 flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFactureId(facture.id);
                        onViewFacture(facture);
                      }}
                      className="flex items-center gap-1 px-3 min-h-[36px] rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition active:scale-95 touch-manipulation"
                    >
                      <Eye className="w-4 h-4 text-blue-600" />
                      <span>Aperçu</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => generateFacturePdf(facture, company)}
                      className="flex items-center gap-1 px-2.5 min-h-[36px] rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition active:scale-95 touch-manipulation"
                      title="Télécharger PDF"
                    >
                      <Printer className="w-4 h-4 text-slate-600" />
                      <span>PDF</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Quick Encaisser Button */}
                    {isValide && !isSolde && (
                      <button
                        type="button"
                        onClick={() => onOpenPaymentModal(facture)}
                        className="flex items-center gap-1 px-2.5 min-h-[36px] rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition active:scale-95 touch-manipulation"
                        title="Encaisser"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Encaisser</span>
                      </button>
                    )}

                    {isBrouillon && onEditFacture && (
                      <button
                        type="button"
                        onClick={() => onEditFacture(facture)}
                        className="flex items-center gap-1 px-2.5 min-h-[36px] rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition active:scale-95 touch-manipulation"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Modifier</span>
                      </button>
                    )}

                    {isBrouillon && onUpdateFactureState && (
                      <button
                        type="button"
                        onClick={() => onUpdateFactureState(facture.id, 'Validé')}
                        className="min-h-[36px] px-2.5 flex items-center justify-center rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition active:scale-95 touch-manipulation"
                        title="Valider la facture"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}

                    {isUnpaid && onUpdateFactureState && (
                      <button
                        type="button"
                        onClick={() => onUpdateFactureState(facture.id, 'Annulé')}
                        className="min-h-[36px] px-2.5 flex items-center justify-center rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition active:scale-95 touch-manipulation"
                        title="Annuler la facture"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    )}

                    {isAnnule && isUnpaid && onUpdateFactureState && (
                      <button
                        type="button"
                        onClick={() => onUpdateFactureState(facture.id, 'Brouillon')}
                        className="min-h-[36px] px-2 flex items-center justify-center rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 transition active:scale-95 touch-manipulation"
                        title="Remettre en brouillon"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Voulez-vous supprimer définitivement la facture ${facture.numero} ?`)) {
                          onDeleteFacture(facture.id);
                        }
                      }}
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition active:scale-95 touch-manipulation"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. DESKTOP TABLE (hidden on mobile - hidden md:block) */}
      {/* ========================================================================= */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              {/* Header row with WinDev Blue style */}
              <tr className="bg-blue-700 text-white font-semibold divide-x divide-blue-600">
                <th className="py-2.5 px-3 min-w-[110px]">N° Facture</th>
                <th className="py-2.5 px-3 min-w-[95px]">Date</th>
                <th className="py-2.5 px-3 min-w-[180px]">Société / Client</th>
                <th className="py-2.5 px-3 text-right min-w-[90px]">Total HT</th>
                <th className="py-2.5 px-3 text-right min-w-[80px]">TVA 20%</th>
                <th className="py-2.5 px-3 text-right min-w-[80px]">TVA 10%</th>
                <th className="py-2.5 px-3 text-right min-w-[90px]">Total TVA</th>
                <th className="py-2.5 px-3 text-right min-w-[105px] font-bold">Total TTC</th>
                <th className="py-2.5 px-3 text-right min-w-[95px]">Reste à payer</th>
                <th className="py-2.5 px-3 text-right min-w-[90px]">Mtr réglé</th>
                <th className="py-2.5 px-3 text-center min-w-[95px]">État</th>
                <th className="py-2.5 px-2 text-center w-10" title="Statut paiement">P</th>
                <th className="py-2.5 px-3 text-center min-w-[140px]">Actions</th>
              </tr>
              {/* Search inputs row directly under header */}
              <tr className="bg-blue-800/90 text-slate-800 divide-x divide-blue-700">
                <th className="p-1">
                  <input
                    type="text"
                    placeholder="Filtrer N°..."
                    value={filterNum}
                    onChange={(e) => setFilterNum(e.target.value)}
                    className="w-full px-2 py-1 text-[11px] bg-white rounded border border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </th>
                <th className="p-1">
                  <input
                    type="text"
                    placeholder="YYYY-MM"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="w-full px-2 py-1 text-[11px] bg-white rounded border border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </th>
                <th className="p-1">
                  <input
                    type="text"
                    placeholder="Société..."
                    value={filterSociete}
                    onChange={(e) => setFilterSociete(e.target.value)}
                    className="w-full px-2 py-1 text-[11px] bg-white rounded border border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </th>
                <th className="p-1" colSpan={10}>
                  <div className="flex items-center justify-between text-[11px] text-blue-100 px-2 font-normal">
                    <span>{filteredFactures.length} factures affichées</span>
                    {(filterNum || filterDate || filterSociete || filterStartDate || filterEndDate) && (
                      <button
                        onClick={() => {
                          setFilterNum('');
                          setFilterDate('');
                          setFilterSociete('');
                          setFilterStartDate('');
                          setFilterEndDate('');
                        }}
                        className="text-xs text-yellow-300 hover:underline"
                      >
                        Effacer filtres
                      </button>
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={13} className="py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
                      <span className="text-sm font-medium text-slate-700">Chargement des factures à la demande...</span>
                      <span className="text-xs text-slate-400">Récupération optimisée des pièces</span>
                    </div>
                  </td>
                </tr>
              ) : filteredFactures.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400 text-sm">
                    Aucune facture ne correspond aux critères de recherche.
                  </td>
                </tr>
              ) : (
                paginatedFactures.map((facture) => {
                  const isSelected = selectedFactureId === facture.id;
                  const etat: DocumentState = facture.etat || 'Validé';
                  const isValide = etat === 'Validé';
                  const isBrouillon = etat === 'Brouillon';
                  const isAnnule = etat === 'Annulé';
                  const isSolde = facture.statut_paiement === 'Soldé';
                  const isPartiel = facture.statut_paiement === 'Partiel';
                  // A cancellation/draft must never detach an invoice that already has money recorded.
                  const isUnpaid = toNumeric(facture.montant_regle) <= 0.009;

                  return (
                    <tr
                      key={facture.id}
                      onClick={() => {
                        setSelectedFactureId(facture.id);
                        onViewFacture(facture);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedFactureId(facture.id);
                          onViewFacture(facture);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      title="Ouvrir l’aperçu de la facture"
                      className={`cursor-pointer transition hover:bg-blue-50/70 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 divide-x divide-slate-100 ${
                        isAnnule
                          ? 'bg-rose-50/30 opacity-75'
                          : isBrouillon
                          ? 'bg-slate-50/70'
                          : isSelected
                          ? 'bg-blue-100/70 font-medium'
                          : 'even:bg-slate-50/60'
                      }`}
                    >
                      <td className="py-2 px-3 font-mono font-semibold text-slate-800">
                        <span className={isAnnule ? 'line-through text-slate-400' : ''}>{facture.numero}</span>
                        {facture.bl_associes && facture.bl_associes.length > 0 && (
                          <span className="block text-[10px] text-indigo-600 font-sans">
                            {facture.bl_associes.length} BLs liés
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                        {formatDate(facture.date)}
                      </td>
                      <td className="py-2 px-3 text-slate-900 font-medium">
                        {facture.client_nom}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">
                        {formatCurrency(facture.total_ht, false)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600">
                        {facture.tva_20 > 0 ? formatCurrency(facture.tva_20, false) : '0.00'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600">
                        {facture.tva_10 > 0 ? formatCurrency(facture.tva_10, false) : '0.00'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">
                        {formatCurrency(facture.total_tva, false)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-950 bg-slate-100/50">
                        {formatCurrency(facture.total_ttc, false)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-medium text-rose-700">
                        {formatCurrency(facture.reste_a_payer, false)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-emerald-700">
                        {formatCurrency(facture.montant_regle, false)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {isValide && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            ✓ Validé
                          </span>
                        )}
                        {isBrouillon && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                            ✎ Brouillon
                          </span>
                        )}
                        {isAnnule && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-300">
                            ✗ Annulé
                          </span>
                        )}
                      </td>
                      {/* Status indicator square */}
                      <td className="py-2 px-2 text-center">
                        {isValide ? (
                          <span
                            className={`inline-block w-3.5 h-3.5 rounded-xs shadow-xs ${
                              isSolde
                                ? 'bg-emerald-500'
                                : isPartiel
                                ? 'bg-fuchsia-500'
                                : 'bg-rose-600'
                            }`}
                            title={`Statut paiement: ${facture.statut_paiement}`}
                          />
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      {/* Action buttons */}
                      <td className="py-1.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          {/* 1. If Brouillon: allow Edit, Validate, and Cancel */}
                          {isBrouillon && (
                            <>
                              {onEditFacture && (
                                <button
                                  onClick={() => onEditFacture(facture)}
                                  className="p-1 hover:bg-blue-100 text-blue-700 rounded transition"
                                  title="Modifier le Brouillon"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {onUpdateFactureState && (
                                <button
                                  onClick={() => {
                                    onUpdateFactureState(facture.id, 'Validé');
                                  }}
                                  className="p-1 hover:bg-emerald-100 text-emerald-700 rounded transition"
                                  title="Valider la Facture"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {isUnpaid && onUpdateFactureState && (
                                <button
                                  onClick={() => {
                                    onUpdateFactureState(facture.id, 'Annulé');
                                  }}
                                  className="p-1 hover:bg-rose-100 text-rose-700 rounded transition"
                                  title="Annuler la Facture"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}

                          {/* 2. A validated invoice can be cancelled only before any payment is recorded. */}
                          {isValide && (
                            <>
                              {isUnpaid && onUpdateFactureState && (
                                <button
                                  onClick={() => {
                                    onUpdateFactureState(facture.id, 'Annulé');
                                  }}
                                  className="p-1 hover:bg-amber-100 text-amber-700 rounded transition"
                                  title="Annuler la Facture (Libération des BLs/BRs)"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => onOpenPaymentModal(facture)}
                                className="p-1 hover:bg-slate-200 text-slate-600 hover:text-indigo-600 rounded transition"
                                title="Enregistrer un règlement"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          {/* 3. An unpaid cancellation can be restored as a draft, like a BL. */}
                          {isAnnule && (
                            <>
                              {isUnpaid && onUpdateFactureState && (
                                <button
                                  onClick={() => {
                                    onUpdateFactureState(facture.id, 'Brouillon');
                                  }}
                                  className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded transition"
                                  title="Remettre en brouillon pour modifier"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Brouillon</span>
                                </button>
                              )}
                            </>
                          )}

                          {/* Preview & Print */}
                          <button
                            onClick={() => onViewFacture(facture)}
                            className="p-1 hover:bg-slate-200 text-slate-600 hover:text-blue-600 rounded transition"
                            title="Aperçu document"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => generateFacturePdf(facture, company)}
                            className="p-1 hover:bg-slate-200 text-slate-600 hover:text-emerald-600 rounded transition"
                            title="Télécharger PDF"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Voulez-vous supprimer définitivement la facture ${facture.numero} ?`)) {
                                onDeleteFacture(facture.id);
                              }
                            }}
                            className="p-1 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded transition"
                            title="Supprimer définitivement"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Table Footer with Summary Bar matching WinDev screenshot */}
            <tfoot>
              <tr className="bg-slate-900 text-white font-bold divide-x divide-slate-800 text-xs">
                <td colSpan={3} className="py-2.5 px-3 text-right uppercase tracking-wider">
                  Cumul Sélection ({filteredFactures.length} Factures • {totalLines} lignes) :
                </td>
                <td className="py-2.5 px-3 text-right font-mono">
                  {formatCurrency(totals.totalHt, false)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono">
                  {formatCurrency(totals.tva20, false)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono">
                  {formatCurrency(totals.tva10, false)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono">
                  {formatCurrency(totals.totalTva, false)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-emerald-400 bg-slate-950 font-extrabold">
                  {formatCurrency(totals.totalTtc, false)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-rose-400">
                  {formatCurrency(totals.restePayer, false)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-emerald-300">
                  {formatCurrency(totals.montantRegle, false)}
                </td>
                <td colSpan={3} className="py-2.5 px-2 text-center text-[11px] font-normal text-slate-400">
                  MAD (DH)
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Shared Pagination (Works for both Mobile Cards and Desktop Table) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <TablePagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={filteredFactures.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          itemLabel="factures"
        />
      </div>
    </div>
  );
};
