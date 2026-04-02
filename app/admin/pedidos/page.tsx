'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Search,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { useApi } from '@/hooks/use-api';

interface Order {
  id: string;
  orderNumber: string;
  type: string;
  status: string;
  totalAmountCop: number | null;
  currency: string;
  notes: string | null;
  createdAt: string;
  estimatedDeliveryDate: string | null;
  client: { id: string; firstName: string; lastName: string; email: string };
  pieces: { id: string; name: string; currentState: { code: string; name: string } | null }[];
  _count: { payments: number };
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

const typeLabels: Record<string, string> = {
  custom: 'Personalizado',
  catalog: 'Catálogo',
  repair: 'Reparación',
  resize: 'Redimensionar',
};

export default function OrdersListPage() {
  const api = useApi();
  const [orders, setOrders] = useState<OrdersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('type', typeFilter);
      const data = await api.get<OrdersResponse>(`/orders?${params}`);
      setOrders(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, statusFilter, typeFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Debounced search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-cream-100">Pedidos</h1>
          <p className="text-sm text-charcoal-400 mt-1">
            {orders ? `${orders.total} pedido${orders.total !== 1 ? 's' : ''} en total` : 'Cargando...'}
          </p>
        </div>
        <Link
          href="/admin/pedidos/nuevo"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gold-500 text-charcoal-900 text-sm font-medium rounded-md hover:bg-gold-400 transition-colors"
        >
          <Plus size={16} />
          Nuevo Pedido
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-500" />
          <input
            type="text"
            placeholder="Buscar por # pedido, cliente..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-charcoal-800 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-500 focus:outline-none focus:border-gold-500/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 bg-charcoal-800 border border-white/5 rounded-md text-sm text-cream-200 focus:outline-none focus:border-gold-500/30"
        >
          <option value="">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="in_progress">En progreso</option>
          <option value="completed">Completado</option>
          <option value="delivered">Entregado</option>
          <option value="cancelled">Cancelado</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 bg-charcoal-800 border border-white/5 rounded-md text-sm text-cream-200 focus:outline-none focus:border-gold-500/30"
        >
          <option value="">Todos los tipos</option>
          <option value="custom">Personalizado</option>
          <option value="catalog">Catálogo</option>
          <option value="repair">Reparación</option>
          <option value="resize">Redimensionar</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-charcoal-800 rounded-lg border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3 text-xs text-charcoal-400 font-medium"># Pedido</th>
                <th className="text-left px-5 py-3 text-xs text-charcoal-400 font-medium">Cliente</th>
                <th className="text-left px-5 py-3 text-xs text-charcoal-400 font-medium">Tipo</th>
                <th className="text-left px-5 py-3 text-xs text-charcoal-400 font-medium">Estado</th>
                <th className="text-left px-5 py-3 text-xs text-charcoal-400 font-medium">Piezas</th>
                <th className="text-left px-5 py-3 text-xs text-charcoal-400 font-medium">Monto</th>
                <th className="text-left px-5 py-3 text-xs text-charcoal-400 font-medium">Fecha</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <>
                  {[...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-white/5">
                      {[...Array(8)].map((_, j) => (
                        <td key={j} className="px-5 py-4">
                          <div className="h-4 bg-charcoal-700 rounded animate-pulse w-20" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              )}
              {!loading && orders?.data.map((order) => {
                const st = statusLabels[order.status] || { label: order.status, color: 'bg-charcoal-700 text-charcoal-300' };
                return (
                  <tr key={order.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/admin/pedidos/${order.id}`} className="text-cream-200 font-mono text-xs hover:text-gold-400 transition-colors">
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-charcoal-300">
                      {order.client.firstName} {order.client.lastName}
                    </td>
                    <td className="px-5 py-3 text-charcoal-400 text-xs">{typeLabels[order.type] || order.type}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[11px] px-2 py-0.5 rounded ${st.color}`}>{st.label}</span>
                    </td>
                    <td className="px-5 py-3 text-charcoal-400">{order.pieces.length}</td>
                    <td className="px-5 py-3 text-charcoal-300 text-xs font-mono">
                      {order.totalAmountCop
                        ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(order.totalAmountCop))
                        : '—'}
                    </td>
                    <td className="px-5 py-3 text-charcoal-500 text-xs">
                      {new Date(order.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/admin/pedidos/${order.id}`} className="text-gold-500/60 hover:text-gold-400">
                        <ArrowUpRight size={14} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {!loading && orders?.data.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-charcoal-500">
                    No se encontraron pedidos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {orders && orders.totalPages > 1 && (
          <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between">
            <p className="text-xs text-charcoal-500">
              Página {orders.page} de {orders.totalPages}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded hover:bg-white/5 text-charcoal-400 disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(orders.totalPages, p + 1))}
                disabled={page === orders.totalPages}
                className="p-1.5 rounded hover:bg-white/5 text-charcoal-400 disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
