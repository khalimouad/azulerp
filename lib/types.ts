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
  statut: 'En attente' | 'Facturé' | 'Partiel' | 'Soldé';
  etat?: DocumentState; // 'Brouillon' | 'Validé' | 'Annulé'
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


