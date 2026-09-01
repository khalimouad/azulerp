import { NextRequest, NextResponse } from 'next/server';
import { getNeonSql, getNeonDatabaseUrl } from '@/lib/neon-postgres';
import { readSession, unauthorizedResponse } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const DB_SCHEMA_SYSTEM_PROMPT = `Tu es l'Assistant IA Expert de Base de Données (Data Copilot) pour le progiciel de gestion Verde Orto (ERP Agroalimentaire & Restaurant à Marrakech, Maroc).

Voici le schéma complet des tables PostgreSQL de la base de données :

1. \`clients\` (id BIGINT PK, code VARCHAR, nom VARCHAR NOT NULL, interlocuteur VARCHAR, adresse TEXT, code_postal VARCHAR, ville VARCHAR, pays VARCHAR, telephone VARCHAR, mobile VARCHAR, email VARCHAR, ice VARCHAR, observations TEXT, solde NUMERIC, total_facture NUMERIC, total_regle NUMERIC, created_at TIMESTAMPTZ)
2. \`produits\` (id BIGINT PK, code VARCHAR, libelle VARCHAR NOT NULL, code_barre VARCHAR, categorie_id BIGINT, categorie_nom VARCHAR, famille_id BIGINT, famille_nom VARCHAR, marque_id BIGINT, marque_nom VARCHAR, groupe VARCHAR, unite VARCHAR, prix_ht NUMERIC, taux_tva NUMERIC, prix_achat_ht NUMERIC, stock_actuel NUMERIC, stock_min NUMERIC, stock_virtuel NUMERIC, actif INT, notes TEXT)
3. \`bons_livraison\` (id BIGINT PK, numero VARCHAR NOT NULL, date VARCHAR NOT NULL, client_id BIGINT, client_nom VARCHAR, client_ice VARCHAR, client_adresse TEXT, client_ville VARCHAR, total_ht NUMERIC, tva_20 NUMERIC, tva_10 NUMERIC, total_tva NUMERIC, total_ttc NUMERIC, statut VARCHAR ['En attente', 'Facturé'], etat VARCHAR ['Brouillon', 'Validé', 'Annulé'], facture_id BIGINT, facture_numero VARCHAR, cloture_sans_facture BOOLEAN, notes TEXT)
4. \`bons_livraison_lignes\` (id BIGINT PK, bon_livraison_id BIGINT NOT NULL, produit_id BIGINT, designation VARCHAR NOT NULL, groupe VARCHAR, unite VARCHAR, quantite NUMERIC, prix_ht NUMERIC, taux_tva NUMERIC, remise_pct NUMERIC, total_ht NUMERIC, total_tva NUMERIC, total_ttc NUMERIC)
5. \`bons_retour\` (id BIGINT PK, numero VARCHAR NOT NULL, date VARCHAR NOT NULL, client_id BIGINT, client_nom VARCHAR, client_ice VARCHAR, total_ht NUMERIC, total_tva NUMERIC, total_ttc NUMERIC, statut VARCHAR ['En attente', 'Facturé'], etat VARCHAR ['Brouillon', 'Validé', 'Annulé'], facture_id BIGINT, facture_numero VARCHAR, motif TEXT)
6. \`bons_retour_lignes\` (id BIGINT PK, bon_retour_id BIGINT NOT NULL, produit_id BIGINT, designation VARCHAR NOT NULL, unite VARCHAR, quantite NUMERIC, prix_ht NUMERIC, taux_tva NUMERIC, total_ht NUMERIC, total_tva NUMERIC, total_ttc NUMERIC)
7. \`factures\` (id BIGINT PK, numero VARCHAR NOT NULL, date VARCHAR NOT NULL, client_id BIGINT, client_nom VARCHAR, client_ice VARCHAR, client_adresse TEXT, client_ville VARCHAR, total_ht NUMERIC, tva_20 NUMERIC, tva_10 NUMERIC, total_tva NUMERIC, total_ttc NUMERIC, montant_regle NUMERIC, reste_a_payer NUMERIC, statut_paiement VARCHAR ['Impayé', 'Partiel', 'Soldé'], etat VARCHAR ['Brouillon', 'Validé', 'Annulé'], mode_reglement VARCHAR, bl_associes TEXT, br_associes TEXT, notes TEXT)
8. \`factures_lignes\` (id BIGINT PK, facture_id BIGINT NOT NULL, produit_id BIGINT, designation VARCHAR NOT NULL, groupe VARCHAR, unite VARCHAR, quantite NUMERIC, prix_ht NUMERIC, taux_tva NUMERIC, remise_pct NUMERIC, total_ht NUMERIC, total_tva NUMERIC, total_ttc NUMERIC)
9. \`reglements\` (id BIGINT PK, numero VARCHAR NOT NULL, date VARCHAR NOT NULL, client_id BIGINT, client_nom VARCHAR, facture_id BIGINT, facture_numero VARCHAR, montant NUMERIC, mode_paiement VARCHAR, reference_paiement VARCHAR, date_echeance VARCHAR, statut_cheque VARCHAR, statut_remise VARCHAR, statut VARCHAR, notes TEXT)
10. \`fournisseurs\` (id BIGINT PK, code VARCHAR, nom VARCHAR NOT NULL, interlocuteur VARCHAR, adresse TEXT, ville VARCHAR, telephone VARCHAR, mobile VARCHAR, email VARCHAR, ice VARCHAR, solde_du NUMERIC, total_achats NUMERIC)
11. \`factures_fournisseurs\` (id BIGINT PK, numero VARCHAR NOT NULL, fournisseur_id BIGINT NOT NULL, fournisseur_nom VARCHAR NOT NULL, fournisseur_ice VARCHAR, date_facture VARCHAR NOT NULL, date_echeance VARCHAR, total_ht NUMERIC, tva_20 NUMERIC, tva_10 NUMERIC, tva_7 NUMERIC, total_tva NUMERIC, total_ttc NUMERIC, montant_paye NUMERIC, reste_a_payer NUMERIC, statut VARCHAR, etat VARCHAR, designation_achat TEXT)
12. \`paiements_fournisseurs\` (id BIGINT PK, fournisseur_id BIGINT NOT NULL, fournisseur_nom VARCHAR, facture_fournisseur_id BIGINT, facture_numero VARCHAR, date_paiement VARCHAR, montant NUMERIC, mode_paiement VARCHAR, numero_cheque_ref VARCHAR, banque_emettrice VARCHAR, date_echeance_depot VARCHAR, statut_cheque VARCHAR)
13. \`devis\` & \`devis_lignes\`
14. \`stock_mouvements\` (id BIGINT PK, produit_id BIGINT, produit_nom VARCHAR, type_mouvement VARCHAR, quantite NUMERIC, date_mouvement VARCHAR, reference_document VARCHAR, stock_apres NUMERIC, commentaire TEXT)
15. \`company_info\` (nom, adresse, ice, if_fiscal, rc, cnss, patente, telephone, email, banque, rib, partenaire_coop, etc.)
16. \`pos_ventes\` & \`pos_ventes_lignes\` & \`pos_tables\` & \`pos_produits\`

RÈGLES IMPORTANTES :
1. Réponds TOUJOURS en français de manière claire, concise et professionnelle.
2. Si la demande de l'utilisateur implique une interrogation ou une modification de la base de données, fournis TOUJOURS le code SQL exact dans un bloc \`\`\`sql ... \`\`\`.
3. Indique clairement s'il s'agit d'une opération de **LECTURE** (SELECT) ou d'une opération de **MODIFICATION / ÉCRITURE** (UPDATE, INSERT, DELETE).
4. Explique brièvement ce que la requête va faire et quel en est l'impact.
5. Veille à ce que le code SQL soit 100% valide sous PostgreSQL.
`;

