import { NextRequest, NextResponse } from 'next/server';
import {
  getNeonSql,
  getNeonDatabaseUrl,
  initNeonPostgresSchema,
  importDataToNeon,
  initNeonImport,
  importBatchToNeon,
  importSqlChunkToNeon,
} from '@/lib/neon-postgres';
import {
  OFFICIAL_CATEGORIES,
  OFFICIAL_FAMILLES,
  OFFICIAL_MARQUES,
  OFFICIAL_FOURNISSEURS,
  OFFICIAL_PRODUITS
} from '@/lib/official-seed-data';
import {
  clearSessionCookie,
  readSession,
  setSessionCookie,
  unauthorizedResponse,
} from '@/lib/auth-session';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Helper to sanitize numeric values
function num(val: any, fallback = 0): number {
  if (val === null || val === undefined || val === '') return fallback;
  const n = Number(val);
  return isNaN(n) ? fallback : n;
}

// In-memory persistent server cache as fallback when DATABASE_URL is not set
let fallbackMemoryStore: Record<string, any[]> | null = null;

function getFallbackStore() {
  if (!fallbackMemoryStore) {
    fallbackMemoryStore = {
      company_info: [{
        id: 1,
        nom: 'VERDEORTO SARL AU',
        forme_juridique: 'SARL AU',
        capital: '100 000,00',
        adresse: 'Avenue Al Mouqaouama, Quartier Ain Merroudi, Résidence DaVinci, Bloc F, Magasin N°20',
        adresse_detail: '',
        code_postal: '40000',
        ville: 'Marrakech',
        pays: 'Maroc',
        telephone: '0808551156',
        fax: '',
        email: 'verdeorto@gmail.com',
        site_web: '',
        ice: '000194441000024',
        if_fiscal: '3381764',
        rc: '35265',
        cnss: '7788302',
        patente: '46201837',
        agrement_onssa: '',
        partenaire_coop: '',
        logo_titre: '',
        logo_sous_titre: '',
        logo_image: '',
        logo_mode: 'both',
        logo_placement: 'left',
        banque: 'Banque Populaire',
        rib: '145 450 21211 2604506 000 4 11'
      }],
      categories: OFFICIAL_CATEGORIES.map((c) => ({ id: c.id, code: `CAT${c.id}`, libelle: c.libelle, nom: c.libelle })),
      familles: OFFICIAL_FAMILLES.map((f) => ({ id: f.id, code: `FAM${f.id}`, libelle: f.libelle, categorie_id: f.categorie_id })),
      marques: OFFICIAL_MARQUES.map((m) => ({ id: m.id, code: `MARQ${m.id}`, libelle: m.libelle })),
      clients: [],
      fournisseurs: OFFICIAL_FOURNISSEURS.map((f, i) => ({
        id: i + 1,
        code: f.code || `FOURN${i + 1}`,
        nom: f.nom,
        interlocuteur: f.interlocuteur || '',
        adresse: f.adresse || '',
        ville: f.ville || 'Marrakech',
        telephone: f.tel || f.gsm || '',
        mobile: f.gsm || '',
        email: f.email || '',
        ice: f.ice || '',
        solde_du: 0,
        total_achats: 0
      })),
      produits: OFFICIAL_PRODUITS.slice(0, 150).map((p, i) => ({
        id: i + 1,
        code: p.code || `PRD${i + 1}`,
        libelle: p.libelle,
        groupe: p.groupe || '',
        famille: p.famille || '',
        unite: p.unite || 'KG',
        taux_tva: p.taux_tva || 20,
        prix_ht: p.prix_ht || 0,
        prix_achat: p.prix_achat || 0,
        prix_achat_ht: p.prix_achat || 0,
        stock_actuel: p.stock_actuel || 0,
        stock_min: p.stock_min || 0,
        stock_virtuel: p.stock_actuel || 0
      })),
      bons_livraison: [],
      bons_livraison_lignes: [],
      bons_retour: [],
      bons_retour_lignes: [],
      factures: [],
      factures_lignes: [],
      devis: [],
      devis_lignes: [],
      reglements: [],
      stock_mouvements: [],
      pos_tables: [
        { id: 1, numero: 'T1', nom: 'Table 1 - Terrasse', zone: 'Terrasse', capacite: 4, statut: 'LIBRE', nb_couverts: 0, montant_en_cours: 0 },
        { id: 2, numero: 'T2', nom: 'Table 2 - Terrasse', zone: 'Terrasse', capacite: 2, statut: 'LIBRE', nb_couverts: 0, montant_en_cours: 0 },
        { id: 3, numero: 'T3', nom: 'Table 3 - Salle', zone: 'Salle Principale', capacite: 4, statut: 'LIBRE', nb_couverts: 0, montant_en_cours: 0 },
        { id: 4, numero: 'T4', nom: 'Table 4 - Salle', zone: 'Salle Principale', capacite: 6, statut: 'LIBRE', nb_couverts: 0, montant_en_cours: 0 },
        { id: 5, numero: 'VIP1', nom: 'Salon VIP', zone: 'VIP', capacite: 8, statut: 'LIBRE', nb_couverts: 0, montant_en_cours: 0 }
      ],
      pos_categories: [
        { id: 1, code: 'BOIS', nom: 'Boissons & Jus Frais', icone: 'coffee', couleur: '#0284c7', ordre: 1 },
        { id: 2, code: 'ENTR', nom: 'Entrées & Salades Bio', icone: 'salad', couleur: '#16a34a', ordre: 2 },
        { id: 3, code: 'PLAT', nom: 'Plats Chauds & Grillades', icone: 'utensils', couleur: '#ea580c', ordre: 3 },
        { id: 4, code: 'DESS', nom: 'Desserts Maison', icone: 'cake', couleur: '#db2777', ordre: 4 }
      ],
      pos_produits: [
        { id: 1, code: 'JUS_ORANGE', nom: 'Jus d’Orange Frais Bio (Verde Orto)', description: 'Orange pressée minute du verger', categorie_id: 1, categorie_nom: 'Boissons & Jus Frais', prix_vente_ttc: 25, taux_tva: 20, disponible: 1, actif: 1 },
        { id: 2, code: 'SALADE_BIO', nom: 'Salade Gourmande Verde Orto', description: 'Mesclun bio, tomates cerises, avocat, vinaigrette maison', categorie_id: 2, categorie_nom: 'Entrées & Salades Bio', prix_vente_ttc: 55, taux_tva: 20, disponible: 1, actif: 1 },
        { id: 3, code: 'TAGINE_LEG', nom: 'Tagine de Légumes Primeurs', description: 'Légumes frais de saison mijotés à l’huile d’olive bio', categorie_id: 3, categorie_nom: 'Plats Chauds & Grillades', prix_vente_ttc: 75, taux_tva: 20, disponible: 1, actif: 1 },
        { id: 4, code: 'TARTE_CITRON', nom: 'Tarte au Citron Meringuée', description: 'Citrons bio de Marrakech, pâte sablée croustillante', categorie_id: 4, categorie_nom: 'Desserts Maison', prix_vente_ttc: 35, taux_tva: 20, disponible: 1, actif: 1 }
      ],
      pos_sessions: [],
      pos_ventes: [],
      pos_ventes_lignes: [],
      app_users: []
    };
  }
  return fallbackMemoryStore;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload } = body;

    const publicActions = new Set(['auth_password', 'session', 'logout']);
    const session = readSession(req);
    if (!publicActions.has(action) && !session) return unauthorizedResponse();

    if (action === 'session') {
      return session
        ? NextResponse.json({ success: true, user: session })
        : unauthorizedResponse();
    }

    if (action === 'logout') {
      return clearSessionCookie(NextResponse.json({ success: true }));
    }

    const connStr = getNeonDatabaseUrl();
    const hasDb = Boolean(connStr);

    if (hasDb) {
      // Connect to real PostgreSQL Neon
      const sql = getNeonSql();

      // Make sure schema is initialized
      if (action === 'init_schema' || action === 'fetch_all') {
        try {
          await initNeonPostgresSchema();
        } catch (initErr) {
          console.warn('Postgres schema init check notice:', initErr);
        }
      }

      switch (action) {
        case 'fetch_all': {
          // Query all entities directly from PostgreSQL
          const [
            companyRes,
            clientsRes,
            fournisseursRes,
            produitsRes,
            categoriesRes,
            famillesRes,
            marquesRes,
            blsRes,
            blLignesRes,
            brsRes,
            brLignesRes,
            facturesRes,
            facturesLignesRes,
            devisRes,
            devisLignesRes,
            reglementsRes,
            stockMouvRes,
            posTablesRes,
            posCatsRes,
            posPrdsRes,
            posSessionsRes,
            posVentesRes,
            posVentesLignesRes,
            usersRes
          ] = await Promise.all([
            sql`SELECT * FROM company_info LIMIT 1;`.catch(() => []),
            sql`SELECT * FROM clients ORDER BY nom ASC;`.catch(() => []),
            sql`SELECT * FROM fournisseurs ORDER BY nom ASC;`.catch(() => []),
            sql`SELECT * FROM produits ORDER BY libelle ASC;`.catch(() => []),
            sql`SELECT * FROM categories ORDER BY id ASC;`.catch(() => []),
            sql`SELECT * FROM familles ORDER BY id ASC;`.catch(() => []),
            sql`SELECT * FROM marques ORDER BY id ASC;`.catch(() => []),
            sql`SELECT * FROM bons_livraison ORDER BY id DESC;`.catch(() => []),
            sql`SELECT * FROM bons_livraison_lignes ORDER BY id ASC;`.catch(() => []),
            sql`SELECT * FROM bons_retour ORDER BY id DESC;`.catch(() => []),
            sql`SELECT * FROM bons_retour_lignes ORDER BY id ASC;`.catch(() => []),
            sql`SELECT * FROM factures ORDER BY id DESC;`.catch(() => []),
            sql`SELECT * FROM factures_lignes ORDER BY id ASC;`.catch(() => []),
            sql`SELECT * FROM devis ORDER BY id DESC;`.catch(() => []),
            sql`SELECT * FROM devis_lignes ORDER BY id ASC;`.catch(() => []),
            sql`SELECT * FROM reglements ORDER BY id DESC;`.catch(() => []),
            sql`SELECT * FROM stock_mouvements ORDER BY id DESC LIMIT 500;`.catch(() => []),
            sql`SELECT * FROM pos_tables ORDER BY numero ASC;`.catch(() => []),
            sql`SELECT * FROM pos_categories ORDER BY ordre ASC, id ASC;`.catch(() => []),
            sql`SELECT * FROM pos_produits ORDER BY nom ASC;`.catch(() => []),
            sql`SELECT * FROM pos_sessions ORDER BY id DESC LIMIT 100;`.catch(() => []),
            sql`SELECT * FROM pos_ventes ORDER BY id DESC LIMIT 500;`.catch(() => []),
            sql`SELECT * FROM pos_ventes_lignes ORDER BY id ASC;`.catch(() => []),
            sql`SELECT id, username, nom_complet, email, role, avatar, statut, derniere_connexion, created_at FROM app_users ORDER BY id ASC;`.catch(() => [])
          ]);

          // Assemble documents with line items
          const blMap: Record<number, any> = {};
          (blsRes as any[]).forEach((bl) => {
            blMap[bl.id] = { ...bl, lignes: [] };
          });
          (blLignesRes as any[]).forEach((line) => {
            if (blMap[line.bon_livraison_id]) {
              blMap[line.bon_livraison_id].lignes.push(line);
            }
          });

          const brMap: Record<number, any> = {};
          (brsRes as any[]).forEach((br) => {
            brMap[br.id] = { ...br, lignes: [] };
          });
          (brLignesRes as any[]).forEach((line) => {
            if (brMap[line.bon_retour_id]) {
              brMap[line.bon_retour_id].lignes.push(line);
            }
          });

          const factMap: Record<number, any> = {};
          (facturesRes as any[]).forEach((f) => {
            factMap[f.id] = {
              ...f,
              lignes: [],
              bl_associes: typeof f.bl_associes === 'string' ? JSON.parse(f.bl_associes || '[]') : f.bl_associes || [],
              br_associes: typeof f.br_associes === 'string' ? JSON.parse(f.br_associes || '[]') : f.br_associes || []
            };
          });
          (facturesLignesRes as any[]).forEach((line) => {
            if (factMap[line.facture_id]) {
              factMap[line.facture_id].lignes.push(line);
            }
          });

          const devisMap: Record<number, any> = {};
          (devisRes as any[]).forEach((d) => {
            devisMap[d.id] = { ...d, lignes: [] };
          });
          (devisLignesRes as any[]).forEach((line) => {
            if (devisMap[line.devis_id]) {
              devisMap[line.devis_id].lignes.push(line);
            }
          });

          const posVentesMap: Record<number, any> = {};
          (posVentesRes as any[]).forEach((v) => {
            posVentesMap[v.id] = { ...v, lignes: [] };
          });
          (posVentesLignesRes as any[]).forEach((line) => {
            if (posVentesMap[line.vente_id]) {
              posVentesMap[line.vente_id].lignes.push(line);
            }
          });

          return NextResponse.json({
            success: true,
            database: 'Neon PostgreSQL (Connected)',
            data: {
              company: (companyRes as any[])[0] || null,
              clients: clientsRes,
              fournisseurs: fournisseursRes,
              produits: produitsRes,
              categories: categoriesRes,
              familles: famillesRes,
              marques: marquesRes,
              bons_livraison: Object.values(blMap),
              bons_retour: Object.values(brMap),
              factures: Object.values(factMap),
              devis: Object.values(devisMap),
              reglements: reglementsRes,
              stock_mouvements: stockMouvRes,
              pos_tables: posTablesRes,
              pos_categories: posCatsRes,
              pos_produits: posPrdsRes,
              pos_sessions: posSessionsRes,
              pos_ventes: Object.values(posVentesMap),
              users: usersRes
            }
          });
        }

        // --- BONS DE LIVRAISON ---
        case 'create_bon_livraison': {
          const { bl, lignes } = payload;
          const maxIdRes: any = await sql`SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM bons_livraison;`;
          const blId = maxIdRes[0]?.next_id || 1;

          await sql`
            INSERT INTO bons_livraison (
              id, numero, date, client_id, client_nom, client_ice, client_adresse, client_ville,
              total_ht, tva_20, tva_10, total_tva, total_ttc, montant_brut, remise_pct, ristourne_pct,
              escompte_pct, port, statut, etat, mode_reglement, notes
            ) VALUES (
              ${blId}, ${bl.numero}, ${bl.date}, ${bl.client_id}, ${bl.client_nom}, ${bl.client_ice || ''},
              ${bl.client_adresse || ''}, ${bl.client_ville || ''}, ${num(bl.total_ht)}, ${num(bl.tva_20)},
              ${num(bl.tva_10)}, ${num(bl.total_tva)}, ${num(bl.total_ttc)}, ${num(bl.montant_brut)},
              ${num(bl.remise_pct)}, ${num(bl.ristourne_pct)}, ${num(bl.escompte_pct)}, ${num(bl.port)},
              ${bl.statut || 'En attente'}, ${bl.etat || 'Validé'}, ${bl.mode_reglement || 'Virement'}, ${bl.notes || ''}
            );
          `;

          if (Array.isArray(lignes)) {
            for (let i = 0; i < lignes.length; i++) {
              const l = lignes[i];
              const lineMaxIdRes: any = await sql`SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM bons_livraison_lignes;`;
              const lineId = lineMaxIdRes[0]?.next_id || i + 1;
              await sql`
                INSERT INTO bons_livraison_lignes (
                  id, bon_livraison_id, produit_id, designation, groupe, unite, quantite,
                  prix_ht, taux_tva, remise_pct, total_ht, total_tva, total_ttc
                ) VALUES (
                  ${lineId}, ${blId}, ${l.produit_id || null}, ${l.designation}, ${l.groupe || ''},
                  ${l.unite || 'KG'}, ${num(l.quantite, 1)}, ${num(l.prix_ht)}, ${num(l.taux_tva, 20)},
                  ${num(l.remise_pct)}, ${num(l.total_ht)}, ${num(l.total_tva)}, ${num(l.total_ttc)}
                );
              `;

              // Deduct stock if valid product
              if (l.produit_id) {
                await sql`
                  UPDATE produits 
                  SET stock_actuel = stock_actuel - ${num(l.quantite, 1)} 
                  WHERE id = ${l.produit_id};
                `;
              }
            }
          }

          return NextResponse.json({ success: true, id: blId, message: 'Bon de livraison créé avec succès' });
        }

        case 'update_bon_livraison_state': {
          const { id, etat } = payload;
          await sql`UPDATE bons_livraison SET etat = ${etat} WHERE id = ${id};`;
          return NextResponse.json({ success: true, message: `État mis à jour: ${etat}` });
        }

        case 'close_bon_livraison_without_invoice': {
          const { id } = payload;
          const closed: any = await sql`
            UPDATE bons_livraison
            SET cloture_sans_facture = TRUE, statut = 'Clôturé'
            WHERE id = ${id} AND facture_id IS NULL
            RETURNING id;
          `;
          if (!closed.length) {
            return NextResponse.json(
              { success: false, error: 'Ce BL est déjà facturé ou introuvable.' },
              { status: 409 }
            );
          }
          return NextResponse.json({ success: true, message: 'BL clôturé sans facturation' });
        }

        case 'delete_bon_livraison': {
          const { id } = payload;
          await sql`DELETE FROM bons_livraison_lignes WHERE bon_livraison_id = ${id};`;
          await sql`DELETE FROM bons_livraison WHERE id = ${id};`;
          return NextResponse.json({ success: true, message: 'Bon de livraison supprimé' });
        }

        // --- TARIFS CLIENTS ---
        case 'fetch_client_tarifs': {
          const { clientId } = payload;
          const tarifs = await sql`
            SELECT ct.*, p.code AS produit_code, p.libelle AS produit_libelle,
                   p.unite AS produit_unite, p.prix_ht AS prix_standard_ht,
                   p.taux_tva AS taux_tva
            FROM client_tarifs ct
            LEFT JOIN produits p ON p.id = ct.produit_id
            WHERE ct.client_id = ${clientId}
            ORDER BY p.libelle ASC, ct.id ASC;
          `;
          return NextResponse.json({ success: true, tarifs });
        }

        case 'save_client_tarif': {
          const { tarif } = payload;
          const productRows: any = await sql`
            SELECT code, libelle, unite, prix_ht, taux_tva
            FROM produits WHERE id = ${tarif.produit_id} LIMIT 1;
          `;
          const product = productRows[0];
          if (!product) {
            return NextResponse.json({ success: false, error: 'Article introuvable' }, { status: 404 });
          }
          const nextIdRows: any = await sql`SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM client_tarifs;`;
          const nextId = nextIdRows[0]?.next_id || 1;
          const saved: any = await sql`
            INSERT INTO client_tarifs (
              id, client_id, produit_id, produit_code, produit_libelle, produit_unite,
              prix_standard_ht, prix_special_ht, remise_pct, taux_tva, notes
            ) VALUES (
              ${nextId}, ${tarif.client_id}, ${tarif.produit_id}, ${product.code}, ${product.libelle},
              ${product.unite || 'U'}, ${num(product.prix_ht)}, ${num(tarif.prix_special_ht)},
              ${num(tarif.remise_pct)}, ${num(product.taux_tva)}, ${tarif.notes || ''}
            )
            ON CONFLICT (client_id, produit_id) DO UPDATE SET
              produit_code = EXCLUDED.produit_code,
              produit_libelle = EXCLUDED.produit_libelle,
              produit_unite = EXCLUDED.produit_unite,
              prix_standard_ht = EXCLUDED.prix_standard_ht,
              prix_special_ht = EXCLUDED.prix_special_ht,
              remise_pct = EXCLUDED.remise_pct,
              taux_tva = EXCLUDED.taux_tva,
              notes = EXCLUDED.notes
            RETURNING id;
          `;
          return NextResponse.json({ success: true, id: saved[0]?.id });
        }

        case 'delete_client_tarif': {
          const { id } = payload;
          await sql`DELETE FROM client_tarifs WHERE id = ${id};`;
          return NextResponse.json({ success: true });
        }

        // --- FACTURES ---
        case 'create_facture': {
          const { facture, lignes, blIds } = payload;
          if (Array.isArray(blIds) && blIds.length > 0) {
            for (const blId of blIds) {
              const rows: any = await sql`
                SELECT cloture_sans_facture, facture_id
                FROM bons_livraison WHERE id = ${blId} LIMIT 1;
              `;
              if (!rows.length || rows[0].cloture_sans_facture || rows[0].facture_id) {
                return NextResponse.json(
                  { success: false, error: `Le BL ${blId} est clôturé, déjà facturé ou introuvable.` },
                  { status: 409 }
                );
              }
            }
          }
          const maxIdRes: any = await sql`SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM factures;`;
          const factId = maxIdRes[0]?.next_id || 1;

          await sql`
            INSERT INTO factures (
              id, numero, date, client_id, client_nom, client_ice, client_adresse, client_ville,
              total_ht, tva_20, tva_10, total_tva, total_ttc, montant_regle, reste_a_payer,
              statut_paiement, etat, mode_reglement, notes, bl_associes
            ) VALUES (
              ${factId}, ${facture.numero}, ${facture.date}, ${facture.client_id}, ${facture.client_nom},
              ${facture.client_ice || ''}, ${facture.client_adresse || ''}, ${facture.client_ville || ''},
              ${num(facture.total_ht)}, ${num(facture.tva_20)}, ${num(facture.tva_10)}, ${num(facture.total_tva)},
              ${num(facture.total_ttc)}, ${num(facture.montant_regle, 0)}, ${num(facture.reste_a_payer || facture.total_ttc)},
              ${facture.statut_paiement || 'Impayé'}, ${facture.etat || 'Validé'}, ${facture.mode_reglement || 'Virement'},
              ${facture.notes || ''}, ${JSON.stringify(blIds || [])}
            );
          `;

          if (Array.isArray(lignes)) {
            for (let i = 0; i < lignes.length; i++) {
              const l = lignes[i];
              const lineMaxIdRes: any = await sql`SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM factures_lignes;`;
              const lineId = lineMaxIdRes[0]?.next_id || i + 1;
              await sql`
                INSERT INTO factures_lignes (
                  id, facture_id, produit_id, designation, groupe, unite, quantite,
                  prix_ht, taux_tva, remise_pct, total_ht, total_tva, total_ttc
                ) VALUES (
                  ${lineId}, ${factId}, ${l.produit_id || null}, ${l.designation}, ${l.groupe || ''},
                  ${l.unite || 'KG'}, ${num(l.quantite, 1)}, ${num(l.prix_ht)}, ${num(l.taux_tva, 20)},
                  ${num(l.remise_pct)}, ${num(l.total_ht)}, ${num(l.total_tva)}, ${num(l.total_ttc)}
                );
              `;
            }
          }

          // If generated from BLs, mark BLs as Facturé
          if (Array.isArray(blIds) && blIds.length > 0) {
            for (const blId of blIds) {
              await sql`
                UPDATE bons_livraison 
                SET statut = 'Facturé', facture_id = ${factId}, facture_numero = ${facture.numero}
                WHERE id = ${blId} AND cloture_sans_facture = FALSE;
              `;
            }
          }

          return NextResponse.json({ success: true, id: factId, message: 'Facture créée avec succès' });
        }

        case 'delete_facture': {
          const { id } = payload;
          await sql`UPDATE bons_livraison SET statut = 'En attente', facture_id = NULL, facture_numero = NULL WHERE facture_id = ${id};`;
          await sql`DELETE FROM factures_lignes WHERE facture_id = ${id};`;
          await sql`DELETE FROM reglements WHERE facture_id = ${id};`;
          await sql`DELETE FROM factures WHERE id = ${id};`;
          return NextResponse.json({ success: true, message: 'Facture supprimée' });
        }

        // --- CLIENTS ---
        case 'create_client': {
          const { client } = payload;
          const maxIdRes: any = await sql`SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM clients;`;
          const clientId = maxIdRes[0]?.next_id || 1;

          await sql`
            INSERT INTO clients (
              id, code, nom, interlocuteur, adresse, code_postal, ville, telephone, mobile, email, ice, solde
            ) VALUES (
              ${clientId}, ${client.code}, ${client.nom}, ${client.interlocuteur || ''},
              ${client.adresse || ''}, ${client.code_postal || ''}, ${client.ville || 'Marrakech'},
              ${client.telephone || ''}, ${client.mobile || ''}, ${client.email || ''},
              ${client.ice || ''}, ${num(client.solde, 0)}
            );
          `;
          return NextResponse.json({ success: true, id: clientId, message: 'Client créé avec succès' });
        }

        case 'update_client': {
          const { id, client } = payload;
          await sql`
            UPDATE clients SET
              nom = ${client.nom}, interlocuteur = ${client.interlocuteur || ''},
              adresse = ${client.adresse || ''}, ville = ${client.ville || ''},
              telephone = ${client.telephone || ''}, email = ${client.email || ''},
              ice = ${client.ice || ''}, solde = ${num(client.solde, 0)}
            WHERE id = ${id};
          `;
          return NextResponse.json({ success: true, message: 'Client mis à jour' });
        }

        case 'delete_client': {
          const { id } = payload;
          await sql`DELETE FROM clients WHERE id = ${id};`;
          return NextResponse.json({ success: true, message: 'Client supprimé' });
        }

        // --- PRODUITS & STOCK ---
        case 'create_produit': {
          const { produit } = payload;
          const maxIdRes: any = await sql`SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM produits;`;
          const prdId = maxIdRes[0]?.next_id || 1;

          await sql`
            INSERT INTO produits (
              id, code, libelle, groupe, famille, unite, taux_tva, prix_ht, prix_achat, stock_actuel, stock_min
            ) VALUES (
              ${prdId}, ${produit.code}, ${produit.libelle}, ${produit.groupe || ''},
              ${produit.famille || ''}, ${produit.unite || 'KG'}, ${num(produit.taux_tva, 20)},
              ${num(produit.prix_ht)}, ${num(produit.prix_achat)}, ${num(produit.stock_actuel, 0)},
              ${num(produit.stock_min, 0)}
            );
          `;
          return NextResponse.json({ success: true, id: prdId, message: 'Produit créé avec succès' });
        }

        case 'update_produit': {
          const { id, produit } = payload;
          await sql`
            UPDATE produits SET
              libelle = ${produit.libelle}, groupe = ${produit.groupe || ''},
              famille = ${produit.famille || ''}, unite = ${produit.unite || 'KG'},
              taux_tva = ${num(produit.taux_tva, 20)}, prix_ht = ${num(produit.prix_ht)},
              prix_achat = ${num(produit.prix_achat)}, stock_actuel = ${num(produit.stock_actuel, 0)},
              stock_min = ${num(produit.stock_min, 0)}
            WHERE id = ${id};
          `;
          return NextResponse.json({ success: true, message: 'Produit mis à jour' });
        }

        case 'adjust_stock': {
          const { produitId, quantite, type, motif, reference } = payload;
          const prdRes: any = await sql`SELECT id, libelle, stock_actuel FROM produits WHERE id = ${produitId};`;
          if (!prdRes || prdRes.length === 0) throw new Error('Produit non trouvé');
          const prd = prdRes[0];

          const currentStock = num(prd.stock_actuel);
          const delta = num(quantite);
          const newStock = type === 'ENTREE' ? currentStock + delta : currentStock - delta;

          await sql`UPDATE produits SET stock_actuel = ${newStock} WHERE id = ${produitId};`;

          const mouvMaxRes: any = await sql`SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM stock_mouvements;`;
          const mouvId = mouvMaxRes[0]?.next_id || 1;

          await sql`
            INSERT INTO stock_mouvements (
              id, produit_id, produit_nom, date, type, quantite, reference_doc, motif, stock_apres
            ) VALUES (
              ${mouvId}, ${produitId}, ${prd.libelle}, ${new Date().toISOString().slice(0, 10)},
              ${type}, ${delta}, ${reference || 'Ajustement'}, ${motif || ''}, ${newStock}
            );
          `;

          return NextResponse.json({ success: true, newStock, message: 'Stock ajusté avec succès' });
        }

        // --- REGLEMENTS ---
        case 'create_reglement': {
          const { reglement } = payload;
          const maxIdRes: any = await sql`SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM reglements;`;
          const regId = maxIdRes[0]?.next_id || 1;

          await sql`
            INSERT INTO reglements (
              id, facture_id, facture_numero, client_id, client_nom, date, montant, mode_reglement, reference_paiement
            ) VALUES (
              ${regId}, ${reglement.facture_id || null}, ${reglement.facture_numero || ''},
              ${reglement.client_id}, ${reglement.client_nom}, ${reglement.date},
              ${num(reglement.montant)}, ${reglement.mode_reglement || 'Virement'}, ${reglement.reference_paiement || ''}
            );
          `;

          // Update facture paid amount if linked
          if (reglement.facture_id) {
            const factRes: any = await sql`SELECT total_ttc, montant_regle FROM factures WHERE id = ${reglement.facture_id};`;
            if (factRes && factRes.length > 0) {
              const totalTtc = num(factRes[0].total_ttc);
              const alreadyPaid = num(factRes[0].montant_regle);
              const newPaid = alreadyPaid + num(reglement.montant);
              const newReste = Math.max(0, totalTtc - newPaid);
              const newStatut = newReste <= 0.01 ? 'Payé' : newPaid > 0 ? 'Partiel' : 'Impayé';

              await sql`
                UPDATE factures 
                SET montant_regle = ${newPaid}, reste_a_payer = ${newReste}, statut_paiement = ${newStatut}
                WHERE id = ${reglement.facture_id};
              `;
            }
          }

          return NextResponse.json({ success: true, id: regId, message: 'Règlement enregistré' });
        }

        // --- COMPANY SETTINGS ---
        case 'update_company_info': {
          const { company } = payload;
          await sql`
            UPDATE company_info SET
              nom = ${company.nom}, forme_juridique = ${company.forme_juridique || 'SARL AU'},
              capital = ${company.capital || '100 000,00'}, adresse = ${company.adresse || ''},
              ville = ${company.ville || 'Marrakech'}, telephone = ${company.telephone || ''},
              email = ${company.email || ''}, ice = ${company.ice || ''},
              if_fiscal = ${company.if_fiscal || ''}, rc = ${company.rc || ''},
              cnss = ${company.cnss || ''}, patente = ${company.patente || ''},
              banque = ${company.banque || ''}, rib = ${company.rib || ''}
            WHERE id = 1;
          `;
          return NextResponse.json({ success: true, message: 'Identifiants société enregistrés' });
        }

        // --- POS RESTAURANT ---
        case 'create_pos_sale': {
          const { sale, lignes } = payload;
          const maxIdRes: any = await sql`SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM pos_ventes;`;
          const saleId = maxIdRes[0]?.next_id || 1;

          await sql`
            INSERT INTO pos_ventes (
              id, numero_ticket, session_id, table_id, table_numero, zone, type_commande,
              nb_couverts, date_vente, total_ht, total_tva, total_ttc, mode_reglement, statut, caissier
            ) VALUES (
              ${saleId}, ${sale.numero_ticket}, ${sale.session_id || null}, ${sale.table_id || null},
              ${sale.table_numero || ''}, ${sale.zone || ''}, ${sale.type_commande || 'SUR_PLACE'},
              ${num(sale.nb_couverts, 1)}, ${sale.date_vente || new Date().toISOString().slice(0, 10)},
              ${num(sale.total_ht)}, ${num(sale.total_tva)}, ${num(sale.total_ttc)},
              ${sale.mode_reglement || 'Espèces'}, 'PAYE', ${sale.caissier || 'Caisse'}
            );
          `;

          if (sale.table_id) {
            await sql`UPDATE pos_tables SET statut = 'LIBRE', nb_couverts = 0, montant_en_cours = 0, commande_json = NULL WHERE id = ${sale.table_id};`;
          }

          return NextResponse.json({ success: true, id: saleId, message: 'Ticket de caisse enregistré avec succès' });
        }

        // --- AUTH ---
        case 'auth_password': {
          const { username, password } = payload;
          const cleanUser = (username || '').toLowerCase().trim();
          const cleanPass = (password || '').trim();

          // 1. Check database first
          try {
            const users: any = await sql`
              SELECT id, username, nom_complet, email, role, pin_code, avatar, statut, mot_de_passe
              FROM app_users 
              WHERE (LOWER(username) = ${cleanUser} OR LOWER(email) = ${cleanUser})
                AND statut = 1
              LIMIT 1;
            `;

            if (users && users.length > 0) {
              const u = users[0];
              // Match password or allow default if null
              if (u.mot_de_passe === cleanPass) {
                const { mot_de_passe, pin_code, ...safeUser } = u;
                return setSessionCookie(
                  NextResponse.json({ success: true, user: safeUser }),
                  {
                    id: Number(u.id), username: u.username, role: u.role,
                    nom_complet: u.nom_complet, email: u.email, avatar: u.avatar, statut: u.statut,
                  }
                );
              }
            }
          } catch (dbErr: any) {
            console.warn('Auth DB query notice:', dbErr?.message);
            // If table doesn't exist yet, attempt initialization in background
            try {
              await initNeonPostgresSchema();
            } catch (_) {}
          }

          return NextResponse.json({ success: false, error: 'Identifiant ou mot de passe incorrect' });
        }

        case 'auth_pin': {
          const { pin } = payload;
          const cleanPin = (pin || '').trim();

          try {
            const users: any = await sql`
              SELECT id, username, nom_complet, email, role, pin_code, avatar, statut 
              FROM app_users 
              WHERE id = ${session!.id} AND pin_code = ${cleanPin} AND statut = 1
              LIMIT 1;
            `;
            if (users && users.length > 0) {
              const { pin_code, ...safeUser } = users[0];
              return setSessionCookie(
                NextResponse.json({ success: true, user: safeUser }),
                {
                  id: Number(users[0].id), username: users[0].username, role: users[0].role,
                  nom_complet: users[0].nom_complet, email: users[0].email,
                  avatar: users[0].avatar, statut: users[0].statut,
                }
              );
            }
          } catch (dbErr: any) {
            console.warn('Auth PIN query notice:', dbErr?.message);
          }

          return NextResponse.json({ success: false, error: 'Code PIN incorrect' });
        }

        // --- IMPORT DATABASE TO NEON (CHUNKED & ATOMIC) ---
        case 'import_init': {
          const result = await initNeonImport(payload.mode || 'merge');
          return NextResponse.json(result);
        }

        case 'import_batch': {
          const result = await importBatchToNeon({
            table: payload.table,
            rows: payload.rows,
            mode: payload.mode || 'merge',
          });
          return NextResponse.json(result);
        }

        case 'import_sql_chunk': {
          const result = await importSqlChunkToNeon({
            sqlChunk: payload.sqlChunk,
          });
          return NextResponse.json(result);
        }

        case 'import_db': {
          const result = await importDataToNeon({
            data: payload.data,
            sql: payload.sql,
            mode: payload.mode || 'merge',
          });
          return NextResponse.json(result);
        }

        default:
          return NextResponse.json({ success: false, error: `Action inconnue: ${action}` }, { status: 400 });
      }
    } else {
      // Fallback in-memory handler for local dev / preview if DATABASE_URL not yet passed
      const store = getFallbackStore();

      switch (action) {
        case 'fetch_all':
          return NextResponse.json({
            success: true,
            database: 'Neon PostgreSQL (Prêt - Configurer DATABASE_URL)',
            data: {
              company: store.company_info[0] || null,
              clients: store.clients,
              fournisseurs: store.fournisseurs,
              produits: store.produits,
              categories: store.categories,
              familles: store.familles,
              marques: store.marques,
              bons_livraison: store.bons_livraison,
              bons_retour: store.bons_retour,
              factures: store.factures,
              devis: store.devis,
              reglements: store.reglements,
              stock_mouvements: store.stock_mouvements,
              pos_tables: store.pos_tables,
              pos_categories: store.pos_categories,
              pos_produits: store.pos_produits,
              pos_sessions: store.pos_sessions,
              pos_ventes: store.pos_ventes,
              users: store.app_users
            }
          });

        case 'create_bon_livraison': {
          const { bl, lignes } = payload;
          const nextId = store.bons_livraison.length + 1;
          const newBl = { ...bl, id: nextId, lignes: lignes || [] };
          store.bons_livraison.unshift(newBl);
          return NextResponse.json({ success: true, id: nextId, message: 'BL créé' });
        }

        case 'create_facture': {
          const { facture, lignes, blIds } = payload;
          const nextId = store.factures.length + 1;
          const newFact = { ...facture, id: nextId, lignes: lignes || [], bl_associes: blIds || [] };
          store.factures.unshift(newFact);
          if (Array.isArray(blIds)) {
            store.bons_livraison.forEach((b) => {
              if (blIds.includes(b.id)) {
                b.statut = 'Facturé';
                b.facture_id = nextId;
                b.facture_numero = facture.numero;
              }
            });
          }
          return NextResponse.json({ success: true, id: nextId, message: 'Facture créée' });
        }

        case 'create_client': {
          const { client } = payload;
          const nextId = store.clients.length + 1;
          const newCl = { ...client, id: nextId };
          store.clients.unshift(newCl);
          return NextResponse.json({ success: true, id: nextId, message: 'Client créé' });
        }

        case 'update_client': {
          const { id, client } = payload;
          const idx = store.clients.findIndex((c) => c.id === id);
          if (idx !== -1) {
            store.clients[idx] = { ...store.clients[idx], ...client };
          }
          return NextResponse.json({ success: true, message: 'Client mis à jour' });
        }

        case 'delete_client': {
          const { id } = payload;
          store.clients = store.clients.filter((c) => c.id !== id);
          return NextResponse.json({ success: true, message: 'Client supprimé' });
        }

        case 'auth_password': {
          const { username, password } = payload;
          const user = store.app_users.find(
            (u) => (u.username.toLowerCase() === username.toLowerCase().trim() || u.email?.toLowerCase() === username.toLowerCase().trim()) &&
                   u.mot_de_passe === password.trim()
          );
          if (user) {
            const { mot_de_passe, pin_code, ...safeUser } = user;
            return setSessionCookie(
              NextResponse.json({ success: true, user: safeUser }),
              { id: Number(user.id), username: user.username, role: user.role }
            );
          }
          return NextResponse.json({ success: false, error: 'Identifiant ou mot de passe incorrect' });
        }

        case 'auth_pin': {
          const { pin } = payload;
          const user = store.app_users.find((u) => u.id === session!.id && u.pin_code === pin.trim());
          if (user) {
            const { mot_de_passe, pin_code, ...safeUser } = user;
            return setSessionCookie(
              NextResponse.json({ success: true, user: safeUser }),
              { id: Number(user.id), username: user.username, role: user.role }
            );
          }
          return NextResponse.json({ success: false, error: 'Code PIN incorrect' });
        }

        case 'import_db': {
          if (payload.data && typeof payload.data === 'object') {
            if (payload.data.clients) store.clients = payload.data.clients;
            if (payload.data.produits) store.produits = payload.data.produits;
            if (payload.data.fournisseurs) store.fournisseurs = payload.data.fournisseurs;
            if (payload.data.bons_livraison) store.bons_livraison = payload.data.bons_livraison;
            if (payload.data.factures) store.factures = payload.data.factures;
            if (payload.data.company) store.company_info = [payload.data.company];
          }
          return NextResponse.json({
            success: true,
            mode: payload.mode || 'merge',
            message: 'Données importées avec succès dans la base',
            counts: {
              clients: store.clients.length,
              produits: store.produits.length,
              factures: store.factures.length,
              bons_livraison: store.bons_livraison.length,
            },
          });
        }

        default:
          return NextResponse.json({ success: true, message: 'Action traitée en mémoire locale' });
      }
    }
  } catch (err: any) {
    console.error('PostgreSQL API Action error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Erreur serveur PostgreSQL' }, { status: 500 });
  }
}
