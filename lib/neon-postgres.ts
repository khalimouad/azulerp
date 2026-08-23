import { neon, Pool } from '@neondatabase/serverless';
import {
  OFFICIAL_CATEGORIES,
  OFFICIAL_FAMILLES,
  OFFICIAL_MARQUES,
  OFFICIAL_FOURNISSEURS,
  OFFICIAL_CLIENTS,
  OFFICIAL_PRODUITS,
} from './official-seed-data';

/**
 * Neon PostgreSQL Configuration and connection resolver.
 * Compatible with Neon.tech, Vercel Postgres, and standard PostgreSQL connection strings.
 */
export function getNeonDatabaseUrl(customUrl?: string): string | null {
  const url = (
    customUrl ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.NEON_DATABASE_URL ||
    ''
  ).trim();

  return url || null;
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
  telephone VARCHAR(50) DEFAULT '0808551156',
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
`;

/**
 * Initializes tables in Neon PostgreSQL if they do not exist
 */
export async function initNeonPostgresSchema(customUrl?: string) {
  const sql = getNeonSql(customUrl);

  // Split and execute statements
  const statements = POSTGRES_SCHEMA_SQL
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    try {
      await (sql as any)([statement]);
    } catch (err: any) {
      console.warn('Notice executing PostgreSQL statement:', err?.message || err);
    }
  }

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
          '40000', 'Marrakech', 'Maroc', '0808551156', 'verdeorto@gmail.com',
          '000194441000024', '3381764', '35265', '7788302', '46201837',
          'Banque Populaire', '145 450 21211 2604506 000 4 11'
        );
      `;
    }
  } catch (err) {
    console.warn('Could not check/seed company info:', err);
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

  // Check if clients are empty, seed official clients
  try {
    const existingClients: any = await sql`SELECT count(*) as count FROM clients;`;
    if (parseInt(existingClients?.[0]?.count || '0', 10) === 0) {
      for (let i = 0; i < OFFICIAL_CLIENTS.length; i++) {
        const cl = OFFICIAL_CLIENTS[i];
        const clientId = i + 1;
        await sql`
          INSERT INTO clients (id, code, nom, interlocuteur, adresse, ville, telephone, email, ice, solde_initial)
          VALUES (
            ${clientId}, ${cl.code || ''}, ${cl.nom}, ${cl.interlocuteur || ''}, ${cl.adresse || ''},
            ${cl.ville || 'Marrakech'}, ${cl.tel || cl.mobile || ''}, ${cl.email || ''}, ${cl.ice || ''}, ${cl.solde || 0}
          )
          ON CONFLICT (id) DO NOTHING;
        `;
      }
    }
  } catch (_) {}

  // Check if users are empty, seed admin user
  try {
    const existingUsers: any = await sql`SELECT count(*) as count FROM app_users;`;
    if (parseInt(existingUsers?.[0]?.count || '0', 10) === 0) {
      await sql`
        INSERT INTO app_users (id, username, nom_complet, role, pin_code, statut)
        VALUES (1, 'admin', 'Administrateur Principal', 'ADMIN', '1234', 1)
        ON CONFLICT (id) DO NOTHING;
      `;
      await sql`
        INSERT INTO app_users (id, username, nom_complet, role, pin_code, statut)
        VALUES (2, 'caisse', 'Responsable Caisse', 'CAISSE', '0000', 1)
        ON CONFLICT (id) DO NOTHING;
      `;
    }
  } catch (_) {}

  return { success: true, message: 'Schéma PostgreSQL Neon initialisé avec succès' };
}
