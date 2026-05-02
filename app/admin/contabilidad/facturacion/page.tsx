'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Receipt,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

interface OrderPayment {
  id: string;
  orderNumber: string;
  clientName: string;
  orderType: string;
  totalAmountCop: number | null;
  paidAmount: number;
  pendingAmount: number;
  currency: string;
  createdAt: string;
  payments: {
    id: string;
    amount_cop: number;
    status: string;
    payment_method: string | null;
    paid_at: string | null;
    receipt_pdf_path: string | null;
  }[];
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  custom: 'Personalizado',
  catalog: 'Catálogo',
  repair: 'Reparación',
  resize: 'Redimensionar',
  jewelry: 'Joyería',
};

function formatCOP(n: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(n);
}

async function generateReceiptPDF(order: OrderPayment) {
  // TODO: DIAN integration — adapt this PDF structure when electronic invoice is required
  const jspdfModule = await import('jspdf');
  const jsPDF = jspdfModule.default ?? jspdfModule;
  // jspdf-autotable patches jsPDF prototype
  await import('jspdf-autotable');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = new (jsPDF as any)({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header
  doc.setFontSize(18);
  doc.setTextColor(180, 140, 60);
  doc.text('H2 ORO', pageWidth / 2, y, { align: 'center' });

  y += 7;
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text('Joyería Artesanal · Comprobante de Venta', pageWidth / 2, y, { align: 'center' });

  y += 10;
  doc.setDrawColor(200, 160, 80);
  doc.setLineWidth(0.5);
  doc.line(15, y, pageWidth - 15, y);

  // Order info
  y += 8;
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);

  const leftCol = 15;
  const rightCol = pageWidth / 2 + 10;

  doc.setFont(undefined, 'bold');
  doc.text('COMPROBANTE N°:', leftCol, y);
  doc.setFont(undefined, 'normal');
  doc.text(order.orderNumber, leftCol + 40, y);

  doc.setFont(undefined, 'bold');
  doc.text('FECHA:', rightCol, y);
  doc.setFont(undefined, 'normal');
  doc.text(new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }), rightCol + 20, y);

  y += 6;
  doc.setFont(undefined, 'bold');
  doc.text('CLIENTE:', leftCol, y);
  doc.setFont(undefined, 'normal');
  doc.text(order.clientName, leftCol + 40, y);

  doc.setFont(undefined, 'bold');
  doc.text('TIPO:', rightCol, y);
  doc.setFont(undefined, 'normal');
  doc.text(ORDER_TYPE_LABELS[order.orderType] ?? order.orderType, rightCol + 20, y);

  y += 12;
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.3);
  doc.line(15, y, pageWidth - 15, y);

  // Payments table
  y += 6;
  doc.setFont(undefined, 'bold');
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  doc.text('Detalle de pagos', leftCol, y);

  y += 4;

  const tableBody = order.payments.map((p, i) => [
    `${i + 1}`,
    p.paid_at ? new Date(p.paid_at).toLocaleDateString('es-CO') : '—',
    p.payment_method ?? '—',
    p.status === 'completed' ? 'Completado' : p.status === 'pending' ? 'Pendiente' : p.status,
    formatCOP(p.amount_cop),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (doc as any).autoTable({
    startY: y,
    head: [['#', 'Fecha', 'Método', 'Estado', 'Monto']],
    body: tableBody,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [180, 140, 60], textColor: 255, fontStyle: 'bold' },
    columnStyles: { 4: { halign: 'right' } },
    margin: { left: 15, right: 15 },
    theme: 'striped',
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable.finalY + 8;

  // Totals
  doc.setFont(undefined, 'bold');
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text('Total orden:', rightCol, finalY);
  doc.text(order.totalAmountCop ? formatCOP(order.totalAmountCop) : '—', pageWidth - 15, finalY, { align: 'right' });

  doc.setTextColor(20, 140, 80);
  doc.text('Total pagado:', rightCol, finalY + 6);
  doc.text(formatCOP(order.paidAmount), pageWidth - 15, finalY + 6, { align: 'right' });

  if (order.pendingAmount > 0) {
    doc.setTextColor(200, 60, 60);
    doc.text('Saldo pendiente:', rightCol, finalY + 12);
    doc.text(formatCOP(order.pendingAmount), pageWidth - 15, finalY + 12, { align: 'right' });
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(8);
  doc.setTextColor(160, 160, 160);
  doc.setFont(undefined, 'normal');
  doc.text('Gracias por confiar en H2 Oro · Este documento es un comprobante interno de venta.', pageWidth / 2, footerY, { align: 'center' });

  doc.save(`comprobante-${order.orderNumber}.pdf`);
}

export default function FacturacionPage() {
  const [orders, setOrders] = useState<OrderPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const limit = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('orders')
        .select(
          `
          id,
          order_number,
          type,
          total_amount_cop,
          currency,
          created_at,
          client:users!orders_client_id_fkey ( id, first_name, last_name ),
          payments ( id, amount_cop, status, payment_method, paid_at, receipt_pdf_path )
        `,
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (search) {
        query = query.ilike('order_number', `%${search}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      setTotal(count ?? 0);
      setOrders(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (data ?? []).map((o: any) => {
          const payments = o.payments ?? [];
          const paidAmount = payments
            .filter((p: { status: string; amount_cop: number }) => p.status === 'completed')
            .reduce((s: number, p: { amount_cop: number }) => s + Number(p.amount_cop), 0);
          const total = o.total_amount_cop ? Number(o.total_amount_cop) : 0;
          return {
            id: o.id,
            orderNumber: o.order_number,
            clientName: o.client ? `${o.client.first_name} ${o.client.last_name}` : '—',
            orderType: o.type,
            totalAmountCop: total,
            paidAmount,
            pendingAmount: Math.max(0, total - paidAmount),
            currency: o.currency,
            createdAt: o.created_at,
            payments,
          };
        })
      );
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / limit);

  const handleGenerate = async (order: OrderPayment) => {
    setGeneratingId(order.id);
    try {
      await generateReceiptPDF(order);
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }} />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Buscar por número de pedido..."
          className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm focus:outline-none transition-colors font-sans-custom"
          style={{ background: 'rgba(8,8,8,1)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(242,240,237,0.8)' }}
          onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.5)'}
          onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-2 rounded-full" style={{ borderColor: 'rgba(212,175,55,0.9)', borderTopColor: 'transparent' }} />
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 rounded-xl border font-sans-custom" style={{ background: 'rgba(8,8,8,1)', borderColor: 'rgba(255,255,255,0.05)' }}>
          <Receipt size={40} className="mx-auto mb-3 font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }} />
          <p className="font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>No se encontraron pedidos</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl overflow-hidden font-sans-custom" style={{ background: 'rgba(8,8,8,1)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wide font-sans-custom" style={{ borderColor: 'rgba(255,255,255,0.05)', color: 'rgba(242,240,237,0.4)' }}>
                  <th className="text-left px-4 py-3">Pedido</th>
                  <th className="text-left px-4 py-3">Cliente</th>
                  <th className="text-left px-4 py-3">Tipo</th>
                  <th className="text-right px-4 py-3">Total</th>
                  <th className="text-right px-4 py-3">Pagado</th>
                  <th className="text-right px-4 py-3">Saldo</th>
                  <th className="text-left px-4 py-3">Estado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {orders.map((order) => {
                  const fullyPaid = order.pendingAmount === 0 && order.paidAmount > 0;
                  const hasPayments = order.payments.length > 0;
                  return (
                    <tr key={order.id} className="transition-colors font-sans-custom" onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                      <td className="px-4 py-3">
                        <p className="font-medium font-sans-custom" style={{ color: 'rgba(242,240,237,0.8)' }}>{order.orderNumber}</p>
                        <p className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>
                          {new Date(order.createdAt).toLocaleDateString('es-CO')}
                        </p>
                      </td>
                      <td className="px-4 py-3 font-sans-custom" style={{ color: 'rgba(242,240,237,0.6)' }}>{order.clientName}</td>
                      <td className="px-4 py-3 text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>
                        {ORDER_TYPE_LABELS[order.orderType] ?? order.orderType}
                      </td>
                      <td className="px-4 py-3 text-right font-sans-custom" style={{ color: 'rgba(242,240,237,0.5)' }}>
                        {order.totalAmountCop ? formatCOP(order.totalAmountCop) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold font-sans-custom" style={{ color: 'rgba(52,211,153,0.9)' }}>
                        {order.paidAmount > 0 ? formatCOP(order.paidAmount) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {order.pendingAmount > 0 ? (
                          <span className="font-sans-custom" style={{ color: 'rgba(250,204,21,0.9)' }}>{formatCOP(order.pendingAmount)}</span>
                        ) : (
                          <span className="font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {fullyPaid ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-sans-custom" style={{ color: 'rgba(52,211,153,0.9)', background: 'rgba(52,211,153,0.1)' }}>
                            <CheckCircle2 size={10} /> Pagado
                          </span>
                        ) : hasPayments ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-sans-custom" style={{ color: 'rgba(250,204,21,0.9)', background: 'rgba(250,204,21,0.1)' }}>
                            <Clock size={10} /> Parcial
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)', background: 'rgba(8,8,8,1)' }}>
                            <AlertCircle size={10} /> Sin cobro
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {hasPayments && (
                          <button
                            onClick={() => handleGenerate(order)}
                            disabled={generatingId === order.id}
                            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 font-sans-custom"
                            style={{ background: 'rgba(8,8,8,1)', color: 'rgba(242,240,237,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
                            onMouseEnter={e => !(e.currentTarget as HTMLButtonElement).disabled && ((e.currentTarget as HTMLElement).style.color = 'rgba(212,175,55,0.8)', (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.3)')}
                            onMouseLeave={e => !(e.currentTarget as HTMLButtonElement).disabled && ((e.currentTarget as HTMLElement).style.color = 'rgba(242,240,237,0.5)', (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)')}
                          >
                            <Download size={12} />
                            {generatingId === order.id ? 'Generando...' : 'Comprobante PDF'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>{total} pedidos en total</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg disabled:opacity-40 font-sans-custom"
                  style={{ background: 'rgba(8,8,8,1)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(242,240,237,0.4)' }}
                  onMouseEnter={e => !(e.currentTarget as HTMLButtonElement).disabled && ((e.currentTarget as HTMLElement).style.color = 'rgba(242,240,237,0.6)')}
                  onMouseLeave={e => !(e.currentTarget as HTMLButtonElement).disabled && ((e.currentTarget as HTMLElement).style.color = 'rgba(242,240,237,0.4)')}
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>{page} / {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg disabled:opacity-40 font-sans-custom"
                  style={{ background: 'rgba(8,8,8,1)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(242,240,237,0.4)' }}
                  onMouseEnter={e => !(e.currentTarget as HTMLButtonElement).disabled && ((e.currentTarget as HTMLElement).style.color = 'rgba(242,240,237,0.6)')}
                  onMouseLeave={e => !(e.currentTarget as HTMLButtonElement).disabled && ((e.currentTarget as HTMLElement).style.color = 'rgba(242,240,237,0.4)')}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* DIAN note */}
      <div className="text-xs border-t pt-3 font-sans-custom" style={{ borderColor: 'rgba(255,255,255,0.05)', color: 'rgba(242,240,237,0.3)' }}>
        {/* TODO: DIAN integration — Add electronic invoice fields (CUFE, prefix, numbering) here when integrating with a DIAN authorized provider */}
        Los comprobantes generados son documentos internos. La facturación electrónica DIAN se activará en una fase futura.
      </div>
    </div>
  );
}
