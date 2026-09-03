'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Devis, CompanyInfo } from '@/lib/types';
import { formatCurrency, formatDate, getCurrentYearDateRange, toNumeric } from '@/lib/utils';
import { TablePagination } from '@/components/TablePagination';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { generateDevisPdf } from '@/lib/pdf-generator';
import { Plus, Printer, Trash2, Eye, FileSpreadsheet, Search, SlidersHorizontal, X } from 'lucide-react';

interface DevisViewProps {
  devisList: Devis[];
  company: CompanyInfo;
  onOpenNewDevis: () => void;
  onViewDevis: (devis: Devis) => void;
  onDeleteDevis: (id: number) => void;
}

export const DevisView: React.FC<DevisViewProps> = ({
  devisList,
  company,
  onOpenNewDevis,
  onViewDevis,
  onDeleteDevis,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStartDate, setFilterStartDate] = useState(() => getCurrentYearDateRange().start);
  const [filterEndDate, setFilterEndDate] = useState(() => getCurrentYearDateRange().end);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStartDate, filterEndDate]);

  const filteredDevis = useMemo(() => {
    return devisList.filter((d) => {
      const docDate = d.date ? d.date.slice(0, 10) : '';
      if (filterStartDate && docDate < filterStartDate) return false;
      if (filterEndDate && docDate > filterEndDate) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchNum = d.numero.toLowerCase().includes(q);
        const matchClient = d.client_nom.toLowerCase().includes(q);
        if (!matchNum && !matchClient) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id - a.id);
  }, [devisList, searchQuery, filterStartDate, filterEndDate]);

  const paginatedDevis = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDevis.slice(start, start + pageSize);
  }, [filteredDevis, currentPage, pageSize]);

  const totals = useMemo(() => filteredDevis.reduce(
    (acc, devis) => {
      acc.totalHt += toNumeric(devis.total_ht);
      acc.totalTva += toNumeric(devis.total_tva);
      acc.totalTtc += toNumeric(devis.total_ttc);
      return acc;
    },
    { totalHt: 0, totalTva: 0, totalTtc: 0 }
  ), [filteredDevis]);

  return (
    <div className="space-y-4">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER (Compact on mobile, full on desktop) */}
      {/* ========================================================================= */}
      {/* Mobile Top Header (sm:hidden) */}
      <div className="flex items-center justify-between gap-2 p-3 bg-white rounded-xl border border-slate-200 shadow-xs sm:hidden">
        <div className="flex items-center gap-2 min-w-0">
          <FileSpreadsheet className="w-5 h-5 text-indigo-600 shrink-0" />
          <div className="min-w-0">
            <h2 className="font-bold text-slate-900 text-sm truncate flex items-center gap-1.5">
              Offres & Devis
              <span className="text-[11px] font-semibold px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {filteredDevis.length}
              </span>
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onOpenNewDevis}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-xs active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Devis</span>
          </button>
        </div>
      </div>

      {/* Desktop Top Header (hidden sm:flex) */}
      <div className="hidden sm:flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            Offres de Prix & Devis
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              {filteredDevis.length} devis
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Émission et impression d'offres de prix et propositions commerciales (sans impact sur les stocks)
          </p>
        </div>

        <button
          onClick={onOpenNewDevis}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          + Nouveau Devis
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
              placeholder="Rechercher devis, client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-2 text-xs bg-white text-slate-800 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
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
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filtres</span>
            {(filterStartDate || filterEndDate) && (
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
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
              variant="indigo"
            />
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. DESKTOP SEARCH & DATE FILTER BAR (hidden md:block) */}
      {/* ========================================================================= */}
      <div className="hidden md:flex bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher devis, client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 text-slate-800 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <DateRangeFilter
          startDate={filterStartDate}
          endDate={filterEndDate}
          onDateChange={(start, end) => {
            setFilterStartDate(start);
            setFilterEndDate(end);
          }}
          variant="indigo"
          compact
        />
      </div>

      {/* ========================================================================= */}
      {/* 4. MOBILE CARDS LIST (md:hidden) */}
      {/* ========================================================================= */}
      <div className="md:hidden space-y-3">
        {filteredDevis.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
            Aucun devis enregistré.
          </div>
        ) : (
          paginatedDevis.map((devis) => (
            <div
              key={devis.id}
              className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition hover:border-slate-300"
            >
              {/* Card Header */}
              <div className="p-3.5 pb-2.5 border-b border-slate-100 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono font-extrabold text-sm text-indigo-900">
                      {devis.numero}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatDate(devis.date)}
                    </span>
                  </div>
                  {devis.date_validite && (
                    <div className="text-[11px] text-slate-500">
                      Validité : {formatDate(devis.date_validite)}
                    </div>
                  )}
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                    devis.statut === 'Accepté'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : devis.statut === 'Refusé'
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                  }`}
                >
                  {devis.statut || 'En attente'}
                </span>
              </div>

              {/* Card Body */}
              <div
                className="p-3.5 space-y-2 cursor-pointer hover:bg-slate-50/50 transition"
                onClick={() => onViewDevis(devis)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                      Client / Prospect
                    </span>
                    <div className="font-bold text-slate-900 text-xs truncate">
                      {devis.client_nom}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                      Total TTC
                    </span>
                    <div className="font-mono font-extrabold text-base text-emerald-700">
                      {formatCurrency(devis.total_ttc)}
                    </div>
                  </div>
                </div>

                {/* HT & TVA */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>HT: {formatCurrency(devis.total_ht, false)}</span>
                  <span>TVA: {formatCurrency(devis.total_tva, false)}</span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="bg-slate-50/90 px-3 py-2 border-t border-slate-100 flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onViewDevis(devis)}
                    className="flex items-center gap-1 px-3 min-h-[36px] rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition active:scale-95 touch-manipulation"
                  >
                    <Eye className="w-4 h-4 text-indigo-600" />
                    <span>Aperçu</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => generateDevisPdf(devis, company)}
                    className="flex items-center gap-1 px-2.5 min-h-[36px] rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition active:scale-95 touch-manipulation"
                    title="Télécharger PDF"
                  >
                    <Printer className="w-4 h-4 text-slate-600" />
                    <span>PDF</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Supprimer définitivement le devis ${devis.numero} ?`)) {
                      onDeleteDevis(devis.id);
                    }
                  }}
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition active:scale-95 touch-manipulation"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}

        {/* Mobile Summary Box */}
        {filteredDevis.length > 0 && (
          <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-xs text-xs flex items-center justify-between font-mono">
            <div>
              <div className="text-[10px] text-slate-400 font-sans uppercase">Total devis ({filteredDevis.length})</div>
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
      {/* 5. DESKTOP TABLE (hidden md:block) */}
      {/* ========================================================================= */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-indigo-900 text-white font-semibold divide-x divide-indigo-800">
                <th className="py-2.5 px-3 min-w-[110px]">N° Devis</th>
                <th className="py-2.5 px-3 min-w-[95px]">Date</th>
                <th className="py-2.5 px-3 min-w-[100px]">Validité</th>
                <th className="py-2.5 px-3 min-w-[200px]">Client / Prospect</th>
                <th className="py-2.5 px-3 text-right min-w-[100px]">Total HT</th>
                <th className="py-2.5 px-3 text-right min-w-[90px]">Total TVA</th>
                <th className="py-2.5 px-3 text-right min-w-[110px] font-bold">Total TTC</th>
                <th className="py-2.5 px-3 text-center min-w-[90px]">Statut</th>
                <th className="py-2.5 px-3 text-center min-w-[90px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredDevis.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Aucun devis enregistré.
                  </td>
                </tr>
              ) : (
                paginatedDevis.map((devis) => (
                  <tr key={devis.id} className="hover:bg-indigo-50/50 transition divide-x divide-slate-100 even:bg-slate-50/40">
                    <td className="py-2 px-3 font-mono font-semibold text-indigo-900">
                      {devis.numero}
                    </td>
                    <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                      {formatDate(devis.date)}
                    </td>
                    <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                      {formatDate(devis.date_validite)}
                    </td>
                    <td className="py-2 px-3 text-slate-900 font-medium">
                      {devis.client_nom}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-700">
                      {formatCurrency(devis.total_ht, false)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-600">
                      {formatCurrency(devis.total_tva, false)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-950 bg-slate-100/50">
                      {formatCurrency(devis.total_ttc, false)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          devis.statut === 'Accepté'
                            ? 'bg-emerald-100 text-emerald-800'
                            : devis.statut === 'Refusé'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}
                      >
                        {devis.statut}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onViewDevis(devis)}
                          className="p-1 hover:bg-slate-200 text-slate-600 hover:text-indigo-600 rounded transition"
                          title="Aperçu Devis"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => generateDevisPdf(devis, company)}
                          className="p-1 hover:bg-slate-200 text-slate-600 hover:text-emerald-600 rounded transition"
                          title="Télécharger PDF Devis"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Supprimer définitivement le devis ${devis.numero} ?`)) {
                              onDeleteDevis(devis.id);
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
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white font-bold divide-x divide-slate-800 text-xs">
                <td colSpan={4} className="py-2.5 px-3 text-right uppercase tracking-wider">
                  Cumul Filtre ({filteredDevis.length} devis) :
                </td>
                <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(totals.totalHt, false)}</td>
                <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(totals.totalTva, false)}</td>
                <td className="py-2.5 px-3 text-right font-mono text-emerald-400 bg-slate-950 font-extrabold">{formatCurrency(totals.totalTtc, false)}</td>
                <td colSpan={2} className="py-2.5 px-3 text-center text-slate-400">MAD (DH)</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Shared Pagination */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <TablePagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={filteredDevis.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          itemLabel="devis"
        />
      </div>
    </div>
  );
};
