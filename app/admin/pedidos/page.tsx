'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  ShoppingBag,
  Gem,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

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
  jewelry: 'Joyería',
};

export default function OrdersListPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const limit = 15;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    console.log('Fetching orders with filters:', { search, statusFilter, typeFilter, page });
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from('orders')
        .select(`
          id,
          order_number,
          type,
          status,
          total_amount_cop,
          currency,
          notes,
          created_at,
          estimated_delivery_date,
          client_id
        `, { count: 'exact' })
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (statusFilter) query = query.eq('status', statusFilter);
      if (typeFilter) query = query.eq('type', typeFilter);
      // La búsqueda por cliente se hará después de cargar los datos

      console.log('Query constructed with filters:', { statusFilter, typeFilter, search });

      const { data, error, count } = await query.range(from, to);

      console.log('Orders query result:', { data, error, count });
      console.log('Data length:', data?.length);
      console.log('Sample order:', data?.[0]);

      if (!error && data) {
        // Obtener datos de clientes por separado
        const clientIds = Array.from(new Set(data.map((o: any) => o.client_id).filter(Boolean)));
        let clientsData: Record<string, any> = {};
        
        console.log('Client IDs to fetch:', clientIds);
        
        if (clientIds.length > 0) {
          const { data: clients } = await supabase
            .from('users')
            .select('id, first_name, last_name, email')
            .in('id', clientIds);
          
          console.log('Clients data:', clients);
          
          if (clients) {
            clientsData = clients.reduce((acc: Record<string, any>, client: any) => {
              acc[client.id] = client;
              return acc;
            }, {});
          }
        }
        
        let transformedOrders = data.map((o: Record<string, unknown>) => {
          const clientId = o.client_id as string;
          const client = clientsData[clientId];
          
          return {
            id: o.id as string,
            orderNumber: o.order_number as string,
            type: o.type as string,
            status: o.status as string,
            totalAmountCop: o.total_amount_cop as number | null,
            currency: o.currency as string,
            notes: o.notes as string | null,
            createdAt: o.created_at as string,
            estimatedDeliveryDate: o.estimated_delivery_date as string | null,
            client: client ? {
              id: client.id,
              firstName: client.first_name,
              lastName: client.last_name,
              email: client.email,
            } : {
              id: clientId || '',
              firstName: '---',
              lastName: '',
              email: '',
            },
            pieces: [], // Sin pieces por ahora
          };
        });
        
        // Filtrar por búsqueda (número de pedido o nombre de cliente)
        if (search) {
          const searchLower = search.toLowerCase();
          transformedOrders = transformedOrders.filter(order => 
            order.orderNumber.toLowerCase().includes(searchLower) ||
            order.client.firstName.toLowerCase().includes(searchLower) ||
            order.client.lastName.toLowerCase().includes(searchLower) ||
            `${order.client.firstName} ${order.client.lastName}`.toLowerCase().includes(searchLower)
          );
        }
        
        console.log('Filtered orders:', transformedOrders);
        setOrders(transformedOrders);
        setTotal(count || 0);
      } else if (error) {
        console.error('Query error:', error);
        console.error('Error details:', error.message, error.details, error.hint);
      } else {
        console.log('No data returned but no error');
      }
    } catch (e) {
      console.error('Fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, typeFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

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
    <div className="space-y-5">

      {/* ── New order modal ── */}
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

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold" style={{ color: 'rgba(242,240,237,0.95)' }}>Pedidos</h1>
          <p className="text-sm mt-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>
            {loading ? 'Cargando...' : `${total} pedido${total !== 1 ? 's' : ''} en total`}
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-[0.1em] transition-all duration-200 font-sans-custom"
          style={{ background: 'linear-gradient(135deg, #E8C547, #D4AF37)', color: '#1A1400' }}
        >
          <Plus size={14} />
          Nuevo Pedido
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'rgba(242,240,237,0.25)' }} />
          <input
            type="text"
            placeholder="Buscar por # pedido o cliente..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm transition-all duration-200 focus:outline-none font-sans-custom"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              color: 'rgba(242,240,237,0.85)',
            }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 rounded-xl text-sm focus:outline-none font-sans-custom"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            color: statusFilter ? 'rgba(212,175,55,0.9)' : 'rgba(242,240,237,0.45)',
          }}
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
          className="px-3 py-2.5 rounded-xl text-sm focus:outline-none font-sans-custom"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            color: typeFilter ? 'rgba(212,175,55,0.9)' : 'rgba(242,240,237,0.45)',
          }}
        >
          <option value="">Todos los tipos</option>
          <option value="custom">Personalizado</option>
          <option value="catalog">Catálogo</option>
          <option value="repair">Reparación</option>
          <option value="resize">Redimensionar</option>
          <option value="jewelry">Joyería</option>
        </select>
      </div>

      {/* ── Table ── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {['# Pedido', 'Cliente', 'Tipo', 'Estado', 'Monto', 'Fecha', ''].map((h, i) => (
                  <th
                    key={i}
                    className="text-left px-4 py-3.5 text-[10px] uppercase tracking-[0.14em] font-semibold whitespace-nowrap"
                    style={{ color: 'rgba(242,240,237,0.3)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                [...Array(6)].map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div
                          className="h-3.5 rounded-lg animate-pulse"
                          style={{ background: 'rgba(255,255,255,0.06)', width: j === 1 ? '9rem' : j === 0 ? '6rem' : '5rem' }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              )}
              {!loading && orders.map((order) => {
                const st = statusLabels[order.status] || { label: order.status, color: 'bg-white/5 text-cream-200/40' };
                return (
                  <tr
                    key={order.id}
                    className="group transition-colors hover:bg-white/[0.025] cursor-pointer"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onClick={() => router.push(`/admin/pedidos/${order.id}`)}
                  >
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs font-medium" style={{ color: 'rgba(212,175,55,0.85)' }}>
                        {order.orderNumber}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.75)' }}>
                        {order.client.firstName} {order.client.lastName}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {order.type === 'jewelry' ? (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-sans-custom"
                          style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.22)', color: 'rgba(212,175,55,0.9)' }}
                        >
                          <span className="w-1 h-1 rounded-full" style={{ background: 'rgba(212,175,55,0.9)' }} />
                          {typeLabels[order.type]}
                        </span>
                      ) : (
                        <span className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>
                          {typeLabels[order.type] || order.type}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${st.color} font-sans-custom`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-mono" style={{ color: order.totalAmountCop ? 'rgba(242,240,237,0.65)' : 'rgba(242,240,237,0.2)' }}>
                        {order.totalAmountCop
                          ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(Number(order.totalAmountCop))
                          : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>
                        {new Date(order.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <ArrowUpRight
                        size={14}
                        className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: 'rgba(212,175,55,0.6)' }}
                      />
                    </td>
                  </tr>
                );
              })}
              {!loading && orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center">
                    <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>No se encontraron pedidos</p>
                    {(statusFilter || typeFilter || search) && (
                      <p className="text-xs mt-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.18)' }}>Prueba ajustando los filtros</p>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            className="px-5 py-3.5 flex items-center justify-between"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
          >
            <p className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>
              Página {page} de {totalPages}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-200 disabled:opacity-25"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(242,240,237,0.6)' }}
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-200 disabled:opacity-25"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(242,240,237,0.6)' }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
