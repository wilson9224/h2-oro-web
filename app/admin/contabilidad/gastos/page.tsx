'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  TrendingDown,
  Plus,
  X,
  Trash2,
  Filter,
  ChevronDown,
  Receipt,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import {
  fetchExpenses,
  createExpense,
  deleteExpense,
} from '@/lib/accounting/queries';
import type { Expense, ExpenseCategory, PaymentMethod } from '@/lib/accounting/types';
import {
  EXPENSE_CATEGORY_LABELS,
  PAYMENT_METHOD_LABELS,
} from '@/lib/accounting/types';

function formatCOP(n: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(n);
}

type DateRange = '7d' | '30d' | '90d' | 'all';

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  '7d': 'Últimos 7 días',
  '30d': 'Últimos 30 días',
  '90d': 'Últimos 90 días',
  all: 'Todo',
};

function getDateRange(range: DateRange): { from?: string; to?: string } {
  if (range === 'all') return {};
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const from = new Date();
  from.setDate(from.getDate() - days);
  return { from: from.toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) };
}

const CATEGORIES = Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[];
const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];

interface ExpenseForm {
  category: ExpenseCategory;
  description: string;
  amount_cop: string;
  expense_date: string;
  payment_method: PaymentMethod | '';
  notes: string;
}

const TODAY = new Date().toISOString().slice(0, 10);

const EMPTY_FORM: ExpenseForm = {
  category: 'other',
  description: '',
  amount_cop: '',
  expense_date: TODAY,
  payment_method: '',
  notes: '',
};

