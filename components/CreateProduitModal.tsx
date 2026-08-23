'use client';

import React, { useState } from 'react';
import { Produit } from '@/lib/types';
import { Package, X, Save } from 'lucide-react';

interface CreateProduitModalProps {
  isOpen: boolean;
  onClose: () => void;
  produitToEdit?: Produit | null;
  onSave: (prodData: Partial<Produit>) => Promise<void>;
}

export const CreateProduitModal: React.FC<CreateProduitModalProps> = ({
  isOpen,
  onClose,
  produitToEdit,
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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.libelle?.trim()) {
      alert('Veuillez renseigner la désignation de l\'article.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err: any) {
      alert('Erreur: ' + (err?.message || 'Erreur'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        <div className="bg-blue-700 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            <h3 className="text-base font-bold">
              {produitToEdit ? `Modifier : ${produitToEdit.libelle}` : "Ajout d'un Produit / Article"}
            </h3>
          </div>
          <button onClick={onClose} className="text-blue-200 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1 font-mono">Code Référence</label>
              <input
                type="text"
                placeholder="Ex: T-GOUT-16"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-300 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Groupe / Catégorie</label>
              <select
                value={form.groupe}
                onChange={(e) => setForm({ ...form, groupe: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-300"
              >
                <option value="CEREALES">CEREALES</option>
                <option value="PATES">PATES</option>
                <option value="CHARCUTERIE">CHARCUTERIE</option>
                <option value="FROMAGES">FROMAGES</option>
                <option value="CHAMPIGNONS">CHAMPIGNONS</option>
                <option value="IRRIGATION">IRRIGATION & TUYAUX</option>
                <option value="ACCESSOIRES">ACCESSOIRES</option>
                <option value="ENGRAIS">ENGRAIS & SEMENCES</option>
                <option value="DIVERS">DIVERS</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Désignation / Libellé *</label>
              <input
                type="text"
                required
                placeholder="Ex: Tuyau Goutte-à-Goutte 16mm 4L/H"
                value={form.libelle}
                onChange={(e) => setForm({ ...form, libelle: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-300 font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Famille</label>
              <input
                type="text"
                placeholder="Ex: RACCORDEMENT"
                value={form.famille}
                onChange={(e) => setForm({ ...form, famille: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-300"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Unité de Mesure (U M)</label>
              <select
                value={form.unite}
                onChange={(e) => setForm({ ...form, unite: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-300"
              >
                <option value="KG">KG (Kilogramme)</option>
                <option value="U">U (Unité / Pièce)</option>
                <option value="UN">UN (Unité)</option>
                <option value="L">L (Litre)</option>
                <option value="M">M (Mètre linéaire)</option>
                <option value="ROULEAU">ROULEAU</option>
                <option value="SAC">SAC</option>
                <option value="CARTON">CARTON</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1 font-mono">Prix Unitaire Vente HT (DH)</label>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={form.prix_ht}
                onChange={(e) => setForm({ ...form, prix_ht: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-300 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Taux de TVA (%)</label>
              <select
                value={form.taux_tva}
                onChange={(e) => setForm({ ...form, taux_tva: Number(e.target.value) })}
                className="w-full px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-300 font-medium"
              >
                <option value="20">20% (Taux normal)</option>
                <option value="10">10% (Taux réduit)</option>
                <option value="0">0% (Exonéré)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Stock Actuel</label>
              <input
                type="number"
                step="any"
                value={form.stock_actuel}
                onChange={(e) => setForm({ ...form, stock_actuel: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-300 font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1 text-rose-700">Seuil Alerte Stock Min</label>
              <input
                type="number"
                step="any"
                value={form.stock_min}
                onChange={(e) => setForm({ ...form, stock_min: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-300 font-semibold"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-md"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? 'Enregistrement...' : 'Enregistrer le Produit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
