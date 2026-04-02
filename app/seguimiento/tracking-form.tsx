'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface TimelineEvent {
  id: string;
  pieceName: string;
  stateCode: string;
  stateName: string;
  publicLabel: string | null;
  notes: string | null;
  timestamp: string;
}

interface TrackingResult {
  order: {
    orderNumber: string;
    type: string;
    status: string;
    estimatedDeliveryDate: string | null;
    createdAt: string;
  };
  pieces: Array<{
    name: string;
    currentState: { code: string; name: string; publicLabel: string | null; isFinal: boolean } | null;
  }>;
  timeline: TimelineEvent[];
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En producción',
  completed: 'Completado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

const TYPE_LABELS: Record<string, string> = {
  catalog: 'Catálogo',
  custom: 'Personalizado',
  repair: 'Reparación',
  resize: 'Ajuste de talla',
};

export default function TrackingForm() {
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);

    try {
      // Query Supabase directly
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(`
          id,
          orderNumber,
          type,
          status,
          estimatedDeliveryDate,
          createdAt,
          clientPhone,
          pieces (
            id,
            name,
            sortOrder,
            currentState:workflow_states (
              code,
              name,
              publicLabel,
              isFinal
            ),
            stateHistory (
              id,
              notes,
              createdAt,
              state:workflow_states (
                code,
                name,
                publicLabel
              )
            )
          )
        `)
        .eq('orderNumber', orderNumber)
        .ilike('clientPhone', `%${phone}`)
        .is('deletedAt', null)
        .single();

      if (orderError || !order) {
        throw new Error('Pedido no encontrado. Verifica el número de pedido y los últimos 4 dígitos de tu teléfono.');
      }

      // Build timeline from pieces' state histories
      const timeline: TimelineEvent[] = [];
      for (const piece of order.pieces) {
        for (const entry of piece.stateHistory) {
          const state = Array.isArray(entry.state) ? entry.state[0] : entry.state;
          timeline.push({
            id: entry.id,
            pieceName: piece.name,
            stateCode: state.code,
            stateName: state.name,
            publicLabel: state.publicLabel,
            notes: entry.notes,
            timestamp: entry.createdAt,
          });
        }
      }

      // Sort timeline chronologically
      timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      setResult({
        order: {
          orderNumber: order.orderNumber,
          type: order.type,
          status: order.status,
          estimatedDeliveryDate: order.estimatedDeliveryDate,
          createdAt: order.createdAt,
        },
        pieces: order.pieces.map((p: any) => ({
          name: p.name,
          currentState: p.currentState,
        })),
        timeline,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al buscar el pedido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Search form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label htmlFor="orderNumber" className="block text-sm font-medium text-gray-700 mb-1">
            Número de pedido
          </label>
          <input
            id="orderNumber"
            type="text"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="ORD-20260401-0001"
            required
            className="w-full border border-gray-300 rounded-md px-4 py-2 text-gray-900 placeholder-gray-500 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Últimos 4 dígitos de tu teléfono
          </label>
          <input
            id="phone"
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="1234"
            maxLength={4}
            required
            className="w-full border border-gray-300 rounded-md px-4 py-2 text-gray-900 placeholder-gray-500 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !orderNumber || phone.length < 4}
          className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          {loading ? 'Buscando...' : 'Consultar estado'}
        </button>
      </form>

      {/* Results */}
      {result && (
        <div className="mt-8 space-y-6">
          {/* Order summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">{result.order.orderNumber}</h2>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  result.order.status === 'delivered'
                    ? 'bg-green-100 text-green-800'
                    : result.order.status === 'in_progress'
                      ? 'bg-blue-100 text-blue-800'
                      : result.order.status === 'cancelled'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                }`}
              >
                {STATUS_LABELS[result.order.status] || result.order.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Tipo</p>
                <p className="font-medium">{TYPE_LABELS[result.order.type] || result.order.type}</p>
              </div>
              <div>
                <p className="text-gray-500">Fecha de creación</p>
                <p className="font-medium">
                  {new Date(result.order.createdAt).toLocaleDateString('es-CO')}
                </p>
              </div>
              {result.order.estimatedDeliveryDate && (
                <div>
                  <p className="text-gray-500">Entrega estimada</p>
                  <p className="font-medium">
                    {new Date(result.order.estimatedDeliveryDate).toLocaleDateString('es-CO')}
                  </p>
                </div>
              )}
            </div>

            {/* Pieces */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
                Piezas
              </h3>
              <div className="space-y-2">
                {result.pieces.map((piece, i) => (
                  <div key={i} className="flex items-center justify-between border rounded-lg px-4 py-3">
                    <span className="font-medium text-gray-900">{piece.name}</span>
                    {piece.currentState && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-amber-50 text-amber-800">
                        {piece.currentState.publicLabel || piece.currentState.name}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Timeline */}
          {result.timeline.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-6">
                Historial
              </h3>
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                <div className="space-y-6">
                  {result.timeline.map((event) => (
                    <div key={event.id} className="relative flex items-start pl-10">
                      <div
                        className="absolute left-2.5 w-3 h-3 rounded-full border-2 border-white bg-amber-500"
                        style={{ top: '4px' }}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 text-sm">
                            {event.stateName}
                          </span>
                          <span className="text-xs text-gray-400">
                            — {event.pieceName}
                          </span>
                        </div>
                        {event.notes && (
                          <p className="text-sm text-gray-500 mt-0.5">{event.notes}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(event.timestamp).toLocaleString('es-CO')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
