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
 * Builds pure binary 80mm ESC/POS ticket (NO XML, NO HTML) with exact layout:
 * - Header: VERDEORTO Snack Italy (Bold / Double-Height), address, phones, website, DUPLICATA
 * - Metadata: Date creation, Boutique, Ticket, Caissier
 * - 3-Col Items: QTE, * ARTICLE *, PRIX
 * - Summary: Nombre d'articles, Sous-total
 * - Total: Double-Height font
 * - Tax Breakdown: Taux TVA, Montant H.T., T.V.A
 * - Footer: NOTE, blank line feeds & Universal Cut commands
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
      .replace(/[\u0300-\u036f]/g, ''); // strip accents for ESC/POS ASCII
    for (let i = 0; i < clean.length; i++) {
      const code = clean.charCodeAt(i);
      bytes.push(code < 128 ? code : 0x20);
    }
  };

  const addLine = (str: string = '') => {
    addText(str);
    bytes.push(0x0a); // LF
  };

  // 1. Initialize printer
  addBytes(0x1b, 0x40); // ESC @
  addBytes(0x1b, 0x74, 0x00); // ESC t 0 (PC437)

  // 2. HEADER - Center Aligned
  addBytes(0x1b, 0x61, 0x01); // Center
  addBytes(0x1d, 0x21, 0x11); // GS ! 0x11 (Double Width & Height Bold)
  addLine('VERDEORTO Snack Italy');
  addBytes(0x1d, 0x21, 0x00); // Normal font

  addLine('Av al moukawama Quartier Merrodi Residence Davin');
  addLine('c1 Bloc F Mag N 20 Marrakech');
  addLine('08 08 55 11 56 / 06 62 12 34 49');
  addLine('www.verdeorto.weebly.com');
  
  const docTitle = receiptType === 'ADDITION' ? "NOTE D'ADDITION" : (receiptType === 'DUPLICATA' ? 'DUPLICATA' : 'TICKET DE CAISSE');
  addBytes(0x1b, 0x45, 0x01); // Bold
  addLine(docTitle);
  addBytes(0x1b, 0x45, 0x00); // Bold off

  addLine(divider);

  // 3. METADATA - Left Aligned
  addBytes(0x1b, 0x61, 0x00); // Left
  const createdDate = formatTicketDateTime(sale.date_vente);
  addLine(`Date creation : ${createdDate}`);
  const boutiqueInfo = `Boutique : VerdeOrto 1`;
  const ticketInfo = `Ticket: ${sale.numero_ticket || '1'}`;
  const metaSpaces = Math.max(1, colWidth - boutiqueInfo.length - ticketInfo.length);
  addLine(`${boutiqueInfo}${' '.repeat(metaSpaces)}${ticketInfo}`);
  addLine(`Caissier : ${sale.caissier || 'Admin'}`);

  addLine(divider);

  // 4. ITEMS TABLE - 3 Columns: QTE (Left), * ARTICLE * (Center), PRIX (Right)
  const qteCol = is58mm ? 4 : 6;
  const priceCol = is58mm ? 10 : 14;
  const nameCol = colWidth - qteCol - priceCol;

  const format3Col = (c1: string, c2: string, c3: string) => {
    const qteStr = c1.padEnd(qteCol, ' ');
    const nameStr = c2.length > nameCol ? c2.substring(0, nameCol) : c2.padEnd(nameCol, ' ');
    const priceStr = c3.padStart(priceCol, ' ');
    return `${qteStr}${nameStr}${priceStr}`;
  };

  addBytes(0x1b, 0x45, 0x01); // Bold table header
  addLine(format3Col('QTE', '* ARTICLE *', 'PRIX'));
  addBytes(0x1b, 0x45, 0x00); // Bold off

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

  // 5. SUMMARY - Left & Right Aligned
  const format2Col = (left: string, right: string) => {
    const spaces = Math.max(1, colWidth - left.length - right.length);
    return `${left}${' '.repeat(spaces)}${right}`;
  };

  addLine(format2Col("Nombre d'articles", `(${totalItemsCount})`));
  addLine(format2Col('Sous-total', `${Number(sale.total_ht || 0).toFixed(2)} MAD`));

  addLine(divider);

  // 6. TOTAL - Large / Double-Height Font
  addBytes(0x1d, 0x21, 0x11); // Double Height & Width
  addBytes(0x1b, 0x45, 0x01); // Bold
  const totalLeft = 'Total';
  const totalRight = `${Number(sale.total_ttc || 0).toFixed(2)} MAD`;
  const halfCol = Math.floor(colWidth / 2);
  const totalSpaces = Math.max(1, halfCol - totalLeft.length - totalRight.length);
  addLine(`${totalLeft}${' '.repeat(totalSpaces)}${totalRight}`);
  addBytes(0x1d, 0x21, 0x00); // Normal
  addBytes(0x1b, 0x45, 0x00); // Bold off

  addLine(divider);

  // 7. TAX BREAKDOWN - 3 Columns
  const taxCol1 = is58mm ? 8 : 12;
  const taxCol3 = is58mm ? 10 : 16;
  const taxCol2 = colWidth - taxCol1 - taxCol3;

  const formatTaxRow = (t1: string, t2: string, t3: string) => {
    return `${t1.padEnd(taxCol1, ' ')}${t2.padStart(taxCol2, ' ')}${t3.padStart(taxCol3, ' ')}`;
  };

  addBytes(0x1b, 0x45, 0x01); // Bold
  addLine(formatTaxRow('Taux TVA', 'Montant H.T.', 'T.V.A'));
  addBytes(0x1b, 0x45, 0x00); // Bold off

  const ht = Number(sale.total_ht || 0).toFixed(2);
  const tva = Number(sale.total_tva || 0).toFixed(2);
  const taxRate = sale.tva_10 && sale.tva_10 > 0 ? '10 %' : (sale.tva_7 && sale.tva_7 > 0 ? '7 %' : '20 %');
  addLine(formatTaxRow(taxRate, ht, tva));

  addLine(divider);

  // 8. FOOTER - Center Aligned & Condensed
  addBytes(0x1b, 0x61, 0x01); // Center
  addBytes(0x1b, 0x45, 0x01); // Bold
  addLine('NOTE');
  addBytes(0x1b, 0x45, 0x00); // Bold off

  // 9. Feed lines past printhead & Universal Cut commands
  addBytes(0x0a, 0x0a, 0x0a, 0x0a); // 4 blank lines
  addBytes(0x1b, 0x64, 0x04);       // ESC d 4
  addBytes(0x1d, 0x56, 0x41, 0x00); // GS V 65 0 (Full Cut)
  addBytes(0x1d, 0x56, 0x00);       // GS V 0 (Standard Full Cut)
  addBytes(0x1b, 0x69);             // ESC i (Full Cut)
  addBytes(0x1b, 0x6d);             // ESC m (Partial Cut)

  return new Uint8Array(bytes);
}

