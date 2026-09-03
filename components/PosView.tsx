'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Utensils,
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Receipt,
  Tag,
  RefreshCw,
  X,
  Check,
  AlertTriangle,
  Clock,
  Printer,
  Lock,
  Unlock,
  Users,
  Eye,
  TrendingUp,
  ArrowRightLeft,
  ChefHat,
  Coffee,
  Sparkles,
  Edit2,
  Calendar,
  Layers,
  ArrowLeft,
  Wifi,
  WifiOff,
  Download,
  Upload,
  Maximize2,
  Minimize2,
  Camera,
  Image as ImageIcon,
  ShieldCheck,
  Percent,
  Tablet,
  Smartphone,
  Calculator,
  DownloadCloud,
  Cloud,
  CheckCircle2,
  ChevronRight,
  Sun,
  Moon
} from 'lucide-react';
import {
  PosTable,
  PosProduct,
  PosCategory,
  PosCartItem,
  PosSale,
  PosSession,
  PosDashboardStats,
  CompanyInfo,
  AppUser
} from '@/lib/types';
import { getTicketPrinterSettings, printPosTicket, printPosTicketBrowser, formatTicketDateTime } from '@/lib/ticket-printer';
import {
  fetchPosTables,
  fetchPosCategories,
  fetchPosProducts,
  fetchPosSales,
  fetchPosSessions,
  fetchPosDashboardStats,
  createPosSale,
  cancelPosSale,
  createPosProduct,
  updatePosProduct,
  deletePosProduct,
  togglePosProductDisponibilite,
  createPosCategory,
  createPosTable,
  updatePosTable,
  deletePosTable,
  savePosTableDraft,
  liberatePosTable,
  transferPosTableOrder,
  openPosSession,
  closePosSession,
  fetchCompanyInfo,
  exportSqliteDatabase
} from '@/lib/postgres-service';
import { usePwaInstall } from '@/lib/usePwaInstall';
import { PwaInstallModal } from '@/components/PwaInstallModal';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';

export type PosSubTab = 'TERMINAL' | 'TICKETS' | 'PRODUITS' | 'SESSIONS' | 'OFFLINE';

interface PosViewProps {
  initialSubTab?: PosSubTab;
  initialSubPage?: PosSubTab;
  onNavigateTab?: (tab: string) => void;
  currentUser?: AppUser | null;
  onLockScreen?: () => void;
  onExportSqlite?: () => void;
  onImportSqlite?: (file: File) => void;
}

