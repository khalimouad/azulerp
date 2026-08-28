import { CompanyInfo, PosSale } from './types';

export interface TicketPrinterSettings {
  model: string;
  ipAddress: string;
  port: number;
  gatewayIp: string;
  paperWidth: 80 | 58;
  autoPrint: boolean;
  documentPrinterName: string;
  documentPaperSize: 'A4' | 'A5';
}

export const DEFAULT_TICKET_PRINTER_SETTINGS: TicketPrinterSettings = {
  model: 'Epson TM-T20X',
  ipAddress: '192.168.1.87',
  port: 9100,
  gatewayIp: '192.168.1.1',
  paperWidth: 80,
  autoPrint: false,
  documentPrinterName: 'HP-printer',
  documentPaperSize: 'A4',
};

const STORAGE_KEY = 'verdeorto.ticket-printer.v2';
const LEGACY_STORAGE_KEY = 'verdeorto.ticket-printer.v1';

export function getTicketPrinterSettings(): TicketPrinterSettings {
  if (typeof window === 'undefined') return DEFAULT_TICKET_PRINTER_SETTINGS;
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    if (saved && saved.ipAddress) {
      return { ...DEFAULT_TICKET_PRINTER_SETTINGS, ...saved };
    }
    const legacy = JSON.parse(window.localStorage.getItem(LEGACY_STORAGE_KEY) || '{}');
    if (legacy && legacy.ipAddress && legacy.ipAddress !== '192.168.1.100') {
      return { ...DEFAULT_TICKET_PRINTER_SETTINGS, ...legacy };
    }
    return DEFAULT_TICKET_PRINTER_SETTINGS;
  } catch {
    return DEFAULT_TICKET_PRINTER_SETTINGS;
  }
}

