'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Produit, StockMouvement } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { TablePagination } from '@/components/TablePagination';
import { Plus, Search, Package, AlertTriangle, ArrowUpDown, History, Edit, Trash2, ArrowUpRight, ArrowDownLeft, DollarSign, TrendingUp, Download } from 'lucide-react';
import { SortableTh } from '@/components/SortableTh';
import { TableBulkActionBar } from '@/components/TableBulkActionBar';

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
  const [filterCode, setFilterCode] = useState('');
  const [filterLibelle, setFilterLibelle] = useState('');
  const [selectedGroupe, setSelectedGroupe] = useState<string>('ALL');
  const [selectedFamille, setSelectedFamille] = useState<string>('ALL');
  const [stockStatus, setStockStatus] = useState<'ALL' | 'IN_STOCK' | 'ALERT'>('ALL');
  const [filterAlertsOnly, setFilterAlertsOnly] = useState(false);

  // Sorting & Bulk selection states
  const [sortKey, setSortKey] = useState<string>('code');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedProduitIds, setSelectedProduitIds] = useState<number[]>([]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Pagination for catalog & movements
  const [currentProdPage, setCurrentProdPage] = useState(1);
  const [prodPageSize, setProdPageSize] = useState(10);
  const [currentMvtPage, setCurrentMvtPage] = useState(1);
  const [mvtPageSize, setMvtPageSize] = useState(10);

  // Reset page when filters change
  useEffect(() => {
    setCurrentProdPage(1);
  }, [searchQuery, filterCode, filterLibelle, selectedGroupe, selectedFamille, stockStatus, filterAlertsOnly]);

  // Unique groups from products
  const groupes = useMemo(() => {
    const set = new Set<string>();
    produits.forEach((p) => {
      if (p.groupe) set.add(p.groupe);
    });
    return Array.from(set);
  }, [produits]);

  // Unique families from products
  const familles = useMemo(() => {
    const set = new Set<string>();
    produits.forEach((p) => {
      if (p.famille) set.add(p.famille);
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
      if (selectedFamille !== 'ALL' && p.famille !== selectedFamille) return false;
      if (stockStatus === 'ALERT' && p.stock_actuel > p.stock_min) return false;
      if (stockStatus === 'IN_STOCK' && p.stock_actuel <= 0) return false;
      if (filterAlertsOnly && p.stock_actuel > p.stock_min) return false;
      if (filterCode.trim() && !p.code.toLowerCase().includes(filterCode.toLowerCase().trim())) return false;
      if (filterLibelle.trim() && !p.libelle.toLowerCase().includes(filterLibelle.toLowerCase().trim())) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const matchLib = p.libelle.toLowerCase().includes(q);
        const matchCode = p.code.toLowerCase().includes(q);
        const matchFam = p.famille?.toLowerCase().includes(q);
        if (!matchLib && !matchCode && !matchFam) return false;
      }
      return true;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortKey === 'code') {
        comparison = (a.code || '').localeCompare(b.code || '', undefined, { numeric: true });
      } else if (sortKey === 'libelle') {
        comparison = (a.libelle || '').localeCompare(b.libelle || '', 'fr', { sensitivity: 'base' });
      } else if (sortKey === 'groupe') {
        comparison = (a.groupe || '').localeCompare(b.groupe || '');
      } else if (sortKey === 'famille') {
        comparison = (a.famille || '').localeCompare(b.famille || '');
      } else if (sortKey === 'taux_tva') {
        comparison = Number(a.taux_tva || 0) - Number(b.taux_tva || 0);
      } else if (sortKey === 'prix_ht') {
        comparison = Number(a.prix_ht || 0) - Number(b.prix_ht || 0);
      } else if (sortKey === 'prix_achat') {
        const costA = Number(a.prix_achat_ht || a.prix_achat || 0);
        const costB = Number(b.prix_achat_ht || b.prix_achat || 0);
        comparison = costA - costB;
      } else if (sortKey === 'stock_actuel') {
        comparison = Number(a.stock_actuel || 0) - Number(b.stock_actuel || 0);
      } else if (sortKey === 'valorisation') {
        const valA = Number(a.stock_actuel || 0) * Number(a.prix_achat_ht || a.prix_achat || a.prix_ht || 0);
        const valB = Number(b.stock_actuel || 0) * Number(b.prix_achat_ht || b.prix_achat || b.prix_ht || 0);
        comparison = valA - valB;
      } else {
        comparison = (a.code || '').localeCompare(b.code || '');
      }
      return sortDir === 'asc' ? comparison : -comparison;
    });
  }, [produits, selectedGroupe, filterAlertsOnly, searchQuery, sortKey, sortDir]);

  const paginatedProduits = useMemo(() => {
    const start = (currentProdPage - 1) * prodPageSize;
    return filteredProduits.slice(start, start + prodPageSize);
  }, [filteredProduits, currentProdPage, prodPageSize]);

  const toggleSelectAll = () => {
    if (selectedProduitIds.length === paginatedProduits.length && paginatedProduits.length > 0) {
      setSelectedProduitIds([]);
    } else {
      setSelectedProduitIds(paginatedProduits.map((p) => p.id));
    }
  };

  const toggleSelectProduit = (id: number) => {
    setSelectedProduitIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const exportSelectedToCsv = () => {
    const listToExport = selectedProduitIds.length > 0
      ? produits.filter((p) => selectedProduitIds.includes(p.id))
      : filteredProduits;

    if (listToExport.length === 0) return;
    const headers = ['Code', 'Libellé', 'Groupe', 'Famille', 'Unité', 'TVA %', 'P.U Vente HT', 'Coût Achat HT', 'Stock Actuel', 'Valorisation HT'];
    const rows = listToExport.map((p) => {
      const unitCost = Number(p.prix_achat_ht || p.prix_achat || 0);
      const val = (Number(p.stock_actuel) || 0) * (unitCost || Number(p.prix_ht) || 0);
      return [
        p.code,
        `"${(p.libelle || '').replace(/"/g, '""')}"`,
        `"${p.groupe || ''}"`,
        `"${p.famille || ''}"`,
        p.unite || 'U',
        p.taux_tva,
        Number(p.prix_ht || 0).toFixed(2),
        unitCost.toFixed(2),
        Number(p.stock_actuel || 0).toFixed(2),
        val.toFixed(2),
      ];
    });
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `catalogue_produits_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

      {/* Top Header & AeroTrack Sub-Navigation */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Inventaire & Catalogue Articles
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {produits.length} articles
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Gestion d'inventaire, valorisation en temps réel, tarifs HT et traçabilité des stocks
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenNewProduit}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Ajouter un Produit</span>
            </button>
          </div>
        </div>

        {/* AeroTrack Sub-Navigation Pills */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('MOUVEMENTS')}
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs transition cursor-pointer ${
              activeTab === 'MOUVEMENTS'
                ? 'bg-white border border-slate-300 text-slate-900 shadow-xs font-semibold'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-medium'
            }`}
          >
            <History className="w-3.5 h-3.5 text-slate-400" />
            <span>Historique des Mouvements</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CATALOG')}
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs transition cursor-pointer ${
              activeTab === 'CATALOG'
                ? 'bg-white border border-slate-300 text-slate-900 shadow-xs font-semibold'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-medium'
            }`}
          >
            <Package className="w-3.5 h-3.5 text-slate-700" />
            <span>Inventaire en Stock</span>
          </button>
        </div>
      </div>

      {activeTab === 'CATALOG' ? (
        <>
          {/* Global Inventory Valuation & KPIs Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Articles Référencés</span>
              <span className="text-sm sm:text-base font-bold text-slate-900 mt-0.5 block">{produits.length} références</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Unités en Stock</span>
              <span className="text-sm sm:text-base font-mono font-bold text-slate-900 mt-0.5 block">
                {totalStockUnits.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-100">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-600" />
                Valorisation Stock (Coût Réel)
              </span>
              <span className="text-sm sm:text-base font-mono font-extrabold text-emerald-700 mt-0.5 block">
                {formatCurrency(totalStockValuation)}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-rose-50/70 border border-rose-100">
              <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-rose-600" />
                Alertes Rupture / Réappro
              </span>
              <span className="text-sm sm:text-base font-mono font-bold text-rose-700 mt-0.5 block">
                {produits.filter((p) => p.stock_actuel <= p.stock_min).length} articles
              </span>
            </div>
          </div>

          {/* AeroTrack Filter Toolbar Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <input
              type="text"
              placeholder="Code..."
              value={filterCode}
              onChange={(e) => setFilterCode(e.target.value)}
              className="h-9 px-3 text-xs bg-white text-slate-800 rounded-lg border border-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-2xs"
            />
            <input
              type="text"
              placeholder="Libellé / Désignation..."
              value={filterLibelle}
              onChange={(e) => setFilterLibelle(e.target.value)}
              className="h-9 px-3 text-xs bg-white text-slate-800 rounded-lg border border-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-2xs"
            />
            <select
              value={selectedGroupe}
              onChange={(e) => setSelectedGroupe(e.target.value)}
              className="h-9 px-2.5 text-xs bg-white text-slate-700 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs cursor-pointer"
            >
              <option value="ALL">Tous les Groupes</option>
              {groupes.map((grp) => (
                <option key={grp} value={grp}>{grp}</option>
              ))}
            </select>
            <select
              value={selectedFamille}
              onChange={(e) => setSelectedFamille(e.target.value)}
              className="h-9 px-2.5 text-xs bg-white text-slate-700 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs cursor-pointer"
            >
              <option value="ALL">Toutes les Familles</option>
              {familles.map((fam) => (
                <option key={fam} value={fam}>{fam}</option>
              ))}
            </select>
            <select
              value={stockStatus}
              onChange={(e) => setStockStatus(e.target.value as any)}
              className="h-9 px-2.5 text-xs bg-white text-slate-700 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs cursor-pointer"
            >
              <option value="ALL">Tous les États</option>
              <option value="IN_STOCK">En Stock uniquement</option>
              <option value="ALERT">Alerte Stock Bas ({produits.filter((p) => p.stock_actuel <= p.stock_min).length})</option>
            </select>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Recherche globale..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-8 pr-3 text-xs bg-white text-slate-800 rounded-lg border border-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
              />
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
          {/* ========================================================================= */}
          {/* DESKTOP PRODUCT TABLE (hidden md:block) */}
          {/* ========================================================================= */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Bulk Selection Bar */}
            <TableBulkActionBar
              selectedCount={selectedProduitIds.length}
              totalCount={filteredProduits.length}
              onClearSelection={() => setSelectedProduitIds([])}
              actions={
                <button
                  onClick={exportSelectedToCsv}
                  className="px-2.5 py-1 text-xs font-semibold bg-white text-slate-700 hover:bg-slate-100 rounded border border-slate-300 flex items-center gap-1.5 shadow-xs transition"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  Exporter CSV ({selectedProduitIds.length})
                </button>
              }
            />

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-50 text-slate-700 font-semibold text-xs divide-x divide-slate-200 border-b border-slate-200 select-none shadow-2xs">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-10 bg-slate-50 border-r border-slate-200">
                      <input
                        type="checkbox"
                        checked={
                          paginatedProduits.length > 0 &&
                          paginatedProduits.every((p) => selectedProduitIds.includes(p.id))
                        }
                        onChange={toggleSelectAll}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer align-middle"
                        title="Tout sélectionner / désélectionner sur cette page"
                      />
                    </th>
                    <SortableTh label="Code" sortKey="code" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} width="w-24" />
                    <SortableTh label="Libellé" sortKey="libelle" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} minWidth="min-w-[200px]" />
                    <SortableTh label="Groupe" sortKey="groupe" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} width="w-28" />
                    <SortableTh label="Famille" sortKey="famille" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} width="w-28" />
                    <SortableTh label="U M" sortKey="unite" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} align="center" width="w-14" />
                    <SortableTh label="TVA" sortKey="taux_tva" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} align="center" width="w-16" />
                    <SortableTh label="P.U Vente HT" sortKey="prix_ht" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} align="right" width="w-28" />
                    <SortableTh label="Coût Achat" sortKey="prix_achat_ht" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} align="right" width="w-28" />
                    <SortableTh label="Qté Stock" sortKey="stock_actuel" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} align="right" width="w-28" />
                    <SortableTh label="Valorisation HT" sortKey="stock_valeur" currentSortKey={sortKey} currentSortDir={sortDir} onSort={handleSort} align="right" width="w-32" />
                    <th className="py-2.5 px-3 text-center w-24 bg-slate-50 font-semibold text-xs text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {filteredProduits.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-slate-400 text-sm">
                        Aucun produit trouvé.
                      </td>
                    </tr>
                  ) : (
                    paginatedProduits.map((p) => {
                      const isLowStock = p.stock_actuel <= p.stock_min;
                      const isSelected = selectedProduitIds.includes(p.id);
                      const valHt = p.stock_actuel * Number(p.prix_achat_ht || p.prix_achat || p.prix_ht || 0);

                      return (
                        <tr
                          key={p.id}
                          className={`transition-colors divide-x divide-slate-200 border-b border-slate-200 ${
                            isSelected
                              ? 'bg-blue-50/90 font-medium'
                              : 'bg-white hover:bg-slate-50/80'
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectProduit(p.id)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer align-middle"
                            />
                          </td>
                          <td className="py-2.5 px-3 font-mono text-xs">
                            <button
                              type="button"
                              onClick={() => onOpenEditProduit(p)}
                              className="text-blue-600 hover:text-blue-800 underline font-medium cursor-pointer transition text-left"
                              title={`Modifier ${p.libelle}`}
                            >
                              {p.code}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-slate-800 font-medium">
                            {p.libelle}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">
                              {p.groupe || 'GENERAL'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {p.famille || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                            {p.unite || 'U'}
                          </td>
                          <td className="py-2.5 px-3 text-center font-medium text-slate-700">
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
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(p.prix_ht, false)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                            {formatCurrency(p.prix_achat_ht || p.prix_achat || 0, false)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">
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
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                            {formatCurrency(valHt, false)}
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => onOpenStockAdjust(p)}
                                className="p-1 hover:bg-slate-100 text-slate-500 hover:text-blue-600 rounded transition cursor-pointer"
                                title="Ajuster le stock / Entrée"
                              >
                                <Package className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onOpenEditProduit(p)}
                                className="p-1 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded transition cursor-pointer"
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
                                className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
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
                {filteredProduits.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-50 text-slate-900 font-bold divide-x divide-slate-200 border-t-2 border-slate-300 text-xs">
                      <td colSpan={9} className="py-2 px-3 text-right uppercase tracking-wider text-slate-700">
                        Total {filteredProduits.length} Articles :
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-900">
                        {filteredProduits
                          .reduce((acc, p) => acc + (p.stock_actuel || 0), 0)
                          .toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-emerald-700">
                        {formatCurrency(
                          filteredProduits.reduce(
                            (acc, p) =>
                              acc +
                              p.stock_actuel *
                                Number(p.prix_achat_ht || p.prix_achat || p.prix_ht || 0),
                            0
                          ),
                          false
                        )}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
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
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-slate-800">
              <h3 className="text-xs font-semibold text-slate-800 flex items-center gap-2">
                <History className="w-4 h-4 text-slate-500" />
                Journal des Mouvements de Stock
              </h3>
              <span className="text-xs text-slate-500 font-mono">{stockMouvements.length} mouvements</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-50 text-slate-700 font-semibold text-xs divide-x divide-slate-200 border-b border-slate-200 select-none shadow-2xs">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Produit</th>
                    <th className="py-2.5 px-3 text-center">Type</th>
                    <th className="py-2.5 px-3 text-right">Quantité</th>
                    <th className="py-2.5 px-3">Réf Document</th>
                    <th className="py-2.5 px-3">Motif</th>
                    <th className="py-2.5 px-3 text-right">Stock Après</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {stockMouvements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        Aucun mouvement de stock enregistré.
                      </td>
                    </tr>
                  ) : (
                    paginatedMouvements.map((m) => (
                      <tr key={m.id} className="divide-x divide-slate-200 border-b border-slate-200 bg-white hover:bg-slate-50/80 transition">
                        <td className="py-2.5 px-3 font-mono text-slate-600">{formatDate(m.date)}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{m.produit_nom}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                              m.type === 'ENTREE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : m.type === 'SORTIE_BL'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
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
                          className={`py-2.5 px-3 text-right font-mono font-bold ${
                            m.quantite > 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {m.quantite > 0 ? `+${m.quantite}` : m.quantite}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-blue-600 font-medium">{m.reference_doc || '-'}</td>
                        <td className="py-2.5 px-3 text-slate-600">{m.motif}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
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