export default function GastosPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<ExpenseForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to } = getDateRange(dateRange);
      const { data, count } = await fetchExpenses({
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        from,
        to,
        limit: 100,
      });
      setExpenses(data);
      setTotal(count);
    } finally {
      setLoading(false);
    }
  }, [dateRange, categoryFilter]);

  useEffect(() => { load(); }, [load]);

  const totalAmount = expenses.reduce((s, e) => s + e.amount_cop, 0);

  const byCategory = CATEGORIES.map((cat) => ({
    cat,
    label: EXPENSE_CATEGORY_LABELS[cat],
    total: expenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount_cop, 0),
  })).filter((c) => c.total > 0).sort((a, b) => b.total - a.total);

  const handleSubmit = async () => {
    if (!user || !form.description || !form.amount_cop || !form.expense_date) return;
    setSubmitting(true);
    try {
      await createExpense({
        category: form.category,
        description: form.description,
        amount_cop: parseFloat(form.amount_cop),
        expense_date: form.expense_date,
        payment_method: form.payment_method || null,
        notes: form.notes || null,
        registered_by: user.id,
      });
      setShowModal(false);
      setForm(EMPTY_FORM);
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este gasto?')) return;
    setDeletingId(id);
    try {
      await deleteExpense(id);
      await load();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="col-span-2 sm:col-span-1 rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs uppercase tracking-wide mb-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Total (período)</p>
          <p className="text-xl font-bold font-display" style={{ color: 'rgba(244,63,94,0.9)' }}>{formatCOP(totalAmount)}</p>
          <p className="text-sm mt-0.5 font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>{expenses.length} gasto{expenses.length !== 1 ? 's' : ''}</p>
        </div>
        {byCategory.slice(0, 3).map(({ cat, label, total: t }) => (
          <div key={cat} className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs uppercase tracking-wide mb-1 font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>{label}</p>
            <p className="text-lg font-semibold font-sans-custom" style={{ color: 'rgba(242,240,237,0.8)' }}>{formatCOP(t)}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-lg p-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className="px-3 py-1.5 text-sm rounded-md transition-colors font-sans-custom"
                style={{
                  background: dateRange === r ? 'rgba(212,175,55,0.12)' : 'transparent',
                  color: dateRange === r ? 'rgba(212,175,55,0.9)' : 'rgba(242,240,237,0.4)',
                  border: dateRange === r ? '1px solid rgba(212,175,55,0.2)' : '1px solid transparent',
                }}
              >
                {DATE_RANGE_LABELS[r]}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg transition-colors font-sans-custom"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(242,240,237,0.5)',
            }}
          >
            <Filter size={14} />
            Filtros
            <ChevronDown size={12} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>
        <button
          onClick={() => { setShowModal(true); setForm({ ...EMPTY_FORM, expense_date: TODAY }); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold font-sans-custom"
          style={{
            background: 'rgba(212,175,55,0.9)',
            color: 'rgba(8,8,8,0.9)',
          }}
        >
          <Plus size={16} />
          Registrar gasto
        </button>
      </div>

      {showFilters && (
        <div className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <label className="text-xs mb-1.5 block font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Categoría</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as ExpenseCategory | 'all')}
              className="rounded-lg px-3 py-2 text-sm font-sans-custom focus:outline-none"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(242,240,237,0.7)',
              }}
            >
              <option value="all">Todas las categorías</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin h-8 w-8 border-2 border-gold-500 border-t-transparent rounded-full" />
        </div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-16 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <Receipt size={32} className="mx-auto mb-3" style={{ color: 'rgba(242,240,237,0.2)' }} />
          <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>No hay gastos registrados</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 text-sm transition-colors font-sans-custom"
            style={{ color: 'rgba(212,175,55,0.9)' }}
          >
            Registrar el primero
          </button>
        </div>
      ) : (
        <div className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide font-sans-custom" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'rgba(242,240,237,0.4)' }}>
                <th className="text-left px-4 py-3">Fecha</th>
                <th className="text-left px-4 py-3">Categoría</th>
                <th className="text-left px-4 py-3">Descripción</th>
                <th className="text-left px-4 py-3">Método</th>
                <th className="text-right px-4 py-3">Monto</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              {expenses.map((e) => (
                <tr key={e.id} className="transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td className="px-4 py-3 text-xs whitespace-nowrap font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>
                    <span className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>{new Date(e.expense_date).toLocaleDateString('es-CO')}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-sans-custom" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(242,240,237,0.5)' }}>
                      {EXPENSE_CATEGORY_LABELS[e.category]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium font-sans-custom" style={{ color: 'rgba(242,240,237,0.8)' }}>{e.description}</p>
                    {e.notes && <p className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>{e.notes}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>
                    {e.payment_method ? PAYMENT_METHOD_LABELS[e.payment_method] : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold font-sans-custom" style={{ color: 'rgba(244,63,94,0.9)' }}>
                    {formatCOP(e.amount_cop)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(e.id)}
                      disabled={deletingId === e.id}
                      className="p-1.5 transition-colors"
                      style={{ color: 'rgba(242,240,237,0.4)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="rounded-xl p-6 w-full max-w-md shadow-2xl" style={{ background: 'rgba(20,20,20,0.95)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold font-display flex items-center gap-2" style={{ color: 'rgba(242,240,237,0.95)' }}>Registrar gasto</h2>
              <button onClick={() => setShowModal(false)} className="transition-colors" style={{ color: 'rgba(242,240,237,0.4)' }}>
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1.5 block font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Categoría *</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as ExpenseCategory }))}
                    className="w-full rounded-lg px-3 py-2 text-sm font-sans-custom focus:outline-none"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(242,240,237,0.7)',
            }}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs mb-1.5 block font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Fecha *</label>
                  <input
                    type="date"
                    value={form.expense_date}
                    onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-sm font-sans-custom focus:outline-none"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(242,240,237,0.7)',
            }}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs mb-1.5 block font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Descripción *</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Ej: Arriendo taller enero, herramienta de corte..."
                  className="w-full rounded-lg px-3 py-2 text-sm font-sans-custom focus:outline-none"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(242,240,237,0.7)',
            }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1.5 block font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Monto (COP) *</label>
                  <input
                    type="number"
                    step="1000"
                    value={form.amount_cop}
                    onChange={(e) => setForm((f) => ({ ...f, amount_cop: e.target.value }))}
                    placeholder="0"
                    className="w-full rounded-lg px-3 py-2 text-sm font-sans-custom focus:outline-none"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(242,240,237,0.7)',
            }}
                  />
                </div>
                <div>
                  <label className="text-xs mb-1.5 block font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Método de pago</label>
                  <select
                    value={form.payment_method}
                    onChange={(e) => setForm((f) => ({ ...f, payment_method: e.target.value as PaymentMethod }))}
                    className="w-full rounded-lg px-3 py-2 text-sm font-sans-custom focus:outline-none"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(242,240,237,0.7)',
            }}
                  >
                    <option value="">Sin especificar</option>
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs mb-1.5 block font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>Notas</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  placeholder="Información adicional..."
                  className="w-full rounded-lg px-3 py-2 text-sm font-sans-custom focus:outline-none resize-none"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(242,240,237,0.7)',
                  }}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-lg transition-colors text-sm font-sans-custom"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(242,240,237,0.5)',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !form.description || !form.amount_cop}
                className="flex-1 py-2.5 rounded-lg transition-colors text-sm font-semibold font-sans-custom disabled:opacity-50"
                style={{
                  background: 'rgba(212,175,55,0.9)',
                  color: 'rgba(8,8,8,0.9)',
                }}
              >
                {submitting ? 'Guardando...' : 'Registrar gasto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
