'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Produit, StockMouvement } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { TablePagination } from '@/components/TablePagination';
import { Plus, Search, Package, AlertTriangle, ArrowUpDown, History, Edit, Trash2, ArrowUpRight, ArrowDownLeft, DollarSign, TrendingUp } from 'lucide-react';

interface ProduitsStockViewProps {
  produits: Produit[];
  stockMouvements: StockMouvement[];
  onOpenNewProduit: () => void;
  onOpenEditProduit: (p: Produit) => void;
  onOpenStockAdjust: (p: Produit) => void;
  onDeleteProduit: (id: number) => void;
}

export const ProduitsStockView: React.FC<ProduitsStockViewProps> = ({
  produits,
  stockMouvements,
  onOpenNewProduit,
  onOpenEditProduit,
  onOpenStockAdjust,
  onDeleteProduit,
}) => {
  const [activeTab, setActiveTab] = useState<'CATALOG' | 'MOUVEMENTS'>('CATALOG');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupe, setSelectedGroupe] = useState<string>('ALL');
  const [filterAlertsOnly, setFilterAlertsOnly] = useState(false);

  // Pagination for catalog & movements
  const [currentProdPage, setCurrentProdPage] = useState(1);
  const [prodPageSize, setProdPageSize] = useState(10);
  const [currentMvtPage, setCurrentMvtPage] = useState(1);
  const [mvtPageSize, setMvtPageSize] = useState(10);

  // Reset page when filters change
  useEffect(() => {
    setCurrentProdPage(1);
  }, [searchQuery, selectedGroupe, filterAlertsOnly]);

  // Unique groups from products
  const groupes = useMemo(() => {
    const set = new Set<string>();
    produits.forEach((p) => {
      if (p.groupe) set.add(p.groupe);
    });
    return Array.from(set);
  }, [produits]);

  const totalStockValuation = useMemo(() => {
    return produits.reduce((sum, p) => {
      const unitCost = Number(p.prix_achat_ht || p.prix_achat || p.prix_ht || 0);
      const stock = Math.max(0, Number(p.stock_actuel) || 0);
      return sum + (unitCost * stock);
    }, 0);
  }, [produits]);

  const totalStockUnits = useMemo(() => {
    return produits.reduce((sum, p) => sum + (Number(p.stock_actuel) || 0), 0);
  }, [produits]);

  const filteredProduits = useMemo(() => {
    return produits.filter((p) => {
      if (selectedGroupe !== 'ALL' && p.groupe !== selectedGroupe) return false;
      if (filterAlertsOnly && p.stock_actuel > p.stock_min) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchLib = p.libelle.toLowerCase().includes(q);
        const matchCode = p.code.toLowerCase().includes(q);
        const matchFam = p.famille?.toLowerCase().includes(q);
        if (!matchLib && !matchCode && !matchFam) return false;
      }
      return true;
    });
  }, [produits, selectedGroupe, filterAlertsOnly, searchQuery]);

  const paginatedProduits = useMemo(() => {
    const start = (currentProdPage - 1) * prodPageSize;
    return filteredProduits.slice(start, start + prodPageSize);
  }, [filteredProduits, currentProdPage, prodPageSize]);

  const paginatedMouvements = useMemo(() => {
    const start = (currentMvtPage - 1) * mvtPageSize;
    return stockMouvements.slice(start, start + mvtPageSize);
  }, [stockMouvements, currentMvtPage, mvtPageSize]);

  return (
    <div className="space-y-4">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER (Compact on mobile, full on desktop) */}
      {/* ========================================================================= */}
      {/* Mobile Top Header (sm:hidden) */}
      <div className="flex items-center justify-between gap-2 p-3 bg-white rounded-xl border border-slate-200 shadow-xs sm:hidden">
        <div className="flex items-center gap-2 min-w-0">
          <Package className="w-5 h-5 text-blue-600 shrink-0" />
          <div className="min-w-0">
            <h2 className="font-bold text-slate-900 text-sm truncate flex items-center gap-1.5">
              Stock & Produits
              <span className="text-[11px] font-semibold px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {produits.length}
              </span>
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab(activeTab === 'CATALOG' ? 'MOUVEMENTS' : 'CATALOG')}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            title={activeTab === 'CATALOG' ? 'Voir Mouvements' : 'Voir Catalogue'}
          >
            <History className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onOpenNewProduit}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition shadow-xs active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Produit</span>
          </button>
        </div>
      </div>

      {/* Desktop Top Header (hidden sm:flex) */}
      <div className="hidden sm:flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Produits & Gestion des Stocks
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {produits.length} articles
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Catalogue articles, tarifs HT, taux TVA (10% et 20%), unités de mesure et inventaire en temps réel
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab(activeTab === 'CATALOG' ? 'MOUVEMENTS' : 'CATALOG')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            <History className="w-3.5 h-3.5" />
            {activeTab === 'CATALOG' ? 'Historique Mouvements' : 'Catalogue Produits'}
          </button>
          <button
            onClick={onOpenNewProduit}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            + Ajouter un Produit
          </button>
        </div>
      </div>

      {activeTab === 'CATALOG' ? (
        <>
          {/* Global Inventory Valuation & KPIs Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Articles Référencés</span>
              <span className="text-base font-bold text-slate-900 mt-0.5 block">{produits.length} références</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Unités en Stock</span>
              <span className="text-base font-mono font-bold text-slate-900 mt-0.5 block">
                {totalStockUnits.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-100">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                Valorisation Stock (Coût Réel)
              </span>
              <span className="text-base font-mono font-extrabold text-emerald-700 mt-0.5 block">
                {formatCurrency(totalStockValuation)}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-rose-50/70 border border-rose-100">
              <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                Alertes Rupture / Réappro
              </span>
              <span className="text-base font-mono font-bold text-rose-700 mt-0.5 block">
                {produits.filter((p) => p.stock_actuel <= p.stock_min).length} articles
              </span>
            </div>
          </div>

          {/* Group and Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Group pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              <button
                onClick={() => setSelectedGroupe('ALL')}
                className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
                  selectedGroupe === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Tous les groupes ({produits.length})
              </button>
              {groupes.map((grp) => (
                <button
                  key={grp}
                  onClick={() => setSelectedGroupe(grp)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
                    selectedGroupe === grp
                      ? 'bg-blue-600 text-white shadow-xs font-semibold'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {grp}
                </button>
              ))}
              <button
                onClick={() => setFilterAlertsOnly(!filterAlertsOnly)}
                className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
                  filterAlertsOnly
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Alertes stock bas ({produits.filter((p) => p.stock_actuel <= p.stock_min).length})
              </button>
            </div>

            <div className="w-full md:w-64">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher produit, code, famille..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white text-slate-800 rounded-xl md:rounded-lg border border-slate-200 md:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                />
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* MOBILE PRODUCT CARDS (md:hidden space-y-3) */}
          {/* ========================================================================= */}
          <div className="md:hidden space-y-3">
            {filteredProduits.length === 0 ? (
              <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
                Aucun produit trouvé.
              </div>
            ) : (
              paginatedProduits.map((p) => {
                const isLowStock = p.stock_actuel <= p.stock_min;

                return (
                  <div
                    key={p.id}
                    className={`bg-white rounded-xl border shadow-xs overflow-hidden transition ${
                      isLowStock ? 'border-rose-300 bg-rose-50/10' : 'border-slate-200'
                    }`}
                  >
                    {/* Header */}
                    <div className="p-3.5 pb-2.5 border-b border-slate-100 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                            {p.code}
                          </span>
                          <span className="font-bold text-slate-900 text-sm">
                            {p.libelle}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 font-medium">
                            {p.groupe || 'GÉNÉRAL'}
                          </span>
                          {p.famille && <span>• {p.famille}</span>}
                          <span>• Unité: <strong>{p.unite || 'U'}</strong></span>
                        </div>
                      </div>

                      {isLowStock ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300 shrink-0">
                          ⚠️ Alerte Stock
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          En Stock
                        </span>
                      )}
                    </div>

                    {/* Body */}
                    <div className="p-3.5 space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                            Prix Vente HT (TVA {p.taux_tva}%)
                          </span>
                          <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                            {formatCurrency(p.prix_ht, false)} <span className="text-[11px] font-normal text-slate-500">MAD</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                            Stock Actuel ({p.unite || 'U'})
                          </span>
                          <div
                            className={`font-mono font-black text-base mt-0.5 ${
                              isLowStock ? 'text-rose-600' : 'text-emerald-700'
                            }`}
                          >
                            {p.stock_actuel.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                          </div>
                          {(p.stock_virtuel !== undefined && p.stock_virtuel !== p.stock_actuel) && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              Virtuel: {p.stock_virtuel.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions Toolbar */}
                    <div className="bg-slate-50/90 px-3 py-2 border-t border-slate-100 flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => onOpenStockAdjust(p)}
                        className="flex items-center gap-1.5 px-3 min-h-[36px] rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 shadow-2xs transition active:scale-95 touch-manipulation"
                      >
                        <Package className="w-3.5 h-3.5" />
                        <span>Ajuster Stock</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onOpenEditProduit(p)}
                          className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-900 bg-white border border-slate-200 transition active:scale-95 touch-manipulation"
                          title="Modifier"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Supprimer définitivement le produit ${p.libelle} ?`)) {
                              onDeleteProduit(p.id);
                            }
                          }}
                          className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition active:scale-95 touch-manipulation"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ========================================================================= */}
          {/* DESKTOP PRODUCT TABLE (hidden md:block) */}
          {/* ========================================================================= */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-blue-700 text-white font-semibold divide-x divide-blue-600">
                    <th className="py-2.5 px-3 min-w-[90px]">Code</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Libellé</th>
                    <th className="py-2.5 px-3 min-w-[110px]">Groupe</th>
                    <th className="py-2.5 px-3 min-w-[100px]">Famille</th>
                    <th className="py-2.5 px-3 text-center min-w-[50px]">U M</th>
                    <th className="py-2.5 px-3 text-center min-w-[70px]">TVA</th>
                    <th className="py-2.5 px-3 text-right min-w-[90px]">P.U Vente HT</th>
                    <th className="py-2.5 px-3 text-right min-w-[100px] text-amber-200">Coût Revient/Achat</th>
                    <th className="py-2.5 px-3 text-right min-w-[100px] font-bold">Qté Stock</th>
                    <th className="py-2.5 px-3 text-right min-w-[110px] text-emerald-200 font-bold">Valorisation HT</th>
                    <th className="py-2.5 px-3 text-center min-w-[100px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredProduits.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400 text-sm">
                        Aucun produit trouvé.
                      </td>
                    </tr>
                  ) : (
                    paginatedProduits.map((p) => {
                      const isLowStock = p.stock_actuel <= p.stock_min;

                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-blue-50/50 transition divide-x divide-slate-100 even:bg-slate-50/40"
                        >
                          <td className="py-2 px-3 font-mono font-semibold text-slate-700">
                            {p.code}
                          </td>
                          <td className="py-2 px-3 text-slate-900 font-semibold">
                            {p.libelle}
                          </td>
                          <td className="py-2 px-3 text-slate-600">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">
                              {p.groupe || 'GENERAL'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-600">
                            {p.famille || '-'}
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-slate-700">
                            {p.unite || 'U'}
                          </td>
                          <td className="py-2 px-3 text-center font-medium text-slate-700">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                                p.taux_tva === 20
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : p.taux_tva === 10
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {p.taux_tva}%
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(p.prix_ht, false)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-amber-700 font-semibold bg-amber-50/30">
                            {formatCurrency(p.prix_achat_ht || p.prix_achat || 0, false)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold">
                            <span
                              className={`px-2 py-0.5 rounded ${
                                isLowStock
                                  ? 'bg-rose-100 text-rose-800 font-extrabold border border-rose-300'
                                  : 'text-slate-900'
                              }`}
                            >
                              {p.stock_actuel.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700 bg-emerald-50/30">
                            {formatCurrency(
                              p.stock_actuel * Number(p.prix_achat_ht || p.prix_achat || p.prix_ht || 0),
                              false
                            )}
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => onOpenStockAdjust(p)}
                                className="p-1 hover:bg-slate-200 text-slate-600 hover:text-blue-600 rounded transition"
                                title="Ajuster le stock / Entrée"
                              >
                                <Package className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onOpenEditProduit(p)}
                                className="p-1 hover:bg-slate-200 text-slate-600 hover:text-indigo-600 rounded transition"
                                title="Modifier"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Supprimer définitivement le produit ${p.libelle} ?`)) {
                                    onDeleteProduit(p.id);
                                  }
                                }}
                                className="p-1 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded transition"
                                title="Supprimer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Shared Catalog Pagination */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <TablePagination
              currentPage={currentProdPage}
              pageSize={prodPageSize}
              totalItems={filteredProduits.length}
              onPageChange={setCurrentProdPage}
              onPageSizeChange={(newSize) => {
                setProdPageSize(newSize);
                setCurrentProdPage(1);
              }}
              itemLabel="articles"
            />
          </div>
        </>
      ) : (
        /* Stock Movements Log */
        <div className="space-y-3">
          {/* Mobile Movements List (md:hidden) */}
          <div className="md:hidden space-y-3">
            {stockMouvements.length === 0 ? (
              <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
                Aucun mouvement de stock enregistré.
              </div>
            ) : (
              paginatedMouvements.map((m) => (
                <div key={m.id} className="bg-white rounded-xl border border-slate-200 shadow-xs p-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-slate-900 text-xs">{m.produit_nom}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{formatDate(m.date)}</div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        m.type === 'ENTREE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : m.type === 'SORTIE_BL'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {m.type === 'ENTREE' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                      {m.type}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                    <span className="text-slate-500 font-mono text-[11px]">{m.reference_doc || m.motif}</span>
                    <div className="text-right">
                      <span className={`font-mono font-black text-sm ${m.quantite > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {m.quantite > 0 ? `+${m.quantite}` : m.quantite}
                      </span>
                      <div className="text-[10px] text-slate-400 font-mono">Après: {m.stock_apres}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Movements Table (hidden md:block) */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Journal des Mouvements de Stock
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-white font-semibold divide-x divide-slate-700">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Produit</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3 text-right">Quantité</th>
                    <th className="py-2.5 px-3">Réf Document</th>
                    <th className="py-2.5 px-3">Motif</th>
                    <th className="py-2.5 px-3 text-right">Stock Après</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {stockMouvements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        Aucun mouvement de stock enregistré.
                      </td>
                    </tr>
                  ) : (
                    paginatedMouvements.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50 transition divide-x divide-slate-100">
                        <td className="py-2 px-3 text-slate-600">{formatDate(m.date)}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{m.produit_nom}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                              m.type === 'ENTREE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : m.type === 'SORTIE_BL'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {m.type === 'ENTREE' ? (
                              <ArrowDownLeft className="w-3 h-3" />
                            ) : (
                              <ArrowUpRight className="w-3 h-3" />
                            )}
                            {m.type}
                          </span>
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-mono font-bold ${
                            m.quantite > 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {m.quantite > 0 ? `+${m.quantite}` : m.quantite}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-700">{m.reference_doc || '-'}</td>
                        <td className="py-2 px-3 text-slate-600">{m.motif}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {m.stock_apres}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Movements Pagination */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <TablePagination
              currentPage={currentMvtPage}
              pageSize={mvtPageSize}
              totalItems={stockMouvements.length}
              onPageChange={setCurrentMvtPage}
              onPageSizeChange={(newSize) => {
                setMvtPageSize(newSize);
                setCurrentMvtPage(1);
              }}
              itemLabel="mouvements"
            />
          </div>
        </div>
      )}
    </div>
  );
};
