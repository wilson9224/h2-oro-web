'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CreditCard, DollarSign, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { useApi } from '@/hooks/use-api';
import { useAuth } from '@/hooks/use-auth';

interface Payment {
  id: string;
  orderId: string;
  method: string;
  amountCop: number;
  amountUsd: number | null;
  status: string;
  wompiReference: string | null;
  paidAt: string | null;
  createdAt: string;
  order?: { orderNumber: string };
}

interface Order {
  id: string;
  orderNumber: string;
  totalAmountCop: number | null;
  payments: Payment[];
}

function formatCOP(amount: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
}

const statusConfig: Record<string, { label: string; iconColor: string; bg: string; border: string; icon: typeof CheckCircle2 }> = {
  completed: { label: 'Completado', iconColor: 'rgba(52,211,153,0.9)',  bg: 'rgba(52,211,153,0.08)',  border: '1px solid rgba(52,211,153,0.15)',  icon: CheckCircle2 },
  pending:   { label: 'Pendiente',  iconColor: 'rgba(234,179,8,0.9)',   bg: 'rgba(234,179,8,0.08)',   border: '1px solid rgba(234,179,8,0.15)',   icon: Clock },
  failed:    { label: 'Fallido',    iconColor: 'rgba(248,113,113,0.9)', bg: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)', icon: XCircle },
  refunded:  { label: 'Reembolsado',iconColor: 'rgba(251,146,60,0.9)',  bg: 'rgba(251,146,60,0.08)',  border: '1px solid rgba(251,146,60,0.15)',  icon: XCircle },
};

export default function PaymentsPage() {
  const api = useApi();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [allPayments, setAllPayments] = useState<Payment[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (orderId) {
          const o = await api.get<Order>(`/orders/${orderId}`);
          setOrder(o);
          setAllPayments(o.payments || []);
        } else if (user) {
          const orders = await api.get<{ data: Order[] }>(`/orders?clientId=${user.id}&limit=100`);
          const payments: Payment[] = [];
          for (const o of orders.data) {
            if (o.payments) {
              for (const p of o.payments) {
                payments.push({ ...p, order: { orderNumber: o.orderNumber } });
              }
            }
          }
          payments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setAllPayments(payments);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, orderId]);

  const totalPaid = allPayments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + Number(p.amountCop), 0);

  return (
    <div className="max-w-2xl min-w-0 space-y-5 px-4 pb-4 pt-6 sm:px-5">
      {/* Header */}
      <div>
        <p className="text-[10px] font-sans-custom uppercase tracking-[0.2em] mb-1" style={{ color: 'rgba(212,175,55,0.5)' }}>
          Historial
        </p>
        <h1 className="font-display text-xl font-semibold" style={{ color: 'rgba(242,240,237,0.92)' }}>
          {order ? `Pagos — ${order.orderNumber}` : 'Mis Pagos'}
        </h1>
      </div>

      {/* KPI cards */}
      {!loading && (
        <div className="grid grid-cols-2 gap-3">
          <div
            className="rounded-2xl p-4"
            style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.12)' }}
          >
            <p className="text-[10px] font-sans-custom uppercase tracking-[0.15em] mb-2" style={{ color: 'rgba(52,211,153,0.5)' }}>
              Total pagado
            </p>
            <p className="truncate font-mono text-base font-bold" style={{ color: 'rgba(52,211,153,0.9)' }}>{formatCOP(totalPaid)}</p>
          </div>
          <div
            className="rounded-2xl p-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <p className="text-[10px] font-sans-custom uppercase tracking-[0.15em] mb-2" style={{ color: 'rgba(242,240,237,0.3)' }}>
              Transacciones
            </p>
            <p className="font-mono text-base font-bold" style={{ color: 'rgba(242,240,237,0.8)' }}>{allPayments.length}</p>
          </div>
          {order && order.totalAmountCop && Number(order.totalAmountCop) > totalPaid && (
            <div
              className="col-span-2 rounded-2xl p-4"
              style={{ background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.12)' }}
            >
              <p className="text-[10px] font-sans-custom uppercase tracking-[0.15em] mb-2" style={{ color: 'rgba(234,179,8,0.5)' }}>
                Saldo pendiente
              </p>
            <p className="truncate font-mono text-base font-bold" style={{ color: 'rgba(234,179,8,0.9)' }}>
                {formatCOP(Number(order.totalAmountCop) - totalPaid)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Wompi payment button */}
      {order && Number(order.totalAmountCop) > totalPaid && (
        <div
          className="rounded-2xl p-4"
          style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.15)' }}
        >
          <p className="text-xs font-sans-custom mb-3" style={{ color: 'rgba(242,240,237,0.5)' }}>
            Saldo por pagar: {formatCOP(Number(order.totalAmountCop) - totalPaid)}
          </p>
          <button
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-[0.1em] font-sans-custom transition-all"
            style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}
            onClick={() => alert('Integración Wompi en desarrollo. Contacte al administrador para realizar el pago.')}
          >
            <CreditCard size={14} />
            Pagar con Wompi
          </button>
        </div>
      )}

      {/* Payment list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      ) : allPayments.length === 0 ? (
        <div
          className="rounded-2xl p-10 text-center"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <DollarSign size={32} className="mx-auto mb-3" style={{ color: 'rgba(242,240,237,0.12)' }} />
          <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>No hay pagos registrados</p>
        </div>
      ) : (
        <div className="space-y-2">
          {allPayments.map((p) => {
            const cfg = statusConfig[p.status] || statusConfig.pending;
            const Icon = cfg.icon;
            return (
              <div
                key={p.id}
                className="flex min-w-0 items-start gap-3 rounded-2xl px-4 py-3.5 min-[380px]:items-center min-[380px]:gap-4"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: cfg.bg, border: cfg.border }}
                >
                  <Icon size={14} style={{ color: cfg.iconColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-sans-custom font-medium capitalize" style={{ color: 'rgba(242,240,237,0.8)' }}>
                    {p.method}
                    {p.order && <span style={{ color: 'rgba(212,175,55,0.6)' }}> · {p.order.orderNumber}</span>}
                  </p>
                  <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-2">
                    <span className="text-[10px] font-sans-custom" style={{ color: 'rgba(242,240,237,0.25)' }}>
                      {new Date(p.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    {p.wompiReference && (
                      <span className="max-w-[9rem] truncate text-[10px] font-mono" style={{ color: 'rgba(242,240,237,0.2)' }}>
                        Ref: {p.wompiReference}
                      </span>
                    )}
                  </div>
                </div>
                <div className="max-w-[8.5rem] shrink-0 text-right">
                  <p className="truncate font-mono text-sm font-bold" style={{ color: 'rgba(242,240,237,0.85)' }}>
                    {formatCOP(Number(p.amountCop))}
                  </p>
                  <p className="text-[10px] font-sans-custom" style={{ color: cfg.iconColor }}>
                    {cfg.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
