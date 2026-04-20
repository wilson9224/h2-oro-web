'use client';

import { useState, useCallback, useEffect } from 'react';
import { usePricing } from '@/hooks/use-pricing';
import {
  calcMetalPurityPct,
  calcTotalWeight,
  calcMetalPrice,
  calcAlloyBreakdown,
  calcClientPureMetal,
  calcRequiredPureMetal,
  calcPendingMetal,
  calcPendingMetalValue,
  calcStonesTotalCop,
  calcStoneRowTotal,
  calcLaborTotal,
  calcGrandTotal,
} from '@/lib/quotation/calculations';
import { saveQuotation } from '@/lib/quotation/queries';
import type {
  QuotationFormState,
  StoneRow,
  LaborItem,
  GoldColor,
  MetalType,
  QuoteType,
} from '@/lib/quotation/types';
import { DEFAULT_FORM_STATE } from '@/lib/quotation/types';

export function useQuotationForm(initialState?: Partial<QuotationFormState>) {
  const { metals } = usePricing();
  const [form, setForm] = useState<QuotationFormState>({
    ...DEFAULT_FORM_STATE,
    ...initialState,
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ─── Helper: get base price for selected metal ────────────────────────────
  const getBasePrice = useCallback(
    (metalCode: string) => {
      const m = metals.find((x) => x.metal_code === metalCode);
      if (!m) return 0;
      return form.quote_type === 'client'
        ? (m.client_sale_base_price ?? 0)
        : (m.jeweler_sale_base_price ?? 0);
    },
    [metals, form.quote_type]
  );

  const getMerma = useCallback(
    (metalCode: string) => {
      const m = metals.find((x) => x.metal_code === metalCode);
      return m?.merma_percentage ?? 0;
    },
    [metals]
  );

  // ─── Recalculate all derived values ──────────────────────────────────────
  useEffect(() => {
    if (!form.quote_type || metals.length === 0) return;

    const purityNum = parseFloat(form.metal_purity) || 0;
    const estWeight = parseFloat(form.estimated_weight_gr) || 0;
    const merma = getMerma(form.metal_type);

    const purityPct = calcMetalPurityPct(purityNum, form.metal_type);
    const totalWeight = calcTotalWeight(estWeight, merma);
    const basePrice = getBasePrice(form.metal_type);
    const metalPrice = calcMetalPrice(basePrice, purityPct, totalWeight);

    let alloyBreakdown = null;
    let alloyPrice = 0;
    if (form.metal_type === 'gold' && form.gold_color) {
      alloyBreakdown = calcAlloyBreakdown(
        form.gold_color as GoldColor,
        totalWeight,
        purityPct,
        metals,
        form.quote_type
      );
      alloyPrice = alloyBreakdown.total_cop;
    }

    // Client provides metal
    const clientPurityNum = parseFloat(form.client_metal_purity) || 0;
    const clientWeightNum = parseFloat(form.client_metal_weight_gr) || 0;
    const clientPurityPct = calcMetalPurityPct(clientPurityNum, form.metal_type);
    const clientPure = form.client_provides_metal
      ? calcClientPureMetal(clientWeightNum, clientPurityPct)
      : 0;
    const requiredPure = calcRequiredPureMetal(totalWeight, purityPct);
    const pendingMetal = form.client_provides_metal
      ? calcPendingMetal(requiredPure, clientPure)
      : 0;
    const excessMetal = pendingMetal < 0 ? Math.abs(pendingMetal) : 0;
    const pendingMetalValue = form.client_provides_metal
      ? calcPendingMetalValue(Math.max(pendingMetal, 0), basePrice, alloyPrice)
      : metalPrice + alloyPrice;

    // Stones
    const stonesTotal = calcStonesTotalCop(form.stones);

    // Labor
    const laborTotal = calcLaborTotal(form.labor_items);

    // Grand total
    const grandTotal = form.client_provides_metal
      ? calcGrandTotal(pendingMetalValue, 0, stonesTotal, laborTotal)
      : calcGrandTotal(0, metalPrice + alloyPrice, stonesTotal, laborTotal);

    setForm((prev) => ({
      ...prev,
      metal_purity_pct: purityPct,
      total_weight_gr: totalWeight,
      metal_price_cop: metalPrice,
      alloy_price_cop: alloyPrice,
      alloy_breakdown: alloyBreakdown,
      client_metal_purity_pct: clientPurityPct,
      client_pure_metal_gr: clientPure,
      required_pure_metal_gr: requiredPure,
      pending_metal_gr: pendingMetal,
      metal_excess_gr: excessMetal,
      pending_metal_value_cop: pendingMetalValue,
      stones_total_cop: stonesTotal,
      labor_total_cop: laborTotal,
      total_cop: grandTotal,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    metals,
    form.quote_type,
    form.metal_type,
    form.metal_purity,
    form.estimated_weight_gr,
    form.gold_color,
    form.client_provides_metal,
    form.client_metal_weight_gr,
    form.client_metal_purity,
    form.stones,
    form.labor_items,
  ]);

  // ─── Field setters ────────────────────────────────────────────────────────

  const setQuoteType = useCallback((qt: QuoteType) => {
    setForm((prev) => ({ ...prev, quote_type: qt }));
  }, []);

  const setPieceType = useCallback((v: string) => {
    setForm((prev) => ({ ...prev, piece_type: v }));
  }, []);

  const setDescription = useCallback((v: string) => {
    setForm((prev) => ({ ...prev, description: v }));
  }, []);

  const setClientData = useCallback(
    (data: { client_id: string | null; client_phone: string; searched_client: QuotationFormState['searched_client']; client_name_temp: string }) => {
      setForm((prev) => ({ ...prev, ...data }));
    },
    []
  );

  const setMetalType = useCallback((v: MetalType) => {
    setForm((prev) => ({
      ...prev,
      metal_type: v,
      gold_color: '',
      metal_purity: '',
    }));
  }, []);

  const setMetalPurity = useCallback((v: string) => {
    setForm((prev) => ({ ...prev, metal_purity: v }));
  }, []);

  const setEstimatedWeight = useCallback((v: string) => {
    setForm((prev) => ({ ...prev, estimated_weight_gr: v }));
  }, []);

  const setGoldColor = useCallback((v: GoldColor | '') => {
    setForm((prev) => ({ ...prev, gold_color: v }));
  }, []);

  const setClientProvidesMetal = useCallback((v: boolean) => {
    setForm((prev) => ({ ...prev, client_provides_metal: v }));
  }, []);

  const setClientMetalWeight = useCallback((v: string) => {
    setForm((prev) => ({ ...prev, client_metal_weight_gr: v }));
  }, []);

  const setClientMetalPurity = useCallback((v: string) => {
    setForm((prev) => ({ ...prev, client_metal_purity: v }));
  }, []);

  const setHasStones = useCallback((v: boolean) => {
    setForm((prev) => ({ ...prev, has_stones: v, stones: v ? prev.stones : [] }));
  }, []);

  const addStoneRow = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      stones: [
        ...prev.stones,
        {
          id: crypto.randomUUID(),
          client_delivers: false,
          stone_type: '',
          cut: '',
          weight_ct: 0,
          quantity: 1,
          price_per_ct: 0,
          total_cop: 0,
        },
      ],
    }));
  }, []);

  const updateStoneRow = useCallback((id: string, changes: Partial<StoneRow>) => {
    setForm((prev) => ({
      ...prev,
      stones: prev.stones.map((s) => {
        if (s.id !== id) return s;
        const updated = { ...s, ...changes };
        updated.total_cop = calcStoneRowTotal(updated);
        return updated;
      }),
    }));
  }, []);

  const removeStoneRow = useCallback((id: string) => {
    setForm((prev) => ({
      ...prev,
      stones: prev.stones.filter((s) => s.id !== id),
    }));
  }, []);

  const setLaborItems = useCallback((items: LaborItem[]) => {
    setForm((prev) => ({ ...prev, labor_items: items }));
  }, []);

  // ─── Save ─────────────────────────────────────────────────────────────────

  const save = useCallback(
    async (userId: string): Promise<string> => {
      setSaving(true);
      setSaveError(null);
      try {
        const id = await saveQuotation(form, userId);
        setForm((prev) => ({ ...prev, id }));
        return id;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al guardar';
        setSaveError(msg);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [form]
  );

  return {
    form,
    saving,
    saveError,
    // setters
    setQuoteType,
    setPieceType,
    setDescription,
    setClientData,
    setMetalType,
    setMetalPurity,
    setEstimatedWeight,
    setGoldColor,
    setClientProvidesMetal,
    setClientMetalWeight,
    setClientMetalPurity,
    setHasStones,
    addStoneRow,
    updateStoneRow,
    removeStoneRow,
    setLaborItems,
    save,
  };
}
