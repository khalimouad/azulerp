'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Produit, StockMouvement } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { TablePagination } from '@/components/TablePagination';
import { Plus, Search, Package, AlertTriangle, ArrowUpDown, History, Edit, Trash2, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

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
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
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
          {/* Group and Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Group pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
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
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white text-slate-800 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Table matching WinDev Screenshot 5 & 6 */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-blue-700 text-white font-semibold divide-x divide-blue-600">
                    <th className="py-2.5 px-3 min-w-[90px]">Code</th>
                    <th className="py-2.5 px-3 min-w-[220px]">Libellé</th>
                    <th className="py-2.5 px-3 min-w-[120px]">Groupe</th>
                    <th className="py-2.5 px-3 min-w-[120px]">Famille</th>
                    <th className="py-2.5 px-3 text-center min-w-[60px]">U M</th>
                    <th className="py-2.5 px-3 text-center min-w-[80px]">Taux TVA</th>
                    <th className="py-2.5 px-3 text-right min-w-[100px]">P U HT</th>
                    <th className="py-2.5 px-3 text-right min-w-[110px] font-bold">Qtité en Stock</th>
                    <th className="py-2.5 px-3 text-right min-w-[100px]">Stock Virtuel</th>
                    <th className="py-2.5 px-3 text-center min-w-[100px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredProduits.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400 text-sm">
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
                          <td className="py-2 px-3 text-right font-mono text-slate-600">
                            {(p.stock_virtuel ?? p.stock_actuel ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
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
                                  onDeleteProduit(p.id);
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

            {/* Catalog Pagination */}
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
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
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

          {/* Movements Pagination */}
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
      )}
    </div>
  );
};
