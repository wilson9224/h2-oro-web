'use client';

import { useState, useEffect } from 'react';
import { X, RefreshCw, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { QuotationRecord } from '@/lib/quotation/types';
// supabase client used for update on handleConfirm
import {
  calcMetalPrice,
  calcAlloyBreakdown,
} from '@/lib/quotation/calculations';
import { fetchMetals } from '@/lib/pricing/queries';
import type { PricingMetal } from '@/lib/pricing/types';

const supabase = createClient();

const formatCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

interface ModalRequoteProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  quotation: QuotationRecord;
}

export default function ModalRequote({ isOpen, onClose, onSuccess, quotation }: ModalRequoteProps) {
  const [metals, setMetals] = useState<PricingMetal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Recalculated values
  const [newMetalPriceCop, setNewMetalPriceCop] = useState(0);
  const [newAlloyCop, setNewAlloyCop] = useState(0);
  const [newTotalCop, setNewTotalCop] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetchMetals()
      .then((data) => setMetals(data))
      .catch(() => setError('Error al cargar precios actuales'))
      .finally(() => setLoading(false));
  }, [isOpen]);

  // Recalculate whenever metals load
  useEffect(() => {
    if (!metals.length) return;

    const metalRow = metals.find(m => m.metal_code === quotation.metal_type);

    const basePrice = metalRow?.jeweler_sale_base_price ?? metalRow?.international_price_per_gram ?? 0;
    const newMetal = calcMetalPrice(basePrice, quotation.metal_purity_pct, quotation.total_weight_gr);
    setNewMetalPriceCop(newMetal);

    // Alloy (liga) only for gold
    let newAlloy = 0;
    if (quotation.metal_type === 'gold' && quotation.gold_color) {
      const breakdown = calcAlloyBreakdown(
        quotation.gold_color,
        quotation.total_weight_gr,
        quotation.metal_purity_pct,
        metals,
        'jeweler',
      );
      newAlloy = breakdown.total_cop;
    }
    setNewAlloyCop(newAlloy);

    const stonesTotal = quotation.stones_total_cop ?? 0;
    const laborTotal = quotation.labor_total_cop ?? 0;
    setNewTotalCop(newMetal + newAlloy + stonesTotal + laborTotal);
  }, [metals, quotation]);

  const oldMetalPriceCop = quotation.metal_price_cop ?? 0;
  const oldAlloyCop = quotation.alloy_price_cop ?? 0;
  const oldTotalCop = quotation.total_cop ?? 0;

  const metalDiff = newMetalPriceCop - oldMetalPriceCop;
  const totalDiff = newTotalCop - oldTotalCop;

  const DiffBadge = ({ diff }: { diff: number }) => {
    if (diff === 0) return <span className="inline-flex items-center gap-1 text-xs text-charcoal-400"><Minus size={11} /> Sin cambio</span>;
    const positive = diff > 0;
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium ${positive ? 'text-red-400' : 'text-emerald-400'}`}>
        {positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
        {positive ? '+' : ''}{formatCOP(diff)}
      </span>
    );
  };

  const handleConfirm = async () => {
    setSaving(true);
    setError('');
    try {
      const { error: updErr } = await supabase
        .from('quotations')
        .update({
          metal_price_cop: newMetalPriceCop,
          alloy_price_cop: newAlloyCop,
          total_cop: newTotalCop,
          updated_at: new Date().toISOString(),
        })
        .eq('id', quotation.id);
      if (updErr) throw new Error(updErr.message);

      // Also update order total
      if (quotation.order_id) {
        await supabase
          .from('orders')
          .update({ total_amount_cop: newTotalCop })
          .eq('id', quotation.order_id);
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al recotizar');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-charcoal-900 border border-white/10 rounded-xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <RefreshCw size={16} className="text-amber-400" />
            <h2 className="text-base font-semibold text-cream-100">Recotizar con precios del día</h2>
          </div>
          <button onClick={onClose} className="text-charcoal-400 hover:text-cream-200">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Expiry warning */}
          <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-300">Cotización vencida</p>
              <p className="text-xs text-amber-400/70 mt-0.5">
                Fue creada el {new Date(quotation.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}.
                Los precios del oro cambian a diario — se recalculará con los valores actuales.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-6 text-center text-sm text-charcoal-400">Cargando precios actuales...</div>
          ) : (
            <>
              {/* Comparison table */}
              <div className="bg-charcoal-800 rounded-lg overflow-hidden">
                <div className="grid grid-cols-3 text-[11px] uppercase tracking-wider text-charcoal-500 px-4 py-2 border-b border-white/5">
                  <span>Concepto</span>
                  <span className="text-center">Anterior</span>
                  <span className="text-right">Nuevo</span>
                </div>
                <div className="divide-y divide-white/5">
                  <div className="grid grid-cols-3 px-4 py-2.5 text-sm">
                    <span className="text-charcoal-300">Metal</span>
                    <span className="text-center text-charcoal-400 text-xs">{formatCOP(oldMetalPriceCop)}</span>
                    <span className="text-right text-cream-200 font-medium">{formatCOP(newMetalPriceCop)}</span>
                  </div>
                  {(oldAlloyCop > 0 || newAlloyCop > 0) && (
                    <div className="grid grid-cols-3 px-4 py-2.5 text-sm">
                      <span className="text-charcoal-300">Liga</span>
                      <span className="text-center text-charcoal-400 text-xs">{formatCOP(oldAlloyCop)}</span>
                      <span className="text-right text-cream-200 font-medium">{formatCOP(newAlloyCop)}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-3 px-4 py-2.5 text-sm">
                    <span className="text-charcoal-300">Piedras</span>
                    <span className="text-center text-charcoal-400 text-xs">{formatCOP(quotation.stones_total_cop ?? 0)}</span>
                    <span className="text-right text-charcoal-400 text-xs">{formatCOP(quotation.stones_total_cop ?? 0)}</span>
                  </div>
                  <div className="grid grid-cols-3 px-4 py-2.5 text-sm">
                    <span className="text-charcoal-300">M. de obra</span>
                    <span className="text-center text-charcoal-400 text-xs">{formatCOP(quotation.labor_total_cop ?? 0)}</span>
                    <span className="text-right text-charcoal-400 text-xs">{formatCOP(quotation.labor_total_cop ?? 0)}</span>
                  </div>
                  <div className="grid grid-cols-3 px-4 py-3 bg-charcoal-700/50 text-sm font-semibold">
                    <span className="text-cream-100">Total</span>
                    <span className="text-center text-charcoal-300">{formatCOP(oldTotalCop)}</span>
                    <span className="text-right text-amber-400">{formatCOP(newTotalCop)}</span>
                  </div>
                </div>
              </div>

              {/* Diff summary */}
              <div className="flex items-center justify-between text-sm px-1">
                <span className="text-charcoal-400">Diferencia en metal:</span>
                <DiffBadge diff={metalDiff} />
              </div>
              <div className="flex items-center justify-between text-sm px-1">
                <span className="text-charcoal-400">Diferencia total:</span>
                <DiffBadge diff={totalDiff} />
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-xs text-red-400">{error}</div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-md text-sm bg-charcoal-800 text-charcoal-300 hover:bg-charcoal-700 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || saving}
            className="flex-1 px-4 py-2.5 rounded-md text-sm bg-amber-500 text-charcoal-900 font-semibold hover:bg-amber-400 transition-colors disabled:opacity-50"
          >
            {saving ? 'Actualizando...' : 'Confirmar recotización'}
          </button>
        </div>
      </div>
    </div>
  );
}
