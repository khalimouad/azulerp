'use client';

import React, { useState } from 'react';
import { Facture, Client } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { CreditCard, X, Save } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  facture?: Facture | null;
  clients: Client[];
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

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  facture,
  clients,
  onSave,
}) => {
  const [clientId, setClientId] = useState<number>(facture?.client_id || clients[0]?.id || 0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [montant, setMontant] = useState<number>(facture ? (facture.reste_a_payer > 0 ? facture.reste_a_payer : facture.total_ttc) : 0);
  const [mode, setMode] = useState<string>('Virement');
  const [banque, setBanque] = useState<string>('Attijariwafa Bank');
  const [refPaiement, setRefPaiement] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const selectedClient = clients.find((c) => c.id === clientId) || clients[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (montant <= 0) {
      alert('Le montant doit être supérieur à zéro.');
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
      onClose();
    } catch (err: any) {
      alert('Erreur: ' + (err?.message || 'Erreur inconnue'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        <div className="bg-emerald-800 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            <h3 className="text-base font-bold">
              {facture ? `Encaisser la Facture : ${facture.numero}` : 'Enregistrer un Règlement'}
            </h3>
          </div>
          <button onClick={onClose} className="text-emerald-200 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {facture && (
            <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 flex justify-between items-center">
              <div>
                <div className="font-bold text-blue-950">Facture {facture.numero}</div>
                <div className="text-blue-700">{facture.client_nom}</div>
              </div>
              <div className="text-right">
                <div className="text-slate-500 text-[10px]">Reste à payer</div>
                <div className="font-mono font-bold text-rose-700 text-sm">
                  {formatCurrency(facture.reste_a_payer)}
                </div>
              </div>
            </div>
          )}

          {!facture && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Client *</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-300 font-medium"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Date Encaissement *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-300"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1 font-mono">Montant Encaissé (DH) *</label>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                value={montant}
                onChange={(e) => setMontant(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-300 font-mono font-bold text-sm text-emerald-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Mode de Paiement</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-300 font-medium"
              >
                <option value="Virement">Virement bancaire</option>
                <option value="Chèque">Chèque bancaire</option>
                <option value="Traite">Traite / Effet</option>
                <option value="Espèces">Espèces</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Banque</label>
              <input
                type="text"
                list="azulerp-banks"
                placeholder="Ex: Attijariwafa, BCP..."
                value={banque}
                onChange={(e) => setBanque(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">N° Chèque / Réf Virement</label>
            <input
              type="text"
              placeholder="Ex: CHQ 8492041 ou VIR-2026-90"
              value={refPaiement}
              onChange={(e) => setRefPaiement(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-300 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Notes internes</label>
            <input
              type="text"
              placeholder="Ex: Règlement partiel reçu par coursier..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 rounded-lg border border-slate-300"
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
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? 'Enregistrement...' : 'Valider le Règlement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
