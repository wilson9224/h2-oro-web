'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import type { PricingMetal } from '@/lib/pricing/types';
import { fetchMetals, updateMetal } from '@/lib/pricing/queries';
import MetalCard from './metal-card';

interface MetalsTabProps {
  userId: string;
}

export default function MetalsTab({ userId }: MetalsTabProps) {
  const [metals, setMetals] = useState<PricingMetal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMetals = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMetals();
      setMetals(data);
    } catch (err) {
      console.error('Error loading metals:', err);
      setError('Error al cargar los precios de metales');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetals();
  }, []);

  const handleSave = async (
    id: string,
    updates: Record<string, number | null>,
    previousValues: Record<string, string | null>
  ) => {
    await updateMetal(id, updates, userId, previousValues);
    await loadMetals();
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
          onClick={loadMetals}
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

  // Separate metals with percentages from simple ones
  const metalsWithPercentages = metals.filter((m) => m.has_percentages);
  const simpleMetals = metals.filter((m) => !m.has_percentages);

  return (
    <div className="space-y-6">
      {/* Metals with percentages (Gold, Silver) */}
      {metalsWithPercentages.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium font-sans-custom uppercase tracking-wider" style={{ color: 'rgba(242,240,237,0.6)' }}>
            Metales con porcentajes de compra/venta
          </h3>
          {metalsWithPercentages.map((metal) => (
            <MetalCard key={metal.id} metal={metal} onSave={handleSave} />
          ))}
        </div>
      )}

      {/* Simple metals (Palladium, Copper) */}
      {simpleMetals.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium font-sans-custom uppercase tracking-wider" style={{ color: 'rgba(242,240,237,0.6)' }}>
            Otros metales
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {simpleMetals.map((metal) => (
              <MetalCard key={metal.id} metal={metal} onSave={handleSave} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
