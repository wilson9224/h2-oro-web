'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  Plus,
  X,
  ShoppingBag,
  Gem,
  Trash2,
  Pencil,
  AlertTriangle,
  User,
  Calendar,
  ImageIcon,
  Filter,
  ChevronDown,
  XCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { fetchQuotationByOrderId } from '@/lib/quotation/queries';

const supabase = createClient();

// ─── Types ────────────────────────────────────────────────────────────────────

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
  assignedTo: { id: string; firstName: string; lastName: string } | null;
  workers: { id: string; firstName: string; lastName: string }[];
  imageUrl: string | null;
}

type ThumbnailAttachmentRow = {
  entity_id: string;
  bucket?: string | null;
  storage_path?: string | null;
  file_url?: string | null;
  file_type?: string | null;
  mime_type?: string | null;
  created_at: string;
};

// ─── Kanban column config ─────────────────────────────────────────────────────

const KANBAN_COLUMNS: { key: string; label: string; dotColor: string; headerBg: string; headerBorder: string }[] = [
  { key: 'pending',     label: 'Pendiente',   dotColor: 'rgba(250,204,21,0.9)',  headerBg: 'rgba(234,179,8,0.06)',   headerBorder: 'rgba(234,179,8,0.15)' },
  { key: 'in_progress', label: 'En progreso', dotColor: 'rgba(96,165,250,0.9)',  headerBg: 'rgba(59,130,246,0.06)',  headerBorder: 'rgba(59,130,246,0.15)' },
  { key: 'completed',   label: 'Completado',  dotColor: 'rgba(52,211,153,0.9)',  headerBg: 'rgba(16,185,129,0.06)', headerBorder: 'rgba(16,185,129,0.15)' },
  { key: 'delivered',   label: 'Entregado',   dotColor: 'rgba(134,239,172,0.9)', headerBg: 'rgba(34,197,94,0.06)',  headerBorder: 'rgba(34,197,94,0.15)' },
  { key: 'cancelled',   label: 'Cancelado',   dotColor: 'rgba(248,113,113,0.9)', headerBg: 'rgba(239,68,68,0.06)', headerBorder: 'rgba(239,68,68,0.15)' },
];

const typeLabels: Record<string, string> = {
  custom: 'Personalizado',
  catalog: 'Catálogo',
  repair: 'Reparación',
  resize: 'Redimensionar',
  jewelry: 'Joyería',
};

function formatCOP(amount: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
}

async function getThumbnailUrl(attachment: ThumbnailAttachmentRow) {
  if (!attachment.bucket || !attachment.storage_path) return attachment.file_url || null;

  const { data, error } = await supabase.storage
    .from(attachment.bucket)
    .createSignedUrl(attachment.storage_path, 60 * 60);

  if (!error && data?.signedUrl) return data.signedUrl;

  const { data: publicData } = supabase.storage
    .from(attachment.bucket)
    .getPublicUrl(attachment.storage_path);

  return publicData.publicUrl || null;
}

