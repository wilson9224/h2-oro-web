'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  X,
  Gem,
  Hammer,
  Wallet,
  Clock,
  FileText,
  CreditCard,
  ChevronRight,
  PackageCheck,
  Truck,
  CheckCircle2,
  CircleDot,
  Activity,
  Plus,
  Ban,
  MessageCircle,
  Users,
  Package,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';

const supabase = createClient();

/* ─── Types ─── */
interface OrderRow {
  id: string;
  order_number: string;
  type: string;
  status: string;
  total_amount_cop: number | null;
  created_at: string;
  estimated_delivery_date: string | null;
  assigned_to_id?: string | null;
  client: { first_name: string; last_name: string } | { first_name: string; last_name: string }[];
  pieces: { id: string }[];
}

interface PaymentRow { id: string; order_id: string; amount_cop: number; status: string; paid_at: string | null; created_at: string }
interface AssignmentRow { id: string; status: string; stage_code: string; piece_id: string }
interface QuotationRow { id: string; status: string; total_cop: number; created_at: string }
interface WorkerPaymentRow { id: string; amount_cop: number; status: string; worker_id: string; created_at: string }
interface InventoryItemRow { id: string; name: string; current_stock: number; min_stock: number | null; unit: string; type: string }
interface ExpenseRow { id: string; category: string; description: string; amount_cop: number; expense_date: string }
interface WhatsAppLogRow {
  id: string;
  order_id: string;
  event_key: string;
  status: string;
  recipient_name: string | null;
  error_message: string | null;
  skipped_reason: string | null;
  created_at: string;
  sent_at: string | null;
}

interface DashboardData {
  orders: OrderRow[];
  payments: PaymentRow[];
  assignments: AssignmentRow[];
  quotations: QuotationRow[];
  workerPayments: WorkerPaymentRow[];
  inventoryItems: InventoryItemRow[];
  expenses: ExpenseRow[];
  whatsappLogs: WhatsAppLogRow[];
}

/* ─── Helpers ─── */
function formatCOP(amount: number) {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
}

function formatCOPFull(amount: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
}

function clientName(client: OrderRow['client']): string {
  const c = Array.isArray(client) ? client[0] : client;
  return c ? `${c.first_name} ${c.last_name}` : '—';
}

function relativeDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:     { label: 'Pendiente',   color: 'rgba(251,191,36,0.9)',  bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.18)' },
  in_progress: { label: 'En progreso', color: 'rgba(96,165,250,0.9)',  bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.18)' },
  completed:   { label: 'Completado',  color: 'rgba(52,211,153,0.9)',  bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.18)' },
  delivered:   { label: 'Entregado',   color: 'rgba(129,140,248,0.9)', bg: 'rgba(129,140,248,0.08)', border: 'rgba(129,140,248,0.18)' },
  cancelled:   { label: 'Cancelado',   color: 'rgba(248,113,113,0.9)', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.18)' },
};

const MESSAGE_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  queued: { label: 'En cola', color: 'rgba(251,191,36,0.9)', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.18)' },
  sent: { label: 'Enviado', color: 'rgba(96,165,250,0.9)', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.18)' },
  failed: { label: 'Falló', color: 'rgba(248,113,113,0.9)', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.18)' },
  skipped: { label: 'Omitido', color: 'rgba(148,163,184,0.9)', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.18)' },
  delivered: { label: 'Entregado', color: 'rgba(52,211,153,0.9)', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.18)' },
  read: { label: 'Leído', color: 'rgba(167,139,250,0.9)', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.18)' },
};

