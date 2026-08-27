'use client';

import React, { useState } from 'react';
import { Client, Produit, BonLivraisonLigne } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Plus, Trash2, Truck, X, Search, AlertCircle } from 'lucide-react';

interface CreateBlModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  produits: Produit[];
  preSelectedClientId?: number;
  onSave: (data: {
    client_id: number;
    client_nom: string;
    client_ice?: string;
    client_adresse?: string;
    client_ville?: string;
    date: string;
    chauffeur?: string;
    immatriculation?: string;
    notes?: string;
    lignes: Omit<BonLivraisonLigne, 'id' | 'bon_livraison_id'>[];
  }) => Promise<void>;
}

export const CreateBlModal: React.FC<CreateBlModalProps> = ({
  isOpen,
  onClose,
  clients,
  produits,
  preSelectedClientId,
  onSave,
}) => {
  const sortedClients = React.useMemo(() => {
    return [...clients].sort((a, b) => (a.nom || '').localeCompare(b.nom || '', 'fr', { sensitivity: 'base' }));
  }, [clients]);

  const sortedProduits = React.useMemo(() => {
    return [...produits].sort((a, b) => (a.libelle || '').localeCompare(b.libelle || '', 'fr', { sensitivity: 'base' }));
  }, [produits]);

  const [clientId, setClientId] = useState<number>(preSelectedClientId || (sortedClients[0]?.id ?? 0));
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [chauffeur, setChauffeur] = useState('');
  const [immatriculation, setImmatriculation] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [lignes, setLignes] = useState<
    Array<{
      produit_id?: number;
      designation: string;
      quantite: number;
      prix_ht: number;
      taux_tva: number;
    }>
  >([
    {
      produit_id: sortedProduits[0]?.id,
      designation: sortedProduits[0]?.libelle || '',
      quantite: 1,
      prix_ht: sortedProduits[0]?.prix_ht || 0,
      taux_tva: sortedProduits[0]?.taux_tva || 20,
    },
  ]);

  if (!isOpen) return null;

  const selectedClient = sortedClients.find((c) => c.id === clientId) || sortedClients[0];

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
    newLignes[index].quantite = qte;
    setLignes(newLignes);
  };

  const handlePriceChange = (index: number, price: number) => {
    const newLignes = [...lignes];
    newLignes[index].prix_ht = price;
    setLignes(newLignes);
  };

  const handleTvaChange = (index: number, tva: number) => {
    const newLignes = [...lignes];
    newLignes[index].taux_tva = tva;
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
      },
    ]);
  };

  const removeLine = (index: number) => {
    if (lignes.length <= 1) return;
    setLignes(lignes.filter((_, i) => i !== index));
  };

  // Calculations
  const calculated = lignes.map((l) => {
    const total_ht = l.quantite * l.prix_ht;
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
      alert('Veuillez vérifier les quantités des articles (quantité > 0).');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        client_id: selectedClient.id,
        client_nom: selectedClient.nom,
        client_ice: selectedClient.ice,
        client_adresse: selectedClient.adresse,
        client_ville: selectedClient.ville,
        date,
        chauffeur,
        immatriculation,
        notes,
        lignes: calculated,
      });
      onClose();
    } catch (err: any) {
      alert('Erreur lors de l\'enregistrement: ' + (err?.message || 'Erreur inconnue'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-emerald-800 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            <h3 className="text-base font-bold">Nouveau Bon de Livraison (BL)</h3>
          </div>
          <button onClick={onClose} className="text-emerald-200 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Client and Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Client / Destinataire *</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                {sortedClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom} {c.ville ? `(${c.ville})` : ''} {c.ice ? `- ICE: ${c.ice}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date de Livraison *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Chauffeur / Livreur</label>
              <input
                type="text"
                placeholder="Nom du chauffeur"
                value={chauffeur}
                onChange={(e) => setChauffeur(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Immatriculation Véhicule</label>
              <input
                type="text"
                placeholder="Ex: 12345-A-26"
                value={immatriculation}
                onChange={(e) => setImmatriculation(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Réf Commande</label>
              <input
                type="text"
                placeholder="Ex: BC Client N° 9821"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Line items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Articles & Marchandises à livrer
              </h4>
              <button
                type="button"
                onClick={addLine}
                className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
              >
                <Plus className="w-3.5 h-3.5" /> Ajouter une ligne
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-white font-semibold divide-x divide-slate-700">
                    <th className="p-2 min-w-[200px]">Article / Désignation</th>
                    <th className="p-2 text-right min-w-[80px]">Quantité</th>
                    <th className="p-2 text-right min-w-[90px]">P.U. HT</th>
                    <th className="p-2 text-center min-w-[70px]">TVA</th>
                    <th className="p-2 text-right min-w-[100px]">Total HT</th>
                    <th className="p-2 text-center w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {lignes.map((line, idx) => {
                    const selectedProd = produits.find((p) => p.id === line.produit_id);
                    const isLowStock = selectedProd && selectedProd.stock_actuel < line.quantite;

                    return (
                      <tr key={idx} className="divide-x divide-slate-100 bg-white">
                        <td className="p-1.5">
                          <select
                            value={line.produit_id}
                            onChange={(e) => handleProductChange(idx, Number(e.target.value))}
                            className="w-full p-1 text-xs bg-slate-50 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                          >
                            {sortedProduits.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.libelle} (Stock dispo: {p.stock_actuel} {p.unite})
                              </option>
                            ))}
                          </select>
                          {isLowStock && (
                            <span className="text-[10px] text-rose-600 font-medium flex items-center gap-1 mt-0.5">
                              ⚠️ Attention: Stock actuel ({selectedProd?.stock_actuel}) inférieur à la quantité demandée.
                            </span>
                          )}
                        </td>
                        <td className="p-1.5">
                          <input
                            type="number"
                            step="any"
                            min="0.01"
                            value={line.quantite}
                            onChange={(e) => handleQuantityChange(idx, parseFloat(e.target.value) || 0)}
                            className="w-full p-1 text-xs text-right bg-slate-50 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                          />
                        </td>
                        <td className="p-1.5">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={line.prix_ht}
                            onChange={(e) => handlePriceChange(idx, parseFloat(e.target.value) || 0)}
                            className="w-full p-1 text-xs text-right bg-slate-50 rounded border border-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                          />
                        </td>
                        <td className="p-1.5">
                          <select
                            value={line.taux_tva}
                            onChange={(e) => handleTvaChange(idx, Number(e.target.value))}
                            className="w-full p-1 text-xs text-center bg-slate-50 rounded border border-slate-300 focus:outline-none font-medium"
                          >
                            <option value="20">20%</option>
                            <option value="10">10%</option>
                            <option value="0">0%</option>
                          </select>
                        </td>
                        <td className="p-1.5 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(line.quantite * line.prix_ht, false)}
                        </td>
                        <td className="p-1 text-center">
                          <button
                            type="button"
                            onClick={() => removeLine(idx)}
                            disabled={lignes.length <= 1}
                            className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30"
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
          </div>

          {/* Totals Summary */}
          <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-400">
              * La validation de ce BL créera automatiquement un mouvement de sortie de stock et sera prêt pour la facturation.
            </div>
            <div className="text-right flex items-center gap-4">
              <div className="text-xs">
                <span className="text-slate-400">Total HT: </span>
                <span className="font-mono font-bold">{formatCurrency(totalHt)}</span>
              </div>
              <div className="text-xs">
                <span className="text-slate-400">Total TVA: </span>
                <span className="font-mono font-bold">{formatCurrency(totalTva)}</span>
              </div>
              <div className="text-base font-extrabold text-emerald-400 font-mono pl-3 border-l border-slate-700">
                TTC : {formatCurrency(totalTtc)}
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
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
              className="px-5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition active:scale-95 disabled:opacity-50"
            >
              {isSaving ? 'Enregistrement...' : 'Valider & Déstocker le BL'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
