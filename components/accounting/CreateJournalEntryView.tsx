'use client';

import React, { useState, useMemo } from 'react';
import { JournalEntry, JournalEntryLine, PlanAccount, AccountingJournal, JournalCode } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { OFFICIAL_PCGM_ACCOUNTS, MOROCCAN_JOURNALS } from '@/lib/moroccan-accounting';
import {
  ArrowLeft,
  BookOpen,
  Save,
  Plus,
  Trash2,
  Scale,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Search,
  FileText
} from 'lucide-react';

interface CreateJournalEntryViewProps {
  entryToEdit?: JournalEntry | null;
  accounts?: PlanAccount[];
  journals?: AccountingJournal[];
  onBack: () => void;
  onSave: (entry: Partial<JournalEntry>) => Promise<void>;
}

export const CreateJournalEntryView: React.FC<CreateJournalEntryViewProps> = ({
  entryToEdit,
  accounts = OFFICIAL_PCGM_ACCOUNTS,
  journals = MOROCCAN_JOURNALS,
  onBack,
  onSave,
}) => {
  const [numero, setNumero] = useState<string>(
    entryToEdit?.numero || `ECR-${Date.now().toString().slice(-6)}`
  );
  const [date, setDate] = useState<string>(
    entryToEdit?.date || new Date().toISOString().split('T')[0]
  );
  const [journalCode, setJournalCode] = useState<JournalCode>(
    entryToEdit?.journal_code || 'OD'
  );
  const [libelle, setLibelle] = useState<string>(
    entryToEdit?.libelle || ''
  );
  const [reference, setReference] = useState<string>(
    entryToEdit?.reference || ''
  );
  const [status, setStatus] = useState<'brouillon' | 'valide' | 'cloture'>(
    entryToEdit?.status || 'valide'
  );

  const initialLines: JournalEntryLine[] = useMemo(() => {
    if (entryToEdit?.lines && entryToEdit.lines.length > 0) {
      return entryToEdit.lines.map((l, idx) => ({
        id: l.id || idx + 1,
        compte_code: l.compte_code || l.account_code || '',
        compte_libelle: l.compte_libelle || l.account_label || '',
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
        libelle: l.libelle || '',
      }));
    }
    return [
      { id: 1, compte_code: '3421', compte_libelle: 'Clients', debit: 0, credit: 0 },
      { id: 2, compte_code: '7111', compte_libelle: 'Ventes de marchandises au Maroc', debit: 0, credit: 0 },
    ];
  }, [entryToEdit]);

  const [lines, setLines] = useState<JournalEntryLine[]>(initialLines);
  const [isSaving, setIsSaving] = useState(false);

  // Totals & Balance calculations
  const totalDebit = useMemo(() => {
    return lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  }, [lines]);

  const totalCredit = useMemo(() => {
    return lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  }, [lines]);

  const balanceDiff = Math.abs(Math.round((totalDebit - totalCredit) * 100) / 100);
  const isBalanced = balanceDiff < 0.05 && totalDebit > 0;

  // Account lookup dictionary
  const accountsMap = useMemo(() => {
    const map = new Map<string, string>();
    accounts.forEach((acc) => {
      map.set(acc.code, acc.libelle);
    });
    return map;
  }, [accounts]);

  // Handlers for lines
  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        compte_code: '5141',
        compte_libelle: 'Banques (trésorerie)',
        debit: 0,
        credit: 0,
      },
    ]);
  };

  const handleUpdateLine = (index: number, field: keyof JournalEntryLine, value: any) => {
    setLines((prev) => {
      const copy = [...prev];
      const current = { ...copy[index], [field]: value };

      if (field === 'compte_code') {
        const foundLibelle = accountsMap.get(value);
        if (foundLibelle) {
          current.compte_libelle = foundLibelle;
        }
      }

      copy[index] = current;
      return copy;
    });
  };

  const handleDeleteLine = (index: number) => {
    if (lines.length <= 2) {
      alert('Une écriture comptable en partie double doit comporter au moins 2 lignes.');
      return;
    }
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  // Quick Preset Templates
  const applyPresetTemplate = (type: 'vente' | 'achat' | 'reglement_client' | 'paiement_fournisseur' | 'virement') => {
    if (type === 'vente') {
      setJournalCode('VTE');
      setLibelle('Vente de marchandises selon facture');
      setLines([
        { id: 1, compte_code: '3421', compte_libelle: 'Clients', debit: 1200, credit: 0 },
        { id: 2, compte_code: '7111', compte_libelle: 'Ventes de marchandises au Maroc', debit: 0, credit: 1000 },
        { id: 3, compte_code: '4455', compte_libelle: 'État - TVA facturée (20%)', debit: 0, credit: 200 },
      ]);
    } else if (type === 'achat') {
      setJournalCode('ACH');
      setLibelle('Achat de marchandises / matières selon facture fournisseur');
      setLines([
        { id: 1, compte_code: '6111', compte_libelle: 'Achats de marchandises', debit: 1000, credit: 0 },
        { id: 2, compte_code: '34552', compte_libelle: 'État - TVA récupérable sur les charges (20%)', debit: 200, credit: 0 },
        { id: 3, compte_code: '4411', compte_libelle: 'Fournisseurs', debit: 0, credit: 1200 },
      ]);
    } else if (type === 'reglement_client') {
      setJournalCode('BNQ');
      setLibelle('Encaissement règlement client par virement / chèque');
      setLines([
        { id: 1, compte_code: '5141', compte_libelle: 'Banques (trésorerie active)', debit: 5000, credit: 0 },
        { id: 2, compte_code: '3421', compte_libelle: 'Clients (apurement créance)', debit: 0, credit: 5000 },
      ]);
    } else if (type === 'paiement_fournisseur') {
      setJournalCode('BNQ');
      setLibelle('Règlement facture fournisseur par virement bancaire');
      setLines([
        { id: 1, compte_code: '4411', compte_libelle: 'Fournisseurs (apurement dette)', debit: 4500, credit: 0 },
        { id: 2, compte_code: '5141', compte_libelle: 'Banques (décaissement)', debit: 0, credit: 4500 },
      ]);
    } else if (type === 'virement') {
      setJournalCode('OD');
      setLibelle('Virement interne de fonds (Banque vers Caisse)');
      setLines([
        { id: 1, compte_code: '5161', compte_libelle: 'Caisses (alimentation)', debit: 2000, credit: 0 },
        { id: 2, compte_code: '5141', compte_libelle: 'Banques (retrait d’espèces)', debit: 0, credit: 2000 },
      ]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!libelle.trim()) {
      alert('Veuillez renseigner le libellé de l’écriture.');
      return;
    }

    if (!isBalanced) {
      alert(
        `L’écriture n’est pas équilibrée ! Débit total (${totalDebit.toFixed(2)} DH) ≠ Crédit total (${totalCredit.toFixed(2)} DH). Écart = ${balanceDiff.toFixed(2)} DH`
      );
      return;
    }

    setIsSaving(true);
    try {
      const payload: Partial<JournalEntry> = {
        id: entryToEdit?.id,
        numero: numero.trim(),
        date,
        journal_code: journalCode,
        libelle: libelle.trim(),
        reference: reference.trim(),
        status,
        total_debit: Math.round(totalDebit * 100) / 100,
        total_credit: Math.round(totalCredit * 100) / 100,
        source_type: entryToEdit?.source_type || 'manuel',
        source_id: entryToEdit?.source_id,
        lines: lines.map((l, i) => ({
          id: i + 1,
          compte_code: l.compte_code,
          compte_libelle: l.compte_libelle,
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
          libelle: l.libelle || libelle.trim(),
        })),
      };

      await onSave(payload);
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
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à la Comptabilité</span>
          </button>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              {entryToEdit ? `Modifier Écriture : ${entryToEdit.numero}` : 'Nouvelle Écriture Comptable (Partie Double)'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Saisie au journal auxiliaire selon les normes du Plan Comptable Général Marocain (PCGM)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl transition"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving || !isBalanced}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50"
            title={!isBalanced ? 'L’écriture doit être équilibrée pour être enregistrée' : ''}
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Enregistrement...' : 'Valider et Comptabiliser'}
          </button>
        </div>
      </div>

      {/* Quick Template Selector */}
      <div className="bg-indigo-50/70 dark:bg-indigo-950/40 p-3.5 rounded-2xl border border-indigo-200 dark:border-indigo-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-200">
          <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Modèles d'Écritures Fréquentes :</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => applyPresetTemplate('vente')}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition"
          >
            Vente Facturée (7111 / 4455 / 3421)
          </button>
          <button
            type="button"
            onClick={() => applyPresetTemplate('achat')}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition"
          >
            Achat Facturé (6111 / 34552 / 4411)
          </button>
          <button
            type="button"
            onClick={() => applyPresetTemplate('reglement_client')}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition"
          >
            Encaissement Client (5141 / 3421)
          </button>
          <button
            type="button"
            onClick={() => applyPresetTemplate('paiement_fournisseur')}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition"
          >
            Paiement Fournisseur (4411 / 5141)
          </button>
          <button
            type="button"
            onClick={() => applyPresetTemplate('virement')}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition"
          >
            Virement Banque → Caisse
          </button>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Header Information */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <FileText className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Entête de l'Écriture</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                N° Pièce / Écriture *
              </label>
              <input
                type="text"
                required
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-indigo-700 dark:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Date de l'Écriture *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Journal Auxiliaire *
              </label>
              <select
                value={journalCode}
                onChange={(e) => setJournalCode(e.target.value as JournalCode)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {journals.map((j) => (
                  <option key={j.code} value={j.code}>
                    {j.code} - {j.nom}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Référence Pièce Justificative
              </label>
              <input
                type="text"
                placeholder="Ex: FAC-2026-089, CHQ-48291"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Libellé Général de l'Écriture *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Règlement facture fournisseur par virement Attijariwafa"
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Lines Table: Partie Double */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Lignes d'Imputations Comptables (Débit / Crédit)
                </h3>
                <p className="text-xs text-slate-400">
                  Comptes de classe 1 à 7 selon le Plan Comptable Général Marocain
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddLine}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 rounded-xl transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter une Ligne</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {lines.map((line, idx) => (
              <div
                key={line.id || idx}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-50/80 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/80"
              >
                {/* Account Code */}
                <div className="w-full sm:w-36">
                  <input
                    type="text"
                    required
                    placeholder="Compte (ex: 3421)"
                    value={line.compte_code || ''}
                    onChange={(e) => handleUpdateLine(idx, 'compte_code', e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-indigo-700 dark:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Account Label */}
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Intitulé du compte"
                    value={line.compte_libelle || ''}
                    onChange={(e) => handleUpdateLine(idx, 'compte_libelle', e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Line Libelle (Optional) */}
                <div className="w-full sm:w-44">
                  <input
                    type="text"
                    placeholder="Libellé spécifique (facultatif)"
                    value={line.libelle || ''}
                    onChange={(e) => handleUpdateLine(idx, 'libelle', e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Debit */}
                <div className="w-full sm:w-32">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                      D
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={line.debit || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        handleUpdateLine(idx, 'debit', val);
                        if (val > 0) handleUpdateLine(idx, 'credit', 0);
                      }}
                      className="w-full pl-7 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Credit */}
                <div className="w-full sm:w-32">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                      C
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={line.credit || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        handleUpdateLine(idx, 'credit', val);
                        if (val > 0) handleUpdateLine(idx, 'debit', 0);
                      }}
                      className="w-full pl-7 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Delete line */}
                <button
                  type="button"
                  onClick={() => handleDeleteLine(idx)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition self-end sm:self-center"
                  title="Supprimer la ligne"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Double Entry Live Balance Footer */}
          <div
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${
              isBalanced
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {isBalanced ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0" />
              )}
              <div>
                <p className="font-bold text-sm">
                  {isBalanced
                    ? '✓ Écriture Parfaitement Équilibrée'
                    : `⚠️ Écart Comptable de ${formatCurrency(balanceDiff)}`}
                </p>
                <p className="text-xs opacity-80">
                  {isBalanced
                    ? 'Le principe de la partie double est rigoureusement respecté (Total Débit = Total Crédit).'
                    : 'Le total du débit doit être strictement égal au total du crédit pour comptabiliser l’écriture.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 font-mono text-sm">
              <div>
                <span className="text-xs uppercase opacity-70 block">Total Débit</span>
                <span className="font-bold">{formatCurrency(totalDebit)}</span>
              </div>
              <div>
                <span className="text-xs uppercase opacity-70 block">Total Crédit</span>
                <span className="font-bold">{formatCurrency(totalCredit)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl transition"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSaving || !isBalanced}
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-600/20 transition active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Enregistrement en cours...' : 'Valider et Comptabiliser l’Écriture'}
          </button>
        </div>
      </form>
    </div>
  );
};
