'use client';

import React, { useState } from 'react';
import { Facture, BonLivraison, BonRetour, Devis, CompanyInfo } from '@/lib/types';
import { formatCurrency, formatDate, numberToFrenchWords } from '@/lib/utils';
import { generateFacturePdf, generateBlPdf, generateBrPdf, generateDevisPdf } from '@/lib/pdf-generator';
import {
  ArrowLeft,
  Printer,
  Download,
  FileText,
  Truck,
  RotateCcw,
  FileSpreadsheet,
} from 'lucide-react';

interface DocumentPreviewViewProps {
  documentType: 'FACTURE' | 'BL' | 'BR' | 'DEVIS';
  facture?: Facture | null;
  bl?: BonLivraison | null;
  br?: BonRetour | null;
  devis?: Devis | null;
  company: CompanyInfo;
  onBack: () => void;
}

/**
 * Format quantity display with unit (e.g. "15 U", "5 KG", "1.306 KG")
 */
function formatDisplayQuantity(qty: number, designation?: string, unit?: string): string {
  const absQty = Math.abs(qty);
  const formattedNumber = absQty.toLocaleString('fr-FR', {
    minimumFractionDigits: Number.isInteger(absQty) ? 0 : 2,
    maximumFractionDigits: 3,
  });

  let u = unit?.trim().toUpperCase() || '';
  if (!u && designation) {
    const desUpper = designation.toUpperCase();
    if (desUpper.includes('KG') || desUpper.includes('KILO')) u = 'KG';
    else if (desUpper.includes('PACK') || desUpper.includes('PK') || desUpper.includes('BOITE')) u = 'PK';
    else if (desUpper.includes('LITRE') || desUpper.includes(' 1L') || desUpper.includes(' 5L')) u = 'L';
    else u = 'U';
  }
  if (!u) u = 'U';

  const prefix = qty < 0 ? '-' : '';
  return `${prefix}${formattedNumber} ${u}`.trim();
}

