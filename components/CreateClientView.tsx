'use client';

import React, { useState } from 'react';
import { Client } from '@/lib/types';
import {
  ArrowLeft,
  Users,
  Save,
  Building,
  Phone,
  Mail,
  MapPin,
  FileCheck,
} from 'lucide-react';

interface CreateClientViewProps {
  clientToEdit?: Client | null;
  onBack: () => void;
  onSave: (clientData: Partial<Client>) => Promise<void>;
}

export const CreateClientView: React.FC<CreateClientViewProps> = ({
  clientToEdit,
  onBack,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom?.trim()) {
      alert('Veuillez renseigner le nom ou la raison sociale du client.');
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
      {/* Top Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            id="back-to-clients-btn"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour aux Clients</span>
          </button>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              {clientToEdit ? `Modifier Client : ${clientToEdit.nom}` : 'Nouveau Compte Client'}
            </h2>
            <p className="text-xs text-slate-500">
              Fiche tiers client, identification fiscale (ICE), coordonnées et conditions de facturation
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
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Enregistrement...' : 'Enregistrer le Client'}
          </button>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Section 1: Identification */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Raison Sociale & Identifiants Fiscaux
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Code Client</label>
              <input
                type="text"
                placeholder="Ex: CLT001"
                value={form.code || ''}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="w-full px-3.5 py-2 text-xs font-mono bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Raison Sociale / Nom du Client *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: DOMAINE AGRICOLE ATLAS SARL"
                value={form.nom || ''}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                className="w-full px-3.5 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ICE (15 Chiffres)
              </label>
              <input
                type="text"
                placeholder="001524391000088"
                value={form.ice || ''}
                onChange={(e) => setForm({ ...form, ice: e.target.value })}
                className="w-full px-3.5 py-2 text-xs font-mono bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-blue-900"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Interlocuteur / Responsable Achat
              </label>
              <input
                type="text"
                placeholder="Ex: M. Amine Benjelloun"
                value={form.interlocuteur || ''}
                onChange={(e) => setForm({ ...form, interlocuteur: e.target.value })}
                className="w-full px-3.5 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Coordonnées */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <MapPin className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Coordonnées, Adresse de Livraison & Facturation
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Adresse Complète</label>
              <input
                type="text"
                placeholder="Ex: Km 12 Route de l'Ourika"
                value={form.adresse || ''}
                onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                className="w-full px-3.5 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Ville</label>
              <input
                type="text"
                list="verdeorto-cities"
                placeholder="Marrakech"
                value={form.ville || ''}
                onChange={(e) => setForm({ ...form, ville: e.target.value })}
                className="w-full px-3.5 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Code Postal</label>
              <input
                type="text"
                placeholder="40000"
                value={form.code_postal || ''}
                onChange={(e) => setForm({ ...form, code_postal: e.target.value })}
                className="w-full px-3.5 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Pays</label>
              <input
                type="text"
                value={form.pays || 'Maroc'}
                onChange={(e) => setForm({ ...form, pays: e.target.value })}
                className="w-full px-3.5 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Téléphone Fixe</label>
              <input
                type="text"
                placeholder="+212 5 24 ..."
                value={form.telephone || ''}
                onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                className="w-full px-3.5 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mobile / GSM</label>
              <input
                type="text"
                placeholder="+212 6 61 ..."
                value={form.mobile || ''}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                className="w-full px-3.5 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Commercial</label>
              <input
                type="email"
                placeholder="contact@domaine-atlas.ma"
                value={form.email || ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3.5 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Notes */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <FileCheck className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Observations & Conditions Commerciales
            </h3>
          </div>

          <div>
            <textarea
              rows={3}
              placeholder="Ex: Conditions de paiement accordées : 60 jours fin de mois. Plafond d'encours autorisé : 100 000 DH."
              value={form.observations || ''}
              onChange={(e) => setForm({ ...form, observations: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            ← Annuler et revenir à la liste des clients
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Enregistrement...' : 'Enregistrer la Fiche Client'}
          </button>
        </div>
      </form>
    </div>
  );
};
