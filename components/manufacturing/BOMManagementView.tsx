'use client';

import React, { useState, useMemo } from 'react';
import { BOM, BOMInputLine, BOMOutputLine, Produit } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { saveBOM, deleteBOM } from '@/lib/postgres-service';
import {
  Layers,
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Boxes,
  ArrowRight,
  Factory,
  Copy,
  Edit,
  Eye,
  RefreshCw,
  Percent,
  X,
  Sparkles
} from 'lucide-react';

interface BOMManagementViewProps {
  boms?: BOM[];
  produits?: Produit[];
  onRefresh?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export function BOMManagementView({
  boms = [],
  produits = [],
  onRefresh,
  onNavigateTab,
}: BOMManagementViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingBom, setEditingBom] = useState<BOM | null>(null);

  // Form State for BOM creation / edition
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [version, setVersion] = useState('1.0');
  const [active, setActive] = useState(true);
  const [notes, setNotes] = useState('');

  // Multi-Inputs (Raw materials)
  const [inputs, setInputs] = useState<BOMInputLine[]>([
    { produit_nom: '', quantite: 10, unite: 'Kg', cout_unitaire: 20, cout_total: 200 },
  ]);

  // Multi-Outputs (Finished products & waste)
  const [outputs, setOutputs] = useState<BOMOutputLine[]>([
    { produit_nom: '', quantite: 8, unite: 'Kg', est_dechet: false, pourcentage_repartition: 100 },
    { produit_nom: 'Déchet résiduel / Rebut', quantite: 2, unite: 'Kg', est_dechet: true, pourcentage_repartition: 0 },
  ]);

  // Costs
  const [coutMainOeuvre, setCoutMainOeuvre] = useState<number>(150);
  const [fraisGeneraux, setFraisGeneraux] = useState<number>(50);

  // Live calculations
  const totalInputKg = useMemo(() => {
    return inputs.reduce((sum, i) => sum + (Number(i.quantite) || 0), 0);
  }, [inputs]);

  const totalInputCost = useMemo(() => {
    return inputs.reduce((sum, i) => sum + (Number(i.cout_total) || ((Number(i.quantite) || 0) * (Number(i.cout_unitaire) || 0))), 0);
  }, [inputs]);

  const totalWasteKg = useMemo(() => {
    return outputs.filter(o => o.est_dechet).reduce((sum, o) => sum + (Number(o.quantite) || 0), 0);
  }, [outputs]);

  const totalFinishedKg = useMemo(() => {
    return outputs.filter(o => !o.est_dechet).reduce((sum, o) => sum + (Number(o.quantite) || 0), 0);
  }, [outputs]);

  const globalYieldPct = useMemo(() => {
    if (totalInputKg <= 0) return 0;
    return Math.round(((totalInputKg - totalWasteKg) / totalInputKg) * 100);
  }, [totalInputKg, totalWasteKg]);

  const totalCost = useMemo(() => {
    return totalInputCost + Number(coutMainOeuvre || 0) + Number(fraisGeneraux || 0);
  }, [totalInputCost, coutMainOeuvre, fraisGeneraux]);

  // Open modal for new BOM
  const handleOpenCreate = () => {
    setEditingBom(null);
    setCode(`BOM-${Date.now().toString().slice(-4)}`);
    setName('');
    setVersion('1.0');
    setActive(true);
    setNotes('');
    setInputs([
      { produit_nom: '', quantite: 10, unite: 'Kg', cout_unitaire: 20, cout_total: 200 },
    ]);
    setOutputs([
      { produit_nom: '', quantite: 8, unite: 'Kg', est_dechet: false, pourcentage_repartition: 100 },
      { produit_nom: 'Déchet / Perte', quantite: 2, unite: 'Kg', est_dechet: true, pourcentage_repartition: 0 },
    ]);
    setCoutMainOeuvre(150);
    setFraisGeneraux(50);
    setShowModal(true);
  };

