'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { BonLivraison, BonRetour, Client, CompanyInfo } from '@/lib/types';
import { compareDocumentNumbersDesc, formatCurrency, formatDate } from '@/lib/utils';
import {
  Workflow,
  CheckSquare,
  Square,
  ArrowRight,
  CheckCircle2,
  FileText,
  Calendar,
  Building,
  Sparkles,
  Printer,
  RotateCcw,
  Truck,
  MinusCircle,
  PlusCircle,
  AlertCircle,
  Search,
  LockKeyhole,
} from 'lucide-react';

interface WorkflowBlFactureViewProps {
  bonsLivraison: BonLivraison[];
  bonsRetour?: BonRetour[];
  clients: Client[];
  company: CompanyInfo;
  initialSelectedBrIds?: number[];
  initialSelectedBlIds?: number[];
  onGenerateInvoice: (params: {
    bl_ids: number[];
    br_ids?: number[];
    date: string;
    mode_reglement: string;
    notes: string;
  }) => Promise<number>;
  onViewGeneratedFacture: (factureId: number) => void;
  onCloseBl: (blId: number) => Promise<void>;
}

export const WorkflowBlFactureView: React.FC<WorkflowBlFactureViewProps> = ({
  bonsLivraison = [],
  bonsRetour = [],
  clients = [],
  company,
  initialSelectedBrIds = [],
  initialSelectedBlIds = [],
  onGenerateInvoice,
  onViewGeneratedFacture,
  onCloseBl,
}) => {
  // Uninvoiced Validated BLs
  const uninvoicedBls = useMemo(() => {
    return bonsLivraison
      .filter((b) => !b.facture_id && !b.facture_numero && !b.cloture_sans_facture && b.statut !== 'Clôturé' && b.etat !== 'Brouillon' && b.etat !== 'Annulé')
      .sort((a, b) =>
        compareDocumentNumbersDesc(a.numero, b.numero) ||
        (a.client_nom || '').localeCompare(b.client_nom || '', 'fr', { sensitivity: 'base' }) ||
        new Date(b.date).getTime() - new Date(a.date).getTime() ||
        b.id - a.id
      );
  }, [bonsLivraison]);

  // Uninvoiced Validated BRs (Bons de retour)
  const uninvoicedBrs = useMemo(() => {
    return bonsRetour
      .filter((r) => !r.facture_id && !r.facture_numero && r.etat !== 'Brouillon' && r.etat !== 'Annulé')
      .sort((a, b) =>
        compareDocumentNumbersDesc(a.numero, b.numero) ||
        (a.client_nom || '').localeCompare(b.client_nom || '', 'fr', { sensitivity: 'base' }) ||
        new Date(b.date).getTime() - new Date(a.date).getTime() ||
        b.id - a.id
      );
  }, [bonsRetour]);

  // Group uninvoiced BLs & BRs by client
  const clientsWithPendingDocuments = useMemo(() => {
    const map = new Map<
      number,
      {
        client: Client;
        bls: BonLivraison[];
        brs: BonRetour[];
        totalBlTtc: number;
        totalBrTtc: number;
        netTtc: number;
      }
    >();

    const getOrCreateEntry = (clientId: number, clientNom: string, clientIce?: string) => {
      if (!map.has(clientId)) {
        const client = clients.find((c) => c.id === clientId) || {
          id: clientId,
          nom: clientNom,
          code: '',
          interlocuteur: '',
          adresse: '',
          code_postal: '',
          ville: '',
          pays: 'Maroc',
          telephone: '',
          mobile: '',
          fax: '',
          email: '',
          site_web: '',
          ice: clientIce || '',
          observations: '',
          solde: 0,
          created_at: '',
        };
        map.set(clientId, {
          client,
          bls: [],
          brs: [],
          totalBlTtc: 0,
          totalBrTtc: 0,
          netTtc: 0,
        });
      }
      return map.get(clientId)!;
    };

    for (const bl of uninvoicedBls) {
      if (!bl.client_id) continue;
      const entry = getOrCreateEntry(bl.client_id, bl.client_nom, bl.client_ice);
      entry.bls.push(bl);
      entry.totalBlTtc += bl.total_ttc;
    }

    for (const br of uninvoicedBrs) {
      if (!br.client_id) continue;
      const entry = getOrCreateEntry(br.client_id, br.client_nom, br.client_ice);
      entry.brs.push(br);
      entry.totalBrTtc += br.total_ttc;
    }

    // Calculate net for each
    map.forEach((entry) => {
      entry.netTtc = entry.totalBlTtc - entry.totalBrTtc;
    });

    return Array.from(map.values());
  }, [uninvoicedBls, uninvoicedBrs, clients]);

  // Determine initial selected client
  const initialClient = useMemo(() => {
    if (initialSelectedBrIds.length > 0) {
      const foundBr = bonsRetour.find((b) => initialSelectedBrIds.includes(b.id));
      if (foundBr) return foundBr.client_id;
    }
    if (initialSelectedBlIds.length > 0) {
      const foundBl = bonsLivraison.find((b) => initialSelectedBlIds.includes(b.id));
      if (foundBl) return foundBl.client_id;
    }
    return clientsWithPendingDocuments.length > 0
      ? clientsWithPendingDocuments[0].client.id
      : null;
  }, [clientsWithPendingDocuments, initialSelectedBrIds, initialSelectedBlIds, bonsRetour, bonsLivraison]);

  const [selectedClientId, setSelectedClientId] = useState<number | null>(initialClient);

  // Initialize selections based on initial client
  const [selectedBlIds, setSelectedBlIds] = useState<number[]>(() => {
    if (!initialClient) return [];
    const found = clientsWithPendingDocuments.find((b) => b.client.id === initialClient);
    return found ? found.bls.map((b) => b.id) : [];
  });

  const [selectedBrIds, setSelectedBrIds] = useState<number[]>(() => {
    if (!initialClient) return [];
    const found = clientsWithPendingDocuments.find((b) => b.client.id === initialClient);
    return found ? found.brs.map((r) => r.id) : [];
  });

  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [modeReglement, setModeReglement] = useState('Virement');
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [documentSearch, setDocumentSearch] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedInvoiceId, setGeneratedInvoiceId] = useState<number | null>(null);
  const [closingBlId, setClosingBlId] = useState<number | null>(null);

  // Active client bundle
  const activeBundle = useMemo(() => {
    return clientsWithPendingDocuments.find((b) => b.client.id === selectedClientId) || null;
  }, [clientsWithPendingDocuments, selectedClientId]);

  const filteredClientBundles = useMemo(() => {
    const query = clientSearch.toLowerCase().trim();
    if (!query) return clientsWithPendingDocuments;
    return clientsWithPendingDocuments.filter((bundle) =>
      [
        bundle.client.code,
        bundle.client.nom,
        bundle.client.ice,
        bundle.client.ville,
        ...bundle.bls.map((bl) => bl.numero),
        ...bundle.brs.map((br) => br.numero),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [clientSearch, clientsWithPendingDocuments]);

  const filteredActiveDocuments = useMemo(() => {
    const query = documentSearch.toLowerCase().trim();
    if (!activeBundle || !query) {
      return { bls: activeBundle?.bls || [], brs: activeBundle?.brs || [] };
    }
    const matches = (document: BonLivraison | BonRetour) =>
      [document.numero, document.date, document.client_nom]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    return {
      bls: activeBundle.bls.filter(matches),
      brs: activeBundle.brs.filter(matches),
    };
  }, [activeBundle, documentSearch]);

  const handleSelectClient = (clientId: number) => {
    setSelectedClientId(clientId);
    const bundle = clientsWithPendingDocuments.find((b) => b.client.id === clientId);
    if (bundle) {
      setSelectedBlIds(bundle.bls.map((b) => b.id));
      setSelectedBrIds(bundle.brs.map((r) => r.id));
    } else {
      setSelectedBlIds([]);
      setSelectedBrIds([]);
    }
  };

  const toggleSelectBl = (id: number) => {
    setSelectedBlIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectBr = (id: number) => {
    setSelectedBrIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCloseBl = async (bl: BonLivraison) => {
    const confirmed = window.confirm(
      `Clôturer définitivement le BL ${bl.numero} sans le facturer ?\n\nIl disparaîtra du workflow et ne pourra plus être ajouté à une facture.`
    );
    if (!confirmed) return;
    setClosingBlId(bl.id);
    try {
      await onCloseBl(bl.id);
      setSelectedBlIds((current) => current.filter((id) => id !== bl.id));
    } catch (error: any) {
      alert(`Impossible de clôturer ce BL : ${error?.message || 'erreur inconnue'}`);
    } finally {
      setClosingBlId(null);
    }
  };

  const selectAllBls = () => {
    if (!activeBundle) return;
    if (selectedBlIds.length === activeBundle.bls.length) {
      setSelectedBlIds([]);
    } else {
      setSelectedBlIds(activeBundle.bls.map((b) => b.id));
    }
  };

  const selectAllBrs = () => {
    if (!activeBundle) return;
    if (selectedBrIds.length === activeBundle.brs.length) {
      setSelectedBrIds([]);
    } else {
      setSelectedBrIds(activeBundle.brs.map((r) => r.id));
    }
  };

  // Preview totals of selected BLs (+) and BRs (-)
  const previewTotals = useMemo(() => {
    if (!activeBundle) {
      return {
        blHt: 0,
        blTva: 0,
        blTtc: 0,
        brHt: 0,
        brTva: 0,
        brTtc: 0,
        netHt: 0,
        netTva: 0,
        netTtc: 0,
        blLinesCount: 0,
        brLinesCount: 0,
      };
    }

    const chosenBls = activeBundle.bls.filter((b) => selectedBlIds.includes(b.id));
    const chosenBrs = activeBundle.brs.filter((r) => selectedBrIds.includes(r.id));

    let blHt = 0;
    let blTva = 0;
    let blTtc = 0;
    let blLinesCount = 0;

    for (const b of chosenBls) {
      blHt += b.total_ht;
      blTva += b.total_tva;
      blTtc += b.total_ttc;
      blLinesCount += b.lignes?.length || 1;
    }

    let brHt = 0;
    let brTva = 0;
    let brTtc = 0;
    let brLinesCount = 0;

    for (const r of chosenBrs) {
      brHt += r.total_ht;
      brTva += r.total_tva;
      brTtc += r.total_ttc;
      brLinesCount += r.lignes?.length || 1;
    }

    const netHt = blHt - brHt;
    const netTva = blTva - brTva;
    const netTtc = netHt + netTva;

    return {
      blHt,
      blTva,
      blTtc,
      brHt,
      brTva,
      brTtc,
      netHt,
      netTva,
      netTtc,
      blLinesCount,
      brLinesCount,
    };
  }, [activeBundle, selectedBlIds, selectedBrIds]);

  const handleGenerate = async () => {
    if (selectedBlIds.length === 0 && selectedBrIds.length === 0) {
      alert('Veuillez sélectionner au moins un bon de livraison ou bon de retour.');
      return;
    }

    setIsGenerating(true);
    try {
      const invoiceId = await onGenerateInvoice({
        bl_ids: selectedBlIds,
        br_ids: selectedBrIds,
        date: invoiceDate,
        mode_reglement: modeReglement,
        notes: invoiceNotes,
      });
      setGeneratedInvoiceId(invoiceId);
    } catch (e: any) {
      alert('Erreur lors de la génération: ' + (e?.message || 'Erreur inconnue'));
    } finally {
      setIsGenerating(false);
    }
  };

  const totalGlobalPendingTtc = useMemo(() => {
    return clientsWithPendingDocuments.reduce((sum, b) => sum + b.netTtc, 0);
  }, [clientsWithPendingDocuments]);

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-md border border-indigo-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-400/30">
                <Workflow className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold tracking-tight">
                Workflow Facturation Fin de Mois (BL [+] &amp; Retours [-] ➔ Facture Nette)
              </h2>
            </div>
            <p className="text-xs text-blue-200/90 mt-1 max-w-3xl leading-relaxed">
              Consolidez les bons de livraison du mois et déduisez automatiquement les bons de retour (BR) en quantité et montant négatifs pour obtenir une facture globale exacte (ex : <span className="font-mono text-emerald-300 font-semibold">BL 50 - BR 7 = 43 facturés</span>).
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-white/10">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-blue-200">Documents en attente</div>
              <div className="text-lg font-extrabold text-white">
                {uninvoicedBls.length} BL <span className="text-rose-300 font-normal">| {uninvoicedBrs.length} Retours</span>
              </div>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div>
              <div className="text-[11px] uppercase tracking-wider text-blue-200">Net Global à Facturer</div>
              <div className="text-lg font-extrabold text-emerald-300">
                {formatCurrency(totalGlobalPendingTtc)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {generatedInvoiceId ? (
        /* Success Screen */
        <div className="bg-white p-8 rounded-2xl border border-emerald-200 shadow-md text-center space-y-4">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">
            Facture Consolidée Générée avec Succès !
          </h3>
          <p className="text-sm text-slate-600 max-w-lg mx-auto">
            Les {selectedBlIds.length} Bons de Livraison (+) et les {selectedBrIds.length} Bons de Retour (-) ont été rattachés et marqués comme <strong className="text-emerald-700 font-semibold">Facturé</strong>. Les lignes négatives de retour ont été ventilées avec TVA.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                onViewGeneratedFacture(generatedInvoiceId);
                setGeneratedInvoiceId(null);
              }}
              className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition"
            >
              Voir la Facture &amp; Imprimer
            </button>
            <button
              onClick={() => setGeneratedInvoiceId(null)}
              className="px-4 py-2 text-xs sm:text-sm font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            >
              Facturer un autre client
            </button>
          </div>
        </div>
      ) : clientsWithPendingDocuments.length === 0 ? (
        /* Empty State */
        <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-xs text-center space-y-3">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            Tous les Bons de Livraison et Retours sont déjà facturés !
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Aucun Bon de Livraison ou Bon de Retour en attente de facturation. Dès création d'un nouveau BL ou BR, ils apparaîtront ici pour la facturation groupée fin de mois.
          </p>
        </div>
      ) : (
        /* Step-by-Step Workflow Layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Client Selection (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                1. Sélectionner un Client ({clientsWithPendingDocuments.length})
              </h3>
            </div>

            <label className="relative block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={clientSearch}
                onChange={(event) => setClientSearch(event.target.value)}
                placeholder="Client, ICE, ville ou N° BL/BR…"
                className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </label>

            <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
              {filteredClientBundles.map((bundle) => {
                const isSelected = selectedClientId === bundle.client.id;
                return (
                  <div
                    key={bundle.client.id}
                    onClick={() => handleSelectClient(bundle.client.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition shadow-xs ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-slate-900 truncate">
                          {bundle.client.nom}
                        </div>
                        {bundle.client.ice && (
                          <div className="text-[11px] font-mono text-slate-500">
                            ICE : {bundle.client.ice}
                          </div>
                        )}
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {bundle.client.ville || 'Marrakech'}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                          {bundle.bls.length} BL(+)
                        </span>
                        {bundle.brs.length > 0 && (
                          <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            {bundle.brs.length} Retour(-)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1 text-xs">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Livraisons (+) :</span>
                        <span className="font-mono">{formatCurrency(bundle.totalBlTtc)}</span>
                      </div>
                      {bundle.totalBrTtc > 0 && (
                        <div className="flex items-center justify-between text-[11px] text-rose-600">
                          <span>Retours (-) :</span>
                          <span className="font-mono font-semibold">- {formatCurrency(bundle.totalBrTtc)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between font-bold text-slate-900 pt-1 border-t border-slate-100">
                        <span>Net à facturer :</span>
                        <span className="font-mono text-emerald-600">
                          {formatCurrency(bundle.netTtc)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredClientBundles.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-xs text-slate-500">
                  Aucun client ou document ne correspond à cette recherche.
                </div>
              ) : null}
            </div>
          </div>

          {/* Right Column: BL & BR Selection + Invoicing Form (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {activeBundle && (
              <>
                <label className="relative block">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={documentSearch}
                    onChange={(event) => setDocumentSearch(event.target.value)}
                    placeholder="Rechercher un N° de BL/BR ou une date…"
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </label>
                {/* 1. Bons de Livraison (Positive) */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-blue-600" />
                        Bons de Livraison à facturer (+)
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                          {selectedBlIds.length}/{activeBundle.bls.length} sélectionnés
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500">
                        Client : <strong className="text-slate-800">{activeBundle.client.nom}</strong>
                      </p>
                    </div>

                    {activeBundle.bls.length > 0 && (
                      <button
                        onClick={selectAllBls}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
                      >
                        {selectedBlIds.length === activeBundle.bls.length
                          ? 'Désélectionner tous les BL'
                          : 'Sélectionner tous les BL'}
                      </button>
                    )}
                  </div>

                  {filteredActiveDocuments.bls.length === 0 ? (
                    <div className="p-4 bg-slate-50 rounded-lg text-center text-xs text-slate-400">
                      Aucun bon de livraison ne correspond à la recherche.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {filteredActiveDocuments.bls.map((bl) => {
                        const isChecked = selectedBlIds.includes(bl.id);
                        return (
                          <div
                            key={bl.id}
                            onClick={() => toggleSelectBl(bl.id)}
                            className={`p-3 rounded-lg border flex items-center justify-between gap-3 cursor-pointer transition ${
                              isChecked
                                ? 'bg-blue-50/70 border-blue-300'
                                : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-blue-600">
                                {isChecked ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-slate-400" />}
                              </span>
                              <div>
                                <div className="font-mono font-bold text-xs sm:text-sm text-slate-900">
                                  {bl.numero}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  Livraison : {formatDate(bl.date)} • {bl.lignes?.length || 1} article(s)
                                </div>
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                              <button
                                type="button"
                                disabled={closingBlId === bl.id}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void handleCloseBl(bl);
                                }}
                                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 text-[11px] font-bold text-amber-800 transition hover:bg-amber-100 disabled:cursor-wait disabled:opacity-60"
                                title="Clôturer définitivement sans facturer"
                              >
                                <LockKeyhole className="h-3.5 w-3.5" />
                                {closingBlId === bl.id ? 'Clôture…' : 'Clôturer'}
                              </button>
                              <div className="text-right">
                              <div className="font-mono font-bold text-xs sm:text-sm text-blue-700">
                                + {formatCurrency(bl.total_ttc)}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                HT: {formatCurrency(bl.total_ht, false)} + TVA: {formatCurrency(bl.total_tva, false)}
                              </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. Bons de Retour (Negative Deduction) */}
                <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-rose-900 flex items-center gap-1.5">
                        <RotateCcw className="w-4 h-4 text-rose-600" />
                        Bons de Retour à déduire (-)
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700">
                          {selectedBrIds.length}/{activeBundle.brs.length} sélectionnés
                        </span>
                      </h3>
                      <p className="text-xs text-rose-600">
                        Déduction automatique des articles retournés sur la facture globale
                      </p>
                    </div>

                    {activeBundle.brs.length > 0 && (
                      <button
                        onClick={selectAllBrs}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-700 transition"
                      >
                        {selectedBrIds.length === activeBundle.brs.length
                          ? 'Désélectionner tous les BR'
                          : 'Sélectionner tous les BR'}
                      </button>
                    )}
                  </div>

                  {filteredActiveDocuments.brs.length === 0 ? (
                    <div className="p-3 bg-slate-50 rounded-lg text-center text-xs text-slate-400">
                      Aucun bon de retour ne correspond à la recherche.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {filteredActiveDocuments.brs.map((br) => {
                        const isChecked = selectedBrIds.includes(br.id);
                        return (
                          <div
                            key={br.id}
                            onClick={() => toggleSelectBr(br.id)}
                            className={`p-3 rounded-lg border flex items-center justify-between gap-3 cursor-pointer transition ${
                              isChecked
                                ? 'bg-rose-50/70 border-rose-300'
                                : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-rose-600">
                                {isChecked ? <CheckSquare className="w-5 h-5 text-rose-600" /> : <Square className="w-5 h-5 text-slate-400" />}
                              </span>
                              <div>
                                <div className="font-mono font-bold text-xs sm:text-sm text-rose-700">
                                  {br.numero}
                                </div>
                                <div className="text-[11px] text-slate-600">
                                  Retour : {formatDate(br.date)} • Motif: <span className="italic">{br.motif || 'Retour standard'}</span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="font-mono font-bold text-xs sm:text-sm text-rose-600">
                                - {formatCurrency(br.total_ttc)}
                              </div>
                              <div className="text-[10px] text-rose-500 font-mono">
                                HT déduit: -{formatCurrency(br.total_ht, false)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3. Invoicing Options & Consolidated Net Summary */}
                <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 shadow-md space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    3. Paramètres de la Facture Consolidée
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">Date de Facture</label>
                      <input
                        type="date"
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-slate-800 text-white rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">Mode de Règlement</label>
                      <select
                        value={modeReglement}
                        onChange={(e) => setModeReglement(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-slate-800 text-white rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Virement">Virement bancaire</option>
                        <option value="Chèque">Chèque</option>
                        <option value="Traite">Traite / Effet</option>
                        <option value="Espèces">Espèces</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Notes / Mentions sur la facture</label>
                    <input
                      type="text"
                      placeholder="Ex: Facturation mensuelle avec déduction des retours chantier..."
                      value={invoiceNotes}
                      onChange={(e) => setInvoiceNotes(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-800 text-white rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Summary Breakdown Grid */}
                  <div className="pt-3 border-t border-slate-800 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                      <div>
                        <div className="text-slate-400 text-[10px] uppercase">Cumul Livraisons (BL +)</div>
                        <div className="font-mono font-bold text-blue-300 text-sm">
                          + {formatCurrency(previewTotals.blTtc)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          HT: {formatCurrency(previewTotals.blHt, false)}
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-400 text-[10px] uppercase">Cumul Retours (BR -)</div>
                        <div className="font-mono font-bold text-rose-400 text-sm">
                          - {formatCurrency(previewTotals.brTtc)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          HT: -{formatCurrency(previewTotals.brHt, false)}
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-400 text-[10px] uppercase">Ventilation TVA Nette</div>
                        <div className="font-mono font-bold text-indigo-300 text-sm">
                          {formatCurrency(previewTotals.netTva)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {selectedBlIds.length} BL &amp; {selectedBrIds.length} Retours
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
                      <div className="space-y-1 text-center sm:text-left">
                        <div className="text-xs text-slate-400">
                          Total Net HT : <span className="font-mono font-semibold text-slate-200">{formatCurrency(previewTotals.netHt)}</span>
                        </div>
                        <div className="text-xl font-extrabold text-emerald-400 font-mono tracking-tight">
                          NET À FACTURER : {formatCurrency(previewTotals.netTtc)}
                        </div>
                      </div>

                      <button
                        onClick={handleGenerate}
                        disabled={(selectedBlIds.length === 0 && selectedBrIds.length === 0) || isGenerating}
                        className="w-full sm:w-auto px-6 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isGenerating ? (
                          'Génération en cours...'
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            Générer la Facture Consolidée
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
