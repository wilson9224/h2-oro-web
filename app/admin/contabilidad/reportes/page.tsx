'use client';

import { useState } from 'react';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Package,
  TrendingDown,
  Wallet,
  ShoppingBag,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

interface ReportConfig {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  endpoint: string;
  hasDateFilter: boolean;
  isNew?: boolean;
}

const REPORTS: ReportConfig[] = [
  {
    id: 'cashflow',
    label: 'Flujo de caja',
    description: 'Ingresos, egresos y margen estimado por período',
    icon: BarChart3,
    endpoint: '/reports/cashflow',
    hasDateFilter: true,
    isNew: true,
  },
  {
    id: 'inventory',
    label: 'Inventario',
    description: 'Stock actual y movimientos de materiales y piedras',
    icon: Package,
    endpoint: '/reports/inventory',
    hasDateFilter: true,
    isNew: true,
  },
  {
    id: 'expenses',
    label: 'Gastos operativos',
    description: 'Desglose de gastos por categoría y período',
    icon: TrendingDown,
    endpoint: '/reports/expenses',
    hasDateFilter: true,
    isNew: true,
  },
  {
    id: 'orders',
    label: 'Pedidos',
    description: 'Listado completo de pedidos con estado y montos',
    icon: ShoppingBag,
    endpoint: '/reports/orders',
    hasDateFilter: true,
  },
  {
    id: 'payments',
    label: 'Cobros a clientes',
    description: 'Historial de pagos recibidos',
    icon: FileSpreadsheet,
    endpoint: '/reports/payments',
    hasDateFilter: true,
  },
  {
    id: 'worker-payments',
    label: 'Pagos a trabajadores',
    description: 'Pagos a joyeros y diseñadores por servicio',
    icon: Wallet,
    endpoint: '/reports/worker-payments',
    hasDateFilter: true,
  },
  {
    id: 'production',
    label: 'Producción',
    description: 'Asignaciones de trabajo y estado de producción',
    icon: FileSpreadsheet,
    endpoint: '/reports/production',
    hasDateFilter: true,
  },
];

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function ReportesContabilidadPage() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [from, setFrom] = useState(formatDate(firstOfMonth));
  const [to, setTo] = useState(formatDate(today));
  const [loading, setLoading] = useState<string | null>(null);

  const handleDownload = async (report: ReportConfig) => {
    setLoading(report.id);
    try {
      const params = new URLSearchParams();
      if (report.hasDateFilter) {
        params.set('from', from);
        params.set('to', to);
      }

      const url = `${API_BASE}${report.endpoint}?${params.toString()}`;
      const res = await fetch(url, { credentials: 'include' });

      if (!res.ok) {
        alert(`Error generando reporte: ${res.statusText}`);
        return;
      }

      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${report.id}-${from}-${to}.xlsx`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      console.error(e);
      alert('Error descargando el reporte. Verifica que el servidor esté activo.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Date filter */}
      <div className="rounded-xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <h2 className="text-xl font-semibold font-display mb-4" style={{ color: 'rgba(242,240,237,0.95)' }}>Reportes contables</h2>
        <p className="text-sm font-sans-custom mb-6" style={{ color: 'rgba(242,240,237,0.35)' }}>Genera reportes financieros y de inventario</p>
        <label className="text-xs mb-1.5 block font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Rango de fechas</label>
        <div className="flex gap-4 flex-wrap">
          <div>
            <label className="text-xs mb-1.5 block font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Desde</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg px-3 py-2 text-sm font-sans-custom focus:outline-none"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(242,240,237,0.7)',
              }}
            />
          </div>
          <div>
            <label className="text-xs mb-1.5 block font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Hasta</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg px-3 py-2 text-sm font-sans-custom focus:outline-none"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(242,240,237,0.7)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORTS.map((report) => (
          <div
            key={report.id}
            className="rounded-xl p-5 transition-colors hover:border-gold-500/20" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: 'rgba(212,175,55,0.1)' }}>
                  <report.icon size={18} style={{ color: 'rgba(212,175,55,0.9)' }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium font-sans-custom" style={{ color: 'rgba(242,240,237,0.8)' }}>{report.label}</p>
                    {report.isNew && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium font-sans-custom" style={{ background: 'rgba(212,175,55,0.1)', color: 'rgba(212,175,55,0.8)' }}>
                        Nuevo
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-sans-custom mb-4" style={{ color: 'rgba(242,240,237,0.4)' }}>{report.description}</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => handleDownload(report)}
              disabled={loading === report.id}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold font-sans-custom transition-colors disabled:opacity-50"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(242,240,237,0.5)',
              }}
            >
              <Download size={14} />
              {loading === report.id ? 'Generando...' : 'Descargar Excel'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
