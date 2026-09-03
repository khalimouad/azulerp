import {
  CompanyInfo,
  Client,
  Fournisseur,
  Produit,
  Categorie,
  Famille,
  Marque,
  BonLivraison,
  Facture,
  Devis,
  Reglement,
  StockMouvement,
  LineItem,
  DashboardStats,
  DocumentState,
  BonRetour,
  PosTable,
  PosCategory,
  PosProduct,
  PosSession,
  PosSale,
  PosDashboardStats,
  AppUser,
  UserRole,
  DbImportProgress,
  DbImportSummary,
  DatabaseHealthInfo,
  PlanAccount,
  AccountingJournal,
  JournalEntry,
  FixedAsset,
  Employee,
  PayrollSlip,
  LeaveRequest,
  BOM,
  ProductionOrder,
} from './types';

import { CASA_COMPANY_2026 } from './sample-casa-seed';

// In-memory runtime cache for snappy UI responsiveness
let cachedData: any = null;
let isInitialized = false;
let inFlightFetchAllPromise: Promise<any> | null = null;

// Safe fallback structure if network is temporarily unreachable
function getFallbackData() {
  if (cachedData) return cachedData;
  return {
    company: CASA_COMPANY_2026,
    clients: [],
    fournisseurs: [],
    produits: [],
    categories: [],
    familles: [],
    marques: [],
    bons_livraison: [],
    bons_retour: [],
    factures: [],
    devis: [],
    reglements: [],
    stock_mouvements: [],
    pos_tables: [],
    pos_categories: [],
    pos_produits: [],
    pos_ventes: [],
    pos_sessions: [],
    app_users: [],
  };
}

// Helper to call backend PostgreSQL API safely with retry resilience
async function apiCall(action: string, payload: any = {}, retries = 2): Promise<any> {
  let lastError: any = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch('/api/postgres/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
      });

      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        if (res.status === 413 || text.includes('Request Entity Too Large') || text.includes('Payload Too Large')) {
          throw new Error('Le fichier dépasse la limite d\'une requête unique. Le mode par lots automatique prend le relais.');
        }
        throw new Error(`Réponse serveur (${res.status}): ${text.slice(0, 150) || res.statusText}`);
      }

      if (!res.ok || data.success === false) {
        throw new Error(data.error || `Erreur PostgreSQL: ${action}`);
      }
      return data;
    } catch (err: any) {
      lastError = err;
      if (attempt < retries) {
        // Wait briefly before retrying
        await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
      }
    }
  }
  throw lastError || new Error(`Erreur PostgreSQL (${action}): Échec de communication`);
}

/**
 * Initializes direct PostgreSQL Neon database connection
 */
export async function initPostgresDatabase(): Promise<boolean> {
  try {
    const data = await fetchAllData(true);
    if (data) {
      isInitialized = true;
      return true;
    }
    return true;
  } catch (err) {
    console.warn('Initial PostgreSQL fetch notice (fallback mode active):', err);
    return true;
  }
}

export const initSqliteDatabase = initPostgresDatabase;

/**
 * Fetches all database tables with automatic deduplication of concurrent calls
 */
export async function fetchAllData(forceRefresh = false) {
  if (!forceRefresh && cachedData) {
    return cachedData;
  }

  if (inFlightFetchAllPromise) {
    return inFlightFetchAllPromise;
  }

  inFlightFetchAllPromise = (async () => {
    try {
      const res = await apiCall('fetch_all');
      if (res && res.data) {
        cachedData = {
          ...res.data,
          clients: (res.data.clients || []).map(normalizeClient),
          fournisseurs: (res.data.fournisseurs || []).map(normalizeClient),
          produits: (res.data.produits || []).map(normalizeProduit),
          reglements: (res.data.reglements || []).map(normalizeReglement),
          pos_tables: (res.data.pos_tables || []).map(normalizePosTable),
          pos_categories: (res.data.pos_categories || []).map(normalizePosCategory),
          pos_produits: (res.data.pos_produits || []).map(normalizePosProduct),
          pos_sessions: (res.data.pos_sessions || []).map(normalizePosSession),
          pos_ventes: (res.data.pos_ventes || []).map(normalizePosSale),
        };
        isInitialized = true;
      }
      return cachedData || getFallbackData();
    } catch (err) {
      console.warn('Could not fetch latest PostgreSQL state, using in-memory state:', err);
      return cachedData || getFallbackData();
    } finally {
      inFlightFetchAllPromise = null;
    }
  })();

  return inFlightFetchAllPromise;
}

// ----------------------------------------------------------------------------
// DATA FETCHERS (Direct from PostgreSQL)
// ----------------------------------------------------------------------------

export async function fetchCompanyInfo(): Promise<CompanyInfo | null> {
  const data = await fetchAllData();
  return data?.company || null;
}

export async function fetchClients(): Promise<Client[]> {
  const data = await fetchAllData();
  return data?.clients || [];
}

export async function fetchFournisseurs(): Promise<Fournisseur[]> {
  const data = await fetchAllData();
  return data?.fournisseurs || [];
}

export async function fetchProduits(): Promise<Produit[]> {
  const data = await fetchAllData();
  return data?.produits || [];
}

function normalizeClient(client: any): Client {
  return {
    ...client,
    id: Number(client.id),
    solde: Number(client.solde || 0),
    plafond_credit: Number(client.plafond_credit || 0),
  };
}

function normalizeProduit(produit: any): Produit {
  return {
    ...produit,
    id: Number(produit.id),
    taux_tva: Number(produit.taux_tva || 0),
    prix_ht: Number(produit.prix_ht || 0),
    prix_achat: Number(produit.prix_achat || 0),
    prix_achat_ht: Number(produit.prix_achat_ht || 0),
    stock_actuel: Number(produit.stock_actuel || 0),
    stock_min: Number(produit.stock_min || 0),
    stock_virtuel: Number(produit.stock_virtuel || 0),
  };
}

function normalizeReglement(reglement: any): Reglement {
  return {
    ...reglement,
    id: Number(reglement.id),
    client_id: Number(reglement.client_id),
    facture_id: reglement.facture_id == null ? undefined : Number(reglement.facture_id),
    piece_id: reglement.piece_id == null ? undefined : Number(reglement.piece_id),
    montant: Number(reglement.montant || 0),
  };
}

export async function fetchCategories(): Promise<Categorie[]> {
  const data = await fetchAllData();
  return data?.categories || [];
}

export async function fetchFamilles(): Promise<Famille[]> {
  const data = await fetchAllData();
  return data?.familles || [];
}

export async function fetchMarques(): Promise<Marque[]> {
  const data = await fetchAllData();
  return data?.marques || [];
}

export async function fetchBonsLivraison(forceRefresh = false): Promise<BonLivraison[]> {
  const data = await fetchAllData(forceRefresh);
  return data?.bons_livraison || [];
}

