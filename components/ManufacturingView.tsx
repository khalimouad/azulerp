'use client';

import React, { useState, useMemo } from 'react';
import {
  BOM,
  ProductionOrder,
  Produit,
  StockMouvement
} from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  SAMPLE_BOMS,
  DEFAULT_WORK_CENTERS,
  checkStockForBOM,
  createProductionOrderFromBOM,
  completeProductionOrder
} from '@/lib/manufacturing-service';
import {
  saveBOM,
  deleteBOM,
  saveProductionOrder,
  completeProductionOrder as apiCompleteProductionOrder,
  deleteProductionOrder
} from '@/lib/postgres-service';
import {
  Factory,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Play,
  Check,
  Plus,
  Trash2,
  Clock,
  DollarSign,
  Boxes,
  RefreshCw,
  Search,
  Filter,
  X,
  Eye,
  FileSpreadsheet,
  Settings
} from 'lucide-react';

export type ManufacturingTab = 'OF' | 'BOM';

interface ManufacturingViewProps {
  boms?: BOM[];
  productionOrders?: ProductionOrder[];
  produits?: Produit[];
  onRefresh?: () => void;
}

export function ManufacturingView({
  boms = SAMPLE_BOMS,
  productionOrders = [],
  produits = [],
  onRefresh
}: ManufacturingViewProps) {
  const [currentTab, setCurrentTab] = useState<ManufacturingTab>('OF');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [showOfModal, setShowOfModal] = useState<boolean>(false);
  const [showBomModal, setShowBomModal] = useState<boolean>(false);
  const [viewingOrder, setViewingOrder] = useState<ProductionOrder | null>(null);

  // New OF Form
  const [selectedBomId, setSelectedBomId] = useState<number>(boms[0]?.id || 1);
  const [quantiteTarget, setQuantiteTarget] = useState<number>(100);
  const [responsable, setResponsable] = useState<string>('Chef d’Atelier');
  const [atelier, setAtelier] = useState<string>('Atelier Cuisine & Préparation');

  // New BOM Form
  const [newBom, setNewBom] = useState<Partial<BOM>>({
    code: `BOM-${Date.now().toString().slice(-4)}`,
    nom: '',
    produit_fini_nom: '',
    quantite_produite: 100,
    unite: 'Pce',
    actif: true,
    version: '1.0',
    notes: '',
    composants: [
      { produit_nom: 'Matière première 1', quantite: 10, unite: 'KG', cout_unitaire: 25, cout_total: 250 },
      { produit_nom: 'Emballage / Bouteille', quantite: 100, unite: 'Pce', cout_unitaire: 2, cout_total: 200 }
    ],
    cout_matieres_estime: 450,
    cout_main_oeuvre_estime: 100,
    frais_generaux_estime: 50,
    cout_revient_unitaire: 6.00
  });

  // Stocks map for quick availability check
  const stocksMap = useMemo(() => {
    const map: Record<string, number> = {};
    produits.forEach(p => {
      map[p.libelle] = Number(p.stock_actuel) || 0;
      map[p.code] = Number(p.stock_actuel) || 0;
    });
    return map;
  }, [produits]);

  // Selected BOM for new OF
  const currentSelectedBom = useMemo(() => {
    return boms.find(b => b.id === selectedBomId) || boms[0];
  }, [boms, selectedBomId]);

  // Stock check for modal
  const stockCheck = useMemo(() => {
    if (!currentSelectedBom) return null;
    return checkStockForBOM(currentSelectedBom, quantiteTarget, stocksMap);
  }, [currentSelectedBom, quantiteTarget, stocksMap]);

  // Filtered production orders
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

  // Metrics
  const ofEnCours = productionOrders.filter(o => o.status === 'en_cours' || o.status === 'confirme').length;
  const ofTermines = productionOrders.filter(o => o.status === 'termine').length;
  const totalCoutProduction = productionOrders
    .filter(o => o.status === 'termine')
    .reduce((s, o) => s + (Number(o.cout_total_production) || 0), 0);

  // Handle Launching new OF
  const handleLaunchOF = async () => {
    if (!currentSelectedBom) return;
    const order = createProductionOrderFromBOM(currentSelectedBom, quantiteTarget, {
      responsable,
      atelier
    });

    try {
      await saveProductionOrder(order);
      setShowOfModal(false);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    }
  };

  // Handle Completing OF (Deducts stock & posts accounting entry)
  const handleCompleteOF = async (order: ProductionOrder) => {
    if (!confirm(`Clôturer l'OF ${order.numero} ?\nCette action va déstocker les matières premières, entrer le produit fini en stock et générer les écritures comptables.`)) {
      return;
    }

    try {
      await apiCompleteProductionOrder(order);
      alert(`OF ${order.numero} clôturé ! Stocks mis à jour et écriture comptable générée avec succès.`);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    }
  };

  // Handle saving new BOM
  const handleSaveBOM = async () => {
    if (!newBom.nom || !newBom.produit_fini_nom) {
      alert('Veuillez spécifier le nom de la recette et le produit fini.');
      return;
    }

    const coutMat = (newBom.composants || []).reduce((s, c) => s + Number(c.cout_total || 0), 0);
    const coutMOD = Number(newBom.cout_main_oeuvre_estime) || 0;
    const coutFrais = Number(newBom.frais_generaux_estime) || 0;
    const qte = Number(newBom.quantite_produite) || 1;
    const coutUnitaire = (coutMat + coutMOD + coutFrais) / qte;

    const fullBOM: BOM = {
      ...newBom as BOM,
      cout_matieres_estime: coutMat,
      cout_main_oeuvre_estime: coutMOD,
      frais_generaux_estime: coutFrais,
      cout_revient_unitaire: Math.round(coutUnitaire * 100) / 100,
    };

    try {
      await saveBOM(fullBOM);
      setShowBomModal(false);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full">
                Fabrication & Ateliers
              </span>
              <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                Stock & Comptabilité Intégrés
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <Factory className="w-8 h-8 text-amber-400" />
              Fabrication & Ordres de Production (OF)
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Recettes & nomenclatures (BOM), déstockage automatique des matières et valorisation comptable du produit fini
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowBomModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl font-medium transition text-sm"
            >
              <Plus className="w-4 h-4" />
              Nouvelle Recette (BOM)
            </button>
            <button
              onClick={() => setShowOfModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-medium transition shadow-lg shadow-amber-600/30 text-sm"
            >
              <Play className="w-4 h-4" />
              Lancer un Ordre de Fabrication
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800">
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-3 border border-slate-700/50">
            <p className="text-xs text-slate-400 uppercase font-medium">OF en Cours</p>
            <p className="text-lg font-bold text-amber-400 mt-1">{ofEnCours} ordre(s)</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-3 border border-slate-700/50">
            <p className="text-xs text-slate-400 uppercase font-medium">OF Achevés & Clôturés</p>
            <p className="text-lg font-bold text-emerald-400 mt-1">{ofTermines} ordre(s)</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-3 border border-slate-700/50">
            <p className="text-xs text-slate-400 uppercase font-medium">Recettes Actives (BOM)</p>
            <p className="text-lg font-bold text-white mt-1">{boms.length} recettes</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-3 border border-slate-700/50">
            <p className="text-xs text-slate-400 uppercase font-medium">Coût Production Réalisé</p>
            <p className="text-lg font-bold text-white mt-1">{formatCurrency(totalCoutProduction)}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 pb-1">
        {[
          { id: 'OF', label: 'Ordres de Fabrication (OF)', icon: Factory },
          { id: 'BOM', label: 'Nomenclatures & Recettes (BOM)', icon: Layers },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id as ManufacturingTab)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                isActive
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: ORDRES DE FABRICATION */}
      {currentTab === 'OF' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher OF, produit fini..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2">
              {['ALL', 'confirme', 'en_cours', 'termine'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition capitalize ${
                    statusFilter === st
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {st === 'ALL' ? 'Tous' : st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* OF Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase">
                  <th className="py-3.5 px-4">N° Ordre</th>
                  <th className="py-3.5 px-4">Produit à Fabriquer</th>
                  <th className="py-3.5 px-4">Nomenclature (BOM)</th>
                  <th className="py-3.5 px-4 text-center">Quantité</th>
                  <th className="py-3.5 px-4 text-right">Coût Unitaire</th>
                  <th className="py-3.5 px-4 text-right">Coût Total</th>
                  <th className="py-3.5 px-4 text-center">Statut</th>
                  <th className="py-3.5 px-4 text-center">Comptabilité</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <Factory className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="font-semibold text-slate-600 dark:text-slate-300">Aucun ordre de fabrication trouvé.</p>
                      <p className="text-xs mt-1">Cliquez sur « Lancer un Ordre de Fabrication » pour démarrer une production.</p>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map(order => (
                    <tr key={order.id || order.numero} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-600 dark:text-amber-400 text-xs">
                        {order.numero}
                        <span className="block font-normal text-slate-400">{formatDate(order.date_lancement)}</span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {order.produit_fini_nom}
                        <span className="block text-xs font-normal text-slate-400">{order.atelier}</span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400">
                        {order.bom_nom || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold">
                        {order.quantite_reelle || order.quantite_prevue} {order.unite}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(order.cout_revient_unitaire)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(order.cout_total_production)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${
                          order.status === 'termine'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border-emerald-200 dark:border-emerald-800'
                            : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 border-amber-200 dark:border-amber-800'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {order.comptabilise ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Écritures passées
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">En attente clôture</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {order.status !== 'termine' && (
                            <button
                              onClick={() => handleCompleteOF(order)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow transition"
                              title="Clôturer l'OF, déstocker matières premières et comptabiliser"
                            >
                              <Check className="w-3.5 h-3.5" /> Clôturer
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              if (confirm(`Supprimer l'ordre de fabrication ${order.numero} ?`)) {
                                if (order.id) await deleteProductionOrder(order.id);
                                if (onRefresh) onRefresh();
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: NOMENCLATURES (BOM) */}
      {currentTab === 'BOM' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {boms.map(bom => (
            <div key={bom.id || bom.code} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">{bom.code} • v{bom.version}</span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{bom.nom}</h3>
                  <p className="text-xs text-slate-500">Produit fini : <span className="font-semibold text-slate-800 dark:text-slate-200">{bom.produit_fini_nom}</span> ({bom.quantite_produite} {bom.unite})</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedBomId(bom.id || 1);
                    setQuantiteTarget(bom.quantite_produite);
                    setShowOfModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold shadow transition"
                >
                  <Play className="w-3.5 h-3.5" /> Lancer OF
                </button>
              </div>

              {/* Components table */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Matières & Composants</span>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {bom.composants?.map((c, i) => (
                    <div key={i} className="py-1.5 flex justify-between items-center">
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {c.produit_nom}
                        <span className="text-slate-400 ml-1">({c.quantite} {c.unite} @ {formatCurrency(c.cout_unitaire)})</span>
                      </span>
                      <span className="font-mono font-semibold text-slate-900 dark:text-white">
                        {formatCurrency(c.cout_total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Costing breakdown */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Coût Matières Premières :</span>
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{formatCurrency(bom.cout_matieres_estime)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Main d'Œuvre Directe (MOD) :</span>
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{formatCurrency(bom.cout_main_oeuvre_estime)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Frais Généraux & Ateliers :</span>
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{formatCurrency(bom.frais_generaux_estime)}</span>
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between font-bold text-sm mt-3">
                  <span className="text-amber-900 dark:text-amber-300">Coût de Revient Unitaire :</span>
                  <span className="text-lg font-mono text-amber-900 dark:text-amber-300">
                    {formatCurrency(bom.cout_revient_unitaire)} / {bom.unite}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: LANCER UN ORDRE DE FABRICATION */}
      {showOfModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Lancer un Ordre de Fabrication (OF)</h3>
              <button onClick={() => setShowOfModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Recette / Nomenclature (BOM)</label>
                <select
                  value={selectedBomId}
                  onChange={(e) => setSelectedBomId(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold"
                >
                  {boms.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.nom} ({b.quantite_produite} {b.unite})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Quantité à Fabriquer</label>
                  <input
                    type="number"
                    min={1}
                    value={quantiteTarget}
                    onChange={(e) => setQuantiteTarget(parseFloat(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Atelier Responsable</label>
                  <input
                    type="text"
                    value={atelier}
                    onChange={(e) => setAtelier(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* Stock check visualizer */}
              {stockCheck && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Disponibilité des Stocks de Matières</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
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
                        <span className="font-medium">{a.produit_nom}</span>
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

            <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowOfModal(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleLaunchOF}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-amber-600/20"
              >
                Valider et Lancer l'OF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOUVELLE NOMENCLATURE (BOM) */}
      {showBomModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Créer une Nomenclature (BOM)</h3>
              <button onClick={() => setShowBomModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Nom de la Recette *</label>
                <input
                  type="text"
                  placeholder="Ex: Sauce Pesto Bio 200g"
                  value={newBom.nom}
                  onChange={(e) => setNewBom({ ...newBom, nom: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Produit Fini Obtenu *</label>
                  <input
                    type="text"
                    placeholder="Ex: Pesto Artisanal 200g"
                    value={newBom.produit_fini_nom}
                    onChange={(e) => setNewBom({ ...newBom, produit_fini_nom: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Quantité Produite & Unité</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={newBom.quantite_produite}
                      onChange={(e) => setNewBom({ ...newBom, quantite_produite: parseFloat(e.target.value) || 1 })}
                      className="w-24 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold"
                    />
                    <input
                      type="text"
                      placeholder="Pce, L, KG"
                      value={newBom.unite}
                      onChange={(e) => setNewBom({ ...newBom, unite: e.target.value })}
                      className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Components */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Composants & Matières Premières</span>
                  <button
                    type="button"
                    onClick={() => {
                      setNewBom({
                        ...newBom,
                        composants: [
                          ...(newBom.composants || []),
                          { produit_nom: '', quantite: 1, unite: 'KG', cout_unitaire: 0, cout_total: 0 }
                        ]
                      });
                    }}
                    className="text-xs font-bold text-amber-600 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Ajouter composant
                  </button>
                </div>

                <div className="space-y-2">
                  {newBom.composants?.map((comp, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                      <input
                        type="text"
                        placeholder="Matière première"
                        value={comp.produit_nom}
                        onChange={(e) => {
                          const updated = [...(newBom.composants || [])];
                          updated[idx] = { ...updated[idx], produit_nom: e.target.value };
                          setNewBom({ ...newBom, composants: updated });
                        }}
                        className="flex-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      />
                      <input
                        type="number"
                        placeholder="Qté"
                        value={comp.quantite || ''}
                        onChange={(e) => {
                          const q = parseFloat(e.target.value) || 0;
                          const updated = [...(newBom.composants || [])];
                          updated[idx] = { ...updated[idx], quantite: q, cout_total: q * (updated[idx].cout_unitaire || 0) };
                          setNewBom({ ...newBom, composants: updated });
                        }}
                        className="w-20 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
                      />
                      <input
                        type="text"
                        placeholder="Unité"
                        value={comp.unite}
                        onChange={(e) => {
                          const updated = [...(newBom.composants || [])];
                          updated[idx] = { ...updated[idx], unite: e.target.value };
                          setNewBom({ ...newBom, composants: updated });
                        }}
                        className="w-16 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      />
                      <input
                        type="number"
                        placeholder="Coût U."
                        value={comp.cout_unitaire || ''}
                        onChange={(e) => {
                          const c = parseFloat(e.target.value) || 0;
                          const updated = [...(newBom.composants || [])];
                          updated[idx] = { ...updated[idx], cout_unitaire: c, cout_total: (updated[idx].quantite || 0) * c };
                          setNewBom({ ...newBom, composants: updated });
                        }}
                        className="w-24 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (newBom.composants || []).filter((_, i) => i !== idx);
                          setNewBom({ ...newBom, composants: updated });
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowBomModal(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveBOM}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-amber-600/20"
              >
                Créer la Recette (BOM)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
