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
    if (diff === 0) return (
      <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: 'rgba(242,240,237,0.3)' }}>
        <Minus size={10} /> Sin cambio
      </span>
    );
    const positive = diff > 0;
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: positive ? 'rgba(252,165,165,0.85)' : 'rgba(110,231,183,0.85)' }}>
        {positive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(10,10,10,0.88)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md my-auto rounded-2xl font-sans-custom flex flex-col"
        style={{
          background: 'rgba(18,16,14,0.98)',
          border: '1px solid rgba(255,255,255,0.09)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
          maxHeight: 'calc(100vh - 2rem)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.2)' }}>
              <RefreshCw size={14} style={{ color: 'rgba(251,191,36,0.85)' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'rgba(242,240,237,0.88)' }}>Recotizar con precios del día</p>
              <p className="text-[10px] uppercase tracking-[0.1em]" style={{ color: 'rgba(242,240,237,0.3)' }}>Actualización de precios</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl transition-all" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(242,240,237,0.5)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* Aviso vencimiento */}
          <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.18)' }}>
            <AlertTriangle size={13} className="shrink-0 mt-0.5" style={{ color: 'rgba(251,191,36,0.8)' }} />
            <div>
              <p className="text-xs font-semibold mb-0.5" style={{ color: 'rgba(251,191,36,0.9)' }}>Cotización vencida</p>
              <p className="text-[11px]" style={{ color: 'rgba(251,191,36,0.55)' }}>
                Fue creada el {new Date(quotation.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}. Los precios del oro cambian a diario — se recalculará con los valores actuales.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs" style={{ color: 'rgba(242,240,237,0.3)' }}>Cargando precios actuales...</div>
          ) : (
            <>
              {/* Tabla comparativa */}
              <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {/* Encabezado */}
                <div className="grid grid-cols-3 px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                  {['Concepto', 'Anterior', 'Nuevo'].map((h, i) => (
                    <span key={h} className={`text-[10px] uppercase tracking-wider font-semibold ${i === 1 ? 'text-center' : i === 2 ? 'text-right' : ''}`} style={{ color: 'rgba(242,240,237,0.25)' }}>{h}</span>
                  ))}
                </div>
                {/* Filas */}
                {[
                  { label: 'Metal', old: oldMetalPriceCop, nuevo: newMetalPriceCop },
                  ...(oldAlloyCop > 0 || newAlloyCop > 0 ? [{ label: 'Liga', old: oldAlloyCop, nuevo: newAlloyCop }] : []),
                  { label: 'Piedras', old: quotation.stones_total_cop ?? 0, nuevo: quotation.stones_total_cop ?? 0 },
                  { label: 'M. de obra', old: quotation.labor_total_cop ?? 0, nuevo: quotation.labor_total_cop ?? 0 },
                ].map((row) => (
                  <div key={row.label} className="grid grid-cols-3 px-4 py-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <span className="text-xs" style={{ color: 'rgba(242,240,237,0.5)' }}>{row.label}</span>
                    <span className="text-center text-[11px]" style={{ color: 'rgba(242,240,237,0.3)' }}>{formatCOP(row.old)}</span>
                    <span className="text-right text-xs font-semibold" style={{ color: 'rgba(242,240,237,0.75)' }}>{formatCOP(row.nuevo)}</span>
                  </div>
                ))}
                {/* Total */}
                <div className="grid grid-cols-3 px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(212,175,55,0.04)' }}>
                  <span className="text-xs font-semibold" style={{ color: 'rgba(242,240,237,0.85)' }}>Total</span>
                  <span className="text-center text-[11px]" style={{ color: 'rgba(242,240,237,0.35)' }}>{formatCOP(oldTotalCop)}</span>
                  <span className="text-right text-xs font-bold" style={{ color: 'rgba(251,191,36,0.9)' }}>{formatCOP(newTotalCop)}</span>
                </div>
              </div>

              {/* Diferencias */}
              <div className="space-y-1.5">
                {[
                  { label: 'Diferencia en metal:', diff: metalDiff },
                  { label: 'Diferencia total:', diff: totalDiff },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between px-1">
                    <span className="text-xs" style={{ color: 'rgba(242,240,237,0.35)' }}>{item.label}</span>
                    <DiffBadge diff={item.diff} />
                  </div>
                ))}
              </div>

              {error && (
                <div className="p-3 rounded-xl text-xs" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'rgba(252,165,165,0.85)' }}>{error}</div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 flex gap-3 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(242,240,237,0.5)', border: '1px solid rgba(255,255,255,0.07)' }}>
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || saving}
            className="flex-1 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-[0.08em] transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #FBD232, #D4AF37)', color: '#1A1200' }}
          >
            {saving ? 'Actualizando...' : 'Confirmar recotización'}
          </button>
        </div>
      </div>
    </div>
  );
}
