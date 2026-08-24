'use client';

import React, { useState, useEffect } from 'react';
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
  onDataReload
}) => {
  const [dbState, setDbState] = useState<NeonDbState | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const unsub = subscribeToNeonSyncState((state) => {
      setDbState(state);
    });

    // Check health once on client mount
    if (typeof window !== 'undefined') {
      testNeonConnection();
    }

    return () => {
      unsub();
    };
  }, []);

  if (!dbState) return null;

  return (
    <>
      <button
        type="button"
        id="postgres-db-status-btn"
        onClick={() => setIsModalOpen(true)}
        className={`flex items-center justify-center w-7 h-7 rounded-md border transition active:scale-95 ${
          dbState.connected
            ? 'border-emerald-700/70 bg-emerald-950/80 hover:bg-emerald-900'
            : dbState.status === 'connecting'
            ? 'border-amber-700/70 bg-amber-950/80'
            : 'border-rose-700/70 bg-rose-950/80 hover:bg-rose-900'
        }`}
        aria-label="État de la connexion PostgreSQL Neon"
        title={dbState.connected ? 'Neon connecté' : dbState.status === 'connecting' ? 'Connexion Neon…' : 'Neon déconnecté'}
      >
        <div className="relative flex items-center justify-center shrink-0">
          <span className={`w-2 h-2 rounded-full ${
            dbState.connected ? 'bg-emerald-400' : dbState.status === 'connecting' ? 'bg-amber-400 animate-pulse' : 'bg-rose-400'
          }`} />
        </div>
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
