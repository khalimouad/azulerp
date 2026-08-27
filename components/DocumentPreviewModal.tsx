'use client';

import React from 'react';
import { Facture, BonLivraison, BonRetour, Devis, CompanyInfo } from '@/lib/types';
import { formatCurrency, formatDate, numberToFrenchWords } from '@/lib/utils';
import { generateFacturePdf, generateBlPdf, generateBrPdf, generateDevisPdf } from '@/lib/pdf-generator';
import { X, Printer, Download, FileText, Truck, RotateCcw, FileSpreadsheet } from 'lucide-react';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: 'FACTURE' | 'BL' | 'BR' | 'DEVIS';
  facture?: Facture | null;
  bl?: BonLivraison | null;
  br?: BonRetour | null;
  devis?: Devis | null;
  company: CompanyInfo;
}

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

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  documentType,
  facture,
  bl,
  br,
  devis,
  company,
}) => {
  if (!isOpen) return null;

  const doc =
    documentType === 'FACTURE'
      ? facture
      : documentType === 'BL'
      ? bl
      : documentType === 'BR'
      ? br
      : devis;
  if (!doc) return null;

  const handleDownload = () => {
    if (documentType === 'FACTURE' && facture) generateFacturePdf(facture, company);
    else if (documentType === 'BL' && bl) generateBlPdf(bl, company);
    else if (documentType === 'BR' && br) generateBrPdf(br, company);
    else if (documentType === 'DEVIS' && devis) generateDevisPdf(devis, company);
  };

  const handlePrint = () => {
    window.print();
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

  const totalHt = doc.total_ht || 0;
  const totalTtc = doc.total_ttc || 0;
  const totalTva = isFacture
    ? (doc as Facture).total_tva || 0
    : isBl
    ? (doc as BonLivraison).total_tva || 0
    : isBr
    ? (doc as BonRetour).total_tva || 0
    : (doc as Devis).total_tva || 0;

  const tva10 = isFacture
    ? (doc as Facture).tva_10 || 0
    : isBl
    ? (doc as BonLivraison).tva_10 || 0
    : 0;

  const tva20 = isFacture
    ? (doc as Facture).tva_20 || (totalTva - tva10)
    : isBl
    ? (doc as BonLivraison).tva_20 || (totalTva - tva10)
    : totalTva;

  // Address lines dynamically from company settings
  let addrLines: string[] = [];
  if (company.adresse_detail && company.adresse_detail.trim()) {
    addrLines = company.adresse_detail
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  } else {
    if (company.adresse) addrLines.push(company.adresse);
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
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 print:shadow-none print:border-none print:m-0">
        {/* Modal Toolbar */}
        <div className="bg-slate-900 text-white p-3.5 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            {isFacture && <FileText className="w-5 h-5 text-blue-400" />}
            {isBl && <Truck className="w-5 h-5 text-emerald-400" />}
            {isBr && <RotateCcw className="w-5 h-5 text-rose-400" />}
            {isDevis && <FileSpreadsheet className="w-5 h-5 text-indigo-400" />}
            <span className="font-bold text-sm">
              Aperçu {docTitle} (A5) - N° {doc.numero}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition"
            >
              <Download className="w-3.5 h-3.5" />
              Télécharger PDF
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimer sur HP-printer
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Sheet */}
        <div className="p-6 text-slate-900 font-sans max-h-[82vh] overflow-y-auto print:max-h-none print:overflow-visible space-y-4">
          {/* Header 3-columns */}
          <div className="grid grid-cols-3 gap-2 items-start pb-2">
            {/* Left */}
            <div className="text-[10.5px] leading-tight space-y-0.5 text-slate-700">
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
                <h1 className="text-xs font-extrabold text-slate-950 uppercase tracking-tight">
                  {company.nom}
                </h1>
              )}
              {addrLines.map((line, idx) => (
                <p key={idx} className="text-[10px]">
                  {line}
                </p>
              ))}
              {company.telephone && (
                <p className="text-[10px] pt-0.5">Tel : {company.telephone}</p>
              )}
              {company.email && (
                <p className="text-[10px]">E-Mail : {company.email}</p>
              )}
            </div>

            {/* Center */}
            <div className="flex flex-col items-center justify-center text-center">
              {company.logo_image && company.logo_placement === 'center' ? (
                <div className="mb-1.5 flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={company.logo_image}
                    alt="Logo Entreprise"
                    className="h-20 w-[230px] object-contain"
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
              {partnerLines.map((line, idx) => (
                <div key={idx} className="text-[8.5px] font-bold text-slate-900 leading-tight">
                  {line}
                </div>
              ))}
            </div>

            {/* Right */}
            <div className="text-[10px] leading-relaxed text-right space-y-0.5">
              {company.rc && (
                <div className="flex justify-end gap-2">
                  <span className="font-bold text-slate-800">RC :</span>
                  <span>{company.rc}</span>
                </div>
              )}
              {company.if_fiscal && (
                <div className="flex justify-end gap-2">
                  <span className="font-bold text-slate-800">IF :</span>
                  <span>{company.if_fiscal}</span>
                </div>
              )}
              {company.patente && (
                <div className="flex justify-end gap-2">
                  <span className="font-bold text-slate-800">PAT :</span>
                  <span>{company.patente}</span>
                </div>
              )}
              {company.cnss && (
                <div className="flex justify-end gap-2">
                  <span className="font-bold text-slate-800">CNSS :</span>
                  <span>{company.cnss}</span>
                </div>
              )}
              {company.ice && (
                <div className="flex justify-end gap-2">
                  <span className="font-bold text-slate-800">ICE :</span>
                  <span className="font-bold text-slate-950">{company.ice}</span>
                </div>
              )}
            </div>
          </div>

          {/* Boxes */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="border border-slate-300 rounded-lg p-2.5 bg-white space-y-0.5">
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

            <div className="border border-slate-300 rounded-lg p-2.5 bg-white space-y-0.5">
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
                  <span>Retours (-) :</span>
                  <span className="tabular-nums font-bold">{(doc as Facture).br_associes!.join(', ')}</span>
                </div>
              )}
              {isBr && (doc as BonRetour).motif && (
                <div className="flex justify-between items-center text-[9.5px] text-rose-700">
                  <span>Motif :</span>
                  <span className="truncate max-w-[120px]">{(doc as BonRetour).motif}</span>
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="text-center py-0.5">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              {docTitle}
            </h2>
          </div>

          {/* Line items Table */}
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
                          isNegativeLine ? 'bg-rose-50/70 text-rose-950' : 'hover:bg-slate-50/50'
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
                      Aucun article
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Summary & Totals */}
          <div className="grid grid-cols-2 gap-4 pt-1 items-start text-xs">
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

            <div className="space-y-1 text-right text-[10.5px]">
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

              <div className="border border-blue-500 bg-blue-50/70 rounded-md p-1.5 flex justify-between items-center text-xs font-bold text-slate-950 mt-1">
                <span>Net à payer TTC :</span>
                <span className="tabular-nums text-blue-900">{formatCurrency(totalTtc, false)} DH</span>
              </div>
            </div>
          </div>

          {/* Footer (purely from company settings) */}
          {(company.agrement_onssa || company.banque || company.rib) && (
            <div className="border border-slate-300 rounded-md py-1 px-2 text-center text-[8.5px] text-slate-600 leading-tight space-y-0.2 mt-auto mb-0">
              {company.agrement_onssa && (
                <div>Agrement ONSSA N° : {company.agrement_onssa}</div>
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
    </div>
  );
};
