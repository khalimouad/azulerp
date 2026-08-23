'use client';

import React, { useState, useEffect } from 'react';
import {
  Database,
  Zap,
  RefreshCw,
  AlertTriangle,
  Server
} from 'lucide-react';
import {
  NeonDbState,
  subscribeToNeonSyncState,
  testNeonConnection
} from '@/lib/neon-sync-service';
import { SyncModal } from './SyncModal';

interface SyncStatusBadgeProps {
  compact?: boolean;
  onDataReload?: () => void;
}

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({
  compact = false,
  onDataReload
}) => {
  const [dbState, setDbState] = useState<NeonDbState | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const unsub = subscribeToNeonSyncState((state) => {
      setDbState(state);
    });

    // Periodically test health
    testNeonConnection();
    const interval = setInterval(() => {
      testNeonConnection();
    }, 30000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  if (!dbState) return null;

  return (
    <>
      <button
        type="button"
        id="postgres-db-status-btn"
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border transition shadow-xs active:scale-95 bg-emerald-950/80 text-emerald-300 border-emerald-700/80 hover:bg-emerald-900"
        title="Base de données PostgreSQL Neon - Cliquez pour voir les détails de la connexion"
      >
        <div className="relative flex items-center justify-center">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <Server className="w-3.5 h-3.5 text-emerald-300" />
        <span className="hidden sm:inline font-mono">PostgreSQL Neon</span>
        {dbState.latencyMs > 0 && (
          <span className="hidden md:inline text-[10px] opacity-75 font-mono">
            {dbState.latencyMs}ms
          </span>
        )}
      </button>

      {isModalOpen && (
        <SyncModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onDataReload={onDataReload}
        />
      )}
    </>
  );
};
