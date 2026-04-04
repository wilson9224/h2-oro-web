'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, ArrowUpRight, Clock, Package } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

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
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          type,
          status,
          total_amount_cop,
          currency,
          created_at,
          estimated_delivery_date,
          pieces (
            id,
            name,
            currentState:workflow_states!current_state_id (
              code,
              name
            )
          )
        `)
        .eq('client_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setOrders(data.map((o: Record<string, unknown>) => ({
          id: o.id as string,
          orderNumber: o.order_number as string,
          type: o.type as string,
          status: o.status as string,
          totalAmountCop: o.total_amount_cop as number | null,
          currency: o.currency as string,
          createdAt: o.created_at as string,
          estimatedDeliveryDate: o.estimated_delivery_date as string | null,
          pieces: ((o.pieces as Record<string, unknown>[]) || []).map((p) => {
            const cs = Array.isArray(p.currentState) ? (p.currentState as Record<string, unknown>[])[0] : p.currentState as Record<string, unknown> | null;
            return {
              id: p.id as string,
              name: p.name as string,
              currentState: cs ? { code: cs.code as string, name: cs.name as string } : null,
            };
          }),
        })));
      }
      setLoading(false);
    };

    fetchOrders();
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif text-cream-100">Mis Pedidos</h1>
        <p className="text-sm text-charcoal-400 mt-1">
          {user && `Hola, ${user.firstName}. `}
          {loading ? 'Cargando...' : `Tienes ${orders.length} pedido${orders.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {loading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-charcoal-800 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {!loading && orders.length === 0 && (
        <div className="bg-charcoal-800 rounded-lg border border-white/5 p-12 text-center">
          <ShoppingBag size={40} className="mx-auto text-charcoal-600 mb-4" />
          <h2 className="text-lg font-serif text-cream-200 mb-2">Aún no tienes pedidos</h2>
          <p className="text-sm text-charcoal-400 mb-6 max-w-sm mx-auto">
            Cuando realices tu primer pedido, podrás ver su estado y seguimiento aquí.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/catalogo"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gold-500 text-charcoal-900 text-sm font-medium rounded-md hover:bg-gold-400 transition-colors"
            >
              Explorar catálogo
              <ArrowUpRight size={14} />
            </Link>
            <Link
              href="/seguimiento"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-charcoal-700 text-cream-200 text-sm rounded-md hover:bg-charcoal-600 transition-colors"
            >
              Consultar un pedido
            </Link>
          </div>
        </div>
      )}

      {!loading && orders.map((order) => {
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