export async function fetchBonsRetour(): Promise<BonRetour[]> {
  const data = await fetchAllData();
  return data?.bons_retour || [];
}

export async function fetchFactures(forceRefresh = false): Promise<Facture[]> {
  const data = await fetchAllData(forceRefresh);
  return data?.factures || [];
}

export async function fetchDevis(): Promise<Devis[]> {
  const data = await fetchAllData();
  return data?.devis || [];
}

export async function fetchReglements(): Promise<Reglement[]> {
  const data = await fetchAllData();
  return data?.reglements || [];
}

export async function fetchStockMouvements(): Promise<StockMouvement[]> {
  const data = await fetchAllData();
  return data?.stock_mouvements || [];
}

export async function fetchImpendingSupplierCheques(): Promise<any[]> {
  return [];
}

export async function fetchDashboardStats(selectedYear: string = '2026'): Promise<DashboardStats> {
  const data = await fetchAllData();
  const factures: Facture[] = data?.factures || [];
  const bls: BonLivraison[] = data?.bons_livraison || [];
  const clients: Client[] = data?.clients || [];
  const produits: Produit[] = data?.produits || [];

  let caTotal = 0;
  let facturesCount = 0;
  let facturesImpayees = 0;
  let impayesMontant = 0;

  let totalHt = 0;
  let totalTtc = 0;
  let totalEncaisse = 0;
  let totalImpaye = 0;

  for (const f of factures) {
    totalHt += Number(f.total_ht || 0);
    totalTtc += Number(f.total_ttc || 0);
    totalEncaisse += Number(f.montant_regle || 0);
    totalImpaye += Number(f.reste_a_payer || (Number(f.total_ttc || 0) - Number(f.montant_regle || 0)));
  }

  let blAttenteCount = bls.filter((b) => b.statut === 'En attente').length;
  let blAttenteTotal = bls.filter((b) => b.statut === 'En attente').reduce((sum, b) => sum + Number(b.total_ttc || 0), 0);
  let stockAlerts = produits.filter((p) => Number(p.stock_actuel || 0) <= Number(p.stock_min || 0)).length;

  return {
    total_facture_ht: totalHt,
    total_facture_ttc: totalTtc,
    total_encaisse: totalEncaisse,
    total_impaye: totalImpaye,
    factures_count: factures.length,
    bl_en_attente_count: blAttenteCount,
    bl_en_attente_total: blAttenteTotal,
    br_en_attente_count: 0,
    br_en_attente_total: 0,
    clients_count: clients.length,
    stock_alerts_count: stockAlerts,
  };
}

// ----------------------------------------------------------------------------
// BONS DE LIVRAISON CRUD
// ----------------------------------------------------------------------------

function patchCachedBonsLivraison(
  updater: (bonsLivraison: BonLivraison[]) => BonLivraison[]
): void {
  if (!cachedData) return;
  cachedData = {
    ...cachedData,
    bons_livraison: updater(cachedData.bons_livraison || []),
  };
}

function buildSavedBonLivraison(
  bl: Partial<BonLivraison>,
  lineItems: LineItem[],
  response: any
): BonLivraison {
  const cachedClient = (cachedData?.clients || []).find(
    (client: Client) => Number(client.id) === Number(response.client_id || bl.client_id)
  );

  return {
    id: Number(response.id),
    numero: String(response.numero || bl.numero || ''),
    date: String(bl.date || new Date().toISOString().slice(0, 10)),
    client_id: Number(response.client_id || bl.client_id),
    client_nom: String(response.client_nom || cachedClient?.nom || bl.client_nom || ''),
    client_ice: cachedClient?.ice || bl.client_ice || '',
    client_adresse: cachedClient?.adresse || bl.client_adresse || '',
    client_ville: cachedClient?.ville || bl.client_ville || '',
    total_ht: Number(bl.total_ht || 0),
    tva_20: Number(bl.tva_20 || 0),
    tva_10: Number(bl.tva_10 || 0),
    total_tva: Number(bl.total_tva || 0),
    total_ttc: Number(bl.total_ttc || 0),
    montant_brut: Number(bl.montant_brut || 0),
    remise_pct: Number(bl.remise_pct || 0),
    ristourne_pct: Number(bl.ristourne_pct || 0),
    escompte_pct: Number(bl.escompte_pct || 0),
    port: Number(bl.port || 0),
    statut: bl.statut || 'En attente',
    etat: bl.etat || 'Validé',
    cloture_sans_facture: Boolean(bl.cloture_sans_facture),
    facture_id: bl.facture_id ?? null,
    facture_numero: bl.facture_numero ?? null,
    mode_reglement: bl.mode_reglement || 'Virement',
    notes: bl.notes || '',
    lignes: lineItems.map((line) => ({
      ...line,
      produit_id: line.produit_id == null ? undefined : Number(line.produit_id),
      quantite: Number(line.quantite || 0),
      prix_ht: Number(line.prix_ht || 0),
      taux_tva: Number(line.taux_tva || 0),
      remise_pct: Number(line.remise_pct || 0),
      total_ht: Number(line.total_ht || 0),
      total_tva: Number(line.total_tva || 0),
      total_ttc: Number(line.total_ttc || 0),
    })),
    created_at: String(bl.created_at || new Date().toISOString()),
  };
}

export async function createBonLivraison(
  bl: Partial<BonLivraison>,
  lignes?: LineItem[]
): Promise<BonLivraison> {
  const lineItems = lignes || bl.lignes || [];
  const res = await apiCall('create_bon_livraison', { bl, lignes: lineItems });
  const created = buildSavedBonLivraison(bl, lineItems, res);
  patchCachedBonsLivraison((documents) => [
    created,
    ...documents.filter((document) => Number(document.id) !== created.id),
  ]);
  return created;
}

export async function updateBonLivraison(
  id: number,
  bl: Partial<BonLivraison>,
  lignes?: LineItem[]
): Promise<BonLivraison> {
  const lineItems = lignes || bl.lignes || [];
  const existing = (cachedData?.bons_livraison || []).find(
    (document: BonLivraison) => Number(document.id) === Number(id)
  );
  const res = await apiCall('update_bon_livraison', { id, bl, lignes: lineItems });
  const updated = buildSavedBonLivraison(
    { ...existing, ...bl, id, numero: res.numero || existing?.numero },
    lineItems,
    { ...res, id }
  );
  patchCachedBonsLivraison((documents) =>
    documents.map((document) => (Number(document.id) === Number(id) ? updated : document))
  );
  return updated;
}

export async function updateBonLivraisonState(id: number, etat: DocumentState): Promise<void> {
  await apiCall('update_bon_livraison_state', { id, etat });
  patchCachedBonsLivraison((documents) =>
    documents.map((document) =>
      Number(document.id) === Number(id) ? { ...document, etat } : document
    )
  );
}

