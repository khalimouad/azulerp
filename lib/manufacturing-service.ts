import {
  BOM,
  BOMComponent,
  ProductionOrder,
  ProductionOrderComponent,
  WorkCenter,
  Produit,
  StockMouvement
} from './types';
import { generateProductionJournalEntry } from './moroccan-accounting';

// ============================================================================
// NOMENCLATURES & RECETTES TYPES (BOM)
// ============================================================================

export const DEFAULT_WORK_CENTERS: WorkCenter[] = [
  { id: 1, nom: 'Atelier Cuisine & Préparation', taux_horaire: 45, capacite_jour_heures: 8, statut: 'operationnel' },
  { id: 2, nom: 'Ligne de Conditionnement & Emballage', taux_horaire: 55, capacite_jour_heures: 8, statut: 'operationnel' },
  { id: 3, nom: 'Chambre Froide & Stockage Matières', taux_horaire: 30, capacite_jour_heures: 24, statut: 'operationnel' },
];

export const SAMPLE_BOMS: BOM[] = [
  {
    id: 1,
    code: 'BOM-HUILE-75CL',
    nom: 'Huile d’Olive Vierge Extra Bio - Bouteille 75cl',
    produit_fini_nom: 'Huile d’Olive Bio 75cl',
    quantite_produite: 100,
    unite: 'Bouteille',
    actif: true,
    version: '1.0',
    notes: 'Embouteillage et étiquetage certifié Bio',
    composants: [
      { produit_nom: 'Huile d’olive vrac (Litre)', quantite: 75, unite: 'L', cout_unitaire: 60, cout_total: 4500 },
      { produit_nom: 'Bouteille en verre 75cl', quantite: 100, unite: 'Pce', cout_unitaire: 4.5, cout_total: 450 },
      { produit_nom: 'Bouchon sécurisé à vis', quantite: 100, unite: 'Pce', cout_unitaire: 0.8, cout_total: 80 },
      { produit_nom: 'Étiquette adhésive dorée', quantite: 100, unite: 'Pce', cout_unitaire: 1.2, cout_total: 120 },
    ],
    cout_matieres_estime: 5150,
    cout_main_oeuvre_estime: 250, // 5h @ 50 DH
    frais_generaux_estime: 100,
    cout_revient_unitaire: 55, // (5150 + 250 + 100) / 100
  },
  {
    id: 2,
    code: 'BOM-PESTO-200G',
    nom: 'Pesto Artisanal au Basilic Frais - Pot 200g',
    produit_fini_nom: 'Pesto Basilic Artisanal 200g',
    quantite_produite: 50,
    unite: 'Pot',
    actif: true,
    version: '1.1',
    notes: 'Recette italienne traditionnelle sans conservateur',
    composants: [
      { produit_nom: 'Basilic frais cultivé', quantite: 6, unite: 'Kg', cout_unitaire: 30, cout_total: 180 },
      { produit_nom: 'Huile d’olive vierge extra', quantite: 5, unite: 'L', cout_unitaire: 65, cout_total: 325 },
      { produit_nom: 'Pignons de pin méditerranéens', quantite: 1.5, unite: 'Kg', cout_unitaire: 180, cout_total: 270 },
      { produit_nom: 'Fromage Parmesan râpé', quantite: 2, unite: 'Kg', cout_unitaire: 120, cout_total: 240 },
      { produit_nom: 'Pots en verre 200g avec capsule', quantite: 50, unite: 'Pce', cout_unitaire: 2.5, cout_total: 125 },
    ],
    cout_matieres_estime: 1140,
    cout_main_oeuvre_estime: 150,
    frais_generaux_estime: 50,
    cout_revient_unitaire: 26.80, // (1140 + 150 + 50) / 50
  },
];

// ============================================================================
// CALCUL DES COÛTS ET VÉRIFICATION DE DISPONIBILITÉ
// ============================================================================

export interface StockCheckResult {
  disponible: boolean;
  alertes: {
    produit_nom: string;
    quantite_requise: number;
    stock_actuel: number;
    manquant: number;
    statut: 'suffisant' | 'critique' | 'rupture';
  }[];
}

/**
 * Vérifie la disponibilité des stocks de matières premières avant de lancer un OF
 */
