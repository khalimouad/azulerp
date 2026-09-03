export type DocumentState = 'Brouillon' | 'Validé' | 'Annulé';
export type DocumentStatus = 'draft' | 'pending' | 'invoiced' | 'partially_paid' | 'paid' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';
export type PaymentMethod = 'Virement' | 'Chèque' | 'Espèces' | 'Traite' | 'Carte Bancaire';

export interface CompanyInfo {
  id?: number;
  nom: string;
  forme_juridique?: string;
  capital?: string;
  adresse: string;
  adresse_detail?: string;
  code_postal: string;
  ville: string;
  pays: string;
  telephone: string;
  fax?: string;
  email: string;
  site_web?: string;
  ice: string; // Identifiant Commun de l'Entreprise
  if_fiscal: string;
  rc: string; // Registre de Commerce
  cnss: string;
  patente: string;
  agrement_onssa?: string;
  partenaire_coop?: string;
  logo_titre?: string;
  logo_sous_titre?: string;
  logo_image?: string; // Base64 data URL of uploaded company logo
  logo_mode?: 'logo_only' | 'text_only' | 'both';
  logo_placement?: 'left' | 'center';
  banque?: string;
  rib: string;
}

export interface Categorie {
  id: number;
  code?: string;
  nom?: string;
  libelle?: string;
  description?: string;
  created_at?: string;
}

export interface Famille {
  id: number;
  code?: string;
  nom?: string;
  libelle?: string;
  categorie?: string;
  categorie_code?: string;
  categorie_id?: number;
  categorie_libelle?: string;
  description?: string;
  created_at?: string;
}

export interface Marque {
  id: number;
  code?: string;
  nom?: string;
  libelle?: string;
  description?: string;
  created_at?: string;
}

export interface Client {
  id: number;
  code: string;
  nom: string;
  interlocuteur?: string;
  adresse?: string;
  code_postal?: string;
  ville?: string;
  pays?: string;
  telephone?: string;
  mobile?: string;
  fax?: string;
  email?: string;
  site_web?: string;
  ice?: string;
  observations?: string;
  notes?: string;
  solde?: number;
  total_achats?: number;
  bl_non_factures_count?: number;
  created_at?: string;
}

export interface ClientTarif {
  id: number;
  client_id: number;
  produit_id: number;
  produit_code?: string;
  produit_libelle?: string;
  produit_unite?: string;
  prix_standard_ht?: number;
  prix_special_ht: number;
  remise_pct?: number;
  taux_tva?: number;
  notes?: string;
  created_at?: string;
}

export interface Fournisseur {
  id: number;
  code?: string;
  nom: string;
  interlocuteur?: string;
  adresse?: string;
  code_postal?: string;
  ville?: string;
  telephone?: string;
  gsm?: string;
  mobile?: string;
  fax?: string;
  email?: string;
  ice?: string;
  observations?: string;
  notes?: string;
  solde_du?: number;
  total_achats?: number;
  created_at?: string;
}

export interface FactureFournisseurLigne {
  id?: number;
  facture_fournisseur_id?: number;
  produit_id?: number;
  designation: string;
  quantite: number;
  prix_achat_ht: number;
  taux_tva?: number;
  total_ht?: number;
  total_tva?: number;
  total_ttc?: number;
}

export interface FactureFournisseur {
  id: number;
  numero: string; // e.g. FF00042/26 or Ref Fournisseur
  fournisseur_id: number;
  fournisseur_nom: string;
  fournisseur_ice?: string;
  date_facture: string; // YYYY-MM-DD
  date_echeance?: string; // YYYY-MM-DD
  total_ht: number;
  tva_20: number;
  tva_10: number;
  tva_7: number;
  total_tva: number;
  total_ttc: number;
  montant_paye: number;
  reste_a_payer: number;
  statut: 'A payer' | 'Partiel' | 'Payée' | 'En retard';
  etat?: DocumentState; // 'Brouillon' | 'Validé' | 'Annulé'
  designation_achat?: string;
  notes?: string;
  lignes?: FactureFournisseurLigne[];
  created_at?: string;
}

