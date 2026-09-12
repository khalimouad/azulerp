'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { FactureFournisseur, Fournisseur, PaiementFournisseur } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  ArrowLeft,
  CreditCard,
  Save,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  Search,
  CheckSquare,
  Square,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Layers,
} from 'lucide-react';

interface SupplierPaymentViewProps {
  fournisseur?: Fournisseur | null;
  facture?: FactureFournisseur | null;
  paymentToEdit?: PaiementFournisseur | null;
  facturesFournisseurs: FactureFournisseur[];
  fournisseurs: Fournisseur[];
  onBack: () => void;
  onSave: (paymentData: {
    facture_fournisseur_id?: number;
    facture_numero?: string;
    fournisseur_id: number;
    fournisseur_nom: string;
    date_paiement: string;
    montant: number;
    mode_paiement: 'Chèque' | 'Virement' | 'Traite / Effet' | 'Espèces' | 'Prélèvement';
    numero_cheque_ref?: string;
    banque_emettrice?: string;
    date_echeance_depot?: string;
    statut_cheque?: 'En attente' | 'Déposé / Débité' | 'Annulé';
    notes?: string;
    allocations?: Array<{ facture_fournisseur_id: number; montant: number }>;
  }) => Promise<void>;
}

interface SupplierInvoiceAllocationRow {
  facture: FactureFournisseur;
  selected: boolean;
  allocMontant: number;
  resteInitial: number;
}

const getFutureIso = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

