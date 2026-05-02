'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Users,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from 'lucide-react';
import { fetchAccountingDashboard } from '@/lib/accounting/queries';
import type { AccountingDashboardData } from '@/lib/accounting/types';
import { EXPENSE_CATEGORY_LABELS } from '@/lib/accounting/types';

type Period = '7d' | '30d' | '90d' | 'month' | 'year';

const PERIOD_LABELS: Record<Period, string> = {
  '7d': '7 días',
  '30d': '30 días',
  '90d': '90 días',
  month: 'Este mes',
  year: 'Este año',
};

function getPeriodDates(period: Period): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString();
  let from: Date;

  switch (period) {
    case '7d':
      from = new Date(now); from.setDate(from.getDate() - 7); break;
    case '30d':
      from = new Date(now); from.setDate(from.getDate() - 30); break;
    case '90d':
      from = new Date(now); from.setDate(from.getDate() - 90); break;
    case 'month':
      from = new Date(now.getFullYear(), now.getMonth(), 1); break;
    case 'year':
      from = new Date(now.getFullYear(), 0, 1); break;
  }

  return { from: from.toISOString(), to };
}

function formatCOP(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function MarginBadge({ value }: { value: number }) {
  const isPositive = value >= 0;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full font-sans-custom ${
      isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
    }`}>
      {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {formatCOP(Math.abs(value))}
    </span>
  );
}

export default function ContabilidadDashboardPage() {
  const [period, setPeriod] = useState<Period>('30d');
  const [data, setData] = useState<AccountingDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { from, to } = getPeriodDates(period);
      const result = await fetchAccountingDashboard(from, to);
      setData(result);
    } catch (e) {
      setError('Error cargando datos. Intenta nuevamente.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const maxBar = data
    ? Math.max(...data.cashFlowByWeek.flatMap((w) => [w.ingresos, w.egresos]), 1)
    : 1;

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 rounded-lg p-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors font-sans-custom"
              style={{
                background: period === p ? 'rgba(212,175,55,0.12)' : 'transparent',
                color: period === p ? 'rgba(212,175,55,0.9)' : 'rgba(242,240,237,0.4)',
                border: period === p ? '1px solid rgba(212,175,55,0.2)' : '1px solid transparent',
              }}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 text-sm font-sans-custom transition-colors"
          style={{ color: 'rgba(242,240,237,0.4)' }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 text-sm flex items-center gap-2 font-sans-custom">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {loading && !data ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-2 border-gold-500 border-t-transparent rounded-full" />
        </div>
      ) : data ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase tracking-wide font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Ingresos</span>
                <TrendingUp size={16} className="text-emerald-400" />
              </div>
              <p className="text-2xl font-bold font-display" style={{ color: 'rgba(52,211,153,0.9)' }}>{formatCOP(data.kpis.ingresos)}</p>
              <p className="text-xs mt-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>{data.kpis.pagosCount} cobros completados</p>
            </div>

            <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase tracking-wide font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Egresos Trabajadores</span>
                <Users size={16} className="text-blue-400" />
              </div>
              <p className="text-2xl font-bold font-display" style={{ color: 'rgba(96,165,250,0.9)' }}>{formatCOP(data.kpis.egresosTrabajadores)}</p>
              {data.kpis.pagosPendientesTrabajadores > 0 && (
                <p className="text-xs mt-1 flex items-center gap-1 font-sans-custom" style={{ color: 'rgba(251,191,36,0.8)' }}>
                  <AlertTriangle size={11} />
                  {formatCOP(data.kpis.pagosPendientesTrabajadores)} pendiente de pago
                </p>
              )}
            </div>

            <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase tracking-wide font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Egresos Materiales</span>
                <Package size={16} className="text-amber-400" />
              </div>
              <p className="text-2xl font-bold font-display" style={{ color: 'rgba(251,191,36,0.9)' }}>{formatCOP(data.kpis.egresosMateriales)}</p>
              <p className="text-xs mt-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>Compras de inventario</p>
            </div>

            <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase tracking-wide font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Gastos Operativos</span>
                <TrendingDown size={16} className="text-rose-400" />
              </div>
              <p className="text-2xl font-bold font-display" style={{ color: 'rgba(244,63,94,0.9)' }}>{formatCOP(data.kpis.egresosGastos)}</p>
              <p className="text-xs mt-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>Arriendo, servicios, etc.</p>
            </div>

            <div className="rounded-xl p-5" style={{ background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.14)' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase tracking-wide font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Margen Bruto</span>
                <DollarSign size={16} className="text-gold-400" />
              </div>
              <p className={`text-2xl font-bold font-display ${data.kpis.margenBruto >= 0 ? '' : ''}`} style={{ color: data.kpis.margenBruto >= 0 ? 'rgba(212,175,55,0.9)' : 'rgba(248,113,113,0.9)' }}>
                {formatCOP(data.kpis.margenBruto)}
              </p>
              <p className="text-xs mt-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>Ingresos − Trabajadores − Materiales</p>
            </div>

            <div className="rounded-xl p-5" style={{ background: 'rgba(212,175,55,0.07)', border: '1px solid rgba(212,175,55,0.14)' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase tracking-wide font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Margen Neto Est.</span>
                <DollarSign size={16} className="text-gold-400" />
              </div>
              <p className={`text-2xl font-bold font-display`} style={{ color: data.kpis.margenNeto >= 0 ? 'rgba(212,175,55,0.85)' : 'rgba(248,113,113,0.9)' }}>
                {formatCOP(data.kpis.margenNeto)}
              </p>
              <p className="text-xs mt-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>Margen bruto − Gastos operativos</p>
            </div>
          </div>

          {/* Charts + recent activity */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Bar chart */}
            <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-sm font-medium font-display mb-4" style={{ color: 'rgba(242,240,237,0.8)' }}>Flujo de caja semanal</h3>
              {data.cashFlowByWeek.length === 0 ? (
                <p className="text-sm text-center py-8 font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>Sin datos en este período</p>
              ) : (
                <div className="flex items-end gap-3 h-36 overflow-x-auto pb-2">
                  {data.cashFlowByWeek.map((w, i) => (
                    <div key={i} className="flex-1 min-w-[48px] flex flex-col items-center gap-1">
                      <div className="w-full flex items-end gap-0.5 h-28">
                        <div
                          className="flex-1 rounded-t" style={{ background: 'rgba(52,211,153,0.4)', height: `${(w.ingresos / maxBar) * 100}%` }}
                          title={`Ingresos: ${formatCOP(w.ingresos)}`}
                        />
                        <div
                          className="flex-1 rounded-t" style={{ background: 'rgba(244,63,94,0.4)', height: `${(w.egresos / maxBar) * 100}%` }}
                          title={`Egresos: ${formatCOP(w.egresos)}`}
                        />
                      </div>
                      <span className="text-[10px] whitespace-nowrap font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>{w.week}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-4 mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <span className="flex items-center gap-1.5 text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>
                  <span className="w-3 h-3 rounded-sm inline-block" style={{ background: 'rgba(52,211,153,0.4)' }} /> Ingresos
                </span>
                <span className="flex items-center gap-1.5 text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>
                  <span className="w-3 h-3 rounded-sm inline-block" style={{ background: 'rgba(244,63,94,0.4)' }} /> Egresos
                </span>
              </div>
            </div>

            {/* Gastos por categoría */}
            <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-sm font-medium font-display mb-4" style={{ color: 'rgba(242,240,237,0.8)' }}>Gastos por categoría</h3>
              {data.kpis.gastosPorCategoria.length === 0 ? (
                <p className="text-sm text-center py-8 font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>Sin gastos registrados</p>
              ) : (
                <div className="space-y-3">
                  {data.kpis.gastosPorCategoria
                    .sort((a, b) => b.total - a.total)
                    .map(({ category, total }) => {
                      const maxTotal = Math.max(...data.kpis.gastosPorCategoria.map((g) => g.total), 1);
                      return (
                        <div key={category}>
                          <div className="flex justify-between text-xs mb-1 font-sans-custom">
                            <span style={{ color: 'rgba(242,240,237,0.4)' }}>{EXPENSE_CATEGORY_LABELS[category]}</span>
                            <span style={{ color: 'rgba(242,240,237,0.6)' }}>{formatCOP(total)}</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <div
                              className="h-full rounded-full" style={{ background: 'rgba(212,175,55,0.6)', width: `${(total / maxTotal) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          {/* Recent movements */}
          <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <h3 className="text-sm font-medium font-display" style={{ color: 'rgba(242,240,237,0.8)' }}>Movimientos recientes</h3>
            </div>
            {data.recentMovements.length === 0 ? (
              <p className="text-sm text-center py-8 font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>Sin movimientos en este período</p>
            ) : (
              <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                {data.recentMovements.map((m, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        m.isIncome ? '' : ''
                      }`} style={{ background: m.isIncome ? 'rgba(52,211,153,0.1)' : 'rgba(244,63,94,0.1)' }}>
                        {m.isIncome
                          ? <ArrowUpRight size={14} style={{ color: 'rgba(52,211,153,0.9)' }} />
                          : <ArrowDownRight size={14} style={{ color: 'rgba(244,63,94,0.9)' }} />}
                      </div>
                      <div>
                        <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.7)' }}>{m.description}</p>
                        <p className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>
                          {new Date(m.date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <MarginBadge value={m.isIncome ? m.amount : -m.amount} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* DIAN note */}
          <div className="rounded-lg p-4 text-xs font-sans-custom" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
            {/* TODO: DIAN integration — Aquí se habilitará la generación de facturas electrónicas cuando se implemente el módulo de facturación DIAN */}
            <span style={{ color: 'rgba(242,240,237,0.25)' }}>Nota fiscal:</span> Este módulo está preparado para integración futura con facturación electrónica DIAN.
          </div>
        </>
      ) : null}
    </div>
  );
}
