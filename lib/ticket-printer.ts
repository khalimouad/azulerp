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
    // Check legacy storage
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
 * Builds ePOS-Print XML for direct Epson printer communication over HTTP
 */
function buildEposXml(sale: PosSale, company: CompanyInfo | null, receiptType: string): string {
  const isAddition = receiptType === 'ADDITION';
  const rowsXml = (sale.lignes || [])
    .map(
      (line) =>
        `<text>${escapeHtml(line.quantite)}x ${escapeHtml(line.produit_nom)}&#10;</text>` +
        `<text align="right">${Number(line.total_ttc || 0).toFixed(2)} DH&#10;</text>`
    )
    .join('');

  return `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Body>
    <epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">
      <text align="center" width="2" height="2">${escapeHtml(company?.nom || 'VerdeOrto')}&#10;</text>
      <text align="center">${escapeHtml(company?.adresse || '')}&#10;</text>
      <text align="center">Tel: ${escapeHtml(company?.telephone || '')}&#10;</text>
      <text>------------------------------------------&#10;</text>
      <text align="center" font="font_b">${isAddition ? "NOTE D'ADDITION" : 'TICKET DE CAISSE'}&#10;</text>
      <text align="center">${escapeHtml(sale.numero_ticket)}&#10;</text>
      <text>------------------------------------------&#10;</text>
      <text align="left">Date: ${escapeHtml(sale.date_vente)}  Table: ${escapeHtml(sale.table_numero || 'Comptoir')}&#10;</text>
      <text align="left">Caissier: ${escapeHtml(sale.caissier)}&#10;</text>
      <text>------------------------------------------&#10;</text>
      ${rowsXml}
      <text>------------------------------------------&#10;</text>
      <text align="left">Total HT :&#10;</text>
      <text align="right">${Number(sale.total_ht || 0).toFixed(2)} DH&#10;</text>
      <text align="left">TVA :&#10;</text>
      <text align="right">${Number(sale.total_tva || 0).toFixed(2)} DH&#10;</text>
      <text align="left" width="2" height="2">TOTAL TTC :&#10;</text>
      <text align="right" width="2" height="2">${Number(sale.total_ttc || 0).toFixed(2)} DH&#10;</text>
      <text>------------------------------------------&#10;</text>
      <text align="center">Merci de votre visite et a tres bientot !&#10;</text>
      <feed line="4"/>
      <cut type="feed"/>
    </epos-print>
  </s:Body>
</s:Envelope>`;
}

/**
 * Attempts direct network print to thermal printer (via API route socket & direct ePOS HTTP)
 */
export async function sendNetworkPrint(
  sale: PosSale,
  company: CompanyInfo | null,
  receiptType: 'ADDITION' | 'TICKET_FINAL' = 'TICKET_FINAL'
): Promise<{ success: boolean; message?: string }> {
  const settings = getTicketPrinterSettings();

  // 1. Try local server socket route (/api/printer/print)
  try {
    const res = await fetch('/api/printer/print', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sale, company, settings, receiptType }),
    });
    const data = await res.json();
    if (data && data.success) {
      return { success: true, message: data.message };
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
    ];

    for (const url of endpoints) {
      try {
        const ctrl = new AbortController();
        const timeout = setTimeout(() => ctrl.abort(), 2000);
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/xml; charset=utf-8' },
          body: xml,
          signal: ctrl.signal,
          mode: 'no-cors',
        });
        clearTimeout(timeout);
        return { success: true, message: `Ticket envoyé à l'imprimante ${settings.ipAddress}` };
      } catch {
        // continue to next endpoint
      }
    }
  }

  return { success: false, message: 'Impression réseau direct non disponible' };
}

/**
 * Main print ticket function: sends to network printer and displays browser receipt dialog
 */
export function printPosTicket(
  sale: PosSale,
  company: CompanyInfo | null,
  receiptType: 'ADDITION' | 'TICKET_FINAL' = 'TICKET_FINAL'
): boolean {
  const settings = getTicketPrinterSettings();

  // Fire asynchronous network print in background
  sendNetworkPrint(sale, company, receiptType).catch(() => {});

  // Open browser formatted thermal ticket popup
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