/* ═══════════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                                */
/* ═══════════════════════════════════════════════════════════════ */
export default function AdminDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);

  /* ─── Data Fetching ─── */
  useEffect(() => {
    const load = async () => {
      if (!user) return;

      try {
        const isManager = user.role === 'manager';

        let ordersQuery = supabase
          .from('orders')
          .select('id, order_number, type, status, total_amount_cop, created_at, estimated_delivery_date, assigned_to_id, client:users!client_id(first_name, last_name), pieces(id)')
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        if (isManager) ordersQuery = ordersQuery.eq('assigned_to_id', user.id);

        let quotationsQuery = supabase
          .from('quotations')
          .select('id, status, total_cop, created_at')
          .order('created_at', { ascending: false });

        if (isManager) quotationsQuery = quotationsQuery.eq('created_by_user_id', user.id);

        const [ordersRes, quotRes] = await Promise.all([ordersQuery, quotationsQuery]);

        if (ordersRes.error) throw ordersRes.error;
        if (quotRes.error) throw quotRes.error;

        const scopedOrders = (ordersRes.data || []) as OrderRow[];
        const orderIds = scopedOrders.map((order) => order.id);
        const pieceIds = scopedOrders.flatMap((order) => (order.pieces || []).map((piece) => piece.id));

        const paymentsQuery = supabase
          .from('payments')
          .select('id, order_id, amount_cop, status, paid_at, created_at')
          .eq('status', 'completed');
        const assignmentsQuery = supabase.from('work_assignments').select('id, status, stage_code, piece_id');
        const whatsappQuery = supabase
          .from('whatsapp_notification_logs')
          .select('id, order_id, event_key, status, recipient_name, error_message, skipped_reason, created_at, sent_at')
          .order('created_at', { ascending: false })
          .limit(6);

        const [paymentsRes, assignRes, whatsappRes, wpRes, invRes, expRes] = await Promise.all([
          isManager
            ? orderIds.length > 0
              ? paymentsQuery.in('order_id', orderIds)
              : Promise.resolve({ data: [], error: null })
            : paymentsQuery,
          isManager
            ? pieceIds.length > 0
              ? assignmentsQuery.in('piece_id', pieceIds)
              : Promise.resolve({ data: [], error: null })
            : assignmentsQuery,
          isManager
            ? orderIds.length > 0
              ? whatsappQuery.in('order_id', orderIds)
              : Promise.resolve({ data: [], error: null })
            : whatsappQuery,
          user.role === 'admin'
            ? supabase.from('worker_payments').select('id, amount_cop, status, worker_id, created_at')
            : Promise.resolve({ data: [], error: null }),
          user.role === 'admin'
            ? supabase.from('inventory_items').select('id, name, current_stock, min_stock, unit, type').eq('is_active', true)
            : Promise.resolve({ data: [], error: null }),
          user.role === 'admin'
            ? supabase.from('expenses').select('id, category, description, amount_cop, expense_date').order('expense_date', { ascending: false }).limit(5)
            : Promise.resolve({ data: [], error: null }),
        ]);

        setData({
          orders: scopedOrders,
          payments: (paymentsRes.data || []) as PaymentRow[],
          assignments: (assignRes.data || []) as AssignmentRow[],
          quotations: (quotRes.data || []) as QuotationRow[],
          workerPayments: (wpRes.data || []) as WorkerPaymentRow[],
          inventoryItems: (invRes.data || []) as InventoryItemRow[],
          expenses: (expRes.data || []) as ExpenseRow[],
          whatsappLogs: (!whatsappRes.error && whatsappRes.data ? whatsappRes.data : []) as WhatsAppLogRow[],
        });
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Error cargando datos');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  /* ─── Computed Values ─── */
  const computed = useMemo(() => {
    if (!data) return null;
    const now = new Date();
    const activeStatuses = ['pending', 'in_progress'];

    const activeOrders = data.orders.filter(o => activeStatuses.includes(o.status));
    const delayedOrders = activeOrders.filter(o => o.estimated_delivery_date && new Date(o.estimated_delivery_date) < now);

    // Cartera
    const paidByOrder: Record<string, number> = {};
    data.payments.forEach(p => { paidByOrder[p.order_id] = (paidByOrder[p.order_id] || 0) + Number(p.amount_cop); });
    const cartera = activeOrders.reduce((sum, o) => {
      const total = Number(o.total_amount_cop) || 0;
      const paid = paidByOrder[o.id] || 0;
      return sum + Math.max(0, total - paid);
    }, 0);

    // Assignments
    const assignPending = data.assignments.filter(a => a.status === 'pending').length;
    const assignActive = data.assignments.filter(a => a.status === 'in_progress').length;
    const assignCompleted = data.assignments.filter(a => a.status === 'completed').length;
    const assignPaused = data.assignments.filter(a => a.status === 'paused' || a.status === 'blocked').length;

    // Quotations pending
    const draftQuotations = data.quotations.filter(q => q.status === 'draft');

    // Worker payments pending
    const pendingWorkerPayments = data.workerPayments.filter(wp => wp.status === 'pending');
    const pendingWorkerTotal = pendingWorkerPayments.reduce((s, p) => s + Number(p.amount_cop), 0);

    // Inventory low stock
    const lowStockItems = data.inventoryItems.filter(i => i.min_stock != null && Number(i.current_stock) <= Number(i.min_stock));

    // Total alerts
    const totalAlerts = delayedOrders.length + draftQuotations.length + pendingWorkerPayments.length + lowStockItems.length;
    const failedMessages = data.whatsappLogs.filter((log) => log.status === 'failed');
    const skippedMessages = data.whatsappLogs.filter((log) => log.status === 'skipped');

    // Pipeline counts
    const pipeline = {
      pending: data.orders.filter(o => o.status === 'pending').length,
      in_progress: data.orders.filter(o => o.status === 'in_progress').length,
      completed: data.orders.filter(o => o.status === 'completed').length,
      delivered: data.orders.filter(o => o.status === 'delivered').length,
      cancelled: data.orders.filter(o => o.status === 'cancelled').length,
    };

    // Priority orders
    const priorityOrders = [...activeOrders]
      .sort((a, b) => {
        const aDue = a.estimated_delivery_date ? new Date(a.estimated_delivery_date).getTime() : Number.MAX_SAFE_INTEGER;
        const bDue = b.estimated_delivery_date ? new Date(b.estimated_delivery_date).getTime() : Number.MAX_SAFE_INTEGER;
        if (aDue !== bDue) return aDue - bDue;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      })
      .slice(0, 5);

    // Activity timeline
    type TimelineItem = { type: string; date: string; title: string; subtitle: string; accent: string; icon: string };
    const timeline: TimelineItem[] = [];

    data.payments.slice(0, 3).forEach(p => {
      const order = data.orders.find(o => o.id === p.order_id);
      timeline.push({
        type: 'payment', date: p.paid_at || p.created_at,
        title: `Pago recibido ${formatCOPFull(Number(p.amount_cop))}`,
        subtitle: order ? `${order.order_number} · ${clientName(order.client)}` : '',
        accent: 'rgba(52,211,153,0.9)', icon: 'credit-card',
      });
    });

    data.quotations.slice(0, 3).forEach(q => {
      timeline.push({
        type: 'quotation', date: q.created_at,
        title: `Cotización ${q.status === 'converted' ? 'convertida' : 'creada'}`,
        subtitle: `${formatCOPFull(Number(q.total_cop))}`,
        accent: q.status === 'converted' ? 'rgba(129,140,248,0.9)' : 'rgba(212,175,55,0.9)', icon: 'file-text',
      });
    });

    data.expenses.slice(0, 2).forEach(e => {
      timeline.push({
        type: 'expense', date: e.expense_date,
        title: e.description,
        subtitle: `Gasto · ${formatCOPFull(Number(e.amount_cop))}`,
        accent: 'rgba(248,113,113,0.8)', icon: 'wallet',
      });
    });

    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      activeOrders, delayedOrders, cartera, paidByOrder,
      assignPending, assignActive, assignCompleted, assignPaused,
      draftQuotations, pendingWorkerPayments, pendingWorkerTotal,
      lowStockItems, totalAlerts, pipeline, priorityOrders,
      failedMessages, skippedMessages,
      timeline: timeline.slice(0, 8),
    };
  }, [data]);

  /* ─── Loading ─── */
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-[120px] rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-display font-semibold" style={{ color: 'rgba(242,240,237,0.9)' }}>Centro de operaciones</h1>
        <div className="rounded-2xl p-6 text-sm flex items-center gap-3" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: 'rgba(248,113,113,0.8)' }}>
          <AlertTriangle size={16} /> {error}
        </div>
      </div>
    );
  }

  if (!data || !computed) return null;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 18) return 'Buenas tardes';
    return 'Buenas noches';
  })();

  const nowForRender = new Date();
  const isManager = user?.role === 'manager';

  /* ═══ KPIs ═══ */
  const kpis = isManager ? [
    {
      label: 'Mis pedidos activos',
      value: computed.activeOrders.length.toString(),
      sub: `${data.orders.length} asignados`,
      icon: ShoppingBag,
      accent: 'rgba(96,165,250,1)',
      bg: 'rgba(96,165,250,0.07)',
      border: 'rgba(96,165,250,0.14)',
    },
    {
      label: 'Mis cotizaciones',
      value: computed.draftQuotations.length.toString(),
      sub: computed.draftQuotations.length > 0 ? 'borradores abiertos' : 'sin pendientes',
      icon: FileText,
      accent: 'rgba(167,139,250,1)',
      bg: 'rgba(167,139,250,0.07)',
      border: 'rgba(167,139,250,0.14)',
    },
    {
      label: 'Cartera propia',
      value: formatCOP(computed.cartera),
      sub: computed.cartera > 0 ? 'por cobrar' : 'al día',
      icon: Wallet,
      accent: 'rgba(212,175,55,1)',
      bg: 'rgba(212,175,55,0.07)',
      border: 'rgba(212,175,55,0.14)',
    },
    {
      label: 'Alertas propias',
      value: computed.totalAlerts.toString(),
      sub: computed.totalAlerts > 0 ? 'requieren acción' : 'todo en orden',
      icon: AlertTriangle,
      accent: computed.totalAlerts > 0 ? 'rgba(248,113,113,1)' : 'rgba(52,211,153,1)',
      bg: computed.totalAlerts > 0 ? 'rgba(248,113,113,0.07)' : 'rgba(52,211,153,0.07)',
      border: computed.totalAlerts > 0 ? 'rgba(248,113,113,0.14)' : 'rgba(52,211,153,0.14)',
    },
  ] : [
    {
      label: 'Pedidos activos',
      value: computed.activeOrders.length.toString(),
      sub: `${data.orders.length} totales`,
      icon: ShoppingBag,
      accent: 'rgba(96,165,250,1)',
      bg: 'rgba(96,165,250,0.07)',
      border: 'rgba(96,165,250,0.14)',
    },
    {
      label: 'En taller',
      value: (computed.assignPending + computed.assignActive).toString(),
      sub: `${computed.assignCompleted} terminadas`,
      icon: Hammer,
      accent: 'rgba(167,139,250,1)',
      bg: 'rgba(167,139,250,0.07)',
      border: 'rgba(167,139,250,0.14)',
    },
    {
      label: 'Cartera pendiente',
      value: formatCOP(computed.cartera),
      sub: computed.cartera > 0 ? 'por cobrar' : 'al día',
      icon: Wallet,
      accent: 'rgba(212,175,55,1)',
      bg: 'rgba(212,175,55,0.07)',
      border: 'rgba(212,175,55,0.14)',
    },
    {
      label: 'Alertas',
      value: computed.totalAlerts.toString(),
      sub: computed.totalAlerts > 0 ? 'requieren atención' : 'todo en orden',
      icon: AlertTriangle,
      accent: computed.totalAlerts > 0 ? 'rgba(248,113,113,1)' : 'rgba(52,211,153,1)',
      bg: computed.totalAlerts > 0 ? 'rgba(248,113,113,0.07)' : 'rgba(52,211,153,0.07)',
      border: computed.totalAlerts > 0 ? 'rgba(248,113,113,0.14)' : 'rgba(52,211,153,0.14)',
    },
  ];

  /* ═══ Attention cards ═══ */
  const attentionCards = [
    computed.delayedOrders.length > 0 && {
      title: `${computed.delayedOrders.length} pedido${computed.delayedOrders.length > 1 ? 's' : ''} retrasado${computed.delayedOrders.length > 1 ? 's' : ''}`,
      sub: 'Fecha de entrega vencida',
      href: '/admin/pedidos',
      accent: 'rgba(248,113,113,0.9)',
      bg: 'rgba(248,113,113,0.06)',
      border: 'rgba(248,113,113,0.15)',
      icon: Clock,
    },
    computed.draftQuotations.length > 0 && {
      title: `${computed.draftQuotations.length} cotización${computed.draftQuotations.length > 1 ? 'es' : ''} sin enviar`,
      sub: `${formatCOPFull(computed.draftQuotations.reduce((s, q) => s + Number(q.total_cop), 0))} en borradores`,
      href: '/admin/cotizacion',
      accent: 'rgba(251,191,36,0.9)',
      bg: 'rgba(251,191,36,0.06)',
      border: 'rgba(251,191,36,0.15)',
      icon: FileText,
    },
    computed.pendingWorkerPayments.length > 0 && {
      title: `${formatCOPFull(computed.pendingWorkerTotal)} a trabajadores`,
      sub: `${computed.pendingWorkerPayments.length} pago${computed.pendingWorkerPayments.length > 1 ? 's' : ''} pendiente${computed.pendingWorkerPayments.length > 1 ? 's' : ''}`,
      href: '/admin/contabilidad/pagos-trabajadores',
      accent: 'rgba(96,165,250,0.9)',
      bg: 'rgba(96,165,250,0.06)',
      border: 'rgba(96,165,250,0.15)',
      icon: CreditCard,
    },
    computed.lowStockItems.length > 0 && {
      title: `${computed.lowStockItems.length} material${computed.lowStockItems.length > 1 ? 'es' : ''} bajo stock`,
      sub: computed.lowStockItems.slice(0, 2).map(i => i.name).join(', '),
      href: '/admin/contabilidad/inventario',
      accent: 'rgba(251,146,60,0.9)',
      bg: 'rgba(251,146,60,0.06)',
      border: 'rgba(251,146,60,0.15)',
      icon: AlertTriangle,
    },
  ].filter(Boolean) as { title: string; sub: string; href: string; accent: string; bg: string; border: string; icon: typeof Clock }[];

  const actionItems = attentionCards.length > 0
    ? attentionCards
    : [{
      title: 'Operación al día',
      sub: 'No hay alertas críticas en este momento',
      href: '/admin/pedidos',
      accent: 'rgba(52,211,153,0.9)',
      bg: 'rgba(52,211,153,0.055)',
      border: 'rgba(52,211,153,0.14)',
      icon: CheckCircle2,
    }];
  const actionSignalCount = attentionCards.length;

  /* ═══ Pipeline ═══ */
  const pipelineSteps = [
    { key: 'pending', label: 'Pendientes', count: computed.pipeline.pending, icon: CircleDot, color: 'rgba(251,191,36,0.9)' },
    { key: 'in_progress', label: 'En progreso', count: computed.pipeline.in_progress, icon: Activity, color: 'rgba(96,165,250,0.9)' },
    { key: 'completed', label: 'Terminados', count: computed.pipeline.completed, icon: PackageCheck, color: 'rgba(52,211,153,0.9)' },
    { key: 'delivered', label: 'Entregados', count: computed.pipeline.delivered, icon: Truck, color: 'rgba(129,140,248,0.9)' },
  ];

  const timelineIcons: Record<string, typeof CreditCard> = {
    'credit-card': CreditCard,
    'file-text': FileText,
    'wallet': Wallet,
  };

  const quickActions = [
    {
      label: 'Nuevo pedido',
      desc: 'Venta directa o taller',
      icon: Plus,
      onClick: () => setShowNewModal(true),
    },
    {
      label: 'Nueva cotización',
      desc: 'Personalizado o reparación',
      icon: Gem,
      href: '/admin/cotizacion/nueva',
    },
    {
      label: 'Auditar mensajes',
      desc: 'WhatsApp y plantillas',
      icon: MessageCircle,
      href: '/admin/mensajes',
    },
    ...(isManager
      ? [
        {
          label: 'Registrar cliente',
          desc: 'Crear ficha comercial',
          icon: Users,
          href: '/admin/usuarios',
        },
        {
          label: 'Nuevo producto',
          desc: 'Publicar en catálogo',
          icon: Package,
          href: '/admin/catalogo/nuevo',
        },
      ]
      : []),
    ...(user?.role === 'admin'
      ? [{
        label: 'Pagos pendientes',
        desc: 'Trabajadores y cartera',
        icon: CreditCard,
        href: '/admin/contabilidad/pagos-trabajadores',
      }]
      : []),
  ];

  return (
    <div className="space-y-7">
      {/* ═══ New Order Modal ═══ */}
      <AnimatePresence>
        {showNewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md rounded-2xl overflow-hidden"
              style={{ background: 'rgba(20,18,14,0.98)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }}
            >
              <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <h2 className="font-display text-base font-semibold" style={{ color: 'rgba(242,240,237,0.95)' }}>Nuevo pedido</h2>
                <button onClick={() => setShowNewModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors" style={{ color: 'rgba(242,240,237,0.4)' }}>
                  <X size={16} />
                </button>
              </div>
              <div className="p-4 space-y-2">
                {[
                  { label: 'Venta presencial', desc: 'Joya del catálogo — venta directa', href: '/admin/pedidos/nuevo?tipo=catalogo', icon: ShoppingBag, accent: 'rgba(212,175,55,0.9)', bg: 'rgba(212,175,55,0.08)', border: 'rgba(212,175,55,0.2)' },
                  { label: 'Cotización taller', desc: 'Personalizado, reparación o fabricación', href: '/admin/cotizacion/nueva', icon: Gem, accent: 'rgba(167,139,250,0.9)', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.2)' },
                ].map(opt => (
                  <button
                    key={opt.href}
                    onClick={() => { setShowNewModal(false); router.push(opt.href); }}
                    className="group w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all duration-200"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = opt.border; e.currentTarget.style.background = opt.bg; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: opt.bg, border: `1px solid ${opt.border}` }}>
                      <opt.icon size={17} style={{ color: opt.accent }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: 'rgba(242,240,237,0.9)' }}>{opt.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(242,240,237,0.35)' }}>{opt.desc}</p>
                    </div>
                    <ChevronRight size={14} style={{ color: 'rgba(242,240,237,0.2)' }} />
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Header ═══ */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-semibold" style={{ color: 'rgba(242,240,237,0.95)' }}>
            {greeting}, <span style={{ color: 'rgba(212,175,55,0.9)' }}>{user?.firstName}</span>
          </h1>
          <p className="text-sm mt-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.32)' }}>
            {isManager ? 'Panel operativo de tus pedidos y clientes' : 'Centro de operaciones'} · {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-[0.08em] transition-all duration-200 hover:brightness-110 font-sans-custom shrink-0"
          style={{ background: 'linear-gradient(135deg, rgba(232,197,71,0.95), rgba(212,175,55,0.95))', color: '#1A1400', boxShadow: '0 2px 12px rgba(212,175,55,0.2)' }}
        >
          <Plus size={14} strokeWidth={2.5} />
          Nuevo Pedido
        </button>
        <button
          onClick={() => setShowNewModal(true)}
          className="sm:hidden w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.25)' }}
        >
          <Plus size={18} style={{ color: 'rgba(212,175,55,0.9)' }} />
        </button>
      </div>

      {isManager && (
        <section
          className="grid grid-cols-1 gap-3 rounded-2xl p-3 sm:grid-cols-3"
          style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {[
            {
              label: 'Siguiente pedido',
              value: computed.priorityOrders[0]?.order_number ?? 'Sin urgentes',
              sub: computed.priorityOrders[0] ? clientName(computed.priorityOrders[0].client) : 'No hay pedidos activos asignados',
              href: computed.priorityOrders[0] ? `/admin/pedidos/${computed.priorityOrders[0].id}` : '/admin/pedidos',
              icon: ShoppingBag,
            },
            {
              label: 'Cotizaciones abiertas',
              value: String(computed.draftQuotations.length),
              sub: computed.draftQuotations.length > 0 ? 'Retomar y convertir' : 'Listo para vender',
              href: '/admin/cotizacion',
              icon: FileText,
            },
            {
              label: 'Alta rápida',
              value: 'Cliente o producto',
              sub: 'Registra desde el celular',
              href: '/admin/usuarios',
              icon: Users,
            },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-white/[0.025]"
              style={{ border: '1px solid rgba(255,255,255,0.055)' }}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: 'rgba(212,175,55,0.08)', color: 'rgba(212,175,55,0.9)' }}>
                <item.icon size={17} />
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] uppercase tracking-[0.14em] font-sans-custom" style={{ color: 'rgba(242,240,237,0.32)' }}>{item.label}</span>
                <span className="mt-0.5 block truncate text-sm font-medium font-sans-custom" style={{ color: 'rgba(242,240,237,0.86)' }}>{item.value}</span>
                <span className="block truncate text-[11px] font-sans-custom" style={{ color: 'rgba(242,240,237,0.34)' }}>{item.sub}</span>
              </span>
            </Link>
          ))}
        </section>
      )}

      {/* ═══ Action Center ═══ */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
        <section className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] font-sans-custom" style={{ color: 'rgba(242,240,237,0.42)' }}>
                Hoy requiere acción
              </h2>
              <p className="text-[11px] mt-0.5 font-sans-custom" style={{ color: 'rgba(242,240,237,0.25)' }}>
                {isManager ? 'Solo pedidos, cotizaciones y mensajes de tu operación' : 'Prioridades detectadas por operación, dinero, mensajes e inventario'}
              </p>
            </div>
            <span className="text-[10px] px-2 py-1 rounded-lg font-sans-custom" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(242,240,237,0.34)' }}>
              {actionSignalCount} señal{actionSignalCount !== 1 ? 'es' : ''}
            </span>
          </div>
          <div className="space-y-1 p-1">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-1">
              {actionItems.map(card => (
                <Link
                  key={card.title}
                  href={card.href}
                  className="group min-h-[116px] rounded-xl p-4 transition-all duration-200 hover:bg-white/[0.025]"
                  style={{ background: card.bg, border: `1px solid ${card.border}` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <card.icon size={15} style={{ color: card.accent }} />
                    </div>
                    <ArrowUpRight size={14} className="opacity-0 transition-opacity group-hover:opacity-100" style={{ color: card.accent }} />
                  </div>
                  <p className="mt-3 text-sm font-medium leading-snug font-sans-custom" style={{ color: card.accent }}>{card.title}</p>
                  <p className="mt-1 text-[11px] leading-relaxed font-sans-custom" style={{ color: 'rgba(242,240,237,0.36)' }}>{card.sub}</p>
                </Link>
              ))}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-1">
              {kpis.map(kpi => (
                <div
                  key={kpi.label}
                  className="min-h-[106px] rounded-xl p-4 transition-all duration-300"
                  style={{ background: kpi.bg, border: `1px solid ${kpi.border}` }}
                >
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <kpi.icon size={15} style={{ color: kpi.accent }} />
                  </div>
                  <p className="font-display text-[1.45rem] font-bold leading-none tracking-tight" style={{ color: kpi.accent }}>
                    {kpi.value}
                  </p>
                  <p className="mt-2 text-xs font-medium font-sans-custom" style={{ color: 'rgba(242,240,237,0.7)' }}>{kpi.label}</p>
                  <p className="mt-0.5 text-[10px] font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>{kpi.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] font-sans-custom" style={{ color: 'rgba(242,240,237,0.42)' }}>
            Acciones rápidas
          </h2>
          <div className="mt-3 space-y-2">
            {quickActions.map((action) => {
              const ActionIcon = action.icon;
              const content = (
                <>
                  <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.14)' }}>
                    <ActionIcon size={15} style={{ color: 'rgba(212,175,55,0.88)' }} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium font-sans-custom" style={{ color: 'rgba(242,240,237,0.82)' }}>{action.label}</span>
                    <span className="block text-[11px] font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>{action.desc}</span>
                  </span>
                  <ChevronRight size={14} style={{ color: 'rgba(242,240,237,0.2)' }} />
                </>
              );

              if ('href' in action && action.href) {
                return (
                  <Link
                    key={action.label}
                    href={action.href}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/[0.025]"
                    style={{ border: '1px solid rgba(255,255,255,0.055)' }}
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <button
                  key={action.label}
                  onClick={action.onClick}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.025]"
                  style={{ border: '1px solid rgba(255,255,255,0.055)' }}
                >
                  {content}
                </button>
              );
            })}
          </div>
        </aside>
      </div>

      {/* ═══ WhatsApp Audit ═══ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>
            Mensajería WhatsApp
          </h2>
          <Link href="/admin/mensajes" className="text-[10px] uppercase tracking-[0.1em] flex items-center gap-1 transition-colors font-sans-custom" style={{ color: 'rgba(212,175,55,0.65)' }}>
            Auditar <ArrowRight size={11} />
          </Link>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-[0.45fr_1fr] gap-4">
          <div className="rounded-2xl p-4" style={{ background: computed.failedMessages.length > 0 ? 'rgba(248,113,113,0.06)' : 'rgba(52,211,153,0.06)', border: `1px solid ${computed.failedMessages.length > 0 ? 'rgba(248,113,113,0.15)' : 'rgba(52,211,153,0.15)'}` }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <MessageCircle size={17} style={{ color: computed.failedMessages.length > 0 ? 'rgba(248,113,113,0.9)' : 'rgba(52,211,153,0.9)' }} />
              </div>
              <div>
                <p className="font-display text-2xl font-semibold leading-none" style={{ color: computed.failedMessages.length > 0 ? 'rgba(248,113,113,0.95)' : 'rgba(52,211,153,0.95)' }}>
                  {computed.failedMessages.length}
                </p>
                <p className="text-[10px] mt-1 uppercase tracking-[0.14em] font-sans-custom" style={{ color: 'rgba(242,240,237,0.38)' }}>Fallos recientes</p>
              </div>
            </div>
            <p className="mt-4 text-xs leading-relaxed font-sans-custom" style={{ color: 'rgba(242,240,237,0.38)' }}>
              {computed.skippedMessages.length > 0
                ? `${computed.skippedMessages.length} envío omitido por configuración, duplicado o teléfono.`
                : 'Sin omisiones en los últimos registros.'}
            </p>
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {data.whatsappLogs.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.32)' }}>Sin mensajes registrados</p>
              </div>
            ) : (
              data.whatsappLogs.map((log, idx) => {
                const cfg = MESSAGE_STATUS_CONFIG[log.status] || MESSAGE_STATUS_CONFIG.queued;
                const order = data.orders.find((item) => item.id === log.order_id);
                const detail = log.error_message || log.skipped_reason || log.recipient_name || 'Cliente';
                return (
                  <Link
                    key={log.id}
                    href={`/admin/mensajes`}
                    className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-white/[0.02]"
                    style={{ borderBottom: idx < data.whatsappLogs.length - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined }}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs" style={{ color: 'rgba(212,175,55,0.75)' }}>{order?.order_number ?? 'Pedido'}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-sans-custom" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.42)' }}>{detail}</p>
                    </div>
                    <span className="text-[10px] font-sans-custom shrink-0" style={{ color: 'rgba(242,240,237,0.25)' }}>
                      {relativeDate(log.sent_at ?? log.created_at)}
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ═══ Pipeline ═══ */}
      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-3 font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>
          Pipeline de pedidos
        </h2>
        <div className="rounded-2xl p-1" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="grid grid-cols-4 gap-1">
            {pipelineSteps.map((step, i) => {
              const StepIcon = step.icon;
              const isActive = step.count > 0;
              return (
                <div
                  key={step.key}
                  className="relative flex flex-col items-center py-5 px-2 rounded-xl transition-all"
                  style={{ background: isActive ? 'rgba(255,255,255,0.03)' : 'transparent' }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center mb-2.5 transition-all"
                    style={{
                      background: isActive ? `${step.color.replace('0.9', '0.1')}` : 'rgba(255,255,255,0.04)',
                      border: `1.5px solid ${isActive ? step.color.replace('0.9', '0.25') : 'rgba(255,255,255,0.06)'}`,
                    }}
                  >
                    <StepIcon size={17} style={{ color: isActive ? step.color : 'rgba(242,240,237,0.2)' }} />
                  </div>
                  <span
                    className="font-display text-xl font-bold leading-none"
                    style={{ color: isActive ? step.color : 'rgba(242,240,237,0.15)' }}
                  >
                    {step.count}
                  </span>
                  <span className="text-[10px] mt-1.5 font-sans-custom text-center leading-tight" style={{ color: 'rgba(242,240,237,0.38)' }}>
                    {step.label}
                  </span>
                  {i < pipelineSteps.length - 1 && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 hidden sm:block">
                      <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.1)' }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {computed.pipeline.cancelled > 0 && (
            <div className="flex items-center justify-center gap-2 py-2 mt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <Ban size={12} style={{ color: 'rgba(248,113,113,0.5)' }} />
              <span className="text-[11px] font-sans-custom" style={{ color: 'rgba(248,113,113,0.5)' }}>
                {computed.pipeline.cancelled} cancelado{computed.pipeline.cancelled > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Priority Orders + Timeline ═══ */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.6fr] gap-4">
        {/* Priority Orders */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] font-sans-custom" style={{ color: 'rgba(242,240,237,0.45)' }}>Prioridad operativa</h3>
              <p className="text-[11px] mt-0.5 font-sans-custom" style={{ color: 'rgba(242,240,237,0.25)' }}>Por fecha de entrega más próxima</p>
            </div>
            <Link href="/admin/pedidos" className="text-[10px] uppercase tracking-[0.1em] flex items-center gap-1 transition-colors font-sans-custom" style={{ color: 'rgba(212,175,55,0.65)' }}>
              Ver todos <ArrowRight size={11} />
            </Link>
          </div>

          <div>
            {computed.priorityOrders.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <CheckCircle2 size={28} className="mx-auto mb-2" style={{ color: 'rgba(52,211,153,0.4)' }} />
                <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>No hay pedidos activos</p>
              </div>
            ) : (
              computed.priorityOrders.map((order, idx) => {
                const st = STATUS_CONFIG[order.status] || { label: order.status, color: 'rgba(242,240,237,0.4)', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.06)' };
                const dueDate = order.estimated_delivery_date ? new Date(order.estimated_delivery_date) : null;
                const isLate = Boolean(dueDate && dueDate < nowForRender);
                const paid = computed.paidByOrder[order.id] || 0;
                const total = Number(order.total_amount_cop) || 0;
                const paidPct = total > 0 ? Math.min(100, (paid / total) * 100) : 0;

                return (
                  <Link
                    key={order.id}
                    href={`/admin/pedidos/${order.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.02]"
                    style={{ borderBottom: idx < computed.priorityOrders.length - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined }}
                  >
                    {/* Status dot */}
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: st.color }} />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-medium" style={{ color: 'rgba(212,175,55,0.8)' }}>{order.order_number}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-sans-custom" style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                          {st.label}
                        </span>
                        {isLate && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-sans-custom" style={{ background: 'rgba(248,113,113,0.08)', color: 'rgba(248,113,113,0.85)', border: '1px solid rgba(248,113,113,0.15)' }}>
                            Atrasado
                          </span>
                        )}
                      </div>
                      <p className="text-sm mt-0.5 truncate font-sans-custom" style={{ color: 'rgba(242,240,237,0.72)' }}>
                        {clientName(order.client)}
                      </p>
                    </div>

                    {/* Payment bar */}
                    <div className="hidden sm:flex flex-col items-end gap-1 shrink-0 w-24">
                      <span className="text-[10px] font-mono" style={{ color: paidPct >= 100 ? 'rgba(52,211,153,0.8)' : 'rgba(242,240,237,0.4)' }}>
                        {Math.round(paidPct)}% pagado
                      </span>
                      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${paidPct}%`,
                            background: paidPct >= 100
                              ? 'rgba(52,211,153,0.7)'
                              : paidPct >= 50
                                ? 'rgba(212,175,55,0.6)'
                                : 'rgba(251,191,36,0.5)',
                          }}
                        />
                      </div>
                    </div>

                    {/* Due date */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Clock size={13} style={{ color: isLate ? 'rgba(248,113,113,0.7)' : 'rgba(242,240,237,0.25)' }} />
                      <span className="text-xs font-sans-custom" style={{ color: isLate ? 'rgba(248,113,113,0.8)' : 'rgba(242,240,237,0.4)' }}>
                        {dueDate ? dueDate.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) : '—'}
                      </span>
                    </div>

                    <ArrowUpRight size={14} className="shrink-0 hidden sm:block" style={{ color: 'rgba(212,175,55,0.3)' }} />
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] font-sans-custom" style={{ color: 'rgba(242,240,237,0.45)' }}>Actividad reciente</h3>
          </div>

          {computed.timeline.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>Sin actividad reciente</p>
            </div>
          ) : (
            <div className="px-5 py-2">
              {computed.timeline.map((item, idx) => {
                const Icon = timelineIcons[item.icon] || Activity;
                return (
                  <div key={idx} className="flex gap-3 py-3" style={{ borderBottom: idx < computed.timeline.length - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${item.accent.replace('0.9', '0.08')}` }}>
                      <Icon size={14} style={{ color: item.accent }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-sans-custom leading-snug" style={{ color: 'rgba(242,240,237,0.72)' }}>{item.title}</p>
                      <p className="text-[11px] mt-0.5 font-sans-custom truncate" style={{ color: 'rgba(242,240,237,0.3)' }}>{item.subtitle}</p>
                    </div>
                    <span className="text-[10px] font-sans-custom shrink-0 mt-0.5" style={{ color: 'rgba(242,240,237,0.25)' }}>
                      {relativeDate(item.date)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
