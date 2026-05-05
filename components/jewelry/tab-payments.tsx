'use client';

import { useState } from 'react';
import { DollarSign, Scale, Plus, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface Payment {
  id: string;
  method: string;
  amountCop: number;
  status: string;
  paidAt: string | null;
  registeredBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

interface MaterialPayment {
  id: string;
  metalType: 'gold' | 'silver';
  purity: number;
  weightGr: number;
  goldColor: 'yellow' | 'rose' | 'white' | null;
  registeredBy: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  observation: string | null;
  createdAt: string;
  amount_cop?: number;
}

interface TabAbonosProps {
  totalAmountCop: number | null;
  payments: Payment[];
  materialPayments: MaterialPayment[];
  isDelivered: boolean;
  onAddCashPayment?: () => void;
  onAddMaterialPayment?: () => void;
}

export default function TabAbonos({ 
  totalAmountCop, 
  payments, 
  materialPayments, 
  isDelivered,
  onAddCashPayment,
  onAddMaterialPayment 
}: TabAbonosProps) {
  console.log('TabAbonos recibió totalAmountCop:', totalAmountCop);
  console.log('TabAbonos recibió payments:', payments);
  console.log('TabAbonos recibió materialPayments:', materialPayments);
  
  const [activeTab, setActiveTab] = useState<'resumen' | 'dinero' | 'material'>('resumen');

  const formatCOP = (amount: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Pendiente';
    return new Date(dateString).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={14} style={{ color: 'rgba(110,231,183,0.85)' }} />;
      case 'pending':
        return <Clock size={14} style={{ color: 'rgba(250,204,21,0.75)' }} />;
      default:
        return <Clock size={14} style={{ color: 'rgba(242,240,237,0.2)' }} />;
    }
  };

  const getMetalLabel = (type: string) => {
    return type === 'gold' ? 'Oro' : 'Plata';
  };

  const getGoldColorLabel = (color: string) => {
    const colors: Record<string, string> = {
      yellow: 'Amarillo',
      rose: 'Rosado',
      white: 'Blanco',
    };
    return colors[color] || color;
  };

  // Cálculos
  const completedPayments = payments.filter(p => p.status === 'completed');
  console.log('Completed payments:', completedPayments);
  
  const totalPaidCash = completedPayments.reduce((sum, p) => sum + p.amountCop, 0);
  console.log('Total paid cash:', totalPaidCash);

  const totalPaidMaterial = materialPayments.reduce((sum, p) => sum + (Number(p.amount_cop) || 0), 0);
  const totalPaid = totalPaidCash + totalPaidMaterial;
  const pendingBalance = totalAmountCop ? Math.max(0, totalAmountCop - totalPaid) : 0;
  const isFullyPaid = totalAmountCop != null && totalAmountCop > 0 && totalPaid >= totalAmountCop;
  
  console.log('Pending balance:', pendingBalance);
  console.log('Is fully paid:', isFullyPaid);

  const totalMaterialWeightGr = materialPayments.reduce((sum, p) => sum + (Number(p.weightGr) || 0), 0);

  return (
    <div className="space-y-4">
      {/* Sub-tabs de navegación */}
      <div className="rounded-2xl p-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex gap-1">
          {[
            { key: 'resumen', label: 'Resumen', icon: Scale },
            { key: 'dinero', label: 'Abonos en Dinero', icon: DollarSign },
            { key: 'material', label: 'Abonos en Material', icon: Scale },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-sans-custom transition-all"
                style={{
                  background: isActive ? 'rgba(212,175,55,0.12)' : 'transparent',
                  color: isActive ? 'rgba(212,175,55,0.95)' : 'rgba(242,240,237,0.35)',
                  border: isActive ? '1px solid rgba(212,175,55,0.2)' : '1px solid transparent',
                }}
              >
                <tab.icon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenido */}
      <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Tab Resumen */}
        {activeTab === 'resumen' && (
          <div className="space-y-5">
            <p className="text-sm font-semibold font-sans-custom" style={{ color: 'rgba(242,240,237,0.7)' }}>Resumen de Pagos</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Valor total', value: totalAmountCop ? formatCOP(totalAmountCop) : 'No definido', valueColor: 'rgba(212,175,55,0.9)' },
                { label: 'Abonado en dinero', value: formatCOP(totalPaidCash), valueColor: 'rgba(212,175,55,0.75)', sub: null },
                { label: 'Abonado en material', value: totalPaidMaterial > 0 ? formatCOP(totalPaidMaterial) : '—', valueColor: 'rgba(212,175,55,0.75)', sub: totalMaterialWeightGr > 0 ? `${totalMaterialWeightGr.toFixed(3)} gr` : null },
                { label: 'Saldo pendiente', value: isFullyPaid ? '✓ Saldado' : formatCOP(pendingBalance), valueColor: isFullyPaid ? 'rgba(110,231,183,0.9)' : 'rgba(252,165,165,0.9)', sub: totalAmountCop != null && totalPaid > 0 ? `Pagado: ${formatCOP(totalPaid)}` : null },
              ].map((card) => (
                <div key={card.label} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-[10px] uppercase tracking-[0.12em] font-semibold font-sans-custom mb-1" style={{ color: 'rgba(242,240,237,0.3)' }}>{card.label}</p>
                  <p className="text-base font-semibold font-sans-custom" style={{ color: card.valueColor }}>{card.value}</p>
                  {card.sub && <p className="text-[10px] mt-0.5 font-sans-custom" style={{ color: 'rgba(242,240,237,0.25)' }}>{card.sub}</p>}
                </div>
              ))}
            </div>

            {pendingBalance > 0 && (
              <div className="flex items-start gap-3 p-4 rounded-2xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <AlertTriangle size={15} className="shrink-0 mt-0.5" style={{ color: 'rgba(252,165,165,0.8)' }} />
                <div>
                  <p className="text-sm font-medium font-sans-custom" style={{ color: 'rgba(252,165,165,0.9)' }}>Saldo pendiente</p>
                  <p className="text-xs mt-0.5 font-sans-custom" style={{ color: 'rgba(252,165,165,0.55)' }}>
                    El pedido tiene un saldo pendiente de {formatCOP(pendingBalance)}.
                    {isDelivered ? ' El pedido ya fue entregado.' : ' No se puede entregar hasta que el saldo sea cancelado.'}
                  </p>
                </div>
              </div>
            )}

            {materialPayments.length > 0 && (
              <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-sm font-semibold font-sans-custom mb-3" style={{ color: 'rgba(242,240,237,0.65)' }}>Material Abonado</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: 'Total peso abonado', value: `${totalMaterialWeightGr.toFixed(3)} gr` },
                    { label: 'Valor abonado en material', value: totalPaidMaterial > 0 ? formatCOP(totalPaidMaterial) : '—', gold: true },
                    { label: 'Cantidad de abonos', value: String(materialPayments.length) },
                  ].map((row) => (
                    <div key={row.label}>
                      <p className="text-[10px] uppercase tracking-[0.12em] font-semibold font-sans-custom mb-1" style={{ color: 'rgba(242,240,237,0.3)' }}>{row.label}</p>
                      <p className="text-sm font-sans-custom" style={{ color: (row as any).gold ? 'rgba(212,175,55,0.85)' : 'rgba(242,240,237,0.75)' }}>{row.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isDelivered && (
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={onAddCashPayment}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-[0.08em] font-sans-custom transition-all"
                  style={{ background: 'linear-gradient(135deg, #E8C547, #D4AF37)', color: '#1A1400' }}
                >
                  <Plus size={13} /> Abono en Dinero
                </button>
                <button
                  onClick={onAddMaterialPayment}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold font-sans-custom transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(242,240,237,0.7)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <Plus size={13} /> Abono en Material
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab Dinero */}
        {activeTab === 'dinero' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold font-sans-custom" style={{ color: 'rgba(242,240,237,0.7)' }}>Historial de Abonos en Dinero</p>
              {!isDelivered && (
                <button
                  onClick={onAddCashPayment}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold font-sans-custom transition-all"
                  style={{ background: 'linear-gradient(135deg, #E8C547, #D4AF37)', color: '#1A1400' }}
                >
                  <Plus size={12} /> Nuevo Abono
                </button>
              )}
            </div>

            {payments.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign size={28} className="mx-auto mb-2" style={{ color: 'rgba(242,240,237,0.12)' }} />
                <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>No hay abonos registrados</p>
              </div>
            ) : (
              <div className="space-y-2">
                {payments.map((payment) => (
                  <div key={payment.id} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getPaymentStatusIcon(payment.status)}
                        <div>
                          <p className="text-sm font-semibold font-sans-custom" style={{ color: 'rgba(242,240,237,0.85)' }}>{formatCOP(payment.amountCop)}</p>
                          <p className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>{payment.method}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.45)' }}>{formatDate(payment.paidAt)}</p>
                        <p className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.25)' }}>
                          Por: {payment.registeredBy ? `${payment.registeredBy.firstName} ${payment.registeredBy.lastName}` : 'Usuario no especificado'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Material */}
        {activeTab === 'material' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold font-sans-custom" style={{ color: 'rgba(242,240,237,0.7)' }}>Historial de Abonos en Material</p>
              {!isDelivered && (
                <button
                  onClick={onAddMaterialPayment}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold font-sans-custom transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(242,240,237,0.7)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <Plus size={12} /> Nuevo Abono
                </button>
              )}
            </div>

            {materialPayments.length === 0 ? (
              <div className="text-center py-8">
                <Scale size={28} className="mx-auto mb-2" style={{ color: 'rgba(242,240,237,0.12)' }} />
                <p className="text-sm font-sans-custom" style={{ color: 'rgba(242,240,237,0.3)' }}>No hay abonos de material registrados</p>
              </div>
            ) : (
              <div className="space-y-2">
                {materialPayments.map((payment) => (
                  <div key={payment.id} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Scale size={15} style={{ color: 'rgba(212,175,55,0.6)' }} />
                        <div>
                          <p className="text-sm font-medium font-sans-custom" style={{ color: 'rgba(242,240,237,0.85)' }}>
                            {Number(payment.weightGr).toFixed(3)} gr de {getMetalLabel(payment.metalType)}
                          </p>
                          <p className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.35)' }}>
                            {payment.purity} {payment.metalType === 'gold' ? 'K' : 'Ley'}
                            {payment.goldColor && ` · ${getGoldColorLabel(payment.goldColor)}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {payment.amount_cop && payment.amount_cop > 0 && (
                          <p className="text-sm font-semibold font-sans-custom" style={{ color: 'rgba(212,175,55,0.85)' }}>{formatCOP(payment.amount_cop)}</p>
                        )}
                        <p className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.4)' }}>
                          {new Date(payment.createdAt).toLocaleDateString('es-CO')}
                        </p>
                        <p className="text-xs font-sans-custom" style={{ color: 'rgba(242,240,237,0.25)' }}>
                          Por: {payment.registeredBy ? `${payment.registeredBy.firstName} ${payment.registeredBy.lastName}` : 'Sin registro'}
                        </p>
                      </div>
                    </div>
                    {payment.observation && (
                      <p className="text-xs font-sans-custom italic mt-2" style={{ color: 'rgba(242,240,237,0.4)' }}>{payment.observation}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
