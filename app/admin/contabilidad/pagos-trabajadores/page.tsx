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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold font-display flex items-center gap-2" style={{ color: 'rgba(242,240,237,0.95)' }}>
          <Wallet className="w-5 h-5" style={{ color: 'rgba(212,175,55,0.8)' }} />
          Pagos a Trabajadores
        </h2>
        <p className="text-sm mt-0.5 font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>Gestiona los pagos a joyeros y diseñadores</p>
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs uppercase tracking-wide font-sans-custom mb-1" style={{ color: 'rgba(242,240,237,0.35)' }}>Total pendiente</p>
          <p className="text-xl font-bold font-display" style={{ color: 'rgba(251,191,36,0.9)' }}>{formatCOP(globalPending)}</p>
          <p className="text-xs font-sans-custom mt-0.5" style={{ color: 'rgba(242,240,237,0.25)' }}>todos los trabajadores</p>
        </div>
        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs uppercase tracking-wide font-sans-custom mb-1" style={{ color: 'rgba(242,240,237,0.35)' }}>Total pagado</p>
          <p className="text-xl font-bold font-display" style={{ color: 'rgba(52,211,153,0.9)' }}>{formatCOP(globalPaid)}</p>
          <p className="text-xs font-sans-custom mt-0.5" style={{ color: 'rgba(242,240,237,0.25)' }}>historial completo</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin h-8 w-8 border-2 border-gold-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ minHeight: '60vh' }}>
          {/* LEFT: Worker list */}
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest font-sans-custom px-1" style={{ color: 'rgba(242,240,237,0.3)' }}>Trabajadores</p>
            {workersWithPayments.length === 0 ? (
              <div className="text-center py-10 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Users className="w-8 h-8 mx-auto mb-2" style={{ color: 'rgba(242,240,237,0.15)' }} />
                <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>Sin trabajadores</p>
              </div>
            ) : (
              workersWithPayments.map((w) => {
                const isSelected = w.id === selectedWorkerId;
                return (
                  <button
                    key={w.id}
                    onClick={() => setSelectedWorkerId(w.id)}
                    className="w-full text-left rounded-xl p-4 transition-all"
                    style={{
                      background: isSelected ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.03)',
                      border: isSelected ? '1px solid rgba(212,175,55,0.25)' : '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm font-display" style={{ color: 'rgba(242,240,237,0.9)' }}>
                          {w.firstName} {w.lastName}
                        </p>
                        <p className="text-xs font-sans-custom mt-0.5" style={{ color: getRoleColor(w.role) }}>
                          {getRoleLabel(w.role)}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: isSelected ? 'rgba(212,175,55,0.6)' : 'rgba(242,240,237,0.2)' }} />
                    </div>
                    <div className="flex gap-3 mt-3">
                      {w.totalPending > 0 && (
                        <div className="rounded-lg px-2 py-1" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.15)' }}>
                          <p className="text-[10px] font-sans-custom" style={{ color: 'rgba(251,191,36,0.6)' }}>Pendiente</p>
                          <p className="text-xs font-semibold font-display" style={{ color: 'rgba(251,191,36,0.9)' }}>{formatCOP(w.totalPending)}</p>
                        </div>
                      )}
                      {w.totalPaid > 0 && (
                        <div className="rounded-lg px-2 py-1" style={{ background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.12)' }}>
                          <p className="text-[10px] font-sans-custom" style={{ color: 'rgba(52,211,153,0.5)' }}>Pagado</p>
                          <p className="text-xs font-semibold font-display" style={{ color: 'rgba(52,211,153,0.8)' }}>{formatCOP(w.totalPaid)}</p>
                        </div>
                      )}
                      {w.totalPending === 0 && w.totalPaid === 0 && (
                        <p className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.2)' }}>Sin pagos</p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* RIGHT: Detail panel */}
          <div className="lg:col-span-2">
            {!selectedWorker ? (
              <div className="flex items-center justify-center h-full rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.2)' }}>Selecciona un trabajador</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Worker header + pay-all */}
                <div className="rounded-xl p-4 flex items-center justify-between gap-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div>
                    <p className="font-semibold font-display" style={{ color: 'rgba(242,240,237,0.95)' }}>
                      {selectedWorker.firstName} {selectedWorker.lastName}
                    </p>
                    <p className="text-xs font-sans-custom" style={{ color: getRoleColor(selectedWorker.role) }}>{getRoleLabel(selectedWorker.role)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {selectedWorker.totalPending > 0 && (
                      <div className="text-right">
                        <p className="text-xs font-sans-custom" style={{ color: 'rgba(251,191,36,0.6)' }}>Pendiente</p>
                        <p className="font-bold font-display" style={{ color: 'rgba(251,191,36,0.9)' }}>{formatCOP(selectedWorker.totalPending)}</p>
                      </div>
                    )}
                    {pendingPayments.length > 0 && (
                      <button
                        onClick={openPayAll}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold font-sans-custom transition-colors"
                        style={{ background: 'rgba(212,175,55,0.9)', color: 'rgba(8,8,8,0.9)' }}
                      >
                        <CreditCard className="w-4 h-4" />
                        Pagar todo ({formatCOP(selectedWorker.totalPending)})
                      </button>
                    )}
                  </div>
                </div>

                {/* Pending payments grouped by order */}
                {pendingPayments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-widest font-sans-custom px-1" style={{ color: 'rgba(251,191,36,0.5)' }}>
                      Pendientes de pago · {pendingPayments.length} trabajo{pendingPayments.length !== 1 ? 's' : ''}
                    </p>
                    {Object.entries(orderGroups).map(([key, group]) => {
                      const isExpanded = expandedOrders.has(key);
                      const groupTotal = group.payments.reduce((s, p) => s + p.amountCop, 0);
                      const label = group.orderNumber ? `Pedido ${group.orderNumber}` : 'Sin pedido asignado';
                      return (
                        <div key={key} className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <button
                            onClick={() => toggleOrder(`pending-${key}`)}
                            className="w-full flex items-center justify-between px-4 py-3 text-left"
                          >
                            <div className="flex items-center gap-3">
                              <ChevronDown
                                className={`w-4 h-4 transition-transform ${isExpanded || expandedOrders.has(`pending-${key}`) ? 'rotate-180' : ''}`}
                                style={{ color: 'rgba(242,240,237,0.3)' }}
                              />
                              <div>
                                <p className="text-sm font-medium font-display" style={{ color: 'rgba(242,240,237,0.85)' }}>{label}</p>
                                <p className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>
                                  {group.payments.length} trabajo{group.payments.length !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-semibold font-display text-sm" style={{ color: 'rgba(251,191,36,0.9)' }}>{formatCOP(groupTotal)}</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); openPayOrder(group.payments); }}
                                className="text-xs px-3 py-1.5 rounded-lg font-semibold font-sans-custom transition-colors"
                                style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)', color: 'rgba(212,175,55,0.9)' }}
                              >
                                Pagar pedido
                              </button>
                            </div>
                          </button>
                          {expandedOrders.has(`pending-${key}`) && (
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                              {group.payments.map((p) => (
                                <div key={p.id} className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                  <div>
                                    <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.8)' }}>{getPaymentTitle(p)}</p>
                                    {p.pieceName && <p className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>{p.pieceName}</p>}
                                    <p className="text-[10px] font-sans-custom mt-0.5" style={{ color: 'rgba(242,240,237,0.2)' }}>
                                      {new Date(p.createdAt).toLocaleDateString('es-CO')}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="font-semibold font-display text-sm" style={{ color: 'rgba(212,175,55,0.9)' }}>{formatCOP(p.amountCop)}</span>
                                    <button
                                      onClick={() => openPaySingle(p)}
                                      className="text-xs px-2.5 py-1.5 rounded-lg font-semibold font-sans-custom transition-colors"
                                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(242,240,237,0.6)' }}
                                    >
                                      Pagar
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Paid payments history grouped by order */}
                {paidPayments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-widest font-sans-custom px-1" style={{ color: 'rgba(52,211,153,0.5)' }}>
                      Historial pagado · {paidPayments.length} pago{paidPayments.length !== 1 ? 's' : ''}
                    </p>
                    {Object.entries(paidOrderGroups).map(([key, group]) => {
                      const expandKey = `paid-${key}`;
                      const isExpanded = expandedOrders.has(expandKey);
                      const groupTotal = group.payments.reduce((s, p) => s + p.amountCop, 0);
                      const label = group.orderNumber ? `Pedido ${group.orderNumber}` : 'Sin pedido';
                      return (
                        <div key={key} className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                          <button
                            onClick={() => toggleOrder(expandKey)}
                            className="w-full flex items-center justify-between px-4 py-3 text-left"
                          >
                            <div className="flex items-center gap-3">
                              <ChevronDown
                                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                style={{ color: 'rgba(242,240,237,0.2)' }}
                              />
                              <div>
                                <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.6)' }}>{label}</p>
                                <p className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.25)' }}>
                                  {group.payments.length} trabajo{group.payments.length !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                            <span className="font-semibold font-display text-sm" style={{ color: 'rgba(52,211,153,0.7)' }}>{formatCOP(groupTotal)}</span>
                          </button>
                          {isExpanded && (
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                              {group.payments.map((p) => (
                                <div key={p.id} className="flex items-start justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                  <div>
                                    <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.6)' }}>{getPaymentTitle(p)}</p>
                                    {p.pieceName && <p className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.25)' }}>{p.pieceName}</p>}
                                    <div className="flex items-center gap-2 mt-1">
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
                                  <span className="font-semibold font-display text-sm" style={{ color: 'rgba(52,211,153,0.7)' }}>{formatCOP(p.amountCop)}</span>
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
                    <Clock className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgba(242,240,237,0.1)' }} />
                    <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>Sin pagos registrados</p>
                    <p className="text-xs mt-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.15)' }}>Los pagos se generan automáticamente al completar trabajos</p>
                  </div>
                )}
              </div>
            )}
          </div>
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
