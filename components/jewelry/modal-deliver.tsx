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

  const deliveryStaff = users;

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
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(110,231,183,0.1)', border: '1px solid rgba(110,231,183,0.2)' }}
            >
              <Package size={15} style={{ color: 'rgba(110,231,183,0.8)' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'rgba(242,240,237,0.88)' }}>Entregar Pedido</p>
              <p className="text-[10px] uppercase tracking-[0.1em]" style={{ color: 'rgba(242,240,237,0.3)' }}>Fase 4 — Entrega al Cliente</p>
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

            {/* Info del pedido */}
            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[10px] uppercase tracking-[0.12em] font-semibold mb-3 flex items-center gap-2" style={{ color: 'rgba(212,175,55,0.6)' }}>
                <Package size={11} /> Información del Pedido
              </p>
              <div className="space-y-2">
                {[
                  { label: 'Número', value: orderData.orderNumber, mono: true },
                  { label: 'Cliente', value: orderData.clientName },
                  ...(orderData.totalAmountCop ? [{ label: 'Valor total', value: `$${new Intl.NumberFormat('es-CO').format(orderData.totalAmountCop)}`, color: 'rgba(212,175,55,0.85)' }] : []),
                  { label: 'Pagado', value: `$${new Intl.NumberFormat('es-CO').format(orderData.totalPaidAmount)}`, color: 'rgba(110,231,183,0.85)' },
                  ...(orderData.totalAmountCop ? [{ label: 'Saldo pendiente', value: `$${new Intl.NumberFormat('es-CO').format(pendingBalance)}`, color: pendingBalance > 0 ? 'rgba(252,165,165,0.85)' : 'rgba(110,231,183,0.85)' }] : []),
                ].map((row) => (
                  <div key={row.label} className="flex justify-between items-center">
                    <span className="text-xs" style={{ color: 'rgba(242,240,237,0.35)' }}>{row.label}</span>
                    <span className="text-xs font-semibold font-mono" style={{ color: (row as any).color ?? 'rgba(242,240,237,0.75)' }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Estado requisitos */}
            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-[10px] uppercase tracking-[0.12em] font-semibold mb-3" style={{ color: 'rgba(242,240,237,0.3)' }}>Requisitos de Entrega</p>
              <div className="space-y-2">
                {[
                  { ok: orderData.isQcApproved, label: `Control de Calidad: ${orderData.isQcApproved ? 'Aprobado' : 'Pendiente'}` },
                  { ok: pendingBalance <= 0, label: `Pagos: ${pendingBalance <= 0 ? 'Completados' : 'Pendientes'}` },
                ].map((req) => (
                  <div key={req.label} className="flex items-center gap-3">
                    {req.ok
                      ? <CheckCircle size={14} style={{ color: 'rgba(110,231,183,0.85)' }} />
                      : <AlertCircle size={14} style={{ color: 'rgba(252,165,165,0.8)' }} />
                    }
                    <span className="text-xs" style={{ color: req.ok ? 'rgba(242,240,237,0.65)' : 'rgba(252,165,165,0.75)' }}>{req.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Alerta bloqueo */}
            {!canDeliver && (
              <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertTriangle size={14} className="shrink-0 mt-0.5" style={{ color: 'rgba(252,165,165,0.8)' }} />
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: 'rgba(252,165,165,0.9)' }}>No se puede entregar</p>
                  <ul className="space-y-0.5" style={{ color: 'rgba(252,165,165,0.65)', fontSize: 11 }}>
                    {!orderData.isQcApproved && <li>• Control de calidad no aprobado</li>}
                    {pendingBalance > 0 && <li>• Saldo pendiente: ${new Intl.NumberFormat('es-CO').format(pendingBalance)}</li>}
                  </ul>
                </div>
              </div>
            )}

            {/* Datos de entrega */}
            <div className={!canDeliver ? 'opacity-40 pointer-events-none' : ''}>
              <p className="text-[10px] uppercase tracking-[0.12em] font-semibold mb-3" style={{ color: 'rgba(242,240,237,0.3)' }}>Datos de Entrega</p>
              <div className="space-y-4">
                <div>
                  <label style={labelStyle}>Nombre del receptor *</label>
                  <input
                    type="text"
                    value={formData.receiverName}
                    onChange={(e) => updateField('receiverName', e.target.value)}
                    placeholder="Nombre completo de quien recibe"
                    style={inputStyle}
                    disabled={!canDeliver}
                  />
                  <p className="text-[10px] mt-1" style={{ color: 'rgba(242,240,237,0.22)' }}>Puede ser el cliente o persona autorizada</p>
                </div>
                <div>
                  <label style={labelStyle}>Entregado por *</label>
                  <select
                    value={formData.deliveredByUserId}
                    onChange={(e) => updateField('deliveredByUserId', e.target.value)}
                    style={{ ...inputStyle, appearance: 'none' }}
                    disabled={!canDeliver}
                  >
                    <option value="">Seleccionar...</option>
                    {deliveryStaff.map((user) => (
                      <option key={user.id} value={user.id}>{user.firstName} {user.lastName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Fecha de entrega *</label>
                  <input
                    type="date"
                    value={formData.deliveryDate}
                    onChange={(e) => updateField('deliveryDate', e.target.value)}
                    style={inputStyle}
                    disabled={!canDeliver}
                  />
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertCircle size={14} className="shrink-0 mt-0.5" style={{ color: 'rgba(252,165,165,0.8)' }} />
                <p className="text-xs" style={{ color: 'rgba(252,165,165,0.85)' }}>{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 flex items-center gap-3 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <button
              type="submit"
              disabled={loading || !canDeliver}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl text-xs font-semibold uppercase tracking-[0.08em] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, rgba(110,231,183,0.9), rgba(16,185,129,0.85))', color: '#0a1f17' }}
            >
              {loading ? (
                <><div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> Procesando...</>
              ) : (
                <><Package size={13} /> Entregar Pedido</>
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
