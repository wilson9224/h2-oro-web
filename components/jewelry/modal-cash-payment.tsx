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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-charcoal-900/95 flex items-center justify-center z-50 p-4">
      <div className="bg-charcoal-800 rounded-lg max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div>
            <h2 className="text-lg font-medium text-cream-100">Abono en Dinero</h2>
            <p className="text-sm text-charcoal-400">Registrar pago del cliente</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-charcoal-400 hover:text-cream-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle size={16} className="text-red-500 mt-0.5" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            </div>
          )}

          {/* Información del Pedido */}
          {orderData.totalAmountCop && (
            <div className="bg-charcoal-900/50 border border-white/5 rounded-lg p-4">
              <h3 className="text-sm font-medium text-cream-100 mb-3 flex items-center gap-2">
                <DollarSign size={16} className="text-gold-500" />
                Estado de Pagos
              </h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-charcoal-400">Total pedido:</span>
                  <span className="text-cream-200">
                    ${new Intl.NumberFormat('es-CO').format(orderData.totalAmountCop)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-charcoal-400">Pagado anterior:</span>
                  <span className="text-emerald-400">
                    ${new Intl.NumberFormat('es-CO').format(orderData.totalPaidAmount)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-white/5">
                  <span className="text-charcoal-400">Saldo pendiente:</span>
                  <span className="text-gold-400 font-medium">
                    ${new Intl.NumberFormat('es-CO').format(remainingBalance)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Monto y Método */}
          <div>
            <h3 className="text-sm font-medium text-cream-100 mb-4">Datos del Pago</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
                  Monto ({orderData.currency}) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-500">
                    {orderData.currency === 'COP' ? '$' : orderData.currency}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.amountCop}
                    onChange={(e) => updateField('amountCop', parseFloat(e.target.value))}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-600 focus:outline-none focus:border-gold-500/30"
                  />
                </div>
                {orderData.totalAmountCop && remainingBalance > 0 && (
                  <p className="text-[11px] text-charcoal-500 mt-1">
                    Saldo pendiente: ${new Intl.NumberFormat('es-CO').format(remainingBalance)}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
                  Método de pago *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'cash', label: 'Efectivo' },
                    { value: 'transfer', label: 'Transferencia' },
                    { value: 'card', label: 'Tarjeta' },
                    { value: 'other', label: 'Otro' },
                  ].map((method) => (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => updateField('method', method.value)}
                      className={`px-3 py-2 rounded-md text-sm border transition-all flex items-center justify-center gap-2 ${
                        formData.method === method.value
                          ? 'bg-gold-500/10 border-gold-500/30 text-gold-400'
                          : 'bg-charcoal-900 border-white/5 text-charcoal-300 hover:border-white/10'
                      }`}
                    >
                      {getMethodIcon(method.value)}
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
                  Estado *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => updateField('status', 'completed')}
                    className={`px-3 py-2 rounded-md text-sm border transition-all ${
                      formData.status === 'completed'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-charcoal-900 border-white/5 text-charcoal-300 hover:border-white/10'
                    }`}
                  >
                    Completado
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField('status', 'pending')}
                    className={`px-3 py-2 rounded-md text-sm border transition-all ${
                      formData.status === 'pending'
                        ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                        : 'bg-charcoal-900 border-white/5 text-charcoal-300 hover:border-white/10'
                    }`}
                  >
                    Pendiente
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Fecha y Registrado por */}
          <div>
            <h3 className="text-sm font-medium text-cream-100 mb-4 flex items-center gap-2">
              <Calendar size={16} className="text-gold-500" />
              Fecha y Registrante
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
                  Fecha de pago *
                </label>
                <input
                  type="date"
                  value={formData.paidAt}
                  onChange={(e) => updateField('paidAt', e.target.value)}
                  className="w-full px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 focus:outline-none focus:border-gold-500/30"
                />
              </div>
              
              <div>
                <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
                  Registrado por *
                </label>
                <select
                  value={formData.registeredByUserId}
                  onChange={(e) => updateField('registeredByUserId', e.target.value)}
                  className="w-full px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 focus:outline-none focus:border-gold-500/30"
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
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
              Observaciones
            </label>
            <textarea
              value={formData.observation}
              onChange={(e) => updateField('observation', e.target.value)}
              rows={3}
              placeholder="Notas sobre el pago (referencia, número de operación, etc.)..."
              className="w-full px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-600 focus:outline-none focus:border-gold-500/30 resize-none"
            />
          </div>

          {/* Resumen */}
          <div className="bg-charcoal-900/50 border border-white/5 rounded-lg p-4">
            <h3 className="text-sm font-medium text-cream-100 mb-3">Resumen del Pago</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-charcoal-400">Monto:</span>
                <span className="text-gold-400 font-medium">
                  ${new Intl.NumberFormat('es-CO').format(formData.amountCop)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-charcoal-400">Método:</span>
                <span className="text-cream-200 flex items-center gap-1">
                  {getMethodIcon(formData.method)}
                  {getMethodLabel(formData.method)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-charcoal-400">Estado:</span>
                <span className={`font-medium ${
                  formData.status === 'completed' ? 'text-emerald-400' : 'text-yellow-400'
                }`}>
                  {formData.status === 'completed' ? 'Completado' : 'Pendiente'}
                </span>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-3 pt-4 border-t border-white/5">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gold-500 text-charcoal-900 text-sm font-medium rounded-md hover:bg-gold-400 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-charcoal-900 border-t-transparent rounded-full animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <DollarSign size={16} />
                  Registrar Pago
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-sm text-charcoal-400 hover:text-cream-200 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
