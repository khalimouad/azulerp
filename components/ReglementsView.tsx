'use client';

import React, { useState, useMemo } from 'react';
import { Reglement } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, CreditCard, Search, Trash2, CheckCircle2 } from 'lucide-react';

interface ReglementsViewProps {
  reglements: Reglement[];
  onOpenNewPayment: () => void;
  onDeleteReglement: (id: number) => void;
}

export const ReglementsView: React.FC<ReglementsViewProps> = ({
  reglements,
  onOpenNewPayment,
  onDeleteReglement,
}) => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return reglements.filter((r) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        r.client_nom?.toLowerCase().includes(q) ||
        (r.facture_numero || r.piece_numero || '')?.toLowerCase().includes(q) ||
        r.reference_paiement?.toLowerCase().includes(q) ||
        r.banque?.toLowerCase().includes(q)
      );
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id - a.id);
  }, [reglements, search]);

  const totalEncaisse = useMemo(() => {
    return filtered.reduce((sum, r) => sum + r.montant, 0);
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Journal des Règlements & Encaissements
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {filtered.length} encaissements
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Suivi des paiements reçus par chèque, virement bancaire, traite ou espèces
          </p>
        </div>

        <button
          onClick={onOpenNewPayment}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          + Encaisser un Règlement
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3 border-b border-slate-200 flex items-center justify-between">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher client, N° facture, chèque..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 text-slate-800 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="text-xs font-semibold text-slate-700">
            Total encaissé affiché :{' '}
            <span className="font-mono text-emerald-700 text-sm font-bold">
              {formatCurrency(totalEncaisse)}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white font-semibold divide-x divide-slate-700">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Client / Débiteur</th>
                <th className="py-2.5 px-3">Pièce Rattachée</th>
                <th className="py-2.5 px-3 text-right">Montant Encaissé</th>
                <th className="py-2.5 px-3">Mode</th>
                <th className="py-2.5 px-3">Banque & Réf</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Aucun règlement enregistré.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition divide-x divide-slate-100 even:bg-slate-50/40">
                    <td className="py-2 px-3 text-slate-600 whitespace-nowrap">{formatDate(r.date)}</td>
                    <td className="py-2 px-3 font-semibold text-slate-900">{r.client_nom}</td>
                    <td className="py-2 px-3 font-mono text-blue-700 font-medium">
                      {r.facture_numero || r.piece_numero || 'Règlement compte client'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                      {formatCurrency(r.montant)}
                    </td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-800">
                        {r.mode || r.mode_reglement || 'Virement'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-600">
                      {r.banque ? `${r.banque} ` : ''}
                      {r.reference_paiement ? `(N° ${r.reference_paiement})` : ''}
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      <button
                        onClick={() => {
                          if (confirm(`Supprimer ce règlement de ${formatCurrency(r.montant)} ?`)) {
                            onDeleteReglement(r.id);
                          }
                        }}
                        className="p-1 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded transition"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white font-bold divide-x divide-slate-800 text-xs">
                <td colSpan={3} className="py-2.5 px-3 text-right uppercase">
                  Total Général Règlements :
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-emerald-400">
                  {formatCurrency(totalEncaisse)}
                </td>
                <td colSpan={3} className="py-2.5 px-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
