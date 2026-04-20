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
        return <CheckCircle size={14} className="text-emerald-500" />;
      case 'pending':
        return <Clock size={14} className="text-yellow-500" />;
      default:
        return <Clock size={14} className="text-charcoal-500" />;
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
    <div className="space-y-6">
      {/* Tabs de navegación */}
      <div className="bg-charcoal-800/50 border border-white/5 rounded-lg p-2">
        <div className="flex space-x-1">
          {[
            { key: 'resumen', label: 'Resumen', icon: Scale },
            { key: 'dinero', label: 'Abonos en Dinero', icon: DollarSign },
            { key: 'material', label: 'Abonos en Material', icon: Scale },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-all ${
                activeTab === tab.key
                  ? 'bg-gold-500/10 text-gold-400'
                  : 'text-charcoal-400 hover:text-cream-200'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido del tab activo */}
      <div className="bg-charcoal-800/50 border border-white/5 rounded-lg p-6">
        {/* Tab Resumen */}
        {activeTab === 'resumen' && (
          <div className="space-y-6">
            <h3 className="text-sm font-medium text-cream-100">Resumen de Pagos</h3>
            
            {/* Tarjeta de resumen principal */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-charcoal-900 rounded-lg p-4">
                <p className="text-xs text-charcoal-500 mb-1">Valor total del pedido</p>
                <p className="text-lg font-semibold text-gold-400">
                  {totalAmountCop ? formatCOP(totalAmountCop) : 'No definido'}
                </p>
              </div>

              <div className="bg-charcoal-900 rounded-lg p-4">
                <p className="text-xs text-charcoal-500 mb-1">Abonado en dinero</p>
                <p className="text-lg font-semibold text-yellow-400">{formatCOP(totalPaidCash)}</p>
              </div>

              <div className="bg-charcoal-900 rounded-lg p-4">
                <p className="text-xs text-charcoal-500 mb-1">Abonado en material</p>
                <p className="text-lg font-semibold text-yellow-400">
                  {totalPaidMaterial > 0 ? formatCOP(totalPaidMaterial) : '—'}
                </p>
                {totalMaterialWeightGr > 0 && (
                  <p className="text-xs text-charcoal-600 mt-0.5">{totalMaterialWeightGr.toFixed(3)} gr</p>
                )}
              </div>

              <div className="bg-charcoal-900 rounded-lg p-4">
                <p className="text-xs text-charcoal-500 mb-1">Saldo pendiente</p>
                <p className={`text-lg font-semibold ${isFullyPaid ? 'text-emerald-400' : pendingBalance > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {isFullyPaid ? '✓ Saldado' : formatCOP(pendingBalance)}
                </p>
                {totalAmountCop != null && totalPaid > 0 && (
                  <p className="text-xs text-charcoal-600 mt-0.5">Pagado: {formatCOP(totalPaid)}</p>
                )}
              </div>
            </div>

            {/* Alertas */}
            {pendingBalance > 0 && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={16} className="text-red-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-400">Saldo pendiente</p>
                    <p className="text-xs text-red-300 mt-1">
                      El pedido tiene un saldo pendiente de {formatCOP(pendingBalance)}. 
                      {isDelivered ? ' El pedido ya fue entregado.' : ' No se puede entregar hasta que el saldo sea cancelado.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Resumen de material */}
            {materialPayments.length > 0 && (
              <div className="bg-charcoal-900 rounded-lg p-4">
                <h4 className="text-sm font-medium text-cream-200 mb-3">Material Abonado</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-charcoal-500 mb-1">Total peso abonado</p>
                    <p className="text-sm text-cream-200">{totalMaterialWeightGr.toFixed(3)} gr</p>
                  </div>
                  <div>
                    <p className="text-xs text-charcoal-500 mb-1">Valor abonado en material</p>
                    <p className="text-sm font-medium text-gold-400">{totalPaidMaterial > 0 ? formatCOP(totalPaidMaterial) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-charcoal-500 mb-1">Cantidad de abonos</p>
                    <p className="text-sm text-cream-200">{materialPayments.length}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Acciones */}
            {!isDelivered && (
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={onAddCashPayment}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gold-500 text-charcoal-900 text-sm font-medium rounded-md hover:bg-gold-400 transition-colors"
                >
                  <Plus size={14} />
                  Abono en Dinero
                </button>
                <button
                  onClick={onAddMaterialPayment}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-charcoal-700 text-cream-200 text-sm font-medium rounded-md hover:bg-charcoal-600 transition-colors"
                >
                  <Plus size={14} />
                  Abono en Material
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab Dinero */}
        {activeTab === 'dinero' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-cream-100">Historial de Abonos en Dinero</h3>
              {!isDelivered && (
                <button
                  onClick={onAddCashPayment}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-gold-500 text-charcoal-900 text-xs font-medium rounded-md hover:bg-gold-400 transition-colors"
                >
                  <Plus size={12} />
                  Nuevo Abono
                </button>
              )}
            </div>

            {payments.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign size={32} className="mx-auto text-charcoal-600 mb-2" />
                <p className="text-sm text-charcoal-500">No hay abonos registrados</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div key={payment.id} className="bg-charcoal-900 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getPaymentStatusIcon(payment.status)}
                        <div>
                          <p className="text-sm font-medium text-cream-200">{formatCOP(payment.amountCop)}</p>
                          <p className="text-xs text-charcoal-500">{payment.method}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-charcoal-400">{formatDate(payment.paidAt)}</p>
                        <p className="text-xs text-charcoal-500">
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
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-cream-100">Historial de Abonos en Material</h3>
              {!isDelivered && (
                <button
                  onClick={onAddMaterialPayment}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-charcoal-700 text-cream-200 text-xs font-medium rounded-md hover:bg-charcoal-600 transition-colors"
                >
                  <Plus size={12} />
                  Nuevo Abono
                </button>
              )}
            </div>

            {materialPayments.length === 0 ? (
              <div className="text-center py-8">
                <Scale size={32} className="mx-auto text-charcoal-600 mb-2" />
                <p className="text-sm text-charcoal-500">No hay abonos de material registrados</p>
              </div>
            ) : (
              <div className="space-y-3">
                {materialPayments.map((payment) => (
                  <div key={payment.id} className="bg-charcoal-900 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Scale size={16} className="text-gold-500" />
                        <div>
                          <p className="text-sm font-medium text-cream-200">
                            {Number(payment.weightGr).toFixed(3)} gr de {getMetalLabel(payment.metalType)}
                          </p>
                          <p className="text-xs text-charcoal-500">
                            {payment.purity} {payment.metalType === 'gold' ? 'K' : 'Ley'}
                            {payment.goldColor && ` - ${getGoldColorLabel(payment.goldColor)}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {payment.amount_cop && payment.amount_cop > 0 && (
                          <p className="text-sm font-medium text-gold-400">{formatCOP(payment.amount_cop)}</p>
                        )}
                        <p className="text-xs text-charcoal-400">
                          {new Date(payment.createdAt).toLocaleDateString('es-CO')}
                        </p>
                        <p className="text-xs text-charcoal-500">
                          Por: {payment.registeredBy ? `${payment.registeredBy.firstName} ${payment.registeredBy.lastName}` : 'Sin registro'}
                        </p>
                      </div>
                    </div>
                    {payment.observation && (
                      <p className="text-xs text-charcoal-400 mt-2 italic">{payment.observation}</p>
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
