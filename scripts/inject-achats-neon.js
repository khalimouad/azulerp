/**
 * Complete Injection script for Achats, Factures & Paiements Fournisseurs into Neon PostgreSQL
 * Usage:
 *   node scripts/inject-achats-neon.js "postgresql://user:pass@ep-xyz.neon.tech/neondb?sslmode=require"
 */

const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

async function main() {
  const customUrl = process.argv[2] || process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL;

  if (!customUrl) {
    console.error('❌ ERREUR : Chaîne de connexion Neon manquante.');
    console.error('Usage : node scripts/inject-achats-neon.js "postgresql://user:pass@ep-xyz.neon.tech/neondb?sslmode=require"');
    process.exit(1);
  }

  console.log('🔌 Connexion à Neon PostgreSQL...');
  const sql = neon(customUrl);

  // 1. Load prepared data
  const dataPath = path.join(__dirname, '../prepared_achats.json');
  if (!fs.existsSync(dataPath)) {
    console.error(`❌ Fichier de données introuvable: ${dataPath}`);
    process.exit(1);
  }

  const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const factures = rawData.factures || rawData;
  const paiements = rawData.paiements || [];

  console.log(`📦 ${factures.length} factures d'achat et ${paiements.length} paiements chargés.`);

  // 2. Ensure schema exists
  console.log('🛠️ Vérification / Création des tables fournisseurs, factures et paiements...');
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

  // 3. Group by supplier
  const supplierMap = new Map();
  let supIdCounter = 1001;

  for (const row of factures) {
    const sName = row.fournisseur || row.feuille || 'Fournisseur Divers';
    if (!supplierMap.has(sName)) {
      supplierMap.set(sName, {
        id: supIdCounter++,
        nom: sName,
        code: `FRN-${sName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X')}`,
        factures: [],
        total_achats: 0,
        solde_du: 0,
      });
    }
    const sup = supplierMap.get(sName);
    sup.factures.push(row);
    sup.total_achats += Number(row.total_ttc || 0);
    sup.solde_du += Number(row.solde || 0);
  }

  // 4. Insert or update suppliers
  console.log(`🏢 Injection de ${supplierMap.size} Fournisseurs...`);
  for (const sup of supplierMap.values()) {
    await sql`
      INSERT INTO fournisseurs (
        id, code, nom, total_achats, solde_du, observations
      ) VALUES (
        ${sup.id}, ${sup.code}, ${sup.nom}, ${Number(sup.total_achats.toFixed(2))}, ${Number(sup.solde_du.toFixed(2))}, ${'Importé depuis Google Sheets Achats'}
      )
      ON CONFLICT (id) DO UPDATE SET
        nom = EXCLUDED.nom,
        total_achats = EXCLUDED.total_achats,
        solde_du = EXCLUDED.solde_du;
  `;
  }

  // 5. Insert Invoices & Lines
  console.log(`🧾 Injection de ${factures.length} Factures d'Achats...`);
  let facIdCounter = 200001;
  let lineIdCounter = 500001;
  let countInserted = 0;
  const invoiceIdByNum = new Map();

  for (const item of factures) {
    const sup = supplierMap.get(item.fournisseur || item.feuille);
    const facId = facIdCounter++;
    const lineId = lineIdCounter++;

    invoiceIdByNum.set(item.numero, facId);

    const ttc = Number(item.total_ttc || 0);
    const ht = Number((ttc / 1.20).toFixed(2));
    const tva = Number((ttc - ht).toFixed(2));
    const paye = Number(item.montant_paye || 0);
    const reste = Number((item.solde !== undefined ? item.solde : (ttc - paye)).toFixed(2));
    const statut = reste <= 0 ? 'Payée' : (paye > 0 ? 'Partiellement payée' : 'A payer');

    await sql`
      INSERT INTO factures_fournisseurs (
        id, numero, fournisseur_id, fournisseur_nom, date_facture,
        total_ht, tva_20, total_tva, total_ttc, montant_paye, reste_a_payer,
        statut, etat, designation_achat, notes
      ) VALUES (
        ${facId},
        ${item.numero},
        ${sup.id},
        ${sup.nom},
        ${item.date_facture},
        ${ht},
        ${tva},
        ${tva},
        ${ttc},
        ${paye},
        ${reste},
        ${statut},
        ${'Validé'},
        ${`Achat ${sup.nom} (${item.feuille})`},
        ${item.observation || ''}
      )
      ON CONFLICT (id) DO UPDATE SET
        total_ttc = EXCLUDED.total_ttc,
        montant_paye = EXCLUDED.montant_paye,
        reste_a_payer = EXCLUDED.reste_a_payer,
        statut = EXCLUDED.statut,
        notes = EXCLUDED.notes;
    `;

    // Invoice line
    await sql`
      INSERT INTO factures_fournisseurs_lignes (
        id, facture_fournisseur_id, designation, quantite,
        prix_achat_ht, taux_tva, total_ht, total_tva, total_ttc
      ) VALUES (
        ${lineId},
        ${facId},
        ${`Achats & Matières Premières (${sup.nom})`},
        ${1.000},
        ${ht},
        ${20.00},
        ${ht},
        ${tva},
        ${ttc}
      )
      ON CONFLICT (id) DO UPDATE SET
        total_ht = EXCLUDED.total_ht,
        total_ttc = EXCLUDED.total_ttc;
    `;

    countInserted++;
    if (countInserted % 200 === 0 || countInserted === factures.length) {
      console.log(`  -> ${countInserted} / ${factures.length} factures enregistrées...`);
    }
  }

  // 6. Insert Payments / Règlements Fournisseurs
  console.log(`💳 Injection de ${paiements.length} Règlements Fournisseurs (Chèques, Virements, Espèces)...`);
  let payIdCounter = 800001;
  let countPayInserted = 0;

  for (const p of paiements) {
    const sup = supplierMap.get(p.fournisseur);
    const payId = payIdCounter++;
    const facId = invoiceIdByNum.get(p.facture_numero) || null;

    await sql`
      INSERT INTO paiements_fournisseurs (
        id, fournisseur_id, fournisseur_nom, facture_fournisseur_id, facture_numero,
        date_paiement, montant, mode_paiement, numero_cheque_ref,
        date_echeance_depot, statut_cheque, notes
      ) VALUES (
        ${payId},
        ${sup ? sup.id : 1001},
        ${sup ? sup.nom : p.fournisseur},
        ${facId},
        ${p.facture_numero},
        ${p.date_paiement},
        ${Number(p.montant.toFixed(2))},
        ${p.mode_paiement || 'Chèque'},
        ${p.numero_cheque_ref || ''},
        ${p.date_echeance_depot || ''},
        ${p.mode_paiement === 'Chèque' ? 'Encaissé' : 'Payé'},
        ${p.observation || ''}
      )
      ON CONFLICT (id) DO UPDATE SET
        montant = EXCLUDED.montant,
        mode_paiement = EXCLUDED.mode_paiement,
        numero_cheque_ref = EXCLUDED.numero_cheque_ref,
        notes = EXCLUDED.notes;
    `;

    countPayInserted++;
    if (countPayInserted % 100 === 0 || countPayInserted === paiements.length) {
      console.log(`  -> ${countPayInserted} / ${paiements.length} paiements enregistrés...`);
    }
  }

  console.log(`\n🎉 SUCCÈS TOTAL DE L'IMPORTATION !`);
  console.log(`  - 🏢 ${supplierMap.size} Fournisseurs créés / mis à jour`);
  console.log(`  - 🧾 ${countInserted} Factures d'Achat enregistrées`);
  console.log(`  - 💳 ${countPayInserted} Règlements / Paiements enregistrés (Chèques, Virements, Espèces)`);
  console.log(`  - 💰 Montant total des achats : ${Array.from(supplierMap.values()).reduce((sum, s) => sum + s.total_achats, 0).toFixed(2)} MAD`);
}

main().catch((err) => {
  console.error('❌ Erreur lors de l\'injection :', err);
  process.exit(1);
});