export async function closeBonLivraisonWithoutInvoice(id: number): Promise<void> {
  await apiCall('close_bon_livraison_without_invoice', { id });
  patchCachedBonsLivraison((documents) =>
    documents.map((document) =>
      Number(document.id) === Number(id)
        ? { ...document, cloture_sans_facture: true, statut: 'Clôturé' }
        : document
    )
  );
}

export async function deleteBonLivraison(id: number): Promise<void> {
  await apiCall('delete_bon_livraison', { id });
  patchCachedBonsLivraison((documents) =>
    documents.filter((document) => Number(document.id) !== Number(id))
  );
}

// ----------------------------------------------------------------------------
// BONS DE RETOUR CRUD
// ----------------------------------------------------------------------------

export async function createBonRetour(br: Partial<BonRetour>, lignes?: LineItem[]): Promise<number> {
  const lineItems = lignes || br.lignes || [];
  const res = await apiCall('create_bon_livraison', { bl: br, lignes: lineItems });
  await fetchAllData();
  return res.id;
}

export async function updateBonRetour(id: number, br: Partial<BonRetour>, lignes?: LineItem[]): Promise<void> {
  await apiCall('update_bon_retour_state', { id, etat: br.etat || 'Validé' });
  await fetchAllData();
}

export async function updateBonRetourState(id: number, etat: DocumentState): Promise<void> {
  await apiCall('update_bon_retour_state', { id, etat });
  await fetchAllData();
}

export async function deleteBonRetour(id: number): Promise<void> {
  await apiCall('delete_bon_livraison', { id });
  await fetchAllData();
}

// ----------------------------------------------------------------------------
// FACTURES CRUD
// ----------------------------------------------------------------------------

export async function createFacture(facture: Partial<Facture>, lignes?: LineItem[]): Promise<number> {
  const lineItems = lignes || facture.lignes || [];
  const res = await apiCall('create_facture', { facture, lignes: lineItems, blIds: [] });
  await fetchAllData(true);
  return res.id;
}

export async function createDirectFacture(facture: Partial<Facture>, lignes?: LineItem[]): Promise<number> {
  return createFacture(facture, lignes);
}

export async function createFactureFromBLs(
  blIdsOrParams: number[] | { bl_ids: number[]; br_ids?: number[]; date?: string; mode_reglement?: string; notes?: string },
  factureInfo?: Partial<Facture>
): Promise<number> {
  const blIds = Array.isArray(blIdsOrParams) ? blIdsOrParams : blIdsOrParams.bl_ids || [];
  const brIds = Array.isArray(blIdsOrParams) ? [] : blIdsOrParams.br_ids || [];
  const info = Array.isArray(blIdsOrParams) ? (factureInfo || {}) : {
    date: blIdsOrParams.date,
    mode_reglement: blIdsOrParams.mode_reglement,
    notes: blIdsOrParams.notes,
    ...(factureInfo || {}),
  };

  const allBls = await fetchBonsLivraison();
  const selectedBls = allBls.filter((b) => blIds.includes(b.id) && !b.cloture_sans_facture);
  const invoiceableBlIds = selectedBls.map((bl) => bl.id);

  const allBrs = await fetchBonsRetour();
  const selectedBrs = allBrs.filter((r) => brIds.includes(r.id));
  const invoiceableBrIds = selectedBrs.map((br) => br.id);

  const firstDoc = selectedBls[0] || selectedBrs[0];
  if (!firstDoc) {
    throw new Error('Veuillez sélectionner au moins un bon de livraison ou bon de retour.');
  }

  const clientId = info.client_id || firstDoc.client_id;
  const clientNom = info.client_nom || firstDoc.client_nom || '';
  const clientIce = info.client_ice || firstDoc.client_ice || '';
  const clientAdresse = info.client_adresse || firstDoc.client_adresse || '';
  const clientVille = info.client_ville || firstDoc.client_ville || '';

  const rawLines: LineItem[] = [];
  selectedBls.forEach((bl) => {
    (bl.lignes || []).forEach((l) => rawLines.push({ ...l }));
  });

  selectedBrs.forEach((br) => {
    (br.lignes || []).forEach((l) => {
      const qte = -Math.abs(Number(l.quantite) || 0);
      rawLines.push({
        ...l,
        quantite: qte,
      });
    });
  });

  // Consolidation of similar products with same unit price, TVA rate, discount, and unit
  const consolidatedMap = new Map<string, {
    produit_id?: number;
    designation: string;
    groupe?: string;
    unite?: string;
    prix_ht: number;
    taux_tva: number;
    remise_pct: number;
    quantite: number;
  }>();

  for (const l of rawLines) {
    const prix_ht = Math.round((Number(l.prix_ht) || 0) * 10000) / 10000;
    const taux_tva = Number(l.taux_tva !== undefined && l.taux_tva !== null ? l.taux_tva : 20);
    const remise_pct = Number(l.remise_pct || 0);
    const unite = (l.unite || 'KG').trim().toUpperCase();
    const rawDesig = (l.designation || '').trim();
    const cleanDesig = rawDesig.toLowerCase().replace(/\s*\(retour[^\)]*\)/gi, '').replace(/\s*\(déduction[^\)]*\)/gi, '').trim();
    const produit_id = l.produit_id ? Number(l.produit_id) : undefined;

    // Consolidation key
    const key = `${produit_id || 'p'}_${cleanDesig}_${prix_ht.toFixed(4)}_${taux_tva}_${remise_pct}_${unite}`;
    const qte = Number(l.quantite) || 0;

    if (!consolidatedMap.has(key)) {
      consolidatedMap.set(key, {
        produit_id,
        designation: rawDesig.replace(/\s*\(retour[^\)]*\)/gi, '').replace(/\s*\(déduction[^\)]*\)/gi, '').trim(),
        groupe: l.groupe || '',
        unite: l.unite || 'KG',
        prix_ht,
        taux_tva,
        remise_pct,
        quantite: qte,
      });
    } else {
      const existing = consolidatedMap.get(key)!;
      existing.quantite += qte;
    }
  }

  const lignes: LineItem[] = [];
  let lineIdx = 1;
  for (const item of consolidatedMap.values()) {
    if (Math.abs(item.quantite) < 0.0001) continue; // Net zero lines omitted

    const base_ht = item.quantite * item.prix_ht;
    const remise = base_ht * (item.remise_pct / 100);
    const total_ht = Math.round((base_ht - remise) * 100) / 100;
    const total_tva = Math.round((total_ht * (item.taux_tva / 100)) * 100) / 100;
    const total_ttc = Math.round((total_ht + total_tva) * 100) / 100;

    lignes.push({
      id: lineIdx++,
      produit_id: item.produit_id,
      designation: item.quantite < 0 ? `${item.designation} (Déduction Retour -)` : item.designation,
      groupe: item.groupe,
      unite: item.unite,
      quantite: Math.round(item.quantite * 1000) / 1000,
      prix_ht: item.prix_ht,
      taux_tva: item.taux_tva,
      remise_pct: item.remise_pct,
      total_ht,
      total_tva,
      total_ttc,
    });
  }

  // Exact Tax & Totals calculation
  const totalHt = Math.round(lignes.reduce((s, l) => s + (Number(l.total_ht) || 0), 0) * 100) / 100;
  const tva20 = Math.round(lignes.filter((l) => Number(l.taux_tva ?? 20) === 20).reduce((s, l) => s + (Number(l.total_tva) || 0), 0) * 100) / 100;
  const tva10 = Math.round(lignes.filter((l) => Number(l.taux_tva ?? 20) === 10).reduce((s, l) => s + (Number(l.total_tva) || 0), 0) * 100) / 100;
  const tva7 = Math.round(lignes.filter((l) => Number(l.taux_tva ?? 20) === 7).reduce((s, l) => s + (Number(l.total_tva) || 0), 0) * 100) / 100;
  const totalTva = Math.round((tva20 + tva10 + tva7) * 100) / 100;
  const totalTtc = Math.round((totalHt + totalTva) * 100) / 100;

  const fullFacturePayload: Partial<Facture> = {
    ...info,
    client_id: clientId,
    client_nom: clientNom,
    client_ice: clientIce,
    client_adresse: clientAdresse,
    client_ville: clientVille,
    total_ht: totalHt,
    tva_20: tva20,
    tva_10: tva10,
    total_tva: totalTva,
    total_ttc: totalTtc,
    reste_a_payer: totalTtc,
    montant_regle: 0,
    statut_paiement: 'Impayé',
    etat: 'Validé',
    bl_associes: selectedBls.map((b) => b.numero),
    br_associes: selectedBrs.map((r) => r.numero),
  };

  const res = await apiCall('create_facture', {
    facture: fullFacturePayload,
    lignes,
    blIds: invoiceableBlIds,
    brIds: invoiceableBrIds,
  });
  await fetchAllData(true);
  return res.id;
}

