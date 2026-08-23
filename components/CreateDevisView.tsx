'use client';

import React, { useState } from 'react';
import { Client, Produit, DevisLigne } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import {
  ArrowLeft,
  Plus,
  Trash2,
  FileSpreadsheet,
  Save,
  Calendar,
  User,
  Building,
} from 'lucide-react';

interface CreateDevisViewProps {
  clients: Client[];
  produits: Produit[];
  onBack: () => void;
  onSave: (data: {
    client_id: number;
    client_nom: string;
    date: string;
    date_validite: string;
    notes?: string;
    lignes: Omit<DevisLigne, 'id' | 'devis_id'>[];
  }) => Promise<void>;
}

export const CreateDevisView: React.FC<CreateDevisViewProps> = ({
  clients,
  produits,
  onBack,
  onSave,
}) => {
  const [clientId, setClientId] = useState<number>(clients[0]?.id ?? 0);
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [dateValidite, setDateValidite] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [lignes, setLignes] = useState<
    Array<{
      produit_id?: number;
      designation: string;
      quantite: number;
      prix_ht: number;
      taux_tva: number;
      remise_pct?: number;
    }>
  >([
    {
      produit_id: produits[0]?.id,
      designation: produits[0]?.libelle || '',
      quantite: 1,
      prix_ht: produits[0]?.prix_ht || 0,
      taux_tva: produits[0]?.taux_tva || 20,
      remise_pct: 0,
    },
  ]);

  const selectedClient = clients.find((c) => c.id === clientId) || clients[0];

  const handleProductChange = (index: number, prodId: number) => {
    const prod = produits.find((p) => p.id === prodId);
    if (!prod) return;
    const newLignes = [...lignes];
    newLignes[index] = {
      ...newLignes[index],
      produit_id: prod.id,
      designation: prod.libelle,
      prix_ht: prod.prix_ht,
      taux_tva: prod.taux_tva,
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

  const handleDesignationChange = (index: number, val: string) => {
    const newLignes = [...lignes];
    newLignes[index].designation = val;
    setLignes(newLignes);
  };

  const addLine = () => {
    const firstProd = produits[0];
    setLignes([
      ...lignes,
      {
        produit_id: firstProd?.id,
        designation: firstProd?.libelle || '',
        quantite: 1,
        prix_ht: firstProd?.prix_ht || 0,
        taux_tva: firstProd?.taux_tva || 20,
        remise_pct: 0,
      },
    ]);
  };

  const removeLine = (index: number) => {
    if (lignes.length <= 1) return;
    setLignes(lignes.filter((_, i) => i !== index));
  };

  const calculated = lignes.map((l) => {
    const brut = l.quantite * l.prix_ht;
    const rem = brut * ((l.remise_pct || 0) / 100);
    const total_ht = brut - rem;
    const total_tva = total_ht * (l.taux_tva / 100);
    const total_ttc = total_ht + total_tva;
    return { ...l, total_ht, total_tva, total_ttc };
  });

  const totalHt = calculated.reduce((sum, l) => sum + l.total_ht, 0);
  const totalTva = calculated.reduce((sum, l) => sum + l.total_tva, 0);
  const totalTtc = totalHt + totalTva;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) {
      alert('Veuillez sélectionner un client.');
      return;
    }
    if (lignes.length === 0 || lignes.some((l) => l.quantite <= 0)) {
      alert('Veuillez vérifier les quantités des articles.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        client_id: selectedClient.id,
        client_nom: selectedClient.nom,
        date,
        date_validite: dateValidite,
        notes,
        lignes: calculated,
      });
      onBack();
    } catch (err: any) {
      alert('Erreur lors de l’enregistrement: ' + (err?.message || 'Erreur inconnue'));
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
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour aux Devis</span>
          </button>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              Nouveau Devis / Offre de Prix
            </h2>
            <p className="text-xs text-slate-500">
              Proposition commerciale chiffrée avec date d'échéance et conditions de validité
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
            {isSaving ? 'Enregistrement...' : 'Enregistrer le Devis'}
          </button>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <User className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Client & Validité du Devis
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Client / Prospect *
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom} {c.ville ? `(${c.ville})` : ''} {c.ice ? `- ICE: ${c.ice}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Date d'Émission *
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Valable Jusqu'au *
                </label>
                <input
                  type="date"
                  required
                  value={dateValidite}
                  onChange={(e) => setDateValidite(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Notes, Délais & Modalités de Paiement
            </label>
            <input
              type="text"
              placeholder="Ex: Validité de l'offre 30 jours - Livraison sous 48h après validation"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Lines */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Articles & Prestations ({lignes.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={addLine}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter une ligne</span>
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-semibold divide-x divide-slate-800">
                  <th className="p-3 w-10 text-center">#</th>
                  <th className="p-3 min-w-[260px]">Article / Référence Catalogue</th>
                  <th className="p-3 min-w-[200px]">Désignation</th>
                  <th className="p-3 w-24 text-right">Qté</th>
                  <th className="p-3 w-28 text-right">P.U. HT (DH)</th>
                  <th className="p-3 w-20 text-center">TVA %</th>
                  <th className="p-3 w-20 text-center">Rem %</th>
                  <th className="p-3 w-32 text-right font-bold">Total HT</th>
                  <th className="p-3 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {lignes.map((l, index) => (
                  <tr key={index} className="divide-x divide-slate-100 hover:bg-slate-50/70 transition">
                    <td className="p-3 text-center text-slate-400 font-mono font-bold">{index + 1}</td>
                    <td className="p-2.5">
                      <select
                        value={l.produit_id || ''}
                        onChange={(e) => handleProductChange(index, Number(e.target.value))}
                        className="w-full p-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-900"
                      >
                        {produits.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.code} - {p.libelle}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2.5">
                      <input
                        type="text"
                        value={l.designation}
                        onChange={(e) => handleDesignationChange(index, e.target.value)}
                        className="w-full p-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        required
                        value={l.quantite}
                        onChange={(e) => handleQuantityChange(index, parseFloat(e.target.value) || 0)}
                        className="w-full p-2 text-xs font-mono font-bold text-right bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-indigo-900"
                      />
                    </td>
                    <td className="p-2.5">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        required
                        value={l.prix_ht}
                        onChange={(e) => handlePriceChange(index, parseFloat(e.target.value) || 0)}
                        className="w-full p-2 text-xs font-mono text-right bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="p-2.5">
                      <select
                        value={l.taux_tva}
                        onChange={(e) => handleTvaChange(index, Number(e.target.value))}
                        className="w-full p-2 text-xs font-mono text-center bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="20">20%</option>
                        <option value="10">10%</option>
                        <option value="0">0%</option>
                      </select>
                    </td>
                    <td className="p-2.5">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        max="100"
                        value={l.remise_pct || 0}
                        onChange={(e) => handleRemiseChange(index, parseFloat(e.target.value) || 0)}
                        className="w-full p-2 text-xs font-mono text-center bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900 text-sm">
                      {formatCurrency(calculated[index]?.total_ht || 0)}
                    </td>
                    <td className="p-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        disabled={lignes.length <= 1}
                        className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-30 rounded-md hover:bg-red-50 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end pt-4 border-t border-slate-100">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs w-full sm:w-80">
              <div className="flex justify-between text-slate-700">
                <span>Total HT :</span>
                <span className="font-mono font-bold text-sm">{formatCurrency(totalHt)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total TVA :</span>
                <span className="font-mono font-semibold">{formatCurrency(totalTva)}</span>
              </div>
              <div className="pt-2 border-t border-slate-300 flex justify-between items-center text-sm sm:text-base font-black text-slate-950">
                <span>TOTAL DEVIS (TTC) :</span>
                <span className="font-mono text-indigo-700">{formatCurrency(totalTtc)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition"
          >
            ← Annuler et revenir aux devis
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Enregistrement...' : 'Enregistrer le Devis'}
          </button>
        </div>
      </form>
    </div>
  );
};
