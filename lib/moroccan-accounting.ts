import {
  PlanAccount,
  AccountingJournal,
  JournalEntry,
  JournalEntryLine,
  JournalCode,
  FixedAsset,
  Facture,
  Reglement,
  PayrollSlip,
  ProductionOrder
} from './types';

// ============================================================================
// JOURNAUX COMPTABLES MAROCAINS STANDARDS (CGNC)
// ============================================================================

export const MOROCCAN_JOURNALS: AccountingJournal[] = [
  { code: 'VTE', nom: 'Journal des Ventes', nom_ar: 'يومية المبيعات', description: 'Enregistrement des factures de vente clients et avoirs', color: 'blue' },
  { code: 'ACH', nom: 'Journal des Achats', nom_ar: 'يومية المشتريات', description: 'Enregistrement des factures fournisseurs et frais généraux', color: 'emerald' },
  { code: 'BNQ', nom: 'Journal de Banque', nom_ar: 'يومية البنك', description: 'Encaissements, virements, chèques et prélèvements bancaires', color: 'indigo' },
  { code: 'CA',  nom: 'Journal de Caisse', nom_ar: 'يومية الصندوق', description: 'Règlements et encaissements en espèces', color: 'amber' },
  { code: 'PAIE',nom: 'Journal de Paie', nom_ar: 'يومية الأجور', description: 'Comptabilisation des salaires, cotisations CNSS/AMO/CIMR et retenues IR', color: 'purple' },
  { code: 'IMM', nom: 'Journal de Production & Immo', nom_ar: 'يومية الإنتاج والأصول', description: 'Ordres de fabrication, entrées de produits finis et immobilisations', color: 'cyan' },
  { code: 'OD',  nom: 'Opérations Diverses', nom_ar: 'عمليات مختلفة', description: 'Déclarations de TVA, dotations aux amortissements et régularisations', color: 'slate' },
  { code: 'AN',  nom: 'À-Nouveaux (Report)', nom_ar: 'الأرصدة الافتتاحية', description: 'Report des soldes d’ouverture du bilan au 1er janvier', color: 'rose' },
];

// ============================================================================
// PLAN COMPTABLE GÉNÉRAL MAROCAIN (PCGM - CGNC)
// Classes 1 à 7 officielles avec libellés bilingues
// ============================================================================

