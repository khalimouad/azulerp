export interface NeonDbState {
  isOnline: boolean;
  connected: boolean;
  configured: boolean;
  status: 'connected' | 'connecting' | 'idle' | 'error';
  lastCheckedTime: string | null;
  lastError: string | null;
  host: string;
  database: string;
  tableCount: number;
  tables: string[];
  stats: Record<string, number>;
  latencyMs: number;
  serverTime: string | null;
  deviceName: string;
}

export interface NeonHealthResult {
  connected: boolean;
  configured: boolean;
  provider?: string;
  host?: string;
  database?: string;
  version?: string;
  latencyMs?: number;
  tableCount?: number;
  tables?: string[];
  stats?: Record<string, number>;
  serverTime?: string;
  error?: string;
  hint?: string;
}

let currentState: NeonDbState = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  connected: false,
  configured: false,
  status: 'connecting',
  lastCheckedTime: null,
  lastError: null,
  host: '',
  database: '',
  tableCount: 0,
  tables: [],
  stats: {},
  latencyMs: 0,
  serverTime: null,
  deviceName: 'Poste Principal',
};

type StateListener = (state: NeonDbState) => void;
const listeners = new Set<StateListener>();

function notifyListeners() {
  listeners.forEach((fn) => {
    try {
      fn({ ...currentState });
    } catch (e) {
      console.warn('Neon state listener error:', e);
    }
  });
}

export function getNeonSyncState(): NeonDbState {
  return { ...currentState };
}

export function subscribeToNeonSyncState(listener: StateListener): () => void {
  listeners.add(listener);
  listener({ ...currentState });
  return () => {
    listeners.delete(listener);
  };
}

export function setNeonDeviceName(name: string) {
  currentState.deviceName = name;
  notifyListeners();
}

/**
 * Tests direct connection to Neon PostgreSQL
 */
export async function testNeonConnection(): Promise<NeonHealthResult> {
  try {
    const t0 = performance.now();
    const res = await fetch('/api/postgres/health', {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
    });
    const latency = Math.round(performance.now() - t0);
    const data = await res.json();

    if (res.ok && data.connected) {
      currentState.connected = true;
      currentState.configured = true;
      currentState.status = 'connected';
      currentState.latencyMs = latency;
      currentState.host = data.host || 'ep-neon.tech';
      currentState.database = data.database || 'neondb';
      currentState.tableCount = data.tableCount || 15;
      currentState.tables = data.tables || [];
      currentState.stats = data.stats || {};
      currentState.serverTime = data.serverTime || new Date().toISOString();
      currentState.lastCheckedTime = new Date().toLocaleTimeString();
      currentState.lastError = null;
      notifyListeners();

      return {
        connected: true,
        configured: true,
        host: data.host,
        database: data.database,
        version: data.version,
        latencyMs: latency,
        tableCount: data.tableCount,
        tables: data.tables,
        stats: data.stats,
        serverTime: data.serverTime,
      };
    } else {
      currentState.connected = false;
      currentState.status = 'error';
      currentState.lastError = data.error || 'Erreur de connexion';
      notifyListeners();

      return {
        connected: false,
        configured: data.configured || false,
        error: data.error || 'Connexion impossible',
        hint: data.hint || 'Configurez DATABASE_URL avec votre chaîne Neon PostgreSQL.',
      };
    }
  } catch (err: any) {
    currentState.connected = false;
    currentState.status = 'error';
    currentState.lastError = err?.message || 'Erreur réseau';
    notifyListeners();

    return {
      connected: false,
      configured: false,
      error: err?.message || 'Impossible de joindre le serveur',
    };
  }
}

export async function initNeonDatabase(): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/postgres/init', { method: 'POST' });
    const data = await res.json();
    await testNeonConnection();
    return {
      success: data.success || res.ok,
      message: data.message || 'Schéma PostgreSQL vérifié et initialisé.',
    };
  } catch (e: any) {
    return { success: false, message: e?.message || 'Échec initialisation' };
  }
}

export async function executeNeonQuery(sqlQuery: string): Promise<any> {
  const res = await fetch('/api/postgres/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sqlQuery }),
  });
  return res.json();
}
