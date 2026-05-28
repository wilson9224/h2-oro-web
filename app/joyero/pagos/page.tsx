'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Wallet, CheckCircle2, Clock, Filter, ChevronDown, TrendingUp } from 'lucide-react';
import type { WorkerPayment } from '@/lib/joyero/types';
import { fetchWorkerPayments, confirmPaymentReceipt } from '@/lib/joyero/queries';

type StatusFilter = 'all' | 'pending' | 'paid_unconfirmed' | 'confirmed';
type DateRange = '7d' | '30d' | '90d' | 'all';

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

function getPaymentTitle(payment: { concept: string; serviceCode?: string | null; pieceName?: string | null }): string {
  if (payment.serviceCode && SERVICE_CODE_LABELS[payment.serviceCode]) {
    return SERVICE_CODE_LABELS[payment.serviceCode];
  }
  if (payment.concept === 'adjustment' && payment.pieceName) {
    return payment.pieceName;
  }
  return CONCEPT_LABELS[payment.concept] ?? payment.concept;
}

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: 'Todos',
  pending: 'Pendiente de pago',
  paid_unconfirmed: 'Por confirmar',
  confirmed: 'Confirmados',
};

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  '7d': 'Últimos 7 días',
  '30d': 'Últimos 30 días',
  '90d': 'Últimos 90 días',
  all: 'Todo',
};

function formatCOP(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount);
}

