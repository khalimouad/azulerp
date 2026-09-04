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
  FileSpreadsheet
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
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white rounded-xl shadow-md">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Nomenclatures & Formules de Fabrication (BOM)
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 font-semibold">
                {boms.length} formules
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Gestion industrielle multi-matières (intrants), multi-produits finis (extrants), valorisation des coproduits et analyse du rendement
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition active:scale-95 cursor-pointer"
              title="Rafraîchir les données"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvelle Nomenclature</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Nomenclatures Actives</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {stats.activeCount} <span className="text-xs text-slate-400 font-normal">/ {stats.totalCount}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Prêtes pour lancement en production</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Rendement Matière Moyen</span>
            <Percent className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {stats.avgYield}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Efficacité de conversion industrielle</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Coût Revient Moyen</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(stats.avgCost)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Matières + main d'œuvre + atelier</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Ordres de Fabrication</span>
            <Factory className="w-4 h-4 text-purple-600" />
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab && onNavigateTab('manufacturing-orders')}
            className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 mt-1 cursor-pointer"
          >
            <span>Voir le suivi des OF</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <div className="text-[11px] text-slate-400 mt-1">Gérer les ordres et consommations</div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par code, nom, produit fini..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-md transition ${
                statusFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Toutes ({boms.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1 rounded-md transition ${
                statusFilter === 'ACTIVE'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Actives ({boms.filter((b) => b.actif).length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('INACTIVE')}
              className={`px-3 py-1 rounded-md transition ${
                statusFilter === 'INACTIVE'
                  ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-400 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Inactives ({boms.filter((b) => !b.actif).length})
            </button>
          </div>
        </div>
      </div>

      {/* BOMs Table View */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                <th className="p-3.5">Code & Version</th>
                <th className="p-3.5">Nomenclature & Produit Principal</th>
                <th className="p-3.5">Intrants (Matières) ➔ Extrants</th>
                <th className="p-3.5 text-center">Rendement</th>
                <th className="p-3.5 text-right">Coût Matières</th>
                <th className="p-3.5 text-right">Coût Revient Unitaire</th>
                <th className="p-3.5 text-center">Statut</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
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
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="p-3.5">
                        <div className="font-mono font-bold text-slate-900 dark:text-white">
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
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-semibold">
                      <tr>
                        <th className="p-2.5">Matière</th>
                        <th className="p-2.5">Quantité</th>
                        <th className="p-2.5 text-right">Coût Unitaire</th>
                        <th className="p-2.5 text-right">Coût Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(previewBom.inputs || previewBom.composants || []).map((inp, idx) => (
                        <tr key={idx}>
                          <td className="p-2.5 font-semibold text-slate-900 dark:text-white">
                            {inp.produit_nom}
                          </td>
                          <td className="p-2.5 text-blue-700 font-bold">
                            {inp.quantite} {inp.unite}
                          </td>
                          <td className="p-2.5 text-right font-mono">
                            {formatCurrency(inp.cout_unitaire)}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">
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
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-semibold">
                      <tr>
                        <th className="p-2.5">Extrant</th>
                        <th className="p-2.5">Type</th>
                        <th className="p-2.5">Quantité</th>
                        <th className="p-2.5 text-right">% Imputation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(previewBom.outputs || [
                        {
                          produit_nom: previewBom.produit_fini_nom,
                          quantite: previewBom.quantite_produite,
                          unite: previewBom.unite,
                          est_dechet: false,
                          pourcentage_repartition: 100,
                        },
                      ]).map((out, idx) => (
                        <tr key={idx}>
                          <td className="p-2.5 font-bold text-slate-900 dark:text-white">
                            {out.produit_nom}
                          </td>
                          <td className="p-2.5">
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
                          <td className="p-2.5 font-bold text-slate-800 dark:text-slate-200">
                            {out.quantite} {out.unite}
                          </td>
                          <td className="p-2.5 text-right font-mono">
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
