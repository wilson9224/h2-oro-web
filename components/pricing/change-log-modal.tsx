'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, RefreshCw, Filter } from 'lucide-react';
import type { PricingChangeLog } from '@/lib/pricing/types';
import { fetchChangeLog } from '@/lib/pricing/queries';
import { formatPriceCOP } from '@/lib/pricing/calculations';

interface ChangeLogModalProps {
  onClose: () => void;
}

const TABLE_LABELS: Record<string, string> = {
  pricing_metals: 'Metales',
  pricing_services: 'Servicios',
  pricing_worker_rates: 'Pagos Trabajadores',
};

const FIELD_LABELS: Record<string, string> = {
  international_price_per_gram: 'Precio Internacional',
  purchase_percentage: '% Compra',
  purchase_base_price: 'Precio Base Compra',
  client_sale_percentage: '% Venta Cliente',
  client_sale_base_price: 'Precio Base Venta Cliente',
  jeweler_sale_percentage: '% Venta Joyero',
  jeweler_sale_base_price: 'Precio Base Venta Joyero',
  merma_percentage: '% Merma',
  price_cop: 'Precio (Cobro)',
  rate_cop: 'Tarifa (Pago)',
};

function formatFieldValue(fieldName: string, value: string | null): string {
  if (value === null || value === '') return '—';
  if (fieldName.includes('percentage')) return `${value}%`;
  if (fieldName.includes('price') || fieldName.includes('rate') || fieldName === 'price_cop' || fieldName === 'rate_cop') {
    const num = Number(value);
    return isNaN(num) ? value : formatPriceCOP(num);
  }
  return value;
}

export default function ChangeLogModal({ onClose }: ChangeLogModalProps) {
  const [logs, setLogs] = useState<PricingChangeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | undefined>(undefined);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchChangeLog(filter, 50);
      setLogs(data);
    } catch (err) {
      console.error('Error loading change log:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-charcoal-800 border border-white/10 rounded-lg w-full max-w-3xl max-h-[80vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h2 className="text-cream-200 font-semibold text-base">Historial de Cambios</h2>
          <button
            onClick={onClose}
            className="text-charcoal-400 hover:text-charcoal-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5">
          <Filter size={14} className="text-charcoal-400" />
          <span className="text-xs text-charcoal-400">Filtrar:</span>
          <button
            onClick={() => setFilter(undefined)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              !filter ? 'bg-gold-500/10 text-gold-400' : 'text-charcoal-400 hover:bg-white/5'
            }`}
          >
            Todos
          </button>
          {Object.entries(TABLE_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                filter === key ? 'bg-gold-500/10 text-gold-400' : 'text-charcoal-400 hover:bg-white/5'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw size={20} className="animate-spin text-gold-500" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-charcoal-400 text-sm">No hay cambios registrados</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-charcoal-400 uppercase tracking-wider">Fecha</th>
                  <th className="text-left px-3 py-2.5 text-xs font-medium text-charcoal-400 uppercase tracking-wider">Sección</th>
                  <th className="text-left px-3 py-2.5 text-xs font-medium text-charcoal-400 uppercase tracking-wider">Campo</th>
                  <th className="text-right px-3 py-2.5 text-xs font-medium text-charcoal-400 uppercase tracking-wider">Anterior</th>
                  <th className="text-right px-3 py-2.5 text-xs font-medium text-charcoal-400 uppercase tracking-wider">Nuevo</th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-charcoal-400 uppercase tracking-wider">Usuario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02]">
                    <td className="px-5 py-2.5 text-charcoal-300 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('es-CO', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-charcoal-700 text-charcoal-300">
                        {TABLE_LABELS[log.table_name] || log.table_name}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-charcoal-300">
                      {FIELD_LABELS[log.field_name] || log.field_name}
                    </td>
                    <td className="px-3 py-2.5 text-right text-charcoal-400">
                      {formatFieldValue(log.field_name, log.old_value)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-cream-200 font-medium">
                      {formatFieldValue(log.field_name, log.new_value)}
                    </td>
                    <td className="px-5 py-2.5 text-charcoal-300">
                      {log.changed_by
                        ? `${log.changed_by.first_name} ${log.changed_by.last_name}`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
