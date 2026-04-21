'use client';

import { AlertTriangle, CheckCircle } from 'lucide-react';
import { formatPriceCOP } from '@/lib/pricing/calculations';
import type { QuotationFormState } from '@/lib/quotation/types';

interface Props {
  form: QuotationFormState;
  setClientProvidesMetal: (v: boolean) => void;
  setClientMetalWeight: (v: string) => void;
  setClientMetalPurity: (v: string) => void;
}

export default function ClientMetalSection({
  form,
  setClientProvidesMetal,
  setClientMetalWeight,
  setClientMetalPurity,
}: Props) {
  const isGold = form.metal_type === 'gold';
  const hasExcess = form.client_provides_metal && form.pending_metal_gr < 0;
  const hasPending = form.client_provides_metal && form.pending_metal_gr > 0;

  return (
    <div className="space-y-5">
      <h3 className="text-xs tracking-widest uppercase text-charcoal-400 border-b border-white/5 pb-2">
        ¿El cliente entrega metal?
      </h3>

      {/* Toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setClientProvidesMetal(true)}
          className={`flex-1 py-2 rounded-md text-sm border transition-all ${
            form.client_provides_metal
              ? 'bg-gold-500/10 border-gold-500/30 text-gold-400'
              : 'bg-charcoal-800 border-white/5 text-charcoal-300 hover:border-white/10'
          }`}
        >
          Sí
        </button>
        <button
          type="button"
          onClick={() => setClientProvidesMetal(false)}
          className={`flex-1 py-2 rounded-md text-sm border transition-all ${
            !form.client_provides_metal
              ? 'bg-gold-500/10 border-gold-500/30 text-gold-400'
              : 'bg-charcoal-800 border-white/5 text-charcoal-300 hover:border-white/10'
          }`}
        >
          No
        </button>
      </div>

      {form.client_provides_metal && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Peso metal cliente */}
            <div>
              <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
                Peso metal cliente (gr) *
              </label>
              <input
                type="number"
                value={form.client_metal_weight_gr}
                onChange={(e) => setClientMetalWeight(e.target.value)}
                placeholder="ej: 8.0"
                step="0.1"
                min="0"
                className="w-full px-3 py-2.5 bg-charcoal-800 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-500 focus:outline-none focus:border-gold-500/30"
              />
            </div>

            {/* Ley metal cliente */}
            <div>
              <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
                Ley metal cliente{isGold && <span className="ml-1 normal-case text-charcoal-500">(k)</span>} *
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={form.client_metal_purity}
                  onChange={(e) => setClientMetalPurity(e.target.value)}
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

            {/* % de metal cliente (calculado) */}
            <div>
              <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
                % de metal cliente
              </label>
              <div className="px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-charcoal-300 select-none">
                {form.client_metal_purity_pct > 0
                  ? `${form.client_metal_purity_pct.toFixed(1)}%`
                  : '—'}
              </div>
            </div>

            {/* Metal pendiente (calculado) */}
            <div>
              <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
                Metal pendiente (oro puro 24k)
              </label>
              <div
                className={`px-3 py-2.5 border rounded-md text-sm select-none ${
                  hasExcess
                    ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                    : hasPending
                    ? 'bg-charcoal-900 border-white/5 text-cream-200'
                    : 'bg-charcoal-900 border-white/5 text-charcoal-300'
                }`}
              >
                {form.client_pure_metal_gr > 0 || form.client_metal_weight_gr
                  ? `${Math.abs(form.pending_metal_gr).toFixed(3)} gr`
                  : '—'}
              </div>
            </div>
          </div>

          {/* Alerta de exceso */}
          {hasExcess && (
            <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-md p-3">
              <AlertTriangle size={16} className="text-yellow-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-yellow-300 font-medium">El cliente entrega más metal del necesario</p>
                <p className="text-xs text-yellow-400/80 mt-0.5">
                  Exceso: <strong>{form.metal_excess_gr.toFixed(3)} gr</strong> de{' '}
                  {isGold ? 'oro puro 24k' : 'plata pura 999'}
                </p>
              </div>
            </div>
          )}

          {/* Metal pendiente con valor */}
          {hasPending && (
            <div className="flex items-start gap-3 bg-charcoal-800/50 border border-white/5 rounded-md p-3">
              <CheckCircle size={16} className="text-gold-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-charcoal-400 uppercase tracking-widest">Valor metal pendiente</p>
                <p className="text-base font-semibold text-cream-200 mt-0.5">
                  {formatPriceCOP(form.pending_metal_value_cop)}
                </p>
                <p className="text-[11px] text-charcoal-500 mt-0.5">
                  Incluye liga + {form.pending_metal_gr.toFixed(3)} gr de metal puro faltante
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