export const OFFICIAL_PCGM_ACCOUNTS: PlanAccount[] = [
  // ── CLASSE 1 : FINANCEMENT PERMANENT ───────────────────────────────────────
  { code: '1111', libelle: 'Capital social', libelle_ar: 'رأس المال الاجتماعي', classe: 1, type: 'equity', allow_entry: true },
  { code: '1119', libelle: 'Actionnaires, capital souscrit non appelé', libelle_ar: 'المساهمون، رأس المال غير المدفوع', classe: 1, type: 'asset', allow_entry: false },
  { code: '1140', libelle: 'Réserve légale (5% max 10% capital)', libelle_ar: 'الاحتياطي القانوني', classe: 1, type: 'equity', allow_entry: true },
  { code: '1151', libelle: 'Réserves statutaires ou contractuelles', libelle_ar: 'احتياطيات نظامية', classe: 1, type: 'equity', allow_entry: true },
  { code: '1161', libelle: 'Report à nouveau (solde créditeur)', libelle_ar: 'الربح المحجوز', classe: 1, type: 'equity', allow_entry: true },
  { code: '1169', libelle: 'Report à nouveau (solde débiteur)', libelle_ar: 'الخسارة المرحلة', classe: 1, type: 'equity', allow_entry: true },
  { code: '1181', libelle: 'Résultat net de l’exercice (créditeur)', libelle_ar: 'صافي أرباح السنة المالية', classe: 1, type: 'equity', allow_entry: true },
  { code: '1189', libelle: 'Résultat net de l’exercice (débiteur)', libelle_ar: 'صافي خسائر السنة المالية', classe: 1, type: 'equity', allow_entry: true },
  { code: '1481', libelle: 'Emprunts auprès des établissements de crédit', libelle_ar: 'قروض مؤسسات الائتمان', classe: 1, type: 'liability', allow_entry: true },
  { code: '1511', libelle: 'Provisions pour litiges durables', libelle_ar: 'مخصصات النزاعات الطويلة الأجل', classe: 1, type: 'liability', allow_entry: true },

  // ── CLASSE 2 : ACTIF IMMOBILISÉ ───────────────────────────────────────────
  { code: '2111', libelle: 'Frais de constitution', libelle_ar: 'مصاريف التأسيس', classe: 2, type: 'asset', allow_entry: true },
  { code: '2220', libelle: 'Fonds commercial', libelle_ar: 'الأصل التجاري', classe: 2, type: 'asset', allow_entry: true },
  { code: '2230', libelle: 'Logiciels informatiques et progiciels', libelle_ar: 'برمجيات ومواقع رقمية', classe: 2, type: 'asset', allow_entry: true },
  { code: '2311', libelle: 'Terrains nus', libelle_ar: 'أراضي غير مبنية', classe: 2, type: 'asset', allow_entry: true },
  { code: '2321', libelle: 'Bâtiments et constructions', libelle_ar: 'مباني وعقارات صناعية', classe: 2, type: 'asset', allow_entry: true },
  { code: '2332', libelle: 'Matériel et outillage industriel', libelle_ar: 'معدات وأدوات صناعية', classe: 2, type: 'asset', allow_entry: true },
  { code: '2340', libelle: 'Matériel de transport (Véhicules)', libelle_ar: 'معدات النقل والسيارات', classe: 2, type: 'asset', allow_entry: true },
  { code: '2351', libelle: 'Mobilier de bureau', libelle_ar: 'أثاث مكتبي', classe: 2, type: 'asset', allow_entry: true },
  { code: '2352', libelle: 'Matériel de bureau et d’encaissement (POS)', libelle_ar: 'معدات المكاتب ونقاط البيع', classe: 2, type: 'asset', allow_entry: true },
  { code: '2355', libelle: 'Matériel informatique', libelle_ar: 'أجهزة ومعدات إعلام آلي', classe: 2, type: 'asset', allow_entry: true },
  { code: '2481', libelle: 'Dépôts et cautionnements versés', libelle_ar: 'ضمانات مالية مدفوعة', classe: 2, type: 'asset', allow_entry: true },
  { code: '2811', libelle: 'Amortissements des frais préliminaires', libelle_ar: 'استهلاك المصاريف التمهيدية', classe: 2, type: 'contra-asset', allow_entry: true },
  { code: '2832', libelle: 'Amortissements du matériel et outillage', libelle_ar: 'استهلاك المعدات والأدوات', classe: 2, type: 'contra-asset', allow_entry: true },
  { code: '2834', libelle: 'Amortissements du matériel de transport', libelle_ar: 'استهلاك معدات النقل', classe: 2, type: 'contra-asset', allow_entry: true },
  { code: '2835', libelle: 'Amortissements du mobilier et matériel bureau', libelle_ar: 'استهلاك الأثاث والمعدات', classe: 2, type: 'contra-asset', allow_entry: true },

  // ── CLASSE 3 : ACTIF CIRCULANT (HORS TRÉSORERIE) ───────────────────────────
  { code: '3111', libelle: 'Marchandises (Stock Magasin)', libelle_ar: 'مخزون البضائع', classe: 3, type: 'asset', allow_entry: true },
  { code: '3121', libelle: 'Matières premières et ingrédients', libelle_ar: 'المواد الأولية والمكونات', classe: 3, type: 'asset', allow_entry: true },
  { code: '3134', libelle: 'Produits en cours de fabrication', libelle_ar: 'منتجات قيد التصنيع', classe: 3, type: 'asset', allow_entry: true },
  { code: '3151', libelle: 'Produits finis (Stock Production)', libelle_ar: 'مخزون المنتجات المصنعة', classe: 3, type: 'asset', allow_entry: true },
  { code: '3421', libelle: 'Clients (Comptes Courants)', libelle_ar: 'الزبائن والعملاء', classe: 3, type: 'asset', allow_entry: true },
  { code: '3424', libelle: 'Clients douteux ou litigieux', libelle_ar: 'زبائن مشكوك في استخلاصهم', classe: 3, type: 'asset', allow_entry: true },
  { code: '3425', libelle: 'Clients - Effets à recevoir (Traites)', libelle_ar: 'كمبيالات زبائن للقبض', classe: 3, type: 'asset', allow_entry: true },
  { code: '3431', libelle: 'Avances et acomptes au personnel', libelle_ar: 'تسبيقات وقروض المستخدمين', classe: 3, type: 'asset', allow_entry: true },
  { code: '3451', libelle: 'Subventions d’exploitation à recevoir', libelle_ar: 'إعانات مستحقة للقبض', classe: 3, type: 'asset', allow_entry: true },
  { code: '3453', libelle: 'Acomptes sur Impôt sur les Sociétés (IS)', libelle_ar: 'دفعات مسبقة للضريبة على الشركات', classe: 3, type: 'asset', allow_entry: true },
  { code: '3455', libelle: 'État - TVA récupérable sur les charges (20%, 14%, 10%, 7%)', libelle_ar: 'الدولة - ض.ق.م مسترجعة على النفقات', classe: 3, type: 'asset', allow_entry: true },
  { code: '34551',libelle: 'État - TVA récupérable sur immobilisations', libelle_ar: 'الدولة - ض.ق.م مسترجعة على الأصول', classe: 3, type: 'asset', allow_entry: true },
  { code: '3456', libelle: 'État - Crédit de TVA à reporter', libelle_ar: 'الدولة - فائض ض.ق.م مرحل', classe: 3, type: 'asset', allow_entry: true },
  { code: '3458', libelle: 'État - Autres comptes débiteurs', libelle_ar: 'الدولة - حسابات مدينة أخرى', classe: 3, type: 'asset', allow_entry: true },

  // ── CLASSE 4 : PASSIF CIRCULANT (HORS TRÉSORERIE) ──────────────────────────
  { code: '4411', libelle: 'Fournisseurs (Comptes Courants)', libelle_ar: 'الموردون', classe: 4, type: 'liability', allow_entry: true },
  { code: '4415', libelle: 'Fournisseurs - Effets à payer (Traites)', libelle_ar: 'كمبيالات موردين للدفع', classe: 4, type: 'liability', allow_entry: true },
  { code: '4432', libelle: 'Rémunérations dues au personnel (Net à payer)', libelle_ar: 'الأجور والمستحقات الصافية للمستخدمين', classe: 4, type: 'liability', allow_entry: true },
  { code: '4434', libelle: 'Oppositions et saisies-arrêts sur salaires', libelle_ar: 'اقتطاعات وأحكام على الأجور', classe: 4, type: 'liability', allow_entry: true },
  { code: '4441', libelle: 'C.N.S.S. & A.M.O. (Cotisations dues)', libelle_ar: 'الصندوق الوطني للضمان الاجتماعي والتأمين', classe: 4, type: 'liability', allow_entry: true },
  { code: '4443', libelle: 'Caisses de retraite (C.I.M.R.)', libelle_ar: 'صندوق التقاعد المغربي', classe: 4, type: 'liability', allow_entry: true },
  { code: '4448', libelle: 'Mutuelles et autres organismes sociaux', libelle_ar: 'التعاضديات والتأمينات التكميلية', classe: 4, type: 'liability', allow_entry: true },
  { code: '44525',libelle: 'État - Impôt sur le Revenu (IR) prélevé à la source', libelle_ar: 'الدولة - الضريبة على الدخل مقتطعة من المنبع', classe: 4, type: 'liability', allow_entry: true },
  { code: '4453', libelle: 'État - Impôt sur les Sociétés (IS dû)', libelle_ar: 'الدولة - الضريبة على الشركات المستحقة', classe: 4, type: 'liability', allow_entry: true },
  { code: '4455', libelle: 'État - TVA facturée aux clients', libelle_ar: 'الدولة - ض.ق.م محصلة على المبيعات', classe: 4, type: 'liability', allow_entry: true },
  { code: '4456', libelle: 'État - TVA due à décaisser', libelle_ar: 'الدولة - ض.ق.م الواجب أداؤها', classe: 4, type: 'liability', allow_entry: true },
  { code: '4457', libelle: 'Retenues à la source sur loyers et TVA', libelle_ar: 'اقتطاعات ضريبية من المنبع على الكراء', classe: 4, type: 'liability', allow_entry: true },
  { code: '4481', libelle: 'Dettes sur acquisitions d’immobilisations', libelle_ar: 'ديون شراء الأصول الثابتة', classe: 4, type: 'liability', allow_entry: true },
  { code: '4465', libelle: 'Associés - Comptes courants créditeurs', libelle_ar: 'الشركاء - حسابات جارية دائنة', classe: 4, type: 'liability', allow_entry: true },

  // ── CLASSE 5 : TRÉSORERIE ──────────────────────────────────────────────────
  { code: '5111', libelle: 'Chèques en portefeuille à encaisser', libelle_ar: 'شيكات في الحفظ للتحصيل', classe: 5, type: 'asset', allow_entry: true },
  { code: '5115', libelle: 'Cartes bancaires à encaisser (TPE)', libelle_ar: 'مدفوعات البطاقات البنكية للتحصيل', classe: 5, type: 'asset', allow_entry: true },
  { code: '5141', libelle: 'Banque (Attijariwafa / Banque Populaire / CIH)', libelle_ar: 'الحساب البنكي الجاري', classe: 5, type: 'asset', allow_entry: true },
  { code: '5143', libelle: 'Trésorerie Générale du Royaume (TGR)', libelle_ar: 'الخزينة العامة للمملكة', classe: 5, type: 'asset', allow_entry: true },
  { code: '5161', libelle: 'Caisse Principale (Espèces MAD)', libelle_ar: 'الصندوق المركزي نقداً', classe: 5, type: 'asset', allow_entry: true },
  { code: '5165', libelle: 'Virements internes et transferts de fonds', libelle_ar: 'تحويلات مالية داخلية', classe: 5, type: 'asset', allow_entry: true },
  { code: '5541', libelle: 'Banques (Soldes créditeurs / Découverts)', libelle_ar: 'تسهيلات بنكية وسحب على المكشوف', classe: 5, type: 'liability', allow_entry: true },

  // ── CLASSE 6 : CHARGES ────────────────────────────────────────────────────
  { code: '6111', libelle: 'Achats revendus de marchandises', libelle_ar: 'مشتريات بضائع معدة للبيع', classe: 6, type: 'expense', allow_entry: true },
  { code: '6114', libelle: 'Variation des stocks de marchandises', libelle_ar: 'تغير مخزون البضائع', classe: 6, type: 'expense', allow_entry: true },
  { code: '6121', libelle: 'Achats de matières premières et ingrédients', libelle_ar: 'مشتريات مواد أولية للتصنيع', classe: 6, type: 'expense', allow_entry: true },
  { code: '61241',libelle: 'Variation des stocks de matières premières', libelle_ar: 'تغير مخزون المواد الأولية', classe: 6, type: 'expense', allow_entry: true },
  { code: '6125', libelle: 'Achats de fournitures consommables et emballages', libelle_ar: 'مشتريات لوازم استهلاكية وتغليف', classe: 6, type: 'expense', allow_entry: true },
  { code: '6131', libelle: 'Locations et charges locatives de magasins', libelle_ar: 'إيجارات ومصاريف الكراء', classe: 6, type: 'expense', allow_entry: true },
  { code: '6134', libelle: 'Primes d’assurances (Incendie, Vol, RC)', libelle_ar: 'أقساط التأمين', classe: 6, type: 'expense', allow_entry: true },
  { code: '6141', libelle: 'Études, recherches et prestations extérieures', libelle_ar: 'دراسات وأبحاث وخدمات خارجية', classe: 6, type: 'expense', allow_entry: true },
  { code: '6142', libelle: 'Rémunérations d’intermédiaires et honoraires', libelle_ar: 'أتعاب خبراء ومحامين ومحاسبين', classe: 6, type: 'expense', allow_entry: true },
  { code: '6143', libelle: 'Frais de transport, voyages et déplacements', libelle_ar: 'مصاريف التنقل والشحن والأسفار', classe: 6, type: 'expense', allow_entry: true },
  { code: '6144', libelle: 'Publicité, publications et relations publiques', libelle_ar: 'إشهار ودعاية وعلاقات عامة', classe: 6, type: 'expense', allow_entry: true },
  { code: '6145', libelle: 'Frais postaux et de télécommunications (Téléphone, Fibre)', libelle_ar: 'مصاريف الاتصالات والإنترنت والبريد', classe: 6, type: 'expense', allow_entry: true },
  { code: '6147', libelle: 'Services bancaires et commissions TPE', libelle_ar: 'عمولات وخدمات بنكية', classe: 6, type: 'expense', allow_entry: true },
  { code: '6161', libelle: 'Impôts et taxes directs', libelle_ar: 'ضرائب ورسوم مباشرة', classe: 6, type: 'expense', allow_entry: true },
  { code: '6167', libelle: 'Taxe professionnelle (Patente) et taxes locales', libelle_ar: 'الضريبة المهنية والرسوم الجماعية', classe: 6, type: 'expense', allow_entry: true },
  { code: '6171', libelle: 'Rémunérations du personnel (Salaires Bruts)', libelle_ar: 'أجور ورواتب المستخدمين الخام', classe: 6, type: 'expense', allow_entry: true },
  { code: '6174', libelle: 'Charges sociales patronales (CNSS, AMO, Allocations)', libelle_ar: 'الأعباء الاجتماعية للمشغل (الضمان الاجتماعي)', classe: 6, type: 'expense', allow_entry: true },
  { code: '61743',libelle: 'Cotisations patronales à la retraite (CIMR)', libelle_ar: 'مساهمات التقاعد التكميلي للمشغل', classe: 6, type: 'expense', allow_entry: true },
  { code: '6177', libelle: 'Médecine du travail et pharmacie', libelle_ar: 'طب الشغل والإسعافات', classe: 6, type: 'expense', allow_entry: true },
  { code: '6191', libelle: 'Dotations d’exploitation aux amortissements immo incorp.', libelle_ar: 'مخصصات استهلاك الأصول المعنوية', classe: 6, type: 'expense', allow_entry: true },
  { code: '6193', libelle: 'Dotations d’exploitation aux amortissements immo corp.', libelle_ar: 'مخصصات استهلاك الأصول المادية', classe: 6, type: 'expense', allow_entry: true },
  { code: '6311', libelle: 'Intérêts des emprunts et dettes bancaires', libelle_ar: 'فوائد القروض والديون', classe: 6, type: 'expense', allow_entry: true },
  { code: '6585', libelle: 'Créances clients devenues irrécouvrables', libelle_ar: 'ديون هالكة غير قابلة للتحصيل', classe: 6, type: 'expense', allow_entry: true },
  { code: '6701', libelle: 'Impôt sur les Sociétés (IS de l’exercice)', libelle_ar: 'الضريبة على الشركات المستحقة', classe: 6, type: 'expense', allow_entry: true },

  // ── CLASSE 7 : PRODUITS ────────────────────────────────────────────────────
  { code: '7111', libelle: 'Ventes de marchandises au Maroc (HT)', libelle_ar: 'مبيعات البضائع بالمغرب', classe: 7, type: 'revenue', allow_entry: true },
  { code: '7113', libelle: 'Ventes de marchandises à l’exportation', libelle_ar: 'مبيعات البضائع للتصدير', classe: 7, type: 'revenue', allow_entry: true },
  { code: '7118', libelle: 'Ventes de marchandises des exercices antérieurs', libelle_ar: 'مبيعات بضائع لسنوات سابقة', classe: 7, type: 'revenue', allow_entry: true },
  { code: '7121', libelle: 'Ventes de biens produits au Maroc (Production)', libelle_ar: 'مبيعات المنتجات المصنعة بالمغرب', classe: 7, type: 'revenue', allow_entry: true },
  { code: '7124', libelle: 'Ventes de services et prestations au Maroc', libelle_ar: 'مبيعات الخدمات والمطعم بالمغرب', classe: 7, type: 'revenue', allow_entry: true },
  { code: '71321',libelle: 'Variation des stocks de produits finis fabriqués', libelle_ar: 'تغير مخزون المنتجات التامة الصنع', classe: 7, type: 'revenue', allow_entry: true },
  { code: '7142', libelle: 'Immobilisations produites par l’entreprise pour elle-même', libelle_ar: 'أصول ثابتة أنتجتها المنشأة لنفسها', classe: 7, type: 'revenue', allow_entry: true },
  { code: '7161', libelle: 'Subventions d’exploitation accordées', libelle_ar: 'إعانات الاستغلال المحصلة', classe: 7, type: 'revenue', allow_entry: true },
  { code: '7181', libelle: 'Produits divers d’exploitation', libelle_ar: 'عائدات استغلال متنوعة', classe: 7, type: 'revenue', allow_entry: true },
  { code: '7381', libelle: 'Intérêts et produits assimilés', libelle_ar: 'فوائد وعائدات مالية مماثلة', classe: 7, type: 'revenue', allow_entry: true },
  { code: '7581', libelle: 'Produits non courants divers (Dédits, Pénalités)', libelle_ar: 'مداخيل غير جارية وغرامات', classe: 7, type: 'revenue', allow_entry: true },
];

