'use client';

import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard,
  Truck,
  RotateCcw,
  FileText,
  Workflow,
  FileSpreadsheet,
  Package,
  Users,
  Building2,
  CreditCard,
  BarChart3,
  Database,
  Building,
  Layers,
  Store,
  Receipt,
  Tag,
  Clock,
  Lock,
  LogOut,
  ShieldCheck,
  Sparkles,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Scale,
  Factory,
  Search,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import { AppUser } from '@/lib/types';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  blEnAttenteCount: number;
  brEnAttenteCount?: number;
  stockAlertsCount: number;
  supplierAlertsCount?: number;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  currentUser?: AppUser | null;
  onLogout?: () => void;
  onLockScreen?: () => void;
  onOpenUserManagement?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
  badge?: string;
  badgeColor?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  blEnAttenteCount,
  brEnAttenteCount = 0,
  stockAlertsCount,
  supplierAlertsCount = 0,
  mobileOpen,
  setMobileOpen,
  collapsed,
  setCollapsed,
  currentUser,
  onLogout,
  onLockScreen,
  onOpenUserManagement,
}) => {
  const [navSearch, setNavSearch] = useState('');

  const navSections: NavSection[] = useMemo(() => [
    {
      title: 'Pilotage & IA',
      items: [
        { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
        {
          id: 'search',
          label: 'Recherche Globale & IA',
          icon: Search,
          badge: 'Omnibox',
          badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        },
        {
          id: 'ai-copilot',
          label: 'Assistant IA Copilot',
          icon: Sparkles,
          highlight: true,
          badge: 'Gemini 3.8',
          badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
        },
      ],
    },
    {
      title: 'Ventes & Clients',
      items: [
        {
          id: 'bl',
          label: 'Bons de Livraison (BL)',
          icon: Truck,
          badge: blEnAttenteCount > 0 ? `${blEnAttenteCount}` : undefined,
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        },
        { id: 'factures', label: 'Factures de Vente', icon: FileText },
        {
          id: 'workflow-bl-facture',
          label: 'Workflow BL ➔ Facture',
          icon: Workflow,
        },
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
      title: 'Achats & Fournisseurs',
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
        { id: 'fournisseurs-reconciliation', label: 'Rapprochement & Soldes', icon: Layers },
      ],
    },
    {
      title: 'Stocks & Production',
      items: [
        {
          id: 'produits',
          label: 'Articles & Stocks',
          icon: Package,
          badge: stockAlertsCount > 0 ? `${stockAlertsCount} alertes` : undefined,
          badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        },
        {
          id: 'manufacturing-boms',
          label: 'Nomenclatures (BOM)',
          icon: Layers,
          badge: 'Formules',
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        },
        {
          id: 'manufacturing-orders',
          label: 'Ordres de Fabrication',
          icon: Factory,
          badge: 'OF',
          badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
        },
      ],
    },
    {
      title: 'Comptabilité & Finance',
      items: [
        {
          id: 'accounting-journal',
          label: 'Journal & Écritures',
          icon: Scale,
          highlight: true,
          badge: 'PCGM',
          badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
        },
        {
          id: 'accounting-pcgm',
          label: 'Plan Comptable (PCGM)',
          icon: Layers,
          badge: 'Éditable',
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        },
        { id: 'accounting-balance', label: 'Balance Générale & FEC', icon: BarChart3 },
        { id: 'accounting-cpc', label: 'Compte de Résultat (CPC)', icon: FileText },
        { id: 'accounting-assets', label: 'Immobilisations', icon: Building2 },
      ],
    },
    {
      title: 'Ressources Humaines',
      items: [
        {
          id: 'hr-employees',
          label: 'Personnel & Salariés',
          icon: Users,
          badge: 'LF 2026',
          badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
        },
        { id: 'hr-payroll', label: 'Bulletins de Paie', icon: FileSpreadsheet },
        { id: 'hr-leaves', label: 'Congés & Absences', icon: Calendar },
      ],
    },
    {
      title: 'Point de Vente (POS)',
      items: [
        { id: 'pos', label: 'Caisse & Terminal POS', icon: Store, highlight: true },
        { id: 'pos-tickets', label: 'Historique des Ventes', icon: Receipt },
        { id: 'pos-produits', label: 'Catalogue Caisse', icon: Tag },
        { id: 'pos-sessions', label: 'Sessions & Clôtures', icon: Clock },
      ],
    },
    {
      title: 'Analytique & Configuration',
      items: [
        { id: 'etats', label: 'États & Rapports', icon: BarChart3 },
        { id: 'company', label: 'Identifiants Société', icon: Building },
        { id: 'sqlite', label: 'Gestion Base Neon', icon: Database },
      ],
    },
  ], [blEnAttenteCount, brEnAttenteCount, stockAlertsCount, supplierAlertsCount]);

  const handleSelect = (id: string) => {
    setCurrentTab(id);
    setMobileOpen(false);
  };

  // Filtered navigation items when searching in menu
  const filteredSections = useMemo(() => {
    if (!navSearch.trim()) return navSections;
    const q = navSearch.toLowerCase();
    return navSections
      .map((sec) => ({
        ...sec,
        items: sec.items.filter(
          (item) =>
            item.label.toLowerCase().includes(q) ||
            (item.badge && item.badge.toLowerCase().includes(q))
        ),
      }))
      .filter((sec) => sec.items.length > 0);
  }, [navSections, navSearch]);

  const isItemActive = (itemId: string) => {
    return (
      currentTab === itemId ||
      (itemId === 'bl' && currentTab === 'create-bl') ||
      (itemId === 'br' && currentTab === 'create-br') ||
      (itemId === 'factures' && (currentTab === 'create-facture' || currentTab === 'preview-document')) ||
      (itemId === 'devis' && currentTab === 'create-devis') ||
      (itemId === 'clients' && currentTab === 'create-client') ||
      (itemId === 'produits' && (currentTab === 'create-produit' || currentTab === 'adjust-stock')) ||
      (itemId === 'fournisseurs' && currentTab === 'create-fournisseur') ||
      (itemId === 'accounting' && (currentTab === 'create-journal-entry' || currentTab === 'create-fixed-asset')) ||
      (itemId === 'hr' && (currentTab === 'create-employee' || currentTab === 'create-leave')) ||
      (itemId === 'manufacturing-boms' && currentTab === 'create-bom') ||
      (itemId === 'manufacturing-orders' && currentTab === 'create-production-order')
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/70 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 lg:top-[57px] bottom-0 left-0 z-40 w-72 sm:w-64 ${
          collapsed ? 'lg:w-[72px]' : 'lg:w-64'
        } bg-slate-950 text-slate-300 border-r border-slate-800/80 flex flex-col transition-[width,transform] duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0 shadow-2xl shadow-blue-950/50' : '-translate-x-full'
        } h-screen lg:h-[calc(100vh-57px)] overflow-hidden`}
      >
        {/* Mobile Drawer Header */}
        <div className="lg:hidden px-4 py-3 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-xs text-white shadow-md shadow-blue-600/30">
              AZ
            </div>
            <div>
              <span className="font-extrabold text-sm text-white tracking-tight">AZULERP</span>
              <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">2026</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 active:bg-slate-700 rounded-xl transition touch-manipulation active:scale-95 cursor-pointer"
            aria-label="Fermer le menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Desktop Collapse / Expand Header */}
        <div className={`hidden lg:flex border-b border-slate-800/80 p-2.5 ${collapsed ? 'justify-center' : 'justify-between items-center'}`}>
          {!collapsed && (
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2">
              Navigation ERP
            </span>
          )}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 active:scale-95 transition cursor-pointer"
            title={collapsed ? 'Agrandir le menu' : 'Réduire le menu'}
            aria-label={collapsed ? 'Agrandir le menu' : 'Réduire le menu'}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        {/* In-Menu Quick Filter (Visible when expanded or on mobile) */}
        {(!collapsed || mobileOpen) && (
          <div className="px-3 pt-3 pb-1 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={navSearch}
                onChange={(e) => setNavSearch(e.target.value)}
                placeholder="Filtrer les modules..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-900 text-slate-200 placeholder-slate-500 rounded-lg border border-slate-800 focus:outline-none focus:border-blue-500 transition"
              />
              {navSearch && (
                <button
                  type="button"
                  onClick={() => setNavSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}

        {/* Navigation Scrollable Area */}
        <div className={`${collapsed ? 'lg:px-2' : 'lg:px-3'} p-3 flex-1 overflow-y-auto space-y-5 transition-all no-scrollbar`}>
          {filteredSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              <div
                className={`${
                  collapsed ? 'lg:hidden' : ''
                } text-[10px] font-bold tracking-wider uppercase text-slate-500 px-2.5 pt-1`}
              >
                {section.title}
              </div>
              {collapsed ? <div className="hidden lg:block h-px bg-slate-800/80 my-2 mx-1" /> : null}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isItemActive(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      title={collapsed ? item.label : undefined}
                      className={`w-full flex items-center ${
                        collapsed ? 'lg:justify-center lg:px-2' : 'justify-between px-2.5'
                      } py-2 min-h-[40px] sm:min-h-[36px] text-xs font-medium rounded-xl transition-all text-left touch-manipulation active:scale-[0.98] cursor-pointer group ${
                        active
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 font-semibold ring-1 ring-blue-400/30'
                          : item.highlight
                          ? 'text-blue-300 hover:bg-slate-900/90 hover:text-white bg-blue-950/30 border border-blue-900/40'
                          : 'text-slate-300 hover:bg-slate-900/90 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                            active ? 'text-white' : item.highlight ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'
                          }`}
                        />
                        <span className={`${collapsed ? 'lg:hidden' : ''} truncate`}>
                          {item.label}
                        </span>
                      </div>
                      {item.badge && (
                        <span
                          className={`${
                            collapsed ? 'lg:hidden' : ''
                          } ml-1 px-1.5 py-0.5 text-[9px] font-bold rounded-md border shrink-0 ${
                            active
                              ? 'bg-white/20 text-white border-white/30'
                              : item.badgeColor
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {filteredSections.length === 0 && (
            <div className="text-center py-6 text-xs text-slate-500">
              Aucun module trouvé pour &ldquo;{navSearch}&rdquo;
            </div>
          )}
        </div>

        {/* User Session Footer */}
        {currentUser && (
          <div className="p-3 border-t border-slate-800/80 bg-slate-900/60 shrink-0 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                    currentUser.role === 'ADMIN'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : currentUser.role === 'CAISSE'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  }`}
                >
                  {currentUser.avatar || (currentUser.nom_complet || currentUser.username || 'AD').slice(0, 2).toUpperCase()}
                </div>
                <div className={`${collapsed ? 'lg:hidden' : ''} min-w-0`}>
                  <div className="text-xs font-bold text-white truncate">
                    {currentUser.nom_complet || currentUser.username || 'Admin'}
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium truncate flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                    {currentUser.role}
                  </div>
                </div>
              </div>

              <div className={`${collapsed ? 'lg:hidden' : ''} flex items-center gap-1 shrink-0`}>
                {onOpenUserManagement && currentUser.role === 'ADMIN' && (
                  <button
                    type="button"
                    onClick={onOpenUserManagement}
                    className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-md transition cursor-pointer"
                    title="Gérer les utilisateurs"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </button>
                )}
                {onLockScreen && (
                  <button
                    type="button"
                    onClick={onLockScreen}
                    className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-md transition cursor-pointer"
                    title="Verrouiller la session"
                  >
                    <Lock className="w-3.5 h-3.5" />
                  </button>
                )}
                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition cursor-pointer"
                    title="Déconnexion"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Database Status Tag */}
        <div className="px-3 py-1.5 border-t border-slate-800/60 bg-slate-950 text-[10px] text-slate-400 shrink-0">
          <div className={`flex items-center ${collapsed ? 'lg:justify-center' : 'justify-between'}`}>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className={`${collapsed ? 'lg:hidden' : ''} font-mono text-emerald-300 font-semibold`}>
                Postgres (Neon)
              </span>
            </div>
            <span className={`${collapsed ? 'lg:hidden' : ''} text-slate-400`}>LF 2026</span>
          </div>
        </div>
      </aside>
    </>
  );
};
