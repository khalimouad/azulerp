'use client';

import React, { useState, useMemo } from 'react';
import { ProductionOrder, BOM, Produit } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { checkStockForBOM, createProductionOrderFromBOM } from '@/lib/manufacturing-service';
import {
  ArrowLeft,
  Save,
  Factory,
  Layers,
  Calendar,
  User,
  Boxes,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Check,
  TrendingUp,
  Percent,
  Play,
  FileText
} from 'lucide-react';

interface CreateProductionOrderViewProps {
  boms: BOM[];
  produits: Produit[];
  orderToEdit?: ProductionOrder | null;
  preSelectedBomId?: number;
  onBack: () => void;
  onSave: (order: ProductionOrder) => Promise<void>;
}

export const CreateProductionOrderView: React.FC<CreateProductionOrderViewProps> = ({
  boms = [],
  produits = [],
  orderToEdit,
  preSelectedBomId,
  onBack,
  onSave,
}) => {
  const [selectedBomId, setSelectedBomId] = useState<number>(
    orderToEdit?.bom_id || preSelectedBomId || boms[0]?.id || 1
  );

  const [quantiteTarget, setQuantiteTarget] = useState<number>(
    orderToEdit?.quantite_prevue || 100
  );

  const [dateLancement, setDateLancement] = useState<string>(
    orderToEdit?.date_lancement || new Date().toISOString().split('T')[0]
  );

  const [dateFinPrevue, setDateFinPrevue] = useState<string>(
    orderToEdit?.date_prevue_fin ||
      new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0]
  );

  const [responsable, setResponsable] = useState<string>(
    orderToEdit?.responsable || 'Chef d’Atelier'
  );

  const [atelier, setAtelier] = useState<string>(
    orderToEdit?.atelier || 'Atelier Principal de Transformation'
  );

  const [notes, setNotes] = useState<string>(orderToEdit?.notes || '');
  const [isSaving, setIsSaving] = useState(false);

  // Selected BOM
  const currentBom = useMemo(() => {
    return boms.find((b) => b.id === selectedBomId) || boms[0];
  }, [boms, selectedBomId]);

  // Stocks Map for quick stock check
  const stocksMap = useMemo(() => {
    const map: Record<string, number> = {};
    produits.forEach((p) => {
      map[p.libelle] = Number(p.stock_actuel) || 0;
      map[p.code] = Number(p.stock_actuel) || 0;
    });
    return map;
  }, [produits]);

  // Real-time stock check
  const stockCheck = useMemo(() => {
    if (!currentBom) return null;
    return checkStockForBOM(currentBom, quantiteTarget, stocksMap);
  }, [currentBom, quantiteTarget, stocksMap]);

  // Cost calculations
  const bomRatio = useMemo(() => {
    const baseQty = Number(currentBom?.quantite_produite) || 1;
    return quantiteTarget / baseQty;
  }, [currentBom, quantiteTarget]);

  const estimatedMatCost = useMemo(() => {
    return (Number(currentBom?.cout_matieres_estime) || 0) * bomRatio;
  }, [currentBom, bomRatio]);

  const estimatedMOCost = useMemo(() => {
    return (Number(currentBom?.cout_main_oeuvre_estime) || 0) * bomRatio;
  }, [currentBom, bomRatio]);

  const estimatedFraisCost = useMemo(() => {
    return (Number(currentBom?.frais_generaux_estime) || 0) * bomRatio;
  }, [currentBom, bomRatio]);

  const totalEstimatedCost = useMemo(() => {
    return estimatedMatCost + estimatedMOCost + estimatedFraisCost;
  }, [estimatedMatCost, estimatedMOCost, estimatedFraisCost]);

  const estimatedUnitCost = useMemo(() => {
    return quantiteTarget > 0 ? totalEstimatedCost / quantiteTarget : 0;
  }, [totalEstimatedCost, quantiteTarget]);

  const handleLaunch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!currentBom) {
      alert('Veuillez sélectionner une nomenclature (BOM).');
      return;
    }

    if (quantiteTarget <= 0) {
      alert('Veuillez saisir une quantité à produire supérieure à 0.');
      return;
    }

    setIsSaving(true);
    try {
      let orderPayload: ProductionOrder;

      if (orderToEdit) {
        orderPayload = {
          ...orderToEdit,
          bom_id: currentBom.id,
          bom_nom: currentBom.nom,
          produit_fini_nom: currentBom.produit_fini_nom,
          quantite_prevue: quantiteTarget,
          quantite_reelle: quantiteTarget,
          unite: currentBom.unite,
          date_lancement: dateLancement,
          date_prevue_fin: dateFinPrevue,
          responsable,
          atelier,
          cout_matieres: estimatedMatCost,
          cout_main_oeuvre: estimatedMOCost,
          cout_machines_ateliers: estimatedFraisCost,
          cout_total_production: totalEstimatedCost,
          cout_revient_unitaire: estimatedUnitCost,
          notes,
        };
      } else {
        const generated = createProductionOrderFromBOM(currentBom, quantiteTarget, {
          responsable,
          atelier,
        });
        orderPayload = {
          ...generated,
          date_lancement: dateLancement,
          date_prevue_fin: dateFinPrevue,
          notes,
        };
      }

      await onSave(orderPayload);
      onBack();
    } catch (err: any) {
      alert('Erreur: ' + (err?.message || 'Erreur inconnue'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-16 max-w-7xl mx-auto">
      {/* Top Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-20 backdrop-blur-md bg-white/95">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour aux Ordres de Fabrication</span>
          </button>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Factory className="w-5 h-5 text-indigo-600" />
              {orderToEdit
                ? `Modifier l'Ordre de Fabrication : ${orderToEdit.numero}`
                : 'Lancer un Nouvel Ordre de Fabrication (OF)'}
            </h2>
            <p className="text-xs text-slate-500">
              Affectation atelier, réservation des matières premières et suivi de production
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg transition active:scale-95"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => handleLaunch()}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Play className="w-4 h-4" />
            {isSaving ? 'Lancement en cours...' : 'Lancer l’Ordre de Fabrication'}
          </button>
        </div>
      </div>

      {/* Main Form Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: OF Parameters */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-800">
                1. Sélection de la Nomenclature & Quantité Cible
              </h3>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomenclature de référence (BOM) *
                </label>
                <select
                  value={selectedBomId}
                  onChange={(e) => setSelectedBomId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  {boms.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} - {b.nom} ({b.quantite_produite} {b.unite} de {b.produit_fini_nom})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Quantité cible à produire *
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="any"
                      min="1"
                      value={quantiteTarget}
                      onChange={(e) => setQuantiteTarget(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-sm font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-indigo-950"
                    />
                    <span className="px-3 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-lg border border-slate-200 shrink-0">
                      {currentBom?.unite || 'Kg'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Produit fini résultant
                  </label>
                  <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800">
                    {currentBom?.produit_fini_nom || 'Non défini'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Planning & Atelier */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-800">
                2. Planification & Affectation d'Atelier
              </h3>
            </div>

            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Date de lancement en atelier
                </label>
                <input
                  type="date"
                  value={dateLancement}
                  onChange={(e) => setDateLancement(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Date prévisionnelle d'achèvement
                </label>
                <input
                  type="date"
                  value={dateFinPrevue}
                  onChange={(e) => setDateFinPrevue(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Atelier / Centre de charge
                </label>
                <input
                  type="text"
                  value={atelier}
                  onChange={(e) => setAtelier(e.target.value)}
                  placeholder="Atelier Principal, Ligne de Conditionnement..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Responsable / Superviseur
                </label>
                <input
                  type="text"
                  value={responsable}
                  onChange={(e) => setResponsable(e.target.value)}
                  placeholder="Chef d'atelier..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes de fabrication ou consignes qualité
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contrôle de viscosité, échantillonnage laboratoire, consignes spécifiques..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Matières requises & Disponibilité Stock */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Boxes className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-800">
                  3. Matières Premières Nécessaires & Vérification Stock
                </h3>
              </div>
              {stockCheck && (
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${
                    stockCheck.disponible
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {stockCheck.disponible ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Stock Suffisant
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Rupture / Stock Insuffisant
                    </>
                  )}
                </span>
              )}
            </div>

            <div className="p-5 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                    <th className="pb-3">Composant / Matière</th>
                    <th className="pb-3">Quantité Requise</th>
                    <th className="pb-3">Stock Actuel</th>
                    <th className="pb-3">Disponibilité</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stockCheck?.alertes.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      <td className="py-2.5 font-semibold text-slate-900">
                        {item.produit_nom}
                      </td>
                      <td className="py-2.5 text-blue-700 font-bold">
                        {item.quantite_requise.toFixed(2)}
                      </td>
                      <td className="py-2.5 font-medium text-slate-700">
                        {item.stock_actuel.toFixed(2)}
                      </td>
                      <td className="py-2.5">
                        {item.statut === 'suffisant' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <Check className="w-3 h-3" />
                            OK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                            <AlertTriangle className="w-3 h-3" />
                            Manque {item.manquant.toFixed(2)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Cost Forecast & Summary */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-800">
                Coûts Estimés de la Production
              </h3>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Matières Premières :</span>
                  <strong className="text-slate-900 font-mono">
                    {formatCurrency(estimatedMatCost)}
                  </strong>
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Main d'œuvre directe :</span>
                  <strong className="text-slate-900 font-mono">
                    {formatCurrency(estimatedMOCost)}
                  </strong>
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Frais machine & atelier :</span>
                  <strong className="text-slate-900 font-mono">
                    {formatCurrency(estimatedFraisCost)}
                  </strong>
                </div>

                <div className="pt-3 border-t border-slate-200 flex justify-between text-sm font-bold text-slate-900">
                  <span>Total Coût de Fabrication :</span>
                  <span className="text-indigo-700 font-mono">
                    {formatCurrency(totalEstimatedCost)}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-indigo-50/70 rounded-xl border border-indigo-100 text-center">
                <div className="text-xs text-indigo-700 font-semibold mb-1">
                  Coût de revient unitaire prévu
                </div>
                <div className="text-2xl font-black text-indigo-700 font-mono">
                  {formatCurrency(estimatedUnitCost)}
                </div>
                <div className="text-[11px] text-indigo-600 mt-1">
                  Par {currentBom?.unite || 'unité'} produite
                </div>
              </div>

              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 mb-1">
                  <span>Rendement Théorique BOM</span>
                  <span className="font-bold">{currentBom?.rendement_pct || 100}%</span>
                </div>
                <div className="w-full bg-emerald-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full"
                    style={{ width: `${currentBom?.rendement_pct || 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Floating/Sticky Action Bar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-md">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Annuler et retourner</span>
        </button>

        <button
          type="button"
          onClick={() => handleLaunch()}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <Play className="w-4 h-4" />
          {isSaving ? 'Lancement en cours...' : 'Lancer l’Ordre de Fabrication (OF)'}
        </button>
      </div>
    </div>
  );
};