  // Open modal for edit
  const handleOpenEdit = (bom: BOM) => {
    setEditingBom(bom);
    setCode(bom.code);
    setName(bom.nom);
    setVersion(bom.version || '1.0');
    setActive(bom.actif ?? true);
    setNotes(bom.notes || '');

    if (bom.inputs && bom.inputs.length > 0) {
      setInputs(bom.inputs);
    } else if (bom.composants && bom.composants.length > 0) {
      setInputs(bom.composants.map(c => ({
        produit_id: c.produit_id,
        produit_nom: c.produit_nom,
        quantite: c.quantite,
        unite: c.unite,
        cout_unitaire: c.cout_unitaire,
        cout_total: c.cout_total,
      })));
    } else {
      setInputs([{ produit_nom: '', quantite: 1, unite: 'Kg', cout_unitaire: 0, cout_total: 0 }]);
    }

    if (bom.outputs && bom.outputs.length > 0) {
      setOutputs(bom.outputs);
    } else {
      setOutputs([
        {
          produit_id: bom.produit_fini_id,
          produit_nom: bom.produit_fini_nom,
          quantite: bom.quantite_produite || 1,
          unite: bom.unite || 'Kg',
          est_dechet: false,
          pourcentage_repartition: 100,
        }
      ]);
    }

    setCoutMainOeuvre(bom.cout_main_oeuvre_estime || 0);
    setFraisGeneraux(bom.frais_generaux_estime || 0);
    setShowModal(true);
  };

  // Duplicate BOM
  const handleDuplicate = (bom: BOM) => {
    setEditingBom(null);
    setCode(`BOM-${Date.now().toString().slice(-4)}`);
    setName(`${bom.nom} (Copie)`);
    setVersion('1.0');
    setActive(true);
    setNotes(bom.notes || '');
    setInputs(bom.inputs || bom.composants || []);
    setOutputs(bom.outputs || [{
      produit_nom: bom.produit_fini_nom,
      quantite: bom.quantite_produite,
      unite: bom.unite,
      est_dechet: false,
      pourcentage_repartition: 100
    }]);
    setCoutMainOeuvre(bom.cout_main_oeuvre_estime || 0);
    setFraisGeneraux(bom.frais_generaux_estime || 0);
    setShowModal(true);
  };

  // Save BOM
  const handleSave = async () => {
    if (!name.trim()) {
      alert('Veuillez saisir un nom pour la nomenclature.');
      return;
    }
    const cleanOutputs = outputs.filter(o => o.produit_nom.trim() !== '');
    if (cleanOutputs.length === 0) {
      alert('Veuillez définir au moins un produit fini ou déchet.');
      return;
    }

    const firstFinished = cleanOutputs.find(o => !o.est_dechet) || cleanOutputs[0];
    const totalFinishedQty = cleanOutputs.filter(o => !o.est_dechet).reduce((s, o) => s + (Number(o.quantite) || 0), 0) || 1;
    const unitCost = Math.round((totalCost / totalFinishedQty) * 100) / 100;

    const bomPayload: BOM = {
      id: editingBom?.id,
      code,
      nom: name,
      version,
      actif: active,
      notes,
      produit_fini_nom: firstFinished.produit_nom,
      quantite_produite: totalFinishedQty,
      unite: firstFinished.unite || 'Kg',
      inputs: inputs.filter(i => i.produit_nom.trim() !== ''),
      outputs: cleanOutputs,
      composants: inputs.map(i => ({
        produit_id: i.produit_id,
        produit_nom: i.produit_nom,
        quantite: i.quantite,
        unite: i.unite,
        cout_unitaire: i.cout_unitaire,
        cout_total: i.cout_total,
      })),
      cout_matieres_estime: totalInputCost,
      cout_main_oeuvre_estime: coutMainOeuvre,
      frais_generaux_estime: fraisGeneraux,
      cout_revient_unitaire: unitCost,
      rendement_pct: globalYieldPct,
    };

    await saveBOM(bomPayload);
    setShowModal(false);
    if (onRefresh) onRefresh();
  };