export function saveTicketPrinterSettings(settings: TicketPrinterSettings): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function formatTicketDateTime(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(d.getTime())) {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/**
 * Builds ePOS-Print XML matching the EXACT 80mm template:
 * - Header: VERDEORTO Snack Italy (Bold/Double Height), address, phones, website, DUPLICATA
 * - Metadata: Date creation, Boutique, Ticket, Caissier
 * - 3-Col Items: QTE, * ARTICLE *, PRIX
 * - Summary: Nombre d'articles, Sous-total
 * - Total: Double-Height font
 * - Tax Breakdown: Taux TVA, Montant H.T., T.V.A
 * - Footer: NOTE, Feed & Cut
 */
function buildEposXml(
  sale: PosSale,
  company: CompanyInfo | null,
  receiptType: 'ADDITION' | 'TICKET_FINAL' | 'DUPLICATA' = 'TICKET_FINAL'
): string {
  const docTitle = receiptType === 'ADDITION' ? "NOTE D'ADDITION" : (receiptType === 'DUPLICATA' ? 'DUPLICATA' : 'TICKET DE CAISSE');
  const createdDate = formatTicketDateTime(sale.date_vente);
  const colWidth = 42;
  const divider = '------------------------------------------';

  const format3Col = (c1: string, c2: string, c3: string) => {
    const qteStr = c1.padEnd(5, ' ');
    const nameStr = c2.length > 25 ? c2.substring(0, 25) : c2.padEnd(25, ' ');
    const priceStr = c3.padStart(12, ' ');
    return `${qteStr}${nameStr}${priceStr}`;
  };

  const format2Col = (left: string, right: string) => {
    const spaces = Math.max(1, colWidth - left.length - right.length);
    return `${left}${' '.repeat(spaces)}${right}`;
  };

  let totalItemsCount = 0;
  const rowsXml = (sale.lignes || [])
    .map((l) => {
      const qty = Number(l.quantite || 1);
      totalItemsCount += qty;
      const name = escapeHtml(l.produit_nom || 'Article');
      const price = Number(l.total_ttc || 0).toFixed(2);
      return `<text align="left">${format3Col(String(qty), name, price)}&#10;</text>`;
    })
    .join('');

  const ht = Number(sale.total_ht || 0).toFixed(2);
  const tva = Number(sale.total_tva || 0).toFixed(2);
  const ttc = Number(sale.total_ttc || 0).toFixed(2);
  const taxRate = sale.tva_10 && sale.tva_10 > 0 ? '10 %' : (sale.tva_7 && sale.tva_7 > 0 ? '7 %' : '20 %');

  const formatTaxRow = (t1: string, t2: string, t3: string) => {
    return `${t1.padEnd(10, ' ')}${t2.padStart(18, ' ')}${t3.padStart(14, ' ')}`;
  };

  const boutiqueLine = format2Col('Boutique : VerdeOrto 1', `Ticket: ${sale.numero_ticket || '1'}`);

  return `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Body>
    <epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">
      <text align="center" width="2" height="2">VERDEORTO Snack Italy&#10;</text>
      <text align="center">Av al moukawama Quartier Merrodi Residence Davin&#10;</text>
      <text align="center">c1 Bloc F Mag N 20 Marrakech&#10;</text>
      <text align="center">08 08 55 11 56 / 06 62 12 34 49&#10;</text>
      <text align="center">www.verdeorto.weebly.com&#10;</text>
      <text align="center" font="font_b">${escapeHtml(docTitle)}&#10;</text>
      <text align="center">${divider}&#10;</text>
      <text align="left">Date creation : ${escapeHtml(createdDate)}&#10;</text>
      <text align="left">${escapeHtml(boutiqueLine)}&#10;</text>
      <text align="left">Caissier : ${escapeHtml(sale.caissier || 'Admin')}&#10;</text>
      <text align="center">${divider}&#10;</text>
      <text align="left">${format3Col('QTE', '* ARTICLE *', 'PRIX')}&#10;</text>
      ${rowsXml}
      <text align="center">${divider}&#10;</text>
      <text align="left">${format2Col("Nombre d'articles", `(${totalItemsCount})`)}&#10;</text>
      <text align="left">${format2Col('Sous-total', `${ht} MAD`)}&#10;</text>
      <text align="center">${divider}&#10;</text>
      <text align="left" width="2" height="2">${format2Col('Total', `${ttc} MAD`)}&#10;</text>
      <text align="center">${divider}&#10;</text>
      <text align="left">${formatTaxRow('Taux TVA', 'Montant H.T.', 'T.V.A')}&#10;</text>
      <text align="left">${formatTaxRow(taxRate, ht, tva)}&#10;</text>
      <text align="center">${divider}&#10;</text>
      <text align="center">NOTE&#10;</text>
      <feed line="4"/>
      <cut type="feed"/>
    </epos-print>
  </s:Body>
</s:Envelope>`;
}

/**
 * Builds 80mm ESC/POS binary ticket
 */
export function buildEscPosBytes(
  sale: PosSale,
  company: CompanyInfo | null,
  receiptType: 'ADDITION' | 'TICKET_FINAL' | 'DUPLICATA' = 'TICKET_FINAL',
  paperWidth: number = 80
): Uint8Array {
  const is58mm = paperWidth === 58;
  const colWidth = is58mm ? 32 : 48;
  const divider = '-'.repeat(colWidth);

  const bytes: number[] = [];
  const addBytes = (...b: number[]) => bytes.push(...b);

  const addText = (str: string) => {
    const clean = (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    for (let i = 0; i < clean.length; i++) {
      const code = clean.charCodeAt(i);
      bytes.push(code < 128 ? code : 0x20);
    }
  };

  const addLine = (str: string = '') => {
    addText(str);
    bytes.push(0x0a);
  };

  addBytes(0x1b, 0x40);
  addBytes(0x1b, 0x74, 0x00);

  addBytes(0x1b, 0x61, 0x01);
  addBytes(0x1d, 0x21, 0x11);
  addLine('VERDEORTO Snack Italy');
  addBytes(0x1d, 0x21, 0x00);

  addLine('Av al moukawama Quartier Merrodi Residence Davin');
  addLine('c1 Bloc F Mag N 20 Marrakech');
  addLine('08 08 55 11 56 / 06 62 12 34 49');
  addLine('www.verdeorto.weebly.com');
  
  const docTitle = receiptType === 'ADDITION' ? "NOTE D'ADDITION" : (receiptType === 'DUPLICATA' ? 'DUPLICATA' : 'TICKET DE CAISSE');
  addBytes(0x1b, 0x45, 0x01);
  addLine(docTitle);
  addBytes(0x1b, 0x45, 0x00);

  addLine(divider);

  addBytes(0x1b, 0x61, 0x00);
  const createdDate = formatTicketDateTime(sale.date_vente);
  addLine(`Date creation : ${createdDate}`);
  const boutiqueInfo = `Boutique : VerdeOrto 1`;
  const ticketInfo = `Ticket: ${sale.numero_ticket || '1'}`;
  const metaSpaces = Math.max(1, colWidth - boutiqueInfo.length - ticketInfo.length);
  addLine(`${boutiqueInfo}${' '.repeat(metaSpaces)}${ticketInfo}`);
  addLine(`Caissier : ${sale.caissier || 'Admin'}`);

  addLine(divider);

  const qteCol = is58mm ? 4 : 6;
  const priceCol = is58mm ? 10 : 14;
  const nameCol = colWidth - qteCol - priceCol;

  const format3Col = (c1: string, c2: string, c3: string) => {
    const qteStr = c1.padEnd(qteCol, ' ');
    const nameStr = c2.length > nameCol ? c2.substring(0, nameCol) : c2.padEnd(nameCol, ' ');
    const priceStr = c3.padStart(priceCol, ' ');
    return `${qteStr}${nameStr}${priceStr}`;
  };

  addBytes(0x1b, 0x45, 0x01);
  addLine(format3Col('QTE', '* ARTICLE *', 'PRIX'));
  addBytes(0x1b, 0x45, 0x00);

  let totalItemsCount = 0;
  const lignes = sale.lignes || [];
  for (const item of lignes) {
    const qty = Number(item.quantite || 1);
    totalItemsCount += qty;
    const name = item.produit_nom || 'Article';
    const price = Number(item.total_ttc || 0).toFixed(2);
    addLine(format3Col(String(qty), name, price));
  }

  addLine(divider);

  const format2Col = (left: string, right: string) => {
    const spaces = Math.max(1, colWidth - left.length - right.length);
    return `${left}${' '.repeat(spaces)}${right}`;
  };

  addLine(format2Col("Nombre d'articles", `(${totalItemsCount})`));
  addLine(format2Col('Sous-total', `${Number(sale.total_ht || 0).toFixed(2)} MAD`));

  addLine(divider);

  addBytes(0x1d, 0x21, 0x11);
  addBytes(0x1b, 0x45, 0x01);
  const totalLeft = 'Total';
  const totalRight = `${Number(sale.total_ttc || 0).toFixed(2)} MAD`;
  const halfCol = Math.floor(colWidth / 2);
  const totalSpaces = Math.max(1, halfCol - totalLeft.length - totalRight.length);
  addLine(`${totalLeft}${' '.repeat(totalSpaces)}${totalRight}`);
  addBytes(0x1d, 0x21, 0x00);
  addBytes(0x1b, 0x45, 0x00);

  addLine(divider);

  const taxCol1 = is58mm ? 8 : 12;
  const taxCol3 = is58mm ? 10 : 16;
  const taxCol2 = colWidth - taxCol1 - taxCol3;

  const formatTaxRow = (t1: string, t2: string, t3: string) => {
    return `${t1.padEnd(taxCol1, ' ')}${t2.padStart(taxCol2, ' ')}${t3.padStart(taxCol3, ' ')}`;
  };

  addBytes(0x1b, 0x45, 0x01);
  addLine(formatTaxRow('Taux TVA', 'Montant H.T.', 'T.V.A'));
  addBytes(0x1b, 0x45, 0x00);

  const ht = Number(sale.total_ht || 0).toFixed(2);
  const tva = Number(sale.total_tva || 0).toFixed(2);
  const taxRate = sale.tva_10 && sale.tva_10 > 0 ? '10 %' : (sale.tva_7 && sale.tva_7 > 0 ? '7 %' : '20 %');
  addLine(formatTaxRow(taxRate, ht, tva));

  addLine(divider);

  addBytes(0x1b, 0x61, 0x01);
  addBytes(0x1b, 0x45, 0x01);
  addLine('NOTE');
  addBytes(0x1b, 0x45, 0x00);

  addBytes(0x1b, 0x64, 0x03);
  addBytes(0x1d, 0x56, 0x41, 0x03);

  return new Uint8Array(bytes);
}

/**
 * Attempts direct network print to thermal printer (via API route socket & direct ePOS HTTP)
 * Completely silent, without triggering iOS/Android system printer popups or double print.
 */
export async function sendNetworkPrint(
  sale: PosSale,
  company: CompanyInfo | null,
  receiptType: 'ADDITION' | 'TICKET_FINAL' | 'DUPLICATA' = 'TICKET_FINAL'
): Promise<{ success: boolean; message?: string }> {
  const settings = getTicketPrinterSettings();

  // 1. Try local server socket route (/api/printer/print - RAW TCP port 9100)
  try {
    const res = await fetch('/api/printer/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sale, company, settings, receiptType }),
    });
    const data = await res.json();
    if (data && data.success) {
      return { success: true, message: data.message || `Ticket envoyé à l'imprimante (${settings.ipAddress})` };
    }
  } catch {
    // API route unreachable or failed
  }

  // 2. Try direct Epson ePOS XML over HTTP to printer IP
  if (settings.ipAddress) {
    const xml = buildEposXml(sale, company, receiptType);
    const endpoints = [
      `http://${settings.ipAddress}/cgi-bin/epos/service.cgi`,
      `http://${settings.ipAddress}:8008/cgi-bin/epos/service.cgi`,
      `http://${settings.ipAddress}:${settings.port || 9100}/cgi-bin/epos/service.cgi`,
    ];

    for (const url of endpoints) {
      try {
        const ctrl = new AbortController();
        const timeout = setTimeout(() => ctrl.abort(), 2000);
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/xml; charset=utf-8' },
          body: xml,
          signal: ctrl.signal,
          mode: 'no-cors',
        });
        clearTimeout(timeout);
        return { success: true, message: `Ticket envoyé à l'imprimante (${settings.ipAddress})` };
      } catch {
        // continue to next endpoint
      }
    }
  }

  return { success: false, message: `Impossible de joindre l'imprimante (${settings.ipAddress})` };
}

