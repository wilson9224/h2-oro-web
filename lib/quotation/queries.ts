import { createClient } from '@/lib/supabase/client';
import type { QuotationRecord, QuotationFormState } from './types';

const supabase = createClient();

// ─── Fetch list ───────────────────────────────────────────────────────────────

export async function fetchQuotations(
  page = 0,
  pageSize = 20,
  scope?: { userId?: string; role?: string }
): Promise<{ data: QuotationRecord[]; count: number }> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('quotations')
    .select(
      `*, client:users!client_id(id, first_name, last_name, phone, email)`,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false });

  if (scope?.role === 'manager' && scope.userId) {
    query = query.eq('created_by_user_id', scope.userId);
  }

  const { data, error, count } = await query.range(from, to);

  if (error) throw error;
  return { data: (data ?? []) as QuotationRecord[], count: count ?? 0 };
}

// ─── Fetch single ─────────────────────────────────────────────────────────────

export async function fetchQuotationById(id: string): Promise<QuotationRecord> {
  const { data, error } = await supabase
    .from('quotations')
    .select(`*, client:users!client_id(id, first_name, last_name, phone, email)`)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as QuotationRecord;
}

// ─── Save (upsert) ────────────────────────────────────────────────────────────

export async function saveQuotation(
  form: QuotationFormState,
  userId: string
): Promise<string> {
  const quoteNumber = form.id
    ? undefined
    : `COT-${Date.now().toString(36).toUpperCase()}`;

  const payload: Record<string, unknown> = {
    quote_type: form.quote_type,
    status: 'draft',

    client_id: form.client_id,
    client_phone: form.client_phone || null,
    client_name_temp: form.client_name_temp || null,

    piece_type: form.piece_type,
    description: form.description || null,

    metal_type: form.metal_type,
    metal_purity: parseFloat(form.metal_purity) || 0,
    metal_purity_pct: form.metal_purity_pct,
    estimated_weight_gr: parseFloat(form.estimated_weight_gr) || 0,
    total_weight_gr: form.total_weight_gr,
    gold_color: form.gold_color || null,
    metal_price_cop: form.metal_price_cop,
    alloy_price_cop: form.alloy_price_cop,
    alloy_breakdown: form.alloy_breakdown,

    client_provides_metal: form.client_provides_metal,
    client_metal_weight_gr: form.client_provides_metal ? parseFloat(form.client_metal_weight_gr) || null : null,
    client_metal_purity: form.client_provides_metal ? parseFloat(form.client_metal_purity) || null : null,
    client_metal_purity_pct: form.client_provides_metal ? form.client_metal_purity_pct : null,
    client_pure_metal_gr: form.client_provides_metal ? form.client_pure_metal_gr : null,
    required_pure_metal_gr: form.required_pure_metal_gr, // Guardar siempre, se usa en modal-start-work independientemente de client_provides_metal
    pending_metal_gr: form.client_provides_metal ? form.pending_metal_gr : null,
    pending_metal_value_cop: form.client_provides_metal ? form.pending_metal_value_cop : null,
    metal_excess_gr: form.client_provides_metal && form.pending_metal_gr < 0 ? form.metal_excess_gr : null,

    has_stones: form.has_stones,
    stones: form.has_stones ? form.stones : null,
    stones_total_cop: form.stones_total_cop,

    labor_items: form.labor_items.length > 0 ? form.labor_items : null,
    labor_total_cop: form.labor_total_cop,

    total_cop: form.total_cop,
    created_by_user_id: userId,
    updated_at: new Date().toISOString(),
  };

  if (!form.id) {
    payload.quote_number = quoteNumber;
    const { data, error } = await supabase
      .from('quotations')
      .insert(payload)
      .select('id')
      .single();
    if (error) throw error;
    return data.id as string;
  } else {
    const { error } = await supabase
      .from('quotations')
      .update(payload)
      .eq('id', form.id);
    if (error) throw error;
    return form.id;
  }
}

// ─── Fetch quotation by order_id ──────────────────────────────────────────────

export async function fetchQuotationByOrderId(orderId: string): Promise<QuotationRecord | null> {
  const { data, error } = await supabase
    .from('quotations')
    .select(`*, client:users!client_id(id, first_name, last_name, phone, email)`)
    .eq('order_id', orderId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching quotation by order_id:', error);
    return null;
  }
  return data as QuotationRecord | null;
}

// ─── Map QuotationRecord → QuotationFormState ─────────────────────────────────