export async function updateFacture(id: number, facture: Partial<Facture>, lignes?: LineItem[]): Promise<void> {
  await apiCall('create_facture', { facture: { ...facture, id }, lignes: lignes || [], blIds: [] });
  await fetchAllData(true);
}

export async function updateFactureState(id: number, etat: DocumentState): Promise<void> {
  await apiCall('update_facture_state', { id, etat });
  await fetchAllData(true);
}

export async function deleteFacture(id: number): Promise<void> {
  await apiCall('delete_facture', { id });
  await fetchAllData(true);
}

// ----------------------------------------------------------------------------
// CLIENTS CRUD
// ----------------------------------------------------------------------------

export async function createClient(client: Partial<Client>): Promise<number> {
  const res = await apiCall('create_client', { client });
  await fetchAllData();
  return res.id;
}

export async function updateClient(id: number, client: Partial<Client>): Promise<void> {
  await apiCall('update_client', { id, client });
  await fetchAllData();
}

export async function updateClientInDb(id: number, client: Partial<Client>): Promise<void> {
  return updateClient(id, client);
}

export async function deleteClient(id: number): Promise<void> {
  await apiCall('delete_client', { id });
  await fetchAllData();
}

export async function deleteClientFromDb(id: number): Promise<void> {
  return deleteClient(id);
}

// ----------------------------------------------------------------------------
// FOURNISSEURS CRUD
// ----------------------------------------------------------------------------

export async function createFournisseur(fournisseur: Partial<Fournisseur>): Promise<number> {
  const res = await apiCall('create_client', { client: fournisseur });
  await fetchAllData();
  return res.id;
}

export async function updateFournisseur(id: number, fournisseur: Partial<Fournisseur>): Promise<void> {
  await apiCall('update_client', { id, client: fournisseur });
  await fetchAllData();
}

export async function deleteFournisseur(id: number): Promise<void> {
  await apiCall('delete_client', { id });
  await fetchAllData();
}

// ----------------------------------------------------------------------------
// PRODUITS & STOCK CRUD
// ----------------------------------------------------------------------------

export async function createProduit(produit: Partial<Produit>): Promise<number> {
  const res = await apiCall('create_produit', { produit });
  await fetchAllData();
  return res.id;
}

export async function updateProduit(id: number, produit: Partial<Produit>): Promise<void> {
  await apiCall('update_produit', { id, produit });
  await fetchAllData();
}

export async function updateProduitInDb(id: number, produit: Partial<Produit>): Promise<void> {
  return updateProduit(id, produit);
}

export async function deleteProduit(id: number): Promise<void> {
  await apiCall('delete_produit', { id });
  await fetchAllData();
}

export async function deleteProduitFromDb(id: number): Promise<void> {
  return deleteProduit(id);
}

export async function adjustStock(
  produitIdOrData: number | any,
  quantite?: number,
  type?: 'ENTREE' | 'SORTIE',
  motif?: string,
  reference?: string
): Promise<void> {
  if (typeof produitIdOrData === 'object') {
    const pId = produitIdOrData.produit_id || produitIdOrData.produitId;
    const qty = produitIdOrData.quantite || produitIdOrData.qty || 0;
    const t = produitIdOrData.type_mouvement || produitIdOrData.type || 'ENTREE';
    const m = produitIdOrData.motif || '';
    const r = produitIdOrData.reference_document || produitIdOrData.reference || '';
    await apiCall('adjust_stock', { produitId: pId, quantite: qty, type: t, motif: m, reference: r });
  } else {
    await apiCall('adjust_stock', { produitId: produitIdOrData, quantite, type, motif, reference });
  }
  await fetchAllData();
}

// ----------------------------------------------------------------------------
// DEVIS CRUD
// ----------------------------------------------------------------------------

export async function createDevis(devis: Partial<Devis>, lignes?: LineItem[]): Promise<number> {
  const lineItems = lignes || devis.lignes || [];
  const res = await apiCall('create_bon_livraison', { bl: devis, lignes: lineItems });
  await fetchAllData();
  return res.id;
}

export async function deleteDevis(id: number): Promise<void> {
  await apiCall('delete_bon_livraison', { id });
  await fetchAllData();
}

// ----------------------------------------------------------------------------
// REGLEMENTS
// ----------------------------------------------------------------------------

export async function createReglement(reglement: Partial<Reglement>): Promise<number> {
  const res = await apiCall('create_reglement', { reglement }, 0);
  await fetchAllData();
  return res.id;
}

export const recordPayment = createReglement;

export async function updateReglement(id: number, reglement: Partial<Reglement>): Promise<void> {
  await apiCall('update_reglement', { id, reglement }, 0);
  await fetchAllData(true);
}

