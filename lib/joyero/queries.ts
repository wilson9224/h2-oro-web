import { createClient } from '@/lib/supabase/client';
import type { 
  WorkerStats, 
  StateDistribution, 
  AvgTime, 
  PaymentSummary, 
  WorkerAssignment, 
  OrderDetail, 
  Assignment, 
  Evidence,
  PauseLog,
  WorkerPayment,
} from './types';

const supabase = createClient();

// Dashboard queries
export async function fetchWorkerStats(workerId: string): Promise<WorkerStats> {
  const { data } = await supabase
    .from('work_assignments')
    .select('status, started_at, completed_at')
    .eq('worker_id', workerId);

  if (!data) {
    return { total: 0, pending: 0, inProgress: 0, completed: 0 };
  }

  return {
    total: data.length,
    pending: data.filter(w => w.status === 'assigned' && !w.started_at).length,
    inProgress: data.filter(w => w.status === 'in_progress').length,
    completed: data.filter(w => w.status === 'completed').length,
  };
}

export async function fetchWorkerStateDistribution(workerId: string): Promise<StateDistribution[]> {
  const { data } = await supabase
    .from('work_assignments')
    .select(`
      stage_code,
      workflow_states!inner(name)
    `)
    .eq('worker_id', workerId)
    .neq('status', 'completed');

  if (!data) return [];

  return data.reduce((acc: StateDistribution[], item: any) => {
    const existing = acc.find(d => d.stageCode === item.stage_code);
    if (existing) {
      existing.count++;
    } else {
      acc.push({
        stageCode: item.stage_code,
        stageName: item.workflow_states.name,
        count: 1
      });
    }
    return acc;
  }, []);
}

export async function fetchWorkerAvgTimes(workerId: string): Promise<AvgTime[]> {
  const { data } = await supabase
    .from('work_assignments')
    .select(`
      stage_code,
      workflow_states!inner(name),
      started_at,
      completed_at
    `)
    .eq('worker_id', workerId)
    .not('started_at', 'is', null)
    .not('completed_at', 'is', null);

  if (!data) return [];

  return data.reduce((acc: AvgTime[], item: any) => {
    const startTime = new Date(item.started_at);
    const endTime = new Date(item.completed_at);
    const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    
    const existing = acc.find(t => t.stageCode === item.stage_code);
    if (existing) {
      existing.avgHours = (existing.avgHours + hours) / 2;
    } else {
      acc.push({
        stageCode: item.stage_code,
        stageName: item.workflow_states.name,
        avgHours: hours
      });
    }
    return acc;
  }, []);
}

export async function fetchWorkerPaymentsSummary(workerId: string): Promise<PaymentSummary> {
  const { data } = await supabase
    .from('worker_payments')
    .select('amount_cop, status, concept')
    .eq('worker_id', workerId);

  if (!data) {
    return { pendingAmount: 0, paidAmount: 0, bonusAmount: 0 };
  }

  return {
    pendingAmount: data
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + Number(p.amount_cop), 0),
    paidAmount: data
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + Number(p.amount_cop), 0),
    bonusAmount: data
      .filter(p => p.concept === 'bonus')
      .reduce((sum, p) => sum + Number(p.amount_cop), 0),
  };
}

// Orders queries
export async function fetchWorkerAssignments(
  workerId: string, 
  filter?: 'all' | 'pending' | 'in_progress' | 'completed'
): Promise<WorkerAssignment[]> {
  let query = supabase
    .from('work_assignments')
    .select(`
      id,
      stage_code,
      status,
      started_at,
      completed_at,
      paused_at,
      priority,
      progress_pct,
      workflow_states!inner(name),
      pieces!inner(
        name,
        description,
        orders!inner(order_number, type)
      )
    `)
    .eq('worker_id', workerId)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true });

  if (filter === 'pending') {
    query = query.eq('status', 'assigned').is('started_at', null);
  } else if (filter === 'in_progress') {
    query = query.eq('status', 'in_progress');
  } else if (filter === 'completed') {
    query = query.eq('status', 'completed');
  }

  const { data } = await query;

  if (!data) return [];

  return data.map((item: any) => ({
    assignmentId: item.id,
    stageCode: item.stage_code,
    stageName: item.workflow_states.name,
    status: item.status,
    startedAt: item.started_at,
    completedAt: item.completed_at,
    pausedAt: item.paused_at,
    priority: item.priority,
    progressPct: item.progress_pct,
    pieceName: item.pieces.name,
    pieceDescription: item.pieces.description,
    orderNumber: item.pieces.orders.order_number,
    orderId: item.pieces.orders.id,
    orderType: item.pieces.orders.type,
  }));
}

