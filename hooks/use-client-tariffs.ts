'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchClientTarifs } from '@/lib/sqlite-service';
import { ClientTarif } from '@/lib/types';

interface ClientTariffState {
  clientId: number;
  tariffs: ClientTarif[];
  loading: boolean;
}

export function useClientTariffs(clientId: number) {
  const [state, setState] = useState<ClientTariffState>({
    clientId: 0,
    tariffs: [],
    loading: false,
  });

  useEffect(() => {
    const normalizedClientId = Number(clientId || 0);
    if (!normalizedClientId) {
      setState({ clientId: 0, tariffs: [], loading: false });
      return;
    }

    let active = true;
    setState({ clientId: normalizedClientId, tariffs: [], loading: true });
    fetchClientTarifs(normalizedClientId)
      .then((tariffs) => {
        if (active) setState({ clientId: normalizedClientId, tariffs, loading: false });
      })
      .catch((error) => {
        console.error('Impossible de charger les tarifs du client:', error);
        if (active) setState({ clientId: normalizedClientId, tariffs: [], loading: false });
      });

    return () => {
      active = false;
    };
  }, [clientId]);

  const byProductId = useMemo(
    () => new Map(state.tariffs.map((tariff) => [Number(tariff.produit_id), tariff])),
    [state.tariffs]
  );

  const priceByProductId = useMemo(
    () => new Map(state.tariffs.map((tariff) => [Number(tariff.produit_id), Number(tariff.prix_special_ht)])),
    [state.tariffs]
  );

  return {
    ...state,
    byProductId,
    priceByProductId,
  };
}
