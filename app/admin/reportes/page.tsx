'use client';

import { useState } from 'react';
import { Download, Loader2, Calendar, FileSpreadsheet } from 'lucide-react';
import { useApi } from '@/hooks/use-api';

export default function ReportsPage() {
  const api = useApi();
  const [loading, setLoading] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const downloadReport = async (type: string) => {
    setLoading(type);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      const blob = await api.getBlob(`/reports/${type}?${params}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Error descargando reporte');
    } finally {
      setLoading(null);
    }
  };

  const reports = [
    {
      id: 'orders',
      title: 'Reporte de Pedidos',
      description: 'Todos los pedidos con cliente, tipo, estado, montos y fechas',
      icon: FileSpreadsheet,
    },
    {
      id: 'assignments',
      title: 'Reporte de Asignaciones',
      description: 'Trabajos asignados por joyero, etapa, progreso y estado',
      icon: FileSpreadsheet,
    },
    {
      id: 'payments',
      title: 'Reporte de Pagos',
      description: 'Pagos recibidos, métodos, estados y montos',
      icon: FileSpreadsheet,
    },
    {
      id: 'production',
      title: 'Reporte de Producción',
      description: 'Piezas en cada etapa del workflow, tiempos promedio',
      icon: FileSpreadsheet,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold" style={{ color: 'rgba(242,240,237,0.95)' }}>Reportes</h1>
        <p className="text-sm mt-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>Exporta reportes en formato Excel</p>
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
              Descargar Excel
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
