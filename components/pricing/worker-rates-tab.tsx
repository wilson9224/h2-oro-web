'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import type { PricingWorkerRate } from '@/lib/pricing/types';
import { SERVICE_CATEGORY_META, SERVICE_CATEGORY_ORDER } from '@/lib/pricing/types';
import { fetchWorkerRates, updateWorkerRate } from '@/lib/pricing/queries';
import ServiceCategoryCard from './service-category-card';

interface WorkerRatesTabProps {
  userId: string;
}

export default function WorkerRatesTab({ userId }: WorkerRatesTabProps) {
  const [rates, setRates] = useState<PricingWorkerRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRates = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWorkerRates();
      setRates(data);
    } catch (err) {
      console.error('Error loading worker rates:', err);
      setError('Error al cargar las tarifas de pago a trabajadores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRates();
  }, []);

  const handleSave = async (updates: { id: string; newValue: number; oldValue: number }[]) => {
    for (const u of updates) {
      await updateWorkerRate(u.id, u.newValue, userId, u.oldValue);
    }
    await loadRates();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw size={24} className="animate-spin text-gold-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
        <AlertCircle size={20} className="text-red-400" />
        <span className="text-red-300 text-sm">{error}</span>
        <button onClick={loadRates} className="ml-auto text-xs text-red-400 hover:text-red-300 underline">
          Reintentar
        </button>
      </div>
    );
  }

  // Group rates by category in the defined order
  const grouped = SERVICE_CATEGORY_ORDER.map((catCode) => {
    const meta = SERVICE_CATEGORY_META[catCode] || { name: catCode, icon: 'circle' };
    const catRates = rates.filter((r) => r.service_category === catCode);
    return {
      code: catCode,
      name: meta.name,
      rates: catRates,
    };
  }).filter((g) => g.rates.length > 0);

  return (
    <div className="space-y-4">
      <div className="mb-2">
        <p className="text-sm text-charcoal-400">
          Valores que se pagan a los trabajadores por cada tipo de servicio
        </p>
      </div>

      {grouped.map((group) => (
        <ServiceCategoryCard
          key={group.code}
          categoryName={group.name}
          categoryCode={group.code}
          valueLabel="Pago"
          services={group.rates.map((r) => ({
            id: r.id,
            service_code: r.service_code,
            service_name: r.service_name,
            difficulty_level: r.difficulty_level,
            value: r.rate_cop,
            unit: r.rate_unit,
            updated_at: r.updated_at,
            updated_by: r.updated_by,
          }))}
          onSave={handleSave}
        />
      ))}
    </div>
  );
}
