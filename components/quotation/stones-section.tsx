'use client';

import { Plus, Trash2 } from 'lucide-react';
import { formatPriceCOP } from '@/lib/pricing/calculations';
import { STONE_TYPES, STONE_CUTS } from '@/lib/quotation/types';
import type { QuotationFormState, StoneRow } from '@/lib/quotation/types';

interface Props {
  form: QuotationFormState;
  setHasStones: (v: boolean) => void;
  addStoneRow: () => void;
  updateStoneRow: (id: string, changes: Partial<StoneRow>) => void;
  removeStoneRow: (id: string) => void;
}

export default function StonesSection({
  form,
  setHasStones,
  addStoneRow,
  updateStoneRow,
  removeStoneRow,
}: Props) {
  return (
    <div className="space-y-5">
      <h3 className="text-xs tracking-widest uppercase text-charcoal-400 border-b border-white/5 pb-2">
        ¿Tiene piedras?
      </h3>

      {/* Toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setHasStones(true)}
          className={`flex-1 py-2 rounded-md text-sm border transition-all ${
            form.has_stones
              ? 'bg-gold-500/10 border-gold-500/30 text-gold-400'
              : 'bg-charcoal-800 border-white/5 text-charcoal-300 hover:border-white/10'
          }`}
        >
          Sí
        </button>
        <button
          type="button"
          onClick={() => setHasStones(false)}
          className={`flex-1 py-2 rounded-md text-sm border transition-all ${
            !form.has_stones
              ? 'bg-gold-500/10 border-gold-500/30 text-gold-400'
              : 'bg-charcoal-800 border-white/5 text-charcoal-300 hover:border-white/10'
          }`}
        >
          No
        </button>
      </div>

      {form.has_stones && (
        <div className="space-y-4">
          {/* Table */}
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs min-w-[700px]">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left py-2 px-2 text-charcoal-400 uppercase tracking-widest font-normal w-20">
                    Entrega cliente
                  </th>
                  <th className="text-left py-2 px-2 text-charcoal-400 uppercase tracking-widest font-normal">
                    Tipo piedra
                  </th>
                  <th className="text-left py-2 px-2 text-charcoal-400 uppercase tracking-widest font-normal">
                    Talla
                  </th>
                  <th className="text-left py-2 px-2 text-charcoal-400 uppercase tracking-widest font-normal w-20">
                    Peso (ct)
                  </th>
                  <th className="text-left py-2 px-2 text-charcoal-400 uppercase tracking-widest font-normal w-16">
                    Cant.
                  </th>
                  <th className="text-left py-2 px-2 text-charcoal-400 uppercase tracking-widest font-normal w-28">
                    Valor/ct
                  </th>
                  <th className="text-right py-2 px-2 text-charcoal-400 uppercase tracking-widest font-normal w-28">
                    Total
                  </th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {form.stones.map((row) => (
                  <StoneRowEditor
                    key={row.id}
                    row={row}
                    onUpdate={(changes) => updateStoneRow(row.id, changes)}
                    onRemove={() => removeStoneRow(row.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {form.stones.length === 0 && (
            <p className="text-sm text-charcoal-500 text-center py-4">
              No se han agregado piedras. Haz clic en &quot;Agregar piedra&quot; para comenzar.
            </p>
          )}

          <button
            type="button"
            onClick={addStoneRow}
            className="inline-flex items-center gap-2 text-sm text-gold-500 hover:text-gold-400 transition-colors"
          >
            <Plus size={14} /> Agregar piedra
          </button>

          {/* Total */}
          {form.stones.length > 0 && (
            <div className="flex justify-between items-center pt-2 border-t border-white/5">
              <span className="text-xs text-charcoal-400 uppercase tracking-widest">
                Precio Total Piedras
              </span>
              <span className="text-base font-semibold text-cream-200">
                {formatPriceCOP(form.stones_total_cop)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Stone row editor ─────────────────────────────────────────────────────────

function StoneRowEditor({
  row,
  onUpdate,
  onRemove,
}: {
  row: StoneRow;
  onUpdate: (changes: Partial<StoneRow>) => void;
  onRemove: () => void;
}) {
  const inputCls =
    'w-full px-2 py-1.5 bg-charcoal-800 border border-white/5 rounded text-xs text-cream-200 placeholder:text-charcoal-500 focus:outline-none focus:border-gold-500/30';
  const selectCls =
    'w-full px-2 py-1.5 bg-charcoal-800 border border-white/5 rounded text-xs text-cream-200 focus:outline-none focus:border-gold-500/30';

  return (
    <tr className="group">
      {/* Entrega cliente */}
      <td className="py-2 px-2">
        <button
          type="button"
          onClick={() => onUpdate({ client_delivers: !row.client_delivers })}
          className={`w-full py-1.5 rounded text-xs border transition-all ${
            row.client_delivers
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-charcoal-800 border-white/5 text-charcoal-400'
          }`}
        >
          {row.client_delivers ? 'Sí' : 'No'}
        </button>
      </td>
      {/* Tipo */}
      <td className="py-2 px-2">
        <select
          value={row.stone_type}
          onChange={(e) => onUpdate({ stone_type: e.target.value })}
          className={selectCls}
        >
          <option value="">Tipo...</option>
          {STONE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </td>
      {/* Talla */}
      <td className="py-2 px-2">
        <select
          value={row.cut}
          onChange={(e) => onUpdate({ cut: e.target.value })}
          className={selectCls}
        >
          <option value="">Talla...</option>
          {STONE_CUTS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </td>
      {/* Peso ct */}
      <td className="py-2 px-2">
        <input
          type="number"
          value={row.weight_ct || ''}
          onChange={(e) => onUpdate({ weight_ct: parseFloat(e.target.value) || 0 })}
          placeholder="0.00"
          step="0.001"
          min="0"
          className={inputCls}
        />
      </td>
      {/* Cantidad */}
      <td className="py-2 px-2">
        <input
          type="number"
          value={row.quantity || ''}
          onChange={(e) => onUpdate({ quantity: parseInt(e.target.value) || 0 })}
          placeholder="1"
          min="1"
          className={inputCls}
        />
      </td>
      {/* Valor/ct */}
      <td className="py-2 px-2">
        <input
          type="number"
          value={row.price_per_ct || ''}
          onChange={(e) => onUpdate({ price_per_ct: parseFloat(e.target.value) || 0 })}
          placeholder="0"
          min="0"
          disabled={row.client_delivers}
          className={`${inputCls} disabled:opacity-40 disabled:cursor-not-allowed`}
        />
      </td>
      {/* Total */}
      <td className="py-2 px-2 text-right">
        <span className={`text-xs font-medium ${row.client_delivers ? 'text-charcoal-500' : 'text-cream-200'}`}>
          {row.client_delivers ? '—' : formatPriceCOP(row.total_cop)}
        </span>
      </td>
      {/* Remove */}
      <td className="py-2 px-1">
        <button
          type="button"
          onClick={onRemove}
          className="text-charcoal-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={13} />
        </button>
      </td>
    </tr>
  );
}
