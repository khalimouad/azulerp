'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Reglement } from '@/lib/types';
import { formatCurrency, formatDate, getCurrentYearDateRange, toNumeric } from '@/lib/utils';
import { Plus, Search, Trash2, Pencil } from 'lucide-react';
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
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

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3 border-b border-slate-200 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
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

          <div className="text-xs font-semibold text-slate-700">
            Total encaissé affiché :{' '}
            <span className="font-mono text-emerald-700 text-sm font-bold">
              {formatCurrency(totalEncaisse)}
            </span>
          </div>
        </div>

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
        <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-3 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
          <span className="text-slate-500">
            {filtered.length === 0
              ? 'Aucun règlement'
              : `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filtered.length)} sur ${filtered.length}`}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 font-semibold text-slate-700 disabled:opacity-40"
            >
              Précédent
            </button>
            <span className="min-w-24 text-center font-bold text-slate-700">
              Page {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 font-semibold text-slate-700 disabled:opacity-40"
            >
              Suivant
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
            compact
          />
        </div>
      </div>
    </div>
  );
};
