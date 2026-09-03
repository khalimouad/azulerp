'use client';

import React from 'react';
import {
  Search,
  FileText,
  Truck,
  Menu,
  LogOut,
  Lock,
  Users,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { AppUser } from '@/lib/types';
import { SyncStatusBadge } from './SyncStatusBadge';

interface HeaderProps {
  currentTab: string;
  onOpenNewBl: () => void;
  onOpenNewFacture: () => void;
  onOpenNewClient: () => void;
  onOpenNewProduit: () => void;
  onDataReload?: () => void;
  globalSearch: string;
  setGlobalSearch: (s: string) => void;
  selectedYear: string;
  setSelectedYear: (y: string) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (o: boolean) => void;
  currentUser?: AppUser | null;
  onLogout?: () => void;
  onLockScreen?: () => void;
  onOpenUserManagement?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNewBl,
  onOpenNewFacture,
  onDataReload,
  globalSearch,
  setGlobalSearch,
  selectedYear,
  setSelectedYear,
  mobileMenuOpen,
  setMobileMenuOpen,
  currentUser,
  onLogout,
  onLockScreen,
  onOpenUserManagement,
}) => {
  const [userDropdownOpen, setUserDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md select-none">
      {/* Primary Top Bar */}
      <div className="px-2.5 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-1.5 sm:gap-4">
        {/* Left: Mobile Toggle & Brand */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 min-w-0">
          <button
            type="button"
            id="mobile-menu-toggle-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800/90 active:bg-slate-700 rounded-xl transition touch-manipulation active:scale-95 shrink-0"
            aria-label="Ouvrir le menu de navigation"
            title="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-xs sm:text-sm text-white shadow-inner tracking-wider shrink-0">
              AZ
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="font-extrabold text-xs sm:text-base tracking-tight text-white flex items-center gap-1 truncate">
                  <span>AZULERP</span>
                  <span className="text-blue-400 font-bold text-[10px] sm:text-xs bg-blue-950/80 border border-blue-800/80 px-1.5 py-0.5 rounded-md">2026</span>
                </h1>
                <div className="shrink-0">
                  <SyncStatusBadge onDataReload={onDataReload} compact />
                </div>
              </div>
              <p className="text-[11px] text-slate-400 hidden lg:block truncate">
                Bons de Livraison (BL) • Facturation • Suivi Clients & Stocks
              </p>
            </div>
          </div>
        </div>

        {/* Center: Global Search & Year (Desktop view) */}
        <div className="hidden md:flex items-center gap-2 flex-1 max-w-lg mx-2">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="global-search-desktop"
              type="text"
              placeholder="Recherche rapide (N° BL, Facture, Client, ICE, Produit)..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-800/90 text-slate-100 placeholder-slate-400 rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
            {globalSearch && (
              <button
                type="button"
                onClick={() => setGlobalSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white p-1 rounded-md"
                title="Effacer"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center shrink-0">
            <select
              id="year-select-desktop"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-slate-800 text-slate-200 text-xs font-semibold py-2 px-2.5 rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="2026">Exercice 2026</option>
              <option value="2025">Exercice 2025</option>
              <option value="TOUS">Tous exercices</option>
            </select>
          </div>
        </div>

        {/* Right: Quick Action Buttons (Touch-friendly and responsive) */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Quick Create BL */}
          <button
            type="button"
            id="header-create-bl-btn"
            onClick={onOpenNewBl}
            className="flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 min-h-[44px] rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-xs transition touch-manipulation active:scale-95 whitespace-nowrap"
            title="Créer un nouveau Bon de Livraison"
          >
            <Truck className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">+ Nouveau BL</span>
            <span className="sm:hidden font-semibold text-[11px]">+ BL</span>
          </button>

          {/* Quick Create Facture */}
          <button
            type="button"
            id="header-create-facture-btn"
            onClick={onOpenNewFacture}
            className="flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 min-h-[44px] rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-xs transition touch-manipulation active:scale-95 whitespace-nowrap"
            title="Créer une nouvelle Facture"
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">+ Nouvelle Facture</span>
            <span className="sm:hidden font-semibold text-[11px]">+ Facture</span>
          </button>

          {/* User Profile & Session Menu */}
          {currentUser && (
            <div className="relative pl-0.5 sm:pl-1 border-l border-slate-700/80" ref={dropdownRef}>
              <button
                type="button"
                id="header-user-menu-btn"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center justify-center gap-2 min-h-[44px] min-w-[44px] p-1 sm:px-2.5 sm:py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700/90 active:bg-slate-700 border border-slate-700/80 text-white transition touch-manipulation active:scale-95"
                title="Options utilisateur & session"
                aria-label="Menu utilisateur"
              >
                <div className={`w-7 h-7 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                  currentUser.role === 'ADMIN'
                    ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                    : currentUser.role === 'CAISSE'
                    ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                    : 'bg-blue-500/30 text-blue-300 border border-blue-500/40'
                }`}>
                  {currentUser.avatar || currentUser.nom_complet.slice(0, 2).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-[11px] font-bold text-white leading-tight truncate max-w-[100px]">
                    {currentUser.nom_complet}
                  </div>
                  <div className="text-[9px] font-semibold text-slate-400">
                    {currentUser.role}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </button>

              {/* Dropdown Menu */}
              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-20px)] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 z-50 animate-fadeIn">
                  <div className="px-3.5 py-2.5 border-b border-slate-800/80">
                    <div className="font-bold text-xs text-white">{currentUser.nom_complet}</div>
                    <div className="text-[11px] text-slate-400 font-mono">@{currentUser.username}</div>
                    <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                      Rôle : {currentUser.role}
                    </div>
                  </div>

                  <div className="py-1">
                    {onLockScreen && (
                      <button
                        type="button"
                        id="user-menu-lock-btn"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onLockScreen();
                        }}
                        className="w-full min-h-[44px] px-3.5 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 flex items-center gap-2.5 transition text-left touch-manipulation"
                      >
                        <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Verrouiller l'écran</span>
                      </button>
                    )}

                    {currentUser.role === 'ADMIN' && onOpenUserManagement && (
                      <button
                        type="button"
                        id="user-menu-manage-users-btn"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onOpenUserManagement();
                        }}
                        className="w-full min-h-[44px] px-3.5 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 flex items-center gap-2.5 transition text-left touch-manipulation"
                      >
                        <Users className="w-4 h-4 text-blue-400 shrink-0" />
                        <span>Gestion des utilisateurs</span>
                      </button>
                    )}
                  </div>

                  {onLogout && (
                    <div className="pt-1 border-t border-slate-800/80">
                      <button
                        type="button"
                        id="user-menu-logout-btn"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onLogout();
                        }}
                        className="w-full min-h-[44px] px-3.5 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 flex items-center gap-2.5 transition text-left font-medium touch-manipulation"
                      >
                        <LogOut className="w-4 h-4 shrink-0" />
                        <span>Déconnexion</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Second Row: Search + Year Selector */}
      <div className="md:hidden px-2.5 pb-2.5 pt-1 flex items-center gap-2 border-t border-slate-800/60 bg-slate-900/95">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="global-search-mobile"
            type="text"
            placeholder="Rechercher BL, Facture, Client..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="w-full pl-9 pr-9 min-h-[44px] text-xs bg-slate-800 text-slate-100 placeholder-slate-400 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {globalSearch && (
            <button
              type="button"
              onClick={() => setGlobalSearch('')}
              className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[36px] min-h-[36px] flex items-center justify-center text-xs text-slate-400 hover:text-white rounded-lg active:scale-95"
              aria-label="Effacer la recherche"
            >
              ✕
            </button>
          )}
        </div>

        <select
          id="year-select-mobile"
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="bg-slate-800 text-slate-200 text-xs font-semibold min-h-[44px] px-2.5 rounded-xl border border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 shrink-0 touch-manipulation cursor-pointer"
        >
          <option value="2026">2026</option>
          <option value="2025">2025</option>
          <option value="TOUS">Tous</option>
        </select>
      </div>

    </header>
  );
};