// Helper to look up account details
export function getAccountByCode(code: string): PlanAccount | undefined {
  return OFFICIAL_PCGM_ACCOUNTS.find(a => a.code === code);
}

export function formatAccountLabel(code: string): string {
  const acc = getAccountByCode(code);
  return acc ? `${acc.code} - ${acc.libelle}` : code;
}

// ============================================================================
// AUTO-GÉNÉRATEURS D'ÉCRITURES COMPTABLES
// ============================================================================

/**
 * Génère l'écriture comptable d'une Facture de Vente Client
 * Débit 3421 (Client TTC)
 * Crédit 7111 / 7121 (Ventes HT)
 * Crédit 4455 (TVA Facturée)
 */
export function generateSalesInvoiceJournalEntry(facture: Facture): JournalEntry {
  const ttc = Number(facture.montant_ttc) || 0;
  const ht = Number(facture.montant_ht) || (ttc / 1.2);
  const tva = Number(facture.montant_tva) || (ttc - ht);

  const lines: JournalEntryLine[] = [
    {
      id: `line-${facture.id}-3421`,
      account_code: '3421',
      account_label: formatAccountLabel('3421'),
      debit: ttc,
      credit: 0,
      libelle: `Client ${facture.client_nom} - Facture ${facture.numero}`,
      piece_ref: facture.numero,
    },
    {
      id: `line-${facture.id}-7111`,
      account_code: '7111',
      account_label: formatAccountLabel('7111'),
      debit: 0,
      credit: ht,
      libelle: `Vente marchandises HT - Facture ${facture.numero}`,
      piece_ref: facture.numero,
    },
  ];

  if (tva > 0.001) {
    lines.push({
      id: `line-${facture.id}-4455`,
      account_code: '4455',
      account_label: formatAccountLabel('4455'),
      debit: 0,
      credit: tva,
      libelle: `TVA facturée 20% - Facture ${facture.numero}`,
      piece_ref: facture.numero,
    });
  }

  return {
    numero: `ECJ-VTE-${facture.numero.replace(/[^a-zA-Z0-9]/g, '')}`,
    date: facture.date || new Date().toISOString().split('T')[0],
    journal_code: 'VTE',
    libelle: `Facture de vente n° ${facture.numero} - ${facture.client_nom}`,
    reference: facture.numero,
    status: 'valide',
    total_debit: ttc,
    total_credit: ttc,
    source_type: 'facture_vente',
    source_id: facture.id,
    lines,
    created_at: new Date().toISOString(),
  };
}

