'use client';

import React, { useState } from 'react';
import { Produit } from '@/lib/types';
import {
  ArrowLeft,
  Boxes,
  Save,
  TrendingUp,
  TrendingDown,
  RefreshCw,
} from 'lucide-react';

interface AdjustStockViewProps {
  produits: Produit[];
  preSelectedProduitId?: number;
  onBack: () => void;
  onSave: (data: {
    produit_id: number;
    type_mouvement: 'ENTREE' | 'SORTIE' | 'INVENTAIRE';
    quantite: number;
    prix_unitaire_ht: number;
    reference_document?: string;
    motif: string;
  }) => Promise<void>;
}

export const AdjustStockView: React.FC<AdjustStockViewProps> = ({
  produits,
  preSelectedProduitId,
  onBack,
  onSave,
}) => {
  const [produitId, setProduitId] = useState<number>(
    preSelectedProduitId || produits[0]?.id || 0
  );
  const [typeMouvement, setTypeMouvement] = useState<'ENTREE' | 'SORTIE' | 'INVENTAIRE'>('ENTREE');
  const [quantite, setQuantite] = useState<number>(1);
  const initialProd = produits.find((p) => p.id === (preSelectedProduitId || produits[0]?.id || 0)) || produits[0];
  const [prixUnitaire, setPrixUnitaire] = useState<number>(
    initialProd?.prix_achat_ht || initialProd?.prix_ht || 0
  );
  const [refDoc, setRefDoc] = useState<string>('');
  const [motif, setMotif] = useState<string>('Réception de Marchandise Fournisseur');
  const [isSaving, setIsSaving] = useState(false);

  const selectedProd = produits.find((p) => p.id === produitId) || produits[0];

  const handleProduitChange = (newId: number) => {
    setProduitId(newId);
    const prod = produits.find((p) => p.id === newId);
    if (prod) {
      setPrixUnitaire(prod.prix_achat_ht || prod.prix_ht || 0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProd) {
      alert('Veuillez sélectionner un article.');
      return;
    }
    if (quantite <= 0) {
      alert('La quantité doit être supérieure à zéro.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        produit_id: selectedProd.id,
        type_mouvement: typeMouvement,
        quantite: Number(quantite),
        prix_unitaire_ht: Number(prixUnitaire),
        reference_document: refDoc,
        motif: motif || (typeMouvement === 'ENTREE' ? 'Réception Fournisseur' : 'Ajustement'),
      });
      onBack();
    } catch (err: any) {
      alert('Erreur: ' + (err?.message || 'Erreur inconnue'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour au Stock</span>
          </button>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Boxes className="w-5 h-5 text-emerald-600" />
              Mouvement de Stock & Ajustement Inventaire
            </h2>
            <p className="text-xs text-slate-500">
              Entrée d'achat fournisseur, sortie exceptionnelle ou régularisation d'inventaire
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg transition"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Enregistrement...' : 'Valider le Mouvement'}
          </button>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Article concerné *</label>
              <select
                value={produitId}
                onChange={(e) => setProduitId(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                {produits.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} - {p.libelle} (Stock Actuel : {p.stock_actuel} {p.unite || 'U'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Type d'Opération *</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTypeMouvement('ENTREE');
                    setMotif('Réception Achat Fournisseur');
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition ${
                    typeMouvement === 'ENTREE'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Entrée (+)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTypeMouvement('SORTIE');
                    setMotif('Sortie Chantier / Rebut');
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition ${
                    typeMouvement === 'SORTIE'
                      ? 'bg-amber-50 border-amber-500 text-amber-800'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <TrendingDown className="w-3.5 h-3.5 text-amber-600" />
                  <span>Sortie (-)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTypeMouvement('INVENTAIRE');
                    setMotif('Ajustement après Inventaire Physique');
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition ${
                    typeMouvement === 'INVENTAIRE'
                      ? 'bg-blue-50 border-blue-500 text-blue-800'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                  <span>Inventaire</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Quantité ({selectedProd?.unite || 'U'}) *
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                value={quantite}
                onChange={(e) => setQuantite(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2 text-xs font-mono font-bold text-slate-900 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Prix d'Achat Unitaire HT (DH)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={prixUnitaire}
                onChange={(e) => setPrixUnitaire(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2 text-xs font-mono bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                N° Bon de Livraison Fournisseur / Réf Document
              </label>
              <input
                type="text"
                placeholder="Ex: BL-FRS-2026/410"
                value={refDoc}
                onChange={(e) => setRefDoc(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Motif / Justification du Mouvement
              </label>
              <input
                type="text"
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            ← Annuler et revenir
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Enregistrement...' : 'Enregistrer le Mouvement'}
          </button>
        </div>
      </form>
    </div>
  );
};
