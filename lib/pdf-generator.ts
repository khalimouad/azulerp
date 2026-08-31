import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CompanyInfo, Facture, BonLivraison, BonRetour, Devis } from './types';
import { formatCurrency, formatDate, numberToFrenchWords } from './utils';
import { getTicketPrinterSettings } from './ticket-printer';

/**
 * Format quantity display with unit matching Moroccan commercial model (e.g. "15 U", "5 KG", "1.306 KG")
 */
function formatQuantityWithUnit(qty: number, designation?: string, unit?: string): string {
  const absQty = Math.abs(qty);
  const formattedNumber = absQty.toLocaleString('fr-FR', {
    minimumFractionDigits: Number.isInteger(absQty) ? 0 : 2,
    maximumFractionDigits: 3,
  });

  // Infer unit if not provided
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

/**
 * Draw Official Header on A5 page completely driven by parameterizable CompanyInfo
 */
function drawVerdeOrtoHeader(
  doc: jsPDF,
  company: CompanyInfo,
  docTypeTitle: string,
  docNumber: string,
  docDate: string,
  clientNom: string,
  clientIce?: string,
  clientAdresse?: string,
  clientVille?: string,
  extraDetails?: { label: string; value: string; isRose?: boolean }[]
) {
  // Page Width: 148 mm, Height: 210 mm, Margins: 8 mm (printable width: 132 mm)

  // 1. TOP LEFT: Company Logo Image / Identity & Detailed Address (purely from settings)
  let currentY = 12;

  const hasLogo = Boolean(company.logo_image && company.logo_image.startsWith('data:image'));
  const isLogoLeft = hasLogo && company.logo_placement !== 'center';
  const isLogoCenter = hasLogo && company.logo_placement === 'center';

  if (isLogoLeft && company.logo_image) {
    try {
      // Determine format from data url
      let format = 'PNG';
      if (company.logo_image.includes('image/jpeg') || company.logo_image.includes('image/jpg')) format = 'JPEG';
      else if (company.logo_image.includes('image/webp')) format = 'WEBP';
      doc.addImage(company.logo_image, format, 8, 7, 26, 11);
      currentY = 20;
    } catch (e) {
      console.warn('PDF image rendering error:', e);
    }
  }

  if (!isLogoLeft || company.logo_mode !== 'logo_only') {
    if (company.nom) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(company.nom, 8, currentY);
      currentY += 4;
    }
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(51, 65, 85); // slate-700

  // Address lines
  let addrLines: string[] = [];
  if (company.adresse_detail && company.adresse_detail.trim()) {
    addrLines = company.adresse_detail
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  } else {
    if (company.adresse) {
      addrLines.push(...company.adresse.split(',').map((line) => line.trim()).filter(Boolean));
    }
    if (company.ville) addrLines.push(company.ville);
  }
  const blocLineIndex = addrLines.findIndex((line) => /^bloc\s+f$/i.test(line));
  if (blocLineIndex >= 0 && /^magasin\s+n[°ºo]?\s*20$/i.test(addrLines[blocLineIndex + 1] || '')) {
    addrLines.splice(blocLineIndex, 2, `${addrLines[blocLineIndex]}, ${addrLines[blocLineIndex + 1]}`);
  }

  for (const line of addrLines) {
    doc.text(line, 8, currentY);
    currentY += 2.8;
  }
  if (company.telephone) {
    doc.text(`Tel : ${company.telephone}`, 8, currentY);
    currentY += 2.8;
  }
  if (company.email) {
    doc.text(`E-Mail : ${company.email}`, 8, currentY);
  }

  // 2. TOP CENTER: Center Logo Image or Parameterizable Emblem / Logo & Partner mentions
  const centerX = 74;
  const logoTitle = company.logo_titre || company.nom || '';
  const logoSub = company.logo_sous_titre || '';

  if (isLogoCenter && company.logo_image) {
    try {
      let format = 'PNG';
      if (company.logo_image.includes('image/jpeg') || company.logo_image.includes('image/jpg')) format = 'JPEG';
      else if (company.logo_image.includes('image/webp')) format = 'WEBP';
      doc.addImage(company.logo_image, format, centerX - 25, 4, 50, 19);
    } catch (e) {
      console.warn('PDF center image rendering error:', e);
    }
  } else if (logoTitle) {
    // Vector Oval Logo Badge
    doc.setDrawColor(34, 139, 34); // Forest Green
    doc.setLineWidth(0.4);
    doc.ellipse(centerX, 12.5, 14, 5.8, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(22, 101, 52); // green-800
    doc.text(logoTitle, centerX, 12.5, { align: 'center' });

    if (logoSub) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(4.0);
      doc.setTextColor(21, 128, 61); // green-700
      doc.text(logoSub, centerX, 15.2, { align: 'center' });
    }
  }

  // Partner / Cooperative / Inspection mentions below Logo (centered, close to logo, no padding)
  if (company.partenaire_coop && company.partenaire_coop.trim()) {
    const coopLines = company.partenaire_coop
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    let coopY = isLogoCenter ? 21.0 : 18.0;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.0);
    doc.setTextColor(15, 23, 42);
    for (let i = 0; i < coopLines.length; i++) {
      if (i === coopLines.length - 1 && coopLines.length > 2) {
        doc.setFont('helvetica', 'normal');
      }
      doc.text(coopLines[i], centerX, coopY, { align: 'center' });
      coopY += 2.6;
    }
  }

  // 3. TOP RIGHT: Fiscal & Legal Identifiers (with smaller interligne)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.0);
  doc.setTextColor(51, 65, 85);
  const rightLabelX = 104;
  const rightValX = 140;

  const fiscalItems: { label: string; val: string }[] = [];
  if (company.rc) fiscalItems.push({ label: 'RC', val: company.rc });
  if (company.if_fiscal) fiscalItems.push({ label: 'IF', val: company.if_fiscal });
  if (company.patente) fiscalItems.push({ label: 'PAT', val: company.patente });
  if (company.cnss) fiscalItems.push({ label: 'CNSS', val: company.cnss });
  if (company.ice) fiscalItems.push({ label: 'ICE', val: company.ice });

  let fiscY = 11.5;
  for (const item of fiscalItems) {
    doc.setFont('helvetica', 'bold');
    doc.text(`${item.label}   :`, rightLabelX, fiscY);
    doc.setFont('helvetica', 'normal');
    doc.text(item.val, rightValX, fiscY, { align: 'right' });
    fiscY += 2.8;
  }

  // 4. MIDDLE SECTION: 2 Rounded Boxes (Client on Left, Document Details on Right - smaller padding & moved to top)
  const boxY = 30.5;
  const boxH = 16.5;
  const leftBoxW = 68;
  const rightBoxW = 60;
  const rightBoxX = 80;

  // Left Box: Client info (smaller padding)
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.3);
  doc.roundedRect(8, boxY, leftBoxW, boxH, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.0);
  doc.setTextColor(15, 23, 42);
  doc.text(`Client : ${clientNom}`, 10.5, boxY + 4.2, { maxWidth: 62 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.0);
  doc.setTextColor(71, 85, 105);

  let cY = boxY + 7.6;
  if (clientAdresse) {
    doc.text(clientAdresse, 10.5, cY, { maxWidth: 62 });
    cY += 2.8;
  }
  if (clientVille) {
    doc.text(clientVille.toUpperCase(), 10.5, cY);
    cY += 2.8;
  }
  if (clientIce) {
    doc.setFont('helvetica', 'bold');
    doc.text(`ICE : ${clientIce}`, 10.5, cY);
  }

  // Right Box: Document Reference (Aligned to Left)
  doc.roundedRect(rightBoxX, boxY, rightBoxW, boxH, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.0);
  doc.setTextColor(15, 23, 42);
  doc.text(`N° de ${docTypeTitle} :`, rightBoxX + 3, boxY + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.text(docNumber, rightBoxX + rightBoxW - 3, boxY + 4.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(51, 65, 85);
  doc.text('Date :', rightBoxX + 3, boxY + 8.5);
  doc.text(docDate, rightBoxX + rightBoxW - 3, boxY + 8.5, { align: 'right' });

  if (extraDetails && extraDetails.length > 0) {
    let eY = boxY + 12.0;
    for (const extra of extraDetails) {
      if (extra.isRose) {
        doc.setTextColor(225, 29, 72); // rose-600
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setTextColor(71, 85, 105);
        doc.setFont('helvetica', 'normal');
      }
      doc.setFontSize(5.5);
      doc.text(`${extra.label} :`, rightBoxX + 3, eY);
      doc.text(extra.value, rightBoxX + rightBoxW - 3, eY, { align: 'right', maxWidth: 28 });
      eY += 2.8;
    }
  }

  // 5. DOCUMENT TITLE: Centered bold text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.0);
  doc.setTextColor(15, 23, 42);
  doc.text(docTypeTitle, centerX, 52.0, { align: 'center' });
}

/**
 * Draw Official Footer Banner on A5 page completely driven by parameterizable CompanyInfo
 */
function drawVerdeOrtoFooter(doc: jsPDF, company: CompanyInfo) {
  const footerY = 200.5;
  const footerW = 132;
  const footerH = 6.8;

  if (!company.agrement_onssa && !company.banque && !company.rib) {
    return;
  }

  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.25);
  doc.roundedRect(8, footerY, footerW, footerH, 1, 1, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.4);
  doc.setTextColor(51, 65, 85);

  let hasOnssa = !!(company.agrement_onssa && company.agrement_onssa.trim());
  let hasBank = !!(company.banque || company.rib);

  if (hasOnssa && hasBank) {
    doc.text(`Agrement ONSSA N° : ${company.agrement_onssa}`, 74, footerY + 2.6, { align: 'center' });
    doc.text(`${company.banque ? company.banque + ' ' : ''}R.I.B : ${company.rib || ''}`, 74, footerY + 5.3, { align: 'center' });
  } else if (hasOnssa) {
    doc.text(`Agrement ONSSA N° : ${company.agrement_onssa}`, 74, footerY + 4.0, { align: 'center' });
  } else if (hasBank) {
    doc.text(`${company.banque ? company.banque + ' ' : ''}R.I.B : ${company.rib || ''}`, 74, footerY + 4.0, { align: 'center' });
  }
}

/**
 * Generate and download official A5 PDF for Facture
 */
function generateFacturePdfLegacy(facture: Facture, company: CompanyInfo) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5',
  });

  const extraDetails: { label: string; value: string; isRose?: boolean }[] = [];
  if (facture.bl_associes && facture.bl_associes.length > 0) {
    extraDetails.push({ label: 'BLs', value: facture.bl_associes.join(', ') });
  }
  if (facture.br_associes && facture.br_associes.length > 0) {
    extraDetails.push({ label: 'Retours (-)', value: facture.br_associes.join(', '), isRose: true });
  }

  drawVerdeOrtoHeader(
    doc,
    company,
    'Facture',
    facture.numero,
    formatDate(facture.date),
    facture.client_nom,
    facture.client_ice,
    facture.client_adresse,
    facture.client_ville,
    extraDetails
  );

  const tableBody = (facture.lignes || []).map((ligne: any) => {
    const isNegative = ligne.quantite < 0 || (ligne.total_ht && ligne.total_ht < 0);
    const designationText = isNegative
      ? `${ligne.designation} (Déduction retour -)`
      : ligne.designation;

    const displayQty = formatQuantityWithUnit(ligne.quantite, ligne.designation, ligne.unite);
    const displayPrix = formatCurrency(ligne.prix_ht, false);
    const displayTva = `${ligne.taux_tva ?? 20}`;
    const displayRemise = ligne.remise_pct ? `${ligne.remise_pct}%` : '';
    const displayTotal = isNegative
      ? `- ${formatCurrency(Math.abs(ligne.total_ht ?? ligne.quantite * ligne.prix_ht), false)}`
      : formatCurrency(ligne.total_ht ?? ligne.quantite * ligne.prix_ht, false);

    return [designationText, displayQty, displayPrix, displayTva, displayRemise, displayTotal];
  });

  autoTable(doc, {
    startY: 56,
    margin: { left: 8, right: 8 },
    theme: 'plain',
    head: [['Désignation', 'Qté.', 'P.U. HT', 'TVA', 'Remise', 'Total HT']],
    body: tableBody,
    styles: {
      fontSize: 6.5,
      cellPadding: { top: 0.8, bottom: 0.8, left: 1.0, right: 1.0 },
      textColor: [15, 23, 42],
      lineWidth: 0.15,
      lineColor: [203, 213, 225],
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      halign: 'left',
      lineWidth: 0.25,
      lineColor: [148, 163, 184],
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 50 },
      1: { halign: 'right', cellWidth: 16 },
      2: { halign: 'right', cellWidth: 18 },
      3: { halign: 'center', cellWidth: 12 },
      4: { halign: 'center', cellWidth: 14 },
      5: { halign: 'right', cellWidth: 22 },
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.row.raw) {
        const text = String((data.row.raw as any)[0] || '');
        if (text.includes('(Déduction retour -)')) {
          doc.setFillColor(255, 241, 242);
        }
      }
    },
  });

  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 3 : 135;

  // Amount in words
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(71, 85, 105);
  doc.text('Arrêter la présente Facture à la somme de :', 8, finalY + 4);

  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(6.8);
  doc.setTextColor(15, 23, 42);
  const words = `${numberToFrenchWords(facture.total_ttc || 0)}.`;
  doc.text(words.toLowerCase(), 8, finalY + 8, { maxWidth: 68 });

  // Totals Breakdown
  const rightX = 140;
  const labelX = 85;
  let totY = finalY + 3;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);

  doc.text('Total HT :', labelX, totY);
  doc.text(`${formatCurrency(facture.total_ht || 0, false)} DH`, rightX, totY, { align: 'right' });
  totY += 3.5;

  if (facture.tva_10 && facture.tva_10 > 0) {
    doc.text('Total TVA 10 % :', labelX, totY);
    doc.text(`${formatCurrency(facture.tva_10, false)} DH`, rightX, totY, { align: 'right' });
    totY += 3.5;
  }

  const tva20 = facture.tva_20 || ((facture.total_tva || 0) - (facture.tva_10 || 0));
  doc.text('Total TVA 20 % :', labelX, totY);
  doc.text(`${formatCurrency(tva20, false)} DH`, rightX, totY, { align: 'right' });
  totY += 4.5;

  // Net to pay boxed
  doc.setDrawColor(59, 130, 246);
  doc.setFillColor(239, 246, 255);
  doc.setLineWidth(0.35);
  doc.roundedRect(labelX - 2, totY - 3, rightX - labelX + 4, 6.5, 1.2, 1.2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Net à payer TTC :', labelX, totY + 1.2);
  doc.setTextColor(30, 58, 138);
  doc.text(`${formatCurrency(facture.total_ttc || 0, false)} DH`, rightX, totY + 1.2, { align: 'right' });

  drawVerdeOrtoFooter(doc, company);
  doc.save(`Facture_${facture.numero.replace(/[\/\\]/g, '_')}.pdf`);
}