export async function fetchOrderDetailForWorker(orderId: string, workerId: string): Promise<OrderDetail | null> {
  const { data: orderData } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      type,
      notes,
      pieces!inner(
        id,
        name,
        description
      )
    `)
    .eq('id', orderId)
    .single();

  if (!orderData) return null;

  // Fetch assignments for this worker on this order
  const { data: assignmentData } = await supabase
    .from('work_assignments')
    .select(`
      id,
      stage_code,
      status,
      started_at,
      completed_at,
      progress_pct,
      workflow_states!inner(name)
    `)
    .eq('worker_id', workerId)
    .eq('piece_id', (orderData.pieces as any).id);

  // Fetch file attachments (images)
  const { data: imageData } = await supabase
    .from('file_attachments')
    .select('id, file_name, file_url')
    .eq('entity_type', 'order')
    .eq('entity_id', orderData.id)
    .eq('file_type', 'image');

  // Fetch materials if it's a jewelry order
  let materials: any[] = [];
  if (orderData.type === 'jewelry') {
    const { data: materialData } = await supabase
      .from('order_work_cycles')
      .select(`
        jewelry_metal_purity,
        jewelry_metal_weight_gr,
        jewelry_gold_color,
        includes_stones,
        stone_type,
        stone_count,
        stone_weight_gr
      `)
      .eq('order_id', orderData.id)
      .eq('cycle_number', 1)
      .single();

    if (materialData) {
      materials = [
        ...(materialData.jewelry_metal_purity ? [{
          name: `Oro ${materialData.jewelry_metal_purity}K ${materialData.jewelry_gold_color || 'amarillo'}`,
          quantity: `${materialData.jewelry_metal_weight_gr || 0} gr`,
          delivered: true
        }] : []),
        ...(materialData.includes_stones && materialData.stone_type ? [{
          name: materialData.stone_type,
          quantity: materialData.stone_count ? `${materialData.stone_count} unidades` : '1 unidad',
          delivered: true
        }] : [])
      ];
    }
  }

  return {
    orderId: orderData.id,
    orderNumber: orderData.order_number,
    orderType: orderData.type,
    pieceName: (orderData.pieces as any).name,
    pieceDescription: (orderData.pieces as any).description,
    notes: orderData.notes,
    assignments: (assignmentData || []).map((item: any) => ({
      id: item.id,
      stageCode: item.stage_code,
      stageName: item.workflow_states.name,
      status: item.status,
      startedAt: item.started_at,
      completedAt: item.completed_at,
      progressPct: item.progress_pct,
    })),
    images: (imageData || []).map((item: any) => ({
      id: item.id,
      url: item.file_url,
      fileName: item.file_name,
    })),
    materials,
  };
}

// Work queries
function resolveAttachmentUrl(item: any): string | null {
  if (item.file_url) return item.file_url;
  if (item.bucket && item.storage_path) {
    const { data } = supabase.storage
      .from(item.bucket)
      .getPublicUrl(item.storage_path);
    return data.publicUrl;
  }
  return null;
}

export async function fetchAssignment(assignmentId: string): Promise<Assignment | null> {
  const { data } = await supabase
    .from('work_assignments')
    .select(`
      id,
      piece_id,
      stage_code,
      status,
      started_at,
      completed_at,
      paused_at,
      pause_reason,
      effective_minutes,
      progress_pct,
      priority,
      notes,
      workflow_states!inner(name),
      pieces!inner(
        name,
        description,
        orders!inner(order_number, id)
      )
    `)
    .eq('id', assignmentId)
    .single();

  if (!data) return null;

  const orderId = (data.pieces as any).orders.id;
  const { data: referenceRows } = await supabase
    .from('file_attachments')
    .select('id, file_name, file_url, bucket, storage_path')
    .eq('entity_type', 'order')
    .eq('entity_id', orderId)
    .eq('file_type', 'image')
    .order('created_at', { ascending: true });

  const referenceImages: Evidence[] = (referenceRows || [])
    .map((item: any) => {
      const url = resolveAttachmentUrl(item);
      if (!url) return null;
      return {
        id: item.id,
        url,
        fileName: item.file_name,
      };
    })
    .filter(Boolean) as Evidence[];

  return {
    id: data.id,
    stageCode: data.stage_code,
    stageName: (data as any).workflow_states.name,
    status: data.status,
    startedAt: data.started_at,
    completedAt: data.completed_at,
    pausedAt: (data as any).paused_at ?? null,
    pauseReason: (data as any).pause_reason ?? null,
    effectiveMinutes: (data as any).effective_minutes ?? null,
    progressPct: data.progress_pct,
    priority: (data as any).priority ?? null,
    pieceId: data.piece_id,
    pieceName: (data.pieces as any).name,
    pieceDescription: (data.pieces as any).description,
    orderNumber: (data.pieces as any).orders.order_number,
    orderId,
    notes: data.notes,
    referenceImages,
  };
}

export async function startWork(assignmentId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('work_assignments')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString(),
      })
      .eq('id', assignmentId);

    if (error) throw error;

    // Log the action
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: 'WORK_STARTED',
        entity_type: 'work_assignment',
        entity_id: assignmentId,
      });

    return true;
  } catch (error) {
    console.error('Error starting work:', error);
    return false;
  }
}

export async function completeWork(
  assignmentId: string, 
  userId: string, 
  notes?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('work_assignments')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        notes: notes || null,
      })
      .eq('id', assignmentId);

    if (error) throw error;

    // Log the action
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: 'WORK_COMPLETED',
        entity_type: 'work_assignment',
        entity_id: assignmentId,
      });

    return true;
  } catch (error) {
    console.error('Error completing work:', error);
    return false;
  }
}

export async function fetchAssignmentEvidence(assignmentId: string): Promise<Evidence[]> {
  const { data } = await supabase
    .from('file_attachments')
    .select('id, file_name, bucket, storage_path')
    .eq('entity_type', 'work_assignment')
    .eq('entity_id', assignmentId);

  if (!data) return [];

  return data.map((item: any) => {
    const { data: urlData } = supabase.storage
      .from(item.bucket)
      .getPublicUrl(item.storage_path);
    return {
      id: item.id,
      url: urlData.publicUrl,
      fileName: item.file_name,
    };
  });
}

export async function uploadEvidence(
  assignmentId: string,
  file: File,
  uploadedById?: string
): Promise<string | null> {
  const storagePath = `${assignmentId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from('evidences')
    .upload(storagePath, file);

  if (uploadError) {
    console.error('Storage upload error:', uploadError);
    throw uploadError;
  }

  const { error: insertError } = await supabase
    .from('file_attachments')
    .insert({
      bucket: 'evidences',
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      entity_type: 'work_assignment',
      entity_id: assignmentId,
      uploaded_by_id: uploadedById ?? null,
    });

  if (insertError) {
    console.error('DB insert error:', insertError);
    throw insertError;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('evidences')
    .getPublicUrl(storagePath);

  return publicUrl;
}

// Pause / Resume work
export async function pauseWork(
  assignmentId: string,
  reason: string,
  userId: string
): Promise<boolean> {
  try {
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('work_assignments')
      .update({ status: 'paused', paused_at: now, pause_reason: reason })
      .eq('id', assignmentId);

    if (error) throw error;

    await supabase.from('work_pause_logs').insert({
      assignment_id: assignmentId,
      paused_at: now,
      reason,
    });

    await supabase.from('audit_logs').insert({
      user_id: userId,
      action: 'WORK_PAUSED',
      entity_type: 'work_assignment',
      entity_id: assignmentId,
    });

    return true;
  } catch (error) {
    console.error('Error pausing work:', error);
    return false;
  }
}

export async function resumeWork(
  assignmentId: string,
  userId: string
): Promise<boolean> {
  try {
    const now = new Date().toISOString();

    // Find the open pause log (resumed_at IS NULL)
    const { data: openLog } = await supabase
      .from('work_pause_logs')
      .select('id, paused_at')
      .eq('assignment_id', assignmentId)
      .is('resumed_at', null)
      .order('paused_at', { ascending: false })
      .limit(1)
      .single();

    if (openLog) {
      const durationMinutes = Math.round(
        (new Date(now).getTime() - new Date(openLog.paused_at).getTime()) / 60000
      );
      await supabase
        .from('work_pause_logs')
        .update({ resumed_at: now, duration_minutes: durationMinutes })
        .eq('id', openLog.id);
    }

    const { error } = await supabase
      .from('work_assignments')
      .update({ status: 'in_progress', paused_at: null, pause_reason: null })
      .eq('id', assignmentId);

    if (error) throw error;

    await supabase.from('audit_logs').insert({
      user_id: userId,
      action: 'WORK_RESUMED',
      entity_type: 'work_assignment',
      entity_id: assignmentId,
    });

    return true;
  } catch (error) {
    console.error('Error resuming work:', error);
    return false;
  }
}

export async function fetchAssignmentPauseLogs(assignmentId: string): Promise<PauseLog[]> {
  const { data } = await supabase
    .from('work_pause_logs')
    .select('id, assignment_id, paused_at, resumed_at, reason, duration_minutes')
    .eq('assignment_id', assignmentId)
    .order('paused_at', { ascending: true });

  if (!data) return [];

  return data.map((item: any) => ({
    id: item.id,
    assignmentId: item.assignment_id,
    pausedAt: item.paused_at,
    resumedAt: item.resumed_at,
    reason: item.reason,
    durationMinutes: item.duration_minutes,
  }));
}

// Fetch the worker rate for a given stage_code.
// Lookup order:
//   1. category + difficulty_level  (e.g. 'finishing_easy' → category='finishing', difficulty='easy')
//   2. category + subcategory       (e.g. 'setting_simple' → category='setting', subcategory='simple')
//   3. category alone, no difficulty, no subcategory (e.g. 'casting')
export async function fetchWorkerRateForService(stageCode: string): Promise<number> {
  const DIFFICULTY_SUFFIXES: Record<string, string> = {
    easy: 'easy',
    complex: 'hard',
    hard: 'hard',
    medium: 'medium',
  };

  const parts = stageCode.split('_');
  const lastPart = parts[parts.length - 1];
  const difficulty = DIFFICULTY_SUFFIXES[lastPart] ?? null;

  if (difficulty) {
    // Pattern: <category>_<difficulty>  e.g. finishing_easy, laser_cutting_easy
    const category = parts.slice(0, -1).join('_');
    const { data } = await supabase
      .from('pricing_worker_rates')
      .select('rate_cop')
      .eq('category', category)
      .eq('difficulty_level', difficulty)
      .limit(1)
      .maybeSingle();
    if (data) return Number(data.rate_cop);
    return 0;
  }

  // No difficulty suffix — try category + subcategory first (e.g. setting_simple)
  if (parts.length >= 2) {
    const possibleCategory = parts.slice(0, -1).join('_');
    const possibleSubcategory = parts[parts.length - 1];
    const { data: subData } = await supabase
      .from('pricing_worker_rates')
      .select('rate_cop')
      .eq('category', possibleCategory)
      .eq('subcategory', possibleSubcategory)
      .is('difficulty_level', null)
      .limit(1)
      .maybeSingle();
    if (subData) return Number(subData.rate_cop);
  }

  // Fallback: full stage_code as category, no difficulty, no subcategory (e.g. casting, 3d_printing)
  const { data } = await supabase
    .from('pricing_worker_rates')
    .select('rate_cop')
    .eq('category', stageCode)
    .is('difficulty_level', null)
    .is('subcategory', null)
    .limit(1)
    .maybeSingle();
  return data ? Number(data.rate_cop) : 0;
}

// Complete work: update assignment + auto-create worker_payment
export async function completeWorkWithPayment(
  assignmentId: string,
  userId: string,
  startedAt: string,
  pauseLogs: PauseLog[],
  stageCode: string,
  stageName: string,
  pieceName: string,
  notes?: string
): Promise<boolean> {
  try {
    const now = new Date().toISOString();

    // Calculate total paused minutes
    const totalPausedMinutes = pauseLogs.reduce(
      (sum, log) => sum + (log.durationMinutes ?? 0),
      0
    );

    // Calculate effective minutes
    const totalMinutes = Math.round(
      (new Date(now).getTime() - new Date(startedAt).getTime()) / 60000
    );
    const effectiveMinutes = Math.max(0, totalMinutes - totalPausedMinutes);

    const { error } = await supabase
      .from('work_assignments')
      .update({
        status: 'completed',
        completed_at: now,
        effective_minutes: effectiveMinutes,
        notes: notes || null,
        paused_at: null,
        pause_reason: null,
      })
      .eq('id', assignmentId);

    if (error) throw error;

    // Fetch the worker rate for this service
    const rateCop = await fetchWorkerRateForService(stageCode);

    // Fetch order_id from the assignment's piece
    let orderId: string | null = null;
    const { data: assignmentData } = await supabase
      .from('work_assignments')
      .select('pieces!inner(orders!inner(id))')
      .eq('id', assignmentId)
      .single();
    if (assignmentData) {
      orderId = (assignmentData as any).pieces?.orders?.id ?? null;
    }

    // Auto-create worker payment if rate > 0
    if (rateCop > 0) {
      await supabase.from('worker_payments').insert({
        worker_id: userId,
        assignment_id: assignmentId,
        order_id: orderId,
        concept: 'assignment_payment',
        service_code: stageCode,
        piece_name: pieceName,
        amount_cop: rateCop,
        status: 'pending',
      });
    }

    await supabase.from('audit_logs').insert({
      user_id: userId,
      action: 'WORK_COMPLETED',
      entity_type: 'work_assignment',
      entity_id: assignmentId,
    });

    return true;
  } catch (error) {
    console.error('Error completing work:', error);
    return false;
  }
}

// Worker payments
export async function fetchWorkerPayments(
  workerId: string,
  filters?: {
    startDate?: string;
    endDate?: string;
    status?: 'all' | 'pending' | 'paid_unconfirmed' | 'confirmed';
  }
): Promise<WorkerPayment[]> {
  let query = supabase
    .from('worker_payments')
    .select(`
      id,
      worker_id,
      assignment_id,
      concept,
      service_code,
      piece_name,
      amount_cop,
      status,
      paid_at,
      confirmed_at,
      notes,
      created_at,
      orders!worker_payments_order_id_fkey(order_number)
    `)
    .eq('worker_id', workerId)
    .order('created_at', { ascending: false });

  if (filters?.startDate) {
    query = query.gte('created_at', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('created_at', filters.endDate);
  }
  if (filters?.status === 'pending') {
    query = query.eq('status', 'pending');
  } else if (filters?.status === 'paid_unconfirmed') {
    query = query.eq('status', 'paid').is('confirmed_at', null);
  } else if (filters?.status === 'confirmed') {
    query = query.eq('status', 'paid').not('confirmed_at', 'is', null);
  }

  const { data } = await query;

  if (!data) return [];

  return data.map((item: any) => ({
    id: item.id,
    workerId: item.worker_id,
    assignmentId: item.assignment_id,
    concept: item.concept,
    serviceCode: item.service_code,
    pieceName: item.piece_name,
    amountCop: Number(item.amount_cop),
    status: item.status,
    paidAt: item.paid_at,
    confirmedAt: item.confirmed_at,
    notes: item.notes,
    createdAt: item.created_at,
    orderNumber: (item['orders!worker_payments_order_id_fkey'] ?? item.orders)?.order_number,
  }));
}

export async function confirmPaymentReceipt(
  paymentId: string,
  workerId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('worker_payments')
      .update({ confirmed_at: new Date().toISOString() })
      .eq('id', paymentId)
      .eq('worker_id', workerId)
      .eq('status', 'paid');

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error confirming payment:', error);
    return false;
  }
}
