import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CompanyInfo, Facture, BonLivraison, BonRetour, Devis } from './types';
import { formatCurrency, formatDate, numberToFrenchWords } from './utils';

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
    if (company.adresse) addrLines.push(company.adresse);
    if (company.ville) addrLines.push(company.ville);
  }

  for (const line of addrLines) {
    doc.text(line, 8, currentY);
    currentY += 3.2;
  }
  if (company.telephone) {
    doc.text(`Tel : ${company.telephone}`, 8, currentY);
    currentY += 3.2;
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
      doc.addImage(company.logo_image, format, centerX - 14, 7, 28, 12);
    } catch (e) {
      console.warn('PDF center image rendering error:', e);
    }
  } else if (logoTitle) {
    // Vector Oval Logo Badge
    doc.setDrawColor(34, 139, 34); // Forest Green
    doc.setLineWidth(0.4);
    doc.ellipse(centerX, 13.5, 15, 6.5, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(22, 101, 52); // green-800
    doc.text(logoTitle, centerX, 13.5, { align: 'center' });

    if (logoSub) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(4.2);
      doc.setTextColor(21, 128, 61); // green-700
      doc.text(logoSub, centerX, 16.5, { align: 'center' });
    }
  }

  // Partner / Cooperative / Inspection mentions below Logo
  if (company.partenaire_coop && company.partenaire_coop.trim()) {
    const coopLines = company.partenaire_coop
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    let coopY = 23;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.2);
    doc.setTextColor(15, 23, 42);
    for (let i = 0; i < coopLines.length; i++) {
      if (i === coopLines.length - 1 && coopLines.length > 2) {
        doc.setFont('helvetica', 'normal');
      }
      doc.text(coopLines[i], centerX, coopY, { align: 'center' });
      coopY += 3;
    }
  }

  // 3. TOP RIGHT: Fiscal & Legal Identifiers (purely from company settings)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(51, 65, 85);
  const rightLabelX = 104;
  const rightValX = 140;

  const fiscalItems: { label: string; val: string }[] = [];
  if (company.rc) fiscalItems.push({ label: 'RC', val: company.rc });
  if (company.if_fiscal) fiscalItems.push({ label: 'IF', val: company.if_fiscal });
  if (company.patente) fiscalItems.push({ label: 'PAT', val: company.patente });
  if (company.cnss) fiscalItems.push({ label: 'CNSS', val: company.cnss });
  if (company.ice) fiscalItems.push({ label: 'ICE', val: company.ice });

  let fiscY = 12;
  for (const item of fiscalItems) {
    doc.setFont('helvetica', 'bold');
    doc.text(`${item.label}   :`, rightLabelX, fiscY);
    doc.setFont('helvetica', 'normal');
    doc.text(item.val, rightValX, fiscY, { align: 'right' });
    fiscY += 3.4;
  }

  // 4. MIDDLE SECTION: 2 Rounded Boxes (Client on Left, Document Details on Right)
  const boxY = 34.5;
  const boxH = 19;
  const leftBoxW = 68;
  const rightBoxW = 60;
  const rightBoxX = 80;

  // Left Box: Client info
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.3);
  doc.roundedRect(8, boxY, leftBoxW, boxH, 1.8, 1.8, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(15, 23, 42);
  doc.text(`Client : ${clientNom}`, 11, boxY + 4.5, { maxWidth: 62 });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.3);
  doc.setTextColor(71, 85, 105);

  let cY = boxY + 8.5;
  if (clientAdresse) {
    doc.text(clientAdresse, 11, cY, { maxWidth: 62 });
    cY += 3.3;
  }
  if (clientVille) {
    doc.text(clientVille.toUpperCase(), 11, cY);
    cY += 3.3;
  }
  if (clientIce) {
    doc.setFont('helvetica', 'bold');
    doc.text(`ICE : ${clientIce}`, 11, cY);
  }

  // Right Box: Document Reference
  doc.roundedRect(rightBoxX, boxY, rightBoxW, boxH, 1.8, 1.8, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(15, 23, 42);
  doc.text(`N° de ${docTypeTitle} :`, rightBoxX + 3, boxY + 5);
  doc.setFont('helvetica', 'bold');
  doc.text(docNumber, rightBoxX + rightBoxW - 3, boxY + 5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(51, 65, 85);
  doc.text('Date :', rightBoxX + 3, boxY + 9.5);
  doc.text(docDate, rightBoxX + rightBoxW - 3, boxY + 9.5, { align: 'right' });

  if (extraDetails && extraDetails.length > 0) {
    let eY = boxY + 13.5;
    for (const extra of extraDetails) {
      if (extra.isRose) {
        doc.setTextColor(225, 29, 72); // rose-600
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setTextColor(71, 85, 105);
        doc.setFont('helvetica', 'normal');
      }
      doc.setFontSize(5.8);
      doc.text(`${extra.label} :`, rightBoxX + 3, eY);
      doc.text(extra.value, rightBoxX + rightBoxW - 3, eY, { align: 'right', maxWidth: 35 });
      eY += 3.2;
    }
  }

  // 5. DOCUMENT TITLE: Centered bold text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(15, 23, 42);
  doc.text(docTypeTitle, centerX, 58.5, { align: 'center' });
}

/**
 * Draw Official Footer Banner on A5 page completely driven by parameterizable CompanyInfo
 */
function drawVerdeOrtoFooter(doc: jsPDF, company: CompanyInfo) {
  const footerY = 196;
  const footerW = 132;
  const footerH = 8.5;

  if (!company.agrement_onssa && !company.banque && !company.rib) {
    return;
  }

  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.3);
  doc.roundedRect(8, footerY, footerW, footerH, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(51, 65, 85);

  let hasOnssa = !!(company.agrement_onssa && company.agrement_onssa.trim());
  let hasBank = !!(company.banque || company.rib);

  if (hasOnssa && hasBank) {
    doc.text(`Agrement ONSSA N° : ${company.agrement_onssa}`, 74, footerY + 3.2, { align: 'center' });
    doc.text(`${company.banque ? company.banque + ' ' : ''}R.I.B : ${company.rib || ''}`, 74, footerY + 6.6, { align: 'center' });
  } else if (hasOnssa) {
    doc.text(`Agrement ONSSA N° : ${company.agrement_onssa}`, 74, footerY + 5.0, { align: 'center' });
  } else if (hasBank) {
    doc.text(`${company.banque ? company.banque + ' ' : ''}R.I.B : ${company.rib || ''}`, 74, footerY + 5.0, { align: 'center' });
  }
}

/**
 * Generate and download official A5 PDF for Facture
 */
export function generateFacturePdf(facture: Facture, company: CompanyInfo) {
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
    startY: 63,
    margin: { left: 8, right: 8 },
    theme: 'plain',
    head: [['Désignation', 'Qté.', 'P.U. HT', 'TVA', 'Remise', 'Total HT']],
    body: tableBody,
    styles: {
      fontSize: 6.5,
      cellPadding: 1.2,
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
export function generateBlPdf(bl: BonLivraison, company: CompanyInfo) {
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
    startY: 63,
    margin: { left: 8, right: 8 },
    theme: 'plain',
    head: [['Désignation', 'Qté.', 'P.U. HT', 'TVA', 'Remise', 'Total HT']],
    body: tableBody,
    styles: {
      fontSize: 6.5,
      cellPadding: 1.2,
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
export function generateBrPdf(br: BonRetour, company: CompanyInfo) {
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
    startY: 63,
    margin: { left: 8, right: 8 },
    theme: 'plain',
    head: [['Désignation', 'Qté. Retournée', 'P.U. HT', 'TVA', 'Remise', 'Total HT (-)', ]],
    body: tableBody,
    styles: {
      fontSize: 6.5,
      cellPadding: 1.2,
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
    startY: 63,
    margin: { left: 8, right: 8 },
    theme: 'plain',
    head: [['Désignation', 'Qté.', 'P.U. HT', 'TVA', 'Remise', 'Total HT']],
    body: tableBody,
    styles: {
      fontSize: 6.5,
      cellPadding: 1.2,
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
