'use client';

import { useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { usePricing } from '@/hooks/use-pricing';
import { formatPriceCOP } from '@/lib/pricing/calculations';
import { SERVICE_CATEGORY_META, SERVICE_CATEGORY_ORDER, DIFFICULTY_LABELS } from '@/lib/pricing/types';
import type { LaborItem } from '@/lib/quotation/types';

const FIXED_PRICE_CATEGORIES = ['casting', '3d_printing'];
const PER_STONE_CATEGORY = 'setting';

interface Props {
  laborItems: LaborItem[];
  setLaborItems: (items: LaborItem[]) => void;
}

export default function LaborSection({ laborItems, setLaborItems }: Props) {
  const { services } = usePricing();

  const categories = useMemo(() => {
    const grouped: Record<string, typeof services> = {};
    for (const s of services) {
      if (!grouped[s.category]) grouped[s.category] = [];
      grouped[s.category].push(s);
    }
    return SERVICE_CATEGORY_ORDER.filter((cat) => grouped[cat]).map((cat) => ({
      code: cat,
      meta: SERVICE_CATEGORY_META[cat] ?? { name: cat, icon: 'wrench' },
      services: grouped[cat],
      isFixed: FIXED_PRICE_CATEGORIES.includes(cat),
      isPerStone: cat === PER_STONE_CATEGORY,
    }));
  }, [services]);

  // ── Helpers generales ──────────────────────────────────────────────────────

  const itemsForCat = (cat: string) => laborItems.filter((i) => i.category === cat);
  const isSelected = (cat: string) => itemsForCat(cat).length > 0;
  const getItem = (cat: string): LaborItem | undefined => laborItems.find((i) => i.category === cat);

  // ── Categorías normales ────────────────────────────────────────────────────

  const toggleCategory = (cat: string, catName: string, isFixed: boolean, catServices: typeof services) => {
    if (isSelected(cat)) {
      setLaborItems(laborItems.filter((i) => i.category !== cat));
      return;
    }
    const fixedService = catServices.find((s) => s.difficulty_level === null);
    const initialPrice = fixedService?.price_cop ?? 0;
    const newItem: LaborItem = {
      category: cat,
      subcategory: fixedService?.subcategory ?? null,
      service_name: catName,
      service_code: fixedService ? cat + (fixedService.subcategory ? '_' + fixedService.subcategory : '') : cat,
      has_difficulty: !isFixed,
      difficulty_level: null,
      price_cop: isFixed ? initialPrice : 0,
      other_value: null,
      effective_price: isFixed ? initialPrice : 0,
      price_unit: 'per_service',
    };
    setLaborItems([...laborItems, newItem]);
  };

  const updateItem = (cat: string, changes: Partial<LaborItem>) => {
    setLaborItems(
      laborItems.map((item) => {
        if (item.category !== cat) return item;
        const updated = { ...item, ...changes };
        if (changes.other_value !== undefined && changes.other_value !== null && changes.other_value > 0) {
          updated.effective_price = changes.other_value;
        } else if (changes.difficulty_level !== undefined || changes.other_value === null) {
          const targetDiff = changes.difficulty_level ?? updated.difficulty_level;
          if (targetDiff) {
            const matchService = services.find(
              (s) => s.category === cat && s.difficulty_level === targetDiff
            );
            updated.effective_price = matchService?.price_cop ?? 0;
            updated.service_code = matchService ? cat + (matchService.subcategory ? '_' + matchService.subcategory : '') + (matchService.difficulty_level ? '_' + matchService.difficulty_level : '') : updated.service_code;
            updated.price_cop = matchService?.price_cop ?? 0;
          }
          if (updated.other_value === null || updated.other_value === undefined) {
            updated.effective_price = updated.price_cop;
          }
        }
        return updated;
      })
    );
  };

  // ── Engaste (per_stone, filas múltiples) ───────────────────────────────────

  const settingServices = useMemo(
    () => services.filter((s) => s.category === PER_STONE_CATEGORY && s.difficulty_level === null),
    [services]
  );

  const addSettingRow = () => {
    const first = settingServices[0];
    if (!first) return;
    const newRow: LaborItem = {
      category: PER_STONE_CATEGORY,
      subcategory: first.subcategory ?? null,
      service_name: first.service_name,
      service_code: PER_STONE_CATEGORY + (first.subcategory ? '_' + first.subcategory : ''),
      has_difficulty: false,
      difficulty_level: null,
      price_cop: first.price_cop,
      other_value: null,
      quantity: 1,
      price_unit: 'per_stone',
      effective_price: first.price_cop * 1,
    };
    setLaborItems([...laborItems, newRow]);
  };

  const updateSettingRow = (idx: number, changes: Partial<LaborItem>) => {
    const settingRows = itemsForCat(PER_STONE_CATEGORY);
    const row = settingRows[idx];
    if (!row) return;

    const updated = { ...row, ...changes };

    // Si cambia el service_code, actualizar precio
    if (changes.service_code) {
      const svc = settingServices.find((s) => changes.service_code === (s.category + (s.subcategory ? '_' + s.subcategory : '')));
      if (svc) {
        updated.price_cop = svc.price_cop;
        updated.service_name = svc.service_name;
        updated.subcategory = svc.subcategory ?? null;
      }
    }
    updated.effective_price = updated.price_cop * (updated.quantity ?? 1);

    // Reemplazar la fila correcta en laborItems
    const globalIdx = laborItems.indexOf(row);
    const next = [...laborItems];
    next[globalIdx] = updated;
    setLaborItems(next);
  };

  const removeSettingRow = (idx: number) => {
    const settingRows = itemsForCat(PER_STONE_CATEGORY);
    const row = settingRows[idx];
    if (!row) return;
    setLaborItems(laborItems.filter((i) => i !== row));
  };

  const settingTotal = itemsForCat(PER_STONE_CATEGORY).reduce((a, i) => a + i.effective_price, 0);
  const settingSelected = isSelected(PER_STONE_CATEGORY);

  const totalLabor = laborItems.reduce((acc, i) => acc + i.effective_price, 0);

  return (
    <div className="space-y-5">
      <h3 className="text-xs tracking-widest uppercase text-charcoal-400 border-b border-white/5 pb-2">
        Mano de Obra
      </h3>

      <div className="space-y-3">
        {categories.map((cat) => {
          // ── Engaste: UI especial ──
          if (cat.isPerStone) {
            const rows = itemsForCat(cat.code);
            return (
              <div
                key={cat.code}
                className={`border rounded-md overflow-hidden transition-all ${
                  settingSelected ? 'border-gold-500/20 bg-gold-500/5' : 'border-white/5 bg-charcoal-800'
                }`}
              >
                {/* Header */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (settingSelected) {
                        setLaborItems(laborItems.filter((i) => i.category !== cat.code));
                      } else {
                        addSettingRow();
                      }
                    }}
                    className={`w-4 h-4 rounded border transition-all shrink-0 ${
                      settingSelected
                        ? 'bg-gold-500 border-gold-500'
                        : 'border-charcoal-600 hover:border-gold-500/50'
                    }`}
                  >
                    {settingSelected && (
                      <svg viewBox="0 0 16 16" className="w-full h-full text-charcoal-900">
                        <path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                  <span className={`text-sm flex-1 ${settingSelected ? 'text-cream-200' : 'text-charcoal-300'}`}>
                    {cat.meta.name}
                  </span>
                  {settingSelected && (
                    <span className="text-sm font-medium text-gold-400">
                      {formatPriceCOP(settingTotal)}
                    </span>
                  )}
                </div>

                {/* Filas de engaste */}
                {settingSelected && (
                  <div className="px-4 pb-4 space-y-2 border-t border-white/5 pt-3">
                    {/* Cabecera columnas */}
                    <div className="grid grid-cols-[1fr_80px_80px_28px] gap-2 mb-1">
                      <span className="text-[10px] uppercase tracking-widest text-charcoal-500">Tipo de engaste</span>
                      <span className="text-[10px] uppercase tracking-widest text-charcoal-500 text-center">Cant.</span>
                      <span className="text-[10px] uppercase tracking-widest text-charcoal-500 text-right">Subtotal</span>
                      <span />
                    </div>

                    {rows.map((row, idx) => (
                      <div key={idx} className="grid grid-cols-[1fr_80px_80px_28px] gap-2 items-center">
                        {/* Selector de tipo */}
                        <select
                          value={row.service_code}
                          onChange={(e) => updateSettingRow(idx, { service_code: e.target.value })}
                          className="px-2 py-1.5 bg-charcoal-800 border border-white/5 rounded text-sm text-cream-200 focus:outline-none focus:border-gold-500/30"
                        >
                          {settingServices.map((s) => (
                            <option key={s.category + (s.subcategory ? '_' + s.subcategory : '')} value={s.category + (s.subcategory ? '_' + s.subcategory : '')}>
                              {s.service_name} — {formatPriceCOP(s.price_cop)}/piedra
                            </option>
                          ))}
                        </select>

                        {/* Cantidad */}
                        <input
                          type="number"
                          min="1"
                          value={row.quantity ?? 1}
                          onChange={(e) =>
                            updateSettingRow(idx, { quantity: Math.max(1, parseInt(e.target.value) || 1) })
                          }
                          className="px-2 py-1.5 bg-charcoal-800 border border-white/5 rounded text-sm text-cream-200 text-center focus:outline-none focus:border-gold-500/30"
                        />

                        {/* Subtotal */}
                        <span className="text-sm text-gold-400 text-right font-medium">
                          {formatPriceCOP(row.effective_price)}
                        </span>

                        {/* Eliminar fila */}
                        <button
                          type="button"
                          onClick={() => removeSettingRow(idx)}
                          className="flex items-center justify-center text-charcoal-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}

                    {/* Agregar fila */}
                    <button
                      type="button"
                      onClick={addSettingRow}
                      className="mt-1 flex items-center gap-1.5 text-xs text-charcoal-400 hover:text-gold-400 transition-colors"
                    >
                      <Plus size={13} />
                      Agregar tipo de engaste
                    </button>
                  </div>
                )}
              </div>
            );
          }

          // ── Categorías normales ──
          const selected = isSelected(cat.code);
          const item = getItem(cat.code);

          return (
            <div
              key={cat.code}
              className={`border rounded-md overflow-hidden transition-all ${
                selected ? 'border-gold-500/20 bg-gold-500/5' : 'border-white/5 bg-charcoal-800'
              }`}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  type="button"
                  onClick={() => toggleCategory(cat.code, cat.meta.name, cat.isFixed, cat.services)}
                  className={`w-4 h-4 rounded border transition-all shrink-0 ${
                    selected
                      ? 'bg-gold-500 border-gold-500'
                      : 'border-charcoal-600 hover:border-gold-500/50'
                  }`}
                >
                  {selected && (
                    <svg viewBox="0 0 16 16" className="w-full h-full text-charcoal-900">
                      <path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
                <span className={`text-sm flex-1 ${selected ? 'text-cream-200' : 'text-charcoal-300'}`}>
                  {cat.meta.name}
                </span>
                {selected && item && (
                  <span className="text-sm font-medium text-gold-400">
                    {formatPriceCOP(item.effective_price)}
                  </span>
                )}
                {cat.isFixed && !selected && (
                  <span className="text-xs text-charcoal-500">
                    {formatPriceCOP(cat.services.find((s) => s.difficulty_level === null)?.price_cop ?? 0)}
                  </span>
                )}
              </div>

              {selected && !cat.isFixed && item && (
                <div className="px-4 pb-3 space-y-3 border-t border-white/5">
                  <div className="pt-3">
                    <label className="block text-[10px] uppercase tracking-widest text-charcoal-400 mb-2">
                      Nivel de dificultad
                    </label>
                    <div className="flex gap-2">
                      {(['easy', 'medium', 'hard'] as const).map((level) => {
                        const svc = cat.services.find((s) => s.difficulty_level === level);
                        if (!svc) return null;
                        return (
                          <button
                            key={level}
                            type="button"
                            onClick={() => updateItem(cat.code, { difficulty_level: level, other_value: null })}
                            className={`flex-1 py-1.5 rounded text-xs border transition-all ${
                              item.difficulty_level === level
                                ? 'bg-gold-500/10 border-gold-500/30 text-gold-400'
                                : 'bg-charcoal-800 border-white/5 text-charcoal-400 hover:border-white/10'
                            }`}
                          >
                            <span className="block">{DIFFICULTY_LABELS[level]}</span>
                            <span className="block text-[10px] opacity-70">{formatPriceCOP(svc.price_cop)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-charcoal-400 mb-2">
                      Otro valor (reemplaza el precio seleccionado)
                    </label>
                    <input
                      type="number"
                      value={item.other_value ?? ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? null : parseFloat(e.target.value) || 0;
                        updateItem(cat.code, { other_value: val });
                      }}
                      placeholder="Ingresa un valor personalizado..."
                      min="0"
                      className="w-full px-3 py-2 bg-charcoal-800 border border-white/5 rounded text-sm text-cream-200 placeholder:text-charcoal-500 focus:outline-none focus:border-gold-500/30"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {laborItems.length > 0 && (
        <div className="flex justify-between items-center pt-2 border-t border-white/5">
          <span className="text-xs text-charcoal-400 uppercase tracking-widest">
            Valor Mano de Obra
          </span>
          <span className="text-base font-semibold text-cream-200">
            {formatPriceCOP(totalLabor)}
          </span>
        </div>
      )}
    </div>
  );
}
