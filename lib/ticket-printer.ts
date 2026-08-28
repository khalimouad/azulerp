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

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/**
 * Builds standard ESC/POS binary buffer for thermal ticket
 */
export function buildEscPosBytes(
  sale: PosSale,
  company: CompanyInfo | null,
  receiptType: 'ADDITION' | 'TICKET_FINAL' = 'TICKET_FINAL',
  paperWidth: number = 80
): Uint8Array {
  const is58mm = paperWidth === 58;
  const colWidth = is58mm ? 32 : 42;
  const divider = '-'.repeat(colWidth);

  const bytes: number[] = [];

  const addBytes = (...b: number[]) => bytes.push(...b);

  const addText = (str: string) => {
    const clean = (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // strip accents for clean ESC/POS thermal printing
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
  addBytes(0x1b, 0x40); // ESC @ (Initialize)
  addBytes(0x1b, 0x74, 0x00); // ESC t 0 (Standard PC437)

  // 2. Header: Centered & Double Size
  addBytes(0x1b, 0x61, 0x01); // ESC a 1 (Center)
  addBytes(0x1d, 0x21, 0x11); // GS ! 0x11 (Double Width & Height)
  addLine(company?.nom || 'VerdeOrto');

  addBytes(0x1d, 0x21, 0x00); // GS ! 0 (Normal size)
  if (company?.adresse) addLine(company.adresse);
  if (company?.telephone) addLine(`Tel: ${company.telephone}`);
  if (company?.ice) addLine(`ICE: ${company.ice}`);

  addLine(divider);

  // Title
  addBytes(0x1b, 0x45, 0x01); // Bold on
  addLine(receiptType === 'ADDITION' ? "NOTE D'ADDITION" : 'TICKET DE CAISSE');
  addBytes(0x1b, 0x45, 0x00); // Bold off
  addLine(sale.numero_ticket || '');
  addLine(divider);

  // Metadata: Left aligned
  addBytes(0x1b, 0x61, 0x00); // ESC a 0 (Left)
  addLine(`Date    : ${sale.date_vente || new Date().toISOString().slice(0, 10)}`);
  addLine(`Table   : ${sale.table_numero || 'Comptoir'}`);
  addLine(`Caissier: ${sale.caissier || 'Caisse'}`);
  addLine(divider);

  // Format row with label on left and amount on right
  const formatRow = (left: string, right: string) => {
    const spaces = Math.max(1, colWidth - left.length - right.length);
    return `${left}${' '.repeat(spaces)}${right}`;
  };

  // Lines
  for (const item of sale.lignes || []) {
    const qty = item.quantite || 1;
    const name = (item.produit_nom || 'Article').slice(0, colWidth - 12);
    const total = `${Number(item.total_ttc || 0).toFixed(2)} DH`;
    addLine(formatRow(`${qty}x ${name}`, total));
  }

  addLine(divider);

  // Totals
  addLine(formatRow('Total HT', `${Number(sale.total_ht || 0).toFixed(2)} DH`));
  addLine(formatRow('TVA', `${Number(sale.total_tva || 0).toFixed(2)} DH`));

  // TOTAL TTC Double Height
  addBytes(0x1d, 0x21, 0x01); // Double height
  addBytes(0x1b, 0x45, 0x01); // Bold on
  addLine(formatRow('TOTAL TTC', `${Number(sale.total_ttc || 0).toFixed(2)} DH`));
  addBytes(0x1d, 0x21, 0x00); // Normal
  addBytes(0x1b, 0x45, 0x00); // Bold off

  if (sale.montant_donne && Number(sale.montant_donne) > 0) {
    addLine(formatRow('Montant Recu', `${Number(sale.montant_donne).toFixed(2)} DH`));
    addLine(formatRow('Rendu Monnaie', `${Number(sale.montant_rendu || 0).toFixed(2)} DH`));
  }

  addLine(divider);

  // Footer
  addBytes(0x1b, 0x61, 0x01); // Center
  addLine('Merci de votre visite et a tres bientot !');
  addLine('');
  addLine('');
  addLine('');

  // Cut paper
  addBytes(0x1b, 0x64, 0x03); // Feed 3 lines
  addBytes(0x1d, 0x56, 0x41, 0x03); // Full cut (GS V A 3)

  return new Uint8Array(bytes);
}

/**
 * Builds valid binary IPP (Internet Printing Protocol) 2.0 packet
 */
function createIppPrintJobBuffer(
  printerUri: string,
  docData: Uint8Array,
  docFormat = 'application/octet-stream'
): Uint8Array {
  const chunks: number[] = [];

  // IPP version 2.0 (0x02, 0x00)
  chunks.push(0x02, 0x00);
  // Operation-Id: Print-Job (0x0002)
  chunks.push(0x00, 0x02);
  // Request-Id: 1
  chunks.push(0x00, 0x00, 0x00, 0x01);

  // Operation Attributes Tag (0x01)
  chunks.push(0x01);

  const addAttr = (tag: number, name: string, value: string) => {
    chunks.push(tag);
    chunks.push((name.length >> 8) & 0xff, name.length & 0xff);
    for (let i = 0; i < name.length; i++) chunks.push(name.charCodeAt(i));
    const valBytes = new TextEncoder().encode(value);
    chunks.push((valBytes.length >> 8) & 0xff, valBytes.length & 0xff);
    for (let i = 0; i < valBytes.length; i++) chunks.push(valBytes[i]);
  };

  addAttr(0x47, 'attributes-charset', 'utf-8');
  addAttr(0x48, 'attributes-natural-language', 'fr');
  addAttr(0x45, 'printer-uri', printerUri);
  addAttr(0x42, 'job-name', 'VerdeOrto Ticket');
  addAttr(0x49, 'document-format', docFormat);

  // End of attributes tag (0x03)
  chunks.push(0x03);

  const headerBytes = new Uint8Array(chunks);
  const combined = new Uint8Array(headerBytes.length + docData.length);
  combined.set(headerBytes, 0);
  combined.set(docData, headerBytes.length);

  return combined;
}

/**
 * Attempts direct network print to thermal printer using IPP and RAW ESC/POS streams
 * (Never sends XML or HTML tags)
 */
export async function sendNetworkPrint(
  sale: PosSale,
  company: CompanyInfo | null,
  receiptType: 'ADDITION' | 'TICKET_FINAL' = 'TICKET_FINAL'
): Promise<{ success: boolean; message?: string }> {
  const settings = getTicketPrinterSettings();
  const rawEscPos = buildEscPosBytes(sale, company, receiptType, settings.paperWidth);

  // 1. Try local server socket route (/api/printer/print)
  try {
    const res = await fetch('/api/printer/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sale, company, settings, receiptType }),
    });
    const data = await res.json();
    if (data && data.success) {
      return { success: true, message: data.message || `Ticket imprimé sur ${settings.ipAddress}` };
    }
  } catch {
    // continue to direct local network attempts
  }

  // 2. Try direct IPP Print-Job request to http://192.168.1.87:9100/ipp/print
  if (settings.ipAddress) {
    const ippPayload = createIppPrintJobBuffer(
      `ipp://${settings.ipAddress}:${settings.port || 9100}/ipp/print`,
      rawEscPos,
      'application/octet-stream'
    );

    const ippEndpoints = [
      `http://${settings.ipAddress}:${settings.port || 9100}/ipp/print`,
      `http://${settings.ipAddress}:631/printers/printer`,
      `http://${settings.ipAddress}:${settings.port || 9100}/`,
    ];

    for (const url of ippEndpoints) {
      try {
        const ctrl = new AbortController();
        const timeout = setTimeout(() => ctrl.abort(), 2000);
        await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/ipp',
            'User-Agent': 'CUPS/2.2.9 (Linux; aarch64) IPP/2.0',
          },
          body: new Blob([ippPayload as BlobPart], { type: 'application/ipp' }),
          signal: ctrl.signal,
          mode: 'no-cors',
        });
        clearTimeout(timeout);
        return { success: true, message: `Ticket envoyé à l'imprimante (${settings.ipAddress})` };
      } catch {
        // try next endpoint
      }
    }

    // 3. Try raw binary stream POST
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 2000);
      await fetch(`http://${settings.ipAddress}:${settings.port || 9100}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: new Blob([rawEscPos as BlobPart], { type: 'application/octet-stream' }),
        signal: ctrl.signal,
        mode: 'no-cors',
      });
      clearTimeout(timeout);
      return { success: true, message: `Ticket envoyé à l'imprimante (${settings.ipAddress})` };
    } catch {
      // failed
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
  receiptType: 'ADDITION' | 'TICKET_FINAL' = 'TICKET_FINAL'
): Promise<{ success: boolean; message?: string }> {
  return sendNetworkPrint(sale, company, receiptType);
}

