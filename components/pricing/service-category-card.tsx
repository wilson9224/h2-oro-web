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
    const label = unit === 'per_stone' ? 'por piedra' : unit === 'per_gram' ? 'por gramo' : 'por servicio';
    const color = unit === 'per_stone' ? 'rgba(168,85,247,0.1)' : unit === 'per_gram' ? 'rgba(212,175,55,0.1)' : 'rgba(59,130,246,0.1)';
    const textColor = unit === 'per_stone' ? 'rgba(168,85,247,0.9)' : unit === 'per_gram' ? 'rgba(212,175,55,0.9)' : 'rgba(59,130,246,0.9)';
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded font-sans-custom" style={{ background: color, color: textColor }}>
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
    <div className="rounded-lg overflow-hidden font-sans-custom" style={{ background: 'rgba(8,8,8,1)', border: '1px solid rgba(255,255,255,0.05)' }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 transition-colors font-sans-custom"
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
      >
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.8)' }}>{categoryName}</h3>
          <span className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>
            {services.length} {services.length === 1 ? 'servicio' : 'servicios'}
          </span>
        </div>
        {expanded ? (
          <ChevronUp size={16} style={{ color: 'rgba(242,240,237,0.4)' }} />
        ) : (
          <ChevronDown size={16} style={{ color: 'rgba(242,240,237,0.4)' }} />
        )}
      </button>

      {/* Body */}
      {expanded && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {/* Edit controls */}
          <div className="flex items-center justify-end px-5 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            {!editing ? (
              <button
                onClick={startEditing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors font-sans-custom"
                style={{ color: 'rgba(212,175,55,0.9)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(212,175,55,0.1)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <Pencil size={13} />
                Editar
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors font-sans-custom"
                  style={{ color: 'rgba(242,240,237,0.4)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <X size={13} />
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-50 font-sans-custom"
                  style={{ background: 'rgba(212,175,55,0.9)', color: 'rgba(8,8,8,0.9)' }}
                  onMouseEnter={e => !(e.currentTarget as HTMLButtonElement).disabled && ((e.currentTarget as HTMLElement).style.background = 'rgba(212,175,55,1)')}
                  onMouseLeave={e => !(e.currentTarget as HTMLButtonElement).disabled && ((e.currentTarget as HTMLElement).style.background = 'rgba(212,175,55,0.9)')}
                >
                  <Save size={13} />
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            )}
          </div>

          {/* Services list */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {services.map((service, index) => (
              <div
                key={service.id}
                className="flex items-center justify-between px-5 py-3 gap-4"
                style={{ borderBottom: index < services.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm truncate font-sans-custom" style={{ color: 'rgba(242,240,237,0.7)' }}>
                    {service.difficulty_level
                      ? DIFFICULTY_LABELS[service.difficulty_level] || service.difficulty_level
                      : service.service_name}
                  </span>
                  {unitBadge(service.unit)}
                </div>
                <div className="flex-shrink-0">
                  {editing ? (
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>$</span>
                      <input
                        type="number"
                        value={editValues[service.id] ?? service.value}
                        onChange={(e) =>
                          setEditValues((prev) => ({
                            ...prev,
                            [service.id]: Number(e.target.value),
                          }))
                        }
                        className="w-36 pl-7 pr-3 py-1.5 rounded-md text-sm text-right focus:outline-none transition-colors font-sans-custom"
                        style={{ background: 'rgba(8,8,8,1)', border: '1px solid rgba(212,175,55,0.3)', color: 'rgba(242,240,237,0.8)' }}
                        onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.9)'}
                        onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.3)'}
                        min={0}
                        step={100}
                      />
                    </div>
                  ) : (
                    <span className="text-sm font-medium font-sans-custom" style={{ color: service.value === 0 ? 'rgba(242,240,237,0.3)' : 'rgba(242,240,237,0.8)' }}>
                      {service.value === 0 ? 'Sin asignar' : formatPriceCOP(service.value)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          {updatedByName && (
            <div className="px-5 py-2.5 flex items-center gap-2 text-xs font-sans-custom" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: 'rgba(242,240,237,0.4)' }}>
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
