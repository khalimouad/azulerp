'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Sparkles,
  FileText,
  Truck,
  Users,
  Package,
  ShoppingCart,
  BookOpen,
  Factory,
  Store,
  ArrowRight,
  Eye,
  Edit,
  AlertCircle,
  CheckCircle2,
  Filter,
  RefreshCw,
  X,
  HelpCircle,
  ChevronRight,
  Zap,
  CornerDownRight,
  Key,
  ExternalLink,
  Receipt,
  RotateCcw,
} from 'lucide-react';
import {
  Facture,
  BonLivraison,
  BonRetour,
  Client,
  Produit,
  Fournisseur,
  Devis,
  JournalEntry,
  ProductionOrder,
  CompanyInfo,
} from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';

type SearchCategory =
  | 'ALL'
  | 'FACTURES'
  | 'BL'
  | 'BR'
  | 'DEVIS'
  | 'CLIENTS'
  | 'PRODUITS'
  | 'FOURNISSEURS'
  | 'COMPTABILITE'
  | 'FABRICATION';

interface GlobalSearchViewProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onNavigateTab: (tab: string) => void;
  company: CompanyInfo;
  factures: Facture[];
  bonsLivraison: BonLivraison[];
  bonsRetour: BonRetour[];
  clients: Client[];
  produits: Produit[];
  fournisseurs: Fournisseur[];
  devisList: Devis[];
  journalEntries?: JournalEntry[];
  productionOrders?: ProductionOrder[];
  onViewFacture: (facture: Facture) => void;
  onViewBl: (bl: BonLivraison) => void;
  onViewDevis: (devis: Devis) => void;
  onEditClient: (client: Client) => void;
  onEditProduit: (produit: Produit) => void;
}

