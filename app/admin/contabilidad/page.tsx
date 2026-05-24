'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Package,
  Hammer,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  CreditCard,
  Wallet,
  Receipt,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { EXPENSE_CATEGORY_LABELS, type ExpenseCategory } from '@/lib/accounting/types';

const supabase = createClient();

type Period = '7d' | '30d' | '90d' | 'month' | 'year';

const PERIOD_LABELS: Record<Period, string> = {
  '7d': '7 días',
  '30d': '30 días',
  '90d': '90 días',
  month: 'Este mes',
  year: 'Este año',
};

function getPeriodDates(period: Period): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString();
  let from: Date;
  switch (period) {
    case '7d':   from = new Date(now); from.setDate(from.getDate() - 7); break;
    case '30d':  from = new Date(now); from.setDate(from.getDate() - 30); break;
    case '90d':  from = new Date(now); from.setDate(from.getDate() - 90); break;
    case 'month': from = new Date(now.getFullYear(), now.getMonth(), 1); break;
    case 'year':  from = new Date(now.getFullYear(), 0, 1); break;
  }
  return { from: from.toISOString(), to };
}

function formatCOP(amount: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

function formatShort(amount: number) {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return formatCOP(amount);
}

/* ─── Types ─── */
interface PaymentRow { id: string; order_id: string; amount_cop: number; paid_at: string | null; created_at: string }
interface WorkerPaymentRow { id: string; amount_cop: number; status: string; paid_at: string | null; created_at: string }
interface PurchaseRow { id: string; quantity: number; total_cost: number | null; unit_cost: number | null; created_at: string }
interface ExpenseRow { id: string; category: string; description: string; amount_cop: number; expense_date: string }
interface OrderRow {
  id: string; order_number: string; total_amount_cop: number | null; status: string; created_at: string;
  client: { first_name: string; last_name: string } | { first_name: string; last_name: string }[];
}
interface CashFlowWeek { week: string; ingresos: number; egresos: number }

interface FinanceData {
  payments: PaymentRow[];
  workerPayments: WorkerPaymentRow[];
  purchases: PurchaseRow[];
  expenses: ExpenseRow[];
  orders: OrderRow[];
  cashFlow: CashFlowWeek[];
}

/* ═══════════════════════════════════════════════════════════════ */
export default function ContabilidadDashboardPage() {
  const [period, setPeriod] = useState<Period>('30d');
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { from, to } = getPeriodDates(period);

      const [paymentsRes, wpRes, purchRes, expRes, ordersRes] = await Promise.all([
        supabase.from('payments').select('id, order_id, amount_cop, paid_at, created_at').eq('status', 'completed').gte('created_at', from).lte('created_at', to),
        supabase.from('worker_payments').select('id, amount_cop, status, paid_at, created_at').gte('created_at', from).lte('created_at', to),
        supabase.from('inventory_movements').select('id, quantity, total_cost, unit_cost, created_at').eq('movement_type', 'purchase').gte('created_at', from).lte('created_at', to),
        supabase.from('expenses').select('id, category, description, amount_cop, expense_date').gte('expense_date', from.slice(0, 10)).lte('expense_date', to.slice(0, 10)),
        supabase.from('orders').select('id, order_number, total_amount_cop, status, created_at, client:users!client_id(first_name, last_name)').is('deleted_at', null).in('status', ['pending', 'in_progress']).order('created_at', { ascending: false }),
      ]);

      const payments = (paymentsRes.data || []) as PaymentRow[];
      const workerPayments = (wpRes.data || []) as WorkerPaymentRow[];
      const purchases = (purchRes.data || []) as PurchaseRow[];
      const expenses = (expRes.data || []) as ExpenseRow[];
      const orders = (ordersRes.data || []) as OrderRow[];

      // Also fetch ALL completed payments for cartera calculation (not period-filtered)
      const { data: allPayments } = await supabase.from('payments').select('id, order_id, amount_cop').eq('status', 'completed');
      const allPaidByOrder: Record<string, number> = {};
      (allPayments || []).forEach((p: { order_id: string; amount_cop: number }) => {
        allPaidByOrder[p.order_id] = (allPaidByOrder[p.order_id] || 0) + Number(p.amount_cop);
      });

      // Attach cartera to orders
      const ordersWithCartera = orders.map(o => ({
        ...o,
        _paid: allPaidByOrder[o.id] || 0,
        _balance: Math.max(0, (Number(o.total_amount_cop) || 0) - (allPaidByOrder[o.id] || 0)),
      }));

      // Build cash flow
      const cashFlow = buildCashFlow(from, to, payments, workerPayments, purchases, expenses);

      setData({
        payments,
        workerPayments,
        purchases,
        expenses,
        orders: ordersWithCartera as unknown as OrderRow[],
        cashFlow,
      });
    } catch (e) {
      setError('Error cargando datos. Intenta nuevamente.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  /* ─── Computed ─── */
  const computed = useMemo(() => {
    if (!data) return null;

    const ingresos = data.payments.reduce((s, p) => s + Number(p.amount_cop), 0);
    const egresosTrabajadores = data.workerPayments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount_cop), 0);
    const pendientesTrabajadores = data.workerPayments.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.amount_cop), 0);
    const egresosMateriales = data.purchases.reduce((s, p) => s + Number(p.total_cost ?? (p.unit_cost ? Math.abs(Number(p.quantity)) * Number(p.unit_cost) : 0)), 0);
    const egresosGastos = data.expenses.reduce((s, e) => s + Number(e.amount_cop), 0);
    const totalEgresos = egresosTrabajadores + egresosMateriales + egresosGastos;
    const margenNeto = ingresos - totalEgresos;
    const rentabilidad = ingresos > 0 ? (margenNeto / ingresos) * 100 : 0;

    // Gastos by category
    const gastoMap: Record<string, number> = {};
    data.expenses.forEach(e => { gastoMap[e.category] = (gastoMap[e.category] || 0) + Number(e.amount_cop); });
    const gastosPorCategoria = Object.entries(gastoMap).map(([cat, total]) => ({ category: cat as ExpenseCategory, total })).sort((a, b) => b.total - a.total);

    // Cartera
    type OrderWithCartera = OrderRow & { _paid: number; _balance: number };
    const carteraOrders = (data.orders as unknown as OrderWithCartera[])
      .filter(o => o._balance > 0)
      .sort((a, b) => b._balance - a._balance);
    const totalCartera = carteraOrders.reduce((s, o) => s + o._balance, 0);

    // Egresos breakdown
    const egresosBreakdown = [
      { label: 'Trabajadores', value: egresosTrabajadores, color: 'rgba(96,165,250,0.8)', icon: Hammer, pending: pendientesTrabajadores },
      { label: 'Gastos operativos', value: egresosGastos, color: 'rgba(248,113,113,0.8)', icon: TrendingDown, pending: 0 },
      { label: 'Materiales', value: egresosMateriales, color: 'rgba(251,191,36,0.8)', icon: Package, pending: 0 },
    ];

    // Recent movements (unified)
    type Movement = { date: string; title: string; sub: string; amount: number; isIncome: boolean; icon: string };
    const movements: Movement[] = [];

    data.payments.slice(0, 4).forEach(p => {
      const order = data.orders.find(o => o.id === p.order_id);
      const cl = order ? (Array.isArray(order.client) ? order.client[0] : order.client) : null;
      movements.push({
        date: p.paid_at || p.created_at,
        title: `Cobro ${order ? order.order_number : ''}`,
        sub: cl ? `${cl.first_name} ${cl.last_name}` : '',
        amount: Number(p.amount_cop), isIncome: true, icon: 'income',
      });
    });

    data.workerPayments.filter(w => w.status === 'paid').slice(0, 3).forEach(w => {
      movements.push({
        date: w.paid_at || w.created_at,
        title: 'Pago a trabajador',
        sub: formatCOP(Number(w.amount_cop)),
        amount: Number(w.amount_cop), isIncome: false, icon: 'worker',
      });
    });

    data.expenses.slice(0, 3).forEach(e => {
      movements.push({
        date: e.expense_date,
        title: e.description,
        sub: EXPENSE_CATEGORY_LABELS[e.category as ExpenseCategory] || e.category,
        amount: Number(e.amount_cop), isIncome: false, icon: 'expense',
      });
    });

    movements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      ingresos, totalEgresos, margenNeto, rentabilidad,
      egresosTrabajadores, pendientesTrabajadores, egresosMateriales, egresosGastos,
      gastosPorCategoria, carteraOrders, totalCartera,
      egresosBreakdown, movements: movements.slice(0, 8),
    };
  }, [data]);

  const maxBar = data ? Math.max(...data.cashFlow.flatMap(w => [w.ingresos, w.egresos]), 1) : 1;

  /* ─── Loading ─── */
  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-[130px] rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* ═══ Period Selector ═══ */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 font-sans-custom"
              style={{
                background: period === p ? 'rgba(212,175,55,0.12)' : 'transparent',
                color: period === p ? 'rgba(212,175,55,0.9)' : 'rgba(242,240,237,0.4)',
                border: period === p ? '1px solid rgba(212,175,55,0.2)' : '1px solid transparent',
              }}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 text-xs font-sans-custom transition-colors"
          style={{ color: 'rgba(242,240,237,0.35)' }}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {error && (
        <div className="rounded-xl p-4 text-sm flex items-center gap-2 font-sans-custom" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: 'rgba(248,113,113,0.8)' }}>
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {computed && data && (
        <>
          {/* ═══ 3 Hero KPIs ═══ */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Ingresos */}
            <div className="rounded-2xl p-5" style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.13)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>
                  <TrendingUp size={16} style={{ color: 'rgba(52,211,153,0.9)' }} />
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-sans-custom" style={{ background: 'rgba(52,211,153,0.08)', color: 'rgba(52,211,153,0.7)', border: '1px solid rgba(52,211,153,0.15)' }}>
                  {data.payments.length} cobros
                </span>
              </div>
              <p className="font-display text-[1.65rem] font-bold leading-none tracking-tight" style={{ color: 'rgba(52,211,153,0.95)' }}>
                {formatShort(computed.ingresos)}
              </p>
              <p className="text-xs font-medium mt-2 font-sans-custom" style={{ color: 'rgba(242,240,237,0.65)' }}>Ingresos</p>
              <p className="text-[10px] mt-0.5 font-sans-custom" style={{ color: 'rgba(242,240,237,0.28)' }}>Cobros completados en el período</p>
            </div>

            {/* Egresos */}
            <div className="rounded-2xl p-5" style={{ background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.12)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}>
                  <TrendingDown size={16} style={{ color: 'rgba(248,113,113,0.85)' }} />
                </div>
                {computed.pendientesTrabajadores > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-sans-custom flex items-center gap-1" style={{ background: 'rgba(251,191,36,0.08)', color: 'rgba(251,191,36,0.8)', border: '1px solid rgba(251,191,36,0.15)' }}>
                    <AlertTriangle size={9} />
                    {formatShort(computed.pendientesTrabajadores)} pend.
                  </span>
                )}
              </div>
              <p className="font-display text-[1.65rem] font-bold leading-none tracking-tight" style={{ color: 'rgba(248,113,113,0.9)' }}>
                {formatShort(computed.totalEgresos)}
              </p>
              <p className="text-xs font-medium mt-2 font-sans-custom" style={{ color: 'rgba(242,240,237,0.65)' }}>Egresos totales</p>
              <p className="text-[10px] mt-0.5 font-sans-custom" style={{ color: 'rgba(242,240,237,0.28)' }}>Trabajadores + materiales + gastos</p>
            </div>

            {/* Margen Neto */}
            <div className="rounded-2xl p-5" style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.13)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}>
                  <DollarSign size={16} style={{ color: 'rgba(212,175,55,0.9)' }} />
                </div>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-mono font-medium"
                  style={{
                    background: computed.rentabilidad >= 0 ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)',
                    color: computed.rentabilidad >= 0 ? 'rgba(52,211,153,0.8)' : 'rgba(248,113,113,0.8)',
                    border: `1px solid ${computed.rentabilidad >= 0 ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)'}`,
                  }}
                >
                  {computed.rentabilidad >= 0 ? '+' : ''}{computed.rentabilidad.toFixed(0)}%
                </span>
              </div>
              <p
                className="font-display text-[1.65rem] font-bold leading-none tracking-tight"
                style={{ color: computed.margenNeto >= 0 ? 'rgba(212,175,55,0.95)' : 'rgba(248,113,113,0.9)' }}
              >
                {formatShort(computed.margenNeto)}
              </p>
              <p className="text-xs font-medium mt-2 font-sans-custom" style={{ color: 'rgba(242,240,237,0.65)' }}>Margen neto</p>
              <p className="text-[10px] mt-0.5 font-sans-custom" style={{ color: 'rgba(242,240,237,0.28)' }}>Rentabilidad del período</p>
            </div>
          </div>

          {/* ═══ Cartera de Clientes ═══ */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.08)' }}>
                  <Wallet size={14} style={{ color: 'rgba(212,175,55,0.8)' }} />
                </div>
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] font-sans-custom" style={{ color: 'rgba(242,240,237,0.45)' }}>Cartera de clientes</h3>
                  <p className="text-[11px] mt-0.5 font-sans-custom" style={{ color: 'rgba(242,240,237,0.25)' }}>Saldos pendientes de cobro</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-display text-lg font-bold" style={{ color: computed.totalCartera > 0 ? 'rgba(251,191,36,0.9)' : 'rgba(52,211,153,0.9)' }}>
                  {formatCOP(computed.totalCartera)}
                </p>
                <p className="text-[10px] font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>total pendiente</p>
              </div>
            </div>

            {computed.carteraOrders.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <CheckCircle2 size={24} className="mx-auto mb-2" style={{ color: 'rgba(52,211,153,0.4)' }} />
                <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>Cartera al día — sin saldos pendientes</p>
              </div>
            ) : (
              <div>
                {(computed.carteraOrders as (OrderRow & { _paid: number; _balance: number })[]).map((order, idx) => {
                  const cl = Array.isArray(order.client) ? order.client[0] : order.client;
                  const total = Number(order.total_amount_cop) || 0;
                  const paidPct = total > 0 ? Math.min(100, (order._paid / total) * 100) : 0;

                  return (
                    <Link
                      key={order.id}
                      href={`/admin/pedidos/${order.id}`}
                      className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.02]"
                      style={{ borderBottom: idx < computed.carteraOrders.length - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined }}
                    >
                      {/* Payment status indicator */}
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{
                          background: paidPct === 0 ? 'rgba(248,113,113,0.8)' : paidPct >= 90 ? 'rgba(52,211,153,0.8)' : 'rgba(251,191,36,0.8)',
                        }}
                      />

                      {/* Order info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-medium" style={{ color: 'rgba(212,175,55,0.8)' }}>{order.order_number}</span>
                          <span className="text-xs font-sans-custom truncate" style={{ color: 'rgba(242,240,237,0.5)' }}>
                            {cl ? `${cl.first_name} ${cl.last_name}` : '—'}
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${paidPct}%`,
                                background: paidPct >= 90 ? 'rgba(52,211,153,0.6)' : paidPct >= 50 ? 'rgba(212,175,55,0.5)' : 'rgba(251,191,36,0.4)',
                              }}
                            />
                          </div>
                          <span className="text-[10px] font-mono shrink-0" style={{ color: 'rgba(242,240,237,0.35)' }}>
                            {Math.round(paidPct)}%
                          </span>
                        </div>
                      </div>

                      {/* Amounts */}
                      <div className="text-right shrink-0 hidden sm:block">
                        <p className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>
                          Pagado: <span style={{ color: 'rgba(52,211,153,0.7)' }}>{formatShort(order._paid)}</span>
                        </p>
                        <p className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>
                          Saldo: <span className="font-medium" style={{ color: 'rgba(251,191,36,0.9)' }}>{formatShort(order._balance)}</span>
                        </p>
                      </div>

                      {/* Mobile amount */}
                      <span className="sm:hidden text-sm font-medium font-sans-custom" style={{ color: 'rgba(251,191,36,0.9)' }}>
                        {formatShort(order._balance)}
                      </span>

                      <ChevronRight size={14} className="shrink-0 hidden sm:block" style={{ color: 'rgba(242,240,237,0.15)' }} />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* ═══ Egresos Breakdown + Cash Flow ═══ */}
          <div className="grid grid-cols-1 lg:grid-cols-[0.4fr_0.6fr] gap-4">
            {/* Egresos breakdown */}
            <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-4 font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>
                Desglose de egresos
              </h3>
              <div className="space-y-4">
                {computed.egresosBreakdown.map(item => {
                  const Icon = item.icon;
                  const pct = computed.totalEgresos > 0 ? (item.value / computed.totalEgresos) * 100 : 0;
                  return (
                    <div key={item.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <Icon size={13} style={{ color: item.color }} />
                          <span className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.55)' }}>{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium font-sans-custom" style={{ color: item.color }}>{formatShort(item.value)}</span>
                          <span className="text-[10px] font-mono" style={{ color: 'rgba(242,240,237,0.25)' }}>{pct.toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: item.color }} />
                      </div>
                      {item.pending > 0 && (
                        <p className="text-[10px] mt-1 flex items-center gap-1 font-sans-custom" style={{ color: 'rgba(251,191,36,0.7)' }}>
                          <AlertTriangle size={9} /> {formatCOP(item.pending)} pendiente
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Gastos por categoría */}
              {computed.gastosPorCategoria.length > 0 && (
                <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <h4 className="text-[10px] font-semibold uppercase tracking-[0.12em] mb-3 font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>
                    Gastos por categoría
                  </h4>
                  <div className="space-y-2">
                    {computed.gastosPorCategoria.map(({ category, total }) => (
                      <div key={category} className="flex items-center justify-between">
                        <span className="text-[11px] font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>
                          {EXPENSE_CATEGORY_LABELS[category] || category}
                        </span>
                        <span className="text-[11px] font-mono" style={{ color: 'rgba(242,240,237,0.55)' }}>{formatCOP(total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Cash flow chart */}
            <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>
                  Flujo de caja semanal
                </h3>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-[10px] font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'rgba(52,211,153,0.5)' }} /> Ingresos
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'rgba(248,113,113,0.5)' }} /> Egresos
                  </span>
                </div>
              </div>

              {data.cashFlow.length === 0 ? (
                <p className="text-sm text-center py-12 font-sans-custom" style={{ color: 'rgba(242,240,237,0.25)' }}>Sin datos en este período</p>
              ) : (
                <div className="flex items-end gap-2 h-40 overflow-x-auto pb-1">
                  {data.cashFlow.map((w, i) => (
                    <div key={i} className="flex-1 min-w-[44px] flex flex-col items-center gap-1">
                      <div className="w-full flex items-end gap-0.5 h-32">
                        <div
                          className="flex-1 rounded-t-md transition-all duration-300"
                          style={{ background: 'rgba(52,211,153,0.45)', height: `${Math.max(2, (w.ingresos / maxBar) * 100)}%` }}
                          title={`Ingresos: ${formatCOP(w.ingresos)}`}
                        />
                        <div
                          className="flex-1 rounded-t-md transition-all duration-300"
                          style={{ background: 'rgba(248,113,113,0.4)', height: `${Math.max(2, (w.egresos / maxBar) * 100)}%` }}
                          title={`Egresos: ${formatCOP(w.egresos)}`}
                        />
                      </div>
                      <span className="text-[9px] whitespace-nowrap font-sans-custom" style={{ color: 'rgba(242,240,237,0.25)' }}>{w.week}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ═══ Recent Movements ═══ */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Movimientos recientes</h3>
              <Link
                href="/admin/contabilidad/facturacion"
                className="text-[10px] uppercase tracking-[0.1em] flex items-center gap-1 font-sans-custom transition-colors"
                style={{ color: 'rgba(212,175,55,0.6)' }}
              >
                Ver facturación <ChevronRight size={11} />
              </Link>
            </div>

            {computed.movements.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Receipt size={24} className="mx-auto mb-2" style={{ color: 'rgba(242,240,237,0.15)' }} />
                <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>Sin movimientos en este período</p>
              </div>
            ) : (
              <div>
                {computed.movements.map((m, idx) => {
                  const isIncome = m.isIncome;
                  const iconMap: Record<string, typeof CreditCard> = {
                    income: CreditCard,
                    worker: Users,
                    expense: TrendingDown,
                  };
                  const Icon = iconMap[m.icon] || CreditCard;
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-3.5 px-5 py-3"
                      style={{ borderBottom: idx < computed.movements.length - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: isIncome ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)' }}
                      >
                        {isIncome
                          ? <Icon size={14} style={{ color: 'rgba(52,211,153,0.8)' }} />
                          : <Icon size={14} style={{ color: 'rgba(248,113,113,0.7)' }} />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.7)' }}>{m.title}</p>
                        <p className="text-[11px] font-sans-custom truncate" style={{ color: 'rgba(242,240,237,0.3)' }}>{m.sub}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span
                          className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full font-sans-custom"
                          style={{
                            background: isIncome ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)',
                            color: isIncome ? 'rgba(52,211,153,0.85)' : 'rgba(248,113,113,0.8)',
                          }}
                        >
                          {isIncome ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                          {formatShort(m.amount)}
                        </span>
                        <p className="text-[10px] mt-0.5 font-sans-custom" style={{ color: 'rgba(242,240,237,0.2)' }}>
                          {new Date(m.date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ═══ DIAN Note ═══ */}
          <div className="rounded-xl p-4 text-xs font-sans-custom" style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)' }}>
            {/* TODO: DIAN integration — Aquí se habilitará la generación de facturas electrónicas cuando se implemente el módulo de facturación DIAN */}
            <span style={{ color: 'rgba(242,240,237,0.2)' }}>Nota fiscal:</span>{' '}
            <span style={{ color: 'rgba(242,240,237,0.35)' }}>Este módulo está preparado para integración futura con facturación electrónica DIAN.</span>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Cash Flow Builder ─── */
function buildCashFlow(
  from: string, to: string,
  payments: PaymentRow[], workerPayments: WorkerPaymentRow[],
  purchases: PurchaseRow[], expenses: ExpenseRow[]
): CashFlowWeek[] {
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
    const inRange = (dateStr: string) => { const d = new Date(dateStr); return d >= ws && d <= we; };

    const ingresos = payments.filter(p => inRange(p.created_at)).reduce((s, p) => s + Number(p.amount_cop), 0);
    const egW = workerPayments.filter(p => p.status === 'paid' && inRange(p.created_at)).reduce((s, p) => s + Number(p.amount_cop), 0);
    const egM = purchases.filter(p => inRange(p.created_at)).reduce((s, p) => s + Number(p.total_cost ?? 0), 0);
    const egG = expenses.filter(e => inRange(e.expense_date)).reduce((s, e) => s + Number(e.amount_cop), 0);

    return { week, ingresos, egresos: egW + egM + egG };
  });
}
