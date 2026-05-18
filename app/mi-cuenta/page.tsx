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

type InlineStyle = { background: string; color: string; border?: string };

const statusLabels: Record<string, { label: string }> = {
  pending:     { label: 'Pendiente' },
  in_progress: { label: 'En progreso' },
  completed:   { label: 'Completado' },
  cancelled:   { label: 'Cancelado' },
  delivered:   { label: 'Entregado' },
};

const statusColors: Record<string, InlineStyle> = {
  pending:     { background: 'rgba(234,179,8,0.1)',   color: 'rgba(234,179,8,0.9)',   border: '1px solid rgba(234,179,8,0.2)' },
  in_progress: { background: 'rgba(59,130,246,0.1)',  color: 'rgba(147,197,253,0.9)', border: '1px solid rgba(59,130,246,0.2)' },
  completed:   { background: 'rgba(52,211,153,0.1)',  color: 'rgba(52,211,153,0.9)',  border: '1px solid rgba(52,211,153,0.2)' },
  cancelled:   { background: 'rgba(248,113,113,0.1)', color: 'rgba(248,113,113,0.9)', border: '1px solid rgba(248,113,113,0.2)' },
  delivered:   { background: 'rgba(52,211,153,0.1)',  color: 'rgba(52,211,153,0.9)',  border: '1px solid rgba(52,211,153,0.2)' },
};

const stateStyles: Record<string, InlineStyle> = {
  quote:           { background: 'rgba(234,179,8,0.08)',   color: 'rgba(234,179,8,0.8)' },
  design:          { background: 'rgba(168,85,247,0.08)',  color: 'rgba(216,180,254,0.8)' },
  design_approval: { background: 'rgba(249,115,22,0.08)',  color: 'rgba(253,186,116,0.8)' },
  production:      { background: 'rgba(59,130,246,0.08)',  color: 'rgba(147,197,253,0.8)' },
  quality_check:   { background: 'rgba(6,182,212,0.08)',   color: 'rgba(103,232,249,0.8)' },
  ready:           { background: 'rgba(52,211,153,0.08)',  color: 'rgba(52,211,153,0.8)' },
  delivered:       { background: 'rgba(52,211,153,0.08)',  color: 'rgba(52,211,153,0.8)' },
  cancelled:       { background: 'rgba(248,113,113,0.08)', color: 'rgba(248,113,113,0.8)' },
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
    <div className="px-5 pt-6 pb-4 space-y-5">
      {/* Header */}
      <div>
        <p className="text-[10px] font-sans-custom uppercase tracking-[0.2em] mb-1" style={{ color: 'rgba(212,175,55,0.5)' }}>
          Hola, {user?.firstName}
        </p>
        <h1 className="font-display text-xl font-semibold" style={{ color: 'rgba(242,240,237,0.92)' }}>
          Mis Pedidos
        </h1>
        <p className="text-xs font-sans-custom mt-0.5" style={{ color: 'rgba(242,240,237,0.3)' }}>
          {loading ? 'Cargando...' : `${orders.length} pedido${orders.length !== 1 ? 's' : ''} registrado${orders.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Skeleton */}
      {loading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-2xl animate-pulse"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)' }}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && orders.length === 0 && (
        <div
          className="rounded-2xl p-10 text-center"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <ShoppingBag size={36} className="mx-auto mb-4" style={{ color: 'rgba(242,240,237,0.12)' }} />
          <h2 className="font-display text-base font-semibold mb-2" style={{ color: 'rgba(242,240,237,0.7)' }}>
            Aún no tienes pedidos
          </h2>
          <p className="text-xs font-sans-custom mb-6 max-w-xs mx-auto" style={{ color: 'rgba(242,240,237,0.3)' }}>
            Cuando realices tu primer pedido, podrás ver su estado y seguimiento aquí.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/catalogo"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-[0.1em] font-sans-custom transition-all"
              style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}
            >
              Explorar catálogo
              <ArrowUpRight size={13} />
            </Link>
            <Link
              href="/seguimiento"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-sans-custom transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(242,240,237,0.6)' }}
            >
              Consultar un pedido
            </Link>
          </div>
        </div>
      )}

      {/* Orders list */}
      {!loading && orders.map((order) => {
        const st = statusLabels[order.status] || { label: order.status, colors: { bg: 'rgba(255,255,255,0.05)', text: 'rgba(242,240,237,0.4)', border: 'rgba(255,255,255,0.08)' } };
        return (
          <Link
            key={order.id}
            href={`/mi-cuenta/pedidos/${order.id}`}
            className="block rounded-2xl p-4 transition-all duration-200 group"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            {/* Top row */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono text-sm font-semibold" style={{ color: 'rgba(242,240,237,0.85)' }}>
                  {order.orderNumber}
                </span>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-sans-custom font-medium"
                  style={statusColors[order.status] ?? { background: 'rgba(255,255,255,0.06)', color: 'rgba(242,240,237,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {st.label}
                </span>
                <span className="text-[10px] font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>
                  {typeLabels[order.type] || order.type}
                </span>
              </div>
              <ArrowUpRight size={14} style={{ color: 'rgba(212,175,55,0.4)' }} />
            </div>

            {/* Pieces */}
            {order.pieces.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {order.pieces.map((piece) => (
                  <div
                    key={piece.id}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <Package size={11} style={{ color: 'rgba(242,240,237,0.25)' }} />
                    <span className="text-[11px] font-sans-custom" style={{ color: 'rgba(242,240,237,0.55)' }}>{piece.name}</span>
                    {piece.currentState && (
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded font-sans-custom"
                        style={stateStyles[piece.currentState.code] ?? { background: 'rgba(255,255,255,0.05)', color: 'rgba(242,240,237,0.35)' }}
                      >
                        {piece.currentState.name}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Bottom row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5" style={{ color: 'rgba(242,240,237,0.25)' }}>
                <Clock size={11} />
                <span className="text-[10px] font-sans-custom">
                  {new Date(order.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
                {order.estimatedDeliveryDate && (
                  <span className="text-[10px] font-sans-custom" style={{ color: 'rgba(212,175,55,0.4)' }}>
                    · Entrega {new Date(order.estimatedDeliveryDate).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                  </span>
                )}
              </div>
              {order.totalAmountCop && (
                <span className="font-mono text-sm font-bold" style={{ color: 'rgba(212,175,55,0.9)' }}>
                  {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(order.totalAmountCop))}
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
