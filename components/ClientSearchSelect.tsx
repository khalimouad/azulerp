'use client';

import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, User, X } from 'lucide-react';
import { Client } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

interface ClientSearchSelectProps {
  clients: Client[];
  value?: number | null;
  onChange: (clientId: number) => void;
  accent?: 'emerald' | 'blue' | 'rose';
  required?: boolean;
}

const accentClasses = {
  emerald: 'focus:border-emerald-500 focus:ring-emerald-500/20 text-emerald-700',
  blue: 'focus:border-blue-500 focus:ring-blue-500/20 text-blue-700',
  rose: 'focus:border-rose-500 focus:ring-rose-500/20 text-rose-700',
};

const normalize = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export const ClientSearchSelect: React.FC<ClientSearchSelectProps> = ({
  clients,
  value,
  onChange,
  accent = 'emerald',
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const searchRef = useRef<HTMLInputElement>(null);
  const selectedClient = clients.find((c) => Number(c.id) === Number(value));

  const filteredClients = useMemo(() => {
    const q = normalize(deferredQuery);
    const list = [...clients];

    if (!q) {
      // Default: Strict alphabetical order A-Z by client name
      return list.sort((a, b) =>
        (a.nom || '').localeCompare(b.nom || '', 'fr', { sensitivity: 'base' })
      );
    }

    // Prioritize alphabetical order of the searched term
    const scored = list
      .map((client) => {
        const nom = normalize(client.nom);
        const code = normalize(client.code);
        const ice = normalize(client.ice);
        const ville = normalize(client.ville);

        let score = 999;

        if (nom.startsWith(q)) {
          score = 1; // Name starts with query (highest priority)
        } else if (nom.split(/[\s,/\-_]+/).some((w) => w.startsWith(q))) {
          score = 2; // Word in name starts with query
        } else if (code.startsWith(q)) {
          score = 3; // Code starts with query
        } else if (nom.includes(q)) {
          score = 4; // Name contains query
        } else if (ice.includes(q) || ville.includes(q) || code.includes(q)) {
          score = 5; // ICE or City contains query
        } else {
          return null;
        }

        return { client, score, nom: client.nom || '' };
      })
      .filter(Boolean) as { client: Client; score: number; nom: string }[];

    // Sort by score first, then strictly alphabetically by name A-Z
    scored.sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      return a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' });
    });

    return scored.map((s) => s.client);
  }, [deferredQuery, clients]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    requestAnimationFrame(() => searchRef.current?.focus());
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const selectClient = (client: Client) => {
    onChange(Number(client.id));
    setQuery('');
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full min-h-10 rounded-xl border border-slate-300 bg-white px-3 py-2 text-left shadow-xs transition focus:outline-none focus:ring-2 ${accentClasses[accent]}`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <User className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="min-w-0 flex-1">
            {selectedClient ? (
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-xs font-bold text-slate-900">
                  {selectedClient.nom} {selectedClient.ville ? `(${selectedClient.ville})` : ''}
                </span>
                {selectedClient.ice && (
                  <span className="shrink-0 text-[10px] text-slate-500 font-medium">
                    ICE: {selectedClient.ice}
                  </span>
                )}
              </span>
            ) : (
              <span className="text-xs font-medium text-slate-400">Sélectionner un client…</span>
            )}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        </span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-xs sm:items-center sm:p-3"
          role="dialog"
          aria-modal="true"
          aria-label="Sélectionner un client"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-xl border border-slate-200">
            {/* Header - Compact */}
            <div className="border-b border-slate-200 bg-slate-50/80 px-3.5 py-2.5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-emerald-700" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Sélectionner un Client</h3>
                  <span className="text-[11px] font-semibold text-slate-500">({filteredClients.length} clients)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="grid h-7 w-7 place-items-center rounded-lg bg-slate-200/70 text-slate-600 hover:bg-slate-300 transition"
                  aria-label="Fermer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Rechercher par nom, ville ou ICE (ex. hotel, marrakech, 002...)"
                  className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            {/* List - Condensed Rows */}
            <div className="overflow-y-auto overscroll-contain p-1.5 max-h-[58vh]">
              {filteredClients.length > 0 ? (
                filteredClients.map((client) => {
                  const selected = Number(client.id) === Number(value);
                  return (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => selectClient(client)}
                      className={`mb-0.5 flex w-full items-center justify-between gap-2.5 rounded-lg border px-2.5 py-2 text-left transition active:scale-[0.99] ${
                        selected
                          ? 'border-emerald-400 bg-emerald-50/80 shadow-xs'
                          : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-xs font-bold text-slate-900">{client.nom}</span>
                          {client.ville && (
                            <span className="shrink-0 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                              {client.ville}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium mt-0.5 truncate">
                          {client.ice ? `ICE: ${client.ice}` : ''}
                          {client.telephone ? ` · Tel: ${client.telephone}` : ''}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-3 text-right">
                        {client.solde !== undefined && (
                          <div className="text-right">
                            <span className="block text-[10px] text-slate-400 font-semibold uppercase">Solde</span>
                            <span
                              className={`block text-xs font-bold tabular-nums ${
                                Number(client.solde) > 0 ? 'text-rose-600' : 'text-slate-700'
                              }`}
                            >
                              {formatCurrency(Number(client.solde || 0), false)} DH
                            </span>
                          </div>
                        )}
                        {selected ? (
                          <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                        ) : (
                          <div className="w-4 h-4" />
                        )}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="px-4 py-8 text-center">
                  <User className="mx-auto mb-2 h-6 w-6 text-slate-300" />
                  <p className="text-xs font-bold text-slate-700">Aucun client trouvé pour « {query} »</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">Vérifiez l’orthographe ou le code ICE.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 bg-slate-50 px-3 py-1.5 text-center text-[10px] font-medium text-slate-500 flex justify-between items-center">
              <span>Classé par ordre alphabétique (A-Z)</span>
              <span>{filteredClients.length} client{filteredClients.length > 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};
