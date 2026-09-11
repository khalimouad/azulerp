'use client';

import React, { useState, useMemo } from 'react';
import { ProductionOrder, BOM, Produit } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  saveProductionOrder,
  completeProductionOrder as apiCompleteProductionOrder,
  deleteProductionOrder
} from '@/lib/postgres-service';
import {
  checkStockForBOM,
  createProductionOrderFromBOM
} from '@/lib/manufacturing-service';
import {
  Factory,
  Plus,
  Play,
  CheckCircle2,
  Trash2,
  Search,
  Check,
  AlertTriangle,
  Clock,
  Layers,
  ArrowRight,
  Eye,
  RefreshCw,
  X,
  Boxes,
  Edit,
  ChevronDown,
  SlidersHorizontal,
} from 'lucide-react';

interface ProductionOrderManagementViewProps {
  productionOrders?: ProductionOrder[];
  boms?: BOM[];
  produits?: Produit[];
  onRefresh?: () => void;
  onNavigateTab?: (tab: string) => void;
  onCreateNew?: () => void;
  onEditOrder?: (order: ProductionOrder) => void;
}

export function ProductionOrderManagementView({
  productionOrders = [],
  boms = [],
  produits = [],
  onRefresh,
  onNavigateTab,
  onCreateNew,
  onEditOrder,
}: ProductionOrderManagementViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Popovers
  const [showOfStatusPopup, setShowOfStatusPopup] = useState(false);
  const [showOfKpiPopup, setShowOfKpiPopup] = useState(false);
  const ofStatusRef = React.useRef<HTMLDivElement>(null);
  const ofKpiRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ofStatusRef.current && !ofStatusRef.current.contains(e.target as Node)) {
        setShowOfStatusPopup(false);
      }
      if (ofKpiRef.current && !ofKpiRef.current.contains(e.target as Node)) {
        setShowOfKpiPopup(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Modals
  const [showNewOfModal, setShowNewOfModal] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<ProductionOrder | null>(null);

  // New OF form
  const [selectedBomId, setSelectedBomId] = useState<number>(boms[0]?.id || 1);
  const [quantiteTarget, setQuantiteTarget] = useState<number>(100);
  const [responsable, setResponsable] = useState<string>('Chef d’Atelier');
  const [atelier, setAtelier] = useState<string>('Atelier de Fabrication & Transformation');

  // Stocks map for quick stock check
  const stocksMap = useMemo(() => {
    const map: Record<string, number> = {};
    produits.forEach(p => {
      map[p.libelle] = Number(p.stock_actuel) || 0;
      map[p.code] = Number(p.stock_actuel) || 0;
    });
    return map;
  }, [produits]);

  // Selected BOM
  const currentSelectedBom = useMemo(() => {
    return boms.find(b => b.id === selectedBomId) || boms[0];
  }, [boms, selectedBomId]);

  // Stock check
  const stockCheck = useMemo(() => {
    if (!currentSelectedBom) return null;
    return checkStockForBOM(currentSelectedBom, quantiteTarget, stocksMap);
  }, [currentSelectedBom, quantiteTarget, stocksMap]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return productionOrders.filter(o => {
      const matchStatus = statusFilter === 'ALL' || o.status === statusFilter;
      const matchSearch = !searchTerm ||
        o.numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.produit_fini_nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.bom_nom?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [productionOrders, statusFilter, searchTerm]);

  // Actions
  const handleLaunchOF = async () => {
    if (!currentSelectedBom) return;
    const newOrder = createProductionOrderFromBOM(currentSelectedBom, quantiteTarget, {
      responsable,
      atelier
    });

    // Also populate multi-inputs and multi-outputs if available
    if (currentSelectedBom.inputs && currentSelectedBom.inputs.length > 0) {
      const ratio = quantiteTarget / (currentSelectedBom.quantite_produite || 1);
      newOrder.inputs = currentSelectedBom.inputs.map(i => ({
        ...i,
        quantite: Math.round(i.quantite * ratio * 100) / 100,
        cout_total: Math.round(i.quantite * ratio * i.cout_unitaire * 100) / 100,
      }));
    }
    if (currentSelectedBom.outputs && currentSelectedBom.outputs.length > 0) {
      const ratio = quantiteTarget / (currentSelectedBom.quantite_produite || 1);
      newOrder.outputs = currentSelectedBom.outputs.map(o => ({
        produit_id: o.produit_id,
        produit_nom: o.produit_nom,
        quantite_prevue: Math.round(o.quantite * ratio * 100) / 100,
        quantite_reelle: Math.round(o.quantite * ratio * 100) / 100,
        unite: o.unite,
        est_dechet: o.est_dechet,
      }));
    }

    await saveProductionOrder(newOrder);
    setShowNewOfModal(false);
    if (onRefresh) onRefresh();
  };

  const handleStartProduction = async (order: ProductionOrder) => {
    const updated: ProductionOrder = { ...order, status: 'en_cours' };
    await saveProductionOrder(updated);
    if (onRefresh) onRefresh();
  };

  const handleCompleteOrder = async (order: ProductionOrder) => {
    if (confirm(`Clôturer l'OF ${order.numero} ? Cela va déstocker les matières consommées et entrer les produits finis en stock.`)) {
      await apiCompleteProductionOrder(order);
      if (onRefresh) onRefresh();
    }
  };

  const handleDelete = async (id?: number) => {
    if (!id) return;
    if (confirm('Voulez-vous supprimer cet ordre de fabrication ?')) {
      await deleteProductionOrder(id);
      if (onRefresh) onRefresh();
    }
  };

  // KPIs
  const totalOrders = productionOrders.length;
  const inProgress = productionOrders.filter(o => o.status === 'en_cours' || o.status === 'confirme').length;
  const completed = productionOrders.filter(o => o.status === 'termine').length;

  return (
    <div className="space-y-2.5 animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* UNIFIED COMPACT 42PX TOOLBAR (Ordres de Fabrication OF) */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        {/* Left: Title + Count + Popover Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Factory className="w-5 h-5 text-blue-600 shrink-0" />
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight whitespace-nowrap">
                Ordres de Fabrication (OF)
              </h2>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 whitespace-nowrap">
                {filteredOrders.length} OF
              </span>
            </div>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

          {/* Popover 1: Filtres Statut */}
          <div className="relative" ref={ofStatusRef}>
            <button
              type="button"
              onClick={() => setShowOfStatusPopup((p) => !p)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border transition shadow-2xs ${
                statusFilter !== 'ALL'
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span>
                Statut : {statusFilter === 'ALL' ? 'Tous' : statusFilter === 'en_cours' ? 'En cours' : statusFilter === 'termine' ? 'Terminés' : 'Confirmés'}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showOfStatusPopup && (
              <div className="absolute left-0 mt-2 z-50 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl p-3 w-52 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                <div className="text-xs font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-1 flex justify-between items-center">
                  <span>Filtrer par Statut OF</span>
                  <button type="button" onClick={() => setShowOfStatusPopup(false)} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
                </div>
                <div className="flex flex-col gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => { setStatusFilter('ALL'); setShowOfStatusPopup(false); }}
                    className={`text-left px-2.5 py-1.5 rounded-lg font-semibold ${statusFilter === 'ALL' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50'}`}
                  >
                    Tous les ordres ({totalOrders})
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStatusFilter('confirme'); setShowOfStatusPopup(false); }}
                    className={`text-left px-2.5 py-1.5 rounded-lg font-semibold ${statusFilter === 'confirme' ? 'bg-amber-50 text-amber-700 font-bold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50'}`}
                  >
                    Confirmés
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStatusFilter('en_cours'); setShowOfStatusPopup(false); }}
                    className={`text-left px-2.5 py-1.5 rounded-lg font-semibold ${statusFilter === 'en_cours' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50'}`}
                  >
                    En cours ({inProgress})
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStatusFilter('termine'); setShowOfStatusPopup(false); }}
                    className={`text-left px-2.5 py-1.5 rounded-lg font-semibold ${statusFilter === 'termine' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50'}`}
                  >
                    Terminés ({completed})
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Popover 2: KPIs & Synthèse Atelier */}
          <div className="relative" ref={ofKpiRef}>
            <button
              type="button"
              onClick={() => setShowOfKpiPopup((p) => !p)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 shadow-2xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden md:inline">En cours :</span>
              <span className="font-bold text-blue-600">{inProgress}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showOfKpiPopup && (
              <div className="absolute left-0 mt-2 z-50 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl p-3.5 w-64 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                <div className="text-xs font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-1.5 flex justify-between items-center">
                  <span>Synthèse de Production</span>
                  <button type="button" onClick={() => setShowOfKpiPopup(false)} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-600">Total Ordres de Fabrication</span>
                    <span className="font-bold text-slate-900">{totalOrders}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50/60 border border-blue-100">
                    <span className="text-blue-900 font-medium">En Cours / Confirmés</span>
                    <span className="font-bold text-blue-700">{inProgress}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/60 border border-emerald-100">
                    <span className="text-emerald-900 font-medium">Terminés (Entrés en Stock)</span>
                    <span className="font-bold text-emerald-700">{completed}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('manufacturing-boms')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <Layers className="w-3.5 h-3.5 text-emerald-500" />
              <span>Nomenclatures (BOM)</span>
            </button>
          )}

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
              title="Actualiser"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (onCreateNew) {
                onCreateNew();
              } else if (onNavigateTab) {
                onNavigateTab('create-production-order');
              } else {
                setShowNewOfModal(true);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Lancer un OF</span>
          </button>
        </div>
      </div>

      {/* Orders Table View */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-semibold divide-x divide-slate-200 border-b border-slate-200 text-xs sticky top-0 z-10">
                  <th className="py-2.5 px-3">Numéro & Date</th>
                  <th className="py-2.5 px-3">Produit Fini / Formule</th>
                  <th className="py-2.5 px-3 text-center">Quantité Cible</th>
                  <th className="py-2.5 px-3 text-right">Coût Total</th>
                  <th className="py-2.5 px-3 text-center">Statut</th>
                  <th className="py-2.5 px-3 text-center">Impact Stocks</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      Aucun ordre de fabrication trouvé.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const isTermine = order.status === 'termine';
                    const isEnCours = order.status === 'en_cours';

                    return (
                      <tr key={order.id || order.numero} className="hover:bg-blue-50/40 transition divide-x divide-slate-200 border-b border-slate-200">
                        <td className="p-3">
                          <div
                            onClick={() => {
                              if (onEditOrder) onEditOrder(order);
                              else setViewingOrder(order);
                            }}
                            className="font-medium text-blue-600 hover:text-blue-800 underline font-mono cursor-pointer"
                          >
                            {order.numero}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Lancé le {formatDate(order.date_lancement)}
                          </div>
                        </td>

                        <td className="p-3.5">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {order.produit_fini_nom}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            BOM: {order.bom_nom || 'Nomenclature standard'}
                          </div>
                        </td>

                        <td className="p-3.5 text-center">
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {order.quantite_reelle || order.quantite_prevue} {order.unite}
                          </span>
                        </td>

                        <td className="p-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {formatCurrency(order.cout_total_production)}
                        </td>

                        <td className="p-3.5 text-center">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                            order.status === 'termine'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : order.status === 'en_cours'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}>
                            {order.status === 'termine' ? '✓ Terminé' : order.status === 'en_cours' ? '⚡ En cours' : 'Confirmé'}
                          </span>
                        </td>

                        <td className="p-3.5 text-center">
                          {order.stock_destocke && order.stock_entre ? (
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              ✓ Stocks mis à jour
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">
                              En attente clôture
                            </span>
                          )}
                        </td>

                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setViewingOrder(order)}
                              title="Détails"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {order.status !== 'termine' && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (onEditOrder) {
                                    onEditOrder(order);
                                  } else if (onNavigateTab) {
                                    onNavigateTab('create-production-order');
                                  }
                                }}
                                title="Modifier l'Ordre de Fabrication"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {order.status === 'confirme' && (
                              <button
                                type="button"
                                onClick={() => handleStartProduction(order)}
                                title="Démarrer la fabrication"
                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition active:scale-95"
                              >
                                <Play className="w-3 h-3" /> Démarrer
                              </button>
                            )}

                            {order.status === 'en_cours' && (
                              <button
                                type="button"
                                onClick={() => handleCompleteOrder(order)}
                                title="Terminer et déstocker les matières"
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition active:scale-95 shadow-xs"
                              >
                                <Check className="w-3 h-3" /> Terminer
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDelete(order.id)}
                              title="Supprimer"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
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
      </div>

      {/* MODAL: NOUVEL OF AVEC CONTROLE DE STOCK */}
      {showNewOfModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 border border-blue-200 dark:border-blue-800">
                  <Factory className="w-5 h-5" />
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Lancer un Ordre de Fabrication</h3>
              </div>
              <button type="button" onClick={() => setShowNewOfModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Sélectionner la Nomenclature (BOM) *</label>
                <select
                  value={selectedBomId}
                  onChange={(e) => setSelectedBomId(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                >
                  {boms.map((b) => (
                    <option key={b.id || b.code} value={b.id}>
                      {b.nom} ({b.code}) - {b.produit_fini_nom}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Quantité Cible à Produire</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      value={quantiteTarget}
                      onChange={(e) => setQuantiteTarget(parseFloat(e.target.value) || 1)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
                    />
                    <span className="px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600">
                      {currentSelectedBom?.unite || 'U'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Atelier Responsable</label>
                  <input
                    type="text"
                    value={atelier}
                    onChange={(e) => setAtelier(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Stock check alert */}
              {stockCheck && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Disponibilité des Matières Premières</span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      stockCheck.disponible
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                    }`}>
                      {stockCheck.disponible ? '✓ Matières Disponibles' : '⚠ Stocks Insuffisants'}
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {stockCheck.alertes.map((a, i) => (
                      <div key={i} className="py-1.5 flex justify-between items-center">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{a.produit_nom}</span>
                        <div className="flex items-center gap-3 font-mono">
                          <span className="text-slate-400">Requis: {a.quantite_requise}</span>
                          <span className={a.stock_actuel >= a.quantite_requise ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                            Stock: {a.stock_actuel}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-3.5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowNewOfModal(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleLaunchOF}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition active:scale-95"
              >
                Confirmer et Lancer l'OF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VIEW DETAILS */}
      {viewingOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white font-mono">{viewingOrder.numero}</h3>
                <p className="text-xs text-slate-500">{viewingOrder.produit_fini_nom} ({viewingOrder.quantite_prevue} {viewingOrder.unite})</p>
              </div>
              <button type="button" onClick={() => setViewingOrder(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <div>Statut: <span className="font-bold">{viewingOrder.status}</span></div>
                <div>Atelier: <span className="font-bold">{viewingOrder.atelier || 'Atelier Principal'}</span></div>
                <div>Date début: <span className="font-bold">{formatDate(viewingOrder.date_lancement)}</span></div>
                <div>Coût Total: <span className="font-bold text-emerald-600">{formatCurrency(viewingOrder.cout_total_production)}</span></div>
              </div>

              <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3">
                <h4 className="font-bold mb-2 uppercase text-slate-400 text-[10px]">Matières Consommées (Intrants)</h4>
                <div className="space-y-1">
                  {(viewingOrder.inputs || viewingOrder.composants_consommes || []).map((c: any, i) => (
                    <div key={i} className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                      <span>{c.produit_nom}</span>
                      <span className="font-mono">{c.quantite || c.quantite_reelle || c.quantite_prevue} {c.unite}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingOrder(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
