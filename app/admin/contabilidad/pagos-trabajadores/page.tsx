'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import {
  Wallet,
  CheckCircle2,
  Clock,
  X,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Users,
  CreditCard,
} from 'lucide-react';

interface WorkerUser {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface WorkerPaymentItem {
  id: string;
  concept: string;
  serviceCode: string | null;
  pieceName: string | null;
  amountCop: number;
  status: 'pending' | 'paid';
  paidAt: string | null;
  confirmedAt: string | null;
  notes: string | null;
  paymentMethod: string | null;
  createdAt: string;
  orderNumber: string | null;
  orderId: string | null;
}

interface WorkerWithPayments extends WorkerUser {
  payments: WorkerPaymentItem[];
  totalPending: number;
  totalPaid: number;
}

const PAYMENT_METHODS = ['Efectivo', 'Transferencia', 'Nequi', 'Daviplata', 'Otro'] as const;

const SERVICE_CODE_LABELS: Record<string, string> = {
  casting: 'Fundición',
  design_easy: 'Diseño Fácil',
  design_medium: 'Diseño Medio',
  design_hard: 'Diseño Difícil',
  design_complex: 'Diseño Complejo',
  finishing_easy: 'Acabados Fácil',
  finishing_medium: 'Acabados Medio',
  finishing_hard: 'Acabados Difícil',
  finishing_complex: 'Acabados Complejo',
  assembly_easy: 'Armado Fácil',
  assembly_medium: 'Armado Medio',
  assembly_hard: 'Armado Difícil',
  assembly_complex: 'Armado Complejo',
  setting_simple: 'Engaste Simple',
  setting_bezel: 'Engaste en Bisel',
  setting_pave: 'Engaste Pavé',
  laser_cutting_easy: 'Corte Láser Fácil',
  laser_cutting_medium: 'Corte Láser Medio',
  laser_cutting_hard: 'Corte Láser Difícil',
  laser_engraving_easy: 'Grabado Láser Fácil',
  laser_engraving_medium: 'Grabado Láser Medio',
  laser_engraving_hard: 'Grabado Láser Difícil',
  vulcanization_easy: 'Vulcanización Fácil',
  vulcanization_medium: 'Vulcanización Medio',
  vulcanization_hard: 'Vulcanización Difícil',
  '3d_printing': 'Impresión 3D',
};

const CONCEPT_LABELS: Record<string, string> = {
  assignment_payment: 'Pago por trabajo',
  bonus: 'Bonificación',
  adjustment: 'Ajuste',
};

function getPaymentTitle(payment: { concept: string; serviceCode: string | null; pieceName: string | null }): string {
  if (payment.serviceCode && SERVICE_CODE_LABELS[payment.serviceCode]) {
    return SERVICE_CODE_LABELS[payment.serviceCode];
  }
  if (payment.concept === 'adjustment' && payment.pieceName) {
    return payment.pieceName;
  }
  return CONCEPT_LABELS[payment.concept] ?? payment.concept;
}

function formatCOP(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount);
}

function getRoleLabel(role: string) {
  if (role === 'jeweler') return 'Joyero';
  if (role === 'designer') return 'Diseñador';
  return role;
}

function getRoleColor(role: string) {
  if (role === 'jeweler') return 'rgba(212,175,55,0.8)';
  if (role === 'designer') return 'rgba(96,165,250,0.8)';
  return 'rgba(242,240,237,0.4)';
}

type PayModalMode = 'single' | 'all';
interface PayModal {
  mode: PayModalMode;
  workerName: string;
  workerId: string;
  paymentIds: string[];
  totalAmount: number;
}

