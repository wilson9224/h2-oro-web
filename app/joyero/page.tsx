'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Calendar, TrendingUp, Clock, DollarSign, BarChart3, Filter } from 'lucide-react';

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
        let query = supabase
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
        <div className="animate-spin h-8 w-8 border-2 border-gold-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gold-500">Dashboard</h1>
        <p className="text-charcoal-400">Resumen de tu trabajo</p>
      </div>

      {/* Date Range Filter */}
      <div className="bg-charcoal-900 rounded-lg p-4 border border-charcoal-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gold-500" />
            <span className="text-sm font-medium text-gold-500">Filtro de tiempo</span>
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { value: '7d', label: '7 días' },
            { value: '30d', label: '30 días' },
            { value: '90d', label: '90 días' },
            { value: 'custom', label: 'Personalizado' }
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => {
                setDateRange(option.value as any);
                setShowCustomDate(option.value === 'custom');
              }}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                dateRange === option.value
                  ? 'bg-gold-500 text-charcoal-900'
                  : 'bg-charcoal-800 text-charcoal-300 hover:bg-charcoal-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {showCustomDate && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-charcoal-400 mb-1">Desde</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-charcoal-800 border border-charcoal-700 rounded-lg text-charcoal-300 focus:border-gold-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-charcoal-400 mb-1">Hasta</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-charcoal-800 border border-charcoal-700 rounded-lg text-charcoal-300 focus:border-gold-500 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-charcoal-900 rounded-lg p-4 border border-charcoal-800">
            <div className="flex items-center justify-between mb-2">
              <div className="text-3xl font-bold text-gold-500">{stats.total}</div>
              <BarChart3 className="w-5 h-5 text-gold-500" />
            </div>
            <div className="text-sm text-charcoal-400">Asignados</div>
          </div>
          <div className="bg-charcoal-900 rounded-lg p-4 border border-charcoal-800">
            <div className="flex items-center justify-between mb-2">
              <div className="text-3xl font-bold text-yellow-500">{stats.pending}</div>
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="text-sm text-charcoal-400">Pendientes</div>
          </div>
          <div className="bg-charcoal-900 rounded-lg p-4 border border-charcoal-800">
            <div className="flex items-center justify-between mb-2">
              <div className="text-3xl font-bold text-blue-500">{stats.inProgress}</div>
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-sm text-charcoal-400">En progreso</div>
          </div>
          <div className="bg-charcoal-900 rounded-lg p-4 border border-charcoal-800">
            <div className="flex items-center justify-between mb-2">
              <div className="text-3xl font-bold text-green-500">{stats.completed}</div>
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-sm text-charcoal-400">Completados</div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* State Distribution Chart */}
        {stateDistribution.length > 0 && (
          <div className="bg-charcoal-900 rounded-lg p-4 border border-charcoal-800">
            <h2 className="text-lg font-semibold text-gold-500 mb-4">Distribución por estado</h2>
            <div className="space-y-3">
              {stateDistribution.map((state) => {
                const maxCount = Math.max(...stateDistribution.map(d => d.count));
                const percentage = (state.count / maxCount) * 100;
                
                return (
                  <div key={state.stageCode} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-charcoal-300 text-sm">{state.stageName}</span>
                      <span className="text-charcoal-400 text-sm font-medium">{state.count}</span>
                    </div>
                    <div className="w-full bg-charcoal-800 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-gold-600 to-gold-500 h-3 rounded-full transition-all duration-500" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Time Series Chart */}
        {timeSeriesData.length > 0 && (
          <div className="bg-charcoal-900 rounded-lg p-4 border border-charcoal-800">
            <h2 className="text-lg font-semibold text-gold-500 mb-4">Trabajos completados</h2>
            <div className="space-y-2">
              {timeSeriesData.slice(-7).map((data, index) => {
                const maxCompleted = Math.max(...timeSeriesData.map(d => d.completed));
                const height = (data.completed / maxCompleted) * 100;
                
                return (
                  <div key={data.date} className="flex items-end space-x-2 h-16">
                    <div className="flex-1 flex items-end space-x-1">
                      <div 
                        className="bg-gradient-to-t from-blue-600 to-blue-500 rounded-t transition-all duration-500"
                        style={{ height: `${height}%`, width: '20px' }}
                      />
                      <div className="text-xs text-charcoal-400 flex-1">
                        {new Date(data.date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                    <div className="text-xs text-charcoal-300 w-8 text-right">
                      {data.completed}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Average Times */}
      {avgTimes.length > 0 && (
        <div className="bg-charcoal-900 rounded-lg p-4 border border-charcoal-800">
          <h2 className="text-lg font-semibold text-gold-500 mb-4">Tiempos promedio por etapa</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {avgTimes.map((time) => (
              <div key={time.stageCode} className="bg-charcoal-800 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-charcoal-300 text-sm">{time.stageName}</span>
                  <span className="text-gold-500 font-medium">{formatHours(time.avgHours)}</span>
                </div>
                <div className="mt-2 w-full bg-charcoal-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-gold-600 to-gold-500 h-2 rounded-full" 
                    style={{ width: `${Math.min((time.avgHours / 8) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Summary */}
      {payments && (
        <div className="bg-charcoal-900 rounded-lg p-4 border border-charcoal-800">
          <h2 className="text-lg font-semibold text-gold-500 mb-4">Resumen de pagos</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-charcoal-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="w-4 h-4 text-yellow-500" />
                <span className="text-charcoal-400 text-sm">Pendiente</span>
              </div>
              <div className="text-xl font-bold text-yellow-500">{formatCOP(payments.pendingAmount)}</div>
            </div>
            <div className="bg-charcoal-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="w-4 h-4 text-green-500" />
                <span className="text-charcoal-400 text-sm">Pagado</span>
              </div>
              <div className="text-xl font-bold text-green-500">{formatCOP(payments.paidAmount)}</div>
            </div>
            <div className="bg-charcoal-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="w-4 h-4 text-gold-500" />
                <span className="text-charcoal-400 text-sm">Bonificaciones</span>
              </div>
              <div className="text-xl font-bold text-gold-500">
                {payments.bonusAmount > 0 ? formatCOP(payments.bonusAmount) : '$0'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty states */}
      {stateDistribution.length === 0 && avgTimes.length === 0 && (
        <div className="bg-charcoal-900 rounded-lg p-8 border border-charcoal-800 text-center">
          <div className="text-charcoal-400 mb-2">No tienes trabajos asignados en este período</div>
          <div className="text-charcoal-500 text-sm">Intenta con un rango de fechas diferente</div>
        </div>
      )}
    </div>
  );
}
