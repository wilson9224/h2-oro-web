'use client';

import { useMemo } from 'react';
import { usePricing } from '@/hooks/use-pricing';
import { formatPriceCOP } from '@/lib/pricing/calculations';
import { SERVICE_CATEGORY_META, SERVICE_CATEGORY_ORDER, DIFFICULTY_LABELS } from '@/lib/pricing/types';
import type { LaborItem } from '@/lib/quotation/types';

const FIXED_PRICE_CATEGORIES = ['casting', '3d_printing'];

interface Props {
  laborItems: LaborItem[];
  setLaborItems: (items: LaborItem[]) => void;
}

export default function LaborSection({ laborItems, setLaborItems }: Props) {
  const { services } = usePricing();

  // Group services by category, pick one representative per category
  const categories = useMemo(() => {
    const grouped: Record<string, typeof services> = {};
    for (const s of services) {
      if (!grouped[s.service_category]) grouped[s.service_category] = [];
      grouped[s.service_category].push(s);
    }

    return SERVICE_CATEGORY_ORDER.filter((cat) => grouped[cat]).map((cat) => ({
      code: cat,
      meta: SERVICE_CATEGORY_META[cat] ?? { name: cat, icon: 'wrench' },
      services: grouped[cat],
      isFixed: FIXED_PRICE_CATEGORIES.includes(cat),
    }));
  }, [services]);

  const isSelected = (cat: string) =>
    laborItems.some((i) => i.service_category === cat);

  const getItem = (cat: string): LaborItem | undefined =>
    laborItems.find((i) => i.service_category === cat);

  const toggleCategory = (cat: string, catName: string, isFixed: boolean, catServices: typeof services) => {
    if (isSelected(cat)) {
      setLaborItems(laborItems.filter((i) => i.service_category !== cat));
      return;
    }

    // Build initial labor item
    const fixedService = catServices.find((s) => s.difficulty_level === null);
    const initialPrice = fixedService?.price_cop ?? 0;
    const newItem: LaborItem = {
      service_category: cat,
      service_name: catName,
      service_code: fixedService?.service_code ?? cat,
      has_difficulty: !isFixed,
      difficulty_level: isFixed ? null : null,
      price_cop: isFixed ? initialPrice : 0,
      other_value: null,
      effective_price: isFixed ? initialPrice : 0,
    };
    setLaborItems([...laborItems, newItem]);
  };

  const updateItem = (cat: string, changes: Partial<LaborItem>) => {
    setLaborItems(
      laborItems.map((item) => {
        if (item.service_category !== cat) return item;
        const updated = { ...item, ...changes };
        // Recalculate effective_price
        if (changes.other_value !== undefined && changes.other_value !== null && changes.other_value > 0) {
          updated.effective_price = changes.other_value;
        } else if (changes.difficulty_level !== undefined || changes.other_value === null) {
          const targetDiff = changes.difficulty_level ?? updated.difficulty_level;
          if (targetDiff) {
            const matchService = services.find(
              (s) => s.service_category === cat && s.difficulty_level === targetDiff
            );
            updated.effective_price = matchService?.price_cop ?? 0;
            updated.service_code = matchService?.service_code ?? updated.service_code;
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

  const totalLabor = laborItems.reduce((acc, i) => acc + i.effective_price, 0);

  return (
    <div className="space-y-5">
      <h3 className="text-xs tracking-widest uppercase text-charcoal-400 border-b border-white/5 pb-2">
        Mano de Obra
      </h3>

      <div className="space-y-3">
        {categories.map((cat) => {
          const selected = isSelected(cat.code);
          const item = getItem(cat.code);

          return (
            <div
              key={cat.code}
              className={`border rounded-md overflow-hidden transition-all ${
                selected ? 'border-gold-500/20 bg-gold-500/5' : 'border-white/5 bg-charcoal-800'
              }`}
            >
              {/* Header row */}
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
                      <path
                        d="M3 8l4 4 6-6"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
                <span
                  className={`text-sm flex-1 ${selected ? 'text-cream-200' : 'text-charcoal-300'}`}
                >
                  {cat.meta.name}
                </span>
                {selected && item && (
                  <span className="text-sm font-medium text-gold-400">
                    {formatPriceCOP(item.effective_price)}
                  </span>
                )}
                {cat.isFixed && !selected && (
                  <span className="text-xs text-charcoal-500">
                    {formatPriceCOP(
                      cat.services.find((s) => s.difficulty_level === null)?.price_cop ?? 0
                    )}
                  </span>
                )}
              </div>

              {/* Expanded: difficulty + other value */}
              {selected && !cat.isFixed && item && (
                <div className="px-4 pb-3 space-y-3 border-t border-white/5">
                  {/* Difficulty selector */}
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
                            onClick={() =>
                              updateItem(cat.code, {
                                difficulty_level: level,
                                other_value: null,
                              })
                            }
                            className={`flex-1 py-1.5 rounded text-xs border transition-all ${
                              item.difficulty_level === level
                                ? 'bg-gold-500/10 border-gold-500/30 text-gold-400'
                                : 'bg-charcoal-800 border-white/5 text-charcoal-400 hover:border-white/10'
                            }`}
                          >
                            <span className="block">{DIFFICULTY_LABELS[level]}</span>
                            <span className="block text-[10px] opacity-70">
                              {formatPriceCOP(svc.price_cop)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Otro valor */}
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

      {/* Total */}
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
