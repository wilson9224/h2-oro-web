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
        <div className="h-8 bg-charcoal-800 rounded w-48 animate-pulse" />
        <div className="h-64 bg-charcoal-800 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-6">
        <Link href="/admin/pedidos" className="inline-flex items-center gap-2 text-sm text-charcoal-400 hover:text-cream-200">
          <ArrowLeft size={16} /> Volver a pedidos
        </Link>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-red-400 text-sm">{error || 'Pedido no encontrado'}</div>
      </div>
    );
  }

  // Si es un pedido de joyería, renderizar la vista especializada
  if (order.type === 'jewelry') {
    const JewelryDetailPage = dynamic(() => import('./jewelry-detail'), {
      loading: () => (
        <div className="space-y-6">
          <div className="h-8 bg-charcoal-800 rounded w-48 animate-pulse" />
          <div className="h-64 bg-charcoal-800 rounded-lg animate-pulse" />
        </div>
      ),
      ssr: false,
    });
    return <JewelryDetailPage />;
  }

  const st = statusLabels[order.status] || { label: order.status, color: 'bg-charcoal-700 text-charcoal-300' };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back + Header */}
      <Link href="/admin/pedidos" className="inline-flex items-center gap-2 text-sm text-charcoal-400 hover:text-cream-200 transition-colors">
        <ArrowLeft size={16} /> Pedidos
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-serif text-cream-100">{order.orderNumber}</h1>
            <span className={`text-xs px-2 py-0.5 rounded ${st.color}`}>{st.label}</span>
          </div>
          <p className="text-sm text-charcoal-400 mt-1">
            {typeLabels[order.type] || order.type} · Creado {new Date(order.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Client */}
        <div className="bg-charcoal-800 rounded-lg border border-white/5 p-4">
          <h3 className="text-xs text-charcoal-400 uppercase tracking-wider mb-3">Cliente</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-cream-200">
              <User size={14} className="text-charcoal-500" />
              {order.client ? `${order.client.firstName} ${order.client.lastName}` : 'Cliente no especificado'}
            </div>
            <div className="flex items-center gap-2 text-xs text-charcoal-400">
              <Mail size={13} className="text-charcoal-500" />
              {order.client?.email || 'Email no disponible'}
            </div>
            {order.clientPhone && (
              <div className="flex items-center gap-2 text-xs text-charcoal-400">
                <Phone size={13} className="text-charcoal-500" />
                {order.clientPhone}
              </div>
            )}
          </div>
        </div>

        {/* Dates */}
        <div className="bg-charcoal-800 rounded-lg border border-white/5 p-4">
          <h3 className="text-xs text-charcoal-400 uppercase tracking-wider mb-3">Fechas</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-cream-200">
              <Clock size={14} className="text-charcoal-500" />
              Creado: {new Date(order.createdAt).toLocaleDateString('es-CO')}
            </div>
            {order.estimatedDeliveryDate && (
              <div className="flex items-center gap-2 text-sm text-cream-200">
                <Clock size={14} className="text-charcoal-500" />
                Entrega est.: {new Date(order.estimatedDeliveryDate).toLocaleDateString('es-CO')}
              </div>
            )}
          </div>
        </div>

        {/* Payments */}
        <div className="bg-charcoal-800 rounded-lg border border-white/5 p-4">
          <h3 className="text-xs text-charcoal-400 uppercase tracking-wider mb-3">Pagos</h3>
          {order.totalAmountCop && (
            <p className="text-lg font-semibold text-gold-400 mb-1">{formatCOP(Number(order.totalAmountCop))}</p>
          )}
          <p className="text-xs text-charcoal-400">{(order.payments || []).length} pago(s) registrados</p>
          {(order.payments || []).length > 0 && (
            <div className="mt-2 space-y-1">
              {(order.payments || []).slice(0, 3).map((p) => (
                <div key={p.id} className="flex justify-between text-xs">
                  <span className="text-charcoal-300">{p.method}</span>
                  <span className={p.status === 'completed' ? 'text-emerald-400' : 'text-charcoal-500'}>
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
        <div className="bg-charcoal-800 rounded-lg border border-white/5 p-4">
          <h3 className="text-xs text-charcoal-400 uppercase tracking-wider mb-2">Notas</h3>
          <p className="text-sm text-charcoal-300">{order.notes}</p>
        </div>
      )}

      {/* Pieces */}
      <div>
        <h2 className="text-lg font-serif text-cream-100 mb-4">Piezas ({order.pieces.length})</h2>
        <div className="space-y-4">
          {order.pieces.map((piece) => {
            const sc = piece.currentState ? (stateColors[piece.currentState.code] || 'bg-charcoal-700 text-charcoal-300') : 'bg-charcoal-700 text-charcoal-400';
            const pieceTransitions = transitions[piece.id] || [];

            return (
              <div key={piece.id} className="bg-charcoal-800 rounded-lg border border-white/5 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <Package size={16} className="text-gold-500" />
                      <h3 className="text-sm font-medium text-cream-200">{piece.name}</h3>
                      {piece.currentState && (
                        <span className={`text-[11px] px-2 py-0.5 rounded ${sc}`}>
                          {piece.currentState.name}
                        </span>
                      )}
                    </div>
                    {piece.description && (
                      <p className="text-xs text-charcoal-400 mt-1 ml-7">{piece.description}</p>
                    )}
                  </div>
                </div>

                {/* Transitions */}
                {pieceTransitions.length > 0 && (
                  <div className="ml-7 mb-4">
                    <p className="text-[11px] text-charcoal-500 mb-2">Transiciones disponibles:</p>
                    <div className="flex flex-wrap gap-2">
                      {pieceTransitions.map((t) => (
                        <button
                          key={t.transitionId}
                          onClick={() => handleTransition(piece.id, t.toStateId)}
                          disabled={transitionLoading === piece.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-gold-500/10 text-gold-400 hover:bg-gold-500/20 transition-colors disabled:opacity-50"
                        >
                          {transitionLoading === piece.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <ChevronRight size={12} />
                          )}
                          {t.toStateName}
                          {t.requiresApproval && <AlertTriangle size={10} className="text-orange-400" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assignments */}
                {piece.assignments && piece.assignments.length > 0 && (
                  <div className="ml-7 mb-3">
                    <p className="text-[11px] text-charcoal-500 mb-2">Asignaciones:</p>
                    <div className="space-y-1">
                      {piece.assignments.map((a) => (
                        <div key={a.id} className="flex items-center gap-3 text-xs">
                          <span className="text-charcoal-300">{a.worker.firstName} {a.worker.lastName}</span>
                          <span className="text-charcoal-500">{a.stageCode}</span>
                          <div className="flex-1 max-w-24 h-1.5 bg-charcoal-700 rounded-full overflow-hidden">
                            <div className="h-full bg-gold-500/50 rounded-full" style={{ width: `${a.progressPct}%` }} />
                          </div>
                          <span className="text-charcoal-500">{a.progressPct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* State History */}
                {piece.stateHistory && piece.stateHistory.length > 0 ? (
                  <details className="ml-7">
                    <summary className="text-[11px] text-charcoal-500 cursor-pointer hover:text-charcoal-300 transition-colors">
                      Historial ({piece.stateHistory.length} cambios)
                    </summary>
                    <div className="mt-2 space-y-1.5 border-l border-white/5 pl-3">
                      {piece.stateHistory.map((h) => (
                        <div key={h.id} className="text-xs">
                          <span className="text-charcoal-300">{h.state.name}</span>
                          <span className="text-charcoal-600 ml-2">
                            {new Date(h.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {h.notes && <p className="text-charcoal-500 mt-0.5">{h.notes}</p>}
                        </div>
                      ))}
                    </div>
                  </details>
                ) : (
                  <div className="ml-7 text-[11px] text-charcoal-600">
                    No hay historial de estados disponible
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
