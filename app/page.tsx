'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  initSqliteDatabase,
  fetchAllData,
  fetchFactures,
  fetchBonsLivraison,
  fetchBonsRetour,
  fetchClients,
  fetchProduits,
  fetchFournisseurs,
  fetchDevis,
  fetchReglements,
  fetchCompanyInfo,
  fetchDashboardStats,
  fetchStockMouvements,
  createBonLivraison,
  updateBonLivraison,
  updateBonLivraisonState,
  closeBonLivraisonWithoutInvoice,
  deleteBonLivraison,
  createBonRetour,
  updateBonRetour,
  updateBonRetourState,
  deleteBonRetour,
  createFacture,
  updateFacture,
  updateFactureState,
  createFactureFromBLs,
  deleteFacture,
  createClient,
  updateClient,
  deleteClient,
  createProduit,
  updateProduit,
  deleteProduit,
  adjustStock,
  createFournisseur,
  updateFournisseur,
  deleteFournisseur,
  createDevis,
  deleteDevis,
  createReglement,
  updateReglement,
  deleteReglement,
  updateCompanyInfo,
  exportSqliteDatabase,
  importDatabaseWithProgress,
  fetchImpendingSupplierCheques,
  getAuthenticatedSession,
  logoutAuthenticatedSession,
} from '@/lib/sqlite-service';
import { testNeonConnection } from '@/lib/neon-sync-service';
import {
  Facture,
  BonLivraison,
  BonRetour,
  Client,
  Produit,
  Fournisseur,
  Devis,
  Reglement,
  CompanyInfo,
  DashboardStats,
  StockMouvement,
  DocumentState,
  AppUser,
  DbImportProgress,
  DbImportSummary,
  Categorie,
  Famille,
} from '@/lib/types';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { DashboardView } from '@/components/DashboardView';
import { FacturesView } from '@/components/FacturesView';
import { BonsLivraisonView } from '@/components/BonsLivraisonView';
import { BonsRetourView } from '@/components/BonsRetourView';
import { WorkflowBlFactureView } from '@/components/WorkflowBlFactureView';
import { DevisView } from '@/components/DevisView';
import { ProduitsStockView } from '@/components/ProduitsStockView';
import { ClientsView } from '@/components/ClientsView';
import { FournisseursView } from '@/components/FournisseursView';
import { ReglementsView } from '@/components/ReglementsView';
import { EtatsRapportsView } from '@/components/EtatsRapportsView';
import { SqliteConsoleView } from '@/components/SqliteConsoleView';
import { AiDatabaseCopilotView } from '@/components/AiDatabaseCopilotView';
import { GeminiFloatingChat } from '@/components/GeminiFloatingChat';
import { ReferenceDataLists } from '@/components/ReferenceDataLists';
import { CompanySettingsView } from '@/components/CompanySettingsView';
import { PosView } from '@/components/PosView';
import { AuthView } from '@/components/AuthView';
import { UserManagementModal } from '@/components/UserManagementModal';
import { LockScreenModal } from '@/components/LockScreenModal';
import { DatabaseProgressModal } from '@/components/DatabaseProgressModal';
import { Database, Sparkles, HardDrive, CheckCircle2, RefreshCw, Store, Truck, FileText, Package, Menu as MenuIcon } from 'lucide-react';

// Full Page Creation & Edit Views
import { CreateBlView } from '@/components/CreateBlView';
import { CreateBonRetourView } from '@/components/CreateBonRetourView';
import { CreateFactureView } from '@/components/CreateFactureView';
import { CreateDevisView } from '@/components/CreateDevisView';
import { CreateClientView } from '@/components/CreateClientView';
import { CreateProduitView } from '@/components/CreateProduitView';
import { CreateFournisseurView } from '@/components/CreateFournisseurView';
import { PaymentView } from '@/components/PaymentView';
import { AdjustStockView } from '@/components/AdjustStockView';
import { DocumentPreviewView } from '@/components/DocumentPreviewView';