export interface PaiementFournisseur {
  id: number;
  fournisseur_id: number;
  fournisseur_nom: string;
  facture_fournisseur_id?: number | null;
  facture_numero?: string | null;
  date_paiement: string; // YYYY-MM-DD
  montant: number;
  mode_paiement: 'Chèque' | 'Virement' | 'Traite / Effet' | 'Espèces' | 'Prélèvement';
  numero_cheque_ref?: string;
  banque_emettrice?: string;
  date_echeance_depot?: string; // Échéance de dépôt du chèque émis
  statut_cheque?: 'En attente' | 'Déposé / Débité' | 'Annulé';
  notes?: string;
  created_at?: string;
}

export interface ChequeFournisseurAlert {
  paiement: PaiementFournisseur;
  jours_restants: number;
  est_imminent: boolean; // <= 4 jours
  est_en_retard: boolean; // < 0 jours
}

export interface SupplierReconciliation {
  fournisseur: Fournisseur;
  total_factures_ttc: number;
  total_paye: number;
  solde_du: number;
  cheques_en_circulation_montant: number;
  cheques_en_circulation_count: number;
  factures: FactureFournisseur[];
  paiements: PaiementFournisseur[];
}

export interface Produit {
  id: number;
  code: string;
  libelle: string;
  groupe?: string;
  famille?: string;
  unite?: string; // KG, U, UN, L, PACK, MTR
  taux_tva: number; // 0, 10, 20
  prix_ht: number;
  prix_achat?: number;
  prix_achat_ht?: number;
  stock_actuel: number;
  stock_min: number;
  stock_virtuel: number;
  description?: string;
  created_at?: string;
}

export interface LineItem {
  id?: number;
  bon_livraison_id?: number;
  facture_id?: number;
  devis_id?: number;
  produit_id?: number;
  designation: string;
  groupe?: string;
  unite?: string; // KG, U, UN, L, PACK, MTR, etc.
  quantite: number;
  prix_ht: number;
  taux_tva?: number;
  remise_pct?: number;
  total_ht?: number;
  total_tva?: number;
  total_ttc?: number;
}

export type BonLivraisonLigne = LineItem;
export type BonRetourLigne = LineItem;
export type FactureLigne = LineItem;
export type DevisLigne = LineItem;

export interface BonLivraison {
  id: number;
  numero: string; // e.g. BL000124/26
  date: string; // YYYY-MM-DD
  client_id: number;
  client_nom: string;
  client_ice?: string;
  client_adresse?: string;
  client_ville?: string;
  total_ht: number;
  tva_20: number;
  tva_10: number;
  total_tva: number;
  total_ttc: number;
  montant_brut: number;
  remise_pct: number;
  ristourne_pct: number;
  escompte_pct: number;
  port: number;
  statut: 'En attente' | 'Facturé' | 'Partiel' | 'Soldé' | 'Clôturé';
  etat?: DocumentState; // 'Brouillon' | 'Validé' | 'Annulé'
  cloture_sans_facture?: boolean;
  facture_id?: number | null;
  facture_numero?: string | null;
  mode_reglement?: string;
  notes?: string;
  lignes?: LineItem[];
  created_at: string;
}

export interface BonRetour {
  id: number;
  numero: string; // e.g. BR000001/26
  date: string; // YYYY-MM-DD
  client_id: number;
  client_nom: string;
  client_ice?: string;
  client_adresse?: string;
  client_ville?: string;
  total_ht: number;
  tva_20: number;
  tva_10: number;
  total_tva: number;
  total_ttc: number;
  motif?: string;
  statut: 'En attente' | 'Facturé' | 'Soldé';
  etat?: DocumentState; // 'Brouillon' | 'Validé' | 'Annulé'
  facture_id?: number | null;
  facture_numero?: string | null;
  mode_reglement?: string;
  notes?: string;
  lignes?: LineItem[];
  created_at: string;
}

