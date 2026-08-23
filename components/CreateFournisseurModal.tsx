'use client';

import React, { useState } from 'react';
import { Fournisseur } from '@/lib/types';
import { Building2, X, Save } from 'lucide-react';

interface CreateFournisseurModalProps {
  isOpen: boolean;
  onClose: () => void;
  fournisseurToEdit?: Fournisseur | null;
  onSave: (fData: Partial<Fournisseur>) => Promise<void>;
}

export const CreateFournisseurModal: React.FC<CreateFournisseurModalProps> = ({
  isOpen,
  onClose,
  fournisseurToEdit,
  onSave,
}) => {
  const [form, setForm] = useState<Partial<Fournisseur>>({
    code: fournisseurToEdit?.code || '',
    nom: fournisseurToEdit?.nom || '',
    interlocuteur: fournisseurToEdit?.interlocuteur || '',
    ice: fournisseurToEdit?.ice || '',
    adresse: fournisseurToEdit?.adresse || '',
    code_postal: fournisseurToEdit?.code_postal || '',
    ville: fournisseurToEdit?.ville || 'Casablanca',
    telephone: fournisseurToEdit?.telephone || '',
    mobile: fournisseurToEdit?.mobile || '',
    email: fournisseurToEdit?.email || '',
    notes: fournisseurToEdit?.notes || '',
  });

  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom?.trim()) {
      alert('Veuillez renseigner la raison sociale du fournisseur.');
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
        <div className="bg-slate-800 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            <h3 className="text-base font-bold">
              {fournisseurToEdit ? `Modifier : ${fournisseurToEdit.nom}` : "Nouveau Fournisseur"}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Raison Sociale Fournisseur *</label>
              <input
                type="text"
                required
                placeholder="Ex: MAGHREB IRRIGATION EQUIPEMENTS SA"
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-300 font-semibold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Contact / Interlocuteur</label>
              <input
                type="text"
                placeholder="Ex: M. Rachid"
                value={form.interlocuteur}
                onChange={(e) => setForm({ ...form, interlocuteur: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-300"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1 font-mono">Numéro ICE</label>
              <input
                type="text"
                value={form.ice}
                onChange={(e) => setForm({ ...form, ice: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-300 font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Adresse</label>
              <input
                type="text"
                value={form.adresse}
                onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-300"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Ville</label>
              <input
                type="text"
                value={form.ville}
                onChange={(e) => setForm({ ...form, ville: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-300"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Téléphone</label>
              <input
                type="text"
                value={form.telephone}
                onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-300"
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
              {isSaving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
