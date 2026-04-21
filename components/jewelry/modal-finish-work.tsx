'use client';

import { useState } from 'react';
import { X, CheckCircle, XCircle, Scale, User, Calendar, Camera, AlertCircle, AlertTriangle } from 'lucide-react';

interface ModalFinishWorkProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FinishWorkData) => Promise<void>;
  orderId: string;
  currentCycle: {
    id: string;
    totalMetalWeightGr?: number;
    includesStones?: boolean;
    stoneWeightGr?: number;
  };
  users: Array<{
    id: string;
    firstName: string;
    lastName: string;
  }>;
}

interface FinishWorkData {
  // Fase 3: Fin trabajo
  finalWeightGr: number;
  leftoverStonesGr?: number;
  returnedMaterialGr: number;
  qcResult: 'approved' | 'rejected';
  qcObservations: string;
  qcByUserId: string;
  workReceivedByUserId: string;
  workDeliveryDate: string;
}

export default function ModalFinishWork({ 
  isOpen, 
  onClose, 
  onSubmit, 
  orderId, 
  currentCycle,
  users 
}: ModalFinishWorkProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<FinishWorkData>({
    finalWeightGr: currentCycle.totalMetalWeightGr || 0,
    leftoverStonesGr: currentCycle.includesStones ? (currentCycle.stoneWeightGr || 0) : 0,
    returnedMaterialGr: 0,
    qcResult: 'approved',
    qcObservations: '',
    qcByUserId: '',
    workReceivedByUserId: '',
    workDeliveryDate: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validaciones
      if (!formData.finalWeightGr || formData.finalWeightGr <= 0) {
        throw new Error('El peso final es requerido');
      }
      
      if (formData.returnedMaterialGr < 0) {
        throw new Error('El material devuelto no puede ser negativo');
      }
      
      // RN-07: Validar que material devuelto no sea mayor al entregado
      if (currentCycle.totalMetalWeightGr && formData.returnedMaterialGr > currentCycle.totalMetalWeightGr) {
        throw new Error('El material devuelto no puede ser mayor al material entregado');
      }
      
      // Advertencia si peso final es mayor al entregado y no hay piedras
      if (currentCycle.totalMetalWeightGr && 
          formData.finalWeightGr > currentCycle.totalMetalWeightGr && 
          !currentCycle.includesStones) {
        const confirm = window.confirm(
          'El peso final es mayor al material entregado y no hay piedras registradas. ¿Desea continuar?'
        );
        if (!confirm) {
          return;
        }
      }
      
      if (formData.qcResult === 'rejected' && !formData.qcObservations.trim()) {
        throw new Error('Las observaciones de QC son obligatorias cuando se rechaza el trabajo');
      }
      
      if (!formData.qcByUserId) {
        throw new Error('Debe seleccionar quién realiza el control de calidad');
      }
      
      if (!formData.workReceivedByUserId) {
        throw new Error('Debe seleccionar quién recibe el trabajo');
      }

      await onSubmit(formData);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al finalizar trabajo');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof FinishWorkData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  const qualityControllers = users.filter(u => 
    ['manager', 'admin'].some(role => 
      u.firstName.toLowerCase().includes(role) || u.lastName.toLowerCase().includes(role)
    )
  );

  const materialDifference = currentCycle.totalMetalWeightGr 
    ? formData.finalWeightGr - currentCycle.totalMetalWeightGr 
    : 0;

  return (
    <div className="fixed inset-0 bg-charcoal-900/95 flex items-center justify-center z-50 p-4">
      <div className="bg-charcoal-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div>
            <h2 className="text-lg font-medium text-cream-100">Finalizar Trabajo</h2>
            <p className="text-sm text-charcoal-400">Fase 3: Control de Calidad y Entrega</p>
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

          {/* Resultado del Trabajo */}
          <div>
            <h3 className="text-sm font-medium text-cream-100 mb-4 flex items-center gap-2">
              <Scale size={16} className="text-gold-500" />
              Resultado del Trabajo
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
                  Peso final (gr) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.finalWeightGr}
                  onChange={(e) => updateField('finalWeightGr', parseFloat(e.target.value))}
                  className="w-full px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-600 focus:outline-none focus:border-gold-500/30"
                />
                {currentCycle.totalMetalWeightGr && (
                  <p className="text-[11px] text-charcoal-500 mt-1">
                    Entregado: {currentCycle.totalMetalWeightGr} gr
                    {materialDifference !== 0 && (
                      <span className={`ml-2 ${materialDifference > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                        ({materialDifference > 0 ? '+' : ''}{materialDifference.toFixed(2)} gr)
                      </span>
                    )}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
                  Material devuelto (gr) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.returnedMaterialGr}
                  onChange={(e) => updateField('returnedMaterialGr', parseFloat(e.target.value))}
                  className="w-full px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-600 focus:outline-none focus:border-gold-500/30"
                />
                <p className="text-[11px] text-charcoal-500 mt-1">
                  Material que sobra y se devuelve al cliente
                </p>
              </div>
              
              {currentCycle.includesStones && (
                <div>
                  <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
                    Sobrantes piedras (gr)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.leftoverStonesGr || ''}
                    onChange={(e) => updateField('leftoverStonesGr', parseFloat(e.target.value) || undefined)}
                    className="w-full px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-600 focus:outline-none focus:border-gold-500/30"
                  />
                  <p className="text-[11px] text-charcoal-500 mt-1">
                    Entregadas: {currentCycle.stoneWeightGr || 0} gr
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Control de Calidad */}
          <div>
            <h3 className="text-sm font-medium text-cream-100 mb-4 flex items-center gap-2">
              <CheckCircle size={16} className="text-gold-500" />
              Control de Calidad
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
                  Resultado QC *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => updateField('qcResult', 'approved')}
                    className={`px-4 py-3 rounded-md border transition-all ${
                      formData.qcResult === 'approved'
                        ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                        : 'bg-charcoal-900 border-white/5 text-charcoal-300 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle size={16} />
                      <span>Aprobado</span>
                    </div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => updateField('qcResult', 'rejected')}
                    className={`px-4 py-3 rounded-md border transition-all ${
                      formData.qcResult === 'rejected'
                        ? 'bg-red-500/20 border-red-500/30 text-red-400'
                        : 'bg-charcoal-900 border-white/5 text-charcoal-300 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <XCircle size={16} />
                      <span>Rechazado</span>
                    </div>
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
                  Observaciones QC {formData.qcResult === 'rejected' && '*'}
                </label>
                <textarea
                  value={formData.qcObservations}
                  onChange={(e) => updateField('qcObservations', e.target.value)}
                  rows={3}
                  placeholder={formData.qcResult === 'rejected' 
                    ? 'Describir detalladamente las razones del rechazo y qué se debe corregir...' 
                    : 'Notas sobre el control de calidad (opcional)...'
                  }
                  className="w-full px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 placeholder:text-charcoal-600 focus:outline-none focus:border-gold-500/30 resize-none"
                />
              </div>
              
              {formData.qcResult === 'rejected' && (
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={16} className="text-orange-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-orange-400">Atención</p>
                      <p className="text-xs text-orange-300 mt-1">
                        Al rechazar el trabajo, se creará automáticamente un nuevo ciclo de retrabajo 
                        y el pedido volverá a la fase de "Inicio Trabajo".
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Responsables y Fecha */}
          <div>
            <h3 className="text-sm font-medium text-cream-100 mb-4 flex items-center gap-2">
              <User size={16} className="text-gold-500" />
              Responsables y Fecha
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
                  QC realizado por *
                </label>
                <select
                  value={formData.qcByUserId}
                  onChange={(e) => updateField('qcByUserId', e.target.value)}
                  className="w-full px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 focus:outline-none focus:border-gold-500/30"
                >
                  <option value="">Seleccionar...</option>
                  {qualityControllers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.firstName} {user.lastName}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
                  Trabajo recibido por *
                </label>
                <select
                  value={formData.workReceivedByUserId}
                  onChange={(e) => updateField('workReceivedByUserId', e.target.value)}
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
              
              <div>
                <label className="block text-xs tracking-widest uppercase text-charcoal-400 mb-2">
                  Fecha entrega *
                </label>
                <input
                  type="date"
                  value={formData.workDeliveryDate}
                  onChange={(e) => updateField('workDeliveryDate', e.target.value)}
                  className="w-full px-3 py-2.5 bg-charcoal-900 border border-white/5 rounded-md text-sm text-cream-200 focus:outline-none focus:border-gold-500/30"
                />
              </div>
            </div>
          </div>

          {/* Evidencia Fotográfica */}
          <div>
            <h3 className="text-sm font-medium text-cream-100 mb-4 flex items-center gap-2">
              <Camera size={16} className="text-gold-500" />
              Evidencia Fotográfica
            </h3>
            
            <div className="border-2 border-dashed border-white/10 rounded-lg p-8 text-center">
              <Camera size={32} className="mx-auto text-charcoal-600 mb-2" />
              <p className="text-sm text-charcoal-400 mb-2">
                Fotos del trabajo finalizado
              </p>
              <p className="text-xs text-charcoal-500">
                Recomendado: fotos de múltiples ángulos y detalles
              </p>
              <button
                type="button"
                className="mt-4 px-4 py-2 bg-charcoal-700 text-cream-200 text-sm rounded-md hover:bg-charcoal-600 transition-colors"
              >
                Seleccionar Archivos
              </button>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-3 pt-4 border-t border-white/5">
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-medium rounded-md transition-colors disabled:opacity-50 ${
                formData.qcResult === 'approved'
                  ? 'bg-emerald-500 text-white hover:bg-emerald-400'
                  : 'bg-red-500 text-white hover:bg-red-400'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  {formData.qcResult === 'approved' ? (
                    <>
                      <CheckCircle size={16} />
                      Aprobar y Finalizar
                    </>
                  ) : (
                    <>
                      <XCircle size={16} />
                      Rechazar y Crear Retrabajo
                    </>
                  )}
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
