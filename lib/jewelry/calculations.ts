/**
 * Funciones de cálculo para el flujo de joyería
 * Centraliza toda la lógica matemática y de negocio
 */

// Ley aproximada del oro (promedio ponderado)
export function calcApproxGoldLaw(
  clientPurity: number | null,
  clientWeight: number | null,
  jewelryPurity: number,
  jewelryWeight: number
): number | null {
  if (!clientPurity || !clientWeight) {
    return jewelryPurity; // Solo joyería si no hay material del cliente
  }

  const totalWeight = clientWeight + jewelryWeight;
  if (totalWeight === 0) return null;

  // Promedio ponderado: (clientPurity * clientWeight + jewelryPurity * jewelryWeight) / totalWeight
  const weightedSum = clientPurity * clientWeight + jewelryPurity * jewelryWeight;
  return Number((weightedSum / totalWeight).toFixed(1));
}

// Excedente de material (positivo = sobra, negativo = falta)
export function calcMaterialSurplus(
  totalMetalWeight: number,
  estimatedWeight: number
): number {
  return Number((totalMetalWeight - estimatedWeight).toFixed(2));
}

// Peso metal total
export function calcTotalMetalWeight(
  clientWeight: number | null,
  jewelryWeight: number
): number {
  const total = (clientWeight || 0) + jewelryWeight;
  return Number(total.toFixed(2));
}

// Saldo pendiente de pago
export function calcPendingBalance(
  totalAmount: number | null,
  paidAmount: number
): number {
  if (!totalAmount) return 0;
  return Number((totalAmount - paidAmount).toFixed(2));
}

// Valor estimado del material (aproximado para referencia)
// metalPricePerGram: precio dinámico desde pricing_metals (si se pasa).
// Si no se pasa, usa valores de respaldo hardcodeados para compatibilidad.
export function calcEstimatedMaterialValue(
  metalType: 'gold' | 'silver',
  purity: number,
  weightGr: number,
  metalPricePerGram?: number
): number {
  const FALLBACK_GOLD = 100000;
  const FALLBACK_SILVER = 2000;

  const pricePerGram = metalPricePerGram ?? (metalType === 'gold' ? FALLBACK_GOLD : FALLBACK_SILVER);

  if (metalType === 'gold') {
    // Ajustar por pureza (24K = 100%)
    const purityRatio = purity / 24;
    return Number((weightGr * purityRatio * pricePerGram).toFixed(0));
  } else {
    // Plata: 0.925 = 92.5% pureza
    const purityRatio = purity / 1;
    return Number((weightGr * purityRatio * pricePerGram).toFixed(0));
  }
}

// Porcentaje de avance del ciclo de trabajo
export function calcCycleProgress(
  hasMaterialDelivery: boolean,
  hasWorkDelivery: boolean,
  qcResult: 'approved' | 'rejected' | null
): number {
  if (!hasMaterialDelivery) return 0;
  if (!hasWorkDelivery) return 50; // 50% si material entregado pero trabajo no finalizado
  if (!qcResult) return 75; // 75% si trabajo entregado pero sin QC
  return 100; // 100% si QC realizado
}

// Eficiencia de material (peso final vs peso entregado)
export function calcMaterialEfficiency(
  finalWeight: number,
  deliveredWeight: number
): number {
  if (deliveredWeight === 0) return 0;
  return Number(((finalWeight / deliveredWeight) * 100).toFixed(1));
}

// Días en fase actual
export function calcDaysInPhase(
  phaseStartDate: string | null,
  currentDate: Date = new Date()
): number {
  if (!phaseStartDate) return 0;
  
  const start = new Date(phaseStartDate);
  const diff = currentDate.getTime() - start.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

// Tiempo promedio por fase (en días)
export function calcAveragePhaseTime(
  phaseLogs: Array<{ newPhase: string; createdAt: string }>,
  phaseName: string
): number {
  const phaseEntries = phaseLogs.filter(log => log.newPhase === phaseName);
  if (phaseEntries.length === 0) return 0;

  let totalDays = 0;
  let count = 0;

  for (let i = 0; i < phaseEntries.length; i++) {
    const currentEntry = phaseEntries[i];
    const nextEntry = phaseEntries[i + 1];
    
    const start = new Date(currentEntry.createdAt);
    const end = nextEntry ? new Date(nextEntry.createdAt) : new Date();
    
    totalDays += (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    count++;
  }

  return count > 0 ? Number((totalDays / count).toFixed(1)) : 0;
}

// Peso de piedras perdido (entregado vs usado)
export function calcStoneLoss(
  deliveredStoneWeight: number | null,
  usedStoneWeight: number | null
): number {
  if (!deliveredStoneWeight || !usedStoneWeight) return 0;
  return Number((deliveredStoneWeight - usedStoneWeight).toFixed(2));
}

// Costo estimado del retrabajo
export function calcReworkCost(
  originalPrice: number,
  reworkCount: number,
  complexityFactor: number = 0.3 // 30% del precio original por retrabajo
): number {
  if (reworkCount === 0) return 0;
  return Number((originalPrice * reworkCount * complexityFactor).toFixed(0));
}

// Rentabilidad del pedido
export function calcProfitMargin(
  totalPrice: number,
  materialCost: number,
  laborCost: number
): number {
  if (totalPrice === 0) return 0;
  const totalCost = materialCost + laborCost;
  return Number(((totalPrice - totalCost) / totalPrice * 100).toFixed(1));
}

// Formateo de moneda colombiana
export function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Formateo de peso con decimales
export function formatWeight(weight: number): string {
  return `${weight.toFixed(2)} gr`;
}

// Formateo de pureza
export function formatPurity(purity: number, metalType: 'gold' | 'silver'): string {
  if (metalType === 'gold') {
    return `${purity.toFixed(1)}K`;
  }
  return purity.toFixed(3);
}

// Obtener etiqueta de color del oro
export function getGoldColorLabel(color: string): string {
  const labels: Record<string, string> = {
    yellow: 'Amarillo',
    rose: 'Rosado',
    white: 'Blanco',
  };
  return labels[color] || color;
}

// Obtener etiqueta de tipo de metal
export function getMetalTypeLabel(type: string): string {
  return type === 'gold' ? 'Oro' : 'Plata';
}

// Calcular estadísticas de producción
export function calcProductionStats(cycles: Array<{
  isRework: boolean;
  qcResult: 'approved' | 'rejected' | null;
  finalWeightGr?: number | null;
  deliveredWeightGr?: number | null;
}>) {
  const totalCycles = cycles.length;
  const reworkCycles = cycles.filter(c => c.isRework).length;
  const approvedCycles = cycles.filter(c => c.qcResult === 'approved').length;
  const rejectedCycles = cycles.filter(c => c.qcResult === 'rejected').length;

  // Eficiencia promedio
  const efficiencyCycles = cycles.filter(c => 
    c.finalWeightGr && c.deliveredWeightGr
  );
  const avgEfficiency = efficiencyCycles.length > 0
    ? efficiencyCycles.reduce((sum, c) => 
        sum + calcMaterialEfficiency(c.finalWeightGr!, c.deliveredWeightGr!), 0
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
}
