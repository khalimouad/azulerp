'use client';

import React, { useState } from 'react';
import { Produit } from '@/lib/types';
import { Package, X, Save, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface AdjustStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  produit: Produit | null;
  onSave: (data: {
    produit_id: number;
    quantite: number;
    type: 'ENTREE' | 'AJUSTEMENT';
    motif: string;
    reference_doc?: string;
  }) => Promise<void>;
}

export const AdjustStockModal: React.FC<AdjustStockModalProps> = ({
  isOpen,
  onClose,
  produit,
  onSave,
}) => {
  const [type, setType] = useState<'ENTREE' | 'AJUSTEMENT'>('ENTREE');
  const [quantite, setQuantite] = useState<number>(10);
  const [motif, setMotif] = useState<string>('Réception Bon de Commande Fournisseur');
  const [refDoc, setRefDoc] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen || !produit) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantite === 0) {
      alert('La quantité ne peut pas être égale à 0.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        produit_id: produit.id,
        quantite: type === 'ENTREE' ? Math.abs(quantite) : quantite,
        type,
        motif,
        reference_doc: refDoc,
      });
      onClose();
    } catch (err: any) {
      alert('Erreur: ' + (err?.message || 'Erreur inconnue'));
    } finally {
      setIsSaving(false);
    }
  };

  const newStockPreview =
    type === 'ENTREE'
      ? produit.stock_actuel + Math.abs(quantite)
      : quantite; // if absolute set

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        <div className="bg-blue-700 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            <h3 className="text-base font-bold">Mouvement de Stock / Entrée</h3>
          </div>
          <button onClick={onClose} className="text-blue-200 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="font-mono text-slate-500 text-[10px]">ARTICLE :</div>
            <div className="font-bold text-sm text-slate-900">{produit.libelle}</div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200">
              <span className="text-slate-600">Stock actuel en magasin :</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {produit.stock_actuel} {produit.unite}
              </span>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Type d'opération</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setType('ENTREE');
                  setMotif('Réception Marchandise / Achat');
                }}
                className={`py-2 px-3 rounded-lg border font-semibold flex items-center justify-center gap-1.5 transition ${
                  type === 'ENTREE'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4" /> Entrée (+)
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('AJUSTEMENT');
                  setMotif('Inventaire physique / Régularisation');
                }}
                className={`py-2 px-3 rounded-lg border font-semibold flex items-center justify-center gap-1.5 transition ${
                  type === 'AJUSTEMENT'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Package className="w-4 h-4" /> Régularisation
              </button>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1 font-mono">
              {type === 'ENTREE' ? 'Quantité à Ajouter (+)' : 'Nouveau Stock Réel Total'} *
            </label>
            <input
              type="number"
              step="any"
              required
              value={quantite}
              onChange={(e) => setQuantite(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-300 font-mono font-bold text-sm"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Réf Document / BL Fournisseur</label>
            <input
              type="text"
              placeholder="Ex: BL-FOUR-8219"
              value={refDoc}
              onChange={(e) => setRefDoc(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-300 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Motif / Justification</label>
            <input
              type="text"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-300"
            />
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
              {isSaving ? 'Enregistrement...' : 'Valider le Mouvement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
