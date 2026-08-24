import { NextRequest, NextResponse } from 'next/server';
import { initNeonPostgresSchema, getNeonDatabaseUrl } from '@/lib/neon-postgres';
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
        error: 'DATABASE_URL ou POSTGRES_URL non configuré. Veuillez définir la variable d\'environnement.',
      },
      { status: 400 }
    );
  }

  try {
    const result = await initNeonPostgresSchema();
    return NextResponse.json({
      success: true,
      message: 'Base de données Neon PostgreSQL initialisée avec succès (tables, index et données de référence).',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Failed to initialize Neon Postgres schema:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Erreur lors de l\'initialisation du schéma PostgreSQL.',
      },
      { status: 500 }
    );
  }
}
