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
    <div className="bg-charcoal-800 border border-white/5 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gold-500/10 flex items-center justify-center">
            <span className="text-gold-400 font-serif font-bold text-lg">
              {metal.metal_code === 'gold' ? 'Au' : metal.metal_code === 'silver' ? 'Ag' : metal.metal_code === 'palladium' ? 'Pd' : 'Cu'}
            </span>
          </div>
          <div>
            <h3 className="text-cream-200 font-semibold text-base">{metal.metal_name}</h3>
            {metal.has_percentages && (
              <span className="text-charcoal-400 text-xs">Con porcentajes de compra/venta</span>
            )}
          </div>
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-gold-400 hover:bg-gold-500/10 transition-colors"
          >
            <Pencil size={14} />
            Editar
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-charcoal-400 hover:bg-white/5 transition-colors"
            >
              <X size={14} />
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-gold-500 text-charcoal-900 hover:bg-gold-400 transition-colors disabled:opacity-50"
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
          <label className="block text-xs text-charcoal-400 mb-1.5">
            Precio Internacional (COP/gramo)
          </label>
          {editing ? (
            <input
              type="number"
              value={internationalPrice}
              onChange={(e) => setInternationalPrice(Number(e.target.value))}
              className="w-full px-3 py-2 bg-charcoal-900 border border-gold-500/30 rounded-md text-cream-200 text-sm focus:outline-none focus:border-gold-500 transition-colors"
              min={0}
              step={0.01}
            />
          ) : (
            <p className="text-cream-200 text-lg font-semibold">
              {formatPriceCOP(internationalPrice)}
              <span className="text-charcoal-400 text-xs font-normal ml-1">/gramo</span>
            </p>
          )}
        </div>

        {/* Porcentajes y campos calculados (solo para has_percentages) */}
        {metal.has_percentages && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2 border-t border-white/5">
            {/* Compra */}
            <div className="space-y-3">
              <h4 className="text-xs font-medium text-charcoal-300 uppercase tracking-wider">Compra</h4>
              <div>
                <label className="block text-xs text-charcoal-400 mb-1">Porcentaje</label>
                {editing ? (
                  <div className="relative">
                    <input
                      type="number"
                      value={purchasePercentage ?? ''}
                      onChange={(e) => setPurchasePercentage(e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2 pr-8 bg-charcoal-900 border border-gold-500/30 rounded-md text-cream-200 text-sm focus:outline-none focus:border-gold-500 transition-colors"
                      min={0}
                      max={200}
                      step={0.01}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400 text-sm">%</span>
                  </div>
                ) : (
                  <p className="text-cream-200 text-sm">{formatPercentage(purchasePercentage)}</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-charcoal-400 mb-1">Precio Base</label>
                <div className="px-3 py-2 bg-charcoal-700/50 rounded-md">
                  <p className="text-cream-300 text-sm font-medium">{formatPriceCOP(purchaseBase)}</p>
                </div>
              </div>
            </div>

            {/* Venta Cliente */}
            <div className="space-y-3">
              <h4 className="text-xs font-medium text-charcoal-300 uppercase tracking-wider">Venta Cliente</h4>
              <div>
                <label className="block text-xs text-charcoal-400 mb-1">Porcentaje</label>
                {editing ? (
                  <div className="relative">
                    <input
                      type="number"
                      value={clientSalePercentage ?? ''}
                      onChange={(e) => setClientSalePercentage(e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2 pr-8 bg-charcoal-900 border border-gold-500/30 rounded-md text-cream-200 text-sm focus:outline-none focus:border-gold-500 transition-colors"
                      min={0}
                      max={300}
                      step={0.01}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400 text-sm">%</span>
                  </div>
                ) : (
                  <p className="text-cream-200 text-sm">{formatPercentage(clientSalePercentage)}</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-charcoal-400 mb-1">Precio Base</label>
                <div className="px-3 py-2 bg-charcoal-700/50 rounded-md">
                  <p className="text-cream-300 text-sm font-medium">{formatPriceCOP(clientSaleBase)}</p>
                </div>
              </div>
            </div>

            {/* Venta Joyero */}
            <div className="space-y-3">
              <h4 className="text-xs font-medium text-charcoal-300 uppercase tracking-wider">Venta Joyero</h4>
              <div>
                <label className="block text-xs text-charcoal-400 mb-1">Porcentaje</label>
                {editing ? (
                  <div className="relative">
                    <input
                      type="number"
                      value={jewelerSalePercentage ?? ''}
                      onChange={(e) => setJewelerSalePercentage(e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2 pr-8 bg-charcoal-900 border border-gold-500/30 rounded-md text-cream-200 text-sm focus:outline-none focus:border-gold-500 transition-colors"
                      min={0}
                      max={300}
                      step={0.01}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400 text-sm">%</span>
                  </div>
                ) : (
                  <p className="text-cream-200 text-sm">{formatPercentage(jewelerSalePercentage)}</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-charcoal-400 mb-1">Precio Base</label>
                <div className="px-3 py-2 bg-charcoal-700/50 rounded-md">
                  <p className="text-cream-300 text-sm font-medium">{formatPriceCOP(jewelerSaleBase)}</p>
                </div>
              </div>
            </div>

            {/* Merma */}
            <div className="space-y-3">
              <h4 className="text-xs font-medium text-charcoal-300 uppercase tracking-wider">Merma</h4>
              <div>
                <label className="block text-xs text-charcoal-400 mb-1">Porcentaje</label>
                {editing ? (
                  <div className="relative">
                    <input
                      type="number"
                      value={mermaPercentage ?? ''}
                      onChange={(e) => setMermaPercentage(e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2 pr-8 bg-charcoal-900 border border-gold-500/30 rounded-md text-cream-200 text-sm focus:outline-none focus:border-gold-500 transition-colors"
                      min={0}
                      max={50}
                      step={0.01}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400 text-sm">%</span>
                  </div>
                ) : (
                  <p className="text-cream-200 text-sm">{formatPercentage(mermaPercentage)}</p>
                )}
              </div>
              <div className="text-xs text-charcoal-500 italic">
                Pérdida inevitable durante fabricación
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer - last updated info */}
      {updatedByName && (
        <div className="px-5 py-3 border-t border-white/5 flex items-center gap-2 text-xs text-charcoal-400">
          <Clock size={12} />
          <span>Última actualización: {updatedAtFormatted} por {updatedByName}</span>
        </div>
      )}
    </div>
  );
}
