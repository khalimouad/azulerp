'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { BonRetour, CompanyInfo, DocumentState } from '@/lib/types';
import { compareDocumentNumbersDesc, formatCurrency, formatDate, getCurrentYearDateRange, toNumeric } from '@/lib/utils';
import { generateBrPdf } from '@/lib/pdf-generator';
import { TablePagination } from '@/components/TablePagination';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import {
  Plus,
  Printer,
  Trash2,
  Eye,
  Edit,
  CheckSquare,
  Square,
  ArrowRight,
  RotateCcw,
  FileText,
  CheckCircle2,
  Clock,
  Ban,
  Search,
  SlidersHorizontal,
  X,
  Download,
} from 'lucide-react';
import { SortableTh } from '@/components/SortableTh';
import { TableBulkActionBar } from '@/components/TableBulkActionBar';

interface BonsRetourViewProps {
  bonsRetour: BonRetour[];
  company: CompanyInfo;
  onOpenNewBr: () => void;
  onEditBr?: (br: BonRetour) => void;
  onViewBr: (br: BonRetour) => void;
  onDeleteBr: (id: number) => void;
  onUpdateBrState?: (id: number, newState: DocumentState) => Promise<void>;
  onBatchInvoiceSelected: (brIds: number[]) => void;
}

export const BonsRetourView: React.FC<BonsRetourViewProps> = ({
  bonsRetour = [],
  company,
  onOpenNewBr,
  onEditBr,
  onViewBr,
  onDeleteBr,
  onUpdateBrState,
  onBatchInvoiceSelected,
}) => {
  const [filterStatut, setFilterStatut] = useState<'ALL' | 'VALIDE' | 'BROUILLON' | 'ANNULE' | 'ATTENTE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStartDate, setFilterStartDate] = useState(() => getCurrentYearDateRange().start);
  const [filterEndDate, setFilterEndDate] = useState(() => getCurrentYearDateRange().end);
  const [selectedBrIds, setSelectedBrIds] = useState<number[]>([]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Sorting state
  const [sortKey, setSortKey] = useState<string>('numero');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset page when filter/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatut, searchQuery, filterStartDate, filterEndDate]);

  const safeBrs = useMemo(() => (Array.isArray(bonsRetour) ? bonsRetour : []), [bonsRetour]);

  const filteredBrs = useMemo(() => {
    return safeBrs.filter((br) => {
      const etat: DocumentState = br.etat || 'Validé';
      if (filterStatut === 'VALIDE' && etat !== 'Validé') return false;
      if (filterStatut === 'BROUILLON' && etat !== 'Brouillon') return false;
      if (filterStatut === 'ANNULE' && etat !== 'Annulé') return false;
      if (filterStatut === 'ATTENTE' && (br.statut !== 'En attente' || etat !== 'Validé')) return false;

      // Date Range Filter
      const docDate = br.date ? br.date.slice(0, 10) : '';
      if (filterStartDate && docDate < filterStartDate) return false;
      if (filterEndDate && docDate > filterEndDate) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchNum = br.numero?.toLowerCase().includes(q);
        const matchClient = br.client_nom?.toLowerCase().includes(q);
        const matchDate = br.date?.includes(q);
        const matchMotif = br.motif?.toLowerCase().includes(q);
        const matchFacture = br.facture_numero?.toLowerCase().includes(q);
        if (!matchNum && !matchClient && !matchDate && !matchMotif && !matchFacture) return false;
      }
      return true;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortKey === 'numero') {
        comparison = compareDocumentNumbersDesc(a.numero, b.numero);
        return sortDir === 'asc' ? -comparison : comparison;
      } else if (sortKey === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortKey === 'client_nom') {
        comparison = (a.client_nom || '').localeCompare(b.client_nom || '', 'fr', { sensitivity: 'base' });
      } else if (sortKey === 'motif') {
        comparison = (a.motif || '').localeCompare(b.motif || '');
      } else if (sortKey === 'total_ht') {
        comparison = toNumeric(a.total_ht) - toNumeric(b.total_ht);
      } else if (sortKey === 'total_tva') {
        comparison = toNumeric(a.total_tva) - toNumeric(b.total_tva);
      } else if (sortKey === 'total_ttc') {
        comparison = toNumeric(a.total_ttc) - toNumeric(b.total_ttc);
      } else if (sortKey === 'etat') {
        comparison = (a.etat || '').localeCompare(b.etat || '');
      } else if (sortKey === 'facture_numero') {
        comparison = (a.facture_numero || '').localeCompare(b.facture_numero || '');
      } else {
        comparison = compareDocumentNumbersDesc(a.numero, b.numero);
      }
      return sortDir === 'asc' ? comparison : -comparison;
    });
  }, [safeBrs, filterStatut, searchQuery, filterStartDate, filterEndDate, sortKey, sortDir]);

  const paginatedBrs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBrs.slice(start, start + pageSize);
  }, [filteredBrs, currentPage, pageSize]);

  const toggleSelectBr = (id: number) => {
    setSelectedBrIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const validUninvoiced = filteredBrs
      .filter((b) => b.etat !== 'Brouillon' && b.etat !== 'Annulé' && !b.facture_id && !b.facture_numero)
      .map((b) => b.id);
    if (selectedBrIds.length === validUninvoiced.length) {
      setSelectedBrIds([]);
    } else {
      setSelectedBrIds(validUninvoiced);
    }
  };

  const exportSelectedToCsv = () => {
    const listToExport = selectedBrIds.length > 0
      ? safeBrs.filter((b) => selectedBrIds.includes(b.id))
      : filteredBrs;

    if (listToExport.length === 0) return;
    const headers = ['N° BR', 'Date', 'Client', 'Motif', 'Total HT (-)', 'Total TVA (-)', 'Total TTC (-)', 'État Document', 'Facture'];
    const rows = listToExport.map((b) => [
      b.numero,
      b.date,
      `"${(b.client_nom || '').replace(/"/g, '""')}"`,
      `"${(b.motif || '').replace(/"/g, '""')}"`,
      (-toNumeric(b.total_ht)).toFixed(2),
      (-toNumeric(b.total_tva)).toFixed(2),
      (-toNumeric(b.total_ttc)).toFixed(2),
      b.etat || 'Validé',
      b.facture_numero || (b.facture_id ? 'Déduit' : 'En attente'),
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bons_retour_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedBrsObjects = useMemo(() => {
    return safeBrs.filter((b) => selectedBrIds.includes(b.id));
  }, [safeBrs, selectedBrIds]);

  const isSingleClientSelected = useMemo(() => {
    if (selectedBrsObjects.length === 0) return true;
    const firstClient = selectedBrsObjects[0]?.client_id;
    return selectedBrsObjects.every((b) => b.client_id === firstClient);
  }, [selectedBrsObjects]);

  const totals = useMemo(() => {
    return filteredBrs.reduce(
      (acc, b) => {
        acc.totalHt += toNumeric(b.total_ht);
        acc.totalTva += toNumeric(b.total_tva);
        acc.totalTtc += toNumeric(b.total_ttc);
        return acc;
      },
      { totalHt: 0, totalTva: 0, totalTtc: 0 }
    );
  }, [filteredBrs]);

  const totalLines = useMemo(
    () => filteredBrs.reduce((count, br) => count + (br.lignes?.length || 0), 0),
    [filteredBrs]
  );

  const counts = useMemo(() => {
    return {
      all: safeBrs.length,
      valide: safeBrs.filter((b) => (b.etat || 'Validé') === 'Validé').length,
      brouillon: safeBrs.filter((b) => b.etat === 'Brouillon').length,
      annule: safeBrs.filter((b) => b.etat === 'Annulé').length,
      attente: safeBrs.filter((b) => b.etat !== 'Brouillon' && b.etat !== 'Annulé' && !b.facture_id && !b.facture_numero).length,
    };
  }, [safeBrs]);

  // Popovers for filters and dates
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [showDatePopup, setShowDatePopup] = useState(false);
  const filterPopoverRef = React.useRef<HTMLDivElement>(null);
  const datePopoverRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(e.target as Node)) {
        setShowFilterPopup(false);
      }
      if (datePopoverRef.current && !datePopoverRef.current.contains(e.target as Node)) {
        setShowDatePopup(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasActiveFilters = filterStatut !== 'ALL';
  const hasActiveDateFilter = Boolean(filterStartDate || filterEndDate);

  return (
    <div className="space-y-2.5">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER (Compact on mobile, unified toolbar on desktop) */}
      {/* ========================================================================= */}
      {/* Mobile Top Header (sm:hidden) */}
      <div className="flex items-center justify-between gap-2 p-3 bg-white rounded-xl border border-slate-200 shadow-xs sm:hidden">
        <div className="flex items-center gap-2 min-w-0">
          <RotateCcw className="w-5 h-5 text-rose-600 shrink-0" />
          <div className="min-w-0">
            <h2 className="font-bold text-slate-900 text-sm truncate flex items-center gap-1.5">
              Bons de Retour
              <span className="text-[11px] font-semibold px-1.5 py-0.2 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                {filteredBrs.length}
              </span>
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {selectedBrIds.length > 0 && (
            <button
              onClick={() => {
                if (!isSingleClientSelected) {
                  alert('Veuillez sélectionner des BR appartenant au même client.');
                  return;
                }
                onBatchInvoiceSelected(selectedBrIds);
              }}
              className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition active:scale-95 shadow-xs"
              title="Déduire dans facture"
            >
              Déduire ({selectedBrIds.length})
            </button>
          )}
          <button
            onClick={onOpenNewBr}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition shadow-xs active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ BR</span>
          </button>
        </div>
      </div>

      {/* Desktop Top Unified Toolbar (hidden sm:flex) */}
      <div className="hidden sm:flex items-center justify-between gap-3 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
        {/* Left: Title + Count + Popover Filters */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-rose-600 shrink-0" />
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight whitespace-nowrap">
                Bons de Retour (BR)
              </h2>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
                {filteredBrs.length} BR
              </span>
            </div>
          </div>

          <div className="h-4 w-px bg-slate-200" />

          {/* Popup Controls: Filtres & Date */}
          <div className="flex items-center gap-2">
            {/* 1. FILTERS POPUP BUTTON */}
            <div className="relative" ref={filterPopoverRef}>
              <button
                type="button"
                onClick={() => {
                  setShowFilterPopup((prev) => !prev);
                  setShowDatePopup(false);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition shadow-2xs ${
                  hasActiveFilters
                    ? 'bg-rose-50 border-rose-300 text-rose-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                <span>État : {filterStatut === 'ALL' ? 'Tous' : filterStatut}</span>
                {hasActiveFilters && (
                  <span className="w-2 h-2 rounded-full bg-rose-600" />
                )}
                <span className="text-[10px] text-slate-400">▾</span>
              </button>

              {/* Filters Popover Menu */}
              {showFilterPopup && (
                <div className="absolute left-0 mt-2 z-50 bg-white rounded-xl border border-slate-200 shadow-xl p-3.5 w-[280px] space-y-2 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-rose-600" />
                      État du bon de retour
                    </span>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={() => setFilterStatut('ALL')}
                        className="text-[11px] text-rose-600 hover:text-rose-700 font-medium"
                      >
                        Réinitialiser
                      </button>
                    )}
                  </div>
                  <div className="space-y-1">
                    {[
                      { key: 'ALL', label: `Tous (${counts.all})` },
                      { key: 'VALIDE', label: `Validés (${counts.valide})`, color: 'text-emerald-700' },
                      { key: 'ATTENTE', label: `⏳ À déduire (${counts.attente})`, color: 'text-amber-700' },
                      { key: 'BROUILLON', label: `Brouillons (${counts.brouillon})`, color: 'text-slate-700' },
                      { key: 'ANNULE', label: `Annulés (${counts.annule})`, color: 'text-rose-700' },
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                          setFilterStatut(item.key as any);
                          setShowFilterPopup(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition ${
                          filterStatut === item.key
                            ? 'bg-rose-50 text-rose-800 font-bold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span className={item.color}>{item.label}</span>
                        {filterStatut === item.key && <CheckCircle2 className="w-3.5 h-3.5 text-rose-600" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. DATE POPUP BUTTON */}
            <div className="relative" ref={datePopoverRef}>
              <button
                type="button"
                onClick={() => {
                  setShowDatePopup((prev) => !prev);
                  setShowFilterPopup(false);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition shadow-2xs ${
                  hasActiveDateFilter
                    ? 'bg-rose-50 border-rose-300 text-rose-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>Date / Période</span>
                {hasActiveDateFilter && (
                  <span className="w-2 h-2 rounded-full bg-rose-600" />
                )}
                <span className="text-[10px] text-slate-400">▾</span>
              </button>

              {/* Date Popover Menu */}
              {showDatePopup && (
                <div className="absolute left-0 mt-2 z-50 bg-white rounded-xl border border-slate-200 shadow-xl p-3.5 w-auto min-w-[320px] animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2.5">
                    <span className="text-xs font-bold text-slate-800">Filtrer par date de retour</span>
                    {hasActiveDateFilter && (
                      <button
                        type="button"
                        onClick={() => {
                          setFilterStartDate('');
                          setFilterEndDate('');
                        }}
                        className="text-[11px] text-rose-600 hover:text-rose-700 font-medium"
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
                    variant="rose"
                    compact
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {selectedBrIds.length > 0 && (
            <button
              onClick={() => {
                if (!isSingleClientSelected) {
                  alert('Veuillez sélectionner des BR appartenant au même client.');
                  return;
                }
                onBatchInvoiceSelected(selectedBrIds);
              }}
              disabled={!isSingleClientSelected}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition active:scale-95 disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5" />
              Déduire ({selectedBrIds.length}) • {formatCurrency(totals.totalTtc)}
            </button>
          )}

          <button
            onClick={onOpenNewBr}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouveau BR</span>
          </button>
        </div>
      </div>

      {/* Multi-client Warning */}
      {!isSingleClientSelected && selectedBrIds.length > 1 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
          <span>⚠️ Attention: Vous avez sélectionné des BR de plusieurs clients distincts. Veuillez sélectionner des BR du même client.</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MOBILE CARDS LIST (hidden on desktop - md:hidden) */}
      {/* ========================================================================= */}
      <div className="md:hidden space-y-3">
        {filteredBrs.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
            Aucun Bon de Retour trouvé.
          </div>
        ) : (
          paginatedBrs.map((br) => {
            const isSelected = selectedBrIds.includes(br.id);
            const etat: DocumentState = br.etat || 'Validé';
            const isBrouillon = etat === 'Brouillon';
            const isAnnule = etat === 'Annulé';
            const isValide = !isBrouillon && !isAnnule;
            const isInvoiced = Boolean(br.facture_id || br.facture_numero);
            const isAttente = isValide && !isInvoiced;

            return (
              <div
                key={br.id}
                className={`bg-white rounded-xl border shadow-xs overflow-hidden transition ${
                  isSelected
                    ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20'
                    : isAnnule
                    ? 'border-slate-200 bg-rose-50/10 opacity-75'
                    : 'border-slate-200'
                }`}
              >
                {/* Mobile Card Header */}
                <div className="p-3.5 pb-2.5 border-b border-slate-100 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {isAttente && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectBr(br.id);
                        }}
                        className="p-1 -ml-1 text-rose-600 hover:text-rose-800 touch-manipulation"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-rose-600" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-400" />
                        )}
                      </button>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-extrabold text-sm text-slate-900">
                          {br.numero}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatDate(br.date)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        {br.lignes?.length || 0} article{(br.lignes?.length || 0) > 1 ? 's' : ''} retourné{(br.lignes?.length || 0) > 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      isValide
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : isBrouillon
                        ? 'bg-slate-100 text-slate-600 border border-slate-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {etat}
                  </span>
                </div>

                {/* Mobile Card Body */}
                <div
                  className="p-3.5 space-y-2 cursor-pointer hover:bg-slate-50/50 transition"
                  onClick={() => onViewBr(br)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Client
                      </span>
                      <div className="font-bold text-slate-900 text-xs truncate">
                        {br.client_nom}
                      </div>
                      {br.motif && (
                        <div className="text-[11px] text-rose-700 font-medium mt-0.5 bg-rose-50/70 px-2 py-0.5 rounded border border-rose-100 inline-block">
                          Motif : {br.motif}
                        </div>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Déduction TTC
                      </span>
                      <div className="font-mono font-extrabold text-base text-rose-700">
                        -{formatCurrency(br.total_ttc)}
                      </div>
                    </div>
                  </div>

                  {/* Facturation status & HT/TVA */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <div className="flex items-center gap-2">
                      <span>HT: -{formatCurrency(br.total_ht, false)}</span>
                      <span>•</span>
                      <span>TVA: -{formatCurrency(br.total_tva, false)}</span>
                    </div>
                    <div>
                      {isValide ? (
                        isInvoiced ? (
                          <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] border border-emerald-200">
                            {br.facture_numero ? br.facture_numero : 'Facturé'}
                          </span>
                        ) : (
                          <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-200">
                            ⏳ En attente déduction
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400 italic text-[10px]">{isAnnule ? 'Annulé' : 'Brouillon'}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mobile Card Bottom: Action Buttons */}
                <div className="bg-slate-50/90 px-3 py-2 border-t border-slate-100 flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onViewBr(br)}
                      className="flex items-center gap-1 px-3 min-h-[36px] rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition active:scale-95 touch-manipulation"
                    >
                      <Eye className="w-4 h-4 text-rose-600" />
                      <span>Aperçu</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => generateBrPdf(br, company)}
                      className="flex items-center gap-1 px-2.5 min-h-[36px] rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition active:scale-95 touch-manipulation"
                      title="Télécharger PDF"
                    >
                      <Printer className="w-4 h-4 text-slate-600" />
                      <span>PDF</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {isBrouillon && onEditBr && (
                      <button
                        type="button"
                        onClick={() => onEditBr(br)}
                        className="flex items-center gap-1 px-2.5 min-h-[36px] rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition active:scale-95 touch-manipulation"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Modifier</span>
                      </button>
                    )}

                    {isBrouillon && onUpdateBrState && (
                      <button
                        type="button"
                        onClick={() => onUpdateBrState(br.id, 'Validé')}
                        className="min-h-[36px] px-2.5 flex items-center justify-center rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition active:scale-95 touch-manipulation"
                        title="Valider le BR"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}

                    {isValide && onUpdateBrState && (
                      <button
                        type="button"
                        onClick={() => onUpdateBrState(br.id, 'Annulé')}
                        className="min-h-[36px] px-2.5 flex items-center justify-center rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition active:scale-95 touch-manipulation"
                        title="Annuler le BR"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    )}

                    {isAnnule && onUpdateBrState && (
                      <button
                        type="button"
                        onClick={() => onUpdateBrState(br.id, 'Brouillon')}
                        className="min-h-[36px] px-2 flex items-center justify-center rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 transition active:scale-95 touch-manipulation"
                        title="Remettre en brouillon"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Supprimer définitivement le bon de retour ${br.numero} ?`)) {
                          onDeleteBr(br.id);
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

        {/* Mobile Summary Box */}
        {filteredBrs.length > 0 && (
          <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xs text-xs flex items-center justify-between font-mono">
            <div>
              <div className="text-[10px] text-slate-400 font-sans uppercase">Total affiché ({filteredBrs.length} BRs)</div>
              <div className="font-extrabold text-rose-400 text-base">-{formatCurrency(totals.totalTtc)}</div>
            </div>
            <div className="text-right text-[11px] text-slate-300">
              <div>HT: -{formatCurrency(totals.totalHt, false)}</div>
              <div>TVA: -{formatCurrency(totals.totalTva, false)}</div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. DESKTOP TABLE (hidden on mobile - hidden md:block) */}
      {/* ========================================================================= */}
      <div className="hidden md:block space-y-2">
        {/* Bulk Action Bar */}
        <TableBulkActionBar
          selectedCount={selectedBrIds.length}
          itemLabel="bon de retour"
          onClearSelection={() => setSelectedBrIds([])}
        >
          <button
            type="button"
            onClick={() => onBatchInvoiceSelected(selectedBrIds)}
            disabled={!isSingleClientSelected}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition shadow-2xs ${
              isSingleClientSelected
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
            title={
              !isSingleClientSelected
                ? 'Tous les BR doivent être du même client'
                : 'Déduire les BR sélectionnés dans une Facture'
            }
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Déduire en lot ({selectedBrIds.length})</span>
          </button>
          <button
            type="button"
            onClick={exportSelectedToCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 shadow-2xs transition"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>Exporter CSV ({selectedBrIds.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm(`Supprimer les ${selectedBrIds.length} bons de retour sélectionnés ?`)) {
                selectedBrIds.forEach((id) => onDeleteBr(id));
                setSelectedBrIds([]);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 shadow-2xs transition"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Supprimer ({selectedBrIds.length})</span>
          </button>
        </TableBulkActionBar>

        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                {/* AeroTrack Unified Enterprise Header */}
                <tr className="bg-slate-50 text-slate-700 font-semibold text-xs divide-x divide-slate-200 border-b border-slate-200 sticky top-0 z-10 shadow-2xs">
                  <th className="py-2.5 px-2.5 text-center w-10 bg-slate-50 border-r border-slate-200">
                    <input
                      type="checkbox"
                      checked={
                        selectedBrIds.length > 0 &&
                        selectedBrIds.length ===
                          filteredBrs.filter(
                            (b) => b.etat !== 'Brouillon' && b.etat !== 'Annulé' && !b.facture_id && !b.facture_numero
                          ).length
                      }
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      title="Sélectionner tous les BR validés en attente"
                    />
                  </th>
                  <SortableTh label="N° BR" sortKey="numero" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} className="min-w-[100px]" />
                  <SortableTh label="Date" sortKey="date" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} className="min-w-[90px]" />
                  <SortableTh label="Client / Société" sortKey="client_nom" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} className="min-w-[180px]" />
                  <SortableTh label="Motif du Retour" sortKey="motif" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} className="min-w-[150px]" />
                  <SortableTh label="Total HT (-)" sortKey="total_ht" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} align="right" className="min-w-[90px]" />
                  <SortableTh label="TVA (-)" sortKey="total_tva" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} align="right" className="min-w-[80px]" />
                  <SortableTh label="Total TTC (-)" sortKey="total_ttc" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} align="right" className="min-w-[100px] text-rose-600 font-bold" />
                  <SortableTh label="État Document" sortKey="etat" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} align="center" className="min-w-[100px]" />
                  <SortableTh label="Facturation" sortKey="facture_numero" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} align="center" className="min-w-[110px]" />
                  <th className="py-2.5 px-3 text-center min-w-[140px] bg-slate-50 font-semibold text-xs text-slate-700">Actions</th>
                </tr>
                {/* Search & quick filter row */}
                <tr className="bg-slate-50/70 text-slate-600 divide-x divide-slate-200 border-b border-slate-200">
                  <th className="p-1.5 text-center">
                    <button
                      type="button"
                      onClick={exportSelectedToCsv}
                      className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                      title="Exporter CSV"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="p-1.5" colSpan={4}>
                    <input
                      type="text"
                      placeholder="Recherche rapide (N° BR, client, motif, date)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-white text-slate-800 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                    />
                  </th>
                  <th className="p-1.5" colSpan={6}>
                    <div className="flex items-center justify-between text-xs text-slate-500 px-2 font-normal">
                      <span>{filteredBrs.length} BRs trouvés</span>
                      {(searchQuery || filterStartDate || filterEndDate) && (
                        <button
                          onClick={() => {
                            setSearchQuery('');
                            setFilterStartDate('');
                            setFilterEndDate('');
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 underline cursor-pointer"
                        >
                          Effacer recherche
                        </button>
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {filteredBrs.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400 text-sm">
                      Aucun Bon de Retour trouvé.
                    </td>
                  </tr>
                ) : (
                  paginatedBrs.map((br) => {
                    const isSelected = selectedBrIds.includes(br.id);
                    const etat: DocumentState = br.etat || 'Validé';
                    const isBrouillon = etat === 'Brouillon';
                    const isAnnule = etat === 'Annulé';
                    const isValide = !isBrouillon && !isAnnule;
                    const isInvoiced = Boolean(br.facture_id || br.facture_numero);
                    const isAttente = isValide && !isInvoiced;

                    return (
                      <tr
                        key={br.id}
                        onClick={(event) => {
                          if (event.target instanceof Element && event.target.closest('button, input, a, select')) return;
                          onViewBr(br);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            onViewBr(br);
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        title="Ouvrir l’aperçu du bon de retour"
                        className={`cursor-pointer transition divide-x divide-slate-200 border-b border-slate-200 ${
                          isSelected
                            ? 'bg-rose-50/80 font-medium'
                            : isAnnule
                            ? 'bg-rose-50/30 opacity-75'
                            : isBrouillon
                            ? 'bg-slate-50/70'
                            : 'bg-white hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="py-2.5 px-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                          {isAttente ? (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectBr(br.id)}
                              className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                            />
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-xs">
                          <span className={isAnnule ? 'line-through text-slate-400' : 'text-blue-600 hover:text-blue-800 underline font-medium'}>
                            {br.numero}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap font-mono">
                          {formatDate(br.date)}
                        </td>
                        <td className="py-2 px-3 text-slate-900 font-medium">
                          {br.client_nom}
                        </td>
                        <td className="py-2 px-3 text-slate-600 text-xs italic">
                          {br.motif || 'Retour standard'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-rose-700">
                          -{formatCurrency(br.total_ht, false)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-rose-600">
                          -{formatCurrency(br.total_tva, false)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-rose-800 bg-rose-50/50">
                          -{formatCurrency(br.total_ttc, false)}
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
                        <td className="py-2 px-3 text-center">
                          {isValide ? (
                            isInvoiced ? (
                              <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                {br.facture_numero ? br.facture_numero : 'Déduit'}
                              </span>
                            ) : (
                              <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                                ⏳ En attente déduction
                              </span>
                            )
                          ) : (
                            <span className="text-slate-500 italic text-[11px]">{isAnnule ? 'Annulé' : 'À valider'}</span>
                          )}
                        </td>
                        <td className="py-1.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            {/* 1. If Brouillon: allow Edit, Validate, and Cancel */}
                            {isBrouillon && (
                              <>
                                {onEditBr && (
                                  <button
                                    onClick={() => onEditBr(br)}
                                    className="p-1 hover:bg-blue-100 text-blue-700 rounded transition"
                                    title="Modifier le BR Brouillon"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {onUpdateBrState && (
                                  <button
                                    onClick={() => {
                                      onUpdateBrState(br.id, 'Validé');
                                    }}
                                    className="p-1 hover:bg-emerald-100 text-emerald-700 rounded transition"
                                    title="Valider le BR (Réintégration stock)"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {onUpdateBrState && (
                                  <button
                                    onClick={() => {
                                      onUpdateBrState(br.id, 'Annulé');
                                    }}
                                    className="p-1 hover:bg-rose-100 text-rose-700 rounded transition"
                                    title="Annuler le BR"
                                  >
                                    <Ban className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </>
                            )}

                            {/* 2. If Validé: allow Annuler (reverts stock reintegration) */}
                            {isValide && (
                              <>
                                {onUpdateBrState && (
                                  <button
                                    onClick={() => {
                                      onUpdateBrState(br.id, 'Annulé');
                                    }}
                                    className="p-1 hover:bg-amber-100 text-amber-700 rounded transition"
                                    title="Annuler le BR"
                                  >
                                    <Ban className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </>
                            )}

                            {/* 3. If Annulé: allow Set to Draft to Edit! */}
                            {isAnnule && (
                              <>
                                {onUpdateBrState && (
                                  <button
                                    onClick={() => {
                                      onUpdateBrState(br.id, 'Brouillon');
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
                              onClick={() => onViewBr(br)}
                              className="p-1 hover:bg-slate-200 text-slate-600 hover:text-rose-600 rounded transition"
                              title="Aperçu Bon de Retour"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => generateBrPdf(br, company)}
                              className="p-1 hover:bg-slate-200 text-slate-600 hover:text-rose-600 rounded transition"
                              title="Télécharger PDF BR"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Supprimer définitivement le bon de retour ${br.numero} ?`)) {
                                  onDeleteBr(br.id);
                                }
                              }}
                              className="p-1 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded transition"
                              title="Supprimer BR"
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
              <tfoot>
                <tr className="bg-slate-50 text-slate-900 font-bold divide-x divide-slate-200 border-t-2 border-slate-300 text-xs">
                  <td colSpan={5} className="py-2.5 px-3 text-right uppercase tracking-wider text-slate-700">
                    Total Déductions BR ({filteredBrs.length} retours • {totalLines} lignes) :
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-rose-600">
                    -{formatCurrency(totals.totalHt, false)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-rose-600">
                    -{formatCurrency(totals.totalTva, false)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-rose-600 font-extrabold">
                    -{formatCurrency(totals.totalTtc, false)}
                  </td>
                  <td colSpan={3} className="py-2.5 px-3 text-center text-slate-500">
                    MAD (DH)
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Shared Pagination (Works for both Mobile Cards and Desktop Table) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <TablePagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={filteredBrs.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          itemLabel="bons de retour"
        />
      </div>
    </div>
  );
};
