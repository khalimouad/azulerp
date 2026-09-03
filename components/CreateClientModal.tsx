'use client';

import React, { useState } from 'react';
import { Client } from '@/lib/types';
import { Users, X, Save } from 'lucide-react';

interface CreateClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientToEdit?: Client | null;
  onSave: (clientData: Partial<Client>) => Promise<void>;
}

export const CreateClientModal: React.FC<CreateClientModalProps> = ({
  isOpen,
  onClose,
  clientToEdit,
  onSave,
}) => {
  const [form, setForm] = useState<Partial<Client>>({
    code: clientToEdit?.code || '',
    nom: clientToEdit?.nom || '',
    interlocuteur: clientToEdit?.interlocuteur || '',
    ice: clientToEdit?.ice || '',
    adresse: clientToEdit?.adresse || '',
    code_postal: clientToEdit?.code_postal || '',
    ville: clientToEdit?.ville || 'Marrakech',
    pays: clientToEdit?.pays || 'Maroc',
    telephone: clientToEdit?.telephone || '',
    mobile: clientToEdit?.mobile || '',
    fax: clientToEdit?.fax || '',
    email: clientToEdit?.email || '',
    site_web: clientToEdit?.site_web || '',
    observations: clientToEdit?.observations || '',
  });

  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom?.trim()) {
      alert('Veuillez renseigner le nom ou la raison sociale du client.');
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
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header styled like WinDev header */}
        <div className="bg-blue-700 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            <h3 className="text-base font-bold">
              {clientToEdit ? `Modifier le Client : ${clientToEdit.nom}` : "Ajout d'un Client"}
            </h3>
          </div>
          <button onClick={onClose} className="text-blue-200 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Société / Raison Sociale *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: SOCIETE MAROCAINE D'IRRIGATION SARL"
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Interlocuteur / Contact</label>
              <input
                type="text"
                placeholder="Ex: M. Khalid El Amrani"
                value={form.interlocuteur}
                onChange={(e) => setForm({ ...form, interlocuteur: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1 font-mono">
                Numéro ICE (15 chiffres)
              </label>
              <input
                type="text"
                placeholder="Ex: 001928374000082"
                value={form.ice}
                onChange={(e) => setForm({ ...form, ice: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Adresse de Facturation</label>
              <input
                type="text"
                placeholder="N°, Rue, Zone industrielle..."
                value={form.adresse}
                onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Code Postal</label>
              <input
                type="text"
                value={form.code_postal}
                onChange={(e) => setForm({ ...form, code_postal: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Ville</label>
              <input
                type="text"
                list="azulerp-cities"
                value={form.ville}
                onChange={(e) => setForm({ ...form, ville: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Téléphone Fixe</label>
              <input
                type="text"
                placeholder="05 24 ..."
                value={form.telephone}
                onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">GSM / Mobile</label>
              <input
                type="text"
                placeholder="06 61 ..."
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                placeholder="contact@entreprise.ma"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Observations / Remarques</label>
              <textarea
                rows={2}
                placeholder="Conditions de règlement, remises particulières..."
                value={form.observations}
                onChange={(e) => setForm({ ...form, observations: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-md transition active:scale-95 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? 'Enregistrement...' : 'Enregistrer le Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
