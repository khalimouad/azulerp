'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Client, Produit, BonLivraisonLigne, BonLivraison, DocumentState } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { ProductSearchSelect } from '@/components/ProductSearchSelect';
import { DecimalInput } from '@/components/DecimalInput';
import { useClientTariffs } from '@/hooks/use-client-tariffs';
import { resolveClientProductPricing } from '@/lib/client-pricing';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Truck,
  CheckCircle2,
  Calendar,
  User,
  Building,
  Clock,
} from 'lucide-react';

interface CreateBlViewProps {
  clients: Client[];
  produits: Produit[];
  preSelectedClientId?: number;
  blToEdit?: BonLivraison | null;
  onBack: () => void;
  onSave: (data: {
    client_id: number;
    client_nom: string;
    client_ice?: string;
    client_adresse?: string;
    client_ville?: string;
    date: string;
    notes?: string;
    mode_reglement?: string;
    etat: DocumentState;
    total_ht: number;
    tva_20: number;
    tva_10: number;
    total_tva: number;
    total_ttc: number;
    montant_brut: number;
    lignes: Omit<BonLivraisonLigne, 'id' | 'bon_livraison_id'>[];
  }) => Promise<void>;
}

export const CreateBlView: React.FC<CreateBlViewProps> = ({
  clients,
  produits,
  preSelectedClientId,
  blToEdit,
  onBack,
  onSave,
}) => {
  const [clientId, setClientId] = useState<number>(
    Number(blToEdit?.client_id || preSelectedClientId || 0)
  );
  const [date, setDate] = useState<string>(
    blToEdit?.date || new Date().toISOString().split('T')[0]
  );
  const [modeReglement, setModeReglement] = useState<string>(blToEdit?.mode_reglement || 'Chèque');
  const [notes, setNotes] = useState(blToEdit?.notes || '');
  const [isSaving, setIsSaving] = useState(false);

  const [lignes, setLignes] = useState<
    Array<{
      produit_id?: number;
      designation: string;
      groupe?: string;
      quantite: number;
      prix_ht: number;
      taux_tva: number;
      remise_pct?: number;
    }>
  >(() => {
    if (blToEdit && blToEdit.lignes && blToEdit.lignes.length > 0) {
      return blToEdit.lignes.map((l) => ({
        produit_id: l.produit_id,
        designation: l.designation,
        groupe: l.groupe || 'GENERAL',
        quantite: l.quantite,
        prix_ht: l.prix_ht,
        taux_tva: l.taux_tva || 20,
        remise_pct: l.remise_pct || 0,
      }));
    }
    return [
      {
        produit_id: produits[0]?.id,
        designation: produits[0]?.libelle || 'Article standard',
        groupe: produits[0]?.groupe || 'GENERAL',
        quantite: 1,
        prix_ht: produits[0]?.prix_ht || 0,
        taux_tva: produits[0]?.taux_tva || 20,
        remise_pct: 0,
      },
    ];
  });

  const selectedClient = clients.find((c) => Number(c.id) === Number(clientId));
  const productsById = useMemo(
    () => new Map(produits.map((product) => [Number(product.id), product])),
    [produits]
  );
  const clientTariffs = useClientTariffs(clientId);
  const lastAutoPricedClientRef = useRef<number>(Number(blToEdit?.client_id || 0));

  useEffect(() => {
    if (
      !clientId ||
      clientTariffs.loading ||
      clientTariffs.clientId !== Number(clientId) ||
      lastAutoPricedClientRef.current === Number(clientId)
    ) return;

    setLignes((currentLines) => currentLines.map((line) => {
      const product = productsById.get(Number(line.produit_id));
      if (!product) return line;
      const pricing = resolveClientProductPricing(
        product,
        clientTariffs.byProductId.get(Number(product.id))
      );
      return {
        ...line,
        prix_ht: pricing.prix_ht,
        remise_pct: pricing.remise_pct,
        taux_tva: pricing.taux_tva,
      };
    }));
    lastAutoPricedClientRef.current = Number(clientId);
  }, [clientId, clientTariffs.byProductId, clientTariffs.clientId, clientTariffs.loading, productsById]);

  const handleProductChange = (index: number, prodId: number) => {
    const prod = productsById.get(Number(prodId));
    if (!prod) return;
    const pricing = resolveClientProductPricing(
      prod,
      clientTariffs.clientId === Number(clientId)
        ? clientTariffs.byProductId.get(Number(prod.id))
        : undefined
    );
    const newLignes = [...lignes];
    newLignes[index] = {
      ...newLignes[index],
      produit_id: prod.id,
      designation: prod.libelle,
      groupe: prod.groupe || 'GENERAL',
      prix_ht: pricing.prix_ht,
      remise_pct: pricing.remise_pct,
      taux_tva: pricing.taux_tva,
    };
    setLignes(newLignes);
  };

  const handleQuantityChange = (index: number, qte: number) => {
    const newLignes = [...lignes];
    newLignes[index].quantite = Math.max(0, qte);
    setLignes(newLignes);
  };

  const handlePriceChange = (index: number, price: number) => {
    const newLignes = [...lignes];
    newLignes[index].prix_ht = Math.max(0, price);
    setLignes(newLignes);
  };

  const handleTvaChange = (index: number, tva: number) => {
    const newLignes = [...lignes];
    newLignes[index].taux_tva = tva;
    setLignes(newLignes);
  };

  const handleRemiseChange = (index: number, rem: number) => {
    const newLignes = [...lignes];
    newLignes[index].remise_pct = Math.min(100, Math.max(0, rem));
    setLignes(newLignes);
  };

  const handleDesignationChange = (index: number, desig: string) => {
    const newLignes = [...lignes];
    newLignes[index].designation = desig;
    setLignes(newLignes);
  };

  const addLine = () => {
    const product = produits[0];
    const pricing = product
      ? resolveClientProductPricing(
          product,
          clientTariffs.clientId === Number(clientId)
            ? clientTariffs.byProductId.get(Number(product.id))
            : undefined
        )
      : null;
    setLignes([
      ...lignes,
      {
        produit_id: product?.id,
        designation: product?.libelle || 'Nouvel article',
        groupe: product?.groupe || 'GENERAL',
        quantite: 1,
        prix_ht: pricing?.prix_ht || 0,
        taux_tva: pricing?.taux_tva ?? 20,
        remise_pct: pricing?.remise_pct || 0,
      },
    ]);
  };

  const removeLine = (index: number) => {
    if (lignes.length <= 1) return;
    setLignes(lignes.filter((_, i) => i !== index));
  };

  // Calculations
  const calculated = lignes.map((l) => {
    const total_ht = l.quantite * l.prix_ht * (1 - (l.remise_pct || 0) / 100);
    const total_tva = total_ht * (l.taux_tva / 100);
    const total_ttc = total_ht + total_tva;
    return { ...l, total_ht, total_tva, total_ttc };
  });

  const totalHt = calculated.reduce((acc, curr) => acc + curr.total_ht, 0);
  const totalTva = calculated.reduce((acc, curr) => acc + curr.total_tva, 0);
  const totalTtc = totalHt + totalTva;
  const tva10 = calculated
    .filter((line) => Number(line.taux_tva) === 10)
    .reduce((sum, line) => sum + line.total_tva, 0);
  const tva20 = calculated
    .filter((line) => Number(line.taux_tva) === 20)
    .reduce((sum, line) => sum + line.total_tva, 0);
  const montantBrut = lignes.reduce((sum, line) => sum + line.quantite * line.prix_ht, 0);

  const handleSaveWithState = async (targetState: DocumentState) => {
    if (!selectedClient) {
      alert('Veuillez sélectionner un client.');
      return;
    }
    if (lignes.length === 0) {
      alert('Veuillez ajouter au moins une ligne d’article.');
      return;
    }

    try {
      setIsSaving(true);
      await onSave({
        client_id: selectedClient.id,
        client_nom: selectedClient.nom,
        client_ice: selectedClient.ice,
        client_adresse: selectedClient.adresse,
        client_ville: selectedClient.ville,
        date,
        mode_reglement: modeReglement,
        notes,
        etat: targetState,
        total_ht: totalHt,
        tva_20: tva20,
        tva_10: tva10,
        total_tva: totalTva,
        total_ttc: totalTtc,
        montant_brut: montantBrut,
        lignes: calculated,
      });
    } catch (err: any) {
      alert(err?.message || 'Erreur lors de l’enregistrement');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
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
              <Truck className="w-5 h-5 text-emerald-600" />
              {blToEdit ? `Modifier le Bon de Livraison ${blToEdit.numero}` : 'Nouveau Bon de Livraison (BL)'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Gestion du cycle de vie du document (3 états : Brouillon, Validé, Annulé)
            </p>
          </div>
        </div>

        {blToEdit?.etat && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">État actuel :</span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
              blToEdit.etat === 'Validé'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : blToEdit.etat === 'Brouillon'
                ? 'bg-slate-100 text-slate-700 border-slate-300'
                : 'bg-rose-50 text-rose-700 border-rose-300'
            }`}>
              {blToEdit.etat}
            </span>
          </div>
        )}
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        {/* Client & Logistics Details Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <User className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Informations Client & Conditions de Livraison
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Client Picker */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Client Destinataire <span className="text-rose-500">*</span>
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(Number(e.target.value))}
                required
                className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value={0} disabled>Sélectionner un client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom} {c.ice ? `(ICE: ${c.ice})` : ''} - {c.ville || 'Maroc'}
                  </option>
                ))}
              </select>
              {selectedClient && (
                <div className="mt-2 p-2.5 bg-slate-50 rounded-lg text-xs text-slate-600 border border-slate-200 grid grid-cols-2 gap-2">
                  <div><strong>ICE :</strong> {selectedClient.ice || 'Non spécifié'}</div>
                  <div><strong>Téléphone :</strong> {selectedClient.telephone || 'Non renseigné'}</div>
                  <div className="col-span-2"><strong>Adresse :</strong> {selectedClient.adresse || 'N/A'}, {selectedClient.ville}</div>
                </div>
              )}
            </div>

            {/* Date & Règlement */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Date de Livraison <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mode de Règlement Prévu
                </label>
                <select
                  value={modeReglement}
                  onChange={(e) => setModeReglement(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Chèque">Chèque</option>
                  <option value="Virement">Virement bancaire</option>
                  <option value="Traite">Effet / Traite</option>
                  <option value="Espèces">Espèces</option>
                  <option value="Carte Bancaire">Carte Bancaire</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notes / Réf Commande */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Notes & Références de Commande (Bon de Commande Client, Instructions)
            </label>
            <input
              type="text"
              placeholder="Ex: Réf BC Client N° 2026/982 - Chantier Marrakech Ouest"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Line Items Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Articles & Marchandises à Livrer ({lignes.length})
              </h3>
            </div>
            <button
              type="button"
              id="bl-add-line-btn"
              onClick={addLine}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter une ligne</span>
            </button>
          </div>

          {/* Lines Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-semibold divide-x divide-slate-800">
                  <th className="p-3 w-10 text-center">#</th>
                  <th className="p-3 min-w-[260px]">Article / Référence Catalogue</th>
                  <th className="p-3 min-w-[200px]">Désignation sur le BL</th>
                  <th className="p-3 w-24 text-right">Qté</th>
                  <th className="p-3 w-28 text-right">P.U. HT (DH)</th>
                  <th className="p-3 w-20 text-center">TVA %</th>
                  <th className="p-3 w-20 text-center">Rem %</th>
                  <th className="p-3 w-32 text-right font-bold">Total HT</th>
                  <th className="p-3 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {lignes.map((l, index) => {
                  const currentProd = productsById.get(Number(l.produit_id));
                  return (
                    <tr key={index} className="divide-x divide-slate-100 hover:bg-slate-50/70 transition">
                      <td className="p-3 text-center text-slate-400 font-mono font-bold">
                        {index + 1}
                      </td>

                      {/* Product Selector */}
                      <td className="p-2.5">
                        <ProductSearchSelect
                          products={produits}
                          value={l.produit_id}
                          onChange={(productId) => handleProductChange(index, productId)}
                          accent="emerald"
                          clientPriceByProductId={clientTariffs.priceByProductId}
                        />
                        {currentProd && (
                          <div className="text-[10px] text-slate-400 mt-1 pl-1">
                            Dispo en stock : <strong className={currentProd.stock_actuel <= currentProd.stock_min ? 'text-amber-600' : 'text-emerald-700'}>{currentProd.stock_actuel} {currentProd.unite || 'U'}</strong>
                          </div>
                        )}
                      </td>

                      {/* Designation */}
                      <td className="p-2.5">
                        <input
                          type="text"
                          value={l.designation}
                          onChange={(e) => handleDesignationChange(index, e.target.value)}
                          className="w-full p-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>

                      {/* Quantity */}
                      <td className="p-2.5">
                        <DecimalInput
                          required
                          value={l.quantite}
                          min={0.01}
                          onValueChange={(value) => handleQuantityChange(index, value)}
                          ariaLabel={`Quantité ligne ${index + 1}`}
                          className="w-full p-2 text-xs font-mono font-bold text-right bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-emerald-800"
                        />
                      </td>

                      {/* Unit Price HT */}
                      <td className="p-2.5">
                        <DecimalInput
                          required
                          value={l.prix_ht}
                          min={0}
                          onValueChange={(value) => handlePriceChange(index, value)}
                          ariaLabel={`Prix HT ligne ${index + 1}`}
                          className="w-full p-2 text-xs font-mono text-right bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        {l.produit_id && clientTariffs.byProductId.has(Number(l.produit_id)) ? (
                          <span className="mt-1 block text-[10px] font-bold text-emerald-700">Tarif client appliqué</span>
                        ) : null}
                      </td>

                      {/* TVA */}
                      <td className="p-2.5">
                        <select
                          value={l.taux_tva}
                          onChange={(e) => handleTvaChange(index, Number(e.target.value))}
                          className="w-full p-2 text-xs font-mono text-center bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="20">20%</option>
                          <option value="10">10%</option>
                          <option value="0">0%</option>
                        </select>
                      </td>

                      {/* Remise % */}
                      <td className="p-2.5">
                        <DecimalInput
                          value={l.remise_pct || 0}
                          min={0}
                          max={100}
                          onValueChange={(value) => handleRemiseChange(index, value)}
                          ariaLabel={`Remise ligne ${index + 1}`}
                          className="w-full p-2 text-xs font-mono text-center bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>

                      {/* Line Total HT */}
                      <td className="p-3 text-right font-mono font-bold text-slate-900 text-sm">
                        {formatCurrency(calculated[index]?.total_ht || 0)}
                      </td>

                      {/* Delete Action */}
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeLine(index)}
                          disabled={lignes.length <= 1}
                          className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-30 rounded-md hover:bg-red-50 transition"
                          title="Supprimer la ligne"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom Summary Panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
            <div className="text-xs text-slate-500 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 text-slate-800 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Cycle de vie du Bon de Livraison (3 États)</span>
              </div>
              <ul className="list-disc pl-4 space-y-1 text-slate-600">
                <li><strong className="text-slate-800">Brouillon (Draft) :</strong> Document modifiable à volonté sans impact sur le stock d’inventaire.</li>
                <li><strong className="text-emerald-800">Validé :</strong> Décrémente le stock réel et disponible pour la facturation.</li>
                <li><strong className="text-rose-800">Annulé :</strong> Annule la livraison et réintègre le stock. Peut être repassé en Brouillon pour édition.</li>
              </ul>
            </div>

            {/* Financial Totals */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-700">
                <span>Total Marchandises HT :</span>
                <span className="font-mono font-bold text-sm">{formatCurrency(totalHt)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Montant TVA :</span>
                <span className="font-mono font-semibold">{formatCurrency(totalTva)}</span>
              </div>
              <div className="pt-2 border-t border-slate-300 flex justify-between items-center text-sm sm:text-base font-black text-slate-900">
                <span>TOTAL DU BL (TTC) :</span>
                <span className="font-mono text-emerald-700">{formatCurrency(totalTtc)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions with Draft and Validate options */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            ← Annuler et revenir
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleSaveWithState('Brouillon')}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition active:scale-95 disabled:opacity-50"
            >
              <Clock className="w-4 h-4 text-slate-500" />
              {isSaving ? 'Enregistrement...' : 'Enregistrer en Brouillon'}
            </button>

            <button
              type="button"
              onClick={() => handleSaveWithState('Validé')}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition active:scale-95 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSaving ? 'Validation...' : 'Valider le Bon de Livraison'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
