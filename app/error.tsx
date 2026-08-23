'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isChunkError =
    error?.name === 'ChunkLoadError' ||
    error?.message?.includes('Loading chunk') ||
    error?.message?.includes('Failed to fetch dynamic module');

  useEffect(() => {
    console.error('App Error:', error);
    // If it's a chunk loading failure from an update, attempt one automatic window reload if not yet retried
    if (isChunkError && typeof window !== 'undefined') {
      const retryKey = 'chunk_retry_timestamp';
      const lastRetry = parseInt(sessionStorage.getItem(retryKey) || '0', 10);
      const now = Date.now();
      if (now - lastRetry > 10000) {
        sessionStorage.setItem(retryKey, now.toString());
        window.location.reload();
      }
    }
  }, [error, isChunkError]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-md w-full">
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          {isChunkError ? 'Mise à jour de l’application' : 'Une erreur est survenue'}
        </h2>
        <p className="text-slate-600 mb-6 text-sm">
          {isChunkError
            ? 'Une nouvelle version des composants est disponible. Veuillez recharger la page.'
            : 'Une erreur inattendue s’est produite lors du chargement.'}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.reload();
              } else {
                reset();
              }
            }}
            className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition cursor-pointer"
          >
            Recharger la page
          </button>
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition cursor-pointer"
          >
            Réessayer
          </button>
        </div>
      </div>
    </div>
  );
}
