'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, ChevronLeft, ChevronRight, Plus, Trash2, User, Calendar, Phone, Mail, Clock, Package, Loader2, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import dynamic from 'next/dynamic';

interface Piece {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  current_state_id: string | null;
  currentState?: { id: string; code: string; name: string } | null;
  workflowTemplate?: { id: string; name: string } | null;
  stateHistory?: { id: string; stateId: string; notes: string | null; createdAt: string; state: { code: string; name: string } }[];
  assignments?: { id: string; workerId: string; stageCode: string; status: string; progressPct: number; worker: { firstName: string; lastName: string } }[];
}

interface OrderDetail {
  id: string;
  orderNumber: string;
  type: string;
  status: string;
  totalAmountCop: number | null;
  totalAmountUsd: number | null;
  currency: string;
  notes: string | null;
  clientPhone: string | null;
  estimatedDeliveryDate: string | null;
  createdAt: string;
  updatedAt: string;
  client: { id: string; firstName: string; lastName: string; email: string };
  pieces: Piece[];
  payments: { id: string; method: string; amountCop: number; status: string; paidAt: string | null }[];
}

interface Transition {
  transitionId: string;
  toStateId: string;
  toStateCode: string;
  toStateName: string;
  requiresApproval: boolean;
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

function formatCOP(amount: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [transitions, setTransitions] = useState<Record<string, Transition[]>>({});
  const [transitionLoading, setTransitionLoading] = useState<string | null>(null);

  const fetchOrder = async () => {
    try {
      console.log('Intentando obtener pedido:', id);
      
      // Fetch order con relaciones
      let orderData, orderErr;
      
      try {
        // Primero intentar sin pagos para ver si el problema está ahí
        console.log('Intentando consulta básica (sin pagos)...');
        const basicResult = await supabase
          .from('orders')
          .select(`
            *,
            client:users!orders_client_id_fkey (
              id, first_name, last_name, email, phone
            ),
            assigned_to:users!orders_assigned_to_id_fkey (
              id, first_name, last_name
            )
          `)
          .eq('id', id)
          .single();
        
        if (basicResult.error) {
          console.error('Error en consulta básica:', basicResult.error);
          throw basicResult.error;
        }
        
        console.log('Consulta básica exitosa, ahora intentando con pagos...');
        
        // Si la básica funciona, intentar con pagos
        const result = await supabase
          .from('orders')
          .select(`
            *,
            client:users!orders_client_id_fkey (
              id, first_name, last_name, email, phone
            ),
            assigned_to:users!orders_assigned_to_id_fkey (
              id, first_name, last_name
            ),
            payments (
              id, method, amount_cop, status, paid_at, created_at
            )
          `)
          .eq('id', id)
          .single();
        
        orderData = result.data;
        orderErr = result.error;
        
        console.log('Consulta completa exitosa');
      } catch (queryError) {
        console.error('Error en consulta de orden:', queryError);
        if (queryError instanceof Error) {
          console.error('Detalles del error:', queryError.message);
          console.error('Stack:', queryError.stack);
        }
        throw queryError;
      }

      console.log('Order data:', orderData);
      console.log('Order error:', orderErr);
      console.log('Client data:', orderData?.client);
      console.log('Assigned to data:', orderData?.assigned_to);
      console.log('Payments data:', orderData?.payments);
      console.log('Payments length:', orderData?.payments?.length || 0);
      if (orderData?.payments && orderData.payments.length > 0) {
        console.log('Columnas de primer payment:', Object.keys(orderData.payments[0] || {}));
      }

      if (orderErr) throw new Error(orderErr.message);
      if (!orderData) throw new Error('Pedido no encontrado');

      // Fetch pieces sin relaciones complejas
      const { data: piecesData, error: piecesErr } = await supabase
        .from('pieces')
        .select('*')
        .eq('order_id', id)
        .order('sort_order', { ascending: true });

      console.log('Pieces data:', piecesData);
      console.log('Pieces error:', piecesErr);

      if (piecesErr) throw new Error(piecesErr.message);

      const orderDetail: OrderDetail = {
        ...orderData,
        pieces: piecesData || [],
        payments: (orderData.payments || []).map((payment: any) => {
          console.log('Payment de BD:', payment);
          console.log('paid_at value:', payment.paid_at);
          console.log('paid_at type:', typeof payment.paid_at);
          console.log('paid_at === "null":', payment.paid_at === 'null');
          
          return {
            id: payment.id,
            method: payment.method,
            amountCop: payment.amount_cop,
            status: payment.status,
            paidAt: payment.paid_at === 'null' ? null : payment.paid_at,
            createdAt: payment.created_at,
          };
        }),
      };

      console.log('Pedido obtenido:', orderDetail);
      setOrder(orderDetail);
      
      // Transitions vacías (no hay workflow transitions en este modelo)
      setTransitions({});
    } catch (e: unknown) {
      console.error('Error completo al cargar pedido:', e);
      const errorMessage = e instanceof Error ? e.message : 'Error loading order';
      console.error('Mensaje de error:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Las transiciones de workflow se manejan en la vista de joyería
  // Esta función se mantiene para compatibilidad pero no se usa
  const handleTransition = async (pieceId: string, toStateId: string) => {
    console.log('Transición no implementada en vista normal');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-5 rounded-xl animate-pulse w-48" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="h-20 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
        <div className="h-64 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-4">
        <Link href="/admin/pedidos" className="inline-flex items-center gap-2 text-sm font-sans-custom transition-colors" style={{ color: 'rgba(242,240,237,0.4)' }}>
          <ArrowLeft size={15} /> Pedidos
        </Link>
        <div className="rounded-2xl p-5 text-sm font-sans-custom" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'rgba(252,165,165,0.9)' }}>
          {error || 'Pedido no encontrado'}
        </div>
      </div>
    );
  }

  // Si es un pedido de joyería, renderizar la vista especializada
  if (order.type === 'jewelry') {
    const JewelryDetailPage = dynamic(() => import('./jewelry-detail'), {
      loading: () => (
        <div className="space-y-6">
          <div className="h-5 rounded-xl animate-pulse w-48" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="h-20 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
          <div className="h-64 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
        </div>
      ),
      ssr: false,
    });
    return <JewelryDetailPage />;
  }

  const statusBadge: Record<string, { label: string; bg: string; color: string; border: string }> = {
    pending:     { label: 'Pendiente',   bg: 'rgba(234,179,8,0.1)',   color: 'rgba(250,204,21,0.9)',  border: 'rgba(234,179,8,0.25)' },
    in_progress: { label: 'En progreso', bg: 'rgba(59,130,246,0.1)',  color: 'rgba(147,197,253,0.9)', border: 'rgba(59,130,246,0.25)' },
    completed:   { label: 'Completado',  bg: 'rgba(16,185,129,0.1)',  color: 'rgba(110,231,183,0.9)', border: 'rgba(16,185,129,0.25)' },
    delivered:   { label: 'Entregado',   bg: 'rgba(34,197,94,0.1)',   color: 'rgba(134,239,172,0.9)', border: 'rgba(34,197,94,0.25)' },
    cancelled:   { label: 'Cancelado',   bg: 'rgba(239,68,68,0.1)',   color: 'rgba(252,165,165,0.9)', border: 'rgba(239,68,68,0.25)' },
  };
  const st = statusBadge[order.status] ?? { label: order.status, bg: 'rgba(255,255,255,0.06)', color: 'rgba(242,240,237,0.5)', border: 'rgba(255,255,255,0.1)' };

  return (
    <div className="space-y-5 max-w-5xl">

      {/* Back */}
      <Link
        href="/admin/pedidos"
        className="inline-flex items-center gap-2 text-sm font-sans-custom transition-colors"
        style={{ color: 'rgba(242,240,237,0.35)' }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(242,240,237,0.7)'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(242,240,237,0.35)'}
      >
        <ArrowLeft size={15} /> Pedidos
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold font-sans-custom" style={{ color: 'rgba(242,240,237,0.95)' }}>
              {order.orderNumber}
            </h1>
            <span
              className="text-[11px] px-2.5 py-0.5 rounded-full font-sans-custom font-medium"
              style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}
            >
              {st.label}
            </span>
          </div>
          <p className="text-sm mt-0.5 font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>
            {typeLabels[order.type] || order.type} · Creado {new Date(order.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Client */}
        <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-[10px] uppercase tracking-[0.14em] font-semibold font-sans-custom mb-3" style={{ color: 'rgba(242,240,237,0.3)' }}>Cliente</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User size={13} style={{ color: 'rgba(212,175,55,0.5)' }} />
              <span className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.85)' }}>
                {order.client ? `${order.client.firstName} ${order.client.lastName}` : 'No especificado'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Mail size={12} style={{ color: 'rgba(242,240,237,0.2)' }} />
              <span className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>
                {order.client?.email || '—'}
              </span>
            </div>
            {order.clientPhone && (
              <div className="flex items-center gap-2">
                <Phone size={12} style={{ color: 'rgba(242,240,237,0.2)' }} />
                <span className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>{order.clientPhone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Dates */}
        <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-[10px] uppercase tracking-[0.14em] font-semibold font-sans-custom mb-3" style={{ color: 'rgba(242,240,237,0.3)' }}>Fechas</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock size={13} style={{ color: 'rgba(212,175,55,0.5)' }} />
              <span className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.7)' }}>
                Creado: {new Date(order.createdAt).toLocaleDateString('es-CO')}
              </span>
            </div>
            {order.estimatedDeliveryDate && (
              <div className="flex items-center gap-2">
                <Calendar size={13} style={{ color: 'rgba(212,175,55,0.5)' }} />
                <span className="text-sm font-sans-custom" style={{ color: 'rgba(212,175,55,0.8)' }}>
                  Entrega est.: {new Date(order.estimatedDeliveryDate).toLocaleDateString('es-CO')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Payments */}
        <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-[10px] uppercase tracking-[0.14em] font-semibold font-sans-custom mb-3" style={{ color: 'rgba(242,240,237,0.3)' }}>Pagos</p>
          {order.totalAmountCop && (
            <p className="text-lg font-semibold font-sans-custom mb-1" style={{ color: 'rgba(212,175,55,0.9)' }}>
              {formatCOP(Number(order.totalAmountCop))}
            </p>
          )}
          <p className="text-xs font-sans-custom mb-2" style={{ color: 'rgba(242,240,237,0.35)' }}>
            {(order.payments || []).length} pago(s) registrado(s)
          </p>
          {(order.payments || []).length > 0 && (
            <div className="space-y-1.5">
              {(order.payments || []).slice(0, 3).map((p) => (
                <div key={p.id} className="flex justify-between text-xs font-sans-custom">
                  <span style={{ color: 'rgba(242,240,237,0.5)' }}>{p.method}</span>
                  <span style={{ color: p.status === 'completed' ? 'rgba(110,231,183,0.9)' : 'rgba(242,240,237,0.3)' }}>
                    {formatCOP(Number(p.amountCop))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-[10px] uppercase tracking-[0.14em] font-semibold font-sans-custom mb-2" style={{ color: 'rgba(242,240,237,0.3)' }}>Notas</p>
          <p className="text-sm font-sans-custom leading-relaxed" style={{ color: 'rgba(242,240,237,0.6)' }}>{order.notes}</p>
        </div>
      )}

      {/* Pieces */}
      <div>
        <p className="text-sm font-semibold font-sans-custom mb-3" style={{ color: 'rgba(242,240,237,0.7)' }}>
          Piezas ({order.pieces.length})
        </p>
        <div className="space-y-3">
          {order.pieces.map((piece) => {
            const pieceTransitions = transitions[piece.id] || [];
            return (
              <div key={piece.id} className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-3 mb-3">
                  <Package size={14} style={{ color: 'rgba(212,175,55,0.7)' }} />
                  <span className="text-sm font-medium font-sans-custom" style={{ color: 'rgba(242,240,237,0.85)' }}>{piece.name}</span>
                  {piece.currentState && (
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-sans-custom"
                      style={{ background: 'rgba(212,175,55,0.1)', color: 'rgba(212,175,55,0.8)', border: '1px solid rgba(212,175,55,0.2)' }}
                    >
                      {piece.currentState.name}
                    </span>
                  )}
                </div>
                {piece.description && (
                  <p className="text-xs font-sans-custom ml-[22px] mb-3" style={{ color: 'rgba(242,240,237,0.4)' }}>{piece.description}</p>
                )}

                {/* Transitions */}
                {pieceTransitions.length > 0 && (
                  <div className="ml-[22px] mb-3">
                    <p className="text-[10px] uppercase tracking-wider font-sans-custom mb-2" style={{ color: 'rgba(242,240,237,0.25)' }}>Transiciones</p>
                    <div className="flex flex-wrap gap-2">
                      {pieceTransitions.map((t) => (
                        <button
                          key={t.transitionId}
                          onClick={() => handleTransition(piece.id, t.toStateId)}
                          disabled={transitionLoading === piece.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-sans-custom transition-all disabled:opacity-50"
                          style={{ background: 'rgba(212,175,55,0.1)', color: 'rgba(212,175,55,0.85)', border: '1px solid rgba(212,175,55,0.2)' }}
                        >
                          {transitionLoading === piece.id ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : (
                            <ChevronRight size={11} />
                          )}
                          {t.toStateName}
                          {t.requiresApproval && <AlertTriangle size={10} style={{ color: 'rgba(251,191,36,0.8)' }} />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assignments */}
                {piece.assignments && piece.assignments.length > 0 && (
                  <div className="ml-[22px] mb-3 space-y-1.5">
                    <p className="text-[10px] uppercase tracking-wider font-sans-custom mb-2" style={{ color: 'rgba(242,240,237,0.25)' }}>Asignaciones</p>
                    {piece.assignments.map((a) => (
                      <div key={a.id} className="flex items-center gap-3 text-xs font-sans-custom">
                        <span style={{ color: 'rgba(242,240,237,0.6)' }}>{a.worker.firstName} {a.worker.lastName}</span>
                        <span style={{ color: 'rgba(242,240,237,0.3)' }}>{a.stageCode}</span>
                        <div className="flex-1 max-w-24 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                          <div className="h-full rounded-full" style={{ width: `${a.progressPct}%`, background: 'rgba(212,175,55,0.6)' }} />
                        </div>
                        <span style={{ color: 'rgba(242,240,237,0.35)' }}>{a.progressPct}%</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* State History */}
                {piece.stateHistory && piece.stateHistory.length > 0 ? (
                  <details className="ml-[22px]">
                    <summary className="text-[10px] uppercase tracking-wider font-sans-custom cursor-pointer transition-colors" style={{ color: 'rgba(242,240,237,0.3)' }}>
                      Historial ({piece.stateHistory.length} cambios)
                    </summary>
                    <div className="mt-2 space-y-1.5 pl-3" style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
                      {piece.stateHistory.map((h) => (
                        <div key={h.id} className="text-xs font-sans-custom">
                          <span style={{ color: 'rgba(242,240,237,0.6)' }}>{h.state.name}</span>
                          <span className="ml-2" style={{ color: 'rgba(242,240,237,0.25)' }}>
                            {new Date(h.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {h.notes && <p className="mt-0.5" style={{ color: 'rgba(242,240,237,0.35)' }}>{h.notes}</p>}
                        </div>
                      ))}
                    </div>
                  </details>
                ) : (
                  <p className="ml-[22px] text-[10px] font-sans-custom" style={{ color: 'rgba(242,240,237,0.2)' }}>
                    Sin historial de estados
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
