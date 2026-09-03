'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Reglement } from '@/lib/types';
import { formatCurrency, formatDate, getCurrentYearDateRange, toNumeric } from '@/lib/utils';
import { Plus, Search, Trash2, Pencil, SlidersHorizontal, X, CreditCard } from 'lucide-react';
import { DateRangeFilter } from '@/components/DateRangeFilter';

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

  const filtered = useMemo(() => {
    return reglements.filter((r) => {
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
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id - a.id);
  }, [reglements, search, filterStartDate, filterEndDate]);

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

  return (
    <div className="space-y-4">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER (Compact on mobile, full on desktop) */}
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

      {/* Desktop Top Header (hidden sm:flex) */}
      <div className="hidden sm:flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-600" />
            Journal des Règlements & Encaissements
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {filtered.length} encaissements
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Suivi des paiements reçus par chèque, virement bancaire, traite ou espèces
          </p>
        </div>

        <button
          onClick={onOpenNewPayment}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          + Encaisser un Règlement
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 2. MOBILE SEARCH & QUICK FILTER CHIPS (md:hidden) */}
      {/* ========================================================================= */}
      <div className="space-y-2 md:hidden">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher client, N° facture, chèque..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-7 py-2 text-xs bg-white text-slate-800 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
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
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filtres</span>
            {(filterStartDate || filterEndDate) && (
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
            )}
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
              variant="emerald"
            />
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. DESKTOP SEARCH & SUMMARY BAR (hidden md:block) */}
      {/* ========================================================================= */}
      <div className="hidden md:flex bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher client, N° facture, chèque..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 text-slate-800 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="text-xs font-semibold text-slate-700">
            Total encaissé affiché :{' '}
            <span className="font-mono text-emerald-700 text-sm font-bold">
              {formatCurrency(totalEncaisse)}
            </span>
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
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white font-semibold divide-x divide-slate-700">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Client / Débiteur</th>
                <th className="py-2.5 px-3">Pièce Rattachée</th>
                <th className="py-2.5 px-3 text-right">Montant Encaissé</th>
                <th className="py-2.5 px-3">Mode</th>
                <th className="py-2.5 px-3">Banque & Réf</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Aucun règlement enregistré.
                  </td>
                </tr>
              ) : (
                paginatedReglements.map((r) => (
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
                    className="cursor-pointer hover:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500 divide-x divide-slate-100 even:bg-slate-50/40"
                  >
                    <td className="py-2 px-3 text-slate-600 whitespace-nowrap">{formatDate(r.date)}</td>
                    <td className="py-2 px-3 font-semibold text-slate-900">{r.client_nom}</td>
                    <td className="py-2 px-3 font-mono text-blue-700 font-medium">
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
                    <td className="py-1.5 px-2 text-center">
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
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white font-bold divide-x divide-slate-800 text-xs">
                <td colSpan={3} className="py-2.5 px-3 text-right uppercase">
                  Total Général Règlements :
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-emerald-400">
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
