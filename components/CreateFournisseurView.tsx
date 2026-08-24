'use client';

import React, { useState } from 'react';
import { Fournisseur } from '@/lib/types';
import {
  ArrowLeft,
  Building2,
  Save,
  MapPin,
  FileCheck,
} from 'lucide-react';

interface CreateFournisseurViewProps {
  fournisseurToEdit?: Fournisseur | null;
  onBack: () => void;
  onSave: (fData: Partial<Fournisseur>) => Promise<void>;
}

export const CreateFournisseurView: React.FC<CreateFournisseurViewProps> = ({
  fournisseurToEdit,
  onBack,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom?.trim()) {
      alert('Veuillez renseigner la raison sociale du fournisseur.');
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
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour aux Fournisseurs</span>
          </button>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              {fournisseurToEdit ? `Modifier Fournisseur : ${fournisseurToEdit.nom}` : 'Nouveau Fournisseur'}
            </h2>
            <p className="text-xs text-slate-500">
              Fiche partenaire fournisseur, coordonnées d'achat et identification ICE
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
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Enregistrement...' : 'Enregistrer le Fournisseur'}
          </button>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Code Fournisseur</label>
              <input
                type="text"
                placeholder="Ex: FRS001"
                value={form.code || ''}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="w-full px-3.5 py-2 text-xs font-mono font-bold bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Raison Sociale / Nom *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: MAGHREB IRRIGATION & TUYAUX SA"
                value={form.nom || ''}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                className="w-full px-3.5 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">ICE (15 Chiffres)</label>
              <input
                type="text"
                placeholder="001839210000045"
                value={form.ice || ''}
                onChange={(e) => setForm({ ...form, ice: e.target.value })}
                className="w-full px-3.5 py-2 text-xs font-mono bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-indigo-900"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Contact Commercial</label>
              <input
                type="text"
                placeholder="Ex: M. Karim Directeur des Ventes"
                value={form.interlocuteur || ''}
                onChange={(e) => setForm({ ...form, interlocuteur: e.target.value })}
                className="w-full px-3.5 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Adresse</label>
              <input
                type="text"
                placeholder="Ex: Zone Industrielle Ain Sebaa, Casablanca"
                value={form.adresse || ''}
                onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                className="w-full px-3.5 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Ville</label>
              <input
                type="text"
                list="verdeorto-cities"
                placeholder="Casablanca"
                value={form.ville || ''}
                onChange={(e) => setForm({ ...form, ville: e.target.value })}
                className="w-full px-3.5 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Téléphone</label>
              <input
                type="text"
                placeholder="+212 5 22 ..."
                value={form.telephone || ''}
                onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                className="w-full px-3.5 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                placeholder="commandes@fournisseur.ma"
                value={form.email || ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3.5 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Notes & Remarques</label>
            <input
              type="text"
              placeholder="Ex: Délai moyen de livraison 3 jours"
              value={form.notes || ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3.5 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
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
            className="flex items-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Enregistrement...' : 'Enregistrer le Fournisseur'}
          </button>
        </div>
      </form>
    </div>
  );
};
