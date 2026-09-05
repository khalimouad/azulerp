import { NextRequest, NextResponse } from 'next/server';
import { getNeonSql, getNeonDatabaseUrl } from '@/lib/neon-postgres';
import { readSession, unauthorizedResponse } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CURRENT_YEAR = '2026';

const DB_SCHEMA_SYSTEM_PROMPT = `Tu es l'Assistant IA Intelligent officiel de Verde Orto (ERP Agroalimentaire & Restaurant à Marrakech, Maroc), propulsé par Gemini.

Tu es capable de répondre à TOUTE question sur l'activité, les finances, les clients, les fournisseurs, les stocks, la facturation et les livraisons, ainsi que d'exécuter des modifications de données à la demande.

### RÈGLES CRITIQUES DE PERFORMANCE & BASE DE DONNÉES :
1. **ANNÉE EN COURS PAR DÉFAUT (${CURRENT_YEAR}) :**
   - Sauf si l'utilisateur demande explicitement "tout l'historique", "toutes les années", "depuis le début", ou une autre année spécifique, TOUTES les requêtes temporelles doivent être restreintes à l'année en cours (${CURRENT_YEAR}) (ex: \`WHERE date LIKE '${CURRENT_YEAR}%'\` ou \`WHERE date >= '${CURRENT_YEAR}-01-01'\`).
2. **OPTIMISATION & BASSE CONSOMMATION BDD :**
   - Évite les \`SELECT *\` massifs. Sélectionne uniquement les colonnes nécessaires.
   - Utilise toujours \`LIMIT 20\` ou \`LIMIT 50\` pour les listes.
   - Privilégie les agrégations SQL (\`COUNT(*)\`, \`SUM(total_ttc)\`, \`SUM(reste_a_payer)\`, \`AVG(prix_ht)\`, \`GROUP BY\`) pour que la BDD calcule rapidement sans transférer des milliers de lignes.
3. **TON & EXPÉRIENCE CONVERSATIONNELLE :**
   - Sois chaleureux, clair, précis et professionnel (style Google Gemini).
   - Explique toujours ta réponse en français courant.
   - Si une requête SQL est nécessaire, fournis-la dans un bloc \`\`\`sql ... \`\`\`.
   - Si c'est une question générale, analytique, de conseil ou d'explication métier, réponds directement et intelligemment en calculant ou en résumant les données.
4. **ANALYSE D'IMAGES :**
   - Si l'utilisateur joint une image (facture, bon de livraison, ticket de caisse, note manuscrite, tableau), lis minutieusement tous les éléments (produits, quantités, prix unitaires, TVA, totaux, date, client/fournisseur) et propose l'action appropriée.

### SCHÉMA POSTGRESQL VERDE ORTO :
- \`clients\` (id, code, nom, interlocuteur, adresse, ville, telephone, ice, solde, total_facture, total_regle)
- \`produits\` (id, code, libelle, unite, prix_ht, taux_tva, prix_achat_ht, stock_actuel, stock_min, stock_virtuel, actif)
- \`bons_livraison\` (id, numero, date, client_id, client_nom, client_ice, total_ht, tva_20, tva_10, total_tva, total_ttc, statut ['En attente','Facturé'], etat ['Brouillon','Validé','Annulé'], facture_id, facture_numero)
- \`bons_livraison_lignes\` (id, bon_livraison_id, produit_id, designation, unite, quantite, prix_ht, taux_tva, remise_pct, total_ht, total_tva, total_ttc)
- \`bons_retour\` & \`bons_retour_lignes\` (id, numero, date, client_id, client_nom, total_ht, total_ttc, statut, etat, facture_id, motif)
- \`factures\` (id, numero, date, client_id, client_nom, client_ice, total_ht, tva_20, tva_10, total_tva, total_ttc, montant_regle, reste_a_payer, statut_paiement ['Impayé','Partiel','Soldé'], etat ['Brouillon','Validé','Annulé'], mode_reglement, bl_associes, br_associes)
- \`factures_lignes\` (id, facture_id, produit_id, designation, unite, quantite, prix_ht, taux_tva, remise_pct, total_ht, total_tva, total_ttc)
- \`reglements\` (id, numero, date, client_id, client_nom, facture_id, facture_numero, montant, mode_paiement, reference_paiement, statut_cheque)
- \`fournisseurs\` & \`factures_fournisseurs\` & \`paiements_fournisseurs\`
- \`stock_mouvements\` & \`devis\` & \`company_info\` & \`pos_ventes\`
`;

export async function POST(req: NextRequest) {
  try {
    const session = readSession(req);
    if (!session) return unauthorizedResponse();

    const body = await req.json();
    const { action, prompt, conversationHistory = [], images = [], apiKey: clientApiKey, model = 'gemini-3.8-flash', query, isMutation } = body;

    // Action 1: CHAT with Gemini AI (Text + Multimodal Vision)
    if (action === 'chat') {
      const apiKey = clientApiKey || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey || !apiKey.trim()) {
        return NextResponse.json({
          success: false,
          error: 'Clé API Gemini manquante. Veuillez saisir votre clé API Google Gemini dans les paramètres de l\'assistant ou configurer GEMINI_API_KEY.'
        }, { status: 400 });
      }

      if ((!prompt || typeof prompt !== 'string' || !prompt.trim()) && (!Array.isArray(images) || images.length === 0)) {
        return NextResponse.json({ success: false, error: 'Veuillez poser une question ou joindre un document.' }, { status: 400 });
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

      // Build user parts (Text + Attached Images)
      const userParts: any[] = [];
      if (prompt && prompt.trim()) {
        userParts.push({ text: prompt.trim() });
      } else {
        userParts.push({ text: "Analyse ce document/image joint et donne-moi une vue d'ensemble des données extraites." });
      }

      if (Array.isArray(images) && images.length > 0) {
        for (const img of images) {
          if (img && img.data) {
            const rawBase64 = String(img.data);
            const base64Clean = rawBase64.includes(',') ? rawBase64.split(',')[1] : rawBase64;
            const mimeType = img.mimeType || 'image/jpeg';
            userParts.push({
              inlineData: {
                mimeType,
                data: base64Clean
              }
            });
          }
        }
      }

      contents.push({
        role: 'user',
        parts: userParts
      });

      const requestedModel = (model && typeof model === 'string' && model.trim()) ? model.trim() : 'gemini-3.8-flash';
      const fallbackModels = Array.from(new Set([
        requestedModel,
        'gemini-3.8-flash',
        'gemini-3.8-pro',
        'gemini-3.8',
        'gemini-3.6-flash',
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-1.5-pro'
      ]));

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
              ? `Opération effectuée avec succès (${durationMs}ms).`
              : `${result.length} résultat(s) trouvé(s) (${durationMs}ms).`
          });
        }

        return NextResponse.json({
          success: true,
          columns: [],
          rows: [],
          rowCount: 0,
          durationMs,
          isMutation: isMutationQuery,
          message: `Requête exécutée avec succès (${durationMs}ms).`
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