function getDateRangeStart(range: DateRange): string | undefined {
  if (range === 'all') return undefined;
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

export default function JoyeroPagosPage() {
  const { user } = useAuth();

  const [payments, setPayments] = useState<WorkerPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [showFilters, setShowFilters] = useState(false);

  const loadPayments = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await fetchWorkerPayments(user.id, {
        startDate: getDateRangeStart(dateRange),
        status: statusFilter,
      });
      setPayments(data);
    } finally {
      setLoading(false);
    }
  }, [user, statusFilter, dateRange]);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  const handleConfirm = async (paymentId: string) => {
    if (!user) return;
    setConfirmingId(paymentId);
    try {
      const ok = await confirmPaymentReceipt(paymentId, user.id);
      if (ok) {
        setPayments(prev =>
          prev.map(p => p.id === paymentId ? { ...p, confirmedAt: new Date().toISOString() } : p)
        );
      }
    } finally {
      setConfirmingId(null);
    }
  };

  // Summary calculations
  const totalPending = payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amountCop, 0);
  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amountCop, 0);
  const totalEarned = totalPending + totalPaid;
  const pendingConfirm = payments.filter(p => p.status === 'paid' && !p.confirmedAt).length;

  return (
    <div className="min-w-0 pb-8">
      {/* Header */}
      <div
        className="flex items-center justify-between gap-3 px-4 pb-4 pt-6 sm:px-5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="min-w-0">
          <h1 className="font-display text-xl font-semibold" style={{ color: 'rgba(242,240,237,0.95)' }}>Mis Pagos</h1>
          <p className="text-xs mt-0.5 font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>Historial y estado</p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] px-3 py-2 rounded-xl transition-all duration-200 font-sans-custom"
          style={{
            background: showFilters ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.04)',
            border: showFilters ? '1px solid rgba(212,175,55,0.2)' : '1px solid rgba(255,255,255,0.06)',
            color: showFilters ? 'rgba(212,175,55,0.9)' : 'rgba(242,240,237,0.4)',
          }}
        >
          <Filter className="w-3 h-3" />
          Filtros
          <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Total acumulado del período */}
      <div className="px-4 pt-4 sm:px-5">
        <div
          className="rounded-2xl p-4"
          style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)' }}
        >
          <p className="text-[9px] uppercase tracking-[0.16em] font-sans-custom mb-1" style={{ color: 'rgba(212,175,55,0.5)' }}>Total generado · {DATE_RANGE_LABELS[dateRange]}</p>
          <p className="truncate font-display text-2xl font-bold" style={{ color: 'rgba(212,175,55,0.95)' }}>{formatCOP(totalEarned)}</p>
          <p className="text-[10px] font-sans-custom mt-1" style={{ color: 'rgba(242,240,237,0.3)' }}>
            {payments.length} trabajo{payments.length !== 1 ? 's' : ''} completado{payments.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-2 px-4 pt-3 min-[430px]:grid-cols-3 sm:px-5">
        {[
          { label: 'Por cobrar', value: formatCOP(totalPending), color: 'rgba(251,191,36,1)' },
          { label: 'Pagado', value: formatCOP(totalPaid), color: 'rgba(52,211,153,1)' },
          { label: 'Confirmar', value: `${pendingConfirm}`, color: pendingConfirm > 0 ? 'rgba(96,165,250,1)' : 'rgba(242,240,237,0.3)' },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="min-w-0 rounded-2xl p-3 text-center"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p className="text-[9px] uppercase tracking-[0.12em] mb-1.5 font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>{label}</p>
            <p className="truncate font-display text-sm font-semibold leading-tight" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div
          className="mx-5 mt-3 rounded-2xl p-4 space-y-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div>
            <p className="text-[9px] uppercase tracking-[0.16em] mb-2.5 font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>Período</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map(range => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className="text-[10px] px-3 py-1.5 rounded-xl transition-all duration-200 font-sans-custom"
                  style={{
                    background: dateRange === range ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.04)',
                    border: dateRange === range ? '1px solid rgba(212,175,55,0.2)' : '1px solid rgba(255,255,255,0.06)',
                    color: dateRange === range ? '#D4AF37' : 'rgba(242,240,237,0.4)',
                  }}
                >
                  {DATE_RANGE_LABELS[range]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.16em] mb-2.5 font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>Estado</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(STATUS_LABELS) as StatusFilter[]).map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className="text-[10px] px-3 py-1.5 rounded-xl transition-all duration-200 font-sans-custom"
                  style={{
                    background: statusFilter === s ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.04)',
                    border: statusFilter === s ? '1px solid rgba(212,175,55,0.2)' : '1px solid rgba(255,255,255,0.06)',
                    color: statusFilter === s ? '#D4AF37' : 'rgba(242,240,237,0.4)',
                  }}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Payments List */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 rounded-full border border-t-gold-500/80 border-gold-500/10 animate-spin" />
        </div>
      ) : payments.length === 0 ? (
        <div className="py-16 text-center px-5">
          <TrendingUp className="w-8 h-8 mx-auto mb-3" style={{ color: 'rgba(212,175,55,0.3)' }} />
          <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>No hay pagos en este período</p>
          <p className="text-xs mt-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.2)' }}>Completa trabajos para ver tus pagos</p>
        </div>
      ) : (
        <div className="mt-4 space-y-2 px-4 sm:px-5">
          {payments.map(payment => (
            <PaymentCard
              key={payment.id}
              payment={payment}
              onConfirm={handleConfirm}
              confirming={confirmingId === payment.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PaymentCard({
  payment,
  onConfirm,
  confirming,
}: {
  payment: WorkerPayment;
  onConfirm: (id: string) => void;
  confirming: boolean;
}) {
  const isConfirmed = !!payment.confirmedAt;
  const isPaidUnconfirmed = payment.status === 'paid' && !isConfirmed;

  const borderColor = isPaidUnconfirmed
    ? 'rgba(96,165,250,0.2)'
    : isConfirmed
    ? 'rgba(52,211,153,0.15)'
    : 'rgba(255,255,255,0.06)';

  return (
    <div
      className="min-w-0 overflow-hidden rounded-2xl"
      style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${borderColor}` }}
    >
      <div className="p-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium font-display truncate" style={{ color: 'rgba(242,240,237,0.85)' }}>
              {getPaymentTitle(payment)}
            </p>
            {payment.pieceName && (
              <p className="text-xs mt-0.5 truncate font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>{payment.pieceName}</p>
            )}
            {payment.orderNumber && (
              <p className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.25)' }}>Pedido {payment.orderNumber}</p>
            )}
          </div>
          <div className="max-w-[8.5rem] flex-shrink-0 text-right">
            <p className="truncate font-display text-base font-semibold" style={{ color: 'rgba(212,175,55,0.95)' }}>
              {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(payment.amountCop)}
            </p>
            <StatusBadge payment={payment} />
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2 min-[380px]:flex-row min-[380px]:items-center min-[380px]:justify-between">
          <p className="text-[10px] font-sans-custom" style={{ color: 'rgba(242,240,237,0.25)' }}>
            {new Date(payment.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>

          {isPaidUnconfirmed && (
            <button
              onClick={() => onConfirm(payment.id)}
              disabled={confirming}
              className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] px-3 py-1.5 rounded-xl transition-all duration-200 disabled:opacity-50 font-sans-custom"
              style={{
                background: 'rgba(212,175,55,0.12)',
                border: '1px solid rgba(212,175,55,0.25)',
                color: '#D4AF37',
              }}
            >
              <CheckCircle2 className="w-3 h-3" />
              {confirming ? 'Confirmando...' : 'Confirmar recibo'}
            </button>
          )}

          {isConfirmed && (
            <p className="text-[10px] flex items-center gap-1 font-sans-custom" style={{ color: 'rgba(52,211,153,0.7)' }}>
              <CheckCircle2 className="w-3 h-3" />
              Confirmado {new Date(payment.confirmedAt!).toLocaleDateString('es-CO')}
            </p>
          )}
        </div>
      </div>

      {isPaidUnconfirmed && (
        <div
          className="px-4 py-2"
          style={{ borderTop: '1px solid rgba(96,165,250,0.1)', background: 'rgba(96,165,250,0.04)' }}
        >
          <p className="text-[10px] font-sans-custom" style={{ color: 'rgba(96,165,250,0.6)' }}>
            El admin registró este pago. Confírmalo cuando lo hayas recibido.
          </p>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ payment }: { payment: WorkerPayment }) {
  if (payment.status === 'pending') {
    return (
      <span className="flex items-center gap-1 text-[10px] mt-1 font-sans-custom" style={{ color: 'rgba(251,191,36,0.8)' }}>
        <Clock className="w-2.5 h-2.5" />
        Pendiente
      </span>
    );
  }
  if (payment.status === 'paid' && !payment.confirmedAt) {
    return (
      <span className="flex items-center gap-1 text-[10px] mt-1 font-sans-custom" style={{ color: 'rgba(96,165,250,0.8)' }}>
        <CheckCircle2 className="w-2.5 h-2.5" />
        Por confirmar
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[10px] mt-1 font-sans-custom" style={{ color: 'rgba(52,211,153,0.8)' }}>
      <CheckCircle2 className="w-2.5 h-2.5" />
      Confirmado
    </span>
  );
}
