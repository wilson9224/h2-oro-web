'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PricingMetal, PricingService, PricingWorkerRate } from '@/lib/pricing/types';
import { fetchMetals, fetchServices, fetchWorkerRates } from '@/lib/pricing/queries';

interface UsePricingReturn {
  metals: PricingMetal[];
  services: PricingService[];
  workerRates: PricingWorkerRate[];
  loading: boolean;
  error: string | null;
  getMetalPrice: (metalCode: string) => number;
  getMetalMerma: (metalCode: string) => number;
  getServicePrice: (serviceCode: string) => number;
  getWorkerRate: (serviceCode: string) => number;
  refresh: () => Promise<void>;
}

export function usePricing(): UsePricingReturn {
  const [metals, setMetals] = useState<PricingMetal[]>([]);
  const [services, setServices] = useState<PricingService[]>([]);
  const [workerRates, setWorkerRates] = useState<PricingWorkerRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, s, w] = await Promise.all([
        fetchMetals(),
        fetchServices(),
        fetchWorkerRates(),
      ]);
      setMetals(m);
      setServices(s);
      setWorkerRates(w);
    } catch (err) {
      console.error('Error loading pricing data:', err);
      setError('Error al cargar los datos de precios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const getMetalPrice = useCallback(
    (metalCode: string): number => {
      const metal = metals.find((m) => m.metal_code === metalCode);
      return metal?.international_price_per_gram ?? 0;
    },
    [metals]
  );

  const getMetalMerma = useCallback(
    (metalCode: string): number => {
      const metal = metals.find((m) => m.metal_code === metalCode);
      return metal?.merma_percentage ?? 0;
    },
    [metals]
  );

  const getServicePrice = useCallback(
    (serviceCode: string): number => {
      const service = services.find((s) => s.service_code === serviceCode);
      return service?.price_cop ?? 0;
    },
    [services]
  );

  const getWorkerRateValue = useCallback(
    (serviceCode: string): number => {
      const rate = workerRates.find((r) => r.service_code === serviceCode);
      return rate?.rate_cop ?? 0;
    },
    [workerRates]
  );

  return {
    metals,
    services,
    workerRates,
    loading,
    error,
    getMetalPrice,
    getMetalMerma,
    getServicePrice,
    getWorkerRate: getWorkerRateValue,
    refresh: loadAll,
  };
}