/**
 * Generate and download official A5 PDF for Bon de Livraison
 */
function generateBlPdfLegacy(bl: BonLivraison, company: CompanyInfo) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5',
  });

  drawVerdeOrtoHeader(
    doc,
    company,
    'Bon de Livraison',
    bl.numero,
    formatDate(bl.date),
    bl.client_nom,
    bl.client_ice,
    bl.client_adresse,
    bl.client_ville
  );

  const tableBody = (bl.lignes || []).map((ligne: any) => {
    const displayQty = formatQuantityWithUnit(ligne.quantite, ligne.designation, ligne.unite);
    const displayPrix = formatCurrency(ligne.prix_ht, false);
    const displayTva = `${ligne.taux_tva ?? 20}`;
    const displayRemise = ligne.remise_pct ? `${ligne.remise_pct}%` : '';
    const displayTotal = formatCurrency(ligne.total_ht ?? ligne.quantite * ligne.prix_ht, false);

    return [ligne.designation, displayQty, displayPrix, displayTva, displayRemise, displayTotal];
  });

  autoTable(doc, {
    startY: 56,
    margin: { left: 8, right: 8 },
    theme: 'plain',
    head: [['Désignation', 'Qté.', 'P.U. HT', 'TVA', 'Remise', 'Total HT']],
    body: tableBody,
    styles: {
      fontSize: 6.5,
      cellPadding: { top: 0.8, bottom: 0.8, left: 1.0, right: 1.0 },
      textColor: [15, 23, 42],
      lineWidth: 0.15,
      lineColor: [203, 213, 225],
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      halign: 'left',
      lineWidth: 0.25,
      lineColor: [148, 163, 184],
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 50 },
      1: { halign: 'right', cellWidth: 16 },
      2: { halign: 'right', cellWidth: 18 },
      3: { halign: 'center', cellWidth: 12 },
      4: { halign: 'center', cellWidth: 14 },
      5: { halign: 'right', cellWidth: 22 },
    },
  });

  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 3 : 135;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(71, 85, 105);
  doc.text('Arrêter le présent Bon de Livraison à la somme de :', 8, finalY + 4);

  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(6.8);
  doc.setTextColor(15, 23, 42);
  const words = `${numberToFrenchWords(bl.total_ttc || 0)}.`;
  doc.text(words.toLowerCase(), 8, finalY + 8, { maxWidth: 68 });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(5.8);
  doc.setTextColor(100, 116, 139);
  doc.text('Reçu conforme et en bon état.', 8, finalY + 16);

  const rightX = 140;
  const labelX = 85;
  let totY = finalY + 3;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);

  doc.text('Total HT :', labelX, totY);
  doc.text(`${formatCurrency(bl.total_ht || 0, false)} DH`, rightX, totY, { align: 'right' });
  totY += 3.5;

  if (bl.tva_10 && bl.tva_10 > 0) {
    doc.text('Total TVA 10 % :', labelX, totY);
    doc.text(`${formatCurrency(bl.tva_10, false)} DH`, rightX, totY, { align: 'right' });
    totY += 3.5;
  }

  const tva20 = bl.tva_20 || ((bl.total_tva || 0) - (bl.tva_10 || 0));
  doc.text('Total TVA 20 % :', labelX, totY);
  doc.text(`${formatCurrency(tva20, false)} DH`, rightX, totY, { align: 'right' });
  totY += 4.5;

  doc.setDrawColor(59, 130, 246);
  doc.setFillColor(239, 246, 255);
  doc.setLineWidth(0.35);
  doc.roundedRect(labelX - 2, totY - 3, rightX - labelX + 4, 6.5, 1.2, 1.2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Net à payer TTC :', labelX, totY + 1.2);
  doc.setTextColor(30, 58, 138);
  doc.text(`${formatCurrency(bl.total_ttc || 0, false)} DH`, rightX, totY + 1.2, { align: 'right' });

  drawVerdeOrtoFooter(doc, company);
  doc.save(`BL_${bl.numero.replace(/[\/\\]/g, '_')}.pdf`);
}

