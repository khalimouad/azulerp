'use client';

import React, { useState, useMemo } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Download,
  CheckSquare,
  Square,
  X,
} from 'lucide-react';
import { TablePagination } from './TablePagination';

export interface ERPColumn<T> {
  key: string;
  header: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
  minWidth?: string;
  className?: string;
  render?: (item: T, index: number) => React.ReactNode;
  accessor?: (item: T) => any;
  aggregate?: 'sum' | 'count' | 'avg' | ((items: T[]) => React.ReactNode);
}

export interface BulkAction<T> {
  label: string;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  onClick: (selectedItems: T[], selectedIds: (string | number)[]) => void;
}

export interface ERPDataTableProps<T> {
  data: T[];
  columns: ERPColumn<T>[];
  idKey?: keyof T;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchFields?: (keyof T | string)[];
  selectable?: boolean;
  selectedIds?: (string | number)[];
  onSelectionChange?: (selectedIds: (string | number)[]) => void;
  bulkActions?: BulkAction<T>[];
  initialSortKey?: string;
  initialSortDir?: 'asc' | 'desc';
  pageSize?: number;
  pageSizeOptions?: number[];
  itemLabel?: string;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  onRowDoubleClick?: (item: T) => void;
  selectedRowId?: string | number | null;
  showTotals?: boolean;
  csvExportFilename?: string;
  toolbarRightContent?: React.ReactNode;
  stickyHeader?: boolean;
  className?: string;
}

