/**
 * Funciones de cálculo para precios de metales
 * Campos derivados calculados en tiempo real en la UI
 */

// Precio base compra = precio internacional × porcentaje compra / 100
export function calcPurchaseBasePrice(
  internationalPrice: number,
  purchasePercentage: number | null
): number | null {
  if (purchasePercentage === null || purchasePercentage === undefined) return null;
  return Number((internationalPrice * purchasePercentage / 100).toFixed(2));
}

// Precio base venta cliente = precio internacional × porcentaje venta cliente / 100
export function calcClientSalePrice(
  internationalPrice: number,
  clientSalePercentage: number | null
): number | null {
  if (clientSalePercentage === null || clientSalePercentage === undefined) return null;
  return Number((internationalPrice * clientSalePercentage / 100).toFixed(2));
}

// Precio base venta joyero = precio internacional × porcentaje venta joyero / 100
export function calcJewelerSalePrice(
  internationalPrice: number,
  jewelerSalePercentage: number | null
): number | null {
  if (jewelerSalePercentage === null || jewelerSalePercentage === undefined) return null;
  return Number((internationalPrice * jewelerSalePercentage / 100).toFixed(2));
}

// Formatear precio en COP
export function formatPriceCOP(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Formatear porcentaje
export function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined) return '---';
  return `${value}%`;
}

// Calcular peso de metal incluyendo merma
// weightGr: peso requerido para la pieza final
// mermaPercentage: porcentaje de pérdida inevitable
// Retorna el peso total que el cliente debe proporcionar/pagar
export function calcMetalWithMerma(
  weightGr: number,
  mermaPercentage: number | null
): number {
  if (mermaPercentage === null || mermaPercentage === undefined || mermaPercentage === 0) {
    return weightGr;
  }
  return Number((weightGr * (1 + mermaPercentage / 100)).toFixed(2));
}

// Calcular costo de metal incluyendo merma
// pricePerGram: precio por gramo del metal
// weightGr: peso requerido para la pieza final
// mermaPercentage: porcentaje de pérdida inevitable
export function calcMetalCostWithMerma(
  pricePerGram: number,
  weightGr: number,
  mermaPercentage: number | null
): number {
  const totalWeight = calcMetalWithMerma(weightGr, mermaPercentage);
  return Number((pricePerGram * totalWeight).toFixed(2));
}
