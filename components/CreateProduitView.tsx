'use client';

import React, { useState } from 'react';
import { Categorie, Famille, Produit } from '@/lib/types';
import {
  ArrowLeft,
  Package,
  Save,
  Tag,
  DollarSign,
  Boxes,
  FileText,
} from 'lucide-react';

interface CreateProduitViewProps {
  produitToEdit?: Produit | null;
  categories: Categorie[];
  familles: Famille[];
  onBack: () => void;
  onSave: (prodData: Partial<Produit>) => Promise<void>;
}

export const CreateProduitView: React.FC<CreateProduitViewProps> = ({
  produitToEdit,
  categories,
  familles,
  onBack,
  onSave,
}) => {
  const [form, setForm] = useState<Partial<Produit>>({
    code: produitToEdit?.code || '',
    libelle: produitToEdit?.libelle || '',
    groupe: produitToEdit?.groupe || 'CEREALES',
    famille: produitToEdit?.famille || '',
    unite: produitToEdit?.unite || 'KG',
    taux_tva: produitToEdit?.taux_tva || 20,
    prix_ht: produitToEdit?.prix_ht || 0,
    prix_achat_ht: produitToEdit?.prix_achat_ht || 0,
    stock_actuel: produitToEdit?.stock_actuel || 0,
    stock_min: produitToEdit?.stock_min || 10,
    description: produitToEdit?.description || '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const selectedCategory = categories.find((category) =>
    [category.libelle, category.nom, category.code].filter(Boolean).includes(form.groupe)
  );
  const availableFamilies = familles.filter((family) =>
    !selectedCategory?.id || !family.categorie_id || family.categorie_id === selectedCategory.id
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.libelle?.trim()) {
      alert('Veuillez renseigner la désignation de l\'article.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(form);
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
            id="back-to-stock-btn"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour au Stock</span>
          </button>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-600" />
              {produitToEdit ? `Modifier Article : ${produitToEdit.libelle}` : 'Nouvel Article / Référence'}
            </h2>
            <p className="text-xs text-slate-500">
              Fiche article, tarification HT, taux de TVA et gestion du seuil d'alerte de stock
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
            {isSaving ? 'Enregistrement...' : 'Enregistrer l’Article'}
          </button>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Section 1: Identification */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Tag className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Identification & Catégorisation
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Code Article / SKU</label>
              <input
                type="text"
                placeholder="Ex: ART-001"
                value={form.code || ''}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="w-full px-3.5 py-2 text-xs font-mono font-bold bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Désignation de l'Article *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Tuyau Goutte à Goutte 16mm 4L/H"
                value={form.libelle || ''}
                onChange={(e) => setForm({ ...form, libelle: e.target.value })}
                className="w-full px-3.5 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Groupe / Catégorie</label>
              <select
                value={form.groupe || ''}
                onChange={(e) => setForm({ ...form, groupe: e.target.value, famille: '' })}
                className="w-full px-3.5 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Choisir une catégorie</option>
                {categories.map((category) => {
                  const label = category.libelle || category.nom || category.code || `Catégorie ${category.id}`;
                  return <option key={category.id} value={label}>{label}</option>;
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Famille</label>
              <select
                value={form.famille || ''}
                onChange={(e) => setForm({ ...form, famille: e.target.value })}
                disabled={availableFamilies.length === 0}
                className="w-full px-3.5 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">{availableFamilies.length ? 'Choisir une famille' : 'Aucune famille disponible'}</option>
                {availableFamilies.map((family) => {
                  const label = family.libelle || family.nom || family.code || `Famille ${family.id}`;
                  return <option key={family.id} value={label}>{label}</option>;
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Unité de Mesure</label>
              <select
                value={form.unite || 'U'}
                onChange={(e) => setForm({ ...form, unite: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="U">Unité (U)</option>
                <option value="KG">Kilogramme (KG)</option>
                <option value="M">Mètre linéaire (M)</option>
                <option value="ROULEAU">Rouleau</option>
                <option value="SAC">Sac</option>
                <option value="L">Litre (L)</option>
                <option value="TONNE">Tonne</option>
                <option value="FORFAIT">Forfait</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Tarification & TVA */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Tarification de Vente, Achat & Fiscalité
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Prix de Vente Unitaire HT (DH) *
              </label>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={form.prix_ht ?? 0}
                onChange={(e) => setForm({ ...form, prix_ht: parseFloat(e.target.value) || 0 })}
                className="w-full px-3.5 py-2 text-xs font-mono font-bold bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-emerald-800"
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
                value={form.prix_achat_ht ?? 0}
                onChange={(e) => setForm({ ...form, prix_achat_ht: parseFloat(e.target.value) || 0 })}
                className="w-full px-3.5 py-2 text-xs font-mono bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Taux TVA Applicable</label>
              <select
                value={form.taux_tva ?? 20}
                onChange={(e) => setForm({ ...form, taux_tva: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs font-mono bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="20">20% (Taux normal)</option>
                <option value="10">10% (Taux intermédiaire)</option>
                <option value="0">0% (Exonéré / Export)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Stock Initial & Alertes */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Boxes className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Niveaux de Stock & Seuil d'Alerte
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Stock Actuel ({form.unite || 'U'})
              </label>
              <input
                type="number"
                step="any"
                value={form.stock_actuel ?? 0}
                onChange={(e) => setForm({ ...form, stock_actuel: parseFloat(e.target.value) || 0 })}
                className="w-full px-3.5 py-2 text-xs font-mono font-bold bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Seuil de Stock Minimum (Alerte Réapprovisionnement)
              </label>
              <input
                type="number"
                step="any"
                value={form.stock_min ?? 10}
                onChange={(e) => setForm({ ...form, stock_min: parseFloat(e.target.value) || 0 })}
                className="w-full px-3.5 py-2 text-xs font-mono bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            ← Annuler et revenir au stock
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Enregistrement...' : 'Enregistrer l’Article'}
          </button>
        </div>
      </form>
    </div>
  );
};
