import { createClient } from '@/lib/supabase/client';
import type {
  InventoryItem,
  InventoryMovement,
  Expense,
  AccountingDashboardData,
  ExpenseCategory,
  MovementType,
} from './types';

// ============================================================
// INVENTORY ITEMS
// ============================================================

export async function fetchInventoryItems(activeOnly = true): Promise<InventoryItem[]> {
  const supabase = createClient();
  let query = supabase
    .from('inventory_items')
    .select('*')
    .order('type')
    .order('name');

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(normalizeInventoryItem);
}

export async function upsertInventoryItem(payload: {
  name: string;
  code: string;
  type: 'metal' | 'stone';
  unit: string;
}): Promise<InventoryItem> {
  const supabase = createClient();

  // Try to find existing item by code
  const { data: existing } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('code', payload.code)
    .single();

  if (existing) return normalizeInventoryItem(existing);

  const { data, error } = await supabase
    .from('inventory_items')
    .insert({
      name: payload.name,
      code: payload.code,
      type: payload.type,
      unit: payload.unit,
      current_stock: 0,
      is_active: true,
    })
    .select('*')
    .single();

  if (error) throw error;
  return normalizeInventoryItem(data);
}

export async function updateInventoryItem(
  id: string,
  updates: Partial<Pick<InventoryItem, 'name' | 'min_stock' | 'cost_per_unit' | 'is_active' | 'current_stock'>>
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('inventory_items')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ============================================================
// INVENTORY MOVEMENTS
// ============================================================

export interface FetchMovementsFilters {
  itemId?: string;
  movementType?: MovementType;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export async function fetchInventoryMovements(
  filters: FetchMovementsFilters = {}
): Promise<{ data: InventoryMovement[]; count: number }> {
  const supabase = createClient();
  const { itemId, movementType, from, to, limit = 50, offset = 0 } = filters;

  let query = supabase
    .from('inventory_movements')
    .select(
      `
      *,
      item:inventory_items!item_id ( id, name, code, unit ),
      registered_by_user:users!registered_by ( id, first_name, last_name )
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (itemId) query = query.eq('item_id', itemId);
  if (movementType) query = query.eq('movement_type', movementType);
  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', to);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    data: (data || []).map(normalizeMovement),
    count: count ?? 0,
  };
}

export async function createInventoryMovement(payload: {
  item_id: string;
  movement_type: MovementType;
  quantity: number;
  unit_cost?: number | null;
  total_cost?: number | null;
  reference?: string | null;
  notes?: string | null;
  registered_by: string;
}): Promise<void> {
  const supabase = createClient();

  const finalQuantity =
    payload.movement_type === 'delivery' || payload.movement_type === 'sale'
      ? -Math.abs(payload.quantity)
      : Math.abs(payload.quantity);

  const totalCost =
    payload.total_cost ??
    (payload.unit_cost != null ? Math.abs(payload.quantity) * payload.unit_cost : null);

  const { error: movErr } = await supabase.from('inventory_movements').insert({
    item_id: payload.item_id,
    movement_type: payload.movement_type,
    quantity: finalQuantity,
    unit_cost: payload.unit_cost ?? null,
    total_cost: totalCost,
    reference: payload.reference ?? null,
    notes: payload.notes ?? null,
    registered_by: payload.registered_by,
  });
  if (movErr) throw movErr;

  const { error: stockErr } = await supabase.rpc('adjust_inventory_stock', {
    p_item_id: payload.item_id,
    p_delta: finalQuantity,
  });

  if (stockErr) {
    const { data: item } = await supabase
      .from('inventory_items')
      .select('current_stock')
      .eq('id', payload.item_id)
      .single();

    if (item) {
      await supabase
        .from('inventory_items')
        .update({
          current_stock: Number(item.current_stock) + finalQuantity,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payload.item_id);
    }
  }
}

// ============================================================
// EXPENSES
// ============================================================

export interface FetchExpensesFilters {
  category?: ExpenseCategory;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export async function fetchExpenses(
  filters: FetchExpensesFilters = {}
): Promise<{ data: Expense[]; count: number }> {
  const supabase = createClient();
  const { category, from, to, limit = 50, offset = 0 } = filters;

  let query = supabase
    .from('expenses')
    .select(
      `
      *,
      registered_by_user:users!registered_by ( id, first_name, last_name )
    `,
      { count: 'exact' }
    )
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (category) query = query.eq('category', category);
  if (from) query = query.gte('expense_date', from);
  if (to) query = query.lte('expense_date', to);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    data: (data || []).map(normalizeExpense),
    count: count ?? 0,
  };
}

export async function createExpense(payload: {
  category: ExpenseCategory;
  description: string;
  amount_cop: number;
  expense_date: string;
  payment_method?: string | null;
  receipt_url?: string | null;
  notes?: string | null;
  registered_by: string;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('expenses').insert(payload);
  if (error) throw error;
}

export async function updateExpense(
  id: string,
  updates: Partial<Pick<Expense, 'category' | 'description' | 'amount_cop' | 'expense_date' | 'payment_method' | 'notes'>>
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('expenses')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteExpense(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// DASHBOARD CONTABLE
// ============================================================

export async function fetchAccountingDashboard(
  from: string,
  to: string
): Promise<AccountingDashboardData> {
  const supabase = createClient();

  const [paymentsRes, workerPaymentsRes, inventoryPurchasesRes, expensesRes] =
    await Promise.all([
      supabase
        .from('payments')
        .select('id, amount_cop, paid_at, created_at')
        .eq('status', 'completed')
        .gte('created_at', from)
        .lte('created_at', to),

      supabase
        .from('worker_payments')
        .select('id, amount_cop, status, paid_at, created_at')
        .gte('created_at', from)
        .lte('created_at', to),

      supabase
        .from('inventory_movements')
        .select('id, quantity, total_cost, unit_cost, created_at')
        .eq('movement_type', 'purchase')
        .gte('created_at', from)
        .lte('created_at', to),

      supabase
        .from('expenses')
        .select('id, category, amount_cop, expense_date')
        .gte('expense_date', from.slice(0, 10))
        .lte('expense_date', to.slice(0, 10)),
    ]);

  const payments = paymentsRes.data || [];
  const workerPayments = workerPaymentsRes.data || [];
  const purchases = inventoryPurchasesRes.data || [];
  const expenses = expensesRes.data || [];

  const ingresos = payments.reduce((s, p) => s + Number(p.amount_cop), 0);
  const egresosTrabajadores = workerPayments
    .filter((p) => p.status === 'paid')
    .reduce((s, p) => s + Number(p.amount_cop), 0);
  const pagosPendientesTrabajadores = workerPayments
    .filter((p) => p.status === 'pending')
    .reduce((s, p) => s + Number(p.amount_cop), 0);
  const egresosMateriales = purchases.reduce(
    (s, p) => s + Number(p.total_cost ?? (p.unit_cost ? Math.abs(Number(p.quantity)) * Number(p.unit_cost) : 0)),
    0
  );
  const egresosGastos = expenses.reduce((s, e) => s + Number(e.amount_cop), 0);

  const margenBruto = ingresos - egresosTrabajadores - egresosMateriales;
  const margenNeto = margenBruto - egresosGastos;

  const gastosPorCategoriaMap: Record<string, number> = {};
  expenses.forEach((e) => {
    gastosPorCategoriaMap[e.category] = (gastosPorCategoriaMap[e.category] || 0) + Number(e.amount_cop);
  });
  const gastosPorCategoria = Object.entries(gastosPorCategoriaMap).map(([category, total]) => ({
    category: category as ExpenseCategory,
    total,
  }));

  const recentMovements = [
    ...payments.slice(0, 5).map((p) => ({
      type: 'payment' as const,
      date: p.paid_at || p.created_at,
      description: 'Cobro a cliente',
      amount: Number(p.amount_cop),
      isIncome: true,
    })),
    ...workerPayments
      .filter((p) => p.status === 'paid')
      .slice(0, 5)
      .map((p) => ({
        type: 'worker_payment' as const,
        date: p.paid_at || p.created_at,
        description: 'Pago a trabajador',
        amount: Number(p.amount_cop),
        isIncome: false,
      })),
    ...purchases.slice(0, 5).map((p) => ({
      type: 'inventory_purchase' as const,
      date: p.created_at,
      description: 'Compra de material',
      amount: Number(p.total_cost ?? 0),
      isIncome: false,
    })),
    ...expenses.slice(0, 5).map((e) => ({
      type: 'expense' as const,
      date: e.expense_date,
      description: 'Gasto operativo',
      amount: Number(e.amount_cop),
      isIncome: false,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  const cashFlowByWeek = buildCashFlowByWeek(from, to, payments, workerPayments, purchases, expenses);

  return {
    kpis: {
      ingresos,
      egresosTrabajadores,
      egresosMateriales,
      egresosGastos,
      margenBruto,
      margenNeto,
      pagosPendientesTrabajadores,
      pagosCount: payments.length,
      gastosPorCategoria,
    },
    recentMovements,
    cashFlowByWeek,
  };
}

// ============================================================
// HELPERS
// ============================================================

function buildCashFlowByWeek(
  from: string,
  to: string,
  payments: { amount_cop: number; created_at: string }[],
  workerPayments: { amount_cop: number; status: string; created_at: string }[],
  purchases: { total_cost: number | null; unit_cost: number | null; quantity: number; created_at: string }[],
  expenses: { amount_cop: number; expense_date: string }[]
): { week: string; ingresos: number; egresos: number }[] {
  const start = new Date(from);
  const end = new Date(to);
  const weeks: { week: string; start: Date; end: Date }[] = [];

  const cur = new Date(start);
  while (cur <= end) {
    const weekEnd = new Date(cur);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weeks.push({
      week: cur.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }),
      start: new Date(cur),
      end: weekEnd > end ? new Date(end) : weekEnd,
    });
    cur.setDate(cur.getDate() + 7);
  }

  return weeks.map(({ week, start: ws, end: we }) => {
    const ingresos = payments
      .filter((p) => {
        const d = new Date(p.created_at);
        return d >= ws && d <= we;
      })
      .reduce((s, p) => s + Number(p.amount_cop), 0);

    const egresosWorkers = workerPayments
      .filter((p) => {
        if (p.status !== 'paid') return false;
        const d = new Date(p.created_at);
        return d >= ws && d <= we;
      })
      .reduce((s, p) => s + Number(p.amount_cop), 0);

    const egresosMat = purchases
      .filter((p) => {
        const d = new Date(p.created_at);
        return d >= ws && d <= we;
      })
      .reduce((s, p) => s + Number(p.total_cost ?? 0), 0);

    const egresosGastos = expenses
      .filter((e) => {
        const d = new Date(e.expense_date);
        return d >= ws && d <= we;
      })
      .reduce((s, e) => s + Number(e.amount_cop), 0);

    return { week, ingresos, egresos: egresosWorkers + egresosMat + egresosGastos };
  });
}

function normalizeInventoryItem(raw: unknown): InventoryItem {
  const r = raw as Record<string, unknown>;
  return {
    ...(r as unknown as InventoryItem),
    current_stock: Number(r.current_stock) || 0,
    min_stock: r.min_stock != null ? Number(r.min_stock) : null,
    cost_per_unit: r.cost_per_unit != null ? Number(r.cost_per_unit) : null,
  };
}

function normalizeMovement(raw: unknown): InventoryMovement {
  const r = raw as Record<string, unknown>;
  return {
    ...(r as unknown as InventoryMovement),
    quantity: Number(r.quantity) || 0,
    unit_cost: r.unit_cost != null ? Number(r.unit_cost) : null,
    total_cost: r.total_cost != null ? Number(r.total_cost) : null,
  };
}

function normalizeExpense(raw: unknown): Expense {
  const r = raw as Record<string, unknown>;
  return {
    ...(r as unknown as Expense),
    amount_cop: Number(r.amount_cop) || 0,
  };
}