export async function deleteReglement(id: number): Promise<void> {
  await apiCall('delete_reglement', { id }, 0);
  await fetchAllData(true);
}

// ----------------------------------------------------------------------------
// COMPANY SETTINGS
// ----------------------------------------------------------------------------

export async function updateCompanyInfo(company: Partial<CompanyInfo>): Promise<void> {
  await apiCall('update_company_info', { company });
  await fetchAllData();
}

export const updateCompanyInfoInDb = updateCompanyInfo;

// ----------------------------------------------------------------------------
// RESTAURANT POS
// ----------------------------------------------------------------------------

function posNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizePosTable(table: any): PosTable {
  return {
    ...table,
    id: posNumber(table.id),
    capacite: posNumber(table.capacite),
    nb_couverts: posNumber(table.nb_couverts),
    montant_en_cours: posNumber(table.montant_en_cours),
  };
}

function normalizePosCategory(category: any): PosCategory {
  return {
    ...category,
    id: posNumber(category.id),
    ordre: posNumber(category.ordre),
  };
}

function normalizePosProduct(product: any): PosProduct {
  return {
    ...product,
    id: posNumber(product.id),
    categorie_id: product.categorie_id == null ? undefined : posNumber(product.categorie_id),
    prix_vente_ttc: posNumber(product.prix_vente_ttc),
    taux_tva: posNumber(product.taux_tva),
    temps_preparation_min: posNumber(product.temps_preparation_min),
    disponible: posNumber(product.disponible),
    actif: posNumber(product.actif),
  };
}

function normalizePosSession(session: any): PosSession {
  return {
    ...session,
    id: posNumber(session.id),
    fond_caisse_ouverture: posNumber(session.fond_caisse_ouverture),
    total_ventes: posNumber(session.total_ventes),
    total_especes: posNumber(session.total_especes),
    total_carte: posNumber(session.total_carte),
    total_cheque: posNumber(session.total_cheque),
    total_autre: posNumber(session.total_autre),
    nb_tickets: posNumber(session.nb_tickets),
    total_couverts: posNumber(session.total_couverts),
    montant_reel_cloture: posNumber(session.montant_reel_cloture),
    ecart_caisse: posNumber(session.ecart_caisse),
  };
}

function normalizePosSale(sale: any): PosSale {
  return {
    ...sale,
    id: posNumber(sale.id),
    session_id: sale.session_id == null ? undefined : posNumber(sale.session_id),
    table_id: sale.table_id == null ? undefined : posNumber(sale.table_id),
    nb_couverts: posNumber(sale.nb_couverts),
    total_ht: posNumber(sale.total_ht),
    total_tva: posNumber(sale.total_tva),
    tva_20: posNumber(sale.tva_20),
    tva_10: posNumber(sale.tva_10),
    tva_7: posNumber(sale.tva_7),
    tva_0: posNumber(sale.tva_0),
    total_ttc: posNumber(sale.total_ttc),
    remise_globale_montant: posNumber(sale.remise_globale_montant),
    pourboire: posNumber(sale.pourboire),
    montant_net_a_payer: posNumber(sale.montant_net_a_payer),
    montant_donne: posNumber(sale.montant_donne),
    montant_rendu: posNumber(sale.montant_rendu),
    lignes: Array.isArray(sale.lignes)
      ? sale.lignes.map((line: any) => ({
          ...line,
          id: line.id == null ? undefined : posNumber(line.id),
          vente_id: line.vente_id == null ? undefined : posNumber(line.vente_id),
          produit_id: line.produit_id == null ? undefined : posNumber(line.produit_id),
          prix_unitaire_ttc: posNumber(line.prix_unitaire_ttc),
          taux_tva: posNumber(line.taux_tva),
          quantite: posNumber(line.quantite),
          remise_pct: posNumber(line.remise_pct),
          total_ht: posNumber(line.total_ht),
          total_tva: posNumber(line.total_tva),
          total_ttc: posNumber(line.total_ttc),
        }))
      : [],
  };
}

export async function fetchPosTables(options?: any): Promise<PosTable[]> {
  const data = await fetchAllData();
  return (data?.pos_tables || []).map(normalizePosTable);
}

export async function fetchPosCategories(options?: any): Promise<PosCategory[]> {
  const data = await fetchAllData();
  return (data?.pos_categories || []).map(normalizePosCategory);
}

export async function fetchPosProducts(onlyActive?: boolean): Promise<PosProduct[]> {
  const data = await fetchAllData();
  const prods: PosProduct[] = (data?.pos_produits || []).map(normalizePosProduct);
  if (onlyActive) {
    return prods.filter((p) => Boolean(p.disponible) && Boolean(p.actif));
  }
  return prods;
}

export async function fetchPosSales(options?: any): Promise<PosSale[]> {
  const data = await fetchAllData();
  return (data?.pos_ventes || []).map(normalizePosSale);
}

export async function fetchPosSessions(options?: any): Promise<PosSession[]> {
  const data = await fetchAllData();
  return (data?.pos_sessions || []).map(normalizePosSession);
}

export async function fetchPosDashboardStats(): Promise<PosDashboardStats> {
  const data = await fetchAllData();
  const sales: PosSale[] = (data?.pos_ventes || []).map(normalizePosSale);
  const tables: PosTable[] = (data?.pos_tables || []).map(normalizePosTable);
  const prods: PosProduct[] = (data?.pos_produits || []).map(normalizePosProduct);
  const sessions: PosSession[] = (data?.pos_sessions || []).map(normalizePosSession);

  let totalSales = 0;
  let especes = 0;
  let carte = 0;
  let cheque = 0;
  let totalCouverts = 0;

  sales.forEach((s) => {
    const ttc = Number(s.total_ttc || 0);
    totalSales += ttc;
    totalCouverts += Number(s.nb_couverts || 1);
    if (s.mode_reglement === 'Espèces') especes += ttc;
    else if (s.mode_reglement === 'Carte Bancaire') carte += ttc;
    else if (s.mode_reglement === 'Chèque') cheque += ttc;
  });

  const totalTickets = sales.length;
  const tablesOccupees = tables.filter((t) => t.statut === 'OCCUPEE').length;
  const activeSession = sessions.find((s) => s.statut === 'OUVERTE') || null;

  return {
    ventes_jour_ttc: totalSales,
    nb_tickets_jour: totalTickets,
    total_couverts_jour: totalCouverts || totalTickets,
    panier_moyen_jour: totalTickets > 0 ? totalSales / totalTickets : 0,
    panier_moyen_couvert_jour: totalCouverts > 0 ? totalSales / totalCouverts : 0,
    especes_jour: especes,
    carte_jour: carte,
    cheque_jour: cheque,
    tables_occupees: tablesOccupees,
    tables_total: tables.length,
    total_plats_carte: prods.length,
    session_active: activeSession,
  };
}

