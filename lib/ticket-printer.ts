import { CompanyInfo, PosSale } from './types';

export interface TicketPrinterSettings {
  model: string;
  ipAddress: string;
  paperWidth: 80 | 58;
  autoPrint: boolean;
}

export const DEFAULT_TICKET_PRINTER_SETTINGS: TicketPrinterSettings = {
  model: 'Epson TM-T20X',
  ipAddress: '192.168.1.100',
  paperWidth: 80,
  autoPrint: false,
};

const STORAGE_KEY = 'verdeorto.ticket-printer.v1';

export function getTicketPrinterSettings(): TicketPrinterSettings {
  if (typeof window === 'undefined') return DEFAULT_TICKET_PRINTER_SETTINGS;
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    return { ...DEFAULT_TICKET_PRINTER_SETTINGS, ...saved };
  } catch {
    return DEFAULT_TICKET_PRINTER_SETTINGS;
  }
}

export function saveTicketPrinterSettings(settings: TicketPrinterSettings): void {
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

export function printPosTicket(
  sale: PosSale,
  company: CompanyInfo,
  receiptType: 'ADDITION' | 'TICKET_FINAL' = 'TICKET_FINAL'
): boolean {
  const settings = getTicketPrinterSettings();
  const popup = window.open('', 'verdeorto-ticket', 'popup,width=460,height=720');
  if (!popup) return false;

  const rows = (sale.lignes || []).map((line) => `
    <tr>
      <td>${escapeHtml(line.quantite)} × ${escapeHtml(line.produit_nom)}</td>
      <td>${line.total_ttc.toFixed(2)} DH</td>
    </tr>`).join('');

  popup.document.open();
  popup.document.write(`<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(sale.numero_ticket)}</title>
<style>
  @page { size: ${settings.paperWidth}mm auto; margin: 3mm; }
  * { box-sizing: border-box; }
  body { width: ${settings.paperWidth - 6}mm; margin: 0; color: #000; font: 12px/1.35 Arial, sans-serif; }
  h1 { margin: 0; font-size: 18px; text-align: center; }
  .center { text-align: center; } .small { font-size: 10px; }
  .rule { border-top: 1px dashed #000; margin: 7px 0; }
  .meta, table { width: 100%; border-collapse: collapse; }
  td { padding: 2px 0; vertical-align: top; }
  td:last-child { text-align: right; white-space: nowrap; }
  .total { font-size: 15px; font-weight: 800; border-top: 1px solid #000; padding-top: 5px; }
</style></head><body>
  <h1>${escapeHtml(company.nom || 'VerdeOrto')}</h1>
  <div class="center small">${escapeHtml(company.adresse || '')}<br>${escapeHtml(company.telephone || '')}</div>
  <div class="rule"></div>
  <div class="center"><strong>${receiptType === 'ADDITION' ? 'NOTE D’ADDITION' : 'TICKET DE CAISSE'}</strong><br>${escapeHtml(sale.numero_ticket)}</div>
  <div class="rule"></div>
  <table class="meta"><tr><td>Date</td><td>${escapeHtml(sale.date_vente)}</td></tr><tr><td>Table</td><td>${escapeHtml(sale.table_numero || 'Comptoir')}</td></tr><tr><td>Caissier</td><td>${escapeHtml(sale.caissier)}</td></tr></table>
  <div class="rule"></div><table>${rows}</table><div class="rule"></div>
  <table><tr><td>Total HT</td><td>${sale.total_ht.toFixed(2)} DH</td></tr><tr><td>TVA</td><td>${sale.total_tva.toFixed(2)} DH</td></tr><tr class="total"><td>TOTAL TTC</td><td>${sale.total_ttc.toFixed(2)} DH</td></tr></table>
  <div class="rule"></div><div class="center small">Merci de votre visite et à très bientôt !</div>
<script>window.addEventListener('load', () => { setTimeout(() => { window.print(); window.close(); }, 180); });<\/script>
</body></html>`);
  popup.document.close();
  popup.focus();
  return true;
}
