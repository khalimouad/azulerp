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
} from 'lucide-react';

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
    }).sort((a, b) =>
      compareDocumentNumbersDesc(a.numero, b.numero) ||
      (a.client_nom || '').localeCompare(b.client_nom || '', 'fr', { sensitivity: 'base' }) ||
      new Date(b.date).getTime() - new Date(a.date).getTime() ||
      b.id - a.id
    );
  }, [safeBrs, filterStatut, searchQuery, filterStartDate, filterEndDate]);

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

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-rose-100 text-rose-700">
              <RotateCcw className="w-5 h-5" />
            </span>
            Bons de Retour (BR)
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              {filteredBrs.length} BR • {totalLines} lignes
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Retours de marchandises avec réintégration en stock lors de la validation et déduction nette sur facture
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition active:scale-95 disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              Déduire les {selectedBrIds.length} BR dans la facture
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={onOpenNewBr}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            + Nouveau Bon de Retour
          </button>
        </div>
      </div>

      {/* Filter Tabs, Date Range & Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => setFilterStatut('ALL')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filterStatut === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Tous ({counts.all})
          </button>
          <button
            onClick={() => setFilterStatut('VALIDE')}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
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
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
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
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
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
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
              filterStatut === 'ATTENTE'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-white text-amber-700 hover:bg-amber-50 border border-amber-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            En attente déduction ({counts.attente})
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
            variant="rose"
          />

          <div className="w-full sm:w-56">
            <input
              type="text"
              placeholder="Rechercher BR, Client, Motif..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 text-slate-800 rounded-lg border border-slate-300 focus:outline-none focus:bg-white focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>
      </div>

      {/* Multi-client Warning */}
      {!isSingleClientSelected && selectedBrIds.length > 1 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
          <span>⚠️ Attention: Vous avez sélectionné des BR de plusieurs clients distincts. Veuillez sélectionner des BR du même client.</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-semibold divide-x divide-slate-800">
                <th className="py-2.5 px-3 w-10 text-center">
                  <button
                    onClick={toggleSelectAll}
                    className="text-white hover:text-rose-200 transition"
                    title="Sélectionner tous les BR validés en attente"
                  >
                    {selectedBrIds.length > 0 &&
                    selectedBrIds.length === filteredBrs.filter((b) => b.etat !== 'Brouillon' && b.etat !== 'Annulé' && !b.facture_id && !b.facture_numero).length ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-2.5 px-3 min-w-[100px]">N° BR</th>
                <th className="py-2.5 px-3 min-w-[90px]">Date</th>
                <th className="py-2.5 px-3 min-w-[180px]">Client / Société</th>
                <th className="py-2.5 px-3 min-w-[150px]">Motif du Retour</th>
                <th className="py-2.5 px-3 text-right min-w-[90px]">Total HT (-)</th>
                <th className="py-2.5 px-3 text-right min-w-[80px]">TVA (-)</th>
                <th className="py-2.5 px-3 text-right min-w-[100px] font-bold text-rose-300">Total TTC (-)</th>
                <th className="py-2.5 px-3 text-center min-w-[100px]">État Document</th>
                <th className="py-2.5 px-3 text-center min-w-[110px]">Facturation</th>
                <th className="py-2.5 px-3 text-center min-w-[140px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
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
                      className={`cursor-pointer hover:bg-rose-50/40 transition focus:outline-none focus:ring-2 focus:ring-inset focus:ring-rose-500 divide-x divide-slate-100 ${
                        isAnnule
                          ? 'bg-rose-50/30 opacity-75'
                          : isBrouillon
                          ? 'bg-slate-50/70'
                          : isSelected
                          ? 'bg-rose-50 font-medium'
                          : 'even:bg-slate-50/50'
                      }`}
                    >
                      <td className="py-2 px-3 text-center">
                        {isAttente ? (
                          <button
                            onClick={() => toggleSelectBr(br.id)}
                            className="text-rose-600 hover:text-rose-800 transition"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-rose-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono font-semibold text-slate-900">
                        <span className={isAnnule ? 'line-through text-slate-400' : ''}>{br.numero}</span>
                      </td>
                      <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
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
                      <td className="py-1.5 px-2 text-center">
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
              <tr className="bg-slate-900 text-white font-bold divide-x divide-slate-800 text-xs">
                <td colSpan={5} className="py-2.5 px-3 text-right uppercase tracking-wider">
                  Total Déductions BR ({filteredBrs.length} retours • {totalLines} lignes) :
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-rose-300">
                  -{formatCurrency(totals.totalHt, false)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-rose-300">
                  -{formatCurrency(totals.totalTva, false)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-rose-400 bg-slate-950 font-extrabold">
                  -{formatCurrency(totals.totalTtc, false)}
                </td>
                <td colSpan={3} className="py-2.5 px-3 text-center text-slate-400">
                  MAD (DH)
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Table Pagination */}
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
    </div>
  );
};
