'use client';

import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { useState } from 'react';
import { formatPriceCOP } from '@/lib/pricing/calculations';
import { GOLD_COLOR_LABELS } from '@/lib/quotation/types';
import type { QuotationFormState, GoldColor, MetalType } from '@/lib/quotation/types';

interface Props {
  form: QuotationFormState;
  setMetalType: (v: MetalType) => void;
  setMetalPurity: (v: string) => void;
  setEstimatedWeight: (v: string) => void;
  setGoldColor: (v: GoldColor | '') => void;
}

export default function MetalSection({
  form,
  setMetalType,
  setMetalPurity,
  setEstimatedWeight,
  setGoldColor,
}: Props) {
  const [showAlloyDetail, setShowAlloyDetail] = useState(false);

  const isGold = form.metal_type === 'gold';

  return (
    <div className="space-y-5">
      <h3 className="text-xs tracking-widest uppercase text-charcoal-400 border-b border-white/5 pb-2">
        Metal
      </h3>

      {/* Tipo de metal */}
      <div>
        <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
          Tipo de metal *
        </label>
        <div className="flex gap-2">
          {(['gold', 'silver'] as MetalType[]).map((mt) => (
            <button
              key={mt}
              type="button"
              onClick={() => setMetalType(mt)}
              className={`flex-1 py-2.5 rounded-md text-sm border transition-all ${
                form.metal_type === mt
                  ? 'bg-gold-500/10 border-gold-500/30 text-gold-400'
                  : 'bg-charcoal-800 border-white/5 text-charcoal-300 hover:border-white/10'
              }`}
            >
              {mt === 'gold' ? 'Oro' : 'Plata'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Ley del metal */}
        <div>
          <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
            Ley del metal *{isGold && <span className="ml-1 normal-case text-charcoal-500">(k)</span>}
          </label>
          <div className="relative">
            <input
              type="number"
              value={form.metal_purity}
              onChange={(e) => setMetalPurity(e.target.value)}
              placeholder={isGold ? 'ej: 18.0' : 'ej: 925'}
              step={isGold ? '0.1' : '1'}
              min="0"
              max={isGold ? '24' : '999'}
              className="w-full px-3 py-2.5 bg-charcoal-800 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-500 focus:outline-none focus:border-gold-500/30"
            />
            {isGold && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-charcoal-500">k</span>
            )}
          </div>
        </div>

        {/* % de metal (calculado) */}
        <div>
          <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
            % de metal
          </label>
          <div className="px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-charcoal-300 select-none">
            {form.metal_purity_pct > 0 ? `${form.metal_purity_pct.toFixed(1)}%` : '—'}
          </div>
        </div>

        {/* Peso aproximado */}
        <div>
          <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
            Peso aproximado (gr) *
          </label>
          <input
            type="number"
            value={form.estimated_weight_gr}
            onChange={(e) => setEstimatedWeight(e.target.value)}
            placeholder="ej: 5.0"
            step="0.1"
            min="0"
            className="w-full px-3 py-2.5 bg-charcoal-800 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-500 focus:outline-none focus:border-gold-500/30"
          />
        </div>

        {/* Peso total con merma (calculado) */}
        <div>
          <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
            Peso total con merma (gr)
          </label>
          <div className="px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-charcoal-300 select-none">
            {form.total_weight_gr > 0 ? `${form.total_weight_gr.toFixed(2)} gr` : '—'}
          </div>
        </div>
      </div>

      {/* Color oro */}
      {isGold && (
        <div>
          <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
            Color del oro *
          </label>
          <div className="flex gap-2">
            {(Object.entries(GOLD_COLOR_LABELS) as [GoldColor, string][]).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setGoldColor(key)}
                className={`flex-1 py-2 rounded-md text-sm border transition-all ${
                  form.gold_color === key
                    ? 'bg-gold-500/10 border-gold-500/30 text-gold-400'
                    : 'bg-charcoal-800 border-white/5 text-charcoal-300 hover:border-white/10'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Precio del metal (calculado) */}
      <div className="bg-charcoal-800/50 border border-white/5 rounded-md p-4 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-charcoal-400 uppercase tracking-widest">Precio del metal</span>
          <span className="text-base font-semibold text-cream-200">
            {form.metal_price_cop > 0 ? formatPriceCOP(form.metal_price_cop) : '—'}
          </span>
        </div>
      </div>

      {/* Liga (solo oro) */}
      {isGold && form.gold_color && form.alloy_breakdown && (
        <div className="border border-white/5 rounded-md overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAlloyDetail(!showAlloyDetail)}
            className="w-full flex items-center justify-between px-4 py-3 bg-charcoal-800/50 text-sm hover:bg-charcoal-800 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Info size={14} className="text-charcoal-400" />
              <span className="text-charcoal-300">Liga (metales de aleación)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-cream-200">
                {formatPriceCOP(form.alloy_price_cop)}
              </span>
              {showAlloyDetail ? (
                <ChevronUp size={14} className="text-charcoal-400" />
              ) : (
                <ChevronDown size={14} className="text-charcoal-400" />
              )}
            </div>
          </button>

          {showAlloyDetail && (
            <div className="px-4 py-3 bg-charcoal-900/50 space-y-2">
              {form.alloy_breakdown.silver_gr > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-charcoal-400">
                    Plata — {form.alloy_breakdown.silver_gr.toFixed(3)} gr
                  </span>
                  <span className="text-charcoal-300">
                    {formatPriceCOP(form.alloy_breakdown.silver_price_cop)}
                  </span>
                </div>
              )}
              {form.alloy_breakdown.copper_gr > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-charcoal-400">
                    Cobre — {form.alloy_breakdown.copper_gr.toFixed(3)} gr
                  </span>
                  <span className="text-charcoal-300">
                    {formatPriceCOP(form.alloy_breakdown.copper_price_cop)}
                  </span>
                </div>
              )}
              {form.alloy_breakdown.palladium_gr > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-charcoal-400">
                    Paladio — {form.alloy_breakdown.palladium_gr.toFixed(3)} gr
                  </span>
                  <span className="text-charcoal-300">
                    {formatPriceCOP(form.alloy_breakdown.palladium_price_cop)}
                  </span>
                </div>
              )}
              {form.alloy_breakdown.copper_price_cop === 0 && form.alloy_breakdown.copper_gr > 0 && (
                <p className="text-[10px] text-yellow-500/70 flex items-center gap-1">
                  <Info size={10} /> El precio del cobre es $0 — configúralo en Precios &gt; Otros metales
                </p>
              )}
              {form.alloy_breakdown.palladium_price_cop === 0 && form.alloy_breakdown.palladium_gr > 0 && (
                <p className="text-[10px] text-yellow-500/70 flex items-center gap-1">
                  <Info size={10} /> El precio del paladio es $0 — configúralo en Precios &gt; Otros metales
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
