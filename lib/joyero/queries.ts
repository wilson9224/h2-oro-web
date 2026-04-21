import { createClient } from '@/lib/supabase/client';
import type { 
  WorkerStats, 
  StateDistribution, 
  AvgTime, 
  PaymentSummary, 
  WorkerAssignment, 
  OrderDetail, 
  Assignment, 
  Evidence 
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
export async function fetchAssignment(assignmentId: string): Promise<Assignment | null> {
  const { data } = await supabase
    .from('work_assignments')
    .select(`
      id,
      stage_code,
      status,
      started_at,
      completed_at,
      progress_pct,
      notes,
      workflow_states!inner(name),
      pieces!inner(
        name,
        description,
        orders!inner(order_number)
      )
    `)
    .eq('id', assignmentId)
    .single();

  if (!data) return null;

  return {
    id: data.id,
    stageCode: data.stage_code,
    stageName: (data as any).workflow_states.name,
    status: data.status,
    startedAt: data.started_at,
    completedAt: data.completed_at,
    progressPct: data.progress_pct,
    pieceName: (data.pieces as any).name,
    pieceDescription: (data.pieces as any).description,
    orderNumber: (data.pieces as any).orders.order_number,
    orderId: (data.pieces as any).orders.id,
    notes: data.notes,
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
    .select('id, file_name, file_url')
    .eq('entity_type', 'work_assignment')
    .eq('entity_id', assignmentId)
    .eq('file_type', 'image');

  if (!data) return [];

  return data.map((item: any) => ({
    id: item.id,
    url: item.file_url,
    fileName: item.file_name,
  }));
}

export async function uploadEvidence(
  assignmentId: string, 
  file: File
): Promise<string | null> {
  try {
    // Upload to Supabase Storage
    const fileName = `${assignmentId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('evidences')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('evidences')
      .getPublicUrl(fileName);

    // Insert into file_attachments
    const { error: insertError } = await supabase
      .from('file_attachments')
      .insert({
        entity_type: 'work_assignment',
        entity_id: assignmentId,
        file_name: file.name,
        file_url: publicUrl,
        file_type: 'image',
      });

    if (insertError) throw insertError;

    return publicUrl;
  } catch (error) {
    console.error('Error uploading evidence:', error);
    return null;
  }
}