export function quotationRecordToFormState(record: QuotationRecord): QuotationFormState {
  return {
    id: record.id,
    quote_type: record.quote_type,

    piece_type: record.piece_type || '',
    description: record.description || '',

    client_id: record.client_id,
    client_phone: record.client_phone || '',
    client_name_temp: record.client_name_temp || '',
    searched_client: record.client
      ? {
          id: record.client.id,
          first_name: record.client.first_name,
          last_name: record.client.last_name,
          phone: record.client.phone,
          email: record.client.email,
        }
      : null,

    metal_type: record.metal_type,
    metal_purity: String(record.metal_purity || ''),
    metal_purity_pct: record.metal_purity_pct || 0,
    estimated_weight_gr: String(record.estimated_weight_gr || ''),
    total_weight_gr: record.total_weight_gr || 0,
    gold_color: record.gold_color || '',

    metal_price_cop: record.metal_price_cop || 0,
    alloy_price_cop: record.alloy_price_cop || 0,
    alloy_breakdown: record.alloy_breakdown || null,

    client_provides_metal: record.client_provides_metal || false,
    client_metal_weight_gr: record.client_metal_weight_gr ? String(record.client_metal_weight_gr) : '',
    client_metal_purity: record.client_metal_purity ? String(record.client_metal_purity) : '',
    client_metal_purity_pct: record.client_metal_purity_pct || 0,
    client_pure_metal_gr: record.client_pure_metal_gr || 0,
    required_pure_metal_gr: record.required_pure_metal_gr || 0,
    pending_metal_gr: record.pending_metal_gr || 0,
    pending_metal_value_cop: record.pending_metal_value_cop || 0,
    metal_excess_gr: record.metal_excess_gr || 0,

    has_stones: record.has_stones || false,
    stones: record.stones || [],
    stones_total_cop: record.stones_total_cop || 0,

    labor_items: record.labor_items || [],
    labor_total_cop: record.labor_total_cop || 0,

    total_cop: record.total_cop || 0,
  };
}

// ─── Sync quotation changes to linked order ───────────────────────────────────

export async function syncQuotationToOrder(
  quotationId: string,
  form: QuotationFormState
): Promise<void> {
  // Find the order linked to this quotation
  const { data: quotation } = await supabase
    .from('quotations')
    .select('order_id')
    .eq('id', quotationId)
    .single();

  if (!quotation?.order_id) return;

  const orderId = quotation.order_id;

  // Update order total and notes
  await supabase
    .from('orders')
    .update({
      total_amount_cop: form.total_cop > 0 ? form.total_cop : null,
      notes: form.description || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  // Update order_jewelry_data
  await supabase
    .from('order_jewelry_data')
    .update({
      metal_type: form.metal_type,
      estimated_weight_gr: parseFloat(form.estimated_weight_gr) || 0,
      client_provides_metal: form.client_provides_metal,
      client_metal_purity: form.client_provides_metal ? parseFloat(form.client_metal_purity) || null : null,
      client_metal_weight_gr: form.client_provides_metal ? parseFloat(form.client_metal_weight_gr) || null : null,
      client_gold_color: form.client_provides_metal && form.metal_type === 'gold' && form.gold_color
        ? form.gold_color
        : null,
    })
    .eq('order_id', orderId);
}

// ─── Convert to order ─────────────────────────────────────────────────────────

export async function convertToOrder(
  quotationId: string,
  form: QuotationFormState,
  opts: {
    clientId: string;
    assignedToId: string;
    estimatedDeliveryDate: string;
    userId: string;
  }
): Promise<string> {
  const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

  // 1. Create order
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      client_id: opts.clientId,
      assigned_to_id: opts.assignedToId,
      type: 'jewelry',
      status: 'pending',
      currency: 'COP',
      total_amount_cop: form.total_cop > 0 ? form.total_cop : null,
      notes: form.description || null,
      client_phone: form.client_phone || null,
      estimated_delivery_date: opts.estimatedDeliveryDate || null,
    })
    .select('id')
    .single();

  if (orderErr) throw new Error(orderErr.message);

  const orderId = order.id as string;

  // 2. Create order_jewelry_data
  const { error: jewelryErr } = await supabase
    .from('order_jewelry_data')
    .insert({
      order_id: orderId,
      metal_type: form.metal_type,
      estimated_weight_gr: parseFloat(form.estimated_weight_gr) || 0,
      client_provides_metal: form.client_provides_metal,
      client_metal_purity: form.client_provides_metal ? parseFloat(form.client_metal_purity) || null : null,
      client_metal_weight_gr: form.client_provides_metal ? parseFloat(form.client_metal_weight_gr) || null : null,
      client_gold_color: form.client_provides_metal && form.metal_type === 'gold' && form.gold_color
        ? form.gold_color
        : null,
    });

  if (jewelryErr) console.error('Error creating jewelry data:', jewelryErr.message);

  // 3. Create first work cycle
  await supabase.from('order_work_cycles').insert({
    order_id: orderId,
    cycle_number: 1,
    is_rework: false,
  });

  // 4. Phase log
  await supabase.from('order_phase_log').insert({
    order_id: orderId,
    new_phase: 'creation',
    user_id: opts.userId,
    observation: `Pedido creado desde cotización`,
  });

  // 5. Mark quotation as converted
  await supabase
    .from('quotations')
    .update({ status: 'converted', order_id: orderId, updated_at: new Date().toISOString() })
    .eq('id', quotationId);

  return orderId;
}
