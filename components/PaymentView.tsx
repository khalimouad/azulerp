'use client';

import React, { useState } from 'react';
import { Facture, Client } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import {
  ArrowLeft,
  CreditCard,
  Save,
  Building,
  Calendar,
  DollarSign,
  FileText,
} from 'lucide-react';

interface PaymentViewProps {
  facture?: Facture | null;
  clients: Client[];
  onBack: () => void;
  onSave: (paymentData: {
    facture_id?: number;
    client_id: number;
    client_nom: string;
    date: string;
    montant: number;
    mode: string;
    reference_paiement?: string;
    banque?: string;
    notes?: string;
  }) => Promise<void>;
}

export const PaymentView: React.FC<PaymentViewProps> = ({
  facture,
  clients,
  onBack,
  onSave,
}) => {
  const [clientId, setClientId] = useState<number>(
    facture?.client_id || clients[0]?.id || 0
  );
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [montant, setMontant] = useState<number>(
    facture ? (facture.reste_a_payer > 0 ? facture.reste_a_payer : facture.total_ttc) : 0
  );
  const [mode, setMode] = useState<string>('Virement');
  const [banque, setBanque] = useState<string>('Attijariwafa Bank');
  const [refPaiement, setRefPaiement] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const selectedClient = clients.find((c) => c.id === clientId) || clients[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (montant <= 0) {
      alert('Le montant du règlement doit être supérieur à zéro.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        facture_id: facture?.id,
        client_id: selectedClient.id,
        client_nom: selectedClient.nom,
        date,
        montant,
        mode,
        reference_paiement: refPaiement,
        banque,
        notes,
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
            <span>Retour aux Règlements</span>
          </button>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              {facture ? `Encaisser Facture : ${facture.numero}` : 'Enregistrer un Encaissement Client'}
            </h2>
            <p className="text-xs text-slate-500">
              Saisie du règlement client, lettrage de facture et mise à jour automatique du solde
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
            {isSaving ? 'Enregistrement...' : 'Valider l’Encaissement'}
          </button>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Facture Info Banner if linked */}
        {facture && (
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-blue-900 text-sm">Facture N° {facture.numero}</span>
              <p className="text-blue-700 mt-0.5">Date : {facture.date} • Client : {facture.client_nom}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-slate-500 block">Total Facture TTC</span>
                <strong className="text-slate-900 font-mono text-sm">{formatCurrency(facture.total_ttc)}</strong>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block">Reste à Payer</span>
                <strong className="text-red-600 font-mono text-sm">{formatCurrency(facture.reste_a_payer)}</strong>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Client *</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(Number(e.target.value))}
                disabled={!!facture}
                className="w-full px-3.5 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium disabled:bg-slate-100"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom} {c.ville ? `(${c.ville})` : ''} - Solde: {formatCurrency(c.solde || 0)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Date de Règlement *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Montant Encaissé (DH TTC) *
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                value={montant}
                onChange={(e) => setMontant(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2 text-xs font-mono font-bold text-emerald-800 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mode de Paiement *</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="Virement">Virement bancaire</option>
                <option value="Chèque">Chèque bancaire</option>
                <option value="Traite">Traite / Effet de commerce</option>
                <option value="Espèces">Espèces / Caisse</option>
                <option value="Carte Bancaire">Carte Bancaire (TPE)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Banque Domiciliation</label>
              <select
                value={banque}
                onChange={(e) => setBanque(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Attijariwafa Bank">Attijariwafa Bank</option>
                <option value="Banque Populaire (BCP)">Banque Populaire (BCP)</option>
                <option value="BMCE Bank of Africa">BMCE Bank of Africa</option>
                <option value="Société Générale Maroc">Société Générale Maroc</option>
                <option value="Crédit Agricole du Maroc (CAM)">Crédit Agricole du Maroc (CAM)</option>
                <option value="CIH Bank">CIH Bank</option>
                <option value="Crédit du Maroc (CDM)">Crédit du Maroc (CDM)</option>
                <option value="Autre / Caisse">Autre / Caisse</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                N° Chèque / Réf Virement / N° Traite
              </label>
              <input
                type="text"
                placeholder="Ex: CHQ N° 7845920 / VIR N° 99210"
                value={refPaiement}
                onChange={(e) => setRefPaiement(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Notes & Observations</label>
            <input
              type="text"
              placeholder="Ex: Règlement acompte 50% sur commande"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
            className="flex items-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Enregistrement...' : 'Enregistrer le Règlement'}
          </button>
        </div>
      </form>
    </div>
  );
};