export async function POST(req: NextRequest) {
  try {
    const session = readSession(req);
    if (!session) return unauthorizedResponse();

    const body = await req.json();
    const { action, prompt, conversationHistory = [], apiKey: clientApiKey, model = 'gemini-2.5-flash', query, isMutation } = body;

    // Action 1: CHAT with Gemini AI
    if (action === 'chat') {
      const apiKey = clientApiKey || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey || !apiKey.trim()) {
        return NextResponse.json({
          success: false,
          error: 'Clé API Gemini manquante. Veuillez saisir votre clé API Google Gemini dans les paramètres de l\'assistant ou configurer GEMINI_API_KEY.'
        }, { status: 400 });
      }

      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        return NextResponse.json({ success: false, error: 'Prompt manquant.' }, { status: 400 });
      }

      // Build Gemini contents payload
      const contents: any[] = [];

      // Add conversation history
      if (Array.isArray(conversationHistory)) {
        for (const msg of conversationHistory) {
          if (msg && msg.content) {
            contents.push({
              role: msg.role === 'user' ? 'user' : 'model',
              parts: [{ text: String(msg.content) }]
            });
          }
        }
      }

      // Add current user prompt
      contents.push({
        role: 'user',
        parts: [{ text: prompt }]
      });

      const requestedModel = (model && typeof model === 'string' && model.trim()) ? model.trim() : 'gemini-3.6-flash';
      const fallbackModels = Array.from(new Set([requestedModel, 'gemini-3.6-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro']));

      let geminiRes: Response | null = null;
      let lastErrorText = '';
      let successfulModel = requestedModel;

      for (const currentModel of fallbackModels) {
        try {
          const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey.trim()}`;
          const res = await fetch(geminiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents,
              systemInstruction: {
                parts: [{ text: DB_SCHEMA_SYSTEM_PROMPT }]
              },
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 2048,
              }
            })
          });

          if (res.ok) {
            geminiRes = res;
            successfulModel = currentModel;
            break;
          } else {
            const errBody = await res.text();
            lastErrorText = errBody;
            // If 404 (model not found / deprecated), continue to try next fallback
            if (res.status === 404) {
              continue;
            } else {
              geminiRes = res;
              break;
            }
          }
        } catch (fetchErr: any) {
          lastErrorText = fetchErr?.message || 'Network error';
        }
      }

      if (!geminiRes || !geminiRes.ok) {
        let parsedMsg = `Erreur API Gemini : ${lastErrorText || 'Modèle indisponible'}`;
        try {
          const jsonErr = JSON.parse(lastErrorText);
          parsedMsg = jsonErr?.error?.message || parsedMsg;
        } catch (_) {}

        return NextResponse.json({
          success: false,
          error: parsedMsg
        }, { status: 400 });
      }

      const geminiData = await geminiRes.json();
      const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'Aucune réponse générée par Gemini.';

      // Extract SQL query if present
      const sqlMatch = rawText.match(/```sql\s*([\s\S]*?)\s*```/i);
      const extractedSql = sqlMatch ? sqlMatch[1].trim() : null;
      const isSqlMutation = extractedSql ? /^(update|delete|insert|alter|drop|truncate|create)\b/i.test(extractedSql.trim()) : false;

      return NextResponse.json({
        success: true,
        text: rawText,
        sql: extractedSql,
        queryType: extractedSql ? (isSqlMutation ? 'MUTATION' : 'SELECT') : null,
        modelUsed: successfulModel,
      });
    }

    // Action 2: EXECUTE SQL Query directly on Neon PostgreSQL
    if (action === 'execute_sql') {
      if (!query || typeof query !== 'string' || !query.trim()) {
        return NextResponse.json({ success: false, error: 'Requête SQL vide.' }, { status: 400 });
      }

      const sql = getNeonSql();
      const startTime = Date.now();
      const trimmedQuery = query.trim();

      // Check if mutation or select
      const isMutationQuery = /^(update|delete|insert|alter|drop|truncate|create)\b/i.test(trimmedQuery);

      try {
        const result: any = await sql.query(trimmedQuery, []);
        const durationMs = Date.now() - startTime;

        if (Array.isArray(result)) {
          const columns = result.length > 0 ? Object.keys(result[0]) : [];
          return NextResponse.json({
            success: true,
            columns,
            rows: result,
            rowCount: result.length,
            durationMs,
            isMutation: isMutationQuery,
            message: isMutationQuery
              ? `Requête exécutée avec succès en ${durationMs}ms.`
              : `${result.length} ligne(s) trouvée(s) en ${durationMs}ms.`
          });
        }

        return NextResponse.json({
          success: true,
          columns: [],
          rows: [],
          rowCount: 0,
          durationMs,
          isMutation: isMutationQuery,
          message: `Opération SQL effectuée avec succès en ${durationMs}ms.`
        });
      } catch (sqlErr: any) {
        return NextResponse.json({
          success: false,
          error: sqlErr?.message || 'Erreur lors de l\'exécution SQL sur PostgreSQL.'
        }, { status: 400 });
      }
    }

    return NextResponse.json({ success: false, error: 'Action non reconnue.' }, { status: 400 });
  } catch (err: any) {
    console.error('Error in AI Copilot endpoint:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Erreur serveur.' }, { status: 500 });
  }
}