function isImageAttachment(attachment: ThumbnailAttachmentRow) {
  return attachment.mime_type?.startsWith('image/') || attachment.file_type === 'image' || Boolean(attachment.file_url);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OrdersKanbanPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [responsibleFilter, setResponsibleFilter] = useState('');
  const [workerFilter, setWorkerFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [mobileStatus, setMobileStatus] = useState(KANBAN_COLUMNS[0].key);
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [staffList, setStaffList] = useState<{ id: string; firstName: string; lastName: string; role: string }[]>([]);

  // ─── Fetch all orders + images ────────────────────────────────────────────

  // Fetch staff list (responsible + workers) for filter dropdowns
  const fetchStaff = useCallback(async () => {
    const { data } = await supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        roles!inner(name)
      `)
      .in('roles.name', ['admin', 'manager', 'jeweler', 'designer'])
      .is('deleted_at', null);
    if (data) {
      setStaffList(data.map((u: any) => ({
        id: u.id,
        firstName: u.first_name,
        lastName: u.last_name,
        role: Array.isArray(u.roles) ? u.roles[0]?.name : u.roles?.name,
      })));
    }
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const fetchOrders = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from('orders')
        .select('id, order_number, type, status, total_amount_cop, currency, notes, created_at, estimated_delivery_date, client_id, assigned_to_id')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (typeFilter) query = query.eq('type', typeFilter);
      if (statusFilter) query = query.eq('status', statusFilter);
      if (responsibleFilter) query = query.eq('assigned_to_id', responsibleFilter);
      if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00`);
      if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59`);

      const { data, error } = await query;
      if (error || !data) { setOrders([]); return; }

      // Fetch clients + assigned_to users
      const clientIds = Array.from(new Set(data.map((o: any) => o.client_id).filter(Boolean)));
      const assignedIds = Array.from(new Set(data.map((o: any) => o.assigned_to_id).filter(Boolean)));
      const allUserIds = Array.from(new Set([...clientIds, ...assignedIds]));
      let usersMap: Record<string, any> = {};
      if (allUserIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, first_name, last_name, email')
          .in('id', allUserIds);
        if (users) {
          usersMap = users.reduce((acc: Record<string, any>, c: any) => { acc[c.id] = c; return acc; }, {});
        }
      }

      // Fetch work_assignments to get jewelers per order (via pieces)
      const orderIds = data.map((o: any) => o.id);
      const orderWorkersMap: Record<string, { id: string; firstName: string; lastName: string }[]> = {};
      if (orderIds.length > 0) {
        const { data: pieces } = await supabase
          .from('pieces')
          .select('id, order_id')
          .in('order_id', orderIds);
        if (pieces && pieces.length > 0) {
          const pieceIds = pieces.map((p: any) => p.id);
          const pieceOrderMap: Record<string, string> = {};
          for (const p of pieces) pieceOrderMap[p.id] = p.order_id;

          const { data: assignments } = await supabase
            .from('work_assignments')
            .select('piece_id, worker_id')
            .in('piece_id', pieceIds);
          if (assignments) {
            const workerIds = Array.from(new Set(assignments.map((a: any) => a.worker_id).filter(Boolean)));
            let workersMap: Record<string, any> = {};
            if (workerIds.length > 0) {
              const { data: workers } = await supabase
                .from('users')
                .select('id, first_name, last_name')
                .in('id', workerIds);
              if (workers) {
                workersMap = workers.reduce((acc: Record<string, any>, w: any) => { acc[w.id] = w; return acc; }, {});
              }
            }
            for (const a of assignments) {
              const orderId = pieceOrderMap[a.piece_id];
              if (!orderId) continue;
              if (!orderWorkersMap[orderId]) orderWorkersMap[orderId] = [];
              const worker = workersMap[a.worker_id];
              if (worker && !orderWorkersMap[orderId].find(w => w.id === worker.id)) {
                orderWorkersMap[orderId].push({ id: worker.id, firstName: worker.first_name, lastName: worker.last_name });
              }
            }
          }
        }
      }

      // Fetch work cycles to get cycle IDs per order
      const cycleMap: Record<string, string> = {};
      if (orderIds.length > 0) {
        const { data: cycles } = await supabase
          .from('order_work_cycles')
          .select('id, order_id')
          .in('order_id', orderIds)
          .order('cycle_number', { ascending: true });
        if (cycles) {
          for (const c of cycles) {
            if (!cycleMap[c.order_id]) cycleMap[c.order_id] = c.id;
          }
        }
      }

      // Fetch first reference image per cycle from file_attachments
      const cycleIds = Object.values(cycleMap);
      const imageMap: Record<string, string | null> = {};
      if (cycleIds.length > 0) {
        const { data: attachments } = await supabase
          .from('file_attachments')
          .select('*')
          .eq('entity_type', 'work_cycle')
          .in('entity_id', cycleIds)
          .order('created_at', { ascending: true });
        if (attachments) {
          for (const a of attachments as ThumbnailAttachmentRow[]) {
            if (imageMap[a.entity_id] || !isImageAttachment(a)) continue;
            imageMap[a.entity_id] = await getThumbnailUrl(a);
          }
        }
      }

      // Build order → imageUrl map from cycle references
      const orderImageMap: Record<string, string | null> = {};
      for (const [orderId, cycleId] of Object.entries(cycleMap)) {
        orderImageMap[orderId] = imageMap[cycleId] || null;
      }

      // Fallback to order-level attachments if a work-cycle reference image is not present.
      if (orderIds.length > 0) {
        const ordersWithoutImage = orderIds.filter((orderId: string) => !orderImageMap[orderId]);
        if (ordersWithoutImage.length > 0) {
          const { data: orderAttachments } = await supabase
            .from('file_attachments')
            .select('*')
            .in('entity_type', ['jewelry_order', 'order'])
            .in('entity_id', ordersWithoutImage)
            .order('created_at', { ascending: true });

          if (orderAttachments) {
            for (const attachment of orderAttachments as ThumbnailAttachmentRow[]) {
              if (orderImageMap[attachment.entity_id] || !isImageAttachment(attachment)) continue;
              orderImageMap[attachment.entity_id] = await getThumbnailUrl(attachment);
            }
          }
        }
      }

      // Transform
      const transformed: Order[] = data.map((o: any) => {
        const client = usersMap[o.client_id];
        const assignedTo = usersMap[o.assigned_to_id];
        return {
          id: o.id,
          orderNumber: o.order_number,
          type: o.type,
          status: o.status,
          totalAmountCop: o.total_amount_cop,
          currency: o.currency,
          notes: o.notes,
          createdAt: o.created_at,
          estimatedDeliveryDate: o.estimated_delivery_date,
          client: client
            ? { id: client.id, firstName: client.first_name, lastName: client.last_name, email: client.email }
            : { id: o.client_id || '', firstName: '---', lastName: '', email: '' },
          assignedTo: assignedTo
            ? { id: assignedTo.id, firstName: assignedTo.first_name, lastName: assignedTo.last_name }
            : null,
          workers: orderWorkersMap[o.id] || [],
          imageUrl: orderImageMap[o.id] || null,
        };
      });

      setOrders(transformed);
    } catch (e) {
      console.error('Fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, responsibleFilter, statusFilter, typeFilter, user]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // ─── Edit (find linked quotation) ──────────────────────────────────────────

  const handleEdit = async (order: Order) => {
    console.log('handleEdit called for order:', order.id, order.orderNumber);
    try {
      const quotation = await fetchQuotationByOrderId(order.id);
      console.log('Quotation found:', quotation);
      if (quotation) {
        router.push(`/admin/cotizacion/nueva?edit=${quotation.id}`);
      } else {
        // No quotation linked — go to order detail
        console.log('No quotation found, going to order detail');
        router.push(`/admin/pedidos/${order.id}`);
      }
    } catch (e) {
      console.error('Error finding quotation:', e);
      router.push(`/admin/pedidos/${order.id}`);
    }
  };

  // ─── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async (order: Order) => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', order.id);
      if (error) throw error;
      setDeleteTarget(null);
      fetchOrders();
    } catch (e) {
      console.error('Error deleting order:', e);
    } finally {
      setDeleting(false);
    }
  };

  // ─── Debounced search ───────────────────────────────────────────────────────

  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ─── Filter + group by status ───────────────────────────────────────────────

  const groupedOrders = useMemo(() => {
    let filtered = orders;
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(o =>
        o.orderNumber.toLowerCase().includes(s) ||
        o.client.firstName.toLowerCase().includes(s) ||
        o.client.lastName.toLowerCase().includes(s) ||
        `${o.client.firstName} ${o.client.lastName}`.toLowerCase().includes(s) ||
        o.client.email.toLowerCase().includes(s) ||
        (o.assignedTo && `${o.assignedTo.firstName} ${o.assignedTo.lastName}`.toLowerCase().includes(s)) ||
        o.workers.some(w => `${w.firstName} ${w.lastName}`.toLowerCase().includes(s)) ||
        (o.notes && o.notes.toLowerCase().includes(s))
      );
    }
    // Worker filter (client-side since it requires piece join)
    if (workerFilter) {
      filtered = filtered.filter(o => o.workers.some(w => w.id === workerFilter));
    }
    const grouped: Record<string, Order[]> = {};
    for (const col of KANBAN_COLUMNS) grouped[col.key] = [];
    for (const o of filtered) {
      if (grouped[o.status]) grouped[o.status].push(o);
      else if (grouped['pending']) grouped['pending'].push(o); // fallback
    }
    return grouped;
  }, [orders, search, workerFilter]);

  const totalCount = orders.length;
  const filteredCount = Object.values(groupedOrders).reduce((sum, arr) => sum + arr.length, 0);
  const activeFilterCount = [typeFilter, statusFilter, responsibleFilter, workerFilter, dateFrom, dateTo].filter(Boolean).length;

  const clearAllFilters = () => {
    setTypeFilter('');
    setStatusFilter('');
    setResponsibleFilter('');
    setWorkerFilter('');
    setDateFrom('');
    setDateTo('');
    setSearchInput('');
  };

  const responsibles = staffList.filter(s => ['admin', 'manager'].includes(s.role));
  const workers = staffList.filter(s => ['jeweler', 'designer'].includes(s.role));

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-w-0 max-w-full overflow-x-hidden space-y-5">

      {/* ── Delete confirmation modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div
            className="w-full max-w-sm overflow-hidden rounded-2xl"
            style={{ background: 'rgba(20,18,14,0.98)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }}
          >
            <div className="px-6 py-5">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertTriangle size={18} style={{ color: 'rgba(248,113,113,0.9)' }} />
              </div>
              <h2 className="font-display text-base font-semibold mb-1" style={{ color: 'rgba(242,240,237,0.95)' }}>Eliminar pedido</h2>
              <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.45)' }}>
                ¿Estás seguro de eliminar <strong style={{ color: 'rgba(212,175,55,0.9)' }}>{deleteTarget.orderNumber}</strong>?{' '}
                Esta acción se puede revertir.
              </p>
            </div>
            <div className="px-6 pb-5 flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium font-sans-custom transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(242,240,237,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteTarget)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium font-sans-custom transition-colors disabled:opacity-50"
                style={{ background: 'rgba(239,68,68,0.15)', color: 'rgba(248,113,113,0.9)', border: '1px solid rgba(239,68,68,0.3)' }}
              >
                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New order modal ── */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl"
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
                className="group flex w-full min-w-0 items-start gap-4 rounded-2xl p-4 text-left transition-all duration-200"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.25)'; (e.currentTarget as HTMLElement).style.background = 'rgba(212,175,55,0.05)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
              >
                <div className="mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)' }}>
                  <ShoppingBag size={16} style={{ color: 'rgba(212,175,55,0.9)' }} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium font-display" style={{ color: 'rgba(242,240,237,0.9)' }}>Venta presencial — Catálogo</p>
                  <p className="text-xs mt-0.5 leading-relaxed font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>
                    El cliente compra en persona una joya del catálogo.
                  </p>
                </div>
              </button>

              <button
                onClick={() => { setShowNewModal(false); router.push('/admin/cotizacion/nueva'); }}
                className="group flex w-full min-w-0 items-start gap-4 rounded-2xl p-4 text-left transition-all duration-200"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.25)'; (e.currentTarget as HTMLElement).style.background = 'rgba(139,92,246,0.05)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
              >
                <div className="mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
                  <Gem size={16} style={{ color: 'rgba(167,139,250,0.9)' }} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium font-display" style={{ color: 'rgba(242,240,237,0.9)' }}>Taller de joyería — Cotización</p>
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
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-display font-semibold" style={{ color: 'rgba(242,240,237,0.95)' }}>Pedidos</h1>
          <p className="text-sm mt-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>
            {loading ? 'Cargando...' : isManager ? `${totalCount} pedido${totalCount !== 1 ? 's' : ''} visibles · solo puedes modificar los asignados a ti` : `${totalCount} pedido${totalCount !== 1 ? 's' : ''} activos`}
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-[0.1em] transition-all duration-200 font-sans-custom sm:w-auto"
          style={{ background: 'linear-gradient(135deg, #E8C547, #D4AF37)', color: '#1A1400' }}
        >
          <Plus size={14} />
          Nuevo Pedido
        </button>
      </div>

      {/* ── Filters ── */}
      <div className="space-y-3">
        {/* Search bar + filter toggle */}
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'rgba(242,240,237,0.25)' }} />
            <input
              type="text"
              placeholder="Buscar por # pedido, cliente, responsable, joyero, notas..."
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
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex min-w-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 font-sans-custom"
            style={{
              background: activeFilterCount > 0 ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${activeFilterCount > 0 ? 'rgba(212,175,55,0.3)' : 'rgba(255,255,255,0.07)'}`,
              color: activeFilterCount > 0 ? 'rgba(212,175,55,0.9)' : 'rgba(242,240,237,0.6)',
            }}
          >
            <Filter size={14} />
            Filtros
            {activeFilterCount > 0 && (
              <span
                className="w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold"
                style={{ background: 'rgba(212,175,55,0.9)', color: '#1A1400' }}
              >
                {activeFilterCount}
              </span>
            )}
            <ChevronDown size={12} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Expandable filter panel */}
        {showFilters && (
          <div
            className="grid min-w-0 grid-cols-1 gap-3 rounded-xl p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-3 xl:grid-cols-5"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="space-y-1.5">
              <label className="text-[11px] font-sans-custom font-medium" style={{ color: 'rgba(242,240,237,0.4)' }}>Tipo</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none font-sans-custom"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: typeFilter ? 'rgba(242,240,237,0.85)' : 'rgba(242,240,237,0.4)' }}
              >
                <option value="">Todos</option>
                <option value="custom">Personalizado</option>
                <option value="catalog">Catálogo</option>
                <option value="repair">Reparación</option>
                <option value="resize">Redimensionar</option>
                <option value="jewelry">Joyería</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-sans-custom font-medium" style={{ color: 'rgba(242,240,237,0.4)' }}>Estado</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none font-sans-custom"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: statusFilter ? 'rgba(242,240,237,0.85)' : 'rgba(242,240,237,0.4)' }}
              >
                <option value="">Todos</option>
                {KANBAN_COLUMNS.map(col => <option key={col.key} value={col.key}>{col.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-sans-custom font-medium" style={{ color: 'rgba(242,240,237,0.4)' }}>Responsable</label>
              <select
                value={responsibleFilter}
                onChange={(e) => setResponsibleFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none font-sans-custom"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: responsibleFilter ? 'rgba(242,240,237,0.85)' : 'rgba(242,240,237,0.4)' }}
              >
                <option value="">Todos</option>
                {responsibles.map(r => <option key={r.id} value={r.id}>{r.firstName} {r.lastName}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-sans-custom font-medium" style={{ color: 'rgba(242,240,237,0.4)' }}>Joyero</label>
              <select
                value={workerFilter}
                onChange={(e) => setWorkerFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none font-sans-custom"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: workerFilter ? 'rgba(242,240,237,0.85)' : 'rgba(242,240,237,0.4)' }}
              >
                <option value="">Todos</option>
                {workers.map(w => <option key={w.id} value={w.id}>{w.firstName} {w.lastName}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-sans-custom font-medium" style={{ color: 'rgba(242,240,237,0.4)' }}>Fecha</label>
              <div className="grid grid-cols-1 gap-1.5 min-[380px]:grid-cols-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="min-w-0 rounded-lg px-2 py-2 text-xs focus:outline-none font-sans-custom"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(242,240,237,0.7)', colorScheme: 'dark' }}
                  placeholder="Desde"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="min-w-0 rounded-lg px-2 py-2 text-xs focus:outline-none font-sans-custom"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(242,240,237,0.7)', colorScheme: 'dark' }}
                  placeholder="Hasta"
                />
              </div>
            </div>
          </div>
        )}

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>
              {filteredCount} de {totalCount} pedidos
            </span>
            {typeFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-sans-custom" style={{ background: 'rgba(212,175,55,0.1)', color: 'rgba(212,175,55,0.9)', border: '1px solid rgba(212,175,55,0.2)' }}>
                Tipo: {typeLabels[typeFilter] || typeFilter}
                <button onClick={() => setTypeFilter('')}><X size={10} /></button>
              </span>
            )}
            {statusFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-sans-custom" style={{ background: 'rgba(96,165,250,0.1)', color: 'rgba(96,165,250,0.9)', border: '1px solid rgba(96,165,250,0.2)' }}>
                Estado: {KANBAN_COLUMNS.find(c => c.key === statusFilter)?.label || statusFilter}
                <button onClick={() => setStatusFilter('')}><X size={10} /></button>
              </span>
            )}
            {responsibleFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-sans-custom" style={{ background: 'rgba(139,92,246,0.1)', color: 'rgba(167,139,250,0.9)', border: '1px solid rgba(139,92,246,0.2)' }}>
                Resp: {responsibles.find(r => r.id === responsibleFilter)?.firstName || '...'}
                <button onClick={() => setResponsibleFilter('')}><X size={10} /></button>
              </span>
            )}
            {workerFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-sans-custom" style={{ background: 'rgba(16,185,129,0.1)', color: 'rgba(52,211,153,0.9)', border: '1px solid rgba(16,185,129,0.2)' }}>
                Joyero: {workers.find(w => w.id === workerFilter)?.firstName || '...'}
                <button onClick={() => setWorkerFilter('')}><X size={10} /></button>
              </span>
            )}
            {(dateFrom || dateTo) && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-sans-custom" style={{ background: 'rgba(234,179,8,0.1)', color: 'rgba(250,204,21,0.9)', border: '1px solid rgba(234,179,8,0.2)' }}>
                {dateFrom && dateTo ? `${dateFrom} → ${dateTo}` : dateFrom ? `Desde ${dateFrom}` : `Hasta ${dateTo}`}
                <button onClick={() => { setDateFrom(''); setDateTo(''); }}><X size={10} /></button>
              </span>
            )}
            <button
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-sans-custom transition-colors"
              style={{ background: 'rgba(248,113,113,0.08)', color: 'rgba(248,113,113,0.8)', border: '1px solid rgba(248,113,113,0.15)' }}
            >
              <XCircle size={10} /> Limpiar todo
            </button>
          </div>
        )}
      </div>

      {!loading && (
        <div className="-mx-3 overflow-x-auto px-3 pb-1 md:hidden sm:-mx-4 sm:px-4">
          <div className="flex gap-2 pr-1">
            {KANBAN_COLUMNS.map((col) => {
              const count = groupedOrders[col.key]?.length ?? 0;
              const active = mobileStatus === col.key;
              return (
                <button
                  key={col.key}
                  onClick={() => setMobileStatus(col.key)}
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium font-sans-custom"
                  style={{
                    background: active ? col.headerBg : 'rgba(255,255,255,0.035)',
                    border: `1px solid ${active ? col.headerBorder : 'rgba(255,255,255,0.06)'}`,
                    color: active ? col.dotColor : 'rgba(242,240,237,0.48)',
                  }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: col.dotColor }} />
                  {col.label}
                  <span className="rounded-md px-1.5 py-0.5 text-[10px]" style={{ background: 'rgba(255,255,255,0.06)' }}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Kanban Board ── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {KANBAN_COLUMNS.map((col) => (
            <div key={col.key} className="space-y-3">
              <div className="h-10 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
              {[1, 2].map(i => (
                <div key={i} className="h-44 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
          {KANBAN_COLUMNS.map((col) => {
            const colOrders = groupedOrders[col.key] || [];
            return (
              <div key={col.key} className={`${mobileStatus === col.key ? 'flex' : 'hidden'} flex-col min-w-0 md:flex`}>
                {/* Column header */}
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3"
                  style={{ background: col.headerBg, border: `1px solid ${col.headerBorder}` }}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: col.dotColor }} />
                  <span className="text-xs font-semibold font-sans-custom truncate" style={{ color: col.dotColor }}>
                    {col.label}
                  </span>
                  <span
                    className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded-md shrink-0"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(242,240,237,0.4)' }}
                  >
                    {colOrders.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="space-y-3 pr-1 md:max-h-[calc(100vh-260px)] md:overflow-y-auto md:custom-scrollbar">
                  {colOrders.length === 0 && (
                    <div
                      className="rounded-2xl py-8 flex flex-col items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.06)' }}
                    >
                      <p className="text-[10px] font-sans-custom" style={{ color: 'rgba(242,240,237,0.15)' }}>Sin pedidos</p>
                    </div>
                  )}
                  {colOrders.map((order) => (
                    <div
                      key={order.id}
                      className="group min-w-0 cursor-pointer overflow-hidden rounded-2xl transition-all duration-200 hover:translate-y-[-1px]"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      }}
                      onClick={() => router.push(`/admin/pedidos/${order.id}`)}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.2)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.25)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'; }}
                    >
                      {/* Image */}
                      <div className="relative w-full aspect-[4/3] overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
                        {order.imageUrl ? (
                          <img
                            src={order.imageUrl}
                            alt={order.orderNumber}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5">
                            <ImageIcon size={20} style={{ color: 'rgba(242,240,237,0.1)' }} />
                            <span className="text-[9px] font-sans-custom" style={{ color: 'rgba(242,240,237,0.12)' }}>Sin foto</span>
                          </div>
                        )}
                        {/* Type badge overlay */}
                        <div className="absolute top-2 left-2">
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded-md font-sans-custom font-medium backdrop-blur-sm"
                            style={{ background: 'rgba(0,0,0,0.6)', color: 'rgba(212,175,55,0.9)', border: '1px solid rgba(212,175,55,0.2)' }}
                          >
                            {typeLabels[order.type] || order.type}
                          </span>
                        </div>
                        {/* Admin actions overlay */}
                        {isAdmin && (
                          <div
                            className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => handleEdit(order)}
                              className="w-6 h-6 flex items-center justify-center rounded-md backdrop-blur-sm transition-colors"
                              style={{ background: 'rgba(0,0,0,0.5)', color: 'rgba(242,240,237,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
                              title="Editar cotización"
                            >
                              <Pencil size={10} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(order)}
                              className="w-6 h-6 flex items-center justify-center rounded-md backdrop-blur-sm transition-colors"
                              style={{ background: 'rgba(0,0,0,0.5)', color: 'rgba(248,113,113,0.8)', border: '1px solid rgba(239,68,68,0.2)' }}
                              title="Eliminar"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Card body */}
                      <div className="px-3 py-3 space-y-2">
                        {/* Order number + amount */}
                        <div className="flex min-w-0 items-center justify-between gap-2">
                          <span className="min-w-0 truncate font-mono text-[11px] font-medium" style={{ color: 'rgba(212,175,55,0.85)' }}>
                            {order.orderNumber}
                          </span>
                          {order.totalAmountCop && (
                            <span className="max-w-[48%] shrink-0 truncate text-right text-[10px] font-mono" style={{ color: 'rgba(242,240,237,0.5)' }}>
                              {formatCOP(Number(order.totalAmountCop))}
                            </span>
                          )}
                        </div>

                        {/* Client */}
                        <div className="flex min-w-0 items-center gap-1.5">
                          <User size={10} className="shrink-0" style={{ color: 'rgba(242,240,237,0.25)' }} />
                          <span className="text-xs font-sans-custom truncate" style={{ color: 'rgba(242,240,237,0.6)' }}>
                            {order.client.firstName} {order.client.lastName}
                          </span>
                        </div>

                        {/* Date */}
                        <div className="flex min-w-0 items-center gap-1.5">
                          <Calendar size={10} className="shrink-0" style={{ color: 'rgba(242,240,237,0.2)' }} />
                          <span className="min-w-0 truncate text-[10px] font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>
                            {new Date(order.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                            {order.estimatedDeliveryDate && (
                              <> · Entrega: {new Date(order.estimatedDeliveryDate).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