export const GlobalSearchView: React.FC<GlobalSearchViewProps> = ({
  searchQuery,
  onSearchChange,
  onNavigateTab,
  company,
  factures = [],
  bonsLivraison = [],
  bonsRetour = [],
  clients = [],
  produits = [],
  fournisseurs = [],
  devisList = [],
  journalEntries = [],
  productionOrders = [],
  onViewFacture,
  onViewBl,
  onViewDevis,
  onEditClient,
  onEditProduit,
}) => {
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('ALL');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [lastAiQuery, setLastAiQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const cleanQuery = searchQuery.trim().toLowerCase();

  // Instant Entity Matching
  const filteredFactures = useMemo(() => {
    if (!cleanQuery) return factures.slice(0, 8);
    return factures.filter(
      (f) =>
        f.numero?.toLowerCase().includes(cleanQuery) ||
        f.client_nom?.toLowerCase().includes(cleanQuery) ||
        f.client_ice?.toLowerCase().includes(cleanQuery) ||
        f.statut_paiement?.toLowerCase().includes(cleanQuery) ||
        f.date?.includes(cleanQuery) ||
        f.lignes?.some((l) => l.designation?.toLowerCase().includes(cleanQuery))
    );
  }, [factures, cleanQuery]);

  const filteredBls = useMemo(() => {
    if (!cleanQuery) return bonsLivraison.slice(0, 8);
    return bonsLivraison.filter(
      (b) =>
        b.numero?.toLowerCase().includes(cleanQuery) ||
        b.client_nom?.toLowerCase().includes(cleanQuery) ||
        b.client_ice?.toLowerCase().includes(cleanQuery) ||
        b.statut?.toLowerCase().includes(cleanQuery) ||
        b.date?.includes(cleanQuery) ||
        b.lignes?.some((l) => l.designation?.toLowerCase().includes(cleanQuery))
    );
  }, [bonsLivraison, cleanQuery]);

  const filteredBrs = useMemo(() => {
    if (!cleanQuery) return bonsRetour.slice(0, 8);
    return bonsRetour.filter(
      (br) =>
        br.numero?.toLowerCase().includes(cleanQuery) ||
        br.client_nom?.toLowerCase().includes(cleanQuery) ||
        br.motif?.toLowerCase().includes(cleanQuery) ||
        br.date?.includes(cleanQuery)
    );
  }, [bonsRetour, cleanQuery]);

  const filteredDevis = useMemo(() => {
    if (!cleanQuery) return devisList.slice(0, 8);
    return devisList.filter(
      (d) =>
        d.numero?.toLowerCase().includes(cleanQuery) ||
        d.client_nom?.toLowerCase().includes(cleanQuery) ||
        d.statut?.toLowerCase().includes(cleanQuery) ||
        d.date?.includes(cleanQuery)
    );
  }, [devisList, cleanQuery]);

  const filteredClients = useMemo(() => {
    if (!cleanQuery) return clients.slice(0, 8);
    return clients.filter(
      (c) =>
        c.nom?.toLowerCase().includes(cleanQuery) ||
        c.ice?.toLowerCase().includes(cleanQuery) ||
        c.ville?.toLowerCase().includes(cleanQuery) ||
        c.telephone?.toLowerCase().includes(cleanQuery) ||
        c.email?.toLowerCase().includes(cleanQuery)
    );
  }, [clients, cleanQuery]);

  const filteredProduits = useMemo(() => {
    if (!cleanQuery) return produits.slice(0, 8);
    return produits.filter(
      (p) =>
        p.libelle?.toLowerCase().includes(cleanQuery) ||
        p.code?.toLowerCase().includes(cleanQuery) ||
        p.famille?.toLowerCase().includes(cleanQuery) ||
        p.categorie?.toLowerCase().includes(cleanQuery)
    );
  }, [produits, cleanQuery]);

  const filteredFournisseurs = useMemo(() => {
    if (!cleanQuery) return fournisseurs.slice(0, 8);
    return fournisseurs.filter(
      (f) =>
        f.nom?.toLowerCase().includes(cleanQuery) ||
        f.ice?.toLowerCase().includes(cleanQuery) ||
        f.ville?.toLowerCase().includes(cleanQuery) ||
        f.telephone?.toLowerCase().includes(cleanQuery) ||
        f.email?.toLowerCase().includes(cleanQuery)
    );
  }, [fournisseurs, cleanQuery]);

  const filteredCompta = useMemo(() => {
    if (!cleanQuery) return journalEntries.slice(0, 8);
    return journalEntries.filter(
      (j) =>
        j.reference_piece?.toLowerCase().includes(cleanQuery) ||
        j.libelle_ecriture?.toLowerCase().includes(cleanQuery) ||
        j.journal_code?.toLowerCase().includes(cleanQuery) ||
        j.lignes?.some((l) => l.compte_numero?.includes(cleanQuery) || l.compte_libelle?.toLowerCase().includes(cleanQuery))
    );
  }, [journalEntries, cleanQuery]);

  const filteredOf = useMemo(() => {
    if (!cleanQuery) return productionOrders.slice(0, 8);
    return productionOrders.filter(
      (o) =>
        o.numero?.toLowerCase().includes(cleanQuery) ||
        o.designation?.toLowerCase().includes(cleanQuery) ||
        o.statut?.toLowerCase().includes(cleanQuery)
    );
  }, [productionOrders, cleanQuery]);

  const totalResultsCount =
    filteredFactures.length +
    filteredBls.length +
    filteredBrs.length +
    filteredDevis.length +
    filteredClients.length +
    filteredProduits.length +
    filteredFournisseurs.length +
    filteredCompta.length +
    filteredOf.length;

  // AI Smart Assistant Search Handler
  const handleAiSearch = async (overridePrompt?: string) => {
    const q = overridePrompt || searchQuery.trim();
    if (!q) return;

    setAiLoading(true);
    setAiError(null);
    setAiResponse(null);
    setLastAiQuery(q);

    try {
      const apiKey =
        company.gemini_api_key ||
        (typeof window !== 'undefined' ? localStorage.getItem('azulerp_gemini_api_key') || '' : '');

      const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          prompt: `L'utilisateur recherche dans l'ERP : "${q}". Donne une synthèse claire, directe et actionnable avec les chiffres clés et faits pertinents pour la société.`,
          apiKey,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAiResponse(data.reply || data.message || 'Analyse terminée.');
      } else {
        setAiError(
          data.error ||
            "Impossible d'exécuter la recherche IA. Veuillez vérifier votre clé API Gemini dans les Paramètres."
        );
      }
    } catch (err: any) {
      setAiError(err?.message || "Erreur de connexion à l'assistant IA.");
    } finally {
      setAiLoading(false);
    }
  };

  const hasApiKey = Boolean(
    company.gemini_api_key ||
      (typeof window !== 'undefined' && localStorage.getItem('azulerp_gemini_api_key'))
  );

  const presetQueries = [
    { label: 'Factures impayées', query: 'factures impayées' },
    { label: 'Stock en alerte', query: 'stock alerte' },
    { label: 'Bons de livraison en attente', query: 'en attente' },
    { label: 'Clients de Casablanca', query: 'casablanca' },
    { label: 'Derniers devis', query: 'devis' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 translate-y-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Moteur de Recherche Global & IA 2026</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Recherche Omnibox & Assistant IA
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Retrouvez instantanément n'importe quel document, client, article de stock, facture, fournisseur ou écriture comptable, avec synthèse en langage naturel propulsée par Gemini.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {hasApiKey ? (
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-semibold shadow-xs">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>IA Gemini Active (BDD)</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onNavigateTab('company')}
                className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-200 text-xs font-semibold transition cursor-pointer shadow-xs"
                title="Configurer la clé API Gemini"
              >
                <Key className="w-3.5 h-3.5 text-indigo-400" />
                <span>Activer l'IA (Paramètres)</span>
              </button>
            )}
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="mt-6 relative z-10">
          <div className="relative flex items-center bg-slate-950/90 rounded-2xl border-2 border-indigo-500/40 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/20 shadow-2xl transition overflow-hidden">
            <div className="pl-4 pr-2 text-slate-400">
              <Search className="w-5 h-5 text-blue-400" />
            </div>

            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (searchQuery.trim()) {
                    handleAiSearch();
                  }
                }
              }}
              placeholder="Rechercher par N° Facture, N° BL, Nom Client, ICE, Référence Produit, Fournisseur ou poser une question à l'IA..."
              className="w-full py-4 text-sm sm:text-base bg-transparent text-white placeholder-slate-400 focus:outline-none"
            />

            <div className="flex items-center gap-1.5 pr-3">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    onSearchChange('');
                    setAiResponse(null);
                    setAiError(null);
                  }}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
                  title="Effacer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => handleAiSearch()}
                disabled={aiLoading || !searchQuery.trim()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                title="Lancer l'analyse intelligente avec Gemini"
              >
                {aiLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 text-indigo-200" />
                )}
                <span className="hidden sm:inline">Analyser avec l'IA</span>
              </button>
            </div>
          </div>

          {/* Quick Suggestion Pills */}
          <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
            <span className="text-slate-400 font-medium text-[11px] flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" /> Suggestions :
            </span>
            {presetQueries.map((pill) => (
              <button
                key={pill.label}
                type="button"
                onClick={() => {
                  onSearchChange(pill.query);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white text-[11px] font-medium transition cursor-pointer"
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. AI Smart Insight Card (if triggered) */}
      {(aiLoading || aiResponse || aiError) && (
        <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 rounded-2xl border border-indigo-500/30 p-5 shadow-lg space-y-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between border-b border-indigo-900/60 pb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Synthèse de l'Assistant IA pour : « {lastAiQuery} »</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setAiResponse(null);
                setAiError(null);
              }}
              className="text-slate-400 hover:text-white text-xs p-1"
            >
              Fermer
            </button>
          </div>

          {aiLoading && (
            <div className="flex items-center gap-3 py-4 text-slate-300 text-xs">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
              <span>Analyse des données ERP en cours avec Google Gemini...</span>
            </div>
          )}

          {aiError && (
            <div className="p-3 bg-rose-950/50 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{aiError}</span>
            </div>
          )}

          {aiResponse && (
            <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-sans bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              {aiResponse}
            </div>
          )}
        </div>
      )}

      {/* 3. Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200">
        {[
          { id: 'ALL', label: 'Tous les résultats', count: totalResultsCount, icon: Search },
          { id: 'FACTURES', label: 'Factures', count: filteredFactures.length, icon: FileText },
          { id: 'BL', label: 'Bons de Livraison', count: filteredBls.length, icon: Truck },
          { id: 'BR', label: 'Bons de Retour', count: filteredBrs.length, icon: RotateCcw },
          { id: 'DEVIS', label: 'Devis', count: filteredDevis.length, icon: Receipt },
          { id: 'CLIENTS', label: 'Clients', count: filteredClients.length, icon: Users },
          { id: 'PRODUITS', label: 'Articles & Stock', count: filteredProduits.length, icon: Package },
          { id: 'FOURNISSEURS', label: 'Fournisseurs', count: filteredFournisseurs.length, icon: ShoppingCart },
          { id: 'COMPTABILITE', label: 'Comptabilité', count: filteredCompta.length, icon: BookOpen },
          { id: 'FABRICATION', label: 'Fabrication (OF)', count: filteredOf.length, icon: Factory },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveCategory(tab.id as SearchCategory)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  isActive ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 4. Results Sections */}
      <div className="space-y-6">
        {totalResultsCount === 0 && cleanQuery && (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              Aucun résultat trouvé pour « {searchQuery} »
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Vérifiez l'orthographe du mot-clé ou demandez à l'assistant IA de formuler une recherche intelligente sur vos données.
            </p>
            <button
              type="button"
              onClick={() => handleAiSearch()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Interroger l'IA sur cette requête</span>
            </button>
          </div>
        )}

        {/* Section: FACTURES */}
        {(activeCategory === 'ALL' || activeCategory === 'FACTURES') && filteredFactures.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  Factures Ventes ({filteredFactures.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('factures')}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <span>Voir tout dans Factures</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredFactures.slice(0, activeCategory === 'ALL' ? 5 : 50).map((f) => (
                <div
                  key={f.id}
                  className="p-4 hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {f.numero}
                      </span>
                      <span className="font-bold text-xs text-slate-900">{f.client_nom}</span>
                      {f.client_ice && (
                        <span className="text-[10px] text-slate-400 font-mono">ICE: {f.client_ice}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span>Date: {f.date ? formatDate(f.date) : 'N/A'}</span>
                      <span>•</span>
                      <span>
                        Total TTC: <strong className="text-slate-800">{formatCurrency(f.total_ttc)}</strong>
                      </span>
                      {Number(f.reste_a_payer || 0) > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-rose-600 font-medium">
                            Reste: {formatCurrency(f.reste_a_payer)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        f.statut_paiement === 'Soldé'
                          ? 'bg-emerald-100 text-emerald-800'
                          : f.statut_paiement === 'Partiel'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {f.statut_paiement || 'Impayé'}
                    </span>
                    <button
                      type="button"
                      onClick={() => onViewFacture(f)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-600" />
                      <span>Aperçu PDF</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section: BONS DE LIVRAISON */}
        {(activeCategory === 'ALL' || activeCategory === 'BL') && filteredBls.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  Bons de Livraison ({filteredBls.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('bl')}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1"
              >
                <span>Voir tout dans BL</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredBls.slice(0, activeCategory === 'ALL' ? 5 : 50).map((b) => (
                <div
                  key={b.id}
                  className="p-4 hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {b.numero}
                      </span>
                      <span className="font-bold text-xs text-slate-900">{b.client_nom}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span>Date: {b.date ? formatDate(b.date) : 'N/A'}</span>
                      <span>•</span>
                      <span>
                        Total TTC: <strong className="text-slate-800">{formatCurrency(b.total_ttc)}</strong>
                      </span>
                      {b.facture_numero && (
                        <>
                          <span>•</span>
                          <span className="text-blue-600 font-medium">Facturé dans: {b.facture_numero}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        b.statut === 'Facturé'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {b.statut || 'En attente'}
                    </span>
                    <button
                      type="button"
                      onClick={() => onViewBl(b)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Aperçu BL</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section: CLIENTS */}
        {(activeCategory === 'ALL' || activeCategory === 'CLIENTS') && filteredClients.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  Clients ({filteredClients.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('clients')}
                className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1"
              >
                <span>Gérer les clients</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
              {filteredClients.slice(0, activeCategory === 'ALL' ? 6 : 50).map((c) => (
                <div
                  key={c.id}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-purple-300 bg-slate-50/50 hover:bg-purple-50/20 transition flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <h4 className="font-extrabold text-xs text-slate-900">{c.nom}</h4>
                    <p className="text-[11px] text-slate-500 flex items-center gap-2">
                      {c.ville && <span>{c.ville}</span>}
                      {c.telephone && <span>• Tel: {c.telephone}</span>}
                    </p>
                    {c.ice && (
                      <p className="text-[10px] text-slate-400 font-mono">ICE: {c.ice}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onEditClient(c)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-purple-50 text-purple-700 text-xs font-semibold shadow-2xs transition"
                    >
                      <Edit className="w-3 h-3" />
                      <span>Fiche</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section: PRODUITS & STOCK */}
        {(activeCategory === 'ALL' || activeCategory === 'PRODUITS') && filteredProduits.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  Articles & Stocks ({filteredProduits.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('produits')}
                className="text-xs font-bold text-amber-600 hover:text-amber-800 flex items-center gap-1"
              >
                <span>Catalogue Produits</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
              {filteredProduits.slice(0, activeCategory === 'ALL' ? 6 : 50).map((p) => {
                const stock = Number(p.stock_actuel || 0);
                const min = Number(p.stock_min || 0);
                const isCritical = stock <= min;
                const isZero = stock <= 0;

                return (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-amber-300 bg-slate-50/50 hover:bg-amber-50/20 transition flex items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                          {p.code}
                        </span>
                        <h4 className="font-extrabold text-xs text-slate-900 truncate max-w-[200px]">
                          {p.libelle}
                        </h4>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500">
                        <span>Prix HT: {formatCurrency(p.prix_ht)}</span>
                        {p.unite && <span>• {p.unite}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isZero
                            ? 'bg-rose-100 text-rose-800'
                            : isCritical
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        Stock: {stock}
                      </span>
                      <button
                        type="button"
                        onClick={() => onEditProduit(p)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-amber-50 text-amber-700 text-xs font-semibold shadow-2xs transition"
                      >
                        <Edit className="w-3 h-3" />
                        <span>Fiche</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Section: FOURNISSEURS */}
        {(activeCategory === 'ALL' || activeCategory === 'FOURNISSEURS') && filteredFournisseurs.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  Fournisseurs & Achats ({filteredFournisseurs.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('fournisseurs')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <span>Voir les fournisseurs</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredFournisseurs.slice(0, activeCategory === 'ALL' ? 4 : 50).map((f) => (
                <div
                  key={f.id}
                  className="p-4 hover:bg-slate-50/80 transition flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <h4 className="font-extrabold text-xs text-slate-900">{f.nom}</h4>
                    <p className="text-[11px] text-slate-500">
                      {f.ville && <span>{f.ville} • </span>}
                      {f.telephone && <span>Tel: {f.telephone} • </span>}
                      {f.ice && <span className="font-mono">ICE: {f.ice}</span>}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('fournisseurs')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition"
                  >
                    <span>Consulter</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section: DEVIS */}
        {(activeCategory === 'ALL' || activeCategory === 'DEVIS') && filteredDevis.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-teal-600" />
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  Devis Clients ({filteredDevis.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('devis')}
                className="text-xs font-bold text-teal-600 hover:text-teal-800 flex items-center gap-1"
              >
                <span>Voir tout dans Devis</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredDevis.slice(0, activeCategory === 'ALL' ? 4 : 50).map((d) => (
                <div
                  key={d.id}
                  className="p-4 hover:bg-slate-50/80 transition flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        {d.numero}
                      </span>
                      <span className="font-bold text-xs text-slate-900">{d.client_nom}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Date: {d.date ? formatDate(d.date) : 'N/A'} • Total TTC: {formatCurrency(d.total_ttc)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onViewDevis(d)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-teal-600" />
                    <span>Aperçu Devis</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section: COMPTABILITE */}
        {(activeCategory === 'ALL' || activeCategory === 'COMPTABILITE') && filteredCompta.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-sky-600" />
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  Comptabilité Générale ({filteredCompta.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('accounting')}
                className="text-xs font-bold text-sky-600 hover:text-sky-800 flex items-center gap-1"
              >
                <span>Journal Comptable</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredCompta.slice(0, activeCategory === 'ALL' ? 4 : 50).map((j) => (
                <div
                  key={j.id}
                  className="p-4 hover:bg-slate-50/80 transition flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                        {j.journal_code}
                      </span>
                      <span className="font-bold text-xs text-slate-900">{j.libelle_ecriture}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Pièce: {j.reference_piece} • Date: {j.date} • Total Débit: {formatCurrency(j.total_debit)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('accounting-journal')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition"
                  >
                    <span>Voir écriture</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section: FABRICATION */}
        {(activeCategory === 'ALL' || activeCategory === 'FABRICATION') && filteredOf.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Factory className="w-4 h-4 text-violet-600" />
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  Ordres de Fabrication ({filteredOf.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('manufacturing-orders')}
                className="text-xs font-bold text-violet-600 hover:text-violet-800 flex items-center gap-1"
              >
                <span>Gestion des OF</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredOf.slice(0, activeCategory === 'ALL' ? 4 : 50).map((o) => (
                <div
                  key={o.id}
                  className="p-4 hover:bg-slate-50/80 transition flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-violet-700 bg-violet-50 px-2 py-0.5 rounded border border-violet-200">
                        {o.numero}
                      </span>
                      <span className="font-bold text-xs text-slate-900">{o.designation}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Quantité: {o.quantite_lancee} • Statut: {o.statut}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('manufacturing-orders')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition"
                  >
                    <span>Consulter OF</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
