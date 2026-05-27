'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calculator, Plus, ChevronRight, ExternalLink } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { fetchQuotations } from '@/lib/quotation/queries';
import { formatPriceCOP } from '@/lib/pricing/calculations';
import type { QuotationRecord } from '@/lib/quotation/types';

const ALLOWED_ROLES = ['admin', 'manager'];

const STATUS_CHIP: Record<string, { label: string; classes: string }> = {
  draft: { label: 'Borrador', classes: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  converted: { label: 'Convertida', classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
};

const QUOTE_TYPE_LABEL: Record<string, string> = {
  client: 'Cliente Final',
  jeweler: 'Joyero',
};

export default function CotizacionListPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [quotations, setQuotations] = useState<QuotationRecord[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(0);
  const [fetching, setFetching] = useState(true);

  const PAGE_SIZE = 20;
  const isManager = user?.role === 'manager';

  useEffect(() => {
    if (!loading && user && !ALLOWED_ROLES.includes(user.role)) {
      router.push('/admin');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !ALLOWED_ROLES.includes(user.role)) return;
    setFetching(true);
    fetchQuotations(page, PAGE_SIZE, { userId: user.id, role: user.role })
      .then(({ data, count: total }) => {
        setQuotations(data);
        setCount(total);
      })
      .catch(console.error)
      .finally(() => setFetching(false));
  }, [user, page]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-gold-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || !ALLOWED_ROLES.includes(user.role)) return null;

  const totalPages = Math.ceil(count / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gold-500/10 flex items-center justify-center">
            <Calculator size={20} className="text-gold-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold font-display" style={{ color: 'rgba(242,240,237,0.95)' }}>Cotizaciones</h1>
            <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>
              {count > 0 ? `${count} cotización${count !== 1 ? 'es' : ''}${isManager ? ' tuyas' : ''}` : 'Sin cotizaciones'}
            </p>
          </div>
        </div>
        <Link
          href="/admin/cotizacion/nueva"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-all duration-200 font-sans-custom"
          style={{ background: 'linear-gradient(135deg, #E8C547, #D4AF37)', color: '#1A1400', borderRadius: '0.75rem' }}
        >
          <Plus size={16} />
          Nueva Cotización
        </Link>
      </div>

      {/* Table */}
      {fetching ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin h-6 w-6 border-2 border-gold-500 border-t-transparent rounded-full" />
        </div>
      ) : quotations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Calculator size={40} className="mb-4" style={{ color: 'rgba(242,240,237,0.15)' }} />
          <p className="font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>No hay cotizaciones registradas</p>
          <p className="text-sm mt-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.25)' }}>
            Crea una nueva cotización para comenzar
          </p>
          <Link
            href="/admin/cotizacion/nueva"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm transition-colors font-sans-custom" style={{ color: 'rgba(212,175,55,0.7)' }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(212,175,55,0.9)'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(212,175,55,0.7)'}
          >
            <Plus size={14} /> Nueva cotización
          </Link>
        </div>
      ) : (
        <>
        <div className="space-y-3 md:hidden">
          {quotations.map((q) => {
            const chip = STATUS_CHIP[q.status] ?? STATUS_CHIP.draft;
            const clientName = q.client
              ? `${q.client.first_name} ${q.client.last_name}`
              : q.client_name_temp || q.client_phone || '—';

            return (
              <Link
                key={q.id}
                href={`/admin/cotizacion/nueva?edit=${q.id}`}
                className="block rounded-2xl p-4"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-xs" style={{ color: 'rgba(212,175,55,0.9)' }}>{q.quote_number}</p>
                    <h2 className="mt-1 truncate text-sm font-medium font-sans-custom" style={{ color: 'rgba(242,240,237,0.86)' }}>
                      {clientName}
                    </h2>
                    <p className="mt-0.5 text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.38)' }}>
                      {q.piece_type || 'Sin pieza'} · {QUOTE_TYPE_LABEL[q.quote_type] ?? q.quote_type}
                    </p>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium border font-sans-custom ${chip.classes}`}>
                    {chip.label}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold font-sans-custom" style={{ color: 'rgba(242,240,237,0.82)' }}>
                    {q.total_cop > 0 ? formatPriceCOP(q.total_cop) : 'Sin total'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.34)' }}>
                    {new Date(q.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                    <ChevronRight size={14} />
                  </span>
                </div>
                {q.status === 'converted' && q.order_id && (
                  <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-sans-custom" style={{ color: 'rgba(52,211,153,0.85)' }}>
                    <ExternalLink size={12} /> Pedido creado
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <div className="hidden rounded-2xl overflow-hidden md:block" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-widest font-normal font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>
                    N° Cotización
                  </th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-widest font-normal font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>
                    Tipo
                  </th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-widest font-normal font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>
                    Cliente
                  </th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-widest font-normal font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>
                    Pieza
                  </th>
                  <th className="text-right px-4 py-3 text-xs uppercase tracking-widest font-normal font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>
                    Total
                  </th>
                  <th className="text-center px-4 py-3 text-xs uppercase tracking-widest font-normal font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>
                    Estado
                  </th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-widest font-normal font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>
                    Fecha
                  </th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {quotations.map((q) => {
                  const chip = STATUS_CHIP[q.status] ?? STATUS_CHIP.draft;
                  const clientName = q.client
                    ? `${q.client.first_name} ${q.client.last_name}`
                    : q.client_name_temp || q.client_phone || '—';

                  return (
                    <tr key={q.id} onClick={() => router.push(`/admin/cotizacion/nueva?edit=${q.id}`)} className="hover:bg-white/2 transition-colors group cursor-pointer">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.8)' }}>{q.quote_number}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.5)' }}>
                          {QUOTE_TYPE_LABEL[q.quote_type] ?? q.quote_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-sans-custom truncate max-w-[120px] block" style={{ color: 'rgba(242,240,237,0.8)' }}>
                          {clientName}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-sans-custom truncate max-w-[120px] block" style={{ color: 'rgba(242,240,237,0.5)' }}>
                          {q.piece_type || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-medium font-sans-custom" style={{ color: 'rgba(242,240,237,0.8)' }}>
                          {q.total_cop > 0 ? formatPriceCOP(q.total_cop) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border font-sans-custom ${chip.classes}`}
                        >
                          {chip.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>
                          {new Date(q.created_at).toLocaleDateString('es-CO', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {q.status === 'converted' && q.order_id && (
                            <Link
                              href={`/admin/pedidos/${q.order_id}`}
                              title="Ver pedido"
                              onClick={(event) => event.stopPropagation()}
                              className="p-1.5 rounded transition-colors" style={{ color: 'rgba(242,240,237,0.3)' }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(16,185,129,0.9)'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(242,240,237,0.3)'}
                            >
                              <ExternalLink size={13} />
                            </Link>
                          )}
                          <ChevronRight size={14} style={{ color: 'rgba(242,240,237,0.2)' }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>
                Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, count)} de {count}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 rounded text-xs border transition-colors font-sans-custom" style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(242,240,237,0.5)' }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1.5 rounded text-xs border transition-colors font-sans-custom" style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(242,240,237,0.5)' }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
        </>
      )}
    </div>
  );
}
