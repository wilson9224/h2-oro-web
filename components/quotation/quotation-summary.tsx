'use client';

import { Loader2, Save, ShoppingBag } from 'lucide-react';
import { formatPriceCOP } from '@/lib/pricing/calculations';
import type { QuotationFormState } from '@/lib/quotation/types';

interface Props {
  form: QuotationFormState;
  saving: boolean;
  onSaveDraft: () => void;
  onCreateOrder: () => void;
}

export default function QuotationSummary({ form, saving, onSaveDraft, onCreateOrder }: Props) {
  const isGold = form.metal_type === 'gold';
  const metalValue = form.client_provides_metal
    ? form.pending_metal_value_cop
    : form.metal_price_cop + form.alloy_price_cop;

  return (
    <div className="sticky bottom-0 shadow-2xl font-sans-custom" style={{ background: 'rgba(8,8,8,1)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
      {/* Desglose */}
      <div className="px-4 pt-4 pb-2 space-y-1.5 max-w-2xl mx-auto">
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
        <div className="flex justify-between text-base font-semibold pt-2" style={{ color: 'rgba(242,240,237,0.95)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <span>Total Cotización</span>
          <span style={{ color: 'rgba(212,175,55,0.9)' }}>
            {form.total_cop > 0 ? formatPriceCOP(form.total_cop) : '—'}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 flex gap-3 max-w-2xl mx-auto">
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 rounded-md text-sm transition-colors disabled:opacity-50 font-sans-custom"
          style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(242,240,237,0.7)' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Guardar borrador
        </button>
        <button
          type="button"
          onClick={onCreateOrder}
          disabled={saving || !form.piece_type}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-sans-custom"
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
