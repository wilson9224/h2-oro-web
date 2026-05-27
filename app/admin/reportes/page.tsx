'use client';

import { useState } from 'react';
import { Download, Loader2, Calendar, FileSpreadsheet } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';

const supabase = createClient();

type ReportId = 'orders' | 'assignments' | 'payments' | 'production';
type CsvValue = string | number | boolean | null | undefined;
type CsvRow = CsvValue[];

const reportDate = () => new Date().toISOString().slice(0, 10);

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function csvCell(value: CsvValue) {
  const text = String(value ?? '').replace(/\r?\n/g, ' ');
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: CsvRow[]) {
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(';')).join('\n')}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState<ReportId | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  if (user?.role !== 'admin') {
    return (
      <div className="rounded-2xl p-5 text-sm font-sans-custom" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(242,240,237,0.48)' }}>
        Los reportes globales están reservados para Admin.
      </div>
    );
  }

  const applyDateRange = (query: any, column = 'created_at') => {
    let next = query;
    if (dateFrom) next = next.gte(column, `${dateFrom}T00:00:00`);
    if (dateTo) next = next.lte(column, `${dateTo}T23:59:59`);
    return next;
  };

  const buildOrdersReport = async (): Promise<CsvRow[]> => {
    let query: any = supabase
      .from('orders')
      .select(`
        id,
        order_number,
        type,
        status,
        total_amount_cop,
        currency,
        estimated_delivery_date,
        created_at,
        client:users!orders_client_id_fkey ( first_name, last_name, email ),
        pieces ( id ),
        payments ( id, status, amount_cop )
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    query = applyDateRange(query);
    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return [
      ['Numero', 'Tipo', 'Estado', 'Cliente', 'Email', 'Total COP', 'Moneda', 'Piezas', 'Pagos', 'Entrega Est.', 'Creado'],
      ...((data ?? []) as any[]).map((order) => {
        const client = one<any>(order.client);
        const payments = order.payments ?? [];
        return [
          order.order_number,
          order.type,
          order.status,
          client ? `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim() : '',
          client?.email,
          Number(order.total_amount_cop ?? 0),
          order.currency,
          (order.pieces ?? []).length,
          payments.length,
          formatDate(order.estimated_delivery_date).slice(0, 10),
          formatDate(order.created_at),
        ];
      }),
    ];
  };

  const buildAssignmentsReport = async (): Promise<CsvRow[]> => {
    let query: any = supabase
      .from('work_assignments')
      .select(`
        id,
        stage_code,
        status,
        priority,
        progress_pct,
        created_at,
        started_at,
        completed_at,
        worker:users!work_assignments_worker_id_fkey ( first_name, last_name ),
        workflow_states ( name ),
        pieces!inner (
          name,
          orders!inner ( order_number )
        )
      `)
      .order('created_at', { ascending: false });

    query = applyDateRange(query);
    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return [
      ['Pedido', 'Pieza', 'Trabajador', 'Etapa', 'Estado', 'Prioridad', 'Avance %', 'Asignado', 'Iniciado', 'Completado'],
      ...((data ?? []) as any[]).map((assignment) => {
        const worker = one<any>(assignment.worker);
        const piece = one<any>(assignment.pieces);
        const order = one<any>(piece?.orders);
        const state = one<any>(assignment.workflow_states);
        return [
          order?.order_number,
          piece?.name,
          worker ? `${worker.first_name ?? ''} ${worker.last_name ?? ''}`.trim() : '',
          state?.name ?? assignment.stage_code,
          assignment.status,
          assignment.priority,
          assignment.progress_pct,
          formatDate(assignment.created_at),
          formatDate(assignment.started_at),
          formatDate(assignment.completed_at),
        ];
      }),
    ];
  };

  const buildPaymentsReport = async (): Promise<CsvRow[]> => {
    let query: any = supabase
      .from('payments')
      .select(`
        *,
        order:orders!payments_order_id_fkey ( order_number )
      `)
      .order('created_at', { ascending: false });

    query = applyDateRange(query);
    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return [
      ['Pedido', 'Metodo', 'Monto COP', 'Estado', 'Referencia Wompi', 'Pagado', 'Creado', 'Notas'],
      ...((data ?? []) as any[]).map((payment) => {
        const order = one<any>(payment.order);
        return [
          order?.order_number,
          payment.method ?? payment.payment_method ?? '',
          Number(payment.amount_cop ?? 0),
          payment.status,
          payment.wompi_reference ?? '',
          formatDate(payment.paid_at),
          formatDate(payment.created_at),
          payment.notes ?? '',
        ];
      }),
    ];
  };

  const buildProductionReport = async (): Promise<CsvRow[]> => {
    let query: any = supabase
      .from('pieces')
      .select(`
        id,
        name,
        description,
        sort_order,
        created_at,
        currentState:workflow_states!current_state_id ( code, name, public_label, is_final ),
        orders!inner ( order_number, type, status, created_at ),
        work_assignments (
          stage_code,
          status,
          progress_pct,
          priority,
          created_at,
          completed_at,
          worker:users!work_assignments_worker_id_fkey ( first_name, last_name ),
          workflow_states ( name )
        )
      `)
      .order('created_at', { ascending: false });

    query = applyDateRange(query);
    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return [
      ['Pedido', 'Tipo', 'Estado pedido', 'Pieza', 'Estado pieza', 'Asignaciones', 'Avance promedio %', 'Creado'],
      ...((data ?? []) as any[]).map((piece) => {
        const order = one<any>(piece.orders);
        const currentState = one<any>(piece.currentState);
        const assignments = ((piece.work_assignments ?? []) as any[]).sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
        const averageProgress = assignments.length
          ? Math.round(assignments.reduce((sum, item) => sum + Number(item.progress_pct ?? 0), 0) / assignments.length)
          : 0;
        const assignmentSummary = assignments.map((assignment) => {
          const worker = one<any>(assignment.worker);
          const state = one<any>(assignment.workflow_states);
          const workerName = worker ? `${worker.first_name ?? ''} ${worker.last_name ?? ''}`.trim() : 'Sin trabajador';
          return `${state?.name ?? assignment.stage_code}: ${assignment.status} (${workerName})`;
        }).join(' | ');

        return [
          order?.order_number,
          order?.type,
          order?.status,
          piece.name,
          currentState?.public_label ?? currentState?.name ?? currentState?.code ?? '',
          assignmentSummary,
          averageProgress,
          formatDate(piece.created_at),
        ];
      }),
    ];
  };

  const downloadReport = async (type: ReportId) => {
    setLoading(type);
    try {
      const builders: Record<ReportId, () => Promise<CsvRow[]>> = {
        orders: buildOrdersReport,
        assignments: buildAssignmentsReport,
        payments: buildPaymentsReport,
        production: buildProductionReport,
      };
      const rows = await builders[type]();
      downloadCsv(`${type}-${reportDate()}.csv`, rows);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Error descargando reporte');
    } finally {
      setLoading(null);
    }
  };

  const reports: { id: ReportId; title: string; description: string; icon: typeof FileSpreadsheet }[] = [
    {
      id: 'orders',
      title: 'Reporte de Pedidos',
      description: 'Pedidos con cliente, tipo, estado, montos y fechas',
      icon: FileSpreadsheet,
    },
    {
      id: 'assignments',
      title: 'Reporte de Asignaciones',
      description: 'Trabajos por pieza, encargado, etapa, progreso y estado',
      icon: FileSpreadsheet,
    },
    {
      id: 'payments',
      title: 'Reporte de Pagos',
      description: 'Pagos recibidos, metodos, estados y montos',
      icon: FileSpreadsheet,
    },
    {
      id: 'production',
      title: 'Reporte de Produccion',
      description: 'Piezas, estado actual y avance operativo por asignacion',
      icon: FileSpreadsheet,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold" style={{ color: 'rgba(242,240,237,0.95)' }}>Reportes</h1>
        <p className="text-sm mt-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>Exporta informacion desde Supabase en formato CSV</p>
      </div>

      {/* Date range */}
      <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2 font-sans-custom" style={{ color: 'rgba(242,240,237,0.8)' }}>
          <Calendar size={16} style={{ color: 'rgba(242,240,237,0.3)' }} />
          Rango de fechas (opcional)
        </h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <div>
            <label className="block text-xs mb-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Desde</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 rounded-xl text-sm focus:outline-none transition-all duration-200 font-sans-custom"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(242,240,237,0.85)' }}
            />
          </div>
          <div>
            <label className="block text-xs mb-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Hasta</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 rounded-xl text-sm focus:outline-none transition-all duration-200 font-sans-custom"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(242,240,237,0.85)' }}
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="self-end px-3 py-2 text-xs transition-colors font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(242,240,237,0.8)'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(242,240,237,0.4)'}
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reports.map((report) => (
          <div
            key={report.id}
            className="rounded-2xl p-5 flex flex-col justify-between" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl" style={{ background: 'rgba(212,175,55,0.1)' }}>
                  <report.icon size={18} style={{ color: 'rgba(212,175,55,0.9)' }} />
                </div>
                <h3 className="text-sm font-medium font-sans-custom" style={{ color: 'rgba(242,240,237,0.8)' }}>{report.title}</h3>
              </div>
              <p className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>{report.description}</p>
            </div>
            <button
              onClick={() => downloadReport(report.id)}
              disabled={loading === report.id}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs transition-colors disabled:opacity-50 w-full font-sans-custom"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(242,240,237,0.7)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'}
            >
              {loading === report.id ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Download size={14} />
              )}
              Descargar CSV
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
