'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Fournisseur,
  FactureFournisseur,
  PaiementFournisseur,
  ChequeFournisseurAlert,
  SupplierReconciliation,
  Produit,
} from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  fetchFacturesFournisseurs,
  createFactureFournisseur,
  deleteFactureFournisseur,
  fetchPaiementsFournisseurs,
  createPaiementFournisseur,
  updateStatutChequeFournisseur,
  deletePaiementFournisseur,
  fetchImpendingSupplierCheques,
  fetchSupplierReconciliation,
  updateFournisseur,
} from '@/lib/sqlite-service';
import {
  Plus,
  Search,
  Building2,
  Phone,
  Mail,
  MapPin,
  Edit,
  Trash2,
  FileText,
  CreditCard,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  TrendingDown,
  X,
  Check,
  Filter,
  DollarSign,
  Receipt,
  Download,
  AlertCircle,
  HelpCircle,
  Eye,
  FileSpreadsheet,
} from 'lucide-react';

export type SupplierSubPage = 'FOURNISSEURS' | 'FACTURES' | 'PAIEMENTS' | 'ALERTES' | 'RAPPROCHEMENT';

const getTodayIso = () => new Date().toISOString().split('T')[0];
const getFutureIso = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

interface FournisseursViewProps {
  fournisseurs: Fournisseur[];
  produits?: Produit[];
  initialSubPage?: SupplierSubPage;
  onNavigateTab?: (tab: string) => void;
  onOpenNewFournisseur: () => void;
  onEditFournisseur: (f: Fournisseur) => void;
  onDeleteFournisseur: (id: number) => void;
  onRefreshData?: () => void;
}