export const PosView: React.FC<PosViewProps> = ({
  initialSubTab,
  initialSubPage = 'TERMINAL',
  onNavigateTab,
  currentUser,
  onLockScreen,
  onExportSqlite,
  onImportSqlite
}) => {
  const currentTargetTab = initialSubTab || initialSubPage || 'TERMINAL';
  const [internalTab, setInternalTab] = useState<PosSubTab | null>(null);
  const [prevTargetTab, setPrevTargetTab] = useState(currentTargetTab);

  if (prevTargetTab !== currentTargetTab) {
    setPrevTargetTab(currentTargetTab);
    setInternalTab(null);
  }

  const activeSubTab = internalTab ?? currentTargetTab;
  const setActiveSubTab = (tab: PosSubTab) => setInternalTab(tab);

  // PWA Install Hook & Modal state
  const { canInstall, isInstalled, isIOS, isIPad, install, showIosPrompt, setShowIosPrompt } = usePwaInstall();
  const [showPwaGuideModal, setShowPwaGuideModal] = useState(false);

  // iPad & Tablet Responsive View Mode (Portrait tab switch support)
  const [ipadViewTab, setIpadViewTab] = useState<'ADDITION' | 'CARTE'>('CARTE');

  // Full Screen Touch POS state
  const [isFullScreenPos, setIsFullScreenPos] = useState(currentUser?.role === 'CAISSE');
  const [rightPanelTab, setRightPanelTab] = useState<'CARTE' | 'TABLES'>('CARTE');
  const [posTheme, setPosTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('azulerp_pos_theme') || window.localStorage.getItem('verdeorto_pos_theme');
      if (saved === 'light' || saved === 'dark') {
        setPosTheme(saved);
      }
    }
  }, []);

  const togglePosTheme = () => {
    setPosTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('azulerp_pos_theme', next);
        window.localStorage.removeItem('verdeorto_pos_theme');
      }
      return next;
    });
  };

  // Network offline status detection
  const [isOnline, setIsOnline] = useState(true);
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Global POS data state
  const [tables, setTables] = useState<PosTable[]>([]);
  const [categories, setCategories] = useState<PosCategory[]>([]);
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [sales, setSales] = useState<PosSale[]>([]);
  const [sessions, setSessions] = useState<PosSession[]>([]);
  const [stats, setStats] = useState<PosDashboardStats | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Table Management State
  const [tableSearch, setTableSearch] = useState('');
  const [tableStatusFilter, setTableStatusFilter] = useState<'TOUS' | 'LIBRE' | 'OCCUPEE' | 'ADDITION'>('TOUS');
  const [activeTable, setActiveTable] = useState<PosTable | null>(null);
  const [showNewTableModal, setShowNewTableModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState<number | ''>('');

  // Order Terminal State (DEFAULT 1 COUVERT)
  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [nbCouverts, setNbCouverts] = useState<number>(1);
  const [typeCommande, setTypeCommande] = useState<'SUR_PLACE' | 'A_EMPORTER' | 'LIVRAISON'>('SUR_PLACE');
  const [notesCommande, setNotesCommande] = useState('');

  // Cart financial modifiers
  const [discountType, setDiscountType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [pourboire, setPourboire] = useState<number>(0);

  // Price Modification NumPad Modal State
  const [editingPriceIndex, setEditingPriceIndex] = useState<number | null>(null);
  const [priceNumpadValue, setPriceNumpadValue] = useState<string>('');

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [modeReglement, setModeReglement] = useState<'Espèces' | 'Carte Bancaire' | 'Chèque' | 'Mixte'>('Espèces');
  const [montantRecu, setMontantRecu] = useState<number>(0);
  const [referencePaiement, setReferencePaiement] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Receipt / Addition Print Preview Modal
  const [lastSale, setLastSale] = useState<PosSale | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptType, setReceiptType] = useState<'ADDITION' | 'TICKET_FINAL'>('TICKET_FINAL');
  const [isPrintingTicket, setIsPrintingTicket] = useState(false);

  // Kitchen note modal for items
  const [noteItemIndex, setNoteItemIndex] = useState<number | null>(null);
  const [tempItemNote, setTempItemNote] = useState('');

  // Product Management Modal (With Photo Upload & URL)
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<PosProduct | null>(null);
  const [productFormData, setProductFormData] = useState({
    code: '',
    nom: '',
    description: '',
    categorie_id: 1,
    prix_vente_ttc: 0,
    taux_tva: 20,
    temps_preparation_min: 15,
    disponible: 1,
    image_url: '',
    couleur: '#10b981',
    actif: 1,
  });

  // Table form data
  const [tableFormData, setTableFormData] = useState({
    numero: '',
    nom: '',
    zone: 'Salle',
    capacite: 4,
    serveur: 'Caisse',
    notes: '',
  });

  // Session / Shift Modal
  const [showOpenSessionModal, setShowOpenSessionModal] = useState(false);
  const [showCloseSessionModal, setShowCloseSessionModal] = useState(false);
  const [fondCaisseInput, setFondCaisseInput] = useState<number>(500);
  const [serviceInput, setServiceInput] = useState<'MIDI' | 'SOIR' | 'CONTINU'>('MIDI');
  const [montantReelClotureInput, setMontantReelClotureInput] = useState<number>(0);
  const [clotureNotesInput, setClotureNotesInput] = useState('');

  // Sales History Filter
  const [salesSearch, setSalesSearch] = useState('');
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<PosSale | null>(null);

  // Toast Notification
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3500);
  }, []);

  // Quick emergency SQLite download
  const handleQuickExportBackup = async () => {
    try {
      if (onExportSqlite) {
        onExportSqlite();
      } else {
        const u8 = await exportSqliteDatabase();
        const blob = new Blob([u8 as BlobPart], { type: 'application/x-sqlite3' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `azulerp_caisse_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      showToast('Sauvegarde de secours téléchargée avec succès.');
    } catch (err: any) {
      showToast('Erreur sauvegarde: ' + (err?.message || ''), 'error');
    }
  };

  // Load POS Data
  const loadAllData = useCallback(async () => {
    try {
      const [tList, cList, pList, sList, sessList, dStats, comp] = await Promise.all([
        fetchPosTables(),
        fetchPosCategories(),
        fetchPosProducts(true),
        fetchPosSales({ limit: 100 }),
        fetchPosSessions(),
        fetchPosDashboardStats(),
        fetchCompanyInfo(),
      ]);

      setTables(tList);
      setCategories(cList);
      setProducts(pList);
      setSales(sList);
      setSessions(sessList);
      setStats(dStats);
      setCompanyInfo(comp);
    } catch (err: any) {
      console.error('Erreur chargement données restaurant POS:', err);
      showToast('Impossible de charger les données: ' + (err?.message || ''), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        const [tList, cList, pList, sList, sessList, dStats, comp] = await Promise.all([
          fetchPosTables(),
          fetchPosCategories(),
          fetchPosProducts(true),
          fetchPosSales({ limit: 100 }),
          fetchPosSessions(),
          fetchPosDashboardStats(),
          fetchCompanyInfo(),
        ]);
        if (isMounted) {
          setTables(tList);
          setCategories(cList);
          setProducts(pList);
          setSales(sList);
          setSessions(sessList);
          setStats(dStats);
          setCompanyInfo(comp);
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) setLoading(false);
      }
    }
    init();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filtered tables
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      const matchSearch =
        tableSearch === '' ||
        t.numero.toLowerCase().includes(tableSearch.toLowerCase()) ||
        t.nom.toLowerCase().includes(tableSearch.toLowerCase());
      const matchStatus =
        tableStatusFilter === 'TOUS' ||
        (tableStatusFilter === 'LIBRE' && t.statut === 'LIBRE') ||
        (tableStatusFilter === 'OCCUPEE' && t.statut === 'OCCUPEE') ||
        (tableStatusFilter === 'ADDITION' && t.statut === 'ADDITION');
      return matchSearch && matchStatus;
    });
  }, [tables, tableSearch, tableStatusFilter]);

  // Filtered menu products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCategory = selectedCategory === null || p.categorie_id === selectedCategory;
      const matchSearch =
        productSearch === '' ||
        p.nom.toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(productSearch.toLowerCase())) ||
        p.code.toLowerCase().includes(productSearch.toLowerCase());
      const matchActive = p.actif === 1;
      return matchCategory && matchSearch && matchActive;
    });
  }, [products, selectedCategory, productSearch]);

  // Dish count per category
  const categoryDishCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    products.forEach((p) => {
      if (p.actif === 1 && typeof p.categorie_id === 'number') {
        counts[p.categorie_id] = (counts[p.categorie_id] || 0) + 1;
      }
    });
    return counts;
  }, [products]);

  // Selected Category Object
  const selectedCategoryObj = useMemo(() => {
    if (selectedCategory === null) return null;
    return categories.find((c) => c.id === selectedCategory) || null;
  }, [categories, selectedCategory]);

  // Price Modification Handlers
  const handleOpenPriceModifier = (index: number) => {
    const item = cart[index];
    if (!item) return;
    setEditingPriceIndex(index);
    setPriceNumpadValue(item.prix_unitaire_ttc.toString());
  };

  const handlePriceNumpadKey = (key: string) => {
    if (key === 'C') {
      setPriceNumpadValue('');
      return;
    }
    if (key === '⌫') {
      setPriceNumpadValue((prev) => (prev.length > 1 ? prev.slice(0, -1) : ''));
      return;
    }
    if (key === '.') {
      if (!priceNumpadValue.includes('.')) {
        setPriceNumpadValue((prev) => (prev === '' ? '0.' : `${prev}.`));
      }
      return;
    }
    if (key === '00') {
      if (priceNumpadValue !== '' && priceNumpadValue !== '0') {
        setPriceNumpadValue((prev) => `${prev}00`);
      }
      return;
    }
    if (priceNumpadValue === '0') {
      setPriceNumpadValue(key);
    } else {
      setPriceNumpadValue((prev) => `${prev}${key}`);
    }
  };

  const handleSaveModifiedPrice = () => {
    if (editingPriceIndex === null) return;
    const newUnitPrice = parseFloat(priceNumpadValue);
    if (isNaN(newUnitPrice) || newUnitPrice < 0) {
      showToast('Veuillez saisir un prix valide.', 'error');
      return;
    }

    setCart((prev) => {
      const updated = [...prev];
      const item = updated[editingPriceIndex];
      if (!item) return prev;

      const totalTtc = Number((item.quantite * newUnitPrice * (1 - (item.remise_pct || 0) / 100)).toFixed(2));
      const totalHt = Number((totalTtc / (1 + item.taux_tva / 100)).toFixed(2));
      const totalTva = Number((totalTtc - totalHt).toFixed(2));

      updated[editingPriceIndex] = {
        ...item,
        prix_unitaire_ttc: newUnitPrice,
        total_ht: totalHt,
        total_tva: totalTva,
        total_ttc: totalTtc,
      };
      return updated;
    });

    showToast(`Prix modifié : ${newUnitPrice.toFixed(2)} DH`);
    setEditingPriceIndex(null);
    setPriceNumpadValue('');
  };

  // Select a table (defaults to 1 couvert)
  const handleSelectTable = (table: PosTable) => {
    setActiveTable(table);
    setNbCouverts(table.nb_couverts > 0 ? table.nb_couverts : 1);
    setTypeCommande('SUR_PLACE');
    setNotesCommande(table.notes || '');
    setDiscountValue(0);
    setPourboire(0);

    if (table.commande_json) {
      try {
        const parsed = JSON.parse(table.commande_json);
        if (Array.isArray(parsed)) {
          setCart(parsed);
        } else {
          setCart([]);
        }
      } catch (e) {
        setCart([]);
      }
    } else {
      setCart([]);
    }
    // Switch right panel to Menu so waiter/cashier can immediately pick dishes
    setRightPanelTab('CARTE');
  };

  const handleDirectCounterSale = () => {
    setActiveTable(null);
    setTypeCommande('A_EMPORTER');
    setNbCouverts(1);
    setNotesCommande('');
    setCart([]);
    setDiscountValue(0);
    setPourboire(0);
    setRightPanelTab('CARTE');
  };

  const handleSaveDraftTable = async (statusOverride?: 'LIBRE' | 'OCCUPEE' | 'ADDITION') => {
    if (!activeTable) {
      showToast('Vente comptoir réinitialisée.', 'info');
      setActiveTable(null);
      setCart([]);
      return;
    }

    try {
      const statusToSet = statusOverride || (cart.length > 0 ? 'OCCUPEE' : 'LIBRE');
      await savePosTableDraft(
        activeTable.id,
        cart,
        nbCouverts || 1,
        'Caisse',
        notesCommande,
        statusToSet
      );
      showToast(`Table ${activeTable.numero} sauvegardée.`);
      setActiveTable(null);
      setCart([]);
      setRightPanelTab('TABLES');
      await loadAllData();
    } catch (err: any) {
      showToast('Erreur sauvegarde: ' + err.message, 'error');
    }
  };

  const handleAddToCart = (product: PosProduct) => {
    if (product.disponible === 0) {
      showToast(`${product.nom} est indisponible / en rupture !`, 'error');
      return;
    }

    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.produit_id === product.id && !item.notes);

      if (existingIndex > -1) {
        const updated = [...prev];
        const current = updated[existingIndex];
        const newQty = current.quantite + 1;
        const totalTtc = Number((newQty * current.prix_unitaire_ttc * (1 - (current.remise_pct || 0) / 100)).toFixed(2));
        const totalHt = Number((totalTtc / (1 + current.taux_tva / 100)).toFixed(2));
        const totalTva = Number((totalTtc - totalHt).toFixed(2));

        updated[existingIndex] = {
          ...current,
          quantite: newQty,
          total_ht: totalHt,
          total_tva: totalTva,
          total_ttc: totalTtc,
        };
        return updated;
      } else {
        const qty = 1;
        const totalTtc = Number((qty * product.prix_vente_ttc).toFixed(2));
        const totalHt = Number((totalTtc / (1 + (product.taux_tva || 20) / 100)).toFixed(2));
        const totalTva = Number((totalTtc - totalHt).toFixed(2));

        const newItem: PosCartItem = {
          produit_id: product.id,
          produit_code: product.code,
          produit_nom: product.nom,
          prix_unitaire_ttc: product.prix_vente_ttc,
          taux_tva: product.taux_tva ?? 20,
          quantite: qty,
          remise_pct: 0,
          total_ht: totalHt,
          total_tva: totalTva,
          total_ttc: totalTtc,
          notes: '',
          suite: false,
        };
        return [...prev, newItem];
      }
    });
  };

  const handleUpdateItemQty = (index: number, delta: number) => {
    setCart((prev) => {
      const item = prev[index];
      if (!item) return prev;
      const newQty = item.quantite + delta;

      if (newQty <= 0) {
        return prev.filter((_, i) => i !== index);
      }

      const totalTtc = Number((newQty * item.prix_unitaire_ttc * (1 - (item.remise_pct || 0) / 100)).toFixed(2));
      const totalHt = Number((totalTtc / (1 + item.taux_tva / 100)).toFixed(2));
      const totalTva = Number((totalTtc - totalHt).toFixed(2));

      const updated = [...prev];
      updated[index] = {
        ...item,
        quantite: newQty,
        total_ht: totalHt,
        total_tva: totalTva,
        total_ttc: totalTtc,
      };
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const handleToggleSuite = (index: number) => {
    setCart((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], suite: !updated[index].suite };
      }
      return updated;
    });
  };

  const handleOpenItemNote = (index: number) => {
    setNoteItemIndex(index);
    setTempItemNote(cart[index]?.notes || '');
  };

  const handleSaveItemNote = () => {
    if (noteItemIndex === null) return;
    setCart((prev) => {
      const updated = [...prev];
      if (updated[noteItemIndex]) {
        updated[noteItemIndex] = { ...updated[noteItemIndex], notes: tempItemNote.trim() };
      }
      return updated;
    });
    setNoteItemIndex(null);
    setTempItemNote('');
  };

  // Calculations
  const orderCalculations = useMemo(() => {
    const subtotalTtc = cart.reduce((acc, item) => acc + item.total_ttc, 0);
    const subtotalHt = cart.reduce((acc, item) => acc + item.total_ht, 0);
    const subtotalTva = cart.reduce((acc, item) => acc + item.total_tva, 0);

    let remiseMontant = 0;
    if (discountValue > 0) {
      if (discountType === 'PERCENT') {
        remiseMontant = Number(((subtotalTtc * discountValue) / 100).toFixed(2));
      } else {
        remiseMontant = Math.min(discountValue, subtotalTtc);
      }
    }

    const netAPayer = Math.max(0, Number((subtotalTtc - remiseMontant + (pourboire || 0)).toFixed(2)));
    const itemsCount = cart.reduce((acc, item) => acc + item.quantite, 0);

    return {
      subtotalTtc,
      subtotalHt,
      subtotalTva,
      remiseMontant,
      netAPayer,
      itemsCount,
      pourboire,
    };
  }, [cart, discountType, discountValue, pourboire]);

  // Payment
  const handleOpenPayment = () => {
    if (cart.length === 0) {
      showToast('Ajoutez au moins un plat avant d’encaisser.', 'error');
      return;
    }
    setMontantRecu(orderCalculations.netAPayer);
    setShowPaymentModal(true);
  };

  // Tactile On-Screen Numpad for iPad / Tablet Caisse
  const handleNumpadDigit = (digit: string) => {
    if (digit === 'C') {
      setMontantRecu(0);
      return;
    }
    if (digit === '⌫') {
      const str = String(montantRecu);
      const nextStr = str.length > 1 ? str.slice(0, -1) : '0';
      setMontantRecu(Number(nextStr) || 0);
      return;
    }
    if (digit === 'EXACT') {
      setMontantRecu(orderCalculations.netAPayer);
      return;
    }
    if (digit === '00') {
      if (montantRecu > 0) {
        setMontantRecu(Number(`${montantRecu}00`));
      }
      return;
    }
    const currentStr = montantRecu === 0 ? '' : String(montantRecu);
    const newStr = `${currentStr}${digit}`;
    setMontantRecu(Number(newStr) || 0);
  };

  const handlePrintAdditionPreview = () => {
    if (cart.length === 0) {
      showToast('Commande vide.', 'error');
      return;
    }

    const additionMock: PosSale = {
      id: 0,
      numero_ticket: `ADD-${activeTable?.numero || 'COMPTOIR'}-${Date.now().toString().slice(-4)}`,
      table_id: activeTable?.id,
      table_numero: activeTable?.numero || 'Comptoir',
      zone: 'Salle',
      type_commande: typeCommande,
      nb_couverts: nbCouverts || 1,
      serveur: 'Caisse',
      date_vente: new Date().toISOString().replace('T', ' ').slice(0, 19),
      heure_commande: activeTable?.heure_ouverture || new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      heure_paiement: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      client_nom: activeTable ? `Table ${activeTable.numero}` : 'Client Restaurant',
      total_ht: orderCalculations.subtotalHt,
      total_tva: orderCalculations.subtotalTva,
      tva_20: orderCalculations.subtotalTva,
      tva_10: 0,
      tva_7: 0,
      tva_0: 0,
      total_ttc: orderCalculations.subtotalTtc,
      remise_globale_montant: orderCalculations.remiseMontant,
      pourboire: orderCalculations.pourboire,
      montant_net_a_payer: orderCalculations.netAPayer,
      montant_donne: orderCalculations.netAPayer,
      montant_rendu: 0,
      mode_reglement: 'En attente',
      statut: 'EN_COURS',
      caissier: 'Caisse',
      notes: notesCommande,
      lignes: cart,
    };

    setLastSale(additionMock);
    setReceiptType('ADDITION');
    setShowReceiptModal(false);

    printPosTicket(additionMock, companyInfo, 'ADDITION').then((res) => {
      if (res.success) {
        showToast(`Addition imprimée sur l'imprimante.`);
      }
    }).catch(() => {});

    if (activeTable) {
      handleSaveDraftTable('ADDITION');
    }
  };

  const handleConfirmPayment = async () => {
    if (isProcessingPayment) return;

    try {
      setIsProcessingPayment(true);

      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      const tableTag = activeTable?.numero ? `T${activeTable.numero}` : 'CPT';
      const ticketNum = `TCK-${tableTag}-${Date.now().toString().slice(-6)}`;

      const currentActiveSession = stats?.session_active || sessions.find((s) => s.statut === 'OUVERTE');

      const saleData: Partial<PosSale> = {
        numero_ticket: ticketNum,
        session_id: currentActiveSession?.id,
        table_id: activeTable?.id,
        table_numero: activeTable?.numero || 'Comptoir',
        zone: activeTable?.zone || 'Salle',
        type_commande: typeCommande,
        nb_couverts: nbCouverts || 1,
        serveur: 'Caisse',
        date_vente: dateStr,
        heure_commande: activeTable?.heure_ouverture || timeStr,
        heure_paiement: timeStr,
        client_nom: activeTable ? `Table ${activeTable.numero}` : 'Client Restaurant',
        total_ht: orderCalculations.subtotalHt,
        total_tva: orderCalculations.subtotalTva,
        tva_20: orderCalculations.subtotalTva,
        tva_10: 0,
        tva_7: 0,
        tva_0: 0,
        total_ttc: orderCalculations.subtotalTtc,
        remise_globale_montant: orderCalculations.remiseMontant,
        pourboire: orderCalculations.pourboire,
        montant_net_a_payer: orderCalculations.netAPayer,
        montant_donne: montantRecu,
        montant_rendu: Math.max(0, Number((montantRecu - orderCalculations.netAPayer).toFixed(2))),
        mode_reglement: modeReglement,
        reference_paiement: referencePaiement.trim() || undefined,
        statut: 'PAYE',
        caissier: 'Caisse',
        notes: notesCommande.trim() || undefined,
        lignes: cart,
      };

      const completedSale = await createPosSale(saleData, cart);

      showToast(`Encaissement réussi ! Ticket ${completedSale.numero_ticket} validé.`);

      setActiveTable(null);
      setCart([]);
      setDiscountValue(0);
      setPourboire(0);
      setShowPaymentModal(false);
      setRightPanelTab('TABLES');

      setLastSale(completedSale);
      setReceiptType('TICKET_FINAL');
      setShowReceiptModal(false);

      // Automatically trigger thermal print immediately on encaissement
      printPosTicket(completedSale, companyInfo, 'TICKET_FINAL').then((res) => {
        if (res.success) {
          showToast(`Ticket ${completedSale.numero_ticket} imprimé.`);
        }
      }).catch(() => {});

      await loadAllData();
    } catch (err: any) {
      showToast("Erreur lors de l'encaissement: " + (err?.message || ''), 'error');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Product Photo Upload handler
  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setProductFormData((prev) => ({ ...prev, image_url: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedCat = categories.find((c) => c.id === productFormData.categorie_id);
      const payload = {
        ...productFormData,
        categorie_nom: selectedCat?.nom || 'Plats',
      };

      if (editingProduct) {
        await updatePosProduct({ ...payload, id: editingProduct.id });
        showToast(`Plat "${payload.nom}" mis à jour.`);
      } else {
        await createPosProduct(payload);
        showToast(`Plat "${payload.nom}" ajouté à la carte.`);
      }

      setShowProductModal(false);
      setEditingProduct(null);
      await loadAllData();
    } catch (err: any) {
      showToast('Erreur enregistrement plat: ' + err.message, 'error');
    }
  };

  // Status Badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'LIBRE':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Libre</span>;
      case 'OCCUPEE':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 animate-pulse">Occupée</span>;
      case 'ADDITION':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">Addition</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  // ==========================================================================
  // RENDER: FULL SCREEN POS TERMINAL (LEFT ADDITION, RIGHT TABLES & PRODUCTS)
  // ==========================================================================
  if (isFullScreenPos) {
    return (
      <div className={`fixed inset-0 z-50 flex flex-col font-sans select-none overflow-hidden ${
        posTheme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}>
        {/* Toast Notification */}
        {notification && (
          <div
            className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold transition-all border ${
              notification.type === 'error'
                ? 'bg-rose-950 border-rose-500 text-rose-200'
                : notification.type === 'info'
                ? 'bg-blue-950 border-blue-500 text-blue-200'
                : 'bg-emerald-950 border-emerald-500 text-emerald-200'
            }`}
          >
            {notification.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
            <span>{notification.message}</span>
          </div>
        )}

        {/* FULL SCREEN TOP HEADER BAR */}
        <header className={`h-14 px-3 sm:px-4 flex items-center justify-between shrink-0 select-none border-b transition-colors ${
          posTheme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-md">
                <Utensils className="w-4 h-4" />
              </div>
              <div>
                <span className={`text-xs sm:text-sm font-black ${posTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{companyInfo?.nom || 'Verde Orto'}</span>
                <span className={`hidden sm:inline-block text-[10px] font-bold ml-2 px-1.5 py-0.5 rounded border ${
                  posTheme === 'dark'
                    ? 'text-emerald-400 bg-emerald-950/80 border-emerald-800'
                    : 'text-emerald-700 bg-emerald-50 border-emerald-300'
                }`}>
                  POS iPad & Touch
                </span>
              </div>
            </div>

            {/* Offline / Online Status Indicator */}
            <div
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-bold border ${
                isOnline
                  ? posTheme === 'dark'
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : posTheme === 'dark'
                    ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                    : 'bg-amber-50 border-amber-300 text-amber-800'
              }`}
              title={isOnline ? 'Base SQLite synchronisée localement' : 'Mode 100% Hors-Ligne autonome'}
            >
              {isOnline ? <Wifi className="w-3 h-3 text-emerald-500" /> : <WifiOff className="w-3 h-3 text-amber-500" />}
              <span className="hidden sm:inline">{isOnline ? 'En Ligne' : 'Hors-Ligne (SQLite)'}</span>
            </div>
          </div>

          {/* iPad Portrait Screen Switcher (Addition vs Carte/Salle) */}
          <div className={`flex md:hidden items-center p-1 rounded-xl border ${
            posTheme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              type="button"
              onClick={() => setIpadViewTab('CARTE')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                ipadViewTab === 'CARTE'
                  ? 'bg-emerald-600 text-white shadow'
                  : posTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              Plats & Tables
            </button>
            <button
              type="button"
              onClick={() => setIpadViewTab('ADDITION')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                ipadViewTab === 'ADDITION'
                  ? 'bg-emerald-600 text-white shadow'
                  : posTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              <span>Addition</span>
              {cart.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-400 text-slate-950 text-[10px] font-black">
                  {orderCalculations.itemsCount}
                </span>
              )}
            </button>
          </div>

          {/* Center Table & Direct Order Info */}
          <div className="hidden md:flex items-center gap-3">
            <div className={`flex items-center gap-2 border px-3.5 py-1.5 rounded-xl ${
              posTheme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}>
              <span className="text-xs font-bold">
                {activeTable ? `Table ${activeTable.numero} (${activeTable.nom})` : 'Vente Directe / Comptoir'}
              </span>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Clôturer Service / Caisse Z Button */}
            <button
              type="button"
              onClick={() => {
                if (stats?.session_active) {
                  setMontantReelClotureInput(
                    stats.session_active.fond_caisse_ouverture + stats.session_active.total_especes
                  );
                  setShowCloseSessionModal(true);
                } else {
                  setShowOpenSessionModal(true);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600/90 hover:bg-rose-600 active:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md border border-rose-500/40 transition active:scale-95 cursor-pointer"
              title="Clôturer le service et imprimer le rapport Z"
            >
              <Lock className="w-3.5 h-3.5 text-rose-200" />
              <span>Clôturer</span>
            </button>

            {/* Real-time Cloud Sync Badge */}
            <SyncStatusBadge onDataReload={loadAllData} />

            {/* Quick SQLite Export Backup */}
            <button
              type="button"
              onClick={handleQuickExportBackup}
              title="Sauvegarder les données de caisse sur fichier d'urgence (.sqlite)"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                posTheme === 'dark'
                  ? 'bg-slate-800 hover:bg-slate-700 active:bg-blue-600 text-slate-200 border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 active:bg-blue-600 text-slate-700 border-slate-300'
              }`}
            >
              <Download className="w-3.5 h-3.5 text-blue-500" />
              <span className="hidden xl:inline">Sauvegarde Fichier</span>
            </button>

            {/* Lock Screen with PIN */}
            {onLockScreen && (
              <button
                type="button"
                onClick={onLockScreen}
                title="Verrouiller la session (Déverrouillage par Code PIN)"
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                  posTheme === 'dark'
                    ? 'bg-slate-800 hover:bg-amber-600 text-slate-200 hover:text-white border-slate-700'
                    : 'bg-slate-100 hover:bg-amber-500 text-slate-700 hover:text-white border-slate-300'
                }`}
              >
                <Lock className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden lg:inline">Verrouiller</span>
              </button>
            )}

            {/* Theme Toggle (☀️ Clair / 🌙 Sombre) */}
            <button
              type="button"
              onClick={togglePosTheme}
              title={posTheme === 'dark' ? 'Passer en Mode Clair' : 'Passer en Mode Sombre'}
              className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition border cursor-pointer ${
                posTheme === 'dark'
                  ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
              }`}
            >
              {posTheme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-amber-700" />}
              <span className="hidden sm:inline">{posTheme === 'dark' ? 'Clair' : 'Sombre'}</span>
            </button>

            {/* Exit Full Screen */}
            <button
              type="button"
              onClick={() => setIsFullScreenPos(false)}
              className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition border cursor-pointer ${
                posTheme === 'dark'
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-300'
              }`}
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Quitter</span>
            </button>
          </div>
        </header>

        {/* MAIN BODY: ADDITION ON THE LEFT, TABLES & PRODUCTS ON THE RIGHT */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          
          {/* ================================================================ */}
          {/* LEFT PANEL: L'ADDITION / TICKET DE CAISSE (380px - 420px) */}
          {/* ================================================================ */}
          <div className={`w-full md:w-[390px] lg:w-[430px] flex-col shrink-0 h-full overflow-hidden border-r transition-colors ${
            posTheme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          } ${
            ipadViewTab === 'ADDITION' ? 'flex' : 'hidden md:flex'
          }`}>
            {/* Addition Top Bar */}
            <div className={`p-3 border-b flex items-center justify-between transition-colors ${
              posTheme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-500" />
                <span className={`text-sm font-bold ${posTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  L'Addition ({orderCalculations.itemsCount} plat{orderCalculations.itemsCount > 1 ? 's' : ''})
                </span>
              </div>
              <div className="flex items-center gap-2">
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setCart([]);
                      showToast('Ticket vidé.');
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
                  >
                    Vider
                  </button>
                )}
                <span className="text-xs font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                  {typeCommande === 'SUR_PLACE' ? 'Sur Place' : 'À Emporter'}
                </span>
              </div>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 p-3 overflow-y-auto space-y-2">
              {cart.length === 0 ? (
                <div className={`h-full flex flex-col items-center justify-center text-center p-6 ${
                  posTheme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  <Utensils className={`w-12 h-12 mb-3 ${posTheme === 'dark' ? 'text-slate-700' : 'text-slate-300'}`} />
                  <p className={`text-sm font-bold ${posTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Aucun plat sélectionné</p>
                  <p className={`text-xs mt-1 max-w-[240px] ${posTheme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                    Sélectionnez une catégorie à droite puis touchez les plats pour composer l'addition.
                  </p>
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div
                    key={`${item.produit_id}-${idx}`}
                    className={`p-2.5 rounded-xl border text-xs transition ${
                      posTheme === 'dark'
                        ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        : 'bg-white border-slate-200 shadow-xs hover:border-emerald-400'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-bold ${posTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{item.produit_nom}</span>
                        </div>
                        <div className={`text-[11px] mt-0.5 ${posTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                          {item.prix_unitaire_ttc.toFixed(2)} DH / u
                        </div>
                      </div>
                      <div className="text-right font-black text-sm text-emerald-600 dark:text-emerald-400">
                        {item.total_ttc.toFixed(2)} DH
                      </div>
                    </div>

                    {/* Quantity Controls & Modifier Prix */}
                    <div className={`mt-2 pt-2 border-t flex items-center justify-between gap-2 ${
                      posTheme === 'dark' ? 'border-slate-800/80' : 'border-slate-150'
                    }`}>
                      <div className={`flex items-center gap-1 rounded-lg p-0.5 border ${
                        posTheme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-250'
                      }`}>
                        <button
                          type="button"
                          onClick={() => handleUpdateItemQty(idx, -1)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition active:scale-95 cursor-pointer ${
                            posTheme === 'dark'
                              ? 'bg-slate-800 hover:bg-slate-700 active:bg-emerald-600 text-white'
                              : 'bg-white hover:bg-slate-50 active:bg-emerald-600 text-slate-800 shadow-xs'
                          }`}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className={`w-8 text-center font-black text-sm ${posTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          {item.quantite}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateItemQty(idx, 1)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition active:scale-95 cursor-pointer ${
                            posTheme === 'dark'
                              ? 'bg-slate-800 hover:bg-slate-700 active:bg-emerald-600 text-white'
                              : 'bg-white hover:bg-slate-50 active:bg-emerald-600 text-slate-800 shadow-xs'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Modifier Prix Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenPriceModifier(idx)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${
                            posTheme === 'dark'
                              ? 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-amber-500/40 hover:border-amber-400'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 shadow-xs'
                          }`}
                        >
                          <Edit2 className="w-3.5 h-3.5 text-amber-500" />
                          <span>Modifier Prix</span>
                        </button>

                        {/* Delete item */}
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          title="Supprimer la ligne"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Addition Totals & Actions */}
            <div className={`p-3.5 border-t space-y-3 transition-colors ${
              posTheme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="space-y-1 text-xs">
                <div className={`flex justify-between ${posTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  <span>Total HT</span>
                  <span>{orderCalculations.subtotalHt.toFixed(2)} DH</span>
                </div>
                <div className={`flex justify-between ${posTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  <span>TVA (20%)</span>
                  <span>{orderCalculations.subtotalTva.toFixed(2)} DH</span>
                </div>
                {orderCalculations.remiseMontant > 0 && (
                  <div className="flex justify-between text-amber-600 dark:text-amber-400 font-bold">
                    <span>Remise</span>
                    <span>-{orderCalculations.remiseMontant.toFixed(2)} DH</span>
                  </div>
                )}
                <div className={`flex justify-between text-base font-black pt-1 border-t ${
                  posTheme === 'dark' ? 'text-white border-slate-800' : 'text-slate-900 border-slate-200'
                }`}>
                  <span>Net à Payer</span>
                  <span className="text-emerald-600 dark:text-emerald-400 text-lg">
                    {orderCalculations.netAPayer.toFixed(2)} DH
                  </span>
                </div>
              </div>

              {/* Action Buttons: Juste Encaisser et Mettre en Attente */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="btn-pos-encaisser"
                  onClick={handleOpenPayment}
                  disabled={cart.length === 0}
                  className="py-3.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-950/30 flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
                >
                  <Banknote className="w-5 h-5" />
                  <span>ENCAISSER</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveDraftTable()}
                  className={`py-3.5 font-bold text-xs rounded-xl border flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer ${
                    posTheme === 'dark'
                      ? 'bg-slate-800 hover:bg-slate-700 active:bg-blue-600 text-slate-200 border-slate-700'
                      : 'bg-white hover:bg-slate-100 active:bg-blue-600 text-slate-700 border-slate-300 shadow-xs'
                  }`}
                >
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span>Mettre en Attente</span>
                </button>
              </div>
            </div>
          </div>

          {/* ================================================================ */}
          {/* RIGHT PANEL: PLAN DE SALLE & CARTE DES PRODUITS AVEC PHOTOS */}
          {/* ================================================================ */}
          <div className={`flex-1 flex-col overflow-hidden transition-colors ${
            posTheme === 'dark' ? 'bg-slate-950' : 'bg-slate-100'
          } ${
            ipadViewTab === 'CARTE' ? 'flex' : 'hidden md:flex'
          }`}>
            
            {/* Right Sub-Header Navigation */}
            <div className={`p-3 border-b flex items-center justify-between gap-3 transition-colors ${
              posTheme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
            }`}>
              <div className={`flex items-center gap-1.5 p-1 rounded-xl border ${
                posTheme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}>
                <button
                  type="button"
                  onClick={() => setRightPanelTab('CARTE')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                    rightPanelTab === 'CARTE'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : posTheme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Carte & Menu ({products.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRightPanelTab('TABLES')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                    rightPanelTab === 'TABLES'
                      ? 'bg-blue-600 text-white shadow-md'
                      : posTheme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Utensils className="w-3.5 h-3.5" />
                  <span>Plan de Salle ({tables.length} tables)</span>
                </button>
              </div>

              {/* Direct Counter / Walk-in order button */}
              <button
                type="button"
                onClick={handleDirectCounterSale}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700/80 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition border border-emerald-600/50 shadow-sm active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Vente Directe</span>
              </button>
            </div>

            {/* VIEW A: CARTE & PRODUITS WITH CATEGORY NAVIGATION */}
            {rightPanelTab === 'CARTE' && (
              <div className="flex-1 flex flex-col overflow-hidden pb-16 md:pb-0">
                {/* 1. CATEGORIES TILES GRID (When no category selected and not searching) */}
                {selectedCategory === null && productSearch.trim() === '' ? (
                  <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                    {/* Search Bar */}
                    <div className="p-3 pb-2">
                      <div className="relative">
                        <Search className={`w-4 h-4 absolute left-3.5 top-3 ${posTheme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                        <input
                          type="text"
                          placeholder="Rechercher un plat, ingrédient ou boisson..."
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          className={`w-full pl-10 pr-3 py-2.5 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 transition ${
                            posTheme === 'dark'
                              ? 'bg-slate-900 border border-slate-800 text-white placeholder-slate-500'
                              : 'bg-white border border-slate-200 text-slate-900 placeholder-slate-400 shadow-xs'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Category Selection Title */}
                    <div className={`px-3.5 py-1 text-xs font-bold flex items-center justify-between ${
                      posTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      <span>Choisissez une Catégorie</span>
                      <span>{categories.length} catégories</span>
                    </div>

                    {/* Categories Touch Grid (Compact Rectangles) */}
                    <div className="flex-1 p-3 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5">
                      {categories.map((cat, idx) => {
                        const count = categoryDishCounts[cat.id] || 0;
                        const darkGradients = [
                          'from-emerald-950/90 to-slate-900 border-emerald-600/50 text-emerald-400 hover:border-emerald-400',
                          'from-blue-950/90 to-slate-900 border-blue-600/50 text-blue-400 hover:border-blue-400',
                          'from-amber-950/90 to-slate-900 border-amber-600/50 text-amber-400 hover:border-amber-400',
                          'from-purple-950/90 to-slate-900 border-purple-600/50 text-purple-400 hover:border-purple-400',
                          'from-rose-950/90 to-slate-900 border-rose-600/50 text-rose-400 hover:border-rose-400',
                          'from-cyan-950/90 to-slate-900 border-cyan-600/50 text-cyan-400 hover:border-cyan-400',
                          'from-teal-950/90 to-slate-900 border-teal-600/50 text-teal-400 hover:border-teal-400',
                          'from-orange-950/90 to-slate-900 border-orange-600/50 text-orange-400 hover:border-orange-400',
                        ];
                        const lightGradients = [
                          'from-emerald-50 via-white to-emerald-50/50 border-emerald-300 text-emerald-700 hover:border-emerald-500 shadow-xs hover:shadow-sm',
                          'from-blue-50 via-white to-blue-50/50 border-blue-300 text-blue-700 hover:border-blue-500 shadow-xs hover:shadow-sm',
                          'from-amber-50 via-white to-amber-50/50 border-amber-300 text-amber-800 hover:border-amber-500 shadow-xs hover:shadow-sm',
                          'from-purple-50 via-white to-purple-50/50 border-purple-300 text-purple-700 hover:border-purple-500 shadow-xs hover:shadow-sm',
                          'from-rose-50 via-white to-rose-50/50 border-rose-300 text-rose-700 hover:border-rose-500 shadow-xs hover:shadow-sm',
                          'from-cyan-50 via-white to-cyan-50/50 border-cyan-300 text-cyan-700 hover:border-cyan-500 shadow-xs hover:shadow-sm',
                          'from-teal-50 via-white to-teal-50/50 border-teal-300 text-teal-700 hover:border-teal-500 shadow-xs hover:shadow-sm',
                          'from-orange-50 via-white to-orange-50/50 border-orange-300 text-orange-800 hover:border-orange-500 shadow-xs hover:shadow-sm',
                        ];
                        const styleClass = (posTheme === 'dark' ? darkGradients : lightGradients)[idx % 8];

                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`p-2.5 sm:p-3 rounded-xl border bg-gradient-to-r transition-all flex items-center justify-between text-left active:scale-95 touch-manipulation min-h-[64px] sm:min-h-[68px] cursor-pointer ${styleClass}`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 border ${
                                posTheme === 'dark' ? 'bg-slate-950/80 border-white/10' : 'bg-white border-slate-200 shadow-xs'
                              }`}>
                                <Utensils className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className={`text-xs sm:text-sm font-black tracking-tight uppercase truncate ${
                                  posTheme === 'dark' ? 'text-white' : 'text-slate-900'
                                }`}>
                                  {cat.nom}
                                </h3>
                                <p className={`text-[10px] truncate ${
                                  posTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                                }`}>
                                  {count} plat{count > 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>

                            <ChevronRight className={`w-4 h-4 shrink-0 ml-1.5 transition-transform group-hover:translate-x-0.5 ${
                              posTheme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                            }`} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* 2. PRODUCTS IN CATEGORY (Clicking dish adds to cart and returns back to categories) */
                  <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                    {/* Top navigation bar */}
                    <div className={`p-3 border-b flex items-center justify-between gap-2.5 transition-colors ${
                      posTheme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                    }`}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategory(null);
                          setProductSearch('');
                        }}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black border transition active:scale-95 shrink-0 cursor-pointer ${
                          posTheme === 'dark'
                            ? 'bg-slate-800 hover:bg-slate-700 active:bg-emerald-600 text-white border-slate-700'
                            : 'bg-slate-100 hover:bg-slate-200 active:bg-emerald-600 text-slate-800 border-slate-300 shadow-xs'
                        }`}
                      >
                        <ArrowLeft className="w-4 h-4 text-emerald-500" />
                        <span>Catégories</span>
                      </button>

                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className={`text-xs sm:text-sm font-black truncate ${
                          posTheme === 'dark' ? 'text-white' : 'text-slate-900'
                        }`}>
                          {selectedCategoryObj ? selectedCategoryObj.nom : 'Recherche'}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          posTheme === 'dark' ? 'text-slate-400 bg-slate-950 border-slate-800' : 'text-slate-700 bg-slate-100 border-slate-250'
                        }`}>
                          {filteredProducts.length} plat{filteredProducts.length > 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Inline quick search */}
                      <div className="relative w-36 sm:w-56">
                        <Search className={`w-3.5 h-3.5 absolute left-2.5 top-2.5 ${posTheme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                        <input
                          type="text"
                          placeholder="Filtrer..."
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          className={`w-full pl-8 pr-2 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 transition ${
                            posTheme === 'dark'
                              ? 'bg-slate-950 border border-slate-800 text-white placeholder-slate-500'
                              : 'bg-white border border-slate-250 text-slate-900 placeholder-slate-400 shadow-xs'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Dishes Touch Grid (Strict 4-Columns: Photo + Name + Price Only) */}
                    <div className="flex-1 min-h-0 p-3 overflow-y-auto overscroll-contain grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-2 sm:gap-2.5 auto-rows-[140px] sm:auto-rows-[150px] content-start touch-pan-y">
                      {filteredProducts.map((prod) => {
                        const isAvailable = prod.disponible === 1;

                        return (
                          <button
                            key={prod.id}
                            type="button"
                            onClick={() => {
                              if (!isAvailable) {
                                showToast(`${prod.nom} est indisponible !`, 'error');
                                return;
                              }
                              handleAddToCart(prod);
                              // Auto return to categories
                              setSelectedCategory(null);
                              setProductSearch('');
                              showToast(`"${prod.nom}" ajouté à l'addition`);
                            }}
                            disabled={!isAvailable}
                            className={`group relative h-[145px] sm:h-[155px] min-h-[145px] text-left rounded-2xl border overflow-hidden transition flex flex-col justify-between active:scale-95 touch-manipulation cursor-pointer ${
                              isAvailable
                                ? posTheme === 'dark'
                                  ? 'bg-slate-900 border-slate-800 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-950/40'
                                  : 'bg-white border-slate-200 shadow-xs hover:border-emerald-500 hover:shadow-sm'
                                : posTheme === 'dark'
                                  ? 'bg-slate-900/40 border-slate-800 opacity-50 cursor-not-allowed'
                                  : 'bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed'
                            }`}
                          >
                            {/* Dish Photo */}
                            <div className={`relative h-24 sm:h-26 w-full overflow-hidden shrink-0 ${
                              posTheme === 'dark' ? 'bg-slate-950' : 'bg-slate-100'
                            }`}>
                              {prod.image_url ? (
                                <img
                                  src={prod.image_url}
                                  alt={prod.nom}
                                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                />
                              ) : (
                                <div className={`w-full h-full flex items-center justify-center ${
                                  posTheme === 'dark' ? 'bg-gradient-to-tr from-slate-900 to-slate-800 text-slate-600' : 'bg-slate-100 text-slate-400'
                                }`}>
                                  <Utensils className="w-6 h-6" />
                                </div>
                              )}
                              <div className={`absolute inset-0 ${
                                posTheme === 'dark' ? 'bg-gradient-to-t from-slate-950/80 via-transparent to-transparent' : 'bg-gradient-to-t from-black/30 via-transparent to-transparent'
                              }`} />
                              <span className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-md text-[11px] font-black bg-emerald-600 text-white shadow-xs">
                                {prod.prix_vente_ttc.toFixed(2)} DH
                              </span>
                              {!isAvailable && (
                                <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-600 text-white shadow-xs">
                                  Épuisé
                                </span>
                              )}
                            </div>

                            {/* Dish Name Only */}
                            <div className="p-2 flex-1 flex items-center justify-between min-w-0">
                              <h4 className={`text-xs font-bold truncate leading-tight flex-1 ${
                                posTheme === 'dark' ? 'text-white group-hover:text-emerald-400' : 'text-slate-900 group-hover:text-emerald-600'
                              }`}>
                                {prod.nom}
                              </h4>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* VIEW B: PLAN DE SALLE (TABLES GRID) */}
            {rightPanelTab === 'TABLES' && (
              <div className="flex-1 flex flex-col p-4 overflow-y-auto pb-16 md:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className={`text-sm font-bold ${posTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Plan de Salle du Restaurant</h3>
                    <p className={`text-xs ${posTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Touchez une table pour ouvrir ou modifier une addition.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={tableStatusFilter}
                      onChange={(e: any) => setTableStatusFilter(e.target.value)}
                      className={`rounded-lg text-xs px-2.5 py-2 border transition ${
                        posTheme === 'dark'
                          ? 'bg-slate-900 border-slate-800 text-slate-300'
                          : 'bg-white border-slate-250 text-slate-800 shadow-xs'
                      }`}
                    >
                      <option value="TOUS">Toutes les tables</option>
                      <option value="LIBRE">Libres uniquement</option>
                      <option value="OCCUPEE">Occupées</option>
                      <option value="ADDITION">Addition demandée</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
                  {filteredTables.map((table) => {
                    const isLibre = table.statut === 'LIBRE';
                    const isOccupee = table.statut === 'OCCUPEE';
                    const isAddition = table.statut === 'ADDITION';

                    let cardStyle = '';
                    if (posTheme === 'dark') {
                      if (isLibre) {
                        cardStyle = 'bg-slate-900 border-emerald-800/60 hover:border-emerald-400 hover:bg-emerald-950/20 shadow-md';
                      } else if (isOccupee) {
                        cardStyle = 'bg-blue-950/40 border-blue-600/70 hover:border-blue-400 shadow-md';
                      } else if (isAddition) {
                        cardStyle = 'bg-amber-950/40 border-amber-500 hover:border-amber-300 animate-pulse shadow-md';
                      } else {
                        cardStyle = 'bg-slate-900 border-slate-800 hover:border-emerald-500';
                      }
                    } else {
                      if (isLibre) {
                        cardStyle = 'bg-white border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50/40 shadow-xs hover:shadow-md';
                      } else if (isOccupee) {
                        cardStyle = 'bg-blue-50/50 border-blue-300 hover:border-blue-500 shadow-xs hover:shadow-md';
                      } else if (isAddition) {
                        cardStyle = 'bg-amber-50/60 border-amber-400 hover:border-amber-500 shadow-xs hover:shadow-md animate-pulse';
                      } else {
                        cardStyle = 'bg-white border-slate-200 hover:border-emerald-500 shadow-xs';
                      }
                    }

                    return (
                      <div
                        key={table.id}
                        onClick={() => handleSelectTable(table)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition flex flex-col justify-between active:scale-95 touch-manipulation min-h-[110px] ${cardStyle}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-base font-black ${posTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{table.numero}</span>
                          {renderStatusBadge(table.statut)}
                        </div>

                        <div className={`text-xs space-y-1 ${posTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                          <p className="truncate font-medium">{table.nom}</p>
                          <p className="flex items-center gap-1 text-[11px]">
                            <Users className={`w-3 h-3 ${posTheme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`} />
                            <span>{table.nb_couverts > 0 ? `${table.nb_couverts} / ${table.capacite}p` : `${table.capacite} places`}</span>
                          </p>
                        </div>

                        <div className={`mt-3 pt-2 border-t flex items-center justify-between text-xs font-bold ${
                          posTheme === 'dark' ? 'border-slate-800/80' : 'border-slate-200'
                        }`}>
                          {isLibre ? (
                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-[11px]">
                              <Plus className="w-3 h-3" /> Ouvrir (1 couvert)
                            </span>
                          ) : (
                            <>
                              <span className={`text-[11px] ${posTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>En cours:</span>
                              <span className="text-emerald-600 dark:text-emerald-400">{table.montant_en_cours.toFixed(2)} DH</span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* iPad Portrait Floating Bottom Summary Bar */}
            {cart.length > 0 && ipadViewTab === 'CARTE' && (
              <div className={`md:hidden fixed bottom-3 left-3 right-3 z-40 backdrop-blur-md border p-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom-2 ${
                posTheme === 'dark' ? 'bg-slate-900/95 border-emerald-500/60 text-white' : 'bg-white/95 border-emerald-500 text-slate-900'
              }`}>
                <button
                  type="button"
                  onClick={() => setIpadViewTab('ADDITION')}
                  className="flex items-center gap-2.5 text-left flex-1 cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shadow">
                    {orderCalculations.itemsCount}
                  </div>
                  <div>
                    <p className={`text-[11px] font-bold ${posTheme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Addition en cours</p>
                    <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{orderCalculations.netAPayer.toFixed(2)} DH</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={handleOpenPayment}
                  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl shadow flex items-center gap-1.5 active:scale-95 transition cursor-pointer"
                >
                  <Banknote className="w-4 h-4" />
                  <span>ENCAISSER</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* MODIFIER PRIX NUMPAD MODAL */}
        {editingPriceIndex !== null && cart[editingPriceIndex] && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <div className={`max-w-sm w-full rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 border transition-colors ${
              posTheme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className={`flex items-center justify-between border-b pb-3 ${
                posTheme === 'dark' ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <div className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-amber-500" />
                  <h3 className={`text-sm font-black ${posTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Modifier le Prix Unitaire</h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingPriceIndex(null);
                    setPriceNumpadValue('');
                  }}
                  className={`p-1 transition cursor-pointer ${
                    posTheme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className={`space-y-1 p-3 rounded-2xl border ${
                posTheme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <p className={`text-xs font-black truncate ${posTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {cart[editingPriceIndex].produit_nom}
                </p>
                <div className={`flex justify-between text-[11px] ${posTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  <span>Prix initial : {cart[editingPriceIndex].prix_unitaire_ttc.toFixed(2)} DH</span>
                  <span>Qté : {cart[editingPriceIndex].quantite}</span>
                </div>
              </div>

              {/* Typed Price Display */}
              <div className={`p-3.5 rounded-2xl border text-center ${
                posTheme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-amber-50/60 border-amber-200'
              }`}>
                <p className={`text-[10px] uppercase font-bold ${posTheme === 'dark' ? 'text-slate-400' : 'text-amber-800'}`}>Nouveau Prix TTC (par unité)</p>
                <div className="text-3xl font-black text-amber-500 mt-1">
                  {priceNumpadValue === '' ? '0.00' : priceNumpadValue} <span className="text-lg text-amber-600">DH</span>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: 'Initial', val: cart[editingPriceIndex].prix_unitaire_ttc.toString() },
                  { label: 'Offert (0)', val: '0' },
                  { label: '+5 DH', add: 5 },
                  { label: '+10 DH', add: 10 },
                ].map((btn, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      if (btn.val !== undefined) {
                        setPriceNumpadValue(btn.val);
                      } else if (btn.add !== undefined) {
                        const current = parseFloat(priceNumpadValue) || cart[editingPriceIndex].prix_unitaire_ttc;
                        setPriceNumpadValue(Math.max(0, current + btn.add).toFixed(2));
                      }
                    }}
                    className={`py-1.5 text-[10px] font-bold rounded-lg border transition active:scale-95 cursor-pointer ${
                      posTheme === 'dark'
                        ? 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-250 shadow-xs'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>

              {/* Tactile NumPad Grid */}
              <div className="grid grid-cols-3 gap-1.5">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫', '.', '00'].map((btn) => (
                  <button
                    key={btn}
                    type="button"
                    onClick={() => handlePriceNumpadKey(btn)}
                    className={`h-11 rounded-xl text-base font-black transition active:scale-95 flex items-center justify-center border cursor-pointer ${
                      btn === 'C'
                        ? posTheme === 'dark'
                          ? 'bg-rose-950/60 border-rose-800 text-rose-300 hover:bg-rose-900'
                          : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 shadow-xs'
                        : btn === '⌫'
                        ? posTheme === 'dark'
                          ? 'bg-amber-950/60 border-amber-800 text-amber-300 hover:bg-amber-900'
                          : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100 shadow-xs'
                        : posTheme === 'dark'
                        ? 'bg-slate-950 border-slate-800 text-slate-100 hover:bg-slate-800'
                        : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50 shadow-xs'
                    }`}
                  >
                    {btn}
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setEditingPriceIndex(null);
                    setPriceNumpadValue('');
                  }}
                  className={`py-3 font-bold text-xs rounded-xl transition cursor-pointer ${
                    posTheme === 'dark'
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-250'
                  }`}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSaveModifiedPrice}
                  className="py-3 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Valider Prix</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PAYMENT MODAL WITH IPAD TACTILE KEYPAD & QUICK BILL PRESETS */}
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className={`max-w-lg w-full rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto border transition-colors ${
              posTheme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className={`flex items-center justify-between border-b pb-3 ${
                posTheme === 'dark' ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <div className="flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-emerald-500" />
                  <h3 className={`text-base font-black ${posTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Règlement de l'Addition</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className={`p-1 transition cursor-pointer ${
                    posTheme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className={`p-3.5 rounded-2xl border text-center space-y-0.5 ${
                posTheme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-emerald-50/60 border-emerald-200'
              }`}>
                <p className={`text-xs ${posTheme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Total Net à Encaisser</p>
                <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{orderCalculations.netAPayer.toFixed(2)} DH</p>
              </div>

              {/* Payment Mode Selector */}
              <div className="grid grid-cols-3 gap-2">
                {(['Espèces', 'Carte Bancaire', 'Chèque'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setModeReglement(mode)}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      modeReglement === mode
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                        : posTheme === 'dark'
                        ? 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                        : 'bg-slate-100 text-slate-700 border-slate-250 hover:bg-slate-200 shadow-xs'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              {/* Cash given & change calculation with iPad Tactile Keypad */}
              {modeReglement === 'Espèces' && (
                <div className={`space-y-3 p-3.5 rounded-2xl border ${
                  posTheme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  {/* Amount Received & Change Display */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className={`p-2.5 rounded-xl border ${
                      posTheme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                    }`}>
                      <span className={`text-[10px] uppercase font-bold block ${
                        posTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                      }`}>Reçu du client :</span>
                      <span className={`text-lg font-black ${posTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{montantRecu.toFixed(2)} DH</span>
                    </div>
                    <div className={`p-2.5 rounded-xl border ${
                      posTheme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                    }`}>
                      <span className={`text-[10px] uppercase font-bold block ${
                        posTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                      }`}>Monnaie à rendre :</span>
                      <span className={`text-lg font-black ${
                        montantRecu >= orderCalculations.netAPayer ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}>
                        {Math.max(0, montantRecu - orderCalculations.netAPayer).toFixed(2)} DH
                      </span>
                    </div>
                  </div>

                  {/* Quick Preset Bill Buttons */}
                  <div className="grid grid-cols-5 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleNumpadDigit('EXACT')}
                      className="py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-sm transition active:scale-95 cursor-pointer"
                    >
                      Exact
                    </button>
                    {[50, 100, 200, 500].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setMontantRecu(amt)}
                        className={`py-2 rounded-xl text-xs font-bold border transition active:scale-95 cursor-pointer ${
                          posTheme === 'dark'
                            ? 'bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-slate-200 border-slate-800'
                            : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-250 shadow-xs'
                        }`}
                      >
                        {amt} DH
                      </button>
                    ))}
                  </div>

                  {/* Tactile On-Screen Numpad */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((btn) => (
                      <button
                        key={btn}
                        type="button"
                        onClick={() => handleNumpadDigit(btn)}
                        className={`h-11 sm:h-12 rounded-xl text-base font-black transition active:scale-95 flex items-center justify-center border cursor-pointer ${
                          btn === 'C'
                            ? posTheme === 'dark'
                              ? 'bg-rose-950/60 border-rose-800 text-rose-300 hover:bg-rose-900'
                              : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 shadow-xs'
                            : btn === '⌫'
                            ? posTheme === 'dark'
                              ? 'bg-amber-950/60 border-amber-800 text-amber-300 hover:bg-amber-900'
                              : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100 shadow-xs'
                            : posTheme === 'dark'
                            ? 'bg-slate-900 border-slate-800 text-slate-100 hover:bg-slate-800 hover:border-slate-700'
                            : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50 shadow-xs'
                        }`}
                      >
                        {btn}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={isProcessingPayment}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-950/30 flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
              >
                {isProcessingPayment ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Valider l'Encaissement & Imprimer Ticket</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* PWA INSTALLATION MODAL FOR IPAD & CHROME */}
        <PwaInstallModal
          isOpen={showPwaGuideModal || showIosPrompt}
          onClose={() => {
            setShowPwaGuideModal(false);
            setShowIosPrompt(false);
          }}
          isIPad={isIPad}
          isIOS={isIOS}
          onDirectInstall={install}
        />

        {/* RECEIPT PREVIEW MODAL */}
        {showReceiptModal && lastSale && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="max-w-sm w-full bg-white text-slate-900 rounded-2xl p-5 shadow-2xl space-y-3 font-mono text-[11px]">
              {/* HEADER */}
              <div className="text-center space-y-0.5">
                <h3 className="text-sm font-black uppercase">AZULERP MAROC</h3>
                <p className="text-[10px] text-slate-600 leading-tight">
                  148 Bd Sidi Mohamed Ben Abdellah Ain Sebaa<br />
                  Casablanca - Maroc<br />
                  05 22 35 40 80 / 05 22 35 40 81<br />
                  www.azulerp.ma
                </p>
                <p className="text-xs font-bold pt-1">
                  {receiptType === 'ADDITION' ? "NOTE D'ADDITION" : 'DUPLICATA'}
                </p>
              </div>

              <div className="border-t border-dashed border-slate-400" />

              {/* METADATA */}
              <div className="text-[10px] space-y-0.5">
                <div>Date creation : {formatTicketDateTime(lastSale.date_vente)}</div>
                <div className="flex justify-between">
                  <span>Boutique : AZULERP Casablanca</span>
                  <span>Ticket: {lastSale.numero_ticket}</span>
                </div>
                <div>Caissier : {lastSale.caissier || 'Admin'}</div>
              </div>

              <div className="border-t border-dashed border-slate-400" />

              {/* ITEMS TABLE */}
              <div className="space-y-1">
                <div className="flex justify-between font-bold text-[10px] pb-1 border-b border-dashed border-slate-300">
                  <span className="w-10 text-left">QTE</span>
                  <span className="flex-1 text-left px-2">* ARTICLE *</span>
                  <span className="w-16 text-right">PRIX</span>
                </div>
                {(lastSale.lignes || []).map((l, i) => (
                  <div key={i} className="flex justify-between text-[11px]">
                    <span className="w-10 text-left">{l.quantite}</span>
                    <span className="flex-1 text-left px-2 truncate">{l.produit_nom}</span>
                    <span className="w-16 text-right font-medium">{Number(l.total_ttc || 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-slate-400" />

              {/* SUMMARY */}
              <div className="space-y-0.5 text-[11px]">
                <div className="flex justify-between">
                  <span>Nombre d'articles</span>
                  <span>({(lastSale.lignes || []).reduce((sum, l) => sum + Number(l.quantite || 1), 0)})</span>
                </div>
                <div className="flex justify-between">
                  <span>Sous-total</span>
                  <span>{Number(lastSale.total_ht || 0).toFixed(2)} MAD</span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-400" />

              {/* TOTAL */}
              <div className="flex justify-between font-black text-sm py-0.5">
                <span>Total</span>
                <span>{Number(lastSale.total_ttc || 0).toFixed(2)} MAD</span>
              </div>

              <div className="border-t border-dashed border-slate-400" />

              {/* TAX BREAKDOWN */}
              <div className="text-[10px] space-y-1">
                <div className="flex justify-between font-bold">
                  <span className="w-1/3 text-left">Taux TVA</span>
                  <span className="w-1/3 text-center">Montant H.T.</span>
                  <span className="w-1/3 text-right">T.V.A</span>
                </div>
                <div className="flex justify-between">
                  <span className="w-1/3 text-left">
                    {lastSale.tva_10 && lastSale.tva_10 > 0 ? '10 %' : (lastSale.tva_7 && lastSale.tva_7 > 0 ? '7 %' : '20 %')}
                  </span>
                  <span className="w-1/3 text-center">{Number(lastSale.total_ht || 0).toFixed(2)}</span>
                  <span className="w-1/3 text-right">{Number(lastSale.total_tva || 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-400" />

              {/* FOOTER */}
              <div className="text-center font-bold text-xs pt-1">NOTE</div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={isPrintingTicket}
                  onClick={async () => {
                    if (!lastSale) return;
                    setIsPrintingTicket(true);
                    try {
                      const res = await printPosTicket(lastSale, companyInfo, receiptType);
                      if (res.success) {
                        showToast(res.message || `Ticket imprimé sur 192.168.1.87`);
                      } else {
                        showToast(res.message || `Échec d'impression thermique direct`, 'error');
                      }
                    } catch (err: any) {
                      showToast(`Erreur d'impression: ${err?.message || 'Inconnue'}`, 'error');
                    } finally {
                      setIsPrintingTicket(false);
                    }
                  }}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-sans font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>{isPrintingTicket ? 'Impression en cours...' : 'Imprimer sur Ticket (192.168.1.87)'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (lastSale) {
                      printPosTicketBrowser(lastSale, companyInfo, receiptType);
                    }
                  }}
                  className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-sans font-medium text-xs text-center border border-slate-200 cursor-pointer"
                  title="Ouvrir la boîte d'impression système (AirPrint / PDF)"
                >
                  AirPrint / PDF
                </button>
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(false)}
                  className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-sans font-bold text-xs cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================================================
  // RENDER: ERP BACKEND MODE (MANAGEMENT, TICKETS, MENU, SERVICES, BACKUP)
  // ==========================================================================
  return (
    <div className="space-y-6 font-sans">
      {/* Toast */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold border ${
            notification.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          {notification.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* POS HERO BANNER WITH PROMINENT FULL SCREEN TOUCH BUTTON */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 bg-emerald-500/30 border border-emerald-400/40 rounded-full text-xs font-bold text-emerald-200">
              Module Restaurant & POS
            </span>
            <SyncStatusBadge onDataReload={loadAllData} />
            <span className="flex items-center gap-1 text-xs text-slate-300">
              {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-amber-400" />}
              {isOnline ? 'En Ligne (Synchronisé)' : 'Hors-Ligne (100% Autonome)'}
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Caisse Restaurant & Plan de Salle
          </h2>
          <p className="text-xs text-slate-300 max-w-xl">
            Prise de commande rapide tactile, gestion des additions, menu avec photos, clôtures de caisse Z et sauvegarde hors-ligne locale SQLite.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            id="btn-launch-pos-fullscreen"
            onClick={() => setIsFullScreenPos(true)}
            className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black text-sm rounded-2xl shadow-lg shadow-emerald-950/50 flex items-center gap-2.5 transition active:scale-95"
          >
            <Maximize2 className="w-5 h-5" />
            <span>LANCER LA CAISSE PLEIN ÉCRAN (POS TOUCH)</span>
          </button>
        </div>
      </div>

      {/* BACKEND SUB-TABS NAVIGATION */}
      <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-xs overflow-x-auto gap-1">
        <button
          type="button"
          onClick={() => setActiveSubTab('TERMINAL')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            activeSubTab === 'TERMINAL'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Utensils className="w-4 h-4" />
          <span>Plan de Salle & Caisse</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('TICKETS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            activeSubTab === 'TICKETS'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Historique des Additions ({sales.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('PRODUITS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            activeSubTab === 'PRODUITS'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Carte & Menu ({products.length} plats)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('SESSIONS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            activeSubTab === 'SESSIONS'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Services & Clôtures Z</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('OFFLINE')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
            activeSubTab === 'OFFLINE'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Sauvegarde & Mode Hors-Ligne</span>
        </button>
      </div>

      {/* 1. PLAN DE SALLE & CAISSE DASHBOARD */}
      {activeSubTab === 'TERMINAL' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Tables Occupées</p>
                <p className="text-2xl font-black text-slate-900 mt-1">
                  {stats?.tables_occupees || 0} / {stats?.tables_total || tables.length}
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Couverts Aujourd’hui</p>
                <p className="text-2xl font-black text-emerald-600 mt-1">
                  {stats?.total_couverts_jour || 0}
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ChefHat className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Ventes du Jour (TTC)</p>
                <p className="text-2xl font-black text-slate-900 mt-1">
                  {(stats?.ventes_jour_ttc || 0).toFixed(2)} DH
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Tickets Encaissés</p>
                <p className="text-2xl font-black text-slate-900 mt-1">
                  {stats?.nb_tickets_jour || 0}
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Receipt className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Table list */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Aperçu des Tables de la Salle</h3>
              <button
                type="button"
                onClick={() => setIsFullScreenPos(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow transition"
              >
                Ouvrir la Caisse Plein Écran
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {tables.map((t) => (
                <div
                  key={t.id}
                  onClick={() => {
                    handleSelectTable(t);
                    setIsFullScreenPos(true);
                  }}
                  className="p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-500 rounded-xl cursor-pointer transition text-center space-y-1"
                >
                  <div className="text-base font-black text-slate-900">{t.numero}</div>
                  <div className="text-[11px] text-slate-500">{t.nom}</div>
                  <div>{renderStatusBadge(t.statut)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. HISTORIQUE DES ADDITIONS & TICKETS */}
      {activeSubTab === 'TICKETS' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Historique des Ventes & Additions</h3>
              <p className="text-xs text-slate-500">Consultez, réimprimez ou annulez les tickets de caisse.</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Rechercher ticket, table..."
                value={salesSearch}
                onChange={(e) => setSalesSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="py-2.5 px-3">N° Ticket</th>
                  <th className="py-2.5 px-3">Date & Heure</th>
                  <th className="py-2.5 px-3">Table</th>
                  <th className="py-2.5 px-3">Couverts</th>
                  <th className="py-2.5 px-3">Mode Règlement</th>
                  <th className="py-2.5 px-3 text-right">Total TTC</th>
                  <th className="py-2.5 px-3 text-center">Statut</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales
                  .filter(
                    (s) =>
                      salesSearch === '' ||
                      s.numero_ticket.toLowerCase().includes(salesSearch.toLowerCase()) ||
                      s.table_numero?.toLowerCase().includes(salesSearch.toLowerCase())
                  )
                  .map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{sale.numero_ticket}</td>
                      <td className="py-2.5 px-3 text-slate-500">{sale.date_vente}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">{sale.table_numero}</td>
                      <td className="py-2.5 px-3 text-slate-600">{sale.nb_couverts}</td>
                      <td className="py-2.5 px-3 text-slate-600">{sale.mode_reglement}</td>
                      <td className="py-2.5 px-3 font-black text-right text-emerald-600">
                        {sale.total_ttc.toFixed(2)} DH
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {sale.statut}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            printPosTicket(sale, companyInfo, 'DUPLICATA').then((res) => {
                              if (res.success) {
                                showToast(`Duplicata Ticket #${sale.numero_ticket} imprimé.`);
                              }
                            });
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 rounded text-xs font-bold transition inline-flex items-center gap-1"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Imprimer</span>
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. CARTE & MENU RESTAURANT WITH PHOTOS */}
      {activeSubTab === 'PRODUITS' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Carte & Menu du Restaurant</h3>
              <p className="text-xs text-slate-500">Ajoutez et modifiez les plats avec leurs photos et tarifs.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingProduct(null);
                setProductFormData({
                  code: `REST-${Date.now().toString().slice(-4)}`,
                  nom: '',
                  description: '',
                  categorie_id: categories[0]?.id || 1,
                  prix_vente_ttc: 50,
                  taux_tva: 20,
                  temps_preparation_min: 15,
                  disponible: 1,
                  image_url: '',
                  couleur: '#10b981',
                  actif: 1,
                });
                setShowProductModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow transition"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Plat</span>
            </button>
          </div>

          {/* Dishes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((prod) => (
              <div
                key={prod.id}
                className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden flex flex-col justify-between hover:shadow-md transition"
              >
                <div className="relative h-36 w-full bg-slate-200">
                  {prod.image_url ? (
                    <img src={prod.image_url} alt={prod.nom} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                  )}
                  <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-emerald-600 text-white font-black text-xs shadow">
                    {prod.prix_vente_ttc.toFixed(2)} DH
                  </span>
                </div>

                <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{prod.nom}</h4>
                    <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">{prod.description}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => togglePosProductDisponibilite(prod.id, prod.disponible !== 1).then(loadAllData)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        prod.disponible === 1
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {prod.disponible === 1 ? 'Disponible' : 'Épuisé'}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProduct(prod);
                          setProductFormData({
                            code: prod.code,
                            nom: prod.nom,
                            description: prod.description || '',
                            categorie_id: prod.categorie_id || 1,
                            prix_vente_ttc: prod.prix_vente_ttc,
                            taux_tva: prod.taux_tva ?? 20,
                            temps_preparation_min: prod.temps_preparation_min || 15,
                            disponible: prod.disponible === 1 ? 1 : 0,
                            image_url: prod.image_url || '',
                            couleur: prod.couleur || '#10b981',
                            actif: 1,
                          });
                          setShowProductModal(true);
                        }}
                        className="p-1 text-slate-600 hover:text-blue-600"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Supprimer "${prod.nom}" ?`)) {
                            deletePosProduct(prod.id).then(loadAllData);
                          }
                        }}
                        className="p-1 text-slate-600 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. SERVICES & CLÔTURES Z */}
      {activeSubTab === 'SESSIONS' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Services & Clôtures de Caisse (Rapports Z)</h3>
              <p className="text-xs text-slate-500">Historique des ouvertures et clôtures de service.</p>
            </div>
            {stats?.session_active ? (
              <button
                type="button"
                onClick={() => {
                  setMontantReelClotureInput(
                    stats.session_active!.fond_caisse_ouverture + stats.session_active!.total_especes
                  );
                  setShowCloseSessionModal(true);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow transition"
              >
                Clôturer le Service Actuel (Z)
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowOpenSessionModal(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow transition"
              >
                Ouvrir un Nouveau Service
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="py-2.5 px-3">Session</th>
                  <th className="py-2.5 px-3">Service</th>
                  <th className="py-2.5 px-3">Ouverture</th>
                  <th className="py-2.5 px-3">Fond Ouverture</th>
                  <th className="py-2.5 px-3">Ventes Totales</th>
                  <th className="py-2.5 px-3">Espèces</th>
                  <th className="py-2.5 px-3">Carte</th>
                  <th className="py-2.5 px-3">Tickets</th>
                  <th className="py-2.5 px-3 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map((sess) => (
                  <tr key={sess.id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{sess.numero_session}</td>
                    <td className="py-2.5 px-3 text-slate-700">{sess.service}</td>
                    <td className="py-2.5 px-3 text-slate-500">{sess.date_ouverture}</td>
                    <td className="py-2.5 px-3 text-slate-700">{sess.fond_caisse_ouverture.toFixed(2)} DH</td>
                    <td className="py-2.5 px-3 font-black text-emerald-600">{sess.total_ventes.toFixed(2)} DH</td>
                    <td className="py-2.5 px-3 text-slate-700">{sess.total_especes.toFixed(2)} DH</td>
                    <td className="py-2.5 px-3 text-slate-700">{sess.total_carte.toFixed(2)} DH</td>
                    <td className="py-2.5 px-3 text-slate-700">{sess.nb_tickets}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          sess.statut === 'OUVERTE'
                            ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {sess.statut}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. SAUVEGARDE & MODE HORS-LIGNE */}
      {activeSubTab === 'OFFLINE' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Résilience Hors-Ligne & Sauvegarde d'Urgence (.sqlite)
              </h3>
              <p className="text-xs text-slate-500">
                Verde Orto fonctionne en mode 100% autonome local dans votre navigateur.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-blue-950 font-bold text-sm">
                <Cloud className="w-4 h-4 text-blue-600" />
                <span>Synchro SQLite Multi-Bureaux</span>
              </div>
              <p className="text-xs text-blue-900 leading-relaxed">
                Synchronisation automatique de votre base SQLite en arrière-plan entre Bureau 1, Bureau 2 et cet iPad.
              </p>
              <div className="pt-1">
                <SyncStatusBadge onDataReload={loadAllData} />
              </div>
            </div>

            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Fonctionnement sans Internet</span>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Toutes vos tables, additions et encaissements sont stockés dans le moteur SQLite local. En cas de coupure réseau, la caisse continue à 100%.
              </p>
            </div>

            <div className="p-4 bg-teal-50/60 border border-teal-200 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-teal-900 font-bold text-sm">
                <Tablet className="w-4 h-4 text-teal-600" />
                <span>Installation PWA sur iPad</span>
              </div>
              <p className="text-xs text-teal-800 leading-relaxed">
                Installez l'application sur l'écran d'accueil pour lancer la caisse en plein écran comme une application native iOS.
              </p>
              <button
                type="button"
                onClick={async () => {
                  const res = await install();
                  if (!res) setShowPwaGuideModal(true);
                }}
                className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-600 active:bg-teal-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs"
              >
                <Tablet className="w-3.5 h-3.5" />
                <span>{isInstalled ? 'Installée' : 'Installer sur iPad'}</span>
              </button>
            </div>

            <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
                <Download className="w-4 h-4 text-indigo-600" />
                <span>Exporter Fichier (.sqlite)</span>
              </div>
              <p className="text-xs text-indigo-800 leading-relaxed">
                Téléchargez une copie binaire pour clé USB ou sauvegarde externe.
              </p>
              <button
                type="button"
                onClick={handleQuickExportBackup}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exporter (.sqlite)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT CREATION/EDIT MODAL WITH PHOTO UPLOAD & URL */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveProduct}
            className="max-w-lg w-full bg-white rounded-3xl p-6 shadow-2xl space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {editingProduct ? 'Modifier le Plat' : 'Ajouter un Plat au Menu'}
              </h3>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <label className="block font-bold text-slate-700">Nom du Plat *</label>
                <input
                  type="text"
                  required
                  value={productFormData.nom}
                  onChange={(e) => setProductFormData({ ...productFormData, nom: e.target.value })}
                  placeholder="Ex: Pizza Margherita au Feu de Bois"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Catégorie</label>
                <select
                  value={productFormData.categorie_id}
                  onChange={(e) =>
                    setProductFormData({ ...productFormData, categorie_id: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Prix Vente TTC (DH) *</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={productFormData.prix_vente_ttc}
                  onChange={(e) =>
                    setProductFormData({ ...productFormData, prix_vente_ttc: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-emerald-700"
                />
              </div>

              {/* Photo Input: URL or File Upload */}
              <div className="col-span-2 space-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <label className="block font-bold text-slate-700 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Photo du Plat (URL ou Fichier)</span>
                </label>

                <input
                  type="text"
                  placeholder="https://images.unsplash.com/... ou URL d'image"
                  value={productFormData.image_url}
                  onChange={(e) => setProductFormData({ ...productFormData, image_url: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />

                <div className="flex items-center gap-3">
                  <label className="cursor-pointer px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Choisir une photo locale</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProductImageUpload}
                      className="hidden"
                    />
                  </label>
                  {productFormData.image_url && (
                    <img
                      src={productFormData.image_url}
                      alt="Aperçu"
                      className="w-10 h-10 rounded-lg object-cover border border-slate-300"
                    />
                  )}
                </div>
              </div>

              <div className="col-span-2 space-y-1">
                <label className="block font-bold text-slate-700">Description / Ingrédients</label>
                <textarea
                  rows={2}
                  value={productFormData.description}
                  onChange={(e) =>
                    setProductFormData({ ...productFormData, description: e.target.value })
                  }
                  placeholder="Composition du plat..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow"
              >
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SESSION OPEN / CLOSE MODALS */}
      {showOpenSessionModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-white rounded-3xl p-6 shadow-2xl space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900">Ouvrir un Nouveau Service</h3>
            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700">Type de Service</label>
                <select
                  value={serviceInput}
                  onChange={(e: any) => setServiceInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl mt-1"
                >
                  <option value="MIDI">Service du Midi</option>
                  <option value="SOIR">Service du Soir</option>
                  <option value="CONTINU">Service Continu</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700">Fond de Caisse Initial (DH)</label>
                <input
                  type="number"
                  value={fondCaisseInput}
                  onChange={(e) => setFondCaisseInput(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl mt-1 font-bold text-emerald-700"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowOpenSessionModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() =>
                  openPosSession(fondCaisseInput, 'Caisse', serviceInput, 'Ouverture service').then(() => {
                    setShowOpenSessionModal(false);
                    loadAllData();
                  })
                }
                className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold shadow"
              >
                Ouvrir
              </button>
            </div>
          </div>
        </div>
      )}

      {showCloseSessionModal && stats?.session_active && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 shadow-2xl space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900">Clôture de Caisse (Rapport Z)</h3>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <div className="flex justify-between">
                <span>Fond ouverture :</span>
                <span>{stats.session_active.fond_caisse_ouverture.toFixed(2)} DH</span>
              </div>
              <div className="flex justify-between">
                <span>Ventes espèces :</span>
                <span>{stats.session_active.total_especes.toFixed(2)} DH</span>
              </div>
              <div className="flex justify-between font-bold border-t border-slate-200 pt-1">
                <span>Espèces Théoriques :</span>
                <span>
                  {(
                    stats.session_active.fond_caisse_ouverture + stats.session_active.total_especes
                  ).toFixed(2)}{' '}
                  DH
                </span>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700">Espèces Réelles Comptées en Caisse (DH)</label>
              <input
                type="number"
                value={montantReelClotureInput}
                onChange={(e) => setMontantReelClotureInput(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl mt-1 font-bold text-slate-900 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCloseSessionModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() =>
                  closePosSession(stats.session_active!.id, montantReelClotureInput, clotureNotesInput).then(() => {
                    setShowCloseSessionModal(false);
                    loadAllData();
                    showToast('Session clôturée avec succès (Rapport Z).');
                  })
                }
                className="px-5 py-2 bg-rose-600 text-white rounded-xl font-bold shadow"
              >
                Clôturer Z
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PWA INSTALLATION MODAL FOR IPAD & CHROME */}
      <PwaInstallModal
        isOpen={showPwaGuideModal || showIosPrompt}
        onClose={() => {
          setShowPwaGuideModal(false);
          setShowIosPrompt(false);
        }}
        isIPad={isIPad}
        isIOS={isIOS}
        onDirectInstall={install}
      />
    </div>
  );
};
