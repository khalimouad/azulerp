'use client';

import React, { useState, useMemo } from 'react';
import { Facture, BonLivraison, Client, Produit, LineItem } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  BarChart3,
  Download,
  Printer,
  PieChart,
  Users,
  FileSpreadsheet,
  Truck,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  FileText,
  Building,
  Calculator,
  Search,
  Receipt,
} from 'lucide-react';

interface EtatsRapportsViewProps {
  factures: Facture[];
  bonsLivraison?: BonLivraison[];
  clients: Client[];
  produits: Produit[];
  onViewBl?: (bl: BonLivraison) => void;
  onFacturerBl?: (bl: BonLivraison) => void;
}

type ReportTab = 'COMPTABLE' | 'BLS' | 'JOURNAL' | 'TVA' | 'BALANCE_CLIENTS' | 'GROUPES';

export const EtatsRapportsView: React.FC<EtatsRapportsViewProps> = ({
  factures = [],
  bonsLivraison = [],
  clients = [],
  produits = [],
  onViewBl,
  onFacturerBl,
}) => {
  const [activeReport, setActiveReport] = useState<ReportTab>('COMPTABLE');

  // Date range filters
  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState<string>(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // BL-specific filters
  const [blStatusFilter, setBlStatusFilter] = useState<'TOUS' | 'EN_ATTENTE' | 'FACTURE'>('TOUS');
  const [blClientFilter, setBlClientFilter] = useState<number | 'TOUS'>('TOUS');

  // Comptable-specific filters
  const [comptableSearch, setComptableSearch] = useState<string>('');
  const [comptableClientFilter, setComptableClientFilter] = useState<number | 'TOUS'>('TOUS');
  const [comptableTvaFilter, setComptableTvaFilter] = useState<string>('TOUS');

  // Set date preset helpers
  const applyPreset = (type: 'today' | 'this_month' | 'last_month' | 'this_quarter' | 'year' | 'all') => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();

    if (type === 'today') {
      const d = today.toISOString().split('T')[0];
      setStartDate(d);
      setEndDate(d);
    } else if (type === 'this_month') {
      const firstDay = new Date(y, m, 1).toISOString().split('T')[0];
      const lastDay = new Date(y, m + 1, 0).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(lastDay);
    } else if (type === 'last_month') {
      const firstDay = new Date(y, m - 1, 1).toISOString().split('T')[0];
      const lastDay = new Date(y, m, 0).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(lastDay);
    } else if (type === 'this_quarter') {
      const q = Math.floor(m / 3);
      const firstDay = new Date(y, q * 3, 1).toISOString().split('T')[0];
      const lastDay = new Date(y, (q + 1) * 3, 0).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(lastDay);
    } else if (type === 'year') {
      setStartDate(`${y}-01-01`);
      setEndDate(`${y}-12-31`);
    } else if (type === 'all') {
      setStartDate('2020-01-01');
      setEndDate('2030-12-31');
    }
  };

  // Filtered factures based on date range
  const filteredFactures = useMemo(() => {
    return factures.filter((f) => {
      if (!f.date) return true;
      if (startDate && f.date < startDate) return false;
      if (endDate && f.date > endDate) return false;
      return true;
    });
  }, [factures, startDate, endDate]);

  // Flatten all invoice lines for the Accountant Report (Invoice, Date, Customer, Product, Price, Quantity, Total, Tax amount, Tax type)
  const accountantLines = useMemo(() => {
    const lines: Array<{
      id: string;
      facture_id: number;
      facture_numero: string;
      facture_date: string;
      client_id: number;
      client_nom: string;
      client_ice?: string;
      produit_id?: number | null;
      designation: string;
      prix_unitaire_ht: number;
      quantite: number;
      total_ht: number;
      taux_tva: number;
      tax_type: string;
      montant_tva: number;
      total_ttc: number;
    }> = [];

    for (const f of filteredFactures) {
      if (f.lignes && f.lignes.length > 0) {
        f.lignes.forEach((l, idx) => {
          const lQuantite = l.quantite || 1;
          const lPrix = l.prix_ht || 0;
          const lRemise = l.remise_pct || 0;
          const lHt = l.total_ht ?? (lQuantite * lPrix * (1 - lRemise / 100));
          const lTvaRate = l.taux_tva ?? (f.tva_20 ? 20 : (f.tva_10 ? 10 : 20));
          const lTvaMontant = l.total_tva ?? (lHt * (lTvaRate / 100));
          const lTtc = l.total_ttc ?? (lHt + lTvaMontant);
          
          let taxTypeStr = `TVA ${lTvaRate}%`;
          if (lTvaRate === 0) taxTypeStr = 'Exonéré (0%)';
          else if (lTvaRate === 20) taxTypeStr = 'Taux Normal (20%)';
          else if (lTvaRate === 10) taxTypeStr = 'Taux Intermédiaire (10%)';
          else if (lTvaRate === 7) taxTypeStr = 'Taux Réduit (7%)';

          lines.push({
            id: `${f.id}-${l.id || idx}`,
            facture_id: f.id,
            facture_numero: f.numero,
            facture_date: f.date,
            client_id: f.client_id,
            client_nom: f.client_nom,
            client_ice: f.client_ice || '',
            produit_id: l.produit_id,
            designation: l.designation,
            prix_unitaire_ht: lPrix,
            quantite: lQuantite,
            total_ht: lHt,
            taux_tva: lTvaRate,
            tax_type: taxTypeStr,
            montant_tva: lTvaMontant,
            total_ttc: lTtc,
          });
        });
      } else {
        // Fallback if no decomposed lines: synthesize line from header
        const tvaRate = f.tva_10 > 0 && f.tva_20 === 0 ? 10 : 20;
        let taxTypeStr = `TVA ${tvaRate}%`;
        if (tvaRate === 20) taxTypeStr = 'Taux Normal (20%)';
        else if (tvaRate === 10) taxTypeStr = 'Taux Intermédiaire (10%)';

        lines.push({
          id: `${f.id}-header`,
          facture_id: f.id,
          facture_numero: f.numero,
          facture_date: f.date,
          client_id: f.client_id,
          client_nom: f.client_nom,
          client_ice: f.client_ice || '',
          produit_id: null,
          designation: f.notes ? `Ventes / Prestations (${f.notes})` : 'Marchandises & Matériel',
          prix_unitaire_ht: f.total_ht,
          quantite: 1,
          total_ht: f.total_ht,
          taux_tva: tvaRate,
          tax_type: taxTypeStr,
          montant_tva: f.total_tva,
          total_ttc: f.total_ttc,
        });
      }
    }

    // Apply sub-filters (search, client, tax type)
    return lines.filter((line) => {
      if (comptableClientFilter !== 'TOUS' && line.client_id !== comptableClientFilter) {
        return false;
      }
      if (comptableTvaFilter !== 'TOUS') {
        const rate = Number(comptableTvaFilter);
        if (line.taux_tva !== rate) return false;
      }
      if (comptableSearch.trim()) {
        const q = comptableSearch.toLowerCase();
        const matchInvoice = line.facture_numero.toLowerCase().includes(q);
        const matchClient = line.client_nom.toLowerCase().includes(q);
        const matchIce = (line.client_ice || '').toLowerCase().includes(q);
        const matchProduct = line.designation.toLowerCase().includes(q);
        if (!matchInvoice && !matchClient && !matchIce && !matchProduct) {
          return false;
        }
      }
      return true;
    });
  }, [filteredFactures, comptableClientFilter, comptableTvaFilter, comptableSearch]);

  // Totals for Accountant report
  const comptableTotals = useMemo(() => {
    return accountantLines.reduce(
      (acc, l) => {
        acc.total_ht += l.total_ht;
        acc.total_tva += l.montant_tva;
        acc.total_ttc += l.total_ttc;
        acc.quantite_totale += l.quantite;
        if (l.taux_tva === 20) acc.tva_20 += l.montant_tva;
        if (l.taux_tva === 10) acc.tva_10 += l.montant_tva;
        if (l.taux_tva === 7) acc.tva_7 += l.montant_tva;
        return acc;
      },
      { total_ht: 0, total_tva: 0, total_ttc: 0, quantite_totale: 0, tva_20: 0, tva_10: 0, tva_7: 0 }
    );
  }, [accountantLines]);

  // Filtered BLs based on date range & sub-filters
  const filteredBonsLivraison = useMemo(() => {
    return bonsLivraison.filter((bl) => {
      if (startDate && bl.date < startDate) return false;
      if (endDate && bl.date > endDate) return false;
      if (blStatusFilter === 'EN_ATTENTE' && bl.statut === 'Facturé') return false;
      if (blStatusFilter === 'FACTURE' && bl.statut !== 'Facturé') return false;
      if (blClientFilter !== 'TOUS' && bl.client_id !== blClientFilter) return false;
      return true;
    });
  }, [bonsLivraison, startDate, endDate, blStatusFilter, blClientFilter]);

  // Summary calculations for Invoices
  const factureTotals = useMemo(() => {
    return filteredFactures.reduce(
      (acc, f) => {
        acc.ht += f.total_ht || 0;
        acc.tva20 += f.tva_20 || 0;
        acc.tva10 += f.tva_10 || 0;
        acc.tva += f.total_tva || 0;
        acc.ttc += f.total_ttc || 0;
        acc.regle += f.montant_regle || 0;
        acc.reste += f.reste_a_payer || 0;
        return acc;
      },
      { ht: 0, tva20: 0, tva10: 0, tva: 0, ttc: 0, regle: 0, reste: 0 }
    );
  }, [filteredFactures]);

  // Summary calculations for BLs
  const blTotals = useMemo(() => {
    const allInRange = bonsLivraison.filter((bl) => {
      if (startDate && bl.date < startDate) return false;
      if (endDate && bl.date > endDate) return false;
      return true;
    });

    const pending = allInRange.filter((bl) => bl.statut !== 'Facturé');
    const billed = allInRange.filter((bl) => bl.statut === 'Facturé');

    const totalHt = allInRange.reduce((s, bl) => s + (bl.total_ht || 0), 0);
    const totalTtc = allInRange.reduce((s, bl) => s + (bl.total_ttc || 0), 0);

    const pendingHt = pending.reduce((s, bl) => s + (bl.total_ht || 0), 0);
    const pendingTtc = pending.reduce((s, bl) => s + (bl.total_ttc || 0), 0);

    const billedHt = billed.reduce((s, bl) => s + (bl.total_ht || 0), 0);
    const billedTtc = billed.reduce((s, bl) => s + (bl.total_ttc || 0), 0);

    const billingRate = allInRange.length > 0 ? (billed.length / allInRange.length) * 100 : 0;

    return {
      totalCount: allInRange.length,
      totalHt,
      totalTtc,
      pendingCount: pending.length,
      pendingHt,
      pendingTtc,
      billedCount: billed.length,
      billedHt,
      billedTtc,
      billingRate,
    };
  }, [bonsLivraison, startDate, endDate]);

  // Group pending BLs by client
  const pendingBlsByClient = useMemo(() => {
    const map = new Map<number, { client: Client; bls: BonLivraison[]; totalTtc: number }>();
    const pending = bonsLivraison.filter((bl) => {
      if (startDate && bl.date < startDate) return false;
      if (endDate && bl.date > endDate) return false;
      return bl.statut !== 'Facturé';
    });

    pending.forEach((bl) => {
      const client = clients.find((c) => c.id === bl.client_id) || {
        id: bl.client_id,
        nom: bl.client_nom,
        code: '',
      } as Client;

      if (!map.has(bl.client_id)) {
        map.set(bl.client_id, { client, bls: [], totalTtc: 0 });
      }
      const group = map.get(bl.client_id)!;
      group.bls.push(bl);
      group.totalTtc += bl.total_ttc;
    });

    return Array.from(map.values()).sort((a, b) => b.totalTtc - a.totalTtc);
  }, [bonsLivraison, clients, startDate, endDate]);

  // Clients balance
  const clientBalances = useMemo(() => {
    return clients
      .map((c) => {
        const cFactures = filteredFactures.filter((f) => f.client_id === c.id);
        const totalTtc = cFactures.reduce((s, f) => s + (f.total_ttc || 0), 0);
        const totalRegle = cFactures.reduce((s, f) => s + (f.montant_regle || 0), 0);
        const reste = cFactures.reduce((s, f) => s + (f.reste_a_payer || 0), 0);
        return {
          client: c,
          count: cFactures.length,
          totalTtc,
          totalRegle,
          reste,
        };
      })
      .filter((item) => item.totalTtc > 0 || item.reste > 0);
  }, [clients, filteredFactures]);

  // Sales by product group
  const salesByGroup = useMemo(() => {
    const map = new Map<string, { group: string; count: number; totalHt: number }>();
    for (const f of filteredFactures) {
      for (const line of f.lignes || []) {
        const prod = produits.find((p) => p.id === line.produit_id);
        const group = prod?.groupe || line.groupe || 'GENERAL';
        if (!map.has(group)) {
          map.set(group, { group, count: 0, totalHt: 0 });
        }
        const item = map.get(group)!;
        item.count += line.quantite;
        item.totalHt += line.total_ht ?? line.quantite * line.prix_ht;
      }
    }
    return Array.from(map.values()).sort((a, b) => b.totalHt - a.totalHt);
  }, [filteredFactures, produits]);

  // Export BLs to CSV
  const exportBlsToCsv = () => {
    let csv = 'data:text/csv;charset=utf-8,\uFEFF';
    csv += 'Numero_BL;Date;Client;ICE;Statut;Montant_HT;TVA_20;TVA_10;Total_TVA;Total_TTC;Facture_Rattachee;Notes\n';
    filteredBonsLivraison.forEach((bl) => {
      csv += `"${bl.numero}";"${bl.date}";"${bl.client_nom}";"${bl.client_ice || ''}";"${bl.statut}";${bl.total_ht};${bl.tva_20 || 0};${bl.tva_10 || 0};${bl.total_tva || 0};${bl.total_ttc};"${bl.facture_numero || ''}";"${bl.notes || ''}"\n`;
    });
    const encoded = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `Rapport_Bons_Livraison_${startDate}_au_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Invoices to CSV
  const exportFacturesToCsv = () => {
    let csv = 'data:text/csv;charset=utf-8,\uFEFF';
    csv += 'Numero;Date;Client;Total_HT;TVA_20;TVA_10;Total_TVA;Total_TTC;Regle;Reste_A_Payer\n';
    filteredFactures.forEach((f) => {
      csv += `"${f.numero}";"${f.date}";"${f.client_nom}";${f.total_ht};${f.tva_20 || 0};${f.tva_10 || 0};${f.total_tva || 0};${f.total_ttc};${f.montant_regle || 0};${f.reste_a_payer || 0}\n`;
    });
    const encoded = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `Journal_Ventes_${startDate}_au_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Detailed Accountant Report (Invoice, Date, Customer, Product, Price, Quantity, Total, Tax Amount, Tax Type) to CSV/Excel
  const exportComptableToCsv = () => {
    let csv = 'data:text/csv;charset=utf-8,\uFEFF';
    csv += 'Numero_Facture;Date_Facture;Client;ICE_Client;Produit;Prix_Unitaire_HT;Quantite;Total_HT;Type_TVA;Taux_TVA_Pct;Montant_TVA;Total_TTC\n';
    accountantLines.forEach((l) => {
      const sanitizedDesig = l.designation.replace(/"/g, '""');
      const sanitizedClient = l.client_nom.replace(/"/g, '""');
      csv += `"${l.facture_numero}";"${l.facture_date}";"${sanitizedClient}";"${l.client_ice || ''}";"${sanitizedDesig}";${l.prix_unitaire_ht.toFixed(2)};${l.quantite};${l.total_ht.toFixed(2)};"${l.tax_type}";${l.taux_tva};${l.montant_tva.toFixed(2)};${l.total_ttc.toFixed(2)}\n`;
    });
    const encoded = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `Rapport_Comptable_Detaille_${startDate}_au_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            États, Statistiques & Rapports Périodiques
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Rapport comptable exhaustif, Bons de Livraison (BLs), Journal des ventes, déclarations fiscales TVA et encours
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeReport === 'COMPTABLE' ? (
            <button
              type="button"
              id="export-comptable-report-csv-btn"
              onClick={exportComptableToCsv}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition active:scale-95"
              title="Télécharger le fichier CSV/Excel pour le comptable"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exporter Rapport Comptable (CSV / Excel)</span>
            </button>
          ) : activeReport === 'BLS' ? (
            <button
              type="button"
              id="export-bl-report-csv-btn"
              onClick={exportBlsToCsv}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exporter Rapport BLs (CSV)</span>
            </button>
          ) : (
            <button
              type="button"
              id="export-facture-report-csv-btn"
              onClick={exportFacturesToCsv}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exporter Journal Ventes (CSV)</span>
            </button>
          )}
        </div>
      </div>

      {/* Date Range Selector Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Custom Date Inputs */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Période d'analyse :</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-semibold text-slate-500">Du</span>
                <input
                  type="date"
                  id="report-start-date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                />
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[11px] font-semibold text-slate-500">Au</span>
                <input
                  type="date"
                  id="report-end-date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1 text-[11px]">
            <span className="text-slate-400 font-medium mr-1 hidden sm:inline">Raccourcis :</span>
            <button
              type="button"
              onClick={() => applyPreset('today')}
              className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
            >
              Aujourd'hui
            </button>
            <button
              type="button"
              onClick={() => applyPreset('this_month')}
              className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
            >
              Ce Mois
            </button>
            <button
              type="button"
              onClick={() => applyPreset('last_month')}
              className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
            >
              Mois Dernier
            </button>
            <button
              type="button"
              onClick={() => applyPreset('this_quarter')}
              className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
            >
              Ce Trimestre
            </button>
            <button
              type="button"
              onClick={() => applyPreset('year')}
              className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold transition"
            >
              Année 2026
            </button>
            <button
              type="button"
              onClick={() => applyPreset('all')}
              className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
            >
              Tout
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <button
          type="button"
          id="report-tab-comptable"
          onClick={() => setActiveReport('COMPTABLE')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold transition whitespace-nowrap ${
            activeReport === 'COMPTABLE'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>Rapport pour Comptable (Détail Lignes)</span>
          <span className="ml-1 px-1.5 py-0.2 bg-indigo-800/60 text-white text-[10px] rounded-full">
            {accountantLines.length}
          </span>
        </button>

        <button
          type="button"
          id="report-tab-bls"
          onClick={() => setActiveReport('BLS')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold transition whitespace-nowrap ${
            activeReport === 'BLS'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Rapport Bons de Livraison (BLs)</span>
          <span className="ml-1 px-1.5 py-0.2 bg-emerald-800/60 text-white text-[10px] rounded-full">
            {bonsLivraison.length}
          </span>
        </button>

        <button
          type="button"
          id="report-tab-journal"
          onClick={() => setActiveReport('JOURNAL')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold transition whitespace-nowrap ${
            activeReport === 'JOURNAL'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Journal Général des Ventes</span>
        </button>

        <button
          type="button"
          id="report-tab-tva"
          onClick={() => setActiveReport('TVA')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold transition whitespace-nowrap ${
            activeReport === 'TVA'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>État Fiscal & Déclaration TVA</span>
        </button>

        <button
          type="button"
          id="report-tab-balance"
          onClick={() => setActiveReport('BALANCE_CLIENTS')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold transition whitespace-nowrap ${
            activeReport === 'BALANCE_CLIENTS'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Balance Âgée Clients</span>
        </button>

        <button
          type="button"
          id="report-tab-groupes"
          onClick={() => setActiveReport('GROUPES')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold transition whitespace-nowrap ${
            activeReport === 'GROUPES'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Ventes par Famille d'Articles</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB 0: RAPPORT POUR COMPTABLE (LIGNES DE FACTURES DETAILLEES) */}
      {/* ============================================================ */}
      {activeReport === 'COMPTABLE' && (
        <div className="space-y-4">
          {/* Key Metrics Cards for Accountant */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Chiffre d'Affaires HT
                </span>
                <Calculator className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="mt-2 text-xl sm:text-2xl font-black text-slate-900 font-mono">
                {formatCurrency(comptableTotals.total_ht)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {accountantLines.length} ligne{accountantLines.length > 1 ? 's' : ''} de facturation
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-indigo-200 bg-indigo-50/20 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider">
                  Total TVA Collectée
                </span>
                <Receipt className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="mt-2 text-xl sm:text-2xl font-black text-indigo-700 font-mono">
                {formatCurrency(comptableTotals.total_tva)}
              </div>
              <p className="text-[11px] text-indigo-900/80 font-mono mt-1">
                TVA 20%: {formatCurrency(comptableTotals.tva_20)} • 10%: {formatCurrency(comptableTotals.tva_10)}
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Total Ventes TTC
                </span>
                <FileText className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2 text-xl sm:text-2xl font-black text-emerald-700 font-mono">
                {formatCurrency(comptableTotals.total_ttc)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {filteredFactures.length} facture{filteredFactures.length > 1 ? 's' : ''} sur la période
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Volume Articles / Unités
                </span>
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <div className="mt-2 text-xl sm:text-2xl font-black text-slate-900 font-mono">
                {comptableTotals.quantite_totale.toLocaleString('fr-FR')}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Quantité cumulée facturée</p>
            </div>
          </div>

          {/* Sub-Filters for Accountant Table */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="comptable-search-input"
                  type="text"
                  placeholder="Rechercher par N° Facture, Client, ICE, Produit..."
                  value={comptableSearch}
                  onChange={(e) => setComptableSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 font-medium"
                />
                {comptableSearch && (
                  <button
                    type="button"
                    onClick={() => setComptableSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Client filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-medium">Client :</span>
                  <select
                    id="comptable-client-filter"
                    value={comptableClientFilter}
                    onChange={(e) => setComptableClientFilter(e.target.value === 'TOUS' ? 'TOUS' : Number(e.target.value))}
                    className="px-2.5 py-1.5 text-xs bg-slate-50 rounded-lg border border-slate-300 font-medium text-slate-800"
                  >
                    <option value="TOUS">Tous les clients</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nom}
                      </option>
                    ))}
                  </select>
                </div>

                {/* TVA Rate filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-medium">Type Taxe :</span>
                  <select
                    id="comptable-tva-filter"
                    value={comptableTvaFilter}
                    onChange={(e) => setComptableTvaFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs bg-slate-50 rounded-lg border border-slate-300 font-medium text-slate-800"
                  >
                    <option value="TOUS">Tous les taux</option>
                    <option value="20">TVA 20% (Normal)</option>
                    <option value="10">TVA 10% (Intermédiaire)</option>
                    <option value="7">TVA 7% (Réduit)</option>
                    <option value="0">0% (Exonéré)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Full Accountant Ledger Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-semibold divide-x divide-slate-800">
                    <th className="p-3 whitespace-nowrap">N° Facture</th>
                    <th className="p-3 whitespace-nowrap">Date Facture</th>
                    <th className="p-3 whitespace-nowrap">Client / Customer</th>
                    <th className="p-3 whitespace-nowrap">Produit / Désignation</th>
                    <th className="p-3 text-right whitespace-nowrap">Prix Unit. HT</th>
                    <th className="p-3 text-right whitespace-nowrap">Quantité</th>
                    <th className="p-3 text-right whitespace-nowrap">Total HT</th>
                    <th className="p-3 text-center whitespace-nowrap">Type TVA</th>
                    <th className="p-3 text-right whitespace-nowrap">Montant TVA</th>
                    <th className="p-3 text-right whitespace-nowrap">Total TTC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {accountantLines.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400">
                        Aucune ligne de facture ne correspond aux critères pour la période du {formatDate(startDate)} au {formatDate(endDate)}.
                      </td>
                    </tr>
                  ) : (
                    accountantLines.map((line) => (
                      <tr key={line.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {line.facture_numero}
                        </td>
                        <td className="p-3 text-slate-600 whitespace-nowrap font-mono">
                          {formatDate(line.facture_date)}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <div className="font-semibold text-slate-900">{line.client_nom}</div>
                          {line.client_ice && (
                            <div className="text-[10px] font-mono text-slate-400">ICE: {line.client_ice}</div>
                          )}
                        </td>
                        <td className="p-3 text-slate-900 font-medium max-w-xs">
                          {line.designation}
                        </td>
                        <td className="p-3 text-right font-mono text-slate-700 whitespace-nowrap">
                          {formatCurrency(line.prix_unitaire_ht)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {line.quantite}
                        </td>
                        <td className="p-3 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">
                          {formatCurrency(line.total_ht)}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              line.taux_tva === 20
                                ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                : line.taux_tva === 10
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {line.tax_type}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-semibold text-indigo-700 whitespace-nowrap">
                          {formatCurrency(line.montant_tva)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {formatCurrency(line.total_ttc)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {accountantLines.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-900 text-white font-bold">
                      <td colSpan={4} className="p-3 text-right uppercase text-[11px]">
                        Totaux Lignes Comptables ({accountantLines.length} lignes) :
                      </td>
                      <td className="p-3 text-right font-mono text-slate-300">-</td>
                      <td className="p-3 text-right font-mono text-slate-200">
                        {comptableTotals.quantite_totale.toLocaleString('fr-FR')}
                      </td>
                      <td className="p-3 text-right font-mono">
                        {formatCurrency(comptableTotals.total_ht)}
                      </td>
                      <td className="p-3 text-center text-slate-300">-</td>
                      <td className="p-3 text-right font-mono text-indigo-300">
                        {formatCurrency(comptableTotals.total_tva)}
                      </td>
                      <td className="p-3 text-right font-mono text-emerald-300">
                        {formatCurrency(comptableTotals.total_ttc)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 1: RAPPORT DES BONS DE LIVRAISON (BLS) */}
      {/* ============================================================ */}
      {activeReport === 'BLS' && (
        <div className="space-y-4">
          {/* Key BL Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Total BLs Émis (Période)
                </span>
                <Truck className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">{blTotals.totalCount}</span>
                <span className="text-xs text-slate-500 font-medium">livraisons</span>
              </div>
              <p className="text-xs text-slate-600 font-mono mt-1">
                Volume TTC : <strong>{formatCurrency(blTotals.totalTtc)}</strong>
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                  BLs En Attente Facturation
                </span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-700">{blTotals.pendingCount}</span>
                <span className="text-xs text-amber-600 font-medium">à facturer</span>
              </div>
              <p className="text-xs text-amber-900 font-mono font-bold mt-1">
                Montant TTC : {formatCurrency(blTotals.pendingTtc)}
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/20 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">
                  BLs Facturés & Soldés
                </span>
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-blue-700">{blTotals.billedCount}</span>
                <span className="text-xs text-blue-600 font-medium">facturés</span>
              </div>
              <p className="text-xs text-blue-900 font-mono mt-1">
                Montant TTC : <strong>{formatCurrency(blTotals.billedTtc)}</strong>
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Taux de Facturation
                </span>
                <TrendingUp className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-indigo-700">
                  {blTotals.billingRate.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${blTotals.billingRate}%` }}
                />
              </div>
            </div>
          </div>

          {/* Pending BLs Breakdown by Client */}
          {pendingBlsByClient.length > 0 && (
            <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Bons de Livraison en Attente de Facturation par Client ({pendingBlsByClient.length})
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                  Total non facturé : {formatCurrency(blTotals.pendingTtc)}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {pendingBlsByClient.map((item) => (
                  <div
                    key={item.client.id}
                    className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-col justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 line-clamp-1">
                          {item.client.nom}
                        </span>
                        <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md shrink-0">
                          {item.bls.length} BL{item.bls.length > 1 ? 's' : ''}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        ICE : {item.client.ice || 'Non renseigné'}
                      </p>
                      <p className="text-xs font-mono font-bold text-slate-900 mt-1">
                        Total TTC : <span className="text-amber-700">{formatCurrency(item.totalTtc)}</span>
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">
                        N° : {item.bls.map((b) => b.numero.split('/')[0]).join(', ')}
                      </span>
                      {onFacturerBl && item.bls[0] && (
                        <button
                          type="button"
                          onClick={() => onFacturerBl(item.bls[0])}
                          className="flex items-center gap-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold shadow-xs transition"
                        >
                          <span>Facturer</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sub-Filters for Detailed BL Table */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-semibold text-slate-700">Filtrer la liste des BLs :</span>
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setBlStatusFilter('TOUS')}
                  className={`px-2.5 py-1 rounded-md font-medium transition ${
                    blStatusFilter === 'TOUS' ? 'bg-white shadow-xs font-bold text-slate-900' : 'text-slate-600'
                  }`}
                >
                  Tous ({bonsLivraison.length})
                </button>
                <button
                  type="button"
                  onClick={() => setBlStatusFilter('EN_ATTENTE')}
                  className={`px-2.5 py-1 rounded-md font-medium transition ${
                    blStatusFilter === 'EN_ATTENTE' ? 'bg-white shadow-xs font-bold text-amber-700' : 'text-slate-600'
                  }`}
                >
                  En Attente ({blTotals.pendingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setBlStatusFilter('FACTURE')}
                  className={`px-2.5 py-1 rounded-md font-medium transition ${
                    blStatusFilter === 'FACTURE' ? 'bg-white shadow-xs font-bold text-blue-700' : 'text-slate-600'
                  }`}
                >
                  Facturés ({blTotals.billedCount})
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Client :</span>
              <select
                value={blClientFilter}
                onChange={(e) => setBlClientFilter(e.target.value === 'TOUS' ? 'TOUS' : Number(e.target.value))}
                className="px-2.5 py-1 text-xs bg-slate-50 rounded-lg border border-slate-300 font-medium"
              >
                <option value="TOUS">Tous les clients</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Detailed BL Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-semibold divide-x divide-slate-800">
                    <th className="p-3">N° BL</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Client / Raison Sociale</th>
                    <th className="p-3">ICE Client</th>
                    <th className="p-3 text-center">Statut Facturation</th>
                    <th className="p-3 text-right">Montant HT</th>
                    <th className="p-3 text-right">Total TTC</th>
                    <th className="p-3">N° Facture</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredBonsLivraison.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        Aucun bon de livraison trouvé pour les critères et la période sélectionnés.
                      </td>
                    </tr>
                  ) : (
                    filteredBonsLivraison.map((bl) => {
                      const isFacture = bl.statut === 'Facturé';
                      return (
                        <tr key={bl.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3 font-mono font-bold text-slate-900">{bl.numero}</td>
                          <td className="p-3 text-slate-600">{formatDate(bl.date)}</td>
                          <td className="p-3 font-medium text-slate-900">{bl.client_nom}</td>
                          <td className="p-3 font-mono text-slate-500">{bl.client_ice || '-'}</td>
                          <td className="p-3 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isFacture
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {isFacture ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-blue-600" />
                                  Facturé
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  En attente
                                </>
                              )}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono text-slate-700">
                            {formatCurrency(bl.total_ht)}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(bl.total_ttc)}
                          </td>
                          <td className="p-3 font-mono text-xs">
                            {bl.facture_numero ? (
                              <span className="text-blue-700 font-bold">{bl.facture_numero}</span>
                            ) : (
                              <span className="text-slate-400 italic">Non rattachée</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {onViewBl && (
                                <button
                                  type="button"
                                  onClick={() => onViewBl(bl)}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium transition"
                                  title="Aperçu / Imprimer BL"
                                >
                                  Aperçu
                                </button>
                              )}
                              {!isFacture && onFacturerBl && (
                                <button
                                  type="button"
                                  onClick={() => onFacturerBl(bl)}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold shadow-xs transition"
                                  title="Générer la facture correspondante"
                                >
                                  Facturer
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {filteredBonsLivraison.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-900 text-white font-bold">
                      <td colSpan={5} className="p-3 text-right uppercase text-[11px]">
                        Total des {filteredBonsLivraison.length} Bons de Livraison :
                      </td>
                      <td className="p-3 text-right font-mono">
                        {formatCurrency(filteredBonsLivraison.reduce((s, bl) => s + bl.total_ht, 0))}
                      </td>
                      <td className="p-3 text-right font-mono text-emerald-400">
                        {formatCurrency(filteredBonsLivraison.reduce((s, bl) => s + bl.total_ttc, 0))}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: JOURNAL GENERAL DES VENTES */}
      {/* ============================================================ */}
      {activeReport === 'JOURNAL' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Chiffre d'Affaires HT
              </span>
              <div className="mt-2 text-xl sm:text-2xl font-black text-slate-900 font-mono">
                {formatCurrency(factureTotals.ht)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Total base imposable facturée</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Total TVA Facturée
              </span>
              <div className="mt-2 text-xl sm:text-2xl font-black text-blue-600 font-mono">
                {formatCurrency(factureTotals.tva)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                TVA 20%: {formatCurrency(factureTotals.tva20)} • 10%: {formatCurrency(factureTotals.tva10)}
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Ventes TTC
              </span>
              <div className="mt-2 text-xl sm:text-2xl font-black text-slate-900 font-mono">
                {formatCurrency(factureTotals.ttc)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">{filteredFactures.length} factures émises</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Reste à Recouvrer
              </span>
              <div className="mt-2 text-xl sm:text-2xl font-black text-red-600 font-mono">
                {formatCurrency(factureTotals.reste)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Encaissé : {formatCurrency(factureTotals.regle)}
              </p>
            </div>
          </div>

          {/* Factures Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-semibold divide-x divide-slate-800">
                    <th className="p-3">N° Facture</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Client</th>
                    <th className="p-3 text-right">Total HT</th>
                    <th className="p-3 text-right">TVA 20%</th>
                    <th className="p-3 text-right">TVA 10%</th>
                    <th className="p-3 text-right">Total TVA</th>
                    <th className="p-3 text-right">Total TTC</th>
                    <th className="p-3 text-right">Réglé</th>
                    <th className="p-3 text-right">Reste</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredFactures.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400">
                        Aucune facture trouvée pour cette période.
                      </td>
                    </tr>
                  ) : (
                    filteredFactures.map((f) => (
                      <tr key={f.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3 font-mono font-bold text-slate-900">{f.numero}</td>
                        <td className="p-3 text-slate-600">{formatDate(f.date)}</td>
                        <td className="p-3 font-medium text-slate-900">{f.client_nom}</td>
                        <td className="p-3 text-right font-mono">{formatCurrency(f.total_ht)}</td>
                        <td className="p-3 text-right font-mono text-slate-600">{formatCurrency(f.tva_20 || 0)}</td>
                        <td className="p-3 text-right font-mono text-slate-600">{formatCurrency(f.tva_10 || 0)}</td>
                        <td className="p-3 text-right font-mono font-semibold text-blue-700">{formatCurrency(f.total_tva)}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">{formatCurrency(f.total_ttc)}</td>
                        <td className="p-3 text-right font-mono text-emerald-700">{formatCurrency(f.montant_regle)}</td>
                        <td className="p-3 text-right font-mono font-bold text-red-600">{formatCurrency(f.reste_a_payer)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredFactures.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-900 text-white font-bold">
                      <td colSpan={3} className="p-3 text-right uppercase text-[11px]">
                        Totaux Période ({filteredFactures.length} Factures) :
                      </td>
                      <td className="p-3 text-right font-mono">{formatCurrency(factureTotals.ht)}</td>
                      <td className="p-3 text-right font-mono">{formatCurrency(factureTotals.tva20)}</td>
                      <td className="p-3 text-right font-mono">{formatCurrency(factureTotals.tva10)}</td>
                      <td className="p-3 text-right font-mono text-blue-300">{formatCurrency(factureTotals.tva)}</td>
                      <td className="p-3 text-right font-mono text-emerald-300">{formatCurrency(factureTotals.ttc)}</td>
                      <td className="p-3 text-right font-mono">{formatCurrency(factureTotals.regle)}</td>
                      <td className="p-3 text-right font-mono text-red-400">{formatCurrency(factureTotals.reste)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: DECLARATION FISCALE TVA */}
      {/* ============================================================ */}
      {activeReport === 'TVA' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <PieChart className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Tableau Récapitulatif de Déclaration de la TVA Collectée
              </h3>
              <p className="text-xs text-slate-500">
                Période du {formatDate(startDate)} au {formatDate(endDate)}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-semibold">
                  <th className="p-3">Taux de Taxe Applicable</th>
                  <th className="p-3 text-right">Base Imposable HT (DH)</th>
                  <th className="p-3 text-right">Montant Taxe Exigible (DH)</th>
                  <th className="p-3 text-right">Total TTC Imposé (DH)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="p-3 font-semibold text-slate-900">TVA au Taux Normal (20%)</td>
                  <td className="p-3 text-right font-mono font-bold">
                    {formatCurrency(factureTotals.tva20 > 0 ? factureTotals.tva20 * 5 : 0)}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-blue-700">
                    {formatCurrency(factureTotals.tva20)}
                  </td>
                  <td className="p-3 text-right font-mono">
                    {formatCurrency(factureTotals.tva20 > 0 ? factureTotals.tva20 * 6 : 0)}
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-900">TVA au Taux Intermédiaire (10%)</td>
                  <td className="p-3 text-right font-mono font-bold">
                    {formatCurrency(factureTotals.tva10 > 0 ? factureTotals.tva10 * 10 : 0)}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-blue-700">
                    {formatCurrency(factureTotals.tva10)}
                  </td>
                  <td className="p-3 text-right font-mono">
                    {formatCurrency(factureTotals.tva10 > 0 ? factureTotals.tva10 * 11 : 0)}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white font-bold">
                  <td className="p-3 uppercase text-[11px]">Total TVA Collectée (Exigibilité Facturation)</td>
                  <td className="p-3 text-right font-mono">{formatCurrency(factureTotals.ht)}</td>
                  <td className="p-3 text-right font-mono text-blue-300 text-sm">
                    {formatCurrency(factureTotals.tva)}
                  </td>
                  <td className="p-3 text-right font-mono text-emerald-300">{formatCurrency(factureTotals.ttc)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 4: BALANCE AGEE CLIENTS */}
      {/* ============================================================ */}
      {activeReport === 'BALANCE_CLIENTS' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Balance Âgée des Comptes Clients & Encours Impayés
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-semibold divide-x divide-slate-800">
                  <th className="p-3">Code</th>
                  <th className="p-3">Client / Raison Sociale</th>
                  <th className="p-3">ICE</th>
                  <th className="p-3 text-center">Nbr Factures</th>
                  <th className="p-3 text-right">Total Facturé (TTC)</th>
                  <th className="p-3 text-right">Total Encaissé</th>
                  <th className="p-3 text-right">Solde Dû (Reste à Payer)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {clientBalances.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      Aucun encours client sur la période.
                    </td>
                  </tr>
                ) : (
                  clientBalances.map(({ client, count, totalTtc, totalRegle, reste }) => (
                    <tr key={client.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 font-mono font-bold text-slate-900">{client.code}</td>
                      <td className="p-3 font-medium text-slate-900">{client.nom}</td>
                      <td className="p-3 font-mono text-slate-500">{client.ice || '-'}</td>
                      <td className="p-3 text-center font-bold">{count}</td>
                      <td className="p-3 text-right font-mono font-semibold">{formatCurrency(totalTtc)}</td>
                      <td className="p-3 text-right font-mono text-emerald-700">{formatCurrency(totalRegle)}</td>
                      <td className="p-3 text-right font-mono font-black text-red-600 text-sm">
                        {formatCurrency(reste)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 5: VENTES PAR FAMILLE D'ARTICLES */}
      {/* ============================================================ */}
      {activeReport === 'GROUPES' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              Répartition des Ventes par Famille d'Articles & Prestations
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-semibold divide-x divide-slate-800">
                  <th className="p-3">Groupe / Famille</th>
                  <th className="p-3 text-right">Quantités Vendues</th>
                  <th className="p-3 text-right">Chiffre d'Affaires HT (DH)</th>
                  <th className="p-3 text-right">Part du Chiffre d'Affaires</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {salesByGroup.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400">
                      Aucune vente enregistrée sur la période.
                    </td>
                  </tr>
                ) : (
                  salesByGroup.map((item) => {
                    const pct = factureTotals.ht > 0 ? (item.totalHt / factureTotals.ht) * 100 : 0;
                    return (
                      <tr key={item.group} className="hover:bg-slate-50/80 transition">
                        <td className="p-3 font-bold text-slate-900">{item.group}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-800">
                          {item.count.toLocaleString('fr-FR')}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-blue-900 text-sm">
                          {formatCurrency(item.totalHt)}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="font-mono text-xs font-semibold text-slate-700">
                              {pct.toFixed(1)}%
                            </span>
                            <div className="w-20 bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-blue-600 h-full rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
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
      )}
    </div>
  );
};
