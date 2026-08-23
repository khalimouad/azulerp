'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface TablePaginationProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  itemLabel = 'éléments',
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, safeCurrentPage * pageSize);

  // Generate visible page numbers
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (safeCurrentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (safeCurrentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(safeCurrentPage - 1);
        pages.push(safeCurrentPage);
        pages.push(safeCurrentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white border-t border-slate-200 text-xs text-slate-600">
      {/* Left: Summary text & Page Size Selector */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
        <div className="text-slate-600 font-medium">
          Affichage de <span className="font-bold text-slate-900">{startItem}</span> à{' '}
          <span className="font-bold text-slate-900">{endItem}</span> sur{' '}
          <span className="font-bold text-slate-900">{totalItems}</span> {itemLabel}
        </div>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
            <span className="text-[11px] text-slate-500 hidden md:inline">Par page :</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Nombre d'éléments par page"
              className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / page
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Pagination Navigation Controls */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={safeCurrentPage === 1}
          title="Première page"
          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent transition"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        {/* Previous Page */}
        <button
          type="button"
          onClick={() => onPageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage === 1}
          title="Page précédente"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent transition font-semibold"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-[11px]">Précédent</span>
        </button>

        {/* Numbered Page Buttons */}
        <div className="flex items-center gap-1 px-1">
          {getPageNumbers().map((pageNum, idx) => {
            if (pageNum === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="px-1 text-slate-400 font-mono">
                  …
                </span>
              );
            }
            const isCurrent = pageNum === safeCurrentPage;
            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => onPageChange(Number(pageNum))}
                className={`min-w-[28px] h-7 px-2 flex items-center justify-center rounded-lg text-xs font-bold transition ${
                  isCurrent
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Next Page */}
        <button
          type="button"
          onClick={() => onPageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage === totalPages}
          title="Page suivante"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent transition font-semibold"
        >
          <span className="hidden sm:inline text-[11px]">Suivant</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Last Page */}
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={safeCurrentPage === totalPages}
          title="Dernière page"
          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent transition"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