export interface Facture {
  id: number;
  numero: string; // e.g. FA000058/26
  date: string; // YYYY-MM-DD
  client_id: number;
  client_nom: string;
  client_ice?: string;
  client_adresse?: string;
  client_ville?: string;
  total_ht: number;
  tva_20: number;
  tva_10: number;
  total_tva: number;
  total_ttc: number;
  montant_regle: number;
  reste_a_payer: number;
  statut_paiement: 'Soldé' | 'Partiel' | 'Impayé';
  etat?: DocumentState; // 'Brouillon' | 'Validé' | 'Annulé'
  mode_reglement: string;
  notes?: string;
  bl_associes?: string[]; // list of BL numbers e.g. ['BL000124/26', 'BL000125/26']
  br_associes?: string[]; // list of Bon de retour numbers e.g. ['BR000001/26']
  lignes?: LineItem[];
  created_at: string;
}

export interface Devis {
  id: number;
  numero: string; // e.g. DEV000015/26
  date: string;
  date_validite: string;
  client_id: number;
  client_nom: string;
  client_ice?: string;
  client_adresse?: string;
  client_ville?: string;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  statut: 'Brouillon' | 'Envoyé' | 'Accepté' | 'Refusé';
  notes?: string;
  lignes?: LineItem[];
  created_at: string;
}

export interface Reglement {
  id: number;
  piece_type?: 'FACTURE' | 'BL';
  piece_id?: number;
  piece_numero?: string;
  facture_id?: number;
  facture_numero?: string;
  client_id: number;
  client_nom: string;
  date: string;
  montant: number;
  mode_reglement?: PaymentMethod | string;
  mode?: string;
  reference_paiement?: string;
  banque?: string;
  notes?: string;
  created_at?: string;
}

export interface StockMouvement {
  id: number;
  produit_id: number;
  produit_nom: string;
  date: string;
  type: 'ENTREE' | 'SORTIE_BL' | 'AJUSTEMENT' | 'RETOUR';
  quantite: number;
  reference_doc: string;
  motif: string;
  stock_apres: number;
  created_at: string;
}

export interface DashboardStats {
  total_facture_ht: number;
  total_facture_ttc: number;
  total_encaisse: number;
  total_impaye: number;
  factures_count: number;
  bl_en_attente_count: number;
  bl_en_attente_total: number;
  br_en_attente_count?: number;
  br_en_attente_total?: number;
  clients_count: number;
  produits_count?: number;
  fournisseurs_count?: number;
  familles_count?: number;
  categories_count?: number;
  stock_alerts_count: number;
}

// ----------------------------------------------------
// RESTAURANT POS (POINT DE VENTE & PLAN DE SALLE) INTERFACES
// ----------------------------------------------------

export interface PosTable {
  id: number;
  numero: string; // e.g. "Table 1", "T-02", "Terrasse 1", "VIP-1", "Comptoir"
  nom: string;
  zone: string; // 'Salle Principale', 'Terrasse Extérieure', 'Salon VIP / Étage', 'Comptoir / À Emporter'
  capacite: number; // Max seats
  statut: 'LIBRE' | 'OCCUPEE' | 'ADDITION' | 'RESERVEE';
  serveur?: string;
  nb_couverts: number;
  montant_en_cours: number;
  heure_ouverture?: string;
  commande_json?: string; // Serialized PosCartItem[] draft
  notes?: string;
  created_at?: string;
}

export interface PosCategory {
  id: number;
  code: string;
  nom: string;
  icone?: string;
  couleur?: string;
  ordre?: number;
  created_at?: string;
}

export interface PosProduct {
  id: number;
  code: string;
  nom: string;
  description?: string; // Ingrédients / composition
  categorie_id?: number;
  categorie_nom?: string;
  prix_vente_ttc: number;
  taux_tva: number; // 20, 10, 0
  temps_preparation_min?: number;
  disponible: number | boolean; // 1: En cuisine, 0: Rupture momentanée
  image_url?: string;
  couleur?: string;
  actif: number | boolean; // 1: active, 0: inactive
  created_at?: string;
}

