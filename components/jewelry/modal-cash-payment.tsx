'use client';

import { useState } from 'react';
import { X, DollarSign, Calendar, User, AlertCircle, CreditCard, Banknote } from 'lucide-react';

interface ModalCashPaymentProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CashPaymentData) => Promise<void>;
  orderId: string;
  orderData: {
    totalAmountCop?: number;
    totalPaidAmount: number;
    currency: string;
  };
  users: Array<{
    id: string;
    firstName: string;
    lastName: string;
  }>;
}

interface CashPaymentData {
  amountCop: number;
  method: 'cash' | 'transfer' | 'card' | 'other';
  status: 'completed' | 'pending';
  paidAt: string;
  registeredByUserId: string;
  observation: string;
}

export default function ModalCashPayment({ 
  isOpen, 
  onClose, 
  onSubmit, 
  orderId, 
  orderData,
  users 
}: ModalCashPaymentProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<CashPaymentData>({
    amountCop: 0,
    method: 'cash',
    status: 'completed',
    paidAt: new Date().toISOString().split('T')[0],
    registeredByUserId: '',
    observation: '',
  });

  const remainingBalance = orderData.totalAmountCop 
    ? orderData.totalAmountCop - orderData.totalPaidAmount 
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validaciones
      if (!formData.amountCop || formData.amountCop <= 0) {
        throw new Error('El monto es requerido y debe ser mayor a 0');
      }
      
      if (orderData.totalAmountCop && formData.amountCop > remainingBalance) {
        const confirm = window.confirm(
          `El monto ingresado ($${new Intl.NumberFormat('es-CO').format(formData.amountCop)}) ` +
          `es mayor al saldo pendiente ($${new Intl.NumberFormat('es-CO').format(remainingBalance)}). ` +
          '¿Desea continuar de todas formas?'
        );
        if (!confirm) {
          return;
        }
      }
      
      if (!formData.registeredByUserId) {
        throw new Error('Debe seleccionar quién registra el pago');
      }

      await onSubmit(formData);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar pago');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof CashPaymentData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return <Banknote size={16} />;
      case 'transfer':
        return <CreditCard size={16} />;
      case 'card':
        return <CreditCard size={16} />;
      default:
        return <DollarSign size={16} />;
    }
  };

  const getMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'Efectivo',
      transfer: 'Transferencia',
      card: 'Tarjeta',
      other: 'Otro',
    };
    return labels[method] || method;
  };

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'rgba(242,240,237,0.85)',
    borderRadius: 12,
    width: '100%',
    padding: '10px 12px',
    fontSize: 13,
    outline: 'none',
    fontFamily: 'inherit',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'rgba(242,240,237,0.3)',
    marginBottom: 6,
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(10,10,10,0.88)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg my-auto rounded-2xl font-sans-custom flex flex-col"
        style={{
          background: 'rgba(18,16,14,0.98)',
          border: '1px solid rgba(255,255,255,0.09)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
          maxHeight: 'calc(100vh - 2rem)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — fijo */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.2)' }}
            >
              <DollarSign size={15} style={{ color: 'rgba(212,175,55,0.8)' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'rgba(242,240,237,0.88)' }}>Abono en Dinero</p>
              <p className="text-[10px] uppercase tracking-[0.1em]" style={{ color: 'rgba(242,240,237,0.3)' }}>Registrar pago del cliente</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(242,240,237,0.5)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body — scrollable */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="px-5 py-4 space-y-5">

            {/* Error */}
            {error && (
              <div
                className="flex items-start gap-3 p-3 rounded-xl"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                <AlertCircle size={14} className="shrink-0 mt-0.5" style={{ color: 'rgba(252,165,165,0.8)' }} />
                <p className="text-xs" style={{ color: 'rgba(252,165,165,0.85)' }}>{error}</p>
              </div>
            )}

            {/* Resumen de saldo */}
            {orderData.totalAmountCop && (
              <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-[10px] uppercase tracking-[0.12em] font-semibold mb-3 flex items-center gap-2" style={{ color: 'rgba(212,175,55,0.6)' }}>
                  <DollarSign size={11} /> Estado de Pagos
                </p>
                <div className="space-y-2">
                  {[
                    { label: 'Total pedido', value: `$${new Intl.NumberFormat('es-CO').format(orderData.totalAmountCop)}`, color: 'rgba(242,240,237,0.75)' },
                    { label: 'Pagado anterior', value: `$${new Intl.NumberFormat('es-CO').format(orderData.totalPaidAmount)}`, color: 'rgba(110,231,183,0.8)' },
                    { label: 'Saldo pendiente', value: `$${new Intl.NumberFormat('es-CO').format(remainingBalance)}`, color: 'rgba(212,175,55,0.9)', bold: true },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between items-center">
                      <span className="text-xs" style={{ color: 'rgba(242,240,237,0.35)' }}>{row.label}</span>
                      <span className="text-xs font-semibold" style={{ color: row.color }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Monto */}
            <div>
              <label style={labelStyle}>Monto ({orderData.currency}) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'rgba(242,240,237,0.3)' }}>
                  {orderData.currency === 'COP' ? '$' : orderData.currency}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.amountCop || ''}
                  onChange={(e) => updateField('amountCop', parseFloat(e.target.value))}
                  placeholder="0"
                  style={{ ...inputStyle, paddingLeft: 28 }}
                />
              </div>
              {orderData.totalAmountCop && remainingBalance > 0 && (
                <p className="text-[10px] mt-1" style={{ color: 'rgba(242,240,237,0.25)' }}>
                  Saldo pendiente: ${new Intl.NumberFormat('es-CO').format(remainingBalance)}
                </p>
              )}
            </div>

            {/* Método de pago */}
            <div>
              <label style={labelStyle}>Método de pago *</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'cash', label: 'Efectivo' },
                  { value: 'transfer', label: 'Transferencia' },
                  { value: 'card', label: 'Tarjeta' },
                  { value: 'other', label: 'Otro' },
                ].map((method) => {
                  const isActive = formData.method === method.value;
                  return (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => updateField('method', method.value)}
                      className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all"
                      style={{
                        background: isActive ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.04)',
                        border: isActive ? '1px solid rgba(212,175,55,0.3)' : '1px solid rgba(255,255,255,0.07)',
                        color: isActive ? 'rgba(212,175,55,0.95)' : 'rgba(242,240,237,0.4)',
                      }}
                    >
                      {getMethodIcon(method.value)}
                      {method.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Estado */}
            <div>
              <label style={labelStyle}>Estado *</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'completed', label: 'Completado', activeColor: 'rgba(110,231,183,0.9)', activeBg: 'rgba(16,185,129,0.1)', activeBorder: 'rgba(16,185,129,0.25)' },
                  { value: 'pending', label: 'Pendiente', activeColor: 'rgba(250,204,21,0.9)', activeBg: 'rgba(234,179,8,0.1)', activeBorder: 'rgba(234,179,8,0.25)' },
                ].map((s) => {
                  const isActive = formData.status === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => updateField('status', s.value)}
                      className="py-2.5 px-3 rounded-xl text-xs font-semibold transition-all"
                      style={{
                        background: isActive ? s.activeBg : 'rgba(255,255,255,0.04)',
                        border: isActive ? `1px solid ${s.activeBorder}` : '1px solid rgba(255,255,255,0.07)',
                        color: isActive ? s.activeColor : 'rgba(242,240,237,0.4)',
                      }}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fecha y registrado por */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label style={labelStyle}>Fecha de pago *</label>
                <input
                  type="date"
                  value={formData.paidAt}
                  onChange={(e) => updateField('paidAt', e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Registrado por *</label>
                <select
                  value={formData.registeredByUserId}
                  onChange={(e) => updateField('registeredByUserId', e.target.value)}
                  style={{ ...inputStyle, appearance: 'none' }}
                >
                  <option value="">Seleccionar...</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.firstName} {user.lastName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Observaciones */}
            <div>
              <label style={labelStyle}>Observaciones</label>
              <textarea
                value={formData.observation}
                onChange={(e) => updateField('observation', e.target.value)}
                rows={2}
                placeholder="Referencia, número de operación..."
                style={{ ...inputStyle, resize: 'none' }}
              />
            </div>

            {/* Resumen rápido */}
            <div className="rounded-xl p-4" style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.12)' }}>
              <p className="text-[10px] uppercase tracking-[0.12em] font-semibold mb-3" style={{ color: 'rgba(212,175,55,0.55)' }}>Resumen del Pago</p>
              <div className="space-y-2">
                {[
                  { label: 'Monto', value: `$${new Intl.NumberFormat('es-CO').format(formData.amountCop || 0)}`, color: 'rgba(212,175,55,0.9)' },
                  { label: 'Método', value: getMethodLabel(formData.method), color: 'rgba(242,240,237,0.75)' },
                  { label: 'Estado', value: formData.status === 'completed' ? 'Completado' : 'Pendiente', color: formData.status === 'completed' ? 'rgba(110,231,183,0.85)' : 'rgba(250,204,21,0.8)' },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between">
                    <span className="text-xs" style={{ color: 'rgba(242,240,237,0.35)' }}>{row.label}</span>
                    <span className="text-xs font-semibold" style={{ color: row.color }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Footer con botones — siempre visible */}
          <div
            className="px-5 py-4 flex items-center gap-3 shrink-0"
            style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
          >
            <button
              type="submit"
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl text-xs font-semibold uppercase tracking-[0.08em] transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #E8C547, #D4AF37)', color: '#1A1400' }}
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <DollarSign size={13} />
                  Registrar Pago
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(242,240,237,0.5)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