export function ERPDataTable<T extends Record<string, any>>({
  data = [],
  columns = [],
  idKey = 'id' as keyof T,
  searchable = true,
  searchPlaceholder = 'Rechercher...',
  searchFields,
  selectable = false,
  selectedIds: controlledSelectedIds,
  onSelectionChange,
  bulkActions = [],
  initialSortKey,
  initialSortDir = 'asc',
  pageSize: initialPageSize = 25,
  pageSizeOptions = [10, 25, 50, 100],
  itemLabel = 'enregistrements',
  emptyMessage = 'Aucun élément trouvé',
  onRowClick,
  onRowDoubleClick,
  selectedRowId,
  showTotals = false,
  csvExportFilename = 'export_erp.csv',
  toolbarRightContent,
  stickyHeader = true,
  className = '',
}: ERPDataTableProps<T>) {
  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Sort state
  const [sortKey, setSortKey] = useState<string | undefined>(initialSortKey);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(initialSortDir);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Selection state (internal if not controlled)
  const [internalSelectedIds, setInternalSelectedIds] = useState<(string | number)[]>([]);
  const selectedIds = controlledSelectedIds ?? internalSelectedIds;

  const updateSelectedIds = (newIds: (string | number)[]) => {
    if (onSelectionChange) onSelectionChange(newIds);
    setInternalSelectedIds(newIds);
  };

  // Handle Sort
  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === 'asc') {
        setSortDir('desc');
      } else {
        setSortKey(undefined);
        setSortDir('asc');
      }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  // Filter Data
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase().trim();

    return data.filter((item) => {
      if (searchFields && searchFields.length > 0) {
        return searchFields.some((field) => {
          const val = item[field as keyof T];
          return val !== undefined && val !== null && String(val).toLowerCase().includes(term);
        });
      }

      // Default: search all column keys and values
      return columns.some((col) => {
        const val = col.accessor ? col.accessor(item) : item[col.key];
        return val !== undefined && val !== null && String(val).toLowerCase().includes(term);
      });
    });
  }, [data, searchTerm, searchFields, columns]);

  // Sort Data
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    const col = columns.find((c) => c.key === sortKey);

    return [...filteredData].sort((a, b) => {
      const valA = col?.accessor ? col.accessor(a) : a[sortKey];
      const valB = col?.accessor ? col.accessor(b) : b[sortKey];

      if (valA === undefined || valA === null) return sortDir === 'asc' ? 1 : -1;
      if (valB === undefined || valB === null) return sortDir === 'asc' ? -1 : 1;

      // Numeric comparison
      const numA = Number(valA);
      const numB = Number(valB);
      if (!isNaN(numA) && !isNaN(numB) && typeof valA !== 'boolean' && typeof valB !== 'boolean') {
        return sortDir === 'asc' ? numA - numB : numB - numA;
      }

      // Date comparison
      const isDate = String(valA).match(/^\d{4}-\d{2}-\d{2}/);
      if (isDate) {
        const dateA = new Date(valA).getTime();
        const dateB = new Date(valB).getTime();
        if (!isNaN(dateA) && !isNaN(dateB)) {
          return sortDir === 'asc' ? dateA - dateB : dateB - dateA;
        }
      }

      // Default string comparison
      return sortDir === 'asc'
        ? String(valA).localeCompare(String(valB), 'fr', { sensitivity: 'base' })
        : String(valB).localeCompare(String(valA), 'fr', { sensitivity: 'base' });
    });
  }, [filteredData, sortKey, sortDir, columns]);

  // Paginated Data
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  // Master Selection Helpers
  const isAllPageSelected =
    paginatedData.length > 0 &&
    paginatedData.every((item) => selectedIds.includes(item[idKey] as any));

  const toggleSelectAllPage = () => {
    const pageIds = paginatedData.map((item) => item[idKey] as any as (string | number));
    if (isAllPageSelected) {
      updateSelectedIds(selectedIds.filter((id) => !pageIds.includes(id)));
    } else {
      const merged = Array.from(new Set([...selectedIds, ...pageIds]));
      updateSelectedIds(merged);
    }
  };

  const toggleSelectRow = (id: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIds.includes(id)) {
      updateSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      updateSelectedIds([...selectedIds, id]);
    }
  };

  const clearSelection = () => {
    updateSelectedIds([]);
  };

  // CSV Export
  const handleExportCSV = () => {
    const exportItems = selectedIds.length > 0
      ? data.filter((item) => selectedIds.includes(item[idKey] as any))
      : sortedData;

    const headers = columns.map((col) => `"${col.header.replace(/"/g, '""')}"`);
    const rows = exportItems.map((item) =>
      columns
        .map((col) => {
          const val = col.accessor ? col.accessor(item) : item[col.key];
          if (val === null || val === undefined) return '""';
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(';')
    );

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', csvExportFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* 1. Control Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Left: Search input */}
        {searchable && (
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-white text-slate-800 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                title="Effacer la recherche"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* Right: Actions & Custom content */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {toolbarRightContent}

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs transition active:scale-95 cursor-pointer"
            title="Exporter en fichier CSV / Excel"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Export Excel</span>
          </button>
        </div>
      </div>

      {/* 2. Bulk Action Bar (when rows are selected) */}
      {selectable && selectedIds.length > 0 && (
        <div className="flex items-center justify-between gap-3 px-3.5 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span className="font-bold text-blue-900">
              {selectedIds.length} {itemLabel} sélectionné{selectedIds.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {bulkActions.map((action, idx) => {
              const selectedItems = data.filter((item) => selectedIds.includes(item[idKey]));
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => action.onClick(selectedItems, selectedIds)}
                  className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md shadow-2xs transition active:scale-95 cursor-pointer ${
                    action.variant === 'danger'
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : action.variant === 'success'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : action.variant === 'secondary'
                      ? 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {action.icon}
                  <span>{action.label}</span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={clearSelection}
              className="text-xs text-slate-500 hover:text-slate-800 ml-1 underline cursor-pointer"
            >
              Désélectionner
            </button>
          </div>
        </div>
      )}

      {/* 3. High-Density Unified ERP Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            {/* Unified Enterprise Header */}
            <thead className={`${stickyHeader ? 'sticky top-0 z-10' : ''} bg-slate-900 text-white font-semibold text-xs tracking-wider divide-x divide-slate-800 shadow-xs select-none`}>
              <tr>
                {/* Select All Checkbox */}
                {selectable && (
                  <th className="py-2.5 px-3 w-10 text-center">
                    <button
                      type="button"
                      onClick={toggleSelectAllPage}
                      className="text-slate-300 hover:text-white transition cursor-pointer flex items-center justify-center"
                      title={isAllPageSelected ? 'Désélectionner la page' : 'Sélectionner la page'}
                    >
                      {isAllPageSelected ? (
                        <CheckSquare className="w-4 h-4 text-blue-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </th>
                )}

                {/* Column Headers */}
                {columns.map((col) => {
                  const isSorted = sortKey === col.key;
                  const isSortable = col.sortable !== false;
                  const alignClass =
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                      ? 'text-center'
                      : 'text-left';

                  return (
                    <th
                      key={col.key}
                      style={{ width: col.width, minWidth: col.minWidth }}
                      className={`py-2.5 px-3 uppercase text-[11px] font-bold ${alignClass} ${
                        isSortable
                          ? 'cursor-pointer hover:bg-slate-800 transition-colors'
                          : ''
                      } ${col.className || ''}`}
                      onClick={() => isSortable && handleSort(col.key)}
                      title={isSortable ? `Trier par ${col.header}` : undefined}
                    >
                      <div className={`flex items-center gap-1.5 inline-flex ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                        <span>{col.header}</span>
                        {isSortable && (
                          <span className="text-slate-400">
                            {isSorted ? (
                              sortDir === 'asc' ? (
                                <ArrowUp className="w-3.5 h-3.5 text-blue-400" />
                              ) : (
                                <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3 h-3 opacity-40 hover:opacity-100" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Body */}
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (selectable ? 1 : 0)}
                    className="py-12 text-center text-slate-400 text-xs"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                paginatedData.map((item, rowIdx) => {
                  const id = item[idKey] as any as (string | number);
                  const isSelected = selectedIds.includes(id);
                  const isCurrent = selectedRowId !== undefined && selectedRowId === id;

                  return (
                    <tr
                      key={id !== undefined ? String(id) : rowIdx}
                      onClick={() => onRowClick && onRowClick(item)}
                      onDoubleClick={() => onRowDoubleClick && onRowDoubleClick(item)}
                      className={`divide-x divide-slate-100 transition-colors ${
                        onRowClick ? 'cursor-pointer' : ''
                      } ${
                        isSelected
                          ? 'bg-blue-50/90 font-medium border-l-4 border-l-blue-600'
                          : isCurrent
                          ? 'bg-indigo-50/80 font-medium'
                          : 'even:bg-slate-50/50 hover:bg-blue-50/60'
                      }`}
                    >
                      {/* Row Checkbox */}
                      {selectable && (
                        <td
                          className="py-2 px-3 text-center"
                          onClick={(e) => toggleSelectRow(id, e)}
                        >
                          <button
                            type="button"
                            className="cursor-pointer text-slate-400 hover:text-slate-700 flex items-center justify-center"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300" />
                            )}
                          </button>
                        </td>
                      )}

                      {/* Row Cells */}
                      {columns.map((col) => {
                        const alignClass =
                          col.align === 'right'
                            ? 'text-right'
                            : col.align === 'center'
                            ? 'text-center'
                            : 'text-left';

                        return (
                          <td
                            key={col.key}
                            className={`py-2 px-3 ${alignClass} ${col.className || ''}`}
                          >
                            {col.render
                              ? col.render(item, rowIdx)
                              : col.accessor
                              ? col.accessor(item)
                              : item[col.key] ?? '-'}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Summary / Totals Row */}
            {showTotals && paginatedData.length > 0 && (
              <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-mono font-bold text-slate-900 text-xs divide-x divide-slate-200">
                <tr>
                  {selectable && <td className="py-2.5 px-3 text-center">-</td>}
                  {columns.map((col, idx) => {
                    const alignClass =
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                        ? 'text-center'
                        : 'text-left';

                    if (idx === 0) {
                      return (
                        <td key={col.key} className={`py-2.5 px-3 uppercase text-[11px] font-sans ${alignClass}`}>
                          Totaux Page ({paginatedData.length})
                        </td>
                      );
                    }

                    if (typeof col.aggregate === 'function') {
                      return (
                        <td key={col.key} className={`py-2.5 px-3 ${alignClass}`}>
                          {col.aggregate(paginatedData)}
                        </td>
                      );
                    }

                    if (col.aggregate === 'sum') {
                      const sum = paginatedData.reduce((acc, row) => {
                        const val = Number(col.accessor ? col.accessor(row) : row[col.key]) || 0;
                        return acc + val;
                      }, 0);
                      return (
                        <td key={col.key} className={`py-2.5 px-3 ${alignClass}`}>
                          {sum.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      );
                    }

                    if (col.aggregate === 'count') {
                      return (
                        <td key={col.key} className={`py-2.5 px-3 ${alignClass}`}>
                          {paginatedData.length}
                        </td>
                      );
                    }

                    return <td key={col.key} className="py-2.5 px-3" />;
                  })}
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Integrated Dynamic Pagination */}
        <TablePagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={sortedData.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={pageSizeOptions}
          itemLabel={itemLabel}
        />
      </div>
    </div>
  );
}