export function checkStockForBOM(bom: BOM, quantiteAFabriquer: number, stocks: Record<string, number>): StockCheckResult {
  const ratio = quantiteAFabriquer / (bom.quantite_produite || 1);
  let allAvailable = true;
  const alertes: StockCheckResult['alertes'] = [];

  bom.composants.forEach(comp => {
    const qteRequise = comp.quantite * ratio;
    const stockActuel = stocks[comp.produit_nom] ?? 0;
    const manquant = Math.max(0, qteRequise - stockActuel);

    let statut: 'suffisant' | 'critique' | 'rupture' = 'suffisant';
    if (stockActuel === 0) {
      statut = 'rupture';
      allAvailable = false;
    } else if (stockActuel < qteRequise) {
      statut = 'critique';
      allAvailable = false;
    }

    alertes.push({
      produit_nom: comp.produit_nom,
      quantite_requise: Math.round(qteRequise * 100) / 100,
      stock_actuel: Math.round(stockActuel * 100) / 100,
      manquant: Math.round(manquant * 100) / 100,
      statut,
    });
  });

  return { disponible: allAvailable, alertes };
}

/**
 * Crée un Ordre de Fabrication à partir d'une Nomenclature (BOM)
 */
export function createProductionOrderFromBOM(
  bom: BOM,
  quantiteAFabriquer: number,
  options?: {
    responsable?: string;
    atelier?: string;
    heures_travail?: number;
    taux_horaire?: number;
  }
): ProductionOrder {
  const ratio = quantiteAFabriquer / (bom.quantite_produite || 1);
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const dateFinStr = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const composants: ProductionOrderComponent[] = bom.composants.map(c => {
    const qte = Math.round(c.quantite * ratio * 100) / 100;
    const cout = Math.round(qte * c.cout_unitaire * 100) / 100;
    return {
      produit_nom: c.produit_nom,
      quantite_prevue: qte,
      quantite_reelle: qte,
      unite: c.unite,
      cout_unitaire: c.cout_unitaire,
      cout_total: cout,
    };
  });

  const coutMatieres = composants.reduce((s, c) => s + c.cout_total, 0);
  const heures = options?.heures_travail || (bom.cout_main_oeuvre_estime ? (bom.cout_main_oeuvre_estime / 50) * ratio : 2);
  const tauxH = options?.taux_horaire || 50;
  const coutMOD = Math.round(heures * tauxH * 100) / 100;
  const coutFrais = Math.round(bom.frais_generaux_estime * ratio * 100) / 100;

  const coutTotal = Math.round((coutMatieres + coutMOD + coutFrais) * 100) / 100;
  const coutUnitaire = Math.round((coutTotal / quantiteAFabriquer) * 100) / 100;

  return {
    numero: `OF-${now.getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
    bom_id: bom.id,
    bom_nom: bom.nom,
    produit_fini_nom: bom.produit_fini_nom,
    quantite_prevue: quantiteAFabriquer,
    quantite_reelle: quantiteAFabriquer,
    unite: bom.unite,
    date_lancement: dateStr,
    date_prevue_fin: dateFinStr,
    responsable: options?.responsable || 'Chef d’atelier',
    atelier: options?.atelier || 'Atelier Principal',
    status: 'confirme',
    composants_consommes: composants,
    cout_matieres: coutMatieres,
    cout_main_oeuvre: coutMOD,
    cout_machines_ateliers: coutFrais,
    cout_total_production: coutTotal,
    cout_revient_unitaire: coutUnitaire,
    stock_destocke: false,
    stock_entre: false,
    comptabilise: false,
    created_at: now.toISOString(),
  };
}

/**
 * Clôture un Ordre de Fabrication :
 * 1. Génère les mouvements de stock de sortie (matières premières) et d'entrée (produit fini).
 * 2. Génère l'écriture comptable équilibrée de production.
 */
export function completeProductionOrder(
  order: ProductionOrder
): {
  updatedOrder: ProductionOrder;
  stockMovements: Partial<StockMouvement>[];
  journalEntry: ReturnType<typeof generateProductionJournalEntry>;
} {
  const today = new Date().toISOString().split('T')[0];
  const movements: Partial<StockMouvement>[] = [];

  // Sorties matières premières
  order.composants_consommes.forEach(comp => {
    movements.push({
      date: today,
      type: 'SORTIE_BL',
      motif: `Consommation production - ${order.numero}`,
      quantite: comp.quantite_reelle,
      reference_doc: order.numero,
      produit_id: comp.produit_id || 0,
      produit_nom: comp.produit_nom,
    });
  });

  // Entrée produit fini
  movements.push({
    date: today,
    type: 'ENTREE',
    motif: `Fabrication achevée - ${order.numero}`,
    quantite: order.quantite_reelle || order.quantite_prevue,
    reference_doc: order.numero,
    produit_id: order.produit_fini_id || 0,
    produit_nom: order.produit_fini_nom,
  });

  const updatedOrder: ProductionOrder = {
    ...order,
    status: 'termine',
    date_cloture: today,
    stock_destocke: true,
    stock_entre: true,
    comptabilise: true,
    updated_at: new Date().toISOString(),
  };

  const journalEntry = generateProductionJournalEntry(updatedOrder);

  return {
    updatedOrder,
    stockMovements: movements,
    journalEntry,
  };
}
