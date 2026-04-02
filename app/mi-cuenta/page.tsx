'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, ArrowUpRight, Clock, Package } from 'lucide-react';
import { useApi } from '@/hooks/use-api';
import { useAuth } from '@/hooks/use-auth';

interface Order {
  id: string;
  orderNumber: string;
  type: string;
  status: string;
  totalAmountCop: number | null;
  currency: string;
  createdAt: string;
  estimatedDeliveryDate: string | null;
  pieces: { id: string; name: string; currentState: { code: string; name: string } | null }[];
}

interface OrdersResponse {
  data: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-yellow-500/20 text-yellow-400' },
  in_progress: { label: 'En progreso', color: 'bg-blue-500/20 text-blue-400' },
  completed: { label: 'Completado', color: 'bg-emerald-500/20 text-emerald-400' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500/20 text-red-400' },
  delivered: { label: 'Entregado', color: 'bg-green-500/20 text-green-400' },
};

const stateColors: Record<string, string> = {
  quote: 'bg-yellow-500/20 text-yellow-400',
  design: 'bg-purple-500/20 text-purple-400',
  design_approval: 'bg-orange-500/20 text-orange-400',
  production: 'bg-blue-500/20 text-blue-400',
  quality_check: 'bg-cyan-500/20 text-cyan-400',
  ready: 'bg-emerald-500/20 text-emerald-400',
  delivered: 'bg-green-500/20 text-green-400',
  cancelled: 'bg-red-500/20 text-red-400',
};

const typeLabels: Record<string, string> = {
  custom: 'Personalizado',
  catalog: 'Catálogo',
  repair: 'Reparación',
  resize: 'Redimensionar',
};

export default function MyOrdersPage() {
  const api = useApi();
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrdersResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      api.get<OrdersResponse>(`/orders?clientId=${user.id}&limit=50`)
        .then(setOrders)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif text-cream-100">Mis Pedidos</h1>
        <p className="text-sm text-charcoal-400 mt-1">
          {user && `Hola, ${user.firstName}. `}
          {orders ? `Tienes ${orders.total} pedido${orders.total !== 1 ? 's' : ''}` : 'Cargando...'}
        </p>
      </div>

      {loading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-charcoal-800 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {!loading && orders?.data.length === 0 && (
        <div className="bg-charcoal-800 rounded-lg border border-white/5 p-12 text-center">
          <ShoppingBag size={40} className="mx-auto text-charcoal-600 mb-4" />
          <p className="text-charcoal-400 mb-2">No tienes pedidos aún</p>
          <Link href="/catalogo" className="text-sm text-gold-500 hover:text-gold-400 transition-colors">
            Explorar catálogo →
          </Link>
        </div>
      )}

      {!loading && orders?.data.map((order) => {
        const st = statusLabels[order.status] || { label: order.status, color: 'bg-charcoal-700 text-charcoal-300' };
        return (
          <Link
            key={order.id}
            href={`/mi-cuenta/pedidos/${order.id}`}
            className="block bg-charcoal-800 rounded-lg border border-white/5 p-5 hover:border-gold-500/20 transition-all group"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-mono text-cream-200 group-hover:text-gold-400 transition-colors">
                  {order.orderNumber}
                </h3>
                <span className={`text-[11px] px-2 py-0.5 rounded ${st.color}`}>{st.label}</span>
                <span className="text-xs text-charcoal-500">{typeLabels[order.type] || order.type}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-charcoal-500">
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {new Date(order.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
                {order.estimatedDeliveryDate && (
                  <span>
                    Entrega: {new Date(order.estimatedDeliveryDate).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                  </span>
                )}
                <ArrowUpRight size={14} className="text-charcoal-600 group-hover:text-gold-400 transition-colors" />
              </div>
            </div>

            {/* Pieces */}
            <div className="flex flex-wrap gap-2">
              {order.pieces.map((piece) => {
                const sc = piece.currentState
                  ? stateColors[piece.currentState.code] || 'bg-charcoal-700 text-charcoal-300'
                  : 'bg-charcoal-700 text-charcoal-400';
                return (
                  <div
                    key={piece.id}
                    className="flex items-center gap-2 bg-charcoal-700/50 rounded px-3 py-1.5"
                  >
                    <Package size={12} className="text-charcoal-500" />
                    <span className="text-xs text-charcoal-300">{piece.name}</span>
                    {piece.currentState && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${sc}`}>
                        {piece.currentState.name}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {order.totalAmountCop && (
              <div className="mt-3 text-right">
                <span className="text-sm font-mono text-gold-400">
                  {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(order.totalAmountCop))}
                </span>
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
