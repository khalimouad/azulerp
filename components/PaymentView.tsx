'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Facture, Client, Reglement } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import {
  ArrowLeft,
  CreditCard,
  Save,
  Building,
  Calendar,
  DollarSign,
  FileText,
  Search,
} from 'lucide-react';

interface PaymentViewProps {
  facture?: Facture | null;
  paymentToEdit?: Reglement | null;
  factures: Facture[];
  clients: Client[];
  onBack: () => void;
  onSave: (paymentData: {
    facture_id?: number;
    facture_numero?: string;
    client_id: number;
    client_nom: string;
    date: string;
    montant: number;
    mode_reglement: string;
    reference_paiement?: string;
    banque?: string;
    notes?: string;
  }) => Promise<void>;
}

const getAvailableForFacture = (item: Facture, payment?: Reglement | null) =>
  Number(item.reste_a_payer || 0) +
  (Number(payment?.facture_id) === Number(item.id) ? Number(payment?.montant || 0) : 0);

export const PaymentView: React.FC<PaymentViewProps> = ({
  facture,
  paymentToEdit,
  factures,
  clients,
  onBack,
  onSave,
}) => {
  const isEditing = Boolean(paymentToEdit);
  const isLegacyUnlinkedEdit = Boolean(paymentToEdit && !paymentToEdit.facture_id);
  const [clientId, setClientId] = useState<number>(
    paymentToEdit?.client_id || facture?.client_id || clients[0]?.id || 0
  );
  const [date, setDate] = useState(paymentToEdit?.date || new Date().toISOString().split('T')[0]);
  const [factureId, setFactureId] = useState<number>(paymentToEdit?.facture_id || facture?.id || 0);
  const [montant, setMontant] = useState<number>(
    paymentToEdit?.montant ||
      (facture ? (facture.reste_a_payer > 0 ? facture.reste_a_payer : facture.total_ttc) : 0)
  );
  const [mode, setMode] = useState<string>(
    paymentToEdit?.mode_reglement || paymentToEdit?.mode || 'Virement'
  );
  const [banque, setBanque] = useState<string>(paymentToEdit?.banque || 'Attijariwafa Bank');
  const [refPaiement, setRefPaiement] = useState<string>(paymentToEdit?.reference_paiement || '');
  const [notes, setNotes] = useState<string>(paymentToEdit?.notes || '');
  const [clientQuery, setClientQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const selectedClient = clients.find((c) => Number(c.id) === Number(clientId));
  const visibleClients = useMemo(() => {
    const query = clientQuery.trim().toLocaleLowerCase('fr');
    if (!query) return clients;
    return clients.filter((client) =>
      `${client.nom} ${client.code || ''} ${client.ville || ''} ${client.ice || ''}`
        .toLocaleLowerCase('fr')
        .includes(query)
    );
  }, [clientQuery, clients]);
  const payableFactures = useMemo(
    () =>
      factures
        .filter(
          (item) =>
            Number(item.client_id) === Number(clientId) &&
            getAvailableForFacture(item, paymentToEdit) > 0.009 &&
            item.etat !== 'Annulé'
        )
        .sort((a, b) => b.date.localeCompare(a.date) || Number(b.id) - Number(a.id)),
    [clientId, factures, paymentToEdit]
  );
  const selectedFacture = facture || payableFactures.find((item) => Number(item.id) === factureId);
  const canSave = Boolean(selectedClient && (selectedFacture || isLegacyUnlinkedEdit));

  useEffect(() => {
    if (!facture && !paymentToEdit && !selectedClient && clients[0]) setClientId(clients[0].id);
  }, [clients, facture, paymentToEdit, selectedClient]);

  useEffect(() => {
    if (facture) {
      setFactureId(facture.id);
      setClientId(facture.client_id);
      return;
    }
    if (isLegacyUnlinkedEdit && factureId === 0) return;
    const stillAvailable = payableFactures.some((item) => Number(item.id) === factureId);
    if (!stillAvailable) setFactureId(payableFactures[0]?.id || 0);
  }, [facture, factureId, isLegacyUnlinkedEdit, payableFactures]);

  useEffect(() => {
    if (!selectedFacture) return;
    if (
      paymentToEdit &&
      Number(selectedFacture.id) === Number(paymentToEdit.facture_id) &&
      Number(factureId) === Number(paymentToEdit.facture_id)
    ) {
      setMontant(Number(paymentToEdit.montant));
      return;
    }
    setMontant(getAvailableForFacture(selectedFacture, paymentToEdit));
  }, [factureId, paymentToEdit, selectedFacture]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (montant <= 0) {
      alert('Le montant du règlement doit être supérieur à zéro.');
      return;
    }
    if (!selectedClient) {
      alert('Veuillez sélectionner un client valide.');
      return;
    }
    if (!selectedFacture && !isLegacyUnlinkedEdit) {
      alert('Veuillez sélectionner une facture impayée pour associer cet encaissement.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        facture_id: selectedFacture?.id,
        facture_numero: selectedFacture?.numero,
        client_id: selectedClient.id,
        client_nom: selectedClient.nom,
        date,
        montant,
        mode_reglement: mode,
        reference_paiement: refPaiement,
        banque,
        notes,
      });
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
              {isEditing
                ? `Modifier l’encaissement N° ${paymentToEdit?.id}`
                : facture
                  ? `Encaisser Facture : ${facture.numero}`
                  : 'Enregistrer un Encaissement Client'}
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
            disabled={isSaving || !canSave}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Enregistrement...' : isEditing ? 'Enregistrer les modifications' : 'Valider l’Encaissement'}
          </button>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Facture Info Banner if linked */}
        {selectedFacture && (
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-blue-900 text-sm">Facture N° {selectedFacture.numero}</span>
              <p className="text-blue-700 mt-0.5">Date : {selectedFacture.date} • Client : {selectedFacture.client_nom}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-slate-500 block">Total Facture TTC</span>
                <strong className="text-slate-900 font-mono text-sm">{formatCurrency(selectedFacture.total_ttc)}</strong>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block">Disponible pour ce règlement</span>
                <strong className="text-red-600 font-mono text-sm">{formatCurrency(getAvailableForFacture(selectedFacture, paymentToEdit))}</strong>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Client *</label>
              {!facture && (
                <div className="relative mb-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={clientQuery}
                    onChange={(e) => setClientQuery(e.target.value)}
                    placeholder="Rechercher par nom, code, ville ou ICE…"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}
              <select
                value={clientId}
                onChange={(e) => setClientId(Number(e.target.value))}
                disabled={!!facture}
                className="w-full px-3.5 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium disabled:bg-slate-100"
              >
                {visibleClients.length === 0 && <option value="">Aucun client trouvé</option>}
                {visibleClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom} {c.ville ? `(${c.ville})` : ''} - Solde: {formatCurrency(c.solde || 0)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Facture associée {isLegacyUnlinkedEdit ? '' : '*'}
              </label>
              <select
                value={selectedFacture?.id || 0}
                onChange={(e) => setFactureId(Number(e.target.value))}
                disabled={!!facture}
                required={!isLegacyUnlinkedEdit}
                className="w-full px-3.5 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium disabled:bg-slate-100"
              >
                {isLegacyUnlinkedEdit && (
                  <option value={0}>Règlement historique non associé à une facture</option>
                )}
                {payableFactures.length === 0 && !facture && !isLegacyUnlinkedEdit && (
                  <option value="">Aucune facture impayée pour ce client</option>
                )}
                {(facture ? [facture] : payableFactures).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.numero} — {item.date} — Disponible {formatCurrency(getAvailableForFacture(item, paymentToEdit))}
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
            disabled={isSaving || !canSave}
            className="flex items-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Enregistrement...' : isEditing ? 'Enregistrer les modifications' : 'Enregistrer le Règlement'}
          </button>
        </div>
      </form>
    </div>
  );
};
