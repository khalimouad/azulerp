'use client';

import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Package, Search, X } from 'lucide-react';
import { Produit } from '@/lib/types';

interface ProductSearchSelectProps {
  products: Produit[];
  value?: number | null;
  onChange: (productId: number) => void;
  accent?: 'emerald' | 'blue' | 'rose';
  allowClear?: boolean;
  clientPriceByProductId?: ReadonlyMap<number, number>;
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

export const ProductSearchSelect: React.FC<ProductSearchSelectProps> = ({
  products,
  value,
  onChange,
  accent = 'emerald',
  allowClear = false,
  clientPriceByProductId,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const searchRef = useRef<HTMLInputElement>(null);
  const selectedProduct = products.find((product) => Number(product.id) === Number(value));

  const filteredProducts = useMemo(() => {
    const q = normalize(deferredQuery);
    const list = [...products];

    if (!q) {
      // Default: Strict alphabetical order A-Z
      return list.sort((a, b) =>
        (a.libelle || '').localeCompare(b.libelle || '', 'fr', { sensitivity: 'base' })
      );
    }

    // Prioritize alphabetical order of the searched term
    const scored = list
      .map((prod) => {
        const lib = normalize(prod.libelle);
        const code = normalize(prod.code);
        const fam = normalize(prod.famille);
        const grp = normalize(prod.groupe);

        let score = 999;

        if (lib.startsWith(q)) {
          score = 1; // Direct prefix match on product name (Highest priority)
        } else if (lib.split(/[\s,/\-_]+/).some((w) => w.startsWith(q))) {
          score = 2; // Word inside product name starts with search term
        } else if (code.startsWith(q)) {
          score = 3; // Code starts with search term
        } else if (lib.includes(q)) {
          score = 4; // Product name contains search term
        } else if (code.includes(q) || fam.includes(q) || grp.includes(q)) {
          score = 5; // Family / group / code contains search term
        } else {
          return null;
        }

        return { prod, score, lib: prod.libelle || '' };
      })
      .filter(Boolean) as { prod: Produit; score: number; lib: string }[];

    // Sort by relevance score first, then alphabetically A-Z
    scored.sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      return a.lib.localeCompare(b.lib, 'fr', { sensitivity: 'base' });
    });

    return scored.map((s) => s.prod);
  }, [deferredQuery, products]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    requestAnimationFrame(() => searchRef.current?.focus());
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const selectProduct = (product: Produit) => {
    onChange(Number(product.id));
    setQuery('');
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full min-h-9 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-left shadow-xs transition focus:outline-none focus:ring-2 ${accentClasses[accent]}`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="min-w-0 flex-1">
            {selectedProduct ? (
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-xs font-bold text-slate-900">
                  <span className="text-emerald-700 font-semibold mr-1">{selectedProduct.code}</span>
                  {selectedProduct.libelle}
                </span>
                <span className="shrink-0 text-[10px] text-slate-500 font-medium">
                  Stock: {selectedProduct.stock_actuel} {selectedProduct.unite || 'U'}
                </span>
              </span>
            ) : (
              <span className="text-xs font-medium text-slate-400">Sélectionner un article…</span>
            )}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        </span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-xs sm:items-center sm:p-3"
          role="dialog"
          aria-modal="true"
          aria-label="Sélectionner un article"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-xl border border-slate-200">
            {/* Header - Compact */}
            <div className="border-b border-slate-200 bg-slate-50/80 px-3.5 py-2.5">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-emerald-700" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Choisir un article</h3>
                  <span className="text-[11px] font-semibold text-slate-500">({filteredProducts.length} articles)</span>
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
                  placeholder="Tapez pour filtrer (ex. tomate, burrata, PRD01...)"
                  className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            {/* List - Condensed Rows */}
            <div className="overflow-y-auto overscroll-contain p-1.5 max-h-[58vh]">
              {allowClear ? (
                <button
                  type="button"
                  onClick={() => {
                    onChange(0);
                    setQuery('');
                    setOpen(false);
                  }}
                  className="mb-1 flex min-h-8 w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  <Package className="h-3.5 w-3.5 text-slate-400" />
                  Article libre hors catalogue
                </button>
              ) : null}

              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => {
                  const selected = Number(product.id) === Number(value);
                  const clientPrice = clientPriceByProductId?.get(Number(product.id));
                  const displayedPrice = clientPrice ?? Number(product.prix_ht || 0);
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => selectProduct(product)}
                      className={`mb-0.5 flex w-full items-center justify-between gap-2.5 rounded-lg border px-2.5 py-1.5 text-left transition active:scale-[0.99] ${
                        selected
                          ? 'border-emerald-400 bg-emerald-50/80 shadow-xs'
                          : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0 flex-1 flex items-center gap-2">
                        <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-700">
                          {product.code}
                        </span>
                        <span className="truncate text-xs font-bold text-slate-900">{product.libelle}</span>
                        {product.famille && (
                          <span className="hidden sm:inline shrink-0 text-[10px] text-slate-500 font-medium">
                            · {product.famille}
                          </span>
                        )}
                      </div>

                      <div className="shrink-0 flex items-center gap-3 text-right">
                        <div className="text-right">
                          <span className="block text-xs font-bold text-slate-900 tabular-nums">
                            {displayedPrice.toFixed(2)} DH
                          </span>
                          <span className="block text-[9.5px] text-slate-500 font-medium">
                            {clientPrice !== undefined ? <span className="text-emerald-700 font-bold">Tarif client · </span> : ''}
                            Stock: {product.stock_actuel} {product.unite || 'U'}
                          </span>
                        </div>
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
                  <Package className="mx-auto mb-2 h-6 w-6 text-slate-300" />
                  <p className="text-xs font-bold text-slate-700">Aucun article trouvé pour « {query} »</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">Vérifiez l’orthographe ou le code.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 bg-slate-50 px-3 py-1.5 text-center text-[10px] font-medium text-slate-500 flex justify-between items-center">
              <span>Trié par pertinence alphabétique (A-Z)</span>
              <span>{filteredProducts.length} article{filteredProducts.length > 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};