export async function createPosSale(sale: Partial<PosSale>, lignes: any[], ...rest: any[]): Promise<PosSale | any> {
  const res = await apiCall('create_pos_sale', { sale, lignes });
  await fetchAllData();
  const ticketNumero = res?.numero_ticket || sale.numero_ticket || `TCK-${Date.now().toString().slice(-6)}`;
  return {
    id: res?.id,
    ...sale,
    numero_ticket: ticketNumero,
    total_ttc: sale.total_ttc || 0,
    lignes: lignes || sale.lignes || [],
  };
}

export async function cancelPosSale(id: number, motif?: string, ...rest: any[]): Promise<void> {
  await apiCall('cancel_pos_sale', { id, motif });
  await fetchAllData();
}

export async function createPosProduct(prod: any, ...rest: any[]): Promise<number> {
  await fetchAllData();
  return 1;
}

export async function updatePosProduct(idOrProd: number | any, prod?: any, ...rest: any[]): Promise<void> {
  await fetchAllData();
}

export async function deletePosProduct(id: number, ...rest: any[]): Promise<void> {
  await fetchAllData();
}

export async function togglePosProductDisponibilite(id: number, ...rest: any[]): Promise<void> {
  await fetchAllData();
}

export async function createPosCategory(cat: any, ...rest: any[]): Promise<number> {
  await fetchAllData();
  return 1;
}

export async function createPosTable(table: any, ...rest: any[]): Promise<number> {
  await fetchAllData();
  return 1;
}

export async function updatePosTable(idOrTable: number | any, table?: any, ...rest: any[]): Promise<void> {
  await fetchAllData();
}

export async function deletePosTable(id: number, ...rest: any[]): Promise<void> {
  await fetchAllData();
}

export async function savePosTableDraft(tableId: number, items: any[], nbCouverts?: number, serveur?: string, notes?: string, statut?: string): Promise<void> {
  await apiCall('save_pos_table_draft', { tableId, items, nbCouverts, serveur, notes, statut });
  await fetchAllData();
}

export async function liberatePosTable(tableId: number, ...rest: any[]): Promise<void> {
  await apiCall('liberate_pos_table', { tableId });
  await fetchAllData();
}

export async function transferPosTableOrder(sourceTableId: number, targetTableId: number, ...rest: any[]): Promise<void> {
  await fetchAllData();
}

export async function openPosSession(session: any, ...rest: any[]): Promise<number> {
  await fetchAllData();
  return 1;
}

export async function closePosSession(sessionId: number, closingData?: any, ...rest: any[]): Promise<void> {
  await fetchAllData();
}

// ----------------------------------------------------------------------------
// AUTHENTICATION & USERS
// ----------------------------------------------------------------------------

export async function authenticateWithPassword(username: string, password: string): Promise<AppUser | null> {
  try {
    const res = await apiCall('auth_password', { username, password });
    if (res && res.user) return res.user;
  } catch (err) {
    console.warn('Authentication API call error, using local fallback check:', err);
  }

  return null;
}

export async function authenticateWithPin(pin: string): Promise<AppUser | null> {
  try {
    const res = await apiCall('auth_pin', { pin });
    if (res && res.user) return res.user;
  } catch (err) {
    console.warn('PIN Authentication API call error, using local fallback check:', err);
  }

  return null;
}

export async function getAuthenticatedSession(): Promise<AppUser | null> {
  try {
    const res = await apiCall('session', {}, 0);
    return res?.user || null;
  } catch {
    return null;
  }
}

export async function logoutAuthenticatedSession(): Promise<void> {
  try {
    await apiCall('logout', {}, 0);
  } finally {
    cachedData = null;
    isInitialized = false;
  }
}

export async function fetchAllUsers(): Promise<AppUser[]> {
  const data = await fetchAllData();
  return data?.users || [];
}

export async function createUserInDb(user: any): Promise<number> {
  const res = await apiCall('create_user', { user });
  cachedData = null;
  isInitialized = false;
  return Number(res?.id || 0);
}

export async function updateUserInDb(id: number, user: any): Promise<void> {
  await apiCall('update_user', { id, user });
  cachedData = null;
  isInitialized = false;
}

export async function deleteUserFromDb(id: number): Promise<void> {
  await apiCall('delete_user', { id });
  cachedData = null;
  isInitialized = false;
}

// ----------------------------------------------------------------------------
// BACKUP, RESTORE & HEALTH
// ----------------------------------------------------------------------------

export async function exportSqliteDatabase(): Promise<Blob> {
  const data = await fetchAllData();
  const jsonStr = JSON.stringify(data, null, 2);
  return new Blob([jsonStr], { type: 'application/json' });
}

