/**
 * SUBSTANTIAL MOROCCAN REAL-WORLD DATASET - CASABLANCA (EXERCICE 2026)
 * Agroalimentaire, Distribution & Fabrication Industrielle
 * Conforme PCGM, CGNC & Loi de Finances 2026
 */

import {
  CompanyInfo,
  Client,
  Fournisseur,
  Produit,
  BonLivraison,
  Facture,
  FactureFournisseur,
  PaiementFournisseur,
  Reglement,
  StockMouvement,
  Employee,
  PayrollSlip,
  BOM,
  ProductionOrder,
  FixedAsset,
  JournalEntry
} from './types';
import {
  generateSalesInvoiceJournalEntry,
  generatePurchaseInvoiceJournalEntry,
  generateClientPaymentJournalEntry,
  generateSupplierPaymentJournalEntry,
  generatePayrollJournalEntry,
  generateProductionJournalEntry,
  generateDepreciationJournalEntry
} from './moroccan-accounting';
import { calculateMoroccanPayroll } from './moroccan-payroll';

// -----------------------------------------------------------------------------
// 1. IDENTITÉ DE L'ENTREPRISE (CASABLANCA - 2026)
// -----------------------------------------------------------------------------
export const CASA_COMPANY_2026: CompanyInfo = {
  nom: 'AGRO-ATLAS CASABLANCA SARL',
  forme_juridique: 'SARL',
  capital: '1 500 000,00',
  adresse: '148 Boulevard Sidi Mohamed Ben Abdellah, Zone Industrielle Ain Sebaâ',
  adresse_detail: 'Parc Industriel Al Manar, Bâtiment C3',
  code_postal: '20250',
  ville: 'Casablanca',
  pays: 'Maroc',
  telephone: '05 22 35 40 80 / 05 22 35 40 81',
  fax: '05 22 35 40 89',
  email: 'contact@agroatlas-casa.ma',
  site_web: 'www.agroatlas-casa.ma',
  ice: '001894523000088', // ICE officiel 15 chiffres
  if_fiscal: '40285912',
  rc: '184920', // RC Casablanca
  cnss: '8492015',
  patente: '36194025',
  agrement_onssa: 'ONSSA/AGRO/2026/CAS-114',
  partenaire_coop: 'Coopérative Laitière et Oléicole du Souss & Chaouia',
  banque: 'Attijariwafa Bank - Agence Casablanca Sidi Maârouf',
  rib: '007 780 0001234567890123 44',
  logo_titre: 'AGRO-ATLAS',
  logo_sous_titre: 'Transformation & Distribution Agroalimentaire',
  logo_mode: 'both',
  logo_placement: 'left'
};

// -----------------------------------------------------------------------------
// 2. CLIENTS (CASABLANCA, RABAT, MARRAKECH, TANGER)
// -----------------------------------------------------------------------------
export const CASA_CLIENTS_2026: Client[] = [
  {
    id: 1,
    code: 'CLT-MARJ-01',
    nom: 'MARJANE HOLDING S.A (Sidi Maârouf)',
    interlocuteur: 'M. Mehdi Benjelloun (Direction Centrale Achats)',
    adresse: 'Route de Nouaceur, Lotissement La Colline II, Sidi Maârouf',
    code_postal: '20190',
    ville: 'Casablanca',
    pays: 'Maroc',
    telephone: '0522 58 40 00',
    mobile: '0661 28 49 10',
    email: 'achats.frais@marjane.co.ma',
    ice: '001528491000045',
    notes: 'Règlement à 60 jours fin de mois par Virement Swift.',
    solde: 0,
    total_achats: 0,
    bl_non_factures_count: 0
  },
  {
    id: 2,
    code: 'CLT-CARREF-02',
    nom: 'LABEL VIE S.A - CARREFOUR MARKET (Gauthier)',
    interlocuteur: 'Mme Sofia Alami (Responsable Rayon Épicerie Fine)',
    adresse: 'Angle Boulevard Moulay Youssef et Rue d’Alger, Quartier Gauthier',
    code_postal: '20060',
    ville: 'Casablanca',
    pays: 'Maroc',
    telephone: '0522 20 15 30',
    mobile: '0663 15 90 22',
    email: 'appro.gauthier@labelvie.ma',
    ice: '000034982000012',
    notes: 'Livraison le matin avant 08h30. Facturation bimensuelle consolidée.',
    solde: 0,
    total_achats: 0,
    bl_non_factures_count: 0
  },
  {
    id: 3,
    code: 'CLT-HYATT-03',
    nom: 'HYATT REGENCY CASABLANCA (Hôtellerie & Restauration)',
    interlocuteur: 'Chef Adil Chraïbi (Chef Exécutif des Cuisines)',
    adresse: 'Place des Nations Unies, Centre-Ville',
    code_postal: '20000',
    ville: 'Casablanca',
    pays: 'Maroc',
    telephone: '0522 43 12 34',
    mobile: '0661 88 33 11',
    email: 'purchasing.casablanca@hyatt.com',
    ice: '001928471000077',
    notes: 'Exigence stricte de fraîcheur et traçabilité ONSSA.',
    solde: 0,
    total_achats: 0,
    bl_non_factures_count: 0
  },
  {
    id: 4,
    code: 'CLT-VENEZ-04',
    nom: 'CAFE VENEZIA ICE (Siège Oasis)',
    interlocuteur: 'M. Tarik Naciri (Directeur des Opérations)',
    adresse: 'Boulevard Panoramique, Quartier Polo / Oasis',
    code_postal: '20150',
    ville: 'Casablanca',
    pays: 'Maroc',
    telephone: '0522 86 44 20',
    mobile: '0662 44 77 99',
    email: 'commandes@veneziaice.com',
    ice: '001738291000093',
    notes: 'Consommateur régulier de sauces, fruits transformés et crèmes.',
    solde: 0,
    total_achats: 0,
    bl_non_factures_count: 0
  },
  {
    id: 5,
    code: 'CLT-RESTO-05',
    nom: 'RESTO MAISON BLANCHE SARL (Bouskoura)',
    interlocuteur: 'M. Karim Tahiri (Gérant)',
    adresse: 'Zone Résidentielle Bouskoura Golf City, Villa 42',
    code_postal: '27182',
    ville: 'Casablanca',
    pays: 'Maroc',
    telephone: '0522 32 10 90',
    mobile: '0664 55 12 34',
    email: 'direction@maisonblanche-casa.com',
    ice: '002019482000031',
    notes: 'Règlement par chèque à livraison.',
    solde: 0,
    total_achats: 0,
    bl_non_factures_count: 0
  },
  {
    id: 6,
    code: 'CLT-DISTRI-06',
    nom: 'DISTRI-NORD TANGER MED (Plateforme Logistique)',
    interlocuteur: 'Mme Houda Mansouri (Responsable Flux)',
    adresse: 'Zone Franche Logistique, Bâtiment 4, Port Tanger Med',
    code_postal: '90000',
    ville: 'Tanger',
    pays: 'Maroc',
    telephone: '0539 94 00 20',
    mobile: '0661 70 80 90',
    email: 'logistique@distrinord-med.ma',
    ice: '001648291000064',
    notes: 'Commandes par palettes entières avec expédition hebdomadaire.',
    solde: 0,
    total_achats: 0,
    bl_non_factures_count: 0
  }
];

