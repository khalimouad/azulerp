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
  { id: 1, nom: 'Atelier de Fabrication & Transformation', taux_horaire: 45, capacite_jour_heures: 8, statut: 'operationnel' },
  { id: 2, nom: 'Ligne de Conditionnement & Emballage', taux_horaire: 55, capacite_jour_heures: 8, statut: 'operationnel' },
  { id: 3, nom: 'Zone de Stockage & Matières Premières', taux_horaire: 30, capacite_jour_heures: 24, statut: 'operationnel' },
];

export const SAMPLE_BOMS: BOM[] = [
  {
    id: 1,
    code: 'BOM-HUILE-75CL',
    nom: 'Conditionnement Huile d’Olive Bio (Bouteilles 75cl & 25cl)',
    produit_fini_nom: 'Huile d’Olive Bio 75cl',
    quantite_produite: 100,
    unite: 'Bouteille',
    actif: true,
    version: '1.0',
    notes: 'Extraction et conditionnement certifié Bio',
    inputs: [
      { produit_nom: 'Huile d’olive vrac (Litre)', quantite: 80, unite: 'L', cout_unitaire: 60, cout_total: 4800 },
      { produit_nom: 'Bouteille en verre 75cl', quantite: 100, unite: 'Pce', cout_unitaire: 4.5, cout_total: 450 },
      { produit_nom: 'Bouchon sécurisé à vis', quantite: 100, unite: 'Pce', cout_unitaire: 0.8, cout_total: 80 },
      { produit_nom: 'Étiquette adhésive dorée', quantite: 100, unite: 'Pce', cout_unitaire: 1.2, cout_total: 120 },
    ],
    outputs: [
      { produit_nom: 'Huile d’Olive Bio 75cl', quantite: 100, unite: 'Bouteille', est_dechet: false, pourcentage_repartition: 95, cout_unitaire_estime: 56.5, cout_total_estime: 5650 },
      { produit_nom: 'Résidus de filtration / Déchet', quantite: 5, unite: 'Kg', est_dechet: true, pourcentage_repartition: 0, cout_unitaire_estime: 0, cout_total_estime: 0 },
    ],
    composants: [
      { produit_nom: 'Huile d’olive vrac (Litre)', quantite: 80, unite: 'L', cout_unitaire: 60, cout_total: 4800 },
      { produit_nom: 'Bouteille en verre 75cl', quantite: 100, unite: 'Pce', cout_unitaire: 4.5, cout_total: 450 },
      { produit_nom: 'Bouchon sécurisé à vis', quantite: 100, unite: 'Pce', cout_unitaire: 0.8, cout_total: 80 },
      { produit_nom: 'Étiquette adhésive dorée', quantite: 100, unite: 'Pce', cout_unitaire: 1.2, cout_total: 120 },
    ],
    cout_matieres_estime: 5450,
    cout_main_oeuvre_estime: 250, // 5h @ 50 DH
    frais_generaux_estime: 100,
    cout_revient_unitaire: 58.00,
    rendement_pct: 94,
  },
  {
    id: 2,
    code: 'BOM-FARINE-SEMOULE',
    nom: 'Transformation Blé Meunerie (Farine T55 & Semoule)',
    produit_fini_nom: 'Farine Supérieure T55',
    quantite_produite: 1000,
    unite: 'Kg',
    actif: true,
    version: '1.2',
    notes: 'Mouture industrielle avec séparation son et semoule',
    inputs: [
      { produit_nom: 'Blé dur de meunerie (Qx)', quantite: 1200, unite: 'Kg', cout_unitaire: 3.8, cout_total: 4560 },
      { produit_nom: 'Sacs d’emballage kraft 25kg', quantite: 40, unite: 'Pce', cout_unitaire: 4.0, cout_total: 160 },
    ],
    outputs: [
      { produit_nom: 'Farine Supérieure T55', quantite: 800, unite: 'Kg', est_dechet: false, pourcentage_repartition: 75, cout_unitaire_estime: 4.70, cout_total_estime: 3760 },
      { produit_nom: 'Semoule Fine Extra', quantite: 250, unite: 'Kg', est_dechet: false, pourcentage_repartition: 25, cout_unitaire_estime: 5.00, cout_total_estime: 1250 },
      { produit_nom: 'Son de blé (Déchet valorisable)', quantite: 150, unite: 'Kg', est_dechet: true, pourcentage_repartition: 0, cout_unitaire_estime: 0, cout_total_estime: 0 },
    ],
    composants: [
      { produit_nom: 'Blé dur de meunerie (Qx)', quantite: 1200, unite: 'Kg', cout_unitaire: 3.8, cout_total: 4560 },
      { produit_nom: 'Sacs d’emballage kraft 25kg', quantite: 40, unite: 'Pce', cout_unitaire: 4.0, cout_total: 160 },
    ],
    cout_matieres_estime: 4720,
    cout_main_oeuvre_estime: 400,
    frais_generaux_estime: 180,
    cout_revient_unitaire: 5.05,
    rendement_pct: 88,
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
  if (Array.isArray(order.inputs) && order.inputs.length > 0) {
    order.inputs.forEach(inp => {
      movements.push({
        date: today,
        type: 'SORTIE_BL',
        motif: `Consommation production - ${order.numero}`,
        quantite: inp.quantite,
        reference_doc: order.numero,
        produit_id: inp.produit_id || 0,
        produit_nom: inp.produit_nom,
      });
    });
  } else {
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
  }

  // Entrée produit(s) fini(s)
  if (Array.isArray(order.outputs) && order.outputs.length > 0) {
    order.outputs.forEach(out => {
      if (!out.est_dechet) {
        movements.push({
          date: today,
          type: 'ENTREE',
          motif: `Fabrication achevée - ${order.numero}`,
          quantite: out.quantite_reelle || out.quantite_prevue,
          reference_doc: order.numero,
          produit_id: out.produit_id || 0,
          produit_nom: out.produit_nom,
        });
      }
    });
  } else {
    movements.push({
      date: today,
      type: 'ENTREE',
      motif: `Fabrication achevée - ${order.numero}`,
      quantite: order.quantite_reelle || order.quantite_prevue,
      reference_doc: order.numero,
      produit_id: order.produit_fini_id || 0,
      produit_nom: order.produit_fini_nom,
    });
  }

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
