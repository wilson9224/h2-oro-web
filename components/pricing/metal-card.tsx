'use client';

import { useState } from 'react';
import { Pencil, Save, X, Clock } from 'lucide-react';
import type { PricingMetal } from '@/lib/pricing/types';
import {
  calcPurchaseBasePrice,
  calcClientSalePrice,
  calcJewelerSalePrice,
  formatPriceCOP,
  formatPercentage,
} from '@/lib/pricing/calculations';

interface MetalCardProps {
  metal: PricingMetal;
  onSave: (id: string, updates: Record<string, number | null>, previousValues: Record<string, string | null>) => Promise<void>;
}

export default function MetalCard({ metal, onSave }: MetalCardProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [internationalPrice, setInternationalPrice] = useState(metal.international_price_per_gram);
  const [purchasePercentage, setPurchasePercentage] = useState(metal.purchase_percentage);
  const [clientSalePercentage, setClientSalePercentage] = useState(metal.client_sale_percentage);
  const [jewelerSalePercentage, setJewelerSalePercentage] = useState(metal.jeweler_sale_percentage);
  const [mermaPercentage, setMermaPercentage] = useState(metal.merma_percentage);

  // Calculated values (real-time)
  const purchaseBase = calcPurchaseBasePrice(internationalPrice, purchasePercentage);
  const clientSaleBase = calcClientSalePrice(internationalPrice, clientSalePercentage);
  const jewelerSaleBase = calcJewelerSalePrice(internationalPrice, jewelerSalePercentage);

  const handleCancel = () => {
    setInternationalPrice(metal.international_price_per_gram);
    setPurchasePercentage(metal.purchase_percentage);
    setClientSalePercentage(metal.client_sale_percentage);
    setJewelerSalePercentage(metal.jeweler_sale_percentage);
    setMermaPercentage(metal.merma_percentage);
    setEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: Record<string, number | null> = {
        international_price_per_gram: internationalPrice,
      };
      const previousValues: Record<string, string | null> = {
        international_price_per_gram: String(metal.international_price_per_gram),
      };

      if (metal.has_percentages) {
        updates.purchase_percentage = purchasePercentage;
        updates.purchase_base_price = purchaseBase;
        updates.client_sale_percentage = clientSalePercentage;
        updates.client_sale_base_price = clientSaleBase;
        updates.jeweler_sale_percentage = jewelerSalePercentage;
        updates.jeweler_sale_base_price = jewelerSaleBase;
        updates.merma_percentage = mermaPercentage;

        previousValues.purchase_percentage = metal.purchase_percentage !== null ? String(metal.purchase_percentage) : null;
        previousValues.client_sale_percentage = metal.client_sale_percentage !== null ? String(metal.client_sale_percentage) : null;
        previousValues.jeweler_sale_percentage = metal.jeweler_sale_percentage !== null ? String(metal.jeweler_sale_percentage) : null;
        previousValues.merma_percentage = metal.merma_percentage !== null ? String(metal.merma_percentage) : null;
      }

      await onSave(metal.id, updates, previousValues);
      setEditing(false);
    } catch (err) {
      console.error('Error saving metal:', err);
    } finally {
      setSaving(false);
    }
  };

  const updatedByName = metal.updated_by
    ? `${metal.updated_by.first_name} ${metal.updated_by.last_name}`
    : null;

  const updatedAtFormatted = metal.updated_at
    ? new Date(metal.updated_at).toLocaleString('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="rounded-lg overflow-hidden font-sans-custom" style={{ background: 'rgba(8,8,8,1)', border: '1px solid rgba(255,255,255,0.05)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.1)' }}>
            <span className="font-bold text-lg font-sans-custom" style={{ color: 'rgba(212,175,55,0.9)' }}>
              {metal.metal_code === 'gold' ? 'Au' : metal.metal_code === 'silver' ? 'Ag' : metal.metal_code === 'palladium' ? 'Pd' : 'Cu'}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-base font-sans-custom" style={{ color: 'rgba(242,240,237,0.8)' }}>{metal.metal_name}</h3>
            {metal.has_percentages && (
              <span className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Con porcentajes de compra/venta</span>
            )}
          </div>
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors font-sans-custom"
            style={{ color: 'rgba(212,175,55,0.9)' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(212,175,55,0.1)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
          >
            <Pencil size={14} />
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
              <X size={14} />
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
              <Save size={14} />
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-4">
        {/* Precio Internacional */}
        <div>
          <label className="block text-xs mb-1.5 font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>
            Precio Internacional (COP/gramo)
          </label>
          {editing ? (
            <input
              type="number"
              value={internationalPrice}
              onChange={(e) => setInternationalPrice(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-md text-sm focus:outline-none transition-colors font-sans-custom"
              style={{ background: 'rgba(8,8,8,1)', border: '1px solid rgba(212,175,55,0.3)', color: 'rgba(242,240,237,0.8)' }}
              onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.9)'}
              onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.3)'}
              min={0}
              step={0.01}
            />
          ) : (
            <p className="text-lg font-semibold font-sans-custom" style={{ color: 'rgba(242,240,237,0.8)' }}>
              {formatPriceCOP(internationalPrice)}
              <span className="text-xs font-normal ml-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>/gramo</span>
            </p>
          )}
        </div>

        {/* Porcentajes y campos calculados (solo para has_percentages) */}
        {metal.has_percentages && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {/* Compra */}
            <div className="space-y-3">
              <h4 className="text-xs font-medium uppercase tracking-wider font-sans-custom" style={{ color: 'rgba(242,240,237,0.6)' }}>Compra</h4>
              <div>
                <label className="block text-xs mb-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Porcentaje</label>
                {editing ? (
                  <div className="relative">
                    <input
                      type="number"
                      value={purchasePercentage ?? ''}
                      onChange={(e) => setPurchasePercentage(e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2 pr-8 rounded-md text-sm focus:outline-none transition-colors font-sans-custom"
                      style={{ background: 'rgba(8,8,8,1)', border: '1px solid rgba(212,175,55,0.3)', color: 'rgba(242,240,237,0.8)' }}
                      onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.9)'}
                      onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.3)'}
                      min={0}
                      max={200}
                      step={0.01}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>%</span>
                  </div>
                ) : (
                  <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.8)' }}>{formatPercentage(purchasePercentage)}</p>
                )}
              </div>
              <div>
                <label className="block text-xs mb-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Precio Base</label>
                <div className="px-3 py-2 rounded-md" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <p className="text-sm font-medium font-sans-custom" style={{ color: 'rgba(242,240,237,0.7)' }}>{formatPriceCOP(purchaseBase)}</p>
                </div>
              </div>
            </div>

            {/* Venta Cliente */}
            <div className="space-y-3">
              <h4 className="text-xs font-medium uppercase tracking-wider font-sans-custom" style={{ color: 'rgba(242,240,237,0.6)' }}>Venta Cliente</h4>
              <div>
                <label className="block text-xs mb-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Porcentaje</label>
                {editing ? (
                  <div className="relative">
                    <input
                      type="number"
                      value={clientSalePercentage ?? ''}
                      onChange={(e) => setClientSalePercentage(e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2 pr-8 rounded-md text-sm focus:outline-none transition-colors font-sans-custom"
                      style={{ background: 'rgba(8,8,8,1)', border: '1px solid rgba(212,175,55,0.3)', color: 'rgba(242,240,237,0.8)' }}
                      onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.9)'}
                      onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.3)'}
                      min={0}
                      max={300}
                      step={0.01}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>%</span>
                  </div>
                ) : (
                  <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.8)' }}>{formatPercentage(clientSalePercentage)}</p>
                )}
              </div>
              <div>
                <label className="block text-xs mb-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Precio Base</label>
                <div className="px-3 py-2 rounded-md" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <p className="text-sm font-medium font-sans-custom" style={{ color: 'rgba(242,240,237,0.7)' }}>{formatPriceCOP(clientSaleBase)}</p>
                </div>
              </div>
            </div>

            {/* Venta Joyero */}
            <div className="space-y-3">
              <h4 className="text-xs font-medium uppercase tracking-wider font-sans-custom" style={{ color: 'rgba(242,240,237,0.6)' }}>Venta Joyero</h4>
              <div>
                <label className="block text-xs mb-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Porcentaje</label>
                {editing ? (
                  <div className="relative">
                    <input
                      type="number"
                      value={jewelerSalePercentage ?? ''}
                      onChange={(e) => setJewelerSalePercentage(e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2 pr-8 rounded-md text-sm focus:outline-none transition-colors font-sans-custom"
                      style={{ background: 'rgba(8,8,8,1)', border: '1px solid rgba(212,175,55,0.3)', color: 'rgba(242,240,237,0.8)' }}
                      onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.9)'}
                      onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.3)'}
                      min={0}
                      max={300}
                      step={0.01}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>%</span>
                  </div>
                ) : (
                  <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.8)' }}>{formatPercentage(jewelerSalePercentage)}</p>
                )}
              </div>
              <div>
                <label className="block text-xs mb-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Precio Base</label>
                <div className="px-3 py-2 rounded-md" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <p className="text-sm font-medium font-sans-custom" style={{ color: 'rgba(242,240,237,0.7)' }}>{formatPriceCOP(jewelerSaleBase)}</p>
                </div>
              </div>
            </div>

            {/* Merma */}
            <div className="space-y-3">
              <h4 className="text-xs font-medium uppercase tracking-wider font-sans-custom" style={{ color: 'rgba(242,240,237,0.6)' }}>Merma</h4>
              <div>
                <label className="block text-xs mb-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Porcentaje</label>
                {editing ? (
                  <div className="relative">
                    <input
                      type="number"
                      value={mermaPercentage ?? ''}
                      onChange={(e) => setMermaPercentage(e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2 pr-8 rounded-md text-sm focus:outline-none transition-colors font-sans-custom"
                      style={{ background: 'rgba(8,8,8,1)', border: '1px solid rgba(212,175,55,0.3)', color: 'rgba(242,240,237,0.8)' }}
                      onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.9)'}
                      onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.3)'}
                      min={0}
                      max={50}
                      step={0.01}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>%</span>
                  </div>
                ) : (
                  <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.8)' }}>{formatPercentage(mermaPercentage)}</p>
                )}
              </div>
              <div className="text-xs italic font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>
                Pérdida inevitable durante fabricación
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer - last updated info */}
      {updatedByName && (
        <div className="px-5 py-3 flex items-center gap-2 text-xs font-sans-custom" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: 'rgba(242,240,237,0.4)' }}>
          <Clock size={12} />
          <span>Última actualización: {updatedAtFormatted} por {updatedByName}</span>
        </div>
      )}
    </div>
  );
}