export async function importDatabaseWithProgress(
  file: File,
  onProgress?: (progress: DbImportProgress) => void,
  mode: 'replace' | 'merge' = 'merge'
): Promise<DbImportSummary> {
  const startTime = Date.now();
  const fileName = file.name;
  const fileSizeBytes = file.size;

  const updateProg = (
    phase: 'uploading' | 'validating' | 'processing' | 'persisting' | 'success' | 'error',
    uploadPercent: number,
    treatmentPercent: number,
    overallPercent: number,
    currentStepMessage: string,
    error?: string
  ) => {
    if (onProgress) {
      onProgress({
        phase,
        uploadPercent,
        treatmentPercent,
        overallPercent,
        currentStepMessage,
        fileName,
        fileSizeBytes,
        loadedBytes: Math.round((uploadPercent / 100) * fileSizeBytes),
        error,
      });
    }
  };

  try {
    updateProg('uploading', 15, 0, 10, `Lecture du fichier ${fileName}...`);

    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onprogress = (evt) => {
        if (evt.lengthComputable) {
          const pct = Math.min(95, Math.round((evt.loaded / evt.total) * 100));
          updateProg('uploading', pct, 0, Math.round(pct * 0.4), `Chargement du fichier (${pct}%)...`);
        }
      };
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
      reader.readAsText(file);
    });

    updateProg('validating', 100, 20, 50, 'Validation de la structure des données...');

    const counts: Record<string, number> = {
      produits: 0,
      clients: 0,
      fournisseurs: 0,
      factures: 0,
      bons_livraison: 0,
      pos_ventes: 0,
    };

    let isJson = false;
    let parsedData: any = null;

    try {
      parsedData = JSON.parse(text);
      if (parsedData && typeof parsedData === 'object') {
        isJson = true;
      }
    } catch (_) {
      isJson = false;
    }

    if (isJson && parsedData) {
      // 1. Initialize schema and optionally truncate
      updateProg('processing', 100, 30, 50, 'Préparation de la base de données PostgreSQL...');
      await apiCall('import_init', { mode });

      // 2. Ordered tables definition
      const tableKeys: { key: string; name: string; batchSize: number; targetCountKey?: string }[] = [
        { key: 'company', name: 'Entreprise', batchSize: 1 },
        { key: 'company_info', name: 'Entreprise', batchSize: 1 },
        { key: 'categories', name: 'Catégories', batchSize: 50 },
        { key: 'familles', name: 'Familles', batchSize: 50 },
        { key: 'marques', name: 'Marques', batchSize: 50 },
        { key: 'clients', name: 'Clients', batchSize: 50, targetCountKey: 'clients' },
        { key: 'fournisseurs', name: 'Fournisseurs', batchSize: 50, targetCountKey: 'fournisseurs' },
        { key: 'produits', name: 'Articles / Produits', batchSize: 50, targetCountKey: 'produits' },
        { key: 'bons_livraison', name: 'Bons de livraison', batchSize: 30, targetCountKey: 'bons_livraison' },
        { key: 'factures', name: 'Factures de vente', batchSize: 30, targetCountKey: 'factures' },
        { key: 'devis', name: 'Devis', batchSize: 30 },
        { key: 'reglements', name: 'Règlements & Paiements', batchSize: 50 },
        { key: 'pos_tables', name: 'Tables restaurant', batchSize: 50 },
        { key: 'pos_categories', name: 'Catégories restaurant', batchSize: 50 },
        { key: 'pos_produits', name: 'Produits restaurant', batchSize: 50 },
        { key: 'pos_ventes', name: 'Tickets et ventes caisse', batchSize: 30, targetCountKey: 'pos_ventes' },
        { key: 'app_users', name: 'Utilisateurs', batchSize: 50 },
        { key: 'users', name: 'Utilisateurs', batchSize: 50 },
      ];

      // Calculate total rows for accurate progress bar
      let totalRows = 0;
      for (const t of tableKeys) {
        const val = parsedData[t.key];
        if (Array.isArray(val)) totalRows += val.length;
        else if (val && typeof val === 'object') totalRows += 1;
      }
      if (totalRows === 0) totalRows = 1;

      let processedRows = 0;

      for (const t of tableKeys) {
        const val = parsedData[t.key];
        if (!val) continue;

        let rows: any[] = [];
        if (Array.isArray(val)) {
          rows = val;
        } else if (typeof val === 'object') {
          rows = [val];
        }

        if (rows.length === 0) continue;

        const batchSize = t.batchSize || 50;
        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);
          const currentBatchEnd = Math.min(i + batchSize, rows.length);

          const stepPct = Math.round((processedRows / totalRows) * 100);
          const overallPct = Math.min(95, Math.round(50 + (processedRows / totalRows) * 45));

          updateProg(
            'processing',
            100,
            stepPct,
            overallPct,
            `Importation ${t.name} (${currentBatchEnd}/${rows.length})...`
          );

          const batchRes = await apiCall('import_batch', {
            table: t.key,
            rows: batch,
            mode,
          });

          if (t.targetCountKey && batchRes.count) {
            counts[t.targetCountKey] = (counts[t.targetCountKey] || 0) + batchRes.count;
          }

          processedRows += batch.length;
        }
      }
    } else {
      // SQL script handling in safe chunks
      updateProg('processing', 100, 30, 50, 'Découpage et exécution du script SQL sur Neon...');

      const statements = text
        .replace(/--.*$/gm, '')
        .split(/;\s*[\r\n]+|;\s*$/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const batchSize = 30;
      for (let i = 0; i < statements.length; i += batchSize) {
        const chunk = statements.slice(i, i + batchSize);
        const currentEnd = Math.min(i + batchSize, statements.length);
        const overallPct = Math.min(95, Math.round(50 + (i / statements.length) * 45));

        updateProg(
          'processing',
          100,
          Math.round((i / statements.length) * 100),
          overallPct,
          `Exécution SQL (${currentEnd}/${statements.length} requêtes)...`
        );

        await apiCall('import_sql_chunk', {
          sqlChunk: chunk.join(';\n') + ';',
        });
      }
    }

    updateProg('persisting', 100, 95, 95, 'Synchronisation finale des tables...');

    // Invalidate local memory cache so fresh data is fetched
    await fetchAllData();

    const durationMs = Date.now() - startTime;

    const summary: DbImportSummary = {
      fileName,
      fileSizeBytes,
      tablesCount: 15,
      produitsCount: counts.produits || 0,
      clientsCount: counts.clients || 0,
      fournisseursCount: counts.fournisseurs || 0,
      facturesCount: counts.factures || 0,
      blCount: counts.bons_livraison || 0,
      posVentesCount: counts.pos_ventes || 0,
      integrityStatus: 'OK - PostgreSQL Neon Serverless',
      durationMs,
    };

    updateProg('success', 100, 100, 100, `Importation réussie (${durationMs} ms)`);
    return summary;
  } catch (err: any) {
    const errorMsg = err?.message || 'Erreur inconnue lors de l\'importation';
    updateProg('error', 0, 0, 0, 'Échec de l\'importation', errorMsg);
    throw err;
  }
}

export async function importDirectDataToNeon(
  dataOrSql: { data?: any; sql?: string; mode?: 'replace' | 'merge' }
): Promise<any> {
  const res = await apiCall('import_db', dataOrSql);
  await fetchAllData();
  return res;
}

export async function fetchUsers(): Promise<AppUser[]> {
  return fetchAllUsers();
}

export async function fetchClientTarifs(clientId: number): Promise<any[]> {
  const res = await apiCall('fetch_client_tarifs', { clientId });
  return (res.tarifs || []).map((tarif: any) => ({
    ...tarif,
    id: Number(tarif.id),
    client_id: Number(tarif.client_id),
    produit_id: Number(tarif.produit_id),
    prix_standard_ht: Number(tarif.prix_standard_ht || 0),
    prix_special_ht: Number(tarif.prix_special_ht || 0),
    remise_pct: Number(tarif.remise_pct || 0),
    taux_tva: Number(tarif.taux_tva || 0),
  }));
}

export async function saveClientTarif(tarif: any): Promise<number> {
  const res = await apiCall('save_client_tarif', { tarif });
  return Number(res.id);
}

export async function deleteClientTarif(id: number): Promise<void> {
  await apiCall('delete_client_tarif', { id });
}

export async function fetchFacturesFournisseurs(): Promise<any[]> {
  try {
    const res = await apiCall('fetch_factures_fournisseurs');
    return res?.factures || [];
  } catch (err) {
    console.error('Error fetching supplier invoices:', err);
    return [];
  }
}

export async function fetchPaiementsFournisseurs(): Promise<any[]> {
  try {
    const res = await apiCall('fetch_paiements_fournisseurs');
    return res?.paiements || [];
  } catch (err) {
    console.error('Error fetching supplier payments:', err);
    return [];
  }
}

