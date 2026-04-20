/**
 * Queries Supabase encapsuladas para el módulo de Precios y Tarifas
 */

import { createClient } from '@/lib/supabase/client';
import type {
  PricingMetal,
  PricingService,
  PricingWorkerRate,
  PricingChangeLog,
} from './types';

const supabase = createClient();

// ============================================
// METALS
// ============================================

export async function fetchMetals(): Promise<PricingMetal[]> {
  const { data, error } = await supabase
    .from('pricing_metals')
    .select(`
      *,
      updated_by:users!pricing_metals_updated_by_user_id_fkey (
        id, first_name, last_name
      )
    `)
    .order('created_at');

  if (error) throw error;
  return (data || []).map(normalizeMetal);
}

export async function getMetalPrice(metalCode: string): Promise<PricingMetal | null> {
  const { data, error } = await supabase
    .from('pricing_metals')
    .select('*')
    .eq('metal_code', metalCode)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data ? normalizeMetal(data) : null;
}

export async function updateMetal(
  id: string,
  updates: Partial<Pick<PricingMetal,
    'international_price_per_gram' |
    'purchase_percentage' |
    'purchase_base_price' |
    'client_sale_percentage' |
    'client_sale_base_price' |
    'jeweler_sale_percentage' |
    'jeweler_sale_base_price' |
    'merma_percentage'
  >>,
  userId: string,
  previousValues: Record<string, string | null>
): Promise<void> {
  // 1. Update the metal record
  const { error: updateError } = await supabase
    .from('pricing_metals')
    .update({
      ...updates,
      updated_by_user_id: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (updateError) throw updateError;

  // 2. Log changes
  const logEntries = Object.entries(updates)
    .filter(([key]) => key in previousValues)
    .map(([key, value]) => ({
      table_name: 'pricing_metals',
      record_id: id,
      field_name: key,
      old_value: previousValues[key] ?? null,
      new_value: String(value ?? ''),
      changed_by_user_id: userId,
    }));

  if (logEntries.length > 0) {
    const { error: logError } = await supabase
      .from('pricing_change_log')
      .insert(logEntries);

    if (logError) console.error('Error logging changes:', logError);
  }
}

// ============================================
// SERVICES (COBRO A CLIENTE)
// ============================================

export async function fetchServices(): Promise<PricingService[]> {
  const { data, error } = await supabase
    .from('pricing_services')
    .select(`
      *,
      updated_by:users!pricing_services_updated_by_user_id_fkey (
        id, first_name, last_name
      )
    `)
    .order('created_at');

  if (error) throw error;
  return (data || []).map(normalizeService);
}

export async function updateServicePrice(
  id: string,
  newPrice: number,
  userId: string,
  oldPrice: number
): Promise<void> {
  const { error: updateError } = await supabase
    .from('pricing_services')
    .update({
      price_cop: newPrice,
      updated_by_user_id: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (updateError) throw updateError;

  const { error: logError } = await supabase
    .from('pricing_change_log')
    .insert({
      table_name: 'pricing_services',
      record_id: id,
      field_name: 'price_cop',
      old_value: String(oldPrice),
      new_value: String(newPrice),
      changed_by_user_id: userId,
    });

  if (logError) console.error('Error logging change:', logError);
}

// ============================================
// WORKER RATES (PAGO A TRABAJADORES)
// ============================================

export async function fetchWorkerRates(): Promise<PricingWorkerRate[]> {
  const { data, error } = await supabase
    .from('pricing_worker_rates')
    .select(`
      *,
      updated_by:users!pricing_worker_rates_updated_by_user_id_fkey (
        id, first_name, last_name
      )
    `)
    .order('created_at');

  if (error) throw error;
  return (data || []).map(normalizeWorkerRate);
}

export async function updateWorkerRate(
  id: string,
  newRate: number,
  userId: string,
  oldRate: number
): Promise<void> {
  const { error: updateError } = await supabase
    .from('pricing_worker_rates')
    .update({
      rate_cop: newRate,
      updated_by_user_id: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (updateError) throw updateError;

  const { error: logError } = await supabase
    .from('pricing_change_log')
    .insert({
      table_name: 'pricing_worker_rates',
      record_id: id,
      field_name: 'rate_cop',
      old_value: String(oldRate),
      new_value: String(newRate),
      changed_by_user_id: userId,
    });

  if (logError) console.error('Error logging change:', logError);
}

// ============================================
// CHANGE LOG
// ============================================

export async function fetchChangeLog(
  tableName?: string,
  limit: number = 50
): Promise<PricingChangeLog[]> {
  let query = supabase
    .from('pricing_change_log')
    .select(`
      *,
      changed_by:users!pricing_change_log_changed_by_user_id_fkey (
        id, first_name, last_name
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (tableName) {
    query = query.eq('table_name', tableName);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

// ============================================
// NORMALIZERS (Supabase returns numeric as string)
// ============================================

function normalizeMetal(raw: any): PricingMetal {
  return {
    ...raw,
    international_price_per_gram: Number(raw.international_price_per_gram) || 0,
    purchase_percentage: raw.purchase_percentage !== null ? Number(raw.purchase_percentage) : null,
    purchase_base_price: raw.purchase_base_price !== null ? Number(raw.purchase_base_price) : null,
    client_sale_percentage: raw.client_sale_percentage !== null ? Number(raw.client_sale_percentage) : null,
    client_sale_base_price: raw.client_sale_base_price !== null ? Number(raw.client_sale_base_price) : null,
    jeweler_sale_percentage: raw.jeweler_sale_percentage !== null ? Number(raw.jeweler_sale_percentage) : null,
    jeweler_sale_base_price: raw.jeweler_sale_base_price !== null ? Number(raw.jeweler_sale_base_price) : null,
    merma_percentage: raw.merma_percentage !== null ? Number(raw.merma_percentage) : null,
  };
}

function normalizeService(raw: any): PricingService {
  return {
    ...raw,
    price_cop: Number(raw.price_cop) || 0,
  };
}

function normalizeWorkerRate(raw: any): PricingWorkerRate {
  return {
    ...raw,
    rate_cop: Number(raw.rate_cop) || 0,
  };
}
