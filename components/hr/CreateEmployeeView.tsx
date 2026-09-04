'use client';

import React, { useState } from 'react';
import { Employee, ContractType, FamilyStatus } from '@/lib/types';
import {
  ArrowLeft,
  Users,
  Save,
  User,
  Briefcase,
  CreditCard,
  Building,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle2,
  FileText
} from 'lucide-react';

interface CreateEmployeeViewProps {
  employeeToEdit?: Employee | null;
  onBack: () => void;
  onSave: (employee: Partial<Employee>) => Promise<void>;
}

export const CreateEmployeeView: React.FC<CreateEmployeeViewProps> = ({
  employeeToEdit,
  onBack,
  onSave,
}) => {
  const [form, setForm] = useState<Partial<Employee>>({
    id: employeeToEdit?.id,
    matricule: employeeToEdit?.matricule || `EMP-${Date.now().toString().slice(-4)}`,
    nom: employeeToEdit?.nom || '',
    prenom: employeeToEdit?.prenom || '',
    cin: employeeToEdit?.cin || '',
    cnss: employeeToEdit?.cnss || '',
    departement: employeeToEdit?.departement || 'Production & Cuisine',
    poste: employeeToEdit?.poste || '',
    date_embauche: employeeToEdit?.date_embauche || new Date().toISOString().split('T')[0],
    date_naissance: employeeToEdit?.date_naissance || '',
    type_contrat: (employeeToEdit?.type_contrat as ContractType) || 'CDI',
    salaire_base: employeeToEdit?.salaire_base !== undefined ? employeeToEdit.salaire_base : 5000,
    situation_familiale: (employeeToEdit?.situation_familiale as FamilyStatus) || 'Celibataire',
    nombre_enfants: employeeToEdit?.nombre_enfants !== undefined ? employeeToEdit.nombre_enfants : 0,
    has_cimr: employeeToEdit?.has_cimr || false,
    taux_cimr: employeeToEdit?.taux_cimr || 6,
    banque: employeeToEdit?.banque || 'Attijariwafa Bank',
    rib: employeeToEdit?.rib || '',
    telephone: employeeToEdit?.telephone || '',
    email: employeeToEdit?.email || '',
    adresse: employeeToEdit?.adresse || '',
    statut: employeeToEdit?.statut || 'actif',
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom?.trim() || !form.prenom?.trim()) {
      alert('Veuillez renseigner le nom et le prénom du collaborateur.');
      return;
    }
    if (!form.cin?.trim()) {
      alert('Veuillez renseigner le numéro de CIN du collaborateur.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: Partial<Employee> = {
        ...form,
        nom: form.nom.trim().toUpperCase(),
        prenom: form.prenom.trim(),
        nom_complet: `${form.nom.trim().toUpperCase()} ${form.prenom.trim()}`,
        matricule: form.matricule?.trim() || `EMP-${Date.now().toString().slice(-4)}`,
        salaire_base: Number(form.salaire_base) || 4000,
        nombre_enfants: Number(form.nombre_enfants) || 0,
        taux_cimr: form.has_cimr ? (Number(form.taux_cimr) || 6) : 0,
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
            <span>Retour aux RH</span>
          </button>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-600" />
              {employeeToEdit ? `Modifier Collaborateur : ${employeeToEdit.nom_complet || employeeToEdit.nom}` : 'Nouveau Collaborateur'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Fiche salarié, contrat de travail, affiliation CNSS/CIMR et coordonnées bancaires
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
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Enregistrement...' : 'Enregistrer le Collaborateur'}
          </button>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Section 1: Identité & État Civil */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <User className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">État Civil & Identité</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Matricule Interne *
              </label>
              <input
                type="text"
                required
                value={form.matricule}
                onChange={(e) => setForm({ ...form, matricule: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-teal-700 dark:text-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Nom de famille *
              </label>
              <input
                type="text"
                required
                placeholder="EL ALAMI"
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white uppercase focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Prénom *
              </label>
              <input
                type="text"
                required
                placeholder="Youssef"
                value={form.prenom}
                onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                N° CIN (Carte d'identité) *
              </label>
              <input
                type="text"
                required
                placeholder="EE482910"
                value={form.cin}
                onChange={(e) => setForm({ ...form, cin: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Date de Naissance
              </label>
              <input
                type="date"
                value={form.date_naissance || ''}
                onChange={(e) => setForm({ ...form, date_naissance: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Situation Familiale
              </label>
              <select
                value={form.situation_familiale}
                onChange={(e) => setForm({ ...form, situation_familiale: e.target.value as FamilyStatus })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="Celibataire">Célibataire</option>
                <option value="Marie">Marié(e)</option>
                <option value="Divorce">Divorcé(e)</option>
                <option value="Veuf">Veuf / Veuve</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Enfants à charge (déduction fiscale IR)
              </label>
              <input
                type="number"
                min="0"
                max="6"
                value={form.nombre_enfants}
                onChange={(e) => setForm({ ...form, nombre_enfants: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Contrat & Affectation */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Briefcase className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Contrat & Poste</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Département *
              </label>
              <select
                value={form.departement}
                onChange={(e) => setForm({ ...form, departement: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="Production & Cuisine">Production & Cuisine</option>
                <option value="Commercial & Vente">Commercial & Vente</option>
                <option value="Comptabilité & Finance">Comptabilité & Finance</option>
                <option value="Direction & Logistique">Direction & Logistique</option>
                <option value="Maintenance & Technique">Maintenance & Technique</option>
                <option value="RH & Administratif">RH & Administratif</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Poste Occupé *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Chef de Cuisine, Vendeur..."
                value={form.poste}
                onChange={(e) => setForm({ ...form, poste: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Type de Contrat
              </label>
              <select
                value={form.type_contrat}
                onChange={(e) => setForm({ ...form, type_contrat: e.target.value as ContractType })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="CDI">CDI (Contrat Durée Indéterminée)</option>
                <option value="CDD">CDD (Contrat Durée Déterminée)</option>
                <option value="ANAPEC">ANAPEC (Insertion professionnelle)</option>
                <option value="Stage">Stage conventionné</option>
                <option value="Freelance">Freelance / Prestation</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Date d'Embauche
              </label>
              <input
                type="date"
                value={form.date_embauche}
                onChange={(e) => setForm({ ...form, date_embauche: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Statut Collaborateur
              </label>
              <select
                value={form.statut}
                onChange={(e) => setForm({ ...form, statut: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="actif">Actif (en poste)</option>
                <option value="conge">En Congé / Absence temporaire</option>
                <option value="inactif">Inactif</option>
                <option value="quitte">Contrat clôturé / Départ</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Rémunération & Régime Social Marocain */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <CreditCard className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Rémunération & Régime Social Marocain</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Salaire de Base Brut Mensuel (DH) *
              </label>
              <input
                type="number"
                min="0"
                step="50"
                required
                placeholder="5000"
                value={form.salaire_base || ''}
                onChange={(e) => setForm({ ...form, salaire_base: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 text-right focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                N° Immatriculation CNSS
              </label>
              <input
                type="text"
                placeholder="Ex: 184920482"
                value={form.cnss || ''}
                onChange={(e) => setForm({ ...form, cnss: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Retraite Complémentaire (CIMR)
              </label>
              <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.has_cimr}
                    onChange={(e) => setForm({ ...form, has_cimr: e.target.checked })}
                    className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                  />
                  <span>Adhérent CIMR</span>
                </label>
              </div>
            </div>

            {form.has_cimr && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Taux Cotisation CIMR (%)
                </label>
                <select
                  value={form.taux_cimr || 6}
                  onChange={(e) => setForm({ ...form, taux_cimr: parseFloat(e.target.value) || 6 })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value={3}>3.00% (Régime allégé)</option>
                  <option value={6}>6.00% (Taux standard)</option>
                  <option value={10}>10.00% (Cadres dirigeants)</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Section 4: Coordonnées Bancaires & Contact */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Building className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">Coordonnées Bancaires & Contact</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Banque de Domiciliation
              </label>
              <select
                value={form.banque}
                onChange={(e) => setForm({ ...form, banque: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="Attijariwafa Bank">Attijariwafa Bank</option>
                <option value="Banque Populaire (BCP)">Banque Populaire (BCP)</option>
                <option value="BMCE Bank of Africa">BMCE Bank of Africa</option>
                <option value="CIH Bank">CIH Bank</option>
                <option value="Société Générale Maroc">Société Générale Maroc</option>
                <option value="Crédit du Maroc (CDM)">Crédit du Maroc (CDM)</option>
                <option value="BMCI">BMCI</option>
                <option value="CFG Bank">CFG Bank</option>
                <option value="Al Barid Bank">Al Barid Bank</option>
                <option value="Autre">Autre établissement</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                RIB (Relevé d'Identité Bancaire - 24 chiffres)
              </label>
              <input
                type="text"
                maxLength={24}
                placeholder="Ex: 007780000123456789012345"
                value={form.rib || ''}
                onChange={(e) => setForm({ ...form, rib: e.target.value.replace(/\s+/g, '') })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono tracking-wider font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Téléphone Mobile
              </label>
              <input
                type="tel"
                placeholder="06 12 34 56 78"
                value={form.telephone || ''}
                onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Adresse Email
              </label>
              <input
                type="email"
                placeholder="collaborateur@entreprise.ma"
                value={form.email || ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Adresse Domicile
              </label>
              <input
                type="text"
                placeholder="Casablanca, Maroc"
                value={form.adresse || ''}
                onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
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
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-lg shadow-teal-600/20 transition active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Enregistrement en cours...' : 'Enregistrer le Collaborateur'}
          </button>
        </div>
      </form>
    </div>
  );
};