export default function PagosTrabajadoresPage() {
  const { user } = useAuth();
  const supabase = createClient();

  const [workersWithPayments, setWorkersWithPayments] = useState<WorkerWithPayments[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);

  const [payModal, setPayModal] = useState<PayModal | null>(null);
  const [payMethod, setPayMethod] = useState<string>(PAYMENT_METHODS[0]);
  const [payRef, setPayRef] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, first_name, last_name, roles!role_id(name)')
        .in('role_id', [
          'a1000000-0000-0000-0000-000000000003',
          'a1000000-0000-0000-0000-000000000004',
        ]);

      const { data: paymentsData } = await supabase
        .from('worker_payments')
        .select(`
          id,
          worker_id,
          concept,
          service_code,
          piece_name,
          amount_cop,
          status,
          paid_at,
          confirmed_at,
          notes,
          payment_method,
          created_at,
          order_id,
          orders!worker_payments_order_id_fkey(order_number)
        `)
        .order('created_at', { ascending: false });

      const workers: WorkerWithPayments[] = (usersData || []).map((u: any) => {
        const workerPayments: WorkerPaymentItem[] = (paymentsData || [])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((p: any) => p.worker_id === u.id)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((p: any) => {
            const order = p['orders!worker_payments_order_id_fkey'] ?? p.orders;
            return {
              id: p.id,
              concept: p.concept,
              serviceCode: p.service_code,
              pieceName: p.piece_name,
              amountCop: Number(p.amount_cop),
              status: p.status,
              paidAt: p.paid_at,
              confirmedAt: p.confirmed_at,
              notes: p.notes,
              paymentMethod: p.payment_method,
              createdAt: p.created_at,
              orderNumber: order?.order_number ?? null,
              orderId: p.order_id ?? null,
            };
          });

        const totalPending = workerPayments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amountCop, 0);
        const totalPaid = workerPayments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amountCop, 0);

        return {
          id: u.id,
          firstName: u.first_name,
          lastName: u.last_name,
          role: (u.roles as any)?.name || '',
          payments: workerPayments,
          totalPending,
          totalPaid,
        };
      });

      setWorkersWithPayments(workers);
      if (!selectedWorkerId && workers.length > 0) {
        setSelectedWorkerId(workers[0].id);
      }
    } finally {
      setLoading(false);
    }
  }, [supabase, selectedWorkerId]);

  useEffect(() => { loadData(); }, [loadData]);

  const selectedWorker = workersWithPayments.find(w => w.id === selectedWorkerId) ?? null;

  const pendingPayments = selectedWorker?.payments.filter(p => p.status === 'pending') ?? [];
  const paidPayments = selectedWorker?.payments.filter(p => p.status === 'paid') ?? [];

  const orderGroups = pendingPayments.reduce<Record<string, { orderNumber: string | null; orderId: string | null; payments: WorkerPaymentItem[] }>>((acc, p) => {
    const key = p.orderId ?? 'sin_pedido';
    if (!acc[key]) acc[key] = { orderNumber: p.orderNumber, orderId: p.orderId, payments: [] };
    acc[key].payments.push(p);
    return acc;
  }, {});

  const paidOrderGroups = paidPayments.reduce<Record<string, { orderNumber: string | null; orderId: string | null; payments: WorkerPaymentItem[] }>>((acc, p) => {
    const key = p.orderId ?? 'sin_pedido';
    if (!acc[key]) acc[key] = { orderNumber: p.orderNumber, orderId: p.orderId, payments: [] };
    acc[key].payments.push(p);
    return acc;
  }, {});

  const toggleOrder = (key: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const openPayAll = () => {
    if (!selectedWorker || pendingPayments.length === 0) return;
    setPayModal({
      mode: 'all',
      workerName: `${selectedWorker.firstName} ${selectedWorker.lastName}`,
      workerId: selectedWorker.id,
      paymentIds: pendingPayments.map(p => p.id),
      totalAmount: pendingPayments.reduce((s, p) => s + p.amountCop, 0),
    });
    setPayMethod(PAYMENT_METHODS[0]);
    setPayRef('');
  };

  const openPaySingle = (payment: WorkerPaymentItem) => {
    if (!selectedWorker) return;
    setPayModal({
      mode: 'single',
      workerName: `${selectedWorker.firstName} ${selectedWorker.lastName}`,
      workerId: selectedWorker.id,
      paymentIds: [payment.id],
      totalAmount: payment.amountCop,
    });
    setPayMethod(PAYMENT_METHODS[0]);
    setPayRef('');
  };

  const openPayOrder = (payments: WorkerPaymentItem[]) => {
    if (!selectedWorker) return;
    setPayModal({
      mode: 'all',
      workerName: `${selectedWorker.firstName} ${selectedWorker.lastName}`,
      workerId: selectedWorker.id,
      paymentIds: payments.map(p => p.id),
      totalAmount: payments.reduce((s, p) => s + p.amountCop, 0),
    });
    setPayMethod(PAYMENT_METHODS[0]);
    setPayRef('');
  };

  const handleConfirmPay = async () => {
    if (!payModal || !user) return;
    setProcessing(true);
    try {
      const method = payRef ? `${payMethod} — ${payRef}` : payMethod;
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('worker_payments')
        .update({
          status: 'paid',
          paid_at: now,
          registered_by_user_id: user.id,
          payment_method: method,
        })
        .in('id', payModal.paymentIds);

      if (!error) {
        setPayModal(null);
        setPayRef('');
        await loadData();
      }
    } finally {
      setProcessing(false);
    }
  };

  const globalPending = workersWithPayments.reduce((s, w) => s + w.totalPending, 0);
  const globalPaid = workersWithPayments.reduce((s, w) => s + w.totalPaid, 0);
  const workerCount = workersWithPayments.length;
  const pendingWorkerCount = workersWithPayments.filter(w => w.totalPending > 0).length;
  const globalPendingItems = workersWithPayments.reduce((s, w) => s + w.payments.filter(p => p.status === 'pending').length, 0);
  const globalPaidItems = workersWithPayments.reduce((s, w) => s + w.payments.filter(p => p.status === 'paid').length, 0);
  const selectedPendingTotal = selectedWorker?.totalPending ?? 0;
  const selectedPaidTotal = selectedWorker?.totalPaid ?? 0;

  const summaryCards = [
    {
      label: 'Pendiente',
      value: formatCOP(globalPending),
      detail: `${globalPendingItems} trabajo${globalPendingItems !== 1 ? 's' : ''} por pagar`,
      accent: 'rgba(251,191,36,0.95)',
      icon: Clock,
    },
    {
      label: 'Pagado',
      value: formatCOP(globalPaid),
      detail: `${globalPaidItems} pago${globalPaidItems !== 1 ? 's' : ''} registrados`,
      accent: 'rgba(52,211,153,0.9)',
      icon: CheckCircle2,
    },
    {
      label: 'Equipo',
      value: workerCount.toString(),
      detail: `${pendingWorkerCount} con saldo pendiente`,
      accent: 'rgba(96,165,250,0.9)',
      icon: Users,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.18)' }}>
              <Wallet className="h-4 w-4" style={{ color: 'rgba(212,175,55,0.9)' }} />
            </span>
            <div>
              <h2 className="text-2xl font-semibold font-display leading-tight" style={{ color: 'rgba(242,240,237,0.95)' }}>
                Pagos a trabajadores
              </h2>
              <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.38)' }}>
                Saldos por trabajador, agrupados por pedido y estado de pago.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <Users className="h-4 w-4" style={{ color: 'rgba(242,240,237,0.35)' }} />
          <span className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.5)' }}>
            {workerCount} trabajador{workerCount !== 1 ? 'es' : ''}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {summaryCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl p-4"
              style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.065)' }}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[11px] uppercase tracking-[0.16em] font-sans-custom" style={{ color: 'rgba(242,240,237,0.36)' }}>
                  {stat.label}
                </p>
                <Icon className="h-4 w-4" style={{ color: stat.accent }} />
              </div>
              <p className="text-2xl font-bold font-display leading-none" style={{ color: stat.accent, fontVariantNumeric: 'tabular-nums' }}>
                {stat.value}
              </p>
              <p className="mt-2 text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.28)' }}>
                {stat.detail}
              </p>
            </div>
          );
        })}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px,1fr]">
          <div className="space-y-2 rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-20 animate-pulse rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }} />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px,1fr]" style={{ minHeight: '60vh' }}>
          <aside className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.055)' }}>
            <div className="mb-3 flex items-center justify-between px-1">
              <p className="text-xs uppercase tracking-[0.18em] font-sans-custom" style={{ color: 'rgba(242,240,237,0.32)' }}>Trabajadores</p>
              <span className="rounded-full px-2 py-0.5 text-[11px] font-sans-custom" style={{ background: 'rgba(255,255,255,0.045)', color: 'rgba(242,240,237,0.42)' }}>
                {workerCount}
              </span>
            </div>
            {workersWithPayments.length === 0 ? (
              <div className="text-center py-12 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Users className="w-8 h-8 mx-auto mb-2" style={{ color: 'rgba(242,240,237,0.15)' }} />
                <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>Sin trabajadores</p>
              </div>
            ) : (
              <div className="space-y-2">
                {workersWithPayments.map((w) => {
                  const isSelected = w.id === selectedWorkerId;
                  const pendingCount = w.payments.filter(p => p.status === 'pending').length;
                  const paidCount = w.payments.filter(p => p.status === 'paid').length;
                  const initials = `${w.firstName?.[0] ?? ''}${w.lastName?.[0] ?? ''}`.toUpperCase();
                  return (
                    <button
                      key={w.id}
                      onClick={() => {
                        setSelectedWorkerId(w.id);
                        setExpandedOrders(new Set());
                      }}
                      className="group w-full rounded-lg p-3 text-left transition-all"
                      style={{
                        background: isSelected ? 'rgba(212,175,55,0.09)' : 'rgba(255,255,255,0.025)',
                        border: isSelected ? '1px solid rgba(212,175,55,0.28)' : '1px solid rgba(255,255,255,0.055)',
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-xs font-semibold font-display"
                          style={{
                            background: isSelected ? 'rgba(212,175,55,0.16)' : 'rgba(255,255,255,0.055)',
                            color: isSelected ? 'rgba(212,175,55,0.95)' : 'rgba(242,240,237,0.48)',
                          }}
                        >
                          {initials || '—'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium font-display" style={{ color: 'rgba(242,240,237,0.9)' }}>
                                {w.firstName} {w.lastName}
                              </p>
                              <p className="mt-0.5 text-xs font-sans-custom" style={{ color: getRoleColor(w.role) }}>
                                {getRoleLabel(w.role)}
                              </p>
                            </div>
                            <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: isSelected ? 'rgba(212,175,55,0.7)' : 'rgba(242,240,237,0.18)' }} />
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <div className="min-w-0 rounded-md px-2 py-1.5" style={{ background: 'rgba(251,191,36,0.075)', border: '1px solid rgba(251,191,36,0.12)' }}>
                              <p className="text-[10px] uppercase tracking-[0.12em] font-sans-custom" style={{ color: 'rgba(251,191,36,0.5)' }}>Pendiente</p>
                              <p className="truncate text-xs font-semibold font-display" style={{ color: w.totalPending > 0 ? 'rgba(251,191,36,0.95)' : 'rgba(242,240,237,0.25)', fontVariantNumeric: 'tabular-nums' }}>
                                {formatCOP(w.totalPending)}
                              </p>
                            </div>
                            <div className="min-w-0 rounded-md px-2 py-1.5" style={{ background: 'rgba(52,211,153,0.055)', border: '1px solid rgba(52,211,153,0.1)' }}>
                              <p className="text-[10px] uppercase tracking-[0.12em] font-sans-custom" style={{ color: 'rgba(52,211,153,0.42)' }}>Pagos</p>
                              <p className="truncate text-xs font-semibold font-display" style={{ color: w.totalPaid > 0 ? 'rgba(52,211,153,0.82)' : 'rgba(242,240,237,0.25)', fontVariantNumeric: 'tabular-nums' }}>
                                {paidCount} / {pendingCount + paidCount}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          <section className="min-w-0">
            {!selectedWorker ? (
              <div className="flex min-h-[360px] items-center justify-center rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.2)' }}>Selecciona un trabajador</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.065)' }}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-[0.18em] font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>Detalle del trabajador</p>
                      <h3 className="mt-1 truncate text-xl font-semibold font-display" style={{ color: 'rgba(242,240,237,0.95)' }}>
                        {selectedWorker.firstName} {selectedWorker.lastName}
                      </h3>
                      <p className="text-xs font-sans-custom" style={{ color: getRoleColor(selectedWorker.role) }}>{getRoleLabel(selectedWorker.role)}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                      <div className="rounded-lg px-3 py-2 text-right" style={{ background: 'rgba(251,191,36,0.075)', border: '1px solid rgba(251,191,36,0.12)' }}>
                        <p className="text-[10px] uppercase tracking-[0.12em] font-sans-custom" style={{ color: 'rgba(251,191,36,0.52)' }}>Pendiente</p>
                        <p className="font-bold font-display" style={{ color: 'rgba(251,191,36,0.95)', fontVariantNumeric: 'tabular-nums' }}>{formatCOP(selectedPendingTotal)}</p>
                      </div>
                      <div className="rounded-lg px-3 py-2 text-right" style={{ background: 'rgba(52,211,153,0.055)', border: '1px solid rgba(52,211,153,0.1)' }}>
                        <p className="text-[10px] uppercase tracking-[0.12em] font-sans-custom" style={{ color: 'rgba(52,211,153,0.45)' }}>Pagado</p>
                        <p className="font-bold font-display" style={{ color: 'rgba(52,211,153,0.85)', fontVariantNumeric: 'tabular-nums' }}>{formatCOP(selectedPaidTotal)}</p>
                      </div>
                      {pendingPayments.length > 0 && (
                        <button
                          onClick={openPayAll}
                          className="col-span-2 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold font-sans-custom transition-colors sm:col-span-1 sm:whitespace-nowrap"
                          style={{ background: 'rgba(212,175,55,0.9)', color: 'rgba(8,8,8,0.9)' }}
                        >
                          <CreditCard className="h-4 w-4" />
                          Pagar todo
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {pendingPayments.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3 px-1">
                      <p className="text-xs uppercase tracking-[0.18em] font-sans-custom" style={{ color: 'rgba(251,191,36,0.55)' }}>
                        Pendientes de pago
                      </p>
                      <span className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>
                        {pendingPayments.length} trabajo{pendingPayments.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {Object.entries(orderGroups).map(([key, group]) => {
                      const expandKey = `pending-${key}`;
                      const isExpanded = expandedOrders.has(expandKey);
                      const groupTotal = group.payments.reduce((s, p) => s + p.amountCop, 0);
                      const label = group.orderNumber ? `Pedido ${group.orderNumber}` : 'Sin pedido asignado';
                      return (
                        <div key={key} className="overflow-hidden rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div className="grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                            <button onClick={() => toggleOrder(expandKey)} className="min-w-0 text-left">
                              <div className="flex min-w-0 items-center gap-3">
                                <ChevronDown
                                  className={`h-4 w-4 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                  style={{ color: 'rgba(242,240,237,0.32)' }}
                                />
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium font-display" style={{ color: 'rgba(242,240,237,0.88)' }}>{label}</p>
                                  <p className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>
                                    {group.payments.length} trabajo{group.payments.length !== 1 ? 's' : ''}
                                  </p>
                                </div>
                              </div>
                            </button>
                            <div className="flex items-center justify-between gap-3 sm:justify-end">
                              <span className="text-sm font-semibold font-display" style={{ color: 'rgba(251,191,36,0.95)', fontVariantNumeric: 'tabular-nums' }}>{formatCOP(groupTotal)}</span>
                              <button
                                onClick={() => openPayOrder(group.payments)}
                                className="rounded-lg px-3 py-1.5 text-xs font-semibold font-sans-custom transition-colors"
                                style={{ background: 'rgba(212,175,55,0.11)', border: '1px solid rgba(212,175,55,0.2)', color: 'rgba(212,175,55,0.92)' }}
                              >
                                Pagar pedido
                              </button>
                            </div>
                          </div>
                          {isExpanded && (
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                              {group.payments.map((p) => (
                                <div key={p.id} className="grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.78)' }}>{getPaymentTitle(p)}</p>
                                    {p.pieceName && <p className="truncate text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.34)' }}>{p.pieceName}</p>}
                                    <p className="mt-0.5 text-[10px] font-sans-custom" style={{ color: 'rgba(242,240,237,0.22)' }}>
                                      {new Date(p.createdAt).toLocaleDateString('es-CO')}
                                    </p>
                                  </div>
                                  <span className="text-sm font-semibold font-display" style={{ color: 'rgba(212,175,55,0.92)', fontVariantNumeric: 'tabular-nums' }}>{formatCOP(p.amountCop)}</span>
                                  <button
                                    onClick={() => openPaySingle(p)}
                                    className="w-full rounded-lg px-3 py-1.5 text-xs font-semibold font-sans-custom transition-colors sm:w-auto"
                                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(242,240,237,0.62)' }}
                                  >
                                    Pagar
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {paidPayments.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3 px-1">
                      <p className="text-xs uppercase tracking-[0.18em] font-sans-custom" style={{ color: 'rgba(52,211,153,0.5)' }}>
                        Historial pagado
                      </p>
                      <span className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>
                        {paidPayments.length} pago{paidPayments.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {Object.entries(paidOrderGroups).map(([key, group]) => {
                      const expandKey = `paid-${key}`;
                      const isExpanded = expandedOrders.has(expandKey);
                      const groupTotal = group.payments.reduce((s, p) => s + p.amountCop, 0);
                      const label = group.orderNumber ? `Pedido ${group.orderNumber}` : 'Sin pedido';
                      return (
                        <div key={key} className="overflow-hidden rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.045)' }}>
                          <button
                            onClick={() => toggleOrder(expandKey)}
                            className="grid w-full grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 text-left"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <ChevronDown
                                className={`h-4 w-4 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                style={{ color: 'rgba(242,240,237,0.22)' }}
                              />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.62)' }}>{label}</p>
                                <p className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.26)' }}>
                                  {group.payments.length} trabajo{group.payments.length !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                            <span className="text-sm font-semibold font-display" style={{ color: 'rgba(52,211,153,0.72)', fontVariantNumeric: 'tabular-nums' }}>{formatCOP(groupTotal)}</span>
                          </button>
                          {isExpanded && (
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                              {group.payments.map((p) => (
                                <div key={p.id} className="grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-start" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.62)' }}>{getPaymentTitle(p)}</p>
                                    {p.pieceName && <p className="truncate text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.26)' }}>{p.pieceName}</p>}
                                    <div className="mt-1 flex flex-wrap items-center gap-2">
                                      {p.paymentMethod && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded font-sans-custom" style={{ background: 'rgba(52,211,153,0.08)', color: 'rgba(52,211,153,0.6)' }}>
                                          {p.paymentMethod}
                                        </span>
                                      )}
                                      {p.confirmedAt ? (
                                        <span className="text-[10px] flex items-center gap-1 font-sans-custom" style={{ color: 'rgba(52,211,153,0.6)' }}>
                                          <CheckCircle2 className="w-2.5 h-2.5" /> Confirmado
                                        </span>
                                      ) : (
                                        <span className="text-[10px] flex items-center gap-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.2)' }}>
                                          <AlertCircle className="w-2.5 h-2.5" /> Sin confirmar
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] font-sans-custom mt-0.5" style={{ color: 'rgba(242,240,237,0.2)' }}>
                                      Pagado: {p.paidAt ? new Date(p.paidAt).toLocaleDateString('es-CO') : '—'}
                                    </p>
                                  </div>
                                  <span className="text-sm font-semibold font-display" style={{ color: 'rgba(52,211,153,0.72)', fontVariantNumeric: 'tabular-nums' }}>{formatCOP(p.amountCop)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {pendingPayments.length === 0 && paidPayments.length === 0 && (
                  <div className="text-center py-16 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <Clock className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgba(242,240,237,0.12)' }} />
                    <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>Sin pagos registrados</p>
                    <p className="text-xs mt-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.15)' }}>Los pagos se generan automáticamente al completar trabajos</p>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Pay Modal */}
      {payModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="rounded-xl p-6 w-full max-w-md shadow-2xl" style={{ background: 'rgba(20,20,20,0.97)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold font-display" style={{ color: 'rgba(242,240,237,0.95)' }}>
                {payModal.mode === 'all' ? 'Pagar todo lo pendiente' : 'Registrar pago'}
              </h3>
              <button onClick={() => setPayModal(null)} style={{ color: 'rgba(242,240,237,0.4)' }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-lg p-4 mb-5 space-y-2 text-sm" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex justify-between">
                <span className="font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Trabajador</span>
                <span className="font-medium font-sans-custom" style={{ color: 'rgba(242,240,237,0.85)' }}>{payModal.workerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Trabajos</span>
                <span className="font-sans-custom" style={{ color: 'rgba(242,240,237,0.6)' }}>{payModal.paymentIds.length} trabajo{payModal.paymentIds.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '0.5rem' }}>
                <span className="font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Total a pagar</span>
                <span className="font-bold text-base font-display" style={{ color: 'rgba(212,175,55,0.95)' }}>{formatCOP(payModal.totalAmount)}</span>
              </div>
            </div>

            <div className="space-y-4 mb-5">
              <div>
                <label className="text-xs mb-1.5 block font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Método de pago</label>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m}
                      onClick={() => setPayMethod(m)}
                      className="text-xs px-3 py-1.5 rounded-lg transition-colors font-sans-custom"
                      style={{
                        background: payMethod === m ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.05)',
                        border: payMethod === m ? '1px solid rgba(212,175,55,0.3)' : '1px solid rgba(255,255,255,0.08)',
                        color: payMethod === m ? 'rgba(212,175,55,0.9)' : 'rgba(242,240,237,0.5)',
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs mb-1.5 block font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>
                  Referencia / No. transacción <span style={{ color: 'rgba(242,240,237,0.25)' }}>(opcional)</span>
                </label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="Ej: #123456"
                  className="w-full rounded-lg px-3 py-2 text-sm font-sans-custom focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(242,240,237,0.7)' }}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setPayModal(null)}
                className="flex-1 py-2.5 rounded-lg text-sm font-sans-custom"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(242,240,237,0.5)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmPay}
                disabled={processing}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold font-sans-custom disabled:opacity-50 transition-colors"
                style={{ background: 'rgba(212,175,55,0.9)', color: 'rgba(8,8,8,0.9)' }}
              >
                {processing ? 'Registrando...' : 'Confirmar pago'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
