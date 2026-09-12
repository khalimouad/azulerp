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
  LayoutDashboard,
  RotateCcw,
  Workflow,
  FileSpreadsheet,
  Building2,
  CreditCard,
  BarChart3,
  Database,
  Building,
  Store,
  Receipt,
  Tag,
  Clock,
  Scale,
  Factory,
  X,
  BookOpen,
  Download,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { AppUser } from '@/lib/types';
import { SyncStatusBadge } from './SyncStatusBadge';

interface HeaderProps {
  currentTab: string;
  onNavigateTab: (tab: string) => void;
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
  blEnAttenteCount?: number;
  brEnAttenteCount?: number;
  stockAlertsCount?: number;
  supplierAlertsCount?: number;
  currentUser?: AppUser | null;
  onLogout?: () => void;
  onLockScreen?: () => void;
  onOpenUserManagement?: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
}

interface MenuCategory {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeCount?: number;
  items?: MenuItem[];
  directTab?: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onNavigateTab,
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
  blEnAttenteCount = 0,
  brEnAttenteCount = 0,
  stockAlertsCount = 0,
  supplierAlertsCount = 0,
  currentUser,
  onLogout,
  onLockScreen,
  onOpenUserManagement,
}) => {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [openMenuCategory, setOpenMenuCategory] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const quickCreateRef = useRef<HTMLDivElement>(null);
  const navMenuRef = useRef<HTMLDivElement>(null);
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
      if (navMenuRef.current && !navMenuRef.current.contains(event.target as Node)) {
        setOpenMenuCategory(null);
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

  // Menu categories and their submenus
  const menuCategories: MenuCategory[] = [
    {
      id: 'dashboard',
      label: 'Tableau de bord',
      icon: LayoutDashboard,
      directTab: 'dashboard',
    },
    {
      id: 'ventes',
      label: 'Ventes',
      icon: Truck,
      badgeCount: blEnAttenteCount + brEnAttenteCount,
      items: [
        {
          id: 'bl',
          label: 'Bons de Livraison (BL)',
          icon: Truck,
          badge: blEnAttenteCount > 0 ? `${blEnAttenteCount}` : undefined,
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        },
        { id: 'factures', label: 'Factures de Vente', icon: FileText },
        { id: 'workflow-bl-facture', label: 'Workflow Facturation BL', icon: Workflow },
        {
          id: 'br',
          label: 'Bons de Retour (BR)',
          icon: RotateCcw,
          badge: brEnAttenteCount > 0 ? `${brEnAttenteCount}` : undefined,
          badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        },
        { id: 'devis', label: 'Devis & Offres', icon: FileSpreadsheet },
        { id: 'reglements', label: 'Encaissements Clients', icon: CreditCard },
        { id: 'clients', label: 'Clients & Comptes', icon: Users },
      ],
    },
    {
      id: 'achats',
      label: 'Achats',
      icon: Building2,
      badgeCount: supplierAlertsCount,
      items: [
        { id: 'fournisseurs', label: 'Répertoire Fournisseurs', icon: Building2 },
        { id: 'factures-fournisseurs', label: "Factures d'Achat", icon: FileText },
        {
          id: 'paiements-fournisseurs',
          label: 'Paiements & Chèques',
          icon: CreditCard,
          badge: supplierAlertsCount > 0 ? `${supplierAlertsCount}` : undefined,
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        },
        {
          id: 'fournisseurs-alertes',
          label: 'Alertes Échéances Chèques',
          icon: AlertTriangle,
          badge: supplierAlertsCount > 0 ? `${supplierAlertsCount}` : undefined,
          badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        },
        { id: 'fournisseurs-reconciliation', label: 'Situation & Rapprochement', icon: Layers },
      ],
    },
    {
      id: 'stocks-prod',
      label: 'Stocks & Production',
      icon: Package,
      badgeCount: stockAlertsCount,
      items: [
        {
          id: 'produits',
          label: 'Articles & Stocks',
          icon: Package,
          badge: stockAlertsCount > 0 ? `${stockAlertsCount} alertes` : undefined,
          badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        },
        { id: 'manufacturing-boms', label: 'Nomenclatures (BOM)', icon: Layers },
        { id: 'manufacturing-orders', label: 'Ordres de Fabrication (OF)', icon: Factory },
      ],
    },
    {
      id: 'comptabilite',
      label: 'Comptabilité',
      icon: Scale,
      items: [
        { id: 'accounting-journal', label: 'Journal & Grand Livre', icon: BookOpen },
        { id: 'accounting-balance', label: 'Balance Générale (6 Col)', icon: Scale },
        { id: 'accounting-cpc', label: 'Bilan & CPC (CGNC)', icon: FileSpreadsheet },
        { id: 'accounting-fiscalite', label: 'SIMPL-TVA & IS', icon: Building },
        { id: 'accounting-assets', label: 'Immobilisations & Amort.', icon: TrendingUp },
        { id: 'accounting-pcgm', label: 'Plan Comptable (PCGM)', icon: Layers },
        { id: 'accounting-export', label: 'Export FEC / DGI', icon: Download },
      ],
    },
    {
      id: 'rh',
      label: 'RH & Paie',
      icon: Users,
      items: [
        { id: 'hr', label: 'Personnel & Paie (LF 2026)', icon: Users },
      ],
    },
    {
      id: 'pos',
      label: 'Caisse POS',
      icon: Store,
      items: [
        { id: 'pos', label: 'Caisse & Terminal', icon: Store },
        { id: 'pos-tickets', label: 'Historique des Ventes', icon: Receipt },
        { id: 'pos-produits', label: 'Catalogue Caisse', icon: Tag },
        { id: 'pos-sessions', label: 'Sessions & Clôtures', icon: Clock },
      ],
    },
    {
      id: 'analytique',
      label: 'Configuration',
      icon: BarChart3,
      items: [
        { id: 'etats', label: 'États & Rapports', icon: BarChart3 },
        { id: 'company', label: 'Identifiants Société', icon: Building },
        { id: 'sqlite', label: 'Gestion Base Neon', icon: Database },
      ],
    },
  ];

  // Helper to determine if a category is active
  const isCategoryActive = (category: MenuCategory) => {
    if (category.directTab && currentTab === category.directTab) return true;
    if (category.items) {
      return category.items.some(
        (item) =>
          currentTab === item.id ||
          (item.id === 'bl' && currentTab === 'create-bl') ||
          (item.id === 'br' && currentTab === 'create-br') ||
          (item.id === 'factures' && (currentTab === 'create-facture' || currentTab === 'preview-document')) ||
          (item.id === 'devis' && currentTab === 'create-devis') ||
          (item.id === 'clients' && currentTab === 'create-client') ||
          (item.id === 'produits' && (currentTab === 'create-produit' || currentTab === 'adjust-stock')) ||
          ((item.id === 'fournisseurs' || item.id === 'factures-fournisseurs' || item.id === 'paiements-fournisseurs' || item.id === 'fournisseurs-alertes' || item.id === 'fournisseurs-reconciliation') && currentTab === 'create-fournisseur') ||
          (category.id === 'achats' && (currentTab === 'fournisseurs' || currentTab === 'factures-fournisseurs' || currentTab === 'paiements-fournisseurs' || currentTab === 'fournisseurs-alertes' || currentTab === 'fournisseurs-reconciliation' || currentTab === 'create-fournisseur')) ||
          (category.id === 'comptabilite' && (currentTab.startsWith('accounting') || currentTab === 'create-journal-entry' || currentTab === 'create-fixed-asset')) ||
          (item.id === 'hr' && (currentTab === 'create-employee' || currentTab === 'create-leave')) ||
          (item.id === 'manufacturing-boms' && currentTab === 'create-bom') ||
          (item.id === 'manufacturing-orders' && currentTab === 'create-production-order')
      );
    }
    return false;
  };

  const handleSelectTab = (tab: string) => {
    onNavigateTab(tab);
    setOpenMenuCategory(null);
    setMobileMenuOpen(false);
  };

  // Breadcrumb Mapping
  const getBreadcrumb = (tab: string): { domain: string; page: string } => {
    switch (tab) {
      case 'dashboard':
        return { domain: 'Pilotage & IA', page: 'Tableau de bord' };
      case 'ai-copilot':
        return { domain: 'Pilotage & IA', page: 'Assistant IA Copilot (Gemini 3.8)' };
      case 'bl':
        return { domain: 'Ventes', page: 'Bons de Livraison (BL)' };
      case 'create-bl':
        return { domain: 'Ventes', page: 'Nouveau Bon de Livraison' };
      case 'br':
        return { domain: 'Ventes', page: 'Bons de Retour (BR)' };
      case 'create-br':
        return { domain: 'Ventes', page: 'Nouveau Bon de Retour' };
      case 'factures':
        return { domain: 'Ventes', page: 'Factures de Vente' };
      case 'create-facture':
        return { domain: 'Ventes', page: 'Nouvelle Facture de Vente' };
      case 'workflow-bl-facture':
        return { domain: 'Ventes', page: 'Workflow BL ➔ Facture' };
      case 'devis':
        return { domain: 'Ventes', page: 'Devis & Offres de Prix' };
      case 'create-devis':
        return { domain: 'Ventes', page: 'Nouveau Devis' };
      case 'reglements':
        return { domain: 'Ventes', page: 'Encaissements Clients' };
      case 'create-payment':
        return { domain: 'Ventes', page: 'Enregistrement Règlement' };
      case 'clients':
        return { domain: 'Ventes', page: 'Clients & Comptes' };
      case 'create-client':
        return { domain: 'Ventes', page: 'Fiche Client' };
      case 'fournisseurs':
        return { domain: 'Achats', page: 'Répertoire Fournisseurs' };
      case 'create-fournisseur':
        return { domain: 'Achats', page: 'Fiche Fournisseur' };
      case 'factures-fournisseurs':
        return { domain: 'Achats', page: "Factures d'Achat" };
      case 'paiements-fournisseurs':
        return { domain: 'Achats', page: 'Paiements Fournisseurs' };
      case 'fournisseurs-alertes':
        return { domain: 'Achats', page: 'Alertes Échéances Chèques' };
      case 'fournisseurs-reconciliation':
        return { domain: 'Achats', page: 'Situation & Rapprochement' };
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
      case 'accounting-journal':
        return { domain: 'Comptabilité', page: 'Journal & Grand Livre' };
      case 'accounting-balance':
        return { domain: 'Comptabilité', page: 'Balance Générale (6 Col)' };
      case 'accounting-cpc':
        return { domain: 'Comptabilité', page: 'Bilan & CPC (CGNC)' };
      case 'accounting-fiscalite':
        return { domain: 'Comptabilité', page: 'SIMPL-TVA & SIMPL-IS' };
      case 'accounting-assets':
        return { domain: 'Comptabilité', page: 'Immobilisations & Amortissements' };
      case 'accounting-pcgm':
        return { domain: 'Comptabilité', page: 'Plan Comptable (PCGM)' };
      case 'accounting-export':
        return { domain: 'Comptabilité', page: 'Export Fichier FEC / DGI' };
      case 'create-journal-entry':
        return { domain: 'Comptabilité', page: 'Saisie Écriture Comptable' };
      case 'create-fixed-asset':
        return { domain: 'Comptabilité', page: 'Immobilisation & Amortissement' };
      case 'hr':
        return { domain: 'RH & Paie', page: 'Personnel & Salariés (LF 2026)' };
      case 'create-employee':
        return { domain: 'RH & Paie', page: 'Fiche Collaborateur' };
      case 'create-leave':
        return { domain: 'RH & Paie', page: 'Demande de Congé' };
      case 'pos':
        return { domain: 'Point de Vente', page: 'Caisse & Terminal' };
      case 'pos-tickets':
        return { domain: 'Point de Vente', page: 'Historique des Ventes' };
      case 'pos-produits':
        return { domain: 'Point de Vente', page: 'Catalogue Caisse' };
      case 'pos-sessions':
        return { domain: 'Point de Vente', page: 'Sessions & Clôtures' };
      case 'etats':
        return { domain: 'Configuration', page: 'États & Rapports' };
      case 'company':
        return { domain: 'Configuration', page: 'Identifiants Société' };
      case 'sqlite':
        return { domain: 'Configuration', page: 'Gestion Base Neon' };
      case 'preview-document':
        return { domain: 'Documents', page: 'Aperçu & Impression' };
      case 'search':
        return { domain: 'Recherche', page: 'Recherche Globale & IA' };
      default:
        return { domain: 'AzulERP', page: 'Espace de travail' };
    }
  };

  const breadcrumb = getBreadcrumb(currentTab);

  return (
    <header className="bg-slate-950 text-white border-b border-slate-800/90 sticky top-0 z-30 shadow-lg select-none">
      {/* 1. Primary Top Header Bar */}
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

          <div
            className="flex items-center gap-2.5 min-w-0 cursor-pointer"
            onClick={() => handleSelectTab('dashboard')}
          >
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

        {/* Center: Global Omnibox Search (Ctrl+K) */}
        <div className="hidden md:flex items-center gap-2 flex-1 max-w-lg mx-3">
          <div className="relative w-full">
            <button
              type="button"
              onClick={() => onNavigateTab('search')}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-400 p-1 rounded-md transition cursor-pointer"
              title="Lancer la recherche globale"
            >
              <Search className="w-4 h-4" />
            </button>
            <input
              ref={searchInputRef}
              id="global-search-desktop"
              type="text"
              placeholder="Recherche globale (N° BL, Facture, Client, Produit, ICE, IA)..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onNavigateTab('search');
                }
              }}
              className="w-full pl-9 pr-24 py-1.5 text-xs bg-slate-900/90 text-slate-100 placeholder-slate-400 rounded-xl border border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition shadow-inner"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {globalSearch ? (
                <>
                  <button
                    type="button"
                    onClick={() => setGlobalSearch('')}
                    className="text-xs text-slate-400 hover:text-white p-1 rounded-md cursor-pointer"
                    title="Effacer"
                  >
                    ✕
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('search')}
                    className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-xs transition cursor-pointer"
                    title="Ouvrir la page de recherche"
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>Entrée</span>
                  </button>
                </>
              ) : (
                <span className="flex items-center gap-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 pointer-events-none">
                  <Command className="w-2.5 h-2.5" /> K
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center shrink-0">
            <select
              id="year-select-desktop"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-slate-900 text-slate-200 text-xs font-semibold py-1.5 px-2.5 rounded-xl border border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-xs"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="TOUS">Tous</option>
            </select>
          </div>
        </div>

        {/* Right: Quick Create Button & User Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Quick Create Dropdown Menu */}
          <div className="relative" ref={quickCreateRef}>
            <button
              type="button"
              id="header-quick-create-btn"
              onClick={() => setQuickCreateOpen(!quickCreateOpen)}
              className="flex items-center justify-center gap-1 sm:gap-1.5 px-3 min-h-[36px] rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:from-blue-700 active:to-indigo-700 text-white shadow-md shadow-blue-600/20 transition touch-manipulation active:scale-95 cursor-pointer ring-1 ring-blue-400/30"
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
                className="flex items-center justify-center gap-2 min-h-[36px] p-1 sm:px-2.5 sm:py-1 rounded-xl bg-slate-900 hover:bg-slate-800/90 active:bg-slate-800 border border-slate-800 text-white transition touch-manipulation active:scale-95 cursor-pointer shadow-xs"
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

      {/* 2. Horizontal Navigation Menu Ribbon with Dropdown Submenus (Desktop) */}
      <nav
        ref={navMenuRef}
        className="hidden lg:flex items-center px-4 bg-slate-900/95 border-t border-slate-800/80 text-xs font-medium relative z-40 overflow-visible"
        aria-label="Menu principal horizontal"
      >
        <div className="flex items-center gap-1 py-1">
          {menuCategories.map((cat) => {
            const Icon = cat.icon;
            const active = isCategoryActive(cat);
            const isOpen = openMenuCategory === cat.id;

            if (cat.directTab) {
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelectTab(cat.directTab!)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition active:scale-95 cursor-pointer ${
                    active
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/90'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-slate-400'}`} />
                  <span>{cat.label}</span>
                </button>
              );
            }

            return (
              <div key={cat.id} className="relative">
                <button
                  type="button"
                  onClick={() => setOpenMenuCategory(isOpen ? null : cat.id)}
                  onMouseEnter={() => setOpenMenuCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition active:scale-95 cursor-pointer ${
                    active
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : isOpen
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/90'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-slate-400'}`} />
                  <span>{cat.label}</span>
                  {cat.badgeCount !== undefined && cat.badgeCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-500 text-slate-950 ml-0.5">
                      {cat.badgeCount}
                    </span>
                  )}
                  <ChevronDown
                    className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180 text-white' : 'text-slate-400'}`}
                  />
                </button>

                {/* Submenu Dropdown */}
                {isOpen && cat.items && (
                  <div
                    className="absolute left-0 mt-1 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in slide-in-from-top-1"
                    onMouseLeave={() => setOpenMenuCategory(null)}
                  >
                    <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800/80 mb-1">
                      {cat.label}
                    </div>
                    {cat.items.map((item) => {
                      const SubIcon = item.icon;
                      const isItemCurrent = currentTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectTab(item.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 text-xs transition cursor-pointer ${
                            isItemCurrent
                              ? 'bg-blue-600 text-white font-semibold'
                              : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <SubIcon
                              className={`w-4 h-4 ${isItemCurrent ? 'text-white' : 'text-slate-400'}`}
                            />
                            <span>{item.label}</span>
                          </div>
                          {item.badge && (
                            <span
                              className={`px-1.5 py-0.5 text-[9px] font-bold rounded-md border ${
                                isItemCurrent ? 'bg-white/20 text-white border-white/30' : item.badgeColor
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* 3. Enterprise Contextual Breadcrumbs Sub-Bar */}
      <div className="hidden sm:flex items-center justify-between px-5 py-1.5 bg-slate-950/80 border-t border-slate-800/60 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400 font-medium">
          <span className="text-slate-500">Accueil</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-slate-400">{breadcrumb.domain}</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-blue-300 font-semibold">{breadcrumb.page}</span>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 font-medium">
            Maroc • MAD (DH)
          </span>
          <span className="px-2 py-0.5 rounded-md bg-blue-950/60 text-blue-300 border border-blue-900/60 font-medium">
            Exercice {selectedYear}
          </span>
        </div>
      </div>

      {/* 4. Mobile Drawer Overlay with Accordion Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-80 max-w-[85vw] bg-slate-950 text-white h-full shadow-2xl flex flex-col z-10 border-r border-slate-800">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-xs text-white">
                  AZ
                </div>
                <span className="font-extrabold text-sm text-white">AZULERP 2026</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-4 no-scrollbar">
              {menuCategories.map((cat) => {
                const Icon = cat.icon;
                if (cat.directTab) {
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleSelectTab(cat.directTab!)}
                      className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-left text-xs font-semibold text-white cursor-pointer"
                    >
                      <Icon className="w-4 h-4 text-blue-400" />
                      <span>{cat.label}</span>
                    </button>
                  );
                }

                return (
                  <div key={cat.id} className="space-y-1">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-slate-400" />
                      <span>{cat.label}</span>
                    </div>
                    <div className="space-y-0.5">
                      {cat.items?.map((item) => {
                        const SubIcon = item.icon;
                        const isCurrent = currentTab === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSelectTab(item.id)}
                            className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-medium text-left cursor-pointer ${
                              isCurrent
                                ? 'bg-blue-600 text-white font-bold'
                                : 'text-slate-300 hover:bg-slate-900'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <SubIcon className={`w-4 h-4 ${isCurrent ? 'text-white' : 'text-slate-400'}`} />
                              <span>{item.label}</span>
                            </div>
                            {item.badge && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-slate-800 text-slate-300">
                                {item.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 5. Mobile Search Row */}
      <div className="md:hidden px-3 pb-2.5 pt-1 flex items-center gap-2 border-t border-slate-800/60 bg-slate-950">
        <div className="relative flex-1">
          <button
            type="button"
            onClick={() => onNavigateTab('search')}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-400 p-1"
          >
            <Search className="w-4 h-4" />
          </button>
          <input
            id="global-search-mobile"
            type="text"
            placeholder="Rechercher BL, Facture, Client..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onNavigateTab('search');
              }
            }}
            className="w-full pl-9 pr-16 min-h-[40px] text-xs bg-slate-900 text-slate-100 placeholder-slate-400 rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {globalSearch ? (
              <>
                <button
                  type="button"
                  onClick={() => setGlobalSearch('')}
                  className="min-w-[28px] min-h-[28px] flex items-center justify-center text-xs text-slate-400 hover:text-white rounded-lg active:scale-95 cursor-pointer"
                >
                  ✕
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab('search')}
                  className="min-h-[28px] px-2 flex items-center gap-1 text-[10px] font-bold rounded-lg bg-blue-600 text-white active:scale-95 cursor-pointer"
                >
                  <ArrowRight className="w-3 h-3" />
                </button>
              </>
            ) : null}
          </div>
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
