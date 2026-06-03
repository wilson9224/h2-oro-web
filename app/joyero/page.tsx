'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  DollarSign,
  ImageIcon,
  PlayCircle,
  RotateCcw,
  Wallet,
  Wrench,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';

type DateRange = '7d' | '30d' | '90d' | 'custom';

interface WorkerStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
}

interface StateDistribution {
  stageCode: string;
  stageName: string;
  count: number;
}

interface AvgTime {
  stageCode: string;
  stageName: string;
  avgHours: number;
}

interface PaymentSummary {
  pendingAmount: number;
  paidAmount: number;
  bonusAmount: number;
}

interface TimeSeriesData {
  date: string;
  completed: number;
}

interface FocusAssignment {
  assignmentId: string;
  orderId: string;
  orderNumber: string;
  pieceName: string;
  stageName: string;
  status: string;
  referenceImageUrl: string | null;
}

const SIGNED_URL_TTL_SECONDS = 60 * 60;

async function resolveAttachmentUrl(supabase: ReturnType<typeof createClient>, item: any): Promise<string | null> {
  if (item?.file_url) return item.file_url;
  if (item?.bucket && item?.storage_path) {
    const { data, error } = await supabase.storage
      .from(item.bucket)
      .createSignedUrl(item.storage_path, SIGNED_URL_TTL_SECONDS);

    if (!error && data?.signedUrl) return data.signedUrl;

    if (item.bucket !== 'evidences') {
      const { data: publicData } = supabase.storage.from(item.bucket).getPublicUrl(item.storage_path);
      return publicData.publicUrl;
    }
  }
  return null;
}

function getStatusPriority(status: string) {
  if (status === 'in_progress') return 0;
  if (status === 'paused') return 1;
  if (status === 'assigned') return 2;
  if (status === 'pending') return 3;
  return 4;
}

function getActionLabel(status: string) {
  if (status === 'in_progress') return 'Continuar trabajo';
  if (status === 'paused') return 'Reanudar trabajo';
  return 'Iniciar trabajo';
}

function getActionIcon(status: string) {
  if (status === 'paused') return RotateCcw;
  if (status === 'in_progress') return ArrowRight;
  return PlayCircle;
}