export default function Home() {
  const [sqliteReady, setSqliteReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  // Boot progress state
  const [bootProgress, setBootProgress] = useState<{ percent: number; stage: string; details?: string }>({
    percent: 60,
    stage: 'Connexion à PostgreSQL Neon Serverless...',
    details: 'Initialisation du schéma et chargement des données',
  });

  // Global Import Progress Modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importProgress, setImportProgress] = useState<DbImportProgress | null>(null);
  const [importSummary, setImportSummary] = useState<DbImportSummary | null>(null);

  // Authentication & Session State
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isScreenLocked, setIsScreenLocked] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);

  const [currentTab, setCurrentTab] = useState('dashboard');
  const [previousTab, setPreviousTab] = useState('dashboard');
  const [globalSearch, setGlobalSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear().toString());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Lazy loading states for heavy list components
  const [isFacturesLoaded, setIsFacturesLoaded] = useState(false);
  const [loadingFactures, setLoadingFactures] = useState(false);
  const [isBlLoaded, setIsBlLoaded] = useState(false);
  const [loadingBls, setLoadingBls] = useState(false);

  // Core entities state
  const [factures, setFactures] = useState<Facture[]>([]);
  const [bonsLivraison, setBonsLivraison] = useState<BonLivraison[]>([]);
  const [bonsRetour, setBonsRetour] = useState<BonRetour[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [familles, setFamilles] = useState<Famille[]>([]);
  const [devisList, setDevisList] = useState<Devis[]>([]);
  const [reglements, setReglements] = useState<Reglement[]>([]);
  const [stockMouvements, setStockMouvements] = useState<StockMouvement[]>([]);
  const [company, setCompany] = useState<CompanyInfo>({
    nom: 'VERDEORTO SARL AU',
    ice: '000194441000024',
    if_fiscal: '3381764',
    rc: '35265',
    cnss: '7788302',
    patente: '46201837',
    capital: '100 000,00',
    rib: '145 450 21211 2604506 000 4 11',
    adresse: 'Avenue Al Mouqaouama, Quartier Ain Merroudi, Résidence DaVinci, Bloc F, Magasin N°20',
    code_postal: '40000',
    ville: 'Marrakech',
    pays: 'Maroc',
    telephone: '0808551156 / 0678301643',
    email: 'verdeorto@gmail.com',
  });
  const [stats, setStats] = useState<DashboardStats>({
    total_facture_ht: 0,
    total_facture_ttc: 0,
    total_encaisse: 0,
    total_impaye: 0,
    factures_count: 0,
    bl_en_attente_count: 0,
    bl_en_attente_total: 0,
    br_en_attente_count: 0,
    br_en_attente_total: 0,
    clients_count: 0,
    produits_count: 0,
    fournisseurs_count: 0,
    familles_count: 0,
    categories_count: 0,
    stock_alerts_count: 0,
  });
  const [supplierAlertsCount, setSupplierAlertsCount] = useState(0);

  const dashboardStats = useMemo<DashboardStats>(() => {
    const belongsToExercise = (date?: string) => {
      if (selectedYear === 'TOUS') return true;
      const year = String(date || '').match(/(?:19|20)\d{2}/)?.[0];
      return year === selectedYear;
    };

    const exerciseFactures = factures.filter((facture) => belongsToExercise(facture.date));
    const exerciseReglements = reglements.filter((reglement) => belongsToExercise(reglement.date));
    const pendingBls = bonsLivraison.filter(
      (bl) => bl.statut === 'En attente' && belongsToExercise(bl.date)
    );
    const pendingBrs = bonsRetour.filter(
      (br) => br.statut === 'En attente' && belongsToExercise(br.date)
    );

    return {
      ...stats,
      total_facture_ht: exerciseFactures.reduce((sum, facture) => sum + Number(facture.total_ht || 0), 0),
      total_facture_ttc: exerciseFactures.reduce((sum, facture) => sum + Number(facture.total_ttc || 0), 0),
      total_encaisse: exerciseReglements.reduce((sum, reglement) => sum + Number(reglement.montant || 0), 0),
      total_impaye: exerciseFactures.reduce(
        (sum, facture) => sum + Math.max(0, Number(
          facture.reste_a_payer !== undefined
            ? facture.reste_a_payer
            : Number(facture.total_ttc || 0) - Number(facture.montant_regle || 0)
        )),
        0
      ),
      factures_count: exerciseFactures.length,
      bl_en_attente_count: pendingBls.length,
      bl_en_attente_total: pendingBls.reduce((sum, bl) => sum + Number(bl.total_ttc || 0), 0),
      br_en_attente_count: pendingBrs.length,
      br_en_attente_total: pendingBrs.reduce((sum, br) => sum + Number(br.total_ttc || 0), 0),
    };
  }, [selectedYear, factures, reglements, bonsLivraison, bonsRetour, stats]);

  // Selected entities for edit/preview
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [produitToEdit, setProduitToEdit] = useState<Produit | null>(null);
  const [produitToAdjust, setProduitToAdjust] = useState<Produit | null>(null);
  const [fournisseurToEdit, setFournisseurToEdit] = useState<Fournisseur | null>(null);
  const [blToEdit, setBlToEdit] = useState<BonLivraison | null>(null);
  const [brToEdit, setBrToEdit] = useState<BonRetour | null>(null);
  const [factureToEdit, setFactureToEdit] = useState<Facture | null>(null);
  const [paymentFacture, setPaymentFacture] = useState<Facture | null>(null);
  const [paymentToEdit, setPaymentToEdit] = useState<Reglement | null>(null);
  const [preSelectedClientId, setPreSelectedClientId] = useState<number | undefined>(undefined);

  // Document preview state
  const [previewDocType, setPreviewDocType] = useState<'FACTURE' | 'BL' | 'BR' | 'DEVIS'>('FACTURE');
  const [previewFacture, setPreviewFacture] = useState<Facture | null>(null);
  const [previewBl, setPreviewBl] = useState<BonLivraison | null>(null);
  const [previewBr, setPreviewBr] = useState<BonRetour | null>(null);
  const [previewDevis, setPreviewDevis] = useState<Devis | null>(null);

  const navigateTo = (tab: string) => {
    setPreviousTab(currentTab);
    setCurrentTab(tab);
  };

  // Lazy loading handler for Factures
  const loadFactures = useCallback(async (force = false) => {
    if (!force && isFacturesLoaded) return;
    setLoadingFactures(true);
    try {
      const fList = await fetchFactures(force);
      setFactures(fList);
      setIsFacturesLoaded(true);
    } catch (err) {
      console.error('Error lazy loading factures:', err);
    } finally {
      setLoadingFactures(false);
    }
  }, [isFacturesLoaded]);

  // Lazy loading handler for Bons de Livraison
  const loadBonsLivraison = useCallback(async (force = false) => {
    if (!force && isBlLoaded) return;
    setLoadingBls(true);
    try {
      const blList = await fetchBonsLivraison(force);
      setBonsLivraison(blList);
      setIsBlLoaded(true);
    } catch (err) {
      console.error('Error lazy loading bons livraison:', err);
    } finally {
      setLoadingBls(false);
    }
  }, [isBlLoaded]);

  // Fast Core Data Refresh (Stats, Clients, Produits, Fournisseurs) without massive document lists
  const reloadCoreData = useCallback(async () => {
    try {
      const data = await fetchAllData();
      if (data) {
        setBonsRetour(data.bons_retour || []);
        setClients(data.clients || []);
        setProduits(data.produits || []);
        setFournisseurs(data.fournisseurs || []);
        setCategories(data.categories || []);
        setFamilles(data.familles || []);
        setBonsLivraison(data.bons_livraison || []);
        setFactures(data.factures || []);
        setIsBlLoaded(true);
        setIsFacturesLoaded(true);
        setDevisList(data.devis || []);
        setReglements(data.reglements || []);
        setStockMouvements(data.stock_mouvements || []);
        if (data.company) setCompany(data.company);

        // Compute dashboard stats synchronously from snapshot
        const facturesList: Facture[] = data.factures || [];
        const blList: BonLivraison[] = data.bons_livraison || [];
        const clientsList: Client[] = data.clients || [];
        const produitsList: Produit[] = data.produits || [];

        let totalHt = 0;
        let totalTtc = 0;
        let totalEncaisse = 0;
        let totalImpaye = 0;

        for (const f of facturesList) {
          totalHt += Number(f.total_ht || 0);
          totalTtc += Number(f.total_ttc || 0);
          totalEncaisse += Number(f.montant_regle || 0);
          totalImpaye += Number(f.reste_a_payer !== undefined ? f.reste_a_payer : (Number(f.total_ttc || 0) - Number(f.montant_regle || 0)));
        }

        const blAttente = blList.filter((b) => b.statut === 'En attente');
        const stockAlerts = produitsList.filter((p) => Number(p.stock_actuel || 0) <= Number(p.stock_min || 0)).length;

        setStats({
          total_facture_ht: totalHt,
          total_facture_ttc: totalTtc,
          total_encaisse: totalEncaisse,
          total_impaye: totalImpaye,
          factures_count: facturesList.length,
          bl_en_attente_count: blAttente.length,
          bl_en_attente_total: blAttente.reduce((sum, b) => sum + Number(b.total_ttc || 0), 0),
          br_en_attente_count: (data.bons_retour || []).filter((b: any) => b.statut === 'En attente').length,
          br_en_attente_total: (data.bons_retour || []).filter((b: any) => b.statut === 'En attente').reduce((sum: number, b: any) => sum + Number(b.total_ttc || 0), 0),
          clients_count: clientsList.length,
          produits_count: produitsList.length,
          fournisseurs_count: (data.fournisseurs || []).length,
          familles_count: (data.familles || []).length,
          categories_count: (data.categories || []).length,
          stock_alerts_count: stockAlerts,
        });

        setSupplierAlertsCount(0);
      }
    } catch (e) {
      console.warn('Notice refreshing core data (fallback cache retained):', e);
    }
  }, []);

  const reloadData = useCallback(async () => {
    await reloadCoreData();
    if (isFacturesLoaded) {
      await loadFactures(true);
    }
    if (isBlLoaded) {
      await loadBonsLivraison(true);
    }
  }, [reloadCoreData, isFacturesLoaded, isBlLoaded, loadFactures, loadBonsLivraison]);

  // Trigger lazy loading automatically when user opens the specific tab
  useEffect(() => {
    if (currentTab === 'factures') {
      loadFactures();
    } else if (currentTab === 'bl' || currentTab === 'workflow-bl-facture') {
      loadBonsLivraison();
    } else if (currentTab === 'clients') {
      // Clients detail view can display client's BLs/Factures if opened
      if (!isFacturesLoaded) loadFactures();
      if (!isBlLoaded) loadBonsLivraison();
    }
  }, [currentTab, isFacturesLoaded, isBlLoaded, loadFactures, loadBonsLivraison]);

  // Initial Boot
  const bootDatabase = useCallback(async () => {
    setLoading(true);
    setInitError(null);
    try {
      await initSqliteDatabase();
      setSqliteReady(true);
      await reloadData();
      testNeonConnection();
    } catch (err: any) {
      console.error('Failed to initialize PostgreSQL Neon database:', err);
      setInitError(err?.message || 'Erreur lors de la connexion à la base de données PostgreSQL');
    } finally {
      setLoading(false);
    }
  }, [reloadData]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const sessionUser = await getAuthenticatedSession();
        if (isMounted) {
          setSqliteReady(true);
          testNeonConnection();
          if (sessionUser) {
            setCurrentUser(sessionUser);
            await initSqliteDatabase();
            await reloadData();
            if (sessionUser.role === 'CAISSE') setCurrentTab('pos');
          }
        }
      } catch (err: any) {
        console.error('Initial PostgreSQL boot error:', err);
        if (isMounted) {
          setInitError(err?.message || 'Erreur lors du chargement de la base de données');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [reloadData]);

  const handleGlobalImportSqlite = async (file: File) => {
    setIsImportModalOpen(true);
    setImportSummary(null);
    try {
      const summary = await importDatabaseWithProgress(file, (prog: DbImportProgress) => {
        setImportProgress(prog);
      });
      setImportSummary(summary);
      setTimeout(async () => {
        try {
          await reloadData();
        } catch (e) {
          console.warn('Error refreshing data after import:', e);
        }
      }, 50);
    } catch (err: any) {
      setImportProgress({
        phase: 'error',
        uploadPercent: 0,
        treatmentPercent: 0,
        overallPercent: 0,
        currentStepMessage: 'Erreur d\'importation',
        error: err?.message || 'Impossible de restaurer cette base SQLite.',
      });
    }
  };

  const handleLoginSuccess = async (user: AppUser) => {
    setCurrentUser(user);
    setIsScreenLocked(false);
    try {
      localStorage.setItem('verdeorto_auth_user', JSON.stringify(user));
    } catch (e) {
      console.warn('Could not persist auth in localStorage', e);
    }
    if (user.role === 'CAISSE') {
      setCurrentTab('pos');
    } else {
      setCurrentTab('pos');
    }
    await reloadData();
  };

  const handleLogout = async () => {
    await logoutAuthenticatedSession();
    try {
      localStorage.removeItem('verdeorto_auth_user');
    } catch (e) {
      console.warn(e);
    }
    setCurrentUser(null);
    setIsScreenLocked(false);
  };

  // Handler: Batch Invoicing from BLs and BRs
  const handleBatchInvoice = async (params: {
    bl_ids: number[];
    br_ids?: number[];
    date: string;
    mode_reglement: string;
    notes: string;
  }) => {
    const newInvoiceId = await createFactureFromBLs(params);
    await reloadData();
    return newInvoiceId;
  };

  // Preview generated invoice
  const handleViewFactureById = async (factureId: number) => {
    await reloadData();
    const updatedFactures = await fetchFactures();
    const target = updatedFactures.find((f) => f.id === factureId);
    if (target) {
      setPreviewDocType('FACTURE');
      setPreviewFacture(target);
      navigateTo('preview-document');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none -top-20 -left-20" />
        <div className="absolute w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -bottom-20 -right-20" />

        <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl space-y-6 relative z-10">
          {/* Logo & App title */}
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-600/20 text-white font-bold text-2xl">
              VO
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white mt-1">
              Verde Orto ERP & Caisse
            </h1>
            <p className="text-xs text-slate-400">
              Système de Gestion Commerciale, Facturation & Caisse POS
            </p>
          </div>

          {/* Progress Bar & Percentage */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                Connexion PostgreSQL Neon
              </span>
              <span className="text-emerald-400 font-mono font-bold text-sm">
                En ligne
              </span>
            </div>

            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-400 rounded-full transition-all duration-300 ease-out w-full animate-pulse"
              />
            </div>

            {/* Current Stage Message */}
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs space-y-1">
              <div className="font-semibold text-slate-200 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                <span>Chargement de la base de données cloud...</span>
              </div>
              <div className="text-[11px] text-slate-400 pl-5.5">
                Accès direct aux clients, produits, factures et caisse POS
              </div>
            </div>
          </div>

          {/* Step badges */}
          <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
            <div className="p-2 rounded-lg border flex items-center gap-2 bg-emerald-950/40 border-emerald-500/30 text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>1. Serveur Neon PostgreSQL</span>
            </div>
            <div className="p-2 rounded-lg border flex items-center gap-2 bg-emerald-950/40 border-emerald-500/30 text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>2. Tables Relationnelles</span>
            </div>
            <div className="p-2 rounded-lg border flex items-center gap-2 bg-emerald-950/40 border-emerald-500/30 text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>3. Référentiels & Tarifs</span>
            </div>
            <div className="p-2 rounded-lg border flex items-center gap-2 bg-emerald-950/40 border-emerald-500/30 text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>4. Caisse & Ventes POS</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4 p-6">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Erreur de chargement</h2>
            <p className="text-xs text-slate-400 mt-1">{initError}</p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => bootDatabase()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow transition-colors"
            >
              Réessayer
            </button>
            <button
              onClick={async () => {
                localStorage.clear();
                window.location.reload();
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg border border-slate-700 transition-colors"
            >
              Réinitialiser les données
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated, display the AuthView login screen
  if (!currentUser) {
    return <AuthView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900">
      <ReferenceDataLists />
      {/* Global Database Progress Modal */}
      <DatabaseProgressModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        progress={importProgress}
        summary={importSummary}
      />

      {/* Quick Lock Screen Modal */}
      {isScreenLocked && currentUser && (
        <LockScreenModal
          user={currentUser}
          onUnlock={() => setIsScreenLocked(false)}
          onLogout={handleLogout}
        />
      )}

      {/* User & Access Management Modal */}
      <UserManagementModal
        isOpen={isUserManagementOpen}
        onClose={() => setIsUserManagementOpen(false)}
        currentUser={currentUser}
        onUserUpdated={reloadData}
      />

      {/* Top Application Header */}
      <Header
        currentTab={currentTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        onLockScreen={() => setIsScreenLocked(true)}
        onOpenUserManagement={() => setIsUserManagementOpen(true)}
        onOpenNewBl={() => {
          setPreSelectedClientId(undefined);
          navigateTo('create-bl');
        }}
        onOpenNewFacture={() => {
          setPreSelectedClientId(undefined);
          navigateTo('create-facture');
        }}
        onOpenNewClient={() => {
          setClientToEdit(null);
          navigateTo('create-client');
        }}
        onOpenNewProduit={() => {
          setProduitToEdit(null);
          navigateTo('create-produit');
        }}
        onDataReload={reloadData}
        globalSearch={globalSearch}
        setGlobalSearch={setGlobalSearch}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Sidebar Navigation */}
        <Sidebar
          currentTab={currentTab}
          setCurrentTab={(tab) => {
            setPreviousTab(currentTab);
            setCurrentTab(tab);
          }}
          blEnAttenteCount={stats.bl_en_attente_count}
          brEnAttenteCount={stats.br_en_attente_count}
          stockAlertsCount={stats.stock_alerts_count}
          supplierAlertsCount={supplierAlertsCount}
          mobileOpen={mobileMenuOpen}
          setMobileOpen={setMobileMenuOpen}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          currentUser={currentUser}
          onLogout={handleLogout}
          onLockScreen={() => setIsScreenLocked(true)}
          onOpenUserManagement={() => setIsUserManagementOpen(true)}
        />

        {/* Viewport Content */}
        <main className={`flex-1 p-3 sm:p-6 lg:p-7 w-full mx-auto overflow-x-hidden pb-24 lg:pb-7 transition-[max-width] duration-300 ${sidebarCollapsed ? 'max-w-none' : 'max-w-[1600px]'}`}>
          {/* 1. DASHBOARD */}
          {currentTab === 'dashboard' && (
            <DashboardView
              stats={dashboardStats}
              exercise={selectedYear}
              recentFactures={factures}
              recentBls={bonsLivraison}
              onNavigate={navigateTo}
              onOpenBatchInvoicing={() => navigateTo('workflow-bl-facture')}
              onOpenNewBl={() => {
                setBlToEdit(null);
                setPreSelectedClientId(undefined);
                navigateTo('create-bl');
              }}
              onOpenNewBr={() => {
                setBrToEdit(null);
                navigateTo('create-br');
              }}
              onOpenNewFacture={() => {
                setFactureToEdit(null);
                setPreSelectedClientId(undefined);
                navigateTo('create-facture');
              }}
            />
          )}

          {/* 1.1 POINT DE VENTE (POS) - ENTIRELY SEPARATED DATA */}
          {currentTab === 'pos' && (
            <PosView
              initialSubPage="TERMINAL"
              onNavigateTab={navigateTo}
              currentUser={currentUser}
              onLockScreen={() => setIsScreenLocked(true)}
              onExportSqlite={async () => {
                const u8 = await exportSqliteDatabase();
                const blob = new Blob([u8 as BlobPart], { type: 'application/x-sqlite3' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `verdeorto_pos_backup_${new Date().toISOString().split('T')[0]}.sqlite`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              onImportSqlite={handleGlobalImportSqlite}
            />
          )}
          {currentTab === 'pos-tickets' && (
            <PosView
              initialSubPage="TICKETS"
              onNavigateTab={navigateTo}
              currentUser={currentUser}
              onLockScreen={() => setIsScreenLocked(true)}
              onExportSqlite={async () => {
                const u8 = await exportSqliteDatabase();
                const blob = new Blob([u8 as BlobPart], { type: 'application/x-sqlite3' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `verdeorto_pos_backup_${new Date().toISOString().split('T')[0]}.sqlite`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              onImportSqlite={handleGlobalImportSqlite}
            />
          )}
          {currentTab === 'pos-produits' && (
            <PosView
              initialSubPage="PRODUITS"
              onNavigateTab={navigateTo}
              currentUser={currentUser}
              onLockScreen={() => setIsScreenLocked(true)}
              onExportSqlite={async () => {
                const u8 = await exportSqliteDatabase();
                const blob = new Blob([u8 as BlobPart], { type: 'application/x-sqlite3' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `verdeorto_pos_backup_${new Date().toISOString().split('T')[0]}.sqlite`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              onImportSqlite={handleGlobalImportSqlite}
            />
          )}
          {currentTab === 'pos-sessions' && (
            <PosView
              initialSubPage="SESSIONS"
              onNavigateTab={navigateTo}
              currentUser={currentUser}
              onLockScreen={() => setIsScreenLocked(true)}
              onExportSqlite={async () => {
                const u8 = await exportSqliteDatabase();
                const blob = new Blob([u8 as BlobPart], { type: 'application/x-sqlite3' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `verdeorto_pos_backup_${new Date().toISOString().split('T')[0]}.sqlite`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
              onImportSqlite={handleGlobalImportSqlite}
            />
          )}

          {/* 2. FACTURES LIST */}
          {currentTab === 'factures' && (
            <FacturesView
              factures={factures}
              company={company}
              isLoading={loadingFactures}
              onRefresh={() => loadFactures(true)}
              onOpenNewFacture={() => {
                setFactureToEdit(null);
                setPreSelectedClientId(undefined);
                navigateTo('create-facture');
              }}
              onOpenBatchInvoicing={() => navigateTo('workflow-bl-facture')}
              onEditFacture={(f) => {
                setFactureToEdit(f);
                navigateTo('create-facture');
              }}
              onUpdateFactureState={async (id, newState) => {
                try {
                  await updateFactureState(id, newState);
                  await reloadData();
                } catch (error) {
                  alert(error instanceof Error ? error.message : 'Impossible de modifier l’état de la facture.');
                }
              }}
              onOpenPaymentModal={(f) => {
                setPaymentFacture(f);
                setPaymentToEdit(null);
                navigateTo('create-payment');
              }}
              onViewFacture={(f) => {
                setPreviewDocType('FACTURE');
                setPreviewFacture(f);
                navigateTo('preview-document');
              }}
              onDeleteFacture={async (id) => {
                await deleteFacture(id);
                await reloadData();
              }}
            />
          )}

          {/* 3. BONS DE LIVRAISON LIST */}
          {currentTab === 'bl' && (
            <BonsLivraisonView
              bonsLivraison={bonsLivraison}
              company={company}
              isLoading={loadingBls}
              onRefresh={() => loadBonsLivraison(true)}
              onOpenNewBl={() => {
                setBlToEdit(null);
                setPreSelectedClientId(undefined);
                navigateTo('create-bl');
              }}
              onEditBl={(bl) => {
                setBlToEdit(bl);
                navigateTo('create-bl');
              }}
              onUpdateBlState={async (id, newState) => {
                const previousState = bonsLivraison.find((bl) => bl.id === id)?.etat || 'Validé';
                setBonsLivraison((documents) =>
                  documents.map((document) =>
                    document.id === id ? { ...document, etat: newState } : document
                  )
                );
                try {
                  await updateBonLivraisonState(id, newState);
                } catch (error) {
                  setBonsLivraison((documents) =>
                    documents.map((document) =>
                      document.id === id ? { ...document, etat: previousState } : document
                    )
                  );
                  alert(error instanceof Error ? error.message : 'Impossible de modifier l’état du BL.');
                }
              }}
              onViewBl={(bl) => {
                setPreviewDocType('BL');
                setPreviewBl(bl);
                navigateTo('preview-document');
              }}
              onDeleteBl={async (id) => {
                await deleteBonLivraison(id);
                setBonsLivraison((documents) => documents.filter((document) => document.id !== id));
              }}
              onBatchInvoiceSelected={() => {
                navigateTo('workflow-bl-facture');
              }}
            />
          )}

          {/* 4. BONS DE RETOUR LIST (BR) */}
          {currentTab === 'br' && (
            <BonsRetourView
              bonsRetour={bonsRetour}
              company={company}
              onOpenNewBr={() => {
                setBrToEdit(null);
                navigateTo('create-br');
              }}
              onEditBr={(br) => {
                setBrToEdit(br);
                navigateTo('create-br');
              }}
              onUpdateBrState={async (id, newState) => {
                try {
                  await updateBonRetourState(id, newState);
                  await reloadData();
                } catch (error) {
                  alert(error instanceof Error ? error.message : 'Impossible de modifier l’état du BR.');
                }
              }}
              onViewBr={(br) => {
                setPreviewDocType('BR');
                setPreviewBr(br);
                navigateTo('preview-document');
              }}
              onDeleteBr={async (id) => {
                await deleteBonRetour(id);
                await reloadData();
              }}
              onBatchInvoiceSelected={() => {
                navigateTo('workflow-bl-facture');
              }}
            />
          )}

          {/* 5. WORKFLOW BL [+] & RETOUR [-] -> FACTURE NETTE */}
          {currentTab === 'workflow-bl-facture' && (
            <WorkflowBlFactureView
              bonsLivraison={bonsLivraison}
              bonsRetour={bonsRetour}
              clients={clients}
              company={company}
              onGenerateInvoice={handleBatchInvoice}
              onViewGeneratedFacture={handleViewFactureById}
              onCloseBl={async (blId) => {
                await closeBonLivraisonWithoutInvoice(blId);
                setBonsLivraison((documents) =>
                  documents.map((document) =>
                    document.id === blId
                      ? { ...document, cloture_sans_facture: true, statut: 'Clôturé' }
                      : document
                  )
                );
              }}
            />
          )}

          {/* 6. DEVIS LIST */}
          {currentTab === 'devis' && (
            <DevisView
              devisList={devisList}
              company={company}
              onOpenNewDevis={() => navigateTo('create-devis')}
              onViewDevis={(d) => {
                setPreviewDocType('DEVIS');
                setPreviewDevis(d);
                navigateTo('preview-document');
              }}
              onDeleteDevis={async (id) => {
                await deleteDevis(id);
                await reloadData();
              }}
            />
          )}

          {/* 7. PRODUITS / STOCK */}
          {currentTab === 'produits' && (
            <ProduitsStockView
              produits={produits}
              stockMouvements={stockMouvements}
              onOpenNewProduit={() => {
                setProduitToEdit(null);
                navigateTo('create-produit');
              }}
              onOpenEditProduit={(p) => {
                setProduitToEdit(p);
                navigateTo('create-produit');
              }}
              onOpenStockAdjust={(p) => {
                setProduitToAdjust(p);
                navigateTo('adjust-stock');
              }}
              onDeleteProduit={async (id) => {
                await deleteProduit(id);
                await reloadData();
              }}
            />
          )}

          {/* 8. CLIENTS */}
          {currentTab === 'clients' && (
            <ClientsView
              clients={clients}
              bonsLivraison={bonsLivraison}
              factures={factures}
              produits={produits}
              onOpenNewClient={() => {
                setClientToEdit(null);
                navigateTo('create-client');
              }}
              onEditClient={(c) => {
                setClientToEdit(c);
                navigateTo('create-client');
              }}
              onDeleteClient={async (id) => {
                await deleteClient(id);
                await reloadData();
              }}
              onNewBlForClient={(c) => {
                setPreSelectedClientId(c.id);
                navigateTo('create-bl');
              }}
              onNewFactureForClient={(c) => {
                setPreSelectedClientId(c.id);
                navigateTo('create-facture');
              }}
            />
          )}

          {/* 9. ACHATS & FOURNISSEURS SUB-PAGES */}
          {currentTab === 'fournisseurs' && (
            <FournisseursView
              initialSubPage="FOURNISSEURS"
              fournisseurs={fournisseurs}
              produits={produits}
              onNavigateTab={navigateTo}
              onOpenNewFournisseur={() => {
                setFournisseurToEdit(null);
                navigateTo('create-fournisseur');
              }}
              onEditFournisseur={(f) => {
                setFournisseurToEdit(f);
                navigateTo('create-fournisseur');
              }}
              onDeleteFournisseur={async (id) => {
                await deleteFournisseur(id);
                await reloadData();
              }}
              onRefreshData={reloadData}
            />
          )}

          {currentTab === 'factures-fournisseurs' && (
            <FournisseursView
              initialSubPage="FACTURES"
              fournisseurs={fournisseurs}
              produits={produits}
              onNavigateTab={navigateTo}
              onOpenNewFournisseur={() => {
                setFournisseurToEdit(null);
                navigateTo('create-fournisseur');
              }}
              onEditFournisseur={(f) => {
                setFournisseurToEdit(f);
                navigateTo('create-fournisseur');
              }}
              onDeleteFournisseur={async (id) => {
                await deleteFournisseur(id);
                await reloadData();
              }}
              onRefreshData={reloadData}
            />
          )}

          {currentTab === 'paiements-fournisseurs' && (
            <FournisseursView
              initialSubPage="PAIEMENTS"
              fournisseurs={fournisseurs}
              produits={produits}
              onNavigateTab={navigateTo}
              onOpenNewFournisseur={() => {
                setFournisseurToEdit(null);
                navigateTo('create-fournisseur');
              }}
              onEditFournisseur={(f) => {
                setFournisseurToEdit(f);
                navigateTo('create-fournisseur');
              }}
              onDeleteFournisseur={async (id) => {
                await deleteFournisseur(id);
                await reloadData();
              }}
              onRefreshData={reloadData}
            />
          )}

          {currentTab === 'fournisseurs-reconciliation' && (
            <FournisseursView
              initialSubPage="RAPPROCHEMENT"
              fournisseurs={fournisseurs}
              produits={produits}
              onNavigateTab={navigateTo}
              onOpenNewFournisseur={() => {
                setFournisseurToEdit(null);
                navigateTo('create-fournisseur');
              }}
              onEditFournisseur={(f) => {
                setFournisseurToEdit(f);
                navigateTo('create-fournisseur');
              }}
              onDeleteFournisseur={async (id) => {
                await deleteFournisseur(id);
                await reloadData();
              }}
              onRefreshData={reloadData}
            />
          )}

          {currentTab === 'fournisseurs-alertes' && (
            <FournisseursView
              initialSubPage="ALERTES"
              fournisseurs={fournisseurs}
              produits={produits}
              onNavigateTab={navigateTo}
              onOpenNewFournisseur={() => {
                setFournisseurToEdit(null);
                navigateTo('create-fournisseur');
              }}
              onEditFournisseur={(f) => {
                setFournisseurToEdit(f);
                navigateTo('create-fournisseur');
              }}
              onDeleteFournisseur={async (id) => {
                await deleteFournisseur(id);
                await reloadData();
              }}
              onRefreshData={reloadData}
            />
          )}

          {/* 10. REGLEMENTS */}
          {currentTab === 'reglements' && (
            <ReglementsView
              reglements={reglements}
              onOpenNewPayment={() => {
                setPaymentFacture(null);
                setPaymentToEdit(null);
                navigateTo('create-payment');
              }}
              onEditReglement={(reglement) => {
                setPaymentFacture(null);
                setPaymentToEdit(reglement);
                navigateTo('create-payment');
              }}
              onDeleteReglement={async (id) => {
                await deleteReglement(id);
                await reloadData();
              }}
            />
          )}

          {/* 11. ETATS & RAPPORTS AVEC DATE RANGE & BLS */}
          {currentTab === 'etats' && (
            <EtatsRapportsView
              factures={factures}
              bonsLivraison={bonsLivraison}
              clients={clients}
              produits={produits}
              onViewBl={(bl) => {
                setPreviewDocType('BL');
                setPreviewBl(bl);
                navigateTo('preview-document');
              }}
              onFacturerBl={() => {
                navigateTo('workflow-bl-facture');
              }}
            />
          )}

          {/* 11.2 ASSISTANT IA BASE DE DONNEES (GEMINI COPILOT) */}
          {currentTab === 'ai-copilot' && (
            <AiDatabaseCopilotView onDataChanged={reloadCoreData} />
          )}

          {/* 12. CONSOLE SQLITE */}
          {currentTab === 'sqlite' && (
            <SqliteConsoleView onDatabaseChanged={reloadData} />
          )}

          {/* 13. PARAMETRES SOCIETE */}
          {currentTab === 'company' && (
            <CompanySettingsView
              company={company}
              onSaveCompany={async (newInfo) => {
                await updateCompanyInfo(newInfo);
                await reloadData();
              }}
            />
          )}

          {/* ============================================================ */}
          {/* FULL PAGE FORM & PREVIEW VIEWS WITH RETURN BUTTONS */}
          {/* ============================================================ */}

          {/* FULL PAGE: NOUVEAU / MODIFIER BL */}
          {currentTab === 'create-bl' && (
            <CreateBlView
              clients={clients}
              produits={produits}
              preSelectedClientId={preSelectedClientId}
              blToEdit={blToEdit}
              onBack={() => {
                setBlToEdit(null);
                setCurrentTab(previousTab === 'create-bl' ? 'bl' : previousTab);
              }}
              onSave={async (data) => {
                let saved: BonLivraison;
                if (blToEdit) {
                  saved = await updateBonLivraison(blToEdit.id, data);
                } else {
                  saved = await createBonLivraison(data);
                }
                setBonsLivraison((documents) => [
                  saved,
                  ...documents.filter((document) => Number(document.id) !== Number(saved.id)),
                ]);
                setIsBlLoaded(true);
                setBlToEdit(null);
                setCurrentTab('bl');
              }}
            />
          )}

          {/* FULL PAGE: NOUVEAU / MODIFIER BON DE RETOUR (BR) */}
          {currentTab === 'create-br' && (
            <CreateBonRetourView
              clients={clients}
              produits={produits}
              brToEdit={brToEdit}
              onCancel={() => {
                setBrToEdit(null);
                setCurrentTab(previousTab === 'create-br' ? 'br' : previousTab);
              }}
              onSave={async (brData) => {
                if (brToEdit) {
                  await updateBonRetour(brToEdit.id, brData);
                } else {
                  await createBonRetour(brData);
                }
                await reloadData();
                setBrToEdit(null);
                setCurrentTab('br');
              }}
            />
          )}

          {/* FULL PAGE: NOUVELLE / MODIFIER FACTURE */}
          {currentTab === 'create-facture' && (
            <CreateFactureView
              clients={clients}
              produits={produits}
              preSelectedClientId={preSelectedClientId}
              factureToEdit={factureToEdit}
              onBack={() => {
                setFactureToEdit(null);
                setCurrentTab(previousTab === 'create-facture' ? 'factures' : previousTab);
              }}
              onSave={async (data) => {
                if (factureToEdit) {
                  await updateFacture(factureToEdit.id, data);
                } else {
                  await createFacture(data);
                }
                await reloadData();
                setFactureToEdit(null);
                setCurrentTab('factures');
              }}
            />
          )}

          {/* FULL PAGE: NOUVEAU DEVIS */}
          {currentTab === 'create-devis' && (
            <CreateDevisView
              clients={clients}
              produits={produits}
              onBack={() => setCurrentTab('devis')}
              onSave={async (data) => {
                await createDevis(data);
                await reloadData();
                setCurrentTab('devis');
              }}
            />
          )}

          {/* FULL PAGE: NOUVEAU / MODIFIER CLIENT */}
          {currentTab === 'create-client' && (
            <CreateClientView
              clientToEdit={clientToEdit}
              onBack={() => setCurrentTab('clients')}
              onSave={async (cData) => {
                if (clientToEdit) {
                  await updateClient(clientToEdit.id, cData);
                } else {
                  await createClient(cData as any);
                }
                await reloadData();
                setCurrentTab('clients');
              }}
            />
          )}

          {/* FULL PAGE: NOUVEAU / MODIFIER PRODUIT */}
          {currentTab === 'create-produit' && (
            <CreateProduitView
              produitToEdit={produitToEdit}
              categories={categories}
              familles={familles}
              onBack={() => setCurrentTab('produits')}
              onSave={async (pData) => {
                if (produitToEdit) {
                  await updateProduit(produitToEdit.id, pData);
                } else {
                  await createProduit(pData as any);
                }
                await reloadData();
                setCurrentTab('produits');
              }}
            />
          )}

          {/* FULL PAGE: NOUVEAU / MODIFIER FOURNISSEUR */}
          {currentTab === 'create-fournisseur' && (
            <CreateFournisseurView
              fournisseurToEdit={fournisseurToEdit}
              onBack={() => setCurrentTab('fournisseurs')}
              onSave={async (fData) => {
                if (fournisseurToEdit) {
                  await updateFournisseur(fournisseurToEdit.id, fData);
                } else {
                  await createFournisseur(fData as any);
                }
                await reloadData();
                setCurrentTab('fournisseurs');
              }}
            />
          )}

          {/* FULL PAGE: REGLEMENT / ENCAISSEMENT */}
          {currentTab === 'create-payment' && (
            <PaymentView
              facture={paymentFacture}
              paymentToEdit={paymentToEdit}
              factures={factures}
              clients={clients}
              onBack={() => {
                setPaymentToEdit(null);
                setPaymentFacture(null);
                setCurrentTab('reglements');
              }}
              onSave={async (pData) => {
                if (paymentToEdit) {
                  await updateReglement(paymentToEdit.id, pData);
                } else {
                  await createReglement(pData);
                }
                await reloadData();
                setPaymentToEdit(null);
                setPaymentFacture(null);
                setCurrentTab('reglements');
              }}
            />
          )}

          {/* FULL PAGE: MOUVEMENT / AJUSTEMENT DE STOCK */}
          {currentTab === 'adjust-stock' && (
            <AdjustStockView
              produits={produits}
              preSelectedProduitId={produitToAdjust?.id}
              onBack={() => setCurrentTab('produits')}
              onSave={async (sData) => {
                await adjustStock(sData);
                await reloadData();
                setCurrentTab('produits');
              }}
            />
          )}

          {/* FULL PAGE: APERCU DE DOCUMENT AVEC BOUTON RETOUR */}
          {currentTab === 'preview-document' && (
            <DocumentPreviewView
              documentType={previewDocType}
              facture={previewFacture}
              bl={previewBl}
              br={previewBr}
              devis={previewDevis}
              company={company}
              onBack={() => setCurrentTab(previousTab === 'preview-document' ? 'factures' : previousTab)}
            />
          )}
        </main>
      </div>

      {/* Mobile Sticky Bottom Navigation Bar */}
      <nav
        id="mobile-bottom-nav"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-900/90 backdrop-blur-lg border-t border-slate-800/80 px-1 pt-1.5 pb-[max(env(safe-area-inset-bottom,0px),8px)] shadow-2xl flex items-center justify-around select-none safe-area-bottom"
        aria-label="Navigation rapide mobile"
      >
        <button
          type="button"
          onClick={() => {
            setPreviousTab(currentTab);
            setCurrentTab('pos');
          }}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl transition touch-manipulation active:scale-95 ${
            currentTab.startsWith('pos')
              ? 'text-blue-400 bg-blue-950/60 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Store className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Caisse</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setPreviousTab(currentTab);
            setCurrentTab('bl');
          }}
          className={`flex flex-col items-center justify-center relative min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl transition touch-manipulation active:scale-95 ${
            currentTab === 'bl' || currentTab === 'create-bl'
              ? 'text-blue-400 bg-blue-950/60 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Truck className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">BL</span>
          {stats.bl_en_attente_count > 0 && (
            <span className="absolute top-1 right-1.5 w-4 h-4 bg-amber-500 text-slate-950 text-[9px] font-black rounded-full flex items-center justify-center">
              {stats.bl_en_attente_count}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setPreviousTab(currentTab);
            setCurrentTab('factures');
          }}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl transition touch-manipulation active:scale-95 ${
            currentTab === 'factures' || currentTab === 'create-facture'
              ? 'text-blue-400 bg-blue-950/60 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Factures</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setPreviousTab(currentTab);
            setCurrentTab('produits');
          }}
          className={`flex flex-col items-center justify-center relative min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl transition touch-manipulation active:scale-95 ${
            currentTab === 'produits' || currentTab === 'create-produit'
              ? 'text-blue-400 bg-blue-950/60 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Package className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Stocks</span>
          {stats.stock_alerts_count > 0 && (
            <span className="absolute top-1 right-1.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
              {stats.stock_alerts_count}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl text-slate-400 hover:text-slate-200 transition touch-manipulation active:scale-95"
          aria-label="Ouvrir tous les menus"
        >
          <MenuIcon className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">Menu</span>
        </button>
      </nav>

      {/* Global Floating Gemini Assistant (Messenger Style across all pages) */}
      <GeminiFloatingChat onDataChanged={reloadCoreData} onNavigateTab={navigateTo} />
    </div>
  );
}
