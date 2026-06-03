import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

type LaborStageStatus = 'pending' | 'assigned' | 'in_progress' | 'paused' | 'completed';

const TRACKING_ERROR = 'Pedido no encontrado. Verifica el número de pedido y los últimos 4 dígitos de tu teléfono.';
const TRACKING_RATE_LIMIT_WINDOW_MS = Number(process.env.TRACKING_RATE_LIMIT_WINDOW_MS ?? 5 * 60 * 1000);
const TRACKING_IP_MAX_ATTEMPTS = Number(process.env.TRACKING_IP_MAX_ATTEMPTS ?? 20);
const TRACKING_LOOKUP_MAX_ATTEMPTS = Number(process.env.TRACKING_LOOKUP_MAX_ATTEMPTS ?? 5);

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __h2oroTrackingRateLimit: Map<string, RateLimitBucket> | undefined;
}

const trackingRateLimit = globalThis.__h2oroTrackingRateLimit ?? new Map<string, RateLimitBucket>();
globalThis.__h2oroTrackingRateLimit = trackingRateLimit;

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwardedFor || request.headers.get('x-real-ip') || 'unknown';
}

function consumeRateLimit(key: string, maxAttempts: number, now = Date.now()) {
  if (trackingRateLimit.size > 10000) {
    for (const [bucketKey, bucket] of Array.from(trackingRateLimit.entries())) {
      if (bucket.resetAt <= now) trackingRateLimit.delete(bucketKey);
    }
  }

  const current = trackingRateLimit.get(key);
  if (!current || current.resetAt <= now) {
    trackingRateLimit.set(key, { count: 1, resetAt: now + TRACKING_RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (current.count >= maxAttempts) return false;

  current.count += 1;
  return true;
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase tracking server client is not configured.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function onlyDigits(value: unknown) {
  return String(value ?? '').replace(/\D/g, '');
}

function lastFour(value: unknown) {
  return onlyDigits(value).slice(-4);
}

function publicError(status = 404) {
  return NextResponse.json({ error: TRACKING_ERROR }, { status });
}

function formatLaborStage(assignment: any, idx: number) {
  const workflowState = Array.isArray(assignment.workflow_states)
    ? assignment.workflow_states[0]
    : assignment.workflow_states;

  return {
    serviceCode: assignment.stage_code,
    serviceName: workflowState?.name ?? assignment.stage_code,
    sortOrder: assignment.priority ?? idx + 1,
    status: (assignment.status ?? 'pending') as LaborStageStatus,
    startedAt: assignment.started_at ?? null,
    completedAt: assignment.completed_at ?? null,
  };
}

export async function POST(request: NextRequest) {
  let payload: { orderNumber?: string; phone?: string };
  const clientIp = getClientIp(request);

  try {
    payload = await request.json();
  } catch {
    return publicError(400);
  }

  const orderNumber = String(payload.orderNumber ?? '').trim().toUpperCase();
  const requestedLast4 = lastFour(payload.phone);

  if (!orderNumber || requestedLast4.length !== 4) {
    return publicError(400);
  }

  const ipAllowed = consumeRateLimit(`tracking:ip:${clientIp}`, TRACKING_IP_MAX_ATTEMPTS);
  const lookupAllowed = consumeRateLimit(
    `tracking:lookup:${clientIp}:${orderNumber}:${requestedLast4}`,
    TRACKING_LOOKUP_MAX_ATTEMPTS,
  );

  if (!ipAllowed || !lookupAllowed) {
    return publicError(429);
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select(`
        id, order_number, type, status, estimated_delivery_date,
        created_at, client_phone, total_amount_cop, currency,
        client:users!client_id ( phone ),
        pieces ( id, name, sort_order,
          currentState:workflow_states!current_state_id ( code, name, public_label, is_final ),
          state_history (
            id, notes, created_at,
            state:workflow_states!state_id ( code, name, public_label, is_publicly_visible )
          )
        )
      `)
      .eq('order_number', orderNumber)
      .is('deleted_at', null)
      .maybeSingle();

    if (orderErr || !order) {
      return publicError();
    }

    const client = Array.isArray(order.client) ? order.client[0] : order.client;
    const phoneMatches = [order.client_phone, client?.phone]
      .map(lastFour)
      .some((value) => value === requestedLast4);

    if (!phoneMatches) {
      return publicError();
    }

    const orderId = order.id;
    const pieces = Array.isArray(order.pieces) ? order.pieces : [];

    const { data: cycles } = await supabase
      .from('order_work_cycles')
      .select('id, cycle_number, material_delivery_date, work_delivery_date, created_at, labor_assignments')
      .eq('order_id', orderId)
      .order('cycle_number', { ascending: false })
      .limit(1);

    const activeCycle = cycles?.[0] ?? null;
    const laborItems: Array<{ service_code: string; service_name: string; service_category: string; sort_order: number }> =
      activeCycle?.labor_assignments ?? [];

    const pieceIds = pieces.map((piece: any) => piece.id).filter(Boolean);
    const { data: workAssignments } = pieceIds.length > 0
      ? await supabase
          .from('work_assignments')
          .select('stage_code, status, started_at, completed_at, priority, workflow_states!stage_code(name)')
          .in('piece_id', pieceIds)
          .order('priority', { ascending: true })
      : { data: [] };

    const workAssignmentsByCode: Record<string, any> = {};
    for (const assignment of workAssignments ?? []) {
      workAssignmentsByCode[assignment.stage_code] = assignment;
    }

    const laborStages = laborItems.length > 0
      ? laborItems
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((item) => {
            const assignment = workAssignmentsByCode[item.service_code];
            return {
              serviceCode: item.service_code,
              serviceName: item.service_name,
              sortOrder: item.sort_order,
              status: (assignment?.status ?? 'pending') as LaborStageStatus,
              startedAt: assignment?.started_at ?? null,
              completedAt: assignment?.completed_at ?? null,
            };
          })
      : (workAssignments ?? []).map(formatLaborStage);

    const timeline = [];
    for (const piece of pieces) {
      for (const entry of piece.state_history ?? []) {
        const state = Array.isArray(entry.state) ? entry.state[0] : entry.state;
        if (!state || state.is_publicly_visible === false) continue;
        timeline.push({
          id: entry.id,
          stateName: state.public_label || state.name,
          publicLabel: state.public_label,
          notes: entry.notes,
          timestamp: entry.created_at,
        });
      }
    }
    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const firstStartedAt = laborStages.find((stage) => stage.startedAt)?.startedAt ?? null;
    const lastCompletedAt = laborStages.length > 0 && laborStages.every((stage) => stage.status === 'completed')
      ? laborStages.map((stage) => stage.completedAt).filter(Boolean).sort().reverse()[0] ?? null
      : null;
    const materialDeliveryDate = activeCycle?.material_delivery_date ?? null;
    const validMaterialDelivery = materialDeliveryDate && new Date(materialDeliveryDate) >= new Date(order.created_at)
      ? materialDeliveryDate
      : null;
    const validFirstStarted = firstStartedAt && new Date(firstStartedAt) >= new Date(order.created_at)
      ? firstStartedAt
      : null;

    const keyDates = {
      createdAt: order.created_at,
      workStartDate: validFirstStarted ?? validMaterialDelivery ?? null,
      workDeliveryDate: activeCycle?.work_delivery_date ?? lastCompletedAt,
      deliveryDate: order.status === 'delivered'
        ? (timeline.find((event) => event.stateName.toLowerCase().includes('entrega'))?.timestamp ?? null)
        : null,
      estimatedDeliveryDate: order.estimated_delivery_date,
    };

    const { data: quotations } = await supabase
      .from('quotations')
      .select('metal_price_cop, alloy_price_cop, stones_total_cop, labor_total_cop, total_cop, stones, labor_items, currency')
      .eq('order_id', orderId)
      .limit(1);

    let quotation = quotations?.[0] ?? null;
    if (!quotation && order.client_phone) {
      const { data: fallbackQuotations } = await supabase
        .from('quotations')
        .select('metal_price_cop, alloy_price_cop, stones_total_cop, labor_total_cop, total_cop, stones, labor_items, currency')
        .eq('client_phone', order.client_phone)
        .eq('status', 'converted')
        .order('updated_at', { ascending: false })
        .limit(1);
      quotation = fallbackQuotations?.[0] ?? null;
    }

    const { data: payments } = await supabase
      .from('payments')
      .select('amount_cop, status')
      .eq('order_id', orderId);

    const cashPaid = (payments ?? [])
      .filter((payment: any) => payment.status === 'completed')
      .reduce((sum: number, payment: any) => sum + Number(payment.amount_cop ?? 0), 0);

    const { data: materialPayments } = await supabase
      .from('order_material_payments')
      .select('amount_cop')
      .eq('order_id', orderId);

    const materialPaid = (materialPayments ?? [])
      .reduce((sum: number, payment: any) => sum + Number(payment.amount_cop ?? 0), 0);

    const totalCop = Number(quotation?.total_cop ?? order.total_amount_cop ?? 0);
    const financial = quotation ? {
      metalCop: Number(quotation.metal_price_cop ?? 0),
      alloyCop: Number(quotation.alloy_price_cop ?? 0),
      stonesCop: Number(quotation.stones_total_cop ?? 0),
      laborCop: Number(quotation.labor_total_cop ?? 0),
      totalCop,
      stones: (quotation.stones ?? []).map((stone: any) => ({
        stoneType: stone.stone_type,
        cut: stone.cut,
        weightCt: stone.weight_ct,
        quantity: stone.quantity,
        totalCop: stone.total_cop,
        clientDelivers: stone.client_delivers,
      })),
      laborItems: (quotation.labor_items ?? []).map((item: any) => ({
        serviceName: item.service_name,
        serviceCategory: item.service_category,
        effectivePrice: item.effective_price,
      })),
      cashPaidCop: cashPaid,
      materialPaidCop: materialPaid,
      currency: quotation.currency ?? order.currency ?? 'COP',
    } : {
      metalCop: 0,
      alloyCop: 0,
      stonesCop: 0,
      laborCop: 0,
      totalCop,
      stones: [],
      laborItems: [],
      cashPaidCop: cashPaid,
      materialPaidCop: materialPaid,
      currency: order.currency ?? 'COP',
    };

    return NextResponse.json({
      orderNumber: order.order_number,
      orderType: order.type,
      status: order.status,
      pieceName: pieces[0]?.name ?? '',
      keyDates,
      laborStages,
      timeline,
      financial,
    });
  } catch {
    return NextResponse.json(
      { error: 'No pudimos consultar el pedido en este momento. Intenta nuevamente.' },
      { status: 500 },
    );
  }
}
