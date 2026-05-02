'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  ArrowRight,
  ArrowUpRight,
  X,
  Gem,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

interface AdminDashboard {
  kpis: {
    totalOrders: number;
    activeOrders: number;
    ordersLast30Days: number;
    activeAssignments: number;
    blockedAssignments: number;
    delayedOrders: number;
    totalRevenueCop: number;
    totalPaymentsCount: number;
  };
  ordersByStatus: { status: string; _count: number }[];
  ordersByType: { type: string; _count: number }[];
  recentOrders: {
    id: string;
    orderNumber: string;
    type: string;
    status: string;
    createdAt: string;
    client: { firstName: string; lastName: string };
    _count: { pieces: number };
  }[];
}

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'bg-yellow-500/20 text-yellow-400' },
  in_progress: { label: 'En progreso', color: 'bg-blue-500/20 text-blue-400' },
  completed: { label: 'Completado', color: 'bg-emerald-500/20 text-emerald-400' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500/20 text-red-400' },
  delivered: { label: 'Entregado', color: 'bg-green-500/20 text-green-400' },
};

const typeLabels: Record<string, string> = {
  custom: 'Personalizado',
  catalog: 'Catálogo',
  repair: 'Reparación',
  resize: 'Redimensionar',
};

function formatCOP(amount: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000).toISOString();

        // Fetch all orders (non-deleted)
        const { data: allOrders, error: ordersErr } = await supabase
          .from('orders')
          .select(`
            id,
            order_number,
            type,
            status,
            total_amount_cop,
            created_at,
            estimated_delivery_date,
            client:users!client_id ( id, first_name, last_name ),
            pieces ( id )
          `)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        if (ordersErr) throw new Error(ordersErr.message);
        const orders = allOrders || [];

        // Fetch completed payments
        const { data: payments } = await supabase
          .from('payments')
          .select('id, amount_cop')
          .eq('status', 'completed');

        const totalRevenueCop = (payments || []).reduce((sum: number, p: { amount_cop: number }) => sum + Number(p.amount_cop), 0);

        // Compute KPIs
        const activeStatuses = ['pending', 'in_progress'];
        const totalOrders = orders.length;
        const activeOrders = orders.filter((o: { status: string }) => activeStatuses.includes(o.status)).length;
        const ordersLast30Days = orders.filter((o: { created_at: string }) => o.created_at >= thirtyDaysAgo).length;
        const delayedOrders = orders.filter((o: { status: string; estimated_delivery_date: string | null }) =>
          activeStatuses.includes(o.status) && o.estimated_delivery_date && new Date(o.estimated_delivery_date) < now
        ).length;

        // Orders by status
        const statusCounts: Record<string, number> = {};
        orders.forEach((o: { status: string }) => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });
        const ordersByStatus = Object.entries(statusCounts).map(([status, _count]) => ({ status, _count }));

        // Orders by type
        const typeCounts: Record<string, number> = {};
        orders.forEach((o: { type: string }) => { typeCounts[o.type] = (typeCounts[o.type] || 0) + 1; });
        const ordersByType = Object.entries(typeCounts).map(([type, _count]) => ({ type, _count }));

        // Recent orders
        const recentOrders = orders.slice(0, 5).map((o: Record<string, unknown>) => {
          const cl = Array.isArray(o.client) ? (o.client as Record<string, unknown>[])[0] : o.client as Record<string, unknown>;
          const piecesArr = (o.pieces as unknown[]) || [];
          return {
            id: o.id as string,
            orderNumber: o.order_number as string,
            type: o.type as string,
            status: o.status as string,
            createdAt: o.created_at as string,
            client: cl ? { firstName: cl.first_name as string, lastName: cl.last_name as string } : { firstName: '—', lastName: '' },
            _count: { pieces: piecesArr.length },
          };
        });

        setData({
          kpis: {
            totalOrders,
            activeOrders,
            ordersLast30Days,
            activeAssignments: 0,
            blockedAssignments: 0,
            delayedOrders,
            totalRevenueCop,
            totalPaymentsCount: (payments || []).length,
          },
          ordersByStatus,
          ordersByType,
          recentOrders,
        });
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Error cargando dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-display font-semibold" style={{ color: 'rgba(242,240,237,0.9)' }}>Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-display font-semibold" style={{ color: 'rgba(242,240,237,0.9)' }}>Dashboard</h1>
        <div className="rounded-2xl p-6 text-sm" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: 'rgba(248,113,113,0.8)' }}>
          Error cargando dashboard: {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const kpiCards = [
    {
      title: 'Pedidos Activos',
      value: data.kpis.activeOrders,
      subtitle: `${data.kpis.totalOrders} totales`,
      icon: ShoppingBag,
      accent: 'rgba(96,165,250,1)',
      accentBg: 'rgba(96,165,250,0.08)',
      accentBorder: 'rgba(96,165,250,0.15)',
    },
    {
      title: 'Últimos 30 días',
      value: data.kpis.ordersLast30Days,
      subtitle: 'nuevos pedidos',
      icon: TrendingUp,
      accent: 'rgba(52,211,153,1)',
      accentBg: 'rgba(52,211,153,0.08)',
      accentBorder: 'rgba(52,211,153,0.15)',
    },
    {
      title: 'Ingresos Totales',
      value: formatCOP(data.kpis.totalRevenueCop),
      subtitle: `${data.kpis.totalPaymentsCount} pagos`,
      icon: DollarSign,
      accent: 'rgba(212,175,55,1)',
      accentBg: 'rgba(212,175,55,0.08)',
      accentBorder: 'rgba(212,175,55,0.15)',
    },
    {
      title: 'Retrasados',
      value: data.kpis.delayedOrders,
      subtitle: `${data.kpis.blockedAssignments} bloqueados`,
      icon: AlertTriangle,
      accent: data.kpis.delayedOrders > 0 ? 'rgba(248,113,113,1)' : 'rgba(242,240,237,0.25)',
      accentBg: data.kpis.delayedOrders > 0 ? 'rgba(248,113,113,0.08)' : 'rgba(255,255,255,0.03)',
      accentBorder: data.kpis.delayedOrders > 0 ? 'rgba(248,113,113,0.15)' : 'rgba(255,255,255,0.06)',
    },
  ];

  return (
    <div className="space-y-6">
      {/* New order modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div
            className="w-full max-w-md rounded-2xl overflow-hidden"
            style={{ background: 'rgba(20,18,14,0.98)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }}
          >
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <h2 className="font-display text-base font-semibold" style={{ color: 'rgba(242,240,237,0.95)' }}>¿Qué tipo de pedido?</h2>
              <button
                onClick={() => setShowNewModal(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
                style={{ color: 'rgba(242,240,237,0.4)' }}
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-2">
              <button
                onClick={() => { setShowNewModal(false); router.push('/admin/pedidos/nuevo?tipo=catalogo'); }}
                className="group w-full flex items-start gap-4 p-4 rounded-2xl text-left transition-all duration-200"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.25)'; (e.currentTarget as HTMLElement).style.background = 'rgba(212,175,55,0.05)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
              >
                <div className="mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}>
                  <ShoppingBag size={16} style={{ color: 'rgba(212,175,55,0.9)' }} />
                </div>
                <div>
                  <p className="text-sm font-medium font-display" style={{ color: 'rgba(242,240,237,0.9)' }}>Venta presencial — Catálogo</p>
                  <p className="text-xs mt-0.5 leading-relaxed font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>
                    El cliente compra en persona una joya del catálogo.
                  </p>
                </div>
              </button>

              <button
                onClick={() => { setShowNewModal(false); router.push('/admin/cotizacion/nueva'); }}
                className="group w-full flex items-start gap-4 p-4 rounded-2xl text-left transition-all duration-200"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.25)'; (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.05)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
              >
                <div className="mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
                  <Gem size={16} style={{ color: 'rgba(167,139,250,0.9)' }} />
                </div>
                <div>
                  <p className="text-sm font-medium font-display" style={{ color: 'rgba(242,240,237,0.9)' }}>Taller de joyería — Cotización</p>
                  <p className="text-xs mt-0.5 leading-relaxed font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>
                    Pedido personalizado, reparación o fabricación con cotización.
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold" style={{ color: 'rgba(242,240,237,0.95)' }}>Dashboard</h1>
          <p className="text-sm mt-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>Resumen general de la operación</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-[0.1em] transition-all duration-200 font-sans-custom"
          style={{ background: 'linear-gradient(135deg, #E8C547, #D4AF37)', color: '#1A1400' }}
        >
          Nuevo Pedido
          <ArrowRight size={13} />
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiCards.map((card) => (
          <div
            key={card.title}
            className="rounded-2xl p-4"
            style={{ background: card.accentBg, border: `1px solid ${card.accentBorder}` }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center mb-3"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <card.icon size={15} style={{ color: card.accent }} />
            </div>
            <p className="font-display text-2xl font-semibold leading-none" style={{ color: card.accent }}>
              {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
            </p>
            <p className="text-xs font-medium mt-1.5 font-sans-custom" style={{ color: 'rgba(242,240,237,0.75)' }}>{card.title}</p>
            <p className="text-[10px] mt-0.5 font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>{card.subtitle}</p>
          </div>
        ))}
      </div>

      {/* Status + Type breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* By Status */}
        <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] mb-4 font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Por Estado</h3>
          <div className="space-y-3">
            {data.ordersByStatus.map((item) => {
              const st = statusLabels[item.status] || { label: item.status, color: 'bg-white/5 text-cream-200/40' };
              const pct = data.kpis.totalOrders > 0 ? (item._count / data.kpis.totalOrders) * 100 : 0;
              return (
                <div key={item.status}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${st.color} font-sans-custom`}>{st.label}</span>
                    <span className="text-xs font-medium font-sans-custom" style={{ color: 'rgba(242,240,237,0.6)' }}>{item._count}</span>
                  </div>
                  <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-1 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #B8960F, #D4AF37)' }} />
                  </div>
                </div>
              );
            })}
            {data.ordersByStatus.length === 0 && (
              <p className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.25)' }}>Sin datos</p>
            )}
          </div>
        </div>

        {/* By Type */}
        <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] mb-4 font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Por Tipo</h3>
          <div className="space-y-3">
            {data.ordersByType.map((item) => {
              const pct = data.kpis.totalOrders > 0 ? (item._count / data.kpis.totalOrders) * 100 : 0;
              return (
                <div key={item.type}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.65)' }}>{typeLabels[item.type] || item.type}</span>
                    <span className="text-xs font-medium font-sans-custom" style={{ color: 'rgba(242,240,237,0.6)' }}>{item._count}</span>
                  </div>
                  <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-1 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: 'rgba(212,175,55,0.5)' }} />
                  </div>
                </div>
              );
            })}
            {data.ordersByType.length === 0 && (
              <p className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.25)' }}>Sin datos</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Pedidos Recientes</h3>
          <Link
            href="/admin/pedidos"
            className="text-[10px] uppercase tracking-[0.1em] flex items-center gap-1 transition-colors font-sans-custom"
            style={{ color: 'rgba(212,175,55,0.7)' }}
          >
            Ver todos <ArrowRight size={11} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                {['#', 'Cliente', 'Tipo', 'Estado', 'Piezas', 'Fecha', ''].map((h, i) => (
                  <th
                    key={i}
                    className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.12em] font-semibold font-sans-custom"
                    style={{ color: 'rgba(242,240,237,0.3)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.recentOrders.map((order) => {
                const st = statusLabels[order.status] || { label: order.status, color: 'bg-white/5 text-cream-200/40' };
                return (
                  <tr
                    key={order.id}
                    className="transition-colors hover:bg-white/[0.02]"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'rgba(212,175,55,0.8)' }}>{order.orderNumber}</td>
                    <td className="px-4 py-3 text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.7)' }}>
                      {order.client.firstName} {order.client.lastName}
                    </td>
                    <td className="px-4 py-3 text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>{typeLabels[order.type] || order.type}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${st.color} font-sans-custom`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3 text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.5)' }}>{order._count.pieces}</td>
                    <td className="px-4 py-3 text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>
                      {new Date(order.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/pedidos/${order.id}`} className="transition-colors" style={{ color: 'rgba(212,175,55,0.4)' }}>
                        <ArrowUpRight size={14} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {data.recentOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm" style={{ color: 'rgba(242,240,237,0.25)' }}>
                    No hay pedidos registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
