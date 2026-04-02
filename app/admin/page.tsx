'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  ArrowRight,
  ArrowUpRight,
} from 'lucide-react';
import { useApi } from '@/hooks/use-api';

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
  const api = useApi();
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<AdminDashboard>('/dashboard/admin')
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-serif text-cream-100">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-charcoal-800 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-serif text-cream-100">Dashboard</h1>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-red-400 text-sm">
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
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      title: 'Últimos 30 días',
      value: data.kpis.ordersLast30Days,
      subtitle: 'nuevos pedidos',
      icon: TrendingUp,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      title: 'Ingresos Totales',
      value: formatCOP(data.kpis.totalRevenueCop),
      subtitle: `${data.kpis.totalPaymentsCount} pagos completados`,
      icon: DollarSign,
      color: 'text-gold-400',
      bg: 'bg-gold-500/10',
    },
    {
      title: 'Retrasados',
      value: data.kpis.delayedOrders,
      subtitle: `${data.kpis.blockedAssignments} bloqueados`,
      icon: AlertTriangle,
      color: data.kpis.delayedOrders > 0 ? 'text-red-400' : 'text-charcoal-400',
      bg: data.kpis.delayedOrders > 0 ? 'bg-red-500/10' : 'bg-charcoal-700/50',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-cream-100">Dashboard</h1>
          <p className="text-sm text-charcoal-400 mt-1">Resumen general de la operación</p>
        </div>
        <Link
          href="/admin/pedidos/nuevo"
          className="hidden sm:inline-flex items-center gap-2 px-4 py-2 bg-gold-500 text-charcoal-900 text-sm font-medium rounded-md hover:bg-gold-400 transition-colors"
        >
          Nuevo Pedido
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <div key={card.title} className="bg-charcoal-800 rounded-lg p-5 border border-white/5">
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-md ${card.bg}`}>
                <card.icon size={18} className={card.color} />
              </div>
            </div>
            <p className={`text-2xl font-semibold ${card.color}`}>
              {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
            </p>
            <p className="text-xs text-charcoal-400 mt-1">{card.title}</p>
            <p className="text-[11px] text-charcoal-500 mt-0.5">{card.subtitle}</p>
          </div>
        ))}
      </div>

      {/* Status + Type breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Status */}
        <div className="bg-charcoal-800 rounded-lg border border-white/5 p-5">
          <h3 className="text-sm font-medium text-cream-200 mb-4">Pedidos por Estado</h3>
          <div className="space-y-3">
            {data.ordersByStatus.map((item) => {
              const st = statusLabels[item.status] || { label: item.status, color: 'bg-charcoal-700 text-charcoal-300' };
              const pct = data.kpis.totalOrders > 0 ? (item._count / data.kpis.totalOrders) * 100 : 0;
              return (
                <div key={item.status}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className={`px-2 py-0.5 rounded text-[11px] ${st.color}`}>{st.label}</span>
                    <span className="text-charcoal-400">{item._count}</span>
                  </div>
                  <div className="h-1.5 bg-charcoal-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gold-500/40 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {data.ordersByStatus.length === 0 && (
              <p className="text-xs text-charcoal-500">Sin datos</p>
            )}
          </div>
        </div>

        {/* By Type */}
        <div className="bg-charcoal-800 rounded-lg border border-white/5 p-5">
          <h3 className="text-sm font-medium text-cream-200 mb-4">Pedidos por Tipo</h3>
          <div className="space-y-3">
            {data.ordersByType.map((item) => {
              const pct = data.kpis.totalOrders > 0 ? (item._count / data.kpis.totalOrders) * 100 : 0;
              return (
                <div key={item.type}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-charcoal-300">{typeLabels[item.type] || item.type}</span>
                    <span className="text-charcoal-400">{item._count}</span>
                  </div>
                  <div className="h-1.5 bg-charcoal-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gold-500/30 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {data.ordersByType.length === 0 && (
              <p className="text-xs text-charcoal-500">Sin datos</p>
            )}
          </div>
        </div>
      </div>

      {/* Assignments */}
      <div className="bg-charcoal-800 rounded-lg border border-white/5 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-cream-200">Asignaciones Activas</h3>
          <div className="flex gap-4 text-xs">
            <span className="text-blue-400">{data.kpis.activeAssignments} activas</span>
            <span className="text-red-400">{data.kpis.blockedAssignments} bloqueadas</span>
          </div>
        </div>
        <div className="h-2 bg-charcoal-700 rounded-full overflow-hidden flex">
          {data.kpis.activeAssignments > 0 && (
            <div
              className="h-full bg-blue-500/60 rounded-l-full"
              style={{
                width: `${(data.kpis.activeAssignments / (data.kpis.activeAssignments + data.kpis.blockedAssignments || 1)) * 100}%`,
              }}
            />
          )}
          {data.kpis.blockedAssignments > 0 && (
            <div
              className="h-full bg-red-500/60 rounded-r-full"
              style={{
                width: `${(data.kpis.blockedAssignments / (data.kpis.activeAssignments + data.kpis.blockedAssignments || 1)) * 100}%`,
              }}
            />
          )}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-charcoal-800 rounded-lg border border-white/5">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-sm font-medium text-cream-200">Pedidos Recientes</h3>
          <Link href="/admin/pedidos" className="text-xs text-gold-500 hover:text-gold-400 flex items-center gap-1">
            Ver todos <ArrowRight size={12} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3 text-xs text-charcoal-400 font-medium">#</th>
                <th className="text-left px-5 py-3 text-xs text-charcoal-400 font-medium">Cliente</th>
                <th className="text-left px-5 py-3 text-xs text-charcoal-400 font-medium">Tipo</th>
                <th className="text-left px-5 py-3 text-xs text-charcoal-400 font-medium">Estado</th>
                <th className="text-left px-5 py-3 text-xs text-charcoal-400 font-medium">Piezas</th>
                <th className="text-left px-5 py-3 text-xs text-charcoal-400 font-medium">Fecha</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {data.recentOrders.map((order) => {
                const st = statusLabels[order.status] || { label: order.status, color: 'bg-charcoal-700 text-charcoal-300' };
                return (
                  <tr key={order.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3 text-cream-200 font-mono text-xs">{order.orderNumber}</td>
                    <td className="px-5 py-3 text-charcoal-300">
                      {order.client.firstName} {order.client.lastName}
                    </td>
                    <td className="px-5 py-3 text-charcoal-400 text-xs">{typeLabels[order.type] || order.type}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[11px] px-2 py-0.5 rounded ${st.color}`}>{st.label}</span>
                    </td>
                    <td className="px-5 py-3 text-charcoal-400">{order._count.pieces}</td>
                    <td className="px-5 py-3 text-charcoal-500 text-xs">
                      {new Date(order.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/admin/pedidos/${order.id}`} className="text-gold-500/60 hover:text-gold-400">
                        <ArrowUpRight size={14} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {data.recentOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-charcoal-500 text-sm">
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
