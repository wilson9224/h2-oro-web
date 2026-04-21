'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import type { PricingService } from '@/lib/pricing/types';
import { SERVICE_CATEGORY_META, SERVICE_CATEGORY_ORDER } from '@/lib/pricing/types';
import { fetchServices, updateServicePrice } from '@/lib/pricing/queries';
import ServiceCategoryCard from './service-category-card';

interface ServicesTabProps {
  userId: string;
}

export default function ServicesTab({ userId }: ServicesTabProps) {
  const [services, setServices] = useState<PricingService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadServices = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchServices();
      setServices(data);
    } catch (err) {
      console.error('Error loading services:', err);
      setError('Error al cargar las tarifas de servicios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const handleSave = async (updates: { id: string; newValue: number; oldValue: number }[]) => {
    for (const u of updates) {
      await updateServicePrice(u.id, u.newValue, userId, u.oldValue);
    }
    await loadServices();
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
        <button onClick={loadServices} className="ml-auto text-xs text-red-400 hover:text-red-300 underline">
          Reintentar
        </button>
      </div>
    );
  }

  // Group services by category in the defined order
  const grouped = SERVICE_CATEGORY_ORDER.map((catCode) => {
    const meta = SERVICE_CATEGORY_META[catCode] || { name: catCode, icon: 'circle' };
    const catServices = services.filter((s) => s.service_category === catCode);
    return {
      code: catCode,
      name: meta.name,
      services: catServices,
    };
  }).filter((g) => g.services.length > 0);

  return (
    <div className="space-y-4">
      <div className="mb-2">
        <p className="text-sm text-charcoal-400">
          Valores que se cobran al cliente por cada tipo de servicio
        </p>
      </div>

      {grouped.map((group) => (
        <ServiceCategoryCard
          key={group.code}
          categoryName={group.name}
          categoryCode={group.code}
          valueLabel="Precio"
          services={group.services.map((s) => ({
            id: s.id,
            service_code: s.service_code,
            service_name: s.service_name,
            difficulty_level: s.difficulty_level,
            value: s.price_cop,
            unit: s.price_unit,
            updated_at: s.updated_at,
            updated_by: s.updated_by,
          }))}
          onSave={handleSave}
        />
      ))}
    </div>
  );
}