/**
 * Direct thermal ticket printing: sends straight to physical printer over local network (no browser popup)
 */
export async function printPosTicketDirect(
  sale: PosSale,
  company: CompanyInfo | null,
  receiptType: 'ADDITION' | 'TICKET_FINAL' | 'DUPLICATA' = 'TICKET_FINAL'
): Promise<{ success: boolean; message?: string }> {
  return sendNetworkPrint(sale, company, receiptType);
}

/**
 * System / Browser Print dialog (manual fallback)
 */
export function printPosTicketBrowser(
  sale: PosSale,
  company: CompanyInfo | null,
  receiptType: 'ADDITION' | 'TICKET_FINAL' | 'DUPLICATA' = 'TICKET_FINAL'
): boolean {
  const settings = getTicketPrinterSettings();

  const popup = window.open('', 'verdeorto-ticket', 'popup,width=460,height=720');
  if (!popup) return false;

  const docTitle = receiptType === 'ADDITION' ? "NOTE D'ADDITION" : (receiptType === 'DUPLICATA' ? 'DUPLICATA' : 'TICKET DE CAISSE');
  const createdDate = formatTicketDateTime(sale.date_vente);
  let totalItemsCount = 0;

  const rows = (sale.lignes || []).map((line) => {
    const qty = Number(line.quantite || 1);
    totalItemsCount += qty;
    return `
      <tr>
        <td style="width: 15%; text-align: left; padding: 2px 0;">${escapeHtml(qty)}</td>
        <td style="width: 55%; text-align: left; padding: 2px 0;">${escapeHtml(line.produit_nom)}</td>
        <td style="width: 30%; text-align: right; padding: 2px 0; font-family: monospace;">${Number(line.total_ttc || 0).toFixed(2)}</td>
      </tr>`;
  }).join('');

  const ht = Number(sale.total_ht || 0).toFixed(2);
  const tva = Number(sale.total_tva || 0).toFixed(2);
  const ttc = Number(sale.total_ttc || 0).toFixed(2);
  const taxRate = sale.tva_10 && sale.tva_10 > 0 ? '10 %' : (sale.tva_7 && sale.tva_7 > 0 ? '7 %' : '20 %');

  popup.document.open();
  popup.document.write(`<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Ticket - ${escapeHtml(sale.numero_ticket)}</title>
  <style>
    @page { size: ${settings.paperWidth}mm auto; margin: 2mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Courier New', Courier, monospace; }
    body { width: ${settings.paperWidth - 6}mm; margin: 0 auto; color: #000; font-size: 11px; line-height: 1.25; padding: 2px 0; }
    .center { text-align: center; }
    .right { text-align: right; }
    .left { text-align: left; }
    .bold { font-weight: bold; }
    .title-large { font-size: 15px; font-weight: bold; text-align: center; margin-bottom: 2px; }
    .divider { border-top: 1px dashed #000; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    .flex-between { display: flex; justify-content: space-between; }
    .total-row { font-size: 14px; font-weight: bold; padding: 3px 0; display: flex; justify-content: space-between; }
    .tax-table th, .tax-table td { padding: 1px 0; font-size: 10px; }
  </style>
</head>
<body>
  <div class="title-large">VERDEORTO Snack Italy</div>
  <div class="center" style="font-size: 10px;">
    Av al moukawama Quartier Merrodi Residence Davin<br>
    c1 Bloc F Mag N 20 Marrakech<br>
    08 08 55 11 56 / 06 62 12 34 49<br>
    www.verdeorto.weebly.com
  </div>
  <div class="center bold" style="margin-top: 2px;">${docTitle}</div>

  <div class="divider"></div>

  <div style="font-size: 10px;">
    <div>Date creation : ${createdDate}</div>
    <div class="flex-between">
      <span>Boutique : VerdeOrto 1</span>
      <span>Ticket: ${escapeHtml(sale.numero_ticket || '1')}</span>
    </div>
    <div>Caissier : ${escapeHtml(sale.caissier || 'Admin')}</div>
  </div>

  <div class="divider"></div>

  <table>
    <thead>
      <tr class="bold" style="border-bottom: 1px dashed #000;">
        <th style="width: 15%; text-align: left; padding-bottom: 2px;">QTE</th>
        <th style="width: 55%; text-align: left; padding-bottom: 2px;">* ARTICLE *</th>
        <th style="width: 30%; text-align: right; padding-bottom: 2px;">PRIX</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="divider"></div>

  <div class="flex-between" style="font-size: 11px;">
    <span>Nombre d'articles</span>
    <span>(${totalItemsCount})</span>
  </div>
  <div class="flex-between" style="font-size: 11px; margin-top: 2px;">
    <span>Sous-total</span>
    <span>${ht} MAD</span>
  </div>

  <div class="divider"></div>

  <div class="total-row">
    <span>Total</span>
    <span>${ttc} MAD</span>
  </div>

  <div class="divider"></div>

  <table class="tax-table">
    <thead>
      <tr class="bold">
        <th style="width: 30%; text-align: left;">Taux TVA</th>
        <th style="width: 40%; text-align: right;">Montant H.T.</th>
        <th style="width: 30%; text-align: right;">T.V.A</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="text-align: left;">${taxRate}</td>
        <td style="text-align: right;">${ht}</td>
        <td style="text-align: right;">${tva}</td>
      </tr>
    </tbody>
  </table>

  <div class="divider"></div>

  <div class="center bold" style="margin-top: 3px; font-size: 11px;">NOTE</div>

  <script>
    window.addEventListener('load', () => {
      setTimeout(() => {
        window.print();
        window.close();
      }, 200);
    });
  <\/script>
</body>
</html>`);
  popup.document.close();
  popup.focus();
  return true;
}

/**
 * Main print ticket function: sends directly to thermal printer
 */
export function printPosTicket(
  sale: PosSale,
  company: CompanyInfo | null,
  receiptType: 'ADDITION' | 'TICKET_FINAL' | 'DUPLICATA' = 'TICKET_FINAL'
): Promise<{ success: boolean; message?: string }> {
  return sendNetworkPrint(sale, company, receiptType);
}