/**
 * Generate and download official A5 PDF for Bon de Retour
 */
function generateBrPdfLegacy(br: BonRetour, company: CompanyInfo) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5',
  });

  const extraDetails: { label: string; value: string; isRose?: boolean }[] = [];
  if (br.motif) {
    extraDetails.push({ label: 'Motif', value: br.motif, isRose: true });
  }

  drawVerdeOrtoHeader(
    doc,
    company,
    'Bon de Retour',
    br.numero,
    formatDate(br.date),
    br.client_nom,
    br.client_ice,
    br.client_adresse,
    br.client_ville,
    extraDetails
  );

  const tableBody = (br.lignes || []).map((ligne: any) => {
    const displayQty = formatQuantityWithUnit(-Math.abs(ligne.quantite), ligne.designation, ligne.unite);
    const displayPrix = formatCurrency(ligne.prix_ht, false);
    const displayTva = `${ligne.taux_tva ?? 20}`;
    const displayRemise = ligne.remise_pct ? `${ligne.remise_pct}%` : '';
    const displayTotal = `- ${formatCurrency(Math.abs(ligne.total_ht ?? ligne.quantite * ligne.prix_ht), false)}`;

    return [ligne.designation, displayQty, displayPrix, displayTva, displayRemise, displayTotal];
  });

  autoTable(doc, {
    startY: 56,
    margin: { left: 8, right: 8 },
    theme: 'plain',
    head: [['Désignation', 'Qté. Retournée', 'P.U. HT', 'TVA', 'Remise', 'Total HT (-)', ]],
    body: tableBody,
    styles: {
      fontSize: 6.5,
      cellPadding: { top: 0.8, bottom: 0.8, left: 1.0, right: 1.0 },
      textColor: [190, 18, 60], // rose-700
      lineWidth: 0.15,
      lineColor: [254, 205, 211],
    },
    headStyles: {
      fillColor: [255, 241, 242],
      textColor: [159, 18, 57],
      fontStyle: 'bold',
      halign: 'left',
      lineWidth: 0.25,
      lineColor: [251, 113, 133],
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 50 },
      1: { halign: 'right', cellWidth: 16 },
      2: { halign: 'right', cellWidth: 18 },
      3: { halign: 'center', cellWidth: 12 },
      4: { halign: 'center', cellWidth: 14 },
      5: { halign: 'right', cellWidth: 22 },
    },
  });

  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 3 : 135;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(71, 85, 105);
  doc.text('Arrêter le présent Bon de Retour à la somme à déduire de :', 8, finalY + 4);

  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(6.8);
  doc.setTextColor(190, 18, 60);
  const words = `${numberToFrenchWords(br.total_ttc || 0)}.`;
  doc.text(words.toLowerCase(), 8, finalY + 8, { maxWidth: 68 });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(5.8);
  doc.setTextColor(225, 29, 72);
  doc.text('Marchandise réintégrée en stock. Déduction fin de mois.', 8, finalY + 16);

  const rightX = 140;
  const labelX = 85;
  let totY = finalY + 3;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);

  doc.text('Total HT Déduit :', labelX, totY);
  doc.text(`- ${formatCurrency(br.total_ht || 0, false)} DH`, rightX, totY, { align: 'right' });
  totY += 3.5;

  doc.text('Total TVA :', labelX, totY);
  doc.text(`- ${formatCurrency(br.total_tva || 0, false)} DH`, rightX, totY, { align: 'right' });
  totY += 4.5;

  doc.setDrawColor(225, 29, 72);
  doc.setFillColor(255, 241, 242);
  doc.setLineWidth(0.35);
  doc.roundedRect(labelX - 2, totY - 3, rightX - labelX + 4, 6.5, 1.2, 1.2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(159, 18, 57);
  doc.text('Total TTC à déduire :', labelX, totY + 1.2);
  doc.text(`- ${formatCurrency(br.total_ttc || 0, false)} DH`, rightX, totY + 1.2, { align: 'right' });

  drawVerdeOrtoFooter(doc, company);
  doc.save(`BR_${br.numero.replace(/[\/\\]/g, '_')}.pdf`);
}

