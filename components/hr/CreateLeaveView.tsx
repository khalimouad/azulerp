'use client';

import React, { useState, useEffect } from 'react';
import { LeaveRequest, Employee } from '@/lib/types';
import {
  ArrowLeft,
  Calendar,
  Save,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText
} from 'lucide-react';

interface CreateLeaveViewProps {
  leaveToEdit?: LeaveRequest | null;
  employees: Employee[];
  onBack: () => void;
  onSave: (leave: Partial<LeaveRequest>) => Promise<void>;
}

export const CreateLeaveView: React.FC<CreateLeaveViewProps> = ({
  leaveToEdit,
  employees,
  onBack,
  onSave,
}) => {
  const [employeeId, setEmployeeId] = useState<number>(
    leaveToEdit?.employee_id || employees[0]?.id || 1
  );
  const [type, setType] = useState<'annuel' | 'maladie' | 'maternite' | 'sans_solde' | 'exceptionnel'>(
    (leaveToEdit?.type as any) || 'annuel'
  );
  const [dateDebut, setDateDebut] = useState<string>(
    leaveToEdit?.date_debut || new Date().toISOString().split('T')[0]
  );
  const [dateFin, setDateFin] = useState<string>(
    leaveToEdit?.date_fin || new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [jours, setJours] = useState<number>(leaveToEdit?.jours || 1);
  const [motif, setMotif] = useState<string>(leaveToEdit?.motif || '');
  const [statut, setStatut] = useState<'en_attente' | 'approuve' | 'refuse' | 'annule'>(
    (leaveToEdit?.statut as any) || 'en_attente'
  );
  const [isSaving, setIsSaving] = useState(false);

  // Automatically compute working days when dates change
  useEffect(() => {
    if (dateDebut && dateFin) {
      const d1 = new Date(dateDebut);
      const d2 = new Date(dateFin);
      if (d2 >= d1) {
        const diffMs = d2.getTime() - d1.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;
        setJours(diffDays > 0 ? diffDays : 1);
      }
    }
  }, [dateDebut, dateFin]);

  const selectedEmployee = employees.find((e) => e.id === Number(employeeId)) || employees[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
      alert('Veuillez sélectionner un employé.');
      return;
    }
    if (!dateDebut || !dateFin) {
      alert('Veuillez spécifier la date de début et la date de fin.');
      return;
    }

    setIsSaving(true);
    try {
      const empName = selectedEmployee
        ? selectedEmployee.nom_complet || `${selectedEmployee.nom} ${selectedEmployee.prenom}`
        : 'Employé';

      const payload: Partial<LeaveRequest> = {
        id: leaveToEdit?.id,
        employee_id: Number(employeeId),
        employee_name: empName,
        type,
        date_debut: dateDebut,
        date_fin: dateFin,
        jours: Number(jours) || 1,
        motif: motif.trim(),
        statut,
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
              <Calendar className="w-5 h-5 text-teal-600" />
              {leaveToEdit ? `Modifier Demande de Congé (#${leaveToEdit.id})` : 'Nouvelle Demande de Congé & Absence'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Gestion des congés annuels légaux (1.5 jour par mois), arrêts maladie et autorisations d'absence
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
            {isSaving ? 'Enregistrement...' : 'Enregistrer la Demande'}
          </button>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          {/* Employee & Type Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                <User className="w-4 h-4 text-teal-600" />
                Collaborateur Bénéficiaire *
              </label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.matricule} - {emp.nom_complet || `${emp.nom} ${emp.prenom}`} ({emp.poste})
                  </option>
                ))}
              </select>
              {selectedEmployee && (
                <p className="text-[11px] text-slate-400 mt-1">
                  Département : {selectedEmployee.departement} • Contrat : {selectedEmployee.type_contrat}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Nature / Type de Congé *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="annuel">Congé Payé Annuel (18 jours légaux / an)</option>
                <option value="maladie">Arrêt Maladie (Justifié par certificat médical)</option>
                <option value="maternite">Congé Maternité / Paternité</option>
                <option value="exceptionnel">Absence Exceptionnelle (Mariage, Naissance, Décès)</option>
                <option value="sans_solde">Congé Sans Solde</option>
              </select>
            </div>
          </div>

          {/* Dates & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 dark:border-slate-800 pt-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Date de Début (inclus) *
              </label>
              <input
                type="date"
                required
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Date de Fin (inclus) *
              </label>
              <input
                type="date"
                required
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                <Clock className="w-4 h-4 text-teal-600" />
                Nombre de Jours Ouvrables *
              </label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                required
                value={jours}
                onChange={(e) => setJours(parseFloat(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-teal-700 dark:text-teal-400 text-right focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Status & Motifs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800 pt-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Statut de la Demande
              </label>
              <select
                value={statut}
                onChange={(e) => setStatut(e.target.value as any)}
                className={`w-full px-3 py-2.5 border rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  statut === 'approuve'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300'
                    : statut === 'refuse'
                    ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300'
                    : statut === 'annule'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300'
                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300'
                }`}
              >
                <option value="en_attente">⏳ En attente de validation hiérarchique</option>
                <option value="approuve">✅ Approuvé / Accordé</option>
                <option value="refuse">❌ Refusé</option>
                <option value="annule">🚫 Annulé par le collaborateur</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                <FileText className="w-4 h-4 text-teal-600" />
                Motif & Commentaires
              </label>
              <input
                type="text"
                placeholder="Ex: Congé estival annuel / Certificat médical transmis"
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
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
            {isSaving ? 'Enregistrement en cours...' : 'Enregistrer la Demande'}
          </button>
        </div>
      </form>
    </div>
  );
};
