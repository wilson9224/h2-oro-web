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
        <h1 className="text-2xl font-serif text-cream-100">Reportes</h1>
        <p className="text-sm text-charcoal-400 mt-1">Exporta reportes en formato Excel</p>
      </div>

      {/* Date range */}
      <div className="bg-charcoal-800 rounded-lg border border-white/5 p-5">
        <h3 className="text-sm font-medium text-cream-200 mb-3 flex items-center gap-2">
          <Calendar size={16} className="text-charcoal-500" />
          Rango de fechas (opcional)
        </h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <div>
            <label className="block text-xs text-charcoal-400 mb-1">Desde</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 focus:outline-none focus:border-gold-500/30"
            />
          </div>
          <div>
            <label className="block text-xs text-charcoal-400 mb-1">Hasta</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 focus:outline-none focus:border-gold-500/30"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="self-end px-3 py-2 text-xs text-charcoal-400 hover:text-cream-200 transition-colors"
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
            className="bg-charcoal-800 rounded-lg border border-white/5 p-5 flex flex-col justify-between"
          >
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-md bg-gold-500/10">
                  <report.icon size={18} className="text-gold-400" />
                </div>
                <h3 className="text-sm font-medium text-cream-200">{report.title}</h3>
              </div>
              <p className="text-xs text-charcoal-400">{report.description}</p>
            </div>
            <button
              onClick={() => downloadReport(report.id)}
              disabled={loading === report.id}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-charcoal-700 text-cream-200 text-xs rounded-md hover:bg-charcoal-600 transition-colors disabled:opacity-50 w-full"
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