/**
 * Génère l'écriture comptable d'une Facture d'Achat Fournisseur
 * Débit 6111 / 6121 (Achats HT)
 * Débit 3455 (TVA Récupérable)
 * Crédit 4411 (Fournisseur TTC)
 */
export function generatePurchaseInvoiceJournalEntry(facture: any): JournalEntry {
  const ttc = Number(facture.montant_ttc) || Number(facture.total_ttc) || 0;
  const ht = Number(facture.montant_ht) || Number(facture.total_ht) || (ttc / 1.2);
  const tva = Number(facture.montant_tva) || (ttc - ht);
  const ref = facture.numero || facture.reference || `FAC-FOURN-${facture.id || Date.now()}`;
  const nomFourn = facture.fournisseur_nom || 'Fournisseur Divers';

  const lines: JournalEntryLine[] = [
    {
      id: `line-ach-${facture.id}-6111`,
      account_code: '6111',
      account_label: formatAccountLabel('6111'),
      debit: ht,
      credit: 0,
      libelle: `Achat marchandises ${nomFourn} - ${ref}`,
      piece_ref: ref,
    },
  ];

  if (tva > 0.001) {
    lines.push({
      id: `line-ach-${facture.id}-3455`,
      account_code: '3455',
      account_label: formatAccountLabel('3455'),
      debit: tva,
      credit: 0,
      libelle: `TVA récupérable sur achats - ${ref}`,
      piece_ref: ref,
    });
  }

  lines.push({
    id: `line-ach-${facture.id}-4411`,
    account_code: '4411',
    account_label: formatAccountLabel('4411'),
    debit: 0,
    credit: ttc,
    libelle: `Dette fournisseur ${nomFourn} - ${ref}`,
    piece_ref: ref,
  });

  return {
    numero: `ECJ-ACH-${ref.replace(/[^a-zA-Z0-9]/g, '')}`,
    date: facture.date || new Date().toISOString().split('T')[0],
    journal_code: 'ACH',
    libelle: `Facture d'achat ${ref} - ${nomFourn}`,
    reference: ref,
    status: 'valide',
    total_debit: ttc,
    total_credit: ttc,
    source_type: 'facture_achat',
    source_id: facture.id,
    lines,
    created_at: new Date().toISOString(),
  };
}

/**
 * Génère l'écriture comptable d'un Encaissement Client (Règlement)
 * Débit 5141 Banque ou 5161 Caisse
 * Crédit 3421 Client
 */
export function generateClientPaymentJournalEntry(reglement: Reglement): JournalEntry {
  const montant = Number(reglement.montant) || 0;
  const isCaisse = reglement.mode === 'Espèces';
  const journalCode: JournalCode = isCaisse ? 'CA' : 'BNQ';
  const compteTresorerie = isCaisse ? '5161' : '5141';
  const ref = reglement.reference || `REG-${reglement.id || Date.now()}`;

  const lines: JournalEntryLine[] = [
    {
      id: `line-reg-${reglement.id}-treso`,
      account_code: compteTresorerie,
      account_label: formatAccountLabel(compteTresorerie),
      debit: montant,
      credit: 0,
      libelle: `Encaissement ${reglement.client_nom} (${reglement.mode})`,
      piece_ref: ref,
    },
    {
      id: `line-reg-${reglement.id}-client`,
      account_code: '3421',
      account_label: formatAccountLabel('3421'),
      debit: 0,
      credit: montant,
      libelle: `Règlement Client ${reglement.client_nom} - ${ref}`,
      piece_ref: ref,
    },
  ];

  return {
    numero: `ECJ-ENC-${ref.replace(/[^a-zA-Z0-9]/g, '')}`,
    date: reglement.date || new Date().toISOString().split('T')[0],
    journal_code: journalCode,
    libelle: `Règlement client ${reglement.client_nom} - ${montant.toLocaleString('fr-MA')} MAD`,
    reference: ref,
    status: 'valide',
    total_debit: montant,
    total_credit: montant,
    source_type: 'reglement_client',
    source_id: reglement.id,
    lines,
    created_at: new Date().toISOString(),
  };
}

/**
 * Génère l'écriture comptable d'un Paiement Fournisseur (Décaissement)
 * Débit 4411 Fournisseur
 * Crédit 5141 Banque ou 5161 Caisse
 */
