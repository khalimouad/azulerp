import { NextRequest, NextResponse } from 'next/server';
import net from 'net';

function formatTicketDate(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(d.getTime())) {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Builds 80mm ESC/POS binary ticket matching the requested design:
 * - Header: VERDEORTO Snack Italy (Bold/Double Height), address, phones, website, DUPLICATA
 * - Metadata: Date creation, Boutique, Ticket, Caissier
 * - 3-Col Items: QTE, * ARTICLE *, PRIX
 * - Summary: Nombre d'articles, Sous-total
 * - Total: Double-Height font
 * - Tax Breakdown: Taux TVA, Montant H.T., T.V.A
 * - Footer: NOTE, Feed 4 lines & SINGLE Partial Cut (GS V 66 0)
 */
function buildEscPosBuffer(
  sale: any,
  company: any,
  receiptType: 'ADDITION' | 'TICKET_FINAL' | 'DUPLICATA' = 'TICKET_FINAL',
  paperWidth: number = 80
): Buffer {
  const is58mm = paperWidth === 58;
  const colWidth = is58mm ? 32 : 48;
  const divider = '-'.repeat(colWidth);

  const chunks: Buffer[] = [];

  const addText = (text: string) => {
    const clean = (text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    chunks.push(Buffer.from(clean, 'latin1'));
  };

  const addCmd = (bytes: number[]) => {
    chunks.push(Buffer.from(bytes));
  };

  const addLine = (text: string = '') => {
    addText(text);
    chunks.push(Buffer.from([0x0a]));
  };

  // 1. Initialize printer
  addCmd([0x1b, 0x40]); // ESC @
  addCmd([0x1b, 0x74, 0]); // ESC t 0 (PC437)

  // 2. HEADER - Center Aligned
  addCmd([0x1b, 0x61, 0x01]); // Center
  addCmd([0x1d, 0x21, 0x11]); // GS ! 0x11 (Double Width & Height)
  addLine('VERDEORTO Snack Italy');
  addCmd([0x1d, 0x21, 0x00]); // Normal size

  addLine('Av al moukawama Quartier Merrodi Residence Davin');
  addLine('c1 Bloc F Mag N 20 Marrakech');
  addLine('08 08 55 11 56 / 06 62 12 34 49');
  addLine('www.verdeorto.weebly.com');

  const docTitle = receiptType === 'ADDITION' ? "NOTE D'ADDITION" : (receiptType === 'DUPLICATA' ? 'DUPLICATA' : 'TICKET DE CAISSE');
  addCmd([0x1b, 0x45, 0x01]); // Bold
  addLine(docTitle);
  addCmd([0x1b, 0x45, 0x00]); // Bold off

  addLine(divider);

  // 3. METADATA - Left Aligned
  addCmd([0x1b, 0x61, 0x00]); // Left
  addLine(`Date creation : ${formatTicketDate(sale.date_vente)}`);
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

  addCmd([0x1b, 0x45, 0x01]); // Bold
  addLine(format3Col('QTE', '* ARTICLE *', 'PRIX'));
  addCmd([0x1b, 0x45, 0x00]); // Bold off

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
  addCmd([0x1d, 0x21, 0x11]); // Double Height & Width
  addCmd([0x1b, 0x45, 0x01]); // Bold
  const totalLeft = 'Total';
  const totalRight = `${Number(sale.total_ttc || 0).toFixed(2)} MAD`;
  const halfCol = Math.floor(colWidth / 2);
  const totalSpaces = Math.max(1, halfCol - totalLeft.length - totalRight.length);
  addLine(`${totalLeft}${' '.repeat(totalSpaces)}${totalRight}`);
  addCmd([0x1d, 0x21, 0x00]); // Normal
  addCmd([0x1b, 0x45, 0x00]); // Bold off

  addLine(divider);

  // 7. TAX BREAKDOWN - 3 Columns
  const taxCol1 = is58mm ? 8 : 12;
  const taxCol3 = is58mm ? 10 : 16;
  const taxCol2 = colWidth - taxCol1 - taxCol3;

  const formatTaxRow = (t1: string, t2: string, t3: string) => {
    return `${t1.padEnd(taxCol1, ' ')}${t2.padStart(taxCol2, ' ')}${t3.padStart(taxCol3, ' ')}`;
  };

  addCmd([0x1b, 0x45, 0x01]); // Bold
  addLine(formatTaxRow('Taux TVA', 'Montant H.T.', 'T.V.A'));
  addCmd([0x1b, 0x45, 0x00]); // Bold off

  const ht = Number(sale.total_ht || 0).toFixed(2);
  const tva = Number(sale.total_tva || 0).toFixed(2);
  const taxRate = sale.tva_10 && sale.tva_10 > 0 ? '10 %' : (sale.tva_7 && sale.tva_7 > 0 ? '7 %' : '20 %');
  addLine(formatTaxRow(taxRate, ht, tva));

  addLine(divider);

  // 8. FOOTER - Center Aligned
  addCmd([0x1b, 0x61, 0x01]); // Center
  addCmd([0x1b, 0x45, 0x01]); // Bold
  addLine('NOTE');
  addCmd([0x1b, 0x45, 0x00]); // Bold off

  // 9. Feed 4 lines & SINGLE Partial Cut (GS V 66 0 / 29 86 66 0)
  addCmd([0x0a, 0x0a, 0x0a, 0x0a]); // 4 line feeds
  addCmd([0x1d, 0x56, 0x42, 0x00]); // GS V 66 0 (Single Partial Cut)

  return Buffer.concat(chunks);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sale, company, settings, receiptType } = body;

    const host = String(settings?.ipAddress || '192.168.1.87').trim();
    const port = Number(settings?.port || 9100);

    if (!host) {
      return NextResponse.json({ success: false, error: 'Adresse IP imprimante non configurée' }, { status: 400 });
    }

    const payloadBuffer = buildEscPosBuffer(sale || {}, company || {}, receiptType, settings?.paperWidth || 80);

    // Relay pure binary ESC/POS stream directly via TCP socket to printer
    const sendResult = await new Promise<{ success: boolean; error?: string }>((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(2500);

      socket.on('connect', () => {
        socket.write(payloadBuffer, () => {
          socket.end();
          resolve({ success: true });
        });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({ success: false, error: `Délai d'attente dépassé sur ${host}:${port}` });
      });

      socket.on('error', (err) => {
        socket.destroy();
        resolve({ success: false, error: err.message });
      });

      socket.connect(port, host);
    });

    if (sendResult.success) {
      return NextResponse.json({
        success: true,
        message: `Ticket imprimé avec succès sur ${host}:${port}`
      });
    } else {
      return NextResponse.json({
        success: false,
        fallback: true,
        error: sendResult.error || 'Connexion réseau impossible'
      });
    }
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      fallback: true,
      error: err?.message || 'Erreur impression thermique'
    });
  }
}
