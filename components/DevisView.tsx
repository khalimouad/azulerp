'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Devis, CompanyInfo } from '@/lib/types';
import { formatCurrency, formatDate, getCurrentYearDateRange, toNumeric } from '@/lib/utils';
import { TablePagination } from '@/components/TablePagination';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { generateDevisPdf } from '@/lib/pdf-generator';
import { Plus, Printer, Trash2, Eye, FileSpreadsheet, Search } from 'lucide-react';

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
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
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

      {/* Search and Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3 border-b border-slate-200 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
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
                            onDeleteDevis(devis.id);
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

          {/* Devis Pagination */}
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
    </div>
  );
};
