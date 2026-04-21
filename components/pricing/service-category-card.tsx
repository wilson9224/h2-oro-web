'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Save, Pencil, X, Clock } from 'lucide-react';
import { formatPriceCOP } from '@/lib/pricing/calculations';
import { DIFFICULTY_LABELS } from '@/lib/pricing/types';

interface ServiceItem {
  id: string;
  service_code: string;
  service_name: string;
  difficulty_level: string | null;
  value: number;
  unit: string;
  updated_at: string;
  updated_by?: { id: string; first_name: string; last_name: string } | null;
}

interface ServiceCategoryCardProps {
  categoryName: string;
  categoryCode: string;
  services: ServiceItem[];
  valueLabel: string;
  onSave: (updates: { id: string; newValue: number; oldValue: number }[]) => Promise<void>;
}

export default function ServiceCategoryCard({
  categoryName,
  categoryCode,
  services,
  valueLabel,
  onSave,
}: ServiceCategoryCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, number>>({});

  const startEditing = () => {
    const initial: Record<string, number> = {};
    services.forEach((s) => {
      initial[s.id] = s.value;
    });
    setEditValues(initial);
    setEditing(true);
  };

  const handleCancel = () => {
    setEditValues({});
    setEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = services
        .filter((s) => editValues[s.id] !== undefined && editValues[s.id] !== s.value)
        .map((s) => ({
          id: s.id,
          newValue: editValues[s.id],
          oldValue: s.value,
        }));

      if (updates.length > 0) {
        await onSave(updates);
      }
      setEditing(false);
    } catch (err) {
      console.error('Error saving services:', err);
    } finally {
      setSaving(false);
    }
  };

  const unitBadge = (unit: string) => {
    const label = unit === 'per_stone' ? 'por piedra' : 'por servicio';
    const color = unit === 'per_stone' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400';
    return (
      <span className={`text-[10px] px-1.5 py-0.5 rounded ${color}`}>
        {label}
      </span>
    );
  };

  // Get the most recent update info across all services in this category
  const latestUpdate = services.reduce<ServiceItem | null>((latest, s) => {
    if (!latest || new Date(s.updated_at) > new Date(latest.updated_at)) return s;
    return latest;
  }, null);

  const updatedByName = latestUpdate?.updated_by
    ? `${latestUpdate.updated_by.first_name} ${latestUpdate.updated_by.last_name}`
    : null;

  return (
    <div className="bg-charcoal-800 border border-white/5 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <h3 className="text-cream-200 font-semibold text-sm">{categoryName}</h3>
          <span className="text-charcoal-500 text-xs">
            {services.length} {services.length === 1 ? 'servicio' : 'servicios'}
          </span>
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-charcoal-400" />
        ) : (
          <ChevronDown size={16} className="text-charcoal-400" />
        )}
      </button>

      {/* Body */}
      {expanded && (
        <div className="border-t border-white/5">
          {/* Edit controls */}
          <div className="flex items-center justify-end px-5 py-2 border-b border-white/5">
            {!editing ? (
              <button
                onClick={startEditing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-gold-400 hover:bg-gold-500/10 transition-colors"
              >
                <Pencil size={13} />
                Editar
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-charcoal-400 hover:bg-white/5 transition-colors"
                >
                  <X size={13} />
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-gold-500 text-charcoal-900 hover:bg-gold-400 transition-colors disabled:opacity-50"
                >
                  <Save size={13} />
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            )}
          </div>

          {/* Services list */}
          <div className="divide-y divide-white/5">
            {services.map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between px-5 py-3 gap-4"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-cream-300 text-sm truncate">
                    {service.difficulty_level
                      ? DIFFICULTY_LABELS[service.difficulty_level] || service.difficulty_level
                      : service.service_name}
                  </span>
                  {unitBadge(service.unit)}
                </div>
                <div className="flex-shrink-0">
                  {editing ? (
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-400 text-xs">$</span>
                      <input
                        type="number"
                        value={editValues[service.id] ?? service.value}
                        onChange={(e) =>
                          setEditValues((prev) => ({
                            ...prev,
                            [service.id]: Number(e.target.value),
                          }))
                        }
                        className="w-36 pl-7 pr-3 py-1.5 bg-charcoal-900 border border-gold-500/30 rounded-md text-cream-200 text-sm text-right focus:outline-none focus:border-gold-500 transition-colors"
                        min={0}
                        step={100}
                      />
                    </div>
                  ) : (
                    <span className={`text-sm font-medium ${service.value === 0 ? 'text-charcoal-500 italic' : 'text-cream-200'}`}>
                      {service.value === 0 ? 'Sin asignar' : formatPriceCOP(service.value)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          {updatedByName && (
            <div className="px-5 py-2.5 border-t border-white/5 flex items-center gap-2 text-xs text-charcoal-400">
              <Clock size={11} />
              <span>
                Última actualización por {updatedByName}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