export function generateSupplierPaymentJournalEntry(paiement: any): JournalEntry {
  const montant = Number(paiement.montant) || 0;
  const isCaisse = paiement.mode === 'Espèces';
  const journalCode: JournalCode = isCaisse ? 'CA' : 'BNQ';
  const compteTresorerie = isCaisse ? '5161' : '5141';
  const ref = paiement.reference || paiement.numero_piece || `PAI-FOURN-${paiement.id || Date.now()}`;
  const nomFourn = paiement.fournisseur_nom || 'Fournisseur';

  const lines: JournalEntryLine[] = [
    {
      id: `line-paif-${paiement.id}-fourn`,
      account_code: '4411',
      account_label: formatAccountLabel('4411'),
      debit: montant,
      credit: 0,
      libelle: `Règlement Fournisseur ${nomFourn}`,
      piece_ref: ref,
    },
    {
      id: `line-paif-${paiement.id}-treso`,
      account_code: compteTresorerie,
      account_label: formatAccountLabel(compteTresorerie),
      debit: 0,
      credit: montant,
      libelle: `Décaissement ${nomFourn} (${paiement.mode || 'Virement'})`,
      piece_ref: ref,
    },
  ];

  return {
    numero: `ECJ-DEC-${ref.replace(/[^a-zA-Z0-9]/g, '')}`,
    date: paiement.date || new Date().toISOString().split('T')[0],
    journal_code: journalCode,
    libelle: `Paiement fournisseur ${nomFourn} - ${montant.toLocaleString('fr-MA')} MAD`,
    reference: ref,
    status: 'valide',
    total_debit: montant,
    total_credit: montant,
    source_type: 'paiement_fournisseur',
    source_id: paiement.id,
    lines,
    created_at: new Date().toISOString(),
  };
}

/**
 * Génère l'écriture comptable complète d'un Bulletin de Paie Marocain (LF 2026)
 * Débit 6171 (Salaires Bruts)
 * Débit 6174 (Charges patronales CNSS, AMO, Alloc fam, FP)
 * Débit 61743 (Charges patronales CIMR si affilié)
 * Crédit 4432 (Rémunérations dues au personnel - Salaire Net)
 * Crédit 4441 (CNSS & AMO globale : part salariale + part patronale)
 * Crédit 4443 (CIMR globale : part salariale + part patronale)
 * Crédit 44525 (État IR retenu à la source)
 */
export function generatePayrollJournalEntry(slip: PayrollSlip): JournalEntry {
  const lines: JournalEntryLine[] = [];
  const ref = `PAIE-${slip.periode_annee}-${String(slip.periode_mois).padStart(2, '0')}-${slip.matricule}`;

  // 1. Débit Charges de personnel : Salaire Brut
  lines.push({
    id: `paie-${slip.id || slip.matricule}-6171`,
    account_code: '6171',
    account_label: formatAccountLabel('6171'),
    debit: slip.salaire_brut,
    credit: 0,
    libelle: `Salaire brut ${slip.nom_complet} (${slip.periode_mois}/${slip.periode_annee})`,
    piece_ref: ref,
  });

  // 2. Débit Charges sociales patronales de base (CNSS, Alloc Fam, AMO, FP)
  const chargesPatronalesBase = slip.charges_patronales_cnss + slip.charges_patronales_alloc_fam + slip.charges_patronales_amo + slip.charges_patronales_fp;
  if (chargesPatronalesBase > 0) {
    lines.push({
      id: `paie-${slip.id || slip.matricule}-6174`,
      account_code: '6174',
      account_label: formatAccountLabel('6174'),
      debit: chargesPatronalesBase,
      credit: 0,
      libelle: `Charges patronales CNSS/AMO/Alloc ${slip.nom_complet}`,
      piece_ref: ref,
    });
  }

  // 3. Débit Charges patronales CIMR
  if (slip.charges_patronales_cimr > 0) {
    lines.push({
      id: `paie-${slip.id || slip.matricule}-61743`,
      account_code: '61743',
      account_label: formatAccountLabel('61743'),
      debit: slip.charges_patronales_cimr,
      credit: 0,
      libelle: `Cotisation patronale CIMR ${slip.nom_complet}`,
      piece_ref: ref,
    });
  }

  // 4. Crédit Net à payer au salarié
  lines.push({
    id: `paie-${slip.id || slip.matricule}-4432`,
    account_code: '4432',
    account_label: formatAccountLabel('4432'),
    debit: 0,
    credit: slip.salaire_net,
    libelle: `Net à payer ${slip.nom_complet} (${slip.matricule})`,
    piece_ref: ref,
  });

  // 5. Crédit Organismes sociaux CNSS & AMO (Part salariale + part patronale)
  const totalCNSS_AMO = slip.cotis_cnss_salariale + slip.cotis_amo_salariale + chargesPatronalesBase;
  if (totalCNSS_AMO > 0) {
    lines.push({
      id: `paie-${slip.id || slip.matricule}-4441`,
      account_code: '4441',
      account_label: formatAccountLabel('4441'),
      debit: 0,
      credit: totalCNSS_AMO,
      libelle: `Cotisations CNSS et AMO dues (Mois ${slip.periode_mois}/${slip.periode_annee})`,
      piece_ref: ref,
    });
  }

  // 6. Crédit Caisses de retraite CIMR (Part salariale + part patronale)
  const totalCIMR = slip.cotis_cimr_salariale + slip.charges_patronales_cimr;
  if (totalCIMR > 0) {
    lines.push({
      id: `paie-${slip.id || slip.matricule}-4443`,
      account_code: '4443',
      account_label: formatAccountLabel('4443'),
      debit: 0,
      credit: totalCIMR,
      libelle: `Cotisations retraite CIMR dues ${slip.nom_complet}`,
      piece_ref: ref,
    });
  }

  // 7. Crédit Retenue Impôt sur le Revenu (IR source)
  if (slip.ir_net > 0) {
    lines.push({
      id: `paie-${slip.id || slip.matricule}-44525`,
      account_code: '44525',
      account_label: formatAccountLabel('44525'),
      debit: 0,
      credit: slip.ir_net,
      libelle: `Retenue IR source ${slip.nom_complet}`,
      piece_ref: ref,
    });
  }

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

  return {
    numero: `ECJ-PAIE-${slip.periode_annee}${String(slip.periode_mois).padStart(2, '0')}-${slip.matricule}`,
    date: slip.date_paie || new Date().toISOString().split('T')[0],
    journal_code: 'PAIE',
    libelle: `Paie ${slip.nom_complet} (${slip.periode_mois}/${slip.periode_annee}) - Brut: ${slip.salaire_brut.toLocaleString('fr-MA')} MAD`,
    reference: ref,
    status: 'valide',
    total_debit: Math.round(totalDebit * 100) / 100,
    total_credit: Math.round(totalCredit * 100) / 100,
    source_type: 'paie',
    source_id: slip.id,
    lines,
    created_at: new Date().toISOString(),
  };
}

/**
 * Génère l'écriture comptable de Clôture de Fabrication (Manufacturing)
 * Débit 61241 (Variation stocks matières) / Crédit 3121 (Stock matières consommées)
 * Débit 3151 (Stock produits finis) / Crédit 71321 (Variation stocks produits finis)
 */