export const SupplierPaymentView: React.FC<SupplierPaymentViewProps> = ({
  fournisseur,
  facture,
  paymentToEdit,
  facturesFournisseurs,
  fournisseurs,
  onBack,
  onSave,
}) => {
  const isEditing = Boolean(paymentToEdit);
  const [supplierId, setSupplierId] = useState<number>(
    paymentToEdit?.fournisseur_id || facture?.fournisseur_id || fournisseur?.id || fournisseurs[0]?.id || 0
  );
  const [datePaiement, setDatePaiement] = useState(
    paymentToEdit?.date_paiement || new Date().toISOString().split('T')[0]
  );
  const [montant, setMontant] = useState<number>(() => {
    if (paymentToEdit) return Number(paymentToEdit.montant || 0);
    if (facture) {
      const r = Number(facture.reste_a_payer);
      return r > 0 ? r : Number(facture.total_ttc || 0);
    }
    return 0;
  });
  const [mode, setMode] = useState<'Chèque' | 'Virement' | 'Traite / Effet' | 'Espèces' | 'Prélèvement'>(
    paymentToEdit?.mode_paiement || 'Chèque'
  );
  const [banque, setBanque] = useState<string>(paymentToEdit?.banque_emettrice || 'Attijariwafa Bank');
  const [refPaiement, setRefPaiement] = useState<string>(paymentToEdit?.numero_cheque_ref || '');
  const [echeanceDepot, setEcheanceDepot] = useState<string>(
    paymentToEdit?.date_echeance_depot || getFutureIso(3)
  );
  const [statutCheque, setStatutCheque] = useState<'En attente' | 'Déposé / Débité' | 'Annulé'>(
    paymentToEdit?.statut_cheque || 'En attente'
  );
  const [notes, setNotes] = useState<string>(paymentToEdit?.notes || '');
  const [supplierQuery, setSupplierQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Allocations state per supplier invoice ID: { [facId]: { selected: boolean, montant: number } }
  const [allocationMap, setAllocationMap] = useState<Record<number, { selected: boolean; montant: number }>>({});

  const selectedSupplier = fournisseurs.find((f) => Number(f.id) === Number(supplierId));

  const visibleSuppliers = useMemo(() => {
    const query = supplierQuery.trim().toLocaleLowerCase('fr');
    if (!query) return fournisseurs;
    return fournisseurs.filter((sup) =>
      `${sup.nom} ${sup.code || ''} ${sup.ville || ''} ${sup.ice || ''}`
        .toLocaleLowerCase('fr')
        .includes(query)
    );
  }, [supplierQuery, fournisseurs]);

  // Unpaid invoices for selected supplier
  const supplierUnpaidFactures = useMemo(() => {
    return facturesFournisseurs
      .filter((item) => {
        if (Number(item.fournisseur_id) !== Number(supplierId)) return false;
        if (item.etat === 'Annulé') return false;
        const reste = Number(item.reste_a_payer || 0);
        const isCurrentLinked =
          Number(paymentToEdit?.facture_fournisseur_id) === Number(item.id) ||
          Number(facture?.id) === Number(item.id);
        return reste > 0.009 || isCurrentLinked;
      })
      .sort((a, b) => a.date_facture.localeCompare(b.date_facture) || Number(a.id) - Number(b.id)); // Oldest first
  }, [supplierId, facturesFournisseurs, paymentToEdit, facture]);

  // Initialize or update allocations map when supplier invoices change
  useEffect(() => {
    setAllocationMap((prev) => {
      const nextMap: Record<number, { selected: boolean; montant: number }> = {};

      for (const item of supplierUnpaidFactures) {
        const existing = prev[item.id];
        const reste = Number(item.reste_a_payer || 0);
        const available = Number(item.reste_a_payer || 0) +
          (Number(paymentToEdit?.facture_fournisseur_id) === Number(item.id) ? Number(paymentToEdit?.montant || 0) : 0);

        if (existing) {
          nextMap[item.id] = {
            selected: existing.selected,
            montant: Math.min(existing.montant, available > 0 ? available : Number(item.total_ttc)),
          };
        } else {
          const isTargeted = Number(facture?.id) === Number(item.id) || Number(paymentToEdit?.facture_fournisseur_id) === Number(item.id);
          const initialAlloc = isTargeted
            ? (paymentToEdit ? Number(paymentToEdit.montant) : (reste > 0 ? reste : Number(item.total_ttc)))
            : 0;

          nextMap[item.id] = {
            selected: isTargeted,
            montant: initialAlloc,
          };
        }
      }

      return nextMap;
    });
  }, [supplierUnpaidFactures, facture, paymentToEdit]);

  // Compute live allocation rows
  const allocationRows: SupplierInvoiceAllocationRow[] = useMemo(() => {
    return supplierUnpaidFactures.map((fac) => {
      const entry = allocationMap[fac.id];
      const reste = Number(fac.reste_a_payer || 0);
      const isLinkedToEdit = Number(paymentToEdit?.facture_fournisseur_id) === Number(fac.id);
      const resteInitial = isLinkedToEdit ? reste + Number(paymentToEdit?.montant || 0) : reste;

      return {
        facture: fac,
        selected: entry?.selected ?? false,
        allocMontant: entry?.selected ? (entry?.montant ?? 0) : 0,
        resteInitial,
      };
    });
  }, [supplierUnpaidFactures, allocationMap, paymentToEdit]);

  // Total allocated across selected supplier invoices
  const totalAllocated = useMemo(() => {
    return Math.round(
      allocationRows.reduce((sum, row) => (row.selected ? sum + Number(row.allocMontant || 0) : sum), 0) * 100
    ) / 100;
  }, [allocationRows]);

  const unallocatedRemainder = Math.round((montant - totalAllocated) * 100) / 100;

  // Toggle invoice row selection
  const handleToggleRow = (facId: number) => {
    setAllocationMap((prev) => {
      const current = prev[facId];
      const willSelect = !current?.selected;
      const fac = supplierUnpaidFactures.find((f) => f.id === facId);
      const reste = Number(fac?.reste_a_payer || 0);

      let nextMontant = current?.montant || 0;
      if (willSelect && nextMontant === 0) {
        const remainingToCover = Math.max(0, montant - totalAllocated);
        nextMontant = remainingToCover > 0 ? Math.min(reste, remainingToCover) : reste;
      }

      return {
        ...prev,
        [facId]: {
          selected: willSelect,
          montant: nextMontant,
        },
      };
    });
  };

  const handleSetRowAmount = (facId: number, val: number) => {
    setAllocationMap((prev) => {
      const fac = supplierUnpaidFactures.find((f) => f.id === facId);
      const maxAvailable = Number(fac?.reste_a_payer || fac?.total_ttc || 0) +
        (Number(paymentToEdit?.facture_fournisseur_id) === Number(facId) ? Number(paymentToEdit?.montant || 0) : 0);
      const clamped = Math.max(0, Math.min(maxAvailable, Math.round(val * 100) / 100));

      return {
        ...prev,
        [facId]: {
          selected: clamped > 0 ? true : prev[facId]?.selected ?? false,
          montant: clamped,
        },
      };
    });
  };

  const handleQuickRatio = (facId: number, ratio: number) => {
    const fac = supplierUnpaidFactures.find((f) => f.id === facId);
    if (!fac) return;
    const reste = Number(fac.reste_a_payer || fac.total_ttc || 0) +
      (Number(paymentToEdit?.facture_fournisseur_id) === Number(facId) ? Number(paymentToEdit?.montant || 0) : 0);
    const calculated = Math.round(reste * ratio * 100) / 100;
    handleSetRowAmount(facId, calculated);
  };

  const handleToggleSelectAll = (select: boolean) => {
    setAllocationMap((prev) => {
      const nextMap = { ...prev };
      for (const f of supplierUnpaidFactures) {
        const reste = Number(f.reste_a_payer || f.total_ttc || 0);
        nextMap[f.id] = {
          selected: select,
          montant: select ? reste : 0,
        };
      }
      return nextMap;
    });
  };

  const handleSolderSelectedInvoices = () => {
    let sumSelected = 0;
    const nextMap = { ...allocationMap };

    for (const row of allocationRows) {
      if (row.selected) {
        const fullReste = row.resteInitial;
        nextMap[row.facture.id] = { selected: true, montant: fullReste };
        sumSelected += fullReste;
      }
    }

    if (sumSelected === 0) {
      for (const row of allocationRows) {
        const fullReste = row.resteInitial;
        nextMap[row.facture.id] = { selected: true, montant: fullReste };
        sumSelected += fullReste;
      }
    }

    setAllocationMap(nextMap);
    setMontant(Math.round(sumSelected * 100) / 100);
  };

  const handleFifoAutoDistribute = () => {
    if (montant <= 0) {
      alert('Veuillez d’abord saisir un montant de paiement supérieur à 0.');
      return;
    }

    let remainingFund = montant;
    const nextMap: Record<number, { selected: boolean; montant: number }> = {};

    for (const f of supplierUnpaidFactures) {
      const isLinkedToEdit = Number(paymentToEdit?.facture_fournisseur_id) === Number(f.id);
      const reste = isLinkedToEdit
        ? Number(f.reste_a_payer || 0) + Number(paymentToEdit?.montant || 0)
        : Number(f.reste_a_payer || f.total_ttc || 0);

      if (remainingFund > 0) {
        const toAllocate = Math.min(reste, remainingFund);
        nextMap[f.id] = {
          selected: toAllocate > 0,
          montant: Math.round(toAllocate * 100) / 100,
        };
        remainingFund -= toAllocate;
      } else {
        nextMap[f.id] = {
          selected: false,
          montant: 0,
        };
      }
    }

    setAllocationMap(nextMap);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (montant <= 0) {
      alert('Le montant du paiement doit être supérieur à zéro.');
      return;
    }
    if (!selectedSupplier) {
      alert('Veuillez sélectionner un fournisseur valide.');
      return;
    }
    if (totalAllocated > montant + 0.009) {
      alert(`Le total alloué (${formatCurrency(totalAllocated)}) ne peut pas dépasser le montant total émis (${formatCurrency(montant)}).`);
      return;
    }

    const activeAllocations = allocationRows
      .filter((r) => r.selected && r.allocMontant > 0)
      .map((r) => ({
        facture_fournisseur_id: r.facture.id,
        montant: r.allocMontant,
      }));

    setIsSaving(true);
    try {
      await onSave({
        facture_fournisseur_id: activeAllocations.length === 1 ? activeAllocations[0].facture_fournisseur_id : undefined,
        facture_numero: activeAllocations.length === 1 ? supplierUnpaidFactures.find((f) => f.id === activeAllocations[0].facture_fournisseur_id)?.numero : undefined,
        fournisseur_id: selectedSupplier.id,
        fournisseur_nom: selectedSupplier.nom,
        date_paiement: datePaiement,
        montant,
        mode_paiement: mode,
        numero_cheque_ref: refPaiement.trim(),
        banque_emettrice: banque.trim(),
        date_echeance_depot: (mode === 'Chèque' || mode === 'Traite / Effet') ? echeanceDepot : undefined,
        statut_cheque: statutCheque,
        notes: notes.trim(),
        allocations: activeAllocations,
      });
    } catch (err: any) {
      alert('Erreur: ' + (err?.message || 'Erreur inconnue lors de l’enregistrement'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200 max-w-6xl mx-auto pb-12">
      {/* Top Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour aux Règlements Fournisseurs</span>
          </button>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-600" />
              {isEditing
                ? `Modifier le Paiement N° ${paymentToEdit?.id}`
                : facture
                ? `Régler Facture Fournisseur : ${facture.numero}`
                : 'Émettre un Paiement / Chèque Fournisseur'}
            </h2>
            <p className="text-xs text-slate-500">
              Saisie du règlement fournisseur avec lettrage direct : règlement complet, partiel ou multi-factures
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
            disabled={isSaving || !selectedSupplier || montant <= 0}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Enregistrement...' : isEditing ? 'Enregistrer les modifications' : 'Valider le Paiement'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ========================================================================= */}
        {/* CARD 1: GENERAL SUPPLIER PAYMENT DETAILS */}
        {/* ========================================================================= */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              Modalités du Règlement Fournisseur
            </h3>
            {selectedSupplier && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                Solde Dû Fournisseur : <strong className="text-rose-600">{formatCurrency(selectedSupplier.solde_du || 0)}</strong>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Supplier Selector */}
            <div className="md:col-span-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Fournisseur *</label>
              {!facture && (
                <div className="relative mb-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={supplierQuery}
                    onChange={(e) => setSupplierQuery(e.target.value)}
                    placeholder="Filtrer fournisseur…"
                    className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(Number(e.target.value))}
                disabled={!!facture}
                className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium disabled:bg-slate-100"
              >
                {visibleSuppliers.length === 0 && <option value="">Aucun fournisseur trouvé</option>}
                {visibleSuppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nom} {s.ville ? `(${s.ville})` : ''} - Solde: {formatCurrency(s.solde_du || 0)}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Date d'Émission *
              </label>
              <input
                type="date"
                required
                value={datePaiement}
                onChange={(e) => setDatePaiement(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            {/* Master Payment Amount */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Montant du Paiement (DH) *</span>
                {allocationRows.some((r) => r.selected) && (
                  <button
                    type="button"
                    onClick={handleSolderSelectedInvoices}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold underline"
                  >
                    Ajuster au solde
                  </button>
                )}
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                value={montant || ''}
                onChange={(e) => setMontant(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full px-3 py-1.5 text-base font-mono font-black text-indigo-900 bg-indigo-50/40 rounded-lg border-2 border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Mode */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mode de Règlement *</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value="Chèque">Chèque Bancaire</option>
                <option value="Traite / Effet">Traite / Effet de commerce</option>
                <option value="Virement">Virement bancaire</option>
                <option value="Espèces">Espèces</option>
                <option value="Prélèvement">Prélèvement automatique</option>
              </select>
            </div>

            {/* Banque */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Banque Émettrice</label>
              <select
                value={banque}
                onChange={(e) => setBanque(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

            {/* Reference */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                N° Chèque / N° Traite / Référence
              </label>
              <input
                type="text"
                placeholder="Ex: CHQ-2026/88921"
                value={refPaiement}
                onChange={(e) => setRefPaiement(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Check Due Date for Alerts */}
            {(mode === 'Chèque' || mode === 'Traite / Effet') && (
              <div>
                <label className="block text-xs font-bold text-amber-800 mb-1.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Date d'Échéance / Dépôt Prévu *
                </label>
                <input
                  type="date"
                  required
                  value={echeanceDepot}
                  onChange={(e) => setEcheanceDepot(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-amber-50/50 rounded-lg border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900"
                />
              </div>
            )}

            {/* Check Status */}
            {(mode === 'Chèque' || mode === 'Traite / Effet') && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Statut du Chèque</label>
                <select
                  value={statutCheque}
                  onChange={(e) => setStatutCheque(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="En attente">En attente d'encaissement</option>
                  <option value="Déposé / Débité">Déposé / Débité</option>
                  <option value="Annulé">Annulé / Rejeté</option>
                </select>
              </div>
            )}

            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Notes & Observations</label>
              <input
                type="text"
                placeholder="Ex: Règlement factures d'engrais et semences..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CARD 2: MATCHING SUPPLIER INVOICES TABLE (LETTRAGE ACHATS) */}
        {/* ========================================================================= */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                Lettrage et Affectation aux Factures Fournisseurs Impayées
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cochez les factures d'achat à solder et allouez le montant (règlement total, partiel ou multi-factures).
              </p>
            </div>

            {/* Quick Helper Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleToggleSelectAll(true)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                Tout cocher
              </button>
              <button
                type="button"
                onClick={() => handleToggleSelectAll(false)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                Tout décocher
              </button>
              <button
                type="button"
                onClick={handleFifoAutoDistribute}
                className="flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Répartition FIFO Auto
              </button>
              <button
                type="button"
                onClick={handleSolderSelectedInvoices}
                className="flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition shadow-2xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Solder les Cochées
              </button>
            </div>
          </div>

          {/* Invoices Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 divide-x divide-slate-200">
                  <th className="py-2.5 px-3 text-center w-10">Sélec.</th>
                  <th className="py-2.5 px-3">N° Facture</th>
                  <th className="py-2.5 px-3">Date Facture</th>
                  <th className="py-2.5 px-3">Échéance</th>
                  <th className="py-2.5 px-3 text-right">Total TTC</th>
                  <th className="py-2.5 px-3 text-right">Déjà Payé</th>
                  <th className="py-2.5 px-3 text-right">Reste Initial</th>
                  <th className="py-2.5 px-3 text-center min-w-[200px]">Montant à Allouer (DH)</th>
                  <th className="py-2.5 px-3 text-right">Nouveau Reste</th>
                  <th className="py-2.5 px-3 text-center">Statut Prévu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {allocationRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400">
                      Aucune facture impayée trouvée pour ce fournisseur. Le paiement sera enregistré comme acompte sur le compte fournisseur.
                    </td>
                  </tr>
                ) : (
                  allocationRows.map((row) => {
                    const fac = row.facture;
                    const alloc = row.allocMontant;
                    const newReste = Math.max(0, Math.round((row.resteInitial - alloc) * 100) / 100);
                    const isFullyPaid = row.selected && newReste <= 0.01 && alloc > 0;
                    const isPartial = row.selected && alloc > 0 && newReste > 0.01;

                    return (
                      <tr
                        key={fac.id}
                        className={`transition hover:bg-slate-50/80 divide-x divide-slate-200 ${
                          row.selected ? 'bg-indigo-50/20' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleRow(fac.id)}
                            className="text-slate-600 hover:text-indigo-600"
                          >
                            {row.selected ? (
                              <CheckSquare className="w-4 h-4 text-indigo-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                        </td>

                        {/* Numero */}
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">
                          {fac.numero}
                        </td>

                        {/* Date */}
                        <td className="py-2 px-3 text-slate-600">
                          {formatDate(fac.date_facture)}
                        </td>

                        {/* Echeance */}
                        <td className="py-2 px-3 text-slate-500 font-mono">
                          {fac.date_echeance ? formatDate(fac.date_echeance) : '-'}
                        </td>

                        {/* Total TTC */}
                        <td className="py-2 px-3 text-right font-mono text-slate-700">
                          {formatCurrency(fac.total_ttc)}
                        </td>

                        {/* Deja Paye */}
                        <td className="py-2 px-3 text-right font-mono text-slate-500">
                          {formatCurrency(fac.montant_paye || 0)}
                        </td>

                        {/* Reste Initial */}
                        <td className="py-2 px-3 text-right font-mono font-bold text-rose-700">
                          {formatCurrency(row.resteInitial)}
                        </td>

                        {/* Montant a Allouer */}
                        <td className="py-2 px-3">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              max={row.resteInitial}
                              disabled={!row.selected}
                              value={row.selected ? (allocationMap[fac.id]?.montant ?? '') : ''}
                              onChange={(e) => handleSetRowAmount(fac.id, parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className={`w-28 px-2 py-1 text-xs font-mono font-bold rounded-lg border text-right focus:outline-none focus:ring-2 ${
                                row.selected
                                  ? 'bg-white border-indigo-400 text-indigo-900 focus:ring-indigo-500'
                                  : 'bg-slate-100 border-slate-200 text-slate-400'
                              }`}
                            />

                            {/* Quick percentage buttons */}
                            <button
                              type="button"
                              onClick={() => {
                                if (!row.selected) handleToggleRow(fac.id);
                                handleQuickRatio(fac.id, 1);
                              }}
                              className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition"
                              title="Solder à 100%"
                            >
                              100%
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!row.selected) handleToggleRow(fac.id);
                                handleQuickRatio(fac.id, 0.5);
                              }}
                              className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-800 hover:bg-blue-200 transition"
                              title="Payer 50%"
                            >
                              50%
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetRowAmount(fac.id, 0)}
                              className="px-1 py-0.5 text-[10px] font-semibold rounded bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                              title="Vider"
                            >
                              0
                            </button>
                          </div>
                        </td>

                        {/* Nouveau Reste */}
                        <td className="py-2 px-3 text-right font-mono font-bold">
                          {row.selected ? (
                            <span className={newReste <= 0.01 ? 'text-emerald-700' : 'text-amber-700'}>
                              {formatCurrency(newReste)}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>

                        {/* Statut Prevu */}
                        <td className="py-2 px-3 text-center">
                          {isFullyPaid ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 justify-center w-fit mx-auto">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Payée
                            </span>
                          ) : isPartial ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1 justify-center w-fit mx-auto">
                              <Clock className="w-3 h-3 text-blue-600" />
                              Partiel
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">
                              Inchangée
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Allocation Recap Bar */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-6 flex-wrap">
              <div>
                <span className="text-slate-500 block text-[11px]">Total Paiement Émis :</span>
                <strong className="text-sm font-mono font-black text-slate-900">{formatCurrency(montant)}</strong>
              </div>
              <div className="h-6 w-px bg-slate-200 hidden sm:block" />
              <div>
                <span className="text-slate-500 block text-[11px]">Total Alloué aux Factures :</span>
                <strong className="text-sm font-mono font-black text-indigo-700">{formatCurrency(totalAllocated)}</strong>
              </div>
              <div className="h-6 w-px bg-slate-200 hidden sm:block" />
              <div>
                <span className="text-slate-500 block text-[11px]">Reliquat (Acompte non lettré) :</span>
                <strong className={`text-sm font-mono font-black ${unallocatedRemainder >= 0 ? 'text-blue-700' : 'text-rose-700'}`}>
                  {formatCurrency(unallocatedRemainder)}
                </strong>
              </div>
            </div>

            <div>
              {totalAllocated > montant + 0.009 ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-bold">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Dépassement : l’affectation excède le paiement de {formatCurrency(totalAllocated - montant)}</span>
                </div>
              ) : unallocatedRemainder > 0.009 ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{formatCurrency(unallocatedRemainder)} sera enregistré en acompte sur le compte fournisseur</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Lettrage équilibré : 100% du montant est affecté aux factures</span>
                </div>
              )}
            </div>
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
            disabled={isSaving || !selectedSupplier || montant <= 0 || totalAllocated > montant + 0.009}
            className="flex items-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Enregistrement...' : isEditing ? 'Enregistrer les modifications' : 'Valider le Règlement Fournisseur'}
          </button>
        </div>
      </form>
    </div>
  );
};
