'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  FileText,
  Truck,
  Menu,
  LogOut,
  Lock,
  Users,
  ShieldCheck,
  ChevronDown,
  Plus,
  Package,
  UserPlus,
  Layers,
  ChevronRight,
  Command,
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
  currentTab,
  onOpenNewBl,
  onOpenNewFacture,
  onOpenNewClient,
  onOpenNewProduit,
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
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const quickCreateRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (quickCreateRef.current && !quickCreateRef.current.contains(event.target as Node)) {
        setQuickCreateOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut Ctrl+K / Cmd+K for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Dynamic Breadcrumb Label Mapping
  const getBreadcrumb = (tab: string): { domain: string; page: string } => {
    switch (tab) {
      case 'dashboard':
        return { domain: 'Pilotage & IA', page: 'Tableau de bord' };
      case 'ai-copilot':
        return { domain: 'Pilotage & IA', page: 'Assistant IA Copilot (Gemini 3.8)' };
      case 'bl':
        return { domain: 'Ventes & Clients', page: 'Bons de Livraison (BL)' };
      case 'create-bl':
        return { domain: 'Ventes & Clients', page: 'Nouveau Bon de Livraison' };
      case 'br':
        return { domain: 'Ventes & Clients', page: 'Bons de Retour (BR)' };
      case 'create-br':
        return { domain: 'Ventes & Clients', page: 'Nouveau Bon de Retour' };
      case 'factures':
        return { domain: 'Ventes & Clients', page: 'Factures de Vente' };
      case 'create-facture':
        return { domain: 'Ventes & Clients', page: 'Nouvelle Facture de Vente' };
      case 'workflow-bl-facture':
        return { domain: 'Ventes & Clients', page: 'Workflow BL ➔ Facture' };
      case 'devis':
        return { domain: 'Ventes & Clients', page: 'Devis & Offres de Prix' };
      case 'create-devis':
        return { domain: 'Ventes & Clients', page: 'Nouveau Devis' };
      case 'reglements':
        return { domain: 'Ventes & Clients', page: 'Encaissements Clients' };
      case 'create-payment':
        return { domain: 'Ventes & Clients', page: 'Enregistrement Règlement' };
      case 'clients':
        return { domain: 'Ventes & Clients', page: 'Clients & Comptes' };
      case 'create-client':
        return { domain: 'Ventes & Clients', page: 'Fiche Client' };
      case 'fournisseurs':
        return { domain: 'Achats & Fournisseurs', page: 'Répertoire Fournisseurs' };
      case 'create-fournisseur':
        return { domain: 'Achats & Fournisseurs', page: 'Fiche Fournisseur' };
      case 'factures-fournisseurs':
        return { domain: 'Achats & Fournisseurs', page: "Factures d'Achat" };
      case 'paiements-fournisseurs':
        return { domain: 'Achats & Fournisseurs', page: 'Paiements & Chèques Fournisseurs' };
      case 'fournisseurs-reconciliation':
        return { domain: 'Achats & Fournisseurs', page: 'Rapprochement & Soldes' };
      case 'produits':
        return { domain: 'Stocks & Production', page: 'Articles & Stocks' };
      case 'create-produit':
        return { domain: 'Stocks & Production', page: 'Fiche Article' };
      case 'adjust-stock':
        return { domain: 'Stocks & Production', page: 'Mouvement de Stock' };
      case 'manufacturing-boms':
        return { domain: 'Stocks & Production', page: 'Nomenclatures (BOM)' };
      case 'create-bom':
        return { domain: 'Stocks & Production', page: 'Édition Nomenclature' };
      case 'manufacturing-orders':
        return { domain: 'Stocks & Production', page: 'Ordres de Fabrication (OF)' };
      case 'create-production-order':
        return { domain: 'Stocks & Production', page: 'Nouvel Ordre de Fabrication' };
      case 'accounting':
        return { domain: 'Comptabilité & Finance', page: 'Comptabilité Générale (PCGM)' };
      case 'create-journal-entry':
        return { domain: 'Comptabilité & Finance', page: 'Saisie Écriture Comptable' };
      case 'create-fixed-asset':
        return { domain: 'Comptabilité & Finance', page: 'Immobilisation & Amortissement' };
      case 'hr':
        return { domain: 'Ressources Humaines', page: 'Personnel & Paie (LF 2026)' };
      case 'create-employee':
        return { domain: 'Ressources Humaines', page: 'Fiche Collaborateur' };
      case 'create-leave':
        return { domain: 'Ressources Humaines', page: 'Demande de Congé' };
      case 'pos':
        return { domain: 'Point de Vente (POS)', page: 'Caisse & Terminal' };
      case 'pos-tickets':
        return { domain: 'Point de Vente (POS)', page: 'Historique des Ventes' };
      case 'pos-produits':
        return { domain: 'Point de Vente (POS)', page: 'Catalogue Caisse' };
      case 'pos-sessions':
        return { domain: 'Point de Vente (POS)', page: 'Sessions & Clôtures' };
      case 'etats':
        return { domain: 'Analytique & Configuration', page: 'États & Rapports' };
      case 'company':
        return { domain: 'Analytique & Configuration', page: 'Identifiants Société' };
      case 'sqlite':
        return { domain: 'Analytique & Configuration', page: 'Gestion Base Neon' };
      case 'preview-document':
        return { domain: 'Documents', page: 'Aperçu & Impression' };
      default:
        return { domain: 'AzulERP', page: 'Espace de travail' };
    }
  };

  const breadcrumb = getBreadcrumb(currentTab);

  return (
    <header className="bg-slate-950 text-white border-b border-slate-800/90 sticky top-0 z-30 shadow-lg select-none">
      {/* Primary Top Bar */}
      <div className="px-3 sm:px-5 py-2.5 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Mobile Toggle & Brand */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
          <button
            type="button"
            id="mobile-menu-toggle-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden min-w-[42px] min-h-[42px] flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800/90 active:bg-slate-700 rounded-xl transition touch-manipulation active:scale-95 shrink-0 cursor-pointer"
            aria-label="Ouvrir le menu de navigation"
            title="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-blue-500 to-indigo-600 flex items-center justify-center font-black text-xs sm:text-sm text-white shadow-md shadow-blue-500/20 tracking-wider shrink-0 ring-1 ring-blue-400/30">
              AZ
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="font-black text-sm sm:text-base tracking-tight text-white flex items-center gap-1.5 truncate">
                  <span>AZULERP</span>
                  <span className="text-blue-400 font-bold text-[10px] sm:text-xs bg-blue-950/80 border border-blue-800/80 px-1.5 py-0.5 rounded-md">
                    2026
                  </span>
                </h1>
                <div className="shrink-0 hidden xs:block">
                  <SyncStatusBadge onDataReload={onDataReload} compact />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Global Omnibox Search (Desktop view with Ctrl+K shortcut) */}
        <div className="hidden md:flex items-center gap-2 flex-1 max-w-xl mx-3">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              id="global-search-desktop"
              type="text"
              placeholder="Recherche globale (N° BL, Facture, Client, Produit, ICE)..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full pl-9 pr-16 py-2 text-xs bg-slate-900/90 text-slate-100 placeholder-slate-400 rounded-xl border border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition shadow-inner"
            />
            {globalSearch ? (
              <button
                type="button"
                onClick={() => setGlobalSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white p-1 rounded-md cursor-pointer"
                title="Effacer"
              >
                ✕
              </button>
            ) : (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 pointer-events-none">
                <Command className="w-2.5 h-2.5" /> K
              </span>
            )}
          </div>

          <div className="flex items-center shrink-0">
            <select
              id="year-select-desktop"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-slate-900 text-slate-200 text-xs font-semibold py-2 px-2.5 rounded-xl border border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm"
            >
              <option value="2026">Exercice 2026</option>
              <option value="2025">Exercice 2025</option>
              <option value="TOUS">Tous exercices</option>
            </select>
          </div>
        </div>

        {/* Right: Quick Action Buttons & Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Quick Create Dropdown Menu (Desktop & Tablet) */}
          <div className="relative" ref={quickCreateRef}>
            <button
              type="button"
              id="header-quick-create-btn"
              onClick={() => setQuickCreateOpen(!quickCreateOpen)}
              className="flex items-center justify-center gap-1 sm:gap-1.5 px-3 min-h-[38px] rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:from-blue-700 active:to-indigo-700 text-white shadow-md shadow-blue-600/20 transition touch-manipulation active:scale-95 cursor-pointer ring-1 ring-blue-400/30"
              title="Créer un nouveau document ou fiche"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Nouveau</span>
              <ChevronDown className="w-3.5 h-3.5 hidden sm:block opacity-75" />
            </button>

            {quickCreateOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2">
                <button
                  type="button"
                  onClick={() => {
                    setQuickCreateOpen(false);
                    onOpenNewBl();
                  }}
                  className="w-full px-3.5 py-2 text-xs text-slate-200 hover:text-white hover:bg-slate-800/90 flex items-center gap-2.5 transition text-left cursor-pointer"
                >
                  <Truck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Nouveau BL</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQuickCreateOpen(false);
                    onOpenNewFacture();
                  }}
                  className="w-full px-3.5 py-2 text-xs text-slate-200 hover:text-white hover:bg-slate-800/90 flex items-center gap-2.5 transition text-left cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Nouvelle Facture</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQuickCreateOpen(false);
                    onOpenNewClient();
                  }}
                  className="w-full px-3.5 py-2 text-xs text-slate-200 hover:text-white hover:bg-slate-800/90 flex items-center gap-2.5 transition text-left cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Nouveau Client</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQuickCreateOpen(false);
                    onOpenNewProduit();
                  }}
                  className="w-full px-3.5 py-2 text-xs text-slate-200 hover:text-white hover:bg-slate-800/90 flex items-center gap-2.5 transition text-left cursor-pointer"
                >
                  <Package className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Nouvel Article</span>
                </button>
              </div>
            )}
          </div>

          {/* User Profile & Session Menu */}
          {currentUser && (
            <div className="relative pl-1 border-l border-slate-800" ref={dropdownRef}>
              <button
                type="button"
                id="header-user-menu-btn"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center justify-center gap-2 min-h-[38px] p-1 sm:px-2.5 sm:py-1 rounded-xl bg-slate-900 hover:bg-slate-800/90 active:bg-slate-800 border border-slate-800 text-white transition touch-manipulation active:scale-95 cursor-pointer shadow-xs"
                title="Options utilisateur & session"
                aria-label="Menu utilisateur"
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                    currentUser.role === 'ADMIN'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : currentUser.role === 'CAISSE'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  }`}
                >
                  {currentUser.avatar || (currentUser.nom_complet || currentUser.username || 'AD').slice(0, 2).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-[11px] font-bold text-white leading-tight truncate max-w-[105px]">
                    {currentUser.nom_complet || currentUser.username || 'Admin'}
                  </div>
                  <div className="text-[9px] font-semibold text-slate-400">
                    {currentUser.role}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
              </button>

              {/* Dropdown Menu */}
              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-20px)] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3.5 py-2.5 border-b border-slate-800">
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
                        className="w-full px-3.5 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 flex items-center gap-2.5 transition text-left cursor-pointer"
                      >
                        <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Verrouiller l&apos;écran</span>
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
                        className="w-full px-3.5 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 flex items-center gap-2.5 transition text-left cursor-pointer"
                      >
                        <Users className="w-4 h-4 text-blue-400 shrink-0" />
                        <span>Gestion des utilisateurs</span>
                      </button>
                    )}
                  </div>

                  {onLogout && (
                    <div className="pt-1 border-t border-slate-800">
                      <button
                        type="button"
                        id="user-menu-logout-btn"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onLogout();
                        }}
                        className="w-full px-3.5 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 flex items-center gap-2.5 transition text-left font-medium cursor-pointer"
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

      {/* Enterprise Contextual Breadcrumbs Sub-Bar */}
      <div className="hidden sm:flex items-center justify-between px-5 py-1.5 bg-slate-900/60 border-t border-slate-800/60 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400 font-medium">
          <span className="text-slate-500">Accueil</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-slate-400">{breadcrumb.domain}</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-blue-300 font-semibold">{breadcrumb.page}</span>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className="px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700 font-medium">
            Maroc • MAD (DH)
          </span>
          <span className="px-2 py-0.5 rounded-md bg-blue-950/60 text-blue-300 border border-blue-900/60 font-medium">
            Exercice {selectedYear}
          </span>
        </div>
      </div>

      {/* Mobile Second Row: Search + Year Selector */}
      <div className="md:hidden px-3 pb-2.5 pt-1 flex items-center gap-2 border-t border-slate-800/60 bg-slate-950">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="global-search-mobile"
            type="text"
            placeholder="Rechercher BL, Facture, Client..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="w-full pl-9 pr-9 min-h-[40px] text-xs bg-slate-900 text-slate-100 placeholder-slate-400 rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {globalSearch && (
            <button
              type="button"
              onClick={() => setGlobalSearch('')}
              className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[36px] min-h-[36px] flex items-center justify-center text-xs text-slate-400 hover:text-white rounded-lg active:scale-95 cursor-pointer"
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
          className="bg-slate-900 text-slate-200 text-xs font-semibold min-h-[40px] px-2.5 rounded-xl border border-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 shrink-0 touch-manipulation cursor-pointer"
        >
          <option value="2026">2026</option>
          <option value="2025">2025</option>
          <option value="TOUS">Tous</option>
        </select>
      </div>
    </header>
  );
};
