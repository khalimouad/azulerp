import { Employee, PayrollSlip } from './types';

// ============================================================================
// PARAMÈTRES RÉGLEMENTAIRES DE LA PAIE AU MAROC (LOI DE FINANCES 2026)
// Sources : DGI (CGI Art. 73 barème IR), CNSS Maroc, Code du Travail marocain
// ============================================================================

export const MOROCCAN_PAYROLL_RATES = {
  // Cotisations salariales
  cnss_salariale_taux: 0.0448,     // 4.48%
  cnss_plafond_mensuel: 6000,      // Plafond CNSS 6 000 MAD / mois
  amo_salariale_taux: 0.0226,      // 2.26% (non plafonné)
  cimr_salariale_taux: 0.06,       // 6.00% (si affilié à la CIMR)

  // Cotisations patronales
  cnss_patronale_taux: 0.0898,     // 8.98% (plafonné à 6000 MAD)
  alloc_familiales_taux: 0.0640,   // 6.40% (non plafonné)
  amo_patronale_taux: 0.0411,      // 4.11% (2.26% base + 1.85% solidarité)
  formation_pro_taux: 0.0160,      // 1.60% Taxe de formation professionnelle
  cimr_patronale_taux: 0.06,       // 6.00% (si affilié)

  // Frais professionnels (abattement forfaitaire)
  frais_pro_taux: 0.20,            // 20%
  frais_pro_plafond_mensuel: 2500, // Plafonné à 30 000 MAD / an soit 2 500 MAD / mois

  // Déductions de charges de famille (LF 2026)
  deduction_enfant_annuelle: 600,  // 600 MAD / personne à charge / an
  deduction_enfant_mensuelle: 50,  // 50 MAD / personne à charge / mois
  max_personnes_a_charge: 6,       // Maximum 6 personnes à charge (max 300 MAD/mois)
};

// Barème progressif annuel de l'Impôt sur le Revenu (IR) - LF 2025 / 2026
// Seuil d'exonération rehaussé à 40 000 MAD / an
export const IR_TRANCHES_ANNUELLES = [
  { min: 0,      max: 40000,    taux: 0,    somme_a_deduire: 0 },
  { min: 40001,  max: 60000,    taux: 0.10, somme_a_deduire: 4000 },
  { min: 60001,  max: 80000,    taux: 0.20, somme_a_deduire: 10000 },
  { min: 80001,  max: 100000,   taux: 0.30, somme_a_deduire: 18000 },
  { min: 100001, max: 180000,   taux: 0.34, somme_a_deduire: 22000 },
  { min: 180001, max: Infinity, taux: 0.37, somme_a_deduire: 27400 },
];

export interface PayrollCalculationInput {
  employee: Employee;
  periode_mois: number;
  periode_annee: number;
  primes?: number;
  heures_sup?: number;
  indemnites_non_imposables?: number;
  avances_acomptes?: number;
  date_paie?: string;
}

/**
 * Moteur de calcul complet d'un bulletin de salaire marocain
 */
