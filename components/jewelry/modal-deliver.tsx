'use client';

import { useState } from 'react';
import { X, Package, User, Calendar, Camera, AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react';

interface ModalDeliverProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DeliveryData) => Promise<void>;
  orderId: string;
  orderData: {
    orderNumber: string;
    clientName: string;
    totalAmountCop?: number;
    totalPaidAmount: number;
    isQcApproved: boolean;
  };
  users: Array<{
    id: string;
    firstName: string;
    lastName: string;
  }>;
}

interface DeliveryData {
  receiverName: string;
  deliveredByUserId: string;
  deliveryDate: string;
}

export default function ModalDeliver({ 
  isOpen, 
  onClose, 
  onSubmit, 
  orderId, 
  orderData,
  users 
}: ModalDeliverProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<DeliveryData>({
    receiverName: '',
    deliveredByUserId: '',
    deliveryDate: new Date().toISOString().split('T')[0],
  });

  const pendingBalance = orderData.totalAmountCop 
    ? orderData.totalAmountCop - orderData.totalPaidAmount 
    : 0;

  const canDeliver = orderData.isQcApproved && pendingBalance <= 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validaciones
      if (!canDeliver) {
        if (!orderData.isQcApproved) {
          throw new Error('No se puede entregar el pedido. El control de calidad no ha sido aprobado.');
        }
        if (pendingBalance > 0) {
          throw new Error(`No se puede entregar el pedido. Hay un saldo pendiente de $${new Intl.NumberFormat('es-CO').format(pendingBalance)}.`);
        }
      }
      
      if (!formData.receiverName.trim()) {
        throw new Error('El nombre del receptor es requerido');
      }
      
      if (!formData.deliveredByUserId) {
        throw new Error('Debe seleccionar quién entrega el pedido');
      }

      await onSubmit(formData);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al entregar pedido');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof DeliveryData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  const deliveryStaff = users.filter(u => 
    ['admin', 'manager'].some(role => 
      u.firstName.toLowerCase().includes(role) || u.lastName.toLowerCase().includes(role)
    )
  );

  return (
    <div className="fixed inset-0 bg-charcoal-900/95 flex items-center justify-center z-50 p-4">
      <div className="bg-charcoal-800 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div>
            <h2 className="text-lg font-medium text-cream-100">Entregar Pedido</h2>
            <p className="text-sm text-charcoal-400">Fase 4: Entrega al Cliente</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-charcoal-400 hover:text-cream-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Información del Pedido */}
          <div className="bg-charcoal-900/50 border border-white/5 rounded-lg p-4">
            <h3 className="text-sm font-medium text-cream-100 mb-3 flex items-center gap-2">
              <Package size={16} className="text-gold-500" />
              Información del Pedido
            </h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-charcoal-400">Número:</span>
                <span className="text-cream-200 font-mono">{orderData.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-charcoal-400">Cliente:</span>
                <span className="text-cream-200">{orderData.clientName}</span>
              </div>
              
              {orderData.totalAmountCop && (
                <div className="flex justify-between">
                  <span className="text-charcoal-400">Valor total:</span>
                  <span className="text-gold-400">
                    ${new Intl.NumberFormat('es-CO').format(orderData.totalAmountCop)}
                  </span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-charcoal-400">Pagado:</span>
                <span className="text-emerald-400">
                  ${new Intl.NumberFormat('es-CO').format(orderData.totalPaidAmount)}
                </span>
              </div>
              
              {orderData.totalAmountCop && (
                <div className="flex justify-between pt-2 border-t border-white/5">
                  <span className="text-charcoal-400">Saldo pendiente:</span>
                  <span className={`font-medium ${pendingBalance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    ${new Intl.NumberFormat('es-CO').format(pendingBalance)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Estado de Entrega */}
          <div>
            <h3 className="text-sm font-medium text-cream-100 mb-4">Estado de Entrega</h3>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {orderData.isQcApproved ? (
                  <CheckCircle size={16} className="text-emerald-500" />
                ) : (
                  <AlertCircle size={16} className="text-red-500" />
                )}
                <span className="text-sm text-cream-200">
                  Control de Calidad: {orderData.isQcApproved ? 'Aprobado' : 'Pendiente'}
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                {pendingBalance <= 0 ? (
                  <CheckCircle size={16} className="text-emerald-500" />
                ) : (
                  <AlertCircle size={16} className="text-red-500" />
                )}
                <span className="text-sm text-cream-200">
                  Pagos: {pendingBalance <= 0 ? 'Completados' : 'Pendientes'}
                </span>
              </div>
            </div>
          </div>

          {/* Alertas de Bloqueo */}
          {!canDeliver && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle size={16} className="text-red-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-400">No se puede entregar</p>
                  <ul className="text-xs text-red-300 mt-2 space-y-1 list-disc list-inside">
                    {!orderData.isQcApproved && (
                      <li>El control de calidad no ha sido aprobado</li>
                    )}
                    {pendingBalance > 0 && (
                      <li>Hay un saldo pendiente de ${new Intl.NumberFormat('es-CO').format(pendingBalance)}</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Formulario de Entrega */}
          <div className={`space-y-4 ${!canDeliver ? 'opacity-50 pointer-events-none' : ''}`}>
            <h3 className="text-sm font-medium text-cream-100">Datos de Entrega</h3>
            
            <div>
              <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
                Nombre del receptor *
              </label>
              <input
                type="text"
                value={formData.receiverName}
                onChange={(e) => updateField('receiverName', e.target.value)}
                placeholder="Nombre completo de quien recibe el pedido"
                className="w-full px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-600 focus:outline-none focus:border-gold-500/30"
                disabled={!canDeliver}
              />
              <p className="text-[11px] text-charcoal-500 mt-1">
                Puede ser el cliente o una persona autorizada
              </p>
            </div>
            
            <div>
              <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
                Entregado por *
              </label>
              <select
                value={formData.deliveredByUserId}
                onChange={(e) => updateField('deliveredByUserId', e.target.value)}
                className="w-full px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 focus:outline-none focus:border-gold-500/30"
                disabled={!canDeliver}
              >
                <option value="">Seleccionar...</option>
                {deliveryStaff.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
                Fecha de entrega *
              </label>
              <input
                type="date"
                value={formData.deliveryDate}
                onChange={(e) => updateField('deliveryDate', e.target.value)}
                className="w-full px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 focus:outline-none focus:border-gold-500/30"
                disabled={!canDeliver}
              />
            </div>
          </div>

          {/* Evidencia Fotográfica */}
          <div className={`space-y-4 ${!canDeliver ? 'opacity-50 pointer-events-none' : ''}`}>
            <h3 className="text-sm font-medium text-cream-100 flex items-center gap-2">
              <Camera size={16} className="text-gold-500" />
              Evidencia de Entrega *
            </h3>
            
            <div className="border-2 border-dashed border-white/10 rounded-lg p-8 text-center">
              <Camera size={32} className="mx-auto text-charcoal-600 mb-2" />
              <p className="text-sm text-charcoal-400 mb-2">
                Foto del cliente recibiendo el pedido
              </p>
              <p className="text-xs text-charcoal-500">
                Obligatorio para completar la entrega
              </p>
              <button
                type="button"
                className="mt-4 px-4 py-2 bg-charcoal-700 text-cream-200 text-sm rounded-md hover:bg-charcoal-600 transition-colors"
                disabled={!canDeliver}
              >
                Seleccionar Foto
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle size={16} className="text-red-500 mt-0.5" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className="flex items-center gap-3 pt-4 border-t border-white/5">
            <button
              type="submit"
              disabled={loading || !canDeliver}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-500 text-white text-sm font-medium rounded-md hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Package size={16} />
                  Entregar Pedido
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
