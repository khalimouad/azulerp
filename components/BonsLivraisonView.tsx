'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { BonLivraison, CompanyInfo, DocumentState } from '@/lib/types';
import { compareDocumentNumbersDesc, formatCurrency, formatDate, getCurrentYearDateRange, toNumeric } from '@/lib/utils';
import { generateBlPdf } from '@/lib/pdf-generator';
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
  Truck,
  FileText,
  CheckCircle2,
  Clock,
  Ban,
  RotateCcw,
  RefreshCw,
  Loader2,
} from 'lucide-react';

interface BonsLivraisonViewProps {
  bonsLivraison: BonLivraison[];
  company: CompanyInfo;
  isLoading?: boolean;
  onRefresh?: () => void;
  onOpenNewBl: () => void;
  onEditBl?: (bl: BonLivraison) => void;
  onViewBl: (bl: BonLivraison) => void;
  onDeleteBl: (id: number) => void;
  onUpdateBlState?: (id: number, newState: DocumentState) => Promise<void>;
  onBatchInvoiceSelected: (blIds: number[]) => void;
}

export const BonsLivraisonView: React.FC<BonsLivraisonViewProps> = ({
  bonsLivraison,
  company,
  isLoading = false,
  onRefresh,
  onOpenNewBl,
  onEditBl,
  onViewBl,
  onDeleteBl,
  onUpdateBlState,
  onBatchInvoiceSelected,
}) => {
  const [filterStatut, setFilterStatut] = useState<'ALL' | 'VALIDE' | 'BROUILLON' | 'ANNULE' | 'ATTENTE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStartDate, setFilterStartDate] = useState(() => getCurrentYearDateRange().start);
  const [filterEndDate, setFilterEndDate] = useState(() => getCurrentYearDateRange().end);
  const [selectedBlIds, setSelectedBlIds] = useState<number[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset page when filter/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatut, searchQuery, filterStartDate, filterEndDate]);

  const filteredBls = useMemo(() => {
    return bonsLivraison.filter((bl) => {
      const etat = bl.etat || 'Validé';
      if (filterStatut === 'VALIDE' && etat !== 'Validé') return false;
      if (filterStatut === 'BROUILLON' && etat !== 'Brouillon') return false;
      if (filterStatut === 'ANNULE' && etat !== 'Annulé') return false;
      if (filterStatut === 'ATTENTE' && (bl.facture_id || bl.facture_numero || etat === 'Brouillon' || etat === 'Annulé')) return false;

      // Date Range Filter
      const docDate = bl.date ? bl.date.slice(0, 10) : '';
      if (filterStartDate && docDate < filterStartDate) return false;
      if (filterEndDate && docDate > filterEndDate) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchNum = bl.numero.toLowerCase().includes(q);
        const matchClient = bl.client_nom.toLowerCase().includes(q);
        const matchDate = bl.date.includes(q);
        const matchFacture = bl.facture_numero?.toLowerCase().includes(q);
        if (!matchNum && !matchClient && !matchDate && !matchFacture) return false;
      }
      return true;
    }).sort((a, b) =>
      compareDocumentNumbersDesc(a.numero, b.numero) ||
      (a.client_nom || '').localeCompare(b.client_nom || '', 'fr', { sensitivity: 'base' }) ||
      new Date(b.date).getTime() - new Date(a.date).getTime() ||
      b.id - a.id
    );
  }, [bonsLivraison, filterStatut, searchQuery, filterStartDate, filterEndDate]);

  const paginatedBls = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBls.slice(start, start + pageSize);
  }, [filteredBls, currentPage, pageSize]);

  const toggleSelectBl = (id: number) => {
    setSelectedBlIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const validUninvoiced = filteredBls
      .filter((b) => b.etat !== 'Brouillon' && b.etat !== 'Annulé' && !b.facture_id && !b.facture_numero)
      .map((b) => b.id);
    if (selectedBlIds.length === validUninvoiced.length) {
      setSelectedBlIds([]);
    } else {
      setSelectedBlIds(validUninvoiced);
    }
  };

  const selectedBlsObjects = useMemo(() => {
    return bonsLivraison.filter((b) => selectedBlIds.includes(b.id));
  }, [bonsLivraison, selectedBlIds]);

  const selectedBlsTotals = useMemo(() => {
    return selectedBlsObjects.reduce(
      (acc, b) => {
        acc.totalHt += toNumeric(b.total_ht);
        acc.totalTva += toNumeric(b.total_tva);
        acc.totalTtc += toNumeric(b.total_ttc);
        return acc;
      },
      { totalHt: 0, totalTva: 0, totalTtc: 0 }
    );
  }, [selectedBlsObjects]);

  const isSingleClientSelected = useMemo(() => {
    if (selectedBlsObjects.length === 0) return true;
    const firstClient = selectedBlsObjects[0].client_id;
    return selectedBlsObjects.every((b) => b.client_id === firstClient);
  }, [selectedBlsObjects]);

  const totals = useMemo(() => {
    return filteredBls.reduce(
      (acc, b) => {
        acc.totalHt += toNumeric(b.total_ht);
        acc.totalTva += toNumeric(b.total_tva);
        acc.totalTtc += toNumeric(b.total_ttc);
        return acc;
      },
      { totalHt: 0, totalTva: 0, totalTtc: 0 }
    );
  }, [filteredBls]);

  const totalLines = useMemo(
    () => filteredBls.reduce((count, bl) => count + (bl.lignes?.length || 0), 0),
    [filteredBls]
  );

  const counts = useMemo(() => {
    return {
      all: bonsLivraison.length,
      valide: bonsLivraison.filter((b) => (b.etat || 'Validé') === 'Validé').length,
      brouillon: bonsLivraison.filter((b) => b.etat === 'Brouillon').length,
      annule: bonsLivraison.filter((b) => b.etat === 'Annulé').length,
      attente: bonsLivraison.filter((b) => b.etat !== 'Brouillon' && b.etat !== 'Annulé' && !b.facture_id && !b.facture_numero).length,
    };
  }, [bonsLivraison]);

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-600" />
            Bons de Livraison (BL)
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {filteredBls.length} BL • {totalLines} lignes
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestion du cycle de vie en 3 états : Brouillon (Draft), Validé (déstocké), Annulé (restitué). Facturation fin de mois.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 transition shadow-xs disabled:opacity-50"
              title="Recharger les bons de livraison"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
              <span>Actualiser</span>
            </button>
          )}

          {selectedBlIds.length > 0 && (
            <button
              onClick={() => {
                if (!isSingleClientSelected) {
                  alert('Veuillez sélectionner des BLs appartenant au même client pour générer une facture consolidée.');
                  return;
                }
                onBatchInvoiceSelected(selectedBlIds);
              }}
              disabled={!isSingleClientSelected}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="w-4 h-4" />
              Facturer les {selectedBlIds.length} BL sélectionnés • {formatCurrency(selectedBlsTotals.totalTtc)}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={onOpenNewBl}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            + Nouveau Bon de Livraison
          </button>
        </div>
      </div>

      {/* Floating Selection & Addition Banner */}
      {selectedBlIds.length > 0 && (
        <div className="sticky bottom-16 lg:bottom-4 z-20 bg-indigo-950 text-white p-3 sm:p-4 rounded-xl shadow-xl border border-indigo-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span className="p-2 rounded-lg bg-indigo-800 text-indigo-200 shrink-0">
              <CheckSquare className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <div className="text-xs font-bold flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span>{selectedBlIds.length} BL sélectionné{selectedBlIds.length > 1 ? 's' : ''}</span>
                {selectedBlsObjects[0] && (
                  <span className="px-2 py-0.5 rounded bg-indigo-800/80 text-indigo-200 font-medium truncate max-w-[200px]">
                    Client : {selectedBlsObjects[0].client_nom}
                  </span>
                )}
              </div>
              <div className="text-xs text-indigo-300 font-mono mt-0.5 truncate">
                Total : <span className="font-extrabold text-emerald-400 text-sm">{formatCurrency(selectedBlsTotals.totalTtc)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setSelectedBlIds([])}
              className="px-3 py-1.5 text-xs text-indigo-200 hover:text-white hover:bg-indigo-900 rounded-lg transition"
            >
              Désélectionner
            </button>
            <button
              onClick={() => {
                if (!isSingleClientSelected) {
                  alert('Veuillez sélectionner des BLs appartenant au même client pour générer une facture consolidée.');
                  return;
                }
                onBatchInvoiceSelected(selectedBlIds);
              }}
              disabled={!isSingleClientSelected}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="w-4 h-4" />
              <span>Générer Facture</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs, Date Range & Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5 text-xs overflow-x-auto pb-1 lg:pb-0 scrollbar-none whitespace-nowrap">
          <button
            onClick={() => setFilterStatut('ALL')}
            className={`px-3 py-1.5 rounded-lg font-medium transition shrink-0 ${
              filterStatut === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Tous ({counts.all})
          </button>
          <button
            onClick={() => setFilterStatut('VALIDE')}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 shrink-0 ${
              filterStatut === 'VALIDE'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Validés ({counts.valide})
          </button>
          <button
            onClick={() => setFilterStatut('BROUILLON')}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 shrink-0 ${
              filterStatut === 'BROUILLON'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Brouillons ({counts.brouillon})
          </button>
          <button
            onClick={() => setFilterStatut('ANNULE')}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 shrink-0 ${
              filterStatut === 'ANNULE'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'
            }`}
          >
            <Ban className="w-3.5 h-3.5" />
            Annulés ({counts.annule})
          </button>
          <button
            onClick={() => setFilterStatut('ATTENTE')}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 shrink-0 ${
              filterStatut === 'ATTENTE'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-white text-amber-700 hover:bg-amber-50 border border-amber-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            En attente ({counts.attente})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <DateRangeFilter
            startDate={filterStartDate}
            endDate={filterEndDate}
            onDateChange={(start, end) => {
              setFilterStartDate(start);
              setFilterEndDate(end);
            }}
            variant="emerald"
          />

          <div className="w-full sm:w-56">
            <input
              type="text"
              placeholder="Rechercher BL, Client, Facture..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 text-slate-800 rounded-lg border border-slate-300 focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Multi-client Warning */}
      {!isSingleClientSelected && selectedBlIds.length > 1 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
          <span>⚠️ Attention: Vous avez sélectionné des BLs de plusieurs clients différents. Veuillez sélectionner des BLs du même client pour consolider la facture.</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. MOBILE CARD LIST (Smartphone View - block md:hidden) */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-3">
        {isLoading ? (
          <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-7 h-7 text-emerald-600 animate-spin" />
            <span className="text-sm font-medium text-slate-700">Chargement des bons de livraison...</span>
          </div>
        ) : filteredBls.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400 text-sm">
            Aucun Bon de Livraison trouvé.
          </div>
        ) : (
          paginatedBls.map((bl) => {
            const isSelected = selectedBlIds.includes(bl.id);
            const etat: DocumentState = bl.etat || 'Validé';
            const isBrouillon = etat === 'Brouillon';
            const isAnnule = etat === 'Annulé';
            const isValide = !isBrouillon && !isAnnule;
            const isInvoiced = Boolean(bl.facture_id || bl.facture_numero);
            const isAttente = isValide && !isInvoiced;

            return (
              <div
                key={bl.id}
                className={`bg-white rounded-xl border transition shadow-xs overflow-hidden ${
                  isSelected
                    ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20'
                    : isAnnule
                    ? 'border-rose-200 bg-rose-50/10'
                    : isBrouillon
                    ? 'border-slate-300 bg-slate-50/40'
                    : 'border-slate-200 hover:border-emerald-300'
                }`}
              >
                {/* Mobile Card Top: Selection Checkbox + N° + Date + État Badge */}
                <div className="p-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {isAttente && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectBl(bl.id);
                        }}
                        className="min-w-[36px] min-h-[36px] flex items-center justify-center -ml-1 text-indigo-600 rounded-lg active:bg-indigo-100 touch-manipulation"
                        aria-label="Sélectionner le BL"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-indigo-600" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-400" />
                        )}
                      </button>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-mono font-bold text-sm text-slate-900 ${isAnnule ? 'line-through text-slate-400' : ''}`}>
                          {bl.numero}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <span>{formatDate(bl.date)}</span>
                        {bl.lignes && bl.lignes.length > 0 && (
                          <>
                            <span>•</span>
                            <span>{bl.lignes.length} article{bl.lignes.length > 1 ? 's' : ''}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isValide && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Validé
                      </span>
                    )}
                    {isBrouillon && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                        Brouillon
                      </span>
                    )}
                    {isAnnule && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                        Annulé
                      </span>
                    )}
                  </div>
                </div>

                {/* Mobile Card Body: Client Name & Financial Totals */}
                <div
                  className="p-3.5 space-y-2 cursor-pointer active:bg-slate-50 transition"
                  onClick={() => onViewBl(bl)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Client</span>
                      <div className="font-bold text-slate-900 text-sm truncate">{bl.client_nom}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Total TTC</span>
                      <div className="font-mono font-black text-emerald-700 text-base">
                        {formatCurrency(bl.total_ttc)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 text-slate-500">
                    <div className="font-mono text-[11px]">
                      HT: <span className="font-semibold text-slate-700">{formatCurrency(bl.total_ht, false)}</span> • TVA: <span className="font-semibold text-slate-700">{formatCurrency(bl.total_tva, false)}</span>
                    </div>
                    <div>
                      {isValide ? (
                        isInvoiced ? (
                          <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] border border-emerald-200">
                            {bl.facture_numero ? bl.facture_numero : 'Facturé'}
                          </span>
                        ) : (
                          <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-200">
                            ⏳ En attente facturation
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
                      onClick={() => onViewBl(bl)}
                      className="flex items-center gap-1 px-3 min-h-[36px] rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition active:scale-95 touch-manipulation"
                    >
                      <Eye className="w-4 h-4 text-emerald-600" />
                      <span>Aperçu</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => generateBlPdf(bl, company)}
                      className="flex items-center gap-1 px-2.5 min-h-[36px] rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition active:scale-95 touch-manipulation"
                      title="Télécharger PDF"
                    >
                      <Printer className="w-4 h-4 text-slate-600" />
                      <span>PDF</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {isBrouillon && onEditBl && (
                      <button
                        type="button"
                        onClick={() => onEditBl(bl)}
                        className="flex items-center gap-1 px-2.5 min-h-[36px] rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition active:scale-95 touch-manipulation"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Modifier</span>
                      </button>
                    )}

                    {isBrouillon && onUpdateBlState && (
                      <button
                        type="button"
                        onClick={() => onUpdateBlState(bl.id, 'Validé')}
                        className="min-h-[36px] px-2.5 flex items-center justify-center rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition active:scale-95 touch-manipulation"
                        title="Valider le BL"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}

                    {isValide && onUpdateBlState && (
                      <button
                        type="button"
                        onClick={() => onUpdateBlState(bl.id, 'Annulé')}
                        className="min-h-[36px] px-2.5 flex items-center justify-center rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition active:scale-95 touch-manipulation"
                        title="Annuler le BL"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    )}

                    {isAnnule && onUpdateBlState && (
                      <button
                        type="button"
                        onClick={() => onUpdateBlState(bl.id, 'Brouillon')}
                        className="min-h-[36px] px-2 flex items-center justify-center rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 transition active:scale-95 touch-manipulation"
                        title="Remettre en brouillon"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Supprimer définitivement le bon de livraison ${bl.numero} ?`)) {
                          onDeleteBl(bl.id);
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
        {filteredBls.length > 0 && (
          <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xs text-xs flex items-center justify-between font-mono">
            <div>
              <div className="text-[10px] text-slate-400 font-sans uppercase">Total affiché ({filteredBls.length} BLs)</div>
              <div className="font-extrabold text-emerald-400 text-base">{formatCurrency(totals.totalTtc)}</div>
            </div>
            <div className="text-right text-[11px] text-slate-300">
              <div>HT: {formatCurrency(totals.totalHt, false)}</div>
              <div>TVA: {formatCurrency(totals.totalTva, false)}</div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. DESKTOP TABLE (hidden on mobile - hidden md:block) */}
      {/* ========================================================================= */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-emerald-800 text-white font-semibold divide-x divide-emerald-700">
                <th className="py-2.5 px-3 w-10 text-center">
                  <button
                    onClick={toggleSelectAll}
                    className="text-white hover:text-emerald-200 transition"
                    title="Sélectionner tous les BL validés en attente"
                  >
                    {selectedBlIds.length > 0 &&
                    selectedBlIds.length === filteredBls.filter((b) => b.etat !== 'Brouillon' && b.etat !== 'Annulé' && !b.facture_id && !b.facture_numero).length ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-2.5 px-3 min-w-[100px]">N° BL</th>
                <th className="py-2.5 px-3 min-w-[90px]">Date</th>
                <th className="py-2.5 px-3 min-w-[180px]">Client / Société</th>
                <th className="py-2.5 px-3 text-right min-w-[90px]">Total HT</th>
                <th className="py-2.5 px-3 text-right min-w-[80px]">TVA</th>
                <th className="py-2.5 px-3 text-right min-w-[100px] font-bold">Total TTC</th>
                <th className="py-2.5 px-3 text-center min-w-[100px]">État Document</th>
                <th className="py-2.5 px-3 text-center min-w-[110px]">Facturation</th>
                <th className="py-2.5 px-3 text-center min-w-[140px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-7 h-7 text-emerald-600 animate-spin" />
                      <span className="text-sm font-medium text-slate-700">Chargement des bons de livraison à la demande...</span>
                      <span className="text-xs text-slate-400">Récupération optimisée des pièces</span>
                    </div>
                  </td>
                </tr>
              ) : filteredBls.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 text-sm">
                    Aucun Bon de Livraison trouvé.
                  </td>
                </tr>
              ) : (
                paginatedBls.map((bl) => {
                  const isSelected = selectedBlIds.includes(bl.id);
                  const etat: DocumentState = bl.etat || 'Validé';
                  const isBrouillon = etat === 'Brouillon';
                  const isAnnule = etat === 'Annulé';
                  const isValide = !isBrouillon && !isAnnule;
                  const isInvoiced = Boolean(bl.facture_id || bl.facture_numero);
                  const isAttente = isValide && !isInvoiced;

                  return (
                    <tr
                      key={bl.id}
                      onClick={(event) => {
                        if (event.target instanceof Element && event.target.closest('button, input, a, select')) return;
                        onViewBl(bl);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onViewBl(bl);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      title="Ouvrir l’aperçu du bon de livraison"
                      className={`cursor-pointer hover:bg-emerald-50/50 transition focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500 divide-x divide-slate-100 ${
                        isAnnule
                          ? 'bg-rose-50/30 opacity-75'
                          : isBrouillon
                          ? 'bg-slate-50/70'
                          : isSelected
                          ? 'bg-indigo-50 font-medium'
                          : 'even:bg-slate-50/50'
                      }`}
                    >
                      <td className="py-2 px-3 text-center">
                        {isAttente ? (
                          <button
                            onClick={() => toggleSelectBl(bl.id)}
                            className="text-indigo-600 hover:text-indigo-800 transition"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-indigo-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono font-semibold text-slate-900">
                        <span className={isAnnule ? 'line-through text-slate-400' : ''}>{bl.numero}</span>
                      </td>
                      <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                        {formatDate(bl.date)}
                      </td>
                      <td className="py-2 px-3 text-slate-900 font-medium">
                        {bl.client_nom}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">
                        {formatCurrency(bl.total_ht, false)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600">
                        {formatCurrency(bl.total_tva, false)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-950 bg-slate-100/50">
                        {formatCurrency(bl.total_ttc, false)}
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
                              {bl.facture_numero ? bl.facture_numero : 'Facturé'}
                            </span>
                          ) : (
                            <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                              ⏳ En attente
                            </span>
                          )
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">{isAnnule ? 'Annulé' : 'À valider'}</span>
                        )}
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* 1. If Brouillon: allow Edit and Validate directly */}
                          {isBrouillon && (
                            <>
                              {onEditBl && (
                                <button
                                  onClick={() => onEditBl(bl)}
                                  className="p-1 hover:bg-blue-100 text-blue-700 rounded transition"
                                  title="Modifier le Brouillon"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {onUpdateBlState && (
                                <button
                                  onClick={() => {
                                    onUpdateBlState(bl.id, 'Validé');
                                  }}
                                  className="p-1 hover:bg-emerald-100 text-emerald-700 rounded transition"
                                  title="Valider le BL (Déstockage)"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {onUpdateBlState && (
                                <button
                                  onClick={() => {
                                    onUpdateBlState(bl.id, 'Annulé');
                                  }}
                                  className="p-1 hover:bg-rose-100 text-rose-700 rounded transition"
                                  title="Annuler le BL"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}

                          {/* 2. If Validé: allow Annuler (reverts stock) */}
                          {isValide && (
                            <>
                              {onUpdateBlState && (
                                <button
                                  onClick={() => {
                                    onUpdateBlState(bl.id, 'Annulé');
                                  }}
                                  className="p-1 hover:bg-amber-100 text-amber-700 rounded transition"
                                  title="Annuler le BL (Réintégration stock)"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}

                          {/* 3. If Annulé: allow Set to Draft to Edit! */}
                          {isAnnule && (
                            <>
                              {onUpdateBlState && (
                                <button
                                  onClick={() => {
                                    onUpdateBlState(bl.id, 'Brouillon');
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
                            onClick={() => onViewBl(bl)}
                            className="p-1 hover:bg-slate-200 text-slate-600 hover:text-emerald-600 rounded transition"
                            title="Aperçu Bon de Livraison"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => generateBlPdf(bl, company)}
                            className="p-1 hover:bg-slate-200 text-slate-600 hover:text-emerald-600 rounded transition"
                            title="Télécharger PDF BL"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Supprimer définitivement le bon de livraison ${bl.numero} ?`)) {
                                onDeleteBl(bl.id);
                              }
                            }}
                            className="p-1 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded transition"
                            title="Supprimer BL"
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
              <tr className="bg-slate-900 text-white font-bold divide-x divide-slate-800 text-xs">
                <td colSpan={4} className="py-2.5 px-3 text-right uppercase tracking-wider">
                  Total Sélection / Filtre ({filteredBls.length} BLs • {totalLines} lignes) :
                </td>
                <td className="py-2.5 px-3 text-right font-mono">
                  {formatCurrency(totals.totalHt, false)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono">
                  {formatCurrency(totals.totalTva, false)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-emerald-400 bg-slate-950 font-extrabold">
                  {formatCurrency(totals.totalTtc, false)}
                </td>
                <td colSpan={3} className="py-2.5 px-3 text-center text-slate-400">
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
          totalItems={filteredBls.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          itemLabel="bons de livraison"
        />
      </div>
    </div>
  );
};
