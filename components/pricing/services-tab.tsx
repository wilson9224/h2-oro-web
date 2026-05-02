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
          onClick={loadServices}
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

  // Group services by category in the defined order
  const grouped = SERVICE_CATEGORY_ORDER.map((catCode) => {
    const meta = SERVICE_CATEGORY_META[catCode] || { name: catCode, icon: 'circle' };
    const catServices = services.filter((s) => s.category === catCode);
    return {
      code: catCode,
      name: meta.name,
      services: catServices,
    };
  }).filter((g) => g.services.length > 0);

  return (
    <div className="space-y-4">
      <div className="mb-2">
        <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>
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
            service_code: s.category + (s.subcategory ? '_' + s.subcategory : '') + (s.difficulty_level ? '_' + s.difficulty_level : ''),
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
