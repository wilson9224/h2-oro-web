import type { GoldColor, AlloyBreakdown, StoneRow, LaborItem } from './types';
import type { PricingMetal } from '@/lib/pricing/types';

// ─── Metal purity ────────────────────────────────────────────────────────────

export function calcMetalPurityPct(purity: number, metalType: 'gold' | 'silver'): number {
  if (!purity || purity <= 0) return 0;
  if (metalType === 'gold') {
    return Number(((purity / 24) * 100).toFixed(4));
  }
  // Silver: milésimas (ej: 925 → 92.5%)
  return Number((purity / 10).toFixed(4));
}

// ─── Total weight with merma ──────────────────────────────────────────────────

export function calcTotalWeight(estimatedWeightGr: number, mermaPercentage: number | null): number {
  if (!estimatedWeightGr || estimatedWeightGr <= 0) return 0;
  if (!mermaPercentage || mermaPercentage === 0) return Number(estimatedWeightGr.toFixed(4));
  return Number((estimatedWeightGr * (1 + mermaPercentage / 100)).toFixed(4));
}

// ─── Metal price ─────────────────────────────────────────────────────────────

export function calcMetalPrice(
  basePrice: number,
  purityPct: number,
  totalWeightGr: number
): number {
  if (!basePrice || !purityPct || !totalWeightGr) return 0;
  return Math.round(basePrice * (purityPct / 100) * totalWeightGr);
}

// ─── Alloy (liga) breakdown ───────────────────────────────────────────────────

export function calcAlloyBreakdown(
  goldColor: GoldColor,
  totalWeightGr: number,
  metalPurityPct: number,
  metals: PricingMetal[],
  quoteType: 'client' | 'jeweler'
): AlloyBreakdown {
  const ligaPct = 100 - metalPurityPct;
  const ligaWeightGr = (totalWeightGr * ligaPct) / 100;

  const getBasePrice = (code: string): number => {
    const m = metals.find((x) => x.metal_code === code);
    if (!m) return 0;
    // For simple metals (copper, palladium) that have no sale percentages,
    // fall back to international_price_per_gram which is what the admin configures.
    if (quoteType === 'client') {
      return m.client_sale_base_price ?? m.international_price_per_gram ?? 0;
    }
    return m.jeweler_sale_base_price ?? m.international_price_per_gram ?? 0;
  };

  let silver_gr = 0;
  let copper_gr = 0;
  let palladium_gr = 0;

  if (goldColor === 'yellow') {
    silver_gr = Number((ligaWeightGr * 0.5).toFixed(4));
    copper_gr = Number((ligaWeightGr * 0.5).toFixed(4));
  } else if (goldColor === 'rose') {
    copper_gr = Number(ligaWeightGr.toFixed(4));
  } else if (goldColor === 'white') {
    silver_gr = Number((ligaWeightGr * 0.6).toFixed(4));
    palladium_gr = Number((ligaWeightGr * 0.4).toFixed(4));
  }

  const silverPrice = getBasePrice('silver');
  const copperPrice = getBasePrice('copper');
  const palladiumPrice = getBasePrice('palladium');

  const silver_price_cop = Math.round(silver_gr * silverPrice);
  const copper_price_cop = Math.round(copper_gr * copperPrice);
  const palladium_price_cop = Math.round(palladium_gr * palladiumPrice);

  return {
    color: goldColor,
    silver_gr,
    copper_gr,
    palladium_gr,
    silver_price_cop,
    copper_price_cop,
    palladium_price_cop,
    total_cop: silver_price_cop + copper_price_cop + palladium_price_cop,
  };
}

// ─── Client provides metal ────────────────────────────────────────────────────

export function calcClientPureMetal(clientWeightGr: number, clientPurityPct: number): number {
  if (!clientWeightGr || !clientPurityPct) return 0;
  return Number(((clientWeightGr * clientPurityPct) / 100).toFixed(4));
}

export function calcRequiredPureMetal(totalWeightGr: number, metalPurityPct: number): number {
  if (!totalWeightGr || !metalPurityPct) return 0;
  return Number(((totalWeightGr * metalPurityPct) / 100).toFixed(4));
}

export function calcPendingMetal(requiredPure: number, clientPure: number): number {
  return Number((requiredPure - clientPure).toFixed(4));
}

export function calcPendingMetalValue(
  pendingGr: number,
  basePrice: number,
  alloyPrice: number
): number {
  if (pendingGr <= 0) return 0;
  return Math.round(pendingGr * basePrice + alloyPrice);
}

// ─── Stones ───────────────────────────────────────────────────────────────────

export function calcStoneRowTotal(row: StoneRow): number {
  if (row.client_delivers) return 0;
  if (!row.weight_ct || !row.quantity || !row.price_per_ct) return 0;
  return Math.round(row.weight_ct * row.quantity * row.price_per_ct);
}

export function calcStonesTotalCop(stones: StoneRow[]): number {
  return stones.reduce((acc, row) => acc + calcStoneRowTotal(row), 0);
}

// ─── Labor ────────────────────────────────────────────────────────────────────

export function calcLaborTotal(laborItems: LaborItem[]): number {
  return laborItems.reduce((acc, item) => acc + item.effective_price, 0);
}

// ─── Grand total ──────────────────────────────────────────────────────────────

export function calcGrandTotal(
  metalPendingValue: number,
  alloyPrice: number,
  stonesTotal: number,
  laborTotal: number
): number {
  return metalPendingValue + alloyPrice + stonesTotal + laborTotal;
}
