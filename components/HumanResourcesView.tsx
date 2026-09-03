'use client';

import React, { useState, useMemo } from 'react';
import { Employee, PayrollSlip, LeaveRequest } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { calculateMoroccanPayroll, getSampleMoroccanEmployees } from '@/lib/moroccan-payroll';
import {
  saveEmployee,
  deleteEmployee,
  savePayroll,
  postPayrollToAccounting,
  deletePayroll,
  saveLeave,
  deleteLeave
} from '@/lib/postgres-service';
import {
  Users,
  UserCheck,
  CreditCard,
  Calendar,
  Plus,
  Trash2,
  Printer,
  CheckCircle2,
  Clock,
  Search,
  Building2,
  FileText,
  DollarSign,
  TrendingUp,
  X,
  Eye,
  Check,
  Briefcase
} from 'lucide-react';

export type HRTab = 'EMPLOYEES' | 'PAYROLL' | 'LEAVES';

interface HumanResourcesViewProps {
  employees?: Employee[];
  payrolls?: PayrollSlip[];
  leaves?: LeaveRequest[];
  onRefresh?: () => void;
}

export function HumanResourcesView({
  employees = [],
  payrolls = [],
  leaves = [],
  onRefresh
}: HumanResourcesViewProps) {
  const [currentTab, setCurrentTab] = useState<HRTab>('EMPLOYEES');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');

  // Month & Year for payroll
  const [periodeMois, setPeriodeMois] = useState<number>(new Date().getMonth() + 1);
  const [periodeAnnee, setPeriodeAnnee] = useState<number>(new Date().getFullYear());

  // Modals
  const [showEmployeeModal, setShowEmployeeModal] = useState<boolean>(false);
  const [showPayrollModal, setShowPayrollModal] = useState<boolean>(false);
  const [showLeaveModal, setShowLeaveModal] = useState<boolean>(false);
  const [printingSlip, setPrintingSlip] = useState<PayrollSlip | null>(null);

  // New Employee Form
  const [employeeForm, setEmployeeForm] = useState<Partial<Employee>>({
    matricule: `EMP-${Date.now().toString().slice(-4)}`,
    nom: '',
    prenom: '',
    cin: '',
    cnss: '',
    departement: 'Production & Cuisine',
    poste: '',
    date_embauche: new Date().toISOString().split('T')[0],
    type_contrat: 'CDI',
    salaire_base: 5000,
    situation_familiale: 'Celibataire',
    nombre_enfants: 0,
    has_cimr: false,
    banque: 'Attijariwafa Bank',
    rib: '',
    statut: 'actif'
  });

  // Payroll Calculation Form
  const [selectedEmpId, setSelectedEmpId] = useState<number>(employees[0]?.id || 1);
  const [primesInput, setPrimesInput] = useState<number>(0);
  const [heuresSupInput, setHeuresSupInput] = useState<number>(0);
  const [indemnitesInput, setIndemnitesInput] = useState<number>(0);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      const matchDept = selectedDept === 'ALL' || e.departement === selectedDept;
      const matchSearch = !searchTerm ||
        e.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.prenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.cin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.matricule?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchDept && matchSearch;
    });
  }, [employees, selectedDept, searchTerm]);

  // Filtered payrolls for selected period
  const currentPayrolls = useMemo(() => {
    return payrolls.filter(p => p.periode_mois === periodeMois && p.periode_annee === periodeAnnee);
  }, [payrolls, periodeMois, periodeAnnee]);

  // Overall totals for current month payroll
  const totalSalairesBruts = currentPayrolls.reduce((s, p) => s + (Number(p.salaire_brut) || 0), 0);
  const totalCotisSalariales = currentPayrolls.reduce((s, p) => s + (Number(p.total_cotis_salariales) || 0), 0);
  const totalIrNet = currentPayrolls.reduce((s, p) => s + (Number(p.ir_net) || 0), 0);
  const totalNetAPayer = currentPayrolls.reduce((s, p) => s + (Number(p.salaire_net) || 0), 0);
  const totalChargesPatronales = currentPayrolls.reduce((s, p) => s + (Number(p.total_charges_patronales) || 0), 0);
  const totalCoutEmployeur = totalSalairesBruts + totalChargesPatronales;

  // Selected employee for live calculation in modal
  const currentSelectedEmp = useMemo(() => {
    return employees.find(e => e.id === selectedEmpId) || employees[0];
  }, [employees, selectedEmpId]);

  // Live preview calculation
  const previewSlip = useMemo(() => {
    if (!currentSelectedEmp) return null;
    return calculateMoroccanPayroll({
      employee: currentSelectedEmp,
      periode_mois: periodeMois,
      periode_annee: periodeAnnee,
      primes: primesInput,
      heures_sup: heuresSupInput,
      indemnites_non_imposables: indemnitesInput,
    });
  }, [currentSelectedEmp, periodeMois, periodeAnnee, primesInput, heuresSupInput, indemnitesInput]);

  // Save Employee
  const handleSaveEmployee = async () => {
    if (!employeeForm.nom || !employeeForm.prenom || !employeeForm.cin) {
      alert('Veuillez renseigner au moins le nom, prénom et CIN.');
      return;
    }

    try {
      await saveEmployee({
        ...employeeForm as Employee,
        nom_complet: `${employeeForm.nom.toUpperCase()} ${employeeForm.prenom}`,
        salaire_base: Number(employeeForm.salaire_base) || 4000,
        nombre_enfants: Number(employeeForm.nombre_enfants) || 0,
      });
      setShowEmployeeModal(false);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    }
  };

  // Save Payroll Slip
  const handleSavePayroll = async () => {
    if (!previewSlip) return;
    try {
      await savePayroll(previewSlip);
      setShowPayrollModal(false);
      setPrimesInput(0);
      setHeuresSupInput(0);
      setIndemnitesInput(0);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    }
  };

  // Post to Accounting
  const handlePostPayroll = async (slip: PayrollSlip) => {
    try {
      await postPayrollToAccounting(slip);
      alert(`Bulletin de ${slip.nom_complet} comptabilisé avec succès dans le journal de paie !`);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(`Erreur: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-full">
                Code du Travail Marocain
              </span>
              <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                Barème IR & CNSS 2026
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <Users className="w-8 h-8 text-teal-400" />
              Ressources Humaines & Paie Marocaine
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Fiches collaborateurs, calcul légal des bulletins de paie (CNSS, AMO, CIMR, IR) et intégration comptable directe
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowEmployeeModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-medium transition shadow-lg shadow-teal-600/30 text-sm"
            >
              <Plus className="w-4 h-4" />
              Nouveau Collaborateur
            </button>
            <button
              onClick={() => setShowPayrollModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition shadow-lg shadow-emerald-600/30 text-sm"
            >
              <DollarSign className="w-4 h-4" />
              Calculer la Paie
            </button>
          </div>
        </div>

        {/* Global Summary KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800">
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-3 border border-slate-700/50">
            <p className="text-xs text-slate-400 uppercase font-medium">Collaborateurs Actifs</p>
            <p className="text-lg font-bold text-white mt-1">{employees.length} employés</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-3 border border-slate-700/50">
            <p className="text-xs text-slate-400 uppercase font-medium">Masse Salariale Brute</p>
            <p className="text-lg font-bold text-white mt-1">{formatCurrency(totalSalairesBruts || employees.reduce((s, e) => s + (e.salaire_base || 0), 0))}</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-3 border border-slate-700/50">
            <p className="text-xs text-slate-400 uppercase font-medium">Total Net à Virer</p>
            <p className="text-lg font-bold text-emerald-400 mt-1">{formatCurrency(totalNetAPayer)}</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-3 border border-slate-700/50">
            <p className="text-xs text-slate-400 uppercase font-medium">Coût Total Entreprise</p>
            <p className="text-lg font-bold text-teal-400 mt-1">{formatCurrency(totalCoutEmployeur)}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 pb-1">
        {[
          { id: 'EMPLOYEES', label: 'Collaborateurs & Contrats', icon: Users },
          { id: 'PAYROLL', label: 'Bulletins de Paie (LF 2026)', icon: CreditCard },
          { id: 'LEAVES', label: 'Congés & Absences', icon: Calendar },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id as HRTab)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                isActive
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: EMPLOYEES */}
      {currentTab === 'EMPLOYEES' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher nom, CIN, matricule..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
              {['ALL', 'Production & Cuisine', 'Commercial & Vente', 'Comptabilité & Finance'].map(dept => (
                <button
                  key={dept}
                  onClick={() => setSelectedDept(dept)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                    selectedDept === dept
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {dept === 'ALL' ? 'Tous les Départements' : dept}
                </button>
              ))}
            </div>
          </div>

          {/* Employees Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase">
                  <th className="py-3.5 px-4">Matricule</th>
                  <th className="py-3.5 px-4">Collaborateur</th>
                  <th className="py-3.5 px-4">CIN / N° CNSS</th>
                  <th className="py-3.5 px-4">Poste & Département</th>
                  <th className="py-3.5 px-4">Date Embauche</th>
                  <th className="py-3.5 px-4 text-right">Salaire Base</th>
                  <th className="py-3.5 px-4 text-center">Régime</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400">
                      Aucun collaborateur trouvé.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map(emp => (
                    <tr key={emp.id || emp.matricule} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-4 font-mono font-bold text-teal-600 dark:text-teal-400 text-xs">
                        {emp.matricule}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {emp.nom_complet || `${emp.nom} ${emp.prenom}`}
                        </span>
                        <span className="text-xs text-slate-400">{emp.type_contrat} • {emp.situation_familiale}</span>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">CIN: {emp.cin}</span>
                        {emp.cnss && <span className="block text-slate-500">CNSS: {emp.cnss}</span>}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-900 dark:text-white block text-xs">{emp.poste}</span>
                        <span className="text-xs text-slate-400">{emp.departement}</span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {formatDate(emp.date_embauche)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(emp.salaire_base)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="px-2 py-0.5 text-xs rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-medium">
                            CNSS
                          </span>
                          {emp.has_cimr && (
                            <span className="px-2 py-0.5 text-xs rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-medium">
                              CIMR
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={async () => {
                            if (confirm(`Supprimer l'employé ${emp.nom} ?`)) {
                              if (emp.id) await deleteEmployee(emp.id);
                              if (onRefresh) onRefresh();
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PAYROLL */}
      {currentTab === 'PAYROLL' && (
        <div className="space-y-4">
          {/* Period Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Période de Paie :</span>
              <select
                value={periodeMois}
                onChange={(e) => setPeriodeMois(parseInt(e.target.value, 10))}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>Mois {m < 10 ? `0${m}` : m}</option>
                ))}
              </select>
              <select
                value={periodeAnnee}
                onChange={(e) => setPeriodeAnnee(parseInt(e.target.value, 10))}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold"
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
              </select>
            </div>

            <button
              onClick={() => setShowPayrollModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/20"
            >
              <Plus className="w-4 h-4" />
              Calculer un Bulletin ({periodeMois < 10 ? `0${periodeMois}` : periodeMois}/{periodeAnnee})
            </button>
          </div>

          {/* Payroll Slips Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase">
                  <th className="py-3.5 px-4">Matricule</th>
                  <th className="py-3.5 px-4">Salarié</th>
                  <th className="py-3.5 px-4 text-right">Salaire Brut</th>
                  <th className="py-3.5 px-4 text-right">CNSS + AMO</th>
                  <th className="py-3.5 px-4 text-right">IR Net</th>
                  <th className="py-3.5 px-4 text-right">Net à Payer</th>
                  <th className="py-3.5 px-4 text-right">Charges Patronales</th>
                  <th className="py-3.5 px-4 text-center">Comptabilité</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {currentPayrolls.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="font-semibold text-slate-600 dark:text-slate-300">Aucun bulletin de paie pour cette période.</p>
                      <p className="text-xs mt-1">Cliquez sur « Calculer un Bulletin » pour générer les paies selon la Loi de Finances 2026.</p>
                    </td>
                  </tr>
                ) : (
                  currentPayrolls.map(slip => (
                    <tr key={slip.id || slip.matricule} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-4 font-mono font-bold text-teal-600 dark:text-teal-400 text-xs">
                        {slip.matricule}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {slip.nom_complet}
                        <span className="block text-xs font-normal text-slate-400">{slip.poste}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(slip.salaire_brut)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-600 dark:text-slate-400">
                        {formatCurrency(slip.cotis_cnss_salariale + slip.cotis_amo_salariale)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-600 dark:text-slate-400">
                        {formatCurrency(slip.ir_net)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 text-base">
                        {formatCurrency(slip.salaire_net)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-600 dark:text-slate-400">
                        {formatCurrency(slip.total_charges_patronales)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {slip.comptabilise ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Au Journal
                          </span>
                        ) : (
                          <button
                            onClick={() => handlePostPayroll(slip)}
                            className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 hover:bg-amber-100"
                          >
                            Comptabiliser
                          </button>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setPrintingSlip(slip)}
                            className="p-1.5 text-slate-400 hover:text-teal-600 rounded-lg transition"
                            title="Imprimer le bulletin de paie"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm(`Supprimer le bulletin de ${slip.nom_complet} ?`)) {
                                if (slip.id) await deletePayroll(slip.id);
                                if (onRefresh) onRefresh();
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: LEAVES */}
      {currentTab === 'LEAVES' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Demandes de Congés & Absences</h3>
              <p className="text-xs text-slate-500 mt-0.5">Suivi des congés annuels légaux (1.5 jour par mois travaillé)</p>
            </div>
            <button
              onClick={() => setShowLeaveModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold transition"
            >
              <Plus className="w-4 h-4" />
              Nouvelle Demande
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase">
                  <th className="py-3.5 px-4">Employé</th>
                  <th className="py-3.5 px-4">Type de Congé</th>
                  <th className="py-3.5 px-4">Date Début</th>
                  <th className="py-3.5 px-4">Date Fin</th>
                  <th className="py-3.5 px-4 text-center">Durée</th>
                  <th className="py-3.5 px-4">Motif</th>
                  <th className="py-3.5 px-4 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {leaves.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Aucune absence enregistrée.
                    </td>
                  </tr>
                ) : (
                  leaves.map(l => (
                    <tr key={l.id}>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{l.employee_name}</td>
                      <td className="py-3 px-4 capitalize">{l.type}</td>
                      <td className="py-3 px-4">{formatDate(l.date_debut)}</td>
                      <td className="py-3 px-4">{formatDate(l.date_fin)}</td>
                      <td className="py-3 px-4 text-center font-bold">{l.jours} jour(s)</td>
                      <td className="py-3 px-4 text-slate-500">{l.motif || '-'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                          {l.statut}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: NOUVEAU COLLABORATEUR */}
      {showEmployeeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Nouveau Collaborateur</h3>
              <button onClick={() => setShowEmployeeModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Nom *</label>
                <input
                  type="text"
                  placeholder="EL ALAMI"
                  value={employeeForm.nom}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, nom: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Prénom *</label>
                <input
                  type="text"
                  placeholder="Youssef"
                  value={employeeForm.prenom}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, prenom: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">CIN *</label>
                <input
                  type="text"
                  placeholder="EE482910"
                  value={employeeForm.cin}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, cin: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">N° CNSS</label>
                <input
                  type="text"
                  placeholder="184920482"
                  value={employeeForm.cnss}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, cnss: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Poste Occupé</label>
                <input
                  type="text"
                  placeholder="Chef d’Atelier"
                  value={employeeForm.poste}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, poste: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Département</label>
                <select
                  value={employeeForm.departement}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, departement: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                >
                  <option value="Production & Cuisine">Production & Cuisine</option>
                  <option value="Commercial & Vente">Commercial & Vente</option>
                  <option value="Comptabilité & Finance">Comptabilité & Finance</option>
                  <option value="Direction & Logistique">Direction & Logistique</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Salaire de Base Mensuel (DH)</label>
                <input
                  type="number"
                  value={employeeForm.salaire_base || ''}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, salaire_base: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Situation Familiale</label>
                <select
                  value={employeeForm.situation_familiale}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, situation_familiale: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                >
                  <option value="Celibataire">Célibataire</option>
                  <option value="Marie">Marié(e)</option>
                  <option value="Divorce">Divorcé(e)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Personnes / Enfants à Charge</label>
                <input
                  type="number"
                  max={6}
                  min={0}
                  value={employeeForm.nombre_enfants}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, nombre_enfants: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                />
              </div>
              <div className="flex items-center pt-5 gap-3">
                <input
                  type="checkbox"
                  id="hasCimr"
                  checked={employeeForm.has_cimr}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, has_cimr: e.target.checked })}
                  className="w-4 h-4 text-teal-600 rounded"
                />
                <label htmlFor="hasCimr" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Affiliation Retraite Complémentaire (CIMR 6%)
                </label>
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowEmployeeModal(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveEmployee}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-teal-600/20"
              >
                Créer la Fiche Collaborateur
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CALCULER LA PAIE */}
      {showPayrollModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Calculateur de Paie (LF 2026)</h3>
                <p className="text-xs text-slate-500">Cotisations CNSS, AMO, Frais professionnels 20% & Barème IR révisé</p>
              </div>
              <button onClick={() => setShowPayrollModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Sélectionner l'Employé</label>
                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium"
                >
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.nom_complet || `${e.nom} ${e.prenom}`} - {e.poste} ({formatCurrency(e.salaire_base)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Primes & Gratifications (DH)</label>
                <input
                  type="number"
                  value={primesInput || ''}
                  onChange={(e) => setPrimesInput(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Heures Supplémentaires (DH)</label>
                <input
                  type="number"
                  value={heuresSupInput || ''}
                  onChange={(e) => setHeuresSupInput(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Indemnités Non Imposables (DH)</label>
                <input
                  type="number"
                  value={indemnitesInput || ''}
                  onChange={(e) => setIndemnitesInput(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold"
                />
              </div>
            </div>

            {/* Live calculation breakdown */}
            {previewSlip && (
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                  Décomposition Automatique du Salaire
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 block">Salaire Brut</span>
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                      {formatCurrency(previewSlip.salaire_brut)}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 block">Base CNSS (Plf 6 000 DH)</span>
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                      {formatCurrency(previewSlip.base_cnss)}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 block">Cotisation CNSS (4.48%)</span>
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                      {formatCurrency(previewSlip.cotis_cnss_salariale)}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 block">Cotisation AMO (2.26%)</span>
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                      {formatCurrency(previewSlip.cotis_amo_salariale)}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 block">Frais Pro Déduits (20%)</span>
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                      {formatCurrency(previewSlip.frais_professionnels)}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 block">IR Net Déduit</span>
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                      {formatCurrency(previewSlip.ir_net)}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between font-bold">
                  <div>
                    <span className="text-xs uppercase text-emerald-600 dark:text-emerald-400">Salaire Net à Virer</span>
                    <p className="text-xs text-slate-500 font-normal">Charges patronales totales : {formatCurrency(previewSlip.total_charges_patronales)}</p>
                  </div>
                  <span className="text-2xl font-mono text-emerald-700 dark:text-emerald-300">
                    {formatCurrency(previewSlip.salaire_net)}
                  </span>
                </div>
              </div>
            )}

            <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowPayrollModal(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSavePayroll}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-emerald-600/20"
              >
                Valider le Bulletin de Paie
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BULLETIN DE PAIE IMPRIMABLE */}
      {printingSlip && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl max-w-2xl w-full p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto print:p-0">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
              <div>
                <h2 className="text-xl font-black tracking-tight">AGRO-ATLAS CASABLANCA SARL</h2>
                <p className="text-xs text-slate-600">148 Boulevard Sidi Mohamed Ben Abdellah, Ain Sebaâ, Casablanca</p>
                <p className="text-xs text-slate-600">ICE : 001894523000088 • CNSS : 8492015</p>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 bg-slate-900 text-white text-xs font-bold uppercase rounded">
                  Bulletin de Paie
                </span>
                <p className="text-xs font-mono font-bold mt-1">
                  Période : {printingSlip.periode_mois < 10 ? `0${printingSlip.periode_mois}` : printingSlip.periode_mois}/{printingSlip.periode_annee}
                </p>
              </div>
            </div>

            {/* Employee info */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <p><span className="text-slate-500">Matricule :</span> <span className="font-bold">{printingSlip.matricule}</span></p>
                <p><span className="text-slate-500">Nom & Prénom :</span> <span className="font-bold text-sm">{printingSlip.nom_complet}</span></p>
                <p><span className="text-slate-500">Poste :</span> {printingSlip.poste}</p>
              </div>
              <div>
                <p><span className="text-slate-500">CIN :</span> <span className="font-mono font-bold">{printingSlip.cin}</span></p>
                <p><span className="text-slate-500">N° CNSS :</span> <span className="font-mono font-bold">{printingSlip.cnss}</span></p>
                <p><span className="text-slate-500">Département :</span> {printingSlip.departement}</p>
              </div>
            </div>

            {/* Pay components breakdown table */}
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-900 text-left font-bold uppercase">
                  <th className="py-2">Rubrique</th>
                  <th className="py-2 text-right">Base (DH)</th>
                  <th className="py-2 text-right">Taux</th>
                  <th className="py-2 text-right">Gains (DH)</th>
                  <th className="py-2 text-right">Retenues (DH)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                <tr>
                  <td className="py-2 font-sans font-medium">Salaire de Base</td>
                  <td className="py-2 text-right">{formatCurrency(printingSlip.salaire_base)}</td>
                  <td className="py-2 text-right">-</td>
                  <td className="py-2 text-right font-bold">{formatCurrency(printingSlip.salaire_base)}</td>
                  <td className="py-2 text-right">-</td>
                </tr>
                {printingSlip.primes > 0 && (
                  <tr>
                    <td className="py-2 font-sans">Primes & Indemnités</td>
                    <td className="py-2 text-right">{formatCurrency(printingSlip.primes)}</td>
                    <td className="py-2 text-right">-</td>
                    <td className="py-2 text-right">{formatCurrency(printingSlip.primes)}</td>
                    <td className="py-2 text-right">-</td>
                  </tr>
                )}
                <tr>
                  <td className="py-2 font-sans">Cotisation CNSS (Prestations)</td>
                  <td className="py-2 text-right">{formatCurrency(printingSlip.base_cnss)}</td>
                  <td className="py-2 text-right">4.48%</td>
                  <td className="py-2 text-right">-</td>
                  <td className="py-2 text-right">{formatCurrency(printingSlip.cotis_cnss_salariale)}</td>
                </tr>
                <tr>
                  <td className="py-2 font-sans">Cotisation AMO (Assurance Maladie)</td>
                  <td className="py-2 text-right">{formatCurrency(printingSlip.salaire_brut)}</td>
                  <td className="py-2 text-right">2.26%</td>
                  <td className="py-2 text-right">-</td>
                  <td className="py-2 text-right">{formatCurrency(printingSlip.cotis_amo_salariale)}</td>
                </tr>
                {printingSlip.cotis_cimr_salariale > 0 && (
                  <tr>
                    <td className="py-2 font-sans">Cotisation Retraite CIMR</td>
                    <td className="py-2 text-right">{formatCurrency(printingSlip.salaire_brut)}</td>
                    <td className="py-2 text-right">6.00%</td>
                    <td className="py-2 text-right">-</td>
                    <td className="py-2 text-right">{formatCurrency(printingSlip.cotis_cimr_salariale)}</td>
                  </tr>
                )}
                <tr>
                  <td className="py-2 font-sans">Impôt sur le Revenu (IR Net)</td>
                  <td className="py-2 text-right">{formatCurrency(printingSlip.salaire_net_imposable)}</td>
                  <td className="py-2 text-right">Barème</td>
                  <td className="py-2 text-right">-</td>
                  <td className="py-2 text-right font-bold">{formatCurrency(printingSlip.ir_net)}</td>
                </tr>
              </tbody>
            </table>

            {/* Net to pay box */}
            <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between font-bold">
              <div>
                <p className="text-xs uppercase text-slate-400">Net à Payer au Salarié</p>
                <p className="text-xs text-slate-300 font-normal">Virement bancaire irrévocable</p>
              </div>
              <span className="text-2xl font-mono">{formatCurrency(printingSlip.salaire_net)}</span>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-3 print:hidden">
              <button
                onClick={() => setPrintingSlip(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold"
              >
                Fermer
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-5 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold"
              >
                <Printer className="w-4 h-4" />
                Imprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