/**
 * Generate and download official A5 PDF for Devis
 */
type A4CommercialDocument = Facture | BonLivraison | BonRetour;

function drawA4Identity(doc: jsPDF, company: CompanyInfo) {
  const dark: [number, number, number] = [28, 35, 43];
  doc.setTextColor(...dark);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text((company.nom || 'VERDEORTO SARL AU').toUpperCase(), 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  const address = (company.adresse_detail || company.adresse || '').split('\n').filter(Boolean);
  let leftY = 20;
  for (const line of address.slice(0, 5)) {
    doc.text(line, 14, leftY);
    leftY += 4;
  }
  if (company.ville && !address.join(' ').toLowerCase().includes(company.ville.toLowerCase())) {
    doc.text(company.ville, 14, leftY); leftY += 4;
  }
  if (company.telephone) doc.text(`Tél : ${company.telephone}`, 14, leftY + 1);
  if (company.email) doc.text(`E-Mail : ${company.email}`, 14, leftY + 6);

  const centerX = 105;
  if (company.logo_image?.startsWith('data:image')) {
    try {
      const format = company.logo_image.includes('jpeg') || company.logo_image.includes('jpg') ? 'JPEG' : company.logo_image.includes('webp') ? 'WEBP' : 'PNG';
      doc.addImage(company.logo_image, format, 65, 7, 80, 34);
    } catch { /* Text fallback below remains visible. */ }
  } else {
    doc.setDrawColor(81, 112, 53);
    doc.setFillColor(231, 238, 210);
    doc.setLineWidth(0.8);
    doc.ellipse(centerX, 23, 32, 13, 'FD');
    doc.setFont('times', 'bolditalic');
    doc.setFontSize(22);
    doc.setTextColor(44, 65, 35);
    doc.text(company.logo_titre || 'VerdeOrto', centerX, 25, { align: 'center' });
    if (company.logo_sous_titre) {
      doc.setFontSize(6.5);
      doc.text(company.logo_sous_titre, centerX, 31, { align: 'center' });
    }
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...dark);
  const fiscal = [
    ['RC', company.rc], ['IF', company.if_fiscal], ['PAT', company.patente],
    ['CNSS', company.cnss], ['ICE', company.ice],
  ].filter((item) => item[1]);
  fiscal.forEach(([label, value], index) => {
    doc.text(`${label} :`, 154, 15 + index * 4.6);
    doc.text(String(value), 196, 15 + index * 4.6, { align: 'right' });
  });

  if (company.partenaire_coop) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    const lines = company.partenaire_coop.split('\n').filter(Boolean).slice(0, 3);
    lines.forEach((line, index) => doc.text(line, 158, 39 + index * 3.5, { align: 'center' }));
    doc.setLineWidth(0.25);
    doc.line(139, 50, 178, 50);
  }
}

