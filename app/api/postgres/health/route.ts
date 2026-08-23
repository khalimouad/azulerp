import { NextRequest, NextResponse } from 'next/server';
import { getNeonSql, getNeonDatabaseUrl } from '@/lib/neon-postgres';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const connStr = getNeonDatabaseUrl();

  if (!connStr) {
    return NextResponse.json({
      connected: false,
      configured: false,
      provider: 'Neon.tech / PostgreSQL (Vercel)',
      error: 'La variable d\'environnement DATABASE_URL ou POSTGRES_URL n\'est pas encore configurée.',
      hint: 'Ajoutez votre chaîne de connexion Neon (ex: postgresql://user:pass@ep-xyz.eu-central-1.aws.neon.tech/neondb?sslmode=require) dans les variables d\'environnement ou le fichier .env.',
    }, { status: 200 });
  }

  const startTime = Date.now();

  try {
    const sql = getNeonSql();

    // Query Postgres version and current timestamp
    const versionRes: any = await sql`SELECT version(), current_database() as db_name, now() as server_now;`;
    const latencyMs = Date.now() - startTime;

    const versionStr = versionRes?.[0]?.version || 'PostgreSQL (Neon)';
    const dbName = versionRes?.[0]?.db_name || 'neondb';
    const serverNow = versionRes?.[0]?.server_now || new Date().toISOString();

    // Query list of user tables in public schema
    const tablesRes: any = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name ASC;
    `;

    const tables = Array.isArray(tablesRes) ? tablesRes.map((r: any) => r.table_name) : [];

    // Query row counts for key application tables
    const stats: Record<string, number> = {};
    for (const tableName of [
      'clients',
      'produits',
      'fournisseurs',
      'bons_livraison',
      'bons_retour',
      'factures',
      'devis',
      'reglements',
      'pos_ventes',
      'pos_produits',
      'pos_tables',
      'app_users'
    ]) {
      if (tables.includes(tableName)) {
        try {
          const countRes: any = await (sql as any)([
            `SELECT count(*) as count FROM "${tableName.replace(/[^a-zA-Z0-9_]/g, '')}";`
          ]);
          stats[tableName] = parseInt(countRes?.[0]?.count || '0', 10);
        } catch (_) {}
      }
    }

    // Mask credentials in connection string for security
    let maskedHost = 'neon.tech';
    try {
      const parsed = new URL(connStr.replace('postgresql://', 'http://').replace('postgres://', 'http://'));
      maskedHost = parsed.hostname;
    } catch (_) {}

    return NextResponse.json({
      connected: true,
      configured: true,
      provider: 'Neon.tech Serverless PostgreSQL',
      host: maskedHost,
      database: dbName,
      version: versionStr,
      latencyMs,
      tableCount: tables.length,
      tables,
      stats,
      serverTime: serverNow,
    });
  } catch (err: any) {
    console.error('Neon PostgreSQL health check failed:', err);
    return NextResponse.json({
      connected: false,
      configured: true,
      provider: 'Neon.tech Serverless PostgreSQL',
      error: err?.message || 'Impossible de se connecter à la base de données Neon PostgreSQL.',
      latencyMs: Date.now() - startTime,
    }, { status: 200 });
  }
}
