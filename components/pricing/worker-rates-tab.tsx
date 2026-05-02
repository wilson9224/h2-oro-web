'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import type { PricingWorkerRate } from '@/lib/pricing/types';
import { SERVICE_CATEGORY_META, SERVICE_CATEGORY_ORDER } from '@/lib/pricing/types';
import { fetchWorkerRates, updateWorkerRate, updateCustomValuePercentage } from '@/lib/pricing/queries';
import ServiceCategoryCard from './service-category-card';

interface WorkerRatesTabProps {
  userId: string;
}

export default function WorkerRatesTab({ userId }: WorkerRatesTabProps) {
  const [rates, setRates] = useState<PricingWorkerRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customValuePercentage, setCustomValuePercentage] = useState(80);
  const [savingPercentage, setSavingPercentage] = useState(false);

  const loadRates = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWorkerRates();
      setRates(data);
      // Obtener el porcentaje actual (debería ser el mismo en todos los registros)
      if (data.length > 0) {
        setCustomValuePercentage(data[0].custom_value_percentage);
      }
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

  const handleUpdateCustomValuePercentage = async () => {
    setSavingPercentage(true);
    try {
      await updateCustomValuePercentage(customValuePercentage, userId);
      await loadRates();
    } catch (err) {
      console.error('Error updating custom value percentage:', err);
    } finally {
      setSavingPercentage(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw size={24} className="animate-spin" style={{ color: 'rgba(212,175,55,0.9)' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg font-sans-custom" style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}>
        <AlertCircle size={20} style={{ color: 'rgba(248,113,113,0.9)' }} />
        <span className="text-sm" style={{ color: 'rgba(248,113,113,0.8)' }}>{error}</span>
        <button
          onClick={loadRates}
          className="ml-auto text-xs underline font-sans-custom"
          style={{ color: 'rgba(248,113,113,0.9)' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(248,113,113,0.7)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(248,113,113,0.9)'}
        >
          Reintentar
        </button>
      </div>
    );
  }

  // Group rates by category in the defined order
  const grouped = SERVICE_CATEGORY_ORDER.map((catCode) => {
    const meta = SERVICE_CATEGORY_META[catCode] || { name: catCode, icon: 'circle' };
    const catRates = rates.filter((r) => r.category === catCode);
    return {
      code: catCode,
      name: meta.name,
      rates: catRates,
    };
  }).filter((g) => g.rates.length > 0);

  return (
    <div className="space-y-4">
      <div className="mb-2">
        <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>
          Valores que se pagan a los trabajadores por cada tipo de servicio
        </p>
      </div>

      {/* Configuración de porcentaje para valores personalizados */}
      <div className="p-4 rounded-lg font-sans-custom" style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-xs mb-1" style={{ color: 'rgba(242,240,237,0.6)' }}>
              Porcentaje de pago para valores personalizados
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={customValuePercentage}
                onChange={(e) => setCustomValuePercentage(Number(e.target.value))}
                className="w-24 px-3 py-2 rounded-md text-sm focus:outline-none transition-colors font-sans-custom"
                style={{ background: 'rgba(8,8,8,1)', border: '1px solid rgba(212,175,55,0.3)', color: 'rgba(242,240,237,0.8)' }}
                onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.9)'}
                onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.3)'}
              />
              <span className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.6)' }}>%</span>
            </div>
          </div>
          <button
            onClick={handleUpdateCustomValuePercentage}
            disabled={savingPercentage}
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 font-sans-custom"
            style={{ background: 'rgba(212,175,55,0.9)', color: 'rgba(8,8,8,0.9)' }}
            onMouseEnter={e => !(e.currentTarget as HTMLButtonElement).disabled && ((e.currentTarget as HTMLElement).style.background = 'rgba(212,175,55,1)')}
            onMouseLeave={e => !(e.currentTarget as HTMLButtonElement).disabled && ((e.currentTarget as HTMLElement).style.background = 'rgba(212,175,55,0.9)')}
          >
            {savingPercentage ? 'Guardando...' : 'Actualizar'}
          </button>
        </div>
        <p className="text-xs mt-2" style={{ color: 'rgba(242,240,237,0.4)' }}>
          Este porcentaje se aplicará cuando se ingrese un valor personalizado en una cotización
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
            service_code: r.category + (r.subcategory ? '_' + r.subcategory : '') + (r.difficulty_level ? '_' + r.difficulty_level : ''),
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