export function generateProductionJournalEntry(order: ProductionOrder): JournalEntry {
  const coutMatieres = order.cout_matieres || 0;
  const coutTotal = order.cout_total_production || coutMatieres;
  const ref = order.numero;

  const lines: JournalEntryLine[] = [];

  // 1. Déstockage matières premières consommées
  if (coutMatieres > 0) {
    lines.push({
      id: `prod-${order.id}-61241`,
      account_code: '61241',
      account_label: formatAccountLabel('61241'),
      debit: coutMatieres,
      credit: 0,
      libelle: `Consommation matières OF ${order.numero} (${order.produit_fini_nom})`,
      piece_ref: ref,
    });
    lines.push({
      id: `prod-${order.id}-3121`,
      account_code: '3121',
      account_label: formatAccountLabel('3121'),
      debit: 0,
      credit: coutMatieres,
      libelle: `Sortie stock matières premières - OF ${order.numero}`,
      piece_ref: ref,
    });
  }

  // 2. Entrée en stock des produits finis fabriqués
  if (coutTotal > 0) {
    lines.push({
      id: `prod-${order.id}-3151`,
      account_code: '3151',
      account_label: formatAccountLabel('3151'),
      debit: coutTotal,
      credit: 0,
      libelle: `Entrée stock ${order.quantite_reelle || order.quantite_prevue} ${order.unite} de ${order.produit_fini_nom}`,
      piece_ref: ref,
    });
    lines.push({
      id: `prod-${order.id}-71321`,
      account_code: '71321',
      account_label: formatAccountLabel('71321'),
      debit: 0,
      credit: coutTotal,
      libelle: `Production achevée et stockée - OF ${order.numero}`,
      piece_ref: ref,
    });
  }

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

  return {
    numero: `ECJ-OF-${order.numero.replace(/[^a-zA-Z0-9]/g, '')}`,
    date: order.date_cloture || order.date_lancement || new Date().toISOString().split('T')[0],
    journal_code: 'IMM',
    libelle: `Fabrication achevée ${order.produit_fini_nom} - OF ${order.numero}`,
    reference: ref,
    status: 'valide',
    total_debit: Math.round(totalDebit * 100) / 100,
    total_credit: Math.round(totalCredit * 100) / 100,
    source_type: 'production',
    source_id: order.id,
    lines,
    created_at: new Date().toISOString(),
  };
}

/**
 * Génère l'écriture de Dotation aux Amortissements d'une Immobilisation
 * Débit 6193 (Dotations d'exploitation aux amortissements)
 * Crédit 2834 (Amortissements du matériel de transport/bureau...)
 */
export function generateDepreciationJournalEntry(asset: FixedAsset, fiscalYear: number): JournalEntry {
  const dotationAnnuelle = Math.round((asset.valeur_acquisition * (asset.taux / 100)) * 100) / 100;
  const ref = `AMORT-${fiscalYear}-${asset.code}`;

  const lines: JournalEntryLine[] = [
    {
      id: `dot-${asset.id}-chg`,
      account_code: asset.compte_dotation || '6193',
      account_label: formatAccountLabel(asset.compte_dotation || '6193'),
      debit: dotationAnnuelle,
      credit: 0,
      libelle: `Dotation amortissement ${fiscalYear} - ${asset.designation}`,
      piece_ref: ref,
    },
    {
      id: `dot-${asset.id}-immo`,
      account_code: asset.compte_amortissement || '2834',
      account_label: formatAccountLabel(asset.compte_amortissement || '2834'),
      debit: 0,
      credit: dotationAnnuelle,
      libelle: `Amortissement cumulé - ${asset.designation}`,
      piece_ref: ref,
    },
  ];

  return {
    numero: `ECJ-DOT-${fiscalYear}-${asset.code}`,
    date: `${fiscalYear}-12-31`,
    journal_code: 'OD',
    libelle: `Dotation amortissement ${fiscalYear} : ${asset.designation}`,
    reference: ref,
    status: 'valide',
    total_debit: dotationAnnuelle,
    total_credit: dotationAnnuelle,
    source_type: 'amortissement',
    source_id: asset.id,
    lines,
    created_at: new Date().toISOString(),
  };
}

// ============================================================================
// ÉTATS FINANCIERS & LIASSE FISCALE MAROCAINE (CGNC)
// ============================================================================

export interface AccountBalance {
  code: string;
  libelle: string;
  classe: AccountClassId;
  type: string;
  total_debit: number;
  total_credit: number;
  solde_debit: number;
  solde_credit: number;
}

export function computeGeneralBalance(entries: JournalEntry[]): Record<string, AccountBalance> {
  const balance: Record<string, AccountBalance> = {};

  // Initialize from official PCGM
  OFFICIAL_PCGM_ACCOUNTS.forEach(acc => {
    balance[acc.code] = {
      code: acc.code,
      libelle: acc.libelle,
      classe: acc.classe,
      type: acc.type,
      total_debit: 0,
      total_credit: 0,
      solde_debit: 0,
      solde_credit: 0,
    };
  });

  // Aggregate journal lines
  entries.forEach(entry => {
    if (entry.status === 'brouillon') return; // Only validated entries
    entry.lines.forEach(line => {
      if (!balance[line.account_code]) {
        const cls = parseInt(line.account_code[0], 10) as AccountClassId;
        balance[line.account_code] = {
          code: line.account_code,
          libelle: line.account_label || formatAccountLabel(line.account_code),
          classe: (cls >= 1 && cls <= 7) ? cls : 6,
          type: 'expense',
          total_debit: 0,
          total_credit: 0,
          solde_debit: 0,
          solde_credit: 0,
        };
      }
      balance[line.account_code].total_debit += Number(line.debit) || 0;
      balance[line.account_code].total_credit += Number(line.credit) || 0;
    });
  });

  // Compute final balances
  Object.values(balance).forEach(item => {
    const diff = item.total_debit - item.total_credit;
    if (diff > 0) {
      item.solde_debit = diff;
      item.solde_credit = 0;
    } else {
      item.solde_debit = 0;
      item.solde_credit = Math.abs(diff);
    }
  });

  return balance;
}

// ── COMPTE DE PRODUITS ET CHARGES (CPC) ───────────────────────────────────────
export interface CPCResult {
  // I. Exploitation
  produits_exploitation: number; // 71
  charges_exploitation: number;  // 61
  resultat_exploitation: number; // I - II

  // II. Financier
  produits_financiers: number;   // 73
  charges_financieres: number;   // 63
  resultat_financier: number;

  // III. Courant
  resultat_courant: number;      // Exploitation + Financier

  // IV. Non courant
  produits_non_courants: number; // 75
  charges_non_courantes: number; // 65
  resultat_non_courant: number;

  // V. Fiscalité & Net
  resultat_avant_impot: number;
  impot_societes: number;        // 6701
  resultat_net: number;
}

