import { NextRequest, NextResponse } from 'next/server';
import { getNeonSql, getNeonDatabaseUrl } from '@/lib/neon-postgres';
import { readSession, unauthorizedResponse } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = readSession(req);
  if (!session) return unauthorizedResponse();
  if (session.role !== 'ADMIN') {
    return NextResponse.json({ success: false, error: 'Accès administrateur requis.' }, { status: 403 });
  }

  const connStr = getNeonDatabaseUrl();

  if (!connStr) {
    return NextResponse.json(
      {
        success: false,
        error: 'DATABASE_URL ou POSTGRES_URL non configuré.',
      },
      { status: 400 }
    );
  }

  try {
    const { query } = await req.json();

    if (!query || typeof query !== 'string' || !query.trim()) {
      return NextResponse.json(
        { success: false, error: 'Requête SQL vide ou invalide.' },
        { status: 400 }
      );
    }

    const trimmed = query.trim();
    const normalized = trimmed.replace(/\s+/g, ' ').toLowerCase();
    if (!/^(select|with|explain)\b/.test(normalized) || /;\s*\S/.test(trimmed)) {
      return NextResponse.json(
        { success: false, error: 'Seules les requêtes de lecture SELECT, WITH et EXPLAIN sont autorisées.' },
        { status: 400 }
      );
    }
    const startTime = Date.now();
    const sql = getNeonSql();

    // Execute query
    const rows: any = await sql.query(trimmed, []);
    const executionTimeMs = Date.now() - startTime;

    if (Array.isArray(rows) && rows.length > 0) {
      const columns = Object.keys(rows[0]);
      const formattedRows = rows.map((r) => columns.map((col) => r[col]));

      return NextResponse.json({
        success: true,
        columns,
        rows: formattedRows,
        rowCount: rows.length,
        executionTimeMs,
      });
    }

    return NextResponse.json({
      success: true,
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs,
      message: 'Requête PostgreSQL exécutée avec succès (aucune ligne retournée ou commande DDL/DML terminée).',
    });
  } catch (err: any) {
    console.error('Error executing Neon PostgreSQL query:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Erreur lors de l\'exécution de la requête PostgreSQL.',
      },
      { status: 500 }
    );
  }
}
