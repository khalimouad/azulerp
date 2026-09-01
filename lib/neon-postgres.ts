import { neon, Pool } from '@neondatabase/serverless';
import {
  OFFICIAL_CATEGORIES,
  OFFICIAL_FAMILLES,
  OFFICIAL_MARQUES,
  OFFICIAL_FOURNISSEURS,
  OFFICIAL_PRODUITS,
} from './official-seed-data';

/**
 * Neon PostgreSQL Configuration and connection resolver.
 * Compatible with Neon.tech, Vercel Postgres, and standard PostgreSQL connection strings.
 */
export function getNeonDatabaseUrl(customUrl?: string): string | null {
  if (customUrl && customUrl.trim()) {
    return customUrl.trim();
  }

  // Direct connection string keys
  const directUrl =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL_NO_SSL ||
    process.env.NEON_DATABASE_URL;

  if (directUrl && directUrl.trim()) {
    return directUrl.trim();
  }

  // Construct from separate PG* variables if provided
  const host = process.env.PGHOST || process.env.POSTGRES_HOST;
  const user = process.env.PGUSER || process.env.POSTGRES_USER;
  const password = process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD;
  const database = process.env.PGDATABASE || process.env.POSTGRES_DATABASE;

  if (host && user && password && database) {
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}/${database}?sslmode=require`;
  }

  return null;
}

/**
 * Returns a Neon SQL execution client (HTTP-based, serverless-optimized).
 */
export function getNeonSql(customUrl?: string) {
  const connStr = getNeonDatabaseUrl(customUrl);
  if (!connStr) {
    throw new Error(
      'DATABASE_URL ou POSTGRES_URL manquant. Veuillez configurer votre chaîne de connexion Neon PostgreSQL.'
    );
  }
  return neon(connStr);
}

/**
 * Creates a Connection Pool for transactional operations if needed.
 */
export function getNeonPool(customUrl?: string) {
  const connStr = getNeonDatabaseUrl(customUrl);
  if (!connStr) {
    throw new Error('DATABASE_URL ou POSTGRES_URL manquant.');
  }
  return new Pool({ connectionString: connStr });
}

/**
 * PostgreSQL Schema Definition DDL for Verde Orto ERP & Restaurant POS
 */
export const POSTGRES_SCHEMA_SQL = `
-- 1. Identifiants Société
CREATE TABLE IF NOT EXISTS company_info (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(255) NOT NULL DEFAULT 'VERDEORTO SARL AU',
  forme_juridique VARCHAR(100) DEFAULT 'SARL AU',
  capital VARCHAR(100) DEFAULT '100 000,00',
  adresse TEXT NOT NULL DEFAULT 'Avenue Al Mouqaouama, Quartier Ain Merroudi, Résidence DaVinci, Bloc F, Magasin N°20',
  adresse_detail TEXT,
  code_postal VARCHAR(20) DEFAULT '40000',
  ville VARCHAR(100) DEFAULT 'Marrakech',
  pays VARCHAR(100) DEFAULT 'Maroc',
  telephone VARCHAR(50) DEFAULT '0808551156 / 0678301643',
  fax VARCHAR(50),
  email VARCHAR(150) DEFAULT 'verdeorto@gmail.com',
  site_web VARCHAR(255),
  ice VARCHAR(50) NOT NULL DEFAULT '000194441000024',
  if_fiscal VARCHAR(50) DEFAULT '3381764',
  rc VARCHAR(50) DEFAULT '35265',
  cnss VARCHAR(50) DEFAULT '7788302',
  patente VARCHAR(50) DEFAULT '46201837',
  agrement_onssa VARCHAR(100),
  partenaire_coop TEXT,
  logo_titre VARCHAR(255),
  logo_sous_titre VARCHAR(255),
  logo_image TEXT,
  logo_mode VARCHAR(50) DEFAULT 'both',
  logo_placement VARCHAR(50) DEFAULT 'left',
  banque VARCHAR(100) DEFAULT 'Banque Populaire',
  rib VARCHAR(100) DEFAULT '145 450 21211 2604506 000 4 11',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Catégories, Familles, Marques
CREATE TABLE IF NOT EXISTS categories (
  id BIGINT PRIMARY KEY,
  code VARCHAR(50),
  libelle VARCHAR(255) NOT NULL,
  nom VARCHAR(255),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS familles (
  id BIGINT PRIMARY KEY,
  code VARCHAR(50),
  libelle VARCHAR(255) NOT NULL,
  nom VARCHAR(255),
  categorie VARCHAR(255),
  categorie_code VARCHAR(50),
  categorie_id BIGINT,
  categorie_libelle VARCHAR(255),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS marques (
  id BIGINT PRIMARY KEY,
  code VARCHAR(50),
  libelle VARCHAR(255) NOT NULL,
  nom VARCHAR(255),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Clients & Tarifs
CREATE TABLE IF NOT EXISTS clients (
  id BIGINT PRIMARY KEY,
  code VARCHAR(50) NOT NULL,
  nom VARCHAR(255) NOT NULL,
  interlocuteur VARCHAR(255),
  adresse TEXT,
  code_postal VARCHAR(20),
  ville VARCHAR(100),
  pays VARCHAR(100) DEFAULT 'Maroc',
  telephone VARCHAR(50),
  mobile VARCHAR(50),
  fax VARCHAR(50),
  email VARCHAR(150),
  site_web VARCHAR(255),
  ice VARCHAR(50),
  observations TEXT,
  notes TEXT,
  solde NUMERIC(15, 2) DEFAULT 0.00,
  total_achats NUMERIC(15, 2) DEFAULT 0.00,
  bl_non_factures_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS client_tarifs (
  id BIGINT PRIMARY KEY,
  client_id BIGINT NOT NULL,
  produit_id BIGINT NOT NULL,
  produit_code VARCHAR(50),
  produit_libelle VARCHAR(255),
  produit_unite VARCHAR(20),
  prix_standard_ht NUMERIC(15, 4) DEFAULT 0.0000,
  prix_special_ht NUMERIC(15, 4) NOT NULL,
  remise_pct NUMERIC(5, 2) DEFAULT 0.00,
  taux_tva NUMERIC(5, 2) DEFAULT 20.00,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS client_tarifs_client_produit_uidx
ON client_tarifs (client_id, produit_id);

-- 4. Fournisseurs & Achats
CREATE TABLE IF NOT EXISTS fournisseurs (
  id BIGINT PRIMARY KEY,
  code VARCHAR(50),
  nom VARCHAR(255) NOT NULL,
  interlocuteur VARCHAR(255),
  adresse TEXT,
  code_postal VARCHAR(20),
  ville VARCHAR(100),
  telephone VARCHAR(50),
  gsm VARCHAR(50),
  mobile VARCHAR(50),
  fax VARCHAR(50),
  email VARCHAR(150),
  ice VARCHAR(50),
  observations TEXT,
  notes TEXT,
  solde_du NUMERIC(15, 2) DEFAULT 0.00,
  total_achats NUMERIC(15, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS factures_fournisseurs (
  id BIGINT PRIMARY KEY,
  numero VARCHAR(100) NOT NULL,
  fournisseur_id BIGINT NOT NULL,
  fournisseur_nom VARCHAR(255) NOT NULL,
  fournisseur_ice VARCHAR(50),
  date_facture VARCHAR(50) NOT NULL,
  date_echeance VARCHAR(50),
  total_ht NUMERIC(15, 2) DEFAULT 0.00,
  tva_20 NUMERIC(15, 2) DEFAULT 0.00,
  tva_10 NUMERIC(15, 2) DEFAULT 0.00,
  tva_7 NUMERIC(15, 2) DEFAULT 0.00,
  total_tva NUMERIC(15, 2) DEFAULT 0.00,
  total_ttc NUMERIC(15, 2) DEFAULT 0.00,
  montant_paye NUMERIC(15, 2) DEFAULT 0.00,
  reste_a_payer NUMERIC(15, 2) DEFAULT 0.00,
  statut VARCHAR(50) DEFAULT 'A payer',
  etat VARCHAR(50) DEFAULT 'Validé',
  designation_achat TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS factures_fournisseurs_lignes (
  id BIGINT PRIMARY KEY,
  facture_fournisseur_id BIGINT NOT NULL,
  produit_id BIGINT,
  designation VARCHAR(255) NOT NULL,
  quantite NUMERIC(15, 3) DEFAULT 1.000,
  prix_achat_ht NUMERIC(15, 4) DEFAULT 0.0000,
  taux_tva NUMERIC(5, 2) DEFAULT 20.00,
  total_ht NUMERIC(15, 2) DEFAULT 0.00,
  total_tva NUMERIC(15, 2) DEFAULT 0.00,
  total_ttc NUMERIC(15, 2) DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS paiements_fournisseurs (
  id BIGINT PRIMARY KEY,
  fournisseur_id BIGINT NOT NULL,
  fournisseur_nom VARCHAR(255) NOT NULL,
  facture_fournisseur_id BIGINT,
  facture_numero VARCHAR(100),
  date_paiement VARCHAR(50) NOT NULL,
  montant NUMERIC(15, 2) NOT NULL,
  mode_paiement VARCHAR(100) DEFAULT 'Chèque',
  numero_cheque_ref VARCHAR(100),
  banque_emettrice VARCHAR(100),
  date_echeance_depot VARCHAR(50),
  statut_cheque VARCHAR(100) DEFAULT 'En attente',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Catalogue Produits & Stocks
CREATE TABLE IF NOT EXISTS produits (
  id BIGINT PRIMARY KEY,
  code VARCHAR(50) NOT NULL,
  libelle VARCHAR(255) NOT NULL,
  groupe VARCHAR(100),
  famille VARCHAR(100),
  unite VARCHAR(20) DEFAULT 'KG',
  taux_tva NUMERIC(5, 2) DEFAULT 20.00,
  prix_ht NUMERIC(15, 4) DEFAULT 0.0000,
  prix_achat NUMERIC(15, 4) DEFAULT 0.0000,
  prix_achat_ht NUMERIC(15, 4) DEFAULT 0.0000,
  stock_actuel NUMERIC(15, 3) DEFAULT 0.000,
  stock_min NUMERIC(15, 3) DEFAULT 0.000,
  stock_virtuel NUMERIC(15, 3) DEFAULT 0.000,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Bons de Livraison (BL) & Lignes
CREATE TABLE IF NOT EXISTS bons_livraison (
  id BIGINT PRIMARY KEY,
  numero VARCHAR(100) NOT NULL,
  date VARCHAR(50) NOT NULL,
  client_id BIGINT NOT NULL,
  client_nom VARCHAR(255) NOT NULL,
  client_ice VARCHAR(50),
  client_adresse TEXT,
  client_ville VARCHAR(100),
  total_ht NUMERIC(15, 2) DEFAULT 0.00,
  tva_20 NUMERIC(15, 2) DEFAULT 0.00,
  tva_10 NUMERIC(15, 2) DEFAULT 0.00,
  total_tva NUMERIC(15, 2) DEFAULT 0.00,
  total_ttc NUMERIC(15, 2) DEFAULT 0.00,
  montant_brut NUMERIC(15, 2) DEFAULT 0.00,
  remise_pct NUMERIC(5, 2) DEFAULT 0.00,
  ristourne_pct NUMERIC(5, 2) DEFAULT 0.00,
  escompte_pct NUMERIC(5, 2) DEFAULT 0.00,
  port NUMERIC(15, 2) DEFAULT 0.00,
  statut VARCHAR(50) DEFAULT 'En attente',
  etat VARCHAR(50) DEFAULT 'Validé',
  cloture_sans_facture BOOLEAN NOT NULL DEFAULT FALSE,
  facture_id BIGINT,
  facture_numero VARCHAR(100),
  mode_reglement VARCHAR(100) DEFAULT 'Virement',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bons_livraison_lignes (
  id BIGINT PRIMARY KEY,
  bon_livraison_id BIGINT NOT NULL,
  produit_id BIGINT,
  designation VARCHAR(255) NOT NULL,
  groupe VARCHAR(100),
  unite VARCHAR(20) DEFAULT 'KG',
  quantite NUMERIC(15, 3) DEFAULT 1.000,
  prix_ht NUMERIC(15, 4) DEFAULT 0.0000,
  taux_tva NUMERIC(5, 2) DEFAULT 20.00,
  remise_pct NUMERIC(5, 2) DEFAULT 0.00,
  total_ht NUMERIC(15, 2) DEFAULT 0.00,
  total_tva NUMERIC(15, 2) DEFAULT 0.00,
  total_ttc NUMERIC(15, 2) DEFAULT 0.00
);

-- 7. Bons de Retour (BR) & Lignes
CREATE TABLE IF NOT EXISTS bons_retour (
  id BIGINT PRIMARY KEY,
  numero VARCHAR(100) NOT NULL,
  date VARCHAR(50) NOT NULL,
  client_id BIGINT NOT NULL,
  client_nom VARCHAR(255) NOT NULL,
  client_ice VARCHAR(50),
  client_adresse TEXT,
  client_ville VARCHAR(100),
  total_ht NUMERIC(15, 2) DEFAULT 0.00,
  tva_20 NUMERIC(15, 2) DEFAULT 0.00,
  tva_10 NUMERIC(15, 2) DEFAULT 0.00,
  total_tva NUMERIC(15, 2) DEFAULT 0.00,
  total_ttc NUMERIC(15, 2) DEFAULT 0.00,
  motif TEXT,
  statut VARCHAR(50) DEFAULT 'En attente',
  etat VARCHAR(50) DEFAULT 'Validé',
  facture_id BIGINT,
  facture_numero VARCHAR(100),
  mode_reglement VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bons_retour_lignes (
  id BIGINT PRIMARY KEY,
  bon_retour_id BIGINT NOT NULL,
  produit_id BIGINT,
  designation VARCHAR(255) NOT NULL,
  groupe VARCHAR(100),
  unite VARCHAR(20) DEFAULT 'KG',
  quantite NUMERIC(15, 3) DEFAULT 1.000,
  prix_ht NUMERIC(15, 4) DEFAULT 0.0000,
  taux_tva NUMERIC(5, 2) DEFAULT 20.00,
  remise_pct NUMERIC(5, 2) DEFAULT 0.00,
  total_ht NUMERIC(15, 2) DEFAULT 0.00,
  total_tva NUMERIC(15, 2) DEFAULT 0.00,
  total_ttc NUMERIC(15, 2) DEFAULT 0.00
);

-- 8. Factures de Vente & Lignes
CREATE TABLE IF NOT EXISTS factures (
  id BIGINT PRIMARY KEY,
  numero VARCHAR(100) NOT NULL,
  date VARCHAR(50) NOT NULL,
  client_id BIGINT NOT NULL,
  client_nom VARCHAR(255) NOT NULL,
  client_ice VARCHAR(50),
  client_adresse TEXT,
  client_ville VARCHAR(100),
  total_ht NUMERIC(15, 2) DEFAULT 0.00,
  tva_20 NUMERIC(15, 2) DEFAULT 0.00,
  tva_10 NUMERIC(15, 2) DEFAULT 0.00,
  total_tva NUMERIC(15, 2) DEFAULT 0.00,
  total_ttc NUMERIC(15, 2) DEFAULT 0.00,
  montant_regle NUMERIC(15, 2) DEFAULT 0.00,
  reste_a_payer NUMERIC(15, 2) DEFAULT 0.00,
  statut_paiement VARCHAR(50) DEFAULT 'Impayé',
  etat VARCHAR(50) DEFAULT 'Validé',
  mode_reglement VARCHAR(100) DEFAULT 'Virement',
  notes TEXT,
  bl_associes TEXT,
  br_associes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS factures_lignes (
  id BIGINT PRIMARY KEY,
  facture_id BIGINT NOT NULL,
  produit_id BIGINT,
  designation VARCHAR(255) NOT NULL,
  groupe VARCHAR(100),
  unite VARCHAR(20) DEFAULT 'KG',
  quantite NUMERIC(15, 3) DEFAULT 1.000,
  prix_ht NUMERIC(15, 4) DEFAULT 0.0000,
  taux_tva NUMERIC(5, 2) DEFAULT 20.00,
  remise_pct NUMERIC(5, 2) DEFAULT 0.00,
  total_ht NUMERIC(15, 2) DEFAULT 0.00,
  total_tva NUMERIC(15, 2) DEFAULT 0.00,
  total_ttc NUMERIC(15, 2) DEFAULT 0.00
);

-- 9. Devis
CREATE TABLE IF NOT EXISTS devis (
  id BIGINT PRIMARY KEY,
  numero VARCHAR(100) NOT NULL,
  date VARCHAR(50) NOT NULL,
  date_validite VARCHAR(50),
  client_id BIGINT NOT NULL,
  client_nom VARCHAR(255) NOT NULL,
  client_ice VARCHAR(50),
  client_adresse TEXT,
  client_ville VARCHAR(100),
  total_ht NUMERIC(15, 2) DEFAULT 0.00,
  total_tva NUMERIC(15, 2) DEFAULT 0.00,
  total_ttc NUMERIC(15, 2) DEFAULT 0.00,
  statut VARCHAR(50) DEFAULT 'Brouillon',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS devis_lignes (
  id BIGINT PRIMARY KEY,
  devis_id BIGINT NOT NULL,
  produit_id BIGINT,
  designation VARCHAR(255) NOT NULL,
  groupe VARCHAR(100),
  unite VARCHAR(20) DEFAULT 'KG',
  quantite NUMERIC(15, 3) DEFAULT 1.000,
  prix_ht NUMERIC(15, 4) DEFAULT 0.0000,
  taux_tva NUMERIC(5, 2) DEFAULT 20.00,
  remise_pct NUMERIC(5, 2) DEFAULT 0.00,
  total_ht NUMERIC(15, 2) DEFAULT 0.00,
  total_tva NUMERIC(15, 2) DEFAULT 0.00,
  total_ttc NUMERIC(15, 2) DEFAULT 0.00
);

-- 10. Règlements & Mouvements de Stock
CREATE TABLE IF NOT EXISTS reglements (
  id BIGINT PRIMARY KEY,
  piece_type VARCHAR(50) DEFAULT 'FACTURE',
  piece_id BIGINT,
  piece_numero VARCHAR(100),
  facture_id BIGINT,
  facture_numero VARCHAR(100),
  client_id BIGINT NOT NULL,
  client_nom VARCHAR(255) NOT NULL,
  date VARCHAR(50) NOT NULL,
  montant NUMERIC(15, 2) NOT NULL,
  mode_reglement VARCHAR(100) DEFAULT 'Virement',
  mode VARCHAR(100),
  reference_paiement VARCHAR(100),
  banque VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_mouvements (
  id BIGINT PRIMARY KEY,
  produit_id BIGINT NOT NULL,
  produit_nom VARCHAR(255) NOT NULL,
  date VARCHAR(50) NOT NULL,
  type VARCHAR(50) NOT NULL,
  quantite NUMERIC(15, 3) NOT NULL,
  reference_doc VARCHAR(100),
  motif TEXT,
  stock_apres NUMERIC(15, 3) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 11. Restaurant Point de Vente (POS)
CREATE TABLE IF NOT EXISTS pos_tables (
  id BIGINT PRIMARY KEY,
  numero VARCHAR(50) NOT NULL,
  nom VARCHAR(100) NOT NULL,
  zone VARCHAR(100) DEFAULT 'Salle Principale',
  capacite INT DEFAULT 4,
  statut VARCHAR(50) DEFAULT 'LIBRE',
  serveur VARCHAR(100),
  nb_couverts INT DEFAULT 0,
  montant_en_cours NUMERIC(15, 2) DEFAULT 0.00,
  heure_ouverture VARCHAR(50),
  commande_json TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pos_categories (
  id BIGINT PRIMARY KEY,
  code VARCHAR(50) NOT NULL,
  nom VARCHAR(100) NOT NULL,
  icone VARCHAR(50),
  couleur VARCHAR(50),
  ordre INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pos_produits (
  id BIGINT PRIMARY KEY,
  code VARCHAR(50) NOT NULL,
  nom VARCHAR(255) NOT NULL,
  description TEXT,
  categorie_id BIGINT,
  categorie_nom VARCHAR(100),
  prix_vente_ttc NUMERIC(15, 2) NOT NULL,
  taux_tva NUMERIC(5, 2) DEFAULT 20.00,
  temps_preparation_min INT DEFAULT 10,
  disponible INT DEFAULT 1,
  image_url TEXT,
  couleur VARCHAR(50),
  actif INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pos_sessions (
  id BIGINT PRIMARY KEY,
  numero_session VARCHAR(100) NOT NULL,
  service VARCHAR(50) DEFAULT 'MIDI',
  caissier VARCHAR(100) NOT NULL,
  date_ouverture VARCHAR(50) NOT NULL,
  date_cloture VARCHAR(50),
  fond_caisse_ouverture NUMERIC(15, 2) DEFAULT 0.00,
  total_ventes NUMERIC(15, 2) DEFAULT 0.00,
  total_especes NUMERIC(15, 2) DEFAULT 0.00,
  total_carte NUMERIC(15, 2) DEFAULT 0.00,
  total_cheque NUMERIC(15, 2) DEFAULT 0.00,
  total_autre NUMERIC(15, 2) DEFAULT 0.00,
  nb_tickets INT DEFAULT 0,
  total_couverts INT DEFAULT 0,
  montant_reel_cloture NUMERIC(15, 2) DEFAULT 0.00,
  ecart_caisse NUMERIC(15, 2) DEFAULT 0.00,
  statut VARCHAR(50) DEFAULT 'OUVERTE',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pos_ventes (
  id BIGINT PRIMARY KEY,
  numero_ticket VARCHAR(100) NOT NULL,
  session_id BIGINT,
  table_id BIGINT,
  table_numero VARCHAR(50),
  zone VARCHAR(100),
  type_commande VARCHAR(50) DEFAULT 'SUR_PLACE',
  nb_couverts INT DEFAULT 1,
  serveur VARCHAR(100) DEFAULT 'Chef de Rang',
  date_vente VARCHAR(50) NOT NULL,
  heure_commande VARCHAR(50),
  heure_paiement VARCHAR(50),
  client_nom VARCHAR(255) DEFAULT 'Client Comptoir',
  client_telephone VARCHAR(50),
  client_ice VARCHAR(50),
  total_ht NUMERIC(15, 2) DEFAULT 0.00,
  total_tva NUMERIC(15, 2) DEFAULT 0.00,
  tva_20 NUMERIC(15, 2) DEFAULT 0.00,
  tva_10 NUMERIC(15, 2) DEFAULT 0.00,
  tva_7 NUMERIC(15, 2) DEFAULT 0.00,
  tva_0 NUMERIC(15, 2) DEFAULT 0.00,
  total_ttc NUMERIC(15, 2) DEFAULT 0.00,
  remise_globale_montant NUMERIC(15, 2) DEFAULT 0.00,
  pourboire NUMERIC(15, 2) DEFAULT 0.00,
  montant_net_a_payer NUMERIC(15, 2) DEFAULT 0.00,
  montant_donne NUMERIC(15, 2) DEFAULT 0.00,
  montant_rendu NUMERIC(15, 2) DEFAULT 0.00,
  mode_reglement VARCHAR(50) DEFAULT 'Espèces',
  reference_paiement VARCHAR(100),
  statut VARCHAR(50) DEFAULT 'PAYE',
  caissier VARCHAR(100) DEFAULT 'Caisse Principale',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pos_ventes_lignes (
  id BIGINT PRIMARY KEY,
  vente_id BIGINT NOT NULL,
  produit_id BIGINT,
  produit_code VARCHAR(50),
  produit_nom VARCHAR(255) NOT NULL,
  prix_unitaire_ttc NUMERIC(15, 2) NOT NULL,
  taux_tva NUMERIC(5, 2) DEFAULT 20.00,
  quantite NUMERIC(15, 3) DEFAULT 1.000,
  remise_pct NUMERIC(5, 2) DEFAULT 0.00,
  total_ht NUMERIC(15, 2) DEFAULT 0.00,
  total_tva NUMERIC(15, 2) DEFAULT 0.00,
  total_ttc NUMERIC(15, 2) DEFAULT 0.00,
  notes TEXT,
  suite BOOLEAN DEFAULT FALSE
);

-- 12. Utilisateurs & Authentification
CREATE TABLE IF NOT EXISTS app_users (
  id BIGINT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  nom_complet VARCHAR(255) NOT NULL,
  email VARCHAR(150),
  role VARCHAR(50) DEFAULT 'CAISSE',
  pin_code VARCHAR(50),
  mot_de_passe VARCHAR(255),
  avatar VARCHAR(50),
  statut INT DEFAULT 1,
  derniere_connexion VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Query indexes used by document lists, selectors and reconciliation views.
-- These improve database work; reducing egress comes from bounded/selective
-- reads and caching (implemented in the API route), not from indexes alone.
CREATE INDEX IF NOT EXISTS clients_nom_idx ON clients (nom);
CREATE INDEX IF NOT EXISTS produits_libelle_idx ON produits (libelle);
CREATE INDEX IF NOT EXISTS fournisseurs_nom_idx ON fournisseurs (nom);
CREATE INDEX IF NOT EXISTS bons_livraison_date_idx ON bons_livraison (date);
CREATE INDEX IF NOT EXISTS bons_livraison_client_idx ON bons_livraison (client_id);
CREATE INDEX IF NOT EXISTS bons_livraison_numero_idx ON bons_livraison (numero);
CREATE INDEX IF NOT EXISTS bons_livraison_lignes_document_idx ON bons_livraison_lignes (bon_livraison_id);
CREATE INDEX IF NOT EXISTS bons_retour_date_idx ON bons_retour (date);
CREATE INDEX IF NOT EXISTS bons_retour_client_idx ON bons_retour (client_id);
CREATE INDEX IF NOT EXISTS bons_retour_lignes_document_idx ON bons_retour_lignes (bon_retour_id);
CREATE INDEX IF NOT EXISTS factures_date_idx ON factures (date);
CREATE INDEX IF NOT EXISTS factures_client_idx ON factures (client_id);
CREATE INDEX IF NOT EXISTS factures_numero_idx ON factures (numero);
CREATE INDEX IF NOT EXISTS factures_lignes_document_idx ON factures_lignes (facture_id);
CREATE INDEX IF NOT EXISTS devis_date_idx ON devis (date);
CREATE INDEX IF NOT EXISTS devis_client_idx ON devis (client_id);
CREATE INDEX IF NOT EXISTS devis_lignes_document_idx ON devis_lignes (devis_id);
CREATE INDEX IF NOT EXISTS reglements_date_idx ON reglements (date);
CREATE INDEX IF NOT EXISTS reglements_client_idx ON reglements (client_id);
CREATE INDEX IF NOT EXISTS reglements_facture_idx ON reglements (facture_id);
CREATE INDEX IF NOT EXISTS client_tarifs_client_idx ON client_tarifs (client_id);
`;

/**
 * Initializes tables in Neon PostgreSQL if they do not exist
 */
export async function initNeonPostgresSchema(customUrl?: string) {
  const sql = getNeonSql(customUrl);

  // 1. Identifiants Société
  await sql`
    CREATE TABLE IF NOT EXISTS company_info (
      id SERIAL PRIMARY KEY,
      nom VARCHAR(255) NOT NULL DEFAULT 'VERDEORTO SARL AU',
      forme_juridique VARCHAR(100) DEFAULT 'SARL AU',
      capital VARCHAR(100) DEFAULT '100 000,00',
      adresse TEXT NOT NULL DEFAULT 'Avenue Al Mouqaouama, Quartier Ain Merroudi, Résidence DaVinci, Bloc F, Magasin N°20',
      adresse_detail TEXT,
      code_postal VARCHAR(20) DEFAULT '40000',
      ville VARCHAR(100) DEFAULT 'Marrakech',
      pays VARCHAR(100) DEFAULT 'Maroc',
      telephone VARCHAR(50) DEFAULT '0808551156 / 0678301643',
      fax VARCHAR(50),
      email VARCHAR(150) DEFAULT 'verdeorto@gmail.com',
      site_web VARCHAR(255),
      ice VARCHAR(50) NOT NULL DEFAULT '000194441000024',
      if_fiscal VARCHAR(50) DEFAULT '3381764',
      rc VARCHAR(50) DEFAULT '35265',
      cnss VARCHAR(50) DEFAULT '7788302',
      patente VARCHAR(50) DEFAULT '46201837',
      agrement_onssa VARCHAR(100),
      partenaire_coop TEXT,
      logo_titre VARCHAR(255),
      logo_sous_titre VARCHAR(255),
      logo_image TEXT,
      logo_mode VARCHAR(50) DEFAULT 'both',
      logo_placement VARCHAR(50) DEFAULT 'left',
      banque VARCHAR(100) DEFAULT 'Banque Populaire',
      rib VARCHAR(100) DEFAULT '145 450 21211 2604506 000 4 11',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // 2. Catégories, Familles, Marques
  await sql`
    CREATE TABLE IF NOT EXISTS categories (
      id BIGINT PRIMARY KEY,
      code VARCHAR(50),
      libelle VARCHAR(255) NOT NULL,
      nom VARCHAR(255),
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS familles (
      id BIGINT PRIMARY KEY,
      code VARCHAR(50),
      libelle VARCHAR(255) NOT NULL,
      nom VARCHAR(255),
      categorie VARCHAR(255),
      categorie_code VARCHAR(50),
      categorie_id BIGINT,
      categorie_libelle VARCHAR(255),
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS marques (
      id BIGINT PRIMARY KEY,
      code VARCHAR(50),
      libelle VARCHAR(255) NOT NULL,
      nom VARCHAR(255),
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // 3. Clients & Tarifs
  await sql`
    CREATE TABLE IF NOT EXISTS clients (
      id BIGINT PRIMARY KEY,
      code VARCHAR(50) NOT NULL,
      nom VARCHAR(255) NOT NULL,
      interlocuteur VARCHAR(255),
      adresse TEXT,
      code_postal VARCHAR(20),
      ville VARCHAR(100),
      pays VARCHAR(100) DEFAULT 'Maroc',
      telephone VARCHAR(50),
      mobile VARCHAR(50),
      fax VARCHAR(50),
      email VARCHAR(150),
      site_web VARCHAR(255),
      ice VARCHAR(50),
      observations TEXT,
      notes TEXT,
      solde NUMERIC(15, 2) DEFAULT 0.00,
      total_achats NUMERIC(15, 2) DEFAULT 0.00,
      bl_non_factures_count INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS client_tarifs (
      id BIGINT PRIMARY KEY,
      client_id BIGINT NOT NULL,
      produit_id BIGINT NOT NULL,
      produit_code VARCHAR(50),
      produit_libelle VARCHAR(255),
      produit_unite VARCHAR(20),
      prix_standard_ht NUMERIC(15, 4) DEFAULT 0.0000,
      prix_special_ht NUMERIC(15, 4) NOT NULL,
      remise_pct NUMERIC(5, 2) DEFAULT 0.00,
      taux_tva NUMERIC(5, 2) DEFAULT 20.00,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS client_tarifs_client_produit_uidx
    ON client_tarifs (client_id, produit_id);
  `;

  // 4. Fournisseurs & Achats
  await sql`
    CREATE TABLE IF NOT EXISTS fournisseurs (
      id BIGINT PRIMARY KEY,
      code VARCHAR(50),
      nom VARCHAR(255) NOT NULL,
      interlocuteur VARCHAR(255),
      adresse TEXT,
      code_postal VARCHAR(20),
      ville VARCHAR(100),
      telephone VARCHAR(50),
      gsm VARCHAR(50),
      mobile VARCHAR(50),
      fax VARCHAR(50),
      email VARCHAR(150),
      ice VARCHAR(50),
      observations TEXT,
      notes TEXT,
      solde_du NUMERIC(15, 2) DEFAULT 0.00,
      total_achats NUMERIC(15, 2) DEFAULT 0.00,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS factures_fournisseurs (
      id BIGINT PRIMARY KEY,
      numero VARCHAR(100) NOT NULL,
      fournisseur_id BIGINT NOT NULL,
      fournisseur_nom VARCHAR(255) NOT NULL,
      fournisseur_ice VARCHAR(50),
      date_facture VARCHAR(50) NOT NULL,
      date_echeance VARCHAR(50),
      total_ht NUMERIC(15, 2) DEFAULT 0.00,
      tva_20 NUMERIC(15, 2) DEFAULT 0.00,
      tva_10 NUMERIC(15, 2) DEFAULT 0.00,
      tva_7 NUMERIC(15, 2) DEFAULT 0.00,
      total_tva NUMERIC(15, 2) DEFAULT 0.00,
      total_ttc NUMERIC(15, 2) DEFAULT 0.00,
      montant_paye NUMERIC(15, 2) DEFAULT 0.00,
      reste_a_payer NUMERIC(15, 2) DEFAULT 0.00,
      statut VARCHAR(50) DEFAULT 'A payer',
      etat VARCHAR(50) DEFAULT 'Validé',
      designation_achat TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS factures_fournisseurs_lignes (
      id BIGINT PRIMARY KEY,
      facture_fournisseur_id BIGINT NOT NULL,
      produit_id BIGINT,
      designation VARCHAR(255) NOT NULL,
      quantite NUMERIC(15, 3) DEFAULT 1.000,
      prix_achat_ht NUMERIC(15, 4) DEFAULT 0.0000,
      taux_tva NUMERIC(5, 2) DEFAULT 20.00,
      total_ht NUMERIC(15, 2) DEFAULT 0.00,
      total_tva NUMERIC(15, 2) DEFAULT 0.00,
      total_ttc NUMERIC(15, 2) DEFAULT 0.00
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS paiements_fournisseurs (
      id BIGINT PRIMARY KEY,
      fournisseur_id BIGINT NOT NULL,
      fournisseur_nom VARCHAR(255) NOT NULL,
      facture_fournisseur_id BIGINT,
      facture_numero VARCHAR(100),
      date_paiement VARCHAR(50) NOT NULL,
      montant NUMERIC(15, 2) NOT NULL,
      mode_paiement VARCHAR(100) DEFAULT 'Chèque',
      numero_cheque_ref VARCHAR(100),
      banque_emettrice VARCHAR(100),
      date_echeance_depot VARCHAR(50),
      statut_cheque VARCHAR(100) DEFAULT 'En attente',
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // 5. Catalogue Produits & Stocks
  await sql`
    CREATE TABLE IF NOT EXISTS produits (
      id BIGINT PRIMARY KEY,
      code VARCHAR(50) NOT NULL,
      libelle VARCHAR(255) NOT NULL,
      groupe VARCHAR(100),
      famille VARCHAR(100),
      unite VARCHAR(20) DEFAULT 'KG',
      taux_tva NUMERIC(5, 2) DEFAULT 20.00,
      prix_ht NUMERIC(15, 4) DEFAULT 0.0000,
      prix_achat NUMERIC(15, 4) DEFAULT 0.0000,
      prix_achat_ht NUMERIC(15, 4) DEFAULT 0.0000,
      stock_actuel NUMERIC(15, 3) DEFAULT 0.000,
      stock_min NUMERIC(15, 3) DEFAULT 0.000,
      stock_virtuel NUMERIC(15, 3) DEFAULT 0.000,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // 6. Bons de Livraison (BL) & Lignes
  await sql`
    CREATE TABLE IF NOT EXISTS bons_livraison (
      id BIGINT PRIMARY KEY,
      numero VARCHAR(100) NOT NULL,
      date VARCHAR(50) NOT NULL,
      client_id BIGINT NOT NULL,
      client_nom VARCHAR(255) NOT NULL,
      client_ice VARCHAR(50),
      client_adresse TEXT,
      client_ville VARCHAR(100),
      total_ht NUMERIC(15, 2) DEFAULT 0.00,
      tva_20 NUMERIC(15, 2) DEFAULT 0.00,
      tva_10 NUMERIC(15, 2) DEFAULT 0.00,
      total_tva NUMERIC(15, 2) DEFAULT 0.00,
      total_ttc NUMERIC(15, 2) DEFAULT 0.00,
      montant_brut NUMERIC(15, 2) DEFAULT 0.00,
      remise_pct NUMERIC(5, 2) DEFAULT 0.00,
      ristourne_pct NUMERIC(5, 2) DEFAULT 0.00,
      escompte_pct NUMERIC(5, 2) DEFAULT 0.00,
      port NUMERIC(15, 2) DEFAULT 0.00,
      statut VARCHAR(50) DEFAULT 'En attente',
      etat VARCHAR(50) DEFAULT 'Validé',
      cloture_sans_facture BOOLEAN NOT NULL DEFAULT FALSE,
      facture_id BIGINT,
      facture_numero VARCHAR(100),
      mode_reglement VARCHAR(100) DEFAULT 'Virement',
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    ALTER TABLE bons_livraison
    ADD COLUMN IF NOT EXISTS cloture_sans_facture BOOLEAN NOT NULL DEFAULT FALSE;
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS bons_livraison_lignes (
      id BIGINT PRIMARY KEY,
      bon_livraison_id BIGINT NOT NULL,
      produit_id BIGINT,
      designation VARCHAR(255) NOT NULL,
      groupe VARCHAR(100),
      unite VARCHAR(20) DEFAULT 'KG',
      quantite NUMERIC(15, 3) DEFAULT 1.000,
      prix_ht NUMERIC(15, 4) DEFAULT 0.0000,
      taux_tva NUMERIC(5, 2) DEFAULT 20.00,
      remise_pct NUMERIC(5, 2) DEFAULT 0.00,
      total_ht NUMERIC(15, 2) DEFAULT 0.00,
      total_tva NUMERIC(15, 2) DEFAULT 0.00,
      total_ttc NUMERIC(15, 2) DEFAULT 0.00
    );
  `;

  // 7. Bons de Retour (BR) & Lignes
  await sql`
    CREATE TABLE IF NOT EXISTS bons_retour (
      id BIGINT PRIMARY KEY,
      numero VARCHAR(100) NOT NULL,
      date VARCHAR(50) NOT NULL,
      client_id BIGINT NOT NULL,
      client_nom VARCHAR(255) NOT NULL,
      client_ice VARCHAR(50),
      client_adresse TEXT,
      client_ville VARCHAR(100),
      total_ht NUMERIC(15, 2) DEFAULT 0.00,
      tva_20 NUMERIC(15, 2) DEFAULT 0.00,
      tva_10 NUMERIC(15, 2) DEFAULT 0.00,
      total_tva NUMERIC(15, 2) DEFAULT 0.00,
      total_ttc NUMERIC(15, 2) DEFAULT 0.00,
      motif TEXT,
      statut VARCHAR(50) DEFAULT 'En attente',
      etat VARCHAR(50) DEFAULT 'Validé',
      facture_id BIGINT,
      facture_numero VARCHAR(100),
      mode_reglement VARCHAR(100),
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS bons_retour_lignes (
      id BIGINT PRIMARY KEY,
      bon_retour_id BIGINT NOT NULL,
      produit_id BIGINT,
      designation VARCHAR(255) NOT NULL,
      groupe VARCHAR(100),
      unite VARCHAR(20) DEFAULT 'KG',
      quantite NUMERIC(15, 3) DEFAULT 1.000,
      prix_ht NUMERIC(15, 4) DEFAULT 0.0000,
      taux_tva NUMERIC(5, 2) DEFAULT 20.00,
      remise_pct NUMERIC(5, 2) DEFAULT 0.00,
      total_ht NUMERIC(15, 2) DEFAULT 0.00,
      total_tva NUMERIC(15, 2) DEFAULT 0.00,
      total_ttc NUMERIC(15, 2) DEFAULT 0.00
    );
  `;

  // 8. Factures de Vente & Lignes
  await sql`
    CREATE TABLE IF NOT EXISTS factures (
      id BIGINT PRIMARY KEY,
      numero VARCHAR(100) NOT NULL,
      date VARCHAR(50) NOT NULL,
      client_id BIGINT NOT NULL,
      client_nom VARCHAR(255) NOT NULL,
      client_ice VARCHAR(50),
      client_adresse TEXT,
      client_ville VARCHAR(100),
      total_ht NUMERIC(15, 2) DEFAULT 0.00,
      tva_20 NUMERIC(15, 2) DEFAULT 0.00,
      tva_10 NUMERIC(15, 2) DEFAULT 0.00,
      total_tva NUMERIC(15, 2) DEFAULT 0.00,
      total_ttc NUMERIC(15, 2) DEFAULT 0.00,
      montant_regle NUMERIC(15, 2) DEFAULT 0.00,
      reste_a_payer NUMERIC(15, 2) DEFAULT 0.00,
      statut_paiement VARCHAR(50) DEFAULT 'Impayé',
      etat VARCHAR(50) DEFAULT 'Validé',
      mode_reglement VARCHAR(100) DEFAULT 'Virement',
      notes TEXT,
      bl_associes TEXT,
      br_associes TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS factures_lignes (
      id BIGINT PRIMARY KEY,
      facture_id BIGINT NOT NULL,
      produit_id BIGINT,
      designation VARCHAR(255) NOT NULL,
      groupe VARCHAR(100),
      unite VARCHAR(20) DEFAULT 'KG',
      quantite NUMERIC(15, 3) DEFAULT 1.000,
      prix_ht NUMERIC(15, 4) DEFAULT 0.0000,
      taux_tva NUMERIC(5, 2) DEFAULT 20.00,
      remise_pct NUMERIC(5, 2) DEFAULT 0.00,
      total_ht NUMERIC(15, 2) DEFAULT 0.00,
      total_tva NUMERIC(15, 2) DEFAULT 0.00,
      total_ttc NUMERIC(15, 2) DEFAULT 0.00
    );
  `;

  // 9. Devis
  await sql`
    CREATE TABLE IF NOT EXISTS devis (
      id BIGINT PRIMARY KEY,
      numero VARCHAR(100) NOT NULL,
      date VARCHAR(50) NOT NULL,
      date_validite VARCHAR(50),
      client_id BIGINT NOT NULL,
      client_nom VARCHAR(255) NOT NULL,
      client_ice VARCHAR(50),
      client_adresse TEXT,
      client_ville VARCHAR(100),
      total_ht NUMERIC(15, 2) DEFAULT 0.00,
      total_tva NUMERIC(15, 2) DEFAULT 0.00,
      total_ttc NUMERIC(15, 2) DEFAULT 0.00,
      statut VARCHAR(50) DEFAULT 'Brouillon',
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS devis_lignes (
      id BIGINT PRIMARY KEY,
      devis_id BIGINT NOT NULL,
      produit_id BIGINT,
      designation VARCHAR(255) NOT NULL,
      groupe VARCHAR(100),
      unite VARCHAR(20) DEFAULT 'KG',
      quantite NUMERIC(15, 3) DEFAULT 1.000,
      prix_ht NUMERIC(15, 4) DEFAULT 0.0000,
      taux_tva NUMERIC(5, 2) DEFAULT 20.00,
      remise_pct NUMERIC(5, 2) DEFAULT 0.00,
      total_ht NUMERIC(15, 2) DEFAULT 0.00,
      total_tva NUMERIC(15, 2) DEFAULT 0.00,
      total_ttc NUMERIC(15, 2) DEFAULT 0.00
    );
  `;

  // 10. Règlements & Mouvements de Stock
  await sql`
    CREATE TABLE IF NOT EXISTS reglements (
      id BIGINT PRIMARY KEY,
      piece_type VARCHAR(50) DEFAULT 'FACTURE',
      piece_id BIGINT,
      piece_numero VARCHAR(100),
      facture_id BIGINT,
      facture_numero VARCHAR(100),
      client_id BIGINT NOT NULL,
      client_nom VARCHAR(255) NOT NULL,
      date VARCHAR(50) NOT NULL,
      montant NUMERIC(15, 2) NOT NULL,
      mode_reglement VARCHAR(100) DEFAULT 'Virement',
      mode VARCHAR(100),
      reference_paiement VARCHAR(100),
      banque VARCHAR(100),
      date_echeance VARCHAR(50),
      statut_encaissement VARCHAR(50) DEFAULT 'Encaissé',
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS stock_mouvements (
      id BIGINT PRIMARY KEY,
      date VARCHAR(50) NOT NULL,
      produit_id BIGINT NOT NULL,
      produit_code VARCHAR(50),
      produit_libelle VARCHAR(255) NOT NULL,
      type_mouvement VARCHAR(50) NOT NULL,
      quantite NUMERIC(15, 3) NOT NULL,
      stock_avant NUMERIC(15, 3) DEFAULT 0.000,
      stock_apres NUMERIC(15, 3) DEFAULT 0.000,
      document_type VARCHAR(50),
      document_id BIGINT,
      document_numero VARCHAR(100),
      motif TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // 11. Restaurant & Bar POS
  await sql`
    CREATE TABLE IF NOT EXISTS pos_tables (
      id BIGINT PRIMARY KEY,
      numero VARCHAR(50) NOT NULL,
      nom VARCHAR(100) NOT NULL,
      zone VARCHAR(100) DEFAULT 'Salle Principale',
      capacite INT DEFAULT 4,
      statut VARCHAR(50) DEFAULT 'LIBRE',
      session_id BIGINT,
      nb_couverts INT DEFAULT 0,
      montant_en_cours NUMERIC(15, 2) DEFAULT 0.00,
      serveur VARCHAR(100),
      heure_ouverture VARCHAR(50),
      commande_json TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Auto-migrate missing pos_tables columns if created previously
  await sql`ALTER TABLE pos_tables ADD COLUMN IF NOT EXISTS commande_json TEXT;`.catch(() => {});
  await sql`ALTER TABLE pos_tables ADD COLUMN IF NOT EXISTS notes TEXT;`.catch(() => {});
  await sql`ALTER TABLE pos_tables ADD COLUMN IF NOT EXISTS montant_en_cours NUMERIC(15, 2) DEFAULT 0.00;`.catch(() => {});
  await sql`ALTER TABLE pos_tables ADD COLUMN IF NOT EXISTS heure_ouverture VARCHAR(50);`.catch(() => {});
  await sql`ALTER TABLE pos_tables ADD COLUMN IF NOT EXISTS nb_couverts INT DEFAULT 0;`.catch(() => {});

  await sql`
    CREATE TABLE IF NOT EXISTS pos_categories (
      id BIGINT PRIMARY KEY,
      code VARCHAR(50) NOT NULL,
      nom VARCHAR(100) NOT NULL,
      icone VARCHAR(50) DEFAULT 'utensils',
      couleur VARCHAR(50) DEFAULT '#0284c7',
      ordre INT DEFAULT 0,
      actif INT DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS pos_produits (
      id BIGINT PRIMARY KEY,
      code VARCHAR(50) NOT NULL,
      nom VARCHAR(255) NOT NULL,
      description TEXT,
      categorie_id BIGINT,
      categorie_nom VARCHAR(100),
      prix_vente_ttc NUMERIC(15, 2) NOT NULL,
      taux_tva NUMERIC(5, 2) DEFAULT 20.00,
      temps_preparation_min INT DEFAULT 10,
      disponible INT DEFAULT 1,
      image_url TEXT,
      couleur VARCHAR(50),
      actif INT DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS pos_sessions (
      id BIGINT PRIMARY KEY,
      numero_session VARCHAR(100) NOT NULL,
      service VARCHAR(50) DEFAULT 'MIDI',
      caissier VARCHAR(100) NOT NULL,
      date_ouverture VARCHAR(50) NOT NULL,
      date_cloture VARCHAR(50),
      fond_caisse_ouverture NUMERIC(15, 2) DEFAULT 0.00,
      total_ventes NUMERIC(15, 2) DEFAULT 0.00,
      total_especes NUMERIC(15, 2) DEFAULT 0.00,
      total_carte NUMERIC(15, 2) DEFAULT 0.00,
      total_cheque NUMERIC(15, 2) DEFAULT 0.00,
      total_autre NUMERIC(15, 2) DEFAULT 0.00,
      nb_tickets INT DEFAULT 0,
      total_couverts INT DEFAULT 0,
      montant_reel_cloture NUMERIC(15, 2) DEFAULT 0.00,
      ecart_caisse NUMERIC(15, 2) DEFAULT 0.00,
      statut VARCHAR(50) DEFAULT 'OUVERTE',
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS pos_ventes (
      id BIGINT PRIMARY KEY,
      numero_ticket VARCHAR(100) NOT NULL,
      session_id BIGINT,
      table_id BIGINT,
      table_numero VARCHAR(50),
      zone VARCHAR(100),
      type_commande VARCHAR(50) DEFAULT 'SUR_PLACE',
      nb_couverts INT DEFAULT 1,
      serveur VARCHAR(100) DEFAULT 'Chef de Rang',
      date_vente VARCHAR(50) NOT NULL,
      heure_commande VARCHAR(50),
      heure_paiement VARCHAR(50),
      client_nom VARCHAR(255) DEFAULT 'Client Comptoir',
      client_telephone VARCHAR(50),
      client_ice VARCHAR(50),
      total_ht NUMERIC(15, 2) DEFAULT 0.00,
      total_tva NUMERIC(15, 2) DEFAULT 0.00,
      tva_20 NUMERIC(15, 2) DEFAULT 0.00,
      tva_10 NUMERIC(15, 2) DEFAULT 0.00,
      tva_7 NUMERIC(15, 2) DEFAULT 0.00,
      tva_0 NUMERIC(15, 2) DEFAULT 0.00,
      total_ttc NUMERIC(15, 2) DEFAULT 0.00,
      remise_globale_montant NUMERIC(15, 2) DEFAULT 0.00,
      pourboire NUMERIC(15, 2) DEFAULT 0.00,
      montant_net_a_payer NUMERIC(15, 2) DEFAULT 0.00,
      montant_donne NUMERIC(15, 2) DEFAULT 0.00,
      montant_rendu NUMERIC(15, 2) DEFAULT 0.00,
      mode_reglement VARCHAR(50) DEFAULT 'Espèces',
      reference_paiement VARCHAR(100),
      statut VARCHAR(50) DEFAULT 'PAYE',
      caissier VARCHAR(100) DEFAULT 'Caisse Principale',
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS pos_ventes_lignes (
      id BIGINT PRIMARY KEY,
      vente_id BIGINT NOT NULL,
      produit_id BIGINT,
      produit_code VARCHAR(50),
      produit_nom VARCHAR(255) NOT NULL,
      prix_unitaire_ttc NUMERIC(15, 2) NOT NULL,
      taux_tva NUMERIC(5, 2) DEFAULT 20.00,
      quantite NUMERIC(15, 3) DEFAULT 1.000,
      remise_pct NUMERIC(5, 2) DEFAULT 0.00,
      total_ht NUMERIC(15, 2) DEFAULT 0.00,
      total_tva NUMERIC(15, 2) DEFAULT 0.00,
      total_ttc NUMERIC(15, 2) DEFAULT 0.00,
      notes TEXT,
      suite BOOLEAN DEFAULT FALSE
    );
  `;

  // 12. Utilisateurs & Authentification
  await sql`
    CREATE TABLE IF NOT EXISTS app_users (
      id BIGINT PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      nom_complet VARCHAR(255) NOT NULL,
      email VARCHAR(150),
      role VARCHAR(50) DEFAULT 'CAISSE',
      pin_code VARCHAR(50),
      mot_de_passe VARCHAR(255),
      avatar VARCHAR(50),
      statut INT DEFAULT 1,
      derniere_connexion VARCHAR(50),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Indexes for the frequent list, filter and document-line lookups. They are
  // idempotent and also repair databases that were created before these
  // indexes were added.
  const indexStatements = [
    'CREATE INDEX IF NOT EXISTS clients_nom_idx ON clients (nom)',
    'CREATE INDEX IF NOT EXISTS produits_libelle_idx ON produits (libelle)',
    'CREATE INDEX IF NOT EXISTS fournisseurs_nom_idx ON fournisseurs (nom)',
    'CREATE INDEX IF NOT EXISTS bons_livraison_date_idx ON bons_livraison (date)',
    'CREATE INDEX IF NOT EXISTS bons_livraison_client_idx ON bons_livraison (client_id)',
    'CREATE INDEX IF NOT EXISTS bons_livraison_numero_idx ON bons_livraison (numero)',
    'CREATE INDEX IF NOT EXISTS bons_livraison_lignes_document_idx ON bons_livraison_lignes (bon_livraison_id)',
    'CREATE INDEX IF NOT EXISTS bons_retour_date_idx ON bons_retour (date)',
    'CREATE INDEX IF NOT EXISTS bons_retour_client_idx ON bons_retour (client_id)',
    'CREATE INDEX IF NOT EXISTS bons_retour_lignes_document_idx ON bons_retour_lignes (bon_retour_id)',
    'CREATE INDEX IF NOT EXISTS factures_date_idx ON factures (date)',
    'CREATE INDEX IF NOT EXISTS factures_client_idx ON factures (client_id)',
    'CREATE INDEX IF NOT EXISTS factures_numero_idx ON factures (numero)',
    'CREATE INDEX IF NOT EXISTS factures_lignes_document_idx ON factures_lignes (facture_id)',
    'CREATE INDEX IF NOT EXISTS devis_date_idx ON devis (date)',
    'CREATE INDEX IF NOT EXISTS devis_client_idx ON devis (client_id)',
    'CREATE INDEX IF NOT EXISTS devis_lignes_document_idx ON devis_lignes (devis_id)',
    'CREATE INDEX IF NOT EXISTS reglements_date_idx ON reglements (date)',
    'CREATE INDEX IF NOT EXISTS reglements_client_idx ON reglements (client_id)',
    'CREATE INDEX IF NOT EXISTS reglements_facture_idx ON reglements (facture_id)',
    'CREATE INDEX IF NOT EXISTS client_tarifs_client_idx ON client_tarifs (client_id)',
  ];
  await Promise.all(indexStatements.map((statement) => sql.query(statement, []).catch((err: any) => {
    console.warn(`Notice création index (${statement}):`, err?.message || err);
  })));

  // Check if company_info is empty, if so insert default Verde Orto company info
  try {
    const existingCompany: any = await sql`SELECT count(*) as count FROM company_info;`;
    const count = parseInt(existingCompany?.[0]?.count || '0', 10);
    if (count === 0) {
      await sql`
        INSERT INTO company_info (
          nom, forme_juridique, capital, adresse, code_postal, ville, pays,
          telephone, email, ice, if_fiscal, rc, cnss, patente, banque, rib
        ) VALUES (
          'VERDEORTO SARL AU', 'SARL AU', '100 000,00',
          'Avenue Al Mouqaouama, Quartier Ain Merroudi, Résidence DaVinci, Bloc F, Magasin N°20',
          '40000', 'Marrakech', 'Maroc', '0808551156 / 0678301643', 'verdeorto@gmail.com',
          '000194441000024', '3381764', '35265', '7788302', '46201837',
          'Banque Populaire', '145 450 21211 2604506 000 4 11'
        );
      `;
    }
  } catch (err) {
    console.warn('Notice seeding company info:', err);
  }

  // Check if categories are empty, seed official data
  try {
    const existingCats: any = await sql`SELECT count(*) as count FROM categories;`;
    if (parseInt(existingCats?.[0]?.count || '0', 10) === 0) {
      for (const cat of OFFICIAL_CATEGORIES) {
        const catCode = `CAT${cat.id}`;
        await sql`
          INSERT INTO categories (id, code, libelle, nom)
          VALUES (${cat.id}, ${catCode}, ${cat.libelle}, ${cat.libelle})
          ON CONFLICT (id) DO NOTHING;
        `;
      }
    }
  } catch (_) {}

  // Create the initial administrator only when explicit bootstrap credentials are configured.
  try {
    const initialAdminPassword = process.env.INITIAL_ADMIN_PASSWORD;
    const initialAdminPin = process.env.INITIAL_ADMIN_PIN;
    if (initialAdminPassword && initialAdminPin) {
      await sql`
        INSERT INTO app_users (id, username, nom_complet, email, role, pin_code, mot_de_passe, avatar, statut)
        VALUES (1, 'admin', 'Administrateur Principal', 'admin@verdeorto.ma', 'ADMIN', ${initialAdminPin}, ${initialAdminPassword}, 'AD', 1)
        ON CONFLICT (id) DO NOTHING;
      `;
    }
  } catch (err) {
    console.warn('Notice seeding users:', err);
  }

  // Update factures dated 01/09/2026 to 31/08/2026
  try {
    await sql`
      UPDATE factures
      SET date = '2026-08-31'
      WHERE date = '2026-09-01' OR date = '01/09/2026' OR date LIKE '2026-09-01%' OR date LIKE '01/09/2026%';
    `;
  } catch (err) {
    console.warn('Notice updating facture dates:', err);
  }

  return { success: true, message: 'Schéma PostgreSQL Neon initialisé avec succès' };
}

/**
 * Imports full database payload (JSON or SQL) directly into Neon PostgreSQL.
 * Supports replace and merge modes with detailed breakdown of imported counts.
 */
export async function importDataToNeon(params: {
  data?: any;
  sql?: string;
  mode?: 'replace' | 'merge';
  customUrl?: string;
}) {
  const { data, sql: rawSql, mode = 'merge', customUrl } = params;
  const sql = getNeonSql(customUrl);
  const startTime = Date.now();

  // First ensure tables exist
  await initNeonPostgresSchema(customUrl);

  const counts: Record<string, number> = {
    company: 0,
    categories: 0,
    familles: 0,
    marques: 0,
    clients: 0,
    client_tarifs: 0,
    fournisseurs: 0,
    produits: 0,
    bons_livraison: 0,
    bons_livraison_lignes: 0,
    bons_retour: 0,
    bons_retour_lignes: 0,
    factures: 0,
    factures_lignes: 0,
    factures_fournisseurs: 0,
    paiements_fournisseurs: 0,
    devis: 0,
    devis_lignes: 0,
    reglements: 0,
    stock_mouvements: 0,
    pos_tables: 0,
    pos_categories: 0,
    pos_produits: 0,
    pos_sessions: 0,
    pos_ventes: 0,
    pos_ventes_lignes: 0,
    app_users: 0,
  };

  // Case 1: Raw SQL execution
  if (rawSql && rawSql.trim()) {
    // Split SQL statements intelligently
    const statements = rawSql
      .replace(/--.*$/gm, '') // remove line comments
      .split(/;\s*[\r\n]+|;\s*$/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    let executedStatements = 0;
    for (const stmt of statements) {
      if (stmt) {
        try {
          await (sql as any)([stmt]);
          executedStatements++;
        } catch (err: any) {
          console.warn('SQL import notice for statement:', stmt.slice(0, 80), err?.message || err);
        }
      }
    }

    return {
      success: true,
      mode,
      durationMs: Date.now() - startTime,
      executedStatements,
      totalStatements: statements.length,
      counts,
      message: `${executedStatements} instructions SQL exécutées avec succès sur Neon PostgreSQL.`,
    };
  }

  // Case 2: Structured JSON Data
  if (data && typeof data === 'object') {
    // If replace mode, clear data tables (without dropping schema)
    if (mode === 'replace') {
      try {
        await sql`
          TRUNCATE TABLE 
            pos_ventes_lignes, pos_ventes, pos_sessions, pos_produits, pos_categories, pos_tables,
            stock_mouvements, reglements, devis_lignes, devis,
            paiements_fournisseurs, factures_fournisseurs_lignes, factures_fournisseurs,
            factures_lignes, factures, bons_retour_lignes, bons_retour,
            bons_livraison_lignes, bons_livraison, client_tarifs,
            produits, fournisseurs, clients, marques, familles, categories
          CASCADE;
        `;
      } catch (err) {
        console.warn('Truncate cascade notice:', err);
      }
    }

    // A. Company Info
    const company = data.company || data.company_info;
    if (company && typeof company === 'object') {
      try {
        await sql`
          INSERT INTO company_info (
            id, nom, forme_juridique, capital, adresse, code_postal, ville, pays,
            telephone, fax, email, site_web, ice, if_fiscal, rc, cnss, patente,
            banque, rib, logo_titre, logo_sous_titre, logo_mode, logo_placement
          ) VALUES (
            1,
            ${company.nom || 'VERDEORTO SARL AU'},
            ${company.forme_juridique || 'SARL AU'},
            ${company.capital || '100 000,00'},
            ${company.adresse || ''},
            ${company.code_postal || '40000'},
            ${company.ville || 'Marrakech'},
            ${company.pays || 'Maroc'},
            ${company.telephone || ''},
            ${company.fax || ''},
            ${company.email || ''},
            ${company.site_web || ''},
            ${company.ice || '000194441000024'},
            ${company.if_fiscal || ''},
            ${company.rc || ''},
            ${company.cnss || ''},
            ${company.patente || ''},
            ${company.banque || ''},
            ${company.rib || ''},
            ${company.logo_titre || ''},
            ${company.logo_sous_titre || ''},
            ${company.logo_mode || 'both'},
            ${company.logo_placement || 'left'}
          )
          ON CONFLICT (id) DO UPDATE SET
            nom = EXCLUDED.nom,
            forme_juridique = EXCLUDED.forme_juridique,
            capital = EXCLUDED.capital,
            adresse = EXCLUDED.adresse,
            code_postal = EXCLUDED.code_postal,
            ville = EXCLUDED.ville,
            pays = EXCLUDED.pays,
            telephone = EXCLUDED.telephone,
            fax = EXCLUDED.fax,
            email = EXCLUDED.email,
            site_web = EXCLUDED.site_web,
            ice = EXCLUDED.ice,
            if_fiscal = EXCLUDED.if_fiscal,
            rc = EXCLUDED.rc,
            cnss = EXCLUDED.cnss,
            patente = EXCLUDED.patente,
            banque = EXCLUDED.banque,
            rib = EXCLUDED.rib,
            logo_titre = EXCLUDED.logo_titre,
            logo_sous_titre = EXCLUDED.logo_sous_titre,
            logo_mode = EXCLUDED.logo_mode,
            logo_placement = EXCLUDED.logo_placement;
        `;
        counts.company = 1;
      } catch (e) {
        console.warn('Import company notice:', e);
      }
    }

    // B. Categories
    const categories = Array.isArray(data.categories) ? data.categories : [];
    for (const cat of categories) {
      if (cat.id && (cat.libelle || cat.nom)) {
        try {
          await sql`
            INSERT INTO categories (id, code, libelle, nom, description)
            VALUES (${cat.id}, ${cat.code || `CAT${cat.id}`}, ${cat.libelle || cat.nom}, ${cat.nom || cat.libelle}, ${cat.description || ''})
            ON CONFLICT (id) DO UPDATE SET
              code = EXCLUDED.code,
              libelle = EXCLUDED.libelle,
              nom = EXCLUDED.nom,
              description = EXCLUDED.description;
          `;
          counts.categories++;
        } catch (_) {}
      }
    }

    // C. Familles
    const familles = Array.isArray(data.familles) ? data.familles : [];
    for (const fam of familles) {
      if (fam.id && (fam.libelle || fam.nom)) {
        try {
          await sql`
            INSERT INTO familles (id, code, libelle, nom, categorie, categorie_id, description)
            VALUES (${fam.id}, ${fam.code || `FAM${fam.id}`}, ${fam.libelle || fam.nom}, ${fam.nom || fam.libelle}, ${fam.categorie || ''}, ${fam.categorie_id || null}, ${fam.description || ''})
            ON CONFLICT (id) DO UPDATE SET
              code = EXCLUDED.code,
              libelle = EXCLUDED.libelle,
              nom = EXCLUDED.nom,
              categorie = EXCLUDED.categorie,
              categorie_id = EXCLUDED.categorie_id,
              description = EXCLUDED.description;
          `;
          counts.familles++;
        } catch (_) {}
      }
    }

    // D. Clients
    const clients = Array.isArray(data.clients) ? data.clients : [];
    for (const cl of clients) {
      if (cl.id && cl.nom) {
        try {
          await sql`
            INSERT INTO clients (
              id, code, nom, interlocuteur, adresse, code_postal, ville, pays,
              telephone, mobile, fax, email, site_web, ice, observations, notes,
              solde, total_achats, bl_non_factures_count
            ) VALUES (
              ${cl.id},
              ${cl.code || `CLI-${cl.id}`},
              ${cl.nom},
              ${cl.interlocuteur || ''},
              ${cl.adresse || ''},
              ${cl.code_postal || '40000'},
              ${cl.ville || 'Marrakech'},
              ${cl.pays || 'Maroc'},
              ${cl.telephone || cl.tel || ''},
              ${cl.mobile || ''},
              ${cl.fax || ''},
              ${cl.email || ''},
              ${cl.site_web || ''},
              ${cl.ice || ''},
              ${cl.observations || ''},
              ${cl.notes || ''},
              ${cl.solde || 0},
              ${cl.total_achats || 0},
              ${cl.bl_non_factures_count || 0}
            )
            ON CONFLICT (id) DO UPDATE SET
              code = EXCLUDED.code,
              nom = EXCLUDED.nom,
              interlocuteur = EXCLUDED.interlocuteur,
              adresse = EXCLUDED.adresse,
              code_postal = EXCLUDED.code_postal,
              ville = EXCLUDED.ville,
              pays = EXCLUDED.pays,
              telephone = EXCLUDED.telephone,
              mobile = EXCLUDED.mobile,
              fax = EXCLUDED.fax,
              email = EXCLUDED.email,
              site_web = EXCLUDED.site_web,
              ice = EXCLUDED.ice,
              observations = EXCLUDED.observations,
              notes = EXCLUDED.notes,
              solde = EXCLUDED.solde,
              total_achats = EXCLUDED.total_achats,
              bl_non_factures_count = EXCLUDED.bl_non_factures_count;
          `;
          counts.clients++;
        } catch (e) {
          console.warn('Client import notice:', e);
        }
      }
    }

    // E. Fournisseurs
    const fournisseurs = Array.isArray(data.fournisseurs) ? data.fournisseurs : [];
    for (const fr of fournisseurs) {
      if (fr.id && fr.nom) {
        try {
          await sql`
            INSERT INTO fournisseurs (
              id, code, nom, interlocuteur, adresse, code_postal, ville,
              telephone, gsm, mobile, fax, email, ice, observations, notes,
              solde_du, total_achats
            ) VALUES (
              ${fr.id},
              ${fr.code || `FOUR-${fr.id}`},
              ${fr.nom},
              ${fr.interlocuteur || ''},
              ${fr.adresse || ''},
              ${fr.code_postal || ''},
              ${fr.ville || 'Marrakech'},
              ${fr.telephone || fr.tel || ''},
              ${fr.gsm || ''},
              ${fr.mobile || ''},
              ${fr.fax || ''},
              ${fr.email || ''},
              ${fr.ice || ''},
              ${fr.observations || ''},
              ${fr.notes || ''},
              ${fr.solde_du || 0},
              ${fr.total_achats || 0}
            )
            ON CONFLICT (id) DO UPDATE SET
              code = EXCLUDED.code,
              nom = EXCLUDED.nom,
              interlocuteur = EXCLUDED.interlocuteur,
              adresse = EXCLUDED.adresse,
              ville = EXCLUDED.ville,
              telephone = EXCLUDED.telephone,
              email = EXCLUDED.email,
              ice = EXCLUDED.ice,
              solde_du = EXCLUDED.solde_du,
              total_achats = EXCLUDED.total_achats;
          `;
          counts.fournisseurs++;
        } catch (_) {}
      }
    }

    // F. Produits
    const produits = Array.isArray(data.produits || data.articles || data.products)
      ? (data.produits || data.articles || data.products)
      : [];
    for (const pr of produits) {
      if (pr.id && (pr.libelle || pr.nom)) {
        try {
          await sql`
            INSERT INTO produits (
              id, code, libelle, groupe, famille, unite, taux_tva,
              prix_ht, prix_achat, prix_achat_ht, stock_actuel, stock_min, stock_virtuel, description
            ) VALUES (
              ${pr.id},
              ${pr.code || `PRD-${pr.id}`},
              ${pr.libelle || pr.nom},
              ${pr.groupe || ''},
              ${pr.famille || ''},
              ${pr.unite || 'KG'},
              ${pr.taux_tva || 20.0},
              ${pr.prix_ht || pr.prix_vente_ht || 0},
              ${pr.prix_achat || 0},
              ${pr.prix_achat_ht || pr.prix_achat || 0},
              ${pr.stock_actuel || pr.stock || 0},
              ${pr.stock_min || 0},
              ${pr.stock_virtuel || pr.stock_actuel || 0},
              ${pr.description || ''}
            )
            ON CONFLICT (id) DO UPDATE SET
              code = EXCLUDED.code,
              libelle = EXCLUDED.libelle,
              groupe = EXCLUDED.groupe,
              famille = EXCLUDED.famille,
              unite = EXCLUDED.unite,
              taux_tva = EXCLUDED.taux_tva,
              prix_ht = EXCLUDED.prix_ht,
              prix_achat = EXCLUDED.prix_achat,
              prix_achat_ht = EXCLUDED.prix_achat_ht,
              stock_actuel = EXCLUDED.stock_actuel,
              stock_min = EXCLUDED.stock_min,
              stock_virtuel = EXCLUDED.stock_virtuel,
              description = EXCLUDED.description;
          `;
          counts.produits++;
        } catch (e) {
          console.warn('Produit import notice:', e);
        }
      }
    }

    // G. Bons de Livraison (BL)
    const bls = Array.isArray(data.bons_livraison || data.bl) ? (data.bons_livraison || data.bl) : [];
    for (const bl of bls) {
      if (bl.id && bl.numero && bl.client_id) {
        try {
          await sql`
            INSERT INTO bons_livraison (
              id, numero, date, client_id, client_nom, client_ice, client_adresse, client_ville,
              total_ht, tva_20, tva_10, total_tva, total_ttc, montant_brut, remise_pct,
              statut, etat, facture_id, facture_numero, mode_reglement, notes
            ) VALUES (
              ${bl.id},
              ${bl.numero},
              ${bl.date || new Date().toISOString().slice(0, 10)},
              ${bl.client_id},
              ${bl.client_nom || ''},
              ${bl.client_ice || ''},
              ${bl.client_adresse || ''},
              ${bl.client_ville || ''},
              ${bl.total_ht || 0},
              ${bl.tva_20 || 0},
              ${bl.tva_10 || 0},
              ${bl.total_tva || 0},
              ${bl.total_ttc || 0},
              ${bl.montant_brut || bl.total_ht || 0},
              ${bl.remise_pct || 0},
              ${bl.statut || 'En attente'},
              ${bl.etat || 'Validé'},
              ${bl.facture_id || null},
              ${bl.facture_numero || null},
              ${bl.mode_reglement || 'Virement'},
              ${bl.notes || ''}
            )
            ON CONFLICT (id) DO UPDATE SET
              numero = EXCLUDED.numero,
              date = EXCLUDED.date,
              client_id = EXCLUDED.client_id,
              client_nom = EXCLUDED.client_nom,
              total_ht = EXCLUDED.total_ht,
              total_ttc = EXCLUDED.total_ttc,
              statut = EXCLUDED.statut,
              facture_id = EXCLUDED.facture_id,
              facture_numero = EXCLUDED.facture_numero;
          `;
          counts.bons_livraison++;

          // Lignes de BL
          const lignes = Array.isArray(bl.lignes) ? bl.lignes : [];
          for (let li = 0; li < lignes.length; li++) {
            const l = lignes[li];
            const ligneId = l.id || (bl.id * 1000 + li + 1);
            try {
              await sql`
                INSERT INTO bons_livraison_lignes (
                  id, bon_livraison_id, produit_id, designation, groupe, unite,
                  quantite, prix_ht, taux_tva, remise_pct, total_ht, total_tva, total_ttc
                ) VALUES (
                  ${ligneId},
                  ${bl.id},
                  ${l.produit_id || null},
                  ${l.designation || 'Article'},
                  ${l.groupe || ''},
                  ${l.unite || 'KG'},
                  ${l.quantite || 1},
                  ${l.prix_ht || 0},
                  ${l.taux_tva || 20},
                  ${l.remise_pct || 0},
                  ${l.total_ht || 0},
                  ${l.total_tva || 0},
                  ${l.total_ttc || 0}
                )
                ON CONFLICT (id) DO UPDATE SET
                  designation = EXCLUDED.designation,
                  quantite = EXCLUDED.quantite,
                  prix_ht = EXCLUDED.prix_ht,
                  total_ttc = EXCLUDED.total_ttc;
              `;
              counts.bons_livraison_lignes++;
            } catch (_) {}
          }
        } catch (e) {
          console.warn('BL import notice:', e);
        }
      }
    }

    // H. Factures de Vente
    const factures = Array.isArray(data.factures) ? data.factures : [];
    for (const f of factures) {
      if (f.id && f.numero && f.client_id) {
        try {
          await sql`
            INSERT INTO factures (
              id, numero, date, client_id, client_nom, client_ice, client_adresse, client_ville,
              total_ht, tva_20, tva_10, total_tva, total_ttc, montant_regle, reste_a_payer,
              statut_paiement, etat, mode_reglement, notes, bl_associes
            ) VALUES (
              ${f.id},
              ${f.numero},
              ${f.date || new Date().toISOString().slice(0, 10)},
              ${f.client_id},
              ${f.client_nom || ''},
              ${f.client_ice || ''},
              ${f.client_adresse || ''},
              ${f.client_ville || ''},
              ${f.total_ht || 0},
              ${f.tva_20 || 0},
              ${f.tva_10 || 0},
              ${f.total_tva || 0},
              ${f.total_ttc || 0},
              ${f.montant_regle || 0},
              ${f.reste_a_payer !== undefined ? f.reste_a_payer : (f.total_ttc || 0) - (f.montant_regle || 0)},
              ${f.statut_paiement || 'Impayé'},
              ${f.etat || 'Validé'},
              ${f.mode_reglement || 'Virement'},
              ${f.notes || ''},
              ${typeof f.bl_associes === 'string' ? f.bl_associes : JSON.stringify(f.bl_associes || [])}
            )
            ON CONFLICT (id) DO UPDATE SET
              numero = EXCLUDED.numero,
              date = EXCLUDED.date,
              client_id = EXCLUDED.client_id,
              client_nom = EXCLUDED.client_nom,
              total_ht = EXCLUDED.total_ht,
              total_ttc = EXCLUDED.total_ttc,
              montant_regle = EXCLUDED.montant_regle,
              reste_a_payer = EXCLUDED.reste_a_payer,
              statut_paiement = EXCLUDED.statut_paiement;
          `;
          counts.factures++;

          // Lignes de facture
          const lignes = Array.isArray(f.lignes) ? f.lignes : [];
          for (let li = 0; li < lignes.length; li++) {
            const l = lignes[li];
            const ligneId = l.id || (f.id * 1000 + li + 1);
            try {
              await sql`
                INSERT INTO factures_lignes (
                  id, facture_id, produit_id, designation, groupe, unite,
                  quantite, prix_ht, taux_tva, remise_pct, total_ht, total_tva, total_ttc
                ) VALUES (
                  ${ligneId},
                  ${f.id},
                  ${l.produit_id || null},
                  ${l.designation || 'Article'},
                  ${l.groupe || ''},
                  ${l.unite || 'KG'},
                  ${l.quantite || 1},
                  ${l.prix_ht || 0},
                  ${l.taux_tva || 20},
                  ${l.remise_pct || 0},
                  ${l.total_ht || 0},
                  ${l.total_tva || 0},
                  ${l.total_ttc || 0}
                )
                ON CONFLICT (id) DO UPDATE SET
                  designation = EXCLUDED.designation,
                  quantite = EXCLUDED.quantite,
                  prix_ht = EXCLUDED.prix_ht,
                  total_ttc = EXCLUDED.total_ttc;
              `;
              counts.factures_lignes++;
            } catch (_) {}
          }
        } catch (e) {
          console.warn('Facture import notice:', e);
        }
      }
    }

    // I. POS Restaurant (Tables, Categories, Produits, Ventes)
    const posTables = Array.isArray(data.pos_tables) ? data.pos_tables : [];
    for (const t of posTables) {
      if (t.id && (t.numero || t.nom)) {
        try {
          await sql`
            INSERT INTO pos_tables (id, numero, nom, zone, capacite, statut, serveur)
            VALUES (${t.id}, ${t.numero || `T${t.id}`}, ${t.nom || `Table ${t.id}`}, ${t.zone || 'Salle'}, ${t.capacite || 4}, ${t.statut || 'LIBRE'}, ${t.serveur || ''})
            ON CONFLICT (id) DO UPDATE SET
              numero = EXCLUDED.numero,
              nom = EXCLUDED.nom,
              statut = EXCLUDED.statut;
          `;
          counts.pos_tables++;
        } catch (_) {}
      }
    }

    const posCategories = Array.isArray(data.pos_categories) ? data.pos_categories : [];
    for (const pc of posCategories) {
      if (pc.id && pc.nom) {
        try {
          await sql`
            INSERT INTO pos_categories (id, code, nom, icone, couleur, ordre, actif)
            VALUES (${pc.id}, ${pc.code || `CAT${pc.id}`}, ${pc.nom}, ${pc.icone || 'utensils'}, ${pc.couleur || '#0284c7'}, ${pc.ordre || 0}, ${pc.actif ?? 1})
            ON CONFLICT (id) DO UPDATE SET
              nom = EXCLUDED.nom,
              icone = EXCLUDED.icone,
              couleur = EXCLUDED.couleur;
          `;
          counts.pos_categories++;
        } catch (_) {}
      }
    }

    const posProduits = Array.isArray(data.pos_produits) ? data.pos_produits : [];
    for (const pp of posProduits) {
      if (pp.id && pp.nom) {
        try {
          await sql`
            INSERT INTO pos_produits (
              id, code, nom, description, categorie_id, categorie_nom,
              prix_vente_ttc, taux_tva, temps_preparation_min, disponible, actif
            ) VALUES (
              ${pp.id},
              ${pp.code || `POS-${pp.id}`},
              ${pp.nom},
              ${pp.description || ''},
              ${pp.categorie_id || null},
              ${pp.categorie_nom || ''},
              ${pp.prix_vente_ttc || pp.prix_ttc || 0},
              ${pp.taux_tva || 20},
              ${pp.temps_preparation_min || 10},
              ${pp.disponible ?? 1},
              ${pp.actif ?? 1}
            )
            ON CONFLICT (id) DO UPDATE SET
              nom = EXCLUDED.nom,
              prix_vente_ttc = EXCLUDED.prix_vente_ttc,
              disponible = EXCLUDED.disponible;
          `;
          counts.pos_produits++;
        } catch (_) {}
      }
    }

    // J. Règlements
    const reglements = Array.isArray(data.reglements) ? data.reglements : [];
    for (const r of reglements) {
      if (r.id && r.client_id) {
        try {
          await sql`
            INSERT INTO reglements (
              id, piece_type, piece_id, piece_numero, facture_id, facture_numero,
              client_id, client_nom, date, montant, mode_reglement, reference_paiement, banque
            ) VALUES (
              ${r.id},
              ${r.piece_type || 'FACTURE'},
              ${r.piece_id || null},
              ${r.piece_numero || ''},
              ${r.facture_id || null},
              ${r.facture_numero || ''},
              ${r.client_id},
              ${r.client_nom || ''},
              ${r.date || new Date().toISOString().slice(0, 10)},
              ${r.montant || 0},
              ${r.mode_reglement || r.mode || 'Virement'},
              ${r.reference_paiement || ''},
              ${r.banque || ''}
            )
            ON CONFLICT (id) DO UPDATE SET
              montant = EXCLUDED.montant,
              date = EXCLUDED.date,
              mode_reglement = EXCLUDED.mode_reglement;
          `;
          counts.reglements++;
        } catch (_) {}
      }
    }

    // K. App Users
    const users = Array.isArray(data.users || data.app_users) ? (data.users || data.app_users) : [];
    for (const u of users) {
      if (u.id && (u.username || u.nom_complet)) {
        try {
          await sql`
            INSERT INTO app_users (id, username, nom_complet, email, role, pin_code, statut)
            VALUES (
              ${u.id},
              ${u.username || `user_${u.id}`},
              ${u.nom_complet || u.username},
              ${u.email || ''},
              ${u.role || 'CAISSE'},
              ${u.pin_code || '1234'},
              ${u.statut ?? 1}
            )
            ON CONFLICT (id) DO UPDATE SET
              username = EXCLUDED.username,
              nom_complet = EXCLUDED.nom_complet,
              role = EXCLUDED.role,
              pin_code = EXCLUDED.pin_code;
          `;
          counts.app_users++;
        } catch (_) {}
      }
    }
  }

  const durationMs = Date.now() - startTime;
  const totalImportedRecords = Object.values(counts).reduce((a, b) => a + b, 0);

  return {
    success: true,
    mode,
    durationMs,
    counts,
    totalImportedRecords,
    message: `Restauration réussie dans Neon PostgreSQL (${totalImportedRecords} enregistrements importés en ${durationMs}ms).`,
  };
}

/**
 * Initializes DB for import (creates schema and optionally truncates tables if replace mode)
 */
export async function initNeonImport(mode: 'replace' | 'merge' = 'merge', customUrl?: string) {
  const sql = getNeonSql(customUrl);
  await initNeonPostgresSchema(customUrl);

  if (mode === 'replace') {
    try {
      await sql`
        TRUNCATE TABLE 
          pos_ventes_lignes, pos_ventes, pos_sessions, pos_produits, pos_categories, pos_tables,
          stock_mouvements, reglements, devis_lignes, devis,
          paiements_fournisseurs, factures_fournisseurs_lignes, factures_fournisseurs,
          factures_lignes, factures, bons_retour_lignes, bons_retour,
          bons_livraison_lignes, bons_livraison, client_tarifs,
          produits, fournisseurs, clients, marques, familles, categories
        CASCADE;
      `;
    } catch (err) {
      console.warn('Truncate cascade notice:', err);
    }
  }

  return { success: true, message: 'Initialisation de l\'importation terminée' };
}

/**
 * Imports an isolated batch of records for a specific table.
 * Highly scalable, immune to payload limits and request timeouts.
 */
export async function importBatchToNeon(params: {
  table: string;
  rows: any[];
  mode?: 'replace' | 'merge';
  customUrl?: string;
}) {
  const { table, rows, customUrl } = params;
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return { success: true, count: 0, table };
  }

  const sql = getNeonSql(customUrl);
  let importedCount = 0;

  switch (table) {
    case 'company':
    case 'company_info': {
      const company = rows[0];
      if (company) {
        try {
          await sql`
            INSERT INTO company_info (
              id, nom, forme_juridique, capital, adresse, code_postal, ville, pays,
              telephone, fax, email, site_web, ice, if_fiscal, rc, cnss, patente,
              banque, rib, logo_titre, logo_sous_titre, logo_mode, logo_placement
            ) VALUES (
              1,
              ${company.nom || 'VERDEORTO SARL AU'},
              ${company.forme_juridique || 'SARL AU'},
              ${company.capital || '100 000,00'},
              ${company.adresse || ''},
              ${company.code_postal || '40000'},
              ${company.ville || 'Marrakech'},
              ${company.pays || 'Maroc'},
              ${company.telephone || ''},
              ${company.fax || ''},
              ${company.email || ''},
              ${company.site_web || ''},
              ${company.ice || '000194441000024'},
              ${company.if_fiscal || ''},
              ${company.rc || ''},
              ${company.cnss || ''},
              ${company.patente || ''},
              ${company.banque || ''},
              ${company.rib || ''},
              ${company.logo_titre || ''},
              ${company.logo_sous_titre || ''},
              ${company.logo_mode || 'both'},
              ${company.logo_placement || 'left'}
            )
            ON CONFLICT (id) DO UPDATE SET
              nom = EXCLUDED.nom,
              forme_juridique = EXCLUDED.forme_juridique,
              capital = EXCLUDED.capital,
              adresse = EXCLUDED.adresse,
              code_postal = EXCLUDED.code_postal,
              ville = EXCLUDED.ville,
              pays = EXCLUDED.pays,
              telephone = EXCLUDED.telephone,
              fax = EXCLUDED.fax,
              email = EXCLUDED.email,
              site_web = EXCLUDED.site_web,
              ice = EXCLUDED.ice,
              if_fiscal = EXCLUDED.if_fiscal,
              rc = EXCLUDED.rc,
              cnss = EXCLUDED.cnss,
              patente = EXCLUDED.patente,
              banque = EXCLUDED.banque,
              rib = EXCLUDED.rib,
              logo_titre = EXCLUDED.logo_titre,
              logo_sous_titre = EXCLUDED.logo_sous_titre,
              logo_mode = EXCLUDED.logo_mode,
              logo_placement = EXCLUDED.logo_placement;
          `;
          importedCount = 1;
        } catch (_) {}
      }
      break;
    }

    case 'categories': {
      for (const cat of rows) {
        if (cat.id && (cat.libelle || cat.nom)) {
          try {
            await sql`
              INSERT INTO categories (id, code, libelle, nom, description)
              VALUES (${cat.id}, ${cat.code || `CAT${cat.id}`}, ${cat.libelle || cat.nom}, ${cat.nom || cat.libelle}, ${cat.description || ''})
              ON CONFLICT (id) DO UPDATE SET
                code = EXCLUDED.code,
                libelle = EXCLUDED.libelle,
                nom = EXCLUDED.nom,
                description = EXCLUDED.description;
            `;
            importedCount++;
          } catch (_) {}
        }
      }
      break;
    }

    case 'familles': {
      for (const fam of rows) {
        if (fam.id && (fam.libelle || fam.nom)) {
          try {
            await sql`
              INSERT INTO familles (id, code, libelle, nom, categorie, categorie_id, description)
              VALUES (${fam.id}, ${fam.code || `FAM${fam.id}`}, ${fam.libelle || fam.nom}, ${fam.nom || fam.libelle}, ${fam.categorie || ''}, ${fam.categorie_id || null}, ${fam.description || ''})
              ON CONFLICT (id) DO UPDATE SET
                code = EXCLUDED.code,
                libelle = EXCLUDED.libelle,
                nom = EXCLUDED.nom,
                categorie = EXCLUDED.categorie,
                categorie_id = EXCLUDED.categorie_id,
                description = EXCLUDED.description;
            `;
            importedCount++;
          } catch (_) {}
        }
      }
      break;
    }

    case 'marques': {
      for (const m of rows) {
        if (m.id && (m.nom || m.libelle)) {
          try {
            await sql`
              INSERT INTO marques (id, code, nom, libelle, description)
              VALUES (${m.id}, ${m.code || `MRQ${m.id}`}, ${m.nom || m.libelle}, ${m.libelle || m.nom}, ${m.description || ''})
              ON CONFLICT (id) DO UPDATE SET
                code = EXCLUDED.code,
                nom = EXCLUDED.nom,
                libelle = EXCLUDED.libelle,
                description = EXCLUDED.description;
            `;
            importedCount++;
          } catch (_) {}
        }
      }
      break;
    }

    case 'clients': {
      for (const cl of rows) {
        if (cl.id && cl.nom) {
          try {
            await sql`
              INSERT INTO clients (
                id, code, nom, interlocuteur, adresse, code_postal, ville, pays,
                telephone, mobile, fax, email, site_web, ice, observations, notes,
                solde, total_achats, bl_non_factures_count
              ) VALUES (
                ${cl.id},
                ${cl.code || `CLI-${cl.id}`},
                ${cl.nom},
                ${cl.interlocuteur || ''},
                ${cl.adresse || ''},
                ${cl.code_postal || '40000'},
                ${cl.ville || 'Marrakech'},
                ${cl.pays || 'Maroc'},
                ${cl.telephone || cl.tel || ''},
                ${cl.mobile || ''},
                ${cl.fax || ''},
                ${cl.email || ''},
                ${cl.site_web || ''},
                ${cl.ice || ''},
                ${cl.observations || ''},
                ${cl.notes || ''},
                ${cl.solde || 0},
                ${cl.total_achats || 0},
                ${cl.bl_non_factures_count || 0}
              )
              ON CONFLICT (id) DO UPDATE SET
                code = EXCLUDED.code,
                nom = EXCLUDED.nom,
                interlocuteur = EXCLUDED.interlocuteur,
                adresse = EXCLUDED.adresse,
                code_postal = EXCLUDED.code_postal,
                ville = EXCLUDED.ville,
                pays = EXCLUDED.pays,
                telephone = EXCLUDED.telephone,
                mobile = EXCLUDED.mobile,
                fax = EXCLUDED.fax,
                email = EXCLUDED.email,
                site_web = EXCLUDED.site_web,
                ice = EXCLUDED.ice,
                observations = EXCLUDED.observations,
                notes = EXCLUDED.notes,
                solde = EXCLUDED.solde,
                total_achats = EXCLUDED.total_achats,
                bl_non_factures_count = EXCLUDED.bl_non_factures_count;
            `;
            importedCount++;
          } catch (_) {}
        }
      }
      break;
    }

    case 'fournisseurs': {
      for (const fr of rows) {
        if (fr.id && fr.nom) {
          try {
            await sql`
              INSERT INTO fournisseurs (
                id, code, nom, interlocuteur, adresse, code_postal, ville,
                telephone, gsm, mobile, fax, email, ice, observations, notes,
                solde_du, total_achats
              ) VALUES (
                ${fr.id},
                ${fr.code || `FOUR-${fr.id}`},
                ${fr.nom},
                ${fr.interlocuteur || ''},
                ${fr.adresse || ''},
                ${fr.code_postal || ''},
                ${fr.ville || 'Marrakech'},
                ${fr.telephone || fr.tel || ''},
                ${fr.gsm || ''},
                ${fr.mobile || ''},
                ${fr.fax || ''},
                ${fr.email || ''},
                ${fr.ice || ''},
                ${fr.observations || ''},
                ${fr.notes || ''},
                ${fr.solde_du || 0},
                ${fr.total_achats || 0}
              )
              ON CONFLICT (id) DO UPDATE SET
                code = EXCLUDED.code,
                nom = EXCLUDED.nom,
                interlocuteur = EXCLUDED.interlocuteur,
                adresse = EXCLUDED.adresse,
                ville = EXCLUDED.ville,
                telephone = EXCLUDED.telephone,
                email = EXCLUDED.email,
                ice = EXCLUDED.ice,
                solde_du = EXCLUDED.solde_du,
                total_achats = EXCLUDED.total_achats;
            `;
            importedCount++;
          } catch (_) {}
        }
      }
      break;
    }

    case 'produits':
    case 'articles':
    case 'products': {
      for (const pr of rows) {
        if (pr.id && (pr.libelle || pr.nom)) {
          try {
            await sql`
              INSERT INTO produits (
                id, code, libelle, groupe, famille, unite, taux_tva,
                prix_ht, prix_achat, prix_achat_ht, stock_actuel, stock_min, stock_virtuel, description
              ) VALUES (
                ${pr.id},
                ${pr.code || `PRD-${pr.id}`},
                ${pr.libelle || pr.nom},
                ${pr.groupe || ''},
                ${pr.famille || ''},
                ${pr.unite || 'KG'},
                ${pr.taux_tva || 20.0},
                ${pr.prix_ht || pr.prix_vente_ht || 0},
                ${pr.prix_achat || 0},
                ${pr.prix_achat_ht || pr.prix_achat || 0},
                ${pr.stock_actuel || pr.stock || 0},
                ${pr.stock_min || 0},
                ${pr.stock_virtuel || pr.stock_actuel || 0},
                ${pr.description || ''}
              )
              ON CONFLICT (id) DO UPDATE SET
                code = EXCLUDED.code,
                libelle = EXCLUDED.libelle,
                groupe = EXCLUDED.groupe,
                famille = EXCLUDED.famille,
                unite = EXCLUDED.unite,
                taux_tva = EXCLUDED.taux_tva,
                prix_ht = EXCLUDED.prix_ht,
                prix_achat = EXCLUDED.prix_achat,
                prix_achat_ht = EXCLUDED.prix_achat_ht,
                stock_actuel = EXCLUDED.stock_actuel,
                stock_min = EXCLUDED.stock_min,
                stock_virtuel = EXCLUDED.stock_virtuel,
                description = EXCLUDED.description;
            `;
            importedCount++;
          } catch (_) {}
        }
      }
      break;
    }

    case 'bons_livraison':
    case 'bl': {
      for (const bl of rows) {
        if (bl.id && bl.numero && bl.client_id) {
          try {
            await sql`
              INSERT INTO bons_livraison (
                id, numero, date, client_id, client_nom, client_ice, client_adresse, client_ville,
                total_ht, tva_20, tva_10, total_tva, total_ttc, montant_brut, remise_pct,
                statut, etat, facture_id, facture_numero, mode_reglement, notes
              ) VALUES (
                ${bl.id},
                ${bl.numero},
                ${bl.date || new Date().toISOString().slice(0, 10)},
                ${bl.client_id},
                ${bl.client_nom || ''},
                ${bl.client_ice || ''},
                ${bl.client_adresse || ''},
                ${bl.client_ville || ''},
                ${bl.total_ht || 0},
                ${bl.tva_20 || 0},
                ${bl.tva_10 || 0},
                ${bl.total_tva || 0},
                ${bl.total_ttc || 0},
                ${bl.montant_brut || bl.total_ht || 0},
                ${bl.remise_pct || 0},
                ${bl.statut || 'En attente'},
                ${bl.etat || 'Validé'},
                ${bl.facture_id || null},
                ${bl.facture_numero || null},
                ${bl.mode_reglement || 'Virement'},
                ${bl.notes || ''}
              )
              ON CONFLICT (id) DO UPDATE SET
                numero = EXCLUDED.numero,
                date = EXCLUDED.date,
                client_id = EXCLUDED.client_id,
                client_nom = EXCLUDED.client_nom,
                total_ht = EXCLUDED.total_ht,
                total_ttc = EXCLUDED.total_ttc,
                statut = EXCLUDED.statut,
                facture_id = EXCLUDED.facture_id,
                facture_numero = EXCLUDED.facture_numero;
            `;
            importedCount++;

            // Lignes
            const lignes = Array.isArray(bl.lignes) ? bl.lignes : [];
            for (let li = 0; li < lignes.length; li++) {
              const l = lignes[li];
              const ligneId = l.id || (bl.id * 1000 + li + 1);
              try {
                await sql`
                  INSERT INTO bons_livraison_lignes (
                    id, bon_livraison_id, produit_id, designation, groupe, unite,
                    quantite, prix_ht, taux_tva, remise_pct, total_ht, total_tva, total_ttc
                  ) VALUES (
                    ${ligneId},
                    ${bl.id},
                    ${l.produit_id || null},
                    ${l.designation || 'Article'},
                    ${l.groupe || ''},
                    ${l.unite || 'KG'},
                    ${l.quantite || 1},
                    ${l.prix_ht || 0},
                    ${l.taux_tva || 20},
                    ${l.remise_pct || 0},
                    ${l.total_ht || 0},
                    ${l.total_tva || 0},
                    ${l.total_ttc || 0}
                  )
                  ON CONFLICT (id) DO UPDATE SET
                    designation = EXCLUDED.designation,
                    quantite = EXCLUDED.quantite,
                    prix_ht = EXCLUDED.prix_ht,
                    total_ttc = EXCLUDED.total_ttc;
                `;
              } catch (_) {}
            }
          } catch (_) {}
        }
      }
      break;
    }

    case 'factures': {
      for (const f of rows) {
        if (f.id && f.numero && f.client_id) {
          try {
            await sql`
              INSERT INTO factures (
                id, numero, date, client_id, client_nom, client_ice, client_adresse, client_ville,
                total_ht, tva_20, tva_10, total_tva, total_ttc, montant_regle, reste_a_payer,
                statut_paiement, etat, mode_reglement, notes, bl_associes
              ) VALUES (
                ${f.id},
                ${f.numero},
                ${f.date || new Date().toISOString().slice(0, 10)},
                ${f.client_id},
                ${f.client_nom || ''},
                ${f.client_ice || ''},
                ${f.client_adresse || ''},
                ${f.client_ville || ''},
                ${f.total_ht || 0},
                ${f.tva_20 || 0},
                ${f.tva_10 || 0},
                ${f.total_tva || 0},
                ${f.total_ttc || 0},
                ${f.montant_regle || 0},
                ${f.reste_a_payer !== undefined ? f.reste_a_payer : (f.total_ttc || 0) - (f.montant_regle || 0)},
                ${f.statut_paiement || 'Impayé'},
                ${f.etat || 'Validé'},
                ${f.mode_reglement || 'Virement'},
                ${f.notes || ''},
                ${typeof f.bl_associes === 'string' ? f.bl_associes : JSON.stringify(f.bl_associes || [])}
              )
              ON CONFLICT (id) DO UPDATE SET
                numero = EXCLUDED.numero,
                date = EXCLUDED.date,
                client_id = EXCLUDED.client_id,
                client_nom = EXCLUDED.client_nom,
                total_ht = EXCLUDED.total_ht,
                total_ttc = EXCLUDED.total_ttc,
                montant_regle = EXCLUDED.montant_regle,
                reste_a_payer = EXCLUDED.reste_a_payer,
                statut_paiement = EXCLUDED.statut_paiement;
            `;
            importedCount++;

            // Lignes
            const lignes = Array.isArray(f.lignes) ? f.lignes : [];
            for (let li = 0; li < lignes.length; li++) {
              const l = lignes[li];
              const ligneId = l.id || (f.id * 1000 + li + 1);
              try {
                await sql`
                  INSERT INTO factures_lignes (
                    id, facture_id, produit_id, designation, groupe, unite,
                    quantite, prix_ht, taux_tva, remise_pct, total_ht, total_tva, total_ttc
                  ) VALUES (
                    ${ligneId},
                    ${f.id},
                    ${l.produit_id || null},
                    ${l.designation || 'Article'},
                    ${l.groupe || ''},
                    ${l.unite || 'KG'},
                    ${l.quantite || 1},
                    ${l.prix_ht || 0},
                    ${l.taux_tva || 20},
                    ${l.remise_pct || 0},
                    ${l.total_ht || 0},
                    ${l.total_tva || 0},
                    ${l.total_ttc || 0}
                  )
                  ON CONFLICT (id) DO UPDATE SET
                    designation = EXCLUDED.designation,
                    quantite = EXCLUDED.quantite,
                    prix_ht = EXCLUDED.prix_ht,
                    total_ttc = EXCLUDED.total_ttc;
                `;
              } catch (_) {}
            }
          } catch (_) {}
        }
      }
      break;
    }

    case 'devis': {
      for (const d of rows) {
        if (d.id && d.numero && d.client_id) {
          try {
            await sql`
              INSERT INTO devis (
                id, numero, date, client_id, client_nom, client_ice,
                total_ht, total_tva, total_ttc, statut, validite_jours, notes
              ) VALUES (
                ${d.id},
                ${d.numero},
                ${d.date || new Date().toISOString().slice(0, 10)},
                ${d.client_id},
                ${d.client_nom || ''},
                ${d.client_ice || ''},
                ${d.total_ht || 0},
                ${d.total_tva || 0},
                ${d.total_ttc || 0},
                ${d.statut || 'En attente'},
                ${d.validite_jours || 30},
                ${d.notes || ''}
              )
              ON CONFLICT (id) DO UPDATE SET
                numero = EXCLUDED.numero,
                total_ht = EXCLUDED.total_ht,
                total_ttc = EXCLUDED.total_ttc;
            `;
            importedCount++;
          } catch (_) {}
        }
      }
      break;
    }

    case 'reglements': {
      for (const r of rows) {
        if (r.id && r.client_id) {
          try {
            await sql`
              INSERT INTO reglements (
                id, piece_type, piece_id, piece_numero, facture_id, facture_numero,
                client_id, client_nom, date, montant, mode_reglement, reference_paiement, banque
              ) VALUES (
                ${r.id},
                ${r.piece_type || 'FACTURE'},
                ${r.piece_id || null},
                ${r.piece_numero || ''},
                ${r.facture_id || null},
                ${r.facture_numero || ''},
                ${r.client_id},
                ${r.client_nom || ''},
                ${r.date || new Date().toISOString().slice(0, 10)},
                ${r.montant || 0},
                ${r.mode_reglement || r.mode || 'Virement'},
                ${r.reference_paiement || ''},
                ${r.banque || ''}
              )
              ON CONFLICT (id) DO UPDATE SET
                montant = EXCLUDED.montant,
                date = EXCLUDED.date,
                mode_reglement = EXCLUDED.mode_reglement;
            `;
            importedCount++;
          } catch (_) {}
        }
      }
      break;
    }

    case 'pos_tables': {
      for (const t of rows) {
        if (t.id && (t.numero || t.nom)) {
          try {
            await sql`
              INSERT INTO pos_tables (id, numero, nom, zone, capacite, statut, serveur)
              VALUES (${t.id}, ${t.numero || `T${t.id}`}, ${t.nom || `Table ${t.id}`}, ${t.zone || 'Salle'}, ${t.capacite || 4}, ${t.statut || 'LIBRE'}, ${t.serveur || ''})
              ON CONFLICT (id) DO UPDATE SET
                numero = EXCLUDED.numero,
                nom = EXCLUDED.nom,
                statut = EXCLUDED.statut;
            `;
            importedCount++;
          } catch (_) {}
        }
      }
      break;
    }

    case 'pos_categories': {
      for (const pc of rows) {
        if (pc.id && pc.nom) {
          try {
            await sql`
              INSERT INTO pos_categories (id, code, nom, icone, couleur, ordre, actif)
              VALUES (${pc.id}, ${pc.code || `CAT${pc.id}`}, ${pc.nom}, ${pc.icone || 'utensils'}, ${pc.couleur || '#0284c7'}, ${pc.ordre || 0}, ${pc.actif ?? 1})
              ON CONFLICT (id) DO UPDATE SET
                nom = EXCLUDED.nom,
                icone = EXCLUDED.icone,
                couleur = EXCLUDED.couleur;
            `;
            importedCount++;
          } catch (_) {}
        }
      }
      break;
    }

    case 'pos_produits': {
      for (const pp of rows) {
        if (pp.id && pp.nom) {
          try {
            await sql`
              INSERT INTO pos_produits (
                id, code, nom, description, categorie_id, categorie_nom,
                prix_vente_ttc, taux_tva, temps_preparation_min, disponible, actif
              ) VALUES (
                ${pp.id},
                ${pp.code || `POS-${pp.id}`},
                ${pp.nom},
                ${pp.description || ''},
                ${pp.categorie_id || null},
                ${pp.categorie_nom || ''},
                ${pp.prix_vente_ttc || pp.prix_ttc || 0},
                ${pp.taux_tva || 20},
                ${pp.temps_preparation_min || 10},
                ${pp.disponible ?? 1},
                ${pp.actif ?? 1}
              )
              ON CONFLICT (id) DO UPDATE SET
                nom = EXCLUDED.nom,
                prix_vente_ttc = EXCLUDED.prix_vente_ttc,
                disponible = EXCLUDED.disponible;
            `;
            importedCount++;
          } catch (_) {}
        }
      }
      break;
    }

    case 'pos_ventes': {
      for (const pv of rows) {
        if (pv.id) {
          try {
            await sql`
              INSERT INTO pos_ventes (
                id, ticket_numero, session_id, date, heure, table_id, table_numero,
                caissier_id, caissier_nom, total_ht, total_tva, total_ttc, remise_montant,
                montant_paye, rendu_monnaie, mode_paiement, statut_paiement, notes
              ) VALUES (
                ${pv.id},
                ${pv.ticket_numero || `TKT-${pv.id}`},
                ${pv.session_id || 1},
                ${pv.date || new Date().toISOString().slice(0, 10)},
                ${pv.heure || '12:00:00'},
                ${pv.table_id || null},
                ${pv.table_numero || ''},
                ${pv.caissier_id || 1},
                ${pv.caissier_nom || 'Caisse'},
                ${pv.total_ht || 0},
                ${pv.total_tva || 0},
                ${pv.total_ttc || 0},
                ${pv.remise_montant || 0},
                ${pv.montant_paye || pv.total_ttc || 0},
                ${pv.rendu_monnaie || 0},
                ${pv.mode_paiement || 'ESPECES'},
                ${pv.statut_paiement || 'PAYE'},
                ${pv.notes || ''}
              )
              ON CONFLICT (id) DO UPDATE SET
                total_ttc = EXCLUDED.total_ttc,
                statut_paiement = EXCLUDED.statut_paiement;
            `;
            importedCount++;
          } catch (_) {}
        }
      }
      break;
    }

    case 'users':
    case 'app_users': {
      for (const u of rows) {
        if (u.id && (u.username || u.nom_complet)) {
          try {
            await sql`
              INSERT INTO app_users (id, username, nom_complet, email, role, pin_code, mot_de_passe, avatar, statut)
              VALUES (
                ${u.id},
                ${u.username || `user_${u.id}`},
                ${u.nom_complet || u.username},
                ${u.email || ''},
                ${u.role || 'CAISSE'},
                ${u.pin_code || ''},
                ${u.mot_de_passe || ''},
                ${u.avatar || 'US'},
                ${u.statut ?? 1}
              )
              ON CONFLICT (id) DO UPDATE SET
                username = EXCLUDED.username,
                nom_complet = EXCLUDED.nom_complet,
                role = EXCLUDED.role,
                pin_code = EXCLUDED.pin_code,
                mot_de_passe = COALESCE(NULLIF(EXCLUDED.mot_de_passe, ''), app_users.mot_de_passe);
            `;
            importedCount++;
          } catch (_) {}
        }
      }
      break;
    }

    default:
      break;
  }

  return { success: true, table, count: importedCount };
}

/**
 * Executes a chunk of SQL statements safely
 */
export async function importSqlChunkToNeon(params: {
  sqlChunk: string;
  customUrl?: string;
}) {
  const { sqlChunk, customUrl } = params;
  const sql = getNeonSql(customUrl);

  const statements = sqlChunk
    .replace(/--.*$/gm, '')
    .split(/;\s*[\r\n]+|;\s*$/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  let executedCount = 0;
  for (const stmt of statements) {
    if (stmt) {
      try {
        await (sql as any)([stmt]);
        executedCount++;
      } catch (err: any) {
        console.warn('SQL chunk notice:', stmt.slice(0, 60), err?.message);
      }
    }
  }

  return { success: true, count: executedCount, totalStatements: statements.length };
}