export interface PosCartItem {
  produit_id: number;
  produit_code: string;
  produit_nom: string;
  prix_unitaire_ttc: number;
  taux_tva: number;
  quantite: number;
  remise_pct: number;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  notes?: string; // e.g. "Sans oignons", "Cuisson saignante", "Bien cuit", "Sauce à part"
  suite?: boolean; // Envoyer en suite / plat après entrée
}

export interface PosSession {
  id: number;
  numero_session: string;
  service?: 'MIDI' | 'SOIR' | 'JOURNEE' | string;
  caissier: string;
  date_ouverture: string;
  date_cloture?: string;
  fond_caisse_ouverture: number;
  total_ventes: number;
  total_especes: number;
  total_carte: number;
  total_cheque: number;
  total_autre: number;
  nb_tickets: number;
  total_couverts?: number;
  montant_reel_cloture?: number;
  ecart_caisse?: number;
  statut: 'OUVERTE' | 'CLOTUREE';
  notes?: string;
  created_at?: string;
}

export interface PosSaleLine {
  id?: number;
  vente_id?: number;
  produit_id?: number;
  produit_code?: string;
  produit_nom: string;
  prix_unitaire_ttc: number;
  taux_tva: number;
  quantite: number;
  remise_pct: number;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  notes?: string;
  suite?: boolean;
}

export interface PosSale {
  id: number;
  numero_ticket: string;
  session_id?: number;
  table_id?: number;
  table_numero?: string;
  zone?: string;
  type_commande: 'SUR_PLACE' | 'A_EMPORTER' | 'LIVRAISON' | string;
  nb_couverts: number;
  serveur: string;
  date_vente: string;
  heure_commande?: string;
  heure_paiement?: string;
  client_nom: string;
  client_telephone?: string;
  client_ice?: string;
  total_ht: number;
  total_tva: number;
  tva_20: number;
  tva_10: number;
  tva_7: number;
  tva_0: number;
  total_ttc: number;
  remise_globale_montant: number;
  pourboire?: number;
  montant_net_a_payer: number;
  montant_donne: number;
  montant_rendu: number;
  mode_reglement: 'Espèces' | 'Carte Bancaire' | 'Chèque' | 'Mixte' | 'Virement' | 'Autre' | string;
  reference_paiement?: string;
  statut: 'PAYE' | 'ANNULE' | 'EN_COURS' | 'BROUILLON' | string;
  caissier: string;
  notes?: string;
  lignes?: PosSaleLine[];
  created_at?: string;
}

export interface PosDashboardStats {
  ventes_jour_ttc: number;
  nb_tickets_jour: number;
  total_couverts_jour: number;
  panier_moyen_jour: number;
  panier_moyen_couvert_jour: number;
  especes_jour: number;
  carte_jour: number;
  cheque_jour: number;
  tables_occupees: number;
  tables_total: number;
  total_plats_carte: number;
  session_active: PosSession | null;
}

export type UserRole = 'ADMIN' | 'CAISSE' | 'GESTIONNAIRE';

export interface AppUser {
  id: number;
  username: string;
  nom_complet: string;
  email?: string;
  role: UserRole;
  pin_code?: string;
  mot_de_passe?: string;
  avatar?: string;
  statut: number; // 1: actif, 0: inactif
  derniere_connexion?: string;
  created_at?: string;
}

export interface AuthSession {
  user: AppUser;
  token: string;
  loginAt: string;
}

export interface PosStockMovement {
  id: number;
  produit_id: number;
  date_mouvement: string;
  type_mouvement: 'ENTREE' | 'SORTIE' | 'VENTE_POS' | 'PERTE' | 'INVENTAIRE' | 'ANNULATION';
  quantite: number;
  motif?: string;
  utilisateur?: string;
  created_at?: string;
}

export type DbImportPhase = 'idle' | 'uploading' | 'validating' | 'processing' | 'persisting' | 'success' | 'error';

export interface DbImportProgress {
  phase: DbImportPhase;
  uploadPercent: number; // 0 - 100 for file reading/upload
  treatmentPercent: number; // 0 - 100 for SQLite engine processing & validation
  overallPercent: number; // 0 - 100 combined progress
  currentStepMessage: string;
  detailMessage?: string;
  fileName?: string;
  fileSizeBytes?: number;
  loadedBytes?: number;
  elapsedMs?: number;
  estimatedRemainingMs?: number;
  error?: string;
}

