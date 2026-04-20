/**
 * Validaciones de reglas de negocio para el flujo de joyería
 * Centraliza todas las validaciones y reglas del negocio
 */

import { calcPendingBalance } from './calculations';

// Interfaces para validaciones
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
}

export interface JewelryData {
  metalType: 'gold' | 'silver';
  estimatedWeightGr: number;
  clientProvidesMetal: boolean;
  clientMetalPurity?: number | null;
  clientMetalWeightGr?: number | null;
  clientGoldColor?: string | null;
}

export interface StartWorkData {
  jewelryMetalPurity: number;
  jewelryMetalWeightGr: number;
  jewelryGoldColor?: string;
  includesStones: boolean;
  stoneType?: string;
  stoneCount?: number;
  stoneWeightGr?: number;
  deliveredByUserId: string;
  receivedByUserId: string;
  materialDeliveryDate: string;
}

export interface FinishWorkData {
  finalWeightGr: number;
  leftoverStonesGr?: number;
  returnedMaterialGr: number;
  qcResult: 'approved' | 'rejected';
  qcObservations: string;
  qcByUserId: string;
  workReceivedByUserId: string;
  workDeliveryDate: string;
}

export interface DeliveryData {
  receiverName: string;
  deliveredByUserId: string;
  deliveryDate: string;
}

export interface MaterialPaymentData {
  metalType: 'gold' | 'silver';
  purity: number;
  weightGr: number;
  goldColor?: string;
  observation: string;
}

export interface CashPaymentData {
  amountCop: number;
  method: string;
  status: 'completed' | 'pending';
  paidAt: string;
  registeredByUserId: string;
}

// Validación de datos técnicos de joyería (Fase 1)
export function validateJewelryData(data: JewelryData): ValidationResult {
  // Validar tipo de metal
  if (!data.metalType || !['gold', 'silver'].includes(data.metalType)) {
    return { isValid: false, error: 'Debe seleccionar un tipo de metal válido (Oro o Plata)' };
  }

  // Validar peso estimado
  if (!data.estimatedWeightGr || data.estimatedWeightGr <= 0) {
    return { isValid: false, error: 'El peso estimado debe ser mayor a 0 gramos' };
  }

  // Validar datos del cliente si entrega material
  if (data.clientProvidesMetal) {
    if (!data.clientMetalPurity || data.clientMetalPurity <= 0) {
      return { isValid: false, error: 'La pureza del metal del cliente es requerida' };
    }

    if (!data.clientMetalWeightGr || data.clientMetalWeightGr <= 0) {
      return { isValid: false, error: 'El peso del metal del cliente es requerido' };
    }

    // Validar rango de pureza según tipo de metal
    if (data.metalType === 'gold') {
      if (data.clientMetalPurity > 24 || data.clientMetalPurity < 1) {
        return { isValid: false, error: 'La pureza del oro debe estar entre 1 y 24 quilates' };
      }
    } else {
      if (data.clientMetalPurity > 1 || data.clientMetalPurity < 0.5) {
        return { isValid: false, error: 'La pureza de la plata debe estar entre 0.5 y 1.0' };
      }
    }

    // Validar color del oro si es oro
    if (data.metalType === 'gold' && !data.clientGoldColor) {
      return { isValid: false, error: 'Debe seleccionar el color del oro' };
    }
  }

  return { isValid: true };
}