export const FournisseursView: React.FC<FournisseursViewProps> = ({
  fournisseurs = [],
  produits = [],
  initialSubPage = 'FOURNISSEURS',
  onNavigateTab,
  onOpenNewFournisseur,
  onEditFournisseur,
  onDeleteFournisseur,
  onRefreshData,
}) => {
  const safeFournisseurs = useMemo(() => Array.isArray(fournisseurs) ? fournisseurs : [], [fournisseurs]);
  const [internalTab, setInternalTab] = useState<SupplierSubPage | null>(null);
  const [prevInitialSubPage, setPrevInitialSubPage] = useState(initialSubPage);

  if (prevInitialSubPage !== initialSubPage) {
    setPrevInitialSubPage(initialSubPage);
    setInternalTab(null);
  }

  const activeTab = internalTab ?? initialSubPage;

  // Supplier Invoices & Payments state
  const [facturesFournisseurs, setFacturesFournisseurs] = useState<FactureFournisseur[]>([]);
  const [paiementsFournisseurs, setPaiementsFournisseurs] = useState<PaiementFournisseur[]>([]);
  const [chequeAlerts, setChequeAlerts] = useState<ChequeFournisseurAlert[]>([]);
  const [reconciliations, setReconciliations] = useState<SupplierReconciliation[]>([]);

  // Filters & Search states
  const [searchFournisseur, setSearchFournisseur] = useState('');
  const [searchFacture, setSearchFacture] = useState('');
  const [filterFactureStatus, setFilterFactureStatus] = useState<'TOUS' | 'Impayée' | 'Partiel' | 'Payée'>('TOUS');
  const [filterFactureSupplier, setFilterFactureSupplier] = useState<number | 'TOUS'>('TOUS');

  const [searchPaiement, setSearchPaiement] = useState('');
  const [filterPaymentMode, setFilterPaymentMode] = useState<string>('TOUS');
  const [filterChequeStatus, setFilterChequeStatus] = useState<string>('TOUS');

  const [searchReconciliation, setSearchReconciliation] = useState('');

  // Drill-down supplier account statement modal
  const [statementSupplier, setStatementSupplier] = useState<Fournisseur | null>(null);

  // Modal: New Supplier Invoice
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invSupplierId, setInvSupplierId] = useState<number>(() => {
    return safeFournisseurs.length > 0 && safeFournisseurs[0] ? safeFournisseurs[0].id : 0;
  });
  const [invNumero, setInvNumero] = useState('');
  const [invDate, setInvDate] = useState(getTodayIso);
  const [invDateEcheance, setInvDateEcheance] = useState(() => getFutureIso(30));
  const [invDesignation, setInvDesignation] = useState('');
  const [invTotalHt, setInvTotalHt] = useState('');
  const [invTva20, setInvTva20] = useState('');
  const [invTva10, setInvTva10] = useState('');
  const [invTva7, setInvTva7] = useState('');
  const [invNotes, setInvNotes] = useState('');

  // Modal: New Supplier Payment / Cheque
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paySupplierId, setPaySupplierId] = useState<number>(() => {
    return safeFournisseurs.length > 0 && safeFournisseurs[0] ? safeFournisseurs[0].id : 0;
  });
  const [payFactureId, setPayFactureId] = useState<number | ''>('');
  const [payDate, setPayDate] = useState(getTodayIso);
  const [payMontant, setPayMontant] = useState('');
  const [payMode, setPayMode] = useState('Chèque');
  const [payChequeRef, setPayChequeRef] = useState('');
  const [payBanque, setPayBanque] = useState('Attijariwafa Bank');
  const [payEcheanceDepot, setPayEcheanceDepot] = useState(() => getFutureIso(3));
  const [payStatutCheque, setPayStatutCheque] = useState<'En attente' | 'Déposé / Débité' | 'Annulé'>('En attente');
  const [payNotes, setPayNotes] = useState('');

  // Load all supplier data from SQLite
  const reloadData = React.useCallback(async () => {
    try {
      const [facs, pays, alerts, recons] = await Promise.all([
        fetchFacturesFournisseurs(),
        fetchPaiementsFournisseurs(),
        fetchImpendingSupplierCheques(),
        fetchSupplierReconciliation(),
      ]);
      setFacturesFournisseurs(facs);
      setPaiementsFournisseurs(pays);
      setChequeAlerts(alerts);
      setReconciliations(recons);
    } catch (err) {
      console.error('Error fetching supplier data:', err);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [facs, pays, alerts, recons] = await Promise.all([
          fetchFacturesFournisseurs(),
          fetchPaiementsFournisseurs(),
          fetchImpendingSupplierCheques(),
          fetchSupplierReconciliation(),
        ]);
        if (active) {
          setFacturesFournisseurs(facs);
          setPaiementsFournisseurs(pays);
          setChequeAlerts(alerts);
          setReconciliations(recons);
        }
      } catch (err) {
        console.error('Error fetching supplier data:', err);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [fournisseurs]);

  // Tab switcher helper with navigation syncing
  const handleTabChange = (tab: SupplierSubPage) => {
    setInternalTab(tab);
    if (onNavigateTab) {
      if (tab === 'FOURNISSEURS') onNavigateTab('fournisseurs');
      else if (tab === 'FACTURES') onNavigateTab('factures-fournisseurs');
      else if (tab === 'PAIEMENTS') onNavigateTab('paiements-fournisseurs');
      else if (tab === 'ALERTES') onNavigateTab('fournisseurs-alertes');
      else if (tab === 'RAPPROCHEMENT') onNavigateTab('fournisseurs-reconciliation');
    }
  };

  // Comprehensive supplier contact search across all fields
  const filteredFournisseurs = useMemo(() => {
    if (!searchFournisseur) return safeFournisseurs;
    const q = searchFournisseur.toLowerCase();
    return safeFournisseurs.filter((f) => {
      if (!f) return false;
      return (
        (f.nom && f.nom.toLowerCase().includes(q)) ||
        (f.code && f.code.toLowerCase().includes(q)) ||
        (f.interlocuteur && f.interlocuteur.toLowerCase().includes(q)) ||
        (f.ville && f.ville.toLowerCase().includes(q)) ||
        (f.adresse && f.adresse.toLowerCase().includes(q)) ||
        (f.telephone && f.telephone.toLowerCase().includes(q)) ||
        (f.gsm && f.gsm.toLowerCase().includes(q)) ||
        (f.email && f.email.toLowerCase().includes(q)) ||
        (f.ice && f.ice.toLowerCase().includes(q)) ||
        (f.observations && f.observations.toLowerCase().includes(q))
      );
    });
  }, [safeFournisseurs, searchFournisseur]);

  // Filtered supplier invoices
  const filteredFactures = useMemo(() => {
    let list = Array.isArray(facturesFournisseurs) ? facturesFournisseurs : [];
    if (filterFactureStatus !== 'TOUS') {
      list = list.filter((f) => f.statut === filterFactureStatus);
    }
    if (filterFactureSupplier !== 'TOUS') {
      list = list.filter((f) => f.fournisseur_id === filterFactureSupplier);
    }
    if (searchFacture) {
      const q = searchFacture.toLowerCase();
      list = list.filter((f) => {
        if (!f) return false;
        return (
          (f.numero && f.numero.toLowerCase().includes(q)) ||
          (f.fournisseur_nom && f.fournisseur_nom.toLowerCase().includes(q)) ||
          (f.fournisseur_ice && f.fournisseur_ice.toLowerCase().includes(q)) ||
          (f.designation_achat && f.designation_achat.toLowerCase().includes(q)) ||
          (f.statut && f.statut.toLowerCase().includes(q))
        );
      });
    }
    return [...list].sort((a, b) => new Date(b.date_facture).getTime() - new Date(a.date_facture).getTime() || b.id - a.id);
  }, [facturesFournisseurs, searchFacture, filterFactureStatus, filterFactureSupplier]);

  // Filtered supplier payments
  const filteredPaiements = useMemo(() => {
    let list = Array.isArray(paiementsFournisseurs) ? paiementsFournisseurs : [];
    if (filterPaymentMode !== 'TOUS') {
      list = list.filter((p) => p.mode_paiement === filterPaymentMode);
    }
    if (filterChequeStatus !== 'TOUS') {
      list = list.filter((p) => p.statut_cheque === filterChequeStatus);
    }
    if (searchPaiement) {
      const q = searchPaiement.toLowerCase();
      list = list.filter((p) => {
        if (!p) return false;
        return (
          (p.fournisseur_nom && p.fournisseur_nom.toLowerCase().includes(q)) ||
          (p.facture_numero && p.facture_numero.toLowerCase().includes(q)) ||
          (p.numero_cheque_ref && p.numero_cheque_ref.toLowerCase().includes(q)) ||
          (p.banque_emettrice && p.banque_emettrice.toLowerCase().includes(q)) ||
          (p.mode_paiement && p.mode_paiement.toLowerCase().includes(q)) ||
          (p.statut_cheque && p.statut_cheque.toLowerCase().includes(q))
        );
      });
    }
    return [...list].sort((a, b) => new Date(b.date_paiement).getTime() - new Date(a.date_paiement).getTime() || b.id - a.id);
  }, [paiementsFournisseurs, searchPaiement, filterPaymentMode, filterChequeStatus]);

  // Filtered reconciliations
  const filteredReconciliations = useMemo(() => {
    const list = Array.isArray(reconciliations) ? reconciliations : [];
    if (!searchReconciliation) return list;
    const q = searchReconciliation.toLowerCase();
    return list.filter((r) => {
      if (!r || !r.fournisseur) return false;
      return (
        (r.fournisseur.nom && r.fournisseur.nom.toLowerCase().includes(q)) ||
        (r.fournisseur.code && r.fournisseur.code.toLowerCase().includes(q)) ||
        (r.fournisseur.ice && r.fournisseur.ice.toLowerCase().includes(q)) ||
        (r.fournisseur.ville && r.fournisseur.ville.toLowerCase().includes(q))
      );
    });
  }, [reconciliations, searchReconciliation]);

  // Open invoice creation for specific supplier
  const handleOpenNewInvoice = (supplier?: Fournisseur) => {
    if (supplier) setInvSupplierId(supplier.id);
    else if (fournisseurs.length > 0) setInvSupplierId(fournisseurs[0].id);
    setInvNumero('');
    setInvDate(new Date().toISOString().split('T')[0]);
    setInvDateEcheance(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setInvDesignation('');
    setInvTotalHt('');
    setInvTva20('');
    setInvTva10('');
    setInvTva7('');
    setInvNotes('');
    setIsInvoiceModalOpen(true);
  };

  // Open payment creation for specific supplier
  const handleOpenNewPayment = (supplier?: Fournisseur, invoice?: FactureFournisseur) => {
    if (supplier) setPaySupplierId(supplier.id);
    else if (fournisseurs.length > 0) setPaySupplierId(fournisseurs[0].id);

    if (invoice) {
      setPayFactureId(invoice.id);
      setPayMontant(String(invoice.reste_a_payer));
    } else {
      setPayFactureId('');
      setPayMontant('');
    }

    setPayDate(new Date().toISOString().split('T')[0]);
    setPayMode('Chèque');
    setPayChequeRef('');
    setPayBanque('Attijariwafa Bank');
    setPayEcheanceDepot(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setPayStatutCheque('En attente');
    setPayNotes('');
    setIsPaymentModalOpen(true);
  };

  // Submit new invoice
  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const sup = fournisseurs.find((f) => f.id === invSupplierId);
    if (!sup) {
      alert('Veuillez sélectionner un fournisseur.');
      return;
    }

    const ht = parseFloat(invTotalHt);
    if (isNaN(ht) || ht <= 0) {
      alert('Veuillez saisir un montant HT valide.');
      return;
    }

    const t20 = parseFloat(invTva20) || 0;
    const t10 = parseFloat(invTva10) || 0;
    const t7 = parseFloat(invTva7) || 0;
    const ttc = ht + t20 + t10 + t7;

    await createFactureFournisseur({
      numero: invNumero.trim() || undefined,
      fournisseur_id: sup.id,
      fournisseur_nom: sup.nom,
      fournisseur_ice: sup.ice || '',
      date_facture: invDate,
      date_echeance: invDateEcheance || undefined,
      total_ht: ht,
      tva_20: t20,
      tva_10: t10,
      tva_7: t7,
      total_ttc: ttc,
      designation_achat: invDesignation.trim(),
      notes: invNotes.trim(),
    });

    setIsInvoiceModalOpen(false);
    await reloadData();
    if (onRefreshData) onRefreshData();
  };

  // Submit new payment
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const sup = fournisseurs.find((f) => f.id === paySupplierId);
    if (!sup) {
      alert('Veuillez sélectionner un fournisseur.');
      return;
    }

    const mnt = parseFloat(payMontant);
    if (isNaN(mnt) || mnt <= 0) {
      alert('Veuillez saisir un montant valide.');
      return;
    }

    let factureNum: string | null = null;
    if (payFactureId) {
      const fac = facturesFournisseurs.find((f) => f.id === payFactureId);
      if (fac) factureNum = fac.numero;
    }

    await createPaiementFournisseur({
      fournisseur_id: sup.id,
      fournisseur_nom: sup.nom,
      facture_fournisseur_id: payFactureId ? Number(payFactureId) : null,
      facture_numero: factureNum,
      date_paiement: payDate,
      montant: mnt,
      mode_paiement: payMode,
      numero_cheque_ref: payChequeRef.trim(),
      banque_emettrice: payBanque.trim(),
      date_echeance_depot: payMode === 'Chèque' || payMode === 'Traite / Effet' ? payEcheanceDepot : undefined,
      statut_cheque: payStatutCheque,
      notes: payNotes.trim(),
    });

    setIsPaymentModalOpen(false);
    await reloadData();
    if (onRefreshData) onRefreshData();
  };

  // Toggle/Update cheque status
  const handleUpdateChequeStatus = async (
    id: number,
    statut: 'En attente' | 'Déposé / Débité' | 'Annulé'
  ) => {
    await updateStatutChequeFournisseur(id, statut);
    await reloadData();
  };

  // Delete invoice
  const handleDeleteInvoice = async (id: number, _num: string) => {
    await deleteFactureFournisseur(id);
    await reloadData();
    if (onRefreshData) onRefreshData();
  };

  // Delete payment
  const handleDeletePayment = async (id: number) => {
    await deletePaiementFournisseur(id);
    await reloadData();
    if (onRefreshData) onRefreshData();
  };

  // Global total calculations
  const globalStats = useMemo(() => {
    const totalAchats = facturesFournisseurs.reduce((sum, f) => sum + f.total_ttc, 0);
    const totalPaye = paiementsFournisseurs.reduce((sum, p) => sum + p.montant, 0);
    const soldeDu = totalAchats - totalPaye;
    const chequesEnAttente = paiementsFournisseurs.filter(
      (p) => (p.mode_paiement === 'Chèque' || p.mode_paiement === 'Traite / Effet') && p.statut_cheque === 'En attente'
    );
    const montantChequesAttente = chequesEnAttente.reduce((sum, p) => sum + p.montant, 0);

    return {
      totalAchats,
      totalPaye,
      soldeDu,
      chequesEnAttenteCount: chequesEnAttente.length,
      montantChequesAttente,
      alertes4JoursCount: chequeAlerts.length,
    };
  }, [facturesFournisseurs, paiementsFournisseurs, chequeAlerts]);

  // Supplier Statement Ledger (for the statement modal)
  const statementLedger = useMemo(() => {
    if (!statementSupplier) return [];
    const supId = statementSupplier.id;
    const invoices = facturesFournisseurs.filter((f) => f.fournisseur_id === supId);
    const payments = paiementsFournisseurs.filter((p) => p.fournisseur_id === supId);

    const items: Array<{
      date: string;
      type: 'FACTURE' | 'PAIEMENT';
      ref: string;
      designation: string;
      debit: number;
      credit: number;
    }> = [];

    invoices.forEach((f) => {
      items.push({
        date: f.date_facture,
        type: 'FACTURE',
        ref: f.numero,
        designation: f.designation_achat || "Facture d'achat",
        debit: f.total_ttc,
        credit: 0,
      });
    });

    payments.forEach((p) => {
      items.push({
        date: p.date_paiement,
        type: 'PAIEMENT',
        ref: p.numero_cheque_ref || p.mode_paiement,
        designation: `Paiement (${p.mode_paiement}) - ${p.banque_emettrice || ''}`,
        debit: 0,
        credit: p.montant,
      });
    });

    // Sort chronologically
    items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate running balance
    let currentBalance = 0;
    return items.map((it) => {
      currentBalance += it.debit - it.credit;
      return {
        ...it,
        balance: currentBalance,
      };
    });
  }, [statementSupplier, facturesFournisseurs, paiementsFournisseurs]);

  return (
    <div className="space-y-4">
      {/* ========================================================================= */}
      {/* 4-DAY CHEQUE ALERT NOTIFICATION BANNER */}
      {/* ========================================================================= */}
      {chequeAlerts.length > 0 && activeTab !== 'ALERTES' && (
        <div className="bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-amber-500/15 border-2 border-amber-400 p-3.5 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-500 text-white rounded-lg shrink-0 mt-0.5 animate-pulse">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-amber-900 flex items-center gap-2">
                Alerte Échéances Chèques Fournisseurs (≤ 4 Jours)
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-600 text-white">
                  {chequeAlerts.length} chèque{chequeAlerts.length > 1 ? 's' : ''} émis
                </span>
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">
                Des chèques ou traites émis à vos fournisseurs arrivent à échéance dans les 4 prochains jours (ou sont échus).
              </p>
            </div>
          </div>

          <button
            onClick={() => handleTabChange('ALERTES')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition active:scale-95 whitespace-nowrap self-start md:self-auto"
          >
            <span>Consulter les alertes ({chequeAlerts.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-PAGES NAVIGATION TABS BAR */}
      {/* ========================================================================= */}
      <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
          <button
            onClick={() => handleTabChange('FOURNISSEURS')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-bold transition whitespace-nowrap ${
              activeTab === 'FOURNISSEURS'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Répertoire Fournisseurs</span>
            <span className="ml-1 px-1.5 py-0.2 bg-slate-700 text-white text-[10px] rounded-full">
              {fournisseurs.length}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('FACTURES')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-bold transition whitespace-nowrap ${
              activeTab === 'FACTURES'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Factures d'Achats</span>
            <span className="ml-1 px-1.5 py-0.2 bg-indigo-800 text-white text-[10px] rounded-full">
              {facturesFournisseurs.length}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('PAIEMENTS')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-bold transition whitespace-nowrap ${
              activeTab === 'PAIEMENTS'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Paiements & Chèques</span>
            <span className="ml-1 px-1.5 py-0.2 bg-emerald-800 text-white text-[10px] rounded-full">
              {paiementsFournisseurs.length}
            </span>
          </button>

          <button
            onClick={() => handleTabChange('ALERTES')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-bold transition whitespace-nowrap ${
              activeTab === 'ALERTES'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>Alertes Échéances</span>
            {chequeAlerts.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-amber-700 text-white text-[10px] font-black rounded-full animate-pulse">
                {chequeAlerts.length}
              </span>
            )}
          </button>

          <button
            onClick={() => handleTabChange('RAPPROCHEMENT')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-bold transition whitespace-nowrap ${
              activeTab === 'RAPPROCHEMENT'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Situation & Rapprochement</span>
          </button>
        </div>

        {/* Action buttons for quick entries */}
        <div className="flex items-center gap-1.5 shrink-0">
          {activeTab === 'FACTURES' && (
            <button
              onClick={() => handleOpenNewInvoice()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              + Facture d'Achat
            </button>
          )}

          {activeTab === 'PAIEMENTS' && (
            <button
              onClick={() => handleOpenNewPayment()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              + Paiement / Chèque
            </button>
          )}

          {activeTab === 'FOURNISSEURS' && (
            <button
              onClick={onOpenNewFournisseur}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              + Nouveau Fournisseur
            </button>
          )}

          {(activeTab === 'ALERTES' || activeTab === 'RAPPROCHEMENT') && (
            <button
              onClick={() => handleOpenNewPayment()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              + Règlement
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* KEY KPIS / RECONCILIATION SUMMARY TILES */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold uppercase text-slate-500">Total Achats Facturés (TTC)</div>
          <div className="text-xl font-mono font-black text-slate-900 mt-1">
            {formatCurrency(globalStats.totalAchats)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {facturesFournisseurs.length} factures d'achat enregistrées
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold uppercase text-slate-500">Total Règlements Émis</div>
          <div className="text-xl font-mono font-black text-emerald-700 mt-1">
            {formatCurrency(globalStats.totalPaye)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {paiementsFournisseurs.length} paiements enregistrés
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-rose-200 bg-rose-50/20 shadow-xs">
          <div className="text-[11px] font-bold uppercase text-rose-800">Solde Net Dû aux Fournisseurs</div>
          <div className="text-xl font-mono font-black text-rose-700 mt-1">
            {formatCurrency(globalStats.soldeDu)}
          </div>
          <div className="text-[11px] text-rose-600 mt-0.5 font-medium">
            Engagements à régler
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-amber-200 bg-amber-50/20 shadow-xs">
          <div className="text-[11px] font-bold uppercase text-amber-800">Chèques en Circulation</div>
          <div className="text-xl font-mono font-black text-amber-700 mt-1">
            {formatCurrency(globalStats.montantChequesAttente)}
          </div>
          <div className="text-[11px] text-amber-800 mt-0.5 font-semibold flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {globalStats.chequesEnAttenteCount} chèques en attente d'encaissement
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-PAGE 1: REPERTOIRE DES FOURNISSEURS */}
      {/* ========================================================================= */}
      {activeTab === 'FOURNISSEURS' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="relative w-full max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Recherche fournisseur (Nom, Contact, Ville, ICE, Téléphone, Email)..."
                value={searchFournisseur}
                onChange={(e) => setSearchFournisseur(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 text-slate-800 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 hidden sm:inline">
                {filteredFournisseurs.length} / {fournisseurs.length} fournisseurs
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white font-semibold divide-x divide-slate-700">
                  <th className="py-2.5 px-3 min-w-[70px]">Code</th>
                  <th className="py-2.5 px-3 min-w-[200px]">Raison Sociale</th>
                  <th className="py-2.5 px-3 min-w-[130px]">Contact</th>
                  <th className="py-2.5 px-3 min-w-[90px]">Ville</th>
                  <th className="py-2.5 px-3 min-w-[120px]">Téléphone / GSM</th>
                  <th className="py-2.5 px-3 min-w-[130px] font-mono">ICE</th>
                  <th className="py-2.5 px-3 text-right min-w-[100px]">Total Achats</th>
                  <th className="py-2.5 px-3 text-right min-w-[100px]">Solde Dû</th>
                  <th className="py-2.5 px-3 text-center min-w-[140px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredFournisseurs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      Aucun fournisseur trouvé.
                    </td>
                  </tr>
                ) : (
                  filteredFournisseurs.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50 transition divide-x divide-slate-100 even:bg-slate-50/40">
                      <td className="py-2 px-3 font-mono text-slate-600 font-semibold">
                        {f.code || `FOUR-${f.id}`}
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-900">
                        {f.nom}
                      </td>
                      <td className="py-2 px-3 text-slate-700">{f.interlocuteur || '-'}</td>
                      <td className="py-2 px-3 text-slate-700">{f.ville || '-'}</td>
                      <td className="py-2 px-3 font-mono text-slate-700">
                        {f.telephone || f.gsm || '-'}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-600">{f.ice || '-'}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-800">
                        {formatCurrency(f.total_achats || 0, false)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-rose-700">
                        {formatCurrency(f.solde_du || 0, false)}
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setStatementSupplier(f)}
                            className="p-1 hover:bg-blue-100 text-blue-700 rounded transition"
                            title="Relevé de Compte Fournisseur"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenNewInvoice(f)}
                            className="p-1 hover:bg-indigo-100 text-indigo-700 rounded transition"
                            title="+ Facture d'Achat"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenNewPayment(f)}
                            className="p-1 hover:bg-emerald-100 text-emerald-700 rounded transition"
                            title="+ Paiement / Chèque"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onEditFournisseur(f)}
                            className="p-1 hover:bg-slate-200 text-slate-600 rounded transition"
                            title="Modifier Fiche"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              onDeleteFournisseur(f.id);
                            }}
                            className="p-1 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded transition"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-PAGE 2: FACTURES FOURNISSEURS (ACHATS) */}
      {/* ========================================================================= */}
      {activeTab === 'FACTURES' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative min-w-[220px] flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher facture (N°, Fournisseur, ICE)..."
                  value={searchFacture}
                  onChange={(e) => setSearchFacture(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 text-slate-800 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Filter by Status */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                {(['TOUS', 'Impayée', 'Partiel', 'Payée'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setFilterFactureStatus(st)}
                    className={`px-2.5 py-1 rounded-md font-semibold transition ${
                      filterFactureStatus === st
                        ? 'bg-white text-indigo-900 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st === 'TOUS' ? 'Tous statuts' : st}
                  </button>
                ))}
              </div>

              {/* Filter by Supplier */}
              <select
                value={filterFactureSupplier}
                onChange={(e) => setFilterFactureSupplier(e.target.value === 'TOUS' ? 'TOUS' : Number(e.target.value))}
                className="px-2.5 py-1.5 text-xs bg-slate-50 text-slate-700 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="TOUS">Tous les fournisseurs</option>
                {fournisseurs.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nom}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => handleOpenNewInvoice()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              + Enregistrer Facture d'Achat
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-indigo-900 text-white font-semibold divide-x divide-indigo-800">
                  <th className="py-2.5 px-3">N° Facture</th>
                  <th className="py-2.5 px-3">Fournisseur</th>
                  <th className="py-2.5 px-3">Date Facture</th>
                  <th className="py-2.5 px-3">Échéance</th>
                  <th className="py-2.5 px-3">Désignation</th>
                  <th className="py-2.5 px-3 text-right">Total HT</th>
                  <th className="py-2.5 px-3 text-right">Total TVA</th>
                  <th className="py-2.5 px-3 text-right">Total TTC</th>
                  <th className="py-2.5 px-3 text-right">Payé</th>
                  <th className="py-2.5 px-3 text-right">Reste à Payer</th>
                  <th className="py-2.5 px-3 text-center">Statut</th>
                  <th className="py-2.5 px-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredFactures.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-400">
                      Aucune facture fournisseur correspondant aux critères.
                    </td>
                  </tr>
                ) : (
                  filteredFactures.map((f) => (
                    <tr key={f.id} className="hover:bg-indigo-50/40 transition divide-x divide-slate-100 even:bg-slate-50/30">
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">{f.numero}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{f.fournisseur_nom}</td>
                      <td className="py-2 px-3 text-slate-600">{formatDate(f.date_facture)}</td>
                      <td className="py-2 px-3 text-slate-600">{f.date_echeance ? formatDate(f.date_echeance) : '-'}</td>
                      <td className="py-2 px-3 text-slate-700 max-w-xs truncate">{f.designation_achat || '-'}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-700">{formatCurrency(f.total_ht)}</td>
                      <td className="py-2 px-3 text-right font-mono text-indigo-700">{formatCurrency(f.total_tva)}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(f.total_ttc)}</td>
                      <td className="py-2 px-3 text-right font-mono text-emerald-700">{formatCurrency(f.montant_paye)}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-rose-700">{formatCurrency(f.reste_a_payer)}</td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            f.statut === 'Payée'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : f.statut === 'Partiel'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {f.statut}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {f.reste_a_payer > 0 && (
                            <button
                              onClick={() => {
                                const sup = fournisseurs.find((four) => four.id === f.fournisseur_id);
                                handleOpenNewPayment(sup, f);
                              }}
                              className="px-2 py-1 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded shadow-2xs transition"
                              title="Payer cette facture"
                            >
                              Régler
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteInvoice(f.id, f.numero)}
                            className="p-1 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded transition"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-PAGE 3: PAIEMENTS & CHEQUES FOURNISSEURS */}
      {/* ========================================================================= */}
      {activeTab === 'PAIEMENTS' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative min-w-[220px] flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher paiement (Fournisseur, N° Chèque, Banque)..."
                  value={searchPaiement}
                  onChange={(e) => setSearchPaiement(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 text-slate-800 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Filter by Mode */}
              <select
                value={filterPaymentMode}
                onChange={(e) => setFilterPaymentMode(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 text-slate-700 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="TOUS">Tous les modes</option>
                <option value="Chèque">Chèque</option>
                <option value="Traite / Effet">Traite / Effet</option>
                <option value="Virement">Virement</option>
                <option value="Espèces">Espèces</option>
              </select>

              {/* Filter by Cheque Status */}
              <select
                value={filterChequeStatus}
                onChange={(e) => setFilterChequeStatus(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 text-slate-700 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="TOUS">Tous statuts chèque</option>
                <option value="En attente">⏳ En attente</option>
                <option value="Déposé / Débité">✓ Déposé / Débité</option>
                <option value="Annulé">✕ Annulé</option>
              </select>
            </div>

            <button
              onClick={() => handleOpenNewPayment()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              + Émettre un Paiement / Chèque
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-emerald-900 text-white font-semibold divide-x divide-emerald-800">
                  <th className="py-2.5 px-3">Date Paiement</th>
                  <th className="py-2.5 px-3">Fournisseur</th>
                  <th className="py-2.5 px-3">Facture Liée</th>
                  <th className="py-2.5 px-3">Mode de Règlement</th>
                  <th className="py-2.5 px-3 font-mono">N° Chèque / Réf</th>
                  <th className="py-2.5 px-3">Banque Émettrice</th>
                  <th className="py-2.5 px-3">Échéance Dépôt</th>
                  <th className="py-2.5 px-3 text-right">Montant Réglé</th>
                  <th className="py-2.5 px-3 text-center">Statut du Chèque</th>
                  <th className="py-2.5 px-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredPaiements.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      Aucun paiement fournisseur correspondant aux critères.
                    </td>
                  </tr>
                ) : (
                  filteredPaiements.map((p) => (
                    <tr key={p.id} className="hover:bg-emerald-50/40 transition divide-x divide-slate-100 even:bg-slate-50/30">
                      <td className="py-2 px-3 text-slate-600">{formatDate(p.date_paiement)}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{p.fournisseur_nom}</td>
                      <td className="py-2 px-3 font-mono text-slate-700">{p.facture_numero || 'Paiement Global / Acompte'}</td>
                      <td className="py-2 px-3 font-medium text-slate-800">{p.mode_paiement}</td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">{p.numero_cheque_ref || '-'}</td>
                      <td className="py-2 px-3 text-slate-700">{p.banque_emettrice || '-'}</td>
                      <td className="py-2 px-3 font-semibold text-slate-700">
                        {p.date_echeance_depot ? formatDate(p.date_echeance_depot) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700 text-sm">
                        {formatCurrency(p.montant)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <select
                          value={p.statut_cheque}
                          onChange={(e) =>
                            handleUpdateChequeStatus(
                              p.id,
                              e.target.value as 'En attente' | 'Déposé / Débité' | 'Annulé'
                            )
                          }
                          className={`text-[11px] font-bold px-2 py-1 rounded-md border cursor-pointer ${
                            p.statut_cheque === 'Déposé / Débité'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : p.statut_cheque === 'En attente'
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-slate-100 text-slate-600 border-slate-300'
                          }`}
                        >
                          <option value="En attente">⏳ En attente (Non débité)</option>
                          <option value="Déposé / Débité">✓ Déposé / Débité</option>
                          <option value="Annulé">✕ Annulé</option>
                        </select>
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        <button
                          onClick={() => handleDeletePayment(p.id)}
                          className="p-1 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded transition"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-PAGE 4: ALERTES CHEQUES FOURNISSEURS (AVERTISSEMENT ≤ 4 JOURS) */}
      {/* ========================================================================= */}
      {activeTab === 'ALERTES' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-300 p-4 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900">
              <p className="font-bold">Système d'Avertissement Automatique à 4 Jours :</p>
              <p className="mt-0.5">
                Cette liste affiche en temps réel tous les <strong>chèques et traites remis aux fournisseurs</strong> dont la date d'échéance / dépôt est prévue <strong>dans 4 jours ou moins</strong> (ou déjà dépassée). Lorsque le chèque a été encaissé et débité de votre compte bancaire, changez son statut à <strong>"Déposé / Débité"</strong>.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-amber-800 text-white font-semibold divide-x divide-amber-700">
                    <th className="py-2.5 px-3">Compte à Rebours</th>
                    <th className="py-2.5 px-3">Fournisseur Bénéficiaire</th>
                    <th className="py-2.5 px-3">N° Chèque / Traite</th>
                    <th className="py-2.5 px-3">Banque Émettrice</th>
                    <th className="py-2.5 px-3">Date d'Échéance (Dépôt)</th>
                    <th className="py-2.5 px-3 text-right">Montant (DH)</th>
                    <th className="py-2.5 px-3 text-center">Statut Actuel</th>
                    <th className="py-2.5 px-3 text-center">Action Rapide</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {chequeAlerts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                        Aucun chèque fournisseur à échéance dans les 4 prochains jours. Tout est en ordre !
                      </td>
                    </tr>
                  ) : (
                    chequeAlerts.map(({ paiement, jours_restants, est_imminent, est_en_retard }) => (
                      <tr key={paiement.id} className="hover:bg-amber-50/50 transition divide-x divide-slate-100">
                        <td className="py-2.5 px-3">
                          {est_en_retard ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                              Échu ({Math.abs(jours_restants)} j de retard)
                            </span>
                          ) : jours_restants === 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-600 text-white animate-pulse">
                              Aujourd'hui !
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              Dans {jours_restants} jour{jours_restants > 1 ? 's' : ''}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900">{paiement.fournisseur_nom}</td>
                        <td className="py-2 px-3 font-mono font-bold text-blue-700">{paiement.numero_cheque_ref || '-'}</td>
                        <td className="py-2 px-3 text-slate-700">{paiement.banque_emettrice || '-'}</td>
                        <td className="py-2 px-3 font-bold text-slate-800">
                          {paiement.date_echeance_depot ? formatDate(paiement.date_echeance_depot) : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-black text-rose-700 text-sm">
                          {formatCurrency(paiement.montant)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            {paiement.statut_cheque}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={() => handleUpdateChequeStatus(paiement.id, 'Déposé / Débité')}
                            className="flex items-center justify-center gap-1 mx-auto px-2.5 py-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition active:scale-95"
                          >
                            <Check className="w-3 h-3" />
                            Marquer Débité
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-PAGE 5: SITUATION & RAPPROCHEMENT FOURNISSEURS */}
      {/* ========================================================================= */}
      {activeTab === 'RAPPROCHEMENT' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3 border-b border-slate-200 flex items-center justify-between">
              <div className="relative w-full max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher dans le tableau de rapprochement..."
                  value={searchReconciliation}
                  onChange={(e) => setSearchReconciliation(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 text-slate-800 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <span className="text-xs text-slate-500">
                {filteredReconciliations.length} fournisseurs analysés
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-semibold divide-x divide-slate-800">
                    <th className="py-2.5 px-3">Fournisseur</th>
                    <th className="py-2.5 px-3">ICE</th>
                    <th className="py-2.5 px-3 text-right">Total Factures TTC</th>
                    <th className="py-2.5 px-3 text-right">Total Payé</th>
                    <th className="py-2.5 px-3 text-right">Solde Dû Théorique</th>
                    <th className="py-2.5 px-3 text-right">Chèques Non Débités</th>
                    <th className="py-2.5 px-3 text-right">Solde Réel Résiduel</th>
                    <th className="py-2.5 px-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredReconciliations.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        Aucune donnée de rapprochement disponible.
                      </td>
                    </tr>
                  ) : (
                    filteredReconciliations.map((r) => {
                      const soldeResiduel = r.solde_du - r.cheques_en_circulation_montant;
                      return (
                        <tr key={r.fournisseur.id} className="hover:bg-blue-50/30 transition divide-x divide-slate-100">
                          <td className="py-2 px-3 font-bold text-slate-900">{r.fournisseur.nom}</td>
                          <td className="py-2 px-3 font-mono text-slate-600">{r.fournisseur.ice || '-'}</td>
                          <td className="py-2 px-3 text-right font-mono text-slate-800">
                            {formatCurrency(r.total_factures_ttc)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-emerald-700">
                            {formatCurrency(r.total_paye)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-rose-700">
                            {formatCurrency(r.solde_du)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-amber-700 font-semibold">
                            {formatCurrency(r.cheques_en_circulation_montant)}
                            {r.cheques_en_circulation_count > 0 && (
                              <span className="ml-1 text-[10px] text-slate-400">
                                ({r.cheques_en_circulation_count})
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-black text-slate-900 bg-slate-50">
                            {formatCurrency(soldeResiduel)}
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setStatementSupplier(r.fournisseur)}
                                className="px-2 py-1 text-[10px] font-bold bg-slate-800 hover:bg-slate-900 text-white rounded transition"
                                title="Relevé détaillé du compte"
                              >
                                Relevé
                              </button>
                              <button
                                onClick={() => {
                                  handleOpenNewPayment(r.fournisseur);
                                }}
                                className="px-2 py-1 text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded transition"
                                title="Enregistrer un règlement"
                              >
                                + Régler
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RELEVE DE COMPTE FOURNISSEUR (STATEMENT DRILLDOWN) */}
      {/* ========================================================================= */}
      {statementSupplier && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-400" />
                  Relevé de Compte Fournisseur : {statementSupplier.nom}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ICE: {statementSupplier.ice || 'N/A'} • Ville: {statementSupplier.ville || 'Maroc'} • Tél: {statementSupplier.telephone || statementSupplier.gsm || 'N/A'}
                </p>
              </div>
              <button
                onClick={() => setStatementSupplier(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-[10px] font-bold uppercase text-slate-500">Total Achats TTC</span>
                  <div className="text-base font-mono font-bold text-slate-900 mt-0.5">
                    {formatCurrency(
                      facturesFournisseurs
                        .filter((f) => f.fournisseur_id === statementSupplier.id)
                        .reduce((sum, f) => sum + f.total_ttc, 0)
                    )}
                  </div>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="text-[10px] font-bold uppercase text-emerald-700">Total Règlements</span>
                  <div className="text-base font-mono font-bold text-emerald-800 mt-0.5">
                    {formatCurrency(
                      paiementsFournisseurs
                        .filter((p) => p.fournisseur_id === statementSupplier.id)
                        .reduce((sum, p) => sum + p.montant, 0)
                    )}
                  </div>
                </div>
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                  <span className="text-[10px] font-bold uppercase text-rose-700">Solde Dû Actuel</span>
                  <div className="text-base font-mono font-bold text-rose-800 mt-0.5">
                    {formatCurrency(statementSupplier.solde_du || 0)}
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white divide-x divide-slate-700 font-semibold">
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">N° Pièce / Réf</th>
                      <th className="py-2 px-3">Désignation</th>
                      <th className="py-2 px-3 text-right text-rose-300">Débit (Achat)</th>
                      <th className="py-2 px-3 text-right text-emerald-300">Crédit (Règlement)</th>
                      <th className="py-2 px-3 text-right">Solde Cumulé</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {statementLedger.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          Aucune transaction enregistrée pour ce fournisseur.
                        </td>
                      </tr>
                    ) : (
                      statementLedger.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 divide-x divide-slate-100">
                          <td className="py-1.5 px-3 text-slate-600">{formatDate(item.date)}</td>
                          <td className="py-1.5 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                item.type === 'FACTURE'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {item.type}
                            </span>
                          </td>
                          <td className="py-1.5 px-3 font-mono font-semibold text-slate-800">{item.ref}</td>
                          <td className="py-1.5 px-3 text-slate-700 truncate max-w-[200px]">{item.designation}</td>
                          <td className="py-1.5 px-3 text-right font-mono font-bold text-rose-700">
                            {item.debit > 0 ? formatCurrency(item.debit) : '-'}
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono font-bold text-emerald-700">
                            {item.credit > 0 ? formatCurrency(item.credit) : '-'}
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono font-black text-slate-900 bg-slate-50/60">
                            {formatCurrency(item.balance)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleOpenNewPayment(statementSupplier)}
                className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition flex items-center gap-1"
              >
                <CreditCard className="w-3.5 h-3.5" />
                + Émettre un Paiement
              </button>
              <button
                type="button"
                onClick={() => setStatementSupplier(null)}
                className="px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ENREGISTRER FACTURE FOURNISSEUR (ACHAT) */}
      {/* ========================================================================= */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-indigo-300" />
                  Enregistrer une Facture d'Achat Fournisseur
                </h3>
                <p className="text-xs text-indigo-200 mt-0.5">Saisie des achats & approvisionnements</p>
              </div>
              <button
                onClick={() => setIsInvoiceModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Fournisseur *
                  </label>
                  <select
                    value={invSupplierId}
                    onChange={(e) => setInvSupplierId(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-white text-slate-800 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    {fournisseurs.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nom} {f.ville ? `(${f.ville})` : ''} - ICE: {f.ice || 'N/A'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    N° Facture Fournisseur
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: FF-2026/042 ou N° papier"
                    value={invNumero}
                    onChange={(e) => setInvNumero(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Date Facture *
                  </label>
                  <input
                    type="date"
                    required
                    value={invDate}
                    onChange={(e) => setInvDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Désignation des Marchandises / Prestations
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Tuyaux goutte-à-goutte 16mm, Raccords et filtres"
                    value={invDesignation}
                    onChange={(e) => setInvDesignation(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Montant Total HT (DH) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={invTotalHt}
                    onChange={(e) => {
                      const val = e.target.value;
                      setInvTotalHt(val);
                      const htNum = parseFloat(val) || 0;
                      setInvTva20(String((htNum * 0.20).toFixed(2)));
                    }}
                    className="w-full px-3 py-2 text-xs bg-white font-mono font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    TVA 20% (DH)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={invTva20}
                    onChange={(e) => setInvTva20(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white font-mono font-bold rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    TVA 10% (DH)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={invTva10}
                    onChange={(e) => setInvTva10(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Date d'Échéance
                  </label>
                  <input
                    type="date"
                    value={invDateEcheance}
                    onChange={(e) => setInvDateEcheance(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Total TTC Preview */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Total TTC de la Facture :</span>
                <span className="text-sm font-mono font-black text-indigo-900">
                  {formatCurrency(
                    (parseFloat(invTotalHt) || 0) +
                    (parseFloat(invTva20) || 0) +
                    (parseFloat(invTva10) || 0) +
                    (parseFloat(invTva7) || 0)
                  )}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Enregistrer Facture d'Achat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EMETTRE UN PAIEMENT / CHEQUE FOURNISSEUR */}
      {/* ========================================================================= */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-gradient-to-r from-emerald-800 to-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-300" />
                  Émettre un Paiement / Chèque Fournisseur
                </h3>
                <p className="text-xs text-emerald-200 mt-0.5">Règlement avec calcul d'alerte à 4 jours</p>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Bénéficiaire (Fournisseur) *
                  </label>
                  <select
                    value={paySupplierId}
                    onChange={(e) => setPaySupplierId(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-white text-slate-800 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    {fournisseurs.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nom} (Solde Dû: {formatCurrency(f.solde_du || 0)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Date d'Émission *
                  </label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Mode de Règlement *
                  </label>
                  <select
                    value={payMode}
                    onChange={(e) => setPayMode(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white text-slate-800 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    <option value="Chèque">Chèque Bancaire</option>
                    <option value="Traite / Effet">Traite / Effet de commerce</option>
                    <option value="Virement">Virement Bancaire</option>
                    <option value="Espèces">Espèces</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Montant du Règlement (DH) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={payMontant}
                    onChange={(e) => setPayMontant(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white font-mono font-bold text-slate-900 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    N° Chèque / Traite / Référence
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: CHQ-8902134"
                    value={payChequeRef}
                    onChange={(e) => setPayChequeRef(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Banque Émettrice
                  </label>
                  <input
                    type="text"
                    value={payBanque}
                    onChange={(e) => setPayBanque(e.target.value)}
                    placeholder="Attijariwafa Bank, BCP, BMCE..."
                    className="w-full px-3 py-2 text-xs bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {(payMode === 'Chèque' || payMode === 'Traite / Effet') && (
                  <div>
                    <label className="block text-xs font-bold text-amber-800 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-600" />
                      Date d'Échéance / Dépôt *
                    </label>
                    <input
                      type="date"
                      required
                      value={payEcheanceDepot}
                      onChange={(e) => setPayEcheanceDepot(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-amber-50/50 font-bold text-slate-900 rounded-lg border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Valider le Paiement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