export interface DbImportSummary {
  fileName: string;
  fileSizeBytes: number;
  tablesCount: number;
  produitsCount: number;
  clientsCount: number;
  fournisseursCount: number;
  facturesCount: number;
  blCount: number;
  posVentesCount: number;
  integrityStatus: string;
  durationMs: number;
}

export interface DatabaseHealthInfo {
  storageEngine: 'IndexedDB (Haute Capacité)' | 'LocalStorage (Fallback)' | 'Mémoire';
  storageSizeBytes: number;
  storageSizeFormatted: string;
  tablesCount: number;
  produitsCount: number;
  clientsCount: number;
  fournisseursCount: number;
  facturesCount: number;
  blCount: number;
  posVentesCount: number;
  lastSavedAt: string | null;
  sqliteVersion: string;
  integrityOk: boolean;
}

// ============================================================================
// COMPTABILITÉ MAROCAINE (PCGM & CGNC)
// ============================================================================

export type AccountClassId = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type AccountType = 'asset' | 'liability' | 'equity' | 'expense' | 'revenue' | 'contra-asset';

export interface PlanAccount {
  id?: number;
  code: string;
  libelle: string;
  libelle_ar?: string;
  classe: AccountClassId;
  type: AccountType;
  allow_entry: boolean;
  solde_debit?: number;
  solde_credit?: number;
  status?: 'active' | 'archived';
}

export type JournalCode = 'ACH' | 'VTE' | 'BNQ' | 'CA' | 'OD' | 'PAIE' | 'IMM' | 'AN';

export interface AccountingJournal {
  id?: number;
  code: JournalCode;
  nom: string;
  nom_ar?: string;
  description?: string;
  color?: string;
}

export interface JournalEntryLine {
  id?: number | string;
  entry_id?: number;
  account_code?: string;
  account_label?: string;
  compte_code?: string;
  compte_libelle?: string;
  debit: number;
  credit: number;
  libelle?: string;
  piece_ref?: string;
  lettrage?: string;
}

export interface JournalEntry {
  id?: number;
  numero: string;
  date: string;
  journal_code: JournalCode;
  libelle: string;
  reference?: string;
  status: 'brouillon' | 'valide' | 'cloture';
  total_debit: number;
  total_credit: number;
  source_type?: 'facture_vente' | 'facture_achat' | 'reglement_client' | 'paiement_fournisseur' | 'paie' | 'production' | 'amortissement' | 'manuel';
  source_id?: number | string;
  lines: JournalEntryLine[];
  created_at?: string;
  updated_at?: string;
}

export interface FixedAsset {
  id?: number;
  code: string;
  designation: string;
  compte_immobilisation: string; // Ex: 2340 Matériel de transport
  compte_amortissement: string;  // Ex: 2834 Amortissements du matériel de transport
  compte_dotation: string;       // Ex: 6193 Dotations d'exploitation aux amortissements
  valeur_acquisition: number;
  date_acquisition: string;
  date_mise_service: string;
  duree_annees: number;
  methode: 'lineaire' | 'degressif';
  taux: number;
  amortissements_cumules: number;
  vna: number;
  statut: 'en_service' | 'cede' | 'mis_au_rebut';
  notes?: string;
}

// ============================================================================
// RESSOURCES HUMAINES & PAIE MAROCAINE (LF 2026)
// ============================================================================

export type ContractType = 'CDI' | 'CDD' | 'Stage' | 'ANAPEC' | 'Freelance' | 'Autre';
export type FamilyStatus = 'Celibataire' | 'Marie' | 'Divorce' | 'Veuf';

export interface Employee {
  id?: number;
  matricule: string;
  nom: string;
  prenom: string;
  nom_complet?: string;
  cin: string;
  cnss?: string;
  departement: string;
  poste: string;
  date_embauche: string;
  date_naissance?: string;
  type_contrat: ContractType;
  salaire_base: number;
  situation_familiale: FamilyStatus;
  nombre_enfants: number;
  has_cimr: boolean;
  rib?: string;
  banque?: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  statut: 'actif' | 'inactif' | 'conge' | 'quitte';
  created_at?: string;
  updated_at?: string;
}