function generateA4CommercialPdf(document: A4CommercialDocument, company: CompanyInfo, kind: 'Facture' | 'Bon de Livraison' | 'Bon de Retour') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  drawA4Identity(doc, company);

  doc.setDrawColor(95, 104, 115);
  doc.setLineWidth(0.35);
  doc.roundedRect(14, 55, 112, 28, 3, 3, 'S');
  doc.roundedRect(133, 55, 63, 28, 3, 3, 'S');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(25, 30, 36);
  doc.text(`Client : ${document.client_nom || ''}`, 18, 62, { maxWidth: 103 });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
  let clientY = 68;
  if (document.client_adresse) { doc.text(document.client_adresse, 18, clientY, { maxWidth: 103 }); clientY += 4.5; }
  if (document.client_ville) { doc.text(document.client_ville.toUpperCase(), 18, clientY); clientY += 4.5; }
  if (document.client_ice) doc.text(`ICE : ${document.client_ice}`, 18, clientY);

  doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text(`N° de ${kind} :`, 139, 64);
  doc.text(document.numero, 191, 64, { align: 'right' });
  doc.text('Date :', 139, 72);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(document.date), 191, 72, { align: 'right' });
  if (kind === 'Bon de Retour' && (document as BonRetour).motif) {
    doc.setFontSize(7); doc.text(`Motif : ${(document as BonRetour).motif}`, 139, 78, { maxWidth: 51 });
  }

  doc.setFont('helvetica', 'normal'); doc.setFontSize(19);
  doc.text(kind, 105, 93, { align: 'center' });

  const isReturn = kind === 'Bon de Retour';
  const body = (document.lignes || []).map((line: any) => {
    const qty = isReturn ? -Math.abs(line.quantite) : line.quantite;
    const total = isReturn ? -Math.abs(line.total_ht ?? line.quantite * line.prix_ht) : (line.total_ht ?? line.quantite * line.prix_ht);
    return [
      line.designation,
      formatQuantityWithUnit(qty, line.designation, line.unite),
      formatCurrency(line.prix_ht, false),
      `${line.taux_tva ?? 20}`,
      line.remise_pct ? `${line.remise_pct}%` : '',
      formatCurrency(total, false),
    ];
  });

  autoTable(doc, {
    startY: 99, margin: { left: 14, right: 14 }, theme: 'grid',
    head: [['Désignation', 'Qté.', 'P.U. HT', 'TVA', 'Remise', 'Total HT']], body,
    styles: { fontSize: 8.4, cellPadding: 2.1, textColor: [25, 30, 36], lineColor: [150, 155, 160], lineWidth: 0.22 },
    headStyles: { fillColor: [245, 245, 242], textColor: [25, 30, 36], fontStyle: 'bold', halign: 'center', fontSize: 9.5 },
    alternateRowStyles: { fillColor: [251, 251, 249] },
    columnStyles: {
      0: { cellWidth: 75, halign: 'left' }, 1: { cellWidth: 21, halign: 'center' },
      2: { cellWidth: 24, halign: 'right' }, 3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 19, halign: 'center' }, 5: { cellWidth: 25, halign: 'right' },
    },
  });

  const finalY = Math.min(((doc as any).lastAutoTable?.finalY || 122) + 7, 220);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
  const wording = kind === 'Facture' ? 'la présente Facture' : kind === 'Bon de Livraison' ? 'le présent Bon de Livraison' : 'le présent Bon de Retour';
  doc.text(`Arrêter ${wording} à la somme de :`, 14, finalY);
  doc.setFont('helvetica', 'bold');
  doc.text(`${numberToFrenchWords(Math.abs(document.total_ttc || 0)).toLowerCase()}.`, 14, finalY + 5, { maxWidth: 92 });

  const labelX = 121, valueX = 196;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text('Total HT :', labelX, finalY); doc.setFont('helvetica', 'normal');
  doc.text(`${formatCurrency(document.total_ht || 0, false)} DH`, valueX, finalY, { align: 'right' });
  doc.setFont('helvetica', 'bold'); doc.text('Total TVA 10 % :', labelX, finalY + 6); doc.setFont('helvetica', 'normal');
  doc.text(`${formatCurrency(document.tva_10 || 0, false)} DH`, valueX, finalY + 6, { align: 'right' });
  const tva20 = document.tva_20 || ((document.total_tva || 0) - (document.tva_10 || 0));
  doc.setFont('helvetica', 'bold'); doc.text('Total TVA 20 % :', labelX, finalY + 12); doc.setFont('helvetica', 'normal');
  doc.text(`${formatCurrency(tva20, false)} DH`, valueX, finalY + 12, { align: 'right' });
  doc.setDrawColor(95, 104, 115); doc.roundedRect(119, finalY + 16, 77, 12, 3, 3, 'S');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text(isReturn ? 'Net à déduire TTC :' : 'Net à payer TTC :', 123, finalY + 23.5);
  doc.text(`${formatCurrency(document.total_ttc || 0, false)} DH`, 192, finalY + 23.5, { align: 'right' });

  if (company.agrement_onssa || company.banque || company.rib) {
    doc.setDrawColor(170, 174, 178);
    doc.rect(14, 287.5, 182, 6.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.0);
    if (company.agrement_onssa) doc.text(`Agrément ONSSA N° : ${company.agrement_onssa}`, 105, 290.5, { align: 'center' });
    if (company.banque || company.rib) doc.text(`${company.banque || ''}${company.banque && company.rib ? ' — ' : ''}${company.rib ? `R.I.B : ${company.rib}` : ''}`, 105, 293.2, { align: 'center' });
  }

  const prefix = kind === 'Facture' ? 'Facture' : kind === 'Bon de Livraison' ? 'BL' : 'BR';
  doc.save(`${prefix}_${document.numero.replace(/[\/\\]/g, '_')}.pdf`);
}

