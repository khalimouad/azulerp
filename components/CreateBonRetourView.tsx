'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Client, Produit, BonRetour, DocumentState } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { ProductSearchSelect } from '@/components/ProductSearchSelect';
import { ClientSearchSelect } from '@/components/ClientSearchSelect';
import { DecimalInput } from '@/components/DecimalInput';
import { useClientTariffs } from '@/hooks/use-client-tariffs';
import { resolveClientProductPricing } from '@/lib/client-pricing';
import {
  RotateCcw,
  ArrowLeft,
  Plus,
  Trash2,
  Package,
  Calendar,
  User,
  FileText,
  CheckCircle2,
  Clock,
} from 'lucide-react';

interface CreateBonRetourViewProps {
  clients: Client[];
  produits: Produit[];
  brToEdit?: BonRetour | null;
  onSave: (brData: any) => Promise<void>;
  onCancel: () => void;
}

export const CreateBonRetourView: React.FC<CreateBonRetourViewProps> = ({
  clients = [],
  produits = [],
  brToEdit,
  onSave,
  onCancel,
}) => {
  const [date, setDate] = useState<string>(
    brToEdit?.date || new Date().toISOString().split('T')[0]
  );
  const [selectedClientId, setSelectedClientId] = useState<number>(
    Number(brToEdit?.client_id || 0)
  );
  const [motif, setMotif] = useState<string>(
    brToEdit?.motif || 'Excédent chantier non utilisé (Retour pour déduction)'
  );
  const [motifCustom, setMotifCustom] = useState<string>('');
  const [notes, setNotes] = useState<string>(
    brToEdit?.notes || 'Articles retournés pour déduction sur la facture mensuelle.'
  );
  const [modeReglement, setModeReglement] = useState<string>(
    brToEdit?.mode_reglement || 'Déduction sur facture'
  );

  const [lignes, setLignes] = useState<
    Array<{
      produit_id: number;
      designation: string;
      groupe: string;
      quantite: number;
      prix_ht: number;
      taux_tva: number;
      remise_pct: number;
    }>
  >(() => {
    if (brToEdit && brToEdit.lignes && brToEdit.lignes.length > 0) {
      return brToEdit.lignes.map((l) => ({
        produit_id: l.produit_id || 0,
        designation: l.designation,
        groupe: l.groupe || '',
        quantite: l.quantite,
        prix_ht: l.prix_ht,
        taux_tva: l.taux_tva || 20,
        remise_pct: l.remise_pct || 0,
      }));
    }
    return [
      {
        produit_id: produits.length > 0 ? produits[0].id : 0,
        designation: produits.length > 0 ? produits[0].libelle : 'Article retourné',
        groupe: produits.length > 0 ? produits[0].groupe || '' : '',
        quantite: 1,
        prix_ht: produits.length > 0 ? produits[0].prix_ht : 0,
        taux_tva: produits.length > 0 ? produits[0].taux_tva || 20 : 20,
        remise_pct: 0,
      },
    ];
  });

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const selectedClient = clients.find((c) => Number(c.id) === Number(selectedClientId));
  const productsById = useMemo(
    () => new Map(produits.map((product) => [Number(product.id), product])),
    [produits]
  );
  const clientTariffs = useClientTariffs(selectedClientId);
  const lastAutoPricedClientRef = useRef<number>(Number(brToEdit?.client_id || 0));

  useEffect(() => {
    if (
      !selectedClientId ||
      clientTariffs.loading ||
      clientTariffs.clientId !== Number(selectedClientId) ||
      lastAutoPricedClientRef.current === Number(selectedClientId)
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
    lastAutoPricedClientRef.current = Number(selectedClientId);
  }, [clientTariffs.byProductId, clientTariffs.clientId, clientTariffs.loading, productsById, selectedClientId]);

  const handleLineChange = (
    index: number,
    field: keyof (typeof lignes)[number],
    value: string | number
  ) => {
    const newLignes = [...lignes];
    newLignes[index] = {
      ...newLignes[index],
      [field]: value,
    };
    setLignes(newLignes);
  };

  const handleProductSelect = (index: number, prodId: number) => {
    const prod = productsById.get(Number(prodId));
    if (!prod) {
      handleLineChange(index, 'produit_id', 0);
      return;
    }
    const pricing = resolveClientProductPricing(
      prod,
      clientTariffs.clientId === Number(selectedClientId)
        ? clientTariffs.byProductId.get(Number(prod.id))
        : undefined
    );

    const newLignes = [...lignes];
    newLignes[index] = {
      ...newLignes[index],
      produit_id: prod.id,
      designation: prod.libelle,
      groupe: prod.groupe || '',
      prix_ht: pricing.prix_ht,
      remise_pct: pricing.remise_pct,
      taux_tva: pricing.taux_tva,
    };
    setLignes(newLignes);
  };

  const addLine = () => {
    const defaultProd = produits.length > 0 ? produits[0] : null;
    const pricing = defaultProd
      ? resolveClientProductPricing(
          defaultProd,
          clientTariffs.clientId === Number(selectedClientId)
            ? clientTariffs.byProductId.get(Number(defaultProd.id))
            : undefined
        )
      : null;
    setLignes([
      ...lignes,
      {
        produit_id: defaultProd ? defaultProd.id : 0,
        designation: defaultProd ? defaultProd.libelle : 'Nouvel article retourné',
        groupe: defaultProd ? defaultProd.groupe || '' : '',
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

  const totals = lignes.reduce(
    (acc, l) => {
      const q = Number(l.quantite) || 0;
      const p = Number(l.prix_ht) || 0;
      const rem = Number(l.remise_pct) || 0;
      const tva = Number(l.taux_tva) || 20;

      const ht = q * p * (1 - rem / 100);
      const tvaVal = ht * (tva / 100);

      acc.totalQty += q;
      acc.totalHt += ht;
      acc.totalTva += tvaVal;
      return acc;
    },
    { totalQty: 0, totalHt: 0, totalTva: 0 }
  );

  const totalTtc = totals.totalHt + totals.totalTva;

  const handleSaveWithState = async (targetState: DocumentState) => {
    setErrorMsg('');
    if (!selectedClient) {
      setErrorMsg('Veuillez sélectionner un client valide.');
      return;
    }

    if (lignes.length === 0 || lignes.some((l) => !l.quantite || l.quantite <= 0)) {
      setErrorMsg('Toutes les lignes doivent avoir une quantité valide supérieure à 0.');
      return;
    }

    const finalMotif = motif === 'Autre motif' ? motifCustom || 'Retour marchandise' : motif;

    setIsSaving(true);
    try {
      await onSave({
        client_id: selectedClient.id,
        client_nom: selectedClient.nom,
        client_ice: selectedClient.ice,
        date,
        motif: finalMotif,
        mode_reglement: modeReglement,
        notes,
        etat: targetState,
        lignes: lignes.map((l) => ({
          produit_id: l.produit_id || null,
          designation: l.designation,
          groupe: l.groupe || '',
          quantite: Number(l.quantite),
          prix_ht: Number(l.prix_ht),
          taux_tva: Number(l.taux_tva),
          remise_pct: Number(l.remise_pct) || 0,
        })),
      });
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Erreur lors de l'enregistrement du Bon de Retour.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-12">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition"
            title="Retour"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-rose-600" />
              {brToEdit ? `Modifier le Bon de Retour ${brToEdit.numero}` : 'Nouveau Bon de Retour Marchandise (BR)'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Cycle de vie en 3 états (Brouillon, Validé, Annulé). Réintégration automatique en stock lors de la validation.
            </p>
          </div>
        </div>

        {brToEdit?.etat && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">État actuel :</span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
              brToEdit.etat === 'Validé'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : brToEdit.etat === 'Brouillon'
                ? 'bg-slate-100 text-slate-700 border-slate-300'
                : 'bg-rose-50 text-rose-700 border-rose-300'
            }`}>
              {brToEdit.etat}
            </span>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium flex items-center gap-2">
          <span>⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
        {/* Client & Metadata Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <User className="w-4 h-4 text-rose-600" />
            Informations Client & Motif du Retour
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Client concerné *
              </label>
              <ClientSearchSelect
                clients={clients}
                value={selectedClientId}
                onChange={(newId) => setSelectedClientId(newId)}
                accent="rose"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Date de retour *
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 font-mono"
                  required
                />
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Motif principal du retour *
              </label>
              <select
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 font-medium text-slate-800"
              >
                <option value="Excédent chantier non utilisé (Retour pour déduction)">
                  Excédent chantier non utilisé (Déduction)
                </option>
                <option value="Erreur de référence ou calibrage produit">
                  Erreur de référence ou calibrage
                </option>
                <option value="Marchandise non conforme / défectueuse">
                  Marchandise défectueuse / non conforme
                </option>
                <option value="Annulation commande client">Annulation commande</option>
                <option value="Autre motif">Autre motif personnalisé...</option>
              </select>
            </div>
          </div>

          {motif === 'Autre motif' && (
            <div className="pt-2">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Préciser le motif :
              </label>
              <input
                type="text"
                value={motifCustom}
                onChange={(e) => setMotifCustom(e.target.value)}
                placeholder="Indiquer la raison spécifique du retour..."
                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500"
              />
            </div>
          )}
        </div>

        {/* Lignes Articles Retournés */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Package className="w-4 h-4 text-rose-600" />
              Articles & Matériaux Réceptionnés en Retour ({lignes.length})
            </h2>
            <button
              type="button"
              onClick={addLine}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Ajouter une ligne de retour
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-semibold divide-x divide-slate-800">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3 min-w-[240px]">Article Catalogue</th>
                  <th className="py-2.5 px-3 min-w-[200px]">Désignation sur le BR</th>
                  <th className="py-2.5 px-3 w-24 text-right">Qté Retour</th>
                  <th className="py-2.5 px-3 w-28 text-right">P.U. HT (DH)</th>
                  <th className="py-2.5 px-3 w-20 text-center">TVA %</th>
                  <th className="py-2.5 px-3 w-20 text-center">Rem %</th>
                  <th className="py-2.5 px-3 w-32 text-right font-bold">Total HT Déduit</th>
                  <th className="py-2.5 px-2 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {lignes.map((ligne, idx) => {
                  const q = Number(ligne.quantite) || 0;
                  const p = Number(ligne.prix_ht) || 0;
                  const rem = Number(ligne.remise_pct) || 0;
                  const lineHt = q * p * (1 - rem / 100);

                  return (
                    <tr key={idx} className="divide-x divide-slate-100 hover:bg-rose-50/30 transition">
                      <td className="py-2 px-3 text-center text-slate-400 font-mono font-bold">
                        {idx + 1}
                      </td>

                      <td className="py-2 px-3">
                        <ProductSearchSelect
                          products={produits}
                          value={ligne.produit_id}
                          onChange={(productId) => handleProductSelect(idx, productId)}
                          accent="rose"
                          allowClear
                          clientPriceByProductId={clientTariffs.priceByProductId}
                        />
                      </td>

                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={ligne.designation}
                          onChange={(e) => handleLineChange(idx, 'designation', e.target.value)}
                          className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded-lg focus:ring-1 focus:ring-rose-500 font-medium"
                          placeholder="Désignation de la marchandise"
                        />
                      </td>

                      <td className="py-2 px-3">
                        <DecimalInput
                          value={ligne.quantite || 0}
                          min={0.01}
                          onValueChange={(value) => handleLineChange(idx, 'quantite', value)}
                          ariaLabel={`Quantité retour ligne ${idx + 1}`}
                          className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded-lg text-right font-bold text-rose-700 focus:ring-1 focus:ring-rose-500"
                          placeholder="1"
                        />
                      </td>

                      <td className="py-2 px-3">
                        <DecimalInput
                          value={ligne.prix_ht || 0}
                          min={0}
                          onValueChange={(value) => handleLineChange(idx, 'prix_ht', value)}
                          ariaLabel={`Prix HT retour ligne ${idx + 1}`}
                          className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded-lg text-right font-mono focus:ring-1 focus:ring-rose-500"
                          placeholder="0.00"
                        />
                        {ligne.produit_id && clientTariffs.byProductId.has(Number(ligne.produit_id)) ? (
                          <span className="mt-1 block text-[10px] font-bold text-rose-700">Tarif client appliqué</span>
                        ) : null}
                      </td>

                      <td className="py-2 px-3">
                        <select
                          value={ligne.taux_tva}
                          onChange={(e) => handleLineChange(idx, 'taux_tva', Number(e.target.value))}
                          className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded-lg text-center"
                        >
                          <option value={20}>20%</option>
                          <option value={10}>10%</option>
                          <option value={0}>0%</option>
                        </select>
                      </td>

                      <td className="py-2 px-3">
                        <DecimalInput
                          value={ligne.remise_pct || 0}
                          min={0}
                          max={100}
                          onValueChange={(value) => handleLineChange(idx, 'remise_pct', value)}
                          ariaLabel={`Remise retour ligne ${idx + 1}`}
                          className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded-lg text-center"
                        />
                      </td>

                      <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">
                        - {formatCurrency(lineHt)}
                      </td>

                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          disabled={lignes.length <= 1}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition disabled:opacity-30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Bottom & Totals */}
          <div className="p-4 bg-slate-50/50 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Notes / Remarques internes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Précisions sur l'état de la marchandise retournée, emballages..."
                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-rose-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Total Quantité retournée :</span>
                <span className="font-bold text-rose-700">-{totals.totalQty} unités</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total HT déduit (-) :</span>
                <span className="font-mono font-semibold text-rose-600">- {formatCurrency(totals.totalHt)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>TVA déduite (-) :</span>
                <span className="font-mono font-semibold text-rose-600">- {formatCurrency(totals.totalTva)}</span>
              </div>
              <div className="pt-2 border-t border-rose-200 flex justify-between items-center">
                <span className="font-bold text-rose-950 text-sm">TOTAL TTC RETOUR (-) :</span>
                <span className="font-mono font-black text-rose-700 text-base">
                  - {formatCurrency(totalTtc)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
          >
            ← Annuler
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleSaveWithState('Brouillon')}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition active:scale-95 disabled:opacity-50"
            >
              <Clock className="w-4 h-4 text-slate-500" />
              {isSaving ? 'Enregistrement...' : 'Enregistrer en Brouillon'}
            </button>

            <button
              type="button"
              onClick={() => handleSaveWithState('Validé')}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition active:scale-95 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSaving ? 'Validation...' : 'Valider le Bon de Retour'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
