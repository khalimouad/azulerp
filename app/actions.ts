"use server";

import { neon } from "@neondatabase/serverless";
import { getNeonDatabaseUrl, initNeonPostgresSchema, importDataToNeon } from "@/lib/neon-postgres";

/**
 * Standard Next.js Server Action to query Neon PostgreSQL.
 * Fetches primary records (clients, products, delivery notes, invoices, company info).
 */
export async function getData() {
  const databaseUrl = getNeonDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured in environment variables.");
  }

  const sql = neon(databaseUrl);

  try {
    // Attempt to query
    let [clients, produits, bonsLivraison, factures, company] = await Promise.all([
      sql`SELECT * FROM clients ORDER BY nom ASC LIMIT 200;`.catch(() => null),
      sql`SELECT * FROM produits ORDER BY libelle ASC LIMIT 200;`.catch(() => null),
      sql`SELECT * FROM bons_livraison ORDER BY id DESC LIMIT 100;`.catch(() => null),
      sql`SELECT * FROM factures ORDER BY id DESC LIMIT 100;`.catch(() => null),
      sql`SELECT * FROM company_info LIMIT 1;`.catch(() => null),
    ]);

    // If company_info or other tables are missing (returned null), initialize schema
    if (clients === null || company === null) {
      await initNeonPostgresSchema();
      [clients, produits, bonsLivraison, factures, company] = await Promise.all([
        sql`SELECT * FROM clients ORDER BY nom ASC LIMIT 200;`.catch(() => []),
        sql`SELECT * FROM produits ORDER BY libelle ASC LIMIT 200;`.catch(() => []),
        sql`SELECT * FROM bons_livraison ORDER BY id DESC LIMIT 100;`.catch(() => []),
        sql`SELECT * FROM factures ORDER BY id DESC LIMIT 100;`.catch(() => []),
        sql`SELECT * FROM company_info LIMIT 1;`.catch(() => []),
      ]);
    }

    return {
      success: true,
      data: {
        company: company?.[0] || null,
        clients: clients || [],
        produits: produits || [],
        bons_livraison: bonsLivraison || [],
        factures: factures || [],
      },
    };
  } catch (error: any) {
    console.error("Error in getData Server Action:", error);
    return {
      success: false,
      error: error?.message || "Failed to fetch data from Neon PostgreSQL.",
    };
  }
}

/**
 * Server Action: Execute raw SQL query safely on Neon PostgreSQL.
 */
export async function executeSqlQuery(queryString: string) {
  const databaseUrl = getNeonDatabaseUrl();
  if (!databaseUrl) {
    return {
      success: false,
      error: "DATABASE_URL is not configured.",
    };
  }

  const sql = neon(databaseUrl);
  const startTime = Date.now();

  try {
    const rows = await (sql as any)([queryString.trim()]);
    const executionTimeMs = Date.now() - startTime;

    return {
      success: true,
      rows: Array.isArray(rows) ? rows : [],
      rowCount: Array.isArray(rows) ? rows.length : 0,
      executionTimeMs,
    };
  } catch (error: any) {
    console.error("Error executing query in Server Action:", error);
    return {
      success: false,
      error: error?.message || "Query execution failed.",
      executionTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Server Action: Initialize or verify PostgreSQL schema in Neon.
 */
export async function initDatabase() {
  try {
    const result = await initNeonPostgresSchema();
    return result;
  } catch (error: any) {
    console.error("Error initializing schema:", error);
    return {
      success: false,
      error: error?.message || "Failed to initialize PostgreSQL schema.",
    };
  }
}

/**
 * Server Action: Check database connectivity and latency.
 */
export async function checkConnection() {
  const databaseUrl = getNeonDatabaseUrl();
  if (!databaseUrl) {
    return {
      connected: false,
      error: "DATABASE_URL non configuré.",
    };
  }

  const startTime = Date.now();
  try {
    const sql = neon(databaseUrl);
    const result = await sql`SELECT NOW() as server_time, version() as pg_version;`;
    const latencyMs = Date.now() - startTime;

    return {
      connected: true,
      serverTime: result[0]?.server_time,
      version: result[0]?.pg_version,
      latencyMs,
    };
  } catch (error: any) {
    return {
      connected: false,
      error: error?.message || "Erreur de connexion PostgreSQL Neon.",
    };
  }
}

/**
 * Server Action: Import full database payload (JSON or SQL) to Neon PostgreSQL.
 */
export async function importDbToNeon(payload: {
  data?: any;
  sql?: string;
  mode?: 'replace' | 'merge';
}) {
  try {
    const result = await importDataToNeon({
      data: payload.data,
      sql: payload.sql,
      mode: payload.mode || 'merge',
    });
    return result;
  } catch (error: any) {
    console.error("Error importing DB to Neon:", error);
    return {
      success: false,
      error: error?.message || "Échec de l'importation vers Neon PostgreSQL.",
    };
  }
}

/**
 * Server Action: Import SQL dump string to Neon PostgreSQL.
 */
export async function importSqlDumpToNeon(sqlString: string) {
  return importDbToNeon({ sql: sqlString, mode: 'merge' });
}

/**
 * Server Action: Import JSON dump string to Neon PostgreSQL.
 */
export async function importJsonDumpToNeon(jsonString: string, mode: 'replace' | 'merge' = 'merge') {
  try {
    const data = JSON.parse(jsonString);
    return importDbToNeon({ data, mode });
  } catch (err: any) {
    return {
      success: false,
      error: `Format JSON invalide: ${err?.message || 'Erreur de syntaxe JSON'}`,
    };
  }
}

