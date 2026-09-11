'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Reglement } from '@/lib/types';
import { formatCurrency, formatDate, getCurrentYearDateRange, toNumeric } from '@/lib/utils';
import { Plus, Search, Trash2, Pencil, SlidersHorizontal, X, CreditCard, Download } from 'lucide-react';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { SortableTh } from '@/components/SortableTh';
import { TableBulkActionBar } from '@/components/TableBulkActionBar';

interface ReglementsViewProps {
  reglements: Reglement[];
  onOpenNewPayment: () => void;
  onEditReglement: (reglement: Reglement) => void;
  onDeleteReglement: (id: number) => void;
}

export const ReglementsView: React.FC<ReglementsViewProps> = ({
  reglements,
  onOpenNewPayment,
  onEditReglement,
  onDeleteReglement,
}) => {
  const [search, setSearch] = useState('');
  const [filterStartDate, setFilterStartDate] = useState(() => getCurrentYearDateRange().start);
  const [filterEndDate, setFilterEndDate] = useState(() => getCurrentYearDateRange().end);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 100;

  // Sorting and selection
  const [sortKey, setSortKey] = useState<string>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedReglementIds, setSelectedReglementIds] = useState<number[]>([]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filtered = useMemo(() => {
    const list = reglements.filter((r) => {
      const paymentDate = r.date ? r.date.slice(0, 10) : '';
      if (filterStartDate && paymentDate < filterStartDate) return false;
      if (filterEndDate && paymentDate > filterEndDate) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        String(r.client_nom || '').toLowerCase().includes(q) ||
        String(r.facture_numero || r.piece_numero || '').toLowerCase().includes(q) ||
        String(r.reference_paiement || '').toLowerCase().includes(q) ||
        String(r.banque || '').toLowerCase().includes(q)
      );
    });

    list.sort((a, b) => {
      let vA: any = '';
      let vB: any = '';
      if (sortKey === 'date') {
        vA = new Date(a.date).getTime() || 0;
        vB = new Date(b.date).getTime() || 0;
      } else if (sortKey === 'client_nom') {
        vA = a.client_nom || '';
        vB = b.client_nom || '';
      } else if (sortKey === 'piece_numero') {
        vA = a.facture_numero || a.piece_numero || '';
        vB = b.facture_numero || b.piece_numero || '';
      } else if (sortKey === 'montant') {
        vA = toNumeric(a.montant);
        vB = toNumeric(b.montant);
      } else if (sortKey === 'mode') {
        vA = a.mode || a.mode_reglement || '';
        vB = b.mode || b.mode_reglement || '';
      } else if (sortKey === 'banque') {
        vA = a.banque || '';
        vB = b.banque || '';
      }

      if (typeof vA === 'number' && typeof vB === 'number') {
        return sortDir === 'asc' ? vA - vB : vB - vA;
      }
      return sortDir === 'asc'
        ? String(vA).localeCompare(String(vB), 'fr', { numeric: true })
        : String(vB).localeCompare(String(vA), 'fr', { numeric: true });
    });

    return list;
  }, [reglements, search, filterStartDate, filterEndDate, sortKey, sortDir]);

  const totalEncaisse = useMemo(() => {
    return filtered.reduce((sum, r) => sum + toNumeric(r.montant), 0);
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedReglements = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [currentPage, filtered]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStartDate, filterEndDate]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const toggleSelectAll = () => {
    const pageIds = paginatedReglements.map((r) => r.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedReglementIds.includes(id));
    if (allSelected) {
      setSelectedReglementIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedReglementIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelectRow = (id: number) => {
    setSelectedReglementIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const exportSelectedToCsv = () => {
    const toExport = reglements.filter((r) => selectedReglementIds.includes(r.id));
    if (toExport.length === 0) return;
    const headers = ['Date', 'Client', 'Pièce Rattachée', 'Montant', 'Mode', 'Banque', 'Référence'];
    const rows = toExport.map((r) => [
      `"${r.date ? r.date.slice(0, 10) : ''}"`,
      `"${(r.client_nom || '').replace(/"/g, '""')}"`,
      `"${(r.facture_numero || r.piece_numero || '').replace(/"/g, '""')}"`,
      `"${toNumeric(r.montant).toFixed(2)}"`,
      `"${(r.mode || r.mode_reglement || '').replace(/"/g, '""')}"`,
      `"${(r.banque || '').replace(/"/g, '""')}"`,
      `"${(r.reference_paiement || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map((row) => row.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reglements_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Date popover state
  const [showDatePopup, setShowDatePopup] = useState(false);
  const datePopoverRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (datePopoverRef.current && !datePopoverRef.current.contains(e.target as Node)) {
        setShowDatePopup(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasActiveDateFilter = Boolean(filterStartDate || filterEndDate);

  return (
    <div className="space-y-2.5">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER (Compact on mobile, unified toolbar on desktop) */}
      {/* ========================================================================= */}
      {/* Mobile Top Header (sm:hidden) */}
      <div className="flex items-center justify-between gap-2 p-3 bg-white rounded-xl border border-slate-200 shadow-xs sm:hidden">
        <div className="flex items-center gap-2 min-w-0">
          <CreditCard className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="min-w-0">
            <h2 className="font-bold text-slate-900 text-sm truncate flex items-center gap-1.5">
              Règlements
              <span className="text-[11px] font-semibold px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {filtered.length}
              </span>
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onOpenNewPayment}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-xs active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Encaisser</span>
          </button>
        </div>
      </div>

      {/* Desktop Top Unified Toolbar (hidden sm:flex) */}
      <div className="hidden sm:flex items-center justify-between gap-3 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
        {/* Left: Title + Count + Date Popover */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight whitespace-nowrap">
                Encaissements Clients
              </h2>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                {filtered.length} reçus
              </span>
            </div>
          </div>

          <div className="h-4 w-px bg-slate-200" />

          {/* Date Popover */}
          <div className="relative" ref={datePopoverRef}>
            <button
              type="button"
              onClick={() => setShowDatePopup((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition shadow-2xs ${
                hasActiveDateFilter
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>Date / Période</span>
              {hasActiveDateFilter && (
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
              )}
              <span className="text-[10px] text-slate-400">▾</span>
            </button>

            {showDatePopup && (
              <div className="absolute left-0 mt-2 z-50 bg-white rounded-xl border border-slate-200 shadow-xl p-3.5 w-auto min-w-[320px] animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2.5">
                  <span className="text-xs font-bold text-slate-800">Filtrer par date d'encaissement</span>
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
                  variant="emerald"
                  compact
                />
              </div>
            )}
          </div>
        </div>

        {/* Right: Total Encaissement KPI + Action */}
        <div className="flex items-center gap-3">
          <div className="text-xs font-medium text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            Total affiché :{' '}
            <span className="font-mono text-emerald-700 text-xs font-extrabold">
              {formatCurrency(totalEncaisse)}
            </span>
          </div>

          <button
            onClick={onOpenNewPayment}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Encaisser</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MOBILE CARDS LIST (md:hidden) */}
      {/* ========================================================================= */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
            Aucun règlement enregistré.
          </div>
        ) : (
          paginatedReglements.map((r) => {
            const modeName = r.mode || r.mode_reglement || 'Virement';
            const isCheque = modeName.toLowerCase().includes('chèque') || modeName.toLowerCase().includes('cheque');
            const isVirement = modeName.toLowerCase().includes('virement');
            const isEspeces = modeName.toLowerCase().includes('espèce') || modeName.toLowerCase().includes('espece');

            return (
              <div
                key={r.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition hover:border-slate-300"
              >
                {/* Card Header */}
                <div className="p-3.5 pb-2.5 border-b border-slate-100 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-xs text-slate-800">
                        {formatDate(r.date)}
                      </span>
                    </div>
                    {r.facture_numero ? (
                      <span className="text-[11px] font-mono text-blue-700 font-semibold">
                        Facture : {r.facture_numero}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">
                        {r.piece_numero || 'Règlement compte client'}
                      </span>
                    )}
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      isCheque
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : isVirement
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : isEspeces
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {modeName}
                  </span>
                </div>

                {/* Card Body */}
                <div
                  className="p-3.5 space-y-2 cursor-pointer hover:bg-slate-50/50 transition"
                  onClick={() => onEditReglement(r)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Client / Débiteur
                      </span>
                      <div className="font-bold text-slate-900 text-xs truncate">
                        {r.client_nom}
                      </div>
                      {(r.banque || r.reference_paiement) && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {r.banque ? `${r.banque} ` : ''}
                          {r.reference_paiement ? `(N° ${r.reference_paiement})` : ''}
                        </div>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Montant
                      </span>
                      <div className="font-mono font-black text-base text-emerald-700">
                        {formatCurrency(r.montant)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Toolbar */}
                <div className="bg-slate-50/90 px-3 py-2 border-t border-slate-100 flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => onEditReglement(r)}
                    className="flex items-center gap-1 px-3 min-h-[36px] rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition active:scale-95 touch-manipulation"
                  >
                    <Pencil className="w-3.5 h-3.5 text-blue-600" />
                    <span>Modifier</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Supprimer définitivement ce règlement de ${formatCurrency(r.montant)} ?`)) {
                        onDeleteReglement(r.id);
                      }
                    }}
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition active:scale-95 touch-manipulation"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}

        {/* Mobile Summary Box */}
        {filtered.length > 0 && (
          <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xs text-xs flex items-center justify-between font-mono">
            <div>
              <div className="text-[10px] text-slate-400 font-sans uppercase">Total affiché ({filtered.length})</div>
              <div className="font-extrabold text-emerald-400 text-base">{formatCurrency(totalEncaisse)}</div>
            </div>
            <div className="text-right text-[11px] text-slate-300">
              <span>{paginatedReglements.length} par page</span>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. DESKTOP TABLE (hidden md:block) */}
      {/* ========================================================================= */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Bulk Action Bar */}
        <TableBulkActionBar
          selectedCount={selectedReglementIds.length}
          totalCount={filtered.length}
          onClearSelection={() => setSelectedReglementIds([])}
          actions={
            <button
              onClick={exportSelectedToCsv}
              className="px-2.5 py-1 text-xs font-semibold bg-white text-slate-700 hover:bg-slate-100 rounded border border-slate-300 flex items-center gap-1.5 shadow-xs transition"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              Exporter CSV ({selectedReglementIds.length})
            </button>
          }
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-semibold divide-x divide-slate-200 border-b border-slate-200 text-xs sticky top-0 z-10">
                <th className="py-2.5 px-3 text-center w-10">
                  <input
                    type="checkbox"
                    checked={
                      paginatedReglements.length > 0 &&
                      paginatedReglements.every((r) => selectedReglementIds.includes(r.id))
                    }
                    onChange={toggleSelectAll}
                    className="rounded border-slate-400 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer align-middle"
                    title="Tout sélectionner / désélectionner sur cette page"
                  />
                </th>
                <SortableTh label="Date" sortKey="date" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} width="w-28" />
                <SortableTh label="Client / Débiteur" sortKey="client_nom" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} minWidth="min-w-[180px]" />
                <SortableTh label="Pièce Rattachée" sortKey="piece_numero" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} width="w-48" />
                <SortableTh label="Montant Encaissé" sortKey="montant" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} align="right" width="w-36" />
                <SortableTh label="Mode" sortKey="mode" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} width="w-28" />
                <SortableTh label="Banque & Réf" sortKey="banque" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} minWidth="min-w-[150px]" />
                <th className="py-2.5 px-3 text-center w-20">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Aucun règlement enregistré.
                  </td>
                </tr>
              ) : (
                paginatedReglements.map((r) => {
                  const isSelected = selectedReglementIds.includes(r.id);

                  return (
                    <tr
                      key={r.id}
                      onClick={(event) => {
                        if (event.target instanceof Element && event.target.closest('button, input, a, select')) return;
                        onEditReglement(r);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onEditReglement(r);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      title="Ouvrir la fiche de cet encaissement"
                      className={`cursor-pointer transition-colors focus:outline-none divide-x divide-slate-200 border-b border-slate-200 ${
                        isSelected
                          ? 'bg-blue-50/90 font-medium'
                          : 'hover:bg-blue-50/40 even:bg-slate-50/30'
                      }`}
                    >
                      <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(r.id)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer align-middle"
                        />
                      </td>
                      <td className="py-2 px-3 text-slate-600 font-mono whitespace-nowrap">{formatDate(r.date)}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{r.client_nom}</td>
                      <td className="py-2 px-3 font-mono text-blue-600 hover:text-blue-800 underline font-medium">
                        {r.facture_numero || r.piece_numero || 'Règlement compte client'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                        {formatCurrency(r.montant)}
                      </td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-800">
                          {r.mode || r.mode_reglement || 'Virement'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-600">
                        {r.banque ? `${r.banque} ` : ''}
                        {r.reference_paiement ? `(N° ${r.reference_paiement})` : ''}
                      </td>
                      <td className="py-1.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEditReglement(r)}
                            className="p-1 hover:bg-blue-100 text-slate-400 hover:text-blue-700 rounded transition"
                            title="Modifier l’encaissement"
                            aria-label={`Modifier l’encaissement de ${r.client_nom}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Supprimer ce règlement de ${formatCurrency(r.montant)} ?`)) {
                                onDeleteReglement(r.id);
                              }
                            }}
                            className="p-1 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded transition"
                            title="Supprimer"
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
                <td colSpan={4} className="py-2.5 px-3 text-right uppercase tracking-wider text-slate-700">
                  Total Général Règlements :
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                  {formatCurrency(totalEncaisse)}
                </td>
                <td colSpan={3} className="py-2.5 px-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Shared Pagination */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs px-3 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <span className="text-slate-500">
          {filtered.length === 0
            ? 'Aucun règlement'
            : `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filtered.length)} sur ${filtered.length} règlements`}
        </span>
        <div className="flex items-center justify-between sm:justify-end gap-2">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            className="min-h-[36px] rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 font-semibold text-slate-700 disabled:opacity-40 transition"
          >
            Précédent
          </button>
          <span className="min-w-24 text-center font-bold text-slate-700 font-mono">
            Page {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            className="min-h-[36px] rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 font-semibold text-slate-700 disabled:opacity-40 transition"
          >
            Suivant
          </button>
        </div>
      </div>
    </div>
  );
};