// -----------------------------------------------------------------------------
// 3. FOURNISSEURS (MATIÈRES PREMIÈRES, EMBALLAGES, TRANSPORT, ÉNERGIE)
// -----------------------------------------------------------------------------
export const CASA_FOURNISSEURS_2026: Fournisseur[] = [
  {
    id: 101,
    code: 'FRN-HUILE-01',
    nom: 'LES HUILERIES DU SOUSS S.A',
    interlocuteur: 'M. Brahim Aït Taleb',
    adresse: 'Quartier Industriel Anza, Route d’Essaouira',
    code_postal: '80000',
    ville: 'Agadir',
    telephone: '0528 84 10 20',
    mobile: '0661 30 40 50',
    email: 'commercial@huileries-souss.ma',
    ice: '000189402000054',
    solde_du: 0,
    total_achats: 0,
    notes: 'Fournisseur d’huile d’olive extra vierge et huiles végétales de cuisson.'
  },
  {
    id: 102,
    code: 'FRN-CARTON-02',
    nom: 'CARTONNERIES DU MAROC S.A (Gharb & Casa)',
    interlocuteur: 'M. Hassan Berrada',
    adresse: 'Zone Industrielle Oukacha, Boulevard Moulay Slimane',
    code_postal: '20300',
    ville: 'Casablanca',
    telephone: '0522 35 11 22',
    mobile: '0662 10 20 30',
    email: 'ventes@cartonneries.ma',
    ice: '001594830000072',
    solde_du: 0,
    total_achats: 0,
    notes: 'Emballages carton ondulé homologués contact alimentaire.'
  },
  {
    id: 103,
    code: 'FRN-PLAST-03',
    nom: 'PLASTIQUE & EMBALLAGES DU MAGHREB (Tit Mellil)',
    interlocuteur: 'Mme Meryem Bennani',
    adresse: 'Route Nationale 9, Zone Industrielle Tit Mellil',
    code_postal: '20600',
    ville: 'Casablanca',
    telephone: '0522 51 04 00',
    mobile: '0661 99 88 77',
    email: 'contact@pem-plast.ma',
    ice: '001849201000039',
    solde_du: 0,
    total_achats: 0,
    notes: 'Bouteilles PET 250ml, 500ml et seaux hermétiques 5L.'
  },
  {
    id: 104,
    code: 'FRN-EPICE-04',
    nom: 'COMPTOIR DES ÉPICES ET CONDIMENTS DU MAROC',
    interlocuteur: 'M. Omar Fassi',
    adresse: 'Quartier Derb Omar, Rue Léon l’Africain',
    code_postal: '20000',
    ville: 'Casablanca',
    telephone: '0522 22 18 40',
    mobile: '0663 44 55 66',
    email: 'fassi.epices@menara.ma',
    ice: '000294810000023',
    solde_du: 0,
    total_achats: 0,
    notes: 'Basilic frais séché, ail semoule, piment doux, poivre noir.'
  },
  {
    id: 105,
    code: 'FRN-TRANS-05',
    nom: 'VOIE EXPRESS LOGISTIQUE & DISTRIBUTION',
    interlocuteur: 'M. Yassine Semlali',
    adresse: 'Sortie Autoroute Casa-Rabat, Zone Franche logistique Zenata',
    code_postal: '20620',
    ville: 'Mohammedia',
    telephone: '0523 32 80 00',
    mobile: '0661 14 25 36',
    email: 'fret@voie-express.ma',
    ice: '001749201000015',
    solde_du: 0,
    total_achats: 0,
    notes: 'Transport frigorifique sous température dirigée (+4°C).'
  }
];

// -----------------------------------------------------------------------------
// 4. PRODUITS (MATIÈRES PREMIÈRES, EMBALLAGES & PRODUITS FINIS)
// -----------------------------------------------------------------------------
export const CASA_PRODUITS_2026: Produit[] = [
  // A. Produits Finis Fabriqués à Casa
  {
    id: 1,
    code: 'PF-PESTO-200G',
    libelle: 'Sauce Pesto Traditionnel au Basilic Marocain 200g',
    groupe: 'PRODUIT_FINI',
    famille: 'SAUCES ET CONDIMENTS',
    unite: 'POT',
    taux_tva: 20,
    prix_ht: 28.50,
    prix_achat: 14.80,
    prix_achat_ht: 14.80,
    stock_actuel: 850,
    stock_min: 150,
    stock_virtuel: 850,
    description: 'Pesto artisanal préparé avec basilic frais, ail doux, huile d’olive et parmesan.'
  },
  {
    id: 2,
    code: 'PF-HUILE-PIM-500ML',
    libelle: 'Huile d’Olive Aromatisée Piment & Thym Sauvage 500ml',
    groupe: 'PRODUIT_FINI',
    famille: 'HUILES ET CONDIMENTS',
    unite: 'BOUT',
    taux_tva: 20,
    prix_ht: 45.00,
    prix_achat: 24.50,
    prix_achat_ht: 24.50,
    stock_actuel: 620,
    stock_min: 100,
    stock_virtuel: 620,
    description: 'Huile extra vierge du Souss infusée aux piments de Marrakech et herbes de l’Atlas.'
  },
  {
    id: 3,
    code: 'PF-TAPENADE-180G',
    libelle: 'Tapenade Noire aux Olives de Marrakech 180g',
    groupe: 'PRODUIT_FINI',
    famille: 'SAUCES ET CONDIMENTS',
    unite: 'POT',
    taux_tva: 20,
    prix_ht: 22.00,
    prix_achat: 11.20,
    prix_achat_ht: 11.20,
    stock_actuel: 1200,
    stock_min: 200,
    stock_virtuel: 1200,
    description: 'Olives noires confites, câpres, anchois et filet d’huile d’olive bio.'
  },
  {
    id: 4,
    code: 'PF-CONF-FIGUE-350G',
    libelle: 'Confiture Artisanale Figues de Taounate au Miel d’Oranger 350g',
    groupe: 'PRODUIT_FINI',
    famille: 'CONFITURES ET DESSERTS',
    unite: 'POT',
    taux_tva: 20,
    prix_ht: 32.00,
    prix_achat: 16.50,
    prix_achat_ht: 16.50,
    stock_actuel: 480,
    stock_min: 80,
    stock_virtuel: 480,
    description: 'Figues mûres cueillies à la main, cuisson au chaudron en cuivre.'
  },

  // B. Matières Premières Agricoles & Ingrédients
  {
    id: 11,
    code: 'MP-HUILE-VRAC',
    libelle: 'Huile d’Olive Vierge Extra (Vrac Cuve Inox)',
    groupe: 'MATIERE_PREMIERE',
    famille: 'HUILES BRUTES',
    unite: 'L',
    taux_tva: 20,
    prix_ht: 65.00,
    prix_achat: 48.00,
    prix_achat_ht: 48.00,
    stock_actuel: 3500,
    stock_min: 500,
    stock_virtuel: 3500,
    description: 'Huile première pression à froid origine Agadir / Taroudant.'
  },
  {
    id: 12,
    code: 'MP-BASILIC-FRAIS',
    libelle: 'Basilic Frais Feuille Bio (Producteur Chaouia)',
    groupe: 'MATIERE_PREMIERE',
    famille: 'HERBES ET AROMATES',
    unite: 'KG',
    taux_tva: 20,
    prix_ht: 35.00,
    prix_achat: 22.00,
    prix_achat_ht: 22.00,
    stock_actuel: 420,
    stock_min: 60,
    stock_virtuel: 420,
    description: 'Basilic grand vert frais certifié zéro résidu.'
  },
  {
    id: 13,
    code: 'MP-OLIVE-NOIRE',
    libelle: 'Olives Noires Façon Grèce Dénoyautées (Seau 10KG)',
    groupe: 'MATIERE_PREMIERE',
    famille: 'OLIVES BRUTES',
    unite: 'KG',
    taux_tva: 20,
    prix_ht: 30.00,
    prix_achat: 18.50,
    prix_achat_ht: 18.50,
    stock_actuel: 1400,
    stock_min: 250,
    stock_virtuel: 1400,
    description: 'Olives charnues sélectionnées de la région des Haouz.'
  },
  {
    id: 14,
    code: 'MP-FIGUE-FRAICHE',
    libelle: 'Figues Fraîches Noires Taounate (Calibre 1)',
    groupe: 'MATIERE_PREMIERE',
    famille: 'FRUITS FRAIS',
    unite: 'KG',
    taux_tva: 20,
    prix_ht: 25.00,
    prix_achat: 15.00,
    prix_achat_ht: 15.00,
    stock_actuel: 950,
    stock_min: 150,
    stock_virtuel: 950,
    description: 'Figues sucrées pour confitures et pâtes de fruits.'
  },
  {
    id: 15,
    code: 'MP-PARMESAN-BLOC',
    libelle: 'Parmigiano Reggiano AOP Râpé Industrie 1KG',
    groupe: 'MATIERE_PREMIERE',
    famille: 'PRODUITS LAITIERS',
    unite: 'KG',
    taux_tva: 20,
    prix_ht: 190.00,
    prix_achat: 145.00,
    prix_achat_ht: 145.00,
    stock_actuel: 180,
    stock_min: 30,
    stock_virtuel: 180,
    description: 'Affinage 24 mois pour arôme intense dans les sauces.'
  },

  // C. Emballages & Conditionnements
  {
    id: 21,
    code: 'EMB-POT-VERRE-200',
    libelle: 'Pot en Verre Rond 212ml avec Capsule Dorée Twist-Off',
    groupe: 'EMBALLAGE',
    famille: 'VERRERIE',
    unite: 'U',
    taux_tva: 20,
    prix_ht: 3.20,
    prix_achat: 2.10,
    prix_achat_ht: 2.10,
    stock_actuel: 4800,
    stock_min: 1000,
    stock_virtuel: 4800,
    description: 'Verre transparent résistant à la stérilisation 121°C.'
  },
  {
    id: 22,
    code: 'EMB-BOUT-MARASCA-500',
    libelle: 'Bouteille Marasca Verre Teinté Anti-UV 500ml avec Bouchon Verseur',
    groupe: 'EMBALLAGE',
    famille: 'VERRERIE',
    unite: 'U',
    taux_tva: 20,
    prix_ht: 5.50,
    prix_achat: 3.80,
    prix_achat_ht: 3.80,
    stock_actuel: 3200,
    stock_min: 600,
    stock_virtuel: 3200,
    description: 'Idéal pour préserver les huiles aromatisées de l’oxydation lumineuse.'
  },
  {
    id: 23,
    code: 'EMB-CARTON-X12',
    libelle: 'Carton Double Cannelure Impression Agro-Atlas (x12 pots)',
    groupe: 'EMBALLAGE',
    famille: 'CARTONS',
    unite: 'U',
    taux_tva: 20,
    prix_ht: 4.80,
    prix_achat: 3.20,
    prix_achat_ht: 3.20,
    stock_actuel: 1500,
    stock_min: 300,
    stock_virtuel: 1500,
    description: 'Carton robuste pour expédition palettes GMS.'
  }
];

