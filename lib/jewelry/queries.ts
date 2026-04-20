/**
 * Queries Supabase encapsuladas para el flujo de joyería
 * Centraliza todas las operaciones de base de datos
 */

import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

// Interfaces para los datos
export interface JewelryOrder {
  id: string;
  orderNumber: string;
  type: string;
  status: string;
  totalAmountCop: number | null;
  totalAmountUsd: number | null;
  currency: string;
  notes: string | null;
  clientPhone: string | null;
  estimatedDeliveryDate: string | null;
  createdAt: string;
  updatedAt: string;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
  assignedToId: string | null;
  assignedTo: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

export interface JewelryData {
  id: string;
  orderId: string;
  metalType: 'gold' | 'silver';
  estimatedWeightGr: number;
  clientProvidesMetal: boolean;
  clientMetalPurity: number | null;
  clientMetalWeightGr: number | null;
  clientGoldColor: 'yellow' | 'rose' | 'white' | null;
  currentPhase: string;
  isDelivered: boolean;
  deliveryDate: string | null;
  deliveredByUserId: string | null;
  receiverName: string | null;
  reworkCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkCycle {
  id: string;
  orderId: string;
  cycleNumber: number;
  isRework: boolean;
  reworkReason: string | null;
  jewelryMetalPurity: number | null;
  jewelryMetalWeightGr: number | null;
  jewelryGoldColor: 'yellow' | 'rose' | 'white' | null;
  approxGoldLaw: number | null;
  materialSurplusGr: number | null;
  totalMetalWeightGr: number | null;
  includesStones: boolean | null;
  stoneType: string | null;
  stoneCount: number | null;
  stoneWeightGr: number | null;
  deliveredByUserId: string | null;
  receivedByUserId: string | null;
  materialDeliveryDate: string | null;
  finalWeightGr: number | null;
  leftoverStonesGr: number | null;
  returnedMaterialGr: number | null;
  qcResult: 'approved' | 'rejected' | null;
  qcObservations: string | null;
  qcByUserId: string | null;
  workReceivedByUserId: string | null;
  workDeliveryDate: string | null;
  createdAt: string;
  updatedAt: string;
  deliveredBy?: { id: string; firstName: string; lastName: string } | null;
  receivedBy?: { id: string; firstName: string; lastName: string } | null;
  qcBy?: { id: string; firstName: string; lastName: string } | null;
  workReceivedBy?: { id: string; firstName: string; lastName: string } | null;
}

export interface Payment {
  id: string;
  method: string;
  amountCop: number;
  status: string;
  paidAt: string | null;
  registeredBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

export interface MaterialPayment {
  id: string;
  metalType: 'gold' | 'silver';
  purity: number;
  weightGr: number;
  goldColor: 'yellow' | 'rose' | 'white' | null;
  registeredBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  observation: string | null;
  createdAt: string;
}

export interface PhaseLog {
  id: string;
  orderId: string;
  previousPhase: string | null;
  newPhase: string;
  userId: string;
  observation: string | null;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
}

// Queries principales
export const jewelryQueries = {
  // Obtener pedido completo con relaciones
  async getOrder(orderId: string): Promise<JewelryOrder | null> {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        client:users!orders_client_id_fkey (
          id, firstName, lastName, email, phone
        ),
        assigned_to:users!orders_assigned_to_id_fkey (
          id, firstName, lastName
        )
      `)
      .eq('id', orderId)
      .single();

    if (error) throw error;
    return data;
  },

  // Obtener datos de joyería del pedido
  async getJewelryData(orderId: string): Promise<JewelryData | null> {
    const { data, error } = await supabase
      .from('order_jewelry_data')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Obtener ciclos de trabajo con relaciones
  async getWorkCycles(orderId: string): Promise<WorkCycle[]> {
    const { data, error } = await supabase
      .from('order_work_cycles')
      .select(`
        *,
        delivered_by:users!order_work_cycles_delivered_by_user_id_fkey (
          id, firstName, lastName
        ),
        received_by:users!order_work_cycles_received_by_user_id_fkey (
          id, firstName, lastName
        ),
        qc_by:users!order_work_cycles_qc_by_user_id_fkey (
          id, firstName, lastName
        ),
        work_received_by:users!order_work_cycles_work_received_by_user_id_fkey (
          id, firstName, lastName
        )
      `)
      .eq('order_id', orderId)
      .order('cycle_number', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Obtener pagos del pedido
  async getPayments(orderId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        registeredBy:users!payments_registered_by_id_fkey (
          id, firstName, lastName
        )
      `)
      .eq('order_id', orderId)
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Obtener abonos en material del pedido
  async getMaterialPayments(orderId: string): Promise<MaterialPayment[]> {
    const { data, error } = await supabase
      .from('order_material_payments')
      .select(`
        *,
        registeredBy:users!order_material_payments_registered_by_user_id_fkey (
          id, firstName, lastName
        )
      `)
      .eq('order_id', orderId)
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Obtener log de fases del pedido
  async getPhaseLogs(orderId: string): Promise<PhaseLog[]> {
    const { data, error } = await supabase
      .from('order_phase_log')
      .select(`
        *,
        user:users!order_phase_log_user_id_fkey (
          id, firstName, lastName
        )
      `)
      .eq('order_id', orderId)
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Obtener todos los usuarios para selects
  async getUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('id, firstName, lastName, email, phone')
      .order('firstName');

    if (error) throw error;
    return data || [];
  },
};

// Queries de mutación
export const jewelryMutations = {
  // Crear pedido de joyería (usado en formulario de creación)
  async createJewelryOrder(orderData: any, jewelryData: any): Promise<string> {
    // 1. Crear el pedido
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert(orderData)
      .select('id')
      .single();

    if (orderErr) throw orderErr;

    // 2. Crear datos de joyería
    const { error: jewelryErr } = await supabase
      .from('order_jewelry_data')
      .insert({
        order_id: order.id,
        ...jewelryData,
      });

    if (jewelryErr) throw jewelryErr;

    // 3. Crear primer ciclo de trabajo
    const { error: cycleErr } = await supabase
      .from('order_work_cycles')
      .insert({
        order_id: order.id,
        cycle_number: 1,
        is_rework: false,
      });

    if (cycleErr) throw cycleErr;

    // 4. Registrar en log de fases
    await supabase
      .from('order_phase_log')
      .insert({
        order_id: order.id,
        new_phase: 'creation',
        user_id: jewelryData.clientId,
        observation: 'Pedido de joyería creado',
      });

    return order.id;
  },

  // Iniciar trabajo (Fase 2)
  async startWork(orderId: string, data: {
    jewelryMetalPurity: number;
    jewelryMetalWeightGr: number;
    jewelryGoldColor?: string;
    approxGoldLaw?: number;
    materialSurplusGr?: number;
    totalMetalWeightGr?: number;
    includesStones?: boolean;
    stoneType?: string;
    stoneCount?: number;
    stoneWeightGr?: number;
    deliveredByUserId: string;
    receivedByUserId: string;
    materialDeliveryDate: string;
  }): Promise<void> {
    // 1. Actualizar ciclo actual
    const { data: currentCycle } = await supabase
      .from('order_work_cycles')
      .select('*')
      .eq('order_id', orderId)
      .eq('cycle_number', 1)
      .is('work_delivery_date', null)
      .single();

    if (currentCycle) {
      await supabase
        .from('order_work_cycles')
        .update({
          jewelryMetalPurity: data.jewelryMetalPurity,
          jewelryMetalWeightGr: data.jewelryMetalWeightGr,
          jewelryGoldColor: data.jewelryGoldColor,
          approxGoldLaw: data.approxGoldLaw,
          materialSurplusGr: data.materialSurplusGr,
          totalMetalWeightGr: data.totalMetalWeightGr,
          includesStones: data.includesStones,
          stoneType: data.stoneType,
          stoneCount: data.stoneCount,
          stoneWeightGr: data.stoneWeightGr,
          deliveredByUserId: data.deliveredByUserId,
          receivedByUserId: data.receivedByUserId,
          materialDeliveryDate: data.materialDeliveryDate,
        })
        .eq('id', currentCycle.id);
    }

    // 2. Actualizar fase actual
    await supabase
      .from('order_jewelry_data')
      .update({ currentPhase: 'start_work' })
      .eq('order_id', orderId);

    // 3. Registrar en log de fases
    await supabase
      .from('order_phase_log')
      .insert({
        order_id: orderId,
        previous_phase: 'creation',
        new_phase: 'start_work',
        user_id: data.receivedByUserId,
        observation: 'Material entregado al joyero',
      });
  },

  // Finalizar trabajo (Fase 3)
  async finishWork(orderId: string, data: {
    finalWeightGr: number;
    leftoverStonesGr?: number;
    returnedMaterialGr: number;
    qcResult: 'approved' | 'rejected';
    qcObservations: string;
    qcByUserId: string;
    workReceivedByUserId: string;
    workDeliveryDate: string;
  }): Promise<void> {
    // 1. Actualizar ciclo actual
    const { data: currentCycle } = await supabase
      .from('order_work_cycles')
      .select('*')
      .eq('order_id', orderId)
      .eq('cycle_number', 1)
      .is('work_delivery_date', null)
      .single();

    if (currentCycle) {
      await supabase
        .from('order_work_cycles')
        .update({
          finalWeightGr: data.finalWeightGr,
          leftoverStonesGr: data.leftoverStonesGr,
          returnedMaterialGr: data.returnedMaterialGr,
          qcResult: data.qcResult,
          qcObservations: data.qcObservations,
          qcByUserId: data.qcByUserId,
          workReceivedByUserId: data.workReceivedByUserId,
          workDeliveryDate: data.workDeliveryDate,
        })
        .eq('id', currentCycle.id);
    }

    // 2. Si es rechazado, crear nuevo ciclo de retrabajo
    if (data.qcResult === 'rejected') {
      const { data: currentJewelryData } = await supabase
        .from('order_jewelry_data')
        .select('reworkCount')
        .eq('order_id', orderId)
        .single();

      await supabase
        .from('order_work_cycles')
        .insert({
          order_id: orderId,
          cycle_number: 2,
          is_rework: true,
          rework_reason: data.qcObservations,
        });

      await supabase
        .from('order_jewelry_data')
        .update({ 
          currentPhase: 'start_work',
          reworkCount: (currentJewelryData?.reworkCount || 0) + 1
        })
        .eq('order_id', orderId);
    } else {
      // 3. Actualizar fase si es aprobado
      await supabase
        .from('order_jewelry_data')
        .update({ currentPhase: 'end_work' })
        .eq('order_id', orderId);
    }

    // 4. Registrar en log de fases
    await supabase
      .from('order_phase_log')
      .insert({
        order_id: orderId,
        previous_phase: 'start_work',
        new_phase: data.qcResult === 'rejected' ? 'start_work' : 'end_work',
        user_id: data.qcByUserId,
        observation: data.qcResult === 'rejected' ? 'QC rechazado - crear retrabajo' : 'QC aprobado - trabajo finalizado',
      });
  },

  // Entregar pedido (Fase 4)
  async deliverOrder(orderId: string, data: {
    receiverName: string;
    deliveredByUserId: string;
    deliveryDate: string;
  }): Promise<void> {
    // 1. Actualizar datos de joyería
    await supabase
      .from('order_jewelry_data')
      .update({
        currentPhase: 'delivery',
        isDelivered: true,
        deliveryDate: data.deliveryDate,
        deliveredByUserId: data.deliveredByUserId,
        receiverName: data.receiverName,
      })
      .eq('order_id', orderId);

    // 2. Actualizar estado del pedido
    await supabase
      .from('orders')
      .update({ status: 'delivered' })
      .eq('id', orderId);

    // 3. Registrar en log de fases
    await supabase
      .from('order_phase_log')
      .insert({
        order_id: orderId,
        previous_phase: 'end_work',
        new_phase: 'delivery',
        user_id: data.deliveredByUserId,
        observation: `Pedido entregado a ${data.receiverName}`,
      });
  },

  // Registrar abono en material
  async addMaterialPayment(orderId: string, data: {
    metalType: 'gold' | 'silver';
    purity: number;
    weightGr: number;
    goldColor?: string;
    registeredByUserId: string;
    observation: string;
  }): Promise<void> {
    await supabase
      .from('order_material_payments')
      .insert({
        order_id: orderId,
        metalType: data.metalType,
        purity: data.purity,
        weightGr: data.weightGr,
        goldColor: data.goldColor,
        registeredByUserId: data.registeredByUserId,
        observation: data.observation,
      });
  },

  // Registrar pago en dinero
  async addCashPayment(orderId: string, data: {
    amountCop: number;
    method: string;
    status: 'completed' | 'pending';
    paidAt: string;
    registeredByUserId: string;
  }): Promise<void> {
    await supabase
      .from('payments')
      .insert({
        order_id: orderId,
        method: data.method,
        amount_cop: data.amountCop,
        status: data.status,
        paid_at: data.status === 'completed' ? data.paidAt : null,
        registered_by_id: data.registeredByUserId,
      });
  },

  // Obtener estadísticas de producción
  async getProductionStats(orderId: string): Promise<{
    totalCycles: number;
    reworkCycles: number;
    approvedCycles: number;
    rejectedCycles: number;
    reworkRate: number;
    approvalRate: number;
    avgEfficiency: number;
  }> {
    const cycles = await jewelryQueries.getWorkCycles(orderId);
    
    const totalCycles = cycles.length;
    const reworkCycles = cycles.filter(c => c.isRework).length;
    const approvedCycles = cycles.filter(c => c.qcResult === 'approved').length;
    const rejectedCycles = cycles.filter(c => c.qcResult === 'rejected').length;

    // Eficiencia promedio
    const efficiencyCycles = cycles.filter(c => 
      c.finalWeightGr && c.totalMetalWeightGr
    );
    const avgEfficiency = efficiencyCycles.length > 0
      ? efficiencyCycles.reduce((sum, c) => 
          sum + ((c.finalWeightGr! / c.totalMetalWeightGr!) * 100), 0
        ) / efficiencyCycles.length
      : 0;

    return {
      totalCycles,
      reworkCycles,
      approvedCycles,
      rejectedCycles,
      reworkRate: totalCycles > 0 ? Number((reworkCycles / totalCycles * 100).toFixed(1)) : 0,
      approvalRate: totalCycles > 0 ? Number((approvedCycles / totalCycles * 100).toFixed(1)) : 0,
      avgEfficiency: Number(avgEfficiency.toFixed(1)),
    };
  },
};

// Queries de utilidad
export const jewelryUtils = {
  // Verificar si un pedido puede ser entregado
  async canDeliverOrder(orderId: string): Promise<{
    canDeliver: boolean;
    reasons: string[];
  }> {
    const [jewelryData, payments, workCycles] = await Promise.all([
      jewelryQueries.getJewelryData(orderId),
      jewelryQueries.getPayments(orderId),
      jewelryQueries.getWorkCycles(orderId),
    ]);

    const reasons: string[] = [];

    if (!jewelryData?.isDelivered) {
      // Verificar control de calidad
      const hasApprovedQC = workCycles.some(c => c.qcResult === 'approved');
      if (!hasApprovedQC) {
        reasons.push('El control de calidad no ha sido aprobado');
      }

      // Verificar saldo pendiente
      const totalPaid = payments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amountCop, 0);
      
      if (jewelryData && jewelryData.estimatedWeightGr > 0) {
        const estimatedPrice = jewelryData.estimatedWeightGr * 100000; // Estimado
        if (totalPaid < estimatedPrice) {
          reasons.push(`Hay un saldo pendiente de $${new Intl.NumberFormat('es-CO').format(estimatedPrice - totalPaid)}`);
        }
      }
    }

    return {
      canDeliver: reasons.length === 0 && !jewelryData?.isDelivered,
      reasons,
    };
  },

  // Obtener siguiente acción disponible
  async getNextAction(orderId: string): Promise<{
    action: string | null;
    phase: string | null;
    canAct: boolean;
  }> {
    const jewelryData = await jewelryQueries.getJewelryData(orderId);
    
    if (!jewelryData) {
      return { action: null, phase: null, canAct: false };
    }

    if (jewelryData.isDelivered) {
      return { action: null, phase: 'delivery', canAct: false };
    }

    const canDeliver = await jewelryUtils.canDeliverOrder(orderId);
    
    switch (jewelryData.currentPhase) {
      case 'creation':
        return { action: 'start_work', phase: 'start_work', canAct: true };
      case 'start_work':
        return { action: 'finish_work', phase: 'end_work', canAct: true };
      case 'end_work':
        return { 
          action: canDeliver.canDeliver ? 'deliver' : null, 
          phase: 'delivery', 
          canAct: canDeliver.canDeliver 
        };
      default:
        return { action: null, phase: jewelryData.currentPhase, canAct: false };
    }
  },
};
