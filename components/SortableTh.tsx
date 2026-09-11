'use client';

import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export interface SortableThProps {
  label: string;
  sortKey?: string;
  currentSortKey?: string;
  currentSortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  align?: 'left' | 'center' | 'right';
  className?: string;
  width?: string;
  minWidth?: string;
  style?: React.CSSProperties;
  title?: string;
  children?: React.ReactNode;
}

export const SortableTh: React.FC<SortableThProps> = ({
  label,
  sortKey,
  currentSortKey,
  currentSortDir = 'asc',
  onSort,
  align = 'left',
  className = '',
  width = '',
  minWidth = '',
  style,
  title,
  children,
}) => {
  const isSortable = Boolean(sortKey && onSort);
  const isSorted = sortKey && currentSortKey === sortKey;

  const alignClass =
    align === 'right'
      ? 'text-right justify-end'
      : align === 'center'
      ? 'text-center justify-center'
      : 'text-left justify-start';

  return (
    <th
      style={style}
      className={`py-2.5 px-3 text-xs font-semibold text-slate-700 select-none tracking-normal border-r border-slate-200 bg-slate-50 transition-colors ${width} ${minWidth} ${
        isSortable
          ? 'cursor-pointer hover:bg-slate-100 hover:text-slate-900'
          : ''
      } ${isSorted ? 'text-blue-700 bg-blue-50/40' : ''} ${className}`}
      onClick={() => isSortable && sortKey && onSort && onSort(sortKey)}
      title={title || (isSortable ? `Trier par ${label}` : undefined)}
    >
      <div className={`flex items-center gap-1.5 inline-flex w-full ${alignClass}`}>
        <span className="truncate">{children || label}</span>
        {isSortable && (
          <span className="shrink-0">
            {isSorted ? (
              currentSortDir === 'asc' ? (
                <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
              ) : (
                <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
              )
            ) : (
              <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 hover:opacity-100" />
            )}
          </span>
        )}
      </div>
    </th>
  );
};