export function generateFacturePdf(facture: Facture, company: CompanyInfo) {
  if (getTicketPrinterSettings().documentPaperSize === 'A5') return generateFacturePdfLegacy(facture, company);
  generateA4CommercialPdf(facture, company, 'Facture');
}

export function generateBlPdf(bl: BonLivraison, company: CompanyInfo) {
  if (getTicketPrinterSettings().documentPaperSize === 'A5') return generateBlPdfLegacy(bl, company);
  generateA4CommercialPdf(bl, company, 'Bon de Livraison');
}

export function generateBrPdf(br: BonRetour, company: CompanyInfo) {
  if (getTicketPrinterSettings().documentPaperSize === 'A5') return generateBrPdfLegacy(br, company);
  generateA4CommercialPdf(br, company, 'Bon de Retour');
}

export function generateDevisPdf(devis: Devis, company: CompanyInfo) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5',
  });

  drawVerdeOrtoHeader(
    doc,
    company,
    'Devis',
    devis.numero,
    formatDate(devis.date),
    devis.client_nom,
    devis.client_ice,
    devis.client_adresse,
    devis.client_ville
  );

  const tableBody = (devis.lignes || []).map((ligne: any) => {
    const displayQty = formatQuantityWithUnit(ligne.quantite, ligne.designation, ligne.unite);
    const displayPrix = formatCurrency(ligne.prix_ht, false);
    const displayTva = `${ligne.taux_tva ?? 20}`;
    const displayRemise = ligne.remise_pct ? `${ligne.remise_pct}%` : '';
    const displayTotal = formatCurrency(ligne.total_ht ?? ligne.quantite * ligne.prix_ht, false);

    return [ligne.designation, displayQty, displayPrix, displayTva, displayRemise, displayTotal];
  });

  autoTable(doc, {
    startY: 56,
    margin: { left: 8, right: 8 },
    theme: 'plain',
    head: [['Désignation', 'Qté.', 'P.U. HT', 'TVA', 'Remise', 'Total HT']],
    body: tableBody,
    styles: {
      fontSize: 6.5,
      cellPadding: { top: 0.8, bottom: 0.8, left: 1.0, right: 1.0 },
      textColor: [15, 23, 42],
      lineWidth: 0.15,
      lineColor: [203, 213, 225],
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      halign: 'left',
      lineWidth: 0.25,
      lineColor: [148, 163, 184],
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 50 },
      1: { halign: 'right', cellWidth: 16 },
      2: { halign: 'right', cellWidth: 18 },
      3: { halign: 'center', cellWidth: 12 },
      4: { halign: 'center', cellWidth: 14 },
      5: { halign: 'right', cellWidth: 22 },
    },
  });

  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 3 : 135;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(71, 85, 105);
  doc.text('Arrêter le présent Devis à la somme de :', 8, finalY + 4);

  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(6.8);
  doc.setTextColor(15, 23, 42);
  const words = `${numberToFrenchWords(devis.total_ttc || 0)}.`;
  doc.text(words.toLowerCase(), 8, finalY + 8, { maxWidth: 68 });

  const rightX = 140;
  const labelX = 85;
  let totY = finalY + 3;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);

  doc.text('Total HT :', labelX, totY);
  doc.text(`${formatCurrency(devis.total_ht || 0, false)} DH`, rightX, totY, { align: 'right' });
  totY += 3.5;

  const tva20 = devis.total_tva || 0;
  doc.text('Total TVA 20 % :', labelX, totY);
  doc.text(`${formatCurrency(tva20, false)} DH`, rightX, totY, { align: 'right' });
  totY += 4.5;

  doc.setDrawColor(99, 102, 241);
  doc.setFillColor(238, 242, 255);
  doc.setLineWidth(0.35);
  doc.roundedRect(labelX - 2, totY - 3, rightX - labelX + 4, 6.5, 1.2, 1.2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Total TTC proposé :', labelX, totY + 1.2);
  doc.setTextColor(49, 46, 129);
  doc.text(`${formatCurrency(devis.total_ttc || 0, false)} DH`, rightX, totY + 1.2, { align: 'right' });

  drawVerdeOrtoFooter(doc, company);
  doc.save(`Devis_${devis.numero.replace(/[\/\\]/g, '_')}.pdf`);
}
