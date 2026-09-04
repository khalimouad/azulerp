'use client';

import React, { useState, useEffect } from 'react';
import { FixedAsset, PlanAccount } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { OFFICIAL_PCGM_ACCOUNTS } from '@/lib/moroccan-accounting';
import {
  ArrowLeft,
  TrendingUp,
  Save,
  Building,
  Calendar,
  Calculator,
  FileText,
  DollarSign
} from 'lucide-react';

interface CreateFixedAssetViewProps {
  assetToEdit?: FixedAsset | null;
  accounts?: PlanAccount[];
  onBack: () => void;
  onSave: (asset: Partial<FixedAsset>) => Promise<void>;
}

export const CreateFixedAssetView: React.FC<CreateFixedAssetViewProps> = ({
  assetToEdit,
  accounts = OFFICIAL_PCGM_ACCOUNTS,
  onBack,
  onSave,
}) => {
  const [code, setCode] = useState<string>(
    assetToEdit?.code || `IMM-${Date.now().toString().slice(-4)}`
  );
  const [designation, setDesignation] = useState<string>(
    assetToEdit?.designation || ''
  );
  const [compteImmobilisation, setCompteImmobilisation] = useState<string>(
    assetToEdit?.compte_immobilisation || '2332'
  );
  const [compteAmortissement, setCompteAmortissement] = useState<string>(
    assetToEdit?.compte_amortissement || '2833'
  );
  const [compteDotation, setCompteDotation] = useState<string>(
    assetToEdit?.compte_dotation || '6193'
  );
  const [valeurAcquisition, setValeurAcquisition] = useState<number>(
    assetToEdit?.valeur_acquisition !== undefined ? assetToEdit.valeur_acquisition : 0
  );
  const [dateAcquisition, setDateAcquisition] = useState<string>(
    assetToEdit?.date_acquisition || new Date().toISOString().split('T')[0]
  );
  const [dateMiseService, setDateMiseService] = useState<string>(
    assetToEdit?.date_mise_service || new Date().toISOString().split('T')[0]
  );
  const [dureeAnnees, setDureeAnnees] = useState<number>(
    assetToEdit?.duree_annees !== undefined ? assetToEdit.duree_annees : 5
  );
  const [taux, setTaux] = useState<number>(
    assetToEdit?.taux !== undefined ? assetToEdit.taux : 20
  );
  const [methode, setMethode] = useState<'lineaire' | 'degressif'>(
    assetToEdit?.methode || 'lineaire'
  );
  const [amortissementsCumules, setAmortissementsCumules] = useState<number>(
    assetToEdit?.amortissements_cumules !== undefined ? assetToEdit.amortissements_cumules : 0
  );
  const [statut, setStatut] = useState<'en_service' | 'cede' | 'mis_au_rebut'>(
    assetToEdit?.statut || 'en_service'
  );
  const [notes, setNotes] = useState<string>(
    assetToEdit?.notes || ''
  );
  const [isSaving, setIsSaving] = useState(false);

  // Auto-calculate rate when duration changes
  useEffect(() => {
    if (dureeAnnees > 0) {
      setTaux(Math.round((100 / dureeAnnees) * 100) / 100);
    }
  }, [dureeAnnees]);

  // Real-time VNA (Valeur Nette d'Amortissement)
  const vna = Math.max(0, Math.round((valeurAcquisition - amortissementsCumules) * 100) / 100);

  // Dotation annuelle estimée
  const dotationAnnuelle = Math.round((valeurAcquisition * (taux / 100)) * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!designation.trim()) {
      alert('Veuillez renseigner la désignation de l’immobilisation.');
      return;
    }
    if (valeurAcquisition <= 0) {
      alert('Veuillez renseigner une valeur d’acquisition supérieure à 0 DH.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: Partial<FixedAsset> = {
        id: assetToEdit?.id,
        code: code.trim(),
        designation: designation.trim(),
        compte_immobilisation: compteImmobilisation.trim(),
        compte_amortissement: compteAmortissement.trim(),
        compte_dotation: compteDotation.trim(),
        valeur_acquisition: Number(valeurAcquisition) || 0,
        date_acquisition: dateAcquisition,
        date_mise_service: dateMiseService,
        duree_annees: Number(dureeAnnees) || 5,
        taux: Number(taux) || 20,
        methode,
        amortissements_cumules: Number(amortissementsCumules) || 0,
        vna,
        statut,
        notes: notes.trim(),
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
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              {assetToEdit ? `Modifier Immobilisation : ${assetToEdit.code}` : 'Nouvelle Immobilisation & Amortissement'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enregistrement d'un actif corporel ou incorporel, suivi des amortissements et calcul de la VNA
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
            disabled={isSaving}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Enregistrement...' : 'Enregistrer l’Immobilisation'}
          </button>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Section 1: Identification de l'Actif */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Building className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Identification du Bien Durable</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Code Interne *
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-indigo-700 dark:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Désignation de l'Immobilisation *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Four Rotatif Industriel 80 Litres"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Statut de l'Actif
              </label>
              <select
                value={statut}
                onChange={(e) => setStatut(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="en_service">En Service (Actif)</option>
                <option value="cede">Cédé / Vendu</option>
                <option value="mis_au_rebut">Mis au rebut / Réformé</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Date d'Acquisition *
              </label>
              <input
                type="date"
                required
                value={dateAcquisition}
                onChange={(e) => setDateAcquisition(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Date de Mise en Service (début amortissement) *
              </label>
              <input
                type="date"
                required
                value={dateMiseService}
                onChange={(e) => setDateMiseService(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Comptes Comptables PCGM */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <FileText className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Comptes Comptables d'Imputation (PCGM)</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Compte d'Immobilisation (Classe 2)
              </label>
              <select
                value={compteImmobilisation}
                onChange={(e) => {
                  const val = e.target.value;
                  setCompteImmobilisation(val);
                  if (val === '2332') {
                    setCompteAmortissement('2833');
                    setCompteDotation('6193');
                  } else if (val === '2340') {
                    setCompteAmortissement('2834');
                    setCompteDotation('6193');
                  } else if (val === '2355') {
                    setCompteAmortissement('2835');
                    setCompteDotation('6193');
                  } else if (val === '2351') {
                    setCompteAmortissement('2835');
                    setCompteDotation('6193');
                  } else if (val === '2321') {
                    setCompteAmortissement('2821');
                    setCompteDotation('6192');
                  }
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="2332">2332 - Matériel et outillage</option>
                <option value="2340">2340 - Matériel de transport</option>
                <option value="2355">2355 - Matériel informatique</option>
                <option value="2351">2351 - Mobilier de bureau</option>
                <option value="2321">2321 - Bâtiments industriels</option>
                <option value="2220">2220 - Brevets, marques et droits</option>
                <option value="2311">2311 - Terrains nus</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Compte d'Amortissement (Classe 28)
              </label>
              <input
                type="text"
                value={compteAmortissement}
                onChange={(e) => setCompteAmortissement(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Compte de Dotation (Classe 619)
              </label>
              <input
                type="text"
                value={compteDotation}
                onChange={(e) => setCompteDotation(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Valeurs Financières & Plan d'Amortissement */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Calculator className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Valeur & Plan d'Amortissement</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Valeur d'Acquisition HT (DH) *
              </label>
              <input
                type="number"
                min="0"
                step="100"
                required
                value={valeurAcquisition || ''}
                onChange={(e) => setValeurAcquisition(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Durée d'Amortissement (Années)
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={dureeAnnees}
                onChange={(e) => setDureeAnnees(parseInt(e.target.value, 10) || 5)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Taux Annuel Calculé (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={taux}
                onChange={(e) => setTaux(parseFloat(e.target.value) || 20)}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 text-center"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Méthode d'Amortissement
              </label>
              <select
                value={methode}
                onChange={(e) => setMethode(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="lineaire">Amortissement Linéaire (Standard)</option>
                <option value="degressif">Amortissement Dégressif (Fiscal)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Amortissements Cumulés Antérieurs (DH)
              </label>
              <input
                type="number"
                min="0"
                step="10"
                value={amortissementsCumules || ''}
                onChange={(e) => setAmortissementsCumules(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Notes & Localisation
              </label>
              <input
                type="text"
                placeholder="Ex: Atelier n°2, Facture n° FAC-2024-192"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Financial Summary Card */}
          <div className="bg-indigo-50/70 dark:bg-indigo-950/40 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <span className="text-xs text-indigo-700 dark:text-indigo-300 uppercase font-semibold block">
                Valeur d'Acquisition
              </span>
              <span className="text-lg font-mono font-bold text-slate-900 dark:text-white">
                {formatCurrency(valeurAcquisition)}
              </span>
            </div>

            <div>
              <span className="text-xs text-indigo-700 dark:text-indigo-300 uppercase font-semibold block">
                Dotation Annuelle Estimée
              </span>
              <span className="text-lg font-mono font-bold text-amber-600 dark:text-amber-400">
                {formatCurrency(dotationAnnuelle)} / an
              </span>
            </div>

            <div>
              <span className="text-xs text-indigo-700 dark:text-indigo-300 uppercase font-semibold block">
                VNA (Valeur Nette Actuelle)
              </span>
              <span className="text-xl font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(vna)}
              </span>
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
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-600/20 transition active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Enregistrement en cours...' : 'Enregistrer l’Immobilisation'}
          </button>
        </div>
      </form>
    </div>
  );
};
