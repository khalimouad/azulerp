'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Fournisseur, Produit, FactureFournisseur, FactureFournisseurLigne, DocumentState } from '@/lib/types';
import { formatCurrency, numberToFrenchWords } from '@/lib/utils';
import { ProductSearchSelect } from '@/components/ProductSearchSelect';
import { DecimalInput } from '@/components/DecimalInput';
import {
  ArrowLeft,
  Plus,
  Trash2,
  FileText,
  Save,
  Calendar,
  Building2,
  CreditCard,
  Building,
  CheckCircle2,
  Clock,
  Search,
  Copy,
} from 'lucide-react';

interface CreateFactureFournisseurViewProps {
  fournisseurs: Fournisseur[];
  produits: Produit[];
  preSelectedSupplierId?: number;
  factureToEdit?: FactureFournisseur | null;
  onBack: () => void;
  onSave: (data: {
    numero?: string;
    fournisseur_id: number;
    fournisseur_nom: string;
    fournisseur_ice?: string;
    date_facture: string;
    date_echeance?: string;
    mode_reglement?: string;
    notes?: string;
    etat: DocumentState;
    total_ht: number;
    tva_20: number;
    tva_10: number;
    tva_7: number;
    total_tva: number;
    total_ttc: number;
    lignes: Array<{
      produit_id?: number;
      designation: string;
      quantite: number;
      prix_achat_ht: number;
      taux_tva: number;
      remise_pct?: number;
      total_ht: number;
      total_tva: number;
      total_ttc: number;
    }>;
  }) => Promise<void>;
}