/**
 * Direct silent network print to thermal printer using pure ESC/POS binary data
 * (Never sends XML tags, HTML tags, or creates popup dialogs)
 */
export async function sendNetworkPrint(
  sale: PosSale,
  company: CompanyInfo | null,
  receiptType: 'ADDITION' | 'TICKET_FINAL' | 'DUPLICATA' = 'TICKET_FINAL'
): Promise<{ success: boolean; message?: string }> {
  const settings = getTicketPrinterSettings();
  const rawBytes = buildEscPosBytes(sale, company, receiptType, settings.paperWidth);

  // 1. Try local server socket route (/api/printer/print - RAW TCP port 9100)
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1200);
    const res = await fetch('/api/printer/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sale, company, settings, receiptType }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const data = await res.json();
    if (data && data.success) {
      return { success: true, message: data.message || `Ticket envoyé à l'imprimante (${settings.ipAddress})` };
    }
  } catch {
    // API route unreachable or running on Vercel cloud
  }

  // 2. Direct pure binary stream to local printer IP / port 9100 (NO XML, NO HTML)
  if (settings.ipAddress) {
    const blob = new Blob([rawBytes as any], { type: 'application/octet-stream' });
    const targetUrls = [
      `http://${settings.ipAddress}:${settings.port || 9100}/`,
      `http://${settings.ipAddress}:${settings.port || 9100}/ipp/print`,
      `http://${settings.ipAddress}/`,
    ];

    for (const url of targetUrls) {
      try {
        const ctrl = new AbortController();
        const timeout = setTimeout(() => ctrl.abort(), 2000);
        await fetch(url, {
          method: 'POST',
          body: blob,
          signal: ctrl.signal,
          mode: 'no-cors',
        });
        clearTimeout(timeout);
        return { success: true, message: `Ticket envoyé à l'imprimante (${settings.ipAddress})` };
      } catch {
        // try next target
      }
    }
  }

  return { success: false, message: `Impossible de joindre l'imprimante (${settings.ipAddress})` };
}

/**
 * Direct thermal ticket printing
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