export function calculateCPC(entries: JournalEntry[]): CPCResult {
  const balance = computeGeneralBalance(entries);

  let pdtExploitation = 0;
  let chgExploitation = 0;
  let pdtFinancier = 0;
  let chgFinancier = 0;
  let pdtNonCourant = 0;
  let chgNonCourant = 0;
  let impotIS = 0;

  Object.values(balance).forEach(acc => {
    const code = acc.code;
    const netCredit = acc.total_credit - acc.total_debit; // Revenues are credit
    const netDebit = acc.total_debit - acc.total_credit;   // Expenses are debit

    if (code.startsWith('71')) pdtExploitation += Math.max(0, netCredit);
    else if (code.startsWith('61')) chgExploitation += Math.max(0, netDebit);
    else if (code.startsWith('73')) pdtFinancier += Math.max(0, netCredit);
    else if (code.startsWith('63')) chgFinancier += Math.max(0, netDebit);
    else if (code.startsWith('75')) pdtNonCourant += Math.max(0, netCredit);
    else if (code.startsWith('65')) chgNonCourant += Math.max(0, netDebit);
    else if (code.startsWith('67')) impotIS += Math.max(0, netDebit);
  });

  const resExploitation = pdtExploitation - chgExploitation;
  const resFinancier = pdtFinancier - chgFinancier;
  const resCourant = resExploitation + resFinancier;
  const resNonCourant = pdtNonCourant - chgNonCourant;
  const resAvantImpot = resCourant + resNonCourant;
  const resNet = resAvantImpot - impotIS;

  return {
    produits_exploitation: Math.round(pdtExploitation * 100) / 100,
    charges_exploitation: Math.round(chgExploitation * 100) / 100,
    resultat_exploitation: Math.round(resExploitation * 100) / 100,
    produits_financiers: Math.round(pdtFinancier * 100) / 100,
    charges_financieres: Math.round(chgFinancier * 100) / 100,
    resultat_financier: Math.round(resFinancier * 100) / 100,
    resultat_courant: Math.round(resCourant * 100) / 100,
    produits_non_courants: Math.round(pdtNonCourant * 100) / 100,
    charges_non_courantes: Math.round(chgNonCourant * 100) / 100,
    resultat_non_courant: Math.round(resNonCourant * 100) / 100,
    resultat_avant_impot: Math.round(resAvantImpot * 100) / 100,
    impot_societes: Math.round(impotIS * 100) / 100,
    resultat_net: Math.round(resNet * 100) / 100,
  };
}

// ── BILAN MAROCAIN (ACTIF & PASSIF CGNC) ──────────────────────────────────────
export interface BilanRubrique {
  code: string;
  libelle: string;
  brut: number;
  amort_prov: number;
  net: number;
}

export interface BilanReport {
  actif: {
    immobilise: BilanRubrique[];
    circulant: BilanRubrique[];
    tresorerie: BilanRubrique[];
    total: number;
  };
  passif: {
    financement_permanent: BilanRubrique[];
    passif_circulant: BilanRubrique[];
    tresorerie: BilanRubrique[];
    total: number;
  };
  equilibre: boolean;
  ecart: number;
}

export function calculateBilan(entries: JournalEntry[]): BilanReport {
  const balance = computeGeneralBalance(entries);
  const cpc = calculateCPC(entries);

  // ACTIF
  const immoBrut = Object.values(balance).filter(a => a.code.startsWith('2') && !a.code.startsWith('28')).reduce((s, a) => s + a.solde_debit, 0);
  const immoAmort = Object.values(balance).filter(a => a.code.startsWith('28')).reduce((s, a) => s + a.solde_credit, 0);
  
  const stocks = Object.values(balance).filter(a => a.code.startsWith('31')).reduce((s, a) => s + a.solde_debit, 0);
  const creances = Object.values(balance).filter(a => a.code.startsWith('34') || a.code.startsWith('35')).reduce((s, a) => s + a.solde_debit, 0);
  const tresoActif = Object.values(balance).filter(a => a.code.startsWith('51')).reduce((s, a) => s + a.solde_debit, 0);

  const actifImmo: BilanRubrique[] = [
    { code: '21-25', libelle: 'Immobilisations (Incorporelles, Corporelles, Financières)', brut: immoBrut, amort_prov: immoAmort, net: immoBrut - immoAmort },
  ];
  const actifCirc: BilanRubrique[] = [
    { code: '31', libelle: 'Stocks (Marchandises, Matières, Produits finis)', brut: stocks, amort_prov: 0, net: stocks },
    { code: '34-35', libelle: 'Créances de l’actif circulant (Clients, État TVA, Acomptes)', brut: creances, amort_prov: 0, net: creances },
  ];
  const actifTreso: BilanRubrique[] = [
    { code: '51', libelle: 'Trésorerie - Actif (Banque, Caisse, Chèques)', brut: tresoActif, amort_prov: 0, net: tresoActif },
  ];

  const totalActif = (immoBrut - immoAmort) + stocks + creances + tresoActif;

  // PASSIF
  const capitauxPropres = Object.values(balance).filter(a => a.code.startsWith('11') && !a.code.startsWith('118')).reduce((s, a) => s + (a.solde_credit - a.solde_debit), 0);
  const dettesFinancement = Object.values(balance).filter(a => a.code.startsWith('14') || a.code.startsWith('15')).reduce((s, a) => s + a.solde_credit, 0);
  const dettesFournisseurs = Object.values(balance).filter(a => a.code.startsWith('441')).reduce((s, a) => s + a.solde_credit, 0);
  const dettesSocialesFiscales = Object.values(balance).filter(a => a.code.startsWith('443') || a.code.startsWith('444') || a.code.startsWith('445')).reduce((s, a) => s + a.solde_credit, 0);
  const tresoPassif = Object.values(balance).filter(a => a.code.startsWith('55')).reduce((s, a) => s + a.solde_credit, 0);

  const passifFinPerm: BilanRubrique[] = [
    { code: '11', libelle: 'Capitaux propres (Capital, Réserves, Report)', brut: capitauxPropres, amort_prov: 0, net: capitauxPropres },
    { code: '118', libelle: 'Résultat net de l’exercice (CPC)', brut: cpc.resultat_net, amort_prov: 0, net: cpc.resultat_net },
    { code: '14-15', libelle: 'Dettes de financement durable', brut: dettesFinancement, amort_prov: 0, net: dettesFinancement },
  ];
  const passifCirc: BilanRubrique[] = [
    { code: '441', libelle: 'Fournisseurs et comptes rattachés', brut: dettesFournisseurs, amort_prov: 0, net: dettesFournisseurs },
    { code: '443-445', libelle: 'Dettes sociales et fiscales (Personnel, CNSS, TVA due, IR)', brut: dettesSocialesFiscales, amort_prov: 0, net: dettesSocialesFiscales },
  ];
  const passifTreso: BilanRubrique[] = [
    { code: '55', libelle: 'Trésorerie - Passif (Crédits d’escompte et découverts)', brut: tresoPassif, amort_prov: 0, net: tresoPassif },
  ];

  const totalPassif = capitauxPropres + cpc.resultat_net + dettesFinancement + dettesFournisseurs + dettesSocialesFiscales + tresoPassif;
  const ecart = Math.round((totalActif - totalPassif) * 100) / 100;

  return {
    actif: {
      immobilise: actifImmo,
      circulant: actifCirc,
      tresorerie: actifTreso,
      total: Math.round(totalActif * 100) / 100,
    },
    passif: {
      financement_permanent: passifFinPerm,
      passif_circulant: passifCirc,
      tresorerie: passifTreso,
      total: Math.round(totalPassif * 100) / 100,
    },
    equilibre: Math.abs(ecart) < 0.05,
    ecart,
  };
}