export const CreateFactureFournisseurView: React.FC<CreateFactureFournisseurViewProps> = ({
  fournisseurs,
  produits,
  preSelectedSupplierId,
  factureToEdit,
  onBack,
  onSave,
}) => {
  const [supplierId, setSupplierId] = useState<number>(
    Number(factureToEdit?.fournisseur_id || preSelectedSupplierId || (fournisseurs[0]?.id || 0))
  );
  const [numero, setNumero] = useState<string>(factureToEdit?.numero || '');
  const [dateFacture, setDateFacture] = useState<string>(
    factureToEdit?.date_facture || new Date().toISOString().split('T')[0]
  );
  const [dateEcheance, setDateEcheance] = useState<string>(() => {
    if (factureToEdit?.date_echeance) return factureToEdit.date_echeance;
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [modeReglement, setModeReglement] = useState<string>('Virement');
  const [notes, setNotes] = useState<string>(factureToEdit?.notes || '');
  const [supplierQuery, setSupplierQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [lignes, setLignes] = useState<
    Array<{
      produit_id?: number;
      designation: string;
      quantite: number;
      prix_achat_ht: number;
      taux_tva: number;
      remise_pct?: number;
    }>
  >(() => {
    if (factureToEdit && factureToEdit.lignes && factureToEdit.lignes.length > 0) {
      return factureToEdit.lignes.map((l) => ({
        produit_id: l.produit_id,
        designation: l.designation,
        quantite: Number(l.quantite || 1),
        prix_achat_ht: Number(l.prix_achat_ht || 0),
        taux_tva: Number(l.taux_tva ?? 20),
        remise_pct: 0,
      }));
    }
    const defaultProduct = produits[0];
    return [
      {
        produit_id: defaultProduct?.id,
        designation: defaultProduct?.libelle || 'Marchandises / Matières Premières',
        quantite: 1,
        prix_achat_ht: Number(defaultProduct?.prix_achat_ht || defaultProduct?.prix_achat || 0),
        taux_tva: Number(defaultProduct?.taux_tva ?? 20),
        remise_pct: 0,
      },
    ];
  });

  const selectedSupplier = fournisseurs.find((f) => Number(f.id) === Number(supplierId));

  const visibleSuppliers = useMemo(() => {
    const query = supplierQuery.trim().toLocaleLowerCase('fr');
    if (!query) return fournisseurs;
    return fournisseurs.filter((s) =>
      `${s.nom} ${s.code || ''} ${s.ville || ''} ${s.ice || ''}`
        .toLocaleLowerCase('fr')
        .includes(query)
    );
  }, [supplierQuery, fournisseurs]);

  const addLine = () => {
    const firstPrd = produits[0];
    setLignes([
      ...lignes,
      {
        produit_id: firstPrd?.id,
        designation: firstPrd?.libelle || 'Nouvel article',
        quantite: 1,
        prix_achat_ht: Number(firstPrd?.prix_achat_ht || firstPrd?.prix_achat || 0),
        taux_tva: Number(firstPrd?.taux_tva ?? 20),
        remise_pct: 0,
      },
    ]);
  };

  const duplicateLine = (index: number) => {
    const target = lignes[index];
    if (!target) return;
    const copy = { ...target };
    setLignes([...lignes.slice(0, index + 1), copy, ...lignes.slice(index + 1)]);
  };

  const removeLine = (index: number) => {
    if (lignes.length <= 1) return;
    setLignes(lignes.filter((_, i) => i !== index));
  };

  const handleProductSelect = (index: number, productId: number) => {
    const product = produits.find((p) => p.id === productId);
    const updated = [...lignes];
    if (product) {
      updated[index] = {
        ...updated[index],
        produit_id: product.id,
        designation: product.libelle,
        prix_achat_ht: Number(product.prix_achat_ht || product.prix_achat || 0),
        taux_tva: Number(product.taux_tva ?? 20),
      };
    }
    setLignes(updated);
  };

  // Exact math calculations per line
  const calculatedLignes = lignes.map((l) => {
    const qte = Number(l.quantite) || 0;
    const prix = Number(l.prix_achat_ht) || 0;
    const remise = Number(l.remise_pct) || 0;
    const tvaRate = Number(l.taux_tva !== undefined && l.taux_tva !== null ? l.taux_tva : 20);

    const baseHt = qte * prix;
    const montantRemise = baseHt * (remise / 100);
    const total_ht = Math.round((baseHt - montantRemise) * 100) / 100;
    const total_tva = Math.round(total_ht * (tvaRate / 100) * 100) / 100;
    const total_ttc = Math.round((total_ht + total_tva) * 100) / 100;

    return {
      ...l,
      quantite: qte,
      prix_achat_ht: prix,
      taux_tva: tvaRate,
      remise_pct: remise,
      total_ht,
      total_tva,
      total_ttc,
    };
  });

  const totalHt = Math.round(calculatedLignes.reduce((sum, l) => sum + l.total_ht, 0) * 100) / 100;
  const tva20 = Math.round(
    calculatedLignes.filter((l) => Number(l.taux_tva) === 20).reduce((sum, l) => sum + l.total_tva, 0) * 100
  ) / 100;
  const tva10 = Math.round(
    calculatedLignes.filter((l) => Number(l.taux_tva) === 10).reduce((sum, l) => sum + l.total_tva, 0) * 100
  ) / 100;
  const tva7 = Math.round(
    calculatedLignes.filter((l) => Number(l.taux_tva) === 7).reduce((sum, l) => sum + l.total_tva, 0) * 100
  ) / 100;
  const totalTva = Math.round((tva20 + tva10 + tva7) * 100) / 100;
  const totalTtc = Math.round((totalHt + totalTva) * 100) / 100;

  const handleSaveWithState = async (targetState: DocumentState) => {
    if (!selectedSupplier) {
      alert('Veuillez sélectionner un fournisseur.');
      return;
    }
    if (lignes.length === 0) {
      alert('Veuillez ajouter au moins une ligne d’article.');
      return;
    }

    try {
      setIsSaving(true);
      await onSave({
        numero: numero.trim() || undefined,
        fournisseur_id: selectedSupplier.id,
        fournisseur_nom: selectedSupplier.nom,
        fournisseur_ice: selectedSupplier.ice,
        date_facture: dateFacture,
        date_echeance: dateEcheance || undefined,
        mode_reglement: modeReglement,
        notes,
        etat: targetState,
        total_ht: totalHt,
        tva_20: tva20,
        tva_10: tva10,
        tva_7: tva7,
        total_tva: totalTva,
        total_ttc: totalTtc,
        lignes: calculatedLignes,
      });
    } catch (err: any) {
      alert(err?.message || 'Erreur lors de l’enregistrement de la facture fournisseur');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
            title="Retour"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              {factureToEdit ? `Modifier la Facture Fournisseur ${factureToEdit.numero}` : 'Nouvelle Facture d’Achat Fournisseur'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Saisie des achats & approvisionnements avec ventilation TVA et lettrage fournisseur
            </p>
          </div>
        </div>

        {factureToEdit?.etat && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">État actuel :</span>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                factureToEdit.etat === 'Validé'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : factureToEdit.etat === 'Brouillon'
                  ? 'bg-slate-100 text-slate-700 border-slate-300'
                  : 'bg-rose-50 text-rose-700 border-rose-300'
              }`}
            >
              {factureToEdit.etat}
            </span>
          </div>
        )}
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        {/* ========================================================================= */}
        {/* CARD 1: FOURNISSEUR & BILLING INFO */}
        {/* ========================================================================= */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              Informations Fournisseur & Référence
            </h3>
            {selectedSupplier && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                Solde Dû : <strong className="text-rose-600">{formatCurrency(selectedSupplier.solde_du || 0)}</strong>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Supplier Picker */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Fournisseur Partenaire <span className="text-rose-500">*</span>
              </label>
              <div className="relative mb-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={supplierQuery}
                  onChange={(e) => setSupplierQuery(e.target.value)}
                  placeholder="Rechercher fournisseur par nom, code ou ICE…"
                  className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                {visibleSuppliers.length === 0 && <option value="">Aucun fournisseur trouvé</option>}
                {visibleSuppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nom} {s.ville ? `(${s.ville})` : ''} - ICE: {s.ice || 'N/A'} - Solde: {formatCurrency(s.solde_du || 0)}
                  </option>
                ))}
              </select>
            </div>

            {/* Invoice Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                N° Facture d'Achat
              </label>
              <input
                type="text"
                placeholder="Ex: FF-2026/042 ou Réf Papier"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Laissez vide pour auto-génération</span>
            </div>

            {/* Date Facture */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Date de Facture *
              </label>
              <input
                type="date"
                required
                value={dateFacture}
                onChange={(e) => setDateFacture(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            {/* Date Echeance */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Date d'Échéance
              </label>
              <input
                type="date"
                value={dateEcheance}
                onChange={(e) => setDateEcheance(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            {/* Mode de Reglement Prevu */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mode de Règlement Prévu
              </label>
              <select
                value={modeReglement}
                onChange={(e) => setModeReglement(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value="Virement">Virement Bancaire</option>
                <option value="Chèque">Chèque Bancaire</option>
                <option value="Traite">Traite / Effet de commerce</option>
                <option value="Espèces">Espèces</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Notes & Observations
              </label>
              <input
                type="text"
                placeholder="Ex: Bon de commande N° 104, livraison conforme..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CARD 2: LINE ITEMS (ARTICLES D'ACHAT) */}
        {/* ========================================================================= */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                Lignes d'Achat & Marchandises
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Sélectionnez un article du catalogue ou personnalisez la désignation et le prix d'achat.
              </p>
            </div>

            <button
              type="button"
              onClick={addLine}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              Ajouter une ligne
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 divide-x divide-slate-200">
                  <th className="py-2.5 px-3 min-w-[260px]">Article / Désignation</th>
                  <th className="py-2.5 px-3 text-right w-24">Quantité</th>
                  <th className="py-2.5 px-3 text-right w-28">P.U. Achat HT</th>
                  <th className="py-2.5 px-3 text-center w-24">TVA (%)</th>
                  <th className="py-2.5 px-3 text-right w-20">Remise (%)</th>
                  <th className="py-2.5 px-3 text-right w-28">Total HT</th>
                  <th className="py-2.5 px-3 text-right w-28">Total TTC</th>
                  <th className="py-2.5 px-2 text-center w-16">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {calculatedLignes.map((line, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 divide-x divide-slate-200 transition">
                    {/* Product / Designation */}
                    <td className="p-2 space-y-1">
                      <ProductSearchSelect
                        products={produits}
                        value={line.produit_id}
                        onChange={(productId) => handleProductSelect(idx, productId)}
                        accent="blue"
                      />
                      <input
                        type="text"
                        value={line.designation}
                        onChange={(e) => {
                          const upd = [...lignes];
                          upd[idx].designation = e.target.value;
                          setLignes(upd);
                        }}
                        placeholder="Désignation détaillée..."
                        className="w-full px-2 py-1 text-xs rounded border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>

                    {/* Quantity */}
                    <td className="p-2 text-right">
                      <DecimalInput
                        value={line.quantite}
                        onValueChange={(val) => {
                          const upd = [...lignes];
                          upd[idx].quantite = val;
                          setLignes(upd);
                        }}
                        className="w-full text-right font-mono font-bold"
                      />
                    </td>

                    {/* Unit Price HT */}
                    <td className="p-2 text-right">
                      <DecimalInput
                        value={line.prix_achat_ht}
                        onValueChange={(val) => {
                          const upd = [...lignes];
                          upd[idx].prix_achat_ht = val;
                          setLignes(upd);
                        }}
                        className="w-full text-right font-mono"
                      />
                    </td>

                    {/* TVA Select */}
                    <td className="p-2 text-center">
                      <select
                        value={line.taux_tva}
                        onChange={(e) => {
                          const upd = [...lignes];
                          upd[idx].taux_tva = Number(e.target.value);
                          setLignes(upd);
                        }}
                        className="w-full px-2 py-1 text-xs rounded border border-slate-300 bg-white font-mono text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value={20}>20%</option>
                        <option value={10}>10%</option>
                        <option value={7}>7%</option>
                        <option value={0}>0%</option>
                      </select>
                    </td>

                    {/* Remise % */}
                    <td className="p-2 text-right">
                      <DecimalInput
                        value={line.remise_pct || 0}
                        onValueChange={(val) => {
                          const upd = [...lignes];
                          upd[idx].remise_pct = val;
                          setLignes(upd);
                        }}
                        className="w-full text-right font-mono"
                      />
                    </td>

                    {/* Total HT */}
                    <td className="p-2 text-right font-mono font-bold text-slate-800">
                      {formatCurrency(line.total_ht)}
                    </td>

                    {/* Total TTC */}
                    <td className="p-2 text-right font-mono font-bold text-indigo-900 bg-indigo-50/20">
                      {formatCurrency(line.total_ttc)}
                    </td>

                    {/* Actions */}
                    <td className="p-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => duplicateLine(idx)}
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded transition"
                          title="Dupliquer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          disabled={lignes.length <= 1}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition disabled:opacity-30"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CARD 3: TOTALS RECAP & WORD CONVERSION */}
        {/* ========================================================================= */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Amount in French Words */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Arrêtée la présente facture d'achat à la somme de :
            </span>
            <p className="text-sm font-semibold text-slate-800 italic leading-relaxed">
              "{numberToFrenchWords(totalTtc)}."
            </p>
          </div>

          {/* Totals Breakdown Table */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
              <span>Total HT Net :</span>
              <strong className="font-mono text-slate-900">{formatCurrency(totalHt)}</strong>
            </div>

            {tva7 > 0 && (
              <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                <span>Total TVA 7% :</span>
                <strong className="font-mono text-slate-900">{formatCurrency(tva7)}</strong>
              </div>
            )}

            {tva10 > 0 && (
              <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                <span>Total TVA 10% :</span>
                <strong className="font-mono text-slate-900">{formatCurrency(tva10)}</strong>
              </div>
            )}

            {tva20 > 0 && (
              <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                <span>Total TVA 20% :</span>
                <strong className="font-mono text-slate-900">{formatCurrency(tva20)}</strong>
              </div>
            )}

            <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
              <span>Total TVA Global :</span>
              <strong className="font-mono text-slate-900">{formatCurrency(totalTva)}</strong>
            </div>

            <div className="flex justify-between py-2 px-3 rounded-lg bg-indigo-50 border border-indigo-200 text-sm font-bold text-indigo-950">
              <span>Net à payer TTC :</span>
              <span className="font-mono font-black text-indigo-700 text-base">
                {formatCurrency(totalTtc)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            ← Annuler et revenir
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSaveWithState('Brouillon')}
              disabled={isSaving || !selectedSupplier}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition disabled:opacity-50"
            >
              <Clock className="w-4 h-4 text-slate-500" />
              Enregistrer comme Brouillon
            </button>

            <button
              type="button"
              onClick={() => handleSaveWithState('Validé')}
              disabled={isSaving || !selectedSupplier}
              className="flex items-center gap-1.5 px-6 py-2 text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Validation...' : 'Valider la Facture d’Achat'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
