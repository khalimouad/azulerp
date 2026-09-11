'use client';

import React, { useState, useMemo } from 'react';
import { BOM, BOMInputLine, BOMOutputLine, Produit } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { deleteBOM } from '@/lib/postgres-service';
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
  Sparkles,
  Play,
  FileSpreadsheet,
  PackageCheck,
  ChevronDown,
  SlidersHorizontal,
} from 'lucide-react';

interface BOMManagementViewProps {
  boms?: BOM[];
  produits?: Produit[];
  onRefresh?: () => void;
  onNavigateTab?: (tab: string) => void;
  onCreateNew?: () => void;
  onEditBom?: (bom: BOM) => void;
  onDuplicateBom?: (bom: BOM) => void;
  onLaunchOF?: (bom: BOM) => void;
}

export function BOMManagementView({
  boms = [],
  produits = [],
  onRefresh,
  onNavigateTab,
  onCreateNew,
  onEditBom,
  onDuplicateBom,
  onLaunchOF,
}: BOMManagementViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [previewBom, setPreviewBom] = useState<BOM | null>(null);

  // Popover state
  const [showBomKpiPopup, setShowBomKpiPopup] = useState(false);
  const [showBomFilterPopup, setShowBomFilterPopup] = useState(false);
  const bomKpiRef = React.useRef<HTMLDivElement>(null);
  const bomFilterRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bomKpiRef.current && !bomKpiRef.current.contains(e.target as Node)) {
        setShowBomKpiPopup(false);
      }
      if (bomFilterRef.current && !bomFilterRef.current.contains(e.target as Node)) {
        setShowBomFilterPopup(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Navigate to Create Page
  const handleOpenCreate = () => {
    if (onCreateNew) {
      onCreateNew();
    } else if (onNavigateTab) {
      onNavigateTab('create-bom');
    }
  };

  // Navigate to Edit Page
  const handleOpenEdit = (bom: BOM) => {
    if (onEditBom) {
      onEditBom(bom);
    } else if (onNavigateTab) {
      onNavigateTab('create-bom');
    }
  };

  // Duplicate BOM
  const handleDuplicate = (bom: BOM) => {
    const duplicated: BOM = {
      ...bom,
      id: undefined,
      code: `BOM-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`,
      nom: `${bom.nom} (Copie)`,
      version: '1.0',
    };
    if (onDuplicateBom) {
      onDuplicateBom(duplicated);
    } else if (onEditBom) {
      onEditBom(duplicated);
    } else if (onNavigateTab) {
      onNavigateTab('create-bom');
    }
  };

  // Launch Production Order (OF)
  const handleLaunchOF = (bom: BOM) => {
    if (onLaunchOF) {
      onLaunchOF(bom);
    } else if (onNavigateTab) {
      onNavigateTab('create-production-order');
    }
  };

  // Delete BOM
  const handleDelete = async (bom: BOM) => {
    if (!bom.id) return;
    if (confirm(`Voulez-vous vraiment supprimer définitivement la nomenclature "${bom.nom}" (${bom.code}) ?`)) {
      try {
        await deleteBOM(bom.id);
        if (onRefresh) onRefresh();
      } catch (err: any) {
        alert('Erreur lors de la suppression: ' + (err?.message || 'Erreur inconnue'));
      }
    }
  };

  // Filtered list
  const filteredBoms = useMemo(() => {
    return boms.filter((b) => {
      const matchStatus =
        statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? b.actif : !b.actif);
      const matchSearch =
        !searchTerm ||
        b.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.produit_fini_nom.toLowerCase().includes(searchTerm.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [boms, statusFilter, searchTerm]);

  // Overall statistics
  const stats = useMemo(() => {
    const totalCount = boms.length;
    const activeCount = boms.filter((b) => b.actif).length;
    const avgYield =
      boms.length > 0
        ? Math.round(
            boms.reduce((s, b) => s + (Number(b.rendement_pct) || 100), 0) /
              boms.length
          )
        : 100;
    const avgCost =
      boms.length > 0
        ? Math.round(
            (boms.reduce(
              (s, b) => s + (Number(b.cout_revient_unitaire) || 0),
              0
            ) /
              boms.length) *
              100
          ) / 100
        : 0;

    return { totalCount, activeCount, avgYield, avgCost };
  }, [boms]);

  return (
    <div className="space-y-2.5 animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* UNIFIED COMPACT 42PX TOOLBAR (BOM / Nomenclatures) */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        {/* Left: Title + Count + Popover Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600 shrink-0" />
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight whitespace-nowrap">
                Nomenclatures (BOM)
              </h2>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 whitespace-nowrap">
                {filteredBoms.length} formules
              </span>
            </div>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

          {/* Popover 1: Filtres Statut */}
          <div className="relative" ref={bomFilterRef}>
            <button
              type="button"
              onClick={() => setShowBomFilterPopup((p) => !p)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border transition shadow-2xs ${
                statusFilter !== 'ALL'
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span>Filtres : {statusFilter === 'ALL' ? 'Toutes' : statusFilter === 'ACTIVE' ? 'Actives' : 'Inactives'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showBomFilterPopup && (
              <div className="absolute left-0 mt-2 z-50 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl p-3 w-56 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                <div className="text-xs font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-1 flex justify-between items-center">
                  <span>Statut Nomenclature</span>
                  <button type="button" onClick={() => setShowBomFilterPopup(false)} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
                </div>
                <div className="flex flex-col gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => { setStatusFilter('ALL'); setShowBomFilterPopup(false); }}
                    className={`text-left px-2.5 py-1.5 rounded-lg font-semibold ${statusFilter === 'ALL' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50'}`}
                  >
                    Toutes ({boms.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStatusFilter('ACTIVE'); setShowBomFilterPopup(false); }}
                    className={`text-left px-2.5 py-1.5 rounded-lg font-semibold ${statusFilter === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50'}`}
                  >
                    Actives ({stats.activeCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStatusFilter('INACTIVE'); setShowBomFilterPopup(false); }}
                    className={`text-left px-2.5 py-1.5 rounded-lg font-semibold ${statusFilter === 'INACTIVE' ? 'bg-amber-50 text-amber-700 font-bold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50'}`}
                  >
                    Inactives ({stats.totalCount - stats.activeCount})
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Popover 2: Rendement & Coût de Revient */}
          <div className="relative" ref={bomKpiRef}>
            <button
              type="button"
              onClick={() => setShowBomKpiPopup((p) => !p)}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 shadow-2xs"
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden md:inline">Rendement :</span>
              <span className="font-bold text-blue-600">{stats.avgYield}%</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showBomKpiPopup && (
              <div className="absolute left-0 mt-2 z-50 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl p-3.5 w-72 space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
                <div className="text-xs font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-1.5 flex justify-between items-center">
                  <span>Indicateurs Industriels & Coûts</span>
                  <button type="button" onClick={() => setShowBomKpiPopup(false)} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50/60 border border-blue-100">
                    <span className="text-blue-900 font-medium">Rendement Matière Moyen</span>
                    <span className="font-bold text-blue-700">{stats.avgYield}%</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/60 border border-emerald-100">
                    <span className="text-emerald-900 font-medium">Coût Revient Moyen</span>
                    <span className="font-bold font-mono text-emerald-700">{formatCurrency(stats.avgCost)}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-slate-600 font-medium">Nomenclatures Actives</span>
                    <span className="font-bold text-slate-900">{stats.activeCount} / {stats.totalCount}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
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
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Nouvelle Formule</span>
          </button>
        </div>
      </div>

      {/* BOMs Table View */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-semibold divide-x divide-slate-200 border-b border-slate-200 text-xs sticky top-0 z-10">
                <th className="py-2.5 px-3">Code & Version</th>
                <th className="py-2.5 px-3">Nomenclature & Produit Principal</th>
                <th className="py-2.5 px-3">Intrants (Matières) ➔ Extrants</th>
                <th className="py-2.5 px-3 text-center">Rendement</th>
                <th className="py-2.5 px-3 text-right">Coût Matières</th>
                <th className="py-2.5 px-3 text-right">Coût Revient Unitaire</th>
                <th className="py-2.5 px-3 text-center">Statut</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredBoms.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <Layers className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                    <p className="font-semibold text-slate-600 dark:text-slate-400 text-sm">
                      Aucune nomenclature trouvée
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Créez votre première formule de fabrication en cliquant sur "Nouvelle Nomenclature".
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenCreate}
                      className="mt-4 px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-indigo-700 transition"
                    >
                      Créer une nomenclature
                    </button>
                  </td>
                </tr>
              ) : (
                filteredBoms.map((bom) => {
                  const rawInputs = bom.inputs || bom.composants || [];
                  let outputsList: BOMOutputLine[] = bom.outputs || [];

                  // If outputs not populated directly, attempt metadata extraction from notes
                  if (outputsList.length === 0 && bom.notes && bom.notes.includes('<!--BOM_OUTPUTS:')) {
                    try {
                      const match = bom.notes.match(/<!--BOM_OUTPUTS:(.*?)-->/);
                      if (match && match[1]) {
                        outputsList = JSON.parse(match[1]);
                      }
                    } catch (_) {}
                  }

                  if (outputsList.length === 0) {
                    outputsList = [
                      {
                        produit_nom: bom.produit_fini_nom,
                        quantite: bom.quantite_produite,
                        unite: bom.unite,
                        est_dechet: false,
                        pourcentage_repartition: 100,
                      },
                    ];
                  }

                  const finishedList = outputsList.filter((o) => !o.est_dechet);
                  const wasteList = outputsList.filter((o) => o.est_dechet);
                  const yieldPct = bom.rendement_pct ?? 100;

                  return (
                    <tr
                      key={bom.id || bom.code}
                      className="hover:bg-blue-50/40 transition divide-x divide-slate-200 border-b border-slate-200"
                    >
                      <td className="p-3">
                        <div
                          onClick={() => handleOpenEdit(bom)}
                          className="font-mono font-medium text-blue-600 hover:text-blue-800 underline cursor-pointer"
                        >
                          {bom.code}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          v{bom.version || '1.0'}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {bom.nom}
                        </div>
                        <div className="text-[11px] text-indigo-700 dark:text-indigo-400 font-medium flex items-center gap-1 mt-0.5">
                          <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>
                            {bom.quantite_produite} {bom.unite} de {bom.produit_fini_nom}
                          </span>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center gap-2 flex-wrap min-w-[280px]">
                          {/* Intrants badge pills */}
                          <div className="flex items-center gap-1 flex-wrap">
                            {rawInputs.slice(0, 2).map((inp, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900"
                              >
                                {inp.produit_nom} ({inp.quantite} {inp.unite})
                              </span>
                            ))}
                            {rawInputs.length > 2 && (
                              <span className="text-[10px] text-slate-500 font-bold">
                                +{rawInputs.length - 2}
                              </span>
                            )}
                          </div>

                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

                          {/* Extrants badge pills */}
                          <div className="flex items-center gap-1 flex-wrap">
                            {finishedList.slice(0, 1).map((out, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900"
                              >
                                {out.produit_nom} ({out.quantite} {out.unite})
                              </span>
                            ))}
                            {wasteList.length > 0 && (
                              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
                                {wasteList.length} déchet(s)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                            yieldPct >= 90
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : yieldPct >= 75
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                        >
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
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            bom.actif
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {bom.actif ? 'Active' : 'Archivée'}
                        </span>
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleLaunchOF(bom)}
                            title="Lancer un Ordre de Fabrication (OF)"
                            className="p-1.5 rounded-lg text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 cursor-pointer font-bold flex items-center gap-1 text-[11px] px-2"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span className="hidden xl:inline">Lancer OF</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setPreviewBom(bom)}
                            title="Voir les détails"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDuplicate(bom)}
                            title="Dupliquer cette nomenclature"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(bom)}
                            title="Modifier dans la page dédiée"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(bom)}
                            title="Supprimer définitivement"
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

      {/* Read-only Quick Details Modal */}
      {previewBom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  {previewBom.nom}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {previewBom.code} • Version {previewBom.version || '1.0'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewBom(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] text-slate-500">Coût Matières</span>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {formatCurrency(previewBom.cout_matieres_estime)}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] text-slate-500">Coût Revient Unitaire</span>
                  <div className="text-sm font-bold text-emerald-600">
                    {formatCurrency(previewBom.cout_revient_unitaire)}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] text-slate-500">Rendement Global</span>
                  <div className="text-sm font-bold text-blue-600">
                    {previewBom.rendement_pct ?? 100}%
                  </div>
                </div>
              </div>

              {/* Intrants */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Intrants & Matières Premières Consommées
                </h4>
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 font-semibold divide-x divide-slate-200 border-b border-slate-200 text-xs sticky top-0 z-10">
                        <th className="py-2.5 px-3">Matière</th>
                        <th className="py-2.5 px-3">Quantité</th>
                        <th className="py-2.5 px-3 text-right">Coût Unitaire</th>
                        <th className="py-2.5 px-3 text-right">Coût Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(previewBom.inputs || previewBom.composants || []).map((inp, idx) => (
                        <tr key={idx} className="divide-x divide-slate-200 border-b border-slate-200 hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                            {inp.produit_nom}
                          </td>
                          <td className="py-2.5 px-3 text-blue-700 font-bold">
                            {inp.quantite} {inp.unite}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            {formatCurrency(inp.cout_unitaire)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {formatCurrency(inp.cout_total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Extrants */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Extrants (Produits Finis, Coproduits & Déchets)
                </h4>
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 font-semibold divide-x divide-slate-200 border-b border-slate-200 text-xs sticky top-0 z-10">
                        <th className="py-2.5 px-3">Extrant</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Quantité</th>
                        <th className="py-2.5 px-3 text-right">% Imputation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(previewBom.outputs || [
                        {
                          produit_nom: previewBom.produit_fini_nom,
                          quantite: previewBom.quantite_produite,
                          unite: previewBom.unite,
                          est_dechet: false,
                          pourcentage_repartition: 100,
                        },
                      ]).map((out, idx) => (
                        <tr key={idx} className="divide-x divide-slate-200 border-b border-slate-200 hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                            {out.produit_nom}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                out.est_dechet
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {out.est_dechet ? 'Déchet / Rebut' : 'Produit Fini'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-200">
                            {out.quantite} {out.unite}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            {out.pourcentage_repartition ?? (out.est_dechet ? 0 : 100)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {previewBom.notes && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-300">
                  <strong className="block text-slate-800 dark:text-white mb-1">Notes opératoires :</strong>
                  {previewBom.notes.replace(/<!--BOM_OUTPUTS:.*?-->/g, '')}
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-between bg-slate-50 dark:bg-slate-800/80">
              <button
                type="button"
                onClick={() => {
                  setPreviewBom(null);
                  handleOpenEdit(previewBom);
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Modifier dans la page</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewBom(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg transition"
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
