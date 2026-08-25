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

const normalizeSearch = (value: unknown) =>
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
    const needle = normalizeSearch(deferredQuery);
    if (!needle) return products.slice(0, 100);

    return products
      .filter((product) =>
        normalizeSearch(
          `${product.code} ${product.libelle} ${product.famille || ''} ${product.groupe || ''}`
        ).includes(needle)
      )
      .slice(0, 100);
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
        className={`w-full min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-left shadow-sm transition focus:outline-none focus:ring-4 ${accentClasses[accent]}`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="min-w-0 flex-1">
            {selectedProduct ? (
              <>
                <span className="block truncate text-xs font-bold text-slate-900">
                  {selectedProduct.code} · {selectedProduct.libelle}
                </span>
                <span className="block truncate text-[10px] text-slate-500">
                  Stock : {selectedProduct.stock_actuel} {selectedProduct.unite || 'U'}
                </span>
              </>
            ) : (
              <span className="text-xs font-medium text-slate-500">Rechercher un article…</span>
            )}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        </span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Sélectionner un article"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-2xl">
            <div className="border-b border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-slate-900">Choisir un article</h3>
                  <p className="text-xs text-slate-500">Recherche par code, désignation, famille ou groupe</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
                  aria-label="Fermer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Ex. PRD686, burrata, fromage…"
                  className="h-12 w-full rounded-xl border border-slate-300 bg-slate-50 pl-11 pr-4 text-base text-slate-900 outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                />
              </div>
            </div>

            <div className="overflow-y-auto overscroll-contain p-2 sm:p-3">
              {allowClear ? (
                <button
                  type="button"
                  onClick={() => {
                    onChange(0);
                    setQuery('');
                    setOpen(false);
                  }}
                  className="mb-1 flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  <Package className="h-5 w-5 text-slate-400" />
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
                      className={`mb-1 flex min-h-16 w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition active:scale-[0.99] ${
                        selected
                          ? 'border-emerald-300 bg-emerald-50'
                          : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500">
                        <Package className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-black text-slate-900">{product.code}</span>
                        <span className="block truncate text-sm font-semibold text-slate-700">{product.libelle}</span>
                        <span className="block truncate text-[11px] text-slate-500">
                          {[product.famille, product.groupe].filter(Boolean).join(' · ') || 'Sans famille'}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-xs font-bold text-slate-700">
                          {displayedPrice.toFixed(2)} DH
                        </span>
                        <span className="block text-[10px] text-slate-500">
                          {clientPrice !== undefined ? 'Tarif client · ' : ''}
                          Stock {product.stock_actuel} {product.unite || 'U'}
                        </span>
                      </span>
                      {selected ? <Check className="h-5 w-5 shrink-0 text-emerald-600" /> : null}
                    </button>
                  );
                })
              ) : (
                <div className="px-4 py-12 text-center">
                  <Package className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                  <p className="text-sm font-bold text-slate-700">Aucun article trouvé</p>
                  <p className="mt-1 text-xs text-slate-500">Essayez un autre code ou mot-clé.</p>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-center text-[11px] text-slate-500">
              {filteredProducts.length} résultat{filteredProducts.length > 1 ? 's' : ''}
              {products.length > 100 && !query ? ` sur ${products.length} · Recherchez pour affiner` : ''}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};