export interface PayrollSlip {
  id?: number;
  employee_id: number;
  matricule: string;
  nom_complet: string;
  poste?: string;
  departement?: string;
  cin?: string;
  cnss?: string;
  periode_mois: number; // 1 - 12
  periode_annee: number; // Ex: 2026
  date_paie: string;
  date_virement?: string;
  // Éléments bruts
  salaire_base: number;
  primes: number;
  heures_sup: number;
  indemnites_non_imposables: number;
  salaire_brut: number;
  // Cotisations salariales
  base_cnss: number;
  cotis_cnss_salariale: number;
  cotis_amo_salariale: number;
  cotis_cimr_salariale: number;
  total_cotis_salariales: number;
  // Impôt sur le Revenu (IR)
  frais_professionnels: number;
  salaire_net_imposable: number;
  ir_brut: number;
  deduction_charges_famille: number;
  ir_net: number;
  // Retenues & Net
  total_retenues: number;
  avances_acomptes?: number;
  salaire_net: number;
  // Charges patronales
  charges_patronales_cnss: number;
  charges_patronales_alloc_fam: number;
  charges_patronales_amo: number;
  charges_patronales_fp: number; // Formation pro
  charges_patronales_cimr: number;
  total_charges_patronales: number;
  cout_total_employeur: number;
  // Statuts & Intégration comptable
  statut: 'brouillon' | 'valide' | 'paye';
  comptabilise: boolean;
  journal_entry_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface LeaveRequest {
  id?: number;
  employee_id: number;
  employee_name: string;
  type: 'annuel' | 'maladie' | 'maternite' | 'sans_solde' | 'exceptionnel';
  date_debut: string;
  date_fin: string;
  jours: number;
  motif?: string;
  statut: 'en_attente' | 'approuve' | 'refuse' | 'annule';
  created_at?: string;
}

// ============================================================================
// PRODUCTION & FABRICATION (MANUFACTURING)
// ============================================================================

export interface BOMComponent {
  produit_id?: number;
  produit_nom: string;
  quantite: number;
  unite: string;
  cout_unitaire: number;
  cout_total: number;
  est_dechet?: boolean;
}

export interface BOM {
  id?: number;
  code: string;
  nom: string;
  produit_fini_id?: number;
  produit_fini_nom: string;
  quantite_produite: number;
  unite: string;
  composants: BOMComponent[];
  cout_matieres_estime: number;
  cout_main_oeuvre_estime: number;
  frais_generaux_estime: number;
  cout_revient_unitaire: number;
  actif: boolean;
  version?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export type ProductionOrderStatus = 'brouillon' | 'confirme' | 'en_cours' | 'termine' | 'annule';

export interface ProductionOrderComponent {
  produit_id?: number;
  produit_nom: string;
  quantite_prevue: number;
  quantite_reelle: number;
  unite: string;
  cout_unitaire: number;
  cout_total: number;
}

export interface ProductionOrder {
  id?: number;
  numero: string;
  bom_id?: number;
  bom_nom?: string;
  produit_fini_id?: number;
  produit_fini_nom: string;
  quantite_prevue: number;
  quantite_reelle?: number;
  unite: string;
  date_lancement: string;
  date_prevue_fin: string;
  date_cloture?: string;
  responsable?: string;
  atelier?: string;
  status: ProductionOrderStatus;
  composants_consommes: ProductionOrderComponent[];
  cout_matieres: number;
  cout_main_oeuvre: number;
  cout_machines_ateliers: number;
  cout_total_production: number;
  cout_revient_unitaire: number;
  // Intégration stocks & comptabilité
  stock_destocke: boolean;
  stock_entre: boolean;
  comptabilise: boolean;
  journal_entry_id?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface WorkCenter {
  id?: number;
  nom: string;
  taux_horaire: number;
  capacite_jour_heures: number;
  statut: 'operationnel' | 'maintenance';
}