// Validación de inicio de trabajo (Fase 2)
export function validateStartWork(data: StartWorkData, jewelryData: JewelryData): ValidationResult {
  // Validar pureza del metal de joyería
  if (!data.jewelryMetalPurity || data.jewelryMetalPurity <= 0) {
    return { isValid: false, error: 'La pureza del metal de joyería es requerida' };
  }

  // Validar peso del metal de joyería
  if (!data.jewelryMetalWeightGr || data.jewelryMetalWeightGr <= 0) {
    return { isValid: false, error: 'El peso del metal de joyería es requerido' };
  }

  // Validar rango de pureza según tipo de metal
  if (jewelryData.metalType === 'gold') {
    if (data.jewelryMetalPurity > 24 || data.jewelryMetalPurity < 1) {
      return { isValid: false, error: 'La pureza del oro debe estar entre 1 y 24 quilates' };
    }

    // Validar color del oro
    if (!data.jewelryGoldColor || !['yellow', 'rose', 'white'].includes(data.jewelryGoldColor)) {
      return { isValid: false, error: 'Debe seleccionar un color de oro válido' };
    }
  } else {
    if (data.jewelryMetalPurity > 1 || data.jewelryMetalPurity < 0.5) {
      return { isValid: false, error: 'La pureza de la plata debe estar entre 0.5 y 1.0' };
    }
  }

  // Validar datos de piedras si incluye piedras
  if (data.includesStones) {
    if (!data.stoneType || data.stoneType.trim() === '') {
      return { isValid: false, error: 'El tipo de piedras es requerido cuando se incluyen piedras' };
    }

    if (!data.stoneCount || data.stoneCount <= 0) {
      return { isValid: false, error: 'La cantidad de piedras debe ser mayor a 0' };
    }

    if (!data.stoneWeightGr || data.stoneWeightGr <= 0) {
      return { isValid: false, error: 'El peso de las piedras debe ser mayor a 0 gramos' };
    }
  }

  // Validar responsables
  if (!data.deliveredByUserId || data.deliveredByUserId.trim() === '') {
    return { isValid: false, error: 'Debe seleccionar quién entrega el material' };
  }

  if (!data.receivedByUserId || data.receivedByUserId.trim() === '') {
    return { isValid: false, error: 'Debe seleccionar quién recibe el material' };
  }

  // Validar fecha
  if (!data.materialDeliveryDate) {
    return { isValid: false, error: 'La fecha de entrega del material es requerida' };
  }

  const deliveryDate = new Date(data.materialDeliveryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (deliveryDate > today) {
    return { isValid: false, error: 'La fecha de entrega no puede ser futura' };
  }

  return { isValid: true };
}

// Validación de fin de trabajo (Fase 3)
export function validateFinishWork(
  data: FinishWorkData, 
  currentCycle: { totalMetalWeightGr?: number | null }
): ValidationResult {
  // Validar peso final
  if (!data.finalWeightGr || data.finalWeightGr <= 0) {
    return { isValid: false, error: 'El peso final es requerido y debe ser mayor a 0' };
  }

  // RN-07: Validar que material devuelto no sea mayor al entregado
  if (currentCycle.totalMetalWeightGr && data.returnedMaterialGr > currentCycle.totalMetalWeightGr) {
    return { 
      isValid: false, 
      error: 'El material devuelto no puede ser mayor al material entregado' 
    };
  }

  if (data.returnedMaterialGr < 0) {
    return { isValid: false, error: 'El material devuelto no puede ser negativo' };
  }

  // Validar sobrantes de piedras
  if (data.leftoverStonesGr !== undefined && data.leftoverStonesGr < 0) {
    return { isValid: false, error: 'El peso de sobrantes de piedras no puede ser negativo' };
  }

  // Validar observaciones de QC si es rechazado
  if (data.qcResult === 'rejected' && (!data.qcObservations || data.qcObservations.trim() === '')) {
    return { 
      isValid: false, 
      error: 'Las observaciones de control de calidad son obligatorias cuando se rechaza el trabajo' 
    };
  }

  // Validar responsables
  if (!data.qcByUserId || data.qcByUserId.trim() === '') {
    return { isValid: false, error: 'Debe seleccionar quién realiza el control de calidad' };
  }

  if (!data.workReceivedByUserId || data.workReceivedByUserId.trim() === '') {
    return { isValid: false, error: 'Debe seleccionar quién recibe el trabajo' };
  }

  // Validar fecha
  if (!data.workDeliveryDate) {
    return { isValid: false, error: 'La fecha de entrega del trabajo es requerida' };
  }

  const deliveryDate = new Date(data.workDeliveryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (deliveryDate > today) {
    return { isValid: false, error: 'La fecha de entrega no puede ser futura' };
  }

  // Advertencia si peso final es mayor al entregado y no hay piedras
  if (currentCycle.totalMetalWeightGr && 
      data.finalWeightGr > currentCycle.totalMetalWeightGr) {
    return { 
      isValid: true, 
      warning: 'El peso final es mayor al material entregado. Verifique si hay piedras no registradas.' 
    };
  }

  return { isValid: true };
}

// Validación de entrega (Fase 4)
export function validateDelivery(
  data: DeliveryData,
  orderData: {
    totalAmountCop?: number;
    totalPaidAmount: number;
    isQcApproved: boolean;
  }
): ValidationResult {
  // Validar nombre del receptor
  if (!data.receiverName || data.receiverName.trim() === '') {
    return { isValid: false, error: 'El nombre del receptor es requerido' };
  }

  if (data.receiverName.length < 3) {
    return { isValid: false, error: 'El nombre del receptor debe tener al menos 3 caracteres' };
  }

  // Validar responsable
  if (!data.deliveredByUserId || data.deliveredByUserId.trim() === '') {
    return { isValid: false, error: 'Debe seleccionar quién entrega el pedido' };
  }

  // Validar fecha
  if (!data.deliveryDate) {
    return { isValid: false, error: 'La fecha de entrega es requerida' };
  }

  const deliveryDate = new Date(data.deliveryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (deliveryDate > today) {
    return { isValid: false, error: 'La fecha de entrega no puede ser futura' };
  }

  // Validaciones de negocio
  if (!orderData.isQcApproved) {
    return { 
      isValid: false, 
      error: 'No se puede entregar el pedido. El control de calidad no ha sido aprobado.' 
    };
  }

  const pendingBalance = calcPendingBalance(orderData.totalAmountCop || null, orderData.totalPaidAmount);
  if (pendingBalance > 0) {
    return { 
      isValid: false, 
      error: `No se puede entregar el pedido. Hay un saldo pendiente de $${new Intl.NumberFormat('es-CO').format(pendingBalance)}.` 
    };
  }

  return { isValid: true };
}

// Validación de abono en material
export function validateMaterialPayment(data: MaterialPaymentData, isDelivered: boolean): ValidationResult {
  // No se pueden registrar abonos si el pedido ya está entregado
  if (isDelivered) {
    return { isValid: false, error: 'No se pueden registrar abonos de material en pedidos ya entregados' };
  }

  // Validar tipo de metal
  if (!data.metalType || !['gold', 'silver'].includes(data.metalType)) {
    return { isValid: false, error: 'Debe seleccionar un tipo de metal válido (Oro o Plata)' };
  }

  // Validar pureza
  if (!data.purity || data.purity <= 0) {
    return { isValid: false, error: 'La pureza es requerida y debe ser mayor a 0' };
  }

  // Validar rango de pureza según tipo de metal
  if (data.metalType === 'gold') {
    if (data.purity > 24 || data.purity < 1) {
      return { isValid: false, error: 'La pureza del oro debe estar entre 1 y 24 quilates' };
    }
  } else {
    if (data.purity > 1 || data.purity < 0.5) {
      return { isValid: false, error: 'La pureza de la plata debe estar entre 0.5 y 1.0' };
    }
  }

  // Validar peso
  if (!data.weightGr || data.weightGr <= 0) {
    return { isValid: false, error: 'El peso es requerido y debe ser mayor a 0' };
  }

  // Validar color del oro si es oro
  if (data.metalType === 'gold' && (!data.goldColor || !['yellow', 'rose', 'white'].includes(data.goldColor))) {
    return { isValid: false, error: 'Debe seleccionar un color de oro válido' };
  }

  return { isValid: true };
}

// Validación de abono en dinero
export function validateCashPayment(
  data: CashPaymentData, 
  orderData: { totalAmountCop?: number; totalPaidAmount: number },
  isDelivered: boolean
): ValidationResult {
  // No se pueden registrar pagos si el pedido ya está entregado
  if (isDelivered) {
    return { isValid: false, error: 'No se pueden registrar pagos en pedidos ya entregados' };
  }

  // Validar monto
  if (!data.amountCop || data.amountCop <= 0) {
    return { isValid: false, error: 'El monto es requerido y debe ser mayor a 0' };
  }

  // Validar método
  if (!data.method || data.method.trim() === '') {
    return { isValid: false, error: 'El método de pago es requerido' };
  }

  // Validar estado
  if (!['completed', 'pending'].includes(data.status)) {
    return { isValid: false, error: 'El estado del pago debe ser completado o pendiente' };
  }

  // Validar responsable
  if (!data.registeredByUserId || data.registeredByUserId.trim() === '') {
    return { isValid: false, error: 'Debe seleccionar quién registra el pago' };
  }

  // Validar fecha
  if (!data.paidAt) {
    return { isValid: false, error: 'La fecha del pago es requerida' };
  }

  const paidDate = new Date(data.paidAt);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (paidDate > today) {
    return { isValid: false, error: 'La fecha del pago no puede ser futura' };
  }

  // Advertencia si el monto es mayor al saldo pendiente
  if (orderData.totalAmountCop) {
    const pendingBalance = calcPendingBalance(orderData.totalAmountCop, orderData.totalPaidAmount);
    if (data.amountCop > pendingBalance && pendingBalance > 0) {
      return { 
        isValid: true, 
        warning: `El monto ingresado es mayor al saldo pendiente de $${new Intl.NumberFormat('es-CO').format(pendingBalance)}.` 
      };
    }
  }

  return { isValid: true };
}

// Validación de transición de fase
export function validatePhaseTransition(
  currentPhase: string,
  targetPhase: string,
  qcResult?: 'approved' | 'rejected' | null
): ValidationResult {
  const validTransitions: Record<string, string[]> = {
    'creation': ['start_work'],
    'start_work': ['end_work'],
    'end_work': qcResult === 'rejected' ? ['start_work'] : ['delivery'],
    'delivery': [], // Terminal state
  };

  if (!validTransitions[currentPhase]?.includes(targetPhase)) {
    return { 
      isValid: false, 
      error: `No se puede transitar de ${currentPhase} a ${targetPhase}` 
    };
  }

  return { isValid: true };
}

// Validación de estado del pedido
export function validateOrderStatus(
  currentStatus: string,
  targetStatus: string
): ValidationResult {
  const validStatusTransitions: Record<string, string[]> = {
    'pending': ['in_progress', 'cancelled'],
    'in_progress': ['ready', 'cancelled'],
    'ready': ['delivered', 'cancelled'],
    'delivered': [], // Terminal state
    'cancelled': [], // Terminal state
  };

  if (!validStatusTransitions[currentStatus]?.includes(targetStatus)) {
    return { 
      isValid: false, 
      error: `No se puede cambiar el estado de ${currentStatus} a ${targetStatus}` 
    };
  }

  return { isValid: true };
}