export function calculateMoroccanPayroll(input: PayrollCalculationInput): PayrollSlip {
  const { employee, periode_mois, periode_annee } = input;
  const p = MOROCCAN_PAYROLL_RATES;

  const salaireBase = Number(employee.salaire_base) || 0;
  const primes = Number(input.primes) || 0;
  const heuresSup = Number(input.heures_sup) || 0;
  const indemnitesNonImposables = Number(input.indemnites_non_imposables) || 0;

  // 1. Salaire Brut Global
  const salaireBrut = salaireBase + primes + heuresSup + indemnitesNonImposables;

  // 2. Base CNSS (plafonnée à 6 000 MAD)
  const baseCNSS = Math.min(salaireBrut, p.cnss_plafond_mensuel);

  // 3. Cotisations Salariales
  const cotisCNSS = baseCNSS * p.cnss_salariale_taux;
  const cotisAMO = salaireBrut * p.amo_salariale_taux;
  const cotisCIMR = employee.has_cimr ? (salaireBrut * p.cimr_salariale_taux) : 0;
  const totalCotisSalariales = cotisCNSS + cotisAMO + cotisCIMR;

  // 4. Salaire Brut Imposable & Salaire Net Imposable (SNI)
  const salaireBrutImposable = salaireBrut - indemnitesNonImposables;
  const salaireNetSansFraisPro = Math.max(0, salaireBrutImposable - totalCotisSalariales);

  // Frais professionnels (20% plafonné à 2 500 MAD/mois)
  const fraisPro = Math.min(salaireNetSansFraisPro * p.frais_pro_taux, p.frais_pro_plafond_mensuel);
  const salaireNetImposable = Math.max(0, salaireNetSansFraisPro - fraisPro);

  // 5. Calcul de l'IR (Barème annuel ramené au mois)
  const sniAnnuel = salaireNetImposable * 12;
  const tranche = IR_TRANCHES_ANNUELLES.find(t => sniAnnuel >= t.min && sniAnnuel <= t.max) || IR_TRANCHES_ANNUELLES[IR_TRANCHES_ANNUELLES.length - 1];
  
  const irBrutAnnuel = (sniAnnuel * tranche.taux) - tranche.somme_a_deduire;
  const irBrutMensuel = Math.max(0, irBrutAnnuel / 12);

  // Déduction pour charges de famille (50 MAD / enfant / mois, max 6 enfants = 300 MAD)
  const nbEnfants = Math.min(Math.max(0, employee.nombre_enfants || 0), p.max_personnes_a_charge);
  const deductionFamille = nbEnfants * p.deduction_enfant_mensuelle;
  const irNet = Math.max(0, irBrutMensuel - deductionFamille);

  // 6. Retenues globales & Salaire Net à Payer
  const totalRetenues = totalCotisSalariales + irNet;
  const avances = Number(input.avances_acomptes) || 0;
  const salaireNet = Math.max(0, salaireBrut - totalRetenues - avances);

  // 7. Charges Patronales
  const chargesCNSS = baseCNSS * p.cnss_patronale_taux;
  const chargesAllocFam = salaireBrut * p.alloc_familiales_taux;
  const chargesAMO = salaireBrut * p.amo_patronale_taux;
  const chargesFP = salaireBrut * p.formation_pro_taux;
  const chargesCIMR = employee.has_cimr ? (salaireBrut * p.cimr_patronale_taux) : 0;

  const totalChargesPatronales = chargesCNSS + chargesAllocFam + chargesAMO + chargesFP + chargesCIMR;
  const coutTotalEmployeur = salaireBrut + totalChargesPatronales;

  const today = new Date().toISOString().split('T')[0];

  return {
    employee_id: employee.id || 0,
    matricule: employee.matricule,
    nom_complet: employee.nom_complet || `${employee.nom} ${employee.prenom}`,
    poste: employee.poste,
    departement: employee.departement,
    cin: employee.cin,
    cnss: employee.cnss,
    periode_mois,
    periode_annee,
    date_paie: input.date_paie || today,
    date_virement: today,

    salaire_base: Math.round(salaireBase * 100) / 100,
    primes: Math.round(primes * 100) / 100,
    heures_sup: Math.round(heuresSup * 100) / 100,
    indemnites_non_imposables: Math.round(indemnitesNonImposables * 100) / 100,
    salaire_brut: Math.round(salaireBrut * 100) / 100,

    base_cnss: Math.round(baseCNSS * 100) / 100,
    cotis_cnss_salariale: Math.round(cotisCNSS * 100) / 100,
    cotis_amo_salariale: Math.round(cotisAMO * 100) / 100,
    cotis_cimr_salariale: Math.round(cotisCIMR * 100) / 100,
    total_cotis_salariales: Math.round(totalCotisSalariales * 100) / 100,

    frais_professionnels: Math.round(fraisPro * 100) / 100,
    salaire_net_imposable: Math.round(salaireNetImposable * 100) / 100,
    ir_brut: Math.round(irBrutMensuel * 100) / 100,
    deduction_charges_famille: Math.round(deductionFamille * 100) / 100,
    ir_net: Math.round(irNet * 100) / 100,

    total_retenues: Math.round(totalRetenues * 100) / 100,
    avances_acomptes: Math.round(avances * 100) / 100,
    salaire_net: Math.round(salaireNet * 100) / 100,

    charges_patronales_cnss: Math.round(chargesCNSS * 100) / 100,
    charges_patronales_alloc_fam: Math.round(chargesAllocFam * 100) / 100,
    charges_patronales_amo: Math.round(chargesAMO * 100) / 100,
    charges_patronales_fp: Math.round(chargesFP * 100) / 100,
    charges_patronales_cimr: Math.round(chargesCIMR * 100) / 100,
    total_charges_patronales: Math.round(totalChargesPatronales * 100) / 100,
    cout_total_employeur: Math.round(coutTotalEmployeur * 100) / 100,

    statut: 'brouillon',
    comptabilise: false,
    created_at: new Date().toISOString(),
  };
}

// Sample test helper to verify compliance
export function getSampleMoroccanEmployees(): Employee[] {
  return [
    {
      id: 1,
      matricule: 'EMP-001',
      nom: 'EL ALAMI',
      prenom: 'Youssef',
      nom_complet: 'EL ALAMI Youssef',
      cin: 'EE458921',
      cnss: '184920482',
      departement: 'Production & Cuisine',
      poste: 'Chef d’Atelier de Fabrication',
      date_embauche: '2023-01-15',
      type_contrat: 'CDI',
      salaire_base: 8500,
      situation_familiale: 'Marie',
      nombre_enfants: 2,
      has_cimr: true,
      banque: 'Attijariwafa Bank',
      rib: '007 780 0001234567890123 45',
      statut: 'actif',
    },
    {
      id: 2,
      matricule: 'EMP-002',
      nom: 'BENJELLOUN',
      prenom: 'Fatima',
      nom_complet: 'BENJELLOUN Fatima',
      cin: 'BE892341',
      cnss: '293847192',
      departement: 'Commercial & Vente',
      poste: 'Responsable Ventes & Logistique',
      date_embauche: '2024-03-01',
      type_contrat: 'CDI',
      salaire_base: 6500,
      situation_familiale: 'Celibataire',
      nombre_enfants: 0,
      has_cimr: false,
      banque: 'Banque Populaire',
      rib: '145 450 21211 2604506 000 4 11',
      statut: 'actif',
    },
    {
      id: 3,
      matricule: 'EMP-003',
      nom: 'CHRAIBI',
      prenom: 'Karim',
      nom_complet: 'CHRAIBI Karim',
      cin: 'AE128945',
      cnss: '304918239',
      departement: 'Comptabilité & Finance',
      poste: 'Comptable d’Entreprise',
      date_embauche: '2025-06-01',
      type_contrat: 'CDI',
      salaire_base: 7200,
      situation_familiale: 'Marie',
      nombre_enfants: 1,
      has_cimr: true,
      banque: 'CIH Bank',
      rib: '230 780 9876543210987654 12',
      statut: 'actif',
    },
  ];
}