export const DocumentPreviewView: React.FC<DocumentPreviewViewProps> = ({
  documentType,
  facture,
  bl,
  br,
  devis,
  company,
  onBack,
}) => {
  const [pageSize, setPageSize] = useState<'A5' | 'A4'>('A5');

  const doc =
    documentType === 'FACTURE'
      ? facture
      : documentType === 'BL'
      ? bl
      : documentType === 'BR'
      ? br
      : devis;

  if (!doc) {
    return (
      <div className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-3">
        <p className="text-slate-500 text-sm">Aucun document sélectionné pour l'aperçu.</p>
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold"
        >
          ← Revenir en arrière
        </button>
      </div>
    );
  }

  const handleDownload = () => {
    if (documentType === 'FACTURE' && facture) generateFacturePdf(facture, company);
    else if (documentType === 'BL' && bl) generateBlPdf(bl, company);
    else if (documentType === 'BR' && br) generateBrPdf(br, company);
    else if (documentType === 'DEVIS' && devis) generateDevisPdf(devis, company);
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    const cleanup = () => {
      document.body.classList.remove('printing-document');
      document.title = originalTitle;
    };
    document.body.classList.add('printing-document');
    document.title = '';
    window.addEventListener('afterprint', cleanup, { once: true });
    window.print();
    window.setTimeout(cleanup, 1500);
  };

  const isFacture = documentType === 'FACTURE';
  const isBl = documentType === 'BL';
  const isBr = documentType === 'BR';
  const isDevis = documentType === 'DEVIS';

  const docTitle = isFacture
    ? 'Facture'
    : isBl
    ? 'Bon de Livraison'
    : isBr
    ? 'Bon de Retour'
    : 'Devis';

  const returnLabel = isFacture
    ? 'Retour aux Factures'
    : isBl
    ? 'Retour aux Bons de Livraison'
    : isBr
    ? 'Retour aux Bons de Retour'
    : 'Retour aux Devis';

  const totalHt = Number(doc.total_ht || 0);
  const totalTtc = Number(doc.total_ttc || 0);
  const totalTva = isFacture
    ? Number((doc as Facture).total_tva || 0)
    : isBl
    ? Number((doc as BonLivraison).total_tva || 0)
    : isBr
    ? Number((doc as BonRetour).total_tva || 0)
    : Number((doc as Devis).total_tva || 0);

  const tva10 = isFacture
    ? Number((doc as Facture).tva_10 || 0)
    : isBl
    ? Number((doc as BonLivraison).tva_10 || 0)
    : 0;

  const tva20 = isFacture
    ? Number((doc as Facture).tva_20 || (totalTva - tva10))
    : isBl
    ? Number((doc as BonLivraison).tva_20 || (totalTva - tva10))
    : totalTva;

  // Address lines dynamically from company settings
  let addrLines: string[] = [];
  if (company.adresse_detail && company.adresse_detail.trim()) {
    addrLines = company.adresse_detail
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  } else {
    if (company.adresse) {
      addrLines.push(
        ...company.adresse.split(',').map((line) => line.trim()).filter(Boolean)
      );
    }
    if (company.ville) addrLines.push(company.ville);
  }
  const blocLineIndex = addrLines.findIndex((line) => /^bloc\s+f$/i.test(line));
  if (blocLineIndex >= 0 && /^magasin\s+n[°ºo]?\s*20$/i.test(addrLines[blocLineIndex + 1] || '')) {
    addrLines.splice(blocLineIndex, 2, `${addrLines[blocLineIndex]}, ${addrLines[blocLineIndex + 1]}`);
  }

  // Partner / coop lines
  const partnerLines = (company.partenaire_coop || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const logoTitle = company.logo_titre || company.nom || '';
  const logoSub = company.logo_sous_titre || '';

  return (
    <div className="print-document-root space-y-4 animate-in fade-in duration-200">
      <style media="print">{`@page { size: ${pageSize}; margin: 8mm; }`}</style>
      {/* Top Action & Navigation Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            id="back-from-preview-btn"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{returnLabel}</span>
          </button>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2">
            {isFacture && <FileText className="w-5 h-5 text-blue-600" />}
            {isBl && <Truck className="w-5 h-5 text-emerald-600" />}
            {isBr && <RotateCcw className="w-5 h-5 text-rose-600" />}
            {isDevis && <FileSpreadsheet className="w-5 h-5 text-indigo-600" />}
            <span className="font-extrabold text-sm text-slate-900">
              Aperçu & Impression : {docTitle} N° {doc.numero}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Format selector */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold text-slate-700 border border-slate-200">
            <button
              type="button"
              onClick={() => setPageSize('A5')}
              className={`px-2.5 py-1.5 rounded-md transition ${
                pageSize === 'A5' ? 'bg-white shadow-xs text-blue-700 font-bold' : 'hover:text-slate-900'
              }`}
            >
              Format A5
            </button>
            <button
              type="button"
              onClick={() => setPageSize('A4')}
              className={`px-2.5 py-1.5 rounded-md transition ${
                pageSize === 'A4' ? 'bg-white shadow-xs text-blue-700 font-bold' : 'hover:text-slate-900'
              }`}
            >
              Format A4
            </button>
          </div>

          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Télécharger PDF</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition active:scale-95"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimer sur HP-printer</span>
          </button>
        </div>
      </div>

      {/* Official Sheet Presentation */}
      <div
        data-page-size={pageSize}
        className={`print-document-sheet bg-white rounded-xl border border-slate-300 shadow-md p-6 sm:p-8 text-slate-950 mx-auto flex flex-col gap-4 [font-family:Arial,Helvetica,sans-serif] print:border-none print:shadow-none print:p-0 print:m-0 print:gap-3 ${
          pageSize === 'A5' ? 'max-w-2xl min-h-[930px]' : 'max-w-4xl min-h-[1220px]'
        }`}
      >
        {/* 1. TOP HEADER (3 Columns: Company Info / Logo, Emblem Logo, Legal Details) */}
        <div className="grid grid-cols-[33%_37%_30%] gap-2 items-start pb-1">
          {/* Left: Company Logo / Name & address */}
          <div className="text-[10.5px] leading-[1.2] space-y-0.5 text-slate-950 font-semibold text-left">
            {company.logo_image && company.logo_placement !== 'center' ? (
              <div className="mb-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={company.logo_image}
                  alt="Logo Entreprise"
                  className="max-h-12 max-w-[130px] object-contain"
                />
                {company.logo_mode === 'both' && company.nom && (
                  <h1 className="text-xs font-extrabold text-slate-950 uppercase tracking-tight mt-1">
                    {company.nom}
                  </h1>
                )}
              </div>
            ) : (
              <h1 className="text-[13px] font-black text-slate-950 uppercase tracking-wide border-t border-slate-500 pt-1">
                {company.nom}
              </h1>
            )}
            {addrLines.map((line, idx) => (
              <p key={idx} className="text-[10.5px] font-semibold">
                {line}
              </p>
            ))}
            {company.telephone && (
              <p className="text-[10.5px] font-bold pt-1 text-center">Tel : {company.telephone}</p>
            )}
            {company.email && (
              <p className="text-[10.5px] font-bold text-center">E-Mail : {company.email}</p>
            )}
          </div>

          {/* Center: Logo Emblem / Center Image & Mentions */}
          <div className="flex flex-col items-center justify-center text-center -mt-2">
            {company.logo_image && company.logo_placement === 'center' ? (
              <div className="flex w-full justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={company.logo_image}
                  alt="Logo Entreprise"
                  className="h-28 w-full max-w-[310px] object-contain"
                />
              </div>
            ) : (
              logoTitle && (
                <div className="border-2 border-emerald-700 rounded-full px-4 py-1.5 bg-emerald-50/40 shadow-xs mb-1.5 inline-flex flex-col items-center">
                  <div className="text-xs font-extrabold text-emerald-800 tracking-wide">
                    {logoTitle}
                  </div>
                  {logoSub && (
                    <div className="text-[7.5px] italic text-emerald-700 font-medium -mt-0.5">
                      {logoSub}
                    </div>
                  )}
                </div>
              )
            )}
            <div className="w-full -mt-2 pr-2 text-right">
              {partnerLines.map((line, idx) => (
                <div key={idx} className="text-[8.5px] font-black text-slate-950 leading-tight uppercase">
                  {line}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Legal & Fiscal Identifiers */}
          <div className="min-w-0 text-[10px] leading-relaxed text-left font-semibold space-y-0.5 pl-1">
            {company.rc && (
              <div className="grid grid-cols-[38px_minmax(0,1fr)] gap-1">
                <span className="font-bold text-slate-800">RC :</span>
                <span>{company.rc}</span>
              </div>
            )}
            {company.if_fiscal && (
              <div className="grid grid-cols-[38px_minmax(0,1fr)] gap-1">
                <span className="font-bold text-slate-800">IF :</span>
                <span>{company.if_fiscal}</span>
              </div>
            )}
            {company.patente && (
              <div className="grid grid-cols-[38px_minmax(0,1fr)] gap-1">
                <span className="font-bold text-slate-800">PAT :</span>
                <span>{company.patente}</span>
              </div>
            )}
            {company.cnss && (
              <div className="grid grid-cols-[38px_minmax(0,1fr)] gap-1">
                <span className="font-bold text-slate-800">CNSS :</span>
                <span>{company.cnss}</span>
              </div>
            )}
            {company.ice && (
              <div className="grid grid-cols-[38px_minmax(0,1fr)] gap-1">
                <span className="font-bold text-slate-800">ICE :</span>
                <span className="whitespace-nowrap text-[9.5px] tracking-[-0.025em] font-bold text-slate-950">{company.ice}</span>
              </div>
            )}
          </div>
        </div>

        {/* 2. MIDDLE BOXES (Client on Left, Document Details on Right) */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          {/* Left Box: Client info */}
          <div className="border border-slate-400 rounded-xl p-3 bg-slate-100/80 space-y-0.5 min-h-24">
            <div className="font-bold text-slate-900 text-[11px]">
              Client : {doc.client_nom}
            </div>
            {doc.client_adresse && (
              <div className="text-slate-600 text-[10px]">{doc.client_adresse}</div>
            )}
            {doc.client_ville && (
              <div className="text-slate-600 text-[10px] uppercase">{doc.client_ville}</div>
            )}
            {doc.client_ice && (
              <div className="text-slate-800 text-[10px] font-semibold pt-0.5">
                ICE : {doc.client_ice}
              </div>
            )}
          </div>

          {/* Right Box: Document Reference */}
          <div className="border border-slate-400 rounded-xl p-3 bg-slate-100/80 space-y-1 min-h-24">
            <div className="flex justify-between items-center text-[11px]">
              <span className="font-bold text-slate-900">N° de {docTitle} :</span>
              <span className="font-bold tabular-nums text-slate-950">{doc.numero}</span>
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-700">
              <span>Date :</span>
              <span>{formatDate(doc.date)}</span>
            </div>
            {isFacture && (doc as Facture).bl_associes && (doc as Facture).bl_associes!.length > 0 && (
              <div className="flex justify-between items-center text-[9.5px] text-slate-600">
                <span>BLs liés :</span>
                <span className="tabular-nums">{(doc as Facture).bl_associes!.join(', ')}</span>
              </div>
            )}
            {isFacture && (doc as Facture).br_associes && (doc as Facture).br_associes!.length > 0 && (
              <div className="flex justify-between items-center text-[9.5px] text-rose-700 font-medium">
                <span>Retours déduits (-) :</span>
                <span className="tabular-nums font-bold">{(doc as Facture).br_associes!.join(', ')}</span>
              </div>
            )}
            {isBr && (doc as BonRetour).motif && (
              <div className="flex justify-between items-center text-[9.5px] text-rose-700">
                <span>Motif :</span>
                <span className="truncate max-w-[140px]">{(doc as BonRetour).motif}</span>
              </div>
            )}
          </div>
        </div>

        {/* 3. DOCUMENT TITLE */}
        <div className="text-center py-1">
          <h2 className="text-2xl font-normal text-slate-950 tracking-tight">
            {docTitle}
          </h2>
        </div>

        {/* 4. LINE ITEMS TABLE */}
        <div className="border border-slate-300 rounded-md overflow-hidden">
          <table className="w-full text-left text-[10.5px] border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-900 font-bold divide-x divide-slate-300 border-b border-slate-300">
                <th className="p-1.5 text-left">Désignation</th>
                <th className="p-1.5 w-16 text-right">Qté.</th>
                <th className="p-1.5 w-20 text-right">P.U. HT</th>
                <th className="p-1.5 w-12 text-center">TVA</th>
                <th className="p-1.5 w-14 text-center">Remise</th>
                <th className="p-1.5 w-24 text-right">Total HT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {doc.lignes && doc.lignes.length > 0 ? (
                doc.lignes.map((l: any, index: number) => {
                  const isNegativeLine = l.quantite < 0 || (l.total_ht && l.total_ht < 0);
                  return (
                    <tr
                      key={index}
                      className={`divide-x divide-slate-200 ${
                        isNegativeLine
                          ? 'bg-rose-50/70 text-rose-950'
                          : 'hover:bg-slate-50/50'
                      }`}
                    >
                      <td className="p-1.5 font-normal">
                        {l.designation}
                        {isNegativeLine && (
                          <span className="ml-1.5 px-1 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-700">
                            (Déduction retour -)
                          </span>
                        )}
                      </td>
                      <td className="p-1.5 text-right tabular-nums font-medium">
                        {formatDisplayQuantity(
                          isBr ? -Math.abs(l.quantite) : l.quantite,
                          l.designation,
                          l.unite
                        )}
                      </td>
                      <td className="p-1.5 text-right tabular-nums">{formatCurrency(l.prix_ht, false)}</td>
                      <td className="p-1.5 text-center tabular-nums">{l.taux_tva ?? 20}</td>
                      <td className="p-1.5 text-center tabular-nums">
                        {l.remise_pct ? `${l.remise_pct}%` : ''}
                      </td>
                      <td
                        className={`p-1.5 text-right tabular-nums font-bold ${
                          isNegativeLine || isBr ? 'text-rose-700' : 'text-slate-900'
                        }`}
                      >
                        {isNegativeLine || isBr
                          ? `- ${formatCurrency(Math.abs(l.total_ht ?? l.quantite * l.prix_ht), false)}`
                          : formatCurrency(l.total_ht ?? l.quantite * l.prix_ht, false)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-3 text-center text-slate-400">
                    Aucun article dans ce document
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 5. SUMMARY & TOTALS */}
        <div className="grid grid-cols-2 gap-4 pt-1 items-start text-xs">
          {/* Left: Total in words & Receipt notes */}
          <div className="space-y-1">
            <div className="text-[10px] text-slate-600">
              Arrêter la présente {docTitle} à la somme de :
            </div>
            <div className="text-[10px] font-bold italic text-slate-900 leading-snug lowercase">
              {numberToFrenchWords(totalTtc)}.
            </div>
            {isBl && (
              <div className="text-[9px] text-slate-500 italic pt-2">
                Reçu conforme et en bon état.
              </div>
            )}
            {isBr && (
              <div className="text-[9px] text-rose-700 italic pt-2">
                Marchandise retournée réintégrée en stock. Déduction fin de mois.
              </div>
            )}
          </div>

          {/* Right: Numerical Breakdown */}
          <div className="space-y-1 text-right text-[10.5px] bg-slate-100 rounded-lg p-2.5">
            <div className="flex justify-between text-slate-700">
              <span>Total HT :</span>
              <span className="tabular-nums font-semibold">{formatCurrency(totalHt, false)} DH</span>
            </div>
            {tva10 > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Total TVA 10 % :</span>
                <span className="tabular-nums">{formatCurrency(tva10, false)} DH</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Total TVA 20 % :</span>
              <span className="tabular-nums">{formatCurrency(tva20, false)} DH</span>
            </div>

            {/* Net à payer box */}
            <div className="border border-slate-500 bg-slate-200/80 rounded-lg p-2 flex justify-between items-center text-xs font-black text-slate-950 mt-1">
              <span>Net à payer TTC :</span>
              <span className="tabular-nums">{formatCurrency(totalTtc, false)} DH</span>
            </div>
          </div>
        </div>

        {/* 6. BOTTOM FOOTER BANNER (purely from company settings) */}
        {(company.agrement_onssa || company.banque || company.rib) && (
          <div className="border border-slate-400 rounded-sm py-1 px-2 text-center text-[9px] font-semibold text-slate-800 leading-tight space-y-0.2 mt-auto mb-0">
            {company.agrement_onssa && (
              <div>Agrément ONSSA N° : {company.agrement_onssa}</div>
            )}
            {(company.banque || company.rib) && (
              <div>
                {company.banque ? `${company.banque} ` : ''}R.I.B :{' '}
                {company.rib || '—'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
