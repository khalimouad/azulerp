'use client';

import React, { useState } from 'react';
import { Calendar, CalendarDays, X, ChevronDown } from 'lucide-react';

export interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onDateChange: (start: string, end: string) => void;
  variant?: 'blue' | 'emerald' | 'rose' | 'indigo' | 'slate';
  className?: string;
  compact?: boolean;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  startDate,
  endDate,
  onDateChange,
  variant = 'blue',
  className = '',
  compact = false,
}) => {
  const [showPresetsDropdown, setShowPresetsDropdown] = useState(false);

  const formatToYMD = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const applyPreset = (preset: 'today' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'all') => {
    setShowPresetsDropdown(false);
    const now = new Date();

    if (preset === 'all') {
      onDateChange('', '');
      return;
    }

    if (preset === 'today') {
      const todayStr = formatToYMD(now);
      onDateChange(todayStr, todayStr);
      return;
    }

    if (preset === 'last7') {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      onDateChange(formatToYMD(start), formatToYMD(now));
      return;
    }

    if (preset === 'last30') {
      const start = new Date(now);
      start.setDate(start.getDate() - 29);
      onDateChange(formatToYMD(start), formatToYMD(now));
      return;
    }

    if (preset === 'thisMonth') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      onDateChange(formatToYMD(start), formatToYMD(end));
      return;
    }

    if (preset === 'lastMonth') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      onDateChange(formatToYMD(start), formatToYMD(end));
      return;
    }

    if (preset === 'thisYear') {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      onDateChange(formatToYMD(start), formatToYMD(end));
      return;
    }
  };

  const hasFilter = Boolean(startDate || endDate);

  // Variant classes
  const getThemeClasses = () => {
    switch (variant) {
      case 'emerald':
        return {
          border: 'border-emerald-200 focus-within:border-emerald-500',
          badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          btnActive: 'bg-emerald-600 text-white',
          btnHover: 'hover:bg-emerald-50 text-emerald-700',
          icon: 'text-emerald-600',
          ring: 'focus:ring-emerald-500',
        };
      case 'rose':
        return {
          border: 'border-rose-200 focus-within:border-rose-500',
          badge: 'bg-rose-50 text-rose-700 border-rose-200',
          btnActive: 'bg-rose-600 text-white',
          btnHover: 'hover:bg-rose-50 text-rose-700',
          icon: 'text-rose-600',
          ring: 'focus:ring-rose-500',
        };
      case 'indigo':
        return {
          border: 'border-indigo-200 focus-within:border-indigo-500',
          badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          btnActive: 'bg-indigo-600 text-white',
          btnHover: 'hover:bg-indigo-50 text-indigo-700',
          icon: 'text-indigo-600',
          ring: 'focus:ring-indigo-500',
        };
      case 'slate':
        return {
          border: 'border-slate-300 focus-within:border-slate-500',
          badge: 'bg-slate-100 text-slate-700 border-slate-200',
          btnActive: 'bg-slate-800 text-white',
          btnHover: 'hover:bg-slate-100 text-slate-700',
          icon: 'text-slate-600',
          ring: 'focus:ring-slate-500',
        };
      case 'blue':
      default:
        return {
          border: 'border-blue-200 focus-within:border-blue-500',
          badge: 'bg-blue-50 text-blue-700 border-blue-200',
          btnActive: 'bg-blue-600 text-white',
          btnHover: 'hover:bg-blue-50 text-blue-700',
          icon: 'text-blue-600',
          ring: 'focus:ring-blue-500',
        };
    }
  };

  const theme = getThemeClasses();

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {/* Date Inputs Box */}
      <div
        className={`flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border text-xs shadow-xs transition ${
          hasFilter ? `${theme.border} ring-1 ring-opacity-20` : 'border-slate-200'
        }`}
      >
        <Calendar className={`w-3.5 h-3.5 ${hasFilter ? theme.icon : 'text-slate-400'}`} />

        <span className="text-[11px] font-medium text-slate-400">Du</span>
        <input
          type="date"
          value={startDate}
          onChange={(e) => onDateChange(e.target.value, endDate)}
          className="bg-transparent text-slate-800 text-xs focus:outline-none focus:ring-0 p-0 font-medium"
          title="Date de début"
        />

        <span className="text-[11px] font-medium text-slate-400">au</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onDateChange(startDate, e.target.value)}
          className="bg-transparent text-slate-800 text-xs focus:outline-none focus:ring-0 p-0 font-medium"
          title="Date de fin"
        />

        {hasFilter && (
          <button
            type="button"
            onClick={() => onDateChange('', '')}
            className="p-0.5 ml-1 text-slate-400 hover:text-rose-600 rounded transition"
            title="Effacer les dates"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Quick Period Buttons / Dropdown */}
      <div className="relative flex items-center gap-1">
        {/* Desktop Quick Pills */}
        <div className="hidden lg:flex items-center gap-1 text-[11px]">
          <button
            type="button"
            onClick={() => applyPreset('thisMonth')}
            className={`px-2 py-1 rounded font-medium transition border ${
              !startDate && !endDate
                ? 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                : theme.btnHover + ' border-transparent'
            }`}
          >
            Ce mois
          </button>
          <button
            type="button"
            onClick={() => applyPreset('lastMonth')}
            className="px-2 py-1 rounded font-medium transition border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          >
            Mois dernier
          </button>
          <button
            type="button"
            onClick={() => applyPreset('last30')}
            className="px-2 py-1 rounded font-medium transition border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          >
            30 jours
          </button>
          <button
            type="button"
            onClick={() => applyPreset('thisYear')}
            className="px-2 py-1 rounded font-medium transition border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          >
            Année en cours
          </button>
          {hasFilter && (
            <button
              type="button"
              onClick={() => applyPreset('all')}
              className="px-2 py-1 rounded font-medium transition text-rose-600 hover:bg-rose-50 border border-rose-200 bg-white"
            >
              Tous
            </button>
          )}
        </div>

        {/* Dropdown for compact / mobile screens */}
        <div className="relative lg:hidden">
          <button
            type="button"
            onClick={() => setShowPresetsDropdown(!showPresetsDropdown)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border bg-white transition ${
              hasFilter ? theme.badge : 'text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Période</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showPresetsDropdown && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setShowPresetsDropdown(false)}
              />
              <div className="absolute left-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-30 text-xs animate-in fade-in zoom-in-95">
                <button
                  type="button"
                  onClick={() => applyPreset('today')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700"
                >
                  Aujourd&apos;hui
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('last7')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700"
                >
                  7 derniers jours
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('thisMonth')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700"
                >
                  Ce mois-ci
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('lastMonth')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700"
                >
                  Mois dernier
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('last30')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700"
                >
                  30 derniers jours
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('thisYear')}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700"
                >
                  Année en cours
                </button>
                <div className="border-t border-slate-100 my-1" />
                <button
                  type="button"
                  onClick={() => applyPreset('all')}
                  className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 font-medium"
                >
                  Toutes les dates
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
