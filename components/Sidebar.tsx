'use client';

import React from 'react';
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
  Settings,
  AlertTriangle,
  Layers,
  Store,
  Receipt,
  Tag,
  Clock,
  Lock,
  LogOut,
  UserCheck,
  ShieldCheck,
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
  currentUser?: AppUser | null;
  onLogout?: () => void;
  onLockScreen?: () => void;
  onOpenUserManagement?: () => void;
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
  currentUser,
  onLogout,
  onLockScreen,
  onOpenUserManagement,
}) => {
  const navSections = [
    {
      title: 'Restaurant & Caisse (POS)',
      items: [
        { id: 'pos', label: 'Plan de Salle & Caisse', icon: Store, highlight: true },
        { id: 'pos-tickets', label: 'Historique des Additions', icon: Receipt },
        { id: 'pos-produits', label: 'Carte & Menu Restaurant', icon: Tag },
        { id: 'pos-sessions', label: 'Services & Clôtures Z', icon: Clock },
      ],
    },
    {
      title: 'Ventes & Facturation (B2B)',
      items: [
        { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
        {
          id: 'bl',
          label: 'Bons de Livraison (BL)',
          icon: Truck,
          badge: blEnAttenteCount > 0 ? `${blEnAttenteCount} en attente` : undefined,
          badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
        },
        {
          id: 'br',
          label: 'Bons de Retour (BR)',
          icon: RotateCcw,
          badge: brEnAttenteCount > 0 ? `${brEnAttenteCount} en attente` : undefined,
          badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
        },
        {
          id: 'workflow-bl-facture',
          label: 'Workflow BL ➔ Facture',
          icon: Workflow,
          highlight: false,
        },
        { id: 'factures', label: 'Factures de Vente', icon: FileText },
        { id: 'devis', label: 'Devis (Offres de prix)', icon: FileSpreadsheet },
        { id: 'reglements', label: 'Encaissements Clients', icon: CreditCard },
      ],
    },
    {
      title: 'Achats & Fournisseurs',
      items: [
        { id: 'fournisseurs', label: 'Fournisseurs (Répertoire)', icon: Building2 },
        { id: 'factures-fournisseurs', label: "Factures d'Achat", icon: FileText },
        {
          id: 'paiements-fournisseurs',
          label: 'Paiements & Chèques',
          icon: CreditCard,
          badge: supplierAlertsCount > 0 ? `${supplierAlertsCount} alerte${supplierAlertsCount > 1 ? 's' : ''}` : undefined,
          badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
        },
        { id: 'fournisseurs-reconciliation', label: 'Rapprochement & Soldes', icon: Layers },
      ],
    },
    {
      title: 'Stocks & Référentiels',
      items: [
        {
          id: 'produits',
          label: 'Produits & Stocks',
          icon: Package,
          badge: stockAlertsCount > 0 ? `${stockAlertsCount} alertes` : undefined,
          badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
        },
        { id: 'clients', label: 'Clients & Comptes', icon: Users },
      ],
    },
    {
      title: 'Analyses & Système',
      items: [
        { id: 'etats', label: 'États & Rapports', icon: BarChart3 },
        { id: 'sqlite', label: 'Console PostgreSQL Neon', icon: Database },
        { id: 'company', label: 'Identifiants Société', icon: Building },
      ],
    },
  ];

  const handleSelect = (id: string) => {
    setCurrentTab(id);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-xs"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 lg:top-[57px] bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } h-screen lg:h-[calc(100vh-57px)] overflow-y-auto`}
      >
        <div className="p-3.5 flex-1 flex flex-col gap-6">
          {navSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1.5">
              <div className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 px-3">
                {section.title}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition text-left ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm font-semibold'
                          : item.highlight
                          ? 'text-blue-300 hover:bg-slate-800/80 hover:text-white bg-blue-950/40 border border-blue-900/50'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? 'text-white' : item.highlight ? 'text-blue-400' : 'text-slate-400'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full border ${item.badgeColor}`}
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
        </div>

        {/* User Session Footer */}
        {currentUser && (
          <div className="p-3 border-t border-slate-800 bg-slate-950/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                  currentUser.role === 'ADMIN'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : currentUser.role === 'CAISSE'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                }`}>
                  {currentUser.avatar || currentUser.nom_complet.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">{currentUser.nom_complet}</div>
                  <div className="text-[10px] text-slate-400 font-medium truncate flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                    {currentUser.role}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {onLockScreen && (
                  <button
                    type="button"
                    onClick={onLockScreen}
                    className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-md transition"
                    title="Verrouiller la session"
                  >
                    <Lock className="w-3.5 h-3.5" />
                  </button>
                )}
                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition"
                    title="Déconnexion"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bottom Database Badge / Status */}
        <div className="px-3 py-2 border-t border-slate-800/60 bg-slate-950/40">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-[11px] text-emerald-300 font-semibold">Postgres (Neon)</span>
            </div>
            <span className="text-[10px] text-slate-400">Vercel & Local</span>
          </div>
        </div>
      </aside>
    </>
  );
};