// -----------------------------------------------------------------------------
// 5. RESSOURCES HUMAINES (CADRES, CHEFS D'ATELIER, COMPTABLE, OUVRIERS - LF 2026)
// -----------------------------------------------------------------------------
export const CASA_EMPLOYEES_2026: Employee[] = [
  {
    id: 1,
    matricule: 'EMP-001',
    nom: 'BENNANI',
    prenom: 'Omar',
    nom_complet: 'BENNANI OMAR',
    cin: 'BE429015',
    cnss: '184920482',
    departement: 'Direction Générale',
    poste: 'Directeur Général & Gérant',
    date_embauche: '2020-01-02',
    type_contrat: 'CDI',
    salaire_base: 32000,
    situation_familiale: 'Marie',
    nombre_enfants: 3,
    has_cimr: true,
    taux_cimr: 6,
    banque: 'Attijariwafa Bank',
    rib: '007 780 0001234567890123 44',
    statut: 'actif'
  },
  {
    id: 2,
    matricule: 'EMP-002',
    nom: 'EL FASSI',
    prenom: 'Kenza',
    nom_complet: 'EL FASSI KENZA',
    cin: 'BK619402',
    cnss: '291049581',
    departement: 'Comptabilité & Finance',
    poste: 'Responsable Financière & Comptable',
    date_embauche: '2021-03-15',
    type_contrat: 'CDI',
    salaire_base: 18500,
    situation_familiale: 'Marie',
    nombre_enfants: 2,
    has_cimr: true,
    taux_cimr: 6,
    banque: 'Banque Populaire',
    rib: '145 450 21211 2604506 000 4 11',
    statut: 'actif'
  },
  {
    id: 3,
    matricule: 'EMP-003',
    nom: 'TAHIRI',
    prenom: 'Hicham',
    nom_complet: 'TAHIRI HICHAM',
    cin: 'BV201948',
    cnss: '301948201',
    departement: 'Commercial & Vente',
    poste: 'Responsable Comptes Clés GMS',
    date_embauche: '2022-06-01',
    type_contrat: 'CDI',
    salaire_base: 14000,
    situation_familiale: 'Marie',
    nombre_enfants: 1,
    has_cimr: true,
    taux_cimr: 6,
    banque: 'BMCE Bank of Africa',
    rib: '011 780 0000987654321098 12',
    statut: 'actif'
  },
  {
    id: 4,
    matricule: 'EMP-004',
    nom: 'OUZZANI',
    prenom: 'Mustapha',
    nom_complet: 'OUZZANI MUSTAPHA',
    cin: 'BL381940',
    cnss: '419204918',
    departement: 'Production & Cuisine',
    poste: 'Chef d’Atelier Transformation',
    date_embauche: '2021-09-01',
    type_contrat: 'CDI',
    salaire_base: 9500,
    situation_familiale: 'Marie',
    nombre_enfants: 2,
    has_cimr: false,
    taux_cimr: 0,
    banque: 'Crédit du Maroc',
    rib: '021 780 0004561237894561 33',
    statut: 'actif'
  },
  {
    id: 5,
    matricule: 'EMP-005',
    nom: 'BERRADA',
    prenom: 'Yassine',
    nom_complet: 'BERRADA YASSINE',
    cin: 'BJ492015',
    cnss: '592019482',
    departement: 'Production & Cuisine',
    poste: 'Opérateur Machine & Cuisson',
    date_embauche: '2023-02-10',
    type_contrat: 'CDI',
    salaire_base: 5200,
    situation_familiale: 'Celibataire',
    nombre_enfants: 0,
    has_cimr: false,
    taux_cimr: 0,
    banque: 'CIH Bank',
    rib: '230 780 0007894561237894 55',
    statut: 'actif'
  },
  {
    id: 6,
    matricule: 'EMP-006',
    nom: 'CHRAIBI',
    prenom: 'Salma',
    nom_complet: 'CHRAIBI SALMA',
    cin: 'BW501928',
    cnss: '601948291',
    departement: 'Logistique & Expéditions',
    poste: 'Gestionnaire des Stocks & Expéditions',
    date_embauche: '2023-05-01',
    type_contrat: 'CDI',
    salaire_base: 6500,
    situation_familiale: 'Celibataire',
    nombre_enfants: 0,
    has_cimr: false,
    taux_cimr: 0,
    banque: 'Attijariwafa Bank',
    rib: '007 780 0009998887776665 88',
    statut: 'actif'
  }
];