/**
 * System / Browser Print dialog (fallback for AirPrint / Android system print dialog)
 */
export function printPosTicketBrowser(
  sale: PosSale,
  company: CompanyInfo | null,
  receiptType: 'ADDITION' | 'TICKET_FINAL' = 'TICKET_FINAL'
): boolean {
  const settings = getTicketPrinterSettings();

  const popup = window.open('', 'verdeorto-ticket', 'popup,width=460,height=720');
  if (!popup) return false;

  const rows = (sale.lignes || []).map((line) => `
    <tr>
      <td>${escapeHtml(line.quantite)} × ${escapeHtml(line.produit_nom)}</td>
      <td class="num">${Number(line.total_ttc || 0).toFixed(2)} DH</td>
    </tr>`).join('');

  popup.document.open();
  popup.document.write(`<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(sale.numero_ticket)}</title>
<style>
  @page { size: ${settings.paperWidth}mm auto; margin: 3mm; }
  * { box-sizing: border-box; font-variant-numeric: normal; }
  body { width: ${settings.paperWidth - 6}mm; margin: 0; color: #000; font: 12px/1.35 Arial, Helvetica, sans-serif; }
  h1 { margin: 0; font-size: 18px; text-align: center; font-weight: bold; }
  .center { text-align: center; } .small { font-size: 10px; }
  .rule { border-top: 1px dashed #000; margin: 7px 0; }
  .meta, table { width: 100%; border-collapse: collapse; }
  td { padding: 2px 0; vertical-align: top; }
  td:last-child { text-align: right; white-space: nowrap; }
  .num { font-family: Arial, Helvetica, sans-serif; font-variant-numeric: tabular-nums; }
  .total { font-size: 15px; font-weight: 800; border-top: 1px solid #000; padding-top: 5px; }
</style></head><body>
  <h1>${escapeHtml(company?.nom || 'VerdeOrto')}</h1>
  <div class="center small">${escapeHtml(company?.adresse || '')}<br>${escapeHtml(company?.telephone || '')}</div>
  <div class="rule"></div>
  <div class="center"><strong>${receiptType === 'ADDITION' ? 'NOTE D’ADDITION' : 'TICKET DE CAISSE'}</strong><br>${escapeHtml(sale.numero_ticket)}</div>
  <div class="rule"></div>
  <table class="meta"><tr><td>Date</td><td class="num">${escapeHtml(sale.date_vente)}</td></tr><tr><td>Table</td><td>${escapeHtml(sale.table_numero || 'Comptoir')}</td></tr><tr><td>Caissier</td><td>${escapeHtml(sale.caissier)}</td></tr></table>
  <div class="rule"></div><table>${rows}</table><div class="rule"></div>
  <table><tr><td>Total HT</td><td class="num">${Number(sale.total_ht || 0).toFixed(2)} DH</td></tr><tr><td>TVA</td><td class="num">${Number(sale.total_tva || 0).toFixed(2)} DH</td></tr><tr class="total"><td>TOTAL TTC</td><td class="num">${Number(sale.total_ttc || 0).toFixed(2)} DH</td></tr></table>
  <div class="rule"></div><div class="center small">Merci de votre visite et à très bientôt !</div>
<script>window.addEventListener('load', () => { setTimeout(() => { window.print(); window.close(); }, 180); });<\/script>
</body></html>`);
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
  receiptType: 'ADDITION' | 'TICKET_FINAL' = 'TICKET_FINAL'
): Promise<{ success: boolean; message?: string }> {
  return sendNetworkPrint(sale, company, receiptType);
}