// ── SIMPL-TVA (DGI MAROC) ──────────────────────────────────────────────────
export interface SimplTVABreakdown {
  taux: number;
  label: string;
  base_imposable: number;
  tva_facturee: number;
}

export interface SimplTVAReport {
  periode: string; // Ex: "09/2026"
  ventilation_collectee: SimplTVABreakdown[];
  total_tva_collectee: number;
  tva_deductible_charges: number;       // 3455
  tva_deductible_immobilisations: number;// 34551
  total_tva_deductible: number;
  credit_tva_precedent: number;
  tva_nette_due: number;
  credit_tva_a_reporter: number;
}

export function calculateSIMPLTVA(entries: JournalEntry[]): SimplTVAReport {
  let base20 = 0;
  let tva20 = 0;
  let tvaDeductibleCharges = 0;
  let tvaDeductibleImmo = 0;

  entries.forEach(entry => {
    if (entry.status === 'brouillon') return;
    entry.lines.forEach(line => {
      // Ventes
      if (line.account_code.startsWith('7111') || line.account_code.startsWith('7121')) {
        base20 += Number(line.credit) || 0;
      }
      if (line.account_code === '4455') {
        tva20 += Number(line.credit) || 0;
      }
      // Achats & déductions
      if (line.account_code === '3455') {
        tvaDeductibleCharges += Number(line.debit) || 0;
      }
      if (line.account_code === '34551') {
        tvaDeductibleImmo += Number(line.debit) || 0;
      }
    });
  });

  const totalCollectee = tva20;
  const totalDeductible = tvaDeductibleCharges + tvaDeductibleImmo;
  const solde = totalCollectee - totalDeductible;

  return {
    periode: `${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`,
    ventilation_collectee: [
      { taux: 20, label: 'Taux normal (20%) - Ventes et Prestations', base_imposable: Math.round(base20 * 100) / 100, tva_facturee: Math.round(tva20 * 100) / 100 },
      { taux: 14, label: 'Taux réduit (14%) - Électricité, Transport', base_imposable: 0, tva_facturee: 0 },
      { taux: 10, label: 'Taux réduit (10%) - Restauration, Hôtellerie', base_imposable: 0, tva_facturee: 0 },
      { taux: 7,  label: 'Taux super-réduit (7%) - Produits de base', base_imposable: 0, tva_facturee: 0 },
    ],
    total_tva_collectee: Math.round(totalCollectee * 100) / 100,
    tva_deductible_charges: Math.round(tvaDeductibleCharges * 100) / 100,
    tva_deductible_immobilisations: Math.round(tvaDeductibleImmo * 100) / 100,
    total_tva_deductible: Math.round(totalDeductible * 100) / 100,
    credit_tva_precedent: 0,
    tva_nette_due: solde > 0 ? Math.round(solde * 100) / 100 : 0,
    credit_tva_a_reporter: solde < 0 ? Math.round(Math.abs(solde) * 100) / 100 : 0,
  };
}

// ── SIMPL-IS (IMPÔT SUR LES SOCIÉTÉS & COTISATION MINIMALE) ──────────────────
export interface SimplISCalculation {
  chiffre_affaires_ht: number;
  resultat_fiscal_imposable: number;
  tranche_applicable: string;
  is_theorique: number;
  taux_cotisation_minimale: number; // 0.5% (0.005)
  cotisation_minimale: number;
  impot_du_definitif: number;
  acompte_trimestriel: number; // 25% de l'impôt dû
}

export function calculateSIMPLIS(entries: JournalEntry[]): SimplISCalculation {
  const cpc = calculateCPC(entries);
  const ca = cpc.produits_exploitation;
  const resultat = Math.max(0, cpc.resultat_avant_impot);

  // Barème progressif marocain (LF 2025/2026):
  // ≤ 300 000 DH : 10%
  // 300 001 à 1 000 000 DH : 20%
  // > 1 000 000 DH : 35%
  let isTheorique = 0;
  let tranche = '10% (≤ 300 000 DH)';

  if (resultat <= 300000) {
    isTheorique = resultat * 0.10;
    tranche = '10% (Tranche ≤ 300 000 DH)';
  } else if (resultat <= 1000000) {
    isTheorique = (300000 * 0.10) + ((resultat - 300000) * 0.20);
    tranche = '20% (Tranche 300 001 à 1 000 000 DH)';
  } else {
    isTheorique = (300000 * 0.10) + (700000 * 0.20) + ((resultat - 1000000) * 0.35);
    tranche = '35% (Tranche > 1 000 000 DH)';
  }

  // Cotisation Minimale (0.5% du CA avec plancher 3 000 DH)
  const cotisMinimale = Math.max(3000, ca * 0.005);
  const impotDefinitif = Math.max(isTheorique, cotisMinimale);

  return {
    chiffre_affaires_ht: Math.round(ca * 100) / 100,
    resultat_fiscal_imposable: Math.round(resultat * 100) / 100,
    tranche_applicable: tranche,
    is_theorique: Math.round(isTheorique * 100) / 100,
    taux_cotisation_minimale: 0.5,
    cotisation_minimale: Math.round(cotisMinimale * 100) / 100,
    impot_du_definitif: Math.round(impotDefinitif * 100) / 100,
    acompte_trimestriel: Math.round((impotDefinitif / 4) * 100) / 100,
  };
}

// ── EXPORT FIDUCIAIRE FEC / CSV ──────────────────────────────────────────────
export function generateFiduciaireExportCSV(entries: JournalEntry[]): string {
  const headers = [
    'JournalCode',
    'JournalLibelle',
    'EcritureNum',
    'EcritureDate',
    'CompteNum',
    'CompteLibelle',
    'PieceRef',
    'EcritureLibelle',
    'Debit',
    'Credit',
    'DateEcheance',
    'Lettrage'
  ];

  const rows: string[] = [headers.join(';')];

  entries.forEach(entry => {
    if (entry.status === 'brouillon') return;
    const jName = MOROCCAN_JOURNALS.find(j => j.code === entry.journal_code)?.nom || entry.journal_code;

    entry.lines.forEach(line => {
      rows.push([
        `"${entry.journal_code}"`,
        `"${jName}"`,
        `"${entry.numero}"`,
        `"${entry.date}"`,
        `"${line.account_code}"`,
        `"${(line.account_label || formatAccountLabel(line.account_code)).replace(/"/g, '""')}"`,
        `"${line.piece_ref || entry.reference || ''}"`,
        `"${(line.libelle || entry.libelle).replace(/"/g, '""')}"`,
        (line.debit || 0).toFixed(2).replace('.', ','),
        (line.credit || 0).toFixed(2).replace('.', ','),
        `"${entry.date}"`,
        `"${line.lettrage || ''}"`
      ].join(';'));
    });
  });

  return rows.join('\r\n');
}