// -----------------------------------------------------------------------------
// 6. NOMENCLATURES (BOM) - RECETTES INDUSTRIELLES CASABLANCA
// -----------------------------------------------------------------------------
export const CASA_BOMS_2026: BOM[] = [
  {
    id: 1,
    code: 'BOM-PESTO-500',
    nom: 'Lot de 500 Pots de Sauce Pesto 200g',
    produit_fini_id: 1,
    produit_fini_nom: 'Sauce Pesto Traditionnel au Basilic Marocain 200g',
    quantite_produite: 500,
    unite: 'POT',
    version: '2.1',
    actif: true,
    composants: [
      { produit_id: 11, produit_nom: 'Huile d’Olive Vierge Extra (Vrac Cuve Inox)', quantite: 45, unite: 'L', cout_unitaire: 48.00, cout_total: 2160.00 },
      { produit_id: 12, produit_nom: 'Basilic Frais Feuille Bio (Producteur Chaouia)', quantite: 40, unite: 'KG', cout_unitaire: 22.00, cout_total: 880.00 },
      { produit_id: 15, produit_nom: 'Parmigiano Reggiano AOP Râpé Industrie 1KG', quantite: 12, unite: 'KG', cout_unitaire: 145.00, cout_total: 1740.00 },
      { produit_id: 21, produit_nom: 'Pot en Verre Rond 212ml avec Capsule Dorée Twist-Off', quantite: 500, unite: 'U', cout_unitaire: 2.10, cout_total: 1050.00 },
      { produit_id: 23, produit_nom: 'Carton Double Cannelure Impression Agro-Atlas (x12 pots)', quantite: 42, unite: 'U', cout_unitaire: 3.20, cout_total: 134.40 }
    ],
    cout_matieres_estime: 5964.40,
    cout_main_oeuvre_estime: 950.00, // 2 ouvriers x 1 jour
    frais_generaux_estime: 450.00,  // Énergie, vapeur, nettoyage NEP
    cout_revient_unitaire: 14.73,   // (5964.40 + 950 + 450) / 500 = 14.73 DH HT
    notes: 'Pasteurisation douce à 85°C pendant 15 minutes pour préserver la chlorophylle.'
  },
  {
    id: 2,
    code: 'BOM-HUILE-PIM-300',
    nom: 'Lot de 300 Bouteilles Huile Piment & Thym 500ml',
    produit_fini_id: 2,
    produit_fini_nom: 'Huile d’Olive Aromatisée Piment & Thym Sauvage 500ml',
    quantite_produite: 300,
    unite: 'BOUT',
    version: '1.4',
    actif: true,
    composants: [
      { produit_id: 11, produit_nom: 'Huile d’Olive Vierge Extra (Vrac Cuve Inox)', quantite: 155, unite: 'L', cout_unitaire: 48.00, cout_total: 7440.00 },
      { produit_id: 22, produit_nom: 'Bouteille Marasca Verre Teinté Anti-UV 500ml avec Bouchon Verseur', quantite: 300, unite: 'U', cout_unitaire: 3.80, cout_total: 1140.00 },
      { produit_id: 23, produit_nom: 'Carton Double Cannelure Impression Agro-Atlas (x12 pots)', quantite: 25, unite: 'U', cout_unitaire: 3.20, cout_total: 80.00 }
    ],
    cout_matieres_estime: 8660.00,
    cout_main_oeuvre_estime: 480.00,
    frais_generaux_estime: 220.00,
    cout_revient_unitaire: 31.20,
    notes: 'Macération à froid 72 heures sous azote.'
  },
  {
    id: 3,
    code: 'BOM-TAPENADE-600',
    nom: 'Lot de 600 Pots de Tapenade Noire 180g',
    produit_fini_id: 3,
    produit_fini_nom: 'Tapenade Noire aux Olives de Marrakech 180g',
    quantite_produite: 600,
    unite: 'POT',
    version: '1.2',
    actif: true,
    composants: [
      { produit_id: 13, produit_nom: 'Olives Noires Façon Grèce Dénoyautées (Seau 10KG)', quantite: 95, unite: 'KG', cout_unitaire: 18.50, cout_total: 1757.50 },
      { produit_id: 11, produit_nom: 'Huile d’Olive Vierge Extra (Vrac Cuve Inox)', quantite: 20, unite: 'L', cout_unitaire: 48.00, cout_total: 960.00 },
      { produit_id: 21, produit_nom: 'Pot en Verre Rond 212ml avec Capsule Dorée Twist-Off', quantite: 600, unite: 'U', cout_unitaire: 2.10, cout_total: 1260.00 },
      { produit_id: 23, produit_nom: 'Carton Double Cannelure Impression Agro-Atlas (x12 pots)', quantite: 50, unite: 'U', cout_unitaire: 3.20, cout_total: 160.00 }
    ],
    cout_matieres_estime: 4137.50,
    cout_main_oeuvre_estime: 650.00,
    frais_generaux_estime: 300.00,
    cout_revient_unitaire: 8.48,
    notes: 'Broyage fin au cutter industriel sous vide.'
  }
];

// -----------------------------------------------------------------------------
// 7. IMMOBILISATIONS (ACTIF IMMOBILISÉ PCGM CLASSE 2)
// -----------------------------------------------------------------------------
export const CASA_ASSETS_2026: FixedAsset[] = [
  {
    id: 1,
    code: 'IMM-LIGNE-CUISSON',
    designation: 'Ligne Industrielle de Cuisson et Stérilisation NEP 500L',
    compte_immobilisation: '2332', // Matériel et outillage
    compte_amortissement: '2833',
    compte_dotation: '6193',
    valeur_acquisition: 380000,
    date_acquisition: '2024-01-15',
    date_mise_service: '2024-02-01',
    duree_annees: 10,
    methode: 'lineaire',
    taux: 10,
    amortissements_cumules: 76000, // 2 ans
    vna: 304000,
    statut: 'en_service'
  },
  {
    id: 2,
    code: 'IMM-FOURGON-FRIGO',
    designation: 'Fourgon Frigorifique Isotherme Isuzu 3.5T (+4°C)',
    compte_immobilisation: '2340', // Matériel de transport
    compte_amortissement: '2834',
    compte_dotation: '6193',
    valeur_acquisition: 260000,
    date_acquisition: '2024-06-10',
    date_mise_service: '2024-06-15',
    duree_annees: 5,
    methode: 'lineaire',
    taux: 20,
    amortissements_cumules: 86666.66,
    vna: 173333.34,
    statut: 'en_service'
  },
  {
    id: 3,
    code: 'IMM-SERVEUR-ERP',
    designation: 'Serveur Dell PowerEdge & Équipement Réseau Blindé',
    compte_immobilisation: '2355', // Matériel informatique
    compte_amortissement: '2835',
    compte_dotation: '6193',
    valeur_acquisition: 65000,
    date_acquisition: '2025-01-10',
    date_mise_service: '2025-01-15',
    duree_annees: 3,
    methode: 'lineaire',
    taux: 33.33,
    amortissements_cumules: 21664.50,
    vna: 43335.50,
    statut: 'en_service'
  }
];