export default function JoyeroDashboard() {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [stats, setStats] = useState<WorkerStats | null>(null);
  const [stateDistribution, setStateDistribution] = useState<StateDistribution[]>([]);
  const [avgTimes, setAvgTimes] = useState<AvgTime[]>([]);
  const [payments, setPayments] = useState<PaymentSummary | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [focusAssignment, setFocusAssignment] = useState<FocusAssignment | null>(null);
  const [pendingConfirmCount, setPendingConfirmCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showCustomDate, setShowCustomDate] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const end = endDate ? new Date(endDate) : new Date();
        end.setHours(23, 59, 59, 999);

        const start = startDate && dateRange === 'custom' ? new Date(startDate) : new Date(end);
        if (dateRange === '7d') start.setDate(end.getDate() - 7);
        if (dateRange === '30d') start.setDate(end.getDate() - 30);
        if (dateRange === '90d') start.setDate(end.getDate() - 90);
        start.setHours(0, 0, 0, 0);

        const [
          statsResult,
          distributionResult,
          avgTimesResult,
          paymentsResult,
          confirmResult,
          timeSeriesResult,
          focusResult,
        ] = await Promise.all([
          supabase
            .from('work_assignments')
            .select('status, started_at, completed_at')
            .eq('worker_id', user.id)
            .gte('created_at', start.toISOString())
            .lte('created_at', end.toISOString()),
          supabase
            .from('work_assignments')
            .select('stage_code, workflow_states!inner(name)')
            .eq('worker_id', user.id)
            .neq('status', 'completed')
            .gte('created_at', start.toISOString())
            .lte('created_at', end.toISOString()),
          supabase
            .from('work_assignments')
            .select('stage_code, workflow_states!inner(name), started_at, completed_at')
            .eq('worker_id', user.id)
            .not('started_at', 'is', null)
            .not('completed_at', 'is', null)
            .gte('created_at', start.toISOString())
            .lte('created_at', end.toISOString()),
          supabase
            .from('worker_payments')
            .select('amount_cop, status, concept, created_at')
            .eq('worker_id', user.id)
            .gte('created_at', start.toISOString())
            .lte('created_at', end.toISOString()),
          supabase
            .from('worker_payments')
            .select('id', { count: 'exact', head: true })
            .eq('worker_id', user.id)
            .eq('status', 'paid')
            .is('confirmed_at', null),
          supabase
            .from('work_assignments')
            .select('completed_at, status')
            .eq('worker_id', user.id)
            .eq('status', 'completed')
            .gte('completed_at', start.toISOString())
            .lte('completed_at', end.toISOString()),
          supabase
            .from('work_assignments')
            .select(`
              id,
              status,
              priority,
              created_at,
              workflow_states!inner(name),
              pieces!inner(
                name,
                orders!inner(id, order_number)
              )
            `)
            .eq('worker_id', user.id)
            .in('status', ['assigned', 'pending', 'in_progress', 'paused'])
            .order('priority', { ascending: true })
            .order('created_at', { ascending: true })
            .limit(8),
        ]);

        const statsData = statsResult.data ?? [];
        setStats({
          total: statsData.length,
          pending: statsData.filter((w: any) => (w.status === 'assigned' || w.status === 'pending') && !w.started_at).length,
          inProgress: statsData.filter((w: any) => w.status === 'in_progress' || w.status === 'paused').length,
          completed: statsData.filter((w: any) => w.status === 'completed').length,
        });

        const distribution = (distributionResult.data ?? []).reduce((acc: StateDistribution[], item: any) => {
          const stageName = item.workflow_states?.name ?? 'Sin etapa';
          const existing = acc.find(d => d.stageCode === item.stage_code);
          if (existing) {
            existing.count += 1;
          } else {
            acc.push({ stageCode: item.stage_code, stageName, count: 1 });
          }
          return acc;
        }, []);
        setStateDistribution(distribution);

        const avgMap = new Map<string, { stageName: string; totalHours: number; count: number }>();
        (avgTimesResult.data ?? []).forEach((item: any) => {
          const hours = (new Date(item.completed_at).getTime() - new Date(item.started_at).getTime()) / 3600000;
          const current = avgMap.get(item.stage_code);
          if (current) {
            current.totalHours += hours;
            current.count += 1;
          } else {
            avgMap.set(item.stage_code, {
              stageName: item.workflow_states?.name ?? 'Sin etapa',
              totalHours: hours,
              count: 1,
            });
          }
        });
        setAvgTimes(Array.from(avgMap.entries()).map(([stageCode, value]) => ({
          stageCode,
          stageName: value.stageName,
          avgHours: value.totalHours / value.count,
        })));

        const paymentsData = paymentsResult.data ?? [];
        setPayments({
          pendingAmount: paymentsData
            .filter((p: any) => p.status === 'pending')
            .reduce((sum: number, p: any) => sum + Number(p.amount_cop), 0),
          paidAmount: paymentsData
            .filter((p: any) => p.status === 'paid')
            .reduce((sum: number, p: any) => sum + Number(p.amount_cop), 0),
          bonusAmount: paymentsData
            .filter((p: any) => p.concept === 'bonus')
            .reduce((sum: number, p: any) => sum + Number(p.amount_cop), 0),
        });

        setPendingConfirmCount(confirmResult.count ?? 0);

        const groupedData = (timeSeriesResult.data ?? []).reduce((acc: TimeSeriesData[], item: any) => {
          if (!item.completed_at) return acc;
          const date = new Date(item.completed_at).toISOString().split('T')[0];
          const existing = acc.find(d => d.date === date);
          if (existing) {
            existing.completed += 1;
          } else {
            acc.push({ date, completed: 1 });
          }
          return acc;
        }, []);
        setTimeSeriesData(groupedData.sort((a, b) => a.date.localeCompare(b.date)));

        const focusRows = [...(focusResult.data ?? [])].sort((a: any, b: any) => {
          const statusDiff = getStatusPriority(a.status) - getStatusPriority(b.status);
          if (statusDiff !== 0) return statusDiff;
          return (a.priority ?? 999) - (b.priority ?? 999);
        });

        const focus = focusRows[0] as any | undefined;
        if (!focus) {
          setFocusAssignment(null);
        } else {
          const piece = Array.isArray(focus.pieces) ? focus.pieces[0] : focus.pieces;
          const order = Array.isArray(piece?.orders) ? piece.orders[0] : piece?.orders;
          let referenceImageUrl: string | null = null;

          if (order?.id) {
            const { data: imageRows } = await supabase
              .from('file_attachments')
              .select('id, file_name, file_url, bucket, storage_path')
              .eq('entity_type', 'order')
              .eq('entity_id', order.id)
              .eq('file_type', 'image')
              .order('created_at', { ascending: true })
              .limit(1);
            referenceImageUrl = await resolveAttachmentUrl(supabase, imageRows?.[0]);
          }

          setFocusAssignment({
            assignmentId: focus.id,
            orderId: order?.id ?? '',
            orderNumber: order?.order_number ?? 'Pedido',
            pieceName: piece?.name ?? 'Pieza',
            stageName: focus.workflow_states?.name ?? 'Trabajo asignado',
            status: focus.status,
            referenceImageUrl,
          });
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, supabase, dateRange, startDate, endDate]);

  const formatCOP = (amount: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);

  const formatHours = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)} min`;
    return `${hours.toFixed(1)} h`;
  };

  if (loading) {
    return (
      <div className="space-y-4 px-5 pt-6">
        <div className="h-36 rounded-3xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-24 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
          <div className="h-24 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
        </div>
        <div className="h-40 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
      </div>
    );
  }

  const ActionIcon = getActionIcon(focusAssignment?.status ?? '');

  return (
    <div className="min-w-0 space-y-5 pb-4">
      <section
        className="relative px-5 pt-6 pb-5 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(212,175,55,0.025) 55%, transparent 100%)',
          borderBottom: '1px solid rgba(212,175,55,0.1)',
        }}
      >
        <div className="relative z-10 space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] font-sans-custom mb-1" style={{ color: 'rgba(212,175,55,0.65)' }}>
              Trabajo de hoy
            </p>
            <h1 className="font-display text-2xl font-semibold leading-tight" style={{ color: 'rgba(242,240,237,0.95)' }}>
              Hola, {user?.firstName}
            </h1>
          </div>

          {focusAssignment ? (
            <Link
              href={`/joyero/trabajo/${focusAssignment.assignmentId}`}
              className="block min-w-0 rounded-3xl p-3 transition-transform active:scale-[0.99]"
              style={{
                background: 'rgba(12,12,12,0.72)',
                border: '1px solid rgba(212,175,55,0.16)',
                boxShadow: '0 18px 44px rgba(0,0,0,0.34)',
              }}
            >
              <div className="flex min-w-0 gap-3">
                <div className="h-24 w-20 flex-shrink-0 overflow-hidden rounded-2xl min-[360px]:w-24" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  {focusAssignment.referenceImageUrl ? (
                    <img
                      src={focusAssignment.referenceImageUrl}
                      alt={`Referencia de ${focusAssignment.pieceName}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-7 h-7" style={{ color: 'rgba(212,175,55,0.35)' }} />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 py-0.5">
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-[11px] font-semibold font-mono" style={{ color: 'rgba(212,175,55,0.9)' }}>
                      {focusAssignment.orderNumber}
                    </span>
                    <span className="text-[10px] px-2 py-1 rounded-full font-sans-custom" style={{ background: 'rgba(96,165,250,0.12)', color: 'rgba(96,165,250,0.9)' }}>
                      {focusAssignment.status === 'paused' ? 'Pausado' : focusAssignment.status === 'in_progress' ? 'Activo' : 'Pendiente'}
                    </span>
                  </div>
                  <h2 className="font-display text-base font-semibold mt-2 truncate" style={{ color: 'rgba(242,240,237,0.92)' }}>
                    {focusAssignment.pieceName}
                  </h2>
                  <p className="text-sm mt-0.5 truncate font-sans-custom" style={{ color: 'rgba(242,240,237,0.48)' }}>
                    {focusAssignment.stageName}
                  </p>
                  <div className="mt-3 inline-flex items-center gap-2 text-xs font-semibold font-sans-custom" style={{ color: '#D4AF37' }}>
                    <ActionIcon className="w-4 h-4" />
                    {getActionLabel(focusAssignment.status)}
                  </div>
                </div>
              </div>
            </Link>
          ) : (
            <div
              className="rounded-3xl p-5"
              style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <CheckCircle2 className="w-6 h-6 mb-3" style={{ color: 'rgba(52,211,153,0.8)' }} />
              <h2 className="font-display text-lg font-semibold" style={{ color: 'rgba(242,240,237,0.9)' }}>Sin trabajos activos</h2>
              <p className="text-sm mt-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.42)' }}>
                Cuando te asignen una etapa aparecerá aquí para empezar rápido.
              </p>
            </div>
          )}
        </div>
      </section>

      {pendingConfirmCount > 0 && (
        <div className="px-5">
          <Link
            href="/joyero/pagos"
            className="flex items-center justify-between rounded-2xl p-4 transition-transform active:scale-[0.99]"
            style={{
              background: 'linear-gradient(135deg, rgba(212,175,55,0.13), rgba(212,175,55,0.06))',
              border: '1px solid rgba(212,175,55,0.25)',
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(212,175,55,0.15)' }}>
                <Wallet className="w-5 h-5" style={{ color: 'rgba(212,175,55,0.9)' }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'rgba(232,197,71,0.95)' }}>
                  {pendingConfirmCount} pago{pendingConfirmCount !== 1 ? 's' : ''} por confirmar
                </p>
                <p className="text-xs mt-0.5 font-sans-custom" style={{ color: 'rgba(212,175,55,0.55)' }}>
                  Confirma cuando recibas el dinero
                </p>
              </div>
            </div>
            <ChevronRightIcon />
          </Link>
        </div>
      )}

      {stats && (
        <section className="px-5">
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: stats.pending, label: 'Pendientes', icon: Clock, color: 'rgba(251,191,36,1)', href: '/joyero/pedidos' },
              { value: stats.inProgress, label: 'En curso', icon: Wrench, color: 'rgba(96,165,250,1)', href: '/joyero/pedidos' },
              { value: stats.completed, label: 'Completados', icon: CheckCircle2, color: 'rgba(52,211,153,1)', href: '/joyero/pedidos' },
              { value: stats.total, label: 'Asignados', icon: BarChart3, color: 'rgba(212,175,55,1)', href: '/joyero/pedidos' },
            ].map(({ value, label, icon: Icon, color, href }) => (
              <Link
                key={label}
                href={href}
                className="rounded-2xl p-4 transition-transform active:scale-[0.99]"
                style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-center justify-between">
                  <Icon className="w-4 h-4" style={{ color }} />
                  <span className="font-display text-2xl font-semibold" style={{ color }}>{value}</span>
                </div>
                <p className="text-xs mt-2 font-sans-custom" style={{ color: 'rgba(242,240,237,0.45)' }}>{label}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="px-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold" style={{ color: 'rgba(242,240,237,0.9)' }}>Resumen</h2>
            <p className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>Actividad y pagos del período</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-2xl p-1 min-[420px]:grid-cols-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {[
            { value: '7d', label: '7 días' },
            { value: '30d', label: '30 días' },
            { value: '90d', label: '90 días' },
            { value: 'custom', label: 'Personal' },
          ].map(option => (
            <button
              key={option.value}
              onClick={() => {
                setDateRange(option.value as DateRange);
                setShowCustomDate(option.value === 'custom');
              }}
              className="py-2 rounded-xl text-[11px] font-medium transition-all duration-200 font-sans-custom"
              style={{
                background: dateRange === option.value ? 'rgba(212,175,55,0.12)' : 'transparent',
                color: dateRange === option.value ? '#D4AF37' : 'rgba(242,240,237,0.42)',
                border: dateRange === option.value ? '1px solid rgba(212,175,55,0.2)' : '1px solid transparent',
              }}
            >
              {option.label}
            </button>
          ))}
        </div>

        {showCustomDate && (
          <div className="grid grid-cols-2 gap-3">
            <DateInput label="Desde" value={startDate} onChange={setStartDate} />
            <DateInput label="Hasta" value={endDate} onChange={setEndDate} />
          </div>
        )}

        {payments && (
          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display text-sm font-semibold" style={{ color: 'rgba(242,240,237,0.85)' }}>Pagos</h3>
                <p className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.32)' }}>Valores reales registrados</p>
              </div>
              <DollarSign className="w-4 h-4" style={{ color: 'rgba(212,175,55,0.75)' }} />
            </div>
            <div className="grid grid-cols-1 gap-2 min-[430px]:grid-cols-3">
              {[
                { label: 'Por cobrar', value: formatCOP(payments.pendingAmount), color: 'rgba(251,191,36,1)' },
                { label: 'Pagado', value: formatCOP(payments.paidAmount), color: 'rgba(52,211,153,1)' },
                { label: 'Bonos', value: formatCOP(payments.bonusAmount), color: 'rgba(212,175,55,1)' },
              ].map(({ label, value, color }) => (
                <div key={label} className="min-w-0 rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.035)' }}>
                  <p className="text-[11px] mb-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.38)' }}>{label}</p>
                  <p className="truncate text-sm font-display font-semibold leading-tight" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {stateDistribution.length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 className="font-display text-sm font-semibold mb-3" style={{ color: 'rgba(242,240,237,0.85)' }}>Tareas activas por tipo</h3>
            <div className="flex flex-wrap gap-2">
              {stateDistribution.map(state => (
                <div key={state.stageCode} className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'rgba(212,175,55,0.06)' }}>
                  <span className="min-w-0 truncate text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.58)' }}>{state.stageName}</span>
                  <span className="text-xs font-semibold font-mono" style={{ color: 'rgba(212,175,55,0.85)' }}>{state.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {timeSeriesData.length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 className="font-display text-sm font-semibold mb-4" style={{ color: 'rgba(242,240,237,0.85)' }}>Trabajos completados</h3>
            <div className="space-y-2.5">
              {timeSeriesData.slice(-7).map(data => {
                const maxCompleted = Math.max(...timeSeriesData.map(d => d.completed));
                const pct = maxCompleted > 0 ? (data.completed / maxCompleted) * 100 : 0;
                return (
                  <div key={data.date} className="flex items-center gap-3">
                    <span className="w-14 flex-shrink-0 text-xs font-sans-custom min-[360px]:w-16" style={{ color: 'rgba(242,240,237,0.42)' }}>
                      {new Date(data.date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                    </span>
                    <div className="flex-1 rounded-full h-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #B8960F, #E8C547)' }} />
                    </div>
                    <span className="w-5 shrink-0 text-right text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.65)' }}>{data.completed}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {avgTimes.length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 className="font-display text-sm font-semibold mb-4" style={{ color: 'rgba(242,240,237,0.85)' }}>Tiempos promedio</h3>
            <div className="space-y-3">
              {avgTimes.map(time => (
                <div key={time.stageCode}>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.58)' }}>{time.stageName}</span>
                    <span className="shrink-0 text-sm font-semibold font-sans-custom" style={{ color: 'rgba(212,175,55,0.9)' }}>{formatHours(time.avgHours)}</span>
                  </div>
                  <div className="w-full rounded-full h-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-2 rounded-full" style={{ width: `${Math.min((time.avgHours / 8) * 100, 100)}%`, background: 'linear-gradient(90deg, #B8960F, #E8C547)' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="block text-[11px] mb-1.5 font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>{label}</span>
      <input
        type="date"
        value={value}
        onChange={event => onChange(event.target.value)}
        className="w-full px-3 py-3 rounded-xl text-sm focus:outline-none font-sans-custom"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'rgba(242,240,237,0.85)',
          colorScheme: 'dark',
        }}
      />
    </label>
  );
}

function ChevronRightIcon() {
  return <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(212,175,55,0.62)' }} />;
}
