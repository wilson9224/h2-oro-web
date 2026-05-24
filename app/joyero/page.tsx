'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Calendar, TrendingUp, Clock, DollarSign, BarChart3, Filter, Wallet, ChevronRight } from 'lucide-react';
import Link from 'next/link';

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
  earnings: number;
}

export default function JoyeroDashboard() {
  const { user } = useAuth();
  const supabase = createClient();
  
  const [stats, setStats] = useState<WorkerStats | null>(null);
  const [stateDistribution, setStateDistribution] = useState<StateDistribution[]>([]);
  const [avgTimes, setAvgTimes] = useState<AvgTime[]>([]);
  const [payments, setPayments] = useState<PaymentSummary | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [pendingConfirmCount, setPendingConfirmCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Date range filter
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showCustomDate, setShowCustomDate] = useState(false);

  // Get date range based on selection
  const getDateRange = () => {
    const now = new Date();
    let start = new Date();
    
    switch (dateRange) {
      case '7d':
        start.setDate(now.getDate() - 7);
        break;
      case '30d':
        start.setDate(now.getDate() - 30);
        break;
      case '90d':
        start.setDate(now.getDate() - 90);
        break;
      case 'custom':
        if (startDate) start = new Date(startDate);
        break;
    }
    
    if (endDate) {
      now.setTime(new Date(endDate).getTime());
    }
    
    return { start, end: now };
  };

  useEffect(() => {
    if (!user) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        const { start, end } = getDateRange();
        
        // Fetch worker stats with date filter
        const query = supabase
          .from('work_assignments')
          .select('status, started_at, completed_at')
          .eq('worker_id', user.id)
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString());

        const { data: statsData } = await query;

        if (statsData) {
          const workerStats: WorkerStats = {
            total: statsData.length,
            pending: statsData.filter(w => w.status === 'assigned' && !w.started_at).length,
            inProgress: statsData.filter(w => w.status === 'in_progress').length,
            completed: statsData.filter(w => w.status === 'completed').length,
          };
          setStats(workerStats);
        }

        // Fetch state distribution with date filter
        const { data: distributionData } = await supabase
          .from('work_assignments')
          .select(`
            stage_code,
            workflow_states!inner(name)
          `)
          .eq('worker_id', user.id)
          .neq('status', 'completed')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString());

        if (distributionData) {
          const distribution = distributionData.reduce((acc: any, item: any) => {
            const existing = acc.find((d: StateDistribution) => d.stageCode === item.stage_code);
            if (existing) {
              existing.count++;
            } else {
              acc.push({
                stageCode: item.stage_code,
                stageName: item.workflow_states.name,
                count: 1
              });
            }
            return acc;
          }, []);
          setStateDistribution(distribution);
        }

        // Fetch average times with date filter
        const { data: avgTimesData } = await supabase
          .from('work_assignments')
          .select(`
            stage_code,
            workflow_states!inner(name),
            started_at,
            completed_at
          `)
          .eq('worker_id', user.id)
          .not('started_at', 'is', null)
          .not('completed_at', 'is', null)
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString());

        if (avgTimesData) {
          const times = avgTimesData.reduce((acc: any, item: any) => {
            const startTime = new Date(item.started_at);
            const endTime = new Date(item.completed_at);
            const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
            
            const existing = acc.find((t: AvgTime) => t.stageCode === item.stage_code);
            if (existing) {
              // Simple average calculation
              existing.avgHours = (existing.avgHours + hours) / 2;
            } else {
              acc.push({
                stageCode: item.stage_code,
                stageName: item.workflow_states.name,
                avgHours: hours
              });
            }
            return acc;
          }, []);
          setAvgTimes(times);
        }

        // Fetch payment summary with date filter
        const { data: paymentsData } = await supabase
          .from('worker_payments')
          .select('amount_cop, status, concept, created_at')
          .eq('worker_id', user.id)
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString());

        if (paymentsData) {
          const summary: PaymentSummary = {
            pendingAmount: paymentsData
              .filter(p => p.status === 'pending')
              .reduce((sum, p) => sum + Number(p.amount_cop), 0),
            paidAmount: paymentsData
              .filter(p => p.status === 'paid')
              .reduce((sum, p) => sum + Number(p.amount_cop), 0),
            bonusAmount: paymentsData
              .filter(p => p.concept === 'bonus')
              .reduce((sum, p) => sum + Number(p.amount_cop), 0),
          };
          setPayments(summary);
        }

        // Fetch count of payments paid but not yet confirmed by worker
        const { count: confirmCount } = await supabase
          .from('worker_payments')
          .select('id', { count: 'exact', head: true })
          .eq('worker_id', user.id)
          .eq('status', 'paid')
          .is('confirmed_at', null);

        setPendingConfirmCount(confirmCount ?? 0);

        // Fetch time series data for charts
        const { data: timeSeriesQuery } = await supabase
          .from('work_assignments')
          .select('completed_at, status')
          .eq('worker_id', user.id)
          .eq('status', 'completed')
          .gte('completed_at', start.toISOString())
          .lte('completed_at', end.toISOString());

        if (timeSeriesQuery) {
          // Group by date
          const groupedData = timeSeriesQuery.reduce((acc: any, item: any) => {
            const date = new Date(item.completed_at).toISOString().split('T')[0];
            const existing = acc.find((d: TimeSeriesData) => d.date === date);
            
            if (existing) {
              existing.completed += 1;
              existing.earnings += 50000; // Average payment per completed task
            } else {
              acc.push({
                date,
                completed: 1,
                earnings: 50000
              });
            }
            return acc;
          }, []);
          
          setTimeSeriesData(groupedData.sort((a: any, b: any) => a.date.localeCompare(b.date)));
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, supabase, dateRange, startDate, endDate]);

  const formatCOP = (amount: number) => {
    return new Intl.NumberFormat('es-CO', { 
      style: 'currency', 
      currency: 'COP', 
      minimumFractionDigits: 0 
    }).format(amount);
  };

  const formatHours = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)} min`;
    }
    return `${hours.toFixed(1)} h`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border border-t-gold-500/80 border-gold-500/10 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Hero greeting banner */}
      <div
        className="relative px-5 pt-6 pb-5 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(212,175,55,0.07) 0%, rgba(212,175,55,0.02) 60%, transparent 100%)',
          borderBottom: '1px solid rgba(212,175,55,0.1)',
        }}
      >
        {/* Ambient glow */}
        <div
          className="absolute top-0 right-0 w-32 h-32 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(212,175,55,0.12) 0%, transparent 70%)',
            filter: 'blur(20px)',
          }}
        />
        <div className="relative z-10">
          <p className="text-[10px] uppercase tracking-[0.25em] font-sans mb-1" style={{ color: 'rgba(212,175,55,0.6)' }}>
            Panel de trabajo
          </p>
          <h1 className="font-display text-2xl font-semibold" style={{ color: 'rgba(242,240,237,0.95)' }}>
            Hola, {user?.firstName}
          </h1>
          <p className="text-xs mt-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>
            Aquí va tu resumen de actividad
          </p>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="px-5">
        <div
          className="rounded-2xl p-1 flex gap-1"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {[
            { value: '7d', label: '7 días' },
            { value: '30d', label: '30 días' },
            { value: '90d', label: '90 días' },
            { value: 'custom', label: 'Custom' }
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => {
                setDateRange(option.value as any);
                setShowCustomDate(option.value === 'custom');
              }}
              className="flex-1 py-2 rounded-xl text-[10px] font-medium uppercase tracking-[0.08em] transition-all duration-300 font-sans-custom"
              style={{
                background: dateRange === option.value ? 'rgba(212,175,55,0.12)' : 'transparent',
                color: dateRange === option.value ? '#D4AF37' : 'rgba(242,240,237,0.35)',
                border: dateRange === option.value ? '1px solid rgba(212,175,55,0.2)' : '1px solid transparent',
              }}
            >
              {option.label}
            </button>
          ))}
        </div>

        {showCustomDate && (
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-[10px] mb-1.5 uppercase tracking-widest font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>Desde</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none transition-colors font-sans-custom"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(242,240,237,0.85)',
                  colorScheme: 'dark',
                }}
              />
            </div>
            <div>
              <label className="block text-[10px] mb-1.5 uppercase tracking-widest font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>Hasta</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none transition-colors font-sans-custom"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(242,240,237,0.85)',
                  colorScheme: 'dark',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Payment confirmation CTA */}
      {pendingConfirmCount > 0 && (
        <div className="px-5">
          <Link
            href="/joyero/pagos"
            className="flex items-center justify-between rounded-2xl p-4 transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.06))',
              border: '1px solid rgba(212,175,55,0.25)',
              boxShadow: '0 4px 24px rgba(212,175,55,0.08)',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.2)' }}
              >
                <Wallet className="w-4 h-4" style={{ color: 'rgba(212,175,55,0.9)' }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'rgba(232,197,71,0.95)' }}>
                  {pendingConfirmCount} pago{pendingConfirmCount !== 1 ? 's' : ''} por confirmar
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: 'rgba(212,175,55,0.5)' }}>Toca para confirmar</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: 'rgba(212,175,55,0.6)' }} />
          </Link>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="px-5 grid grid-cols-2 gap-3">
          {[
            { value: stats.total, label: 'Asignados', icon: BarChart3, color: 'rgba(212,175,55,1)', bg: 'rgba(212,175,55,0.08)', border: 'rgba(212,175,55,0.15)' },
            { value: stats.pending, label: 'Pendientes', icon: Clock, color: 'rgba(251,191,36,1)', bg: 'rgba(251,191,36,0.07)', border: 'rgba(251,191,36,0.14)' },
            { value: stats.inProgress, label: 'En progreso', icon: TrendingUp, color: 'rgba(96,165,250,1)', bg: 'rgba(96,165,250,0.07)', border: 'rgba(96,165,250,0.14)' },
            { value: stats.completed, label: 'Completados', icon: DollarSign, color: 'rgba(52,211,153,1)', bg: 'rgba(52,211,153,0.07)', border: 'rgba(52,211,153,0.14)' },
          ].map(({ value, label, icon: Icon, color, bg, border }) => (
            <div
              key={label}
              className="rounded-2xl p-4"
              style={{
                background: bg,
                border: `1px solid ${border}`,
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${border}` }}
                >
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
              </div>
              <div className="font-display text-3xl font-semibold" style={{ color }}>
                {value}
              </div>
              <div className="text-[10px] uppercase tracking-[0.1em] mt-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Charts + data sections */}
      <div className="px-5 space-y-4 pb-4">
        {/* State Distribution */}
        {stateDistribution.length > 0 && (
          <div
            className="rounded-2xl p-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-3 font-sans-custom"
              style={{ color: 'rgba(242,240,237,0.3)' }}>Tareas activas por tipo</h2>
            <div className="flex flex-wrap gap-2">
              {stateDistribution.map((state) => (
                <div
                  key={state.stageCode}
                  className="flex items-center gap-2 rounded-xl px-3 py-2"
                  style={{
                    background: 'rgba(212,175,55,0.06)',
                    border: '1px solid rgba(212,175,55,0.1)',
                  }}
                >
                  <span className="text-[11px] font-sans-custom" style={{ color: 'rgba(242,240,237,0.55)' }}>
                    {state.stageName}
                  </span>
                  <span
                    className="text-[11px] font-semibold font-mono"
                    style={{ color: 'rgba(212,175,55,0.8)' }}
                  >
                    {state.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Time Series */}
        {timeSeriesData.length > 0 && (
          <div
            className="rounded-2xl p-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <h2 className="font-display text-xs font-semibold uppercase tracking-[0.12em] mb-4"
              style={{ color: 'rgba(242,240,237,0.5)' }}>Trabajos completados</h2>
            <div className="space-y-2">
              {timeSeriesData.slice(-7).map((data) => {
                const maxCompleted = Math.max(...timeSeriesData.map(d => d.completed));
                const pct = maxCompleted > 0 ? (data.completed / maxCompleted) * 100 : 0;
                return (
                  <div key={data.date} className="flex items-center gap-3">
                    <span className="text-[10px] w-16 flex-shrink-0 font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>
                      {new Date(data.date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                    </span>
                    <div className="flex-1 rounded-full h-1.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div
                        className="h-1.5 rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #1d4ed8, #60a5fa)' }}
                      />
                    </div>
                    <span className="text-[10px] w-4 text-right font-sans-custom" style={{ color: 'rgba(242,240,237,0.6)' }}>
                      {data.completed}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Average Times */}
        {avgTimes.length > 0 && (
          <div
            className="rounded-2xl p-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <h2 className="font-display text-xs font-semibold uppercase tracking-[0.12em] mb-4"
              style={{ color: 'rgba(242,240,237,0.5)' }}>Tiempos promedio</h2>
            <div className="space-y-3">
              {avgTimes.map((time) => (
                <div key={time.stageCode}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.6)' }}>{time.stageName}</span>
                    <span className="text-xs font-semibold font-sans-custom" style={{ color: 'rgba(212,175,55,0.9)' }}>{formatHours(time.avgHours)}</span>
                  </div>
                  <div className="w-full rounded-full h-1.5" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: `${Math.min((time.avgHours / 8) * 100, 100)}%`,
                        background: 'linear-gradient(90deg, #B8960F, #E8C547)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payment Summary */}
        {payments && (
          <div
            className="rounded-2xl p-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <h2 className="font-display text-xs font-semibold uppercase tracking-[0.12em] mb-4"
              style={{ color: 'rgba(242,240,237,0.5)' }}>Resumen de pagos</h2>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Pendiente', value: formatCOP(payments.pendingAmount), color: 'rgba(251,191,36,1)' },
                { label: 'Pagado', value: formatCOP(payments.paidAmount), color: 'rgba(52,211,153,1)' },
                { label: 'Bonos', value: payments.bonusAmount > 0 ? formatCOP(payments.bonusAmount) : '$0', color: 'rgba(212,175,55,1)' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="text-[9px] uppercase tracking-[0.1em] mb-2 font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>{label}</div>
                  <div className="text-sm font-display font-semibold leading-tight" style={{ color }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {stateDistribution.length === 0 && avgTimes.length === 0 && (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
          >
            <div className="text-sm mb-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>Sin trabajos en este período</div>
            <div className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.2)' }}>Cambia el rango de fechas</div>
          </div>
        )}
      </div>
    </div>
  );
}