// -----------------------------------------------------------------------------
// BUILD COMPLETE REALISTIC CASABLANCA 2026 SNAPSHOT WITH ACCOUNTING
// -----------------------------------------------------------------------------
export function generateSubstantialCasa2026Dataset() {
  // 1. Production Orders (OFs) Completed & Ongoing
  const productionOrders: ProductionOrder[] = [
    {
      id: 1,
      numero: 'OF-2026-001',
      bom_id: 1,
      bom_nom: 'Lot de 500 Pots de Sauce Pesto 200g',
      produit_fini_id: 1,
      produit_fini_nom: 'Sauce Pesto Traditionnel au Basilic Marocain 200g',
      quantite_prevue: 500,
      quantite_reelle: 500,
      unite: 'POT',
      date_lancement: '2026-01-10',
      date_prevue_fin: '2026-01-11',
      date_cloture: '2026-01-11',
      responsable: 'OUZZANI MUSTAPHA',
      atelier: 'Atelier Cuisine & Cuisson Ain Sebaâ',
      status: 'termine',
      composants_consommes: CASA_BOMS_2026[0].composants.map(c => ({
        produit_id: c.produit_id,
        produit_nom: c.produit_nom,
        quantite_prevue: c.quantite,
        quantite_reelle: c.quantite,
        unite: c.unite,
        cout_unitaire: c.cout_unitaire,
        cout_total: c.cout_total
      })),
      cout_matieres: 5964.40,
      cout_main_oeuvre: 950.00,
      cout_machines_ateliers: 450.00,
      cout_total_production: 7364.40,
      cout_revient_unitaire: 14.73,
      stock_destocke: true,
      stock_entre: true,
      comptabilise: true,
      notes: 'Conforme test organoleptique et bactériologique.'
    },
    {
      id: 2,
      numero: 'OF-2026-002',
      bom_id: 2,
      bom_nom: 'Lot de 300 Bouteilles Huile Piment & Thym 500ml',
      produit_fini_id: 2,
      produit_fini_nom: 'Huile d’Olive Aromatisée Piment & Thym Sauvage 500ml',
      quantite_prevue: 300,
      quantite_reelle: 300,
      unite: 'BOUT',
      date_lancement: '2026-01-20',
      date_prevue_fin: '2026-01-22',
      date_cloture: '2026-01-22',
      responsable: 'OUZZANI MUSTAPHA',
      atelier: 'Atelier Macération & Conditionnement',
      status: 'termine',
      composants_consommes: CASA_BOMS_2026[1].composants.map(c => ({
        produit_id: c.produit_id,
        produit_nom: c.produit_nom,
        quantite_prevue: c.quantite,
        quantite_reelle: c.quantite,
        unite: c.unite,
        cout_unitaire: c.cout_unitaire,
        cout_total: c.cout_total
      })),
      cout_matieres: 8660.00,
      cout_main_oeuvre: 480.00,
      cout_machines_ateliers: 220.00,
      cout_total_production: 9360.00,
      cout_revient_unitaire: 31.20,
      stock_destocke: true,
      stock_entre: true,
      comptabilise: true,
      notes: 'Filtration impeccable, belle robe dorée.'
    },
    {
      id: 3,
      numero: 'OF-2026-003',
      bom_id: 3,
      bom_nom: 'Lot de 600 Pots de Tapenade Noire 180g',
      produit_fini_id: 3,
      produit_fini_nom: 'Tapenade Noire aux Olives de Marrakech 180g',
      quantite_prevue: 600,
      quantite_reelle: 600,
      unite: 'POT',
      date_lancement: '2026-02-05',
      date_prevue_fin: '2026-02-06',
      date_cloture: '2026-02-06',
      responsable: 'OUZZANI MUSTAPHA',
      atelier: 'Atelier Broyage & Mise sous vide',
      status: 'termine',
      composants_consommes: CASA_BOMS_2026[2].composants.map(c => ({
        produit_id: c.produit_id,
        produit_nom: c.produit_nom,
        quantite_prevue: c.quantite,
        quantite_reelle: c.quantite,
        unite: c.unite,
        cout_unitaire: c.cout_unitaire,
        cout_total: c.cout_total
      })),
      cout_matieres: 4137.50,
      cout_main_oeuvre: 650.00,
      cout_machines_ateliers: 300.00,
      cout_total_production: 5087.50,
      cout_revient_unitaire: 8.48,
      stock_destocke: true,
      stock_entre: true,
      comptabilise: true,
      notes: 'Dégustation validée par le service qualité.'
    },
    {
      id: 4,
      numero: 'OF-2026-004',
      bom_id: 1,
      bom_nom: 'Lot de 500 Pots de Sauce Pesto 200g',
      produit_fini_id: 1,
      produit_fini_nom: 'Sauce Pesto Traditionnel au Basilic Marocain 200g',
      quantite_prevue: 500,
      quantite_reelle: 0,
      unite: 'POT',
      date_lancement: '2026-02-28',
      date_prevue_fin: '2026-03-02',
      responsable: 'BERRADA YASSINE',
      atelier: 'Atelier Cuisine & Cuisson Ain Sebaâ',
      status: 'en_cours',
      composants_consommes: CASA_BOMS_2026[0].composants.map(c => ({
        produit_id: c.produit_id,
        produit_nom: c.produit_nom,
        quantite_prevue: c.quantite,
        quantite_reelle: 0,
        unite: c.unite,
        cout_unitaire: c.cout_unitaire,
        cout_total: c.cout_total
      })),
      cout_matieres: 5964.40,
      cout_main_oeuvre: 950.00,
      cout_machines_ateliers: 450.00,
      cout_total_production: 7364.40,
      cout_revient_unitaire: 14.73,
      stock_destocke: false,
      stock_entre: false,
      comptabilise: false,
      notes: 'Cuisson planifiée pour le début de matinée.'
    }
  ];

  // 2. Factures Fournisseurs (Achats réels de matières premières, cartons et fret)
  const facturesFournisseurs: FactureFournisseur[] = [
    {
      id: 1,
      numero: 'FAC-SOUSS-0841',
      fournisseur_id: 101,
      fournisseur_nom: 'LES HUILERIES DU SOUSS S.A',
      fournisseur_ice: '000189402000054',
      date_facture: '2026-01-05',
      date_echeance: '2026-02-05',
      total_ht: 48000.00, // 1000L @ 48 DH
      tva_20: 9600.00,
      tva_10: 0,
      tva_7: 0,
      total_tva: 9600.00,
      total_ttc: 57600.00,
      montant_paye: 57600.00,
      reste_a_payer: 0,
      statut: 'Payée',
      etat: 'Validé',
      designation_achat: 'Livraison Citerne 1000L Huile d’olive vierge extra Souss',
      notes: 'Payé par Virement bancaire n° VIR-2026-001',
      lignes: [
        {
          id: 1,
          produit_id: 11,
          designation: 'Huile d’Olive Vierge Extra (Vrac Cuve Inox)',
          quantite: 1000,
          prix_achat_ht: 48.00,
          taux_tva: 20,
          total_ht: 48000.00,
          total_tva: 9600.00,
          total_ttc: 57600.00
        }
      ]
    },
    {
      id: 2,
      numero: 'FAC-CARTON-4912',
      fournisseur_id: 102,
      fournisseur_nom: 'CARTONNERIES DU MAROC S.A (Gharb & Casa)',
      fournisseur_ice: '001594830000072',
      date_facture: '2026-01-08',
      date_echeance: '2026-02-08',
      total_ht: 16000.00, // 5000 cartons @ 3.20 DH
      tva_20: 3200.00,
      tva_10: 0,
      tva_7: 0,
      total_tva: 3200.00,
      total_ttc: 19200.00,
      montant_paye: 19200.00,
      reste_a_payer: 0,
      statut: 'Payée',
      etat: 'Validé',
      designation_achat: '5000 Cartons d’expédition double cannelure personnalisés',
      notes: 'Chèque n° CHQ-7788102 débité',
      lignes: [
        {
          id: 2,
          produit_id: 23,
          designation: 'Carton Double Cannelure Impression Agro-Atlas (x12 pots)',
          quantite: 5000,
          prix_achat_ht: 3.20,
          taux_tva: 20,
          total_ht: 16000.00,
          total_tva: 3200.00,
          total_ttc: 19200.00
        }
      ]
    },
    {
      id: 3,
      numero: 'FAC-PLAST-3019',
      fournisseur_id: 103,
      fournisseur_nom: 'PLASTIQUE & EMBALLAGES DU MAGHREB (Tit Mellil)',
      fournisseur_ice: '001849201000039',
      date_facture: '2026-01-12',
      date_echeance: '2026-03-12',
      total_ht: 21400.00,
      tva_20: 4280.00,
      tva_10: 0,
      tva_7: 0,
      total_tva: 4280.00,
      total_ttc: 25680.00,
      montant_paye: 0,
      reste_a_payer: 25680.00,
      statut: 'A payer',
      etat: 'Validé',
      designation_achat: 'Pots en verre 212ml et bouteilles Marasca 500ml',
      notes: 'À régler fin mars par virement Swift.',
      lignes: [
        {
          id: 3,
          produit_id: 21,
          designation: 'Pot en Verre Rond 212ml avec Capsule Dorée Twist-Off',
          quantite: 5000,
          prix_achat_ht: 2.10,
          taux_tva: 20,
          total_ht: 10500.00,
          total_tva: 2100.00,
          total_ttc: 12600.00
        },
        {
          id: 4,
          produit_id: 22,
          designation: 'Bouteille Marasca Verre Teinté Anti-UV 500ml avec Bouchon Verseur',
          quantite: 2868,
          prix_achat_ht: 3.80,
          taux_tva: 20,
          total_ht: 10900.00,
          total_tva: 2180.00,
          total_ttc: 13080.00
        }
      ]
    },
    {
      id: 4,
      numero: 'FAC-EPICE-1120',
      fournisseur_id: 104,
      fournisseur_nom: 'COMPTOIR DES ÉPICES ET CONDIMENTS DU MAROC',
      fournisseur_ice: '000294810000023',
      date_facture: '2026-02-01',
      date_echeance: '2026-03-01',
      total_ht: 18500.00,
      tva_20: 3700.00,
      tva_10: 0,
      tva_7: 0,
      total_tva: 3700.00,
      total_ttc: 22200.00,
      montant_paye: 10000.00,
      reste_a_payer: 12200.00,
      statut: 'Partiel',
      etat: 'Validé',
      designation_achat: 'Olives noires Haouz et herbes aromatiques de l’Atlas',
      notes: 'Acompte de 10 000 DH versé par virement bancaire.',
      lignes: [
        {
          id: 5,
          produit_id: 13,
          designation: 'Olives Noires Façon Grèce Dénoyautées (Seau 10KG)',
          quantite: 1000,
          prix_achat_ht: 18.50,
          taux_tva: 20,
          total_ht: 18500.00,
          total_tva: 3700.00,
          total_ttc: 22200.00
        }
      ]
    }
  ];

  // 3. Paiements Fournisseurs (Décaissements banques)
  const paiementsFournisseurs: PaiementFournisseur[] = [
    {
      id: 1,
      fournisseur_id: 101,
      fournisseur_nom: 'LES HUILERIES DU SOUSS S.A',
      facture_fournisseur_id: 1,
      facture_numero: 'FAC-SOUSS-0841',
      date_paiement: '2026-01-25',
      montant: 57600.00,
      mode_paiement: 'Virement',
      numero_cheque_ref: 'VIR-ATW-20260125-01',
      banque_emettrice: 'Attijariwafa Bank',
      statut_cheque: 'Déposé / Débité',
      notes: 'Règlement solde total facture huile d’olive.'
    },
    {
      id: 2,
      fournisseur_id: 102,
      fournisseur_nom: 'CARTONNERIES DU MAROC S.A (Gharb & Casa)',
      facture_fournisseur_id: 2,
      facture_numero: 'FAC-CARTON-4912',
      date_paiement: '2026-01-30',
      montant: 19200.00,
      mode_paiement: 'Chèque',
      numero_cheque_ref: 'CHQ-7788102',
      banque_emettrice: 'Attijariwafa Bank',
      date_echeance_depot: '2026-02-05',
      statut_cheque: 'Déposé / Débité',
      notes: 'Chèque encaissé par le fournisseur.'
    },
    {
      id: 3,
      fournisseur_id: 104,
      fournisseur_nom: 'COMPTOIR DES ÉPICES ET CONDIMENTS DU MAROC',
      facture_fournisseur_id: 4,
      facture_numero: 'FAC-EPICE-1120',
      date_paiement: '2026-02-15',
      montant: 10000.00,
      mode_paiement: 'Virement',
      numero_cheque_ref: 'VIR-ATW-20260215-04',
      banque_emettrice: 'Attijariwafa Bank',
      statut_cheque: 'Déposé / Débité',
      notes: 'Acompte 10 000 DH.'
    }
  ];

  // 4. Bons de Livraison (BLs) - Plusieurs BLs consolidés ensuite en factures
  const bonsLivraison: BonLivraison[] = [
    // BLs pour Marjane Holding
    {
      id: 1,
      numero: 'BL000101/26',
      date: '2026-01-15',
      client_id: 1,
      client_nom: 'MARJANE HOLDING S.A (Sidi Maârouf)',
      client_ice: '001528491000045',
      client_adresse: 'Route de Nouaceur, Lotissement La Colline II, Sidi Maârouf',
      client_ville: 'Casablanca',
      total_ht: 14250.00, // 500 pots Pesto @ 28.50 DH
      tva_20: 2850.00,
      tva_10: 0,
      total_tva: 2850.00,
      total_ttc: 17100.00,
      montant_brut: 14250.00,
      remise_pct: 0,
      ristourne_pct: 0,
      escompte_pct: 0,
      port: 0,
      statut: 'Facturé',
      etat: 'Validé',
      facture_id: 1,
      facture_numero: 'FA00001/26',
      mode_reglement: 'Virement',
      notes: 'Livraison centrale plateforme frigorifique Marjane.',
      created_at: '2026-01-15T09:30:00Z',
      lignes: [
        {
          id: 1,
          bon_livraison_id: 1,
          produit_id: 1,
          designation: 'Sauce Pesto Traditionnel au Basilic Marocain 200g',
          groupe: 'PRODUIT_FINI',
          unite: 'POT',
          quantite: 500,
          prix_ht: 28.50,
          taux_tva: 20,
          remise_pct: 0,
          total_ht: 14250.00,
          total_tva: 2850.00,
          total_ttc: 17100.00
        }
      ]
    },
    {
      id: 2,
      numero: 'BL000102/26',
      date: '2026-01-25',
      client_id: 1,
      client_nom: 'MARJANE HOLDING S.A (Sidi Maârouf)',
      client_ice: '001528491000045',
      client_adresse: 'Route de Nouaceur, Lotissement La Colline II, Sidi Maârouf',
      client_ville: 'Casablanca',
      total_ht: 13500.00, // 300 bouteilles Huile Piment @ 45 DH
      tva_20: 2700.00,
      tva_10: 0,
      total_tva: 2700.00,
      total_ttc: 16200.00,
      montant_brut: 13500.00,
      remise_pct: 0,
      ristourne_pct: 0,
      escompte_pct: 0,
      port: 0,
      statut: 'Facturé',
      etat: 'Validé',
      facture_id: 1,
      facture_numero: 'FA00001/26',
      mode_reglement: 'Virement',
      notes: 'Deuxième livraison mensuelle Marjane.',
      created_at: '2026-01-25T10:15:00Z',
      lignes: [
        {
          id: 2,
          bon_livraison_id: 2,
          produit_id: 2,
          designation: 'Huile d’Olive Aromatisée Piment & Thym Sauvage 500ml',
          groupe: 'PRODUIT_FINI',
          unite: 'BOUT',
          quantite: 300,
          prix_ht: 45.00,
          taux_tva: 20,
          remise_pct: 0,
          total_ht: 13500.00,
          total_tva: 2700.00,
          total_ttc: 16200.00
        }
      ]
    },

    // BL pour LabelVie Carrefour
    {
      id: 3,
      numero: 'BL000103/26',
      date: '2026-02-02',
      client_id: 2,
      client_nom: 'LABEL VIE S.A - CARREFOUR MARKET (Gauthier)',
      client_ice: '000034982000012',
      client_adresse: 'Angle Boulevard Moulay Youssef et Rue d’Alger, Quartier Gauthier',
      client_ville: 'Casablanca',
      total_ht: 13200.00, // 600 pots Tapenade @ 22 DH
      tva_20: 2640.00,
      tva_10: 0,
      total_tva: 2640.00,
      total_ttc: 15840.00,
      montant_brut: 13200.00,
      remise_pct: 0,
      ristourne_pct: 0,
      escompte_pct: 0,
      port: 0,
      statut: 'Facturé',
      etat: 'Validé',
      facture_id: 2,
      facture_numero: 'FA00002/26',
      mode_reglement: 'Virement',
      notes: 'Livraison réceptionnée par chef de rayon.',
      created_at: '2026-02-02T08:00:00Z',
      lignes: [
        {
          id: 3,
          bon_livraison_id: 3,
          produit_id: 3,
          designation: 'Tapenade Noire aux Olives de Marrakech 180g',
          groupe: 'PRODUIT_FINI',
          unite: 'POT',
          quantite: 600,
          prix_ht: 22.00,
          taux_tva: 20,
          remise_pct: 0,
          total_ht: 13200.00,
          total_tva: 2640.00,
          total_ttc: 15840.00
        }
      ]
    },

    // BL pour Hyatt Regency Casablanca
    {
      id: 4,
      numero: 'BL000104/26',
      date: '2026-02-12',
      client_id: 3,
      client_nom: 'HYATT REGENCY CASABLANCA (Hôtellerie & Restauration)',
      client_ice: '001928471000077',
      client_adresse: 'Place des Nations Unies, Centre-Ville',
      client_ville: 'Casablanca',
      total_ht: 9850.00,
      tva_20: 1970.00,
      tva_10: 0,
      total_tva: 1970.00,
      total_ttc: 11820.00,
      montant_brut: 9850.00,
      remise_pct: 0,
      ristourne_pct: 0,
      escompte_pct: 0,
      port: 0,
      statut: 'Facturé',
      etat: 'Validé',
      facture_id: 3,
      facture_numero: 'FA00003/26',
      mode_reglement: 'Chèque',
      notes: 'Commande traiteur banquet VIP.',
      created_at: '2026-02-12T11:00:00Z',
      lignes: [
        {
          id: 4,
          bon_livraison_id: 4,
          produit_id: 1,
          designation: 'Sauce Pesto Traditionnel au Basilic Marocain 200g',
          groupe: 'PRODUIT_FINI',
          unite: 'POT',
          quantite: 200,
          prix_ht: 28.50,
          taux_tva: 20,
          remise_pct: 0,
          total_ht: 5700.00,
          total_tva: 1140.00,
          total_ttc: 6840.00
        },
        {
          id: 5,
          bon_livraison_id: 4,
          produit_id: 4,
          designation: 'Confiture Artisanale Figues de Taounate au Miel d’Oranger 350g',
          groupe: 'PRODUIT_FINI',
          unite: 'POT',
          quantite: 129.6875,
          prix_ht: 32.00,
          taux_tva: 20,
          remise_pct: 0,
          total_ht: 4150.00,
          total_tva: 830.00,
          total_ttc: 4980.00
        }
      ]
    },

    // BL en attente (non encore facturé pour montrer le workflow)
    {
      id: 5,
      numero: 'BL000105/26',
      date: '2026-02-26',
      client_id: 5,
      client_nom: 'RESTO MAISON BLANCHE SARL (Bouskoura)',
      client_ice: '002019482000031',
      client_adresse: 'Zone Résidentielle Bouskoura Golf City, Villa 42',
      client_ville: 'Casablanca',
      total_ht: 4500.00, // 100 bouteilles Huile @ 45 DH
      tva_20: 900.00,
      tva_10: 0,
      total_tva: 900.00,
      total_ttc: 5400.00,
      montant_brut: 4500.00,
      remise_pct: 0,
      ristourne_pct: 0,
      escompte_pct: 0,
      port: 0,
      statut: 'En attente',
      etat: 'Validé',
      facture_id: null,
      facture_numero: null,
      mode_reglement: 'Chèque',
      notes: 'BL en attente de facturation fin de semaine.',
      created_at: '2026-02-26T14:30:00Z',
      lignes: [
        {
          id: 6,
          bon_livraison_id: 5,
          produit_id: 2,
          designation: 'Huile d’Olive Aromatisée Piment & Thym Sauvage 500ml',
          groupe: 'PRODUIT_FINI',
          unite: 'BOUT',
          quantite: 100,
          prix_ht: 45.00,
          taux_tva: 20,
          remise_pct: 0,
          total_ht: 4500.00,
          total_tva: 900.00,
          total_ttc: 5400.00
        }
      ]
    }
  ];

  // 5. Factures de Vente (Émises à partir des BLs)
  const factures: Facture[] = [
    // Facture 1 : Consolidant BL000101 et BL000102 pour Marjane
    {
      id: 1,
      numero: 'FA00001/26',
      date: '2026-01-31',
      client_id: 1,
      client_nom: 'MARJANE HOLDING S.A (Sidi Maârouf)',
      client_ice: '001528491000045',
      client_adresse: 'Route de Nouaceur, Lotissement La Colline II, Sidi Maârouf',
      client_ville: 'Casablanca',
      total_ht: 27750.00, // 14250 + 13500
      tva_20: 5550.00,
      tva_10: 0,
      total_tva: 5550.00,
      total_ttc: 33300.00,
      montant_regle: 33300.00,
      reste_a_payer: 0,
      statut_paiement: 'Soldé',
      etat: 'Validé',
      mode_reglement: 'Virement',
      notes: 'Facture mensuelle janvier 2026 - Conforme bon de commande Marjane PO-2026-781.',
      bl_associes: ['BL000101/26', 'BL000102/26'],
      created_at: '2026-01-31T17:00:00Z',
      lignes: [
        {
          id: 1,
          facture_id: 1,
          produit_id: 1,
          designation: 'Sauce Pesto Traditionnel au Basilic Marocain 200g (Réf BL000101/26)',
          groupe: 'PRODUIT_FINI',
          unite: 'POT',
          quantite: 500,
          prix_ht: 28.50,
          taux_tva: 20,
          remise_pct: 0,
          total_ht: 14250.00,
          total_tva: 2850.00,
          total_ttc: 17100.00
        },
        {
          id: 2,
          facture_id: 1,
          produit_id: 2,
          designation: 'Huile d’Olive Aromatisée Piment & Thym Sauvage 500ml (Réf BL000102/26)',
          groupe: 'PRODUIT_FINI',
          unite: 'BOUT',
          quantite: 300,
          prix_ht: 45.00,
          taux_tva: 20,
          remise_pct: 0,
          total_ht: 13500.00,
          total_tva: 2700.00,
          total_ttc: 16200.00
        }
      ]
    },

    // Facture 2 : Émise pour Carrefour Market
    {
      id: 2,
      numero: 'FA00002/26',
      date: '2026-02-05',
      client_id: 2,
      client_nom: 'LABEL VIE S.A - CARREFOUR MARKET (Gauthier)',
      client_ice: '000034982000012',
      client_adresse: 'Angle Boulevard Moulay Youssef et Rue d’Alger, Quartier Gauthier',
      client_ville: 'Casablanca',
      total_ht: 13200.00,
      tva_20: 2640.00,
      tva_10: 0,
      total_tva: 2640.00,
      total_ttc: 15840.00,
      montant_regle: 15840.00,
      reste_a_payer: 0,
      statut_paiement: 'Soldé',
      etat: 'Validé',
      mode_reglement: 'Virement',
      notes: 'Facture issue du BL000103/26.',
      bl_associes: ['BL000103/26'],
      created_at: '2026-02-05T10:00:00Z',
      lignes: [
        {
          id: 3,
          facture_id: 2,
          produit_id: 3,
          designation: 'Tapenade Noire aux Olives de Marrakech 180g (Réf BL000103/26)',
          groupe: 'PRODUIT_FINI',
          unite: 'POT',
          quantite: 600,
          prix_ht: 22.00,
          taux_tva: 20,
          remise_pct: 0,
          total_ht: 13200.00,
          total_tva: 2640.00,
          total_ttc: 15840.00
        }
      ]
    },

    // Facture 3 : Émise pour Hyatt Regency Casablanca (Paiement Partiel / En cours)
    {
      id: 3,
      numero: 'FA00003/26',
      date: '2026-02-15',
      client_id: 3,
      client_nom: 'HYATT REGENCY CASABLANCA (Hôtellerie & Restauration)',
      client_ice: '001928471000077',
      client_adresse: 'Place des Nations Unies, Centre-Ville',
      client_ville: 'Casablanca',
      total_ht: 9850.00,
      tva_20: 1970.00,
      tva_10: 0,
      total_tva: 1970.00,
      total_ttc: 11820.00,
      montant_regle: 6000.00,
      reste_a_payer: 5820.00,
      statut_paiement: 'Partiel',
      etat: 'Validé',
      mode_reglement: 'Chèque',
      notes: 'Acompte encaissé, solde à régler sous 30 jours.',
      bl_associes: ['BL000104/26'],
      created_at: '2026-02-15T15:00:00Z',
      lignes: [
        {
          id: 4,
          facture_id: 3,
          produit_id: 1,
          designation: 'Sauce Pesto Traditionnel au Basilic Marocain 200g',
          groupe: 'PRODUIT_FINI',
          unite: 'POT',
          quantite: 200,
          prix_ht: 28.50,
          taux_tva: 20,
          remise_pct: 0,
          total_ht: 5700.00,
          total_tva: 1140.00,
          total_ttc: 6840.00
        },
        {
          id: 5,
          facture_id: 3,
          produit_id: 4,
          designation: 'Confiture Artisanale Figues de Taounate au Miel d’Oranger 350g',
          groupe: 'PRODUIT_FINI',
          unite: 'POT',
          quantite: 129.6875,
          prix_ht: 32.00,
          taux_tva: 20,
          remise_pct: 0,
          total_ht: 4150.00,
          total_tva: 830.00,
          total_ttc: 4980.00
        }
      ]
    }
  ];

  // 6. Règlements Clients (Encaissements enregistrés)
  const reglements: Reglement[] = [
    {
      id: 1,
      piece_type: 'FACTURE',
      piece_id: 1,
      piece_numero: 'FA00001/26',
      facture_id: 1,
      facture_numero: 'FA00001/26',
      client_id: 1,
      client_nom: 'MARJANE HOLDING S.A (Sidi Maârouf)',
      date: '2026-02-10',
      montant: 33300.00,
      mode_reglement: 'Virement',
      mode: 'Virement',
      reference_paiement: 'VIR-MARJ-20260210',
      banque: 'Attijariwafa Bank',
      notes: 'Règlement intégral facture FA00001/26'
    },
    {
      id: 2,
      piece_type: 'FACTURE',
      piece_id: 2,
      piece_numero: 'FA00002/26',
      facture_id: 2,
      facture_numero: 'FA00002/26',
      client_id: 2,
      client_nom: 'LABEL VIE S.A - CARREFOUR MARKET (Gauthier)',
      date: '2026-02-18',
      montant: 15840.00,
      mode_reglement: 'Virement',
      mode: 'Virement',
      reference_paiement: 'VIR-LBV-20260218',
      banque: 'Attijariwafa Bank',
      notes: 'Règlement intégral facture FA00002/26'
    },
    {
      id: 3,
      piece_type: 'FACTURE',
      piece_id: 3,
      piece_numero: 'FA00003/26',
      facture_id: 3,
      facture_numero: 'FA00003/26',
      client_id: 3,
      client_nom: 'HYATT REGENCY CASABLANCA (Hôtellerie & Restauration)',
      date: '2026-02-20',
      montant: 6000.00,
      mode_reglement: 'Chèque',
      mode: 'Chèque',
      reference_paiement: 'CHQ-HYATT-849201',
      banque: 'BMCI BNP Paribas',
      notes: 'Acompte 50% sur facture FA00003/26'
    }
  ];

  // 7. Bulletins de Paie Marocains (Janvier 2026 - LF 2026)
  const payrolls: PayrollSlip[] = CASA_EMPLOYEES_2026.map((emp, i) => {
    return {
      ...calculateMoroccanPayroll({
        employee: emp,
        periode_mois: 1,
        periode_annee: 2026,
        primes: emp.id === 1 ? 4000 : emp.id === 3 ? 2500 : emp.id === 4 ? 1000 : 0
      }),
      id: i + 1,
      comptabilise: true
    };
  });

  // 8. Génération Rigoureuse de l'intégralité des Écritures Comptables (PCGM)
  const journalEntries: JournalEntry[] = [];
  let ecrIndex = 1;

  // A. Écritures de Vente (Journal VTE)
  factures.forEach((facture) => {
    const entry = generateSalesInvoiceJournalEntry(facture);
    journalEntries.push({
      ...entry,
      id: ecrIndex++,
      numero: `ECR-VTE-${String(ecrIndex).padStart(4, '0')}`,
      status: 'valide'
    });
  });

  // B. Écritures d'Achat (Journal ACH)
  facturesFournisseurs.forEach((ff) => {
    const entry = generatePurchaseInvoiceJournalEntry(ff as any);
    journalEntries.push({
      ...entry,
      id: ecrIndex++,
      numero: `ECR-ACH-${String(ecrIndex).padStart(4, '0')}`,
      status: 'valide'
    });
  });

  // C. Écritures de Règlements Clients (Journal BNQ)
  reglements.forEach((reg) => {
    const entry = generateClientPaymentJournalEntry(reg);
    journalEntries.push({
      ...entry,
      id: ecrIndex++,
      numero: `ECR-BNQ-${String(ecrIndex).padStart(4, '0')}`,
      status: 'valide'
    });
  });

  // D. Écritures de Paiements Fournisseurs (Journal BNQ)
  paiementsFournisseurs.forEach((pf) => {
    const entry = generateSupplierPaymentJournalEntry(pf);
    journalEntries.push({
      ...entry,
      id: ecrIndex++,
      numero: `ECR-BNQ-${String(ecrIndex).padStart(4, '0')}`,
      status: 'valide'
    });
  });

  // E. Écritures de Salaires & Charges Patronales (Journal PAIE)
  payrolls.forEach((pay) => {
    const entry = generatePayrollJournalEntry(pay);
    journalEntries.push({
      ...entry,
      id: ecrIndex++,
      numero: `ECR-PAIE-${String(ecrIndex).padStart(4, '0')}`,
      status: 'valide'
    });
  });

  // F. Écritures d'Ordres de Fabrication Terminés (Journal OD)
  productionOrders
    .filter((o) => o.status === 'termine')
    .forEach((order) => {
      const entry = generateProductionJournalEntry(order);
      journalEntries.push({
        ...entry,
        id: ecrIndex++,
        numero: `ECR-OD-${String(ecrIndex).padStart(4, '0')}`,
        status: 'valide'
      });
    });

  // G. Dotations aux Amortissements des Immobilisations (Journal IMM)
  CASA_ASSETS_2026.forEach((asset) => {
    const entry = generateDepreciationJournalEntry(asset, 2026);
    journalEntries.push({
      ...entry,
      id: ecrIndex++,
      numero: `ECR-IMM-${String(ecrIndex).padStart(4, '0')}`,
      status: 'valide'
    });
  });

  // 9. Mouvements de Stocks associés
  const stockMouvements: StockMouvement[] = [
    {
      id: 1,
      produit_id: 11,
      produit_nom: 'Huile d’Olive Vierge Extra (Vrac Cuve Inox)',
      date: '2026-01-05',
      type: 'ENTREE',
      quantite: 1000,
      reference_doc: 'FAC-SOUSS-0841',
      motif: 'Réception Citerne Huileries du Souss',
      stock_apres: 3500,
      created_at: '2026-01-05T14:00:00Z'
    },
    {
      id: 2,
      produit_id: 1,
      produit_nom: 'Sauce Pesto Traditionnel au Basilic Marocain 200g',
      date: '2026-01-11',
      type: 'ENTREE',
      quantite: 500,
      reference_doc: 'OF-2026-001',
      motif: 'Entrée fabrication atelier Ain Sebaâ',
      stock_apres: 850,
      created_at: '2026-01-11T16:00:00Z'
    },
    {
      id: 3,
      produit_id: 1,
      produit_nom: 'Sauce Pesto Traditionnel au Basilic Marocain 200g',
      date: '2026-01-15',
      type: 'SORTIE_BL',
      quantite: 500,
      reference_doc: 'BL000101/26',
      motif: 'Expédition Marjane Holding',
      stock_apres: 350,
      created_at: '2026-01-15T09:30:00Z'
    }
  ];

  // Update client balances
  CASA_CLIENTS_2026.forEach((c) => {
    const clientFactures = factures.filter((f) => f.client_id === c.id);
    c.total_achats = clientFactures.reduce((s, f) => s + f.total_ttc, 0);
    c.solde = clientFactures.reduce((s, f) => s + f.reste_a_payer, 0);
    c.bl_non_factures_count = bonsLivraison.filter((b) => b.client_id === c.id && b.statut === 'En attente').length;
  });

  // Update supplier balances
  CASA_FOURNISSEURS_2026.forEach((f) => {
    const suppFactures = facturesFournisseurs.filter((ff) => ff.fournisseur_id === f.id);
    f.total_achats = suppFactures.reduce((s, ff) => s + ff.total_ttc, 0);
    f.solde_du = suppFactures.reduce((s, ff) => s + ff.reste_a_payer, 0);
  });

  return {
    company: CASA_COMPANY_2026,
    clients: CASA_CLIENTS_2026,
    fournisseurs: CASA_FOURNISSEURS_2026,
    produits: CASA_PRODUITS_2026,
    bons_livraison: bonsLivraison,
    bons_retour: [],
    factures: factures,
    factures_fournisseurs: facturesFournisseurs,
    paiements_fournisseurs: paiementsFournisseurs,
    reglements: reglements,
    devis: [],
    stock_mouvements: stockMouvements,
    employees: CASA_EMPLOYEES_2026,
    payrolls: payrolls,
    leaves: [
      {
        id: 1,
        employee_id: 5,
        employee_name: 'BERRADA YASSINE',
        type: 'annuel',
        date_debut: '2026-02-15',
        date_fin: '2026-02-20',
        jours: 5,
        motif: 'Congé annuel légal de repos',
        statut: 'approuve'
      }
    ],
    boms: CASA_BOMS_2026,
    production_orders: productionOrders,
    fixed_assets: CASA_ASSETS_2026,
    journal_entries: journalEntries
  };
}