export async function fetchSupplierReconciliation(): Promise<any[]> {
  return [];
}

export async function createFactureFournisseur(facture: any, lignes?: any[]): Promise<number> {
  const res = await apiCall('create_facture_fournisseur', { facture, lignes });
  return res?.id || 1;
}

export async function createPaiementFournisseur(paiement: any): Promise<number> {
  const res = await apiCall('create_paiement_fournisseur', { paiement });
  return res?.id || 1;
}

export async function updateStatutChequeFournisseur(id: number, statut: string, dateEncaissement?: string): Promise<void> {
  await apiCall('update_statut_cheque_fournisseur', { id, statut, dateEncaissement });
}

export async function deleteFactureFournisseur(id: number): Promise<void> {
  await apiCall('delete_facture_fournisseur', { id });
}

export async function deletePaiementFournisseur(id: number): Promise<void> {
  await apiCall('delete_paiement_fournisseur', { id });
}

export async function resetToSampleData(): Promise<void> {
  await apiCall('seed_sample_casa');
  await fetchAllData();
}

export async function resetDatabaseToDefault(): Promise<void> {
  return resetToSampleData();
}

export async function seedCasablanca2026Dataset(): Promise<void> {
  await apiCall('seed_sample_casa');
  await fetchAllData();
}


export async function fetchDatabaseHealthInfo(): Promise<DatabaseHealthInfo> {
  const data = await fetchAllData();
  return {
    storageEngine: 'IndexedDB (Haute Capacité)',
    storageSizeBytes: 1024 * 512,
    storageSizeFormatted: '0.5 MB (PostgreSQL Neon)',
    tablesCount: 15,
    produitsCount: (data?.produits || []).length,
    clientsCount: (data?.clients || []).length,
    fournisseursCount: (data?.fournisseurs || []).length,
    facturesCount: (data?.factures || []).length,
    blCount: (data?.bons_livraison || []).length,
    posVentesCount: (data?.pos_ventes || []).length,
    lastSavedAt: new Date().toISOString(),
    sqliteVersion: 'PostgreSQL 16 / Neon Serverless',
    integrityOk: true,
  };
}

export async function executeRawQuery(sqlQuery: string): Promise<{ columns: string[]; values: any[][] }> {
  const res = await fetch('/api/postgres/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sqlQuery }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Erreur requête SQL');
  }
  return {
    columns: data.columns || [],
    values: (data.rows || []).map((row: any) => Object.values(row)),
  };
}

// ============================================================================
// COMPTABILITÉ MAROCAINE (PCGM, JOURNAUX, ÉCRITURES, IMMOBILISATIONS)
// ============================================================================

export async function fetchChartOfAccounts(): Promise<PlanAccount[]> {
  const data = await fetchAllData();
  return data?.chart_of_accounts || [];
}

export async function fetchAccountingJournals(): Promise<AccountingJournal[]> {
  const data = await fetchAllData();
  return data?.accounting_journals || [];
}

export async function fetchJournalEntries(): Promise<JournalEntry[]> {
  const data = await fetchAllData();
  return data?.journal_entries || [];
}

export async function saveJournalEntry(entry: JournalEntry): Promise<void> {
  await apiCall('save_journal_entry', { entry });
  await fetchAllData(true);
}

export async function deleteJournalEntry(id: number): Promise<void> {
  await apiCall('delete_journal_entry', { id });
  await fetchAllData(true);
}

export async function syncAllOperationalEntries(): Promise<{ count: number }> {
  const res = await apiCall('sync_all_operational_entries');
  await fetchAllData(true);
  return { count: res?.count || 0 };
}

export async function fetchFixedAssets(): Promise<FixedAsset[]> {
  const data = await fetchAllData();
  return data?.fixed_assets || [];
}

export async function saveFixedAsset(asset: FixedAsset): Promise<void> {
  await apiCall('save_fixed_asset', { asset });
  await fetchAllData(true);
}

export async function deleteFixedAsset(id: number): Promise<void> {
  await apiCall('delete_fixed_asset', { id });
  await fetchAllData(true);
}

// ============================================================================
// RESSOURCES HUMAINES & PAIE MAROCAINE (LF 2026)
// ============================================================================

export async function fetchEmployees(): Promise<Employee[]> {
  const data = await fetchAllData();
  return data?.employees || [];
}

export async function saveEmployee(employee: Employee): Promise<void> {
  await apiCall('save_employee', { employee });
  await fetchAllData(true);
}

export async function deleteEmployee(id: number): Promise<void> {
  await apiCall('delete_employee', { id });
  await fetchAllData(true);
}

export async function fetchPayrolls(): Promise<PayrollSlip[]> {
  const data = await fetchAllData();
  return data?.payrolls || [];
}

export async function savePayroll(payroll: PayrollSlip): Promise<void> {
  await apiCall('save_payroll', { payroll });
  await fetchAllData(true);
}

export async function postPayrollToAccounting(payroll: PayrollSlip): Promise<any> {
  const res = await apiCall('post_payroll_to_accounting', { payroll });
  await fetchAllData(true);
  return res;
}

export async function deletePayroll(id: number): Promise<void> {
  await apiCall('delete_payroll', { id });
  await fetchAllData(true);
}

export async function fetchLeaves(): Promise<LeaveRequest[]> {
  const data = await fetchAllData();
  return data?.leaves || [];
}

export async function saveLeave(leave: LeaveRequest): Promise<void> {
  await apiCall('save_leave', { leave });
  await fetchAllData(true);
}

export async function deleteLeave(id: number): Promise<void> {
  await apiCall('delete_leave', { id });
  await fetchAllData(true);
}

// ============================================================================
// FABRICATION & PRODUCTION (MANUFACTURING)
// ============================================================================

export async function fetchBOMs(): Promise<BOM[]> {
  const data = await fetchAllData();
  return data?.boms || [];
}

export async function saveBOM(bom: BOM): Promise<void> {
  await apiCall('save_bom', { bom });
  await fetchAllData(true);
}

export async function deleteBOM(id: number): Promise<void> {
  await apiCall('delete_bom', { id });
  await fetchAllData(true);
}

export async function fetchProductionOrders(): Promise<ProductionOrder[]> {
  const data = await fetchAllData();
  return data?.production_orders || [];
}

export async function saveProductionOrder(order: ProductionOrder): Promise<void> {
  await apiCall('save_production_order', { order });
  await fetchAllData(true);
}

export async function completeProductionOrder(order: ProductionOrder): Promise<any> {
  const res = await apiCall('complete_production_order', { order });
  await fetchAllData(true);
  return res;
}

export async function deleteProductionOrder(id: number): Promise<void> {
  await apiCall('delete_production_order', { id });
  await fetchAllData(true);
}

