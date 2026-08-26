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
      {/* Title & Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
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

      {/* Filter Tabs: Document State & Payment Status & Date Range */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* State tabs */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">État :</span>
            <button
              onClick={() => setFilterEtat('ALL')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition ${
                filterEtat === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Toutes ({counts.all})
            </button>
            <button
              onClick={() => setFilterEtat('VALIDE')}
              className={`px-2.5 py-1.5 rounded-lg font-medium transition flex items-center gap-1 ${
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
              className={`px-2.5 py-1.5 rounded-lg font-medium transition flex items-center gap-1 ${
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
              className={`px-2.5 py-1.5 rounded-lg font-medium transition flex items-center gap-1 ${
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
          <div className="flex flex-wrap items-center gap-1 text-xs border-l border-slate-200 pl-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Règlement :</span>
            <button
              onClick={() => setFilterStatutPaiement('ALL')}
              className={`px-2 py-1 rounded text-xs transition ${
                filterStatutPaiement === 'ALL'
                  ? 'bg-blue-100 text-blue-800 font-bold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setFilterStatutPaiement('SOLDE')}
              className={`px-2 py-1 rounded text-xs transition ${
                filterStatutPaiement === 'SOLDE'
                  ? 'bg-emerald-100 text-emerald-800 font-bold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Soldées ({counts.solde})
            </button>
            <button
              onClick={() => setFilterStatutPaiement('PARTIEL')}
              className={`px-2 py-1 rounded text-xs transition ${
                filterStatutPaiement === 'PARTIEL'
                  ? 'bg-purple-100 text-purple-800 font-bold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Partielles ({counts.partiel})
            </button>
            <button
              onClick={() => setFilterStatutPaiement('IMPAYE')}
              className={`px-2 py-1 rounded text-xs transition ${
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

      {/* Main Grid Table matching WinDev Screenshot */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
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
                      onClick={() => setSelectedFactureId(facture.id)}
                      className={`cursor-pointer transition hover:bg-blue-50/70 divide-x divide-slate-100 ${
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
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            ✓ Validé
                          </span>
                        )}
                        {isBrouillon && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                            ✎ Brouillon
                          </span>
                        )}
                        {isAnnule && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-300">
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

          {/* Table Pagination */}
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
    </div>
  );
};
