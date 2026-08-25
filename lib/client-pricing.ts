import { ClientTarif, Produit } from './types';

export function resolveClientProductPricing(product: Produit, tariff?: ClientTarif) {
  return {
    prix_ht: tariff ? Number(tariff.prix_special_ht) : Number(product.prix_ht || 0),
    remise_pct: tariff ? Number(tariff.remise_pct || 0) : 0,
    taux_tva: tariff?.taux_tva !== undefined
      ? Number(tariff.taux_tva)
      : Number(product.taux_tva || 0),
    hasClientTariff: Boolean(tariff),
  };
}
