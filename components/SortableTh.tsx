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
      className={`py-2.5 px-3 uppercase text-[11px] font-bold tracking-wider select-none ${
        isSortable
          ? 'cursor-pointer hover:bg-slate-800 transition-colors'
          : ''
      } ${className}`}
      onClick={() => isSortable && sortKey && onSort && onSort(sortKey)}
      title={title || (isSortable ? `Trier par ${label}` : undefined)}
    >
      <div className={`flex items-center gap-1.5 inline-flex w-full ${alignClass}`}>
        <span>{children || label}</span>
        {isSortable && (
          <span className="text-slate-400 shrink-0">
            {isSorted ? (
              currentSortDir === 'asc' ? (
                <ArrowUp className="w-3.5 h-3.5 text-blue-400" />
              ) : (
                <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
              )
            ) : (
              <ArrowUpDown className="w-3 h-3 opacity-30 hover:opacity-100" />
            )}
          </span>
        )}
      </div>
    </th>
  );
};
