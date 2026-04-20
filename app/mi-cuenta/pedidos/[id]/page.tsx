'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Clock,
  Package,
  CheckCircle2,
  DollarSign,
} from 'lucide-react';
import { useApi } from '@/hooks/use-api';

interface OrderDetail {
  id: string;
  orderNumber: string;
  type: string;
  status: string;
  totalAmountCop: number | null;
  currency: string;
  notes: string | null;
  clientPhone: string | null;
  estimatedDeliveryDate: string | null;
  createdAt: string;
  client: { id: string; firstName: string; lastName: string; email: string };
  pieces: {
    id: string;
    name: string;
    description: string | null;
    currentState: { id: string; code: string; name: string; publicLabel: string | null } | null;
    stateHistory: { id: string; createdAt: string; state: { code: string; name: string; publicLabel: string | null } }[];
  }[];
  payments: { id: string; method: string; amountCop: number; status: string; paidAt: string | null; createdAt: string }[];
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-yellow-500/20 text-yellow-400' },
  in_progress: { label: 'En progreso', color: 'bg-blue-500/20 text-blue-400' },
  completed: { label: 'Completado', color: 'bg-emerald-500/20 text-emerald-400' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500/20 text-red-400' },
  delivered: { label: 'Entregado', color: 'bg-green-500/20 text-green-400' },
};

const stateIcons: Record<string, string> = {
  quote: '📋',
  design: '🎨',
  design_approval: '✅',
  production: '🔨',
  quality_check: '🔍',
  ready: '📦',
  delivered: '🎉',
  cancelled: '❌',
};

// Workflow stages in order for visual timeline
const workflowOrder = ['quote', 'design', 'design_approval', 'production', 'quality_check', 'ready', 'delivered'];
const workflowLabels: Record<string, string> = {
  quote: 'Cotización',
  design: 'Diseño',
  design_approval: 'Aprobación',
  production: 'Producción',
  quality_check: 'Calidad',
  ready: 'Listo',
  delivered: 'Entregado',
};

function formatCOP(amount: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
}

export default function ClientOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const api = useApi();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      api.get<OrderDetail>(`/orders/${id}`)
        .then(setOrder)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-charcoal-800 rounded w-48 animate-pulse" />
        <div className="h-64 bg-charcoal-800 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-4">
        <Link href="/mi-cuenta" className="inline-flex items-center gap-2 text-sm text-charcoal-400 hover:text-cream-200">
          <ArrowLeft size={16} /> Mis pedidos
        </Link>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-red-400 text-sm">{error || 'Pedido no encontrado'}</div>
      </div>
    );
  }

  const st = statusLabels[order.status] || { label: order.status, color: 'bg-charcoal-700 text-charcoal-300' };
  const totalPaid = order.payments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + Number(p.amountCop), 0);
  const totalAmount = Number(order.totalAmountCop) || 0;
  const balance = totalAmount - totalPaid;

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/mi-cuenta" className="inline-flex items-center gap-2 text-sm text-charcoal-400 hover:text-cream-200 transition-colors">
        <ArrowLeft size={16} /> Mis pedidos
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-serif text-cream-100">{order.orderNumber}</h1>
            <span className={`text-xs px-2 py-0.5 rounded ${st.color}`}>{st.label}</span>
          </div>
          <p className="text-sm text-charcoal-400 mt-1">
            Creado el {new Date(order.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
        {order.estimatedDeliveryDate && (
          <div className="flex items-center gap-2 text-sm text-charcoal-300 bg-charcoal-800 rounded-md px-3 py-2 border border-white/5">
            <Clock size={14} className="text-charcoal-500" />
            Entrega estimada: {new Date(order.estimatedDeliveryDate).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
          </div>
        )}
      </div>

      {/* Pieces with timeline */}
      <div className="space-y-5">
        <h2 className="text-lg font-serif text-cream-100">Piezas ({order.pieces.length})</h2>
        {order.pieces.map((piece) => {
          const currentCode = piece.currentState?.code || '';
          const currentIdx = workflowOrder.indexOf(currentCode);

          return (
            <div key={piece.id} className="bg-charcoal-800 rounded-lg border border-white/5 p-5">
              <div className="flex items-center gap-3 mb-4">
                <Package size={16} className="text-gold-500" />
                <h3 className="text-sm font-medium text-cream-200">{piece.name}</h3>
                {piece.currentState && (
                  <span className="text-xs text-gold-400">
                    {piece.currentState.publicLabel || piece.currentState.name}
                  </span>
                )}
              </div>
              {piece.description && (
                <p className="text-xs text-charcoal-400 mb-4 ml-7">{piece.description}</p>
              )}

              {/* Visual timeline */}
              <div className="ml-7">
                <div className="flex items-center gap-0 overflow-x-auto pb-2">
                  {workflowOrder.map((code, idx) => {
                    const isPast = idx <= currentIdx;
                    const isCurrent = idx === currentIdx;
                    const isLast = idx === workflowOrder.length - 1;

                    return (
                      <div key={code} className="flex items-center">
                        <div className="flex flex-col items-center min-w-[60px]">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] border-2 transition-all ${
                              isCurrent
                                ? 'border-gold-500 bg-gold-500/20 text-gold-400'
                                : isPast
                                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                                : 'border-charcoal-600 bg-charcoal-700 text-charcoal-500'
                            }`}
                          >
                            {isPast && !isCurrent ? (
                              <CheckCircle2 size={14} />
                            ) : (
                              <span className="text-[10px]">{stateIcons[code] || '•'}</span>
                            )}
                          </div>
                          <span className={`text-[9px] mt-1 text-center leading-tight ${isCurrent ? 'text-gold-400' : isPast ? 'text-charcoal-300' : 'text-charcoal-600'}`}>
                            {workflowLabels[code]}
                          </span>
                        </div>
                        {!isLast && (
                          <div className={`h-0.5 w-6 flex-shrink-0 -mt-3 ${isPast && idx < currentIdx ? 'bg-emerald-500/40' : 'bg-charcoal-700'}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Payments summary */}
      <div className="bg-charcoal-800 rounded-lg border border-white/5 p-5">
        <h2 className="text-sm font-medium text-cream-200 mb-4 flex items-center gap-2">
          <DollarSign size={16} className="text-gold-500" /> Resumen de Pagos
        </h2>

        {totalAmount > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-xs text-charcoal-400">Total</p>
              <p className="text-sm font-mono text-cream-200">{formatCOP(totalAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-charcoal-400">Pagado</p>
              <p className="text-sm font-mono text-emerald-400">{formatCOP(totalPaid)}</p>
            </div>
            <div>
              <p className="text-xs text-charcoal-400">Saldo</p>
              <p className={`text-sm font-mono ${balance > 0 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                {formatCOP(balance)}
              </p>
            </div>
          </div>
        )}

        {(order.payments || []).length > 0 ? (
          <div className="space-y-2">
            {(order.payments || []).map((p) => (
              <div key={p.id} className="flex items-center justify-between text-xs py-2 border-t border-white/5 first:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-charcoal-300 capitalize">{p.method}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${p.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                    {p.status === 'completed' ? 'Completado' : p.status}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-charcoal-200 font-mono">{formatCOP(Number(p.amountCop))}</span>
                  {p.paidAt && (
                    <p className="text-charcoal-500 text-[10px]">
                      {new Date(p.paidAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-charcoal-500">No hay pagos registrados</p>
        )}

        {balance > 0 && (
          <Link
            href={`/mi-cuenta/pagos?orderId=${order.id}`}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gold-500 text-charcoal-900 text-sm font-medium rounded-md hover:bg-gold-400 transition-colors"
          >
            Realizar Pago
          </Link>
        )}
      </div>
    </div>
  );
}
