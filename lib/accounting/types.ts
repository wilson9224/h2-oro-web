export type InventoryItemType = 'metal' | 'stone';

export type MovementType = 'purchase' | 'delivery' | 'return' | 'adjustment' | 'sale';

export type ExpenseCategory =
  | 'rent'
  | 'utilities'
  | 'tools'
  | 'maintenance'
  | 'marketing'
  | 'other';

export type PaymentMethod = 'cash' | 'transfer' | 'card' | 'other';

export interface InventoryItem {
  id: string;
  type: InventoryItemType;
  name: string;
  code: string;
  unit: string;
  current_stock: number;
  min_stock: number | null;
  cost_per_unit: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryMovement {
  id: string;
  item_id: string;
  movement_type: MovementType;
  quantity: number;
  unit_cost: number | null;
  total_cost: number | null;
  assignment_id: string | null;
  order_id: string | null;
  reference: string | null;
  notes: string | null;
  registered_by: string | null;
  created_at: string;
  item?: Pick<InventoryItem, 'id' | 'name' | 'code' | 'unit'>;
  registered_by_user?: { id: string; first_name: string; last_name: string } | null;
}

export interface Expense {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount_cop: number;
  expense_date: string;
  payment_method: PaymentMethod | null;
  receipt_url: string | null;
  notes: string | null;
  registered_by: string | null;
  created_at: string;
  updated_at: string;
  registered_by_user?: { id: string; first_name: string; last_name: string } | null;
}

export interface AccountingKPIs {
  ingresos: number;
  egresosTrabajadores: number;
  egresosMateriales: number;
  egresosGastos: number;
  margenBruto: number;
  margenNeto: number;
  pagosPendientesTrabajadores: number;
  pagosCount: number;
  gastosPorCategoria: { category: ExpenseCategory; total: number }[];
}

export interface AccountingDashboardData {
  kpis: AccountingKPIs;
  recentMovements: {
    type: 'payment' | 'worker_payment' | 'inventory_purchase' | 'expense';
    date: string;
    description: string;
    amount: number;
    isIncome: boolean;
  }[];
  cashFlowByWeek: { week: string; ingresos: number; egresos: number }[];
}

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  rent: 'Arriendo',
  utilities: 'Servicios públicos',
  tools: 'Herramientas',
  maintenance: 'Mantenimiento',
  marketing: 'Publicidad',
  other: 'Otro',
};

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  purchase: 'Compra',
  delivery: 'Entrega a joyero',
  return: 'Devolución',
  adjustment: 'Ajuste manual',
  sale: 'Venta',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  card: 'Tarjeta',
  other: 'Otro',
};
