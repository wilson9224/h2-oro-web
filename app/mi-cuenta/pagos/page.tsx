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

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  completed: { label: 'Completado', color: 'text-emerald-400', icon: CheckCircle2 },
  pending: { label: 'Pendiente', color: 'text-yellow-400', icon: Clock },
  failed: { label: 'Fallido', color: 'text-red-400', icon: XCircle },
  refunded: { label: 'Reembolsado', color: 'text-orange-400', icon: XCircle },
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
          // Fetch all user orders to get payments
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
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-serif text-cream-100">
          {order ? `Pagos — ${order.orderNumber}` : 'Mis Pagos'}
        </h1>
        <p className="text-sm text-charcoal-400 mt-1">Historial y estado de pagos</p>
      </div>

      {/* Summary */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-charcoal-800 rounded-lg border border-white/5 p-4">
            <p className="text-xs text-charcoal-400 mb-1">Total pagado</p>
            <p className="text-lg font-mono text-emerald-400">{formatCOP(totalPaid)}</p>
          </div>
          <div className="bg-charcoal-800 rounded-lg border border-white/5 p-4">
            <p className="text-xs text-charcoal-400 mb-1">Transacciones</p>
            <p className="text-lg font-mono text-cream-200">{allPayments.length}</p>
          </div>
          {order && order.totalAmountCop && (
            <div className="bg-charcoal-800 rounded-lg border border-white/5 p-4">
              <p className="text-xs text-charcoal-400 mb-1">Saldo pendiente</p>
              <p className="text-lg font-mono text-yellow-400">
                {formatCOP(Number(order.totalAmountCop) - totalPaid)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Wompi payment button */}
      {order && Number(order.totalAmountCop) > totalPaid && (
        <div className="bg-gold-500/5 border border-gold-500/20 rounded-lg p-5">
          <h3 className="text-sm font-medium text-cream-200 mb-2">Realizar un pago</h3>
          <p className="text-xs text-charcoal-400 mb-4">
            Saldo pendiente: {formatCOP(Number(order.totalAmountCop) - totalPaid)}
          </p>
          <button
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold-500 text-charcoal-900 text-sm font-medium rounded-md hover:bg-gold-400 transition-colors"
            onClick={() => {
              // TODO: Integrate Wompi checkout
              alert('Integración Wompi en desarrollo. Contacte al administrador para realizar el pago.');
            }}
          >
            <CreditCard size={16} />
            Pagar con Wompi
          </button>
        </div>
      )}

      {/* Payment list */}
      <div className="bg-charcoal-800 rounded-lg border border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin h-6 w-6 border-2 border-gold-500 border-t-transparent rounded-full mx-auto" />
          </div>
        ) : allPayments.length === 0 ? (
          <div className="p-12 text-center">
            <DollarSign size={32} className="mx-auto text-charcoal-600 mb-3" />
            <p className="text-charcoal-500 text-sm">No hay pagos registrados</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {allPayments.map((p) => {
              const cfg = statusConfig[p.status] || statusConfig.pending;
              const Icon = cfg.icon;
              return (
                <div key={p.id} className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-md bg-charcoal-700 ${cfg.color}`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-cream-200 capitalize">{p.method}</p>
                      <div className="flex items-center gap-2 text-xs text-charcoal-500 mt-0.5">
                        {(p as Payment & { order?: { orderNumber: string } }).order && (
                          <span>{(p as Payment & { order?: { orderNumber: string } }).order!.orderNumber}</span>
                        )}
                        <span>
                          {new Date(p.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        {p.wompiReference && (
                          <span className="font-mono text-[10px]">Ref: {p.wompiReference}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono text-cream-200">{formatCOP(Number(p.amountCop))}</p>
                    <p className={`text-[11px] ${cfg.color}`}>{cfg.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
