'use client';

import React from 'react';
import { CheckSquare } from 'lucide-react';

export interface TableBulkActionBarProps {
  selectedCount: number;
  itemLabel?: string;
  onClearSelection: () => void;
  children: React.ReactNode;
  className?: string;
}

export const TableBulkActionBar: React.FC<TableBulkActionBarProps> = ({
  selectedCount,
  itemLabel = 'élément(s)',
  onClearSelection,
  children,
  className = '',
}) => {
  if (selectedCount <= 0) return null;

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 px-3.5 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs animate-in fade-in slide-in-from-top-1 shadow-2xs ${className}`}>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
        <span className="font-bold text-blue-900">
          {selectedCount} {itemLabel} sélectionné{selectedCount > 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {children}

        <button
          type="button"
          onClick={onClearSelection}
          className="text-xs text-slate-500 hover:text-slate-800 ml-1.5 underline cursor-pointer"
        >
          Désélectionner tout
        </button>
      </div>
    </div>
  );
};
