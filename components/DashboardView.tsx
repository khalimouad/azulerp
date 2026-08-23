'use client';

import React from 'react';
import { DashboardStats, BonLivraison, Facture } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  TrendingUp,
  FileText,
  Truck,
  RotateCcw,
  AlertTriangle,
  CreditCard,
  Package,
  Workflow,
  ArrowRight,
  Clock,
  CheckCircle2,
  Users,
} from 'lucide-react';

interface DashboardViewProps {
  stats: DashboardStats;
  recentFactures: Facture[];
  recentBls: BonLivraison[];
  onNavigate: (tab: string) => void;
  onOpenBatchInvoicing: () => void;
  onOpenNewBl: () => void;
  onOpenNewBr?: () => void;
  onOpenNewFacture: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  recentFactures,
  recentBls,
  onNavigate,
  onOpenBatchInvoicing,
  onOpenNewBl,
  onOpenNewBr,
  onOpenNewFacture,
}) => {
  const brCount = stats.br_en_attente_count || 0;
  const brTotal = stats.br_en_attente_total || 0;

  return (
    <div className="space-y-5">
      {/* Top Banner with Quick Actions */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-5 rounded-2xl shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                Exercice 2026
              </span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Base Officielle Active
              </span>
              <span className="text-xs text-slate-400 hidden sm:inline">Dernière synchro SQLite : Instantanée</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight mt-1 text-white">
              Tableau de Bord Commercial & Ventes
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Base de données officielle chargée : 792 Articles · 215 Clients · 24 Fournisseurs · 110 Familles
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenNewBl}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition active:scale-95"
            >
              <Truck className="w-4 h-4" />
              + Nouveau BL
            </button>
            {onOpenNewBr && (
              <button
                onClick={onOpenNewBr}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                + Bon de Retour
              </button>
            )}
            <button
              onClick={onOpenBatchInvoicing}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition active:scale-95"
            >
              <Workflow className="w-4 h-4" />
              Facturation Fin de Mois
            </button>
          </div>
        </div>

        {/* Quick Repository Overview Strip */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <button
            onClick={() => onNavigate('produits')}
            className="p-2 bg-slate-800/60 hover:bg-slate-800 rounded-xl border border-slate-700/60 text-left transition flex items-center justify-between"
          >
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Catalogue Articles</div>
              <div className="text-sm font-bold text-emerald-400">792 Produits</div>
            </div>
            <Package className="w-4 h-4 text-slate-400" />
          </button>

          <button
            onClick={() => onNavigate('clients')}
            className="p-2 bg-slate-800/60 hover:bg-slate-800 rounded-xl border border-slate-700/60 text-left transition flex items-center justify-between"
          >
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Clients B2B</div>
              <div className="text-sm font-bold text-blue-400">{stats.clients_count || 215} Clients</div>
            </div>
            <Users className="w-4 h-4 text-slate-400" />
          </button>

          <button
            onClick={() => onNavigate('fournisseurs')}
            className="p-2 bg-slate-800/60 hover:bg-slate-800 rounded-xl border border-slate-700/60 text-left transition flex items-center justify-between"
          >
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Fournisseurs</div>
              <div className="text-sm font-bold text-amber-400">24 Fournisseurs</div>
            </div>
            <Truck className="w-4 h-4 text-slate-400" />
          </button>

          <button
            onClick={() => onNavigate('produits')}
            className="p-2 bg-slate-800/60 hover:bg-slate-800 rounded-xl border border-slate-700/60 text-left transition flex items-center justify-between"
          >
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Structure Produits</div>
              <div className="text-sm font-bold text-purple-400">110 Familles · 10 Cat.</div>
            </div>
            <Workflow className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Facturé */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Chiffre d'Affaires Net Facturé
            </span>
            <span className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono mt-2">
            {formatCurrency(stats.total_facture_ttc)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
            <span className="font-mono font-medium">HT: {formatCurrency(stats.total_facture_ht, false)}</span>
            <span>•</span>
            <span className="text-blue-600 font-semibold">{stats.factures_count} factures</span>
          </div>
        </div>

        {/* Total Encaissé */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Montant Encaissé (Règlements)
            </span>
            <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 font-mono mt-2">
            {formatCurrency(stats.total_encaisse)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Taux d'encaissement :{' '}
            <strong className="text-emerald-700">
              {stats.total_facture_ttc > 0
                ? ((stats.total_encaisse / stats.total_facture_ttc) * 100).toFixed(1)
                : '0'}
              %
            </strong>
          </div>
        </div>

        {/* Reste à Recouvrer (Impayés) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Encours / Reste à Recouvrer
            </span>
            <span className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <CreditCard className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-rose-700 font-mono mt-2">
            {formatCurrency(stats.total_impaye)}
          </div>
          <div className="text-[11px] text-rose-600 font-medium mt-1">
            Solde débiteur clients à relancer
          </div>
        </div>

        {/* BLs & Retours en attente de facturation */}
        <div
          onClick={onOpenBatchInvoicing}
          className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 shadow-xs hover:border-amber-300 cursor-pointer transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-900 uppercase tracking-wider">
              En Attente de Facturation
            </span>
            <span className="p-2 rounded-lg bg-amber-100 text-amber-800">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-lg sm:text-xl font-extrabold text-amber-950 font-mono mt-2">
            {stats.bl_en_attente_count} BLs {brCount > 0 && <span className="text-rose-700 text-sm font-bold">| {brCount} Retours</span>}
          </div>
          <div className="text-[11px] text-amber-900 font-medium mt-1 flex items-center justify-between">
            <span>
              Net: {formatCurrency(stats.bl_en_attente_total - brTotal)}
            </span>
            <span className="flex items-center gap-0.5 text-blue-700 font-semibold">
              Consolider <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Stock Alerts if any */}
      {stats.stock_alerts_count > 0 && (
        <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              <strong>{stats.stock_alerts_count} article(s)</strong> en dessous du stock d'alerte minimal. Veuillez réapprovisionner ou ajuster vos stocks.
            </span>
          </div>
          <button
            onClick={() => onNavigate('produits')}
            className="font-bold text-rose-900 hover:underline shrink-0 flex items-center gap-1"
          >
            Voir le stock <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Two Column Grid: Recent Invoices & Recent BLs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Invoices */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-sm text-slate-900">Dernières Factures de Vente</h3>
            </div>
            <button
              onClick={() => onNavigate('factures')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition flex items-center gap-1"
            >
              Voir toutes <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentFactures.slice(0, 5).map((f) => (
              <div key={f.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-mono font-bold text-slate-900">{f.numero}</div>
                  <div className="text-slate-500 font-medium">{f.client_nom}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-slate-900">
                    {formatCurrency(f.total_ttc)}
                  </div>
                  <span
                    className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      f.statut_paiement === 'Soldé'
                        ? 'bg-emerald-100 text-emerald-800'
                        : f.statut_paiement === 'Partiel'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {f.statut_paiement}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent BLs */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm text-slate-900">Derniers Bons de Livraison (BL)</h3>
            </div>
            <button
              onClick={() => onNavigate('bl')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 transition flex items-center gap-1"
            >
              Voir tous <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentBls.slice(0, 5).map((b) => (
              <div key={b.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-mono font-bold text-slate-900">{b.numero}</div>
                  <div className="text-slate-500 font-medium">
                    {b.client_nom} • {formatDate(b.date)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-slate-900">
                    {formatCurrency(b.total_ttc)}
                  </div>
                  <span
                    className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      b.statut === 'En attente'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {b.statut}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
