'use client';

import { Loader2, Save, ShoppingBag } from 'lucide-react';
import { formatPriceCOP } from '@/lib/pricing/calculations';
import type { QuotationFormState } from '@/lib/quotation/types';

interface Props {
  form: QuotationFormState;
  saving: boolean;
  onSaveDraft: () => void;
  onCreateOrder: () => void;
  variant?: 'sidebar' | 'bottom';
}

export default function QuotationSummary({ form, saving, onSaveDraft, onCreateOrder, variant = 'bottom' }: Props) {
  const isGold = form.metal_type === 'gold';
  const metalValue = form.client_provides_metal
    ? form.pending_metal_value_cop
    : form.metal_price_cop + form.alloy_price_cop;

  const breakdown = (
    <div className="space-y-2">
      {/* Metal */}
      <div className="flex justify-between text-xs" style={{ color: 'rgba(242,240,237,0.4)' }}>
        <span>{form.client_provides_metal ? 'Valor metal pendiente' : 'Precio del metal'}</span>
        <span>{metalValue > 0 ? formatPriceCOP(metalValue) : '—'}</span>
      </div>
      {isGold && form.alloy_price_cop > 0 && !form.client_provides_metal && (
        <div className="flex justify-between text-xs" style={{ color: 'rgba(242,240,237,0.4)' }}>
          <span>Liga</span>
          <span>{formatPriceCOP(form.alloy_price_cop)}</span>
        </div>
      )}
      {form.has_stones && (
        <div className="flex justify-between text-xs" style={{ color: 'rgba(242,240,237,0.4)' }}>
          <span>Piedras</span>
          <span>{form.stones_total_cop > 0 ? formatPriceCOP(form.stones_total_cop) : '—'}</span>
        </div>
      )}
      {form.labor_items.length > 0 && (
        <div className="flex justify-between text-xs" style={{ color: 'rgba(242,240,237,0.4)' }}>
          <span>Mano de obra</span>
          <span>{form.labor_total_cop > 0 ? formatPriceCOP(form.labor_total_cop) : '—'}</span>
        </div>
      )}
      <div className="flex justify-between text-lg font-semibold pt-2 mt-1" style={{ color: 'rgba(242,240,237,0.95)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <span>Total</span>
        <span style={{ color: 'rgba(212,175,55,0.95)' }}>
          {form.total_cop > 0 ? formatPriceCOP(form.total_cop) : '—'}
        </span>
      </div>
    </div>
  );

  const actions = (
    <div className="flex gap-2 mt-4">
      <button
        type="button"
        onClick={onSaveDraft}
        disabled={saving}
        className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 font-sans-custom"
        style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(242,240,237,0.7)' }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        Borrador
      </button>
      <button
        type="button"
        onClick={onCreateOrder}
        disabled={saving || !form.piece_type}
        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-sans-custom"
        style={{ background: 'rgba(212,175,55,0.9)', color: 'rgba(8,8,8,0.9)' }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(212,175,55,1)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(212,175,55,0.9)'}
      >
        <ShoppingBag size={14} />
        Crear Pedido
      </button>
    </div>
  );

  // ── Sidebar variant (desktop right panel) ──
  if (variant === 'sidebar') {
    return (
      <div className="rounded-xl p-5 font-sans-custom space-y-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        {/* Header */}
        <div className="pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs uppercase tracking-widest font-sans-custom" style={{ color: 'rgba(212,175,55,0.5)' }}>Resumen</p>
          {form.piece_type && (
            <p className="text-sm mt-1 font-medium font-sans-custom" style={{ color: 'rgba(242,240,237,0.7)' }}>{form.piece_type}</p>
          )}
          {form.searched_client && (
            <p className="text-xs mt-0.5 font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>
              {form.searched_client.first_name} {form.searched_client.last_name}
            </p>
          )}
        </div>
        {breakdown}
        {actions}
      </div>
    );
  }

  // ── Bottom bar variant (mobile sticky) ──
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 shadow-2xl font-sans-custom" style={{ background: 'rgba(8,8,8,0.97)', borderTop: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)' }}>
      <div className="px-4 pt-3 pb-1 space-y-1.5">
        <div className="flex justify-between text-xs" style={{ color: 'rgba(242,240,237,0.4)' }}>
          <span>{form.client_provides_metal ? 'Metal pendiente' : 'Metal'}</span>
          <span>{metalValue > 0 ? formatPriceCOP(metalValue) : '—'}</span>
        </div>
        {form.has_stones && form.stones_total_cop > 0 && (
          <div className="flex justify-between text-xs" style={{ color: 'rgba(242,240,237,0.4)' }}>
            <span>Piedras</span>
            <span>{formatPriceCOP(form.stones_total_cop)}</span>
          </div>
        )}
        {form.labor_items.length > 0 && form.labor_total_cop > 0 && (
          <div className="flex justify-between text-xs" style={{ color: 'rgba(242,240,237,0.4)' }}>
            <span>M. de obra</span>
            <span>{formatPriceCOP(form.labor_total_cop)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-semibold pt-1.5" style={{ color: 'rgba(242,240,237,0.95)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <span>Total</span>
          <span style={{ color: 'rgba(212,175,55,0.9)' }}>{form.total_cop > 0 ? formatPriceCOP(form.total_cop) : '—'}</span>
        </div>
      </div>
      <div className="px-4 py-3 flex gap-3">
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 font-sans-custom"
          style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(242,240,237,0.7)' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Guardar
        </button>
        <button
          type="button"
          onClick={onCreateOrder}
          disabled={saving || !form.piece_type}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-sans-custom"
          style={{ background: 'rgba(212,175,55,0.9)', color: 'rgba(8,8,8,0.9)' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(212,175,55,1)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(212,175,55,0.9)'}
        >
          <ShoppingBag size={14} />
          Crear Pedido
        </button>
      </div>
    </div>
  );
}