  // Delete BOM
  const handleDelete = async (id?: number) => {
    if (!id) return;
    if (confirm('Voulez-vous vraiment supprimer cette nomenclature ?')) {
      await deleteBOM(id);
      if (onRefresh) onRefresh();
    }
  };

  // Filtered list
  const filteredBoms = useMemo(() => {
    return boms.filter(b => {
      const matchStatus = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? b.actif : !b.actif);
      const matchSearch = !searchTerm ||
        b.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.produit_fini_nom?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [boms, statusFilter, searchTerm]);

  // Global metrics
  const totalBOMs = boms.length;
  const activeBOMs = boms.filter(b => b.actif).length;
  const avgYield = boms.length > 0
    ? Math.round(boms.reduce((acc, b) => acc + (b.rendement_pct || 90), 0) / boms.length)
    : 0;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      {/* Top Header */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <Layers className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                Nomenclatures (BOM)
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Formules industrielles multi-matières premières, multi-produits finis et gestion des déchets (Modèle FastERP).
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('manufacturing-orders')}
                className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
              >
                <Factory className="w-3.5 h-3.5 text-blue-500" />
                <span>Voir les Ordres de Fabrication</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleOpenCreate}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvelle Nomenclature</span>
            </button>
          </div>
        </div>

        {/* KPI Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Formules</span>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{totalBOMs}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actives en Production</span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{activeBOMs}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Rendement Moyen</span>
            <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5">{avgYield}%</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Multi-Sorties & Déchets</span>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">Actif</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-6 pb-2">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par code, nom ou produit fini..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  statusFilter === 'ALL' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500'
                }`}
              >
                Tous
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  statusFilter === 'ACTIVE' ? 'bg-emerald-600 text-white' : 'text-slate-500'
                }`}
              >
                Actifs
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('INACTIVE')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  statusFilter === 'INACTIVE' ? 'bg-slate-600 text-white' : 'text-slate-500'
                }`}
              >
                Inactifs
              </button>
            </div>
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                title="Actualiser"
                className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-300 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* BOM Table List */}
      <div className="p-6 pt-2">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-3.5">Code & Nomenclature</th>
                  <th className="p-3.5">Formule (Intrants → Extrants)</th>
                  <th className="p-3.5 text-center">Rendement</th>
                  <th className="p-3.5 text-right">Coût Matières</th>
                  <th className="p-3.5 text-right">Coût de Revient U.</th>
                  <th className="p-3.5 text-center">Statut</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredBoms.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      Aucune nomenclature trouvée.
                    </td>
                  </tr>
                ) : (
                  filteredBoms.map((bom) => {
                    const rawInputs = bom.inputs || bom.composants || [];
                    const rawOutputs = bom.outputs || [{
                      produit_nom: bom.produit_fini_nom,
                      quantite: bom.quantite_produite,
                      unite: bom.unite,
                      est_dechet: false
                    }];
                    const finishedList = rawOutputs.filter(o => !o.est_dechet);
                    const wasteList = rawOutputs.filter(o => o.est_dechet);
                    const yieldPct = bom.rendement_pct || 90;

                    return (
                      <tr key={bom.id || bom.code} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{bom.nom}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                              v{bom.version || '1.0'}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                            {bom.code}
                          </div>
                        </td>

                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5 flex-wrap min-w-[300px]">
                            {/* Inputs preview */}
                            <div className="flex items-center gap-1">
                              {rawInputs.slice(0, 2).map((inp, idx) => (
                                <span key={idx} className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                                  {inp.produit_nom} ({inp.quantite}{inp.unite})
                                </span>
                              ))}
                              {rawInputs.length > 2 && (
                                <span className="text-[10px] text-slate-400 font-bold">+{rawInputs.length - 2}</span>
                              )}
                            </div>

                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

                            {/* Outputs preview */}
                            <div className="flex items-center gap-1">
                              {finishedList.slice(0, 2).map((out, idx) => (
                                <span key={idx} className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                                  {out.produit_nom} ({out.quantite}{out.unite})
                                </span>
                              ))}
                              {wasteList.length > 0 && (
                                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
                                  +{wasteList.length} déchet(s)
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                            yieldPct >= 90
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : yieldPct >= 75
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}>
                            {yieldPct}%
                          </span>
                        </td>

                        <td className="p-3.5 text-right font-mono font-medium text-slate-700 dark:text-slate-300">
                          {formatCurrency(bom.cout_matieres_estime)}
                        </td>

                        <td className="p-3.5 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(bom.cout_revient_unitaire)}
                        </td>

                        <td className="p-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            bom.actif
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {bom.actif ? 'Actif' : 'Inactif'}
                          </span>
                        </td>

                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleDuplicate(bom)}
                              title="Dupliquer"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(bom)}
                              title="Modifier"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(bom.id)}
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

      {/* MODAL: CREATE / EDIT MULTI-INPUT & MULTI-OUTPUT BOM */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3.5">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-200 dark:border-emerald-800">
                  <Layers className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {editingBom ? 'Modifier la Nomenclature' : 'Nouvelle Nomenclature (Multi-Intrants & Extrants)'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Formule de transformation avec calcul automatique de rendement et décomposition des coûts.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* General Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Code Nomenclature</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Désignation / Nom de la Formule *</label>
                <input
                  type="text"
                  placeholder="Ex: Conditionnement Huile d’Olive Bio 75cl & 25cl"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                />
              </div>
            </div>

            {/* SECTION 1: INTRANTS / RAW MATERIALS */}
            <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                    <span>1. Intrants (Matières premières, emballages A + B...)</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">Matières consommées lors de la fabrication</p>
                </div>
                <button
                  type="button"
                  onClick={() => setInputs([...inputs, { produit_nom: '', quantite: 1, unite: 'Kg', cout_unitaire: 0, cout_total: 0 }])}
                  className="px-2.5 py-1 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Ajouter Intrant
                </button>
              </div>

              <div className="space-y-2">
                {inputs.map((inp, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                    <input
                      type="text"
                      placeholder="Article / Matière"
                      value={inp.produit_nom}
                      onChange={(e) => {
                        const updated = [...inputs];
                        updated[idx] = { ...updated[idx], produit_nom: e.target.value };
                        setInputs(updated);
                      }}
                      className="flex-1 px-2 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                    />
                    <input
                      type="number"
                      placeholder="Qté"
                      value={inp.quantite || ''}
                      onChange={(e) => {
                        const q = parseFloat(e.target.value) || 0;
                        const updated = [...inputs];
                        updated[idx] = { ...updated[idx], quantite: q, cout_total: q * (updated[idx].cout_unitaire || 0) };
                        setInputs(updated);
                      }}
                      className="w-20 px-2 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 font-mono"
                    />
                    <input
                      type="text"
                      placeholder="Unité"
                      value={inp.unite}
                      onChange={(e) => {
                        const updated = [...inputs];
                        updated[idx] = { ...updated[idx], unite: e.target.value };
                        setInputs(updated);
                      }}
                      className="w-16 px-2 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                    />
                    <input
                      type="number"
                      placeholder="Coût U."
                      value={inp.cout_unitaire || ''}
                      onChange={(e) => {
                        const c = parseFloat(e.target.value) || 0;
                        const updated = [...inputs];
                        updated[idx] = { ...updated[idx], cout_unitaire: c, cout_total: (updated[idx].quantite || 0) * c };
                        setInputs(updated);
                      }}
                      className="w-20 px-2 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 font-mono"
                    />
                    <div className="w-24 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                      {((inp.quantite || 0) * (inp.cout_unitaire || 0)).toFixed(2)} DH
                    </div>
                    <button
                      type="button"
                      onClick={() => setInputs(inputs.filter((_, i) => i !== idx))}
                      className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 font-semibold">Total poids / volume intrants : {totalInputKg}</span>
                <span className="font-bold text-blue-700 dark:text-blue-400 font-mono">Coût matières : {totalInputCost.toFixed(2)} DH</span>
              </div>
            </div>

            {/* SECTION 2: EXTRANTS / FINISHED PRODUCTS & WASTE */}
            <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <span>2. Extrants (Produits finis D + E & Déchets F)</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">Produits obtenus et sous-produits / rebuts</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setOutputs([...outputs, { produit_nom: '', quantite: 1, unite: 'Kg', est_dechet: false, pourcentage_repartition: 50 }])}
                    className="px-2.5 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Produit Fini
                  </button>
                  <button
                    type="button"
                    onClick={() => setOutputs([...outputs, { produit_nom: 'Déchet / Rebut', quantite: 1, unite: 'Kg', est_dechet: true, pourcentage_repartition: 0 }])}
                    className="px-2.5 py-1 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Déchet
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {outputs.map((out, idx) => (
                  <div key={idx} className={`flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border text-xs ${
                    out.est_dechet ? 'border-amber-300 dark:border-amber-800/60' : 'border-emerald-300 dark:border-emerald-800/60'
                  }`}>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      out.est_dechet ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    }`}>
                      {out.est_dechet ? 'Déchet' : 'Produit Fini'}
                    </span>
                    <input
                      type="text"
                      placeholder="Désignation"
                      value={out.produit_nom}
                      onChange={(e) => {
                        const updated = [...outputs];
                        updated[idx] = { ...updated[idx], produit_nom: e.target.value };
                        setOutputs(updated);
                      }}
                      className="flex-1 px-2 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                    />
                    <input
                      type="number"
                      placeholder="Qté"
                      value={out.quantite || ''}
                      onChange={(e) => {
                        const q = parseFloat(e.target.value) || 0;
                        const updated = [...outputs];
                        updated[idx] = { ...updated[idx], quantite: q };
                        setOutputs(updated);
                      }}
                      className="w-20 px-2 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 font-mono"
                    />
                    <input
                      type="text"
                      placeholder="Unité"
                      value={out.unite}
                      onChange={(e) => {
                        const updated = [...outputs];
                        updated[idx] = { ...updated[idx], unite: e.target.value };
                        setOutputs(updated);
                      }}
                      className="w-16 px-2 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                    />
                    {!out.est_dechet && (
                      <div className="flex items-center gap-1 w-24">
                        <input
                          type="number"
                          title="% de répartition du coût"
                          value={out.pourcentage_repartition || ''}
                          onChange={(e) => {
                            const p = parseFloat(e.target.value) || 0;
                            const updated = [...outputs];
                            updated[idx] = { ...updated[idx], pourcentage_repartition: p };
                            setOutputs(updated);
                          }}
                          className="w-14 px-1.5 py-1 bg-slate-50 dark:bg-slate-800 rounded border font-mono text-center"
                        />
                        <span className="text-slate-400">%</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setOutputs(outputs.filter((_, i) => i !== idx))}
                      className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Bilan Matière & Rendement */}
              <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-emerald-900 dark:text-emerald-300">Bilan Matière & Rendement Global :</span>
                  <span className="ml-2 font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm">{globalYieldPct}%</span>
                </div>
                <div className="text-slate-600 dark:text-slate-400 text-[11px]">
                  Produit Fini : <span className="font-bold">{totalFinishedKg}</span> | Déchet : <span className="font-bold text-amber-600">{totalWasteKg}</span>
                </div>
              </div>
            </div>

            {/* SECTION 3: CHARGES & COÛT DE REVIENT */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Main d'œuvre estimée (DH)</label>
                <input
                  type="number"
                  value={coutMainOeuvre || ''}
                  onChange={(e) => setCoutMainOeuvre(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Frais généraux / Ateliers (DH)</label>
                <input
                  type="number"
                  value={fraisGeneraux || ''}
                  onChange={(e) => setFraisGeneraux(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">Coût Total Estimé</label>
                <div className="px-3 py-2 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-mono font-black text-emerald-800 dark:text-emerald-300">
                  {totalCost.toFixed(2)} DH
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition active:scale-95"
              >
                {editingBom ? 'Mettre à jour' : 'Enregistrer la Nomenclature'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
