import { NextRequest, NextResponse } from 'next/server';
import net from 'net';

/**
 * Helper to build standard ESC/POS bytes for thermal ticket
 */
function buildEscPosBuffer(
  sale: any,
  company: any,
  receiptType: 'ADDITION' | 'TICKET_FINAL' = 'TICKET_FINAL',
  paperWidth: number = 80
): Buffer {
  const is58mm = paperWidth === 58;
  const colWidth = is58mm ? 32 : 42;
  const divider = '-'.repeat(colWidth);

  const chunks: Buffer[] = [];

  const addText = (text: string) => {
    chunks.push(Buffer.from(text, 'latin1'));
  };

  const addCmd = (bytes: number[]) => {
    chunks.push(Buffer.from(bytes));
  };

  // 1. Initialize printer
  addCmd([0x1b, 0x40]); // ESC @

  // Select character code table (PC858 / Euro)
  addCmd([0x1b, 0x74, 19]); // ESC t 19

  // 2. Header: Centered & bold double height
  addCmd([0x1b, 0x61, 0x01]); // ESC a 1 (Center)
  addCmd([0x1b, 0x21, 0x30]); // ESC ! 0x30 (Double width & height)
  addText(`${company?.nom || 'VerdeOrto'}\n`);

  addCmd([0x1b, 0x21, 0x00]); // Normal text
  if (company?.adresse) addText(`${company.adresse}\n`);
  if (company?.telephone) addText(`Tel: ${company.telephone}\n`);
  if (company?.ice) addText(`ICE: ${company.ice}\n`);

  addText(`${divider}\n`);

  // Document Title
  addCmd([0x1b, 0x21, 0x08]); // Bold
  const title = receiptType === 'ADDITION' ? "NOTE D'ADDITION" : 'TICKET DE CAISSE';
  addText(`${title}\n`);
  addCmd([0x1b, 0x21, 0x00]); // Normal
  addText(`${sale.numero_ticket || ''}\n`);
  addText(`${divider}\n`);

  // Metadata: Left aligned
  addCmd([0x1b, 0x61, 0x00]); // Left
  addText(`Date    : ${sale.date_vente || new Date().toISOString().slice(0, 10)}\n`);
  addText(`Table   : ${sale.table_numero || 'Comptoir'}\n`);
  addText(`Caissier: ${sale.caissier || 'Caisse'}\n`);
  addText(`${divider}\n`);

  // Line items
  const lignes = sale.lignes || [];
  for (const item of lignes) {
    const qty = item.quantite || 1;
    const name = (item.produit_nom || item.nom || 'Article').slice(0, colWidth - 12);
    const total = `${Number(item.total_ttc || 0).toFixed(2)} DH`;
    const lineLeft = `${qty}x ${name}`;
    const spaces = Math.max(1, colWidth - lineLeft.length - total.length);
    addText(`${lineLeft}${' '.repeat(spaces)}${total}\n`);
  }

  addText(`${divider}\n`);

  // Totals
  const formatLine = (label: string, value: string) => {
    const spaces = Math.max(1, colWidth - label.length - value.length);
    return `${label}${' '.repeat(spaces)}${value}\n`;
  };

  addText(formatLine('Total HT', `${Number(sale.total_ht || 0).toFixed(2)} DH`));
  addText(formatLine('TVA', `${Number(sale.total_tva || 0).toFixed(2)} DH`));

  // Big Bold Total TTC
  addCmd([0x1b, 0x21, 0x20]); // Double height bold
  addText(formatLine('TOTAL TTC', `${Number(sale.total_ttc || 0).toFixed(2)} DH`));
  addCmd([0x1b, 0x21, 0x00]); // Normal

  if (sale.montant_donne && Number(sale.montant_donne) > 0) {
    addText(formatLine('Montant Recu', `${Number(sale.montant_donne).toFixed(2)} DH`));
    addText(formatLine('Rendu Monnaie', `${Number(sale.montant_rendu || 0).toFixed(2)} DH`));
  }

  addText(`${divider}\n`);

  // Footer: Centered
  addCmd([0x1b, 0x61, 0x01]); // Center
  addText('Merci de votre visite et a tres bientot !\n');

  // Feed 4 lines & Full Cut
  addCmd([0x1b, 0x64, 0x04]); // ESC d 4 (feed 4 lines)
  addCmd([0x1d, 0x56, 0x41, 0x03]); // GS V A 3 (feed and cut)

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

    // Attempt direct TCP socket connection to printer
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
        message: `Ticket imprimé directement avec succès sur ${host}:${port}`
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
