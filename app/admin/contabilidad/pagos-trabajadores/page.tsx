'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import {
  Wallet,
  Filter,
  CheckCircle2,
  Clock,
  ChevronDown,
  X,
  AlertCircle,
} from 'lucide-react';

interface WorkerUser {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AdminPayment {
  id: string;
  workerId: string;
  workerName: string;
  concept: string;
  serviceCode: string | null;
  pieceName: string | null;
  amountCop: number;
  status: 'pending' | 'paid';
  paidAt: string | null;
  confirmedAt: string | null;
  notes: string | null;
  createdAt: string;
  orderNumber?: string;
}

type StatusFilter = 'all' | 'pending' | 'paid' | 'confirmed';
type DateRange = '7d' | '30d' | '90d' | 'all';

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  '7d': 'Últimos 7 días',
  '30d': 'Últimos 30 días',
  '90d': 'Últimos 90 días',
  all: 'Todo',
};

function formatCOP(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount);
}

function getDateRangeStart(range: DateRange): string | undefined {
  if (range === 'all') return undefined;
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

export default function PagosTrabajadoresPage() {
  const { user } = useAuth();
  const supabase = createClient();

  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [workers, setWorkers] = useState<WorkerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [workerFilter, setWorkerFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [showFilters, setShowFilters] = useState(false);

  const [markPayModal, setMarkPayModal] = useState<AdminPayment | null>(null);
  const [payNotes, setPayNotes] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, first_name, last_name, roles!role_id(name)')
        .in('role_id', [
          'a1000000-0000-0000-0000-000000000003',
          'a1000000-0000-0000-0000-000000000004',
        ]);

      if (usersData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setWorkers(usersData.map((u: any) => ({
          id: u.id,
          firstName: u.first_name,
          lastName: u.last_name,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          role: (u.roles as any)?.name || '',
        })));
      }

      let query = supabase
        .from('worker_payments')
        .select(`
          id,
          worker_id,
          concept,
          service_code,
          piece_name,
          amount_cop,
          status,
          paid_at,
          confirmed_at,
          notes,
          created_at,
          orders!worker_payments_order_id_fkey(order_number),
          users!worker_payments_worker_id_fkey(first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (workerFilter !== 'all') query = query.eq('worker_id', workerFilter);

      const startDate = getDateRangeStart(dateRange);
      if (startDate) query = query.gte('created_at', startDate);

      if (statusFilter === 'pending') {
        query = query.eq('status', 'pending');
      } else if (statusFilter === 'paid') {
        query = query.eq('status', 'paid').is('confirmed_at', null);
      } else if (statusFilter === 'confirmed') {
        query = query.eq('status', 'paid').not('confirmed_at', 'is', null);
      }

      const { data: paymentsData } = await query;

      if (paymentsData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setPayments(paymentsData.map((p: any) => {
          const worker = p['users!worker_payments_worker_id_fkey'] ?? p.users;
          const order = p['orders!worker_payments_order_id_fkey'] ?? p.orders;
          return {
            id: p.id,
            workerId: p.worker_id,
            workerName: worker ? `${worker.first_name} ${worker.last_name}` : '—',
            concept: p.concept,
            serviceCode: p.service_code,
            pieceName: p.piece_name,
            amountCop: Number(p.amount_cop),
            status: p.status,
            paidAt: p.paid_at,
            confirmedAt: p.confirmed_at,
            notes: p.notes,
            createdAt: p.created_at,
            orderNumber: order?.order_number,
          };
        }));
      }
    } finally {
      setLoading(false);
    }
  }, [supabase, workerFilter, statusFilter, dateRange]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleMarkAsPaid = async () => {
    if (!markPayModal || !user) return;
    setProcessingId(markPayModal.id);
    try {
      const { error } = await supabase
        .from('worker_payments')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          registered_by_user_id: user.id,
          notes: payNotes || null,
        })
        .eq('id', markPayModal.id);

      if (!error) {
        setMarkPayModal(null);
        setPayNotes('');
        await loadData();
      }
    } finally {
      setProcessingId(null);
    }
  };

  const totalPending = payments.filter((p) => p.status === 'pending').reduce((s, p) => s + p.amountCop, 0);
  const totalPaid = payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amountCop, 0);
  const unconfirmed = payments.filter((p) => p.status === 'paid' && !p.confirmedAt).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold font-display flex items-center gap-2" style={{ color: 'rgba(242,240,237,0.95)' }}>
            <Wallet className="w-5 h-5 text-gold-400" />
            Pagos a Trabajadores
          </h2>
          <p className="text-sm mt-0.5 font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>Gestiona los pagos a joyeros y diseñadores</p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition-colors font-sans-custom"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(242,240,237,0.5)',
          }}
        >
          <Filter className="w-4 h-4" />
          Filtros
          <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs uppercase tracking-wide mb-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Pendiente de pagar</p>
          <p className="text-xl font-bold font-display" style={{ color: 'rgba(251,191,36,0.9)' }}>{formatCOP(totalPending)}</p>
        </div>
        <div className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs uppercase tracking-wide mb-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Pagado (período)</p>
          <p className="text-xl font-bold font-display" style={{ color: 'rgba(52,211,153,0.9)' }}>{formatCOP(totalPaid)}</p>
        </div>
        <div className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs uppercase tracking-wide mb-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Sin confirmar por worker</p>
          <p className={`text-xl font-bold font-display`} style={{ color: unconfirmed > 0 ? 'rgba(96,165,250,0.9)' : 'rgba(242,240,237,0.3)' }}>
            {unconfirmed} pago{unconfirmed !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {showFilters && (
        <div className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs mb-1.5 block font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Trabajador</label>
              <select
                value={workerFilter}
                onChange={(e) => setWorkerFilter(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm font-sans-custom focus:outline-none"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(242,240,237,0.7)',
                }}
              >
                <option value="all">Todos</option>
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>{w.firstName} {w.lastName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs mb-1.5 block font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Estado</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="w-full rounded-lg px-3 py-2 text-sm font-sans-custom focus:outline-none"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(242,240,237,0.7)',
                }}
              >
                <option value="all">Todos</option>
                <option value="pending">Pendiente de pago</option>
                <option value="paid">Pagado (sin confirmar)</option>
                <option value="confirmed">Confirmados</option>
              </select>
            </div>
            <div>
              <label className="text-xs mb-1.5 block font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Período</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRange)}
                className="w-full rounded-lg px-3 py-2 text-sm font-sans-custom focus:outline-none"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(242,240,237,0.7)',
                }}
              >
                {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map((r) => (
                  <option key={r} value={r}>{DATE_RANGE_LABELS[r]}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin h-8 w-8 border-2 border-gold-500 border-t-transparent rounded-full" />
        </div>
      ) : payments.length === 0 ? (
        <div className="text-center py-16 bg-charcoal-800 rounded-lg border border-white/5">
          <Wallet className="w-12 h-12 mx-auto mb-3" style={{ color: 'rgba(242,240,237,0.2)' }} />
          <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>No hay pagos en este período</p>
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide font-sans-custom" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'rgba(242,240,237,0.4)' }}>
                  <th className="text-left px-4 py-3">Trabajador</th>
                  <th className="text-left px-4 py-3">Servicio / Pieza</th>
                  <th className="text-left px-4 py-3">Pedido</th>
                  <th className="text-right px-4 py-3">Monto</th>
                  <th className="text-left px-4 py-3">Estado</th>
                  <th className="text-left px-4 py-3">Confirmado</th>
                  <th className="text-left px-4 py-3">Fecha</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {payments.map((payment) => (
                  <tr key={payment.id} className="transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td className="px-4 py-3 font-medium font-sans-custom" style={{ color: 'rgba(242,240,237,0.8)' }}>{payment.workerName}</td>
                    <td className="px-4 py-3">
                      <p className="font-sans-custom" style={{ color: 'rgba(242,240,237,0.7)' }}>{payment.concept}</p>
                      {payment.pieceName && (
                        <p className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>{payment.pieceName}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>{payment.orderNumber || '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold font-sans-custom" style={{ color: 'rgba(212,175,55,0.9)' }}>
                      {formatCOP(payment.amountCop)}
                    </td>
                    <td className="px-4 py-3">
                      {payment.status === 'pending' ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-sans-custom" style={{ background: 'rgba(251,191,36,0.1)', color: 'rgba(251,191,36,0.8)' }}>
                          <Clock className="w-3 h-3" /> Pendiente
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-sans-custom" style={{ background: 'rgba(52,211,153,0.1)', color: 'rgba(52,211,153,0.8)' }}>
                          <CheckCircle2 className="w-3 h-3" /> Pagado
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {payment.confirmedAt ? (
                        <span className="text-xs flex items-center gap-1 font-sans-custom" style={{ color: 'rgba(52,211,153,0.8)' }}>
                          <CheckCircle2 className="w-3 h-3" />
                          {new Date(payment.confirmedAt).toLocaleDateString('es-CO')}
                        </span>
                      ) : payment.status === 'paid' ? (
                        <span className="text-xs flex items-center gap-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>
                          <AlertCircle className="w-3 h-3" /> Pendiente
                        </span>
                      ) : (
                        <span className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.2)' }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>
                      {new Date(payment.createdAt).toLocaleDateString('es-CO')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {payment.status === 'pending' && (
                        <button
                          onClick={() => setMarkPayModal(payment)}
                          className="text-xs px-3 py-1.5 rounded-lg transition-colors font-semibold font-sans-custom"
                          style={{
                            background: 'rgba(212,175,55,0.1)',
                            border: '1px solid rgba(212,175,55,0.2)',
                            color: 'rgba(212,175,55,0.9)',
                          }}
                        >
                          Registrar pago
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    {markPayModal && (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
        <div className="rounded-xl p-6 w-full max-w-md shadow-2xl" style={{ background: 'rgba(20,20,20,0.95)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold font-display" style={{ color: 'rgba(242,240,237,0.95)' }}>Registrar pago</h3>
            <button
              onClick={() => { setMarkPayModal(null); setPayNotes(''); }}
              className="transition-colors"
              style={{ color: 'rgba(242,240,237,0.4)' }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="rounded-lg p-4 mb-4 space-y-2 text-sm" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex justify-between">
              <span className="font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Trabajador</span>
              <span className="font-medium font-sans-custom" style={{ color: 'rgba(242,240,237,0.8)' }}>{markPayModal.workerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Servicio</span>
              <span className="font-sans-custom" style={{ color: 'rgba(242,240,237,0.7)' }}>{markPayModal.concept}</span>
            </div>
            {markPayModal.pieceName && (
              <div className="flex justify-between">
                <span className="font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Pieza</span>
                <span className="font-sans-custom" style={{ color: 'rgba(242,240,237,0.7)' }}>{markPayModal.pieceName}</span>
              </div>
            )}
            <div className="flex justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
              <span className="font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Monto</span>
              <span className="font-bold text-base font-display" style={{ color: 'rgba(212,175,55,0.9)' }}>{formatCOP(markPayModal.amountCop)}</span>
            </div>
          </div>
          <div className="mb-4">
            <label className="text-xs mb-1.5 block font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Notas (opcional)</label>
            <textarea
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              placeholder="Ej: Transferencia #123, efectivo, etc."
              className="w-full rounded-lg p-3 text-sm font-sans-custom focus:outline-none resize-none"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(242,240,237,0.7)',
              }}
              rows={2}
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setMarkPayModal(null); setPayNotes(''); }}
              className="flex-1 py-2.5 rounded-lg transition-colors text-sm font-sans-custom"
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(242,240,237,0.5)',
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleMarkAsPaid}
              disabled={!!processingId}
              className="flex-1 py-2.5 rounded-lg transition-colors text-sm font-semibold font-sans-custom disabled:opacity-50"
              style={{
                background: 'rgba(212,175,55,0.9)',
                color: 'rgba(8,8,8,0.9)',
              }}
            >
              {processingId ? 'Registrando...' : 'Confirmar pago'}
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}
