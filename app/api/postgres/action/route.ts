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
  OFFICIAL_FOURNISSEURS_2026,
  OFFICIAL_FACTURES_FOURNISSEURS_2026,
  OFFICIAL_PAIEMENTS_FOURNISSEURS_2026
} from '@/lib/seed-achats-2026';
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

// `fetch_all` is intentionally kept as one compatibility endpoint for the
// existing UI, but it used to execute 23 full-table queries on every request.
// A short-lived per-instance cache prevents page navigations and concurrent
// components from repeatedly downloading the same database snapshot. Writes
// invalidate it before they run, so a saved document is never hidden behind a
// stale snapshot for the next read.
const FETCH_ALL_CACHE_TTL_MS = 30_000;
let fetchAllCache: { body: any; expiresAt: number } | null = null;
let schemaInitializedForRuntime = false;

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
        telephone: '0808551156 / 0678301643',
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
      fournisseurs: OFFICIAL_FOURNISSEURS_2026.map((f, i) => ({
        id: f.id || i + 1,
        code: f.code || `FOURN${i + 1}`,
        nom: f.nom,
        interlocuteur: '',
        adresse: '',
        ville: 'Marrakech',
        telephone: '',
        mobile: '',
        email: '',
        ice: '',
        solde_du: f.solde_du || 0,
        total_achats: f.total_achats || 0
      })),
      factures_fournisseurs: OFFICIAL_FACTURES_FOURNISSEURS_2026,
      paiements_fournisseurs: OFFICIAL_PAIEMENTS_FOURNISSEURS_2026,
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

    // Any authenticated action other than the snapshot read may mutate data.
    // Invalidate before handling it so the next `fetch_all` sees the commit.
    // This is deliberately conservative: invalidating on a read-only action
    // costs at most one refresh, while serving stale financial documents is
    // much more harmful.
    if (action !== 'fetch_all' && action !== 'session' && action !== 'logout') {
      fetchAllCache = null;
    }

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
      if ((action === 'init_schema' || action === 'fetch_all') && !schemaInitializedForRuntime) {
        try {
          await initNeonPostgresSchema();
          schemaInitializedForRuntime = true;
        } catch (initErr) {
          console.warn('Postgres schema init check notice:', initErr);
        }
      }

      switch (action) {
        case 'fetch_all': {
          const now = Date.now();
          if (fetchAllCache && fetchAllCache.expiresAt > now) {
            return NextResponse.json(fetchAllCache.body);
          }

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
            usersRes,
            facturesFournisseursRes,
            paiementsFournisseursRes
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
            sql`SELECT id, username, nom_complet, email, role, avatar, statut, derniere_connexion, created_at FROM app_users ORDER BY id ASC;`.catch(() => []),
            sql`SELECT ff.*, COALESCE((SELECT json_agg(ffl.*) FROM factures_fournisseurs_lignes ffl WHERE ffl.facture_fournisseur_id = ff.id), '[]'::json) as lignes FROM factures_fournisseurs ff ORDER BY ff.date_facture DESC, ff.id DESC;`.catch(() => []),
            sql`SELECT * FROM paiements_fournisseurs ORDER BY date_paiement DESC, id DESC;`.catch(() => [])
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

          const responseBody = {
            success: true,
            database: 'Neon PostgreSQL (Connected)',
            data: {
              company: (companyRes as any[])[0] || null,
              clients: clientsRes,
              fournisseurs: (fournisseursRes && (fournisseursRes as any[]).length > 0) ? fournisseursRes : OFFICIAL_FOURNISSEURS_2026,
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
              users: usersRes,
              factures_fournisseurs: (facturesFournisseursRes && (facturesFournisseursRes as any[]).length > 0) ? facturesFournisseursRes : OFFICIAL_FACTURES_FOURNISSEURS_2026,
              paiements_fournisseurs: (paiementsFournisseursRes && (paiementsFournisseursRes as any[]).length > 0) ? paiementsFournisseursRes : OFFICIAL_PAIEMENTS_FOURNISSEURS_2026
            }
          };
          fetchAllCache = { body: responseBody, expiresAt: now + FETCH_ALL_CACHE_TTL_MS };
          return NextResponse.json(responseBody);
        }

        // --- BONS DE LIVRAISON ---
        case 'create_bon_livraison': {
          const { bl, lignes } = payload;
          const clientId = Number(bl.client_id);
          if (!clientId) {
            return NextResponse.json(
              { success: false, error: 'Veuillez sélectionner un client valide.' },
              { status: 400 }
            );
          }
          const clientRows: any = await sql`
            SELECT id, nom, ice, adresse, ville
            FROM clients
            WHERE id = ${clientId}
            LIMIT 1;
          `;
          if (!clientRows.length) {
            return NextResponse.json(
              { success: false, error: 'Le client sélectionné est introuvable dans Neon.' },
              { status: 404 }
            );
          }
          const selectedClient = clientRows[0];
          const maxIdRes: any = await sql`SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM bons_livraison;`;
          const blId = maxIdRes[0]?.next_id || 1;
          const documentDate = String(bl.date || new Date().toISOString().slice(0, 10));
          const yearSuffix = documentDate.slice(2, 4);
          const requestedNumero = String(bl.numero || '').trim();
          if (requestedNumero) {
            const duplicateNumero: any = await sql`
              SELECT id FROM bons_livraison WHERE numero = ${requestedNumero} LIMIT 1;
            `;
            if (duplicateNumero.length) {
              return NextResponse.json(
                { success: false, error: `Le numéro de BL ${requestedNumero} existe déjà.` },
                { status: 409 }
              );
            }
          }
          const nextNumeroRes: any = await sql`
            SELECT COALESCE(MAX(split_part(numero, '/', 1)::bigint), 0) + 1 AS next_numero
            FROM bons_livraison
            WHERE numero ~ '^[0-9]+/[0-9]{2}$'
              AND split_part(numero, '/', 2) = ${yearSuffix};
          `;
          const blNumero = requestedNumero || `${nextNumeroRes[0]?.next_numero || 1}/${yearSuffix}`;

          await sql`
            INSERT INTO bons_livraison (
              id, numero, date, client_id, client_nom, client_ice, client_adresse, client_ville,
              total_ht, tva_20, tva_10, total_tva, total_ttc, montant_brut, remise_pct, ristourne_pct,
              escompte_pct, port, statut, etat, mode_reglement, notes
            ) VALUES (
              ${blId}, ${blNumero}, ${documentDate}, ${clientId}, ${selectedClient.nom}, ${selectedClient.ice || ''},
              ${selectedClient.adresse || ''}, ${selectedClient.ville || ''}, ${num(bl.total_ht)}, ${num(bl.tva_20)},
              ${num(bl.tva_10)}, ${num(bl.total_tva)}, ${num(bl.total_ttc)}, ${num(bl.montant_brut)},
              ${num(bl.remise_pct)}, ${num(bl.ristourne_pct)}, ${num(bl.escompte_pct)}, ${num(bl.port)},
              ${bl.statut || 'En attente'}, ${bl.etat || 'Validé'}, ${bl.mode_reglement || 'Virement'}, ${bl.notes || ''}
            );
          `;

          if (Array.isArray(lignes)) {
            const lineMaxIdRes: any = await sql`SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM bons_livraison_lignes;`;
            const firstLineId = Number(lineMaxIdRes[0]?.next_id || 1);
            for (let i = 0; i < lignes.length; i++) {
              const l = lignes[i];
              const lineId = firstLineId + i;
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

          return NextResponse.json({
            success: true,
            id: blId,
            numero: blNumero,
            client_id: clientId,
            client_nom: selectedClient.nom,
            message: `Bon de livraison ${blNumero} créé avec succès`,
          });
        }

        case 'update_bon_livraison': {
          const { id, bl, lignes } = payload;
          const documentId = Number(id);
          const clientId = Number(bl.client_id);
          if (!documentId || !clientId) {
            return NextResponse.json(
              { success: false, error: 'BL ou client invalide.' },
              { status: 400 }
            );
          }

          const existingRows: any = await sql`
            SELECT id, numero, date, etat
            FROM bons_livraison
            WHERE id = ${documentId}
            LIMIT 1;
          `;
          if (!existingRows.length) {
            return NextResponse.json(
              { success: false, error: 'Bon de livraison introuvable.' },
              { status: 404 }
            );
          }
          if (existingRows[0].etat !== 'Brouillon') {
            return NextResponse.json(
              { success: false, error: 'Seul un BL en brouillon peut être modifié.' },
              { status: 409 }
            );
          }

          const clientRows: any = await sql`
            SELECT id, nom, ice, adresse, ville
            FROM clients
            WHERE id = ${clientId}
            LIMIT 1;
          `;
          if (!clientRows.length) {
            return NextResponse.json(
              { success: false, error: 'Le client sélectionné est introuvable dans Neon.' },
              { status: 404 }
            );
          }
          const selectedClient = clientRows[0];
          const requestedNumero = String(bl.numero || '').trim();
          const nextNumero = requestedNumero || existingRows[0].numero;
          if (nextNumero !== existingRows[0].numero) {
            const duplicateNumero: any = await sql`
              SELECT id FROM bons_livraison
              WHERE numero = ${nextNumero} AND id <> ${documentId}
              LIMIT 1;
            `;
            if (duplicateNumero.length) {
              return NextResponse.json(
                { success: false, error: `Le numéro de BL ${nextNumero} existe déjà.` },
                { status: 409 }
              );
            }
          }

          await sql`
            UPDATE bons_livraison
            SET numero = ${nextNumero},
                date = ${String(bl.date || existingRows[0].date || new Date().toISOString().slice(0, 10))},
                client_id = ${clientId},
                client_nom = ${selectedClient.nom},
                client_ice = ${selectedClient.ice || ''},
                client_adresse = ${selectedClient.adresse || ''},
                client_ville = ${selectedClient.ville || ''},
                total_ht = ${num(bl.total_ht)},
                tva_20 = ${num(bl.tva_20)},
                tva_10 = ${num(bl.tva_10)},
                total_tva = ${num(bl.total_tva)},
                total_ttc = ${num(bl.total_ttc)},
                montant_brut = ${num(bl.montant_brut)},
                remise_pct = ${num(bl.remise_pct)},
                ristourne_pct = ${num(bl.ristourne_pct)},
                escompte_pct = ${num(bl.escompte_pct)},
                port = ${num(bl.port)},
                etat = ${bl.etat || 'Brouillon'},
                mode_reglement = ${bl.mode_reglement || 'Virement'},
                notes = ${bl.notes || ''}
            WHERE id = ${documentId};
          `;

          await sql`DELETE FROM bons_livraison_lignes WHERE bon_livraison_id = ${documentId};`;
          if (Array.isArray(lignes) && lignes.length > 0) {
            const lineMaxIdRes: any = await sql`SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM bons_livraison_lignes;`;
            const firstLineId = Number(lineMaxIdRes[0]?.next_id || 1);
            for (let i = 0; i < lignes.length; i++) {
              const l = lignes[i];
              await sql`
                INSERT INTO bons_livraison_lignes (
                  id, bon_livraison_id, produit_id, designation, groupe, unite, quantite,
                  prix_ht, taux_tva, remise_pct, total_ht, total_tva, total_ttc
                ) VALUES (
                  ${firstLineId + i}, ${documentId}, ${l.produit_id || null}, ${l.designation},
                  ${l.groupe || ''}, ${l.unite || 'KG'}, ${num(l.quantite, 1)}, ${num(l.prix_ht)},
                  ${num(l.taux_tva, 20)}, ${num(l.remise_pct)}, ${num(l.total_ht)},
                  ${num(l.total_tva)}, ${num(l.total_ttc)}
                );
              `;
            }
          }

          return NextResponse.json({
            success: true,
            id: documentId,
            numero: nextNumero,
            client_id: clientId,
            client_nom: selectedClient.nom,
            message: `Bon de livraison ${existingRows[0].numero} mis à jour`,
          });
        }

        case 'update_bon_livraison_state': {
          const { id, etat } = payload;
          if (!['Brouillon', 'Validé', 'Annulé'].includes(etat)) {
            return NextResponse.json({ success: false, error: 'État de document invalide.' }, { status: 400 });
          }
          const updated: any = await sql`
            UPDATE bons_livraison SET etat = ${etat} WHERE id = ${id}
            RETURNING id, numero, etat;
          `;
          if (!updated.length) {
            return NextResponse.json({ success: false, error: 'Bon de livraison introuvable.' }, { status: 404 });
          }
          console.info('[document-state] BL updated', updated[0]);
          return NextResponse.json({ success: true, message: `État mis à jour: ${etat}` });
        }

        case 'update_bon_retour_state': {
          const { id, etat } = payload;
          if (!['Brouillon', 'Validé', 'Annulé'].includes(etat)) {
            return NextResponse.json({ success: false, error: 'État de document invalide.' }, { status: 400 });
          }
          const updated: any = await sql`
            UPDATE bons_retour SET etat = ${etat} WHERE id = ${id}
            RETURNING id, numero, etat;
          `;
          if (!updated.length) {
            return NextResponse.json({ success: false, error: 'Bon de retour introuvable.' }, { status: 404 });
          }
          console.info('[document-state] BR updated', updated[0]);
          return NextResponse.json({ success: true, message: `État du BR mis à jour: ${etat}` });
        }

        case 'update_facture_state': {
          const { id, etat } = payload;
          if (!['Brouillon', 'Validé', 'Annulé'].includes(etat)) {
            return NextResponse.json({ success: false, error: 'État de document invalide.' }, { status: 400 });
          }

          const currentRows: any = await sql`
            SELECT f.id, f.numero, f.etat, f.bl_associes, f.br_associes, f.montant_regle,
                   COALESCE((SELECT SUM(r.montant) FROM reglements r WHERE r.facture_id = f.id), 0) AS payment_total
            FROM factures f
            WHERE f.id = ${id}
            LIMIT 1;
          `;
          if (!currentRows.length) {
            return NextResponse.json({ success: false, error: 'Facture introuvable.' }, { status: 404 });
          }

          // Never cancel or reopen an invoice with a recorded payment. This prevents
          // a payment from becoming detached from its customer invoice.
          const recordedPayment = Math.max(num(currentRows[0].montant_regle), num(currentRows[0].payment_total));
          if ((etat === 'Annulé' || etat === 'Brouillon') && recordedPayment > 0.009) {
            return NextResponse.json(
              { success: false, error: 'Impossible : cette facture contient déjà un encaissement. Modifiez ou supprimez le règlement avant de changer son état.' },
              { status: 409 }
            );
          }

          // Keep linked BL/BR workflow consistent with the invoice state:
          // cancelling releases the source documents; validating a draft links them again.
          if (etat === 'Annulé') {
            await sql`
              UPDATE bons_livraison
              SET statut = 'En attente', facture_id = NULL, facture_numero = NULL
              WHERE facture_id = ${id};
            `;
            await sql`
              UPDATE bons_retour
              SET statut = 'En attente', facture_id = NULL, facture_numero = NULL
              WHERE facture_id = ${id};
            `;
          } else if (etat === 'Validé' && currentRows[0].etat === 'Brouillon') {
            const parseIds = (value: unknown): number[] => {
              if (Array.isArray(value)) return value.map(Number).filter(Boolean);
              if (typeof value !== 'string' || !value.trim()) return [];
              try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed) ? parsed.map(Number).filter(Boolean) : [];
              } catch {
                return [];
              }
            };
            const linkedBlIds = parseIds(currentRows[0].bl_associes);
            const linkedBrIds = parseIds(currentRows[0].br_associes);
            for (const blId of linkedBlIds) {
              await sql`
                UPDATE bons_livraison
                SET statut = 'Facturé', facture_id = ${id}, facture_numero = ${currentRows[0].numero}
                WHERE id = ${blId} AND COALESCE(cloture_sans_facture, FALSE) = FALSE;
              `;
            }
            for (const brId of linkedBrIds) {
              await sql`
                UPDATE bons_retour
                SET statut = 'Facturé', facture_id = ${id}, facture_numero = ${currentRows[0].numero}
                WHERE id = ${brId};
              `;
            }
          }

          const updated: any = await sql`
            UPDATE factures SET etat = ${etat} WHERE id = ${id}
            RETURNING id, numero, etat;
          `;
          if (!updated.length) {
            return NextResponse.json({ success: false, error: 'Facture introuvable.' }, { status: 404 });
          }
          console.info('[document-state] Facture updated', updated[0]);
          return NextResponse.json({ success: true, message: `État de la facture mis à jour: ${etat}` });
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
          const editingFactureId = Number(facture?.id || 0);

          // Editing a facture must update the existing row. Keeping this branch
          // separate from creation prevents the old facture from being duplicated.
          if (editingFactureId) {
            const existingRows: any = await sql`
              SELECT id, numero, date, client_id, montant_regle, bl_associes, br_associes, etat
              FROM factures WHERE id = ${editingFactureId} LIMIT 1;
            `;
            if (!existingRows.length) {
              return NextResponse.json({ success: false, error: 'Facture introuvable.' }, { status: 404 });
            }
            if (existingRows[0].etat !== 'Brouillon') {
              return NextResponse.json(
                { success: false, error: 'Seule une facture en brouillon peut être modifiée.' },
                { status: 409 }
              );
            }

            const requestedNumero = String(facture.numero || '').trim();
            const nextNumero = requestedNumero || existingRows[0].numero;
            if (nextNumero !== existingRows[0].numero) {
              const duplicateNumero: any = await sql`
                SELECT id FROM factures
                WHERE numero = ${nextNumero} AND id <> ${editingFactureId}
                LIMIT 1;
              `;
              if (duplicateNumero.length) {
                return NextResponse.json(
                  { success: false, error: `Le numéro de facture ${nextNumero} existe déjà.` },
                  { status: 409 }
                );
              }
            }

            const lineTotals = (Array.isArray(lignes) ? lignes : []).reduce(
              (totals: { ht: number; tva: number; ttc: number }, line: any) => ({
                ht: totals.ht + num(line.total_ht),
                tva: totals.tva + num(line.total_tva),
                ttc: totals.ttc + num(line.total_ttc),
              }),
              { ht: 0, tva: 0, ttc: 0 }
            );
            const totalHt = facture.total_ht == null ? lineTotals.ht : num(facture.total_ht);
            const totalTva = facture.total_tva == null ? lineTotals.tva : num(facture.total_tva);
            const totalTtc = facture.total_ttc == null ? lineTotals.ttc : num(facture.total_ttc);
            const montantRegle = num(existingRows[0].montant_regle);
            const resteAPayer = Math.max(0, totalTtc - montantRegle);
            const statutPaiement = resteAPayer <= 0.009
              ? 'Soldé'
              : montantRegle > 0.009
              ? 'Partiel'
              : 'Impayé';
            const nextClientId = Number(facture.client_id || existingRows[0].client_id);

            await sql`
              UPDATE factures
              SET numero = ${nextNumero},
                  date = ${String(facture.date || existingRows[0].date)},
                  client_id = ${nextClientId},
                  client_nom = ${facture.client_nom || ''},
                  client_ice = ${facture.client_ice || ''},
                  client_adresse = ${facture.client_adresse || ''},
                  client_ville = ${facture.client_ville || ''},
                  total_ht = ${totalHt},
                  tva_20 = ${num(facture.tva_20)},
                  tva_10 = ${num(facture.tva_10)},
                  total_tva = ${totalTva},
                  total_ttc = ${totalTtc},
                  reste_a_payer = ${resteAPayer},
                  statut_paiement = ${statutPaiement},
                  etat = ${facture.etat || 'Brouillon'},
                  mode_reglement = ${facture.mode_reglement || 'Virement'},
                  notes = ${facture.notes || ''}
              WHERE id = ${editingFactureId};
            `;

            await sql`DELETE FROM factures_lignes WHERE facture_id = ${editingFactureId};`;
            if (Array.isArray(lignes)) {
              for (let i = 0; i < lignes.length; i++) {
                const l = lignes[i];
                const lineMaxIdRes: any = await sql`SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM factures_lignes;`;
                const lineId = Number(lineMaxIdRes[0]?.next_id || i + 1);
                await sql`
                  INSERT INTO factures_lignes (
                    id, facture_id, produit_id, designation, groupe, unite, quantite,
                    prix_ht, taux_tva, remise_pct, total_ht, total_tva, total_ttc
                  ) VALUES (
                    ${lineId}, ${editingFactureId}, ${l.produit_id || null}, ${l.designation}, ${l.groupe || ''},
                    ${l.unite || 'KG'}, ${num(l.quantite, 1)}, ${num(l.prix_ht)}, ${num(l.taux_tva, 20)},
                    ${num(l.remise_pct)}, ${num(l.total_ht)}, ${num(l.total_tva)}, ${num(l.total_ttc)}
                  );
                `;
              }
            }

            await sql`
              UPDATE bons_livraison
              SET facture_numero = ${nextNumero}
              WHERE facture_id = ${editingFactureId};
            `;

            const affectedClients = Array.from(new Set([Number(existingRows[0].client_id), nextClientId])).filter(Boolean);
            for (const affectedClientId of affectedClients) {
              await sql`
                UPDATE clients c
                SET solde = COALESCE((
                  SELECT ROUND(SUM(GREATEST(COALESCE(f.reste_a_payer, COALESCE(f.total_ttc, 0) - COALESCE(f.montant_regle, 0)), 0))::numeric, 2)
                  FROM factures f
                  WHERE f.client_id = c.id
                    AND GREATEST(COALESCE(f.reste_a_payer, COALESCE(f.total_ttc, 0) - COALESCE(f.montant_regle, 0)), 0) > 0.009
                ), 0)
                WHERE c.id = ${affectedClientId};
              `;
            }

            return NextResponse.json({
              success: true,
              id: editingFactureId,
              numero: nextNumero,
              message: `Facture ${nextNumero} mise à jour`,
            });
          }

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
          const documentDate = String(facture.date || new Date().toISOString().slice(0, 10));
          const yearSuffix = documentDate.slice(2, 4);
          const requestedNumero = String(facture.numero || '').trim();
          if (requestedNumero) {
            const duplicateNumero: any = await sql`
              SELECT id FROM factures WHERE numero = ${requestedNumero} LIMIT 1;
            `;
            if (duplicateNumero.length) {
              return NextResponse.json(
                { success: false, error: `Le numéro de facture ${requestedNumero} existe déjà.` },
                { status: 409 }
              );
            }
          }
          const nextNumeroRes: any = await sql`
            SELECT COALESCE(MAX((regexp_replace(split_part(numero, '/', 1), '[^0-9]', '', 'g'))::bigint), 0) + 1 AS next_numero
            FROM factures
            WHERE numero ~ '^FA[0-9]+/[0-9]{2}$'
              AND split_part(numero, '/', 2) = ${yearSuffix};
          `;
          const factureNumero = requestedNumero || `FA${String(nextNumeroRes[0]?.next_numero || 1).padStart(6, '0')}/${yearSuffix}`;

          await sql`
            INSERT INTO factures (
              id, numero, date, client_id, client_nom, client_ice, client_adresse, client_ville,
              total_ht, tva_20, tva_10, total_tva, total_ttc, montant_regle, reste_a_payer,
              statut_paiement, etat, mode_reglement, notes, bl_associes
            ) VALUES (
              ${factId}, ${factureNumero}, ${documentDate}, ${facture.client_id}, ${facture.client_nom},
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

          await sql`
            UPDATE clients c
            SET solde = COALESCE((
              SELECT ROUND(SUM(GREATEST(COALESCE(f.reste_a_payer, COALESCE(f.total_ttc, 0) - COALESCE(f.montant_regle, 0)), 0))::numeric, 2)
              FROM factures f
              WHERE f.client_id = c.id
                AND GREATEST(COALESCE(f.reste_a_payer, COALESCE(f.total_ttc, 0) - COALESCE(f.montant_regle, 0)), 0) > 0.009
            ), 0)
            WHERE c.id = ${facture.client_id};
          `;

          return NextResponse.json({ success: true, id: factId, numero: factureNumero, message: 'Facture créée avec succès' });
        }

        case 'delete_facture': {
          const { id } = payload;
          const factClientRes: any = await sql`SELECT client_id FROM factures WHERE id = ${id} LIMIT 1;`;
          const factClientId = factClientRes[0]?.client_id;
          await sql`UPDATE bons_livraison SET statut = 'En attente', facture_id = NULL, facture_numero = NULL WHERE facture_id = ${id};`;
          await sql`DELETE FROM factures_lignes WHERE facture_id = ${id};`;
          await sql`DELETE FROM reglements WHERE facture_id = ${id};`;
          await sql`DELETE FROM factures WHERE id = ${id};`;
          if (factClientId) {
            await sql`
              UPDATE clients c
              SET solde = COALESCE((
                SELECT ROUND(SUM(GREATEST(COALESCE(f.reste_a_payer, COALESCE(f.total_ttc, 0) - COALESCE(f.montant_regle, 0)), 0))::numeric, 2)
                FROM factures f
                WHERE f.client_id = c.id
                  AND GREATEST(COALESCE(f.reste_a_payer, COALESCE(f.total_ttc, 0) - COALESCE(f.montant_regle, 0)), 0) > 0.009
              ), 0)
              WHERE c.id = ${factClientId};
            `;
          }
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
              ice = ${client.ice || ''}
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
          const amount = num(reglement.montant);
          if (amount <= 0) {
            return NextResponse.json(
              { success: false, error: 'Le montant du règlement doit être supérieur à zéro.' },
              { status: 400 }
            );
          }

          let factureId = reglement.facture_id ? Number(reglement.facture_id) : null;
          let factureNumero = String(reglement.facture_numero || '');
          let clientId = Number(reglement.client_id || 0);
          let clientNom = String(reglement.client_nom || '');

          // The invoice is the source of truth for the customer. This prevents a
          // payment selected for one invoice from being saved on another customer.
          if (factureId) {
            const linkedFacture: any = await sql`
              SELECT id, numero, client_id, client_nom,
                     GREATEST(COALESCE(reste_a_payer, total_ttc - COALESCE(montant_regle, 0)), 0) AS reste
              FROM factures
              WHERE id = ${factureId};
            `;
            if (!linkedFacture.length) {
              return NextResponse.json(
                { success: false, error: 'La facture sélectionnée est introuvable.' },
                { status: 404 }
              );
            }
            factureNumero = linkedFacture[0].numero;
            clientId = Number(linkedFacture[0].client_id);
            clientNom = linkedFacture[0].client_nom;
            if (amount > num(linkedFacture[0].reste) + 0.009) {
              return NextResponse.json(
                { success: false, error: 'Le montant dépasse le reste à payer de la facture.' },
                { status: 409 }
              );
            }
          } else {
            const clientRes: any = await sql`SELECT id, nom FROM clients WHERE id = ${clientId};`;
            if (!clientRes.length) {
              return NextResponse.json(
                { success: false, error: 'Veuillez sélectionner un client valide.' },
                { status: 400 }
              );
            }
            clientNom = clientRes[0].nom;
          }

          // A short idempotency window makes an automatic network retry safe.
          const duplicateRes: any = await sql`
            SELECT id
            FROM reglements
            WHERE facture_id IS NOT DISTINCT FROM ${factureId}
              AND client_id = ${clientId}
              AND date = ${reglement.date}
              AND montant = ${amount}
              AND COALESCE(reference_paiement, '') = ${reglement.reference_paiement || ''}
              AND created_at >= NOW() - INTERVAL '2 minutes'
            ORDER BY id DESC
            LIMIT 1;
          `;
          if (duplicateRes.length) {
            return NextResponse.json({
              success: true,
              id: Number(duplicateRes[0].id),
              duplicate: true,
              message: 'Règlement déjà enregistré',
            });
          }

          const maxIdRes: any = await sql`SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM reglements;`;
          const regId = maxIdRes[0]?.next_id || 1;
          const paymentMode = reglement.mode_reglement || reglement.mode || 'Virement';

          await sql`
            INSERT INTO reglements (
              id, facture_id, facture_numero, client_id, client_nom, date, montant,
              mode_reglement, mode, reference_paiement, banque, notes
            ) VALUES (
              ${regId}, ${factureId}, ${factureNumero}, ${clientId}, ${clientNom}, ${reglement.date},
              ${amount}, ${paymentMode}, ${paymentMode}, ${reglement.reference_paiement || ''},
              ${reglement.banque || ''}, ${reglement.notes || ''}
            );
          `;

          // Update facture paid amount if linked
          if (factureId) {
            const factRes: any = await sql`
              SELECT f.total_ttc,
                     COALESCE((SELECT SUM(r.montant) FROM reglements r WHERE r.facture_id = f.id), 0) AS total_paid
              FROM factures f
              WHERE f.id = ${factureId};
            `;
            if (factRes && factRes.length > 0) {
              const totalTtc = num(factRes[0].total_ttc);
              const newPaid = num(factRes[0].total_paid);
              const newReste = Math.max(0, totalTtc - newPaid);
              const newStatut = newReste <= 0.01 ? 'Payé' : newPaid > 0 ? 'Partiel' : 'Impayé';

              await sql`
                UPDATE factures 
                SET montant_regle = ${newPaid}, reste_a_payer = ${newReste}, statut_paiement = ${newStatut}
                WHERE id = ${factureId};
              `;
            }
          }

          await sql`
            UPDATE clients c
            SET solde = COALESCE((
              SELECT ROUND(SUM(GREATEST(COALESCE(f.reste_a_payer, COALESCE(f.total_ttc, 0) - COALESCE(f.montant_regle, 0)), 0))::numeric, 2)
              FROM factures f
              WHERE f.client_id = c.id
                AND GREATEST(COALESCE(f.reste_a_payer, COALESCE(f.total_ttc, 0) - COALESCE(f.montant_regle, 0)), 0) > 0.009
            ), 0)
            WHERE c.id = ${clientId};
          `;

          return NextResponse.json({ success: true, id: regId, message: 'Règlement enregistré' });
        }

        case 'update_reglement': {
          const { id, reglement } = payload;
          const paymentId = Number(id);
          const amount = num(reglement.montant);
          if (!paymentId || amount <= 0) {
            return NextResponse.json(
              { success: false, error: 'Le règlement ou son montant est invalide.' },
              { status: 400 }
            );
          }

          const previousRows: any = await sql`SELECT * FROM reglements WHERE id = ${paymentId};`;
          if (!previousRows.length) {
            return NextResponse.json({ success: false, error: 'Règlement introuvable.' }, { status: 404 });
          }
          const previous = previousRows[0];

          let factureId = reglement.facture_id ? Number(reglement.facture_id) : null;
          let factureNumero = '';
          let clientId = Number(reglement.client_id || 0);
          let clientNom = String(reglement.client_nom || '');
          let targetFacture: any = null;

          if (factureId) {
            const factureRows: any = await sql`
              SELECT f.id, f.numero, f.client_id, f.client_nom, f.total_ttc,
                     GREATEST(
                       f.total_ttc - COALESCE((
                         SELECT SUM(r.montant)
                         FROM reglements r
                         WHERE r.facture_id = f.id AND r.id <> ${paymentId}
                       ), 0),
                       0
                     ) AS disponible
              FROM factures f
              WHERE f.id = ${factureId};
            `;
            if (!factureRows.length) {
              return NextResponse.json(
                { success: false, error: 'La facture sélectionnée est introuvable.' },
                { status: 404 }
              );
            }
            targetFacture = factureRows[0];
            factureNumero = targetFacture.numero;
            clientId = Number(targetFacture.client_id);
            clientNom = targetFacture.client_nom;
            if (amount > num(targetFacture.disponible) + 0.009) {
              return NextResponse.json(
                {
                  success: false,
                  error: `Le montant dépasse le disponible de la facture (${num(targetFacture.disponible).toFixed(2)} DH).`,
                },
                { status: 409 }
              );
            }
          } else {
            if (previous.facture_id) {
              return NextResponse.json(
                { success: false, error: 'Un règlement déjà lettré doit rester associé à une facture.' },
                { status: 400 }
              );
            }
            const clientRows: any = await sql`SELECT id, nom FROM clients WHERE id = ${clientId};`;
            if (!clientRows.length) {
              return NextResponse.json(
                { success: false, error: 'Veuillez sélectionner un client valide.' },
                { status: 400 }
              );
            }
            clientNom = clientRows[0].nom;
          }

          const paymentMode = reglement.mode_reglement || reglement.mode || 'Virement';
          const invoiceIds = Array.from(
            new Set(
              [previous.facture_id ? Number(previous.facture_id) : null, factureId].filter(
                (value): value is number => value !== null
              )
            )
          );
          const clientIds = Array.from(
            new Set([Number(previous.client_id), clientId].filter((value) => value > 0))
          );

          const transactionResults: any = await sql.transaction(
            (txn) => {
              const queries: any[] = [];
              if (targetFacture) {
                queries.push(txn`
                  UPDATE reglements
                  SET facture_id = ${factureId}, facture_numero = ${factureNumero},
                      piece_type = 'FACTURE', piece_id = ${factureId}, piece_numero = ${factureNumero},
                      client_id = ${clientId}, client_nom = ${clientNom}, date = ${reglement.date},
                      montant = ${amount}, mode_reglement = ${paymentMode}, mode = ${paymentMode},
                      reference_paiement = ${reglement.reference_paiement || ''},
                      banque = ${reglement.banque || ''}, notes = ${reglement.notes || ''}
                  WHERE id = ${paymentId}
                    AND ${amount} <= (
                      SELECT GREATEST(
                        f.total_ttc - COALESCE((
                          SELECT SUM(other.montant)
                          FROM reglements other
                          WHERE other.facture_id = f.id AND other.id <> ${paymentId}
                        ), 0),
                        0
                      ) + 0.009
                      FROM factures f
                      WHERE f.id = ${factureId}
                    )
                  RETURNING id;
                `);
              } else {
                queries.push(txn`
                  UPDATE reglements
                  SET facture_id = NULL, facture_numero = '', piece_type = NULL,
                      piece_id = NULL, piece_numero = NULL, client_id = ${clientId},
                      client_nom = ${clientNom}, date = ${reglement.date}, montant = ${amount},
                      mode_reglement = ${paymentMode}, mode = ${paymentMode},
                      reference_paiement = ${reglement.reference_paiement || ''},
                      banque = ${reglement.banque || ''}, notes = ${reglement.notes || ''}
                  WHERE id = ${paymentId} AND facture_id IS NULL
                  RETURNING id;
                `);
              }

              for (const invoiceId of invoiceIds) {
                queries.push(txn`
                  UPDATE factures f
                  SET montant_regle = totals.paid,
                      reste_a_payer = GREATEST(totals.total_ttc - totals.paid, 0),
                      statut_paiement = CASE
                        WHEN GREATEST(totals.total_ttc - totals.paid, 0) <= 0.009 THEN 'Payé'
                        WHEN totals.paid > 0 THEN 'Partiel'
                        ELSE 'Impayé'
                      END
                  FROM (
                    SELECT target.id, target.total_ttc, COALESCE(SUM(r.montant), 0) AS paid
                    FROM factures target
                    LEFT JOIN reglements r ON r.facture_id = target.id
                    WHERE target.id = ${invoiceId}
                    GROUP BY target.id, target.total_ttc
                  ) totals
                  WHERE f.id = totals.id;
                `);
              }

              for (const affectedClientId of clientIds) {
                queries.push(txn`
                  UPDATE clients c
                  SET solde = COALESCE((
                    SELECT ROUND(SUM(GREATEST(COALESCE(f.reste_a_payer, f.total_ttc - COALESCE(f.montant_regle, 0)), 0))::numeric, 2)
                    FROM factures f
                    WHERE f.client_id = c.id
                      AND GREATEST(COALESCE(f.reste_a_payer, f.total_ttc - COALESCE(f.montant_regle, 0)), 0) > 0.009
                  ), 0)
                  WHERE c.id = ${affectedClientId};
                `);
              }
              return queries;
            },
            { isolationLevel: 'Serializable' }
          );

          if (!transactionResults[0]?.length) {
            return NextResponse.json(
              { success: false, error: 'Le règlement n’a pas été modifié. Vérifiez le montant disponible.' },
              { status: 409 }
            );
          }
          console.info('[reglement] updated', { id: paymentId, factureId, clientId, amount });
          return NextResponse.json({ success: true, id: paymentId, message: 'Règlement modifié' });
        }

        case 'delete_reglement': {
          const paymentId = Number(payload.id);
          const previousRows: any = await sql`SELECT * FROM reglements WHERE id = ${paymentId};`;
          if (!previousRows.length) {
            return NextResponse.json({ success: false, error: 'Règlement introuvable.' }, { status: 404 });
          }
          const previous = previousRows[0];
          const factureId = previous.facture_id ? Number(previous.facture_id) : null;
          const clientId = Number(previous.client_id);

          await sql.transaction(
            (txn) => {
              const queries: any[] = [txn`DELETE FROM reglements WHERE id = ${paymentId};`];
              if (factureId) {
                queries.push(txn`
                  UPDATE factures f
                  SET montant_regle = totals.paid,
                      reste_a_payer = GREATEST(totals.total_ttc - totals.paid, 0),
                      statut_paiement = CASE
                        WHEN GREATEST(totals.total_ttc - totals.paid, 0) <= 0.009 THEN 'Payé'
                        WHEN totals.paid > 0 THEN 'Partiel'
                        ELSE 'Impayé'
                      END
                  FROM (
                    SELECT target.id, target.total_ttc, COALESCE(SUM(r.montant), 0) AS paid
                    FROM factures target
                    LEFT JOIN reglements r ON r.facture_id = target.id
                    WHERE target.id = ${factureId}
                    GROUP BY target.id, target.total_ttc
                  ) totals
                  WHERE f.id = totals.id;
                `);
              }
              queries.push(txn`
                UPDATE clients c
                SET solde = COALESCE((
                  SELECT ROUND(SUM(GREATEST(COALESCE(f.reste_a_payer, f.total_ttc - COALESCE(f.montant_regle, 0)), 0))::numeric, 2)
                  FROM factures f
                  WHERE f.client_id = c.id
                    AND GREATEST(COALESCE(f.reste_a_payer, f.total_ttc - COALESCE(f.montant_regle, 0)), 0) > 0.009
                ), 0)
                WHERE c.id = ${clientId};
              `);
              return queries;
            },
            { isolationLevel: 'Serializable' }
          );
          console.info('[reglement] deleted', { id: paymentId, factureId, clientId });
          return NextResponse.json({ success: true, message: 'Règlement supprimé' });
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
          const saleId = Number(maxIdRes[0]?.next_id || 1);

          const now = new Date();
          const dateStr = String(sale?.date_vente || now.toISOString().slice(0, 10));
          const timeStr = String(sale?.heure_paiement || now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
          const yearSuffix = dateStr.slice(2, 4) + dateStr.slice(5, 7) + dateStr.slice(8, 10);
          const defaultTicket = `TCK-${yearSuffix}-${String(saleId).padStart(4, '0')}`;
          const ticketNumero = String(sale?.numero_ticket || '').trim() || defaultTicket;

          const totalHt = num(sale?.total_ht);
          const totalTva = num(sale?.total_tva);
          const totalTtc = num(sale?.total_ttc);
          const netAPayer = num(sale?.montant_net_a_payer, totalTtc);
          const montantDonne = num(sale?.montant_donne, netAPayer);
          const montantRendu = num(sale?.montant_rendu);

          await sql`
            INSERT INTO pos_ventes (
              id, numero_ticket, session_id, table_id, table_numero, zone, type_commande,
              nb_couverts, serveur, date_vente, heure_commande, heure_paiement, client_nom,
              client_telephone, client_ice, total_ht, total_tva, tva_20, tva_10, tva_7, tva_0,
              total_ttc, remise_globale_montant, pourboire, montant_net_a_payer, montant_donne,
              montant_rendu, mode_reglement, reference_paiement, statut, caissier, notes
            ) VALUES (
              ${saleId},
              ${ticketNumero},
              ${sale?.session_id ? Number(sale.session_id) : null},
              ${sale?.table_id ? Number(sale.table_id) : null},
              ${sale?.table_numero || ''},
              ${sale?.zone || 'Salle'},
              ${sale?.type_commande || 'SUR_PLACE'},
              ${num(sale?.nb_couverts, 1)},
              ${sale?.serveur || 'Chef de Rang'},
              ${dateStr},
              ${sale?.heure_commande || timeStr},
              ${timeStr},
              ${sale?.client_nom || 'Client Restaurant'},
              ${sale?.client_telephone || null},
              ${sale?.client_ice || null},
              ${totalHt},
              ${totalTva},
              ${num(sale?.tva_20, totalTva)},
              ${num(sale?.tva_10, 0)},
              ${num(sale?.tva_7, 0)},
              ${num(sale?.tva_0, 0)},
              ${totalTtc},
              ${num(sale?.remise_globale_montant, 0)},
              ${num(sale?.pourboire, 0)},
              ${netAPayer},
              ${montantDonne},
              ${montantRendu},
              ${sale?.mode_reglement || 'Espèces'},
              ${sale?.reference_paiement || null},
              ${sale?.statut || 'PAYE'},
              ${sale?.caissier || 'Caisse Principale'},
              ${sale?.notes || ''}
            );
          `;

          if (Array.isArray(lignes) && lignes.length > 0) {
            const lineMaxIdRes: any = await sql`SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM pos_ventes_lignes;`;
            const firstLineId = Number(lineMaxIdRes[0]?.next_id || 1);
            for (let i = 0; i < lignes.length; i++) {
              const l = lignes[i];
              const lineId = firstLineId + i;
              await sql`
                INSERT INTO pos_ventes_lignes (
                  id, vente_id, produit_id, produit_code, produit_nom, prix_unitaire_ttc,
                  taux_tva, quantite, remise_pct, total_ht, total_tva, total_ttc, notes, suite
                ) VALUES (
                  ${lineId},
                  ${saleId},
                  ${l.produit_id ? Number(l.produit_id) : null},
                  ${l.produit_code || null},
                  ${l.produit_nom || l.nom || 'Article'},
                  ${num(l.prix_unitaire_ttc)},
                  ${num(l.taux_tva, 20)},
                  ${num(l.quantite, 1)},
                  ${num(l.remise_pct, 0)},
                  ${num(l.total_ht)},
                  ${num(l.total_tva)},
                  ${num(l.total_ttc)},
                  ${l.notes || ''},
                  ${Boolean(l.suite)}
                );
              `;
            }
          }

          if (sale?.table_id) {
            try {
              await sql`UPDATE pos_tables SET statut = 'LIBRE', nb_couverts = 0, montant_en_cours = 0, commande_json = NULL WHERE id = ${Number(sale.table_id)};`;
            } catch {
              await sql`ALTER TABLE pos_tables ADD COLUMN IF NOT EXISTS commande_json TEXT;`.catch(() => {});
              await sql`ALTER TABLE pos_tables ADD COLUMN IF NOT EXISTS montant_en_cours NUMERIC(15, 2) DEFAULT 0.00;`.catch(() => {});
              await sql`ALTER TABLE pos_tables ADD COLUMN IF NOT EXISTS heure_ouverture VARCHAR(50);`.catch(() => {});
              await sql`ALTER TABLE pos_tables ADD COLUMN IF NOT EXISTS notes TEXT;`.catch(() => {});
              await sql`UPDATE pos_tables SET statut = 'LIBRE', nb_couverts = 0 WHERE id = ${Number(sale.table_id)};`.catch(() => {});
            }
          }

          return NextResponse.json({
            success: true,
            id: saleId,
            numero_ticket: ticketNumero,
            message: 'Ticket de caisse enregistré avec succès'
          });
        }

        case 'save_pos_table_draft': {
          const { tableId, items, nbCouverts, serveur, notes, statut } = payload;
          const tId = Number(tableId);
          if (!tId) {
            return NextResponse.json({ success: false, error: 'Table invalide' }, { status: 400 });
          }
          const totalTtc = Array.isArray(items)
            ? items.reduce((acc: number, item: any) => acc + (Number(item.total_ttc) || 0), 0)
            : 0;
          const statusToSet = statut || (Array.isArray(items) && items.length > 0 ? 'OCCUPEE' : 'LIBRE');
          const commandeJson = Array.isArray(items) && items.length > 0 ? JSON.stringify(items) : null;
          const nowTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

          try {
            await sql`
              UPDATE pos_tables SET
                statut = ${statusToSet},
                nb_couverts = ${num(nbCouverts, 0)},
                montant_en_cours = ${num(totalTtc, 0)},
                commande_json = ${commandeJson},
                notes = ${notes || null},
                serveur = ${serveur || 'Caisse'},
                heure_ouverture = CASE WHEN heure_ouverture IS NULL OR heure_ouverture = '' THEN ${nowTime} ELSE heure_ouverture END
              WHERE id = ${tId};
            `;
          } catch {
            await sql`ALTER TABLE pos_tables ADD COLUMN IF NOT EXISTS commande_json TEXT;`.catch(() => {});
            await sql`ALTER TABLE pos_tables ADD COLUMN IF NOT EXISTS montant_en_cours NUMERIC(15, 2) DEFAULT 0.00;`.catch(() => {});
            await sql`ALTER TABLE pos_tables ADD COLUMN IF NOT EXISTS heure_ouverture VARCHAR(50);`.catch(() => {});
            await sql`ALTER TABLE pos_tables ADD COLUMN IF NOT EXISTS notes TEXT;`.catch(() => {});
            await sql`UPDATE pos_tables SET statut = ${statusToSet}, nb_couverts = ${num(nbCouverts, 0)} WHERE id = ${tId};`.catch(() => {});
          }
          return NextResponse.json({ success: true, message: 'Table mise à jour' });
        }

        case 'liberate_pos_table': {
          const { tableId } = payload;
          const tId = Number(tableId);
          if (tId) {
            try {
              await sql`UPDATE pos_tables SET statut = 'LIBRE', nb_couverts = 0, montant_en_cours = 0, commande_json = NULL, heure_ouverture = NULL, notes = NULL WHERE id = ${tId};`;
            } catch {
              await sql`ALTER TABLE pos_tables ADD COLUMN IF NOT EXISTS commande_json TEXT;`.catch(() => {});
              await sql`ALTER TABLE pos_tables ADD COLUMN IF NOT EXISTS montant_en_cours NUMERIC(15, 2) DEFAULT 0.00;`.catch(() => {});
              await sql`ALTER TABLE pos_tables ADD COLUMN IF NOT EXISTS heure_ouverture VARCHAR(50);`.catch(() => {});
              await sql`ALTER TABLE pos_tables ADD COLUMN IF NOT EXISTS notes TEXT;`.catch(() => {});
              await sql`UPDATE pos_tables SET statut = 'LIBRE', nb_couverts = 0 WHERE id = ${tId};`.catch(() => {});
            }
          }
          return NextResponse.json({ success: true, message: 'Table libérée' });
        }

        case 'cancel_pos_sale': {
          const { id, motif } = payload;
          const saleId = Number(id);
          if (saleId) {
            await sql`
              UPDATE pos_ventes SET
                statut = 'ANNULE',
                notes = COALESCE(notes, '') || ' [Annulé: ' || ${motif || 'Non spécifié'} || ']'
              WHERE id = ${saleId};
            `;
          }
          return NextResponse.json({ success: true, message: 'Vente annulée' });
        }

        // --- USER MANAGEMENT ---
        case 'create_user': {
          if (session?.role !== 'ADMIN') {
            return NextResponse.json({ success: false, error: 'Accès administrateur requis.' }, { status: 403 });
          }
          const user = payload?.user || {};
          const username = String(user.username || '').trim();
          const nomComplet = String(user.nom_complet || '').trim();
          const motDePasse = String(user.mot_de_passe || '').trim();
          if (!username || !nomComplet || !motDePasse) {
            return NextResponse.json({ success: false, error: 'Nom, identifiant et mot de passe sont obligatoires.' }, { status: 400 });
          }
          const nextIdRows: any = await sql`SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM app_users;`;
          const nextId = Number(nextIdRows[0]?.next_id || 1);
          const created: any = await sql`
            INSERT INTO app_users (id, username, nom_complet, email, role, pin_code, mot_de_passe, avatar, statut)
            VALUES (
              ${nextId}, ${username}, ${nomComplet}, ${String(user.email || '').trim()},
              ${user.role || 'CAISSE'}, ${String(user.pin_code || '').trim()}, ${motDePasse},
              ${String(user.avatar || 'US').trim()}, 1
            )
            RETURNING id;
          `;
          return NextResponse.json({ success: true, id: Number(created[0]?.id || nextId), message: 'Utilisateur créé' });
        }

        case 'update_user': {
          if (session?.role !== 'ADMIN') {
            return NextResponse.json({ success: false, error: 'Accès administrateur requis.' }, { status: 403 });
          }
          const userId = Number(payload?.id);
          const user = payload?.user || {};
          const username = String(user.username || '').trim();
          const nomComplet = String(user.nom_complet || '').trim();
          if (!userId || !username || !nomComplet) {
            return NextResponse.json({ success: false, error: 'Nom et identifiant sont obligatoires.' }, { status: 400 });
          }
          const newPassword = typeof user.mot_de_passe === 'string' ? user.mot_de_passe.trim() : '';
          const updated: any = await sql`
            UPDATE app_users SET
              username = ${username},
              nom_complet = ${nomComplet},
              email = ${String(user.email || '').trim()},
              role = ${user.role || 'CAISSE'},
              pin_code = ${String(user.pin_code || '').trim()},
              mot_de_passe = CASE WHEN ${newPassword} <> '' THEN ${newPassword} ELSE mot_de_passe END
            WHERE id = ${userId}
            RETURNING id;
          `;
          if (!updated.length) {
            return NextResponse.json({ success: false, error: 'Utilisateur introuvable.' }, { status: 404 });
          }
          return NextResponse.json({ success: true, id: userId, message: 'Utilisateur mis à jour' });
        }

        case 'delete_user': {
          if (session?.role !== 'ADMIN') {
            return NextResponse.json({ success: false, error: 'Accès administrateur requis.' }, { status: 403 });
          }
          const userId = Number(payload?.id);
          if (!userId || userId === 1) {
            return NextResponse.json({ success: false, error: 'L’administrateur principal ne peut pas être supprimé.' }, { status: 400 });
          }
          const deleted: any = await sql`DELETE FROM app_users WHERE id = ${userId} RETURNING id;`;
          if (!deleted.length) {
            return NextResponse.json({ success: false, error: 'Utilisateur introuvable.' }, { status: 404 });
          }
          return NextResponse.json({ success: true, message: 'Utilisateur supprimé' });
        }

        // --- FACTURES FOURNISSEURS & PAIEMENTS ---
        case 'fetch_factures_fournisseurs': {
          let rows: any = [];
          if (sql) {
            rows = await sql`
              SELECT ff.*,
                     COALESCE(
                       (SELECT json_agg(ffl.*) FROM factures_fournisseurs_lignes ffl WHERE ffl.facture_fournisseur_id = ff.id),
                       '[]'::json
                     ) as lignes
              FROM factures_fournisseurs ff
              ORDER BY ff.date_facture DESC, ff.id DESC;
            `.catch(() => []);
          }
          if (!rows || rows.length === 0) {
            rows = store.factures_fournisseurs || OFFICIAL_FACTURES_FOURNISSEURS_2026;
          }
          return NextResponse.json({ success: true, factures: rows });
        }

        case 'fetch_paiements_fournisseurs': {
          let rows: any = [];
          if (sql) {
            rows = await sql`
              SELECT * FROM paiements_fournisseurs ORDER BY date_paiement DESC, id DESC;
            `.catch(() => []);
          }
          if (!rows || rows.length === 0) {
            rows = store.paiements_fournisseurs || OFFICIAL_PAIEMENTS_FOURNISSEURS_2026;
          }
          return NextResponse.json({ success: true, paiements: rows });
        }

        case 'create_facture_fournisseur': {
          const { facture, lignes } = payload;
          const facMaxIdRes: any = await sql`SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM factures_fournisseurs;`;
          const facId = Number(facMaxIdRes[0]?.next_id || 1);
          
          await sql`
            INSERT INTO factures_fournisseurs (
              id, numero, fournisseur_id, fournisseur_nom, fournisseur_ice,
              date_facture, date_echeance, total_ht, tva_20, tva_10, tva_7, total_tva,
              total_ttc, montant_paye, reste_a_payer, statut, etat, designation_achat, notes
            ) VALUES (
              ${facId}, ${facture.numero}, ${facture.fournisseur_id}, ${facture.fournisseur_nom}, ${facture.fournisseur_ice || ''},
              ${facture.date_facture}, ${facture.date_echeance || ''}, ${num(facture.total_ht)}, ${num(facture.tva_20)},
              ${num(facture.tva_10)}, ${num(facture.tva_7)}, ${num(facture.total_tva)}, ${num(facture.total_ttc)},
              ${num(facture.montant_paye)}, ${num(facture.reste_a_payer)}, ${facture.statut || 'A payer'},
              ${facture.etat || 'Validé'}, ${facture.designation_achat || ''}, ${facture.notes || ''}
            );
          `;

          if (Array.isArray(lignes) && lignes.length > 0) {
            const lineMaxIdRes: any = await sql`SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM factures_fournisseurs_lignes;`;
            const firstLineId = Number(lineMaxIdRes[0]?.next_id || 1);
            for (let i = 0; i < lignes.length; i++) {
              const l = lignes[i];
              await sql`
                INSERT INTO factures_fournisseurs_lignes (
                  id, facture_fournisseur_id, produit_id, designation, quantite,
                  prix_achat_ht, taux_tva, total_ht, total_tva, total_ttc
                ) VALUES (
                  ${firstLineId + i}, ${facId}, ${l.produit_id || null}, ${l.designation},
                  ${num(l.quantite, 1)}, ${num(l.prix_achat_ht)}, ${num(l.taux_tva, 20)},
                  ${num(l.total_ht)}, ${num(l.total_tva)}, ${num(l.total_ttc)}
                );
              `;
            }
          }
          return NextResponse.json({ success: true, id: facId });
        }

        case 'delete_facture_fournisseur': {
          const { id } = payload;
          await sql`DELETE FROM factures_fournisseurs_lignes WHERE facture_fournisseur_id = ${id};`;
          await sql`DELETE FROM factures_fournisseurs WHERE id = ${id};`;
          return NextResponse.json({ success: true, message: 'Facture fournisseur supprimée' });
        }

        case 'create_paiement_fournisseur': {
          const { paiement } = payload;
          const payMaxIdRes: any = await sql`SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM paiements_fournisseurs;`;
          const payId = Number(payMaxIdRes[0]?.next_id || 1);
          await sql`
            INSERT INTO paiements_fournisseurs (
              id, fournisseur_id, fournisseur_nom, facture_fournisseur_id, facture_numero,
              date_paiement, montant, mode_paiement, numero_cheque_ref, banque_emettrice,
              date_echeance_depot, statut_cheque, notes
            ) VALUES (
              ${payId}, ${paiement.fournisseur_id}, ${paiement.fournisseur_nom}, ${paiement.facture_fournisseur_id || null},
              ${paiement.facture_numero || ''}, ${paiement.date_paiement}, ${num(paiement.montant)},
              ${paiement.mode_paiement || 'Chèque'}, ${paiement.numero_cheque_ref || ''}, ${paiement.banque_emettrice || ''},
              ${paiement.date_echeance_depot || ''}, ${paiement.statut_cheque || 'En attente'}, ${paiement.notes || ''}
            );
          `;
          return NextResponse.json({ success: true, id: payId });
        }

        case 'delete_paiement_fournisseur': {
          const { id } = payload;
          await sql`DELETE FROM paiements_fournisseurs WHERE id = ${id};`;
          return NextResponse.json({ success: true, message: 'Paiement fournisseur supprimé' });
        }

        case 'update_statut_cheque_fournisseur': {
          const { id, statut, dateEncaissement } = payload;
          await sql`
            UPDATE paiements_fournisseurs
            SET statut_cheque = ${statut},
                notes = COALESCE(notes, '') || ${dateEncaissement ? ` (Encaissé le ${dateEncaissement})` : ''}
            WHERE id = ${id};
          `;
          return NextResponse.json({ success: true, message: 'Statut chèque mis à jour' });
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
          const yearSuffix = String(bl.date || new Date().toISOString().slice(0, 10)).slice(2, 4);
          const numero = bl.numero || `${nextId}/${yearSuffix}`;
          const newBl = { ...bl, id: nextId, numero, lignes: lignes || [] };
          store.bons_livraison.unshift(newBl);
          return NextResponse.json({
            success: true,
            id: nextId,
            numero,
            client_id: bl.client_id,
            client_nom: bl.client_nom,
            message: 'BL créé',
          });
        }

        case 'update_bon_livraison': {
          const document = store.bons_livraison.find((item) => Number(item.id) === Number(payload.id));
          if (!document) return NextResponse.json({ success: false, error: 'Bon de livraison introuvable.' }, { status: 404 });
          Object.assign(document, payload.bl, { lignes: payload.lignes || [], id: document.id, numero: document.numero });
          return NextResponse.json({
            success: true,
            id: document.id,
            numero: document.numero,
            client_id: document.client_id,
            client_nom: document.client_nom,
            message: 'BL mis à jour',
          });
        }

        case 'update_bon_livraison_state': {
          const document = store.bons_livraison.find((item) => Number(item.id) === Number(payload.id));
          if (!document) return NextResponse.json({ success: false, error: 'Bon de livraison introuvable.' }, { status: 404 });
          document.etat = payload.etat;
          return NextResponse.json({ success: true, message: `État mis à jour: ${payload.etat}` });
        }

        case 'update_bon_retour_state': {
          const document = store.bons_retour.find((item) => Number(item.id) === Number(payload.id));
          if (!document) return NextResponse.json({ success: false, error: 'Bon de retour introuvable.' }, { status: 404 });
          document.etat = payload.etat;
          return NextResponse.json({ success: true, message: `État du BR mis à jour: ${payload.etat}` });
        }

        case 'update_facture_state': {
          const document = store.factures.find((item) => Number(item.id) === Number(payload.id));
          if (!document) return NextResponse.json({ success: false, error: 'Facture introuvable.' }, { status: 404 });
          if (!['Brouillon', 'Validé', 'Annulé'].includes(payload.etat)) {
            return NextResponse.json({ success: false, error: 'État de document invalide.' }, { status: 400 });
          }
          if (payload.etat === 'Annulé') {
            store.bons_livraison.forEach((bl) => {
              if (Number(bl.facture_id) === Number(document.id)) {
                bl.statut = 'En attente';
                bl.facture_id = undefined;
                bl.facture_numero = undefined;
              }
            });
            store.bons_retour.forEach((br) => {
              if (Number(br.facture_id) === Number(document.id)) {
                br.statut = 'En attente';
                br.facture_id = undefined;
                br.facture_numero = undefined;
              }
            });
          } else if (payload.etat === 'Validé' && document.etat === 'Brouillon') {
            const parseIds = (value: unknown): number[] => {
              if (Array.isArray(value)) return value.map(Number).filter(Boolean);
              if (typeof value !== 'string' || !value.trim()) return [];
              try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed) ? parsed.map(Number).filter(Boolean) : [];
              } catch {
                return [];
              }
            };
            parseIds(document.bl_associes).forEach((blId) => {
              const bl = store.bons_livraison.find((item) => Number(item.id) === blId);
              if (bl && !bl.cloture_sans_facture) {
                bl.statut = 'Facturé';
                bl.facture_id = document.id;
                bl.facture_numero = document.numero;
              }
            });
            parseIds(document.br_associes).forEach((brId) => {
              const br = store.bons_retour.find((item) => Number(item.id) === brId);
              if (br) {
                br.statut = 'Facturé';
                br.facture_id = document.id;
                br.facture_numero = document.numero;
              }
            });
          }
          document.etat = payload.etat;
          return NextResponse.json({ success: true, message: `État de la facture mis à jour: ${payload.etat}` });
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

        case 'create_pos_sale': {
          const { sale, lignes } = payload;
          const nextId = (store.pos_ventes?.length || 0) + 1;
          const now = new Date();
          const dateStr = String(sale?.date_vente || now.toISOString().slice(0, 10));
          const timeStr = String(sale?.heure_paiement || now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
          const yearSuffix = dateStr.slice(2, 4) + dateStr.slice(5, 7) + dateStr.slice(8, 10);
          const defaultTicket = `TCK-${yearSuffix}-${String(nextId).padStart(4, '0')}`;
          const ticketNumero = String(sale?.numero_ticket || '').trim() || defaultTicket;
          const newSale = {
            ...sale,
            id: nextId,
            numero_ticket: ticketNumero,
            date_vente: dateStr,
            heure_paiement: timeStr,
            statut: 'PAYE',
            lignes: lignes || []
          };
          store.pos_ventes = store.pos_ventes || [];
          store.pos_ventes.unshift(newSale);
          if (sale?.table_id && store.pos_tables) {
            const table = store.pos_tables.find((t: any) => t.id === Number(sale.table_id));
            if (table) {
              table.statut = 'LIBRE';
              table.nb_couverts = 0;
              table.montant_en_cours = 0;
              table.commande_json = null;
            }
          }
          return NextResponse.json({ success: true, id: nextId, numero_ticket: ticketNumero, message: 'Ticket créé' });
        }

        case 'save_pos_table_draft': {
          const { tableId, items, nbCouverts, serveur, notes, statut } = payload;
          if (store.pos_tables) {
            const table = store.pos_tables.find((t: any) => t.id === Number(tableId));
            if (table) {
              const totalTtc = Array.isArray(items)
                ? items.reduce((acc: number, item: any) => acc + (Number(item.total_ttc) || 0), 0)
                : 0;
              table.statut = statut || (Array.isArray(items) && items.length > 0 ? 'OCCUPEE' : 'LIBRE');
              table.nb_couverts = Number(nbCouverts) || 0;
              table.montant_en_cours = totalTtc;
              table.commande_json = Array.isArray(items) && items.length > 0 ? JSON.stringify(items) : null;
              table.notes = notes || null;
              table.serveur = serveur || 'Caisse';
              if (!table.heure_ouverture) {
                table.heure_ouverture = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
              }
            }
          }
          return NextResponse.json({ success: true, message: 'Table mise à jour' });
        }

        case 'liberate_pos_table': {
          const { tableId } = payload;
          if (store.pos_tables) {
            const table = store.pos_tables.find((t: any) => t.id === Number(tableId));
            if (table) {
              table.statut = 'LIBRE';
              table.nb_couverts = 0;
              table.montant_en_cours = 0;
              table.commande_json = null;
              table.heure_ouverture = null;
              table.notes = null;
            }
          }
          return NextResponse.json({ success: true, message: 'Table libérée' });
        }

        case 'cancel_pos_sale': {
          const { id, motif } = payload;
          if (store.pos_ventes) {
            const sale = store.pos_ventes.find((s: any) => s.id === Number(id));
            if (sale) {
              sale.statut = 'ANNULE';
              sale.notes = (sale.notes || '') + ` [Annulé: ${motif || 'Non spécifié'}]`;
            }
          }
          return NextResponse.json({ success: true, message: 'Vente annulée' });
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

        case 'create_user': {
          if (session?.role !== 'ADMIN') {
            return NextResponse.json({ success: false, error: 'Accès administrateur requis.' }, { status: 403 });
          }
          const user = payload?.user || {};
          const username = String(user.username || '').trim();
          const nomComplet = String(user.nom_complet || '').trim();
          const motDePasse = String(user.mot_de_passe || '').trim();
          if (!username || !nomComplet || !motDePasse) {
            return NextResponse.json({ success: false, error: 'Nom, identifiant et mot de passe sont obligatoires.' }, { status: 400 });
          }
          if (store.app_users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
            return NextResponse.json({ success: false, error: 'Cet identifiant existe déjà.' }, { status: 409 });
          }
          const nextId = Math.max(0, ...store.app_users.map((u) => Number(u.id) || 0)) + 1;
          store.app_users.push({
            id: nextId,
            username,
            nom_complet: nomComplet,
            email: String(user.email || '').trim(),
            role: user.role || 'CAISSE',
            pin_code: String(user.pin_code || '').trim(),
            mot_de_passe: motDePasse,
            avatar: String(user.avatar || 'US').trim(),
            statut: 1,
          });
          return NextResponse.json({ success: true, id: nextId, message: 'Utilisateur créé' });
        }

        case 'update_user': {
          if (session?.role !== 'ADMIN') {
            return NextResponse.json({ success: false, error: 'Accès administrateur requis.' }, { status: 403 });
          }
          const userId = Number(payload?.id);
          const user = payload?.user || {};
          const target = store.app_users.find((u) => Number(u.id) === userId);
          const username = String(user.username || '').trim();
          const nomComplet = String(user.nom_complet || '').trim();
          if (!target) return NextResponse.json({ success: false, error: 'Utilisateur introuvable.' }, { status: 404 });
          if (!username || !nomComplet) {
            return NextResponse.json({ success: false, error: 'Nom et identifiant sont obligatoires.' }, { status: 400 });
          }
          if (store.app_users.some((u) => Number(u.id) !== userId && u.username.toLowerCase() === username.toLowerCase())) {
            return NextResponse.json({ success: false, error: 'Cet identifiant existe déjà.' }, { status: 409 });
          }
          Object.assign(target, {
            username,
            nom_complet: nomComplet,
            email: String(user.email || '').trim(),
            role: user.role || 'CAISSE',
            pin_code: String(user.pin_code || '').trim(),
          });
          if (typeof user.mot_de_passe === 'string' && user.mot_de_passe.trim()) {
            target.mot_de_passe = user.mot_de_passe.trim();
          }
          return NextResponse.json({ success: true, id: userId, message: 'Utilisateur mis à jour' });
        }

        case 'delete_user': {
          if (session?.role !== 'ADMIN') {
            return NextResponse.json({ success: false, error: 'Accès administrateur requis.' }, { status: 403 });
          }
          const userId = Number(payload?.id);
          if (!userId || userId === 1) {
            return NextResponse.json({ success: false, error: 'L’administrateur principal ne peut pas être supprimé.' }, { status: 400 });
          }
          const before = store.app_users.length;
          store.app_users = store.app_users.filter((u) => Number(u.id) !== userId);
          if (store.app_users.length === before) {
            return NextResponse.json({ success: false, error: 'Utilisateur introuvable.' }, { status: 404 });
          }
          return NextResponse.json({ success: true, message: 'Utilisateur supprimé' });
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
