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

  useEffect(() => {
    if (!loading && user && !ALLOWED_ROLES.includes(user.role)) {
      router.push('/admin');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !ALLOWED_ROLES.includes(user.role)) return;
    setFetching(true);
    fetchQuotations(page, PAGE_SIZE)
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
            <h1 className="text-xl font-semibold text-cream-200">Cotizaciones</h1>
            <p className="text-sm text-charcoal-400">
              {count > 0 ? `${count} cotización${count !== 1 ? 'es' : ''}` : 'Sin cotizaciones'}
            </p>
          </div>
        </div>
        <Link
          href="/admin/cotizacion/nueva"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gold-500 text-charcoal-900 text-sm font-medium rounded-md hover:bg-gold-400 transition-colors"
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
          <Calculator size={40} className="text-charcoal-600 mb-4" />
          <p className="text-charcoal-400">No hay cotizaciones registradas</p>
          <p className="text-sm text-charcoal-600 mt-1">
            Crea una nueva cotización para comenzar
          </p>
          <Link
            href="/admin/cotizacion/nueva"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm text-gold-500 hover:text-gold-400 transition-colors"
          >
            <Plus size={14} /> Nueva cotización
          </Link>
        </div>
      ) : (
        <div className="bg-charcoal-800 border border-white/5 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-charcoal-400 font-normal">
                    N° Cotización
                  </th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-charcoal-400 font-normal">
                    Tipo
                  </th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-charcoal-400 font-normal">
                    Cliente
                  </th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-charcoal-400 font-normal">
                    Pieza
                  </th>
                  <th className="text-right px-4 py-3 text-xs uppercase tracking-widest text-charcoal-400 font-normal">
                    Total
                  </th>
                  <th className="text-center px-4 py-3 text-xs uppercase tracking-widest text-charcoal-400 font-normal">
                    Estado
                  </th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-widest text-charcoal-400 font-normal">
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
                    <tr key={q.id} className="hover:bg-white/2 transition-colors group">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-cream-200">{q.quote_number}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-charcoal-300">
                          {QUOTE_TYPE_LABEL[q.quote_type] ?? q.quote_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-cream-200 truncate max-w-[120px] block">
                          {clientName}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-charcoal-300 truncate max-w-[120px] block">
                          {q.piece_type || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-medium text-cream-200">
                          {q.total_cop > 0 ? formatPriceCOP(q.total_cop) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border ${chip.classes}`}
                        >
                          {chip.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-charcoal-400">
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
                              className="p-1.5 rounded hover:bg-white/5 text-charcoal-400 hover:text-emerald-400 transition-colors"
                            >
                              <ExternalLink size={13} />
                            </Link>
                          )}
                          <ChevronRight size={14} className="text-charcoal-600" />
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
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
              <p className="text-xs text-charcoal-500">
                Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, count)} de {count}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 rounded text-xs border border-white/5 text-charcoal-300 hover:bg-white/5 disabled:opacity-40 transition-colors"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1.5 rounded text-xs border border-white/5 text-charcoal-300 hover:bg-white/5 disabled:opacity-40 transition-colors"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
